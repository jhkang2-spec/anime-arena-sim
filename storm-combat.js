// 스톰 컴뱃 층(고도화 11-06 — 현대 극장판급 격투 문법): arena·combat·tactics 위에 얹는 독립 층.
// ① 차크라 게이지·차크라 대시(combat 의 돌진 속도 배율)·대시 캔슬(맞으면 중단·환급)
// ② 바꿔치기(대타) 4회 잔량 — combat.land() 직전 CB.preLand 훅으로 피해 없이 몸만 바뀜(막대/분신 소환·나루토 '펑')
// ③ 공중 체이스(띄운 상대를 공중에서 이어 침, 인물당 2회) ④ 벽 반동(가장자리 빠른 넉백 → 되튐 + 차크라 보상)
// ⑤ 각성(체력 임계 + 게이지) ⑥ 지원 게이지(팀 어시스트 한 수) ⑦ 충돌 에스컬레이션(맞대결 연타 극화)
// ⑧ 시네마틱 큐(큰 사건에서 카메라·멈춤 극화) — 모든 게이지는 clampState 로 매 화면 불변량 유지.
(function () {
  if (typeof F === 'undefined' || typeof resolve !== 'function' || typeof apply !== 'function' || !window.COMBAT) return;
  const CB = window.COMBAT, TX = window.TACTICS;
  const now = () => performance.now() / 1000;
  const alive = f => f && F.includes(f);
  const foe = (a, b) => a !== b && !(a && b && a.team && b.team && a.team === b.team);
  const hp01 = f => { const r = window.HP && HP.of ? HP.of(f) : null; if (r && r.max) return r.hp / r.max; return 1 - Math.min(1, (f.tire || 0) / Math.max(1, f.tireLim || 10)); };
  const snd = (name, p, o) => { try { if (window.SFX && SFX.play) SFX.play(name, p, o || {}); } catch (e) { } };

  const SC = window.STORM_COMBAT = {
    enabled: true,
    cfg: {
      chakraMax: 100, chakraRegen: 6, chakraOnHit: 10, chakraOnTaken: 14, chakraOnBlock: 8,
      dashCost: 24, dashBoost: 1.55, dashDur: .4, dashCancelRefund: 12,
      substitutionMax: 4, substitutionCool: 2.5,
      awakenHp: .3, awakenGauge: 100, awakenDur: 12,
      supportGauge: 100, supportRegen: 4, supportTeamCool: 12,
      airChaseMax: 2, wallBounceMin: 140, clashEscWindow: 2.2, clashEscMax: 4
    },
    st: { dashes: 0, dashCancels: 0, substitutions: 0, airChases: 0, wallBounces: 0, awakenings: 0, supports: 0, clashEscalation: 0, cinematicCues: 0, clampFixes: 0, subsByWorld: {} },
    reset() { const s = SC.st; Object.keys(s).forEach(k => { if (typeof s[k] === 'number') s[k] = 0; else s[k] = {}; }); SC.teamCd = {}; },
    // ── 상태 불변량: 모든 게이지·잔량을 항상 유효 범위 안으로(작동 감사 게이트) ──
    clampState(f) {
      if (!f) return; const c = SC.cfg, fixed = [];
      const s = f.storm || (f.storm = {});
      const clamp = (k, lo, hi, init) => { let v = s[k]; if (v == null || typeof v !== 'number' || !isFinite(v)) { s[k] = init; fixed.push(k); return; } if (v < lo) { s[k] = lo; fixed.push(k); } else if (v > hi) { s[k] = hi; fixed.push(k); } };
      clamp('chakra', 0, c.chakraMax, 30 + Math.random() * 20);
      clamp('subs', 0, c.substitutionMax, c.substitutionMax);
      clamp('awakenGauge', 0, c.awakenGauge, 0);
      clamp('support', 0, c.supportGauge, 0);
      clamp('airChase', 0, c.airChaseMax, 0);
      clamp('subCool', 0, 60, 0);
      clamp('awakeUntil', 0, 1e9, 0);
      clamp('dashEnd', 0, 1e9, 0);
      if (typeof s.awake !== 'boolean') { s.awake = false; fixed.push('awake'); }
      if (typeof s.dashing !== 'boolean') { s.dashing = false; fixed.push('dashing'); }
      if (fixed.length) SC.st.clampFixes++;
      return s;
    },
    stats: () => SC.st
  };
  // 메커니즘 함수 공개(감사·디버그에서 강제로 발동·확인할 수 있게)
  SC.chakraDash = chakraDash; SC.dashCancel = dashCancel; SC.tryAwaken = tryAwaken; SC.trySupport = trySupport; SC.cinematicCue = cinematicCue;
  SC.teamCd = SC.teamCd || {};

  // ── ⑧ 시네마틱 큐: 큰 사건에서 카메라·멈춤을 한 단계 극화 ──
  function cinematicCue(f, o, kind) {
    if (!SC.enabled || !alive(f)) return;
    SC.st.cinematicCues++;
    try {
      if (kind === 'awaken') shot('face', 2.4, f, o || f);
      else if (kind === 'sub') shot('close', 1.2, f, o);
      else if (kind === 'clash') shot('quarter', 1.3, f, o);
      else if (kind === 'assist') shot('duel', 1.2, f, o);
      else if (kind === 'counter') shot('duel', 1.4, f, o);
    } catch (e) { }
  }

  // ── ① 차크라 대시·캔슬 ──
  function chakraDash(f) {
    const c = SC.cfg, s = SC.clampState(f);
    if (s.chakra < c.dashCost || s.dashing) return false;
    s.chakra -= c.dashCost; s.dashing = true; s.dashEnd = now() + c.dashDur; SC.st.dashes++;
    try { label(headP(f).add(V3(0, 8, 0)), '차크라 대시', '#9fe8ff'); } catch (e) { }
    try { burst(V3(f.pos.x, 1, f.pos.z), 10, ['#9fe8ff', '#cfe8ff'], 1.8, 120, 1.2); } catch (e) { }
    snd('swish', chest(f), { gain: .6 });
    return true;
  }
  function dashCancel(f, why) {
    const s = SC.clampState(f); if (!s.dashing) return;
    s.dashing = false; s.chakra = Math.min(SC.cfg.chakraMax, s.chakra + SC.cfg.dashCancelRefund); SC.st.dashCancels++;
    try { label(headP(f).add(V3(0, 7, 0)), '대시 캔슬', '#c8d0d8'); } catch (e) { }
  }
  CB.lungeMul = f => (f && f.storm && f.storm.dashing) ? SC.cfg.dashBoost : 1;

  // ── ⑤ 각성 ──
  function addAwaken(f, amt) { const s = SC.clampState(f); s.awakenGauge = Math.min(SC.cfg.awakenGauge, s.awakenGauge + amt); }
  function tryAwaken(f) {
    if (!SC.enabled) { SC.lastAwakenFail = 'disabled'; return false; }
    if (!alive(f)) { SC.lastAwakenFail = 'not-in-F'; return false; }
    if (f.away) { SC.lastAwakenFail = 'away'; return false; }
    if (f.down) { SC.lastAwakenFail = 'down'; return false; }
    const s = SC.clampState(f);
    if (s.awake) { SC.lastAwakenFail = 'already'; return false; }
    if (hp01(f) > SC.cfg.awakenHp) { SC.lastAwakenFail = 'hp-high:' + hp01(f).toFixed(2); return false; }
    if (s.awakenGauge < SC.cfg.awakenGauge) { SC.lastAwakenFail = 'gauge-low:' + Math.round(s.awakenGauge) + '/' + SC.cfg.awakenGauge; return false; }
    s.awake = true; s.awakeUntil = now() + SC.cfg.awakenDur; s.chakra = SC.cfg.chakraMax; s.awakenGauge = 0; SC.st.awakenings++; SC.lastAwakenFail = null;
    try { burst(chest(f), 70, ['#ffd84a', '#ffffff', '#ff8a3a'], 3, -25, 1.5); ring(V3(f.pos.x, .5, f.pos.z), 9, '#ffd84a', true, 1, 2.4); if (window.FX3 && FX3.floatRocks) FX3.floatRocks(V3(f.pos.x, 0, f.pos.z), 7, 16, 1.8); } catch (e) { }
    try { label(headP(f).add(V3(0, 13, 0)), '각성!', '#ffd84a', { big: true }); } catch (e) { }
    cinematicCue(f, f.aiTarget || f.target, 'awaken'); snd('roar', chest(f), { gain: .8 });
    return true;
  }

  // ── ② 바꿔치기(대타): combat.land() 직전 CB.preLand — true 면 피해 없이 통과 ──
  CB.preLand = function (p, c) {
    if (!SC.enabled) return false;
    const b = p.b, a = p.a; if (!alive(b) || !alive(a) || b.down || (b.stun || 0) > .8) return false;
    const s = SC.clampState(b);
    if (s.subs <= 0 || s.subCool > 0) return false;
    const streak = b._streak || 0, threat = p.pw >= 1.15 || streak >= 2 || (b.atk && b.atk.ph === 'windup');
    const world = b.ch.world || b.team || '';
    const p0 = .2 + (world === 'naruto' ? .35 : 0) + streak * .12 + (s.subs >= 3 ? .1 : 0) + (b.ai && b.ai.evade ? b.ai.evade * .2 : .1);
    if (!threat && Math.random() > p0) return false;
    if (threat && Math.random() > p0 + .3) return false;
    s.subs--; s.subCool = SC.cfg.substitutionCool; s.chakra = Math.min(SC.cfg.chakraMax, s.chakra + 18); addAwaken(b, 20);
    SC.st.substitutions++; SC.st.subsByWorld[world] = (SC.st.subsByWorld[world] || 0) + 1;
    try { substitute(b, a); } catch (e) { }
    try { label(headP(b).add(V3(0, 6, 0)), '대타! 남은 ' + s.subs, '#ffe080'); } catch (e) { }
    cinematicCue(b, a, 'sub'); CB.stopT = Math.max(CB.stopT, .05);
    return true;
  };

  // ── ③ 공중 체이스(대시·점프 추적) ──
  function scanAirChase() {
    for (const p of CB.pend) {
      if (p._scAir) continue;
      const a = p.a, b = p.b;
      if (!alive(a) || !alive(b) || a.stun > 0 || a.down || a.air || !a.atk) continue;
      const dy = b.pos.y - a.pos.y;
      if (!(b.air && dy > 1.2)) continue;
      const s = SC.clampState(a);
      if (s.airChase >= SC.cfg.airChaseMax || s.chakra < 15) continue;
      p._scAir = true; s.airChase++; s.chakra -= 15; SC.st.airChases++;
      a.vel.y = Math.max(a.vel.y, Math.min(560, Math.sqrt(2 * GRAV * Math.max(2, dy)) * 1.2)); a.air = true; p.jumped = true;
      try { if (window.FX3 && FX3.dustRing) FX3.dustRing(V3(a.pos.x, 1, a.pos.z), 8, 14); burst(V3(a.pos.x, 1.5, a.pos.z), 12, ['#c8b898', '#ffffff'], 1.8, 160, 1.2); label(headP(a).add(V3(0, 7, 0)), '공중 추적!', '#cfe8ff'); } catch (e) { }
    }
  }

  // ── ④ 벽 반동: 가장자리로 빠르게 밀려날 때 안쪽으로 되튐(knock.js 의 가장자리 반사 위에 연출·보상) ──
  function wallBounce(f, dt) {
    if (!f || f.away || f.down || !f.storm) return;
    const rr = Math.hypot(f.pos.x, f.pos.z);
    if (rr < ARENA - 4) { f._wbCd = 0; return; }
    if ((f._wbCd || 0) > 0) { f._wbCd = Math.max(0, (f._wbCd || 0) - dt); return; }
    const nx = f.pos.x / rr, nz = f.pos.z / rr, kr = f.kb.x * nx + f.kb.z * nz;
    if (kr < SC.cfg.wallBounceMin) return;
    const s = SC.clampState(f);
    f.kb.x -= .5 * kr * nx; f.kb.z -= .5 * kr * nz;
    s.chakra = Math.min(SC.cfg.chakraMax, s.chakra + 10);
    f._wbCd = 1.2; SC.st.wallBounces++;
    try { ring(V3(f.pos.x, Math.max(2, f.pos.y + 4), f.pos.z), 6, '#cfe8ff', false, .6, 2.4); burst(V3(f.pos.x, f.pos.y + 3, f.pos.z), 18, ['#cfe8ff', '#9fe8ff', '#ffffff'], 2.2, 200, 1.3); light(V3(f.pos.x, f.pos.y + 4, f.pos.z), '#9fd0ff', 5); label(V3(f.pos.x, f.pos.y + 12, f.pos.z), '벽 반동!', '#cfe8ff'); } catch (e) { }
    snd('thud', V3(f.pos.x, f.pos.y + 2, f.pos.z), { gain: .7 });
  }

  // ── ⑥ 지원 게이지: 가득 차면 보유자가 지원 전략(강화+가속 폭발)로 전세를 뒤집음 ──
  function trySupport(f) {
    const s = SC.clampState(f);
    if (s.support < SC.cfg.supportGauge || !f.team) return false;
    if ((SC.teamCd[f.team] || 0) > now()) return false;
    s.support = 0; SC.teamCd[f.team] = now() + SC.cfg.supportTeamCool; SC.st.supports++;
    try { label(headP(f).add(V3(0, 10, 0)), '지원 전략!', '#b0ffb0', { big: true }); } catch (e) { }
    try { if (window.TACTICS && TACTICS.apply) { TACTICS.apply(f, 'power', f, 5); TACTICS.apply(f, 'haste', f, 4); } } catch (e) { }
    try { burst(chest(f), 26, ['#b0ffb0', '#ffffff', '#7fe0ff'], 2.2, -20, 1.4); ring(V3(f.pos.x, .5, f.pos.z), 6, '#b0ffb0', true, .9, 2.4); light(chest(f), '#7fe0ff', 5); } catch (e) { }
    cinematicCue(f, f.aiTarget || f.target || F.find(o => foe(f, o)), 'assist');
    return true;
  }

  // ── ⑦ 충돌 에스컬레이션: 같은 짝의 연이은 장벽 부딪힘 → 단계가 올라갈수록 멈춤·화면 흔들림·카메라 극대화 ──
  CB.on('clash', e => {
    if (!SC.enabled || !alive(e.a) || !alive(e.b)) return;
    const t = now();
    for (const x of [e.a, e.b]) { const q = x._scClash; if (q && t - q.t <= SC.cfg.clashEscWindow) x._scClash = { n: Math.min(SC.cfg.clashEscMax, q.n + 1), t }; else x._scClash = { n: 1, t }; }
    const n = Math.max(e.a._scClash.n, e.b._scClash.n);
    if (n < 2) return;
    SC.st.clashEscalation++;
    try {
      const m = e.at || e.a.pos.clone().lerp(e.b.pos, .5);
      for (let i = 0; i < n; i++) { try { ring(m.clone(), 4 + i * 3, i % 2 ? '#ffffff' : '#ffe0a0', false, .7, 2.4); } catch (er) { } }
      if (window.FX3 && FX3.shock) try { FX3.shock(m, dirTo(e.b, e.a), 5 + n * 2.5, '#fff6d0', .3); } catch (er) { }
      burst(m, 18 + n * 10, ['#ffffff', '#fff2a0', '#ffa020'], 2.4 + n * .5, 160, 1.4);
      CB.stopT = Math.max(CB.stopT, .03 + .02 * n);
      shake = Math.max(shake, 4 + 2 * n);
      if (n >= 3) { try { label(m.clone().add(V3(0, 9, 0)), '격돌 격화 ×' + n, '#ffd84a', { big: true }); } catch (er) { } cinematicCue(e.a, e.b, 'clash'); }
    } catch (er) { }
  });

  // ── 게이지 갱신: 근접 결과(CB.on result) + 모든 맞음(wound 래퍼) ──
  CB.on('result', e => {
    if (!SC.enabled || !e) return;
    const c = SC.cfg;
    // 감리 2번: 'hit' 게이지 산입은 wound 래퍼 단일 경로(근접+원거리 공통)에만 둔다 — 이중 산입 제거
    if (e.out === 'block' && alive(e.b)) {
      SC.clampState(e.b).chakra = Math.min(c.chakraMax, SC.clampState(e.b).chakra + c.chakraOnBlock);
      SC.clampState(e.b).support = Math.min(c.supportGauge, SC.clampState(e.b).support + 8);
    } else if (e.out === 'sub' && alive(e.a)) {
      try { label(headP(e.a).add(V3(0, 6, 0)), '헛 — 대타!', '#ffd0a0'); } catch (er) { }
    }
  });

  // 원거리·기술 맞음도 게이지에 반영 + 각성 확인 (wound 는 hp·knock 이전 체인에서 감쌈)
  const _wound = wound;
  wound = function (v, a, text, ek) {
    const r = _wound.apply(this, arguments);
    if (!SC.enabled || !alive(v) || !a || !alive(a) || !foe(a, v)) return r;
    const c = SC.cfg;
    SC.clampState(v).chakra = Math.min(c.chakraMax, SC.clampState(v).chakra + c.chakraOnTaken);
    SC.clampState(a).chakra = Math.min(c.chakraMax, SC.clampState(a).chakra + c.chakraOnHit);
    SC.clampState(a).support = Math.min(c.supportGauge, SC.clampState(a).support + 12);
    SC.clampState(v).support = Math.min(c.supportGauge, SC.clampState(v).support + 9);
    addAwaken(v, 14); addAwaken(a, 5);
    tryAwaken(v); tryAwaken(a);
    if (/받아치기|counter/i.test(String(text || ''))) cinematicCue(a, v, 'counter');
    return r;
  };

  // 근접 공격 출발(준비/적중 선언)에서 차크라 대시 자동 시동 — 사거리 밖일 때만
  const _apply = apply;
  apply = function (f, s, d) {
    const r = _apply.call(this, f, s, d);
    if (SC.enabled && f && s && (f.atk && (f.atk.ph === 'windup' || f.atk.ph === 'active'))) {
      const tg = s.face && alive(s.face) ? s.face : f.aiTarget;
      if (tg && Math.hypot(f.pos.x - tg.pos.x, f.pos.z - tg.pos.z) > 10) chakraDash(f);
    }
    return r;
  };

  // ── 매 화면: 게이지 회복·각성 종료·캔슬·벽 반동·공중 체이스·지원 발동 ──
  const _update = update;
  update = function (dt, t) {
    const r = _update.apply(this, arguments);
    if (!SC.enabled) return r;
    const c = SC.cfg;
    for (let i = 0; i < F.length; i++) {
      const f = F[i]; if (!f) continue;
      const s = SC.clampState(f);
      if (!f.away && !f.down) {
        s.chakra = Math.min(c.chakraMax, s.chakra + c.chakraRegen * dt);
        s.support = Math.min(c.supportGauge, s.support + c.supportRegen * dt);
      }
      if (s.subCool > 0) s.subCool = Math.max(0, s.subCool - dt);
      if (s.dashing) { if (f.stun > 0 || f.down) dashCancel(f, 'hit'); else if (now() > s.dashEnd) s.dashing = false; }
      if (s.awake && now() > s.awakeUntil) s.awake = false;
      if (!s.awake) tryAwaken(f);
      wallBounce(f, dt);
      if (!f.away && !f.down && !(f.stun > 0)) trySupport(f);
    }
    scanAirChase();
    return r;
  };

  // 교대·인물 교체 시: 대타 잔량·각성·게이지 새 판
  const _setChar = setChar;
  setChar = function (f, ch) { if (f) f.storm = null; return _setChar.apply(this, arguments); };

  // 전술 효과도 각성 게이지에 살짝 반영(TX.on 구독 — tactics 가 노출한 이벤트 버스)
  try { if (TX && TX.on) TX.on('effect', e => { if (e && e.f && alive(e.f)) addAwaken(e.f, 4); }); } catch (e) { }

  // 각성자의 피해 배율: BUFFS.dmgMul(전술 훅)을 감싸 Storm 배율만 얹음(다른 효과는 그대로)
  const buffsT0 = performance.now();
  const waitBuffs = setInterval(() => {
    if (!window.BUFFS || typeof BUFFS.dmgMul !== 'function') { if (performance.now() - buffsT0 > 5000) clearInterval(waitBuffs); return; } // 감리 5번: 5초 후 포기(누수 금지)
    clearInterval(waitBuffs);
    const _dm = BUFFS.dmgMul;
    BUFFS.dmgMul = function (a, v) {
      let m = _dm.apply(this, arguments);
      if (!SC.enabled) return m;
      if (a && a.storm && a.storm.awake) m *= 1.3;
      if (v && v.storm && v.storm.awake) m *= .8;
      return m;
    };
  }, 100);
})();
