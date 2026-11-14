// aerial.js — 공중전 감독(11-14 소유자 지시: 아이언맨·비전·토르 같은 비행 인물, 블리치 '순보', 진격 입체기동이 실제 만화·영화처럼 공중에서 싸우게.
//   "공중전은 단순히 공중에서 부딪히고 마는 게 아니라 그 나름의 박진감 있는 전투여야 한다")
// 기존 교전 줄(lanes·step) 인프라에 '공중 연출 줄'을 넣는다 → 판정(resolve)·피격·교대와 충돌 없음.
//  ① 공중 추격·교차 돌진(DOGFIGHT): 둘 다 공중 가능 → 함께 급상승, 서로 맞물려 선회(밴킹) → 2~3회 교차 충돌(섬광·충격파·집중선)
//     → 마지막 교차의 승자가 상대를 땅으로 내리꽂음(급강하 + 착지 폭발)
//  ② 기총소사 → 급강하(STRAFE): 비행 인물 vs 지상 → 고도를 잡고 크게 선회하며 리펄서/광선 연사 → 하늘에서 내리꽂는 일격
//  ③ 순보 난격(SHUNPO BLITZ, 블리치): 사라졌다 나타나기 3~4회(잔상·영자 파문) — 등 뒤·옆·머리 위에서 베고, 공중에 선 채 내리베기로 마무리
//  ④ 공중 질주(SKY RUN, 블리치): 영자 발판을 밟으며 허공을 계단처럼 달려 올라간 뒤 낙하 참격
//  공중 정지는 flight.js 가 f._airUntil·f._airH 를 보고 유지, 급강하는 f._diveUntil 동안 호버 해제(중력 + 큰 하강 속도).
(function () {
  if (typeof F === 'undefined' || typeof step !== 'function' || typeof lanes === 'undefined' || typeof resolve !== 'function') return;
  const AE = window.AERIAL = { on: true, st: { dog: 0, strafe: 0, blitz: 0, skyrun: 0, cross: 0 } };
  const R2 = (a, b) => a + Math.random() * (b - a), now = () => performance.now();
  const A = () => window.ANIME_FX, S = () => window.SFX_IMPACT, X = () => window.FX3;
  const COL = { ironman: '#8ae8ff', vision: '#ffd84a', thor: '#bfe0ff', ichigo: '#9fd8ff', byakuya: '#ffb0d0', rukia: '#e8faff', hitsugaya: '#bfe8ff', kenpachi: '#ffe070', aizen: '#c8a0ff', default: '#e8f0ff' };
  const colOf = f => new THREE.Color(COL[f.ch.key] || COL.default);
  const flyer = f => !!(f.ch && f.ch.sig && f.ch.sig.fly);
  const shunpo = f => !!(f.ch && (f.ch.world === 'bleach' || /^(ichigo|byakuya|rukia|hitsugaya|kenpachi|aizen|urahara|yoruichi)$/.test(f.ch.key)));
  const odm = f => !!(f.ch && f.ch.world === 'aot' && f.ch.sig && f.ch.sig.kind === 'getsuga');
  const airCap = f => flyer(f) || shunpo(f) || odm(f);
  const alive = o => { if (!o || o.down || o.dead || o.away) return false; const r = window.HP && HP.of ? HP.of(o) : null; return !r || !r.max || r.hp > 0; };
  const busyLane = f => lanes.some(L => L.aerial && L.fs && L.fs.includes(f) && L.q && L.q.length); // 평소 교전 줄은 늘 두 선수를 포함 → 공중 연출 줄만 중복 검사
  const free = f => alive(f) && !f.arc && !(f.stun > 0) && !(f.lock > 0) && !(window.PHYS && PHYS.flights && PHYS.flights.has(f)) && (f.scale || 1) < 1.6 && !busyLane(f);
  const ekOf = f => (f.ch && f.ch.sig && f.ch.sig.elem) || 'metal';
  const airHold = (f, h, sec) => { f._airUntil = now() + sec * 1000; f._airH = h; };
  const dive = (f, sec = .7) => { f._diveUntil = now() + sec * 1000; f._airUntil = 0; f.vel.y = -260; f.air = true; };
  const chestP = f => (typeof chest === 'function' ? chest(f) : f.pos.clone().add(V3(0, 10, 0)));
  const ring = (p, c, r, ground) => { try { A() && A().ring(p, c, r, .4, !!ground); } catch (e) { } };
  const trail = (f, c, n = 6) => { const x = X(); if (!x || !x.streak) return; const v = f.vel.clone(); if (v.lengthSq() < 1) return; const back = v.normalize().multiplyScalar(-1); for (let i = 0; i < n; i++) x.streak(chestP(f).addScaledVector(back, R2(1, 4)), back.clone().multiplyScalar(R2(160, 300)), R2(.15, .28), R2(.6, 1.2), R2(1.2, 2.2), '#' + colOf(f).getHexString()); };
  const swish = p => { try { window.SFX && SFX.play && SFX.play('swishBig', p, { gain: .8 }); } catch (e) { } };
  const vanishFx = (f, c) => { const x = X(), p = chestP(f); if (x && x.emit) for (let i = 0; i < 14; i++) x.emit(p.clone().add(V3(R2(-3, 3), R2(-6, 6), R2(-3, 3))), V3(R2(-40, 40), R2(-10, 30), R2(-40, 40)), R2(.2, .4), R2(1, 2), 5, '#' + c.getHexString(), 0); ring(p, c, 7); swish(p); };
  const hitFx = (p, c, big) => { try { const a = A(); if (a) { a.star(p, c, big ? 26 : 16, .26); a.ring(p, c, big ? 22 : 12, .4); if (big) a.speedLines(p, c, .45, .9); } } catch (e) { } };
  const pos3 = (x, y, z) => V3(x, y, z);
  const aroundOf = (c, r, a, y) => pos3(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r);
  const queue = (fs, q) => { lanes.push({ fs, q, t: 0, tactic: true, aerial: true }); };

  // ① 공중 추격·교차 돌진
  function dogfight(a, b) { AE.st.dog++;
    const c0 = a.pos.clone().add(b.pos).multiplyScalar(.5), H = R2(42, 64), sgn = Math.random() < .5 ? 1 : -1, ca = colOf(a), cb = colOf(b);
    const q = [];
    // 1) 함께 급상승 — 서로를 노려보며 반대편으로 갈라짐
    q.push(step(.55, [[a, { pose: 'flipAir', face: b, to: () => aroundOf(c0, 46, sgn * .6, 0), vy: 230, tilt: sgn * .9, ghost: 1 }], [b, { pose: 'flipAir', face: a, to: () => aroundOf(c0, 46, Math.PI + sgn * .6, 0), vy: 230, tilt: -sgn * .9, ghost: 1 }]],
      () => { airHold(a, H, 6); airHold(b, H + R2(-6, 6), 6); trail(a, ca, 10); trail(b, cb, 10); try { S() && S().riser(c0, .6); } catch (e) { } }));
    // 2) 맞물린 선회(서로 반대 방향, 밴킹)
    for (let k = 0; k < 2; k++) { const ang = sgn * (1.6 + k * 1.4);
      q.push(step(.42, [[a, { pose: 'flipAir', face: b, to: () => aroundOf(c0, 52, ang, 0), tilt: sgn * 1.1, ghost: 1 }], [b, { pose: 'flipAir', face: a, to: () => aroundOf(c0, 52, ang + Math.PI, 0), tilt: -sgn * 1.1, ghost: 1 }]],
        () => { airHold(a, H + R2(-10, 10), 4); airHold(b, H + R2(-10, 10), 4); trail(a, ca, 6); trail(b, cb, 6); })); }
    // 3) 교차 돌진 2~3회: 중앙에서 정면충돌 → 서로 지나쳐 반대편으로
    const passes = 2 + (Math.random() < .5 ? 1 : 0);
    for (let k = 0; k < passes; k++) { const ang = sgn * (4.4 + k * 1.9), last = k === passes - 1;
      q.push(step(.26, [[a, { pose: 'punch', face: b, to: () => pos3(c0.x, 0, c0.z), ghost: 1, aura: 1, elem: ekOf(a) }], [b, { pose: 'punch', face: a, to: () => pos3(c0.x, 0, c0.z), ghost: 1, aura: 1, elem: ekOf(b) }]],
        () => { AE.st.cross++; const m = chestP(a).add(chestP(b)).multiplyScalar(.5); try { clash(a, b, last ? '공중 격돌!' : '', true); } catch (e) { } hitFx(m, new THREE.Color('#ffffff'), true); if (typeof shake !== 'undefined') shake = Math.max(shake, 6); }));
      if (!last) q.push(step(.3, [[a, { pose: 'flipAir', face: b, to: () => aroundOf(c0, 44, ang, 0), tilt: -sgn, ghost: 1 }], [b, { pose: 'flipAir', face: a, to: () => aroundOf(c0, 44, ang + Math.PI, 0), tilt: sgn, ghost: 1 }]], () => { trail(a, ca, 5); trail(b, cb, 5); }));
    }
    // 4) 승자가 내리꽂기: 위로 솟구쳐 상대 머리 위 → 급강하 일격 → 착지 폭발
    const win = Math.random() < .5 ? a : b, lose = win === a ? b : a, cw = colOf(win);
    q.push(step(.28, [[win, { pose: 'flipAir', face: lose, to: () => pos3(lose.pos.x, 0, lose.pos.z), vy: 120, spin: 9, ghost: 1 }], [lose, { pose: 'hurt', face: win }]], () => { airHold(win, (lose.pos.y || 20) + 22, 1.2); }));
    q.push(step(.5, [[win, { pose: 'seriousPunch', face: lose, to: () => pos3(lose.pos.x, 0, lose.pos.z), aura: 1, elem: ekOf(win) }], [lose, { pose: 'hurt', face: win }]],
      () => { try { resolve(win, lose, ekOf(win), 'hit', '공중 추락격!', 1.9); } catch (e) { } hitFx(chestP(lose), cw, true); dive(lose, 1.1); airHold(win, 30, 1.2);
        pending.push({ t: .55, fn: () => { const g = pos3(lose.pos.x, 0, lose.pos.z); try { explode(g, ekOf(win), 1.6); } catch (e) { } ring(g, cw, 30, true); if (typeof shake !== 'undefined') shake = Math.max(shake, 9); } }); }));
    queue([a, b], q); a._aeAt = b._aeAt = now() + R2(7000, 10000);
  }
  // ② 기총소사 → 급강하
  function strafe(f, b) { AE.st.strafe++;
    const c = colOf(f), H = R2(36, 56), sgn = Math.random() < .5 ? 1 : -1, base = Math.atan2(f.pos.z - b.pos.z, f.pos.x - b.pos.x), R0 = R2(55, 75);
    const kind = f.ch.key === 'vision' ? '마인드 스톤 광선' : f.ch.key === 'thor' ? '번개 낙뢰' : '리펄서';
    const q = [step(.5, [[f, { pose: 'flipAir', face: b, to: () => aroundOf(b.pos, R0, base + sgn * .7, 0), vy: 220, tilt: sgn * 1.0, ghost: 1 }]], () => { airHold(f, H, 5); trail(f, c, 10); })];
    const shots = 3 + (Math.random() < .5 ? 2 : 0);
    for (let i = 0; i < shots; i++) { const ang = base + sgn * (1.0 + i * .55);
      q.push(step(.24, [[f, { pose: 'point', face: b, to: () => aroundOf(b.pos, R0, ang, 0), tilt: sgn * 1.2, ghost: 1, aura: 1, elem: ekOf(f) }]],
        () => { airHold(f, H + R2(-6, 6), 3); trail(f, c, 4); try { proj(f, b, f.ch.key === 'thor' ? 'BOLT' : 'BEAM', 'hit', { c: '#' + c.getHexString(), ek: ekOf(f), nm: kind, v: 520, size: 1.2, homing: .8 }); } catch (e) { }
          try { A() && A().star(chestP(f).addScaledVector(fwdOf(f), 3), c, 10, .14); } catch (e) { } }));
    }
    q.push(step(.32, [[f, { pose: 'flipAir', face: b, to: () => pos3(b.pos.x, 0, b.pos.z), vy: 160, spin: 7 * sgn, ghost: 1 }]], () => { airHold(f, H + 18, 1); try { S() && S().riser(chestP(f), .4); } catch (e) { } }));
    q.push(step(.42, [[f, { pose: 'seriousPunch', face: b, to: () => pos3(b.pos.x, 0, b.pos.z), aura: 1, elem: ekOf(f) }], [b, { pose: 'guard', face: f }]],
      () => { dive(f, .5); try { resolve(f, b, ekOf(f), 'hit', f.ch.key === 'ironman' ? '스러스터 다이브 펀치!' : f.ch.key === 'thor' ? '묠니르 강하!' : '고밀도 강하!', 1.7); } catch (e) { }
        hitFx(chestP(b), c, true); const g = pos3(b.pos.x, 0, b.pos.z); try { explode(g, ekOf(f), 1.4); } catch (e) { } ring(g, c, 26, true); if (typeof shake !== 'undefined') shake = Math.max(shake, 8); }));
    queue([f], q); f._aeAt = now() + R2(6000, 9000);
  }
  // ③ 순보 난격
  function blitz(f, b) { AE.st.blitz++;
    const c = colOf(f), n = 3 + (Math.random() < .5 ? 1 : 0), q = [];
    for (let i = 0; i < n; i++) { const ang = Math.random() * Math.PI * 2, up = i === n - 1 ? 26 : R2(4, 18), side = R2(8, 12);
      // 사라짐(초고속 이동) → 등 뒤·옆·위에 나타남
      q.push(step(.07, [[f, { pose: 'crouchRun', face: b, to: () => aroundOf(b.pos, side, ang, 0), ghost: 1 }]], () => { vanishFx(f, c); airHold(f, (b.pos.y || 0) + up, .9); f.pos.y = Math.max(f.pos.y, (b.pos.y || 0) + up * .8); }));
      q.push(step(.2, [[f, { pose: i & 1 ? 'spreadSlash' : 'slash', face: b, aura: 1, elem: ekOf(f) }], [b, { pose: 'hurt', face: f }]],
        () => { ring(pos3(f.pos.x, f.pos.y + .5, f.pos.z), c, 6, false); try { resolve(f, b, ekOf(f), 'hit', i === n - 1 ? '순보 · 낙하참!' : '순보', i === n - 1 ? 1.6 : .7); } catch (e) { }
          try { A() && A().slash(chestP(b), b.pos.clone().sub(f.pos), c, i === n - 1 ? 20 : 13, .32, 1.3); } catch (e) { } if (i === n - 1) { hitFx(chestP(b), c, true); dive(f, .4); } }));
    }
    queue([f], q); f._aeAt = now() + R2(5500, 8000);
  }
  // ④ 공중 질주(영자 발판)
  function skyRun(f, b) { AE.st.skyrun++;
    const c = colOf(f), q = [], dx = b.pos.x - f.pos.x, dz = b.pos.z - f.pos.z, L = Math.max(1, Math.hypot(dx, dz)), ux = dx / L, uz = dz / L, sgn = Math.random() < .5 ? 1 : -1;
    for (let i = 1; i <= 4; i++) { const h = 10 + i * 9, px = f.pos.x + ux * L * .18 * i - uz * sgn * 10 * Math.sin(i), pz = f.pos.z + uz * L * .18 * i + ux * sgn * 10 * Math.sin(i);
      q.push(step(.16, [[f, { pose: 'crouchRun', face: b, to: () => pos3(px, 0, pz), vy: 90, ghost: 1 }]],
        () => { airHold(f, h, .8); ring(pos3(f.pos.x, Math.max(1, f.pos.y), f.pos.z), c, 5, false); try { window.SFX && SFX.play && SFX.play('step', f.pos, { gain: .7, rate: 1.3 }); } catch (e) { } trail(f, c, 3); })); }
    q.push(step(.3, [[f, { pose: 'swordDown', face: b, to: () => pos3(b.pos.x, 0, b.pos.z), aura: 1, elem: ekOf(f), spin: 6 * sgn }], [b, { pose: 'guard', face: f }]],
      () => { dive(f, .45); try { resolve(f, b, ekOf(f), 'hit', '공중 질주 · 강하참!', 1.5); } catch (e) { } try { A() && A().slash(chestP(b), V3(ux, 0, uz), c, 22, .36, 1.4); } catch (e) { } hitFx(chestP(b), c, true); }));
    queue([f], q); f._aeAt = now() + R2(6000, 9000);
  }

  // ── 감독: 조건 맞는 쌍에 공중 연출을 가끔(과하지 않게) ──
  let fr = 0;
  (function loop() {
    fr++;
    try {
      if (AE.on && (fr % 10) === 0 && (typeof ftAvg === 'undefined' || ftAvg < 24) && (typeof getQuality !== 'function' || getQuality() !== 'low') && F.length >= 2) {
        const t = now();
        for (const f of F) {
          if (!airCap(f) || !free(f) || (f._aeAt && t < f._aeAt)) continue;
          const b = others(f).find(o => alive(o) && o.team !== f.team && o.pos.distanceTo(f.pos) < 220); if (!b) continue;
          if (!f._aeAt) { f._aeAt = t + R2(1500, 3500); continue; } // 첫 연출은 잠깐 뒤
          const r = Math.random();
          if (airCap(b) && free(b) && !(b._aeAt && t < b._aeAt - 3000) && r < .55) dogfight(f, b);
          else if (flyer(f)) strafe(f, b);
          else if (shunpo(f)) (r < .5 ? blitz : skyRun)(f, b);
          else { f._aeAt = t + 4000; continue; } // 입체기동은 aot-odm.js 가 기동 담당(공중전 대상이면 교차 돌진만)
          break; // 한 번에 하나
        }
      }
    } catch (e) { console.warn('[aerial]', e); }
    requestAnimationFrame(loop);
  })();
})();
