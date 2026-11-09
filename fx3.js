// 이펙트 사실감 고도화 (fx3) — fx2 뒤에 불러온다. arena.js 는 고치지 않고 감싸기만 한다.
// 1) 모든 기술 에너지 재질(addMat): 도형 테두리를 잡음으로 녹여 흩어지게 + 표면을 잡음으로 일렁이게 + 속성별 무늬(불꽃·물 흐름·번개 균열·어둠 연기·바람 결)
// 2) GPU 알갱이(불꽃·연기·흙먼지·물방울·불티·꽃잎·검은 불꽃), GPU 꼬리 불똥(잔상 선), 가지 치는 번개, 휘어 지나가는 검기 띠(물·불·번개·바람·어둠)
// 3) 땅 파괴: 퍼져 자라는 균열(속이 달아오름) + 먼지 고리·기둥 + 자갈 + 떠오르는 바위(기 모으기) — env.js 의 분화구·판석·가시와 함께
// 4) 맞은 순간(hitFx)·폭발(explode)·필살(ultBlast)·착지·날아가는 투사체 꼬리를 속성에 맞게 덧입힘
// 60fps 원칙: 모든 재질·도형은 처음 한 번만 만들고, 알갱이·꼬리는 정해진 칸을 돌려 씀(GPU 가 위치 계산), 버거우면 양을 줄임
(function () {
  if (typeof scene3 === 'undefined' || typeof FX_FS === 'undefined' || typeof envUpdate !== 'function') return;
  const T00 = performance.now();
  const DAY = { value: 0 }, LITE = { value: 0 }, NOW = { value: 0 }, SCALE = { value: 600 }, RES = { value: new THREE.Vector2(1920, 1140) };
  const now = () => NOW.value;
  const rr = (a, b) => a + Math.random() * (b - a);
  const col3 = h => { const c = new THREE.Color(h); return c; };
  const st = window.__fx3 = { emits: 0, ms: 0, sty: 0, styUntil: 0, recipes: 0, hits: 0 };
  const   QF = () => { const q = typeof getQuality === 'function' ? getQuality() : 'mid'; return q === 'low' ? .3 : q === 'mid' ? .8 : (window.AAA && AAA.ultra) ? 9 : 1.8; }; // 품질별 이펙트 양(11-07 라운드C: 울트라 폭발적 증량 — busy()의 fps 가드가 자동 감쇠)
  const busy = () => (typeof ftAvg === 'undefined' ? 1 : ftAvg > 20 ? .3 : ftAvg > 16.5 ? .6 : 1) * QF() * (window.FX3 && FX3.sigT && performance.now() - FX3.sigT < 400 ? .55 : 1) * (typeof parts !== 'undefined' && parts.length > 300 ? .55 : typeof parts !== 'undefined' && parts.length > 160 ? .8 : 1); // 버거우면 줄임 · 형상 메시가 보일 땐 입자 줄임 · 파티클이 조금만 몰려도(스킬·충돌) 선제 감축(11-09: 충돌 프레임 스파이크 완화로 문턱 하향)
  const root = new THREE.Group(); root.name = 'fx3'; scene3.add(root);
  const keepRoot = () => { try { if (typeof baseTop !== 'undefined' && baseTop && !baseTop.has(root)) baseTop.add(root); } catch (e) { } };

  // ═══ 공용 잡음(GLSL) ═══
  const NOISE = `
    float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }`;

  // ═══ 1) 에너지 재질 고도화: addMat 이 만드는 모든 재질을 새 셰이더로 ═══
  const VS3 = `uniform float uT; uniform float uSeed; uniform float uSty; uniform float uDisp;
    varying vec3 vW; varying vec3 vN; varying vec3 vV;
    float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float n3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.);
      vec3 wn = normalize(mat3(modelMatrix) * normal + 1e-5);
      float tt = uSty == 3. ? floor(uT * 22.) * .37 : uT;              // 번개는 뚝뚝 끊겨 떨림
      float sp = uSty == 1. ? 3.4 : uSty == 2. ? 1.6 : uSty == 4. ? 1.1 : 1.3;
      vec3 q = w.xyz * .2 + vec3(uSeed, -tt * sp, tt * .6);
      float d = n3(q) * .62 + n3(q * 2.3 + 4.1) * .38 - .5;
      float R = distance(w.xyz, modelMatrix[3].xyz);
      float amp = uDisp * clamp(.2 * R, 0., 1.7) * (uSty == 1. ? 1.5 : uSty == 3. ? .8 : uSty == 4. ? 1.3 : uSty == 2. ? .9 : 1.);
      w.xyz += wn * d * amp;
      if (uSty == 1.) w.y += max(0., d + .15) * amp * 1.4;              // 불꽃 혀가 위로 날름
      vW = w.xyz; vN = normalize(normalMatrix * normal + 1e-5); vec4 mv = viewMatrix * w; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  const FS3 = `uniform float uDay; uniform float uLite; uniform vec3 uC; uniform float uOp; uniform float uT; uniform float uSeed; uniform float uSty;
    varying vec3 vW; varying vec3 vN; varying vec3 vV; ${NOISE}
    void main() {
      float vl = length(vV), nl = length(vN); float rim = nl > .01 && vl > .01 ? pow(1. - abs(dot(vN / nl, vV / vl)), 1.5) : 0.; float face = 1. - rim;
      vec3 P = vW * .13; float sp = uSty == 1. ? 2.8 : uSty == 2. ? 1.5 : uSty == 3. ? 5. : uSty == 5. ? 3. : 1.1;
      vec2 qa = P.xy + vec2(uSeed, -uT * sp), qb = P.zy + vec2(uT * sp * .6 + uSeed, -uT * sp * .5);
      float w1 = fbm(qa * 1.3), w2 = w1, n;
      if (uLite > .5) n = w1 * .7 + vn(qb * 2.) * .3;                                            // 버거울 때: 가벼운 잡음
      else { w2 = fbm(qb * 1.1); n = fbm(qa * 1.6 + vec2(w2, w1) * 1.9) * .62 + w1 * .38; } // 비틀린 흐름 잡음
      vec3 c = uC, col; float a;
      if (uSty == 1.) {          // 불꽃: 겉은 검붉게 식고 속은 흰빛, 가장자리는 혀처럼 찢어짐
        float heat = clamp(n * 1.3 + face * .5 - .25, 0., 1.);
        col = heat < .33 ? mix(vec3(.3, .02, 0.), c * .9, heat / .33) : heat < .66 ? mix(c * .9, vec3(1., .78, .28), (heat - .33) / .33) : mix(vec3(1., .78, .28), vec3(1., .97, .86), (heat - .66) / .34);
        a = smoothstep(.2, .58, n + face * .28) * 1.15;
      } else if (uSty == 2.) {   // 물: 흐르는 결 + 반짝이는 물빛(코스틱) + 흰 거품 가장자리
        float caus = pow(1. - abs(fbm(qa * 3.1 + w2) * 2. - 1.), 7.);
        float streak = pow(abs(sin(P.y * 7. + n * 6. - uT * 5.)), 6.);
        col = mix(c * .5, c * 1.15, n) + vec3(.8, .93, 1.) * (caus * .9 + streak * .25 + pow(rim, 2.5) * .8);
        a = .38 + .45 * n + caus * .45 + pow(rim, 2.) * .35;
      } else if (uSty == 3.) {   // 번개·뇌기: 지지직 갈라지는 실금
        float tq = floor(uT * 20.);
        float cr = pow(1. - abs(fbm(P.xy * 4.5 + vec2(tq * 1.7, tq * .9)) * 2. - 1.), 12.) + pow(1. - abs(fbm(P.zy * 5. - vec2(tq, tq * 1.3)) * 2. - 1.), 14.);
        col = mix(c * 1.05, vec3(1.), clamp(cr, 0., 1.)) + c * face * .3;
        a = .18 + cr * 1.3 + face * .22;
      } else if (uSty == 4.) {   // 어둠: 연기처럼 감기고 속에서만 빛남
        float s = smoothstep(.32, .82, n);
        col = mix(c * .3, c * 1.6, s) + vec3(1., .82, 1.) * pow(s, 6.) * .7;
        a = smoothstep(.22, .6, n) * .95;
      } else if (uSty == 5.) {   // 바람: 가는 결이 빠르게 스침
        float wsp = pow(abs(sin(P.x * 6. + P.z * 6. + n * 7. - uT * 9.)), 9.);
        col = mix(c, vec3(1.), wsp * .75);
        a = .12 + wsp * .9 * (n + .2) + rim * .3;
      } else {                   // 기·에너지: 흰 심 + 겹 광채
        float hot = smoothstep(.5, 1.05, n + rim * .25 + face * .25);
        col = mix(c * 1.2, vec3(1.), hot * .55);
        a = .3 + .75 * n;
      }
      float ero = smoothstep(.26, .66, n + face * .34);                 // 윤곽을 잡음으로 녹임(도형 티 지우기)
      float lum = dot(col, vec3(.3, .59, .11)); col = mix(col, max(mix(vec3(lum), col, 1.6) * .82, 0.), uDay); // day: more saturation, less white
      gl_FragColor = vec4(col, clamp(uOp * a * mix(1., ero, .85) * (.8 + rim * .45) * (1. + uDay * .25), 0., 1.)); }`;
  // 기술 이름 → 무늬 (지금 쓰는 기술의 무늬를 그 순간 만들어지는 재질에 입힘)
  const STY_RE = [
    [/치도리|라이키리|기린|뇌|벼락|번개|자전|인드라|육장광뢰|카운터 쇼크|화뢰신/, 3],
    [/화둔|화권|호화구|불꽃|염|화창|히노카미|해의|일훈|소각|디아블|이프릿|플람베|불|적화포|폭혈|레드 호크|아침 공작|용선화|초고열/, 1],
    [/수둔|물의|수룡|수교|물결|생생유전|빙|얼음|월백|백련|백도|하쿠카|군조|결|천상옥좌|소데노/, 2],
    [/아마테라스|시라누이|수사노오|토츠카|츠쿠요미|카무이|흑|허화|세로|감마|살기|무월|경화수월|파도 90|월독|완전최면|폭주/, 4],
    [/나선수리검|풍둔|선풍|강풍|바람|회오리|염동|초능력|센본|천본앵|경엄|카게요시|사박|모래|사둔|사막|안개|등꽃|나비/, 5],
  ];
  const styOfName = nm => { for (const [re, s] of STY_RE) if (re.test(nm)) return s; return 0; };
  const hsl = { h: 0, s: 0, l: 0 };
  const styOfColor = c => { c.getHSL(hsl); const h = hsl.h * 360;
    if (hsl.s > .5 && h >= 8 && h <= 52 && hsl.l < .85) return 1; if (hsl.s > .35 && h >= 255 && h <= 320) return 4; if (h > 48 && h < 66 && hsl.s > .5) return 3; return 0; };
  function upgrade(p) {
    const c = p.uniforms.uC.value; let s = now() < st.styUntil ? st.sty : styOfColor(c);
    if (s === 1 && styOfColor(c) !== 1 && c.getHSL(hsl).l > .9) s = 0; // 흰 심은 에너지로
    p.uniforms.uSty = { value: s }; p.uniforms.uDisp = { value: 1 }; p.uniforms.uLite = LITE; p.uniforms.uDay = DAY; p.vertexShader = VS3; p.fragmentShader = FS3; return p;
  }
  const OrigSM = THREE.ShaderMaterial;
  // 낮/밤 혼합 전환: 표시한 가산 재질만(낮 = 일반 혼합으로 색 유지)
  let dayMode = false; const isWhite = m => { const c = m.uniforms && m.uniforms.uC ? m.uniforms.uC.value : m.color; return c && c.isColor && (c.r + c.g + c.b) / 3 > .82 && Math.min(c.r, c.g, c.b) > .7; };
  const regAdd = m => { if (!m || m.__fx3reg || m.blending !== THREE.AdditiveBlending || isWhite(m)) return m; m.__fx3reg = true; if (dayMode) m.blending = THREE.NormalBlending; return m; };
  function setDay(on) { if (on === dayMode) return; dayMode = on; scene3.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach(m => { if (m.__fx3reg) m.blending = on && !isWhite(m) ? THREE.NormalBlending : THREE.AdditiveBlending; }); }); }
  const lumOf = c => c ? c.r * .3 + c.g * .59 + c.b * .11 : 0;
  function dayTick() { const bg = scene3.background && scene3.background.isColor ? scene3.background : scene3.fog && scene3.fog.color; const L = lumOf(bg); const k = Math.max(0, Math.min(1, (L - .22) / .3)); DAY.value += (k - DAY.value) * .1; if (!dayMode && DAY.value > .55) setDay(true); else if (dayMode && DAY.value < .4) setDay(false); }
  const OrigSpr = THREE.SpriteMaterial; function SPR3(p) { const m = new OrigSpr(p); return regAdd(m); } SPR3.prototype = OrigSpr.prototype; THREE.SpriteMaterial = SPR3;
  function SM3(p) { const up = p && p.fragmentShader === FX_FS && p.uniforms && p.uniforms.uC; if (up) upgrade(p); const m = new OrigSM(p); return up ? regAdd(m) : m; }
  SM3.prototype = OrigSM.prototype; THREE.ShaderMaterial = SM3;
  const fixOld = () => scene3.traverse(o => { const m = o.material; if (m && m.fragmentShader === FX_FS && m.uniforms && m.uniforms.uC) { upgrade(m); m.uniforms.uDisp.value = .6; m.needsUpdate = true; } });
  fixOld(); setTimeout(fixOld, 1500);

  // ═══ 2) GPU 알갱이 ═══
  // 종류: 0 빛 알갱이, 1 불꽃, 2 연기, 3 물방울·얼음 조각, 4 흙먼지, 5 불티, 6 꽃잎·나비, 7 검은 불꽃
  const PVS = `attribute vec3 aV; attribute vec4 aD; attribute vec4 aC; uniform float uNow; uniform float uScale;
    varying vec3 vC; varying float vAge; varying float vK; varying float vR;
    void main() { float t = uNow - aD.x, age = t / aD.y; vK = floor(aD.w + .5);
      if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
      float drag = (vK == 2. || vK == 4. || vK == 7.) ? 1.7 : vK == 1. ? 1.1 : vK == 6. ? 1.4 : .25;
      vec3 p = position + aV * (1. - exp(-drag * t)) / drag; p.y -= .5 * aC.w * t * t;
      if (vK == 1. || vK == 2. || vK == 7. || vK == 6.) { p.x += sin(t * 3. + position.y * .3) * 3. * t; p.z += cos(t * 2.6 + position.x * .3) * 3. * t; }
      if (vK == 3. || vK == 4.) p.y = max(p.y, .3);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float grow = vK == 2. ? (.55 + age * 2.4) : vK == 4. ? (.5 + age * 2.) : vK == 1. || vK == 7. ? (1. - age * .55) * (.55 + age * 1.2) : vK == 6. ? 1. : (1. - age * .6);
      gl_PointSize = clamp(aD.z * grow * uScale / max(1., -mv.z), 0., uScale > 0. ? 96. : 96.);
      gl_Position = projectionMatrix * mv; vC = aC.rgb; vAge = age; vR = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 437.5); }`;
  const PFS = `uniform float uDay; uniform float uNow; varying vec3 vC; varying float vAge; varying float vK; varying float vR; ${NOISE}
    void main() { vec2 uv = gl_PointCoord * 2. - 1.; float r = length(uv); if (r > 1.) discard; vec3 col = vC; float a;
      if (vK == 1.) { vec2 q = uv * 2.2 + vec2(vR * 10., uNow * 3.2); float n = vn(q) * .65 + vn(q * 2.1) * .35;
        float m = smoothstep(1., .25, r + n * .6 - .28); float heat = (1. - vAge) * (1. - r) * 1.5 + n * .3;
        col = heat > .8 ? mix(vec3(1., .86, .45), vec3(1., 1., .92), min(1., (heat - .8) * 3.)) : heat > .4 ? mix(vC, vec3(1., .86, .45), (heat - .4) / .4) : mix(vC * .3, vC, heat / .4);
        a = m * (1. - vAge * vAge); }
      else if (vK == 2. || vK == 4.) { float n = vn(uv * 1.9 + vec2(vR * 7., uNow * .25));
        a = smoothstep(1., .05, r + n * .65 - .3) * (vK == 2. ? .5 : .62) * (1. - vAge) * smoothstep(0., .1, vAge);
        col = vC * (.6 + .55 * (1. - gl_PointCoord.y)); }
      else if (vK == 3.) { float c = pow(max(0., 1. - r), 3.); a = c * 1.4 * (1. - vAge * vAge); col = mix(vC, vec3(1.), pow(max(0., 1. - length(uv + vec2(.3, .3))), 5.)); }
      else if (vK == 5.) { a = pow(max(0., 1. - r), 2.4) * (.55 + .45 * sin(uNow * 31. + vR * 60.)) * (1. - vAge); col = mix(vec3(1., .28, .04), vec3(1., .92, .55), 1. - vAge); }
      else if (vK == 6.) { float an = uNow * 4. + vR * 6.28; vec2 q = mat2(cos(an), -sin(an), sin(an), cos(an)) * uv; float e = length(q * vec2(1., 2.3));
        a = smoothstep(1., .75, e) * (1. - vAge * vAge); col = mix(vC, vec3(1.), .35 * (1. - e)); }
      else if (vK == 7.) { vec2 q = uv * 2.3 + vec2(vR * 9., uNow * 2.6); float n = vn(q) * .65 + vn(q * 2.1) * .35; float m = smoothstep(1., .2, r + n * .7 - .3);
        col = mix(vec3(.015, 0., .025), vC, smoothstep(.55, .95, r + n * .25)); a = m * .92 * (1. - vAge); }
      else { a = pow(max(0., 1. - r), 2.2) * (1. - vAge); col = mix(vC, vec3(1.), pow(max(0., 1. - r), 5.) * .85); }
      gl_FragColor = vec4(col * (1. - uDay * .15), min(1., a * (1. + uDay * .9))); }`;
  function PSys(cap, blend) {
    const g = new THREE.BufferGeometry(), P = new Float32Array(cap * 3), V = new Float32Array(cap * 3), D = new Float32Array(cap * 4), C = new Float32Array(cap * 4);
    for (let i = 0; i < cap; i++) { D[i * 4] = -1e5; D[i * 4 + 1] = 1; }
    const at = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', at(P, 3)); g.setAttribute('aV', at(V, 3)); g.setAttribute('aD', at(D, 4)); g.setAttribute('aC', at(C, 4));
    const m = new THREE.ShaderMaterial({ uniforms: { uNow: NOW, uScale: SCALE, uDay: DAY }, vertexShader: PVS, fragmentShader: PFS, transparent: true, depthWrite: false, blending: blend });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = blend === THREE.AdditiveBlending ? 6 : 5; root.add(pts);
    let i0 = 0, dirty = false;
    return { cap, emit(p, v, life, size, kind, c, grav = 0, delay = 0) {
        const i = i0; i0 = (i0 + 1) % cap; P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z; V[i * 3] = v.x; V[i * 3 + 1] = v.y; V[i * 3 + 2] = v.z;
        D[i * 4] = now() + delay; D[i * 4 + 1] = life; D[i * 4 + 2] = size; D[i * 4 + 3] = kind; C[i * 4] = c.r; C[i * 4 + 1] = c.g; C[i * 4 + 2] = c.b; C[i * 4 + 3] = grav; dirty = true; st.emits++; },
      flush() { if (!dirty) return; dirty = false; for (const k of ['position', 'aV', 'aD', 'aC']) g.attributes[k].needsUpdate = true; } };
  }
  const PA = PSys(3600, THREE.AdditiveBlending), PN = PSys(2200, THREE.NormalBlending);
  const sysOf = k => (k === 2 || k === 4 || k === 7 || k === 6) ? PN : PA;
  const _c = new THREE.Color(), _v = new THREE.Vector3(), _p = new THREE.Vector3();
  function emit(p, v, life, size, kind, color, grav = 0, delay = 0) { _c.set(color); sysOf(kind).emit(p, v, life, size, kind, _c, grav, delay); }

  // ═══ GPU 꼬리 불똥(잔상 선): 머리는 밝고 꼬리는 사라짐 ═══
  const SVS = `attribute vec3 aV; attribute vec4 aD; attribute vec4 aC; attribute vec2 aE; uniform float uNow; uniform vec2 uRes;
    varying vec3 vC; varying float vA; varying float vS;
    vec3 at(float t) { float tt = max(t, 0.); vec3 p = position + aV * tt; p.y -= .5 * aC.w * tt * tt; return p; }
    void main() { float t = uNow - aD.x, age = t / aD.y;
      if (age < 0. || age > 1.) { gl_Position = vec4(2., 2., 2., 1.); return; }
      mat4 pv = projectionMatrix * viewMatrix; vec4 ch = pv * vec4(at(t), 1.), ct = pv * vec4(at(t - aD.z), 1.);
      vec2 dir = (ch.xy / ch.w - ct.xy / ct.w) * uRes; dir = length(dir) < .001 ? vec2(1., 0.) : normalize(dir); vec2 nr = vec2(-dir.y, dir.x);
      vec4 c = aE.x > .5 ? ch : ct; float w = aD.w * (aE.x > .5 ? 1. : .3) * (1. - age * .5) * clamp(140. / max(c.w, 1.), .35, 3.);
      c.xy += nr * aE.y * w / uRes * c.w * 2.; gl_Position = c; vC = aC.rgb; vA = (1. - age) * (aE.x > .5 ? 1. : 0.); vS = aE.y; }`;
  const SFS = `uniform float uDay; varying vec3 vC; varying float vA; varying float vS;
    void main() { float e = abs(vS); gl_FragColor = vec4(mix(vC, vec3(1.), smoothstep(.55, 0., e) * vA * (1. - uDay * .6)), min(1., vA * smoothstep(1., .1, e) * (1. + uDay * .9))); }`;
  const Streaks = (() => { const UL0 = (() => { try { return localStorage.getItem('arenaUltra') === '1'; } catch (e) { return false; } })(); const cap = UL0 ? 7000 : 1800, g = new THREE.BufferGeometry(), n = cap * 4;
    const P = new Float32Array(n * 3), V = new Float32Array(n * 3), D = new Float32Array(n * 4), C = new Float32Array(n * 4), E = new Float32Array(n * 2), I = new Uint32Array(cap * 6);
    for (let i = 0; i < cap; i++) { for (let k = 0; k < 4; k++) { const j = i * 4 + k; D[j * 4] = -1e5; D[j * 4 + 1] = 1; E[j * 2] = k < 2 ? 0 : 1; E[j * 2 + 1] = k % 2 ? 1 : -1; } I.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6); }
    const at = (a, k) => new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', at(P, 3)); g.setAttribute('aV', at(V, 3)); g.setAttribute('aD', at(D, 4)); g.setAttribute('aC', at(C, 4)); g.setAttribute('aE', new THREE.BufferAttribute(E, 2)); g.setIndex(new THREE.BufferAttribute(I, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uNow: NOW, uRes: RES, uDay: DAY }, vertexShader: SVS, fragmentShader: SFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; root.add(mesh); let i0 = 0, dirty = false;
    return { emit(p, v, life, len, width, color, grav = 0, delay = 0) { _c.set(color); const i = i0; i0 = (i0 + 1) % cap;
        for (let k = 0; k < 4; k++) { const j = i * 4 + k; P[j * 3] = p.x; P[j * 3 + 1] = p.y; P[j * 3 + 2] = p.z; V[j * 3] = v.x; V[j * 3 + 1] = v.y; V[j * 3 + 2] = v.z;
          D[j * 4] = now() + delay; D[j * 4 + 1] = life; D[j * 4 + 2] = len; D[j * 4 + 3] = width; C[j * 4] = _c.r; C[j * 4 + 1] = _c.g; C[j * 4 + 2] = _c.b; C[j * 4 + 3] = grav; } dirty = true; st.emits++; },
      flush() { if (!dirty) return; dirty = false; for (const k of ['position', 'aV', 'aD', 'aC']) g.attributes[k].needsUpdate = true; } };
  })();
  const streak = Streaks.emit;

  // ═══ 가지 치는 번개 / 굵기 있는 선(화면을 향한 띠) ═══
  const BVS = `attribute vec3 aB; attribute vec3 aE; uniform vec2 uRes; varying float vS; varying float vW;
    void main() { mat4 pv = projectionMatrix * viewMatrix; vec4 ca = pv * vec4(position, 1.), cb = pv * vec4(aB, 1.);
      vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uRes; d = length(d) < .001 ? vec2(1., 0.) : normalize(d); vec2 nr = vec2(-d.y, d.x);
      float w = aE.z * clamp(150. / max(ca.w, 1.), .5, 3.); ca.xy += nr * aE.y * w / uRes * ca.w * 2.; gl_Position = ca; vS = aE.y; vW = aE.z; }`;
  const BFS = `uniform float uDay; uniform vec3 uC; uniform float uOp; varying float vS; varying float vW;
    void main() { float e = abs(vS); float core = smoothstep(.32, 0., e), glow = pow(1. - e, 2.2); gl_FragColor = vec4(mix(uC, vec3(1.), core * (1. - uDay * .5)), min(1., (core + glow * .75) * uOp * (1. + uDay * .8))); }`;
  const bolts = Array.from({ length: (() => { try { return localStorage.getItem('arenaUltra') === '1'; } catch (e) { return false; } })() ? 28 : 10 }, () => { const cap = (() => { try { return localStorage.getItem('arenaUltra') === '1'; } catch (e) { return false; } })() ? 420 : 220, g = new THREE.BufferGeometry(), n = cap * 4;
    const A = new Float32Array(n * 3), B = new Float32Array(n * 3), E = new Float32Array(n * 3), I = new Uint32Array(cap * 6);
    for (let i = 0; i < cap; i++) I.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
    g.setAttribute('position', new THREE.BufferAttribute(A, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aB', new THREE.BufferAttribute(B, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aE', new THREE.BufferAttribute(E, 3).setUsage(THREE.DynamicDrawUsage)); g.setIndex(new THREE.BufferAttribute(I, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uRes: RES, uDay: DAY, uC: { value: new THREE.Color() }, uOp: { value: 1 } }, vertexShader: BVS, fragmentShader: BFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 8; root.add(mesh);
    return { mesh, g, A, B, E, cap, life: 0, max: 1, regen: 0, from: null, to: null, w: 4, br: 3, jag: .22 }; });
  function buildBolt(b) {
    const segs = []; const a0 = b.from(), b0 = b.to();
    const line = (p, q, depth, w, out) => { const pts = [p.clone(), q.clone()]; const L = p.distanceTo(q);
      for (let lv = 0; lv < depth; lv++) { const nx = [pts[0]]; for (let i = 1; i < pts.length; i++) { const u = pts[i - 1], v = pts[i], m = u.clone().add(v).multiplyScalar(.5), d = L * b.jag / Math.pow(1.85, lv);
          m.x += rr(-d, d); m.y += rr(-d, d); m.z += rr(-d, d); nx.push(m, v); } pts.length = 0; pts.push(...nx); }
      for (let i = 1; i < pts.length; i++) out.push([pts[i - 1], pts[i], w * (1 - i / pts.length * .45)]); return pts; };
    const main = line(a0, b0, 5, b.w, segs);
    for (let k = 0; k < b.br; k++) { const i = Math.floor(rr(3, main.length - 4)), s = main[i], dir = main[i + 2].clone().sub(s).normalize(), L = a0.distanceTo(b0) * rr(.18, .4);
      const e = s.clone().addScaledVector(dir, L).add(V3(rr(-L, L) * .6, rr(-L, L) * .5, rr(-L, L) * .6)); const sub = line(s, e, 4, b.w * .45, segs);
      if (Math.random() < .5) { const j = Math.floor(rr(2, sub.length - 3)), s2 = sub[j], e2 = s2.clone().add(V3(rr(-L, L) * .4, rr(-L, L) * .4, rr(-L, L) * .4)); line(s2, e2, 3, b.w * .25, segs); } }
    const n = Math.min(segs.length, b.cap);
    for (let i = 0; i < b.cap; i++) for (let k = 0; k < 4; k++) { const j = i * 4 + k, s = segs[i];
      if (i >= n) { b.E[j * 3 + 2] = 0; continue; } const p = k < 2 ? s[0] : s[1], q = k < 2 ? s[1] : s[0];
      b.A[j * 3] = p.x; b.A[j * 3 + 1] = p.y; b.A[j * 3 + 2] = p.z; b.B[j * 3] = q.x; b.B[j * 3 + 1] = q.y; b.B[j * 3 + 2] = q.z; b.E[j * 3] = 0; b.E[j * 3 + 1] = (k % 2 ? 1 : -1) * (k < 2 ? 1 : -1); b.E[j * 3 + 2] = s[2]; }
    for (const k of ['position', 'aB', 'aE']) b.g.attributes[k].needsUpdate = true; b.g.setDrawRange(0, n * 6);
  }
  function bolt(from, to, color, life = .3, w = 4, br = 3, jag = .22) { // from/to: 위치 또는 위치를 돌려주는 함수(따라감)
    const b = bolts.reduce((x, y) => x.life < y.life ? x : y); const F0 = typeof from === 'function' ? from : () => from, T0 = typeof to === 'function' ? to : () => to;
    Object.assign(b, { from: F0, to: T0, life: life, max: life, regen: 0, w, br, jag }); b.mesh.material.uniforms.uC.value.set(color); b.mesh.visible = true; buildBolt(b); return b;
  }

  // ═══ 휘어 지나가는 검기 띠(물결·불꽃·번개·바람·어둠) ═══
  const RVS = `attribute float aU; attribute float aS; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uX; uniform vec3 uY; uniform vec3 uH;
    uniform float uR; uniform float uA0; uniform float uA1; uniform float uW; uniform float uHead; uniform float uTail; uniform float uMove; uniform float uWave; uniform float uT;
    varying float vS; varying float vV; varying float vU;
    void main() { float ang = mix(uA0, uA1, aU); vec3 rad = uX * cos(ang) + uY * sin(ang);
      float s = (aU - (uHead - uTail)) / uTail; float tp = s > 0. && s < 1. ? sin(3.14159 * pow(clamp(s, 0., 1.), .7)) : 0.;
      float rr = uR * (1. + uWave * sin(aU * 16. + uT * 7.) * .09);
      vec3 p = mix(uC0, uC1, uMove) + rad * rr + uH * aU + rad * aS * uW * tp * .5 + cross(uX, uY) * aS * uW * tp * .12;
      vS = s; vV = aS; vU = aU; gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`;
  const RFS = `uniform float uDay; uniform vec3 uC; uniform vec3 uC2; uniform float uOp; uniform float uSty; uniform float uT; varying float vS; varying float vV; varying float vU; ${NOISE}
    void main() { if (vS < 0. || vS > 1.) discard; float e = abs(vV), n = fbm(vec2(vU * 14. - uT * 3., vV * 2. + uT * 1.5)); vec3 col; float a;
      if (uSty == 2.) { float fl = pow(abs(sin(vU * 60. - uT * 14. + vV * 3. + n * 4.)), 4.); float foam = smoothstep(.55, .95, e + n * .35) + smoothstep(.85, 1., vS) * .6;
        col = mix(mix(uC2, uC, n + fl * .3), vec3(.92, .97, 1.), clamp(foam, 0., 1.)); a = (smoothstep(1., .6, e) * (.55 + .45 * n) + foam * .4) * smoothstep(0., .25, vS); }
      else if (uSty == 1.) { float heat = clamp((1. - e) * 1.2 + n * .55 - .25 + vS * .3, 0., 1.);
        col = heat < .45 ? mix(uC2 * .5, uC, heat / .45) : mix(uC, vec3(1., .96, .8), (heat - .45) / .55); a = smoothstep(.15, .5, heat + n * .2 - e * .25) * smoothstep(0., .2, vS); }
      else if (uSty == 3.) { float cr = pow(1. - abs(fbm(vec2(vU * 30., floor(uT * 24.))) * 2. - 1.), 6.); col = mix(uC, vec3(1.), smoothstep(.4, 0., e) + cr * .5); a = (smoothstep(1., .2, e) + cr * .6) * (.4 + .6 * vS); }
      else if (uSty == 5.) { float l = pow(abs(sin(vV * 9. + n * 3.)), 14.); col = mix(uC, vec3(1.), l); a = (l * .9 + smoothstep(1., .3, e) * .18) * vS; }
      else if (uSty == 4.) { float s2 = smoothstep(.3, .9, n + (1. - e) * .4); col = mix(vec3(.02, 0., .02), uC, smoothstep(.65, 1., e + n * .3)); a = s2 * smoothstep(1., .7, e) * .95 * smoothstep(0., .2, vS); }
      else { col = mix(uC, vec3(1.), smoothstep(.45, 0., e) * (.6 + .4 * vS)); a = smoothstep(1., .25, e + n * .25) * (.35 + .65 * vS); }
      gl_FragColor = vec4(col, clamp(a * uOp * (1. + uDay * .7), 0., 1.)); }`;
  const mkRibbons = (n, blend) => Array.from({ length: n }, () => { const N = 72, g = new THREE.BufferGeometry(), U = new Float32Array(N * 2 + 2), S = new Float32Array(N * 2 + 2), P = new Float32Array((N * 2 + 2) * 3), I = [];
    for (let i = 0; i <= N; i++) { U[i * 2] = U[i * 2 + 1] = i / N; S[i * 2] = -1; S[i * 2 + 1] = 1; if (i < N) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aU', new THREE.BufferAttribute(U, 1)); g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setIndex(I);
    const u = { uC0: { value: V3() }, uC1: { value: V3() }, uX: { value: V3(1, 0, 0) }, uY: { value: V3(0, 0, 1) }, uH: { value: V3() }, uR: { value: 10 }, uA0: { value: 0 }, uA1: { value: 3 }, uW: { value: 4 }, uHead: { value: 0 }, uTail: { value: .5 }, uMove: { value: 0 }, uWave: { value: 0 }, uT: FXT, uDay: DAY, uC: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uOp: { value: 1 }, uSty: { value: 0 } };
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: RVS, fragmentShader: RFS, transparent: true, depthWrite: false, blending: blend, side: THREE.DoubleSide }));
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 7; root.add(mesh); return { mesh, u, t: 0, dur: 1, on: false }; });
  const ribA = mkRibbons(10, THREE.AdditiveBlending), ribN = mkRibbons(4, THREE.NormalBlending);
  // o: { c0, c1(옮겨 가는 중심), x, y(면의 두 축), r, a0, a1, w, dur, tail, sty, col, col2, h(나선 상승), wave, drops }
  function arc(o) { const pool = o.sty === 4 ? ribN : ribA, R0 = pool.find(x => !x.on) || pool.reduce((a, b) => a.t / a.dur > b.t / b.dur ? a : b), u = R0.u;
    u.uC0.value.copy(o.c0); u.uC1.value.copy(o.c1 || o.c0); u.uX.value.copy(o.x).normalize(); u.uY.value.copy(o.y).normalize(); u.uH.value.copy(o.h || V3());
    u.uR.value = o.r; u.uA0.value = o.a0; u.uA1.value = o.a1; u.uW.value = o.w; u.uTail.value = o.tail || .45; u.uWave.value = o.wave || 0; u.uSty.value = o.sty || 0;
    u.uC.value.set(o.col); u.uC2.value.set(o.col2 || o.col); u.uOp.value = o.op || 1; u.uHead.value = 0; u.uMove.value = 0;
    if (o.full) { u.uTail.value = 1; u.uHead.value = 1; }
    Object.assign(R0, { on: true, t: 0, dur: o.dur || .5, o, delay: o.delay || 0 }); R0.mesh.visible = false; return R0; }
  const arcPos = (R0, k) => { const u = R0.u, ang = u.uA0.value + (u.uA1.value - u.uA0.value) * k; return u.uC0.value.clone().lerp(u.uC1.value, u.uMove.value).addScaledVector(u.uX.value, Math.cos(ang) * u.uR.value).addScaledVector(u.uY.value, Math.sin(ang) * u.uR.value).addScaledVector(u.uH.value, k); };
  function ribbonsUpdate(dt) {
    for (const R0 of ribA.concat(ribN)) { if (!R0.on) continue; if (R0.delay > 0) { R0.delay -= dt; continue; } R0.mesh.visible = true; R0.t += dt; const k = R0.t / R0.dur, u = R0.u, o = R0.o;
      if (!o.full) u.uHead.value = k * (1 + u.uTail.value); u.uMove.value = Math.min(1, k); u.uOp.value = (o.op || 1) * Math.min(1, (1.25 - k) * 3);
      if (o.drops && Math.random() < busy()) { const hk = Math.min(1, u.uHead.value), hp = arcPos(R0, hk); for (let i = 0; i < o.drops; i++) {
          if (o.sty === 2) emit(hp, V3(rr(-30, 30), rr(10, 60), rr(-30, 30)), rr(.5, .9), rr(1.2, 2.4), 3, Math.random() < .5 ? '#ffffff' : o.col, 160);
          else if (o.sty === 1) { emit(hp, V3(rr(-14, 14), rr(10, 40), rr(-14, 14)), rr(.35, .6), rr(4, 7), 1, o.col, -20); if (Math.random() < .4) emit(hp, V3(rr(-50, 50), rr(20, 80), rr(-50, 50)), rr(.6, 1.1), 1.4, 5, '#ffb040', -10); }
          else if (o.sty === 3) { if (Math.random() < .3) bolt(hp, hp.clone().add(V3(rr(-10, 10), rr(-10, 10), rr(-10, 10))), o.col, .1, 2, 1); }
          else streak(hp, V3(rr(-40, 40), rr(-20, 40), rr(-40, 40)), rr(.25, .4), .06, 2, o.col); } }
      if (k >= 1.25) { R0.on = false; R0.mesh.visible = false; } }
  }

  // ═══ 충격파 고리(원피스·원펀맨 큰 주먹): 얇게 번쩍이는 테 + 안쪽 공기 일렁임, 빠르게 퍼지며 사라짐 ═══
  const SHVS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  const SHFS = 'uniform vec3 uC; uniform float uK; uniform float uT; varying vec2 vUv; float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){ vec2 q = vUv * 2. - 1.; float r = length(q), a = atan(q.y, q.x);' +
    ' float n = hh(vec2(floor(a * 40.), floor(uT * 30.))); float seg = smoothstep(.3, .6, hh(vec2(floor(a * 7. + uT * 2.), 3.))) * (.6 + .4 * hh(vec2(floor(a * 31.), 7.))); float edge = smoothstep(.86, .97, r) * smoothstep(1., .97, r) * seg; float inner = smoothstep(.3, .95, r) * (1. - smoothstep(.95, 1., r)) * .22; float streak = pow(abs(sin(a * 23. + n * 3.)), 18.) * smoothstep(.6, .98, r) * .5;' +
    ' gl_FragColor = vec4(mix(uC, vec3(1.), edge * .7), (edge * (.75 + .25 * n) + inner + streak) * (1. - uK)); }';
  const shocks = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color() }, uK: { value: 1 }, uT: FXT }, vertexShader: SHVS, fragmentShader: SHFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.visible = false; m.frustumCulled = false; m.renderOrder = 7; root.add(m); return { m, t: 0, dur: .4, r: 20, on: false }; });
  function shock(p, nrm, r, col = '#ffffff', dur = .4, delay = 0) { const s = shocks.find(x => !x.on) || shocks.reduce((a, b) => a.t / a.dur > b.t / b.dur ? a : b); s.on = true; s.t = -delay; s.dur = dur; s.r = r; s.m.position.copy(p);
    s.m.lookAt(p.clone().add(nrm || V3(0, 1, 0))); s.m.material.uniforms.uC.value.set(col); s.m.scale.setScalar(.01); s.m.visible = false; }
  function shocksUpdate(dt) { shocks.forEach(s => { if (!s.on) return; s.t += dt; if (s.t < 0) return; const k = s.t / s.dur; s.m.visible = true; s.m.scale.setScalar(Math.max(.01, s.r * (1 - Math.pow(1 - Math.min(1, k), 3)))); s.m.material.uniforms.uK.value = Math.min(1, k * k); if (k >= 1) { s.on = false; s.m.visible = false; } }); }

  // ═══ 빛기둥(필살기·등장 기둥): 딱딱한 원기둥 → 위로 흐르는 빛 결 + 가운데만 진한 부피감 + 위로 갈수록 사라짐 + 둘레에 오르는 빛 줄기 ═══
  const PLVS = 'varying vec3 vW; varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(normalMatrix * normal); vec4 mv = viewMatrix * w; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }';
  const PLFS = 'uniform vec3 uC; uniform float uOp; uniform float uT; uniform vec3 uO; varying vec3 vW; varying vec3 vN; varying vec3 vV; ' + NOISE + ' void main(){ vec3 d = vW - uO; float ang = atan(d.z, d.x), y = d.y;' +
    ' float face = abs(dot(normalize(vN), normalize(vV))); float n = fbm(vec2(ang * 2.2, y * .025 - uT * 2.4)), s = pow(fbm(vec2(ang * 7., y * .012 - uT * 3.5)), 3.) * 2.2;' +
    ' float hf = smoothstep(300., 30., y) * smoothstep(0., 8., y); float a = (pow(face, 1.6) * (.35 + .65 * n) + s * face) * hf; vec3 col = mix(uC * 1.1, vec3(1.), pow(face, 5.) * .55 + s * .3);' +
    ' gl_FragColor = vec4(col, clamp(a * uOp, 0., 1.)); }';
  const plGeo = new THREE.CylinderGeometry(1, 1, 320, 24, 1, true); plGeo.translate(0, 160, 0); plGeo.userData.shared = true;
  const plMat = (c, op) => { const m = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(c) }, uOp: { value: op }, uT: FXT, uO: { value: new THREE.Vector3() } }, vertexShader: PLVS, fragmentShader: PLFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    Object.defineProperty(m, 'opacity', { get() { return this.uniforms.uOp.value; }, set(v) { this.uniforms.uOp.value = v; }, configurable: true }); return m; };
  if (typeof makeFx === 'function') { const _mk = makeFx; makeFx = function (o) { if (o && o.k === 'dome' && !o.__fx3d) { o.__fx3d = 1; o.k = 'fx3none'; o.life = .01; } /* 공용 흰 반구(알 모양)는 뺌: 원작에 없음 */ if (!o || o.k !== 'pillar') return _mk.apply(this, arguments);
      const g = new THREE.Group(), w = o.w / 2, outer = new THREE.Mesh(plGeo, plMat(o.c, .9)), core = new THREE.Mesh(plGeo, plMat('#ffffff', .8));
      outer.scale.set(w, 1, w); core.scale.set(Math.max(.6, w * .28), 1, Math.max(.6, w * .28)); g.add(outer, core); outer.material.uniforms.uO.value.set(o.p.x, 0, o.p.z); core.material.uniforms.uO.value.set(o.p.x, 0, o.p.z); scene3.add(g);
      try { const k = busy(); for (let i = 0; i < 26 * k; i++) { const a = rr(0, 6.28), r = w * rr(.5, 1.3); streak(V3(o.p.x + Math.cos(a) * r, rr(0, 30), o.p.z + Math.sin(a) * r), V3(0, rr(260, 520), 0), rr(.4, .8), .1, rr(2, 4), Math.random() < .4 ? '#ffffff' : o.c, 0, rr(0, .5)); }
        shock(V3(o.p.x, 1, o.p.z), V3(0, 1, 0), w * 3.2, o.c, .5); dustRing(V3(o.p.x, 0, o.p.z), w * 1.4, 10 + w); } catch (e) { }
      return g; }; }

  // ═══ 3) 땅: 퍼져 자라는 균열(속이 달아오름) ═══
  const crackTex = Array.from({ length: 3 }, (_, vi) => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'lighter';
    const soot = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * .42); soot.addColorStop(0, 'rgba(0,255,0,1)'); soot.addColorStop(.35, 'rgba(0,150,0,.8)'); soot.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = soot; x.fillRect(0, 0, S, S);
    const paths = []; const branch = (px, py, ang, len, w, depth) => { let cx = px, cy = py; const pts = [[cx, cy]]; const steps = 6 + depth * 2;
      for (let i = 0; i < steps; i++) { ang += rr(-.5, .5); cx += Math.cos(ang) * len / steps; cy += Math.sin(ang) * len / steps; pts.push([cx, cy]);
        if (depth > 0 && Math.random() < .28) branch(cx, cy, ang + rr(-1.1, 1.1), len * rr(.35, .6), w * .55, depth - 1); }
      paths.push({ pts, w }); };
    const nb = 7 + vi * 2; for (let i = 0; i < nb; i++) branch(S / 2 + rr(-6, 6), S / 2 + rr(-6, 6), i / nb * Math.PI * 2 + rr(-.3, .3), S * rr(.28, .46), rr(3.5, 6), 2);
    for (let k = 0; k < 3; k++) { const r0 = S * (.12 + k * .1); x.beginPath(); for (let a = 0; a < 6.3; a += .35) { const rr2 = r0 * rr(.85, 1.15); a === 0 ? x.moveTo(S / 2 + Math.cos(a) * rr2, S / 2 + Math.sin(a) * rr2) : x.lineTo(S / 2 + Math.cos(a) * rr2, S / 2 + Math.sin(a) * rr2); } x.strokeStyle = 'rgba(255,0,0,.7)'; x.lineWidth = 1.6 - k * .4; if (k < 2) x.stroke(); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    const stroke = (st2, blur, mul) => paths.forEach(p => { x.beginPath(); p.pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.strokeStyle = st2; x.lineWidth = p.w * mul; x.shadowBlur = blur; x.shadowColor = st2; x.stroke(); });
    stroke('rgba(0,0,255,1)', 10, 2.6); x.shadowBlur = 0; stroke('rgba(255,0,0,1)', 0, 1);
    const t = new THREE.CanvasTexture(cv); return t; });
  const DVS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
  const DFS = `uniform sampler2D uTex; uniform float uRev; uniform float uGlow; uniform float uFade; uniform vec3 uGC; varying vec2 vUv;
    void main() { vec4 t = texture2D(uTex, vUv); float d = length(vUv - .5) * 2.; float rv = smoothstep(uRev, uRev - .1, d);
      float cr = t.r * rv, gl = t.b * rv * uGlow, so = t.g * rv * .5;
      vec3 col = mix(vec3(.05, .035, .022), vec3(.02, .012, .008), cr); col = mix(col, uGC * 1.7, clamp(gl * 1.3, 0., 1.)); col = mix(col, uGC * 2.2 + .3, cr * uGlow * .8);
      gl_FragColor = vec4(col, max(cr * .95, max(so, gl * .85)) * uFade); }`;
  const decals = Array.from({ length: 14 }, (_, i) => { const m = new THREE.ShaderMaterial({ uniforms: { uTex: { value: crackTex[i % 3] }, uRev: { value: 0 }, uGlow: { value: 0 }, uFade: { value: 0 }, uGC: { value: new THREE.Color('#ff6a20') } }, vertexShader: DVS, fragmentShader: DFS, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 - i * .1, polygonOffsetUnits: -2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = .09 + i * .012; mesh.visible = false; mesh.renderOrder = 2; root.add(mesh); return { mesh, m, on: false, t: 0, dur: 6, grow: .3, glowT: 1.2 }; });
  const GLOW = { fire: '#ff5a10', sun: '#ff5a10', kurama: '#ff6a10', blood: '#ff2a50', steam: '#ff6a40', bolt: '#9ad0ff', light: '#fff2a0', getsuga: '#8ac8ff', dark: '#a040ff', hollow: '#ff2020', psychic: '#40ff90', ice: '#a0e8ff', water: '#3a6a90', sound: '#ffb030' };
  function crack(p, r, ek, o = {}) { const d = decals.reduce((a, b) => (!a.on ? a : !b.on ? b : a.t / a.dur > b.t / b.dur ? a : b));
    d.on = true; d.t = 0; d.dur = o.dur || 7; d.grow = o.grow || (.18 + r * .004); d.glowT = o.glowT || 1.4; d.mesh.visible = true; d.mesh.position.x = p.x; d.mesh.position.z = p.z; d.mesh.rotation.z = rr(0, 6.28); d.mesh.scale.set(r * 2, r * 2, 1);
    d.m.uniforms.uGC.value.set(o.glow || GLOW[ek] || '#ff7a30'); d.glowAmt = o.glow === null ? 0 : (GLOW[ek] ? 1 : .55); return d; }
  function decalsUpdate(dt) { decals.forEach(d => { if (!d.on) return; d.t += dt; const u = d.m.uniforms; u.uRev.value = Math.min(1.08, Math.pow(d.t / d.grow, .6) * 1.08);
      u.uGlow.value = d.glowAmt * Math.max(0, 1 - d.t / d.glowT) * (.85 + Math.random() * .15); u.uFade.value = Math.min(1, (d.dur - d.t) / 1.6); if (d.t >= d.dur) { d.on = false; d.mesh.visible = false; } }); }

  // 떠오르는 바위(기를 모으면 주변 돌이 떠오름) — 미리 만든 묶음 그림 하나로
  const ROCKN = 90, rockM = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: 0, flatShading: true }), ROCKN); for (let i = 0; i < ROCKN; i++) rockM.setColorAt(i, new THREE.Color('#7a6650')); rockM.castShadow = true;
  rockM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); rockM.count = 0; rockM.frustumCulled = false; root.add(rockM); const rocks = [];
  const RCOL = ['#6a5640', '#7a6650', '#5a4836', '#8a7458'], _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
  function floatRocks(p, n, rad, dur = 1.6) { n = Math.round(n * busy()); for (let i = 0; i < n; i++) { if (rocks.length >= ROCKN) rocks.shift(); const a = rr(0, 6.28), d = rr(rad * .3, rad);
      rocks.push({ p: V3(p.x + Math.cos(a) * d, .4, p.z + Math.sin(a) * d), v: V3(0, rr(10, 26), 0), r: V3(rr(0, 6), rr(0, 6), rr(0, 6)), w: V3(rr(-2, 2), rr(-2, 2), rr(-2, 2)), s: rr(.5, 1.7), t: -rr(0, .35), hover: dur * rr(.7, 1.1), c: new THREE.Color(pick(RCOL)), life: dur + 2.2 }); } }
  function rocksUpdate(dt) { for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i]; r.t += dt; if (r.t > r.life) { rocks.splice(i, 1); continue; } if (r.t < 0) continue;
      if (r.t < r.hover) { r.p.y += r.v.y * dt * Math.max(.15, 1 - r.t / r.hover); r.p.x += Math.sin(r.t * 3 + i) * dt * 2; } else { r.v.y -= 300 * dt; r.p.y += r.v.y * dt * .4;
        if (r.p.y < r.s * .5) { r.p.y = r.s * .5; if (r.v.y < -40) { r.v.y *= -.3; if (Math.random() < .5) emit(V3(r.p.x, .6, r.p.z), V3(rr(-14, 14), rr(4, 12), rr(-14, 14)), .9, 6, 4, '#6a5a48'); } else r.v.y = 0; } }
      r.r.addScaledVector(r.w, dt); }
    rocks.forEach((r, i) => { const sink = Math.min(1, (r.life - r.t) / .6); _e.set(r.r.x, r.r.y, r.r.z); _q.setFromEuler(_e); _s.setScalar(Math.max(.01, r.s * sink)); _m4.compose(r.t < 0 ? V3(0, -50, 0) : r.p, _q, _s); rockM.setMatrixAt(i, _m4); rockM.setColorAt(i, r.c); });
    rockM.count = rocks.length; rockM.instanceMatrix.needsUpdate = true; if (rockM.instanceColor) rockM.instanceColor.needsUpdate = true; }

  // 흙먼지 고리·먼지 기둥·자갈
  const DUST = ['#7a6450', '#8a7460', '#6a5644', '#9a8470'];
  function dustRing(p, r, n) { n = Math.round(n * busy()); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rr(-.1, .1), s = rr(60, 120) * (r / 20);
      emit(V3(p.x + Math.cos(a) * r * .25, rr(.8, 3), p.z + Math.sin(a) * r * .25), V3(Math.cos(a) * s, rr(4, 18), Math.sin(a) * s), rr(1, 1.8), rr(7, 13) * (.6 + r / 40), 4, pick(DUST)); } }
  function dustCol(p, h, n) { n = Math.round(n * busy()); for (let i = 0; i < n; i++) emit(V3(p.x + rr(-4, 4), rr(1, 6), p.z + rr(-4, 4)), V3(rr(-12, 12), rr(30, 30 + h * 1.6), rr(-12, 12)), rr(1.6, 2.6), rr(9, 16), 2, pick(['#6a5e52', '#7e7064', '#5a4e44']), -2); }
  function gravel(p, n, sp = 1) { n = Math.round(n * busy()); for (let i = 0; i < n; i++) { const a = rr(0, 6.28), s = rr(40, 110) * sp; streak(V3(p.x, rr(.5, 3), p.z), V3(Math.cos(a) * s, rr(70, 170) * sp, Math.sin(a) * s), rr(.7, 1.2), .05, rr(1.5, 3), pick(['#8a6a48', '#a0805a', '#6a5038']), 320); } }
  let lastG = 0;
  function ground(p, pw, ek, dir) { // pw: 1(보통)~3.5(필살)
    if (!p || p.y > 30) return; const t = now(); if (t - lastG < .1 && pw < 2.4) return; lastG = t;
    const g = V3(p.x, 0, p.z), env = window.__env;
    crack(g, 9 + pw * 9, ek, { glow: GLOW[ek] ? undefined : (pw > 2 ? '#ff7a30' : null) });
    dustRing(g, 10 + pw * 8, 14 + pw * 10); gravel(g, 8 + pw * 8, .8 + pw * .2);
    if (pw >= 1.8) dustCol(g, 40 + pw * 25, 6 + pw * 5);
    if (pw >= 2.2 && env && typeof env.chunk === 'function') { env.chunk(g, Math.round(4 + pw * 3), .8 + pw * .25, ek); if (Math.random() < .5) floatRocks(g, 6 + pw * 3, 12 + pw * 6, .25); }
    if (ek === 'fire' || ek === 'sun' || ek === 'kurama') for (let i = 0; i < 6 * pw * busy(); i++) emit(V3(g.x + rr(-6, 6) * pw, 1, g.z + rr(-6, 6) * pw), V3(rr(-6, 6), rr(14, 40), rr(-6, 6)), rr(.6, 1.2), rr(4, 7), 1, '#ff5a10', -10, rr(0, .5));
    if (ek === 'water') for (let i = 0; i < 18 * busy(); i++) { const a = rr(0, 6.28); emit(V3(g.x, 1, g.z), V3(Math.cos(a) * rr(30, 90), rr(60, 150), Math.sin(a) * rr(30, 90)), rr(.6, 1), rr(1.5, 2.6), 3, '#bfe6ff', 260); }
  }

  // ═══ 속성별 사실감 있는 타격 ═══
  const FLAME = new Set(['fire', 'sun', 'kurama', 'steam', 'blood']);
  function elemBurst(p, ek, k = 1) {
    const E = (typeof ELEM !== 'undefined' && ELEM[ek]) || { c: '#ffffff', parts: ['#ffffff'] }, c = E.c; k *= busy();
    if (FLAME.has(ek)) { for (let i = 0; i < 22 * k; i++) emit(p.clone().add(V3(rr(-3, 3), rr(-3, 3), rr(-3, 3))), V3(rr(-55, 55), rr(-10, 70), rr(-55, 55)), rr(.45, .8), rr(5, 10), 1, pick(E.parts.slice(1)), -40);
      for (let i = 0; i < 12 * k; i++) emit(p, V3(rr(-90, 90), rr(20, 120), rr(-90, 90)), rr(.7, 1.3), rr(1, 1.8), 5, '#ffa040', 60);
      for (let i = 0; i < 7 * k; i++) emit(p.clone().add(V3(0, 4, 0)), V3(rr(-14, 14), rr(20, 45), rr(-14, 14)), rr(1.4, 2.2), rr(9, 14), 2, '#3a3230', -4, rr(.1, .3)); }
    else if (ek === 'bolt' || ek === 'light' || ek === 'getsuga' || ek === 'sound') { const n = ek === 'light' ? 2 : 3; for (let i = 0; i < n; i++) bolt(p, p.clone().add(V3(rr(-22, 22), rr(-14, 18), rr(-22, 22))), c, rr(.12, .22), 3, 2, .28);
      for (let i = 0; i < 22 * k; i++) { const v = V3(rr(-1, 1), rr(-.4, 1), rr(-1, 1)).normalize().multiplyScalar(rr(90, 220)); streak(p, v, rr(.2, .4), .05, rr(1.5, 3), Math.random() < .5 ? '#ffffff' : c, 60); } }
    else if (ek === 'water') { for (let i = 0; i < 30 * k; i++) { const v = V3(rr(-1, 1), rr(.1, 1.1), rr(-1, 1)).normalize().multiplyScalar(rr(50, 130)); emit(p, v, rr(.6, 1.1), rr(1.2, 2.6), 3, Math.random() < .4 ? '#ffffff' : pick(E.parts), 260); }
      for (let i = 0; i < 14 * k; i++) streak(p, V3(rr(-1, 1), rr(0, 1), rr(-1, 1)).normalize().multiplyScalar(rr(80, 160)), rr(.3, .5), .06, rr(1.5, 3), '#d8f0ff', 260);
      for (let i = 0; i < 6 * k; i++) emit(p, V3(rr(-20, 20), rr(5, 25), rr(-20, 20)), rr(.8, 1.3), rr(8, 13), 2, '#d8e8f4', -2); }
    else if (ek === 'ice') { for (let i = 0; i < 20 * k; i++) streak(p, V3(rr(-1, 1), rr(-.2, 1), rr(-1, 1)).normalize().multiplyScalar(rr(70, 170)), rr(.4, .7), .04, rr(2, 3.5), pick(['#ffffff', '#c8f0ff', '#8ad0ff']), 200);
      for (let i = 0; i < 8 * k; i++) emit(p, V3(rr(-25, 25), rr(0, 20), rr(-25, 25)), rr(1, 1.6), rr(9, 15), 2, '#e8f6ff', -1); }
    else if (ek === 'dark' || ek === 'hollow') { for (let i = 0; i < 16 * k; i++) emit(p.clone().add(V3(rr(-4, 4), rr(-4, 4), rr(-4, 4))), V3(rr(-40, 40), rr(0, 50), rr(-40, 40)), rr(.6, 1.1), rr(6, 11), 7, c, -20);
      for (let i = 0; i < 12 * k; i++) streak(p, V3(rr(-1, 1), rr(-.5, 1), rr(-1, 1)).normalize().multiplyScalar(rr(80, 170)), rr(.25, .45), .06, 2.5, c, 0); }
    else if (ek === 'earth' || ek === 'sand') { for (let i = 0; i < 14 * k; i++) emit(p, V3(rr(-50, 50), rr(0, 50), rr(-50, 50)), rr(1, 1.6), rr(7, 12), 4, pick(E.parts), 40); gravel(p, 14 * k); }
    else if (ek === 'petal' || ek === 'insect') { for (let i = 0; i < 24 * k; i++) emit(p, V3(rr(-80, 80), rr(-10, 80), rr(-80, 80)), rr(.9, 1.5), rr(2.4, 3.6), 6, pick(E.parts.slice(1)), 20); }
    else if (ek === 'wind' || ek === 'psychic' || ek === 'room' || ek === 'mist' || ek === 'power') { for (let i = 0; i < 18 * k; i++) { const a = rr(0, 6.28), r0 = rr(2, 6), tng = V3(-Math.sin(a), rr(-.3, .5), Math.cos(a)); streak(p.clone().add(V3(Math.cos(a) * r0, rr(-3, 3), Math.sin(a) * r0)), tng.multiplyScalar(rr(120, 220)), rr(.18, .3), .07, rr(1.4, 2.6), Math.random() < .5 ? '#ffffff' : c, 0); }
      for (let i = 0; i < 5 * k; i++) emit(p, V3(rr(-30, 30), rr(0, 20), rr(-30, 30)), rr(.6, 1), rr(8, 12), 2, ek === 'psychic' ? '#bfffd8' : '#e8f0f8', 0); }
    else { // 쇠·칼날·주먹: 불똥 비 + 공기 파열
      for (let i = 0; i < 24 * k; i++) streak(p, V3(rr(-1, 1), rr(-.2, 1.1), rr(-1, 1)).normalize().multiplyScalar(rr(110, 260)), rr(.35, .7), .045, rr(1.2, 2.4), pick(['#fff4d0', '#ffd070', '#ffb040']), 380);
      for (let i = 0; i < 4 * k; i++) emit(p, V3(rr(-20, 20), rr(-5, 20), rr(-20, 20)), rr(.5, .8), rr(6, 10), 2, '#c8c0b8', 0); }
    emit(p, V3(), .22, 26 * k + 10, 0, c); emit(p, V3(), .12, 14, 0, '#ffffff'); // 번쩍(겹 광채)
  }

  // ═══ 4) 원래 함수 감싸기 ═══
  const _hit = hitFx; hitFx = function (v, ek) { const r = _hit.apply(this, arguments); try { if (v && v.pos && st.hits++ < 9999) elemBurst(chest(v), ek || 'metal'); } catch (e) { console.error(e); } return r; };
  const _ex = explode; explode = function (p, ek, pw = 1) { const r = _ex.apply(this, arguments); try { if (p) { elemBurst(p, ek, Math.min(2, pw)); if (pw >= 1.2) ground(p, Math.min(3.2, pw * 1.1), ek); } } catch (e) { console.error(e); } return r; };
  const _ult = ultBlast; ultBlast = function (p, ek, rad) { const r = _ult.apply(this, arguments); try { if (p) { elemBurst(p, ek, 2); ground(p, Math.max(2.6, Math.min(3.5, (rad || 60) / 20)), ek); } } catch (e) { console.error(e); } return r; };
  const _res = resolve; resolve = function (a, b, ek, o, nm, pw = 1, at) { const r = _res.apply(this, arguments); try { if (b && b.pos && (o === 'hit' || o === 'sub') && pw >= 1.6 && b.pos.y < 20) ground(b.pos, Math.min(2.6, pw), ek || (a && a.elem) || 'earth');
      if (nm && window.FX3 && FX3.onHit) FX3.onHit(a, b, nm, ek, o, at || (b && b.pos ? chest(b) : null), pw); } catch (e) { console.error(e); } return r; };
  const _call = callout; callout = function (f, text, ult) { try { const s = styOfName(text || ''); st.sty = s; st.styUntil = now() + 2.4; } catch (e) { } const r = _call.apply(this, arguments);
    try { if (window.FX3 && FX3.onCast) FX3.onCast(f, text || '', ult); if (ult && f && f.pos && f.pos.y < 15) { floatRocks(f.pos, 10, 26, 1.4); crack(f.pos, 16, f.elem || 'earth', { glow: f.elem && GLOW[f.elem] ? undefined : null, grow: .5, dur: 5 }); dustRing(f.pos, 18, 22); } } catch (e) { console.error(e); } return r; };

  // 날아가는 투사체 꼬리(모든 기술): 빠르게 움직이는 에너지 묶음 뒤로 속성 결의 잔상
  const fxInfo = new WeakMap();
  function infoOf(o) { let inf = fxInfo.get(o); if (inf) return inf; let mat = null, body = false; o.traverse(x => { const m = x.material; if (!m) return; if (m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshStandardMaterial) body = true; if (!mat && m.uniforms && m.uniforms.uC && m.uniforms.uSty) mat = m; });
    inf = mat && !body ?{ c: '#' + mat.uniforms.uC.value.getHexString(), s: mat.uniforms.uSty.value, last: o.position.clone(), ok: true } : { ok: false }; fxInfo.set(o, inf); return inf; }
  let trailAcc = 0;
  function trails(dt) { trailAcc += dt; if (trailAcc < (busy() < .9 ? 1 / 16 : 1 / 32)) return; const d = trailAcc; trailAcc = 0; const ch = scene3.children, k = busy();
    for (let i = 0; i < ch.length; i++) { const o = ch[i]; if (o === root || !o.visible || o.isLight || o.isCamera) continue; if (o.userData.fx3no) continue; const inf = infoOf(o); if (!inf.ok) { if (!o.isGroup && !o.isMesh) o.userData.fx3no = true; continue; }
      _v.copy(o.position).sub(inf.last); const sp = _v.length() / d; inf.last.copy(o.position); if (sp < 120 || sp > 4000) continue; const back = _v.clone().multiplyScalar(-1 / d * .15);
      const n = 1;
      for (let j = 0; j < n; j++) { _p.copy(o.position).add(V3(rr(-1.5, 1.5), rr(-1.5, 1.5), rr(-1.5, 1.5)));
        if (inf.s === 1) emit(_p, back.clone().add(V3(rr(-8, 8), rr(5, 20), rr(-8, 8))), rr(.3, .5), rr(4, 7), 1, inf.c, -20);
        else if (inf.s === 2) emit(_p, back.clone().add(V3(rr(-15, 15), rr(0, 20), rr(-15, 15))), rr(.4, .7), rr(1.2, 2.2), 3, Math.random() < .5 ? '#ffffff' : inf.c, 200);
        else if (inf.s === 4) emit(_p, back, rr(.4, .7), rr(4, 7), 7, inf.c, -10);
        else if (inf.s === 3) { if (Math.random() < .25) bolt(o.position.clone(), o.position.clone().add(_v.clone().normalize().multiplyScalar(-rr(8, 18))).add(V3(rr(-5, 5), rr(-5, 5), rr(-5, 5))), inf.c, .08, 2, 0); streak(_p, back, .2, .08, 2, inf.c); }
        else { streak(_p, back.multiplyScalar(.6), rr(.18, .3), .07, rr(2, 3.5), inf.c); emit(_p, V3(), rr(.18, .3), rr(4, 7), 0, inf.c); } } }
  }

  // 착지(높은 곳에서 떨어짐): 둥근 균열 + 먼지 고리
  function landings() { if (typeof F === 'undefined') return; F.forEach(f => { const was = f.__fx3air, vy = f.__fx3vy || 0; f.__fx3air = !!f.air; f.__fx3vy = f.vel ? f.vel.y : 0;
      if (was && !f.air && vy < -150 && f.pos.y < 3) { const pw = Math.min(3, (-vy - 100) / 80); crack(f.pos, 7 + pw * 7, f.elem || 'earth', { glow: null, grow: .15, dur: 4.5 }); dustRing(f.pos, 8 + pw * 6, 12 + pw * 8); if (pw > 1.2) gravel(f.pos, 10 * pw, .7); } }); }

  // ═══ 매 장면 ═══
  const _env = envUpdate;
  envUpdate = function (dt, t) { _env(dt, t); const t0 = performance.now();
    try { keepRoot(); dayTick(); if (st.lite !== undefined) LITE.value = st.lite; else if (typeof getQuality === 'function' && getQuality() !== 'high') LITE.value = 1; else if (typeof ftAvg !== "undefined") LITE.value = ftAvg > 19 ? 1 : ftAvg < 16.5 ? 0 : LITE.value; /* 중간·낮음은 가벼운 잡음 */ NOW.value += Math.min(Math.max(dt, 0), .1); /* 화면 시간(정지·느린 화면도 따라감) */ const cv = renderer.domElement; RES.value.set(cv.width, cv.height); SCALE.value = cv.height * .5 / Math.tan(camera.fov * Math.PI / 360);
      bolts.forEach(b => { if (b.life <= 0) return; b.life -= dt; b.regen -= dt; if (b.life <= 0) { b.mesh.visible = false; return; } b.mesh.material.uniforms.uOp.value = Math.min(1, b.life / b.max * 2.2) * (.75 + Math.random() * .25); if (b.regen <= 0) { b.regen = .045; buildBolt(b); } });
      ribbonsUpdate(dt); shocksUpdate(dt); decalsUpdate(dt); rocksUpdate(dt); if (!st.noTrail && !(typeof ftAvg !== "undefined" && ftAvg > 21)) trails(dt); landings(); if (window.FX3 && FX3.tick) FX3.tick(dt);
      PA.flush(); PN.flush(); Streaks.flush(); } catch (e) { console.error(e); }
    st.ms = st.ms * .95 + (performance.now() - t0) * .05; };

  // 처음 쓸 때 셰이더 번역으로 멈칫하지 않게 미리 번역(보이지 않는 것도 잠깐 켜서)
  setTimeout(() => { try { const hid = []; root.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } }); const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), addMat('#ff8a20', 0)); m.position.set(0, -500, 0); root.add(m);
      renderer.compile(scene3, camera); root.remove(m); m.geometry.dispose(); hid.forEach(o => o.visible = false); } catch (e) { console.error(e); } }, 300);
  // 다른 파일(fx3-skills.js)이 쓰는 도구
  setTimeout(() => root.traverse(o => { if (o.material && !o.userData.noReg) regAdd(o.material); }), 0); // 내 가산 재질도 낮/밤 전환
  window.FX3 = { DAY, regAdd, emit, streak, bolt, arc, shock, crack, ground, floatRocks, dustRing, dustCol, gravel, elemBurst, styOfName, GLOW, busy, now, rr };
})();
