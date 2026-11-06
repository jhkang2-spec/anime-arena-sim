// 지면 파괴 조합 생성기(소유자 11-05: "바닥 효과가 다 똑같아서 단조로워 — 100개 이상, 상황별로 다 다르게")
// 생김새 = 모양 원형 16 × 속성 9 × 규모 4 (+ 원인별 지면 문양 3종 × 속성). 같은 조합도 회전·크기·잔해 수·무늬 판본이 매번 달라 반복 체감이 없게.
//  모양: 균열망·거미줄·별·지그재그 도랑·나선 균열·동심원 단차·방사 가시·들린 암반·구덩이·이중 구덩이·연쇄 폭발 자국·발자국 함몰·검 베기 홈·끌린 자국·소용돌이 패임·결정 돌출
//  속성: 흙·불 그을림·용암 틈·얼음 결정·번개 그을림 가지·물 웅덩이·모래 흘러내림·어둠 침식·빛 결정
//  원인: 맨손 타격·검 베기(방향)·투사체 착탄·필살(영역전개)·거인 발구름 → 원인마다 고르는 모양이 다르고, 필살·큰 충격엔 지면 문양(영역전개 문양·술식 원진·차크라 문양)
// ground2.js 의 흔들림→파괴 연결을 그대로 쓰고(GROUND2.gen 으로 바꿔 끼움), env.js 의 판석·가시·파편·구덩이·먼지를 재사용한다.
(function () {
  const G = window.GROUND2; if (!G || typeof scene3 === 'undefined') return;
  const envCall = (fn, ...a) => { const e = window.__env; if (e && typeof e[fn] === 'function') return e[fn](...a); };
  const GG = window.GROUNDGEN = { seen: new Set(), glyphSeen: new Set(), events: 0, list() { return [...GG.seen]; } };

  // ── 속성 9종: 무늬 색·빛·입자·소품 ──
  const EL = {
    earth: { dark: '#140d07', glow: '#c89a60', glowT: .8, puff: ['#7a6852', '#8a765c', '#6a5a46'], life: 1 },
    fire: { dark: '#0a0604', glow: '#ff7a20', glowT: 2.2, puff: ['#2a1a12', '#3a2418', '#ff8a30'], life: 1, ember: '#ff9a40' },
    lava: { dark: '#1a0602', glow: '#ff3a0a', glowT: 9, puff: ['#3a1a10', '#ff5a10', '#ffb040'], life: 1.3, ember: '#ffcf60' },
    ice: { dark: '#7fb8d8', glow: '#cff4ff', glowT: 4, puff: ['#eaf8ff', '#cfeeff', '#ffffff'], life: 1.2, crystal: '#bfeaff' },
    bolt: { dark: '#060608', glow: '#9ad6ff', glowT: .7, puff: ['#2a2a34', '#dfefff', '#9ad6ff'], life: 1, spark: '#e8f6ff', flicker: true },
    water: { dark: '#1c2a30', glow: '#7fd0ff', glowT: 1.2, puff: ['#bfe6ff', '#ffffff', '#8fcfe8'], life: .9, puddle: true },
    sand: { dark: '#5a4426', glow: '#e0b870', glowT: 1, puff: ['#c8a868', '#d8b878', '#b8985a'], life: 1, flow: true },
    dark: { dark: '#08020c', glow: '#8a2aff', glowT: 3, puff: ['#1a0a24', '#3a1a50', '#5a2a80'], life: 1.4, wisp: '#6a3aa0' },
    light: { dark: '#4a3a10', glow: '#fff2a0', glowT: 3, puff: ['#fff8d0', '#ffe9a0', '#ffffff'], life: 1.1, crystal: '#ffe680' },
  };
  const elemOf = (ek, level) => { ek = ek || 'earth';
    if (/fire|sun|kurama|blood|steam/.test(ek)) return level >= 2.6 ? 'lava' : 'fire';
    if (/ice|snow|frost/.test(ek)) return 'ice'; if (/bolt|thunder|raiton/.test(ek)) return 'bolt'; if (/water|mist|wave/.test(ek)) return 'water';
    if (/sand|earth|rock|stone/.test(ek)) return ek === 'sand' ? 'sand' : 'earth'; if (/dark|hollow|shadow|curse|room|psychic|void/.test(ek)) return 'dark';
    if (/light|holy|petal|chakra|wind/.test(ek)) return 'light'; return 'earth'; };

  // ── 무늬 그림 생성기(캔버스) — 모양마다 여러 판본, 처음 쓸 때 만들어 재사용 ──
  const texCache = new Map();
  function tex(shape, ver) { const k = shape + ver; if (texCache.has(k)) return texCache.get(k); const t = new THREE.CanvasTexture(draw(shape, ver)); texCache.set(k, t); return t; }
  function draw(shape, ver) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.strokeStyle = x.fillStyle = '#fff'; x.lineCap = x.lineJoin = 'round';
    let s = (ver + 1) * 7919 + shape.length * 131; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const br = (px, py, a, w, n, st, sp = .9) => { x.beginPath(); x.moveTo(px, py); for (let i = 0; i < n; i++) { a += (rnd() - .5) * sp; px += Math.cos(a) * st; py += Math.sin(a) * st; w *= .9; x.lineWidth = Math.max(.6, w); x.lineTo(px, py); x.stroke(); x.beginPath(); x.moveTo(px, py); if (rnd() < .14 && n - i > 3) br(px, py, a + (rnd() < .5 ? .9 : -.9), w * .7, (n - i) * .6 | 0, st * .9, sp); } };
    const blob = (cx, cy, r, k = 1) => { x.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283, rr = r * (.8 + rnd() * .35 * k); i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
    switch (shape) {
      case 'web': { const n = 8 + (rnd() * 7 | 0); for (let k = 0; k < n; k++) br(128, 128, k / n * 6.28 + rnd() * .3, 5, 12, 9); for (let r = 1; r <= 3; r++) { x.lineWidth = 1.6 / r + .6; x.beginPath(); for (let k = 0; k <= n; k++) { const a = k / n * 6.28, rr = (r * 32 + rnd() * 8) * (.85 + rnd() * .3); k ? x.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr) : x.moveTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } x.stroke(); } break; }
      case 'star': { const n = 5 + (rnd() * 4 | 0); for (let k = 0; k < n; k++) { const a = k / n * 6.28 + rnd() * .2; x.beginPath(); x.moveTo(128 + Math.cos(a - .18) * 14, 128 + Math.sin(a - .18) * 14); x.lineTo(128 + Math.cos(a) * (95 + rnd() * 25), 128 + Math.sin(a) * (95 + rnd() * 25)); x.lineTo(128 + Math.cos(a + .18) * 14, 128 + Math.sin(a + .18) * 14); x.fill(); } blob(128, 128, 22); break; }
      case 'zigzag': { x.lineWidth = 14 + rnd() * 6; x.beginPath(); let px = 0, py = 128; x.moveTo(px, py); while (px < 256) { px += 18 + rnd() * 18; py = 128 + (rnd() - .5) * 70; x.lineTo(px, py); } x.stroke(); for (let k = 0; k < 14; k++) br(rnd() * 256, 128 + (rnd() - .5) * 60, rnd() * 6.28, 2.5, 5, 7); break; }
      case 'spiral': { x.lineWidth = 6; x.beginPath(); for (let i = 0; i < 260; i++) { const a = i * .09 + ver, r = 6 + i * .45; const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); x.lineWidth = 7 - i * .02; } x.stroke(); for (let k = 0; k < 10; k++) br(128, 128, rnd() * 6.28, 2, 9, 9); break; }
      case 'steps': { for (let r = 4; r >= 1; r--) { x.globalAlpha = .35 + (4 - r) * .18; blob(128, 128, r * 28 + rnd() * 6, .6); } x.globalAlpha = 1; x.lineWidth = 2; for (let r = 1; r <= 4; r++) { x.beginPath(); x.arc(128, 128, r * 28, 0, 6.3); x.stroke(); } break; }
      case 'spikes': { for (let k = 0; k < 14; k++) { const a = rnd() * 6.28, d = 20 + rnd() * 80; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 5 + rnd() * 7); } const n = 9; for (let k = 0; k < n; k++) br(128, 128, k / n * 6.28, 4, 10, 9); break; }
      case 'slab': { for (let k = 0; k < 9; k++) { const a = rnd() * 6.28, d = 30 + rnd() * 70; x.save(); x.translate(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); x.rotate(rnd() * 3); x.lineWidth = 3; x.strokeRect(-18 - rnd() * 10, -12 - rnd() * 6, 36 + rnd() * 20, 24 + rnd() * 12); x.restore(); } for (let k = 0; k < 7; k++) br(128, 128, k / 7 * 6.28, 4, 12, 9); break; }
      case 'pit': { x.globalAlpha = .9; blob(128, 128, 54, 1.4); x.globalAlpha = 1; for (let k = 0; k < 12; k++) br(128 + Math.cos(k) * 50, 128 + Math.sin(k) * 50, k / 12 * 6.28, 3, 6, 9); break; }
      case 'dpit': { x.globalAlpha = .9; blob(96, 120, 40, 1.3); blob(166, 140, 32, 1.3); x.globalAlpha = 1; x.lineWidth = 6; x.beginPath(); x.moveTo(96, 120); x.lineTo(166, 140); x.stroke(); for (let k = 0; k < 9; k++) br(128, 130, rnd() * 6.28, 3, 7, 9); break; }
      case 'chain': { for (let k = 0; k < 5; k++) { const px = 30 + k * 48 + rnd() * 10, py = 128 + (rnd() - .5) * 40, r = 14 + rnd() * 12; x.globalAlpha = .85; blob(px, py, r, 1.4); x.globalAlpha = 1; for (let j = 0; j < 5; j++) br(px, py, rnd() * 6.28, 2.5, 4, 7); } break; }
      case 'foot': { const fp = (cx, cy, rot) => { x.save(); x.translate(cx, cy); x.rotate(rot); x.beginPath(); x.ellipse(0, 0, 22, 42, 0, 0, 6.3); x.fill(); for (let t = 0; t < 5; t++) { x.beginPath(); x.arc(-16 + t * 8, -50, 6, 0, 6.3); x.fill(); } x.restore(); }; x.globalAlpha = .9; fp(100, 140, -.2); fp(160, 110, .15); x.globalAlpha = 1; for (let k = 0; k < 12; k++) br(128, 128, rnd() * 6.28, 3, 7, 9); break; }
      case 'sword': { x.lineWidth = 10; x.beginPath(); x.moveTo(8, 128 + (rnd() - .5) * 12); x.quadraticCurveTo(128, 128 + (rnd() - .5) * 40, 248, 128 + (rnd() - .5) * 12); x.stroke(); x.lineWidth = 3; for (let k = 0; k < 2; k++) { x.beginPath(); x.moveTo(20, 128 + (k ? 12 : -12)); x.lineTo(236, 128 + (k ? 9 : -9)); x.stroke(); } for (let k = 0; k < 12; k++) br(rnd() * 256, 128, (rnd() < .5 ? -1 : 1) * 1.57 + (rnd() - .5) * .6, 2, 4, 8); break; }
      case 'drag': { for (let k = 0; k < 4; k++) { x.lineWidth = 4 + rnd() * 5; x.beginPath(); const y0 = 100 + k * 18 + rnd() * 6; x.moveTo(10, y0); for (let i = 1; i <= 10; i++) x.lineTo(i * 24, y0 + (rnd() - .5) * 8); x.stroke(); } x.globalAlpha = .7; blob(232, 128, 30, 1.3); x.globalAlpha = 1; break; }
      case 'vortex': { for (let arm = 0; arm < 4; arm++) { x.lineWidth = 9; x.beginPath(); for (let i = 0; i < 60; i++) { const a = arm * 1.57 + i * .08, r = 10 + i * 1.8; const px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } x.globalAlpha = .8; blob(128, 128, 26); x.globalAlpha = 1; break; }
      case 'crystal': { for (let k = 0; k < 10; k++) { const a = rnd() * 6.28, d = 15 + rnd() * 80; x.save(); x.translate(128 + Math.cos(a) * d, 128 + Math.sin(a) * d); x.rotate(rnd() * 6.28); x.beginPath(); x.moveTo(0, -16); x.lineTo(8, 0); x.lineTo(0, 16); x.lineTo(-8, 0); x.closePath(); x.fill(); x.restore(); } for (let k = 0; k < 8; k++) br(128, 128, k / 8 * 6.28, 3, 10, 9, .4); break; }
      default: { const n = 6 + (rnd() * 7 | 0); for (let k = 0; k < n; k++) br(128, 128, k / n * 6.28 + rnd() * .5, 6, 14, 8.5); } // radial
    }
    return c;
  }
  // 지면 문양(원인별): 영역전개 문양·술식 원진·차크라 문양
  function glyphTex(kind, ver) { const k = 'g' + kind + ver; if (texCache.has(k)) return texCache.get(k); const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.strokeStyle = x.fillStyle = '#fff'; x.translate(256, 256);
    let s = ver * 37 + 11; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    if (kind === 'domain') { [230, 200, 120].forEach((r, i) => { x.lineWidth = i === 1 ? 10 : 4; x.beginPath(); x.arc(0, 0, r, 0, 6.3); x.stroke(); }); for (let k = 0; k < 24; k++) { x.save(); x.rotate(k / 24 * 6.283); x.translate(0, -215); for (let j = 0; j < 3; j++) { x.lineWidth = 3; x.beginPath(); x.moveTo(-8 + rnd() * 16, -10 + j * 7); x.lineTo(-8 + rnd() * 16, -4 + j * 7); x.stroke(); } x.restore(); } for (let k = 0; k < 8; k++) { x.save(); x.rotate(k / 8 * 6.283); x.lineWidth = 5; x.beginPath(); x.moveTo(0, -120); x.lineTo(0, -200); x.stroke(); x.restore(); } }
    else if (kind === 'seal') { x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 220, 0, 6.3); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 196, 0, 6.3); x.stroke(); const n = 6; for (let t = 0; t < 2; t++) { x.beginPath(); for (let k = 0; k <= 3; k++) { const a = (k / 3) * 6.283 + t * Math.PI / 3 - Math.PI / 2; k ? x.lineTo(Math.cos(a) * 196, Math.sin(a) * 196) : x.moveTo(Math.cos(a) * 196, Math.sin(a) * 196); } x.lineWidth = 5; x.stroke(); } for (let k = 0; k < n; k++) { const a = k / n * 6.283; x.beginPath(); x.arc(Math.cos(a) * 140, Math.sin(a) * 140, 22, 0, 6.3); x.stroke(); } x.beginPath(); x.arc(0, 0, 60, 0, 6.3); x.stroke(); }
    else { x.lineWidth = 8; for (let arm = 0; arm < 3; arm++) { x.beginPath(); for (let i = 0; i < 90; i++) { const a = arm * 2.094 + i * .07, r = 20 + i * 2.2; i ? x.lineTo(Math.cos(a) * r, Math.sin(a) * r) : x.moveTo(Math.cos(a) * r, Math.sin(a) * r); } x.stroke(); } x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 222, 0, 6.3); x.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * 222, Math.sin(a) * 222); x.lineTo(Math.cos(a) * 244, Math.sin(a) * 244); x.stroke(); } }
    const t = new THREE.CanvasTexture(c); texCache.set(k, t); return t; }

  // ── 흔적 묶음(상한 24) — 어두운 무늬 + 속성 빛, 천천히 풍화 ──
  const MAXD = 24, decals = [];
  for (let i = 0; i < MAXD; i++) { const g = new THREE.Group();
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 - i * .05 }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -7 - i * .05 }));
    [dark, glow].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = .16; g.add(m); }); g.visible = false; scene3.add(g); decals.push({ g, dark, glow, on: false, t: 0, life: 0, glowT: 1, born: 0, flick: false }); }
  function decal(p, texture, w, l, yaw, el, darkOp = .9, glowMul = 1) {
    const d = decals.find(x => !x.on) || decals.reduce((a, b) => (a.born < b.born ? a : b)); const E = EL[el];
    d.dark.material.alphaMap = d.glow.material.alphaMap = texture; d.dark.material.needsUpdate = d.glow.material.needsUpdate = true;
    d.dark.material.color.set(E.dark); d.glow.material.color.set(E.glow); d.g.position.set(p.x, 0, p.z); d.g.rotation.y = yaw; d.g.scale.set(w, 1, l); d.g.visible = true;
    Object.assign(d, { on: true, t: 0, life: R(14, 24) * E.life, glowT: E.glowT * glowMul, born: performance.now(), flick: !!E.flicker, darkOp }); return d; }

  // ── 속성 소품: 결정(얼음·빛) · 물웅덩이 ──
  const crystM = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .15, metalness: .1, transparent: true, opacity: .88 }), 80); crystM.count = 0; crystM.frustumCulled = false; scene3.add(crystM);
  const crystals = []; const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), S3 = new THREE.Vector3(), CC = new THREE.Color();
  function crystal(p, n, rad, h, col) { for (let i = 0; i < n; i++) { if (crystals.length >= 80) crystals.shift(); const a = R(0, 6.28), d = rad * Math.sqrt(R(0, 1)); crystals.push({ p: V3(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d), h: h * R(.4, 1.2), w: R(.8, 2), rx: R(-.5, .5), rz: R(-.5, .5), ry: R(0, 6), t: -R(0, .2), life: R(6, 10), c: new THREE.Color(col).multiplyScalar(R(.85, 1.1)) }); } }
  const puddles = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#4a6a78', roughness: .08, metalness: .35, transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.y = .2; m.visible = false; scene3.add(m); return { m, t: 0, life: 0, on: false }; });
  function puddle(p, r) { const u = puddles.find(x => !x.on) || puddles[0]; u.m.position.set(p.x, .2, p.z); u.m.scale.set(r * R(.8, 1.2), r * R(.6, 1), 1); u.m.rotation.z = R(0, 6); u.m.visible = true; Object.assign(u, { on: true, t: 0, life: R(10, 16) }); }

  const puffs = (p, n, cols, up, spread, size, grav) => { for (let i = 0; i < n; i++) { const a = R(0, 6.28), d = R(0, spread); parts.push({ p: V3(p.x + Math.cos(a) * d, R(.5, 3), p.z + Math.sin(a) * d), v: V3(Math.cos(a) * R(10, 50), R(up * .5, up), Math.sin(a) * R(10, 50)), life: R(.8, 1.8), c: pick(cols), g: grav, s: size, n: true }); } };
  function elemExtras(p, s, el) { const E = EL[el];
    puffs(p, 8 + s * 6 | 0, E.puff, 40 + s * 20, 6 + s * 4, 3.5, el === 'dark' ? -6 : -2);
    if (E.ember) puffs(p, 10 + s * 6 | 0, [E.ember, '#ffffff', E.ember], 60 + s * 20, 8 + s * 3, 1.6, -10);
    if (E.spark) for (let i = 0; i < 12 + s * 6; i++) { const a = R(0, 6.28); parts.push({ p: V3(p.x, 1, p.z), v: V3(Math.cos(a) * R(60, 160), R(20, 80), Math.sin(a) * R(60, 160)), life: R(.2, .5), c: E.spark, g: 100, s: 1.2 }); }
    if (E.crystal) crystal(p, 4 + s * 3 | 0, 8 + s * 5, 4 + s * 3, E.crystal);
    if (E.puddle) puddle(p, 8 + s * 5);
    if (E.flow) for (let i = 0; i < 18; i++) { const a = R(0, 6.28); parts.push({ p: V3(p.x + Math.cos(a) * s * 6, R(2, 8), p.z + Math.sin(a) * s * 6), v: V3(-Math.cos(a) * R(10, 30), R(-10, 6), -Math.sin(a) * R(10, 30)), life: R(1, 2), c: pick(E.puff), g: 60, s: 1.8, n: true }); }
    if (E.wisp) for (let i = 0; i < 10 + s * 4; i++) parts.push({ p: V3(p.x + R(-8, 8) * s, .5, p.z + R(-8, 8) * s), v: V3(R(-6, 6), R(14, 34), R(-6, 6)), life: R(1.2, 2.2), c: E.wisp, g: -4, s: 4, n: true });
  }

  // ── 모양 원형 16종: 무늬 + 입체 잔해 ──
  const SH = {
    radial: (p, s, el, ek, yaw) => { decal(p, tex('radial', R(0, 4) | 0), s * 26, s * 26, yaw, el); envCall('radial', p, 8 + s * 7, EL[el].glow); },
    web: (p, s, el, ek, yaw) => decal(p, tex('web', R(0, 4) | 0), s * 30, s * 30, yaw, el),
    star: (p, s, el, ek, yaw) => { decal(p, tex('star', R(0, 4) | 0), s * 28, s * 28, yaw, el); envCall('chunk', p, 4 + s * 2 | 0, .9 + s * .2, ek); },
    zigzag: (p, s, el, ek, yaw) => { decal(p.clone().add(V3(Math.cos(-yaw) * s * 10, 0, Math.sin(-yaw) * s * 10)), tex('zigzag', R(0, 3) | 0), s * 34, s * 10, yaw, el); envCall('slab', p, 3, 5 + s * 2, 3 + s, ek); },
    spiral: (p, s, el, ek, yaw) => { decal(p, tex('spiral', R(0, 3) | 0), s * 26, s * 26, yaw, el, .85, 1.4); envCall('dust', p, 10 + s * 4); },
    steps: (p, s, el, ek, yaw) => { decal(p, tex('steps', R(0, 3) | 0), s * 30, s * 30, yaw, el, .75); for (let r = 0; r < 3; r++) pending.push({ t: r * .07, fn: () => envCall('slab', p, 5 + r * 3, (5 + r * 6) * (.7 + s * .25), (3 - r) * (1.4 + s * .7), ek) }); },
    spikes: (p, s, el, ek, yaw) => { decal(p, tex('spikes', R(0, 3) | 0), s * 26, s * 26, yaw, el); envCall('spike', p, 7 + s * 3 | 0, 9 + s * 6, 8 + s * 4, ek); },
    slab: (p, s, el, ek, yaw) => { decal(p, tex('slab', R(0, 3) | 0), s * 28, s * 28, yaw, el); envCall('slab', p, 6 + s * 3 | 0, 10 + s * 7, 5 + s * 3.5, ek); },
    pit: (p, s, el, ek, yaw) => { envCall('crater', p, 5 + s * 4.5); decal(p, tex('pit', R(0, 3) | 0), s * 22, s * 22, yaw, el); envCall('chunk', p, 5 + s * 3 | 0, 1 + s * .2, ek); },
    dpit: (p, s, el, ek, yaw) => { const o = V3(Math.cos(-yaw) * s * 6, 0, Math.sin(-yaw) * s * 6); envCall('crater', p.clone().sub(o), 4 + s * 3); envCall('crater', p.clone().add(o), 3 + s * 2.5); decal(p, tex('dpit', R(0, 3) | 0), s * 28, s * 24, yaw, el); },
    chain: (p, s, el, ek, yaw, dir) => { const d = dir && dir.lengthSq() > .01 ? dir.clone().normalize() : V3(Math.cos(yaw), 0, -Math.sin(yaw)); for (let i = 0; i < 4 + (s | 0); i++) { const q = p.clone().addScaledVector(d, i * (6 + s * 3)); pending.push({ t: i * .09, fn: () => { envCall('dust', q, 6 + s * 2); envCall('chunk', q, 3, .8, ek); shake = Math.max(shake || 0, 2); } }); } decal(p.clone().addScaledVector(d, (2 + s) * (6 + s * 3) * .5), tex('chain', R(0, 3) | 0), (4 + s) * (6 + s * 3), s * 10, -Math.atan2(d.z, d.x), el); },
    foot: (p, s, el, ek, yaw) => { decal(p, tex('foot', R(0, 3) | 0), s * 20, s * 24, yaw, el, .95); envCall('dust', p, 14 + s * 4); envCall('slab', p, 5, 8 + s * 4, 2 + s, ek); },
    sword: (p, s, el, ek, yaw, dir) => { const d = dir && dir.lengthSq() > .01 ? dir.clone().normalize() : V3(Math.cos(yaw), 0, -Math.sin(yaw)); const a = Math.atan2(d.z, d.x); decal(p.clone().addScaledVector(d, s * 12), tex('sword', R(0, 3) | 0), s * 48, 5 + s * 2.5, -a, el, .95, 1.6); for (let i = 0; i < 4; i++) { const q = p.clone().addScaledVector(d, i * s * 8); pending.push({ t: i * .03, fn: () => envCall('slab', q, 2, 3 + s, 2 + s, ek) }); } },
    drag: (p, s, el, ek, yaw, dir) => { const d = dir && dir.lengthSq() > .01 ? dir.clone().normalize() : V3(Math.cos(yaw), 0, -Math.sin(yaw)); decal(p.clone().addScaledVector(d, s * 10), tex('drag', R(0, 3) | 0), s * 36, s * 12, -Math.atan2(d.z, d.x), el, .8); envCall('dust', p.clone().addScaledVector(d, s * 20), 10 + s * 3); },
    vortex: (p, s, el, ek, yaw) => { decal(p, tex('vortex', R(0, 3) | 0), s * 28, s * 28, yaw, el, .85, 1.5); envCall('crater', p, 3 + s * 2); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; parts.push({ p: V3(p.x + Math.cos(a) * s * 8, 1, p.z + Math.sin(a) * s * 8), v: V3(-Math.sin(a) * 60 - Math.cos(a) * 20, R(10, 40), Math.cos(a) * 60 - Math.sin(a) * 20), life: R(.8, 1.4), c: pick(EL[el].puff), g: -2, s: 3, n: true }); } },
    crystal: (p, s, el, ek, yaw) => { decal(p, tex('crystal', R(0, 3) | 0), s * 26, s * 26, yaw, el); crystal(p, 6 + s * 3 | 0, 8 + s * 5, 6 + s * 4, EL[el].crystal || EL[el].glow); },
  };
  const SHAPES = Object.keys(SH); // 16
  // 원인별로 잘 어울리는 모양(무작위 고르기 가중)
  const BY_CAUSE = {
    hit: ['radial', 'web', 'star', 'pit', 'steps', 'slab', 'spikes', 'spiral', 'crystal', 'dpit'],
    sword: ['sword', 'sword', 'zigzag', 'drag', 'slab', 'radial'],
    projectile: ['pit', 'dpit', 'chain', 'star', 'radial', 'vortex', 'crystal'],
    ult: ['steps', 'vortex', 'spikes', 'slab', 'chain', 'web', 'spiral', 'dpit', 'crystal'],
    stomp: ['foot', 'foot', 'steps', 'pit', 'web', 'slab'],
  };
  let recent = [];
  function pickShape(cause) { const pool = (BY_CAUSE[cause] || BY_CAUSE.hit).filter(k => !recent.includes(k)); const k = pool.length ? pick(pool) : pick(SHAPES); recent.push(k); if (recent.length > 4) recent.shift(); return k; }

  // 지면 문양(원인별): 필살=영역전개 문양, 투사체 큰 착탄=술식 원진, 나루토 계열(차크라)·바람=차크라 문양
  function glyph(p, s, el, cause, ek) { const kind = /chakra|kurama|wind|rasengan/.test(ek || '') ? 'chakra' : cause === 'ult' ? 'domain' : 'seal';
    const d = decal(p, glyphTex(kind, R(0, 3) | 0), s * 46, s * 46, R(0, 6.3), el, .55, 2.4); d.life *= .7; GG.glyphSeen.add(kind + '|' + el); }

  // ── 생성: 세기·속성·원인 → 모양 1~3개 + 속성 소품 + (큰 충격) 지면 문양 ──
  G.gen = function (p, level, ek, dir, cause, src) {
    if (!p || p.y > 30 || Math.hypot(p.x, p.z) > 280) return;
    const g = V3(p.x, 0, p.z), s = Math.max(.6, Math.min(4, level)) * R(.85, 1.15), el = elemOf(ek, level), tier = level >= 3.2 ? 4 : level >= 2.2 ? 3 : level >= 1.3 ? 2 : 1;
    const n = tier >= 4 ? 3 : tier >= 3 ? 2 : 1, yaw = dir && dir.lengthSq() > .01 ? -Math.atan2(dir.z, dir.x) : R(0, 6.3);
    for (let i = 0; i < n; i++) { const k = pickShape(i === 0 ? cause : 'hit'), q = i ? g.clone().add(V3(R(-1, 1) * s * 7, 0, R(-1, 1) * s * 7)) : g;
      try { SH[k](q, s * (i ? .7 : 1), el, ek, yaw + R(-.3, .3), dir); } catch (e) { console.warn('[ground-gen]', k, e); } GG.seen.add(k + '|' + el); }
    elemExtras(g, s, el);
    if (tier >= 3 || cause === 'ult') { glyph(g, s, el, cause, ek); envCall('dust', g, 16 + s * 6); }
    GG.events++; G.events++; G.lastLevel = +level.toFixed(2);
  };
  GG.total = SHAPES.length * Object.keys(EL).length; // 서로 다른 생김새 조합 수(모양×속성), 규모 4단계·문양 별도

  // ── 솟는 바위 가시(env.js) 보정: 검고 큰 원뿔이 남는 문제 — 크기 상한·실사 바위 색/모양·개수 상한·가라앉고 부서지며 사라짐 ──
  const SPK = { maxH: 22, maxW: 3.2, maxN: 40 };
  (function spikeLook() {
    const sm = scene3.children.find(o => o.isInstancedMesh && o.geometry && o.geometry.type === 'ConeGeometry' && o.instanceMatrix && o.instanceMatrix.count === 70); if (!sm) return;
    // 5각 원뿔 → 울퉁불퉁한 바위 첨탑(분할↑, 잡음 변위, 아래는 넓고 위는 깨진 끝), 정점 색(아래 흙·위 밝은 바위)
    const g = new THREE.ConeGeometry(1, 1, 14, 8), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), u = y + .5, a = Math.atan2(z, x);
      const j = 1 + (Math.sin(a * 3 + u * 7) * .12 + Math.sin(a * 7 - u * 13) * .07) * (1 - u * .5), sx = x * j * (1 + (1 - u) * .25), sz = z * j * (1 + (1 - u) * .25);
      p.setXYZ(k, sx, y - (u > .92 ? (Math.sin(a * 5) * .04) : 0), sz);
      const b = .55 + u * .4 + Math.sin(u * 30 + a) * .04; col[k * 3] = b; col[k * 3 + 1] = b * .92; col[k * 3 + 2] = b * .8; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    sm.geometry = g; const m = sm.material.clone(); m.vertexColors = true; m.flatShading = false; m.roughness = .95; sm.material = m;
  })();
  const ROCKC = ['#8a7864', '#7a6a58', '#968470', '#6e604f'];
  function fixSpikes(dt) { const list = window.__env && window.__env.spikes; if (!list) return;
    while (list.length > SPK.maxN) list.shift(); // 개수 상한(가장 오래된 것부터)
    for (const s of list) {
      if (!s._g) { s._g = 1; s.h = Math.min(s.h, SPK.maxH); s.w = Math.min(s.w, SPK.maxW); const L = s.c.r * .3 + s.c.g * .59 + s.c.b * .11; if (L < .35) s.c.set(pick(ROCKC)).multiplyScalar(R(.88, 1.05)); s.h0 = s.h; }
      const left = s.life - s.t; if (left < 1.2 && s.h0) { s.h = Math.max(.05, s.h0 * Math.max(0, left / 1.2)); // 마지막 1.2초 동안 천천히 가라앉음
        if (!s._cr && left < .7) { s._cr = 1; envCall('chunk', s.p, 2 + (s.h0 / 8 | 0), .5, 'earth'); envCall('dust', s.p, 5 + s.w * 2); } } } // 부서지며 흙먼지
  }

  // ── 매 화면: 흔적 풍화·결정·웅덩이 ──
  const _up = update;
  update = function (dt, t) { const r = _up.apply(this, arguments);
    try {
      fixSpikes(dt);
      for (const d of decals) { if (!d.on) continue; d.t += dt; const u = d.t / d.life; d.dark.material.opacity = Math.min(1, d.t * 9) * (u < .6 ? d.darkOp : Math.max(0, d.darkOp * (1 - (u - .6) / .4))); d.glow.material.opacity = Math.max(0, 1 - d.t / d.glowT) * (d.flick ? (Math.random() < .3 ? 1 : .35) : (.75 + Math.random() * .25)); if (u >= 1) { d.on = false; d.g.visible = false; } }
      for (let i = crystals.length - 1; i >= 0; i--) { const c = crystals[i]; c.t += dt; if (c.t > c.life) crystals.splice(i, 1); }
      crystals.forEach((c, i) => { const u = Math.max(0, c.t), k = u < .15 ? u / .15 : u > c.life - 1 ? Math.max(0, c.life - u) : 1; E3.set(c.rx, c.ry, c.rz); Q.setFromEuler(E3); S3.set(c.w, Math.max(.01, c.h * k), c.w); M4.compose(V3(c.p.x, c.h * k * .45, c.p.z), Q, S3); crystM.setMatrixAt(i, M4); crystM.setColorAt(i, c.c); });
      crystM.count = crystals.length; crystM.instanceMatrix.needsUpdate = true; if (crystM.instanceColor) crystM.instanceColor.needsUpdate = true;
      puddles.forEach(u => { if (!u.on) return; u.t += dt; const a = Math.min(1, u.t * 3) * Math.min(1, (u.life - u.t) / 3); u.m.material.opacity = .72 * Math.max(0, a); if (u.t >= u.life) { u.on = false; u.m.visible = false; } });
    } catch (e) { console.warn('[ground-gen]', e); }
    return r; };
})();
