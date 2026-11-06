// 교전 배경: 거대한 절벽 밑 대자연 분지(원펀맨 사이타마 VS 제노스 대련지 느낌) — 소유자 요청 11-05
// - 사방을 둘러싼 높은 암벽(층리 무늬 셰이더) + 절벽 밑 돌무더기 + 흩어진 큰 바위 + 원경 산봉우리·안개로 거대함
// - 밝은 낮 하늘(그라데이션 + 절차 생성 구름), 따뜻한 햇빛
// - 기존 무한열차 밤 배경은 지우지 않고 숨김. 고르기: localStorage 'arenaWorld' = 'cliff'(기본) / 'train' — 바꾸면 새로고침
// - 저작권 그림·모형 없이 코드로만 만든다. 원경은 충돌 없음, 경기장(ARENA 110) 안 바위는 collide.js·physics.js 가 읽는 형식(Dodecahedron, 크기 5 이상)으로 둔다.
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined') return;
  const T0 = performance.now();
  let mode = 'cliff'; try { mode = localStorage.getItem('arenaWorld') || 'cliff'; } catch (e) { }
  const W = window.WORLD_BG = { mode, ms: 0, built: false, set(m) { try { localStorage.setItem('arenaWorld', m); } catch (e) { } location.reload(); } };

  // ── [배경] 고르기(시점 단추 줄 끝, 작게) ──
  (function ui() {
    const bar = document.getElementById('viewBar'); if (!bar) return;
    const s = document.createElement('select'); s.title = '배경 고르기(바꾸면 새로고침)'; s.style.marginLeft = '6px';
    [['cliff', '배경: 절벽 분지'], ['train', '배경: 무한열차']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
    s.value = mode; s.onchange = () => W.set(s.value); bar.appendChild(s);
  })();
  if (mode !== 'cliff') return;

  // ── 1) 무한열차 밤 배경 숨기기(흙바닥·자갈·풀은 남김) ──
  const KEEP = new Set(['2a4a2a', '3a5a30', '22402a', '4a5a2a']); // 풀만 남김(각진 옛 자갈은 숨기고 자연석 잔돌로 대신)
  let ground = null;
  const firstBlob = scene3.children.findIndex(o => typeof blobMat !== 'undefined' && o.material === blobMat); // arena.js mergeStatic 이 합친 배경은 발밑 그림자(blob)보다 앞에 있음
  scene3.children.forEach((o, ci) => {
    if (o.isMesh && o.material && o.material.normalMap && o.material.roughnessMap && !ground) { ground = o; return; } // env.js 실사 흙바닥
    if (o.isMesh && ci < firstBlob && o.matrixAutoUpdate === false && o.material && !o.material.normalMap) { const c = o.material.color ? o.material.color.getHexString() : ''; if (!KEEP.has(c)) o.visible = false; return; } // 합친 배경(기차·철둑·선로·전봇대·산·숲·달)
    if (o.isSprite && o.position.distanceTo(MOON) < 1) { o.visible = false; return; } // 달무리
    if (o.isPoints && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count === 900) { o.visible = false; return; } // 별
    if (o.isGroup || o.type === 'Object3D') { let tr = false; o.traverse(c => { if (c === lampSpr) tr = true; }); if (tr) o.visible = false; } // 열차 전조등
  });
  try { smokeP = null; } catch (e) { } // 기차 연기 끔
  if (window.MV && Array.isArray(MV.PLAT)) { for (let i = MV.PLAT.length - 1; i >= 0; i--) { const n = MV.PLAT[i].name || ''; if (/열차|기관차|전봇대|철둑/.test(n)) MV.PLAT.splice(i, 1); } } // 사라진 기차 위로 뛰어오르지 않게

  // ── 2) 낮 하늘·빛·안개 ──
  const HORIZON = new THREE.Color('#cddbe6');
  scene3.background = HORIZON.clone();
  scene3.fog = new THREE.Fog('#c8d6e2', 520, 1750);
  camera.far = Math.max(camera.far, 2600); camera.updateProjectionMatrix();
  scene3.children.forEach(o => { if (o.isHemisphereLight) { o.color.set('#cfe2ff'); o.groundColor.set('#8a7458'); o.intensity = .78; } });
  sun.color.set('#fff1dc'); sun.intensity = 1.05; sun.position.set(-210, 420, 160);
  try { if (typeof waterU !== 'undefined') waterU.uFog.value.set('#c8d6e2'); } catch (e) { }
  if (ground) { ground.material.color.set('#b9a68c'); }

  // 하늘 돔: 천정 푸른색 → 지평선 밝은 하늘색, 해 둘레 은은한 빛
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: new THREE.Color('#3f7fd0') }, uMid: { value: new THREE.Color('#8fbbe6') }, uHor: { value: HORIZON }, uSun: { value: new THREE.Vector3(-210, 420, 160).normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uSun; varying vec3 vD;
      void main(){ float y = clamp(vD.y, -.2, 1.); vec3 c = mix(uHor, uMid, smoothstep(0., .22, y)); c = mix(c, uTop, smoothstep(.22, .85, y));
        float s = max(dot(normalize(vD), uSun), 0.); c += vec3(1., .93, .78) * (pow(s, 600.) * 2.2 + pow(s, 24.) * .22); gl_FragColor = vec4(c, 1.); }`,
  }));
  sky.renderOrder = -100; sky.frustumCulled = false; scene3.add(sky);
  const skyFollow = () => sky.position.copy(camera.position);

  // 구름: 캔버스로 그린 솜뭉치(한 장 공유) 스프라이트
  const cloudTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 46; i++) { const cx = 40 + Math.random() * 176, cy = 54 + Math.random() * 34 - (Math.abs(cx - 128) < 50 ? 14 : 0), r = 14 + Math.random() * 26; const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.55, 'rgba(250,252,255,.55)'); g.addColorStop(1, 'rgba(240,246,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
    const g2 = x.createLinearGradient(0, 60, 0, 128); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(150,170,195,.35)'); x.globalCompositeOperation = 'source-atop'; x.fillStyle = g2; x.fillRect(0, 0, 256, 128);
    return new THREE.CanvasTexture(c); })();
  const clouds = [];
  for (let i = 0; i < 9; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: R(.55, .9), depthWrite: false, fog: false }));
    const a = R(0, PI * 2), d = R(900, 1500); sp.position.set(Math.cos(a) * d, R(520, 900), Math.sin(a) * d - 200); const s = R(380, 760); sp.scale.set(s, s * .45, 1); sp.renderOrder = -90; scene3.add(sp); clouds.push({ sp, v: R(3, 8) }); }

  // ── 3) 절벽 고리(분지를 둘러싼 거대 암벽) ──
  // 잡음(값 잡음 fbm)
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
  const fbm = (x, y, o = 5) => { let s = 0, w = .5, f = 1; for (let i = 0; i < o; i++) { s += vn(x * f, y * f) * w; f *= 2.03; w *= .5; } return s; };

  // 층리 색은 정점에서(가벼움), 조각에서는 잔 거칠기 한 번 + 빛 + 안개만 — 화면을 크게 덮어도 가볍게
  const rockVS = `attribute float aF; varying vec3 vW; varying vec3 vN; varying vec3 vCol;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      float y = w.y + n2(w.xz * .012) * 26. + w.x * .03;
      float band = sin(y * .11) * .5 + .5, fine = sin(y * .53 + n2(w.xz * .05) * 4.) * .5 + .5;
      vec3 c1 = vec3(.62, .52, .40), c2 = vec3(.50, .41, .32), c3 = vec3(.72, .63, .50), c4 = vec3(.40, .33, .27);
      vec3 col = mix(c1, c2, band); col = mix(col, c3, smoothstep(.72, 1., fine) * .55); col = mix(col, c4, smoothstep(.0, .25, fine) * .35);
      col = mix(col, vec3(.55,.5,.42), smoothstep(.55,.95,vN.y) * .5); col = mix(col, col * .55, smoothstep(.6, 1., aF));
      vCol = col; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const rockFS = `uniform vec3 uSun; uniform vec3 uFogC; uniform float uFogN; uniform float uFogF; varying vec3 vW; varying vec3 vN; varying vec3 vCol;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main(){ vec3 n = normalize(vN); float grit = h(floor(vW.xy * .9) + floor(vW.zy * .7));
      float l = max(dot(n, uSun), 0.); float lit = .48 + .62 * smoothstep(.0, .55, l) + .12 * smoothstep(.55, .9, l);
      vec3 c = vCol * (.88 + grit * .16) * lit * vec3(1.02,.98,.92) + vec3(.06,.07,.09) * (1. - l);
      float d = length(cameraPosition - vW); c = mix(c, uFogC, clamp((d - uFogN) / (uFogF - uFogN), 0., 1.) * .92);
      gl_FragColor = vec4(c, 1.); }`;
  const rockU = () => ({ uSun: { value: new THREE.Vector3(-210, 420, 160).normalize() }, uFogC: { value: new THREE.Color('#c8d6e2') }, uFogN: { value: 520 }, uFogF: { value: 1750 } });
  const rockMat = new THREE.ShaderMaterial({ uniforms: rockU(), vertexShader: rockVS, fragmentShader: rockFS });

  // 고리 모양 벽: 안쪽 반지름이 방향마다 다르고(타원 + 잡음), 높이에 따라 계단식 턱·돌출부. 카메라(앞쪽 +z)는 열린 쪽이 멀어 넓게 보이게.
  const SEG = 220, ROWS = 92, TOPH = 430;
  const baseR = a => { const c = Math.cos(a), s = Math.sin(a), rx = 360, rz = s < 0 ? 330 : 660; return 1 / Math.sqrt((c / rx) * (c / rx) + (s / rz) * (s / rz)); }; // 타원: 뒤(-z)는 가깝게, 카메라 쪽(+z)은 멀게
  const pos = [], fr = [], idx = [];
  for (let r = 0; r <= ROWS; r++) {
    const v = r / ROWS, y = v * TOPH;
    for (let s = 0; s <= SEG; s++) {
      const u = s / SEG, a = u * PI * 2;
      const R0 = baseR(a);
      const terr = Math.floor(v * 7) / 7, step = (v - terr) * 7; // 계단식 턱
      const prof = -18 * Math.sin(v * PI) + 22 * smooth(step) * (1 - v) + 40 * v * v; // 위로 갈수록 살짝 뒤로
      const nz = fbm(u * 28, v * 6) * 70 + fbm(u * 90, v * 22, 3) * 18 - 50; // 굵은 돌출 + 잔 요철
      const crack = Math.pow(Math.abs(Math.sin(u * PI * 2 * 37 + fbm(u * 10, v * 2) * 6)), 26); // 세로 틈
      const rr = R0 + prof + nz + crack * 10;
      pos.push(Math.cos(a) * rr, y + (r === ROWS ? fbm(u * 15, 3) * 120 - 40 : 0), Math.sin(a) * rr - 60); fr.push(crack);
    }
  }
  function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
  for (let r = 0; r < ROWS; r++) for (let s = 0; s < SEG; s++) { const i = r * (SEG + 1) + s; idx.push(i, i + 1, i + SEG + 1, i + 1, i + SEG + 2, i + SEG + 1); }
  const wallG = new THREE.BufferGeometry(); wallG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wallG.setAttribute('aF', new THREE.Float32BufferAttribute(fr, 1)); wallG.setIndex(idx); wallG.computeVertexNormals();
  // 안쪽을 보는 면이 앞면이 되도록(법선이 분지 안쪽을 향함)
  { const n = wallG.attributes.normal; for (let i = 0; i < n.count; i++) { const x = pos[i * 3], z = pos[i * 3 + 2] + 60, d = Math.hypot(x, z) || 1; if (n.getX(i) * x / d + n.getZ(i) * z / d > 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); } }
  const wall = new THREE.Mesh(wallG, rockMat); rockMat.side = THREE.DoubleSide; wall.matrixAutoUpdate = false; scene3.add(wall);

  // 원경 산봉우리(절벽 너머, 안개 속에 겹겹이) — 거대함
  const peakMat = new THREE.ShaderMaterial({ uniforms: rockU(), vertexShader: rockVS, fragmentShader: rockFS, fog: false });
  const peakGeos = [];
  for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2 + R(-.08, .08), d = R(820, 1250), hgt = R(420, 820), rad = R(160, 300);
    const g = new THREE.ConeGeometry(rad, hgt, 28, 14); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k) / hgt + .5; const j = fbm(p.getX(k) * .02 + i, p.getZ(k) * .02) * 60 * (1 - y); p.setX(k, p.getX(k) + j); p.setZ(k, p.getZ(k) + j * .7); }
    g.setAttribute('aF', new THREE.Float32BufferAttribute(new Float32Array(p.count), 1)); g.computeVertexNormals();
    const o = new THREE.Object3D(); o.position.set(Math.cos(a) * d, hgt / 2 - 20, Math.sin(a) * d - 60); o.rotation.y = R(0, 6); o.updateMatrix(); const gi = g.toNonIndexed(); gi.applyMatrix4(o.matrix); peakGeos.push(gi); g.dispose(); }
  const peaks = (() => { const names = ['position', 'normal', 'aF'], out = new THREE.BufferGeometry(); names.forEach(nm => { const sz = peakGeos[0].attributes[nm].itemSize, arr = new Float32Array(peakGeos.reduce((s, g) => s + g.attributes[nm].count * sz, 0)); let off = 0; peakGeos.forEach(g => { arr.set(g.attributes[nm].array, off); off += g.attributes[nm].count * sz; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); }); out.computeBoundingSphere(); peakGeos.forEach(g => g.dispose()); const m = new THREE.Mesh(out, peakMat); m.matrixAutoUpdate = false; scene3.add(m); return m; })();

  // ── 4) 돌무더기(절벽 밑)·흩어진 큰 바위(경기장 밖) — 하나의 InstancedMesh 로 그리기 호출 최소 ──
  // 자연석: 잘게 나눈 구(분할 3~4)에 큰 덩어리·잔 요철·층리 결을 잡음으로 변위 → 둥글게 풍화된 모서리, 부드러운 법선.
  // 모양 5종을 만들어 바위마다 다르게(같은 모양 반복 없음 — 회전·비율도 무작위). 색은 정점 색(아래 흙먼지·위 밝은 풍화면·층리 줄·이끼 얼룩) × 바위별 색조.
  const bMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .97, metalness: 0, vertexColors: true });
  function naturalRock(seed, detail) {
    const g = new THREE.IcosahedronGeometry(1, detail); const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    const sx = 1 + R(-.25, .35), sy = R(.55, .95), sz = 1 + R(-.25, .3), tilt = R(-.3, .3);
    for (let k = 0; k < n; k++) { let x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const big = fbm(x * 1.1 + seed, z * 1.1 + y * .7 + seed * 1.7, 3), small = fbm(x * 4.2 + seed * 3, y * 4.2 + z * 2.1, 3), flat = Math.max(0, -y) * .35; // 아랫면은 땅에 놓이게 평평
      const strata = Math.sin((y + x * tilt) * 9 + seed) * .025;
      const r = .78 + big * .42 + small * .12 + strata; x *= r * sx; y = (y * r + flat) * sy; z *= r * sz; p.setXYZ(k, x, y, z);
      const top = Math.max(0, y / sy), dust = Math.max(0, -y / sy * 1.4), moss = fbm(x * 3 + seed, z * 3, 2) > .62 && top > .25 ? .18 : 0;
      const band = .5 + .5 * Math.sin((y + x * tilt) * 14 + seed * 2), b = .78 + top * .2 + band * .06 + small * .08;
      col[k * 3] = (b - dust * .18 - moss * .4) * 1.0; col[k * 3 + 1] = (b - dust * .2 - moss * .05) * .93; col[k * 3 + 2] = (b - dust * .26 - moss * .35) * .84; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); smoothNormals(g); return g;
  }
  // 다면체는 꼭짓점이 면마다 따로라 각져 보임 → 같은 자리 꼭짓점의 법선을 평균해 매끈하게
  function smoothNormals(g) { const p = g.attributes.position, nm = g.attributes.normal, acc = new Map(), key = i => (p.getX(i) * 1e3 | 0) + ',' + (p.getY(i) * 1e3 | 0) + ',' + (p.getZ(i) * 1e3 | 0);
    for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += nm.getX(i); a[1] += nm.getY(i); a[2] += nm.getZ(i); acc.set(k, a); }
    for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; nm.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); } nm.needsUpdate = true; }
  const SHAPES = [0, 1, 2, 3, 4].map(i => naturalRock(11 + i * 7.3, i < 2 ? 6 : 5));
  /* 크기별 분할(11-06 장면 비용 절감): 잔돌은 분할 1(80면), 절벽 밑 돌무더기는 3(320면), 흩어진 큰 바위만 원래 분할 — 화소보다 작은 면이 쏟아지던 것을 줄임 */
  const SH_LO = [0, 1, 2, 3, 4].map(i => naturalRock(11 + i * 7.3, 1)), SH_MID = [0, 1, 2, 3, 4].map(i => naturalRock(11 + i * 7.3, 3));
  window.WORLD_BG.naturalRock = naturalRock;
  const list = [];
  for (let i = 0; i < 180; i++) { const a = R(0, PI * 2), R0 = baseR(a) - R(10, 60), s = R(4, 26) * (Math.random() < .12 ? 1.8 : 1); list.push([Math.cos(a) * R0, s * R(.2, .5), Math.sin(a) * R0 - 60, s, s * R(.55, .9), s * R(.8, 1.2)]); } // 절벽 밑 돌무더기
  for (let i = 0; i < 46; i++) { const a = R(0, PI * 2), d = R(135, 250), s = R(6, 22); const x = Math.cos(a) * d, z = Math.sin(a) * d * .9 - 30; if (Math.hypot(x, z) < 128) continue; list.push([x, s * .25, z, s, s * R(.5, .85), s * R(.8, 1.3)]); } // 흩어진 바위
  for (let i = 0; i < 200; i++) { const a = R(0, PI * 2), d = R(60, 300), s = R(.6, 1.8); list.push([Math.cos(a) * d, s * .2, Math.sin(a) * d - 40, s, s * .6, s]); } // 잔돌
  const o3 = new THREE.Object3D(), cc = new THREE.Color(), tones = ['#9a8670', '#a8937a', '#8c7a66', '#b09c82', '#857260'];
  const nRub = 180, byShape = []; list.forEach((it, i) => { const lv = it[3] < 2.5 ? SH_LO : i < nRub ? SH_MID : SHAPES; const key = (lv === SH_LO ? 'L' : lv === SH_MID ? 'M' : 'H') + (i % 5); let e = byShape.find(b => b.key === key); if (!e) byShape.push(e = { key, geo: lv[i % 5], arr: [] }); e.arr.push(it); });
  const insts = byShape.map(({ geo, arr }) => { const im = new THREE.InstancedMesh(geo, bMat, arr.length);
    arr.forEach(([x, y, z, sx, sy, sz], i) => { o3.position.set(x, y, z); o3.rotation.set(R(-.25, .25), R(0, 6.3), R(-.25, .25)); o3.scale.set(sx, sy * 1.25, sz); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); cc.set(pick(tones)).multiplyScalar(R(.82, 1.06)); im.setColorAt(i, cc); });
    if (im.instanceColor) im.instanceColor.needsUpdate = true; im.instanceMatrix.needsUpdate = true; im.matrixAutoUpdate = false; im.receiveShadow = true; scene3.add(im); return im; });

  // 경기장 바위(moves.js 의 발판 바위 3개): 충돌 모양(collide.js·physics.js 가 읽는 다면체 메시)은 그대로 두고 보이지만 않게, 같은 자리에 자연석을 겹쳐 그림
  const arenaRockMat = new THREE.MeshStandardMaterial({ color: '#9a8670', roughness: .97, metalness: 0, vertexColors: true }); // 정점 색 × 바위 색조(색조 없이 쓰면 흰 덩어리로 보였음)
  scene3.children.slice().forEach((o, i) => { if (!(o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.type === 'DodecahedronGeometry' && o.scale.x >= 5)) return;
    o.material = o.material.clone(); o.material.visible = false; // 판정용 다면체는 그대로(보이지만 않음)
    const vis = new THREE.Mesh(naturalRock(70 + i * 3.1, 8), arenaRockMat); vis.position.copy(o.position); vis.rotation.copy(o.rotation); vis.scale.set(o.scale.x * 1.08, o.scale.y * 1.12, o.scale.z * 1.08); vis.receiveShadow = true; vis.castShadow = true; scene3.add(vis); });

  // 들린 암반 판(env.js 판석): 얇은 판자 → 두께 있는 깨진 암반(들쭉날쭉한 단면, 위는 흙 덮인 지표, 아래는 짙은 흙)
  (function thickSlab() {
    const slabM = scene3.children.find(o => o.isInstancedMesh && o.geometry && o.geometry.type === 'BoxGeometry' && o.instanceMatrix && o.instanceMatrix.count === 90); if (!slabM) return;
    const g = new THREE.BoxGeometry(1, 1, 1, 6, 3, 6), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), sd = R(0, 50);
    for (let k = 0; k < n; k++) { let x = p.getX(k), y = p.getY(k), z = p.getZ(k); const edge = Math.max(Math.abs(x), Math.abs(z)) > .45;
      const jag = edge ? (fbm(x * 6 + sd, z * 6 + y * 3, 3) - .5) * .5 : 0; x *= 1 + jag; z *= 1 + jag * .8; // 깨진 가장자리
      y = y * .9 + (y > .4 ? (fbm(x * 3 + sd, z * 3, 2) - .5) * .25 : 0) + (y < -.4 ? (fbm(x * 5, z * 5 + sd, 2) - .5) * .35 : 0); // 위는 지표 굴곡, 아래는 뜯긴 흙
      p.setXYZ(k, x, y, z);
      const top = y > .3, bot = y < -.3; const r = top ? .86 : bot ? .42 : .7 + fbm(x * 8, y * 8 + sd, 2) * .2;
      col[k * 3] = r; col[k * 3 + 1] = r * (top ? .9 : .86); col[k * 3 + 2] = r * (top ? .78 : .74); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); g.scale(1, 1.9, 1); // 두께 약 4배(0.45 → 1.7)
    const m = slabM.material.clone(); m.vertexColors = true; m.flatShading = false; slabM.geometry = g; slabM.material = m;
  })();

  // ── 5) 낮 빛에서 인물 피부가 하얗게 날리지 않게: 밤 기준 자체 발광(따뜻한 보정)을 낮 배경에서는 줄임 ──
  const DAY_EMI = .32; W.skinK = DAY_EMI;
  const adj = new WeakSet();
  function dayFix() { if (typeof F === 'undefined') return; F.forEach(f => { const root = f.model && f.model.root; const scan = r => r && r.traverse(o => { const m = o.material; if (!m || adj.has(m)) return; (Array.isArray(m) ? m : [m]).forEach(mm => { if (mm && mm.emissive && !adj.has(mm) && mm.emissive.r + mm.emissive.g + mm.emissive.b > .3) { mm.emissive.multiplyScalar(DAY_EMI); adj.add(mm); } }); });
    scan(root); scan(f.mc && f.mc.root); scan(f.mocap && f.mocap.root); }); }
  setInterval(dayFix, 1500);

  // ── 6) 매 화면: 하늘을 카메라에 붙이고 구름 천천히 흐름 ──
  const _u = update;
  update = function (dt, t) { const r = _u.apply(this, arguments); skyFollow(); for (let i = 0; i < clouds.length; i++) { const c = clouds[i]; c.sp.position.x += c.v * dt; if (c.sp.position.x > 1700) c.sp.position.x = -1700; } return r; };

  if (typeof window.setQuality === 'function') { const _q = window.setQuality; window.setQuality = function (q) { const r = _q.apply(this, arguments); const low = q === 'low'; peaks.visible = !low; clouds.forEach(c => { c.sp.visible = !low; }); return r; }; }
  W.built = true; W.ms = +(performance.now() - T0).toFixed(1);
  W.info = () => ({ mode, wallTris: idx.length / 3, boulders: list.length, clouds: clouds.length, ms: W.ms });
})();
