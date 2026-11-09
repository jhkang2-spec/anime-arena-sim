// 트리플A식 화면 마감(aaa.js) — 소유자 요청(11-05): "실감나고 실사와 유사하게", "사양 한도를 스스로 정하지 말고 고사양 트리플A급으로".
// 기존 파일은 고치지 않고 renderer.render 를 한 번 더 감싸 '그린 뒤' 화면 마감 패스와 장면 소품(풀·먼지)을 더한다.
// 기법 출처(모두 코드로 직접 구현, 외부 스크립트·자산 없음):
//  · 깊이 기반 주변 가림(SSAO: Crytek/three SSAOPass 원리) · 접촉 그림자(깊이 버퍼 해 방향 짧은 광선 추적)
//  · 평면 반사(three Reflector 원리, MIT)로 젖은 바닥 반사 — 화면 공간 반사(SSR)의 바닥 한정 근사
//  · 화면 공간 빛줄기(GPU Gems 3 13장) · 대기 원근 · 움직이는 높은 구름(fbm) · 미(Mie) 산란 해무리
//  · 다단 블룸(UnrealBloomPass 방식 5단 다운/업샘플) · 렌즈 더트·고스트 플레어(절차 생성)
//  · 필름 톤(ACES 근사)·컬러 그레이딩·자동 노출 · FXAA 원리 + CAS 선명화 · 시간 누적 안티에일리어싱(TAA: 지터+재투영+이웃 클램프)
//  · 카메라 모션 블러(이전 장면 행렬 재투영 속도) · 보케 피사계 심도(상시 은은하게, 필살기 강하게)
//  · 비네트·필름 그레인·가장자리 색수차 · PCF 소프트 그림자(울트라 4096) · 바람 풀(인스턴싱)·햇빛 먼지
// 품질: 낮음 = 색 보정·선명화·비네트 / 중간 = + 빛줄기·주변 가림·안개 / 높음 = + 1/2 깊이·필살 피사계 심도
//       울트라(PC 기본) = 전해상도 깊이·16표본 주변 가림·접촉 그림자·젖은 바닥 반사·다단 블룸·렌즈·TAA·모션 블러·보케 상시·구름·풀/먼지 2~3배·DPR 2
// 휴대폰(터치·모바일 UA)은 울트라를 자동으로 쓰지 않음. 끄기: localStorage.setItem('arenaAAA','0') / 울트라만 끄기: setQuality('high')
(function () {
  if (typeof THREE === 'undefined' || typeof renderer === 'undefined' || typeof scene3 === 'undefined' || typeof camera === 'undefined') return;
  let OFF = false; try { OFF = localStorage.getItem('arenaAAA') === '0'; } catch (e) { }
  if (OFF) return;
  const AAA = window.AAA = { ms: 0, depthMs: 0, reflMs: 0, exposure: 1, frames: 0, on: true, dofUntil: 0, ultra: false, freeze: false };
  const isMobile = (() => { try { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } })();
  AAA.mobile = isMobile;
  const baseQ = () => (typeof window.getQuality === 'function' ? window.getQuality() : 'mid');
  const QL = () => (AAA.ultra ? 'ultra' : baseQ());
  const isDay = () => { try { return (localStorage.getItem('arenaWorld') || 'cliff') !== 'train'; } catch (e) { return true; } };

  // ── 0) 울트라 품질: 기존 setQuality(낮음·중간·높음)는 그대로 두고 'ultra' 를 덧붙임(다른 파일엔 '높음'으로 보임) ──
  /* GPU 실체 탐지(11-09, 주인 주문: 구동 자원를 이 PC 사양에 맞춤): 저·중급 GPU는 기본을 '높음'으로 — 1440p 울트라는 GTX 10시리즈에서 37fps까지 떨어짐. 수동 선택은 언제든 가능 */
  AAA.gpu = (() => { try { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); return String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)).toLowerCase(); } catch (e) { return ''; } })().slice(0, 90);
  AAA.gpuTier = /gtx 1050|gtx 9|gtx 7|uhd |iris|vega 3|mx[12]|intel hd|basic render|swiftshader/.test(AAA.gpu) ? 'low'
    : /gtx 10[67]0(?! ti)|gtx 1650|rx 5[5-9]0|rx 54|arc a3/.test(AAA.gpu) ? 'mid' : 'high';
  let wantUltra = !isMobile && AAA.gpuTier === 'high'; try { const s = localStorage.getItem('arenaUltra'); if (s === '0') wantUltra = false; else if (s === '1') wantUltra = true; } catch (e) { }
  /* 판 번호 이전(11-09 GPU 티어): 새 판에서는 GPU 등급에 맞게 기본값을 다시 고름. 이후 사용자가 고른 값은 그대로 존중 */
  const RENDER_V = '3'; try { if (localStorage.getItem('arenaRenderV') !== RENDER_V) { localStorage.setItem('arenaRenderV', RENDER_V); if (!isMobile) { wantUltra = AAA.gpuTier === 'high'; localStorage.setItem('arenaUltra', wantUltra ? '1' : '0'); } } } catch (e) { }
  AAA.ss = 1.6; AAA.ssMin = 1.2; AAA.ssMax = 1.6; AAA.ssBudget = 7.2e6; /* 울트라 슈퍼샘플(11-09 낮춤: 인물·배경 픽셀 비용 절감, 이펙트 후처리는 그대로). 장면만 ss 배 판에 그려 1배로 줄임 */
  if (typeof window.setQuality === 'function') {
    const _sq = window.setQuality;
    window.setQuality = function (q) { if (q === 'ultra') { AAA.ultra = true; try { localStorage.setItem('arenaUltra', '1'); } catch (e) { } applyShadow(); _sq.call(this, 'high'); return 'ultra'; }
      AAA.ultra = false; try { localStorage.setItem('arenaUltra', '0'); } catch (e) { } const r = _sq.apply(this, arguments); applyShadow(); return r; };
    window.getQualityLevel = QL;
    if (wantUltra) { AAA.ultra = true; try { _sq('high'); } catch (e) { } }
  }
  try { if (AAA.ultra && typeof fitRes === 'function') setTimeout(fitRes, 0); } catch (e) { }
  function applyShadow() { try { renderer.shadowMap.type = THREE.PCFSoftShadowMap; const sl = scene3.children.find(o => o.isDirectionalLight && o.castShadow) || scene3.children.find(o => o.isDirectionalLight); if (sl && sl.shadow) { const roomy = typeof ftAvg !== 'undefined' && ftAvg < 13; const s = AAA.ultra ? (roomy ? 4096 : 2048) : baseQ() === 'high' ? 2048 : 1024; /* 그림자 계단: env.js 부하 조절이 1024 로 내리던 것을 울트라는 2048 하한으로 다시 올림 */ if (sl.shadow.mapSize.x !== s) { sl.shadow.mapSize.set(s, s); if (sl.shadow.map) { sl.shadow.map.dispose(); sl.shadow.map = null; } } sl.shadow.radius = AAA.ultra ? 5 : 3; sl.shadow.bias = -.0006; sl.shadow.normalBias = .4; } } catch (e) { } }
  applyShadow();

  const _render = renderer.render.bind(renderer);

  // ── 1) 깊이 패스: 뼈대 인물까지 그리도록 skinning 켠 깊이 재질 ──
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, skinning: true }); depthMat.blending = THREE.NoBlending;
  let dRT = null, dW = 0, dH = 0, dFrame = 0, haveDepth = false;
  function withScene(fn) { const om = scene3.overrideMaterial, bg = scene3.background, fog = scene3.fog, au = scene3.autoUpdate, sa = renderer.shadowMap.autoUpdate, cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    scene3.autoUpdate = false; renderer.shadowMap.autoUpdate = false; try { fn(); } finally { renderer.setRenderTarget(null); renderer.setClearColor(cc, ca); scene3.overrideMaterial = om; scene3.background = bg; scene3.fog = fog; scene3.autoUpdate = au; renderer.shadowMap.autoUpdate = sa; renderer.clippingPlanes = []; } }
  function depthPass(fw, fh, div) {
    const w = Math.max(64, (fw / div) | 0), h = Math.max(64, (fh / div) | 0);
    if (!dRT || dW !== w || dH !== h) { if (dRT) dRT.dispose(); dRT = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); dW = w; dH = h; }
    const t0 = performance.now();
    const gv = props.grass && props.grass.visible, dv = props.dust && props.dust.visible; if (props.grass) props.grass.visible = false; if (props.dust) props.dust.visible = false; /* 풀은 잎 모양을 셰이더에서 잘라 내므로 깊이 재질로 그리면 네모판이 됨 → 깊이에서 뺌 */
    withScene(() => { scene3.overrideMaterial = depthMat; scene3.background = null; scene3.fog = null; renderer.setClearColor(0xffffff, 1); renderer.setRenderTarget(dRT); renderer.clear(); _render(scene3, camera); });
    if (props.grass) props.grass.visible = gv; if (props.dust) props.dust.visible = dv;
    AAA.depthMs = AAA.depthMs * .9 + (performance.now() - t0) * .1; haveDepth = true;
  }

  // ── 2) 젖은 바닥 반사(울트라): 거울 카메라로 바닥 위 장면을 반 해상도로 그림 ──
  let rRT = null, rW = 0, rH = 0; const mCam = new THREE.PerspectiveCamera(); const clipUp = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.3);
  const mVP = new THREE.Matrix4(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
  function reflPass(fw, fh) {
    const w = Math.max(64, (fw / 2) | 0), h = Math.max(64, (fh / 2) | 0);
    if (!rRT || rW !== w || rH !== h) { if (rRT) rRT.dispose(); rRT = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); rW = w; rH = h; }
    const t0 = performance.now();
    mCam.copy(camera); mCam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    camera.getWorldDirection(_t); _p.copy(camera.position).addScaledVector(_t, 100); _p.y = -_p.y; mCam.up.set(0, -1, 0); mCam.lookAt(_p); mCam.updateMatrixWorld(); mCam.projectionMatrix.copy(camera.projectionMatrix);
    mVP.multiplyMatrices(mCam.projectionMatrix, mCam.matrixWorldInverse);
    withScene(() => { renderer.clippingPlanes = [clipUp]; renderer.setRenderTarget(rRT); renderer.clear(); _render(scene3, mCam); });
    AAA.reflMs = AAA.reflMs * .9 + (performance.now() - t0) * .1;
  }

  // ── 3) 다단 블룸(울트라): 밝은 곳만 걸러 5단 다운샘플 → 업샘플 누적 ──
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  const quadGeo = new THREE.PlaneGeometry(2, 2); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function pass(fs, uni) { const m = new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false }); const me = new THREE.Mesh(quadGeo, m); me.frustumCulled = false; const s = new THREE.Scene(); s.add(me); return { m, s, run(rt) { renderer.setRenderTarget(rt || null); _render(s, qc); } }; }
  const bThr = pass('uniform sampler2D t; uniform vec2 px; uniform float thr; varying vec2 vUv; void main(){ vec3 c = .25 * (texture2D(t, vUv + px * vec2(-.5,-.5)).rgb + texture2D(t, vUv + px * vec2(.5,-.5)).rgb + texture2D(t, vUv + px * vec2(-.5,.5)).rgb + texture2D(t, vUv + px * vec2(.5,.5)).rgb); float l = max(c.r, max(c.g, c.b)); float k = clamp((l - thr) / (1. - thr + 1e-3), 0., 1.); gl_FragColor = vec4(c * k * k, 1.); }', { t: { value: null }, px: { value: new THREE.Vector2() }, thr: { value: .9 } });
  const bDown = pass('uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv).rgb * .25; c += (texture2D(t, vUv + px * vec2(-1.,-1.)).rgb + texture2D(t, vUv + px * vec2(1.,-1.)).rgb + texture2D(t, vUv + px * vec2(-1.,1.)).rgb + texture2D(t, vUv + px * vec2(1.,1.)).rgb) * .1875; gl_FragColor = vec4(c, 1.); }', { t: { value: null }, px: { value: new THREE.Vector2() } });
  const bUp = pass('uniform sampler2D t; uniform sampler2D lo; uniform vec2 px; uniform float k; varying vec2 vUv; void main(){ vec3 u = vec3(0.); for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) u += texture2D(lo, vUv + px * vec2(float(i), float(j))).rgb * ((i == 0 && j == 0) ? .25 : (i == 0 || j == 0) ? .125 : .0625); gl_FragColor = vec4(texture2D(t, vUv).rgb + u * k, 1.); }', { t: { value: null }, lo: { value: null }, px: { value: new THREE.Vector2() }, k: { value: 1 } });
  const bl = []; let blW = 0, blH = 0;
  function bloomPass(tex, fw, fh) {
    const w0 = Math.max(32, fw >> 1), h0 = Math.max(32, fh >> 1);
    if (blW !== w0 || blH !== h0) { bl.forEach(r => { r.a.dispose(); r.b.dispose(); }); bl.length = 0; blW = w0; blH = h0; let w = w0, h = h0; for (let i = 0; i < 5; i++) { const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }; bl.push({ a: new THREE.WebGLRenderTarget(w, h, o), b: new THREE.WebGLRenderTarget(w, h, o), w, h }); w = Math.max(8, w >> 1); h = Math.max(8, h >> 1); } }
    bThr.m.uniforms.t.value = tex; bThr.m.uniforms.px.value.set(1 / fw, 1 / fh); bThr.run(bl[0].a);
    for (let i = 1; i < 5; i++) { bDown.m.uniforms.t.value = bl[i - 1].a.texture; bDown.m.uniforms.px.value.set(1 / bl[i - 1].w, 1 / bl[i - 1].h); bDown.run(bl[i].a); }
    let lo = bl[4].a.texture; for (let i = 3; i >= 0; i--) { bUp.m.uniforms.t.value = bl[i].a.texture; bUp.m.uniforms.lo.value = lo; bUp.m.uniforms.px.value.set(1 / bl[i + 1].w, 1 / bl[i + 1].h); bUp.m.uniforms.k.value = .9; bUp.run(bl[i].b); lo = bl[i].b.texture; }
    return lo;
  }
  // 렌즈 더트(절차 생성 캔버스)
  const dirt = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 288; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 512, 288);
    for (let i = 0; i < 90; i++) { const r = 4 + Math.random() * 26, px = Math.random() * 512, py = Math.random() * 288, g = x.createRadialGradient(px, py, 0, px, py, r); const a = .05 + Math.random() * .16; g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(.7, 'rgba(255,255,255,' + a * .5 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.29); x.fill(); }
    for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 6 + Math.random() * 10; x.beginPath(); x.moveTo(Math.random() * 512, Math.random() * 288); x.bezierCurveTo(Math.random() * 512, Math.random() * 288, Math.random() * 512, Math.random() * 288, Math.random() * 512, Math.random() * 288); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t; })();

  // ── 4) 화면 마감 셰이더 ──
  const FS = [
    '#include <packing>',
    'uniform sampler2D tCol, tDep, tRefl, tBloom, tDirt, tHist;',
    'uniform vec2 uRes, uDRes, uSun, uJit;',
    'uniform float uDepRaw; uniform float uT, uExp, uUseDep, uRays, uRayN, uAO, uAON, uFog, uDof, uDofBase, uFocus, uNear, uFar, uDay, uGrain, uCA, uAA, uKnee, uUltra, uRefl, uBloomK, uDirtK, uFlare, uTAA, uMB, uContact, uClouds;',
    'uniform vec3 uSunCol, uFogCol, uSunV, uCamPos, uNUp; uniform mat4 uInvProj, uCamW, uPrevVP, uMirVP, uProj;',
    'varying vec2 vUv;',
    'float lum(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }',
    'float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++){ s += a * noise(p); p *= 2.03; a *= .5; } return s; }',
    'float dz(vec2 uv){ return uDepRaw > .5 ? texture2D(tDep, uv).x : unpackRGBAToDepth(texture2D(tDep, uv)); }',
    'float vz(vec2 uv){ return -perspectiveDepthToViewZ(dz(uv), uNear, uFar); }',
    'vec3 viewPos(vec2 uv, float d){ vec4 p = uInvProj * vec4(uv * 2. - 1., d * 2. - 1., 1.); return p.xyz / p.w; }',
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }',
    'void main(){',
    '  vec2 px = 1. / uRes; vec2 c = vUv - .5; vec2 uv = vUv;',
    '  float d0 = uUseDep > .5 ? dz(uv) : 1.; float z = uUseDep > .5 ? -perspectiveDepthToViewZ(d0, uNear, uFar) : uFar; float sky = step(.9999, d0);',
    '  vec3 wp = vec3(0.); vec2 vel = vec2(0.);',
    '  if (uUseDep > .5) { wp = (uCamW * vec4(viewPos(uv, d0), 1.)).xyz; vec4 pp = uPrevVP * vec4(wp, 1.); vec2 puv = pp.xy / pp.w * .5 + .5; vel = uv - puv; }',
    /* 카메라 모션 블러(울트라): 이전 장면 행렬로 되짚은 속도 방향으로 8표본 */
    '  vec2 mb = clamp(vel, -.01, .01) * uMB * smoothstep(.004, .012, length(vel)); /* 빠른 카메라 이동 때만 약하게 */',
    '  vec2 ca = c * uCA * dot(c,c) * 2.;',
    '  vec3 col = vec3(texture2D(tCol, uv + ca).r, texture2D(tCol, uv).g, texture2D(tCol, uv - ca).b);',
    '  if (length(mb) > .0008) { vec3 a = col; for (int i = 1; i < 8; i++) a += texture2D(tCol, uv - mb * (float(i) / 7. - .5)).rgb; col = a / 8.; }',
    '  vec3 n = texture2D(tCol, uv + vec2(0., px.y)).rgb, s = texture2D(tCol, uv - vec2(0., px.y)).rgb, e = texture2D(tCol, uv + vec2(px.x, 0.)).rgb, w = texture2D(tCol, uv - vec2(px.x, 0.)).rgb;',
    '  if (uAA > .5) { float lc = lum(col), ln = lum(n), ls2 = lum(s), le = lum(e), lw = lum(w); float lmin = min(lc, min(min(ln,ls2), min(le,lw))), lmax = max(lc, max(max(ln,ls2), max(le,lw))); if (lmax - lmin > max(.06, lmax * .14)) { vec2 dir = normalize(vec2(-(ln - ls2), lw - le) + 1e-4) * px * 1.2; vec3 a = .5 * (texture2D(tCol, uv + dir * .33).rgb + texture2D(tCol, uv - dir * .33).rgb); vec3 b = a * .5 + .25 * (texture2D(tCol, uv + dir).rgb + texture2D(tCol, uv - dir).rgb); float lb = lum(b); col = (lb < lmin || lb > lmax) ? a : b; } }',
    '  vec3 mn = min(col, min(min(n,s), min(e,w))), mx = max(col, max(max(n,s), max(e,w)));',
    '  vec3 amp = sqrt(clamp(min(mn, 1. - mx) / max(mx, 1e-3), 0., 1.)); vec3 wv = amp * (-.125 * mix(.5, .32, uUltra)); /* 선명화가 가장자리를 다시 날카롭게 해 계단을 키움 → 울트라(슈퍼샘플+SMAA)는 약하게 */ col = clamp((col + (n+s+e+w) * wv) / (1. + 4. * wv), 0., 1.);',
    '  if (uUseDep > .5) {',
    /* 보케 피사계 심도: 상시 은은하게(울트라) + 필살기 강하게 */
    '    float dofk = max(uDof, uDofBase); if (dofk > .01) { float coc = clamp(abs(z - uFocus) / max(uFocus, 1.) - (uDof > .01 ? .15 : .35), 0., 1.) * dofk; if (coc > .01) { vec3 acc = col; float wsum = 1.; float r = coc * (uUltra > .5 ? 9. : 6.); for (int i = 0; i < 16; i++){ if (uUltra < .5 && i >= 8) break; float a = float(i) * 2.39996; vec2 o = vec2(cos(a), sin(a)) * r * px * sqrt(float(i) + 1.); vec3 sc = texture2D(tCol, uv + o).rgb; float bw = 1. + lum(sc) * 2.; acc += sc * bw; wsum += bw; } col = acc / wsum; } }',
    /* 주변 가림 */
    '    if (uAO > .01 && sky < .5) { float occ = 0.; float rad = clamp(260. / max(z, 1.), 1.5, 16.); for (int i = 0; i < 16; i++){ if (float(i) >= uAON) break; float a = float(i) * 2.39996 + hash(uv * uRes) * 6.28; float rr = rad * (.3 + float(i) / uAON * .8); vec2 o = vec2(cos(a), sin(a)) * rr / uDRes; float dd = z - vz(uv + o); occ += smoothstep(.4, 3.5, dd) * (1. - smoothstep(10., 26., dd)); } occ /= uAON; col *= 1. - occ * uAO; }',
    /* 접촉 그림자(울트라): 해 방향으로 짧게 깊이 비교 */
    '    if (uContact > .01 && sky < .5 && z < 170.) { vec3 vp = viewPos(uv, d0); float sh = 0.; float stp = .35 + z * .004, bias = .25 + z * .012, jt = hash(uv * uRes + uT) ; for (int i = 1; i <= 10; i++){ vec3 q = vp + uSunV * (float(i) - jt) * stp; vec4 cl = uProj * vec4(q, 1.); vec2 quv = cl.xy / cl.w * .5 + .5; if (quv.x < 0. || quv.x > 1. || quv.y < 0. || quv.y > 1.) break; float sz = vz(quv); float qz = -q.z; float dd = qz - sz; if (dd > bias && dd < 3. + z * .01) { sh = 1. - float(i) / 11.; break; } } col *= 1. - sh * uContact * (1. - smoothstep(110., 170., z)); } /* 접촉 그림자 계단 수정(11-05): 먼 절벽에서 자기 면을 가리던 큰 계단 무늬 → 가까운 곳만·거리 비례 바이어스·표본 떨림 */',
    /* 젖은 바닥 반사(울트라) */
    '    if (uRefl > .01 && sky < .5 && wp.y < 1.2 && length(wp.xz) < 700.) { float wet = smoothstep(.52, .72, fbm(wp.xz * .018)) * .9 + .1; vec3 vp = viewPos(uv, d0); vec3 vdv = normalize(vp); vec3 nv = normalize(uNUp); vec3 rd = reflect(vdv, nv); float fr = .04 + .96 * pow(1. - max(0., dot(-vdv, nv)), 5.); vec3 rp = vp + nv * .3; float stepL = max(1.5, -vp.z * .02); vec3 hitC = vec3(0.); float hit = 0.; for (int i = 0; i < 24; i++){ rp += rd * stepL; stepL *= 1.12; vec4 cl = uProj * vec4(rp, 1.); vec2 ruv = cl.xy / cl.w * .5 + .5; if (ruv.x < 0. || ruv.x > 1. || ruv.y < 0. || ruv.y > 1. || rp.z > -uNear) break; float sz = vz(ruv); float rz = -rp.z; if (rz > sz && rz - sz < stepL * 2.5) { hitC = texture2D(tCol, ruv).rgb; hit = (1. - smoothstep(.75, 1., max(abs(ruv.x - .5), abs(ruv.y - .5)) * 2.)); break; } } col = mix(col, hitC, clamp(fr * wet * uRefl * hit, 0., .55)); }',
    /* 대기 원근 */
    '    if (uFog > .01 && sky < .5) { float f = 1. - exp(-max(z - 260., 0.) * .00045 * uFog); float sunw = pow(max(0., 1. - length(uv - uSun) * 1.4), 2.); vec3 fc = mix(uFogCol, uSunCol, sunw * .55 * uDay); col = mix(col, fc, f * .3); }',
    /* 움직이는 높은 구름 + 해무리(하늘만, 울트라) */
    '    if (uClouds > .01 && sky > .5) { vec3 vd = normalize((uCamW * vec4(viewPos(uv, .99), 0.)).xyz); if (vd.y > .01) { vec2 cp = vd.xz / vd.y * .6 + vec2(uT * .006, uT * .002); float cl = smoothstep(.45, .8, fbm(cp * 3.)) * smoothstep(.0, .25, vd.y); col = mix(col, mix(vec3(.96,.97,1.), uSunCol, .25), cl * .22 * uClouds); } }',
    '  }',
    /* 빛줄기 */
    '  if (uRays > .01) { vec2 dd = (uv - uSun) / uRayN * .85; vec2 p = uv; float dec = 1.; vec3 acc = vec3(0.); for (int i = 0; i < 40; i++){ if (float(i) >= uRayN) break; p -= dd; vec2 cp = clamp(p, 0., 1.); vec3 sc = texture2D(tCol, cp).rgb; float l = lum(sc); float sk = uUseDep > .5 ? step(.9999, dz(cp)) : smoothstep(.72, .95, l); acc += sc * sk * smoothstep(.55, .95, l) * dec; dec *= .95; } col += acc / uRayN * uSunCol * uRays * 1.6; }',
    /* 다단 블룸 + 렌즈 더트 + 고스트 플레어(울트라) */
    '  if (uBloomK > .01) { vec3 bm = texture2D(tBloom, uv).rgb; col += bm * uBloomK + bm * texture2D(tDirt, uv).rgb * uDirtK; }',
    '  if (uFlare > .01) { vec2 gv = (vec2(.5) - uSun); for (int i = 1; i <= 3; i++){ vec2 gp = uSun + gv * (float(i) * .55); float gd = length((uv - gp) * vec2(uRes.x / uRes.y, 1.)); col += uSunCol * smoothstep(.06 + float(i) * .02, 0., gd) * .05 * uFlare; } float hl = length((uv - uSun) * vec2(uRes.x / uRes.y, 1.)); col += uSunCol * smoothstep(.02, 0., abs(hl - .28)) * .04 * uFlare; }',
    /* 노출 → 소프트 니 → 톤 → 그레이딩 */
    '  col *= uExp;',
    '  float mxc = max(col.r, max(col.g, col.b)); if (mxc > uKnee) { float k = uKnee + (mxc - uKnee) / (1. + (mxc - uKnee) * 2.2); col *= k / mxc; }',
    /* 대비를 지키는 필름 곡선: 밝은 끝은 소프트 니가 누르고, 중간 톤은 약한 S 곡선으로 대비를 살림(ACES 를 그대로 섞으면 낮 장면이 뿌옇게 됨 — 실측 대비 0.20→0.16) */
    '  col = clamp((col - .5) * mix(1.04, 1.1, uUltra) + .5, 0., 1.); col = mix(col, col * col * (3. - 2. * col), .22);',
    '  float L = lum(col); col = mix(vec3(L), col, mix(1.04, 1.1, uDay) + uUltra * .04);',
    '  vec3 shTint = mix(vec3(.96,.98,1.06), vec3(.97,.99,1.07), uDay), hiTint = mix(vec3(1.03,1.,.95), vec3(1.05,1.01,.93), uDay);',
    '  col *= mix(shTint, hiTint, smoothstep(.15, .85, L));',
    '  col = pow(max(col, 0.), vec3(mix(1.0, .97, uDay)));',
    '  float vig = smoothstep(.95, .25, length(c * vec2(1.15, 1.))); col *= mix(.78, 1., vig);',
    /* 시간 누적 안티에일리어싱(울트라): 이전 결과를 재투영해 이웃 범위로 잘라 섞음 */
    '  if (uTAA > .01 && uUseDep > .5) { vec2 huv = uv - vel; if (huv.x > 0. && huv.x < 1. && huv.y > 0. && huv.y < 1.) { vec3 h = texture2D(tHist, huv).rgb; vec3 lo = min(col, min(mn, mx)) - .02, hi = max(col, max(mn, mx)) + .02; h = clamp(h, lo * uExp * .9, hi * uExp * 1.1); float mvk = clamp(length(vel * uRes) * .25, 0., 1.); col = mix(col, h, uTAA * (1. - mvk) * .35); } }',
    '  col += (hash(uv * uRes + uT) - .5) * uGrain;',
    '  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);',
    '}'].join('\n');
  const U = {
    tCol: { value: null }, tDep: { value: null }, tRefl: { value: null }, tBloom: { value: null }, tDirt: { value: dirt }, tHist: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uDRes: { value: new THREE.Vector2(1, 1) }, uSun: { value: new THREE.Vector2(.3, .8) }, uJit: { value: new THREE.Vector2() },
    uDepRaw: { value: 0 }, uT: { value: 0 }, uExp: { value: 1 }, uUseDep: { value: 0 }, uRays: { value: 0 }, uRayN: { value: 16 }, uAO: { value: 0 }, uAON: { value: 8 }, uFog: { value: 0 }, uDof: { value: 0 }, uDofBase: { value: 0 }, uFocus: { value: 200 },
    uNear: { value: 1 }, uFar: { value: 2000 }, uDay: { value: 1 }, uGrain: { value: .03 }, uCA: { value: .004 }, uAA: { value: 1 }, uKnee: { value: .8 }, uUltra: { value: 0 }, uRefl: { value: 0 }, uBloomK: { value: 0 }, uDirtK: { value: 0 },
    uFlare: { value: 0 }, uTAA: { value: 0 }, uMB: { value: 0 }, uContact: { value: 0 }, uClouds: { value: 0 },
    uSunCol: { value: new THREE.Color('#ffe6bf') }, uFogCol: { value: new THREE.Color('#c8d6e2') }, uSunV: { value: new THREE.Vector3(0, 1, 0) },
    uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uNUp: { value: new THREE.Vector3(0, 1, 0) }, uCamW: { value: new THREE.Matrix4() }, uPrevVP: { value: new THREE.Matrix4() }, uMirVP: { value: new THREE.Matrix4() },
  };
  const post_ = pass(FS, U);
  AAA.U = U; AAA.force = {}; /* 시험용: AAA.force.uRefl = 0 처럼 특정 효과만 끄고 비교 */
  let curCol = null, colTex = null, histTex = null, cW = 0, cH = 0; const dbs = new THREE.Vector2(), prevVP = new THREE.Matrix4(); let hasPrev = false;

  // ── 5) 자동 노출 ──
  const lumRT = new THREE.WebGLRenderTarget(16, 9, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  const lumP = pass('uniform sampler2D t; varying vec2 vUv; void main(){ vec3 a = vec3(0.); for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) a += texture2D(t, vUv + (vec2(float(i), float(j)) - 1.5) / vec2(64., 36.)).rgb; gl_FragColor = vec4(a / 16., 1.); }', { t: { value: null } });
  const lumBuf = new Uint8Array(16 * 9 * 4);
  function adaptExposure() { lumP.m.uniforms.t.value = curCol || colTex; lumP.run(lumRT); renderer.readRenderTargetPixels(lumRT, 0, 0, 16, 9, lumBuf); renderer.setRenderTarget(null);
    let s = 0; for (let i = 0; i < lumBuf.length; i += 4) { const l = (lumBuf[i] * .2126 + lumBuf[i + 1] * .7152 + lumBuf[i + 2] * .0722) / 255; s += Math.log(.02 + l); }
    const avg = Math.exp(s / 144) - .02, target = isDay() ? .41 : .28, want = Math.max(.85, Math.min(1.12, target / Math.max(.05, avg))); /* 눈부심 지적(11-05): 노출 상한 1.12 */
    AAA.exposure += (want - AAA.exposure) * .25; AAA.avgLum = avg; }

  const sunL = () => scene3.children.find(o => o.isDirectionalLight);

  // ── 5b) SMAA(마지막 단계): three r128 공식 예제(jsdelivr three@0.128.0 고정)를 받아 마감 결과에 한 번 더 — 높음·울트라 ──
  const SMAA = { st: 0, pass: null, rt: null, w: 0, h: 0 };
  function loadSMAA() { if (SMAA.st) return; SMAA.st = 1; const B = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
    const one = (u) => new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = B + u; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
    (THREE.Pass ? Promise.resolve() : one('postprocessing/Pass.js')).then(() => THREE.SMAAEdgesShader ? 0 : one('shaders/SMAAShader.js')).then(() => THREE.SMAAPass ? 0 : one('postprocessing/SMAAPass.js')).then(() => { SMAA.st = 2; }).catch(() => { SMAA.st = 3; }); }
  function smaaFor(q, fw, fh) {
    if (AAA.noSMAA || (q !== 'ultra' && q !== 'high')) return null; if (!SMAA.st) loadSMAA(); if (SMAA.st !== 2) return null;
    if (!SMAA.pass) { SMAA.pass = new THREE.SMAAPass(fw, fh); SMAA.pass.renderToScreen = true; }
    if (!SMAA.rt || SMAA.w !== fw || SMAA.h !== fh) { if (SMAA.rt) SMAA.rt.dispose(); SMAA.rt = new THREE.WebGLRenderTarget(fw, fh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }); SMAA.pass.setSize(fw, fh); SMAA.w = fw; SMAA.h = fh; }
    AAA.smaa = true; return SMAA; }
  AAA.SMAA = SMAA;

  // ── 5c) 텍스처 이방성 최대·밉맵(새로 생긴 재질도 주기적으로) ──
  const MAXA = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4; const TKEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap'];
  function anisoSweep() { let n = 0; scene3.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach(m => { TKEYS.forEach(k => { const t = m[k]; if (t && t.isTexture && !t.isDataTexture && t.anisotropy < MAXA && t.image) { t.anisotropy = MAXA; t.needsUpdate = true; n++; } }); }); }); AAA.aniso = (AAA.aniso || 0) + n; }

  // ── 5d) 3점 조명(높음·울트라, 낮 절벽): 키(해) + 차가운 보조광 + 뒤쪽 테두리광, 반구광은 그만큼 낮춰 전체 밝기 유지(눈부심 절반 기준) ──
  const RIG = { on: false, fill: null, rim: null };
  function lightRig(q) { const want = (q === 'ultra' || q === 'high') && isDay() && !AAA.noRig; if (want === RIG.on) return; const hemi = scene3.children.find(o => o.isHemisphereLight);
    if (want) { if (!RIG.fill) { RIG.fill = new THREE.DirectionalLight('#cddcff', .2); RIG.fill.position.set(260, 90, 230); RIG.rim = new THREE.DirectionalLight('#ffe2bc', .34); RIG.rim.position.set(140, 160, -320); } scene3.add(RIG.fill); scene3.add(RIG.rim); if (typeof baseTop !== 'undefined' && baseTop && baseTop.add) { baseTop.add(RIG.fill); baseTop.add(RIG.rim); } if (hemi) hemi.intensity *= .85; }
    else { scene3.remove(RIG.fill); scene3.remove(RIG.rim); if (hemi) hemi.intensity /= .85; }
    RIG.on = want; }
  AAA.RIG = RIG;

  // ── 5e) 울트라 슈퍼샘플 배율 자동 조절(여유 있으면 올리고, 버거우면 내림 — 1~2배) ──
  let ssCool = 0;
  function ssTune(q) { if (q !== 'ultra' || AAA.ssLock) return; if (++ssCool < 90) return; ssCool = 0; const ft = typeof ftAvg !== 'undefined' ? ftAvg : 16; let n = AAA.ss;
    const now = performance.now(); if (ft > 31 && n > AAA.ssMin) { n = Math.max(AAA.ssMin, n - .25); AAA.ssDrop = now; } else if (ft < 21 && n < AAA.ssMax && now - (AAA.ssDrop || -1e9) > 45000) n = Math.min(AAA.ssMax, n + .25); /* 4인 교전 30fps(≈33ms) 지킴, 내린 뒤 45초는 다시 안 올림 */
    AAA.ss = n; }
  // 슈퍼샘플 판(WebGL2 다중 샘플 4) → 1배로 줄이는 4점 상자 필터
  let ssRT = null, ssW = 0, ssH = 0, dsRT = null; const ssShadow = { n: 0 };
  const dsP = pass('uniform sampler2D t; uniform vec2 px; varying vec2 vUv; void main(){ vec3 c = texture2D(t, vUv + px * vec2(-.25,-.25)).rgb + texture2D(t, vUv + px * vec2(.25,-.25)).rgb + texture2D(t, vUv + px * vec2(-.25,.25)).rgb + texture2D(t, vUv + px * vec2(.25,.25)).rgb; gl_FragColor = vec4(c * .25, 1.); }', { t: { value: null }, px: { value: new THREE.Vector2() } });
  function ssTarget(fw, fh) { let k = AAA.ss; const cap = Math.sqrt(AAA.ssBudget / Math.max(1, fw * fh)); k = Math.max(1, Math.min(k, cap)); const mx = renderer.capabilities.maxTextureSize || 8192; const w = Math.min(mx, Math.round(fw * k)), h = Math.min(mx, Math.round(fh * k));
    const smp = AAA.ssSamples !== undefined ? AAA.ssSamples : 0; /* 슈퍼샘플 판은 다중 샘플 없이(깊이 텍스처를 달아 깊이 패스 생략 — 그리기 호출·GPU 절감이 다중 샘플 이득보다 큼, 가장자리는 슈퍼샘플+SMAA) */
    if (!ssRT || ssW !== w || ssH !== h || ssRT.userData_smp !== smp) { if (ssRT) ssRT.dispose(); const o = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }; ssRT = smp > 0 && renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(w, h, o) : new THREE.WebGLRenderTarget(w, h, o); if (!(smp > 0) && !AAA.noDepTex) { ssRT.depthTexture = new THREE.DepthTexture(w, h); ssRT.depthTexture.type = THREE.UnsignedIntType; } /* 다중 샘플이 없는 판은 깊이를 텍스처로 받아 후처리가 그대로 씀 → 깊이 패스(장면 다시 그리기·그리기 호출 수백 개) 생략 */ if (smp > 0 && ssRT.samples !== undefined) ssRT.samples = smp; ssRT.userData_smp = smp; ssW = w; ssH = h; }
    if (!dsRT || dsRT.width !== fw || dsRT.height !== fh) { if (dsRT) dsRT.dispose(); dsRT = new THREE.WebGLRenderTarget(fw, fh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }); }
    AAA.ssPx = [w, h]; return ssRT; }
  const _v = new THREE.Vector3(), _sv = new THREE.Vector3();
  function post(ssTex, ssDep) {
    const t0 = performance.now(), q = QL(), ultra = q === 'ultra';
    /* 로드 기반 마감 강도 조절(11-09): 여유 있을 땐 최고 품질 유지, 프레임 무너지면 후처리 표본 수를 계단으로 낮춰 끊김 완화 — ssTune·resScale 환류와 함께 3중 방어 */
    const ft = (typeof ftAvg !== 'undefined' && Number.isFinite(ftAvg)) ? ftAvg : 16;
    const hot1 = ft > 20, hot2 = ft > 26, hot3 = ft > 30; AAA.tier = hot3 ? 3 : hot2 ? 2 : hot1 ? 1 : 0;
    renderer.getDrawingBufferSize(dbs); const fw = dbs.x, fh = dbs.y;
    if (!colTex || cW !== fw || cH !== fh) { [colTex, histTex].forEach(t => t && t.dispose()); colTex = new THREE.DataTexture(null, fw, fh, THREE.RGBFormat); histTex = new THREE.DataTexture(null, fw, fh, THREE.RGBFormat); [colTex, histTex].forEach(t => { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }); cW = fw; cH = fh; hasPrev = false; } /* 그리기 판에 알파가 없어 RGB 로 복사 */
    let cTex = colTex; if (ssTex) { dsP.m.uniforms.t.value = ssTex; dsP.m.uniforms.px.value.set(1 / fw, 1 / fh); dsP.run(dsRT); cTex = dsRT.texture; } else renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), colTex); curCol = cTex;
    const slow = !ultra && typeof ftAvg !== 'undefined' && ftAvg > 19;
    const useDep = q !== 'low' && !slow;
    const rawDep = !!(useDep && ssDep); if (!rawDep && AAA.lastRaw) haveDepth = false; AAA.lastRaw = rawDep; if (rawDep) haveDepth = true; else if (useDep) { dFrame++; if ((q === 'high' && !hot1) || (dFrame & 1) === 0 || !haveDepth) depthPass(fw, fh, ultra ? 1 : q === 'high' ? 2 : 4); /* 정수 배율만(1.25배 같은 소수 배율은 깊이 표본이 줄무늬로 어긋남) */ } else haveDepth = false;
    const day = isDay() ? 1 : 0;
    U.tCol.value = cTex; U.tDep.value = rawDep ? ssDep : haveDepth && dRT ? dRT.texture : null; U.uDepRaw.value = rawDep ? 1 : 0; U.uRes.value.set(fw, fh); if (rawDep) U.uDRes.value.set(fw, fh); else U.uDRes.value.set(dW || 1, dH || 1);
    U.uT.value = (performance.now() % 100000) / 1000; U.uUseDep.value = useDep && haveDepth ? 1 : 0; U.uNear.value = camera.near; U.uFar.value = camera.far; U.uDay.value = day; U.uUltra.value = ultra ? 1 : 0;
    U.uInvProj.value.copy(camera.projectionMatrixInverse); U.uProj.value.copy(camera.projectionMatrix); U.uCamPos.value.copy(camera.position); U.uNUp.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse); U.uCamW.value.copy(camera.matrixWorld); U.uPrevVP.value.copy(hasPrev ? prevVP : _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    U.uAO.value = ultra ? .62 : q === 'high' ? .55 : q === 'mid' ? .42 : 0; U.uAON.value = ultra ? (hot2 ? 6 : hot1 ? 10 : 16) : (hot1 ? 6 : 8); U.uFog.value = q === 'low' ? 0 : 1;
    U.uGrain.value = q === 'low' ? .018 : .026; U.uCA.value = q === 'low' ? 0 : .0035; U.uAA.value = 1;
    if (scene3.fog && scene3.fog.color) U.uFogCol.value.copy(scene3.fog.color);
    const L = sunL(); let rays = 0, sunVis = 0;
    if (L && q !== 'low' && !slow) { _sv.copy(L.position).sub(L.target ? L.target.position : _v.set(0, 0, 0)).normalize(); _v.copy(_sv).multiplyScalar(900).add(camera.position); _v.project(camera);
      if (_v.z < 1 && Math.abs(_v.x) < 1.6 && Math.abs(_v.y) < 1.6) { U.uSun.value.set(_v.x * .5 + .5, _v.y * .5 + .5); sunVis = Math.max(0, 1 - Math.max(Math.abs(_v.x), Math.abs(_v.y)) / 1.6); rays = (day ? .32 : .2) * sunVis; }
      U.uSunCol.value.copy(L.color); U.uSunV.value.copy(_sv).transformDirection(camera.matrixWorldInverse); }
    U.uRays.value = rays; U.uRayN.value = ultra ? (hot2 ? 12 : hot1 ? 20 : 40) : (hot1 ? 10 : q === 'high' ? 24 : 14);
    const tnow = performance.now(); U.uDof.value = (ultra || q === 'high') && tnow < AAA.dofUntil ? Math.min(1, (AAA.dofUntil - tnow) / 400) : 0; U.uDofBase.value = 0; /* 평소 피사계 심도 끔(흐릿함 지적) — 필살 순간만 */
    if (typeof cam !== 'undefined' && cam && cam.tgt) U.uFocus.value = camera.position.distanceTo(cam.tgt);
    U.uContact.value = ultra && !hot2 ? .45 : 0; U.uClouds.value = ultra && day ? 1 : 0;
    U.uRefl.value = ultra ? (hot3 ? 0 : hot2 ? .4 : (day ? .7 : .9)) : 0; /* 화면 공간 반사(SSR): 장면을 다시 그리지 않고 깊이 버퍼로 반사 광선 추적 — 거울 장면 그리기(23ms)보다 훨씬 가벼움 */
    if (ultra) { U.tBloom.value = bloomPass(cTex, fw, fh); U.uBloomK.value = .14; U.uDirtK.value = .12; U.uFlare.value = sunVis * (day ? .6 : .4); } else { U.uBloomK.value = 0; U.uDirtK.value = 0; U.uFlare.value = 0; }
    U.uMB.value = ultra && !AAA.noHist && !hot2 ? 1 : 0; U.uTAA.value = AAA.taa && ultra && hasPrev && !AAA.noHist ? 1 : 0; /* 지터 TAA 는 인물 속도 버퍼가 없어 가장자리가 떨려 기본 끔 → 슈퍼샘플+MSAA+SMAA 로 대체 */ U.tHist.value = histTex;
    if ((AAA.frames++ % (hot2 ? 60 : hot1 ? 40 : 22)) === 0) { try { adaptExposure(); } catch (e) { } } /* readRenderTargetPixels 는 GPU→CPU 동기화 스톨 → 자동 노출 갱신 빈도를 로드·주사율에 맞춰 줄임(주기적 끊김 감소) */
    U.uExp.value = AAA.exposure;
    for (const k in AAA.force) if (U[k]) U[k].value = AAA.force[k];
    const ac = renderer.autoClear; renderer.autoClear = false; const sm = smaaFor(q, fw, fh); if (sm) { post_.run(sm.rt); sm.pass.render(renderer, null, sm.rt); renderer.setRenderTarget(null); } else post_.run(null); renderer.autoClear = ac;
    if (ultra) renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), histTex);
    prevVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); hasPrev = true;
    AAA.ms = AAA.ms * .92 + (performance.now() - t0) * .08;
  }
  const _m = new THREE.Matrix4();

  // 필살기 순간 → 피사계 심도 강하게 0.9초
  if (typeof callout === 'function') { const _co = callout; callout = function (f, text, ult) { if (ult) AAA.dofUntil = performance.now() + 900; return _co.apply(this, arguments); }; } // eslint-disable-line no-global-assign

  // ── 6) 장면 소품: 바람에 흔들리는 마른 풀 + 햇빛 먼지 ──
  const WIND = { t: { value: 0 } };
  function grass(n) {
    const g = new THREE.BufferGeometry(); const P = [], UVs = [];
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3, cx = Math.cos(a) * 1.6, cz = Math.sin(a) * 1.6;
      P.push(-cx, 0, -cz, cx, 0, cz, cx, 4.2, cz, -cx, 0, -cz, cx, 4.2, cz, -cx, 4.2, -cz); UVs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UVs, 2));
    const m = new THREE.ShaderMaterial({ uniforms: { t: WIND.t, cA: { value: new THREE.Color('#6d6436') }, cB: { value: new THREE.Color('#c9b46a') } }, side: THREE.DoubleSide,
      vertexShader: 'uniform float t; varying vec2 vUv; varying float vH; void main(){ vUv = uv; vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.); float h = position.y / 4.2; vH = h; float sway = sin(t * 1.7 + wp.x * .045 + wp.z * .03) * .9 + sin(t * 3.1 + wp.z * .09) * .35; wp.x += sway * h * h * 1.6; wp.z += sway * h * h * .6; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 cA, cB; varying vec2 vUv; varying float vH; void main(){ float bx = abs(vUv.x - .5) * 2.; float blades = abs(fract(vUv.x * 5.) - .5) * 2.; float tip = 1. - vUv.y; float e = blades - (tip * .95 + .05); float fw = max(fwidth(e), 1e-4); float a = clamp(.5 - e / fw, 0., 1.) * (1. - smoothstep(.96, 1., bx)); if (a < .02) discard; gl_FragColor = vec4(mix(cA, cB, vH) * (.75 + .25 * vH), a); }' });
    m.alphaToCoverage = true; m.extensions = { derivatives: true }; /* 잎 가장자리 계단: 잘라내기(discard) 대신 화소 폭 기준 부드러운 알파 → MSAA 표본 덮개(alpha-to-coverage) */
    const im = new THREE.InstancedMesh(g, m, n); const d = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 40 + Math.pow(Math.random(), .7) * 260; d.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); d.rotation.y = Math.random() * 6.28; const s = .6 + Math.random() * .9; d.scale.set(s, s * (.7 + Math.random() * .7), s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
    im.frustumCulled = false; im.userData.aaa = true; return im;
  }
  function dust(n) {
    const g = new THREE.BufferGeometry(), P = new Float32Array(n * 3), S = new Float32Array(n);
    for (let i = 0; i < n; i++) { P[i * 3] = (Math.random() - .5) * 420; P[i * 3 + 1] = Math.random() * 70; P[i * 3 + 2] = (Math.random() - .5) * 420; S[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('seed', new THREE.BufferAttribute(S, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { t: WIND.t, sunDir: { value: new THREE.Vector3(0, 1, 0) }, col: { value: new THREE.Color('#fff2d6') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float t; uniform vec3 sunDir; attribute float seed; varying float vA; void main(){ vec3 p = position; p.x = mod(p.x + t * (3. + seed * 4.) + 210., 420.) - 210.; p.y = mod(p.y + sin(t * .7 + seed * 40.) * 2. + t * (.6 + seed), 70.); p.z += sin(t * .5 + seed * 30.) * 6.; vec4 mv = modelViewMatrix * vec4(p, 1.); vec3 vdir = normalize(-mv.xyz); vec3 sv = normalize((viewMatrix * vec4(sunDir, 0.)).xyz); float fwd = pow(max(0., dot(-vdir, sv)), 6.); vA = (.25 + 1.6 * fwd) * (.5 + .5 * sin(t * 2. + seed * 60.)); gl_PointSize = clamp((1.2 + seed * 1.6) * 260. / -mv.z, 1., 6.); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 col; varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(col, vA * (1. - d * 2.) * .5); }' });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.aaa = true; return pts;
  }
  const props = { q: null, grass: null, dust: null };
  function propsFor(q) {
    if (props.q === q) return; props.q = q;
    ['grass', 'dust'].forEach(k => { if (props[k]) { scene3.remove(props[k]); props[k].geometry.dispose(); props[k].material.dispose(); props[k] = null; } });
    const gN = q === 'ultra' ? 2200 : q === 'high' ? 900 : q === 'mid' ? 450 : 160, dN = q === 'ultra' ? 1800 : q === 'high' ? 700 : q === 'mid' ? 350 : 120;
    props.grass = grass(gN); props.dust = dust(dN); scene3.add(props.grass); scene3.add(props.dust);
    if (typeof baseTop !== 'undefined' && baseTop && baseTop.add) { baseTop.add(props.grass); baseTop.add(props.dust); }
  }

  // ── 7) 같은 장면 비교 시험: 한 장면을 마감 끔·켬으로 연달아 그려 나란히 보여 줌(AAA.compare()) ──
  AAA.compare = function () {
    const out = document.createElement('div'); out.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px';
    const grab = () => glCanvas.toDataURL('image/jpeg', .92);
    AAA.on = false; renderer.render(scene3, camera); const a = grab(); AAA.on = true; AAA.noHist = true; renderer.render(scene3, camera); AAA.noHist = false; const b = grab();
    out.innerHTML = '<div style="color:#fff;font:12px sans-serif">마감 끔 (위) · 켬 ' + QL() + ' (아래) — 같은 장면</div><img style="max-width:98vw;max-height:47vh" src="' + a + '"><img style="max-width:98vw;max-height:47vh" src="' + b + '">';
    out.onclick = () => out.remove(); document.body.appendChild(out); return out;
  };

  // ── 8) 그리기 감싸기: TAA 지터(울트라) → 본 그리기 → 마감 ──
  const HAL = [[.5, .333], [.25, .667], [.75, .111], [.125, .444], [.625, .778], [.375, .222], [.875, .556], [.0625, .889]]; let jI = 0;
  let inside = false;
  renderer.render = function (sc, camx) {
    const main = !inside && sc === scene3 && camx === camera && renderer.getRenderTarget() === null;
    let jit = false;
    if (main) { try { const q = QL(); propsFor(q); lightRig(q); ssTune(q); if (window.OLPX) { renderer.getDrawingBufferSize(dbs); window.OLPX.value.set(1.6 / dbs.x, 1.6 / dbs.y); } /* mocap 윤곽선 최소 0.8화소 */ if ((AAA.frames % 120) === 1) { applyShadow(); anisoSweep(); } WIND.t.value = performance.now() / 1000; const L = sunL(); if (L && props.dust) props.dust.material.uniforms.sunDir.value.copy(L.position).normalize();
      if (AAA.on && q === 'ultra' && AAA.taa && !AAA.freeze) { renderer.getDrawingBufferSize(dbs); const h = HAL[jI++ % 8]; camera.setViewOffset(dbs.x, dbs.y, h[0] - .5, h[1] - .5, dbs.x, dbs.y); jit = true; } } catch (e) { console.error(e); } }
    let ssOn = false; if (main && AAA.on && !AAA.noSS && QL() === 'ultra' && AAA.ss > 1.01) { try { renderer.getDrawingBufferSize(dbs); const rt = ssTarget(dbs.x, dbs.y); const sa = renderer.shadowMap.autoUpdate; if (sa) { renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = (typeof ftAvg !== 'undefined' && ftAvg < 22) || (ssShadow.n++ & 1) === 0; } /* 여유 있으면 매 장면, 버거우면 그림자 맵은 두 장면에 한 번 */
      renderer.setRenderTarget(rt); _render(sc, camx); renderer.setRenderTarget(null); renderer.shadowMap.autoUpdate = sa; ssOn = true; } catch (e) { console.error('aaa ss', e); AAA.noSS = true; renderer.setRenderTarget(null); } }
    if (!ssOn) _render(sc, camx);
    if (jit) camera.clearViewOffset();
    if (main && AAA.on) { inside = true; try { post(ssOn ? ssRT.texture : null, ssOn ? ssRT.depthTexture : null); } catch (e) { console.error('aaa post', e); AAA.on = false; } inside = false; }
  };
})();
