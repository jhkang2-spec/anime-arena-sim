// warmup.js — 첫 사용 스톨(셰이더 컴파일·GPU 웜) 제거(11-09). 품질 기본값·GPU 티어는 aaa.js 가 정함.
// 실측: GTX 1060 3GB — 지속 fps 는 충분하나 수사노오/소환/필살기 '첫 발동' 순간 p99 900ms+ → 예열로 제거.
(function () {
  if (typeof renderer === 'undefined' || typeof scene3 === 'undefined' || typeof camera === 'undefined') return;
  const st = window.WARM = { compiled: 0, sus: 0, summon: 0, fx: 0, gpu: (window.AAA && AAA.gpu) || '', tier: (window.AAA && AAA.gpuTier) || '' };
  // ⓪ 셰이더 프로그램 고정(11-14 실측: 전투 25초 중 9.7초가 getProgramInfoLog=셰이더 컴파일 대기).
  //   three r128 은 재질이 버려져 사용 횟수가 0이 되면 GPU 프로그램을 지운다 → 아지랑이·방사 왜곡·빛기둥처럼
  //   '하나 쓰고 버리는' 효과가 나올 때마다 같은 셰이더를 처음부터 다시 컴파일(회당 0.3~1.4초 멈춤).
  //   한 번 만든 프로그램은 사용 횟수를 1 올려 영구 보존 → 같은 cacheKey 는 즉시 재사용. 예열(①~④)도 이제 실제로 남는다.
  //   (고유 cacheKey 수는 재질 조합 수로 유한 — 메모리 무해)
  const progs = renderer.info.programs, pinned = new WeakSet();
  const pinAll = () => { if (!progs) return; for (let i = 0; i < progs.length; i++) { const p = progs[i]; if (!pinned.has(p)) { pinned.add(p); p.usedTimes++; } } st.pinned = progs.length; };
  if (progs) {
    const _rd = renderer.render.bind(renderer); let lastN = -1;
    renderer.render = function (s, c) { if (s === scene3 && dirtyNow.size) { try { deferDirty(); } catch (e) { } }
      if (s !== scene3 && s && s.isScene && !st.inCompile && typeof quadGate === 'function' && quadGate(s)) return; // 후처리 패스: 셰이더 백그라운드 링크 끝날 때까지 건너뜀(초반만)
      const r = _rd(s, c); if (progs.length !== lastN) { lastN = progs.length; pinAll(); } return r; };
    const _cp = renderer.compile.bind(renderer); renderer.compile = function (s, c) { const r = _cp(s, c); pinAll(); return r; };
  }
  // 병렬 셰이더 컴파일(지원 GPU): 여러 프로그램을 드라이버 스레드에서 동시에 → 몰릴 때 대기 합계 단축
  try { renderer.getContext().getExtension('KHR_parallel_shader_compile'); } catch (e) { }
  const later = (fn, t0) => { const iv = setInterval(() => { if (document.hidden) return; if (performance.now() > t0) { clearInterval(iv); try { fn(); } catch (e) { console.warn('warm', e); } } }, 300); };
  // ⓢ 시분할 컴파일 스위퍼(11-14 '최초 접속 초반 렉' 실측: 첫 22초 중 renderer.compile 10.2초 · 2.3~3.4초 멈춤 4회).
  //   예전엔 예열 단계마다 씬 전체를 한 번에 컴파일 → 새 프로그램 수십 개가 한 프레임에 몰림.
  //   이제: 아직 컴파일 안 된 메시를 하나씩 골라 '조명 + 그 메시'만 담은 씬으로 컴파일(셰이더 키는 실전과 동일) →
  //   새 프로그램이 하나 생기면 즉시 양보(다음 틱). 몇 초짜리 멈춤 1번 → 짧은 끊김 여러 번으로 분산.
  //   숨긴 풀·대기 모형도 대상(visible 무시) → 첫 등장 컴파일도 미리 끝냄.
  const R3 = renderer, props = R3.properties, done = new WeakSet(), lightsNow = () => { const L = []; scene3.traverseVisible(o => { if (o.isLight) L.push(o); }); return L; };
  // 재질 변경 추적: 다른 파일(materials.js 등)이 재질에 셰이더 조각을 덧붙이고 needsUpdate → 다음 본 렌더에서 몰아 재컴파일되던 것
  const dirty = new WeakSet(), dirtyNow = new Set();
  (function hookNU() { // r128 의 Material.prototype.needsUpdate 는 재정의 불가 → 하위 재질 클래스 프로토타입마다 덮어씀(실패해도 모듈은 계속)
    ['MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshToonMaterial', 'MeshBasicMaterial', 'MeshPhongMaterial', 'MeshLambertMaterial', 'ShaderMaterial', 'RawShaderMaterial', 'PointsMaterial', 'SpriteMaterial', 'LineBasicMaterial'].forEach(n => {
      try { const C = THREE[n]; if (!C || Object.prototype.hasOwnProperty.call(C.prototype, 'needsUpdate')) return;
        Object.defineProperty(C.prototype, 'needsUpdate', { configurable: true, set(v) { if (v === true) { this.version++; dirty.add(this); dirtyNow.add(this); } } }); } catch (e) { } }); })();
  const needs = o => { if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return false; const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (!m || m.visible === false) continue; const p = props.get(m); if (!p || !p.currentProgram || dirty.has(m)) return true; } return false; }; // r128: 재질 속성의 프로그램 = currentProgram
  const hasDirty = o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m && dirty.has(m)) return true; return false; };
  // 환경맵이 바뀌면 three 가 표준 재질 셰이더 키를 스스로 바꿈(needsUpdate 없음) → 더러움 표시해 지연·비동기 경로로
  const envDirty = new WeakSet(); // 환경맵 교체로 생긴 재컴파일은 접속 시 한 번 — 교전 중이어도 지연
  window.__envChanged = () => { scene3.traverse(o => { if (!o.isMesh || !o.material) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && m.isMeshStandardMaterial) { dirty.add(m); dirtyNow.add(m); envDirty.add(m); } }); }); };
  const doneM = new WeakSet(); // 완료 기록은 재질 단위(다른 파일이 재질을 새 인스턴스로 교체해도 다시 잡음)
  const allDone = o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m && (!doneM.has(m) || dirty.has(m))) return false; return true; };
  const markDone = o => { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m) doneM.add(m); }); };
  const clean = o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (m) dirty.delete(m); }); };
  // 후처리(화면 사각형) 씬: 초반·교전 전엔 미컴파일 재질이 있으면 그 패스를 건너뛰고 비동기 경로에 넣음
  const qPend = new WeakSet();
  function quadGate(sc) { if (!PAR || performance.now() > DEFER_UNTIL) return false; let need = false;
    sc.traverse(o => { if (o.material && needs(o)) { need = true; if (!qPend.has(o)) { qPend.add(o); defq.push({ o, list: [o], hid: [] }); st.quadDefer = (st.quadDefer || 0) + 1; } } }); return need; }
  function compileOne(o) { const saved = scene3.children, vis = o.visible, L = lightsNow(); st.inCompile = 1; try { o.visible = true; scene3.children = L.concat([o]); R3.compile(scene3, camera); } catch (e) { } finally { scene3.children = saved; o.visible = vis; st.inCompile = 0; } }
  let sweepT = 0; st.swept = 0;
  let skipCache = null, skipAt = 0; const skipRoots = () => { const n = performance.now(); if (skipCache && n - skipAt < 5000) return skipCache; skipCache = new Set(); try { Object.values(CH).forEach(c => { if (c.model && c.model.root && !c.model.root.visible) skipCache.add(c.model.root); }); } catch (e) { } skipAt = n; return skipCache; };
  // ⓓ 지연 공개(초반 렉의 나머지 원인: 배경 GLB·지형 등 자산이 로딩되자마자 '보이는 채로' 추가 → 다음 본 렌더에서 재질 수십 개 동시 컴파일, 2~3초 멈춤).
  //   접속 후 25초·교전 전에 씬에 붙는 객체 중 컴파일이 필요한 것은 잠깐 숨김 → 스위퍼가 메시 단위로 컴파일 → 다 되면 공개.
  const DEFER_UNTIL = 25000, defq = []; st.deferred = 0;
  // 숨김은 visible 대신 레이어 마스크 0 으로(게임의 가시성 제어·배경 전환과 겹치지 않게). r128 compile 은 레이어·가시성 무관하게 컴파일.
  const rendered = x => { if (!(x.layers.mask & camera.layers.mask)) return false; for (let p = x; p; p = p.parent) if (p.visible === false) return false; return true; };
  const hideL = list => { const hid = []; list.forEach(x => { if (x.__dm === undefined && rendered(x)) { x.__dm = x.layers.mask; x.layers.mask = 0; hid.push(x); } }); return hid; };
  const showL = hid => hid.forEach(x => { if (x.__dm !== undefined) { if (x.layers.mask === 0) x.layers.mask = x.__dm; x.__dm = undefined; } });
  const pushDefer = (o, list) => { const hid = hideL(list); if (!hid.length) return; defq.push({ o, list: list.slice(), hid }); st.deferred++; };
  (function hookAdd() { const P = THREE.Object3D.prototype, _add = P.add;
    P.add = function () { const r = _add.apply(this, arguments);
      try { const boot = performance.now() < DEFER_UNTIL && !(typeof F !== 'undefined' && F.length >= 2); { /* 11-15 실기기: 저장 팀 복원으로 접속 즉시 교전 → 교전 중에도 적용. 초반 이후엔 인물 모형(스킨 메시)만 */
        let attached = false; for (let p = this; p; p = p.parent) if (p === scene3) { attached = true; break; }
        if (attached) for (let i = 0; i < arguments.length; i++) { const o = arguments[i]; if (!o || !o.visible) continue; let skin = false; const list = []; o.traverse(x => { if (x.isSkinnedMesh) skin = true; if (needs(x)) list.push(x); }); if (!boot && !skin) continue;
          if (list.length >= 2) pushDefer(o, list); } } } catch (e) { }
      return r; }; })();
  function deferDirty() { const boot = performance.now() < DEFER_UNTIL && !(typeof F !== 'undefined' && F.length >= 2); // 교전 중엔 인물 모형 재질만(이펙트는 숨기지 않음)
    const S = dirtyNow; scene3.traverse(o => { if (!o.isMesh || o.__dm !== undefined) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; if (!ms.some(m => S.has(m))) return; if (!boot && !ms.some(m => envDirty.has(m))) { let rig = false; for (let p = o; p; p = p.parent) if (p.userData && p.userData.mcRig) { rig = true; break; } if (!rig) return; } pushDefer(o, [o]); }); S.clear(); }
  // ⓐ 비동기 선행 링크: 무거운 셰이더 1개 = 0.6초 멈춤(실측) → three 가 만들 소스를 '모의 컴파일'로 얻어 GPU 백그라운드 스레드에서
  //   병렬 컴파일(KHR_parallel_shader_compile, 메인 스레드는 완료 여부만 확인) → 끝난 뒤 three 컴파일은 ANGLE 프로그램 캐시 적중.
  const GL = R3.getContext(), PAR = (() => { try { return GL.getExtension('KHR_parallel_shader_compile'); } catch (e) { return null; } })(), COMPL = PAR ? PAR.COMPLETION_STATUS_KHR : 0;
  const matsOf = o => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean);
  function captureSrc(o) { const out = [], src = new Map(), att = new Map(), S = {}, N = ['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'getShaderParameter', 'getProgramParameter', 'getShaderInfoLog', 'getProgramInfoLog'];
    N.forEach(n => { S[n] = GL[n]; }); const n0 = progs.length;
    GL.shaderSource = function (s, t) { src.set(s, t); return S.shaderSource.call(GL, s, t); }; GL.compileShader = function () { };
    GL.attachShader = function (p, s) { if (!att.has(p)) att.set(p, []); att.get(p).push(s); return S.attachShader.call(GL, p, s); }; GL.linkProgram = function () { };
    GL.getShaderParameter = function () { return true; }; GL.getProgramParameter = function (p, pn) { return pn === GL.LINK_STATUS ? true : (pn === GL.ACTIVE_UNIFORMS || pn === GL.ACTIVE_ATTRIBUTES) ? 0 : S.getProgramParameter.call(GL, p, pn); };
    GL.getShaderInfoLog = function () { return ''; }; GL.getProgramInfoLog = function () { return ''; };
    try { compileOne(o); } catch (e) { } finally { N.forEach(n => { GL[n] = S[n]; }); }
    const made = progs.splice(n0); // 가짜(미링크) 프로그램은 three 캐시에서 즉시 제거
    made.forEach(p => { const sh = att.get(p.program) || []; if (sh.length === 2 && src.get(sh[0]) && src.get(sh[1])) out.push([src.get(sh[0]), src.get(sh[1])]); try { GL.deleteProgram(p.program); } catch (e) { } });
    if (made.length) matsOf(o).forEach(m => { try { props.remove(m); } catch (e) { } }); // 재질 상태도 초기화 → 실제 컴파일 때 다시 만듦
    return out; }
  function prelink(pairs) { return pairs.map(([vs, fs]) => { const v = GL.createShader(GL.VERTEX_SHADER), f = GL.createShader(GL.FRAGMENT_SHADER), p = GL.createProgram(); GL.shaderSource(v, vs); GL.compileShader(v); GL.shaderSource(f, fs); GL.compileShader(f); GL.attachShader(p, v); GL.attachShader(p, f); GL.linkProgram(p); return { p, v, f }; }); }
  const ready = L => L.every(x => GL.getProgramParameter(x.p, COMPL));
  const freeL = L => L.forEach(x => { try { GL.deleteProgram(x.p); GL.deleteShader(x.v); GL.deleteShader(x.f); } catch (e) { } });
  st.prelinked = 0;
  // ⓟ PMREM(환경맵 생성) 블러 셰이더 선행 링크: 첫 환경맵 생성 때 2.6초 멈춤(실측) → 버리는 생성기로 소스만 모의 수집 → 백그라운드 링크
  //   (가짜 프로그램은 캐시에서 제거, 생성기는 dispose 하지 않음 — dispose 가 캐시 배열을 건드리지 않게)
  function captureDuring(fn) { const out = [], src = new Map(), att = new Map(), S = {}, N = ['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'getShaderParameter', 'getProgramParameter', 'getShaderInfoLog', 'getProgramInfoLog', 'useProgram', 'drawArrays', 'drawElements'];
    N.forEach(n => { S[n] = GL[n]; }); const n0 = progs.length;
    GL.shaderSource = function (s, t) { src.set(s, t); return S.shaderSource.call(GL, s, t); }; GL.compileShader = function () { }; GL.linkProgram = function () { };
    GL.attachShader = function (p, s) { if (!att.has(p)) att.set(p, []); att.get(p).push(s); return S.attachShader.call(GL, p, s); };
    GL.getShaderParameter = function () { return true; }; GL.getProgramParameter = function (p, pn) { return pn === GL.LINK_STATUS ? true : (pn === GL.ACTIVE_UNIFORMS || pn === GL.ACTIVE_ATTRIBUTES) ? 0 : S.getProgramParameter.call(GL, p, pn); };
    GL.getShaderInfoLog = function () { return ''; }; GL.getProgramInfoLog = function () { return ''; }; GL.useProgram = function () { }; GL.drawArrays = function () { }; GL.drawElements = function () { };
    try { fn(); } catch (e) { } finally { N.forEach(n => { GL[n] = S[n]; }); }
    const made = progs.splice(n0); made.forEach(p => { const sh = att.get(p.program) || []; if (sh.length === 2 && src.get(sh[0]) && src.get(sh[1])) out.push([src.get(sh[0]), src.get(sh[1])]); try { GL.deleteProgram(p.program); } catch (e) { } });
    return out; }
  if (PAR && THREE.PMREMGenerator) setTimeout(() => { try {
    const tex = new THREE.DataTexture(new Uint8Array(16 * 8 * 4).fill(128), 16, 8, THREE.RGBAFormat); tex.mapping = THREE.EquirectangularReflectionMapping; tex.needsUpdate = true;
    const tmpSc = new THREE.Scene(); tmpSc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), new THREE.MeshBasicMaterial({ side: THREE.BackSide })));
    const rt0 = R3.getRenderTarget(); let pairs = captureDuring(() => { const pm = new THREE.PMREMGenerator(R3); pm.fromEquirectangular(tex); pm.fromScene(tmpSc, .02); }); R3.setRenderTarget(rt0);
    const L = prelink(pairs); st.prelinked += L.length; st.pmrem = L.length;
    const poll = () => { if (ready(L)) { freeL(L); st.pmremReady = 1; } else setTimeout(poll, 100); }; poll();
  } catch (e) { console.warn('warm pmrem', e); } }, 50);
  // 일괄 파이프라인: 대기 중인 지연 항목 전체를 한 묶음으로 → 소스 수집(시분할) → 한꺼번에 백그라운드 병렬 링크 → 완료 후 컴파일(캐시 적중)·공개
  let B = null;
  // 로딩 화면이 덮고 있는 동안은 프레임이 안 보이므로 스위퍼·파이프라인을 크게 돌려 남은 컴파일을 화면 공개 전에 최대한 끝냄(11-15 실기기: 공개 시점 미컴파일 메시 ~200 → 공개 후 렌더 중 동기 컴파일 0.5~0.8초 멈춤)
  const veilUp = () => !st.veil && performance.now() < 10500, SL = () => veilUp() ? 40 : 8;
  function sweepDeferred() {
    const t0 = performance.now(), combat = typeof F !== 'undefined' && F.length >= 2;
    if (!B && !scene3.environment && t0 < 4000) return true; // 환경맵 확정 전엔 시작하지 않음(확정 뒤 키가 바뀌어 다시 컴파일되는 경쟁 방지)
    if (!B) { if (!defq.length) return false; const items = defq.splice(0, defq.length); B = { items, todo: [], pairs: [], seen: new Set(), ph: PAR ? 1 : 3, all: [], hidN: items.reduce((a, d) => a + d.hid.length, 0) }; items.forEach(d => d.list.forEach(x => { B.todo.push(x); B.all.push(x); })); }
    if (B.ph < 3 && B.hidN && performance.now() - (B.tS || (B.tS = performance.now())) > 2500) B.ph = 3; // 11-15 실기기: 배경을 오래 숨기면 '텍스처가 깨져' 보임 → 묶음당 최대 2.5초
    if (B.ph === 1) { while (B.todo.length && performance.now() - t0 < SL()) { const x = B.todo.shift(); if (!needs(x)) continue; captureSrc(x).forEach(pr => { const k = pr[0].length + ':' + pr[1].length + ':' + pr[1].slice(-240); if (!B.seen.has(k)) { B.seen.add(k); B.pairs.push(pr); } }); }
      if (!B.todo.length) { B.links = prelink(B.pairs); st.prelinked += B.links.length; B.ph = 2; B.t2 = performance.now(); } return true; }
    if (B.ph === 2) { if (B.links.length && !ready(B.links) && performance.now() - B.t2 < 9000) return true; B.ph = 3; B.todo = B.all.slice(); }
    if (B.ph === 3) { if (!B.todo.length && B.all.length && !B.fin) { B.todo = B.all.slice(); B.fin = 1; }
      while (B.todo.length && performance.now() - t0 < SL()) { const x = B.todo.shift(); if (needs(x)) compileOne(x); markDone(x); clean(x); }
      if (!B.todo.length) { if (B.links) freeL(B.links); B.items.forEach(d => showL(d.hid)); B = null; } return true; }
    return true; }
  // 교전이 시작되면 남은 지연 객체는 즉시 공개(전투 화면에 빠진 물체가 없게)
  // (교전 시작 즉시 공개하던 타이머 제거 — 실기기에서 교전 중 동기 컴파일 멈춤의 원인)
  // 25초가 지났는데 남은 지연 객체는 그냥 공개(안전장치)
  setTimeout(() => { while (defq.length) { const d = defq.shift(); showL(d.hid); } }, DEFER_UNTIL + 8000);
  // 초기 씬도 지연: 본 장면이 처음 완전히 그려지는 프레임에 재질 ~30개가 몰려 2.3초 멈춤(실측) → 지금 있는 객체부터 백그라운드 링크 후 공개
  scene3.children.slice().forEach(o => { if (o.isLight || (o.userData && o.userData.mcRig)) return; const list = []; o.traverse(x => { if (needs(x)) list.push(x); }); if (list.length) pushDefer(o, list); });
  function sweep() {
    try {
      var busy = sweepDeferred(); // 일괄 파이프라인 진행(있으면) — 일반 스캔도 같은 틱에 계속(굶지 않게)
      const combat = typeof F !== 'undefined' && F.length >= 2, ft = typeof ftAvg !== 'undefined' ? ftAvg : 16;
      if (!document.hidden && !(!PAR && combat && (ft > 18 || performance.now() < sweepT))) {
        const t0 = performance.now(), n0 = progs ? progs.length : 0; let made = false, cut = false; const batch = [];
        const skipR = skipRoots(); const visit = fn => { for (const top of scene3.children) { if (skipR.has(top)) continue; top.traverse(fn); } }; // 화면에 안 쓰는 옛 원본 모델(1만3천여 메시)은 순회 제외
        visit(o => { if (made || !o.material || allDone(o) || performance.now() - t0 > (veilUp() ? 40 : 6)) { cut = true; return; } if (!needs(o)) { markDone(o); return; }
          st.swept++; markDone(o); /* 재질당 한 번만 시도 */ if (PAR) { batch.push(o); if (batch.length >= (veilUp() ? 400 : 24)) made = true; } else { compileOne(o); clean(o); if (progs && progs.length !== n0) made = true; } });
        st.sweepIdle = !made && !cut && !batch.length; if (batch.length) { defq.push({ o: null, list: batch.slice(), hid: [] }); batch.length = 0; } // 비동기 파이프라인(소스 수집→백그라운드 링크→컴파일)으로
        if (made && combat) sweepT = performance.now() + 1500; // 교전 중엔 새 프로그램 1개/1.5초
      }
    } catch (e) { }
    setTimeout(sweep, (typeof F !== 'undefined' && F.length >= 2) ? (veilUp() ? 30 : 400) : (busy || veilUp() ? 30 : 60));
  }
  setTimeout(sweep, 1200);
  st.compileOne = compileOne;
  // ① (옛 '씬 전체 한 번에 컴파일'은 스위퍼가 대신함)
  st.compiled = 1;
  // ② FX 풀 예열: 지도 밑(보이지 않음)에 모든 계열 샘플 1회 → 풀 개체·프로그램 사전 업로드
  later(() => {
    const z = V3(0, -3000, 0);
    try { ultBlast(z, 'fire', 6, null, 'w'); st.ult = 1; } catch (e) { }
    try { burst(z, 8, ['#ffffff', '#ffd080', '#80c0ff'], 1.2, 60, 1); } catch (e) { }
    try { ring(z, 3, '#ffffff', false, .5, 1); ring(z, 5, '#ffd080', true, .5, 1); } catch (e) { }
    try { pillar(z, 2, '#80c0ff', .3); light(z, '#ffffff', 3); dome && dome(z, 8, '#ffffff'); } catch (e) { }
    try { if (window.FX3) { if (FX3.ground) FX3.ground(z, 1, null, V3(1, 0, 0)); if (FX3.dustRing) FX3.dustRing(z, 5, 6); if (FX3.streak) FX3.streak(z, V3(1, 0, 0), .3, .05, 1, '#ffffff', 0); if (FX3.wire) FX3.wire(z, V3(5, 3, 0), '#cfe8ff', .2); } } catch (e) { }
    st.fx = 1;
  }, 2500);
  // ③ 수사노오 셰이더 프리워밍: GLB 준비되면 지도 밑 0.06초.show(전투·화면 무영향) — 참격 순간 600ms 컴파일 스톨 제거
  const susWarm = (tries) => {
    if (!window.__susanoo || !__susanoo.ready) { if (tries < 24) setTimeout(() => susWarm(tries + 1), 2000); return; }
    try {
      __susanoo.show({ pos: new THREE.Vector3(0, -4000, 0), heading: 0, scale: 1, model: null }, 'sasuke', { stages: [1, 2, 3], dur: .06 });
      __susanoo.show({ pos: new THREE.Vector3(30, -4000, 0), heading: 0, scale: 1, model: null }, 'itachi', { stages: [1, 2, 3], dur: .06 });
      st.sus = 1;
    } catch (e) { }
  };
  later(() => susWarm(0), 3000);
  // ④ 소환체 프리워밍: 모형만 깎아 씬에 넣고 컴파일 후 즉시 폐기 — 고분할 코드 모형·그림자 셰이더 첫 컴파일 스톨 제거(소환 이벤트 무영향)
  later(() => {
    if (!window.__summonBuild) return;
    try {
      // 한 마리씩 넣고 메시 단위 시분할 컴파일 → 다 되면 폐기(프로그램은 ⓪으로 고정)
      const kinds = ['mahoraga', 'dogW', 'dogB', 'nue', 'elephant'];
      const nextK = () => { const k = kinds.shift(); if (!k) { st.summon = 1; return; } let m = null; try { m = __summonBuild(k); } catch (e) { } if (!m || !m.root) { setTimeout(nextK, 50); return; }
        m.root.position.set(0, -4000, 0); scene3.add(m.root); m.root.updateMatrixWorld(true); const list = []; m.root.traverse(o => { if (needs(o)) list.push(o); });
        const go = () => { const o = list.shift(); if (o) { compileOne(o); setTimeout(go, 40); return; } try { if (window.__summonFree) __summonFree(m.root); } catch (e) { } scene3.remove(m.root); setTimeout(nextK, 120); }; go(); };
      nextK();
    } catch (e) { }
  }, 3400);
  // ⑤ 선발 인물 예열(11-14): 세계관 클릭 직후 1~4초 멈춤 = 새 인물 재질(툰·외곽선·원단) 셰이더 첫 컴파일.
  //   메뉴·몸풀기(교전 전) 유휴 시간에 각 세계관 앞 2명 모형을 숨김 상태로 만들고, 잠깐 보이게 해 컴파일한 뒤 다시 숨김.
  //   모형은 mocap 캐시(MC.rigs)에 남아 클릭 시 CPU 생성도 생략, 프로그램은 ⓪으로 고정돼 그대로 재사용.
  const MC = window.MOCAP;
  later(() => {
    if (!MC || typeof MC.rigOf !== 'function' || typeof TEAMS === 'undefined' || typeof CH === 'undefined') return;
    const ws = Object.keys(TEAMS), q = []; [0].forEach(j => ws.forEach(w => { const k = (TEAMS[w] || [])[j]; if (k) q.push(k); })); // 클릭 즉시 등장하는 선발(0번)부터 전 세계관 → 그다음 1번
    st.chWarm = 0; st.chQ = q.length;
    const tick = () => {
      if (!q.length) return;
      // 교전 중(2명 이상)·화면 숨김·프레임 밀림이면 미룸 — 예열이 전투를 끊지 않게
      if (document.hidden || (typeof F !== 'undefined' && F.length >= 2) || (typeof ftAvg !== 'undefined' && ftAvg > 60) || !MC.ready) { setTimeout(tick, 700); return; } /* 초반엔 ftAvg 가 높게 나와 예열이 계속 미뤄지던 것 완화 */
      const k = q.shift(), ch = CH[k];
      try {
        if (ch && ch.model) {
          const rs = [MC.rigOf(ch)]; if (typeof MC.hdWarm === 'function') rs.push(MC.hdWarm(ch)); // 보통 + 근접 고분할(울트라)
          if (rs.some(r => r && r.holder)) st.chWarm++; // 모형만 만들어 둠 — 컴파일은 스위퍼(ⓢ)가 메시 단위로 나눠서
        }
      } catch (e) { console.warn('warm ch', k, e); }
      setTimeout(tick, 1400); // 모형 생성(CPU ~0.6초/명)도 몰리지 않게 — 선발 1명만(2번째는 교전 중 mocap 사전 생성)
    };
    tick();
  }, 3800);
  // ⓛ 로딩 화면: 접속 직후 무대를 가리고(배경 조립·셰이더 준비·초반 끊김이 뒤에서 처리) 준비되면 걷음 — 최대 10초
  (function veil() { const stage = document.getElementById('stage'); if (!stage) return; const v = document.createElement('div'); v.id = 'bootVeil';
    v.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(circle at 50% 40%,#2a2030,#0c0a10);color:#ffe9a8;font:700 15px "Noto Sans KR",sans-serif;transition:opacity .6s;pointer-events:none';
    v.innerHTML = '<div>전장 준비 중…</div><div style="width:60%;max-width:280px;height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden"><div id="bootBar" style="height:100%;width:5%;background:linear-gradient(90deg,#ff9a1a,#ffe9a8);transition:width .3s"></div></div>'; stage.appendChild(v);
    const t0 = performance.now(), bar = v.querySelector('#bootBar'); let gone = false, lastN = -1, stableAt = 0;
    const tick = () => { if (gone) return; const el = performance.now() - t0, np = progs ? progs.length : 0; if (np !== lastN) { lastN = np; stableAt = el; } const ready = (typeof MOCAP === 'undefined' || MOCAP.ready) && !!scene3.environment && !defq.length && !B && st.sweepIdle && el - stableAt > 1200 && el > 2500; /* 새 셰이더 프로그램이 1.2초간 안 생기고 스위퍼가 한 바퀴를 빈손으로 돌 때만 */
      bar.style.width = Math.min(98, 5 + el / 100) + '%'; if (ready || el > 10000) { gone = true; bar.style.width = '100%'; v.style.opacity = '0'; setTimeout(() => v.remove(), 700); st.veil = Math.round(el); return; } setTimeout(tick, 150); }; tick(); })();
  window.__warmStats =() => Object.assign({}, st);
})();
