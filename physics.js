// 물리 층: Rapier(@dimforge/rapier3d-compat 0.14.0, Apache-2.0, cdn.jsdelivr 고정 판) — 물리 엔진을 새로 짜지 않고 검증된 엔진을 쓴다.
//  - 인물: 캡슐 Collider + KinematicCharacterController(미끄러지며 비켜 감). 인물끼리·바위와 겹치지 않게 수평 이동을 고친다.
//  - 바위: 경기장 큰 바위(Dodecahedron 메시)를 볼록 껍질(convex hull) Collider 로.
//  - 시야: Raycast(가슴 → 가슴)로 바위에 가려졌는지(Line of Sight). AI 가 씀(ai-fsm.js).
//  - 고정 시간 간격(Fixed Timestep 1/60초, 한 화면에 최대 3번).
//  - 세로(점프·낙하·바위 위 착지)는 기존 arena.js·collide.js 가 그대로 맡는다(겹쳐 고치지 않음).
// 불러오기 실패하면 기존 collide.js 만으로 동작(자동 대체). 끄기: PHYS.on = false.
(function () {
  if (typeof F === 'undefined' || typeof update !== 'function' || typeof scene3 === 'undefined') return;
  const URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/+esm';
  const PH = window.PHYS = { on: true, ready: false, failed: null, rocks: 0, ms: 0, msMax: 0,
    st: { frames: 0, steps: 0, blocked: 0, teleports: 0, losChecks: 0, losBlocked: 0, minGap: Infinity }, los: () => true, reset() { Object.assign(PH.st, { frames: 0, steps: 0, blocked: 0, teleports: 0, losChecks: 0, losBlocked: 0, minGap: Infinity, depen: 0 }); PH.msMax = 0; } };
  const G_ROCK = 1, G_CHAR = 2, G_FLY = 4, G_GROUND = 8, grp = (mem, filt) => (mem << 16) | filt;
  const flights = new Map(); // 날아가는 인물 → { rb, r, key, t, start, grade, prevVy, prevH, bounces, wall, rock, maxY }
  PH.flights = flights; PH.st.flight = { mid: [], ult: [], clash: [] }; PH.st.bounce = 0; PH.st.rockHit = 0; PH.st.wallHit = 0;
  let R3 = null, world = null, kcc = null, ray = null, acc = 0;
  const bodies = new Map(); // 인물 → { rb, col, key, r, hc }
  const STEP = 1 / 60;

  import(URL).then(async m => { R3 = m.default || m; await R3.init(); build(); }).catch(e => { PH.failed = String(e && e.message || e); console.warn('[phys] Rapier 불러오기 실패 — collide.js 만 사용', e); });

  function build() {
    world = new R3.World({ x: 0, y: -420, z: 0 }); world.timestep = STEP; // 중력 = arena.js GRAV(420) — 날아가는 몸(동적 강체)만 받음, 인물 캡슐은 위치 고정형이라 영향 없음
    { const gd = R3.ColliderDesc.cuboid(900, 2, 900).setTranslation(0, -2, 0).setFriction(.5).setRestitution(.3); gd.setCollisionGroups(grp(G_GROUND, G_FLY)); world.createCollider(gd); } // 바닥(날아가는 몸만 부딪힘)
    const v = new THREE.Vector3();
    scene3.children.forEach(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry || o.geometry.type !== 'DodecahedronGeometry' || o.scale.x < 5) return;
      o.updateMatrixWorld(true); const pos = o.geometry.attributes.position, pts = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); pts[i * 3] = v.x; pts[i * 3 + 1] = v.y; pts[i * 3 + 2] = v.z; }
      const cd = R3.ColliderDesc.convexHull(pts); if (!cd) return;
      cd.setCollisionGroups(grp(G_ROCK, G_CHAR | G_ROCK | G_FLY)); cd.setRestitution(.45); world.createCollider(cd); PH.rocks++;
    });
    kcc = world.createCharacterController(.05); kcc.setSlideEnabled(true); kcc.setUp({ x: 0, y: 1, z: 0 }); kcc.setApplyImpulsesToDynamicBodies(false);
    ray = new R3.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    PH.los = los; PH.launch = launch; PH.world = () => world; PH.ready = true;
  }

  const sz = f => { const s = (f.scale || 1), H = 34 * MS * s, r = 2.1 * s * (f.bulk || 1); return { H, r, hh: Math.max(.4, H / 2 - r) }; };
  function bodyOf(f) {
    let b = bodies.get(f); const k = f.ch && f.ch.key;
    if (b && b.key === k && Math.abs((b.sc || 1) - (f.scale || 1)) < .15) return b; // 거인화 등 크기가 바뀌면 캡슐 다시 만듦
    if (b) world.removeRigidBody(b.rb);
    const { H, r, hh } = sz(f), hc = H / 2;
    const rb = world.createRigidBody(R3.RigidBodyDesc.kinematicPositionBased().setTranslation(f.pos.x, f.pos.y + hc, f.pos.z));
    const col = world.createCollider(R3.ColliderDesc.capsule(hh, r).setCollisionGroups(grp(G_CHAR, G_ROCK | G_CHAR)), rb);
    b = { rb, col, key: k, r, hc, fresh: true, sc: f.scale || 1 }; bodies.set(f, b); return b;
  }

  // ── 날려 보내기: 충격량(속도) → 포물선·바닥 튕김·마찰 미끄러짐(Rapier 동적 강체) ──
  function launch(f, vx, vy, vz, grade, opt) {
    if (!PH.ready || !f) return false;
    let fl = flights.get(f);
    if (fl) { const v = fl.rb.linvel(); fl.rb.setLinvel({ x: v.x + vx, y: Math.max(v.y, vy), z: v.z + vz }, true); if (grade === 'ult' || grade === 'clash') fl.grade = grade; return true; }
    const r = 2.1 * (f.scale || 1) * (f.bulk || 1);
    const rb = world.createRigidBody(R3.RigidBodyDesc.dynamic().setTranslation(f.pos.x, Math.max(f.pos.y, 0) + r + .05, f.pos.z).setLinearDamping(.15).setGravityScale(0).lockRotations().setCcdEnabled(true)); // 중력은 flightTick 에서 게임 시간으로 직접 더함(측정 결과 날아가는 몸에 세계 중력이 일정하게 먹지 않아서)
    const cd = R3.ColliderDesc.ball(r).setFriction(.8).setRestitution(.3).setMass(10); /* 질량을 정해 줌, 마찰: 떨어진 뒤 미끄러지며 감속 */ cd.setCollisionGroups(grp(G_FLY, opt && opt.cliff ? G_GROUND : G_ROCK | G_GROUND)); /* 절벽까지 날아가는 몸은 경기장 바위를 넘어감 */ world.createCollider(cd, rb);
    rb.setLinvel({ x: vx, y: vy, z: vz }, true);
    flights.set(f, { rb, r, key: f.ch && f.ch.key, t: 0, start: f.pos.clone(), grade: grade || 'mid', prevVy: vy, prevH: Math.hypot(vx, vz), bounces: 0, wall: 0, rock: 0, maxY: f.pos.y, slow: 0, cliff: opt && opt.cliff, onCliff: opt && opt.onCliff });
    f.kb.set(0, 0, 0); f.vel.set(0, 0, 0); f.air = true; f.arc = null; f.perchAt = null; return true;
  }
  const fx = (k, p, pw, dir) => { try { if (k === 'land' && window.FX3 && FX3.ground) FX3.ground(p, pw, null, dir); else if (window.__env && __env.smash) __env.smash(p, pw, null, dir); } catch (e) { } };
  function flightTick(dt) {
    flights.forEach((fl, f) => {
      if (!F.includes(f) || (f.ch && f.ch.key) !== fl.key) { world.removeRigidBody(fl.rb); flights.delete(f); return; } // 교대·퇴장
      fl.t += dt; const tr = fl.rb.translation(), lv0 = fl.rb.linvel(); { const onG = tr.y - fl.r < .4 && lv0.y <= 5, hh = Math.hypot(lv0.x, lv0.z), dec = onG && hh > 0 ? Math.max(0, hh - 260 * dt) / hh : 1; fl.rb.setLinvel({ x: lv0.x * dec, y: lv0.y - 420 * dt, z: lv0.z * dec }, true); } /* 중력(항상) + 바닥에 닿아 미끄러질 때 마찰 감속(초당 260) */ const lv = fl.rb.linvel(), h = Math.hypot(lv.x, lv.z);
      const rr = Math.hypot(tr.x, tr.z), RM = ARENA - 4;
      if (lv.y > 360 || tr.y > 140) { fl.rb.setLinvel({ x: lv.x * .8, y: Math.min(lv.y, tr.y > 140 ? 0 : 360), z: lv.z * .8 }, true); PH.st.yCap = (PH.st.yCap || 0) + 1; } // 겹침 풀림으로 하늘로 튀는 것 방지(높이 상한)
      if (fl.cliff) { const hit = fl.cliff(tr.x, tr.z); if (hit) { const y = Math.max(0, tr.y - fl.r); f.pos.set(hit.x, y, hit.z); world.removeRigidBody(fl.rb); flights.delete(f); PH.st.cliffHit = (PH.st.cliffHit || 0) + 1; try { fl.onCliff && fl.onCliff(f, hit, y); } catch (e) { console.error(e); } return; } }
      else if (rr > RM) { const nx = tr.x / rr, nz = tr.z / rr, vr = lv.x * nx + lv.z * nz; fl.rb.setTranslation({ x: nx * RM, y: tr.y, z: nz * RM }, true); tr.x = nx * RM; tr.z = nz * RM; if (vr > 0) { fl.rb.setLinvel({ x: (lv.x - 1.6 * vr * nx) * .35, y: Math.min(lv.y, 40), z: (lv.z - 1.6 * vr * nz) * .35 }, true); fl.wall++; PH.st.wallHit++; if (fl.wall === 1) fx('rock', f.pos, 1.6, V3(-nx, 0, -nz)); } } // 경기장 끝: 크게 감속하며 안쪽으로 튕김(벽을 따라 미끄러지지 않게) // 경기장 끝: 안쪽으로 튕김·감쇠
      const y = Math.max(0, tr.y - fl.r);
      if (fl.prevVy < -60 && lv.y > -5 && y < 1.2) { fl.bounces++; PH.st.bounce++; fx('land', f.pos, Math.min(3.2, 1 + Math.abs(fl.prevVy) / 160), V3(lv.x, 0, lv.z)); shake = Math.max(shake, 3); } // 바닥에 튕김: 먼지·균열
      if (y > 1.5 && fl.prevH > 80 && h < fl.prevH * .55) { fl.rock++; PH.st.rockHit++; fx('rock', f.pos, 2.2, V3(lv.x, 0, lv.z)); shake = Math.max(shake, 6); } // 바위에 부딪힘: 부서짐 연출
      fl.prevVy = lv.y; fl.prevH = h; fl.maxY = Math.max(fl.maxY, y);
      f.pos.set(tr.x, y, tr.z); f.vel.set(0, 0, 0); f.kb.set(0, 0, 0); f.air = y > .3;
      if ((fl.t > .25 && y < .3 && h < 22) || fl.t > 4) { // 멈춤: 끝
        const d = Math.hypot(f.pos.x - fl.start.x, f.pos.z - fl.start.z); (PH.st.flight[fl.grade] || (PH.st.flight[fl.grade] = [])).push({ d: +d.toFixed(1), h: +fl.maxY.toFixed(1), b: fl.bounces, t: +fl.t.toFixed(2) });
        world.removeRigidBody(fl.rb); flights.delete(f); f.pos.y = 0; f.air = false; }
    });
  }

  // 시야: 두 인물 가슴 사이를 바위가 가리는지(인물은 무시)
  function los(a, b) {
    if (!PH.ready || !a || !b) return true;
    const ay = a.pos.y + 22 * MS * (a.scale || 1), by = b.pos.y + 22 * MS * (b.scale || 1);
    let dx = b.pos.x - a.pos.x, dy = by - ay, dz = b.pos.z - a.pos.z; const d = Math.hypot(dx, dy, dz); if (d < 1) return true;
    ray.origin.x = a.pos.x; ray.origin.y = ay; ray.origin.z = a.pos.z; ray.dir.x = dx / d; ray.dir.y = dy / d; ray.dir.z = dz / d;
    PH.st.losChecks++;
    const hit = world.castRay(ray, d, true, undefined, grp(0xffff, G_ROCK));
    if (hit) { PH.st.losBlocked++; return false; }
    return true;
  }

  const _update = update;
  update = function (dt, t) {
    const r = _update.apply(this, arguments);
    if (!PH.ready || !PH.on) return r;
    const w0 = performance.now();
    // 나간 인물의 몸 지우기
    bodies.forEach((b, f) => { if (!F.includes(f)) { world.removeRigidBody(b.rb); bodies.delete(f); } });
    for (let i = 0; i < F.length; i++) {
      const f = F[i], b = bodyOf(f), tr = b.rb.translation();
      const dx = f.pos.x - tr.x, dz = f.pos.z - tr.z;
      // 공중·포물선 이동·바위 위(발판)·바위 높이에 있는 인물은 캐릭터 컨트롤러로 수평 이동을 막지 않음 — 바위 안에 캡슐이 걸쳐 매 화면 제자리로 되돌려지는 것(멈춤) 방지. 세로·바위 위는 moves.js·collide.js 가 맡음
      if (f.air || f.arc || f.perchAt || f.pos.y > 1.5) { b.rb.setNextKinematicTranslation({ x: f.pos.x, y: f.pos.y + b.hc, z: f.pos.z }); PH.st.skipAir = (PH.st.skipAir || 0) + 1; continue; }
      if (b.fresh || dx * dx + dz * dz > 30 * 30) { // 순간이동·교대·대타: 그대로 옮김
        b.fresh = false; b.rb.setTranslation({ x: f.pos.x, y: f.pos.y + b.hc, z: f.pos.z }, true); PH.st.teleports++; continue;
      }
      kcc.computeColliderMovement(b.col, { x: dx, y: 0, z: dz }, undefined, grp(G_CHAR, G_ROCK | G_CHAR));
      const mv = kcc.computedMovement();
      const want = Math.hypot(dx, dz), got = Math.hypot(mv.x, mv.z);
      if (want > .05 && got < want * .7) { PH.st.blocked++; f.kb.multiplyScalar(.6); } // 막힌 쪽으로 계속 밀리지 않게
      f.pos.x = tr.x + mv.x; f.pos.z = tr.z + mv.z;
      b.rb.setNextKinematicTranslation({ x: f.pos.x, y: f.pos.y + b.hc, z: f.pos.z });
    }
    // 겹친 채 시작한 경우(교대·대타·돌진 직후): 캐릭터 컨트롤러는 밀어내지 않으므로 캡슐 반지름 합만큼 벌려 둠(Depenetration)
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], c = F[j], ba = bodies.get(a), bc = bodies.get(c); if (!ba || !bc) continue;
      const dx = c.pos.x - a.pos.x, dz = c.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = ba.r + bc.r;
      if (d < m && Math.abs(a.pos.y - c.pos.y) < ba.hc + bc.hc) { const ux = d > .001 ? dx / d : 1, uz = d > .001 ? dz / d : 0, p = (m - d) / 2; a.pos.x -= ux * p; a.pos.z -= uz * p; c.pos.x += ux * p; c.pos.z += uz * p; PH.st.depen = (PH.st.depen || 0) + 1;
        ba.rb.setNextKinematicTranslation({ x: a.pos.x, y: a.pos.y + ba.hc, z: a.pos.z }); bc.rb.setNextKinematicTranslation({ x: c.pos.x, y: c.pos.y + bc.hc, z: c.pos.z }); }
    }
    acc = Math.min(acc + dt, STEP * 3); let n = 0;
    while (acc >= STEP && n < 3) { world.step(); acc -= STEP; n++; PH.st.steps++; }
    if (!n && bodies.size && !flights.size) { world.step(); PH.st.steps++; } // 날아가는 몸이 있으면 고정 간격만(주사율에 따라 빨라지지 않게)
    if (flights.size) flightTick(dt); // 주사율이 높아도 위치가 밀리지 않게(남는 시간은 다음 화면으로)
    // 인물 사이 가장 가까운 거리(겹침 측정용)
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) { const g = Math.hypot(F[i].pos.x - F[j].pos.x, F[i].pos.z - F[j].pos.z); if (g < PH.st.minGap) PH.st.minGap = g; }
    PH.st.frames++;
    const ms = performance.now() - w0; PH.ms += (ms - PH.ms) * .05; if (ms > PH.msMax) PH.msMax = ms;
    return r;
  };
})();
