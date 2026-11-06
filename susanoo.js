// ═══ 수사노오 정교 메시 (사스케·이타치) — Blender 스크립트 모델(assets/susanoo/*.glb) + 반투명 차크라 재질 + 단계 전환 ═══
// 모델 원본: C:\Users\아이센스\tools\blender\work\susanoo\make_susanoo.py (참고 이미지는 보기만, 내려받기·텍스처 사용 없음)
//
// 단계별 특징 정리(참고: 애니 화면 검색 결과를 보고 정리)
// ┌──────────┬───────────────────────────────────────────────┬───────────────────────────────────────────────┐
// │ 단계      │ 사스케(보라)                                    │ 이타치(붉은 주황)                               │
// ├──────────┼───────────────────────────────────────────────┼───────────────────────────────────────────────┤
// │ 1 해골    │ 등뼈·갈비뼈 7쌍·복장뼈·쇄골·어깨뼈, 두개굴(눈구멍),   │ 같은 뼈대, 두개골이 더 둥글고 눈구멍이 큼,          │
// │          │ 아래턱·이빨, 팔뼈(위팔·아래팔 2개·손가락 마디)       │ 시전자를 갈비뼈로 감쌈                           │
// │ 2 상반신  │ 갑주 몸통(가슴판·배 띠 4단·등판·경갑), 어깨 판 3겹+뿔,│ 둥근 얼굴·큰 눈구멍·송곳니·긴 턱수염·정수리 능선,   │
// │          │ 투구(가면 눈 틈·입 틈·이마 차양·초승달 뿔·뒷목 3겹), │ 어깨를 덮는 망토(주름), 둥근 어깨 판,              │
// │          │ 팔 4개, 오른손 검                                │ 왼손 야타의 거울(곡옥·불꽃 테), 오른손 호리병+토츠카 │
// │ 3 완성체  │ 더 큼·다리·허리 자락 10장, 텐구 긴 코 가면,          │ 더 큼·하카마 자락(주름)·앞 매듭, 도킨 모자,         │
// │          │ 뒤로 뻗은 뿔·귀 장식, 깃털 판 날개(3겹×9), 검·활(인드라)│ 구슬 귀 장식·머리 날개 장식, 거울·토츠카             │
// └──────────┴───────────────────────────────────────────────┴───────────────────────────────────────────────┘
// 연결: FX3.onCast(사스케·이타치의 수사노오 계열 기술 이름)에서 새 메시를 띄우고, 기존 메시(fx3-plus2 SUS·canon-naruto 수사노오)는 숨김만.
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined' || typeof envUpdate !== 'function') return;
  const st = window.__susanoo = { ready: 0, err: null, shows: 0, hidOld: 0, live: 0 };
  const BASE = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(Error('불러오기 실패 ' + src)); document.head.appendChild(s); });
  const COL = { sasuke: ['#7a34ff', '#efd8ff'], itachi: ['#ff3a1a', '#ffd8a8'] };
  const MODELS = {}; // 'sasuke_1' → gltf.scene
  const T = { value: 0 };

  // ── 차크라 재질: 프레넬 가장자리 밝게 + 위로 흐르는 결 + 아래→위 드러남 띠 ──
  const VS = `uniform float uT; uniform float uWob; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){ vec3 p = position; float w = sin(p.y*.9 + uT*6. + p.x*.5) * sin(p.z*.7 - uT*4.3); p += normal * w * uWob;
      vec4 wp = modelMatrix * vec4(p, 1.); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const FS = `uniform vec3 uC; uniform vec3 uC2; uniform float uOp; uniform float uT; uniform float uCut; uniform float uY0; uniform float uS; uniform float uSeed;
    varying vec3 vN; varying vec3 vV; varying vec3 vW;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
      return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y), mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
    void main(){ float ly = (vW.y - uY0) / uS; float e = ly - uCut; if (e > 0.) discard;
      vec3 N = normalize(vN); vec3 Vd = normalize(vV); if (!gl_FrontFacing) N = -N; float ndv = clamp(abs(dot(N, Vd)), 0., 1.);
      float fr = pow(1. - ndv, 2.2);
      float n = n3(vW * .14 + vec3(0., -uT * 1.7, 0.) + uSeed) * .65 + n3(vW * .37 + vec3(0., -uT * 3.1, 0.)) * .35;
      float flow = smoothstep(.62, .96, sin(vW.y * .5 - uT * 5. + n * 8.) * .5 + .5);
      float lit = .5 + .5 * max(dot(N, normalize(vec3(.35, 1., .45))), 0.);
      float band = smoothstep(-4., 0., e);
      vec3 col = uC * (.09 + .2 * lit) + uC * flow * (.22 + .55 * fr) + mix(uC, uC2, fr * .8) * fr * 2.1 + uC2 * band * band * 1.3 + uC2 * n * n * .06;
      gl_FragColor = vec4(col * uOp, 1.); }`;
  function chakraMat(kind) { const [c, c2] = COL[kind];
    return new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(c) }, uC2: { value: new THREE.Color(c2) }, uOp: { value: 0 }, uT: T, uCut: { value: -10 }, uY0: { value: 0 }, uS: { value: 1 }, uSeed: { value: Math.random() * 40 }, uWob: { value: .1 }, uSty: { value: 4 } },
      vertexShader: VS, fragmentShader: FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide }); }

  // ── 불러오기 ──
  (async () => {
    try {
      for (let i = 0; i < 100 && !THREE.GLTFLoader; i++) { if (i === 10) await loadScript(BASE + 'loaders/GLTFLoader.js').catch(() => { }); await new Promise(r => setTimeout(r, 100)); }
      const L = new THREE.GLTFLoader(), get = u => new Promise((ok, no) => L.load(u, ok, undefined, no));
      const keys = ['sasuke_1', 'sasuke_2', 'sasuke_3', 'itachi_1', 'itachi_2', 'itachi_3'];
      const gs = await Promise.all(keys.map(k => get('assets/susanoo/' + k + '.glb')));
      keys.forEach((k, i) => { const sc = gs[i].scene; sc.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingSphere(); o.frustumCulled = false; } }); MODELS[k] = sc; });
      st.ready = 1;
    } catch (e) { st.err = String(e); console.warn('수사노오 모델 불러오기 실패', e); }
  })();

  // ── 한 번 띄운 수사노오(인물·단계 묶음) ──
  const LIVE = [];
  function inst(kind, stage) { const src = MODELS[kind + '_' + stage]; if (!src) return null; const g = src.clone(true), mats = [], parts = {};
    const ms = [], ds = []; g.traverse(o => { if (o.isMesh) ms.push(o); if (o.name) parts[o.name] = o; });
    ms.forEach(o => { o.material = chakraMat(kind); mats.push(o.material);
      // 깊이 먼저 그리기(색 없음): 가장 앞 겉면만 빛나게 — 안쪽 겹친 면이 비눗방울처럼 쌓이지 않음
      const dm = new THREE.ShaderMaterial({ uniforms: o.material.uniforms, vertexShader: VS, fragmentShader: FS, colorWrite: false, depthWrite: true, side: THREE.FrontSide, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneFactor, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      const d = new THREE.Mesh(o.geometry, dm); d.frustumCulled = false; d.renderOrder = 1000; /* 불투명 중 맨 마지막(배경·벽 다음) */ d.name = ''; o.add(d); ds.push(d); });
    Object.values(parts).forEach(o => { o.userData.r0 = o.rotation.clone(); });
    return { g, mats, parts, stage, ds }; }
  function setMats(I, op, cut, y0, s) { I.mats.forEach(m => { m.uniforms.uOp.value = op; m.uniforms.uCut.value = cut; m.uniforms.uY0.value = y0; m.uniforms.uS.value = s; }); I.g.visible = op > .003; I.ds.forEach(d => { d.visible = op > .3; }); }
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const fwd = f => (typeof fwdOf === 'function' ? fwdOf(f) : new THREE.Vector3(Math.cos(f.heading), 0, Math.sin(f.heading)));
  // 단계 시간표: 해골 0~.45 → 상반신 .45~.9 → 완성체 .9~1.35 (앞 단계는 안에 남았다가 흐려짐)
  const H = { 1: 46, 2: 62, 3: 92 };
  function show(f, kind, o) {
    if (!st.ready || !f || !f.pos) return null;
    const stages = o.stages || [1, 2, 3], root = new THREE.Group(); root.name = 'susanoo';
    const I = {}; stages.forEach(s => { I[s] = inst(kind, s); if (I[s]) root.add(I[s].g); });
    const S = { f, kind, o, root, I, t: 0, dur: o.dur || 3, stages };
    // 무기 보이기: 검(수사노오 참격) / 활(인드라) / 이타치는 거울·호리병·토츠카
    Object.values(I).forEach(x => { if (!x) return; const p = x.parts; if (p.w_sword) p.w_sword.visible = !o.bow; if (p.w_bow) p.w_bow.visible = !!o.bow; if (p.w_totsuka) p.w_totsuka.visible = !o.shield || true; });
    place(S); scene3.add(root); LIVE.push(S); st.shows++; return S;
  }
  function place(S) { const f = S.f, fw = fwd(f), k = (f.scale || 1); S.root.position.copy(f.pos).addScaledVector(fw, -3.5); S.root.position.y = Math.max(0, f.pos.y - 1); S.root.rotation.y = Math.atan2(fw.x, fw.z); S.root.scale.setScalar(k); }
  function upd(S, dt) {
    S.t += dt; const t = S.t, last = S.stages[S.stages.length - 1], y0 = S.root.position.y, k = S.root.scale.x;
    const out = 1 - sm((t - S.dur) / .55);   // 끝 사라짐
    const tStart = s => S.stages.indexOf(s) * .45;
    S.stages.forEach(s => { const I = S.I[s]; if (!I) return; const t0 = tStart(s), a = sm((t - t0) / .45), nxt = S.stages[S.stages.indexOf(s) + 1];
      const after = nxt ? sm((t - tStart(nxt) - .1) / .45) : 0;           // 다음 단계가 덮으면 흐려짐
      let op = (S.kind === 'itachi' ? .95 : 1.05) * a * out * (1 - after * (nxt === 3 ? 1 : .72));
      const cut = t < t0 ? -10 : -2 + (H[s] + 6) * sm((t - t0) / .5);
      // 앞 단계는 커지는 몸 안으로(해골이 갑주 속 뼈처럼)
      const sc = 1 + after * (s === 1 ? .2 : .08); I.g.scale.setScalar(sc); I.g.position.set(0, 0, after * (s === 1 ? 1.5 : 0));
      setMats(I, op, out < 1 ? Math.min(cut, -2 + (H[s] + 6) * out) : cut, y0, k * sc);
      I.mats.forEach(m => { m.uniforms.uWob.value = .06 + .1 * (1 - a); });
      anim(S, I, t, s === last);
    });
    // 몸에서 피어오르는 차크라 불꽃
    const X = window.FX3; if (X && X.emit && out > .2 && !S.frozen && Math.random() < .6) { const I = S.I[curStage(S)]; if (I) for (let i = 0; i < 2; i++) { const p = randPt(I); if (p) X.emit(p, new THREE.Vector3((Math.random() - .5) * 4, 10 + Math.random() * 14, (Math.random() - .5) * 4), .25 + Math.random() * .25, 1.6 + Math.random() * 1.8, 1, COL[S.kind][Math.random() < .3 ? 1 : 0], -4); } }
    return t < S.dur + .6;
  }
  const curStage = S => { let c = S.stages[0]; S.stages.forEach(s => { if (S.t >= S.stages.indexOf(s) * .45) c = s; }); return c; };
  const _v = new THREE.Vector3();
  function randPt(I) { const ms = []; I.g.traverse(o => { if (o.isMesh && o.visible) ms.push(o); }); if (!ms.length) return null; const m = ms[(Math.random() * ms.length) | 0], pa = m.geometry.attributes.position; const i = (Math.random() * pa.count) | 0; _v.fromBufferAttribute(pa, i); m.updateWorldMatrix(true, false); return _v.clone().applyMatrix4(m.matrixWorld); }
  // 움직임: 숨쉬기·턱·검 휘두르기·날개·팔 흔들림
  function anim(S, I, t, isLast) { const p = I.parts, br = Math.sin(t * 2.4) * .02;
    const r = (o, x, y, z) => { if (!o) return; const r0 = o.userData.r0; o.rotation.set(r0.x + x, r0.y + y, r0.z + z); };
    if (p.s1_jaw) r(p.s1_jaw, .18 + Math.sin(t * 7) * .12, 0, 0);
    ['s1_armL', 's2_armL', 's3_armL', 's2_arm2L', 's2_arm2R'].forEach(n => p[n] && r(p[n], Math.sin(t * 1.7 + n.length) * .05, 0, 0));
    const sw = S.o.swing; let a = Math.sin(t * 1.5) * .05;
    if (sw && isLast) { const u = (t - sw[0]) / (sw[1] - sw[0]); a = u < 0 ? -.45 * sm((t - sw[0] + .45) / .45) : u < 1 ? -.45 + 1.95 * sm(u) : 1.5 - .6 * sm((t - sw[1]) / .5); }
    ['s1_armR', 's2_armR', 's3_armR'].forEach(n => p[n] && r(p[n], a, 0, 0));
    if (p.s3_wings) r(p.s3_wings, Math.sin(t * 2.2) * .06, 0, 0);
    if (p.s2_head) r(p.s2_head, br, 0, 0); if (p.s3_head) r(p.s3_head, br, 0, 0);
  }
  function endS(S) { scene3.remove(S.root); Object.values(S.I).forEach(I => I && I.mats.forEach(m => m.dispose())); }

  // ── 기존 수사노오 메시 숨김(이펙트 일꾼 파일은 고치지 않음): 보이기 값을 항상 거짓으로 ──
  const HIDE = new WeakSet();
  function hide(g) { if (!g || HIDE.has(g)) return; HIDE.add(g); try { Object.defineProperty(g, 'visible', { get() { return false; }, set() { }, configurable: true }); st.hidOld++; } catch (e) { } }
  const OLDC = ['5a1ab0', 'c02010']; // fx3-plus2 SUS 등뼈 색(사스케·이타치만, 마다라 파랑은 그대로)
  function hideOld() {
    const ch = scene3.children;
    for (let i = 0; i < ch.length; i++) { const g = ch[i]; if (HIDE.has(g) || !g.isGroup || !g.children.length) continue; const m0 = g.children[0];
      if (m0 && m0.userData && m0.userData.stage === 1 && m0.material && m0.material.color && OLDC.includes(m0.material.color.getHexString())) hide(g); }
    const L = window.__canonNaruto && __canonNaruto.live; if (L) L.forEach(o => { if (o && o.armF && o.armB && o.g) hide(o.g); });
  }

  // ── 기술 연결 ──
  const kindOf = f => { const k = f && f.ch && f.ch.key; return k === 'sasuke' || k === 'itachi' ? k : null; };
  function plan(kind, nm) {
    if (kind === 'sasuke') {
      if (/인드라/.test(nm)) return { stages: [1, 2, 3], bow: true, dur: 2.9 };
      if (/수사노오/.test(nm)) return { stages: [1, 2, 3], dur: 2.9, swing: [1.45, 1.8] };
    } else {
      if (/토츠카/.test(nm)) return { stages: [1, 2, 3], dur: 2.8 };
      if (/야타/.test(nm)) return { stages: [1, 2], dur: 4.2, shield: true };
      if (/수사노오/.test(nm)) return { stages: [1, 2], dur: 2.6 };
    }
    return null;
  }
  function onCast(f, nm) { const kind = kindOf(f); if (!kind) return; const o = plan(kind, String(nm || '')); if (!o) return;
    LIVE.filter(S => S.f === f).forEach(S => { S.dur = Math.min(S.dur, S.t); }); // 같은 사람 앞 수사노오는 접기
    show(f, kind, o); }
  function hook() { const X = window.FX3; if (!X || !X.onCast || X.onCast.__sus) return false; const _oc = X.onCast; X.onCast = function (f, nm) { const r = _oc.apply(this, arguments); try { onCast(f, nm); } catch (e) { console.error(e); } return r; }; X.onCast.__sus = true; return true; }
  if (!hook()) { const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 300); setTimeout(() => clearInterval(iv), 15000); }

  // ── 매 화면 ──
  const _env = envUpdate;
  envUpdate = function (dt, t) { _env(dt, t); try { T.value = t; hideOld(); for (let i = LIVE.length - 1; i >= 0; i--) { const S = LIVE[i]; if (S.f && S.f.pos) place(S); const keep = S.frozen ? (upd(S, 0), true) : upd(S, dt); if (!keep) { endS(S); LIVE.splice(i, 1); } } st.live = LIVE.length; } catch (e) { console.error(e); } };

  // 시험용: 특정 단계에서 멈춘 모습(정면·측면 캡처)
  st.show = show; st.LIVE = LIVE;
  st.freeze = (f, kind, stage, o = {}) => { const S = show(f, kind, Object.assign({ stages: [stage], dur: 99 }, o)); if (S) { S.t = 1.2; S.frozen = true; } return S; };
  st.clear = () => { LIVE.forEach(endS); LIVE.length = 0; };
})();
