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
  const _r = renderer.render.bind(renderer);
  renderer.render = function (scn, cam) { if (cam === camera) { try { clampCam(); } catch (e) { } } return _r(scn, cam); };
  window.CAMCLAMP = { clampCam };
})();
