// 지면 파괴 2단계(소유자 11-05): "화면이 흔들릴 정도의 충격이면 땅이 많이 깨져야" — 충격 세기 → 파괴 규모를 하나로 잇고, 생김새를 다양하게.
// - 연결: 매 화면 화면 흔들림(shake)이 크게 뛰면 최근 타격 지점(맞은 몸·폭발·필살)에 파괴. 흔들림이 클수록 반드시 큰 파괴.
// - 생김새(무작위 변형, 같은 모양 반복 없음): 방사 균열망·거미줄 균열·깊은 구덩이(솟은 테두리)·들린 암반 판·솟는 바위 기둥/가시·길게 찢어지는 도랑(직선·곡선)
//   ·계단식 단차 붕괴·흙먼지 기둥·자갈 비·굴러가는 흙덩이·갈라진 틈에서 새는 먼지·빛(속성 색)
// - 흔적은 천천히 풍화(옅어짐), 개수 상한. 솟는 가시는 env.js 가시를 써서 collide.js 충돌과 그대로 맞물림.
// env.js(window.__env)의 판석·가시·파편·구덩이·먼지를 재사용하고, 균열 무늬·도랑·새는 빛만 새로 그린다.
(function () {
  if (typeof scene3 === 'undefined' || typeof update !== 'function') return;
  const E = window.__env; if (!E) return;
  const envCall = (fn, ...a) => { const e = window.__env || E; if (e && typeof e[fn] === 'function') return e[fn](...a); }; // env 함수가 없거나 바뀌어도 오류 없이 넘어감
  const G = window.GROUND2 = { on: true, events: 0, byKind: {}, lastLevel: 0, ms: 0 };
  const C = c => new THREE.Color(c);

  // ── 균열 무늬 여러 장(캔버스로 생성, 매번 다른 조합) ──
  function crackCanvas(kind, seed) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round';
    let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const branch = (px, py, a, w, n, step) => { x.beginPath(); x.moveTo(px, py); for (let i = 0; i < n; i++) { a += (rnd() - .5) * .9; px += Math.cos(a) * step; py += Math.sin(a) * step; w *= .9; x.lineWidth = Math.max(.6, w); x.lineTo(px, py); x.stroke(); x.beginPath(); x.moveTo(px, py); if (rnd() < .16 && n - i > 3) branch(px, py, a + (rnd() < .5 ? .9 : -.9), w * .7, (n - i) * .6 | 0, step * .9); } };
    if (kind === 'web') { const arms = 9 + (rnd() * 6 | 0); for (let k = 0; k < arms; k++) branch(128, 128, k / arms * 6.28 + rnd() * .3, 5, 12, 9);
      for (let ring = 1; ring <= 3; ring++) { const r = ring * 30 + rnd() * 10; x.lineWidth = 1.6 / ring + .6; x.beginPath(); for (let k = 0; k <= arms; k++) { const a = k / arms * 6.28, rr = r * (.85 + rnd() * .3); k ? x.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr) : x.moveTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } x.stroke(); } }
    else if (kind === 'shatter') { for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, r0 = rnd() * 40; branch(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0, a, 3.5, 6 + (rnd() * 6 | 0), 10); } }
    else if (kind === 'trench') { // 가운데가 깊고 양옆이 들쭉날쭉한 긴 찢김
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, 128); for (let i = 0; i <= 32; i++) x.lineTo(i * 8, 128 - 18 - rnd() * 22); for (let i = 32; i >= 0; i--) x.lineTo(i * 8, 128 + 18 + rnd() * 22); x.closePath(); x.globalAlpha = .9; x.fill(); x.globalAlpha = 1;
      for (let k = 0; k < 18; k++) branch(rnd() * 256, 128 + (rnd() < .5 ? -30 : 30), (rnd() < .5 ? -1 : 1) * (1.2 + rnd() * .7), 2.5, 5, 7); }
    else { const arms = 6 + (rnd() * 7 | 0); for (let k = 0; k < arms; k++) branch(128, 128, k / arms * 6.28 + rnd() * .5, 6, 14, 8.5); }
    return new THREE.CanvasTexture(c);
  }
  const TEX = { radial: [0, 1, 2].map(i => crackCanvas('radial', i + 1)), web: [0, 1].map(i => crackCanvas('web', i + 7)), shatter: [0, 1].map(i => crackCanvas('shatter', i + 13)), trench: [0, 1, 2].map(i => crackCanvas('trench', i + 21)) };

  // ── 흔적(어두운 금 + 잠깐 빛나는 금) 묶음 — 상한 18, 천천히 풍화 ──
  const MAXD = 18, decals = [];
  for (let i = 0; i < MAXD; i++) {
    const g = new THREE.Group();
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#120c07', transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 - i * .05 }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -5 - i * .05 }));
    [dark, glow].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.y = .14; g.add(m); }); g.visible = false; scene3.add(g);
    decals.push({ g, dark, glow, on: false, t: 0, life: 0, glowT: 0, born: 0 });
  }
  function decal(p, kind, w, l, yaw, col, glowT) {
    const d = decals.find(x => !x.on) || decals.reduce((a, b) => (a.born < b.born ? a : b)); // 가장 오래된 것 재사용
    const tx = pick(TEX[kind]); d.dark.material.alphaMap = tx; d.glow.material.alphaMap = tx; d.dark.material.needsUpdate = d.glow.material.needsUpdate = true;
    d.glow.material.color.set(col || '#ff8a3a'); d.g.position.set(p.x, 0, p.z); d.g.rotation.y = yaw; d.g.scale.set(w, 1, l); d.g.visible = true;
    Object.assign(d, { on: true, t: 0, life: R(14, 22), glowT: glowT || 1.4, born: performance.now() });
  }

  // ── 틈에서 새는 먼지·빛 ──
  const leaks = [];
  function leak(p, rad, col, dur) { leaks.push({ p: p.clone(), rad, col, t: 0, dur: dur || 1.6 }); if (leaks.length > 10) leaks.shift(); }
  const dustCol = () => pick(['#7a6852', '#8a765c', '#6a5a46', '#9a866a']);
  function column(p, h) { for (let i = 0; i < 14 + h * .5; i++) parts.push({ p: V3(p.x + R(-4, 4), R(1, 6), p.z + R(-4, 4)), v: V3(R(-14, 14), R(80, 160) * (h / 40), R(-14, 14)), life: R(1.4, 2.4), c: dustCol(), g: -1, s: 4.5, n: true }); }
  function gravelRain(p, rad) { for (let i = 0; i < 26; i++) { const a = R(0, 6.28), d = R(0, rad); parts.push({ p: V3(p.x + Math.cos(a) * d, R(40, 90), p.z + Math.sin(a) * d), v: V3(R(-10, 10), R(-30, 10), R(-10, 10)), life: R(1, 1.6), c: pick(['#5a4a3a', '#6e5c48', '#4a3c2e']), g: 260, s: 1.6, n: true }); } }
  function rollers(p, n, ek, dir) { envCall('chunk', p, n, .55, ek); } // 낮게 튀어 구르는 흙덩이(파편 물리 재사용, 낮은 속도)

  // ── 생김새별 파괴 ──
  const K = {
    radialNet(p, s, ek, col) { decal(p, 'radial', s * 26, s * 26, R(0, 6.3), col); envCall('radial', p, 8 + s * 8, col); },
    web(p, s, ek, col) { decal(p, 'web', s * 30, s * 30, R(0, 6.3), col, 1.8); leak(p, s * 10, col); },
    pit(p, s, ek, col) { envCall('crater', p, 6 + s * 5); envCall('slab', p, 6 + Math.round(s * 2), 7 + s * 4, 3 + s * 2, ek); decal(p, 'shatter', s * 20, s * 20, R(0, 6.3), col); envCall('chunk', p, 6 + s * 3 | 0, 1 + s * .2, ek); },
    slabs(p, s, ek, col) { envCall('slab', p, 6 + Math.round(s * 3), 10 + s * 7, 5 + s * 3.5, ek); decal(p, 'shatter', s * 24, s * 24, R(0, 6.3), col); },
    pillars(p, s, ek, col) { const n = 2 + (s * 1.5 | 0); envCall('spike', p, n, 6 + s * 4, 16 + s * 9, ek); envCall('spike', p, 4 + (s * 2 | 0), 12 + s * 7, 6 + s * 3, ek); decal(p, 'radial', s * 18, s * 18, R(0, 6.3), col); },
    trench(p, s, ek, col, dir) { // 직선 또는 굽은 도랑: 길게 찢어지며 양옆이 들림
      const d0 = dir && dir.lengthSq() > .01 ? dir.clone().normalize() : V3(Math.cos(R(0, 6.3)), 0, Math.sin(R(0, 6.3))); const curve = Math.random() < .5 ? R(-.035, .035) : 0;
      const len = 40 + s * 22, segs = 4 + (s | 0); let q = p.clone(), a = Math.atan2(d0.z, d0.x);
      for (let i = 0; i < segs; i++) { const L = len / segs; const mid = q.clone().add(V3(Math.cos(a) * L / 2, 0, Math.sin(a) * L / 2));
        pending.push({ t: i * .05, fn: () => { decal(mid, 'trench', L * 1.15, 6 + s * 3, -a, col, 1.2); envCall('slab', mid, 2, 5 + s, 4 + s * 1.5, ek); envCall('dust', mid, 8 + s * 2); } });
        q.add(V3(Math.cos(a) * L, 0, Math.sin(a) * L)); a += curve * L; }
    },
    steps(p, s, ek, col) { // 계단식 단차: 가운데로 갈수록 깊게 꺼지는 고리 판(세 겹)
      for (let ring = 0; ring < 3; ring++) pending.push({ t: ring * .07, fn: () => envCall('slab', p, 6 + ring * 3, (5 + ring * 6) * (.7 + s * .25), (3 - ring) * (1.5 + s * .8), ek) });
      envCall('crater', p, 4 + s * 3); decal(p, 'web', s * 22, s * 22, R(0, 6.3), col);
    },
    burst(p, s, ek, col) { column(p, 30 + s * 14); gravelRain(p, 10 + s * 5); rollers(p, 5 + s * 2 | 0, ek); envCall('dust', p, 14 + s * 5); },
  };
  const KINDS = Object.keys(K); let lastKinds = [];
  function pickKinds(n) { const pool = KINDS.filter(k => !lastKinds.includes(k)); const out = []; while (out.length < n && pool.length) out.push(pool.splice(Math.random() * pool.length | 0, 1)[0]); lastKinds = out.slice(); return out; }

  // 세기(0~4) → 규모·가짓수. 클수록 반드시 크게.
  function destroy(p, level, ek, dir) {
    if (!p || p.y > 30 || Math.hypot(p.x, p.z) > 280) return;
    const g = V3(p.x, 0, p.z), col = ((typeof ELEM !== 'undefined' && (ELEM[ek] || ELEM.earth)) || { c: '#ff8a3a' }).c, s = Math.max(.6, level);
    const n = level >= 3.2 ? 4 : level >= 2.2 ? 3 : level >= 1.3 ? 2 : 1;
    const kinds = pickKinds(n); if (level >= 2.2 && !kinds.includes('burst')) kinds.push('burst'); // 큰 충격은 흙먼지 기둥·자갈 비가 반드시 따라옴
    kinds.forEach((k, i) => { const off = i === 0 ? g : g.clone().add(V3(R(-1, 1) * s * 6, 0, R(-1, 1) * s * 6)); try { K[k](off, s, ek, col, dir); } catch (e) { console.warn('[ground2]', k, e); } G.byKind[k] = (G.byKind[k] || 0) + 1; });
    if (level >= 1.3) leak(g, s * 8, col, 1.2 + s * .3);
    G.events++; G.lastLevel = +level.toFixed(2);
  }
  G.destroy = destroy;

  // ── 최근 타격 지점 기억(맞은 몸·폭발·필살) ──
  const last = { p: V3(), t: -9, ek: 'earth', dir: null };
  const mark = (p, ek, dir, cause, src) => { if (!p) return; last.p.copy(p); last.t = performance.now() / 1000; last.ek = ek || 'earth'; last.dir = dir || null; last.cause = cause || 'hit'; last.src = src || null; }; // 원인: hit(맨손)·sword·projectile·ult·stomp
  const _w = wound; wound = function (v, a, text, ek) { const r = _w.apply(this, arguments); try { if (v && v.pos) mark(v.pos, ek || (a && (a.elem || (a.ch && a.ch.sig && a.ch.sig.elem))), a ? V3(v.pos.x - a.pos.x, 0, v.pos.z - a.pos.z) : null, a && a.model && a.model.swd && a.model.swd.grp && a.model.swd.grp.visible ? 'sword' : (a && (a.giantArm || 0) > .3) ? 'stomp' : 'hit', a); } catch (e) { } return r; };
  if (typeof explode === 'function') { const _x = explode; explode = function (p, ek) { const r = _x.apply(this, arguments); try { mark(p, ek, null, 'projectile'); } catch (e) { } return r; }; }
  if (typeof ultBlast === 'function') { const _u = ultBlast; ultBlast = function (p, ek, rad, owner) { const r = _u.apply(this, arguments); try { mark(p, ek, owner && p ? V3(p.x - owner.pos.x, 0, p.z - owner.pos.z) : null, 'ult', owner); } catch (e) { } return r; }; }

  // ── 매 화면: 흔들림 감시 → 파괴, 흔적 풍화, 새는 빛 ──
  let prevShake = 0, cool = 0;
  const _up = update;
  update = function (dt, t) {
    const r = _up.apply(this, arguments);
    const t0 = performance.now();
    try {
      const sh = typeof shake === 'number' ? shake : 0; cool -= dt;
      if (G.on && sh >= 3.5 && sh > prevShake + 1.5 && cool <= 0) { // 흔들림이 크게 뛴 순간
        const level = Math.min(4, (sh - 2) / 3); // 흔들림 5 → 1, 8 → 2, 11 → 3, 14+ → 4
        const now = performance.now() / 1000; let p = now - last.t < .5 ? last.p : null;
        if (!p && typeof F !== 'undefined' && F.length) { p = V3(); F.forEach(f => p.add(f.pos)); p.multiplyScalar(1 / F.length); }
        (G.gen || destroy)(p, level, last.ek, last.dir, now - last.t < .5 ? last.cause : 'hit', last.src); cool = level >= 2.2 ? .45 : .3;
      }
      prevShake = sh;
      for (const d of decals) { if (!d.on) continue; d.t += dt; const u = d.t / d.life; d.dark.material.opacity = Math.min(1, d.t * 9) * (u < .6 ? .92 : Math.max(0, .92 * (1 - (u - .6) / .4))); d.glow.material.opacity = Math.max(0, 1 - d.t / d.glowT) * (.75 + Math.random() * .25); if (u >= 1) { d.on = false; d.g.visible = false; } }
      for (let i = leaks.length - 1; i >= 0; i--) { const L = leaks[i]; L.t += dt; if (L.t > L.dur) { leaks.splice(i, 1); continue; }
        if (frame % 2 === 0) for (let k = 0; k < 3; k++) { const a = R(0, 6.28), d = R(0, L.rad); const glowy = Math.random() < .45; parts.push({ p: V3(L.p.x + Math.cos(a) * d, .6, L.p.z + Math.sin(a) * d), v: V3(R(-6, 6), R(18, 46), R(-6, 6)), life: R(.7, 1.3), c: glowy ? L.col : dustCol(), g: -3, s: glowy ? 2.2 : 3.2, n: !glowy }); } }
    } catch (e) { console.warn('[ground2]', e); }
    G.ms = performance.now() - t0;
    return r;
  };
})();
