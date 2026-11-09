// 실사 배경 자산 (env-assets) — 소유자 11-05: "오픈소스 싹 다 받아서 적용, 배경·텍스처·모델링 통합 고도화"
// 자산은 모두 CC0(출처·크기는 assets/env/LICENSE.txt): Poly Haven 텍스처(cliff_side·dry_ground_rocks·aerial_rocks_02)·모델(바위·고목·잔가지·관목·잔돌)·하늘 파노라마,
// ambientCG 천·가죽 텍스처(Fabric084·Fabric086·Leather037 — materials.js 가 인물 옷 결에 씀)
// 하는 일: ① 흙바닥 텍스처 교체 ② 절벽 고리 셰이더에 실사 절벽 텍스처(삼면 투영) ③ 하늘 돔을 실사 파노라마로 + 환경광(PMREM)
//         ④ 경기장 밖(반지름 110 너머)에 실제 바위·고목·관목·잔돌 모델 배치(품질별 개수) — 안쪽 바위 3개·충돌은 그대로
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined') return;
  let mode = 'cliff'; try { mode = localStorage.getItem('arenaWorld') || 'cliff'; } catch (e) { }
  const EA = window.ENV_ASSETS = { on: true, props: 0, ms: 0, ready: {} };
  try { EA.on = localStorage.getItem('arenaEnvAssets') !== '0'; } catch (e) { }
  const D = 'assets/env/';
  const TL = new THREE.TextureLoader();
  /* 고해상도 PBR(11-09 GPU 티어 대응): 고급 GPU만 2K 기본(4K 승급), 중·저급(GTX 1060급 이하)은 1K — VRAM 3GB급에서 실사 텍스처가 메모리를 다 잡아먹어 크래시·끊김남 */
  const isMob = (() => { try { return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const GT = (() => { try { const gl = renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info'); const g = String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)).toLowerCase(); return /gtx 1050|gtx 9|gtx 7|uhd |iris|vega 3|mx[12]|intel hd|basic render|swiftshader/.test(g) ? 'low' : /gtx 10[67]0(?! ti)|gtx 1650|rx 5[5-9]0|rx 54|arc a3/.test(g) ? 'mid' : 'high'; } catch (e) { return 'high'; } })();
  const SZ = (GT === 'high' && !isMob) ? '2k' : '1k';
  let ultraWant = !isMob && GT === 'high'; try { if (localStorage.getItem('arenaUltra') === '0') ultraWant = false; } catch (e) { }
  const HI4 = GT === 'high' ? { cliff_side: ['diff', 'nor_gl'], dry_ground_rocks: ['diff', 'nor_gl'] } : {}; /* 4K 승급은 고급 GPU만(중급 VRAM 보호) */
  const maxAni = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
  const tex = (f, rep) => { const t = TL.load(D + f.replace('_2k.jpg', '_' + SZ + '.jpg'), () => { EA.ready[f] = 1; }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAni; t.minFilter = THREE.LinearMipmapLinearFilter; if (rep) t.repeat.set(rep, rep); return t; };
  const q4 = []; let q4busy = false; /* 4K 는 한 장씩 차례로(동시에 올리면 수백 ms 멈춤) */
  const pump4 = () => { if (q4busy || !q4.length) return; q4busy = true; const [t, f4] = q4.shift(); new THREE.ImageLoader().load(D + f4, img => { t.image = img; t.needsUpdate = true; EA.ready[f4] = 1; EA.hi4 = (EA.hi4 || 0) + 1; setTimeout(() => { q4busy = false; pump4(); }, 1500); }, undefined, () => { q4busy = false; pump4(); }); };
  const up4 = (t, f4) => { q4.push([t, f4]); pump4(); };
  const set = id => { const r = {}; ['diff', 'nor_gl', 'arm'].forEach(k => { r[k === 'nor_gl' ? 'nor' : k] = tex(id + '_' + k + '_2k.jpg'); }); if (ultraWant && HI4[id] && !isMob) setTimeout(() => HI4[id].forEach(k => up4(r[k === 'nor_gl' ? 'nor' : k], id + '_' + k + '_4k.jpg')), 2500); return r; };
  // materials.js 가 읽는 공용 텍스처(인물 옷 결·바위 삼면 투영)
  window.ENVTEX = {
    rock: set('aerial_rocks_02'),
    cliff: set('cliff_side'),
    fabric: { cotton: tex('Fabric086_rough_2k.jpg'), denim: tex('Fabric084_rough_2k.jpg'), leather: tex('Leather037_rough_2k.jpg') },
  };
  if (!EA.on || mode !== 'cliff') return;
  const Q = () => { try { return (window.getQuality && window.getQuality()) || localStorage.getItem('arenaQuality') || 'mid'; } catch (e) { return 'mid'; } };

  // ── ① 흙바닥 ──
  const groundSet = set('dry_ground_rocks');
  function swapGround() {
    let g = null; scene3.children.forEach(o => { if (!g && o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.map && o.material.normalMap && o.material.roughnessMap) { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius > 150) g = o; } });
    if (!g) return false;
    const m = g.material, rep = Math.max(4, Math.round(g.geometry.boundingSphere.radius * 2 / 42));
    [groundSet.diff, groundSet.nor, groundSet.arm].forEach(t => t.repeat.set(rep, rep));
    m.map = groundSet.diff; m.normalMap = groundSet.nor; m.normalScale = new THREE.Vector2(1.15, 1.15); m.roughnessMap = groundSet.arm; m.roughness = 1; m.color.set('#e8dccb'); m.needsUpdate = true;
    EA.ground = g; return true;
  }

  // ── ② 절벽 고리·원경 봉우리: 층리 색(정점) × 실사 절벽 텍스처(삼면 투영) + 법선 결 ──
  function swapWalls() {
    let n = 0;
    scene3.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.isShaderMaterial || o.userData.eaWall) return;
      const m = o.material; if (!m.uniforms || !m.uniforms.uFogF || !o.geometry.attributes.aF) return;
      const c = window.ENVTEX.cliff;
      const nm = new THREE.ShaderMaterial({
        uniforms: Object.assign({}, m.uniforms, { tD: { value: c.diff }, tN: { value: c.nor }, uSc: { value: 1 / 70 } }),
        vertexShader: m.vertexShader, side: m.side, fog: false,
        fragmentShader: `uniform vec3 uSun; uniform vec3 uFogC; uniform float uFogN; uniform float uFogF; uniform sampler2D tD; uniform sampler2D tN; uniform float uSc; varying vec3 vW; varying vec3 vN; varying vec3 vCol;
          vec3 tri(sampler2D t, vec3 p, vec3 b){ return texture2D(t, p.zy * uSc).rgb * b.x + texture2D(t, p.xz * uSc).rgb * b.y + texture2D(t, p.xy * uSc).rgb * b.z; }
          void main(){ vec3 n0 = normalize(vN); vec3 b = pow(abs(n0), vec3(4.)); b /= (b.x + b.y + b.z);
            vec3 alb = tri(tD, vW, b), tn = tri(tN, vW, b) * 2. - 1.;
            vec3 n = normalize(n0 + vec3(tn.x, tn.y, tn.x) * .55);
            float l = max(dot(n, uSun), 0.); float lit = .42 + .7 * smoothstep(.0, .55, l) + .1 * smoothstep(.55, .9, l);
            vec3 col = mix(vCol, alb * 1.25, .62) * lit * vec3(1.03,.98,.9) + vec3(.06,.07,.09) * (1. - l);
            float d = length(cameraPosition - vW); col = mix(col, uFogC, clamp((d - uFogN) / (uFogF - uFogN), 0., 1.) * .92);
            vec3 x = col * 1.05; col = clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.);
            gl_FragColor = vec4(col, 1.); }`,
      });
      o.material = nm; o.userData.eaWall = 1; n++;
    });
    return n;
  }

  // ── ③ 하늘: 실사 파노라마(하늘 돔 재질 교체) + 환경광 ──
  function swapSky() {
    let dome = null; scene3.traverse(o => { if (!dome && o.isMesh && o.material && o.material.isShaderMaterial && o.material.uniforms && o.material.uniforms.uTop && o.geometry && o.geometry.type === 'SphereGeometry') dome = o; });
    if (!dome) return false;
    const skyT = TL.load(D + 'sky_2k.jpg', t => {
      try { const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromEquirectangular(t); scene3.environment = rt.texture; pm.dispose(); EA.envOk = 1; } catch (e) { console.warn('[env-assets] pmrem', e); }
    });
    dome.material = new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, depthWrite: false, fog: false });
    dome.rotation.y = Math.PI * .55; EA.sky = dome; return true;
  }

  // ── ④ 실사 소품(경기장 밖) ──
  const PROPS = [ // [파일, 배율, 개수(낮음·중간·높음), 반지름 범위, 땅에 묻는 깊이 비율]
    ['namaqualand_boulder_02', 22, [2, 4, 6], [135, 300], .18],
    ['boulder_01', 26, [2, 4, 6], [140, 320], .15],
    ['namaqualand_boulder_02', 38, [1, 3, 4], [250, 330], .22], /* rock_face_01 은 한쪽 면만 있는 스캔이라 종이처럼 보여 뺌(소유자 지적 11-05) */
    ['namaqualand_stones_01', 20, [2, 5, 8], [118, 260], .05],
    ['dead_tree_trunk', 20, [1, 2, 3], [150, 300], .02],
    ['dry_branches_medium_01', 20, [1, 3, 5], [120, 280], .02],
    ['shrub_01', 20, [2, 5, 8], [120, 300], .02],
  ];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  /* 원경 LOD(11-06 장면 비용 절감): 정점 묶음(격자 군집)으로 면 수를 약 1/4~1/6 로 줄인 판을 멀리서 씀. UV 이음매는 UV 도 열쇠에 넣어 지킴 */
  const LOD_FAR = 150, lowCache = new Map();
  function cluster(geo, res) {
    const g = geo.index ? geo : geo; const pos = g.attributes.position, uv = g.attributes.uv, idx = g.index ? g.index.array : null, n = idx ? idx.length : pos.count;
    g.computeBoundingBox(); const bb = g.boundingBox, cell = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) / res;
    const map = new Map(), acc = [], uacc = [], cnt = [], vid = new Int32Array(pos.count).fill(-1);
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); let k = Math.floor((x - bb.min.x) / cell) + ',' + Math.floor((y - bb.min.y) / cell) + ',' + Math.floor((z - bb.min.z) / cell); if (uv) k += ',' + Math.round(uv.getX(i) * 12) + ',' + Math.round(uv.getY(i) * 12);
      let id = map.get(k); if (id === undefined) { id = cnt.length; map.set(k, id); acc.push(0, 0, 0); uacc.push(0, 0); cnt.push(0); } vid[i] = id; acc[id * 3] += x; acc[id * 3 + 1] += y; acc[id * 3 + 2] += z; if (uv) { uacc[id * 2] += uv.getX(i); uacc[id * 2 + 1] += uv.getY(i); } cnt[id]++; }
    const P = new Float32Array(cnt.length * 3), UV = uv ? new Float32Array(cnt.length * 2) : null; for (let j = 0; j < cnt.length; j++) { P[j * 3] = acc[j * 3] / cnt[j]; P[j * 3 + 1] = acc[j * 3 + 1] / cnt[j]; P[j * 3 + 2] = acc[j * 3 + 2] / cnt[j]; if (UV) { UV[j * 2] = uacc[j * 2] / cnt[j]; UV[j * 2 + 1] = uacc[j * 2 + 1] / cnt[j]; } }
    const I = []; for (let t = 0; t + 2 < n; t += 3) { const a = vid[idx ? idx[t] : t], b = vid[idx ? idx[t + 1] : t + 1], c = vid[idx ? idx[t + 2] : t + 2]; if (a !== b && b !== c && a !== c) I.push(a, b, c); }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.BufferAttribute(P, 3)); if (UV) o.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); o.setIndex(I); o.computeVertexNormals(); o.userData.lodTri = I.length / 3; return o; }
  function lowOf(src) { const lo = src.clone(true); lo.traverse(c => { if (!c.isMesh) return; const key = c.geometry.uuid; let g2 = lowCache.get(key); if (!g2) { const tri = (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3; g2 = tri > 1500 ? cluster(c.geometry, tri > 12000 ? 22 : 16) : c.geometry; lowCache.set(key, g2); } c.geometry = g2; c.castShadow = false; }); return lo; }
  EA.lowCache = lowCache;
  function placeProps() {
    if (!THREE.GLTFLoader) return false;
    const L = new THREE.GLTFLoader(), qi = { low: 0, mid: 1, high: 2 }[Q()] ?? 1, grp = new THREE.Group(); grp.name = 'envProps'; scene3.add(grp); EA.group = grp;
    const used = [];
    const spot = (r0, r1) => { for (let k = 0; k < 40; k++) { const a = rnd(0, Math.PI * 2), r = rnd(r0, r1), x = Math.cos(a) * r, z = Math.sin(a) * r - 20;
      if (z > 60 && Math.abs(x) < 120) continue; /* 카메라 앞쪽(열린 쪽 가까이)은 비워 시야 확보 */
      if (used.every(p => Math.hypot(p[0] - x, p[1] - z) > 32)) { used.push([x, z]); return [x, z]; } } return null; };
    PROPS.forEach(([f, sc, cnt, rr, sink]) => {
      const n = cnt[qi]; if (!n) return;
      L.load(D + f + '.glb', g => {
        const src = g.scene, solid = /boulder|stones/.test(f); src.traverse(o => { if (o.isMesh) { o.castShadow = qi > 0; o.receiveShadow = true; if (o.material) { o.material.side = solid ? THREE.FrontSide : THREE.DoubleSide; /* 닫힌 바위는 앞면만(뒷면 그리기 비용 절반) */ o.material.envMapIntensity = .5; ['map', 'normalMap', 'roughnessMap', 'aoMap', 'metalnessMap'].forEach(k => { if (o.material[k]) o.material[k].anisotropy = maxAni; }); } } });
        const box = new THREE.Box3().setFromObject(src), h = box.max.y - box.min.y;
        for (let i = 0; i < n; i++) { const p = spot(rr[0], rr[1]); if (!p) break;
          const s = sc * rnd(.75, 1.35), r0 = Math.hypot(p[0], p[1] + 20), hi = src.clone(true), lo = lowOf(src), lod = new THREE.LOD();
          hi.traverse(c => { if (c.isMesh) c.castShadow = qi > 0 && r0 < 175; }); /* 그림자는 그림자 범위 안(경기장 가까이)만 */
          lod.addLevel(hi, 0); lod.addLevel(lo, LOD_FAR * s / sc); lod.scale.setScalar(s); lod.rotation.y = rnd(0, Math.PI * 2);
          lod.position.set(p[0], -box.min.y * s - h * s * sink, p[1]); grp.add(lod); EA.props++; }
      }, undefined, e => console.warn('[env-assets] ' + f, e));
    });
    return true;
  }

  // 순서대로 준비되면 적용(다른 파일이 늦게 만드는 것 기다림)
  let tries = 0; const done = { g: 0, w: 0, s: 0, p: 0 };
  (function step() {
    const t0 = performance.now(); tries++;
    try { if (!done.g) done.g = swapGround() ? 1 : 0; } catch (e) { console.warn('[env-assets] ground', e); done.g = 1; }
    try { if (!done.w && swapWalls() > 0) done.w = 1; } catch (e) { console.warn('[env-assets] walls', e); done.w = 1; }
    try { if (!done.s) done.s = swapSky() ? 1 : 0; } catch (e) { console.warn('[env-assets] sky', e); done.s = 1; }
    try { if (!done.p) done.p = placeProps() ? 1 : 0; } catch (e) { console.warn('[env-assets] props', e); done.p = 1; }
    EA.ms += performance.now() - t0; EA.done = done;
    if ((!done.g || !done.w || !done.s || !done.p) && tries < 120) setTimeout(step, 500);
  })();
  window.setEnvAssets = on => { try { localStorage.setItem('arenaEnvAssets', on ? '1' : '0'); } catch (e) { } location.reload(); };
})();
