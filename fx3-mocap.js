// 이펙트를 진짜 사람 모형(mocap.js, Quaternius 뼈대)에 맞춤 (fx3-mocap) — fx3.js 도구 사용, 교전·물리 파일은 건드리지 않는다.
// 1) 손 맞춤: 숨은 옛 모형의 기술 묶음(fxg: 나선환·치도리·빛)을 새 모형 손바닥으로 옮김 → handP() 를 쓰는 모든 기술이 진짜 손에서 나옴
// 2) 검기 띠: 검 뼈 끝(칼날 끝)·칼날 가운데의 지난 자리로 리본을 그림(속성 결: 물결·불꽃·번개·어둠·바람)
// 3) 고무 팔: 늘이기·거인 팔 기술 때 어깨에서 대상까지 살색 팔 + 주먹(새 모형은 팔이 안 늘어나므로)
// 4) 잔상: 빠르게 움직이거나(순보·벽력일섬) 필살기 중이면 뼈 자리에 흐려지는 빛 점(분신 잔상처럼)
// 5) 적중 맞춤: mocapOn('hit') 순간에 그 손·발·칼끝에서 타격 이펙트
// 60fps: 띠·팔은 인물 수만큼 미리 만든 묶음을 돌려 쓰고, 뼈 위치는 장면마다 몇 개만 읽는다
(function () {
  const X = window.FX3; if (!X || typeof scene3 === 'undefined') return;
  const { emit, streak, elemBurst, rr } = X;
  const st = window.__fx3m = { on: true, rigs: 0, trails: 0, hits: 0, arms: 0, ms: 0 };
  const root = new THREE.Group(); root.name = 'fx3m'; scene3.add(root);
  const STY = { fire: 1, sun: 1, kurama: 1, steam: 1, blood: 1, water: 2, ice: 2, mist: 5, bolt: 3, light: 3, sound: 3, getsuga: 0, dark: 4, hollow: 4, wind: 5, petal: 5, insect: 5, psychic: 5, room: 0, power: 0, metal: 0, slash: 5, earth: 0, sand: 5 };
  // 인물별 검기 색(원작): 없으면 기술 속성 색
  const BLADE = { tanjiro: ['#3a8aff', 2, '#0a2a80'], giyu: ['#4aa0ff', 2, '#0a2a80'], zenitsu: ['#ffd040', 3], rengoku: ['#ff6a10', 1, '#a01000'], inosuke: ['#c0c8d0', 0], shinobu: ['#c890ff', 5], mitsuri: ['#ff8ac8', 0], obanai: ['#e0d0ff', 0], sanemi: ['#9affc8', 5], gyomei: ['#c8a070', 0], uzui: ['#ffb030', 1, '#a04000'], tokito: ['#e8eef4', 5],
    ichigo: ['#8ac8ff', 0], byakuya: ['#ff9ac8', 5], toshiro: ['#bff0ff', 2, '#3a80c0'], kenpachi: ['#ffe040', 0], rukia: ['#e8f8ff', 2, '#80b8e0'], zoro: ['#c8ffd8', 5], aizen: ['#c890ff', 0], kakashi: ['#bfe0ff', 3], sasuke: ['#bfe0ff', 3] };
  const rigOf = f => { const M = window.MOCAP; if (!M || !M.ready || !M.on || !f || !f.ch) return null; const r = M.rigs.get(f.ch.key); return r && !r.bad && r.holder && r.holder.visible ? r : null; };
  const wpos = (o, out) => { o.updateWorldMatrix(true, false); return out.setFromMatrixPosition(o.matrixWorld); };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _m = new THREE.Matrix4();
  const bone = (r, ...names) => { for (const n of names) if (r.bones[n]) return r.bones[n]; return null; };
  const findB = (r, re) => { r._fx3b = r._fx3b || {}; const key = re.source; if (key in r._fx3b) return r._fx3b[key]; const n = Object.keys(r.bones || {}).find(k => re.test(k)); return (r._fx3b[key] = n ? r.bones[n] : null); }; // 다른 뼈 이름(MPFB·mixamo 등)도 찾기
  function palm(r, side, out) { const S = side === 'r' ? 'r|R|Right' : 'l|L|Left'; const h = bone(r, 'hand_' + side) || findB(r, new RegExp('(hand[._ ]?(' + S + ')$)|((' + S + ')[._ ]?hand$)|(mixamorig:?(' + (side === 'r' ? 'Right' : 'Left') + ')Hand$)', 'i')), m = bone(r, 'middle_01_' + side) || findB(r, new RegExp('middle.*(01|1)[._ ]?(' + S + ')$|' + (side === 'r' ? 'Right' : 'Left') + 'HandMiddle1', 'i')); if (!h) return null; wpos(h, out); if (m) out.lerp(wpos(m, _c), .7); return out; }

  // ── 1) 손 맞춤 ──
  function fitHands() { if (typeof F === 'undefined') return; F.forEach(f => { const m = f.model; if (!m || !m.fxg) return; const g = m.fxg, r = rigOf(f);
      if (r) { const ga = Math.min(1.5, f.giantArm || 0), fa = r.bones.lowerarm_r, hd = r.bones.hand_r; if (fa && (ga > .02 || fa.userData.ga)) { const k = 1 + ga * 1.4; fa.scale.setScalar(k); if (hd) hd.scale.setScalar(1 + ga * .6); fa.userData.ga = ga > .02; } }
      if (!g.userData.p0) g.userData.p0 = g.position.clone();
      if (!r || !st.on) { if (g.userData.fit) { g.position.copy(g.userData.p0); g.userData.fit = false; } return; }
      if (!palm(r, 'r', _a)) return; const par = g.parent; if (!par) return; par.updateWorldMatrix(true, false); _m.copy(par.matrixWorld).invert(); g.position.copy(_a.applyMatrix4(_m)); g.userData.fit = true; }); }

  // ── 2) 검기 띠 ──
  const N = 16;
  const TVS = `attribute float aU; attribute float aV; varying float vU; varying float vV; void main() { vU = aU; vV = aV; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`;
  const TFS = `uniform vec3 uC; uniform vec3 uC2; uniform float uOp; uniform float uSty; uniform float uT; varying float vU; varying float vV;
    float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
    void main() { float age = vU, tip = vV; float n = vn(vec2(age * 9. - uT * 4., tip * 3. + uT)) * .6 + vn(vec2(age * 21., tip * 7. - uT * 3.)) * .4;
      float fade = pow(1. - age, 1.6) * smoothstep(0., .25, tip); vec3 col; float a;
      if (uSty == 2.) { float fl = pow(abs(sin(age * 30. - uT * 12. + tip * 4. + n * 3.)), 3.); col = mix(mix(uC2, uC, n), vec3(.93, .97, 1.), smoothstep(.75, 1., tip) * .8 + fl * .25); a = fade * (.55 + .45 * n); }
      else if (uSty == 1.) { float heat = clamp(tip * .9 + n * .5 - age * .6, 0., 1.); col = heat < .5 ? mix(uC2, uC, heat * 2.) : mix(uC, vec3(1., .95, .8), (heat - .5) * 2.); a = fade * smoothstep(.15, .55, n + tip * .4); }
      else if (uSty == 3.) { float cr = pow(1. - abs(vn(vec2(age * 40., floor(uT * 24.))) * 2. - 1.), 5.); col = mix(uC, vec3(1.), cr * .7 + smoothstep(.85, 1., tip) * .6); a = fade * (.35 + cr); }
      else if (uSty == 4.) { col = mix(vec3(.03, 0., .02), uC, smoothstep(.7, 1., tip + n * .2)); a = fade * smoothstep(.2, .6, n + tip * .3) * .95; }
      else if (uSty == 5.) { float l = pow(abs(sin(tip * 14. + n * 3.)), 10.); col = mix(uC, vec3(1.), l); a = fade * (l * .8 + .18); }
      else { col = mix(uC, vec3(1.), smoothstep(.7, 1., tip) * .8); a = fade * (.4 + .5 * n * tip); }
      gl_FragColor = vec4(col, clamp(a * uOp, 0., 1.)); }`;
  function mkTrail(blend) { const g = new THREE.BufferGeometry(), P = new Float32Array(N * 2 * 3), U = new Float32Array(N * 2), V = new Float32Array(N * 2), I = [];
    for (let i = 0; i < N; i++) { U[i * 2] = U[i * 2 + 1] = i / (N - 1); V[i * 2] = 0; V[i * 2 + 1] = 1; if (i < N - 1) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aU', new THREE.BufferAttribute(U, 1)); g.setAttribute('aV', new THREE.BufferAttribute(V, 1)); g.setIndex(I);
    const u = { uC: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uOp: { value: 0 }, uSty: { value: 0 }, uT: FXT };
    const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: u, vertexShader: TVS, fragmentShader: TFS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: blend }));
    mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 7; root.add(mesh); return { mesh, u, P, hist: [], key: null }; }
  const trailsA = Array.from({ length: 8 }, () => { const t = mkTrail(THREE.AdditiveBlending); if (X.regAdd) X.regAdd(t.mesh.material); return t; }), trailsN = Array.from({ length: 3 }, () => mkTrail(THREE.NormalBlending));
  const bladeOf = new WeakMap(); // 검 묶음 → { tip, mid } (검 기준 좌표)
  function bladeLocal(obj) { let b = bladeOf.get(obj); if (b) return b; obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(); let best = null, bd = 0;
    obj.traverse(o => { if (!o.isMesh || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox, M = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < 8; i++) { const p = new THREE.Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(M); const d = p.length(); if (d > bd) { bd = d; best = p; } } });
    b = best && bd > .5 ? { tip: best, mid: best.clone().multiplyScalar(.35) } : null; bladeOf.set(obj, b); return b; }
  const used = new Set();
  function trailFor(key, sty) { const pool = sty === 4 ? trailsN : trailsA; let t = pool.find(x => x.key === key); if (t) return t; t = pool.find(x => !x.key || !used.has(x.key)) || pool[0]; t.key = key; t.hist.length = 0; return t; }
  function bladeStyle(f) { const B = BLADE[f.ch.key]; const ek = f.elem || (f.ch.sig && f.ch.sig.elem) || 'metal'; const dark = f.mode > 0 && /ichigo/.test(f.ch.key);
    if (dark) return ['#ff2030', 4, '#200008']; if (B) return [B[0], B[1], B[2] || B[0]]; const c = (ELEM[ek] || ELEM.metal).c; return [c, STY[ek] || 0, c]; }
  const _tp = new THREE.Vector3(), _mp = new THREE.Vector3();
  function bladeTrails(dt) { used.clear(); if (typeof F === 'undefined') return;
    F.forEach(f => { const r = rigOf(f); if (!r || !r.swd || !r.swd.length) return; r.swd.forEach((s, si) => { if (!s.obj || !s.obj.visible) return; const bl = bladeLocal(s.obj); if (!bl) return; const key = f.ch.key + si; used.add(key);
        s.obj.updateWorldMatrix(true, false); _tp.copy(bl.tip).applyMatrix4(s.obj.matrixWorld); _mp.copy(bl.mid).applyMatrix4(s.obj.matrixWorld);
        const [c, sty, c2] = bladeStyle(f), t = trailFor(key, sty); t.u.uC.value.set(c); t.u.uC2.value.set(c2); t.u.uSty.value = sty;
        const h = t.hist; h.unshift([_mp.clone(), _tp.clone()]); if (h.length > N) h.length = N; if (h.length > 1 && h[0][1].distanceTo(h[1][1]) > 40) h.length = 1; /* 순간이동·자세 튐: 큰 정지 호가 남지 않게 기록을 끊음 */
        const sp = h.length > 1 ? h[0][1].distanceTo(h[1][1]) / Math.max(dt, .008) : 0, cut = /Sword|Attack|Heavy|Skill/.test(r.state || '') || (f.lock > 0);
        const want = Math.min(1, Math.max(0, (sp - 90) / 260)) * (cut ? 1 : .55); t.op = (t.op || 0) + (want - (t.op || 0)) * Math.min(1, dt * (want > (t.op || 0) ? 25 : 6)); t.u.uOp.value = t.op;
        for (let i = 0; i < N; i++) { const e = h[Math.min(i, h.length - 1)]; t.P.set([e[0].x, e[0].y, e[0].z], i * 6); t.P.set([e[1].x, e[1].y, e[1].z], i * 6 + 3); }
        t.mesh.geometry.attributes.position.needsUpdate = true; t.mesh.visible = t.op > .02; if (t.mesh.visible) st.trails++;
        if (t.op > .4 && sty !== 4 && Math.random() < .35 * X.busy()) { if (sty === 2) emit(_tp, V3(rr(-20, 20), rr(0, 30), rr(-20, 20)), .5, 1.6, 3, '#ffffff', 200); else if (sty === 1) emit(_tp, V3(rr(-10, 10), rr(10, 30), rr(-10, 10)), .4, 4, 1, c, -20); else if (sty === 3) streak(_tp, V3(rr(-80, 80), rr(-30, 60), rr(-80, 80)), .15, .04, 1.4, c); } }); });
    trailsA.concat(trailsN).forEach(t => { if (t.key && !used.has(t.key)) { t.mesh.visible = false; t.u.uOp.value = 0; t.op = 0; t.key = null; } });
  }

  // ── 3) 고무 팔 ──
  const armGeo = new THREE.CylinderGeometry(1, .85, 1, 10, 1, true); armGeo.translate(0, .5, 0); armGeo.rotateX(Math.PI / 2); // +z 방향으로 길이 1
  const fistGeo = new THREE.SphereGeometry(1, 12, 9);
  const arms = Array.from({ length: 6 }, () => { const mat = new THREE.MeshToonMaterial({ color: '#f0c8a0', gradientMap: typeof gm !== 'undefined' ? gm : null }), g = new THREE.Group(), a = new THREE.Mesh(armGeo, mat), fist = new THREE.Mesh(fistGeo, mat);
    a.castShadow = fist.castShadow = true; g.add(a, fist); g.visible = false; root.add(g); const out = new THREE.Mesh(armGeo, OUT); out.scale.setScalar(1.06); a.add(out); return { g, a, fist, mat, f: null }; });
  function rubberArms() { arms.forEach(x => x.used = false);
    if (typeof F !== 'undefined') F.forEach(f => { const s = f.stretch || 0; if (s < .25 || !/luffy/.test(f.ch.key)) return; /* 고무 팔은 루피만 */ const r = rigOf(f); if (!r) return; const sh = bone(r, 'upperarm_r', 'clavicle_r'); if (!sh) return;
        const A = arms.find(x => x.f === f) || arms.find(x => !x.used && !x.f) || arms.find(x => !x.used); if (!A) return; A.used = true; A.f = f;
        const P = (typeof PALS !== 'undefined' && PALS[f.ch.key]) || {}; A.mat.color.set(P.sleeve && /rubber|luffy/.test(f.ch.key) ? P.skin || '#f0c8a0' : P.skin || '#f0c8a0');
        wpos(sh, _a); const tg = f.target && f.target.pos ? chest(f.target) : _a.clone().addScaledVector(fwdOf(f), 40); const d = tg.sub(_a), L = Math.min(d.length() * .95, Math.max(4, (f.stretch || 0) * 14)); d.normalize();
        const giant = 1 + (f.giantArm || 0) * 1.6; if (L < 8) { A.g.visible = false; return; } A.g.position.copy(_a); A.g.lookAt(_a.clone().add(d)); A.a.scale.set(1.15 * giant, 1.15 * giant, L); A.fist.position.set(0, 0, L); A.fist.scale.setScalar(1.7 * giant); A.g.visible = true; st.arms++;
        if (Math.random() < .5 * X.busy()) streak(_a.clone().addScaledVector(d, L * rr(.2, .9)).add(V3(rr(-2, 2), rr(-2, 2), rr(-2, 2))), d.clone().multiplyScalar(-rr(200, 320)), .12, .05, 1.5, '#ffffff'); });
    arms.forEach(x => { if (!x.used) { x.g.visible = false; x.f = null; } }); }

  // ── 4) 잔상(빠른 이동·필살기) ──
  const GH = ['Head', 'hand_r', 'hand_l', 'foot_r', 'foot_l', 'pelvis', 'spine_03', 'calf_r', 'calf_l', 'lowerarm_r', 'lowerarm_l'];
  let ghAcc = 0;
  function ghosts(dt) { ghAcc += dt; if (ghAcc < .045) return; ghAcc = 0; if (typeof F === 'undefined' || X.busy() < .5) return;
    F.forEach(f => { const v = f.vel ? Math.hypot(f.vel.x, f.vel.z) : 0, ult = (window.__fx3c && __fx3c.ultF === f); if (v < 230 && !(f.ghost > 0) && !ult) return; const r = rigOf(f); if (!r) return;
      const c = (ELEM[f.elem || (f.ch.sig && f.ch.sig.elem)] || ELEM.power).c; GH.forEach(n => { const b = r.bones[n]; if (!b) return; wpos(b, _b); emit(_b, V3(), ult ? .45 : .28, n === 'Head' || n === 'pelvis' ? 7 : 4.5, 0, c); }); }); }

  // ── 5) 적중 맞춤 ──
  let hooked = false;
  function hook() { if (hooked || typeof window.mocapOn !== 'function') return; hooked = true;
    mocapOn('hit', d => { try { const f = d.f; if (!f || !f.pos) return; const r = rigOf(f); if (!r) return; st.hits++; const ek = f.elem || (f.ch.sig && f.ch.sig.elem) || 'metal', c = (ELEM[ek] || ELEM.metal).c;
        let p = null; if (/Sword/.test(d.state || '') && r.swd && r.swd[0] && bladeLocal(r.swd[0].obj)) { r.swd[0].obj.updateWorldMatrix(true, false); p = bladeLocal(r.swd[0].obj).tip.clone().applyMatrix4(r.swd[0].obj.matrixWorld); }
        else p = palm(r, 'r', new THREE.Vector3()); if (!p) return;
        const tg = f.target && f.target.pos ? chest(f.target) : null, dir = tg ? tg.clone().sub(p).normalize() : fwdOf(f);
        emit(p, V3(), .14, 16, 0, '#ffffff'); emit(p, V3(), .22, 24, 0, c);
        for (let i = 0; i < 10 * X.busy(); i++) streak(p, dir.clone().multiplyScalar(rr(160, 300)).add(V3(rr(-60, 60), rr(-40, 60), rr(-60, 60))), rr(.12, .22), .04, rr(1.2, 2.2), i % 2 ? '#ffffff' : c);
        if (/Skill/.test(d.state || '')) elemBurst(p, ek, .6);
        if (tg && tg.distanceTo(p) < 16) { elemBurst(tg, ek, .7); if (window.__fx2) __fx2.hs = Math.max(__fx2.hs || 0, .05); } } catch (e) { console.error(e); } }); }

  const _env = envUpdate;
  envUpdate = function (dt, t) { _env(dt, t); const t0 = performance.now(); try { hook(); if (!st.on) return; const M = window.MOCAP; if (!M || !M.ready || !M.on) { trailsA.concat(trailsN).forEach(x => x.mesh.visible = false); arms.forEach(x => x.g.visible = false); return; }
      st.trails = 0; st.arms = 0; bladeTrails(dt); rubberArms(); ghosts(dt); } catch (e) { console.error(e); } st.ms = st.ms * .95 + (performance.now() - t0) * .05; };
  // 손 맞춤은 그리기 직전(옛 모형·새 모형 자세가 모두 정해진 뒤)
  window.__fx3m.fitHands = fitHands;
  // 몸 뼈 위치들(오라·망토·증기용): 새 모형 뼈, 없으면 몸 둘레 근사
  const BP = [/^head$/i, /spine_03|spine2|chest/i, /pelvis|hips/i, /hand[._]?r$|righthand$/i, /hand[._]?l$|lefthand$/i, /lowerarm[._]?r|forearm[._]?r|rightforearm/i, /lowerarm[._]?l|forearm[._]?l|leftforearm/i, /upperarm[._]?r|rightarm$/i, /upperarm[._]?l|leftarm$/i, /calf[._]?r|shin[._]?r|rightleg$/i, /calf[._]?l|shin[._]?l|leftleg$/i, /foot[._]?r$|rightfoot$/i, /foot[._]?l$|leftfoot$/i];
  X.bonePts = f => { const r = rigOf(f); if (!r) { const c = f.pos; return [0, 6, 12, 18, 24, 30].map(y => c.clone().add(V3(0, y * (f.scale || 1), 0))); } const out = []; BP.forEach(re => { const b = findB(r, re); if (b) out.push(wpos(b, new THREE.Vector3())); }); return out.length ? out : [chest(f)]; };
  X.palm = f => { const r = rigOf(f); return r ? palm(r, 'r', new THREE.Vector3()) : null; };
  /* 이름으로 뼈 위치(발·왼손 등): head handR handL footR footL calfR calfL */
  const BK = { head: 0, chest: 1, pelvis: 2, handR: 3, handL: 4, calfR: 9, calfL: 10, footR: 11, footL: 12 };
  X.boneAt = (f, k) => { const r = rigOf(f); if (!r) return null; if (k === 'handL') { const p = palm(r, 'l', new THREE.Vector3()); if (p) return p; } const b = findB(r, BP[BK[k]]); return b ? wpos(b, new THREE.Vector3()) : null; };
})();
