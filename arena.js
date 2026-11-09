// 3자 대난투 — 나루토·원피스·블리치·원펀맨 오마주 (개인 진행판 전용, 외부 공개 금지)
// 발판 없이 강물 위에서 전 방향 이동, 세 명이 동시에 싸운다. 좌표는 three.js 월드 단위 그대로 쓴다.
const RW = 1920, RH = 1140, PI = Math.PI, SPEED = 1.5, GRAV = 420, ARENA = 110, MS = .55, FLASH_MAX = .035;
const ULTRA0 = (() => { try { return localStorage.getItem('arenaUltra') === '1'; } catch (e) { return false; } })(); // 환경 밀도(삼각형) 배율 — 로드 시점에는 getQuality 없음(모카프 뒤)이라 저장값으로 판단
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ═══ 그리기 바탕 ═══
const glCanvas = document.getElementById('gl'), hud = document.getElementById('scene'), hc = hud.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true }); /* 소유자 지적(11-05): 계단 현상 — 다중 샘플링 켬 */
renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
renderer.shadowMap.enabled = false; // 60fps: 실시간 그림자 대신 발밑 원형 그림자
const scene3 = new THREE.Scene();
// 60fps: 숨긴 모형(대기 인물·분신·잔상 등 9천여 개)은 매 화면 위치 계산에서 뺀다
scene3.updateMatrixWorld = function (force) { if (this.matrixAutoUpdate) this.updateMatrix(); if (this.matrixWorldNeedsUpdate || force) { this.matrixWorld.copy(this.matrix); this.matrixWorldNeedsUpdate = false; force = true; } const ch = this.children; for (let i = 0; i < ch.length; i++) if (ch[i].visible) ch[i].updateMatrixWorld(force); };
scene3.background = new THREE.Color('#0b1322');
scene3.fog = new THREE.Fog('#0b1322', 320, 1100);
const camera = new THREE.PerspectiveCamera(48, RW / RH, 1, 2000); camera.layers.enable(1); // 1번 층 = 작은 부품(반사 그리기에서 제외)
camera.position.set(0, 55, 190);
const gm = new THREE.DataTexture(new Uint8Array([70, 70, 70, 150, 150, 150, 255, 255, 255]), 3, 1, THREE.RGBFormat);
gm.minFilter = gm.magFilter = THREE.NearestFilter; gm.needsUpdate = true;
const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
// ═══ 기술 이펙트 재질: 흐르는 에너지(잡음 흐름 + 가장자리 빛 + 뜨거운 흰 심) ═══
const FXT = { value: 0 };
const FX_VS = `varying vec3 vW; varying vec3 vN; varying vec3 vV;
  void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(normalMatrix * normal + 1e-5); vec4 mv = viewMatrix * w; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const FX_FS = `uniform vec3 uC; uniform float uOp; uniform float uT; uniform float uSeed; varying vec3 vW; varying vec3 vN; varying vec3 vV;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec2 q = vW.xy * .16 + vec2(uSeed, -uT * 2.6), r = vW.zy * .21 + vec2(uT * 1.7, uSeed);
    float n = vn(q) * .5 + vn(q * 2.3 + 3.1) * .3 + vn(r * 1.7) * .4;
    float vl = length(vV), nl = length(vN); float rim = nl > .01 && vl > .01 ? pow(1. - abs(dot(vN / nl, vV / vl)), 1.6) : 0.;
    float body = .45 + .75 * n, hot = smoothstep(.55, 1.05, n + rim * .25);
    vec3 col = mix(uC * 1.25, vec3(1.), hot * .85);
    gl_FragColor = vec4(col, clamp(uOp * body * (.8 + rim * .7), 0., 1.));
  }`;
const addMat = (c, op = 1, side = THREE.DoubleSide) => {
  const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(c) }, uOp: { value: op }, uT: FXT, uSeed: { value: Math.random() * 50 } }, vertexShader: FX_VS, fragmentShader: FX_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side });
  Object.defineProperty(m, 'opacity', { get() { return this.uniforms ? this.uniforms.uOp.value : 1; }, set(v) { if (this.uniforms) this.uniforms.uOp.value = v; }, configurable: true });
  Object.defineProperty(m, 'color', { get() { return this.uniforms.uC.value; }, configurable: true });
  return m;
};
// 부드러운 빛 알갱이 그림 (네모 점 → 빛나는 불티·연기)
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,255,255,.85)'); g.addColorStop(.45, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const flareTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,250,230,.9)'); g.addColorStop(.4, 'rgba(255,230,200,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (const [w, h2] of [[128, 5], [5, 128], [70, 3], [3, 70]]) { const l = x.createRadialGradient(64, 64, 0, 64, 64, Math.max(w, h2) / 2); l.addColorStop(0, 'rgba(255,255,255,.95)'); l.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = l; x.save(); x.translate(64, 64); if (w === 70 || h2 === 70) x.rotate(Math.PI / 4); x.fillRect(-w / 2, -h2 / 2, w, h2); x.restore(); }
  return new THREE.CanvasTexture(c); })();
const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 30, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, 'rgba(255,255,255,.15)'); g.addColorStop(.86, 'rgba(255,255,255,1)'); g.addColorStop(.93, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const spriteMat = (tex, c, op = 1) => new THREE.SpriteMaterial({ map: tex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });

const OUT = new THREE.MeshBasicMaterial({ color: '#0a0610', side: THREE.BackSide });
function box(p, w, h, d, x, y, z, mat, cast = false) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; p.add(m); return m; }
scene3.add(new THREE.HemisphereLight('#7a8ab8', '#1a2a24', .95));
const sun = new THREE.DirectionalLight('#b8c8ff', .8); // 달빛
sun.position.set(-160, 260, 200); sun.castShadow = true; sun.shadow.mapSize.set(ULTRA0 ? 2048 : 1024, ULTRA0 ? 2048 : 1024);
Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, near: 1, far: 900 });
scene3.add(sun, sun.target);
const lights = Array.from({ length: 2 }, () => { const l = new THREE.PointLight('#ffffff', 0, 140, 2); scene3.add(l); return l; });

// ═══ 무한열차 앞 · 보름달 밤 (물 고인 논 위, 발판 없음) ═══
let fallTex, smokeP = null, lampSpr = null;
const MOON = V3(170, 250, -560);
(function world() {
  fallTex = new THREE.Texture(); // (옛 폭포 자리 — 되돌리기용 이름만 유지)
  const dc = document.createElement('canvas'); dc.width = dc.height = 256; const dg = dc.getContext('2d'); dg.fillStyle = '#5a4630'; dg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { dg.fillStyle = pick(['#4a3a28', '#6a5438', '#54422e', '#73603f', '#3e3022']); const s2 = R(1, 6); dg.globalAlpha = R(.25, .7); dg.fillRect(R(0, 256), R(0, 256), s2, s2 * R(.5, 1.5)); }
  dg.globalAlpha = 1; for (let i = 0; i < 260; i++) { dg.fillStyle = pick(['#8a7a68', '#9a8a74', '#6e6254']); dg.beginPath(); dg.arc(R(0, 256), R(0, 256), R(.8, 2.2), 0, 7); dg.fill(); }
  const dirtTex = new THREE.CanvasTexture(dc); dirtTex.wrapS = dirtTex.wrapT = THREE.RepeatWrapping; dirtTex.repeat.set(10, 7);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000, ULTRA0 ? 128 : 1, ULTRA0 ? 96 : 1), new THREE.MeshToonMaterial({ color: '#b8a088', map: dirtTex, gradientMap: gm })); bed.rotation.x = -PI / 2; bed.position.y = .05; bed.receiveShadow = true; scene3.add(bed);
  for (let i = 0; i < (ULTRA0 ? 620 : 260); i++) { const x = R(-320, 320), z = R(-150, 180); if (Math.hypot(x, z * 1.3) < 150) continue; const r = new THREE.Mesh(new THREE.ConeGeometry(R(.4, .9), R(2, 6), ULTRA0 ? 13 : 4), toon(pick(['#2a4a2a', '#3a5a30', '#22402a', '#4a5a2a']))); r.position.set(x, 1.4 + R(.5, 2), z); scene3.add(r); } // 가장자리 풀
  for (let i = 0; i < (ULTRA0 ? 240 : 90); i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(R(.6, 2), ULTRA0 ? 2 : 0), toon(pick(['#5a5048', '#6a6054', '#4a4038']))); r.position.set(R(-260, 260), .3, R(-150, 160)); r.scale.y = .5; scene3.add(r); } // 자갈
  // 보름달 + 달무리 + 별
  const moon = new THREE.Mesh(new THREE.SphereGeometry(46, ULTRA0 ? 144 : 32, ULTRA0 ? 96 : 20), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false })); moon.position.copy(MOON); scene3.add(moon);
  [[330, .55, '#fff0c8'], [620, .22, '#c8d8ff']].forEach(([sz, op, c]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sp.position.copy(MOON); sp.scale.set(sz, sz, 1); scene3.add(sp); });
  { const g = new THREE.BufferGeometry(), N = ULTRA0 ? 4200 : 900, p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const a = R(0, PI * 2), el = R(.08, 1.2), d = 900; p.set([Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d * .7 + 60, Math.sin(a) * Math.cos(el) * d - 200], i * 3); } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); scene3.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe8ff', size: ULTRA0 ? 1.4 : 2.2, map: glowTex, transparent: true, depthWrite: false, fog: false }))); }
  // 먼 산·숲 실루엣
  for (let i = 0; i < (ULTRA0 ? 36 : 14); i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(R(90, 180), R(80, 170), ULTRA0 ? 20 : 5), toon(pick(['#101a24', '#141f2a', '#0e1620']))); m.position.set(-790 + i * 45 + R(-30, 30), 30, R(-620, -520)); scene3.add(m); }
  for (let i = 0; i < (ULTRA0 ? 200 : 60); i++) { const tr = new THREE.Group(), h = R(30, 60); box(tr, 2, h * .3, 2, 0, h * .15, 0, toon('#1a140e')); const c = new THREE.Mesh(new THREE.ConeGeometry(h * .22, h * .8, ULTRA0 ? 26 : 6), toon(pick(['#0f2418', '#12291c', '#0c1e14']))); c.position.y = h * .6; tr.add(c); tr.position.set(R(-420, 420), 0, R(-330, -240)); scene3.add(tr); }
  // 철둑·선로
  const TZ = -175; box(scene3, 1200, 10, 46, 0, 5, TZ, toon('#2e2a26'));
  for (let x = -580; x < 580; x += 7) box(scene3, 3, 1.2, 22, x, 10.6, TZ, toon('#3a2a1e'));
  [-7, 7].forEach(z => box(scene3, 1200, 1.4, 1.2, 0, 11.8, TZ + z, toon('#8a8a96')));
  // 무한열차: 검은 증기기관차 + 객차 4량 (창문 불빛)
  const train = new THREE.Group(); train.position.set(60, 12.5, TZ); train.rotation.y = -.12; scene3.add(train);
  const blk = toon('#16161c'), blk2 = toon('#24242c'), red = toon('#8a1a1a'), brass = toon('#c8a050'), car = toon('#2a1c18'), roof = toon('#1a1414');
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 70, ULTRA0 ? 96 : 24), blk); boiler.rotation.z = PI / 2; boiler.position.set(55, 18, 0); boiler.castShadow = true; train.add(boiler);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 2, ULTRA0 ? 96 : 24), blk2); face.rotation.z = PI / 2; face.position.set(91, 18, 0); train.add(face);
  const plate = new THREE.Mesh(new THREE.CircleGeometry(5, ULTRA0 ? 96 : 20), brass); plate.rotation.y = PI / 2; plate.position.set(92.2, 18, 0); train.add(plate);
  box(train, 30, 30, 26, 8, 22, 0, blk); box(train, 34, 3, 30, 8, 38.5, 0, roof); box(train, 10, 9, 1, 8, 26, 13.2, toon('#ffcf80'));
  const chim = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.2, 16, ULTRA0 ? 64 : 14), blk2); chim.position.set(78, 34, 0); train.add(chim);
  const dome2 = new THREE.Mesh(new THREE.SphereGeometry(4.5, ULTRA0 ? 64 : 14, ULTRA0 ? 40 : 10), brass); dome2.position.set(58, 29, 0); train.add(dome2);
  const cow = new THREE.Mesh(new THREE.ConeGeometry(12, 12, ULTRA0 ? 20 : 4), red); cow.rotation.set(0, PI / 4, -PI / 2); cow.position.set(98, 5, 0); cow.scale.set(1, .5, 1); train.add(cow);
  box(train, 120, 4, 24, 40, 5, 0, red);
  for (let i = 0; i < 6; i++) [-1, 1].forEach(z => { const w = new THREE.Mesh(new THREE.CylinderGeometry(i < 2 ? 5 : 7, i < 2 ? 5 : 7, 2.4, ULTRA0 ? 64 : 18), red); w.rotation.x = PI / 2; w.position.set(88 - i * 14, i < 2 ? 4 : 6, z * 12.5); train.add(w); });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(3, ULTRA0 ? 64 : 14, ULTRA0 ? 40 : 10), new THREE.MeshBasicMaterial({ color: '#fff4c0' })); lamp.position.set(93, 28, 0); train.add(lamp);
  lampSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ffe8a0', transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false })); lampSpr.position.set(95, 28, 0); lampSpr.scale.set(60, 60, 1); train.add(lampSpr);
  for (let c = 0; c < 4; c++) { const cx = -40 - c * 92; box(train, 86, 26, 24, cx, 19, 0, car); const rf = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 86, ULTRA0 ? 80 : 16, 1, false, 0, PI), roof); rf.rotation.z = PI / 2; rf.rotation.x = -PI / 2; rf.position.set(cx, 31, 0); train.add(rf);
    for (let w = 0; w < 7; w++) [-1, 1].forEach(z => { const win = new THREE.Mesh(new THREE.PlaneGeometry(7, 8), new THREE.MeshBasicMaterial({ color: pick(['#ffcf80', '#ffd890', '#f0b860']) })); win.position.set(cx - 36 + w * 12, 22, z * 12.2); if (z < 0) win.rotation.y = PI; train.add(win); });
    for (let w = 0; w < 2; w++) [-1, 1].forEach(z => { const wh = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2, ULTRA0 ? 36 : 14), blk2); wh.rotation.x = PI / 2; wh.position.set(cx - 28 + w * 56, 4, z * 11); train.add(wh); }); }
  train.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  smokeP = new THREE.Vector3(); chim.getWorldPosition(smokeP); smokeP.y += 8;
  // 선로 옆 전봇대
  for (let i = 0; i < 8; i++) { const x = -420 + i * 120; box(scene3, 2.4, 70, 2.4, x, 35, TZ + 34, toon('#2a2018')); box(scene3, 18, 1.6, 1.6, x, 64, TZ + 34, toon('#2a2018')); }
})();

(function mergeStatic() {
  scene3.updateMatrixWorld(true);
  const groups = new Map(), victims = [];
  scene3.traverse(o => { if (!o.isMesh) return; const m = o.material, key = [m.type, m.color ? m.color.getHexString() : '', m.map ? m.map.uuid : '', m.side, m.fog, m.transparent, m.opacity].join('|');
    if (!groups.has(key)) groups.set(key, { mat: m, geos: [] }); const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); groups.get(key).geos.push(g); victims.push(o); });
  victims.forEach(o => o.parent.remove(o));
  groups.forEach(({ mat, geos }) => {
    const names = ['position', 'normal', 'uv'].filter(nm => geos.every(g => g.attributes[nm])), out = new THREE.BufferGeometry();
    names.forEach(nm => { const sz = geos[0].attributes[nm].itemSize, arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[nm].count * sz, 0)); let off = 0; geos.forEach(g => { arr.set(g.attributes[nm].array, off); off += g.attributes[nm].count * sz; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); });
    out.computeBoundingSphere(); const mesh = new THREE.Mesh(out, mat); mesh.matrixAutoUpdate = false; scene3.add(mesh); geos.forEach(g => g.dispose());
  });
})();
const blobMat = new THREE.MeshBasicMaterial({ map: glowTex, color: '#000000', transparent: true, opacity: .55, depthWrite: false, blending: THREE.NormalBlending });
const blobs = Array.from({ length: 8 }, () => { const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat); b.rotation.x = -PI / 2; b.visible = false; scene3.add(b); return b; });
function envUpdate(dt, t) { // 기차 연기·전조등 일렁임
  if (smokeP && frame % 2 === 0) parts.push({ p: smokeP.clone().add(V3(R(-2, 2), 0, R(-2, 2))), v: V3(R(-14, -4), R(26, 44), R(-6, 6)), life: R(2.4, 3.4), c: pick(['#3a3a44', '#4a4a54', '#2c2c34']), g: -6, s: 3, n: true });
  if (lampSpr) lampSpr.material.opacity = .75 + Math.sin(t * 7) * .05 + Math.random() * .05;
}
// ═══ 발목 높이 물: 실시간 반사(거울 카메라) + 물결·파문 + 기술에 갈라지는 물(모세) ═══
const WATER_H = 1.4;
const ripples = [], partings = [];
const waterU = {
  uTime: { value: 0 }, tRefl: { value: null }, uTexM: { value: new THREE.Matrix4() }, uCam: { value: V3() }, uSun: { value: V3(170, 250, -560).normalize() },
  uRip: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
  uPart: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) }, uPartP: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
  uFog: { value: new THREE.Color('#0b1322') },
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterU, transparent: true, depthWrite: false, extensions: { derivatives: true },
  vertexShader: `
    uniform float uTime; uniform vec4 uRip[16]; uniform vec4 uPart[4]; uniform vec4 uPartP[4]; uniform mat4 uTexM;
    varying vec3 vW; varying float vFoam; varying vec4 vR;
    float segD(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), .001), 0., 1.); return length(pa - ba * h); }
    void main() {
      vec3 p = position; vec2 xz = (modelMatrix * vec4(p, 1.)).xz;
      float h = sin(xz.x * .08 + uTime * 1.3) * .12 + sin(xz.y * .11 - uTime * 1.7) * .1 + sin((xz.x + xz.y) * .05 + uTime * .9) * .14, foam = 0.;
      for (int i = 0; i < 16; i++) { vec4 r = uRip[i]; if (r.w <= 0.) continue; float d = length(xz - r.xy), front = r.z * 34. + 3.;
        float env = exp(-r.z * 1.4) * smoothstep(front + 4., front - 6., d) * exp(-d * .02); h += r.w * sin(d * .5 - r.z * 11.) * env; foam += r.w * env * .12 * smoothstep(front - 6., front, d); }
      for (int i = 0; i < 4; i++) { float amt = uPartP[i].y; if (amt <= 0.) continue; float w = uPartP[i].x, d = segD(xz, uPart[i].xy, uPart[i].zw);
        float dig = 1. - smoothstep(w * .55, w, d), wall = smoothstep(w * .55, w, d) * (1. - smoothstep(w, w * 1.8, d));
        h += amt * (-2.6 * dig + 7.5 * wall * (1. + .15 * sin(uTime * 9. + d))); foam += amt * (wall * 1.6 + dig * .2); }
      p.y += h; vFoam = foam;
      vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vR = uTexM * wp;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform sampler2D tRefl; uniform vec3 uCam; uniform vec3 uSun; uniform float uTime; uniform vec3 uFog;
    varying vec3 vW; varying float vFoam; varying vec4 vR;
    void main() {
      vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (n.y < 0.) n = -n;
      vec3 V = normalize(uCam - vW);
      float fres = .2 + .8 * pow(1. - max(dot(n, V), 0.), 3.);
      vec4 rc = vR; rc.xy += n.xz * .06 * rc.w;
      vec3 refl = texture2DProj(tRefl, rc).rgb;
      vec3 base = vec3(.10, .24, .30);
      vec3 H = normalize(uSun + V); float spec = pow(max(dot(n, H), 0.), 140.) * 1.4;
      float caus = pow(max(sin(vW.x * .6 + uTime * 2.) * sin(vW.z * .5 - uTime * 1.6), 0.), 6.) * .25;
      vec3 col = mix(base, refl, fres * .9) + spec + caus * vec3(.6, .8, .9) + clamp(vFoam * .55, 0., .8) * vec3(.85, .92, 1.);
      float dist = length(uCam - vW); col = mix(col, uFog, clamp((dist - 340.) / 380., 0., 1.));
      gl_FragColor = vec4(col, clamp(.62 + fres * .25 + vFoam * .3, 0., 1.));
    }`,
});
const waterGeo = new THREE.PlaneGeometry(900, 700, 200, 160); waterGeo.rotateX(-PI / 2);
const waterMesh = new THREE.Mesh(waterGeo, waterMat); waterMesh.position.set(0, WATER_H, -60); waterMesh.renderOrder = -10; waterMesh.visible = false; /* 무한열차 앞은 흙바닥 */ scene3.add(waterMesh); // 물을 효과보다 먼저 그리고 깊이를 남기지 않아, 효과가 항상 물 위에 또렷하게 보이게
const reflRT = new THREE.WebGLRenderTarget(800, 475);
const mirrorCam = new THREE.PerspectiveCamera();
const clipPlane = new THREE.Plane(V3(0, 1, 0), -WATER_H + .3);
function ripple(x, z, amp = .6) { ripples.push({ x, z, age: 0, amp }); if (ripples.length > 40) ripples.shift(); if (amp >= .3 && Math.random() < .6) for (let i = 0; i < 2 + amp * 4; i++) parts.push({ p: V3(x + R(-3, 3), WATER_H + R(0, 2), z + R(-3, 3)), v: V3(R(-20, 20) * amp, R(8, 30) * amp, R(-20, 20) * amp), life: R(.8, 1.4), c: pick(['#7a6248', '#8a7258', '#6a5440']), g: -4, s: 3, n: true }); } // 흙먼지
const cracks = [];
function moses(a, b, w = 22, dur = 2.6) { partings.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, w, t: 0, dur }); if (partings.length > 4) partings.shift();
  const dx = b.x - a.x, dz = b.z - a.z, L = Math.max(8, Math.hypot(dx, dz)), g = new THREE.Group(); g.position.set(a.x, .14, a.z); g.rotation.y = -Math.atan2(dz, dx);
  for (let i = 0; i < 9; i++) { const seg = new THREE.Mesh(new THREE.PlaneGeometry(L / 8 + 2, R(.8, 2.2) * w / 12), new THREE.MeshBasicMaterial({ color: '#140c06', transparent: true, opacity: .85, depthWrite: false })); seg.rotation.x = -PI / 2; seg.position.set(L * i / 8, 0, R(-1.5, 1.5)); seg.rotation.z = R(-.25, .25); g.add(seg); }
  scene3.add(g); cracks.push({ g, t: 0, dur: dur + 1.5 }); if (cracks.length > 6) { const o = cracks.shift(); kill(o.g); } }
function scorch(p, r) { const g = new THREE.Group(); g.position.set(p.x, .16, p.z); const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: glowTex, color: '#000000', transparent: true, opacity: .7, depthWrite: false })); m.rotation.x = -PI / 2; g.add(m); scene3.add(g); cracks.push({ g, t: 0, dur: 4 }); if (cracks.length > 10) { const o = cracks.shift(); kill(o.g); } }
function crackUpdate(dt) { for (let i = cracks.length - 1; i >= 0; i--) { const c = cracks[i]; c.t += dt; const a = Math.min(1, c.t * 6) * Math.min(1, (c.dur - c.t) / 1.2); c.g.children.forEach(m => m.material.opacity = .85 * Math.max(0, a)); if (c.t > c.dur) { kill(c.g); cracks.splice(i, 1); } } }
function waterUpdate(dt, t) {
  waterU.uTime.value = t; FXT.value = t; envUpdate(dt, t); crackUpdate(dt);
  ripples.forEach(r => r.age += dt); for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].age > 3) ripples.splice(i, 1);
  const rs = ripples.slice(-16); waterU.uRip.value.forEach((v, i) => { const r = rs[i]; if (r) v.set(r.x, r.z, r.age, r.amp); else v.set(0, 0, 0, 0); });
  partings.forEach(p => p.t += dt); for (let i = partings.length - 1; i >= 0; i--) if (partings[i].t > partings[i].dur) partings.splice(i, 1);
  waterU.uPart.value.forEach((v, i) => { const p = partings[i]; const pp = waterU.uPartP.value[i];
    if (!p) { pp.set(0, 0, 0, 0); return; }
    const amt = Math.min(1, p.t / .25) * Math.min(1, (p.dur - p.t) / .9); v.set(p.ax, p.az, p.bx, p.bz); pp.set(p.w, amt, 0, 0);
    if (Math.random() < .9) { const u = Math.random(), x = p.ax + (p.bx - p.ax) * u, z = p.az + (p.bz - p.az) * u, dx = p.bx - p.ax, dz = p.bz - p.az, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, sd = pick([-1, 1]);
      for (let k = 0; k < 4; k++) parts.push({ p: V3(x + nx * p.w * sd + R(-2, 2), WATER_H + R(4, 9) * amt, z + nz * p.w * sd + R(-2, 2)), v: V3(nx * sd * R(10, 40), R(30, 90) * amt, nz * sd * R(10, 40)), life: 1, c: pick(['#8a6a4a', '#6a5038', '#a08060']), g: 220, s: 2 }); }
  });
  // 거울 카메라로 반사 그리기 (두 프레임에 한 번)
  if (!waterMesh.visible) return; /* 흙바닥: 반사 그리기 안 함 */
  const cp = camera.getWorldPosition(V3()); if (cp.y <= WATER_H + .2) return;
  waterU.uCam.value.copy(cp); if ((waterUpdate.n = (waterUpdate.n || 0) + 1) % 2 && waterU.tRefl.value) return;
  waterU.uCam.value.copy(cp);
  const rot = new THREE.Matrix4().extractRotation(camera.matrixWorld), look = V3(0, 0, -1).applyMatrix4(rot).add(cp);
  mirrorCam.position.set(cp.x, 2 * WATER_H - cp.y, cp.z); mirrorCam.up.set(0, 1, 0).applyMatrix4(rot); mirrorCam.up.y *= -1;
  mirrorCam.lookAt(look.x, 2 * WATER_H - look.y, look.z); mirrorCam.fov = camera.fov; mirrorCam.aspect = camera.aspect; mirrorCam.near = camera.near; mirrorCam.far = camera.far; mirrorCam.updateProjectionMatrix(); mirrorCam.updateMatrixWorld();
  waterU.uTexM.value.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
  waterMesh.visible = false; const sa = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.clippingPlanes = [clipPlane]; renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene3, mirrorCam);
  renderer.setRenderTarget(null); renderer.clippingPlanes = []; waterMesh.visible = true; renderer.shadowMap.autoUpdate = sa;
  waterU.tRefl.value = reflRT.texture;
}
const rainN = 500, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(rainN * 6);
for (let i = 0; i < rainN; i++) { const x = R(-260, 260), y = R(0, 280), z = R(-260, 200); rainPos.set([x, y, z, x - 1, y - 7, z], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#5a6a80', transparent: true, opacity: .4 })); rain.frustumCulled = false; scene3.add(rain); rain.visible = false; // 맑은 보름달 밤

// ═══ 속성 ═══
const ELEM = {
  fire: { c: '#ff8a20', parts: ['#fff2a0', '#ffd040', '#ff8a20', '#ff4020'], g: -30, style: 'flame' },
  wind: { c: '#9fe0ff', parts: ['#ffffff', '#d8f4ff', '#9fe0ff', '#5ab8ff'], g: -5, style: 'gust' },
  bolt: { c: '#cfe8ff', parts: ['#ffffff', '#e0f0ff', '#9fd0ff', '#6a9aff'], g: 0, style: 'spark' },
  dark: { c: '#9a4aff', parts: ['#c080ff', '#9a4aff', '#ff3a7a', '#5a10a0'], g: -10, style: 'shadow' },
  kurama: { c: '#ff7a1a', parts: ['#ffe080', '#ffb040', '#ff7a1a', '#ff3a10'], g: -20, style: 'flame' },
  metal: { c: '#d0d8e8', parts: ['#ffffff', '#e8eef8', '#b0b8c8', '#ffd040'], g: 120, style: 'metal' },
  water: { c: '#6ac0ff', parts: ['#ffffff', '#b0e4ff', '#6ac0ff', '#3a80d0'], g: 160, style: 'splash' },
  earth: { c: '#c89a5a', parts: ['#e0c090', '#a07040', '#705030', '#ffd8a0'], g: 160, style: 'rock' },
  ice: { c: '#d8f6ff', parts: ['#ffffff', '#e8faff', '#a8e0ff', '#7ac0f0'], g: 20, style: 'frost' },
  petal: { c: '#ffb0d0', parts: ['#ffffff', '#ffd0e4', '#ffb0d0', '#ff80b0'], g: -4, style: 'gust' },
  slash: { c: '#d0ffd8', parts: ['#ffffff', '#e0ffe8', '#a0f0b0', '#60c070'], g: 0, style: 'metal' },
  getsuga: { c: '#9fd8ff', parts: ['#ffffff', '#cfeaff', '#6ab8ff', '#2a6ad0'], g: 0, style: 'spark' },
  hollow: { c: '#ff3a3a', parts: ['#ffffff', '#ff8080', '#ff3a3a', '#300008'], g: -6, style: 'shadow' },
  sand: { c: '#e0c080', parts: ['#fff0c8', '#e0c080', '#b89050', '#806030'], g: 120, style: 'rock' },
  light: { c: '#fff080', parts: ['#ffffff', '#fffbd0', '#fff080', '#ffd040'], g: 0, style: 'spark' },
  psychic: { c: '#60ff9a', parts: ['#ffffff', '#c0ffd8', '#60ff9a', '#20c070'], g: -4, style: 'gust' },
  room: { c: '#7ab0ff', parts: ['#ffffff', '#cfe0ff', '#7ab0ff', '#4a70d0'], g: 0, style: 'gust' },
  mist: { c: '#dde8f0', parts: ['#ffffff', '#eef4f8', '#dde8f0', '#b8c8d8'], g: -2, style: 'gust' },
  blood: { c: '#ff4a7a', parts: ['#ffd0e0', '#ff8aa8', '#ff4a7a', '#c01a4a'], g: -20, style: 'flame' },
  sun: { c: '#ff6a20', parts: ['#fff2a0', '#ffb040', '#ff6a20', '#e02a10'], g: -30, style: 'flame' },
  insect: { c: '#c890ff', parts: ['#ffffff', '#ead8ff', '#c890ff', '#8a5ad0'], g: -4, style: 'gust' },
  sound: { c: '#ffd040', parts: ['#ffffff', '#fff0a0', '#ffd040', '#ff9a20'], g: 0, style: 'spark' },
  steam: { c: '#ffb0b0', parts: ['#ffffff', '#ffd0d0', '#ff9090', '#ff6060'], g: -20, style: 'flame' },
  power: { c: '#ffffff', parts: ['#ffffff', '#fff6d0', '#ffe080', '#d0d8ff'], g: 0, style: 'gust' },
};

// ═══ 효과 ═══
let parts = [], labels = [], fx = [], projs = [], drops = [], emitters = [];
  const FXM = () => (window.AAA && AAA.ultra ? 3.8 : 1.3) * (window.AAA && Number.isFinite(AAA.perf) ? Math.max(.4, AAA.perf) : 1) * (parts.length > 520 ? .38 : parts.length > 300 ? .55 : parts.length > 160 ? .8 : 1); // 전투 이펙트 개수 배율 — 저FPS/perf 거버너 + 파티클이 조금만 쌓여도(스킬·충돌) 방출을 일찍 얇게(11-09: 충돌 프레임 GC 스파이크 완화로 문턱 하향)
let shake = 0, whiteout = 0, flashC = '255,255,255', clashes = 0, frame = 0, tempo = 1, counterBy = null;
const hexRgb = c => { const n = parseInt(c.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; };
function flashScreen(a, rgb = '255,255,255') { a = Math.min(a, FLASH_MAX); if (a > whiteout) { whiteout = a; flashC = rgb; } }
function burst(p, n, colors, spd, g = 80, s = 1, normal = false) {
  for (let i = 0; i < n * 3.5 * FXM(); i++) { const d = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar((0.4 + Math.random()) * spd * 40); parts.push({ p: p.clone(), v: d, life: 1, c: colors[i % colors.length], g, s, n: normal }); }
}
function light(p, c, power) { const l = lights.reduce((a, b) => a.intensity < b.intensity ? a : b); l.position.copy(p).add(V3(0, 4, 6)); l.color.set(c); l.intensity = Math.max(l.intensity, power); }
function label(p, text, color, opts = {}) { if (text) labels.push({ p: p.clone(), rise: opts.rise || 0, text, color, life: opts.life || 1, skill: opts.skill, big: opts.big, stroke: opts.stroke, keep: opts.keep }); }
const add = (o) => { fx.push(o); const cap = (window.AAA && AAA.ultra) ? 420 : ftAvg > 17 ? 45 : 70; if (fx.length > cap) for (let i = 0, n2 = fx.length - cap; i < fx.length && n2 > 0; i++) if (fx[i].life > .05) { fx[i].life = .05; n2--; } return o; }; // 60fps: 동시 이펙트 상한(버거우면 오래된 것부터 빨리 사라짐)
const ring = (p, r, c, flat, life = 1, grow = 1.4) => add({ k: 'ring', p: p.clone(), r, c, flat, life, grow });
const dome = (p, max, c, c2 = '#ffffff') => add({ k: 'dome', p: p.clone(), r: 1, max, c, c2, life: 1 });
const pillar = (p, w, c, life = 1) => add({ k: 'pillar', p: p.clone(), w, c, life });
const bolt = (p0, p1, c, life = 1, w = 1) => add({ k: 'bolt', p0: p0.clone(), p1: p1.clone(), c, life, w });
const streak = (p, dir, len, c, w = 1.1) => add({ k: 'streak', p: p.clone(), dir: dir.clone().normalize(), len, c, w, life: 1 });
const mark = (p, a, len, c, w = .6, life = 1.2) => add({ k: 'mark', p: p.clone(), a, len, c, w, life });
const impact = (p, r) => add({ k: 'impact', p: p.clone(), r: r * 1.5, life: 7 });
const shield = (f, c) => add({ k: 'shield', f, c, life: 1 });
const arc = (f, a0, a1, r, c, w = 4, life = 1) => add({ k: 'arc', f, a0, a1, r: r * 1.35, c, w: w * 1.6, life });
const vortex = (p, ek, life, pw = 1) => emitters.push({ k: 'vortex', p: p.clone(), ek, life, pw });
const flames = (p, life, fire) => emitters.push({ k: 'flames', p: p.clone(), life, fire });
function explode(p, ek, pw = 1) {
  pw *= 1.45; const E = ELEM[ek] || ELEM.wind, n = Math.round(22 * pw * FXM());
  for (let i = 0; i < 3 + 2 * pw * FXM(); i++) parts.push({ p: p.clone().add(V3(R(-4, 4), R(-2, 4), R(-4, 4)).multiplyScalar(pw * .6)), v: V3(R(-8, 8), R(12, 30), R(-8, 8)), life: R(1.6, 2.4), c: pick(['#2a2630', '#3a3440', '#4a4450', E.parts[2]]), g: -4, s: 3, n: true });
  if (pw > 2) scorch(p, 6 * pw);
  for (let i = 0; i < 14 * pw * FXM(); i++) { const d = V3(R(-1, 1), R(-.3, 1), R(-1, 1)).normalize(); parts.push({ p: p.clone(), v: d.multiplyScalar(R(120, 260) * Math.sqrt(pw)), life: R(.4, .8), c: pick(['#ffffff', E.parts[0], E.parts[1]]), g: 120, s: 1 }); }
  for (let i = 0; i < 3 + 2 * pw; i++) parts.push({ p: p.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3)).multiplyScalar(pw)), v: V3(R(-30, 30), R(-10, 50), R(-30, 30)).multiplyScalar(pw * .6), life: R(.5, .9), c: pick(E.parts), g: 0, s: 3 });
  switch (ek) { // 속성마다 다른 모양
    case 'fire': case 'kurama': case 'sun': case 'blood': for (let i = 0; i < (pw > 1.5 ? 3 : 2); i++) pillar(V3(p.x + R(-8, 8), WATER_H, p.z + R(-8, 8)), R(1.6, 3), E.c, .45); break; // 불기둥: 큰 폭발에만 2~3개(주인 지적: 캐릭터 위로 기둥 난무 금지)
    case 'wind': case 'dark': case 'hollow': case 'petal': case 'psychic': case 'room': case 'mist': case 'insect': add({ k: 'spiral', p: p.clone(), c: E.c, life: 1.1 }); break;
    case 'bolt': case 'getsuga': case 'light': for (let i = 0; i < 4; i++) bolt(p.clone().add(V3(R(-8, 8), 45, R(-8, 8))), p, E.c, .7, 2); break;
    case 'water': for (let i = 0; i < 26; i++) { const a2 = i / 26 * PI * 2; parts.push({ p: V3(p.x, WATER_H + .5, p.z), v: V3(Math.cos(a2) * 55, R(120, 220), Math.sin(a2) * 55), life: 1.3, c: pick(E.parts), g: 300, s: 2 }); } break;
    case 'earth': case 'sand': ring(V3(p.x, WATER_H + .2, p.z), 4, '#c89a5a', true, 1.2, 2.6); break;
    case 'ice': for (let i = 0; i < 7; i++) add({ k: 'spike', p: V3(p.x + R(-9, 9), WATER_H, p.z + R(-9, 9)), h: R(7, 15), c: '#d8f6ff', life: 1.6 }); break;
    case 'slash': mark(p, PI / 4, 26, '#ffffff', 1.6); mark(p, -PI / 4, 26, '#a0f0b0', 1.6); break;
    case 'power': case 'sound': for (let i = 0; i < 3; i++) pending.push({ t: i * .07, fn: () => ring(p, 3, '#ffffff', false, 1, 2.4) }); break;
    case 'steam': for (let i = 0; i < 22; i++) parts.push({ p: p.clone(), v: V3(R(-35, 35), R(30, 90), R(-35, 35)), life: 1.6, c: '#ffd0d0', g: -10, s: 2 }); break;
  }
  burst(p, n, E.parts, 2 * Math.sqrt(pw), E.g, 2); burst(p, Math.round(n * .5), E.parts, 1.1, E.g, 1);
  ring(p, 3, E.c, false); ring(p, 1, '#ffffff', false); impact(p, 6 * Math.min(1.8, pw)); light(p, E.c, 5 * pw);
  switch (E.style) {
    case 'spark': for (let i = 0; i < 6; i++) { const d = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(18 * pw); bolt(p, p.clone().add(d), E.c, .8); } break;
    case 'flame': for (let i = 0; i < 16; i++) parts.push({ p: p.clone().add(V3(R(-6, 6), R(-4, 4), R(-6, 6))), v: V3(R(-6, 6), R(20, 60), R(-6, 6)), life: 1.2, c: pick(E.parts), g: -10, s: 2 }); break;
    case 'gust': ring(p, 4, E.c, true); for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2; parts.push({ p: p.clone(), v: V3(Math.cos(a) * 90, R(-10, 20), Math.sin(a) * 90), life: .8, c: pick(E.parts), g: 0, s: 1 }); } break;
    case 'shadow': for (let i = 0; i < 20; i++) { const d = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(14, 22)); parts.push({ p: p.clone().add(d), v: d.clone().multiplyScalar(-2.4), life: .5, c: pick(E.parts), g: 0, s: 2 }); } break;
    case 'splash': case 'rock': for (let i = 0; i < 20; i++) parts.push({ p: p.clone(), v: V3(R(-60, 60), R(40, 120), R(-60, 60)), life: 1.2, c: pick(E.parts), g: 260, s: 2 }); break;
    case 'frost': for (let i = 0; i < 8; i++) mark(p.clone().add(V3(R(-10, 10), R(-10, 10), R(-10, 10))), R(0, PI), R(4, 8), '#e8faff', .5, 1.5); break;
    case 'metal': for (let i = 0; i < 20; i++) parts.push({ p: p.clone(), v: V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(R(80, 150)), life: .6, c: pick(E.parts), g: 200, s: 1 }); break;
  }
  flashScreen(.3, hexRgb(E.c)); shake = Math.max(shake, 3 + 2 * pw);
}

// ═══ 자세 (각도 0 = 아래, + = 앞) ═══
const P0 = { arm: .35, fore: 2.65, barm: .85, bfore: 2.35, leg: .42, kick: 0, lean: 2, bob: 2.5, twist: -.32, spread: .1, armX: .18 };
const mkP = o => ({ ...P0, ...o });
const SPR_KEYS = ['arm', 'fore', 'barm', 'bfore', 'lean', 'bob', 'twist', 'spread', 'armX'];
const POSE = {
  guard: mkP({}), stance: mkP({ arm: .7, fore: 2.0, barm: .5, bfore: 1.6, leg: .65, lean: 2, bob: 4 }),
  seal: mkP({ arm: .9, fore: 2.6, barm: 1.1, bfore: 2.75, leg: .4, lean: 0, bob: 1 }),
  punchPrep: mkP({ arm: .2, fore: 1.2, barm: .9, bfore: 2.2, leg: .6, lean: -1, bob: 3 }),
  punch: mkP({ arm: 1.57, fore: 1.57, barm: -.5, bfore: 1.2, leg: .8, lean: 4, bob: 2 }),
  palm: mkP({ arm: 1.5, fore: 1.45, barm: -.9, bfore: -.4, leg: .9, lean: 5, bob: 3 }),
  hold: mkP({ arm: 1.1, fore: 1.2, barm: -1.1, bfore: -1.2, leg: .6, lean: 4, bob: 3 }),
  run: mkP({ arm: .1, fore: 1.6, barm: .1, bfore: 1.6, leg: .6, lean: 5, bob: 2 }),
  chidori: mkP({ arm: -.8, fore: -.9, barm: 1.0, bfore: 1.8, leg: .7, lean: 5, bob: 5 }),
  kickPrep: mkP({ arm: .6, fore: 2.2, barm: .4, bfore: 1.8, leg: .5, kick: .9, lean: -1, bob: 2 }),
  kick: mkP({ arm: .3, fore: 2.2, barm: -.8, bfore: .4, leg: .3, kick: 1.65, lean: -3, bob: 0 }),
  highKick: mkP({ arm: .2, fore: 1.6, barm: -1.0, bfore: .2, leg: .2, kick: 2.5, lean: -4, bob: 0 }),
  axe: mkP({ arm: 2.4, fore: 2.8, barm: -2.2, bfore: -2.4, leg: .3, kick: .3, lean: 2, bob: 0 }),
  slashPrep: mkP({ arm: 2.7, fore: 2.9, barm: .9, bfore: 1.4, leg: .5, lean: -2, bob: 2 }),
  slash: mkP({ arm: 1.0, fore: .9, barm: -.6, bfore: .5, leg: .8, lean: 4, bob: 3 }),
  block: mkP({ arm: 1.3, fore: 2.8, barm: 1.2, bfore: 2.9, leg: .5, lean: -1, bob: 3 }),
  duck: mkP({ arm: .9, fore: 2.4, barm: .4, bfore: 2.0, leg: .9, lean: 3, bob: 7 }),
  land: mkP({ arm: .6, fore: 1.6, barm: .7, bfore: 1.4, leg: .9, lean: 3, bob: 6 }),
  air: mkP({ arm: 2.6, fore: 2.8, barm: -2.2, bfore: -2.5, leg: .6, lean: 0, bob: 0 }),
  hurt: mkP({ arm: -.5, fore: -.8, barm: 1.2, bfore: 1.0, leg: .3, lean: -5, bob: 2 }),
  cast: mkP({ arm: 1.2, fore: 2.7, barm: 1.0, bfore: 2.8, leg: .6, lean: 1, bob: 2 }),
  point: mkP({ arm: 2.95, fore: 3.05, barm: .3, bfore: 1.6, leg: .4, lean: -1, bob: 0 }),
  stare: mkP({ arm: .3, fore: 2.0, barm: .2, bfore: 1.8, leg: .4, lean: 0, bob: 1 }),
  stretch: mkP({ arm: 1.57, fore: 1.57, barm: -.4, bfore: 1.0, leg: .9, lean: 5, bob: 3 }),
};
// 몸통 비틀기·다리 벌림·팔 벌림 (자연스러운 대기·타격 자세)
const TW = { stance: [-.35, .16, .2], seal: [0, .08, .05], punchPrep: [-.45, .12, .15], punch: [.55, .12, .1], palm: [.5, .14, .1], hold: [-.3, .12, .25], run: [0, .04, .12], chidori: [-.4, .16, .3], kickPrep: [-.2, .05, .3], kick: [-.15, 0, .45], highKick: [-.2, 0, .5], axe: [.1, .05, .35], slashPrep: [-.55, .14, .2], slash: [.6, .14, .12], block: [-.2, .14, .25], duck: [-.2, .2, .3], land: [0, .2, .35], air: [0, .25, .6], hurt: [.45, .1, .55], cast: [-.1, .1, .2], point: [-.25, .1, .15], stare: [-.15, .1, .2], stretch: [.6, .12, .1] };
Object.entries(TW).forEach(([k, [tw, sp, ax]]) => Object.assign(POSE[k], { twist: tw, spread: sp, armX: ax }));

// ═══ 사람 모형 (8등신) ═══
const UPV = V3(0, 1, 0);
// 끝으로 갈수록 가늘어지는 휜 관(머리카락 가닥)
function taperTube(curve, r, tub = 6, rad = 4) {
  const frames = curve.computeFrenetFrames(tub, false), pos = [], idx = [];
  for (let i = 0; i <= tub; i++) {
    const u = i / tub, P = curve.getPointAt(u), N = frames.normals[i], B = frames.binormals[i], rr = r * Math.pow(1 - u, .9) + .015;
    for (let j = 0; j <= rad; j++) { const v = j / rad * PI * 2, c = Math.cos(v), s = Math.sin(v); pos.push(P.x + rr * (c * N.x + s * B.x), P.y + rr * (c * N.y + s * B.y), P.z + rr * (c * N.z + s * B.z)); }
  }
  for (let i = 0; i < tub; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}function buildHuman(P, style, ghostMat) {
  const mats = [], hairLocks = []; let hatRef = null, skirtRef = null;
  const M = k => { if (ghostMat) return ghostMat; const m = toon(P[k] || '#888888'); mats.push(m); return m; };
  const BM = c => ghostMat || new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  const ol = !ghostMat, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const part = (p, geo, mat, x = 0, y = 0, z = 0, o = ol, os = 1.07) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); geo.computeBoundingSphere(); const rad = geo.boundingSphere.radius; m.castShadow = !ghostMat && rad > 1.4; p.add(m); const small = rad < 1.1; if (small) m.layers.set(1); if (o) { const e = new THREE.Mesh(geo, OUT); e.scale.setScalar(os); if (small) e.layers.set(1); m.add(e); } return m; };
  const sph = (r, ws = 32, hs = 24) => new THREE.SphereGeometry(r, Math.max(7, Math.round(ws * .36)), Math.max(5, Math.round(hs * .36)));
  const cyl = (r1, r2, h, s = 24, open = false, t0 = 0, tl = PI * 2) => new THREE.CylinderGeometry(r1, r2, h, Math.max(7, Math.round(s * .4)), 1, open, t0, tl);
  const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
  // 근육 굴곡이 있는 팔다리 (위 r1 → 가운데 불룩 → 아래 r2)
  const seg = (p, r1, r2, len, mat, bulge = 1.12) => { const pts = []; for (let i = 12; i >= 0; i--) { const u = i / 12, r = (r1 + (r2 - r1) * u) * (1 + (bulge - 1) * Math.sin(Math.min(1, u * 1.6) * PI)); pts.push(new THREE.Vector2(Math.max(.01, r), -u * len)); } part(p, new THREE.LatheGeometry(pts, 9), mat, 0, 0, 0, ol, 1.06); part(p, sph(r2, 20, 16), mat, 0, -len, 0, false); };
  const hakama = ['ichigo', 'byakuya', 'rukia', 'hitsugaya', 'kenpachi', 'aizen', 'tanjiro', 'zenitsu', 'inosuke', 'giyu', 'rengoku', 'shinobu', 'uzui', 'mitsuri', 'muichiro', 'sanemi', 'obanai', 'himejima'].includes(style), shorts = style === 'luffy';
  const leg = z => {
    const g = new THREE.Group(); g.position.set(0, 15, z); body.add(g);
    part(g, sph(1.55, 14, 12), M('pants'), 0, 0, 0, false); seg(g, 1.55, 1.12, 8, M('pants'));
    const knee = new THREE.Group(); knee.position.set(0, -8, 0); g.add(knee);
    seg(knee, 1.12, .78, 6.2, M(shorts ? 'skin' : 'pants'));
    if (!shorts) part(knee, cyl(.95, .9, 1.5), M('wrap'), 0, -4.7, 0, false);
    const foot = part(knee, sph(1, 14, 10), M('sandal'), .8, -6.6, 0); foot.scale.set(1.8, .5, .9);
    if (style !== 'saitama' && style !== 'sanji' && style !== 'genos') for (let i = 0; i < 3; i++) part(knee, sph(.26, 8, 6), M('skin'), 2.3, -6.7, (i - 1) * .38, false);
    g.userData.knee = knee; return g;
  };
  const legF = leg(1.7), legB = leg(-1.7);
  const torso = new THREE.Group(); torso.position.set(0, 15, 0); body.add(torso);
  const lathe = (pts, mat, s = 1) => { const m = part(torso, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r * s, h)), 12), mat, 0, 0, 0, ol, 1.04); m.scale.set(.72, 1, 1.15); return m; };
  const ringT = (r, t, y, mat) => { const m = part(torso, new THREE.TorusGeometry(r, t, 6, 28), mat, 0, y, 0, false); m.rotation.x = PI / 2; m.scale.set(.72, 1.15, 1); return m; };
  const UP = [[0, 2.4], [2.75, 2.4], [2.5, 4.6], [2.85, 6.5], [3.35, 8.6], [3.5, 10.2], [3.05, 11.6], [1.5, 12.5], [0, 12.7]];
  lathe([[0, -1.2], [2.6, -1], [3.0, 1], [2.75, 2.6], [0, 2.7]], M('pants'));
  if (style === 'sai') { lathe(UP.slice(0, 4).concat([[0, 6.6]]), M('skin')); lathe([[0, 6.4], [2.86, 6.4], [3.36, 8.6], [3.5, 10.2], [3.05, 11.6], [1.5, 12.5], [0, 12.7]], M('top'), 1.02); }
  else lathe(UP, M('top'));
  if (hakama) { const hk = part(torso, cyl(3.0, 4.6, 14, 26, true), M('pants'), 0, -5, 0, ol, 1.03); hk.scale.set(.8, 1, 1.05); skirtRef = hk; }
  ringT(2.85, .32, 2.6, M('belt'));
  part(torso, cyl(.7, .85, 2.2), M('skin'), .15, 13.3, 0, false);
  const front = (w, h, y, mat) => part(torso, new THREE.BoxGeometry(.12, h, w), mat, 2.45, y, 0, false);
  switch (style) {
    case 'naruto': ringT(1.7, .45, 12.2, M('top2')); for (const z of [-2.9, 2.9]) part(torso, sph(1.35, 14, 10), M('top2'), 0, 10.6, z, false); front(.35, 7.5, 7.6, BM('#e0e0e8')); break;
    case 'sasuke': { const v = part(torso, cone(1.1, 3, 3), M('skin'), 2.35, 10.8, 0, false); v.rotation.z = PI; v.scale.set(.25, 1, 1); ringT(2.95, .55, 2.8, M('belt')); break; }
    case 'sakura': { const sk = part(torso, cyl(2.9, 3.6, 4.2, 24, true), M('belt'), 0, .6, 0, ol, 1.03); sk.scale.set(.75, 1, 1.1); skirtRef = sk; break; }
    case 'kakashi': lathe([[0, 3.9], [2.75, 3.9], [3.0, 6.5], [3.5, 8.6], [3.62, 10.2], [3.2, 11.4], [0, 11.6]], M('top2'), 1.04); break;
    case 'luffy': front(1.6, 9, 7.6, M('skin')); { const sc = part(torso, new THREE.BoxGeometry(.1, 3, .25), BM('#a04030'), 2.47, 8, 0, false); sc.rotation.x = .8; sc.position.z = .1; } ringT(2.9, .45, 2.4, M('belt')); break;
    case 'zoro': ringT(2.95, 1.1, 3.4, M('top2')); front(1.2, 3, 10.6, M('skin')); break;
    case 'sanji': lathe(UP, M('top'), 1.03); front(.9, 7, 8.5, M('top2')); front(.35, 5, 8.2, BM('#1a2a6a')); break;
    case 'ichigo': case 'rukia': case 'byakuya': { const v = part(torso, cone(1.1, 3.4, 3), M('top2'), 2.35, 10.6, 0, false); v.rotation.z = PI; v.scale.set(.3, 1, 1); break; }
    case 'saitama': ringT(2.9, .45, 2.4, M('belt')); front(1.2, 1, 2.4, BM('#ffd040')); break;
    case 'genos': part(torso, sph(1, 14, 10), BM('#ff9a3c'), 2.3, 8.8, 0, false); part(torso, sph(1.5, 14, 10), toon('#9aa0aa'), 2.0, 8.8, 0, false).scale.set(.4, 1, 1); break;
  }
  if (style === 'byakuya') { const sc = part(torso, new THREE.TorusGeometry(1.8, .55, 8, 24), M('scarf'), .1, 12.4, 0, false); sc.rotation.x = PI / 2; sc.scale.set(.9, 1.2, 1); }
  // 머리
  const head = new THREE.Group(); head.position.set(0, 28, 0); body.add(head);
  part(head, sph(2, 24, 18), M('skin'), 0, 2.2, 0).scale.set(1, 1.1, .92);
  part(head, sph(1.25), M('skin'), .75, .9, 0, false).scale.set(1.05, .85, 1.0); part(head, sph(.55), M('skin'), 1.45, .35, 0, false).scale.set(1, .9, 1.3);
  for (const z of [-1.85, 1.85]) part(head, sph(.42, 10, 8), M('skin'), -.1, 2.1, z, false).scale.set(.6, 1, .45);
  part(head, cone(.2, .55, 6), M('skin'), 2.02, 1.95, 0, false).rotation.z = -PI / 2;
  const eyeR = BM(P.eye), eyeL = BM(P.eyeL || P.eye);
  [[1, eyeR], [-1, eyeL]].forEach(([s, em]) => {
    const ry = PI / 2 - s * .72, px = 1.5, pz = s * 1.24;
    const w = part(head, new THREE.CircleGeometry(style === 'saitama' ? .32 : .56, 28), BM('#f8f8f8'), px, 2.45, pz, false); w.rotation.y = ry; w.scale.y = style === 'saitama' ? .8 : 1.2;
    if (style !== 'saitama') { const lm = part(head, new THREE.CircleGeometry(.42, 26), BM('#160f1e'), px + .02, 2.42, pz + s * .02, false); lm.rotation.y = ry; lm.scale.y = 1.25; const ir = part(head, new THREE.CircleGeometry(.36, 26), em, px + .03, 2.42, pz + s * .03, false); ir.rotation.y = ry; ir.scale.y = 1.28; const iR = part(head, new THREE.CircleGeometry(.16, 16), BM('#0c0812'), px + .04, 2.34, pz + s * .04, false); iR.rotation.y = ry; iR.scale.y = 1.25; const hl = part(head, new THREE.CircleGeometry(.15, 12), BM('#ffffff'), px + .06, 2.6, pz + s * .06, false); hl.rotation.y = ry; hl.scale.y = 1.15; const hl2 = part(head, new THREE.CircleGeometry(.07, 8), BM('#f2f7ff'), px + .055, 2.28, pz + s * .055 - s * .16, false); hl2.rotation.y = ry; }
    const pu = part(head, new THREE.CircleGeometry(style === 'saitama' ? .07 : .16, 16), BM('#0a0a0a'), px + .05, 2.42, pz + s * .05, false); pu.rotation.y = ry;
    const br = part(head, new THREE.BoxGeometry(.12, .12, .85), M('hair'), 1.55, 3.05, s * 1.15, false); br.rotation.y = ry - PI / 2; br.rotation.x = s * .15;
    if (style !== 'saitama') { const el = part(head, new THREE.BoxGeometry(.09, .1, 1.12), BM('#1a1220'), px + .07, 2.95, pz, false); el.rotation.y = ry; el.scale.y = 1.05; }
  });
  part(head, new THREE.BoxGeometry(.08, .07, .6), BM('#8a3a2a'), 1.92, .85, 0, false);
  const tail = new THREE.Group(); tail.position.set(-1.9, 3.2, 0); head.add(tail);
  const cap = (k = 'hair', th = .45, sc = [1.07, 1.08, 1.03]) => { const m = part(head, new THREE.SphereGeometry(2.05, 24, 16, 0, PI * 2, 0, PI * th), M(k), -.08, 2.35, 0); m.scale.set(...sc); return m; };
  const back = (k = 'hair', th = .8, sc = [1.08, 1.06, 1.04]) => { const m = part(head, new THREE.SphereGeometry(2.05, 22, 14, -PI / 2, PI, 0, PI * th), M(k), -.1, 2.3, 0); m.scale.set(...sc); m.userData.rest = m.quaternion.clone(); m.userData.w = sc[1] > 1.3 ? .5 : .18; hairLocks.push(m); return m; };
  const spike = (dx, dy, dz, r, h, k = 'hair', base = 1.8, droop = .3) => { const d = V3(dx, dy, dz).normalize(), b0 = V3(d.x * base - .1, 2.35 + d.y * base, d.z * base * .95); const p1 = d.clone().multiplyScalar(h * .55).add(V3(0, -h * droop * .3, 0)), p2 = d.clone().multiplyScalar(h).add(V3(0, -h * droop, 0)); const lk = part(head, taperTube(new THREE.QuadraticBezierCurve3(V3(), p1, p2), r * 1.2), M(k), b0.x, b0.y, b0.z, ol, 1.1); lk.userData.rest = lk.quaternion.clone(); lk.userData.w = (.6 + rnd(hairLocks.length + 7) * .8) * Math.min(1.6, h / 2); hairLocks.push(lk); return lk; };
  const spiky = (n, r, h, seed, skipFront = true) => { for (let i = 0; i < n; i++) { const a = i / n * PI * 2, t = .22 + rnd(i + seed) * .32, dx = -Math.cos(a) * Math.sin(t * PI), dy = Math.cos(t * PI), dz = Math.sin(a) * Math.sin(t * PI); if (skipFront && dx > .45 && dy < .5) continue; spike(dx, dy, dz, r, h + rnd(i) * .7, i % 3 ? 'hair' : 'hair2'); } };
  const band = (y = 3.15) => { const b = part(head, cyl(2.12, 2.12, .55, 26, true), BM(P.band), 0, y, 0, false); b.scale.set(1.0, 1, .93); part(head, new THREE.BoxGeometry(.14, .62, 1.5), M('plate'), 2.08, y, 0, false); for (const z of [.35, -.35]) { const r = part(tail, new THREE.BoxGeometry(2.4, .3, .12), BM(P.band), -1.1, -.2, z, false); r.rotation.z = z > 0 ? .25 : .45; } };
  switch (style) {
    case 'naruto': cap(); back(); spiky(20, .62, 2.1, 3); for (const z of [-.6, 0, .6]) spike(.9, -.15, z, .42, 1.3, 'hair', 1.9); band(); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const w = part(head, new THREE.BoxGeometry(.06, .05, .7), BM('#3a2a20'), 1.62, 1.45 + i * .25, s * 1.05, false); w.rotation.y = PI / 2 - s * .9; } break;
    case 'sasuke': cap(); back(); [[-1, .5, 0], [-1, .2, .5], [-1, .2, -.5], [-.8, .7, .3], [-.8, .7, -.3], [-1, -.1, 0]].forEach(([x, y, z], i) => spike(x, y, z, .75, 2.6, i % 2 ? 'hair2' : 'hair')); [[.6, -1, .8], [.6, -1, -.8], [.5, -1, .35], [.55, -1, -.45]].forEach(([x, y, z]) => spike(x, y, z, .36, 2.5, 'hair', 1.88)); break;
    case 'kakashi': cap(); back(); for (let i = 0; i < 8; i++) spike(-.4 + i * .1, .7 + rnd(i) * .3, .45 + i * .05, .6, 2.8 + rnd(i + 9), i % 2 ? 'hair2' : 'hair'); { const mk = part(head, new THREE.SphereGeometry(2.08, 22, 12, 0, PI * 2, PI * .52, PI * .48), M('mask'), 0, 2.2, 0, false); mk.scale.set(1.02, 1.1, .95); } band(3.2); break;
    case 'sakura': cap(); back(); { const bob = part(head, cyl(2.15, 2.35, 2.8, 26, true, PI * .85, PI * 1.3), M('hair'), -.05, 1.9, 0); bob.scale.set(1.04, 1, 1); } part(head, new THREE.TorusGeometry(2.1, .14, 6, 26, PI), BM(P.band), -.1, 3.6, 0, false).rotation.y = PI / 2; break;
    case 'luffy': cap(); back(); spiky(14, .5, 1.4, 41); {
      const hat = new THREE.Group(); hat.position.set(-.2, 4, 0); hat.rotation.z = .12; head.add(hat); hatRef = hat;
      part(hat, cyl(4, 4, .16, 32), M('hat'), 0, 0, 0); part(hat, cyl(2.2, 2.35, 1.6, 26), M('hat'), 0, .85, 0); part(hat, cyl(2.38, 2.38, .5, 26, true), BM(P.hatband), 0, .35, 0, false);
      const scar = part(head, new THREE.BoxGeometry(.06, .06, .5), BM('#7a2a2a'), 1.62, 1.8, 1.0, false); scar.rotation.y = PI / 2 - .9; } break;
    case 'zoro': cap('hair', .5); back('hair', .7); for (let i = 0; i < 3; i++) part(head, sph(.12, 6, 4), BM('#ffd040'), -.1, 1.5 - i * .3, -1.95, false); break;
    case 'sanji': cap(); back(); spike(.7, -1, -.7, .5, 2.6, 'hair2', 1.85); spike(.6, -1, -.3, .45, 2.4, 'hair', 1.85); part(head, cyl(.06, .06, 1.2, 6), BM('#f0f0f0'), 2.0, .75, .2, false).rotation.z = PI / 2 - .3; break;
    case 'ichigo': cap(); back(); spiky(22, .6, 2.2, 61); spike(.9, -.2, 0, .45, 1.4, 'hair2', 1.9); break;
    case 'byakuya': cap(); back('hair', .95, [1.05, 1.4, 1.05]); for (const z of [-.7, .7]) { const k = part(head, cyl(.25, .25, 1.8, 8), M('kenseikan'), -.3, 4.2, z, false); k.rotation.x = z > 0 ? .4 : -.4; } spike(.7, -1, .9, .3, 2.6, 'hair', 1.9); spike(.7, -1, -.9, .3, 2.6, 'hair', 1.9); break;
    case 'rukia': cap(); back('hair', .55); spike(.8, -.9, 0, .25, 2.2, 'hair', 1.95); break;
    case 'saitama': part(head, new THREE.SphereGeometry(2.05, 24, 16, 0, PI * 2, 0, PI * .5), M('skin'), -.06, 2.35, 0).scale.set(1.04, 1.12, .96); break;
    case 'genos': cap(); back(); spiky(16, .5, 1.6, 81); break;
    case 'itachi': cap(); back('hair', .9); spike(.7, -1, .8, .3, 2.4, 'hair', 1.9); spike(.7, -1, -.8, .3, 2.4, 'hair', 1.9); break;
    case 'gai': cap('hair', 1.05); back('hair', .75); break;
    case 'kizaru': cap('hair', .9); back('hair', .8); break;
    case 'law': cap(); back(); spiky(10, .4, 1.2, 17); break;
    case 'aizen': cap(); back('hair', .8); spiky(8, .4, 1.4, 23); spike(.8, -.4, .3, .25, 2.2, 'hair2', 1.9); break;
    case 'kenpachi': cap(); back(); spiky(26, .5, 2.6, 91); break;
    case 'tatsumaki': cap(); back(); for (let i = 0; i < 10; i++) spike(-.2 + rnd(i) * .4, -.6 - rnd(i + 3) * .3, -1 + i * .22, .4, 1.8, i % 2 ? 'hair2' : 'hair', 1.6); break;
    case 'bang': cap(); back('hair', .9); spiky(12, .45, 1.4, 37); break;
    case 'garou': cap(); back(); spiky(14, .5, 1.8, 53); break;
    case 'nezuko': case 'mitsuri': case 'muichiro': cap(); back('hair', 1.1, [1.08, 1.7, 1.08]); spiky(8, .4, 1.2, 71); break;
    case 'giyu': cap(); back('hair', .9, [1.05, 1.3, 1.05]); spiky(12, .45, 1.5, 19); break;
    case 'rengoku': cap(); back(); spiky(24, .6, 2.4, 13); spike(.9, -.2, 0, .45, 1.6, 'hair2', 1.9); break;
    case 'zenitsu': cap(); back(); spiky(18, .5, 1.8, 7); break;
    case 'shinobu': cap(); back('hair', .8); spiky(6, .35, 1.0, 43); break;
    case 'himejima': cap('hair', .6); back('hair', .6); break;
    default: cap(); back(); spiky(16, .5, 1.7, 29); break;
  }
  const arm = z => {
    const up = new THREE.Group(); up.position.set(.3, 26, z); body.add(up);
    const sk = ['zoro', 'luffy'].includes(style) ? 'skin' : 'sleeve';
    part(up, sph(1.32), M(style === 'luffy' ? 'top' : sk), 0, -.2, 0, false); seg(up, 1.05, .8, 7, M(sk), 1.16);
    if (style === 'genos') for (let i = 0; i < 2; i++) part(up, new THREE.TorusGeometry(.9, .15, 6, 16), BM('#ff9a3c'), 0, -2 - i * 3, 0, false).rotation.x = PI / 2;
    const fore = new THREE.Group(); fore.position.set(0, -7, 0); up.add(fore);
    seg(fore, .82, .58, 6, M(['naruto', 'kakashi', 'sanji', 'saitama', 'genos', 'ichigo', 'byakuya', 'rukia', 'sasuke'].includes(style) ? 'sleeve' : 'skin'));
    if (style !== 'saitama' && style !== 'sanji') part(fore, cyl(.72, .68, 1.4), M('wrap'), 0, -4.5, 0, false);
    part(fore, sph(.95), M('glove'), 0, -6.95, 0, false).scale.set(.7, 1.1, 1);
    for (let i = 0; i < 4; i++) { const f = part(fore, cyl(.19, .16, 1.1, 10), M('glove'), .55, -7.75, (i - 1.5) * .33, false); f.rotation.z = 1.5; }
    const th = part(fore, cyl(.16, .13, .9, 6), M('glove'), .5, -7.05, z > 0 ? .55 : -.55, false); th.rotation.x = z > 0 ? -.7 : .7;
    return { up, fore };
  };
  const aF = arm(4.3), aB = arm(-4.3);
  const fxg = new THREE.Group(); fxg.position.set(0, -7.4, 0); fxg.scale.setScalar(.62); aF.fore.add(fxg);
  const rasen = new THREE.Group();
  rasen.add(new THREE.Mesh(sph(4.2, 24, 18), addMat('#3a8aff', .5))); rasen.add(new THREE.Mesh(sph(3, 20, 14), addMat('#8acaff', .55))); rasen.add(new THREE.Mesh(sph(1.8, 14, 10), addMat('#ffffff')));
  const rr = new THREE.Group(); for (let i = 0; i < 7; i++) { const tr = new THREE.Mesh(new THREE.TorusGeometry(4.4 + i * .3, .14, 4, 36), addMat(i % 2 ? '#9fe0ff' : '#ffffff', .7)); tr.rotation.set(i * .9, i * .6, i * .3); rr.add(tr); } rasen.add(rr); rasen.visible = false; fxg.add(rasen);
  const chid = new THREE.Group(); chid.add(new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 2), addMat('#7aaaff', .6))); chid.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2, 2), addMat('#ffffff')));
  const spikes = []; for (let i = 0; i < 22; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(10, .3, .3), addMat(i % 2 ? '#ffffff' : '#bfe0ff')); chid.add(sp); spikes.push(sp); } chid.visible = false; fxg.add(chid);
  const glow = new THREE.Mesh(sph(3.2, 16, 12), addMat('#ffffff', .0)); fxg.add(glow);
  // 칼
  const sword = (parent, len, w, col, big) => { const s = new THREE.Group(); s.position.set(0, -7.4, 0); parent.add(s); part(s, cyl(.3, .3, 3, 8), M('top2'), 0, 1.2, 0, false); part(s, cyl(.75, .75, .2, 12), BM('#c0a040'), 0, -.4, 0, false); part(s, new THREE.BoxGeometry(big ? .5 : .14, len, w), BM(col), 0, -.5 - len / 2, big ? .8 : 0); return s; };
  let mouthSword = null;
  if (style === 'zoro') { sword(aF.fore, 13, .6, '#e8eef5'); sword(aB.fore, 13, .6, '#e8eef5'); mouthSword = new THREE.Group(); mouthSword.position.set(2.3, .9, 0); head.add(mouthSword); part(mouthSword, new THREE.BoxGeometry(.14, .6, 13), BM('#e8eef5'), 0, 0, 6.5, false); mouthSword.visible = false; }
  if (style === 'ichigo') sword(aF.fore, 17, 4.2, '#d8dce4', true);
  if (style === 'byakuya') sword(aF.fore, 13, .55, '#e8eef5');
  if (style === 'rukia') sword(aF.fore, 12, .55, '#ffffff');
  // 망토·겉옷 조각
  const coat = []; let coatOn = false;
  if (['naruto', 'sasuke', 'byakuya', 'saitama', 'ichigo', 'itachi', 'aizen', 'kenpachi', 'hitsugaya', 'kizaru', 'law', 'gaara', 'tanjiro', 'zenitsu', 'giyu', 'rengoku', 'shinobu', 'mitsuri', 'muichiro', 'sanemi', 'obanai', 'himejima', 'nezuko'].includes(style)) {
    coatOn = style !== 'ichigo';
    const cm = style === 'naruto' ? BM(P.coat) : M('coat'), cm2 = style === 'naruto' ? BM('#141420') : M('coat2');
    for (let i = 0; i < 10; i++) coat.push(part(body, new THREE.BoxGeometry(.5, 2.2, 8.2 + i * .14), i === 9 ? cm2 : cm, 0, 0, 0, ol && style !== 'naruto'));
    coat.forEach(c => c.visible = coatOn);
  }
  let mask = null;
  if (style === 'ichigo') { mask = part(head, new THREE.SphereGeometry(2.12, 22, 14, -PI / 2, PI, PI * .1, PI * .75), BM('#f4f4f4'), .05, 2.1, 0, false); mask.rotation.y = PI; mask.visible = false; for (const z of [-1, 1]) { const s = part(mask, new THREE.BoxGeometry(.2, 2.6, .25), BM('#c81e2a'), 2.05, 0, z * .6, false); } }
  const mats2 = { hair: mats.find(m => m.color && P.hair && m.color.getHexString() === P.hair.slice(1)) };
  return { root, body, legF, legB, torso, head, tail, aF, aB, rasen, rr, chid, spikes, glow, fxg, mats, eyeR, eyeL, coat, coatOn, mask, mouthSword, style, mats2, hairLocks, hatRef, skirtRef };
}

// ═══ 캐릭터 ═══
const PALS = {
  naruto: { hair: '#f8d030', hair2: '#ffe880', skin: '#f1c9a0', top: '#f07a18', top2: '#1c1c28', pants: '#f07a18', sandal: '#2a3a6a', band: '#1e3a7a', plate: '#c8ccd8', eye: '#2a6aff', sleeve: '#f07a18', belt: '#1c1c28', wrap: '#e8e8f0', coat: '#ffc040', coat2: '#141420', glove: '#f1c9a0' },
  sasuke: { hair: '#1a1c2c', hair2: '#2c3048', skin: '#ecc8a6', top: '#cfd4e2', top2: '#2a2e40', pants: '#262a3c', sandal: '#20202c', plate: '#c8ccd8', eye: '#c01a1a', eyeL: '#b08aff', sleeve: '#cfd4e2', belt: '#6a3a9a', wrap: '#e0e0e8', coat: '#3a4258', coat2: '#4a5470', glove: '#ecc8a6' },
  kakashi: { hair: '#d8dce4', hair2: '#f0f2f6', skin: '#ecc8a6', top: '#2a3450', top2: '#3e5a3a', pants: '#2a3450', sandal: '#1a1a2a', band: '#1a2040', plate: '#c8ccd8', eye: '#1a1a1a', eyeL: '#d01a1a', sleeve: '#2a3450', belt: '#3e5a3a', wrap: '#e8e8f0', glove: '#1a1a22', mask: '#1a2040' },
  sakura: { hair: '#f4a0c0', hair2: '#ffc0d8', skin: '#f6d2b0', top: '#c8243a', top2: '#9a1a2c', pants: '#22222e', sandal: '#2a2a3a', band: '#c8243a', plate: '#c8ccd8', eye: '#3a9a5a', sleeve: '#c8243a', belt: '#e8a0c0', wrap: '#e8e8f0', glove: '#1a1a22' },
  luffy: { hair: '#121216', hair2: '#22222a', skin: '#f0c8a0', top: '#c81e2a', top2: '#c81e2a', pants: '#2a5aa8', sandal: '#8a6a3a', eye: '#141414', sleeve: '#f0c8a0', belt: '#e0c070', wrap: '#c81e2a', glove: '#f0c8a0', hat: '#e8c860', hatband: '#c81e2a' },
  zoro: { hair: '#3a8a3a', hair2: '#4aa04a', skin: '#e8bc94', top: '#f0f0f0', top2: '#2a6a2a', pants: '#1a1a22', sandal: '#1a1a22', eye: '#141414', sleeve: '#e8bc94', belt: '#2a6a2a', wrap: '#1a1a22', glove: '#e8bc94' },
  sanji: { hair: '#f8d860', hair2: '#ffe890', skin: '#f0c8a0', top: '#1a1a22', top2: '#e8e8f0', pants: '#1a1a22', sandal: '#0a0a0a', eye: '#2a6aff', sleeve: '#1a1a22', belt: '#1a1a22', wrap: '#1a1a22', glove: '#f0c8a0' },
  ichigo: { hair: '#ff8a20', hair2: '#ffb040', skin: '#f0c8a0', top: '#141418', top2: '#e8e8f0', pants: '#141418', sandal: '#e8e8f0', eye: '#7a4a20', sleeve: '#141418', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f0c8a0', coat: '#0a0a0e', coat2: '#c81e2a' },
  byakuya: { hair: '#141418', hair2: '#22222a', skin: '#f4dcc8', top: '#141418', top2: '#f4f4f8', pants: '#141418', sandal: '#e8e8f0', eye: '#5a5a7a', sleeve: '#141418', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f4dcc8', coat: '#f4f4f8', coat2: '#d0d0d8', kenseikan: '#f4f4f8', scarf: '#d8ead8' },
  rukia: { hair: '#141418', hair2: '#22222a', skin: '#f6dcc8', top: '#141418', top2: '#e8e8f0', pants: '#141418', sandal: '#e8e8f0', eye: '#5a3a8a', sleeve: '#141418', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f6dcc8' },
  saitama: { hair: '#f0c8a0', skin: '#f0c8a0', top: '#f8d830', top2: '#f8d830', pants: '#f8d830', sandal: '#c81e2a', eye: '#141414', sleeve: '#f8d830', belt: '#141414', wrap: '#f8d830', glove: '#c81e2a', coat: '#f4f4f8', coat2: '#e0e0e8' },
  gaara: { hair: '#b8241e', hair2: '#d83a2a', skin: '#f0d0b0', top: '#7a2a2a', top2: '#4a1a1a', pants: '#3a2a2a', sandal: '#2a2a2a', eye: '#4ac090', sleeve: '#7a2a2a', belt: '#c8a060', wrap: '#e0e0e8', glove: '#f0d0b0', coat: '#c8a060', coat2: '#8a6a3a' },
  itachi: { hair: '#141418', hair2: '#24242c', skin: '#ecc8a6', top: '#1a1a22', top2: '#c81e2a', pants: '#1a1a22', sandal: '#1a1a22', band: '#1a2040', plate: '#c8ccd8', eye: '#d01a1a', sleeve: '#1a1a22', belt: '#3a3a4a', wrap: '#e0e0e8', glove: '#ecc8a6', coat: '#141418', coat2: '#c81e2a' },
  gai: { hair: '#141418', hair2: '#24242c', skin: '#e8bc94', top: '#2a7a3a', top2: '#f07a18', pants: '#2a7a3a', sandal: '#1a1a22', band: '#c81e2a', plate: '#c8ccd8', eye: '#141414', sleeve: '#2a7a3a', belt: '#c81e2a', wrap: '#f07a18', glove: '#e8bc94' },
  ace: { hair: '#141418', hair2: '#24242c', skin: '#e8b88a', top: '#e8b88a', top2: '#e8b88a', pants: '#3a3a3a', sandal: '#4a3a2a', eye: '#141414', sleeve: '#e8b88a', belt: '#c89a40', wrap: '#e05a1a', glove: '#e8b88a' },
  kizaru: { hair: '#2a2a2a', hair2: '#3a3a3a', skin: '#e8c0a0', top: '#f0e060', top2: '#f4f4f8', pants: '#f0e060', sandal: '#2a2a2a', eye: '#f8d040', sleeve: '#f0e060', belt: '#2a2a2a', wrap: '#f0e060', glove: '#e8c0a0', coat: '#f4f4f8', coat2: '#e0e0e8' },
  law: { hair: '#141418', hair2: '#24242c', skin: '#e0b088', top: '#f0e8a0', top2: '#141418', pants: '#e8d8b0', sandal: '#1a1a22', eye: '#c8a020', sleeve: '#f0e8a0', belt: '#141418', wrap: '#141418', glove: '#e0b088', coat: '#141418', coat2: '#f0e060' },
  hitsugaya: { hair: '#f4f8ff', hair2: '#d8e8ff', skin: '#f4dcc8', top: '#141418', top2: '#e8e8f0', pants: '#141418', sandal: '#e8e8f0', eye: '#3ad0a0', sleeve: '#141418', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f4dcc8', coat: '#f4f4f8', coat2: '#2a8a6a' },
  kenpachi: { hair: '#141418', hair2: '#24242c', skin: '#e0b088', top: '#141418', top2: '#e8e8f0', pants: '#141418', sandal: '#e8e8f0', eye: '#f8d040', sleeve: '#141418', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#e0b088', coat: '#e8e8f0', coat2: '#d0d0d8' },
  aizen: { hair: '#5a3a24', hair2: '#7a5034', skin: '#f0d0b0', top: '#f4f4f8', top2: '#e8e8f0', pants: '#f4f4f8', sandal: '#1a1a22', eye: '#6a3a1a', sleeve: '#f4f4f8', belt: '#5a3a9a', wrap: '#e8e8f0', glove: '#f0d0b0', coat: '#f4f4f8', coat2: '#d0c8e8' },
  tatsumaki: { hair: '#3ad07a', hair2: '#6af0a0', skin: '#f8dcc8', top: '#141418', top2: '#22222a', pants: '#141418', sandal: '#141418', eye: '#3ad07a', sleeve: '#141418', belt: '#141418', wrap: '#141418', glove: '#f8dcc8' },
  bang: { hair: '#e8e8f0', hair2: '#ffffff', skin: '#e8c0a0', top: '#2a2a30', top2: '#4a4a52', pants: '#2a2a30', sandal: '#1a1a22', eye: '#141414', sleeve: '#2a2a30', belt: '#4a4a52', wrap: '#2a2a30', glove: '#e8c0a0' },
  garou: { hair: '#c8ccd8', hair2: '#e8ecf4', skin: '#e8c0a0', top: '#1a1a22', top2: '#3a3a44', pants: '#1a1a22', sandal: '#1a1a22', eye: '#c81e2a', sleeve: '#1a1a22', belt: '#3a3a44', wrap: '#1a1a22', glove: '#e8c0a0' },
  tanjiro: { hair: '#6a1a1a', hair2: '#8a2a2a', skin: '#f0c8a0', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#a0281e', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f0c8a0', coat: '#1a6a4a', coat2: '#101010' },
  nezuko: { hair: '#1a1018', hair2: '#e0507a', skin: '#f8dcc8', top: '#f0a0b8', top2: '#7a2a3a', pants: '#7a2a3a', sandal: '#2a1a1a', eye: '#e0507a', sleeve: '#f0a0b8', belt: '#c89a5a', wrap: '#f0a0b8', glove: '#f8dcc8', coat: '#5a2a1a', coat2: '#7a3a2a' },
  zenitsu: { hair: '#f8d030', hair2: '#ff9a20', skin: '#f6d2b0', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#c08a20', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f6d2b0', coat: '#f8c830', coat2: '#f4f4f8' },
  inosuke: { hair: '#5a6a7a', hair2: '#8a9aaa', skin: '#f0c8a0', top: '#f0c8a0', top2: '#f0c8a0', pants: '#3a3a40', sandal: '#2a2a2a', eye: '#3a6a9a', sleeve: '#f0c8a0', belt: '#c8a060', wrap: '#e8e8f0', glove: '#f0c8a0' },
  giyu: { hair: '#141418', hair2: '#24242c', skin: '#f0d0b0', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#2a5aa8', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f0d0b0', coat: '#8a2a2a', coat2: '#c8a040' },
  rengoku: { hair: '#f8c830', hair2: '#e0401a', skin: '#f0c8a0', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#f8a020', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f0c8a0', coat: '#f4f4f8', coat2: '#e0401a' },
  shinobu: { hair: '#1a1020', hair2: '#8a5ad0', skin: '#f8dcc8', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#a07ad0', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f8dcc8', coat: '#c8b0f0', coat2: '#6a3ab0' },
  uzui: { hair: '#f4f4f8', hair2: '#d8d8e0', skin: '#f0c8a0', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#c03a6a', sleeve: '#f0c8a0', belt: '#c8a040', wrap: '#c8a040', glove: '#f0c8a0', band: '#c8a040' },
  mitsuri: { hair: '#f490c0', hair2: '#9ad070', skin: '#f8dcc8', top: '#141820', top2: '#f8dcc8', pants: '#141820', sandal: '#e8e8f0', eye: '#4aa05a', sleeve: '#141820', belt: '#e8e8f0', wrap: '#f490c0', glove: '#f8dcc8', coat: '#f4f4f8', coat2: '#f490c0' },
  muichiro: { hair: '#141418', hair2: '#4ad0c0', skin: '#f8dcc8', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#4ad0c0', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f8dcc8', coat: '#1a2a30', coat2: '#4ad0c0' },
  sanemi: { hair: '#f4f4f8', hair2: '#d8d8e0', skin: '#e8c0a0', top: '#141820', top2: '#e8c0a0', pants: '#141820', sandal: '#e8e8f0', eye: '#a05a7a', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#e8c0a0', coat: '#f4f4f8', coat2: '#e0e0e8' },
  obanai: { hair: '#141418', hair2: '#24242c', skin: '#f4dcc8', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#d0c020', eyeL: '#3ad0c0', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#f4dcc8', coat: '#f4f4f8', coat2: '#2a2a32' },
  himejima: { hair: '#141418', hair2: '#24242c', skin: '#d8a880', top: '#141820', top2: '#2a2a32', pants: '#141820', sandal: '#e8e8f0', eye: '#f4f4f8', sleeve: '#141820', belt: '#e8e8f0', wrap: '#e8e8f0', glove: '#d8a880', coat: '#6a5a3a', coat2: '#4a3a2a' },
  genos: { hair: '#f8d860', hair2: '#ffe890', skin: '#f0c8a0', top: '#2a2a30', top2: '#9aa0aa', pants: '#2a2a30', sandal: '#2a2a30', eye: '#ffd040', sleeve: '#4a4e58', belt: '#2a2a30', wrap: '#ff8a20', glove: '#3a3e48' },
};
const WORLD = { kimetsu: { name: '귀멸의 칼날', stroke: '#1a6a5a', dodge: '전집중 회피' }, naruto: { name: '나루토', stroke: '#c04a00', dodge: '치환술' }, onepiece: { name: '원피스', stroke: '#a01a1a', dodge: '견문색 회피' }, bleach: { name: '블리치', stroke: '#1a3a8a', dodge: '순보' }, opm: { name: '원펀맨', stroke: '#8a7a10', dodge: '가볍게 피함' } };

// ═══ 싸움 상태 ═══
const step = (d, acts, fx2) => ({ d, acts: acts.filter(a => a[0] && a[1]), fx: fx2 });
const mkF = ch => ({ ch, model: null, pos: V3(), vel: V3(), kb: V3(), hist: [], air: false, heading: 0, faceT: null, target: null, c: { ...POSE.guard, legF: .4, legB: .4, kneeF: .2, kneeB: .2 }, tgt: POSE.guard, k: 26, flash: 0, run: 0, speed: 0, aura: 0, elem: null, hand: null, handSize: 1, ghost: 0, lock: 0, breath: 0, mode: 0, modeK: null, stretch: 0, stretchT: 0, giantArm: 0, scale: 1 });
const CH = {}; const ROSTER = { naruto: [], onepiece: [], bleach: [], opm: [], kimetsu: [] };
// 60fps: 같은 관절에 붙은 같은 재질 조각(윤곽선 포함)을 하나로 합쳐 그리기 호출을 줄인다. 코드가 따로 움직이는 조각은 그대로 둔다.
function mergeModel(m) {
  const keep = new Set(); Object.values(m).forEach(v => { if (v && v.isObject3D) keep.add(v); else if (Array.isArray(v)) v.forEach(x => { if (x && x.isObject3D) keep.add(x); }); });
  // 도트게임처럼 단순하게: 작은 부품(단추·손가락 마디 등)과 그 윤곽선은 그리지 않는다(눈 등 단색 부품은 유지)
  m.root.traverse(o => { if (o.isMesh && o.layers.mask === 2 && !keep.has(o) && (o.material.type === 'MeshToonMaterial' || o.material === OUT)) o.visible = false; });
  const parents = []; m.root.traverse(o => { if (o.children.length) parents.push(o); });
  const cat = (geos, par, mat, mask, cast) => { const out = new THREE.BufferGeometry(); ['position', 'normal'].forEach(nm => { const arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[nm].count * 3, 0)); let off = 0; geos.forEach(g => { arr.set(g.attributes[nm].array, off); off += g.attributes[nm].count * 3; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, 3)); }); out.computeBoundingSphere(); geos.forEach(g => g.dispose()); const mm = new THREE.Mesh(out, mat); mm.layers.mask = mask; mm.castShadow = cast; par.add(mm); };
  parents.forEach(par => {
    const G = new Map(), put = (key, mat, mask, cast, g) => { if (!G.has(key)) G.set(key, { mat, mask, cast, geos: [] }); G.get(key).geos.push(g); }, gone = [];
    par.children.forEach(o => {
      if (!o.isMesh || keep.has(o) || !o.visible || o.material.type !== 'MeshToonMaterial') return;
      const ol2 = o.children.length === 1 && o.children[0].material === OUT && !o.children[0].children.length ? o.children[0] : null; if (o.children.length && !ol2) return;
      o.updateMatrix(); const base = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      put(o.material.uuid + '|' + o.layers.mask, o.material, o.layers.mask, o.castShadow, base.clone().applyMatrix4(o.matrix));
      if (ol2) { ol2.updateMatrix(); put('OUT|' + ol2.layers.mask, OUT, ol2.layers.mask, false, base.clone().applyMatrix4(ol2.matrix).applyMatrix4(o.matrix)); }
      base.dispose(); gone.push(o);
    });
    if (gone.length < 2) return;
    gone.forEach(o => par.remove(o)); G.forEach(v => cat(v.geos, par, v.mat, v.mask, v.cast));
  });
  return m;
}
function defChar(key, name, world, skills, sig) { const c = { key, name, world, skills, sig, P: PALS[key] }; c.model = mergeModel(buildHuman(c.P, key)); c.model.root.visible = false; scene3.add(c.model.root); CH[key] = c; ROSTER[world].push(c); return c; }
let F = [];
const chest = f => f.pos.clone().add(V3(0, 22 * MS * f.scale, 0));
const headP = f => f.pos.clone().add(V3(0, 30 * MS * f.scale, 0));
const dirTo = (a, b) => { const d = b.pos.clone().sub(a.pos); d.y = 0; return d.lengthSq() < .01 ? V3(1, 0, 0) : d.normalize(); };
const fwdOf = f => V3(Math.cos(f.heading), 0, Math.sin(f.heading));
function handP(f) { const v = V3(); f.model.fxg.getWorldPosition(v); return v; }
const others = f => F.filter(o => o !== f);

// 결과
const OUTS = ['block', 'block', 'dodge', 'jump', 'hit', 'hit', 'sub', 'counter'];
function defSpec(o) {
  switch (o) {
    case 'block': case 'counter': return { pose: 'block', k: 70, fwd: -40 };
    case 'dodge': return { pose: 'duck', side: pick([-1, 1]) * 220, ghost: 1 };
    case 'jump': return { pose: 'air', vy: 230, fwd: -80 };
    case 'sub': return { pose: 'block' };
    default: return { pose: 'hurt', fwd: -180, k: 50 };
  }
}
function clash(a, b, text, big) {
  const m = handP(a).lerp(chest(b), .5); clashes++;
  burst(m, big ? 16 : 8, ['#fff6b0', '#ffd040', '#ffffff'], big ? 2 : 1.3); impact(m, big ? 6 : 3); ring(m, 2, '#fff2a0', false);
  shield(b, '#ffffff'); light(m, '#ffd070', big ? 4 : 2); shake = Math.max(shake, big ? 4 : 2);
  label(headP(b).add(V3(0, 4, 0)), text, '#9fd8ff');
  if (big && Math.random() < .5) shot(pick(['fp', 'quarter', 'side', 'low', 'over']), R(2.2, 3), a);
}
function hitFx(v, ek) {
  const E = ELEM[ek] || ELEM.metal, p = chest(v), g = V3(v.pos.x, WATER_H + .3, v.pos.z);
  burst(p, 14, E.parts, 1.6); ring(p, 2.5, E.c, false, .7, 2.6); ring(g, 3, E.c, true, .9, 2.2); light(p, E.c, 5);
  switch (E.style) {
    case 'flame': emitters.push({ k: 'flames', p: v.pos.clone(), life: .8, fire: ek !== 'dark' }); for (let i = 0; i < 18; i++) parts.push({ p: p.clone(), v: V3(R(-30, 30), R(30, 90), R(-30, 30)), life: 1, c: pick(E.parts), g: -30, s: 2 }); break;
    case 'spark': for (let i = 0; i < 4; i++) bolt(p.clone().add(V3(R(-9, 9), R(-6, 12), R(-9, 9))), p.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), E.c, .5, 1.2); break;
    case 'frost': for (let i = 0; i < 5; i++) add({ k: 'spike', p: V3(v.pos.x + R(-6, 6), WATER_H, v.pos.z + R(-6, 6)), h: R(5, 11), c: '#d8f6ff', life: 1.2 }); break;
    case 'gust': case 'shadow': add({ k: 'spiral', p: p.clone(), c: E.c, life: .9 }); break;
    case 'rock': for (let i = 0; i < 14; i++) parts.push({ p: g.clone(), v: V3(R(-50, 50), R(60, 140), R(-50, 50)), life: 1, c: pick(E.parts), g: 260, s: 2 }); break;
    case 'splash': for (let i = 0; i < 20; i++) { const an = i / 20 * PI * 2; parts.push({ p: p.clone(), v: V3(Math.cos(an) * 60, R(20, 80), Math.sin(an) * 60), life: .9, c: pick(E.parts), g: 200, s: 2 }); } break;
    default: for (let i = 0; i < 4; i++) mark(p.clone().add(V3(R(-4, 4), R(-4, 4), R(-4, 4))), R(0, PI), R(10, 18), E.c, 1, 1); }
}
function wound(v, a, text, ek) {
  hitFx(v, ek || a.elem || (a.ch.sig && a.ch.sig.elem) || 'metal');
  if (Math.random() < .55) { v.fallV = (v.fallV || 0) + R(6, 11); v.vel.y = Math.max(v.vel.y, R(100, 180)); v.air = true; }
  v.cv = v.cv || {}; v.cv.lean = (v.cv.lean || 0) - 70; v.cv.twist = (v.cv.twist || 0) + R(-9, 9); v.cv.bob = (v.cv.bob || 0) + 25; if (v.model && v.model.ph) v.model.ph.sv.add(V3(-4, 2, R(-3, 3)));
  v.flash = 6; shake = 7; flashScreen(.2, '255,120,90');
  const p = chest(v); burst(p, 16, ['#ffffff', '#ff5a3a', '#ffd040'], 1.9); impact(p, 7); light(p, '#ff6a40', 4);
  for (let i = 0; i < 3; i++) mark(p.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), R(0, PI), R(6, 12), a.elem ? ELEM[a.elem].c : '#ffffff');
  label(headP(a).add(V3(0, 4, 0)), text, '#ff7a3a');
  if (Math.random() < .5) shot(pick(['fp', 'over', 'quarter', 'low', 'close', 'duel', 'close']), R(2.2, 3), a);
}
function substitute(b, a) {
  const w = WORLD[b.ch.world]; const p0 = b.pos.clone();
  if (b.ch.world === 'naruto') { burst(chest(b), 14, ['#e8e8f0', '#ffffff'], .8, -10, 2); label(headP(b), '펑!', '#ffffff'); logs.push({ p: p0, life: 1.6 }); }
  else for (let i = 0; i < 5; i++) ghosts.push({ ch: b.ch, pos: b.pos.clone().lerp(a.pos, i / 8), heading: b.heading, c: { ...b.c }, life: 1, color: '#ffffff', dec: .04 });
  const behind = a.pos.clone().sub(fwdOf(a).multiplyScalar(14)); behind.y = 0; b.pos.copy(clampArena(behind)); b.air = false; b.vel.set(0, 0, 0);
  label(headP(b).add(V3(0, 4, 0)), w.dodge + '!', '#ffe080'); counterBy = b;
}
function resolve(a, b, ek, o, nm, pw = 1, at) {
  const p = at || chest(b); ek = ek || a.elem || (a.ch.sig && a.ch.sig.elem) || 'metal';
  const kd = dirTo(a, b), kr = R(.45, 1.7) * HEAT(), kv = kd.clone().applyAxisAngle(V3(0, 1, 0), R(-.5, .5));
  if (o === 'block' || o === 'counter') { b.kb.addScaledVector(kv, (90 + 50 * pw) * kr); a.kb.addScaledVector(kd, -45 * R(.5, 1.5)); }
  else if (o === 'hit' || o === 'sub') { b.kb.addScaledVector(kv, (190 + 110 * pw) * kr); if (o === 'hit' && Math.random() < .7) { b.vel.y = Math.max(b.vel.y, (50 + 70 * pw) * kr); b.air = true; } a.kb.addScaledVector(kd, 30 * R(0, 1.5)); }
  else { a.kb.addScaledVector(kd, R(20, 70)); b.kb.addScaledVector(V3(-kd.z, 0, kd.x), R(-80, 80)); }
  // 맞으면 이따금 잠깐 못 움직임(경직·주저앉음)
  if (o === 'hit' && F.includes(b) && Math.random() < .45) { b.stun = R(.35, 1.4) * (pw > 1.3 ? 1.4 : 1); label(headP(b).add(V3(0, 6, 0)), pick(['경직!', '휘청!', '못 움직임!']), '#ffe070'); }
  // 맞히면 쫓아가 한 번 더 (최대 두 번)
  if (o === 'hit' && (a.chainN || 0) < Math.round(2 * HEAT() * HEAT()) && Math.random() < Math.min(.85, .5 * HEAT()) && F.includes(a) && F.includes(b)) { a.chainN = (a.chainN || 0) + 1; (laneOf(a) || queue).unshift(step('run', [[a, { pose: 'crouchRun', to: near(a, b, 8), face: b, ghost: 1 }], [b, { pose: 'hurt', face: a }]], () => label(headP(a).add(V3(0, 4, 0)), '추격!', '#ffd84a')), step(.09, [[a, { pose: pick(['punch', 'highKick', 'kick', 'slash', 'palm']), k: 95, fwd: 140, face: b, elem: ek }], [b, defSpec(pick(['hit', 'block', 'dodge']))]], () => resolve(a, b, ek, pick(['hit', 'block', 'hit', 'dodge']), '추격타!', .8))); }
  if (o === 'block') { clash(a, b, '막기!', true); if (ek) explode(p, ek, .5 * pw); }
  else if (o === 'counter') { clash(a, b, '받아치기!', true); counterBy = b; }
  else if (o === 'hit') { wound(b, a, nm, ek); if (ek) explode(p, ek, pw); }
  else if (o === 'sub') { if (ek) explode(p, ek, .7 * pw); substitute(b, a); }
  else label(headP(b).add(V3(0, 4, 0)), o === 'jump' ? '회피!' : WORLD[b.ch.world].dodge + '!', '#b0ffb0');
}
// 필살기 광역 폭발: 겹 돔 + 땅을 가르는 충격파 + 빛기둥 + 파편 + 주변 모두 휘말림
function ultBlast(p, ek, rad, owner, nm) {
  const E = ELEM[ek] || ELEM.power, g = V3(p.x, WATER_H + .1, p.z);
  moses(g, g, rad * .45, 3); ripple(p.x, p.z, 3.2); for (let i = 0; i < Math.round(70 * FXM()); i++) { const a = R(0, PI * 2), sp = R(40, 160); parts.push({ p: g.clone().add(V3(Math.cos(a) * rad * .4, 1, Math.sin(a) * rad * .4)), v: V3(Math.cos(a) * sp, R(80, 260), Math.sin(a) * sp), life: 1.8, c: pick(['#8a6a4a', '#6a5038', '#a08060']), g: 260, s: 2 }); }
  dome(p, rad * .55, E.c); dome(p, rad * .38, '#ffffff', E.c); dome(p, rad * .75, E.parts[2] || E.c);
  for (let i = 0; i < 6; i++) pending.push({ t: i * .08, fn: () => ring(g, 4 + i * 3, i % 2 ? E.c : '#ffffff', true, 1.6, 2.6 + i * .5) });
  for (let i = 0; i < 3; i++) pending.push({ t: .05 + i * .1, fn: () => ring(p, 4, i % 2 ? '#ffffff' : E.c, false, 1.2, 2.4) });
  pillar(g, rad * .35, E.c, 1.4); pillar(g, rad * .12, '#ffffff', 1.4);
  for (let i = 0; i < 4; i++) pending.push({ t: .18 + i * .07, fn: () => ring(g, 3 + i * 4, '#ffffff', true, 1.1, 3.2) });
  for (let i = 0; i < Math.round(50 * FXM()); i++) { const a = R(0, PI * 2), s = R(60, 220); parts.push({ p: g.clone().add(V3(0, 2, 0)), v: V3(Math.cos(a) * s, R(40, 200), Math.sin(a) * s), life: 1.6, c: pick(E.parts.concat(['#9fd0e8'])), g: 200, s: 2 }); }
  for (let i = 0; i < Math.round(34 * FXM()); i++) { const a = R(0, PI * 2); parts.push({ p: g.clone().add(V3(Math.cos(a) * rad * .5, 1, Math.sin(a) * rad * .5)), v: V3(Math.cos(a) * 30, R(60, 160), Math.sin(a) * 30), life: 1.8, c: '#bcd8e8', g: 140, s: 2 }); }
  explode(p, ek, 3); light(p, E.c, 12); light(p.clone().add(V3(0, 10, 0)), '#ffffff', 8); shake = 20; flashScreen(.07, hexRgb(E.c));
  if (owner) aoeHit(owner, g, rad, ek, nm, 2.2);
}
function aoeHit(a, center, rad, ek, nm, pw = 1) { others(a).forEach(o => { if (o.pos.distanceTo(center) < rad) { const out = pick(['hit', 'hit', 'jump', 'block', 'dodge']); if (out === 'jump') { o.vel.y = 230; o.air = true; } resolve(a, o, ek, out, nm, pw); } }); }
let ghosts = [], logs = [], clones = [], giants = [], dragons = [];

// ═══ 기술 틀 ═══
const near = (a, b, d) => () => { const t = b.pos.clone().sub(dirTo(a, b).multiplyScalar(d)); return t; };
const approach = (a, b, d = 12, pose = 'run', extra = {}) => a.pos.distanceTo(b.pos) > d + 4 ? [step('run', [[a, { pose, to: near(a, b, d), face: b, ...extra }], [b, { pose: 'stance', face: a }]])] : [];
function proj(a, b, kind, mode, o = {}) {
  const from = o.from ? o.from() : handP(a), to = chest(b), dir = to.clone().sub(from).normalize();
  projs.push({ p: from.clone(), v: dir.multiplyScalar(o.v || 240), kind, mode, owner: a, target: b, size: o.size || 1, c: o.c || '#ffffff', ek: o.ek, nm: o.nm, done: false, rot: 0, homing: o.homing ?? .6 });
  if ((o.size || 1) >= 1.8) moses(V3(a.pos.x, 0, a.pos.z).addScaledVector(dirTo(a, b), 8), V3(b.pos.x, 0, b.pos.z), 9 + (o.size || 1) * 4, 2.8);
}
const DEFARC = { kick: [.9, -.9, 14], highKick: [1.2, -1.6, 16], slash: [-2.2, 1.0, 22], axe: [-1.6, 1.0, 16] };
const T = {
  dash: (a, b, nm, hand, ek, size = 1, ult, op = {}) => { const o = pick(OUTS); return [
    step(.22, [[a, { pose: 'seal', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, ult)),
    step(.3, [[a, { pose: op.hold || 'hold', hand, handSize: size, aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]]),
    ...approach(a, b, 8, op.run || 'hold', { hand, handSize: size, ghost: 1 }),
    step(.08, [[a, { pose: 'palm', fwd: 200, k: 95, hand, handSize: size, face: b }], [b, defSpec(o)]], () => { if (o === 'hit') dome(chest(b), 10 * size, ELEM[ek].c); resolve(a, b, ek, o, nm, 1.2 * size); }),
    step(.2, [[a, { pose: 'palm', face: b }], [b, { pose: o === 'hit' ? 'hurt' : 'guard', face: a }]])]; },
  melee: (a, b, nm, ek, op = {}) => { const o = op.out ? pick(op.out) : pick(OUTS), n = op.n || 1, st = [...approach(a, b, op.reach || 9)];
    st.push(step(.14, [[a, { pose: op.prep || 'punchPrep', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, op.ult)));
    for (let i = 0; i < n; i++) { const last = i === n - 1; st.push(step(R(.05, .09), [[a, { pose: op.prep || 'punchPrep', fwd: 40, elem: ek, face: b }], [b, { pose: 'block', face: a }]])); st.push(step(.08, [[a, { pose: (op.strike2 && i % 2) ? op.strike2 : (op.strike || 'punch'), fwd: 160, k: 92, elem: ek, face: b, spin: op.spin || 0 }], [b, last ? defSpec(o) : { pose: pick(['block', 'duck']), fwd: -40 }]], () => { const ac = op.arc || DEFARC[op.strike || 'punch'], cc = ELEM[ek] ? ELEM[ek].c : '#ffffff'; if (ac) arc(a, ...ac, cc, op.arcW || 5); else { streak(handP(a), fwdOf(a), 18, cc, .9); impact(handP(a).addScaledVector(fwdOf(a), 4), 3); } if (op.fx) op.fx(a, b); last ? resolve(a, b, ek, o, nm, op.pw || 1) : clash(a, b, '', false); })); }
    st.push(step(.18, [[a, { pose: 'guard', face: b }], [b, { pose: 'guard', face: a }]])); return st; },
  ranged: (a, b, nm, kind, ek, op = {}) => { const n = op.n || 1, mode = pick(op.modes || ['hit', 'jump', 'block', 'hit', 'sub']); return [
    step(op.wind || .22, [[a, { pose: op.prep || 'seal', aura: 1, elem: ek, face: b, hand: op.hand, handSize: op.handSize || 1 }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, op.ult)),
    step(.1 + n * .06, [[a, { pose: op.cast || 'throw', k: 85, face: b, elem: ek }], [b, { pose: 'stance', face: a }]], () => { for (let i = 0; i < n; i++) pending.push({ t: i * .06, fn: () => proj(a, b, kind, mode, { c: ELEM[ek].c, ek, size: (op.size || 1) * (n > 1 ? R(.8, 1.1) : 1), v: op.v || 240, nm, from: op.from ? () => op.from(a) : null }) }); }),
    step(() => Math.max(.06, a.pos.distanceTo(b.pos) / (op.v || 240) - .12), [[a, { pose: 'stance', face: b }], [b, { pose: 'stance', face: a }]]),
    step(.4, [[a, { pose: 'guard', face: b }], [b, mode === 'jump' ? { pose: 'air', vy: 240, side: pick([-1, 1]) * 80 } : mode === 'block' ? { pose: 'block', face: a } : { pose: 'stance', face: a }]])]; },
  sky: (a, b, nm, ek, op = {}) => { const o = pick(['hit', 'jump', 'dodge', 'sub', 'block']); return [
    step(.45, [[a, { pose: 'point', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, nm, op.ult); for (let i = 0; i < 3; i++) pending.push({ t: i * .1, fn: () => bolt(V3(R(-120, 120), 260, R(-120, 60)), V3(R(-120, 120), 120, R(-120, 60)), ELEM[ek].c, .8, 2) }); }),
    step(.12, [[a, { pose: 'point', elem: ek, face: b }], [b, o === 'hit' || o === 'block' ? { pose: 'block', face: a } : defSpec(o)]], () => { const p = b.pos.clone(); pending.push({ t: .1, fn: () => {
      for (let i = 0; i < 5; i++) bolt(p.clone().add(V3(R(-8, 8), 260, R(-8, 8))), p.clone().add(V3(0, 1, 0)), i ? ELEM[ek].c : '#ffffff', 1.3, 2.4);
      pillar(p, op.w || 22, ELEM[ek].c, 1.1); moses(p, p, 14, 2.4); ripple(p.x, p.z, 2); dome(p.clone().add(V3(0, 4, 0)), 26, ELEM[ek].c); explode(p.clone().add(V3(0, 6, 0)), ek, 2.2); shake = 12;
      if (o === 'hit') wound(b, a, nm, ek); else if (o === 'sub') substitute(b, a); else if (o === 'block') { shield(b, ELEM[ek].c); label(headP(b), '막기!', '#9fd8ff'); } else label(headP(b), '회피!', '#b0ffb0'); } }); }),
    step(.5, [[a, { pose: 'guard', face: b }], [b, { pose: o === 'jump' ? 'air' : 'guard' }]])]; },
  aoe: (a, b, nm, ek, op = {}) => [...approach(a, b, op.reach || 14),
    step(.18, [[a, { pose: op.prep || 'axe', aura: 1, elem: ek, face: b, vy: op.jump ? 260 : 0, spin: op.spin || 0, tilt: op.tilt || 0 }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, op.ult)),
    step(op.jump ? .35 : (op.spin ? .5 : .08), [[a, { pose: op.strike || 'duck', k: 92, vy: op.jump ? -320 : 0, face: b, spin: op.spin || 0, tilt: op.tilt && !op.jump ? op.tilt : 0 }], [b, { pose: 'stance', face: a }]], () => pending.push({ t: op.jump ? .3 : .02, fn: () => { const p = a.pos.clone(); for (let i = 0; i < 4; i++) ring(p.clone().add(V3(0, .4, 0)), 3 + i * 4, i % 2 ? ELEM[ek].c : '#ffffff', true); explode(p.clone().add(V3(0, 3, 0)), ek, op.pw || 1.6); aoeHit(a, p, op.rad || 40, ek, nm, op.pw || 1.4); } })),
    step(.3, [[a, { pose: 'land', face: b }], [b, { pose: 'guard', face: a }]])],
  buff: (a, b, nm, ek, op = {}) => [
    step(.55, [[a, { pose: op.pose || 'seal', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, nm, true); a.mode = op.dur || 6; a.modeK = op.key || null; a.modeElem = ek; dome(chest(a), 22, ELEM[ek].c); { const g = V3(a.pos.x, WATER_H, a.pos.z); pillar(g, 16, ELEM[ek].c, 1.5); pillar(g, 5, '#ffffff', 1.5); for (let i = 0; i < 4; i++) pending.push({ t: i * .12, fn: () => ring(g, 4, i % 2 ? '#ffffff' : ELEM[ek].c, true, 1.4, 2.6) }); moses(g, g, 14, 2.2); for (let i = 0; i < 80; i++) parts.push({ p: g.clone().add(V3(R(-6, 6), R(0, 30), R(-6, 6))), v: V3(R(-20, 20), R(80, 220), R(-20, 20)), life: 1.4, c: pick(ELEM[ek].parts), g: -20, s: 2 }); shake = Math.max(shake, 8); } if (op.giant) giants.push({ f: a, color: op.giant, life: op.dur || 5 }); }),
    step(.12, [[a, { pose: 'stance', face: b, elem: ek }], [b, { pose: 'stance', face: a }]])],
  at: (a, b, nm, ek, kind, op = {}) => { const o = pick(['hit', 'dodge', 'sub', 'hit', 'block']); return [
    step(.35, [[a, { pose: op.pose || 'stare', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, op.ult)),
    step(.3, [[a, { pose: op.pose || 'stare', elem: ek, face: b }], [b, defSpec(o)]], () => { const p = chest(b); if (kind === 'flames') { flames(b.pos, 1.6); for (let i = 0; i < 3; i++) pending.push({ t: i * .12, fn: () => { flames(b.pos.clone().add(V3(R(-10, 10), 0, R(-10, 10))), 1.1); ring(V3(b.pos.x, WATER_H + .3, b.pos.z), 4, '#3a0a4a', true, 1.2, 2.4); } }); pillar(b.pos, 9, '#5a10a0', 1.4); add({ k: 'spiral', p: p.clone(), c: '#9a4aff', life: 1.3 }); dome(p, 12, '#5a10a0'); light(p, '#9a4aff', 6); } if (kind === 'vortex') { vortex(p, ek, .9, 1.8); add({ k: 'spiral', p: p.clone(), c: ELEM[ek].c, life: 1.2 }); } if (kind === 'petals') { add({ k: 'spiral', p: p.clone(), c: '#ffb0d0', life: 1.2 }); for (let i = 0; i < 160; i++) pending.push({ t: i * .006, fn: () => parts.push({ p: a.pos.clone().add(V3(R(-30, 30), R(0, 40), R(-30, 30))), v: chest(b).sub(a.pos).normalize().multiplyScalar(R(120, 220)).add(V3(R(-40, 40), R(-40, 40), R(-40, 40))), life: 1, c: pick(ELEM.petal.parts), g: 0, s: 2 }) }); }
      if (kind === 'ice') { pillar(b.pos, 14, '#d8f6ff', 1.2); for (let i = 0; i < 10; i++) mark(p.clone().add(V3(R(-8, 8), R(-10, 10), R(-8, 8))), R(0, PI), R(6, 12), '#e8faff', .8, 1.6); }
      pending.push({ t: .35, fn: () => resolve(a, b, ek, o, nm, op.pw || 1.3) }); }),
    step(.3, [[a, { pose: 'guard', face: b }], [b, { pose: o === 'hit' ? 'hurt' : 'guard', face: a }]])]; },
  stretch: (a, b, nm, op = {}) => { const o = pick(OUTS), n = op.n || 1, st = []; st.push(step(.16, [[a, { pose: 'punchPrep', aura: 1, elem: op.ek || 'metal', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, op.ult)));
    for (let i = 0; i < n; i++) { const last = i === n - 1; st.push(step(n > 1 ? .05 : .1, [[a, { pose: 'stretch', k: 95, face: b, stretch: Math.min(4, a.pos.distanceTo(b.pos) / 14), giantArm: op.giant || 0 }], [b, last ? defSpec(o) : { pose: 'block', face: a }]], () => { if (n > 1) { ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading + R(-.1, .1), c: { ...a.c, arm: 1.57 + R(-.4, .4), fore: 1.57 + R(-.4, .4) }, life: 1, color: '#ffd0b0', dec: .14, stretch: a.stretch }); mark(chest(b).add(V3(R(-4, 4), R(-4, 4), R(-4, 4))), R(0, PI), 6, '#ffffff'); } if (last) resolve(a, b, op.ek || 'metal', o, nm, op.giant ? 2.4 : 1.2); })); st.push(step(n > 1 ? .04 : .12, [[a, { pose: 'punchPrep', face: b, stretch: 0 }], [b, { pose: 'block', face: a }]])); }
    st.push(step(.15, [[a, { pose: 'guard', face: b }], [b, { pose: 'guard', face: a }]])); return st; },
};
// 투사체 발사 지점 도우미
const fromHead = a => headP(a).add(fwdOf(a).multiplyScalar(4));
const fromHigh = a => headP(a).add(V3(0, 20, 0)).add(fwdOf(a).multiplyScalar(-6));

// ═══ 캐릭터별 기술 ═══
// 기술별 고유 자세
Object.assign(POSE, {
  twoHand: mkP({ arm: 1.35, fore: 1.45, barm: 1.35, bfore: 1.45, armX: -.28, leg: .7, lean: 4, bob: 4, twist: .1, spread: .14 }),
  mouthSeal: mkP({ arm: 1.0, fore: 3.0, barm: 1.1, bfore: 3.0, armX: -.32, lean: -3, bob: 1, twist: 0, spread: .12 }),
  blow: mkP({ arm: 1.1, fore: 2.9, barm: 1.2, bfore: 2.9, armX: -.32, lean: 6, bob: 3, twist: 0, spread: .18 }),
  armsWide: mkP({ arm: 1.6, fore: 1.8, barm: 1.6, bfore: 1.8, armX: 1.2, lean: -3, bob: 3, twist: 0, spread: .22 }),
  skyRaise: mkP({ arm: 3.0, fore: 3.1, barm: 3.0, bfore: 3.1, armX: .3, lean: -4, bob: 0, twist: 0, spread: .12 }),
  skySweep: mkP({ arm: .9, fore: .8, barm: .9, bfore: .8, armX: .2, lean: 6, bob: 5, twist: 0, spread: .2 }),
  crossArms: mkP({ arm: 1.0, fore: 2.6, barm: 1.0, bfore: 2.6, armX: -.65, lean: 0, bob: 2, twist: 0, spread: .1 }),
  openArms: mkP({ arm: 1.4, fore: 1.5, barm: 1.4, bfore: 1.5, armX: 1.3, lean: -4, bob: 1, twist: 0, spread: .2 }),
  archer: mkP({ arm: 1.3, fore: 4.2, barm: 1.57, bfore: 1.57, armX: .2, twist: -.75, lean: -1, bob: 2, leg: .75, spread: .2 }),
  eyeHand: mkP({ arm: 2.3, fore: 4.4, barm: .4, bfore: 1.6, armX: -.35, lean: 1, bob: 1, twist: -.25, spread: .1 }),
  hammerUp: mkP({ arm: 3.0, fore: 3.2, barm: 3.0, bfore: 3.2, armX: -.25, lean: -4, bob: -1, twist: 0, spread: .1 }),
  hammerDown: mkP({ arm: .6, fore: .5, barm: .6, bfore: .5, armX: -.25, lean: 8, bob: 8, twist: 0, spread: .24 }),
  windBack: mkP({ arm: -1.2, fore: -.6, barm: 1.2, bfore: 1.9, twist: -.95, lean: 1, bob: 4, leg: .85, spread: .2 }),
  punchL: mkP({ arm: .3, fore: 1.2, barm: 1.57, bfore: 1.57, twist: -.55, lean: 4, bob: 2, leg: .8, spread: .14 }),
  kneel: mkP({ arm: .6, fore: .9, barm: 1.2, bfore: 2.4, lean: 7, bob: 10, leg: 1.05, twist: -.2, spread: .3 }),
  thumbBite: mkP({ arm: 1.2, fore: 3.1, barm: .3, bfore: 1.4, lean: -1, bob: 1, twist: .2 }),
  laughBack: mkP({ arm: 2.4, fore: 2.9, barm: 2.4, bfore: 2.9, armX: .85, lean: -7, bob: 0, twist: 0, spread: .2 }),
  xSwords: mkP({ arm: 1.2, fore: 2.8, barm: 1.2, bfore: 2.8, armX: -.75, lean: 2, bob: 5, twist: 0, spread: .22 }),
  spreadSlash: mkP({ arm: 1.0, fore: .6, barm: 1.0, bfore: .6, armX: 1.35, lean: 5, bob: 5, twist: 0, spread: .24 }),
  iai: mkP({ arm: .2, fore: 1.0, barm: .5, bfore: 1.2, armX: -.45, twist: -.85, lean: 6, bob: 9, leg: 1.0, spread: .28 }),
  iaiEnd: mkP({ arm: 1.9, fore: 1.7, barm: -.6, bfore: .3, twist: .85, lean: 7, bob: 6, leg: 1.0, spread: .26 }),
  spinKick: mkP({ arm: 1.8, fore: 2.2, barm: 1.8, bfore: 2.2, armX: 1.0, kick: 1.6, lean: -4, bob: 0, twist: 0 }),
  handstand: mkP({ arm: 3.05, fore: 3.1, barm: 3.05, bfore: 3.1, armX: .35, kick: 2.2, leg: 1.2, lean: 0, bob: 0, twist: 0, spread: .5 }),
  twoHandSword: mkP({ arm: 2.9, fore: 3.3, barm: 2.8, bfore: 3.2, armX: -.32, lean: -3, bob: 2, twist: 0, spread: .16 }),
  swordDown: mkP({ arm: .9, fore: .7, barm: .9, bfore: .7, armX: -.32, lean: 7, bob: 6, twist: 0, spread: .22 }),
  swordLevel: mkP({ arm: 1.57, fore: 1.57, barm: 1.3, bfore: 1.9, armX: -.4, twist: .35, lean: 1, bob: 3, spread: .2 }),
  maskPull: mkP({ arm: 2.4, fore: 4.6, barm: .3, bfore: 1.4, lean: 3, bob: 3, twist: -.1 }),
  openPalm: mkP({ arm: 1.5, fore: 2.0, barm: .2, bfore: 1.4, lean: 1, bob: 2, twist: .3 }),
  fingerPoint: mkP({ arm: 1.57, fore: 1.6, barm: .2, bfore: 1.4, twist: .45, lean: 2, bob: 2 }),
  seriousWind: mkP({ arm: -1.0, fore: -.2, barm: 1.4, bfore: 2.4, twist: -1.05, lean: 3, bob: 8, leg: 1.05, spread: .3 }),
  seriousPunch: mkP({ arm: 1.6, fore: 1.6, barm: -.9, bfore: .6, twist: .95, lean: 8, bob: 7, leg: 1.05, spread: .3 }),
  braced: mkP({ arm: 1.5, fore: 1.6, barm: 1.5, bfore: 1.6, armX: -.15, leg: 1.1, lean: 3, bob: 7, spread: .38, twist: 0 }),
  crouchRun: mkP({ arm: -.9, fore: -1.0, barm: 1.1, bfore: 2.0, lean: 7, bob: 6, twist: -.2 }),
  flipAir: mkP({ arm: 2.2, fore: 2.6, barm: 2.2, bfore: 2.6, armX: .5, leg: 1.3, kick: 1.3, lean: 4, bob: 0 }),
});
POSE.throwPrep = { ...POSE.slashPrep }; POSE.throw = { ...POSE.slash };
Object.keys(POSE).forEach(k => { const p = POSE[k]; if (p.twist === undefined) p.twist = 0; if (p.spread === undefined) p.spread = .1; if (p.armX === undefined) p.armX = .15; });
// 한 동작 묶음 도우미: 자세 목록을 차례로 (각 [자세, 시간, 추가 지시])
const seq = (a, b, list, bSpec = { pose: 'stance' }) => list.map(([pose, d, ex = {}, fx2]) => step(d, [[a, { pose, face: b, k: 60, ...ex }], [b, { face: a, ...bSpec }]], fx2));

defChar('naruto', '나루토', 'naruto', {
  '나선환': (a, b) => [...seq(a, b, [['seal', .18], ['twoHand', .32, { hand: 'rasen', aura: 1, elem: 'wind' }]], { pose: 'stance' }), ...T.dash(a, b, '나선환', 'rasen', 'wind', 1, false, { run: 'crouchRun' })],
  '거대 나선환': (a, b) => [...seq(a, b, [['armsWide', .25, { aura: 1, elem: 'wind' }], ['skyRaise', .4, { hand: 'rasen', handSize: 2.2, aura: 1, elem: 'wind' }]]), ...T.dash(a, b, '초대옥나선환', 'rasen', 'wind', 2.2, true, { run: 'crouchRun' })],
  '나선수리검': (a, b) => [...seq(a, b, [['skyRaise', .35, { hand: 'rasen', handSize: 1.4, aura: 1, elem: 'wind' }]]), ...T.ranged(a, b, '풍둔 나선수리검', 'rasenshuriken', 'wind', { size: 1.6, v: 200, hand: 'rasen', handSize: 1.4, prep: 'throwPrep' })],
  '그림자 분신술': (a, b) => [step(.25, [[a, { pose: 'crossArms', aura: 1, face: b, k: 70 }], [b, { pose: 'stance', face: a }]], () => { callout(a, '그림자 분신술'); for (let i = 0; i < 4; i++) pending.push({ t: i * .06, fn: () => spawnClone(a, b) }); }), step(.9, [[a, { pose: 'stance', aura: 1, face: b }], [b, { pose: 'block', face: a }]])],
  '구미 차크라 모드': (a, b) => [...seq(a, b, [['kneel', .25, { aura: 1, elem: 'kurama' }]]), ...T.buff(a, b, '구미 차크라 모드', 'kurama', { key: 'kurama', giant: '#ff7a1a', dur: 6, pose: 'openArms' })],
  '미수옥': (a, b) => [...seq(a, b, [['armsWide', .35, { aura: 1, elem: 'kurama' }], ['twoHand', .3, { aura: 1, elem: 'kurama' }]]), ...T.ranged(a, b, '미수옥', 'bijuu', 'kurama', { size: 2.6, v: 150, wind: .3, from: fromHigh, prep: 'skyRaise', cast: 'palm', ult: true })],
}, { name: '나선환', hand: 'rasen', elem: 'wind', kind: 'rasenshuriken' });
defChar('sasuke', '사스케', 'naruto', {
  '치도리': (a, b) => [...seq(a, b, [['seal', .14], ['crouchRun', .3, { hand: 'chidori', aura: 1, elem: 'bolt' }]]), ...T.dash(a, b, '치도리', 'chidori', 'bolt', 1, false, { run: 'crouchRun', hold: 'crouchRun' })],
  '호화구의 술': (a, b) => [...seq(a, b, [['seal', .14], ['mouthSeal', .3, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '화둔 호화구의 술', 'fireball', 'fire', { size: 2.2, v: 170, from: fromHead, prep: 'mouthSeal', cast: 'blow' })],
  '천조': (a, b) => T.at(a, b, '천조 아마테라스', 'dark', 'flames', { pose: 'eyeHand' }),
  '기린': (a, b) => [...seq(a, b, [['skyRaise', .3, { aura: 1, elem: 'bolt' }]]), ...kirin(a, b)],
  '수사노오': (a, b) => [...seq(a, b, [['crossArms', .3, { aura: 1, elem: 'dark' }]]), ...T.buff(a, b, '완성체 수사노오', 'dark', { giant: '#9a4aff', dur: 5, pose: 'openArms' }), ...T.melee(a, b, '수사노오 참격', 'dark', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.5, 1.2, 60], arcW: 14, pw: 2, ult: true })],
  '인드라의 화살': (a, b) => [...seq(a, b, [['eyeHand', .25, { aura: 1, elem: 'bolt' }], ['archer', .55, { aura: 1, elem: 'bolt' }]]), ...T.ranged(a, b, '인드라의 화살', 'arrow', 'bolt', { size: 2.4, v: 330, wind: .15, from: fromHigh, prep: 'archer', cast: 'openPalm', ult: true })],
}, { name: '치도리', hand: 'chidori', elem: 'bolt', kind: 'senbon' });
defChar('kakashi', '카카시', 'naruto', {
  '라이키리': (a, b) => [...seq(a, b, [['eyeHand', .15, { aura: 1 }], ['crouchRun', .3, { hand: 'chidori', aura: 1, elem: 'bolt' }]]), ...T.dash(a, b, '라이키리', 'chidori', 'bolt', 1, false, { run: 'crouchRun', hold: 'crouchRun' })],
  '카무이': (a, b) => [...seq(a, b, [['eyeHand', .3, { aura: 1, elem: 'dark' }]]), ...T.at(a, b, '카무이', 'dark', 'vortex', { pose: 'eyeHand' })],
  '수룡탄의 술': (a, b) => [...seq(a, b, [['seal', .2], ['crossArms', .2], ['skyRaise', .25, { aura: 1, elem: 'water' }]]), ...T.ranged(a, b, '수둔 수룡탄의 술', 'orb', 'water', { n: 10, size: 1.2, v: 230, prep: 'skyRaise', cast: 'skySweep' })],
}, { name: '라이키리', hand: 'chidori', elem: 'bolt', kind: 'orb' });
defChar('sakura', '사쿠라', 'naruto', {
  '괴력 주먹': (a, b) => T.aoe(a, b, '괴력 주먹', 'earth', { prep: 'hammerUp', strike: 'hammerDown', rad: 34 }),
  '앵화충': (a, b) => T.aoe(a, b, '앵화충', 'earth', { jump: true, rad: 44, pw: 2, ult: true, prep: 'flipAir', strike: 'hammerDown', tilt: -.6 }),
  '연타': (a, b) => T.melee(a, b, '연타', 'earth', { n: 6, strike: 'punch', strike2: 'punchL' }),
}, { name: '괴력 주먹', hand: null, elem: 'earth', kind: 'orb' });
defChar('luffy', '루피', 'onepiece', {
  '고무고무 총': (a, b) => [...seq(a, b, [['windBack', .3, { aura: 1 }]]), ...T.stretch(a, b, '고무고무 총')],
  '고무고무 개틀링': (a, b) => [...seq(a, b, [['windBack', .2, { aura: 1 }]]), ...T.stretch(a, b, '고무고무 개틀링', { n: 12, alt: true })],
  '기어 세컨드': (a, b) => [...seq(a, b, [['kneel', .35, { aura: 1, elem: 'steam' }]]), ...T.buff(a, b, '기어 세컨드', 'steam', { key: 'gear2', dur: 6, pose: 'kneel' })],
  '거인의 총': (a, b) => [...seq(a, b, [['thumbBite', .35, { aura: 1 }], ['windBack', .35, { giantArm: .6, aura: 1 }]]), ...T.stretch(a, b, '기어 서드: 거인의 총', { giant: 1, ult: true })],
  '기어 5': (a, b) => [...seq(a, b, [['laughBack', .35, { aura: 1, elem: 'power' }]]), ...T.buff(a, b, '기어 5', 'power', { key: 'gear5', giant: '#ffffff', dur: 6, pose: 'laughBack' })],
}, { name: '고무고무 총', hand: null, elem: 'power', kind: 'orb' });
defChar('zoro', '조로', 'onepiece', {
  '삼도류 귀참': (a, b) => [...seq(a, b, [['xSwords', .3, { aura: 1, elem: 'slash' }]]), ...T.melee(a, b, '삼도류 귀참', 'slash', { prep: 'xSwords', strike: 'spreadSlash', arc: [-2.2, 1.0, 22], arcW: 6, reach: 10 })],
  '360 파운드 포': (a, b) => [...seq(a, b, [['windBack', .3, { aura: 1, elem: 'slash' }]]), ...T.ranged(a, b, '360 파운드 포', 'getsuga', 'slash', { n: 2, size: 1.2, v: 260, prep: 'windBack', cast: 'spreadSlash' })],
  '아수라 구도류': (a, b) => [...seq(a, b, [['xSwords', .3, { aura: 1, elem: 'slash' }]]), ...T.buff(a, b, '구도류 아수라', 'slash', { giant: '#a0f0b0', dur: 4, pose: 'armsWide' }), ...T.melee(a, b, '아수라 망령 참', 'slash', { prep: 'xSwords', strike: 'spreadSlash', arc: [-2.5, 1.2, 50], arcW: 12, n: 3, pw: 1.8, ult: true })],
  '사자 노래': (a, b) => T.melee(a, b, '일도류 사자 노래', 'slash', { prep: 'iai', strike: 'iaiEnd', arc: [-.4, .4, 30], reach: 4 }),
}, { name: '귀참', hand: null, elem: 'slash', kind: 'getsuga' });
defChar('sanji', '상디', 'onepiece', {
  '디아블 잠브': (a, b) => [...seq(a, b, [['spinKick', .45, { spin: 22, aura: 1, elem: 'fire' }]]), ...T.melee(a, b, '디아블 잠브', 'fire', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 5, arc: [1.2, -1.6, 18], arcW: 5 })],
  '파티 테이블 킥': (a, b) => T.aoe(a, b, '파티 테이블 킥 코스', 'fire', { prep: 'handstand', strike: 'handstand', rad: 32, tilt: PI, spin: 26 }),
  '하늘 걷기': (a, b) => T.aoe(a, b, '하늘 걷기 · 내려차기', 'fire', { jump: true, rad: 30, prep: 'flipAir', strike: 'axe', tilt: -.8 }),
}, { name: '디아블 잠브', hand: null, elem: 'fire', kind: 'fireball' });
defChar('ichigo', '이치고', 'bleach', {
  '월아천충': (a, b) => [...seq(a, b, [['twoHandSword', .3, { aura: 1, elem: 'getsuga' }]]), ...T.ranged(a, b, '월아천충', 'getsuga', 'getsuga', { size: 1.8, v: 260, prep: 'twoHandSword', cast: 'swordDown' })],
  '반카이': (a, b) => [...seq(a, b, [['swordLevel', .45, { aura: 1, elem: 'dark' }]]), ...T.buff(a, b, '반카이 · 천쇄참월', 'dark', { key: 'bankai', dur: 7, pose: 'swordLevel' })],
  '흑 월아천충': (a, b) => [...seq(a, b, [['swordLevel', .25, { aura: 1, elem: 'hollow' }], ['twoHandSword', .35, { aura: 1, elem: 'hollow' }]]), ...T.ranged(a, b, '흑 월아천충', 'getsuga', 'hollow', { size: 2.8, v: 240, prep: 'twoHandSword', cast: 'swordDown', wind: .2, ult: true })],
  '허화': (a, b) => [...seq(a, b, [['maskPull', .45, { aura: 1, elem: 'hollow' }]]), ...T.buff(a, b, '허화', 'hollow', { key: 'hollow', dur: 6, pose: 'maskPull' }), ...T.melee(a, b, '허화 참격', 'hollow', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.4, 1.1, 30], arcW: 8, pw: 1.6 })],
  '순보 베기': (a, b) => T.melee(a, b, '순보 베기', 'getsuga', { prep: 'iai', strike: 'iaiEnd', arc: [-2, .8, 20], reach: 4 }),
}, { name: '월아천충', hand: null, elem: 'getsuga', kind: 'getsuga' });
defChar('byakuya', '뱌쿠야', 'bleach', {
  '센본자쿠라 카게요시': (a, b) => [...seq(a, b, [['swordDown', .3, { aura: 1, elem: 'petal' }], ['openPalm', .3, { aura: 1, elem: 'petal' }]]), ...T.at(a, b, '센본자쿠라 카게요시', 'petal', 'petals', { pose: 'openPalm', pw: 1.8, ult: true })],
  '백뢰': (a, b) => { const o = pick(['hit', 'dodge', 'block', 'hit']); return [step(.22, [[a, { pose: 'fingerPoint', aura: 1, elem: 'bolt', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '파도 4 · 백뢰')), step(.35, [[a, { pose: 'fingerPoint', k: 90, face: b, elem: 'bolt' }], [b, defSpec(o)]], () => { add({ k: 'beam', f: a, t: b, r: 1.4, c: '#9fc8ff', c2: '#ffffff', ek: 'bolt', life: .55 }); pending.push({ t: .12, fn: () => resolve(a, b, 'bolt', o, '백뢰!', 1.2) }); }), step(.2, [[a, { pose: 'guard', face: b }], [b, { pose: 'guard', face: a }]])]; },
  '순보': (a, b) => T.melee(a, b, '순보', 'petal', { prep: 'iai', strike: 'iaiEnd', arc: [-1.6, .9, 18], reach: 4 }),
}, { name: '센본자쿠라', hand: null, elem: 'petal', kind: 'senbon' });
defChar('rukia', '루키아', 'bleach', {
  '첫 번째 춤 · 월백': (a, b) => [...seq(a, b, [['slashPrep', .4, { spin: 14, aura: 1, elem: 'ice' }]]), ...T.at(a, b, '소데노시라유키 · 첫 번째 춤 월백', 'ice', 'ice', { pose: 'swordDown' })],
  '세 번째 춤 · 백도': (a, b) => [...seq(a, b, [['swordLevel', .3, { aura: 1, elem: 'ice' }]]), ...T.ranged(a, b, '세 번째 춤 · 백도', 'orb', 'ice', { n: 4, size: 1, v: 300, prep: 'swordLevel', cast: 'fingerPoint' })],
}, { name: '소데노시라유키', hand: null, elem: 'ice', kind: 'getsuga' });
defChar('saitama', '사이타마', 'opm', {
  '연속 보통 펀치': (a, b) => T.melee(a, b, '연속 보통 펀치', 'power', { n: 10, strike: 'punch', strike2: 'punchL', fx: (a2) => ghosts.push({ ch: a2.ch, pos: a2.pos.clone(), heading: a2.heading, c: { ...a2.c, arm: 1.57 + R(-.5, .5) }, life: 1, color: '#ffffff', dec: .14 }) }),
  '진지한 펀치': (a, b) => seriousPunch(a, b),
  '보통 펀치': (a, b) => T.melee(a, b, '보통 펀치', 'power', { out: ['hit'], pw: 2.4, prep: 'windBack', strike: 'seriousPunch' }),
  '진지한 옆뛰기': (a, b) => [step(.2, [[a, { pose: 'stance', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '진지한 옆뛰기')), step(.6, [[a, { pose: 'crouchRun', side: 260, ghost: 1, face: b }], [b, { pose: 'block', face: a }]]), step(.6, [[a, { pose: 'crouchRun', side: -260, ghost: 1, face: b }], [b, { pose: 'block', face: a }]])],
}, { name: '보통 펀치', hand: null, elem: 'power', kind: 'orb' });
defChar('genos', '제노스', 'opm', {
  '소각': (a, b) => [step(.35, [[a, { pose: 'braced', aura: 1, elem: 'fire', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '소각', true); }), step(1.1, [[a, { pose: 'braced', face: b, elem: 'fire', fwd: -25 }], [b, { pose: 'block', face: a }]], () => {
    emitters.push({ k: 'stream', f: a, t: b, life: 1.1, wide: true }); add({ k: 'beam', f: a, t: b, r: 5.5, c: '#ff5a10', c2: '#ffd040', ek: 'fire', life: 1.3 }); shot('ult', 2.4, a, b);
    const d = fwdOf(a), p = chest(a).add(d.clone().multiplyScalar(4)); moses(V3(a.pos.x, 0, a.pos.z).addScaledVector(d, 8), V3(a.pos.x, 0, a.pos.z).addScaledVector(d, 110), 16, 2.6); for (let i = 0; i < 4; i++) add({ k: 'cone', p: p.clone(), dir: d.clone(), len: 50 + i * 25, r: 10 + i * 9, life: 1.4 - i * .15, c: i % 2 ? '#ffd040' : '#ff6a10' });
    for (let i = 0; i < 8; i++) pending.push({ t: i * .1, fn: () => { const g = a.pos.clone().add(d.clone().multiplyScalar(20 + i * 12)); flames(g, 1.2, true); ring(V3(g.x, .4, g.z), 4, '#ff8a20', true, 1, 2); light(g.clone().add(V3(0, 6, 0)), '#ff8a20', 6); } });
    pending.push({ t: .7, fn: () => { ultBlast(a.pos.clone().add(d.clone().multiplyScalar(50)).add(V3(0, 8, 0)), 'fire', 70, a, '소각!'); } }); })],
  '마신 강풍 펀치': (a, b) => T.melee(a, b, '마신 강풍 펀치', 'fire', { n: 8, strike: 'punch', strike2: 'punchL', prep: 'braced' }),
  '초고열 폭발': (a, b) => [...seq(a, b, [['braced', .35, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '초고열 폭발', 'fireball', 'fire', { size: 2, v: 200, prep: 'twoHand', cast: 'twoHand' })],
}, { name: '소각', hand: null, elem: 'fire', kind: 'fireball' });
// ═══ 추가 캐릭터 (세계관마다 3명) ═══
defChar('gaara', '가아라', 'naruto', {
  '사막 장송': (a, b) => [...seq(a, b, [['openPalm', .3, { aura: 1, elem: 'sand' }]]), ...T.at(a, b, '사박궤 · 사막 장송', 'sand', 'vortex', { pose: 'openPalm', pw: 1.6 })],
  '모래 수리검': (a, b) => [...seq(a, b, [['crossArms', .25, { aura: 1, elem: 'sand' }]]), ...T.ranged(a, b, '모래 수리검', 'orb', 'sand', { n: 8, size: 1, v: 280, prep: 'crossArms', cast: 'skySweep' })],
  '사박 대장': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'sand' }]]), ...T.aoe(a, b, '유사 폭류 · 사박 대장', 'sand', { prep: 'skyRaise', strike: 'hammerDown', rad: 52, pw: 2, ult: true })],
}, { name: '모래 수리검', hand: null, elem: 'sand', kind: 'orb' });
defChar('itachi', '이타치', 'naruto', {
  '아마테라스': (a, b) => T.at(a, b, '아마테라스', 'dark', 'flames', { pose: 'eyeHand', pw: 1.5 }),
  '호화구': (a, b) => [...seq(a, b, [['seal', .14], ['mouthSeal', .25, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '화둔 호화구의 술', 'fireball', 'fire', { size: 2, v: 180, from: fromHead, prep: 'mouthSeal', cast: 'blow' })],
  '츠쿠요미': (a, b) => [...seq(a, b, [['eyeHand', .35, { aura: 1, elem: 'hollow' }]]), ...T.at(a, b, '월독 · 츠쿠요미', 'hollow', 'vortex', { pose: 'stare', pw: 1.4 })],
  '토츠카의 검': (a, b) => [...seq(a, b, [['crossArms', .3, { aura: 1, elem: 'hollow' }]]), ...T.buff(a, b, '수사노오 · 토츠카의 검', 'hollow', { giant: '#ff4a3a', dur: 5, pose: 'openArms' }), ...T.melee(a, b, '토츠카 봉인 참', 'hollow', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.5, 1.2, 60], arcW: 14, pw: 2, ult: true })],
}, { name: '수리검', hand: null, elem: 'fire', kind: 'senbon' });
defChar('gai', '마이트 가이', 'naruto', {
  '나뭇잎 선풍': (a, b) => [...seq(a, b, [['spinKick', .3, { spin: 20, aura: 1, elem: 'wind' }]]), ...T.melee(a, b, '나뭇잎 선풍', 'wind', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 4, arc: [1.2, -1.6, 22], arcW: 6 })],
  '아침 공작': (a, b) => [...seq(a, b, [['braced', .35, { aura: 1, elem: 'kurama' }]]), ...T.melee(a, b, '아침 공작', 'fire', { n: 12, strike: 'punch', strike2: 'punchL', pw: 1.4, fx: (a2) => { const p = chest(a2).add(fwdOf(a2).multiplyScalar(8)); burst(p, 10, ELEM.fire.parts, 1.6); ring(p, 2, '#ff8a20', false, .5, 2); } })],
  '밤가이': (a, b) => [...seq(a, b, [['kneel', .3, { aura: 1, elem: 'kurama' }], ['flipAir', .3, { aura: 1, elem: 'kurama' }]]), ...T.buff(a, b, '팔문둔갑 · 사문', 'kurama', { giant: '#ff3a1a', dur: 4, pose: 'braced' }), ...T.dash(a, b, '밤가이', null, 'kurama', 2.4, true, { run: 'crouchRun' })],
}, { name: '나뭇잎 선풍', hand: null, elem: 'wind', kind: 'orb' });
defChar('ace', '에이스', 'onepiece', {
  '화권': (a, b) => [...seq(a, b, [['windBack', .3, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '화권', 'fireball', 'fire', { size: 2.3, v: 230, prep: 'windBack', cast: 'punch' })],
  '반딧불 화': (a, b) => [...seq(a, b, [['armsWide', .3, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '반딧불 화', 'orb', 'fire', { n: 12, size: .9, v: 260, prep: 'armsWide', cast: 'skySweep' })],
  '염제': (a, b) => [...seq(a, b, [['skyRaise', .45, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '대염계 · 염제', 'fireball', 'fire', { size: 3.2, v: 150, from: fromHigh, prep: 'skyRaise', cast: 'twoHand', wind: .3, ult: true })],
}, { name: '화권', hand: null, elem: 'fire', kind: 'fireball' });
defChar('kizaru', '키자루', 'onepiece', {
  '팔척경옥': (a, b) => [...seq(a, b, [['openPalm', .3, { aura: 1, elem: 'light' }]]), ...T.ranged(a, b, '팔척경옥', 'orb', 'light', { n: 14, size: 1, v: 380, prep: 'openPalm', cast: 'openPalm' })],
  '광속 발차기': (a, b) => [...seq(a, b, [['kickPrep', .2, { aura: 1, elem: 'light' }]]), ...T.melee(a, b, '광속 발차기', 'light', { prep: 'kickPrep', strike: 'highKick', arc: [1.2, -1.6, 24], arcW: 8, pw: 1.8, reach: 6 })],
  '천총운검': (a, b) => [...seq(a, b, [['swordLevel', .3, { aura: 1, elem: 'light' }]]), ...T.melee(a, b, '천총운검', 'light', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.2, 1.0, 34], arcW: 10, pw: 1.6, ult: true })],
}, { name: '팔척경옥', hand: null, elem: 'light', kind: 'orb' });
defChar('law', '트라팔가 로', 'onepiece', {
  '룸': (a, b) => [...seq(a, b, [['openPalm', .35, { aura: 1, elem: 'room' }]]), ...T.at(a, b, '룸 · 슬래시', 'room', 'vortex', { pose: 'openPalm', pw: 1.4 })],
  '감마나이프': (a, b) => [...seq(a, b, [['iai', .3, { aura: 1, elem: 'room' }]]), ...T.melee(a, b, '감마나이프', 'room', { prep: 'iai', strike: 'iaiEnd', arc: [-.4, .4, 30], arcW: 8, pw: 1.8, reach: 4, ult: true })],
  '샴블즈': (a, b) => [step(.25, [[a, { pose: 'fingerPoint', aura: 1, elem: 'room', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '샴블즈'); dome(chest(a), 18, ELEM.room.c); }), step(.3, [[a, { pose: 'iaiEnd', to: () => b.pos.clone().add(dirTo(a, b).multiplyScalar(14)), ghost: 1, face: b }], [b, { pose: 'hurt', face: a }]], () => { burst(chest(a), 20, ELEM.room.parts, 1.6); resolve(a, b, 'room', pick(['hit', 'block', 'dodge']), '샴블즈!', 1.2); })],
}, { name: '룸', hand: null, elem: 'room', kind: 'getsuga' });
defChar('hitsugaya', '히츠가야', 'bleach', {
  '빙륜환': (a, b) => [...seq(a, b, [['twoHandSword', .3, { aura: 1, elem: 'ice' }]]), ...T.ranged(a, b, '빙륜환 · 용선회', 'getsuga', 'ice', { size: 2, v: 250, prep: 'twoHandSword', cast: 'swordDown' })],
  '천상옥좌': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'ice' }]]), ...T.sky(a, b, '천상옥좌', 'ice', { ult: true })],
  '대홍련 빙륜환': (a, b) => [...seq(a, b, [['swordLevel', .4, { aura: 1, elem: 'ice' }]]), ...T.buff(a, b, '반카이 · 대홍련 빙륜환', 'ice', { giant: '#bfefff', dur: 5, pose: 'openArms' }), ...T.at(a, b, '천상 빙결', 'ice', 'ice', { pose: 'swordDown', pw: 1.8, ult: true })],
}, { name: '빙륜환', hand: null, elem: 'ice', kind: 'getsuga' });
defChar('kenpachi', '켄파치', 'bleach', {
  '검팔 일격': (a, b) => [...seq(a, b, [['twoHandSword', .45, { aura: 1, elem: 'power' }]]), ...T.melee(a, b, '검도 · 일격', 'power', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.5, 1.2, 44], arcW: 14, pw: 2.4, ult: true })],
  '영압 해방': (a, b) => [...seq(a, b, [['laughBack', .4, { aura: 1, elem: 'power' }]]), ...T.buff(a, b, '안대 해제 · 영압 해방', 'power', { giant: '#ffe040', dur: 5, pose: 'laughBack' })],
  '난도질': (a, b) => T.melee(a, b, '난도질', 'slash', { n: 6, prep: 'slashPrep', strike: 'spreadSlash', strike2: 'swordDown', arc: [-2.2, 1.0, 22], arcW: 6 }),
}, { name: '일격', hand: null, elem: 'power', kind: 'getsuga' });
defChar('aizen', '아이젠', 'bleach', {
  '흑관': (a, b) => [...seq(a, b, [['openPalm', .4, { aura: 1, elem: 'dark' }]]), ...T.at(a, b, '파도 90 · 흑관', 'dark', 'vortex', { pose: 'openPalm', pw: 2, ult: true })],
  '경화수월': (a, b) => [step(.3, [[a, { pose: 'swordLevel', aura: 1, elem: 'petal', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '경화수월'); for (let i = 0; i < 5; i++) ghosts.push({ ch: a.ch, pos: a.pos.clone().add(V3(R(-30, 30), 0, R(-30, 30))), heading: a.heading, c: { ...a.c }, life: 1.4, color: '#c8a0ff', dec: .5 }); }), ...T.melee(a, b, '경화수월 · 뒤베기', 'dark', { prep: 'iai', strike: 'iaiEnd', arc: [-2, .8, 24], reach: 4, pw: 1.6 })],
  '백뢰': (a, b) => { const o = pick(['hit', 'dodge', 'block', 'hit']); return [step(.22, [[a, { pose: 'fingerPoint', aura: 1, elem: 'bolt', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '파도 4 · 백뢰')), step(.35, [[a, { pose: 'fingerPoint', k: 90, face: b, elem: 'bolt' }], [b, defSpec(o)]], () => { add({ k: 'beam', f: a, t: b, r: 1.6, c: '#c8a0ff', c2: '#ffffff', ek: 'bolt', life: .55 }); pending.push({ t: .12, fn: () => resolve(a, b, 'bolt', o, '백뢰!', 1.2) }); }), step(.2, [[a, { pose: 'guard', face: b }], [b, { pose: 'guard', face: a }]])]; },
}, { name: '백뢰', hand: null, elem: 'dark', kind: 'orb' });
defChar('tatsumaki', '타츠마키', 'opm', {
  '염동 폭풍': (a, b) => [...seq(a, b, [['openArms', .35, { aura: 1, elem: 'psychic' }]]), ...T.at(a, b, '염동 폭풍', 'psychic', 'vortex', { pose: 'openArms', pw: 1.6 })],
  '바위 던지기': (a, b) => [...seq(a, b, [['skyRaise', .35, { aura: 1, elem: 'psychic' }]]), ...T.ranged(a, b, '초능력 · 바위 던지기', 'bijuu', 'earth', { size: 2.2, v: 190, from: fromHigh, prep: 'skyRaise', cast: 'fingerPoint' })],
  '초능력 대압살': (a, b) => [...seq(a, b, [['armsWide', .4, { aura: 1, elem: 'psychic' }]]), ...T.aoe(a, b, '초능력 대압살', 'psychic', { prep: 'skyRaise', strike: 'openPalm', rad: 60, pw: 2.2, ult: true })],
}, { name: '염동력', hand: null, elem: 'psychic', kind: 'orb' });
defChar('bang', '실버팽', 'opm', {
  '유수암쇄권': (a, b) => [...seq(a, b, [['openPalm', .35, { aura: 1, elem: 'water' }]]), ...T.melee(a, b, '유수암쇄권', 'water', { n: 10, strike: 'palm', strike2: 'openPalm', pw: 1.2 })],
  '흐르는 물 받아치기': (a, b) => T.melee(a, b, '흐르는 물 받아치기', 'water', { out: ['block', 'hit'], prep: 'guard', strike: 'palm', pw: 1.6, arc: [-1.6, 1, 20] }),
  '나선 유수권': (a, b) => [...seq(a, b, [['braced', .35, { aura: 1, elem: 'water' }]]), ...T.aoe(a, b, '나선 유수권', 'water', { prep: 'braced', strike: 'palm', rad: 40, pw: 1.8, spin: 18, ult: true })],
}, { name: '유수암쇄권', hand: null, elem: 'water', kind: 'orb' });
defChar('garou', '가로우', 'opm', {
  '유수암쇄권 · 가로우류': (a, b) => [...seq(a, b, [['crouchRun', .25, { aura: 1, elem: 'dark' }]]), ...T.melee(a, b, '가로우류 유수암쇄권', 'dark', { n: 8, strike: 'palm', strike2: 'highKick', pw: 1.3 })],
  '괴인화': (a, b) => [...seq(a, b, [['laughBack', .4, { aura: 1, elem: 'hollow' }]]), ...T.buff(a, b, '괴인화', 'hollow', { key: 'monster', giant: '#ff3a5a', dur: 6, pose: 'laughBack' })],
  '감마선 반사': (a, b) => [...seq(a, b, [['twoHand', .35, { aura: 1, elem: 'light' }]]), ...T.ranged(a, b, '감마선 반사', 'arrow', 'light', { size: 2.2, v: 340, prep: 'twoHand', cast: 'openPalm', ult: true })],
}, { name: '괴인 유수암쇄권', hand: null, elem: 'dark', kind: 'orb' });
// ═══ 귀멸의 칼날 (주요 4명 + 기둥 9명) ═══
const withFx = (fn, fx2) => (a, b) => { const st = fn(a, b); const s0 = st[0], old = s0.fx; s0.fx = () => { if (old) old(); fx2(a, b); }; return st; };
const dragonFx = (a, b, c) => { const p = chest(a); for (let i = 0; i < 6; i++) pending.push({ t: i * .08, fn: () => { add({ k: 'spiral', p: chest(a), c, life: 1 }); ring(chest(a), 3 + i, i % 2 ? '#ffffff' : c, false, .9, 2.4); for (let j = 0; j < 14; j++) { const an = j / 14 * PI * 2 + i; parts.push({ p: chest(a).add(V3(Math.cos(an) * 10, Math.sin(an * 2) * 4, Math.sin(an) * 10)), v: V3(-Math.sin(an) * 70, R(10, 40), Math.cos(an) * 70), life: .9, c: pick(ELEM.water.parts), g: 40, s: 2 }); } } }); moses(a.pos, b.pos, 12, 2); };
const KM = (pre, nm, ek, op = {}) => (a, b) => [...seq(a, b, [[pre, .28, { aura: 1, elem: ek }]]), ...T.melee(a, b, nm, ek, { prep: pre, strike: 'swordDown', arc: [-2.2, 1.0, 26], arcW: 7, ...op })];
defChar('tanjiro', '탄지로', 'kimetsu', {
  '물의 호흡 · 수면 베기': KM('swordLevel', '물의 호흡 제1형 · 수면 베기', 'water', { strike: 'spreadSlash', arc: [-1.8, 1.8, 30] }),
  '물의 호흡 · 유류무': KM('iai', '물의 호흡 제8형 · 용소', 'water', { n: 4, strike: 'iaiEnd', strike2: 'swordDown', arc: [-2.4, 1.2, 24] }),
  '생생유전': withFx((a, b) => [...seq(a, b, [['spinKick', .35, { spin: 16, aura: 1, elem: 'water' }]]), ...T.dash(a, b, '물의 호흡 제10형 · 생생유전', null, 'water', 1.8, false, { run: 'crouchRun' })], (a, b) => dragonFx(a, b, '#6ac0ff')),
  '히노카미 카구라 · 원무': KM('twoHandSword', '히노카미 카구라 · 원무', 'sun', { strike: 'swordDown', arc: [-2.6, 1.4, 40], arcW: 12, pw: 1.8 }),
  '히노카미 카구라 · 일훈': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'sun' }]]), ...T.aoe(a, b, '히노카미 카구라 · 일훈', 'sun', { jump: true, prep: 'flipAir', strike: 'swordDown', rad: 50, pw: 2.2, ult: true, spin: 18 })],
}, { name: '수면 베기', hand: null, elem: 'water', kind: 'getsuga' });
defChar('nezuko', '네즈코', 'kimetsu', {
  '혈귀술 · 폭혈': (a, b) => T.at(a, b, '혈귀술 · 폭혈', 'blood', 'flames', { pose: 'openPalm', pw: 1.6 }),
  '발차기': (a, b) => T.melee(a, b, '네즈코 발차기', 'blood', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 3, arc: [1.2, -1.6, 20], arcW: 6 }),
  '귀화': (a, b) => [...seq(a, b, [['kneel', .35, { aura: 1, elem: 'blood' }]]), ...T.buff(a, b, '귀화 · 폭주', 'blood', { giant: '#ff4a7a', dur: 5, pose: 'braced' }), ...T.aoe(a, b, '폭혈 대폭발', 'blood', { prep: 'flipAir', strike: 'axe', rad: 46, pw: 2, ult: true, jump: true })],
}, { name: '폭혈', hand: null, elem: 'blood', kind: 'fireball' });
defChar('zenitsu', '젠이츠', 'kimetsu', {
  '벽력일섬': (a, b) => [...seq(a, b, [['iai', .45, { aura: 1, elem: 'bolt' }]]), ...T.dash(a, b, '벼락의 호흡 제1형 · 벽력일섬', null, 'bolt', 1.6, false, { run: 'crouchRun', hold: 'iaiEnd' })],
  '벽력일섬 · 육연': (a, b) => [...seq(a, b, [['iai', .3, { aura: 1, elem: 'bolt' }]]), ...T.melee(a, b, '벽력일섬 · 육연', 'bolt', { n: 6, prep: 'iai', strike: 'iaiEnd', arc: [-.4, .4, 30], arcW: 6, reach: 4 })],
  '화뢰신': (a, b) => [...seq(a, b, [['iai', .5, { aura: 1, elem: 'bolt' }]]), ...kirin(a, b)],
}, { name: '벽력일섬', hand: null, elem: 'bolt', kind: 'senbon' });
defChar('inosuke', '이노스케', 'kimetsu', {
  '짐승의 호흡 · 찢어 베기': KM('xSwords', '짐승의 호흡 제2엄니 · 찢어 베기', 'slash', { strike: 'spreadSlash', n: 3 }),
  '짐승의 호흡 · 미친 베기': (a, b) => [...seq(a, b, [['xSwords', .3, { spin: 22, aura: 1, elem: 'slash' }]]), ...T.aoe(a, b, '짐승의 호흡 제6엄니 · 미친 베기', 'slash', { prep: 'xSwords', strike: 'spreadSlash', rad: 38, spin: 26 })],
  '공간 식각': (a, b) => [...seq(a, b, [['crouchRun', .3, { aura: 1, elem: 'slash' }]]), ...T.ranged(a, b, '짐승의 호흡 · 날아가는 엄니', 'getsuga', 'slash', { n: 2, size: 1.3, v: 270, prep: 'xSwords', cast: 'spreadSlash' })],
}, { name: '찢어 베기', hand: null, elem: 'slash', kind: 'getsuga' });
defChar('giyu', '기유', 'kimetsu', {
  '잔잔한 물결': (a, b) => [step(.5, [[a, { pose: 'swordLevel', aura: 1, elem: 'water', face: b }], [b, { pose: 'crouchRun', face: a, to: near(b, a, 8) }]], () => { callout(a, '물의 호흡 제11형 · 잔잔한 물결', true); ring(V3(a.pos.x, WATER_H + .2, a.pos.z), 6, '#6ac0ff', true, 1.6, 3); moses(a.pos, a.pos, 20, 2); }), step(.3, [[a, { pose: 'iaiEnd', k: 95, face: b, elem: 'water' }], [b, defSpec('hit')]], () => resolve(a, b, 'water', pick(['hit', 'block']), '잔잔한 물결!', 1.6))],
  '물의 호흡 · 타격의 물결': KM('swordLevel', '물의 호흡 제2형 · 물레방아', 'water', { strike: 'flipAir', arc: [-3, 3, 30], pw: 1.4 }),
  '물의 호흡 · 수룡': (a, b) => [...seq(a, b, [['twoHandSword', .35, { aura: 1, elem: 'water' }]]), ...T.ranged(a, b, '물의 호흡 · 수룡', 'orb', 'water', { n: 8, size: 1.3, v: 240, prep: 'twoHandSword', cast: 'swordDown' })],
}, { name: '물레방아', hand: null, elem: 'water', kind: 'getsuga' });
defChar('rengoku', '렌고쿠', 'kimetsu', {
  '부지화': (a, b) => [...seq(a, b, [['iai', .35, { aura: 1, elem: 'fire' }]]), ...T.dash(a, b, '불꽃의 호흡 제1형 · 부지화', null, 'fire', 1.6, false, { run: 'crouchRun', hold: 'iaiEnd' })],
  '성염의 물결': KM('swordLevel', '불꽃의 호흡 제3형 · 기염만상', 'fire', { strike: 'swordDown', arc: [-2.8, 1.6, 40], arcW: 12, pw: 1.6 }),
  '연옥': (a, b) => [...seq(a, b, [['twoHandSword', .5, { aura: 1, elem: 'fire' }]]), ...T.dash(a, b, '불꽃의 호흡 오의 · 제9형 연옥', null, 'fire', 2.6, true, { run: 'crouchRun', hold: 'swordDown' })],
  '성염의 굽이침': (a, b) => [...seq(a, b, [['spinKick', .4, { spin: 18, aura: 1, elem: 'fire' }]]), ...T.aoe(a, b, '불꽃의 호흡 제5형 · 염호', 'fire', { prep: 'twoHandSword', strike: 'swordDown', rad: 44, pw: 1.8 })],
}, { name: '부지화', hand: null, elem: 'fire', kind: 'fireball' });
defChar('shinobu', '시노부', 'kimetsu', {
  '나비의 춤 · 장난': (a, b) => T.melee(a, b, '벌레의 호흡 · 나비의 춤 장난', 'insect', { n: 5, prep: 'fingerPoint', strike: 'iaiEnd', arc: [-.3, .3, 24], arcW: 4, reach: 4 }),
  '잠자리의 춤 · 복안육각': (a, b) => [...seq(a, b, [['crouchRun', .3, { aura: 1, elem: 'insect' }]]), ...T.dash(a, b, '잠자리의 춤 · 복안육각', null, 'insect', 1.4, false, { run: 'crouchRun', hold: 'fingerPoint' })],
  '지네의 춤 · 백족사행': (a, b) => [step(.3, [[a, { pose: 'crouchRun', aura: 1, elem: 'insect', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '지네의 춤 · 백족사행', true)), ...[0, 1, 2, 3].map(i => step(.14, [[a, { pose: 'crouchRun', ghost: 1, to: () => b.pos.clone().add(V3(Math.cos(i * 2.1) * 26, 0, Math.sin(i * 2.1) * 26)), face: b, elem: 'insect' }], [b, { pose: 'guard', face: a }]], () => { streak(chest(a), dirTo(a, b), 40, '#c890ff', 1.4); burst(chest(a), 8, ELEM.insect.parts, 1); })), step(.2, [[a, { pose: 'fingerPoint', k: 95, face: b }], [b, defSpec('hit')]], () => resolve(a, b, 'insect', pick(['hit', 'block']), '백족사행!', 1.8))],
}, { name: '나비의 춤', hand: null, elem: 'insect', kind: 'senbon' });
defChar('uzui', '우즈이', 'kimetsu', {
  '소리의 호흡 · 굉': (a, b) => [...seq(a, b, [['xSwords', .3, { aura: 1, elem: 'sound' }]]), ...T.aoe(a, b, '소리의 호흡 제1형 · 굉', 'sound', { prep: 'hammerUp', strike: 'hammerDown', rad: 40, pw: 1.8 })],
  '명현주소': (a, b) => [...seq(a, b, [['xSwords', .3, { spin: 18, aura: 1, elem: 'sound' }]]), ...T.ranged(a, b, '소리의 호흡 제4형 · 명현주소', 'orb', 'sound', { n: 10, size: 1.1, v: 250, prep: 'xSwords', cast: 'spreadSlash' })],
  '보면 완성': (a, b) => [...seq(a, b, [['laughBack', .4, { aura: 1, elem: 'sound' }]]), ...T.buff(a, b, '보면 완성!', 'sound', { giant: '#ffd040', dur: 4, pose: 'armsWide' }), ...T.melee(a, b, '화려한 연타', 'sound', { n: 6, prep: 'xSwords', strike: 'spreadSlash', strike2: 'swordDown', pw: 1.5, ult: true })],
}, { name: '굉', hand: null, elem: 'sound', kind: 'orb' });
defChar('mitsuri', '미츠리', 'kimetsu', {
  '사랑의 호흡 · 첫사랑의 전율': (a, b) => T.melee(a, b, '사랑의 호흡 제1형 · 첫사랑의 전율', 'petal', { n: 4, prep: 'slashPrep', strike: 'spreadSlash', strike2: 'swordDown', arc: [-2.8, 2.8, 34], arcW: 5, reach: 14 }),
  '고양이 발 사랑바람': (a, b) => [...seq(a, b, [['flipAir', .3, { spin: 14, aura: 1, elem: 'petal' }]]), ...T.aoe(a, b, '사랑의 호흡 제6형 · 고양이 발 사랑바람', 'petal', { jump: true, prep: 'flipAir', strike: 'spreadSlash', rad: 42, spin: 22, pw: 1.8 })],
  '흔들리는 연정': withFx((a, b) => [...seq(a, b, [['armsWide', .35, { aura: 1, elem: 'petal' }]]), ...T.at(a, b, '사랑의 호흡 제5형 · 흔들리는 연정', 'petal', 'petals', { pose: 'skySweep', pw: 1.6, ult: true })], (a, b) => { for (let i = 0; i < 5; i++) pending.push({ t: i * .1, fn: () => { arc(a, -2.8, 2.8, 30 + i * 6, i % 2 ? '#ffffff' : '#f490c0', 5, .9); ring(V3(a.pos.x, WATER_H + .3, a.pos.z), 5 + i * 3, '#f490c0', true, 1, 2.2); } }); dome(chest(a), 18, '#f490c0'); }),
}, { name: '첫사랑의 전율', hand: null, elem: 'petal', kind: 'orb' });
defChar('muichiro', '무이치로', 'kimetsu', {
  '안개의 호흡 · 수평선': KM('swordLevel', '안개의 호흡 제1형 · 수평선 너머 먼 안개', 'mist', { strike: 'iaiEnd', arc: [-.5, .5, 34], reach: 5 }),
  '흐린 하늘': (a, b) => [...seq(a, b, [['crouchRun', .3, { aura: 1, elem: 'mist' }]]), ...T.melee(a, b, '안개의 호흡 제4형 · 흐린 하늘', 'mist', { n: 5, prep: 'swordLevel', strike: 'spreadSlash', strike2: 'swordDown', arc: [-2, 1, 22] })],
  '몽롱': (a, b) => [step(.4, [[a, { pose: 'swordLevel', aura: 1, elem: 'mist', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '안개의 호흡 제7형 · 몽롱', true); for (let i = 0; i < 120; i++) parts.push({ p: a.pos.clone().add(V3(R(-50, 50), R(0, 20), R(-50, 50))), v: V3(R(-8, 8), R(2, 8), R(-8, 8)), life: 2, c: pick(ELEM.mist.parts), g: 0, s: 3 }); for (let i = 0; i < 5; i++) ghosts.push({ ch: a.ch, pos: a.pos.clone().add(V3(R(-25, 25), 0, R(-25, 25))), heading: a.heading, c: { ...a.c }, life: 1.4, color: '#dde8f0', dec: .5 }); }), ...T.melee(a, b, '몽롱 · 안개 베기', 'mist', { prep: 'iai', strike: 'iaiEnd', arc: [-2, .8, 30], pw: 2, ult: true })],
}, { name: '수평선', hand: null, elem: 'mist', kind: 'getsuga' });
defChar('sanemi', '사네미', 'kimetsu', {
  '진사바람': KM('slashPrep', '바람의 호흡 제1형 · 진사바람 깎기', 'wind', { strike: 'spreadSlash', n: 2, arc: [-2.4, 2.4, 30] }),
  '흑풍연산': (a, b) => [...seq(a, b, [['twoHandSword', .3, { aura: 1, elem: 'wind' }]]), ...T.ranged(a, b, '바람의 호흡 제6형 · 흑풍연산', 'rasenshuriken', 'wind', { n: 3, size: 1.1, v: 260, prep: 'twoHandSword', cast: 'swordDown' })],
  '정선 회오리': (a, b) => [...seq(a, b, [['spinKick', .35, { spin: 24, aura: 1, elem: 'wind' }]]), ...T.at(a, b, '바람의 호흡 제9형 · 이즈나 회오리', 'wind', 'vortex', { pose: 'skySweep', pw: 1.8, ult: true })],
}, { name: '진사바람', hand: null, elem: 'wind', kind: 'getsuga' });
defChar('obanai', '오바나이', 'kimetsu', {
  '뱀의 호흡 · 위이의 형': KM('slashPrep', '뱀의 호흡 제1형 · 위이의 형', 'slash', { strike: 'spreadSlash', n: 3, arc: [-2.6, 1.6, 28] }),
  '장반 장사': (a, b) => [step(.3, [[a, { pose: 'crouchRun', aura: 1, elem: 'slash', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '뱀의 호흡 제5형 · 장반 장사', true)), ...[0, 1, 2].map(i => step(.16, [[a, { pose: 'iaiEnd', ghost: 1, to: () => b.pos.clone().add(V3(Math.cos(i * 2.3 + 1) * 18, 0, Math.sin(i * 2.3 + 1) * 18)), face: b, elem: 'slash' }], [b, { pose: 'guard', face: a }]], () => { arc(a, -2, 2, 26, '#a0f0b0', 6, .8); mark(chest(b), R(0, PI), 18, '#d0ffd8'); })), step(.2, [[a, { pose: 'swordDown', k: 95, face: b }], [b, defSpec('hit')]], () => resolve(a, b, 'slash', pick(['hit', 'block']), '장반 장사!', 1.8))],
}, { name: '위이의 형', hand: null, elem: 'slash', kind: 'getsuga' });
defChar('himejima', '히메지마', 'kimetsu', {
  '바위의 호흡 · 사면 베기': (a, b) => [...seq(a, b, [['hammerUp', .4, { aura: 1, elem: 'earth' }]]), ...T.aoe(a, b, '바위의 호흡 제1형 · 사면 베기', 'earth', { prep: 'hammerUp', strike: 'hammerDown', rad: 46, pw: 2 })],
  '철구 투척': (a, b) => [...seq(a, b, [['windBack', .4, { aura: 1, elem: 'earth' }]]), ...T.ranged(a, b, '바위의 호흡 · 철구 투척', 'bijuu', 'earth', { size: 2, v: 200, prep: 'windBack', cast: 'punch' })],
  '와륜형부': (a, b) => [...seq(a, b, [['skyRaise', .5, { aura: 1, elem: 'earth' }]]), ...T.aoe(a, b, '바위의 호흡 제5형 · 와륜형부', 'earth', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 60, pw: 2.4, ult: true })],
}, { name: '사면 베기', hand: null, elem: 'earth', kind: 'bijuu' });


const TAI = {
  '연타': (a, b) => T.melee(a, b, '연타', null, { n: 3 + Math.floor(Math.random() * 3), strike: pick(['punch', 'kick', 'highKick']) }),
  '돌려차기': (a, b) => T.melee(a, b, '돌려차기', null, { prep: 'kickPrep', strike: 'highKick', arc: [1.2, -1.6, 16] }),
};

// 특수 연출
function kirin(a, b) { const o = pick(['hit', 'jump', 'dodge', 'sub', 'block']); return [
  step(.5, [[a, { pose: 'point', aura: 1, elem: 'bolt', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '기린', true); for (let i = 0; i < 60; i++) parts.push({ p: V3(R(-150, 150), R(150, 220), R(-150, 80)), v: V3(R(-5, 5), 0, R(-5, 5)), life: 1.6, c: pick(['#1a1c24', '#22242e', '#0e1016']), g: 0, s: 2, n: true }); }),
  step(.12, [[a, { pose: 'point', elem: 'bolt', face: b }], [b, o === 'hit' || o === 'block' ? { pose: 'block', face: a } : defSpec(o)]], () => dragons.push({ a, b, o, t: 0, x0: b.pos.x + R(-60, 60), z0: b.pos.z + R(-60, 20), tgt: b.pos.clone(), segs: null })),
  step(.8, [[a, { pose: 'guard', face: b }], [b, { pose: o === 'jump' ? 'air' : 'guard' }]])]; }
function seriousPunch(a, b) { return [...approach(a, b, 12),
  step(.6, [[a, { pose: 'punchPrep', aura: 1, elem: 'power', face: b }], [b, { pose: 'block', face: a }]], () => callout(a, '진지한 시리즈 · 진지한 펀치', true)),
  step(.12, [[a, { pose: 'punch', k: 99, fwd: 60, face: b }], [b, { pose: 'hurt', face: a }]], () => {
    const d = fwdOf(a), p = chest(a).add(d.clone().multiplyScalar(6)); moses(V3(a.pos.x, 0, a.pos.z).addScaledVector(d, 6), V3(a.pos.x, 0, a.pos.z).addScaledVector(d, 240), 26, 3.4);
    for (let i = 0; i < 6; i++) add({ k: 'cone', p: p.clone(), dir: d.clone(), len: 40 + i * 30, r: 6 + i * 6, life: 1.2 - i * .1, c: i % 2 ? '#ffffff' : '#fff6d0' });
    for (let i = 0; i < 4; i++) dome(p.clone().add(d.clone().multiplyScalar(20 + i * 25)), 14 + i * 8, '#ffffff');
    others(a).forEach(o => { wound(o, a, '진지한 펀치!'); o.vel.copy(dirTo(a, o).multiplyScalar(320)); o.vel.y = 200; o.air = true; });
    ultBlast(p.clone().add(d.clone().multiplyScalar(45)), 'power', 110, null, '진지한 펀치');
    for (let i = 0; i < 5; i++) pending.push({ t: i * .1, fn: () => { const sky = V3(p.x + d.x * 120, 230, p.z + d.z * 120); ring(sky, 20 + i * 10, '#ffffff', false, 1.8, 3); } });
    for (let i = 0; i < 30; i++) streak(p.clone().add(V3(R(-30, 30), R(-10, 40), R(-30, 30))), d, R(60, 160), '#ffffff', 1.2);
    for (let i = 0; i < 80; i++) parts.push({ p: V3(R(-200, 200), R(150, 230), R(-200, 60)), v: V3(R(-120, 120), R(-10, 10), R(-120, 120)), life: 1.5, c: '#b0b8c8', g: 0, s: 2 });
    shake = 18; flashScreen(.07);
  }),
  step(.8, [[a, { pose: 'punch', face: b }], [b, { pose: 'air' }]])]; }
function spawnClone(a, b) { const m = clonePool.find(c => !c.busy); if (!m) return; m.busy = true; const p = a.pos.clone().add(V3(R(-20, 20), 0, R(-20, 20))); clones.push({ m, pos: clampArena(p), heading: 0, target: b, owner: a, t: 0, state: 'run', c: { ...POSE.run, legF: 0, legB: 0, kneeF: .2, kneeB: .2 }, run: R(0, 6) }); burst(p.clone().add(V3(0, 8, 0)), 10, ['#e8e8f0', '#ffffff'], .8, -10, 2); }
function tripleClash() {
  const [a, b] = F, ctr = V3(); F.forEach(f => ctr.add(f.pos)); ctr.multiplyScalar(1 / F.length); ctr.y = 0;
  return [
    step(.4, F.map(f => [f, { pose: 'seal', aura: 1, elem: f.ch.sig.elem, face: f === a ? b : a }]), () => { F.forEach(f => callout(f, f.ch.sig.name)); shot('ult', 3.2, a, b); }),
    step('run', F.map(f => [f, { pose: f.ch.sig.hand ? 'hold' : 'run', hand: f.ch.sig.hand, elem: f.ch.sig.elem, to: () => ctr.clone().add(dirTo({ pos: ctr }, f).multiplyScalar(5)), face: f === a ? b : a }])),
    step(.8, F.map(f => [f, { pose: 'palm', hand: f.ch.sig.hand, k: 92, elem: f.ch.sig.elem, face: f === a ? b : a }]), () => {
      clashes++; label(ctr.clone().add(V3(0, 30, 0)), F.length + '자 충돌!', '#ffffff', { big: true, life: 1.4 });
      F.forEach((f, i) => dome(ctr.clone().add(V3(0, 10, 0)), 20 + i * 6, ELEM[f.ch.sig.elem].c));
      for (let i = 0; i < 10; i++) pending.push({ t: i * .07, fn: () => { burst(ctr.clone().add(V3(0, 10, 0)), 6, F.map(f => ELEM[f.ch.sig.elem].parts[1]).concat('#ffffff'), 2.2); bolt(ctr.clone().add(V3(0, 10, 0)), ctr.clone().add(V3(R(-30, 30), R(0, 30), R(-30, 30))), '#ffffff', .5); shake = Math.max(shake, 6); } });
    }),
    step(.4, F.map(f => [f, { pose: 'hurt', fwd: -220, vy: 160 }]), () => F.forEach(f => explode(ctr.clone().add(V3(0, 10, 0)), f.ch.sig.elem, 1.6))),
    step(.3, F.map(f => [f, { pose: 'land' }]))];
}

const BASIC_HITS = ['punch', 'punchL', 'kick', 'highKick', 'palm', 'slash'];
function basicExchange(a, b) {
  const v = Math.random();
  if (v < .45) { // 기본 공격 2~5타, 상대는 막다가 이따금 맞음
    const n = 2 + Math.floor(Math.random() * 4), st = [...approach(a, b, R(8, 12), pick(['run', 'crouchRun']))];
    for (let i = 0; i < n; i++) { const o = pick(['block', 'block', 'hit', 'guard', 'dodge']), last = i === n - 1;
      st.push(step(R(.08, .16), [[a, { pose: pick(BASIC_HITS), k: 90, fwd: R(20, 90), face: b }], [b, o === 'dodge' ? defSpec('dodge') : { pose: o === 'hit' ? 'hurt' : 'block', face: a, fwd: -R(10, 50) }]], () => {
        const p = chest(b); if (o === 'dodge') { streak(p, dirTo(a, b), 14, '#ffffff', .8); return; }
        if (o === 'hit') { burst(p, 6, ['#ffffff', '#ffd890'], .9); impact(p, 3); b.kb.addScaledVector(dirTo(a, b), R(60, 140)); if (last && Math.random() < .4) resolve(a, b, null, 'hit', '', .6); }
        else { shield(b, '#cfe8ff'); burst(p, 4, ['#ffffff', '#9fd8ff'], .6); b.kb.addScaledVector(dirTo(a, b), R(30, 80)); if (Math.random() < .35) label(headP(b), pick(['가드!', '막기!', '튕겨냄!']), '#9fd8ff'); }
        ripple(b.pos.x, b.pos.z, .25); }));
      if (Math.random() < .3) st.push(step(R(.05, .12), [[a, { pose: 'guard', face: b, fwd: -40 }], [b, { pose: 'guard', face: a }]])); }
    if (Math.random() < .35) st.push(step(.12, [[b, { pose: pick(BASIC_HITS), k: 90, fwd: 80, face: a }], [a, { pose: 'block', face: b, fwd: -40 }]], () => { label(headP(b), '반격!', '#ffd84a'); shield(a, '#ffffff'); a.kb.addScaledVector(dirTo(b, a), R(60, 120)); }));
    return st;
  }
  if (v < .7) { // 가드 공방: 서로 자세 잡고 견제하며 돌기
    const s = pick([-1, 1]); return [
      step(R(.3, .6), [[a, { pose: 'guard', side: s * R(60, 140), face: b }], [b, { pose: 'guard', side: s * R(60, 140), face: a }]]),
      step(.1, [[a, { pose: pick(BASIC_HITS), k: 90, fwd: 60, face: b }], [b, { pose: 'block', face: a }]], () => { shield(b, '#ffffff'); label(headP(b), '가드!', '#9fd8ff'); b.kb.addScaledVector(dirTo(a, b), 70); }),
      step(R(.2, .4), [[a, { pose: 'guard', fwd: -50, face: b }], [b, { pose: 'guard', side: -s * 80, face: a }]])];
  }
  // 원거리 견제와 흘리기
  const k = a.ch.sig.kind || 'orb', ek = a.ch.sig.elem || 'metal', mode = Math.random() < .55 ? 'deflect' : pick(['block', 'jump', 'hit']);
  return [
    step(.12, [[a, { pose: 'throwPrep', face: b, elem: ek }], [b, { pose: 'guard', face: a }]]),
    step(.1, [[a, { pose: 'throw', k: 90, face: b }], [b, { pose: mode === 'deflect' ? 'slashPrep' : 'guard', face: a }]], () => proj(a, b, k, mode, { c: ELEM[ek].c, ek, size: .8, v: 300, nm: '' })),
    step(() => Math.max(.1, a.pos.distanceTo(b.pos) / 300), [[a, { pose: 'guard', face: b }], [b, { pose: mode === 'deflect' ? 'slash' : 'guard', face: a }]]),
    step(.15, [[a, { pose: 'stance', face: b }], [b, { pose: 'stance', face: a }]])];
}
function tagIn(f) {
  const used = (ALLF || F).map(x => x.ch), pool = Object.values(CH).filter(c => !used.includes(c)), nc = pick(pool), o = others(f)[0];
  return [
    step(.3, [[f, { pose: 'air', vy: 260, fwd: -220 }]], () => label(headP(f), '교대!', '#ffffff')),
    step(.1, [[f, { pose: 'air' }]], () => { burst(chest(f), 14, ['#e8e8f0', '#ffffff'], .8, -10, 2); setChar(f, nc); const a = R(0, PI * 2); f.pos.set(Math.cos(a) * 90, 0, Math.sin(a) * 60); f.vel.set(0, 0, 0); f.air = false; pillar(f.pos, 10, ELEM[nc.sig.elem].c, .8); callout(f, nc.name + ' 참전'); shot('quarter', 3, f, o); }),
    step('run', [[f, { pose: 'run', to: near(f, o, 30), face: o }]]),
    step(.15, [[f, { pose: 'stance', aura: 1, face: o }]])];
}

// ═══ 진행 ═══
function setChar(f, ch) { if (f.model) f.model.root.visible = false; f.ch = ch; f.model = ch.model; f.model.root.visible = true; f.scale = ch.bodyScale || 1; f.bulk = ch.bulk || 1; /* 원작 체형: 키(bodyScale)·덩치(bulk) */ f.name = ch.name; f.mode = 0; f.modeK = null; f.hand = null; f.elem = null; f.stretch = 0; f.giantArm = 0; }
const clampArena = p => { const r = Math.hypot(p.x, p.z); if (r > ARENA) { p.x *= ARENA / r; p.z *= ARENA / r; } return p; };
let PICK = null; // 소유자가 세계관별로 고른 출전 명단(인물 키 2~6개). 없으면 무작위 4인
const cleanPick = keys => { const k = [...new Set((Array.isArray(keys) ? keys : []).filter(x => CH[x]))].slice(0, 6); return k.length >= 2 ? k : null; };
function initFighters() {
  try { PICK = cleanPick(JSON.parse(localStorage.getItem('arenaRoster') || 'null')); } catch (e) { PICK = null; }
  if (PICK) { F = PICK.map((key, i) => { const f = mkF(null); setChar(f, CH[key]); const a = i / PICK.length * PI * 2 + PI / 4; f.pos.set(Math.cos(a) * 45, 0, Math.sin(a) * 32); return f; }); F.forEach((f, i) => { f.target = F[(i + 1) % F.length]; f.faceT = f.target; }); return; }
  const n0 = 4;
  const worlds = Object.keys(ROSTER).sort(() => Math.random() - .5).concat(Object.keys(ROSTER)).slice(0, n0);
  F = []; F = worlds.map((w, i) => { const f = mkF(null); setChar(f, pick(ROSTER[w].filter(c => !F.some(x => x.ch === c))) || pick(Object.values(CH).filter(c => !F.some(x => x.ch === c)))); F.push(f); const a = i / worlds.length * PI * 2 + PI / 4; f.pos.set(Math.cos(a) * 45, 0, Math.sin(a) * 32); return f; });
  F.forEach((f, i) => { f.target = F[(i + 1) % F.length]; f.faceT = f.target; });
}
let queue = [], stepT = 0, pending = [], lastKind = '', lanes = [], ALLF = null;
const laneOf = f0 => { const L = lanes.find(L2 => L2.fs.includes(f0)); return L ? L.q : null; }; // 추격은 그 사람의 교전 줄에 넣음(다른 교전을 멈추지 않게)
function mkLane(fs2, q) { const saved = F; ALLF = saved; F = fs2; try { q = q || plan(); } finally { F = saved; ALLF = null; } lanes.push({ fs: fs2, q, t: 0 }); }
function soloLane(f0) { // 혼자 남은 인물: 바쁜 상대에게 달려들어 난입하거나 기술로 끼어듦
  const tg = pick(others(f0)); if (!tg) return; const v = Math.random();
  const q = v < .45 ? [...approach(f0, tg, R(9, 14), pick(['run', 'crouchRun']), { ghost: Math.random() < .3 ? 1 : 0 }), step(.12, [[f0, { pose: pick(BASIC_HITS), k: 92, fwd: 90, face: tg }]], () => resolve(f0, tg, null, pick(['hit', 'block', 'hit']), pick(['난입!', '기습!', '끼어들기!']), .9))]
    : v < .85 ? skillOf(f0, tg) : [step(R(.2, .45), [[f0, { pose: 'run', side: R(-160, 160), fwd: R(0, 90), face: tg }]])];
  lanes.push({ fs: [f0], q, t: 0 });
}
function laneTick(dt) {
  lanes.forEach(L => { L.t -= dt; if (L.t <= 0) { if (!L.q.length || L.fs.some(x => !F.includes(x))) { L.done = true; return; } L.t = runStep(L.q.shift()); } });
  lanes = lanes.filter(L => !L.done);
  const busy = new Set(); lanes.forEach(L => L.fs.forEach(x => busy.add(x)));
  const free = F.filter(x => !busy.has(x)).sort(() => Math.random() - .5);
  if (free.length === F.length && F.length >= 3 && Math.random() < .1) { mkLane(F.slice()); return; } // 이따금 전원 난전
  while (free.length >= 2) { const k = free.length === 3 || (free.length >= 5 && Math.random() < .3) ? 3 : 2; mkLane(free.splice(0, k)); }
  if (free.length === 1) soloLane(free[0]);
}
const HEAT = () => Math.sqrt(4 / Math.max(2, F.length)); // 인원이 적을수록 큼 (2인 1.41 · 4인 1 · 6인 .82)
function setFighterCount(nn) {
  nn = Math.max(2, Math.min(6, nn | 0)); if (nn === F.length) return F.length;
  while (F.length < nn) { const used = F.map(x => x.ch), pool = Object.values(CH).filter(c => !used.includes(c)), nf = mkF(null); setChar(nf, pick(pool));
    const a = R(0, PI * 2); nf.pos.set(Math.cos(a) * 70, 0, Math.sin(a) * 45); nf.target = pick(F); nf.faceT = nf.target; F.push(nf);
    pillar(nf.pos, 10, ELEM[nf.ch.sig.elem].c, .9); ring(V3(nf.pos.x, WATER_H + .3, nf.pos.z), 4, '#ffffff', true, 1, 2.4); label(headP(nf).add(V3(0, 8, 0)), nf.ch.name + ' 난입!', '#ffd84a', { big: true }); }
  while (F.length > nn) { const out = F.pop(); burst(chest(out), 16, ['#e8e8f0', '#ffffff'], 1, -10, 2); label(headP(out), out.ch.name + ' 이탈', '#cfe8ff'); out.model.root.visible = false; }
  F.forEach(x => { if (!F.includes(x.target)) x.target = pick(others(x)); if (!F.includes(x.faceT)) x.faceT = x.target; });
  giants = giants.filter(g => F.includes(g.f)); queue = []; stepT = 0; lanes = [];
  return F.length;
}
// 고른 명단으로 다시 출전: 인원 = 명단 길이. 빈 명단(null·2명 미만)이면 무작위 4인
function setRoster(keys) {
  const k = cleanPick(keys); PICK = k;
  try { if (k) localStorage.setItem('arenaRoster', JSON.stringify(k)); else localStorage.removeItem('arenaRoster'); } catch (e) {}
  F.forEach(x => { if (x.model) x.model.root.visible = false; });
  queue = []; stepT = 0; lanes = []; pending = []; giants = []; counterBy = null;
  F = []; initFighters();
  F.forEach(x => { pillar(x.pos, 10, ELEM[x.ch.sig.elem].c, .9); label(headP(x).add(V3(0, 8, 0)), x.ch.name + ' 출전!', '#ffd84a', { big: true }); });
  return F.map(x => x.ch.key);
}
window.setFighterCount = setFighterCount; window.getFighterCount = () => F.length; window.setRoster = setRoster;
window.getRoster = () => PICK ? PICK.slice() : null; window.rosterChars = () => Object.values(CH).map(c => ({ key: c.key, name: c.name, world: c.world }));
window.rosterWorlds = () => Object.keys(ROSTER).map(w => ({ id: w, name: (WORLD[w] || {}).name || w, color: (WORLD[w] || {}).stroke || '#888' }));
function plan() {
  tempo = R(.6, 1.4); F.forEach(f => f.chainN = 0);
  if (counterBy && F.includes(counterBy)) { const a = counterBy; counterBy = null; const b = pick(others(a)); return withThird(skillOf(a, b, true), a, b); }
  counterBy = null;
  const r = Math.random();
  if (r < .05 * HEAT()) return tripleClash();
  if (r < .12 && !PICK) return tagIn(pick(F)); // 고른 명단이면 다른 인물로 교대하지 않음
  if (r < .5) { const a = pick(F), b = pick(others(a)); a.target = b; b.target = a; return withThird(basicExchange(a, b), a, b); }
  const a = pick(F), b = pick(others(a)), st0 = [];
  if (Math.random() < .15) { const s = pick([-1, 1]); st0.push(step(R(.25, .7), F.map(f => [f, { pose: 'run', side: s * R(110, 210) * (Math.random() < .35 ? -1 : 1), fwd: R(-40, 70), face: f === a ? b : a }]))); }
  const n = Math.random() < .32 * HEAT() ? (Math.random() < .3 * HEAT() ? 3 : 2) : 1;
  for (let i = 0; i < n; i++) st0.push(...skillOf(a, b));
  if (Math.random() < .28) st0.push(...skillOf(b, a, Math.random() < .5));
  const st = withThird(st0, a, b);
  if (Math.random() < .15) st.push(step(R(.08, .3), F.map(f => [f, { pose: pick(['stance', 'guard', 'block']), aura: Math.random() < .5 ? 1 : 0, side: R(-90, 90), fwd: R(-40, 40), face: f === a ? b : a }])));
  return st;
}
const RANGED_RE = /T\.(ranged|sky|at)\b|proj\(|beam|kirin|spawnClone|dragons|seriousPunch|stream/;
function skillOf(a, b, quick) {
  a.target = b; b.target = a;
  const lib = quick || Math.random() < .88 ? a.ch.skills : TAI; /* 11-05: 공용 연타·돌려차기 비중 줄임, 최근 7개 반복 피함 */
  let keys = Object.keys(lib).filter(k => !a.hist.includes(k) && !(a.mode > 0 && /모드|세컨드|기어 5|반카이|허화$/.test(k)));
  const dist = a.pos.distanceTo(b.pos), isR = k => RANGED_RE.test(lib[k].toString());
  const want = dist > 75 ? (Math.random() < .7 ? 'r' : '') : dist < 35 ? (Math.random() < .65 ? 'm' : '') : '';
  if (want) { const sub = keys.filter(k => want === 'r' ? isR(k) : !isR(k)); if (sub.length) keys = sub; }
  const k = pick(keys.length ? keys : Object.keys(lib));
  if (isR(k) && dist < 40 && Math.random() < .6) { const back = dirTo(b, a); a.hist.push(k); if (a.hist.length > 7) a.hist.shift(); return [step(R(.25, .4), [[a, { pose: pick(['flipAir', 'air', 'braced']), vy: R(120, 200), to: () => a.pos.clone().addScaledVector(back, R(40, 70)), face: b }], [b, { pose: pick(['crouchRun', 'stance', 'guard']), face: a, fwd: R(0, 90) }]], () => { splash(a.pos, .8); label(headP(a).add(V3(0, 4, 0)), '거리 벌리기!', '#9fd8ff'); }), ...lib[k](a, b)]; } a.hist.push(k); if (a.hist.length > Math.min(4, Object.keys(lib).length - 1)) a.hist.shift(); return lib[k](a, b);
}
function withThird(st, a, b) {
  F.filter(f => f !== a && f !== b).forEach(c => withOne(st, a, b, c)); return st;
}
function withOne(st, a, b, c) {
  const tg = pick([a, b]); c.target = tg;
  st.forEach(s => { if (!s.acts.some(([f]) => f === c)) s.acts.push([c, { pose: pick(['stance', 'guard', 'run']), side: R(-60, 60), fwd: R(-20, 40), face: tg, aura: Math.random() < .3 ? 1 : 0 }]); });
  if (Math.random() < .4 && st.length > 2) { const k = Math.floor(R(1, st.length - 1)); st.splice(k, 0, ...T.ranged(c, tg, c.ch.sig.name, c.ch.sig.kind, c.ch.sig.elem, { size: 1.2, v: 280, modes: ['hit', 'block', 'jump'] }).map(s => { s.acts = s.acts.filter(([f]) => f === c || f === tg); [a, b].forEach(x => { if (!s.acts.some(([f]) => f === x)) s.acts.push([x, { pose: 'guard', face: c }]); }); return s; })); }
  return st;
}
function apply(f, s, d) {
  if (f.stun > 0 && !s.vy) s = { pose: f.stun > .8 ? 'kneel' : 'hurt', face: s.face || f.faceT, k: 40 };
  f.tgt = POSE[s.pose] || f.tgt; f.k = (s.k || 26) * (f.mode > 0 ? 1.25 : 1);
  if (s.face) f.faceT = s.face;
  const fw = f.faceT ? dirTo(f, f.faceT) : fwdOf(f), rt = V3(-fw.z, 0, fw.x);
  if (s.to) { const T2 = clampArena(s.to()); f.vel.x = (T2.x - f.pos.x) / d; f.vel.z = (T2.z - f.pos.z) / d; }
  else { const sp = (f.mode > 0 ? 1.2 : 1); f.vel.x = (fw.x * (s.fwd || 0) + rt.x * (s.side || 0)) * sp; f.vel.z = (fw.z * (s.fwd || 0) + rt.z * (s.side || 0)) * sp; }
  if (s.vy) { f.vel.y = s.vy; f.air = true; }
  f.ghost = s.ghost || 0; f.lock = s.lock ? d : 0; f.aura = s.aura || 0; f.elem = s.elem || (f.mode > 0 ? f.modeElem : null); f.spinV = s.spin || 0; f.tiltT = s.tilt || 0;
  f.hand = s.hand || null; f.handSize = s.handSize || 1;
  if (s.stretch !== undefined) f.stretch = s.stretch; if (s.giantArm !== undefined) f.giantArm = s.giantArm;
}
function runStep(s) {
  const acts = s.acts.map(([f, sp]) => [f, sp]);
  let d = s.d === 'run' ? Math.max(.1, ...acts.map(([f, sp]) => sp.to ? f.pos.distanceTo(clampArena(sp.to())) / 190 : 0)) : typeof s.d === 'function' ? s.d() : s.d;
  d *= tempo * R(.7, 1.35);
  acts.forEach(([f, sp]) => apply(f, sp, d));
  if (s.fx) pending.push({ t: .03, fn: s.fx });
  return d;
}
function update(dt, t) {
  // 'frame % N' 으로 뿌리는 효과가 주사율(75·120·144Hz)에 따라 많아지지 않게: 1/60초마다 한 칸(정수), 그 사이 장면은 .5 를 붙여 어떤 % 검사에도 걸리지 않게
  tickAcc = Math.min(2, tickAcc + dt / SPEED * 60); if (tickAcc >= .999) { tickAcc -= 1; frame = ++tickN; } else frame = tickN + .5;
  if (stepT > 0 || queue.length) { if (stepT <= 0) stepT = runStep(queue.shift()); stepT -= dt; } // (시험용 단일 줄)
  else laneTick(dt);
  { const cur = pending; pending = []; const keep = []; cur.forEach(p => { p.t -= dt; if (p.t <= 0) { try { p.fn(); } catch (e) { console.error(e); } } else keep.push(p); }); pending = keep.concat(pending); } // 실행 중 새로 예약된 효과(투사체 발사 등)가 버려지던 버그 수정
  F.forEach(f => {
    const o = f.c, tg = f.tgt;
    if (f.mode > 0) f.mode -= dt;
    if (f.stun > 0) { f.stun -= dt; f.vel.x *= .8; f.vel.z *= .8; if (frame % 6 === 0) parts.push({ p: headP(f).add(V3(R(-3, 3), 4, R(-3, 3))), v: V3(R(-10, 10), 12, R(-10, 10)), life: .6, c: pick(['#ffe070', '#ffffff']), g: 0, s: 1 }); }
    if (f.faceT && f.lock <= 0) { const want = Math.atan2(f.faceT.pos.z - f.pos.z, f.faceT.pos.x - f.pos.x); let dh = want - f.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); f.heading += dh * Math.min(1, dt * 12); }
    f.lock -= dt;
    f.spinA = (f.spinA || 0) + (f.spinV || 0) * dt; if (!f.spinV) { const tgA = Math.round(f.spinA / (PI * 2)) * PI * 2; f.spinA += (tgA - f.spinA) * Math.min(1, dt * 8); }
    f.tilt = (f.tilt || 0) + ((f.tiltT || 0) - (f.tilt || 0)) * Math.min(1, dt * 9);
    f.fallA = f.fallA || 0; f.fallV = f.fallV || 0; f.fallV -= (f.fallA * 45 + f.fallV * 5) * dt; f.fallA = clampv(f.fallA + f.fallV * dt, -.4, 1.35);
    f.pos.x += (f.vel.x + f.kb.x) * dt; f.pos.z += (f.vel.z + f.kb.z) * dt; const kbl = Math.hypot(f.kb.x, f.kb.z); if (kbl > 40 && !f.air && frame % 2 === 0) splash(f.pos, .5); f.kb.multiplyScalar(Math.max(0, 1 - dt * 4.5));
    if (f.air) { if (f.hover) { const th = f.hoverH || 15; f.vel.y += ((th - f.pos.y) * 6 - f.vel.y * 3.2) * dt; f.vel.y = Math.max(-70, Math.min(70, f.vel.y)); f.pos.y += f.vel.y * dt; if (f.pos.y < 0) { f.pos.y = 0; f.vel.y = 24; } } else { f.vel.y -= GRAV * dt; f.pos.y += f.vel.y * dt; if (f.pos.y <= 0) { f.pos.y = 0; f.vel.y = 0; f.air = false; splash(f.pos, 1); f.cv = f.cv || {}; f.cv.bob = (f.cv.bob || 0) + 40; if (f.model.ph) f.model.ph.sv.y -= 3; } } }
    if (!f.away) clampArena(f.pos); // 벽 박힘(절벽) 상태는 경기장 바깥에 있으므로 클램프 안 함 — 매 프레임 안으로 끌려와 순간이동처럼 보이는 것 방지
    if ([f.pos.x, f.pos.y, f.pos.z].every(isFinite)) { f.__lgx = f.pos.x; f.__lgz = f.pos.z; } // 마지막으로 정상적이던 발자리 기억(중앙 순간이동 방지)
    if (![f.pos.x, f.pos.y, f.pos.z, f.vel.x, f.vel.y, f.vel.z, f.heading].every(isFinite)) { f.pos.set(f.__lgx != null ? f.__lgx : R(-40, 40), 0, f.__lgz != null ? f.__lgz : R(-30, 30)); f.vel.set(0, 0, 0); f.kb.set(0, 0, 0); f.air = false; if (!isFinite(f.heading)) f.heading = 0; }
    const k = Math.min(1, dt * f.k);
    // 2차 스프링(살짝 넘쳤다 돌아옴). 프레임이 느려도 터지지 않게 잘게 나눠 적분하고, 값이 깨지면 바로 목표로 되돌린다
    const stf = Math.min(2400, f.k * f.k * .9), dmp = 2 * .78 * Math.sqrt(stf), subs = Math.max(1, Math.ceil(dt * Math.sqrt(stf) / .35)), h = dt / subs; f.cv = f.cv || {};
    SPR_KEYS.forEach(key => { const tv = tg[key] ?? 0; let cur = o[key] ?? tv, vv = f.cv[key] ?? 0; for (let i = 0; i < subs; i++) { vv += ((tv - cur) * stf - vv * dmp) * h; cur += vv * h; } if (!isFinite(cur) || !isFinite(vv) || Math.abs(cur - tv) > 8) { cur = tv; vv = 0; } f.cv[key] = clampv(vv, -60, 60); o[key] = cur; });
    const hs = Math.hypot(f.vel.x, f.vel.z); f.speed = Math.min(1, hs / 150);
    gait(f, o, tg, k, dt, hs);
    f.breath = !f.air && hs < 10 ? Math.sin(t * 3.5 + f.pos.x) * .8 : 0;
    /* (11-09 소유자 요청) 캐릭터를 상시 따라다니는 빛기둥(각성·비행 오라: 위로 올라가는 입자 기둥 + 발밑 링) 제거 — 영구 오라 연출 제거로 시각 정리 + 매 프레임 파티클 발생 감소 */
    if (f.ghost && frame % 3 === 0) ghosts.push({ ch: f.ch, pos: f.pos.clone(), heading: f.heading, c: { ...o }, life: 1, color: f.elem ? ELEM[f.elem].c : '#ffffff', dec: .12 });
    if (f.flash > 0) f.flash--;
    if (!f.air && hs > 60 && frame % 3 === 0) { splash(f.pos, .35); } if (!f.air && hs > 60) for (let i = 0; i < 2; i++) parts.push({ p: f.pos.clone().add(V3(R(-1.5, 1.5), WATER_H + .3, R(-1.5, 1.5))), v: f.vel.clone().multiplyScalar(-.25).add(V3(R(-15, 15), R(30, 60), R(-15, 15))), life: .5, c: '#dff0ff', g: 260, s: 1 });
  });
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const a = F[i], b = F[j], d = V3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z), l = d.length(); if (l < 6 && l > .01 && !a.ghost && !b.ghost) { d.multiplyScalar((6 - l) / l / 2); a.pos.sub(d); b.pos.add(d); } }
  updateEffects(dt, t);
}
// 사람 같은 달리기: 허벅지·무릎·팔꿈치가 반대로 엇갈리고, 몸이 앞으로 기울며 오르내린다
function gait(f, o, tg, k, dt, hs) {
  if (f.air) { o.legF += (.9 - o.legF) * k; o.legB += (.2 - o.legB) * k; o.kneeF += (1.2 - o.kneeF) * k; o.kneeB += (.6 - o.kneeB) * k; return; }
  if (hs > 30) {
    f.run += dt * (6 + hs * .045);
    const p = f.run, amp = Math.min(1, hs / 160);
    o.legF = Math.sin(p) * .95 * amp; o.legB = Math.sin(p + PI) * .95 * amp;
    o.kneeF = .15 + Math.max(0, Math.cos(p)) * 1.35 * amp; o.kneeB = .15 + Math.max(0, Math.cos(p + PI)) * 1.35 * amp;
    o.bob = tg.bob * .3 - Math.abs(Math.sin(p)) * 1.4 * amp + .6;
    o.lean += (Math.max(tg.lean, 3 + amp * 3) - o.lean) * k;
    const free = ['run', 'stance', 'guard'].includes(Object.keys(POSE).find(n => POSE[n] === tg)) && !f.hand;
    if (free) { o.arm = -Math.sin(p) * .75 * amp + .1; o.fore = o.arm + 1.45; o.barm = Math.sin(p) * .75 * amp + .1; o.bfore = o.barm + 1.45; o.twist = Math.sin(p) * .18 * amp; o.armX = .12; }
  } else {
    const lf = tg.kick || tg.leg, lb = tg.leg * .8;
    o.legF += (lf - o.legF) * k; o.legB += (-lb - o.legB) * k;
    const crouch = Math.max(0, tg.bob) * .14;
    o.kneeF += ((tg.kick ? .1 : .15 + crouch) - o.kneeF) * k; o.kneeB += (.2 + crouch - o.kneeB) * k;
  }
}
function splash(p, s) { ripple(p.x, p.z, .25 + s * .5); const n = Math.round(6 * s + 3); for (let i = 0; i < n; i++) { const a = R(0, PI * 2), sp = R(15, 45) * (s + .3); parts.push({ p: V3(p.x + Math.cos(a) * 1.5, WATER_H + .2, p.z + Math.sin(a) * 1.5), v: V3(Math.cos(a) * sp, R(40, 90) * s + 15, Math.sin(a) * sp), life: .7, c: pick(['#8a6a4a', '#6a5038', '#a08060']), g: 260, s: i % 3 ? 1 : 2 }); } if (s >= 1) for (let i = 0; i < 10; i++) parts.push({ p: V3(p.x + R(-3, 3), WATER_H + R(0, 3), p.z + R(-3, 3)), v: V3(R(-8, 8), R(4, 12), R(-8, 8)), life: 1.4, c: '#b8d0dc', g: -2, s: 2 }); }

// ═══ 그리기: 모형 자세 ═══
function poseModel(m, g, t) {
  const o = g.c;
  m.root.position.copy(g.pos); m.root.rotation.y = -g.heading - (g.spinA || 0); m.root.rotation.z = (g.fallA || 0) + (g.tilt || 0); m.root.position.y += (1 - Math.cos(g.tilt || 0)) * 9 * (g.scale || 1); { const s0 = MS * (g.scale || 1), bk = g.bulk || 1; m.root.scale.set(s0 * bk, s0, s0 * bk); }
  m.body.position.y = -(o.bob + (g.breath || 0)) * .7;
  m.legF.rotation.z = o.legF; m.legB.rotation.z = o.legB;
  m.legF.userData.knee.rotation.z = -(o.kneeF || 0); m.legB.userData.knee.rotation.z = -(o.kneeB || 0);
  const ls = o.lean * .25; m.torso.position.x = ls; m.torso.rotation.z = -o.lean * .035; m.head.position.x = ls * 1.4;
  m.aF.up.position.x = .3 + ls; m.aB.up.position.x = .3 + ls;
  m.aF.up.rotation.z = o.arm; m.aF.fore.rotation.z = o.fore - o.arm; m.aB.up.rotation.z = o.barm; m.aB.fore.rotation.z = o.bfore - o.barm;
  const tw = o.twist || 0, sway = Math.sin(t * 1.4 + g.pos.x) * .05 * (1 - (g.speed || 0));
  m.body.rotation.y = tw + sway; m.head.rotation.y = -tw * .6 - sway; m.legF.rotation.y = -tw - sway; m.legB.rotation.y = -tw - sway;
  m.aF.up.rotation.x = -(o.armX || 0); m.aB.up.rotation.x = (o.armX || 0); m.legF.rotation.x = -(o.spread || 0); m.legB.rotation.x = (o.spread || 0);
  const st = 1 + (g.stretch || 0) * .9, ga = 1 + (g.giantArm || 0) * 2.2;
  m.aF.up.scale.set(ga, st, ga); m.aF.fore.scale.set(ga, st, ga);
  m.tail.rotation.z = Math.sin(t * 10) * (.3 + (g.speed || 0) * .5) - .2;
  const sp = g.speed || 0;
  m.coat.forEach((c, i) => { const w = Math.sin(t * 9 - i * .7) * (.4 + sp * 1.4); c.position.set(-3 + ls - i * (.55 + sp * .9), 26.5 - i * 1.7 - w, 0); c.rotation.z = -.15 - sp * .5 + Math.sin(t * 9 - i) * .08; });
}

// ═══ 물리 체인: 머리카락·망토·머리띠 끈·모자·치마가 몸의 가속·회전·바람에 따라 늦게 따라오고 출렁인다 ═══
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function physModel(m, f, dt) {
  if (!m.ph) m.ph = { pp: f.pos.clone(), pv: V3(), sway: V3(), sv: V3(), lastH: f.heading, chain: null };
  const s = m.ph; dt = Math.max(.008, Math.min(.04, dt));
  const v = f.pos.clone().sub(s.pp).multiplyScalar(1 / dt); s.pp.copy(f.pos);
  if (!(v.length() < 600)) { v.copy(s.pv); s.chain = null; }
  const a = v.clone().sub(s.pv).multiplyScalar(1 / dt); s.pv.copy(v);
  let dh = f.heading - s.lastH; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); s.lastH = f.heading; const turn = dh / dt;
  const fw = fwdOf(f), rt = V3(-fw.z, 0, fw.x);
  const ax = clampv(a.dot(fw), -4000, 4000), az = clampv(a.dot(rt), -4000, 4000), ay = clampv(a.y, -4000, 4000);
  const vx = v.dot(fw), vz = v.dot(rt);
  // 머리 흔들림 스프링 (가속 반대쪽으로 밀렸다가 출렁이며 돌아옴) + 달리는 바람
  const tx = clampv(-ax * .00045 - vx * .0016, -.9, .9), tz = clampv(-az * .00045 - turn * .06 - vz * .0012, -.8, .8), ty = clampv(-ay * .0003, -.5, .5);
  s.sv.x += ((tx - s.sway.x) * 140 - s.sv.x * 7) * dt; s.sv.z += ((tz - s.sway.z) * 140 - s.sv.z * 7) * dt; s.sv.y += ((ty - s.sway.y) * 160 - s.sv.y * 8) * dt;
  s.sway.addScaledVector(s.sv, dt); if (![s.sway.x, s.sway.y, s.sway.z].every(isFinite) || s.sway.length() > 3) { s.sway.set(0, 0, 0); s.sv.set(0, 0, 0); } s.sway.clampScalar(-1.2, 1.2);
  const t = performance.now() / 1000, wind = Math.sin(t * 2.3 + f.pos.x) * .05 + Math.sin(t * 5.1) * .02;
  m.hairLocks.forEach((lk, i) => { const w = lk.userData.w, j = Math.sin(t * 7 + i) * .02 * w; _e.set((s.sway.z + wind * .5) * w + j, 0, -(s.sway.x - s.sway.y * .5) * w + j); _q.setFromEuler(_e); lk.quaternion.copy(lk.userData.rest).multiply(_q); });
  m.tail.rotation.z = -.2 - s.sway.x * 1.8 + Math.sin(t * 9) * (.1 + Math.abs(vx) * .002); m.tail.rotation.x = s.sway.z * 1.6;
  if (m.hatRef) { m.hatRef.rotation.z = .12 - s.sway.x * .35; m.hatRef.rotation.x = s.sway.z * .3; m.hatRef.position.y = 4 + s.sway.y * .6; }
  if (m.skirtRef) { m.skirtRef.rotation.z = -s.sway.x * .35; m.skirtRef.rotation.x = s.sway.z * .35; }
  // 망토 체인 (베를레 적분: 중력 + 관성 + 공기 저항 + 길이 구속)
  if (m.coat.length && m.coat.some(c => c.visible)) {
    const N = m.coat.length + 1, L = 1.75, ls = (f.c.lean || 0) * .25, anchor = V3(-3 + ls, 26.5 - (f.c.bob || 0) * .7, 0);
    if (!s.chain) { s.chain = []; for (let i = 0; i < N; i++) { const p = anchor.clone().add(V3(0, -i * L, 0)); s.chain.push({ p, o: p.clone() }); } }
    const inv = 1 / MS, F2 = V3((-ax - vx * 4) * inv * .6, -170 + (-ay) * inv * .25, (-az - vz * 4) * inv * .6);
    s.chain[0].p.copy(anchor); s.chain[0].o.copy(anchor);
    for (let i = 1; i < N; i++) { const c = s.chain[i], tmp = c.p.clone(); c.p.add(c.p.clone().sub(c.o).multiplyScalar(.96)).addScaledVector(F2, dt * dt).add(V3(0, 0, wind * .4)); c.o.copy(tmp); }
    for (let it = 0; it < 4; it++) for (let i = 1; i < N; i++) { const a2 = s.chain[i - 1].p, b2 = s.chain[i].p, d = b2.clone().sub(a2), l = d.length() || 1; b2.copy(a2).addScaledVector(d, L / l); if (b2.x > anchor.x + .2) b2.x = anchor.x + .2; b2.z = clampv(b2.z, -4, 4); }
    if (!s.chain.every(c => isFinite(c.p.x + c.p.y + c.p.z))) { s.chain = null; return; }
    m.coat.forEach((sg, i) => { const p = s.chain[i].p, q = s.chain[i + 1].p, d = q.clone().sub(p); sg.position.copy(p).lerp(q, .5); sg.rotation.set(Math.atan2(d.z, -d.y) * .8, 0, Math.atan2(d.x, -d.y)); });
  }
}
// ═══ 그리기: 효과 ═══
const colCache = {}; const col = c => colCache[c] || (colCache[c] = new THREE.Color(c));
function pointsSys(size, cap, normal) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3)); geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 3), 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: glowTex, alphaTest: .01, vertexColors: true, transparent: true, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false }));
  p.frustumCulled = false; scene3.add(p); p.cap = cap; p.n = 0; return p;
}
  const sparkCap = 9000, sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkCap * 6), 3)); sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sparkCap * 6), 3));
const sparkSys = new THREE.LineSegments(sparkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sparkSys.frustumCulled = false; sparkSys.n = 0;
scene3.add(sparkSys);
  const ptsS = pointsSys(2.4, 18000), ptsL = pointsSys(4.8, 9000), ptsN = pointsSys(6, 3500, true), ptsG = pointsSys(9.5, 2200);
function kill(m) { if (!m) return; scene3.remove(m); m.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); if (o.material && o.material !== OUT) o.material.dispose(); }); }
function setOp(m, a) { m.traverse(o => { if (o.material && o.material.transparent) o.material.opacity = a; }); }
const ringGeo = (r0, r1, a0 = 0, len = PI * 2, seg = 32) => new THREE.RingGeometry(r0, r1, seg, 1, a0, len);
const billboard = m => m.quaternion.copy(camera.quaternion);
const ghostPool = Array.from({ length: 14 }, () => { const mat = addMat('#ffffff', 0); const m = buildHuman(PALS.naruto, 'naruto', mat); m.mat = mat; m.root.visible = false; scene3.add(m.root); return m; });
const clonePool = Array.from({ length: 4 }, () => { const m = buildHuman(PALS.naruto, 'naruto'); m.root.visible = false; scene3.add(m.root); return m; });
const giantPool = Array.from({ length: 6 }, () => { const mat = addMat('#ffffff', .2); const m = buildHuman(PALS.naruto, 'sasuke', mat); m.mat = mat; m.root.visible = false; scene3.add(m.root); return m; });
const logMat = toon('#7a5530');
const SH = { ring: ringGeo(.82, 1), sphA: new THREE.SphereGeometry(1, 48, 32), sphB: new THREE.SphereGeometry(.7, 36, 24), plane: new THREE.PlaneGeometry(1, 1), circ: new THREE.CircleGeometry(1.6, 12) };
Object.values(SH).forEach(g => g.userData.shared = true);
function makeFx(o) {
  const g = new THREE.Group();
  switch (o.k) {
    case 'ring': { g.add(new THREE.Mesh(SH.ring, addMat(o.c))); const rg = new THREE.Mesh(SH.plane, new THREE.MeshBasicMaterial({ map: ringTex, color: o.c, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); rg.scale.setScalar(2.5); g.add(rg); break; }
    case 'dome': { const fm = c => addMat(c, .3, THREE.FrontSide); g.add(new THREE.Mesh(SH.sphA, fm(o.c))); g.add(new THREE.Mesh(SH.sphB, fm(o.c2))); const gw = new THREE.Sprite(spriteMat(glowTex, o.c, .55)); gw.scale.set(3.2, 3.2, 1); g.add(gw); break; }
    case 'pillar': { const h = 320; const a = new THREE.Mesh(new THREE.CylinderGeometry(o.w / 2, o.w / 2, h, 32, 12, true), addMat(o.c, .45)); a.position.y = h / 2; g.add(a); const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 8, 1, true), addMat('#ffffff')); b.position.y = h / 2; g.add(b); break; }
    case 'bolt': for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(o.w * .8, o.w * .8, 1), addMat(o.c)); s.add(new THREE.Mesh(new THREE.BoxGeometry(o.w * .3, o.w * .3, 1), addMat('#ffffff'))); g.add(s); } break;
    case 'streak': g.add(new THREE.Mesh(new THREE.BoxGeometry(o.w, o.w, 1), addMat(o.c))); break;
    case 'mark': { const a1 = new THREE.Mesh(SH.plane, addMat(o.c)); a1.userData.h = o.w * 1.6; const a2 = new THREE.Mesh(SH.plane, addMat('#ffffff')); a2.userData.h = o.w * .5; g.add(a1, a2); break; }
    case 'impact': [0, PI / 2, PI / 4, -PI / 4].forEach((a, i) => { const b = new THREE.Mesh(SH.plane, addMat(i < 2 ? '#ffffff' : '#fff6b0')); b.rotation.z = a; b.userData.h = i < 2 ? .7 : .45; g.add(b); }); g.add(new THREE.Mesh(SH.circ, addMat('#ffffff'))); { const fl = new THREE.Sprite(spriteMat(flareTex, '#ffffff', 1)); fl.userData.fl = 1; g.add(fl); const gw = new THREE.Sprite(spriteMat(glowTex, o.c || '#ffd890', .9)); gw.userData.fl = 2; g.add(gw); } break;
    case 'shield': { const s = new THREE.Mesh(ringGeo(10, 12.5, -1.0, 2.0, 18), addMat(o.c, .8)); g.add(s); g.add(new THREE.Mesh(ringGeo(12, 12.6, -1.0, 2.0, 18), addMat('#ffffff'))); break; }
    case 'arc': { const s = -Math.max(o.a0, o.a1), len = Math.abs(o.a1 - o.a0); g.add(new THREE.Mesh(ringGeo(o.r - o.w, o.r, s, len, 40), addMat(o.c))); g.add(new THREE.Mesh(ringGeo(o.r - 1.2, o.r + .3, s, len, 40), addMat('#ffffff'))); break; }
    case 'cone': { const c = new THREE.Mesh(new THREE.ConeGeometry(o.r, o.len, 40, 6, true), addMat(o.c, .6)); c.rotation.x = -PI / 2; c.position.z = o.len / 2; g.add(c); const c2 = new THREE.Mesh(new THREE.ConeGeometry(o.r * .45, o.len, 16, 1, true), addMat('#ffffff', .8)); c2.rotation.x = -PI / 2; c2.position.z = o.len / 2; g.add(c2); break; }
    case 'beam': [[1, o.c, .45], [.62, o.c2 || '#ffd040', .7], [.28, '#ffffff', .95]].forEach(([k, c, op]) => { const m2 = new THREE.Mesh(new THREE.CylinderGeometry(o.r * k, o.r * k * 1.15, 1, 36, 8, true), addMat(c, op)); m2.userData.k = k; g.add(m2); }); { const s1 = new THREE.Mesh(SH.sphA, addMat(o.c2 || '#ffd040', .8)); s1.userData.tip = 1; g.add(s1); const s2 = new THREE.Mesh(SH.sphA, addMat('#ffffff', .9)); s2.userData.tip = 2; g.add(s2); } break;
    case 'spike': { const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1, 6), addMat(o.c, .85)); c.position.y = .5; g.add(c); const c2 = new THREE.Mesh(new THREE.ConeGeometry(.6, 1, 6), addMat('#ffffff', .9)); c2.position.y = .5; g.add(c2); g.rotation.set(R(-.3, .3), R(0, 6), R(-.3, .3)); break; }
    case 'spiral': for (let i = 0; i < 4; i++) { const r2 = new THREE.Mesh(ringGeo(.3 + i * .18, .42 + i * .18, i * PI / 2, PI * 1.2, 30), addMat(i % 2 ? o.c : '#ffffff', .8)); g.add(r2); } break;
  }
  scene3.add(g); return g;
}
function updateEffects(dt, t) {
  // 기린 용
  dragons = dragons.filter(d => {
    if (!d.segs) { d.g = new THREE.Group(); scene3.add(d.g); d.segs = []; for (let i = 0; i < 20; i++) { const r = i === 0 ? 4 : 3.2 - i * .12; const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), addMat('#bfe0ff', .85)); s.add(new THREE.Mesh(new THREE.SphereGeometry(r * .55, 10, 8), addMat('#ffffff'))); d.g.add(s); d.segs.push(s); } const jaw = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7, 10), addMat('#ffffff', .9)); jaw.position.y = -4; jaw.rotation.z = PI; d.segs[0].add(jaw); }
    d.t += dt; const dur = .6;
    d.segs.forEach((s, i) => { const u = clampv((d.t - i * .03) / dur, 0, 1); s.visible = d.t > i * .03; s.position.set(d.x0 + (d.tgt.x - d.x0) * u + Math.sin(u * PI * 3 + i * .3) * 20 * (1 - u), 240 * (1 - u) + 4, d.z0 + (d.tgt.z - d.z0) * u + Math.cos(u * PI * 2 + i * .4) * 14 * (1 - u)); if (s.visible && Math.random() < .5) parts.push({ p: s.position.clone(), v: V3(R(-20, 20), R(-20, 20), R(-20, 20)), life: .5, c: pick(['#ffffff', '#bfe0ff', '#7aaaff']), g: 0, s: 2 }); if (i === 0) light(s.position, '#9fc8ff', 6); });
    if (!d.hit && d.t >= dur) { d.hit = true; const p = d.tgt; for (let i = 0; i < 6; i++) bolt(p.clone().add(V3(R(-10, 10), 260, R(-10, 10))), p.clone().add(V3(0, 1, 0)), i ? '#9fc8ff' : '#ffffff', 1.4, 2.6); pillar(p, 28, '#9fc8ff', 1.2); moses(p, p, 18, 2.6); ripple(p.x, p.z, 2.6); dome(p.clone().add(V3(0, 6, 0)), 34, '#9fc8ff'); for (let i = 0; i < 4; i++) ring(V3(p.x, .5, p.z), 3 + i * 5, i % 2 ? '#9fc8ff' : '#ffffff', true); explode(p.clone().add(V3(0, 8, 0)), 'bolt', 2.8); shake = 16;
      const o = d.o, b = d.b, a = d.a; if (o === 'hit') wound(b, a, '기린!'); else if (o === 'sub') substitute(b, a); else if (o === 'block') { shield(b, '#9fc8ff'); label(headP(b), '막기!', '#9fd8ff'); } else label(headP(b), '회피!', '#b0ffb0'); }
    if (d.t > dur) d.segs.forEach(s => s.scale.multiplyScalar(.9));
    if (d.t > dur + .5) { kill(d.g); return false; } return true;
  });
  // 방출기
  emitters = emitters.filter(e => (e.life -= dt) > 0);
  emitters.forEach(e => {
    if (e.k === 'flames') for (let i = 0; i < 6; i++) parts.push({ p: e.p.clone().add(V3(R(-7, 7), R(0, 4), R(-7, 7))), v: V3(R(-5, 5), R(20, 60), R(-5, 5)), life: 1, c: e.fire ? pick(ELEM.fire.parts) : pick(['#000000', '#120418', '#24082e']), g: -10, s: 2, n: !e.fire });
    if (e.k === 'vortex') for (let i = 0; i < 8; i++) { const an = t * 18 + i * .8, r = 10 * e.pw; parts.push({ p: e.p.clone().add(V3(Math.cos(an) * r, Math.sin(an * .5) * 3, Math.sin(an) * r)), v: V3(-Math.cos(an) * 40, 0, -Math.sin(an) * 40), life: .4, c: pick(ELEM[e.ek].parts), g: 0, s: 1 }); }
    if (e.k === 'stream') { const from = handP(e.f), to = chest(e.t); for (let i = 0; i < (e.wide ? 40 : 10); i++) parts.push({ p: from.clone(), v: to.clone().sub(from).normalize().multiplyScalar(R(150, 260)).add(V3(R(-20, 20), R(-20, 20), R(-20, 20)).multiplyScalar(e.wide ? 3.5 : 1)), life: e.wide ? .9 : .6, c: pick(ELEM.fire.parts), g: -20, s: 2 }); light(from, '#ff8a20', e.wide ? 8 : 3); }
  });
  // 날아가는 것
  projs.forEach(p => {
    if (p.done) return;
    p.age = (p.age || 0) + dt; p.dist = (p.dist || 0) + p.v.length() * dt;
    // 피한 투사체는 쫓아가지 않고 곧게 날아가다 사라짐 (계속 맴돌던 잔상 버그 수정)
    if (p.age > 2.4 || p.dist > 320 || p.p.y < WATER_H - 1) { p.done = true; burst(p.p, 6, [p.c, '#ffffff'], .8, 0, 1); ripple(p.p.x, p.p.z, .4 * p.size); return; }
    const tg = chest(p.target), want = tg.clone().sub(p.p).normalize().multiplyScalar(p.v.length()), passed = p.mode === 'jump' || p.mode === 'clash' || p.passed;
    if (!passed) p.v.lerp(want, Math.min(1, dt * p.homing * 3)); if (p.p.distanceTo(tg) < 10 && !passed && p.mode === 'jump') p.passed = true; p.p.addScaledVector(p.v, dt); p.rot += dt * 25;
    for (let i = 0; i < (p.size > 1.5 ? 6 : 3); i++) parts.push({ p: p.p.clone().add(V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(p.size * 4)), v: p.v.clone().multiplyScalar(-R(.05, .25)).add(V3(R(-15, 15), R(-15, 15), R(-15, 15))), life: R(.4, .8), c: p.ek ? pick(ELEM[p.ek].parts) : p.c, g: 0, s: p.size > 1.2 ? 2 : 1 });
    if (p.size > 1.5 && frame % 3 === 0) ripple(p.p.x, p.p.z, .25 * p.size);
    light(p.p, p.c, 1.5 * p.size);
    if (p.mode === 'deflect' && p.p.distanceTo(tg) < 7 + 2.5 * p.size) { const sp = p.v.length() * .9; p.v.copy(V3(R(-1, 1), R(.15, .6), R(-1, 1)).normalize().multiplyScalar(sp)); p.mode = 'jump'; p.passed = true; mark(p.p, R(0, PI), 16, '#ffffff', 1.2); burst(p.p, 10, ['#ffffff', p.c], 1.2); impact(p.p, 3); label(headP(p.target), '흘리기!', '#9fd8ff'); p.target.kb.addScaledVector(dirTo(p.owner, p.target), 50); return; }
    if (p.mode !== 'jump' && p.mode !== 'clash' && p.mode !== 'deflect' && p.p.distanceTo(tg) < 4 + 2.5 * p.size) {
      p.done = true;
      if (['bijuu', 'arrow', 'rasenshuriken', 'getsuga', 'fireball'].includes(p.kind) && p.size > 1.5) { if (p.size >= 2.2) ultBlast(p.p, p.ek, p.kind === 'bijuu' ? 80 : 60, null, p.nm); else { dome(p.p, 14 * p.size, p.c); shake = 12; } others(p.owner).forEach(o => { if (o !== p.target && o.pos.distanceTo(p.p) < 40 * p.size) resolve(p.owner, o, p.ek, pick(['hit', 'jump', 'block']), (p.nm || '') + '!', 1.5); }); }
      if (p.ek) explode(p.p, p.ek, p.size); else burst(p.p, 8, ELEM.metal.parts, 1.5);
      if (p.mode === 'block') { shield(p.target, '#ffffff'); label(headP(p.target), '막기!', '#9fd8ff'); }
      else if (p.mode === 'sub') substitute(p.target, p.owner);
      else if (p.mode === 'hit') wound(p.target, p.owner, (p.nm || '명중') + '!', p.ek);
    }
    if (p.p.length() > 400) p.done = true;
  });
  for (let i = 0; i < projs.length; i++) for (let j = i + 1; j < projs.length; j++) { const p = projs[i], q = projs[j]; if (!p.done && !q.done && p.owner !== q.owner && p.p.distanceTo(q.p) < 6 + 2 * (p.size + q.size)) { p.done = q.done = true; const m = p.p.clone().lerp(q.p, .5), big = Math.max(p.size, q.size); explode(m, p.ek || 'metal', 1.3 * big); explode(m, q.ek || 'metal', 1.3 * big); if (big > 1.5) { dome(m, 16 * big, '#ffffff'); shot('ult', 2.6, p.owner, q.owner); } clashes++; shake = 10 + big * 2; label(m, '상쇄!', '#ffffff', { big: true, life: 1.2 }); } }
  projs = projs.filter(p => { if (p.done) { kill(p.mesh); return false; } if (!p.mesh) p.mesh = makeProj(p); p.mesh.position.copy(p.p); p.mesh.lookAt(p.p.clone().add(p.v)); p.mesh.scale.setScalar(p.size * 1.6 * (1 + Math.sin(p.age * 30) * .06)); if (p.spin) p.spin.rotation.z = p.rot; if (p.glow) p.glow.rotation.z = -p.rot * .5; return true; });
  // 분신
  clones = clones.filter(c => {
    c.t += dt; const tg = c.target, d = V3(tg.pos.x - c.pos.x, 0, tg.pos.z - c.pos.z), l = d.length(); c.heading = Math.atan2(d.z, d.x);
    if (c.state === 'run') { c.pos.addScaledVector(d.normalize(), 200 * dt); c.run += dt * 14; c.c.legF = Math.sin(c.run) * .9; c.c.legB = Math.sin(c.run + PI) * .9; c.c.kneeF = .15 + Math.max(0, Math.cos(c.run)) * 1.3; c.c.kneeB = .15 + Math.max(0, Math.cos(c.run + PI)) * 1.3; c.c.arm = -Math.sin(c.run) * .7; c.c.fore = c.c.arm + 1.45; c.c.barm = Math.sin(c.run) * .7; c.c.bfore = c.c.barm + 1.45; c.c.lean = 5; if (l < 8) { c.state = 'hit'; c.t2 = 0; } }
    else { c.t2 += dt; Object.assign(c.c, { arm: 1.57, fore: 1.57, lean: 4 }); if (c.t2 > .1 && !c.done) { c.done = true; const o = pick(['hit', 'block', 'block', 'dodge']); if (o === 'hit') wound(tg, c.owner, '분신 공격!'); else if (o === 'block') clash(c.owner, tg, '막기!'); else label(headP(tg), '분신 격파!', '#c08aff'); burst(c.pos.clone().add(V3(0, 8, 0)), 12, ['#e8e8f0', '#ffffff'], .8, -10, 2); label(c.pos.clone().add(V3(0, 18, 0)), '펑!', '#ffffff', { life: .8 }); } }
    c.m.root.visible = true; poseModel(c.m, { pos: c.pos, heading: c.heading, c: c.c, speed: 1 }, t);
    if (c.done || c.t > 3) { c.m.root.visible = false; c.m.busy = false; return false; } return true;
  });
  // 잔상
  ghosts = ghosts.filter(g => (g.life -= g.dec || .12) > 0);
  ghostPool.forEach((m, i) => { const g = ghosts[ghosts.length - 1 - i]; m.root.visible = !!g; if (g) { poseModel(m, { pos: g.pos, heading: g.heading, c: g.c, stretch: g.stretch }, t); m.mat.color.set(g.color); m.mat.opacity = g.life * .45; } });
  // 거대 형상 (수사노오·구미·아수라·기어5)
  giants = giants.filter(g => (g.life -= dt) > 0 && F.includes(g.f));
  giantPool.forEach((m, i) => { const g = giants[i]; m.root.visible = !!g; if (g) { const f = g.f, grow = Math.min(1, (5 - Math.min(5, g.life)) * 3, g.life * 2); poseModel(m, { pos: f.pos.clone().sub(fwdOf(f).multiplyScalar(8)), heading: f.heading, c: f.c, scale: 2.8 * Math.max(.05, grow) }, t); m.mat.color.set(g.color); m.mat.opacity = .16 + .06 * Math.sin(t * 6); if (Math.random() < .6) parts.push({ p: f.pos.clone().add(V3(R(-20, 20), R(0, 60), R(-20, 20))), v: V3(0, R(20, 50), 0), life: .7, c: g.color, g: 0, s: 2 }); } });
  // 통나무
  logs = logs.filter(l => { l.life -= dt; if (!l.mesh) { l.mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 10, 10), logMat); l.mesh.rotation.z = .3; scene3.add(l.mesh); } l.mesh.position.copy(l.p).add(V3(0, 5, 0)); if (l.life <= 0) { scene3.remove(l.mesh); l.mesh.geometry.dispose(); return false; } return true; });
  // 일반 효과
  fx = fx.filter(o => {
    if (o.life0 === undefined) o.life0 = o.life;
    o.life -= o.k === 'impact' ? 1 : o.k === 'dome' ? dt * 1.6 : dt * (o.k === 'pillar' ? 1.2 : o.k === 'beam' ? 1 : o.k === 'spiral' ? 1.1 : 2.2);
    if (o.life <= 0) { kill(o.mesh); return false; }
    if (!o.mesh) o.mesh = makeFx(o);
    const m = o.mesh, a = Math.min(1, o.life * 1.4);
    switch (o.k) {
      case 'ring': o.r += o.grow * 60 * dt; m.position.copy(o.p); if (o.flat) m.rotation.x = -PI / 2; else billboard(m); m.scale.setScalar(o.r); setOp(m, o.life); break;
      case 'dome': o.r += (o.max - o.r) * Math.min(1, dt * 9); m.position.copy(o.p); m.scale.setScalar(o.r); m.rotation.y += dt * 5; setOp(m, Math.min(.45, o.life * .5)); break;
      case 'pillar': m.position.set(o.p.x, 0, o.p.z); m.scale.set(o.life, 1, o.life); setOp(m, o.life * .6); break;
      case 'bolt': { const pts = [o.p0]; for (let i = 1; i <= 8; i++) { const u = i / 8, q = o.p0.clone().lerp(o.p1, u); if (i < 8) q.add(V3(R(-4, 4), R(-3, 3), R(-4, 4))); pts.push(q); } m.children.forEach((s, i) => { const p = pts[i], q = pts[i + 1]; s.position.copy(p).lerp(q, .5); s.lookAt(q); s.scale.z = p.distanceTo(q) + .4; }); setOp(m, a); break; }
      case 'streak': { o.p.addScaledVector(o.dir, 60 * dt); const len = o.len * (1.3 - o.life * .3); m.position.copy(o.p).addScaledVector(o.dir, len / 2); m.lookAt(o.p.clone().addScaledVector(o.dir, len)); m.scale.z = len; setOp(m, o.life); break; }
      case 'mark': { m.position.copy(o.p); billboard(m); m.rotateZ(o.a); const len = o.len * Math.min(1, (1.4 - o.life) * 3); m.children.forEach(c => c.scale.set(len, c.userData.h || 1, 1)); setOp(m, a); break; }
      case 'impact': { m.position.copy(o.p); billboard(m); const r = (o.r + (6 - o.life)) * 1.6; m.children.forEach((c, i) => { if (i < 4) c.scale.set(i < 2 ? r * 2 : r * 1.2, c.userData.h, 1); else if (c.userData.fl) { const s2 = Math.min(40, (c.userData.fl === 1 ? 1.5 : 1.1) * r * (.5 + o.life / 6)); c.scale.set(s2, s2, 1); c.material.rotation = o.life * .3; c.material.opacity = Math.min(.8, o.life / 4); } }); break; }
      case 'shield': { const f = o.f; m.position.copy(chest(f)).addScaledVector(fwdOf(f), 4); m.rotation.set(0, -f.heading + PI / 2, 0); m.scale.setScalar(.7); setOp(m, a * .8); break; }
      case 'arc': { const f = o.f, sc = (1 + (1 - o.life) * .45) * .85; m.position.copy(chest(f)); m.rotation.set(0, -f.heading, 0); m.scale.set(sc, sc, sc); setOp(m, a); break; }
      case 'cone': { m.position.copy(o.p); m.lookAt(o.p.clone().add(o.dir)); setOp(m, a * .85); break; }
      case 'beam': { const st = o.f ? handP(o.f) : o.p, en = o.t ? chest(o.t) : st.clone().addScaledVector(o.dir, o.len), d = en.clone().sub(st), L = d.length() || 1, fl = 1 + Math.sin(t * 45) * .15 + Math.random() * .1, grow = Math.min(1, (o.life0 - o.life) * 6);
        m.position.copy(st).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UPV, d.clone().normalize());
        m.children.forEach(c => { if (c.userData.tip) { c.position.set(0, c.userData.tip === 1 ? -L / 2 : L / 2, 0); c.scale.setScalar(o.r * (c.userData.tip === 1 ? .9 : 1.4) * fl); } else c.scale.set(fl * grow, L, fl * grow); }); setOp(m, a);
        for (let i = 0; i < 6; i++) parts.push({ p: st.clone().addScaledVector(d, Math.random()), v: V3(R(-30, 30), R(10, 60), R(-30, 30)), life: .6, c: pick(ELEM[o.ek || 'fire'].parts), g: -10, s: 2 });
        light(en, o.c, 6); light(st, o.c2 || '#ffd040', 4); if (frame % 3 === 0) { impact(en, 4); ripple(en.x, en.z, .4); } break; }
      case 'spike': { const h = o.h * Math.min(1, (1.6 - o.life) * 6) * Math.min(1, o.life * 2); m.position.copy(o.p); m.scale.set(1, Math.max(.01, h), 1); setOp(m, a); break; }
      case 'spiral': { m.position.copy(o.p); billboard(m); m.rotateZ(t * 9); const s3 = 4 + (1.2 - o.life) * 14 * (o.life > .4 ? 1 : -1.2); m.scale.setScalar(Math.max(.5, s3)); setOp(m, a); break; }
    }
    return true;
  });
  // 순간 불빛
  lights.forEach(l => { l.intensity *= .82; });
  // 알갱이: 매 프레임 새 배열 만들지 않고 제자리 압축(filter 할당 = GC 끊김의 주범) + 상한으로 폭주 차단
  for (let pi = parts.length - 1; pi >= 0; pi--) { const p = parts[pi]; p.life -= dt * 1.6; if (p.life <= 0) { parts[pi] = parts[parts.length - 1]; parts.pop(); } }
  const PCAP = (window.AAA && AAA.ultra) ? 1500 : ftAvg > 18 ? 480 : 850;
  if (parts.length > PCAP) parts.splice(0, parts.length - PCAP);
  [ptsS, ptsL, ptsN, ptsG].forEach(s => s.n = 0); sparkSys.n = 0; const spP = sparkGeo.attributes.position, spC = sparkGeo.attributes.color;
  parts.forEach(p => {
    p.p.addScaledVector(p.v, dt); p.v.y -= p.g * dt; if (p.p.y < WATER_H && p.g > 0) { if (p.v.y < -60 && Math.random() < .08) ripple(p.p.x, p.p.z, .15); p.p.y = WATER_H; p.v.y *= -.15; p.v.x *= .5; p.v.z *= .5; }
    if (!p.n && p.s < 3 && sparkSys.n < sparkCap) { const sp2 = p.v.lengthSq(); if (sp2 > 3600) { const c0 = col(p.c), a3 = Math.min(1, p.life * 1.6), k = p.s >= 2 ? .06 : .045, i6 = sparkSys.n; spP.setXYZ(i6 * 2, p.p.x, p.p.y, p.p.z); spP.setXYZ(i6 * 2 + 1, p.p.x - p.v.x * k, p.p.y - p.v.y * k, p.p.z - p.v.z * k); spC.setXYZ(i6 * 2, Math.min(1, c0.r * a3 + .55 * a3), Math.min(1, c0.g * a3 + .55 * a3), Math.min(1, c0.b * a3 + .55 * a3)); spC.setXYZ(i6 * 2 + 1, 0, 0, 0); sparkSys.n++; if (p.s < 2) return; } }
    const sys = p.n ? ptsN : p.s >= 3 ? ptsG : p.s >= 2 ? ptsL : ptsS; if (sys.n >= sys.cap) return;
    const c = col(p.c), a2 = p.n ? 1 : Math.min(1, p.life * 1.5);
    sys.geometry.attributes.position.setXYZ(sys.n, p.p.x, p.p.y, p.p.z); sys.geometry.attributes.color.setXYZ(sys.n, c.r * a2, c.g * a2, c.b * a2); sys.n++;
  });
  [ptsS, ptsL, ptsN, ptsG].forEach(s => { s.geometry.setDrawRange(0, s.n); s.geometry.attributes.position.needsUpdate = s.geometry.attributes.color.needsUpdate = true; });
  sparkGeo.setDrawRange(0, sparkSys.n * 2); spP.needsUpdate = spC.needsUpdate = true;
  if (frame % 20 === 0) ripple(R(-140, 140), R(-140, 100), .12);
}
function makeProj(p) {
  const g = new THREE.Group(), c = p.c;
  switch (p.kind) {
    case 'fireball': g.add(new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), addMat('#ff3a00', .3))); g.add(new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), addMat('#ff6a10', .8))); g.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), addMat('#ffe080'))); break;
    case 'bijuu': { g.add(new THREE.Mesh(new THREE.SphereGeometry(5, 18, 14), new THREE.MeshBasicMaterial({ color: '#120818' }))); g.add(new THREE.Mesh(new THREE.SphereGeometry(6.6, 18, 14), addMat('#ff7a1a', .45))); g.add(new THREE.Mesh(new THREE.SphereGeometry(9, 18, 14), addMat('#8a2aff', .22))); const gl = new THREE.Group(); [0, 1, 2].forEach(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(8 + i * 1.5, .5, 6, 32), addMat(i === 1 ? '#ffffff' : '#ff9a3a', .6)); r.rotation.set(i * 1.1, i * .7, 0); gl.add(r); }); g.add(gl); p.glow = gl; break; }
    case 'arrow': { g.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 26), addMat('#cfe8ff'))); const sh = new THREE.Mesh(new THREE.CylinderGeometry(3.2, .6, 44, 10, 1, true), addMat('#8a6aff', .35)); sh.rotation.x = PI / 2; sh.position.z = -6; g.add(sh); const gl = new THREE.Group(); for (let i = 0; i < 5; i++) { const b2 = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, R(10, 20)), addMat('#ffffff', .9)); b2.position.set(R(-3, 3), R(-3, 3), R(-14, 6)); b2.rotation.set(R(-.4, .4), R(-.4, .4), 0); gl.add(b2); } g.add(gl); p.glow = gl; const hd = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 8), addMat('#ffffff', .9)); hd.rotation.x = PI / 2; hd.position.z = 15; g.add(hd); break; }
    case 'rasenshuriken': { g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 14, 10), addMat('#4a9aff'))); const sp = new THREE.Group(); for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, .5), addMat('#ffffff', .8)); bl.rotation.z = i * PI / 2; bl.position.set(Math.cos(i * PI / 2) * 6, Math.sin(i * PI / 2) * 6, 0); sp.add(bl); } sp.add(new THREE.Mesh(ringGeo(8, 10), addMat('#9fe0ff', .6))); sp.add(new THREE.Mesh(new THREE.CircleGeometry(14, 40), addMat('#dff4ff', .28))); sp.add(new THREE.Mesh(ringGeo(13, 15), addMat('#ffffff', .5))); g.add(sp); p.spin = sp; break; }
    case 'getsuga': { const t = new THREE.Mesh(new THREE.TorusGeometry(7, 1.2, 8, 30, PI), addMat(c, .85)); t.rotation.z = -PI / 2; g.add(t); const t2 = new THREE.Mesh(new THREE.TorusGeometry(7, .45, 6, 30, PI), addMat('#ffffff')); t2.rotation.z = -PI / 2; g.add(t2); break; }
    case 'senbon': g.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .4, 9), addMat(c))); break;
    default: g.add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), addMat(c, .8))); g.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), addMat('#ffffff')));
  }
  scene3.add(g); return g;
}

// ═══ 카메라: 셋을 모두 담는 기본 화면 + 이따금 연출 화면 (최소 간격 길게, 부드럽게) ═══
const cam = { mode: 'base', t: 0, dur: 0, a: null, b: null, cool: 0, pos: V3(0, 55, 190), tgt: V3(0, 12, 0), side: 1, orbit: 0 };
function shot(mode, dur, a, b) {
  if (mode !== 'ult' && (cam.cool > 0 || cam.mode !== 'base')) return;
  if (mode === 'ult' && cam.mode === 'ult' && cam.t < cam.dur * .6) return;
  Object.assign(cam, { mode, dur, t: 0, a, b: b || (a && a.target) || null, side: Math.random() < .5 ? -1 : 1 });
  cam.cool = dur + 3.5;
}
function castFX(f, ult) {
  const e = f.elem || (f.ch.sig && f.ch.sig.elem) || 'power', E = ELEM[e] || ELEM.power, g = V3(f.pos.x, WATER_H + .2, f.pos.z);
  ring(g, 3, E.c, true, 1, 1.6); ring(g, 2, '#ffffff', true, .8, 2.2); vortex(chest(f), e, ult ? 1 : .5, ult ? 1.6 : 1);
  for (let i = 0, cf = Math.max(6, Math.round((ult ? 140 : 60) * Math.min(1, FXM() / 1.3))); i < cf; i++) { const a = R(0, PI * 2), r = R(2, 8); parts.push({ p: g.clone().add(V3(Math.cos(a) * r, R(0, 4), Math.sin(a) * r)), v: V3(-Math.cos(a) * 10, R(60, 160), -Math.sin(a) * 10), life: 1, c: pick(E.parts), g: -10, s: 2 }); }
  light(chest(f), E.c, ult ? 8 : 4); ripple(f.pos.x, f.pos.z, ult ? 1.5 : .6); if (ult) { pillar(g, 10, E.c, 1); moses(g, g, 10, 1.6); }
}
function callout(f, text, ult) {
  castFX(f, ult);
  labels.push({ p: headP(f).add(V3(0, 9, 0)), rise: 0, text: text + '!', color: '#ffffff', stroke: WORLD[f.ch.world].stroke, life: 1.6, skill: true });
  if (ult && Math.random() < .5) shot('ult', 3.2, f, f.target); else if (Math.random() < .45) shot(pick(['quarter', 'over', 'low', 'side', 'top', 'close', 'duel', 'face', 'close']), R(2.4, 3.4), f, f.target);
}
function camUpdate(dt, idle) {
  cam.cool -= dt; cam.orbit += dt * .05;
  const ctr = V3(); F.forEach(f => ctr.add(f.pos)); ctr.multiplyScalar(1 / Math.max(1, F.length));
  let spread = 0; F.forEach(f => spread = Math.max(spread, f.pos.distanceTo(ctr)));
  const D = idle ? 56 : 50 + spread * .85, ang = Math.sin(cam.orbit) * .5;
  let pos = ctr.clone().add(V3(Math.sin(ang) * D, 18 + spread * .2, Math.cos(ang) * D)), tgt = ctr.clone().add(V3(0, 11, 0)), fov = 45;
  if (cam.mode === 'base' && cam.cool <= 0 && !idle && Math.random() < dt * .3) { const f0 = pick(F); if (f0) shot(pick(['close', 'duel', 'face', 'close']), R(2.6, 3.6), f0, f0.target); }
  if (cam.mode !== 'base' && cam.a) {
    cam.t += dt; if (cam.t > cam.dur) cam.mode = 'base';
    const a = cam.a, b = cam.b || pick(others(a)), pa = chest(a), pb = b ? chest(b) : pa.clone().add(fwdOf(a).multiplyScalar(20)), m = pa.clone().lerp(pb, .5), s = cam.side;
    const fw = fwdOf(a), rt = V3(-fw.z, 0, fw.x);
    switch (cam.mode) {
      case 'fp': pos = headP(a).addScaledVector(fw, -40).addScaledVector(rt, 18 * s).add(V3(0, 16, 0)); tgt = m; fov = 52; break;
      case 'over': pos = headP(a).addScaledVector(fw, -55).addScaledVector(rt, 26 * s).add(V3(0, 24, 0)); tgt = m; fov = 52; break;
      case 'quarter': pos = m.clone().addScaledVector(rt, 95 * s).addScaledVector(fw, -60).add(V3(0, 50, 0)); tgt = m; fov = 50; break;
      case 'side': pos = m.clone().addScaledVector(rt, 115 * s).add(V3(0, 18, 0)); tgt = m; fov = 50; break;
      case 'low': pos = m.clone().addScaledVector(rt, 85 * s).addScaledVector(fw, -40); pos.y = 6; tgt = m.clone().add(V3(0, 16, 0)); fov = 54; break;
      case 'top': pos = m.clone().add(V3(10 * s, 150, 70)); tgt = m; fov = 50; break;
      case 'close': pos = m.clone().addScaledVector(rt, (34 + pa.distanceTo(pb) * .45) * s).addScaledVector(fw, -14).add(V3(0, 9, 0)); tgt = m.clone().add(V3(0, 2, 0)); fov = 46; break; // 두 사람 가까이
      case 'duel': pos = pa.clone().addScaledVector(fw, -22).addScaledVector(rt, 12 * s).add(V3(0, 7, 0)); tgt = pb.clone().lerp(pa, .2); fov = 48; break; // 어깨 너머 맞대결
      case 'face': pos = headP(a).addScaledVector(fw, 24).addScaledVector(rt, 9 * s).add(V3(0, 1, 0)); tgt = headP(a).add(V3(0, -3, 0)); fov = 42; break; // 얼굴 클로즈업
      case 'ult': { // 필살기: 시전자 뒤쪽에서 크게 물러나 광역 효과 전체가 보이게
        const u = cam.t / cam.dur, mid2 = pa.clone().lerp(pb, .55), far = 120 + pa.distanceTo(pb) * .8;
        pos = pa.clone().addScaledVector(fw, -far * (.55 + u * .15)).addScaledVector(rt, far * .55 * s).add(V3(0, 55 + u * 15, 0)); tgt = mid2.clone().add(V3(0, 12, 0)); fov = 56;
        break; }
    }
  }
  pos.y = Math.max(pos.y, WATER_H + 3);
  const k = cam.mode === 'base' ? .035 : cam.mode === 'ult' ? .09 : .05;
  cam.pos.lerp(pos, k); cam.tgt.lerp(tgt, k);
  if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * .06; camera.updateProjectionMatrix(); }
  const sh = shake ? V3(R(-.5, .5), R(-.5, .5), 0).multiplyScalar(shake * .8) : V3(); shake = shake > .3 ? shake * .85 : 0;
  camera.position.copy(cam.pos).add(sh); camera.lookAt(cam.tgt);
}

// ═══ 화면 위 글자 ═══
const scr = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * HUD.LW, y: (1 - v.y) / 2 * HUD.LH, back: v.z > 1 }; };
const HUD = window.HUD = { LW: 640, LH: 380 }; // 2D 그림의 논리 좌표 공간(비트맵은 품질배율로 커져도 그림 코드는 이 공간만 씀 — 선명도만 상승)
function drawHud(q, extra) {
  const HW = HUD.LW, HH = HUD.LH, HX = HW / 2;
  hc.clearRect(0, 0, HW, HH);
  if (whiteout > .01) { hc.fillStyle = `rgba(${flashC},${whiteout})`; hc.fillRect(0, 0, HW, HH); whiteout *= .8; }
  const txt = (s, x, y, font, color, w = 3, stroke = '#000') => { hc.font = font; hc.lineJoin = 'round'; hc.lineWidth = w; hc.strokeStyle = stroke; hc.strokeText(s, x, y); hc.fillStyle = color; hc.fillText(s, x, y); };
  hc.textAlign = 'center';
  if (!q) { txt(extra, HX, 34, '15px Galmuri11, monospace', '#ffe8b0'); return; }
  const hp = Math.max(0, 100 - (q.progress || 0));
  void hp; // 소유자 요청(11-05): 교전 화면 위 레벨·남은 양(경험치) 상자는 시야를 가려 그리지 않음
  hc.textAlign = 'right'; txt('합 ' + clashes.toLocaleString(), HW - 10, 26, 'bold 16px Galmuri11, monospace', '#ffb030');
  hc.textAlign = 'center';
  F.forEach(f => { const p = scr(headP(f).add(V3(0, 4, 0))); if (!p.back) txt(f.name, p.x, p.y, '11px Galmuri11, monospace', '#ffffff', 3, WORLD[f.ch.world].stroke); });
  txt(q.step || '진행 중', HX, HH - 8, '13px Galmuri11, monospace', '#efe3cf');
  if (extra.more) { hc.textAlign = 'left'; txt('+' + extra.more + ' 동시 진행', 10, 26, '13px Galmuri11, monospace', '#ff9a3c'); }
  labels = labels.filter(l => l.life > 0);
  labels.forEach(l => {
    const p = scr(l.p); if (p.back) { l.life -= .02; return; }
    const pop = l.life > .85 ? 1 + (l.life - .85) * 3 : 1, size = l.skill ? 18 : l.big ? 22 : 14;
    const x = clampv(p.x, 90, HW - 90), y = clampv(p.y - l.rise, 30, HH - 30);
    hc.globalAlpha = Math.min(1, l.life * 2.5); hc.textAlign = 'center';
    const font = `bold ${Math.round(size * pop)}px Galmuri11, monospace`;
    if (l.skill) { txt(l.text, x, y, font, '#ffffff', 7, '#000'); txt(l.text, x, y, font, '#fff6d0', 3, l.stroke); } else txt(l.text, x, y, font, l.color, 4);
    hc.globalAlpha = 1; l.rise += l.skill ? .25 : .5; l.life -= .015;
  });
}

// ═══ 한 장면 ═══
// 화면 선명도: 2인 기준 해상도(resScale 1)를 하한으로 고정 — 인원이 늘어도 도트가 커지지 않게. 부하는 윤곽선·이펙트 수·그림자에서 줄인다.
// ftAvg = '한 장면 부담'(ms): 주사율에 묶여 남는 시간이 있으면 실제 계산 시간(wkAvg)으로 낮춰 보고, 장면이 밀리면 실제 간격 그대로. 창이 가려져 느려진 간격은 빼고 잰다.
let resScale = 1, ftAvg = 16, ivAvg = 16, wkAvg = 6, tickAcc = 0, tickN = 0;
// 60fps: 버거운 순간에는 화면에 동시에 그리는 이펙트 묶음 수를 제한(가장 오래된 것부터 숨김). 배경·인물·알갱이는 그대로.
let baseTop = null;
function fxBudget() {
  if (!baseTop) { if (frame < 2) return; baseTop = new Set(scene3.children); }
  const u = window.AAA && AAA.ultra; // 울트라는 이펙트 객체 상한도 함께 올려야 입자(도트)가 잘리지 않는다
  const cap = u ? (ftAvg > 20 ? 64 : ftAvg > 16.2 ? 140 : 1e9) : ftAvg > 18 ? 28 : ftAvg > 16.2 ? 48 : 1e9; let k = 0; const ch = scene3.children;
  for (let i = ch.length - 1; i >= 0; i--) { const o = ch[i]; if (baseTop.has(o)) continue; if (o.userData.fxHid) { o.visible = true; o.userData.fxHid = false; } if (!o.visible) continue; if (++k > cap) { o.visible = false; o.userData.fxHid = true; } }
}
function fitRes() { /* 화면 요소의 실제 가로세로 비율로 렌더 크기·카메라 비율·HUD 캔버스를 맞춘다(휴대폰 세로·가로 모두) */
  const cw = glCanvas.clientWidth || 640, chh = glCanvas.clientHeight || Math.round(cw * RH / RW), asp = Math.max(.42, Math.min(3.2, cw / Math.max(1, chh))), dpr = window.devicePixelRatio || 1;
  const qd = (window.getQuality && getQuality()) || 'mid', ult = qd === 'ultra' || !!(window.AAA && AAA.ultra), dprCap = qd === 'low' ? 1 : ult ? 3 : qd === 'high' ? 2 : 1.5;
  const ss = 1; /* 슈퍼샘플은 aaa.js 가 장면 전용 큰 판에서 처리(그리기 판·후처리는 1배) */ /* 울트라 슈퍼샘플링(aaa.js 가 프레임 여유로 1~2배 조절): 내부를 크게 그린 뒤 화면에서 축소 → 계단 감소 */
  let w = Math.round(Math.max(480, cw * Math.min(Math.max(dpr, 1), dprCap) * ss) * resScale), h = Math.round(w / asp); /* 표시 크기×DPR(품질별 상한)×슈퍼샘플 */
  const mob = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); // 11-07: 모바일 ultra 수동 선택 시 픽셀 예산 캡(VRAM ~950MB → 스마트폰 컨텍스트 상실 방지)
  const budget = ult ? (mob ? 9e6 : 20e6) : qd === 'high' ? (mob ? 5e6 : 9e6) : qd === 'mid' ? (mob ? 3e6 : 4e6) : 1.8e6; /* 화소 상한(11-07: 중간 1.8배·높음 2.1배·울트라 2.4배 — VRAM 안전선 내 최대. 감리 권고 준수) */
  const cap = Math.sqrt(budget / Math.max(1, w * h)); if (cap < 1) { w = Math.round(w * cap); h = Math.round(h * cap); }
  if (glCanvas.width !== w || glCanvas.height !== h) { renderer.setSize(w, h, false); const rk = Math.min(.5, 1280 / w); reflRT.setSize(Math.round(w * rk), Math.round(h * rk)); }
  if (Math.abs(camera.aspect - asp) > .001) { camera.aspect = asp; camera.updateProjectionMatrix(); }
  const hk = ult ? (mob ? 3 : 4) : qd === 'high' ? 2 : qd === 'mid' ? 1.5 : 1, hw = Math.round(640 * hk), hh = Math.round(hw / asp); // HUD 2D 겹 비트맵 배율(글자·입자 선명도), 그림은 논리 640 공간 유지
  if (hud.width !== hw || hud.height !== hh) { hud.width = hw; hud.height = hh; hc.setTransform(hw / 640, 0, 0, hw / 640, 0, 0); }
  HUD.LW = 640; HUD.LH = Math.round(640 / asp);
}
try { new ResizeObserver(fitRes).observe(glCanvas); } catch (e) { }
fitRes();
let lastNow = 0;
initFighters();
function scene(now, q, extra) {
  const t = now / 1000, dt = Math.min(.05, lastNow ? (now - lastNow) / 1000 : .016) * (window.CINE && Number.isFinite(CINE.scale) ? Math.max(.28, CINE.scale) : 1); lastNow = now;
  const w0 = performance.now(), iv = now - (scene.prev || now); scene.prev = now;
  if (iv > 0 && iv < 100) ivAvg += (iv - ivAvg) * .05; // 100ms 넘는 간격(창 가림·탭 숨김)은 부담으로 치지 않음
  ftAvg = ivAvg > 17.5 ? ivAvg : Math.min(ivAvg, wkAvg * 1.6 + 2);
  /* 해상도 환류(11-07 감리): 평소엔 화소를 안 내림(소유자 규칙). 다만 24fps(울트라 24) 아래로 무너지면 72%까지 단계적 하강, 여유 회복 시 100% 복원 — 저사양 기본 사용자 방어 */
  if (!scene._fbT) scene._fbT = 0; /* 11-10: 환류 주기를 프레임→실시간(1.5초)로 — 낮은 fps에서 강등 결정이 수 초 늦어지는 것 방지 */
  if (now - scene._fbT > 1500) {
    scene._fbT = now;
    const u = window.AAA && AAA.ultra, hot = u ? 42 : 24, cool = u ? 26 : 13.5;
    /* 11-10 라운드M+: 과부하 땐 목표 티어로 굵은 단계(.78)로 곧장 — setSize/reAlloc 횟수를 줄여 진동(oscillation) 스톨 방지. 극과부하(ftAvg>hot*1.6)엔 60% 바닥 */
    const rT = ftAvg > hot * 1.6 ? .6 : ftAvg > hot ? .72 : 1;
    if (resScale > rT) { resScale = Math.max(rT, resScale * .78); fitRes(); }
    else if (ftAvg < cool && resScale < 1) { resScale = Math.min(1, resScale * 1.05); fitRes(); }
    if (ftAvg > (u ? 34 : 17.2) && OUT.visible) OUT.visible = false;
    else if (ftAvg < (u ? 28 : 13) && !OUT.visible) OUT.visible = true;
    // 파티클 생성량 거버너: 저FPS 지속 시 FXM(입자 밀도)를 최대 40%까지 낮춰 끊김 완화, 여유 회복 시 복원(캐릭터·배경보다 이펙트 우선 방어)
    if (window.AAA) { const A = window.AAA; A.perf = Number.isFinite(A.perf) ? A.perf : 1; const pFloor = ftAvg > hot * 1.5 ? .28 : .4; if (ftAvg > hot && A.perf > pFloor) A.perf = Math.max(pFloor, A.perf * .82); else if (ftAvg < cool && A.perf < 1) A.perf = Math.min(1, A.perf * 1.06); }
  }
  const idle = !q;
  if (!idle) update(dt * SPEED, t);
  else { F.forEach((f, i) => { f.c = { ...POSE.seal, legF: .3, legB: -.3, kneeF: .2, kneeB: .2 }; f.breath = Math.sin(t * 2 + i) * .7; }); updateEffects(dt, t); }
  blobs.forEach((b, i) => { const f2 = F[i]; b.visible = !!f2; if (f2) { const h = Math.max(0, f2.pos.y); b.position.set(f2.pos.x, .2, f2.pos.z); const s2 = 16 * (f2.scale || 1) / (1 + h * .02); b.scale.set(s2, s2, 1); } });
  F.forEach(f => {
    poseModel(f.model, f, t); physModel(f.model, f, dt * SPEED); f.model.root.updateMatrixWorld(true);
    const m = f.model, fl = f.flash > 0 ? 1 : 0;
    m.mats.forEach(mt => { if (mt.emissive) mt.emissive.setRGB(fl, fl, fl); });
    m.rasen.visible = f.hand === 'rasen'; m.rasen.scale.setScalar(f.handSize * (1 + Math.sin(t * 40) * .06)); m.rasen.rotation.y = t * 25; m.rr.rotation.x = t * 18;
    m.chid.visible = f.hand === 'chidori'; if (m.chid.visible) { m.chid.rotation.set(R(0, 6), R(0, 6), R(0, 6)); m.spikes.forEach(s => { s.rotation.set(R(0, 6), R(0, 6), R(0, 6)); s.scale.x = R(.5, 1.4); }); }
    m.glow.material.opacity = f.elem && !f.hand ? .25 + .15 * Math.sin(t * 30) : 0; if (f.elem) m.glow.material.color.set(ELEM[f.elem].c);
    if (f.hand) { const hp = handP(f); light(hp, f.hand === 'rasen' ? '#6ab8ff' : '#9fc8ff', 2 * f.handSize); if (f.hand === 'chidori' && Math.random() < .6) bolt(hp, hp.clone().add(V3(R(-8, 8), R(-8, 8), R(-8, 8))), '#cfe8ff', .35, .8); }
    const mode = f.mode > 0 ? f.modeK : null;
    if (m.coat.length && f.ch.key === 'ichigo') m.coat.forEach(c => c.visible = mode === 'bankai' || mode === 'hollow');
    if (m.mask) m.mask.visible = mode === 'hollow';
    if (m.mouthSword) m.mouthSword.visible = f.elem === 'slash';
    if (f.ch.key === 'luffy' && m.mats[0]) { const hair = m.mats.find(mt => mt.userData && mt.userData.hair); }
    m.eyeR.color.set(mode === 'kurama' ? '#ff5a10' : f.ch.P.eye); if (f.ch.key === 'naruto') m.eyeL.color.set(mode === 'kurama' ? '#ff5a10' : f.ch.P.eye);
    m.root.visible = true;
  });
  const k60 = Math.min(3, dt * 60); // 주사율이 60보다 높아도 같은 빠르기(1초 기준)
  fallTex.offset.y += .03 * k60;
  const rp = rain.geometry.attributes.position; for (let i = 0; i < rainN; i++) { let y = rp.getY(i * 2) - 5 * k60; if (y < 0) y += 280; rp.setY(i * 2, y); rp.setY(i * 2 + 1, y - 7); } rp.needsUpdate = true;
  if (Math.random() < .5 * k60) parts.push({ p: V3(R(-90, 90), R(0, 10), -290 + R(0, 20)), v: V3(R(-10, 10), R(10, 30), R(10, 30)), life: 1, c: '#7a8ea8', g: 0, s: 2 });
  camUpdate(dt, idle);
  camera.updateMatrixWorld(); waterUpdate(dt * SPEED, t);
  fxBudget(); renderer.render(scene3, camera);
  drawHud(q, extra);
  wkAvg += (performance.now() - w0 - wkAvg) * .05; // 이 장면 계산·그리기 제출에 실제로 든 시간
}
window.startScene = getState => {
  const loop = now => {
    const st = getState(), run = st ? st.quests.filter(q => q.status === 'run') : [];
    const doneN = st ? st.quests.filter(q => q.status === 'done').length : 0;
    try { scene(now, run[0], run[0] ? { lv: 10 + doneN * 5, more: run.length - 1 } : (st ? '모든 임무 완료! 수련 중' : '현황 불러오는 중…')); }
    catch (e) { console.error(e); queue = []; stepT = 0; pending = []; lanes = []; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
