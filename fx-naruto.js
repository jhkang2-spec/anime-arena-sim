// fx-naruto.js — 나루토 세계관 대표 기술 '원작 형태' 전용 이펙트(11-15 소유자 지시: 유사가 아니라 원작 작화와 같은 형태·색·움직임·순서).
// 연결: callout(기술 시작) → 손에 차지 형태 / proj(투사체) → 투사체를 따라감 / resolve(적중) → 기술 고유 착탄 연출.
//  ① 나선환: 손바닥 위 청백 구체 — 안쪽에서 휘몰아치는 차크라 소용돌이 결 + 바깥을 감는 바람 고리 3겹 → 적중: 나선 드릴 원반·충격파
//     (거대 나선환=크게, 혹성나선환=주위를 도는 작은 구체 4개, 나선연환=양손 2개)
//  ② 나선수리검: 중심 구체 + 하얀 바람 칼날 4장(고속 회전·바람 결) + 날카로운 회전 고리 → 착탄: 미세 바람 칼날이 가득한 하얀 돔이 부풀었다 꺼짐
//  ③ 미수옥: 앞쪽에 청·적 차크라 입자가 모여 검은 구체로 압축(보라 맥동) → 발사 → 착탄: 검보라 거대 폭발 돔 + 백광
//  ④ 그림자 분신: 분신이 생길 때 하얀 연기 '펑'(툰 연기 뭉치)
//  ⑤ 치도리·라이키리: 손에서 사방으로 튀는 청백 번개 가닥(매 프레임 새로 갈라짐) + 새 지저귐 소리 → 적중: 관통 섬광·방사 번개
//  ⑥ 아마테라스·천조: 대상에 들러붙어 일렁이는 검은 불꽃(검붉은 가장자리) 3초
//  ⑦ 기린: 머리 위 먹구름 소용돌이 → 하늘에서 내리꽂는 거대 번개 짐승(굵은 본줄기 + 갈래 + 머리 섬광)
//  ⑧ 카무이: 대상 주변 공간이 소용돌이치며 중심으로 빨려 들어감
//  ⑨ 호화구의 술: 입에서 뿜는 거대한 툰 화염 구체(투사체를 따라감) + 불꽃 꼬리
//  ⑩ 사막 장송: 땅에서 모래가 휘감아 올라 대상을 고치처럼 감싼 뒤 조여 터짐
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined' || typeof update !== 'function') return;
  const NX = window.NARUTO_FX = { on: true, st: {} };
  const Q = () => { try { return (window.getQuality && getQuality()) || 'mid'; } catch (e) { return 'mid'; } };
  const ok = () => NX.on && Q() !== 'low';
  const rr = (a, b) => a + Math.random() * (b - a), V = (x, y, z) => new THREE.Vector3(x, y, z), C = c => new THREE.Color(c);
  const now = () => performance.now() / 1000;
  const A = () => window.ANIME_FX, X = () => window.FX3, S = () => window.SFX_IMPACT;
  const BLOOM = 3, live = [];
  const cnt = k => { NX.st[k] = (NX.st[k] || 0) + 1; };
  // 손 위치: 화면에 보이는 모션캡처 리그의 오른손 뼈(옛 모형 손 handP 는 약 5 어긋남)
  const handBone = new WeakMap();
  const handOf = f => { try { const rig = window.MOCAP && MOCAP.rigs && MOCAP.rigs.get(f.ch.key); if (rig && rig.holder && rig.holder.visible) { let b = handBone.get(rig); if (b === undefined) { b = null; rig.root.traverse(o => { if (!b && o.isBone && /^(hand_r|righthand|mixamorig:righthand|hand.r)$/i.test(o.name)) b = o; }); handBone.set(rig, b); } if (b) return b.getWorldPosition(new THREE.Vector3()); } return handP(f); } catch (e) { return (typeof chest === 'function' ? chest(f) : f.pos.clone().add(V(0, 10, 0))); } };
  const chestOf = f => (typeof chest === 'function' ? chest(f) : f.pos.clone().add(V(0, 10, 0)));
  const NOISE = `float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}`;
  const VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const mat = (fs, u, o = {}) => new THREE.ShaderMaterial(Object.assign({ uniforms: Object.assign({ uT: { value: 0 }, uA: { value: 1 } }, u), vertexShader: VS, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }, o));
  const glowT = (() => { if (typeof glowTex !== 'undefined' && glowTex) return glowTex; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const tag = m => { m.layers.enable(BLOOM); m.frustumCulled = false; m.renderOrder = 1400; return m; };

  // ── 공통 재질 ──
  // 나선환 구체: 위도·경도를 비튼 소용돌이 결이 빠르게 돌고, 중심은 하얗게, 가장자리는 청색 프레넬
  const RAS_FS = `uniform float uT, uA; uniform vec3 uC, uC2; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
    void main(){ vec3 p = normalize(vP); float th = atan(p.z, p.x), ph = acos(clamp(p.y,-1.,1.));
      float sw = th * 3. + ph * 6. - uT * 22.;                        // 소용돌이(나선) 좌표
      float lines = pow(abs(sin(sw)), 18.) + pow(abs(sin(sw * 1.7 + 1.3)), 30.) * .7;
      float n = fbm(vec2(sw * .5, ph * 4. + uT * 3.));
      float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.), rim = pow(1. - face, 2.2);
      vec3 col = mix(uC2, uC, rim) * (lines * 2.4 + n * .9) + mix(uC, vec3(1.), .6) * pow(face, 6.) * 1.1 + uC * rim * 2.2;
      gl_FragColor = vec4(col * uA, clamp((lines * .8 + rim + pow(face, 4.) * .8 + n * .3) * uA, 0., 1.)); }`;
  const ringFS = `uniform float uT, uA; uniform vec3 uC; varying vec2 vUv; ${NOISE}
    void main(){ float n = fbm(vec2(vUv.x * 18. - uT * 9., vUv.y * 2.)); float a = smoothstep(.1, .8, n) * (1. - abs(vUv.y - .5) * 2.) * uA; gl_FragColor = vec4(mix(uC, vec3(1.), .5) * 2.4 * a, a); }`;
  const sphereG = new THREE.SphereGeometry(1, 40, 28), torusG = new THREE.TorusGeometry(1, .07, 8, 72);
  function rasenBall(scale = 1, c = '#5ac8ff', c2 = '#d8f4ff') {
    const g = new THREE.Group(), core = tag(new THREE.Mesh(sphereG, mat(RAS_FS, { uC: { value: C(c) }, uC2: { value: C(c2) } }))); g.add(core);
    const rings = []; for (let i = 0; i < 3; i++) { const r = tag(new THREE.Mesh(torusG, mat(ringFS, { uC: { value: C('#bff0ff') } }))); r.scale.setScalar(1.35 + i * .22); r.rotation.set(rr(0, 3), rr(0, 3), rr(0, 3)); r.userData.sp = V(rr(-6, 6), rr(-6, 6), rr(-6, 6)); g.add(r); rings.push(r); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: c, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(4.2); tag(glow); g.add(glow);
    g.scale.setScalar(scale * 2.2); scene3.add(g); return { g, core, rings, glow, base: scale * 2.2 };
  }
  function tickBall(b, dt, t, a) { b.core.material.uniforms.uT.value = t; b.core.material.uniforms.uA.value = a; b.rings.forEach(r => { r.rotation.x += r.userData.sp.x * dt; r.rotation.y += r.userData.sp.y * dt; r.rotation.z += r.userData.sp.z * dt; r.material.uniforms.uT.value = t; r.material.uniforms.uA.value = a; }); }
  const kill = o => { try { o.traverse(x => { if (x.material) x.material.dispose(); }); scene3.remove(o); } catch (e) { } };

  // ── 나선수리검 칼날(4장, 바깥으로 휘어진 바람 칼날) ──
  const bladeG = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.55, .25, 1.0, .02); sh.quadraticCurveTo(.6, -.12, 0, -.14); const g = new THREE.ShapeGeometry(sh, 16);
    const pos = g.attributes.position, uv = []; for (let i = 0; i < pos.count; i++) uv.push(pos.getX(i), pos.getY(i) + .5); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g; })();
  const BLADE_FS = `uniform float uT, uA; varying vec2 vUv; ${NOISE}
    void main(){ float n = fbm(vec2(vUv.x * 10. - uT * 30., vUv.y * 14.)); float edge = smoothstep(.0, .25, vUv.x) * (1. - smoothstep(.8, 1., vUv.x));
      float a = (.35 + n * .9) * edge * uA; gl_FragColor = vec4(vec3(.85, .95, 1.) * 1.6 * a, a); }`;
  function shuriken(scale = 1) { const b = rasenBall(scale * .8); const blades = new THREE.Group(); b.g.add(blades);
    for (let i = 0; i < 4; i++) { const m = tag(new THREE.Mesh(bladeG, mat(BLADE_FS, {}))); m.rotation.z = i * Math.PI / 2; m.scale.setScalar(4.2); m.position.z = 0; blades.add(m); }
    const halo = tag(new THREE.Mesh(torusG, mat(ringFS, { uC: { value: C('#ffffff') } }))); halo.scale.setScalar(4.4); blades.add(halo); b.blades = blades; return b; }

  // ── 미수옥(검은 구체·보라 맥동) ──
  const BIJU_FS = `uniform float uT, uA; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
    void main(){ vec3 p = normalize(vP); float n = fbm(vec2(atan(p.z,p.x) * 2. + uT * 2., p.y * 3. - uT)); float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.), rim = pow(1. - face, 2.);
      float veins = pow(abs(sin((n * 6. + uT * 1.5) * 3.14)), 12.); vec3 col = vec3(.02, 0., .04) + vec3(.6, .2, 1.) * (rim * 1.6 + veins * .9);
      gl_FragColor = vec4(col, clamp((.9 + rim) * uA, 0., 1.)); }`;
  function bijuBall(s) { const m = tag(new THREE.Mesh(sphereG, mat(BIJU_FS, {}, { blending: THREE.NormalBlending, depthWrite: true, transparent: false }))); m.scale.setScalar(s); scene3.add(m); return m; }

  // ── 번개 가닥(치도리·라이키리): 매 프레임 다시 갈라지는 선분 묶음 ──
  function lightningHand(n = 34) { const pos = new Float32Array(n * 2 * 3 * 4); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })); tag(m); scene3.add(m);
    const m2 = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })); tag(m2); m2.scale.setScalar(1.0); m.add(m2); m2.position.set(.08, .05, 0); const m3 = m2.clone(); m3.position.set(-.08, -.05, .06); m.add(m3);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: '#9fd8ff', transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(7); tag(glow); scene3.add(glow);
    return { m, g, pos, n, glow }; }
  function crackle(L, at, R) { const p = L.pos; let k = 0; for (let i = 0; i < L.n; i++) { let a = at.clone(); const dir = V(rr(-1, 1), rr(-.6, 1), rr(-1, 1)).normalize(); const segs = 4, len = R * rr(.4, 1);
      for (let s = 0; s < segs; s++) { const b = a.clone().addScaledVector(dir, len / segs).add(V(rr(-.9, .9), rr(-.9, .9), rr(-.9, .9)).multiplyScalar(len * .12)); p[k++] = a.x; p[k++] = a.y; p[k++] = a.z; p[k++] = b.x; p[k++] = b.y; p[k++] = b.z; a = b; } }
    L.g.attributes.position.needsUpdate = true; L.g.setDrawRange(0, k / 3); L.glow.position.copy(at); L.glow.material.opacity = rr(.6, 1); L.glow.scale.setScalar(rr(5, 9)); }

  // ── 검은 불꽃(아마테라스): 위로 일렁이는 불꽃 모양 빌보드, 속은 검고 가장자리 검붉음 ──
  const plane = new THREE.PlaneGeometry(1, 1.6);
  const BFIRE_FS = `uniform float uT, uA, uS; varying vec2 vUv; ${NOISE}
    void main(){ vec2 p = vUv; float n = fbm(vec2(p.x * 4. + uS, p.y * 3. - uT * 2.6)); float sway = sin(p.y * 6. - uT * 5. + uS) * .08 * p.y;
      float w = (1. - p.y) * .42 + .04; float dx = abs(p.x - .5 - sway); float shape = w - dx + (n - .5) * .22 * (.4 + p.y);
      if (shape < 0.) discard; float edge = smoothstep(0., .07, shape); vec3 col = mix(vec3(.6, .03, .05), vec3(.0), edge);
      gl_FragColor = vec4(col, clamp(uA * (.4 + edge * .6) * smoothstep(1., .75, p.y), 0., 1.)); }`;
  function blackFlames(target, dur = 3) { const fl = []; for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(plane, mat(BFIRE_FS, { uS: { value: rr(0, 40) } }, { blending: THREE.NormalBlending })); m.frustumCulled = false; m.renderOrder = 1300; scene3.add(m); fl.push({ m, off: V(rr(-4, 4), rr(0, 14), rr(-4, 4)), s: rr(5, 9) }); }
    live.push({ t: 0, dur, up(o, dt, t) { const a = Math.min(1, o.t * 4) * Math.min(1, (o.dur - o.t) * 2), base = target.pos; fl.forEach((f, i) => { f.m.position.set(base.x + f.off.x, base.y + f.off.y * (target.scale || 1), base.z + f.off.z); f.m.quaternion.copy(camera.quaternion); f.m.scale.set(f.s, f.s * (1 + .15 * Math.sin(t * 9 + i)), 1); f.m.material.uniforms.uT.value = t + i; f.m.material.uniforms.uA.value = a; }); },
      end() { fl.forEach(f => kill(f.m)); } }); cnt('amaterasu'); }

  // ── 소용돌이 원반(카무이·나선환 착탄 드릴) ──
  const SPIRAL_FS = `uniform float uT, uA, uK; uniform vec3 uC; varying vec2 vUv; ${NOISE}
    void main(){ vec2 c = vUv - .5; float r = length(c) * 2.; if (r > 1.) discard; float ang = atan(c.y, c.x);
      float sp = sin(ang * 3. + log(r + .02) * 7. * uK - uT * 14.); float arms = pow(abs(sp), 6.); float n = fbm(vec2(ang * 2., r * 5. - uT * 4.));
      float a = clamp((arms * 1.2 + n * .45) * smoothstep(1., .5, r) * uA, 0., 1.); vec3 col = mix(uC, vec3(1.), arms * .6) * (2.2 + (1. - r) * 1.5); if (uK < 0.) { col = mix(vec3(.05,0.,.08), vec3(.7,.5,1.), arms); }
      gl_FragColor = vec4(col * a, a); }`;
  function spiralDisc(p, R, c, dur, k = 1, face = true, normal) { const m = tag(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat(SPIRAL_FS, { uC: { value: C(c) }, uK: { value: k } }))); m.position.copy(p); scene3.add(m);
    live.push({ t: 0, dur, up(o, dt, t) { const u = o.t / o.dur; m.material.uniforms.uT.value = t; m.material.uniforms.uA.value = Math.min(1, o.t * 6) * (1 - u); const s = k < 0 ? R * (1 - u * .85) : R * (.4 + u * .9); m.scale.setScalar(s * 2); if (face) m.quaternion.copy(camera.quaternion); else if (normal) m.lookAt(m.position.clone().add(normal)); },
      end() { kill(m); } }); }

  // ── 툰 연기 '펑'(그림자 분신) ──
  const POOF_FS = `uniform float uT, uA, uS; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
    void main(){ float n = fbm(vP.xy * 2.4 + uS + uT); if (n < uT * .9) discard; float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.);
      vec3 c = face > .55 ? vec3(.98) : face > .25 ? vec3(.82, .84, .88) : vec3(.6, .62, .68); gl_FragColor = vec4(c, uA); }`;
  function poof(p, s = 1) { if (!ok()) return; const g = new THREE.Group(); g.position.copy(p); scene3.add(g); const balls = [];
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(sphereG, mat(POOF_FS, { uS: { value: rr(0, 30) } }, { blending: THREE.NormalBlending, transparent: false, depthWrite: true })); m.frustumCulled = false; m.position.set(rr(-3, 3) * s, rr(0, 6) * s, rr(-3, 3) * s); g.add(m); balls.push({ m, r: rr(2.2, 3.6) * s }); }
    live.push({ t: 0, dur: .7, up(o) { const u = o.t / o.dur; balls.forEach(b => { b.m.scale.setScalar(b.r * (.5 + Math.pow(u, .4) * .8)); b.m.material.uniforms.uT.value = u; }); }, end() { kill(g); } }); cnt('poof'); }

  // ── 모래 고치(사막 장송) ──
  const SAND_FS = `uniform float uT, uA, uH; varying vec2 vUv; ${NOISE}
    void main(){ if (vUv.y > uH) discard; float n = fbm(vec2(vUv.x * 22. + vUv.y * 6. - uT * 3., vUv.y * 9. + uT)); vec3 c = mix(vec3(.58, .44, .26), vec3(.9, .76, .5), n); float top = smoothstep(uH, uH - .08, vUv.y);
      gl_FragColor = vec4(c * (.75 + n * .5), uA * top); }`;
  function sandCoffin(b) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.3, 1, 36, 8, true), mat(SAND_FS, { uH: { value: 0 } }, { blending: THREE.NormalBlending, transparent: true, depthWrite: true })); m.frustumCulled = false; scene3.add(m);
    const X3 = X(); live.push({ t: 0, dur: 1.5, up(o, dt, t) { const u = o.t / o.dur, s = (b.scale || 1); m.position.set(b.pos.x, b.pos.y + 9 * s, b.pos.z); m.scale.set(7 * s * (1 - u * .35), 20 * s, 7 * s * (1 - u * .35)); m.rotation.y += dt * 4;
        m.material.uniforms.uT.value = t; m.material.uniforms.uH.value = Math.min(1, u * 2.2); m.material.uniforms.uA.value = Math.min(1, (o.dur - o.t) * 5);
        if (X3 && X3.emit && Math.random() < .7) { const a = rr(0, 6.28); X3.emit(V(b.pos.x + Math.cos(a) * 9 * s, b.pos.y + rr(0, 4), b.pos.z + Math.sin(a) * 9 * s), V(-Math.cos(a) * 30, rr(30, 70), -Math.sin(a) * 30), .6, rr(1, 2), 2, '#c8a060', -20); } },
      end() { kill(m); const p = chestOf(b); try { A() && (A().burst(p, C('#c8a060'), 12, .7), A().ring(V(b.pos.x, 0, b.pos.z), C('#d8b880'), 26, .5, true)); } catch (e) { } if (X3 && X3.emit) for (let i = 0; i < 40; i++) X3.emit(p.clone(), V(rr(-120, 120), rr(20, 160), rr(-120, 120)), rr(.5, 1), rr(1.2, 2.4), 2, i & 1 ? '#c8a060' : '#e0c890', 160); try { S() && S().boom(p, 1.2, false); } catch (e) { } } }); cnt('sand'); }

  // ── 기린(하늘에서 내리꽂는 번개 짐승) ──
  function kirin(b) { const X3 = X(), p = b.pos.clone(); const cloud = tag(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat(SPIRAL_FS, { uC: { value: C('#2a2a3a') }, uK: { value: -1 } }, { blending: THREE.NormalBlending })));
    cloud.position.set(p.x, 150, p.z); cloud.rotation.x = Math.PI / 2; cloud.scale.setScalar(160); scene3.add(cloud);
    live.push({ t: 0, dur: 1.4, up(o, dt, t) { cloud.material.uniforms.uT.value = t; cloud.material.uniforms.uA.value = Math.min(1, o.t * 3) * Math.min(1, (o.dur - o.t) * 3);
        if (o.t > .55 && !o.hit) { o.hit = 1; if (X3 && X3.bolt) { for (let i = 0; i < 7; i++) X3.bolt(V(p.x + rr(-8, 8), 150, p.z + rr(-8, 8)), V(p.x + rr(-3, 3), 1, p.z + rr(-3, 3)), i < 2 ? '#ffffff' : '#9fd0ff', rr(.35, .55), i < 2 ? 9 : 4, 4, .26); }
          try { const a = A(); if (a) { a.star(V(p.x, 40, p.z), C('#cfe8ff'), 70, .4); a.ring(V(p.x, 0, p.z), C('#9fd0ff'), 60, .7, true); a.speedLines(V(p.x, 10, p.z), C('#cfe8ff'), .6, 1.1); a.impactFrame(true); } } catch (e) { }
          if (typeof flashScreen === 'function') flashScreen(.7, '220,235,255'); try { S() && S().boom(p, 2.4, true); } catch (e) { } } },
      end() { kill(cloud); } }); cnt('kirin'); }

  // ── 차지 상태(손에 붙은 형태) ──
  const charge = new Map(); // f → { kind, obj, t, life }
  function endCharge(f) { const c = charge.get(f); if (!c) return; charge.delete(f); if (c.obj && c.obj.g) kill(c.obj.g); if (c.obj && c.obj.m && !c.keep) kill(c.obj.m); if (c.obj && c.obj.glow) kill(c.obj.glow); if (c.extra) c.extra.forEach(kill); }
  function startCharge(f, kind, text) { if (!ok()) return; endCharge(f); const big = /거대|대옥|초대옥/.test(text), planet = /혹성/.test(text), dual = /연환|이천|다연환/.test(text); let obj = null, extra = [];
    if (kind === 'rasen') { obj = rasenBall(big ? 2.4 : 1); if (planet || dual) for (let i = 0; i < (planet ? 4 : 1); i++) { const s = rasenBall(planet ? .4 : 1); extra.push(s.g); (obj.sats = obj.sats || []).push(s); } }
    else if (kind === 'shuri') obj = shuriken(big ? 1.8 : 1);
    else if (kind === 'chidori') obj = lightningHand(/천본|예창|류/.test(text) ? 46 : 34);
    else if (kind === 'biju') obj = { m: bijuBall(.1) };
    if (!obj) return; charge.set(f, { kind, obj, t: 0, life: 3.2, big, planet, dual, extra }); cnt(kind);
    if (kind === 'chidori') try { chirp(f); } catch (e) { } }
  // 치도리 '새 지저귐' 합성음(4~6kHz 빠른 짹짹 반복)
  function chirp(f) { const sf = window.SFX; if (!sf || !sf.ctx || !sf.started) return; const c = sf.ctx, dst = sf.rbus || c.destination, t = c.currentTime, dur = 1.6;
    const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(4200, t); o.frequency.linearRampToValueAtTime(5400, t + dur);
    lfo.type = 'square'; lfo.frequency.value = 34; lg.gain.value = 1400; lfo.connect(lg); lg.connect(o.frequency); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4800; bp.Q.value = 2.5;
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.09, t + .08); g.gain.setValueAtTime(.09, t + dur - .2); g.gain.linearRampToValueAtTime(0, t + dur); o.connect(bp); bp.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + .05); lfo.start(t); lfo.stop(t + dur + .05); }

  // ── 착탄 연출 ──
  function impact(kind, a, b, p, info) { if (!ok()) return; const an = A(), X3 = X(); p = p || chestOf(b);
    if (kind === 'rasen') { const s = info && info.big ? 2.4 : 1; const dir = b && a ? b.pos.clone().sub(a.pos).setY(0).normalize() : V(1, 0, 0);
      spiralDisc(p, 10 * s, '#7ad8ff', .55, 1, false, dir); spiralDisc(p, 6 * s, '#ffffff', .4, 1.4, true);
      try { an && (an.ring(p, C('#9fe0ff'), 16 * s, .45), an.star(p, C('#cfefff'), 18 * s, .24), an.ring(V(p.x, 0, p.z), C('#7ad8ff'), 22 * s, .5, true)); } catch (e) { }
      if (X3 && X3.streak) for (let i = 0; i < 24; i++) { const d = V(rr(-1, 1), rr(-.3, 1), rr(-1, 1)).normalize(); X3.streak(p.clone(), d.multiplyScalar(rr(160, 320)), rr(.2, .4), rr(.6, 1.2), rr(1.2, 2.2), i & 1 ? '#ffffff' : '#7ad8ff'); } cnt('rasenHit'); }
    else if (kind === 'shuri') { const s = info && info.big ? 1.8 : 1; const dome = tag(new THREE.Mesh(sphereG, mat(`uniform float uT, uA; varying vec3 vP; varying vec3 vN; varying vec3 vV; ${NOISE}
        void main(){ vec3 p = normalize(vP); float lines = pow(abs(sin((atan(p.z,p.x) * 40. + p.y * 30.) + uT * 40.)), 40.) + pow(abs(sin(acos(p.y) * 50. - uT * 30.)), 50.);
        float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.); float a = (lines * .9 + pow(1. - face, 2.) * .8 + .12) * uA; gl_FragColor = vec4(vec3(.85, .96, 1.) * 1.5 * a, a); }`, {})));
      dome.position.copy(p); scene3.add(dome); live.push({ t: 0, dur: 1.3, up(o, dt, t) { const u = o.t / o.dur, grow = u < .3 ? u / .3 : 1, R = 28 * s * (u < .85 ? grow : 1 - (u - .85) / .15 * .9); dome.scale.setScalar(Math.max(.5, R)); dome.material.uniforms.uT.value = t; dome.material.uniforms.uA.value = u < .85 ? 1 : 1 - (u - .85) / .15; }, end() { kill(dome); } });
      try { an && (an.speedLines(p, C('#ffffff'), .7, 1), an.ring(V(p.x, 0, p.z), C('#ffffff'), 40 * s, .7, true), an.impactFrame(true)); } catch (e) { } if (typeof flashScreen === 'function') flashScreen(.5, '230,245,255'); try { S() && S().boom(p, 2 * s, true); } catch (e) { } cnt('shuriHit'); }
    else if (kind === 'biju') { try { an && (an.burst(p, C('#7a2aff'), 40, 1.1), an.burst(p, C('#1a0030'), 28, 1.2), an.ring(V(p.x, 0, p.z), C('#a060ff'), 90, .9, true), an.speedLines(p, C('#c080ff'), .9, 1.2), an.impactFrame(true)); } catch (e) { }
      if (typeof flashScreen === 'function') flashScreen(.85, '255,255,255'); try { S() && S().boom(p, 3, true); } catch (e) { } cnt('bijuHit'); }
    else if (kind === 'chidori') { if (X3 && X3.bolt) for (let i = 0; i < 9; i++) X3.bolt(p.clone(), p.clone().add(V(rr(-26, 26), rr(-16, 22), rr(-26, 26))), i < 3 ? '#ffffff' : '#9fd8ff', rr(.2, .35), 3, 2, .3);
      try { an && (an.star(p, C('#cfeaff'), 26, .28), an.ring(p, C('#9fd8ff'), 14, .35), an.speedLines(p, C('#9fd8ff'), .4, .8)); } catch (e) { } cnt('chidoriHit'); }
    else if (kind === 'kamui') { spiralDisc(p, 22, '#000000', 1.1, -1, true); try { an && an.ring(p, C('#6a40a0'), 18, .5); } catch (e) { } cnt('kamui'); }
  }

  // ── 매 프레임 ──
  const _up = update; let tt = 0;
  update = function (dt, t) { const r = _up.apply(this, arguments);
    try { const d = Math.min(dt, .05); tt += d;
      for (const [f, c] of charge) { c.t += d; if (c.t > c.life || !F.includes(f)) { endCharge(f); continue; } const fw0 = typeof fwdOf === 'function' ? fwdOf(f) : V(1, 0, 0), h = chestOf(f).addScaledVector(fw0, 4.5 * (f.scale || 1)).add(V(0, -2.5 * (f.scale || 1), 0)) /* 원작 대표 포즈: 몸 앞으로 내민 손 높이 */, grow = Math.min(1, c.t * 2.5);
        if (c.kind === 'rasen') { const b = c.obj; b.g.position.copy(h).add(V(0, 1.2 + b.base * .45, 0)); /* 손바닥 바로 위 */ b.g.scale.setScalar(b.base * (.2 + .8 * grow) * (1 + Math.sin(tt * 30) * .03)); tickBall(b, d, tt, 1);
          if (b.sats) b.sats.forEach((s, i) => { const ang = tt * 7 + i * Math.PI * 2 / b.sats.length; s.g.position.copy(b.g.position).add(c.planet ? V(Math.cos(ang) * 9, Math.sin(ang * .7) * 3, Math.sin(ang) * 9) : V(-4, 0, 0)); s.g.scale.setScalar(s.base * grow); tickBall(s, d, tt + i, 1); }); }
        else if (c.kind === 'shuri') { const b = c.obj; b.g.position.copy(h).add(V(0, 6 + (c.big ? 6 : 0), 0)); b.g.scale.setScalar(b.base * (.2 + .8 * grow)); tickBall(b, d, tt, 1); b.blades.rotation.z += d * 30; b.blades.children.forEach(m => { if (m.material.uniforms) { m.material.uniforms.uT.value = tt; m.material.uniforms.uA.value = 1; } }); b.g.quaternion.copy(camera.quaternion); }
        else if (c.kind === 'chidori') { crackle(c.obj, h, 6 + 2 * grow); }
        else if (c.kind === 'biju') { const m = c.obj.m, fw = typeof fwdOf === 'function' ? fwdOf(f) : V(1, 0, 0); m.position.copy(chestOf(f)).addScaledVector(fw, 10).add(V(0, 4, 0)); const s = c.t < .9 ? 2 + c.t * 9 : Math.max(4, 10 - (c.t - .9) * 14); m.scale.setScalar(s); m.material.uniforms.uT.value = tt;
          const X3 = X(); if (X3 && X3.emit && c.t < 1.1) for (let i = 0; i < 3; i++) { const a = rr(0, 6.28), e = rr(0, 6.28), R = rr(18, 30), s0 = m.position.clone().add(V(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R)); X3.emit(s0, m.position.clone().sub(s0).multiplyScalar(2.2), .45, rr(1, 2), 5, i & 1 ? '#3a6aff' : '#ff3a5a', 0); } } }
      for (let i = live.length - 1; i >= 0; i--) { const o = live[i]; o.t += d; try { o.up(o, d, tt); } catch (e) { } if (o.t >= o.dur) { try { o.end && o.end(); } catch (e) { } live.splice(i, 1); } }
      // 투사체를 따라가는 형태(나선수리검·미수옥·호화구)
      for (let i = flying.length - 1; i >= 0; i--) { const fl = flying[i], pr = fl.pr; if (!pr || pr.done || fl.t > 6) { const p = pr ? pr.p.clone() : null; if (fl.kind === 'fire') { if (fl.ball) kill(fl.ball); } else if (fl.obj) { if (fl.obj.g) kill(fl.obj.g); if (fl.obj.m) kill(fl.obj.m); } if (p && fl.kind !== 'fire') impact(fl.kind, fl.a, fl.b, p, fl.info); flying.splice(i, 1); continue; }
        fl.t += d; if (fl.kind === 'shuri') { fl.obj.g.position.copy(pr.p); tickBall(fl.obj, d, tt, 1); fl.obj.blades.rotation.z += d * 36; fl.obj.blades.children.forEach(m => { if (m.material.uniforms) m.material.uniforms.uT.value = tt; }); fl.obj.g.quaternion.copy(camera.quaternion); }
        else if (fl.kind === 'biju') { fl.obj.m.position.copy(pr.p); fl.obj.m.material.uniforms.uT.value = tt; }
        else if (fl.kind === 'fire') { fl.ball.position.copy(pr.p); fl.ball.scale.setScalar(fl.R * (1 + Math.sin(tt * 20) * .05)); fl.ball.material.uniforms.uT.value = (tt * .3) % .5; const X3 = X(); if (X3 && X3.emit) X3.emit(pr.p.clone(), pr.v.clone().multiplyScalar(-.2).add(V(rr(-20, 20), rr(0, 30), rr(-20, 20))), rr(.3, .6), rr(4, 7), 1, Math.random() < .5 ? '#ffb040' : '#ff6a20', -30); } }
    } catch (e) { }
    return r; };
  const flying = [];

  // ── 기술 판별 ──
  const KIND = [[/나선수리검|대옥나선|초대옥/, 'shuri'], [/미수옥/, 'biju'], [/나선/, 'rasen'], [/치도리|라이키리|뇌절|천본|예창/, 'chidori']];
  const kindOf = t => { t = String(t || ''); for (const [re, k] of KIND) if (re.test(t)) return k; return null; };
  if (typeof callout === 'function') { const _c = callout; callout = function (f, text, ult) { const r = _c.apply(this, arguments);
    try { if (!ok() || !f || !f.pos || !f.ch || f.ch.world !== 'naruto') return r; const tx = String(text || ''), k = kindOf(tx);
      if (k) startCharge(f, k, tx);
      else if (/천조|아마테라스/.test(tx)) { const b = (typeof others === 'function' ? others(f) : F.filter(o => o !== f)).find(o => o.team !== f.team); if (b) setTimeout(() => blackFlames(b, 3), 450); }
      else if (/^기린/.test(tx)) { const b = F.find(o => o !== f && o.team !== f.team); if (b) kirin(b); }
      else if (/^카무이$|카무이 /.test(tx) && !/수리검/.test(tx)) { const b = F.find(o => o !== f && o.team !== f.team); if (b) setTimeout(() => impact('kamui', f, b), 350); }
      else if (/사막 장송|사박궤|사박 대장/.test(tx)) { const b = F.find(o => o !== f && o.team !== f.team); if (b) sandCoffin(b); }
    } catch (e) { } return r; }; }
  if (typeof proj === 'function') { const _p = proj; proj = function (a, b, kind, mode, o) { const n0 = (typeof projs !== 'undefined') ? projs.length : 0; const r = _p.apply(this, arguments);
    try { if (!ok() || !a || !a.ch || a.ch.world !== 'naruto' || typeof projs === 'undefined') return r; const pr = projs[projs.length - 1]; if (!pr || projs.length === n0) return r; const c = charge.get(a), nm = String((o && o.nm) || '');
      if (c && (c.kind === 'shuri' || c.kind === 'biju')) { charge.delete(a); flying.push({ kind: c.kind, obj: c.obj, pr, a, b, t: 0, info: { big: c.big } }); }
      else if (kind === 'rasenshuriken' || /나선수리검/.test(nm)) { flying.push({ kind: 'shuri', obj: shuriken(/대옥|초대옥/.test(nm) ? 1.8 : 1), pr, a, b, t: 0, info: {} }); }
      else if (kind === 'fireball' && /호화구|호룡화|용화/.test(nm)) { const ball = new THREE.Mesh(sphereG, window.ANIME_FX && ANIME_FX.pools ? ANIME_FX.pools.BU[0].m.material.clone() : new THREE.MeshBasicMaterial({ color: '#ff8a20' })); if (ball.material.uniforms) { ball.material.uniforms.uC.value = C('#ff7a1a'); ball.material.uniforms.uSeed.value = rr(0, 30); }
        ball.frustumCulled = false; ball.layers.enable(BLOOM); scene3.add(ball); flying.push({ kind: 'fire', ball, R: /호룡화|용화/.test(nm) ? 9 : 7 * ((o && o.size) || 1), pr, a, b, t: 0 }); cnt('fireball'); }
    } catch (e) { } return r; }; }
  if (typeof resolve === 'function') { const _r = resolve; resolve = function (a, b, ek, o, nm, pw) { const r = _r.apply(this, arguments);
    try { if (!ok() || !a || !a.ch || a.ch.world !== 'naruto') return r; const c = charge.get(a); if (c && (c.kind === 'rasen' || c.kind === 'chidori')) { if (o !== 'miss' && o !== 'dodge') impact(c.kind, a, b, null, { big: c.big }); endCharge(a); } } catch (e) { } return r; }; }
  if (typeof spawnClone === 'function') { const _s = spawnClone; spawnClone = function (a, b) { const n0 = typeof clones !== 'undefined' ? clones.length : 0; const r = _s.apply(this, arguments); try { if (typeof clones !== 'undefined' && clones.length > n0) { const cl = clones[clones.length - 1]; poof(cl.pos.clone().add(V(0, 6, 0)), 1); cl.__nxPoof = 1; } } catch (e) { } return r; }; }
  // 분신이 사라질 때도 '펑'
  setInterval(() => { try { if (typeof clones === 'undefined') return; NX._cl = NX._cl || new Set(); const cur = new Set(clones); NX._cl.forEach(cl => { if (!cur.has(cl) && cl.pos) poof(cl.pos.clone().add(V(0, 6, 0)), .9); }); NX._cl = cur; } catch (e) { } }, 120);
  // 호화구: 비행체 그룹에 붙는 툰 화염 구체(셀 4단 채색이 끓어오르듯 일렁임)
  const fireMeshes = new Set();
  NX.fireMesh = c => { const src = window.ANIME_FX && ANIME_FX.pools && ANIME_FX.pools.BU[0].m.material; const m = new THREE.Mesh(sphereG, src ? src.clone() : new THREE.MeshBasicMaterial({ color: c })); if (m.material.uniforms) { m.material.uniforms.uC.value = C(c); m.material.uniforms.uSeed.value = rr(0, 30); m.material.uniforms.uT.value = .05; }
    m.scale.setScalar(1.15); m.layers.enable(BLOOM); m.frustumCulled = false; fireMeshes.add(m); cnt('fireball'); return m; };
  setInterval(() => { fireMeshes.forEach(m => { if (!m.parent || !m.parent.parent) { fireMeshes.delete(m); try { m.material.dispose(); } catch (e) { } return; } if (m.material.uniforms) m.material.uniforms.uT.value = .05 + (Math.sin(now() * 6 + m.id) * .5 + .5) * .18; }); }, 33);
  Object.assign(NX, { rasenBall, shuriken, poof, blackFlames, kirin, sandCoffin, impact, startCharge, endCharge, charge, flying });
})();
