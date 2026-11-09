// fx-epic.js — FX·파티클·광원 고도화 층(11-09 지시: 모델링보다 이펙트/파티클/광원 10단계+, 끊김 없이).
// 기존 체계(arena fx=add/parts, FX3 GPU 파티클·줄기·shock·crack, fx3-cine 선택 블룸, aaa 후처리) 위에
// 새로운 연출만 얹는다 — 렌더 파이프 유지, 전부 풀·프레임 예산·자동 강등로 끊김 금지.
// ① 플레어 풀(광원): 맞음·폭발·시전·각성·격돌 순간 스프라이트 flare + 점광 강화
// ② 충격파(X.shock 방사 왜곡): 중간 이상 맞음 전부, 큰 폭발·필살기는 3겹 시차
// ③ 광기둥: 시전자·각성자·큰 폭발 위에 가늘고 긴 pillar
// ④ 방향성 불똥: 모든 wound — GPU 줄기(반) + 속도선 파티클(반), 예산으로 절반/정지
// ⑤ 돌진·각성 잔상줄기: 가속 중인 발뒤꿈치 뒤로 streak + 먼지
// ⑥ 블룸 확장: makeFx 도형도 빛번짐 층(3)에 태깅(fx3-cine 과 협업)
// 자동 관리자: 낮음=끄기 · ftAvg>23=중단 · >18=절반 · EP.budget 프레임당 리셋.
(function () {
  if (typeof wound !== 'function' || typeof makeFx !== 'function' || !window.FX3 || typeof scene3 === 'undefined') return;
  const X = window.FX3, EP = window.EPIC_FX = { on: true, hits: 0, shocks: 0, flares: 0, shafts: 0, trails: 0, blocks: 0, ults: 0, budget: 0, skipped: 0 };
  const QF = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  const FT = () => (typeof ftAvg !== 'undefined' ? ftAvg : 16);
  const gate = () => { if (!EP.on || QF() === 'low' || FT() > 20 || EP.budget <= 0) { EP.skipped++; return false; } return true; };
  const half = () => FT() > 15 ? .5 : 1; // 11-09: 충돌 프레임 스파이크 완화 — 60fps 부근에서도 반감으로 선제 감축
  const rr = X.rr;
  const EL = k => (window.ELEM && ELEM[k]) || { c: '#ffd890', parts: ['#ffffff', '#ffd890'] };
  const chestP = f => (typeof chest === 'function' && f && f.pos) ? chest(f) : null;
  const nowS = () => performance.now() / 1000;

  // ── ① 플레어 풀(광원 스프라이트, 블룸 층 태깅) ──
  const FL = [], FL_MAX = 12;
  function flare(p, c, s, life) {
    if (!p || !gate()) return;
    let f = FL.find(x => x.life <= 0);
    if (!f) { if (FL.length >= FL_MAX) return; const m = new THREE.Sprite(spriteMat(flareTex, c, 1)); m.layers.enable(3); m.renderOrder = 1200; scene3.add(m); f = { m, life: 0, s0: 1 }; FL.push(f); }
    f.life = f.max = life || .4; f.s0 = s || 5; f.m.position.copy(p); f.m.material.color.set(c); f.m.material.opacity = 1; f.m.scale.setScalar(f.s0); f.m.visible = true;
    EP.budget -= 2; EP.flares++;
  }
  function flareTick(dt) { for (const f of FL) { if (f.life <= 0) { if (f.m.visible) f.m.visible = false; continue; } f.life -= dt; const u = Math.max(0, f.life / f.max); f.m.material.opacity = u * u; f.m.material.rotation += dt * 2.4; f.m.scale.setScalar(f.s0 * (1 + (1 - u) * 1.6)); } }
  // ── ③ 광기둥 ──
  function shaft(p, c, w = 1.0, life = .4) { if (!p || !gate()) return; pillar(V3(p.x, Math.max(0, p.y - 2), p.z), w, c, life); EP.shafts++; EP.budget -= 3; }

  // ── ④ 맞음(wound): 방향성 불똥 2중 + 번쩍 + 소형 링 ──
  const _wound = wound;
  wound = function (v, a, text, ek) {
    const r = _wound.apply(this, arguments);
    try {
      if (!v || !v.pos || !gate()) return r;
      const b = chestP(v); if (!b) return r;
      const L = EL(ek || v.elem || 'metal');
      let dir = (a && a.pos) ? b.clone().sub(a.pos).setY(0) : V3(1, 0, 0); if (dir.lengthSq() < 1) dir.set(1, 0, 0); dir.normalize();
      const n = Math.round(9 * half() * (a && a.mode > 0 ? 1.4 : 1));
      for (let i = 0; i < n; i++) {
        const d = dir.clone().multiplyScalar(rr(.35, 1)).add(V3(rr(-.9, .9), rr(-.25, .9), rr(-.9, .9))).normalize();
        if (i & 1) X.streak(b.clone().add(V3(rr(-1.2, 1.2), rr(-1.2, 1.2), rr(-1.2, 1.2))), d.multiplyScalar(rr(150, 330)), rr(.2, .42), rr(.5, 1.1), rr(1, 1.9), (i & 3) ? L.c : '#ffffff', 320);
        else parts.push({ p: b.clone(), v: d.multiplyScalar(rr(150, 330)), life: .35, c: (i % 3) ? L.c : '#ffffff', g: 240, s: 1 });
      }
      X.emit(b.clone(), V3(0, 0, 0), .14, 15, 0, '#ffffff');
      X.emit(b.clone(), dir.clone().multiplyScalar(60), .22, 6, 1, L.c);
      flare(b, L.c, 3.5, .2);
      ring(b, 1.7, L.c, false, .38, 4.4);
      EP.budget -= 4; EP.hits++;
    } catch (e) { }
    return r;
  };

  // ── ② resolve: 중간 이상 맞음에 방사 충격파, 막기에 receptive 불꽃, 회피에 먼지 ──
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw = 1, at) {
    const r = _res.apply(this, arguments);
    try {
      if (!gate() || !b || !b.pos) return r;
      const p = (at && at.clone) ? at : chestP(b); if (!p) return r;
      const L = EL(ek || (a && a.elem) || 'metal');
      if (o === 'hit' || o === 'sub') {
        if (pw >= 1.3) { try { X.shock(p.clone().add(V3(0, 2, 0)), a && a.pos ? dirTo(b, a) : V3(0, 0, 1), 5 + pw * 3.2, L.c, .16 + .05 * pw); EP.shocks++; } catch (e) { } }
        if (pw >= 1.9) { flare(p.clone().add(V3(0, 2, 0)), L.c, 6, .3); light(p, L.c, 4 + pw); }
        if (pw >= 2.4 && gate()) { ring(p, 3, '#ffffff', false, .5, 5.5); EP.budget -= 4; }
      } else if (o === 'block') {
        const fan = a && a.pos ? dirTo(b, a) : V3(0, 0, 1);
        for (let i = 0; i < Math.round(7 * half()); i++) { const d = fan.clone().add(V3(rr(-1, 1), rr(0, 1), rr(-1, 1))).normalize().multiplyScalar(rr(130, 260)); X.streak(p.clone(), d, rr(.18, .32), rr(.4, .8), rr(.8, 1.5), (i & 1) ? '#9fd8ff' : '#ffffff', 260); }
        flare(p, '#bfe4ff', 3, .16); EP.budget -= 3; EP.blocks++;
      } else if (o === 'jump') { try { X.dustRing(b.pos, 4, 6); } catch (e) { } }
    } catch (e) { }
    return r;
  };
  // ── 필살기 폭발(ultBlast): 3겹 충격파 + 광기둥 + 화면 번쩍 ──
  const _ub = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) {
    const r = _ub.apply(this, arguments);
    try {
      if (!p || !gate()) return r;
      const L = EL(ek), big = Math.min(2, (rad || 60) / 60);
      for (let i = 0; i < 3; i++) pending.push({ t: i * .09, fn: () => { try { X.shock(p.clone().add(V3(0, 3 + i * 2, 0)), V3(0, 1, 0), 9 + i * 7 * big, i ? L.c : '#ffffff', .2 + .06 * i); } catch (e) { } } });
      shaft(p, L.c, 1.6, .5); shaft(p, '#ffffff', .7, .3);
      flare(p.clone().add(V3(0, 6, 0)), '#ffffff', 8, .45);
      light(p, L.c, 9);
      flashScreen(.07 * big);
      X.dustRing(p, 14 + 8 * big, 20 + 10 * big);
      EP.budget -= 14; EP.ults++;
    } catch (e) { }
    return r;
  };

  // ── 장벽 부딪힘(clash): 중앙 플레어 + 링 ──
  if (typeof clash === 'function') {
    const _cl = clash;
    clash = function (a, b, text, big) {
      const r = _cl.apply(this, arguments);
      try {
        if (a && b && a.pos && b.pos && gate()) {
          const m = a.pos.clone().lerp(b.pos, .5).add(V3(0, 8, 0));
          flare(m, '#ffffff', big ? 6 : 4, .28);
          ring(m, big ? 4 : 2.4, '#ffffff', false, .4, 5);
          if (big) { try { X.shock(m, dirTo(b, a), 12, '#ffe9a0', .22); } catch (e) { } }
          EP.budget -= 5;
        }
      } catch (e) { }
      return r;
    };
  }

  // ── 시전(callout): 빛 한 토막 + 상승 기둥(필살기는 진하게) ──
  const _co = callout;
  callout = function (f, text, ult) {
    const r = _co.apply(this, arguments);
    try {
      if (f && f.pos && gate()) {
        const c = EL(f.elem || (f.ch && f.ch.sig && f.ch.sig.elem)).c, b = chestP(f) || f.pos.clone().add(V3(0, 10, 0));
        if (ult) { light(b, c, 6); flare(b, c, 4.5, .3); shaft(f.pos, c, .9, .3); }
        else { light(b, c, 2.2); if (Math.random() < .5) X.emit(b.clone(), V3(0, rr(30, 70), 0), rr(.3, .5), rr(1.2, 2), 1, c, -10); }
        EP.budget -= ult ? 6 : 1;
      }
    } catch (e) { }
    return r;
  };

  // ── 각성자: 한 번에 광기둥·대플레어·충격파 ──
  function awakenFx(f) {
    if (f.__epAw) { if (!f.storm || !f.storm.awake) f.__epAw = 0; return; }
    f.__epAw = 1;
    if (!gate()) return;
    const c = EL(f.ch && f.ch.sig && f.ch.sig.elem).c;
    shaft(f.pos, c, 1.6, .6); shaft(f.pos, '#ffd84a', .8, .4);
    flare(chestP(f) || f.pos, '#ffd84a', 9, .5);
    light(f.pos, '#ffd84a', 9);
    try { X.shock(f.pos.clone().add(V3(0, 6, 0)), V3(0, 1, 0), 16, '#ffd84a', .3); } catch (e) { }
    EP.budget -= 16;
  }

  // ── ⑤ 가속 잔상줄기: 돌진(차크라 대시)·각성(모드)·초고속 이동자 뒤로 ──
  function dashTrails() {
    if (typeof F === 'undefined' || QF() === 'low' || FT() > 20 || EP.budget < 60) return;
    for (const f of F) {
      if (!f.pos || f.away) continue;
      const sp = f.vel ? Math.hypot(f.vel.x, f.vel.z) : 0;
      const hot = (f.storm && f.storm.dashing) || f.mode > 0 || sp > 250;
      if (!hot) continue;
      if (f.__epTr && nowS() - f.__epTr < (FT() > 17 ? .09 : .05)) continue;
      f.__epTr = nowS();
      const back = f.vel.clone().setY(f.air ? f.vel.y * .3 : 0).normalize().multiplyScalar(-1);
      const p = (chestP(f) || f.pos.clone().add(V3(0, 9, 0))).addScaledVector(back, 2.5);
      const c = f.elem ? EL(f.elem).c : '#cfe8ff';
      X.streak(p, back.clone().multiplyScalar(rr(180, 300)), rr(.18, .3), rr(.7, 1.3), rr(1.2, 2.2), c);
      if (f.pos.y < 4 && sp > 260 && Math.random() < .5) X.emit(V3(p.x, f.pos.y + .5, p.z), back.clone().multiplyScalar(40), rr(.3, .5), rr(2.5, 4), 2, '#c8b898', 0);
      EP.budget -= 3; EP.trails++;
    }
  }

  // ── ⑥ 블룸 태깅: 코어 fx 도형도 빛번짐 층에 ──
  const _mk = makeFx;
  makeFx = function (o) {
    const g = _mk.apply(this, arguments);
    try { if (EP.on && QF() !== 'low' && o && ['ring', 'dome', 'impact', 'beam', 'cone', 'pillar', 'shield', 'arc', 'spiral', 'spike'].indexOf(o.k) >= 0) g.userData.epicBloom = 1; } catch (e) { }
    return g;
  };

  // ── 매 장면: 예산 리셋·풀 틱·각성·잔상 ──
  const _upd = update;
  update = function (dt, t) {
    const r = _upd.apply(this, arguments);
    try {
      EP.budget = QF() === 'low' ? 0 : FT() > 20 ? 0 : FT() > 16.5 ? 260 : 560;
      flareTick(Math.min(dt, .1));
      if (typeof F !== 'undefined') for (const f of F) if (f.storm) awakenFx(f);
      dashTrails();
    } catch (e) { }
    return r;
  };
})();
