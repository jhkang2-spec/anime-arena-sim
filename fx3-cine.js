// 시네마틱 연출 (fx3-cine) — 카메라 위치는 건드리지 않고 그리기 뒤 효과만. 품질(setQuality: low·mid·high)에 맞춰 켜고 끈다.
// 1) 기술 빛 번짐(선택 Bloom): 기술 이펙트만 따로 작게 그려 흐린 뒤 화면에 더함 — 낮음 끔 · 중간 1/4 해상도 · 높음 1/2 해상도
// 2) 필살기 순간: 짧은 정지(Impact Freeze) → 느린 화면(Slow Motion) + 화면 가장자리 속도선(Speed Lines) + 시전자 잔상(fx3-mocap)
// 3) 가벼운 움직임 흐림: 아주 빠른 돌진 때 속도선 방식으로만(화면 전체 흐림 없음 → 잘 보이게)
// 4) 남은 '단색 도형'(반투명 기본 재질로 만든 원판·판·구) 가장자리를 잡음으로 녹여 기술 결처럼
// 피사계 심도(DoF)는 성능 측정 뒤 '높음'에서만 켤 예정 — 지금은 넣지 않음
(function () {
  const X = window.FX3; if (!X || typeof renderer === 'undefined' || typeof scene3 === 'undefined') return;
  const st = window.__fx3c = { bloom: 0, slowT: 0, freezeT: 0, linesT: 0, ultF: null, ms: 0, q: 'mid' };
  const Q = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  const L = 3; // 빛 번짐 층

  // ── 4) 반투명 기본 재질 → 잡음 가장자리(도형 티 지우기) ──
  const NOW = { value: 0 };
  const OrigMB = THREE.MeshBasicMaterial;
  const erode = sh => { sh.uniforms.uNow3 = NOW;
    sh.vertexShader = 'varying vec3 vWp3;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWp3 = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = 'varying vec3 vWp3; uniform float uNow3;\nfloat e3h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat e3n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(e3h(i),e3h(i+vec2(1,0)),f.x),mix(e3h(i+vec2(0,1)),e3h(i+vec2(1,1)),f.x),f.y);}\n' +
      sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity );\n { vec2 q = vWp3.xz * .14 + vWp3.y * .09 + vec2(uNow3 * .7, -uNow3 * .5); float n = e3n(q) * .6 + e3n(q * 2.3) * .4; diffuseColor.a *= smoothstep(.18, .6, n) * 1.35; diffuseColor.rgb *= .85 + n * .35; }'); };
  function MB3(p) { const m = new OrigMB(p); if (p && p.transparent && p.depthWrite === false && p.side === THREE.DoubleSide && !p.map && !p.blending && !p.vertexColors) { m.onBeforeCompile = erode; m.userData.e3 = 1; } return m; }
  MB3.prototype = OrigMB.prototype; THREE.MeshBasicMaterial = MB3;

  // ── 1) 선택 Bloom ──
  const qv = (w, h) => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  let rtA = null, rtB = null, rw = 0, rh = 0;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); const qs = new THREE.Scene(); qs.add(quad); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); quad.frustumCulled = false;
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const blurM = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec4 c = texture2D(tex, vUv) * .2270; c += (texture2D(tex, vUv + dir * 1.3846) + texture2D(tex, vUv - dir * 1.3846)) * .3162; c += (texture2D(tex, vUv + dir * 3.2308) + texture2D(tex, vUv - dir * 3.2308)) * .0703; gl_FragColor = c; }' });
  const addM = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, k: { value: 1 } }, vertexShader: VS, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
    fragmentShader: 'uniform sampler2D tex; uniform float k; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; c = c * c * 1.4 + c * .35; gl_FragColor = vec4(min(c * k, vec3(.9)), 1.); }' });
  const tagged = new WeakSet();
  function tag() { // 기술 이펙트 묶음(에너지 재질·fx3 알갱이·띠·번개)만 빛 번짐 층에 올림 — 새로 생긴 것만 한 번
    const ch = scene3.children; for (let i = 0; i < ch.length; i++) { const o = ch[i]; if (tagged.has(o)) continue; tagged.add(o); processNew(o);
      if (o.name === 'fx3' || o.name === 'fx3m') { o.traverse(x => { if (x.material && x.material.blending === THREE.AdditiveBlending) x.layers.enable(L); }); continue; }
      o.traverse(x => { const m = x.material; if (m && m.uniforms && m.uniforms.uSty && m.blending === THREE.AdditiveBlending) x.layers.enable(L); }); }
    if (typeof F !== 'undefined') F.forEach(f => { const g = f.model && f.model.fxg; if (g && !tagged.has(g)) { tagged.add(g); g.traverse(x => { if (x.material && x.material.uniforms && x.material.uniforms.uSty) x.layers.enable(L); }); } }); }
  let tagAcc = 0, lastEm = 0, lastAct = 0;
  function fxActive() { const t = performance.now(), em = window.__fx3 ? __fx3.emits : 0; if (em !== lastEm) { lastEm = em; lastAct = t; } if (typeof fx !== 'undefined' && fx.length) lastAct = t; if (typeof F !== 'undefined' && F.some(f => f.aura || f.hand)) lastAct = t; return t - lastAct < 600; } // 이펙트가 있을 때만 빛 번짐
  function bloom() { const q = Q(); st.q = q; if (q === 'low') { st.bloom = 0; return; } if (!fxActive() || (q === 'mid' && performance.now() - (st.ultT || 0) > 2500)) { st.bloom = 0; return; } /* 중간: 필살기 때만 빛 번짐 */ const div = q === 'high' ? 3 : 4, cv = renderer.domElement, w = Math.max(64, cv.width / div | 0), h = Math.max(64, cv.height / div | 0);
    if (!rtA || rw !== w || rh !== h) { if (rtA) { rtA.dispose(); rtB.dispose(); } rtA = qv(w, h); rtB = qv(w, h); rw = w; rh = h; }
    const mask = camera.layers.mask, bg = scene3.background, fog = scene3.fog, ac = renderer.autoClear, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    camera.layers.set(L); scene3.background = null; scene3.fog = null; renderer.setClearColor(0x000000, 0); renderer.autoClear = true;
    const sa = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = false;
    const au = scene3.autoUpdate; scene3.autoUpdate = false; /* 행렬은 본 그리기에서 이미 갱신 */ renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(scene3, camera); scene3.autoUpdate = au; renderer.shadowMap.autoUpdate = sa;
    camera.layers.mask = mask; scene3.background = bg; scene3.fog = fog; renderer.setClearColor(cc, ca);
    quad.material = blurM; blurM.uniforms.tex.value = rtA.texture; blurM.uniforms.dir.value.set(1.4 / w, 0); renderer.setRenderTarget(rtB); renderer.render(qs, qc);
    blurM.uniforms.tex.value = rtB.texture; blurM.uniforms.dir.value.set(0, 1.4 / h); renderer.setRenderTarget(rtA); renderer.render(qs, qc);
    renderer.setRenderTarget(null); renderer.autoClear = false; quad.material = addM; addM.uniforms.tex.value = rtA.texture; addM.uniforms.k.value = (q === 'high' ? .7 : .55) * (st.slowT > 0 ? 1.3 : 1) * (1 - .7 * (X.DAY ? X.DAY.value : 0)); renderer.render(qs, qc); renderer.autoClear = ac; st.bloom = div; }
  const _render = renderer.render.bind(renderer); let inside = false;
  renderer.render = function (sc, cam) {
    const main = !inside && sc === scene3 && cam === camera && renderer.getRenderTarget() === null;
    if (main) { try { if (window.__fx3m && __fx3m.fitHands) __fx3m.fitHands(); } catch (e) { console.error(e); } }
    _render(sc, cam);
    if (main) { const t0 = performance.now(); inside = true; try { if ((tagAcc++ % 3) === 0) tag(); if (!(typeof ftAvg !== 'undefined' && ftAvg > 19)) bloom(); else st.bloom = 0; } catch (e) { console.error(e); st.bloom = -1; } inside = false; st.ms = st.ms * .95 + (performance.now() - t0) * .05; }
  };

  // ── 5) 방사 왜곡(원피스·원펀맨 충격): fx2 아지랑이 패스(화면 복사본) 재사용, 품질 중간 이상, 0.15초 / mode 1: 룸 안쪽 일렁임 ──
  const DVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  const DFS = 'uniform sampler2D tScreen; uniform vec2 uRes; uniform float uT, uAmp, uK, uMode; varying vec2 vUv; void main(){ vec2 c = vUv - .5; float r = length(c) * 2.; if (r > 1.) discard; vec2 s = gl_FragCoord.xy / uRes; vec2 dir = r > .001 ? c / (r * .5) : vec2(0.); float m; vec2 off;' +
    ' if (uMode < .5) { float R = .15 + uK * .8, ring = exp(-pow((r - R) / .12, 2.)); off = -dir * ring * .022 * uAmp * (1. - uK * .6); m = clamp(ring * 1.6, 0., 1.); }' +
    ' else { float w = sin(r * 18. - uT * 5.) * .5 + sin(atan(c.y, c.x) * 6. + uT * 2.) * .5; off = dir * w * .006 * uAmp * smoothstep(1., .55, r); m = smoothstep(1., .7, r); }' +
    ' gl_FragColor = vec4(texture2D(tScreen, s + off).rgb, m); }';
  const myHz = [];
  function distort(p, r, life, mode = 0) { const S = window.__fx2; if (!S || !S.hazeScene || S.hazeOff || Q() === 'low' || S.hazes.length >= 4) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ uniforms: { tScreen: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uAmp: { value: 1 }, uK: { value: 0 }, uMode: { value: mode } }, vertexShader: DVS, fragmentShader: DFS, transparent: true, depthWrite: false, depthTest: false }));
    m.position.copy(p); S.hazeScene.add(m); const h = { m, p: p.clone(), r, life, max: life }; S.hazes.push(h); myHz.push(h); st.distorts = (st.distorts || 0) + 1; }
  X.distort = distort;
  // ── 6) 로의 룸: 바닥 원에서 부풀며 펼쳐지는 반투명 푸른 막(일렁이는 결 + 밝은 테두리 + 바닥 띠) + 안쪽 일렁임 ──
  const RMVS = 'varying vec3 vW; varying vec3 vN; varying vec3 vV; varying vec3 vC; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vC = modelMatrix[3].xyz; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const RMFS = 'uniform vec3 uC; uniform float uOp; uniform float uT; varying vec3 vW; varying vec3 vN; varying vec3 vV; varying vec3 vC;' +
    ' float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}' +
    ' void main(){ if (vW.y < 0.) discard; float face = abs(dot(normalize(vN), normalize(vV))), rim = pow(1. - face, 2.6); vec3 d = normalize(vW - vC); float lat = asin(clamp(d.y, -1., 1.)), lon = atan(d.z, d.x);' +
    ' float n = vn(vec2(lon * 5., lat * 7. - uT * .9)); float bands = pow(abs(sin(lat * 22. - uT * 2.2 + n * 2.)), 18.) * .45 + pow(abs(sin(lon * 16. + uT * 1.1)), 26.) * .25;' +
    ' float ground = smoothstep(5., 0., vW.y); vec3 col = mix(uC, vec3(.92, .97, 1.), rim * .55 + ground * .5); float a = .035 + rim * .7 + bands * (.3 + .6 * n) + ground * .9; gl_FragColor = vec4(col, clamp(a * uOp, 0., 1.)); }';
  const roomGeo = new THREE.SphereGeometry(1, 40, 28); roomGeo.userData.shared = true;
  function roomMat() { const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#8ab8ff') }, uOp: { value: .9 }, uT: FXT }, vertexShader: RMVS, fragmentShader: RMFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    Object.defineProperty(m, 'opacity', { get() { return this.uniforms.uOp.value; }, set(v) { this.uniforms.uOp.value = v; }, configurable: true }); return m; }
  // ── 7) 타츠마키 염동: 들린 바위는 초록 빛에 싸여 떠다님(큰 초록 구 대신 얇은 빛 + 감도는 결) ──
  const psyRocks = [];
  const HI = new Map(); st.hires = 0;
  function hiGeo(g) { const p = g.parameters; if (!p) return null; let key, mk;
    if (g.type === 'SphereGeometry' && p.widthSegments < 32) { key = 'S' + [p.radius, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength].join(); mk = () => new THREE.SphereGeometry(p.radius, 40, 28, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength); }
    else if (g.type === 'TorusGeometry' && p.tubularSegments < 64) { key = 'T' + [p.radius, p.tube, p.arc].join(); mk = () => new THREE.TorusGeometry(p.radius, p.tube, Math.max(8, p.radialSegments), 96, p.arc); }
    else if (g.type === 'CylinderGeometry' && p.radialSegments < 32) { key = 'C' + [p.radiusTop, p.radiusBottom, p.height, p.openEnded, p.thetaStart, p.thetaLength].join(); mk = () => new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, 40, Math.max(4, p.heightSegments), p.openEnded, p.thetaStart, p.thetaLength); }
    else if (g.type === 'ConeGeometry' && p.radialSegments < 24) { key = 'K' + [p.radius, p.height, p.openEnded].join(); mk = () => new THREE.ConeGeometry(p.radius, p.height, 32, 4, p.openEnded); }
    else if (g.type === 'RingGeometry' && p.thetaSegments < 64) { key = 'R' + [p.innerRadius, p.outerRadius, p.thetaStart, p.thetaLength].join(); mk = () => new THREE.RingGeometry(p.innerRadius, p.outerRadius, 96, 2, p.thetaStart, p.thetaLength); }
    else if (g.type === 'CircleGeometry' && p.segments < 64) { key = 'O' + [p.radius, p.thetaStart, p.thetaLength].join(); mk = () => new THREE.CircleGeometry(p.radius, 96, p.thetaStart, p.thetaLength); }
    else return null;
    let h = HI.get(key); if (!h) { if (HI.size > 160) return null; h = mk(); h.userData.shared = true; HI.set(key, h); } return h; }
  function hires(o) { if (Q() === 'low') return; o.traverse(x => { const m = x.material; if (!x.isMesh || !m || !m.uniforms || !m.uniforms.uSty) return; const h = hiGeo(x.geometry); if (h && h !== x.geometry) { const old = x.geometry; x.geometry = h; if (!old.userData.shared) old.dispose(); st.hires++; } }); }
  function processNew(o) { try { hires(o);
      const c0 = o.children && o.children[0];
      if (o.isGroup && c0 && c0.isMesh && c0.geometry && c0.geometry.parameters && c0.geometry.parameters.widthSegments === 14 && c0.material && c0.material.uniforms && c0.material.uniforms.uC && c0.material.uniforms.uC.value.getHexString() === '9ac8ff' && o.children[1] && o.children[1].material && o.children[1].material.map === ringTex) {
        const old = c0.material; c0.geometry = roomGeo; c0.material = roomMat(); old.dispose(); st.rooms = (st.rooms || 0) + 1;
        setTimeout(() => { if (o.parent) { const p = o.position.clone(), r = c0.scale.x; distort(p.clone().add(V3(0, r * .35, 0)), r * .9, 2.6, 1); } }, 250); return; }
      if (o.isMesh && o.geometry && o.geometry.type === 'DodecahedronGeometry' && o.children.some(x => x.isSprite && x.material && x.material.color && x.material.color.getHexString() === '60ff9a')) {
        o.children.forEach(x => { if (x.isSprite) { x.scale.multiplyScalar(.42); x.material.opacity *= .55; } }); psyRocks.push(o); st.psyRocks = (st.psyRocks || 0) + 1; }
    } catch (e) { console.error(e); } }
  const _rp = new THREE.Vector3();
  function psyTick() { for (let i = psyRocks.length - 1; i >= 0; i--) { const o = psyRocks[i]; if (!o.parent) { psyRocks.splice(i, 1); continue; } if (!o.visible || Math.random() > X.busy() * .8) continue; o.getWorldPosition(_rp); const s = (o.scale.x || 4) * 1.1, a = Math.random() * 6.283;
      X.emit(_rp.clone().add(V3(Math.cos(a) * s, (Math.random() - .5) * s, Math.sin(a) * s)), V3(-Math.sin(a) * 18, 12, Math.cos(a) * 18), .5, 3.5, 1, '#40ff80', -10);
      if (Math.random() < .4) X.streak(_rp.clone().add(V3(Math.cos(a) * s, 0, Math.sin(a) * s)), V3(-Math.sin(a) * 90, 20, Math.cos(a) * 90), .2, .06, 1.6, '#a0ffc8'); } }

  // ── 2) 필살기: 정지 → 느린 화면 ──
  const _co = callout; callout = function (f, text, ult) { const r = _co.apply(this, arguments); if (ult && f) { st.freezeT = .1; st.slowT = .75; st.linesT = .9; st.ultF = f; st.ultT = performance.now(); } return r; };
  const _res = resolve; resolve = function (a, b, ek, o, nm, pw = 1) { const r = _res.apply(this, arguments); try { if ((o === 'hit' || o === 'sub') && pw >= 2.2) { st.freezeT = Math.max(st.freezeT, .07); st.linesT = Math.max(st.linesT, .35); }
      if ((o === 'hit' || o === 'sub') && b && b.pos && a && a.ch && (a.ch.world === 'onepiece' || a.ch.world === 'opm') && pw >= 1.2) distort(chest(b), 26 + pw * 10, .15, 0); } catch (e) { } return r; };
  const _up = update; update = function (dt, t) { NOW.value = performance.now() / 1000 % 1000;
    if (st.freezeT > 0) { st.freezeT -= dt; dt *= .04; } else if (st.slowT > 0) { st.slowT -= dt; dt *= .38; if (st.slowT <= 0) st.ultF = null; }
    if (st.linesT > 0) st.linesT -= Math.min(dt * 3, .05);
    try { for (let i = myHz.length - 1; i >= 0; i--) { const h = myHz[i]; if (h.life <= 0) { myHz.splice(i, 1); continue; } h.m.material.uniforms.uK.value = 1 - h.life / h.max; } psyTick(); } catch (e) { console.error(e); }
    return _up(dt, t); };

  // ── 3) 속도선(필살기·큰 타격·초고속 돌진) — 2D 화면 위, 가볍게 ──
  const _hud = drawHud; drawHud = function (q, extra) { const r = _hud.apply(this, arguments);
    try { let k = Math.max(0, Math.min(1, st.linesT / .5)); if (typeof F !== 'undefined') F.forEach(f => { const v = f.vel ? Math.hypot(f.vel.x, f.vel.z) : 0; if (v > 380) k = Math.max(k, Math.min(.45, (v - 380) / 500)); });
      if (k > .02 && Q() !== 'low') { const W = (window.HUD && HUD.LW) || hud.width, H = (window.HUD && HUD.LH) || hud.height, cx = W / 2, cy = H / 2, n = Q() === 'high' ? ((window.AAA && AAA.ultra) ? 110 : 46) : 30; hc.save(); hc.globalCompositeOperation = 'lighter';
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r0 = Math.max(W, H) * (.36 + Math.random() * .12), r1 = r0 + Math.max(W, H) * (.25 + Math.random() * .3), w = 1 + Math.random() * 2.5;
          hc.strokeStyle = `rgba(255,255,255,${(.12 + Math.random() * .22) * k})`; hc.lineWidth = w; hc.beginPath(); hc.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .62); hc.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * .62); hc.stroke(); }
        hc.restore(); } } catch (e) { console.error(e); } return r; };
})();
