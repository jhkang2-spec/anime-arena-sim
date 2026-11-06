// 자동교전 AI 층: 상태 기계(FSM) — 대기·추적·공격·방어·피격·후퇴·다운·교대를 한 상태로만 두고, 상태별로 할 수 없는 행동을 막는다.
// Target Selection(위협·거리·시야·약해진 상대) · Threat/Aggro(나를 때린 상대에게 위협치) · Line of Sight(PHYS.los, 가려지면 원거리 기술 대신 돌아 들어감)
// · Combat Spacing(세계관별 선호 거리) · 인물끼리 겹침 막기(Rapier 가 없을 때 대체 분리) · 주요 교전 자동 추적(액션뷰) · 화면 흔들림 절제.
// 기존 brain.js(맞는 순간 막기·피하기 판단)·teams.js(세계관 팀·교대·같은 팀 공격 금지·혼자 몸풀기)·skillOf(사거리·최근 기술 반복 피하기) 규칙은 그대로 둔다.
(function () {
  if (typeof F === 'undefined' || typeof apply !== 'function' || typeof update !== 'function') return;
  const AI = window.AIFSM = { on: true, ms: 0, msMax: 0, st: { blockedActs: 0, trans: 0, losRepos: 0, retarget: 0, camTrack: 0, shakeCut: 0, sepFix: 0, time: {} }, reset() { const s = AI.st; s.blockedActs = s.trans = s.losRepos = s.retarget = s.camTrack = s.shakeCut = s.sepFix = 0; s.watchdog = s.rockJump = s.rockShot = s.rockPull = 0; s.time = {}; AI.msMax = 0; } };
  const ATK = /^(punch|punchL|palm|elbow|uppercut|shoulder|kick|highKick|axe|jumpKnee|sweep|slash|k_kesa|k_yoko|k_upCut|k_tsuki|spreadSlash|twoHandSword|swordDown|k_iaiCut|iaiEnd|k_dualOpen|cast|seal|iai|punchPrep|kickPrep|slashPrep)$/;
  const RUN = /^(run|crouchRun|k_run|k_lowRun)$/, DEF = /^(block|k_uke)$/;
  const PREF = { naruto: 26, onepiece: 15, bleach: 22, opm: 14, kimetsu: 18, jjk: 20, aot: 16 }; // 세계관별 선호 교전 거리(나루토 거리 두고 술법, 원피스·원펀맨 붙어서 타격, 주술회전 중간, 진격의 거인은 입체기동으로 붙고 떨어지며)

  // ── 상태 판정(우선순위: 다운 > 피격 > 교대 > 공격 > 방어 > 후퇴/추적 > 대기) ──
  function stateOf(f) {
    if (f.down) return 'DOWN';
    if (f.stun > 0) return 'HITSTUN';
    if (f.team && (f.swapCd || 0) > 3.4) return 'TAG';
    if (f.atk) return 'ATTACK';
    const s = f.lastS, p = s && s.pose;
    if (p && DEF.test(p)) return 'DEFEND';
    if (p && RUN.test(p)) return (s.fwd || 0) < -40 ? 'RETREAT' : 'CHASE';
    return 'IDLE';
  }
  AI.stateOf = stateOf;

  const _apply = apply;
  apply = function (f, s, d) {
    if (AI.on && f && s) {
      const st = stateOf(f);
      if ((st === 'DOWN' || st === 'HITSTUN') && s.pose && (ATK.test(s.pose) || RUN.test(s.pose)) && !s.vy) AI.st.blockedActs++; // arena.js 의 경직 처리가 실제로 막음(여기선 집계)
      if (st === 'DOWN' && !s.vy) s = { pose: 'hurt', face: s.face || f.faceT, k: 30 }; // 다운 중엔 어떤 행동도 안 함(일어날 때까지)
      f.lastS = s;
    }
    return _apply.call(this, f, s, d);
  };

  // ── 위협(Aggro): 나를 때린 상대에게 쌓이고 시간이 지나면 줄어듦 ──
  const heat = new Map(); // 교전 쌍 → 최근 타격 수(카메라 추적용)
  const pairKey = (a, b) => a.ch.key < b.ch.key ? a.ch.key + '|' + b.ch.key : b.ch.key + '|' + a.ch.key;
  const _wound = wound;
  wound = function (v, a) {
    if (v && a && v !== a) { (v.threat || (v.threat = new Map())).set(a, ((v.threat.get(a)) || 0) + 10); const k = pairKey(a, v); heat.set(k, (heat.get(k) || 0) + 1); }
    return _wound.apply(this, arguments);
  };

  // ── 원거리 기술 전 시야 확인: 바위에 가려지면 옆으로 돌아 들어감(Tactical Repositioning) ──
  const _skillOf = skillOf;
  skillOf = function (a, b, quick) {
    if (AI.on && a && b && window.PHYS && PHYS.ready && !PHYS.los(a, b) && Math.random() < .85) {
      AI.st.losRepos++; a.target = b;
      const s = Math.random() < .5 ? -1 : 1;
      return [step(R(.35, .6), [[a, { pose: 'run', side: s * R(150, 210), fwd: R(30, 80), face: b }], [b, { pose: pick(['stance', 'guard']), face: a }]])];
    }
    return _skillOf.apply(this, arguments);
  };

  let tSel = 0, prevState = new Map();
  // ── 멈춤 감시(Watchdog): 교전 단계가 2.5초 넘게 하나도 진행되지 않거나, 모두가 3초 넘게 제자리면 강제로 다시 계획 ──
  let lastStepT = 0, simT = 0, stillT = 0; const lastPos = new Map();
  const _runStep = runStep; runStep = function () { lastStepT = simT; return _runStep.apply(this, arguments); };
  function unstick(why) {
    AI.st.watchdog = (AI.st.watchdog || 0) + 1; AI.st.lastWhy = why;
    lanes = []; queue = []; stepT = 0;
    F.forEach(f => { if (f.perchAt && window.MV) { const g = f.perchAt.clone(); g.y = 0; g.x += R(-12, 12); clampArena(g); f.perchAt = null; MV.arc(f, g, .55, 12); } if (f.down && f.down.ph === 'ko') return; f.stun = Math.min(f.stun || 0, .2); });
    lastStepT = simT; stillT = 0;
  }
  // ── 바위 위 상대: 뛰어올라 공격 · 원거리 기술 · 끌어내리기 중 하나 ──
  function rockAnswer(a, b) {
    const v = Math.random(), top = b.pos.clone();
    if (v < .45 && window.MV) { const near = top.clone().add(V3(R(-4, 4), 0, R(-4, 4))); MV.arc(a, near, .5, 18, { done: () => { if (F.includes(a) && F.includes(b)) resolve(a, b, null, 'hit', '바위 위 습격!', 1.1); } }); AI.st.rockJump = (AI.st.rockJump || 0) + 1; }
    else if (v < .75 && typeof proj === 'function') { proj(a, b, (a.ch.sig && a.ch.sig.kind) || 'orb', pick(['hit', 'block', 'hit']), { c: ELEM[(a.ch.sig && a.ch.sig.elem) || 'metal'].c }); AI.st.rockShot = (AI.st.rockShot || 0) + 1; }
    else if (window.MV) { const g = b.pos.clone(); g.y = 0; const d = dirTo(b, a); g.addScaledVector(d, 14); clampArena(g); b.perchAt = null; MV.arc(b, g, .45, 6); label(headP(b).add(V3(0, 6, 0)), '끌어내림!', '#ffd84a'); AI.st.rockPull = (AI.st.rockPull || 0) + 1; }
  }
  const _update = update;
  update = function (dt, t) {
    const r = _update.apply(this, arguments);
    if (!AI.on) return r;
    const w0 = performance.now();
    simT += dt;
    if (F.length >= 2) {
      if (simT - lastStepT > 2.5) unstick('step');
      let mv = 0; F.forEach(f => { const p = lastPos.get(f); if (p) mv = Math.max(mv, Math.hypot(f.pos.x - p.x, f.pos.z - p.z, f.pos.y - p.y)); else lastPos.set(f, f.pos.clone()); });
      if (mv > 1.5) { stillT = 0; F.forEach(f => (lastPos.get(f) || lastPos.set(f, f.pos.clone()).get(f)).copy(f.pos)); } else { stillT += dt; if (stillT > 3) unstick('still'); }
      // 바위 위(발판·높은 곳)에 1.2초 넘게 있는 상대 → 상대 쪽이 대응
      F.forEach(b => { const high = !b.air && b.pos.y > 6; b.highT = high ? (b.highT || 0) + dt : 0;
        if (b.highT > 1.2) { b.highT = -1.5; const a = F.find(x => x !== b && (!x.team || x.team !== b.team) && !x.arc && !x.perchAt && !(x.stun > 0)); if (a) rockAnswer(a, b); } });
    }
    // 상태 바뀜·머문 시간 집계
    for (let i = 0; i < F.length; i++) { const f = F[i], s = stateOf(f); if (prevState.get(f) !== s) { AI.st.trans++; prevState.set(f, s); } AI.st.time[s] = (AI.st.time[s] || 0) + dt; f.aiState = s; }
    // 목표 고르기(0.5초마다): 위협 + 가까움 + 시야 + 상대가 경직·다운·지침
    tSel -= dt;
    if (tSel <= 0) {
      tSel = .5;
      F.forEach(f => {
        if (f.threat) f.threat.forEach((v, k) => { const n = v * .6; if (n < .5 || !F.includes(k)) f.threat.delete(k); else f.threat.set(k, n); });
        let best = null, bs = -1e9;
        // 내 체력(내가 위험하면: 강화된 적은 피하고, 붙어서 한 명이라도 끌어안는 상쇄 본능)
        const fr = window.HP && HP.on && HP.of ? HP.of(f) : null;
        const myHp = fr && fr.max ? fr.hp / fr.max : 1;
        const cornered = myHp < .25;
        for (const o of F) {
          if (o === f || (f.team && o.team === f.team)) continue;
          const d = Math.hypot(o.pos.x - f.pos.x, o.pos.z - f.pos.z);
          let sc = ((f.threat && f.threat.get(o)) || 0) + 40 / (d + 10) * 10 + (o.stun > 0 ? 8 : 0) + (o.down ? 6 : 0) + ((o.tire || 0) / Math.max(1, o.tireLim || 10)) * 6;
          if (o === f.aiTarget) sc += 5; // 목표 유지(Hysteresis): 지금 목표를 조금 우대 — 매 0.5초마다 표적이 흔들리는 것 방지
          if (f.team && F.some(x => x !== f && x.team === f.team && x.aiTarget === o)) sc += 5; // 협응 집중(Focus Coordination): 아군이 이미 겨냥한 적을 함께 노림
          if (window.TACTICS && TACTICS.has && TACTICS.has(o, 'intang')) sc -= 12; // 무적 상태: 때려도 안 닿음 → 다른 표적 우선
          // 집중 화력(Execute): 체력이 낮아 마무리 가능한 적을 강하게 우선 겨냥 — 팀이 피해를 나눠 죽이지 않고 한 명을 먼저 떨어뜨림
          const hr = window.HP && HP.on && HP.of ? HP.of(o) : null;
          if (hr && !hr.ko && hr.max) { const hpf = hr.hp / hr.max; if (hpf < .3) sc += 14 + (.3 - hpf) * 46; else if (hpf < .55) sc += (1 - hpf) * 8; }
          // 위협 우대(Threat Priority): 강화·거대화·변신 상태의 적은 더 위험하므로 우선 처리
          const buffed = !!(o.fx && (o.fx.power || o.fx.giant || o.fx.domain)) || o.mode > 0;
          if (buffed && !cornered) sc += 5;          // 정상: 위협부터 제거
          else if (buffed && cornered) sc -= 6;      // 코너에 몰리면 강화된 적은 일부러 피움(상대 안 됨)
          if (cornered && hr && !hr.ko && hr.max && hr.hp / hr.max < .4) sc += 10; // 마무리당할 각오: 약한 적에게 매달려 상쇄
          if (window.PHYS && PHYS.ready && !PHYS.los(f, o)) sc -= 8;
          if (sc > bs) { bs = sc; best = o; }
        }
        if (best && f.aiTarget !== best) { f.aiTarget = best; AI.st.retarget++; }
        if (best && !laneOf(f) && f.target !== best) { f.target = best; f.faceT = best; }
      });
      heat.forEach((v, k) => { const n = v * .85; if (n < .3) heat.delete(k); else heat.set(k, n); });
    }
    // 선호 거리 유지(대기·방어 때만, 아주 천천히)
    for (let i = 0; i < F.length; i++) {
      const f = F[i], o = f.aiTarget; if (!o || !F.includes(o) || (f.aiState !== 'IDLE' && f.aiState !== 'DEFEND')) continue;
      const pref = PREF[(f.ch && f.ch.world) || f.team] || 20, dx = o.pos.x - f.pos.x, dz = o.pos.z - f.pos.z, d = Math.hypot(dx, dz) || 1;
      const dm = o.fx && o.fx.domain && o.fx.domain.until > performance.now() / 1000 ? o.fx.domain : null; // 상대가 영역 전개 중 → 영역 중심 dm.c 기준 반지름 밖으로 물러남(먼저 걸어 들어가지 않음)
      let k = d < pref * .55 ? -1 : d > pref * 2.2 ? 1 : 0;
      if (dm) { const cx = f.pos.x - dm.c.x, cz = f.pos.z - dm.c.z, cd = Math.hypot(cx, cz); if (cd < dm.r + 10) { f.pos.x += (cd > .01 ? cx / cd : 1) * 16 * dt; f.pos.z += (cd > .01 ? cz / cd : 0) * 16 * dt; k = 0; } }
      if (k) { f.pos.x += dx / d * k * 14 * dt; f.pos.z += dz / d * k * 14 * dt; }
    }
    // Rapier 가 없을 때만: 인물끼리 겹침 분리(대체)
    if (!(window.PHYS && PHYS.ready && PHYS.on)) for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j], dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = 2.1 * ((a.scale || 1) + (b.scale || 1));
      if (d < m && d > .001) { const p = (m - d) / 2; a.pos.x -= dx / d * p; a.pos.z -= dz / d * p; b.pos.x += dx / d * p; b.pos.z += dz / d * p; AI.st.sepFix++; }
    }
    // 주요 교전 자동 추적(액션뷰): 최근 가장 많이 주고받은 쌍을 카메라가 잡음
    const view = window.getCamView ? getCamView().mode : 'act';
    if (view === 'act' && typeof cam !== 'undefined' && cam.mode === 'base' && cam.cool <= 0 && heat.size && Math.random() < dt * .6) {
      let bk = null, bv = 0; heat.forEach((v, k) => { if (v > bv) { bv = v; bk = k; } });
      if (bk && bv >= .9) { const [ka, kb] = bk.split('|'), a = F.find(f => f.ch.key === ka), b = F.find(f => f.ch.key === kb); if (a && b) { shot(pick(['duel', 'close', 'over']), R(2.2, 3.2), a, b); AI.st.camTrack++; } }
    }
    // 흔들림 절제(필살기도 상한)
    if (shake > 12) { shake = 12; AI.st.shakeCut++; }
    const ms = performance.now() - w0; AI.ms += (ms - AI.ms) * .05; if (ms > AI.msMax) AI.msMax = ms;
    return r;
  };
})();
