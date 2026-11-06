// 고정 물체 충돌: 경기장 바위(moves.js 의 발판 바위 3개)와 바닥 파괴로 솟은 바위 가시(env.js)를 인물이 통과하지 않게 막는다.
// - 옆에서 부딪히면 바깥으로 밀어내고 미끄러지듯 비켜 감(가던 방향의 옆으로 돌아감)
// - 강한 넉백으로 부딪히면 튕기며 먼지·흔들림, 아주 세면 잠깐 휘청
// - 바위보다 높은 곳에서 떨어지면 위에 올라서고(발판), 가장자리를 벗어나면 다시 떨어짐
// arena.js 의 update 를 감싸 이동 계산 바로 뒤(그리기 전)에 고친다. 매 프레임 새 객체를 만들지 않는다.
(function () {
  if (typeof F === 'undefined' || typeof update !== 'function') return;
  // ── 충돌 모양 모으기: 타원 바위(중심 x·z, 가로·세로 반지름, 높이, 회전) ──
  const ROCKS = [];
  scene3.children.forEach(o => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry || o.geometry.type !== 'DodecahedronGeometry' || o.scale.x < 5) return;
    ROCKS.push({ x: o.position.x, z: o.position.z, rx: o.scale.x * .95, rz: o.scale.z * .95, h: o.scale.y * .93, c: Math.cos(o.rotation.y), s: Math.sin(o.rotation.y) });
  });
  const ST = { maxPen: 0, impacts: 0, lands: 0, pushes: 0, spikePush: 0 };
  const cr = f => 3.6 * (f.scale || 1) * (f.bulk || 1); // 인물 몸통 반지름

  // 바위 지역 좌표(회전 반영)
  let lx = 0, lz = 0;
  const local = (r, x, z) => { const dx = x - r.x, dz = z - r.z; lx = dx * r.c - dz * r.s; lz = dx * r.s + dz * r.c; };
  const surf = (r, q) => q < 1 ? r.h * Math.sqrt(1 - q) : 0; // 그 자리 바위 윗면 높이

  function impactFx(f, nx, nz, vn) {
    ST.impacts++;
    const p = V3(f.pos.x - nx * cr(f), Math.max(2, f.pos.y + 6), f.pos.z - nz * cr(f));
    burst(p, vn > 300 ? 18 : 10, ['#8a7a68', '#a89880', '#6a5a48', '#d8c8b0'], vn > 300 ? 1.1 : .8, 120, 2);
    shake = Math.max(shake, Math.min(5, vn / 90));
    if (vn > 300) { f.stun = Math.max(f.stun || 0, .35); f.fallV = (f.fallV || 0) + 4; label(p.clone().add(V3(0, 8, 0)), '쾅!', '#e8d8b8'); }
  }

  function rockStep(f) {
    const r0 = cr(f), py = f._cy === undefined ? f.pos.y : f._cy;
    for (let i = 0; i < ROCKS.length; i++) {
      const r = ROCKS[i];
      local(r, f.pos.x, f.pos.z);
      const ex = r.rx + r0, ez = r.rz + r0, qe = (lx / ex) * (lx / ex) + (lz / ez) * (lz / ez);
      if (f.onRock === r) { // 위에 서 있음: 윗면을 따라가다 가장자리를 벗어나면 떨어짐
        const q = (lx / r.rx) * (lx / r.rx) + (lz / r.rz) * (lz / r.rz);
        if (q < 1 && !f.air) { f.pos.y = surf(r, q); f.vel.y = 0; continue; }
        f.onRock = null; if (f.pos.y > .5) { f.air = true; f.vel.y = Math.min(f.vel.y, 0); }
      }
      if (qe >= 1) continue;
      const q = (lx / r.rx) * (lx / r.rx) + (lz / r.rz) * (lz / r.rz), S = surf(r, Math.min(q, .999));
      // 위에서 내려오는 중이면 착지
      if (f.air && f.vel.y <= 0 && py >= S - 1.5 && q < 1) { f.pos.y = S; f.vel.y = 0; f.air = false; f.onRock = r; ST.lands++; burst(V3(f.pos.x, S + 1, f.pos.z), 6, ['#8a7a68', '#a89880'], .5, 80, 2); continue; }
      if (f.pos.y >= r.h - .5) continue; // 바위 꼭대기보다 높이 지나감
      if (f.pos.y >= S + 1 && q >= .55) continue; // 비탈 위쪽 공중(옆면에 닿지 않음)
      // 옆면: 타원 바깥 경계로 밀어냄 + 들어가던 속도는 없애고 옆으로 미끄러짐
      const k = 1 / Math.sqrt(qe), pen = (1 - Math.sqrt(qe)) * Math.min(ex, ez);
      let nxl = lx / (ex * ex), nzl = lz / (ez * ez); const nl = Math.hypot(nxl, nzl) || 1; nxl /= nl; nzl /= nl;
      const nx = nxl * r.c + nzl * r.s, nz = -nxl * r.s + nzl * r.c; // 세계 좌표 법선(바깥)
      const bx = lx * k, bz = lz * k; // 경계 위 지역 좌표
      f.pos.x = r.x + bx * r.c + bz * r.s + nx * .05; f.pos.z = r.z - bx * r.s + bz * r.c + nz * .05;
      ST.pushes++; if (pen > ST.maxPenRaw) ST.maxPenRaw = pen;
      const vIn = -(f.vel.x * nx + f.vel.z * nz), kIn = -(f.kb.x * nx + f.kb.z * nz);
      if (vIn > 0) { f.vel.x += nx * vIn; f.vel.z += nz * vIn; // 들어가던 몫만 없앰 → 남은 몫으로 옆으로 미끄러짐
        const tx = -nz, tz = nx, side = (f.vel.x * tx + f.vel.z * tz) >= 0 ? 1 : -1; f.vel.x += tx * side * vIn * .6; f.vel.z += tz * side * vIn * .6; } // 막히면 옆으로 돌아감
      if (kIn > 0) { const e = kIn > 140 ? .35 : 0; f.kb.x += nx * kIn * (1 + e); f.kb.z += nz * kIn * (1 + e); if (kIn > 140) impactFx(f, nx, nz, kIn + Math.max(0, vIn)); }
      else if (vIn > 220) impactFx(f, nx, nz, vIn);
    }
  }

  function spikeStep(f) { // 솟구친 바위 가시: 밀어내기만(올라서지 않음)
    const env = window.__env, list = env && env.spikes; if (!list || !list.length || f.pos.y > 14) return;
    const r0 = cr(f);
    for (let i = 0; i < list.length; i++) {
      const s = list[i], u = Math.max(0, s.t); if (s.t < 0) continue;
      const kk = u < .1 ? u / .1 : u > s.life - .5 ? Math.max(0, (s.life - u) / .5) : 1, h = s.h * kk; if (h < 3 || f.pos.y > h) continue;
      const rad = s.w * .55 + r0, dx = f.pos.x - s.p.x, dz = f.pos.z - s.p.z, d = Math.hypot(dx, dz); if (d >= rad || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d; f.pos.x = s.p.x + nx * rad; f.pos.z = s.p.z + nz * rad; ST.spikePush++;
      const vIn = -(f.vel.x * nx + f.vel.z * nz), kIn = -(f.kb.x * nx + f.kb.z * nz);
      if (vIn > 0) { f.vel.x += nx * vIn; f.vel.z += nz * vIn; } if (kIn > 0) { f.kb.x += nx * kIn * 1.3; f.kb.z += nz * kIn * 1.3; }
    }
  }

  // 측정: 이동 계산 직후(고치기 전) 겹침 깊이와 고친 뒤 남은 겹침
  function residual(f) {
    let worst = 0; const r0 = cr(f);
    for (let i = 0; i < ROCKS.length; i++) { const r = ROCKS[i]; local(r, f.pos.x, f.pos.z);
      const ex = r.rx + r0, ez = r.rz + r0, qe = (lx / ex) * (lx / ex) + (lz / ez) * (lz / ez); if (qe >= 1) continue;
      const q = (lx / r.rx) * (lx / r.rx) + (lz / r.rz) * (lz / r.rz), S = surf(r, Math.min(q, .999)); if (f.pos.y >= S - .6 || f.pos.y >= r.h - .5) continue;
      worst = Math.max(worst, (1 - Math.sqrt(qe)) * Math.min(ex, ez)); }
    return worst;
  }
  ST.maxPenRaw = 0;

  const _update = update;
  update = function (dt, t) {
    const r = _update.apply(this, arguments);
    for (let i = 0; i < F.length; i++) {
      const f = F[i]; if (!f || !f.pos) continue;
      if (f.arc || f.perchAt) { f.onRock = null; f._cy = f.pos.y; continue; } // 도약·발판(moves.js)이 직접 위치를 잡는 중
      try { rockStep(f); spikeStep(f); } catch (e) { console.error(e); }
      const res = residual(f); if (res > ST.maxPen) ST.maxPen = res;
      f._cy = f.pos.y;
    }
    return r;
  };
  window.COLLIDE = { ROCKS, ST, reset() { ST.maxPen = 0; ST.maxPenRaw = 0; ST.impacts = 0; ST.lands = 0; ST.pushes = 0; ST.spikePush = 0; } };
})();
