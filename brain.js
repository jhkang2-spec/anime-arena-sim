// 상황 판단 층: 미리 정한 결과 대신, 맞는 순간마다 각자 성격·체력·가드 게이지·자세를 보고 막기·흘리기·피하기·받아치기를 고른다.
// 교전 순서도 고정 시간표가 아니라 기회(경직·지침)·위험(협공·연속 피격)에 따라 그때그때 바뀐다.
(function () {
  if (typeof F === 'undefined' || typeof resolve !== 'function') return;
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };
  // 인물마다 다른 성향(같은 인물도 판마다 조금씩 다름)
  function mind(f) {
    if (!f.ai || f.ai.key !== f.ch.key) {
      const k = f.ch.key, j = () => R(-.15, .15);
      f.ai = { key: k, aggr: .35 + hash(k + 'a') * .6 + j(), guard: .3 + hash(k + 'g') * .6 + j(), evade: .3 + hash(k + 'e') * .6 + j(), react: .3 + hash(k + 'r') * .6 + j(), mood: R(-.2, .2) };
      f.gauge = 100; f.lastHitT = -9; f.lastActT = -9; f.combo = 0;
    }
    return f.ai;
  }
  let now = 0;
  // 1) 결과를 맞는 순간 판단
  const _resolve = resolve;
  resolve = function (a, b, ek, o, nm, pw = 1, at) {
    if (a && b && a !== b && F.includes(b) && F.includes(a)) o = judge(a, b, o, pw);
    if (b) { b.lastHitT = now; } if (a) a.lastActT = now;
    return _resolve.call(this, a, b, ek, o, nm, pw, at);
  };
  function judge(a, b, o, pw) {
    const m = mind(b), am = mind(a);
    if (b.stun > 0) return 'hit';                                   // 경직 중이면 못 막음
    const busy = now - b.lastActT < .35, pressed = now - b.lastHitT < .6; // 막 공격하던 참·연속으로 맞는 중
    const ally = F.filter(x => x !== a && x !== b && x.target === b).length; // 협공 당하는 중
    const w = { hit: .9 * (1 + am.aggr * .5) * (busy ? 1.8 : 1) * (pressed ? 1.3 : 1) * (1 + ally * .4) * pw,
      block: m.guard * (b.gauge > 20 ? 1.4 : .3), dodge: m.evade * (b.air ? .5 : 1.1), jump: m.evade * .6,
      counter: m.react * (pressed ? .3 : .8) * (1 + m.mood), sub: .12 };
    w[o] = (w[o] || 0) + .8;                                         // 기술 원래 의도도 반영
    let r = Math.random() * Object.values(w).reduce((s, v) => s + v, 0), pickO = 'hit';
    for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { pickO = k; break; } }
    if (b.forceDef && b.forceDef.until > performance.now()) { pickO = b.forceDef.o; b.forceDef = null; if (window.TACTICS) TACTICS.st.forced++; } // tactics.js 가 미리 정한 방어(상대 준비 동작을 보고 가드·쳐내기·바꿔치기)
    if (pickO === 'block') { b.gauge -= (14 + 10 * pw) * R(.7, 1.3); if (b.gauge <= 0) { b.gauge = 55; b.stun = R(.8, 1.4); label(headP(b).add(V3(0, 8, 0)), '가드 붕괴!', '#ff9a3a', { big: true }); shield(b, '#ff6a3a'); return 'hit'; } }
    react(b, a, pickO);
    return pickO;
  }
  // 판단에 맞춰 그 순간의 몸 반응
  function react(b, a, o) {
    const d = dirTo(a, b), sd = V3(-d.z, 0, d.x).multiplyScalar(pick([-1, 1]));
    if (o === 'block') apply(b, { pose: 'block', face: a, k: 70 }, .2);
    else if (o === 'dodge') { apply(b, { pose: pick(['crouchRun', 'air', 'guard']), face: a, k: 80 }, .2); b.kb.addScaledVector(sd, R(140, 240)); }
    else if (o === 'jump') { b.vel.y = Math.max(b.vel.y, R(180, 260)); b.air = true; b.kb.addScaledVector(sd, R(60, 120)); }
    else if (o === 'counter') { apply(b, { pose: pick(['punch', 'slash', 'highKick', 'palm']), face: a, k: 95 }, .15); }
  }
  // 2) 날아오는 것: 쏘는 순간 받는 쪽 성향으로 맞기·막기·흘리기·뛰어 피하기를 정함
  const _proj = proj;
  proj = function (a, b, kind, mode, o = {}) {
    if (b && F.includes(b) && b !== a) { const m = mind(b), size = o.size || 1;
      const w = { hit: .8 * size * (b.stun > 0 ? 3 : 1), block: m.guard * .9, deflect: m.react * (size < 1.8 ? 1.1 : .25), jump: m.evade * .9, sub: .1 };
      let r = Math.random() * Object.values(w).reduce((s, v) => s + v, 0); for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { mode = k; break; } } }
    return _proj.call(this, a, b, kind, mode, o);
  };
  // 3) 순서표 대신 기회·위험에 따라 다음 교전을 고름
  const _plan = plan;
  plan = function () {
    F.forEach(mind);
    const weak = F.filter(f => f.stun > 0 || f.gauge < 30), r = Math.random();
    if (weak.length && r < .65) { const v = pick(weak), a = pick(others(v)); if (a) { a.target = v; v.target = a; label(headP(a).add(V3(0, 6, 0)), pick(['기회!', '틈 발견!', '파고든다!']), '#ffd84a');
      return withThird([...approach(a, v, R(8, 14), 'crouchRun', { ghost: Math.random() < .4 ? 1 : 0 }), ...skillOf(a, v, Math.random() < .5)], a, v); } }
    const tired = F.find(f => f.gauge < 45 && Math.random() < .5);
    if (tired && others(tired).length) { const e = pick(others(tired)), back = dirTo(e, tired); // 숨 고르기: 물러나며 가드, 상대는 압박 또는 견제
      return withThird([step(R(.3, .6), [[tired, { pose: pick(['guard', 'block', 'braced']), to: () => tired.pos.clone().addScaledVector(back, R(30, 60)), face: e }], [e, Math.random() < .6 ? { pose: 'crouchRun', to: near(e, tired, 12), face: tired } : { pose: 'stance', face: tired, side: R(-80, 80) }]], () => { tired.gauge = Math.min(100, tired.gauge + 25); })], tired, e); }
    return _plan();
  };
  // 4) 박자 흔들기: 망설임·간보기·급발진이 섞임 / 큰 사건이 생기면 하던 흐름을 끊고 새로 판단
  const _runStep = runStep;
  runStep = function (s) { let d = _runStep(s); const r = Math.random(); if (r < .1) d += R(.12, .5); else if (r < .2) d *= R(.5, .8); return d; };
  const _laneTick = laneTick;
  laneTick = function (dt) {
    now += dt; F.forEach(f => { mind(f); f.gauge = Math.min(100, (f.gauge ?? 100) + dt * (f.stun > 0 ? 2 : 9)); });
    lanes.forEach(L => { if (L.q.length && Math.random() < dt * .35) { if (L.fs.some(f => now - f.lastHitT < .1 && f.stun > 0)) L.q.length = Math.min(L.q.length, 1); else if (Math.random() < .25) L.q.length = Math.min(L.q.length, 2); } });
    return _laneTick(dt);
  };
  window.__brain = { mind, judge };
})();
