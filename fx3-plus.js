// 이펙트 고도화 3단계 (fx3-plus) — 채점표(원작 연출) 3점 미만 기술부터 원작에 가깝고 화려하게.
// 새 재료: 레이마칭 에너지 구(나선환·미수옥·염제·허화·공기포), 캔버스로 그린 불꽃·연기 플립북 알갱이(저작권 이미지 없음),
//          주먹 잔상 알갱이(수백 개), 바닥에 비치는 빛(가산 데칼), 풍차 수리검 날, 불꽃 해골 무사(수사노오) 입자 뼈대
// 공통: 필살기마다 기 모으기(입자가 손·몸으로 빨려 듦) → 발동 → 적중 다층 합성(섬광·광채·플립북 화염/연기·왜곡·잔불)
//       원작에 없는 '하늘로 솟는 공용 빛기둥'은 원작 재현 처리가 있는 필살기에서 뺌(반카이·무월 등 원작 기둥은 둠)
// 60fps: 모두 미리 만든 묶음 재사용, 품질 낮음에서는 구·플립북 수를 줄임
(function () {
  const X = window.FX3; if (!X || typeof scene3 === 'undefined') return;
  const { emit, streak, bolt, arc, shock, crack, ground, floatRocks, dustRing, elemBurst, rr } = X;
  const st = window.__fx3p = { orbs: 0, flips: 0, fists: 0, glows: 0, noPillar: 0, ms: 0 };
  const root = new THREE.Group(); root.name = 'fx3p'; scene3.add(root);
  const keepRoot = () => { try { if (typeof baseTop !== 'undefined' && baseTop && !baseTop.has(root)) baseTop.add(root); } catch (e) { } };
  const T = { value: 0 }; const now = () => T.value;
  const Q = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  const busy = X.busy, UP = V3(0, 1, 0);
  const tasks = []; const later = (d, fn) => tasks.push({ t: d, fn }); const during = (dur, iv, fn, d0 = 0) => tasks.push({ t: d0, rep: iv, el: 0, end: d0 + dur, fn });
  const hand = f => (X.palm && X.palm(f)) || (() => { try { return handP(f); } catch (e) { return chest(f); } })();
  const tg = f => (f.target && f.target.pos && f.target !== f) ? f.target : f;
  const rnd = s => V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).multiplyScalar(s);

  // ═══ 1) 레이마칭 에너지 구 ═══
  const OVS = 'varying vec2 vUv; void main(){ vUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  const OFS = `uniform vec3 uC1; uniform vec3 uC2; uniform float uT; uniform float uSty; uniform float uOp; uniform float uSeed; uniform float uSteps; varying vec2 vUv;
    float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y), mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
    void main(){ float r2 = dot(vUv, vUv); if (r2 > 1.) discard; float z = sqrt(1. - r2); vec4 acc = vec4(0.);
      for (int i = 0; i < 12; i++) { if (float(i) >= uSteps) break; float k = (float(i) + .5) / uSteps; vec3 p = vec3(vUv, mix(-z, z, k)); float rl = length(p);
        float sw = uSty == 3. ? 0. : (uSty == 1. ? .8 : 3.2) * (1. - rl);                        // 소용돌이(가운데일수록 많이 비틂)
        float a = uT * (uSty == 1. ? .6 : 2.6) + sw; vec3 q = vec3(p.x * cos(a) - p.z * sin(a), p.y, p.x * sin(a) + p.z * cos(a));
        if (uSty == 1.) q.y -= uT * .5;
        float d = n3(q * 3.2 + uSeed) * .6 + n3(q * 7.1 - uT * .7) * .4;
        float band = uSty == 0. ? pow(abs(sin(atan(q.z, q.x) * 3. + rl * 9. - uT * 9.)), 6.) : 0.;   // 나선 결(나선환)
        float den = clamp((d * 1.25 + band * .6 - rl * .9) * 1.6, 0., 1.) * (1. - rl * rl);
        vec3 c = mix(uC2, uC1, smoothstep(.75, .15, rl)); c = mix(c, vec3(1.), smoothstep(.35, 0., rl) * (uSty == 2. ? .0 : .85));
        if (uSty == 2.) c = mix(vec3(.02, 0., .03), uC2, smoothstep(.5, 1., rl + d * .3));
        acc.rgb += (1. - acc.a) * c * den * .34 * 12. / uSteps; acc.a += (1. - acc.a) * den * .3 * 12. / uSteps; }
      float rim = smoothstep(1., .82, sqrt(r2)) * smoothstep(.55, .95, sqrt(r2)); acc.rgb += uC2 * rim * .35 * (uSty == 2. ? 2. : 1.);
      gl_FragColor = vec4(acc.rgb, clamp(acc.a * 1.4 + rim * .25, 0., 1.) * uOp); }`;
  const STEPS = { value: 8 }; // 품질 높음 12 · 그 밖 7
  const orbs = Array.from({ length: 6 }, () => { const u = { uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uT: T, uSty: { value: 0 }, uOp: { value: 1 }, uSeed: { value: Math.random() * 40 }, uSteps: STEPS };
    const dark = new THREE.ShaderMaterial({ uniforms: u, vertexShader: OVS, fragmentShader: OFS, transparent: true, depthWrite: false, blending: THREE.NormalBlending });
    const add = new THREE.ShaderMaterial({ uniforms: u, vertexShader: OVS, fragmentShader: OFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), add); m.visible = false; m.frustumCulled = false; m.renderOrder = 8; root.add(m); return { m, u, add, dark, on: false }; });
  // o: { at: () => 위치, r(반지름) | r0→r1, dur, sty(0 나선·1 불꽃 태양·2 어둠·3 공기·4 기), c1, c2, fly: { to: () => 위치, t0, t1 }, onEnd }
  function orb(o) { if (Q() === 'low' && orbs.filter(x => x.on).length >= 2) return null; const O = orbs.find(x => !x.on) || orbs[0];
    Object.assign(O, { on: true, t: 0, o }); O.u.uC1.value.set(o.c1 || '#ffffff'); O.u.uC2.value.set(o.c2 || '#4aa0ff'); O.u.uSty.value = o.sty || 0; O.m.material = o.sty === 2 ? O.dark : O.add; st.orbs++; return O; }
  const _op = new THREE.Vector3();
  function orbsUpdate(dt) { STEPS.value = Q() === 'high' ? 12 : 7; orbs.forEach(O => { if (!O.on) return; const o = O.o; O.t += dt; const k = O.t / o.dur; if (k >= 1) { O.on = false; O.m.visible = false; if (o.onEnd) try { o.onEnd(O.m.position.clone()); } catch (e) { console.error(e); } return; }
      let p = o.at(); if (o.fly && O.t > o.fly.t0) { const u = Math.min(1, (O.t - o.fly.t0) / (o.fly.t1 - o.fly.t0)); p = p.clone().lerp(o.fly.to(), u * u * (3 - 2 * u)); }
      const grow = o.r0 !== undefined ? o.r0 + (o.r1 - o.r0) * Math.min(1, O.t / (o.growT || o.dur * .6)) : o.r; O.m.position.copy(p); O.m.quaternion.copy(camera.quaternion); O.m.scale.setScalar(Math.max(.01, grow) * (1 + Math.sin(O.t * 40) * .02));
      O.u.uOp.value = Math.min(1, O.t * 6) * Math.min(1, (1 - k) * 5) * (o.op || 1); O.m.visible = true;
      if (Math.random() < busy() * .7) { const n = rnd(1).normalize(); _op.copy(p).addScaledVector(n, grow * 1.6); if (o.sty === 2) emit(_op, n.clone().multiplyScalar(-grow * 3), .3, 3, 7, o.c2 || '#a01040', 0); else streak(_op, n.clone().cross(UP).multiplyScalar(grow * 22).addScaledVector(n, -grow * 6), .14, .05, 1.6, Math.random() < .5 ? '#ffffff' : (o.c2 || '#4aa0ff')); } }); }

  // ═══ 2) 플립북 화염·연기(캔버스로 그림) ═══
  const atlas = (() => { const S = 128, N = 4, cv = document.createElement('canvas'); cv.width = cv.height = S * N; const x = cv.getContext('2d'); const R = (a, b) => a + Math.random() * (b - a);
    for (let fI = 0; fI < 16; fI++) { const ox = (fI % N) * S, oy = Math.floor(fI / N) * S, k = fI / 15; x.save(); x.beginPath(); x.rect(ox, oy, S, S); x.clip(); x.globalCompositeOperation = 'lighter';
      const blobs = 26; for (let i = 0; i < blobs; i++) { const a = R(0, 6.28), d = R(0, 1) * S * (.12 + k * .26), cx = ox + S / 2 + Math.cos(a) * d, cy = oy + S / 2 + Math.sin(a) * d * .8 - k * S * .08, rad = S * R(.08, .2) * (1 - k * .35);
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad), hot = Math.max(0, 1 - k * 1.6 - d / S); // 앞 프레임: 흰·노랑, 뒤: 주황→검붉은 연기
        g.addColorStop(0, `rgba(${255},${Math.round(150 + 105 * hot)},${Math.round(60 + 190 * hot * hot)},${(.55 - k * .25)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(ox, oy, S, S); }
      x.restore(); }
    const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; return t; })();
  const smokeAtlas = (() => { const S = 128, N = 4, cv = document.createElement('canvas'); cv.width = cv.height = S * N; const x = cv.getContext('2d'); const R = (a, b) => a + Math.random() * (b - a);
    for (let fI = 0; fI < 16; fI++) { const ox = (fI % N) * S, oy = Math.floor(fI / N) * S, k = fI / 15; x.save(); x.beginPath(); x.rect(ox, oy, S, S); x.clip();
      for (let i = 0; i < 22; i++) { const a = R(0, 6.28), d = R(0, 1) * S * (.1 + k * .22), cx = ox + S / 2 + Math.cos(a) * d, cy = oy + S / 2 + Math.sin(a) * d * .8, rad = S * R(.1, .22);
        const g = x.createRadialGradient(cx, cy - rad * .3, 0, cx, cy, rad); g.addColorStop(0, `rgba(255,255,255,${.22 * (1 - k * .5)})`); g.addColorStop(.6, `rgba(200,200,200,${.12 * (1 - k * .5)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(ox, oy, S, S); }
      x.restore(); }
    const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; return t; })();
  const fistTex = (() => { const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'); x.fillStyle = '#fff'; // 단순 주먹 실루엣(둥근 네모 + 마디 4개 + 엄지)
    const rr2 = (X0, Y0, W, H, r) => { x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X0 + W, Y0, X0 + W, Y0 + H, r); x.arcTo(X0 + W, Y0 + H, X0, Y0 + H, r); x.arcTo(X0, Y0 + H, X0, Y0, r); x.arcTo(X0, Y0, X0 + W, Y0, r); x.fill(); };
    rr2(14, 20, 36, 30, 9); for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(19 + i * 9, 21, 5.5, 0, 6.28); x.fill(); } rr2(8, 30, 14, 12, 6); const t = new THREE.CanvasTexture(cv); return t; })();
  const FVS = `attribute vec3 aV; attribute vec4 aD; attribute vec4 aC; uniform float uNow; uniform float uScale; varying vec3 vC; varying float vAge; varying float vRot;
    void main(){ float t = uNow - aD.x, age = t / aD.y; if (age < 0. || age > 1.) { gl_Position = vec4(2.,2.,2.,1.); gl_PointSize = 0.; return; }
      vec3 p = position + aV * (1. - exp(-1.6 * t)) / 1.6; p.y += aC.w * t * t * .5; vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_PointSize = clamp(aD.z * (.55 + age * 1.1) * uScale / max(1., -mv.z), 0., 160.); gl_Position = projectionMatrix * mv; vC = aC.rgb; vAge = age; vRot = aD.w; }`;
  const FFS = `uniform sampler2D uMap; uniform float uFist; varying vec3 vC; varying float vAge; varying float vRot;
    void main(){ vec2 uv = gl_PointCoord - .5; float c = cos(vRot), s = sin(vRot); uv = mat2(c, -s, s, c) * uv + .5; if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) discard;
      if (uFist > .5) { vec4 t = texture2D(uMap, uv); gl_FragColor = vec4(vC, t.a * (1. - vAge) * .85); return; }
      float fr = vAge * 15.; float f0 = floor(fr), f1 = min(15., f0 + 1.), w = fr - f0;
      vec2 a0 = (vec2(mod(f0, 4.), 3. - floor(f0 / 4.)) + uv) / 4., a1 = (vec2(mod(f1, 4.), 3. - floor(f1 / 4.)) + uv) / 4.;
      vec4 t = mix(texture2D(uMap, a0), texture2D(uMap, a1), w); gl_FragColor = vec4(t.rgb * vC, max(t.r, max(t.g, t.b)) * (1. - vAge * vAge)); }`;
  function FSys(cap, map, blend, fist) { const g = new THREE.BufferGeometry(), P = new Float32Array(cap * 3), V = new Float32Array(cap * 3), D = new Float32Array(cap * 4), C = new Float32Array(cap * 4);
    for (let i = 0; i < cap; i++) { D[i * 4] = -1e5; D[i * 4 + 1] = 1; } const at = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', at(P, 3)); g.setAttribute('aV', at(V, 3)); g.setAttribute('aD', at(D, 4)); g.setAttribute('aC', at(C, 4));
    const m = new THREE.ShaderMaterial({ uniforms: { uNow: T, uScale: { value: 600 }, uMap: { value: map }, uFist: { value: fist ? 1 : 0 } }, vertexShader: FVS, fragmentShader: FFS, transparent: true, depthWrite: false, blending: blend });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 6; root.add(pts); let i0 = 0, dirty = false; const col = new THREE.Color();
    return { m, emit(p, v, life, size, c, rise = 0, delay = 0) { const i = i0; i0 = (i0 + 1) % cap; col.set(c); P.set([p.x, p.y, p.z], i * 3); V.set([v.x, v.y, v.z], i * 3); D.set([now() + delay, life, size, Math.random() * 6.28], i * 4); C.set([col.r, col.g, col.b, rise], i * 4); dirty = true; },
      flush() { if (!dirty) return; dirty = false; for (const k of ['position', 'aV', 'aD', 'aC']) g.attributes[k].needsUpdate = true; } }; }
  const FIRE = FSys(420, atlas, THREE.AdditiveBlending), SMOKE = FSys(300, smokeAtlas, THREE.NormalBlending), FIST = FSys(500, fistTex, THREE.AdditiveBlending, true);
  const fireBall = (p, r, n = 10, c = '#ffffff', d0 = 0) => { n = Math.round(n * busy() * (Q() === 'low' ? .5 : 1)); for (let i = 0; i < n; i++) FIRE.emit(p.clone().add(rnd(r * .4)), rnd(r * 2.2), rr(.6, 1.1), r * rr(1.1, 1.8), c, 6, d0 + rr(0, .12)); st.flips += n; };
  const smokeCol = (p, r, n = 8, c = '#6a625a', d0 = 0) => { n = Math.round(n * busy()); for (let i = 0; i < n; i++) SMOKE.emit(p.clone().add(rnd(r * .5)), V3(rr(-1, 1) * r, rr(r * .8, r * 2.4), rr(-1, 1) * r), rr(1.6, 2.6), r * rr(1.4, 2.2), c, 4, d0 + rr(0, .4)); };

  // ═══ 3) 바닥에 비치는 빛(가산 데칼) ═══
  const GLFS = 'uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float r = length(vUv - .5) * 2.; float a = pow(max(0., 1. - r), 2.2) * uK; gl_FragColor = vec4(uC * a, a); }';
  const glows = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color() }, uK: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fragmentShader: GLFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.x = -Math.PI / 2; m.position.y = .2; m.visible = false; m.renderOrder = 3; root.add(m); return { m, on: false }; });
  function groundLight(get, r, c, dur, k = .9) { const G = glows.find(x => !x.on) || glows[0]; Object.assign(G, { on: true, t: 0, get: typeof get === 'function' ? get : () => get, r, dur, k }); G.m.material.uniforms.uC.value.set(c); st.glows++; return G; }
  function glowsUpdate(dt) { glows.forEach(G => { if (!G.on) return; G.t += dt; if (G.t >= G.dur) { G.on = false; G.m.visible = false; return; } const p = G.get(); G.m.position.set(p.x, .2, p.z); G.m.scale.setScalar(G.r * 2 * (1 + Math.sin(G.t * 23) * .04));
      G.m.material.uniforms.uK.value = (1 - .65 * (X.DAY ? X.DAY.value : 0)) * G.k * Math.min(1, G.t * 8) * Math.min(1, (G.dur - G.t) * 2.5) * Math.max(0, 1 - Math.max(0, p.y - 2) / 40); G.m.visible = true; }); }

  // ═══ 4) 풍차 수리검(흰 날 4개 + 고음 회전 링 + 가운데 구) ═══
  const blade = (() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.55, .25, 1.15, .05); s.quadraticCurveTo(.7, -.08, .32, -.32); s.quadraticCurveTo(.15, -.12, 0, 0); const g = new THREE.ShapeGeometry(s, 10); g.userData.shared = true; return g; })();
  const shuri = Array.from({ length: 2 }, () => { const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(blade, addMat('#ffffff', .95)); m.rotation.z = i * Math.PI / 2; spin.add(m); const m2 = new THREE.Mesh(blade, addMat('#bfe8ff', .6)); m2.rotation.z = i * Math.PI / 2 + .12; m2.scale.setScalar(1.12); spin.add(m2); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .025, 6, 48), addMat('#e8fbff', .9)); spin.add(ring); g.visible = false; root.add(g); return { g, spin, on: false }; });
  function shuriken(f, big, holdT, flyT, onHit) { const S = shuri.find(x => !x.on) || shuri[0], b = tg(f), R = big ? 30 : 13; Object.assign(S, { on: true, t: 0 }); S.g.visible = true;
    const pos = () => big ? hand(f).add(V3(0, 16, 0)) : hand(f).add(V3(0, 4, 0)); const ob = orb({ at: pos, r: big ? 6 : 3, dur: holdT + flyT, sty: 0, c1: '#ffffff', c2: '#5ab0ff', fly: { to: () => chest(b), t0: holdT, t1: holdT + flyT } });
    S.upd = dt => { S.t += dt; const k = S.t; let p = pos(); if (k > holdT) { const u = Math.min(1, (k - holdT) / flyT); p = p.lerp(chest(b), u * u * (3 - 2 * u)); }
      S.g.position.copy(p); S.g.quaternion.copy(camera.quaternion); S.g.rotateX(-.9); S.spin.rotation.z -= dt * 38; S.g.scale.setScalar(R * Math.min(1, k * 4));
      if (Math.random() < busy()) { const a = rr(0, 6.28); streak(p.clone().add(V3(Math.cos(a) * R * .9, 0, Math.sin(a) * R * .9)), V3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(R * 30), .08, .05, 1.4, '#ffffff'); }
      if (k > holdT + flyT) { S.on = false; S.g.visible = false; onHit(chest(b)); } }; }
  function windDome(p, R) { orb({ at: () => p, r0: R * .2, r1: R, growT: .35, dur: 1.4, sty: 3, c1: '#e8f8ff', c2: '#7ac8ff', op: .5 }); shock(V3(p.x, 1, p.z), UP, R * 2.2, '#e8fbff', .6);
    during(1.2, .03, () => { for (let i = 0; i < 10 * busy(); i++) { const n = rnd(1).normalize(), q = p.clone().addScaledVector(n, rr(R * .2, R)); streak(q, n.clone().cross(rnd(1)).normalize().multiplyScalar(rr(200, 360)), rr(.08, .16), .03, rr(1, 2), Math.random() < .7 ? '#ffffff' : '#9fe0ff'); } });
    groundLight(p, R * 1.5, '#9fd8ff', 1.4); dustRing(V3(p.x, 0, p.z), R * 1.2, 30); ground(p, 3.2, 'wind'); }

  // ═══ 5) 불꽃 해골 무사(수사노오): 뼈대 점을 따라 보라 불꽃 입자 ═══
  function susanoo(f, dur, col, full) { const H = full ? 70 : 46; during(dur, .03, el => { const fw = fwdOf(f), rt = V3(-fw.z, 0, fw.x), base = f.pos.clone().addScaledVector(fw, -4), grow = Math.min(1, el * 2.5);
      const P = (x, y, z) => base.clone().addScaledVector(rt, x).addScaledVector(fw, z).add(V3(0, y, 0)); const pts = [];
      for (let i = 0; i < 6; i++) { const y = H * (.35 + i * .07); pts.push(P(0, y, -3)); for (const s of [-1, 1]) for (let j = 1; j <= 3; j++) { const a = j / 3; pts.push(P(s * H * .2 * Math.sin(a * 1.6), y - a * 2, Math.cos(a * 1.6) * H * .12 - 3)); } } // 등뼈 + 갈비뼈
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; pts.push(P(Math.cos(a) * H * .1, H * .86 + Math.sin(a) * H * .1, 2)); } // 해골
      for (const s of [-1, 1]) for (let j = 0; j < 5; j++) pts.push(P(s * (H * .22 + j * H * .06), H * .72 - j * H * .08, 4 + j * 2)); // 팔
      if (full) for (const s of [-1, 1]) for (let j = 0; j < 4; j++) pts.push(P(s * H * .26, H * (.4 + j * .1), 6)); // 갑옷 판
      const n = Math.round(pts.length * .5 * busy()); for (let i = 0; i < n; i++) { const q = pts[(Math.random() * pts.length) | 0]; if (q.y > H * grow + 4) continue; emit(q.add(rnd(1.5)), V3(rr(-4, 4), rr(10, 26), rr(-4, 4)), rr(.35, .6), rr(4, 7), 1, col, -12); } });
    groundLight(() => f.pos, 34, col, dur, .8); }

  // ═══ 6) 기 모으기·적중 다층 합성(필살기 공통) ═══
  function charge(f, c, dur = .7) { during(dur, .025, el => { const h = el < .5 ? hand(f) : chest(f); for (let i = 0; i < 4 * busy(); i++) { const n = rnd(1).normalize(), d = rr(18, 34); emit(h.clone().addScaledVector(n, d), n.clone().multiplyScalar(-d / .35), .35, rr(2.5, 4), 0, Math.random() < .3 ? '#ffffff' : c); if (Math.random() < .3) streak(h.clone().addScaledVector(n, d), n.clone().multiplyScalar(-d / .25), .25, .05, 1.4, c); } }); groundLight(() => f.pos, 22, c, dur + .6, .7); }
  const FIREY = new Set(['fire', 'sun', 'kurama', 'blood', 'steam']);
  function ultImpact(p, ek, k = 1) { const E = (typeof ELEM !== 'undefined' && ELEM[ek]) || { c: '#ffffff' }, c = E.c;
    emit(p, V3(), .08, 16 * k, 0, '#ffffff'); emit(p, V3(), .2, 26 * k, 0, c); // 섬광은 짧고 작게(가까운 카메라에서 화면이 하얗게 덮이지 않게) shock(p, UP, 30 * k, c, .35);
    if (FIREY.has(ek)) { fireBall(p, 9 * k, 14, '#ffffff'); smokeCol(p, 8 * k, 10, '#4a4038', .3); } else { fireBall(p, 6 * k, 6, c); smokeCol(p, 6 * k, 6, ek === 'dark' ? '#2a1830' : '#8a8478', .2); }
    groundLight(V3(p.x, 0, p.z), 40 * k, c, 1.2, .9); if (X.distort) X.distort(p, 40 * k, .2, 0);
    during(1.6, .06, () => { for (let i = 0; i < 2 * busy(); i++) emit(V3(p.x + rr(-14, 14) * k, rr(0, 6), p.z + rr(-14, 14) * k), V3(rr(-6, 6), rr(10, 30), rr(-6, 6)), rr(.8, 1.4), 1.3, 5, '#ffb050', -6); }, .3); } // 잔불

  // ═══ 7) 원작 재현 고도화(채점표 3점 미만) ═══
  const P = X.pre = X.pre || [];
  const def = (re, cast, hit, also = false) => P.push({ re, cast, hit, also });
  def(/초대옥나선수리검|나선수리검/, (f, nm) => { const big = /초대옥/.test(nm); charge(f, '#9fe0ff', .5); shuriken(f, big, big ? 1.1 : .85, .45, p => windDome(p, big ? 46 : 26)); });
  def(/거대 나선환|대옥나선환|나선환/, (f, nm) => { const big = /거대|대옥/.test(nm); charge(f, '#7ac0ff', .6); orb({ at: () => hand(f).add(V3(0, big ? 8 : 2, 0)), r0: .5, r1: big ? 9 : 3.6, growT: .5, dur: 1.15, sty: 0, c1: '#ffffff', c2: '#3a8aff' }); groundLight(() => f.pos, big ? 26 : 14, '#5ab0ff', 1.3); },
    (a, b, p) => { orb({ at: () => p, r0: 5, r1: 12, growT: .25, dur: .45, sty: 0, c1: '#ffffff', c2: '#3a8aff' }); ultImpact(p, 'wind', .8); }, true);
  def(/미수옥/, f => { charge(f, '#c03050', .6); const b = tg(f); orb({ at: () => headP(f).addScaledVector(fwdOf(f), 7), r0: .5, r1: 7, growT: .6, dur: 1.2, sty: 2, c1: '#000000', c2: '#c02040', fly: { to: () => chest(b), t0: .8, t1: 1.15 }, onEnd: p => ultImpact(p, 'dark', 1.4) }); });
  def(/염제/, f => { const b = tg(f); charge(f, '#ff8a20', .6); orb({ at: () => f.pos.clone().add(V3(0, 48, 0)), r0: 2, r1: 24, growT: .9, dur: 1.9, sty: 1, c1: '#fff0a0', c2: '#ff5a10', fly: { to: () => chest(b), t0: 1.2, t1: 1.8 }, onEnd: p => { ultImpact(p, 'fire', 1.8); fireBall(p, 22, 22, '#ffffff'); } }); groundLight(() => f.pos, 60, '#ff7a20', 2); });
  def(/허화|세로/, f => { const b = tg(f); orb({ at: () => hand(f).addScaledVector(fwdOf(f), 4), r0: .5, r1: 5, growT: .4, dur: .75, sty: 4, c1: '#ffd0d0', c2: '#ff1a2a', fly: { to: () => chest(b), t0: .45, t1: .7 }, onEnd: p => ultImpact(p, 'hollow', 1) }); }, null, true);
  def(/낮 호랑이/, f => { const b = tg(f); later(.35, () => orb({ at: () => hand(f).addScaledVector(fwdOf(f), 6), r0: 3, r1: 16, growT: .2, dur: .6, sty: 3, c1: '#ffffff', c2: '#ffe8c0', fly: { to: () => chest(b), t0: .1, t1: .5 }, onEnd: p => { ultImpact(p, 'power', 1.4); shock(p, dirTo(f, b), 70, '#ffffff', .5); } })); }, null, true);
  def(/염동 압축/, f => { const b = tg(f); later(.3, () => orb({ at: () => chest(b), r0: 18, r1: 6, growT: .9, dur: 1.2, sty: 4, c1: '#d0ffe0', c2: '#30ff80', onEnd: p => ultImpact(p, 'psychic', 1) })); }, null, true);
  def(/완성체 수사노오|수사노오|토츠카|야타의 거울/, (f, nm) => { const c = /이타치/.test(f.ch.name || '') || f.ch.key === 'itachi' ? '#ff3a50' : '#b050ff'; susanoo(f, 1.8, c, /완성체/.test(nm));
      if (/야타/.test(nm)) later(.4, () => arc({ c0: chest(f).addScaledVector(fwdOf(f), 14).add(V3(0, 10, 0)), x: V3(-fwdOf(f).z, 0, fwdOf(f).x), y: UP, r: 12, a0: 0, a1: 6.283, w: 5, dur: 1.2, tail: 1, sty: 0, col: '#ffd0e0' }));
      if (/토츠카/.test(nm)) { const b = tg(f); later(.5, () => { for (let i = 0; i < 3; i++) later(i * .1, () => streak(chest(f).add(V3(0, 18, 0)), chest(b).sub(chest(f)).multiplyScalar(2.5), .45, .08, 6, '#ffe8a0')); }); } });
  def(/기어 세컨드/, f => { during(1.8, .04, () => { for (let i = 0; i < 3 * busy(); i++) { const p = f.pos.clone().add(V3(rr(-6, 6), rr(4, 22), rr(-6, 6))); SMOKE.emit(p, V3(rr(-6, 6), rr(18, 40), rr(-6, 6)), rr(.9, 1.4), rr(5, 9), '#ffc8c8', 2); emit(p, V3(0, 20, 0), .5, 4, 0, '#ff6a7a'); } }); groundLight(() => f.pos, 16, '#ff5a6a', 1.8, .5); });
  def(/기어 5|해방의 북소리/, f => { during(1.8, .05, () => { for (let i = 0; i < 2 * busy(); i++) SMOKE.emit(f.pos.clone().add(V3(rr(-10, 10), rr(4, 30), rr(-10, 10))), V3(rr(-10, 10), rr(10, 30), rr(-10, 10)), rr(1, 1.5), rr(7, 11), '#e8e8ec', 1); if (Math.random() < .2) bolt(chest(f), chest(f).add(rnd(22)), '#ffffff', .12, 2, 1); }); groundLight(() => f.pos, 30, '#ffffff', 1.8, .6); }, null, true);
  def(/진지한 연속 보통 펀치|연속 보통 펀치/, f => { const b = tg(f); during(1.4, .02, () => { const d = chest(b).sub(chest(f)), L = d.length(); d.normalize(); const s = V3(-d.z, 0, d.x);
      for (let i = 0; i < 10 * busy(); i++) { const q = chest(f).addScaledVector(d, rr(6, L * .7)).addScaledVector(s, rr(-14, 14)).add(V3(0, rr(-8, 12), 0)); FIST.emit(q, d.clone().multiplyScalar(rr(60, 140)), rr(.12, .22), rr(5, 9), Math.random() < .3 ? '#ffe0c0' : '#ffffff'); st.fists++; }
      if (Math.random() < .5) shock(chest(b).add(rnd(6)), d, rr(10, 22), '#ffffff', .25); }, .2); }, (a, b, p) => ultImpact(p, 'power', 1.3), true);
  def(/진지한 박수/, f => { later(.3, () => { const p = chest(f).addScaledVector(fwdOf(f), 6); shock(p, fwdOf(f), 120, '#ffffff', .8); shock(p, UP, 100, '#e8e8f0', .9, .1); emit(p, V3(), .1, 40, 0, '#ffffff');
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; SMOKE.emit(p.clone().add(V3(Math.cos(a) * 10, rr(-4, 10), Math.sin(a) * 10)), V3(Math.cos(a) * 170, rr(0, 30), Math.sin(a) * 170), 1.6, 16, '#bdb8c4', 0); } if (X.distort) X.distort(p, 120, .3, 0); }); }, null, true);
  def(/백제검/, f => { during(1.2, .05, () => { const fw = fwdOf(f), rt = V3(-fw.z, 0, fw.x); for (const s of [-1, 1]) for (let i = 0; i < 3 * busy(); i++) { const a = rr(.2, 1.4); const q = chest(f).addScaledVector(fw, -4).addScaledVector(rt, s * a * 14).add(V3(0, Math.sin(a * 2) * 10 + 4, 0)); emit(q, V3(0, 6, 0), .5, rr(3, 6), 0, Math.random() < .5 ? '#ffffff' : '#fff6d0'); } }); }, null, true);
  def(/백뢰/, f => { const b = tg(f); later(.25, () => { for (let i = 0; i < 3; i++) later(i * .05, () => bolt(() => hand(f), () => chest(b), '#ffffff', .35, 7, 2, .06)); ultImpact(chest(b), 'light', .8); }); });
  def(/인드라의 화살/, f => { const b = tg(f); susanoo(f, 1.6, '#b050ff', false); later(.9, () => { for (let i = 0; i < 4; i++) later(i * .06, () => bolt(() => chest(f).add(V3(0, 14, 0)), () => chest(b), i ? '#c080ff' : '#ffffff', .5, 10, 6, .1)); later(.25, () => ultImpact(chest(b), 'bolt', 1.6)); }); });
  def(/아수라|구도류/, f => { const b = tg(f); later(.4, () => { const d = dirTo(f, b), s = V3(-d.z, 0, d.x); for (let i = 0; i < 9; i++) later(i * .03, () => { const tilt = (i - 4) * .3; arc({ c0: chest(f).addScaledVector(d, 18), x: s.clone().multiplyScalar(Math.cos(tilt)).add(V3(0, Math.sin(tilt), 0)), y: d, r: 20, a0: -1.7, a1: 1.7, w: 5, dur: .3, tail: .8, sty: 5, col: '#c8ffd8' }); });
      for (let i = 0; i < 3; i++) emit(chest(f).add(V3(rr(-8, 8), 16, rr(-8, 8))), V3(0, 4, 0), .8, 18, 7, '#305040'); }); });
  def(/수룡탄|수룡|생생유전|빙륜환|빙룡/, (f, nm) => { const b = tg(f), ice = /빙/.test(nm); later(.15, () => orb({ at: () => chest(f).add(V3(0, 6, 0)), r: 6, dur: .85, sty: ice ? 4 : 0, c1: '#ffffff', c2: ice ? '#9ae8ff' : '#2a7aff', fly: { to: () => chest(b), t0: .05, t1: .8 }, onEnd: p => ultImpact(p, ice ? 'ice' : 'water', 1) })); groundLight(() => f.pos, 26, ice ? '#9ae8ff' : '#3a8aff', 1.2, .6); }, null, true);
  def(/화권|소각|감마선|불지옥/, f => { const b = tg(f); later(.2, () => during(.55, .025, () => { const a = /화권|불지옥/.test(f.__nm || '') ? hand(f) : hand(f), d = chest(b).sub(a), L = d.length(); d.normalize(); const c = /감마/.test(f.__nm || '') ? '#ff6aa0' : '#ffffff';
      for (let i = 0; i < 3 * busy(); i++) FIRE.emit(a.clone().addScaledVector(d, rr(0, 6)), d.clone().multiplyScalar(L / .4 * rr(.8, 1.05)).add(rnd(18)), rr(.45, .6), rr(8, 14), c, 0); groundLight(a.clone().addScaledVector(d, L * .5), 20, '#ff6a20', .3, .5); })); },
    (a, b, p) => ultImpact(p, 'fire', 1.2), true);
  def(/빛 대폭발|빛의 비|팔척경옥/, f => { const b = tg(f); groundLight(() => b.pos, 50, '#fff080', 2, .8); later(.6, () => ultImpact(chest(b), 'light', 1.4)); }, null, true);
  def(/바위 대분쇄|대분쇄/, f => { const b = tg(f); later(.45, () => { ultImpact(b.pos.clone().add(V3(0, 2, 0)), 'earth', 1.6); if (window.__env) { __env.spike(b.pos, 10, 18, 16, 'earth'); __env.crater(V3(b.pos.x, 0, b.pos.z), 20); } floatRocks(b.pos, 16, 30, .3); }); }, null, true);
  def(/카츠유|분신술/, f => { for (let i = 0; i < 18 * busy(); i++) SMOKE.emit(f.pos.clone().add(V3(rr(-12, 12), rr(2, 16), rr(-12, 12))), rnd(40), rr(.8, 1.2), rr(12, 20), '#f4f4f4', 1); }, null, true);
  def(/츠쿠요미|완전최면|경화수월/, f => { const b = tg(f); groundLight(() => b.pos, 60, '#ff1a2a', 1.8, .8); if (X.distort) later(.2, () => X.distort(chest(b), 60, 1.2, 1)); }, null, true);
  def(/반카이|만해|무월|영압 폭발|붕옥|괴인 각성|괴인화|우주적 공포|귀화|구미 차크라|선인 모드|백호인|팔문|밤가이/, f => { const c = (ELEM[f.elem || (f.ch.sig && f.ch.sig.elem)] || ELEM.power).c; charge(f, c, .8); later(.8, () => ultImpact(f.pos.clone().add(V3(0, 8, 0)), f.elem || (f.ch.sig && f.ch.sig.elem) || 'power', 1.2)); }, null, true);

  // ═══ 공용 빛기둥 정리 + 필살기 공통 기 모으기 ═══
  const KEEP = /반카이|만해|무월|영압 폭발/; // 원작에 빛기둥이 있는 것만 둠
  const _co = callout; callout = function (f, text, ult) { const n0 = typeof fx !== 'undefined' ? fx.length : 0; const r = _co.apply(this, arguments);
    try { if (ult && typeof fx !== 'undefined') { const nm = String(text || ''); const has = (X.find && X.find(nm)) || P.some(p => p.re.test(nm));
        if (!KEEP.test(nm)) for (let i = n0; i < fx.length; i++) if (fx[i] && fx[i].k === 'pillar') { fx[i].k = 'fx3none'; fx[i].life = .01; st.noPillar++; }
        if (!P.some(p => p.re.test(nm))) charge(f, (ELEM[f.elem || (f.ch.sig && f.ch.sig.elem)] || ELEM.power).c, .6); } } catch (e) { console.error(e); } return r; };
  const _res = resolve; resolve = function (a, b, ek, o, nm, pw = 1, at) { const r = _res.apply(this, arguments); try { if ((o === 'hit' || o === 'sub') && b && b.pos && pw >= 2.2 && !P.some(p => p.hit && p.re.test(String(nm)))) ultImpact(at || chest(b), ek || (a && a.elem) || 'power', Math.min(1.4, pw / 2)); } catch (e) { console.error(e); } return r; };

  // ═══ 매 장면 ═══
  const _env = envUpdate; envUpdate = function (dt, t) { _env(dt, t); const t0 = performance.now();
    try { keepRoot(); T.value += Math.min(Math.max(dt, 0), .1); const sc = renderer.domElement.height * .5 / Math.tan(camera.fov * Math.PI / 360); FIRE.m.uniforms.uScale.value = SMOKE.m.uniforms.uScale.value = FIST.m.uniforms.uScale.value = sc;
      for (let i = tasks.length - 1; i >= 0; i--) { const k = tasks[i]; k.t -= dt; if (k.rep) { k.el += dt; if (k.t <= 0) { k.t += k.rep; try { k.fn(Math.min(1, k.el / k.end)); } catch (e) { console.error(e); } } if (k.el >= k.end) tasks.splice(i, 1); } else if (k.t <= 0) { tasks.splice(i, 1); try { k.fn(); } catch (e) { console.error(e); } } }
      if (tasks.length > 200) tasks.splice(0, tasks.length - 200);
      orbsUpdate(dt); glowsUpdate(dt); shuri.forEach(S => { if (S.on) S.upd(dt); }); FIRE.flush(); SMOKE.flush(); FIST.flush(); } catch (e) { console.error(e); }
    st.ms = st.ms * .95 + (performance.now() - t0) * .05; };
  setTimeout(() => root.traverse(o => { if (o.material && X.regAdd && !o.material.uniforms?.uK) X.regAdd(o.material); }), 0); orbs.forEach(O => X.regAdd && X.regAdd(O.add));
  X.orb = orb; X.FL = { FIRE, SMOKE, FIST }; X.susanoo = susanoo; X.charge = charge; X.shuriken = shuriken; X.windDome = windDome; X.groundLight = groundLight; X.fireBall = fireBall; X.smokeCol = smokeCol; X.ultImpact = ultImpact;
})();
