// 체력바(철권풍)·피해 등급·체력 0 교대 — 소유자 요청(11-05)
// 팀(세계관)마다 인물별 체력을 기억한다. 맞으면 등급(기본·중간·필살)과 상황(카운터·연속기·공중·막기)에 따라 줄고,
// 0 이 되면 다운(KO) → 같은 팀 다음 인물이 태그 참전. 팀원 전원 KO 면 그 팀 패배 → 잠시 뒤 전원 회복해 재출전(무한 관전).
// arena.js 의 wound·clash·callout 과 teams.js 의 teamSwap(공개)·COMBAT.knockDown 을 감싸거나 부르기만 한다.
(function () {
  if (typeof CH === 'undefined' || typeof wound !== 'function') return;
  const HP = window.HP = { on: true, rec: {}, st: { hits: 0, dmg: { basic: [], mid: [], ult: [] }, chip: 0, counter: 0, ko: 0, swaps: 0, defeat: 0, revive: 0, heal: 0 } };
  const now = () => performance.now() / 1000;
  // 인물별 최대 체력: 원작 체급(덩치·키) 반영 소폭 차이
  function maxOf(ch) { const b = ch.bulk || 1, h = ch.bodyScale || 1; return Math.round(1000 * Math.max(.88, Math.min(1.2, .55 + .3 * b + .15 * h))); }
  function recOf(team, key) {
    const T = HP.rec[team] || (HP.rec[team] = {});
    if (!T[key]) { const ch = CH[key]; const m = ch ? maxOf(ch) : 1000; T[key] = { hp: m, max: m, lag: m, ko: false }; }
    return T[key];
  }
  HP.isKO = (team, key) => !!(HP.rec[team] && HP.rec[team][key] && HP.rec[team][key].ko);
  HP.of = f => f && f.team && f.ch ? recOf(f.team, f.ch.key) : null;

  // 피해 등급: 최근 기술 이름 외침(callout)이 있으면 중간, 필살(ult)이면 큼, 없으면 기본 공격
  const DMG = { basic: [50, 75], mid: [120, 175], ult: [330, 440] }; // 1인 약 1분 안팎에 KO 되도록(실측 60초 적중 수 기준)
  const HEAL_RE = /회복|치유|재생|반전술식|역전술식/;
  const _callout = callout;
  callout = function (f, text, ult) {
    if (f) { f._coT = now(); f._coUlt = !!ult; if (HP.on && text && HEAL_RE.test(String(text))) heal(f, .14); }
    return _callout.apply(this, arguments);
  };
  function heal(f, k) { const r = HP.of(f); if (!r || r.ko) return; const add = Math.round(r.max * k); r.hp = Math.min(r.max, r.hp + add); HP.st.heal++; try { label(headP(f).add(V3(0, 9, 0)), '+' + add.toLocaleString(), '#7cff9a'); } catch (e) { } }

  const _wound = wound;
  wound = function (v, a) {
    const r = _wound.apply(this, arguments);
    try { if (HP.on) damage(v, a); } catch (e) { console.warn('hp', e); }
    return r;
  };
  function damage(v, a) {
    const rv = HP.of(v); if (!rv || rv.ko || !a || a === v || (a.team && a.team === v.team)) return;
    const t = now(), recent = a._coT && t - a._coT < 2.6;
    const grade = recent ? (a._coUlt ? 'ult' : 'mid') : 'basic';
    const [lo, hi] = DMG[grade]; let d = lo + Math.random() * (hi - lo);
    // 상황 배율
    if (v.atk && v.atk.ph === 'windup') { d *= 1.3; HP.st.counter++; try { label(headP(v).add(V3(0, 11, 0)), '카운터!', '#ffcf40'); } catch (e) { } }
    const combo = v._hpComboT && t - v._hpComboT < 1.2 ? (v._hpComboN || 0) + 1 : 0; v._hpComboN = combo; v._hpComboT = t;
    d *= Math.max(.45, 1 - .12 * combo);              // 연속기 보정(이어 맞을수록 덜 깎임)
    if (v.air) d *= .85;                               // 공중 콤보 보정
    if (v.down) d *= .6;                               // 누운 상대 추가타 보정
    const buf = window.BUFFS && typeof BUFFS.dmgMul === 'function' ? BUFFS.dmgMul(a, v) : (window.COMBAT && typeof COMBAT.dmgMul === 'function' ? COMBAT.dmgMul(a, v) : 1); // 상태 효과(강화·경화 등) 훅
    const mul = buf == null ? 1 : buf;
    d = mul === 0 ? 0 : Math.max(1, Math.round(d * mul)); // 무적(0배율)이면 피해 0 — 관통 금지
    rv.hp = Math.max(0, rv.hp - d); HP.st.hits++; HP.st.dmg[grade].push(d);
    if (rv.hp <= 0) ko(v, a);
  }
  // 막기·튕겨냄은 깎이는 양이 아주 적음(가드 데미지)
  const _clash = clash;
  clash = function (a, b, text, big) {
    const r = _clash.apply(this, arguments);
    try { if (HP.on && b && /막기|가드/.test(String(text || ''))) { const rb = HP.of(b); if (rb && !rb.ko && !(a && a.team === b.team)) { const d = Math.round((a && a._coT && now() - a._coT < 2.6 ? 14 : 5) * (.7 + Math.random() * .6)); rb.hp = Math.max(1, rb.hp - d); HP.st.chip++; } } } catch (e) { }
    return r;
  };

  // 체력 0: 다운(KO) → 1.6초 뒤 같은 팀 다음 인물 태그 / 팀원 전원 KO 면 패배 → 회복 후 재출전
  function ko(v, a) {
    const r = HP.of(v); r.ko = true; r.hp = 0; HP.st.ko++;
    v.tire = v.tireLim || 99; // combat.js 의 다운 단계가 'KO'(누운 채) 로 가게
    try { const kd = new THREE.Vector3(v.pos.x - (a ? a.pos.x : v.pos.x - 1), 0, v.pos.z - (a ? a.pos.z : v.pos.z)); if (kd.lengthSq() < .01) kd.set(1, 0, 0); kd.normalize(); if (window.COMBAT && COMBAT.knockDown) COMBAT.knockDown(v, kd, 1.6); else v.stun = Math.max(v.stun || 0, 2); } catch (e) { }
    try { label(headP(v).add(V3(0, 12, 0)), 'K.O.', '#ff4040', { big: true }); } catch (e) { }
    const team = v.team, key = v.ch.key;
    setTimeout(() => {
      if (!F.includes(v) || v.team !== team || v.ch.key !== key) return;
      const list = (window.TEAMS && TEAMS[team]) || [];
      const alive = list.filter(k => !HP.isKO(team, k) && !F.some(x => x !== v && x.team === team && x.ch.key === k));
      if (alive.length && window.teamSwap) { HP.st.swaps++; teamSwap(v, 'K.O.'); return; }
      // 팀 패배
      HP.st.defeat++; try { label(headP(v).add(V3(0, 16, 0)), (WORLD[team] ? WORLD[team].name : '') + ' 패배', '#ff8080', { big: true }); } catch (e) { }
      setTimeout(() => { revive(team); if (F.includes(v) && v.team === team) { if (window.teamSwap && list.length > 1 && list[0] !== v.ch.key) teamSwap(v, '재출전!'); else { v.stun = 0; v.tire = 0; v.down = null; if (window.mocapForce) mocapForce(v.ch.key, 'Idle'); try { label(headP(v).add(V3(0, 10, 0)), '재출전!', '#ffd84a', { big: true }); } catch (e) { } } } }, 2400);
    }, 1600);
  }
  function revive(team) { const T = HP.rec[team]; if (!T) return; Object.values(T).forEach(r => { r.hp = r.max; r.lag = r.max; r.ko = false; }); HP.st.revive++; }
  HP.reset = () => { HP.rec = {}; };

  // 교전 중 무작위 교대(arena 계획의 tagIn)는 끔 — 교대는 체력 0·체력 낮음일 때만(소유자 규칙)
  if (typeof tagIn === 'function') { const _tag = tagIn; tagIn = function (f) { if (HP.on) return []; return _tag.apply(this, arguments); }; }
  // 체력이 낮으면 이따금 스스로 교대(후퇴) — 지침·시간 교대 대신
  setInterval(() => {
    if (!HP.on || typeof F === 'undefined') return;
    F.forEach(f => {
      if (!f.team) return; f.tire = Math.min(f.tire || 0, (f.tireLim || 99) * .5); // 지침 교대 규칙 끔(체력 기준)
      const r = HP.of(f); if (!r || r.ko || f.down || (f.swapCd || 0) > 0) return;
      if (r.hp < r.max * .22 && Math.random() < .06) { const list = (window.TEAMS && TEAMS[f.team]) || []; const alive = list.filter(k => !HP.isKO(f.team, k) && k !== f.ch.key && !F.some(x => x.team === f.team && x.ch.key === k)); if (alive.length && window.teamSwap) { HP.st.swaps++; teamSwap(f, '후퇴!'); } }
    });
  }, 500);

  // ── 화면 위 체력바(철권풍): 팀마다 출전 인물 큰 바 + 대기 팀원 작은 바 ──
  const css = document.createElement('style');
  css.textContent = `#hpHud{position:absolute;left:0;right:0;top:0;display:flex;gap:6px;padding:4px 6px 0;pointer-events:none;z-index:3;font-family:'Noto Sans KR',sans-serif}
#hpHud .tm{flex:1 1 0;min-width:0;background:rgba(8,6,12,.74);border:1px solid rgba(255,214,140,.55);border-left:4px solid var(--wc,#888);box-shadow:0 1px 4px rgba(0,0,0,.6);padding:2px 5px 3px;border-radius:3px}
#hpHud .nm{display:flex;align-items:center;gap:4px;font-size:11px;line-height:13px;color:#fff;font-weight:800;white-space:nowrap;overflow:hidden;text-shadow:0 1px 2px #000}
#hpHud .nm b{overflow:hidden;text-overflow:ellipsis;font-weight:900}
#hpHud .nm i{margin-left:auto;font-style:normal;color:var(--wc,#ffd27a);font-size:9px;font-weight:700;filter:brightness(1.5)}
#hpHud .bar{position:relative;height:10px;margin-top:2px;background:#120404;border:1px solid rgba(255,255,255,.55);box-shadow:inset 0 1px 2px #000;overflow:hidden;border-radius:2px}
#hpHud .bar .lag{position:absolute;inset:0 auto 0 0;background:linear-gradient(#ff7a6a,#e81818);transition:width .9s ease-in .4s}
#hpHud .bar .cur{position:absolute;inset:0 auto 0 0;background:linear-gradient(#b8ff9a,#3fd24a 45%,#1f8a2a);transition:width .12s}
#hpHud .bar.mid .cur{background:linear-gradient(#fff6a0,#f2c522 45%,#b8860c)}
#hpHud .bar.low .cur{background:linear-gradient(#ffb0a0,#ff4a2a 45%,#a8180a)}
#hpHud .bar em{position:absolute;right:3px;top:0;bottom:0;font-style:normal;font-size:8px;line-height:10px;color:#fff;font-weight:800;text-shadow:0 0 2px #000,0 0 2px #000}
#hpHud .tm.hit .bar{animation:hpShake .28s}#hpHud .tm.hit .bar::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,.55);animation:hpFlash .28s forwards}
@keyframes hpShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}50%{transform:translateX(2px)}75%{transform:translateX(-1px)}}
@keyframes hpFlash{to{opacity:0}}
#hpHud .res{display:flex;gap:2px;margin-top:2px}
#hpHud .res span{flex:1;height:9px;background:#2a2418;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.25);border-radius:1px}
#hpHud .res span u{position:absolute;inset:0 auto 0 0;background:#5ac85a}
#hpHud .res span.low u{background:#e8a020}
#hpHud .res span s{position:absolute;left:2px;top:0;font-size:7px;line-height:8px;color:#fff;text-decoration:none;font-weight:800;text-shadow:0 0 2px #000}
#hpHud .res span.ko{background:#3a0c0c}#hpHud .res span.ko s{color:#ff8a8a}
@media (max-width:600px){#hpHud{flex-wrap:wrap;row-gap:2px}#hpHud .tm{flex:1 1 30%}}
@media (max-width:480px){#hpHud{gap:3px;padding:2px 2px 0}#hpHud .tm{padding:1px 3px 2px;border-left-width:3px}#hpHud .nm{font-size:9px;line-height:11px}#hpHud .nm i{display:none}#hpHud .bar{height:7px}#hpHud .bar em{font-size:6px;line-height:7px}#hpHud .res span{height:6px}#hpHud .res span s{display:none}}`;
  document.head.appendChild(css);
  const hud = document.createElement('div'); hud.id = 'hpHud';
  const stage = document.getElementById('stage'); if (stage) stage.appendChild(hud);
  let sig = '';
  function draw() {
    if (!HP.on || typeof F === 'undefined') { hud.innerHTML = ''; return; }
    const teams = []; F.forEach(f => { if (f.team && !teams.includes(f.team)) teams.push(f.team); });
    if (teams.length < 2) { if (sig !== 'none') { hud.innerHTML = ''; sig = 'none'; } return; } // 혼자 몸풀기 땐 숨김
    const s = teams.map(t => t + ':' + F.filter(f => f.team === t).map(f => f.ch.key).join(',')).join('|');
    if (s !== sig) { // 구성이 바뀔 때만 틀을 다시 만듦(평소엔 폭만 바꿈)
      sig = s;
      hud.innerHTML = teams.map(t => { const f = F.find(x => x.team === t), list = (window.TEAMS && TEAMS[t]) || [], W = WORLD[t] || {};
        const res = list.filter(k => k !== f.ch.key).map(k => `<span data-k="${t}/${k}"><u></u><s>${((CH[k] && CH[k].name) || k).slice(0, 1)}</s></span>`).join('');
        return `<div class="tm" data-t="${t}" style="--wc:${W.stroke || '#888'}"><div class="nm"><b>${f.ch.name}</b><i>${W.name || ''}</i></div><div class="bar"><div class="lag"></div><div class="cur"></div><em></em></div><div class="res">${res}</div></div>`; }).join('');
    }
    teams.forEach(t => {
      const el = hud.querySelector(`.tm[data-t="${t}"]`); if (!el) return; const f = F.find(x => x.team === t), r = HP.of(f); if (!r) return;
      const p = Math.max(0, r.hp / r.max * 100);
      el.querySelector('.cur').style.width = p + '%'; el.querySelector('.lag').style.width = p + '%'; const bar = el.querySelector('.bar'); bar.classList.toggle('low', p < 25); bar.classList.toggle('mid', p >= 25 && p < 60); const em = el.querySelector('.bar em'); if (em) em.textContent = Math.round(r.hp).toLocaleString() + '/' + r.max.toLocaleString(); if (el._lastHp != null && r.hp < el._lastHp - .5) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); clearTimeout(el._ht); el._ht = setTimeout(() => el.classList.remove('hit'), 300); } el._lastHp = r.hp;
      el.querySelectorAll('.res span').forEach(sp => { const [tt, k] = sp.dataset.k.split('/'), rr = recOf(tt, k); sp.classList.toggle('ko', rr.ko); sp.classList.toggle('low', !rr.ko && rr.hp / rr.max < .35); sp.firstChild.style.width = (rr.ko ? 0 : rr.hp / rr.max * 100) + '%'; });
    });
  }
  setInterval(draw, 100);
  // 세계관을 다시 고르면 체력 기록을 새로 시작
  if (window.setTeams) { const _st = setTeams; window.setTeams = function () { HP.reset(); return _st.apply(this, arguments); }; }
  HP.draw = draw;
})();

// 교대해 들어가 쉬는 팀원은 체력이 서서히 찬다 — 소유자 요청(11-05). 초당 최대 체력의 2%(약 50초에 가득), KO 된 팀원은 그대로
(function () {
  if (!window.HP) return;
  const RATE = 0.02;
  let last = performance.now();
  setInterval(() => {
    const t = performance.now(), dt = Math.min(2, (t - last) / 1000); last = t;
    if (!HP.on || typeof F === 'undefined') return;
    for (const team in HP.rec) {
      const T = HP.rec[team];
      for (const key in T) {
        const r = T[key];
        if (r.ko || r.hp >= r.max) continue;
        if (F.some(f => f.team === team && f.ch && f.ch.key === key)) continue; /* 지금 싸우는 인물은 차지 않음 */
        r.hp = Math.min(r.max, r.hp + r.max * RATE * dt);
        if (r.lag < r.hp) r.lag = r.hp;
      }
    }
  }, 250);
})();
