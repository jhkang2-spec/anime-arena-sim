// ═══ 에픽 층(소유자 요청 11-06): ① 대변신(수사노오·거인화·마허라) 메리트 — 강화·가속·방어 부여 + 비약적 속도(SPD_MUL)
// ② 극적 반전·최종 필살기 엔진 — 촉발×비술×효과 = 2400종의 불규칙 역전 시나리오(체력 임계 돌파에서 극화 발동).
// hp.js·knock.js 이후 로드: wound(hp 체인의 바깥)·callout(변신 감지) 래핑, BUFFS.dmgMul 얹기, window.SPD_MUL 공급.
(function () {
  // ── 시나리오 공간(순수 데이터 — 브라우저 밖에서도 계산): 12 촉발 × 20 최종 비술 × 10 효과 = 2400 조합 ──
  const DATA = window.COMEBACK_DATA = {
    trig: [
      ['극한 체력', .30], ['위급 체력', .18], ['사지의 한 판', .10], ['아슬아슬 명줄', .05],
      ['연속 피격', 0], ['공중 압박', 0], ['절벽 끝', 0], ['마지막 주자', 0],
      ['팀 열세', 0], ['압도당한 판', 0], ['거인·수사노오 붕괴', 0], ['분노 임계', 0]
    ],
    moves: [
      ['최후의 비술', 2.1], ['각성의 필살', 1.9], ['분노의 역격', 1.8], ['불사신 반격', 2.0], ['한계 돌파', 1.7],
      ['영혼 일격', 1.9], ['결사의 참격', 1.8], ['폭주 대타격', 2.2], ['운명 반전', 1.6], ['부활의 뇌성', 2.0],
      ['집념의 철권', 1.8], ['기적의 한 수', 1.5], ['유언 집행', 2.3], ['쇄도 최후참', 2.0], ['심판의 심장', 2.1],
      ['죽음 넘기기', 1.4], ['격류 역습', 1.8], ['천명 역전', 1.9], ['반역의 창', 1.9], ['최종 병기', 2.4]
    ],
    effects: [
      ['대역전 강화', 'dmg', 10, 1.6], ['즉시 회복', 'heal', 0, .3], ['폭주 가속', 'haste', 12, 1], ['철벽 방어', 'armor', 12, 1],
      ['무적 한숨', 'intang', 3, 1], ['차크라 폭주', 'chakra', 0, 1], ['거울 반사', 'reflect', 8, 1], ['흡혈의 맹세', 'leech', 12, 1],
      ['소환 각성', 'summon', 0, 1.5], ['각성 문 열림', 'awaken', 0, 1]
    ]
  };
  DATA.space = DATA.trig.length * DATA.moves.length * DATA.effects.length; // 2400 ≥ 1000
  if (typeof F === 'undefined' || typeof wound !== 'function' || typeof HP === 'undefined' || typeof HP.of !== 'function') return;

  const now = () => performance.now() / 1000;
  const alive = f => f && F.includes(f);
  const foe = (a, b) => a !== b && !(a && b && a.team && b.team && a.team === b.team);
  const hp01 = f => { const r = window.HP && HP.of ? HP.of(f) : null; if (r && r.max) return r.hp / r.max; return 1 - Math.min(1, (f.tire || 0) / Math.max(1, f.tireLim || 10)); };
  const TX = window.TACTICS, SC = window.STORM_COMBAT, CBK = window.COMBAT;
  const snd = (name, p, o) => { try { if (window.SFX && SFX.play) SFX.play(name, p, o || {}); } catch (e) { } };
  const VARIANTS = ['', ' · 재격발', ' · 오기', ' · 비명', ' · 유념', ' · 절규', ' · 불꽃'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = (a, b) => a + Math.random() * (b - a);

  const EP = window.STORM_EPIC = {
    enabled: true,
    cfg: { cool: 14, prob: .62, bands: [.30, .18, .10, .05] },
    st: { scenarios: 0, byTrig: {}, byMove: {}, byEffect: {}, saves: 0 },
    reset() { const s = EP.st; s.scenarios = s.saves = 0; s.byTrig = {}; s.byMove = {}; s.byEffect = {}; },
    forceScenario(f, a) { fire(f, a, pick(DATA.trig)[0]); return true; },
    scenarioOf(f) { return f && f._cb; }
  };

  // ── 변신 메리트: 수사노오·거인화 callout 감지 → 오래 가는 강화·가속·방어(피격 생존력 + 파괴력) ──
  function transformBuff(f, dur, col, nm) {
    try {
      if (TX && TX.apply) { TX.apply(f, 'power', f, dur); TX.apply(f, 'haste', f, dur * .9); TX.apply(f, 'armor', f, dur * .75); }
      f._trUntil = now() + dur;
      label(headP(f).add(V3(0, 14, 0)), nm + ' 강화 · ' + Math.round(dur) + '초', col, { big: true });
      try { ring(V3(f.pos.x, .5, f.pos.z), 7, col, true, 1, 2.4); burst(chest(f), 40, [col, '#ffffff', col], 2.6, -20, 1.4); light(chest(f), col, 6); } catch (e) { }
      snd('roar', chest(f), { gain: .7, gap: .5 });
    } catch (e) { }
  }
  const _callout = callout;
  callout = function (f, text, ult) {
    if (f && text && EP.enabled && (f._trT || 0) < now()) {
      const t = String(text);
      if (/수사노오|스사노오|토츠카|야타의 거울/.test(t) && !f.down) { f._trT = now() + 8; transformBuff(f, 12, '#b060ff', '수사노오'); }
      else if (/거인화|진격의 거인|초대형 거인|갑옷 거인|여성형 거인/.test(t) && !f.down) { f._trT = now() + 10; transformBuff(f, 15, '#ffc860', '거인화'); }
    }
    return _callout.apply(this, arguments);
  };

  // ── 비약적 속도: 가속·각성·변신 상태의 이동/동작 배율(arena.js 가 매 스텝 참조) ──
  window.SPD_MUL = function (f) {
    if (!f || !EP.enabled) return 1;
    let m = 1;
    try { if (TX && TX.has(f, 'haste')) m *= 1.7; } catch (e) { }
    if (f.storm && f.storm.awake) m *= 1.45;
    if (f.mode > 0) m *= 1.12;
    if (f._cb && f._cb.until > now()) m *= 1.15;
    return m;
  };

  // ── 피해 배율 얹기: 최종 필살 강화(_cbDmg)·흡혈 판정용 ──
  if (window.BUFFS && typeof BUFFS.dmgMul === 'function') {
    const _dm = BUFFS.dmgMul;
    BUFFS.dmgMul = function (a, v) {
      let m = _dm.apply(this, arguments);
      if (a && a._cbDmg && a._cbDmg.until > now()) m *= a._cbDmg.mul;
      if (a && v && foe(a, v) && a._cbLeech && a._cbLeech > now() && window.HP) { const r = HP.of(a); if (r && !r.ko) { r.hp = Math.min(r.max, r.hp + Math.round(r.max * .02)); } }
      return m;
    };
  }

  // ── 시나리오 발화: 촉발×비술×효과 조합(매번 불규칙 지터) + 극화(카메라·멈춤·낙서) ──
  function fire(f, a, trigName) {
    if (!EP.enabled || !alive(f) || f.down || f.away) return;
    const t = now();
    if ((f._cbT || 0) > t) return;
    f._cbT = t + EP.cfg.cool;
    const mv = pick(DATA.moves), ef = pick(DATA.effects);
    const dur = ef[2] * R(.85, 1.2), mul = ef[3] * R(.9, 1.15), variant = pick(VARIANTS);
    f._cb = { trig: trigName, move: mv[0], effect: ef[0], until: t + 10, power: mv[1] };
    EP.st.scenarios++; EP.st.byTrig[trigName] = (EP.st.byTrig[trigName] || 0) + 1;
    EP.st.byMove[mv[0]] = (EP.st.byMove[mv[0]] || 0) + 1; EP.st.byEffect[ef[0]] = (EP.st.byEffect[ef[0]] || 0) + 1;
    const col = (f.ch && f.ch.sig && f.ch.sig.elem && ELEM[f.ch.sig.elem] && ELEM[f.ch.sig.elem].c) || '#ffd84a';
    try {
      switch (ef[1]) {
        case 'dmg': f._cbDmg = { until: t + dur, mul: mul * mv[1] / 1.9 }; break;
        case 'heal': { const r = HP.of(f); if (r && !r.ko) { const add = Math.round(r.max * mul); r.hp = Math.min(r.max, r.hp + add); EP.st.saves++; try { label(headP(f).add(V3(0, 10, 0)), '+' + add.toLocaleString() + ' 회복', '#7cff9a'); } catch (e) { } } break; }
        case 'haste': case 'armor': case 'intang': case 'reflect': if (TX && TX.apply) TX.apply(f, ef[1], f, dur); break;
        case 'chakra': if (SC && SC.clampState) { const s = SC.clampState(f); s.chakra = SC.cfg.chakraMax; } break;
        case 'leech': f._cbLeech = t + dur; break;
        case 'summon': { const S = window.NEWWORLD && NEWWORLD.summons; if (S) S.filter(x => x.owner === f && x.hp > 0).forEach(x => { x.K = Object.assign({}, x.K, { hp: x.K.hp + 300, pw: x.K.pw * mul, spd: x.K.spd * mul }); x.hp += 300; if (x.bar && x.bar.sp) label(x.m.root.position.clone().add(V3(0, 14, 0)), '소환 각성!', '#ffd0a0'); }); break; }
        case 'awaken': if (SC && SC.clampState) { const s = SC.clampState(f); s.awakenGauge = SC.cfg.awakenGauge; if (SC.tryAwaken) SC.tryAwaken(f); } break;
      }
      // 극화: 라벨·카메라·멈춤·흔들림·입자
      label(headP(f).add(V3(0, 16, 0)), '역전 — ' + mv[0] + variant, '#ffe880', { big: true, life: 1.6 });
      label(headP(f).add(V3(0, 11, 0)), trigName + ' · ' + ef[0], col, { life: 1.4 });
      try { shot(pick(['face', 'duel', 'quarter']), 1.5, f, a || f.aiTarget || f); } catch (e) { }
      if (CBK) CBK.stopT = Math.max(CBK.stopT || 0, .07);
      shake = Math.max(shake || 0, 9 + 4 * mv[1] / 2);
      const p = chest(f);
      try { burst(p, 70, [col, '#ffffff', '#ffe880'], 3.2, -30, 1.6); ring(V3(f.pos.x, .5, f.pos.z), 10, col, true, 1.1, 2.8); dome(p, 16, col); light(p, col, 8); } catch (e) { }
      snd('roar', p, { ult: true, gain: .9 });
      // 곧바로 반격 한 수: 사거리 안이면 강타 선언(강화 배율이 얹힌다)
      try { const tg = a && alive(a) ? a : f.aiTarget; if (tg && alive(tg) && foe(f, tg) && !f.down) pending.push({ t: .25, fn: () => { if (alive(f) && alive(tg)) resolve(f, tg, f.elem || (f.ch.sig && f.ch.sig.elem) || null, 'hit', mv[0] + '!', 1.6 * mul); } }); } catch (e) { }
    } catch (e) { console.warn('[comeback]', e); }
  }

  // ── 촉발 감지: wound(전체 hp 체인 바깥)에서 체력 임계 밴드 하향 돌파 + 정황 촉발 ──
  const _wound = wound;
  wound = function (v, a, text, ek) {
    const prev = v && v.ch ? hp01(v) : 1;
    const r = _wound.apply(this, arguments);
    if (!EP.enabled || !alive(v) || !v.team || !v.ch) return r;
    const cur = hp01(v);
    if (cur <= 0) return r;
    let fired = false;
    // 밴드 돌파: prev 가 밴드 위 → cur 가 밴드 아래(각 밴드는 한 번만)
    for (const b of EP.cfg.bands) if (prev > b && cur <= b) {
      const bandHit = DATA.trig.find(x => x[1] === b);
      if (bandHit && Math.random() < EP.cfg.prob) { fire(v, a, bandHit[0]); fired = true; }
      break;
    }
    // 정황 촉발(체력 낮을 때만·쿨타임이 식어야): 연타·공중·절벽·마지막 주자
    if (!fired && (v._cbT || 0) < now() && cur < .5) {
      const rr = Math.hypot(v.pos.x, v.pos.z);
      const rec = HP.rec[v.team] || {};
      const lastGuy = !(((window.TEAMS && TEAMS[v.team]) || []).some(k => k !== v.ch.key && !(rec[k] && rec[k].ko)));
      const ctx = [];
      if ((v._streak || 0) >= 3) ctx.push('연속 피격');
      if (v.air) ctx.push('공중 압박');
      if (rr > ARENA - 12) ctx.push('절벽 끝');
      if (lastGuy) ctx.push('마지막 주자');
      if (v._scClash && v._scClash.n >= 3) ctx.push('압도당한 판');
      if (cur < .15 && v.mode > 0) ctx.push('거인·수사노오 붕괴');
      if (ctx.length && Math.random() < .35) fire(v, a, pick(ctx));
    }
    return r;
  };
  // 교대·부활: 시나리오 기록 초기화(밴드 재관통 방지)
  const _setChar = setChar;
  setChar = function (f, ch) { if (f) { f._cb = null; f._cbDmg = null; f._cbLeech = 0; f._cbT = 0; } return _setChar.apply(this, arguments); };
})();
