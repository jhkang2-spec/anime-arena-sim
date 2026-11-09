// warmup.js — 첫 사용 스톨(셰이더 컴파일·GPU 웜) 제거(11-09). 품질 기본값·GPU 티어는 aaa.js 가 정함.
// 실측: GTX 1060 3GB — 지속 fps 는 충분하나 수사노오/소환/필살기 '첫 발동' 순간 p99 900ms+ → 예열로 제거.
(function () {
  if (typeof renderer === 'undefined' || typeof scene3 === 'undefined' || typeof camera === 'undefined') return;
  const st = window.WARM = { compiled: 0, sus: 0, summon: 0, fx: 0, gpu: (window.AAA && AAA.gpu) || '', tier: (window.AAA && AAA.gpuTier) || '' };
  const later = (fn, t0) => { const iv = setInterval(() => { if (document.hidden) return; if (performance.now() > t0) { clearInterval(iv); try { fn(); } catch (e) { console.warn('warm', e); } } }, 300); };
  // ① 씬 전체 셰이더 사전 컴파일(전투 직전, 정적 씬이라 멈춤 체감 없음)
  later(() => { renderer.compile(scene3, camera); st.compiled = 1; }, 2000);
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
      ['mahoraga', 'dogW', 'dogB', 'nue', 'elephant'].forEach(k => { try { const m = __summonBuild(k); if (m && m.root) { m.root.position.set(0, -4000, 0); scene3.add(m.root); } } catch (e) { } });
      renderer.compile(scene3, camera);
      scene3.children.slice().forEach(o => { if (o.position && o.position.y < -3000) scene3.remove(o); });
      st.summon = 1;
    } catch (e) { }
  }, 3400);
  window.__warmStats = () => Object.assign({}, st);
})();
