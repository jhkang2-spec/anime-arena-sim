// ═══ 원작 재현: 나루토 세계 (나루토·사스케·카카시·사쿠라·가아라·이타치·가이) ═══
// 기술마다 원작의 몸동작 순서·이펙트 모양·색·맞은 결과를 따라 만든다. (밤가이는 canon.js)
(function () {
  if (typeof CH === 'undefined' || !CH.naruto || typeof envUpdate !== 'function') return;
  const CANON = window.CANON = window.CANON || new Set();
  // ── 공용 도형(한 번만 만들고 돌려씀) ──
  const SG = g => { g.userData.shared = true; return g; };
  const G = { sph: SG(new THREE.SphereGeometry(1, 16, 12)), cone: SG(new THREE.ConeGeometry(1, 1, 10)), cone4: SG(new THREE.ConeGeometry(1, 1, 4)), box: SG(new THREE.BoxGeometry(1, 1, 1)),
    cyl: SG(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true)), cylC: SG(new THREE.CylinderGeometry(1, 1, 1, 10)), tor: SG(new THREE.TorusGeometry(1, .06, 6, 40)), torT: SG(new THREE.TorusGeometry(1, .14, 6, 32)),
    torH: SG(new THREE.TorusGeometry(1, .08, 6, 24, Math.PI)), ring: SG(new THREE.RingGeometry(.8, 1, 48)), disc: SG(new THREE.CircleGeometry(1, 40)), plane: SG(new THREE.PlaneGeometry(1, 1)) };
  const NB = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
  const TOON = c => new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
  function mk(par, geo, c, op = .9, s = [1, 1, 1], p = [0, 0, 0], r = [0, 0, 0], kind) {
    const m = new THREE.Mesh(geo, kind === 'n' ? NB(c, op) : kind === 't' ? TOON(c) : addMat(c, op)); m.scale.set(...s); m.position.set(...p); m.rotation.set(...r); par.add(m); return m;
  }
  function spr(par, tex, c, op, s, p = [0, 0, 0]) { const m = new THREE.Sprite(spriteMat(tex, c, op)); m.scale.set(s, s, 1); m.position.set(...p); par.add(m); return m; }
  // ── 살아 있는 효과(매 화면 갱신) ──
  const live = [];
  function spawn(o) { o.t = 0; if (o.g) { if (!o.g.parent) scene3.add(o.g); o.g.traverse(x => { if (x.material && x.material.userData.op0 === undefined) x.material.userData.op0 = x.material.opacity; }); } live.push(o); while (live.length > 30) end(live[0]); return o; }
  function end(o) { const i = live.indexOf(o); if (i < 0) return; live.splice(i, 1); if (o.g) kill(o.g); if (o.onEnd) try { o.onEnd(); } catch (e) { console.error(e); } }
  function fade(o, a) { if (o.g) o.g.traverse(x => { if (x.material && x.material.userData.op0 !== undefined) x.material.opacity = x.material.userData.op0 * Math.max(0, Math.min(1, a)); }); }
  const _env = envUpdate;
  envUpdate = function (dt, t) {
    _env(dt, t);
    for (let i = live.length - 1; i >= 0; i--) { const o = live[i]; if (!o) continue; o.t += dt; let keep = true; try { keep = o.up(o, dt, t); } catch (e) { console.error(e); keep = false; } if (keep === false || o.t > (o.max || 8)) end(o); }
  };
  // ── 작은 도우미 ──
  const P = (p, v, c, life = 1, g = 0, s = 2, n) => parts.push({ p, v, c, life, g, s, n });
  const smoke = (p, n = 24, r = 6, cols = ['#e8e8f0', '#c8c8d0', '#ffffff']) => { for (let i = 0; i < n; i++) P(p.clone().add(V3(R(-r, r), R(0, r), R(-r, r))), V3(R(-30, 30), R(10, 50), R(-30, 30)), pick(cols), R(.8, 1.3), -6, 3, true); };
  const dust = (p, n = 20, r = 8) => { for (let i = 0; i < n; i++) P(V3(p.x + R(-r, r), .5, p.z + R(-r, r)), V3(R(-50, 50), R(20, 70), R(-50, 50)), pick(['#7a6248', '#8a7258', '#6a5440']), R(.8, 1.4), -4, 3, true); };
  const rocks = (p, n = 16, sp = 1) => { for (let i = 0; i < n; i++) P(p.clone().add(V3(R(-4, 4), 1, R(-4, 4))), V3(R(-70, 70) * sp, R(80, 200) * sp, R(-70, 70) * sp), pick(['#5a4630', '#6a5438', '#4a3a28']), R(1, 1.6), 300, 2, true); };
  const S = (d, a, aa, b, bb, fx) => step(d, [[a, aa], [b, bb]], fx);
  const ground = p => V3(p.x, .3, p.z);
  const right = f => { const w = fwdOf(f); return V3(-w.z, 0, w.x); };
  const follow = (g, f, off = [0, 0, 0]) => { const w = fwdOf(f), r2 = V3(-w.z, 0, w.x); g.position.copy(f.pos).addScaledVector(w, off[0]).add(V3(0, off[1], 0)).addScaledVector(r2, off[2]); g.rotation.y = -f.heading; };
  const crack = (p, r = 20, n = 7, c = '#140c06') => { const g = new THREE.Group(); g.position.copy(ground(p)); for (let i = 0; i < n; i++) { const a = i / n * PI * 2 + R(-.3, .3), L = r * R(.6, 1.2); const m = mk(g, G.plane, c, .85, [L, R(.8, 2), 1], [Math.cos(a) * L / 2, .05, Math.sin(a) * L / 2], [-PI / 2, 0, -a], 'n'); } spawn({ g, max: 3.5, up: (o) => { fade(o, Math.min(1, (3.5 - o.t) / 1)); } }); };
  // 직접 날리는 투사체(원작 모양 그대로). 맞는지는 brain.js 판단(resolve)이 정함
  function fly(a, b, o) {
    const g = o.g, p0 = o.from || handP(a); g.position.copy(p0); let hit = false;
    return spawn({ g, max: o.max || 4, up(s, dt, t) {
      if (hit) { s.ft = (s.ft || 0) + dt; fade(s, 1 - s.ft / (o.fadeT || .25)); return s.ft < (o.fadeT || .25); }
      const tg = o.to ? o.to() : chest(b), d = tg.clone().sub(g.position), L = d.length(), sp = (o.v || 220) * (o.acc ? Math.min(1, .3 + s.t * o.acc) : 1);
      if (L < (o.hitR || 6) || s.t > (o.life || 3)) { hit = true; const hp = g.position.clone(); if (o.onHit) o.onHit(hp); if (o.out !== null) resolve(a, b, o.ek, o.out || 'hit', o.nm, o.pw || 1.2, hp); return true; }
      g.position.addScaledVector(d.normalize(), Math.min(L, sp * dt)); if (o.look !== false) g.lookAt(tg); if (o.tick) o.tick(s, dt, t, g); return true; } });
  }
  // 나루토 그림자 분신 한 명을 잠시 옆에 세워 둠 (분신 모형 재사용)
  function helperClone(a, side, pose, dur, fwd = 0) {
    const m = clonePool.find(c => !c.busy); if (!m) return null; m.busy = true; m.root.visible = true;
    const pos = () => a.pos.clone().addScaledVector(right(a), side).addScaledVector(fwdOf(a), fwd);
    smoke(pos().add(V3(0, 8, 0)), 18, 5);
    return spawn({ max: dur + .2, up(o, dt, t) { poseModel(m, { pos: pos(), heading: a.heading, c: { ...POSE[pose], legF: .3, legB: .3, kneeF: .3, kneeB: .3 }, speed: 0 }, t); return o.t < dur; },
      onEnd() { smoke(pos().add(V3(0, 8, 0)), 18, 5); m.root.visible = false; m.busy = false; } });
  }
  // 손바닥 위 회전 구체(나선환류)
  function ballOnHand(f, o) {
    const g = new THREE.Group(), c = o.c || '#4aa8ff';
    mk(g, G.sph, c, .55, [4, 4, 4]); mk(g, G.sph, '#e8f6ff', .9, [2, 2, 2]); const r1 = mk(g, G.tor, '#bfe6ff', .9, [5, 5, 5]), r2 = mk(g, G.tor, c, .8, [4.6, 4.6, 4.6], [0, 0, 0], [PI / 2, 0, 0]); spr(g, glowTex, c, .8, 18);
    return spawn({ g, max: o.dur, up(s, dt, t) { const k = (o.size || 1) * Math.min(1, s.t * 4) * (1 + Math.sin(t * 40) * .05); g.scale.setScalar(k); g.position.copy(o.at ? o.at() : handP(f)); r1.rotation.set(t * 17, t * 9, 0); r2.rotation.set(PI / 2 + t * 13, 0, t * 21);
      for (let i = 0; i < 3; i++) { const an = R(0, PI * 2), rr = 5 * k; P(g.position.clone().add(V3(Math.cos(an) * rr, R(-2, 2) * k, Math.sin(an) * rr)), V3(-Math.sin(an) * 60, R(-5, 5), Math.cos(an) * 60), pick(['#ffffff', '#bfe6ff', c]), .35, 0, 1); } light(g.position, c, 3 * k); return s.t < o.dur; } });
  }
  // 수사노오(사스케=보라, 이타치=주황빛 붉음): 갈비뼈 → 해골 → 팔, 검·활·방패
  function susanoo(f, o) {
    const g = new THREE.Group(), c = o.c, c2 = o.c2 || '#ffffff', sk = new THREE.Group(); g.add(sk);
    for (let i = 0; i < 6; i++) mk(sk, G.torT, c, .7, [11 - i * .5, 8 - i * .4, 11 - i * .5], [0, 18 + i * 4.2, 0], [PI / 2, 0, 0]);
    mk(sk, G.cylC, c, .7, [1.2, 30, 1.2], [-4, 28, 0]); mk(sk, G.sph, c, .65, [8, 9, 8], [0, 50, 0]); mk(sk, G.sph, c2, .5, [4, 4.5, 4], [0, 50, 0]);
    mk(sk, G.cone, c, .7, [4, 8, 4], [3, 44, 0], [0, 0, -PI / 2]); [-1, 1].forEach(s => spr(sk, flareTex, c2, 1, 6, [6, 52, s * 3]));
    const armF = new THREE.Group(); armF.position.set(0, 40, 13); sk.add(armF); mk(armF, G.cylC, c, .7, [2, 22, 2], [0, -10, 0]); const armB = new THREE.Group(); armB.position.set(0, 40, -13); sk.add(armB); mk(armB, G.cylC, c, .7, [2, 22, 2], [0, -10, 0]);
    let weap = null;
    if (o.sword) { weap = new THREE.Group(); weap.position.set(0, -21, 0); armF.add(weap); mk(weap, G.box, c, .8, [2, 46, 4.5], [0, -23, 0]); mk(weap, G.box, c2, .9, [.6, 44, 1.6], [0, -23, 0]); }
    if (o.bow) { weap = new THREE.Group(); weap.position.set(16, 34, 0); sk.add(weap); mk(weap, G.torH, c, .9, [26, 26, 26], [0, 0, 0], [0, PI / 2, -PI / 2]); mk(weap, G.box, c2, .9, [.4, 52, .4], [-4, 0, 0]); }
    if (o.shield) { weap = new THREE.Group(); weap.position.set(16, 32, -6); sk.add(weap); mk(weap, G.disc, c, .55, [16, 16, 16], [0, 0, 0], [0, PI / 2, 0]); mk(weap, G.ring, c2, .95, [16, 16, 16], [.2, 0, 0], [0, PI / 2, 0]); spr(weap, glowTex, c2, .5, 40); }
    if (o.gourd) { mk(sk, G.sph, c, .7, [5, 6, 5], [-2, 30, 16]); mk(sk, G.sph, c, .7, [3.5, 4, 3.5], [-2, 38, 16]); }
    spr(g, glowTex, c, .4, 120, [0, 30, 0]);
    return spawn({ g, max: o.dur + .6, w: weap, armF, armB, up(s, dt, t) { follow(g, f); const k = Math.min(1, s.t * 2.2); sk.scale.set(k, k, k); const fd = s.t > o.dur ? 1 - (s.t - o.dur) / .6 : 1; fade(s, fd);
      if (o.swing && s.t > o.swing[0] && s.t < o.swing[1]) armF.rotation.z = -1.6 * Math.min(1, (s.t - o.swing[0]) / (o.swing[1] - o.swing[0])) * 1.6 + 1.2; else if (!o.swing || s.t <= o.swing[0]) armF.rotation.z = 1.2;
      if (Math.random() < .7) P(g.position.clone().add(V3(R(-12, 12), R(10, 55), R(-12, 12))), V3(R(-6, 6), R(20, 50), R(-6, 6)), pick([c, c2]), .7, -10, 2); light(g.position.clone().add(V3(0, 30, 0)), c, 4); return true; } });
  }
  // 용(물·번개 등): 머리(주둥이·턱·뿔·눈) + 머리가 지나간 자리를 따라오는 몸통
  function serpent(c, c2, n = 18, R0 = 5) {
    const g = new THREE.Group(), head = new THREE.Group(); g.add(head);
    mk(head, G.cone, c, .85, [R0 * .9, R0 * 3, R0 * .7], [0, .5, R0 * .9], [PI / 2, 0, 0]); const jaw = mk(head, G.cone, c, .8, [R0 * .7, R0 * 2.6, R0 * .4], [0, -R0 * .45, R0 * .8], [PI / 2 + .35, 0, 0]);
    mk(head, G.sph, c, .7, [R0 * 1.4, R0 * 1.2, R0 * 1.6]); mk(head, G.sph, c2, .7, [R0 * .8, R0 * .7, R0 * .9]);
    [-1, 1].forEach(s => { mk(head, G.cone, c2, .9, [R0 * .25, R0 * 2.4, R0 * .25], [s * R0 * .7, R0, -R0 * 1.4], [-1.1, 0, s * .3]); spr(head, flareTex, '#ffffff', 1, R0 * 1.1, [s * R0 * .6, R0 * .5, R0 * .4]); });
    const segs = []; for (let i = 0; i < n; i++) { const s = mk(g, G.sph, i % 3 ? c : c2, .7 - i * .015); s.scale.setScalar(R0 * (1.1 - i * .04)); segs.push(s); }
    return { g, head, jaw, segs, trail: [] };
  }
  function serpentStep(d, pos, dir, t, fx) { d.head.position.copy(pos); d.head.lookAt(pos.clone().add(dir)); d.jaw.rotation.x = PI / 2 + .3 + Math.sin(t * 18) * .15; d.trail.unshift(pos.clone()); if (d.trail.length > 80) d.trail.pop(); d.segs.forEach((s, k) => { const q = d.trail[Math.min(d.trail.length - 1, 2 + k * 3)]; if (q) s.position.copy(q); }); if (fx) fx(pos); }
  // 별 수리검 / 쿠나이 모양
  function shurikenMesh(c = '#9aa0aa', sz = 1.6) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const m = mk(g, G.cone4, c, .95, [sz * .5, sz * 2.2, sz * .12], [Math.cos(i * PI / 2) * sz, Math.sin(i * PI / 2) * sz, 0], [0, 0, i * PI / 2 - PI / 2], 'n'); } mk(g, G.cylC, '#3a3a40', .95, [sz * .5, sz * .3, sz * .5], [0, 0, 0], [PI / 2, 0, 0], 'n'); return g; }
  function kunaiMesh(c = '#a8aeb8') { const g = new THREE.Group(), k = new THREE.Group(); g.add(k); k.rotation.x = PI / 2; mk(k, G.cone4, c, .95, [1.1, 5, .3], [0, 2.8, 0], [0, 0, 0], 'n'); mk(k, G.cylC, '#2a2a30', .95, [.3, 3, .3], [0, -.8, 0], [0, 0, 0], 'n'); mk(k, G.torT, '#2a2a30', .95, [.7, .7, .7], [0, -2.6, 0], [0, 0, 0], 'n'); return g; }
  // 검은 불꽃(아마테라스): 대상에 달라붙어 타오름
  function blackFlame(b, dur, big = 1) {
    return spawn({ max: dur, up(o, dt) { for (let i = 0; i < 4 * big; i++) { const p = b.pos.clone().add(V3(R(-5, 5) * big, R(0, 26), R(-5, 5) * big)); P(p, V3(R(-8, 8), R(30, 70), R(-8, 8)), pick(['#050208', '#120418', '#1e0828']), R(.6, 1), -20, 3, true); if (Math.random() < .35) P(p.clone(), V3(R(-6, 6), R(40, 80), R(-6, 6)), pick(['#7a2aa8', '#b04ae0']), .5, -20, 2); } if (Math.random() < dt * 3 && F.includes(b)) { b.flash = 3; b.kb.add(V3(R(-20, 20), 0, R(-20, 20))); } return true; } });
  }
  // 모래(가아라): 흐르는 모래 알갱이
  const SAND = ['#e0c080', '#c8a060', '#b08850', '#f0d8a0'];
  const sandP = (p, v, life = 1, s = 2) => P(p, v, pick(SAND), life, 60, s, Math.random() < .5);
  // 가아라는 모래가 저절로 막는다(절대 방어). 모래 방패를 쓰면 몇 초 동안 거의 다 막음
  // (판단 층보다 먼저 가로채 확실히 막음: 모래 방패·야타의 거울·흙벽)
  const _res = resolve;
  resolve = function (a, b, ek, o, nm, pw, at) {
    if (a && b && b.ch && F.includes(b) && a !== b && (o === 'hit' || o === 'sub' || o === 'counter')) {
      let why = null;
      if (b.ch.key === 'gaara' && !(b.stun > 0) && Math.random() < ((b.sandT || 0) > 0 ? .9 : .3)) { sandWall(b, a); why = '모래 방패!'; }
      else if ((b.yataT || 0) > 0 && Math.random() < .9) { ring(chest(b).addScaledVector(dirTo(b, a), 8), 6, '#ff7a3a', false, .8, 2.4); why = '야타의 거울!'; }
      else if ((b.wallT || 0) > 0 && Math.random() < .85) { const p = b.pos.clone().addScaledVector(dirTo(b, a), 14).add(V3(0, 14, 0)); impact(p, 5); rocks(p, 10, .6); why = '흙벽에 막힘!'; }
      if (why) { b.kb.addScaledVector(dirTo(a, b), 50); a.kb.addScaledVector(dirTo(a, b), -50); clash(a, b, why, true); return; }
    }
    return _res.call(this, a, b, ek, o, nm, pw, at);
  };
  function sandWall(b, a) {
    const g = new THREE.Group(), d = dirTo(b, a); g.position.copy(b.pos).addScaledVector(d, 7); g.rotation.y = -Math.atan2(d.z, d.x) + PI / 2;
    const w = mk(g, G.sph, '#c8a060', .85, [9, 13, 3], [0, 12, 0], [0, 0, 0], 'n'); mk(g, G.sph, '#e0c080', .5, [10, 14, 3.5], [0, 12, 0], [0, 0, 0], 'n');
    for (let i = 0; i < 30; i++) sandP(g.position.clone().add(V3(R(-8, 8), R(0, 24), R(-8, 8))), V3(R(-30, 30), R(-10, 30), R(-30, 30)), .9);
    spawn({ g, max: 1.2, up(o) { const k = Math.min(1, o.t * 8); g.scale.set(1, k, 1); fade(o, 1.2 - o.t); if (o.t > .8) for (let i = 0; i < 3; i++) sandP(g.position.clone().add(V3(R(-8, 8), R(0, 24), R(-8, 8))), V3(R(-10, 10), R(-60, -10), R(-10, 10)), .7); return true; } });
  }
  // 부채꼴 불꽃 깃(아침 공작)
  function peacock(f, dur) {
    const g = new THREE.Group(), fan = new THREE.Group(); g.add(fan); fan.position.set(-6, 22, 0);
    for (let i = 0; i < 13; i++) { const an = -1.25 + i / 12 * 2.5, len = 22 + Math.abs(Math.cos(an)) * 14; const p = new THREE.Group(); p.rotation.x = an; fan.add(p); mk(p, G.cone, i % 2 ? '#ff7a1a' : '#ffb040', .8, [2.6, len, 1], [0, len / 2, 0]); mk(p, G.cone, '#fff2a0', .9, [1, len * .7, .6], [0, len * .4, 0]); spr(p, glowTex, '#ff8a20', .7, 10, [0, len, 0]); }
    return spawn({ g, max: dur, up(o, dt, t) { follow(g, f); const k = Math.min(1, o.t * 3); fan.scale.set(k, k, k); fan.children.forEach((p, i) => { p.scale.y = 1 + Math.sin(t * 30 + i) * .08; }); fade(o, Math.min(1, (dur - o.t) * 3)); if (Math.random() < .9) P(g.position.clone().add(V3(R(-6, 2), R(10, 45), R(-20, 20))), V3(R(-20, 0), R(20, 60), R(-10, 10)), pick(ELEM.fire.parts), .6, -20, 2); return true; } });
  }
  // 증기(팔문): 몸에서 솟는 색 증기
  const gateSteam = (f, cols, n = 40, k = 1) => { for (let i = 0; i < n; i++) P(f.pos.clone().add(V3(R(-6, 6), R(0, 26), R(-6, 6))), V3(R(-12, 12), R(50, 120) * k, R(-12, 12)), pick(cols), R(.9, 1.5), -20, pick([2, 3])); };
  const auraFollow = (f, dur, cols, rate = 3, glowC) => { const g = new THREE.Group(); if (glowC) spr(g, glowTex, glowC, .5, 50, [0, 16, 0]); return spawn({ g, max: dur, up(o) { g.position.copy(f.pos); for (let i = 0; i < rate; i++) P(f.pos.clone().add(V3(R(-5, 5), R(2, 30), R(-5, 5))), V3(R(-10, 10), R(30, 80), R(-10, 10)), pick(cols), R(.5, .9), -20, pick([2, 3])); fade(o, Math.min(1, (dur - o.t) * 2)); return true; } }); };
  const seals = (a, b, n, d = .1) => Array.from({ length: n }, (_, i) => S(d, a, { pose: i % 2 ? 'seal' : 'twoHand', face: b, k: 90, aura: 1 }, b, { pose: 'guard', face: a }, () => { if (i % 2) P(handP(a), V3(R(-10, 10), R(10, 30), R(-10, 10)), '#9fd8ff', .4, 0, 1); }));
  const def = (b, a) => ({ pose: 'guard', face: a });
  const NAMES = [];
  const reg = (key, name, fn, ...callouts) => { if (!CH[key]) return; CH[key].skills[name] = fn; CANON.add(name); callouts.forEach(c => CANON.add(c)); NAMES.push(key + '/' + name); };

  // ═══════════ 나루토 ═══════════
  reg('naruto', '나선환', (a, b) => [
    S(.25, a, { pose: 'crossArms', aura: 1, face: b, k: 80 }, b, def(b, a), () => { callout(a, '나선환'); helperClone(a, 7, 'cast', 1.0, 3); }),
    S(.5, a, { pose: 'hold', aura: 1, elem: 'wind', face: b, k: 70 }, b, def(b, a), () => ballOnHand(a, { dur: 1.3, size: 1 })),
    S('run', a, { pose: 'crouchRun', face: b, to: near(a, b, 7), elem: 'wind' }, b, { pose: 'guard', face: a }),
    S(.2, a, { pose: 'palm', k: 95, fwd: 60, face: b }, b, { pose: 'hurt', face: a }, () => { const p = chest(b); for (let i = 0; i < 3; i++) add({ k: 'spiral', p: p.clone(), c: i ? '#4aa8ff' : '#ffffff', life: .9 }); ring(p, 4, '#bfe6ff', false, .8, 3); for (let i = 0; i < 24; i++) { const an = i / 24 * PI * 2; P(p.clone(), V3(Math.cos(an) * 160, R(-30, 30), Math.sin(an) * 160), pick(['#ffffff', '#bfe6ff', '#4aa8ff']), .5, 0, 1); } resolve(a, b, 'wind', 'hit', '나선환!', 1.4); b.spinV = 18; }),
    S(.3, a, { pose: 'land', face: b }, b, { pose: 'hurt', spin: 0, face: a })], '나선환!');
  reg('naruto', '거대 나선환', (a, b) => {
    let ball = null; return [
      S(.3, a, { pose: 'crossArms', aura: 1, face: b }, b, def(b, a), () => { callout(a, '초대옥나선환', true); helperClone(a, 9, 'skyRaise', 1.6, 0); helperClone(a, -9, 'skyRaise', 1.6, 0); }),
      S(.7, a, { pose: 'skyRaise', aura: 1, elem: 'wind', face: b, k: 60 }, b, def(b, a), () => { ball = ballOnHand(a, { dur: 2.2, size: 3.6, at: () => headP(a).add(V3(0, 18, 0)) }); }),
      S(.35, a, { pose: 'air', vy: 230, to: near(a, b, 10), face: b, elem: 'wind' }, b, { pose: 'block', face: a }),
      S(.25, a, { pose: 'axe', k: 95, face: b }, b, { pose: 'hurt', face: a }, () => { const p = ground(b.pos); dome(chest(b), 46, '#4aa8ff'); for (let i = 0; i < 4; i++) add({ k: 'spiral', p: chest(b), c: i % 2 ? '#ffffff' : '#4aa8ff', life: 1.3 }); crack(p, 40, 10); scorch(p, 34); rocks(p, 30, 1.3); dust(p, 30, 20); shake = 16; resolve(a, b, 'wind', 'hit', '초대옥나선환!', 2.4); if (ball) ball.t = 99; }),
      S(.35, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })];
  }, '초대옥나선환', '초대옥나선환!');
  // 바람 칼날 수리검: 가운데 공 + 흰 날 4개 + 투명 원판 + '윙' 고리
  function windShuriken(a, b, sz, nm, sage) {
    const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
    mk(spin, G.sph, sage ? '#ff9a3a' : '#4aa8ff', .7, [3.2, 3.2, 3.2]); mk(spin, G.sph, '#ffffff', .95, [1.8, 1.8, 1.8]);
    for (let i = 0; i < 4; i++) { const bl = new THREE.Group(); bl.rotation.z = i * PI / 2; spin.add(bl); mk(bl, G.cone4, '#ffffff', .9, [2.2, 14, .25], [7, 3, 0], [0, 0, -1.2]); mk(bl, G.cone4, '#cfeaff', .6, [3.4, 16, .3], [7.5, 3.5, 0], [0, 0, -1.2]); }
    mk(spin, G.disc, '#dff4ff', .3, [15, 15, 15]); mk(spin, G.ring, '#ffffff', .7, [15, 15, 15]); spr(g, glowTex, sage ? '#ffb060' : '#9fe0ff', .7, 40);
    g.scale.setScalar(sz);
    return fly(a, b, { g, from: fromHigh(a), v: 210, acc: 2, ek: 'wind', nm, pw: 1.8 * sz, out: 'hit', hitR: 8 * sz, look: true,
      tick(s, dt, t) { spin.rotation.z = t * 40; if (Math.random() < .4) ring(g.position.clone(), 6 * sz, '#ffffff', false, .35, 2.6); for (let i = 0; i < 4; i++) P(g.position.clone().add(V3(R(-8, 8), R(-8, 8), R(-8, 8)).multiplyScalar(sz)), V3(R(-60, 60), R(-60, 60), R(-60, 60)), pick(['#ffffff', '#cfeaff']), .3, 0, 1); },
      onHit(p) { windDome(p, sz, sage); } });
  }
  // 맞으면 흰 바람 바늘이 가득 찬 거대한 구가 펼쳐짐
  function windDome(p, sz, sage) {
    const g = new THREE.Group(); g.position.copy(p); const R0 = 30 * sz;
    mk(g, G.sph, '#dff4ff', .25, [1, 1, 1]); mk(g, G.sph, sage ? '#ffb060' : '#9fe0ff', .2, [.8, .8, .8]);
    const nd = new THREE.Group(); g.add(nd); for (let i = 0; i < 70; i++) { const d = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(); const m = mk(nd, G.box, '#ffffff', .85, [.25, .25, 1]); m.userData.d = d; m.lookAt(d); }
    spr(g, glowTex, '#ffffff', .6, 2.4);
    shake = 18; flashScreen(.15, '220,240,255'); label(p.clone().add(V3(0, 20, 0)), '바람 칼날 폭풍!', '#ffffff', { big: true });
    spawn({ g, max: 2.2, up(o, dt, t) { const k = Math.min(1, o.t * 5) * R0; g.children[0].scale.setScalar(k); g.children[1].scale.setScalar(k * .8); g.children[3].scale.set(k * 2.6, k * 2.6, 1);
      nd.children.forEach(m => { const L = k * R(.6, 1.05); m.position.copy(m.userData.d).multiplyScalar(L * .5); m.scale.set(.3, .3, L); }); nd.rotation.y = t * 3; fade(o, Math.min(1, (2.2 - o.t) * 1.6));
      if (Math.random() < .5) ring(p.clone(), k * .3, '#ffffff', false, .4, 3); return true; } });
    F.forEach(f => { if (f.pos.distanceTo(p) < R0 * 1.1) f.kb.addScaledVector(f.pos.clone().sub(p).setY(0).normalize(), 120); });
  }
  reg('naruto', '나선수리검', (a, b) => [
    S(.35, a, { pose: 'hold', aura: 1, elem: 'wind', face: b }, b, def(b, a), () => { callout(a, '풍둔 · 나선수리검', true); helperClone(a, 7, 'cast', .9, 2); ballOnHand(a, { dur: .5, size: 1.2 }); }),
    S(.45, a, { pose: 'skyRaise', aura: 1, elem: 'wind', face: b, k: 60 }, b, def(b, a), () => { const g = new THREE.Group(); spawn({ g, max: .5, up(o, dt, t) { g.position.copy(fromHigh(a)); for (let i = 0; i < 6; i++) { const an = R(0, PI * 2); P(g.position.clone().add(V3(Math.cos(an) * 12, R(-1, 1), Math.sin(an) * 12)), V3(-Math.sin(an) * 120, 0, Math.cos(an) * 120), '#ffffff', .3, 0, 1); } if (Math.random() < .5) ring(g.position.clone(), 8, '#ffffff', true, .3, 2); return true; } }); }),
    S(.25, a, { pose: 'throw', k: 90, face: b }, b, { pose: 'block', face: a }, () => windShuriken(a, b, 1.2, '나선수리검!')),
    S(.8, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '풍둔 · 나선수리검', '나선수리검!');
  reg('naruto', '초대옥나선수리검', (a, b) => [
    S(.4, a, { pose: 'kneel', aura: 1, elem: 'kurama', face: b }, b, def(b, a), () => { callout(a, '선술 · 초대옥나선수리검', true); auraFollow(a, 2.2, ['#ff9a3a', '#ffd060', '#ffffff'], 3, '#ff9a3a'); helperClone(a, 8, 'skyRaise', 1.4); helperClone(a, -8, 'skyRaise', 1.4); }),
    S(.6, a, { pose: 'skyRaise', aura: 1, elem: 'kurama', face: b, k: 60 }, b, def(b, a), () => ballOnHand(a, { dur: .9, size: 3, c: '#ff9a3a', at: () => fromHigh(a) })),
    S(.3, a, { pose: 'throw', k: 90, face: b }, b, { pose: 'block', face: a }, () => windShuriken(a, b, 2.2, '초대옥나선수리검!', true)),
    S(1, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '선술 · 초대옥나선수리검', '초대옥나선수리검!');
  reg('naruto', '그림자 분신술', (a, b) => [
    S(.3, a, { pose: 'crossArms', aura: 1, face: b, k: 80 }, b, def(b, a), () => { callout(a, '그림자 분신술'); for (let i = 0; i < 4; i++) pending.push({ t: i * .06, fn: () => { const p = a.pos.clone().add(V3(R(-22, 22), 8, R(-22, 22))); smoke(p, 22, 6); spawnClone(a, b); } }); }),
    S(.9, a, { pose: 'stance', face: b }, b, { pose: 'block', face: a })]);
  reg('naruto', '다중 그림자 분신술', (a, b) => [
    S(.35, a, { pose: 'crossArms', aura: 1, face: b, k: 80 }, b, def(b, a), () => { callout(a, '다중 그림자 분신술', true);
      for (let i = 0; i < 14; i++) { const an = i / 14 * PI * 2, p = b.pos.clone().add(V3(Math.cos(an) * 40, 0, Math.sin(an) * 30)); pending.push({ t: i * .03, fn: () => { smoke(p.clone().add(V3(0, 8, 0)), 14, 5); ghosts.push({ ch: a.ch, pos: p, heading: Math.atan2(b.pos.z - p.z, b.pos.x - p.x), c: { ...POSE.guard }, life: 1.6, color: '#ffb040', dec: .5 }); } }); }
      for (let i = 0; i < 4; i++) pending.push({ t: .4 + i * .08, fn: () => spawnClone(a, b) }); }),
    S(1.1, a, { pose: 'stance', face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 6; i++) pending.push({ t: .2 + i * .1, fn: () => { impact(chest(b).add(V3(R(-4, 4), R(-4, 4), R(-4, 4))), 3); P(chest(b), V3(R(-60, 60), R(20, 60), R(-60, 60)), '#ffffff', .4, 0, 1); } }); pending.push({ t: .8, fn: () => resolve(a, b, 'power', 'hit', '분신 집단 공격!', 1.3) }); })], '다중 그림자 분신술');
  reg('naruto', '구미 차크라 모드', (a, b) => [
    S(.4, a, { pose: 'kneel', aura: 1, elem: 'kurama', face: b }, b, def(b, a), () => { callout(a, '구미 차크라 모드', true); flashScreen(.12, '255,200,80'); }),
    S(.5, a, { pose: 'openArms', aura: 1, elem: 'kurama', face: b, k: 60 }, b, def(b, a), () => { a.mode = 7; a.modeK = 'kurama'; a.modeElem = 'kurama'; pillar(ground(a.pos), 16, '#ffb030', 1.2); ring(ground(a.pos), 6, '#ffd060', true, 1.2, 3); // 금빛 불꽃 망토 + 검은 문양
      const g = new THREE.Group(); spr(g, glowTex, '#ffc040', .55, 46, [0, 16, 0]);
      spawn({ g, max: 7, up(o) { g.position.copy(a.pos); for (let i = 0; i < 5; i++) { const p = a.pos.clone().add(V3(R(-4, 4), R(1, 30), R(-4, 4))); P(p, V3(R(-6, 6), R(30, 70), R(-6, 6)), pick(['#ffd060', '#ffb030', '#fff0a0', '#ff8a20']), R(.4, .7), -20, pick([1, 2, 3])); } if (Math.random() < .3) P(a.pos.clone().add(V3(R(-3, 3), R(8, 26), R(-3, 3))), V3(0, 20, 0), '#120808', .5, 0, 2, true); fade(o, Math.min(1, 7 - o.t)); return a.mode > 0; } }); }),
    S(.2, a, { pose: 'stance', face: b, elem: 'kurama' }, b, def(b, a))], '구미 차크라 모드');
  reg('naruto', '선인 모드', (a, b) => [
    S(.9, a, { pose: 'kneel', aura: 0, face: b, k: 40 }, b, { pose: 'stance', face: a }, () => { callout(a, '선인 모드'); spawn({ max: .9, up(o) { for (let i = 0; i < 4; i++) { const an = R(0, PI * 2), rr = R(25, 50), p = a.pos.clone().add(V3(Math.cos(an) * rr, R(2, 30), Math.sin(an) * rr)); P(p, chest(a).sub(p).multiplyScalar(1.6), pick(['#a0e070', '#e0d060', '#ffffff']), .6, 0, 1); } return true; } }); }),
    S(.3, a, { pose: 'openArms', face: b, elem: 'kurama' }, b, def(b, a), () => { a.mode = 6; a.modeK = 'sage'; a.modeElem = 'kurama'; const g = new THREE.Group(); [-1, 1].forEach(s => spr(g, flareTex, '#ff8a20', .9, 3.2)); spawn({ g, max: 6, up(o) { const h = headP(a).addScaledVector(fwdOf(a), 1.6), r2 = right(a); g.children[0].position.copy(h).addScaledVector(r2, .9); g.children[1].position.copy(h).addScaledVector(r2, -.9); if (Math.random() < .3) P(a.pos.clone().add(V3(R(-6, 6), R(0, 28), R(-6, 6))), V3(0, 20, 0), pick(['#ffb060', '#ffffff']), .6, -10, 1); return a.mode > 0; } }); ring(ground(a.pos), 5, '#ff9a3a', true, 1, 2.6); })], '선인 모드');
  reg('naruto', '미수옥', (a, b) => {
    let orb = null; return [
      S(.45, a, { pose: 'armsWide', aura: 1, elem: 'kurama', face: b }, b, def(b, a), () => { callout(a, '미수옥', true); giants.push({ f: a, color: '#ff7a1a', life: 3.4 }); gateSteam(a, ['#ff9a3a', '#ffd060'], 60); }),
      S(.8, a, { pose: 'twoHand', aura: 1, elem: 'kurama', face: b, k: 50 }, b, def(b, a), () => { // 검은 차크라·흰 차크라가 모여 공이 됨
        const g = new THREE.Group(); const core = mk(g, G.sph, '#08040e', .95, [1, 1, 1], [0, 0, 0], [0, 0, 0], 'n'); const rim = mk(g, G.sph, '#9a4aff', .45, [1.25, 1.25, 1.25]); spr(g, glowTex, '#ff7a1a', .5, 3);
        orb = spawn({ g, max: 1.4, up(o) { const at = fromHigh(a).add(V3(0, 14, 0)).addScaledVector(fwdOf(a), 6), k = o.t < .55 ? 2 + o.t * 14 : Math.max(.5, 9.7 - (o.t - .55) * 20); g.position.copy(at); g.scale.setScalar(k);
          for (let i = 0; i < 6; i++) { const d = V3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), p = at.clone().addScaledVector(d, 40); P(p, d.multiplyScalar(-90), pick(['#0a0612', '#ffffff', '#3a1a5a']), .45, 0, 2, Math.random() < .5); } light(at, '#9a4aff', 5); return true; } }); }),
      S(.25, a, { pose: 'palm', k: 95, face: b }, b, { pose: 'block', face: a }, () => { const g = new THREE.Group(); mk(g, G.sph, '#08040e', .95, [9, 9, 9], [0, 0, 0], [0, 0, 0], 'n'); mk(g, G.sph, '#9a4aff', .4, [11, 11, 11]); mk(g, G.sph, '#ff7a1a', .25, [13, 13, 13]); spr(g, glowTex, '#ff9a3a', .6, 50);
        fly(a, b, { g, from: fromHigh(a).add(V3(0, 10, 0)), v: 200, acc: 1.5, ek: 'kurama', nm: '미수옥!', pw: 2.8, hitR: 12, tick(s) { P(g.position.clone(), V3(R(-30, 30), R(-30, 30), R(-30, 30)), pick(['#9a4aff', '#ff7a1a', '#0a0612']), .5, 0, 3, Math.random() < .3); }, onHit(p) { ultBlast(p, 'kurama', 95, a, '미수옥!'); dome(p, 60, '#1a0a2a', '#9a4aff'); dome(p, 48, '#ff7a1a'); scorch(p, 50); crack(p, 50, 12); shake = 22; } }); }),
      S(1, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })];
  }, '미수옥', '미수옥!');

  // ═══════════ 사스케 ═══════════
  function chidoriRun(a, b, nm, c, blade) { // 손의 번개 + 땅을 긁는 불꽃 궤적
    const hand = new THREE.Group(); spr(hand, glowTex, c, .8, 22); mk(hand, G.sph, '#ffffff', .9, [1.6, 1.6, 1.6]); if (blade) mk(hand, G.cone4, '#e8f4ff', .8, [1.6, 12, .5], [0, 0, 7], [PI / 2, 0, 0]);
    return spawn({ g: hand, max: 2.6, up(o) { const hp = handP(a); hand.position.copy(hp); hand.lookAt(chest(b)); for (let i = 0; i < 2; i++) bolt(hp, hp.clone().add(V3(R(-9, 9), R(-9, 9), R(-9, 9))), i ? c : '#ffffff', .25, .8); for (let i = 0; i < 3; i++) P(hp.clone(), V3(R(-90, 90), R(-40, 90), R(-90, 90)), pick(['#ffffff', c]), .25, 200, 1);
      if (a.speed > 20 || a.vel.lengthSq() > 900) { const gp = ground(a.pos).addScaledVector(fwdOf(a), 3); mark(gp, R(0, PI), 6, c, .6, .8); P(gp, V3(R(-40, 40), R(30, 80), R(-40, 40)), '#ffffff', .4, 300, 1); }
      light(hp, c, 4); return o.t < (o.dur || 2.2); } });
  }
  reg('sasuke', '치도리', (a, b) => { let L = null; return [
    ...['seal', 'twoHand', 'seal'].map((p, i) => S(.09, a, { pose: p, face: b, k: 95 }, b, def(b, a))),
    S(.35, a, { pose: 'chidori', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { callout(a, '치도리'); L = chidoriRun(a, b, '치도리', '#6ab8ff'); L.dur = 1.8; }),
    S('run', a, { pose: 'chidori', face: b, to: near(a, b, 5), ghost: 1, elem: 'bolt' }, b, { pose: 'guard', face: a }),
    S(.18, a, { pose: 'palm', k: 95, fwd: 80, face: b }, b, { pose: 'hurt', face: a }, () => { const p = chest(b); for (let i = 0; i < 8; i++) bolt(p, p.clone().addScaledVector(dirTo(a, b), R(10, 30)).add(V3(R(-10, 10), R(-10, 10), R(-10, 10))), i % 2 ? '#6ab8ff' : '#ffffff', .5, 1.2); impact(p, 6); resolve(a, b, 'bolt', 'hit', '치도리!', 1.6); if (L) L.t = 99; }),
    S(.3, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })]; }, '치도리!');
  function bigFireball(a, b, nm, sz, col) {
    return [
      S(.12, a, { pose: 'seal', face: b, k: 95 }, b, def(b, a), () => callout(a, nm, sz > 2.4)),
      S(.25, a, { pose: 'mouthSeal', aura: 1, elem: 'fire', face: b, lean: -4 }, b, def(b, a), () => { for (let i = 0; i < 20; i++) P(headP(a).add(V3(R(-20, 20), R(-10, 10), R(-20, 20))), V3(0, 0, 0).sub(V3(R(-20, 20), R(-10, 10), R(-20, 20))), '#ffffff', .25, 0, 1); }),
      S(.35, a, { pose: 'blow', k: 90, face: b, elem: 'fire', fwd: -30 }, b, { pose: 'block', face: a }, () => { const g = new THREE.Group(); mk(g, G.sph, col[0], .55, [1, 1, 1]); mk(g, G.sph, col[1], .7, [.75, .75, .75]); mk(g, G.sph, '#fff2a0', .8, [.45, .45, .45]); spr(g, glowTex, col[0], .6, 3.2);
        const from = fromHead(a); for (let i = 0; i < 30; i++) P(from.clone(), dirTo(a, b).multiplyScalar(R(80, 180)).add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), pick(ELEM.fire.parts), .4, -20, 2);
        fly(a, b, { g, from, v: 150, ek: 'fire', nm: nm + '!', pw: 1.4 * sz / 2, hitR: 6 * sz, tick(s, dt, t, gg) { const k = sz * 6 * Math.min(1, .3 + s.t * 2.5); gg.scale.setScalar(k * (1 + Math.sin(t * 25) * .06)); for (let i = 0; i < 4; i++) P(gg.position.clone().add(V3(R(-1, 1), R(-1, 1), R(-1, 1)).multiplyScalar(k)), V3(R(-30, 30), R(20, 70), R(-30, 30)), pick(ELEM.fire.parts), .6, -30, pick([2, 3])); },
          onHit(p) { dome(p, 14 * sz, col[0]); flames(ground(p), 1.4, true); scorch(p, 10 * sz); for (let i = 0; i < 40; i++) P(p.clone(), V3(R(-1, 1), R(-.2, 1), R(-1, 1)).normalize().multiplyScalar(R(80, 200)), pick(ELEM.fire.parts), .8, -20, 2); shake = 10; } }); }),
      S(.5, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })];
  }
  reg('sasuke', '호화구의 술', (a, b) => bigFireball(a, b, '화둔 · 호화구의 술', 2.4, ['#ff6a10', '#ff9a30']), '화둔 · 호화구의 술', '화둔 · 호화구의 술!');
  function amaterasu(a, b, nm, big) { return [
    S(.35, a, { pose: 'eyeHand', aura: 1, elem: 'dark', face: b, k: 60 }, b, def(b, a), () => { callout(a, nm, big); P(headP(a).addScaledVector(fwdOf(a), 1.5), V3(0, -20, 0), '#c00010', 1, 60, 1); }),
    S(.3, a, { pose: 'stare', face: b, elem: 'dark' }, b, { pose: 'hurt', face: a }, () => { const p = chest(b); flashScreen(.06, '40,0,40'); for (let i = 0; i < 30; i++) P(p.clone(), V3(R(-60, 60), R(0, 80), R(-60, 60)), pick(['#050208', '#120418']), .7, -10, 3, true); blackFlame(b, big ? 2.6 : 1.8, big ? 1.6 : 1); if (big) { const d = dirTo(a, b); for (let i = 1; i < 6; i++) { const q = a.pos.clone().addScaledVector(d, a.pos.distanceTo(b.pos) * i / 6); pending.push({ t: i * .05, fn: () => { for (let k = 0; k < 12; k++) P(q.clone().add(V3(R(-3, 3), R(0, 6), R(-3, 3))), V3(R(-6, 6), R(30, 70), R(-6, 6)), pick(['#050208', '#1e0828']), 1, -20, 3, true); } }); } }
      pending.push({ t: .25, fn: () => resolve(a, b, 'dark', 'hit', nm + '!', big ? 1.8 : 1.4) }); }),
    S(.5, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })]; }
  reg('sasuke', '천조', (a, b) => amaterasu(a, b, '천조 아마테라스', false), '천조 아마테라스', '천조 아마테라스!');
  reg('sasuke', '기린', (a, b) => [
    S(.6, a, { pose: 'skyRaise', aura: 1, elem: 'bolt', face: b, k: 50 }, b, { pose: 'stance', face: a }, () => { // 먹구름이 모임
      spawn({ max: 2.6, up(o) { for (let i = 0; i < 6; i++) P(V3(b.pos.x + R(-120, 120), R(160, 230), b.pos.z + R(-90, 60)), V3(R(-15, 15), R(-3, 3), R(-15, 15)), pick(['#14161e', '#1e2028', '#282a34']), R(1.2, 2), 0, 3, true); if (Math.random() < .05) bolt(V3(b.pos.x + R(-80, 80), 220, b.pos.z + R(-60, 40)), V3(b.pos.x + R(-80, 80), 160, b.pos.z + R(-60, 40)), '#cfe8ff', .3, 1.5); return true; } }); }),
    ...kirin(a, b)], '기린');
  reg('sasuke', '수사노오', (a, b) => { let su = null; return [
    S(.4, a, { pose: 'crossArms', aura: 1, elem: 'dark', face: b }, b, def(b, a), () => { callout(a, '완성체 수사노오', true); su = susanoo(a, { c: '#9a4aff', c2: '#e0c0ff', sword: true, dur: 2.4, swing: [1.1, 1.45] }); }),
    S(.75, a, { pose: 'openArms', aura: 1, elem: 'dark', face: b, k: 50 }, b, { pose: 'guard', face: a }),
    S(.35, a, { pose: 'swordDown', k: 90, face: b, elem: 'dark' }, b, { pose: 'block', face: a }, () => { pending.push({ t: .18, fn: () => { const p = chest(b); arc(a, -2.6, 1.2, 70, '#c080ff', 16, 1.2); crack(p, 46, 3, '#1a0a2a'); scorch(p, 30); dome(p, 26, '#9a4aff'); shake = 16; resolve(a, b, 'dark', 'hit', '수사노오 참격!', 2.2); } }); }),
    S(.6, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })]; }, '완성체 수사노오', '수사노오 참격!');
  reg('sasuke', '인드라의 화살', (a, b) => [
    S(.4, a, { pose: 'eyeHand', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { callout(a, '인드라의 화살', true); susanoo(a, { c: '#8a3aff', c2: '#e0d0ff', bow: true, dur: 2.4 }); }),
    S(.8, a, { pose: 'archer', aura: 1, elem: 'bolt', face: b, k: 50 }, b, def(b, a), () => { spawn({ max: .8, up(o) { const p = a.pos.clone().add(V3(0, 34, 0)).addScaledVector(fwdOf(a), 10); for (let i = 0; i < 3; i++) bolt(p, p.clone().add(V3(R(-14, 14), R(-14, 14), R(-14, 14))), i ? '#b080ff' : '#ffffff', .25, 1.2); light(p, '#b080ff', 6); return true; } }); }),
    S(.3, a, { pose: 'openPalm', k: 95, face: b }, b, { pose: 'block', face: a }, () => { const g = new THREE.Group(), k = new THREE.Group(); g.add(k); k.rotation.x = PI / 2; mk(k, G.cone4, '#ffffff', .95, [3, 16, 3], [0, 14, 0]); mk(k, G.cylC, '#b080ff', .85, [1.4, 40, 1.4], [0, -12, 0]); spr(g, glowTex, '#b080ff', .7, 40);
      fly(a, b, { g, from: a.pos.clone().add(V3(0, 34, 0)).addScaledVector(fwdOf(a), 12), v: 520, ek: 'bolt', nm: '인드라의 화살!', pw: 2.8, hitR: 10, tick(s) { for (let i = 0; i < 2; i++) bolt(g.position.clone(), g.position.clone().add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), '#b080ff', .3, 1.4); P(g.position.clone(), V3(R(-20, 20), R(-20, 20), R(-20, 20)), '#ffffff', .4, 0, 2); },
        onHit(p) { ultBlast(p, 'bolt', 90, a, '인드라의 화살!'); pillar(ground(p), 40, '#b080ff', 1.6); for (let i = 0; i < 8; i++) bolt(p.clone().add(V3(R(-30, 30), 240, R(-30, 30))), p.clone(), i % 2 ? '#b080ff' : '#ffffff', 1.2, 2.6); dome(p, 56, '#8a3aff'); shake = 24; } }); }),
    S(.9, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '인드라의 화살', '인드라의 화살!');
  reg('sasuke', '치도리 천본', (a, b) => [
    S(.3, a, { pose: 'chidori', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { callout(a, '치도리 천본'); chidoriRun(a, b, '', '#6ab8ff').dur = .6; }),
    S(.25, a, { pose: 'skySweep', k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 12; i++) pending.push({ t: i * .02, fn: () => { const g = new THREE.Group(); mk(g, G.box, '#cfe8ff', .95, [.25, .25, 7]); spr(g, glowTex, '#6ab8ff', .6, 5); const sp = right(a).multiplyScalar(R(-14, 14)); fly(a, b, { g, from: handP(a).add(sp.clone().multiplyScalar(.2)), to: () => chest(b).add(sp), v: 420, ek: 'bolt', nm: i === 11 ? '치도리 천본!' : '', pw: .5, out: i % 3 ? null : 'hit', hitR: 5, onHit(p) { bolt(p, p.clone().add(V3(R(-6, 6), R(-6, 6), R(-6, 6))), '#6ab8ff', .3, .8); } }); } }); }),
    S(.6, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '치도리 천본', '치도리 천본!');
  reg('sasuke', '치도리 예창', (a, b) => [
    S(.3, a, { pose: 'chidori', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { callout(a, '치도리 예창'); chidoriRun(a, b, '', '#6ab8ff').dur = .9; }),
    S(.4, a, { pose: 'palm', k: 95, face: b }, b, { pose: 'block', face: a }, () => { // 손끝에서 번개 창이 쭉 늘어남
      const g = new THREE.Group(), sh = mk(g, G.cylC, '#9fd0ff', .85, [1, 1, 1]); const tip = mk(g, G.cone4, '#ffffff', .95, [1.6, 6, 1.6]); spr(g, glowTex, '#6ab8ff', .5, 14); let done = false;
      spawn({ g, max: .7, up(o) { const hp = handP(a), tg = chest(b), d = tg.clone().sub(hp), L = d.length() * Math.min(1, o.t * 6); d.normalize(); sh.scale.set(.7, L, .7); sh.position.copy(hp).addScaledVector(d, L / 2); sh.quaternion.setFromUnitVectors(V3(0, 1, 0), d); tip.position.copy(hp).addScaledVector(d, L); tip.quaternion.copy(sh.quaternion); g.children[2].position.copy(tip.position);
        for (let i = 0; i < 2; i++) bolt(sh.position.clone().addScaledVector(d, R(-L / 2, L / 2)), sh.position.clone().addScaledVector(d, R(-L / 2, L / 2)).add(V3(R(-5, 5), R(-5, 5), R(-5, 5))), '#9fd0ff', .2, .8);
        if (!done && o.t > .17) { done = true; impact(tg, 5); resolve(a, b, 'bolt', 'hit', '치도리 예창!', 1.5); } fade(o, Math.min(1, (.7 - o.t) * 4)); return true; } }); }),
    S(.4, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '치도리 예창', '치도리 예창!');
  reg('sasuke', '염둔 가구츠치', (a, b) => [
    S(.4, a, { pose: 'eyeHand', aura: 1, elem: 'dark', face: b }, b, def(b, a), () => { callout(a, '염둔 · 가구츠치', true); P(headP(a).addScaledVector(fwdOf(a), 1.5), V3(0, -20, 0), '#c00010', 1, 60, 1); blackFlame(a, .8, .6); }),
    S(.3, a, { pose: 'openPalm', k: 90, face: b, elem: 'dark' }, b, { pose: 'block', face: a }, () => { // 검은 불꽃이 가시로 굳어 대상 주위에서 솟음
      const g = new THREE.Group(); g.position.copy(ground(b.pos)); for (let i = 0; i < 11; i++) { const an = i / 11 * PI * 2, rr = R(5, 12); const sp = new THREE.Group(); sp.position.set(Math.cos(an) * rr, 0, Math.sin(an) * rr); sp.rotation.set(Math.sin(an) * .5, 0, -Math.cos(an) * .5); g.add(sp); mk(sp, G.cone, '#0a0410', .95, [2.2, 1, 2.2], [0, .5, 0], [0, 0, 0], 'n'); mk(sp, G.cone, '#9a4aff', .5, [2.6, 1.05, 2.6], [0, .5, 0]); sp.userData.h = R(18, 34); }
      spawn({ g, max: 1.8, up(o) { const k = Math.min(1, o.t * 6); g.children.forEach(sp => sp.scale.set(1, sp.userData.h * k, 1)); fade(o, Math.min(1, (1.8 - o.t) * 2)); if (Math.random() < .8) P(g.position.clone().add(V3(R(-12, 12), R(0, 20), R(-12, 12))), V3(0, 40, 0), pick(['#050208', '#1e0828']), .7, -10, 3, true); return true; } });
      blackFlame(b, 1.6, 1.3); pending.push({ t: .15, fn: () => resolve(a, b, 'dark', 'hit', '가구츠치!', 1.8) }); }),
    S(.6, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '염둔 · 가구츠치', '가구츠치!');

  // ═══════════ 카카시 ═══════════
  reg('kakashi', '라이키리', (a, b) => { let L = null; return [
    S(.3, a, { pose: 'eyeHand', aura: 1, face: b }, b, def(b, a), () => { callout(a, '라이키리'); P(headP(a).addScaledVector(fwdOf(a), 1.5), V3(0, 0, 0), '#ff2020', .6, 0, 2); }),
    S(.35, a, { pose: 'chidori', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { L = chidoriRun(a, b, '라이키리', '#cfe8ff', true); L.dur = 1.6; }),
    S('run', a, { pose: 'chidori', face: b, to: () => b.pos.clone().addScaledVector(dirTo(a, b), 14), ghost: 1, elem: 'bolt' }, b, { pose: 'guard', face: a }, () => { for (let i = 0; i < 4; i++) pending.push({ t: i * .05, fn: () => ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .6, color: '#cfe8ff', dec: .4 }) }); }),
    S(.2, a, { pose: 'palm', k: 95, face: b }, b, { pose: 'hurt', face: a }, () => { const p = chest(b), d = dirTo(a, b); mark(p, 0, 34, '#ffffff', 1.6, 1); mark(p, .2, 30, '#cfe8ff', 1, 1); for (let i = 0; i < 6; i++) bolt(p, p.clone().addScaledVector(d, R(10, 40)).add(V3(R(-8, 8), R(-8, 8), R(-8, 8))), '#ffffff', .5, 1.4); resolve(a, b, 'bolt', 'hit', '라이키리!', 1.6); if (L) L.t = 99; }),
    S(.3, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })]; }, '라이키리!');
  function kamuiAt(p, dur = 1.4, pull) { // 공간이 소용돌이치며 한 점으로 빨려 듦
    const g = new THREE.Group(); g.position.copy(p); const rs = []; for (let i = 0; i < 5; i++) { const m = mk(g, G.ring, i % 2 ? '#5a2a8a' : '#1a0a2a', .7, [1, 1, 1], [0, 0, 0], [0, 0, i], 'n'); rs.push(m); }
    spr(g, glowTex, '#7a3aaa', .5, 30); add({ k: 'spiral', p: p.clone(), c: '#7a3aaa', life: dur });
    return spawn({ g, max: dur, up(o, dt, t) { g.lookAt(camera.position); rs.forEach((m, i) => { const k = (1 - ((o.t * 1.4 + i / 5) % 1)) * 26; m.scale.setScalar(k); m.rotation.z = t * (4 + i); }); for (let i = 0; i < 4; i++) { const an = R(0, PI * 2), rr = R(10, 26); P(p.clone().add(V3(Math.cos(an) * rr, Math.sin(an) * rr, R(-4, 4))), V3(-Math.cos(an) * rr * 3, -Math.sin(an) * rr * 3, 0), pick(['#3a1a5a', '#ffffff', '#7a3aaa']), .4, 0, 1); }
      if (pull) F.forEach(f => { if (f !== pull.owner && f.pos.distanceTo(p) < 30) f.kb.addScaledVector(p.clone().sub(f.pos).setY(0).normalize(), 220 * dt * 8); }); fade(o, Math.min(1, (dur - o.t) * 2)); return true; } });
  }
  reg('kakashi', '카무이', (a, b) => [
    S(.35, a, { pose: 'eyeHand', aura: 1, elem: 'dark', face: b, k: 60 }, b, def(b, a), () => { callout(a, '카무이', true); P(headP(a).addScaledVector(fwdOf(a), 1.5), V3(0, 0, 0), '#ff2020', .8, 0, 2); }),
    S(.9, a, { pose: 'eyeHand', face: b, elem: 'dark' }, b, { pose: 'hurt', face: a }, () => { kamuiAt(chest(b), 1.3, { owner: a }); b.stun = Math.max(b.stun || 0, .8); pending.push({ t: .9, fn: () => { flashScreen(.06, '60,20,90'); resolve(a, b, 'dark', 'hit', '카무이!', 1.6); } }); }),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '카무이', '카무이!');
  function waterDragon(a, b, nm, sz = 1) {
    const d = serpent('#3a90e0', '#bfe6ff', 20, 5 * sz), p0 = ground(a.pos).addScaledVector(fwdOf(a), 12); let hit = false;
    spawn({ g: d.g, max: 2.4, up(o, dt, t) { const u = Math.min(1, o.t / 1.3), tg = chest(b), mid = a.pos.clone().lerp(b.pos, .4).add(V3(0, 70 * sz, 0)); const p = p0.clone().multiplyScalar((1 - u) * (1 - u)).add(mid.clone().multiplyScalar(2 * u * (1 - u))).add(tg.clone().multiplyScalar(u * u)); const prev = d.trail[0] || p0;
      serpentStep(d, p, p.clone().sub(prev).normalize(), t, q => { for (let i = 0; i < 3; i++) P(q.clone().add(V3(R(-4, 4), R(-4, 4), R(-4, 4))), V3(R(-20, 20), R(-30, 10), R(-20, 20)), pick(['#ffffff', '#bfe6ff', '#3a90e0']), .6, 200, 2); });
      if (o.t < .3) for (let i = 0; i < 6; i++) P(p0.clone().add(V3(R(-8, 8), 0, R(-8, 8))), V3(R(-40, 40), R(80, 160), R(-40, 40)), pick(['#ffffff', '#bfe6ff']), .8, 300, 2);
      if (!hit && u >= 1) { hit = true; for (let i = 0; i < 70; i++) P(tg.clone(), V3(R(-1, 1), R(0, 1), R(-1, 1)).normalize().multiplyScalar(R(80, 220)), pick(['#ffffff', '#bfe6ff', '#3a90e0']), 1, 260, 2); ring(ground(tg), 8, '#bfe6ff', true, 1.2, 3); dome(tg, 22 * sz, '#3a90e0'); shake = 12; resolve(a, b, 'water', 'hit', nm + '!', 1.8 * sz); }
      if (hit) fade(o, 1 - (o.t - 1.3) / 1.1); return true; } });
  }
  reg('kakashi', '수룡탄의 술', (a, b) => [...seals(a, b, 6, .07),
    S(.2, a, { pose: 'seal', aura: 1, elem: 'water', face: b }, b, def(b, a), () => callout(a, '수둔 · 수룡탄의 술', true)),
    S(1.4, a, { pose: 'skyRaise', aura: 1, elem: 'water', face: b, k: 50 }, b, { pose: 'block', face: a }, () => waterDragon(a, b, '수룡탄', 1)),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '수둔 · 수룡탄의 술', '수룡탄!');
  reg('kakashi', '천년살', (a, b) => [
    S(.25, a, { pose: 'crouchRun', ghost: 1, face: b, to: () => b.pos.clone().addScaledVector(dirTo(a, b), 7) }, b, { pose: 'stance', face: a }, () => { callout(a, '나뭇잎 비전 체술 오의 · 천년살'); smoke(a.pos.clone().add(V3(0, 6, 0)), 10, 4); }),
    S(.35, a, { pose: 'seal', k: 80, face: b, lean: 8 }, b, { pose: 'stance', face: a }, () => label(headP(a).add(V3(0, 6, 0)), '...!', '#ffffff')),
    S(.2, a, { pose: 'uppercut', k: 95, face: b }, b, { pose: 'air', vy: 320, face: a }, () => { const p = b.pos.clone().add(V3(0, 10, 0)); impact(p, 4); smoke(p, 12, 4); for (let i = 0; i < 10; i++) P(p.clone(), V3(R(-30, 30), R(80, 160), R(-30, 30)), pick(['#ffffff', '#ffe070']), .7, 100, 1); resolve(a, b, 'power', 'hit', '천년살!', .9); }),
    S(.6, a, { pose: 'taunt', face: b }, b, { pose: 'air', face: a })], '나뭇잎 비전 체술 오의 · 천년살', '천년살!');
  reg('kakashi', '토둔 토류벽', (a, b) => [
    S(.15, a, { pose: 'seal', face: b, k: 95 }, b, def(b, a), () => callout(a, '토둔 · 토류벽')),
    S(.3, a, { pose: 'hammerDown', aura: 1, elem: 'earth', face: b, lean: 8 }, b, { pose: 'crouchRun', face: a, to: near(b, a, 20) }, () => { // 흙벽이 솟아 앞을 막음
      const g = new THREE.Group(), d = dirTo(a, b); g.position.copy(a.pos).addScaledVector(d, 14); g.rotation.y = -Math.atan2(d.z, d.x) + PI / 2; mk(g, G.box, '#6a5438', 1, [34, 26, 6], [0, 13, 0], [0, 0, 0], 't'); for (let i = 0; i < 5; i++) mk(g, G.box, '#5a4630', 1, [R(4, 8), R(4, 7), 7], [-14 + i * 7, R(8, 22), 0], [0, 0, R(-.3, .3)], 't'); [-1, 1].forEach(s => mk(g, G.sph, '#4a3a28', 1, [3.5, 3, 3], [s * 8, 22, 3.2], [0, 0, 0], 't'));
      spawn({ g, max: 2.4, up(o) { a.wallT = 2.1 - o.t; const k = Math.min(1, o.t * 5); g.scale.set(1, k, 1); if (o.t < .25) dust(g.position, 6, 16); if (o.t > 2) { g.position.y -= 40 * (1 / 60); } return true; }, onEnd() { a.wallT = 0; rocks(g.position, 16, .7); dust(g.position, 20, 16); } });
      a.wallT = 2.1; rocks(g.position, 14, .8); shake = 8; }),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'punch', k: 90, face: a }, () => resolve(b, a, 'earth', 'hit', '', 1)),
    S(.6, a, { pose: 'guard', face: b }, b, { pose: 'guard', face: a })], '토둔 · 토류벽');
  reg('kakashi', '뇌둔 자전', (a, b) => [
    S(.3, a, { pose: 'eyeHand', aura: 1, elem: 'bolt', face: b }, b, def(b, a), () => { callout(a, '뇌둔 · 자전'); spawn({ max: .4, up() { const hp = handP(a); bolt(hp, hp.clone().add(V3(R(-6, 6), R(-6, 6), R(-6, 6))), '#c080ff', .2, .8); return true; } }); }),
    S(.45, a, { pose: 'fingerPoint', k: 95, face: b, elem: 'bolt' }, b, { pose: 'block', face: a }, () => { for (let k = 0; k < 4; k++) pending.push({ t: k * .05, fn: () => { const hp = handP(a), tg = chest(b); let prev = hp; for (let i = 1; i <= 6; i++) { const q = hp.clone().lerp(tg, i / 6).add(i < 6 ? V3(R(-6, 6), R(-6, 6), R(-6, 6)) : V3()); bolt(prev, q, k % 2 ? '#c080ff' : '#ffffff', .4, 1.4); if (Math.random() < .4) bolt(q, q.clone().add(V3(R(-10, 10), R(-10, 10), R(-10, 10))), '#a060ff', .3, .8); prev = q; } light(tg, '#c080ff', 5); } }); pending.push({ t: .12, fn: () => resolve(a, b, 'bolt', 'hit', '자전!', 1.5) }); }),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '뇌둔 · 자전', '자전!');
  reg('kakashi', '닌견 추적', (a, b) => [
    S(.25, a, { pose: 'thumbBite', face: b }, b, def(b, a), () => { callout(a, '구치요세 · 닌견 추적'); P(handP(a), V3(0, -10, 0), '#c00010', .5, 60, 1); }),
    S(.3, a, { pose: 'hammerDown', aura: 1, elem: 'earth', face: b, lean: 9 }, b, { pose: 'stance', face: a }, () => { crack(a.pos, 14, 8, '#0a0a0a'); smoke(a.pos.clone().add(V3(0, 3, 0)), 10, 6); }),
    S(.7, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a }, () => { // 땅에서 개들이 튀어나와 물고 늘어짐
      const g = new THREE.Group(); g.position.copy(ground(b.pos)); for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2, dg = new THREE.Group(); dg.position.set(Math.cos(an) * 6, 0, Math.sin(an) * 6); dg.rotation.y = -an + PI; g.add(dg); const c = pick(['#4a4038', '#6a6054', '#2a2420']); mk(dg, G.box, c, 1, [5, 2.6, 2.4], [0, 2, 0], [0, 0, .4], 't'); mk(dg, G.box, c, 1, [2.6, 2.2, 2.2], [3, 3.6, 0], [0, 0, .2], 't'); [-1, 1].forEach(s => mk(dg, G.cone4, c, 1, [.6, 1.2, .4], [3, 5, s * .7], [0, 0, 0], 't')); dg.userData.d = R(0, .2); }
      smoke(g.position.clone().add(V3(0, 4, 0)), 24, 8, ['#d0d0d8', '#a0a0a8']); rocks(g.position, 14, .6);
      spawn({ g, max: 1.6, up(o, dt, t) { g.children.forEach((dg, i) => { const k = Math.min(1, Math.max(0, o.t - dg.userData.d) * 6); dg.scale.setScalar(k); dg.position.y = Math.sin(t * 20 + i) * .4; }); if (o.t > 1.2) fade(o, (1.6 - o.t) * 2.5); return true; } });
      b.stun = Math.max(b.stun || 0, 1.2); pending.push({ t: .2, fn: () => resolve(a, b, 'earth', 'hit', '닌견에게 물림!', 1) }); })], '구치요세 · 닌견 추적', '닌견에게 물림!');
  reg('kakashi', '카무이 수리검', (a, b) => [
    S(.2, a, { pose: 'throwPrep', face: b }, b, def(b, a), () => callout(a, '카무이 수리검')),
    S(.25, a, { pose: 'throw', k: 95, face: b }, b, def(b, a), () => { const mid = a.pos.clone().lerp(b.pos, .45).add(V3(0, 18, 0)); kamuiAt(mid, .9); for (let i = 0; i < 5; i++) { const g = shurikenMesh(); fly(a, b, { g, to: () => mid, v: 300, out: null, hitR: 4, look: false, tick(s, dt, t, gg) { gg.rotation.z = t * 30; }, onHit() { } }); } }),
    S(.4, a, { pose: 'eyeHand', face: b }, b, { pose: 'guard', face: a }, () => { const behind = chest(b).addScaledVector(dirTo(a, b), 14); kamuiAt(behind, .7); pending.push({ t: .2, fn: () => { for (let i = 0; i < 5; i++) { const g = shurikenMesh(); fly(a, b, { g, from: behind.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), v: 260, ek: 'metal', nm: i === 4 ? '카무이 수리검!' : '', pw: .5, out: i === 4 ? 'hit' : null, hitR: 4, look: false, tick(s, dt, t, gg) { gg.rotation.z = t * 30; } }); } } }); }),
    S(.4, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '카무이 수리검', '카무이 수리검!');
  function sharkBomb(a, b, nm, sz) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    mk(body, G.sph, '#3a90e0', .75, [4, 3.4, 10]); mk(body, G.sph, '#bfe6ff', .5, [2.6, 2.4, 8]); mk(body, G.cone4, '#3a90e0', .85, [2, 5, 4], [0, 3.8, -1], [-.4, 0, 0]); mk(body, G.cone4, '#3a90e0', .85, [1, 6, 5], [0, 0, -11], [PI / 2 + .3, 0, 0]); mk(body, G.cone, '#ffffff', .9, [2.4, 4, 1], [0, -1, 9], [PI / 2, 0, 0]);
    [-1, 1].forEach(s => spr(body, flareTex, '#ffffff', 1, 2, [s * 2.4, 1.2, 7])); spr(g, glowTex, '#3a90e0', .5, 30); g.scale.setScalar(sz);
    fly(a, b, { g, v: 210, ek: 'water', nm: nm + '!', pw: 1.6 * sz, hitR: 8 * sz, tick(s, dt, t, gg) { body.rotation.z = Math.sin(t * 14) * .3; for (let i = 0; i < 4; i++) P(gg.position.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3)).multiplyScalar(sz)), V3(R(-30, 30), R(-10, 30), R(-30, 30)), pick(['#ffffff', '#bfe6ff', '#3a90e0']), .5, 200, 2); },
      onHit(p) { for (let i = 0; i < 60; i++) P(p.clone(), V3(R(-1, 1), R(0, 1), R(-1, 1)).normalize().multiplyScalar(R(80, 220)), pick(['#ffffff', '#bfe6ff', '#3a90e0']), 1, 260, 2); dome(p, 18 * sz, '#3a90e0'); ring(ground(p), 6, '#bfe6ff', true, 1, 3); shake = 10; } });
  }
  reg('kakashi', '수둔 수교탄', (a, b) => [...seals(a, b, 3, .08),
    S(.3, a, { pose: 'twoHand', aura: 1, elem: 'water', face: b }, b, def(b, a), () => callout(a, '수둔 · 수교탄의 술')),
    S(.25, a, { pose: 'palm', k: 95, face: b }, b, { pose: 'block', face: a }, () => sharkBomb(a, b, '수교탄', 1)),
    S(.7, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '수둔 · 수교탄의 술', '수교탄!');

  // ═══════════ 사쿠라 ═══════════
  const fistGlow = (f, dur, c = '#ffb0d0') => { const g = new THREE.Group(); spr(g, glowTex, c, .9, 14); mk(g, G.sph, '#ffffff', .8, [1.4, 1.4, 1.4]); return spawn({ g, max: dur, up(o) { g.position.copy(handP(f)); P(handP(f), V3(R(-15, 15), R(10, 40), R(-15, 15)), pick([c, '#ffffff']), .3, 0, 1); return true; } }); };
  function crater(p, sz, pinkC) { // 괴력: 땅이 꺼지며 사방으로 갈라짐
    crack(p, 30 * sz, 12); scorch(p, 18 * sz); rocks(p, 40 * sz, 1.2 * sz); dust(p, 40 * sz, 18 * sz); for (let i = 0; i < 3; i++) ring(ground(p), 6 + i * 6, i ? '#c8a080' : (pinkC || '#ffffff'), true, 1.1, 3);
    const g = new THREE.Group(); g.position.copy(ground(p)); for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2, sl = mk(g, G.box, '#5a4630', 1, [R(6, 12), R(2, 4), R(5, 9)], [Math.cos(an) * 14 * sz, 1, Math.sin(an) * 14 * sz], [R(-.6, .6), an, R(-.6, .6)], 't'); sl.userData.v = R(.4, 1); }
    spawn({ g, max: 2.6, up(o) { const k = Math.min(1, o.t * 8); g.children.forEach(sl => { sl.rotation.x = sl.userData.v * k * .9; sl.position.y = k * 3 * sl.userData.v; }); if (o.t > 2) g.position.y -= .2; return true; } });
    shake = 18 * sz; flashScreen(.06, '255,220,200');
  }
  reg('sakura', '괴력 주먹', (a, b) => [
    S(.3, a, { pose: 'hammerUp', aura: 1, elem: 'earth', face: b }, b, def(b, a), () => { callout(a, '괴력 주먹'); fistGlow(a, .9); }),
    S('run', a, { pose: 'crouchRun', face: b, to: near(a, b, 8) }, b, { pose: 'guard', face: a }),
    S(.25, a, { pose: 'hammerDown', k: 95, face: b, lean: 10 }, b, { pose: 'air', vy: 200, face: a }, () => { crater(b.pos, 1, '#ffb0d0'); resolve(a, b, 'earth', 'hit', '괴력!', 1.8); }),
    S(.4, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '괴력!');
  reg('sakura', '앵화충', (a, b) => [
    S(.3, a, { pose: 'flipAir', aura: 1, elem: 'petal', vy: 260, to: near(a, b, 10), face: b }, b, def(b, a), () => { callout(a, '앵화충', true); fistGlow(a, 1.2, '#ff80b0'); }),
    S(.3, a, { pose: 'hammerUp', face: b, elem: 'petal' }, b, { pose: 'block', face: a }),
    S(.25, a, { pose: 'hammerDown', k: 95, face: b, lean: 10, vy: -300 }, b, { pose: 'air', vy: 220, face: a }, () => { crater(b.pos, 1.6, '#ff80b0'); dome(chest(b), 30, '#ff80b0'); for (let i = 0; i < 40; i++) P(chest(b), V3(R(-1, 1), R(0, 1), R(-1, 1)).normalize().multiplyScalar(R(100, 240)), pick(['#ff80b0', '#ffffff', '#ffd0e0']), .8, 0, 2); resolve(a, b, 'petal', 'hit', '앵화충!', 2.2); }),
    S(.5, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '앵화충', '앵화충!');
  reg('sakura', '연타', (a, b) => [
    S(.2, a, { pose: 'guard', face: b }, b, def(b, a), () => { callout(a, '연타'); fistGlow(a, 1.4); }),
    ...approach(a, b, 8, 'crouchRun'),
    ...Array.from({ length: 6 }, (_, i) => S(.09, a, { pose: i % 2 ? 'punchL' : 'punch', k: 95, fwd: 40, face: b }, b, { pose: i < 5 ? 'block' : 'hurt', face: a }, () => { const p = chest(b).add(V3(R(-3, 3), R(-3, 3), R(-3, 3))); impact(p, 3); ring(p, 2, '#ffb0d0', false, .4, 2.4); for (let k = 0; k < 6; k++) P(p.clone(), V3(R(-60, 60), R(-20, 60), R(-60, 60)), pick(['#ffffff', '#ffb0d0']), .35, 0, 1); b.kb.addScaledVector(dirTo(a, b), 40); if (i === 5) resolve(a, b, 'earth', 'hit', '연타!', 1.2); })),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '연타!');
  reg('sakura', '사쿠라 돌격', (a, b) => [
    S(.25, a, { pose: 'punchPrep', aura: 1, elem: 'earth', face: b }, b, def(b, a), () => { callout(a, '괴력 돌격'); fistGlow(a, 1.2); }),
    S('run', a, { pose: 'shoulder', face: b, to: near(a, b, 5), ghost: 1 }, b, { pose: 'block', face: a }, () => { spawn({ max: .6, up() { const gp = ground(a.pos); mark(gp, R(0, PI), 8, '#3a2a1a', .8, 1.2); dust(gp, 3, 3); return true; } }); }),
    S(.2, a, { pose: 'punch', k: 95, fwd: 80, face: b }, b, { pose: 'hurt', face: a }, () => { const p = chest(b); impact(p, 6); ring(p, 5, '#ffb0d0', false, .6, 3); rocks(b.pos, 12, .8); resolve(a, b, 'earth', 'hit', '괴력 돌격!', 1.6); }),
    S(.3, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '괴력 돌격', '괴력 돌격!');
  reg('sakura', '백호인 해방', (a, b) => [
    S(.4, a, { pose: 'seal', aura: 1, elem: 'petal', face: b, k: 60 }, b, def(b, a), () => { callout(a, '음봉인 해방 · 백호인', true); const g = new THREE.Group(); const dm = mk(g, G.cone4, '#c080ff', .95, [.8, 1.6, .2]); spr(g, glowTex, '#c080ff', .7, 6); spawn({ g, max: 5, up(o) { g.position.copy(headP(a).add(V3(0, 1.6, 0)).addScaledVector(fwdOf(a), 1.6)); g.rotation.y = -a.heading + PI / 2; return true; } }); }),
    S(.6, a, { pose: 'openArms', aura: 1, elem: 'petal', face: b, k: 60 }, b, def(b, a), () => { // 몸에 검은 문양이 퍼짐 + 기력 회복
      a.mode = 5; a.modeK = 'byakugo'; a.modeElem = 'petal'; a.gauge = 100; a.stun = 0; ring(ground(a.pos), 6, '#c080ff', true, 1.2, 2.6);
      spawn({ max: 1.2, up(o) { for (let i = 0; i < 3; i++) { const p = a.pos.clone().add(V3(R(-3, 3), R(4, 28), R(-3, 3))); mark(p, R(0, PI), R(2, 5), '#2a1030', .4, .6); } P(a.pos.clone().add(V3(R(-5, 5), R(2, 28), R(-5, 5))), V3(0, 30, 0), pick(['#c080ff', '#ffffff']), .6, -10, 2); return true; } }); auraFollow(a, 5, ['#c080ff', '#ffd0ff'], 2, '#c080ff'); }),
    S(.2, a, { pose: 'stance', face: b }, b, def(b, a))], '음봉인 해방 · 백호인');
  reg('sakura', '카츠유 소환', (a, b) => [
    S(.25, a, { pose: 'thumbBite', face: b }, b, def(b, a), () => { callout(a, '구치요세 · 카츠유', true); P(handP(a), V3(0, -10, 0), '#c00010', .5, 60, 1); }),
    S(.3, a, { pose: 'hammerDown', aura: 1, elem: 'water', face: b, lean: 9 }, b, def(b, a), () => crack(a.pos, 16, 8, '#0a0a0a')),
    S(1.2, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a }, () => { // 거대 민달팽이가 연기 속에서 나와 산을 뿜음
      const g = new THREE.Group(), d = dirTo(a, b); g.position.copy(a.pos).addScaledVector(d, -10).addScaledVector(right(a), 18); g.rotation.y = -Math.atan2(d.z, d.x);
      if (window.mkKatsuyu) g.add(window.mkKatsuyu()); else // 곡면 카츠유(mocap.js) — 없으면 기존 구 모형
      for (let i = 0; i < 5; i++) mk(g, G.sph, i % 2 ? '#f0f4ff' : '#dfe6f8', 1, [14 - i, 10 - i * .8, 12 - i * .5], [-i * 9, 8 - i * .5, 0], [0, 0, 0], 't'); if (!window.mkKatsuyu) { for (let i = 0; i < 4; i++) mk(g, G.box, '#4a70d0', 1, [3, 1, 13], [-i * 9, 15 - i * .6, 0], [0, 0, 0], 't'); [-1, 1].forEach(s => { mk(g, G.cylC, '#f0f4ff', 1, [1, 9, 1], [8, 18, s * 3], [0, 0, -.4], 't'); mk(g, G.sph, '#1a1a2a', 1, [1.5, 1.5, 1.5], [10, 22, s * 3], [0, 0, 0], 't'); }); }
      smoke(g.position.clone().add(V3(0, 10, 0)), 40, 18); shake = 10;
      spawn({ g, max: 2.2, up(o) { const k = Math.min(1, o.t * 4); g.scale.setScalar(k); if (o.t > .4 && o.t < 1.2) { const from = g.position.clone().add(V3(0, 14, 0)).addScaledVector(d, 14); for (let i = 0; i < 6; i++) P(from.clone(), chest(b).sub(from).normalize().multiplyScalar(R(180, 260)).add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), pick(['#c8e870', '#a0d040', '#e8ff90']), .7, 60, 2); }
        if (o.t > 1.7) { fade(o, (2.2 - o.t) * 2); if (Math.random() < .5) smoke(g.position.clone().add(V3(0, 10, 0)), 4, 14); } return true; } });
      pending.push({ t: .7, fn: () => { flames(ground(b.pos), .6, false); resolve(a, b, 'water', 'hit', '설화산!', 1.6); } }); })], '구치요세 · 카츠유', '설화산!');
  reg('sakura', '쿠나이 투척', (a, b) => [
    S(.2, a, { pose: 'throwPrep', face: b }, b, def(b, a), () => callout(a, '쿠나이 투척')),
    S(.25, a, { pose: 'throw', k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 5; i++) pending.push({ t: i * .04, fn: () => { const sp = right(a).multiplyScalar((i - 2) * 3); fly(a, b, { g: kunaiMesh(), to: () => chest(b).add(sp), v: 360, ek: 'metal', nm: i === 4 ? '쿠나이!' : '', pw: .5, out: i === 4 ? 'hit' : null, hitR: 4, onHit(p) { P(p, V3(R(-40, 40), R(0, 40), R(-40, 40)), '#ffffff', .3, 0, 1); } }); } }); }),
    S(.5, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '쿠나이!');
  reg('sakura', '의료 인술', (a, b) => [
    S(.9, a, { pose: 'openPalm', aura: 1, elem: 'psychic', face: b, k: 50 }, b, { pose: 'stance', face: a }, () => { callout(a, '의료 인술 · 장선술'); const g = new THREE.Group(); [0, 1].forEach(() => spr(g, glowTex, '#70ff9a', .9, 10)); spawn({ g, max: 1.2, up(o) { const hp = handP(a); g.children[0].position.copy(hp); g.children[1].position.copy(chest(a)); P(hp.clone(), V3(R(-10, 10), R(10, 40), R(-10, 10)), pick(['#70ff9a', '#ffffff']), .6, -10, 2); return true; } }); }),
    S(.3, a, { pose: 'stance', face: b }, b, def(b, a), () => { a.gauge = 100; a.stun = 0; label(headP(a).add(V3(0, 6, 0)), '회복!', '#70ff9a'); ring(ground(a.pos), 5, '#70ff9a', true, 1, 2.4); })], '의료 인술 · 장선술');
  reg('sakura', '괴력 발차기', (a, b) => [
    S(.25, a, { pose: 'kickPrep', aura: 1, elem: 'earth', face: b }, b, def(b, a), () => callout(a, '괴력 내려찍기 발차기')),
    S(.3, a, { pose: 'flipAir', vy: 200, to: near(a, b, 8), face: b }, b, { pose: 'block', face: a }),
    S(.22, a, { pose: 'axe', k: 95, face: b, vy: -260 }, b, { pose: 'hurt', face: a }, () => { crater(b.pos, 1.2); resolve(a, b, 'earth', 'hit', '내려찍기!', 1.8); }),
    S(.4, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '괴력 내려찍기 발차기', '내려찍기!');

  // ═══════════ 가아라 ═══════════
  function sandCoffin(a, b, dur, crush) { // 모래가 땅을 타고 흘러가 대상을 감싸 굳힘
    const g = new THREE.Group(); const coc = mk(g, G.sph, '#c8a060', .9, [1, 1, 1], [0, 0, 0], [0, 0, 0], 'n'); const coc2 = mk(g, G.sph, '#e0c080', .5, [1.1, 1.1, 1.1], [0, 0, 0], [0, 0, 0], 'n');
    b.stun = Math.max(b.stun || 0, dur);
    return spawn({ g, max: dur, up(o, dt, t) { const tg = chest(b); if (o.t < .35) { const p = a.pos.clone().lerp(b.pos, o.t / .35); for (let i = 0; i < 6; i++) sandP(ground(p).add(V3(R(-4, 4), 1, R(-4, 4))), V3(R(-20, 20), R(10, 40), R(-20, 20)), .5); coc.scale.setScalar(.01); coc2.scale.setScalar(.01); return true; }
      const k = Math.min(1, (o.t - .35) * 2.5); g.position.copy(tg).add(V3(0, -6, 0)); coc.scale.set(9 * k, 16 * k, 9 * k); coc2.scale.set(10 * k, 17 * k, 10 * k); b.kb.multiplyScalar(.5);
      for (let i = 0; i < 4; i++) { const an = t * 6 + i * PI / 2, rr = 10 * (1 - k * .3); sandP(tg.clone().add(V3(Math.cos(an) * rr, R(-14, 10), Math.sin(an) * rr)), V3(-Math.sin(an) * 40, R(10, 30), Math.cos(an) * 40), .5); }
      if (crush && o.t > dur - .3 && !o.cr) { o.cr = true; for (let i = 0; i < 80; i++) sandP(tg.clone(), V3(R(-1, 1), R(-.3, 1), R(-1, 1)).normalize().multiplyScalar(R(100, 240)), 1); dome(tg, 20, '#c8a060'); shake = 14; crush(); }
      if (o.t > dur - .25) fade(o, (dur - o.t) * 4); return true; } });
  }
  reg('gaara', '사박궤', (a, b) => [
    S(.3, a, { pose: 'openPalm', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => callout(a, '사박궤')),
    S(1.2, a, { pose: 'openPalm', face: b, elem: 'sand', k: 50 }, b, { pose: 'hurt', face: a }, () => { sandCoffin(a, b, 1.4); pending.push({ t: 1, fn: () => resolve(a, b, 'sand', 'hit', '사박궤!', 1) }); }),
    S(.3, a, { pose: 'stance', face: b }, b, { pose: 'hurt', face: a })], '사박궤', '사박궤!');
  reg('gaara', '사막 장송', (a, b) => [
    S(.3, a, { pose: 'openPalm', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => callout(a, '사박궤 · 사막 장송', true)),
    S(1, a, { pose: 'openPalm', face: b, elem: 'sand', k: 50 }, b, { pose: 'hurt', face: a }, () => sandCoffin(a, b, 1.5, () => resolve(a, b, 'sand', 'hit', '사막 장송!', 2.2))),
    S(.5, a, { pose: 'hammerDown', k: 95, face: b }, b, { pose: 'hurt', face: a }, () => label(headP(a).add(V3(0, 6, 0)), '...장송.', '#e0c080')),
    S(.3, a, { pose: 'stance', face: b }, b, { pose: 'hurt', face: a })], '사박궤 · 사막 장송', '사막 장송!');
  reg('gaara', '모래 수리검', (a, b) => [
    S(.3, a, { pose: 'crossArms', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => { callout(a, '모래 수리검'); for (let i = 0; i < 30; i++) sandP(a.pos.clone().add(V3(R(-10, 10), R(4, 28), R(-10, 10))), V3(R(-20, 20), R(10, 30), R(-20, 20)), .6); }),
    S(.3, a, { pose: 'skySweep', k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 8; i++) pending.push({ t: i * .03, fn: () => { const sp = V3(R(-12, 12), R(-6, 8), R(-12, 12)); fly(a, b, { g: shurikenMesh('#c8a060', 1.8), from: chest(a).add(sp), to: () => chest(b).add(sp.clone().multiplyScalar(.2)), v: 300, ek: 'sand', nm: i === 7 ? '모래 수리검!' : '', pw: .5, out: i === 7 ? 'hit' : null, hitR: 4, look: false, tick(s, dt, t, gg) { gg.rotation.z = t * 28; gg.rotation.x = .6; sandP(gg.position.clone(), V3(R(-10, 10), R(-10, 10), R(-10, 10)), .3, 1); }, onHit(p) { for (let k = 0; k < 6; k++) sandP(p.clone(), V3(R(-40, 40), R(0, 40), R(-40, 40)), .5); } }); } }); }),
    S(.5, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '모래 수리검', '모래 수리검!');
  reg('gaara', '사박 대장', (a, b) => [
    S(.4, a, { pose: 'skyRaise', aura: 1, elem: 'sand', face: b, k: 50 }, b, def(b, a), () => { callout(a, '유사 폭류 · 사박 대장', true); shake = 8; }),
    S(1.3, a, { pose: 'hammerDown', k: 60, face: b, elem: 'sand' }, b, { pose: 'block', face: a }, () => { // 거대한 모래 해일이 솟았다가 덮쳐 누름
      const g = new THREE.Group(), d = dirTo(a, b); g.position.copy(ground(b.pos)).addScaledVector(d, -6); g.rotation.y = -Math.atan2(d.z, d.x) + PI / 2; const wv = mk(g, G.cyl, '#c8a060', .9, [40, 70, 22], [0, 0, 0], [0, 0, PI / 2], 'n'); const wv2 = mk(g, G.cyl, '#e0c080', .45, [42, 72, 24], [0, 0, 0], [0, 0, PI / 2], 'n');
      spawn({ g, max: 1.8, up(o) { const u = Math.min(1, o.t / .9); g.children.forEach((m, i) => { m.position.set(0, 50 * Math.sin(u * PI) * (1 - u * .6), -30 + 30 * u); m.scale.set(40 + i * 2, (70 + i * 2) * Math.min(1, o.t * 3), 22 + i * 2); });
        for (let i = 0; i < 8; i++) sandP(g.position.clone().add(V3(R(-30, 30), R(0, 50) * (1 - u), R(-30, 30))), V3(R(-30, 30), R(-20, 60), R(-30, 30)), .9, 3);
        if (u >= 1 && !o.hit) { o.hit = true; ultBlast(chest(b), 'sand', 75, a, '사박 대장!'); crack(b.pos, 50, 12, '#3a2a14'); dust(b.pos, 60, 40); shake = 22; } if (o.t > 1.1) fade(o, (1.8 - o.t) * 1.5); return true; } }); }),
    S(.5, a, { pose: 'stance', face: b }, b, { pose: 'hurt', face: a })], '유사 폭류 · 사박 대장', '사박 대장!');
  reg('gaara', '모래 방패', (a, b) => [
    S(.3, a, { pose: 'crossArms', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => { callout(a, '절대 방어 · 모래 방패'); a.sandT = 4.5; const g = new THREE.Group(); mk(g, G.sph, '#c8a060', .55, [1, 1, 1], [0, 0, 0], [0, 0, 0], 'n'); mk(g, G.sph, '#e0c080', .3, [1.08, 1.08, 1.08], [0, 0, 0], [0, 0, 0], 'n');
      spawn({ g, max: 4.5, up(o, dt) { a.sandT = 4.5 - o.t; g.position.copy(a.pos).add(V3(0, 10, 0)); const k = Math.min(1, o.t * 3) * 18; g.scale.set(k, k * .8, k); for (let i = 0; i < 3; i++) { const d = V3(R(-1, 1), R(0, 1), R(-1, 1)).normalize(); sandP(g.position.clone().addScaledVector(d, k * .95), V3(-d.z * 40, R(-10, 10), d.x * 40), .5, 1); } fade(o, Math.min(1, (4.5 - o.t) * 2) * (o.t < 1 ? 1 : .55)); return true; }, onEnd() { a.sandT = 0; } }); }),
    S(.6, a, { pose: 'crossArms', face: b }, b, { pose: 'punch', k: 90, face: a, to: near(b, a, 10) }, () => resolve(b, a, 'metal', 'hit', '', .8)),
    S(.3, a, { pose: 'stance', face: b }, b, def(b, a))], '절대 방어 · 모래 방패');
  reg('gaara', '모래 쓰나미', (a, b) => [
    S(.35, a, { pose: 'armsWide', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => callout(a, '사둔 · 모래 쓰나미', true)),
    S(1, a, { pose: 'skySweep', k: 70, face: b, elem: 'sand' }, b, { pose: 'block', face: a }, () => { // 땅을 휩쓰는 모래 파도
      const g = new THREE.Group(), d = dirTo(a, b); g.rotation.y = -Math.atan2(d.z, d.x) + PI / 2; const wv = mk(g, G.cyl, '#c8a060', .9, [1, 1, 1], [0, 0, 0], [0, 0, PI / 2], 'n'); const p0 = a.pos.clone(), L = a.pos.distanceTo(b.pos) + 20;
      spawn({ g, max: 1.4, up(o) { const u = Math.min(1, o.t / .8); g.position.copy(p0).addScaledVector(d, L * u); wv.scale.set(30, 50, 12 + 10 * u); wv.position.y = 4 + 6 * Math.sin(u * PI); for (let i = 0; i < 10; i++) sandP(g.position.clone().add(V3(R(-25, 25), R(0, 18), R(-25, 25))), d.clone().multiplyScalar(R(60, 140)).add(V3(R(-20, 20), R(20, 60), R(-20, 20))), .8, 2);
        if (u >= 1 && !o.hit) { o.hit = true; resolve(a, b, 'sand', 'hit', '모래 쓰나미!', 1.8); dust(b.pos, 40, 26); } if (o.t > .9) fade(o, (1.4 - o.t) * 2); return true; } }); }),
    S(.4, a, { pose: 'stance', face: b }, b, { pose: 'hurt', face: a })], '사둔 · 모래 쓰나미', '모래 쓰나미!');
  reg('gaara', '모래 창', (a, b) => [
    S(.25, a, { pose: 'fingerPoint', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => callout(a, '모래 창')),
    S(.3, a, { pose: 'point', k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 3; i++) pending.push({ t: i * .07, fn: () => { const g = new THREE.Group(), k = new THREE.Group(); g.add(k); k.rotation.x = PI / 2; mk(k, G.cone, '#c8a060', .95, [1.6, 20, 1.6], [0, 4, 0], [0, 0, 0], 'n'); mk(k, G.cone, '#f0d8a0', .6, [2, 21, 2], [0, 4, 0], [0, 0, 0], 'n'); const sp = right(a).multiplyScalar((i - 1) * 5);
      fly(a, b, { g, from: chest(a).add(sp).add(V3(0, 4, 0)), to: () => chest(b).add(sp.clone().multiplyScalar(.3)), v: 380, ek: 'sand', nm: i === 2 ? '모래 창!' : '', pw: .9, out: i === 2 ? 'hit' : null, hitR: 5, tick(s, dt, t, gg) { sandP(gg.position.clone(), V3(R(-10, 10), R(-10, 10), R(-10, 10)), .4, 1); }, onHit(p) { for (let n = 0; n < 14; n++) sandP(p.clone(), V3(R(-60, 60), R(0, 60), R(-60, 60)), .7); } }); } }); }),
    S(.5, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '모래 창', '모래 창!');
  reg('gaara', '사막 층대', (a, b) => [
    S(.5, a, { pose: 'crossArms', aura: 1, elem: 'sand', face: b, vy: 160 }, b, def(b, a), () => { callout(a, '사둔 · 사막 층대'); const g = new THREE.Group(); mk(g, G.sph, '#c8a060', .85, [12, 2.5, 12], [0, 0, 0], [0, 0, 0], 'n'); spawn({ g, max: 2.2, up(o) { g.position.copy(a.pos).add(V3(0, -1, 0)); a.vel.y = Math.max(a.vel.y, a.pos.y < 40 ? 60 : 0); for (let i = 0; i < 3; i++) sandP(g.position.clone().add(V3(R(-10, 10), 0, R(-10, 10))), V3(R(-10, 10), R(-40, -10), R(-10, 10)), .7, 1); fade(o, Math.min(1, (2.2 - o.t) * 2)); return true; } }); }),
    S(1.1, a, { pose: 'openPalm', face: b, elem: 'sand', k: 50 }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 7; i++) pending.push({ t: i * .12, fn: () => { const g = new THREE.Group(); mk(g, G.sph, '#c8a060', .9, [4, 4, 4], [0, 0, 0], [0, 0, 0], 'n'); const tp = ground(b.pos).add(V3(R(-14, 14), 0, R(-14, 14)));
      fly(a, b, { g, from: tp.clone().add(V3(R(-10, 10), 120, R(-10, 10))), to: () => tp, v: 260, out: i === 6 ? 'hit' : null, ek: 'sand', nm: '사막 층대!', pw: 1.2, hitR: 4, tick(s, dt, t, gg) { sandP(gg.position.clone(), V3(R(-10, 10), 20, R(-10, 10)), .4, 1); }, onHit(p) { dust(p, 12, 6); for (let n = 0; n < 16; n++) sandP(p.clone(), V3(R(-60, 60), R(20, 90), R(-60, 60)), .8); ring(ground(p), 3, '#e0c080', true, .6, 2.4); } }); } }); }),
    S(.4, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '사둔 · 사막 층대', '사막 층대!');
  reg('gaara', '모래 손', (a, b) => [
    S(.3, a, { pose: 'openPalm', aura: 1, elem: 'sand', face: b }, b, def(b, a), () => callout(a, '모래 손 · 사박')),
    S(.9, a, { pose: 'hammerDown', k: 70, face: b, elem: 'sand' }, b, { pose: 'block', face: a }, () => { // 거대한 모래 손이 솟아 움켜쥐고 내리침
      const g = new THREE.Group(), hand = new THREE.Group(); g.add(hand); const d = dirTo(a, b); g.rotation.y = -Math.atan2(d.z, d.x);
      mk(hand, G.box, '#c8a060', .95, [10, 12, 4], [0, 0, 0], [0, 0, 0], 'n'); for (let i = 0; i < 4; i++) mk(hand, G.cylC, '#c8a060', .95, [1.4, 9, 1.4], [-3.6 + i * 2.4, 10, 0], [0, 0, 0], 'n'); mk(hand, G.cylC, '#c8a060', .95, [1.6, 7, 1.6], [6, 3, 0], [0, 0, -.8], 'n'); mk(hand, G.cylC, '#b08850', .95, [5, 30, 4], [0, -20, 0], [0, 0, 0], 'n');
      spawn({ g, max: 1.6, up(o) { const tg = b.pos; g.position.copy(tg).addScaledVector(d, -6); const u = Math.min(1, o.t / .5); hand.position.y = 10 + 30 * u - (o.t > .55 ? Math.min(1, (o.t - .55) * 6) * 38 : 0); hand.rotation.z = o.t > .55 ? -Math.min(1, (o.t - .55) * 6) * 1.2 : 0; for (let i = 0; i < 5; i++) sandP(g.position.clone().add(V3(R(-6, 6), hand.position.y + R(-10, 10), R(-6, 6))), V3(R(-20, 20), R(-30, 10), R(-20, 20)), .5);
        if (o.t > .75 && !o.hit) { o.hit = true; resolve(a, b, 'sand', 'hit', '모래 손!', 1.7); dust(tg, 30, 14); crack(tg, 20, 7); shake = 12; } if (o.t > 1.1) fade(o, (1.6 - o.t) * 2); return true; } }); }),
    S(.4, a, { pose: 'stance', face: b }, b, { pose: 'hurt', face: a })], '모래 손 · 사박', '모래 손!');

  // ═══════════ 이타치 ═══════════
  reg('itachi', '아마테라스', (a, b) => amaterasu(a, b, '아마테라스', true), '아마테라스', '아마테라스!');
  reg('itachi', '호화구', (a, b) => bigFireball(a, b, '화둔 · 호화구의 술', 3, ['#ff4a10', '#ff8a20']), '화둔 · 호화구의 술', '화둔 · 호화구의 술!');
  reg('itachi', '츠쿠요미', (a, b) => [
    S(.35, a, { pose: 'eyeHand', aura: 1, elem: 'hollow', face: b, k: 60 }, b, { pose: 'stance', face: a }, () => { callout(a, '월독 · 츠쿠요미', true); P(headP(a).addScaledVector(fwdOf(a), 1.5), V3(0, -20, 0), '#c00010', 1, 60, 1); }),
    S(1.6, a, { pose: 'stare', face: b }, b, { pose: 'openArms', face: a, k: 30 }, () => { // 붉은 하늘·검은 세상·붉은 달, 대상은 꼼짝 못 함
      const g = new THREE.Group(), ctr = a.pos.clone().lerp(b.pos, .5); g.position.copy(ctr); const w = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: '#2a0006', transparent: true, opacity: .75, side: THREE.BackSide, depthWrite: false })); w.scale.setScalar(70); g.add(w);
      const moon = new THREE.Group(); moon.position.set(-30, 60, -30); g.add(moon); mk(moon, G.sph, '#d01020', .95, [10, 10, 10]); spr(moon, glowTex, '#ff2030', .8, 60);
      b.stun = Math.max(b.stun || 0, 1.6); flashScreen(.2, '200,0,20');
      spawn({ g, max: 1.8, up(o) { fade(o, Math.min(1, o.t * 4, (1.8 - o.t) * 3)); if (Math.random() < .3) ghosts.push({ ch: a.ch, pos: b.pos.clone().add(V3(R(-12, 12), 0, R(-12, 12))), heading: R(0, 6), c: { ...POSE.punch }, life: .5, color: '#ff2030', dec: .4 }); if (Math.random() < .4) { impact(chest(b).add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), 2); } return true; } });
      pending.push({ t: 1.4, fn: () => resolve(a, b, 'hollow', 'hit', '츠쿠요미!', 1.8) }); }),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '월독 · 츠쿠요미', '츠쿠요미!');
  reg('itachi', '토츠카의 검', (a, b) => { let su = null; return [
    S(.4, a, { pose: 'crossArms', aura: 1, elem: 'hollow', face: b }, b, def(b, a), () => { callout(a, '수사노오 · 토츠카의 검', true); su = susanoo(a, { c: '#ff5a2a', c2: '#ffd0a0', gourd: true, dur: 2.4 }); }),
    S(.7, a, { pose: 'openArms', face: b, elem: 'hollow', k: 50 }, b, { pose: 'guard', face: a }),
    S(.5, a, { pose: 'palm', k: 90, face: b }, b, { pose: 'hurt', face: a }, () => { // 술병에서 흐르는 술 같은 검이 찔러 봉인
      const g = new THREE.Group(), bl = mk(g, G.cylC, '#ff8a4a', .7, [1, 1, 1]), bl2 = mk(g, G.cylC, '#ffe0c0', .8, [1, 1, 1]); spr(g, glowTex, '#ff8a4a', .6, 20);
      spawn({ g, max: 1.1, up(o, dt, t) { const st = a.pos.clone().add(V3(0, 30, 0)).addScaledVector(right(a), 16), tg = chest(b), d = tg.clone().sub(st), L = d.length() * Math.min(1, o.t * 4); d.normalize(); [bl, bl2].forEach((m, i) => { m.scale.set(i ? .8 : 2 + Math.sin(t * 20) * .3, L, i ? .8 : 2); m.position.copy(st).addScaledVector(d, L / 2); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d); }); g.children[2].position.copy(st).addScaledVector(d, L);
        if (o.t > .3 && !o.hit) { o.hit = true; b.stun = Math.max(b.stun || 0, .9); for (let i = 0; i < 30; i++) P(tg.clone(), st.clone().sub(tg).normalize().multiplyScalar(R(80, 160)).add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), pick(['#ff8a4a', '#ffe0c0']), .6, 0, 2); dome(tg, 18, '#ff5a2a'); resolve(a, b, 'hollow', 'hit', '봉인!', 2.2); } fade(o, Math.min(1, (1.1 - o.t) * 4)); return true; } }); }),
    S(.5, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })]; }, '수사노오 · 토츠카의 검', '봉인!');
  reg('itachi', '수리검 술', (a, b) => [
    S(.2, a, { pose: 'throwPrep', face: b, vy: 140 }, b, def(b, a), () => callout(a, '수리검 술')),
    S(.3, a, { pose: 'throw', k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 8; i++) { const off = V3(R(-1, 1), R(0, 1), R(-1, 1)).normalize().multiplyScalar(30); fly(a, b, { g: shurikenMesh(), to: () => chest(b), v: 280, ek: 'metal', nm: i === 7 ? '수리검 술!' : '', pw: .4, out: i === 7 ? 'hit' : (i % 3 ? null : 'block'), hitR: 4, look: false, tick(s, dt, t, gg) { gg.rotation.z = t * 30; if (s.t < .2) gg.position.addScaledVector(off, dt * 4); if (Math.random() < .03 && s.t > .2) { P(gg.position.clone(), V3(R(-40, 40), R(0, 40), R(-40, 40)), '#ffd060', .3, 0, 1); } } }); } }),
    S(.6, a, { pose: 'land', face: b }, b, { pose: 'block', face: a })], '수리검 술', '수리검 술!');
  reg('itachi', '까마귀 분신', (a, b) => [
    S(.25, a, { pose: 'crossArms', aura: 1, elem: 'dark', face: b }, b, def(b, a), () => { callout(a, '까마귀 분신술'); // 몸이 까마귀 떼로 흩어짐
      const g = new THREE.Group(); for (let i = 0; i < 26; i++) { const cr = new THREE.Group(); cr.position.copy(a.pos).add(V3(R(-4, 4), R(6, 26), R(-4, 4))); cr.userData.v = V3(R(-1, 1), R(.2, 1), R(-1, 1)).normalize().multiplyScalar(R(40, 90)); g.add(cr); mk(cr, G.sph, '#0a0a0e', 1, [1.2, 1, 2], [0, 0, 0], [0, 0, 0], 'n'); [-1, 1].forEach(s => mk(cr, G.cone4, '#14141a', 1, [2.5, .2, 1.5], [0, 0, s * 1.6], [0, 0, 0], 'n')); }
      spawn({ g, max: 1.5, up(o, dt, t) { g.children.forEach((cr, i) => { cr.position.addScaledVector(cr.userData.v, dt); cr.userData.v.lerp(chest(b).sub(cr.position).normalize().multiplyScalar(80), dt * 1.5); cr.lookAt(cr.position.clone().add(cr.userData.v)); cr.children[1].rotation.x = Math.sin(t * 30 + i) * .8; cr.children[2].rotation.x = -Math.sin(t * 30 + i) * .8; }); if (Math.random() < .5) P(g.children[0].position.clone(), V3(R(-10, 10), -10, R(-10, 10)), '#0a0a0e', 1, 40, 1, true); fade(o, Math.min(1, (1.5 - o.t) * 2)); return true; } }); }),
    S(.6, a, { pose: 'stance', ghost: 1, face: b, to: () => b.pos.clone().addScaledVector(dirTo(a, b), 8) }, b, { pose: 'block', face: a }),
    S(.15, a, { pose: 'slash', k: 95, face: b }, b, { pose: 'hurt', face: a }, () => { mark(chest(b), R(0, PI), 14, '#ffffff', 1, .8); resolve(a, b, 'dark', 'hit', '뒤에서!', 1.3); }),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a })], '까마귀 분신술', '뒤에서!');
  reg('itachi', '수둔 수교탄', (a, b) => [...seals(a, b, 3, .07),
    S(.3, a, { pose: 'twoHand', aura: 1, elem: 'water', face: b }, b, def(b, a), () => callout(a, '수둔 · 수교탄의 술')),
    S(.25, a, { pose: 'palm', k: 95, face: b }, b, { pose: 'block', face: a }, () => sharkBomb(a, b, '대수교탄', 1.5)),
    S(.7, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '수둔 · 수교탄의 술', '대수교탄!');
  reg('itachi', '야타의 거울', (a, b) => [
    S(.35, a, { pose: 'crossArms', aura: 1, elem: 'hollow', face: b }, b, def(b, a), () => { callout(a, '야타의 거울', true); susanoo(a, { c: '#ff5a2a', c2: '#ffd0a0', shield: true, dur: 4 }); a.yataT = 4; spawn({ max: 4, up(o) { a.yataT = 4 - o.t; return true; }, onEnd() { a.yataT = 0; } }); }),
    S(.7, a, { pose: 'guard', face: b }, b, { pose: 'punch', k: 90, face: a, to: near(b, a, 14) }, () => resolve(b, a, 'metal', 'hit', '', 1)),
    S(.3, a, { pose: 'stance', face: b }, b, def(b, a))], '야타의 거울');
  reg('itachi', '봉선화 손톱 홍', (a, b) => [
    S(.15, a, { pose: 'seal', face: b, k: 95 }, b, def(b, a), () => callout(a, '화둔 · 봉선화 손톱 홍')),
    S(.25, a, { pose: 'mouthSeal', aura: 1, elem: 'fire', face: b }, b, def(b, a)),
    S(.3, a, { pose: 'blow', k: 90, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 6; i++) pending.push({ t: i * .05, fn: () => { const g = new THREE.Group(); mk(g, G.sph, '#ff6a10', .6, [3, 3, 3]); mk(g, G.sph, '#ffd060', .8, [1.8, 1.8, 1.8]); const sh = shurikenMesh('#2a2a30', .9); g.add(sh); spr(g, glowTex, '#ff6a10', .6, 12); const sp = V3(R(-14, 14), R(-6, 10), R(-14, 14));
      fly(a, b, { g, from: fromHead(a), to: () => chest(b).add(sp.clone().multiplyScalar(.2)), v: 230, ek: 'fire', nm: i === 5 ? '봉선화 손톱 홍!' : '', pw: .6, out: i === 5 ? 'hit' : (i % 2 ? null : 'block'), hitR: 5, look: false, tick(s, dt, t, gg) { sh.rotation.z = t * 30; if (s.t < .25) gg.position.addScaledVector(sp, dt * 3); for (let k = 0; k < 2; k++) P(gg.position.clone(), V3(R(-15, 15), R(10, 40), R(-15, 15)), pick(ELEM.fire.parts), .4, -20, 2); }, onHit(p) { flames(ground(p), .4, true); for (let k = 0; k < 10; k++) P(p.clone(), V3(R(-50, 50), R(10, 70), R(-50, 50)), pick(ELEM.fire.parts), .5, -10, 2); } }); } }); }),
    S(.6, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '화둔 · 봉선화 손톱 홍', '봉선화 손톱 홍!');

  // ═══════════ 가이 ═══════════
  reg('gai', '나뭇잎 선풍', (a, b) => [
    S(.15, a, { pose: 'kickPrep', face: b }, b, def(b, a), () => callout(a, '나뭇잎 선풍')),
    ...approach(a, b, 9, 'crouchRun'),
    S(.3, a, { pose: 'spinKick', spin: 24, k: 95, face: b }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 3; i++) pending.push({ t: i * .06, fn: () => { ring(a.pos.clone().add(V3(0, 8 + i * 3, 0)), 7 + i * 2, i % 2 ? '#ffffff' : '#a0f0b0', true, .6, 2.6); dust(a.pos, 4, 8); } }); pending.push({ t: .15, fn: () => resolve(a, b, 'wind', 'hit', '나뭇잎 선풍!', 1.3) }); }),
    S(.3, a, { pose: 'land', spin: 0, face: b }, b, { pose: 'hurt', face: a })], '나뭇잎 선풍!');
  reg('gai', '아침 공작', (a, b) => [
    S(.4, a, { pose: 'braced', aura: 1, elem: 'kurama', face: b }, b, def(b, a), () => { callout(a, '팔문둔갑 · 아침 공작', true); gateSteam(a, ['#7ae0ff', '#bfefff', '#ffffff'], 60); }),
    ...approach(a, b, 10, 'crouchRun'),
    S(.25, a, { pose: 'punchPrep', face: b, elem: 'fire' }, b, { pose: 'block', face: a }, () => peacock(a, 1.6)),
    ...Array.from({ length: 8 }, (_, i) => S(.06, a, { pose: i % 2 ? 'punchL' : 'punch', k: 98, face: b, elem: 'fire' }, b, { pose: 'hurt', face: a }, () => { const p = chest(b).add(V3(R(-5, 5), R(-5, 5), R(-5, 5))); impact(p, 3); for (let k = 0; k < 10; k++) P(p.clone(), V3(R(-40, 40), R(10, 80), R(-40, 40)), pick(ELEM.fire.parts), .5, -20, 2); streak(handP(a), dirTo(a, b), 18, '#ff8a20', 1.4); b.kb.addScaledVector(dirTo(a, b), 30); })),
    S(.25, a, { pose: 'punch', k: 98, fwd: 80, face: b }, b, { pose: 'air', vy: 240, face: a }, () => { const p = chest(b); dome(p, 26, '#ff7a1a'); flames(ground(p), 1, true); resolve(a, b, 'fire', 'hit', '아침 공작!', 2.4); shake = 18; }),
    S(.4, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '팔문둔갑 · 아침 공작', '아침 공작!');
  reg('gai', '나뭇잎 대선풍', (a, b) => [
    S(.15, a, { pose: 'kickPrep', face: b }, b, def(b, a), () => callout(a, '나뭇잎 대선풍')),
    ...approach(a, b, 10, 'crouchRun'),
    ...[0, 1, 2].map(i => S(.22, a, { pose: i === 1 ? 'sweep' : 'spinKick', spin: 26, k: 95, face: b, to: () => b.pos.clone().add(V3(Math.cos(i * 2.1) * 10, 0, Math.sin(i * 2.1) * 10)) }, b, { pose: i < 2 ? 'block' : 'air', vy: i === 2 ? 200 : 0, face: a }, () => { add({ k: 'spiral', p: chest(a), c: '#a0f0b0', life: .7 }); ring(a.pos.clone().add(V3(0, 6, 0)), 9, '#ffffff', true, .5, 2.6); dust(a.pos, 8, 10); if (i === 2) resolve(a, b, 'wind', 'hit', '나뭇잎 대선풍!', 1.6); })),
    S(.3, a, { pose: 'land', spin: 0, face: b }, b, { pose: 'hurt', face: a })], '나뭇잎 대선풍!');
  reg('gai', '낮 호랑이', (a, b) => [
    S(.4, a, { pose: 'braced', aura: 1, elem: 'wind', face: b }, b, def(b, a), () => { callout(a, '팔문둔갑 · 낮 호랑이', true); gateSteam(a, ['#7ae0ff', '#bfefff', '#a0f0d0'], 80, 1.3); }),
    S(.4, a, { pose: 'crouchDodge', face: b, k: 70 }, b, def(b, a), () => { for (let i = 0; i < 30; i++) { const d = V3(R(-1, 1), R(-.2, 1), R(-1, 1)).normalize(); P(handP(a).addScaledVector(d, 30), d.multiplyScalar(-100), '#ffffff', .3, 0, 1); } }),
    S(.3, a, { pose: 'palm', k: 98, face: b, fwd: -40 }, b, { pose: 'block', face: a }, () => { // 호랑이 머리 모양의 공기 덩어리
      const g = new THREE.Group(), hd = new THREE.Group(); g.add(hd); mk(hd, G.sph, '#e8fff4', .5, [12, 10, 12]); mk(hd, G.sph, '#a0f0d0', .35, [14, 12, 14]); [-1, 1].forEach(s => { mk(hd, G.cone, '#e8fff4', .7, [3.5, 7, 2], [s * 7, 10, -2], [0, 0, s * -.3]); spr(hd, flareTex, '#ffffff', 1, 6, [s * 4, 3, 10]); }); mk(hd, G.cone, '#ffffff', .6, [5, 8, 3], [0, -5, 10], [PI / 2 + .3, 0, 0]); spr(g, glowTex, '#c0ffe8', .6, 50);
      fly(a, b, { g, from: chest(a).addScaledVector(fwdOf(a), 10), v: 240, ek: 'wind', nm: '낮 호랑이!', pw: 2.6, hitR: 14, tick(s, dt, t, gg) { gg.scale.setScalar(Math.min(1.4, .4 + s.t * 3)); for (let i = 0; i < 4; i++) P(gg.position.clone().add(V3(R(-12, 12), R(-12, 12), R(-12, 12))), V3(R(-60, 60), R(-60, 60), R(-60, 60)), pick(['#ffffff', '#c0ffe8']), .3, 0, 1); },
        onHit(p) { ultBlast(p, 'wind', 80, a, '낮 호랑이!'); dome(p, 50, '#c0ffe8'); for (let i = 0; i < 5; i++) ring(p, 6 + i * 6, '#ffffff', false, 1.2, 3); crack(p, 40, 10); shake = 22; } }); }),
    S(.8, a, { pose: 'guard', face: b }, b, { pose: 'block', face: a })], '팔문둔갑 · 낮 호랑이', '낮 호랑이!');
  reg('gai', '팔문둔갑 경문', (a, b) => [
    S(.4, a, { pose: 'kneel', aura: 1, elem: 'kurama', face: b }, b, def(b, a), () => { callout(a, '팔문둔갑 · 경문 개방', true); flashScreen(.08, '120,220,255'); }),
    S(.6, a, { pose: 'braced', aura: 1, elem: 'kurama', face: b, k: 60 }, b, def(b, a), () => { a.mode = 5; a.modeK = 'gate'; a.modeElem = 'wind'; gateSteam(a, ['#7ae0ff', '#bfefff', '#ffffff'], 100, 1.5); pillar(ground(a.pos), 14, '#7ae0ff', 1.4); ring(ground(a.pos), 6, '#bfefff', true, 1.2, 3); dust(a.pos, 30, 14); crack(a.pos, 18, 8); auraFollow(a, 5, ['#7ae0ff', '#bfefff', '#ffffff'], 3, '#7ae0ff'); shake = 10; }),
    S(.2, a, { pose: 'stance', face: b }, b, def(b, a))], '팔문둔갑 · 경문 개방');
  reg('gai', '나뭇잎 강력선풍', (a, b) => [
    S(.2, a, { pose: 'kickPrep', aura: 1, elem: 'wind', face: b }, b, def(b, a), () => callout(a, '나뭇잎 강력선풍')),
    ...approach(a, b, 9, 'crouchRun'),
    S(.25, a, { pose: 'highKick', k: 98, face: b }, b, { pose: 'block', face: a }, () => { arc(a, 1.4, -1.8, 30, '#a0f0b0', 10, .9); arc(a, 1.4, -1.8, 26, '#ffffff', 5, .7); pending.push({ t: .08, fn: () => { const p = chest(b); for (let i = 0; i < 3; i++) ring(p, 4 + i * 4, '#ffffff', false, .6, 3); streak(p, dirTo(a, b), 40, '#a0f0b0', 2); resolve(a, b, 'wind', 'hit', '나뭇잎 강력선풍!', 1.8); } }); }),
    S(.3, a, { pose: 'land', face: b }, b, { pose: 'hurt', face: a })], '나뭇잎 강력선풍!');
  reg('gai', '다이나믹 엔트리', (a, b) => [
    S(.25, a, { pose: 'crouchRun', ghost: 1, face: b, to: () => b.pos.clone().addScaledVector(dirTo(b, a), 70).addScaledVector(right(b), 30) }, b, { pose: 'stance', face: a }, () => { smoke(a.pos.clone().add(V3(0, 6, 0)), 10, 5); }),
    S(.2, a, { pose: 'crouchRun', face: b }, b, { pose: 'stance', face: a }, () => { callout(a, '다이나믹 엔트리!'); }),
    S(.4, a, { pose: 'highKick', tilt: 1.15, vy: 80, ghost: 1, k: 95, face: b, to: () => b.pos.clone().addScaledVector(dirTo(a, b), 4) }, b, { pose: 'block', face: a }, () => { for (let i = 0; i < 6; i++) pending.push({ t: i * .05, fn: () => { ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .5, color: '#a0f0b0', dec: .3 }); streak(chest(a), fwdOf(a).multiplyScalar(-1), 20, '#ffffff', 1.2); } }); }),
    S(.2, a, { pose: 'highKick', tilt: .4, face: b }, b, { pose: 'air', vy: 160, face: a }, () => { const p = chest(b); impact(p, 7); ring(p, 6, '#a0f0b0', false, .7, 3); dust(b.pos, 16, 10); resolve(a, b, 'power', 'hit', '다이나믹 엔트리!', 1.7); shake = 12; }),
    S(.4, a, { pose: 'taunt', tilt: 0, face: b }, b, { pose: 'hurt', face: a }, () => label(headP(a).add(V3(0, 6, 0)), '청춘이다!', '#a0f0b0'))], '다이나믹 엔트리!');
  reg('gai', '쌍절곤 연타', (a, b) => { let w = null; return [
    S(.25, a, { pose: 'guard', face: b }, b, def(b, a), () => { callout(a, '쌍절곤 연타'); // 손에 쌍절곤
      const g = new THREE.Group(), s1 = mk(g, G.cylC, '#c03020', 1, [.5, 5, .5], [0, 0, 0], [0, 0, 0], 't'), s2 = mk(g, G.cylC, '#c03020', 1, [.5, 5, .5], [0, 0, 0], [0, 0, 0], 't'), ch = mk(g, G.box, '#a0a0a8', 1, [.2, 2, .2], [0, 0, 0], [0, 0, 0], 't');
      w = spawn({ g, max: 2.4, up(o, dt, t) { const hp = handP(a), sw = t * 22, d = V3(Math.cos(sw), Math.sin(sw) * .6, Math.sin(sw)); s1.position.copy(hp); s1.lookAt(hp.clone().add(fwdOf(a))); s1.rotateX(PI / 2); const e = hp.clone().addScaledVector(d, 6); s2.position.copy(e); s2.lookAt(e.clone().add(d)); s2.rotateX(PI / 2); ch.position.copy(hp.clone().lerp(e, .5)); if (Math.random() < .5) P(e.clone(), V3(0, 0, 0), '#ffffff', .2, 0, 1); return true; } }); }),
    ...approach(a, b, 9, 'crouchRun'),
    ...Array.from({ length: 7 }, (_, i) => S(.08, a, { pose: i % 2 ? 'slash' : 'punch', k: 95, face: b }, b, { pose: i < 6 ? 'block' : 'hurt', face: a }, () => { arc(a, i % 2 ? -2 : 1.5, i % 2 ? 1 : -1.5, 14, '#c03020', 3, .4); const p = chest(b).add(V3(R(-3, 3), R(-3, 3), R(-3, 3))); impact(p, 2.5); b.kb.addScaledVector(dirTo(a, b), 30); if (i === 6) resolve(a, b, 'metal', 'hit', '쌍절곤!', 1.3); })),
    S(.3, a, { pose: 'guard', face: b }, b, { pose: 'hurt', face: a }, () => { if (w) w.t = 99; })]; }, '쌍절곤 연타', '쌍절곤!');

  window.__canonNaruto = { NAMES, live };
})();
