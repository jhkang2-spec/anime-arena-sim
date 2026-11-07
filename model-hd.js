// 고해상도 인물·손·검 + 숨쉬기·무게중심·2차 동작 — arena.js 바로 뒤(looks-core.js 앞)에 읽는다.
// 소유자 요청(11-05): 1인칭 손이 막대 → 손바닥·손가락 5개(마디)·손목, 자세별 손 모양 / 몸 폴리곤 5배 이상 매끈하게 / 검을 잘 보이게.
// 60fps 원칙: 고해상도는 '가까운 인물·1인칭/3인칭으로 따라가는 인물'에만(거리 LOD), 나머지는 기존 도트풍 모형 그대로.
//  - 몸: 같은 buildHuman 을 분할 수만 늘려 한 번 더 만들고(쉴 때 하나씩), 합친 조각 순서대로 짝지어 geometry 만 바꿔 끼운다
//    (모형 객체·뼈대·옷(looks)·검(moves)은 그대로라 다른 파일과 충돌 없음).
//  - 손: 뼈대 있는 한 덩어리(SkinnedMesh) — 손가락 마디를 굽혀 주먹·편 손·검 쥔 손·인·손날·가리키기.
(function () {
  if (typeof CH === 'undefined' || typeof buildHuman !== 'function' || typeof mergeModel !== 'function') return;
  const HD = window.HD = { built: 0, failed: [], tri: {}, hiOn: 0 };
  // 인체 비례(소유자 11-05 "팔이 너무 길어 팔척귀신 같아"): 키 ≈ 32 기준 위팔 7→6.2(키의 0.19), 아래팔 6→5.3, 손 3.4(1:0.85:0.55),
  // 팔 내리면 손끝이 넓적다리 가운데(y≈11). 머리 5.4→4.5(키의 약 1/7). 어깨 관절 간격 8.6→8.1(키의 0.25). 값은 여기 한곳에서만 읽는다.
  const PROP = HD.prop = { armK: .74, headK: .83, shoulderZ: 4.05 };

  // ═══ 1. 몸: 분할 수를 늘린 도형으로 한 번 더 짓기 ═══
  const ULTRA = (() => { try { const a = localStorage.getItem('arenaUltra'); if (a !== null) return a === '1'; return !/Mobi|Android|iPhone/i.test(navigator.userAgent); } catch (e) { return false; } })(); // 11-07 라운드D: AAA와 동일한 기본값(데스크톱 켬) — 저장 안 한 첫 방문에도 고해상도
  const KS = ULTRA ? 6.2 : 3.2, KR = ULTRA ? 7 : 3.6; // 11-07 라운드D: 모델링 대폭 증량(울트라: HD 대비 ~3배·기본 모형 대비 ~40배 삼각형) — LOD(근접 인물만)가 총량 보호
  const G0 = { S: THREE.SphereGeometry, C: THREE.CylinderGeometry, L: THREE.LatheGeometry, T: THREE.TorusGeometry, K: THREE.ConeGeometry };
  class HS extends G0.S { constructor(r = 1, w = 8, h = 6, ...a) { super(r, Math.min(ULTRA ? 220 : 96, Math.round(w * KS)), Math.min(ULTRA ? 160 : 64, Math.round(h * KS)), ...a); } }
  class HC extends G0.C { constructor(t = 1, b = 1, h = 1, rs = 8, hs = 1, ...a) { super(t, b, h, Math.min(ULTRA ? 180 : 80, Math.round(rs * KR)), hs * 2, ...a); } }
  class HK extends G0.K { constructor(r = 1, h = 1, rs = 8, hs = 1, ...a) { super(r, h, Math.min(ULTRA ? 180 : 80, Math.round(rs * KR)), hs * 2, ...a); } }
  class HT extends G0.T { constructor(r = 1, t = .4, rs = 8, ts = 6, ...a) { super(r, t, Math.min(ULTRA ? 110 : 40, Math.round(rs * KR)), Math.min(ULTRA ? 300 : 130, Math.round(ts * (ULTRA ? 5 : 2.3))), ...a); } }
  class HL extends G0.L { // 회전체: 둘레 배 + 윤곽 점을 곡선으로 두 배(근육 굴곡·어깨·허리 곡선이 매끈하게)
    constructor(pts = [], seg = 12, ...a) {
      let P = pts;
      if (pts.length >= 4) { P = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p.x, p.y))).getPoints(pts.length * ((ULTRA ? 4 : 2) - 1)).map(p => new THREE.Vector2(Math.max(0, p.x), p.y)); P[0].copy(pts[0]); P[P.length - 1].copy(pts[pts.length - 1]); }
      super(P, Math.min(ULTRA ? 140 : 56, Math.round(seg * KR)), ...a);
    }
  }
  function buildHi(c) {
    THREE.SphereGeometry = HS; THREE.CylinderGeometry = HC; THREE.LatheGeometry = HL; THREE.TorusGeometry = HT; THREE.ConeGeometry = HK;
    try { return mergeModel(buildHuman(c.P, c.key)); }
    finally { THREE.SphereGeometry = G0.S; THREE.CylinderGeometry = G0.C; THREE.LatheGeometry = G0.L; THREE.TorusGeometry = G0.T; THREE.ConeGeometry = G0.K; }
  }
  const meshes = root => { const a = []; root.traverse(o => { if (o.isMesh) a.push(o); }); return a; };
  const tri = g => (g.index ? g.index.count : g.attributes.position.count) / 3;
  const sig = o => o.material.type + '|' + (o.material.color ? o.material.color.getHexString() : '') + '|' + o.layers.mask;
  // 옷·검을 붙이기 전(지금) 원래 조각에 번호를 적어 둔다 → 나중에 지은 고해상도 조각과 번호로 짝짓기
  function tag(c) { const m = c.model; if (!m || m._hdTag) return; m._hdTag = meshes(m.root); m._hdTag.forEach((o, i) => { o.userData.hdI = i; o.userData.hdS = sig(o); }); }
  Object.values(CH).forEach(tag);
  if (typeof defChar === 'function') { const _dc = defChar; defChar = function () { const r = _dc.apply(this, arguments); Object.values(CH).forEach(tag); return r; }; } // eslint-disable-line no-global-assign

  function makeHi(c) {
    const m = c.model; if (!m || !m._hdTag || m._hdHi !== undefined) return;
    try {
      const hi = buildHi(c), hm = meshes(hi.root), lo = m._hdTag;
      if (hm.length !== lo.length || hm.some((o, i) => sig(o) !== lo[i].userData.hdS)) { m._hdHi = null; HD.failed.push(c.key); return; }
      let tl = 0, th = 0;
      lo.forEach((o, i) => { o.userData.gLo = o.geometry; o.userData.gHi = hm[i].geometry; if (o.visible) { tl += tri(o.geometry); th += tri(hm[i].geometry); } });
      m._hdHi = true; HD.built++; HD.tri[c.key] = { lo: Math.round(tl), hi: Math.round(th), x: +(th / Math.max(1, tl)).toFixed(1) };
    } catch (e) { m._hdHi = null; HD.failed.push(c.key); console.error(e); }
  }
  // 쉴 때 하나씩 짓기(출전 인물 먼저) — 한 번에 몰아 지으면 화면이 멈칫한다
  const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
  (function pump() {
    idle(dl => {
      const want = (typeof F !== 'undefined' ? F.map(f => f.ch) : []).concat(Object.values(CH)).find(c => c && c.model && c.model._hdHi === undefined);
      if (want && (dl.timeRemaining() > 6 || (typeof F !== 'undefined' && F.some(f => f.ch === want)))) makeHi(want);
      if (Object.values(CH).some(c => c.model && c.model._hdHi === undefined)) pump(); else HD.done = true;
    }, { timeout: 400 });
  })();
  function setLod(m, hi) {
    if (!m._hdHi || m._hdOn === hi) return; m._hdOn = hi;
    m._hdTag.forEach(o => { const g = hi ? o.userData.gHi : o.userData.gLo; if (g && o.geometry !== g) o.geometry = g; });
  }

  // ═══ 2. 손: 손바닥 + 손가락 4개(마디 3) + 엄지(마디 3) + 손목 — 뼈대 한 덩어리 ═══
  const FING = [{ z: .6, L: [.62, .4, .3], r: .2 }, { z: .2, L: [.68, .44, .32], r: .21 }, { z: -.2, L: [.64, .42, .31], r: .2 }, { z: -.58, L: [.5, .32, .26], r: .175 }];
  const TH = { L: [.55, .44, .36], r: .23 }, PALM = { L: 1.8, W: 1.66, T: .72 };
  function rig(s) { // s = 엄지 쪽(+1 / -1)
    const B = [], bone = (p, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); if (p) p.add(b); B.push(b); return b; };
    const root = bone(null, 0, 0, 0), fj = [];
    FING.forEach(fd => { const a = bone(root, 0, -PALM.L + .08, fd.z * s), b = bone(a, 0, -fd.L[0], 0), c = bone(b, 0, -fd.L[1], 0); fj.push([a, b, c]); });
    const t1 = bone(root, .16, -.42, .6 * s); t1.rotation.set(-s * .62, 0, .38); const t2 = bone(t1, 0, -TH.L[0], 0), t3 = bone(t2, 0, -TH.L[1], 0);
    return { root, B, fj, th: [t1, t2, t3] };
  }
  function seg(len, r0, r1, rs, hs, knuckle) { // 마디 하나: 끝으로 가늘어지는 관 + 끝 둥근 마디(+ 첫 마디는 손등 쪽 너클)
    const parts = [new G0.C(r0, r1, len, rs, hs, true).translate(0, -len / 2, 0), new G0.S(r1, rs, Math.max(4, rs * .7 | 0)).translate(0, -len, 0)];
    if (knuckle) parts.push(new G0.S(r0 * 1.06, rs, Math.max(4, rs * .7 | 0)));
    return parts;
  }
  function palmGeo(rs) { // 모서리가 둥근 손바닥(초타원체) + 손목
    const g = new G0.S(1, rs + 4, rs + 2), p = g.attributes.position, sg = v => Math.sign(v) * Math.pow(Math.abs(v), .55);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, sg(p.getX(i)) * PALM.T / 2 * (1 - .18 * Math.max(0, -p.getY(i))), sg(p.getY(i)) * PALM.L / 2, sg(p.getZ(i)) * PALM.W / 2);
    g.translate(.04, -PALM.L / 2 + .05, 0); g.computeVertexNormals();
    return [g, new G0.C(.62, .56, .9, rs + 2, 2, true).translate(0, .3, 0)];
  }
  function handGeo(s, hi) {
    const R = rig(s); R.root.updateMatrixWorld(true);
    const rs = hi ? (ULTRA ? 34 : 16) : 5, hs = hi ? (ULTRA ? 8 : 4) : 1, list = [];
    palmGeo(hi ? (ULTRA ? 22 : 16) : 6).forEach(g => list.push([g, 0]));
    R.fj.forEach((js, fi) => js.forEach((b, j) => seg(FING[fi].L[j], FING[fi].r * (1 - j * .1), FING[fi].r * (1 - (j + 1) * .1), rs, hs, j === 0).forEach(g => list.push([g.applyMatrix4(b.matrixWorld), R.B.indexOf(b)]))));
    R.th.forEach((b, j) => seg(TH.L[j], TH.r * (1 - j * .1), TH.r * (1 - (j + 1) * .1), rs, hs, j === 0).forEach(g => list.push([g.applyMatrix4(b.matrixWorld), R.B.indexOf(b)])));
    const cat = (push) => { // 합치기(+ 윤곽선용은 법선 방향으로 부풀림)
      const pos = [], nor = [], si = [], sw = [];
      list.forEach(([g0, bi]) => { const g = g0.index ? g0.toNonIndexed() : g0; if (!g.attributes.normal) g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal;
        for (let i = 0; i < P.count; i++) { pos.push(P.getX(i) + N.getX(i) * push, P.getY(i) + N.getY(i) * push, P.getZ(i) + N.getZ(i) * push); nor.push(N.getX(i), N.getY(i), N.getZ(i)); si.push(bi, 0, 0, 0); sw.push(1, 0, 0, 0); } });
      const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      o.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); o.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); o.computeBoundingSphere(); return o;
    };
    const geo = cat(0), out = cat(hi ? .05 : .06);
    return { geo, out, tri: geo.attributes.position.count / 3 };
  }
  const HG = { '1': { hi: handGeo(1, true), lo: handGeo(1, false) }, '-1': { hi: handGeo(-1, true), lo: handGeo(-1, false) } };
  HD.handTri = { hi: HG['1'].hi.tri, lo: HG['1'].lo.tri };
  const SKM = {}, OUTSK = new THREE.MeshBasicMaterial({ color: '#0a0610', side: THREE.BackSide, skinning: true });
  const skinMat = c => SKM[c] || (SKM[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: gm, skinning: true }));
  function addHands(m, ch) {
    const P = ch.P || {}, col = P.glove || P.skin || '#f0c8a0';
    m._hands = [['aF', true], ['aB', false]].map(([k, front]) => {
      const fore = m[k] && m[k].fore; if (!fore) return null;
      const s = (m[k].up.position.z || 1) > 0 ? 1 : -1, R = rig(s), g = HG[s];
      const mesh = new THREE.SkinnedMesh(g.lo.geo, skinMat(col)); mesh.add(R.root); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(R.B));
      const ol = new THREE.SkinnedMesh(g.lo.out, OUTSK); mesh.add(ol); ol.bind(mesh.skeleton, mesh.bindMatrix);
      const grp = new THREE.Group(); grp.position.set(0, -6.05, 0); grp.scale.setScalar(1 / PROP.armK); grp.add(mesh); fore.add(grp); // 팔 줄임과 상관없이 손 크기는 그대로
      mesh.frustumCulled = ol.frustumCulled = false; mesh.castShadow = true;
      // 원래 손(구 + 손가락 막대)이 보이면 숨김
      fore.children.forEach(o => { if (o.isMesh && o !== grp && o.position.y < -6.4 && o.material && o.material.type === 'MeshToonMaterial' && o.geometry.type !== 'BufferGeometry') o.visible = false; });
      return { front, s, grp, mesh, ol, R, g, cur: new Float32Array(21), key: null, hi: false };
    }).filter(Boolean);
  }
  // 손 모양 사전: 손가락(검지·중지·약지·새끼)마다 [첫마디·둘째·셋째] 굽힘 + 손가락 벌림 4 + 엄지 [벌림, 손바닥 쪽 맞섬, 밑동·둘째·끝마디 굽힘]
  const S = (f4, sp, th) => { const a = new Float32Array(21); f4.forEach((c, i) => { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; a[12 + i] = Array.isArray(sp) ? sp[i] : sp; }); for (let j = 0; j < 5; j++) a[16 + j] = th[j]; return a; };
  const FIST = [1.5, 1.65, 1.15], OPEN = [.04, .06, .04], STR = [0, .02, 0];
  const SHAPE = {
    relax: S([[.35, .45, .3], [.42, .52, .36], [.5, .6, .4], [.58, .66, .45]], .05, [.1, .1, .1, .2, .15]),       // 힘 뺀 손(새끼 쪽으로 갈수록 더 굽음)
    limp: S([[.5, .4, .25], [.6, .45, .3], [.7, .5, .32], [.82, .55, .35]], .02, [.2, .05, .1, .1, .1]),          // 맞고 힘 빠진 손
    fist: S([FIST, FIST, [1.55, 1.7, 1.15], [1.6, 1.7, 1.2]], 0, [-.55, .5, .3, .85, .7]),                        // 주먹(엄지가 검지·중지 위를 덮음)
    fistRun: S([[1.05, 1.2, .8], [1.1, 1.25, .85], [1.15, 1.3, .9], [1.2, 1.35, .9]], 0, [-.3, .3, .2, .6, .4]),  // 달릴 때 가볍게 쥔 주먹
    grip: S([[1.2, 1.35, 1.0], [1.25, 1.4, 1.05], [1.3, 1.45, 1.1], [1.38, 1.5, 1.12]], 0, [-.4, .55, .2, .7, .5]), // 칼 손잡이 감싸 쥠
    grip2: S([[1.28, 1.42, 1.05], [1.32, 1.46, 1.08], [1.36, 1.5, 1.12], [1.42, 1.55, 1.15]], 0, [-.45, .6, .25, .75, .55]), // 양손 검 아래손(더 꽉)
    open: S([OPEN, OPEN, OPEN, OPEN], [.16, .05, -.05, -.14], [.35, 0, .05, .05, .05]),                           // 편 손(손가락 벌림)
    palm: S([[-.15, -.05, 0], [-.15, -.05, 0], [-.12, -.04, 0], [-.1, -.03, 0]], [.06, .02, -.02, -.06], [.3, .1, 0, 0, 0]), // 손바닥 밀기(손가락 뒤로 젖힘)
    chop: S([STR, STR, STR, STR], -.03, [-.45, .35, .1, .3, .2]),                                                  // 손날(손가락 붙여 곧게)
    spear: S([STR, STR, [.05, .05, 0], [.1, .08, .02]], -.05, [-.5, .4, .15, .35, .25]),                           // 손끝 찌르기
    claw: S([[.55, .8, .7], [.5, .75, .65], [.55, .8, .7], [.6, .85, .7]], [.18, .06, -.06, -.18], [.3, .3, .2, .45, .35]), // 기 모은 손(나선환·치도리)
    grab: S([[.8, .9, .75], [.85, .95, .8], [.9, 1.0, .8], [.95, 1.0, .85]], .08, [-.1, .7, .3, .4, .3]),          // 움켜쥐기
    point: S([OPEN, FIST, FIST, FIST], 0, [-.5, .45, .3, .8, .6]),                                                 // 가리키기(검지)
    beckon: S([[.3, .5, .4], FIST, FIST, FIST], 0, [-.5, .45, .3, .8, .6]),                                        // 이리 와(검지 까딱 — 움직임은 아래에서)
    thumbsUp: S([FIST, FIST, FIST, FIST], 0, [.7, -.3, 0, 0, 0]),                                                  // 엄지척
    sealTiger: S([STR, STR, FIST, FIST], -.03, [-.6, .5, .3, .9, .6]),                                             // 인: 寅(검지·중지 세움)
    sealRam: S([STR, STR, [1.2, 1.3, .9], [1.25, 1.35, .9]], -.02, [-.2, .6, .4, .5, .3]),                         // 인: 未
    sealSnake: S([[.9, .7, .4], [.95, .7, .4], [1.0, .75, .45], [1.05, .8, .45]], .1, [-.3, .5, .2, .4, .3]),       // 인: 巳(깍지)
  };
  const SEALS = ['sealTiger', 'sealRam', 'sealSnake'];
  const PMAP = {}; // 기술 고유 자세 이름 → 손 모양(동작 사전이 없을 때)
  [['fist', 'punch punchL punchPrep uppercut elbow feint shoulder m_high m_low guard kickPrep kick highKick axe sweep jumpKnee stance landRec']
    , ['fistRun', 'run crouchRun'], ['open', 'cast armsWide skyRaise air flipAir block backstep sidestep duck crouchDodge roll twoHand'], ['palm', 'palm'], ['limp', 'hurt kneel']
    , ['seal', 'seal'], ['point', 'point eyeHand'], ['beckon', 'taunt'], ['chop', 'chidori iai'], ['relax', 'm_open stare land idle hold']]
    .forEach(([k, s]) => s.split(' ').forEach(p => { PMAP[p] = k; }));
  // 동작 이름(motions2.js)의 낱말 → 손 모양
  const NAME = [[/손날|목 긋는/, 'chop'], [/쌍장|손바닥|밀쳐|밀어치|한 손 받아|흘리기|쳐내기|짚/, 'palm'], [/잡아|손가락 꺾기|부여잡|어깨 들썩/, 'grab'], [/인 맺기/, 'seal'],
    [/손가락 까딱|이리 와/, 'beckon'], [/엄지척|나이스 가이/, 'thumbsUp'], [/손가락 겨눔/, 'point'], [/기 모으기|허리춤 모으기|고무 총/, 'claw'], [/손목 털기|감싸기/, 'limp'],
    [/두 손 앞으로|하늘로 손|기지개|날개|유수|부유|위빙/, 'open'], [/닌자 달리기|팔 펄럭|미끄러지듯/, 'open'], [/주먹|정권|박치기|두드리기|복서|무에타이|가드/, 'fist']];
  const CAT = { strike: 'fist', kick: 'fist', run: 'fistRun', strafe: 'fist', retreat: 'fist', defend: 'fist', evade: 'relax', hurt: 'limp', down: 'limp', tired: 'limp', hurtIdle: 'relax', land: 'relax', air: 'open', charge: 'open', taunt: 'fist', idle: 'relax' };
  const BRAWL = /saitama|gai|luffy|garou|genos|bang|ace|sakura|naruto|nezuko/;
  function shapeOf(f, h, m) {
    const sw = m.swd && m.swd.grp && m.swd.grp.visible, d = f.mo && f.mo.d, nm = d ? d.n : '';
    if (h.front && sw) return 'grip';
    if (!h.front && m.swd && m.swd.grp2 && m.swd.grp2.visible) return 'grip';
    if (!h.front && sw) { if (f.tgt && (f.tgt.gy || 0) > .2) return 'grip2'; if (/발도/.test(nm)) return 'grab'; }
    if (h.front && (f.hand || f.hhand)) return 'claw';
    let k = null;
    if (d) { for (const [re, s] of NAME) if (re.test(nm)) { k = s; break; } if (!k) k = CAT[d.cat] || null; if (k === 'relax' && d.cat === 'idle' && BRAWL.test(f.ch.key)) k = 'fist'; }
    if (!k) k = PMAP[f.hpose] || 'relax';
    if (/찌르기/.test(nm) && !sw) k = 'spear';
    if (k === 'seal' && f.ch.world !== 'naruto') k = 'open';
    if ((k === 'point' || k === 'beckon' || k === 'thumbsUp') && !h.front) k = 'fist';
    return k;
  }
  function poseHand(h, f, m, dt, t) {
    let key = shapeOf(f, h, m);
    if (key === 'seal') { if (!m._sealT || t > m._sealT || t < m._sealT - 2) { m._sealV = SEALS[Math.random() * SEALS.length | 0]; m._sealT = t + .28 + Math.random() * .25; } key = m._sealV; }
    h.key = key;
    const tg = SHAPE[key] || SHAPE.relax, c = h.cur;
    for (let i = 0; i < 4; i++) { // 검지부터 새끼까지 조금씩 늦게 접히고 펴짐
      const k = Math.min(1, dt * (21 - i * 3.2));
      for (let j = 0; j < 3; j++) { const ix = i * 3 + j; let v = tg[ix]; if (key === 'beckon' && i === 0) v = (Math.sin(t * 9) + 1) * .55 * (j + 1) / 2; c[ix] += (v - c[ix]) * k; }
      c[12 + i] += (tg[12 + i] - c[12 + i]) * k;
    }
    { const k = Math.min(1, dt * 15); for (let j = 16; j < 21; j++) c[j] += (tg[j] - c[j]) * k; }
    h.R.fj.forEach((js, i) => { js[0].rotation.z = c[i * 3]; js[1].rotation.z = c[i * 3 + 1]; js[2].rotation.z = c[i * 3 + 2]; js[0].rotation.x = -h.s * c[12 + i] * 2.2; });
    const [t1, t2, t3] = h.R.th; t1.rotation.set(-h.s * (.62 + c[16]), h.s * c[17] * .5, .38 + c[17] * .7 + c[18]); t2.rotation.z = c[19]; t3.rotation.z = c[20];
  }
  function setHandLod(h, hi) { if (h.hi === hi) return; h.hi = hi; const g = hi ? h.g.hi : h.g.lo; h.mesh.geometry = g.geo; h.ol.geometry = g.out; }

  // ═══ 3. 검: 칼날 단면(칼등 두껍고 날 쪽 얇게)·칼끝 기울기·날밑 테·손잡이 감은 끈 무늬·금속 반사 ═══
  const PH = {}, phong = (c, glow) => PH[c + glow] || (PH[c + glow] = glow ? new THREE.MeshBasicMaterial({ color: c }) : new THREE.MeshPhongMaterial({ color: c, specular: '#ffffff', shininess: 110, emissive: new THREE.Color(c).multiplyScalar(.12) }));
  const TEX = {};
  function itoTex(h) { // 손잡이 끈(쓰카이토) 마름모 무늬
    if (TEX[h]) return TEX[h];
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), base = new THREE.Color(h), lite = base.clone().lerp(new THREE.Color('#ffffff'), .35);
    x.fillStyle = '#' + base.getHexString(); x.fillRect(0, 0, 64, 64); x.fillStyle = '#' + lite.getHexString();
    for (let j = 0; j < 2; j++) { x.beginPath(); x.moveTo(32, j * 32 + 3); x.lineTo(58, j * 32 + 16); x.lineTo(32, j * 32 + 29); x.lineTo(6, j * 32 + 16); x.closePath(); x.fill(); }
    x.fillStyle = '#' + base.clone().multiplyScalar(.5).getHexString(); for (let j = 0; j < 2; j++) x.fillRect(29, j * 32 + 13, 6, 6);
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return (TEX[h] = t);
  }
  function bladeHi(L, W, curve, wave, jag) {
    const N = ULTRA ? 88 : 40, off = y => -curve * Math.pow(y / L, 2) * 2 + (wave ? Math.sin(y / L * PI * 5) * wave : 0), s = new THREE.Shape();
    s.moveTo(W / 2 + off(0), 0);
    for (let i = 1; i <= N; i++) { const y = L * i / N * .92, j = jag && i % 4 < 2 ? -jag * W * 2 : 0; s.lineTo(W / 2 + off(y) + j, y); }
    s.lineTo(off(L) - W * .15, L + W * .7);
    for (let i = N; i >= 0; i--) { const y = L * i / N * .92; s.lineTo(-W / 2 + off(y), y); }
    const T = Math.max(.12, W * .2), g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -T / 2);
    const p = g.attributes.position; // 단면을 쐐기로: 칼등(-x) 두껍게 → 날(+x) 얇게
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = Math.max(0, Math.min(1, (p.getX(i) - off(Math.min(y, L)) + W / 2) / W)); p.setZ(i, p.getZ(i) * (1 - .85 * u)); }
    g.computeVertexNormals(); return g;
  }
  function swordHi(grp, sp) {
    if (grp) grp.scale.setScalar(1 / PROP.armK); // 팔을 줄여도 검 길이는 원작 그대로
    if (!grp || grp._hd || sp.axe) return; grp._hd = { lo: grp.children.slice(), hi: [] };
    const add = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.visible = false; grp.add(o); grp._hd.hi.push(o); return o; };
    const Lh = sp.cleaver ? 4.5 : 5, U2 = ULTRA ? 2.4 : 1;
    add(new G0.C(.34, .34, Lh, Math.round(18 * U2), 6), new THREE.MeshToonMaterial({ color: '#ffffff', map: itoTex(sp.h), gradientMap: gm }), 1 - Lh / 2);
    add(new G0.S(.38, Math.round(16 * U2), 10), phong('#c8a040'), 1 - Lh).scale.set(1, .5, 1); // 손잡이 끝 마개
    if (sp.g) { add(new G0.C(sp.cleaver ? 1.4 : 1.05, sp.cleaver ? 1.4 : 1.05, .26, Math.round(36 * U2), 1), phong(sp.g), 1.15); add(new G0.T(sp.cleaver ? 1.4 : 1.05, .07, Math.round(6 * U2), Math.round(40 * U2)), phong('#f0d890'), 1.15).rotation.x = PI / 2; }
    add(new G0.C(.42, .42, .5, Math.round(16 * U2), 1), phong('#c8a040'), 1.35).scale.set(.7, 1, 1.25); // 칼집 쪽 고정쇠(하바키)
    add(bladeHi(sp.L, sp.W, sp.curve || 0, sp.wave || 0, sp.jag || 0), phong(sp.c, sp.glow), 1.3);
  }
  function setSwordLod(grp, hi) { if (!grp || !grp._hd || grp._hdOn === hi) return; grp._hdOn = hi; grp._hd.lo.forEach(o => { o.visible = !hi; }); grp._hd.hi.forEach(o => { o.visible = hi; }); }

  // ═══ 4. 자세 정보(손 모양용) ═══
  if (typeof apply === 'function') { const _ap = apply; apply = function (f, s) { const r = _ap.apply(this, arguments); if (f && s) { f.hpose = s.pose; f.hhand = s.hand || null; } return r; }; } // eslint-disable-line no-global-assign

  // ═══ 5. 거리 LOD + 숨쉬기·무게중심 이동·2차 동작(팔·고개가 몸 돌림에 늦게 따라옴) ═══
  let ft = 16, lastNow = 0, frameN = 0, hiSet = new Set();
  (function tick(now) { if (lastNow) { const d = now - lastNow; if (d < 100) ft += (d - ft) * .05; } lastNow = now; frameN++; requestAnimationFrame(tick); })(0);
  function pickHi() { // 고해상도 대상: 따라가는 인물 + 카메라에 가까운 인물(여유에 따라 0~2명)
    const s = new Set(); if (typeof F === 'undefined' || !F.length) return s;
    const cv = window.getCamView ? window.getCamView() : null;
    if (cv && cv.mode !== 'act' && cv.key) F.forEach(f => { if (f.ch.key === cv.key) s.add(f); });
    const room = ULTRA ? 8 : ft < 15 ? 3 : ft < 17.5 ? 2 : 1; // 라운드D: 울트리는 출전 전원 고해상도
    F.filter(f => !s.has(f)).map(f => [f, camera.position.distanceTo(f.pos)]).filter(x => x[1] < 120).sort((a, b) => a[1] - b[1]).slice(0, room).forEach(x => s.add(x[0]));
    return s;
  }
  const _pm = poseModel;
  poseModel = function (m, g, t) { // eslint-disable-line no-global-assign
    _pm(m, g, t);
    if (!g || !g.ch || !m || m !== g.ch.model) return; // 잔상·분신·거인 모형은 손대지 않음
    try {
      const dt = Math.max(0, Math.min(.05, t - (m._ht ?? t))); m._ht = t;
      if (m._hdF !== frameN && frameN % 15 === 0) { m._hdF = frameN; hiSet = pickHi(); HD.hiOn = hiSet.size; }
      const hi = hiSet.has(g);
      setLod(m, hi);
      if (!m._hands) { addHands(m, g.ch); [m.aF, m.aB].forEach(a => { a.up.position.z = Math.sign(a.up.position.z || 1) * PROP.shoulderZ; }); }
      m.aF.up.scale.multiplyScalar(PROP.armK); m.aB.up.scale.set(PROP.armK, PROP.armK, PROP.armK); m.head.scale.setScalar(PROP.headK); // 비례: 매 화면(팔 늘이기 기술 배율 위에 곱함)
      if (m.swd && !m.swd._hdDone) { m.swd._hdDone = true; swordHi(m.swd.grp, m.swd.sp); if (m.swd.grp2) swordHi(m.swd.grp2, { ...m.swd.sp, ...(m.swd.sp.dual || {}) }); }
      if (m.swd) { setSwordLod(m.swd.grp, hi); setSwordLod(m.swd.grp2, hi); }
      m._hands.forEach(h => { setHandLod(h, hi); poseHand(h, g, m, dt, t); });
      // 1인칭: 따라가는 인물의 두 팔을 가슴 앞으로 끌어올려(게임의 손 화면처럼) 손·검이 시야 아래쪽에 들어오게 — 동작은 40% 남김
      const cv = window.getCamView ? window.getCamView() : null, fp = cv && cv.mode === 'fp' && cv.key === g.ch.key;
      m._fpB = (m._fpB || 0) + ((fp ? 1 : 0) - (m._fpB || 0)) * Math.min(1, dt * 8);
      if (m._fpB > .01) {
        const k = m._fpB * .6, sw = !!(m.swd && m.swd.grp && m.swd.grp.visible);
        [[m.aF, sw ? 1.05 : .9, sw ? 1.55 : 1.85], [m.aB, sw ? 1.0 : .75, sw ? 1.6 : 1.9]].forEach(([a, up, fo]) => {
          const u0 = a.up.rotation.z, fAbs = u0 + a.fore.rotation.z, u1 = u0 + (up - u0) * k, f1 = fAbs + (fo - fAbs) * k;
          a.up.rotation.z = u1; a.fore.rotation.z = f1 - u1;
        });
      }
      // 숨쉬기: 가슴이 오르내리고 어깨가 살짝 들림(지치거나 막 맞았으면 빠르고 크게)
      const sp = Math.min(1, g.speed || 0), tired = g.gauge !== undefined ? Math.max(0, (60 - g.gauge) / 60) : 0;
      m._br = (m._br || Math.random() * 6) + dt * (2.1 + tired * 3.5 + sp * 2);
      const b = Math.sin(m._br) * (.014 + tired * .02) * (1 - sp * .5);
      if (m._ay0 === undefined) { m._ay0 = m.aF.up.position.y; m._by0 = m.aB.up.position.y; }
      m.torso.scale.set(1 + b * .7, 1 + b * .45, 1 + b);
      m.aF.up.position.y = m._ay0 + b * 9; m.aB.up.position.y = m._by0 + b * 9;
      // 무게중심 이동: 가만히 있을 때 좌우로 천천히 체중을 옮김
      const still = Math.max(0, 1 - sp * 2), ws = Math.sin(t * .85 + (m._hdI || (m._hdI = Math.random() * 9))) * still;
      m.body.position.z = ws * .45; m.body.rotation.x = -ws * .035;
      // 2차 동작: 몸이 돌거나 비틀면 팔·고개가 늦게 따라오고 출렁임
      const S2 = m._s2 || (m._s2 = { h: g.heading, tw: g.c.twist || 0, o: 0, v: 0 });
      if (dt > 0) {
        let dh = g.heading - S2.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); S2.h = g.heading;
        const dtw = ((g.c.twist || 0) - S2.tw) / dt; S2.tw = g.c.twist || 0;
        const drive = Math.max(-30, Math.min(30, dh / dt * .9 + dtw * .5));
        S2.v += (drive - S2.o * 140 - S2.v * 13) * dt; S2.o += S2.v * dt; S2.o = Math.max(-.4, Math.min(.4, S2.o));
      }
      m.aF.up.rotation.x += S2.o * .9; m.aB.up.rotation.x += S2.o * .9; m.aF.fore.rotation.z += Math.abs(S2.o) * .35; m.aB.fore.rotation.z += Math.abs(S2.o) * .35;
      m.head.rotation.y -= S2.o * .5;
    } catch (e) { if (!HD.err) { HD.err = String(e); console.error(e); } }
  };
  HD.stat = () => ({ built: HD.built, failed: HD.failed, hiOn: HD.hiOn, frameMs: +ft.toFixed(1), handTri: HD.handTri, sample: Object.entries(HD.tri).slice(0, 6) });
})();
