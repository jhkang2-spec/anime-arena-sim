// ═══ 비행(fly) 캐릭터 상시 채공 ═══
// sig.fly=true 인물(아이언맨·토르·비전)은 전장을 일정 높이로 떠서 다닌다(arena.js 의 수직 적분이 f.hover 를 봄).
// 노크백(Rapier flights)·다운 중엔 해제 → 정상 피격/교대에 영향 없음. FLIGHT.on=false 로 완전 끈다.
(function () {
  if (typeof F === 'undefined' || typeof parts === 'undefined' || typeof V3 === 'undefined') return;
  const FL = window.FLIGHT = {
    on: true,
    H: { ironman: 18, thor: 15, vision: 13, default: 15 },
    jet: { ironman: '#7fe3ff', thor: '#cfe8ff', vision: '#ff7a3a', default: '#e8f0ff' },
  };
  let fr = 0;
  (function loop() {
    if (FL.on) {
      fr++;
      const fl = window.PHYS && PHYS.flights;
      for (const f of F) {
        const fly = f.ch && f.ch.sig && f.ch.sig.fly;
        const knocked = fl && fl.has && fl.has(f);
        if (fly && !f.down && !knocked && !f.arc) {
          f.hover = true; f.hoverH = FL.H[f.ch.key] || FL.H.default; f.air = true; f.aura = 1; f._auraFly = 1;
          if (f.vel.y === undefined) f.vel.y = 0;
          if (f.pos.y < f.hoverH - 2 && f.vel.y < 40) f.vel.y += 30;   // 이륙 도움
          if ((fr & 1) === 0 && f.pos.y > 4 && (typeof ftAvg === 'undefined' || ftAvg < 19)) { const c = FL.jet[f.ch.key] || FL.jet.default; const nj = (typeof ftAvg !== 'undefined' && ftAvg > 16) ? 1 : 2;
            for (let i = 0; i < nj; i++) parts.push({ p: f.pos.clone().add(V3(R(-1.4, 1.4), .5, R(-1.4, 1.4))), v: V3(R(-12, 12), R(-110, -50), R(-12, 12)), life: .45, c, g: 0, s: 1.4 });
          }
        } else { f.hover = false; if (f._auraFly) { f.aura = 0; f._auraFly = 0; } }
      }
    }
    requestAnimationFrame(loop);
  })();
})();
