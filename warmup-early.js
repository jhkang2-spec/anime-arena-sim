// ?perf=1 : 실기기 진단 기록기(셰이더 컴파일 대기·긴 작업·호출 위치). 결과: window.__perf / __perfSum()
(function () { if (!/[?&]perf=1/.test(location.search) || typeof renderer === 'undefined') return;
  const P = window.__perf = { comp: [], lt: [], t0: performance.now() }, GL = renderer.getContext();
  const where = () => new Error().stack.split('\n').slice(3, 14).map(l => { const m = l.match(/at (\S+) .*\/([\w\-.]+\.js):(\d+)/); return m && !/three\.min/.test(m[2]) ? m[1] + '@' + m[2] + ':' + m[3] : ''; }).filter(Boolean).slice(0, 4).join(' < ');
  ['getProgramParameter', 'getProgramInfoLog', 'getShaderParameter', 'getUniformLocation', 'getActiveUniform'].forEach(n => { const f = GL[n]; GL[n] = function () { const t = performance.now(); const r = f.apply(GL, arguments); const d = performance.now() - t; if (d > 40) P.comp.push([+(t / 1000).toFixed(2), Math.round(d), n, where()]); return r; }; });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.duration > 150) P.lt.push([+(e.startTime / 1000).toFixed(2), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch (e) { }
  window.__perfSum = () => { const by = {}; P.comp.forEach(c => { const k = c[3] || '(?)'; by[k] = (by[k] || 0) + c[1]; }); return { lt: P.lt, compTotal: P.comp.reduce((a, c) => a + c[1], 0), compN: P.comp.length, topWhere: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12), comp: P.comp.slice(0, 40) }; };
})();
// warmup-early.js — 접속 직후(arena.js 바로 다음) 실행: 환경맵(PMREM) 블러 셰이더를 GPU 백그라운드에서 미리 링크(11-14 초반 렉).
// 실측: materials.js·env-hi.js·env-assets.js 의 첫 환경맵 생성 순간 2.3~2.6초 멈춤(D3D11 에서 PMREM 블러 셰이더 컴파일이 매우 무거움).
// 방법: 버리는 생성기로 three 가 만들 셰이더 소스를 '모의 컴파일'(GL 호출 가로채기, 실제 컴파일 없음)로 얻고 → 같은 소스를
//   KHR_parallel_shader_compile 로 백그라운드 링크 → 끝나면 PMREM_WARM.ready. 환경맵 만드는 쪽은 ready 까지(최대 6초) 기다렸다 생성 → ANGLE 캐시 적중.
(function () {
  const W = window.PMREM_WARM = { ready: false, n: 0 };
  const done = () => { W.ready = true; };
  setTimeout(done, 6000); // 안전장치: 무슨 일이 있어도 6초 뒤엔 진행
  try {
    if (typeof renderer === 'undefined' || !THREE.PMREMGenerator) return done();
    const GL = renderer.getContext(), PAR = GL.getExtension('KHR_parallel_shader_compile'); if (!PAR) return done();
    const progs = renderer.info.programs, src = new Map(), att = new Map(), S = {}, N = ['shaderSource', 'compileShader', 'attachShader', 'linkProgram', 'getShaderParameter', 'getProgramParameter', 'getShaderInfoLog', 'getProgramInfoLog', 'useProgram', 'drawArrays', 'drawElements'];
    N.forEach(n => { S[n] = GL[n]; }); const n0 = progs.length;
    GL.shaderSource = function (s, t) { src.set(s, t); return S.shaderSource.call(GL, s, t); }; GL.compileShader = function () { }; GL.linkProgram = function () { };
    GL.attachShader = function (p, s) { if (!att.has(p)) att.set(p, []); att.get(p).push(s); return S.attachShader.call(GL, p, s); };
    GL.getShaderParameter = function () { return true; }; GL.getProgramParameter = function (p, pn) { return pn === GL.LINK_STATUS ? true : (pn === GL.ACTIVE_UNIFORMS || pn === GL.ACTIVE_ATTRIBUTES) ? 0 : S.getProgramParameter.call(GL, p, pn); };
    GL.getShaderInfoLog = function () { return ''; }; GL.getProgramInfoLog = function () { return ''; }; GL.useProgram = function () { }; GL.drawArrays = function () { }; GL.drawElements = function () { };
    const rt0 = renderer.getRenderTarget();
    try {
      const tex = new THREE.DataTexture(new Uint8Array(16 * 8 * 4).fill(128), 16, 8, THREE.RGBAFormat); tex.mapping = THREE.EquirectangularReflectionMapping; tex.needsUpdate = true;
      const sc = new THREE.Scene(); sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), new THREE.MeshBasicMaterial({ side: THREE.BackSide })));
      const pm = new THREE.PMREMGenerator(renderer); pm.fromEquirectangular(tex); pm.fromScene(sc, .02); // dispose 안 함(가짜 프로그램 해제가 캐시 배열을 건드리지 않게)
    } catch (e) { } finally { N.forEach(n => { GL[n] = S[n]; }); renderer.setRenderTarget(rt0); }
    const made = progs.splice(n0), L = [];
    made.forEach(p => { const sh = att.get(p.program) || []; try { GL.deleteProgram(p.program); } catch (e) { } if (sh.length !== 2 || !src.get(sh[0]) || !src.get(sh[1])) return;
      const v = GL.createShader(GL.VERTEX_SHADER), f = GL.createShader(GL.FRAGMENT_SHADER), q = GL.createProgram(); GL.shaderSource(v, src.get(sh[0])); GL.compileShader(v); GL.shaderSource(f, src.get(sh[1])); GL.compileShader(f); GL.attachShader(q, v); GL.attachShader(q, f); GL.linkProgram(q); L.push({ q, v, f }); });
    W.n = L.length; if (!L.length) return done();
    const poll = () => { if (L.every(x => GL.getProgramParameter(x.q, PAR.COMPLETION_STATUS_KHR))) { L.forEach(x => { try { GL.deleteProgram(x.q); GL.deleteShader(x.v); GL.deleteShader(x.f); } catch (e) { } }); done(); } else setTimeout(poll, 80); };
    poll();
  } catch (e) { done(); }
})();
