// 원작 재현 기술: 블리치 (이치고·뱌쿠야·루키아·히츠가야·켄파치·아이젠) — 동작·모양·색을 원작대로
(function () {
  if (typeof CH === 'undefined' || !CH.ichigo) return;
  window.CANON = window.CANON || new Set();
  // ── 공용 모양 (공유 도형은 kill 때 지우지 않음) ──
  const sh = g => { g.userData.shared = true; return g; };
  const G = {
    cres: sh(new THREE.RingGeometry(.7, 1, 40, 1, 0, PI)), rim: sh(new THREE.TorusGeometry(1, .07, 6, 40, PI)),
    box: sh(new THREE.BoxGeometry(1, 1, 1)), cone: sh(new THREE.ConeGeometry(1, 1, 6)), sph: sh(new THREE.SphereGeometry(1, 14, 10)),
    cyl: sh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true)), petal: sh(new THREE.PlaneGeometry(1.4, .5)), shard: sh(new THREE.OctahedronGeometry(1, 0)), disk: sh(new THREE.CircleGeometry(1, 40)),
  };
  const mk = (geo, c, op = .9) => new THREE.Mesh(geo, addMat(c, op));
  const LIVE = [];
  const live = (o) => { LIVE.push(o); o.t = 0; return o; };
  const _env = envUpdate;
  envUpdate = function (dt, t) {
    _env(dt, t);
    for (let i = LIVE.length - 1; i >= 0; i--) { const o = LIVE[i]; o.t += dt; let ok = false; try { ok = o.upd(dt, t, o); } catch (e) { console.error(e); } if (!ok || o.t > (o.max || 6)) { if (o.g) kill(o.g); if (o.end) try { o.end(); } catch (e) { } LIVE.splice(i, 1); } }
    bankaiSword(dt);
  };
  const fade = (g, a) => g.traverse(m => { if (m.material) { const md = m.material; if (md.userData.op0 === undefined) md.userData.op0 = md.opacity; md.opacity = md.userData.op0 * Math.max(0, a); } });
  const tipP = f => { const s = f.model && f.model.swd; if (s && s.grp.visible !== false) { f.model.root.updateMatrixWorld(true); return s.grp.localToWorld(V3(0, 1.3 + s.sp.L * (s.sp.L ? .85 : 1), 0)); } return handP(f); };
  // 맞았는지: wound 가 깜빡임(flash)을 켬 — 판단층(brain)이 결과를 바꿔도 실제 결과로 이펙트를 고름
  const hitCheck = (a, b, ek, nm, pw, o = 'hit') => { b.flash = 0; resolve(a, b, ek, o, nm, pw); return b.flash > 0; };
  const ghostTrail = (f, n, color, gap = .04) => { for (let i = 0; i < n; i++) pending.push({ t: i * gap, fn: () => ghosts.push({ ch: f.ch, pos: f.pos.clone(), heading: f.heading, c: { ...f.c }, life: .7, color, dec: .35 }) }); };
  const flashStep = (f, to, color = '#ffffff') => { ghosts.push({ ch: f.ch, pos: f.pos.clone(), heading: f.heading, c: { ...f.c }, life: .6, color, dec: .3 }); burst(chest(f), 8, ['#ffffff', color], .8, 0, 1); const p = clampArena(to()); f.pos.x = p.x; f.pos.z = p.z; ring(V3(p.x, .4, p.z), 3, color, true, .6, 2); };
  const aura = (f, cols, n = 60, h = 30) => { for (let i = 0; i < n; i++) parts.push({ p: f.pos.clone().add(V3(R(-7, 7), R(0, h * .4), R(-7, 7))), v: V3(R(-14, 14), R(60, 150), R(-14, 14)), life: R(.8, 1.5), c: pick(cols), g: -25, s: pick([2, 3]) }); };

  // ── 월아천충 계열: 내려베기에서 뻗어 나가는 초승달 참격 (겉 테 + 속 면 + 잔상 겹) ──
  function getsuga(a, b, o) {
    const g = new THREE.Group(), s = o.size || 1;
    for (let k = 0; k < 3; k++) { const face = mk(G.cres, k ? o.c : o.core, k ? .55 - k * .15 : .9); face.position.z = -k * 2.2; face.scale.setScalar(1 - k * .06); face.rotation.z = -PI / 2; g.add(face); }
    const rim = mk(G.rim, o.edge, 1); rim.rotation.z = -PI / 2; rim.scale.set(1.04, 1.04, 1); g.add(rim);
    const glow = new THREE.Sprite(spriteMat(glowTex, o.c, .55)); glow.scale.set(2.6, 2.6, 1); glow.position.x = .6; g.add(glow);
    const p0 = tipP(a), dir = chest(b).sub(p0).normalize(); dir.y *= .2; dir.normalize();
    g.position.copy(p0); g.scale.setScalar(14 * s); g.lookAt(p0.clone().add(dir)); scene3.add(g);
    let done = false;
    moses(V3(p0.x, 0, p0.z), V3(p0.x, 0, p0.z).addScaledVector(dir, 140), 6 + 4 * s, 2);
    return live({ g, max: 2, upd(dt, t, me) {
      g.position.addScaledVector(dir, (o.v || 230) * dt); g.scale.setScalar(14 * s * (1 + me.t * .5)); g.rotation.z += Math.sin(t * 30) * .01;
      for (let i = 0; i < 6; i++) parts.push({ p: g.position.clone().add(V3(R(-1, 1), R(-1, 1), 0).multiplyScalar(12 * s)), v: dir.clone().multiplyScalar(-R(30, 90)).add(V3(R(-15, 15), R(-5, 20), R(-15, 15))), life: R(.4, .8), c: pick([o.c, o.edge, o.core]), g: 0, s: pick([1, 2]) });
      if (frame % 3 === 0) parts.push({ p: V3(g.position.x, .5, g.position.z), v: V3(R(-20, 20), R(30, 60), R(-20, 20)), life: .8, c: '#8a7258', g: 200, s: 2 });
      if (!done && g.position.distanceTo(chest(b)) < 14 * s) { done = true; const hit = hitCheck(a, b, o.ek, o.nm, o.pw || 1.6); explode(chest(b), o.ek, (o.pw || 1.6) * (hit ? 1 : .6)); for (let i = 0; i < 3; i++) mark(chest(b), R(-.3, .3) + PI / 2, 30 * s, i ? o.c : '#ffffff', 2, 1); if (o.onHit) o.onHit(hit); }
      fade(g, Math.min(1, (2 - me.t) / .5)); return me.t < 2;
    } });
  }
  // ── 얼음 용 (빙륜환): 칼끝에서 솟아 몸을 휘감고 상대를 물어 얼림 ──
  function iceDragon(a, b, o = {}) {
    const g = new THREE.Group(), head = new THREE.Group(); g.add(head); const s = o.size || 1;
    const hp = (geo, c, op, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = mk(geo, c, op); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); head.add(m); return m; };
    hp(G.cone, '#bfefff', .9, 5, 16, 4, 0, 1, 7, PI / 2); hp(G.cone, '#ffffff', .8, 2.4, 12, 2, 0, 1.2, 7, PI / 2); const jaw = hp(G.cone, '#9fd8ff', .85, 4, 13, 2.6, 0, -2, 6, PI / 2 + .35);
    hp(G.sph, '#d8f6ff', .75, 7, 6, 8, 0, 0, -3); [-1, 1].forEach(sd => { hp(G.cone, '#ffffff', .9, 1.2, 13, 1.2, sd * 3.5, 5, -8, -1.1, 0, sd * .3); const e = new THREE.Sprite(spriteMat(flareTex, '#e8faff', 1)); e.scale.set(4, 4, 1); e.position.set(sd * 3, 2.6, 2); head.add(e); });
    for (let i = 0; i < 6; i++) hp(G.shard, '#e8faff', .8, 1.5, 4 + i, 1.5, 0, 3 + i * .4, -9 - i * 2, -1.4, 0, 0);
    const segs = []; for (let i = 0; i < 24; i++) { const m = mk(G.shard, i % 2 ? '#bfefff' : '#ffffff', .8 - i * .02); m.scale.setScalar(6.5 - i * .22); g.add(m); segs.push(m); }
    head.scale.setScalar(s); scene3.add(g); const trail = [];
    const p0 = tipP(a); head.position.copy(p0); let bit = false;
    return live({ g, max: 2.6, upd(dt, t, me) {
      const u = Math.min(1, me.t / (o.dur || .9)), tg = chest(b), side = V3(-dirTo(a, b).z, 0, dirTo(a, b).x);
      // 시전자 주변을 한 바퀴 휘감고 올라갔다가 상대에게 내리꽂힘
      const loop = u < .45 ? u / .45 : 1, ang = loop * PI * 2;
      const want = u < .45 ? chest(a).add(V3(Math.cos(ang) * 22, 10 + loop * 40, Math.sin(ang) * 22)) : chest(a).add(V3(0, 50, 0)).lerp(tg, (u - .45) / .55);
      const prev = head.position.clone(); head.position.lerp(want, Math.min(1, dt * 14)); head.lookAt(head.position.clone().add(head.position.clone().sub(prev).add(V3(.001, 0, 0))));
      jaw.rotation.x = PI / 2 + .3 + Math.sin(t * 18) * .15;
      trail.unshift(head.position.clone()); if (trail.length > 80) trail.pop();
      segs.forEach((m, k) => { const q = trail[Math.min(trail.length - 1, 2 + k * 3)]; if (q) { m.position.copy(q); m.rotation.set(t * 2 + k, k, 0); } });
      parts.push({ p: head.position.clone(), v: V3(R(-20, 20), R(-20, 10), R(-20, 20)), life: .8, c: pick(['#ffffff', '#d8f6ff', '#9fd8ff']), g: 30, s: pick([2, 3]) });
      light(head.position, '#bfefff', 5);
      if (!bit && u >= 1) { bit = true; const hit = hitCheck(a, b, 'ice', o.nm || '빙륜환!', o.pw || 1.8); explode(tg, 'ice', 1.8); if (hit) freeze(b, o.freeze || 1.4); for (let i = 0; i < 8; i++) add({ k: 'spike', p: V3(b.pos.x + R(-12, 12), 1.4, b.pos.z + R(-12, 12)), h: R(10, 22), c: '#e8faff', life: 1.8 }); shake = Math.max(shake, 10); }
      if (bit) fade(g, 1 - (me.t - (o.dur || .9)) / .6);
      return !bit || me.t < (o.dur || .9) + .6;
    } });
  }
  // 얼음에 갇힘: 반투명 얼음덩이 + 가시, 잠깐 못 움직임, 끝나면 깨짐
  function freeze(b, dur = 1.3) {
    b.stun = Math.max(b.stun || 0, dur); const g = new THREE.Group();
    const blk = mk(G.shard, '#d8f6ff', .45); blk.scale.set(13, 22, 13); blk.position.y = 14; g.add(blk);
    for (let i = 0; i < 7; i++) { const s2 = mk(G.cone, '#ffffff', .8); const an = i / 7 * PI * 2; s2.position.set(Math.cos(an) * 9, 6 + R(0, 12), Math.sin(an) * 9); s2.scale.set(1.6, R(8, 14), 1.6); s2.rotation.set(Math.sin(an) * .6, 0, -Math.cos(an) * .6); g.add(s2); }
    g.position.copy(b.pos); scene3.add(g); label(headP(b).add(V3(0, 8, 0)), '빙결!', '#d8f6ff');
    return live({ g, max: dur + .5, upd(dt, t, me) { g.position.copy(b.pos); fade(g, me.t < dur ? 1 : 1 - (me.t - dur) / .4); if (me.t > dur && !me.br) { me.br = true; for (let i = 0; i < 30; i++) parts.push({ p: chest(b), v: V3(R(-90, 90), R(20, 140), R(-90, 90)), life: 1, c: pick(['#ffffff', '#d8f6ff', '#9fd8ff']), g: 240, s: 2 }); } return me.t < dur + .4; } });
  }
  // ── 꽃잎 칼날 무리 (센본자쿠라): 한 번 그리기로 수백 장 ──
  function petalSwarm(a, b, o = {}) {
    const N = o.n || 360, im = new THREE.InstancedMesh(G.petal, addMat(o.c || '#ffb0d0', .95), N); im.frustumCulled = false; scene3.add(im);
    const ph = Array.from({ length: N }, () => ({ r: R(4, 22), a: R(0, PI * 2), y: R(-6, 18), sp: R(2, 5), off: R(0, 1), tw: R(0, 6) }));
    const dm = new THREE.Object3D(), dur = o.dur || 2.2; let done = false;
    return live({ g: im, max: dur + .8, upd(dt, t, me) {
      const u = me.t / dur, src = o.from ? o.from() : tipP(a), tg = chest(b);
      for (let i = 0; i < N; i++) { const q = ph[i]; let p;
        if (u < .3) { const k = u / .3; p = src.clone().lerp(chest(a), k * .3).add(V3(Math.cos(q.a + t * q.sp) * q.r * k, q.y * k, Math.sin(q.a + t * q.sp) * q.r * k)); }          // 칼에서 흩어져 시전자를 감쌈
        else if (u < .55) { const k = Math.min(1, (u - .3) / .25 + q.off * .3); p = chest(a).lerp(tg, k).add(V3(Math.cos(q.a + t * 6) * q.r * (1 - k * .5), q.y * .5, Math.sin(q.a + t * 6) * q.r * (1 - k * .5))); } // 강물처럼 상대에게
        else { const rr = q.r * (o.wrap ? .6 : 1) * (1 + Math.sin(t * 3 + q.off * 6) * .15); p = tg.clone().add(V3(Math.cos(q.a + t * q.sp * 1.6) * rr, q.y * .8, Math.sin(q.a + t * q.sp * 1.6) * rr)); } // 상대를 감싸 베어냄
        dm.position.copy(p); dm.rotation.set(t * 4 + q.tw, t * 3 + q.a, q.tw); dm.scale.setScalar(o.big || 1.4); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }
      im.instanceMatrix.needsUpdate = true;
      if (u > .55 && frame % 4 === 0) { mark(tg.clone().add(V3(R(-6, 6), R(-6, 6), R(-6, 6))), R(0, PI), R(8, 16), '#ffd0e4', .8, .5); if (Math.random() < .5) burst(tg, 3, ['#ffffff', '#ffb0d0'], .8); }
      if (!done && u > .62) { done = true; const hit = hitCheck(a, b, 'petal', o.nm, o.pw || 1.6); if (o.onHit) o.onHit(hit); }
      fade(im, u < 1 ? 1 : 1 - (me.t - dur) / .7); return me.t < dur + .7;
    } });
  }
  // 줄지어 솟는 거대한 칼들 (천본앵경엄)
  function swordRows(a, n = 14) {
    const g = new THREE.Group(), fw = fwdOf(a), rt = V3(-fw.z, 0, fw.x);
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < n / 2; i++) { const sw = new THREE.Group(); const bl = mk(G.box, '#e8eef8', .85); bl.scale.set(2.2, 46, .5); bl.position.y = 23; sw.add(bl); const gd = mk(G.box, '#c8c8d0', .9); gd.scale.set(6, 1.2, 1.2); sw.add(gd);
      sw.position.copy(a.pos).addScaledVector(rt, s * (22 + i * 3)).addScaledVector(fw, -10 + i * 9); sw.userData.d = i * .06; g.add(sw); }
    scene3.add(g);
    return live({ g, max: 3, upd(dt, t, me) { g.children.forEach(sw => { const k = Math.min(1, Math.max(0, (me.t - sw.userData.d) / .3)); sw.position.y = -46 + 46 * k; }); if (me.t > 1.8) fade(g, 1 - (me.t - 1.8) / .8); return me.t < 2.6; } });
  }
  // 검은 관 (흑관): 다섯 면이 날아와 상대를 가두고, 안에서 검은 창이 꿰뚫고, 깨져 흩어짐
  function coffin(a, b, nm) {
    const g = new THREE.Group(), W = 16, H = 30, sides = [];
    [[0, 0, W / 2, 0], [0, 0, -W / 2, PI], [W / 2, 0, 0, PI / 2], [-W / 2, 0, 0, -PI / 2]].forEach(([x, y, z, ry]) => { const p = mk(G.box, '#120818', .92); p.scale.set(W, H, .8); p.userData.to = V3(x, H / 2, z); p.userData.from = V3(x * 6, H / 2 + 30, z * 6); p.rotation.y = ry; g.add(p); sides.push(p);
      const edge = mk(G.box, '#9a4aff', .9); edge.scale.set(W + .6, .7, 1); edge.position.y = H / 2 - .3; p.add(edge); edge.scale.set(1.04, .03, 1.3); });
    const top = mk(G.box, '#120818', .92); top.scale.set(W, .8, W); top.userData.to = V3(0, H, 0); top.userData.from = V3(0, H + 60, 0); g.add(top); sides.push(top);
    const spikes = []; for (let i = 0; i < 10; i++) { const s = mk(G.cone, i % 2 ? '#2a0a3a' : '#9a4aff', .9); s.visible = false; const an = R(0, PI * 2); s.position.set(Math.cos(an) * 7, R(4, 26), Math.sin(an) * 7); s.lookAt(0, s.position.y, 0); s.rotateX(PI / 2); s.scale.set(1.2, 14, 1.2); g.add(s); spikes.push(s); }
    g.position.copy(b.pos); scene3.add(g); let stab = false;
    return live({ g, max: 2.6, upd(dt, t, me) { g.position.copy(b.pos); const u = Math.min(1, me.t / .55); sides.forEach(p => p.position.copy(p.userData.from).lerp(p.userData.to, u * u));
      if (u >= 1 && !stab) { stab = true; spikes.forEach(s => s.visible = true); const hit = hitCheck(a, b, 'dark', nm, 2.2); if (hit) b.stun = Math.max(b.stun || 0, .9); shake = Math.max(shake, 12); light(chest(b), '#9a4aff', 8); }
      if (me.t > 1.3 && !me.br) { me.br = true; for (let i = 0; i < 40; i++) parts.push({ p: chest(b), v: V3(R(-120, 120), R(20, 160), R(-120, 120)), life: 1.2, c: pick(['#120818', '#2a0a3a', '#9a4aff']), g: 220, s: 2, n: Math.random() < .5 }); explode(chest(b), 'dark', 1.6); }
      if (me.t > 1.3) { sides.forEach((p, i) => p.position.addScaledVector(p.userData.to.clone().setY(0).normalize().add(V3(0, .3, 0)), 90 * dt)); fade(g, 1 - (me.t - 1.3) / .7); }
      return me.t < 2.1; } });
  }
  // 빛의 막대 여섯 개(육장광뢰): 허리를 꿰어 묶음
  function sixRods(a, b, nm) {
    const g = new THREE.Group(), rods = []; for (let i = 0; i < 6; i++) { const r = mk(G.box, i % 2 ? '#fff4b0' : '#ffffff', .95); r.scale.set(2.4, 1, 16); const an = i / 6 * PI * 2; r.userData.an = an; g.add(r); rods.push(r); }
    scene3.add(g); let hit = null;
    return live({ g, max: 2.4, upd(dt, t, me) { const c = chest(b); g.position.copy(c).add(V3(0, -3, 0)); const u = Math.min(1, me.t / .35);
      rods.forEach(r => { const d = 60 * (1 - u) + 7; r.position.set(Math.cos(r.userData.an) * d, 0, Math.sin(r.userData.an) * d); r.lookAt(g.position); });
      if (u >= 1 && hit === null) { hit = hitCheck(a, b, 'light', nm, 1.2); if (hit) b.stun = Math.max(b.stun || 0, 1.4); burst(c, 20, ['#ffffff', '#fff4b0'], 1.2); light(c, '#fff4b0', 7); }
      if (hit === false) fade(g, 1 - (me.t - .35) / .3); else if (me.t > 1.6) fade(g, 1 - (me.t - 1.6) / .5);
      return me.t < (hit === false ? .7 : 2.1); } });
  }
  // 얼음 날개·꼬리·꽃 (대홍련): 시전자 등에 붙어 따라다님
  function iceWings(f, dur = 6) {
    const g = new THREE.Group(), wings = [];
    [-1, 1].forEach(s => { const w = new THREE.Group(); for (let i = 0; i < 5; i++) { const fe = mk(G.shard, i % 2 ? '#bfefff' : '#ffffff', .8); fe.scale.set(2.2, 3 + i * 3.2, 1); fe.position.set(s * (4 + i * 3), 8 + i * 2.5, -3); fe.rotation.z = -s * (.5 + i * .18); w.add(fe); } g.add(w); wings.push(w); });
    const tail = new THREE.Group(); for (let i = 0; i < 9; i++) { const sg = mk(G.shard, '#d8f6ff', .8); sg.scale.setScalar(2.4 - i * .2); sg.position.set(0, 2 - i * .5, -4 - i * 3); tail.add(sg); } g.add(tail);
    const flowers = []; for (let i = 0; i < 3; i++) { const fl = new THREE.Group(); for (let k = 0; k < 6; k++) { const pe = mk(G.shard, '#e8faff', .85); pe.scale.set(.8, 2.2, .5); pe.position.set(Math.cos(k / 6 * PI * 2) * 1.8, Math.sin(k / 6 * PI * 2) * 1.8, 0); pe.rotation.z = k / 6 * PI * 2 - PI / 2; fl.add(pe); } fl.position.set((i - 1) * 7, 30, -10); g.add(fl); flowers.push(fl); }
    scene3.add(g);
    return live({ g, max: dur + .6, upd(dt, t, me) { g.position.copy(f.pos); g.rotation.y = -f.heading + PI / 2; wings.forEach((w, i) => w.rotation.y = Math.sin(t * 3 + i * PI) * .15); tail.rotation.y = Math.sin(t * 2) * .4;
      flowers.forEach((fl, i) => { fl.rotation.z = t * 1.5 + i; const left = 1 - Math.max(0, me.t - dur * (i + 1) / 3.2) * 4; fl.scale.setScalar(Math.max(0, left)); }); // 꽃잎 셋이 시간이 다 되면 차례로 짐
      if (frame % 5 === 0) parts.push({ p: f.pos.clone().add(V3(R(-14, 14), R(6, 26), R(-14, 14))), v: V3(0, -8, 0), life: 1, c: '#ffffff', g: 10, s: 1 });
      if (me.t > dur) fade(g, 1 - (me.t - dur) / .5); return me.t < dur + .5; } });
  }
  // 하늘에서 내리는 얼음 감옥 (천상옥좌): 기둥들이 둘러싸고 위에서 맞물림
  function skyPrison(a, b, nm) {
    const g = new THREE.Group(), cols = []; for (let i = 0; i < 10; i++) { const c = mk(G.shard, i % 2 ? '#d8f6ff' : '#ffffff', .75); c.scale.set(3, 30, 3); const an = i / 10 * PI * 2; c.userData.an = an; g.add(c); cols.push(c); }
    const cloud = mk(G.sph, '#9fb8d8', .25); cloud.scale.set(40, 6, 40); g.add(cloud); g.position.copy(b.pos); scene3.add(g); let shut = false;
    return live({ g, max: 2.8, upd(dt, t, me) { const u = Math.min(1, me.t / .8); cloud.position.y = 120; cols.forEach(c => { const r = 26 - 14 * Math.max(0, (me.t - .8) / .3); c.position.set(Math.cos(c.userData.an) * Math.max(10, r), 180 - 160 * u, Math.sin(c.userData.an) * Math.max(10, r)); c.lookAt(0, 60, 0); c.rotateX(PI / 2); });
      if (frame % 2 === 0) parts.push({ p: g.position.clone().add(V3(R(-40, 40), 110, R(-40, 40))), v: V3(R(-5, 5), -R(40, 80), R(-5, 5)), life: 1.4, c: '#ffffff', g: 0, s: 1 });
      if (me.t > 1.1 && !shut) { shut = true; const hit = hitCheck(a, b, 'ice', nm, 2.2); if (hit) freeze(b, 1.5); ultBlast(chest(b), 'ice', 50, a, nm); }
      if (me.t > 2) fade(g, 1 - (me.t - 2) / .6); return me.t < 2.6; } });
  }
  // 얼음 기둥 원(월백): 상대 발밑에 하얀 원 → 하늘까지 얼음 기둥 → 산산조각
  function iceCircle(a, b, nm, pw = 1.6) {
    const g = new THREE.Group(), circ = new THREE.Mesh(G.cres, new THREE.MeshBasicMaterial({ map: ringTex, color: '#ffffff', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const disk = new THREE.Mesh(G.disk, new THREE.MeshBasicMaterial({ map: ringTex, color: '#e8faff', transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })); disk.rotation.x = -PI / 2; disk.scale.setScalar(18); g.add(disk); circ.visible = false; g.add(circ);
    const col = mk(G.cyl, '#e8faff', .7); col.scale.set(14, 1, 14); g.add(col); const core = mk(G.cyl, '#ffffff', .9); core.scale.set(7, 1, 7); g.add(core);
    g.position.set(b.pos.x, .3, b.pos.z); scene3.add(g); let hitD = false;
    return live({ g, max: 2.4, upd(dt, t, me) { disk.rotation.z += dt * 2; const u = Math.max(0, (me.t - .35) / .25), h = 260 * Math.min(1, u);
      [col, core].forEach(c => { c.scale.y = Math.max(.01, h); c.position.y = h / 2; }); if (u > 0 && !hitD) { hitD = true; const hit = hitCheck(a, b, 'ice', nm, pw); if (hit) freeze(b, 1.2); shake = Math.max(shake, 8); light(chest(b), '#e8faff', 8); }
      if (me.t > 1.2 && !me.br) { me.br = true; for (let i = 0; i < 50; i++) parts.push({ p: V3(g.position.x + R(-8, 8), R(4, 120), g.position.z + R(-8, 8)), v: V3(R(-80, 80), R(-20, 80), R(-80, 80)), life: 1.2, c: pick(['#ffffff', '#d8f6ff']), g: 220, s: 2 }); }
      if (me.t > 1.2) fade(g, 1 - (me.t - 1.2) / .5); return me.t < 1.8; } });
  }
  // 흰 눈사태 파도(백련): 칼끝에서 앞으로 퍼지는 거대한 냉기 + 지나간 자리 얼음
  function iceWave(a, b, nm, pw = 1.8) {
    const p0 = tipP(a), dir = dirTo(a, b); let hitD = false;
    return live({ max: 1.6, upd(dt, t, me) { const reach = Math.min(1, me.t / .6) * (a.pos.distanceTo(b.pos) + 30);
      for (let i = 0; i < 26; i++) { const d = R(0, reach), spread = d * .35; parts.push({ p: p0.clone().addScaledVector(dir, d).add(V3(R(-spread, spread), R(-spread * .4, spread * .6), R(-spread, spread))), v: dir.clone().multiplyScalar(R(60, 160)), life: R(.4, .9), c: pick(['#ffffff', '#e8faff', '#bfefff']), g: 0, s: pick([2, 3]) }); }
      if (frame % 3 === 0 && me.t < .7) add({ k: 'spike', p: V3(a.pos.x, 1.4, a.pos.z).addScaledVector(dir, reach * R(.3, 1)).add(V3(R(-8, 8), 0, R(-8, 8))), h: R(6, 14), c: '#e8faff', life: 1.4 });
      if (!hitD && reach > a.pos.distanceTo(b.pos)) { hitD = true; const hit = hitCheck(a, b, 'ice', nm, pw); if (hit) freeze(b, 1.3); explode(chest(b), 'ice', 1.4); }
      return me.t < 1; } });
  }
  // 얼음 칼날 연장(백도): 칼끝에서 얼음 칼날이 길게 자라 찌름
  function iceBlade(a, b, nm) {
    const g = new THREE.Group(), bl = mk(G.cone, '#e8faff', .85); bl.rotation.x = PI / 2; g.add(bl); const core = mk(G.cone, '#ffffff', .95); core.rotation.x = PI / 2; g.add(core); scene3.add(g); let hitD = false;
    return live({ g, max: 1.4, upd(dt, t, me) { const p0 = tipP(a), tg = chest(b), L = p0.distanceTo(tg) * Math.min(1, me.t / .2); g.position.copy(p0); g.lookAt(tg); bl.scale.set(2.2, L, 2.2); bl.position.z = L / 2; core.scale.set(.8, L, .8); core.position.z = L / 2;
      if (!hitD && me.t > .2) { hitD = true; const hit = hitCheck(a, b, 'ice', nm, 1.5); for (let i = 0; i < 3; i++) add({ k: 'spike', p: V3(b.pos.x + R(-6, 6), 1.4, b.pos.z + R(-6, 6)), h: R(8, 14), c: '#ffffff', life: 1.2 }); if (hit) freeze(b, .9); }
      if (me.t > .7) fade(g, 1 - (me.t - .7) / .4); return me.t < 1.1; } });
  }
  // 이치고 반카이: 검은 가는 칼(천쇄참월)로 바뀜
  const bkMat = new THREE.MeshBasicMaterial({ color: '#08080c' }), bkEdge = new THREE.MeshBasicMaterial({ color: '#c81e2a' });
  function bankaiSword() {
    const c = CH.ichigo; if (!c || !c.model || !c.model.swd) return; const m = c.model;
    if (!m.bk) { const g = new THREE.Group(); g.position.copy(m.swd.grp.position); const bl = new THREE.Mesh(G.box, bkMat); bl.scale.set(.55, 15, .16); bl.position.y = 9; g.add(bl); const gd = new THREE.Mesh(G.box, bkMat); gd.scale.set(2.2, .3, 2.2); gd.position.y = 1.3; g.add(gd); const ch = new THREE.Mesh(G.box, bkEdge); ch.scale.set(.2, 4, .2); ch.position.set(0, -2.5, 0); g.add(ch); m.swd.grp.parent.add(g); m.bk = g; }
    const f = F.find(x => x.ch === c), on = !!(f && f.mode > 0 && (f.modeK === 'bankai' || f.modeK === 'hollow')); m.bk.visible = on; m.swd.grp.visible = !on;
  }
  const B = (f, s) => [f, s];
  const reg = (key, name, fn) => { if (CH[key]) { CH[key].skills[name] = fn; window.CANON.add(name); } };
  const NM = (s) => window.CANON.add(s);

  // ════════ 이치고 ════════
  const GS = { c: '#7ac8ff', edge: '#ffffff', core: '#e8f6ff', ek: 'getsuga' }, GSB = { c: '#14060a', edge: '#ff1a2a', core: '#3a0010', ek: 'hollow' };
  reg('ichigo', '월아천충', (a, b) => [
    step(.35, [B(a, { pose: 'k_jodan', aura: 1, elem: 'getsuga', face: b }), B(b, { pose: 'guard', face: a })], () => { callout(a, '월아천충'); aura(a, ['#ffffff', '#9fd8ff', '#5ab8ff'], 40); }),
    step(.22, [B(a, { pose: 'k_kesa', k: 95, fwd: 40, face: b, elem: 'getsuga' }), B(b, { pose: 'guard', face: a })], () => getsuga(a, b, { ...GS, size: 1.3, nm: '월아천충!', pw: 1.6 })),
    step(.3, [B(a, { pose: 'k_chudan', face: b }), B(b, { pose: 'guard', face: a })])]);
  reg('ichigo', '월아천충 연사', (a, b) => [step(.25, [B(a, { pose: 'k_jodan', aura: 1, elem: 'getsuga', face: b })], () => callout(a, '월아천충 연사')),
    ...[0, 1, 2].map(i => step(.16, [B(a, { pose: i % 2 ? 'k_yoko' : 'k_kesa', k: 95, fwd: 20, face: b, elem: 'getsuga' })], () => getsuga(a, b, { ...GS, size: .9, v: 260, nm: '월아천충!', pw: 1 }))), step(.25, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('ichigo', '반카이', (a, b) => [
    step(.5, [B(a, { pose: 'k_chudan', aura: 1, elem: 'dark', face: b }), B(b, { pose: 'guard', face: a })], () => { callout(a, '반카이!', true); aura(a, ['#14060a', '#3a0a14', '#ff1a2a'], 120, 40); pillar(V3(a.pos.x, 0, a.pos.z), 22, '#1a0610', 1.6); pillar(V3(a.pos.x, 0, a.pos.z), 6, '#ff1a2a', 1.6); dome(chest(a), 26, '#14060a', '#ff1a2a'); }),
    step(.4, [B(a, { pose: 'k_chudan', face: b, elem: 'dark' })], () => { a.mode = 7; a.modeK = 'bankai'; a.modeElem = 'dark'; label(headP(a).add(V3(0, 10, 0)), '천쇄참월', '#ff3a4a', { big: true }); ghostTrail(a, 4, '#14060a'); })]);
  reg('ichigo', '천쇄참월 연격', (a, b) => [step(.2, [B(a, { pose: 'k_waki', aura: 1, elem: 'dark', face: b })], () => callout(a, '천쇄참월 고속 연격')),
    ...[0, 1, 2, 3, 4, 5].map(i => step(.1, [B(a, { pose: pick(['k_kesa', 'k_yoko', 'k_upCut', 'k_tsuki']), k: 98, face: b, elem: 'dark' }), B(b, { pose: 'guard', face: a })], () => { const ang = i * 1.1; flashStep(a, () => b.pos.clone().add(V3(Math.cos(ang) * 12, 0, Math.sin(ang) * 12)), '#3a0a14'); arc(a, -2.4, 1.2, 20, '#14060a', 5, .5); mark(chest(b), R(0, PI), 18, '#ff3a4a', 1, .6); if (i === 5) resolve(a, b, 'dark', 'hit', '천쇄참월!', 1.4); })),
    step(.25, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('ichigo', '흑 월아천충', (a, b) => [
    step(.45, [B(a, { pose: 'k_jodan', aura: 1, elem: 'hollow', face: b })], () => { callout(a, '흑 월아천충', true); aura(a, ['#14060a', '#ff1a2a', '#3a0010'], 90); }),
    step(.25, [B(a, { pose: 'k_kesa', k: 96, fwd: 40, face: b, elem: 'hollow' })], () => getsuga(a, b, { ...GSB, size: 2.1, v: 220, nm: '흑 월아천충!', pw: 2.2, onHit: () => ultBlast(chest(b), 'hollow', 55, a, '흑 월아천충!') })),
    step(.35, [B(a, { pose: 'k_chudan', face: b })])]);
  // 허화: 얼굴에 가면이 덮이고, 뿔 사이에 붉은 빛이 모여 세로(광선)
  const cero = (a, b, nm, r = 3, ult) => {
    const hp = () => headP(a).add(V3(0, 3, 0)).addScaledVector(fwdOf(a), 3);
    return [step(.45, [B(a, { pose: 'maskPull', aura: 1, elem: 'hollow', face: b })], () => { callout(a, nm, ult); for (let i = 0; i < 40; i++) pending.push({ t: i * .01, fn: () => parts.push({ p: hp().add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), v: V3(0, 0, 0), life: .45, c: pick(['#ff1a2a', '#ff6a6a', '#ffffff']), g: 0, s: 2, home: true }) }); light(hp(), '#ff1a2a', 8); }),
      step(.5, [B(a, { pose: 'openPalm', k: 90, face: b, fwd: -40, elem: 'hollow' }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r, c: '#ff1a2a', c2: '#14060a', ek: 'hollow', life: .7 }); add({ k: 'beam', f: a, t: b, r: r * .35, c: '#ffffff', c2: '#ff6a6a', ek: 'hollow', life: .6 }); pending.push({ t: .15, fn: () => { const hit = hitCheck(a, b, 'hollow', nm + '!', 1.9); explode(chest(b), 'hollow', hit ? 2 : 1); } }); }),
      step(.25, [B(a, { pose: 'k_chudan', face: b })])];
  };
  reg('ichigo', '허화', (a, b) => [step(.45, [B(a, { pose: 'maskPull', aura: 1, elem: 'hollow', face: b })], () => { callout(a, '허화', true); a.mode = 6; a.modeK = 'hollow'; a.modeElem = 'hollow'; aura(a, ['#14060a', '#ff1a2a', '#ffffff'], 90); dome(chest(a), 20, '#14060a', '#ff1a2a'); }), ...cero(a, b, '세로', 3.4)]);
  reg('ichigo', '허화 세로', (a, b) => cero(a, b, '세로', 4, true));
  reg('ichigo', '순보 베기', (a, b) => [step(.15, [B(a, { pose: 'k_iaiReady', aura: 1, face: b })], () => callout(a, '순보')),
    step(.12, [B(a, { pose: 'k_iaiCut', k: 98, face: b })], () => { flashStep(a, () => b.pos.clone().addScaledVector(dirTo(a, b), 14), '#9fd8ff'); arc(a, -2, .8, 22, '#ffffff', 4, .6); resolve(a, b, 'getsuga', 'hit', '순보 베기!', 1.2); }), step(.25, [B(a, { pose: 'k_chudan', face: b })])]);
  // 무월: 긴 검은 머리·검은 몸, 화면이 어두워지고 하늘까지 가르는 검은 세로 참격
  reg('ichigo', '무월', (a, b) => [
    step(.7, [B(a, { pose: 'skyRaise', aura: 1, elem: 'dark', face: b }), B(b, { pose: 'guard', face: a })], () => { callout(a, '최후의 월아천충 · 무월', true); aura(a, ['#000000', '#0a0408', '#14060a'], 160, 50); dome(chest(a), 60, '#000000', '#14060a'); flashScreen(.25, '0,0,0'); }),
    step(.4, [B(a, { pose: 'k_jodan', face: b, elem: 'dark' })], () => { const p = chest(a).add(V3(0, 10, 0)); for (let i = 0; i < 30; i++) parts.push({ p: p.clone().add(V3(R(-3, 3), R(0, 6), R(-3, 3))), v: V3(R(-10, 10), R(-30, 30), R(-10, 10)), life: 1, c: '#000000', g: 0, s: 3, n: true }); }),
    step(.4, [B(a, { pose: 'k_kesa', k: 98, face: b, fwd: 30 })], () => { const g = new THREE.Group(), sl = new THREE.Mesh(G.box, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .95, depthWrite: false })); sl.scale.set(10, 600, 4); g.add(sl); const ed = mk(G.box, '#3a0a14', .7); ed.scale.set(16, 600, 6); g.add(ed); g.position.copy(b.pos).add(V3(0, 250, 0)); g.rotation.y = -a.heading; scene3.add(g);
      live({ g, max: 1.4, upd(dt, t, me) { g.scale.x = Math.min(1, me.t * 6); fade(g, 1 - Math.max(0, me.t - .8) / .5); return me.t < 1.3; } });
      const hit = hitCheck(a, b, 'dark', '무월!', 3); moses(V3(b.pos.x, 0, b.pos.z).addScaledVector(dirTo(a, b), -60), V3(b.pos.x, 0, b.pos.z).addScaledVector(dirTo(a, b), 120), 18, 3); scorch(b.pos, 40); shake = 22; if (hit) b.stun = Math.max(b.stun || 0, 1.6); }),
    step(.45, [B(a, { pose: 'land', face: b })])]);

  // ════════ 뱌쿠야 ════════
  const PET = '#ff9ec4';
  reg('byakuya', '센본자쿠라 카게요시', (a, b) => [
    step(.5, [B(a, { pose: 'k_chudan', aura: 1, elem: 'petal', face: b }), B(b, { pose: 'guard', face: a })], () => { callout(a, '반카이 · 센본자쿠라 카게요시', true); }),
    step(.4, [B(a, { pose: 'swordDown', face: b })], () => { a.model.swd && (a.model.swd.grp.visible = false); const p = V3(a.pos.x, 0, a.pos.z); ring(p.clone().setY(.4), 4, PET, true, 1.2, 2.4); swordRows(a, 16); }), // 칼을 땅에 떨어뜨리면 수천 칼날이 솟음
    step(.8, [B(a, { pose: 'openPalm', face: b, elem: 'petal' })], () => petalSwarm(a, b, { n: 420, c: PET, dur: 2.4, nm: '카게요시!', pw: 2.2, from: () => V3(a.pos.x, 20, a.pos.z).addScaledVector(fwdOf(a), -10), onHit: h => { if (h) ultBlast(chest(b), 'petal', 50, a, '카게요시!'); } })),
    step(1.4, [B(a, { pose: 'openPalm', face: b })]), step(.1, [B(a, { pose: 'k_chudan', face: b })], () => { if (a.model.swd) a.model.swd.grp.visible = true; })]);
  reg('byakuya', '경엄', (a, b) => [step(.4, [B(a, { pose: 'openPalm', aura: 1, elem: 'petal', face: b })], () => callout(a, '센본자쿠라 · 경엄')),
    step(.3, [B(a, { pose: 'openPalm', face: b })], () => { if (a.model.swd) a.model.swd.grp.visible = false; petalSwarm(a, b, { n: 300, c: PET, dur: 1.8, wrap: true, nm: '경엄!', pw: 1.8, big: 1.2 }); }), // 꽃잎이 구처럼 감싸 조여 듦
    step(1.6, [B(a, { pose: 'openPalm', face: b })], () => pending.push({ t: 1.4, fn: () => { if (a.model.swd) a.model.swd.grp.visible = true; } }))]);
  reg('byakuya', '천본앵경엄', (a, b) => [step(.5, [B(a, { pose: 'swordDown', aura: 1, elem: 'petal', face: b })], () => { callout(a, '반카이 · 천본앵경엄', true); swordRows(a, 20); }),
    step(.6, [B(a, { pose: 'openArms', face: b })], () => { a.mode = 5; a.modeK = 'senbon'; a.modeElem = 'petal'; petalSwarm(a, a, { n: 260, c: PET, dur: 2.2, wrap: true, nm: '', pw: 0 }); })]);
  // 종경 · 백제검: 하얀 빛날개가 펼쳐졌다가 한 자루 빛의 칼로 모여 찌름
  reg('byakuya', '백제검', (a, b) => [
    step(.55, [B(a, { pose: 'k_jodan', aura: 1, elem: 'light', face: b })], () => { callout(a, '종경 · 백제검', true); a.model.swd && (a.model.swd.grp.visible = false); const g = new THREE.Group(); [-1, 1].forEach(s => { for (let i = 0; i < 6; i++) { const fe = mk(G.shard, '#ffffff', .85); fe.scale.set(1.6, 4 + i * 2.6, .6); fe.position.set(s * (3 + i * 2.6), 6 + i * 1.6, -2); fe.rotation.z = -s * (.4 + i * .2); g.add(fe); } }); const ring2 = mk(G.rim, '#ffffff', .9); ring2.scale.setScalar(6); ring2.position.y = 30; g.add(ring2); scene3.add(g);
      live({ g, max: 1.2, upd(dt, t, me) { g.position.copy(a.pos); g.rotation.y = -a.heading + PI / 2; const k = me.t < .5 ? 1 : Math.max(0, 1 - (me.t - .5) / .4); g.scale.set(k, 1, k); return me.t < 1; } }); }),
    step(.25, [B(a, { pose: 'k_tsuki', k: 98, fwd: 120, face: b, ghost: 1 }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r: 1.6, c: '#ffffff', c2: '#fff8e0', ek: 'light', life: .5 }); pending.push({ t: .1, fn: () => { const hit = hitCheck(a, b, 'light', '백제검!', 2.2); explode(chest(b), 'light', hit ? 2.2 : 1); } }); }),
    step(.35, [B(a, { pose: 'k_chudan', face: b })], () => { if (a.model.swd) a.model.swd.grp.visible = true; })]);
  const byakurai = (a, b, nm, c = '#cfe8ff') => [step(.25, [B(a, { pose: 'fingerPoint', aura: 1, elem: 'bolt', face: b })], () => callout(a, nm)),
    step(.3, [B(a, { pose: 'fingerPoint', k: 95, face: b, elem: 'bolt' }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r: .7, c, c2: '#ffffff', ek: 'bolt', life: .35 }); for (let i = 0; i < 3; i++) bolt(handP(a), chest(b).add(V3(R(-2, 2), R(-2, 2), R(-2, 2))), '#ffffff', .25, .6); pending.push({ t: .05, fn: () => { const hit = hitCheck(a, b, 'bolt', nm + '!', 1.2); impact(chest(b), hit ? 5 : 2); } }); }),
    step(.2, [B(a, { pose: 'guard', face: b })])];
  reg('byakuya', '백뢰', (a, b) => byakurai(a, b, '파도 4 · 백뢰'));
  reg('aizen', '백뢰', (a, b) => byakurai(a, b, '파도 4 · 백뢰', '#e0d0ff'));
  // 육장광뢰
  const rikujo = (a, b) => [step(.3, [B(a, { pose: 'fingerPoint', aura: 1, elem: 'light', face: b })], () => callout(a, '박도 61 · 육장광뢰')), step(.3, [B(a, { pose: 'fingerPoint', k: 90, face: b })], () => sixRods(a, b, '육장광뢰!')), step(.5, [B(a, { pose: 'guard', face: b })])];
  reg('byakuya', '육장광뢰', rikujo); reg('aizen', '육장광뢰', rikujo);
  // 창화추: 손바닥에서 푸른 불꽃 덩어리 폭발
  const sokatsui = (a, b, pw = 1.4) => [step(.3, [B(a, { pose: 'openPalm', aura: 1, elem: 'getsuga', face: b })], () => { callout(a, '파도 33 · 창화추'); light(handP(a), '#4a8aff', 6); }),
    step(.4, [B(a, { pose: 'openPalm', k: 92, face: b, fwd: -30 }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r: 4, c: '#2a6aff', c2: '#9fd8ff', ek: 'getsuga', life: .55 }); const h = handP(a), d = chest(b).sub(h).normalize();
      for (let i = 0; i < 60; i++) parts.push({ p: h.clone(), v: d.clone().multiplyScalar(R(120, 240)).add(V3(R(-40, 40), R(-30, 40), R(-40, 40))), life: R(.5, .8), c: pick(['#ffffff', '#9fd8ff', '#4a8aff', '#2a4ad0']), g: -40, s: pick([2, 3]) });
      pending.push({ t: .15, fn: () => { const hit = hitCheck(a, b, 'getsuga', '창화추!', pw); explode(chest(b), 'fire', hit ? 1.4 : .7); emitters.push({ k: 'flames', p: b.pos.clone(), life: .6, fire: true }); } }); }), step(.2, [B(a, { pose: 'guard', face: b })])];
  reg('byakuya', '창화추', (a, b) => sokatsui(a, b)); reg('rukia', '창화추', (a, b) => sokatsui(a, b, 1.3));
  // 적화포: 손바닥 앞 붉은 불덩이
  const shakkaho = (a, b) => [step(.25, [B(a, { pose: 'fingerPoint', aura: 1, elem: 'fire', face: b })], () => callout(a, '파도 31 · 적화포')), step(.12, [B(a, { pose: 'openPalm', k: 92, face: b })], () => proj(a, b, 'fireball', 'hit', { c: '#ff3a1a', ek: 'fire', size: 1.5, v: 270, nm: '적화포' })), step(.4, [B(a, { pose: 'guard', face: b })])];
  reg('rukia', '적화포', shakkaho); reg('aizen', '적화포', shakkaho);
  const shunpo = (nm, ek, c) => (a, b) => { const n = 3; return [step(.14, [B(a, { pose: 'k_iaiReady', aura: 1, elem: ek, face: b })], () => callout(a, nm)),
    ...Array.from({ length: n }, (_, i) => step(.13, [B(a, { pose: i % 2 ? 'k_yoko' : 'k_iaiCut', k: 98, face: b })], () => { const ang = R(0, PI * 2); flashStep(a, () => b.pos.clone().add(V3(Math.cos(ang) * 13, 0, Math.sin(ang) * 13)), c); arc(a, -2.2, 1, 20, c, 4, .5); if (i === n - 1) resolve(a, b, ek, 'hit', nm + '!', 1.3); else mark(chest(b), R(0, PI), 14, c, .8, .5); })),
    step(.25, [B(a, { pose: 'k_chudan', face: b })])]; };
  reg('byakuya', '순보', shunpo('순보', 'petal', '#ffffff')); reg('byakuya', '순보 연참', shunpo('순보 연참', 'petal', PET));

  // ════════ 루키아 ════════
  reg('rukia', '첫 번째 춤 · 월백', (a, b) => [step(.55, [B(a, { pose: 'k_chudan', spin: 12, aura: 1, elem: 'ice', face: b })], () => { callout(a, '소데노시라유키 · 첫 번째 춤 · 월백', true); arc(a, -3, 3, 16, '#ffffff', 3, .9); }), step(.3, [B(a, { pose: 'swordDown', face: b })], () => iceCircle(a, b, '월백!', 1.8)), step(.8, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '두 번째 춤 백련', (a, b) => [step(.4, [B(a, { pose: 'k_tsuki', aura: 1, elem: 'ice', face: b })], () => { callout(a, '두 번째 춤 · 백련', true); for (let i = 0; i < 4; i++) pending.push({ t: i * .08, fn: () => add({ k: 'spike', p: V3(a.pos.x, 1.4, a.pos.z).addScaledVector(fwdOf(a), 6).add(V3(R(-4, 4), 0, R(-4, 4))), h: R(5, 9), c: '#ffffff', life: 1 }) }); }), // 칼끝으로 땅을 네 번 찍음
    step(.6, [B(a, { pose: 'k_tsuki', k: 95, face: b, fwd: -20 })], () => iceWave(a, b, '백련!', 2)), step(.3, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '세 번째 춤 · 백도', (a, b) => [step(.35, [B(a, { pose: 'k_jodan', aura: 1, elem: 'ice', face: b })], () => callout(a, '세 번째 춤 · 백도')), step(.5, [B(a, { pose: 'k_tsuki', k: 98, face: b, fwd: 40 })], () => iceBlade(a, b, '백도!')), step(.3, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '하쿠카 노 토가메', (a, b) => [
    step(.6, [B(a, { pose: 'k_chudan', aura: 1, elem: 'ice', face: b })], () => { callout(a, '반카이 · 하쿠카 노 토가메', true); dome(chest(a), 36, '#ffffff', '#e8faff'); for (let i = 0; i < 120; i++) parts.push({ p: a.pos.clone().add(V3(R(-40, 40), R(0, 40), R(-40, 40))), v: V3(R(-6, 6), R(-4, 4), R(-6, 6)), life: 2, c: '#ffffff', g: 0, s: pick([1, 3]) }); a.mode = 4; a.modeK = 'white'; a.modeElem = 'ice'; ring(V3(a.pos.x, .4, a.pos.z), 10, '#ffffff', true, 2, 2.4); }),
    step(.5, [B(a, { pose: 'k_tsuki', k: 95, face: b, fwd: 90, ghost: 1 })], () => { const hit = hitCheck(a, b, 'ice', '하쿠카 노 토가메!', 2.6); if (hit) freeze(b, 2); iceCircle(a, b, '', 0); for (let i = 0; i < 6; i++) add({ k: 'spike', p: V3(b.pos.x + R(-15, 15), 1.4, b.pos.z + R(-15, 15)), h: R(14, 26), c: '#ffffff', life: 2 }); }),
    step(.4, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '얼음 칼날 연무', (a, b) => [...approach(a, b, 10, 'k_run'), step(.15, [B(a, { pose: 'k_hasso', aura: 1, elem: 'ice', face: b })], () => callout(a, '얼음 칼날 연무')),
    ...[0, 1, 2, 3].map(i => step(.12, [B(a, { pose: ['k_kesa', 'k_yoko', 'k_upCut', 'k_tsuki'][i], k: 96, fwd: 30, face: b }), B(b, { pose: 'guard', face: a })], () => { arc(a, -2.2, 1.1, 18, '#e8faff', 4, .6); for (let k = 0; k < 10; k++) parts.push({ p: tipP(a), v: V3(R(-30, 30), R(-10, 30), R(-30, 30)), life: .7, c: '#ffffff', g: 30, s: 1 }); if (i === 3) { const hit = hitCheck(a, b, 'ice', '연무!', 1.3); if (hit) freeze(b, .7); } else mark(chest(b), R(0, PI), 14, '#e8faff', .8, .5); })),
    step(.25, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '순보 찌르기', (a, b) => [step(.15, [B(a, { pose: 'k_chudan', aura: 1, elem: 'ice', face: b })], () => callout(a, '순보 찌르기')), step(.15, [B(a, { pose: 'k_tsuki', k: 98, face: b })], () => { flashStep(a, () => b.pos.clone().addScaledVector(dirTo(a, b), -12), '#e8faff'); streak(chest(a), dirTo(a, b), 30, '#ffffff', 1.4); const hit = hitCheck(a, b, 'ice', '순보 찌르기!', 1.3); if (hit) freeze(b, .6); }), step(.25, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('rukia', '얼음 가시밭', (a, b) => [step(.4, [B(a, { pose: 'k_jodan', aura: 1, elem: 'ice', face: b })], () => callout(a, '얼음 가시밭')),
    step(.5, [B(a, { pose: 'swordDown', k: 95, face: b })], () => { const d = dirTo(a, b), L = a.pos.distanceTo(b.pos) + 20; for (let i = 0; i < 18; i++) pending.push({ t: i * .025, fn: () => add({ k: 'spike', p: V3(a.pos.x, 1.4, a.pos.z).addScaledVector(d, 8 + L * i / 18).add(V3(R(-6, 6), 0, R(-6, 6))), h: R(8, 18), c: i % 2 ? '#ffffff' : '#bfefff', life: 1.6 }) }); pending.push({ t: .3, fn: () => { const hit = hitCheck(a, b, 'ice', '가시밭!', 1.6); if (hit) freeze(b, .8); } }); }), step(.3, [B(a, { pose: 'k_chudan', face: b })])]);

  // ════════ 히츠가야 ════════
  reg('hitsugaya', '빙륜환', (a, b) => [step(.4, [B(a, { pose: 'k_jodan', aura: 1, elem: 'ice', face: b })], () => callout(a, '서리 하늘에 앉아라, 빙륜환')), step(.3, [B(a, { pose: 'k_kesa', k: 96, face: b })], () => iceDragon(a, b, { nm: '빙륜환!', size: 1 })), step(.8, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('hitsugaya', '대홍련 빙륜환', (a, b) => [
    step(.6, [B(a, { pose: 'k_chudan', aura: 1, elem: 'ice', face: b })], () => { callout(a, '반카이 · 대홍련 빙륜환', true); dome(chest(a), 28, '#bfefff', '#ffffff'); aura(a, ['#ffffff', '#d8f6ff', '#9fd8ff'], 100); iceWings(a, 7); a.mode = 7; a.modeK = 'daiguren'; a.modeElem = 'ice'; }),
    step(.35, [B(a, { pose: 'k_jodan', face: b, vy: 160 })], () => { }),
    step(.4, [B(a, { pose: 'k_kesa', k: 96, face: b })], () => iceDragon(a, b, { nm: '대홍련 빙륜환!', size: 1.6, pw: 2.4, freeze: 2, dur: 1 })), step(.9, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('hitsugaya', '천상옥좌', (a, b) => [step(.5, [B(a, { pose: 'skyRaise', aura: 1, elem: 'ice', face: b })], () => callout(a, '천상옥좌', true)), step(.3, [B(a, { pose: 'k_jodan', face: b })], () => skyPrison(a, b, '천상옥좌!')), step(1.2, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('hitsugaya', '군조 빙결', (a, b) => [step(.35, [B(a, { pose: 'k_hasso', aura: 1, elem: 'ice', face: b })], () => callout(a, '군조빙주')),
    step(.4, [B(a, { pose: 'skySweep', k: 92, face: b })], () => { for (let i = 0; i < 12; i++) pending.push({ t: i * .03, fn: () => proj(a, b, 'senbon', pick(['hit', 'block', 'jump']), { c: '#e8faff', ek: 'ice', size: 1.6, v: 330, nm: '군조빙주', from: () => chest(a).add(V3(R(-20, 20), R(10, 30), R(-20, 20))) }) }); }), step(.4, [B(a, { pose: 'k_chudan', face: b })])]);
  // 육의 빙결: 상대 둘레에 여섯 모서리 얼음꽃이 피어 가둠
  reg('hitsugaya', '육의 빙결', (a, b) => [step(.35, [B(a, { pose: 'swordDown', aura: 1, elem: 'ice', face: b })], () => callout(a, '육의 빙결')),
    step(.4, [B(a, { pose: 'k_tsuki', k: 92, face: b })], () => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const pe = mk(G.shard, i % 2 ? '#ffffff' : '#bfefff', .85); const an = i / 6 * PI * 2; pe.position.set(Math.cos(an) * 10, 12, Math.sin(an) * 10); pe.scale.set(3, 14, 3); pe.rotation.set(Math.sin(an) * .5, 0, -Math.cos(an) * .5); g.add(pe); } g.position.copy(b.pos); scene3.add(g);
      live({ g, max: 1.6, upd(dt, t, me) { g.position.copy(b.pos); g.scale.setScalar(Math.min(1, me.t * 5)); g.rotation.y += dt; if (me.t > 1) fade(g, 1 - (me.t - 1) / .5); return me.t < 1.5; } }); const hit = hitCheck(a, b, 'ice', '육의 빙결!', 1.5); if (hit) freeze(b, 1.2); }),
    step(.4, [B(a, { pose: 'k_chudan', face: b })])]);
  reg('hitsugaya', '빙천 백화장', (a, b) => [step(.5, [B(a, { pose: 'skyRaise', aura: 1, elem: 'ice', face: b })], () => { callout(a, '빙천백화장', true); const c0 = mk(G.sph, '#c8d8e8', .3); c0.scale.set(60, 8, 60); c0.position.copy(b.pos).add(V3(0, 130, 0)); const g = new THREE.Group(); g.add(c0); scene3.add(g); live({ g, max: 2.8, upd(dt, t, me) { for (let i = 0; i < 6; i++) parts.push({ p: b.pos.clone().add(V3(R(-60, 60), 120, R(-60, 60))), v: V3(R(-6, 6), -R(30, 60), R(-6, 6)), life: 2, c: '#ffffff', g: 0, s: 2 }); fade(g, me.t < 2 ? 1 : 1 - (me.t - 2) / .6); return me.t < 2.6; } }); }), // 하늘에 구멍이 뚫리고 눈이 내림
    step(.9, [B(a, { pose: 'k_chudan', face: b })], () => pending.push({ t: .6, fn: () => { // 눈송이가 닿은 자리마다 얼음꽃이 핌
      for (let i = 0; i < 9; i++) { const p = b.pos.clone().add(V3(R(-14, 14), R(4, 26), R(-14, 14))); const fl = new THREE.Group(); for (let k = 0; k < 6; k++) { const pe = mk(G.shard, '#ffffff', .85); pe.scale.set(.8, 3, .5); pe.position.set(Math.cos(k / 6 * PI * 2) * 2.4, Math.sin(k / 6 * PI * 2) * 2.4, 0); pe.rotation.z = k / 6 * PI * 2 - PI / 2; fl.add(pe); } fl.position.copy(p); scene3.add(fl); live({ g: fl, max: 2, upd(dt, t, me) { fl.scale.setScalar(Math.min(1, me.t * 4)); fl.rotation.z += dt; fade(fl, me.t < 1.3 ? 1 : 1 - (me.t - 1.3) / .5); return me.t < 1.8; } }); }
      const hit = hitCheck(a, b, 'ice', '빙천백화장!', 2.2); if (hit) freeze(b, 1.8); } }))]);
  reg('hitsugaya', '순보 베기', shunpo('순보', 'ice', '#d8f6ff'));
  // 빙룡선미: 칼을 휘둘러 얼음 벽을 세워 막음
  reg('hitsugaya', '빙결 방패', (a, b) => [step(.3, [B(a, { pose: 'k_waki', aura: 1, elem: 'ice', face: b })], () => callout(a, '빙룡선미')),
    step(.6, [B(a, { pose: 'k_yoko', k: 95, face: b, fwd: -20 }), B(b, { pose: pick(BASIC_HITS), k: 90, fwd: 80, face: a })], () => { const g = new THREE.Group(), d = dirTo(a, b); for (let i = 0; i < 9; i++) { const w = mk(G.shard, i % 2 ? '#ffffff' : '#bfefff', .7); w.scale.set(4, R(12, 22), 3); w.position.set((i - 4) * 4, 10, 0); g.add(w); } g.position.copy(a.pos).addScaledVector(d, 12); g.lookAt(b.pos.x, g.position.y, b.pos.z); scene3.add(g);
      live({ g, max: 1.8, upd(dt, t, me) { g.scale.y = Math.min(1, me.t * 6); if (me.t > 1.1) fade(g, 1 - (me.t - 1.1) / .5); return me.t < 1.6; } }); label(headP(a).add(V3(0, 6, 0)), '막기!', '#d8f6ff'); b.kb.addScaledVector(d, 160); burst(chest(b), 12, ['#ffffff', '#bfefff'], 1); }),
    step(.3, [B(a, { pose: 'k_chudan', face: b })])]);
  // 용선화: 칼로 찌르면 꽂힌 자리에서 십자 얼음꽃이 피어 가둠
  reg('hitsugaya', '용선회 연사', (a, b) => [...approach(a, b, 9, 'k_run'), step(.2, [B(a, { pose: 'k_chudan', aura: 1, elem: 'ice', face: b })], () => callout(a, '용선화')),
    step(.25, [B(a, { pose: 'k_tsuki', k: 98, fwd: 60, face: b })], () => { const hit = hitCheck(a, b, 'ice', '용선화!', 1.6); const g = new THREE.Group(); [[0, 0], [PI / 2, 0], [0, PI / 2]].forEach(([rz, ry]) => { const s2 = mk(G.shard, '#ffffff', .8); s2.scale.set(3, 18, 3); s2.rotation.set(0, ry, rz); g.add(s2); }); g.position.copy(chest(b)); scene3.add(g); live({ g, max: 1.4, upd(dt, t, me) { g.scale.setScalar(Math.min(1, me.t * 8)); if (me.t > .8) fade(g, 1 - (me.t - .8) / .5); return me.t < 1.3; } }); if (hit) freeze(b, 1); }),
    step(.3, [B(a, { pose: 'k_chudan', face: b })])]);

  // ════════ 켄파치: 기술 없이 날것의 노란 영압과 힘 ════════
  const KY = ['#ffe040', '#fff4a0', '#ffb020', '#ffffff'];
  const kenSlash = (a, b, nm, o = {}) => [...approach(a, b, 10, 'k_lowRun'), step(o.prep || .3, [B(a, { pose: o.two ? 'k_jodan' : 'k_hasso', aura: 1, elem: 'power', face: b }), B(b, { pose: 'guard', face: a })], () => { callout(a, nm, o.ult); aura(a, KY, o.ult ? 120 : 50); }),
    step(.2, [B(a, { pose: o.two ? 'k_kesa' : 'k_yoko', k: 99, fwd: 70, face: b }), B(b, { pose: 'guard', face: a })], () => { arc(a, -2.6, 1.3, o.r || 30, '#ffe040', o.w || 9, .8); arc(a, -2.6, 1.3, (o.r || 30) * .8, '#ffffff', 3, .6); const hit = hitCheck(a, b, 'power', nm + '!', o.pw || 1.8); explode(chest(b), 'power', hit ? (o.pw || 1.8) : 1); if (o.split) { moses(V3(a.pos.x, 0, a.pos.z), V3(a.pos.x, 0, a.pos.z).addScaledVector(dirTo(a, b), 140), 14, 2.6); scorch(b.pos, 20); shake = 18; } }),
    step(.3, [B(a, { pose: 'k_chudan', face: b })])];
  reg('kenpachi', '검팔 일격', (a, b) => kenSlash(a, b, '검도 · 일격', { two: true, prep: .6, r: 50, w: 16, pw: 2.8, split: true, ult: true }));
  reg('kenpachi', '쌍수 일격', (a, b) => kenSlash(a, b, '양손으로 · 검도', { two: true, prep: .5, r: 46, w: 14, pw: 2.6, split: true, ult: true }));
  reg('kenpachi', '노자라시', (a, b) => kenSlash(a, b, '마셔라, 노자라시', { two: true, prep: .5, r: 60, w: 20, pw: 2.6, split: true, ult: true }));
  reg('kenpachi', '난도질', (a, b) => [...approach(a, b, 9, 'k_lowRun'), step(.2, [B(a, { pose: 'k_hasso', aura: 1, elem: 'power', face: b })], () => callout(a, '난도질')),
    ...Array.from({ length: 6 }, (_, i) => step(.1, [B(a, { pose: pick(['k_kesa', 'k_yoko', 'k_upCut']), k: 99, fwd: 25, face: b }), B(b, { pose: 'guard', face: a })], () => { arc(a, R(-3, -1.5), R(.8, 1.6), 20, '#ffe040', 5, .5); if (i === 5) resolve(a, b, 'power', 'hit', '난도질!', 1.5); else { mark(chest(b), R(0, PI), 16, '#ffffff', .8, .5); burst(chest(b), 4, KY, 1); } })), step(.3, [B(a, { pose: 'laughBack', face: b })])]);
  reg('kenpachi', '난도질 연타', (a, b) => [...approach(a, b, 9, 'k_lowRun'), step(.15, [B(a, { pose: 'k_hasso', aura: 1, elem: 'power', face: b })], () => callout(a, '난도질 연타')),
    ...Array.from({ length: 10 }, (_, i) => step(.07, [B(a, { pose: pick(['k_kesa', 'k_yoko', 'k_upCut', 'k_tsuki']), k: 99, fwd: 15, face: b }), B(b, { pose: 'block', face: a })], () => { arc(a, R(-3, -1.5), R(.8, 1.6), 18, i % 2 ? '#ffffff' : '#ffe040', 4, .4); if (i === 9) resolve(a, b, 'power', 'hit', '난도질!', 1.6); else burst(chest(b), 3, KY, .8); })), step(.3, [B(a, { pose: 'laughBack', face: b })])]);
  // 영압 해방: 안대를 벗자 노란 영압이 하늘로 치솟음(해골 형상)
  const reiatsu = (a, b, nm, skull) => [step(.6, [B(a, { pose: 'laughBack', aura: 1, elem: 'power', face: b }), B(b, { pose: 'guard', face: a, fwd: -60 })], () => { callout(a, nm, true); aura(a, KY, 220, 60); pillar(V3(a.pos.x, 0, a.pos.z), 26, '#ffe040', 2); pillar(V3(a.pos.x, 0, a.pos.z), 8, '#ffffff', 2); dome(chest(a), 30, '#ffe040', '#fff4a0'); shake = 14; a.mode = 6; a.modeK = 'reiatsu'; a.modeElem = 'power'; others(a).forEach(o => o.kb.addScaledVector(dirTo(a, o), 220));
      if (skull) { const g = new THREE.Group(), sk = mk(G.sph, '#ffe040', .35); sk.scale.set(18, 20, 16); g.add(sk); [-1, 1].forEach(s => { const e = new THREE.Mesh(G.sph, new THREE.MeshBasicMaterial({ color: '#1a1408', transparent: true, opacity: .8, depthWrite: false })); e.scale.set(4.5, 5, 2); e.position.set(s * 6, 3, 14); g.add(e); }); const jaw = mk(G.box, '#fff4a0', .4); jaw.scale.set(16, 6, 12); jaw.position.set(0, -14, 4); g.add(jaw); scene3.add(g);
        live({ g, max: 2.4, upd(dt, t, me) { g.position.copy(a.pos).add(V3(0, 60, 0)); g.rotation.y = -a.heading + PI / 2; g.scale.setScalar(Math.min(1, me.t * 3) * (1 + Math.sin(t * 8) * .03)); fade(g, me.t < 1.6 ? 1 : 1 - (me.t - 1.6) / .6); return me.t < 2.2; } }); } }),
    step(.4, [B(a, { pose: 'k_hasso', face: b })])];
  reg('kenpachi', '영압 해방', (a, b) => reiatsu(a, b, '안대 해제 · 영압 해방', false));
  reg('kenpachi', '해골 영압', (a, b) => reiatsu(a, b, '해골 영압', true));
  reg('kenpachi', '영압 폭발', (a, b) => [step(.4, [B(a, { pose: 'laughBack', aura: 1, elem: 'power', face: b })], () => { callout(a, '영압 폭발'); aura(a, KY, 120); }),
    step(.3, [B(a, { pose: 'k_kesa', k: 98, face: b })], () => { const p = V3(a.pos.x, 2, a.pos.z); for (let i = 0; i < 4; i++) pending.push({ t: i * .08, fn: () => ring(p, 6 + i * 6, i % 2 ? '#ffffff' : '#ffe040', true, 1.2, 3) }); dome(chest(a), 40, '#ffe040'); others(a).filter(o => o.pos.distanceTo(a.pos) < 60).forEach(o => resolve(a, o, 'power', 'hit', '영압 폭발!', 1.8)); shake = 14; }), step(.35, [B(a, { pose: 'laughBack', face: b })])]);
  reg('kenpachi', '돌격', (a, b) => [step(.25, [B(a, { pose: 'k_lowRun', aura: 1, elem: 'power', face: b })], () => { callout(a, '맹돌격'); aura(a, KY, 40); }),
    step('run', [B(a, { pose: 'k_lowRun', to: near(a, b, 6), face: b, ghost: 1 }), B(b, { pose: 'guard', face: a })], () => { for (let i = 0; i < 6; i++) pending.push({ t: i * .05, fn: () => { parts.push({ p: a.pos.clone().add(V3(0, 1, 0)), v: V3(R(-40, 40), R(30, 70), R(-40, 40)), life: .8, c: '#8a7258', g: 200, s: 2 }); ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .5, color: '#ffe040', dec: .3 }); } }); }),
    step(.18, [B(a, { pose: 'k_kesa', k: 99, fwd: 60, face: b })], () => { arc(a, -2.6, 1.3, 34, '#ffe040', 10, .7); const hit = hitCheck(a, b, 'power', '맹돌격!', 2); explode(chest(b), 'power', hit ? 2 : 1); }), step(.3, [B(a, { pose: 'laughBack', face: b })])]);

  // ════════ 아이젠 ════════
  reg('aizen', '흑관', (a, b) => [step(.5, [B(a, { pose: 'openPalm', aura: 1, elem: 'dark', face: b })], () => { callout(a, '파도 90 · 흑관', true); aura(a, ['#120818', '#2a0a3a', '#9a4aff'], 60); }), step(.3, [B(a, { pose: 'openPalm', k: 90, face: b })], () => coffin(a, b, '흑관!')), step(1.3, [B(a, { pose: 'stance', face: b })])]);
  // 경화수월: 맞은 아이젠은 환영 → 유리처럼 깨지고, 진짜는 뒤에서 벰
  reg('aizen', '경화수월', (a, b) => [
    step(.4, [B(a, { pose: 'k_chudan', aura: 1, elem: 'petal', face: b }), B(b, { pose: pick(['k_kesa', 'punch', 'slash']), k: 95, fwd: 90, face: a })], () => { callout(a, '경화수월'); }),
    step(.2, [B(a, { pose: 'hurt', face: b })], () => { const p = chest(a); for (let i = 0; i < 40; i++) parts.push({ p: p.clone().add(V3(R(-5, 5), R(-10, 10), R(-5, 5))), v: V3(R(-60, 60), R(-20, 80), R(-60, 60)), life: 1, c: pick(['#ffffff', '#e0d0ff', '#c8a0ff']), g: 200, s: 1 }); ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .8, color: '#e0d0ff', dec: .4 }); label(p.clone().add(V3(0, 10, 0)), '환영…', '#e0d0ff');
      const to = b.pos.clone().addScaledVector(dirTo(a, b), 14); a.pos.x = to.x; a.pos.z = to.z; a.heading = Math.atan2(b.pos.z - a.pos.z, b.pos.x - a.pos.x); }),
    step(.2, [B(a, { pose: 'k_kesa', k: 99, face: b }), B(b, { pose: 'hurt', face: a })], () => { arc(a, -2.4, 1.1, 24, '#ffffff', 5, .7); const hit = hitCheck(a, b, 'dark', '언제부터 착각했지?', 2); mark(chest(b), PI / 4, 28, '#c8a0ff', 1.4, 1); if (hit) b.stun = Math.max(b.stun || 0, .6); }),
    step(.35, [B(a, { pose: 'k_chudan', face: b })])]);
  // 완전최면: 주위 공간이 거울 조각처럼 일그러지고 여러 아이젠이 보임
  reg('aizen', '완전최면', (a, b) => [step(.45, [B(a, { pose: 'k_chudan', aura: 1, elem: 'petal', face: b })], () => { callout(a, '경화수월 · 완전최면', true); const g = new THREE.Group(); for (let i = 0; i < 18; i++) { const s = mk(G.shard, i % 2 ? '#e0d0ff' : '#ffffff', .35); s.scale.set(R(3, 7), R(6, 12), .3); s.position.set(R(-40, 40), R(4, 40), R(-40, 40)); s.rotation.set(R(0, 3), R(0, 3), R(0, 3)); g.add(s); } g.position.copy(b.pos); scene3.add(g); live({ g, max: 2.2, upd(dt, t, me) { g.rotation.y += dt * .6; fade(g, me.t < 1.5 ? 1 : 1 - (me.t - 1.5) / .5); return me.t < 2; } });
      for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2; ghosts.push({ ch: a.ch, pos: b.pos.clone().add(V3(Math.cos(an) * 24, 0, Math.sin(an) * 24)), heading: an + PI, c: { ...a.c }, life: 1.4, color: '#c8a0ff', dec: .5 }); } }),
    step(.5, [B(a, { pose: 'k_iaiReady', face: b }), B(b, { pose: 'guard', face: pick(others(b)) || a })]),
    step(.18, [B(a, { pose: 'k_iaiCut', k: 99, face: b })], () => { flashStep(a, () => b.pos.clone().addScaledVector(dirTo(a, b), 12), '#c8a0ff'); arc(a, -2.2, 1, 22, '#c8a0ff', 5, .6); hitCheck(a, b, 'dark', '완전최면!', 1.8); }), step(.3, [B(a, { pose: 'k_chudan', face: b })])]);
  // 뇌명포: 손바닥에서 노란 번개 포탄
  reg('aizen', '뇌명포', (a, b) => [step(.35, [B(a, { pose: 'openPalm', aura: 1, elem: 'bolt', face: b })], () => callout(a, '파도 63 · 뇌명포')),
    step(.45, [B(a, { pose: 'openPalm', k: 92, face: b, fwd: -30 }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r: 3.2, c: '#ffe040', c2: '#ffffff', ek: 'bolt', life: .55 }); for (let i = 0; i < 6; i++) bolt(handP(a), chest(b).add(V3(R(-6, 6), R(-6, 6), R(-6, 6))), i % 2 ? '#ffe040' : '#ffffff', .4, 1.4); pending.push({ t: .15, fn: () => { const hit = hitCheck(a, b, 'bolt', '뇌명포!', 1.6); explode(chest(b), 'bolt', hit ? 1.6 : .8); } }); }), step(.2, [B(a, { pose: 'guard', face: b })])]);
  // 비룡격적진천뢰포: 두 손에서 거대한 푸른 번개 포격
  reg('aizen', '비룡격적진천뢰포', (a, b) => [step(.6, [B(a, { pose: 'twoHand', aura: 1, elem: 'light', face: b })], () => { callout(a, '파도 88 · 비룡격적진천뢰포', true); for (let i = 0; i < 6; i++) pending.push({ t: i * .08, fn: () => bolt(handP(a), handP(a).add(V3(R(-20, 20), R(-10, 20), R(-20, 20))), '#9fc8ff', .3, 1) }); }),
    step(.7, [B(a, { pose: 'openPalm', k: 90, face: b, fwd: -50 }), B(b, { pose: 'guard', face: a })], () => { add({ k: 'beam', f: a, t: b, r: 7, c: '#4a8aff', c2: '#e0f0ff', ek: 'bolt', life: .9 }); add({ k: 'beam', f: a, t: b, r: 2.4, c: '#ffffff', c2: '#ffffff', ek: 'bolt', life: .8 }); for (let i = 0; i < 10; i++) pending.push({ t: i * .05, fn: () => bolt(handP(a), chest(b).add(V3(R(-14, 14), R(-14, 14), R(-14, 14))), '#cfe8ff', .4, 2) }); moses(V3(a.pos.x, 0, a.pos.z), V3(b.pos.x, 0, b.pos.z), 20, 2.6);
      pending.push({ t: .3, fn: () => { hitCheck(a, b, 'bolt', '비룡격적진천뢰포!', 2.6); ultBlast(chest(b), 'bolt', 65, a, '파도 88!'); } }); }), step(.3, [B(a, { pose: 'stance', face: b })])]);
  // 붕옥 각성: 하얀 고치가 감쌌다가 깨지며 보랏빛 영압의 새 몸
  reg('aizen', '붕옥 각성', (a, b) => [step(.6, [B(a, { pose: 'openArms', aura: 1, elem: 'dark', face: b })], () => { callout(a, '붕옥 각성', true); const g = new THREE.Group(), co = mk(G.sph, '#f4f4f8', .55); co.scale.set(12, 22, 12); co.position.y = 16; g.add(co); const glow = new THREE.Sprite(spriteMat(glowTex, '#c8a0ff', .7)); glow.scale.set(70, 70, 1); glow.position.y = 16; g.add(glow); scene3.add(g);
      live({ g, max: 1.6, upd(dt, t, me) { g.position.copy(a.pos); co.scale.set(12 * (1 + me.t * .2), 22 * (1 + me.t * .1), 12 * (1 + me.t * .2)); if (me.t > 1 && !me.br) { me.br = true; for (let i = 0; i < 60; i++) parts.push({ p: chest(a), v: V3(R(-120, 120), R(0, 160), R(-120, 120)), life: 1.2, c: pick(['#ffffff', '#e0d0ff', '#9a4aff']), g: 160, s: 2 }); dome(chest(a), 34, '#9a4aff', '#ffffff'); shake = 12; } fade(g, me.t < 1 ? 1 : 1 - (me.t - 1) / .4); return me.t < 1.5; } }); }),
    step(.8, [B(a, { pose: 'openArms', face: b })], () => { a.mode = 7; a.modeK = 'hogyoku'; a.modeElem = 'dark'; aura(a, ['#9a4aff', '#e0d0ff', '#ffffff'], 140, 50); pillar(V3(a.pos.x, 0, a.pos.z), 20, '#9a4aff', 1.6); })]);

  // 이 파일이 원작대로 다시 만든 기술 이름 (fxstyle 의 자동 이펙트 제외용)
  ['월아천충!', '흑 월아천충!', '세로', '반카이!', '천쇄참월 고속 연격', '최후의 월아천충 · 무월', '반카이 · 센본자쿠라 카게요시', '센본자쿠라 · 경엄', '반카이 · 천본앵경엄', '종경 · 백제검', '파도 4 · 백뢰', '박도 61 · 육장광뢰', '파도 33 · 창화추', '파도 31 · 적화포', '순보', '순보 연참',
    '소데노시라유키 · 첫 번째 춤 · 월백', '두 번째 춤 · 백련', '세 번째 춤 · 백도', '반카이 · 하쿠카 노 토가메', '얼음 칼날 연무', '순보 찌르기', '얼음 가시밭', '서리 하늘에 앉아라, 빙륜환', '반카이 · 대홍련 빙륜환', '천상옥좌', '군조빙주', '육의 빙결', '빙천백화장', '빙룡선미', '용선화',
    '검도 · 일격', '양손으로 · 검도', '마셔라, 노자라시', '난도질', '난도질 연타', '안대 해제 · 영압 해방', '해골 영압', '영압 폭발', '맹돌격', '파도 90 · 흑관', '경화수월', '경화수월 · 완전최면', '파도 63 · 뇌명포', '파도 88 · 비룡격적진천뢰포', '붕옥 각성', '월아천충', '월아천충 연사', '허화', '순보 베기'].forEach(NM);
  window.CANON_BLEACH = { getsuga, iceDragon, freeze, petalSwarm, coffin, sixRods, iceWings, skyPrison, iceCircle, iceWave, iceBlade, LIVE };
})();
