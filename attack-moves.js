/* 공격 동작 사전(attack-moves.js) — 주먹·발·칼·쌍검 120여 가지 + 2~4타 연계 + 상황별 선택.
   mocap.js 의 공격 상태(AttackCombo·Heavy·SwordCombo·Kick)가 시작될 때(mocapOn('state')) 동작 하나를 고르고,
   매 화면 클립 위에 골반 비틀기·등뼈 숙임·팔다리 IK 궤적·칼날 방향을 덧입힌다(additive).
   적중 시점: 각 동작의 h(진행률)를 mocap 상태의 적중 진행률(HS)에 맞춰 시간을 늘이고 줄임 → mocap 'hit' 이벤트·combat.js 판정과 같은 순간.
   공개 자료: window.ATTACK_MOVES(list·byId·CHAINS·STYLE·st), window.ATTACK_STYLE(인물별 규칙 — tactics.js TACTICS.STYLE 과 합침).
   끄기: localStorage arenaAttackMoves = '0' 또는 ATTACK_MOVES.on = false */
(function () {
  'use strict';
  if (typeof THREE === 'undefined' || !window.MOCAP || !window.mocapOn) return;
  const MC = window.MOCAP;
  let ON = true; try { ON = localStorage.getItem('arenaAttackMoves') !== '0'; } catch (e) { /* 저장소 없음 */ }
  const newSt = () => ({ picks: {}, byKey: {}, kinds: {}, starts: 0, chains: 0, chainSteps: 0, chainMax: 0, broken: 0, sanjiFist: 0, sanjiPicks: 0, errors: 0, fadeMin: 9, fadeMax: 0, sameRepeat: 0, sit: {}, t0: performance.now() });
  const AM = window.ATTACK_MOVES = { on: ON, ver: 1, list: [], byId: {}, CHAINS: [], STYLE: null, st: newSt() };
  AM.reset = () => { AM.st = newSt(); };
  // 고도화(11-06): 외부 층(storm-combat.js)이 전황·선호를 확장할 수 있는 훅, 그리고 감사용 선택기 노출
  AM.SIT_HOOKS = []; AM.SCORE_HOOKS = []; AM.__choose = (f, r, s, x) => choose(f, r, s, x);

  /* ═══ 동작 자료 ═══
     좌표: 팔은 어깨, 다리는 엉덩이 기준. 단위는 그 팔·다리 길이. f 앞 · u 위 · s 바깥(오른팔은 오른쪽, 왼팔은 왼쪽 — 좌우 뒤집기가 쉬움)
     lim.rh·lh·rf·lf: [[t, w, f, u, s] ...] (t 동작 진행률 0~1, w 덧입힘 세기)
     tr: py 골반·몸통 비틀기(+ 오른쪽 어깨가 앞으로) · sp 숙임(+ 앞) · sr 옆 기울임(+ 오른쪽) · spin 몸 전체 회전 · dy 골반 높이(+ 뜀, - 낮춤) · dx 골반 앞뒤
     bl.r·l: 칼날이 가리킬 방향 [[t, f, u, s] ...] · str: 고무 팔 늘이기 [[t, v]]
     h: 적중 진행률 · range near|mid|far · ht high|mid|low|down · tags 상황(guard·air·wall·down·counter·anti) · need 꼭 필요한 상황 */
  const GUARD = [.3, .12, -.22], POCKET = [-.1, -.9, .1], LOWH = [.15, -.55, .25], REST = [0, -1, 0];
  const list = AM.list, byId = AM.byId;
  function mk(id, name, kind, o) {
    const m = Object.assign({ id, name, kind, h: .45, side: 'r', tags: [], tr: {}, lim: {}, bl: {}, plant: true, sf: 0, range: 'mid', ht: 'mid' }, o);
    m.bone = o.bone || (kind === 'kick' ? 'foot' : kind === 'fist' ? 'hand' : 'sword');
    Object.keys(m.lim).forEach(k => { const a = m.lim[k]; if (a && a.length && a[0][0] > 0) a.unshift([0, 0].concat(a[0].slice(2))); });
    if (byId[id]) console.warn('[attack-moves] 같은 이름', id);
    list.push(m); byId[id] = m; return m;
  }
  function mirror(m, id, name) {
    const c = JSON.parse(JSON.stringify(m)); c.id = id; c.name = name; c.side = m.side === 'r' ? 'l' : 'r';
    const L = c.lim, B = c.bl; const sw = (o, a, b) => { const x = o[a], y = o[b]; delete o[a]; delete o[b]; if (y) o[a] = y; if (x) o[b] = x; };
    sw(L, 'rh', 'lh'); sw(L, 'rf', 'lf'); sw(B, 'r', 'l');
    ['py', 'sr', 'spin'].forEach(k => { if (c.tr[k]) c.tr[k] = c.tr[k].map(([t, v]) => [t, -v]); });
    if (byId[id]) console.warn('[attack-moves] 같은 이름', id);
    list.push(c); byId[id] = c; return c;
  }
  const T3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  /* 주먹 기본형: 준비(wind) → 적중(peak) → 회복 */
  function fist(id, name, o) {
    const h = o.h || .45, side = o.side || 'r', w = o.wind, p = o.peak, e = o.end || GUARD, hand = side === 'r' ? 'rh' : 'lh';
    const tr = {}; const py = o.py || [0, 0], sp = o.sp || [0, 0];
    tr.py = [[0, 0], [h - .17, py[0]], [h, py[1]], [h + .15, py[1] * .85], [1, 0]].map(([t, v]) => [t, side === 'r' ? v : -v]);
    tr.sp = [[0, 0], [h - .17, sp[0]], [h, sp[1]], [1, 0]];
    if (o.dy) tr.dy = [[0, 0], [h - .17, o.dy[0]], [h, o.dy[1]], [1, 0]];
    if (o.sr) tr.sr = [[0, 0], [h - .17, o.sr[0]], [h, o.sr[1]], [1, 0]].map(([t, v]) => [t, side === 'r' ? v : -v]);
    if (o.dx) tr.dx = [[0, 0], [h - .1, o.dx[0]], [h, o.dx[1]], [1, 0]];
    const lim = {}; lim[hand] = o.track || [[h - .2, .85].concat(w), [h, 1].concat(p), [h + .13, .95].concat(p), [Math.min(.95, h + .4), .6].concat(e), [1, 0].concat(e)];
    if (o.other) lim[side === 'r' ? 'lh' : 'rh'] = o.other;
    return mk(id, name, 'fist', Object.assign({ h, side, tr, lim }, { tags: o.tags || [], range: o.range || 'mid', ht: o.ht || 'mid', heavy: !!o.heavy, need: o.need, str: o.str, plant: o.plant !== false, bone: o.bone }, o.x || {}));
  }
  /* 발차기 기본형: 무릎 접기(chamber) → 뻗기(peak) → 접어 회수 */
  function kick(id, name, o) {
    const h = o.h || .45, side = o.side || 'r', c = o.chamber, p = o.peak, leg = side === 'r' ? 'rf' : 'lf';
    const tr = {}; const py = o.py || [0, 0], sp = o.sp || [0, -.1], sr = o.sr || [0, 0];
    const sg = v => side === 'r' ? v : -v;
    tr.py = [[0, 0], [h - .2, py[0]], [h, py[1]], [h + .2, py[1] * .8], [1, 0]].map(([t, v]) => [t, sg(v)]);
    tr.sp = [[0, 0], [h - .2, sp[0]], [h, sp[1]], [1, 0]];
    tr.sr = [[0, 0], [h - .2, sr[0]], [h, sr[1]], [1, 0]].map(([t, v]) => [t, sg(v)]);
    if (o.dy) tr.dy = o.dy; if (o.spin) tr.spin = o.spin.map(([t, v]) => [t, sg(v)]); if (o.dx) tr.dx = o.dx;
    const lim = {}; lim[leg] = o.track || [[h - .25, .9].concat(c), [h, 1].concat(p), [h + .12, .95].concat(p), [h + .3, .8].concat(c), [1, 0].concat(REST)];
    if (o.other) lim[side === 'r' ? 'lf' : 'rf'] = o.other;
    if (o.hands) Object.assign(lim, o.hands);
    return mk(id, name, 'kick', Object.assign({ h, side, tr, lim, sf: o.sf || 0 }, { tags: o.tags || [], range: o.range || 'mid', ht: o.ht || 'mid', heavy: !!o.heavy, need: o.need, plant: o.plant !== false, str: o.str, bone: o.bone }));
  }
  /* 칼 기본형: 시작 자리·날 방향 → 적중 → 끝 자리 (two: 양손 쥠) */
  function sword(id, name, o) {
    const h = o.h || .45, side = o.side || 'r', hand = side === 'r' ? 'rh' : 'lh', bs = side === 'r' ? 'r' : 'l';
    const sg = v => side === 'r' ? v : -v;
    const tr = {}; const py = o.py || [0, 0, 0], sp = o.sp || [0, 0, 0];
    tr.py = [[0, 0], [h - .17, py[0]], [h, py[1]], [h + .2, py[2]], [1, 0]].map(([t, v]) => [t, sg(v)]);
    tr.sp = [[0, 0], [h - .17, sp[0]], [h, sp[1]], [h + .2, sp[2]], [1, 0]];
    if (o.dy) tr.dy = o.dy; if (o.spin) tr.spin = o.spin.map(([t, v]) => [t, sg(v)]); if (o.dx) tr.dx = o.dx; if (o.sr) tr.sr = o.sr.map(([t, v]) => [t, sg(v)]);
    const lim = {}, bl = {};
    lim[hand] = o.track || [[h - .2, .9].concat(o.a), [h, 1].concat(o.b), [h + .16, 1].concat(o.c), [Math.min(.95, h + .4), .55].concat(o.c), [1, 0].concat(o.c)];
    bl[bs] = o.btrack || [[0].concat(o.ba), [h - .2].concat(o.ba), [h].concat(o.bb), [h + .16].concat(o.bc), [1].concat(o.bc)];
    if (o.other) lim[side === 'r' ? 'lh' : 'rh'] = o.other;
    if (o.otherBl) bl[side === 'r' ? 'l' : 'r'] = o.otherBl;
    return mk(id, name, o.kind || 'sword', Object.assign({ h, side, tr, lim, bl, sf: o.sf || 0, two: !!o.two }, { tags: o.tags || [], range: o.range || 'mid', ht: o.ht || 'mid', heavy: !!o.heavy, need: o.need, plant: o.plant !== false }));
  }

  /* ── 주먹 ── */
  const J = (t, w, a) => [t, w].concat(a);
  fist('jab_l', '잽', { side: 'l', h: .4, wind: [.25, .1, -.15], peak: [.97, .06, -.12], py: [.05, -.12], sp: [0, .06], tags: ['counter'], range: 'mid' });
  fist('jab_body_l', '몸통 잽', { side: 'l', h: .4, wind: [.25, 0, -.12], peak: [.95, -.32, -.1], py: [.05, -.15], sp: [.05, .22], dy: [-.04, -.1], ht: 'low' });
  fist('cross_r', '스트레이트', { wind: [.2, .12, -.2], peak: [1, .06, -.2], py: [-.2, .85], sp: [0, .12], heavy: false, tags: ['counter'] });
  fist('cross_body_r', '몸통 스트레이트', { wind: [.2, 0, -.15], peak: [.97, -.35, -.15], py: [-.2, .8], sp: [.05, .3], dy: [-.05, -.14], ht: 'low' });
  fist('hook_l', '훅', { side: 'l', wind: [.15, .08, .45], peak: [.62, .12, -.38], py: [.3, -.85], sp: [0, .05], sr: [0, .12], range: 'near', tags: ['guard'] });
  mirror(byId.hook_l, 'hook_r', '오른 훅');
  fist('hook_body_l', '리버 블로', { side: 'l', wind: [.15, -.25, .5], peak: [.6, -.38, -.3], py: [.3, -.8], sp: [.1, .25], dy: [-.08, -.16], range: 'near', ht: 'low', tags: ['guard'] });
  mirror(byId.hook_body_l, 'hook_body_r', '오른 몸통 훅');
  fist('upper_r', '어퍼컷', { wind: [.3, -.5, -.02], peak: [.5, .32, -.22], py: [-.15, .5], sp: [.2, -.18], dy: [-.18, .06], range: 'near', ht: 'high', tags: ['guard', 'anti'] });
  mirror(byId.upper_r, 'upper_l', '왼 어퍼컷');
  fist('shovel_l', '쇼벨 훅', { side: 'l', wind: [.2, -.4, .3], peak: [.58, -.05, -.3], py: [.25, -.7], sp: [.12, 0], dy: [-.12, -.04], range: 'near', tags: ['guard'] });
  fist('overhand_r', '오버핸드', { wind: [-.05, .45, .35], peak: [.85, .15, -.3], py: [-.3, .9], sp: [-.05, .3], sr: [.1, -.15], heavy: true, ht: 'high', tags: ['guard'] });
  fist('backfist_l', '백피스트', { side: 'l', wind: [.3, .15, -.55], peak: [.78, .18, .42], py: [-.25, .3], sp: [0, .05], range: 'mid' });
  mirror(byId.backfist_l, 'backfist_r', '오른 백피스트');
  fist('spin_backfist_r', '뒤돌려 주먹', { h: .55, wind: [.25, .1, -.4], peak: [.4, .15, .95], py: [0, 0], x: { tr: { spin: [[0, 0], [.35, -2.6], [.55, -5.6], [.75, -6.28], [1, -6.28]], sp: [[0, 0], [.55, .05], [1, 0]] }, plant: false, sf: 1 }, heavy: true, tags: ['counter'], range: 'mid' });
  mirror(byId.spin_backfist_r, 'spin_backfist_l', '왼 뒤돌려 주먹');
  fist('hammer_r', '해머 주먹', { wind: [0, 1, .05], peak: [.75, -.25, -.1], py: [-.1, .4], sp: [-.12, .35], dy: [.02, -.12], heavy: true, ht: 'high', tags: ['guard', 'down'] });
  fist('hammer_both', '두 손 내려치기', { wind: [.05, 1, -.1], peak: [.75, -.3, -.3], sp: [-.18, .45], dy: [.04, -.16], heavy: true, tags: ['guard', 'down'],
    other: [J(.25, .85, [.05, 1, -.1]), J(.45, 1, [.75, -.3, -.3]), J(.6, .9, [.75, -.3, -.3]), J(1, 0, GUARD)] });
  fist('elbow_r', '팔꿈치 치기', { wind: [.3, .1, .2], peak: [.18, .2, -.55], py: [-.2, 1.05], sp: [0, .12], range: 'near', tags: ['wall', 'guard'] });
  mirror(byId.elbow_r, 'elbow_l', '왼 팔꿈치');
  fist('elbow_up_r', '올려 팔꿈치', { wind: [.15, -.25, 0], peak: [.05, .62, -.2], py: [-.1, .5], sp: [.1, -.12], dy: [-.1, .05], range: 'near', ht: 'high', tags: ['anti', 'wall'] });
  fist('elbow_down_r', '내려찍기 팔꿈치', { wind: [.05, .75, .05], peak: [.35, -.45, -.15], py: [0, .35], sp: [-.1, .6], dy: [.05, -.3], range: 'near', ht: 'down', heavy: true, tags: ['down'], need: 'down' });
  fist('lunge_r', '돌진 주먹', { wind: [.1, .05, -.1], peak: [1, .02, -.18], py: [-.35, .9], sp: [.05, .38], dx: [-.1, .55], dy: [-.06, -.1], range: 'far', heavy: true, tags: ['wall'] });
  mirror(byId.lunge_r, 'lunge_l', '왼 돌진 주먹');
  fist('superman_r', '도약 주먹', { h: .5, wind: [-.2, .2, .2], peak: [1, .15, -.18], py: [-.3, .9], sp: [-.1, .2], x: { tr: {} }, range: 'far', ht: 'high', heavy: true, plant: false, tags: ['anti'] });
  byId.superman_r.tr.dy = [[0, 0], [.3, .25], [.5, .35], [.75, .1], [1, 0]]; byId.superman_r.lim.lf = [[0, 0, .1, -.9, 0], [.3, .9, -.3, -.75, 0], [.6, .9, -.35, -.8, 0], [1, 0, 0, -1, 0]];
  fist('palm_r', '장타', { wind: [.15, 0, -.1], peak: [.95, .02, -.12], py: [-.15, .7], sp: [0, .15], dy: [-.06, -.1], tags: ['wall'], bone: 'hand' });
  fist('palm_both', '쌍장', { wind: [.15, .05, .1], peak: [.93, 0, -.15], sp: [-.05, .2], dy: [-.06, -.12], heavy: true, tags: ['wall', 'guard'], other: [J(.25, .85, [.15, .05, .1]), J(.45, 1, [.93, 0, -.15]), J(.6, .9, [.93, 0, -.15]), J(1, 0, GUARD)] });
  fist('cork_r', '코르크스크루', { wind: [.15, .05, .1], peak: [1, .12, -.25], py: [-.3, 1], sp: [-.05, .1], sr: [0, -.2] });
  fist('chop_r', '수도 치기', { wind: [.1, .7, .45], peak: [.7, .05, -.15], py: [-.2, .55], sp: [-.05, .2], range: 'near', tags: ['guard'] });
  fist('shoulder_r', '어깨 부딪치기', { wind: [.1, -.2, .1], peak: [.2, -.25, .05], py: [.3, -.9], sp: [.1, .35], dx: [-.05, .45], dy: [-.08, -.12], range: 'near', bone: 'chest', tags: ['wall', 'guard'], heavy: true });
  fist('ground_pound', '바닥 내려치기', { wind: [.1, .95, 0], peak: [.45, -.95, -.05], sp: [-.1, .75], dy: [.05, -.45], ht: 'down', heavy: true, need: 'down', tags: ['down'] });
  fist('air_hammer', '공중 내려치기', { wind: [0, 1, .05], peak: [.7, -.35, -.1], sp: [-.25, .45], heavy: true, need: 'air', tags: ['air'], plant: false, ht: 'low',
    other: [J(.25, .85, [0, 1, .05]), J(.45, 1, [.7, -.35, -.1]), J(1, 0, GUARD)] });
  fist('counter_cross_r', '맞받아 스트레이트', { h: .35, wind: [.15, .15, -.3], peak: [.98, .14, -.3], py: [-.4, .9], sp: [.15, .08], dy: [-.12, -.06], need: 'counter', tags: ['counter'] });
  fist('check_hook_l', '물러나며 훅', { side: 'l', h: .4, wind: [.2, .1, .35], peak: [.6, .14, -.32], py: [.25, -.95], sp: [-.1, -.05], dx: [0, -.25], need: 'counter', tags: ['counter'], range: 'near' });
  fist('liver_l', '간장 치기', { side: 'l', wind: [.1, -.3, .3], peak: [.65, -.42, -.2], py: [.2, -.9], sp: [.1, .3], dy: [-.1, -.2], range: 'near', ht: 'low' });
  fist('rising_palm_r', '올려 장타', { wind: [.2, -.4, -.05], peak: [.7, .45, -.15], py: [-.1, .55], sp: [.15, -.12], dy: [-.15, .02], ht: 'high', tags: ['anti'] });
  fist('double_jab_l', '더블 잽', { side: 'l', h: .55, track: [J(.15, .9, [.25, .1, -.15]), J(.28, 1, [.92, .08, -.12]), J(.4, .9, [.35, .1, -.15]), J(.55, 1, [.98, .06, -.12]), J(.7, .9, [.98, .06, -.12]), J(1, 0, GUARD)], py: [-.1, -.15], tags: ['counter'] });
  fist('one_two_r', '원투', { h: .6, track: [J(.4, .8, [.2, .1, -.2]), J(.6, 1, [1, .06, -.2]), J(.75, .9, [1, .06, -.2]), J(1, 0, GUARD)],
    other: [J(.12, .9, [.25, .1, -.15]), J(.28, 1, [.95, .06, -.12]), J(.42, .7, GUARD), J(1, 0, GUARD)], x: { tr: { py: [[0, 0], [.28, -.2], [.45, -.25], [.6, .85], [1, 0]], sp: [[0, 0], [.6, .12], [1, 0]] } } });
  fist('serious_r', '진지한 주먹', { h: .5, wind: [-.15, .1, .1], peak: [1, .08, -.2], py: [-.45, 1], sp: [-.05, .2], dy: [-.08, -.12], heavy: true, tags: ['guard'] });
  /* 고무 주먹(루피): 팔이 늘어남 */
  fist('pistol_r', '고무 권총', { wind: [-.25, .1, .2], peak: [1, .08, -.2], py: [-.45, .7], sp: [-.05, .12], str: [[0, 0], [.35, 0], [.45, 1.8], [.6, 1.6], [.8, 0], [1, 0]], range: 'far', tags: ['rubber'] });
  mirror(byId.pistol_r, 'pistol_l', '왼 고무 권총');
  fist('bazooka', '고무 바주카', { wind: [-.25, .05, .15], peak: [.98, 0, -.2], sp: [-.12, .2], dy: [-.08, -.12], str: [[0, 0], [.35, 0], [.45, 1.6], [.6, 1.4], [.8, 0], [1, 0]], heavy: true, range: 'far', tags: ['rubber', 'wall'],
    other: [J(.25, .85, [-.25, .05, .15]), J(.45, 1, [.98, 0, -.2]), J(.6, .9, [.98, 0, -.2]), J(1, 0, GUARD)] });
  byId.bazooka.strL = byId.bazooka.str;
  fist('gatling', '고무 개틀링', { h: .5, track: [J(.12, 1, [.95, .1, -.2]), J(.22, .9, [.2, .1, -.15]), J(.32, 1, [.95, -.05, -.25]), J(.42, .9, [.2, .05, -.15]), J(.5, 1, [1, .12, -.2]), J(.62, 1, [.25, .1, -.2]), J(.74, 1, [.95, -.1, -.2]), J(1, 0, GUARD)],
    other: [J(.17, 1, [.95, .05, -.2]), J(.27, .9, [.2, .1, -.15]), J(.37, 1, [.95, .15, -.2]), J(.47, .9, [.2, .05, -.15]), J(.57, 1, [.95, 0, -.25]), J(.68, 1, [.2, .1, -.2]), J(.8, 1, [.95, .08, -.2]), J(1, 0, GUARD)],
    str: [[0, 0], [.12, 1.1], [.22, .2], [.32, 1.2], [.42, .2], [.5, 1.3], [.62, .2], [.74, 1.1], [.9, 0], [1, 0]], range: 'far', tags: ['rubber'] });
  byId.gatling.strL = [[0, 0], [.17, 1.1], [.27, .2], [.37, 1.2], [.47, .2], [.57, 1.2], [.68, .2], [.8, 1.1], [.95, 0], [1, 0]];
  fist('rubber_hammer', '고무 망치', { wind: [-.3, 1, .1], peak: [.9, -.2, -.1], sp: [-.2, .4], str: [[0, 0], [.3, .8], [.45, 1.4], [.7, 0], [1, 0]], heavy: true, tags: ['rubber', 'down', 'guard'], ht: 'high' });

  /* ── 발 ── (대부분 오른발: 판정 발 = 차는 발) */
  const HUP = { lh: [J(.15, .65, GUARD), J(.85, .6, GUARD), J(1, 0, GUARD)], rh: [J(.15, .65, [.3, .12, -.22]), J(.85, .6, GUARD), J(1, 0, GUARD)] };
  kick('front_mid_r', '앞차기', { chamber: [.45, -.35, 0], peak: [.98, -.12, -.05], sp: [0, -.15], tags: ['wall'] });
  kick('front_high_r', '높은 앞차기', { chamber: [.5, -.25, 0], peak: [.8, .48, -.05], sp: [0, -.3], ht: 'high', tags: ['anti'] });
  kick('teep_r', '밀어 차기', { chamber: [.4, -.4, .05], peak: [.98, -.18, 0], sp: [0, -.25], dx: [[0, 0], [.45, .15], [1, 0]], tags: ['wall'], range: 'mid' });
  mirror(byId.teep_r, 'teep_l', '왼발 밀어 차기');
  kick('side_mid_r', '옆차기', { chamber: [.35, -.25, .3], peak: [.98, -.08, .05], py: [.6, 1.25], sr: [-.2, -.45], sp: [0, 0], tags: ['wall'], heavy: true });
  kick('side_high_r', '높은 옆차기', { chamber: [.3, -.1, .4], peak: [.85, .4, .1], py: [.6, 1.3], sr: [-.3, -.65], ht: 'high', heavy: true, tags: ['anti'] });
  kick('round_low_r', '로우킥', { chamber: [.25, -.65, .45], peak: [.75, -.72, -.25], py: [.4, .95], sr: [0, -.12], ht: 'low', tags: ['guard'] });
  kick('round_mid_r', '미들킥', { chamber: [.3, -.3, .55], peak: [.78, -.05, -.25], py: [.45, 1.05], sr: [-.1, -.35] });
  kick('round_high_r', '하이킥', { chamber: [.3, -.1, .55], peak: [.7, .55, -.2], py: [.5, 1.15], sr: [-.15, -.55], ht: 'high', heavy: true, tags: ['anti'] });
  mirror(byId.round_mid_r, 'round_mid_l', '왼 미들킥'); mirror(byId.round_high_r, 'round_high_l', '왼 하이킥');
  kick('back_r', '뒤차기', { h: .5, chamber: [-.35, -.45, 0], peak: [-.98, -.1, 0], spin: [[0, 0], [.3, -2.6], [.5, -3.14], [.75, -3.14], [1, -6.28]], sp: [0, .35], plant: false, sf: 1, heavy: true, tags: ['counter'] });
  kick('spin_back_r', '뒤돌려 차기', { h: .55, chamber: [.3, -.3, .5], peak: [.15, .4, 1], spin: [[0, 0], [.3, -2.2], [.55, -4.9], [.8, -6.28], [1, -6.28]], sr: [0, -.5], plant: false, sf: 1, heavy: true, ht: 'high', tags: ['counter'] });
  kick('axe_r', '내려찍기', { h: .5, track: [J(.25, .9, [.55, .1, .35]), J(.38, 1, [.45, 1, .1]), J(.5, 1, [.75, -.25, 0]), J(.62, .95, [.75, -.35, 0]), J(.8, .8, [.4, -.5, 0]), J(1, 0, REST)], sp: [-.25, .15], heavy: true, ht: 'high', tags: ['guard', 'down'] });
  mirror(byId.axe_r, 'axe_l', '왼발 내려찍기');
  kick('knee_r', '무릎 치기', { chamber: [.05, -.85, 0], peak: [.32, -.4, -.05], sp: [0, -.1], hands: { lh: [J(.2, .8, [.6, .25, -.05]), J(.6, .85, [.4, .0, -.05]), J(1, 0, GUARD)], rh: [J(.2, .8, [.6, .25, -.05]), J(.6, .85, [.4, .0, -.05]), J(1, 0, GUARD)] }, range: 'near', tags: ['wall', 'guard'] });
  mirror(byId.knee_r, 'knee_l', '왼 무릎');
  kick('flying_knee_r', '날아 무릎', { h: .5, chamber: [0, -.8, 0], peak: [.38, -.3, -.05], dy: [[0, 0], [.3, .2], [.5, .45], [.75, .15], [1, 0]], other: [J(.3, .9, [-.2, -.7, 0]), J(.7, .9, [-.25, -.75, 0]), J(1, 0, REST)], plant: false, range: 'far', heavy: true, ht: 'high', tags: ['anti', 'guard'] });
  kick('sweep_r', '발 쓸기', { h: .5, track: [J(.25, .9, [.4, -.85, .7]), J(.5, 1, [.8, -.95, -.2]), J(.65, 1, [.3, -.95, -.6]), J(1, 0, REST)], dy: [[0, 0], [.25, -.4], [.65, -.42], [1, 0]], sp: [.4, .45], spin: [[0, 0], [.25, .5], [.65, 2.2], [1, 6.28]], plant: false, sf: 0, ht: 'low', range: 'near', tags: ['guard', 'down'], heavy: true });
  kick('sweep_front_r', '앞 발목 걸기', { chamber: [.3, -.85, .3], peak: [.7, -.95, -.25], dy: [[0, 0], [.3, -.15], [.6, -.18], [1, 0]], sp: [.15, .25], py: [.3, .6], ht: 'low', range: 'near', tags: ['guard'] });
  kick('spin_heel_r', '돌려 발뒤꿈치', { h: .55, chamber: [.35, -.1, .7], peak: [.6, .55, -.4], spin: [[0, 0], [.35, -2.4], [.55, -4.2], [.8, -6.28], [1, -6.28]], sr: [0, -.6], plant: false, sf: 0, heavy: true, ht: 'high' });
  kick('tornado_2', '회전 2단 차기', { h: .62, track: [J(.15, .9, [.35, -.3, .4]), J(.3, 1, [.75, .1, -.2]), J(.42, .8, [.2, -.6, .2]), J(.62, 1, [.7, .5, -.25]), J(.8, .8, [.3, -.5, 0]), J(1, 0, REST)],
    other: [J(.15, .7, [.1, -.9, 0]), J(.45, .9, [-.2, -.6, 0]), J(.7, .8, [0, -.85, 0]), J(1, 0, REST)], spin: [[0, 0], [.3, -1.2], [.62, -5.2], [.85, -6.28], [1, -6.28]], dy: [[0, 0], [.35, .2], [.62, .4], [.85, .1], [1, 0]], plant: false, sf: 0, heavy: true, ht: 'high', tags: ['anti'] });
  kick('jump_front_r', '도약 앞차기', { h: .5, chamber: [.5, -.4, 0], peak: [.95, .25, 0], dy: [[0, 0], [.3, .25], [.5, .45], [.75, .2], [1, 0]], other: [J(.3, .9, [.25, -.55, 0]), J(.7, .9, [.2, -.6, 0]), J(1, 0, REST)], plant: false, range: 'far', ht: 'high', tags: ['anti'] });
  kick('jump_side_r', '날아 옆차기', { h: .5, chamber: [.3, -.25, .35], peak: [1, 0, .05], py: [.7, 1.3], sr: [-.3, -.5], dy: [[0, 0], [.3, .25], [.5, .42], [.75, .15], [1, 0]], other: [J(.3, .9, [-.1, -.55, .1]), J(.7, .9, [-.1, -.55, .1]), J(1, 0, REST)], plant: false, range: 'far', heavy: true, tags: ['wall'] });
  kick('jump_spin_r', '540 돌려차기', { h: .6, chamber: [.3, -.2, .5], peak: [.7, .5, -.3], spin: [[0, 0], [.3, -2], [.6, -6.28], [.85, -9.4], [1, -9.42]], dy: [[0, 0], [.3, .3], [.6, .45], [.85, .15], [1, 0]], other: [J(.3, .8, [.1, -.6, 0]), J(.7, .8, [0, -.7, 0]), J(1, 0, REST)], plant: false, heavy: true, ht: 'high', tags: ['anti'] });
  kick('crescent_out_r', '바깥 반달 차기', { track: [J(.25, .9, [.6, .3, -.5]), J(.45, 1, [.75, .55, 0]), J(.6, 1, [.5, .3, .6]), J(.8, .7, [.3, -.4, .3]), J(1, 0, REST)], sp: [0, -.2], ht: 'high', tags: ['guard'] });
  kick('crescent_in_r', '안 반달 차기', { track: [J(.25, .9, [.5, .25, .6]), J(.45, 1, [.75, .55, 0]), J(.6, 1, [.55, .2, -.5]), J(.8, .7, [.3, -.4, -.2]), J(1, 0, REST)], sp: [0, -.2], ht: 'high' });
  kick('hook_kick_r', '후려차기', { chamber: [.7, .3, -.4], peak: [.55, .45, .35], py: [-.5, -.1], sr: [-.2, -.45], ht: 'high' });
  kick('stomp_r', '짓밟기', { chamber: [.4, -.25, 0], peak: [.55, -1.05, 0], sp: [-.05, .3], dy: [[0, 0], [.3, .05], [.45, -.1], [1, 0]], range: 'near', ht: 'down', need: 'down', tags: ['down'] });
  kick('soccer_r', '걷어차기', { chamber: [-.5, -.7, 0], peak: [.7, -.85, -.05], sp: [.1, .25], range: 'near', ht: 'down', need: 'down', tags: ['down'] });
  kick('double_front', '2단 앞차기', { h: .62, track: [J(.4, .8, [.5, -.4, 0]), J(.62, 1, [.95, .3, 0]), J(.8, .8, [.4, -.4, 0]), J(1, 0, REST)], other: [J(.15, .9, [.45, -.35, 0]), J(.3, 1, [.9, -.05, 0]), J(.45, .9, [.2, -.6, 0]), J(1, 0, REST)], dy: [[0, 0], [.3, .2], [.62, .4], [.85, .1], [1, 0]], plant: false, ht: 'high', tags: ['anti'] });
  kick('oblique_r', '무릎 밟기', { h: .35, chamber: [.3, -.55, .2], peak: [.7, -.75, .05], sp: [0, -.15], ht: 'low', range: 'mid', need: 'counter', tags: ['counter'] });
  kick('switch_l', '스위치 킥', { side: 'l', chamber: [.3, -.3, .55], peak: [.78, 0, -.25], py: [.5, 1.05], sr: [-.1, -.4], dy: [[0, 0], [.15, .08], [.3, 0], [1, 0]] });
  kick('drop_kick', '드롭킥', { h: .5, chamber: [.4, -.4, .1], peak: [1, -.05, .05], other: [J(.25, .9, [.4, -.4, .1]), J(.5, 1, [1, -.05, .05]), J(.65, .9, [.9, 0, .05]), J(1, 0, REST)], sp: [-.2, -.55], dy: [[0, 0], [.3, .3], [.5, .45], [.8, .1], [1, 0]], plant: false, heavy: true, range: 'far', tags: ['wall'] });
  kick('air_axe', '공중 발뒤꿈치 찍기', { h: .5, track: [J(.25, .9, [.4, 1, .1]), J(.5, 1, [.75, -.35, 0]), J(.7, .9, [.4, -.6, 0]), J(1, 0, REST)], sp: [-.3, .2], plant: false, need: 'air', tags: ['air', 'down'], heavy: true });
  kick('air_round', '공중 돌려차기', { h: .5, chamber: [.3, -.2, .5], peak: [.75, .2, -.25], py: [.4, 1.2], spin: [[0, 0], [.5, -1.2], [1, 0]], plant: false, need: 'air', tags: ['air'] });
  kick('clinch_knee_r', '붙잡고 무릎', { chamber: [0, -.9, 0], peak: [.35, -.25, -.05], sp: [.1, .25], hands: { lh: [J(.2, .9, [.55, .35, -.1]), J(.6, 1, [.45, .15, -.1]), J(1, 0, GUARD)], rh: [J(.2, .9, [.55, .35, -.1]), J(.6, 1, [.45, .15, -.1]), J(1, 0, GUARD)] }, range: 'near', heavy: true, tags: ['wall', 'guard'] });
  /* 상디식(손은 주머니): 이름은 원작 기술 */
  kick('collier', '콜리에 슛(목)', { chamber: [.35, -.05, .5], peak: [.72, .6, -.15], py: [.45, 1.1], sr: [-.25, -.65], ht: 'high', tags: ['sanji', 'anti'], heavy: true });
  kick('epaule', '에폴 슛(어깨)', { chamber: [.4, .1, .4], peak: [.8, .35, -.1], py: [.4, .95], sr: [-.2, -.5], tags: ['sanji'] });
  kick('poitrine', '프와트린(가슴)', { chamber: [.45, -.3, .05], peak: [1, .05, 0], sp: [0, -.3], tags: ['sanji', 'wall'] });
  kick('mouton', '무통 숏', { h: .5, chamber: [.45, -.5, 0], peak: [1, -.1, 0], other: [J(.3, .8, [.3, -.5, 0]), J(.5, .9, [.9, -.15, .1]), J(1, 0, REST)], sp: [-.25, -.5], dy: [[0, 0], [.3, .25], [.5, .35], [.8, .1], [1, 0]], plant: false, heavy: true, range: 'far', tags: ['sanji', 'wall'] });
  kick('concasse', '콩카세(내려찍기)', { h: .55, track: [J(.25, .9, [.3, .9, .1]), J(.4, 1, [.55, 1.05, 0]), J(.55, 1, [.75, -.4, 0]), J(.75, .9, [.4, -.6, 0]), J(1, 0, REST)], dy: [[0, 0], [.3, .35], [.45, .45], [.6, .1], [1, 0]], sp: [-.3, .2], plant: false, heavy: true, ht: 'high', tags: ['sanji', 'down', 'guard'] });
  kick('mouton_rapid', '무통 연속 차기', { h: .5, track: [J(.12, 1, [.95, -.05, 0]), J(.22, .9, [.4, -.4, 0]), J(.32, 1, [.95, .2, .05]), J(.42, .9, [.4, -.4, 0]), J(.5, 1, [.95, -.15, -.05]), J(.62, .9, [.4, -.4, 0]), J(.72, 1, [.95, .1, 0]), J(1, 0, REST)], sp: [0, -.3], tags: ['sanji'], range: 'mid' });
  kick('anti_manner', '앙티 마너 킥', { h: .5, chamber: [.25, -.75, 0], peak: [.4, .65, -.05], sp: [.1, -.45], dy: [[0, 0], [.3, -.15], [.5, .15], [1, 0]], ht: 'high', heavy: true, tags: ['sanji', 'anti'] });
  /* 고무 발(루피) */
  kick('whip_r', '고무 채찍', { chamber: [.3, -.3, .6], peak: [.8, -.6, -.4], py: [.4, 1.2], sr: [0, -.3], ht: 'low', range: 'far', tags: ['rubber', 'guard'], str: [[0, 0], [.3, 0], [.45, 1.4], [.65, .8], [.85, 0], [1, 0]] });
  kick('stamp_r', '고무 스탬프', { chamber: [.45, -.35, 0], peak: [1, -.05, 0], sp: [0, -.3], range: 'far', tags: ['rubber', 'wall'], str: [[0, 0], [.3, 0], [.45, 1.6], [.65, 1.2], [.85, 0], [1, 0]], heavy: true });

  /* ── 무투 확장(고도화 11-06 — 카포에라·공중 발차기·덤블링·헤드벗 등 상황 다양화) ── */
  kick('capoeira_r', '카포에라 킥', { h: .55, chamber: [.35, -.25, .5], peak: [.65, .6, -.35], spin: [[0, 0], [.3, -2], [.55, -4.7], [.8, -6.28], [1, -6.28]], dy: [[0, 0], [.3, .18], [.55, .3], [.8, .05], [1, 0]], sr: [0, -.4], plant: false, sf: 1, heavy: true, ht: 'high', tags: ['counter'], range: 'mid' });
  kick('air_back_r', '공중 뒤차기', { h: .5, chamber: [-.35, -.45, 0], peak: [-.98, -.1, 0], spin: [[0, 0], [.3, -2.6], [.5, -3.14], [.75, -3.14], [1, -6.28]], dy: [[0, 0], [.3, .22], [.5, .35], [.8, .08], [1, 0]], sp: [0, .35], plant: false, sf: 1, need: 'air', tags: ['air'], heavy: true, range: 'mid' });
  kick('butterfly_r', '나비 이중 발차기', { h: .58, track: [J(.18, .9, [.5, .1, .25]), J(.34, 1, [.75, .55, -.1]), J(.5, .85, [.45, -.2, .2]), J(.66, 1, [.7, .6, -.15]), J(.82, .8, [.4, -.4, 0]), J(1, 0, REST)], other: [J(.15, .85, [.45, .3, .2]), J(.6, .85, [.5, .4, .1]), J(1, 0, REST)], dy: [[0, 0], [.3, .25], [.6, .4], [.85, .1], [1, 0]], plant: false, ht: 'high', tags: ['anti'], heavy: true, range: 'mid' });
  mirror(byId.capoeira_r, 'capoeira_l', '왼 카포에라 킥');
  fist('roll_hook_r', '덤블링 훅', { h: .55, wind: [.3, .1, .4], peak: [.55, .12, -.4], x: { tr: { spin: [[0, 0], [.3, -2.8], [.55, -5.6], [.8, -6.28], [1, -6.28]], dy: [[0, 0], [.35, .18], [.6, .25], [.85, .05], [1, 0]], sp: [[0, 0], [.55, .1], [1, 0]] }, plant: false, sf: 1 }, py: [0, 0], heavy: true, tags: ['counter'], range: 'mid' });
  fist('headbutt_r', '박치기', { h: .4, wind: [.15, -.15, .05], peak: [.3, -.2, 0], py: [-.15, .5], sp: [.25, .3], dx: [[0, 0], [.35, .55], [1, 0]], bone: 'chest', range: 'near', heavy: true, tags: ['wall', 'guard'] });
  fist('sucker_r', '스커 점프 훅', { h: .5, wind: [.1, -.35, -.05], peak: [.45, .5, -.15], py: [-.1, .45], sp: [.18, -.1], dy: [.18, .3], x: { plant: false }, ht: 'high', heavy: true, tags: ['anti'], range: 'mid' });
  mirror(byId.headbutt_r, 'headbutt_l', '왼 박치기');
  fist('dive_fist', '급강하 주먹', { h: .5, wind: [-.15, .3, .15], peak: [1, .1, -.15], py: [-.25, .75], sp: [-.05, .28], x: { tr: { dy: [[0, 0], [.3, .32], [.5, .38], [.75, 0], [1, 0]], sp: [[0, 0], [.5, .28], [1, 0]] }, plant: false }, heavy: true, ht: 'low', range: 'mid', need: 'air', tags: ['air', 'anti'] });
  fist('roll_back_hook', '물러서며 훅', { side: 'l', wind: [.2, .12, .4], peak: [.6, .12, -.35], py: [.35, -.75], sp: [0, .08], dx: [[0, 0], [.35, -.3], [1, 0]], range: 'near', need: 'counter', tags: ['counter', 'guard'] });
  fist('long_jab', '먼 거리 잽', { side: 'l', h: .38, wind: [.25, .1, -.1], peak: [1, .06, -.16], py: [.08, -.18], sp: [0, .1], dx: [[0, 0], [.38, .35], [1, 0]], range: 'far', tags: ['counter', 'guard'] });
  mirror(byId.long_jab, 'long_jab_l', '왼 먼 거리 잽');
  fist('down_hammer', '쓰러진 상대 해머', { wind: [0, 1, .05], peak: [.78, -.3, -.1], py: [-.1, .45], sp: [-.15, .4], dy: [.03, -.22], heavy: true, ht: 'down', range: 'near', need: 'down', tags: ['down'] });
  fist('wall_backfist', '벽 짚고 백피스트', { side: 'l', wind: [.3, .15, -.55], peak: [.78, .2, .45], py: [-.25, .35], sp: [0, .08], dy: [[0, 0], [.4, .16], [1, 0]], plant: false, heavy: true, tags: ['wall', 'counter'] });
  fist('scoop_palm', '떠올리는 장타', { wind: [.2, -.65, 0], peak: [.45, .55, -.18], py: [-.1, .6], sp: [.18, -.12], dy: [-.12, .04], range: 'near', ht: 'high', tags: ['anti', 'guard'] });
  fist('mex_upper', '근거리 카운터 어퍼', { wind: [.25, -.45, -.05], peak: [.45, .35, -.2], py: [-.15, .5], sp: [.18, -.16], dy: [-.14, .04], range: 'near', ht: 'high', need: 'counter', tags: ['counter'] });
  mirror(byId.mex_upper, 'mex_upper_l', '왼 근거리 카운터 어퍼');
  kick('air_side_r', '공중 옆차기', { chamber: [.3, -.55, .35], peak: [.9, -.1, -.3], py: [.35, .65, .5], sr: [0, -.25], plant: false, range: 'mid', need: 'air', tags: ['air', 'anti'] });
  mirror(byId.air_side_r, 'air_side_l', '왼 공중 옆차기');
  kick('air_round_r', '공중 돌려차기', { h: .5, chamber: [.25, -.7, .35], peak: [.45, .75, -.4], py: [-.3, .85, .55], sr: [0, -.2], plant: false, range: 'mid', heavy: true, need: 'air', tags: ['air'] });
  mirror(byId.air_round_r, 'air_round_l', '왼 공중 돌려차기');
  kick('scissor_air', '공중 가위 발차기', { h: .5, chamber: [.3, -.8, 0], peak: [.55, .55, -.05], sp: [.15, -.5], dy: [[0, 0], [.25, .28], [.5, .2], [1, 0]], ht: 'high', heavy: true, plant: false, need: 'counter', tags: ['counter', 'anti'] });
  kick('down_stomp', '쓰러진 상대 밟기', { chamber: [.4, -.5, 0], peak: [.95, -.15, -.1], sp: [0, -.42], dy: [.04, -.3], range: 'near', ht: 'down', heavy: true, need: 'down', tags: ['down'] });
  fist('down_palm', '쓰러진 상대 장타', { wind: [.1, .35, .1], peak: [.8, -.4, -.15], py: [-.05, .35], sp: [-.1, .45], dy: [.02, -.28], ht: 'down', range: 'near', heavy: true, need: 'down', tags: ['down'] });
  kick('down_kick', '쓰러진 상대 걷어차기', { h: .4, chamber: [.3, -.35, .2], peak: [.9, -.3, -.15], sp: [.1, -.35], dy: [.02, -.2], range: 'near', ht: 'down', need: 'down', tags: ['down'] });
  kick('wall_backkick', '벽 밀고 뒤차기', { h: .45, chamber: [.3, -.4, .2], peak: [1, .05, -.2], py: [.5, -.3, -.6], sr: [0, .2], dy: [[0, 0], [.35, .14], [1, 0]], plant: false, range: 'mid', heavy: true, tags: ['wall', 'counter'] });
  kick('slide_kick', '미끄러며 발', { h: .55, chamber: [.3, -.2, .5], peak: [.8, .1, -.7], py: [-.6, .8, .8], sp: [.3, .4, .5], dy: [[0, 0], [.3, -.4], [.6, -.55], [.9, -.2], [1, 0]], range: 'far', ht: 'low', plant: false, heavy: true, tags: ['guard', 'anti'] });
  mirror(byId.slide_kick, 'slide_kick_l', '왼 미끄러며 발');
  kick('counter_knee', '짧은 반격 무릎', { h: .35, chamber: [.2, -.75, .1], peak: [.5, .7, 0], py: [-.1, .55], sp: [.15, -.25], range: 'near', need: 'counter', tags: ['counter', 'wall'] });
  mirror(byId.counter_knee, 'counter_knee_l', '왼 짧은 반격 무릎');

  /* ── 칼(오른손 기준, two: 양손) ── */
  sword('down_1h', '내려베기', { a: [.1, 1, .1], ba: [-.3, .7, .1], b: [.82, -.05, -.05], bb: [1, -.3, 0], c: [.55, -.6, 0], bc: [.6, -.8, 0], py: [-.15, .4, .3], sp: [-.12, .25, .3], ht: 'high', tags: ['guard'] });
  sword('down_2h', '양손 내려베기', { two: true, a: [.05, 1, -.1], ba: [-.4, .7, 0], b: [.8, -.05, -.25], bb: [1, -.25, 0], c: [.5, -.6, -.2], bc: [.6, -.8, 0], py: [0, .25, .15], sp: [-.18, .32, .35], dy: [[0, 0], [.28, .05], [.45, -.12], [1, 0]], heavy: true, ht: 'high', tags: ['guard', 'down'] });
  sword('kesa_1h', '대각 베기', { a: [.2, .85, .5], ba: [-.2, .7, .5], b: [.8, .1, -.1], bb: [.9, -.2, -.35], c: [.4, -.5, -.6], bc: [.3, -.6, -.7], py: [-.3, .6, .7], sp: [0, .2, .25] });
  sword('kesa_2h', '양손 대각 베기', { two: true, a: [.15, .85, .35], ba: [-.25, .7, .45], b: [.78, .05, -.25], bb: [.9, -.25, -.35], c: [.35, -.5, -.65], bc: [.3, -.6, -.7], py: [-.35, .55, .75], sp: [0, .25, .3], heavy: true });
  sword('gyaku_1h', '역베기', { a: [.3, .7, -.6], ba: [0, .6, -.7], b: [.82, .1, .05], bb: [.9, -.2, .35], c: [.45, -.4, .6], bc: [.3, -.6, .7], py: [.5, -.2, -.4], sp: [0, .15, .2] });
  sword('gyaku_2h', '양손 역베기', { two: true, a: [.25, .75, -.55], ba: [-.1, .6, -.7], b: [.8, .05, -.05], bb: [.9, -.25, .3], c: [.45, -.45, .5], bc: [.3, -.6, .7], py: [.55, -.15, -.45], sp: [0, .2, .25] });
  sword('yoko_rl', '횡베기', { a: [.1, .2, .85], ba: [-.3, .1, .9], b: [.85, .15, 0], bb: [1, 0, 0], c: [.2, .15, -.8], bc: [-.1, 0, -1], py: [-.6, .5, 1.1], sp: [0, .1, .1], range: 'mid' });
  sword('yoko_rl_2h', '양손 횡베기', { two: true, a: [.1, .15, .7], ba: [-.35, .05, .9], b: [.82, .1, -.15], bb: [1, 0, -.05], c: [.25, .1, -.75], bc: [-.1, 0, -1], py: [-.7, .45, 1.15], sp: [0, .12, .1], heavy: true });
  sword('yoko_lr', '되돌려 횡베기', { a: [.25, .2, -.75], ba: [-.1, .1, -1], b: [.85, .15, .05], bb: [1, 0, .05], c: [.25, .15, .85], bc: [-.2, 0, 1], py: [.8, -.2, -.7], sp: [0, .1, .1] });
  sword('rise_1h', '올려베기', { a: [.3, -.7, .3], ba: [.5, -.8, .2], b: [.8, .2, 0], bb: [.8, .5, 0], c: [.3, .95, 0], bc: [0, 1, 0], py: [-.3, .3, .3], sp: [.2, -.05, -.15], dy: [[0, 0], [.28, -.12], [.45, 0], [1, 0]], ht: 'high', tags: ['anti', 'guard'] });
  sword('rise_2h', '양손 올려베기', { two: true, a: [.25, -.7, .2], ba: [.4, -.85, .1], b: [.78, .15, -.1], bb: [.8, .55, 0], c: [.3, .9, -.1], bc: [0, 1, 0], py: [-.35, .25, .25], sp: [.25, -.05, -.2], dy: [[0, 0], [.28, -.15], [.45, .02], [1, 0]], heavy: true, ht: 'high', tags: ['anti'] });
  sword('thrust_mid', '찌르기', { h: .4, a: [.1, -.05, .15], ba: [1, 0, 0], b: [1, .03, -.1], bb: [1, 0, -.05], c: [.9, 0, -.1], bc: [1, 0, -.05], py: [-.4, .7, .6], sp: [0, .25, .2], dx: [[0, 0], [.4, .35], [1, 0]], range: 'far' });
  sword('thrust_2h', '양손 높이 찌르기', { two: true, h: .4, a: [0, .15, 0], ba: [1, .05, 0], b: [.98, .2, -.2], bb: [1, .12, -.05], c: [.9, .2, -.2], bc: [1, .1, 0], py: [-.2, .3, .3], sp: [0, .2, .15], dx: [[0, 0], [.4, .3], [1, 0]], ht: 'high', range: 'far', tags: ['guard'] });
  sword('iai', '발도', { h: .38, a: [.05, -.7, -.5], ba: [-.8, -.3, -.3], b: [.9, -.05, .1], bb: [1, .1, .2], c: [.3, .1, .85], bc: [-.2, .1, 1], py: [-.7, .4, .9], sp: [.25, .15, 0], dy: [[0, 0], [.2, -.12], [.38, -.1], [1, 0]], other: [J(.15, .9, [.1, -.7, .35]), J(.5, .8, [.1, -.6, .35]), J(1, 0, LOWH)], tags: ['counter'], range: 'far' });
  sword('iai_up', '발도 올려베기', { h: .38, a: [.05, -.7, -.5], ba: [-.8, -.3, -.3], b: [.75, .3, .1], bb: [.7, .7, .2], c: [.2, .95, .3], bc: [0, 1, .2], py: [-.6, .3, .5], sp: [.25, -.05, -.1], other: [J(.15, .9, [.1, -.7, .35]), J(.5, .8, [.1, -.6, .35]), J(1, 0, LOWH)], ht: 'high', tags: ['counter', 'anti'] });
  sword('spin_slash', '회전베기', { h: .55, a: [.85, .1, .5], ba: [.3, 0, 1], b: [.9, .1, .3], bb: [.3, 0, 1], c: [.85, .1, .4], bc: [.3, 0, 1], spin: [[0, 0], [.2, -1], [.55, -4.4], [.8, -6.28], [1, -6.28]], sf: 1, plant: false, heavy: true, tags: ['wall', 'guard'] });
  sword('x_cut', 'X자 연속 베기', { h: .62, track: [J(.12, .9, [.2, .85, .5]), J(.3, 1, [.45, -.5, -.6]), J(.42, 1, [.3, .85, -.55]), J(.62, 1, [.45, -.5, .6]), J(.8, .8, [.45, -.5, .6]), J(1, 0, [.45, -.5, .6])],
    btrack: [[0, -.2, .7, .5], [.12, -.2, .7, .5], [.3, .3, -.6, -.7], [.42, 0, .6, -.7], [.62, .3, -.6, .7], [1, .3, -.6, .7]], py: [-.3, -.4, .2], sp: [0, .25, .2], heavy: true, tags: ['guard'] });
  sword('jump_down', '도약 내려베기', { two: true, h: .55, a: [0, 1, -.05], ba: [-.5, .6, 0], b: [.82, -.05, -.2], bb: [1, -.3, 0], c: [.5, -.6, -.2], bc: [.6, -.8, 0], sp: [-.25, .35, .4], dy: [[0, 0], [.3, .3], [.45, .4], [.6, 0], [1, 0]], plant: false, heavy: true, ht: 'high', range: 'far', tags: ['anti', 'guard'] });
  sword('air_slash', '공중 베기', { a: [.2, .85, .5], ba: [-.2, .7, .5], b: [.8, -.2, -.1], bb: [.9, -.4, -.3], c: [.4, -.5, -.6], bc: [.3, -.6, -.7], sp: [-.2, .3, .3], plant: false, need: 'air', tags: ['air'] });
  sword('down_stab', '내려 찌르기', { two: true, a: [.2, .9, 0], ba: [.1, -1, 0], b: [.55, -.6, -.15], bb: [.15, -1, 0], c: [.55, -.65, -.15], bc: [.15, -1, 0], sp: [-.1, .55, .55], dy: [[0, 0], [.3, .05], [.45, -.25], [1, 0]], need: 'down', ht: 'down', tags: ['down'], heavy: true, range: 'near' });
  sword('pommel', '칼자루 치기', { h: .4, a: [.25, .3, .1], ba: [-.6, .5, 0], b: [.75, .25, -.15], bb: [-.7, .4, 0], c: [.5, .1, 0], bc: [-.2, .9, 0], py: [-.2, .6, .4], sp: [0, .15, .1], range: 'near', tags: ['wall', 'guard'] });
  sword('waki_rise', '와키 올려베기', { a: [-.1, -.7, .5], ba: [-.8, -.4, .3], b: [.75, .1, .1], bb: [.8, .45, .2], c: [.35, .85, -.1], bc: [0, 1, -.2], py: [-.6, .35, .5], sp: [.2, 0, -.1], ht: 'mid' });
  sword('counter_cut', '받아치기 베기', { h: .35, a: [.4, .5, -.2], ba: [.5, .8, -.4], b: [.85, .05, .1], bb: [.9, -.2, .3], c: [.4, -.4, .6], bc: [.3, -.6, .7], py: [.3, -.2, -.4], sp: [0, .2, .2], need: 'counter', tags: ['counter'] });
  sword('low_cut', '다리 베기', { a: [.15, -.3, .7], ba: [-.2, -.5, .9], b: [.8, -.6, 0], bb: [.9, -.4, 0], c: [.2, -.6, -.7], bc: [-.1, -.4, -1], py: [-.5, .4, .9], sp: [.25, .5, .5], dy: [[0, 0], [.28, -.2], [.45, -.3], [1, 0]], ht: 'low', tags: ['guard'] });
  sword('lunge_thrust', '돌진 찌르기', { h: .45, a: [-.1, 0, .25], ba: [1, 0, 0], b: [1, 0, -.1], bb: [1, -.05, -.05], c: [.95, 0, -.1], bc: [1, 0, -.05], py: [-.5, .8, .7], sp: [.05, .35, .3], dx: [[0, 0], [.3, -.1], [.45, .7], [1, 0]], dy: [[0, 0], [.45, -.15], [1, 0]], range: 'far', heavy: true, tags: ['wall'] });
  sword('flurry', '3연 베기', { h: .55, track: [J(.12, 1, [.2, .8, .5]), J(.25, 1, [.6, -.3, -.5]), J(.38, 1, [.3, .2, .8]), J(.55, 1, [.85, .15, -.4]), J(.68, 1, [.25, .9, 0]), J(.8, 1, [.75, -.3, 0]), J(1, 0, [.5, -.5, 0])],
    btrack: [[0, -.2, .7, .5], [.12, -.2, .7, .5], [.25, .3, -.6, -.7], [.38, -.3, .1, .9], [.55, .2, 0, -1], [.68, -.3, .9, 0], [.8, .9, -.4, 0], [1, .6, -.8, 0]], py: [-.3, .7, .2], sp: [0, .2, .25], tags: ['guard'] });
  sword('kenpachi_cleave', '거칠게 내리찍기', { a: [-.2, 1, .4], ba: [-.6, .5, .4], b: [.8, -.25, -.15], bb: [.9, -.5, -.1], c: [.5, -.7, -.3], bc: [.4, -.9, -.2], py: [-.5, .7, .6], sp: [-.25, .5, .45], dy: [[0, 0], [.28, .05], [.45, -.2], [1, 0]], heavy: true, ht: 'high', tags: ['guard', 'down'] });
  sword('hasso_cut', '팔상 베기', { two: true, a: [-.05, .75, .45], ba: [-.3, .9, .15], b: [.8, 0, -.2], bb: [.85, -.35, -.3], c: [.4, -.55, -.5], bc: [.3, -.7, -.6], py: [-.4, .6, .8], sp: [0, .28, .3] });
  sword('one_hand_reach', '한손 뻗어 베기', { a: [.3, .4, .7], ba: [0, .5, .9], b: [1, .1, .1], bb: [.9, -.1, -.4], c: [.6, -.2, -.6], bc: [.4, -.3, -.9], py: [-.5, .7, .9], sp: [0, .3, .2], dx: [[0, 0], [.45, .3], [1, 0]], other: [J(.2, .8, [-.2, -.3, .7]), J(.7, .8, [-.2, -.3, .7]), J(1, 0, LOWH)], range: 'far' });

  /* ── 칼 확장(고도화 11-06): 페인트·초속·와키·하단·회전·저각 찌르기·공중·막타·가드붕괴 등 상황 전용 14종 ── */
  sword('feint_cut', '페인트 → 횡베기', { h: .52, track: [J(.1, .9, [.15, .75, .45]), J(.22, 1, [.8, .1, -.1]), J(.3, .45, [.78, .35, .3]), J(.48, 1, [.85, .15, -.55]), J(.62, 1, [.2, .15, -.75]), J(1, 0, [.2, .15, -.75])],
    btrack: [[0, -.2, .7, .5], [.1, -.2, .7, .5], [.22, .95, .1, -.1], [.3, .8, .5, .2], [.48, 1, 0, -.5], [.62, .1, 0, -1], [1, .1, 0, -1]], py: [-.35, .55, .35], sp: [0, .22, .18], tags: ['guard'], range: 'mid' });
  sword('quick_slash', '초속 짧은 베기', { h: .3, a: [.3, .5, .35], ba: [.1, .6, .5], b: [.92, .05, -.25], bb: [1, -.15, -.1], c: [.6, -.4, -.25], bc: [.55, -.6, -.1], py: [-.2, .45, .45], sp: [0, .12, .12], range: 'near', tags: ['simple', 'guard', 'counter'] });
  sword('waki_far', '와키 원거리 베기', { a: [-.15, -.6, .6], ba: [-.9, -.3, .4], b: [.8, .25, .05], bb: [.75, .55, .15], c: [.3, .9, -.05], bc: [-.1, 1, -.1], py: [-.75, .5, .8], sp: [.2, .05, -.1], dx: [[0, 0], [.42, .3], [1, 0]], range: 'far', tags: ['guard'] });
  sword('low_sweep_cut', '하단 쓸기 베기', { h: .5, a: [.2, -.5, .6], ba: [-.1, -.75, .8], b: [.82, -.75, -.15], bb: [.85, -.55, -.2], c: [.15, -.7, -.75], bc: [-.15, -.5, -1], py: [-.55, .5, .95], sp: [.3, .55, .55], dy: [[0, 0], [.25, -.24], [.5, -.34], [1, 0]], ht: 'low', range: 'near', tags: ['guard'] });
  sword('windmill_2h', '바람개비 베기', { h: .6, a: [.6, .6, .3], ba: [.5, .4, .6], b: [.85, .1, .25], bb: [.4, .1, 1], c: [.7, .4, .3], bc: [.45, .15, .9], spin: [[0, 0], [.15, -.8], [.42, -3.2], [.68, -5.3], [1, -6.28]], sf: 1, plant: false, heavy: true, py: [.2, .3, .2], sp: [-.1, .2, .18], tags: ['wall', 'guard'] });
  sword('thrust_low', '낮은 찌르기', { h: .38, a: [.15, -.45, .15], ba: [.85, -.2, 0], b: [1, -.35, -.08], bb: [1, -.12, -.05], c: [.92, -.32, -.08], bc: [1, -.1, -.05], py: [-.4, .65, .55], sp: [.18, .3, .28], dx: [[0, 0], [.38, .38], [1, 0]], range: 'far', ht: 'low', tags: ['guard'] });
  sword('air_dive_cut', '공중 다이빙 베기', { h: .55, a: [.1, .95, .1], ba: [-.4, .7, .1], b: [.8, -.35, -.2], bb: [.9, -.55, 0], c: [.5, -.8, -.2], bc: [.55, -.9, 0], sp: [-.3, .5, .5], dy: [[0, 0], [.3, .34], [.52, .4], [.72, 0], [1, 0]], plant: false, heavy: true, ht: 'high', need: 'air', tags: ['air', 'anti'] });
  sword('air_yoko', '공중 횡베기', { a: [.15, .15, .8], ba: [-.25, .1, .9], b: [.85, .15, -.1], bb: [.95, 0, 0], c: [.25, .2, -.7], bc: [-.1, 0, -1], py: [-.5, .4, .75], sp: [0, .12, .12], plant: false, need: 'air', tags: ['air'] });
  sword('parry_cut', '받아 막고 베기', { h: .36, a: [.45, .62, -.25], ba: [.55, .85, -.4], b: [.9, .08, .12], bb: [.95, -.15, .35], c: [.42, -.45, .55], bc: [.32, -.6, .72], py: [.4, -.3, -.45], sp: [0, .18, .18], need: 'counter', tags: ['counter'] });
  sword('finisher_stab', '막타 찌르기', { h: .5, a: [.25, .85, .05], ba: [.1, -1, .05], b: [.6, -.8, -.12], bb: [.2, -1, 0], c: [.58, -.85, -.12], bc: [.2, -1, 0], sp: [-.12, .6, .6], dy: [[0, 0], [.3, .06], [.48, -.3], [1, 0]], need: 'down', ht: 'down', tags: ['down'], heavy: true, range: 'near' });
  sword('rev_spin', '역회전 베기', { h: .55, a: [.8, .15, -.55], ba: [.3, 0, -1], b: [.88, .12, -.3], bb: [.32, 0, -.95], c: [.8, .15, -.4], bc: [.3, 0, -1], spin: [[0, 0], [.2, 1], [.55, 4.4], [.8, 6.28], [1, 6.28]], sf: 1, plant: false, heavy: true, py: [.2, .2, .1], sp: [0, .15, .15], tags: ['wall', 'guard'] });
  sword('wall_slash', '벽 차고 베기', { h: .5, a: [.3, .8, .45], ba: [-.2, .65, .5], b: [.82, -.1, -.15], bb: [.9, -.35, -.3], c: [.4, -.5, -.55], bc: [.3, -.6, -.65], dy: [[0, 0], [.3, .22], [.55, .1], [1, 0]], plant: false, heavy: true, tags: ['wall', 'counter'], range: 'mid' });
  sword('reach_2h_far', '양손 길게 뻗어 베기', { two: true, a: [.35, .35, .6], ba: [0, .45, .85], b: [.98, .12, .05], bb: [.9, -.1, -.3], c: [.62, -.2, -.5], bc: [.42, -.32, -.85], py: [-.6, .75, .95], sp: [0, .32, .25], dx: [[0, 0], [.48, .38], [1, 0]], range: 'far', heavy: true, tags: ['wall'] });

  /* ── 쌍검(두 손 각각 칼) ── */
  const dual = (id, name, o) => sword(id, name, Object.assign({ kind: 'dual' }, o));
  dual('dual_cross', '쌍검 교차 베기', { a: [.3, .7, .6], ba: [0, .6, .7], b: [.75, .05, -.3], bb: [.9, -.2, -.4], c: [.45, -.4, -.6], bc: [.3, -.6, -.7], sp: [-.05, .25, .25], heavy: true, tags: ['guard'],
    other: [J(.25, .9, [.3, .7, .6]), J(.45, 1, [.75, 0, -.3]), J(.61, 1, [.45, -.4, -.6]), J(.85, .55, [.45, -.4, -.6]), J(1, 0, [.45, -.4, -.6])], otherBl: [[0, 0, .6, .7], [.25, 0, .6, .7], [.45, .9, -.2, -.4], [.61, .3, -.6, -.7], [1, .3, -.6, -.7]] });
  dual('dual_scissor', '쌍검 가위 베기', { a: [.1, .15, .85], ba: [-.3, .1, .9], b: [.85, .15, -.15], bb: [1, 0, -.3], c: [.3, .15, -.7], bc: [0, 0, -1], sp: [0, .1, .1],
    other: [J(.25, .9, [.1, .05, .85]), J(.45, 1, [.85, .05, -.15]), J(.61, 1, [.3, .05, -.7]), J(1, 0, [.3, .05, -.7])], otherBl: [[0, -.3, .1, .9], [.25, -.3, .1, .9], [.45, 1, 0, -.3], [.61, 0, 0, -1], [1, 0, 0, -1]] });
  dual('dual_alt', '쌍검 엇갈려 내려베기', { h: .55, a: [.1, 1, .15], ba: [-.3, .7, .1], b: [.8, -.1, -.1], bb: [1, -.3, 0], c: [.5, -.6, 0], bc: [.6, -.8, 0], py: [.3, .5, .2], sp: [-.1, .3, .25],
    other: [J(.1, .9, [.75, -.1, -.1]), J(.3, 1, [.1, 1, .15]), J(.45, 1, [.1, 1, .15]), J(.62, .9, [.75, -.1, -.1]), J(1, 0, LOWH)], otherBl: [[0, 1, -.3, 0], [.1, 1, -.3, 0], [.3, -.3, .7, .1], [.45, -.3, .7, .1], [.62, 1, -.3, 0], [1, .6, -.8, 0]] });
  dual('dual_spin', '쌍검 회전 베기', { h: .55, a: [.85, .1, .6], ba: [.3, 0, 1], b: [.9, .1, .5], bb: [.3, 0, 1], c: [.85, .1, .5], bc: [.3, 0, 1], spin: [[0, 0], [.2, -1], [.55, -4.6], [.8, -6.28], [1, -6.28]], sf: 1, plant: false, heavy: true, tags: ['wall', 'guard'],
    other: [J(.2, .9, [.85, .15, .6]), J(.8, .9, [.85, .15, .6]), J(1, 0, LOWH)], otherBl: [[0, .3, 0, 1], [1, .3, 0, 1]] });
  dual('dual_thrust', '쌍검 찌르기', { h: .4, a: [.05, 0, .25], ba: [1, 0, 0], b: [1, .05, -.1], bb: [1, 0, -.05], c: [.9, .05, -.1], bc: [1, 0, -.05], sp: [0, .25, .2], dx: [[0, 0], [.4, .35], [1, 0]], range: 'far',
    other: [J(.2, .9, [.05, -.1, .25]), J(.4, 1, [1, -.1, -.1]), J(.6, .9, [.9, -.1, -.1]), J(1, 0, LOWH)], otherBl: [[0, 1, 0, 0], [.4, 1, -.05, -.05], [1, 1, 0, -.05]] });
  dual('dual_rise', '쌍검 올려베기', { a: [.3, -.7, .4], ba: [.5, -.8, .2], b: [.8, .2, -.05], bb: [.8, .5, 0], c: [.3, .95, .2], bc: [0, 1, .2], sp: [.2, -.05, -.15], dy: [[0, 0], [.28, -.15], [.45, .05], [1, 0]], ht: 'high', tags: ['anti'],
    other: [J(.25, .9, [.3, -.7, .4]), J(.45, 1, [.8, .2, -.05]), J(.62, 1, [.3, .95, .2]), J(1, 0, LOWH)], otherBl: [[0, .5, -.8, .2], [.25, .5, -.8, .2], [.45, .8, .5, 0], [.62, 0, 1, .2], [1, 0, 1, .2]] });
  dual('dual_jump_x', '쌍검 도약 X 베기', { h: .55, a: [.2, .9, .5], ba: [-.3, .6, .5], b: [.7, -.3, -.4], bb: [.8, -.5, -.4], c: [.4, -.6, -.6], bc: [.3, -.7, -.6], sp: [-.25, .4, .4], dy: [[0, 0], [.3, .3], [.5, .4], [.7, 0], [1, 0]], plant: false, heavy: true, ht: 'high', range: 'far', tags: ['anti', 'guard'],
    other: [J(.3, .9, [.2, .9, .5]), J(.55, 1, [.7, -.3, -.4]), J(.72, 1, [.4, -.6, -.6]), J(1, 0, LOWH)], otherBl: [[0, -.3, .6, .5], [.3, -.3, .6, .5], [.55, .8, -.5, -.4], [.72, .3, -.7, -.6], [1, .3, -.7, -.6]] });
  dual('dual_wild', '쌍검 난도질', { h: .5, track: [J(.12, 1, [.6, .5, .6]), J(.25, 1, [.7, -.3, -.3]), J(.38, 1, [.3, .7, .4]), J(.5, 1, [.85, 0, -.3]), J(.65, 1, [.4, .6, .5]), J(.8, 1, [.7, -.4, -.2]), J(1, 0, LOWH)],
    btrack: [[0, .2, .8, .5], [.12, .2, .8, .5], [.25, .7, -.6, -.3], [.38, -.1, .9, .3], [.5, 1, -.1, -.4], [.65, 0, .9, .4], [.8, .8, -.6, -.2], [1, .5, -.8, 0]],
    other: [J(.18, 1, [.7, -.3, -.3]), J(.31, 1, [.6, .5, .6]), J(.44, 1, [.85, .05, -.3]), J(.57, 1, [.3, .7, .4]), J(.72, 1, [.7, -.4, -.2]), J(.86, .8, [.4, .5, .5]), J(1, 0, LOWH)],
    otherBl: [[0, .7, -.6, -.3], [.18, .7, -.6, -.3], [.31, .2, .8, .5], [.44, 1, -.1, -.4], [.57, -.1, .9, .3], [.72, .8, -.6, -.2], [.86, 0, .9, .4], [1, .5, -.8, 0]], py: [.3, -.3, .3], sp: [.2, .35, .25], tags: ['guard'] });
  dual('dual_guard_cut', '쌍검 막고 베기', { h: .45, a: [.5, .6, -.2], ba: [.3, .9, -.3], b: [.85, .05, .1], bb: [.9, -.2, .3], c: [.4, -.4, .6], bc: [.3, -.6, .7], py: [.4, -.3, -.4], sp: [0, .2, .2], tags: ['counter'],
    other: [J(.2, 1, [.5, .65, -.25]), J(.6, .9, [.5, .6, -.25]), J(1, 0, LOWH)], otherBl: [[0, .2, .4, -.9], [1, .2, .4, -.9]] });
  /* ── 칼 확장(고도화 11-06 — 상황 커버리지: 벽·가드깨기·공중·반격·낮은베기·쓰러짐·원거리·회전·이중발도) ── */
  sword('wall_slam', '벽 짚고 내려베기', { a: [-.2, .6, .4], ba: [-.5, .4, .3], b: [.85, .05, -.1], bb: [.9, -.3, -.1], c: [.5, -.5, -.3], bc: [.5, -.7, -.1], py: [-.2, .55, .35], sp: [-.1, .3, .3], dx: [[0, 0], [.3, .25], [1, 0]], range: 'near', tags: ['wall'], heavy: true, ht: 'high' });
  sword('guard_break', '가드 깨기 내려찍기', { a: [0, 1, .1], ba: [-.5, .6, .1], b: [.85, -.15, -.15], bb: [1, -.4, 0], c: [.5, -.55, 0], bc: [.6, -.75, 0], py: [0, .3, .15], sp: [-.2, .4, .4], dy: [[0, 0], [.3, .08], [.5, -.18], [1, 0]], ht: 'high', tags: ['guard', 'wall'], heavy: true });
  sword('air_dive', '공중 내려꽂기', { two: true, a: [.1, 1, -.05], ba: [-.4, .7, 0], b: [.75, -.35, -.15], bb: [.9, -.45, 0], c: [.5, -.6, -.1], bc: [.6, -.8, 0], sp: [-.2, .45, .4], dy: [[0, 0], [.25, .3], [.5, .42], [.7, .05], [1, 0]], plant: false, need: 'air', tags: ['air'], ht: 'low', heavy: true });
  sword('riposte', '반격 찌르기(이아이)', { h: .35, a: [.35, -.05, .15], ba: [1, 0, 0], b: [1, .03, -.08], bb: [1, 0, -.04], c: [.92, 0, -.08], bc: [1, 0, -.04], py: [-.3, .6, .45], sp: [.1, .2, .15], dx: [[0, 0], [.35, .4], [1, 0]], range: 'far', need: 'counter', tags: ['counter', 'iai'] });
  sword('low_reap', '낮은 가로 쓸기', { a: [.2, -.25, .65], ba: [-.15, -.35, .9], b: [.8, -.55, 0], bb: [.9, -.4, 0], c: [.2, -.5, -.65], bc: [-.1, -.3, -1], py: [-.55, .45, .95], sp: [.2, .45, .45], dy: [[0, 0], [.28, -.18], [.5, -.28], [1, 0]], ht: 'low', range: 'near', tags: ['guard'] });
  sword('down_pierce', '쓰러진 상대 꿰르기', { h: .5, a: [.3, .75, 0], ba: [-.1, .9, 0], b: [.6, -.85, -.1], bb: [-.1, -.95, 0], c: [.55, -.8, -.1], bc: [-.1, -.9, 0], sp: [-.1, .6, .6], dy: [[0, 0], [.3, .05], [.5, -.3], [1, 0]], need: 'down', ht: 'down', range: 'near', tags: ['down'], heavy: true });
  sword('high_arc', '큰 호 베기', { a: [-.1, .9, .55], ba: [-.55, .5, .45], b: [.85, .15, -.2], bb: [1, -.2, -.25], c: [.45, -.5, -.35], bc: [.55, -.7, -.3], py: [-.25, .65, .45], sp: [-.2, .35, .35], sr: [[0, 0], [.5, -.12], [1, 0]], ht: 'high', range: 'mid', tags: ['guard'], heavy: true });
  sword('spin_low', '낮은 회전베기', { h: .55, a: [.85, -.15, .5], ba: [.3, -.1, 1], b: [.9, -.15, .3], bb: [.3, -.15, 1], c: [.85, -.1, .4], bc: [.3, -.1, 1], spin: [[0, 0], [.2, -.9], [.55, -4.4], [.8, -6.28], [1, -6.28]], sf: 1, plant: false, dy: [[0, 0], [.3, -.15], [.7, -.18], [1, 0]], ht: 'low', tags: ['wall', 'guard'], heavy: true });
  sword('iai_double', '이중 발도 베기', { h: .5, track: [J(.1, .9, [.05, -.7, -.5]), J(.28, 1, [.9, -.05, .1]), J(.4, .85, [.05, -.6, -.45]), J(.6, 1, [.85, .1, .35]), J(.78, .8, [.3, .1, .8]), J(1, 0, [.3, .1, .8])],
    btrack: [[0, -.8, -.3, -.3], [.1, -.8, -.3, -.3], [.28, 1, .1, .2], [.4, -.7, -.25, -.25], [.6, .9, -.1, .35], [1, -.2, .1, 1]], py: [-.6, .4, .9], sp: [.2, .1, 0], other: [J(.15, .9, [.1, -.7, .35]), J(.5, .8, [.1, -.6, .35]), J(1, 0, LOWH)], range: 'far', tags: ['counter', 'iai'] });
  dual('dual_wall_press', '쌍검 벽 압박', { a: [.25, .75, .55], ba: [0, .6, .65], b: [.8, 0, -.35], bb: [.9, -.25, -.45], c: [.45, -.45, -.6], bc: [.3, -.65, -.75], sp: [-.05, .3, .3], dx: [[0, 0], [.3, -.12], [.45, .35], [1, 0]], range: 'near', tags: ['wall'], heavy: true,
    other: [J(.22, .9, [.25, .75, .55]), J(.45, 1, [.8, 0, -.35]), J(.62, 1, [.45, -.45, -.6]), J(1, 0, [.45, -.45, -.6])], otherBl: [[0, 0, .6, .65], [.22, 0, .6, .65], [.45, .9, -.25, -.45], [.62, .3, -.65, -.75], [1, .3, -.65, -.75]] });
  dual('dual_low_sweep', '쌍검 낮은 휩쓸기', { h: .5, a: [.2, -.3, .7], ba: [-.1, -.4, .9], b: [.82, -.5, 0], bb: [.9, -.35, 0], c: [.25, -.45, -.65], bc: [0, -.3, -1], py: [-.5, .4, .85], sp: [.2, .4, .4], dy: [[0, 0], [.28, -.15], [.5, -.25], [1, 0]], ht: 'low', range: 'near', tags: ['guard'],
    other: [J(.25, .9, [.2, -.3, .7]), J(.5, 1, [.82, -.5, 0]), J(.66, 1, [.25, -.45, -.65]), J(1, 0, LOWH)], otherBl: [[0, -.1, -.4, .9], [.25, -.1, -.4, .9], [.5, .9, -.35, 0], [.66, 0, -.3, -1], [1, 0, -.3, -1]] });
  dual('dual_air_fall', '쌍검 공중 낙하베기', { h: .55, a: [.05, 1, .3], ba: [-.35, .65, .3], b: [.72, -.3, -.2], bb: [.85, -.5, -.15], c: [.45, -.55, -.35], bc: [.5, -.75, -.3], sp: [-.25, .4, .45], dy: [[0, 0], [.28, .32], [.5, .45], [.72, .05], [1, 0]], plant: false, need: 'air', tags: ['air'], ht: 'low', heavy: true,
    other: [J(.3, .9, [.05, 1, .3]), J(.55, 1, [.72, -.3, -.2]), J(.72, 1, [.45, -.55, -.35]), J(1, 0, LOWH)], otherBl: [[0, -.35, .65, .3], [.3, -.35, .65, .3], [.55, .85, -.5, -.15], [.72, .5, -.75, -.3], [1, .5, -.75, -.3]] });
  dual('dual_riposte', '쌍검 받아치기 찌르기', { h: .38, a: [.4, 0, .18], ba: [1, 0, 0], b: [1, .04, -.1], bb: [1, 0, -.05], c: [.9, 0, -.1], bc: [1, 0, -.05], py: [-.35, .55, .4], sp: [.12, .2, .15], dx: [[0, 0], [.32, .4], [1, 0]], range: 'far', need: 'counter', tags: ['counter'],
    other: [J(.18, .9, [.4, -.05, .18]), J(.38, 1, [1, -.05, -.1]), J(.55, .9, [.9, -.05, -.1]), J(1, 0, LOWH)], otherBl: [[0, 1, 0, 0], [.38, 1, -.05, -.05], [1, 1, 0, -.05]] });
  /* 왼손잡이·반대 손 변형(칼은 쥔 손 기준) */  mirror(byId.kesa_1h, 'kesa_1h_l', '왼손 대각 베기'); mirror(byId.yoko_rl, 'yoko_rl_l', '왼손 횡베기'); mirror(byId.thrust_mid, 'thrust_mid_l', '왼손 찌르기');
  mirror(byId.dual_alt, 'dual_alt_l', '쌍검 엇갈려 내려베기(왼쪽 먼저)'); mirror(byId.dual_cross, 'dual_cross_l', '쌍검 교차 베기(왼손 위)');
  /* 확장 칼 왼손 변형(고도화) */
  mirror(byId.feint_cut, 'feint_cut_l', '페인트 → 횡베기(왼손)'); mirror(byId.waki_far, 'waki_far_l', '와키 원거리(왼손)'); mirror(byId.quick_slash, 'quick_slash_l', '초속 짧은 베기(왼손)'); mirror(byId.riposte, 'riposte_l', '반격 찌르기(왼손)');
  /* 왼발 변형 */
  mirror(byId.front_mid_r, 'front_mid_l', '왼 앞차기'); mirror(byId.side_mid_r, 'side_mid_l', '왼 옆차기'); mirror(byId.round_low_r, 'round_low_l', '왼 로우킥'); mirror(byId.spin_back_r, 'spin_back_l', '왼 뒤돌려 차기');
  mirror(byId.collier, 'collier_l', '콜리에 슛(왼발)'); mirror(byId.epaule, 'epaule_l', '에폴 슛(왼발)'); mirror(byId.whip_r, 'whip_l', '고무 채찍(왼발)');
  mirror(byId.cross_r, 'cross_l', '왼 스트레이트(반대 자세)'); mirror(byId.jab_l, 'jab_r', '오른 잽(반대 자세)'); mirror(byId.chop_r, 'chop_l', '왼 수도'); mirror(byId.palm_r, 'palm_l', '왼 장타');

  /* 단순 맨주먹(사이타마) */
  ['jab_l', 'cross_r', 'hook_r', 'upper_r', 'cross_body_r', 'serious_r', 'one_two_r', 'jab_r', 'cross_l'].forEach(id => byId[id].tags.push('simple'));
  /* 원작 칼 인물에 어울리는 동작 표시(가중치용) */
  ['kenpachi_cleave', 'down_1h', 'one_hand_reach', 'kesa_1h'].forEach(id => byId[id].tags.push('wild'));
  ['iai', 'iai_up', 'counter_cut'].forEach(id => byId[id].tags.push('iai'));

  /* ── 연계(콤보 체인) ── */
  AM.CHAINS = [
    ['jab_l', 'cross_r', 'hook_l'], ['jab_l', 'cross_r', 'hook_l', 'cross_r'.replace('cross_r', 'upper_r')], ['jab_l', 'jab_body_l', 'cross_r'], ['cross_r', 'hook_l', 'cross_body_r'], ['jab_l', 'cross_r', 'hook_body_l', 'hook_l'],
    ['hook_body_l', 'hook_l', 'cross_r'], ['upper_r', 'hook_l', 'cross_r'], ['double_jab_l', 'cross_r'], ['jab_l', 'upper_r', 'hook_l'], ['backfist_l', 'cross_r', 'spin_backfist_r'],
    ['elbow_r', 'elbow_l', 'knee_r'], ['jab_l', 'cross_r', 'round_low_r'], ['jab_l', 'cross_r', 'round_high_l'], ['cross_r', 'hook_l', 'round_mid_r'], ['teep_r', 'jab_l', 'cross_r'],
    ['round_low_r', 'round_mid_l', 'round_high_r'], ['front_mid_r', 'side_mid_r', 'spin_back_r'], ['knee_r', 'knee_l', 'clinch_knee_r'], ['sweep_r', 'axe_r'], ['round_mid_r', 'spin_heel_r'],
    ['axe_r', 'round_high_l'], ['teep_r', 'round_high_r'], ['switch_l', 'round_mid_r', 'back_r'], ['round_low_l', 'tornado_2'],
    ['epaule', 'collier', 'concasse'], ['poitrine', 'mouton_rapid', 'collier'], ['collier', 'epaule_l', 'anti_manner'], ['mouton_rapid', 'concasse'],
    ['pistol_r', 'pistol_l', 'gatling'], ['pistol_l', 'bazooka'], ['whip_r', 'pistol_r', 'rubber_hammer'],
    ['down_1h', 'gyaku_1h', 'thrust_mid'], ['kesa_1h', 'gyaku_1h', 'yoko_rl'], ['kesa_2h', 'gyaku_2h', 'thrust_2h'], ['yoko_rl', 'yoko_lr', 'down_1h'], ['rise_1h', 'down_2h'],
    ['iai', 'gyaku_1h', 'down_2h'], ['thrust_mid', 'yoko_rl', 'spin_slash'], ['kesa_1h', 'yoko_lr', 'rise_1h', 'down_2h'], ['low_cut', 'rise_1h'], ['pommel', 'kesa_2h'], ['hasso_cut', 'gyaku_2h', 'thrust_2h'],
    ['dual_cross', 'dual_scissor', 'dual_thrust'], ['dual_alt', 'dual_alt_l', 'dual_spin'], ['dual_rise', 'dual_cross', 'dual_jump_x'], ['dual_wild', 'dual_cross'], ['dual_scissor', 'dual_spin'],
    ['quick_slash', 'thrust_mid', 'gyaku_1h'], ['feint_cut', 'yoko_rl_2h', 'down_1h'], ['low_sweep_cut', 'rise_1h'], ['high_arc', 'gyaku_2h', 'thrust_2h'],
    ['waki_far', 'kesa_1h', 'thrust_mid'], ['quick_slash_l', 'thrust_mid_l', 'gyaku_1h'], ['windmill_2h', 'down_2h'], ['dual_wall_press', 'dual_cross', 'dual_thrust'],
    ['dual_low_high', 'dual_cross'], ['dual_wide_sweep', 'dual_scissor', 'dual_thrust'], ['dual_low_sweep', 'dual_low_high'],
    ['slide_kick', 'spin_back_r'], ['long_jab', 'cross_r', 'hook_l'], ['mex_upper', 'scoop_palm'], ['air_back_r', 'slide_kick'], ['wall_backkick', 'wall_backfist'],
    ['jab_l', 'cross_r'], ['one_two_r', 'hook_l', 'upper_r'], ['jab_l', 'cross_r', 'serious_r'],
    ['wall_slam', 'gyaku_1h', 'down_2h'], ['low_reap', 'rise_2h'], ['high_arc', 'low_cut'], ['riposte', 'yoko_rl'], ['iai_double', 'thrust_mid'], ['spin_low', 'kesa_2h'],
    ['dual_low_sweep', 'dual_cross', 'dual_thrust'], ['dual_wall_press', 'dual_spin'], ['dual_riposte', 'dual_cross'],
    ['capoeira_r', 'roll_hook_r', 'cross_r'], ['butterfly_r', 'round_high_r'], ['headbutt_r', 'upper_r'], ['sucker_r', 'round_mid_r'], ['roll_hook_r', 'teep_r'],
  ];
  AM.CHAINS = AM.CHAINS.filter(c => c.every(id => byId[id]) && c.every((id, i) => i === 0 || id !== c[i - 1]));

  /* ═══ 인물별 스타일(공개: window.ATTACK_STYLE — 전투 쪽 TACTICS.STYLE 과 합쳐 읽음) ═══ */
  const BASE_STYLE = {
    sanji: { noFist: 1, pocket: 1, prefer: 'sanji' },
    zoro: { sword: 1, prefer: 'wild' }, kenpachi: { sword: 1, prefer: 'wild', big: .15 }, ichigo: { sword: 1 }, byakuya: { sword: 1, prefer: 'iai' }, hitsugaya: { sword: 1 }, rukia: { sword: 1 },
    tanjiro: { sword: 1 }, giyu: { sword: 1, prefer: 'iai' }, rengoku: { sword: 1 }, zenitsu: { sword: 1, prefer: 'iai' }, muichiro: { sword: 1 }, sanemi: { sword: 1, prefer: 'wild' }, obanai: { sword: 1 }, mitsuri: { sword: 1 }, shinobu: { sword: 1 },
    uzui: { dual: 1 }, inosuke: { dual: 1 }, mikasa: { dual: 1 },
    luffy: { rubber: 1, prefer: 'rubber' },
    gai: { kickBias: .6 }, nezuko: { kickBias: .6 }, annie: { kickBias: .5 },
    saitama: { fistBias: .7, simple: 1 },
    mahoraga: { big: 1 }, eren: { big: .5 }, reiner: { big: .5 }, bertolt: { big: .5 }, titan: { big: 1 },
  };
  AM.BASE_STYLE = BASE_STYLE;
  function styleOf(f) {
    const k = f && f.ch && f.ch.key; const tx = window.TACTICS && TACTICS.STYLE && TACTICS.STYLE[k];
    const s = Object.assign({}, BASE_STYLE[k] || {}, tx || {}, (window.ATTACK_STYLE_EXTRA || {})[k] || {});
    if ((f.scale || 1) > 1.6 || f.giant || (f.giantArm || 0) > .5) s.big = Math.max(s.big || 0, 1);
    return s;
  }
  window.ATTACK_STYLE = new Proxy(BASE_STYLE, { get: (t, k) => typeof k === 'string' ? Object.assign({}, t[k] || {}, (window.TACTICS && TACTICS.STYLE && TACTICS.STYLE[k]) || {}) : t[k] });
  AM.styleOf = styleOf;

  /* ═══ 고르기 ═══ */
  const ATK = /^(AttackCombo|Heavy|SwordCombo|Kick)$/, HURT = /^(Hit|Stagger|Knockback|Knockdown|Death|GetUp)$/;
  const HS = { AttackCombo: .38, Heavy: .45, SwordCombo: .42, Kick: .45 };
  const swordVis = f => !!(f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  const H_ = f => 34 * (typeof MS !== 'undefined' ? MS : .55) * (f.scale || 1);
  function situation(f, rig) {
    const S = {}, tg = f.target || f.faceT; if (!tg || !tg.pos) { S.mid = 1; return S; }
    const d = Math.hypot(tg.pos.x - f.pos.x, tg.pos.z - f.pos.z), h = H_(f);
    S[d < .6 * h ? 'near' : d > 1.15 * h ? 'far' : 'mid'] = 1;
    const dy = tg.pos.y - f.pos.y; if (dy > .3 * h) S.anti = 1; if (dy < -.3 * h) S.lowT = 1;
    if (f.air && f.pos.y > 3) S.air = 1;
    const tr = window.MOCAP && MOCAP.rigs.get(tg.ch && tg.ch.key);
    if ((tr && tr.state === 'Block') || /block|guard|uke/.test(String(tg.hpose || ''))) S.guard = 1;
    if (tg.down || (tg.stun || 0) > .8 || (tr && /Knockdown|Death/.test(tr.state || ''))) S.down = 1;
    if ((tg.atk && tg.atk.ph === 'recovery') || (rig._amS && performance.now() / 1000 - (rig._amS.blockT || 0) < .6)) S.counter = 1;
    const ar = typeof ARENA !== 'undefined' ? ARENA : 110, r = Math.hypot(f.pos.x, f.pos.z);
    if (r > ar * .78) { const ox = f.pos.x / r, oz = f.pos.z / r, bx = -Math.cos(f.heading || 0), bz = -Math.sin(f.heading || 0); if (ox * bx + oz * bz > .35) S.wall = 1; }
    AM.SIT_HOOKS.forEach(hk => { try { const x = hk(f, rig, S); if (x) Object.assign(S, x); } catch (e) { } });
    return S;
  }
  function kindsFor(f, rig, state) {
    const s = styleOf(f), sw = swordVis(f), two = rig.swd && rig.swd.length >= 2;
    const ak = f.atk && f.atk.k;
    let k;
    if (s.noFist) k = 'kick';
    else if (state === 'SwordCombo' || (sw && (ak === 'cut' || ak === 'thrust'))) k = sw ? ((s.dual || two) ? (Math.random() < .8 ? 'dual' : 'sword') : 'sword') : 'fist';
    else if (state === 'Kick') k = (s.fistBias && Math.random() < s.fistBias * .3) ? 'fist' : 'kick';
    else if (state === 'Heavy') k = s.fistBias ? (Math.random() < .7 ? 'fist' : 'kick') : (Math.random() < .7 ? 'kick' : 'fist');
    else k = (s.kickBias && Math.random() < s.kickBias * .45) ? 'kick' : 'fist';
    if (k === 'sword' && !sw) k = 'fist';
    if (k === 'dual' && !(sw && (s.dual || two))) k = sw ? 'sword' : 'fist';
    if (s.noFist && k === 'fist') k = 'kick';
    if (sw && (s.sword || s.dual) && (state === 'AttackCombo' || state === 'Heavy') && k === 'fist') k = (s.dual && (two || s.dual) && Math.random() < .55) ? 'dual' : 'sword'; // 칼 든 검사: 권법 상태에서도 칼로 공격
    if ((k === 'sword' || k === 'dual') && !sw) k = s.noFist ? 'kick' : 'fist';
    return { k, s, heavy: state === 'Heavy' };
  }
  function allowed(m, K, S) {
    if (!m) return false;
    if (m.kind !== K.k) return false;
    if (m.need && !S[m.need]) return false;
    if (m.tags.includes('rubber') && !K.s.rubber) return false;
    if (m.tags.includes('sanji') && !K.s.pocket) return false;
    if (K.s.simple && m.kind === 'fist' && !m.tags.includes('simple')) return false;
    if (S.air && m.plant !== false && !m.tags.includes('air') && m.kind !== 'sword' && m.kind !== 'dual' && m.kind !== 'fist') return false;
    return true;
  }
  function score(m, K, S, a) {
    let v = 1;
    m.tags.forEach(t => { if (S[t]) v += 2.2; });
    if (m.need && S[m.need]) v += 3;
    if (S[m.range]) v += 1.2;
    if (S.anti && m.ht === 'high') v += 1.2; if (S.lowT && (m.ht === 'low' || m.ht === 'down')) v += 1.2;
    if (K.heavy && m.heavy) v += 2; if (!K.heavy && m.heavy) v *= .7;
    if (K.s.prefer && m.tags.includes(K.s.prefer)) v += 2.5;
    const last = a.hist[a.hist.length - 1], lm = last && byId[last];
    if (lm) { /* 이어지기: 직전 끝 손·발과 다른 쪽으로 시작, 무게 중심(높이·회전) 연속 */
      if (lm.side !== m.side) v += 1.2;
      if (lm.plant === false && m.plant === false) v *= .6;
      const sp1 = lm.tr.spin ? 1 : 0, sp2 = m.tr.spin ? 1 : 0; if (sp1 && sp2) v *= .5;
    }
    if (a.hist.slice(-4).includes(m.id)) v *= .3;
    if (a.used && a.used[m.id]) v *= 1 / (1 + a.used[m.id] * .35);
    AM.SCORE_HOOKS.forEach(hk => { try { const x = hk(m, K, S, a, v); if (typeof x === 'number') v = x; } catch (e) { } });
    return v;
  }
  function choose(f, rig, state, a) {
    const K = kindsFor(f, rig, state), S = situation(f, rig), now = performance.now() / 1000;
    const last = a.hist[a.hist.length - 1];
    Object.keys(S).forEach(k => { AM.st.sit[k] = (AM.st.sit[k] || 0) + 1; });
    let m = null;
    const fk = AM.forceNext && AM.forceNext[f.ch.key]; if (fk && byId[fk]) { delete AM.forceNext[f.ch.key]; a.chain = null; return byId[fk]; } /* 시험용: ATTACK_MOVES.forceNext = { luffy: 'pistol_r' } */
    const gap = a.cur ? 0 : now - (a.lastEnd || 0);
    if (a.chain && gap < 1.1) {
      const nid = a.chain.c[a.chain.i + 1], nm = byId[nid];
      if (nm && nid !== last && allowed(nm, K, S)) { m = nm; a.chain.i++; AM.st.chainSteps++; if (a.chain.i === 1) AM.st.chains++; AM.st.chainMax = Math.max(AM.st.chainMax, a.chain.i + 1); if (a.chain.i >= a.chain.c.length - 1) a.chain = null; }
      else a.chain = null;
    } else a.chain = null;
    if (!m) {
      const cp = (window.COMBAT && COMBAT.prof ? COMBAT.prof(f).combo || .1 : .12) + .35;
      if (Math.random() < cp) {
        const cs = AM.CHAINS.filter(c => c[0] !== last && allowed(byId[c[0]], K, S) && allowed(byId[c[1]], { k: byId[c[1]].kind, s: K.s }, {}));
        if (cs.length) { const c = cs[Math.floor(Math.random() * cs.length)]; a.chain = { c, i: 0 }; m = byId[c[0]]; }
      }
    }
    if (!m) {
      const C = list.filter(x => x.id !== last && allowed(x, K, S)); if (!C.length) return null;
      const w = C.map(x => score(x, K, S, a)); let t = Math.random() * w.reduce((p, q) => p + q, 0);
      for (let i = 0; i < C.length; i++) { t -= w[i]; if (t <= 0) { m = C[i]; break; } } if (!m) m = C[C.length - 1];
    }
    if (m.id === last) AM.st.sameRepeat++;
    return m;
  }

  /* ═══ 시작·풀기 ═══ */
  mocapOn('state', e => { try { onState(e); } catch (er) { AM.st.errors++; console.error('[attack-moves]', er); } });
  function rigState(rig) { return rig._amS || (rig._amS = { hist: [], used: {}, chain: null, lastEnd: 0, cur: null, prev: null, blockT: 0 }); }
  function onState(e) {
    const rig = MC.rigs.get(e.key); if (!rig || rig.bad || !e.f) return; const a = rigState(rig), f = e.f;
    if (e.state === 'Block') a.blockT = performance.now() / 1000;
    if (!AM.on) { release(rig, a); return; }
    if (HURT.test(e.state)) { if (a.chain && a.chain.i >= 0) AM.st.broken++; a.chain = null; release(rig, a); return; }
    if (!ATK.test(e.state)) { release(rig, a); return; }
    const m = choose(f, rig, e.state, a); if (!m) { release(rig, a); return; }
    begin(rig, f, m, e.state, a);
  }
  const NOW = () => performance.now() / 1000;
  function begin(rig, f, m, state, a) {
    const st = AM.st, key = f.ch.key, s = styleOf(f);
    const prevE = a.cur ? evalAt(rig, a.cur, a.cur.u) : (a.prev ? a.prev.E : null);
    a.prev = prevE ? { E: prevE } : null;
    a.cur = { m, state, t0: NOW(), u: 0, big: s.big || 0, hs: HS[state] || .42 };
    const fade = prevE ? Math.max(.08, Math.min(.15, .08 + poseDist(prevE, evalMove(m, Math.min(.3, m.h * .6))) * .045)) : .1;
    a.cur.fade = fade; a.fadeT0 = NOW(); st.fadeMin = Math.min(st.fadeMin, fade); st.fadeMax = Math.max(st.fadeMax, fade);
    a.hist.push(m.id); if (a.hist.length > 8) a.hist.shift(); a.used[m.id] = (a.used[m.id] || 0) + 1;
    rig.amId = m.id; rig.amBone = m.bone; rig.amSide = m.side; rig.amOwn = true;
    if (state === 'Kick') rig.kickT = m.id;
    if (a.cur.big && rig.act) rig.act.timeScale *= 1 / (1 + .3 * a.cur.big);
    st.starts++; st.picks[m.id] = (st.picks[m.id] || 0) + 1; st.kinds[m.kind] = (st.kinds[m.kind] || 0) + 1;
    const bk = st.byKey[key] || (st.byKey[key] = {}); bk[m.id] = (bk[m.id] || 0) + 1;
    if (key === 'sanji') { st.sanjiPicks++; if (m.kind === 'fist') st.sanjiFist++; }
    if (AM.log) AM.log.push({ t: NOW(), key, id: m.id, state, chain: a.chain ? a.chain.i : -1 });
  }
  function release(rig, a) {
    if (a.cur) { a.prev = { E: evalAt(rig, a.cur, a.cur.u) }; a.fadeT0 = NOW(); a.cur = null; a.lastEnd = NOW(); a.relFade = .14; }
    rig.amId = null; rig.amBone = null; rig.amSide = null; rig.amOwn = false;
  }

  /* ═══ 동작 값 계산 ═══ */
  const ease = x => x * x * (3 - 2 * x);
  function evK(keys, u, out) {
    if (!keys || !keys.length) return null; const n = keys[0].length - 1;
    if (u <= keys[0][0]) { for (let j = 0; j < n; j++) out[j] = keys[0][j + 1]; return out; }
    for (let i = 0; i < keys.length - 1; i++) { const A = keys[i], B = keys[i + 1]; if (u <= B[0]) { const k = ease((u - A[0]) / ((B[0] - A[0]) || 1)); for (let j = 0; j < n; j++) out[j] = A[j + 1] + (B[j + 1] - A[j + 1]) * k; return out; } }
    const Z = keys[keys.length - 1]; for (let j = 0; j < n; j++) out[j] = Z[j + 1]; return out;
  }
  const TRK = ['py', 'sp', 'sr', 'spin', 'dy', 'dx'], LIMBS = ['rh', 'lh', 'rf', 'lf'];
  function evalMove(m, u) {
    const E = { tr: {}, lim: {}, bl: {}, str: 0, strL: 0, sf: m.sf || 0, two: !!m.two, plant: m.plant !== false, kind: m.kind, side: m.side };
    const o1 = [0];
    TRK.forEach(k => { E.tr[k] = m.tr[k] ? evK(m.tr[k], u, o1)[0] : 0; });
    LIMBS.forEach(k => { if (m.lim[k]) E.lim[k] = evK(m.lim[k], u, [0, 0, 0, 0]); });
    const env = Math.max(0, Math.min(1, u * 6, (1 - u) * 5));
    const pocket = m._pocket;
    ['rh', 'lh'].forEach(k => {
      if (pocket) { E.lim[k] = [.9 * Math.max(env, .6)].concat(POCKET); return; }
      if (E.lim[k]) return;
      if (m.kind === 'fist' || m.kind === 'kick') E.lim[k] = [.6 * env].concat(GUARD);
      else if (m.kind === 'sword' && !m.two) E.lim[k] = [.35 * env].concat(LOWH);
    });
    ['r', 'l'].forEach(k => { if (m.bl[k]) E.bl[k] = evK(m.bl[k], u, [0, 0, 0]); });
    if (m.str) E.str = evK(m.str, u, o1)[0]; if (m.strL) E.strL = evK(m.strL, u, o1)[0];
    if (m.side === 'l' && m.str && !m.strL) { E.strL = E.str; E.str = 0; }
    return E;
  }
  function evalAt(rig, c, u) { const m = c.m; m._pocket = !!styleOf({ ch: rig.ch }).pocket; const E = evalMove(m, u); m._pocket = false; return E; }
  function poseDist(A, B) { let d = 0; LIMBS.forEach(k => { const a = A.lim[k], b = B.lim[k]; if (a && b) d += Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]); else if (a || b) d += .5; }); TRK.forEach(k => { d += Math.abs(A.tr[k] - B.tr[k]) * .5; }); return d; }
  function blend(A, B, k) { /* A→B, k 0..1 */
    if (!A) { const Z = { tr: {}, lim: {}, bl: B.bl, str: B.str * k, strL: B.strL * k, sf: B.sf, two: B.two, plant: B.plant, kind: B.kind, side: B.side }; TRK.forEach(t => { Z.tr[t] = B.tr[t] * k; }); LIMBS.forEach(l => { if (B.lim[l]) Z.lim[l] = [B.lim[l][0] * k, B.lim[l][1], B.lim[l][2], B.lim[l][3]]; }); Z.blW = k; return Z; }
    if (!B) { const Z = blend(null, A, 1 - k); return Z; }
    const Z = { tr: {}, lim: {}, bl: k < .5 ? A.bl : B.bl, str: A.str + (B.str - A.str) * k, strL: A.strL + (B.strL - A.strL) * k, sf: k < .5 ? A.sf : B.sf, two: k < .5 ? A.two : B.two, plant: A.plant || B.plant, kind: B.kind, side: B.side, blW: 1 };
    TRK.forEach(t => { Z.tr[t] = A.tr[t] + (B.tr[t] - A.tr[t]) * k; });
    LIMBS.forEach(l => { const a = A.lim[l], b = B.lim[l]; if (a && b) Z.lim[l] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k]; else if (a) Z.lim[l] = [a[0] * (1 - k), a[1], a[2], a[3]]; else if (b) Z.lim[l] = [b[0] * k, b[1], b[2], b[3]]; });
    return Z;
  }

  /* ═══ 뼈 다루기 ═══ */
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3(), vT = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), vN = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qc = new THREE.Quaternion(), qd = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const FW = new THREE.Vector3(), U = new THREE.Vector3(0, 1, 0), R = new THREE.Vector3(), P = new THREE.Vector3(), Ft = new THREE.Vector3(), Rt = new THREE.Vector3(), Fb = new THREE.Vector3(), Pb = new THREE.Vector3(), mU = new THREE.Vector3();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const qr1 = new THREE.Quaternion(), qr2 = new THREE.Quaternion();
  function rotQ(b, q) { b.parent.getWorldQuaternion(qr1); b.getWorldQuaternion(qr2); qr1.invert().multiply(q).multiply(qr2); b.quaternion.copy(qr1); b.updateMatrixWorld(true); }
  function rotA(b, axis, ang) { if (!b || !ang) return; qc.setFromAxisAngle(axis, ang); rotQ(b, qc); }
  function ik2(b1, b2, b3, T, w, C0, pole) {
    if (!b1 || !b2 || !b3 || w <= .002) return;
    b1.getWorldPosition(vA); b2.getWorldPosition(vB); b3.getWorldPosition(vC);
    vT.copy(C0 || vC).lerp(T, Math.min(1, w));
    const la = vA.distanceTo(vB), lb = vB.distanceTo(vC); if (la < 1e-4 || lb < 1e-4) return;
    const d = clamp(vT.distanceTo(vA), Math.abs(la - lb) + 1e-3, (la + lb) * .995);
    v1.subVectors(vB, vA).normalize(); v2.subVectors(vC, vB).normalize();
    const phiCur = Math.acos(clamp(v1.dot(v2), -1, 1)), phiDes = Math.PI - Math.acos(clamp((la * la + lb * lb - d * d) / (2 * la * lb), -1, 1));
    vN.crossVectors(v1, v2); if (vN.lengthSq() < 1e-5) vN.crossVectors(v1, pole); if (vN.lengthSq() > 1e-8) { vN.normalize(); rotA(b2, vN, phiDes - phiCur); }
    b3.getWorldPosition(vC); v1.subVectors(vC, vA).normalize(); v2.subVectors(vT, vA).normalize();
    if (v1.lengthSq() > .5 && v2.lengthSq() > .5) { qd.setFromUnitVectors(v1, v2); rotQ(b1, qd); }
  }
  const TOUCH = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'thigh_r', 'calf_r', 'foot_r', 'thigh_l', 'calf_l', 'foot_l'];
  function boneSet(rig) {
    if (rig._amB) return rig._amB;
    const b = rig.bones, AL = (window.COMBAT && COMBAT.ALIAS) || {};
    const find = n => { if (b[n]) return b[n]; const al = AL[n] || []; for (const x of al) if (b[x]) return b[x]; return null; };
    const B = {}; TOUCH.forEach(n => { B[n] = find(n); });
    B.list = TOUCH.map(n => B[n]).filter(Boolean); B.pre = B.list.map(() => new THREE.Quaternion()); B.post = B.list.map(() => new THREE.Quaternion());
    B.pvPre = new THREE.Vector3(); B.pvPost = new THREE.Vector3(); B.wrote = false; B.ok = !!(B.pelvis && B.upperarm_r && B.lowerarm_r && B.hand_r && B.thigh_r && B.calf_r && B.foot_r && B.upperarm_l && B.thigh_l);
    /* 칼: 쥔 손·날 축·날끝 축(손 좌표) */
    B.blades = {};
    (rig.swd || []).forEach(sw => { try {
      const obj = sw.obj, box = obj.parent, hand = box && box.parent; if (!hand) return; const side = hand === B.hand_l ? 'l' : 'r';
      obj.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), bb = new THREE.Box3();
      obj.traverse(o => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const g = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv); bb.union(g); } });
      if (bb.isEmpty()) return; const sz = bb.getSize(new THREE.Vector3()), ax = ['x', 'y', 'z'].sort((p, q) => sz[q] - sz[p]);
      const L = new THREE.Vector3(); L[ax[0]] = Math.abs(bb.max[ax[0]]) >= Math.abs(bb.min[ax[0]]) ? 1 : -1; const Ed = new THREE.Vector3(); Ed[ax[1]] = 1;
      box.updateMatrix(); obj.updateMatrix(); const M = box.matrix.clone().multiply(obj.matrix); L.transformDirection(M); Ed.transformDirection(M);
      B.blades[side] = { hand, L, E: Ed };
    } catch (e) { /* 칼 모양 못 읽음 — 날 방향 맞추기 생략 */ } });
    /* 고무 늘이기: 아래팔 길이 축 */
    ['r', 'l'].forEach(s => { const la = B['lowerarm_' + s], h = B['hand_' + s]; if (!la || !h) return; const p = h.position, ax = Math.abs(p.x) > Math.abs(p.y) ? (Math.abs(p.x) > Math.abs(p.z) ? 'x' : 'z') : (Math.abs(p.y) > Math.abs(p.z) ? 'y' : 'z');
      const e = new THREE.Vector3(); let best = 'x', bv = -1; ['x', 'y', 'z'].forEach(k => { e.set(0, 0, 0); e[k] = 1; e.applyQuaternion(h.quaternion); const v = Math.abs(e[ax]); if (v > bv) { bv = v; best = k; } }); B['str_' + s] = { ax, hax: best }; });
    return (rig._amB = B);
  }
  function restore(rig, B) {
    if (!B.wrote) return; B.wrote = false;
    for (let i = 0; i < B.list.length; i++) if (B.list[i].quaternion.equals(B.post[i])) B.list[i].quaternion.copy(B.pre[i]);
    if (B.pelvis && B.pelvis.position.equals(B.pvPost)) B.pelvis.position.copy(B.pvPre);
    if (B.scaled) { B.scaled.forEach(x => { if (x.o.scale.equals(x.post)) x.o.scale.copy(x.pre); }); B.scaled = null; } /* 늘인 만큼만 되돌림(다른 일꾼의 팔 크기 조절은 그대로) */
  }
  const P0r = new THREE.Vector3(), P0l = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), Sh = new THREE.Vector3(), Wb = new THREE.Vector3(), Ew = new THREE.Vector3(), Dw = new THREE.Vector3(), Tg = new THREE.Vector3();
  function target(root, Llen, spec, out, sideSign, aimU) { return out.copy(root).addScaledVector(Ft, spec[1] * Llen).addScaledVector(U, (spec[2] + (aimU || 0)) * Llen).addScaledVector(Rt, spec[3] * Llen * sideSign); }
  function dirOf(spec, sideSign, out) { return out.set(0, 0, 0).addScaledVector(Ft, spec[0]).addScaledVector(U, spec[1]).addScaledVector(Rt, spec[2] * sideSign).normalize(); }

  function applyE(rig, f, E, B, c) {
    const h = rig.holder; FW.set(1, 0, 0).applyQuaternion(h.quaternion); FW.y = 0; if (FW.lengthSq() < 1e-6) FW.set(1, 0, 0); FW.normalize(); R.crossVectors(FW, U).normalize(); P.crossVectors(U, FW).normalize();
    { B.thigh_r.getWorldPosition(vA); B.thigh_l.getWorldPosition(vB); const d = vA.sub(vB).dot(R); if (B.sR === undefined || Math.abs(d) > 1e-3) B.sR = d >= 0 ? 1 : -1; } /* 오른쪽 = 오른 넓적다리가 있는 쪽(엉덩이는 자세에 덜 틀어짐) */
    const sR = B.sR, big = c && c.big ? 1 + .15 * c.big : 1;
    for (let i = 0; i < B.list.length; i++) B.pre[i].copy(B.list[i].quaternion); B.pvPre.copy(B.pelvis.position); B.wrote = true;
    B.foot_r.getWorldPosition(P0r); B.foot_l.getWorldPosition(P0l);
    const Lleg = (B.thigh_r.getWorldPosition(vA).distanceTo(B.calf_r.getWorldPosition(vB)) + vB.distanceTo(B.foot_r.getWorldPosition(vC)));
    const Larm = (B.upperarm_r.getWorldPosition(vA).distanceTo(B.lowerarm_r.getWorldPosition(vB)) + vB.distanceTo(B.hand_r.getWorldPosition(vC)));
    const tr = E.tr;
    /* 골반 높이·앞뒤 */
    if (tr.dy || tr.dx) { const pv = B.pelvis; pv.getWorldPosition(tmp); tmp.addScaledVector(U, tr.dy * Lleg * .6).addScaledVector(FW, tr.dx * Lleg * .5); pv.parent.updateWorldMatrix(true, false); pv.position.copy(pv.parent.worldToLocal(tmp)); pv.updateMatrixWorld(true); }
    /* 회전(몸 전체) → 비틀기 → 숙임 → 옆 기울임 */
    const spin = tr.spin * sR;
    if (spin) rotA(B.pelvis, U, spin);
    Fb.copy(FW).applyAxisAngle(U, spin); Pb.crossVectors(U, Fb).normalize(); mU.crossVectors(Fb, U).normalize();
    const py = tr.py * sR * big;
    if (py) { rotA(B.pelvis, U, py * .3); rotA(B.spine_01, U, py * .2); rotA(B.spine_02, U, py * .25); rotA(B.spine_03, U, py * .25); }
    const sp = tr.sp * big; if (sp) { rotA(B.spine_01, Pb, sp * .3); rotA(B.spine_02, Pb, sp * .35); rotA(B.spine_03, Pb, sp * .35); }
    const sr = tr.sr * sR; if (sr) { rotA(B.spine_01, Fb, sr * .4); rotA(B.spine_02, Fb, sr * .3); rotA(B.spine_03, Fb, sr * .3); }
    /* 목표 방향 틀: sf=1 이면 몸과 함께 돎 */
    Ft.copy(FW).applyAxisAngle(U, spin * E.sf); Rt.crossVectors(Ft, U).normalize();
    /* 높이 맞춤(상대가 높거나 낮으면 겨누는 높이를 따라감) */
    let aim = 0; const tg = f && (f.target || f.faceT); if (tg && tg.pos && tg !== f) aim = clamp((tg.pos.y - f.pos.y) / Math.max(1, Larm * 2.2), -.45, .45);
    /* 다리 */
    ['r', 'l'].forEach(s => {
      const L = E.lim[s === 'r' ? 'rf' : 'lf'], th = B['thigh_' + s], ca = B['calf_' + s], ft = B['foot_' + s], P0 = s === 'r' ? P0r : P0l, sg = (s === 'r' ? 1 : -1) * sR;
      tmp2.copy(Ft).negate();
      if (L && L[0] > .002) { th.getWorldPosition(Sh); target(Sh, Lleg, L, Tg, sg, L[2] > -.6 ? aim * .5 : 0); if (E.plant) ik2(th, ca, ft, Tg, L[0], P0, tmp2); else ik2(th, ca, ft, Tg, L[0], null, tmp2); }
      else if (E.plant) ik2(th, ca, ft, P0, 1, null, tmp2);
    });
    /* 팔 */
    ['r', 'l'].forEach(s => {
      const L = E.lim[s === 'r' ? 'rh' : 'lh'], ua = B['upperarm_' + s], la = B['lowerarm_' + s], hd = B['hand_' + s], sg = (s === 'r' ? 1 : -1) * sR;
      if (!L || L[0] <= .002) return; ua.getWorldPosition(Sh); target(Sh, Larm, L, Tg, sg, L[2] > -.5 && E.kind !== 'sword' ? aim * .6 : aim * .3); ik2(ua, la, hd, Tg, L[0], null, U);
    });
    /* 칼날 방향 */
    ['r', 'l'].forEach(s => {
      const bd = B.blades[s], spec = E.bl[s], L = E.lim[s === 'r' ? 'rh' : 'lh']; if (!bd || !spec) return; const w = Math.min(1, (L ? L[0] : 0) * (E.blW == null ? 1 : E.blW) * 1.1); if (w < .02) return;
      const sg = (s === 'r' ? 1 : -1) * sR; dirOf(spec, sg, Dw);
      bd.hand.getWorldQuaternion(qa); Wb.copy(bd.L).applyQuaternion(qa).normalize();
      qd.setFromUnitVectors(Wb, Dw); qb.copy(qI).slerp(qd, w); rotQ(bd.hand, qb);
      if (c && c.m && c.m.bl[s]) { /* 날(edge)이 휘두르는 쪽을 향하게 */
        const u = c.u, a1 = evK(c.m.bl[s], Math.max(0, u - .04), [0, 0, 0]), a2 = evK(c.m.bl[s], Math.min(1, u + .04), [0, 0, 0]);
        dirOf(a1, sg, tmp); dirOf(a2, sg, tmp2); tmp2.sub(tmp);
        bd.hand.getWorldQuaternion(qa); Wb.copy(bd.L).applyQuaternion(qa).normalize(); Ew.copy(bd.E).applyQuaternion(qa);
        tmp2.addScaledVector(Wb, -tmp2.dot(Wb)); Ew.addScaledVector(Wb, -Ew.dot(Wb));
        if (tmp2.lengthSq() > 1e-4 && Ew.lengthSq() > 1e-4) { tmp2.normalize(); Ew.normalize(); const ang = Math.atan2(tmp.crossVectors(Ew, tmp2).dot(Wb), Ew.dot(tmp2)); rotA(bd.hand, Wb, ang * w * .85); }
      }
    });
    /* 양손 쥠: 왼손이 오른손 아래(칼자루)로 */
    if (E.two && B.hand_l) { const L = E.lim.rh, w = L ? L[0] * .9 : 0; if (w > .02) { B.hand_r.getWorldPosition(Tg); const bd = B.blades.r; if (bd) { bd.hand.getWorldQuaternion(qa); Wb.copy(bd.L).applyQuaternion(qa); Tg.addScaledVector(Wb, -Larm * .14); } ik2(B.upperarm_l, B.lowerarm_l, B.hand_l, Tg, w, null, U); } }
    /* 고무 늘이기(루피) */
    ['r', 'l'].forEach(s => { const v = s === 'r' ? E.str : E.strL, S = B['str_' + s]; if (!v || v < .01 || !S) return; const la = B['lowerarm_' + s], hd = B['hand_' + s]; const sc = B.scaled || (B.scaled = []); const e1 = { o: la, pre: la.scale.clone() }, e2 = { o: hd, pre: hd.scale.clone() }; la.scale[S.ax] *= 1 + v; hd.scale[S.hax] /= 1 + v; e1.post = la.scale.clone(); e2.post = hd.scale.clone(); sc.push(e1, e2); la.updateMatrixWorld(true); });
    for (let i = 0; i < B.list.length; i++) B.post[i].copy(B.list[i].quaternion); B.pvPost.copy(B.pelvis.position);
  }

  /* 매 화면: mocap 이 클립·자세를 다 놓은 뒤 덧입힘 */
  const progOf = (rig, c) => { const a = rig.act; if (!a || !a.getClip) return Math.min(1, (NOW() - c.t0) / .6); const d = a.getClip().duration || 1; const p = clamp(a.time / d, 0, 1); const hs = c.hs, h = c.m.h; return p < hs ? p / hs * h : h + (p - hs) / (1 - hs) * (1 - h); };
  function tick() {
    if (!MC.ready || !MC.on) return;
    const now = NOW();
    MC.rigs.forEach(rig => {
      if (!rig || rig.bad) return; const B = rig._amB || (rig.bones ? boneSet(rig) : null); if (!B || !B.ok) return;
      restore(rig, B);
      const a = rig._amS; if (!a || !rig.holder.visible) return;
      const f = findF(rig);
      let E = null;
      if (a.cur && AM.on) {
        if (!ATK.test(rig.state || '')) { release(rig, a); }
        else {
          a.cur.u = AM.pinU != null ? AM.pinU : progOf(rig, a.cur); const cur = evalAt(rig, a.cur, a.cur.u);
          const k = Math.min(1, (now - a.fadeT0) / a.cur.fade);
          E = k < 1 ? blend(a.prev ? a.prev.E : null, cur, ease(k)) : cur;
          if (a.cur.u >= .999) { a.lastEnd = now; }
        }
      }
      if (!E && a.prev && a.relFade) { const k = (now - a.fadeT0) / a.relFade; if (k < 1) E = blend(a.prev.E, null, ease(k)); else { a.prev = null; a.relFade = 0; } }
      if (!E && rig.ch && rig.ch.key === 'sanji' && AM.on && AM.pocketIdle !== false && /^(Idle|CombatStance|Walk|Run|Block|Taunt)$/.test(rig.state || '')) {
        E = { tr: { py: 0, sp: 0, sr: 0, spin: 0, dy: 0, dx: 0 }, lim: { rh: [.85].concat(POCKET), lh: [.85].concat(POCKET) }, bl: {}, str: 0, strL: 0, sf: 0, plant: false, kind: 'kick', side: 'r' };
      }
      if (!E) return;
      try { applyE(rig, f, E, B, a.cur); } catch (er) { AM.st.errors++; if (AM.st.errors < 5) console.error('[attack-moves]', er); }
    });
  }
  function findF(rig) { const L = typeof F !== 'undefined' ? F : []; for (let i = 0; i < L.length; i++) if (L[i].ch === rig.ch) return L[i]; return null; }
  if (typeof camUpdate === 'function') {
    const _cu = camUpdate;
    camUpdate = function () { const r = _cu.apply(this, arguments); try { if (AM.on || AM._wasOn) tick(); AM._wasOn = AM.on; } catch (e) { AM.st.errors++; if (AM.st.errors < 5) console.error('[attack-moves]', e); } return r; }; /* eslint-disable-line no-global-assign */
  }
  /* 시험용: 줄 세우기(MOCAP.lineup)에서 특정 동작 반복 재생 — ATTACK_MOVES.testPlay('luffy', 'pistol_r') */
  AM.testPlay = (key, id, state) => { const rig = MC.rigs.get(key), m = byId[id]; if (!rig || rig.bad || !m) return false; const a = rigState(rig); a.cur = { m, state: state || 'AttackCombo', t0: NOW(), u: 0, big: 0, hs: HS[state || 'AttackCombo'], fade: .1 }; a.fadeT0 = NOW() - 1; a.prev = null; rig.amOwn = true; return true; };
  AM.count = list.length;
  AM._test = { situation, kindsFor, allowed, score, choose, rigState }; // 검증기(tools/validate-arena.mjs)용 — 런타임 동작과 무관
  AM.summary = () => ({ moves: list.length, chains: AM.CHAINS.length, kinds: list.reduce((o, m) => (o[m.kind] = (o[m.kind] || 0) + 1, o), {}) });
  AM.setOn = v => { AM.on = !!v; try { localStorage.setItem('arenaAttackMoves', v ? '1' : '0'); } catch (e) { /* 저장 안 됨 */ } return AM.on; };
})();
