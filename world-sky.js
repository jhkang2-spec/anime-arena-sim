// ═══ 해 위치 기반 광원(day cycle) ═══
// 기존 고정 조명(sun 방향광·HemisphereLight)과 스카이/포그 색을 해 고도에 연동: 새벽·황혼=따뜻한 저각광, 낮=밝은 백광, 밤=차가운 달빛.
// renderer.shadowMap은 성능상 꺼져 있으므로(발밑 원형 그림자 사용) 방향광의 방향·색·세기만 바꿔 토on 음영과 하늘 톤을 바꾼다.
// SKY.on=false 로 끄면 이전 고정 룩 그대로. SKY.cycle=false 후 window.setSun(0..1)로 임의 시각 고정 가능.
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined' || typeof sun === 'undefined') return;
  const hemi = scene3.children.find(o => o.isHemisphereLight);
  const SKY = window.SKY = { on: true, cycle: true, dayT: 0.34, len: 160 };
  const R = 420;
  // 팔레트 (THREE.Color는 set로 재사용해 매 프레임 할당 없음)
  const C = k => new THREE.Color(k);
  const P = {
    nightBg: C('#0b1322'), dayBg: C('#7fb0e0'), duskBg: C('#ff7a4a'),
    moon: C('#b8c8ff'), dawn: C('#ff8a3a'), noon: C('#fff2d8'),
    hemiSkyN: C('#4a5a88'), hemiSkyD: C('#9fb8e8'), hemiGrN: C('#14201c'), hemiGrD: C('#2a3a2c'),
  };
  const bg = new THREE.Color(), fogC = new THREE.Color(), sc = new THREE.Color(), hs = new THREE.Color(), hg = new THREE.Color();
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function upd() {
    const a = SKY.dayT * Math.PI * 2, elev = Math.sin(a);
    const dayness = clamp((elev - 0.0) / 0.35, 0, 1);          // 0=밤, 1=낮
    const warm = Math.exp(-Math.pow(elev / 0.22, 2));          // 지평선(elev≈0) 부근 최대=새벽/황혼
    // 방향광: 항상 위쪽에서(밤엔 달빛), 고도·방위는 해를 따름
    sun.position.set(Math.cos(a) * R, Math.max(45, Math.sin(a) * R), 0.45 * R);
    sc.copy(P.moon).lerp(P.noon, dayness).lerp(P.dawn, warm * 0.85);
    sun.color.copy(sc); sun.intensity = 0.18 + dayness * 0.95 + warm * 0.35;
    // 스카이·포그: 밤->낮 보간 후 지평선 따뜻한 글로우 얹기
    bg.copy(P.nightBg).lerp(P.dayBg, dayness).lerp(P.duskBg, warm * 0.55);
    scene3.background.copy(bg);
    if (scene3.fog && scene3.fog.color) scene3.fog.color.copy(bg);
    // 헤미스피어: 하늘/땅 톤과 세기
    if (hemi) {
      hs.copy(P.hemiSkyN).lerp(P.hemiSkyD, dayness).lerp(P.duskBg, warm * 0.4);
      hg.copy(P.hemiGrN).lerp(P.hemiGrD, dayness);
      hemi.color.copy(hs); hemi.groundColor.copy(hg); hemi.intensity = 0.6 + dayness * 0.5;
    }
  }
  window.setSun = t => { SKY.cycle = false; SKY.dayT = clamp(Number(t) || 0, 0, 1); upd(); };
  upd();
  let last = 0;
  (function loop(now) {
    if (SKY.on && SKY.cycle) { const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; SKY.dayT = (SKY.dayT + dt / SKY.len) % 1; upd(); }
    else last = now;
    requestAnimationFrame(loop);
  })(0);
})();
