// fx-epic2.js — 라운드M(11-10): 지속 장식이·KO 연출·히트스톱(모델링 다운으로 번 프레임을 연출에 재투자).
// fx-epic.js(플레어·충격파·줄기) 위에 '남는 자국' 층만 얹는다 — 전부 풀·프레임 예산·자동 강등(ftAvg)로 끊김 금지.
//  ① 스크치 데칼: 강한 맞음·필살기·KO 자리에 그을림+금 간 원판(4~9초 잔존, 페이드) — 전적이 바닥에 남는다
//  ② KO 피니시: K.O. 교대 순간 큰 그을림 + 어두운 폭발 + 광기둥 + 짧은 슬로(히트스톱)
//  ③ 히트스톱: 대형 타격(pw≥2.2)·대격돌(clash big) 순간 dt를 0.05~0.12초만 0.3~0.4배 — CINE(필살 슬로)과 중복 금지
// 의존(모두 공개 전역): scene3/V3/parts/resolve/ultBlast/label/ring/pillar/light/flashScreen/ELEM/ftAvg/getQuality/CINE/teamSwap
(function () {
  if (typeof resolve !== 'function' || typeof scene3 === 'undefined' || typeof V3 !== 'function') return;
  const E2 = window.EPIC2 = { on: true, decals: 0, koFx: 0, stops: 0, skipped: 0, budget: 0 };
  const QF = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  const FT = () => (typeof ftAvg !== 'undefined' ? ftAvg : 16);
  const gate = () => { if (!E2.on || QF() === 'low' || FT() > 24 || E2.budget <= 0) { E2.skipped++; return false; } return true; };
  const rr = (a, b) => a + Math.random() * (b - a);

  // ── ① 데칼 텍스처 두 장: 그을림(알파) + 발광 균열(애디티브) ──
  function scorchTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 128, 8, 128, 128, 126);
    g.addColorStop(0, 'rgba(10,7,5,.95)'); g.addColorStop(.45, 'rgba(18,12,8,.72)'); g.addColorStop(.75, 'rgba(26,17,10,.32)'); g.addColorStop(1, 'rgba(30,20,12,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, d = 40 + Math.random() * 90, r = 10 + Math.random() * 26, px = 128 + Math.cos(a) * d, py = 128 + Math.sin(a) * d;
      const g2 = x.createRadialGradient(px, py, 0, px, py, r); g2.addColorStop(0, 'rgba(0,0,0,' + (.25 + Math.random() * .3) + ')'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g2; x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = 'rgba(70,44,22,.5)'; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const a = Math.random() * 6.283; x.beginPath(); x.moveTo(128, 128); let px = 128, py = 128, th = a;
      for (let j = 0; j < 5; j++) { th += rr(-.5, .5); const L = rr(14, 34); px += Math.cos(th) * L; py += Math.sin(th) * L; x.lineTo(px, py); } x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  function crackTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = pass ? 'rgba(255,190,90,.9)' : 'rgba(255,120,40,.5)'; x.lineWidth = pass ? 2 : 5;
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; x.beginPath(); x.moveTo(128, 128); let px = 128, py = 128, th = a;
        for (let j = 0; j < 6; j++) { th += rr(-.42, .42); const L = rr(16, 40); px += Math.cos(th) * L; py += Math.sin(th) * L; x.lineTo(px, py); } x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); return t;
  }
  let TEX_S = null, TEX_C = null;
  const GEO = new THREE.CircleGeometry(1, 26);
  const pool = [];
  function decalAt(p, r, life, glow) {
    if (!p || !gate()) return;
    if (!TEX_S) { TEX_S = scorchTex(); TEX_C = crackTex(); }
    let d = pool.find(o => o.life <= 0);
    if (!d) {
      if (pool.length >= 26) return;
      const m = new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ map: TEX_S, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, opacity: 1 }));
      m.rotation.x = -Math.PI / 2; m.receiveShadow = false; m.renderOrder = 2; m.frustumCulled = false; scene3.add(m);
      const gm = glow ? new THREE.Mesh(GEO, new THREE.MeshBasicMaterial({ map: TEX_C, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })) : null;
      if (gm) { gm.rotation.x = -Math.PI / 2; gm.renderOrder = 3; gm.frustumCulled = false; scene3.add(gm); }
      d = { m, gm, life: 0, max: 1, r0: 1 }; pool.push(d);
    }
    d.life = d.max = life; d.r0 = r; d.m.position.set(p.x, (p.y || 0) + .09, p.z); d.m.rotation.z = rr(0, 6.283);
    d.m.material.opacity = .92; d.m.scale.setScalar(r * .45);
    if (d.gm) { d.gm.position.set(p.x, (p.y || 0) + .11, p.z); d.gm.rotation.z = rr(0, 6.283); d.gm.material.opacity = .85; d.gm.scale.setScalar(r * .5); }
    E2.decals++; E2.budget -= glow ? 6 : 3;
  }
  function decalTick(dt) {
    for (const d of pool) {
      if (d.life <= 0) { if (d.m.visible) { d.m.visible = false; if (d.gm) d.gm.visible = false; } continue; }
      d.life -= dt; const u = Math.max(0, d.life / d.max);
      d.m.scale.setScalar(d.r0 * (.45 + (1 - u) * .6)); d.m.material.opacity = .92 * Math.min(1, u * 1.6);
      if (d.gm) { d.gm.material.opacity = .85 * u * u; d.gm.scale.setScalar(d.r0 * (.5 + (1 - u) * .5)); }
    }
  }

  // ── ③ 히트스톱(CINE 슬로와 상호 배타) ──
  const H = window.HITSTOP = { until: 0, want: 1, mine: false };
  function hitstop(dur, s) {
    if (!window.CINE) return;
    try { if (CINE.active) return; } catch (e) { return; }
    const now = performance.now(); if (now - H.until < 260) return;
    H.until = now + dur; H.want = s; H.mine = true; E2.stops++;
  }
  (function hFrame() {
    try {
      if (window.CINE && H.mine) {
        const now = performance.now();
        if (now < H.until) CINE.scale = H.want;
        else if (now < H.until + 120) CINE.scale = H.want + (1 - H.want) * ((now - H.until) / 120);
        else { if (CINE.scale !== 1) CINE.scale = 1; H.mine = false; }
      }
    } catch (e) { }
    requestAnimationFrame(hFrame);
  })();

  // ── resolve: 큰 타격 → 바닥 그을림 + 히트스톱 ──
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw = 1, at) {
    const r = _res.apply(this, arguments);
    try {
      if (!gate() || !b || !b.pos) return r;
      if (o === 'hit' || o === 'sub') {
        if (pw >= 1.5 && b.pos.y < 30) { const sc = (window.ELEM && ELEM[ek || (a && a.elem)] || {}).c; decalAt(b.pos, 2.6 + pw * 1.3, 4 + pw, pw >= 2.6); }
        if (pw >= 2.2) hitstop(pw >= 2.8 ? 110 : 70, pw >= 2.8 ? .3 : .42);
      }
    } catch (e) { }
    return r;
  };

  // ── 필살기 폭발: 거대한 그을림 원 + 균열 ──
  const _ub = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) {
    const r = _ub.apply(this, arguments);
    try { if (p && gate()) decalAt(p, 6 + (rad || 60) / 9, 9, true); } catch (e) { }
    return r;
  };

  // ── 대격돌: 짧은 슬로 + 스파크 그을림 ──
  if (typeof clash === 'function') {
    const _cl = clash;
    clash = function (a, b, text, big) {
      const r = _cl.apply(this, arguments);
      try {
        if (a && b && a.pos && b.pos && gate()) {
          const m = a.pos.clone().lerp(b.pos, .5);
          if (big) { hitstop(120, .32); decalAt(m, 4.5, 6, true); }
          else decalAt(m, 2.2, 4, false);
        }
      } catch (e) { }
      return r;
    };
  }

  // ── KO 피니시: K.O. 교대 순간 그을림+기둥+어두운 폭발+슬로 ──
  if (typeof teamSwap === 'function') {
    const _ts = teamSwap;
    teamSwap = function (f, why) {
      const ko = (why === 'K.O.') && f && f.pos;
      const r = _ts.apply(this, arguments);
      try {
        if (ko && gate()) {
          const p = f.pos;
          decalAt(p, 6.5, 9, true);
          try { const L = (window.ELEM && ELEM[f.elem || (f.ch && f.ch.sig && f.ch.sig.elem)] || { c: '#ff8050' }).c;
            pillar(V3(p.x, Math.max(0, p.y - 1), p.z), 1.4, L, .55);
            ring(p, 5, L, false, .6, 6); ring(p, 7.5, '#1a1008', true, .7, 3.4);
            parts.push({ p: V3(p.x, p.y + 4, p.z), v: V3(0, 26, 0), life: .8, c: '#2a1c10', g: -40, s: 3 });
            for (let i = 0; i < 10; i++) parts.push({ p: p.clone(), v: V3(rr(-60, 60), rr(20, 120), rr(-60, 60)), life: rr(.5, .9), c: i & 1 ? '#3a2a18' : L, g: 200, s: 1.6 });
          } catch (e) { }
          hitstop(160, .3);
          E2.koFx++; E2.budget -= 18;
        }
      } catch (e) { }
      return r;
    };
  }

  // ── 매 장면: 예산·데칼 틱 (fx-epic과 같은 update 래퍼 체인, 이쪽이 나중에 감쌈) ──
  const _upd = update;
  update = function (dt, t) {
    const r = _upd.apply(this, arguments);
    try {
      E2.budget = QF() === 'low' ? 0 : FT() > 24 ? 0 : FT() > 18 ? 260 : 520;
      decalTick(Math.min(dt, .1));
    } catch (e) { }
    return r;
  };
})();
