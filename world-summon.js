// 소환물 체계(11-05): 기술 이펙트가 아니라 '별도 개체' — 지속시간·체력·자기 행동·팀(소환자 편)·피격.
//  spawnSummon(owner, kind) → 소환물(마허라·옥견·누에·만상). 수사노오는 사스케·이타치 고유 모형으로 바꿔 그림.
//  모양은 코드로 깎은 고분할 도형(이미지·모형 파일 없음).
(function () {
  if (typeof scene3 === 'undefined' || !window.NEWWORLD) return;
  const NW = window.NEWWORLD, SUM = NW.summons = [];
  const toon = (c, o = {}) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: typeof gm !== 'undefined' ? gm : null }, o));
  const glowM = (c, op = .8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
  const limb = (r0, r1, len, mat, seg = 18) => { const g = new THREE.Group(); const c = mesh(new THREE.CylinderGeometry(r1, r0, len, seg, 4), mat, 0, -len / 2, 0); g.add(c); g.add(mesh(new THREE.SphereGeometry(r0 * 1.02, seg, 12), mat)); return g; }; // 위에서 아래로 매달린 팔다리(관절 구 포함)
  const lathe = (pts, mat, seg = 28) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);

  // ═══ 마허라(팔악검 이매 마허라): 근육질 흰 거인 · 머리 위 팔각 법륜 · 눈 위 날개 장식 4장 · 오른팔 퇴마의 검 · 허리 천 ═══
  function buildMahoraga() {
    const vein = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#f2eee6'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(150,140,128,' + (.2 + Math.random() * .3) + ')'; x.lineWidth = .8 + Math.random() * 1.6; x.beginPath(); let px = Math.random() * 256, py = 0; x.moveTo(px, py); while (py < 256) { px += (Math.random() - .5) * 18; py += 10 + Math.random() * 14; x.lineTo(px, py); } x.stroke(); } for (let i = 0; i < 30; i++) { x.strokeStyle = 'rgba(110,120,150,.35)'; x.lineWidth = 1.4; x.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (Math.random() - .5) * 30; py += (Math.random() - .5) * 30; x.lineTo(px, py); } x.stroke(); } const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 3); return tx; })();
    const W = toon('#ffffff', { map: vein }), Wd = toon('#d8d0c2', { map: vein }), cloth = toon('#3a3640'), gold = toon('#c8a050'), blade = toon('#f4f6fa');
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    // 몸통: 넓은 가슴·좁은 허리(선반 곡선), 복근·가슴 근육 덩이
    body.add(lathe([[0, 0], [3.2, 0], [3.6, 2], [3.2, 5], [3.9, 8], [5.6, 11], [6.2, 13.5], [5.2, 15], [2.2, 16], [0, 16.2]], W).translateY(14));
    [-1, 1].forEach(s => { body.add(mesh(new THREE.SphereGeometry(2.6, 20, 14), W, 1.8 * s, 27, 2.2, 0, 0, 0, 1.1, .8, .6)); }); // 가슴
    for (let r = 0; r < 3; r++) [-1, 1].forEach(s => body.add(mesh(new THREE.SphereGeometry(1.05, 14, 10), Wd, .95 * s, 18.4 + r * 2.1, 2.9, 0, 0, 0, 1, .8, .5))); // 복근
    // 머리: 길쭉한 얼굴·턱, 눈 위 날개 4장(좌우 2장씩 위로 뻗음)
    const head = new THREE.Group(); head.position.set(0, 32.5, 0); body.add(head);
    head.add(mesh(new THREE.SphereGeometry(2.1, 24, 18), W, 0, 0, 0, 0, 0, 0, .9, 1.15, 1));
    head.add(mesh(new THREE.SphereGeometry(1.2, 16, 12), Wd, 0, -1.5, .6, 0, 0, 0, 1, .7, .9));
    head.add(mesh(new THREE.BoxGeometry(1.7, .14, .3), toon('#2a1018'), 0, -1.55, 1.6)); for (let i = 0; i < 7; i++) head.add(mesh(new THREE.ConeGeometry(.09, .32, 6), toon('#f8f6f0'), -.72 + i * .24, -1.45, 1.66, Math.PI)); // 입가 날카로운 이빨
    head.add(mesh(new THREE.BoxGeometry(2.6, .5, .4), Wd, 0, .55, 1.75)); // 눈 없는 얼굴: 눈 자리를 덮는 띠
    [-1, 1].forEach(s => [0, 1].forEach(k => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(1.2, 1.4 + k, .5, 3.6 + k * 1.2); sh.quadraticCurveTo(.1, 2, -.4, .2); sh.lineTo(0, 0);
      const w = mesh(new THREE.ExtrudeGeometry(sh, { depth: .18, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2, curveSegments: 16 }), W, .7 * s + .55 * s * k, .55, 1.5, -.25, 0, -s * (.35 + k * .35)); head.add(w); }));
    // 법륜: 팔각 바퀴(바깥 테 · 8 살 · 8 손잡이) — 적응할 때마다 한 칸 회전
    const wheel = new THREE.Group(); wheel.position.set(0, 4.2, -.4); head.add(wheel);
    wheel.add(mesh(new THREE.TorusGeometry(3.2, .28, 12, 64), gold, 0, 0, 0, Math.PI / 2));
    wheel.add(mesh(new THREE.TorusGeometry(.9, .22, 10, 32), gold, 0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, sp = mesh(new THREE.CylinderGeometry(.13, .13, 2.4, 8), gold, Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05, 0, 0, Math.PI / 2); sp.rotation.y = -a; wheel.add(sp);
      wheel.add(mesh(new THREE.ConeGeometry(.32, 1.1, 10), gold, Math.cos(a) * 3.9, 0, Math.sin(a) * 3.9, 0, 0, -Math.PI / 2).rotateY(0)); }
    wheel.children.slice(-8).forEach((c, i) => { const a = i / 8 * Math.PI * 2; c.rotation.set(0, -a, -Math.PI / 2); });
    // 팔(근육 굵은 위팔·아래팔), 오른팔엔 퇴마의 검
    const arm = s => { const sh = new THREE.Group(); sh.position.set(6.6 * s, 28.3, 0); body.add(sh); sh.add(mesh(new THREE.SphereGeometry(2.3, 20, 14), W)); const up = limb(2, 1.6, 6.6, W); sh.add(up); const el = new THREE.Group(); el.position.y = -6.6; up.add(el); const fo = limb(1.6, 1.2, 6.2, W); el.add(fo); fo.add(mesh(new THREE.SphereGeometry(1.35, 16, 12), Wd, 0, -6.8, 0)); return { sh, el, fo }; };
    const R_ = arm(-1), L_ = arm(1);
    const sword = new THREE.Group(); sword.position.set(0, -7, 0); R_.fo.add(sword);
    sword.add(mesh(new THREE.CylinderGeometry(.35, .35, 2.6, 10), gold, 0, 0, 0));
    sword.add(mesh(new THREE.BoxGeometry(2.2, .4, .9), gold, 0, -1.3, 0));
    const bl = new THREE.Shape(); bl.moveTo(-1.1, 0); bl.lineTo(1.1, 0); bl.lineTo(1.25, 6); bl.lineTo(.9, 15); bl.lineTo(0, 18); bl.lineTo(-.9, 15); bl.lineTo(-1.25, 6); bl.lineTo(-1.1, 0);
    sword.add(mesh(new THREE.ExtrudeGeometry(bl, { depth: .14, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 2 }), blade, 0, -1.4, -.07, Math.PI, 0, 0));
    sword.add(mesh(new THREE.BoxGeometry(.32, 14, .1), toon('#7a8494'), 0, -9.5, .32)); sword.add(mesh(new THREE.BoxGeometry(.32, 14, .1), toon('#7a8494'), 0, -9.5, -.18)); // 날 가운데 홈
    sword.add(mesh(new THREE.PlaneGeometry(.3, 16), glowM('#cfe8ff', .45), 0, -10, .5));
    // 다리·허리 천
    const leg = s => { const h = new THREE.Group(); h.position.set(2.3 * s, 14, 0); body.add(h); const th = limb(2.4, 1.8, 7.5, W); h.add(th); const kn = new THREE.Group(); kn.position.y = -7.5; th.add(kn); const sh = limb(1.8, 1.2, 7, W); kn.add(sh); sh.add(mesh(new THREE.BoxGeometry(2, .9, 3.4), Wd, 0, -7.2, .8)); return { h, kn }; };
    const LL = leg(-1), LR = leg(1);
    body.add(lathe([[3.8, 0], [4.6, -2], [5.4, -6.5], [5.6, -7]], cloth, 32).translateY(15.5));
    body.add(mesh(new THREE.TorusGeometry(3.9, .45, 10, 40), toon('#2a2630'), 0, 15.6, 0, Math.PI / 2));
    for (let i = 0; i < 4; i++) body.add(mesh(new THREE.TorusGeometry(4.3 + i * .35, .18, 6, 40), toon('#24202a'), 0, 13.6 - i * 1.6, 0, Math.PI / 2)); // 천 주름
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; body.add(mesh(new THREE.ConeGeometry(.55, 1.4, 4), Wd, Math.cos(a) * 3.4, 12.6, Math.sin(a) * 3.4, Math.PI, 0, 0)); } // 하반신 비늘
    root.scale.setScalar(1.95);
    return { root, body, head, wheel, R_, L_, LL, LR, sword };
  }
  // ═══ 옥견(흰·검은 늑대), 누에(올빼미형 큰 새), 만상(코끼리) ═══
  function buildDog(c) {
    const M = toon(c), D = toon(c === '#f4f4f8' ? '#c8c8d0' : '#0a0a10'), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    body.add(mesh(new THREE.SphereGeometry(3, 24, 16), M, 0, 6, 0, 0, 0, 0, 1.6, .9, .9));
    body.add(mesh(new THREE.SphereGeometry(2.4, 20, 14), M, 4.2, 7.4, 0, 0, 0, 0, 1, 1.1, 1)); // 가슴 털
    const head = new THREE.Group(); head.position.set(6.4, 9, 0); body.add(head);
    head.add(mesh(new THREE.SphereGeometry(1.8, 20, 14), M)); head.add(mesh(new THREE.ConeGeometry(.95, 2.6, 16), M, 1.9, -.4, 0, 0, 0, -Math.PI / 2));
    [-1, 1].forEach(s => { head.add(mesh(new THREE.ConeGeometry(.55, 1.6, 10), M, -.2, 1.7, .9 * s, s * .2, 0, 0)); head.add(mesh(new THREE.SphereGeometry(.22, 10, 8), toon('#ffd040'), 1, .4, .8 * s)); });
    body.add(mesh(new THREE.ConeGeometry(.9, 5, 14), M, -5.5, 7.5, 0, 0, 0, Math.PI / 2 + .5)); // 꼬리
    const legs = []; [[3.2, 1], [3.2, -1], [-3, 1], [-3, -1]].forEach(([x, s]) => { const l = limb(.8, .55, 5.2, D); l.position.set(x, 5.2, 1.4 * s); body.add(l); legs.push(l); });
    return { root, body, head, legs };
  }
  function buildNue() {
    const M = toon('#2a2a36'), F = toon('#e8e4d8'), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    body.add(mesh(new THREE.SphereGeometry(2.6, 22, 16), M, 0, 0, 0, 0, 0, 0, 1, 1.3, 1));
    body.add(mesh(new THREE.SphereGeometry(1.6, 20, 14), F, .8, 2.8, 0)); // 하얀 가면 얼굴
    [-1, 1].forEach(s => body.add(mesh(new THREE.SphereGeometry(.35, 10, 8), toon('#ffd040'), 2.1, 3, .6 * s)));
    const wings = []; [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); for (let i = 0; i <= 6; i++) { const t = i / 6; sh.lineTo(t * 11, Math.sin(t * Math.PI) * 3 - t * 1.5 - (i % 2) * .8); } sh.lineTo(9, -2.6); sh.quadraticCurveTo(4, -1.5, 0, -1.2);
      const w = mesh(new THREE.ExtrudeGeometry(sh, { depth: .15, bevelEnabled: false, curveSegments: 12 }), M); const g = new THREE.Group(); g.add(w); g.position.set(0, .8, 1.2 * s); g.rotation.y = s * Math.PI / 2; g.scale.z = s; body.add(g); wings.push(g); });
    [-1, 1].forEach(s => body.add(mesh(new THREE.ConeGeometry(.3, 2.4, 8), toon('#c8a040'), 0, -3.4, .8 * s, Math.PI))); // 발톱
    return { root, body, wings };
  }
  function buildElephant() {
    const M = toon('#8a8a98'), D = toon('#6a6a78'), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    body.add(mesh(new THREE.SphereGeometry(7, 28, 20), M, 0, 13, 0, 0, 0, 0, 1.5, 1, 1));
    const head = new THREE.Group(); head.position.set(10, 15, 0); body.add(head); head.add(mesh(new THREE.SphereGeometry(4.4, 24, 18), M));
    [-1, 1].forEach(s => { head.add(mesh(new THREE.SphereGeometry(4, 20, 12), D, -1.5, .5, 4.2 * s, 0, 0, 0, .3, 1.1, 1)); head.add(mesh(new THREE.ConeGeometry(.5, 4, 12), toon('#f4f0e2'), 3, -2.4, 1.8 * s, 0, 0, -1.9)); });
    const trunk = new THREE.Group(); trunk.position.set(3.6, -1, 0); head.add(trunk); trunk.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(2.2, -3, 0), V3(2.6, -7, 0), V3(4, -9, 0)]), 24, .9, 12), M));
    const legs = []; [[5, 1], [5, -1], [-5, 1], [-5, -1]].forEach(([x, s]) => { const l = limb(2.2, 2, 9, D); l.position.set(x, 9, 4 * s); body.add(l); legs.push(l); });
    root.scale.setScalar(1.6); return { root, body, head, trunk, legs };
  }
  // ═══ Blender 로 깎은 마허라(assets/summon/mahoraga.glb: 근육·핏줄 요철, 날개 장식, 금속 법륜, 퇴마의 검, 허리 천, 다리 비늘 + 뼈대) ═══
  (function loadMaho(n) { if (!THREE.GLTFLoader || !THREE.SkeletonUtils) { if (n < 120) setTimeout(() => loadMaho(n + 1), 500); return; }
    new THREE.GLTFLoader().load('assets/summon/mahoraga.glb', g => { const s = g.scene; s.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(s); NW.mahoTpl = { scene: s, h: box.max.y - box.min.y, minY: box.min.y };
      s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material && o.material.name === 'MahoSkin') { o.material.roughness = .62; } } }); }, undefined, e => { NW.mahoErr = String(e && e.message || e); }); })(0);
  const MAHO_H = 34 * MS * 3.6; // 사람(약 19)의 3.6배
  function buildMahoGLB() {
    const T = NW.mahoTpl, root = new THREE.Group(), inner = THREE.SkeletonUtils.clone(T.scene), k = MAHO_H / T.h; inner.scale.setScalar(k); inner.position.y = -T.minY * k; root.add(inner); root.updateMatrixWorld(true);
    const B = {}; inner.traverse(o => { if (o.isBone) B[o.name] = o; });
    const side = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(); const ax = {}; // 몸 좌우 축(앞뒤로 흔들기)을 뼈 자기 좌표로
    ['thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'upperarm_l', 'upperarm_r', 'lowerarm_r', 'lowerarm_l', 'spine_02', 'head'].forEach(nm => { const b = B[nm]; if (!b) return; b.getWorldQuaternion(q); ax[nm] = { rest: b.quaternion.clone(), side: side.clone().applyQuaternion(q.clone().invert()).normalize(), up: up.clone().applyQuaternion(q.clone().invert()).normalize() }; });
    const wheel = inner.getObjectByName('MahoWheel'); let wax = null; if (wheel) { wheel.getWorldQuaternion(q); wax = { rest: wheel.quaternion.clone(), up: up.clone().applyQuaternion(q.clone().invert()).normalize() }; }
    return { root, glb: true, B, ax, wheel, wax };
  }
  const swing = (m, nm, a, which = 'side') => { const A = m.ax[nm], b = m.B[nm]; if (!A || !b) return; b.quaternion.copy(A.rest).multiply(new THREE.Quaternion().setFromAxisAngle(A[which], a)); };
  const BUILD = { mahoraga: () => NW.mahoTpl ? buildMahoGLB() : buildMahoraga(), dogW: () => buildDog('#f4f4f8'), dogB: () => buildDog('#141418'), nue: buildNue, elephant: buildElephant };
  const KIND = { // 지속(초)·체력·속도·공격 사거리·공격 위력·이름
    mahoraga: { life: 14, hp: 400, spd: 70, reach: 28, pw: 2.2, nm: '팔악검 이매 마허라', ek: 'light', fly: false, cd: 1.3 },
    dogW: { life: 10, hp: 90, spd: 150, reach: 10, pw: 1.1, nm: '옥견 · 백', ek: 'shadow2', cd: .9 }, dogB: { life: 10, hp: 90, spd: 150, reach: 10, pw: 1.1, nm: '옥견 · 흑', ek: 'shadow2', cd: .9 },
    nue: { life: 9, hp: 70, spd: 120, reach: 30, pw: 1.2, nm: '누에', ek: 'bolt', fly: true, cd: 1.1 },
    elephant: { life: 4.5, hp: 200, spd: 0, reach: 40, pw: 1.8, nm: '만상', ek: 'water', drop: true, cd: 9 },
  };
  const teamOf = f => f && (f.team || (f.ch && f.ch.world));
  const foes = s => F.filter(f => f !== s.owner && teamOf(f) !== teamOf(s.owner));
  window.spawnSummon = function (owner, kind) {
    if (!owner || !BUILD[kind]) return null; const K = KIND[kind], m = BUILD[kind](), s = { owner, kind, K, m, pos: owner.pos.clone(), heading: owner.heading, life: K.life, hp: K.hp, cd: .6, t: 0, atk: 0, adapted: new Map(), wheelA: 0 };
    const back = fwdOf(owner).multiplyScalar(kind === 'elephant' ? 0 : -14); s.pos.add(back).add(V3(R(-8, 8), 0, R(-8, 8)));
    if (kind === 'elephant') { const tg = foes(s)[0]; if (tg) s.pos.copy(tg.pos); s.y = 120; } else s.y = kind === 'nue' ? 30 : -30; // 그림자에서 솟아오름(땅 아래에서 시작)
    if (kind === 'mahoraga') { s.y = -75; flashC = '0,0,0'; whiteout = .55; setTimeout(() => { flashC = '255,255,255'; }, 900); shake = Math.max(shake, 14); setTimeout(() => { label(s.pos.clone().add(V3(0, 80, 0)), '오오오오—!', '#f4f0e8', { big: true }); ring(V3(s.pos.x, .3, s.pos.z), 20, '#e8e4dc', true, 1.4, 4); shake = Math.max(shake, 12); }, 1200); }
    m.root.position.copy(s.pos); scene3.add(m.root); SUM.push(s);
    ring(V3(s.pos.x, .3, s.pos.z), 10, '#141420', true, 1.2, 2.4); for (let i = 0; i < 40; i++) parts.push({ p: s.pos.clone().add(V3(R(-8, 8), 1, R(-8, 8))), v: V3(R(-20, 20), R(30, 120), R(-20, 20)), life: 1.2, c: pick(['#0a0a14', '#2a2a40', '#5a5a7a']), g: -10, s: R(2, 4) });
    label(s.pos.clone().add(V3(0, 20, 0)), '소환 · ' + K.nm, '#e8e8ff', { big: true }); return s;
  };
  function hitFoe(s, tg, nm, pw) { // 소환물의 공격: 소환자 이름으로 상처·넉백
    try { const o = Math.random() < .75 ? 'hit' : 'block'; resolve(s.owner, tg, s.K.ek, o, nm, pw); } catch (e) { wound(tg, s.owner, nm, s.K.ek); }
  }
  function tick(s, dt, t) {
    s.t += dt; s.life -= dt; s.cd -= dt; const m = s.m, K = s.K;
    const rise = s.kind === 'elephant' ? -1 : 1; if (s.kind !== 'elephant') s.y += (0 - s.y) * Math.min(1, dt * (s.kind === 'nue' ? 1.5 : 3)); else s.y = Math.max(0, s.y - dt * 160);
    const fs = foes(s), tg = fs.sort((a, b) => a.pos.distanceTo(s.pos) - b.pos.distanceTo(s.pos))[0];
    if (tg && K.spd) { const d = tg.pos.clone().sub(s.pos); d.y = 0; const L = d.length(); s.heading = Math.atan2(d.z, d.x); if (L > K.reach * .8) s.pos.addScaledVector(d.normalize(), Math.min(L - K.reach * .7, K.spd * dt)); s.walk = L > K.reach * .8; }
    // 공격
    if (tg && s.cd <= 0 && tg.pos.distanceTo(s.pos) < K.reach + 4 && s.y < 5) { s.cd = K.cd + R(0, .5); s.atk = 1;
      if (s.kind === 'mahoraga') pending.push({ t: .35, fn: () => { const p = chest(tg); mark(p, R(-.4, .4), 30, '#e8f4ff', 1.2, .6); dome(p, 14, '#e8f4ff'); hitFoe(s, tg, '퇴마의 검', K.pw); shake = Math.max(shake, 8); } });
      else if (s.kind === 'nue') pending.push({ t: .2, fn: () => { bolt(s.pos.clone().add(V3(0, 30, 0)), chest(tg), '#cfe8ff', .5, 2); hitFoe(s, tg, '누에 · 번개', K.pw); } });
      else hitFoe(s, tg, K.nm + ' · 물어뜯기', K.pw); }
    if (s.kind === 'elephant' && s.y <= 0 && !s.landed) { s.landed = 1; explode(s.pos.clone().add(V3(0, 4, 0)), 'water', 2.6); ring(V3(s.pos.x, .3, s.pos.z), 16, '#6ac0ff', true, 1.4, 3); shake = Math.max(shake, 12); fs.filter(f => f.pos.distanceTo(s.pos) < 36).forEach(f => hitFoe(s, f, '만상 · 짓누르기', K.pw)); for (let i = 0; i < 6; i++) pending.push({ t: .3 + i * .25, fn: () => { const p = s.pos.clone().add(V3(14, 18, 0)); for (let k = 0; k < 30; k++) parts.push({ p, v: V3(R(40, 120), R(-20, 40), R(-40, 40)), life: 1, c: pick(ELEM.water.parts), g: 160, s: 2.5 }); } }); }
    s.atk = Math.max(0, s.atk - dt * 2.2);
    // 동작(걷기 흔들림·공격 휘두르기·법륜 회전·날개짓)
    m.root.position.set(s.pos.x, s.y + (s.kind === 'nue' ? 28 + Math.sin(t * 3) * 2 : 0), s.pos.z); m.root.rotation.y = -s.heading + (s.kind === 'mahoraga' ? Math.PI / 2 : 0);
    const w = s.walk ? Math.sin(s.t * 6) : 0;
    if (s.kind === 'mahoraga' && m.glb) { const sw = s.atk > 0 ? Math.sin((1 - s.atk) * Math.PI) : 0, br = Math.sin(s.t * 1.6) * .03;
      swing(m, 'thigh_l', w * .45); swing(m, 'thigh_r', -w * .45); swing(m, 'calf_l', Math.max(0, -w) * .5); swing(m, 'calf_r', Math.max(0, w) * .5);
      swing(m, 'upperarm_l', -w * .3 + br); swing(m, 'upperarm_r', -1.6 * sw + w * .25 + br); swing(m, 'lowerarm_r', -.9 * sw); swing(m, 'spine_02', .18 * sw + br); swing(m, 'head', Math.sin(s.t * .7) * .12, 'up');
      s.wheelA += ((s.adaptN || 0) * Math.PI / 4 - s.wheelA) * Math.min(1, dt * 4); if (m.wheel && m.wax) m.wheel.quaternion.copy(m.wax.rest).multiply(new THREE.Quaternion().setFromAxisAngle(m.wax.up, s.wheelA + s.t * .15));
      if (Math.random() < dt * 25) parts.push({ p: m.root.position.clone().add(V3(R(-16, 16), R(10, 64), R(-16, 16))).addScaledVector(V3(Math.cos(s.heading), 0, Math.sin(s.heading)), -12), v: V3(R(-10, 10), R(10, 40), R(-10, 10)), life: 1.2, c: pick(['#0a0a14', '#1a1a2a', '#2a2438']), g: -10, s: R(3, 6) }); }
    else if (s.kind === 'mahoraga') { m.LL.h.rotation.x = w * .4; m.LR.h.rotation.x = -w * .4; m.L_.sh.rotation.x = -w * .3; const sw = s.atk > 0 ? Math.sin((1 - s.atk) * Math.PI) : 0; m.R_.sh.rotation.x = -1.2 * sw + w * .2; m.R_.sh.rotation.z = -.3 * sw; m.body.position.y = Math.abs(w) * .4;
      s.wheelA += ((s.adaptN || 0) * Math.PI / 4 - s.wheelA) * Math.min(1, dt * 4); m.wheel.rotation.y = s.wheelA;
      if (Math.random() < dt * 25) parts.push({ p: m.root.position.clone().add(V3(R(-14, 14), R(10, 60), R(-14, 14))).addScaledVector(V3(Math.cos(s.heading), 0, Math.sin(s.heading)), -10), v: V3(R(-10, 10), R(10, 40), R(-10, 10)), life: 1.2, c: pick(['#0a0a14', '#1a1a2a', '#2a2438']), g: -10, s: R(3, 6) }); }
    else if (m.legs) m.legs.forEach((l, i) => { l.rotation.z = w * .5 * (i % 2 ? 1 : -1); });
    if (m.wings) m.wings.forEach((g, i) => { g.rotation.x = Math.sin(t * 10) * .5 * (i ? 1 : -1); });
    // 사라짐
    if (s.life <= 0 || s.hp <= 0) { for (let i = 0; i < 40; i++) parts.push({ p: m.root.position.clone().add(V3(R(-8, 8), R(0, 20), R(-8, 8))), v: V3(R(-20, 20), R(-60, -10), R(-20, 20)), life: 1, c: pick(['#0a0a14', '#2a2a40']), g: 0, s: 3 }); label(m.root.position.clone().add(V3(0, 22, 0)), s.hp <= 0 ? K.nm + ' 격파!' : K.nm + ' · 그림자로 돌아감', '#cfd0e8'); scene3.remove(m.root); return false; }
    return true;
  }
  // 소환물 피격: 적의 공격이 소환물 가까이에서 맞으면 소환물이 대신 막아 섬(마허라는 같은 기술에 적응)
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw) {
    try { const guard = SUM.find(s => s.hp > 0 && s.y < 5 && teamOf(s.owner) === teamOf(b) && teamOf(a) !== teamOf(b) && s.pos.distanceTo(b.pos) < 26 && Math.random() < .3);
      if (guard && a !== guard.owner) { const key = String(nm || ek);
        if (guard.kind === 'mahoraga') { const n = (guard.adapted.get(key) || 0) + 1; guard.adapted.set(key, n); if (n >= 2) { label(guard.m.root.position.clone().add(V3(0, 40, 0)), '적응 완료 · ' + key + ' 무효', '#ffe8a0', { big: true }); ring(guard.m.root.position.clone().add(V3(0, 36, 0)), 6, '#ffd060', false, 1, 2); return; }
          guard.adaptN = (guard.adaptN || 0) + 1; label(guard.m.root.position.clone().add(V3(0, 38, 0)), '법륜 회전 · 적응 중', '#ffd060'); }
        guard.hp -= 30 * (pw || 1); dome(guard.m.root.position.clone().add(V3(0, 14, 0)), 10, '#ffffff'); return; } } catch (e) { }
    return _res.apply(this, arguments);
  };
  // ═══ 수사노오: 사스케(보라 · 갑주 텐구 얼굴 · 날개 · 불꽃 활) / 이타치(주황 · 텐구 가면 · 야타 거울 방패 · 토츠카 검 호리병) ═══
  function buildSusanoo(kind) {
    const c = kind === 'itachi' ? '#ff6a3a' : '#a050ff', c2 = kind === 'itachi' ? '#ffb070' : '#d0a0ff';
    const M = glowM(c, .32), M2 = glowM(c2, .5), root = new THREE.Group();
    // 갈비뼈(1단계 해골) + 갑주 몸통(선반 곡선 껍데기)
    for (let i = 0; i < 6; i++) root.add(mesh(new THREE.TorusGeometry(6 - i * .4, .35, 8, 40, Math.PI * 1.3), M2, 0, 18 + i * 2.2, 0, Math.PI / 2, 0, -Math.PI * .15));
    root.add(lathe([[0, 0], [6, 0], [8.5, 6], [10.5, 14], [12, 20], [9, 26], [4, 29], [0, 29.5]], M, 32).translateY(10));
    // 머리: 투구 + 텐구 코(길게 튀어나온 가면) + 뿔
    const head = new THREE.Group(); head.position.set(0, 44, 0); root.add(head);
    head.add(mesh(new THREE.SphereGeometry(5, 28, 20), M, 0, 0, 0, 0, 0, 0, 1, 1.15, 1));
    head.add(mesh(new THREE.ConeGeometry(1.1, kind === 'itachi' ? 6 : 3.5, 14), M2, 0, -.5, 5.2, Math.PI / 2));
    [-1, 1].forEach(s => { head.add(mesh(new THREE.ConeGeometry(.9, 6, 12), M2, 2.6 * s, 4.8, -.5, 0, 0, -s * .5)); head.add(mesh(new THREE.SphereGeometry(.6, 12, 10), glowM('#ffffff', .9), 1.8 * s, .8, 4.4)); });
    // 팔
    const arms = []; [-1, 1].forEach(s => { const g = new THREE.Group(); g.position.set(12 * s, 34, 0); root.add(g); g.add(limb(2.6, 2, 12, M)); arms.push(g); });
    if (kind === 'itachi') { // 야타 거울(왼손 방패: 둥근 판 + 쉼표 무늬 3) · 토츠카 검(오른손: 호리병 + 액체 칼날)
      const sh = new THREE.Group(); sh.position.set(3, -12, 3); arms[1].add(sh); sh.add(mesh(new THREE.CylinderGeometry(6, 6, .6, 48), M2, 0, 0, 0, Math.PI / 2)); for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; sh.add(mesh(new THREE.TorusGeometry(1.4, .35, 8, 24, Math.PI * 1.2), glowM('#ffffff', .7), Math.cos(a) * 2.6, Math.sin(a) * 2.6, .5, 0, 0, a)); }
      const sw = new THREE.Group(); sw.position.set(0, -12, 0); arms[0].add(sw); sw.add(mesh(new THREE.SphereGeometry(1.6, 16, 12), M2)); sw.add(mesh(new THREE.SphereGeometry(1.1, 16, 12), M2, 0, -1.8, 0)); sw.add(mesh(new THREE.CylinderGeometry(.5, .2, 22, 16, 8), glowM('#fff0d0', .65), 0, -13, 0)); }
    else { // 사스케: 불꽃 활(왼손) + 등 날개
      const bow = mesh(new THREE.TorusGeometry(10, .5, 10, 48, Math.PI), M2, 0, -12, 4, 0, 0, Math.PI / 2); arms[1].add(bow);
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(10 * s, 8, 18 * s, 4); sh.lineTo(14 * s, -2); sh.quadraticCurveTo(8 * s, 0, 0, -3); root.add(mesh(new THREE.ShapeGeometry(sh, 16), M, 4 * s, 34, -5)); }); }
    return { root, head, arms, mats: [M, M2] };
  }
  const SUSA = { sasuke: null, itachi: null };
  NW.susanooOn = false; // 수사노오 정밀 모형은 다른 작업(Blender)이 맡음 — 겹치지 않게 기본 끔(켜려면 NEWWORLD.susanooOn = true)
  function susanooTick(dt, t) { if (!NW.susanooOn) { ['sasuke', 'itachi'].forEach(k => { if (SUSA[k]) SUSA[k].root.visible = false; }); return; }
    ['sasuke', 'itachi'].forEach(k => {
      const g = giants.find(x => x.f && x.f.ch && x.f.ch.key === k), i = giants.indexOf(g);
      if (g && i >= 0 && giantPool[i]) giantPool[i].root.visible = false; // 기존 공용 반투명 사람 형상 숨김
      let S = SUSA[k]; if (!g) { if (S) S.root.visible = false; return; }
      if (!S) { S = SUSA[k] = buildSusanoo(k); scene3.add(S.root); }
      const f = g.f, grow = Math.min(1, (5 - Math.min(5, g.life)) * 3, g.life * 2); S.root.visible = true;
      S.root.position.copy(f.pos).sub(fwdOf(f).multiplyScalar(6)); S.root.rotation.y = -f.heading + Math.PI / 2; S.root.scale.setScalar(Math.max(.05, grow) * 1.05);
      S.mats[0].opacity = .26 + .06 * Math.sin(t * 6); S.arms.forEach((a, j) => { a.rotation.x = Math.sin(t * 2 + j) * .2; });
    });
  }
  const _upd = update;
  update = function (dt, t) { const r = _upd.apply(this, arguments); try { NW.summons.splice(0, NW.summons.length, ...NW.summons.filter(s => tick(s, dt, t))); susanooTick(dt, t); } catch (e) { console.warn('[summon]', e); } return r; };
  // 교대·무대 정리 때 소환물 제거
  const _init = initFighters; initFighters = function () { SUM.forEach(s => scene3.remove(s.m.root)); SUM.length = 0; return _init.apply(this, arguments); };
  // 후시구로 기술을 소환물로 교체(이펙트가 아니라 개체)
  const meg = CH.megumi; if (meg) {
    const summonSk = (nm, kinds, seal) => (a, b) => [...seq(a, b, [[seal || 'seal', .45, { aura: 1, elem: 'shadow2' }]]), step(.35, [[a, { pose: 'seal', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, nm, kinds.includes('mahoraga')); kinds.forEach(k => spawnSummon(a, k)); }), step(.3, [[a, { pose: 'guard', face: b }], [b, { pose: 'stance', face: a }]])];
    meg.skills['십종영법술 · 옥견'] = summonSk('십종영법술 · 옥견', ['dogW', 'dogB']);
    meg.skills['십종영법술 · 누에'] = summonSk('십종영법술 · 누에', ['nue']);
    meg.skills['십종영법술 · 만상'] = summonSk('십종영법술 · 만상', ['elephant'], 'skyRaise');
    delete meg.skills['조복의식 · 팔악검 이우 장군 마허라'];
    meg.skills['조복의식 · 팔악검 이매 마허라'] = summonSk('포단령 · 팔악검 이매 마허라', ['mahoraga'], 'braced');
  }
  if (CH.sukuna) { delete CH.sukuna.skills['마허라 소환']; CH.sukuna.skills['해·팔 · 난도'] = (a, b) => [...CH.sukuna.skills['해(解)'](a, b), ...CH.sukuna.skills['팔(捌)'](a, b)]; }
})();
