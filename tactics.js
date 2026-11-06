// 전술 층(현황판 교전): ① 상태 효과(데이터 기반·상호작용) ② 필살기 반응(맞받아치기·회피·방어·끊기·휘말림) ③ 방어·회피 비중(준비 동작을 보고 피하기·가드·쳐내기·탈출)
// 기존 층 위에 감싸기만 한다: resolve(맞힘 판단)·wound(적중)·proj(투사체)·callout(기술 외침)·ultBlast(필살 폭발)·runStep(교전 단계)·update(매 화면)·setChar(교대).
// 체력 담당(hp.js)과 맞물리는 공개 훅: TACTICS.hook('effect'|'interaction'|'ultReaction'|'defense', fn) → fn(이벤트)
(function () {
  if (typeof F === 'undefined' || typeof resolve !== 'function' || typeof callout !== 'function' || typeof update !== 'function') return;
  const now = () => performance.now() / 1000;
  const HK = {};
  const TX = window.TACTICS = { enabled: true,
    st: { forced: 0, applied: {}, inter: {}, ult: { counter: 0, evade: 0, defend: 0, interrupt: 0, caught: 0, ally: 0 }, ultCut: 0, ultSafe: 0, clash: { win: 0, draw: 0 },
      def: { attempts: 0, hits: 0, evade: 0, guard: 0, parry: 0, escape: 0, projDodge: 0, reflect: 0, intang: 0 }, streak4: 0 },
    hook(type, fn) { (HK[type] || (HK[type] = [])).push(fn); return () => { HK[type] = HK[type].filter(x => x !== fn); }; },
    reset() { const s = TX.st; s.forced = s.streak4 = s.ultCut = s.ultSafe = 0; s.applied = {}; s.inter = {}; Object.keys(s.ult).forEach(k => s.ult[k] = 0); s.clash.win = s.clash.draw = 0; Object.keys(s.def).forEach(k => s.def[k] = 0); if (s.mode) Object.keys(s.mode).forEach(k => s.mode[k] = 0); s.modeT = s.atkLaneT = 0; } };
  const emit = (type, e) => (HK[type] || []).forEach(fn => { try { fn(e); } catch (er) { console.error(er); } });
  TX.on = TX.hook; // storm-combat.js 등 고도화 층의 이벤트 구독 표기
  const inter = (k, f, extra) => { TX.st.inter[k] = (TX.st.inter[k] || 0) + 1; emit('interaction', Object.assign({ kind: k, f }, extra)); };
  const alive = f => f && F.includes(f);
  const foe = (a, b) => a !== b && !(a.team && b.team && a.team === b.team);
  const hp01 = f => { const r = window.HP && HP.of ? HP.of(f) : null; if (r && r.max) return r.hp / r.max; return 1 - Math.min(1, (f.tire || 0) / Math.max(1, f.tireLim || 10)); };
  const hpHit = (f, amt) => { const r = window.HP && HP.on && HP.of ? HP.of(f) : null; if (!r || r.ko) return false; r.hp = Math.max(1, r.hp - Math.round(amt)); return true; }; // 지속 피해·상쇄 피해(이것만으로는 KO 시키지 않음)

  // ═══ ① 상태 효과 ═══
  const K = { // 이름·색·대상(self 자신 / foe 상대)·지속(초, 0 = 즉시)
    haste: ['가속', '#7fe0ff', 'self', 4], power: ['강화', '#ff8a3a', 'self', 5], armor: ['경화', '#d0d0dc', 'self', 4], intang: ['무적', '#e6d8ff', 'self', 2.5],
    giant: ['거대화', '#ffb070', 'self', 5], domain: ['영역전개', '#b070ff', 'self', 5], reflect: ['반사', '#f0f0ff', 'self', 2.5], clone: ['분신', '#ffd84a', 'self', 0], heal: ['회복', '#80ff9a', 'self', 0],
    slow: ['둔화', '#88bbff', 'foe', 3], freeze: ['빙결', '#c8f4ff', 'foe', 1.5], stun: ['마비', '#ffe24a', 'foe', .8], burn: ['화상', '#ff5a2a', 'foe', 3], bleed: ['출혈', '#d0203a', 'foe', 3], wet: ['젖음', '#4aa0ff', 'foe', 4],
    pull: ['끌어당김', '#a080ff', 'foe', 0], push: ['밀어냄', '#c0e0ff', 'foe', 0], launch: ['띄움', '#ffffff', 'foe', 0] };
  TX.KINDS = K;
  // 기술 이름(일부 글자) → 효과 — 다른 일꾼의 기술 파일(skills-more.js·world-aot·world-jjk 등)은 건드리지 않고 이 표로만 붙인다
  const TAGS = [
    [/무량공처|복마어주자|영역\s*전개|영역전개|결계|자폐원돈과/, ['domain']], [/무하한|무한|투명|신기루/, ['intang']], [/분신/, ['clone']], [/대타|바꿔치기/, ['intang']],
    [/수사노오|스사노오|거인|거대|대불|구미|미수옥|오오노코/, ['giant', 'power']],     [/기어\s*2|기어 세컨|순보|비뢰신|벽력|섬광|신속|가속|질풍|음속|팔문|생문|경문|입체기동/, ['haste']],
    [/기어\s*(3|4|5|서드|포스|파이브)|진지한|만해|반카이|선인|패기|무장색|흑섬|강화|폭주|연옥|귀인화|허화|괴인화/, ['power']], [/경화|철괴|철벽|강철|모래\s*방패|방패|수호|갑옷/, ['armor']],
    [/반사|쳐내|되받|백제|흡수/, ['reflect']], [/회복|치유|재생|반전술식/, ['heal']],
    [/빙|얼음|동결|빙결|천상의\s*무지개|빙천/, ['freeze']], [/그림자|묶|구속|속박|봉인|거미|실/, ['slow']], [/번개|뇌|치도리|기린|전격|雷|벽력|일섬/, ['stun']],
    [/화둔|불꽃|화염|염|불|태양|히노카미|연옥|아마테라스/, ['burn']], [/베기|참|검|칼|도|일도|이도|삼도/, ['bleed']], [/수둔|물|파도|수룡|폭포|물의\s*호흡/, ['wet']],
    [/혁|인력|천애|만상천인|당기|흡인|끌어/, ['pull']], [/자\b|허식|신라천정|척력|밀어|폭풍|충격파|풍둔|진공/, ['push']], [/어퍼|띄|승룡|상승|올려|천본/, ['launch']] ];
  TX.TAGS = TAGS;
  const ELEMTAG = [[/fire|flame|blaze|sun|heat|burn/i, 'burn'], [/ice|frost|snow|cold/i, 'freeze'], [/light|thunder|spark|elec|bolt/i, 'stun'], [/water|wave|mist|rain/i, 'wet'], [/wind|gust|air/i, 'push'], [/shadow|dark/i, 'slow'], [/slash|blade|sword/i, 'bleed'], [/poison|venom|insect/i, 'slow']];
  const tagsOf = (name, ek) => { const s = new Set(); if (name) for (const [re, ks] of TAGS) if (re.test(name)) ks.forEach(k => s.add(k)); if (ek) for (const [re, k] of ELEMTAG) if (re.test(ek)) { s.add(k); break; } return [...s]; };
  TX.tagsOf = tagsOf;
  const has = (f, k) => f && f.fx && f.fx[k] && f.fx[k].until > now();
  const clear = (f, k) => { if (f.fx && f.fx[k]) { if (k === 'giant' && f.fx.giant.base) f.scale = f.fx.giant.base; delete f.fx[k]; } };
  const tagLbl = (f, k) => { const m = K[k]; f._lblT = f._lblT || {}; if ((f._lblT[k] || 0) > now()) return; f._lblT[k] = now() + 1.2; label(headP(f).add(V3(0, 11, 0)), m[0], m[1]); };
  function applyFx(f, k, src, dur) {
    if (!TX.enabled || !alive(f) || !K[k]) return false;
    const m = K[k], t = now(); f.fx = f.fx || {};
    // 상호작용(상성·상쇄·강화)
    if ((k === 'slow' || k === 'freeze') && has(f, 'haste')) { clear(f, 'haste'); inter('가속↔둔화 상쇄', f); tagLbl(f, k); return false; }
    if (k === 'haste' && (has(f, 'slow') || has(f, 'freeze'))) { clear(f, 'slow'); clear(f, 'freeze'); inter('가속↔둔화 상쇄', f); return false; }
    if (k === 'burn' && has(f, 'freeze')) { clear(f, 'freeze'); inter('불↔얼음 상쇄', f); label(headP(f).add(V3(0, 11, 0)), '상쇄!', '#ffd0a0'); return false; }
    if (k === 'freeze' && has(f, 'burn')) { clear(f, 'burn'); inter('불↔얼음 상쇄', f); label(headP(f).add(V3(0, 11, 0)), '상쇄!', '#d0f0ff'); return false; }
    if (k === 'burn' && has(f, 'wet')) { clear(f, 'wet'); inter('물이 불 약화', f); dur = (dur || m[3]) * .4; }
    if (k === 'wet' && has(f, 'burn')) { clear(f, 'burn'); inter('물이 불 약화', f); }
    let stunMul = 1; if (k === 'stun' && has(f, 'wet')) { stunMul = 2; inter('번개+물 감전', f); label(headP(f).add(V3(0, 12, 0)), '감전!', '#fff060', { big: true }); }
    TX.st.applied[k] = (TX.st.applied[k] || 0) + 1;
    const d = (dur || m[3]);
    switch (k) {
      case 'pull': if (src) { const v = src.pos.clone().sub(f.pos).setY(0); if (v.lengthSq() > 1) f.kb.addScaledVector(v.normalize(), 240); } break;
      case 'push': if (src) { const v = f.pos.clone().sub(src.pos).setY(0); if (v.lengthSq() > .01) f.kb.addScaledVector(v.normalize(), 280); } break;
      case 'launch': f.vel.y = Math.max(f.vel.y, 260); f.air = true; break;
      case 'clone': if (typeof spawnClone === 'function') { const tg = (f.aiTarget && alive(f.aiTarget)) ? f.aiTarget : F.find(o => foe(f, o)); if (tg) { spawnClone(f, tg); spawnClone(f, tg); } } break;
      case 'heal': if (!(window.HP && HP.of && HP.of(f))) f.tire = Math.max(0, (f.tire || 0) - 3); ['slow', 'freeze', 'burn', 'bleed', 'stun'].forEach(x => clear(f, x)); break;
      case 'stun': f.stun = Math.max(f.stun || 0, .8 * stunMul); clear(f, 'haste'); break; // 기절은 가속을 끊음
      case 'freeze': f.stun = Math.max(f.stun || 0, 1.1); break;
      case 'giant': if (!has(f, 'giant')) { const base = f.scale || 1; f.fx.giant = { until: t + d, base }; f.scale = base * 1.32; tagLbl(f, k); emit('effect', { f, kind: k, src }); return true; } break;
      case 'domain': f.fx.domain = { until: t + d, c: f.pos.clone(), r: 48, tick: 0 }; tagLbl(f, k); emit('effect', { f, kind: k, src }); return true;
    }
    if (d > 0) { const cur = f.fx[k]; f.fx[k] = { until: t + d, stack: cur && cur.until > t ? Math.min(2, (cur.stack || 1) + 1) : 1, tick: 0 }; }
    if (d >= 2 && /haste|power|giant|armor/.test(k)) { try { label(headP(f).add(V3(0, 13, 0)), m[0] + ' ' + Math.round(d) + '초', m[1]); } catch (e) { } }
    tagLbl(f, k); emit('effect', { f, kind: k, src }); return true;
  }
  TX.apply = applyFx; TX.has = has; TX.clear = clear;
  // hp.js 피해 배율 훅: 강화(겹치면 더)·거대화·영역 필중은 늘리고, 경화는 반, 무적이면(필중이 아니면) 0
  window.BUFFS = { dmgMul(a, v) {
    if (!TX.enabled) return 1; let m = 1;
    if (a && has(a, 'power')) m *= a.fx.power.stack > 1 ? 1.45 : 1.3;
    if (a && has(a, 'giant')) m *= 1.25;
    const dom = a && v && inDomainOf(v, a); if (dom) m *= 1.15;
    if (v && has(v, 'armor')) m *= .5;
    if (v && has(v, 'intang') && !dom) m *= 0;
    if (v && (has(v, 'freeze') || has(v, 'stun'))) m *= 1.1; // 굳은 상대는 조금 더 아픔
    TX.st.dmgMulN = (TX.st.dmgMulN || 0) + (m !== 1 ? 1 : 0); return m; } };
  const inDomainOf = (b, owner) => owner && has(owner, 'domain') && Math.hypot(b.pos.x - owner.fx.domain.c.x, b.pos.z - owner.fx.domain.c.z) < owner.fx.domain.r;
  const enemyDomain = b => F.find(o => foe(o, b) && inDomainOf(b, o));

  // 같은 기술의 자기 강화는 3초에 한 번
  const selfOnce = (f, name) => { f._selfT = f._selfT || {}; const k = name || ''; if ((f._selfT[k] || 0) > now()) return false; f._selfT[k] = now() + 3; return true; };
  function selfTags(f, name, ek) { if (!name || !selfOnce(f, name)) return; tagsOf(name, null).filter(k => K[k][2] === 'self').forEach(k => applyFx(f, k, f)); }

  // ═══ ③ 방어·회피 + ② 필살기 반응 공통: 맞힘 판단 앞단 ═══
  let inRefl = false;
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw = 1, at) {
    if (a && b && a !== b && alive(a) && alive(b) && foe(a, b) && !inRefl) { TX.st.def.attempts++; a._streak = 0; if (at || Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > 30) TX.st.atkRanged = (TX.st.atkRanged || 0) + 1; else TX.st.atkMelee = (TX.st.atkMelee || 0) + 1; } // 집계는 전술을 꺼도 함(전후 비교용)
    if (!TX.enabled || !a || !b || a === b || !alive(a) || !alive(b) || !foe(a, b)) return _res.apply(this, arguments);
    const t = now();
    if (a.ultCut > t) { TX.st.ultCut++; TX.st.castDrop++; return; }                              // 끊긴 시전·필살기는 나가지 않음
    if (a.castDeflect > t && Math.random() < .7) { TX.st.castDrop++; try { const p = a.pos.clone().add(V3(R(-40, 40), 0, R(-40, 40))); clampArena(p); explode(p.setY(4), ek || a.elem || 'power', .7); } catch (e) { } return; } // 엉뚱한 곳에 터짐
    if (a.castWeak > t) pw = (pw || 1) * .5;
    if (b.ultSafe > t && a.ultOn > t) { TX.st.ultSafe++; return; }            // 맞받아치기·회피로 이 필살기는 안 맞음
    const dom = inDomainOf(b, a);
    if (has(b, 'intang') && !dom) { TX.st.def.intang++; inter('무적 회피', b); label(headP(b).add(V3(0, 6, 0)), b.ch.key === 'gojo' ? '무하한' : '닿지 않음', '#e6d8ff'); return; }
    if (has(b, 'intang') && dom) { inter('영역전개 필중 vs 무적', b); label(headP(b).add(V3(0, 7, 0)), '필중!', '#d080ff', { big: true }); }
    if (dom) b.forceDef = { o: 'hit', until: performance.now() + 900 };   // 영역 안은 필중
    const ranged = !!at || Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > 30;
    if (ranged && has(b, 'reflect') && !inRefl) { inRefl = true; TX.st.def.reflect++; inter('반사', b); label(headP(b).add(V3(0, 6, 0)), '반사!', '#ffffff', { big: true }); try { resolve(b, a, ek, 'hit', (nm || '') + ' 반사', pw, null); } finally { inRefl = false; } return; }
    selfTags(a, nm, ek);
    return _res.call(this, a, b, ek, o, nm, pw, at);
  };
  // ═══ ⑤ 시전 중 '틈'(소유자 11-05): 시전자가 맞으면 취소·슈퍼아머·불완전 발동·폭주·빗나감·받아치기 ═══
  TX.st.castHit = { cancel: 0, armor: 0, partial: 0, overload: 0, deflect: 0, counter: 0 }; TX.st.castGap = { rush: 0, shot: 0, flank: 0, wait: 0, charge: 0, guardAlly: 0 }; TX.st.castDrop = 0;
  const casting = f => f && (f.castUntil || 0) > now();
  function scatter(v, big) { try { const E = ELEM[v.elem || (v.ch.sig && v.ch.sig.elem)] || ELEM.power || { c: '#a0c8ff', parts: ['#ffffff'] }; burst(chest(v), big ? 46 : 28, (E.parts || [E.c]).concat([E.c, '#ffffff']), big ? 3.2 : 2.2, 40, 1.4); ring(chest(v), big ? 7 : 4, E.c, false, .6, 2.6); if (typeof shot === 'function' && cam.mode === 'base') shot('close', 1, v, v.target || v); } catch (e) { } }
  const snd = (name, p, o) => { try { if (window.SFX && SFX.play) SFX.play(name, p, o || {}); } catch (e) { } };
  function castHit(v, a) {
    const m = v.ai || {}, rem = (v.castUntil - now()) / Math.max(.1, v.castDur || 1), strong = (m.aggr || .5) > .6 && hp01(v) > .5;
    const w = { cancel: 1.2, armor: (strong ? .6 : .1) + (v.castUlt && rem < .35 ? .8 : 0), partial: .45, overload: v.castUlt ? .35 : .1, deflect: .35, counter: (m.react || .5) * .5 };
    let r = Math.random() * Object.values(w).reduce((s, x) => s + x, 0), k = 'cancel'; for (const [kk, x] of Object.entries(w)) { r -= x; if (r <= 0) { k = kk; break; } }
    TX.st.castHit[k]++; const tn = now(), away = v.pos.clone().sub(a.pos).setY(0); if (away.lengthSq() < .01) away.set(1, 0, 0); away.normalize();
    if (k === 'cancel') { v.castUntil = 0; v.ultCut = tn + 1.4; v.kb.addScaledVector(away, 260); v.vel.y = Math.max(v.vel.y, 110); v.air = true; scatter(v, false); snd('spell', chest(v), { gain: .7 }); snd('boom', chest(v), { gain: .45, gap: .08 }); label(headP(v).add(V3(0, 10, 0)), '시전 끊김!', '#ff9a70', { big: true }); }
    else if (k === 'armor') { v.stun = 0; v.kb.multiplyScalar(.3); snd('heavy', chest(v), { gain: .8 }); snd('block', chest(v), { gap: .05 }); label(headP(v).add(V3(0, 10, 0)), '슈퍼아머!', '#ffe080'); }
    else if (k === 'partial') { v.castWeak = tn + 1.4; v.stun = Math.max(v.stun || 0, .25); label(headP(v).add(V3(0, 10, 0)), '불완전 발동', '#d0d0ff'); }
    else if (k === 'overload') { v.castUntil = 0; v.ultCut = tn + 1.4; scatter(v, true); snd('boom', chest(v), { gain: .8 }); snd('spell', chest(v), { gap: .1 }); label(headP(v).add(V3(0, 10, 0)), '폭주!', '#ff6040', { big: true }); shake = Math.max(shake, 9); F.forEach(o => { if (o === v) return; const d = o.pos.clone().sub(v.pos).setY(0), L = d.length(); if (L < 32) { o.kb.addScaledVector(L > .01 ? d.normalize() : V3(1, 0, 0), 260); o.stun = Math.max(o.stun || 0, .3); } }); }
    else if (k === 'deflect') { v.castDeflect = tn + 1.4; label(headP(v).add(V3(0, 10, 0)), '기술이 빗나감!', '#c0e0ff'); }
    else { v.stun = 0; label(headP(v).add(V3(0, 10, 0)), '받아치기!', '#ffd84a'); later(.05, () => { if (alive(v) && alive(a)) resolve(v, a, null, 'hit', '받아치기!', 1); }); }
    emit('castHit', { f: v, by: a, kind: k });
  }
  TX.castHit = castHit;
  // 적중(실제 맞음): 상대 효과 걸기 + 강화/거대화 넉백↑, 경화 넉백·경직↓(강타면 경화 파괴)
  const _wound = wound;
  wound = function (v, a, text, ek) {
    const r = _wound.apply(this, arguments);
    if (alive(v) && a && alive(a) && foe(a, v)) { TX.st.def.hits++; v._streak = (v._streak || 0) + 1; if (v._streak === 4) TX.st.streak4++; }
    if (TX.enabled && alive(v) && a && alive(a) && foe(a, v) && casting(v)) { try { castHit(v, a); } catch (e) { console.error(e); } }
    if (!TX.enabled || !alive(v) || !a || !alive(a) || !foe(a, v)) return r;
    let mul = 1; if (has(a, 'power') || (a.mode > 0)) mul *= 1.5; if (has(a, 'giant')) mul *= 1.3;
    if (mul > 1.2) { try { const p = chest(v); ring(p, 3.5, '#ffe0a0', false, .5, 2.8); if (window.__env && __env.smash) __env.smash(V3(v.pos.x, 0, v.pos.z), 1.4, a.elem || null, dirTo(a, v)); else if (window.FX3 && FX3.ground) FX3.ground(V3(v.pos.x, 0, v.pos.z), 1.6, a.elem || null, dirTo(a, v)); } catch (e) { } TX.st.buffHit = (TX.st.buffHit || 0) + 1; } // 강해진 공격: 충격파·땅 부서짐 강화
    if (has(v, 'armor')) { if (mul > 1.4) { clear(v, 'armor'); inter('강타가 경화 파괴', v); label(headP(v).add(V3(0, 8, 0)), '경화 파괴!', '#ffb070', { big: true }); } else { mul *= .5; v.stun = (v.stun || 0) * .5; inter('경화가 막음', v); } }
    if (mul !== 1) v.kb.multiplyScalar(mul);
    { const kk = Math.hypot(v.kb.x, v.kb.z), s = TX.st.kbCmp || (TX.st.kbCmp = { buff: [], norm: [] }); (mul > 1.2 ? s.buff : s.norm).push(kk); if (s.buff.length > 200) s.buff.shift(); if (s.norm.length > 200) s.norm.shift(); }
    tagsOf(text, ek || a.elem || (a.ch.sig && a.ch.sig.elem)).filter(k => K[k][2] === 'foe').slice(0, 2).forEach(k => applyFx(v, k, a));
    return r;
  };
  // 투사체: 맞는 쪽이 보고 비켜 감(측면·점프·쳐내기), 반사 효과면 되받아침
  if (typeof proj === 'function') {
    const _proj = proj;
    proj = function (a, b, kind, mode, o) {
      if (TX.enabled && b && alive(b) && a && foe(a, b) && mode === 'hit' && !(b.stun > 0) && !b.down) {
        if (has(b, 'reflect')) { mode = 'deflect'; TX.st.def.reflect++; inter('반사', b); }
        else { const m = b.ai || {}, p = .14 + .3 * (m.evade || .5) + (hp01(b) < .35 ? .15 : 0) - .1 * (m.aggr || .5); if (Math.random() < p) { mode = pick(['jump', 'block', 'deflect', 'jump']); TX.st.def.projDodge++; emit('defense', { f: b, kind: 'projDodge' }); } }
      }
      return _proj.call(this, a, b, kind, mode, o);
    };
  }

  // ═══ ② 필살기 반응 ═══
  const timers = []; let simT = 0;
  const later = (s, fn) => timers.push({ t: simT + s, fn });
  const ADV = { fire: ['ice', 'wind'], water: ['fire'], light: ['water'], ice: ['water'], wind: ['light'] }; // 상성(앞이 뒤를 이김) — 속성 이름의 일부로 비교
  const elemOf = f => String(f.elem || (f.ch.sig && f.ch.sig.elem) || '');
  const beats = (x, y) => Object.entries(ADV).some(([a, bs]) => x.includes(a) && bs.some(b => y.includes(b)));
  function ultClash(c, o) {
    const mid = c.pos.clone().lerp(o.pos, .5); mid.y = 14;
    callout(o, (o.ch.sig && o.ch.sig.name) || '맞받아치기', false);
    try { shot('duel', 2.6, c, o); } catch (e) { }
    const X = window.FX3; let k = 0;
    const sc = f => hp01(f) * (.6 + Math.random() * .8) + ((f.ai && f.ai.aggr) || .5) * .3 + (beats(elemOf(f), elemOf(f === c ? o : c)) ? .35 : 0);
    const sC = sc(c), sO = sc(o), lead = (sC - sO);
    for (let i = 0; i < 8; i++) later(i * .15, () => { k++; const p = mid.clone().add(V3((Math.random() - .5) * 3, (Math.random() - .5) * 3, (Math.random() - .5) * 3)); const sh = c.pos.clone().sub(o.pos).setY(0).normalize().multiplyScalar(-lead * k * 1.2); p.add(sh);
      try { if (X && X.shock) X.shock(p, sh.lengthSq() > .01 ? sh.clone().normalize() : V3(1, 0, 0), 6 + k * 1.5, (ELEM[c.elem] || ELEM.power || { c: '#ffffff' }).c, .35); else ring(p, 3 + k, '#ffffff', false, .6, 2.4); } catch (e) { try { ring(p, 3 + k, '#ffffff', false, .6, 2.4); } catch (e2) { } }
      try { burst(p, 10, ['#ffffff', '#ffe0a0', '#a0d0ff'], 1.4); } catch (e) { } shake = Math.max(shake, 5); });
    later(1.3, () => {
      if (!alive(c) || !alive(o)) return;
      try { explode(mid, c.elem || 'power', 2); flashScreen(.07); } catch (e) { }
      if (Math.abs(lead) < .15) { TX.st.clash.draw++; [c, o].forEach(f => { const r0 = window.HP && HP.of ? HP.of(f) : null; if (r0) hpHit(f, r0.max * .08); const v = f.pos.clone().sub(mid).setY(0); if (v.lengthSq() < .01) v.set(1, 0, 0); f.kb.addScaledVector(v.normalize(), 260); }); label(mid.clone().add(V3(0, 10, 0)), '상쇄!', '#ffffff', { big: true }); inter('필살기 상쇄', c, { other: o }); }
      else { TX.st.clash.win++; const w = lead > 0 ? c : o, l = w === c ? o : c; label(headP(w).add(V3(0, 10, 0)), '밀어붙임!', '#ffd84a', { big: true }); const v = l.pos.clone().sub(w.pos).setY(0); if (v.lengthSq() < .01) v.set(1, 0, 0); l.kb.addScaledVector(v.normalize(), 320); w._coT = now(); w._coUlt = true; try { wound(l, w, '맞불 패배!', elemOf(w) || null); } catch (e) { } if (window.COMBAT && COMBAT.knockDown && !l.down) COMBAT.knockDown(l, v.normalize(), 1.6); inter('필살기 맞불 승부', w, { loser: l }); }
    });
  }
  function ultReact(c, text) {
    const t = now(); c.ultOn = t + 3.2; const R0 = 60;
    for (const o of F) {
      if (o === c) continue;
      let kind;
      if (!foe(c, o)) { kind = 'ally'; const g = o.pos.clone().sub(c.pos).setY(0); if (g.lengthSq() < .01) g.set(1, 0, 0); g.normalize().multiplyScalar(R0 + 10).add(c.pos); g.y = 0; clampArena(g); if (window.MV) MV.arc(o, g, .5, 10); }
      else if (o.stun > 0 || o.down) kind = 'caught';
      else {
        const m = o.ai || {}, d = Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z), hp = hp01(o), bold = m.aggr || .5, careful = ((m.guard || .5) + (m.evade || .5)) / 2;
        const w = { counter: bold * hp * (o.ch.sig ? 1.1 : .3) * ((o.ultCd || 0) > t ? .2 : 1), evade: careful * (d < R0 ? 1.2 : .5) * (hp < .4 ? 1.4 : 1), defend: (m.guard || .5) * .8 + (/gojo|gaara|kenpachi/.test(o.ch.key) ? .6 : 0), interrupt: d < 30 ? bold * 1.1 : .04, caught: .22 };
        let r = Math.random() * Object.values(w).reduce((s, v) => s + v, 0); kind = 'caught'; for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { kind = k; break; } }
        if (kind === 'counter') { o.ultCd = t + 8; o.ultSafe = t + 3; ultClash(c, o); }
        else if (kind === 'evade') { o.ultSafe = t + 2.6; const g = o.pos.clone().sub(c.pos).setY(0); if (g.lengthSq() < .01) g.set(1, 0, 0); g.normalize().multiplyScalar(R0 + 20).add(c.pos); g.y = 0; clampArena(g); if (window.MV) MV.arc(o, g, .45, 16); label(headP(o).add(V3(0, 7, 0)), '범위 밖으로!', '#b0ffb0'); }
        else if (kind === 'defend') { applyFx(o, o.ch.key === 'gojo' ? 'intang' : 'armor', o, 3); o.forceDef = { o: 'block', until: performance.now() + 2600 }; }
        else if (kind === 'interrupt') { const a = o; if (window.MV) MV.arc(a, c.pos.clone().add(dirTo(c, a).multiplyScalar(6)).setY(0), .3, 8, { done: () => { if (!alive(a) || !alive(c)) return; c.ultCut = now() + 1.8; c.stun = Math.max(c.stun || 0, .9); label(headP(c).add(V3(0, 9, 0)), '기술 끊김!', '#ff8a60', { big: true }); resolve(a, c, null, 'hit', '끊기!', 1.2); } }); }
      }
      TX.st.ult[kind]++; emit('ultReaction', { caster: c, other: o, kind, skill: text });
    }
  }
  // 필살기 쿨다운(인물별 8~15초) · 같은 필살 연속 금지: 쿨다운 중엔 필살 기술을 고르는 후보에서 뺌(skillOf 의 최근 기술 목록을 잠깐 빌림)
  const ULT_SRC = /callout\(\s*[\w.]+\s*,\s*('[^']*'|"[^"]*"|[\w.]+)\s*,\s*true\s*\)/;
  const ultKeys = ch => ch._ultKeys || (ch._ultKeys = Object.keys(ch.skills || {}).filter(k => { try { return ULT_SRC.test(String(ch.skills[k])); } catch (e) { return false; } }));
  if (typeof skillOf === 'function') { const _sk = skillOf; skillOf = function (a, b, quick) { if (!a || !a.ch || !TX.enabled) return _sk.apply(this, arguments); const uk = ultKeys(a.ch), cd = (a.ultCdUntil || 0) > now(), add = cd ? uk.filter(k => !a.hist.includes(k)) : (a.lastUltKey ? [a.lastUltKey].filter(k => !a.hist.includes(k)) : []); if (add.length) { a.hist.push(...add); TX.st.ultBlocked = (TX.st.ultBlocked || 0) + (cd ? 1 : 0); } try { return _sk.apply(this, arguments); } finally { if (add.length) a.hist = a.hist.filter(k => !add.includes(k)); } }; }
  const _call = callout;
  callout = function (f, text, ult) {
    const r = _call.apply(this, arguments);
    if (TX.enabled && f && alive(f) && ult && f.ch) { const uk = ultKeys(f.ch), key = uk.find(k => String(text || '').includes(k) || k.includes(String(text || ''))) || null; if ((f.ultCdUntil || 0) > now()) TX.st.ultRepeat = (TX.st.ultRepeat || 0) + 1; f.ultCdUntil = now() + R(8, 15); if (key) f.lastUltKey = key; }
    if (TX.enabled && f && alive(f)) { const d = ult ? 1.8 : .9; f.castUntil = now() + d; f.castDur = d; f.castUlt = !!ult; f.castId = (f.castId || 0) + 1; f.castName = text; }
    if (TX.enabled && f && alive(f)) { try { selfTags(f, text, null); if (ult) ultReact(f, text); } catch (e) { console.error(e); } }
    return r;
  };
  if (typeof ultBlast === 'function') { const _ub = ultBlast; ultBlast = function (p, ek, rad, owner) { if (owner && owner.ultCut > now()) { TX.st.ultCut++; return; } return _ub.apply(this, arguments); }; }

  // ═══ ③ 준비 동작을 보고 반응(근접): 피하기·가드·쳐내기·탈출 ═══
  const DODGE_POSES = ['sidestep', 'backstep', 'crouchDodge', 'sidestep'];
  function preReact(p) {
    const a = p.a, b = p.b; if (!alive(a) || !alive(b) || b.down || (b.atk && b.atk.ph === 'active') || !foe(a, b)) return;
    const m = b.ai || {}, hp = hp01(b), st = b._streak || 0, burst = st >= 3 && (b.burstCd || 0) < now();
    if (b.stun > 0 && !burst) return;                                         // 경직 중엔 못 움직임 — 단, 연타 3번째부터는 탈출기(버스트)
    if ((burst || (st >= 2 && Math.random() < (hp < .4 ? .95 : .8)))) { // 연타 맞는 중 탈출기
      if (burst) { b.burstCd = now() + 4; b.stun = 0; label(headP(b).add(V3(0, 8, 0)), '탈출기!', '#9affc0', { big: true }); }
      TX.st.def.escape++; emit('defense', { f: b, kind: 'escape' });
      if ((b.ch.world || b.team) === 'naruto') { b.forceDef = { o: 'sub', until: performance.now() + 900 }; return; }
      const v = b.pos.clone().sub(a.pos).setY(0); if (v.lengthSq() < .01) v.set(1, 0, 0); b.kb.addScaledVector(v.normalize(), 300); apply(b, { pose: 'backstep', face: a, k: 70 }, .3); b._streak = 0; label(headP(b).add(V3(0, 6, 0)), '탈출!', '#b0ffb0'); return;
    }
    const strongA = has(a, 'power') || has(a, 'giant') || a.mode > 0; const pe = (strongA ? .08 : 0) + .16 + .34 * (m.evade || .5) - .1 * (m.aggr || .5) + (hp < .35 ? .15 : 0), pg = (strongA ? .12 : 0) + .14 + .3 * (m.guard || .5), pp = .06 + .14 * (m.react || .5); // 성향별: 신중형(회피·가드 높음)은 더 피하고, 돌격형(aggr 높음)은 맞불
    const r = Math.random();
    if (r < pe) { // 예측 회피: 옆걸음·뒷걸음·숙이기·점프
      TX.st.def.evade++; const pose = pick(DODGE_POSES), v = b.pos.clone().sub(a.pos).setY(0); if (v.lengthSq() < .01) v.set(1, 0, 0); v.normalize();
      if (pose === 'sidestep') { const s = Math.random() < .5 ? -1 : 1; b.kb.add(V3(-v.z * s * 190, 0, v.x * s * 190)); } else if (pose === 'backstep') b.kb.addScaledVector(v, 190); else if (Math.random() < .4) { b.vel.y = Math.max(b.vel.y, 190); b.air = true; }
      apply(b, { pose, face: a, k: 70 }, .3); emit('defense', { f: b, kind: 'evade' });
    } else if (r < pe + pg) { TX.st.def.guard++; b.forceDef = { o: 'block', until: performance.now() + 800 }; apply(b, { pose: 'block', face: a, k: 70 }, .3); emit('defense', { f: b, kind: 'guard' }); }
    else if (r < pe + pg + pp) { TX.st.def.parry++; b.forceDef = { o: 'counter', until: performance.now() + 800 }; emit('defense', { f: b, kind: 'parry' }); }
  }

  // ═══ ④ 전술 전환(소유자 11-05 "공격만 하지 말고 간헐적으로 회피·외곽 돌기·방어 태세"): 교전 줄이 끝나 쉬는 인물에게 이따금 전술 줄을 줌 ═══
  // 외곽 크게 돌기 · 가드 걸음(자세 낮춤·검 겨눔) · 숨 고르기 · 상대 주변 맴돌기 · 돌아 들어가 기습 — 성향·체력·상대 상태로 확률
  TX.st.mode = { circle: 0, guardWalk: 0, breathe: 0, strafe: 0, flank: 0 }; TX.st.modeT = 0; TX.st.atkLaneT = 0;
  const swOn = f => !!(f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  function modeLane(f) {
    const tg = (f.aiTarget && alive(f.aiTarget) && !f.aiTarget.away) ? f.aiTarget : F.find(o => foe(f, o) && !o.away); if (!tg) return null;
    const m = f.ai || {}, hp = hp01(f), careful = ((m.guard || .5) + (m.evade || .5)) / 2, tgHp = hp01(tg);
    const w = { circle: .6 + careful * .6 + (hp < .4 ? .6 : 0), guardWalk: .5 + (m.guard || .5) * .8 + (hp < .5 ? .3 : 0), breathe: (hp < .5 ? .7 : .15) + ((f.tire || 0) / Math.max(1, f.tireLim || 10)) * .6, strafe: .6 + (m.evade || .5) * .5, flank: .3 + (m.aggr || .5) * .7 + (tgHp < .4 ? .4 : 0) };
    let r = Math.random() * Object.values(w).reduce((s, x) => s + x, 0), k = 'circle'; for (const [kk, x] of Object.entries(w)) { r -= x; if (r <= 0) { k = kk; break; } }
    const s = Math.random() < .5 ? -1 : 1, q = [], gp = swOn(f) ? pick(['k_chudan', 'k_hasso', 'k_waki', 'guard']) : pick(['guard', 'block', 'stance']);
    if (k === 'circle') { const nS = 4 + (Math.random() * 3 | 0); for (let i = 0; i < nS; i++) q.push(step(R(.35, .5), [[f, { pose: 'run', side: s * R(170, 230), fwd: R(-60, -20), face: tg }]])); }
    else if (k === 'guardWalk') { for (let i = 0; i < 4; i++) q.push(step(R(.4, .55), [[f, { pose: gp, side: (i % 2 ? -1 : 1) * s * R(40, 80), fwd: R(-40, 10), face: tg, k: 30 }]])); }
    else if (k === 'breathe') { q.push(step(.4, [[f, { pose: 'run', fwd: -90, face: tg }]], () => { try { label(headP(f).add(V3(0, 7, 0)), '숨 고르기', '#cfe8ff'); } catch (e) { } })); q.push(step(R(.8, 1.3), [[f, { pose: 'stance', face: tg, k: 20 }]])); q.push(step(.4, [[f, { pose: gp, face: tg }]])); }
    else if (k === 'strafe') { for (let i = 0; i < 4; i++) q.push(step(R(.3, .42), [[f, { pose: 'run', side: (i % 2 ? -s : s) * R(120, 170), fwd: R(-10, 20), face: tg }]])); }
    else { q.push(step(R(.35, .5), [[f, { pose: 'run', side: s * 230, fwd: 40, face: tg }]])); q.push(step(R(.3, .45), [[f, { pose: 'crouchRun', side: s * 120, fwd: 150, face: tg }]])); q.push(step(.14, [[f, { pose: swOn(f) ? pick(['k_kesa', 'k_yoko']) : pick(['punch', 'kick', 'elbow']), face: tg, fwd: 90 }]], () => { if (alive(f) && alive(tg) && !tg.away) resolve(f, tg, null, 'hit', '기습!', 1); })); }
    TX.st.mode[k]++; emit('mode', { f, kind: k });
    return { fs: [f], q, t: 0, tactic: k };
  }
  // ═══ ⑥ 원거리 견제(소유자 11-05 "원거리로 견제·공격하는 비중↑") ═══
  TX.rangedOn = true; TX.st.rangedLane = { kite: 0, strafe: 0, volleyRush: 0 };
  // 검술 세계관(귀멸의 칼날) 인물은 전원 근접 전용 — 원거리 레인에서 제외 (오바나이·시노부·우즈이 제거)
  const RANGED_TYPE = /^(naruto|sasuke|kakashi|itachi|gaara|sakura|ace|law|ichigo|byakuya|rukia|hitsugaya|aizen|kizaru|saitama|genos|tatsumaki|gojo|kugisaki|nobara|sukuna|megumi)$/;
  function shotStep(a, b, dur) { const sig = a.ch.sig || {}; try { return T.ranged(a, b, sig.name || '견제', sig.kind || 'orb', sig.elem || 'power', { size: .8, v: 300, modes: ['hit', 'block', 'jump', 'hit'] }); } catch (e) { return [step(dur || .3, [[a, { pose: 'cast', face: b }]], () => { if (alive(a) && alive(b) && typeof proj === 'function') proj(a, b, sig.kind || 'orb', 'hit', { c: (ELEM[sig.elem] || { c: '#ffffff' }).c }); })]; } }
  function rangedLane(a, b) {
    const v = Math.random(), s = Math.random() < .5 ? -1 : 1, q = [];
    if (v < .38) { TX.st.rangedLane.kite++; q.push(step(R(.3, .45), [[a, { pose: 'run', fwd: -150, side: s * 60, face: b }], [b, { pose: 'run', to: () => b.pos.clone().lerp(a.pos, .3), face: a }]])); q.push(...shotStep(a, b)); if (Math.random() < .6) { q.push(step(R(.25, .35), [[a, { pose: 'run', fwd: -120, face: b }]])); q.push(...shotStep(a, b)); } }
    else if (v < .72) { TX.st.rangedLane.strafe++; for (let i = 0; i < 2; i++) { q.push(step(R(.3, .42), [[a, { pose: 'run', side: (i ? -s : s) * 180, face: b }], [b, { pose: pick(['guard', 'run']), side: R(-80, 80), face: a }]])); q.push(...shotStep(a, b)); } }
    else { TX.st.rangedLane.volleyRush++; const k = 2 + (Math.random() < .4 ? 1 : 0); for (let i = 0; i < k; i++) q.push(...shotStep(a, b)); q.push(step('run', [[a, { pose: 'crouchRun', to: () => b.pos.clone().lerp(a.pos, .15), face: b, ghost: 1 }], [b, { pose: 'guard', face: a }]])); q.push(step(.14, [[a, { pose: swOn(a) ? pick(['k_kesa', 'k_yoko']) : pick(['punch', 'kick', 'palm']), face: b, fwd: 90 }]], () => { if (alive(a) && alive(b)) resolve(a, b, null, 'hit', '견제 후 돌진!', 1); })); }
    return { fs: [a, b], q, t: 0, ranged: true };
  }
  if (typeof laneTick === 'function') {
    const _lt = laneTick;
    const seenL = new WeakSet();
    laneTick = function (dt) {
      const r = _lt.apply(this, arguments);
      if (TX.enabled && F.length >= 2) { // 이번 화면에 새로 생긴 교전 줄을 이따금 전술 줄(서로 거리 재며 맴돌기·외곽 돌기·가드 걸음…)로 바꿈
        for (let i = lanes.length - 1; i >= 0; i--) { const L = lanes[i]; if (seenL.has(L)) continue; seenL.add(L); if (L.tactic || L.fs.some(f => f.away || f.stun > 0 || f.down || (f._modeCd || 0) > simT)) continue;
          const p = L.fs.reduce((s, f) => { const m = f.ai || {}; return s + .22 + (hp01(f) < .4 ? .18 : 0) + (((m.guard || .5) + (m.evade || .5)) / 2) * .2 - (m.aggr || .5) * .1; }, 0) / L.fs.length;
          if (TX.rangedOn && L.fs.length === 2) { const [x, y] = L.fs, d = Math.hypot(x.pos.x - y.pos.x, x.pos.z - y.pos.z); if (foe(x, y) && d > 26 && d < 95) { const sh = [x, y].sort((p, q2) => (RANGED_TYPE.test(q2.ch.key) ? 1 : 0) - (RANGED_TYPE.test(p.ch.key) ? 1 : 0))[0], other = sh === x ? y : x, pr = RANGED_TYPE.test(sh.ch.key) ? .55 : .25;
            if (Math.random() < pr) { lanes.splice(i, 1); const nl = rangedLane(sh, other); seenL.add(nl); lanes.push(nl); continue; } } }
          if (L.fs.length === 2 && Math.random() < .45) { const [x, y] = L.fs; if (foe(x, y)) { const sw = f => swOn(f), hitP = f => sw(f) ? pick(['k_kesa', 'k_yoko', 'slash']) : pick(['punch', 'punch', 'kick', 'highKick']), prep = f => sw(f) ? 'slashPrep' : 'punchPrep';
            const q = [step('run', [[x, { pose: 'run', to: () => x.pos.clone().lerp(y.pos, .3), face: y }], [y, { pose: 'run', to: () => y.pos.clone().lerp(x.pos, .3), face: x }]]), step(.16, [[x, { pose: prep(x), face: y }], [y, { pose: prep(y), face: x }]]), step(.16, [[x, { pose: hitP(x), face: y, fwd: 80 }], [y, { pose: hitP(y), face: x, fwd: 80 }]], () => { TX.st.trade = (TX.st.trade || 0) + 1; if (alive(x) && alive(y)) { resolve(x, y, null, 'hit', '맞교환!', 1); resolve(y, x, null, 'hit', '맞교환!', 1); } }), step(.3, [[x, { pose: 'guard', face: y }], [y, { pose: 'guard', face: x }]])];
            lanes.splice(i, 1); const nl = { fs: [x, y], q, t: 0, trade: true }; seenL.add(nl); lanes.push(nl); continue; } } // 맞교환: 둘이 동시에 휘둘러 정면으로 부딪힘
          if (Math.random() < p) { const nl = L.fs.map(f => modeLane(f)).filter(Boolean); if (nl.length) { lanes.splice(i, 1); nl.forEach(x => { seenL.add(x); lanes.push(x); }); L.fs.forEach(f => f._modeCd = simT + R(3, 5)); } } }
      }
      return r;
    };
  }

  // ═══ ⑦ 인물별 공격 방식 규칙(원작) — 동작 이름을 바꿔 모든 경로(기본 공격·연타·맞교환·반격·탈출기)에 적용 ═══
  const FIST = { punch: 'kick', punchL: 'kick', uppercut: 'highKick', palm: 'sweep', elbow: 'jumpKnee', shoulder: 'kick', punchPrep: 'kickPrep', hammerDown: 'axe', openPalm: 'kick' };
  const STYLE = {
    sanji: { noFist: 1 },                       // 손은 쓰지 않음(주머니·뒷짐) — 공격·연타·막기 모두 발
    gai: { kickBias: .6 }, nezuko: { kickBias: .6 },   // 발차기 비중↑
    saitama: { fistBias: .7 },                  // 맨주먹 위주
  };
  TX.STYLE = STYLE; TX.st.style = { sanjiFistBlocked: 0, sanjiFistSeen: 0, kickSwap: 0, fistSwap: 0 };
  const KICK2FIST = { kick: 'punch', highKick: 'uppercut', sweep: 'palm', axe: 'punch', jumpKnee: 'elbow', kickPrep: 'punchPrep' };
  const _applyS = apply;
  apply = function (f, s, d) {
    const st = f && f.ch && STYLE[f.ch.key];
    if (st && s && s.pose) {
      let p = s.pose;
      if (st.noFist && FIST[p]) { p = FIST[p]; TX.st.style.sanjiFistBlocked++; }
      else if (st.kickBias && FIST[p] && Math.random() < st.kickBias) { p = FIST[p]; TX.st.style.kickSwap++; }
      else if (st.fistBias && KICK2FIST[p] && Math.random() < st.fistBias) { p = KICK2FIST[p]; TX.st.style.fistSwap++; }
      if (st.noFist && p === 'block') p = 'guard';
      if (p !== s.pose) s = Object.assign({}, s, { pose: p });
      if (st.noFist && FIST[s.pose]) TX.st.style.sanjiFistSeen++;
    }
    return _applyS.call(this, f, s, d);
  };

  // ═══ ⑧ 체공 규칙: 비행 가능 인물만 공중에 떠 있을 수 있음. 나머지는 공중 정지 0.2초 넘으면 중력으로 떨어짐 ═══
  const FLYER = /^(tatsumaki|gojo|aizen|kizaru)$/; TX.FLYER = FLYER; TX.st.hover = { fixed: 0, time: 0 };
  function hoverGuard(f, dt) {
    if (FLYER.test(f.ch && f.ch.key || '') || f.away || f.arc || f.perchAt || (window.PHYS && PHYS.flights && PHYS.flights.has(f))) { f._hov = 0; return; }
    if (!f.air && window.COLLIDE && COLLIDE.ROCKS.some(r => Math.hypot(f.pos.x - r.x, f.pos.z - r.z) < Math.max(r.rx, r.rz) + 2 && f.pos.y <= r.h + 1)) { f._hov = 0; return; } // 바위 위에 서 있음(체공 아님)
    const p = prev.get(f), vy = p ? (f.pos.y - p.y) / Math.max(1e-3, dt) : 0;
    if (f.pos.y > 3 && Math.abs(vy) < 6) { f._hov = (f._hov || 0) + dt; if (f._hov > .2) { TX.st.hover.time += dt; f.air = true; f.vel.y = Math.min(f.vel.y || 0, -90); if (f._hov < .2 + dt * 1.5) TX.st.hover.fixed++; } }
    else f._hov = 0;
  }

  // ═══ 매 화면 ═══
  const _runStep = runStep;
  runStep = function (s) {
    const d = _runStep.apply(this, arguments); if (!TX.enabled || !s || !s.acts) return d;
    let k = 1; for (const [f] of s.acts) { if (has(f, 'freeze')) k = Math.max(k, 1.5); else if (has(f, 'slow')) k = Math.max(k, 1.3); else if (has(f, 'haste') && k === 1) k = .68; if (has(f, 'giant')) k = Math.max(k, 1.12); }
    return d * k;
  };
  const prev = new Map(); let auraT = 0;
  const _update = update;
  update = function (dt, t) {
    if (TX.enabled) F.forEach(f => { const p = prev.get(f) || prev.set(f, new THREE.Vector3()).get(f); p.copy(f.pos); });
    const r = _update.apply(this, arguments);
    if (!TX.enabled) return r;
    simT += dt; const tn = now();
    F.forEach(f => hoverGuard(f, dt));
    if (lanes) lanes.forEach(L => { const sec = dt * L.fs.length; if (L.tactic) TX.st.modeT += sec; else TX.st.atkLaneT += sec; });
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= simT) { const x = timers.splice(i, 1)[0]; try { x.fn(); } catch (e) { console.error(e); } }
    if (window.COMBAT) COMBAT.pend.forEach(p => { if (!p._tx) { p._tx = 1; preReact(p); } });
    auraT -= dt; const aura = auraT <= 0; if (aura) auraT = .5;
    F.forEach(f => {
      if (!f.fx) return;
      // 이동 배율: 가속 1.25 · 둔화 .6 · 빙결 .1 · 적 영역 안 .7
      let mul = 1; if (has(f, 'haste')) mul *= 1.5; if (has(f, 'slow')) mul *= .6; if (has(f, 'freeze')) mul *= .1; if (enemyDomain(f)) mul *= .7;
      const p = prev.get(f); if (p && mul !== 1) { const dx = f.pos.x - p.x, dz = f.pos.z - p.z; if (dx * dx + dz * dz < 400) { f.pos.x = p.x + dx * mul; f.pos.z = p.z + dz * mul; const mv = TX.st.move || (TX.st.move = {}), key = mul > 1 ? '빨라짐' : '느려짐', m2 = mv[key] || (mv[key] = { 원래: 0,실제: 0 }); const d0 = Math.hypot(dx, dz); m2.원래 += d0; m2.실제 += d0 * mul; } }
      for (const k in f.fx) { const e = f.fx[k]; if (!e || e.until <= tn) { clear(f, k); continue; }
        if (k === 'burn' || k === 'bleed') { e.tick = (e.tick || 0) + dt; if (e.tick > .7) { e.tick = 0; if (!hpHit(f, 14)) f.tire = (f.tire || 0) + .25; try { burst(chest(f), 5, k === 'burn' ? ['#ff6a2a', '#ffb040'] : ['#c0203a', '#801020'], .7); } catch (er) { } emit('effect', { f, kind: k + 'Tick' }); } }
        if (k === 'domain') { e.tick = (e.tick || 0) + dt; if (e.tick > .6) { e.tick = 0; try { ring(V3(e.c.x, .5, e.c.z), e.r * .5, '#b070ff', true, .8, 2.2); } catch (er) { } } }
      }
      if (aura) { const k = Object.keys(f.fx).find(x => f.fx[x] && f.fx[x].until > tn); if (k) try { burst(chest(f), 3, [K[k][1]], .5, -20, 1); } catch (er) { } }
    });
    // 시전 '틈' 감지: 다른 인물이 성향·거리·남은 시간으로 반응(필살기는 ultReact 가 따로 맡음)
    F.forEach(c => {
      if (!casting(c) || c.castUlt || c.away || c._gapId === c.castId) return; c._gapId = c.castId;
      const rem = c.castUntil - now();
      F.forEach(o => {
        if (o === c || o.away || o.stun > 0 || o.down || o.arc) return;
        if (!foe(o, c)) { // 같은 팀: 시전자 보호(앞을 막아섬)
          const th = F.find(x => foe(x, c) && Math.hypot(x.pos.x - c.pos.x, x.pos.z - c.pos.z) < 40); if (th && window.MV && Math.random() < .6) { TX.st.castGap.guardAlly++; const g = c.pos.clone().lerp(th.pos, .45); g.y = 0; MV.arc(o, g, .3, 6); o.forceDef = { o: 'block', until: performance.now() + 1200 }; label(headP(o).add(V3(0, 7, 0)), '막아선다!', '#b0ffb0'); } return; }
        const m = o.ai || {}, d = Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z), bold = m.aggr || .5;
        const w = { rush: d < 50 && rem > .3 ? .15 + bold * 1.6 : .05, shot: d >= 25 ? .1 + (m.react || .5) * .12 : .03, flank: d < 60 && rem > .45 ? .5 + (m.evade || .5) * .4 : .05, wait: .35 + ((m.guard || .5) + (m.evade || .5)) * .25, charge: .25 + bold * .2 };
        let r = Math.random() * Object.values(w).reduce((s, x) => s + x, 0), k = 'wait'; for (const [kk, x] of Object.entries(w)) { r -= x; if (r <= 0) { k = kk; break; } }
        TX.st.castGap[k]++; emit('castGap', { f: o, caster: c, kind: k });
        if (k === 'rush' && window.MV) { lanes = lanes.filter(L => !L.fs.includes(o)); MV.arc(o, c.pos.clone().add(dirTo(c, o).multiplyScalar(6)).setY(0), Math.min(.45, .2 + d / 220), 8, { done: () => { if (alive(o) && alive(c)) resolve(o, c, null, 'hit', '틈새 공격!', 1.1); } }); label(headP(o).add(V3(0, 7, 0)), '틈이다!', '#ffd84a'); }
        else if (k === 'shot' && typeof proj === 'function') { proj(o, c, (o.ch.sig && o.ch.sig.kind) || 'orb', 'hit', { c: (ELEM[(o.ch.sig && o.ch.sig.elem) || 'metal'] || { c: '#ffffff' }).c }); }
        else if (k === 'flank' && window.MV) { lanes = lanes.filter(L => !L.fs.includes(o)); const back = c.pos.clone().add(V3(-Math.cos(c.heading) * 9, 0, -Math.sin(c.heading) * 9)); clampArena(back); MV.arc(o, back, .4, 14, { done: () => { if (alive(o) && alive(c)) resolve(o, c, null, 'hit', '뒤를 잡았다!', 1.15); } }); }
        else if (k === 'charge') { lanes = lanes.filter(L => !L.fs.includes(o)); try { lanes.push({ fs: [o], q: skillOf(o, c, true), t: 0 }); } catch (e) { } }
        else { apply(o, { pose: pick(['guard', 'backstep', 'stance']), face: c, fwd: -40 }, .4); }
      });
    });
    // 버프·변신 체감 연출: 가속=잔상·속도선·발밑 먼지 꼬리 / 강화·거대화·변신=오라·걸음마다 작은 균열·떠오르는 자갈 / 착지 큰 균열
    const st2 = TX.st.buffMv || (TX.st.buffMv = { buffD: 0, buffT: 0, normD: 0, normT: 0 });
    F.forEach(f => {
      if (f.away) return; const p = prev.get(f); const mv = p ? Math.hypot(f.pos.x - p.x, f.pos.z - p.z) : 0; if (mv > 20) return;
      if (f.mode > 0 && !has(f, 'power')) applyFx(f, 'power', f, 3); // 변신(모드) 중엔 강화 유지
      const hs = has(f, 'haste'), pw = has(f, 'power') || has(f, 'giant');
      if (hs) { st2.hasteD = (st2.hasteD || 0) + mv; st2.hasteT = (st2.hasteT || 0) + dt; } if (hs || pw) { st2.buffD += mv; st2.buffT += dt; } else { st2.normD += mv; st2.normT += dt; }
      f._bfx = (f._bfx || 0) - dt; const moving = mv / Math.max(1e-3, dt) > 40;
      if (hs && moving && f._bfx <= 0) { f._bfx = .07;
        try { if (typeof ghosts !== 'undefined' && f.ch) ghosts.push({ ch: f.ch, pos: f.pos.clone(), heading: f.heading, c: { ...f.c }, life: .7, color: '#9fe8ff', dec: .06 }); } catch (e) { }
        try { const back = V3(-(f.pos.x - p.x), 0, -(f.pos.z - p.z)).normalize(); if (window.FX3 && FX3.streak) FX3.streak(chest(f), back.multiplyScalar(120), .25, .05, 2, '#d8f4ff', 0); burst(V3(f.pos.x, 1, f.pos.z), 3, ['#c8b898', '#e0d4c0'], .6, 60, 1); } catch (e) { } }
      if (pw && f._bfx <= 0) { f._bfx = .22;
        try { const E = ELEM[f.elem || (f.ch.sig && f.ch.sig.elem)] || ELEM.power || { c: '#ffd080' }; burst(chest(f), 4, [E.c, '#ffffff'], .7, -30, 1.2); if (moving && !f.air && window.FX3 && FX3.crack) FX3.crack(V3(f.pos.x, 0, f.pos.z), 2.2, f.elem || null); if (Math.random() < .25 && window.FX3 && FX3.floatRocks) FX3.floatRocks(V3(f.pos.x, 0, f.pos.z), 4, 10, 1.4); } catch (e) { } }
      if ((hs || pw) && f._wasAir && !f.air) { try { if (window.FX3 && FX3.ground) FX3.ground(V3(f.pos.x, 0, f.pos.z), pw ? 2.4 : 1.4, f.elem || null); } catch (e) { } }
      f._wasAir = !!f.air;
    });
    // 적 영역 안 → 바깥으로 탈출 시도, 가속 상대엔 거리 유지, 둔화 상대엔 돌진, 체력 낮으면 거리 벌림
    F.forEach(f => {
      if (f.stun > 0 || f.down || f.arc) return;
      const dom = F.find(o => foe(o, f) && inDomainOf(f, o));
      if (dom) { const v = f.pos.clone().sub(dom.fx.domain.c).setY(0); if (v.lengthSq() < .01) v.set(1, 0, 0); f.pos.addScaledVector(v.normalize(), 22 * dt); return; }
      const tg = f.aiTarget; if (!tg || !alive(tg) || (f.aiState !== 'IDLE' && f.aiState !== 'DEFEND' && f.aiState !== 'CHASE')) return;
      const v = tg.pos.clone().sub(f.pos).setY(0), d = v.length(); if (d < .01) return; v.multiplyScalar(1 / d);
      let k = 0; if ((has(tg, 'haste') || has(tg, 'power') || has(tg, 'giant') || tg.mode > 0) && d < 30) k = -16; // 강해진 상대와는 거리를 둠 else if ((has(tg, 'slow') || has(tg, 'freeze')) && d > 12) k = 18; else if (hp01(f) < .3 && d < 32) k = -12;
      if (k) f.pos.addScaledVector(v, k * dt);
    });
    return r;
  };
  const _setChar = setChar;
  setChar = function (f, ch) { if (f.fx) { if (f.fx.giant && f.fx.giant.base) f.scale = f.fx.giant.base; f.fx = null; } f._streak = 0; f.ultCut = f.ultSafe = f.ultOn = 0; return _setChar.apply(this, arguments); }; // 교대하면 효과 풀림
})();
