// 위험 국면 시각화(그래픽·조명): 체력이 25% 아래로 떨어진 출전 인물에게 붉은 오라(전용 점광원) + 화면 가장자리 위험 비네트 — ai-balance.js 의 아드레날린(역전)과 짝을 이루는 연출.
// 위험: 렌더 파이프라인 무간섭. 전용 점광원은 로드 시(렌더 시작 전) 장면에 고정 추가하고 세기만 바꿈(셰이더 재컴파일 없음). CSS 겹은 DOM 일뿐 캔버스 렌더와 무관. quality=low 와 LightFX 꺼짐(arenaLightFx='0')을 따른다.
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined' || !window.HP) return;
  const D = window.FXDANGER = { on: true, st: { active: 0, pulses: 0 } };
  const nowS = () => performance.now() / 1000;
  const Q = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  // ── 화면 가장자리 위험 비네트(DOM 겹, HUD 글자 아래) ──
  const css = document.createElement('style');
  css.textContent = `#fxDanger{position:absolute;inset:0;pointer-events:none;z-index:4;opacity:0;transition:opacity .5s;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 52%,rgba(200,16,16,.30) 82%,rgba(140,8,8,.5) 100%)}
#fxDanger::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(0,0,0,0) 55%,rgba(255,40,30,.16) 100%);opacity:0;transition:opacity .35s}
#fxDanger.pulse::after{opacity:1}`;
  document.head.appendChild(css);
  const stage = document.getElementById('stage');
  const el = document.createElement('div'); el.id = 'fxDanger';
  if (stage) stage.appendChild(el);
  // ── 전용 오라 점광원 풀(고정 3개, 세기·위치만 변경) ──
  const POOL = [];
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ff3a24', 0, 60, 2); scene3.add(l); POOL.push({ l, f: null }); }
  setInterval(() => { // 0.25초마다: 위험 인물(HP<25%·비다운·비KO·장면 내)을 풀에 배정
    if (!D.on || typeof F === 'undefined') { POOL.forEach(s => { s.f = null; }); return; }
    const danger = F.filter(f => !f.away && !f.down && !(f.stun > 0) && HP.of(f) && !HP.of(f).ko && HP.of(f).max && HP.of(f).hp / HP.of(f).max < .25);
    POOL.forEach((s, i) => { s.f = danger[i] || null; });
    D.st.active = Math.min(danger.length, POOL.length);
  }, 250);
  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    try {
      const t = nowS(), low = Q() === 'low', off = !D.on || (typeof localStorage !== 'undefined' && localStorage.getItem('arenaLightFx') === '0');
      let onCount = 0;
      for (const s of POOL) {
        const f = s.f;
        if (off || low || !f || (typeof F !== 'undefined' && !F.includes(f)) || f.away || f.down) { s.l.intensity = 0; continue; }
        const r = HP.of(f), p = r && r.max ? r.hp / r.max : 1; // 체력이 낮을수록 진하게(15%→최대)
        const puls = .7 + .3 * Math.sin(t * 6);
        s.l.intensity = (1.6 - p * 4) * puls * 1.4;
        s.l.position.set(f.pos.x, (typeof chest === 'function' ? Math.max(6, chest(f).y) : f.pos.y + 8), f.pos.z);
        onCount++;
        if (puls > .985) { D.st.pulses++; }
      }
      if (el) {
        el.style.opacity = off || !onCount ? '0' : String(Math.min(.85, .45 + .18 * onCount));
        el.classList.toggle('pulse', onCount > 0 && Math.sin(t * 5) > .55);
      }
    } catch (e) { console.warn('fx-danger loop', e); }
    requestAnimationFrame(loop);
  })(performance.now());
  D.set = on => { D.on = !!on; if (!on) { POOL.forEach(s => { s.l.intensity = 0; s.f = null; }); if (el) el.style.opacity = '0'; } };
})();
