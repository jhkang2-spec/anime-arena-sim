// 원작 기술별 사실감 덧입힘 (fx3-skills) — fx3.js 도구를 써서, 기술 이름을 외칠 때(callout)와 맞을 때(resolve) 원작 모양을 더한다.
// 기존 canon*.js 의 몸동작·도형은 그대로 두고, 그 위에 원작 질감(물결 띠·불꽃 줄기·가지 번개·바람 칼날·꽃잎 강·검은 불꽃·땅 파괴)을 겹친다.
(function () {
  const X = window.FX3; if (!X || typeof callout !== 'function') return;
  const { emit, streak, bolt, arc, shock, crack, ground, floatRocks, dustRing, dustCol, gravel, elemBurst, busy, rr } = X;
  const UP = V3(0, 1, 0);
  // ── 시간표: 몇 초 뒤 / 몇 초 동안 반복 ──
  const tasks = [];
  const later = (d, fn) => tasks.push({ t: d, fn });
  const during = (dur, iv, fn, d0 = 0) => tasks.push({ t: d0, rep: iv, end: d0 + dur, el: 0, fn });
  X.tick = dt => { for (let i = tasks.length - 1; i >= 0; i--) { const k = tasks[i]; k.t -= dt;
      if (k.rep) { k.el += dt; if (k.t <= 0) { k.t += k.rep; try { k.fn(Math.min(1, (k.el - (k.end - k.el < 0 ? 0 : 0)) / k.end)); } catch (e) { console.error(e); } } if (k.el >= k.end) tasks.splice(i, 1); }
      else if (k.t <= 0) { tasks.splice(i, 1); try { k.fn(); } catch (e) { console.error(e); } } }
    if (tasks.length > 260) tasks.splice(0, tasks.length - 260); };
  // ── 위치 도우미 ──
  const tg = f => (f.target && f.target.pos && f.target !== f) ? f.target : (typeof F !== 'undefined' ? F.filter(x => x !== f).sort((a, b) => a.pos.distanceTo(f.pos) - b.pos.distanceTo(f.pos))[0] : null) || f;
  const hand = f => { try { const p = X.palm && X.palm(f); if (p) return p; return handP(f); } catch (e) { return chest(f); } }; // 새 모형 손바닥 먼저
  const dd = (a, b) => { const v = chest(b).sub(hand(a)); return v.lengthSq() < .01 ? V3(1, 0, 0) : v.normalize(); };
  const side = d => V3(-d.z, 0, d.x).normalize();
  const rnd = (s = 1) => V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).multiplyScalar(s);
  const lerpP = (a, b, k) => a.clone().lerp(b, k);
  const elemC = f => { const e = (typeof ELEM !== 'undefined' && ELEM[f.elem || (f.ch && f.ch.sig && f.ch.sig.elem)]) || null; return e ? e.c : '#ffd040'; };
  // ── 조립 부품 ──
  function flameStream(from, to, dur, cols, size = 9, rate = 4, delay = 0) { // 입·손에서 대상까지 불길 줄기(연기·불티 동반)
    during(dur, .02, () => { const a = from(), b = to(), d = b.clone().sub(a), L = d.length(); d.normalize(); const sp = L / .42;
      for (let i = 0; i < rate * busy(); i++) emit(a.clone().add(rnd(1.5)), d.clone().multiplyScalar(sp * rr(.85, 1.1)).add(rnd(22)), rr(.42, .6), rr(size * .6, size * 1.2), 1, pick(cols), -10);
      if (Math.random() < .5) emit(a.clone().addScaledVector(d, L * .6), V3(rr(-10, 10), rr(20, 40), rr(-10, 10)), rr(1.2, 1.8), size * 1.2, 2, '#3a3030', -3);
      if (Math.random() < .6) emit(a, d.clone().multiplyScalar(sp * .9).add(rnd(60)), rr(.6, 1), 1.4, 5, '#ffb040', 40); }, delay);
  }
  function speedLines(a, b, n, col = '#ffffff', w = 2) { const d = chest(b).sub(chest(a)), L = d.length(); d.normalize(); const s = side(d);
    for (let i = 0; i < n * busy(); i++) streak(chest(a).addScaledVector(s, rr(-7, 7)).add(V3(0, rr(-6, 6), 0)), d.clone().multiplyScalar(rr(380, 620)), Math.min(.3, L / 500), .05, rr(1, w), col); }
  function airBurst(p, d, n = 26, col = '#ffffff', sp = 180) { const s = side(d), u = s.clone().cross(d).normalize(); shock(p, d, sp / 6, col, .35); if (sp >= 180) shock(p.clone().addScaledVector(d, -6), d, sp / 9, col, .3, .06);
    for (let i = 0; i < n * busy(); i++) { const a = i / n * 6.283, v = s.clone().multiplyScalar(Math.cos(a)).addScaledVector(u, Math.sin(a)); streak(p.clone().addScaledVector(v, 3), v.multiplyScalar(sp * rr(.8, 1.2)).addScaledVector(d, 40), rr(.2, .32), .05, 2.2, col); } }
  function auraFlame(f, dur, col, h = 30, rate = 4, kind = 1) { during(dur, .04, () => { for (let i = 0; i < rate * busy(); i++) { const a = rr(0, 6.28), r = rr(3, 9); emit(f.pos.clone().add(V3(Math.cos(a) * r, rr(0, h * .5), Math.sin(a) * r)), V3(rr(-6, 6), rr(30, 60), rr(-6, 6)), rr(.4, .7), rr(5, 9), kind, col, -30); } }); }
  function pillar(f, dur, col) { during(dur, .035, () => { for (let i = 0; i < 3 * busy(); i++) { const a = rr(0, 6.28), r = rr(5, 13); streak(f.pos.clone().add(V3(Math.cos(a) * r, rr(0, 8), Math.sin(a) * r)), V3(0, rr(260, 460), 0), rr(.3, .5), .08, rr(2, 4), Math.random() < .3 ? '#ffffff' : col); } }); }
  function slashArcs(f, n, col, sty = 0, o = {}) { const b = tg(f), d = dd(f, b), s = side(d);
    for (let i = 0; i < n; i++) later((o.d0 || .12) + i * (o.gap || .14), () => { const tilt = rr(-1.1, 1.1), x = s.clone().multiplyScalar(Math.cos(tilt)).add(V3(0, Math.sin(tilt), 0)), y = d.clone();
      arc({ c0: chest(f).addScaledVector(d, o.fwd || 6), x, y, r: o.r || rr(11, 16), a0: -1.6, a1: 1.6 * (Math.random() < .5 ? 1 : -1) * 1, w: o.w || rr(4, 7), dur: o.dur || .28, tail: .75, sty, col, col2: o.col2, wave: o.wave || 0, drops: o.drops || 2 }); }); }
  function flyingCrescent(f, col, sty = 0, o = {}) { const b = tg(f); later(o.d0 || .2, () => { const d = dd(f, b), s = side(d);
      arc({ c0: hand(f), c1: chest(b), x: d, y: o.flat ? s : UP, r: o.r || 12, a0: -1.25, a1: 1.25, w: o.w || 9, dur: o.dur || .45, full: true, sty, col, col2: o.col2, drops: o.drops || 2 }); }); }
  function helixDragon(f, col, col2, sty, o = {}) { const b = tg(f); later(o.d0 || .15, () => { const a = chest(f).add(V3(0, 4, 0)), c = chest(b), d = c.clone().sub(a);
      const s = side(d.clone().normalize()); arc({ c0: a, c1: a, x: s, y: UP, r: o.r || 7, a0: 0, a1: 6.283 * (o.turns || 3), w: o.w || 7, dur: o.dur || .7, tail: .6, sty, col, col2, h: d, wave: 1, drops: o.drops || 3 }); }); }
  function petalRiver(f, dur, cols, k = 6) { const b = tg(f); during(dur, .03, el => { const a = f.pos.clone().add(V3(0, 12, 0)), c = chest(b), d = c.clone().sub(a).normalize();
      for (let i = 0; i < k * busy(); i++) { const ang = rr(0, 6.28), r = rr(2, 9), p = a.clone().add(V3(Math.cos(ang) * r, Math.sin(ang) * r, rr(-4, 4))); emit(p, d.clone().multiplyScalar(rr(160, 260)).add(rnd(40)), rr(.7, 1.1), rr(2, 3.4), 6, pick(cols), 0); } }); }
  function skyBolts(b, n, col, gap = .12, w = 7) { for (let i = 0; i < n; i++) later(i * gap, () => { const p = b.pos; bolt(V3(p.x + rr(-25, 25), 260, p.z + rr(-25, 25)), () => chest(b), col, .32, w, 5, .17); ground(b.pos, 2.2, 'bolt'); }); }
  function mist(p, dur, col, r = 30) { during(dur, .06, () => { for (let i = 0; i < 2 * busy(); i++) emit(p.clone().add(V3(rr(-r, r), rr(0, 14), rr(-r, r))), V3(rr(-8, 8), rr(0, 6), rr(-8, 8)), rr(1.6, 2.4), rr(16, 26), 2, col, 0); }); }
  function blackFlames(get, dur, rim = '#7a1040', r = 6) { during(dur, .05, () => { const p = get(); for (let i = 0; i < 3 * busy(); i++) emit(V3(p.x + rr(-r, r), rr(1, 22), p.z + rr(-r, r)), V3(rr(-6, 6), rr(18, 40), rr(-6, 6)), rr(.5, .9), rr(6, 11), 7, rim, -10); }); }
  function smokePuff(p, n = 16, col = '#f2f2f2', s = 1) { for (let i = 0; i < n * busy(); i++) emit(p.clone().add(rnd(4 * s)), rnd(30 * s), rr(.6, 1), rr(8, 13) * s, 2, col, -4); }

  // ── 기술 이름 → 원작 재현 덧입힘 (위에서부터 먼저 맞는 것 하나) ──
  const R = [
    { re: /나선수리검/, cast(f) { during(.9, .1, () => { const h = hand(f); arc({ c0: h, x: V3(1, 0, 0), y: V3(0, 0, 1), r: rr(5, 7), a0: rr(0, 6), a1: rr(0, 6) + 6.28, w: 3, dur: .16, tail: .9, sty: 5, col: '#e4f8ff' }); for (let i = 0; i < 6; i++) { const a = rr(0, 6.28); streak(h.clone().add(V3(Math.cos(a) * 5, rr(-1, 1), Math.sin(a) * 5)), V3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(200), .1, .05, 2, '#ffffff'); } });
        flyingCrescent(f, '#dff6ff', 5, { d0: .9, flat: true, r: 9, w: 6, drops: 3 }); },
      hit(a, b, p) { for (let i = 0; i < 90 * busy(); i++) { const n = rnd(1).normalize(), r = rr(3, 22), q = p.clone().addScaledVector(n, r), t = n.clone().cross(UP).normalize(); streak(q, t.multiplyScalar(rr(150, 280)), rr(.12, .22), .04, rr(1, 2), Math.random() < .6 ? '#ffffff' : '#9fe0ff', 0, rr(0, .5)); }
        dustRing(b.pos, 30, 30); ground(b.pos, 3, 'wind'); } },
    { re: /나선환|미수옥/, cast(f, nm) { const big = /대옥|초대/.test(nm); during(.85, .03, () => { const h = hand(f), r = big ? 9 : 4.5; for (let i = 0; i < 3; i++) { const a = rr(0, 6.28), e = rr(-1, 1), n = V3(Math.cos(a), e, Math.sin(a)).normalize(), t = n.clone().cross(V3(rr(-.3, .3), 1, rr(-.3, .3))).normalize();
          streak(h.clone().addScaledVector(n, r), t.multiplyScalar(r * 30), .1, .05, 1.8, Math.random() < .5 ? '#ffffff' : '#7ac0ff'); emit(h.clone().addScaledVector(n, r * 2), n.clone().multiplyScalar(-r * 6), .18, 3, 0, '#9fd8ff'); } }); },
      hit(a, b, p) { const d = dd(a, b), s = side(d), u = s.clone().cross(d).normalize(); for (let i = 0; i < 46 * busy(); i++) { const ang = i / 46 * 6.283 * 3, r = 2 + i * .25, v = s.clone().multiplyScalar(Math.cos(ang)).addScaledVector(u, Math.sin(ang));
          streak(p.clone().addScaledVector(v, r), v.clone().cross(d).multiplyScalar(200).addScaledVector(d, 120), .25, .06, 2.2, i % 3 ? '#9fd8ff' : '#ffffff'); } ground(b.pos, 2.2, 'wind'); } },
    { re: /기린|인드라|비룡격적|뇌명포|육장광뢰/, cast(f) { const b = tg(f); later(.3, () => skyBolts(b, /기린|인드라/.test(f.__nm || '') ? 5 : 3, '#d8ecff')); } },
    { re: /치도리|라이키리|자전/, cast(f) { during(1, .05, () => { const h = hand(f); bolt(h, h.clone().add(V3(rr(-10, 10), rr(-12, 6), rr(-10, 10))), '#4a9aff', .09, 2.4, 1, .32); streak(h, rnd(150), .14, .04, 1.4, '#ffffff'); });
        during(.6, .06, () => { const p = f.pos; if (p.y < 3) { streak(V3(p.x, .6, p.z), V3(rr(-30, 30), rr(20, 60), rr(-30, 30)), .3, .05, 1.5, '#9fd0ff', 200); } }, .3); },
      hit(a, b, p) { for (let i = 0; i < 4; i++) bolt(p, p.clone().add(rnd(30)), '#cfe8ff', .2, 3.5, 2); ground(b.pos, 1.9, 'bolt'); } },
    { re: /화뢰신|벼락의 호흡|번개의 호흡|벽력일섬|잠든 일섬/, cast(f) { const b = tg(f); later(.12, () => { for (let i = 0; i < 4; i++) later(i * .06, () => bolt(() => chest(f), () => chest(b), '#ffd040', .22, 5, 4, .16));
        helixDragon(f, '#ffd040', '#ff9a10', 3, { d0: 0, r: 6, turns: 2, dur: .45, w: 6 }); speedLines(f, b, 26, '#ffe070'); }); },
      hit(a, b, p) { for (let i = 0; i < 3; i++) bolt(p, p.clone().add(rnd(26)), '#ffd040', .2, 3.5, 2); ground(b.pos, 2.4, 'light'); } },
    { re: /아마테라스|시라누이|가구츠치|염둔/, cast(f) { const b = tg(f); later(.25, () => { blackFlames(() => b.pos, 2.6, '#8a1040', 6); if (/가구츠치|염둔/.test(f.__nm || '')) blackFlames(() => b.pos.clone().add(V3(0, 0, 0)), 1.8, '#a01848', 16); }); } },
    { re: /수사노오|토츠카|야사카니|야타|천총운검|팔척경/, cast(f) { auraFlame(f, 1.6, f.ch && /이타치/.test(f.ch.name || '') ? '#ff4060' : '#b050ff', 46, 5); during(1.4, .1, () => streak(f.pos.clone().add(V3(rr(-14, 14), rr(20, 50), rr(-14, 14))), V3(0, 120, 0), .4, .1, 3, '#d8a0ff')); } },
    { re: /화둔|호화구|봉선화|적화포|초고열|용선화|반딧불 화/, cast(f) { const b = tg(f); flameStream(() => headP(f), () => chest(b), .6, ['#ff6a10', '#ff8a20', '#ffb040', '#ff4a10'], 10, 4, .2); },
      hit(a, b, p) { elemBurst(p, 'fire', 1.4); ground(b.pos, 2.2, 'fire'); } },
    { re: /소각|감마|나선 소각/, cast(f, nm) { const b = tg(f), g = /감마/.test(nm); flameStream(() => hand(f), () => chest(b), .7, g ? ['#9aff6a', '#d8ffb0', '#5aff4a'] : ['#ff7a20', '#ffb050', '#ffe0a0'], 12, 5, .2);
        during(.7, .03, () => speedLines(f, b, 3, g ? '#d8ffb0' : '#fff0c0', 4), .2); }, hit(a, b, p) { ground(b.pos, 2.6, 'fire'); } },
    { re: /화권|불꽃 몸|대염계|염제|화창|염상망|화염 돌진/, cast(f) { const b = tg(f); flameStream(() => hand(f), () => chest(b), .55, ['#ff5a10', '#ff7a20', '#ffa040'], 16, 6, .15); auraFlame(f, .9, '#ff6a10', 30, 3); },
      hit(a, b, p) { elemBurst(p, 'fire', 2); ground(b.pos, 2.6, 'fire'); } },
    { re: /디아블|이프릿|플람베|파티 테이블|콘카세|앙티엠|레드 호크|콜리어/, cast(f, nm) { const leg = !/레드 호크/.test(nm); during(1.1, .03, () => { const p = leg ? f.pos.clone().add(V3(0, 5, 0)).addScaledVector(fwdOf(f), 3) : hand(f);
        for (let i = 0; i < 3 * busy(); i++) emit(p.clone().add(rnd(2.5)), V3(rr(-10, 10), rr(15, 40), rr(-10, 10)), rr(.3, .5), rr(4, 7), 1, /이프릿/.test(nm) ? '#4aa0ff' : '#ff4a10', -20); }); },
      hit(a, b, p) { elemBurst(p, 'fire', 1.3); } },
    { re: /수룡|생생유전|수교|빙룡선미|대홍련|빙륜환/, cast(f, nm) { const ice = /빙/.test(nm); helixDragon(f, ice ? '#c8f4ff' : '#4aa0ff', ice ? '#4a90c0' : '#0a3a90', 2, { r: 9, turns: 2.5, w: 8, dur: .75, drops: 4 }); if (ice) mist(f.pos, 1, '#e8f6ff', 20); },
      hit(a, b, p, ek) { elemBurst(p, ek === 'ice' ? 'ice' : 'water', 1.6); if (ek === 'ice' && window.__env) __env.spike(b.pos, 7, 14, 12, 'ice'); ground(b.pos, 2, ek === 'ice' ? 'ice' : 'water'); } },
    { re: /잔잔한 물결/, cast(f) { arc({ c0: f.pos.clone().add(V3(0, 6, 0)), x: V3(1, 0, 0), y: V3(0, 0, 1), r: 18, a0: 0, a1: 6.283, w: 6, dur: .9, tail: 1, sty: 2, col: '#6ac0ff', col2: '#0c3c8c', wave: 1, drops: 3 }); mist(f.pos, .8, '#dceef8', 18); } },
    { re: /물의 호흡|수둔/, cast(f) { slashArcs(f, 3, '#5ab0ff', 2, { col2: '#0c3c8c', wave: 1, drops: 3, r: 15, w: 7, dur: .32 }); } },
    { re: /일훈의 용|히노카미|해의 호흡/, cast(f, nm) { if (/용/.test(nm)) helixDragon(f, '#ff6a10', '#a01000', 1, { r: 9, turns: 3, w: 9, dur: .8, drops: 2 }); else slashArcs(f, 3, '#ff6a20', 1, { col2: '#b01000', drops: 2, r: 15, w: 8 }); },
      hit(a, b, p) { elemBurst(p, 'sun', 1.5); ground(b.pos, 2.2, 'sun'); } },
    { re: /불꽃의 호흡|연옥/, cast(f) { const b = tg(f); later(.15, () => { const d = dd(f, b); arc({ c0: chest(f).addScaledVector(d, 10), x: side(d), y: d, r: 24, a0: -1.9, a1: 1.9, w: 14, dur: .4, tail: .9, sty: 1, col: '#ff7a20', col2: '#c02000', drops: 3 }); });
        flameStream(() => chest(f), () => chest(b), .45, ['#ff5a10', '#ff8a20', '#ffc050'], 18, 7, .25); }, hit(a, b, p) { elemBurst(p, 'fire', 2); ground(b.pos, 3, 'fire'); } },
    { re: /바람의 호흡|선풍|강풍|회오리|풍둔|마신 강풍|진사바람|바람 돌진|조풍/, cast(f) { slashArcs(f, 3, '#c8ffe0', 5, { r: 14, w: 5, gap: .1 }); during(.9, .04, () => { const p = f.pos; for (let i = 0; i < 3; i++) { const a = rr(0, 6.28), r = rr(6, 16); streak(V3(p.x + Math.cos(a) * r, rr(.5, 10), p.z + Math.sin(a) * r), V3(-Math.sin(a), .3, Math.cos(a)).multiplyScalar(220), .18, .06, 1.6, '#e8fff0'); } emit(V3(p.x + rr(-12, 12), 1, p.z + rr(-12, 12)), V3(rr(-30, 30), rr(10, 30), rr(-30, 30)), .9, 8, 4, '#8a7460'); }); } },
    { re: /바위의 호흡|대분쇄|토둔|토류벽|철구 낙하|괴력 내려찍기|와륜형부|쇠사슬/, cast(f) { const b = tg(f); later(.3, () => { if (window.__env) { __env.heave(f.pos, dirTo(f, b), Math.min(90, f.pos.distanceTo(b.pos)), 'earth'); __env.spike(b.pos, 8, 16, 14, 'earth'); } ground(b.pos, 3, 'earth'); dustCol(b.pos, 90, 14); }); } },
    { re: /벌레의 호흡|나비/, cast(f) { petalRiver(f, .9, ['#c890ff', '#ead8ff', '#ffffff', '#8a5ad0'], 4); } },
    { re: /센본자쿠라|천본앵|경엄|카게요시|앵화충/, cast(f) { petalRiver(f, 1.5, ['#ffb0d0', '#ffd0e4', '#ff80b0', '#ffffff'], 8); } },
    { re: /안개의 호흡|등꽃|팔중 안개|흐린 하늘/, cast(f, nm) { mist(f.pos, 1.3, /등꽃/.test(nm) ? '#e0c8f0' : '#e8eef4', 26); mist(tg(f).pos, 1.3, /등꽃/.test(nm) ? '#d8b8f0' : '#e8eef4', 18); slashArcs(f, 2, '#f0f6ff', 5, { r: 13 }); } },
    { re: /소리의 호흡|음파|폭약|보면 완성|화려 폭발|쌍검 돌진/, cast(f) { const b = tg(f); for (let i = 0; i < 5; i++) later(.15 + i * .1, () => { const p = lerpP(chest(f), chest(b), (i + 1) / 5); elemBurst(p, 'fire', .6); airBurst(p, dd(f, b), 18, '#ffe080', 140); dustRing(V3(p.x, 0, p.z), 10, 10); }); } },
    { re: /뱀의 호흡|독뱀|뱀 꼬리/, cast(f) { const b = tg(f); for (let i = 0; i < 3; i++) later(.12 + i * .12, () => { const d = dd(f, b); arc({ c0: chest(f).addScaledVector(d, 12 + i * 8), x: side(d), y: d, r: 10, a0: -2, a1: 2, w: 4, dur: .3, tail: .9, sty: 0, col: '#e0d0ff', wave: 3 }); }); } },
    { re: /짐승의 호흡/, cast(f) { slashArcs(f, 6, '#d0d8e0', 0, { gap: .06, r: 10, w: 3, dur: .18 }); } },
    { re: /혈귀술|폭혈|혈귀화/, cast(f) { const b = tg(f); for (let i = 0; i < 4; i++) later(.2 + i * .12, () => { const p = b.pos.clone().add(V3(rr(-14, 14), rr(4, 20), rr(-14, 14))); for (let j = 0; j < 14 * busy(); j++) emit(p, rnd(50), rr(.4, .7), rr(5, 9), 1, '#ff2a6a', -20); emit(p, V3(), .2, 30, 0, '#ff6a9a'); }); } },
    { re: /진지한|보통 펀치|보통 꿀밤|마신/, cast(f, nm) { const b = tg(f), serious = /진지한/.test(nm); later(.25, () => { const d = dirTo(f, b), s = side(d), n = serious ? 170 : 50;
        for (let i = 0; i < n * busy(); i++) { const sp = rr(.05, serious ? .5 : .2); streak(chest(f).addScaledVector(s, rr(-4, 4)), d.clone().addScaledVector(s, rr(-sp, sp)).add(V3(0, rr(-sp, sp) * .6, 0)).normalize().multiplyScalar(rr(500, 900)), rr(.4, .8), .08, rr(2, 5), Math.random() < .7 ? '#ffffff' : '#ffe8b0'); }
        if (serious) { shock(chest(f).addScaledVector(d, 30), d, 120, '#ffffff', .6); shock(V3(f.pos.x, 1, f.pos.z), V3(0, 1, 0), 140, '#e8e0d0', .8, .1); for (let i = 0; i < 8; i++) later(i * .05, () => { const q = f.pos.clone().addScaledVector(d, 25 + i * 28); crack(q, 16, 'power', { glow: null, grow: .12, dur: 6 }); dustRing(q, 16, 16); gravel(q, 10, 1.2); });
          for (let i = 0; i < 30 * busy(); i++) { const a = rr(0, 6.28); emit(V3(f.pos.x + d.x * 160 + Math.cos(a) * 30, 150, f.pos.z + d.z * 160 + Math.sin(a) * 30), V3(Math.cos(a) * 120, 0, Math.sin(a) * 120), 2.5, 40, 2, '#c8ccd8', 0); }
          floatRocks(f.pos, 14, 40, .4); } else { airBurst(chest(b), d, 30); ground(b.pos, 2, 'power'); } }); } },
    { re: /고무고무 개틀링|난타|연타|연속|광속 연타|초고속|쌍절곤/, cast(f) { const b = tg(f); for (let i = 0; i < 7; i++) later(.15 + i * .1, () => { speedLines(f, b, 8); airBurst(chest(b).add(rnd(5)), dd(f, b), 10, '#ffffff', 120); }); } },
    { re: /고무고무|킹콩|정권|로켓 펀치|괴력 주먹|부스터|연속 할퀴기/, cast(f) { const b = tg(f); later(.2, () => { speedLines(f, b, 24); airBurst(chest(b), dd(f, b), 28); dustRing(b.pos, 12, 12); }); } },
    { re: /기어 세컨드|기어 5|해방의 북소리|팔문|경문|낮 호랑이|아침 공작|밤가이|천년살/, cast(f, nm) { const g5 = /기어 5|해방/.test(nm);
        during(1.6, .05, () => { for (let i = 0; i < 2 * busy(); i++) emit(f.pos.clone().add(V3(rr(-6, 6), rr(4, 22), rr(-6, 6))), V3(rr(-8, 8), rr(25, 50), rr(-8, 8)), rr(.8, 1.3), rr(6, 10), 2, g5 ? '#ffffff' : /팔문|경문|밤가이|낮|아침/.test(nm) ? '#d8ffd8' : '#f4f0ee', -6); });
        if (g5) during(1.4, .08, () => emit(f.pos.clone().add(rnd(14)).add(V3(0, 14, 0)), rnd(20), .6, 5, 0, '#ffffff'));
        if (/아침 공작/.test(nm)) { const b = tg(f); later(.3, () => { for (let i = 0; i < 5; i++) later(i * .08, () => flameStream(() => hand(f), () => chest(b).add(rnd(10)), .15, ['#ff7a20', '#ffb040', '#fff0a0'], 8, 6)); }); }
        if (/낮 호랑이/.test(nm)) { const b = tg(f); later(.4, () => { airBurst(chest(b), dd(f, b), 60, '#ffffff', 260); ground(b.pos, 3, 'power'); }); } } },
    { re: /파운드 포|비참|구도류|아수라|삼도류|삼천세계|노자라시|라디오 나이프|귀참|사자 노래|우시바리|이도류|난도질|십자화|공중 연격|스카이 워크|순보 찌르기|천쇄참월|종경|백제검/, cast(f, nm) { if (/파운드 포/.test(nm)) flyingCrescent(f, '#d8fff0', 5, { flat: true, r: 10, w: 5 }); else slashArcs(f, /아수라|구도류|천쇄|난도질/.test(nm) ? 5 : 3, /종경|백제/.test(nm) ? '#fff6c0' : '#e8fff0', 0, { gap: .09 }); },
      hit(a, b, p) { for (let i = 0; i < 18 * busy(); i++) streak(p, rnd(1).normalize().multiplyScalar(rr(120, 240)), rr(.3, .5), .04, 1.6, pick(['#fff4d0', '#ffd070']), 380); } },
    { re: /무월/, cast(f) { const b = tg(f); later(.4, () => { during(1.3, .03, () => { const p = b.pos; for (let i = 0; i < 4 * busy(); i++) emit(V3(p.x + rr(-12, 12), rr(0, 220), p.z + rr(-12, 12)), V3(rr(-10, 10), rr(40, 90), rr(-10, 10)), rr(.5, .9), rr(10, 18), 7, '#3a1030', 0); }); ground(b.pos, 3.5, 'dark'); }); } },
    { re: /흑 월아천충|월아천충/, cast(f, nm) { const dark = /흑|최후/.test(nm) || (f.mode > 0); flyingCrescent(f, dark ? '#ff2030' : '#9fd8ff', dark ? 4 : 0, { r: 13, w: 10, dur: .42, drops: 3 }); if (/연사/.test(nm)) for (let i = 1; i < 3; i++) flyingCrescent(f, dark ? '#ff2030' : '#9fd8ff', dark ? 4 : 0, { d0: .2 + i * .18, r: 11, w: 8 }); },
      hit(a, b, p) { elemBurst(p, 'getsuga', 1.4); ground(b.pos, 2.4, 'getsuga'); } },
    { re: /반카이|만해|영압 폭발|붕옥|살기|괴인화|괴인 각성|선인 모드|구미|차크라 모드|귀화|거대화|우주적 공포/, cast(f, nm) { const c = /반카이!|영압|살기|귀화|우주/.test(nm) ? '#ff2a3a' : elemC(f);
        pillar(f, 1.4, c); auraFlame(f, 1.4, c, 36, 4, /반카이!|귀화/.test(nm) ? 7 : 1); floatRocks(f.pos, 16, 34, 1.5); crack(f.pos, 26, f.elem || 'power', { grow: .6, dur: 6 }); dustRing(f.pos, 26, 28); } },
    { re: /빙천|군조빙주|육의 빙결|얼음|하쿠카|월백|백련|백도|천상옥좌|소데노|서리/, cast(f) { const b = tg(f); mist(f.pos, 1.1, '#eef8ff', 18); later(.35, () => { mist(b.pos, 1, '#e8f6ff', 14); if (window.__env) __env.spike(b.pos, 8, 14, 13, 'ice'); for (let i = 0; i < 26 * busy(); i++) streak(chest(b), rnd(1).normalize().multiplyScalar(rr(80, 170)), .5, .04, 2.6, pick(['#ffffff', '#c8f0ff', '#8ad0ff']), 120); }); } },
    { re: /사막 장송|사박궤|사박|모래|사막|사둔|유사 폭류/, cast(f, nm) { const b = tg(f); during(1.3, .03, () => { const p = b.pos; for (let i = 0; i < 4 * busy(); i++) { const a = rr(0, 6.28), r = rr(5, 16); emit(V3(p.x + Math.cos(a) * r, rr(0, 26), p.z + Math.sin(a) * r), V3(-Math.sin(a) * 60, rr(10, 30), Math.cos(a) * 60), rr(.6, 1), rr(5, 9), 4, pick(['#d8b878', '#c8a060', '#e8d098']), 0); } });
        if (/쓰나미|폭류/.test(nm)) during(.8, .04, el => { const q = lerpP(f.pos, b.pos, el); dustCol(q, 70, 3); gravel(q, 3); });
        if (/장송|대장|사박궤/.test(nm)) later(1.1, () => { ground(b.pos, 3, 'sand'); dustCol(b.pos, 80, 16); }); } },
    { re: /염동|초능력|바위 던지기|대압살/, cast(f, nm) { const b = tg(f); during(1.2, .06, () => { for (let i = 0; i < 2; i++) emit(f.pos.clone().add(rnd(12)).add(V3(0, 14, 0)), rnd(16), .7, 6, 0, '#60ff9a'); }); during(1.5, .03, el => { const p = X.palm && X.palm(f) ? f.pos : f.pos; for (let i = 0; i < 2 * busy(); i++) { const a = rr(0, 6.28) + el * 9, r = rr(4, 8), q = p.clone().add(V3(Math.cos(a) * r, rr(2, 22), Math.sin(a) * r)); emit(q, V3(-Math.sin(a) * 20, rr(8, 20), Math.cos(a) * 20), rr(.35, .55), rr(3, 5), 1, '#30e070', -15); if (Math.random() < .35) streak(q, V3(-Math.sin(a) * 110, 30, Math.cos(a) * 110), .18, .06, 1.6, '#b0ffd0'); } }); floatRocks(f.pos, 12, 30, 1.1);
        if (/대압살|압축/.test(nm)) later(.5, () => { crack(b.pos, 34, 'psychic', { grow: .25 }); dustRing(b.pos, 30, 30); if (window.__env) __env.crater(V3(b.pos.x, 0, b.pos.z), 22); }); } },
    { re: /빛의 비/, cast(f) { const b = tg(f); during(1.1, .06, () => { const p = b.pos.clone().add(V3(rr(-40, 40), 0, rr(-40, 40))); streak(V3(p.x, 240, p.z), V3(0, -900, 0), .28, .06, 5, '#fff6b0'); later(.26, () => { emit(V3(p.x, 2, p.z), V3(), .3, 26, 0, '#fff080'); crack(p, 8, 'light', { grow: .1, dur: 3 }); }); }); } },
    { re: /광선|빛|광속|키자루/, cast(f) { const b = tg(f); later(.15, () => { for (let i = 0; i < 8 * busy(); i++) streak(hand(f), dd(f, b).multiplyScalar(1200), .35, .03, 6, i % 2 ? '#ffffff' : '#fff080'); emit(hand(f), V3(), .3, 30, 0, '#fff6b0'); }); } },
    { re: /허화|세로|파도|적화포|흑관/, cast(f, nm) { const b = tg(f); if (/흑관/.test(nm)) later(.4, () => blackFlames(() => b.pos, 1.2, '#301040', 10));
        else { const c = /허화|세로/.test(nm) ? '#ff2a3a' : /뇌/.test(nm) ? '#bfe0ff' : '#ffd060'; later(.2, () => during(.45, .03, () => { streak(hand(f), dd(f, b).multiplyScalar(700).add(rnd(30)), .3, .04, 4, Math.random() < .5 ? '#ffffff' : c); emit(hand(f), dd(f, b).multiplyScalar(500), .3, 7, 0, c); })); } } },
    { re: /카무이/, cast(f) { const b = tg(f); later(.2, () => during(.8, .03, () => { const p = chest(b); for (let i = 0; i < 4; i++) { const a = rr(0, 6.28), r = rr(12, 22), q = p.clone().add(V3(Math.cos(a) * r, rr(-6, 6), Math.sin(a) * r)); streak(q, p.clone().sub(q).multiplyScalar(4).add(V3(-Math.sin(a) * 80, 0, Math.cos(a) * 80)), .25, .06, 2, '#a060ff'); } })); } },
    { re: /츠쿠요미|월독|경화수월|완전최면/, cast(f) { const b = tg(f); during(1.4, .05, () => emit(chest(b).add(rnd(16)), V3(0, rr(10, 30), 0), 1, 4, 0, '#ff2030')); blackFlames(() => b.pos, 1.2, '#600010', 14); } },
    { re: /분신술|까마귀|구치요세|카츠유|닌견/, cast(f, nm) { if (/까마귀/.test(nm)) for (let i = 0; i < 30 * busy(); i++) emit(chest(f), rnd(90), rr(.9, 1.5), 3, 6, '#1a1020', 30); smokePuff(f.pos.clone().add(V3(0, 8, 0)), 20, '#f2f2f2', 1.2); } },
    { re: /룸|샴블즈|메스|감마나이프|인젝션|타쿠트|카운터 쇼크/, cast(f, nm) { if (/룸/.test(nm)) arc({ c0: f.pos.clone().add(V3(0, 2, 0)), x: V3(1, 0, 0), y: V3(0, 0, 1), r: 60, a0: 0, a1: 6.283, w: 3, dur: 1.2, tail: 1, sty: 0, col: '#7ab0ff' });
        if (/카운터 쇼크|감마/.test(nm)) { const b = tg(f); later(.3, () => { for (let i = 0; i < 4; i++) bolt(chest(b), chest(b).add(rnd(20)), '#bfe0ff', .25, 3, 2); }); } } },
    { re: /사랑의 호흡|연정|연묘|사랑의 연격|하트 돌진|사랑바람/, cast(f) { slashArcs(f, 4, '#ff8ac8', 0, { wave: 3, r: 16, w: 3, gap: .1, dur: .3 }); petalRiver(f, .6, ['#ff9ad0', '#ffd0e8', '#ffffff'], 3); } },
    { re: /유수|수류|물결 장풍|암쇄|흐르는 물|류암/, cast(f) { slashArcs(f, 4, '#e8f6ff', 2, { r: 8, w: 3, wave: 1, gap: .08, dur: .24, fwd: 3, col2: '#8ac8f0', drops: 1 }); const b = tg(f); later(.45, () => airBurst(chest(b), dd(f, b), 22, '#e8f6ff', 160)); } },
    { re: /검팔|쌍수 일격|해골 영압|영압 해방/, cast(f) { pillar(f, 1.2, '#ffe040'); auraFlame(f, 1.2, '#ffd020', 40, 4); const b = tg(f); later(.5, () => ground(b.pos, 3, 'light')); } },
    { re: /백호인/, cast(f) { auraFlame(f, 1.2, '#c060ff', 30, 4); crack(f.pos, 20, 'dark', { grow: .5 }); } },
    { re: /용 말기|대용 말기/, cast(f) { helixDragon(f, '#ff4a5a', '#300010', 4, { r: 8, turns: 2.5, w: 8, dur: .7 }); } },
    { re: /하늘 걷기|순보/, cast(f) { during(.5, .03, () => { emit(f.pos.clone().add(V3(rr(-3, 3), rr(0, 18), rr(-3, 3))), V3(), .25, 6, 0, '#e8eef8'); }); smokePuff(f.pos.clone().add(V3(0, 2, 0)), 8, '#d8d0c8', .6); } },
    { re: /거인의 총|사쿠라 돌격|머리박기|돌격|발차기|다이나믹 엔트리|괴력/, cast(f, nm) { const b = tg(f); later(.25, () => { speedLines(f, b, 20); airBurst(chest(b), dd(f, b), 30); ground(b.pos, /거인|사쿠라|괴력/.test(nm) ? 2.8 : 1.6, 'power'); }); } },
    { re: /수리검|쿠나이|독침|난반사|모래 수리검|투척/, cast(f) { const b = tg(f); later(.2, () => { for (let i = 0; i < 5; i++) streak(hand(f).add(rnd(2)), dd(f, b).multiplyScalar(600).add(rnd(30)), .3, .04, 1.6, '#e8eef8'); }); } },
    { re: /의료 인술|장선술/, cast(f) { during(1, .05, () => emit(hand(f).add(rnd(3)), V3(0, 10, 0), .6, 4, 0, '#60ff9a')); } },
    { re: /건물 던지기|테이블 뒤집기|옆뛰기|박수/, cast(f) { const b = tg(f); later(.3, () => { ground(f.pos, 2.4, 'power'); airBurst(chest(f), dd(f, b), 40, '#ffffff', 260); }); } },
  ];
  window.__fx3.recipes = R.length;
  const find = nm => { for (const r of R) if (r.re.test(nm)) return r; return null; };
  X.find = find;
  X.pre = X.pre || []; const preFind = nm => { for (const r of X.pre) if (r.re.test(nm)) return r; return null; }; // fx3-plus 의 고도화 처리(먼저, also 면 기본도 함께)
  X.onCast = (f, nm, ult) => { if (!f || !f.pos) return; const n2 = nm.replace(/!$/, ''), p = preFind(n2); f.__nm = nm; if (p && p.cast) { try { p.cast(f, nm, ult); } catch (e) { console.error(e); } if (!p.also) return; } const r = find(n2); if (!r || !r.cast) return; r.cast(f, nm, ult); };
  X.onHit = (a, b, nm, ek, o, p, pw) => { if (!p || !b || !b.pos) return; const pr = preFind(String(nm)); const r = pr && pr.hit && !pr.also ? pr : find(String(nm)); if (pr && pr.hit && pr.also) { try { pr.hit(a, b, p, ek, o, pw); } catch (e) { console.error(e); } } if (!r || !r.hit) return; const key = (a ? a.id || '' : '') + nm; const t = X.now(); if ((hitT[key] || 0) > t - .25) return; hitT[key] = t; r.hit(a, b, p, ek, o, pw); };
  const hitT = {};
  // ═══ 필살기 템포: 일반 기술·기본 공격은 그대로, 필살기(callout(..., true))만 준비 1.45배·발동 1.35배·여운 1.4배 + 발동 순간 짧은 정지·카메라 집중 + 다른 레인 잠깐 느리게 ═══
  const ULT_RE = /callout\(\s*[\w.]+\s*,\s*('[^']*'|"[^"]*"|[\w.]+)\s*,\s*true\s*\)/, MUL = { pre: 1.45, cast: 1.35, post: 1.4 };
  function wrapUlt(fn) { if (fn.__fx3u || !ULT_RE.test(fn.toString())) return fn;
    const w = function () { const s = fn.apply(this, arguments); try { if (Array.isArray(s) && s.length) { let ci = s.findIndex(x => x && x.fx && ULT_RE.test(x.fx.toString())); if (ci < 0) ci = 0; s.forEach((x, i) => { if (x && typeof x === 'object') x.__ult = i < ci ? 'pre' : i === ci ? 'cast' : 'post'; }); } } catch (e) { } return s; };
    w.toString = () => fn.toString(); w.__fx3u = true; return w; }
  let nUlt = 0; const wrapAll = () => { if (typeof CH === 'undefined') return; nUlt = 0; Object.values(CH).forEach(c => { if (!c.skills) return; for (const k of Object.keys(c.skills)) { const w = wrapUlt(c.skills[k]); if (w !== c.skills[k]) c.skills[k] = w; if (c.skills[k].__fx3u) nUlt++; } }); window.__fx3.ults = nUlt; };
  wrapAll(); setTimeout(wrapAll, 2000);
  const focus = { until: 0, fs: null };
  if (typeof runStep === 'function') { const _rs = runStep; runStep = function (s) { const ph = s && s.__ult; if (!ph) return _rs.apply(this, arguments);
      const k = MUL[ph] * rr(.95, 1.08); if (typeof s.d === 'number') { const d0 = s.d; s.d = d0 * k; try { var r = _rs.apply(this, arguments); } finally { s.d = d0; } } else r = _rs.apply(this, arguments) * (ph === 'pre' ? 1 : k);
      const fs = s.acts ? s.acts.map(a => a[0]).filter(Boolean) : []; focus.until = X.now() + r + (ph === 'post' ? .25 : .6); focus.fs = fs; return r; }; }
  if (typeof laneTick === 'function') { const _lt = laneTick; laneTick = function (dt) { try { if (X.now() < focus.until && focus.fs && typeof lanes !== 'undefined') lanes.forEach(L => { if (!L.fs.some(f => focus.fs.includes(f))) L.t += dt * .7; }); } catch (e) { } return _lt.apply(this, arguments); }; }
  const _co = callout; callout = function (f, text, ult) { const r = _co.apply(this, arguments); if (ult && f) { try { if (window.__fx2) __fx2.hs = Math.max(__fx2.hs || 0, .2); if (typeof shot === 'function' && f.target) shot('ult', 3.4, f, f.target); focus.until = X.now() + 1.6; focus.fs = [f, f.target].filter(Boolean); } catch (e) { console.error(e); } } return r; };
})();
