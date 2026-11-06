// 전투 판정 층(물리와 별개): 공격 구간(Wind-up 준비 · Active 적중 · Recovery 회복), Hitbox(공격 부위)·Hurtbox(머리·몸통·팔·다리) 분리 판정,
// 적중 시점 동기화(Animation Event — mocap.js 가 COMBAT.animEvent 를 부르면 그 시점, 없으면 동작 진행률 기준),
// 피격 반응을 기능별로 따로: Hitstop(잠깐 멈춤) · Hitstun(경직) · Recoil(막혔을 때 반동) · Knockback(밀려남) · Stagger(체간 무너짐) · Impulse(머리카락·옷자락 스프링),
// 쓰러짐(KO/다운): 간이 래그돌(몸이 맞은 방향으로 넘어지는 강체 회전 + 관절 힘 빼기, 바닥에서 튕김) → 일어나기.
// 근접 공격만 판정한다. 기술 투사체·광역기는 기존 기술 코드의 맞힘 판정을 그대로 쓴다(통과 집계).
(function () {
  if (typeof F === 'undefined' || typeof resolve !== 'function' || typeof apply !== 'function') return;
  const CB = window.COMBAT = { enabled: true, pend: [], ms: 0, msMax: 0, stopT: 0,
    st: { melee: 0, contact: 0, whiff: 0, pass: 0, outActive: 0, sameTeam: 0, stunCancel: 0, lunges: 0, downs: 0, staggers: 0, recoils: 0, parts: { head: 0, torso: 0, arm: 0, leg: 0 }, dirs: { front: 0, back: 0, side: 0 }, bones: { hand: 0, foot: 0, sword: 0, chest: 0 }, events: 0, evCut: 0, ko: 0, slip: 0 },
    reset() { const s = CB.st; Object.keys(s).forEach(k => { if (typeof s[k] === 'number') s[k] = 0; else Object.keys(s[k]).forEach(j => s[k][j] = 0); }); CB.msMax = 0; } };
  // 이벤트 버스(고도화 층 storm-combat.js 등이 구독): CB.on(이벤트, fn) — contact/clash/result
  const EV = {};
  CB.on = function (ev, fn) { (EV[ev] || (EV[ev] = [])).push(fn); return () => { EV[ev] = EV[ev].filter(x => x !== fn); }; };
  const emit = function (ev, d) { (EV[ev] || []).forEach(fn => { try { fn(d); } catch (e) { console.error('COMBAT ev', ev, e); } }); };
  CB.emitEv = emit;
  // storm-combat.js 등이 접는 사거리 배율 훅(차크라 대시 부스트)
  CB.lungeMul = null;

  // ── 프레임 데이터(초) ── w 준비 · a 적중 구간 · r 회복 · hb 판정 반지름(키 대비) · hs 경직 · kb 넉백 · po 체간 피해 · stop 멈춤
  const FD = {
    jab: { w: .06, a: .09, r: .14, hb: .085, hs: .16, kb: .55, po: 8, stop: .035, bone: 'hand' },
    straight: { w: .09, a: .09, r: .18, hb: .09, hs: .22, kb: .9, po: 12, stop: .05, bone: 'hand' },
    hook: { w: .09, a: .09, r: .2, hb: .075, hs: .24, kb: .8, po: 13, stop: .05, bone: 'hand', side: 1 },
    upper: { w: .11, a: .09, r: .24, hb: .075, hs: .3, kb: 1, po: 16, stop: .06, bone: 'hand', up: 1 },
    palm: { w: .1, a: .09, r: .2, hb: .085, hs: .24, kb: 1.3, po: 14, stop: .05, bone: 'hand' },
    shoulder: { w: .1, a: .1, r: .22, hb: .11, hs: .26, kb: 1.4, po: 16, stop: .05, bone: 'chest' },
    kick: { w: .12, a: .1, r: .24, hb: .08, hs: .26, kb: 1.1, po: 16, stop: .055, bone: 'foot' },
    heavy: { w: .16, a: .1, r: .3, hb: .09, hs: .34, kb: 1.6, po: 26, stop: .075, bone: 'foot', knock: .35 },
    sweep: { w: .12, a: .1, r: .28, hb: .09, hs: .3, kb: .6, po: 18, stop: .05, bone: 'foot', low: 1, knock: .8 },
    cut: { w: .1, a: .1, r: .24, hb: .055, hs: .24, kb: 1, po: 16, stop: .055, bone: 'sword' },
    thrust: { w: .09, a: .09, r: .22, hb: .05, hs: .22, kb: 1.1, po: 14, stop: .05, bone: 'sword' },
  };
  const POSEK = { punch: 'straight', punchL: 'jab', palm: 'palm', elbow: 'hook', uppercut: 'upper', shoulder: 'shoulder', kick: 'kick', highKick: 'heavy', axe: 'heavy', jumpKnee: 'heavy', sweep: 'sweep',
    slash: 'cut', k_kesa: 'cut', k_yoko: 'cut', k_upCut: 'cut', spreadSlash: 'cut', twoHandSword: 'cut', swordDown: 'cut', k_iaiCut: 'cut', iaiEnd: 'cut', k_dualOpen: 'cut', k_tsuki: 'thrust' };
  const PREP = { punchPrep: 'straight', kickPrep: 'kick', slashPrep: 'cut', iai: 'cut' };
  CB.FD = FD; CB.POSEK = POSEK;
  // 세계관 행동 자료(데이터 기반): 돌진 속도 · 넉백 · 경직 · 연속기 확률
  const PROF = { naruto: { lunge: 1.25, kb: 1, hs: 1, combo: .22 }, onepiece: { lunge: 1.05, kb: 1.25, hs: 1.05, combo: .12 }, bleach: { lunge: 1.7, kb: 1, hs: 1, combo: .15, blink: 1 },
    opm: { lunge: 2.2, kb: 1.5, hs: 1.15, combo: .08, blink: 1 }, kimetsu: { lunge: 1.35, kb: .95, hs: 1, combo: .32 } };
  const KEYP = { saitama: { kb: 2.2, hs: 1.3 }, kenpachi: { kb: 1.5 }, himejima: { kb: 1.6 }, gai: { lunge: 1.6, combo: .3 }, zenitsu: { lunge: 2.4, blink: 1 } };
  const prof = f => { const w = (f.ch && f.ch.world) || f.team; const p = Object.assign({ lunge: 1, kb: 1, hs: 1, combo: .1 }, PROF[w], KEYP[f.ch && f.ch.key]); return p; };
  CB.prof = prof; CB.PROF = PROF; CB.KEYP = KEYP; // 새 세계관 파일(world-aot·jjk)이 행동 자료를 더할 수 있게

  // ── 뼈 위치(모션 캡처 인물이 보이면 그 뼈, 아니면 기존 모형 뼈) ──
  const T = [], tv = () => T.pop() || new THREE.Vector3(), give = (...vs) => vs.forEach(v => T.push(v));
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
  const rigOf = f => { const M = window.MOCAP; if (!M || !M.ready || !M.on || !f.ch) return null; const r = M.rigs.get(f.ch.key); return r && !r.bad && r.holder && r.holder.visible ? r : null; };
  const H = f => 34 * MS * (f.scale || 1);
  const rad = f => 2.1 * (f.scale || 1) * (f.bulk || 1); // physics.js 캡슐 반지름과 같은 식
  const wp = (o, out, x = 0, y = 0, z = 0) => { o.updateWorldMatrix(true, false); return out.set(x, y, z).applyMatrix4(o.matrixWorld); };
  // 뼈 찾기: 이름 별칭 표(UE/UAL·Mixamo·MPFB(MakeHuman)·Blender Rigify) → 대소문자·기호 무시 비교 → 정규식 순. 몸 모형이 바뀌어도 판정이 동작하게.
  const AL = { pelvis: ['pelvis', 'Hips', 'hips', 'DEF-spine', 'root', 'spine_01', 'spine01'], neck: ['neck_01', 'Neck', 'neck', 'neck01', 'DEF-spine.004', 'DEF-spine.005', 'spine_03', 'Spine2', 'spine03', 'chest'], head: ['Head', 'head', 'DEF-spine.006'],
    upperarm_r: ['upperarm_r', 'RightArm', 'upperarm01.R', 'upper_arm.R', 'UpperArm_R'], lowerarm_r: ['lowerarm_r', 'RightForeArm', 'lowerarm01.R', 'forearm.R', 'LowerArm_R'], hand_r: ['hand_r', 'RightHand', 'wrist.R', 'hand.R', 'Hand_R'],
    thigh_r: ['thigh_r', 'RightUpLeg', 'upperleg01.R', 'thigh.R', 'UpperLeg_R'], calf_r: ['calf_r', 'RightLeg', 'lowerleg01.R', 'shin.R', 'LowerLeg_R'], foot_r: ['foot_r', 'RightFoot', 'foot.R', 'Foot_R'], ball_r: ['ball_r', 'RightToeBase', 'toe1-1.R', 'toes.R', 'toe.R'] };
  Object.keys(AL).filter(k => k.endsWith('_r')).forEach(k => { AL[k.slice(0, -2) + '_l'] = AL[k].map(s => s.replace(/_r$/, '_l').replace(/Right/, 'Left').replace(/\.R$/, '.L').replace(/_R$/, '_L')); });
  const RX = { head: /head$/i, pelvis: /pelvis|hips/i, neck: /neck/i };
  ['r', 'l'].forEach(s => { const S = s === 'r' ? 'right' : 'left', E = '[._ ]?' + s + '$';
    RX['hand_' + s] = new RegExp('(' + S + '.*hand|hand' + E + '|wrist' + E + ')', 'i'); RX['lowerarm_' + s] = new RegExp('(' + S + '.*fore|forearm' + E + '|lowerarm.*' + E + ')', 'i');
    RX['upperarm_' + s] = new RegExp('(' + S + '.*arm$|upperarm.*' + E + '|upper_arm' + E + ')', 'i'); RX['thigh_' + s] = new RegExp('(' + S + '.*upleg|thigh' + E + '|upperleg.*' + E + ')', 'i');
    RX['calf_' + s] = new RegExp('(' + S + 'leg$|calf' + E + '|shin' + E + '|lowerleg.*' + E + ')', 'i'); RX['foot_' + s] = new RegExp('(' + S + '.*foot|foot' + E + ')', 'i'); RX['ball_' + s] = new RegExp('(' + S + '.*toe|toe.*' + E + '|ball' + E + ')', 'i'); });
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  function boneOf(r, key) {
    const C = r._cbBones || (r._cbBones = {}); if (key in C) return C[key];
    const names = AL[key] || [key], keys = Object.keys(r.bones); let b = null;
    for (const nm of names) if (r.bones[nm]) { b = r.bones[nm]; break; }
    if (!b) { const M = r._cbNorm || (r._cbNorm = Object.fromEntries(keys.map(k => [norm(k), k]))); for (const nm of names) { const k = M[norm(nm)]; if (k) { b = r.bones[k]; break; } } }
    if (!b && RX[key]) { const k = keys.find(k => RX[key].test(k)); if (k) b = r.bones[k]; }
    return (C[key] = b);
  }
  const _bc = new THREE.Vector3();
  const bodyC = (f, out) => { const r = rigOf(f), pv = r && boneOf(r, 'pelvis'); if (pv) { wp(pv, _bc); out.x = _bc.x; out.z = _bc.z; } else { out.x = f.pos.x; out.z = f.pos.z; } return out; };
  CB.bodyC = bodyC;
  CB.ALIAS = AL; CB.boneReport = r => Object.fromEntries(Object.keys(AL).map(k => { const b = boneOf(r, k); return [k, b ? b.name : null]; }));
  const bn = (r, ...keys) => { for (const k of keys) { const b = boneOf(r, k); if (b) return b; } return null; };
  // 다친 부위 판정용 몸 조각(선분 + 반지름)
  function hurtSegs(f, out) {
    out.length = 0; const h = H(f), bk = f.bulk || 1, r = rigOf(f), m = f.model;
    if (r) {
      const seg = (n1, n2, rad, part) => { const A = bn(r, ...n1), B = bn(r, ...n2); if (A && B) out.push({ a: wp(A, tv()), b: wp(B, tv()), r: rad, part }); };
      seg(['pelvis'], ['neck'], .13 * h * bk, 'torso');
      const hd = bn(r, 'head'); if (hd) { const c = wp(hd, tv()); out.push({ a: c, b: tv().copy(c).add(_a.set(0, .06 * h, 0)), r: .075 * h, part: 'head' }); }
      for (const s of ['r', 'l']) { seg(['upperarm_' + s], ['lowerarm_' + s], .045 * h, 'arm'); seg(['lowerarm_' + s], ['hand_' + s], .04 * h, 'arm'); seg(['thigh_' + s], ['calf_' + s], .06 * h, 'leg'); seg(['calf_' + s], ['foot_' + s], .05 * h, 'leg'); }
      if (out.length >= 4) return out; out.forEach(s => give(s.a, s.b)); out.length = 0;
    }
    if (!m || !m.torso) return out;
    const up = a => a && (a.isObject3D ? a : a.up);
    out.push({ a: wp(m.torso, tv(), 0, -1, 0), b: wp(m.torso, tv(), 0, 11.5, 0), r: .13 * h * bk, part: 'torso' });
    if (m.head) { const c = wp(m.head, tv(), 0, 3, 0); out.push({ a: c, b: tv().copy(c).add(_a.set(0, .05 * h, 0)), r: .075 * h, part: 'head' }); }
    for (const A of [m.aF, m.aB]) { const u = up(A); if (!u || !A.fore) continue; out.push({ a: wp(u, tv()), b: wp(A.fore, tv()), r: .045 * h, part: 'arm' }); out.push({ a: wp(A.fore, tv()), b: wp(A.fore, tv(), 0, -7, 0), r: .04 * h, part: 'arm' }); }
    for (const L of [m.legF, m.legB]) { const k = L && L.userData.knee; if (!k) continue; out.push({ a: wp(L, tv()), b: wp(k, tv()), r: .06 * h, part: 'leg' }); out.push({ a: wp(k, tv()), b: wp(k, tv(), .8, -6.6, 0), r: .05 * h, part: 'leg' }); }
    return out;
  }
  // 공격 판정 점들(구 여러 개: 주먹·발·칼날을 따라)
  function hitPts(f, k, out) {
    out.length = 0; const fd = FD[k], h = H(f), r = rigOf(f), m = f.model, rad = fd.hb * h;
    let bone = fd.bone; if (bone === 'sword' && !(m && m.swd && m.swd.grp && m.swd.grp.visible)) bone = 'hand';
    if (r && r.amBone) bone = r.amBone === 'sword' && bone !== 'sword' ? (m && m.swd && m.swd.grp && m.swd.grp.visible ? 'sword' : 'hand') : r.amBone; /* attack-moves.js: 고른 동작의 판정 부위 */
    else if (r) { if (r.state === 'Kick') bone = 'foot'; else if (r.state === 'SwordCombo' && bone !== 'hand') bone = 'sword'; else if (bone === 'foot') bone = 'hand'; } // 실제로 보이는 동작 기준: 차기 상태=발, 그 밖 주먹 클립=손
    CB._bone = bone;
    if (bone === 'sword') {
      // 칼날 판정: 쥔 손에서 몸 앞쪽으로 칼 길이만큼(휘두르는 범위 근사 — 모형마다 칼 축 방향이 달라 손·몸 방향 기준으로 통일)
      const L = ((m.swd.sp && m.swd.sp.L) || 13) * MS * (f.scale || 1), hb = r && bn(r, 'hand_r', 'hand_l'), hp = hb ? wp(hb, tv()) : wp(m.aF.fore, tv(), 0, -7, 0);
      const fx = Math.cos(f.heading), fz = Math.sin(f.heading);
      for (let i = 0; i < 4; i++) { const u = .25 + i * .25; out.push({ p: tv().set(hp.x + fx * L * u, hp.y, hp.z + fz * L * u), r: rad + .6 }); }
      give(hp); return out;
    }
    if (r) {
      const names = bone === 'hand' ? ['hand_r', 'hand_l'] : bone === 'foot' ? (r.amSide === 'l' && r.amBone === 'foot' ? ['foot_l', 'ball_l', 'calf_l'] : ['foot_r', 'ball_r', 'calf_r']) : ['spine_03'];
      names.forEach(n => { const b = boneOf(r, n === 'spine_03' ? 'neck' : n); if (b) out.push({ p: wp(b, tv()), r: rad }); });
      if (out.length) return out;
    }
    if (!m) return out;
    if (bone === 'hand') { if (m.aF && m.aF.fore) out.push({ p: wp(m.aF.fore, tv(), 0, -7, 0), r: rad }); if (m.aB && m.aB.fore) out.push({ p: wp(m.aB.fore, tv(), 0, -7, 0), r: rad }); }
    else if (bone === 'foot') { for (const L of [m.legF, m.legB]) { const kn = L && L.userData.knee; if (kn) out.push({ p: wp(kn, tv(), .8, -6.6, 0), r: rad }); } }
    else if (m.torso) out.push({ p: wp(m.torso, tv(), 2, 9, 0), r: rad });
    return out;
  }
  const segDist = (p, a, b) => { _c.subVectors(b, a); const l2 = _c.lengthSq(); let u = l2 > 1e-6 ? _d.subVectors(p, a).dot(_c) / l2 : 0; u = Math.max(0, Math.min(1, u)); return _e.copy(a).addScaledVector(_c, u).distanceTo(p); };
  const HS = [], HP = [];
  // 접촉 검사 → {part, p} 또는 null
  function contact(a, b, k, prev) {
    hitPts(a, k, HP); hurtSegs(b, HS); let best = null, bd = 1e9;
    const nCur = HP.length; if (prev && prev.length === nCur) for (let i = 0; i < nCur; i++) HP.push({ p: tv().copy(HP[i].p).add(prev[i]).multiplyScalar(.5), r: HP[i].r });
    if (prev) { for (let i = 0; i < nCur; i++) { if (!prev[i]) prev[i] = new THREE.Vector3(); prev[i].copy(HP[i].p); } prev.length = nCur; }
    for (const h of HP) for (const s of HS) { const d = segDist(h.p, s.a, s.b) - s.r - h.r; if (d < 0 && d < bd) { bd = d; best = { part: s.part, p: h.p.clone() }; } }
    HP.forEach(h => give(h.p)); HS.forEach(s => give(s.a, s.b)); HP.length = HS.length = 0;
    return best;
  }
  // 진단용: 판정 점 ↔ 상대 몸 최단 틈(반지름 뺀 값)과 공격 점의 수평 도달 거리
  function gapOf(a, b, k) { hitPts(a, k, HP); hurtSegs(b, HS); let g = 1e9, reach = 0; for (const h of HP) { reach = Math.max(reach, Math.hypot(h.p.x - a.pos.x, h.p.z - a.pos.z)); for (const s of HS) g = Math.min(g, segDist(h.p, s.a, s.b) - s.r - h.r); } HP.forEach(h => give(h.p)); HS.forEach(s => give(s.a, s.b)); HP.length = HS.length = 0; return { g, reach }; }
  CB.diag = []; CB.diagOn = false;
  // 판정 점이 상대 쪽을 향하는 정도(가슴→판정 점 방향 · 가슴→상대 방향, 수평): 1 = 정면으로 향함, 0 이하 = 옆·뒤
  function dirDot(a, b, k) { hitPts(a, k, HP); if (!HP.length) return 0; let best = -1; const cx = a.pos.x, cz = a.pos.z, tx = b.pos.x - cx, tz = b.pos.z - cz, tl = Math.hypot(tx, tz) || 1; for (const h of HP) { const hx = h.p.x - cx, hz = h.p.z - cz, hl = Math.hypot(hx, hz) || 1; best = Math.max(best, (hx * tx + hz * tz) / (hl * tl)); } HP.forEach(h => give(h.p)); HP.length = 0; return best; }
  CB.dirDot = dirDot;
  function diagEnd(p, out, why) { if (!CB.diagOn || CB.diag.length > 2000) return; const d0 = p.d0 || {}; CB.diag.push({ k: p.k, bone: p.bone0 || CB._bone, out, why, gap0: d0.g, need0: d0.need, ang0: d0.ang, vb0: d0.vb, dy0: d0.dy, dir0: d0.dir, gapMin: p.gMin, reachMax: p.rMax, waitF: p.waitF || 0, dist0: +(p.dist0 || 0).toFixed(1), distEnd: +Math.hypot(p.a.pos.x - p.b.pos.x, p.a.pos.z - p.b.pos.z).toFixed(1), lunged: !!p.lunged, ev: !!(p.atk && p.atk.evT), t: +p.t.toFixed(2) }); }
  CB.contact = contact; CB.hitPts = hitPts; CB.hurtSegs = hurtSegs; // 점검용

  // ── 공격 상태(Wind-up → Active → Recovery) ──
  const kindFor = (f, k) => { const sw = f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible; if (sw && /jab|straight|hook|palm/.test(k)) return Math.random() < .25 ? 'thrust' : 'cut'; return k; };
  function setAtk(f, ph, k) { f.atk = { k, fd: FD[k], ph, t: 0, ev: false }; }
  // 모션 캡처 클립 진행률 기준 적중 구간(애니메이션 이벤트 대체)
  const CLIPWIN = { Punch_Jab: [.28, .55], Punch_Cross: [.3, .58], Sword_Attack: [.32, .62] };
  const PEAK = CB.peak = {}; // 클립 이름(차기는 종류까지) → { p: 최고 속도 진행률(평균), n: 잰 횟수 }
  const clipKey = r => { const c = r.act && r.act.getClip && r.act.getClip(); if (!c || !/^(AttackCombo|Heavy|SwordCombo|Kick)$/.test(r.state)) return null; return r.amId ? r.state + ':' + r.amId : r.state === 'Kick' ? 'Kick:' + (r.kickT || '') : c.name; }; /* attack-moves.js: 동작마다 적중 최고 속도 시점을 따로 익힘 */
  const clipProg = r => { const c = r.act.getClip(); return c.duration > 0 ? Math.max(0, Math.min(1, r.act.time / c.duration)) : 0; };
  const _hp = new THREE.Vector3();
  function trackPeak(f, dt) {
    const r = rigOf(f), at = f.atk; if (!r || !at || dt <= 0) { f._pk = null; return; }
    const key = clipKey(r); if (!key) { f._pk = null; return; }
    const pr = clipProg(r); hitPts(f, at.k, HP); if (!HP.length) return; _hp.copy(HP[0].p); HP.forEach(h => give(h.p)); HP.length = 0;
    let s = f._pk; if (!s || s.key !== key || pr < s.lastP - .3) { if (s && s.best > 0 && s.lastP > .5) { const P = PEAK[s.key] || (PEAK[s.key] = { p: s.bestP, n: 0 }); P.p += (s.bestP - P.p) * (P.n ? .3 : 1); P.n++; } s = f._pk = { key, best: 0, bestP: 0, lastP: pr, prev: _hp.clone() }; return; }
    const v = _hp.distanceTo(s.prev) / dt; s.prev.copy(_hp); if (v > s.best && pr > .05) { s.best = v; s.bestP = pr; } s.lastP = pr;
  }
  function activeNow(f) {
    const at = f.atk; if (!at) return false;
    const r = rigOf(f);
    if (r && window.mocapOn) { const key = clipKey(r), P = key && PEAK[key]; if (P && P.n >= 2) { const pr = clipProg(r); if (pr >= P.p - .1 && pr <= P.p + .14) return true; if (!at.evT) return false; } }
    if (r && window.mocapOn) { if (at.evT) return CB.simT - at.evT <= (at.fd.a + .2); if (at.t < .4) return false; return at.t < .4 + at.fd.a + .12; } // 이벤트 기다림(0.4초 넘으면 시간 기준 예비 구간)
    if (r && r.act && r.act.getClip) { const c = r.act.getClip(), w = CLIPWIN[c.name]; if (w && c.duration > 0) { const pr = (r.act.time % c.duration) / c.duration; if (at.ev || (pr >= w[0] && pr <= w[1])) return true; } }
    return at.ph === 'active'; // 클립 진행률 구간 또는 동작 시작 기준 적중 구간
  }
  CB.activeNow = activeNow;
  // mocap.js 가 클립의 적중 순간에 부르는 훅(있으면 진행률보다 우선)
  CB.animEvent = (f, name) => { if (name === 'hit' && f && f.atk) { f.atk.ev = true; f.atk.evT = CB.simT || 1e-6; f.atk.ph = 'active'; f.atk.t = 0; CB.st.events++; } };
  if (window.mocapOn) mocapOn('hit', e => { if (e && e.f && !e.cut) CB.animEvent(e.f, 'hit'); else if (e && e.cut) CB.st.evCut = (CB.st.evCut || 0) + 1; });

  const _apply = apply;
  apply = function (f, s, d) {
    const r = _apply.apply(this, arguments);
    if (!CB.enabled || !f || !s) return r;
    const p = s.pose;
    if (f.stun > 0 || f.down) { if (f.atk) f.atk = null; return r; }
    if (PREP[p]) setAtk(f, 'windup', kindFor(f, PREP[p]));
    else if (POSEK[p]) { const k = f.atk && f.atk.ph === 'windup' ? f.atk.k : kindFor(f, POSEK[p]); setAtk(f, 'active', k); }
    return r;
  };

  // ── 결과를 맞는 순간 판단(brain.js)으로 넘기기 전에, 실제 몸이 닿았는지 확인 ──
  let lastOut = null;
  const _wound = wound; wound = function () { lastOut = 'hit'; return _wound.apply(this, arguments); };
  const _clash = clash; clash = function (a, b, t, blk) { if (lastOut === null) lastOut = 'block'; return _clash.apply(this, arguments); };
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw = 1, at) {
    if (!CB.enabled || !a || !b || a === b || !F.includes(a) || !F.includes(b)) return _res.apply(this, arguments);
    if (a.team && b.team && a.team === b.team) { CB.st.sameTeam++; return; } // 같은 팀은 맞히지 않음
    const near = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 45;
    const melee = !at && near && a.atk && (a.atk.ph === 'windup' || a.atk.ph === 'active');
    if (!melee) { CB.st.pass++; return _res.apply(this, arguments); }
    if (a.stun > 0 || a.down) { CB.st.stunCancel++; return; } // 경직·다운 중에는 공격이 나가지 않음
    CB.st.melee++;
    CB.pend.push({ a, b, ek, o, nm, pw, t: 0, k: a.atk.k, ctx: this, atk: a.atk, dist0: Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z), at0: a.atk.t });
  };
  function land(p) {
    const a = p.a, fd = FD[p.k], pr = prof(a);
    if (!activeNow(a)) { p.waitF = (p.waitF || 0) + 1; return false; } // 적중 구간 밖에서는 판정하지 않음(구간이 열릴 때까지 대기)
    if (CB.diagOn) { const gr = gapOf(a, p.b, p.k); p.bone0 = p.bone0 || CB._bone; if (!p.d0) { const dx = p.b.pos.x - a.pos.x, dz = p.b.pos.z - a.pos.z; let dh = Math.atan2(dz, dx) - a.heading; dh = Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh))); p.d0 = { g: +gr.g.toFixed(2), need: +(Math.hypot(dx, dz) - .13 * H(p.b) * (p.b.bulk || 1)).toFixed(2), ang: +(dh * 57.3).toFixed(0), vb: +(p.b._spd || 0).toFixed(0), dy: +(p.b.pos.y - a.pos.y).toFixed(1), dir: +dirDot(a, p.b, p.k).toFixed(2) }; }
      p.gMin = Math.min(p.gMin == null ? 1e9 : p.gMin, +gr.g.toFixed(2)); p.rMax = Math.max(p.rMax || 0, +gr.reach.toFixed(2)); }
    let c = contact(a, p.b, p.k, p.prev || (p.prev = []));
    if (!c) { // 판정 경로에 다른 적(다른 팀)이 끼어 있으면 그 인물이 맞음(난전)
      for (const o of F) { if (o === a || o === p.b || (a.team && o.team === a.team) || Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z) > 16) continue; const c2 = contact(a, o, p.k); if (c2) { CB.st.hitOther = (CB.st.hitOther || 0) + 1; p.b = o; c = c2; break; } }
      if (!c) return false;
    }
    const b = p.b;
    { const md = Math.hypot(c.p.x - b.pos.x, c.p.z - b.pos.z); CB.st.meleeFx = (CB.st.meleeFx || 0) + 1; if (md > 9) CB.st.meleeAir = (CB.st.meleeAir || 0) + 1; } // 근접 적중 이펙트 위치(접촉점)가 맞은 몸에서 먼지 확인
    CB.st.contact++; CB.st.parts[c.part]++; CB.st.bones[CB._bone] = (CB.st.bones[CB._bone] || 0) + 1; if (!activeNow(a)) CB.st.outActive++; // 검증: 적중 구간 밖 적중(0 이어야 함)
    // 맞은 방향(맞는 쪽 기준 앞·뒤·옆)
    const fw = _a.set(Math.cos(b.heading), 0, Math.sin(b.heading)), from = _b.subVectors(a.pos, b.pos).setY(0).normalize(), dot = fw.dot(from);
    const dir = dot > .5 ? 'front' : dot < -.4 ? 'back' : 'side'; CB.st.dirs[dir]++;
    b.hitPart = c.part; b.hitDir = dir; b.hitKind = p.k; // mocap.js 가 피격 클립 고를 때 쓸 수 있는 값
    if (CB.preLand && CB.preLand(p, c)) { diagEnd(p, 'sub', 'substituted'); emit('result', { a, b, k: p.k, out: 'sub', part: c.part, dir }); return true; } // storm-combat.js: 맞기 직전 바꿔치기(대타) — 피해 없이 통과
    lastOut = null; const stunBefore = b.stun || 0, kb0x = b.kb.x, kb0z = b.kb.z;
    _res.call(p.ctx, a, b, p.ek, p.o, p.nm, p.pw, c.p);
    if (lastOut === 'hit') { b.kb.x = kb0x + (b.kb.x - kb0x) * .55; b.kb.z = kb0z + (b.kb.z - kb0z) * .55; } // 넉백 정리: 근접 적중은 기존 무작위 넉백을 줄이고 공격 자료(knock)의 방향 넉백을 씀 — 상대가 너무 멀리 날아가 다음 연타가 헛치던 원인
    const out = lastOut; lastOut = null;
    const kd = _c.subVectors(b.pos, a.pos).setY(0); if (kd.lengthSq() < .01) kd.set(1, 0, 0); kd.normalize();
    if (out === 'hit') {
      hitstop(fd.stop * (p.pw > 1.3 ? 1.5 : 1));
      hitstun(b, fd.hs * pr.hs * (c.part === 'head' ? 1.2 : 1), stunBefore);
      knock(b, kd, fd.kb * pr.kb * p.pw, fd.up);
      impulse(b, kd, 1 + fd.kb);
      react(b, c.part, dir, fd);
      if (stagger(b, fd.po * p.pw) || (fd.knock && Math.random() < fd.knock) || (b.air && fd.kb * pr.kb * p.pw > 1.4)) knockDown(b, kd, fd.kb * pr.kb * p.pw);
      combo(a, b, pr);
    } else if (out === 'block') { recoil(a, kd); hitstop(fd.stop * .6); impulse(b, kd, .5); contactFx(a, b, c.p, toolOf(CB._bone, a), swd(b) ? '검' : (c.part === 'leg' ? '발' : '손'), false); }
    emit('result', { a, b, k: p.k, out, part: c.part, dir, pw: p.pw });
    return true;
  }
  // ── 실제 접촉(막힘·맞부딪힘) 연출: 반드시 접촉점에서 ──
  CB.st.ctype = {}; CB.st.airFx = 0; CB.st.fxN = 0;
  const swd = f => !!(f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  const toolOf = (bone, f) => bone === 'sword' ? '검' : bone === 'foot' ? '발' : bone === 'chest' ? '몸통' : (swd(f) ? '검' : '손');
  function contactFx(a, b, p, ta, tb, mutual) {
    const key = ta + '-' + tb; CB.st.ctype[key] = (CB.st.ctype[key] || 0) + 1;
    { const md = Math.min(Math.hypot(p.x - a.pos.x, p.z - a.pos.z), Math.hypot(p.x - b.pos.x, p.z - b.pos.z)); CB.st.meleeFx = (CB.st.meleeFx || 0) + 1; if (md > 9) CB.st.meleeAir = (CB.st.meleeAir || 0) + 1; } // 근접 접촉 이펙트가 두 몸에서 멀리 터지면 집계(빈 공중)
    try {
      if (ta === '검' && tb === '검') { // 칼날끼리: 불꽃·금속 섬광 → 잠깐 힘겨루기(코등이 싸움) → 튕겨남
        burst(p, 26, ['#ffffff', '#fff2a0', '#ffd040', '#ffa020'], 2.6, 160, 1.4); light(p, '#fff0c0', 5); if (window.FX3 && FX3.shock) FX3.shock(p, dirTo(a, b), 5, '#fff6d0', .25);
        if (mutual || Math.random() < .5) { CB.st.lock = (CB.st.lock || 0) + 1; const m = a.pos.clone().lerp(b.pos, .5); [a, b].forEach(x => { x.stun = Math.max(x.stun || 0, .35); x.heading = Math.atan2((x === a ? b : a).pos.z - x.pos.z, (x === a ? b : a).pos.x - x.pos.x); try { apply(x, { pose: 'k_uke', face: x === a ? b : a, k: 60 }, .35); } catch (e) { } });
          try { label(p.clone().add(V3(0, 6, 0)), '힘겨루기!', '#ffe0a0'); } catch (e) { }
          setTimeout(() => { if (!F.includes(a) || !F.includes(b)) return; const d = dirTo(a, b); a.kb.addScaledVector(d, -150); b.kb.addScaledVector(d, 150); try { burst(m.setY(p.y), 14, ['#ffffff', '#ffd040'], 2, 120, 1.2); } catch (e) { } }, 380); }
      } else if (ta === '검' || tb === '검') { // 손과 검: 막기·손바닥으로 쳐내기
        burst(p, 14, ['#ffffff', '#ffe080', '#c8d8ff'], 1.8, 140, 1.2); light(p, '#fff0c0', 3); try { label(p.clone().add(V3(0, 5, 0)), ta === '검' ? '맨손 쳐내기!' : '검으로 막음!', '#e8f0ff'); } catch (e) { }
      } else if (ta === '손' && tb === '손') { // 주먹과 주먹·팔: 충격파 고리·먼지
        ring(p, 2.5, '#ffffff', false, .5, 2.6); burst(p, 12, ['#ffffff', '#e8dcc8', '#c8b898'], 1.6, 100, 1.4); if (mutual) { ring(p, 4.5, '#ffe8c0', false, .6, 2.4); try { label(p.clone().add(V3(0, 5, 0)), '주먹 충돌!', '#ffe0b0'); } catch (e) { } }
      } else { // 발과 팔·발과 발 등: 둔탁한 막기
        ring(p, 2.2, '#f0e0c8', false, .45, 2.4); burst(p, 10, ['#e8dcc8', '#b8a888'], 1.4, 140, 1.4);
      }
    } catch (e) { }
    shake = Math.max(shake, mutual ? 5 : 3);
  }
  CB.contactFx = contactFx;
  // ── 피격 반응: 기능별로 따로 ──
  function hitstop(s) { CB.stopT = Math.max(CB.stopT, Math.min(.12, s)); }
  function hitstun(b, s, before) { b.stun = Math.max(before, b.stun || 0, s); }
  function knock(b, kd, k, up) { b.kb.addScaledVector(kd, 70 * k); if (up) { b.vel.y = Math.max(b.vel.y, 110 * k); b.air = true; } }
  function impulse(b, kd, k) { const ph = b.model && b.model.ph; if (ph && ph.sv) { const fw = Math.cos(b.heading) * kd.x + Math.sin(b.heading) * kd.z; ph.sv.x += -fw * 2.5 * k; ph.sv.z += (Math.random() - .5) * 2 * k; ph.sv.y += .8 * k; } }
  function react(b, part, dir, fd) {
    const cv = b.cv || (b.cv = {}); const s = dir === 'back' ? -1 : 1;
    if (part === 'head') { cv.lean = (cv.lean || 0) - 55 * s; cv.twist = (cv.twist || 0) + (Math.random() - .5) * 18; }
    else if (part === 'torso') { cv.lean = (cv.lean || 0) + 40 * s; cv.bob = (cv.bob || 0) - 20; }
    else if (part === 'leg') { cv.bob = (cv.bob || 0) - 35; if (fd.low) b.stun = Math.max(b.stun, .5); }
    else { cv.twist = (cv.twist || 0) + (dir === 'side' ? 25 : 12) * (Math.random() < .5 ? -1 : 1); }
    if (dir === 'side') cv.twist = (cv.twist || 0) + 20 * (Math.random() < .5 ? -1 : 1);
  }
  function recoil(a, kd) { a.kb.addScaledVector(kd, -55); if (a.atk) { a.atk.ph = 'recovery'; a.atk.t = -.12; } a.stun = Math.max(a.stun || 0, .12); CB.st.recoils++; }
  function stagger(b, dmg) {
    b.poise = (b.poise == null ? 100 : b.poise) - dmg;
    if (b.poise > 0) return false;
    b.poise = 100; b.stun = Math.max(b.stun, .75); CB.st.staggers++;
    label(headP(b).add(V3(0, 7, 0)), '휘청!', '#ffe070'); return Math.random() < .35;
  }
  function knockDown(b, kd, k) {
    if (b.down) return; CB.st.downs++;
    const ax = new THREE.Vector3(kd.z, 0, -kd.x).normalize(); // 맞은 방향으로 넘어짐(회전 축 = 넉백 방향의 옆)
    const mc = !!(rigOf(b) && window.mocapForce); // 모션 캡처 인물: 넘어지는 동작 클립이 맡음(몸통 강체 회전은 겹치지 않게 끔)
    b.down = { t: 0, ang: 0, angV: 2.5 + 2 * Math.min(2, k), ax, lie: .8 + Math.random() * .6, ph: 'fall', bounce: 0, mc };
    if (mc) mocapForce(b.ch.key, 'Knockdown');
    if (b.team) b.swapCd = Math.max(b.swapCd || 0, 1.6 + b.down.lie);
    b.stun = Math.max(b.stun, 2.2); b.kb.addScaledVector(kd, 60 * k);
    label(headP(b).add(V3(0, 6, 0)), '다운!', '#ffb050');
  }
  CB.knockDown = knockDown;
  function combo(a, b, pr) { // 세계관 연속기: 맞히면 이따금 짧은 추가타(같은 교전 줄 안)
    if (Math.random() > pr.combo || !F.includes(a) || !F.includes(b) || (a.comboN || 0) >= 2) return;
    a.comboN = (a.comboN || 0) + 1; const q = laneOf(a); if (!q) return;
    const sw = a.model && a.model.swd && a.model.swd.grp && a.model.swd.grp.visible;
    q.unshift(step(.11, [[a, { pose: sw ? pick(['k_yoko', 'k_kesa', 'k_upCut']) : pick(['punchL', 'punch', 'kick', 'elbow']), face: b, fwd: 60 }]], () => resolve(a, b, null, 'hit', sw ? '연속 베기!' : '연타!', .7)));
    setTimeout(() => { a.comboN = 0; }, 900);
  }
  // 빈 공중 이펙트 감시: 폭발·맞음 이펙트가 어느 인물 몸에서도 멀리(12 넘게) 터지면 집계(투사체 폭발은 제외 못 함 — 그대로 셈)
  if (typeof explode === 'function') { const _ex = explode; explode = function (p) { try { if (p && F.length) { CB.st.fxN++; let md = 1e9; for (const f of F) md = Math.min(md, Math.hypot(p.x - f.pos.x, p.z - f.pos.z)); if (md > 12) CB.st.airFx++; } } catch (e) { } return _ex.apply(this, arguments); }; }
  const _setChar = setChar;
  setChar = function (f, ch) { if (f.down && f.down.mc && f.ch && f.ch !== ch && window.mocapForce) { const k = f.ch.key; setTimeout(() => mocapForce(k, 'Idle'), 750); } /* KO 퇴장: 물러난 뒤 누운 동작 풀기 */ if (f.model && f.model.root) { f.model.root.rotation.x = 0; f.model.root.rotation.z = 0; } f.down = null; f.atk = null; f.poise = 100; return _setChar.apply(this, arguments); };

  // 넘어짐(간이 래그돌): 발끝을 축으로 맞은 방향으로 쓰러짐 → 바닥에서 한 번 튕김 → 누움 → 일어남. 관절은 힘을 뺀 자세.
  const _q = new THREE.Quaternion();
  const _pose = poseModel;
  poseModel = function (m, g, t) {
    const r = _pose.apply(this, arguments);
    const d = g && g.down; if (d && !d.mc && d.ang > .001 && m && m.root) { _q.setFromAxisAngle(d.ax, d.ang); m.root.quaternion.premultiply(_q); }
    return r;
  };
  function tickDown(f, dt) {
    const d = f.down; if (!d) return;
    d.t += dt;
    if (d.ph === 'fall') { d.angV += 9 * Math.sin(Math.max(.15, d.ang)) * dt * 6; d.ang += d.angV * dt;
      if (d.ang >= 1.45) { d.ang = 1.45; if (d.bounce < 1 && d.angV > 2) { d.angV *= -.28; d.bounce++; shake = Math.max(shake, 4); } else { d.angV = 0; d.ph = 'lie'; d.t = 0; } } }
    else if (d.ph === 'lie') { f.tgt = Object.assign({}, POSE.hurt || f.tgt, { lean: -2 });
      if (d.t > d.lie) { if (f.team && (f.tire || 0) >= (f.tireLim || 1e9) * .9) { d.ph = 'ko'; d.t = 0; CB.st.ko = (CB.st.ko || 0) + 1; if (d.mc) mocapForce(f.ch.key, 'Death'); f.swapCd = Math.max(f.swapCd || 0, 1.2); label(headP(f).add(V3(0, 6, 0)), 'KO', '#ff6a50'); }
        else { d.ph = 'up'; d.t = 0; if (d.mc) mocapForce(f.ch.key, 'GetUp'); } } }
    else if (d.ph === 'ko') { if (d.t > 4) { d.ph = 'up'; d.t = 0; if (d.mc) mocapForce(f.ch.key, 'GetUp'); } } // 교대가 오지 않으면 4초 뒤 일어남
    else if (d.ph === 'up') { d.ang = Math.max(0, 1.45 * (1 - d.t / (d.mc ? .95 : .5))); if (d.ang <= 0) { f.down = null; f.stun = Math.min(f.stun, .15); label(headP(f).add(V3(0, 6, 0)), '일어남', '#cfe8ff'); return; } }
    f.stun = Math.max(f.stun, .2); f.vel.x *= .85; f.vel.z *= .85;
  }

  // ── 매 화면: 대기 중 판정·공격 구간 시간·다운·체간 회복·Hitstop ──
  const _update = update;
  update = function (dt, t) {
    let sdt = dt; if (CB.stopT > 0) { CB.stopT -= dt; sdt = dt * .06; }
    CB.simT = (CB.simT || 0) + sdt; // 적중 구간은 게임 시간 기준(잠깐 멈춤 동안 구간이 실제 시간으로 흘러가 버리지 않게)
    const w0 = performance.now();
    for (let i = 0; i < F.length; i++) {
      const f = F[i], at = f.atk;
      if (at) { at.t += sdt; if (at.ph === 'windup' && at.t > .6) f.atk = null; else if (at.ph === 'active' && (rigOf(f) && window.mocapOn ? (at.evT ? CB.simT - at.evT > (at.fd.a + .2) : at.t > .4 + at.fd.a + .12) : at.t > at.fd.a + (CB.pend.some(p => p.a === f) ? .15 : 0))) { at.ph = 'recovery'; at.t = 0; } else if (at.ph === 'recovery' && at.t > at.fd.r) f.atk = null; }
      tickDown(f, sdt); if (f.atk) trackPeak(f, sdt); else f._pk = null;
      if (f._pp) f._spd = Math.hypot(f.pos.x - f._pp.x, f.pos.z - f._pp.z) / Math.max(1e-3, sdt); else f._pp = new THREE.Vector3(); f._pp.copy(f.pos);
      if (f.poise != null && f.poise < 100) f.poise = Math.min(100, f.poise + 22 * sdt);
    }
    // 대기 중인 근접 공격: 적중 구간에 몸이 닿으면 적중, 닿지 않으면 상대 쪽으로 파고듦(Lunge), 끝내 못 닿으면 헛침(Whiff)
    // 맞부딪힘(Clash): 서로를 향한 두 공격이 같은 순간 적중 구간이고, 판정 점끼리 겹치면
    for (let i = 0; i < CB.pend.length; i++) { const p = CB.pend[i]; if (p.clashed) continue; const q = CB.pend.find(x => !x.clashed && x.a === p.b && x.b === p.a); if (!q || !p.a.atk || !q.a.atk || p.a.atk.ph === 'recovery' || q.a.atk.ph === 'recovery') continue; if (Math.hypot(p.a.pos.x - q.a.pos.x, p.a.pos.z - q.a.pos.z) > 14) continue; /* 몸이 가까울 때만(접촉점이 빈 공중이 되지 않게) */ /* 둘 다 휘두르는 중이면(준비·적중 구간) */
      const A = hitPts(p.a, p.k, []), boneA = CB._bone, B = hitPts(q.a, q.k, []), boneB = CB._bone; let best = null, bd = 1e9;
      for (const x of A) for (const y of B) { const d = x.p.distanceTo(y.p) - x.r - y.r - 4; if (d < 0 && d < bd) { bd = d; best = x.p.clone().lerp(y.p, .5); } } /* 접촉 허용 4(손 IK 정렬 범위): 가까운 두 공격 점을 가운데 접촉점으로 맞춤 */
      A.forEach(x => give(x.p)); B.forEach(x => give(x.p));
      if (best) { p.clashed = q.clashed = true; CB.st.mutual = (CB.st.mutual || 0) + 1; contactFx(p.a, q.a, best, toolOf(boneA, p.a), toolOf(boneB, q.a), true); const d = dirTo(p.a, q.a); p.a.kb.addScaledVector(d, -110); q.a.kb.addScaledVector(d, 110); recoil(p.a, d); recoil(q.a, d.clone().negate()); hitstop(.06); emit('clash', { a: p.a, b: q.a, at: best }); }
    }
    CB.pend = CB.pend.filter(p => { if (p.clashed) return false;
      p.t += sdt; const { a, b } = p;
      if (!F.includes(a) || !F.includes(b)) return false;
      if (a.stun > 0 || a.down) { CB.st.stunCancel++; return false; }
      if (land(p)) { diagEnd(p, 'contact', ''); return false; }
      const lost = !a.atk || a.atk !== p.atk || a.atk.ph === 'recovery' || p.t > .85;
      if (lost) diagEnd(p, 'whiff', !a.atk ? 'noatk' : a.atk !== p.atk ? 'replaced' : a.atk.ph === 'recovery' ? (p.d0 ? 'windowEnd' : 'neverActive') : 'timeout');
      if (lost) { CB.st.whiff++; const gd = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z); // 몸에 닿지 않음: 가까웠으면 상대가 흘려 피한 것으로(회피 연출), 멀었으면 헛침
        if (gd < .55 * H(a) && F.includes(b) && Math.random() < ((b.ai && b.ai.evade) || .5)) { /* 판단층(brain)을 다시 거치지 않음 — 닿지 않은 공격이 적중으로 바뀌지 않게 */ CB.st.slip = (CB.st.slip || 0) + 1; const sx = -(b.pos.z - a.pos.z) / (gd || 1), sz = (b.pos.x - a.pos.x) / (gd || 1), sg = Math.random() < .5 ? -1 : 1; b.kb.x += sx * sg * 70; b.kb.z += sz * sg * 70; label(headP(b).add(V3(0, 4, 0)), ((WORLD[b.ch.world] || {}).dodge || '회피') + '!', '#b0ffb0'); }
        else if (Math.random() < .35) label(headP(a).add(V3(0, 5, 0)), '헛침', '#c8d0d8');
        return false; }
      const ca = bodyC(a, { x: 0, z: 0 }), cb = bodyC(b, { x: 0, z: 0 }); const pr = prof(a), dx = cb.x - ca.x, dz = cb.z - ca.z, dist = Math.hypot(dx, dz), want = rad(a) + rad(b) + .5; // 사거리: 실제 판정 도달(주먹·발·칼날이 몸통에 닿는 거리) — 캡슐 반지름 합 바로 바깥까지
      { const hd = Math.atan2(dz, dx); let dh = hd - a.heading; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); a.heading += Math.max(-9 * sdt, Math.min(9 * sdt, dh)); } // 미세 추적(초당 9 rad 상한)
      { const dy = b.pos.y - a.pos.y; if (dy > .25 * H(a) && !a.air && !p.jumped) { p.jumped = true; a.vel.y = Math.min(420, Math.sqrt(2 * GRAV * dy) * 1.05); a.air = true; CB.st.airChase = (CB.st.airChase || 0) + 1; } } // 띄운 상대: 같이 뛰어올라 공중에서 이어 침(높이 차가 가장 큰 헛침 원인)
      if (dist > want) { const sp = Math.min(1150, Math.min(700, Math.max(230 * pr.lunge, (dist - want) / .12)) * (pr.blink && dist > 25 ? 1.6 : 1) * ((CB.lungeMul && CB.lungeMul(a)) || 1)), mv = Math.min(dist - want, sp * sdt); a.pos.x += dx / dist * mv; a.pos.z += dz / dist * mv; if (!p.lunged) { p.lunged = true; CB.st.lunges++; } }
      return true;
    });
    const ms = performance.now() - w0; CB.ms += (ms - CB.ms) * .05; if (ms > CB.msMax) CB.msMax = ms;
    return _update.call(this, sdt, t);
  };
})();
