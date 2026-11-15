// gpu-gov.js — 11-15 근본 최적화: "브라우저 자체가 클릭·타이핑이 안 먹을 만큼 멈춘다"
// 실측(GTX 1060 3GB, 실제 Chrome, 중간 품질, 590×990): 장면 한 장 GPU 18.7ms(90% 21.9ms) > 60Hz 한 장 예산 16.7ms
//   → GPU 가 100% 포화되어 쉬는 틈이 없음. 크롬은 같은 GPU 로 자기 화면(탭·주소창·입력 반응)까지 그리므로 브라우저 전체가 굳는다.
// 기존 해상도 환류는 '프레임 간격(rAF)'만 봐서 60fps 를 겨우 맞추는 동안엔(포화 상태여도) 아무것도 안 낮췄다.
// 해결: 실제 GPU 시간(EXT_disjoint_timer_query_webgl2, 기다림 없는 비동기 조회)을 재서 GPU 사용률이 약 70%를 넘지 않게 유지한다.
//   과부하 → ① 그림자 지도 2프레임에 1번 갱신 ② 렌더 해상도 단계적 하강(최저 60%) / 여유 → 반대 순서로 복원.
//   arena.js 의 화면 갱신은 최대 약 75fps 로 제한(144Hz 모니터에서 GPU 일을 2배로 하지 않게).
// 끄기: 주소에 ?gov=0. 상태: window.GPUGOV
(function () {
  if (typeof renderer === 'undefined' || typeof scene !== 'function' || /[?&]gov=0/.test(location.search)) return;
  const gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const G = window.GPUGOV = { on: !!ext, gpu: 0, budget: 11.5, sh: 0, res: 1, steps: 0, hist: [] };
  if (!ext) return;
  const pend = [], samp = [];
  let fr = 0, lastCheck = performance.now(), calm = 0;
  const S0 = scene;
  scene = function () {
    fr++;
    // 그림자 격프레임 갱신(과부하 1단계)
    if (G.sh) { renderer.shadowMap.autoUpdate = false; if (fr % 2 === 0) renderer.shadowMap.needsUpdate = true; } else if (G._shWas) { renderer.shadowMap.autoUpdate = true; }
    G._shWas = G.sh;
    let q = null; if (pend.length < 6) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    try { return S0.apply(this, arguments); }
    finally {
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pend.push(q); }
      for (let i = pend.length - 1; i >= 0; i--) { const p = pend[i]; if (gl.getQueryParameter(p, gl.QUERY_RESULT_AVAILABLE)) { if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) samp.push(gl.getQueryParameter(p, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(p); pend.splice(i, 1); } }
      if (samp.length > 40) samp.splice(0, samp.length - 40);
      const now = performance.now();
      if (now - lastCheck > 1000 && samp.length >= 8) { lastCheck = now; decide(); }
    }
  };
  function med(a) { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; }
  function setRes(v) { try { resScale = Math.max(.6, Math.min(1, v)); G.res = +resScale.toFixed(2); fitRes(); } catch (e) { } }
  function decide() {
    const g = med(samp); G.gpu = +g.toFixed(1); G.hist.push(G.gpu); if (G.hist.length > 30) G.hist.shift();
    const hi = G.budget, lo = G.budget * .62;
    if (g > hi) { calm = 0; G.steps++;
      if (!G.sh) G.sh = 1;                                   // ① 그림자 격프레임
      else if (resScale > .6) setRes(resScale * (g > hi * 1.4 ? .82 : .9)); // ② 해상도 하강(심하면 크게)
      samp.length = 0;                                       // 바뀐 상태로 다시 잰다
    } else if (g < lo) { if (++calm >= 3) { calm = 0;
      if (resScale < 1) setRes(resScale * 1.06);              // 해상도 먼저 복원
      else if (G.sh) G.sh = 0;                                // 그다음 그림자 매 프레임
      samp.length = 0; } }
    else calm = 0;
  }
})();
