// 넉백 등급(소유자 요청 11-05): 기본 공격·작은 기술은 지금 그대로, 중간 기술은 1.4~1.7배, 필살기·맞불 패배는 2~3배로 더 멀리 —
// 날아가는 길은 physics.js 의 Rapier 동적 강체(포물선·바닥 튕김·마찰 미끄러짐·바위 충돌·경기장 안쪽 반사)가 맡는다.
// 상황 배율: 체급 차(크면 덜, 작으면 더) · 거대화(덜) · 경화(덜) · 공중(더 멀리·더 높이) · 체력 낮음(조금 더). 막기(가드)는 날지 않고 밀려나기만.
// hp.js 뒤에 읽혀 wound 를 가장 바깥에서 감싼다(피해·KO 계산이 끝난 뒤 날려 보냄).
(function () {
  if (typeof F === 'undefined' || typeof wound !== 'function') return;
  const now = () => performance.now() / 1000;
  const KN = window.KNOCK = { on: true, st: { basic: [], mid: [], ult: [], clash: [], launched: 0, guardSlide: 0 }, GRADE: { basic: 1, mid: 1.6, ult: 2.5, clash: 2.8 } };
  const gradeOf = (a, text) => { if (/맞불/.test(String(text || ''))) return 'clash'; const recent = a && a._coT && now() - a._coT < 2.6; return recent ? (a._coUlt ? 'ult' : 'mid') : 'basic'; };
  const has = (f, k) => window.TACTICS && TACTICS.has && TACTICS.has(f, k);
  const hp01 = f => { const r = window.HP && HP.of ? HP.of(f) : null; return r && r.max ? r.hp / r.max : 1; };
  const watch = [];
  // ═══ 절벽에 박히기(소유자 결정 11-05 "절벽에 박히게") ═══
  // world-cliff.js 암벽: 중심 (0, -60) 타원, x 반지름 360 · 뒤쪽(-z) 330 · 앞쪽(+z) 660 — 같은 식으로 암벽 면 거리 계산
  const CZ = -60, baseR = a => { const c = Math.cos(a), s = Math.sin(a), rx = 360, rz = s < 0 ? 330 : 660; return 1 / Math.sqrt((c / rx) * (c / rx) + (s / rz) * (s / rz)); };
  const cliffOn = () => window.WORLD_BG && WORLD_BG.mode === 'cliff';
  const cliffHit = (x, z) => { const dx = x, dz = z - CZ, a = Math.atan2(dz, dx), R0 = baseR(a) - 14; if (Math.hypot(dx, dz) < R0) return null; return { x: Math.cos(a) * R0, z: Math.sin(a) * R0 + CZ, nx: -Math.cos(a), nz: -Math.sin(a) }; };
  function cliffPoint(p, d) { for (let s = 0; s < 900; s += 6) { const h = cliffHit(p.x + d.x * s, p.z + d.z * s); if (h) return { h, dist: s }; } return null; }
  KN.st.cliff = { tries: 0, hit: 0, back: 0, times: [] };
  // 절벽 자국: 방사 균열 무늬(캔버스) + 움푹 패임(어두운 원) — 암벽 면 방향, 서서히 사라짐, 상한 8
  const crackTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 6, 128, 128, 70); g.addColorStop(0, 'rgba(20,14,10,.95)'); g.addColorStop(.6, 'rgba(40,30,22,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(128, 128, 70, 0, 6.29); x.fill();
    x.strokeStyle = 'rgba(25,18,12,.9)'; x.lineCap = 'round'; for (let k = 0; k < 14; k++) { let a = k / 14 * 6.28 + Math.random() * .3, px = 128, py = 128, w = 6; x.beginPath(); x.moveTo(px, py); for (let i = 0; i < 9; i++) { a += (Math.random() - .5) * .8; px += Math.cos(a) * 13; py += Math.sin(a) * 13; w *= .82; x.lineWidth = w; x.lineTo(px, py); } x.stroke(); }
    return new THREE.CanvasTexture(c); })();
  const marks = [];
  function wallMark(p, y, nx, nz, sx, sy) {
    let m = marks.find(q => !q.on) || (marks.length < 8 ? null : marks.reduce((a, b) => a.t > b.t ? a : b));
    if (!m) { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); scene3.add(mesh); m = { mesh, on: false, t: 0 }; marks.push(m); }
    m.on = true; m.t = 0; m.mesh.visible = true; m.mesh.material.opacity = 1; const s = 26 + Math.random() * 14; m.mesh.scale.set(sx || s, sy || s, 1);
    const yy = Math.max(8, y + 10); m.mesh.position.set(p.x + nx * 1.5, yy, p.z + nz * 1.5); m.mesh.lookAt(p.x + nx * 50, yy, p.z + nz * 50); if (!sy) m.mesh.rotateZ(Math.random() * 6.28);
  }
  function marksTick(dt) { marks.forEach(m => { if (!m.on) return; m.t += dt; const k = m.t / 14; m.mesh.material.opacity = Math.max(0, 1 - k * k); if (k >= 1) { m.on = false; m.mesh.visible = false; } }); } // 풍화(14초)
  // 절벽 도달 반응(소유자 11-05): 박힘 · 벽 발 짚고 반동 도약(반격 돌진) · 손 짚고 미끄러짐 · 검 꽂아 제동 · 기 방출로 상쇄 · 벽 부수고 굴러 떨어짐
  KN.st.wall = { embed: 0, kick: 0, slide: 0, sword: 0, chakra: 0, break: 0, counter: 0 };
  const ROCKC = ['#8a7a68', '#6a5a48', '#b0a088', '#5a4a3a'];
  function pickWall(v) {
    const m = v.ai || {}, hp = hp01(v), sw = !!(v.model && v.model.swd && v.model.swd.grp && v.model.swd.grp.visible), agile = (m.evade || .5) > .55 || /naruto|kimetsu|bleach/.test(v.ch.world || v.team || ''), strong = (m.aggr || .5) > .55 && hp > .5;
    const w = { embed: .25 + (hp < .4 ? .45 : 0), kick: agile ? .55 : .12, slide: agile ? .3 : .1, sword: sw ? .7 : 0, chakra: strong ? .5 : .1, break: .12 + (hp < .35 ? .3 : 0) };
    let r = Math.random() * Object.values(w).reduce((s, x) => s + x, 0); for (const [k, x] of Object.entries(w)) { r -= x; if (r <= 0) return k; } return 'embed';
  }
  function cliffImpact(v, hit, y, a) {
    KN.st.cliff.hit++; const p = V3(hit.x, Math.max(6, y), hit.z), kind = pickWall(v); KN.st.wall[kind]++;
    const toC = V3(hit.nx, 0, hit.nz);
    if (kind === 'embed' || kind === 'break') { wallMark(hit, y, hit.nx, hit.nz, kind === 'break' ? 52 : 0, kind === 'break' ? 52 : 0); try { burst(p.clone().add(V3(0, 8, 0)), kind === 'break' ? 70 : 34, ROCKC, kind === 'break' ? 3.4 : 2.6, 220, 2); } catch (e) { } }
    else if (kind === 'kick') { wallMark(hit, y, hit.nx, hit.nz, 14, 14); try { burst(p.clone().add(toC.clone().multiplyScalar(3)), 22, ['#c8b898', '#a89878'], 2, 60, 1.5); if (window.FX3 && FX3.streak) for (let i = 0; i < 8; i++) FX3.streak(p.clone(), toC.clone().multiplyScalar(160 + Math.random() * 80).add(V3((Math.random() - .5) * 60, Math.random() * 40, (Math.random() - .5) * 60)), .25, .05, 2, '#e8dcc0', 0); } catch (e) { } }
    else if (kind === 'chakra') { try { const E = ELEM[v.elem || (v.ch.sig && v.ch.sig.elem)] || ELEM.power || { c: '#9fd0ff', parts: ['#ffffff'] }; ring(p.clone().add(toC.clone().multiplyScalar(4)), 6, E.c, false, .8, 2.6); ring(p.clone().add(toC.clone().multiplyScalar(4)), 10, '#ffffff', false, .6, 2.4); burst(p.clone().add(toC.clone().multiplyScalar(4)), 24, (E.parts || [E.c]).concat(['#ffffff']), 1.8); light(p, E.c, 6); } catch (e) { } }
    try { burst(p.clone().add(V3(0, 4, 0)), 10, ROCKC, 1.6, 200, 1.5); } catch (e) { }
    try { if (window.FX3 && FX3.dustRing) FX3.dustRing(V3(hit.x, 1, hit.z), 26, 30); if (window.__env && __env.dust) __env.dust(V3(hit.x + hit.nx * 6, 0, hit.z + hit.nz * 6), 18, '#b8a888'); } catch (e) { }
    shake = Math.max(shake, 12); try { flashScreen(.05); } catch (e) { }
    try { if (typeof shot === 'function') shot('quarter', 1.4, v, a && F.includes(a) ? a : v); } catch (e) { }
    const LB = { embed: '쾅!', kick: '벽 박차기!', slide: '벽 짚기!', sword: '검 제동!', chakra: '기로 상쇄!', break: '벽 붕괴!' };
    try { label(V3(hit.x, Math.max(14, y + 24), hit.z), LB[kind], '#ffd8a0', { big: true }); } catch (e) { }
    if (kind === 'kick' || kind === 'slide' || kind === 'chakra') shake = Math.min(shake, 6);
    v.away = { kind, ph: kind === 'embed' || kind === 'break' ? 'embed' : kind, t: 0, dur: kind === 'break' ? .35 : .6 + Math.random() * .4, key: v.ch.key, hit, y: Math.max(6, y), t0: now(), a };
    try { apply(v, { pose: kind === 'kick' ? 'flipAir' : kind === 'sword' ? 'k_uke' : kind === 'slide' ? 'block' : kind === 'chakra' ? 'cast' : 'hurt', face: a || null, k: 60 }, .4); } catch (e) { }
    lanes = lanes.filter(L => !L.fs.includes(v)); v.stun = Math.max(v.stun || 0, 3); v.vel.set(0, 0, 0); v.kb.set(0, 0, 0); v.air = true;
    F.forEach(o => { if (o !== v && !(o.stun > 0) && !o.away && (!o.team || o.team !== v.team)) try { apply(o, { pose: 'taunt', face: v }, .8); } catch (e) { } });
  }
  function awayTick(v, dt) {
    const s = v.away; if (!s) return;
    if (!F.includes(v) || v.ch.key !== s.key) { v.away = null; KN.st.cliff.swap = (KN.st.cliff.swap || 0) + 1; return; } /* 바깥에 있는 동안 교대·KO 퇴장 */
    s.t += dt;
    if (s.ph === 'kick') { // 벽에 두 발 짚음 → 반동 도약해 상대에게 반격 돌진
      v.pos.set(s.hit.x, s.y, s.hit.z); v.air = true; v.stun = Math.max(v.stun, .2);
      if (s.t > .22) { const tg = s.a && F.includes(s.a) && !s.a.away ? s.a : F.find(o => o !== v && !o.away && (!o.team || o.team !== v.team)); s.ph = 'hop'; s.t = 0; v.stun = 0;
        const g = tg ? tg.pos.clone().add(V3(s.hit.nx * -6, 0, s.hit.nz * -6)) : V3(-s.hit.nx * -(ARENA - 14), 0, -s.hit.nz * -(ARENA - 14)); g.y = 0; clampArena(g);
        try { apply(v, { pose: 'kick', face: tg || null, k: 80 }, .5); } catch (e) { }
        if (window.MV) MV.arc(v, g, Math.min(1, .5 + Math.hypot(g.x - v.pos.x, g.z - v.pos.z) / 600), 26, { done: () => { if (tg && F.includes(tg) && F.includes(v)) { KN.st.wall.counter++; if (v.away) { KN.st.cliff.back++; KN.st.cliff.times.push(+(now() - v.away.t0).toFixed(2)); } v.away = null; try { resolve(v, tg, null, 'hit', '반격 돌진!', 1.3); } catch (e) { } } } }); else v.pos.copy(g); }
      return; }
    if (s.ph === 'slide' || s.ph === 'sword') { // 손으로 벽 짚고·검을 꽂아 미끄러져 내려옴(긁힘 자국·먼지/불꽃 줄)
      const dur = s.ph === 'sword' ? .75 : .85, u = Math.min(1, s.t / dur); const yy = s.y * (1 - u); v.pos.set(s.hit.x + s.hit.nx * 2, yy, s.hit.z + s.hit.nz * 2); v.air = yy > .3; v.stun = Math.max(v.stun, .2);
      s.fxT = (s.fxT || 0) - dt; if (s.fxT <= 0) { s.fxT = .08; try { const q = V3(v.pos.x, yy + 6, v.pos.z); burst(q, s.ph === 'sword' ? 8 : 5, s.ph === 'sword' ? ['#fff6c0', '#ffd060', '#ffffff'] : ['#c8b898', '#a89878'], s.ph === 'sword' ? 2.2 : 1.2, s.ph === 'sword' ? 120 : 160, 1); } catch (e) { } }
      if (!s.marked) { s.marked = true; wallMark(s.hit, s.y * .5, s.hit.nx, s.hit.nz, s.ph === 'sword' ? 5 : 9, Math.max(14, s.y + 8)); }
      if (u >= 1) { s.ph = 'kneel'; s.t = 0; v.air = false; v.pos.y = 0; try { apply(v, { pose: 'land', face: null }, .3); } catch (e) { } }
      return; }
    if (s.ph === 'chakra') { // 기 방출로 감속 → 벽 앞에서 떠 있다가 내려섬
      v.pos.set(s.hit.x + s.hit.nx * 6, s.y, s.hit.z + s.hit.nz * 6); v.air = true; v.stun = Math.max(v.stun, .2);
      if (s.t > .45) { s.ph = 'fall'; s.t = 0; s.vy = 0; s.hit = Object.assign({}, s.hit, { x: s.hit.x + s.hit.nx * 3, z: s.hit.z + s.hit.nz * 3 }); }
      return; }
    if (s.ph === 'embed') { v.pos.set(s.hit.x, s.y, s.hit.z); v.air = true; v.stun = Math.max(v.stun, .3); if (s.t > s.dur) { s.ph = 'fall'; s.t = 0; s.vy = 0; } }
    else if (s.ph === 'fall') { s.vy -= 420 * dt; s.y = Math.max(0, s.y + s.vy * dt); v.pos.set(s.hit.x + s.hit.nx * 3, s.y, s.hit.z + s.hit.nz * 3); v.stun = Math.max(v.stun, .3); if (s.y <= 0) { s.ph = 'kneel'; s.t = 0; v.air = false; try { apply(v, { pose: s.kind === 'break' ? 'roll' : 'kneel', face: v.target || null }, .4); if (window.FX3 && FX3.dustRing) FX3.dustRing(V3(v.pos.x, 1, v.pos.z), 10, 12); } catch (e) { } } }
    else if (s.ph === 'kneel') { v.pos.y = 0; v.stun = Math.max(v.stun, .2); if (s.t > (s.kind === 'break' ? .9 : .45)) { s.ph = 'return'; s.t = 0; v.stun = 0; } }
    else if (s.ph === 'return') {
      const d = Math.hypot(v.pos.x, v.pos.z), ux = -v.pos.x / (d || 1), uz = -v.pos.z / (d || 1);
      if (d > ARENA + 22 && s.t < 6) { const sp = 260 * dt; v.pos.x += ux * sp; v.pos.z += uz * sp; v.pos.y = 0; v.heading = Math.atan2(uz, ux); v.air = false; s.runT = (s.runT || 0) - dt; if (s.runT <= 0) { s.runT = .3; try { apply(v, { pose: 'run' }, .3); } catch (e) { } } }
      else { s.ph = 'hop'; s.t = 0; const g = V3(-ux * (ARENA - 14), 0, -uz * (ARENA - 14)), dd = Math.hypot(g.x - v.pos.x, g.z - v.pos.z); if (window.MV) MV.arc(v, g, Math.min(1.1, .45 + dd / 400), 16 + dd * .08); else v.pos.copy(g); } // 경기장 가장자리 안쪽으로 뛰어 들어옴(멀면 크게 도약)
    }
    else if (s.ph === 'hop') { if (!v.arc || s.t > 1.4) { v.away = null; KN.st.cliff.back++; KN.st.cliff.times.push(+(now() - s.t0).toFixed(2)); try { label(headP(v).add(V3(0, 6, 0)), '복귀!', '#cfe8ff'); } catch (e) { } } }
  }
  const _res = resolve;
  resolve = function (a, b) { if ((a && a.away) || (b && b.away)) { KN.st.awaySkip = (KN.st.awaySkip || 0) + 1; return; } return _res.apply(this, arguments); }; // 바깥에 있는 동안은 공격 대상 아님 // 맞은 뒤 1.5초 동안 실제로 밀려난 수평 거리(등급별 평균 측정)
  function situational(a, v) {
    let m = 1;
    const sz = f => (f.scale || 1) * (f.bulk || 1) * (has(f, 'giant') ? 1.32 : 1);
    m *= Math.max(.6, Math.min(1.5, Math.pow(sz(a) / sz(v), .7)));   // 체급 차
    if (has(v, 'giant')) m *= .65; if (has(v, 'armor')) m *= .55;     // 거대화·경화는 덜 날아감
    if (hp01(v) < .3) m *= 1.15;                                      // 체력 낮음
    return m;
  }
  function send(v, a, grade, text) {
    const air = !!v.air, base = KN.GRADE[grade] * situational(a, v) * (air ? 1.25 : 1);
    const d = v.pos.clone().sub(a.pos).setY(0); if (d.lengthSq() < .01) d.set(Math.random() - .5, 0, Math.random() - .5); d.normalize();
    const kbl = Math.hypot(v.kb.x, v.kb.z), hv = Math.max(190, Math.min(kbl, 300)) * base * .43; // 공중 거리 + 미끄러짐(마찰 감속)을 합쳐 기본 넉백의 등급 배수가 되게 맞춘 값
    const kbd = kbl > 1 ? V3(v.kb.x / kbl, 0, v.kb.z / kbl) : d; kbd.lerp(d, .5).normalize();
    const vy = (grade === 'mid' ? 90 + Math.random() * 30 : grade === 'ult' ? 120 + Math.random() * 40 : 140 + Math.random() * 40) + (air ? 50 : 0); // 수평으로 멀리(높이는 적당히)
    let opt = null, lvx = kbd.x * hv, lvy = vy, lvz = kbd.z * hv;
    if (cliffOn() && (grade === 'ult' || grade === 'clash') && !v.away) { // 필살기·맞불 패배: 절벽까지
      const cp = cliffPoint(v.pos, kbd);
      if (cp) { KN.st.cliff.tries++; const T = Math.max(.7, Math.min(1.5, cp.dist / 380)), hy = 22 + Math.random() * 40, h = cp.dist / T * 1.08; lvx = kbd.x * h; lvz = kbd.z * h; lvy = (hy - v.pos.y) / T + .5 * 420 * T; opt = { cliff: cliffHit, onCliff: (f2, hit, y) => cliffImpact(f2, hit, y, a) }; }
    }
    if (window.PHYS && PHYS.ready && PHYS.on && PHYS.launch && PHYS.launch(v, lvx, lvy, lvz, grade, opt)) { KN.st.launched++; }
    else { v.kb.multiplyScalar(base); v.vel.y = Math.max(v.vel.y, vy); v.air = true; }
    if ((grade === 'ult' || grade === 'clash') && typeof cam !== 'undefined' && cam.mode === 'base' && typeof shot === 'function') try { shot('quarter', 1.8, v, a); } catch (e) { } // 날아가는 쪽을 카메라가 따라감
  }
  const _wound = wound;
  wound = function (v, a, text) {
    const r = _wound.apply(this, arguments);
    if (!KN.on || !v || !a || v === a || !F.includes(v) || (a.team && a.team === v.team)) return r;
    const g = gradeOf(a, text);
    watch.push({ v, key: v.ch.key, g, p: v.pos.clone(), t: now() });
    if (g !== 'basic') send(v, a, g, text);
    return r;
  };
  // 막기(가드): 강한 기술이면 날지 않고 더 길게 밀려남
  if (typeof clash === 'function') {
    const _clash = clash;
    clash = function (a, b, text) {
      const r = _clash.apply(this, arguments);
      if (KN.on && a && b && /막기|가드/.test(String(text || ''))) { const g = gradeOf(a, text); if (g !== 'basic') { b.kb.multiplyScalar(g === 'mid' ? 1.25 : 1.6); KN.st.guardSlide++; } }
      return r;
    };
  }
  // 필살기 상쇄(맞불 무승부): 둘 다 크게 튕겨 나감
  if (window.TACTICS && TACTICS.hook) TACTICS.hook('interaction', e => { if (KN.on && e.kind === '필살기 상쇄' && e.f && e.other) { send(e.f, e.other, 'ult', ''); send(e.other, e.f, 'ult', ''); } });
  // 측정 정리(매 화면)
  const _update = update;
  update = function () {
    const r = _update.apply(this, arguments);
    const t = now();
    // 경기장 밖으로 빠지지 않게(모든 인물): 반지름 넘으면 안쪽으로 되돌리고 바깥 방향 밀림은 약하게 반사
    const dtA = arguments[0] || .025; marksTick(dtA);
    for (const f of F) { if (f.away) { awayTick(f, dtA); continue; } if (window.PHYS && PHYS.flights && PHYS.flights.has(f)) continue; const rr = Math.hypot(f.pos.x, f.pos.z); if (rr > ARENA) { const nx = f.pos.x / rr, nz = f.pos.z / rr; f.pos.x = nx * ARENA; f.pos.z = nz * ARENA; const kr = f.kb.x * nx + f.kb.z * nz; if (kr > 0) { f.kb.x -= 1.3 * kr * nx; f.kb.z -= 1.3 * kr * nz; } KN.st.edge = (KN.st.edge || 0) + 1; } }
    for (let i = watch.length - 1; i >= 0; i--) { const w = watch[i]; if (t - w.t < 1.5) continue; watch.splice(i, 1); if (!F.includes(w.v) || w.v.ch.key !== w.key) continue; KN.st[w.g].push(+Math.hypot(w.v.pos.x - w.p.x, w.v.pos.z - w.p.z).toFixed(1)); if (KN.st[w.g].length > 300) KN.st[w.g].shift(); }
    return r;
  };
  KN.summary = () => Object.fromEntries(['basic', 'mid', 'ult', 'clash'].map(g => { const a = KN.st[g]; return [g, a.length ? { 횟수: a.length, 평균거리: +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1), 최대: Math.max(...a) } : { 횟수: 0 }]; }));
})();
