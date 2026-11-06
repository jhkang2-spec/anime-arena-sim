// 기술별 고유 이펙트 — 기술 이름마다 다른 모양·색감·움직임 (개인 진행판 전용)
// 28가지 시그니처 무늬를 기술 이름 해시로 골라 시전·명중·광역에 붙인다.
// 그리기는 무늬 종류별 '인스턴스 묶음' 14개로 모아 그려서 이펙트가 많아도 그리기 호출 수는 늘지 않는다(60fps 유지).
(function () {
  if (typeof scene3 === 'undefined' || typeof callout !== 'function') return;
  const TAU = Math.PI * 2, UP = new THREE.Vector3(0, 1, 0), ZAX = new THREE.Vector3(0, 0, 1), YAX = new THREE.Vector3(0, 1, 0);
  const GROUND = .3;
  let clock = 0;

  // ── 그림(캔버스 텍스처) ──
  const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const tx = new THREE.CanvasTexture(c); tx.needsUpdate = true; return tx; };
  const srnd = (s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; })(1234567);
  const TEX = {
    glow: glowTex, flare: flareTex, ring: ringTex,
    white: cv(4, 4, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); }),
    streak: cv(128, 32, (g, w, h) => { const id = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ax = Math.pow(Math.sin(Math.PI * x / (w - 1)), .7), ay = Math.exp(-Math.pow((y - h / 2) / (h * .18), 2)), a = ax * ay, i = (y * w + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = Math.round(255 * a); } g.putImageData(id, 0, 0); }),
    crescent: cv(128, 128, (g) => { g.filter = 'blur(2px)'; const gr = g.createRadialGradient(64, 64, 20, 64, 64, 58); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(.8, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(80, 64, 52, 0, TAU); g.fill(); }),
    petal: cv(64, 128, (g) => { g.filter = 'blur(1px)'; const gr = g.createRadialGradient(32, 90, 4, 32, 70, 60); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.25)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 124); g.bezierCurveTo(4, 96, 2, 30, 26, 6); g.lineTo(32, 16); g.lineTo(38, 6); g.bezierCurveTo(62, 30, 60, 96, 32, 124); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, 120); g.lineTo(32, 30); g.stroke(); }),
    feather: cv(64, 128, (g) => { g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(32, 124); g.lineTo(32, 6); g.stroke(); g.lineWidth = 1; for (let y = 12; y < 116; y += 2.5) { const L = Math.sin((y - 6) / 116 * Math.PI) * 26; g.strokeStyle = `rgba(255,255,255,${.35 + .4 * srnd()})`; g.beginPath(); g.moveTo(32, y); g.quadraticCurveTo(32 - L * .5, y - 4, 32 - L, y - 9); g.moveTo(32, y); g.quadraticCurveTo(32 + L * .5, y - 4, 32 + L, y - 9); g.stroke(); } }),
    flame: cv(64, 128, (g) => { g.filter = 'blur(3px)'; const gr = g.createLinearGradient(0, 124, 0, 4); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(44, 40, 60, 70, 56, 98); g.bezierCurveTo(52, 122, 12, 122, 8, 98); g.bezierCurveTo(4, 70, 22, 40, 32, 4); g.fill(); }),
    rune: cv(256, 256, (g) => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 6; g.lineWidth = 3; [120, 104, 70].forEach(r => { g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); }); g.lineWidth = 2; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.lineTo(128 + Math.cos(a) * (i % 4 ? 110 : 120), 128 + Math.sin(a) * (i % 4 ? 110 : 120)); g.stroke(); }
      for (let i = 0; i < 12; i++) { const a = (i + .5) / 12 * TAU, cx = 128 + Math.cos(a) * 87, cy = 128 + Math.sin(a) * 87; g.save(); g.translate(cx, cy); g.rotate(a + Math.PI / 2); g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo((srnd() - .5) * 14, (srnd() - .5) * 14); g.lineTo((srnd() - .5) * 14, (srnd() - .5) * 14); } g.stroke(); g.restore(); }
      for (let t = 0; t < 2; t++) { g.beginPath(); for (let k = 0; k < 4; k++) { const a = (k / 3) * TAU + t * Math.PI / 3 - Math.PI / 2; const x = 128 + Math.cos(a) * 70, y = 128 + Math.sin(a) * 70; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.beginPath(); g.arc(128, 128, 18, 0, TAU); g.stroke(); }),
    hex: cv(128, 128, (g) => { g.shadowColor = '#fff'; g.shadowBlur = 8; g.strokeStyle = '#fff'; g.lineWidth = 6; g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 6 * TAU; const x = 64 + Math.cos(a) * 54, y = 64 + Math.sin(a) * 54; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.fill(); g.stroke(); }),
    ink: cv(256, 64, (g) => { g.fillStyle = '#fff'; for (let i = 0; i <= 160; i++) { const u = i / 160, x = 8 + u * 240, w = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), .5) * 26 * (1 - .25 * srnd()), y = 32 + Math.sin(u * 5) * 4; g.globalAlpha = .9; g.beginPath(); g.ellipse(x, y, 3.5, Math.max(.5, w / 2), 0, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 160; i++) { const x = 150 + srnd() * 100, y = 32 + (srnd() - .5) * 40; g.globalAlpha = .6; g.fillRect(x, y, srnd() * 14 + 2, 1); } }),
    smoke: cv(128, 128, (g) => { for (let i = 0; i < 22; i++) { const x = 64 + (srnd() - .5) * 60, y = 64 + (srnd() - .5) * 60, r = 18 + srnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } g.globalCompositeOperation = 'destination-in'; const m = g.createRadialGradient(64, 64, 10, 64, 64, 64); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, 128, 128); }),
  };

  // ── 인스턴스 묶음(무늬 종류별 1회 그리기) ──
  const IVS = `attribute vec4 iCol; varying vec4 vC; varying vec2 vUv; varying float vRim;
    void main() { vUv = uv; vC = iCol; vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal); vRim = 1.0 - abs(n.z); gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
  const IFS = `uniform sampler2D map; uniform float uHot; uniform float uRim; varying vec4 vC; varying vec2 vUv; varying float vRim;
    void main() { vec4 tx = texture2D(map, vUv); float a = tx.a * vC.a; if (uRim > 0.0) a *= (0.3 + vRim * uRim);
      if (a < 0.004) discard; float hot = clamp(pow(tx.a, 3.0) * uHot + (uRim > 0.0 ? pow(vRim, 3.0) * 0.7 : 0.0), 0.0, 1.0);
      gl_FragColor = vec4(mix(vC.rgb * tx.rgb, vec3(1.0), hot), a); }`;
  const PLANE = new THREE.PlaneGeometry(1, 1), SHARD = new THREE.OctahedronGeometry(1, 0), SPIKE = new THREE.ConeGeometry(1, 1, 6, 1); SPIKE.translate(0, .5, 0);
  function mkB(geo, tex, cap, blend = THREE.AdditiveBlending, hot = .55, rim = 0) {
    const g = geo.clone(), iCol = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); iCol.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iCol', iCol);
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, uHot: { value: hot }, uRim: { value: rim } }, vertexShader: IVS, fragmentShader: IFS, transparent: true, depthWrite: false, blending: blend, side: THREE.DoubleSide });
    const m = new THREE.InstancedMesh(g, mat, cap); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; m.renderOrder = 6; scene3.add(m);
    return { m, iCol, cap, n: 0 };
  }
  const B = {
    smoke: mkB(PLANE, TEX.smoke, 260, THREE.NormalBlending, 0),
    ink: mkB(PLANE, TEX.ink, 160, THREE.NormalBlending, 0),
    glow: mkB(PLANE, TEX.glow, 1600, THREE.AdditiveBlending, .5),
    flare: mkB(PLANE, TEX.flare, 240),
    ring: mkB(PLANE, TEX.ring, 260),
    streak: mkB(PLANE, TEX.streak, 1400, THREE.AdditiveBlending, .7),
    crescent: mkB(PLANE, TEX.crescent, 260, THREE.AdditiveBlending, .6),
    petal: mkB(PLANE, TEX.petal, 900, THREE.AdditiveBlending, .35),
    feather: mkB(PLANE, TEX.feather, 300, THREE.AdditiveBlending, .3),
    flame: mkB(PLANE, TEX.flame, 900, THREE.AdditiveBlending, .6),
    rune: mkB(PLANE, TEX.rune, 40, THREE.AdditiveBlending, .5),
    hex: mkB(PLANE, TEX.hex, 300, THREE.AdditiveBlending, .5),
    shard: mkB(SHARD, TEX.white, 420, THREE.AdditiveBlending, 0, 1.2),
    spike: mkB(SPIKE, TEX.white, 320, THREE.AdditiveBlending, 0, 1.1),
    // 어두운 무늬(검은 불꽃·미수옥 심·흑관 벽·흑 월아천충)는 보통 섞기로
    darkGlow: mkB(PLANE, TEX.glow, 160, THREE.NormalBlending, 0),
    flameDark: mkB(PLANE, TEX.flame, 300, THREE.NormalBlending, 0),
    crescentDark: mkB(PLANE, TEX.crescent, 60, THREE.NormalBlending, 0),
    darkPlane: mkB(PLANE, TEX.white, 40, THREE.NormalBlending, 0),
  };
  const BL = Object.values(B);

  // ── 내보내기 도우미 ──
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _bm = new THREE.Matrix4(), _c = new THREE.Color();
  const camPos = new THREE.Vector3();
  function put(b, pos, q, sx, sy, sz, col, a, k = 1) {
    if (b.n >= b.cap || !(a > .004)) return;
    const d = pos.distanceTo(camPos), r = Math.max(sx, sy);
    a *= clampv((d - r * .45) / (r * 1.5 + 2), 0, 1); // 카메라 가까이선 옅게 (화면 하얗게 덮임 방지)
    if (a <= .004) return;
    _s.set(sx, sy, sz); _m.compose(pos, q, _s); b.m.setMatrixAt(b.n, _m); b.iCol.setXYZW(b.n, col.r * k, col.g * k, col.b * k, Math.min(1, a)); b.n++;
  }
  function bb(b, pos, size, roll, col, a, k, sy) { size = Math.min(size, 80); _q2.setFromAxisAngle(ZAX, roll || 0); _q.copy(camera.quaternion).multiply(_q2); put(b, pos, _q, size, Math.min(sy || size, 80), 1, col, a, k); }
  function flat(b, pos, size, spin, col, a, k, sy) { _e.set(-Math.PI / 2, 0, spin || 0, 'YXZ'); _q.setFromEuler(_e); put(b, pos, _q, size, sy || size, 1, col, a, k); }
  function facing(b, pos, dir, roll, sx, sy, col, a, k) { _q.setFromUnitVectors(ZAX, _v.copy(dir).normalize()); _q2.setFromAxisAngle(ZAX, roll || 0); _q.multiply(_q2); put(b, pos, _q, sx, sy, 1, col, a, k); }
  function seg(b, p0, p1, w, col, a, k) { _x.subVectors(p1, p0); const L = _x.length(); if (L < .01) return; _x.multiplyScalar(1 / L); _w.addVectors(p0, p1).multiplyScalar(.5); _z.subVectors(camPos, _w); _z.addScaledVector(_x, -_z.dot(_x)); if (_z.lengthSq() < 1e-6) _z.set(0, 1, 0); _z.normalize(); _y.crossVectors(_z, _x); _bm.makeBasis(_x, _y, _z); _q.setFromRotationMatrix(_bm); put(b, _w, _q, L, w, 1, col, a, k); }
  function solid(b, pos, dir, sx, sy, sz, spin, col, a, k) { _q.setFromUnitVectors(YAX, _v.copy(dir).normalize()); if (spin) { _q2.setFromAxisAngle(YAX, spin); _q.multiply(_q2); } put(b, pos, _q, sx, sy, sz, col, a, k); }

  // ── 무늬 상태 도우미 ──
  const eo = u => 1 - Math.pow(1 - clampv(u, 0, 1), 3), ei = u => { u = clampv(u, 0, 1); return u * u; }, eio = u => { u = clampv(u, 0, 1); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  const fio = (u, a = .12, b = .35) => clampv(u / a, 0, 1) * clampv((1 - u) / b, 0, 1);
  const hr = (s, i) => { const v = Math.sin(i * 12.9898 + s.seed * .0007913 + 4.1) * 43758.5453; return v - Math.floor(v); };
  const side = (dir) => new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const P = (s) => s.follow && F.includes(s.follow) ? (s.hand ? handP(s.follow) : s.atFeet ? new THREE.Vector3(s.follow.pos.x, GROUND, s.follow.pos.z) : s.overHead ? headP(s.follow).add(new THREE.Vector3(0, 14 * s.S, 0)) : chest(s.follow)) : s.p;
  const W = new THREE.Color('#ffffff');
  const tmpC = new THREE.Color();
  const mixC = (a, b, t) => tmpC.copy(a).lerp(b, t);

  // ── 28가지 시그니처 무늬 ──
  const D = {
    lotus: { dur: 1.6, draw(s, u) { const c = s.p, f = fio(u, .1, .4); for (let L = 0; L < 3; L++) { const n = 8 + L * 4, op = eo(u * 2.2 - L * .25); for (let i = 0; i < n; i++) { const ang = i / n * TAU + L * .3 + s.rot * u, tilt = 1.35 - .95 * op - L * .12, len = (8 + L * 3) * s.S, wid = (4 + L * 1.4) * s.S;
      _e.set(-tilt, Math.PI / 2 - ang, 0, 'YXZ'); _q.setFromEuler(_e); _v.set(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar((1.5 + L * 2.2) * s.S * op); _w.copy(c).add(_v); _w.y += Math.cos(tilt) * len * .5; put(B.petal, _w, _q, wid, len, 1, mixC(s.c1, s.c2, L / 2), f * .9, 1.3); } }
      bb(B.glow, c, 12 * s.S * (1 + .15 * Math.sin(clock * 9)), 0, s.c3, f * .8); if (u < .35) bb(B.flare, c, 26 * s.S * eo(u * 3), u * 2, W, (1 - u / .35) * .7);
      for (let i = 0; i < 18; i++) { const y = ((hr(s, i) + u * 1.2) % 1) * 26 * s.S; _w.set(c.x + (hr(s, i + 40) - .5) * 20 * s.S, c.y + y, c.z + (hr(s, i + 80) - .5) * 20 * s.S); bb(B.glow, _w, 1.6 * s.S, 0, s.c2, f * (1 - y / (26 * s.S))); } } },
    runeCircle: { dur: 1.8, draw(s, u) { const c = s.p, f = fio(u, .12, .4), g = new THREE.Vector3(c.x, GROUND, c.z); flat(B.rune, g, 46 * s.S * eo(u * 2.5), s.rot * clock * 1.4, s.c1, f, 1.4); _w.copy(c); _w.y += 8 * s.S; flat(B.rune, _w, 26 * s.S * eo(u * 3 - .2), -s.rot * clock * 2.2, s.c2, f * .8, 1.2);
      for (let i = 0; i < 3; i++) { const uu = (u * 2 + i / 3) % 1; flat(B.ring, g, 50 * s.S * uu, 0, s.c3, f * (1 - uu) * .7); }
      for (let i = 0; i < 30; i++) { const a = hr(s, i) * TAU, r = 22 * s.S * Math.sqrt(hr(s, i + 7)), y = ((hr(s, i + 3) + u * 1.6) % 1) * 36 * s.S; _w.set(g.x + Math.cos(a) * r, g.y + y, g.z + Math.sin(a) * r); bb(B.glow, _w, 1.8 * s.S, 0, i % 3 ? s.c1 : s.c3, f * (1 - y / (36 * s.S))); } } },
    crescentFan: { dur: 1.1, draw(s, u) { const n = 5 + Math.floor(hr(s, 1) * 5), sd = side(s.dir), f = fio(u, .05, .5); for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 1.3, dist = eo(u * 1.2 - i * .03) * 46 * s.S; _v.copy(s.dir).multiplyScalar(Math.cos(a)).addScaledVector(sd, Math.sin(a)).normalize(); _w.copy(s.p).addScaledVector(_v, dist + 4);
      facing(B.crescent, _w, _v, s.rot * .6 + Math.PI / 2, 16 * s.S * (1 + u * .5), 16 * s.S * (1 + u * .5), i % 2 ? s.c1 : s.c2, f, 1.4); _x.copy(_w).addScaledVector(_v, -12 * s.S); seg(B.streak, _x, _w, 3 * s.S, s.c3, f * .6); } } },
    lightningTree: { dur: .9, init(s) { s.segs = []; const top = s.p.clone().add(new THREE.Vector3((hr(s, 1) - .5) * 40, 110 * s.S, (hr(s, 2) - .5) * 40)); let k = 0; const br = (a, b, depth, w) => { let prev = a.clone(); const N = 7; for (let i = 1; i <= N; i++) { const q = a.clone().lerp(b, i / N); if (i < N) q.add(new THREE.Vector3((hr(s, k++) - .5), (hr(s, k++) - .5) * .4, (hr(s, k++) - .5)).multiplyScalar(18 * s.S * (depth ? .6 : 1))); s.segs.push([prev, q, w]); if (depth < 2 && i > 1 && i < N - 1 && hr(s, k++) > .62) { const e = q.clone().add(new THREE.Vector3((hr(s, k++) - .5) * 60, -hr(s, k++) * 40, (hr(s, k++) - .5) * 60).multiplyScalar(s.S)); br(q, e, depth + 1, w * .55); } prev = q; } }; br(top, s.p, 0, 2.6 * s.S); },
      draw(s, u) { const f = fio(u, .02, .5); s.segs.forEach((sg, i) => { const fl = Math.sin(clock * 70 + i * 1.7) > -.4 ? 1 : .25; seg(B.streak, sg[0], sg[1], sg[2] * 3.2, s.c1, f * fl * .8, 1.3); seg(B.streak, sg[0], sg[1], sg[2] * 1.1, W, f * fl); });
        bb(B.flare, s.p, 30 * s.S, clock * 3, W, f * .7); flat(B.ring, new THREE.Vector3(s.p.x, GROUND, s.p.z), 40 * s.S * eo(u * 2), 0, s.c1, f * .8); } },
    flameWings: { dur: 1.6, draw(s, u) { const c = P(s), f = fio(u, .15, .4), sd = side(s.dir), flap = Math.sin(clock * 9) * .35; for (const sg of [-1, 1]) for (let k = 0; k < 12; k++) { const t = k / 11, spread = eo(u * 2.5) * (4 + t * 30) * s.S; _w.copy(c).addScaledVector(sd, sg * spread).addScaledVector(s.dir, -4 * s.S - t * t * 6 * s.S); _w.y += (Math.sin(t * 2.4 + flap) * 18 * t + 4) * s.S;
      bb(B.flame, _w, (6 + t * 6) * s.S, sg * (-.6 - t * .8 - flap * .5), mixC(s.c1, s.c2, t), f * (1 - t * .3), 1.3, (11 + t * 10) * s.S); if (k % 3 === 0) { bb(B.glow, _w, (5 + t * 4) * s.S, 0, s.c3, f * .5); } }
      if (Math.random() < .5) parts.push({ p: c.clone().add(new THREE.Vector3(R(-14, 14), R(0, 20), R(-14, 14)).multiplyScalar(s.S)), v: new THREE.Vector3(R(-30, 30), R(60, 140), R(-30, 30)), life: .8, c: '#' + s.c2.getHexString(), g: -20, s: 1 }); } },
    spiralGalaxy: { dur: 1.7, init(s) { s.tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(hr(s, 3) * 1.2 - .6, 0, hr(s, 4) * 1.2 - .6)); s.arms = 2 + Math.floor(hr(s, 5) * 3); },
      draw(s, u) { const f = fio(u, .1, .45), c = s.p; for (let a = 0; a < s.arms; a++) for (let j = 0; j < 28; j++) { const t = j / 27, r = t * 30 * s.S * eo(u * 1.5), ang = t * 5.2 + a * TAU / s.arms + clock * 2.4 * s.rot; _w.set(Math.cos(ang) * r, 0, Math.sin(ang) * r).applyQuaternion(s.tq).add(c); bb(B.glow, _w, (3.6 * (1 - t) + 1) * s.S, 0, mixC(s.c3, s.c1, t), f * (1 - t * .5), 1.2); if (j % 6 === 0) bb(B.flare, _w, 5 * s.S * (1 - t), clock, s.c2, f * .5); }
        bb(B.flare, c, 22 * s.S, clock * .7, s.c3, f * .7); bb(B.glow, c, 16 * s.S, 0, s.c1, f * .7); } },
    crystalBurst: { dur: 1.2, draw(s, u) { const f = fio(u, .03, .45); for (let i = 0; i < 20; i++) { _v.set(hr(s, i) - .5, hr(s, i + 30) * .9 - .2, hr(s, i + 60) - .5).normalize(); const d = eo(u * 1.4) * 32 * s.S * (.6 + hr(s, i + 90) * .6); _w.copy(s.p).addScaledVector(_v, d);
      solid(B.shard, _w, _v, 1.5 * s.S, 5.5 * s.S * (1 - u * .4), 1.5 * s.S, clock * 4 + i, i % 3 ? s.c1 : s.c3, f, 1.2); if (i % 2) bb(B.hex, _w, 3 * s.S, clock * 2, s.c2, f * .6); }
      bb(B.flare, s.p, 26 * s.S * (1 - u), 0, W, (1 - u) * .8); } },
    sakuraStorm: { dur: 2, draw(s, u) { const f = fio(u, .15, .35), c = P(s); for (let i = 0; i < 72; i++) { const r = (6 + hr(s, i) * 22) * s.S * eo(u * 2), ang = hr(s, i + 7) * TAU + clock * (1.4 + hr(s, i + 3)) * s.rot, y = ((hr(s, i + 11) + u * 1.3) % 1) * 38 * s.S - 6 * s.S; _w.set(c.x + Math.cos(ang) * r, c.y + y, c.z + Math.sin(ang) * r);
      const fl = Math.abs(Math.sin(clock * 6 + i)); bb(B.petal, _w, 2.4 * s.S * (.3 + fl * .7), clock * 3 + i, i % 4 === 0 ? W : i % 2 ? s.c1 : s.c2, f * .9, 1.2, 4.2 * s.S); } } },
    waterDragon: { dur: 1.5, draw(s, u) { const f = fio(u, .05, .3), p0 = P(s), p1 = s.to ? s.to() : s.p.clone().addScaledVector(s.dir, 60 * s.S), sd = side(s.dir), h = eo(u * 1.5); let head = null;
      for (let i = 0; i <= 44; i++) { const v = i / 44; if (v > h) break; _w.copy(p0).lerp(p1, v).addScaledVector(sd, Math.sin(v * Math.PI * 3 + clock * 5) * 9 * s.S * (1 - v * .4)); _w.y += Math.cos(v * Math.PI * 2 + clock * 3) * 5 * s.S + Math.sin(v * Math.PI) * 16 * s.S;
        const tail = 1 - (h - v) * 1.2; bb(B.ring, _w, (6 - v * 2) * s.S, clock + i, s.c1, f * clampv(tail, .2, 1) * .9, 1.2); bb(B.glow, _w, 3.2 * s.S, 0, s.c3, f * .7); head = _w.clone(); }
      if (head) { bb(B.flare, head, 18 * s.S, clock * 4, W, f * .8); bb(B.glow, head, 12 * s.S, 0, s.c2, f); if (Math.random() < .6) parts.push({ p: head.clone(), v: new THREE.Vector3(R(-40, 40), R(20, 80), R(-40, 40)), life: .7, c: '#' + s.c3.getHexString(), g: 200, s: 1 }); } } },
    shockDebris: { dur: 1.3, init(s) { for (let i = 0; i < 12; i++) parts.push({ p: new THREE.Vector3(s.p.x + R(-6, 6), GROUND + R(0, 3), s.p.z + R(-6, 6)), v: new THREE.Vector3(R(-30, 30), R(10, 40), R(-30, 30)), life: R(1.4, 2.2), c: pick(['#5a4a3c', '#6a5848', '#4a3e34']), g: -5, s: 3, n: true }); },
      draw(s, u) { const f = fio(u, .02, .4), g = new THREE.Vector3(s.p.x, GROUND, s.p.z); flat(B.ring, g, 60 * s.S * eo(u), 0, s.c1, f, 1.3); flat(B.ring, g, 40 * s.S * eo(u * 1.4 - .15), 0, s.c3, f * .7); flat(B.glow, g, 30 * s.S * (1 - u), 0, s.c2, f * .6);
        for (let i = 0; i < 18; i++) { const a = hr(s, i) * TAU, sp = (40 + hr(s, i + 5) * 60) * s.S, vy = (60 + hr(s, i + 9) * 90) * s.S, tt = u * 1.1; _w.set(g.x + Math.cos(a) * sp * tt, Math.max(GROUND, g.y + vy * tt - 160 * s.S * tt * tt), g.z + Math.sin(a) * sp * tt); _v.set(Math.cos(a), 1, Math.sin(a));
          solid(B.shard, _w, _v, 1.6 * s.S, 2.4 * s.S, 1.6 * s.S, clock * 6 + i, i % 3 ? s.c1 : s.c2, f * .8, .9); } } },
    slashFan: { dur: .8, draw(s, u) { const n = 3 + Math.floor(hr(s, 2) * 3); for (let i = 0; i < n; i++) { const uu = clampv((u - i * .07) * 1.6, 0, 1), f = fio(uu, .05, .6), roll = (hr(s, i) - .5) * 2.6 + s.rot * .4, sc = 24 * s.S * (.4 + eo(uu * 2) * .8);
      bb(B.crescent, s.p, sc, roll, i % 2 ? s.c1 : s.c2, f, 1.4); bb(B.crescent, s.p, sc * .82, roll + .05, W, f * .8); _x.set(Math.cos(roll), Math.sin(roll), 0).applyQuaternion(camera.quaternion); _w.copy(s.p).addScaledVector(_x, -sc * .9); _v.copy(s.p).addScaledVector(_x, sc * .9); seg(B.streak, _w, _v, 1.6 * s.S, s.c3, f * .8, 1.3); } } },
    starBurst: { dur: .9, draw(s, u) { const f = fio(u, .02, .55); for (let i = 0; i < 26; i++) { _v.set(hr(s, i) - .5, hr(s, i + 30) - .35, hr(s, i + 60) - .5).normalize(); const r0 = eo(u) * 6 * s.S, len = eo(u * 1.3) * 34 * s.S * (.5 + hr(s, i + 90)); _w.copy(s.p).addScaledVector(_v, r0); _x.copy(s.p).addScaledVector(_v, r0 + len); seg(B.streak, _w, _x, 2.2 * s.S, i % 2 ? s.c1 : s.c2, f, 1.4); }
      bb(B.flare, s.p, 34 * s.S * (1 - u * .6), u * 3, W, f * .8); bb(B.glow, s.p, 18 * s.S, 0, s.c1, f * .7); } },
    smokeRing: { dur: 1.8, draw(s, u) { const f = fio(u, .08, .5), g = new THREE.Vector3(s.p.x, GROUND + 3 + u * 8 * s.S, s.p.z), r = (6 + eo(u) * 32) * s.S; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + u * s.rot; _w.set(g.x + Math.cos(a) * r, g.y + Math.sin(a * 3 + clock) * 1.5, g.z + Math.sin(a) * r); bb(B.smoke, _w, (9 + hr(s, i) * 6) * s.S, a + clock * .3, mixC(s.c1, new THREE.Color('#1a1820'), .6), f * .55); }
      flat(B.ring, g, r * 2.1, 0, s.c1, f * .9, 1.3); flat(B.glow, g, r * 1.2, 0, s.c2, f * .35); } },
    featherScatter: { dur: 2, draw(s, u) { const f = fio(u, .1, .35); for (let i = 0; i < 28; i++) { const t = clampv(u * 1.2 - hr(s, i) * .2, 0, 1); _w.set(s.p.x + (hr(s, i + 3) - .5) * 30 * s.S + Math.sin(clock * 2.5 + i) * 6 * s.S, s.p.y + 18 * s.S - t * 30 * s.S + hr(s, i + 7) * 12 * s.S, s.p.z + (hr(s, i + 11) - .5) * 30 * s.S);
      bb(B.feather, _w, 3.2 * s.S, Math.sin(clock * 3 + i) * .9 + i, i % 3 ? s.c1 : W, f * .9, 1.2, 6.5 * s.S); } bb(B.glow, s.p, 20 * s.S * eo(u * 3), 0, s.c2, f * .4); } },
    hexShatter: { dur: 1.4, draw(s, u) { const n = 42; for (let i = 0; i < n; i++) { const y = 1 - (i + .5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996; _v.set(Math.cos(a) * rr, y, Math.sin(a) * rr); const ph = u < .45 ? 0 : (u - .45) / .55, f = clampv(u / .1, 0, 1) * (1 - ph), d = 18 * s.S + ph * ph * 50 * s.S;
      _w.copy(s.p).addScaledVector(_v, d); facing(B.hex, _w, _v, clock * ph * 4 + i, 6 * s.S * eo(u / .45), 6 * s.S * eo(u / .45), i % 3 ? s.c1 : s.c2, f * .85, 1.2); } if (u > .4 && u < .55) bb(B.flare, s.p, 40 * s.S, 0, W, .6); } },
    vortexColumn: { dur: 1.8, draw(s, u) { const f = fio(u, .1, .35), g = s.follow && F.includes(s.follow) ? new THREE.Vector3(s.follow.pos.x, GROUND, s.follow.pos.z) : new THREE.Vector3(s.p.x, GROUND, s.p.z); for (let i = 0; i < 64; i++) { const y = ((i / 64 + u * 2.2) % 1) * 56 * s.S * eo(u * 2), r = (3 + y * .32) * s.S, a = i * 2.4 + clock * 7 * s.rot; _w.set(g.x + Math.cos(a) * r, g.y + y, g.z + Math.sin(a) * r);
      bb(B.glow, _w, 2.4 * s.S, 0, mixC(s.c1, s.c3, y / (56 * s.S)), f, 1.2); if (i % 4 === 0) { _x.set(g.x + Math.cos(a - .5 * s.rot) * r, g.y + y - 2, g.z + Math.sin(a - .5 * s.rot) * r); seg(B.streak, _x, _w, 1.4 * s.S, s.c2, f * .8); } } flat(B.ring, g, 26 * s.S, clock * 3, s.c1, f * .7); } },
    thunderPillar: { dur: 1, draw(s, u) { const f = fio(u, .02, .45), g = new THREE.Vector3(s.p.x, GROUND, s.p.z); for (let i = 0; i < 7; i++) { const fl = Math.sin(clock * 60 + i * 2.1) > -.2 ? 1 : .2, ox = (hr(s, i) - .5) * 8 * s.S, oz = (hr(s, i + 9) - .5) * 8 * s.S; let prev = new THREE.Vector3(g.x + ox, 140 * s.S, g.z + oz); for (let k = 1; k <= 6; k++) { const q = new THREE.Vector3(g.x + ox + Math.sin(clock * 40 + k * 3 + i) * 3 * s.S, 140 * s.S * (1 - k / 6), g.z + oz + Math.cos(clock * 37 + k * 2 + i) * 3 * s.S); seg(B.streak, prev, q, (i ? 2.2 : 5) * s.S, i ? s.c1 : W, f * fl, 1.3); prev = q; } }
      flat(B.ring, g, 50 * s.S * eo(u * 2), 0, s.c1, f, 1.3); flat(B.glow, g, 34 * s.S, 0, s.c3, f * .6); if (Math.random() < .7) parts.push({ p: g.clone().add(new THREE.Vector3(R(-6, 6), 1, R(-6, 6))), v: new THREE.Vector3(R(-90, 90), R(60, 160), R(-90, 90)), life: .5, c: '#ffffff', g: 200, s: 1 }); } },
    petalSpiral: { dur: 1.7, draw(s, u) { const f = fio(u, .1, .4), g = new THREE.Vector3(s.p.x, GROUND + 1.5 + u * 6, s.p.z); for (let i = 0; i < 64; i++) { const r = Math.sqrt(i) * 3.4 * s.S * eo(u * 1.6 - i / 200), a = i * 2.39996 + u * 2.2 * s.rot; _w.set(g.x + Math.cos(a) * r, g.y + Math.sin(i + clock * 3) * .8, g.z + Math.sin(a) * r);
      flat(B.petal, _w, 2.6 * s.S, -a + Math.PI / 2, mixC(s.c3, s.c1, i / 64), f * .95, 1.3, 5 * s.S); } bb(B.glow, g, 14 * s.S, 0, s.c2, f * .5); } },
    inkBrush: { dur: 1.2, draw(s, u) { const n = 3 + Math.floor(hr(s, 3) * 3), dark = s.inkDark; for (let i = 0; i < n; i++) { const uu = clampv((u - i * .08) / .8, 0, 1), f = fio(uu, .02, .4), roll = (hr(s, i) - .5) * 2.8, L = 46 * s.S * eo(uu * 3); _x.set(Math.cos(roll), Math.sin(roll), 0).applyQuaternion(camera.quaternion); _w.copy(s.p).addScaledVector(_x, (L - 46 * s.S) * .5 + (hr(s, i + 5) - .5) * 8 * s.S);
      bb(B.ink, _w, L, roll, dark ? mixC(s.c1, new THREE.Color('#05030a'), .75) : s.c1, f * .9, 1, 11 * s.S); if (!dark) bb(B.streak, _w, L * .9, roll, W, f * .5, 1, 3 * s.S); }
      for (let i = 0; i < 14; i++) { _w.set(s.p.x + (hr(s, i + 20) - .5) * 30 * s.S, s.p.y + (hr(s, i + 30) - .5) * 24 * s.S, s.p.z + (hr(s, i + 40) - .5) * 30 * s.S); bb(B.ink, _w, 2.2 * s.S, i, dark ? mixC(s.c1, new THREE.Color('#05030a'), .7) : s.c2, fio(u, .2, .4) * .8, 1, 1.2 * s.S); } } },
    emberFountain: { dur: 1.8, draw(s, u) { const f = fio(u, .08, .35), g = new THREE.Vector3(s.p.x, GROUND, s.p.z); for (let i = 0; i < 56; i++) { const tt = ((u * 1.8 + hr(s, i)) % 1) * 1.1, a = hr(s, i + 3) * TAU, sp = (10 + hr(s, i + 6) * 24) * s.S, vy = (70 + hr(s, i + 9) * 60) * s.S; _w.set(g.x + Math.cos(a) * sp * tt, g.y + vy * tt - 110 * s.S * tt * tt, g.z + Math.sin(a) * sp * tt); if (_w.y < GROUND) continue;
      const vyy = vy - 220 * s.S * tt; bb(B.flame, _w, 2.4 * s.S, Math.atan2(-Math.cos(a) * sp, vyy) * .6, mixC(s.c2, s.c1, tt), f * (1 - tt * .6), 1.4, 4.6 * s.S); } bb(B.glow, g.clone().setY(GROUND + 4), 20 * s.S, 0, s.c1, f * .7); flat(B.ring, g, 24 * s.S, clock, s.c2, f * .6); } },
    iceBloom: { dur: 1.7, draw(s, u) { const f = fio(u, .05, .3), g = new THREE.Vector3(s.p.x, GROUND, s.p.z); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + hr(s, i) * .3, el = .55 + hr(s, i + 4) * .6; _v.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)); const L = eo(u * 2.5 - hr(s, i + 8) * .3) * 22 * s.S * (.6 + hr(s, i + 12) * .6); _w.copy(g).addScaledVector(_v, 3 * s.S);
      solid(B.spike, _w, _v, 2 * s.S, L, 2 * s.S, i, i % 3 ? s.c1 : W, f, 1.2); } for (let i = 0; i < 10; i++) { _w.set(g.x + (hr(s, i + 30) - .5) * 30 * s.S, g.y + hr(s, i + 40) * 20 * s.S, g.z + (hr(s, i + 50) - .5) * 30 * s.S); bb(B.flare, _w, 4 * s.S, clock * 2 + i, s.c3, f * (.4 + .6 * Math.abs(Math.sin(clock * 5 + i)))); } flat(B.ring, g, 46 * s.S * eo(u * 2), 0, s.c3, f * .8); } },
    soundRings: { dur: 1.3, draw(s, u) { const f = fio(u, .05, .3); for (let i = 0; i < 7; i++) { const t = (u * 1.6 + i / 7) % 1, d = t * 64 * s.S; _w.copy(s.p).addScaledVector(s.dir, d); facing(B.ring, _w, s.dir, 0, (8 + d * .45) * s.S / Math.max(.6, s.S) * s.S, (8 + d * .45) * s.S / Math.max(.6, s.S) * s.S, i % 2 ? s.c1 : s.c2, f * (1 - t), 1.3); }
      for (let i = 0; i < 12; i++) { const t = (u * 1.2 + hr(s, i)) % 1; _w.copy(s.p).addScaledVector(s.dir, t * 50 * s.S).addScaledVector(side(s.dir), (hr(s, i + 4) - .5) * 30 * s.S); _w.y += Math.sin(clock * 6 + i) * 6 * s.S; bb(B.flare, _w, 3.4 * s.S, clock * 2, s.c3, f * (1 - t)); } } },
    mistVeil: { dur: 2.2, draw(s, u) { const f = fio(u, .2, .4), c = P(s); for (let i = 0; i < 16; i++) { const a = hr(s, i) * TAU + clock * .4 * s.rot, r = (8 + hr(s, i + 3) * 22) * s.S; _w.set(c.x + Math.cos(a) * r, c.y + (hr(s, i + 6) - .4) * 18 * s.S, c.z + Math.sin(a) * r); bb(B.smoke, _w, (22 + hr(s, i + 9) * 16) * s.S, a, mixC(s.c3, W, .5), f * .32); }
      for (let i = 0; i < 12; i++) { _w.set(c.x + (hr(s, i + 20) - .5) * 40 * s.S, c.y + (hr(s, i + 21) - .5) * 24 * s.S, c.z + (hr(s, i + 22) - .5) * 40 * s.S); bb(B.flare, _w, 3 * s.S, 0, s.c1, f * Math.max(0, Math.sin(clock * 4 + i * 1.7))); } } },
    bloodSpikes: { dur: 1.4, draw(s, u) { const f = fio(u, .02, .35), p0 = s.follow && F.includes(s.follow) ? s.follow.pos : s.p, p1 = s.to ? s.to() : s.p.clone().addScaledVector(s.dir, 50 * s.S); for (let i = 0; i < 14; i++) { const t = i / 13, app = clampv((u - t * .35) * 6, 0, 1); if (!app) continue; _w.copy(p0).lerp(p1, t).addScaledVector(side(s.dir), (hr(s, i) - .5) * 10 * s.S); _w.y = GROUND; _v.set((hr(s, i + 3) - .5) * .7, 1, (hr(s, i + 6) - .5) * .7);
      solid(B.spike, _w, _v, 2.2 * s.S, 16 * s.S * eo(app) * (.6 + Math.sin(t * Math.PI) * .6), 2.2 * s.S, i, i % 3 ? s.c1 : s.c2, f, 1.1); if (app < 1) bb(B.ink, _w.clone().setY(GROUND + 4), 6 * s.S, i, mixC(s.c1, new THREE.Color('#200008'), .5), .8, 1, 3 * s.S); } } },
    sunHalo: { dur: 1.6, draw(s, u) { const f = fio(u, .12, .4), c = P(s), r = 16 * s.S * eo(u * 2); _w.copy(c).addScaledVector(s.dir, -5); bb(B.glow, _w, r * 1.8, 0, s.c1, f * .8, 1.2); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + clock * .8 * s.rot; _x.set(Math.cos(a), Math.sin(a), 0).applyQuaternion(camera.quaternion); const q = _w.clone().addScaledVector(_x, r); bb(B.flame, q, 3.2 * s.S, a - Math.PI / 2, mixC(s.c2, s.c1, (i % 3) / 2), f, 1.4, 7 * s.S); }
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - clock * .5 * s.rot; _x.set(Math.cos(a), Math.sin(a), 0).applyQuaternion(camera.quaternion); seg(B.streak, _w.clone().addScaledVector(_x, r * 1.15), _w.clone().addScaledVector(_x, r * 2), 1.6 * s.S, s.c3, f * .7); } } },
    chainOrbit: { dur: 1.6, init(s) { s.qs = [0, 1, 2].map(k => new THREE.Quaternion().setFromEuler(new THREE.Euler(k * 1.05 + hr(s, k) * .3, k * .7, hr(s, k + 3) * .6))); },
      draw(s, u) { const f = fio(u, .1, .4), c = P(s), R0 = 18 * s.S * eo(u * 2); s.qs.forEach((q, k) => { for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + clock * 3.4 * (k % 2 ? 1 : -1); _w.set(Math.cos(a) * R0, 0, Math.sin(a) * R0).applyQuaternion(q).add(c); bb(B.glow, _w, 3.6 * s.S, 0, k === 1 ? s.c2 : s.c1, f, 1.3); _x.set(Math.cos(a - .35) * R0, 0, Math.sin(a - .35) * R0).applyQuaternion(q).add(c); seg(B.streak, _x, _w, 1.6 * s.S, s.c3, f * .7); } }); bb(B.flare, c, 16 * s.S, clock, W, f * .6); } },
    meteorRain: { dur: 1.6, draw(s, u) { const g = new THREE.Vector3(s.p.x, GROUND, s.p.z), dd = new THREE.Vector3(.45, -1, .2).normalize(); for (let i = 0; i < 18; i++) { const t0 = hr(s, i) * .5, t = (u - t0) / .45; if (t < 0) continue; _w.set(g.x + (hr(s, i + 3) - .5) * 60 * s.S, 0, g.z + (hr(s, i + 6) - .5) * 60 * s.S);
      if (t < 1) { const hp = _w.clone().addScaledVector(dd, -(1 - t) * 160 * s.S); hp.y = Math.max(GROUND, hp.y); seg(B.streak, hp.clone().addScaledVector(dd, -22 * s.S), hp, 4 * s.S, s.c1, .9, 1.4); bb(B.glow, hp, 6 * s.S, 0, s.c2, .9); bb(B.flame, hp, 3 * s.S, 0, s.c3, .8, 1.3, 6 * s.S); }
      else if (t < 1.8) { const k = (t - 1) / .8; _w.y = GROUND; flat(B.ring, _w, 14 * s.S * eo(k), 0, s.c1, 1 - k); bb(B.glow, _w.clone().setY(GROUND + 2), 8 * s.S, 0, s.c2, (1 - k) * .8); } } } },
    butterflySwarm: { dur: 2, draw(s, u) { const f = fio(u, .1, .35), c = P(s); for (let i = 0; i < 22; i++) { const a = hr(s, i) * TAU + u * 2 * s.rot, r = eo(u * 1.3) * (10 + hr(s, i + 3) * 30) * s.S; _w.set(c.x + Math.cos(a) * r, c.y + Math.sin(clock * 3 + i) * 5 * s.S + hr(s, i + 6) * 14 * s.S - 4, c.z + Math.sin(a) * r); const flap = .5 + Math.sin(clock * 22 + i) * .45;
      for (const sg of [-1, 1]) { _x.set(sg, 0, 0).applyQuaternion(camera.quaternion); bb(B.petal, _w.clone().addScaledVector(_x, 1.2 * s.S * flap), 2.2 * s.S * flap + .3, sg * (1.2 + flap * .4), i % 2 ? s.c1 : s.c2, f, 1.4, 3.4 * s.S); } bb(B.glow, _w, 1.6 * s.S, 0, s.c3, f * .7); } } },
  };
  // 연속타 두 번째부터 쓰는 작은 번쩍임 (기술 색으로)
  D.mini = { dur: .38, draw(s, u) { const f = fio(u, .05, .6), roll = s.rot * 1.3 + hr(s, 1) * 3; bb(B.crescent, s.p, 14 * s.S * eo(u * 3), roll, s.c1, f, 1.4); bb(B.flare, s.p, 12 * s.S * (1 - u), roll, W, f * .7); for (let i = 0; i < 6; i++) { _v.set(hr(s, i) - .5, hr(s, i + 9) - .5, hr(s, i + 19) - .5).normalize(); seg(B.streak, s.p.clone().addScaledVector(_v, 2), s.p.clone().addScaledVector(_v, 2 + 12 * s.S * eo(u * 2)), 1.2 * s.S, s.c2, f); } } };
  const ALL = Object.keys(D).filter(k => k !== 'mini');
  const AFF = {
    flame: ['flameWings', 'emberFountain', 'sunHalo', 'meteorRain', 'starBurst', 'shockDebris', 'smokeRing', 'spiralGalaxy', 'lotus', 'chainOrbit'],
    spark: ['lightningTree', 'thunderPillar', 'starBurst', 'crescentFan', 'soundRings', 'chainOrbit', 'meteorRain', 'runeCircle', 'hexShatter', 'slashFan'],
    gust: ['vortexColumn', 'sakuraStorm', 'petalSpiral', 'featherScatter', 'mistVeil', 'butterflySwarm', 'spiralGalaxy', 'runeCircle', 'crescentFan', 'lotus'],
    shadow: ['inkBrush', 'spiralGalaxy', 'hexShatter', 'runeCircle', 'smokeRing', 'bloodSpikes', 'vortexColumn', 'crescentFan', 'featherScatter', 'chainOrbit'],
    frost: ['iceBloom', 'crystalBurst', 'hexShatter', 'mistVeil', 'starBurst', 'petalSpiral', 'lotus', 'runeCircle'],
    rock: ['shockDebris', 'crystalBurst', 'smokeRing', 'iceBloom', 'meteorRain', 'vortexColumn', 'starBurst', 'hexShatter'],
    splash: ['waterDragon', 'soundRings', 'lotus', 'spiralGalaxy', 'mistVeil', 'crescentFan', 'petalSpiral', 'vortexColumn'],
    metal: ['slashFan', 'crescentFan', 'starBurst', 'inkBrush', 'hexShatter', 'shockDebris', 'chainOrbit', 'runeCircle', 'meteorRain'],
    petal: ['sakuraStorm', 'petalSpiral', 'lotus', 'butterflySwarm', 'featherScatter'], insect: ['butterflySwarm', 'petalSpiral', 'featherScatter', 'chainOrbit'], sound: ['soundRings', 'starBurst', 'chainOrbit', 'shockDebris'],
    mist: ['mistVeil', 'featherScatter', 'vortexColumn', 'runeCircle'], blood: ['bloodSpikes', 'inkBrush', 'emberFountain', 'flameWings'], slash: ['slashFan', 'crescentFan', 'inkBrush', 'starBurst'],
    water: ['waterDragon', 'lotus', 'soundRings', 'spiralGalaxy', 'crescentFan'], ice: ['iceBloom', 'crystalBurst', 'hexShatter', 'mistVeil'], sun: ['sunHalo', 'flameWings', 'emberFountain', 'lotus'],
  };

  // ══ 원작 그대로: 유명 기술은 원작의 모양·움직임·색으로 ══
  const K = (c) => new THREE.Color(c), BLK = K('#05020a');
  const jag = (a, b, n, amp) => { const pts = [a]; for (let i = 1; i < n; i++) pts.push(a.clone().lerp(b, i / n).add(new THREE.Vector3(R(-amp, amp), R(-amp, amp), R(-amp, amp)))); pts.push(b); return pts; };
  const drawJag = (pts, w, c, a, k) => { for (let i = 1; i < pts.length; i++) seg(B.streak, pts[i - 1], pts[i], w, c, a, k); };
  const startOf = (s) => s.p0 || (s.p0 = s.p.clone());
  Object.assign(D, {
    // 나선환: 손 위 푸른 구 + 빠르게 도는 고리 + 감기는 바람
    rasengan: { dur: 1.2, draw(s, u) { const c = P(s), f = fio(u, .1, .3), r = 5 * s.S; bb(B.glow, c, r * 3.2, 0, s.c1, f, 1.3); bb(B.glow, c, r * 1.6, 0, W, f); for (let i = 0; i < 3; i++) { _v.set(Math.sin(clock * 9 + i * 2), Math.cos(clock * 7 + i), Math.sin(clock * 5 + i * 3)).normalize(); facing(B.ring, c, _v, clock * 20, r * 2.6, r * 2.6, i ? s.c2 : W, f * .8, 1.3); }
      for (let i = 0; i < 18; i++) { const a = clock * 16 + i * .7, rr = r * (1.1 + (i % 3) * .25); _w.set(c.x + Math.cos(a) * rr, c.y + Math.sin(a * .7 + i) * rr * .6, c.z + Math.sin(a) * rr); _x.set(c.x + Math.cos(a - .5) * rr, _w.y, c.z + Math.sin(a - .5) * rr); seg(B.streak, _x, _w, .9 * s.S, s.c3, f * .9); } } },
    // 나선수리검: 머리 위 흰·푸른 수리검 원반 + 바람 칼날 고리
    shurikenDisc: { dur: 1.3, draw(s, u) { drawShuriken(P(s), s.S * eo(u * 2.5), s, fio(u, .1, .3)); } },
    windBladeSphere: { dur: 1.2, draw(s, u) { const f = fio(u, .03, .45), r = eo(u * 1.6) * 34 * s.S; bb(B.glow, s.p, r * 2.2, 0, s.c1, f * .45); bb(B.flare, s.p, r * 1.2, clock, W, f * .6);
      for (let i = 0; i < 70; i++) { _v.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); _w.copy(s.p).addScaledVector(_v, r * Math.cbrt(Math.random())); _x.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(5 * s.S).add(_w); seg(B.streak, _w, _x, .7 * s.S, i % 3 ? W : s.c1, f, 1.4); }
      flat(B.ring, new THREE.Vector3(s.p.x, GROUND, s.p.z), r * 2.4, 0, s.c1, f * .8); } },
    // 미수옥: 검보라 구 + 주황 테 + 모여드는 차크라
    bijuuOrb: { dur: 1.4, draw(s, u) { drawBijuu(P(s), s.S * eo(u * 1.8), s, fio(u, .05, .25)); for (let i = 0; i < 26; i++) { const t = (u * 1.5 + hr(s, i)) % 1, a = hr(s, i + 4) * TAU, e2 = hr(s, i + 8) * 2 - 1; _v.set(Math.cos(a) * Math.sqrt(1 - e2 * e2), e2, Math.sin(a) * Math.sqrt(1 - e2 * e2)); _w.copy(P(s)).addScaledVector(_v, (1 - t) * 40 * s.S); bb(B.glow, _w, 2.4 * s.S, 0, i % 2 ? s.c2 : K('#b070ff'), (1 - t) * .9); } } },
    bijuuHit: { dur: 1.6, draw(s, u) { const f = fio(u, .02, .5), r = eo(u * 1.3) * 60 * s.S, g = new THREE.Vector3(s.p.x, GROUND, s.p.z); bb(B.darkGlow, s.p, r * 1.4 * (1 - u * .6), 0, BLK, f * .7); bb(B.glow, s.p, r * 2, 0, K('#7a2aff'), f * .5); flat(B.ring, g, r * 2.6, 0, s.c2, f, 1.4); flat(B.ring, g, r * 1.8, 0, K('#b070ff'), f * .7); if (u < .3) bb(B.flare, s.p, 60 * s.S, 0, W, (1 - u / .3) * .6);
      for (let i = 0; i < 24; i++) { _v.set(hr(s, i) - .5, hr(s, i + 3) * .7, hr(s, i + 6) - .5).normalize(); seg(B.streak, s.p.clone().addScaledVector(_v, r * .5), s.p.clone().addScaledVector(_v, r * 1.1), 3 * s.S, i % 2 ? s.c2 : K('#9a4aff'), f * .8, 1.3); } } },
    // 치도리·라이키리: 손에서 지지직 튀는 푸른 번개 + 짹짹 불티
    chidori: { dur: 1.3, draw(s, u) { const c = P(s), f = fio(u, .05, .3); bb(B.glow, c, 12 * s.S, 0, s.c1, f, 1.4); bb(B.flare, c, 9 * s.S, clock * 9, W, f * .9); for (let i = 0; i < 14; i++) { _v.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); drawJag(jag(c, c.clone().addScaledVector(_v, R(4, 11) * s.S), 3, 1.5 * s.S), (i % 3 ? .8 : 1.5) * s.S, i % 2 ? W : s.c1, f, 1.4); }
      if (s.follow && F.includes(s.follow)) { const g = new THREE.Vector3(c.x, GROUND, c.z).addScaledVector(s.dir, -6); drawJag(jag(c, g, 4, 2 * s.S), .9 * s.S, s.c1, f * .7, 1.3); }
      if (Math.random() < .8) parts.push({ p: c.clone(), v: new THREE.Vector3(R(-120, 120), R(-40, 120), R(-120, 120)), life: .35, c: '#ffffff', g: 100, s: 1 }); } },
    chidoriHit: { dur: .8, draw(s, u) { const f = fio(u, .02, .5); for (let i = 0; i < 16; i++) { _v.set(hr(s, i) - .5, hr(s, i + 3) - .4, hr(s, i + 6) - .5).normalize(); drawJag(jag(s.p, s.p.clone().addScaledVector(_v, eo(u * 2) * 26 * s.S), 4, 3 * s.S), 1.4 * s.S, i % 2 ? W : s.c1, f, 1.4); } bb(B.flare, s.p, 28 * s.S, clock * 4, W, f * .7); bb(B.glow, s.p, 20 * s.S, 0, s.c1, f * .7); } },
    // 기린: 하늘에서 내려꽂히는 번개 용
    lightningDragon: { dur: 1.4, draw(s, u) { const tg = s.to ? s.to() : s.p, top = tg.clone().add(new THREE.Vector3(30 * s.rot, 200, -20)), h = eo(u * 1.4), f = fio(u, .02, .3); const pts = []; for (let i = 0; i <= 40; i++) { const v = i / 40 * h, q = top.clone().lerp(tg, v); q.x += Math.sin(v * 9 + clock * 3) * 22 * (1 - v); q.z += Math.cos(v * 7 + clock * 2) * 18 * (1 - v); pts.push(q); }
      for (let i = 1; i < pts.length; i++) { const w = (6 - i / 40 * 2) * s.S; seg(B.streak, pts[i - 1], pts[i], w * 2, s.c1, f * .7, 1.3); seg(B.streak, pts[i - 1].clone().add(new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1))), pts[i], w * .6, W, f); } const hd = pts[pts.length - 1];
      bb(B.crescent, hd, 18 * s.S, Math.PI * .75, W, f, 1.4); bb(B.crescent, hd, 18 * s.S, -Math.PI * .25 + Math.sin(clock * 12) * .3, s.c1, f, 1.4); bb(B.flare, hd, 30 * s.S, clock * 3, W, f * .8); bb(B.glow, hd, 26 * s.S, 0, s.c1, f * .7); if (u > .6) flat(B.ring, new THREE.Vector3(tg.x, GROUND, tg.z), 80 * s.S * eo((u - .6) * 3), 0, s.c1, f, 1.3); } },
    // 아마테라스: 들러붙어 타는 검은 불꽃 (폭혈·차크라 망토는 같은 틀에 다른 색)
    blackFlames: { dur: 2.4, draw(s, u) { const c = s.follow && F.includes(s.follow) ? s.follow.pos : s.p, f = fio(u, .08, .35), H = 34 * s.S; for (let i = 0; i < 30; i++) { const a = hr(s, i) * TAU + clock * .5, rr = (5 + hr(s, i + 3) * 6) * s.S, ph = (clock * (1.2 + hr(s, i + 5)) + hr(s, i + 7)) % 1, y = ph * H; _w.set(c.x + Math.cos(a) * rr * (1 - ph * .4), c.y + y, c.z + Math.sin(a) * rr * (1 - ph * .4)); const sz = (4 + hr(s, i + 9) * 3) * s.S * (1 - ph * .6);
      if (s.dark) { bb(B.flame, _w, sz * 1.25, 0, s.c2, f * (1 - ph) * .7, 1.2, sz * 2.3); bb(B.flameDark, _w, sz, 0, BLK, f * (1 - ph * .7) * .95, 1, sz * 2); } else bb(B.flame, _w, sz, 0, mixC(s.c1, s.c2, ph), f * (1 - ph), 1.3, sz * 2); }
      if (Math.random() < .5) parts.push({ p: c.clone().add(new THREE.Vector3(R(-6, 6), R(4, 30), R(-6, 6))), v: new THREE.Vector3(R(-6, 6), R(14, 30), R(-6, 6)), life: 1.4, c: s.dark ? '#120818' : '#' + s.c2.getHexString(), g: -4, s: 3, n: !!s.dark }); } },
    sharinganEye: { dur: .9, draw(s, u) { const c = s.follow && F.includes(s.follow) ? headP(s.follow) : s.p, f = fio(u, .05, .4); bb(B.flare, c, 12 * s.S, clock * 6, s.c1, f, 1.4); bb(B.glow, c, 9 * s.S, 0, s.c1, f); for (let i = 0; i < 3; i++) bb(B.crescent, c, 6 * s.S, clock * 8 + i * TAU / 3, BLK.clone().lerp(s.c1, .3), f * .8); } },
    // 수사노오: 보라(이타치는 빨강) 갈비뼈 → 갑옷 거인
    susanoo: { dur: 2.2, draw(s, u) { const g = s.follow && F.includes(s.follow) ? s.follow.pos : s.p, dir = s.follow && F.includes(s.follow) ? fwdOf(s.follow) : s.dir, sd = side(dir), f = fio(u, .1, .3), up = eo(u * 2); for (let k = 0; k < 7; k++) { const y = (12 + k * 4.2) * s.S; if (k / 7 > up) break; const rr = (13 - Math.abs(k - 3) * 1.2) * s.S; let prev = null;
      for (let j = 0; j <= 10; j++) { const a = -Math.PI * .5 + j / 10 * Math.PI * (1 + k * .05); const q = new THREE.Vector3(g.x, g.y + y + Math.sin(j / 10 * Math.PI) * 2 * s.S, g.z).addScaledVector(dir, Math.sin(a) * rr - 4 * s.S); const q2 = q.clone().addScaledVector(sd, Math.cos(a) * rr), q3 = q.clone().addScaledVector(sd, -Math.cos(a) * rr); if (prev) { seg(B.streak, prev[0], q2, 2.4 * s.S, s.c1, f, 1.3); seg(B.streak, prev[1], q3, 2.4 * s.S, s.c1, f, 1.3); } prev = [q2, q3]; } }
      seg(B.streak, new THREE.Vector3(g.x, g.y + 8 * s.S, g.z).addScaledVector(dir, -6 * s.S), new THREE.Vector3(g.x, g.y + 44 * s.S * up, g.z).addScaledVector(dir, -6 * s.S), 3 * s.S, s.c3, f, 1.3);
      for (let i = 0; i < 26; i++) { const a = hr(s, i) * TAU, ph = (clock * .9 + hr(s, i + 3)) % 1; _w.set(g.x + Math.cos(a) * 18 * s.S, g.y + ph * 60 * s.S * up, g.z + Math.sin(a) * 18 * s.S); bb(B.flame, _w, 7 * s.S, 0, s.c1, f * (1 - ph) * .55, 1.1, 16 * s.S); }
      if (u > .45) { const hd = new THREE.Vector3(g.x, g.y + 52 * s.S, g.z); bb(B.glow, hd, 20 * s.S, 0, s.c1, f * .7); for (const sg of [-1, 1]) bb(B.flare, hd.clone().addScaledVector(sd, sg * 4 * s.S).addScaledVector(dir, 6 * s.S), 6 * s.S, 0, s.c3, f); } } },
    // 월아천충: 날아가는 거대 초승달 (투사체에 그림) · 명중은 갈라짐
    reiatsu: { dur: 1.4, draw(s, u) { const g = s.follow && F.includes(s.follow) ? s.follow.pos : s.p, f = fio(u, .1, .4); for (let i = 0; i < 22; i++) { const a = hr(s, i) * TAU, ph = (clock * 1.3 + hr(s, i + 3)) % 1; _w.set(g.x + Math.cos(a) * 9 * s.S, g.y + ph * 40 * s.S, g.z + Math.sin(a) * 9 * s.S); if (s.dark) bb(B.flameDark, _w, 6 * s.S, 0, BLK, f * (1 - ph) * .8, 1, 13 * s.S); bb(B.flame, _w, 6.5 * s.S, 0, s.c1, f * (1 - ph) * .7, 1.3, 14 * s.S); } } },
    getsugaHit: { dur: 1, draw(s, u) { const f = fio(u, .02, .5); facing(s.dark ? B.crescentDark : B.crescent, s.p, s.dir, Math.PI / 2, 40 * s.S * eo(u * 2), 40 * s.S * eo(u * 2), s.dark ? BLK : W, f * .9, 1); facing(B.crescent, s.p, s.dir, Math.PI / 2, 46 * s.S * eo(u * 2), 46 * s.S * eo(u * 2), s.c1, f, 1.4);
      const g = new THREE.Vector3(s.p.x, GROUND, s.p.z); _w.copy(g).addScaledVector(s.dir, -30 * s.S); _x.copy(g).addScaledVector(s.dir, 40 * s.S); seg(B.streak, _w, _x, 4 * s.S, s.c1, f, 1.3); for (let i = 0; i < 10; i++) parts.push({ p: g.clone().addScaledVector(s.dir, R(-20, 30)), v: new THREE.Vector3(R(-30, 30), R(40, 90), R(-30, 30)), life: .6, c: '#7a6248', g: 200, s: 2 }); } },
    // 센본자쿠라: 수천 개의 분홍 칼날 꽃잎 강물
    bladePetals: { dur: 2, draw(s, u) { const f = fio(u, .08, .3), p0 = P(s), p1 = s.to ? s.to() : s.p.clone().addScaledVector(s.dir, 60), sd = side(s.dir); for (let i = 0; i < 150; i++) { const t = ((u * 1.6 + hr(s, i)) % 1), ln = hr(s, i + 3) - .5, h = Math.sin(t * Math.PI); _w.copy(p0).lerp(p1, t).addScaledVector(sd, ln * 24 * s.S * h + Math.sin(t * 9 + i) * 3); _w.y += (hr(s, i + 6) - .3) * 14 * s.S * h + Math.cos(t * 7 + i) * 3;
      bb(B.petal, _w, .9 * s.S, clock * 9 + i, i % 5 ? s.c1 : W, f * .95, 1.4, 2.6 * s.S); if (i % 12 === 0) bb(B.flare, _w, 3 * s.S, clock * 3, W, f * .7); } } },
    // 고무고무: 쭉 뻗는 팔 속도선 + 충격 (개틀링은 주먹 잔상 다발)
    rubberPunch: { dur: .9, draw(s, u) { const f = fio(u, .02, .4), p0 = P(s), p1 = s.to ? s.to() : s.p.clone().addScaledVector(s.dir, 50), sd = side(s.dir); for (let i = 0; i < 12; i++) { const o2 = (hr(s, i) - .5) * 10 * s.S, oy = (hr(s, i + 4) - .5) * 8 * s.S, t = (u * 3 + hr(s, i + 8)) % 1; _w.copy(p0).lerp(p1, t * .7).addScaledVector(sd, o2); _w.y += oy; _x.copy(_w).addScaledVector(s.dir, 14 * s.S); seg(B.streak, _w, _x, .8 * s.S, W, f * .8); }
      if (s.gatling) { for (let i = 0; i < 16; i++) { const k = (u * 6 + hr(s, i)) % 1; _w.copy(p1).addScaledVector(sd, (hr(s, i + 2) - .5) * 18 * s.S).add(new THREE.Vector3(0, (hr(s, i + 5) - .5) * 16 * s.S, 0)); bb(B.glow, _w, 7 * s.S * (1 - k), 0, s.c1, f * (1 - k), 1.2); facing(B.ring, _w, s.dir, 0, 9 * s.S * k, 9 * s.S * k, W, f * (1 - k)); } }
      else { facing(B.ring, p1, s.dir, 0, 30 * s.S * eo(u * 2), 30 * s.S * eo(u * 2), W, f, 1.3); facing(B.ring, p1, s.dir, 0, 20 * s.S * eo(u * 2.5), 20 * s.S * eo(u * 2.5), s.c1, f, 1.3); bb(B.flare, p1, 26 * s.S * (1 - u), 0, W, f * .7); } } },
    // 기어 5: 하얀 구름 머리·하얀 연기 + 만화 같은 통통 고리 (기어 세컨드는 분홍 증기)
    gear5: { dur: 2.2, draw(s, u) { const g = s.follow && F.includes(s.follow) ? headP(s.follow) : s.p, f = fio(u, .1, .3); for (let i = 0; i < 20; i++) { const a = hr(s, i) * TAU + clock * .6, rr = (5 + hr(s, i + 3) * 9) * s.S, bob = Math.sin(clock * 5 + i) * 2; _w.set(g.x + Math.cos(a) * rr, g.y + (hr(s, i + 6) - .2) * 14 * s.S + bob - (s.steam ? 10 * s.S : 0), g.z + Math.sin(a) * rr); bb(B.smoke, _w, (9 + 3 * Math.sin(clock * 6 + i)) * s.S, a, s.c1, f * (s.steam ? .45 : .8)); }
      if (!s.steam) { for (let i = 0; i < 3; i++) { const k = (u * 2 + i / 3) % 1; bb(B.ring, g, 30 * s.S * k, 0, W, f * (1 - k) * .8); } for (let i = 0; i < 8; i++) { _w.set(g.x + (hr(s, i + 20) - .5) * 30 * s.S, g.y + (hr(s, i + 21) - .3) * 20 * s.S + Math.abs(Math.sin(clock * 6 + i)) * 6, g.z + (hr(s, i + 22) - .5) * 30 * s.S); bb(B.flare, _w, 5 * s.S, clock * 2, W, f * .8); } } } },
    // 진지한 펀치: 하늘을 가르는 충격파
    seriousPunch: { dur: 2, draw(s, u) { const f = fio(u, .02, .4), p0 = P(s), up = new THREE.Vector3(0, .35, 0), d = s.dir.clone().add(up).normalize(); for (let i = 0; i < 7; i++) { const k = (u * 1.4 + i / 7) % 1, dist = k * 220 * s.S; _w.copy(p0).addScaledVector(d, dist); facing(B.ring, _w, d, 0, (14 + dist * .5), (14 + dist * .5), i % 2 ? W : s.c1, f * (1 - k), 1.3); }
      for (let i = 0; i < 20; i++) { _w.copy(p0).addScaledVector(side(s.dir), (hr(s, i) - .5) * 30).add(new THREE.Vector3(0, (hr(s, i + 3) - .5) * 30, 0)); _x.copy(_w).addScaledVector(d, 120 * s.S * eo(u * 2)); seg(B.streak, _w, _x, 2 * s.S, W, f * .7); }
      const sky = p0.clone().addScaledVector(s.dir, 200).setY(170), sd = side(s.dir); for (let i = 0; i < 28; i++) { const t = (i / 27 - .5) * 2, sg = i % 2 ? 1 : -1; _w.copy(sky).addScaledVector(s.dir, t * 200).addScaledVector(sd, sg * (10 + eo(u * 1.5) * 70)); bb(B.smoke, _w, 60, i, K('#c8ccd8'), f * .55); } _w.copy(sky).addScaledVector(s.dir, -200); _x.copy(sky).addScaledVector(s.dir, 200); seg(B.streak, _w, _x, 14 * eo(u * 2), W, f * .8); } },
    // 소각: 손에서 뻗는 굵은 주황 광선
    orangeBeam: { dur: 1.4, draw(s, u) { const f = fio(u, .05, .25), p0 = P(s), p1 = s.to ? s.to() : p0.clone().addScaledVector(s.dir, 120), wob = 1 + Math.sin(clock * 40) * .08; seg(B.streak, p0, p1, 18 * s.S * wob, s.c1, f, 1.3); seg(B.streak, p0, p1, 7 * s.S * wob, W, f); bb(B.glow, p0, 22 * s.S, 0, s.c1, f, 1.3); bb(B.flare, p0, 18 * s.S, clock * 4, W, f * .8);
      for (let i = 0; i < 24; i++) { const t = (clock * 2 + i / 24) % 1; _w.copy(p0).lerp(p1, t).add(new THREE.Vector3(R(-2, 2), R(-2, 2), R(-2, 2))); bb(B.flame, _w, 6 * s.S, Math.random() * 6, mixC(s.c2, s.c1, t), f * .7, 1.3, 9 * s.S); } bb(B.glow, p1, 26 * s.S, 0, s.c2, f * .8, 1.3); } },
    // 히노카미 카구라: 칼끝이 그리는 태양 불꽃 고리 (원무)
    sunRing: { dur: 1.4, draw(s, u) { const c = P(s), f = fio(u, .05, .35), r = 16 * s.S, sw = eo(u * 1.8) * TAU, sd = side(s.dir); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; if (a > sw) break; const q = c.clone().addScaledVector(sd, Math.cos(a + s.rot) * r).add(new THREE.Vector3(0, Math.sin(a + s.rot) * r, 0)); bb(B.flame, q, 4.5 * s.S, a + s.rot + Math.PI, mixC(s.c2, s.c1, i / 36), f, 1.4, 10 * s.S); if (i % 4 === 0) bb(B.glow, q, 6 * s.S, 0, s.c2, f * .6); }
      bb(B.glow, c, r * 1.6, 0, s.c1, f * .35); if (Math.random() < .6) parts.push({ p: c.clone().add(new THREE.Vector3(R(-r, r), R(-r, r), R(-r, r))), v: new THREE.Vector3(R(-20, 20), R(30, 80), R(-20, 20)), life: .8, c: '#ffd040', g: -20, s: 1 }); } },
    // 벽력일섬: 출발점에서 지금 자리까지 노란 번개 길 (부지화=불꽃 길, 백족사행=보라 지그재그)
    thunderDash: { dur: 1.3, draw(s, u) { const a0 = startOf(s), b0 = s.follow && F.includes(s.follow) ? chest(s.follow) : s.p, f = fio(u, .02, .45); if (a0.distanceTo(b0) < 3) { bb(B.glow, b0, 10 * s.S, 0, s.c1, f); return; } const z = s.zig ? 10 : 2.4;
      for (let k = 0; k < 3; k++) drawJag(jag(a0, b0, s.zig ? 8 : 10, z * s.S), (k ? 1.2 : 4) * s.S, k ? W : s.c1, f * (k ? 1 : .8), 1.4); for (let i = 0; i < 8; i++) { _w.copy(a0).lerp(b0, i / 7); if (s.flameTrail) bb(B.flame, _w, 6 * s.S, 0, s.c1, f * .8, 1.3, 12 * s.S); else bb(B.glow, _w, 5 * s.S, 0, s.c1, f * .6); } bb(B.flare, b0, 16 * s.S, clock * 5, W, f * .7); } },
    // 물의 호흡: 우키요에 같은 감기는 물결 + 먹선
    waterWave: { dur: 1.3, draw(s, u) { const c = P(s), f = fio(u, .04, .4), sd = side(s.dir), sw = eo(u * 1.7); for (let i = 0; i < 14; i++) { const t = i / 13; if (t > sw) break; const a = -1.3 + t * 2.6, q = c.clone().addScaledVector(s.dir, Math.cos(a) * 14 * s.S).addScaledVector(sd, Math.sin(a) * 14 * s.S); q.y += Math.sin(t * Math.PI) * 6 * s.S;
      facing(B.crescent, q, _v.copy(s.dir).multiplyScalar(Math.cos(a)).addScaledVector(sd, Math.sin(a)), t * 3, 10 * s.S, 10 * s.S, s.c1, f, 1.3); bb(B.ink, q, 9 * s.S, a + 1.6, K('#0a2a5a'), f * .55, 1, 3 * s.S); if (i % 2) bb(B.glow, q.clone().add(new THREE.Vector3(0, 3, 0)), 3 * s.S, 0, W, f); }
      for (let i = 0; i < 10; i++) parts.push({ p: c.clone().addScaledVector(sd, R(-14, 14)), v: new THREE.Vector3(R(-30, 30), R(20, 70), R(-30, 30)), life: .6, c: pick(['#ffffff', '#9fd8ff', '#5ab0ff']), g: 200, s: 1 }); } },
    // 연옥: 앞으로 덮치는 불꽃 호랑이
    flameTiger: { dur: 1.3, draw(s, u) { const a0 = startOf(s), tg = s.to ? s.to() : a0.clone().addScaledVector(s.dir, 60), f = fio(u, .04, .3), hp = a0.clone().lerp(tg, eo(u * 1.4)), sd = side(s.dir); for (let i = 0; i < 70; i++) { const t = hr(s, i), back = t * 30 * s.S, rr = (1 - t * .5) * 12 * s.S; _w.copy(hp).addScaledVector(s.dir, -back).addScaledVector(sd, (hr(s, i + 3) - .5) * rr * 2); _w.y += (hr(s, i + 6) - .4) * rr * 1.6 + Math.sin(clock * 12 + i) * 1.5; bb(B.flame, _w, (5 + (1 - t) * 4) * s.S, (hr(s, i + 9) - .5) * .8, mixC(s.c2, s.c1, t), f * (1 - t * .5), 1.4, (10 + (1 - t) * 6) * s.S); }
      for (const sg of [-1, 1]) bb(B.flare, hp.clone().addScaledVector(sd, sg * 4 * s.S).add(new THREE.Vector3(0, 5 * s.S, 0)), 7 * s.S, 0, K('#fff6a0'), f, 1.4); const jaw = .4 + Math.sin(clock * 10) * .25; facing(B.crescent, hp.clone().addScaledVector(s.dir, 6 * s.S), s.dir, Math.PI / 2 + jaw, 16 * s.S, 16 * s.S, W, f * .9, 1.3); facing(B.crescent, hp.clone().addScaledVector(s.dir, 6 * s.S), s.dir, -Math.PI / 2 - jaw, 16 * s.S, 16 * s.S, W, f * .9, 1.3); bb(B.glow, hp, 30 * s.S, 0, s.c1, f * .6, 1.2); } },
    // 사랑의 호흡: 분홍 채찍검 리본 (뱀의 호흡은 보라 한 줄기)
    loveRibbons: { dur: 1.5, draw(s, u) { const c = P(s), f = fio(u, .05, .35), n = s.one ? 1 : 4; for (let r = 0; r < n; r++) { let prev = null; const base = r / n * TAU + clock * 3 * s.rot; for (let i = 0; i <= 18; i++) { const t = i / 18, a = base + t * 3.2 * s.rot, rr = t * 34 * s.S * eo(u * 2); const q = new THREE.Vector3(c.x + Math.cos(a) * rr, c.y + Math.sin(t * 6 + clock * 6 + r) * 5 * s.S, c.z + Math.sin(a) * rr); if (prev) seg(B.streak, prev, q, (3.2 - t * 2.4) * s.S, i % 3 ? s.c1 : W, f, 1.4); prev = q; } bb(B.flare, prev, 5 * s.S, clock * 4, s.c3, f); } } },
    // 소리의 호흡: 연달아 터지는 폭발
    soundBoom: { dur: 1.3, draw(s, u) { for (let i = 0; i < 10; i++) { const t0 = i * .08, k = (u - t0) / .3; if (k < 0 || k > 1) continue; _w.set(s.p.x + (hr(s, i) - .5) * 40 * s.S, s.p.y + (hr(s, i + 3) - .3) * 20 * s.S, s.p.z + (hr(s, i + 6) - .5) * 40 * s.S); const f = 1 - k; bb(B.flare, _w, 22 * s.S * eo(k * 2), i, W, f * .8); bb(B.glow, _w, 18 * s.S * eo(k * 2), 0, i % 2 ? s.c1 : s.c2, f, 1.3); bb(B.ring, _w, 26 * s.S * eo(k), 0, s.c1, f, 1.2); if (k < .1) for (let j = 0; j < 8; j++) parts.push({ p: _w.clone(), v: new THREE.Vector3(R(-140, 140), R(-40, 160), R(-140, 140)), life: .5, c: '#ffd040', g: 160, s: 1 }); if (k > .3) bb(B.smoke, _w, 16 * s.S, i, K('#4a4038'), f * .6); } } },
    // 바위의 호흡: 쇠사슬 끝 가시 철구 + 도끼
    flailAxe: { dur: 1.3, draw(s, u) { const f = fio(u, .03, .3), p0 = P(s), p1 = s.to ? s.to() : p0.clone().addScaledVector(s.dir, 50), t = eo(u * 1.6), ball = p0.clone().lerp(p1, t); ball.y += Math.sin(t * Math.PI) * 20 * s.S; for (let i = 0; i < 16; i++) { _w.copy(p0).lerp(ball, i / 16); _w.y -= Math.sin(i / 16 * Math.PI) * 4; bb(B.glow, _w, 1.6 * s.S, 0, K('#c0c8d8'), f * .9); }
      for (let i = 0; i < 8; i++) { _v.set(Math.cos(i * 2.1 + clock * 8), Math.sin(i * 1.3), Math.sin(i * 2.1 + clock * 8)).normalize(); solid(B.shard, ball.clone().addScaledVector(_v, 3 * s.S), _v, 1.4 * s.S, 4 * s.S, 1.4 * s.S, 0, K('#9aa4b8'), f, 1); } bb(B.glow, ball, 9 * s.S, 0, s.c1, f * .6);
      const ax = p0.clone().addScaledVector(side(s.dir), 10 * s.S).lerp(p1, t * .8); facing(B.crescent, ax, side(s.dir), clock * 14, 14 * s.S, 14 * s.S, K('#d8dce8'), f, 1.3); if (u > .55) flat(B.ring, new THREE.Vector3(p1.x, GROUND, p1.z), 50 * s.S * eo((u - .55) * 3), 0, s.c1, f, 1.2); } },
    // 흑관: 대상을 가두는 검은 관 + 안으로 박히는 가시
    blackCoffin: { dur: 1.8, draw(s, u) { const c = s.follow && F.includes(s.follow) ? s.follow.pos : s.p, f = fio(u, .05, .25), cl = eo(u * 2.2), W2 = 10 * s.S, H = 30 * s.S; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU, n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), q = new THREE.Vector3(c.x, c.y + H / 2, c.z).addScaledVector(n, W2 + (1 - cl) * 40 * s.S); facing(B.darkPlane, q, n, 0, W2 * 2, H, BLK, f * .92); const e1 = q.clone().addScaledVector(new THREE.Vector3(-n.z, 0, n.x), W2); seg(B.streak, e1.clone().setY(c.y), e1.clone().setY(c.y + H), 1.6 * s.S, s.c1, f, 1.3); }
      flat(B.darkPlane, new THREE.Vector3(c.x, c.y + H + (1 - cl) * 30, c.z), W2 * 2, Math.PI / 4 * 0, BLK, f * .9); if (u > .5) for (let i = 0; i < 12; i++) { _v.set(Math.cos(i * 1.9), (hr(s, i) - .5) * .6, Math.sin(i * 1.9)).normalize(); solid(B.spike, new THREE.Vector3(c.x, c.y + (6 + hr(s, i + 3) * 20) * s.S, c.z).addScaledVector(_v, W2), _v.clone().negate(), 1.2 * s.S, W2 * eo((u - .5) * 4), 1.2 * s.S, 0, s.c1, f, 1.3); } } },
    // 팔척경옥: 쏟아지는 빛 구슬 (반딧불 화는 반딧불 색)
    lightBeads: { dur: 1.3, draw(s, u) { const p0 = P(s), p1 = s.to ? s.to() : p0.clone().addScaledVector(s.dir, 70), sd = side(s.dir); for (let i = 0; i < 40; i++) { const t0 = hr(s, i) * .45, k = (u - t0) / .4; if (k < 0 || k > 1.3) continue; const tg = p1.clone().addScaledVector(sd, (hr(s, i + 3) - .5) * 24 * s.S).add(new THREE.Vector3(0, (hr(s, i + 6) - .5) * 16 * s.S, 0));
      if (k <= 1) { _w.copy(p0).lerp(tg, k); _x.copy(p0).lerp(tg, Math.max(0, k - .12)); seg(B.streak, _x, _w, 1.6 * s.S, s.c1, .9, 1.4); bb(B.glow, _w, 4 * s.S, 0, s.c1, 1, 1.4); bb(B.flare, _w, 3 * s.S, clock * 4, W, .8); } else { const kk = (k - 1) / .3; bb(B.flare, tg, 10 * s.S * (1 - kk), 0, s.c1, 1 - kk, 1.3); } } } },
    // 염제: 머리 위 거대한 불의 태양
    fireSun: { dur: 1.8, draw(s, u) { drawFireSun(P(s), 24 * s.S * eo(u * 1.6), s, fio(u, .1, .3)); } },
    fireBurst: { dur: 1.6, draw(s, u) { const f = fio(u, .02, .45), r = eo(u * 1.3) * 50 * s.S; for (let i = 0; i < 46; i++) { _v.set(hr(s, i) - .5, hr(s, i + 3) * .9 - .1, hr(s, i + 6) - .5).normalize(); _w.copy(s.p).addScaledVector(_v, r * (.5 + hr(s, i + 9) * .5)); bb(B.flame, _w, 8 * s.S * (1 - u * .5), Math.atan2(-_v.x, _v.y), mixC(s.c2, s.c1, hr(s, i)), f, 1.4, 14 * s.S * (1 - u * .5)); }
      bb(B.glow, s.p, r * 1.6, 0, s.c1, f * .7, 1.2); flat(B.ring, new THREE.Vector3(s.p.x, GROUND, s.p.z), r * 2.4, 0, s.c2, f, 1.3); if (u > .4) for (let i = 0; i < 8; i++) bb(B.smoke, s.p.clone().add(new THREE.Vector3((hr(s, i + 40) - .5) * r, (hr(s, i + 41)) * r * .6, (hr(s, i + 42) - .5) * r)), r * .5, i, K('#3a3030'), f * .5); } },
    // 사막 장송: 모래가 감싸 조이고 터짐
    sandCoffin: { dur: 1.9, draw(s, u) { const c = s.follow && F.includes(s.follow) ? chest(s.follow) : s.p, sq = u < .65 ? eo(u / .65) : 1, burst = u > .7 ? (u - .7) / .3 : 0, f = fio(u, .05, .25); for (let i = 0; i < 90; i++) { const a = hr(s, i) * TAU + clock * (4 + sq * 6), y = (hr(s, i + 3) - .5) * 30 * s.S, rr = (24 - sq * 18) * s.S * (1 + burst * 3) * (.6 + hr(s, i + 6) * .4); _w.set(c.x + Math.cos(a) * rr, c.y + y * (1 - sq * .3), c.z + Math.sin(a) * rr); bb(B.glow, _w, 2 * s.S, 0, i % 3 ? s.c1 : s.c2, f, 1.1); }
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + clock * 3; _w.set(c.x + Math.cos(a) * (14 - sq * 9) * s.S, c.y + (hr(s, i + 20) - .5) * 20 * s.S, c.z + Math.sin(a) * (14 - sq * 9) * s.S); bb(B.smoke, _w, 14 * s.S, a, s.c1, f * .55); } if (burst > 0 && burst < .2) for (let i = 0; i < 20; i++) parts.push({ p: c.clone(), v: new THREE.Vector3(R(-160, 160), R(-20, 160), R(-160, 160)), life: .9, c: '#c8a060', g: 200, s: 2 }); } },
    // 룸: 투명한 푸른 구역 / 감마나이프: 몸을 꿰뚫는 녹빛 칼날
    roomSphere: { dur: 1.8, draw(s, u) { const c = P(s), f = fio(u, .1, .3), r = 42 * s.S * eo(u * 2); for (let i = 0; i < 3; i++) { _v.set(Math.sin(i * 2.1 + clock * .5), i === 0 ? 1 : .2, Math.cos(i * 2.1 + clock * .5)).normalize(); facing(B.ring, c, _v, 0, r * 2.1, r * 2.1, s.c1, f * .7, 1.3); } bb(B.glow, c, r * 2, 0, s.c1, f * .18); flat(B.ring, new THREE.Vector3(c.x, GROUND, c.z), r * 2.1, 0, s.c1, f, 1.3); } },
    gammaKnife: { dur: 1, draw(s, u) { const f = fio(u, .03, .4), L = 40 * s.S; _w.copy(s.p).addScaledVector(s.dir, -L * .5 * eo(u * 3)); _x.copy(s.p).addScaledVector(s.dir, L * .7 * eo(u * 3)); seg(B.streak, _w, _x, 5 * s.S, s.c1, f, 1.4); seg(B.streak, _w, _x, 1.6 * s.S, W, f); bb(B.glow, s.p, 18 * s.S * (1 + Math.sin(clock * 20) * .15), 0, s.c1, f, 1.3); bb(B.flare, s.p, 14 * s.S, clock * 3, K('#d0ffe0'), f * .8); } },
    // 대홍련 빙륜환: 등 뒤 얼음 날개 + 얼음 꽃
    iceWings: { dur: 2, draw(s, u) { const c = P(s), f = fio(u, .12, .3), sd = side(s.dir), op = eo(u * 2); for (const sg of [-1, 1]) for (let k = 0; k < 12; k++) { const t = k / 11, q = c.clone().addScaledVector(sd, sg * (3 + t * 26 * op) * s.S).addScaledVector(s.dir, -5 * s.S); q.y += (Math.sin(t * 2.2) * 16 * t + 4) * s.S; _v.set(sg * sd.x, .6 + t * .4, sg * sd.z).normalize(); solid(B.shard, q, _v, 1.6 * s.S, (6 + t * 6) * s.S, 1.6 * s.S, 0, k % 2 ? s.c1 : W, f, 1.3); }
      for (let i = 0; i < 12; i++) { _w.set(c.x + (hr(s, i) - .5) * 40 * s.S, c.y + 10 * s.S + hr(s, i + 3) * 20 * s.S - u * 10, c.z + (hr(s, i + 6) - .5) * 40 * s.S); bb(B.petal, _w, 2 * s.S, clock * 2 + i, W, f * .8, 1.2, 3.6 * s.S); } } },
    // 염동 폭풍: 녹빛에 싸인 잔해 소용돌이
    psychicStorm: { dur: 2, draw(s, u) { const c = P(s), f = fio(u, .1, .3); for (let i = 0; i < 34; i++) { const a = hr(s, i) * TAU + clock * (1.5 + hr(s, i + 3)) * s.rot, rr = (12 + hr(s, i + 6) * 28) * s.S * eo(u * 2), y = (hr(s, i + 9) * 34 - 6) * s.S; _w.set(c.x + Math.cos(a) * rr, c.y + y, c.z + Math.sin(a) * rr); bb(B.glow, _w, 8 * s.S, 0, s.c1, f * .55, 1.2); _v.set(Math.cos(clock + i), 1, Math.sin(clock * 1.3 + i)).normalize(); solid(B.shard, _w, _v, 2.2 * s.S, 3.2 * s.S, 2.2 * s.S, clock * 3 + i, K('#7a7068'), f * .7, .8); }
      for (let i = 0; i < 14; i++) { const a = hr(s, i + 30) * TAU, ph = (clock + hr(s, i + 31)) % 1; _w.set(c.x + Math.cos(a) * 7 * s.S, c.y - 6 * s.S + ph * 26 * s.S, c.z + Math.sin(a) * 7 * s.S); bb(B.flame, _w, 5 * s.S, 0, s.c1, f * (1 - ph) * .7, 1.3, 11 * s.S); } } },
    // 카무이: 안으로 빨려드는 소용돌이 (검보라)
    kamui: { dur: 1.4, draw(s, u) { const c = s.follow && F.includes(s.follow) ? chest(s.follow) : s.p, f = fio(u, .05, .3); for (let a = 0; a < 3; a++) for (let j = 0; j < 22; j++) { const t = j / 21, rr = (1 - ((t + u * 1.5) % 1)) * 26 * s.S, ang = t * 6 + a * TAU / 3 - clock * 6; _w.set(c.x + Math.cos(ang) * rr, c.y + Math.sin(ang) * rr * .3, c.z + Math.sin(ang) * rr); bb(B.glow, _w, 2.6 * s.S, 0, a ? s.c1 : K('#5a10a0'), f * .9, 1.2); } bb(B.darkGlow, c, 12 * s.S * eo(u * 2), 0, BLK, f * .9); bb(B.ring, c, 16 * s.S, clock * 3, s.c1, f * .8, 1.2); } },
    // 츠쿠요미: 붉은 달 + 붉고 검은 세계
    tsukuyomi: { dur: 2, draw(s, u) { const c = s.follow && F.includes(s.follow) ? chest(s.follow) : s.p, f = fio(u, .1, .3), moon = c.clone().add(new THREE.Vector3(0, 60, 0)).addScaledVector(s.dir, 40); bb(B.glow, moon, 70, 0, K('#ff1a1a'), f * .8, 1.2); bb(B.darkGlow, moon.clone().add(new THREE.Vector3(6, 4, 0)), 26, 0, K('#200000'), f * .6); bb(B.darkGlow, c, 60 * s.S, 0, K('#1a0004'), f * .45); for (let i = 0; i < 3; i++) bb(B.crescent, c, 14 * s.S, clock * 4 + i * TAU / 3, K('#ff2a2a'), f, 1.3); } },
    // 연속 주먹: 대상 앞에 터지는 주먹 잔상
    punchBarrage: { dur: 1.1, draw(s, u) { const sd = side(s.dir); for (let i = 0; i < 20; i++) { const k = (u * 4 + hr(s, i)) % 1, f = fio(u, .05, .3); _w.copy(s.p).addScaledVector(s.dir, -6 * s.S).addScaledVector(sd, (hr(s, i + 2) - .5) * 22 * s.S).add(new THREE.Vector3(0, (hr(s, i + 5) - .5) * 18 * s.S, 0)); bb(B.glow, _w, 6 * s.S * (1 - k), 0, s.c1, f * (1 - k), 1.3); facing(B.ring, _w, s.dir, 0, 11 * s.S * k, 11 * s.S * k, W, f * (1 - k)); _x.copy(_w).addScaledVector(s.dir, -10 * s.S); seg(B.streak, _x, _w, 1 * s.S, s.c3, f * (1 - k)); } } },
    // 인드라의 화살 등 번개 화살: 투사체에 그림 (시전은 보라 수사노오 궁수)
    calmRipples: { dur: 1.6, draw(s, u) { const g = new THREE.Vector3(s.p.x, GROUND + .3, s.p.z), f = fio(u, .1, .4); for (let i = 0; i < 6; i++) { const k = (u * 1.4 + i / 6) % 1; flat(B.ring, g, 60 * s.S * k, 0, i % 2 ? s.c1 : W, f * (1 - k), 1.2); } bb(B.glow, g.clone().setY(GROUND + 2), 12 * s.S, 0, s.c1, f * .5); } },
  });
  function drawShuriken(c, S, s, f) { if (S <= .01) return; bb(B.glow, c, 10 * S, 0, W, f, 1.3); bb(B.glow, c, 26 * S, 0, s.c1, f * .5, 1.2); flat(B.glow, c, 30 * S, 0, s.c3, f * .4); for (let i = 0; i < 4; i++) { const a = clock * 18 + i * Math.PI / 2; _w.set(c.x + Math.cos(a) * 9 * S, c.y, c.z + Math.sin(a) * 9 * S); flat(B.streak, _w, 22 * S, -a, W, f, 1.4, 5 * S); flat(B.streak, _w, 22 * S, -a, s.c1, f * .8, 1.3, 9 * S); }
    flat(B.ring, c, 32 * S, clock * 10, s.c1, f, 1.3); flat(B.ring, c, 24 * S, -clock * 14, W, f * .8); for (let i = 0; i < 16; i++) { const a = clock * 22 + i / 16 * TAU, r2 = 15 * S; _w.set(c.x + Math.cos(a) * r2, c.y + Math.sin(clock * 30 + i) * .8, c.z + Math.sin(a) * r2); _x.set(c.x + Math.cos(a - .35) * r2, _w.y, c.z + Math.sin(a - .35) * r2); seg(B.streak, _x, _w, .8 * S, W, f * .9, 1.4); } }
  function drawBijuu(c, S, s, f) { if (S <= .01) return; bb(B.darkGlow, c, 22 * S, 0, BLK, f * .98); bb(B.darkGlow, c, 16 * S, 0, BLK, f); bb(B.ring, c, 26 * S, clock * 2, s.c2, f, 1.4); bb(B.ring, c, 30 * S, -clock * 3, K('#9a4aff'), f * .7, 1.3); bb(B.glow, c, 40 * S, 0, K('#5a1aa0'), f * .45); for (let i = 0; i < 10; i++) { const a = clock * 5 + i / 10 * TAU; _w.copy(c).add(new THREE.Vector3(Math.cos(a) * 12 * S, Math.sin(a * 1.3) * 12 * S, Math.sin(a) * 12 * S)); bb(B.glow, _w, 3 * S, 0, s.c2, f * .8, 1.3); } }
  function drawFireSun(c, r, s, f) { if (r <= .1) return; bb(B.glow, c, r * 2.6, 0, s.c1, f, 1.3); bb(B.glow, c, r * 1.4, 0, K('#fff2a0'), f); for (let i = 0; i < 48; i++) { const y = 1 - (i + .5) / 48, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + clock * .8; _v.set(Math.cos(a) * rr, y, Math.sin(a) * rr); _w.copy(c).addScaledVector(_v, r * (1 + Math.sin(clock * 7 + i) * .08)); bb(B.flame, _w, r * .3, Math.atan2(-_v.x, _v.y), mixC(K('#ffd040'), s.c1, hr(s, i)), f, 1.4, r * .55); }
    if (Math.random() < .5) parts.push({ p: c.clone().add(new THREE.Vector3(R(-r, r), -r * .8, R(-r, r))), v: new THREE.Vector3(R(-10, 10), R(-60, -20), R(-10, 10)), life: .8, c: '#ff8a20', g: 80, s: 2 }); }
  // 투사체 위에 직접 그리는 원작 모양
  const PROJ = {
    shuriken: (p, L, sz) => drawShuriken(p.p, sz * .9, L, 1),
    bijuu: (p, L, sz) => drawBijuu(p.p, sz * .55, L, 1),
    fireSun: (p, L, sz) => drawFireSun(p.p, 7 * sz, L, 1),
    fireball: (p, L, sz) => { bb(B.glow, p.p, 14 * sz, 0, L.c1, 1, 1.3); for (let i = 0; i < 14; i++) { const a = clock * 6 + i * .45; _v.set(Math.cos(a), Math.sin(i * 1.7), Math.sin(a)).normalize(); bb(B.flame, p.p.clone().addScaledVector(_v, 5 * sz), 4 * sz, Math.atan2(-_v.x, _v.y), mixC(L.c2, L.c1, i / 14), 1, 1.4, 8 * sz); } },
    getsuga: (p, L, sz) => { const v = p.v.clone().normalize(); if (L.dark) facing(B.crescentDark, p.p, v, Math.PI / 2, 26 * sz, 26 * sz, BLK, .95); facing(B.crescent, p.p, v, Math.PI / 2, 30 * sz, 30 * sz, L.c1, 1, 1.4); facing(B.crescent, p.p.clone().addScaledVector(v, -4), v, Math.PI / 2, 24 * sz, 24 * sz, L.dark ? K('#ff2a2a') : W, .8, 1.3); },
    lightningArrow: (p, L, sz) => { const v = p.v.clone().normalize(), tail = p.p.clone().addScaledVector(v, -40 * sz); for (let k = 0; k < 3; k++) drawJag(jag(tail, p.p, 6, 3 * sz), (k ? 1 : 3.5) * sz, k ? W : L.c1, 1, 1.4); bb(B.flare, p.p, 14 * sz, clock * 6, W, .9); },
    lightBead: (p, L, sz) => { bb(B.glow, p.p, 6 * sz, 0, L.c1, 1, 1.4); bb(B.flare, p.p, 5 * sz, clock * 5, W, .9); },
    rock: (p, L, sz) => { for (let i = 0; i < 5; i++) { _v.set(Math.cos(i * 1.3 + clock * 3), Math.sin(i * 2.1), Math.sin(i * 1.3 + clock * 3)).normalize(); solid(B.shard, p.p.clone().addScaledVector(_v, 2 * sz), _v, 3 * sz, 4 * sz, 3 * sz, 0, K('#8a7a68'), .9, .8); } bb(B.glow, p.p, 14 * sz, 0, L.c1, .7, 1.2); },
  };
  // 이름 → 원작 모양 (앞에 있을수록 우선, 부분 일치)
  const pal = (a, b, c) => ({ c1: K(a), c2: K(b), c3: K(c || '#ffffff').lerp(K(a), .35) });
  const CN = [
    [/초대옥나선수리검|나선수리검/, { cast: 'shurikenDisc', overHead: true, hit: 'windBladeSphere', proj: 'shuriken', ...pal('#8ad0ff', '#ffffff') }],
    [/초대옥나선환|거대 나선환/, { cast: 'rasengan', hand: true, S: 2.2, hit: 'windBladeSphere', ...pal('#5ab8ff', '#cfeaff') }],
    [/나선환/, { cast: 'rasengan', hand: true, hit: 'windBladeSphere', hitS: .6, ...pal('#5ab8ff', '#cfeaff') }],
    [/미수옥/, { cast: 'bijuuOrb', overHead: true, hit: 'bijuuHit', proj: 'bijuu', ...pal('#ff8a20', '#ff8a20', '#ffd080') }],
    [/구미 차크라|선인 모드|귀화|거대화/, { cast: 'blackFlames', followCaster: true, hit: 'starBurst', ...pal('#ff8a20', '#ffd040') }],
    [/치도리|라이키리|뇌둔 자전|뇌광 발도/, { cast: 'chidori', hand: true, hit: 'chidoriHit', ...pal('#5aa8ff', '#e0f0ff') }],
    [/기린|화뢰신|번개 낙뢰/, { cast: 'sharinganEye', hit: 'lightningDragon', toTarget: true, ...pal('#8ac8ff', '#ffffff') }],
    [/아마테라스|천조|염둔 가구츠치/, { cast: 'sharinganEye', hit: 'blackFlames', hitFollow: true, dark: true, ...pal('#e01a2a', '#c0204a') }],
    [/츠쿠요미/, { cast: 'sharinganEye', hit: 'tsukuyomi', hitFollow: true, ...pal('#e01a2a', '#300008') }],
    [/토츠카|봉선화/, { cast: 'susanoo', followCaster: true, hit: 'slashFan', hitS: 1.6, ...pal('#ff4a3a', '#ffb0a0') }],
    [/인드라의 화살/, { cast: 'susanoo', followCaster: true, hit: 'lightningDragon', toTarget: true, proj: 'lightningArrow', ...pal('#9a7aff', '#e0d8ff') }],
    [/수사노오/, { cast: 'susanoo', followCaster: true, hit: 'slashFan', hitS: 1.6, ...pal('#9a4aff', '#d8b0ff') }],
    [/카무이/, { cast: 'sharinganEye', hit: 'kamui', hitFollow: true, ...pal('#9a4aff', '#40108a') }],
    [/흑 월아천충|무월|허화/, { cast: 'reiatsu', followCaster: true, dark: true, hit: 'getsugaHit', proj: 'getsuga', ...pal('#ff2a2a', '#1a0006', '#ff8080') }],
    [/월아천충|반카이|천쇄참월/, { cast: 'reiatsu', followCaster: true, hit: 'getsugaHit', proj: 'getsuga', ...pal('#8ad0ff', '#ffffff') }],
    [/센본자쿠라|천본앵|경엄/, { cast: 'bladePetals', toTarget: true, hit: 'sakuraStorm', ...pal('#ff8ab8', '#ffd0e4') }],
    [/개틀링|^연타$|연속 보통 펀치|초고속 연속|광속 연타/, { cast: 'rubberPunch', toTarget: true, gatling: true, hit: 'punchBarrage', ...pal('#ffd0b0', '#ffffff') }],
    [/고무고무|거인의 총|레드 호크|킹콩/, { cast: 'rubberPunch', toTarget: true, hit: 'starBurst', ...pal('#ffd0b0', '#ff6a3a') }],
    [/기어 5/, { cast: 'gear5', followCaster: true, hit: 'starBurst', ...pal('#ffffff', '#f0f0ff') }],
    [/기어 세컨드/, { cast: 'gear5', followCaster: true, steam: true, hit: 'starBurst', ...pal('#ffd0d0', '#ff9090') }],
    [/진지한/, { cast: 'seriousPunch', hit: 'shockDebris', hitS: 1.6, ...pal('#ffffff', '#ffd040') }],
    [/소각|소각포/, { cast: 'orangeBeam', hand: true, toTarget: true, hit: 'fireBurst', ...pal('#ff6a10', '#ffd040') }],
    [/히노카미|원무|일훈|벽라의 하늘|휘휘은광/, { cast: 'sunRing', hit: 'fireBurst', ...pal('#ff5a10', '#ffd040') }],
    [/벽력일섬|번개 연격|잠든 일섬/, { cast: 'thunderDash', followCaster: true, hit: 'chidoriHit', ...pal('#ffe040', '#ffffff') }],
    [/부지화|화염 돌진|부스터 돌진/, { cast: 'thunderDash', followCaster: true, flameTrail: true, hit: 'fireBurst', ...pal('#ff6a10', '#ffd040') }],
    [/백족사행/, { cast: 'thunderDash', followCaster: true, zig: true, hit: 'butterflySwarm', ...pal('#c890ff', '#ffffff') }],
    [/연옥|염호|오르는 염천/, { cast: 'flameTiger', toTarget: true, hit: 'fireBurst', hitS: 1.4, ...pal('#ff5a10', '#ffd040') }],
    [/기염만상|성염|불꽃 연격/, { cast: 'sunRing', hit: 'fireBurst', ...pal('#ff6a10', '#ffcf40') }],
    [/생생유전|수룡/, { cast: 'waterWave', hit: 'waterDragon', ...pal('#3a8aff', '#cfeaff') }],
    [/잔잔한 물결|물방울 파문/, { cast: 'calmRipples', hit: 'waterWave', ...pal('#5ab0ff', '#ffffff') }],
    [/물의 호흡|수면 베기|유류무|용소|물레|소용돌이/, { cast: 'waterWave', hit: 'crescentFan', ...pal('#3a8aff', '#cfeaff') }],
    [/사랑의 호흡|연정|연묘|채찍검|하트/, { cast: 'loveRibbons', hit: 'petalSpiral', ...pal('#ff7ab8', '#9ad070', '#ffd0e4') }],
    [/뱀의 호흡|장반 장사|협두|휘감기|경도 장사|뱀|대사/, { cast: 'loveRibbons', one: true, hit: 'slashFan', ...pal('#b8a0ff', '#e8e0ff') }],
    [/소리의 호흡|명현주소|보면 완성|향명|폭약|화려|음파/, { cast: 'soundBoom', atCaster: true, hit: 'soundBoom', ...pal('#ffd040', '#ff7ab8') }],
    [/바위의 호흡|철구|와륜형부|천면|암구|류암|쇠사슬|바위 대분쇄/, { cast: 'flailAxe', toTarget: true, hit: 'shockDebris', ...pal('#c8a070', '#d8dce8') }],
    [/흑관/, { cast: 'reiatsu', followCaster: true, dark: true, hit: 'blackCoffin', hitFollow: true, ...pal('#9a4aff', '#200030') }],
    [/팔척경옥|빛의 비/, { cast: 'lightBeads', toTarget: true, hit: 'starBurst', proj: 'lightBead', ...pal('#ffe060', '#fffbd0') }],
    [/반딧불/, { cast: 'lightBeads', toTarget: true, hit: 'emberFountain', proj: 'lightBead', ...pal('#ffa020', '#e0ff60') }],
    [/염제|신화 불지옥/, { cast: 'fireSun', overHead: true, S: 1.4, hit: 'fireBurst', hitS: 1.6, proj: 'fireSun', ...pal('#ff5a10', '#ffd040') }],
    [/화권|화창|십자화|호화구|화둔|초고열|이프릿|디아블/, { cast: 'emberFountain', hit: 'fireBurst', proj: 'fireball', ...pal('#ff6a10', '#ffd040') }],
    [/사막 장송|사박궤|사박 대장|모래 쓰나미/, { cast: 'vortexColumn', hit: 'sandCoffin', hitFollow: true, ...pal('#d8b070', '#a07840') }],
    [/감마나이프/, { cast: 'roomSphere', followCaster: true, hit: 'gammaKnife', ...pal('#6aff9a', '#7ab0ff') }],
    [/룸|샴블즈|카운터 쇼크|라디오 나이프/, { cast: 'roomSphere', followCaster: true, hit: 'slashFan', ...pal('#7ab0ff', '#d8e8ff') }],
    [/대홍련 빙륜환|빙천 백화장/, { cast: 'iceWings', followCaster: true, extra: 'waterDragon', hit: 'iceBloom', hitS: 1.4, ...pal('#9fe0ff', '#ffffff') }],
    [/빙륜환|용선회|천상옥좌|군조 빙결|육의 빙결/, { cast: 'waterDragon', toTarget: true, hit: 'iceBloom', ...pal('#9fe0ff', '#ffffff') }],
    [/월백|백도|백련|얼음/, { cast: 'iceBloom', hit: 'crystalBurst', ...pal('#e8faff', '#9fd8ff') }],
    [/염동|초능력|건물 던지기|바위 던지기/, { cast: 'psychicStorm', followCaster: true, hit: 'shockDebris', proj: 'rock', ...pal('#5aff8a', '#c0ffd8') }],
    [/츠쿠요미/, { cast: 'sharinganEye', hit: 'tsukuyomi', hitFollow: true, ...pal('#e01a2a', '#300008') }],
    [/나비의 춤|나비|복안육각/, { cast: 'butterflySwarm', followCaster: true, hit: 'hexShatter', ...pal('#c890ff', '#7ad0ff') }],
    [/안개|몽롱|노을 구름/, { cast: 'mistVeil', followCaster: true, hit: 'crescentFan', ...pal('#c8f0ec', '#ffffff') }],
    [/바람의 호흡|진사바람|흑풍|이즈나|정선 회오리|조풍|청람풍수|경풍/, { cast: 'vortexColumn', hit: 'crescentFan', ...pal('#a8f0c8', '#ffffff') }],
    [/짐승의 호흡|찢어 베기|미친 베기|난항|물어뜯기/, { cast: 'slashFan', atCaster: true, hit: 'slashFan', ...pal('#9ab0d0', '#ffffff') }],
    [/삼도류|귀참|사자 노래|아수라|삼천세계|파운드 포|용 말기/, { cast: 'slashFan', atCaster: true, hit: 'crescentFan', ...pal('#a0f0b0', '#ffffff') }],
    [/폭혈/, { cast: 'blackFlames', followCaster: true, hit: 'blackFlames', hitFollow: true, ...pal('#ff4a7a', '#ffb0c8') }],
    [/백뢰|뇌명포|비룡격적|육장광뢰/, { cast: 'chidori', hand: true, hit: 'chidoriHit', ...pal('#c8e0ff', '#ffffff') }],
    [/적화포|창화추/, { cast: 'rasengan', hand: true, hit: 'fireBurst', ...pal('#ff3a3a', '#ffb040') }],
    [/유수암쇄권|흐르는 물|선회 수류|물결 장풍/, { cast: 'loveRibbons', hit: 'punchBarrage', ...pal('#cfeaff', '#ffffff') }],
    [/감마선|우주적 공포/, { cast: 'orangeBeam', hand: true, toTarget: true, hit: 'starBurst', proj: 'lightningArrow', ...pal('#7aff9a', '#ffffff') }],
    [/괴력|앵화충|천년살/, { cast: 'shockDebris', atCaster: true, hit: 'shockDebris', hitS: 1.3, ...pal('#c89a5a', '#ffd8a0') }],
    [/아침 공작/, { cast: 'flameWings', followCaster: true, hit: 'punchBarrage', ...pal('#ff5a10', '#ffd040') }],
    [/나뭇잎.*선풍|선회 발차기/, { cast: 'vortexColumn', hit: 'starBurst', ...pal('#8ad070', '#ffffff') }],
    [/광속|천총운검|아마노무라쿠모/, { cast: 'thunderDash', followCaster: true, hit: 'starBurst', ...pal('#fff080', '#ffffff') }],
  ];
  const isCanonSkip = (name) => { const C = window.CANON; if (!C || !name) return false; try { if (C instanceof Set || C instanceof Map) { for (const k of C.keys()) if (name.includes(k) || k.includes(name)) return true; return false; } if (Array.isArray(C)) return C.some(k => typeof k === 'string' ? (name.includes(k) || k.includes(name)) : (k && k.name && (name.includes(k.name) || k.name.includes(name)))); return Object.keys(C).some(k => name.includes(k) || k.includes(name)); } catch (e) { return false; } };
  CN.push(
    [/그림자 분신|분신술/, { cast: 'smokeRing', atCaster: true, hit: 'starBurst', ...pal('#e8e8f0', '#ffffff') }],
    [/까마귀/, { cast: 'featherScatter', followCaster: true, hit: 'featherScatter', ...pal('#2a2030', '#e01a2a') }],
    [/수교탄|수둔/, { cast: 'waterWave', hit: 'waterDragon', ...pal('#3a8aff', '#cfeaff') }],
    [/토류벽|토둔/, { cast: 'shockDebris', atCaster: true, hit: 'shockDebris', ...pal('#c89a5a', '#ffd8a0') }],
    [/백호인/, { cast: 'runeCircle', followCaster: true, hit: 'shockDebris', ...pal('#c070ff', '#ffd0ff') }],
    [/의료 인술|장선술/, { cast: 'rasengan', hand: true, hit: 'lotus', ...pal('#6aff9a', '#d0ffe0') }],
    [/뼈 풍선|기어 서드/, { cast: 'rubberPunch', toTarget: true, S: 1.8, hit: 'shockDebris', ...pal('#ffd0b0', '#ff6a3a') }],
    [/모래|사둔|사박/, { cast: 'vortexColumn', hit: 'sandCoffin', hitFollow: true, hitS: .7, ...pal('#d8b070', '#a07840') }],
    [/낮 호랑이/, { cast: 'flameTiger', toTarget: true, hit: 'windBladeSphere', ...pal('#e8f4ff', '#9fd8ff') }],
    [/다이나믹 엔트리/, { cast: 'thunderDash', followCaster: true, hit: 'starBurst', ...pal('#5ad070', '#ffffff') }],
    [/빛의 속도/, { cast: 'thunderDash', followCaster: true, hit: 'starBurst', ...pal('#fff080', '#ffffff') }],
    [/벼락의 호흡|낙뢰/, { cast: 'thunderDash', followCaster: true, hit: 'chidoriHit', ...pal('#ffe040', '#ffffff') }],
    [/엄니/, { cast: 'slashFan', atCaster: true, hit: 'crescentFan', ...pal('#9ab0d0', '#ffffff') }],
    [/불꽃의 호흡|불꽃 돌진/, { cast: 'sunRing', hit: 'fireBurst', ...pal('#ff6a10', '#ffcf40') }],
  );
  const CN2 = CN.map(([re, c]) => [new RegExp(re.source.replace(/ /g, '')), c]); // '·'·띄어쓰기 차이 무시
  const canonOf = (name) => { const n = String(name).replace(/[\s·]/g, ''); for (const [re, c] of CN2) if (re.test(n)) return c; return null; };

  // ── 기술 이름 → 무늬·색 (결정적) ──
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const MEMO = {};
  function look(name, ek) {
    const key = name + '|' + ek; if (MEMO[key]) return MEMO[key];
    const cn = canonOf(name);
    if (cn) { const h0 = hash(name); return MEMO[key] = { cast: cn.cast, hit: cn.hit, extra: cn.extra || null, c1: cn.c1, c2: cn.c2, c3: cn.c3, h: h0, S: cn.S || 1, rot: h0 & 1 ? 1 : -1, inkDark: false, dark: !!cn.dark, canon: cn }; }
    const h = hash(name), h2 = hash(key + '#'), E = ELEM[ek] || ELEM.metal, st = E.style;
    const aff = AFF[ek] || AFF[st] || ALL;
    const cast = aff[h % aff.length]; let hit = ALL[(h >>> 7) % ALL.length]; if (hit === cast) hit = ALL[((h >>> 7) + 5) % ALL.length];
    let extra = ALL[(h >>> 13) % ALL.length]; if (extra === cast || extra === hit) extra = aff[((h >>> 13) + 1) % aff.length];
    const base = new THREE.Color(E.c), hsl = {}; base.getHSL(hsl);
    const dh = ((h2 & 255) / 255 - .5) * .24, ds = .85 + ((h2 >>> 8) & 255) / 255 * .55;
    const c1 = new THREE.Color().setHSL((hsl.h + dh + 1) % 1, clampv(hsl.s * ds + .12, 0, 1), clampv(hsl.l, .45, .66));
    const alt = (h2 >>> 16) & 3, pc = new THREE.Color(E.parts[(h2 >>> 20) % E.parts.length]);
    const c2 = alt === 0 ? new THREE.Color().setHSL((hsl.h + dh + .45 + 1) % 1, .8, .6) : alt === 1 ? new THREE.Color('#fff0c0').lerp(c1, .25) : pc.offsetHSL(dh * .6, .1, 0);
    const c3 = c1.clone().lerp(new THREE.Color('#ffffff'), .5);
    return MEMO[key] = { cast, hit, extra, c1, c2, c3, h, S: .85 + ((h2 >>> 24) & 255) / 255 * .4, rot: h & 1 ? 1 : -1, inkDark: st === 'shadow' };
  }

  // ── 살아있는 무늬 ──
  const live = []; const MAXLIVE = 16;
  function spawn(kind, o) {
    const d = D[kind]; if (!d) return;
    if (live.length >= MAXLIVE) { const i = live.findIndex(x => x.kind === 'mini'); live.splice(i >= 0 ? i : 0, 1); }
    const L = o.look, s = { kind, d, t: -(o.delay || 0), dur: (o.dur || d.dur), p: o.p.clone(), dir: (o.dir || new THREE.Vector3(1, 0, 0)).clone().setY(0), S: (o.S || 1) * (L ? L.S : 1), c1: L.c1, c2: L.c2, c3: L.c3, rot: L.rot, inkDark: L.inkDark, seed: (L.h ^ hash(kind)) % 100000 + (o.seedAdd || 0), follow: o.follow || null, to: o.to || null, atFeet: !!o.atFeet, dark: !!(L && L.dark) };
    if (o.opt) Object.assign(s, o.opt);
    if (s.dir.lengthSq() < 1e-4) s.dir.set(1, 0, 0); s.dir.normalize();
    if (d.init) d.init(s); live.push(s); return s;
  }
  function tick(dt) {
    clock += dt; camPos.copy(camera.position);
    BL.forEach(b => b.n = 0);
    for (let i = live.length - 1; i >= 0; i--) { const s = live[i]; s.t += dt; if (s.t < 0) continue; const u = s.t / s.dur; if (u >= 1) { live.splice(i, 1); continue; } try { s.d.draw(s, u, dt); } catch (e) { live.splice(i, 1); console.warn('fxstyle', s.kind, e); } }
    projTrails(dt);
    BL.forEach(b => { b.m.count = b.n; if (b.n) { b.m.instanceMatrix.needsUpdate = true; b.iCol.needsUpdate = true; } });
  }

  // ── 투사체: 기술 색으로 물들이고 꼬리 무늬 5종 ──
  function projTrails(dt) {
    if (typeof projs === 'undefined') return;
    for (const p of projs) {
      if (p.done || !p.mesh) continue;
      const nm0 = p.nm || (p.owner && p.owner._sk && p.owner._sk.name) || p.kind; if (p._skip === undefined) p._skip = isCanonSkip(String(nm0)); if (p._skip) continue;
      const L = look(nm0, p.ek || 'metal');
      if (L.canon && L.canon.proj && PROJ[L.canon.proj]) { if (!p._hid) { p._hid = 1; p.mesh.visible = false; } PROJ[L.canon.proj](p, L, Math.max(.6, p.size)); continue; } // 원작 모양을 투사체 자리에 직접 그림
      if (!p._tint) { p._tint = 1; p.mesh.traverse(o => { const m = o.material; if (m && m.uniforms && m.uniforms.uC) { const c = m.uniforms.uC.value; if (c.r + c.g + c.b < 2.7) c.copy(L.c1); } }); }
      p._h = p._h || []; p._h.unshift(p.p.clone()); if (p._h.length > 14) p._h.pop();
      const st = (L.h >>> 3) % 5, sz = Math.max(.6, p.size), v = p.v.clone().normalize();
      bb(B.glow, p.p, 9 * sz, 0, L.c1, .75, 1.2); bb(B.flare, p.p, 7 * sz, clock * 5, L.c3, .5);
      if (st === 0) p._h.forEach((q, i) => { if (i) seg(B.streak, p._h[i - 1], q, 4 * sz * (1 - i / 14), i % 2 ? L.c1 : L.c2, (1 - i / 14) * .8, 1.3); });
      else if (st === 1) { const sd = new THREE.Vector3(-v.z, 0, v.x).normalize(), up = new THREE.Vector3().crossVectors(v, sd); for (let i = 0; i < 12; i++) { const a = clock * 14 + i * .55, q = p._h[Math.min(p._h.length - 1, i)]; for (const k of [0, Math.PI]) { _w.copy(q).addScaledVector(sd, Math.cos(a + k) * 3 * sz).addScaledVector(up, Math.sin(a + k) * 3 * sz); bb(B.glow, _w, 2 * sz * (1 - i / 12) + .5, 0, k ? L.c2 : L.c1, .8 * (1 - i / 12), 1.3); } } }
      else if (st === 2) p._h.forEach((q, i) => { if (i % 2 === 0) bb(B.flare, q, 5 * sz * (1 - i / 14) + 1, clock * 3 + i, i % 4 ? L.c2 : W, .7 * (1 - i / 14)); });
      else if (st === 3) p._h.forEach((q, i) => { if (i % 3 === 1) facing(B.ring, q, v, 0, 7 * sz * (1 + i / 10), 7 * sz * (1 + i / 10), L.c1, .7 * (1 - i / 14), 1.3); });
      else p._h.forEach((q, i) => { if (i % 2) bb(B.flame, q, 3.2 * sz * (1 - i / 16), Math.atan2(-v.x, v.y), mixC(L.c2, L.c1, i / 14), .85 * (1 - i / 14), 1.3, 7 * sz * (1 - i / 16)); });
    }
  }

  // ── 연결: 시전·명중·막기·광역·매 화면 ──
  const now = () => clock;
  const _callout = callout;
  callout = function (f, text, ult) {
    _callout(f, text, ult);
    try { if (!f || !f.ch) return; const name = String(text), ek = f.elem || (f.ch.sig && f.ch.sig.elem) || 'metal';
      f._sk = { name, ek, ult: !!ult, t: now(), hits: 0, skip: isCanonSkip(name) }; if (f._sk.skip) return; // canon.js 가 손수 만든 기술은 건드리지 않음
      const L = look(name, ek), cn = L.canon, tg = f.target && F.includes(f.target) ? f.target : null, dir = tg ? dirTo(f, tg) : fwdOf(f), to = tg ? () => chest(tg) : null;
      if (cn) { const opt = { hand: !!cn.hand, overHead: !!cn.overHead, gatling: !!cn.gatling, steam: !!cn.steam, zig: !!cn.zig, flameTrail: !!cn.flameTrail, one: !!cn.one };
        spawn(L.cast, { p: chest(f), dir, follow: cn.atCaster ? null : f, to, look: L, S: (cn.S || 1) * (ult ? 1.1 : .9), opt, atFeet: !!cn.followCaster && !cn.hand && !cn.overHead && ['susanoo', 'roomSphere', 'vortexColumn', 'psychicStorm'].includes(L.cast) });
        if (cn.extra) spawn(cn.extra, { p: chest(f), dir, follow: f, to, look: L, S: 1, delay: .25, seedAdd: 7 });
      } else {
        spawn(L.cast, { p: chest(f), dir, follow: f, to, look: L, S: ult ? 1.15 : .75 });
        if (ult) spawn(L.extra, { p: chest(f), dir, follow: f, to, look: L, S: 1, delay: .18, seedAdd: 7 });
      }
    } catch (e) { console.warn('fxstyle cast', e); }
  };
  // 기본 시전 효과(모든 기술이 똑같이 보이던 회오리·불티 기둥)는 줄이고 기술별 무늬가 주인공이 되게
  const _castFX = castFX;
  castFX = function (f, ult) { if (ult) return _castFX(f, ult); const e = f.elem || (f.ch.sig && f.ch.sig.elem) || 'power', E = ELEM[e] || ELEM.power; light(chest(f), E.c, 4); };
  function onHit(v, a, ek, blocked) {
    if (!v || !F.includes(v)) return; const t = now(); if (v._sgT && t - v._sgT < .12) return; v._sgT = t;
    const sk = a && a._sk && t - a._sk.t < 3.5 ? a._sk : null, name = sk ? sk.name : (a && a.ch ? a.ch.name + '·기본' : 'hit'), e = ek || (sk && sk.ek) || (a && a.elem) || 'metal';
    if (sk && (sk.skip || isCanonSkip(sk.name))) return;
    const L = look(name, e), dir = a && a.pos ? dirTo(a, v) : new THREE.Vector3(1, 0, 0), cn = L.canon;
    if (sk) sk.hits++;
    const full = sk && sk.hits === 1 && (!blocked || cn); // 원작 기술은 막혀도 고유 모양이 보이게(작게)
    if (full && cn) spawn(L.hit, { p: chest(v), dir, look: L, S: (cn.hitS || 1) * (sk.ult ? 1.15 : .9) * (blocked ? .7 : 1), to: () => chest(v), follow: cn.hitFollow ? v : null, opt: { dark: !!cn.dark } });
    else if (full) spawn(L.hit, { p: chest(v), dir, look: L, S: sk.ult ? 1.25 : .9, to: () => chest(v), follow: null });
    else spawn('mini', { p: chest(v), dir, look: L, S: blocked ? .6 : .8, seedAdd: Math.floor(t * 100) % 97 });
  }
  const _wound = wound;
  wound = function (v, a, text, ek) { _wound(v, a, text, ek); try { onHit(v, a, ek, false); } catch (e) { console.warn('fxstyle hit', e); } };
  const _resolve = resolve;
  resolve = function (a, b, ek, o, nm, pw, at) { const r = _resolve(a, b, ek, o, nm, pw, at); try { if (o === 'block' || o === 'counter') onHit(b, a, ek, true); } catch (e) { console.warn('fxstyle block', e); } return r; };
  const _ultBlast = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) { _ultBlast(p, ek, rad, owner, nm); try { const name = owner && owner._sk ? owner._sk.name : (nm || ek || 'blast'); if (isCanonSkip(String(name)) || isCanonSkip(String(nm || ''))) return; const L = look(String(name), ek || 'metal'); spawn(L.hit, { p, look: L, S: clampv((rad || 50) / 42, .8, 2), dir: owner && owner.pos ? dirTo(owner, { pos: p }) : null }); spawn(L.extra, { p, look: L, S: clampv((rad || 50) / 55, .7, 1.6), delay: .12, seedAdd: 3 }); } catch (e) { console.warn('fxstyle ult', e); } };
  const _upd = updateEffects;
  updateEffects = function (dt, t) { _upd(dt, t); try { tick(dt); } catch (e) { console.warn('fxstyle tick', e); } };

  window.FXS = { live, spawn, look, D, B, ALL, stats: () => Object.fromEntries(Object.entries(B).map(([k, b]) => [k, b.n])) };
})();
