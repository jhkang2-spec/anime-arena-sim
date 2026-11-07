// 이펙트 디테일 · 물리체인 · 글자 실사화 (fx2) — 맨 마지막에 불러온다
// 1) 열기 아지랑이(화면 굴절), 겹 광채(심·후광·번짐), 온도 따라 식는 불티·재, 아래가 어두운 연기, 강한 기술 조명 깜빡임,
//    빠른 움직임 잔상, 타격 순간 멈칫(히트스톱)·충격 프레임, 방향 있는 화면 흔들림(거리 따라 약해짐), 눈부심 상한
// 2) 물리체인: 머리카락 마디별 지연, 망토 몸통 충돌·속도 감쇠·추가 구속, 기술 폭풍 바람, 착지 반동, 머리띠 끈 이중 스프링
// 3) 글자: 기술 이름은 붓글씨 서체 + 금속 광택 + 두꺼운 테 + 그림자 + 꽂히듯 등장·기울며 사라짐, 작은 알림은 깔끔한 고딕
(function () {
  if (typeof scene !== 'function' || typeof drawHud !== 'function' || typeof physModel !== 'function') return;
  const st = window.__fx2 = { hs: 0, imp: [], shakes: [], hazes: [], gusts: [], flick: [], physMs: 0, hazeOff: false };
  const rr = (a, b) => a + Math.random() * (b - a);
  const FIRE = new Set(['fire', 'sun', 'blood', 'kurama', 'steam']);
  const elemC = ek => (ELEM[ek] || ELEM.power || ELEM.metal).c;
  // ── 색 도우미 ──
  const hexCache = {};
  const rgb = h => hexCache[h] || (hexCache[h] = (() => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; })());
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; };
  const shade = (a, k) => mix(a, k < 0 ? '#000000' : '#ffffff', Math.abs(k));

  // ── 연기 그림(위는 밝고 아래는 어두운 부드러운 덩어리) ──
  const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 7; i++) { const cx = 32 + rr(-9, 9), cy = 32 + rr(-9, 9), r = rr(14, 26), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
    x.globalCompositeOperation = 'source-atop'; const v = x.createLinearGradient(0, 0, 0, 64); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = v; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c); })();

  // ── 겹 광채·연기 묶음(미리 만들어 재사용: 새 재질을 매 프레임 만들지 않음) ──
  const mkPool = (n, tex, blend) => Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: blend, opacity: 0 })); s.visible = false; s.userData.pool = true; scene3.add(s); return { s, life: 0 }; });
  const glowPool = mkPool(36, glowTex, THREE.AdditiveBlending), corePool = mkPool(14, flareTex, THREE.AdditiveBlending), smokePool = mkPool(26, smokeTex, THREE.NormalBlending);
  const take = pool => { let best = pool[0]; for (const it of pool) { if (it.life <= 0) return it; if (it.life < best.life) best = it; } return best; };
  const live = [];
  function glowStack(p, c, size, life) { // 심(별빛) + 후광 + 바깥 번짐
    if (ftAvg > 18) size *= .7;
    const core = take(corePool), halo = take(glowPool), bloom = take(glowPool);
    [[core, size * .55, .9, 'core'], [halo, size, .55, 'halo'], [bloom, size * 2.1, .2, 'bloom']].forEach(([it, sz, op, k]) => {
      it.life = it.max = life * (k === 'bloom' ? 1.2 : 1); it.sz = sz; it.op = op; it.p = p.clone(); it.k = k; it.rot = rr(-1, 1);
      it.s.material.color.set(k === 'core' ? mix(c, '#ffffff', .6) : c); it.s.visible = true; if (!live.includes(it)) live.push(it);
    });
  }
  function smoke(p, n, spread = 8, dark = .35) {
    for (let i = 0; i < n; i++) { const it = take(smokePool); it.life = it.max = rr(1.6, 2.6); it.k = 'smoke'; it.p = p.clone().add(V3(rr(-spread, spread), rr(0, spread * .4), rr(-spread, spread))); it.v = V3(rr(-6, 6), rr(10, 22), rr(-6, 6)); it.sz = rr(10, 18) * (spread / 8); it.op = .5; it.rot = rr(-.5, .5);
      const g = Math.round(rr(40, 70) * (1 - dark) + 20); it.s.material.color.setRGB(g / 255, g / 255, (g + 6) / 255); it.s.visible = true; if (!live.includes(it)) live.push(it); }
  }
  // 온도에 따라 식는 불티(흰색→노랑→주황→빨강) + 천천히 떨어지는 재
  const TEMP = ['#c8301a', '#ff5a1a', '#ff8a20', '#ffc040', '#fff2a0', '#fffef4'];
  function embers(p, n, ek, spd = 1) {
    const fire = FIRE.has(ek);
    for (let i = 0; i < n; i++) { const d = V3(rr(-1, 1), rr(-.2, 1), rr(-1, 1)).normalize(), sp = rr(90, 300) * spd; parts.push({ p: p.clone(), v: d.multiplyScalar(sp), life: rr(1.2, 1.9), c: fire ? '#fffef4' : pick((ELEM[ek] || ELEM.metal).parts), g: fire ? 40 : 160, s: Math.random() < .3 ? 2 : 1, hot: fire }); }
    if (fire) for (let i = 0; i < Math.ceil(n / 3); i++) parts.push({ p: p.clone().add(V3(rr(-6, 6), rr(0, 10), rr(-6, 6))), v: V3(rr(-14, 14), rr(20, 50), rr(-14, 14)), life: rr(1.8, 2.6), c: pick(['#3a3436', '#4a4446', '#2e2a2c']), g: 14, s: 1, n: true, ash: true });
  }

  // ── 열기 아지랑이: 화면을 복사해 둔 그림을 물결처럼 살짝 비틀어 다시 그림(진짜 굴절) ──
  const hazeScene = new THREE.Scene(); let hazeTex = null; const dbs = new THREE.Vector2(); st.hazeScene = hazeScene; // fx3-cine 방사 왜곡이 같은 패스를 씀
  const hazeMatProto = new THREE.ShaderMaterial({
    uniforms: { tScreen: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uAmp: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tScreen; uniform vec2 uRes; uniform float uT, uAmp; varying vec2 vUv;
      void main(){ vec2 c = vUv - .5; float m = smoothstep(.5, .12, length(c)) * smoothstep(-.5, .1, c.y); if (m < .01) discard;
        vec2 s = gl_FragCoord.xy / uRes; float n1 = sin(s.y * 120. + uT * 11. + sin(s.x * 55. + uT * 4.) * 2.2), n2 = cos(s.x * 95. - uT * 8. + s.y * 30.);
        vec2 off = vec2(n1 * .7, n2) * .0035 * uAmp * m; gl_FragColor = vec4(texture2D(tScreen, s + off).rgb, m); }`,
  });
  function haze(p, r, life) { if (st.hazeOff || st.hazes.length >= 4) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hazeMatProto.clone()); m.position.copy(p); hazeScene.add(m); st.hazes.push({ m, p: p.clone(), r, life, max: life }); }

  // ── 타격·폭발에 덧붙이기 ──
  const _explode = explode;
  explode = function (p, ek, pw = 1) { _explode(p, ek, pw); try { const c = elemC(ek); if (pw >= .8) glowStack(p, c, 8 + 6 * pw, .45); embers(p, Math.min(26, Math.round(5 * pw)), ek, Math.sqrt(pw)); if (pw >= 1.3) smoke(p, 2, 6 * Math.sqrt(pw)); if (pw >= 1.4 && FIRE.has(ek)) haze(p.clone().add(V3(0, 6, 0)), 18 * pw, .9); if (pw >= 1.4) st.gusts.push({ p: p.clone(), str: Math.min(2, pw * .5), t: 0, dur: .8 }); } catch (e) { console.warn('fx2 explode', e); } };
  const _ult = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) { _ult(p, ek, rad, owner, nm); try { const c = elemC(ek);
    glowStack(p, c, Math.min(90, rad * .8), 1.1); smoke(p, 7, Math.min(26, rad * .3), .45); embers(p, 34, ek, 1.4); haze(p.clone().add(V3(0, 10, 0)), Math.min(90, rad), 1.6);
    st.hs = Math.max(st.hs, .09); st.flick.push({ p: p.clone(), c, pw: 10, t: 0, dur: .6 }); st.gusts.push({ p: p.clone(), str: 2.4, t: 0, dur: 1.2 });
    const dir = owner ? dirTo(owner, { pos: p }) : V3(1, 0, 0); st.shakes.push({ dir, p: p.clone(), amp: 5.5, t: 0, dur: .7 }); impactFrame(p, c, true); } catch (e) { console.warn('fx2 ult', e); } };
  const _wound = wound;
  wound = function (v, a, text, ek) { _wound(v, a, text, ek); try { const e2 = ek || (a && a.elem) || (a && a.ch.sig && a.ch.sig.elem) || 'metal', c = elemC(e2), p = chest(v);
    st.hs = Math.max(st.hs, .045); glowStack(p, c, 9, .28); embers(p, 8, e2, .8); st.shakes.push({ dir: a ? dirTo(a, v) : V3(1, 0, 0), p: p.clone(), amp: 2.4, t: 0, dur: .35 }); impactFrame(p, c, false); } catch (e) { console.warn('fx2 wound', e); } };
  const _callout = callout;
  callout = function (f, text, ult) { _callout(f, text, ult); try {
    const want = text + '!'; for (let i = labels.length - 1; i >= 0; i--) { const l = labels[i]; if (l.skill && l.text === want && !l.ec) { l.ec = elemC(f.elem || (f.ch.sig && f.ch.sig.elem) || 'power'); l.ult = !!ult; l.born = performance.now(); break; } }
    const ek = f.elem || (f.ch.sig && f.ch.sig.elem) || 'power', c = elemC(ek);
    glowStack(chest(f), c, ult ? 16 : 9, ult ? .7 : .4);
    if (ult) { st.flick.push({ p: chest(f), c, pw: 8, t: 0, dur: .7 }); if (FIRE.has(ek)) haze(f.pos.clone().add(V3(0, 14, 0)), 30, 1.2); }
  } catch (e) { console.warn('fx2 callout', e); } };
  function impactFrame(p, c, big) { const s = scr(p); if (!s.back) st.imp.push({ x: s.x, y: s.y, c, big, n: big ? 3 : 2 }); }

  // ── 히트스톱: 큰 타격 순간 몇 ms 동안 시간이 거의 멈춤 ──
  const _update = update;
  update = function (dt, t) { if (st.hs > 0) dt *= .12; return _update(dt, t); };

  // ── 방향 있는 화면 흔들림(맞은 방향으로 밀렸다 돌아옴, 카메라와 멀수록 약함) ──
  const _cam = camUpdate;
  camUpdate = function (dt, idle) { _cam(dt, idle); try {
    const off = V3(), cp = camera.position;
    st.shakes = st.shakes.filter(s => (s.t += dt) < s.dur);
    st.shakes.forEach(s => { const k = (1 - s.t / s.dur) ** 2 / (1 + cp.distanceTo(s.p) / 160), w = Math.sin(s.t * 58) * s.amp * k; off.addScaledVector(s.dir, w).add(V3(rr(-.3, .3), rr(-.4, .4), rr(-.3, .3)).multiplyScalar(s.amp * k)); });
    if (off.length() > 7) off.setLength(7); camera.position.add(off);
  } catch (e) { console.warn('fx2 cam', e); } };

  // ── 물리체인 ──
  const airPrev = new WeakMap(), _q2 = new THREE.Quaternion();
  const _phys = physModel;
  physModel = function (m, f, dt) {
    const t0 = performance.now();
    const s = m.ph, fw = fwdOf(f), rt = V3(-fw.z, 0, fw.x);
    // 기술 폭풍 바람: 폭발 중심에서 바깥으로 밀어냄(멀수록 약하게)
    let gf = 0, gr = 0, gy = 0;
    for (const g of st.gusts) { const d = V3(f.pos.x - g.p.x, 0, f.pos.z - g.p.z), L = d.length(); if (L > 160) continue; d.multiplyScalar(1 / (L || 1)); const k = g.str * (1 - g.t / g.dur) / (1 + L / 40); gf += d.dot(fw) * k; gr += d.dot(rt) * k; gy += k * .3; }
    // 착지 반동
    const was = airPrev.get(f) || { air: false, vy: 0 }; const landed = was.air && !f.air && was.vy < -60; airPrev.set(f, { air: !!f.air, vy: f.vel ? f.vel.y : 0 });
    if (s) {
      if (gf || gr) { s.sv.x += gf * 9 * dt * 60 * .016; s.sv.z += gr * 9 * dt * 60 * .016; s.sv.y += gy * 4 * dt * 60 * .016; }
      if (landed) { s.sv.y -= Math.min(6, -was.vy * .02); s.sv.x += rr(-1.5, 1.5); }
      if (s.chain) { if (gf || gr) for (let i = 1; i < s.chain.length; i++) { const c = s.chain[i], w = i / s.chain.length; c.p.x += gf * w * .9; c.p.z += gr * w * .9; } if (landed) for (let i = 1; i < s.chain.length; i++) s.chain[i].p.y -= .5 * i / s.chain.length; }
    }
    _phys(m, f, dt);
    const s2 = m.ph;
    if (s2 && s2.chain && m.coat.length && m.coat.some(c => c.visible)) {
      const ch = s2.chain, L = 1.75, N = ch.length;
      for (let i = 1; i < N; i++) { const c = ch[i], vx = c.p.x - c.o.x, vy = c.p.y - c.o.y, vz = c.p.z - c.o.z, sp = Math.hypot(vx, vy, vz); if (sp > 1.1) { const k = 1.1 / sp; c.o.set(c.p.x - vx * k, c.p.y - vy * k, c.p.z - vz * k); } } // 속도 감쇠(튀는 떨림 방지)
      for (let it = 0; it < 2; it++) for (let i = 1; i < N; i++) { const a = ch[i - 1].p, b = ch[i].p, dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l = Math.hypot(dx, dy, dz) || 1, k = L / l; b.set(a.x + dx * k, a.y + dy * k, a.z + dz * k);
        if (i > 1 && b.y > 2 && b.y < 29) { const r = Math.hypot(b.x, b.z), minR = b.y > 9 ? 3.25 : 2.6; if (r < minR) { const kk = minR / (r || 1); b.x = r ? b.x * kk : -minR; b.z *= kk; } } } // 몸통(캡슐) 뚫고 들어가지 않게
      if (ch.every(c => isFinite(c.p.x + c.p.y + c.p.z))) m.coat.forEach((sg, i) => { const p = ch[i].p, q = ch[i + 1].p, d = q.clone().sub(p); sg.position.copy(p).lerp(q, .5); sg.rotation.set(Math.atan2(d.z, -d.y) * .8, 0, Math.atan2(d.x, -d.y)); });
    }
    // 머리카락 마디별 지연(긴 가닥일수록 늦게 따라옴) · 머리띠 끈 이중 스프링
    if (s2) {
      const dd = Math.max(.008, Math.min(.04, dt));
      m.hairLocks.forEach(lk => { const u = lk.userData; if (!u.q2) u.q2 = lk.quaternion.clone(); const w = u.w || 1; u.q2.slerp(lk.quaternion, Math.min(1, dd * (22 - Math.min(14, w * 6)))); if (!isFinite(u.q2.x)) u.q2.copy(lk.quaternion); lk.quaternion.copy(u.q2); });
      if (m.tail) { const tz = m.tail.rotation.z, tx = m.tail.rotation.x; s2.tz = s2.tz ?? tz; s2.tv = s2.tv || 0; s2.tx2 = s2.tx2 ?? tx; s2.txv = s2.txv || 0;
        s2.tv += ((tz - s2.tz) * 110 - s2.tv * 8) * dd; s2.tz += s2.tv * dd; s2.txv += ((tx - s2.tx2) * 110 - s2.txv * 8) * dd; s2.tx2 += s2.txv * dd;
        if (isFinite(s2.tz + s2.tx2)) { m.tail.rotation.z = s2.tz; m.tail.rotation.x = s2.tx2; } else { s2.tz = tz; s2.tx2 = tx; s2.tv = s2.txv = 0; } }
    }
    st.physAcc = (st.physAcc || 0) + performance.now() - t0;
  };

  // ── 매 프레임: 광채·연기·아지랑이·깜빡임·잔상·불티 온도 ──
  let lastT = performance.now(), tAcc = 0;
  function tick() {
    const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now; tAcc += dt;
    if (st.hs > 0) st.hs -= dt;
    st.physMs = st.physMs * .95 + (st.physAcc || 0) * .05; st.physAcc = 0;
    const cp = camera.position;
    for (let i = live.length - 1; i >= 0; i--) { const it = live[i]; it.life -= dt; const s = it.s;
      if (it.life <= 0) { s.visible = false; s.material.opacity = 0; live.splice(i, 1); continue; }
      const u = 1 - it.life / it.max;
      if (it.k === 'smoke') { it.p.addScaledVector(it.v, dt); it.v.multiplyScalar(1 - dt * .6); s.position.copy(it.p); const sz = it.sz * (1 + u * 1.6); s.scale.set(sz, sz, 1); s.material.opacity = it.op * Math.min(1, u * 5) * (1 - u); s.material.rotation += it.rot * dt; }
      else { s.position.copy(it.p); const grow = it.k === 'core' ? (u < .15 ? u / .15 : 1 - (u - .15) * .7) : it.k === 'halo' ? .6 + u * .6 : .5 + u * 1.1; let sz = it.sz * Math.max(.05, grow);
        const dist = cp.distanceTo(it.p); sz = Math.min(sz, dist * .55); // 카메라 가까이서 화면을 덮지 않게
        s.scale.set(sz, sz, 1); s.material.rotation = it.rot + u * .4; s.material.opacity = it.op * (1 - u) ** (it.k === 'core' ? 2 : 1.3) * Math.min(1, Math.max(.12, (dist - 12) / 45)); }
    }
    // 아지랑이 위치·세기
    st.hazes = st.hazes.filter(h => { h.life -= dt; if (h.life <= 0) { hazeScene.remove(h.m); h.m.geometry.dispose(); h.m.material.dispose(); return false; } h.m.position.copy(h.p); h.m.quaternion.copy(camera.quaternion); const sz = h.r * 2.2; h.m.scale.set(sz, sz * 1.3, 1); const u = h.life / h.max; h.m.material.uniforms.uAmp.value = Math.min(1, u * 2.5) * (ftAvg > 18 ? .6 : 1); h.m.material.uniforms.uT.value = tAcc; return true; });
    if (tAcc % .25 < dt && emitters.length) emitters.slice(0, 2).forEach(e => { if ((e.k === 'flames' && e.fire) || e.k === 'stream') haze((e.p || chest(e.f)).clone().add(V3(0, 8, 0)), 22, .5); });
    st.gusts = st.gusts.filter(g => (g.t += dt) < g.dur);
    st.flick = st.flick.filter(fk => { fk.t += dt; if (fk.t >= fk.dur) return false; if (Math.random() < .7) light(fk.p, fk.c, fk.pw * (.45 + Math.random() * .75) * (1 - fk.t / fk.dur)); return true; });
    // 불티 온도: 흰색 → 노랑 → 주황 → 빨강
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; if (p.hot) p.c = TEMP[Math.max(0, Math.min(5, Math.floor(p.life / 1.9 * 6)))]; }
    // 빠른 움직임 잔상
    if (frame % 3 === 0 && ghosts.length < 12) F.forEach(f => { const sp = Math.hypot((f.vel.x || 0) + (f.kb ? f.kb.x : 0), (f.vel.z || 0) + (f.kb ? f.kb.z : 0)); if (sp > 230 && f.model && f.model.root.visible) ghosts.push({ ch: f.ch, pos: f.pos.clone(), heading: f.heading, c: { ...f.c }, life: .5, color: elemC(f.elem || (f.ch.sig && f.ch.sig.elem) || 'wind'), dec: .1, stretch: f.stretch }); });
  }
  const _scene = scene;
  scene = function (now, q, extra) { try { tick(); } catch (e) { console.warn('fx2 tick', e); } return _scene(now, q, extra); };

  // ── 글자 실사화 + 아지랑이 그리기(화면을 그린 직후, 글자 전에) ──
  const KFONT = '"궁서", Gungsuh, "궁서체", GungsuhChe, "바탕", Batang, "Noto Serif KR", serif';
  const SFONT = '"Noto Sans KR", "맑은 고딕", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
  function hazePass() {
    if (st.hazeOff || !st.hazes.length || ftAvg > 19) return;
    try {
      renderer.getDrawingBufferSize(dbs);
      if (!hazeTex || hazeTex.image.width !== dbs.x || hazeTex.image.height !== dbs.y) { if (hazeTex) hazeTex.dispose(); hazeTex = new THREE.DataTexture(null, dbs.x, dbs.y, THREE.RGBFormat); hazeTex.minFilter = hazeTex.magFilter = THREE.LinearFilter; hazeTex.generateMipmaps = false; }
      renderer.copyFramebufferToTexture(new THREE.Vector2(0, 0), hazeTex);
      st.hazes.forEach(h => { h.m.material.uniforms.tScreen.value = hazeTex; h.m.material.uniforms.uRes.value.copy(dbs); });
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(hazeScene, camera); renderer.autoClear = ac;
    } catch (e) { st.hazeOff = true; console.warn('fx2 haze off', e); }
  }
  /* 기술 이름 카드(11-05 글자 품질): 마른 붓 먹 띠 배경 + 먹 번짐 + 금박 결·빛 줄 + 필살기 붉은 낙관 + 꽂히며 떨리는 등장 — 한 번 그려 캐시(매 장면 다시 그리지 않음) */
  const brushTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'); x.lineCap = 'round';
    for (let i = 0; i < 260; i++) { const y = 20 + Math.random() * 88, x0 = Math.random() * 46, x1 = (Math.random() < .25 ? rr(330, 470) : rr(470, 510)), w = 1 + Math.random() * 4.5; x.strokeStyle = `rgba(8,6,10,${.22 + Math.random() * .55})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(150, y + rr(-6, 6), 350, y + rr(-6, 6), x1, y + rr(-9, 9)); x.stroke(); }
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(8,6,10,${Math.random() * .5})`; const ex = Math.random() < .5 ? rr(0, 70) : rr(430, 512); x.fillRect(ex, rr(16, 112), rr(1, 3.5), rr(1, 3.5)); } return c; })();
  const cardCache = new Map(); try { document.fonts && document.fonts.ready.then(() => cardCache.clear()); } catch (e) { }
  function renderCard(l, base) { const S = base * 2, ec = l.ec || '#ffd27a', c = document.createElement('canvas'), x = c.getContext('2d'), F0 = `900 ${S}px ${KFONT}`; x.font = F0; const tw = x.measureText(l.text).width, W = Math.ceil(tw + S * (l.ult ? 2.8 : 2)), H = Math.ceil(S * 2.1); c.width = W; c.height = H;
    const set = (y) => { y.font = F0; y.textAlign = 'center'; y.textBaseline = 'middle'; y.lineJoin = 'round'; }; set(x); const cx = W / 2 - (l.ult ? S * .3 : 0), cy = H / 2;
    x.globalAlpha = l.ult ? .92 : .72; x.drawImage(brushTex, 0, H * .1, W, H * .8); x.globalAlpha = 1;
    x.shadowColor = 'rgba(0,0,0,.95)'; x.shadowBlur = S * .32; x.lineWidth = S * .26; x.strokeStyle = '#050307'; x.strokeText(l.text, cx, cy); x.shadowBlur = 0; x.shadowColor = 'rgba(0,0,0,0)';
    x.lineWidth = S * .1; x.strokeStyle = shade(ec, -.55); x.strokeText(l.text, cx, cy);
    const t2 = document.createElement('canvas'); t2.width = W; t2.height = H; const y2 = t2.getContext('2d'); set(y2);
    const g = y2.createLinearGradient(0, cy - S * .5, 0, cy + S * .5); g.addColorStop(0, mix(ec, '#fff8e0', .88)); g.addColorStop(.36, mix(ec, '#ffe6a0', .45)); g.addColorStop(.5, mix(ec, '#ffffff', .1)); g.addColorStop(.53, shade(ec, -.45)); g.addColorStop(.7, shade(ec, -.1)); g.addColorStop(1, mix(ec, '#fff0c0', .35));
    y2.fillStyle = g; y2.fillText(l.text, cx, cy); y2.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < W * H / 260; i++) { y2.fillStyle = Math.random() < .55 ? 'rgba(255,250,225,.45)' : 'rgba(110,70,20,.32)'; y2.fillRect(Math.random() * W, Math.random() * H, rr(1, 3.2), rr(1, 2.4)); }
    const sh = y2.createLinearGradient(0, 0, W, H); sh.addColorStop(.36, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.5)'); sh.addColorStop(.64, 'rgba(255,255,255,0)'); y2.fillStyle = sh; y2.fillRect(0, 0, W, H); x.drawImage(t2, 0, 0);
    x.lineWidth = Math.max(1, S * .02); x.strokeStyle = 'rgba(255,255,255,.4)'; x.strokeText(l.text, cx, cy - S * .02);
    if (l.ult) { const s = S * .62, sx = cx + tw / 2 + S * .35, sy = cy - s * .1; x.fillStyle = '#b3121a'; x.beginPath(); x.moveTo(sx + 3, sy); x.lineTo(sx + s, sy + 2); x.lineTo(sx + s - 2, sy + s); x.lineTo(sx, sy + s - 3); x.closePath(); x.fill();
      x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) x.fillRect(sx + Math.random() * s, sy + Math.random() * s, rr(1, 2.5), rr(1, 2.5)); x.globalCompositeOperation = 'source-over';
      x.fillStyle = 'rgba(255,236,220,.92)'; x.font = `900 ${s * .66}px ${KFONT}`; x.fillText('必', sx + s / 2, sy + s / 2 + 1); }
    return { c, W, H, tw }; }
  function card(l, x, y, size, alpha, skew) { const base = l.ult ? 32 : 22, key = l.text + '|' + (l.ec || '') + '|' + (l.ult ? 1 : 0); let C = cardCache.get(key); if (!C) { if (cardCache.size > 80) cardCache.clear(); C = renderCard(l, base); cardCache.set(key, C); }
    const age = l.born ? (performance.now() - l.born) / 1000 : 1, sk = age < .35 ? (1 - age / .35) * size * .1 : 0, k = size / base / 2;
    hc.save(); hc.translate(x + rr(-sk, sk), y + rr(-sk, sk) * .6); hc.transform(1, 0, skew, 1, 0, 0); hc.globalAlpha = alpha; hc.drawImage(C.c, -C.W * k / 2, -C.H * k / 2, C.W * k, C.H * k); hc.restore(); return C.tw * k; }
  const SHOW_ALL_LABELS = (() => { try { return localStorage.getItem('arenaAllLabels') === '1'; } catch (e) { return false; } })();
  drawHud = function (q, extra) {
    hazePass();
    const HW = (window.HUD && HUD.LW) || hud.width, HH = (window.HUD && HUD.LH) || hud.height, HX = HW / 2;
    hc.clearRect(0, 0, HW, HH);
    if (whiteout > .01) { hc.fillStyle = `rgba(${flashC},${Math.min(whiteout, FLASH_MAX)})`; hc.fillRect(0, 0, HW, HH); whiteout *= .8; }
    // 충격 프레임(1~3프레임): 어두운 테두리 + 타격점에서 뻗는 속도선 — 화면을 하얗게 덮지 않음
    st.imp = st.imp.filter(im => im.n-- > 0); st.imp.forEach(im => {
      const vg = hc.createRadialGradient(im.x, im.y, 20, im.x, im.y, HW * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${im.big ? .38 : .22})`); hc.fillStyle = vg; hc.fillRect(0, 0, HW, HH);
      hc.save(); hc.globalAlpha = im.big ? .55 : .35; hc.strokeStyle = mix(im.c, '#ffffff', .5); for (let i = 0; i < (im.big ? 26 : 14); i++) { const a = Math.random() * Math.PI * 2, r0 = rr(24, 60), r1 = r0 + rr(60, im.big ? 260 : 150); hc.lineWidth = rr(.6, im.big ? 2.4 : 1.4); hc.beginPath(); hc.moveTo(im.x + Math.cos(a) * r0, im.y + Math.sin(a) * r0); hc.lineTo(im.x + Math.cos(a) * r1, im.y + Math.sin(a) * r1); hc.stroke(); } hc.restore(); });
    const txt = (s, x, y, font, color, w = 3, stroke = '#000') => { hc.font = font; hc.lineJoin = 'round'; hc.lineWidth = w; hc.strokeStyle = stroke; hc.strokeText(s, x, y); hc.fillStyle = color; hc.fillText(s, x, y); };
    hc.textAlign = 'center'; hc.textBaseline = 'alphabetic';
    if (!q) { txt(extra, HX, 34, `700 15px ${SFONT}`, '#ffe8b0', 4, '#120a04'); return; }
    const hp = Math.max(0, 100 - (q.progress || 0));
    void hp; // 소유자 요청(11-05): 레벨·남은 양 상자는 시야를 가려 그리지 않음
    const hpY = (window.HP && document.getElementById('hpHud') && document.getElementById('hpHud').childElementCount) ? Math.round(HH * .13) + 12 : 26; /* 체력바(hp.js) 아래로 내림 */
    hc.textAlign = 'right'; txt('합 ' + clashes.toLocaleString(), HW - 10, hpY, `800 15px ${SFONT}`, '#ffb030', 4, '#1a0e02');
    hc.textAlign = 'center';
    F.forEach(f => { const p = scr(headP(f).add(V3(0, 4, 0))); if (!p.back) { hc.shadowColor = 'rgba(0,0,0,.8)'; hc.shadowBlur = 3; txt(f.name, p.x, p.y, `700 11px ${SFONT}`, '#ffffff', 3, WORLD[f.ch.world].stroke); hc.shadowBlur = 0; hc.shadowColor = 'rgba(0,0,0,0)'; } });
    txt(q.step || '진행 중', HX, HH - 8, `600 12px ${SFONT}`, '#efe3cf', 3, '#120a04');
    if (extra.more) { hc.textAlign = 'left'; txt('+' + extra.more + ' 동시 진행', 10, hpY, `700 12px ${SFONT}`, '#ff9a3c', 3, '#120a04'); }
    labels = labels.filter(l => l.life > 0);
    const now = performance.now(), placed = [];
    labels.forEach(l => {
      const p = scr(l.p); if (p.back) { l.life -= .02; return; }
      if (!l.born) l.born = now; const age = (now - l.born) / 1000;
      let x = clampv(p.x, 100, HW - 100), y = clampv(p.y - l.rise, 30, HH - 30);
      if (l.skill && !l.ult) { // 소유자 요청(11-05): 일반 기술 이름은 작게(필살기만 궁서체 큰 카드)
        const pop = age < .1 ? 1.25 - age / .1 * .25 : 1, sz = Math.round(13 * pop);
        hc.save(); hc.globalAlpha = Math.min(1, l.life * 2.5); hc.textAlign = 'center'; hc.shadowColor = 'rgba(0,0,0,.85)'; hc.shadowBlur = 3; hc.shadowOffsetY = 1;
        txt(l.text, x, y, `700 ${sz}px ${SFONT}`, mix(l.ec || '#ffd27a', '#ffffff', .45), 3, '#0a0a0e'); hc.restore();
        l.rise += .35; l.life -= .01;
      } else if (l.skill) {
        const base = l.ult ? 32 : 22, slam = age < .13 ? 1.9 - age / .13 * .9 : age < .24 ? 1 - Math.sin((age - .13) / .11 * Math.PI) * .07 : 1;
        const fade = l.life < .45 ? l.life / .45 : 1, alpha = Math.min(1, age / .06) * fade, skew = (1 - fade) * .35;
        for (const o of placed) if (Math.abs(o.y - y) < base * 1.15 && Math.abs(o.x - x) < 180) y = o.y - base * 1.2; // 동시에 뜬 기술 이름이 겹치지 않게
        y = Math.max(74, y); placed.push({ x, y });
        card(l, x + (1 - fade) * 22, y, Math.round(base * slam), alpha, skew);
        l.rise += .22;
      } else if (!SHOW_ALL_LABELS && !l.keep) { /* 소유자 요청(11-05): 일어남·막기·흘리기 등 상태 글자는 띄우지 않음 — 기술·스킬 이름만. 예외: keep:true(피해수치·K.O. 등 전투 핵심 수치) */
        l.life = 0;
      } else {
        const size = l.big ? 18 : 13, pop = age < .1 ? 1.35 - age / .1 * .35 : 1;
        hc.save(); hc.globalAlpha = Math.min(1, l.life * 2.5); hc.textAlign = 'center'; hc.shadowColor = 'rgba(0,0,0,.85)'; hc.shadowBlur = 4; hc.shadowOffsetY = 1;
        txt(l.text, x, y, `800 ${Math.round(size * pop)}px ${SFONT}`, l.color, l.big ? 4 : 3, '#0a0a0e'); hc.restore();
        l.rise += .5;
      }
      l.life -= .015;
    });
    hc.globalAlpha = 1;
  };
})();
