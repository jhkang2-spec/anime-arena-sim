// 동작·검술·지형 — 실제 검(손잡이·날밑·날, 두 손 쥠·날 방향), 다양한 몸놀림, 도약·발판, 교전 경우의 수
// arena.js 위에 덧씌우는 파일. arena.js 의 전역 함수(plan·apply·poseModel·update·setChar·soloLane)를 감싸서 쓴다.
(function () {
  if (typeof POSE === 'undefined' || typeof plan !== 'function') return; // arena.js 가 안 떴으면 조용히 빠짐

  // ═══ 1. 검 모양 ═══
  const MATC = {};
  const mt = (c, basic) => MATC[c + (basic ? 'b' : '')] || (MATC[c + (basic ? 'b' : '')] = basic ? new THREE.MeshBasicMaterial({ color: c }) : toon(c));
  const GEOC = {};
  // 날: 등은 휘고(반) 끝은 뾰족(칼끝). 날(자르는 쪽)은 +x, 칼은 +y 로 뻗는다
  function bladeGeo(L, W, curve, wave, jag) {
    const key = [L, W, curve, wave, jag].join('|'); if (GEOC[key]) return GEOC[key];
    const N = 10, off = y => -curve * Math.pow(y / L, 2) * 2 + (wave ? Math.sin(y / L * PI * 5) * wave : 0), s = new THREE.Shape();
    s.moveTo(W / 2 + off(0), 0);
    for (let i = 1; i <= N; i++) { const y = L * i / N * .92, j = jag && i % 2 ? -jag * W * 2 : 0; s.lineTo(W / 2 + off(y) + j, y); }
    s.lineTo(off(L) - W * .15, L + W * .7); // 칼끝
    for (let i = N; i >= 0; i--) { const y = L * i / N * .92; s.lineTo(-W / 2 + off(y), y); }
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.08, W * .16), bevelEnabled: false }); g.translate(0, 0, -Math.max(.08, W * .16) / 2);
    return GEOC[key] = g;
  }
  const boxG = (w, h, d) => { const k = 'b' + [w, h, d].join('|'); return GEOC[k] || (GEOC[k] = new THREE.BoxGeometry(w, h, d)); };
  const guardG = (r) => { const k = 'g' + r; if (!GEOC[k]) { GEOC[k] = new THREE.CylinderGeometry(r, r, .28, 8); } return GEOC[k]; };
  function makeSword(sp) {
    const g = new THREE.Group(); g.position.set(0, -6.95, 0);
    if (sp.axe) { // 히메지마: 긴 자루 도끼
      const h = new THREE.Mesh(boxG(.5, 12, .5), mt(sp.h)); h.position.y = 3; g.add(h);
      const hd = new THREE.Mesh(boxG(3.4, 3, .35), mt(sp.c)); hd.position.set(1.6, 8, 0); g.add(hd);
      return g;
    }
    const Lh = sp.cleaver ? 4.5 : 5;
    const h = new THREE.Mesh(boxG(.62, Lh, .62), mt(sp.h)); h.position.y = 1 - Lh / 2; g.add(h); // 손잡이(앞손은 날밑 바로 아래, 뒷손은 끝)
    if (sp.g) { const gd = new THREE.Mesh(guardG(sp.cleaver ? 1.4 : 1.05), mt(sp.g)); gd.position.y = 1.15; g.add(gd); } // 날밑
    const bl = new THREE.Mesh(bladeGeo(sp.L, sp.W, sp.curve || 0, sp.wave || 0, sp.jag || 0), sp.glow ? mt(sp.c, true) : mt(sp.c)); bl.position.y = 1.3; g.add(bl);
    return g;
  }
  const SWD = {
    zoro: { L: 14, W: .75, curve: .6, c: '#e8eef8', h: '#f4f4f8', g: '#c8a040', dual: { c: '#e8eef8', h: '#8a1a1a', g: '#c8a040' } },
    ichigo: { L: 18, W: 2.6, c: '#d8dde8', h: '#1a1a1a', cleaver: true },
    byakuya: { L: 14, W: .7, curve: .5, c: '#e8eef8', h: '#2a2a3a', g: '#c8c8d0' },
    rukia: { L: 13, W: .65, curve: .3, c: '#ffffff', h: '#f4f4f8', g: '#f4f4f8' },
    hitsugaya: { L: 15, W: .7, curve: .5, c: '#e0f4ff', h: '#2a8a6a', g: '#c8a040' },
    kenpachi: { L: 16, W: .8, curve: .4, jag: .18, c: '#b8bcc8', h: '#3a3a40', g: '#5a5a60' },
    aizen: { L: 14, W: .7, curve: .5, c: '#e8eef8', h: '#4a3a6a', g: '#c8a040' },
    sasuke: { L: 13, W: .6, c: '#d8dde8', h: '#3a3a4a' },
    kizaru: { L: 15, W: .7, c: '#fff080', h: '#fff080', glow: true, only: 'light' },
    law: { L: 20, W: .75, curve: .6, c: '#e8eef8', h: '#1a1a1a', g: '#c8a040' },
    tanjiro: { L: 13.5, W: .72, curve: .5, c: '#1c1c22', h: '#2a2a30', g: '#141414' },
    zenitsu: { L: 13.5, W: .7, curve: .5, c: '#f8e060', h: '#f4f4f8', g: '#c8a040' },
    inosuke: { L: 12, W: .8, curve: .2, jag: .3, c: '#b0b4c0', h: '#4a5a6a', dual: {} },
    giyu: { L: 14, W: .7, curve: .5, c: '#4a7ad0', h: '#2a2a3a', g: '#c8a040' },
    rengoku: { L: 14, W: .75, curve: .5, c: '#ff6a20', h: '#8a1a1a', g: '#ffb040' },
    shinobu: { L: 11, W: .28, c: '#c890ff', h: '#2a2a3a', g: '#c890ff' },
    uzui: { L: 11, W: 2.2, c: '#c8ccd8', h: '#c8a040', cleaver: true, dual: {} },
    mitsuri: { L: 24, W: .35, wave: .9, c: '#ff90c0', h: '#f4f4f8', g: '#9ad070' },
    muichiro: { L: 14, W: .7, curve: .5, c: '#9af0e0', h: '#2a2a3a', g: '#c8a040' },
    sanemi: { L: 14, W: .75, curve: .5, c: '#3ac080', h: '#f4f4f8', g: '#c8a040' },
    obanai: { L: 14, W: .6, curve: .2, wave: .35, c: '#b090ff', h: '#2a2a3a', g: '#c8a040' },
    himejima: { axe: true, c: '#8a8a96', h: '#5a4a3a' },
  };
  Object.entries(SWD).forEach(([k, sp]) => { const c = CH[k]; if (!c || !c.model) return; const m = c.model;
    m.swd = { sp, grp: makeSword(sp) }; m.aF.fore.add(m.swd.grp);
    if (sp.dual) { m.swd.grp2 = makeSword({ ...sp, ...sp.dual, dual: null }); m.aB.fore.add(m.swd.grp2); } });

  // ═══ 2. 검술 자세 (sw = 날의 방향: 0 위, -π/2 앞, + 뒤 / gy = 두 손을 몸 가운데로 모으는 정도) ═══
  const K = (o) => mkP({ armX: 0, spread: .16, ...o });
  Object.assign(POSE, {
    k_chudan: K({ arm: .55, fore: 1.25, barm: .6, bfore: 1.2, leg: .6, lean: 2, bob: 4, twist: -.25, sw: -1.05, gy: .42 }), // 중단: 칼끝이 상대 목
    k_hasso: K({ arm: .35, fore: 2.75, barm: .55, bfore: 2.6, leg: .6, lean: 1, bob: 4, twist: -.45, sw: .35, gy: .35 }), // 팔상: 오른 어깨 위로 세움
    k_jodan: K({ arm: 2.75, fore: 3.05, barm: 2.7, bfore: 3.0, leg: .55, lean: -1, bob: 2, twist: -.2, sw: 1.15, gy: .25 }), // 상단: 머리 위
    k_waki: K({ arm: -.35, fore: .25, barm: -.2, bfore: .35, leg: .7, lean: 3, bob: 6, twist: -.7, sw: 2.3, gy: .3 }), // 협단: 칼을 뒤로 감춤
    k_kesa: K({ arm: .75, fore: .95, barm: .8, bfore: 1.0, leg: .85, lean: 6, bob: 5, twist: .55, sw: -2.2, gy: .4 }), // 가사베기 끝(아래로 흘림)
    k_upCut: K({ arm: 1.9, fore: 2.4, barm: 1.7, bfore: 2.2, leg: .7, lean: 2, bob: 3, twist: .4, sw: -.55, gy: .4 }), // 올려베기
    k_yoko: K({ arm: 1.45, fore: 1.5, barm: 1.3, bfore: 1.45, leg: .8, lean: 5, bob: 4, twist: .75, sw: -1.57, gy: .45 }), // 가로베기
    k_tsuki: K({ arm: 1.4, fore: 1.55, barm: 1.25, bfore: 1.45, leg: .95, lean: 7, bob: 5, twist: .15, spread: .12, sw: -1.57, gy: .5 }), // 찌르기
    k_iaiReady: K({ arm: .15, fore: 1.4, barm: .35, bfore: 1.9, leg: .8, lean: 5, bob: 7, twist: -.6, spread: .2, armX: .1, sw: 2.5, gy: .55 }), // 발도 준비(칼은 허리에)
    k_iaiCut: K({ arm: 1.75, fore: 1.7, barm: -.4, bfore: .3, leg: .95, lean: 6, bob: 5, twist: .8, spread: .2, armX: .25, sw: -1.35, gy: 0 }), // 발도 일섬(한 손)
    k_bind: K({ arm: .95, fore: 2.05, barm: .95, bfore: 2.0, leg: .8, lean: 6, bob: 4, twist: -.1, spread: .18, sw: -.35, gy: .45 }), // 츠바제리아이(날밑 맞대기)
    k_uke: K({ arm: 2.3, fore: 2.6, barm: 2.2, bfore: 2.5, leg: .6, lean: -2, bob: 4, twist: -.2, sw: -1.57, gy: .3 }), // 머리 위 받아막기(칼을 가로로)
    k_run: K({ arm: .2, fore: .9, barm: .3, bfore: 1.6, leg: .6, lean: 6, bob: 2, twist: -.1, sw: 2.0, gy: 0 }), // 칼 들고 달리기
    k_lowRun: K({ arm: -.6, fore: -.2, barm: 1.0, bfore: 1.9, leg: .7, lean: 8, bob: 6, twist: -.25, sw: 2.6, gy: 0 }), // 낮게 칼 끌며 질주
    k_dual: K({ arm: 1.1, fore: 2.4, barm: 1.1, bfore: 2.4, leg: .6, lean: 2, bob: 4, twist: 0, sw: .2, sw2: .2, gy: .15 }), // 쌍검 교차
    k_dualOpen: K({ arm: 1.4, fore: 1.5, barm: 1.3, bfore: 1.4, leg: .9, lean: 5, bob: 5, twist: .1, armX: .9, sw: -1.57, sw2: -1.57, gy: -.2 }), // 쌍검 벌려베기
  });
  // 맨손 몸놀림
  Object.assign(POSE, {
    sidestep: mkP({ arm: .6, fore: 2.1, barm: .4, bfore: 1.8, leg: .75, lean: 1, bob: 5, twist: -.5, spread: .35, armX: .3 }),
    backstep: mkP({ arm: .9, fore: 2.4, barm: .6, bfore: 2.2, leg: .5, lean: -5, bob: 4, twist: -.2, spread: .2 }),
    roll: mkP({ arm: 1.2, fore: 2.8, barm: 1.2, bfore: 2.8, leg: .9, lean: 8, bob: 12, twist: 0, spread: .1 }),
    crouchDodge: mkP({ arm: 1.0, fore: 2.6, barm: .7, bfore: 2.4, leg: 1.0, lean: 6, bob: 11, twist: -.4, spread: .3 }),
    feint: mkP({ arm: 1.2, fore: 1.6, barm: .3, bfore: 1.8, leg: .6, lean: 3, bob: 3, twist: .3 }),
    shoulder: mkP({ arm: .3, fore: 1.8, barm: .2, bfore: 1.6, leg: .9, lean: 9, bob: 5, twist: -.9, spread: .15 }),
    sweep: mkP({ arm: .9, fore: 1.6, barm: -.5, bfore: .6, leg: 1.1, kick: 1.3, lean: -2, bob: 12, twist: .9, spread: .4 }),
    uppercut: mkP({ arm: 2.6, fore: 2.9, barm: .3, bfore: 1.8, leg: .8, lean: 2, bob: 1, twist: .8, spread: .15 }),
    elbow: mkP({ arm: 1.5, fore: 3.0, barm: .2, bfore: 1.6, leg: .8, lean: 5, bob: 3, twist: .9, spread: .15 }),
    jumpKnee: mkP({ arm: 2.2, fore: 2.9, barm: -.6, bfore: .3, leg: .3, kick: 1.9, lean: 3, bob: 0, twist: .2 }),
    landRec: mkP({ arm: .4, fore: 1.2, barm: .5, bfore: 1.4, leg: 1.0, lean: 7, bob: 10, twist: -.2, spread: .35 }),
    taunt: mkP({ arm: 2.9, fore: 2.0, barm: .2, bfore: 1.0, leg: .4, lean: -2, bob: 0, twist: -.3, spread: .08, armX: .6 }),
    m_high: mkP({ arm: 1.2, fore: 2.9, barm: 1.0, bfore: 2.8, leg: .6, lean: 2, bob: 4, twist: -.4, spread: .2, armX: .1 }), // 높은 가드
    m_low: mkP({ arm: .8, fore: 1.9, barm: .5, bfore: 1.6, leg: .9, lean: 5, bob: 8, twist: -.5, spread: .32, armX: .2 }), // 낮은 자세
    m_open: mkP({ arm: .3, fore: 1.0, barm: .3, bfore: 1.0, leg: .45, lean: 0, bob: 2, twist: -.1, spread: .12, armX: .45 }), // 여유 자세
  });

  // 자세 이름 바꿔 끼우기: 검 쓰는 인물은 같은 기술이라도 진짜 칼 자세로
  const SMAP = { guard: '@st', stance: '@st', swordLevel: 'k_chudan', twoHandSword: 'k_jodan', swordDown: 'k_kesa', iai: 'k_iaiReady', iaiEnd: 'k_iaiCut', spreadSlash: 'k_yoko', slashPrep: '@prep', slash: 'k_kesa', xSwords: 'k_jodan', punch: 'k_kesa', punchL: 'k_upCut', palm: 'k_tsuki', block: 'k_uke', run: 'k_run', crouchRun: 'k_lowRun', hold: 'k_chudan', axe: 'k_kesa', hammerUp: 'k_jodan', hammerDown: 'k_kesa', feint: 'k_tsuki', elbow: 'k_yoko', uppercut: 'k_upCut' };
  const DMAP = { xSwords: 'k_dual', spreadSlash: 'k_dualOpen', guard: 'k_dual', stance: 'k_dual' };
  const swOn = f => { const sp = SWD[f.ch.key]; return sp && (!sp.only || f.elem === sp.only) ? sp : null; };
  const _apply = apply;
  apply = function (f, s, d) {
    _apply(f, s, d);
    const sp = swOn(f);
    if (sp) {
      if (!f.swStyle || Math.random() < .04) f.swStyle = pick(['k_chudan', 'k_chudan', 'k_hasso', 'k_hasso', 'k_waki', 'k_jodan']);
      let k = (sp.dual && DMAP[s.pose]) || SMAP[s.pose];
      if (k === '@st') k = f.swStyle; if (k === '@prep') k = pick(['k_hasso', 'k_jodan']);
      if (k && POSE[k]) f.tgt = POSE[k];
    } else if (s.pose === 'guard' || s.pose === 'stance') {
      if (!f.mStyle || Math.random() < .05) f.mStyle = pick(['guard', 'stance', 'm_high', 'm_low', 'm_open']);
      f.tgt = POSE[f.mStyle] || f.tgt;
    }
  };

  // 칼 방향·두 손 모으기는 매 화면 부드럽게 따라감
  let MV_DT = .016;
  const _poseModel = poseModel;
  poseModel = function (m, g, t) {
    _poseModel(m, g, t);
    if (!g.tgt) return; // 잔상·분신 등
    const o = g.c, tg = g.tgt, k = Math.min(1, MV_DT * 14);
    const gyT = tg.gy || 0; g.gyc = (g.gyc || 0) + (gyT - (g.gyc || 0)) * k;
    m.aF.up.rotation.y = g.gyc; m.aB.up.rotation.y = -g.gyc;
    if (!m.swd) return;
    const sp = m.swd.sp, on = !sp.only || g.elem === sp.only; m.swd.grp.visible = on; if (m.swd.grp2) m.swd.grp2.visible = on;
    if (!on) return;
    const w1 = tg.sw ?? (o.fore - PI / 2); g.swc = g.swc === undefined ? w1 : g.swc + (w1 - g.swc) * k;
    m.swd.grp.rotation.z = g.swc - o.fore;
    if (m.swd.grp2) { const w2 = tg.sw2 ?? tg.sw ?? (o.bfore - PI / 2); g.swc2 = g.swc2 === undefined ? w2 : g.swc2 + (w2 - g.swc2) * k; m.swd.grp2.rotation.z = g.swc2 - o.bfore; }
  };

  // ═══ 3. 도약·발판 (포물선 이동은 이 파일이 위치를 직접 잡는다) ═══
  // 경기장 안 바위 3개 + 무한열차 지붕·기관차·전봇대 꼭대기·철둑
  const rockMat = toon('#5a5048'), rockGeo = new THREE.DodecahedronGeometry(1, 1);
  const ROCKS = [[-88, -40, 15, 12], [86, -50, 19, 11], [10, -100, 12, 14]].map(([x, z, h, r]) => { const m = new THREE.Mesh(rockGeo, rockMat); m.scale.set(r, h, r * .9); m.position.set(x, 0, z); m.rotation.y = R(0, 6); scene3.add(m); return { p: V3(x, h * .93, z), name: '바위' }; });
  const TRAIN = [{ p: V3(20.3, 56.5, -179.8), name: '열차 지붕' }, { p: V3(-71, 56.5, -191), name: '열차 지붕' }, { p: V3(67.9, 52.5, -176), name: '기관차 위' }];
  const POLES = [{ p: V3(-60, 71, -141), name: '전봇대' }, { p: V3(60, 71, -141), name: '전봇대' }];
  const BANK = [{ p: V3(-30, 10.5, -158), name: '철둑' }, { p: V3(40, 10.5, -158), name: '철둑' }];
  const PLAT = [...ROCKS, ...ROCKS, ...TRAIN, ...POLES, ...BANK];

  function arc(f, to, dur, h, o = {}) { f.arc = { from: f.pos.clone(), to: to.clone(), t: 0, dur: Math.max(.15, dur), h, perch: o.perch, hold: o.hold || 2.5, done: o.done }; f.perchAt = null; f.air = true; }
  const landFx = (f, big) => { ring(V3(f.pos.x, .4, f.pos.z), big ? 5 : 3, '#c8b090', true, .8, big ? 2.6 : 1.8); for (let i = 0; i < (big ? 18 : 8); i++) parts.push({ p: f.pos.clone().add(V3(R(-3, 3), 1, R(-3, 3))), v: V3(R(-40, 40), R(10, 40), R(-40, 40)), life: R(.8, 1.3), c: pick(['#7a6248', '#8a7258', '#6a5440']), g: -4, s: 3, n: true }); f.cv = f.cv || {}; f.cv.bob = (f.cv.bob || 0) + (big ? 60 : 30); };
  function moveHook(f, dt) {
    if (f.roll) { const R2 = f.roll; R2.t += dt; const u = Math.min(1, R2.t / R2.dur); f.tilt = f.tiltT = -u * PI * 2 * R2.dir; if (u >= 1) { f.tilt = f.tiltT = 0; f.roll = null; } }
    if (f.arc) {
      const A = f.arc; A.t += dt; const u = Math.min(1, A.t / A.dur);
      f.pos.x = A.from.x + (A.to.x - A.from.x) * u; f.pos.z = A.from.z + (A.to.z - A.from.z) * u;
      f.pos.y = A.from.y + (A.to.y - A.from.y) * u + A.h * 4 * u * (1 - u); f.air = true; f.vel.y = 25; f.kb.set(0, 0, 0);
      if (u >= 1) { f.arc = null; f.pos.copy(A.to); f.vel.set(0, 0, 0);
        if (A.perch) { f.perchAt = A.to.clone(); f.perchT = A.hold; f.air = false; landFx(f, false); }
        else { f.air = A.to.y > .5; if (!f.air) { f.pos.y = 0; landFx(f, A.h > 25); } else f.vel.y = 0; }
        if (A.done) try { A.done(); } catch (e) { console.error(e); } }
      return;
    }
    if (f.perchAt) {
      f.perchT -= dt; f.pos.copy(f.perchAt); f.air = false; f.vel.set(0, 0, 0); f.kb.set(0, 0, 0);
      if (f.perchT <= 0) { const dn = f.perchAt.clone(); dn.y = 0; const r = Math.hypot(dn.x, dn.z); if (r > 95) dn.multiplyScalar(95 / r); dn.x += R(-10, 10); f.perchAt = null; arc(f, dn, .7, 14); }
    }
  }
  const _update = update;
  update = function (dt, t) {
    MV_DT = dt; _update(dt, t);
    F.forEach(f => {
      moveHook(f, dt);
      // 달리다 이따금 가볍게 뛰어오름(도약)
      if (!f.arc && !f.perchAt && !f.air && f.speed > .85 && Math.random() < dt * .35) { const to = f.pos.clone().add(V3(f.vel.x, 0, f.vel.z).multiplyScalar(.32)); to.y = 0; clampArena(to); arc(f, to, .38, R(8, 16)); }
    });
  };
  const _setChar = setChar;
  setChar = function (f, ch) { f.arc = null; f.perchAt = null; f.roll = null; f.swc = undefined; f.swc2 = undefined; f.tilt = f.tiltT = 0; _setChar(f, ch); };

  // ═══ 4. 교전 경우의 수 ═══
  const kd = (a, b) => dirTo(a, b);
  const sep = (a, b, k = 1) => { const d = kd(a, b); a.kb.addScaledVector(d, -170 * k); b.kb.addScaledVector(d, 170 * k); };
  const mid = (a, b) => chest(a).lerp(chest(b), .5);
  const spark = (p, c = '#ffd890', n = 10) => { burst(p, n, ['#ffffff', c, '#ffb040'], 1.4); impact(p, 3); };
  const ATK = f => swOn(f) ? pick(['k_kesa', 'k_yoko', 'k_upCut', 'k_tsuki']) : pick(['punch', 'punchL', 'elbow', 'uppercut', 'kick', 'highKick', 'palm']);
  const raw = (f, pose) => POSE[pose] ? pose : 'punch';

  // 다가가는 방식 여러 가지 (지그재그 · 뛰어들기 · 미끄러져 들어가기 · 속임수 · 구르기 · 천천히 압박)
  function entry(a, b) {
    const dist = a.pos.distanceTo(b.pos); if (dist < 26) return [];
    const v = Math.random(), s = pick([-1, 1]);
    if (v < .2) return [step(R(.18, .3), [[a, { pose: 'sidestep', side: s * R(160, 240), fwd: R(80, 140), face: b }]]), step(R(.18, .3), [[a, { pose: 'sidestep', side: -s * R(160, 240), fwd: R(80, 140), face: b }]]), ...approach(a, b, 12)];
    if (v < .4) return [step(.14, [[a, { pose: 'crouchDodge', face: b }]]), step(.55, [[a, { pose: 'flipAir', face: b }]], () => { const to = near(a, b, 10)(); to.y = 0; arc(a, to, .55, R(22, 38)); })];
    if (v < .55) return [step(.35, [[a, { pose: 'crouchDodge', to: near(a, b, 10), ghost: 1, face: b }]], () => { for (let i = 0; i < 6; i++) pending.push({ t: i * .05, fn: () => landFx(a, false) }); })];
    if (v < .7) return [...approach(a, b, 22), step(.16, [[a, { pose: 'feint', fwd: 140, face: b }], [b, { pose: 'block', face: a }]]), step(.18, [[a, { pose: 'backstep', fwd: -120, face: b }]], () => label(headP(a), '속임수', '#cfe8ff')), step(.2, [[a, { pose: 'run', to: near(a, b, 10), face: b }]])];
    if (v < .82) return [...approach(a, b, 26), step(.42, [[a, { pose: 'roll', to: near(a, b, 9), face: b }]], () => { a.roll = { t: 0, dur: .42, dir: 1 }; })];
    return [step(R(.5, .8), [[a, { pose: 'guard', fwd: 45, side: s * 30, face: b }], [b, { pose: 'guard', fwd: 30, side: -s * 30, face: a }]]), ...approach(a, b, 11)];
  }
  ['melee', 'aoe', 'dash'].forEach(k => { const o = T[k]; if (typeof o !== 'function') return; T[k] = function (a, b, ...r) { const st = o(a, b, ...r); return Math.random() < .55 ? [...entry(a, b), ...st] : st; }; });
  const _basic = basicExchange; basicExchange = function (a, b) { const st = _basic(a, b); return Math.random() < .5 ? [...entry(a, b), ...st] : st; };

  // 피하며 다른 물체 위로 → 위에서 내려다보다 급강하 공격
  function perchDive(a, b) {
    const pl = PLAT.slice().sort((x, y) => x.p.distanceTo(a.pos) - y.p.distanceTo(a.pos))[Math.random() < .6 ? 0 : Math.floor(R(0, PLAT.length))];
    const top = pl.p.clone().add(V3(R(-2, 2), 0, R(-2, 2))), far = top.distanceTo(a.pos), up = Math.max(.6, Math.min(1.3, far / 140)), o = pick(['hit', 'block', 'dodge', 'hit']);
    return [
      step(.18, [[a, { pose: 'crouchDodge', face: b }], [b, { pose: ATK(b), fwd: 120, k: 90, face: a }]], () => { spark(chest(a).add(V3(0, -4, 0)), '#ffffff', 4); }),
      step(up, [[a, { pose: 'flipAir', face: b }], [b, { pose: 'guard', face: a }]], () => { arc(a, top, up, Math.max(18, top.y * .5 + 20), { perch: true, hold: up + 3 }); label(headP(b), '헛침!', '#cfe8ff'); }),
      step(R(.5, 1.1), [[a, { pose: pick(['taunt', 'guard', 'stance']), face: b }], [b, { pose: 'guard', face: a }]], () => { label(top.clone().add(V3(0, 26, 0)), pl.name + ' 위로!', '#ffd84a'); if (Math.random() < .45) proj(a, b, (a.ch.sig && a.ch.sig.kind) || 'orb', pick(['hit', 'block', 'deflect']), { c: ELEM[(a.ch.sig && a.ch.sig.elem) || 'metal'].c, ek: (a.ch.sig && a.ch.sig.elem) || 'metal', size: .9, v: 260, nm: '' }); }),
      step(.2, [[a, { pose: swOn(a) ? 'k_jodan' : 'axe', face: b }], [b, { pose: o === 'dodge' ? 'sidestep' : 'block', face: a }]], () => { const tgt = near(a, b, 6)(); tgt.y = 0; arc(a, tgt, .45, 6, { done: () => { const ek = a.elem || (a.ch.sig && a.ch.sig.elem) || 'metal'; ring(V3(a.pos.x, .4, a.pos.z), 6, ELEM[ek].c, true, 1, 3); resolve(a, b, ek, o, '급강하!', 1.4); } }); }),
      step(.45, [[a, { pose: swOn(a) ? 'k_kesa' : 'hammerDown', face: b }], [b, defSpec(o === 'dodge' ? 'dodge' : 'hit')]]),
      step(.25, [[a, { pose: 'landRec', face: b }], [b, { pose: 'guard', face: a }]])];
  }
  // 둘 다 뛰어올라 공중에서 맞붙음
  function airClash(a, b) {
    const m0 = a.pos.clone().lerp(b.pos, .5), y = R(28, 46), d = kd(a, b), pa = m0.clone().addScaledVector(d, -7), pb = m0.clone().addScaledVector(d, 7); pa.y = pb.y = y;
    const st = [step(.16, [[a, { pose: 'crouchDodge', face: b }], [b, { pose: 'crouchDodge', face: a }]]),
      step(.5, [[a, { pose: 'flipAir', face: b }], [b, { pose: 'flipAir', face: a }]], () => { arc(a, pa, .5, 12, { perch: true, hold: 1.4 }); arc(b, pb, .5, 12, { perch: true, hold: 1.4 }); label(m0.clone().add(V3(0, y + 20, 0)), '공중전!', '#ffffff', { big: true }); })];
    for (let i = 0; i < 3; i++) { const x = i % 2 ? b : a, yv = i % 2 ? a : b; st.push(step(.16, [[x, { pose: pick(['jumpKnee', 'highKick', ATK(x)]), k: 95, face: yv }], [yv, { pose: swOn(yv) ? 'k_uke' : 'block', face: x }]], () => { spark(V3(m0.x, y + 8, m0.z)); if (i === 2) resolve(x, yv, null, pick(['hit', 'block']), '공중 일격!', 1.1); })); }
    st.push(step(.5, [[a, { pose: 'air', face: b }], [b, { pose: 'air', face: a }]], () => { [a, b].forEach((f, j) => { const g = f.pos.clone().addScaledVector(d, j ? 26 : -26); g.y = 0; clampArena(g); f.perchAt = null; arc(f, g, .55, 8); }); }));
    st.push(step(.2, [[a, { pose: 'landRec', face: b }], [b, { pose: 'landRec', face: a }]]));
    return st;
  }
  // 한쪽이 한 걸음씩 밀리다가 → 버텨 반격하거나 무너짐
  function pressBack(a, b) {
    const n = 3 + Math.floor(R(0, 3)), st = [...approach(a, b, 10)];
    for (let i = 0; i < n; i++) st.push(step(R(.13, .2), [[a, { pose: ATK(a), k: 92, fwd: 75, face: b }], [b, { pose: swOn(b) ? 'k_uke' : pick(['block', 'm_high']), fwd: -75, face: a }]], () => { spark(mid(a, b)); b.kb.addScaledVector(kd(a, b), 50); if (i === 0) label(headP(b), '밀린다!', '#ffb0a0'); }));
    if (Math.random() < .5) st.push(step(.18, [[b, { pose: swOn(b) ? 'k_upCut' : pick(['uppercut', 'elbow', 'shoulder']), k: 95, fwd: 130, face: a }], [a, { pose: 'hurt', face: b }]], () => { label(headP(b), '버텨서 반격!', '#ffd84a'); resolve(b, a, null, 'hit', '', 1.1); }));
    else st.push(step(.25, [[a, { pose: swOn(a) ? 'k_kesa' : pick(['shoulder', 'highKick']), k: 95, fwd: 120, face: b }], [b, { pose: 'hurt', face: a }]], () => { b.fallV = (b.fallV || 0) + 12; resolve(a, b, null, 'hit', '무너짐!', 1.3); }));
    st.push(step(.25, [[a, { pose: 'guard', fwd: -40, face: b }], [b, { pose: 'landRec', face: a }]]));
    return st;
  }
  // 맞물려 버티기(검이면 날밑 맞대기) → 서로 밀쳐 떨어짐
  function bind(a, b) {
    const sw = swOn(a) || swOn(b), st = [...approach(a, b, 7)];
    st.push(step(.22, [[a, { pose: sw ? 'k_bind' : 'm_high', k: 80, fwd: 40, face: b }], [b, { pose: sw ? 'k_bind' : 'm_high', k: 80, fwd: 40, face: a }]], () => { spark(mid(a, b), '#ffffff', 14); label(mid(a, b).add(V3(0, 14, 0)), sw ? '칼날 맞대기!' : '맞잡기!', '#ffffff'); }));
    for (let i = 0; i < 3; i++) { const w = i % 2 ? a : b; st.push(step(R(.12, .2), [[w, { pose: sw ? 'k_bind' : 'm_high', fwd: 50, face: w === a ? b : a }], [w === a ? b : a, { pose: sw ? 'k_bind' : 'm_high', fwd: -30, face: w }]], () => spark(mid(a, b), '#ffd890', 5))); }
    st.push(step(.22, [[a, { pose: 'backstep', face: b }], [b, { pose: 'backstep', face: a }]], () => { sep(a, b, 1.3); ring(mid(a, b), 4, '#ffffff', false, .8, 2.4); }));
    if (Math.random() < .5) st.push(step(.16, [[a, { pose: ATK(a), k: 95, fwd: 110, face: b }], [b, { pose: 'crouchDodge', face: a }]], () => resolve(a, b, null, pick(['hit', 'dodge', 'block']), '', .9)));
    return st;
  }
  // 둘이 맞붙은 사이로 셋째가 끼어들어 교전을 깨뜨림
  function cutIn(a, b, c) {
    return [...approach(a, b, 8),
      step(.3, [[a, { pose: swOn(a) ? 'k_bind' : ATK(a), fwd: 30, face: b }], [b, { pose: swOn(b) ? 'k_bind' : 'block', fwd: 30, face: a }], [c, { pose: 'run', to: () => mid(a, b).setY(0).add(V3(R(-4, 4), 0, R(-4, 4))), face: a }]], () => spark(mid(a, b))),
      step(.16, [[c, { pose: swOn(c) ? 'k_yoko' : pick(['shoulder', 'spinKick', 'sweep']), k: 95, face: a }], [a, { pose: 'hurt', face: c }], [b, { pose: 'hurt', face: c }]], () => { sep(a, b, 1.6); const p = mid(a, b); spark(p, '#ffffff', 18); ring(p, 5, '#ffffff', false, .9, 3); label(headP(c).add(V3(0, 6, 0)), '끼어들기!', '#ffd84a', { big: true }); label(p.clone().add(V3(0, 12, 0)), '교전 무마!', '#cfe8ff'); }),
      step(.3, [[a, { pose: 'backstep', face: c }], [b, { pose: 'backstep', face: c }], [c, { pose: 'taunt', face: pick([a, b]) }]])];
  }
  // 상대의 연속 공격을 몸놀림으로 흘리고 받아치기
  function dodgeDance(a, b) {
    const st = [...approach(b, a, 11)];
    for (let i = 0; i < 2 + Math.floor(R(0, 3)); i++) { const mv = pick(['side', 'back', 'crouch', 'roll']), s = pick([-1, 1]);
      const da = mv === 'side' ? { pose: 'sidestep', side: s * 230, face: b } : mv === 'back' ? { pose: 'backstep', fwd: -170, face: b } : mv === 'crouch' ? { pose: 'crouchDodge', face: b } : { pose: 'roll', side: s * 200, face: b };
      st.push(step(R(.15, .24), [[b, { pose: ATK(b), k: 92, fwd: 90, face: a }], [a, da]], () => { if (mv === 'roll') a.roll = { t: 0, dur: .4, dir: -s }; streak(chest(a), V3(R(-1, 1), 0, R(-1, 1)).normalize(), 16, '#ffffff', .8); if (Math.random() < .5) label(headP(a), pick(['회피', '흘림', '빗나감']), '#cfe8ff'); })); }
    st.push(step(.18, [[a, { pose: swOn(a) ? pick(['k_upCut', 'k_tsuki', 'k_yoko']) : pick(['uppercut', 'sweep', 'elbow', 'shoulder', 'jumpKnee']), k: 95, fwd: 130, face: b }], [b, { pose: 'hurt', face: a }]], () => resolve(a, b, null, pick(['hit', 'hit', 'block']), '받아치기!', 1.1)));
    st.push(step(.2, [[a, { pose: Math.random() < .3 ? 'taunt' : 'guard', face: b }], [b, { pose: 'landRec', face: a }]]));
    return st;
  }
  const _plan = plan;
  plan = function () {
    if (F.length < 2) return _plan();
    const r = Math.random(), a = pick(F), b = pick(others(a)); if (!b) return _plan();
    a.target = b; b.target = a;
    const W = st => F.length > 2 ? withThird(st, a, b) : st;
    if (r < .07) return W(perchDive(a, b));
    if (r < .13) return W(airClash(a, b));
    if (r < .21) return W(pressBack(a, b));
    if (r < .27) return W(bind(a, b));
    if (r < .33) { const pool = (ALLF || F).filter(x => x !== a && x !== b); if (pool.length) return cutIn(a, b, pick(pool)); }
    if (r < .43) return W(dodgeDance(a, b));
    return _plan();
  };
  // 혼자 남은 인물도 이따금 발판 위로 올라가 기회를 노림
  const _solo = soloLane;
  soloLane = function (f0) {
    if (Math.random() < .25 && !f0.perchAt && !f0.arc) { const pl = pick(PLAT), tg = pick(others(f0)); if (tg) { lanes.push({ fs: [f0], q: [step(.7, [[f0, { pose: 'flipAir', face: tg }]], () => arc(f0, pl.p, .7, 24, { perch: true, hold: R(1.2, 2.4) })), step(R(.8, 1.4), [[f0, { pose: pick(['taunt', 'guard']), face: tg }]])], t: 0 }); return; } }
    return _solo(f0);
  };
  window.MV = { perchDive, airClash, pressBack, bind, cutIn, dodgeDance, entry, arc, PLAT, SWD };
})();
