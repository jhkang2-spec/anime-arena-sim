// 새 세계관 공용(진격의 거인·주술회전, 11-05): 속성 색·검 만들기·거인화 크기·영역전개 공간·팀/세계관 등록 도우미.
// 기존 파일(arena.js·teams.js·mocap.js·combat.js)은 공개된 전역(CH·WORLD·ROSTER·ELEM·PALS·defChar·TEAMS·registerCharAsset·COMBAT.PROF)으로만 붙인다.
(function () {
  if (typeof CH === 'undefined' || typeof defChar !== 'function') return;
  const NW = window.NEWWORLD = { list: [], domains: [] };

  // ── 속성(색·입자) ──
  Object.assign(ELEM, {
    titan: { c: '#ffc860', parts: ['#ffffff', '#fff2c0', '#ffc860', '#d8742a'], g: -10, style: 'spark' },   // 거인화 번개(금빛)
    vapor: { c: '#f0ece4', parts: ['#ffffff', '#f4f0ea', '#dcd6cc', '#bfb8ac'], g: -30, style: 'gust' },   // 거인 증기
    odm: { c: '#cfe0f0', parts: ['#ffffff', '#e8f0f8', '#b8c8d8', '#8a9aac'], g: 0, style: 'metal' },     // 입체기동 칼날·가스
    spear: { c: '#ffb040', parts: ['#fff2a0', '#ffd060', '#ff8a20', '#5a3a2a'], g: -20, style: 'flame' },  // 뇌창 폭발
    harden: { c: '#e8f4ff', parts: ['#ffffff', '#dff0ff', '#a8d4f0', '#7aa8d0'], g: 60, style: 'frost' },  // 경질화 결정
    cursed: { c: '#3a6aff', parts: ['#ffffff', '#a8c0ff', '#3a6aff', '#121a4a'], g: -6, style: 'shadow' }, // 주력(푸른 기운)
    bflash: { c: '#ff2a2a', parts: ['#000000', '#2a0000', '#ff2a2a', '#ffffff'], g: 0, style: 'spark' },   // 흑섬(검은 번개+붉은 섬광)
    ao: { c: '#2a8aff', parts: ['#ffffff', '#9ad0ff', '#2a8aff', '#0a2a8a'], g: 0, style: 'gust' },        // 창(끌어당김)
    aka: { c: '#ff2a3a', parts: ['#ffffff', '#ff9aa0', '#ff2a3a', '#7a0010'], g: 0, style: 'flame' },      // 혁(밀어냄)
    murasaki: { c: '#a040ff', parts: ['#ffffff', '#d8b0ff', '#a040ff', '#3a0a7a'], g: 0, style: 'shadow' },// 자(허식)
    shrine: { c: '#ff3a3a', parts: ['#ffffff', '#ff9a9a', '#ff3a3a', '#3a0008'], g: 0, style: 'metal' },   // 해·팔 참격
    shadow2: { c: '#3a3a5a', parts: ['#9a9ab8', '#5a5a7a', '#2a2a40', '#0a0a14'], g: 0, style: 'shadow' }, // 십종영법술 그림자
    nail: { c: '#ffb070', parts: ['#ffffff', '#ffd0a0', '#ff9a50', '#a04a20'], g: 40, style: 'metal' },     // 못·공명
  });

  // ── 세계관·팀 ──
  NW.addWorld = (key, def, order) => { WORLD[key] = def; if (!ROSTER[key]) ROSTER[key] = []; NW.list.push({ key, order }); };
  NW.addTeam = () => { if (!window.TEAMS) return; NW.list.forEach(({ key, order }) => { const ok = order.filter(k => CH[k]); if (ok.length) window.TEAMS[key] = ok; }); };

  // ── 검(기존 모형 손에 붙임 → 모션 캡처 몸도 같은 칼을 손 뼈에 쥠) ──
  const tm = c => new THREE.MeshToonMaterial({ color: c, gradientMap: typeof gm !== 'undefined' ? gm : null });
  function blade(sp) {
    const g = new THREE.Group(); g.position.set(0, -6.95, 0);
    const h = new THREE.Mesh(new THREE.BoxGeometry(.6, 4.4, .6), tm(sp.h)); h.position.y = 1 - 2.2; g.add(h);
    if (sp.g) { const gd = new THREE.Mesh(new THREE.BoxGeometry(1.5, .35, 1.1), tm(sp.g)); gd.position.y = 1.15; g.add(gd); }
    const L = sp.L, W = sp.W, geo = new THREE.BufferGeometry(), v = [];
    const tri = (a, b, c) => v.push(...a, ...b, ...c);
    // 얇은 외날(칼등 두께 .18, 끝은 비스듬히 자름 — 입체기동 교체식 칼날·일본도)
    const p0 = [-.09, 1.3, 0], p1 = [W, 1.3, 0], p2 = [W * (sp.cut ? .1 : .35), 1.3 + L, 0], p3 = [-.09, 1.3 + L * (sp.cut ? .93 : .97), 0];
    const off = z => p => [p[0], p[1], p[2] + z];
    [[p0, p1, p2], [p0, p2, p3]].forEach(([a, b, c]) => { tri(off(.09)(a), off(.09)(b), off(.09)(c)); tri(off(-.09)(a), off(-.09)(c), off(-.09)(b)); });
    tri(off(.09)(p0), off(.09)(p3), off(-.09)(p3)); tri(off(.09)(p0), off(-.09)(p3), off(-.09)(p0));
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    const bl = new THREE.Mesh(geo, tm(sp.c)); g.add(bl); return g;
  }
  NW.sword = (key, sp) => { const c = CH[key]; if (!c || !c.model) return; const m = c.model; if (m.swd) return;
    m.swd = { sp, grp: blade(sp) }; m.aF.fore.add(m.swd.grp); if (sp.dual) { m.swd.grp2 = blade(sp); m.aB.fore.add(m.swd.grp2); } };

  // ── 거인화: 변신 동안 몸을 키우고(f.scale), 증기를 뿜음 ──
  NW.titanBuff = (a, b, nm, ek, key, k, dur, pose) => { const st = T.buff(a, b, nm, ek, { key, dur, pose: pose || 'skyRaise' }); const s0 = st[0], old = s0.fx;
    s0.fx = () => { if (old) old(); a._tk = k; titanBurst(a); }; return st; };
  function titanBurst(a) { // 원작: 하늘에서 떨어지는 노란 번개 → 폭발 → 증기 기둥
    const g = a.pos.clone(); for (let i = 0; i < 4; i++) pending.push({ t: i * .05, fn: () => bolt(g.clone().add(V3(R(-30, 30), 300, R(-30, 30))), g.clone().add(V3(0, 4, 0)), i ? '#ffc860' : '#ffffff', 1.1, 2.6) });
    pending.push({ t: .2, fn: () => { explode(g.clone().add(V3(0, 10, 0)), 'titan', 2.4); dome(chest(a), 34, '#ffc860', '#fff6e0'); for (let i = 0; i < 70; i++) parts.push({ p: g.clone().add(V3(R(-10, 10), R(0, 20), R(-10, 10))), v: V3(R(-60, 60), R(60, 220), R(-60, 60)), life: R(1.4, 2.6), c: pick(ELEM.vapor.parts), g: -25, s: R(2.5, 4.5) }); shake = Math.max(shake, 12); } });
  }
  // ── 거인 모형(변신 forms.build): 사람 옷·머리는 숨기고 거인 머리(긴 머리·이빨 턱·빛나는 눈)·갑옷 판·결정을 덧붙임 ──
  const bm = (c, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: typeof gm !== 'undefined' ? gm : null }, o));
  const glow = c => new THREE.MeshBasicMaterial({ color: c });
  NW.titanBuild = (kind) => (rig) => {
    const hg = rig.headG, adds = [], hidden = [];
    const hide = o => { if (o && o.visible) { o.visible = false; hidden.push(o); } };
    // 사람 옷·머리카락·얼굴 숨김(머리뼈 구 [0]만 남김)
    (rig.meshes || []).forEach(m => { if (m.name !== 'Human') hide(m); }); (rig.cloths || []).forEach(hide);
    const rad = o => o.geometry && o.geometry.parameters && o.geometry.parameters.radius || 0, HR0 = hg ? Math.max(...hg.children.map(rad)) : 1;
    if (hg) hg.children.forEach(o => { if (!(o.geometry && o.geometry.type === 'SphereGeometry' && rad(o) >= HR0 * .9)) hide(o); }); // 머리뼈 구만 남기고 머리카락·얼굴은 숨김
    // 손에 쥔 입체기동 칼날도 거인 몸엔 없음(보이기는 매 화면 원본을 따라가므로 크기 0으로 숨김)
    const shrunk = (rig.swd || []).map(x => x.obj).filter(Boolean); shrunk.forEach(o => o.scale.setScalar(1e-4));
    (rig.extraGear || []).forEach(hide);
    // 몸 색: 빛(emissive) 덧칠이 아니라 피부 재질 자체를 거인 살색·근육 결로 바꿈(옷 색칠 정점색은 끔)
    const SK = { attack: '#b8735a', colossal: '#8a2a22', armored: '#e6dcc4', female: '#d39a7c' }[kind], saved = [];
    const muscleTex = NW._mt || (NW._mt = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 140; i++) { x.strokeStyle = `rgba(${120 + Math.random() * 60},${30 + Math.random() * 30},${30 + Math.random() * 20},${.25 + Math.random() * .35})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const sx = Math.random() * 256; x.moveTo(sx, 0); x.bezierCurveTo(sx + R(-30, 30), 80, sx + R(-30, 30), 170, sx + R(-20, 20), 256); x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })());
    [rig.mat, rig.matD].filter(Boolean).forEach(m => { saved.push([m, m.color.clone(), m.vertexColors, m.map]); m.color.set(SK); m.vertexColors = false; m.map = (kind === 'colossal' || kind === 'attack') ? muscleTex : null; m.needsUpdate = true; });
    const undoAll = () => { hidden.forEach(o => { o.visible = true; }); shrunk.forEach(o => o.scale.setScalar(1)); saved.forEach(([m, c, vc, mp]) => { m.color.copy(c); m.vertexColors = vc; m.map = mp; m.needsUpdate = true; }); };
    if (!hg) return { undo: undoAll };
    const HR = HR0 / 1.05;
    const put = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * HR, y * HR, z * HR); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); hg.add(m); adds.push(m); return m; };
    const K = { attack: { hair: '#2e1c10', eye: '#6aff9a', skin: '#c27a5c', long: 1 }, colossal: { hair: null, eye: '#ffffff', skin: '#9a2a22', long: 0 }, armored: { hair: '#e0c070', eye: '#fff4c0', skin: '#e8dcc0', long: 0 }, female: { hair: '#f0d890', eye: '#7ac8ff', skin: '#d89a7a', long: 0 } }[kind];
    const skin = bm(K.skin), dark = bm('#1a0a06'), teeth = bm('#f4efe2'), gum = bm('#6a1410');
    const skullSw = hg.children.filter(o => o.visible && o.isMesh).map(o => [o, o.material]); skullSw.forEach(([o]) => { o.material = skin; }); // 머리뼈도 거인 살색
    // 얼굴: 움푹한 눈구멍 + 빛나는 눈 + 입술 없는 이빨 턱(거인 특징) + 뾰족한 귀
    [-1, 1].forEach(s => { put(new THREE.SphereGeometry(HR * .2, 12, 8), dark, .82, .12, .33 * s, 0, 0, 0, .6, .8, 1); put(new THREE.SphereGeometry(HR * .085, 10, 8), glow(K.eye), .93, .12, .33 * s);
      put(new THREE.ConeGeometry(HR * .16, HR * .5, 8), skin, -.05, .15, 1.0 * s, s * 1.3, 0, 0); });
    put(new THREE.BoxGeometry(HR * .14, HR * .38, HR * 1.0), gum, .9, -.48, 0);
    for (let i = 0; i < 9; i++) { const z = (i - 4) * .11; put(new THREE.BoxGeometry(HR * .1, HR * .15, HR * .085), teeth, .97, -.39, z); put(new THREE.BoxGeometry(HR * .1, HR * .15, HR * .085), teeth, .97, -.57, z); }
    if (kind === 'attack' || kind === 'colossal') [-1, 1].forEach(s => put(new THREE.PlaneGeometry(HR * .7, HR * .05), glow(kind === 'colossal' ? '#ff6a4a' : '#7a2a1a'), .9, -.2, .55 * s, 0, Math.PI / 2 + s * .5, s * .35)); // 볼 근육 줄
    // 머리카락: 진격의 거인은 어깨까지 오는 긴 흑갈색 머리, 여성형·갑옷은 짧은 금발, 초대형은 없음(근육 노출 해골)
    if (K.hair) { const hm = bm(K.hair); put(new THREE.SphereGeometry(HR * 1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * .55), hm, -.08, .08, 0);
      const n = K.long ? 12 : 7, L = K.long ? 1.7 : .7; for (let i = 0; i < n; i++) { const a = Math.PI * .35 + i / (n - 1) * Math.PI * 1.3; put(new THREE.ConeGeometry(HR * .22, HR * L, 6), hm, Math.cos(a) * .82 - .1, .1 - L * .45, Math.sin(a) * .85, 0, 0, Math.PI + Math.cos(a) * .25); } }
    if (kind === 'armored') { const pl = bm('#f6f2e6'); put(new THREE.SphereGeometry(HR * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), pl, 0, .12, 0); [-1, 1].forEach(s => put(new THREE.BoxGeometry(HR * .5, HR * .6, HR * .12), pl, .72, -.05, .55 * s, 0, s * .6, 0)); put(new THREE.BoxGeometry(HR * .2, HR * .5, HR * .5), pl, .95, -.62, 0); }
    if (kind === 'female') [-1, 1].forEach(s => put(new THREE.PlaneGeometry(HR * .5, HR * .04), glow('#ff7a6a'), .92, -.32, .3 * s, 0, Math.PI / 2, s * .2));
    const undo0 = undoAll; return { adds, undo: () => { skullSw.forEach(([o, m]) => { o.material = m; }); undo0(); }, tick: () => shrunk.forEach(o => o.scale.setScalar(1e-4)) };
  };
  // 거인화 중엔 거인 기술(무거운 주먹·밟기·포효)만 고름
  const TITAN_RE = /거인|포효|경질화|증기|땅울림|열폭풍|비명|돌진|태클|박치기|조르기|낙하/;
  if (typeof skillOf === 'function') { const _so = skillOf; skillOf = function (a, b, quick) {
    if (a && a._tk && a.mode > 0) { const sub = Object.fromEntries(Object.entries(a.ch.skills).filter(([k]) => TITAN_RE.test(k) && !/^거인화/.test(k))); if (Object.keys(sub).length) { const save = a.ch.skills; a.ch.skills = sub; try { return _so.call(this, a, b, true); } finally { a.ch.skills = save; } } }
    return _so.apply(this, arguments); }; }

  // ── 영역전개: 두 사람을 감싸는 공간(안쪽 면 구) ──
  function domTex(kind) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    if (kind === 'void') { // 무량공처: 끝없는 우주 — 짙은 남보라에 흰 별·빛 줄기
      const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#05030f'); g.addColorStop(.5, '#1a1040'); g.addColorStop(1, '#05030f'); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .9})`; const s = Math.random() < .08 ? 2 : 1; x.fillRect(Math.random() * 256, Math.random() * 128, s, s); }
      for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(180,200,255,${.15 + Math.random() * .2})`; x.lineWidth = 1; x.beginPath(); const y = Math.random() * 128; x.moveTo(0, y); x.lineTo(256, y + R(-20, 20)); x.stroke(); }
    } else { // 복마어주자: 핏빛 하늘·검은 사당 그림자·입·뼈 무더기
      const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#2a0004'); g.addColorStop(.55, '#7a0a10'); g.addColorStop(1, '#1a0002'); x.fillStyle = g; x.fillRect(0, 0, 256, 128);
      x.fillStyle = '#0a0002'; for (let i = 0; i < 8; i++) { const cx = i * 34 + 10, w = R(14, 26), h = R(20, 40); x.fillRect(cx, 128 - h, w, h); x.beginPath(); x.moveTo(cx - 4, 128 - h); x.lineTo(cx + w / 2, 128 - h - 10); x.lineTo(cx + w + 4, 128 - h); x.fill(); }
      x.strokeStyle = 'rgba(255,220,220,.5)'; for (let i = 0; i < 40; i++) { x.beginPath(); const px = Math.random() * 256, py = Math.random() * 90; x.moveTo(px, py); x.lineTo(px + R(-12, 12), py + R(-8, 8)); x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
  }
  const texC = {};
  NW.domain = (a, b, kind, nm, ek) => {
    const c = chest(a).clone().lerp(chest(b), .5); c.y = 0;
    const mat = new THREE.MeshBasicMaterial({ map: texC[kind] || (texC[kind] = domTex(kind)), side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false });
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), mat); m.position.copy(c); m.scale.setScalar(4); scene3.add(m);
    NW.domains.push({ m, t: 0, dur: 3.2, kind, ek });
    ring(V3(c.x, .3, c.z), 10, ELEM[ek].c, true, 1.6, 8); dome(c.clone().add(V3(0, 12, 0)), 40, ELEM[ek].c);
    label(headP(a).add(V3(0, 12, 0)), '영역전개 · ' + nm, '#ffffff', { big: true });
  };
  const _upd = update;
  update = function (dt, t) {
    const r = _upd.apply(this, arguments);
    try {
      for (const f of F) { if (!f._tk) continue; const want = f.mode > 0 ? f._tk : 1; f._ts = (f._ts || 1) + (want - (f._ts || 1)) * Math.min(1, dt * 3); f.scale = (f.ch.bodyScale || 1) * f._ts;
        if (f.mode > 0 && Math.random() < dt * 6) parts.push({ p: headP(f).add(V3(R(-6, 6), R(-4, 6), R(-6, 6))), v: V3(R(-20, 20), R(30, 80), R(-20, 20)), life: R(1, 2), c: pick(ELEM.vapor.parts), g: -20, s: R(2, 4) });
        if (f.mode <= 0 && !f._out) { f._out = 1; const n = headP(f); for (let i = 0; i < 50; i++) parts.push({ p: n.clone().add(V3(R(-8, 8), R(-6, 8), R(-8, 8))), v: V3(R(-40, 40), R(40, 160), R(-40, 40)), life: R(1.2, 2.2), c: pick(ELEM.vapor.parts), g: -25, s: R(3, 5) }); label(n, '목덜미에서 빠져나옴', '#f0ece4'); } // 해제: 증기 속 목덜미에서 사람 복귀
        if (f.mode > 0) f._out = 0;
        if (f.mode > 0 && f._ts > 1.5 && f.kb) f.kb.multiplyScalar(Math.max(0, 1 - dt * 6)); // 거인은 무거워 넉백이 짧음
        if (f.mode <= 0 && Math.abs(f._ts - 1) < .02) { f.scale = f.ch.bodyScale || 1; f._tk = 0; f._ts = 1; f._out = 0; } }
      NW.domains = NW.domains.filter(d => { d.t += dt; const k = d.t / d.dur, grow = Math.min(1, d.t / .35);
        d.m.scale.setScalar(4 + grow * 130); d.m.material.opacity = k < .1 ? k / .1 * .92 : k > .85 ? (1 - k) / .15 * .92 : .92; d.m.rotation.y += dt * (d.kind === 'void' ? .25 : .08);
        if (d.kind === 'shrine' && Math.random() < dt * 30) mark(d.m.position.clone().add(V3(R(-60, 60), R(4, 40), R(-60, 60))), R(0, PI), R(10, 24), '#ffe0e0', .6, .4);
        if (d.kind === 'void' && Math.random() < dt * 20) parts.push({ p: d.m.position.clone().add(V3(R(-50, 50), R(5, 60), R(-50, 50))), v: V3(0, 0, 0), life: .8, c: '#ffffff', g: 0, s: R(1, 2.5) });
        if (k >= 1) { scene3.remove(d.m); d.m.geometry.dispose(); d.m.material.dispose(); return false; } return true; });
    } catch (e) { console.warn('[newworld]', e); }
    return r;
  };
  // ── 입체기동장치: 와이어 앵커 두 줄 + 가스 분사(공중 이동) ──
  NW.wire = (a, tgt) => { const h = chest(a), p = (tgt || h.clone().add(V3(R(-60, 60), R(50, 90), R(-60, 60)))); bolt(h.clone().add(V3(-2, 0, 0)), p, '#c8ccd8', .35, .35); bolt(h.clone().add(V3(2, 0, 0)), p.clone().add(V3(R(-8, 8), R(-4, 4), R(-8, 8))), '#c8ccd8', .35, .35);
    for (let i = 0; i < 14; i++) parts.push({ p: a.pos.clone().add(V3(R(-2, 2), 12, R(-2, 2))), v: V3(R(-30, 30), R(-20, 10), R(-30, 30)), life: .6, c: '#e8ecf2', g: -5, s: R(1.5, 2.5) }); };
  // ── 마무리(teams.js 뒤에 불림): 팀 등록 + 저장된 세계관 선택 되살림 + 전투 행동 자료 ──
  NW.finish = (prof, keyp) => {
    NW.addTeam();
    if (window.COMBAT && COMBAT.PROF) { Object.assign(COMBAT.PROF, prof || {}); Object.assign(COMBAT.KEYP, keyp || {}); }
    try { const saved = JSON.parse(localStorage.getItem('arenaTeams') || '[]'); if (Array.isArray(saved) && saved.some(w => NW.list.some(x => x.key === w)) && window.setTeams) setTeams(saved); } catch (e) { }
  };
})();
