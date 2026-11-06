// 땅·그림자·지형 파괴: (1) 실사 흙바닥(높이 잡음으로 만든 색·요철 그림 + 젖은 얼룩) (2) 팔·다리·머리를 따라 움직이는 실제 그림자
// (3) 강한 기술·높은 곳 착지에 땅이 패이고(분화구) 깨져 들리고(판석) 솟구치고(바위 가시) 갈라지고(빛나는 균열) 파편이 튀고 흙먼지 고리가 퍼진다.
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined') return;
  const T0 = performance.now();
  // ── 1) 흙바닥 그림 만들기 (타일이 이어지게 주기적인 잡음) ──
  const N = 512, H = new Float32Array(N * N), rnd = (() => { let s = 1234567; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function vnoise(g) { // 격자 g칸, 주기적 값 잡음
    const lat = new Float32Array(g * g); for (let i = 0; i < g * g; i++) lat[i] = rnd();
    return (x, y) => { const fx = x * g / N, fy = y * g / N, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = lat[(iy % g) * g + ix % g], b = lat[(iy % g) * g + (ix + 1) % g], c = lat[((iy + 1) % g) * g + ix % g], d = lat[((iy + 1) % g) * g + (ix + 1) % g];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  }
  const oct = [[4, .42], [8, .26], [16, .16], [32, .09], [64, .05], [128, .025]].map(([g, w]) => [vnoise(g), w]), macro = vnoise(3);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let h = 0; for (const [f, w] of oct) h += f(x, y) * w; H[y * N + x] = h; }
  const COL = new Float32Array(N * N * 3), tint = (i, r, g, b, k) => { COL[i * 3] += (r - COL[i * 3]) * k; COL[i * 3 + 1] += (g - COL[i * 3 + 1]) * k; COL[i * 3 + 2] += (b - COL[i * 3 + 2]) * k; };
  for (let i = 0; i < N * N; i++) { const x = i % N, y = (i / N) | 0, h = H[i], m = macro(x, y); // 마른 흙(밝은 갈색)~눅눅한 흙(어두운 갈색)
    const r = 70 + h * 95 + m * 18, g = 55 + h * 78 + m * 12, b = 38 + h * 55 + m * 6; COL[i * 3] = r; COL[i * 3 + 1] = g; COL[i * 3 + 2] = b; }
  const stamp = (cx, cy, rad, fn) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { const d = Math.hypot(dx, dy) / rad; if (d > 1) continue; const x = (cx + dx + N) % N, y = (cy + dy + N) % N; fn(y * N + x, d); } };
  // 바퀴·발자국 고랑 (세로로 곧게 → 타일 경계에서도 이어짐)
  [[150, 9], [178, 9], [372, 6]].forEach(([cx, w]) => { for (let y = 0; y < N; y++) for (let dx = -w; dx <= w; dx++) { const x = (cx + dx + Math.round(Math.sin(y * .03) * 3) + N) % N, i = y * N + x, d = Math.abs(dx) / w; H[i] -= .07 * (1 - d * d); tint(i, 52, 40, 28, .35 * (1 - d)); } });
  for (let k = 0; k < 26; k++) { const cx = (rnd() * N) | 0, cy = (rnd() * N) | 0, a = rnd() * 6.28; stamp(cx, cy, 7, (i, d) => { H[i] -= .05 * (1 - d); tint(i, 50, 38, 26, .3 * (1 - d)); }); stamp((cx + Math.cos(a) * 10 + N) % N | 0, (cy + Math.sin(a) * 10 + N) % N | 0, 5, (i, d) => { H[i] -= .04 * (1 - d); }); } // 발자국
  // 마른 균열: 이리저리 꺾이는 가는 금
  for (let k = 0; k < 22; k++) { let x = rnd() * N, y = rnd() * N, a = rnd() * 6.28; const L = 40 + rnd() * 120; for (let s = 0; s < L; s++) { a += (rnd() - .5) * .7; x += Math.cos(a); y += Math.sin(a); const i = ((y | 0) + N) % N * N + ((x | 0) + N) % N; H[i] -= .09; tint(i, 28, 20, 14, .75); if (rnd() < .03) { const b2 = a + (rnd() < .5 ? 1 : -1) * (.8 + rnd()); let bx = x, by = y; for (let t = 0; t < 14; t++) { bx += Math.cos(b2); by += Math.sin(b2); const j = ((by | 0) + N) % N * N + ((bx | 0) + N) % N; H[j] -= .06; tint(j, 34, 25, 17, .6); } } } }
  // 자갈: 볼록한 작은 돌(밝은 회갈색, 아래쪽에 그늘)
  for (let k = 0; k < 900; k++) { const cx = (rnd() * N) | 0, cy = (rnd() * N) | 0, r = 1 + (rnd() * (rnd() < .1 ? 5 : 2.5)) | 0, base = 95 + rnd() * 60, gr = rnd() < .5;
    stamp(cx, cy, r, (i, d) => { H[i] += .11 * Math.sqrt(1 - d * d); tint(i, base + (gr ? 8 : 18), base + (gr ? 6 : 8), base - (gr ? 2 : 14), .85 * (1 - d * .4)); }); }
  const can = (draw) => { const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N); draw(im.data); x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const diff = can(d => { for (let i = 0; i < N * N; i++) { d[i * 4] = Math.min(255, COL[i * 3]); d[i * 4 + 1] = Math.min(255, COL[i * 3 + 1]); d[i * 4 + 2] = Math.min(255, COL[i * 3 + 2]); d[i * 4 + 3] = 255; } });
  const nrm = can(d => { const S = 5.5; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const h = (xx, yy) => H[((yy + N) % N) * N + ((xx + N) % N)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * S, dy = (h(x, y + 1) - h(x, y - 1)) * S, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      d[i] = (-dx / l * .5 + .5) * 255; d[i + 1] = (dy / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255; } });
  const rough = can(d => { for (let i = 0; i < N * N; i++) { const v = 200 + (H[i] - .5) * 90; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = Math.max(120, Math.min(255, v)); d[i * 4 + 3] = 255; } });
  let ground = null; scene3.traverse(o => { if (!ground && o.isMesh && o.material && o.material.map && o.material.type === 'MeshToonMaterial' && o.geometry.boundingSphere && o.geometry.boundingSphere.radius > 500) ground = o; });
  if (ground) { [diff, nrm, rough].forEach(t => t.repeat.set(9, 6.5));
    ground.material = new THREE.MeshStandardMaterial({ map: diff, normalMap: nrm, normalScale: new THREE.Vector2(1.6, 1.6), roughnessMap: rough, roughness: 1, metalness: 0, color: '#8f8173' });
    ground.receiveShadow = true; }
  // 넓은 얼룩(타일 반복 숨김) + 기차 쪽 젖은 흙(달빛이 살짝 번들거림)
  const decals = new THREE.Group(); scene3.add(decals);
  const dmat = (c, op, rgh) => new THREE.MeshStandardMaterial({ color: c, map: glowTex, transparent: true, opacity: op, roughness: rgh, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dmat(pick(['#2a2016', '#3a2c1e', '#4a3a28']), R(.25, .45), 1)); m.rotation.x = -Math.PI / 2; m.rotation.z = R(0, 6); const s = R(60, 160); m.scale.set(s, s * R(.5, 1), 1); m.position.set(R(-260, 260), .08, R(-120, 170)); m.receiveShadow = true; decals.add(m); }
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dmat('#140f0a', R(.45, .65), .28)); m.rotation.x = -Math.PI / 2; m.rotation.z = R(0, 6); const s = R(30, 70); m.scale.set(s * 1.6, s, 1); m.position.set(R(-300, 300), .1, R(-150, -125)); m.receiveShadow = true; decals.add(m); }
  // ── 2) 실제 그림자: 인물만 드리우고 땅이 받는다 ──
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .25; sun.shadow.radius = 3;
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 40, far: 700 }); sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(0, 0, -20); sun.target.updateMatrixWorld();
  scene3.traverse(o => { if (o.isMesh) { if (o !== ground && !(o.parent && o.parent.parent === null) && o.material && o.material.type !== 'MeshToonMaterial') { /* 이펙트·배경은 그림자를 드리우지 않음 */ }
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); } });
  scene3.children.forEach(o => { if (o.isMesh && o !== ground && o.castShadow) o.castShadow = false; }); // 합친 배경은 드리우지 않음
  Object.values(CH).forEach(c => c.model && c.model.root.traverse(o => { if (o.isMesh && o.material && o.material !== OUT && o.material.type === 'MeshToonMaterial' && o.visible) o.castShadow = true; }));
  if (typeof blobMat !== 'undefined') blobMat.opacity = .2; // 발밑 원형 그림자는 접지감만 살짝
  let shadowLvl = 2; // 2=2048 매 장면, 1=1024 매 장면, 0=1024 두 장면에 한 번
  function setShadow(l) { if (l === shadowLvl) return; shadowLvl = l; const sz = l === 2 ? ((window.AAA && AAA.ultra) ? 4096 : 2048) : 1024; if (sun.shadow.mapSize.x !== sz) { sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } renderer.shadowMap.autoUpdate = l > 0; }

  // ── 3) 지형 파괴 ──
  const C = c => new THREE.Color(c), up = new THREE.Vector3(0, 1, 0), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E3 = new THREE.Euler(), S3 = new THREE.Vector3();
  const inst = (geo, n, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; for (let i = 0; i < n; i++) { m.setMatrixAt(i, M4.identity()); m.setColorAt(i, C('#6a5640')); } m.count = 0; scene3.add(m); return m; };
  const rockMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: 0, flatShading: true });
  const chunkM = inst(new THREE.DodecahedronGeometry(1, 0), 140, rockMat), slabM = inst(new THREE.BoxGeometry(1, .45, 1), 90, rockMat), spikeM = inst(new THREE.ConeGeometry(1, 1, 5), 70, rockMat);
  const chunks = [], slabs = [], spikes = [];
  const DIRT = ['#5a4632', '#6a5440', '#4a3a28', '#7a644a', '#56483a'];
  const elemRock = ek => ek === 'ice' ? ['#cfefff', '#a8dcf4', '#e8f8ff'] : ek === 'sand' ? ['#c8a868', '#b8985a', '#d8b878'] : (ek === 'fire' || ek === 'sun' || ek === 'kurama' || ek === 'blood') ? ['#3a2a20', '#4a3426', '#2a1e16'] : DIRT;
  function chunk(p, n, spd, ek) { const cols = elemRock(ek); for (let i = 0; i < n; i++) { if (chunks.length >= 140) chunks.shift(); const a = R(0, 6.28), s = R(.6, 2.2) * (spd > 1.5 ? 1.3 : 1);
      chunks.push({ p: V3(p.x + Math.cos(a) * R(0, 6), .5, p.z + Math.sin(a) * R(0, 6)), v: V3(Math.cos(a) * R(20, 70) * spd, R(60, 170) * spd, Math.sin(a) * R(20, 70) * spd), r: V3(R(0, 6), R(0, 6), R(0, 6)), w: V3(R(-9, 9), R(-9, 9), R(-9, 9)), s, life: R(3.5, 5.5), c: C(pick(cols)) }); } }
  function slab(p, n, rad, h, ek, delay = 0) { const cols = elemRock(ek); for (let i = 0; i < n; i++) { if (slabs.length >= 90) slabs.shift(); const a = i / n * 6.28 + R(-.2, .2), d = rad * R(.45, 1);
      slabs.push({ p: V3(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d), yaw: -a, tilt: R(.25, .7) * (rnd() < .5 ? 1 : -1), h: h * R(.5, 1.1), s: V3(R(5, 10), 1, R(4, 8)).multiplyScalar(rad / 30 + .4), t: -delay - R(0, .08), life: R(3.2, 4.4), c: C(pick(cols)) }); } }
  function spike(p, n, rad, h, ek) { const cols = elemRock(ek); for (let i = 0; i < n; i++) { if (spikes.length >= 70) spikes.shift(); const a = R(0, 6.28), d = rad * Math.sqrt(R(0, 1));
      spikes.push({ p: V3(p.x + Math.cos(a) * d, 0, p.z + Math.sin(a) * d), tx: R(-.35, .35), tz: R(-.35, .35), w: R(1.5, 3.4), h: h * R(.5, 1.2), t: -R(0, .25), life: R(2, 3), c: C(pick(cols)) }); } }
  // 분화구(솟은 테두리 + 어두운 바닥) · 빛나다 식는 방사 균열 · 흙먼지 고리 — 작은 묶음을 돌려 씀
  const crackTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineCap = 'round';
    for (let k = 0; k < 11; k++) { let px = 128, py = 128, a = k / 11 * 6.28 + Math.random() * .4, w = 5; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 14; s++) { a += (Math.random() - .5) * .6; px += Math.cos(a) * 9; py += Math.sin(a) * 9; w *= .88; x.lineWidth = Math.max(.6, w); x.lineTo(px, py); x.stroke(); x.beginPath(); x.moveTo(px, py); if (Math.random() < .25) { let bx = px, by = py, ba = a + (Math.random() < .5 ? .9 : -.9); x.lineWidth = Math.max(.5, w * .6); for (let t = 0; t < 4; t++) { bx += Math.cos(ba) * 7; by += Math.sin(ba) * 7; x.lineTo(bx, by); } x.stroke(); x.beginPath(); x.moveTo(px, py); } } }
    return new THREE.CanvasTexture(c); })();
  const pitTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(10,7,4,.95)'); g.addColorStop(.55, 'rgba(26,18,10,.8)'); g.addColorStop(.8, 'rgba(40,30,18,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const rimGeo = new THREE.TorusGeometry(1, .2, 5, 28); const rimMat = new THREE.MeshStandardMaterial({ color: '#5e4a36', roughness: 1, metalness: 0, flatShading: true });
  const pool = (n, mk) => Array.from({ length: n }, () => { const o = mk(); o.visible = false; scene3.add(o); return { o, t: 0, dur: 0, on: false }; });
  const craters = pool(6, () => { const g = new THREE.Group(); const pit = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: pitTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); pit.rotation.x = -Math.PI / 2; pit.position.y = .12; const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 1, .9); rim.receiveShadow = rim.castShadow = true; g.add(pit, rim); g.userData = { pit, rim }; return g; });
  const cracks2 = pool(8, () => { const g = new THREE.Group(); const dark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#0d0905', alphaMap: crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })); const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ff8a20', map: crackTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); [dark, glow].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = .15; }); g.add(dark, glow); g.userData = { dark, glow }; return g; });
  const dusts = pool(10, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color: '#8a7458', transparent: true, depthWrite: false, opacity: .8 })); m.rotation.x = -Math.PI / 2; m.position.y = 1.5; return m; });
  const take = arr => arr.find(x => !x.on) || arr.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
  function crater(p, r) { const c = take(craters); Object.assign(c, { on: true, t: 0, dur: 7, r }); c.o.visible = true; c.o.position.set(p.x, 0, p.z); c.o.scale.setScalar(r); c.o.rotation.y = R(0, 6); }
  function radial(p, r, col) { const c = take(cracks2); Object.assign(c, { on: true, t: 0, dur: 6 }); c.o.visible = true; c.o.position.set(p.x, 0, p.z); c.o.rotation.y = R(0, 6); c.o.scale.set(r * 2.2, 1, r * 2.2); c.o.userData.glow.material.color.set(col); }
  function dust(p, r, col) { const c = take(dusts); Object.assign(c, { on: true, t: 0, dur: 1.1, r }); c.o.visible = true; c.o.position.set(p.x, 1.2, p.z); c.o.material.color.set(col || '#8a7458');
    for (let i = 0; i < 10 + r * .6; i++) { const a = R(0, 6.28); parts.push({ p: V3(p.x + Math.cos(a) * r * .3, R(1, 4), p.z + Math.sin(a) * r * .3), v: V3(Math.cos(a) * R(40, 110), R(6, 30), Math.sin(a) * R(40, 110)), life: R(1, 1.8), c: pick(['#6a5a48', '#7a6852', '#5a4a3a']), g: -2, s: 3, n: true }); } }
  function heave(p, dir, len, ek) { for (let i = 0; i < 9; i++) { const q = p.clone().addScaledVector(dir, 8 + i * len / 9); pending.push({ t: i * .045, fn: () => { slab(q, 2, 7, 6 + i * .5, ek); dust(q, 10); } }); } }
  // 힘·속성에 따라 고르기
  let lastBig = 0; const nowS = () => performance.now() / 1000, onGround = p => p.y < 26 && Math.hypot(p.x, p.z) < 260;
  function smash(p, power, ek, dir) {
    if (!onGround(p)) return; const g = V3(p.x, 0, p.z), col = (ELEM[ek] || ELEM.earth).c, big = power >= 2.4 && nowS() - lastBig > .5;
    dust(g, 14 + power * 10); chunk(g, Math.round(5 + power * 5), .7 + power * .3, ek);
    if (power >= 1.6) radial(g, 10 + power * 7, col);
    if (big) { lastBig = nowS(); crater(g, 8 + power * 4.5);
      const k = (ek === 'ice' || ek === 'earth' || ek === 'sand') ? 'spike' : (ek === 'wind' || ek === 'water' || ek === 'mist') ? 'heave' : pick(['slab', 'slab', 'spike', 'heave']);
      if (k === 'spike') spike(g, 8 + Math.round(power * 3), 10 + power * 6, 9 + power * 4, ek); else if (k === 'heave' && dir) heave(g, dir, 50 + power * 12, ek); else slab(g, 7 + Math.round(power * 2), 12 + power * 6, 6 + power * 3, ek);
      shake = Math.max(shake || 0, 10 + power * 3); }
  }
  const _explode = explode; explode = function (p, ek, pw = 1) { const r = _explode.apply(this, arguments); try { if (pw >= 1.8) smash(p, pw, ek); } catch (e) { } return r; };
  const _ult = ultBlast; ultBlast = function (p, ek, rad, owner, nm) { const r = _ult.apply(this, arguments); try { smash(p, Math.max(2.6, (rad || 60) / 22), ek, owner && p ? V3(p.x - owner.pos.x, 0, p.z - owner.pos.z).normalize() : null); } catch (e) { } return r; };
  const _res = resolve; resolve = function (a, b, ek, o, nm, pw = 1, at) { const r = _res.apply(this, arguments); try { if (pw >= 2 && b && b.pos) smash(b.pos, Math.min(2.3, pw * .85), ek || (a && a.elem) || 'earth', a ? V3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).normalize() : null); } catch (e) { } return r; };

  // ── 매 장면: 파편 물리·판석·가시·분화구·균열·먼지 + 높은 곳 착지 감지 + 그림자 단계 조절 ──
  const _env = envUpdate;
  envUpdate = function (dt, t) {
    _env(dt, t);
    try {
      // 착지: 빠르게 떨어지던 인물이 땅에 닿으면 세기만큼 땅이 반응
      if (typeof F !== 'undefined') F.forEach(f => { const vy = f.vel ? f.vel.y : 0; if (f._wasAir && !f.air && (f._vy || 0) < -170 && f.pos.y < 3) { const pw = Math.min(3.2, (-f._vy - 120) / 90); if (pw > .5) { smash(f.pos, pw, f.elem || 'earth'); if (pw > 1.2) label(headP(f).add(V3(0, 6, 0)), pick(['쿵!', '착지!', '땅이 꺼진다!']), '#d8c8a8'); } } f._wasAir = f.air; if (f.air) f._vy = vy; });
      // 파편: 튀고 구르다 가라앉으며 사라짐
      for (let i = chunks.length - 1; i >= 0; i--) { const c = chunks[i]; c.life -= dt; if (c.life <= 0) { chunks.splice(i, 1); continue; } c.v.y -= 320 * dt; c.p.addScaledVector(c.v, dt); c.r.addScaledVector(c.w, dt);
        if (c.p.y < c.s * .5) { c.p.y = c.s * .5; if (c.v.y < -30) { c.v.y *= -.35; c.v.x *= .6; c.v.z *= .6; c.w.multiplyScalar(.6); } else { c.v.set(c.v.x * .9, 0, c.v.z * .9); c.w.multiplyScalar(.9); } } }
      chunks.forEach((c, i) => { const sink = Math.min(1, c.life / .8); E3.set(c.r.x, c.r.y, c.r.z); Q.setFromEuler(E3); S3.setScalar(c.s * sink); M4.compose(V3(c.p.x, c.p.y - (1 - sink) * c.s, c.p.z), Q, S3); chunkM.setMatrixAt(i, M4); chunkM.setColorAt(i, c.c); });
      chunkM.count = chunks.length; chunkM.instanceMatrix.needsUpdate = true; if (chunkM.instanceColor) chunkM.instanceColor.needsUpdate = true;
      // 판석: 확 들렸다(기울어짐) 내려앉고, 끝에는 땅속으로 가라앉음
      for (let i = slabs.length - 1; i >= 0; i--) { const s = slabs[i]; s.t += dt; if (s.t > s.life) slabs.splice(i, 1); }
      slabs.forEach((s, i) => { const u = Math.max(0, s.t), rise = u < .12 ? u / .12 : u < .5 ? 1 : Math.max(.35, 1 - (u - .5) * 1.3), out = Math.max(0, (u - (s.life - .7)) / .7);
        E3.set(s.tilt * rise, s.yaw, s.tilt * .5 * rise, 'YXZ'); Q.setFromEuler(E3); S3.copy(s.s); M4.compose(V3(s.p.x, s.h * rise * .5 - out * 4 - .5, s.p.z), Q, S3); slabM.setMatrixAt(i, M4); slabM.setColorAt(i, s.c); });
      slabM.count = slabs.length; slabM.instanceMatrix.needsUpdate = true; if (slabM.instanceColor) slabM.instanceColor.needsUpdate = true;
      // 바위 가시: 솟구쳤다 다시 꺼짐
      for (let i = spikes.length - 1; i >= 0; i--) { const s = spikes[i]; s.t += dt; if (s.t > s.life) spikes.splice(i, 1); }
      spikes.forEach((s, i) => { const u = Math.max(0, s.t), k = u < .1 ? u / .1 : u > s.life - .5 ? Math.max(0, (s.life - u) / .5) : 1, h = Math.max(.01, s.h * k);
        E3.set(s.tx, 0, s.tz); Q.setFromEuler(E3); S3.set(s.w, h, s.w); M4.compose(V3(s.p.x, h * .5 - .3, s.p.z), Q, S3); spikeM.setMatrixAt(i, M4); spikeM.setColorAt(i, s.c); });
      spikeM.count = spikes.length; spikeM.instanceMatrix.needsUpdate = true; if (spikeM.instanceColor) spikeM.instanceColor.needsUpdate = true;
      craters.forEach(c => { if (!c.on) return; c.t += dt; const u = c.t / c.dur, a = Math.min(1, c.t * 8) * Math.min(1, (1 - u) * 3); c.o.userData.pit.material.opacity = a; c.o.userData.rim.position.y = -2.2 * (1 - Math.min(1, c.t * 6)) - Math.max(0, u - .7) * 3; if (u >= 1) { c.on = false; c.o.visible = false; } });
      cracks2.forEach(c => { if (!c.on) return; c.t += dt; const u = c.t / c.dur; c.o.userData.glow.material.opacity = Math.max(0, 1 - c.t / 1.3) * (0.8 + Math.random() * .2); c.o.userData.dark.material.opacity = Math.min(1, c.t * 10) * Math.min(1, (1 - u) * 3) * .9; if (u >= 1) { c.on = false; c.o.visible = false; } });
      dusts.forEach(c => { if (!c.on) return; c.t += dt; const u = c.t / c.dur, r = c.r * (1 + u * 3.2); c.o.scale.set(r * 2.4, r * 2.4, 1); c.o.material.opacity = .75 * (1 - u); if (u >= 1) { c.on = false; c.o.visible = false; } });
      // 그림자 단계: 버거우면 해상도↓ → 두 장면에 한 번 갱신
      if (frame % 45 === 0 && typeof ftAvg !== 'undefined') { if (ftAvg > 17.5) setShadow(Math.max(0, shadowLvl - 1)); else if (ftAvg < 14 && shadowLvl < 2) setShadow(shadowLvl + 1); }
      if (shadowLvl === 0) renderer.shadowMap.needsUpdate = frame % 2 === 0;
    } catch (e) { console.error(e); }
  };
  window.__env = { smash, crater, radial, slab, spike, chunk, dust, heave, setShadow, spikes /* collide.js 가 솟은 바위 가시 충돌에 읽음 */, get shadowLvl() { return shadowLvl; }, ms: performance.now() - T0 };
})();
