// 밸런스 조정층(역전 가능성): 체력이 급감한 인물이 오히려 살짝 세게 때리는 아드레날린 — 집중 화력으로 한 명을 먼저 떨어뜨리는 흐름에 브레이크를 걸어, 한 팀이 그대로 밀리지 않게 한다.
// tactics.js 의 BUFFS.dmgMul(강화·경화·영역 등 상태 배율) 위에 얹기만 한다. 체력 기록(hp.js)과 함께 동작.
(function () {
  if (!window.TACTICS || typeof F === 'undefined' || !window.BUFFS || typeof BUFFS.dmgMul !== 'function') return;
  const _dm = BUFFS.dmgMul;
  BUFFS.dmgMul = function (a, v) {
    let m = _dm.apply(this, arguments) || 1;
    if (window.HP && HP.on && HP.of && a && !a.down && !(a.stun > 0)) {
      const r = HP.of(a);
      if (r && !r.ko && r.max) {
        const p = r.hp / r.max;
        if (p < .25) { m *= 1.18; BUFFS._adr = (BUFFS._adr || 0) + 1; }
        else if (p < .5) m *= 1.06;
      }
    }
    return m;
  };
})();
