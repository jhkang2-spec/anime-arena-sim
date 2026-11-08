// 세계관 팀 태그 대전: 켠 세계관마다 대표 인물이 한 명씩 나와 싸우고, 지치거나·오래 싸우거나·쓰러지면 같은 팀 다음 인물과 교대한다.
// 소유자 규칙: 켜지 않은 세계관 인물은 어떤 경로로도 나오지 않는다. 0개 = 빈 무대, 1개 = 대표 혼자 몸풀기(같은 세계관끼리는 싸우지 않음), 2개 이상 = 팀끼리 교전.
// arena.js 의 F·lanes 등 전역 상태를 그대로 쓰고, initFighters·tagIn·wound·laneTick 은 감싸기만 한다(다른 파일의 감싸기와 겹쳐도 동작).
(function () {
  if (typeof CH === 'undefined') return;
  // 원작 주요 인물 순서(대표 → 다음 교대 순)
  const TEAMS = {
    naruto: ['naruto', 'sasuke', 'kakashi', 'itachi', 'gaara'],
    onepiece: ['luffy', 'zoro', 'sanji', 'ace', 'law'],
    bleach: ['ichigo', 'byakuya', 'rukia', 'hitsugaya', 'kenpachi'],
    opm: ['saitama', 'genos', 'tatsumaki', 'bang', 'garou'],
    kimetsu: ['tanjiro', 'nezuko', 'zenitsu', 'inosuke', 'rengoku'],
  };
  Object.keys(TEAMS).forEach(w => { TEAMS[w] = TEAMS[w].filter(k => CH[k]); if (!TEAMS[w].length) delete TEAMS[w]; });
  const KEY = 'arenaTeams';
  let SEL = [], ON = []; // SEL: 켠 세계관(단추 상태), ON: 무대에 올린 세계관(SEL 을 정해진 순서로)
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(a)) SEL = a.filter(w => TEAMS[w]); } catch (e) { }
  const order = () => Object.keys(TEAMS).filter(w => SEL.includes(w));
  const fresh = f => { f.tire = 0; f.tireLim = R(7, 12); f.fieldT = 0; f.timeLim = R(25, 45); f.swapCd = 4; };

  const _init = initFighters;
  initFighters = function () {
    const slots = ON.map(w => [w, 0]); // 같은 세계관은 한 팀 — 팀끼리 싸우지 않음(1개만 켜면 대표 혼자 몸풀기)
    F = slots.map(([w, ti], i) => { const f = mkF(null); f.team = w; f.ti = ti; setChar(f, CH[TEAMS[w][ti]]); fresh(f); const a = i / slots.length * PI * 2 + PI / 4; f.pos.set(Math.cos(a) * 55, 0, Math.sin(a) * 38); return f; });
    F.forEach((f, i) => { f.target = F[(i + 1) % F.length]; f.faceT = f.target; });
  };
  function rebuild() {
    F.forEach(x => { if (x.model) x.model.root.visible = false; });
    exits.forEach(g => { g.root.visible = false; }); exits = [];
    queue = []; stepT = 0; lanes = []; pending = []; giants = []; counterBy = null;
    try { localStorage.removeItem('arenaRoster'); } catch (e) { } PICK = null;
    F = []; initFighters();
    F.forEach(x => { pillar(x.pos, 10, ELEM[x.ch.sig.elem].c, .9); label(headP(x).add(V3(0, 8, 0)), WORLD[x.team].name + ' · ' + x.ch.name + (ON.length === 1 ? ' 몸풀기' : ' 출전!'), '#ffd84a', { big: true }); });
  }

  // 교대: 나가는 인물은 뒤로 뛰어 물러나 연기 속에 사라지고, 다음 인물이 바깥에서 뛰어 들어온다
  let exits = [];
  function teamSwap(f, why) {
    if (!f.team || !F.includes(f)) return;
    const list = TEAMS[f.team], busy = F.filter(x => x !== f && x.team === f.team).map(x => x.ti);
    let ni = f.ti; for (let s = 1; s <= list.length; s++) { const j = (f.ti + s) % list.length; if (!busy.includes(j) && !(window.HP && HP.isKO(f.team, list[j]))) { ni = j; break; } } // 체력 0(KO)인 팀원은 건너뜀
    if (ni === f.ti) { fresh(f); return; }
    const old = f.ch, o = F.includes(f.target) && f.target !== f ? f.target : others(f)[0];
    const dir = o ? f.pos.clone().sub(o.pos).setY(0) : V3(1, 0, 0); if (dir.lengthSq() < 1) dir.set(1, 0, 0); dir.normalize();
    lanes.forEach(L => { if (L.fs.includes(f)) L.q.length = 0; }); // 하던 교전은 여기서 끊음
    f.ti = ni;
    const root = old.model.root, from = root.position.clone();
    setChar(f, CH[list[f.ti]]); fresh(f); f.stun = 0; f.gauge = 100;
    root.visible = true; exits.push({ root, ch: old, from, dir, t: 0 });
    label(from.clone().add(V3(0, 34, 0)), why, '#cfe8ff');
    const ent = clampArena(from.clone().addScaledVector(dir, 55).add(V3(R(-15, 15), 0, R(-15, 15))));
    f.pos.copy(ent); f.vel.set(-dir.x * 160, 240, -dir.z * 160); f.air = true; f.kb.set(0, 0, 0);
    if (o) { f.target = o; f.faceT = o; }
    pillar(ent, 10, ELEM[f.ch.sig.elem].c, .9);
    label(headP(f).add(V3(0, 10, 0)), WORLD[f.team].name + ' · ' + f.ch.name + ' 교대 참전!', '#ffd84a', { big: true });
    try { callout(f, f.ch.name + ' 참전'); } catch (e) { }
  }
  (function exitLoop(prevT) { // 나가는 인물 움직임(교전 계산과 따로, 화면 갱신마다)
    requestAnimationFrame(now => {
      const dt = prevT ? Math.min(.05, (now - prevT) / 1000) : .016;
      exits = exits.filter(g => {
        g.t += dt; const k = Math.min(1, g.t / .7);
        g.root.position.copy(g.from).addScaledVector(g.dir, k * 80); g.root.position.y = g.from.y + Math.sin(k * PI) * 26;
        if (k >= 1) { if (!F.some(x => x.ch === g.ch)) g.root.visible = false; burst(g.root.position.clone().add(V3(0, 12, 0)), 14, ['#e8e8f0', '#ffffff', '#b8b0a8'], .9, -10, 2); return false; }
        return true;
      });
      exitLoop(now);
    });
  })(0);

  const _wound = wound;
  wound = function (v) { const r = _wound.apply(this, arguments); if (v && v.team) v.tire = (v.tire || 0) + 1; return r; };
  const _tag = tagIn; // 팀전 중에는 아무 인물이나 들어오는 교대 대신 같은 팀 다음 인물과 교대
  tagIn = function (f) { if (!f || !f.team) return []; void _tag; return [step(.12, [[f, { pose: 'stance', face: f.faceT }]], () => teamSwap(f, '교대!'))]; };
  const _lt = laneTick;
  laneTick = function (dt) {
    F.forEach(f => {
      if (!f.team) return; f.fieldT = (f.fieldT || 0) + dt; f.swapCd = (f.swapCd || 0) - dt; if (f.swapCd > 0) return; if (window.HP && HP.on) return; // 체력바가 켜져 있으면 교대는 hp.js(체력 0·체력 낮음)가 정함
      if (f.tire >= f.tireLim) teamSwap(f, '지쳤다…');
      else if (f.stun > 1 && f.tire >= f.tireLim * .6) teamSwap(f, '쓰러졌다!');
      else if (f.fieldT >= f.timeLim) teamSwap(f, '교대!');
    });
    if (F.length === 1) return warmUp(F[0], dt);
    return _lt(dt);
  };

  const WARM = [{ pose: 'stance' }, { pose: 'guard' }, { pose: 'punch' }, { pose: 'punchL' }, { pose: 'uppercut' }, { pose: 'elbow' }, { pose: 'palm' }, { pose: 'kick' }, { pose: 'highKick' }, { pose: 'sweep' }, { pose: 'slash' }, { pose: 'k_kesa' }, { pose: 'k_yoko' }, { pose: 'k_tsuki' }, { pose: 'seal' }, { pose: 'cast' }, { pose: 'taunt' }, { pose: 'block' }, { pose: 'sidestep' }, { pose: 'backstep' }];
  function warmUp(f, dt) { // 상대가 없을 때: 제자리·가벼운 이동하며 혼자 몸풀기(다른 인물을 찾지 않음)
    lanes = lanes.filter(L => L.fs.length === 1 && L.fs[0] === f && !L.done);
    if (lanes.length) { const L = lanes[0]; L.t -= dt; return laneTickSolo(L); }
    const q = [];
    for (let i = 0, k = 3 + (Math.random() * 4 | 0); i < k; i++) {
      const v = Math.random();
      if (v < .22) q.push(step(R(.35, .7), [[f, { pose: 'run', side: R(-140, 140), fwd: R(-50, 70) }]]));
      else if (v < .32) q.push(step(R(.5, .8), [[f, { pose: 'air', vy: R(160, 260) }]]), step(R(.3, .5), [[f, { pose: 'land' }]]));
      else q.push(step(R(.3, .75), [[f, Object.assign({}, WARM[Math.random() * WARM.length | 0])]]));
    }
    q.push(step(R(.8, 1.6), [[f, { pose: 'stance' }]]));
    lanes = [{ fs: [f], q, t: 0 }];
  }
  function laneTickSolo(L) { if (L.t <= 0) { if (!L.q.length) { L.done = true; lanes = []; return; } L.t = runStep(L.q.shift()); } }
  const nextName = f => { const L = TEAMS[f.team], busy = F.filter(x => x !== f && x.team === f.team).map(x => x.ti); for (let s = 1; s <= L.length; s++) { const j = (f.ti + s) % L.length; if (!busy.includes(j)) return (CH[L[j]] || {}).name; } return null; };
  window.TEAMS = TEAMS; window.teamSwap = teamSwap;
  window.getTeams = () => SEL.slice();
  window.setTeams = ws => { SEL = (Array.isArray(ws) ? ws : []).filter(w => TEAMS[w]); try { localStorage.setItem(KEY, JSON.stringify(SEL)); } catch (e) { }
    const next = order(); if (JSON.stringify(next) !== JSON.stringify(ON)) { ON = next; rebuild(); } return ON; };
  // 무작위로 인물을 넣는 옛 경로(인원수 조절·인물 명단)는 막음
  setFighterCount = () => F.length; window.setFighterCount = setFighterCount; window.setRoster = () => null;
  window.teamState = () => ({ on: ON, sel: SEL.slice(), fighters: F.map(f => ({ team: f.team || f.ch.world, name: f.ch.name, next: f.team ? nextName(f) : null, tire: f.tire || 0, lim: f.tireLim || 0 })) });
  // 예전 '인물 하나씩 고르기' 저장값은 더 쓰지 않음(정리)
  let oldPick = false; try { oldPick = !!localStorage.getItem('arenaRoster'); localStorage.removeItem('arenaRoster'); localStorage.removeItem('arenaN'); } catch (e) { }
  void oldPick; ON = order(); rebuild(); // 처음부터 켠 세계관만(없으면 빈 무대)
})();
