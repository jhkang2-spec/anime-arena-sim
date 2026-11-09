// 진격의거인 입체기동 고도화(11-09, 소유자 주문: "그냥 떠 있지 말고 날아다니고 선회하고 빠르고 박진감 있게"):
//  - 게스(인간)는 Idle 중에만 스스로 기동: 측면 급선회 → 와이어 앵커 → 위에서 다이빙 진입(스핀 슬래시 준비) — 밴킹(tilt)·가스 분사·와이어 포함
//  - 기존 step/pendings/tilt/spin 인프라만 사용 → 전투 판정·피격과 충돌 없음, 프레임 비용 무시 수준
(function () {
  if (typeof F === 'undefined' || typeof step !== 'function' || typeof pending === 'undefined' || !window.NEWWORLD) return;
  const O = window.ODM = { on: true, st: { man: 0, dives: 0 } };
  O.maneuverFor = (f, foe) => { if (isGetsu(f) && F.includes(f) && F.includes(foe)) maneuver(f, foe); };
  const isGetsu = f => f.ch && f.ch.world === 'aot' && f.ch.sig && f.ch.sig.kind === 'getsuga';
  const alive = o => { if (o.down || o.dead) return false; const r = window.HP && HP.of ? HP.of(o) : null; return !r || !r.max || r.hp > 0; };
  const free = f => !f.down && !f.arc && !f.away && !(f.stun > 0) && !f.lock && !(window.PHYS && PHYS.flights && PHYS.flights.has(f)) && (f.scale || 1) < 1.5 && !(f.mode > 0 && (f.titan || f.modeElem === 'titan'));
  const gas = (f, n, c) => { const budget = (typeof ftAvg === 'undefined' || ftAvg < 21) ? n : (n >> 1); for (let i = 0; i < budget; i++) parts.push({ p: f.pos.clone().add(V3(R(-1.8, 1.8), R(1.5, 8), R(-1.8, 1.8))), v: V3(R(-16, 16), R(-50, 6), R(-16, 16)), life: .5, c: c || '#e8eef6', g: 20, s: R(1.4, 2.8) }); };
  function maneuver(f, foe) {
    O.st.man++; O.st.wire = O.st.wire || 0;
    const sgn = Math.random() < .5 ? 1 : -1, d = fwdOf(foe);
    const dist = Math.hypot(foe.pos.x - f.pos.x, foe.pos.z - f.pos.z);
    const side = dist > 60 ? R(30, 55) : R(18, 30); // 멀면 큰弧으로 접근, 가까우면 주변 급선회
    const F1 = V3(foe.pos.x + d.z * side * sgn + (f.pos.x - foe.pos.x) * Math.min(.55, 30 / Math.max(1, dist)), 0,
      foe.pos.z - d.x * side * sgn + (f.pos.z - foe.pos.z) * Math.min(.55, 30 / Math.max(1, dist))); // 적 측면 경유점(멀면 중간 지점附近)
    const D1 = V3(foe.pos.x + d.z * (side * .3) * sgn - d.x * 6, 0, foe.pos.z - d.x * (side * .3) * sgn - d.z * 6); // 적 사거리 바로 밖(다이빙 도착점)
    const tilt = sgn * R(.7, 1.25), d1 = Math.min(.85, Math.max(.4, Math.hypot(F1.x - f.pos.x, F1.z - f.pos.z) / 260));
    // 교전 간섭 없이 혼자 flying 하려면 교전 줄(lanes)에 직접 넣어 실행시켜야 한다(스킬처럼 소비됨)
    const q = [
      // 1) 급상승 선회 접근 — 밴킹 + 가스 + 와이어를 높은 지점에 앵커
      step(d1, [[f, { pose: 'flipAir', face: foe, to: () => F1, vy: R(140, 230), tilt, ghost: 1 }]],
        () => { O.st.wire++; try { NW.wire(f, V3(F1.x + R(-8, 8), R(44, 80), F1.z + R(-8, 8))); } catch (e) { } gas(f, 12); }),
      // 2) 반대 밴킹으로 돌아 위·대각에서 다이빙(스핀 슬래시) — 도착 직후 AI가 근접 기술 채팅
      step(.34, [[f, { pose: 'flipAir', face: foe, to: () => D1, vy: R(-70, 50), spin: R(7, 13) * sgn, tilt: -tilt * .8, ghost: 1 }], [foe, { pose: 'stance', face: f }]],
        () => { O.st.wire++; O.st.dives++; try { NW.wire(f, chest(foe).add(V3(R(-12, 12), R(26, 46), R(-12, 12)))); } catch (e) { } gas(f, 9, '#dfe8f2'); shake = Math.max(shake, 1.5); }),
    ];
    lanes.push({ fs: [f], q, t: 0, tactic: true }); // tactic: tactics.js 재계획 간섭(교체·난입)로부터 이 비행 줄 보호
    f._odmAt = performance.now() / 1000 + R(2.2, 3.6);
  }
  let fr = 0;
  (function loop() {
    if (O.on) {
      fr++;
      const t = performance.now() / 1000;
      if ((fr & 3) === 0 && (typeof ftAvg === 'undefined' || ftAvg < 23)) { // 무거운 프레임엔 기동 빈도 자동 완급
        const live = F.filter(f => isGetsu(f) && free(f));
        if (live.length && typeof getQuality === 'function' && getQuality() !== 'low') {
          for (const f of live) {
            const tg = others(f).find(o => alive(o) && o.pos.distanceTo(f.pos) < 200); // HP는 HP.of(f) 레지스트리 관리 — f.hp 필드 없음(오래된 관측 코드 was o.hp>0이 항상 false라 기동 불발)
            if (!tg) continue;
            if (!f._odmAt || t > f._odmAt) { maneuver(f, tg); break; } // 한 프레임에 하나씩(급하지 않게)
          }
        }
      }
    }
    requestAnimationFrame(loop);
  })();
})();
