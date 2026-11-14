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
    renderer.render = function (s, c) { const r = _rd(s, c); if (progs.length !== lastN) { lastN = progs.length; pinAll(); } return r; };
    const _cp = renderer.compile.bind(renderer); renderer.compile = function (s, c) { const r = _cp(s, c); pinAll(); return r; };
  }
  // 병렬 셰이더 컴파일(지원 GPU): 여러 프로그램을 드라이버 스레드에서 동시에 → 몰릴 때 대기 합계 단축
  try { renderer.getContext().getExtension('KHR_parallel_shader_compile'); } catch (e) { }
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
      scene3.children.slice().forEach(o => { if (o.position && o.position.y < -3000) { try { if (window.__summonFree) __summonFree(o); } catch (e) { } scene3.remove(o); } });
      st.summon = 1;
    } catch (e) { }
  }, 3400);
  // ⑤ 선발 인물 예열(11-14): 세계관 클릭 직후 1~4초 멈춤 = 새 인물 재질(툰·외곽선·원단) 셰이더 첫 컴파일.
  //   메뉴·몸풀기(교전 전) 유휴 시간에 각 세계관 앞 2명 모형을 숨김 상태로 만들고, 잠깐 보이게 해 컴파일한 뒤 다시 숨김.
  //   모형은 mocap 캐시(MC.rigs)에 남아 클릭 시 CPU 생성도 생략, 프로그램은 ⓪으로 고정돼 그대로 재사용.
  const MC = window.MOCAP;
  later(() => {
    if (!MC || typeof MC.rigOf !== 'function' || typeof TEAMS === 'undefined' || typeof CH === 'undefined') return;
    const ws = Object.keys(TEAMS), q = []; [0, 1].forEach(j => ws.forEach(w => { const k = (TEAMS[w] || [])[j]; if (k) q.push(k); })); // 클릭 즉시 등장하는 선발(0번)부터 전 세계관 → 그다음 1번
    st.chWarm = 0; st.chQ = q.length;
    const tick = () => {
      if (!q.length) return;
      // 교전 중(2명 이상)·화면 숨김·프레임 밀림이면 미룸 — 예열이 전투를 끊지 않게
      if (document.hidden || (typeof F !== 'undefined' && F.length >= 2) || (typeof ftAvg !== 'undefined' && ftAvg > 30) || !MC.ready) { setTimeout(tick, 700); return; }
      const k = q.shift(), ch = CH[k];
      try {
        if (ch && ch.model) {
          const rs = [MC.rigOf(ch)]; if (typeof MC.hdWarm === 'function') rs.push(MC.hdWarm(ch)); // 보통 + 근접 고분할(울트라)
          const hs = rs.filter(r => r && r.holder).map(r => [r.holder, r.holder.visible]);
          if (hs.length) { hs.forEach(h => { h[0].visible = true; }); renderer.compile(scene3, camera); hs.forEach(h => { h[0].visible = h[1]; }); st.chWarm++; }
        }
      } catch (e) { console.warn('warm ch', k, e); }
      setTimeout(tick, 250);
    };
    tick();
  }, 3800);
  window.__warmStats =() => Object.assign({}, st);
})();
