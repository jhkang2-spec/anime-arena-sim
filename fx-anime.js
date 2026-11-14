// fx-anime.js — 애니메이션 작화 문법 이펙트 계층(11-14 소유자 지시: '나아짐'이 아니라 '고도화' — 실제 애니·극장판 연출 수준).
// 기존 파티클 위에 '그림체'를 얹는다. 전부 셰이더 기반 · 풀 재사용(생성/컴파일 0) · 부하·품질 자동 감축.
//  ① 초승달 참격 궤적(SLASH): 머리→꼬리로 휘두르며 그려지고, 노이즈로 바스러지며 사라지는 리본. 흰 심지·속성색 몸통·어두운 테두리(애니 3단 채색)
//  ② 툰 폭발(BURST): 노이즈로 부풀어 오르는 구체를 4단계 색 경계(흰 핵→노랑→속성색→그을음)로 칠하고, 안쪽부터 녹아 없어짐(셀 애니 폭발)
//  ③ 툰 연기(SMOKE): 같은 셰이더의 어두운 팔레트 — 천천히 피어올라 흩어짐
//  ④ 4갈래 섬광(STAR): 타격 순간 십자 빛살 + 원형 핵, 회전하며 팡 터짐
//  ⑤ 충격파(RING): 바닥에 깔리는 갈라진 고리 / 공중에서 카메라를 향하는 고리. 가장자리가 노이즈로 찢김
//  ⑥ 차지 마법진(SIGIL): 필살기 시전자 발밑에 회전하는 이중 원 + 문양 + 바깥에서 모여드는 빛 알갱이
//  ⑦ 집중선(SPEED LINES) · 임팩트 프레임(IMPACT): 2D 겹 — 필살기·큰 타격 순간 화면 중심으로 모이는 선, 1~2프레임 반전·고대비
// 의존(공개 전역): THREE, scene3, camera, update, wound, resolve, explode, ultBlast, callout, clash, chest, ELEM, ftAvg, getQuality, FX3
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined' || typeof update !== 'function') return;
  const AF = window.ANIME_FX = { on: true, st: { slash: 0, burst: 0, smoke: 0, star: 0, ring: 0, sigil: 0, lines: 0, impact: 0, skip: 0 } };
  try { if (localStorage.getItem('arenaAnimeFx') === '0') AF.on = false; } catch (e) { }
  const Q = () => { try { return (window.getQuality && getQuality()) || 'mid'; } catch (e) { return 'mid'; } };
  const FT = () => (typeof ftAvg !== 'undefined' && isFinite(ftAvg)) ? ftAvg : 16;
  const ok = () => AF.on && Q() !== 'low';
  const dens = () => FT() > 26 ? .35 : FT() > 20 ? .6 : 1; // 부하 감축 배율
  const rr = (a, b) => a + Math.random() * (b - a);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const col = ek => new THREE.Color(((window.ELEM && ELEM[ek]) || { c: '#ffe0a0' }).c);
  const BLOOM = 3; // fx3-cine 선택 블룸 층
  const GY = () => (typeof WATER_H !== 'undefined' ? WATER_H : 1.4) + .35; // 바닥 효과 높이(기존 바닥 표식과 같은 층 — 지형 밑으로 묻히지 않게)

  const NOISE = `
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
    float h31(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float vn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++) { s += a * vn3(p); p = p * 2.07 + 3.3; a *= .5; } return s; }`;

  // 풀 도우미: 같은 셰이더 → 프로그램 1개(warmup ⓪ 이 영구 고정). 재질은 인스턴스마다 복제해 유니폼만 다름.
  function pool(n, make) { const P = []; for (let i = 0; i < n; i++) { const o = make(i); o.m.visible = false; o.life = 0; scene3.add(o.m); P.push(o); } return P; }
  const take = P => { let o = null, oldest = null; for (const x of P) { if (x.life <= 0) { o = x; break; } if (!oldest || x.age > oldest.age) oldest = x; } return o || oldest; };

  // ── ① 초승달 참격 궤적 ──
  const slashGeo = (() => { const SEG = 48, A = 2.4, g = new THREE.BufferGeometry(), P = [], UV = [], I = [];
    for (let i = 0; i <= SEG; i++) { const u = i / SEG, a = -A / 2 + A * u, w = Math.pow(Math.sin(u * Math.PI), .6) * .5;
      [1 - w, 1 + w * .55].forEach((r, j) => { P.push(Math.cos(a) * r, Math.sin(a) * r, 0); UV.push(u, j); }); }
    for (let i = 0; i < SEG; i++) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); return g; })();
  const slashMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color() }, uT: { value: 0 }, uSeed: { value: 0 }, uK: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT, uSeed, uK; varying vec2 vUv; ${NOISE}
      void main(){ float u = vUv.x, v = vUv.y;
        float sweep = clamp(uT * 4.5, 0., 1.);                         // 휘두르는 머리
        if (u > sweep) discard;
        float tail = smoothstep(0., .35, u - (sweep - .9) ) ;           // 꼬리 쪽 흐림
        float n = fbm(vec2(u * 9. + uSeed, v * 2.5 - uT * 3.));
        float erode = smoothstep(.15, 1., uT) * 1.15;                   // 시간에 따라 바스러짐
        float body = 1. - abs(v - .55) * 1.9;
        float a = smoothstep(erode, erode + .12, n * .55 + body * .6) * tail;
        if (a < .01) discard;
        float core = pow(clamp(body, 0., 1.), 3.);
        vec3 c = mix(uC * .9, vec3(1.), smoothstep(.45, .9, core));       // 흰 심지
        c = mix(c, uC * .25, smoothstep(.35, .0, body));                 // 어두운 테두리(애니 3단 채색)
        float head = smoothstep(.12, 0., sweep - u) * (1. - uT);         // 머리 끝 번쩍
        gl_FragColor = vec4(c * (2.1 + head * 3.) * uK, a); }` });
  const SL = pool(10, () => { const m = new THREE.Mesh(slashGeo, slashMat.clone()); m.layers.enable(BLOOM); m.renderOrder = 1300; m.frustumCulled = false; return { m }; });
  function slash(p, dir, c, size = 11, dur = .32, k = 1) { if (!ok()) return; const o = take(SL); o.life = o.max = dur; o.age = 0;
    const U = o.m.material.uniforms; U.uC.value.copy(c); U.uSeed.value = rr(0, 50); U.uK.value = k; U.uT.value = 0;
    o.m.position.copy(p); const d = dir.clone().setY(0); if (d.lengthSq() < 1e-4) d.set(1, 0, 0); d.normalize();
    o.m.quaternion.copy(camera.quaternion); /* 애니 참격은 화면에 그어지는 획: 카메라를 향하고, 공격 방향으로 기울임 */
    const sd = d.clone().project ? (() => { const a = p.clone().project(camera), b = p.clone().add(d).project(camera); return Math.atan2(b.y - a.y, b.x - a.x); })() : 0;
    o.m.rotateZ(sd + Math.PI / 2 + rr(-.6, .6) + (Math.random() < .5 ? Math.PI : 0)); o.m.rotateX(rr(-.4, .4));
    o.m.scale.setScalar(size); o.m.visible = true; AF.st.slash++; }

  // ── ②③ 툰 폭발 · 툰 연기 ──
  const burstGeo = new THREE.IcosahedronGeometry(1, 5);
  const burstMat = new THREE.ShaderMaterial({ transparent: false, depthWrite: true,
    uniforms: { uC: { value: new THREE.Color() }, uT: { value: 0 }, uSeed: { value: 0 }, uSmoke: { value: 0 } },
    vertexShader: `uniform float uT, uSeed; varying vec3 vN; varying vec3 vP; varying vec3 vV; ${NOISE}
      void main(){ vec3 p = position; float n = fbm3(p * 2.2 + uSeed + uT * 1.5);
        p *= 1. + (n - .5) * .75;                                       // 울퉁불퉁 뭉게
        vec4 w = modelMatrix * vec4(p, 1.); vP = p; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uC; uniform float uT, uSeed, uSmoke; varying vec3 vN; varying vec3 vP; varying vec3 vV; ${NOISE}
      void main(){ float n = fbm3(vP * 3.1 + uSeed - uT * 2.);
        float diss = smoothstep(.25, 1., uT) * 1.05;                    // 안쪽부터 녹아 사라짐
        if (n < diss) discard;
        float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.);
        float lit = face * .65 + n * .55 - uT * .55;                     // 중심일수록 뜨거움
        vec3 c;
        if (uSmoke > .5) { c = lit > .62 ? vec3(.42, .38, .36) : lit > .38 ? vec3(.24, .21, .2) : vec3(.11, .1, .1); }
        else { c = lit > .78 ? vec3(1., .99, .92) : lit > .58 ? mix(uC, vec3(1., .93, .55), .55) * 1.25 : lit > .36 ? uC * 1.05 : mix(uC * .3, vec3(.12, .08, .07), .6); }
        float rim = smoothstep(.0, .25, n - diss); c *= mix(.45, 1., rim);  // 녹는 가장자리 어둡게(셀 경계)
        gl_FragColor = vec4(c, 1.); }` });
  const BU = pool(8, () => { const m = new THREE.Mesh(burstGeo, burstMat.clone()); m.layers.enable(BLOOM); m.frustumCulled = false; return { m }; });
  const SM = pool(14, () => { const mt = burstMat.clone(); mt.uniforms.uSmoke.value = 1; const m = new THREE.Mesh(burstGeo, mt); m.frustumCulled = false; return { m }; });
  function burst(p, c, r = 8, dur = .7) { if (!ok()) return; const o = take(BU); o.life = o.max = dur; o.age = 0; o.r = r; o.p = p.clone();
    const U = o.m.material.uniforms; U.uC.value.copy(c); U.uSeed.value = rr(0, 40); U.uT.value = 0; o.m.position.copy(p); o.m.scale.setScalar(r * .2); o.m.visible = true; AF.st.burst++; }
  function smoke(p, r = 6, dur = 1.4, vel) { if (!ok()) return; const o = take(SM); o.life = o.max = dur * rr(.85, 1.2); o.age = 0; o.r = r; o.p = p.clone(); o.v = vel || V(rr(-6, 6), rr(10, 22), rr(-6, 6));
    const U = o.m.material.uniforms; U.uSeed.value = rr(0, 40); U.uT.value = 0; o.m.position.copy(p); o.m.scale.setScalar(r * .3); o.m.visible = true; AF.st.smoke++; }

  // ── ④ 4갈래 섬광 ──
  const quad = new THREE.PlaneGeometry(1, 1);
  const starMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color() }, uT: { value: 0 }, uRot: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT, uRot; varying vec2 vUv;
      void main(){ vec2 p = vUv - .5; float c = cos(uRot), s = sin(uRot); p = mat2(c, -s, s, c) * p;
        float r = length(p);
        float rays = .0016 / (abs(p.x * p.y) + .0006) * smoothstep(.5, .0, r);          // 십자 빛살
        vec2 q = mat2(.7071, -.7071, .7071, .7071) * p; float rays2 = .0007 / (abs(q.x * q.y) + .0007) * smoothstep(.32, .0, r); // 잔빛살
        float core = smoothstep(.12, .0, r);
        float a = clamp(rays + rays2 * .5 + core, 0., 2.) * (1. - uT * uT);
        vec3 cc = mix(uC, vec3(1.), clamp(core + rays * .3, 0., 1.));
        gl_FragColor = vec4(cc * a, a); }` });
  const STR = pool(16, () => { const m = new THREE.Mesh(quad, starMat.clone()); m.layers.enable(BLOOM); m.renderOrder = 1500; m.frustumCulled = false; return { m }; });
  function star(p, c, s = 9, dur = .2) { if (!ok()) return; const o = take(STR); o.life = o.max = dur; o.age = 0; o.s = s;
    const U = o.m.material.uniforms; U.uC.value.copy(c); U.uRot.value = rr(0, 6.3); U.uT.value = 0; o.m.position.copy(p); o.m.visible = true; AF.st.star++; }

  // ── ⑤ 충격파 고리 ──
  const ringMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color() }, uT: { value: 0 }, uSeed: { value: 0 }, uGround: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT, uSeed, uGround; varying vec2 vUv; ${NOISE}
      void main(){ vec2 p = (vUv - .5) * 2.; float r = length(p), ang = atan(p.y, p.x);
        float R = .15 + .82 * (1. - pow(1. - uT, 3.)), W = mix(.22, .03, uT);
        float n = fbm(vec2(ang * 3.2 + uSeed, r * 4. - uT * 2.));
        float band = smoothstep(W, 0., abs(r - R - (n - .5) * .08));
        float torn = smoothstep(.25 + uT * .55, .5 + uT * .5, n);          // 가장자리 찢김
        float a = band * torn * (1. - uT);
        if (uGround > .5) a += smoothstep(R, R * .2, r) * (1. - uT) * .18 * n;  // 바닥: 안쪽 흙먼지 빛
        if (a < .01) discard;
        vec3 c = mix(uC * 1.3 + .15, vec3(1.), smoothstep(.35, 1., band) * (1. - uT * .7));
        gl_FragColor = vec4(c * 2.4, a); }` });
  const RG = pool(12, () => { const m = new THREE.Mesh(quad, ringMat.clone()); m.layers.enable(BLOOM); m.renderOrder = 1250; m.frustumCulled = false; return { m }; });
  function ring(p, c, r = 20, dur = .45, groundy = false) { if (!ok()) return; const o = take(RG); o.life = o.max = dur; o.age = 0; o.ground = groundy;
    const U = o.m.material.uniforms; U.uC.value.copy(c); U.uSeed.value = rr(0, 40); U.uT.value = 0; U.uGround.value = groundy ? 1 : 0;
    o.m.material.depthTest = !groundy; /* 바닥 고리는 지형에 묻히지 않게 깊이 무시 */ o.m.position.copy(p); if (groundy) { o.m.position.y = Math.max(GY(), p.y + .2); o.m.rotation.set(-Math.PI / 2, 0, rr(0, 6.3)); } o.m.scale.setScalar(r * 2); o.m.visible = true; AF.st.ring++; }

  // ── ⑥ 차지 마법진 ──
  const sigilMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color() }, uT: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uC; uniform float uT, uTime; varying vec2 vUv;
      void main(){ vec2 p = (vUv - .5) * 2.; float r = length(p); if (r > 1.) discard; float ang = atan(p.y, p.x);
        float grow = smoothstep(0., .25, uT), fade = 1. - smoothstep(.75, 1., uT);
        float rings = smoothstep(.045, 0., abs(r - .92)) + smoothstep(.03, 0., abs(r - .78)) + smoothstep(.028, 0., abs(r - .4));
        float a1 = ang + uTime * 1.6, a2 = ang - uTime * 2.3;
        float ticks = step(.8, r) * step(r, .9) * step(.5, fract(a1 * 12. / 6.2832)) ;      // 회전 눈금
        float runes = step(.45, r) * step(r, .74) * step(.82, fract(a2 * 7. / 6.2832 + floor(r * 9.) * .37)) * step(.3, fract(r * 9.)); // 문양 칸
        float star = 0.; for (int i = 0; i < 5; i++) { float th = a1 * 0. + float(i) * 1.2566 + uTime * .8; vec2 d = vec2(cos(th), sin(th)); star += smoothstep(.03, 0., abs(dot(p, vec2(-d.y, d.x)))) * step(abs(dot(p, d)), .8); } // 오망 선
        float disk = smoothstep(.95, .2, r) * .12; /* 은은한 바탕 빛 */
        float m = (rings + ticks * .8 + runes * .7 + star * .6 + disk) * grow * fade * smoothstep(1.05, .0, r * (1.15 - grow * .15));
        if (m < .01) discard;
        gl_FragColor = vec4(mix(uC, vec3(1.), .3) * 3.2 * m, m); }` });
  const SG = pool(3, () => { const mt = sigilMat.clone(); mt.depthTest = false; /* 지형 굴곡에 묻히지 않게 */ const m = new THREE.Mesh(quad, mt); m.rotation.x = -Math.PI / 2; m.layers.enable(BLOOM); m.renderOrder = 1100; m.frustumCulled = false; return { m }; });
  function sigil(f, c, r = 22, dur = 1.1) { if (!ok() || !f || !f.pos) return; const o = take(SG); o.life = o.max = dur; o.age = 0; o.f = f;
    const U = o.m.material.uniforms; U.uC.value.copy(c); U.uT.value = 0; o.m.scale.setScalar(r * 2); o.m.visible = true; AF.st.sigil++;
    const X = window.FX3; if (X && X.emit) { const n = Math.round(26 * dens()); for (let i = 0; i < n; i++) { const a = rr(0, 6.28), d = rr(r * .8, r * 1.4), h = rr(0, 18), s = V(f.pos.x + Math.cos(a) * d, f.pos.y + h, f.pos.z + Math.sin(a) * d), tgt = f.pos.clone().add(V(0, 10, 0)); const life = rr(.45, .8);
      X.emit(s, tgt.sub(s).multiplyScalar(1 / life), life, rr(.8, 1.6), 5, Math.random() < .4 ? '#ffffff' : '#' + c.getHexString(), 0, rr(0, .3)); } } }

  // ── ⑦ 2D 겹: 집중선 · 임팩트 프레임 ──
  const stage = document.getElementById('stage'), glC = document.getElementById('gl');
  const cv = document.createElement('canvas'); cv.id = 'afx'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
  if (stage) { const lfx = document.getElementById('lfx'); if (lfx && lfx.parentNode === stage) stage.insertBefore(cv, lfx.nextSibling); else stage.appendChild(cv); }
  const cx2 = cv.getContext('2d'); let lines = null, imp = null, impCool = 0;
  function speedLines(p3, c, dur = .55, k = 1) { if (!ok()) return; lines = { p3: p3 ? p3.clone() : null, c: c ? '#' + c.getHexString() : '#ffffff', t: 0, dur, k, seed: Math.random() * 1000 }; AF.st.lines++; }
  function impactFrame(big) { if (!ok() || performance.now() < impCool) return; impCool = performance.now() + 1400; imp = { f: 0, big }; AF.st.impact++; } // 광과민 배려: 1.4초 쿨다운·최대 2프레임
  function draw2D(dt) {
    const W = Math.max(64, (stage ? stage.clientWidth : 640) >> 1), H = Math.max(40, (stage ? stage.clientHeight : 380) >> 1);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    cx2.clearRect(0, 0, W, H);
    if (lines) { lines.t += dt; const u = lines.t / lines.dur; if (u >= 1) lines = null; else {
      let cx = W / 2, cy = H / 2; if (lines.p3) { const v = lines.p3.clone().project(camera); if (v.z < 1) { cx = (v.x + 1) / 2 * W; cy = (1 - v.y) / 2 * H; } }
      const R = Math.hypot(W, H), n = Math.round(70 * lines.k * dens()), a0 = (1 - u) * .85; cx2.save(); cx2.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i++) { const s = Math.sin(lines.seed + i * 12.9898) * 43758.5453, fr = s - Math.floor(s), ang = (i / n) * 6.2832 + fr * .09, r0 = R * (.32 + fr * .22) * (1 - u * .25), w = (1 + fr * 3.2) * (H / 380);
        const x0 = cx + Math.cos(ang) * r0, y0 = cy + Math.sin(ang) * r0, x1 = cx + Math.cos(ang) * R, y1 = cy + Math.sin(ang) * R;
        cx2.strokeStyle = i % 5 === 0 ? lines.c : (i & 1 ? 'rgba(255,255,255,' + a0 + ')' : 'rgba(10,8,14,' + a0 * .7 + ')'); cx2.globalAlpha = a0; cx2.lineWidth = w; cx2.beginPath(); cx2.moveTo(x0, y0); cx2.lineTo(x1, y1); cx2.stroke(); }
      const g = cx2.createRadialGradient(cx, cy, R * .25, cx, cy, R * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + .35 * (1 - u) + ')'); cx2.globalAlpha = 1; cx2.fillStyle = g; cx2.fillRect(0, 0, W, H); cx2.restore(); } }
    if (glC) { if (imp) { if (imp.f === 0) imp.prev = glC.style.filter; imp.f++; glC.style.filter = imp.f === 1 ? 'invert(1) contrast(2.2) saturate(0) brightness(1.1)' : 'contrast(1.7) saturate(1.5) brightness(1.15)'; if (imp.f > (imp.big ? 2 : 1)) { glC.style.filter = imp.prev || ''; imp = null; } } } // lightfx 필터 복원
  }

  // ── 매 프레임 갱신 ──
  const _up = update;
  update = function (dt, t) {
    const r = _up.apply(this, arguments);
    try {
      const d = Math.min(dt, .05), q = camera.quaternion, tm = performance.now() / 1000;
      for (const o of SL) { if (o.life <= 0) continue; o.life -= d; o.age += d; const u = 1 - o.life / o.max; o.m.material.uniforms.uT.value = Math.min(1, u); if (o.life <= 0) o.m.visible = false; }
      for (const o of BU) { if (o.life <= 0) continue; o.life -= d; o.age += d; const u = 1 - o.life / o.max; o.m.material.uniforms.uT.value = u; o.m.scale.setScalar(o.r * (.25 + .85 * (1 - Math.pow(1 - Math.min(1, u * 1.6), 3)))); o.m.position.y = o.p.y + u * o.r * .25; if (o.life <= 0) o.m.visible = false; }
      for (const o of SM) { if (o.life <= 0) continue; o.life -= d; o.age += d; const u = 1 - o.life / o.max; o.m.material.uniforms.uT.value = u * .95; o.p.addScaledVector(o.v, d); o.v.multiplyScalar(1 - d * .9); o.m.position.copy(o.p); o.m.scale.setScalar(o.r * (.35 + u * .9)); if (o.life <= 0) o.m.visible = false; }
      for (const o of STR) { if (o.life <= 0) continue; o.life -= d; o.age += d; const u = 1 - o.life / o.max; o.m.material.uniforms.uT.value = u; o.m.quaternion.copy(q); const pop = u < .25 ? u / .25 : 1; o.m.scale.setScalar(o.s * (.4 + .9 * pop)); o.m.material.uniforms.uRot.value += d * 3; if (o.life <= 0) o.m.visible = false; }
      for (const o of RG) { if (o.life <= 0) continue; o.life -= d; o.age += d; o.m.material.uniforms.uT.value = 1 - o.life / o.max; if (!o.ground) o.m.quaternion.copy(q); if (o.life <= 0) o.m.visible = false; }
      for (const o of SG) { if (o.life <= 0) continue; o.life -= d; o.age += d; const U = o.m.material.uniforms; U.uT.value = 1 - o.life / o.max; U.uTime.value = tm; if (o.f && o.f.pos) o.m.position.set(o.f.pos.x, Math.max(GY() + .05, o.f.pos.y + .35), o.f.pos.z); if (o.life <= 0) o.m.visible = false; }
      draw2D(d);
    } catch (e) { }
    return r;
  };

  // ── 연결: 실제 전투 이벤트 → 작화 연출 ──
  const chestOf = f => (typeof chest === 'function' && f && f.pos) ? chest(f) : (f && f.pos ? f.pos.clone().add(V(0, 10, 0)) : null);
  const ekOf = (a, ek) => ek || (a && a.elem) || (a && a.ch && a.ch.sig && a.ch.sig.elem) || 'metal';
  const SWORD = /검|도|참|칼|베기|월아|getsuga|slash|일도|이도|삼도|호흡|사무라이|발도|居合|거합/;
  let lastSlash = 0;
  if (typeof wound === 'function') { const _w = wound; wound = function (v, a, text, ek) { const r = _w.apply(this, arguments);
    try { if (!ok() || !v || !v.pos) return r; const p = chestOf(v), e = ekOf(a, ek), c = col(e), D = dens();
      star(p.clone().add(V(rr(-1.5, 1.5), rr(-1.5, 2), rr(-1.5, 1.5))), c, rr(8, 12), .2);
      if (Math.random() < .55 * D) ring(p, c, rr(7, 11), .3);
      const near = a && a.pos && a.pos.distanceTo(v.pos) < 34, now = performance.now();
      if (near && now - lastSlash > 90 && (Math.random() < .7 * D || SWORD.test(String(text || '')))) { lastSlash = now; const dir = v.pos.clone().sub(a.pos); slash(p, dir, c, rr(9, 14), rr(.26, .36), SWORD.test(String(text || '')) ? 1.3 : 1); }
    } catch (e) { } return r; }; }
  if (typeof resolve === 'function') { const _r = resolve; resolve = function (a, b, ek, o, nm, pw, at) { const r = _r.apply(this, arguments);
    try { if (!ok() || !b || !b.pos || o === 'miss' || o === 'dodge') return r; const P = pw || 1, c = col(ekOf(a, ek)), p = chestOf(b);
      if (o === 'block' || o === 'counter') { star(p, new THREE.Color('#ffffff'), 14, .22); ring(p, c, 12, .3); return r; }
      if (P >= 1.4) { ring(b.pos.clone(), c, 18 + P * 6, .55, true); star(p, c, 16 + P * 3, .26); if (P >= 1.8) { speedLines(p, c, .45, .8); burst(p, c, 4 + P * 2, .55); } if (P >= 2.2) impactFrame(false); }
    } catch (e) { } return r; }; }
  if (typeof explode === 'function') { const _e = explode; explode = function (p, ek, pw = 1) { const r = _e.apply(this, arguments);
    try { if (!ok() || !p) return r; const c = col(ek || 'fire'), s = Math.min(2.4, pw), D = dens();
      burst(p.clone(), c, 7 * s, .6 + .15 * s); ring(p.clone(), c, 14 * s, .5, true); star(p.clone().add(V(0, 2, 0)), c, 14 * s, .22);
      const n = Math.round((1 + s) * D); for (let i = 0; i < n; i++) smoke(p.clone().add(V(rr(-3, 3) * s, rr(0, 3) * s, rr(-3, 3) * s)), rr(4, 7) * s, rr(1.1, 1.7));
    } catch (e) { } return r; }; }
  if (typeof ultBlast === 'function') { const _u = ultBlast; ultBlast = function (p, ek, rad, owner, nm) { const r = _u.apply(this, arguments);
    try { if (!ok() || !p) return r; const c = col(ek), R = Math.max(12, Math.min(90, rad || 40)), D = dens();
      burst(p.clone(), c, Math.min(42, R * .42), 1.0); setTimeout(() => burst(p.clone().add(V(rr(-4, 4), R * .12, rr(-4, 4))), c, Math.min(30, R * .3), .8), 90);
      ring(p.clone(), c, R * .95, .8, true); ring(p.clone(), new THREE.Color('#ffffff'), R * .6, .5, true); ring(p.clone().add(V(0, R * .15, 0)), c, R * .5, .45);
      star(p.clone().add(V(0, R * .1, 0)), c, Math.min(60, R * .7), .32);
      const n = Math.round(5 * D); for (let i = 0; i < n; i++) { const a = rr(0, 6.28), d = rr(0, R * .35); smoke(p.clone().add(V(Math.cos(a) * d, rr(0, R * .15), Math.sin(a) * d)), rr(.12, .2) * R, rr(1.6, 2.4), V(Math.cos(a) * rr(4, 12), rr(8, 20), Math.sin(a) * rr(4, 12))); }
      speedLines(p, c, .7, 1.1); impactFrame(true);
    } catch (e) { } return r; }; }
  if (typeof callout === 'function') { const _c = callout; callout = function (f, text, ult) { const r = _c.apply(this, arguments);
    try { if (!ok() || !f || !f.pos || !ult) return r; const c = col(ekOf(f)); sigil(f, c, 20 * (f.scale || 1), 1.15); speedLines(chestOf(f), c, .5, .7); ring(f.pos.clone(), c, 16, .5, true); } catch (e) { } return r; }; }
  if (typeof clash === 'function') { const _k = clash; clash = function (a, b, text, big) { const r = _k.apply(this, arguments);
    try { if (!ok() || !a || !b || !a.pos || !b.pos) return r; const m = chestOf(a).add(chestOf(b)).multiplyScalar(.5), w = new THREE.Color('#ffffff');
      star(m, w, big ? 26 : 16, .26); ring(m, col(ekOf(a)), big ? 22 : 13, .38); if (big) { speedLines(m, w, .4, .7); ring(V(m.x, 0, m.z), w, 26, .5, true); } } catch (e) { } return r; }; }

  // 공개: 다른 파일·스킬이 직접 호출 가능
  Object.assign(AF, { slash, burst, smoke, star, ring, sigil, speedLines, impactFrame, pools: { SL, BU, SM, STR, RG, SG } });

  // 단추(연출) — 끄기/켜기(A 키)
  const bar = document.getElementById('viewBar');
  if (bar) { const b = document.createElement('button'); b.type = 'button'; b.textContent = '작화FX'; b.title = '애니 작화풍 이펙트(참격 궤적·툰 폭발·섬광·충격파·마법진·집중선) 켜기/끄기 (A)';
    b.style.cssText = 'margin:2px;padding:3px 9px;font:700 11px "Noto Sans KR";color:#ffe9a8;background:rgba(10,8,18,.6);border:1px solid #c8a050;border-radius:6px;cursor:pointer';
    const sync = () => { b.style.background = AF.on ? 'rgba(120,60,10,.75)' : 'rgba(10,8,18,.6)'; b.style.opacity = AF.on ? '1' : '.55'; };
    const tog = () => { AF.on = !AF.on; try { localStorage.setItem('arenaAnimeFx', AF.on ? '1' : '0'); } catch (e) { } sync(); if (!AF.on) { [SL, BU, SM, STR, RG, SG].forEach(P => P.forEach(o => { o.life = 0; o.m.visible = false; })); lines = null; imp = null; if (glC) glC.style.filter = ''; cx2.clearRect(0, 0, cv.width, cv.height); } };
    b.onclick = tog; bar.appendChild(b); sync();
    window.addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return; if (e.key === 'a' || e.key === 'A') tog(); }); }

  // 예열: 풀 메시는 warmup.js 스위퍼(ⓢ)가 숨김 상태에서도 메시 단위로 나눠 컴파일 → 별도 전체 컴파일 없음(초반 렉 원인 제거)
})();
