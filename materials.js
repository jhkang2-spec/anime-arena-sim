// 재질 고도화 (materials) — 소유자 11-05: "텍스처 2단계 이상, 찰흙 같아"
// 원인: 인물은 무광 단색 툰 재질(빛 단계 2개·결·반사 없음), 바위는 정점색만, 톤매핑·환경 반사 없음.
// 방식: 다른 파일은 고치지 않고 씬을 주기적으로 훑어 재질에 셰이더 조각을 덧붙인다(이펙트 재질은 건드리지 않음).
//  · 인물(mocap 몸·옷·머리): 미세 결(직물 짜임·노이즈) 범프 + 색 얼룩 + 림라이트 + 부드러운 반사광, 머리카락은 이방성 띠, 피부는 붉은 기·부드러운 음영
//  · 바위·절벽·바닥: 절차 생성 법선·거칠기 텍스처(삼면 투영), 하늘 환경 반사(PMREM)
//  · 조명: 바위 셰이더 안 ACES 근사 톤 곡선(전역 톤매핑은 이펙트 색을 흔들어 안 씀)
//  · 품질: setQuality 낮음=결 끔·림만 / 중간 / 높음=결 세게
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined' || typeof renderer === 'undefined') return;
  const MT = window.MATUP = { on: true, n: 0, ms: 0 };
  try { MT.on = localStorage.getItem('arenaMatUp') !== '0'; } catch (e) { }
  const U = { uDetail: { value: .75 }, uRim: { value: .55 }, uSpec: { value: .35 } };
  const qset = q => { U.uDetail.value = q === 'low' ? 0 : q === 'high' ? 1 : .75; U.uRim.value = q === 'low' ? .35 : .55; U.uSpec.value = q === 'low' ? .2 : .35; };
  try { qset(localStorage.getItem('arenaQuality') || 'mid'); } catch (e) { qset('mid'); }
  if (typeof window.setQuality === 'function') { const _q = window.setQuality; window.setQuality = function (q) { const r = _q.apply(this, arguments); qset(r || q); return r; }; }

  // ── 공용 GLSL: 값 노이즈·직물 짜임 ──
  const NOISE = `
    float mtH(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float mtN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(mtH(i), mtH(i + vec3(1,0,0)), f.x), mix(mtH(i + vec3(0,1,0)), mtH(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(mtH(i + vec3(0,0,1)), mtH(i + vec3(1,0,1)), f.x), mix(mtH(i + vec3(0,1,1)), mtH(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float mtWeave(vec3 p){ float a = sin(p.x * 9.0 + p.z * 4.0) * sin(p.y * 9.0 - p.z * 3.0); return a * .5 + .5; }`;

  // ── 인물 재질(툰) 덧붙이기 — 2단계 ──
  // kind: 0 옷·몸(색으로 면·데님·가죽·금속 자동 구분), 1 피부, 2 머리카락, 4 하오리·코트 자락(비단)
  // 옷 결은 조각마다 바탕색(정점색 포함)으로 고른다: 파란 중채도=데님(능직 사선), 아주 어두움=가죽(오돌토돌·광택), 회색 중간 밝기=금속(헤어라인·강한 반사), 나머지=면(평직)
  function patchToon(m, kind) {
    if (m.userData.matUp) return; m.userData.matUp = 1; MT.n++;
    m.extensions = m.extensions || {}; m.extensions.derivatives = true;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U); sh.uniforms.uKind = { value: kind };
      const FB = window.ENVTEX && window.ENVTEX.fabric; /* env-assets.js 실사 천·가죽 결(ambientCG CC0) */
      sh.uniforms.uFab = { value: FB ? 1 : 0 }; sh.uniforms.uFabC = { value: FB ? FB.cotton : null }; sh.uniforms.uFabD = { value: FB ? FB.denim : null }; sh.uniforms.uFabL = { value: FB ? FB.leather : null };
      sh.vertexShader = 'varying vec3 vMtW; varying vec3 vMtNW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vMtW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMtNW = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = 'uniform float uDetail, uRim, uSpec; uniform int uKind; uniform float uFab; uniform sampler2D uFabC; uniform sampler2D uFabD; uniform sampler2D uFabL; varying vec3 vMtW; varying vec3 vMtNW;\n' + NOISE + `
        float mtTri(sampler2D t, vec3 p){ vec3 b = pow(abs(vMtNW), vec3(4.0)); b /= (b.x + b.y + b.z); return texture2D(t, p.zy).g * b.x + texture2D(t, p.xz).g * b.y + texture2D(t, p.xy).g * b.z; }
        int mtCloth(vec3 c){ float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), lum = dot(c, vec3(.299, .587, .114)), sat = mx - mn;
          if (c.b > c.r + .06 && c.b >= c.g && sat > .12 && lum < .62) return 1;   // 데님
          if (lum < .16) return 2;                                                  // 가죽·검은 천
          if (sat < .07 && lum > .22 && lum < .62) return 3;                        // 금속
          return 0; }                                                               // 면
        float mtHeight(int ck, vec3 p){
          float h = mtWeave(p * .55) * .6 + mtN(p * 1.6) * .4;                                    // 평직(기본)
          if (ck == 1) h = sin((p.x + p.y) * 7.0 + mtN(p * 3.0) * 1.5) * .5 + .5;              // 능직 사선
          if (ck == 2) { float c = mtN(p * 3.2); h = c * c; }                                     // 오돌토돌 가죽
          if (uFab > .5) { if (ck == 0) h = mix(h, mtTri(uFabC, p * .09), .7); else if (ck == 1) h = mix(h, mtTri(uFabD, p * .09), .7); else if (ck == 2) h = mix(h, mtTri(uFabL, p * .07), .75); } /* 실사 천·가죽 결 */
          if (ck == 3) h = sin(p.y * 26.0 + mtN(p * .8) * 2.0) * .15 + .5;                        // 헤어라인
          return h; }
        float mtFold(vec3 p, vec3 nw){ // 접힘 음영: 아래로 흐르는 주름(세로 골)과 팔꿈치·무릎 가로 주름 근사
          float v = abs(sin(p.x * .9 + p.z * .9 + mtN(p * .25) * 5.0)), h = abs(sin(p.y * 1.6 + mtN(p * .35) * 4.0));
          return mix(1.0, .8, (1.0 - smoothstep(.0, .22, v)) * .6 + (1.0 - smoothstep(.0, .12, h)) * .25 * (1.0 - abs(nw.y))); }
        ` + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          int ck = mtCloth(diffuseColor.rgb);
          { float n1 = mtN(vMtW * .45), n2 = mtN(vMtW * 2.5);
            if (uKind == 1) diffuseColor.rgb *= 1.0 + (n1 - .5) * .05 * uDetail;
            else if (uKind == 2) diffuseColor.rgb *= .9 + .2 * n2 * uDetail;
            else if (uKind == 4) diffuseColor.rgb *= mix(1.0, mtFold(vMtW, vMtNW), uDetail) * (1.0 + (n1 - .5) * .05 * uDetail);   // 비단 자락: 결은 약하게, 접힘만
            else { diffuseColor.rgb *= 1.0 + (n1 - .5) * (ck == 1 ? .2 : .1) * uDetail;                                      // 데님은 물 빠짐 얼룩 크게
                   if (ck != 3) diffuseColor.rgb *= mix(1.0, mtFold(vMtW, vMtNW), uDetail * .8); } }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          if (uDetail > .0) {
            int k2 = uKind == 0 ? ck : -1;
            float hgt = uKind == 1 ? mtN(vMtW * .8) * .25 : uKind == 2 ? sin(vMtW.y * 9.0 + mtN(vMtW * 1.2) * 6.0) * .5 + .5 : uKind == 4 ? mtN(vMtW * .6) * .3 : mtHeight(k2, vMtW);
            float bs = uKind == 1 ? .05 : uKind == 4 ? .05 : (k2 == 1 ? .16 : k2 == 2 ? .14 : k2 == 3 ? .06 : .12);
            vec3 mtDx = dFdx(-vViewPosition), mtDy = dFdy(-vViewPosition); float mtHx = dFdx(hgt), mtHy = dFdy(hgt);
            vec3 mtR1 = cross(mtDy, normal), mtR2 = cross(normal, mtDx); float mtDet = dot(mtDx, mtR1);
            vec3 mtG = sign(mtDet) * (mtHx * mtR1 + mtHy * mtR2); normal = normalize(abs(mtDet) * normal - mtG * bs * uDetail); }`)
        .replace('#include <output_fragment>', `
          { vec3 V = normalize(vViewPosition); float ndv = clamp(dot(normal, V), 0.0, 1.0), fr = pow(1.0 - ndv, 3.0);
            vec3 L = normalize(vec3(.35, .8, .45)); vec3 Hh = normalize(L + V); float ndh = max(dot(normal, Hh), 0.0);
            vec3 rimC = uKind == 1 ? vec3(1.0, .72, .6) : vec3(.85, .9, 1.0);
            outgoingLight += rimC * fr * uRim * (uKind == 2 ? .6 : .45) * (diffuseColor.rgb + .25);
            float sp;
            if (uKind == 2) { float y = dot(normal, vec3(0.0, 1.0, 0.0)) + (mtN(vMtW * 2.0) - .5) * .12;           // 머리카락 2겹 띠: 흰 주 띠 + 머리색 보조 띠
              sp = pow(max(0.0, 1.0 - abs(y - .55) * 6.0), 2.0) * .55;
              outgoingLight += diffuseColor.rgb * pow(max(0.0, 1.0 - abs(y - .22) * 4.0), 2.0) * .45 * uSpec; }
            else if (uKind == 1) { sp = pow(ndh, 30.0) * .18;
              float lit = clamp(dot(outgoingLight, vec3(.33)), 0.0, 1.0);                                              // 피부 속 빛 번짐 근사: 그늘 경계에 붉은 기
              outgoingLight += vec3(.16, .05, .03) * (1.0 - lit) * smoothstep(.0, .6, lit + .3) * uDetail;
              outgoingLight += vec3(.9, .35, .25) * pow(1.0 - ndv, 2.0) * .12 * uDetail; }
            else if (uKind == 4) sp = pow(max(0.0, 1.0 - abs(dot(normal, vec3(0.0, 1.0, 0.0)) - .3) * 3.0), 3.0) * .3 + pow(ndh, 24.0) * .2; // 비단 광택
            else if (ck == 3) { sp = pow(ndh, 60.0) * 1.1 + pow(ndh, 8.0) * .25;                                     // 금속: 강한 반사 + 하늘 반사 근사
              outgoingLight = mix(outgoingLight, outgoingLight * .55 + mix(vec3(.45, .38, .3), vec3(.75, .82, .95), normal.y * .5 + .5) * .45, .6); }
            else if (ck == 2) sp = pow(ndh, 40.0) * .45;                                                                // 가죽 광택
            else if (ck == 1) sp = pow(ndh, 10.0) * .08;                                                                // 데님 무광
            else sp = pow(ndh, 18.0) * .18;
            outgoingLight += vec3(1.0, .98, .94) * sp * uSpec;
            if (uKind == 1) outgoingLight = mix(outgoingLight, outgoingLight * vec3(1.06, .97, .95), .5); }
          #include <output_fragment>`);
    };
    m.needsUpdate = true;
  }

  // ── 눈: 눈동자 하이라이트·반사(원판 UV 기준) ──
  function patchEye(m) {
    if (!m || m.userData.matUp) return; m.userData.matUp = 1; MT.n++;
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec2 vMtUv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMtUv = uv;');
      sh.fragmentShader = 'varying vec2 vMtUv;\n' + sh.fragmentShader.replace('#include <output_fragment>', `
        { vec2 q = vMtUv - .5; float r = length(q);
          outgoingLight *= mix(.55, 1.15, smoothstep(.5, -.1, q.y + .15));                          // 위쪽 그늘(속눈썹 그림자)·아래 밝음
          outgoingLight = mix(outgoingLight, outgoingLight * .35, smoothstep(.14, .02, r));           // 동공
          outgoingLight += vec3(1.0) * smoothstep(.1, .05, length(q - vec2(-.14, .16))) * .95;        // 큰 하이라이트
          outgoingLight += vec3(1.0) * smoothstep(.05, .02, length(q - vec2(.12, -.12))) * .7; }      // 작은 반사
        #include <output_fragment>`);
    };
    m.needsUpdate = true;
  }

  // ── 흙 바닥(순회 방식): 젖은 얼룩·자갈 범프·균열 ──
  function patchGround(m) {
    if (m.userData.matUp) return; m.userData.matUp = 1; MT.n++; m.envMapIntensity = .12; // 하늘 반사가 바닥 전체를 하얗게 덮지 않게
    m.extensions = m.extensions || {}; m.extensions.derivatives = true;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vMtW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vMtW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uDetail; varying vec3 vMtW;\n' + NOISE + '\n float mtWet; \n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          { mtWet = smoothstep(.62, .78, mtN(vMtW * .045)) * uDetail;
            diffuseColor.rgb *= 1.0 - .32 * mtWet;                                                   // 젖은 얼룩
            float cr = 1.0 - smoothstep(.0, .035, abs(mtN(vMtW * .07 + 3.1) - .5));                   // 균열 선
            diffuseColor.rgb *= 1.0 - .35 * cr * uDetail;
            float pb = smoothstep(.8, .86, mtN(vMtW * 2.3)); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.18 + .03, pb * .5 * uDetail); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          if (uDetail > .0) { float hgt = smoothstep(.78, .9, mtN(vMtW * 2.3)) * .6 + mtN(vMtW * 4.0) * .2 - (1.0 - smoothstep(.0, .035, abs(mtN(vMtW * .07 + 3.1) - .5))) * .6;
            vec3 mtDx = dFdx(-vViewPosition), mtDy = dFdy(-vViewPosition); float mtHx = dFdx(hgt), mtHy = dFdy(hgt);
            vec3 mtR1 = cross(mtDy, normal), mtR2 = cross(normal, mtDx); float mtDet = dot(mtDx, mtR1);
            vec3 mtG = sign(mtDet) * (mtHx * mtR1 + mtHy * mtR2); normal = normalize(abs(mtDet) * normal - mtG * .22 * uDetail); }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor *= 1.0 - .55 * mtWet;`);
    };
    m.needsUpdate = true;
  }

  // ── 바위·절벽: 법선·거칠기 절차 텍스처 ──
  function canvasTex(sz, draw) { const c = document.createElement('canvas'); c.width = c.height = sz; draw(c.getContext('2d'), sz); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
  function heightField(sz, seed) { const h = new Float32Array(sz * sz); let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let o = 0; o < 5; o++) { const n = 4 << o, g = []; for (let i = 0; i <= n; i++) { g[i] = []; for (let j = 0; j <= n; j++) g[i][j] = rnd(); } for (let j = 0; j <= n; j++) g[n][j] = g[0][j]; for (let i = 0; i <= n; i++) g[i][n] = g[i][0];
      const amp = 1 / (1 << o); for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const fx = x / sz * n, fy = y / sz * n, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        h[y * sz + x] += amp * ((g[ix][iy] * (1 - sx) + g[ix + 1][iy] * sx) * (1 - sy) + (g[ix][iy + 1] * (1 - sx) + g[ix + 1][iy + 1] * sx) * sy); } }
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) h[y * sz + x] += Math.max(0, Math.sin(y / sz * Math.PI * 14 + h[y * sz + x] * 4)) * .25; // 층리
    return h; }
  function normalTex(h, sz, k) { return canvasTex(sz, (x, s) => { const im = x.createImageData(s, s); for (let y = 0; y < s; y++) for (let i = 0; i < s; i++) {
    const dx = (h[y * s + (i + 1) % s] - h[y * s + (i - 1 + s) % s]) * k, dy = (h[((y + 1) % s) * s + i] - h[((y - 1 + s) % s) * s + i]) * k, l = Math.hypot(dx, dy, 1), p = (y * s + i) * 4;
    im.data[p] = (-dx / l * .5 + .5) * 255; im.data[p + 1] = (-dy / l * .5 + .5) * 255; im.data[p + 2] = (1 / l * .5 + .5) * 255; im.data[p + 3] = 255; } x.putImageData(im, 0, 0); }); }
  function roughTex(h, sz) { return canvasTex(sz, (x, s) => { const im = x.createImageData(s, s); for (let p = 0; p < s * s; p++) { const v = 170 + (h[p] - 1) * 60; im.data[p * 4] = im.data[p * 4 + 1] = im.data[p * 4 + 2] = Math.max(90, Math.min(255, v)); im.data[p * 4 + 3] = 255; } x.putImageData(im, 0, 0); }); }
  const TEX = {}; function rockTex(q) { const sz = q === 'high' ? 512 : 256; if (TEX[sz]) return TEX[sz]; const h = heightField(sz, 7); return (TEX[sz] = { n: normalTex(h, sz, sz / 64), r: roughTex(h, sz) }); }
  function patchRock(m) {
    if (m.userData.matUp) return; m.userData.matUp = 1; MT.n++;
    const E = window.ENVTEX && window.ENVTEX.rock; /* env-assets.js 실사 바위 텍스처(CC0)가 있으면 그것, 없으면 절차 생성 */
    const t = E ? { n: E.nor, r: E.arm } : rockTex(window.getQuality ? window.getQuality() : 'mid'); m.normalMap = t.n; m.normalScale = new THREE.Vector2(1.1, 1.1); m.roughnessMap = t.r; m.roughness = 1; m.flatShading = false; m.envMapIntensity = .35;
    m.onBeforeCompile = sh => { // UV 없는 바위도 결이 나오도록 삼면 투영으로 법선·거칠기 읽기 + 이끼·먼지 색 변화
      Object.assign(sh.uniforms, U); sh.uniforms.uAlb = { value: E ? E.diff : t.n }; sh.uniforms.uReal = { value: E ? 1 : 0 }; sh.uniforms.uSc = { value: E ? 1 / 38 : .12 };
      sh.vertexShader = 'varying vec3 vMtW; varying vec3 vMtN;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vMtW = (modelMatrix * vec4(transformed, 1.0)).xyz; vMtN = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = 'uniform float uDetail; uniform sampler2D uAlb; uniform float uReal; uniform float uSc; varying vec3 vMtW; varying vec3 vMtN;\n' + NOISE + '\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (uReal > .5) { vec3 bb = pow(abs(vMtN), vec3(4.0)); bb /= (bb.x + bb.y + bb.z);
            vec3 alb = texture2D(uAlb, vMtW.zy * uSc).rgb * bb.x + texture2D(uAlb, vMtW.xz * uSc).rgb * bb.y + texture2D(uAlb, vMtW.xy * uSc).rgb * bb.z;
            diffuseColor.rgb *= mix(vec3(1.0), alb * 1.75, .75); }
          { float up = clamp(vMtN.y, 0.0, 1.0), n = mtN(vMtW * .35), n2 = mtN(vMtW * 2.3);
            diffuseColor.rgb *= .82 + .3 * n2;                                                   // 풍화 얼룩
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.36, .42, .24), smoothstep(.62, .9, up * n) * .45 * (.4 + .6 * uDetail)); // 윗면 이끼
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.62, .52, .4), smoothstep(.7, 1.0, up) * .25); }`)
        .replace('#include <normal_fragment_maps>', `
          { vec3 bw = abs(vMtN); bw /= (bw.x + bw.y + bw.z); float sc = uSc;
            vec3 tx = texture2D(normalMap, vMtW.zy * sc).xyz * 2.0 - 1.0, ty = texture2D(normalMap, vMtW.xz * sc).xyz * 2.0 - 1.0, tz = texture2D(normalMap, vMtW.xy * sc).xyz * 2.0 - 1.0;
            vec3 wn = normalize(vec3(tx.z, tx.y, tx.x) * bw.x + vec3(ty.x, ty.z, ty.y) * bw.y + tz * bw.z);
            vec3 vn = normalize((viewMatrix * vec4(wn - vMtN, 0.0)).xyz);
            normal = normalize(normal + vn * normalScale.x * (.4 + .6 * uDetail)); }`)
        .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness * (texture2D(roughnessMap, vMtW.xz * uSc).g * .5 + .5);`)
        .replace('#include <output_fragment>', `#include <output_fragment>
          { vec3 x = gl_FragColor.rgb * 1.12; gl_FragColor.rgb = clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0.0, 1.0); } // 바위만 ACES 근사 톤 곡선(인물·이펙트 색은 그대로)`);
    };
    m.needsUpdate = true;
  }

  // ── 하늘 환경 반사(PMREM, 절차 생성 하늘) ──
  function skyEnv() {
    try { const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
      const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(vec3(.55,.45,.35), vec3(.75,.85,1.0), smoothstep(-.2,.4,h)); c += vec3(1.0,.9,.7) * pow(max(dot(normalize(vP), normalize(vec3(.4,.8,.3))),0.0), 40.0) * 2.0; gl_FragColor = vec4(c,1.0); }' }));
      sc.add(sky); const rt = pm.fromScene(sc, .02); scene3.environment = rt.texture; pm.dispose(); } catch (e) { console.warn('[matup] env', e); }
  }

  // ── 훑기: 1초마다 새로 생긴 인물·바위 재질만 손봄 ──
  const isFx = m => m.transparent || m.blending === THREE.AdditiveBlending || m.isShaderMaterial || m.isPointsMaterial || m.isLineBasicMaterial || m.isSpriteMaterial;
  function kindOf(o, m, rig) {
    if (rig && rig.hairMesh === o) return 2;
    if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > .15 && m.color && m.color.r > m.color.b) return 1; // 피부(자체 발광 보정한 살색)
    let p = o, inHead = false; while (p) { if (rig && p === rig.headG) { inHead = true; break; } p = p.parent; }
    if (inHead && m.color && !(m.emissive && m.emissive.r > .05)) return 2; // 머리 묶음 안의 비피부 = 머리카락·장식
    return 0;
  }
  function scan() {
    if (!MT.on) return; const t0 = performance.now();
    const rigs = window.MOCAP && MOCAP.rigs ? [...MOCAP.rigs.values()].filter(r => r && !r.bad && r.holder) : [];
    rigs.forEach(rig => rig.holder.traverse(o => { if (!o.isMesh || !o.material || o.material === (typeof OUT !== 'undefined' ? OUT : null)) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      arr.forEach((m, i) => { if (!m.isMeshToonMaterial || isFx(m) || m.userData.matUp) return; const k = kindOf(o, m, rig);
        if (k === 2 && !m.userData.mtHair) { const c = m.clone(); c.userData = { mtHair: 1 }; patchToon(c, 2); if (Array.isArray(o.material)) o.material[i] = c; else o.material = c; return; } // 공용 재질을 옷과 나눠 쓰지 않게 복제
        if (k === 0 && /^cloth_/.test(o.name || '')) { const c = m.clone(); c.userData = {}; patchToon(c, 4); if (Array.isArray(o.material)) o.material[i] = c; else o.material = c; return; } // 하오리·코트 자락 = 비단
        patchToon(m, k); }); }));
    rigs.forEach(rig => { if (rig.eyeMats) rig.eyeMats.forEach(([m]) => patchEye(m)); });
    scene3.traverse(o => { if (!o.isMesh || !o.material || o.material.userData.matUp) return; const m = o.material;
      if (m.isMeshStandardMaterial && m.map && m.normalMap && !isFx(m) && o.geometry && (o.geometry.boundingSphere || (o.geometry.computeBoundingSphere(), o.geometry.boundingSphere)).radius > 80) { patchGround(m); return; }
      if (m.isMeshStandardMaterial && !isFx(m) && (m.vertexColors || m.flatShading) && !o.userData.mcRig) patchRock(m); });
    MT.ms = performance.now() - t0;
  }
  /* 전역 톤매핑은 새로 생기는 이펙트 색을 흔들어서 쓰지 않음 — 바위 셰이더 안에서만 톤 곡선 */
  function tone_unused() { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
    scene3.traverse(o => { const m = o.material; if (!m || Array.isArray(m)) return; if (!(m.isMeshStandardMaterial && !isFx(m))) { if (m.toneMapped !== false && !m.userData.mtTone) { m.userData.mtTone = 1; m.toneMapped = false; m.needsUpdate = true; } } }); }
  window.setMatUp = on => { MT.on = !!on; try { localStorage.setItem('arenaMatUp', on ? '1' : '0'); } catch (e) { } location.reload(); };
  if (MT.on) { skyEnv(); setInterval(() => { try { scan(); } catch (e) { console.warn('[matup]', e); } }, 1000); setTimeout(() => { try { scan(); } catch (e) { } }, 300); }
})();
