/* 카메라를 절벽 경기장(타원 암벽) 안쪽으로 제한 — 소유자 요청(11-05). 모든 시점 공통.
   카메라가 벽 밖으로 나가는 앵글이면 옆으로 밀지 않고, 바라보는 인물 쪽으로 앞으로 당긴다(3인칭 → 최대 1인칭 거리까지).
   그래도 밖이면(인물 자체가 벽 가까이) 마지막으로 안쪽으로 밀어 넣는다. 바라보는 지점은 유지. */
(function () {
  if (typeof renderer === 'undefined' || typeof camera === 'undefined') return;
  const CX = 0, CZ = -60, RX = 360, RZB = 330, RZF = 660, K = .8, YMIN = 6, YMAX = 330, FP = 4; /* FP: 1인칭에 가까운 최소 거리 */
  const fwd = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3(), foc = new THREE.Vector3();
  const ell = (x, z) => { const dx = x - CX, dz = z - CZ, rz = dz < 0 ? RZB : RZF; return Math.sqrt((dx / (RX * K)) * (dx / (RX * K)) + (dz / (rz * K)) * (dz / (rz * K))); };
  function focusPoint(p) { /* 시선에 가장 가까운 인물 머리(없으면 시선 120 앞) */
    let best = null, bd = 1e9;
    if (typeof F !== 'undefined') for (const f of F) { if (!f || !f.pos) continue; tmp.set(f.pos.x, (f.pos.y || 0) + 14, f.pos.z).sub(p); const along = tmp.dot(fwd); if (along <= 0) continue; const perp = tmp.addScaledVector(fwd, -along).length(); if (perp < bd) { bd = perp; best = f; } }
    if (best) return foc.set(best.pos.x, (best.pos.y || 0) + 14, best.pos.z);
    return foc.copy(p).addScaledVector(fwd, 120);
  }
  function clampCam() {
    const p = camera.position, yOut = p.y < YMIN || p.y > YMAX;
    if (ell(p.x, p.z) <= 1 && !yOut) return;
    camera.getWorldDirection(fwd); look.copy(p).addScaledVector(fwd, 120);
    const t = focusPoint(p), D = p.distanceTo(t);
    if (ell(p.x, p.z) > 1 && D > FP) { /* 인물 쪽으로 당기기: 안쪽이 되는 가장 먼 지점 */
      let lo = 0, hi = 1 - FP / D, ok = ell(p.x + (t.x - p.x) * hi, p.z + (t.z - p.z) * hi) <= 1;
      if (ok) { for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (ell(p.x + (t.x - p.x) * m, p.z + (t.z - p.z) * m) <= 1) hi = m; else lo = m; } p.lerp(t, hi); look.copy(t); }
    }
    const e = ell(p.x, p.z);
    if (e > 1) { const s = 1 / e; p.x = CX + (p.x - CX) * s; p.z = CZ + (p.z - CZ) * s; }
    p.y = Math.max(YMIN, Math.min(YMAX, p.y));
    camera.lookAt(look); camera.updateMatrixWorld();
  }
  /* 11-14 소유자 지적 '스사노오가 너무 커서 화면에 아무것도 안 보임': 필살기 연출 카메라가 시전자에게 바짝 붙으면
     주위로 펼쳐진 스사노오(날개 폭 ~캐릭터 2배)가 카메라를 감싸 화면 전체를 가림(실측: 날개가 화면의 137%).
     스사노오가 떠 있는 동안엔 카메라를 스사노오 높이의 2.4배 거리 밖으로 부드럽게 물림(바라보는 지점 유지). */
  const sc = new THREE.Vector3(), away = new THREE.Vector3(); let pushK = 0;
  function susanooKeepOut() {
    const L = window.__susanoo && __susanoo.LIVE; if (!L || !L.length) { pushK = Math.max(0, pushK - .08); return; }
    camera.getWorldDirection(fwd); look.copy(camera.position).addScaledVector(fwd, 120);
    const t = focusPoint(camera.position).clone(); let moved = false;
    for (const S of L) { if (!S || !S.root || !S.root.visible) continue;
      const h = (S.target || 25) * (S.root.scale.x / (S.scs || 1) || 1); sc.copy(S.root.position); sc.y += h * .55;
      const need = h * 2.4, d = camera.position.distanceTo(sc); if (d >= need) continue;
      away.copy(camera.position).sub(sc); if (away.lengthSq() < 1e-4) away.set(0, .4, 1); away.normalize(); if (away.y < .15) { away.y = .15; away.normalize(); }
      pushK = Math.min(1, pushK + .12); camera.position.copy(sc).addScaledVector(away, d + (need - d) * pushK); moved = true; }
    if (moved) { camera.lookAt(t); camera.updateMatrixWorld(); }
  }
  /* 필살기 연출 카메라가 인물 몸에 거의 붙어 화면 전체가 옷·피부 한 면으로 덮이는 것 방지(실측: 캐릭터가 화면의 84%).
     1인칭·자유 시점은 제외. 인물 가슴에서 키의 1.15배 안으로는 들어가지 않음(부드럽게 밀어냄). */
  const fc = new THREE.Vector3();
  function bodyKeepOut() {
    const m = window.CAMVIEW && CAMVIEW.mode; if (m === 'fp' || m === 'free' || typeof F === 'undefined') return;
    let moved = false;
    for (const f of F) { if (!f || !f.pos || f.away) continue; const H = 16 * (f.scale || 1) * 1.15 + 6; fc.set(f.pos.x, (f.pos.y || 0) + 9 * (f.scale || 1), f.pos.z);
      const d = camera.position.distanceTo(fc); if (d >= H) continue;
      if (!moved) { camera.getWorldDirection(fwd); look.copy(camera.position).addScaledVector(fwd, 60); }
      away.copy(camera.position).sub(fc); if (away.lengthSq() < 1e-4) away.copy(fwd).multiplyScalar(-1); away.normalize(); if (away.y < .1) { away.y = .1; away.normalize(); }
      camera.position.copy(fc).addScaledVector(away, H); moved = true; }
    if (moved) { camera.lookAt(look); camera.updateMatrixWorld(); }
  }
  const _r = renderer.render.bind(renderer);
  renderer.render = function (scn, cam) { if (cam === camera) { try { susanooKeepOut(); } catch (e) { } try { bodyKeepOut(); } catch (e) { } try { clampCam(); } catch (e) { } } return _r(scn, cam); };
  window.CAMCLAMP = { clampCam };
})();
