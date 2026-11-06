// 원작 재현 기술: 귀멸의 칼날 13명 전 기술.
// 호흡의 형은 원작처럼 칼끝을 따라 붓으로 그린 듯한(우키요에) 원소 모양이 남는다.
// - 붓질 띠(ribbon): 가운데 두껍고 양끝 뾰족한 띠가 칼 궤적대로 그려지며 펼쳐짐
// - 물 = 남색 물결 + 흰 거품 / 해 = 주황 불꽃 고리 / 벼락 = 노란 지그재그 / 불꽃 = 화염 띠·불꽃 호랑이
// - 벌레 = 보라 나비 / 소리 = 오색 폭발 / 사랑 = 분홍 채찍 띠 / 안개 = 흰 안개 / 바람 = 초록빛 바람 칼날·회오리
// - 뱀 = 구불구불한 뱀 모양 베기 / 바위 = 쇠사슬 철구·도끼 / 네즈코 = 분홍 혈귀술 불꽃·발차기
(function () {
  if (typeof CH === 'undefined' || !CH.tanjiro) return;
  window.CANON = window.CANON || new Set();
  const UP = V3(0, 1, 0);
  // ── 호흡별 색·알갱이 ──
  const STY = {
    water: { c: '#1f6ae0', c2: '#d8f2ff', ek: 'water', parts: ['#ffffff', '#cfeeff', '#6ab8ff', '#2a7aff'], g: 220 },
    sun: { c: '#ff4a0a', c2: '#ffe27a', ek: 'sun', parts: ['#fff6b0', '#ffc040', '#ff6a10', '#ff2a00'], g: -60 },
    thunder: { c: '#ffc810', c2: '#ffffff', ek: 'bolt', parts: ['#ffffff', '#fff6a0', '#ffd820', '#ffb000'], g: 0 },
    beast: { c: '#5a7890', c2: '#e8f4ff', ek: 'slash', parts: ['#ffffff', '#b8c8d8', '#7a8a9a', '#4a5a6a'], g: 80 },
    flame: { c: '#ff3a00', c2: '#ffd040', ek: 'fire', parts: ['#fff2a0', '#ffb040', '#ff5a10', '#e02000'], g: -70 },
    insect: { c: '#9a50ff', c2: '#f4e8ff', ek: 'insect', parts: ['#ffffff', '#e4ccff', '#b080ff', '#7a3ad0'], g: -10 },
    sound: { c: '#ffb020', c2: '#ffffff', ek: 'sound', parts: ['#ff4a9a', '#4aff9a', '#ffd040', '#4ac8ff', '#ffffff'], g: 60 },
    love: { c: '#ff5aa8', c2: '#ffe4f2', ek: 'petal', parts: ['#ffffff', '#ffc8e0', '#ff7ab8', '#9ad070'], g: -10 },
    mist: { c: '#b8c8d8', c2: '#ffffff', ek: 'mist', parts: ['#ffffff', '#eef4f8', '#d0dce8'], g: -4 },
    wind: { c: '#30c080', c2: '#eafff4', ek: 'wind', parts: ['#ffffff', '#c8ffe4', '#60e0a0', '#2a9a6a'], g: -8 },
    serpent: { c: '#8a6aff', c2: '#ece4ff', ek: 'slash', parts: ['#ffffff', '#d8ccff', '#9a80ff', '#5a3ad0'], g: 0 },
    stone: { c: '#9a7a58', c2: '#efe0c8', ek: 'earth', parts: ['#e0d0b8', '#a88a68', '#6a5040', '#4a3a30'], g: 320 },
    blood: { c: '#ff2a6a', c2: '#ffd0e0', ek: 'blood', parts: ['#ffe0ea', '#ff9ab8', '#ff3a7a', '#c0104a'], g: -40 },
  };
  // ── 살아 움직이는 효과 목록 (envUpdate 를 감싸 매 화면 갱신) ──
  const live = []; window.__kmLive = live;
  const addLive = o => { o.t = 0; live.push(o); return o; };
  const _env = envUpdate;
  envUpdate = function (dt, t) {
    _env(dt, t);
    for (let i = live.length - 1; i >= 0; i--) { const o = live[i]; o.t += dt; let keep = true; try { keep = o.upd(dt, t, o) !== false; } catch (e) { console.error(e); keep = false; }
      if (!keep || o.t > (o.max || 4)) { if (o.g) kill(o.g); if (o.end) try { o.end(); } catch (e) { } live.splice(i, 1); } }
  };
  const opSet = (g, k) => g.traverse(m => { if (m.material) { const md = m.material.userData; if (md.op0 === undefined) md.op0 = m.material.opacity; m.material.opacity = md.op0 * k; } });
  const ease = u => 1 - Math.pow(1 - u, 3);
  // ── 붓질 띠: 가운데 두껍고 양끝 뾰족, 서로 직교한 두 장(어느 각도에서도 보임) ──
  function stripGeo(pts, N, w, prof) {
    const n = pts.length, pos = new Float32Array(n * 4 * 3), idx = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), T = pts[Math.min(n - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const nn = (N && N.lengthSq() > .01) ? N : UP; let S = T.clone().cross(nn); if (S.lengthSq() < 1e-4) S = T.clone().cross(V3(1, 0, 0)); S.normalize();
      const N2 = S.clone().cross(T).normalize(), ww = w * (prof ? prof(u) : Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), .55) + .02);
      const p = pts[i]; [S, N2].forEach((d, k) => { pos.set([p.x + d.x * ww, p.y + d.y * ww, p.z + d.z * ww], (i * 4 + k * 2) * 3); pos.set([p.x - d.x * ww, p.y - d.y * ww, p.z - d.z * ww], (i * 4 + k * 2 + 1) * 3); });
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < 2; k++) { const a = i * 4 + k * 2, b = a + 1, c = a + 4, d = a + 5; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  // 띠 하나: 바깥 색 + 안쪽 흰 심. dur 동안 그려지고 life 끝 무렵 사라짐. 그려지는 끝에서 호흡별 알갱이
  function ribbon(pts, N, w, sty, o = {}) {
    const S = STY[sty], g = new THREE.Group(), ga = stripGeo(pts, N, w, o.prof), gb = stripGeo(pts, N, w * .42, o.prof);
    const ma = new THREE.Mesh(ga, addMat(o.c || S.c, o.op || .85)), mb = new THREE.Mesh(gb, addMat(o.c2 || S.c2, .95)); g.add(ma, mb); scene3.add(g);
    const total = ga.index.count, dur = o.dur ?? .14, life = o.life ?? .9, n = pts.length;
    return addLive({ g, max: life + .05, upd: (dt, t, L) => {
      const u = Math.min(1, L.t / Math.max(.01, dur)), cnt = Math.max(6, Math.floor(ease(u) * (n - 1)) * 12);
      ga.setDrawRange(0, cnt); gb.setDrawRange(0, cnt);
      const hi = Math.min(n - 1, Math.floor(ease(u) * (n - 1))); const P = pts[hi] || pts[n - 1]; if (P && (u < 1 || Math.random() < .3)) fleck(sty, P.clone().add(g.position), o.vel);
      if (o.move) g.position.addScaledVector(o.move, dt);
      const f = L.t > life * .55 ? Math.max(0, 1 - (L.t - life * .55) / (life * .45)) : 1; opSet(g, f);
      if (o.spinY) g.rotation.y += o.spinY * dt;
    } });
  }
  // 호흡별 알갱이(띠 끝에서 흩날림)
  function fleck(sty, p, vel) {
    const S = STY[sty]; if (!p) return;
    const k = sty === 'water' ? 3 : sty === 'sound' ? 2 : 2;
    for (let i = 0; i < k; i++) parts.push({ p: p.clone().add(V3(R(-2, 2), R(-2, 2), R(-2, 2))), v: V3(R(-30, 30), R(-10, 50), R(-30, 30)), life: R(.5, .9), c: pick(S.parts), g: S.g, s: pick([1, 2]) });
    if (sty === 'mist') parts.push({ p: p.clone(), v: V3(R(-8, 8), R(2, 10), R(-8, 8)), life: 1.6, c: pick(['#e8eef4', '#ffffff', '#d4dee8']), g: -2, s: 3, n: true });
    if ((sty === 'flame' || sty === 'sun' || sty === 'blood') && Math.random() < .6) parts.push({ p: p.clone(), v: V3(R(-10, 10), R(30, 70), R(-10, 10)), life: R(.6, 1), c: pick(S.parts), g: -40, s: 3 });
    if (sty === 'thunder' && Math.random() < .25) bolt(p.clone(), p.clone().add(V3(R(-10, 10), R(-10, 10), R(-10, 10))), '#fff4a0', .25, .8);
  }
  // 칼 궤적 호: 몸 앞 평면 위 각도 a0→a1 (0 = 정면, +π/2 = 위). tilt 로 평면을 기울임(π/2 = 가로베기)
  function arcPts(c, fw, a0, a1, r, tilt = 0, n = 26) {
    const rt = V3(-fw.z, 0, fw.x), U = UP.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(rt, Math.sin(tilt)), pts = [];
    for (let i = 0; i < n; i++) { const th = a0 + (a1 - a0) * i / (n - 1); pts.push(c.clone().addScaledVector(fw, Math.cos(th) * r).addScaledVector(U, Math.sin(th) * r)); }
    return { pts, N: fw.clone().cross(U).normalize() };
  }
  const fwOf = (a, b) => dirTo(a, b);
  function slashArc(a, b, sty, a0, a1, r = 18, tilt = 0, w = 5, o = {}) { const fw = fwOf(a, b), c = chest(a).addScaledVector(fw, o.fwd ?? 5).add(V3(0, o.dy || 0, 0)); const A = arcPts(c, fw, a0, a1, r, tilt, o.n || 28); return ribbon(A.pts, A.N, w, sty, o); }
  // 직선·지그재그·뱀 모양 경로
  function linePts(p0, p1, n, off) { const pts = [], d = p1.clone().sub(p0), rt = V3(-d.z, 0, d.x).normalize(); for (let i = 0; i < n; i++) { const u = i / (n - 1), p = p0.clone().addScaledVector(d, u); if (off) { const [x, y] = off(u, i); p.addScaledVector(rt, x).y += y; } pts.push(p); } return pts; }
  // ── 모양 부품 ──
  const coneG = new THREE.ConeGeometry(1, 1, 7); coneG.userData.shared = true;
  const sphG = new THREE.SphereGeometry(1, 10, 8); sphG.userData.shared = true;
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.userData.shared = true;
  function headOf(kind, c, c2) { // 용·호랑이 머리 (+z 가 앞)
    const h = new THREE.Group(), P = (geo, col, op, s, p, r) => { const m = new THREE.Mesh(geo, addMat(col, op)); m.scale.set(...s); m.position.set(...p); if (r) m.rotation.set(...r); h.add(m); return m; };
    if (kind === 'dragon') {
      P(coneG, c, .9, [4.5, 15, 4], [0, 1.2, 6], [PI / 2, 0, 0]); P(coneG, c2, .85, [2.2, 12, 2], [0, 1.3, 6], [PI / 2, 0, 0]);
      h.userData.jaw = P(coneG, c, .85, [3.8, 13, 2.4], [0, -2, 5], [PI / 2 + .35, 0, 0]);
      P(sphG, c, .8, [7, 6, 8], [0, 0, -3]); [-1, 1].forEach(s => { P(coneG, c2, .9, [1.2, 12, 1.2], [s * 3.5, 5.5, -7], [-1.1, 0, s * .35]); const e = new THREE.Sprite(spriteMat(flareTex, '#ffffff', 1)); e.scale.set(4, 4, 1); e.position.set(s * 3.2, 2.8, 2); h.add(e); P(coneG, c2, .7, [.8, 10, .8], [s * 4.5, -1, 8], [PI / 2, 0, s * .8]); });
      for (let i = 0; i < 6; i++) P(coneG, i % 2 ? c : c2, .7, [1.4, 9 + i, 1.4], [Math.sin(i) * 2.5, 2.5 + i * .5, -9 - i * 1.6], [-1.6 + i * .08, 0, (i - 3) * .25]);
    } else { // 호랑이: 넓적한 머리·주둥이·귀·송곳니·불꽃 갈기
      P(boxG, c, .85, [11, 9, 10], [0, 0, 0]); P(boxG, c2, .8, [6, 4.5, 5], [0, -1.5, 6.5]); P(boxG, c, .85, [6, 2, 5], [0, -4.5, 6], [.35, 0, 0]);
      [-1, 1].forEach(s => { P(coneG, c, .9, [2.2, 4.5, 2.2], [s * 4, 6, -1]); P(coneG, '#ffffff', .95, [.7, 3, .7], [s * 1.6, -4, 8.5], [PI, 0, 0]); const e = new THREE.Sprite(spriteMat(flareTex, '#fff4c0', 1)); e.scale.set(4.5, 4.5, 1); e.position.set(s * 2.8, 2, 5.2); h.add(e); });
      for (let i = 0; i < 4; i++) P(boxG, '#2a0a00', .6, [1, 6, .6], [-3 + i * 2, 4.2, 2], [0, 0, .3]); // 줄무늬
      for (let i = 0; i < 10; i++) { const an = i / 10 * PI * 2; P(coneG, i % 2 ? c : c2, .75, [2, 10, 2], [Math.cos(an) * 6, Math.sin(an) * 6, -5], [PI / 2 + .9, 0, -an]); }
    }
    const gw = new THREE.Sprite(spriteMat(glowTex, c, .6)); gw.scale.set(46, 46, 1); h.add(gw); return h;
  }
  // 머리가 경로를 따라가고 몸통 띠가 뒤에서 그려짐 (용·호랑이·물의 용)
  function beast(kind, pts, sty, dur, o = {}) {
    const S = STY[sty], h = headOf(kind, o.c || S.c, o.c2 || S.c2), g = new THREE.Group(); g.add(h); scene3.add(g); h.scale.setScalar(o.scale || 1);
    const body = ribbon(pts, o.N || UP, o.w || 6, sty, { dur, life: dur + .8, c: o.c, c2: o.c2 });
    return addLive({ g, max: dur + .9, upd: (dt, t, L) => {
      const u = Math.min(1, L.t / dur), f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), p = pts[i].clone().lerp(pts[i + 1], f - i);
      h.position.copy(p); h.lookAt(p.clone().add(pts[i + 1].clone().sub(pts[i]))); if (h.userData.jaw) h.userData.jaw.rotation.x = PI / 2 + .3 + Math.sin(t * 22) * .15;
      for (let k = 0; k < 3; k++) parts.push({ p: p.clone().add(V3(R(-5, 5), R(-5, 5), R(-5, 5))), v: V3(R(-30, 30), R(-10, 40), R(-30, 30)), life: R(.5, .8), c: pick(S.parts), g: S.g * .3, s: pick([2, 3]) });
      light(p, o.c || S.c, 5); if (L.t > dur) opSet(g, Math.max(0, 1 - (L.t - dur) / .5)); if (o.onHead) o.onHead(p, u);
    } });
  }
  // 분홍 나비 그림
  const bflyTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    [[-1, 1], [1, 1]].forEach(([s]) => { const gr = x.createRadialGradient(32 + s * 14, 26, 2, 32 + s * 14, 26, 18); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.4, '#e0b8ff'); gr.addColorStop(1, 'rgba(110,40,200,0.9)');
      x.fillStyle = gr; x.beginPath(); x.ellipse(32 + s * 14, 26, 15, 13, s * .5, 0, 7); x.fill(); x.fillStyle = 'rgba(180,120,255,.9)'; x.beginPath(); x.ellipse(32 + s * 10, 44, 9, 8, -s * .4, 0, 7); x.fill(); });
    x.fillStyle = '#2a1040'; x.fillRect(31, 18, 2, 30); return new THREE.CanvasTexture(c); })();
  function butterflies(p, n, spread = 20, life = 1.4) {
    for (let i = 0; i < n; i++) { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: bflyTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); const s0 = R(3, 6); m.scale.set(s0, s0, 1);
      const g = new THREE.Group(); g.add(m); g.position.copy(p).add(V3(R(-spread, spread), R(-4, spread * .6), R(-spread, spread))); scene3.add(g); const v = V3(R(-20, 20), R(5, 25), R(-20, 20)), ph = R(0, 6);
      addLive({ g, max: life, upd: (dt, t, L) => { g.position.addScaledVector(v, dt); m.scale.x = s0 * (.35 + Math.abs(Math.sin(t * 18 + ph))); m.material.opacity = Math.min(1, (life - L.t) * 2); } }); }
  }
  // 소리의 호흡: 오색 폭발
  function boom(p, k = 1) { const c = pick(STY.sound.parts); burst(p, 10 * k, STY.sound.parts, 1.6 * k); ring(p, 2.5 * k, c, false, .7, 2.6); impact(p, 4 * k); light(p, c, 6 * k); for (let i = 0; i < 6 * k; i++) parts.push({ p: p.clone(), v: V3(R(-10, 10), R(10, 30), R(-10, 10)), life: 1.6, c: pick(['#3a3440', '#4a4450']), g: -4, s: 3, n: true }); shake = Math.max(shake, 5 * k); }
  // 바위의 호흡: 쇠사슬 철구 (손 → 상대 → 되돌아옴)
  const linkMat = toon('#6a6a72'), ballMat = toon('#3a3a40'), axeMat = toon('#9aa0aa');
  function flail(a, b, dur, onHit, axe) {
    const g = new THREE.Group(), links = []; for (let i = 0; i < 16; i++) { const l = new THREE.Mesh(sphG, linkMat); l.scale.setScalar(.8); g.add(l); links.push(l); }
    const ball = new THREE.Group(); ball.add(new THREE.Mesh(sphG, ballMat)); ball.children[0].scale.setScalar(5); for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(coneG, ballMat); s.scale.set(1, 3, 1); const an = i / 8 * PI * 2; s.position.set(Math.cos(an) * 5, Math.sin(an) * 5, 0); s.rotation.z = an - PI / 2; ball.add(s); }
    if (axe) { const ax = new THREE.Mesh(boxG, axeMat); ax.scale.set(1, 9, 7); ball.add(ax); }
    g.add(ball); scene3.add(g); let hit = false;
    return addLive({ g, max: dur + .1, upd: (dt, t, L) => {
      const u = Math.min(1, L.t / dur), out = u < .5 ? ease(u * 2) : 1 - ease((u - .5) * 2), h = handP(a), tp = chest(b), p = h.clone().lerp(tp, out).add(V3(0, Math.sin(out * PI) * 18, 0));
      ball.position.copy(p); ball.rotation.x += dt * 14; links.forEach((l, i) => { const k = (i + 1) / (links.length + 1); l.position.copy(h.clone().lerp(p, k).add(V3(0, Math.sin(k * PI) * 6 * out, 0))); });
      parts.push({ p: p.clone(), v: V3(R(-20, 20), R(-5, 20), R(-20, 20)), life: .4, c: pick(STY.stone.parts), g: 200, s: 1 });
      if (!hit && u >= .5) { hit = true; onHit(p); }
    } });
  }
  function rockShatter(p, k = 1) { for (let i = 0; i < 26 * k; i++) parts.push({ p: V3(p.x + R(-6, 6), .5, p.z + R(-6, 6)), v: V3(R(-70, 70), R(80, 200), R(-70, 70)).multiplyScalar(Math.sqrt(k)), life: R(.8, 1.3), c: pick(STY.stone.parts), g: 340, s: pick([2, 3]) }); ring(V3(p.x, .4, p.z), 5 * k, '#c8a878', true, 1, 2.6); moses(V3(p.x, 0, p.z).add(V3(-20 * k, 0, 0)), V3(p.x, 0, p.z).add(V3(20 * k, 0, 0)), 8 * k, 2); scorch(p, 10 * k); shake = Math.max(shake, 8 * k); }
  // 해 무리(일훈): 등 뒤 커다란 해 고리와 빛살
  function sunHalo(a, life = 1.6) { const g = new THREE.Group(); const r1 = new THREE.Sprite(spriteMat(ringTex, '#ffb030', .95)), r2 = new THREE.Sprite(spriteMat(glowTex, '#ff6a10', .7)), r3 = new THREE.Sprite(spriteMat(flareTex, '#fff2c0', .9)); r1.scale.set(70, 70, 1); r2.scale.set(90, 90, 1); r3.scale.set(60, 60, 1); g.add(r2, r1, r3); scene3.add(g);
    addLive({ g, max: life, upd: (dt, t, L) => { g.position.copy(chest(a)).addScaledVector(fwdOf(a), -10).add(V3(0, 8, 0)); r3.material.rotation += dt * 2; const k = Math.min(1, L.t * 4) * Math.min(1, (life - L.t) * 2); opSet(g, k); r1.scale.setScalar(60 + L.t * 20); } }); }
  // 안개 장막
  function mistVeil(p, n = 90, rad = 40) { for (let i = 0; i < n; i++) parts.push({ p: p.clone().add(V3(R(-rad, rad), R(0, 18), R(-rad, rad))), v: V3(R(-6, 6), R(1, 6), R(-6, 6)), life: R(1.6, 2.4), c: pick(['#eef3f8', '#ffffff', '#d8e2ec']), g: -1, s: 3, n: true }); }
  // 회오리: 세 가닥 나선 띠가 솟으며 돎
  function tornado(p, sty, h = 60, r = 16) { for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i < 40; i++) { const u = i / 39, an = u * PI * 6 + k * 2.1, rr = r * (.5 + u * .8); pts.push(V3(Math.cos(an) * rr, u * h, Math.sin(an) * rr)); } const L = ribbon(pts, UP, 3.2, sty, { dur: .35, life: 1.4 }); L.g.position.copy(p).setY(0); L.upd2 = L.upd; L.upd = (dt, t, o) => { L.upd2(dt, t, o); L.g.rotation.y += dt * 7; }; } }
  // 잔잔한 물결: 수면처럼 고요한 원판이 퍼짐
  function stillWater(p) { const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), addMat('#9fd8ff', .35)); m.rotation.x = -PI / 2; const g = new THREE.Group(); g.add(m); g.position.set(p.x, .35, p.z); scene3.add(g);
    addLive({ g, max: 1.8, upd: (dt, t, L) => { const s = 10 + ease(Math.min(1, L.t / 1.2)) * 55; m.scale.set(s, s, 1); opSet(g, Math.min(1, (1.8 - L.t) * 1.5)); } }); for (let i = 0; i < 4; i++) pending.push({ t: i * .22, fn: () => ring(V3(p.x, .4, p.z), 6, '#cfefff', true, 1.4, 3) }); }
  // 폭포(용소): 위에서 아래로 쏟아지는 물줄기 띠 여러 가닥
  function waterfall(p) { for (let k = 0; k < 6; k++) { const x = R(-9, 9), z = R(-9, 9); ribbon(linePts(V3(p.x + x, p.y + 55, p.z + z), V3(p.x + x * .6, 1, p.z + z * .6), 14, (u) => [Math.sin(u * 6 + k) * 1.5, 0]), V3(1, 0, 0), R(2.5, 4), 'water', { dur: .2, life: 1.1, prof: u => .5 + u * .6 }); } for (let i = 0; i < 30; i++) parts.push({ p: V3(p.x + R(-8, 8), 1, p.z + R(-8, 8)), v: V3(R(-60, 60), R(60, 150), R(-60, 60)), life: 1, c: pick(STY.water.parts), g: 260, s: 2 }); ring(V3(p.x, .4, p.z), 6, '#cfefff', true, 1.2, 2.8); }
  // 할퀸 자국(짐승의 호흡): 들쭉날쭉한 평행 자국 여러 줄
  function claws(a, b, n = 3, cross) { const fw = fwOf(a, b), rt = V3(-fw.z, 0, fw.x), c = chest(b); [1, cross ? -1 : 0].forEach(sgn => { if (!sgn) return; for (let k = 0; k < n; k++) { const off = (k - (n - 1) / 2) * 4.5, dir = UP.clone().multiplyScalar(.8).addScaledVector(rt, .6 * sgn).normalize(), side = rt.clone().multiplyScalar(-sgn * .6).addScaledVector(UP, .8).normalize(); const p0 = c.clone().addScaledVector(dir, 16).addScaledVector(fw, -2).addScaledVector(side.clone().cross(fw).normalize(), off), p1 = c.clone().addScaledVector(dir, -16).addScaledVector(side.clone().cross(fw).normalize(), off);
    ribbon(linePts(p0, p1, 14, (u, i) => [i % 2 ? 1.4 : -1.4, 0]), fw, 1.8, 'beast', { dur: .08, life: .8 }); } }); }
  // 공통 기운: 시전 때 몸 주위로 호흡 색 기운
  function aura(a, sty, big) { const S = STY[sty], g = V3(a.pos.x, .4, a.pos.z); ring(g, big ? 5 : 3, S.c, true, 1, big ? 2.8 : 2); for (let i = 0; i < (big ? 50 : 22); i++) { const an = R(0, PI * 2), r = R(3, 9); parts.push({ p: g.clone().add(V3(Math.cos(an) * r, R(0, 6), Math.sin(an) * r)), v: V3(-Math.cos(an) * 12, R(40, 110), -Math.sin(an) * 12), life: 1, c: pick(S.parts), g: S.g * .2, s: 2 }); } light(chest(a), S.c, big ? 7 : 4); if (sty === 'mist') mistVeil(a.pos, 30, 14); }
  const surf = (a, b) => { const fw = fwOf(a, b), c = chest(b); for (let i = 0; i < 40; i++) { const s = R(-1, 1); parts.push({ p: c.clone().add(V3(-fw.z * s * 20, R(-2, 2), fw.x * s * 20)), v: fw.clone().multiplyScalar(R(40, 120)).add(V3(0, R(30, 90), 0)), life: 1, c: pick(STY.water.parts), g: 240, s: pick([1, 2]) }); } ring(V3(b.pos.x, .4, b.pos.z), 5, '#cfefff', true, 1.1, 2.6); };
  const hitAt = (a, b, sty, nm, pw, o = 'hit') => resolve(a, b, STY[sty].ek, o, nm, pw);
  const atkPose = { guard: { pose: 'guard' }, block: { pose: 'block' } };

  // ═══ 동작 틀 ═══
  // 1) 형(여러 번 베기): 접근 → 준비 자세(외침) → 베기마다 칼 궤적 띠 → 마지막에 판정
  function form(a, b, o) {
    const sty = o.sty, ek = STY[sty].ek, st = [...approach(a, b, o.reach || 11, o.run || 'k_run')];
    st.push(step(o.prepT || .32, [[a, { pose: o.prep || 'k_hasso', aura: 1, elem: ek, face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, sty, o.ult); if (o.pre) o.pre(a, b); }));
    o.cuts.forEach((c, i) => { const last = i === o.cuts.length - 1, [pose, a0, a1, tilt, r, w, d, fwd] = c;
      st.push(step(d || .14, [[a, { pose, k: 96, face: b, fwd: fwd ?? 45, elem: ek, spin: o.spin || 0 }], [b, { ...(last ? atkPose.guard : atkPose.block), face: a }]], () => {
        slashArc(a, b, sty, a0, a1, r || 18, tilt || 0, w || 5, { dur: (d || .14) * .8, life: o.life || .9 });
        if (o.each) o.each(a, b, i); if (last) { hitAt(a, b, sty, o.nm + '!', o.pw || 1.3); if (o.fin) o.fin(a, b); } else if (i % 2 === 0) hitAt(a, b, sty, '', .5, 'block'); }));
    });
    st.push(step(.22, [[a, { pose: o.end || 'k_chudan', face: b, spin: 0 }], [b, { pose: 'guard', face: a }]])); return st;
  }
  // 2) 돌진 베기: 낮게 웅크렸다 상대를 꿰뚫고 지나감 (궤적 모양: 직선·지그재그·뱀)
  function dash(a, b, o) {
    const sty = o.sty, ek = STY[sty].ek; let p0, p1;
    return [step(o.prepT || .4, [[a, { pose: o.hold || 'k_iaiReady', aura: 1, elem: ek, face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, sty, o.ult); if (o.pre) o.pre(a, b); }),
      step(o.d || .16, [[a, { pose: o.cut || 'k_iaiCut', k: 98, ghost: 1, elem: ek, face: b, to: () => b.pos.clone().addScaledVector(fwOf(a, b), o.over || 22) }], [b, { pose: 'guard', face: a }]], () => {
        p0 = chest(a); p1 = chest(b).addScaledVector(fwOf(a, b), o.over || 22); const n = o.n || 24;
        const pts = linePts(p0, p1, n, o.path === 'zig' ? (u, i) => [i % 4 < 2 ? 7 : -7, (i % 3) * 2] : o.path === 'snake' ? u => [Math.sin(u * PI * 4) * 8, 0] : o.path === 'coil' ? u => [Math.sin(u * PI * 6) * 6, Math.cos(u * PI * 6) * 6] : null);
        ribbon(pts, UP, o.w || 4, sty, { dur: (o.d || .16) * .9, life: o.life || 1 }); if (o.trail) o.trail(a, b, pts);
        for (let i = 0; i < 5; i++) pending.push({ t: i * .03, fn: () => ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .7, color: STY[sty].c, dec: .25 }) });
        pending.push({ t: (o.d || .16) * .5, fn: () => { hitAt(a, b, sty, o.nm + '!', o.pw || 1.4); if (o.fin) o.fin(a, b); } }); }),
      step(.3, [[a, { pose: o.end || 'k_kesa', face: b }], [b, { pose: 'hurt', face: a }]])];
  }
  // 3) 뛰어올라 내려베기
  function leap(a, b, o) {
    const sty = o.sty, ek = STY[sty].ek;
    return [step(.28, [[a, { pose: o.prep || 'k_jodan', aura: 1, elem: ek, face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, sty, o.ult); if (window.MV) MV.arc(a, b.pos.clone().addScaledVector(fwOf(b, a), 9).setY(0), .5, o.h || 34); else { a.vel.y = 240; a.air = true; } }),
      step(.48, [[a, { pose: o.air || 'flipAir', face: b, elem: ek, tilt: o.tilt || 0 }], [b, { pose: 'guard', face: a }]], () => { if (o.inAir) o.inAir(a, b); }),
      step(.16, [[a, { pose: o.cut || 'k_kesa', k: 98, face: b, tilt: 0, elem: ek }], [b, { pose: 'guard', face: a }]], () => { slashArc(a, b, sty, 1.9, -1.3, o.r || 22, o.cutTilt || 0, o.w || 6, { dur: .12, life: 1 }); hitAt(a, b, sty, o.nm + '!', o.pw || 1.5); if (o.fin) o.fin(a, b); }),
      step(.28, [[a, { pose: 'landRec', face: b }], [b, { pose: 'hurt', face: a }]])];
  }
  // 4) 회전 베기(주변 모두): 원형 띠 여러 겹
  function spin(a, b, o) {
    const sty = o.sty, ek = STY[sty].ek;
    return [...approach(a, b, o.reach || 12, 'k_run'),
      step(.3, [[a, { pose: o.prep || 'k_waki', aura: 1, elem: ek, face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, sty, o.ult); }),
      step(o.d || .45, [[a, { pose: o.cut || 'k_yoko', spin: o.spinV || 24, k: 96, elem: ek, face: b, tilt: o.tilt || 0 }], [b, { pose: 'block', face: a }]], () => {
        const c = chest(a); for (let k = 0; k < (o.rings || 2); k++) { const pts = []; for (let i = 0; i < 40; i++) { const an = i / 39 * PI * 2.1, r = (o.r || 20) + k * 6; pts.push(c.clone().add(V3(Math.cos(an) * r, (o.helix ? i * .5 : 0) + k * (o.dyk ?? 4) - 4, Math.sin(an) * r))); } pending.push({ t: k * .08, fn: () => ribbon(pts, UP, o.w || 5, sty, { dur: .25, life: 1 }) }); }
        if (o.extra) o.extra(a, b);
        pending.push({ t: .2, fn: () => { others(a).forEach(x => { if (x.pos.distanceTo(a.pos) < (o.rad || 40)) hitAt(a, x, sty, o.nm + '!', o.pw || 1.4); }); } }); }),
      step(.25, [[a, { pose: o.end || 'k_chudan', spin: 0, tilt: 0, face: b }], [b, { pose: 'guard', face: a }]])];
  }
  // 5) 날려 보내는 베기: 초승달 띠가 날아가 맞힘
  function wave(a, b, o) {
    const sty = o.sty, ek = STY[sty].ek;
    return [step(.3, [[a, { pose: o.prep || 'k_hasso', aura: 1, elem: ek, face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, sty, o.ult); }),
      step(.14, [[a, { pose: o.cut || 'k_yoko', k: 96, face: b, elem: ek }], [b, { pose: 'guard', face: a }]], () => {
        for (let k = 0; k < (o.n || 1); k++) pending.push({ t: k * (o.gap || .1), fn: () => {
          const fw = fwOf(a, b), A = arcPts(V3(0, 0, 0), fw, -1.1, 1.1, o.r || 14, (o.tilt ?? PI / 2) + (k % 2 ? .5 : -.3) * (o.n > 1 ? 1 : 0), 22), sp = o.v || 230;
          const L = ribbon(A.pts, A.N, o.w || 4, sty, { dur: .08, life: 2, move: fw.clone().multiplyScalar(sp) }); L.g.position.copy(chest(a)); const tgt = b; let done = false;
          const up0 = L.upd; L.upd = (dt, t, o2) => { up0(dt, t, o2); if (!done && L.g.position.distanceTo(chest(tgt)) < 12) { done = true; hitAt(a, tgt, sty, o.nm + '!', o.pw || 1.2); if (o.fin) o.fin(a, tgt); L.t = Math.max(L.t, 1.4); } };
        } }); }),
      step(.4, [[a, { pose: o.end || 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])];
  }
  // 6) 발차기(네즈코): 다리 궤적 분홍 불꽃
  function kicks(a, b, o) {
    const st = [...approach(a, b, 9, 'crouchRun')];
    st.push(step(.22, [[a, { pose: 'kickPrep', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, 'blood', o.ult); }));
    for (let i = 0; i < (o.n || 2); i++) { const last = i === (o.n || 2) - 1, pz = pick(['highKick', 'spinKick', 'sweep', 'jumpKnee']);
      st.push(step(.14, [[a, { pose: pz, k: 96, face: b, fwd: 50, spin: pz === 'spinKick' ? 20 : 0, elem: 'blood' }], [b, { pose: last ? 'guard' : 'block', face: a }]], () => {
        const fw = fwOf(a, b), c = a.pos.clone().add(V3(0, pz === 'sweep' ? 4 : 13, 0)).addScaledVector(fw, 4); const A = arcPts(c, fw, pz === 'sweep' ? -.2 : -1.2, pz === 'sweep' ? .2 : 1.3, 13, pz === 'sweep' ? PI / 2 : .5, 22);
        ribbon(A.pts, A.N, 4, 'blood', { dur: .1, life: .8 }); if (last) { hitAt(a, b, 'blood', o.nm + '!', o.pw || 1.4); if (o.fin) o.fin(a, b); } })); }
    st.push(step(.2, [[a, { pose: 'stance', spin: 0, face: b }], [b, { pose: 'guard', face: a }]])); return st;
  }
  // 7) 채찍검(미츠리): 손에서 길게 뻗어 구불거리며 휘감는 분홍 띠 여러 가닥
  function whip(a, b, o) {
    const st = [...approach(a, b, o.reach || 22, 'k_run')];
    st.push(step(.28, [[a, { pose: o.prep || 'k_hasso', aura: 1, elem: 'petal', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, 'love', o.ult); }));
    for (let i = 0; i < (o.n || 2); i++) { const last = i === (o.n || 2) - 1;
      st.push(step(.16, [[a, { pose: pick(['k_yoko', 'k_kesa', 'k_upCut']), k: 96, face: b, spin: o.spinV || 0, elem: 'petal' }], [b, { pose: last ? 'guard' : 'block', face: a }]], () => {
        const h = handP(a), fw = fwOf(a, b), rt = V3(-fw.z, 0, fw.x), side = (i % 2 ? 1 : -1);
        for (let k = 0; k < (o.strands || 3); k++) { const pts = []; for (let j = 0; j < 30; j++) { const u = j / 29, L = (o.len || 34) * u; pts.push(h.clone().addScaledVector(fw, L * Math.cos(u * (o.curl || 2.6) * side)).addScaledVector(rt, L * .6 * Math.sin(u * (o.curl || 2.6)) * side).add(V3(0, Math.sin(u * PI * 3 + k) * 5 + k * 2 - 2, 0))); }
          ribbon(pts, UP, 2.2, 'love', { dur: .14, life: .9, prof: u => .3 + Math.sin(u * PI) * .8 }); }
        for (let k = 0; k < 8; k++) parts.push({ p: h.clone().addScaledVector(fw, R(5, 30)), v: V3(R(-20, 20), R(10, 40), R(-20, 20)), life: 1, c: pick(STY.love.parts), g: -10, s: 2 });
        if (last) { hitAt(a, b, 'love', o.nm + '!', o.pw || 1.3); if (o.fin) o.fin(a, b); } })); }
    st.push(step(.22, [[a, { pose: 'k_chudan', spin: 0, face: b }], [b, { pose: 'guard', face: a }]])); return st;
  }
  // 8) 철구·도끼(히메지마)
  function stone(a, b, o) {
    return [...approach(a, b, o.reach || 26, 'run'),
      step(.4, [[a, { pose: o.prep || 'windBack', aura: 1, elem: 'earth', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, o.nm, o.ult); aura(a, 'stone', o.ult); }),
      step(.7, [[a, { pose: o.cut || 'hammerDown', k: 90, face: b, spin: o.spinV || 0, elem: 'earth' }], [b, { pose: 'block', face: a }]], () => {
        for (let k = 0; k < (o.n || 1); k++) pending.push({ t: k * .18, fn: () => flail(a, b, .6, p => { rockShatter(V3(p.x, 0, p.z), o.k || 1); hitAt(a, b, 'stone', o.nm + '!', o.pw || 1.6); if (o.fin) o.fin(a, b, p); }, k % 2 === 1 || o.axe) }); }),
      step(.25, [[a, { pose: 'braced', spin: 0, face: b }], [b, { pose: 'hurt', face: a }]])];
  }
  const set = (key, specs) => { Object.entries(specs).forEach(([k, fn]) => { CH[key].skills[k] = fn; window.CANON.add(k); }); };
  const PI2 = PI / 2;

  // ═══ 탄지로: 물의 호흡 + 히노카미 카구라 ═══
  set('tanjiro', {
    '물의 호흡 · 수면 베기': (a, b) => form(a, b, { sty: 'water', nm: '물의 호흡 제1형 · 수면 베기', prep: 'k_waki', cuts: [['k_yoko', -1.6, 1.6, PI2, 22, 6]], pw: 1.3, fin: surf }),
    '물의 호흡 · 유류무': (a, b) => dash(a, b, { sty: 'water', nm: '물의 호흡 제3형 · 유류무', hold: 'k_chudan', cut: 'k_yoko', path: 'snake', d: .3, w: 5, trail: (a2, b2, pts) => pts.forEach((p, i) => { if (i % 6 === 3) slashArc(a2, b2, 'water', -1, 1, 10, PI2, 3, { dur: .1, life: .7 }); }) }),
    '생생유전': (a, b) => { const c0 = a.pos.clone(); return [step(.3, [[a, { pose: 'k_chudan', aura: 1, elem: 'water', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '물의 호흡 제10형 · 생생유전', true); aura(a, 'water', true); }),
      step(.9, [[a, { pose: 'k_yoko', spin: 14, k: 90, elem: 'water', face: b, to: () => b.pos.clone().addScaledVector(fwOf(b, a), 10) }], [b, { pose: 'block', face: a }]], () => {
        const p0 = chest(a), p1 = chest(b), d = p1.clone().sub(p0), pts = []; for (let i = 0; i < 60; i++) { const u = i / 59, an = u * PI * 5, r = 16 * (1 - u * .6); pts.push(p0.clone().addScaledVector(d, u).add(V3(Math.cos(an) * r, Math.sin(an) * r * .6 + 4, Math.sin(an) * r * .4))); }
        beast('dragon', pts, 'water', .85, { w: 6.5, scale: 1 }); for (let k = 0; k < 3; k++) pending.push({ t: .25 * k, fn: () => slashArc(a, b, 'water', -1.4, 1.4, 16 + k * 3, PI2 - .4 + k * .4, 4, { life: .7 }) });
        pending.push({ t: .82, fn: () => { hitAt(a, b, 'water', '생생유전!', 2.4); explode(chest(b), 'water', 2); } }); }),
      step(.3, [[a, { pose: 'k_kesa', spin: 0, face: b }], [b, { pose: 'hurt', face: a }]])]; },
    '히노카미 카구라 · 원무': (a, b) => form(a, b, { sty: 'sun', nm: '히노카미 카구라 · 원무', prep: 'k_jodan', cuts: [['k_kesa', 1.8, -4.3, 0, 20, 6.5, .2]], pw: 1.6, fin: (a2) => ring(chest(a2), 4, '#ffb030', false, 1, 2.6) }),
    '히노카미 카구라 · 일훈': (a, b) => [step(.4, [[a, { pose: 'k_hasso', aura: 1, elem: 'sun', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '히노카미 카구라 · 일훈의 용 · 두무', true); sunHalo(a, 2.2); aura(a, 'sun', true); }),
      step(.8, [[a, { pose: 'k_yoko', k: 92, ghost: 1, elem: 'sun', face: b, to: () => b.pos.clone().addScaledVector(fwOf(a, b), 20) }], [b, { pose: 'block', face: a }]], () => {
        const p0 = chest(a), p1 = chest(b).addScaledVector(fwOf(a, b), 20), pts = linePts(p0, p1, 50, u => [Math.sin(u * PI * 3) * 14, Math.sin(u * PI * 2) * 6 + 4]);
        beast('dragon', pts, 'sun', .7, { w: 6 }); for (let k = 0; k < 4; k++) pending.push({ t: k * .16, fn: () => { slashArc(a, b, 'sun', -1.6, 1.6, 15, PI2 + (k % 2 ? .6 : -.6), 4.5, { life: .8 }); if (k % 2) hitAt(a, b, 'sun', '', .6, 'block'); } });
        pending.push({ t: .65, fn: () => { hitAt(a, b, 'sun', '일훈의 용 · 두무!', 2.6); ultBlast(chest(b), 'sun', 60, a, '일훈!'); } }); }),
      step(.3, [[a, { pose: 'k_kesa', face: b }], [b, { pose: 'hurt', face: a }]])],
    '물레': (a, b) => leap(a, b, { sty: 'water', nm: '물의 호흡 제2형 · 물레', air: 'flipAir', tilt: 0, inAir: (a2, b2) => slashArc(a2, b2, 'water', 0, PI * 2, 14, 0, 5, { dur: .35, life: 1, fwd: 0 }), pw: 1.5 }),
    '용소': (a, b) => leap(a, b, { sty: 'water', nm: '물의 호흡 제8형 · 용소', h: 46, air: 'k_jodan', r: 26, w: 7, pw: 1.9, ult: true, fin: (a2, b2) => waterfall(chest(b2)) }),
    '벽라의 하늘': (a, b) => leap(a, b, { sty: 'sun', nm: '히노카미 카구라 · 벽라의 하늘', h: 30, air: 'flipAir', inAir: (a2, b2) => { for (let k = 0; k < 2; k++) pending.push({ t: k * .15, fn: () => slashArc(a2, b2, 'sun', 0, PI * 2, 15 + k * 3, .2, 5, { dur: .25, life: .9, fwd: 0 }) }); }, pw: 1.7 }),
    '휘휘은광': (a, b) => spin(a, b, { sty: 'sun', nm: '히노카미 카구라 · 휘휘은광', prep: 'k_jodan', cut: 'k_kesa', rings: 3, helix: true, r: 18, w: 6, rad: 46, pw: 2, ult: true, extra: a2 => sunHalo(a2, 1.4) }),
  });
  // ═══ 네즈코: 혈귀술 폭혈(분홍 불꽃)·발차기 ═══
  const bloodBurst = (p, k = 1) => { for (let i = 0; i < 40 * k; i++) parts.push({ p: p.clone().add(V3(R(-5, 5), R(-5, 5), R(-5, 5))), v: V3(R(-50, 50), R(20, 120), R(-50, 50)).multiplyScalar(k), life: R(.6, 1.1), c: pick(STY.blood.parts), g: -50, s: pick([2, 3]) }); ring(p, 3 * k, '#ff3a7a', false, .9, 2.6); emitters.push({ k: 'flames', p: V3(p.x, 0, p.z), life: .9, fire: true }); light(p, '#ff3a7a', 7 * k); };
  set('nezuko', {
    '혈귀술 · 폭혈': (a, b) => [step(.35, [[a, { pose: 'openPalm', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '혈귀술 · 폭혈'); aura(a, 'blood'); for (let i = 0; i < 30; i++) parts.push({ p: chest(a), v: chest(b).sub(chest(a)).normalize().multiplyScalar(R(150, 260)).add(V3(R(-20, 20), R(-20, 20), R(-20, 20))), life: .5, c: pick(STY.blood.parts), g: 0, s: 2 }); }),
      step(.3, [[a, { pose: 'openPalm', face: b }], [b, { pose: 'hurt', face: a }]], () => { bloodBurst(chest(b), 1.4); hitAt(a, b, 'blood', '폭혈!', 1.5); }), step(.2, [[a, { pose: 'stance', face: b }], [b, { pose: 'guard', face: a }]])],
    '발차기': (a, b) => kicks(a, b, { nm: '네즈코 발차기', n: 3, fin: (a2, b2) => bloodBurst(chest(b2), .7) }),
    '귀화': (a, b) => [step(.5, [[a, { pose: 'kneel', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '귀화 · 폭주', true); aura(a, 'blood', true); for (let k = 0; k < 6; k++) { const an = k / 6 * PI * 2; ribbon(linePts(a.pos.clone().add(V3(0, 2, 0)), a.pos.clone().add(V3(Math.cos(an) * 10, 26, Math.sin(an) * 10)), 16, u => [Math.sin(u * 9) * 2, 0]), UP, 1.6, 'blood', { dur: .3, life: 1.4 }); } giants.push({ f: a, color: '#ff4a7a', life: 3 }); }),
      ...kicks(a, b, { nm: '폭주 발차기', n: 4, pw: 2, ult: true, fin: (a2, b2) => bloodBurst(chest(b2), 1.6) })],
    '폭혈 연쇄': (a, b) => [step(.35, [[a, { pose: 'openPalm', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '혈귀술 · 폭혈 연쇄'); aura(a, 'blood'); }),
      step(.6, [[a, { pose: 'skySweep', face: b }], [b, { pose: 'block', face: a }]], () => { for (let k = 0; k < 5; k++) pending.push({ t: k * .1, fn: () => bloodBurst(chest(b).add(V3(R(-12, 12), R(-6, 10), R(-12, 12))), .8) }); pending.push({ t: .5, fn: () => hitAt(a, b, 'blood', '폭혈 연쇄!', 1.6) }); }), step(.2, [[a, { pose: 'stance', face: b }], [b, { pose: 'hurt', face: a }]])],
    '거대화': (a, b) => [step(.5, [[a, { pose: 'braced', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '혈귀화 · 거대화', true); aura(a, 'blood', true); a.mode = 5; a.modeElem = 'blood'; giants.push({ f: a, color: '#ff4a7a', life: 5 }); bloodBurst(chest(a), 1); }),
      ...kicks(a, b, { nm: '거대 발차기', n: 2, pw: 2, fin: (a2, b2) => { bloodBurst(chest(b2), 1.4); rockShatter(V3(b2.pos.x, 0, b2.pos.z), .8); } })],
    '머리박기': (a, b) => dash(a, b, { sty: 'blood', nm: '머리박기', hold: 'crouchRun', cut: 'shoulder', over: 4, w: 3, fin: (a2, b2) => { impact(chest(b2), 8); shake = 12; label(headP(b2).add(V3(0, 4, 0)), '딱!', '#ffffff', { big: true }); } }),
    '폭혈 발차기': (a, b) => kicks(a, b, { nm: '폭혈 화염 발차기', n: 3, pw: 1.5, fin: (a2, b2) => bloodBurst(chest(b2), 1.2) }),
    '연속 할퀴기': (a, b) => { const st = [...approach(a, b, 8, 'crouchRun'), step(.2, [[a, { pose: 'm_low', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => callout(a, '연속 할퀴기'))];
      for (let i = 0; i < 5; i++) st.push(step(.1, [[a, { pose: pick(['slash', 'palm', 'elbow']), k: 96, face: b, fwd: 40 }], [b, { pose: 'block', face: a }]], () => { const fw = fwOf(a, b), c = chest(b); for (let k = 0; k < 3; k++) ribbon(linePts(c.clone().add(V3(R(-3, 3), 9 + k * 1.5, 0)).addScaledVector(fw, -3), c.clone().add(V3(R(-3, 3), -8 + k * 1.5, 0)).addScaledVector(V3(-fw.z, 0, fw.x), i % 2 ? 8 : -8), 10), fw, 1.1, 'blood', { dur: .06, life: .6 }); if (i === 4) hitAt(a, b, 'blood', '할퀴기!', 1.2); }));
      return st; },
    '폭혈 회오리': (a, b) => spin(a, b, { sty: 'blood', nm: '혈귀술 · 폭혈 회오리', prep: 'kickPrep', cut: 'spinKick', rings: 3, helix: true, r: 14, rad: 42, pw: 1.8, ult: true, extra: a2 => { for (let k = 0; k < 6; k++) pending.push({ t: k * .07, fn: () => bloodBurst(a2.pos.clone().add(V3(Math.cos(k) * 16, 6, Math.sin(k) * 16)), .7) }); } }),
  });
  // ═══ 젠이츠: 벼락의 호흡 (발도 → 노란 지그재그 번개 질주) ═══
  const thunderClap = p => { for (let i = 0; i < 4; i++) bolt(p.clone().add(V3(R(-12, 12), R(10, 30), R(-12, 12))), p.clone(), '#fff2a0', .45, 1.3); ring(p, 3, '#ffd820', false, .6, 2.8); flashScreen(.06, '255,240,160'); };
  const zDash = (nm, k, o = {}) => (a, b) => { const st = [step(.45, [[a, { pose: 'k_iaiReady', aura: 1, elem: 'bolt', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, nm, o.ult); aura(a, 'thunder', o.ult); for (let i = 0; i < 8; i++) parts.push({ p: a.pos.clone().add(V3(R(-4, 4), 1, R(-4, 4))), v: V3(R(-30, 30), R(5, 30), R(-30, 30)), life: .6, c: '#ffe060', g: 0, s: 1 }); })];
    for (let i = 0; i < k; i++) { const last = i === k - 1; st.push(step(.09, [[a, { pose: 'k_iaiCut', k: 99, ghost: 1, elem: 'bolt', face: b, to: () => b.pos.clone().add(V3(Math.cos(i * 2.3 + 1) * 24, 0, Math.sin(i * 2.3 + 1) * 24)) }], [b, { pose: last ? 'hurt' : 'block', face: a }]], () => {
      const p0 = chest(a), p1 = chest(b).add(V3(Math.cos(i * 2.3 + 1) * 24, 0, Math.sin(i * 2.3 + 1) * 24)); ribbon(linePts(p0, p1, 16, (u, j) => [j % 4 < 2 ? 4 : -4, (j % 3) * 1.5]), UP, 2.2, 'thunder', { dur: .06, life: .7 }); thunderClap(chest(b));
      if (last) hitAt(a, b, 'thunder', nm + '!', o.pw || 1.5); else if (i % 2) hitAt(a, b, 'thunder', '', .5, 'block'); })); }
    st.push(step(.4, [[a, { pose: 'k_iaiCut', face: b }], [b, { pose: 'hurt', face: a }]], () => { label(headP(a).add(V3(0, 4, 0)), '…찰칵', '#ffe060'); })); return st; };
  set('zenitsu', {
    '벽력일섬': (a, b) => dash(a, b, { sty: 'thunder', nm: '벼락의 호흡 제1형 · 벽력일섬', hold: 'k_iaiReady', cut: 'k_iaiCut', path: 'zig', d: .1, w: 3, prepT: .55, fin: (a2, b2) => thunderClap(chest(b2)) }),
    '벽력일섬 · 육연': zDash('벽력일섬 · 육연', 6),
    '화뢰신': (a, b) => [step(.6, [[a, { pose: 'k_iaiReady', aura: 1, elem: 'bolt', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '벼락의 호흡 제7형 · 화뢰신', true); aura(a, 'thunder', true); for (let i = 0; i < 6; i++) pending.push({ t: i * .08, fn: () => bolt(chest(a).add(V3(R(-8, 8), 20, R(-8, 8))), a.pos.clone(), '#ffd820', .4, 1.2) }); }),
      step(.45, [[a, { pose: 'k_iaiCut', k: 99, ghost: 1, elem: 'bolt', face: b, to: () => b.pos.clone().addScaledVector(fwOf(a, b), 30) }], [b, { pose: 'block', face: a }]], () => {
        const p0 = chest(a), p1 = chest(b).addScaledVector(fwOf(a, b), 30), pts = linePts(p0, p1, 40, u => [Math.sin(u * PI * 2) * 10, Math.sin(u * PI) * 10]);
        beast('dragon', pts, 'thunder', .4, { c: '#ffb000', c2: '#ff6a10', w: 7, scale: 1.3, onHead: p => { if (Math.random() < .5) bolt(p, p.clone().add(V3(R(-14, 14), R(-14, 14), R(-14, 14))), '#fff2a0', .3, 1); parts.push({ p: p.clone(), v: V3(R(-20, 20), R(20, 60), R(-20, 20)), life: .8, c: pick(STY.flame.parts), g: -40, s: 3 }); } });
        pending.push({ t: .3, fn: () => { hitAt(a, b, 'thunder', '화뢰신!', 2.8); ultBlast(chest(b), 'bolt', 70, a, '화뢰신!'); thunderClap(chest(b)); } }); }),
      step(.45, [[a, { pose: 'k_iaiCut', face: b }], [b, { pose: 'hurt', face: a }]])],
    '벽력일섬 팔연': zDash('벽력일섬 · 팔연', 8),
    '벽력일섬 신속': zDash('벽력일섬 · 신속', 3, { pw: 1.8 }),
    '뇌광 발도': (a, b) => wave(a, b, { sty: 'thunder', nm: '벼락의 호흡 · 뇌광 발도', prep: 'k_iaiReady', cut: 'k_iaiCut', v: 360, w: 3, r: 12, fin: (a2, b2) => thunderClap(chest(b2)) }),
    '번개 연격': (a, b) => form(a, b, { sty: 'thunder', nm: '벼락의 호흡 · 연격', prep: 'k_iaiReady', cuts: [['k_iaiCut', -1, 1, PI2, 16, 3, .08], ['k_kesa', 1.6, -1, .5, 16, 3, .08], ['k_upCut', -1.2, 1.5, -.4, 16, 3, .08], ['k_iaiCut', -1.2, 1.2, PI2, 18, 3.5, .08]], each: (a2, b2) => thunderClap(chest(b2)) }),
    '잠든 일섬': (a, b) => [step(.6, [[a, { pose: 'kneel', elem: 'bolt', face: b }], [b, { pose: 'stance', face: a }]], () => { label(headP(a).add(V3(0, 6, 0)), 'Zzz…', '#ffffff'); }), ...dash(a, b, { sty: 'thunder', nm: '잠든 젠이츠 · 벽력일섬', path: 'zig', d: .09, w: 3.4, pw: 1.9, fin: (a2, b2) => thunderClap(chest(b2)) })],
    '번개 낙뢰': (a, b) => leap(a, b, { sty: 'thunder', nm: '벼락의 호흡 · 낙뢰', h: 60, air: 'k_iaiReady', cut: 'k_iaiCut', pw: 1.7, fin: (a2, b2) => { const p = b2.pos.clone(); for (let i = 0; i < 6; i++) bolt(p.clone().add(V3(R(-8, 8), 180, R(-8, 8))), p.clone().add(V3(0, 1, 0)), i ? '#ffd820' : '#ffffff', 1, 2.2); pillar(p, 16, '#ffd820', 1); scorch(p, 16); } }),
  });
  // ═══ 이노스케: 짐승의 호흡 (들쭉날쭉 두 칼, 할퀸 자국) ═══
  set('inosuke', {
    '짐승의 호흡 · 찢어 베기': (a, b) => form(a, b, { sty: 'beast', nm: '짐승의 호흡 제2의 엄니 · 찢어 베기', prep: 'k_dual', run: 'crouchRun', cuts: [['k_dualOpen', 1.4, -1.2, .7, 16, 3, .12], ['k_dualOpen', 1.4, -1.2, -.7, 16, 3, .12]], fin: (a2, b2) => claws(a2, b2, 3, true) }),
    '짐승의 호흡 · 미친 베기': (a, b) => spin(a, b, { sty: 'beast', nm: '짐승의 호흡 제6의 엄니 · 미친 베기', prep: 'k_dual', cut: 'k_dualOpen', rings: 4, r: 15, dyk: 5, rad: 38, pw: 1.6, spinV: 30, extra: (a2, b2) => { for (let k = 0; k < 4; k++) pending.push({ t: k * .09, fn: () => claws(a2, b2, 2, k % 2 === 0) }); } }),
    '공간 식각': (a, b) => [step(.4, [[a, { pose: 'm_low', aura: 1, elem: 'slash', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '짐승의 호흡 제7의 엄니 · 공간 식각'); aura(a, 'beast'); for (let k = 0; k < 3; k++) ring(V3(a.pos.x, .5, a.pos.z), 10 + k * 14, '#b8c8d8', true, 1.2, 3); }), ...wave(a, b, { sty: 'beast', nm: '날아가는 엄니', prep: 'k_dual', cut: 'k_dualOpen', n: 2, v: 280, w: 3, fin: (a2, b2) => claws(a2, b2, 3, true) })],
    '꿰뚫기': (a, b) => dash(a, b, { sty: 'beast', nm: '짐승의 호흡 제1의 엄니 · 꿰뚫기', hold: 'k_dual', cut: 'k_tsuki', w: 2.4, over: 10, trail: (a2, b2, pts) => ribbon(pts.map(p => p.clone().add(V3(0, -3, 0))), UP, 2.2, 'beast', { dur: .12, life: .9 }), fin: (a2, b2) => claws(a2, b2, 2, false) }),
    '썰기': (a, b) => form(a, b, { sty: 'beast', nm: '짐승의 호흡 제2의 엄니 · 썰기', prep: 'k_dual', run: 'crouchRun', cuts: [['k_dualOpen', -1.5, 1.5, PI2, 18, 3.5]], fin: (a2, b2) => claws(a2, b2, 3, false) }),
    '물어뜯기': (a, b) => form(a, b, { sty: 'beast', nm: '짐승의 호흡 제3의 엄니 · 물어뜯기', prep: 'k_dualOpen', run: 'crouchRun', cuts: [['k_dual', 1.5, -.2, PI2 - .3, 15, 3.5, .12], ['k_dual', -1.5, .2, PI2 + .3, 15, 3.5, .1]], fin: (a2, b2) => claws(a2, b2, 4, true) }),
    '난항 베기': (a, b) => form(a, b, { sty: 'beast', nm: '짐승의 호흡 제5의 엄니 · 난항 베기', prep: 'k_dual', run: 'crouchRun', cuts: Array.from({ length: 6 }, (_, i) => [i % 2 ? 'k_dualOpen' : 'k_dual', R(-2, 2), R(-2, 2), R(-1.5, 1.5), R(13, 18), 2.6, .08, 20]), fin: (a2, b2) => claws(a2, b2, 3, true) }),
    '폭렬 돌진': (a, b) => dash(a, b, { sty: 'beast', nm: '짐승의 호흡 제8의 엄니 · 폭렬 돌진', hold: 'm_low', cut: 'shoulder', over: 8, w: 6, d: .22, fin: (a2, b2) => { rockShatter(V3(b2.pos.x, 0, b2.pos.z), .9); claws(a2, b2, 3, true); } }),
    '돌린 베기': (a, b) => spin(a, b, { sty: 'beast', nm: '짐승의 호흡 제10의 엄니 · 원전선회 찢어 베기', prep: 'k_dual', cut: 'k_dualOpen', rings: 3, r: 20, rad: 44, pw: 1.8, ult: true, spinV: 34, extra: (a2, b2) => claws(a2, b2, 4, true) }),
  });
  // ═══ 기유: 물의 호흡 ═══
  set('giyu', {
    '잔잔한 물결': (a, b) => [step(.6, [[a, { pose: 'k_chudan', aura: 1, elem: 'water', face: b }], [b, { pose: 'crouchRun', face: a, to: near(b, a, 9) }]], () => { callout(a, '물의 호흡 제11형 · 잔잔한 물결', true); stillWater(a.pos); }),
      step(.3, [[a, { pose: 'k_yoko', k: 99, face: b, elem: 'water' }], [b, { pose: 'hurt', face: a }]], () => { slashArc(a, b, 'water', -1.4, 1.4, 16, PI2, 3, { dur: .05, life: .6 }); for (let k = 0; k < 5; k++) slashArc(a, b, 'water', R(-2, 2), R(-2, 2), 14, R(-1.5, 1.5), 2, { dur: .05, life: .5 }); hitAt(a, b, 'water', '잔잔한 물결!', 1.8, pick(['hit', 'block'])); }),
      step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])],
    '물의 호흡 · 타격의 물결': (a, b) => leap(a, b, { sty: 'water', nm: '물의 호흡 제2형 · 물레', air: 'flipAir', inAir: (a2, b2) => slashArc(a2, b2, 'water', 0, PI * 2, 14, 0, 5, { dur: .35, life: 1, fwd: 0 }), pw: 1.5 }),
    '물의 호흡 · 수룡': (a, b) => [step(.4, [[a, { pose: 'k_jodan', aura: 1, elem: 'water', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '물의 호흡 · 수룡', true); aura(a, 'water', true); }),
      step(.6, [[a, { pose: 'k_tsuki', k: 96, face: b, elem: 'water' }], [b, { pose: 'block', face: a }]], () => { const p0 = chest(a).add(V3(0, 10, 0)), p1 = chest(b), pts = linePts(p0, p1, 44, u => [Math.sin(u * PI * 3) * 12, Math.sin(u * PI) * 16]); beast('dragon', pts, 'water', .5, { w: 6 }); pending.push({ t: .48, fn: () => { hitAt(a, b, 'water', '수룡!', 2); waterfall(chest(b).add(V3(0, -10, 0))); } }); }),
      step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'hurt', face: a }]])],
    '수면 베기': (a, b) => form(a, b, { sty: 'water', nm: '물의 호흡 제1형 · 수면 베기', prep: 'k_waki', cuts: [['k_yoko', -1.6, 1.6, PI2, 22, 6]], pw: 1.3, fin: surf }),
    '물레': (a, b) => leap(a, b, { sty: 'water', nm: '물의 호흡 제2형 · 물레', air: 'flipAir', inAir: (a2, b2) => slashArc(a2, b2, 'water', 0, PI * 2, 14, 0, 5, { dur: .35, life: 1, fwd: 0 }), pw: 1.5 }),
    '유류무': (a, b) => dash(a, b, { sty: 'water', nm: '물의 호흡 제3형 · 유류무', hold: 'k_chudan', cut: 'k_yoko', path: 'snake', d: .32, w: 5, trail: (a2, b2, pts) => pts.forEach((p, i) => { if (i % 6 === 3) slashArc(a2, b2, 'water', -1, 1, 10, PI2, 3, { dur: .1, life: .7 }); }) }),
    '소용돌이': (a, b) => spin(a, b, { sty: 'water', nm: '물의 호흡 제6형 · 소용돌이', prep: 'k_waki', cut: 'k_yoko', rings: 3, helix: true, r: 16, w: 6, rad: 42, pw: 1.6, spinV: 30, extra: a2 => tornado(a2.pos, 'water', 34, 14) }),
    '물방울 파문 찌르기': (a, b) => dash(a, b, { sty: 'water', nm: '물의 호흡 제7형 · 물방울 파문 찌르기', hold: 'k_chudan', cut: 'k_tsuki', over: 2, w: 1.6, d: .1, fin: (a2, b2) => { const p = chest(b2); for (let k = 0; k < 4; k++) pending.push({ t: k * .1, fn: () => ring(p, 2 + k, '#cfefff', false, .9, 2.2) }); impact(p, 3); } }),
    '용소': (a, b) => leap(a, b, { sty: 'water', nm: '물의 호흡 제8형 · 용소', h: 46, air: 'k_jodan', r: 26, w: 7, pw: 1.9, ult: true, fin: (a2, b2) => waterfall(chest(b2)) }),
  });
  // ═══ 렌고쿠: 불꽃의 호흡 (불꽃 띠, 불꽃 호랑이) ═══
  const tigerCharge = (a, b, nm, pw) => [step(.45, [[a, { pose: 'k_jodan', aura: 1, elem: 'fire', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, nm, true); aura(a, 'flame', true); }),
    step(.55, [[a, { pose: 'k_kesa', k: 96, face: b, elem: 'fire' }], [b, { pose: 'block', face: a }]], () => { const p0 = chest(a).add(V3(0, 18, 0)), p1 = chest(b), pts = linePts(p0, p1, 30, u => [0, Math.sin(u * PI) * 10]); beast('tiger', pts, 'flame', .45, { w: 9, scale: 1.4 }); slashArc(a, b, 'flame', 1.9, -1.4, 24, .2, 7, { life: 1 }); pending.push({ t: .42, fn: () => { hitAt(a, b, 'flame', nm.split(' · ').pop() + '!', pw); ultBlast(chest(b), 'fire', 60, a, '염호!'); } }); }),
    step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'hurt', face: a }]])];
  set('rengoku', {
    '부지화': (a, b) => dash(a, b, { sty: 'flame', nm: '불꽃의 호흡 제1형 · 부지화', hold: 'k_hasso', cut: 'k_kesa', w: 6, d: .18, trail: (a2, b2, pts) => pts.forEach((p, i) => { if (i % 4 === 0) parts.push({ p: p.clone(), v: V3(R(-10, 10), R(40, 90), R(-10, 10)), life: 1, c: pick(STY.flame.parts), g: -60, s: 3 }); }) }),
    '성염의 물결': (a, b) => form(a, b, { sty: 'flame', nm: '불꽃의 호흡 제3형 · 기염만상', prep: 'k_jodan', cuts: [['k_kesa', 2.3, -1.6, -.2, 26, 8, .2]], pw: 1.8, fin: (a2, b2) => { for (let k = 0; k < 3; k++) slashArc(a2, b2, 'flame', 2 - k * .2, -1.4, 20 + k * 4, -.4 + k * .3, 4, { life: .9 }); } }),
    '연옥': (a, b) => [step(.55, [[a, { pose: 'k_waki', aura: 1, elem: 'fire', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '불꽃의 호흡 오의 · 제9형 연옥', true); aura(a, 'flame', true); moses(V3(a.pos.x, 0, a.pos.z), V3(b.pos.x, 0, b.pos.z), 14, 2.6); }),
      step(.4, [[a, { pose: 'k_lowRun', k: 98, ghost: 1, elem: 'fire', face: b, to: () => b.pos.clone().addScaledVector(fwOf(a, b), 26) }], [b, { pose: 'block', face: a }]], () => {
        const p0 = chest(a), p1 = chest(b).addScaledVector(fwOf(a, b), 26), pts = linePts(p0, p1, 40, u => [Math.sin(u * PI * 2) * 8, Math.sin(u * PI) * 6]); beast('dragon', pts, 'flame', .35, { w: 10, scale: 1.5 });
        for (let k = 0; k < 4; k++) ribbon(linePts(p0.clone().add(V3(0, k * 3 - 4, 0)), p1.clone().add(V3(0, k * 3 - 4, 0)), 20, u => [Math.sin(u * PI * 3 + k) * 6, 0]), UP, 4, 'flame', { dur: .3, life: 1.2 });
        pending.push({ t: .25, fn: () => { hitAt(a, b, 'flame', '연옥!', 2.9); ultBlast(chest(b), 'fire', 80, a, '연옥!'); } }); }),
      step(.4, [[a, { pose: 'k_kesa', face: b }], [b, { pose: 'hurt', face: a }]])],
    '성염의 굽이침': (a, b) => spin(a, b, { sty: 'flame', nm: '불꽃의 호흡 제4형 · 성염의 굽이침', prep: 'k_jodan', cut: 'k_kesa', rings: 3, r: 16, w: 7, rad: 36, pw: 1.5, spinV: 18, tilt: .3 }),
    '오르는 염천': (a, b) => form(a, b, { sty: 'flame', nm: '불꽃의 호흡 제2형 · 오르는 염천', prep: 'k_waki', cuts: [['k_upCut', -1.8, 1.9, 0, 22, 7, .18]], pw: 1.6 }),
    '기염만상': (a, b) => form(a, b, { sty: 'flame', nm: '불꽃의 호흡 제3형 · 기염만상', prep: 'k_jodan', cuts: [['k_kesa', 2.3, -1.6, -.2, 26, 8, .2]], pw: 1.8 }),
    '염호': (a, b) => tigerCharge(a, b, '불꽃의 호흡 제5형 · 염호', 2.4),
    '불꽃 연격': (a, b) => form(a, b, { sty: 'flame', nm: '불꽃의 호흡 · 연격', prep: 'k_hasso', cuts: [['k_kesa', 1.6, -1.2, .6, 18, 5, .1], ['k_yoko', -1.4, 1.4, PI2, 18, 5, .1], ['k_upCut', -1.4, 1.6, -.5, 18, 5, .1], ['k_kesa', 1.8, -1.4, -.6, 20, 6, .12]] }),
    '화염 돌진': (a, b) => dash(a, b, { sty: 'flame', nm: '불꽃 돌진 베기', hold: 'k_chudan', cut: 'k_kesa', w: 6 }),
  });
  // ═══ 시노부: 벌레의 호흡 (보라 나비·찌르기) ═══
  const stab = (a, b, n) => { const fw = fwOf(a, b), h = chest(a).addScaledVector(fw, 4); for (let k = 0; k < n; k++) ribbon(linePts(h.clone().add(V3(R(-2, 2), R(-2, 2), 0)), chest(b).add(V3(R(-3, 3), R(-3, 3), 0)), 8), UP, 1, 'insect', { dur: .05, life: .45, prof: u => 1 - u * .8 }); };
  set('shinobu', {
    '나비의 춤 · 장난': (a, b) => leap(a, b, { sty: 'insect', nm: '벌레의 호흡 · 나비의 춤 · 장난', h: 34, prep: 'k_chudan', air: 'flipAir', cut: 'k_tsuki', r: 12, w: 2, inAir: (a2) => butterflies(chest(a2), 10, 12), fin: (a2, b2) => { stab(a2, b2, 4); butterflies(chest(b2), 8, 10); } }),
    '잠자리의 춤 · 복안육각': (a, b) => { const st = [step(.35, [[a, { pose: 'k_chudan', aura: 1, elem: 'insect', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '벌레의 호흡 · 잠자리의 춤 · 복안육각', true); aura(a, 'insect', true); butterflies(chest(a), 6, 10); })];
      for (let i = 0; i < 6; i++) st.push(step(.07, [[a, { pose: 'k_tsuki', k: 99, ghost: 1, face: b, to: () => b.pos.clone().add(V3(Math.cos(i * 1.05) * 14, 0, Math.sin(i * 1.05) * 14)) }], [b, { pose: 'block', face: a }]], () => { stab(a, b, 1); ring(chest(b), 1.4, '#c890ff', false, .5, 2.4); if (i === 5) { hitAt(a, b, 'insect', '복안육각!', 1.9); butterflies(chest(b), 12, 14); } }));
      st.push(step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'hurt', face: a }]])); return st; },
    '지네의 춤 · 백족사행': (a, b) => dash(a, b, { sty: 'insect', nm: '벌레의 호흡 · 지네의 춤 · 백족사행', hold: 'k_lowRun', cut: 'k_tsuki', path: 'zig', d: .35, w: 2.2, n: 40, pw: 1.8, ult: true, fin: (a2, b2) => { stab(a2, b2, 5); butterflies(chest(b2), 10, 12); } }),
    '진곡': (a, b) => dash(a, b, { sty: 'insect', nm: '벌레의 호흡 · 봉아의 춤 · 진곡', hold: 'k_chudan', cut: 'k_tsuki', over: 4, w: 1.4, d: .08, fin: (a2, b2) => { stab(a2, b2, 2); butterflies(chest(b2), 5, 6); impact(chest(b2), 3); } }),
    '독 연속 찌르기': (a, b) => form(a, b, { sty: 'insect', nm: '벌레의 호흡 · 독 연속 찌르기', prep: 'k_chudan', cuts: Array.from({ length: 5 }, () => ['k_tsuki', -.05, .05, 0, 2, 1, .07, 30]), each: (a2, b2) => stab(a2, b2, 1), fin: (a2, b2) => butterflies(chest(b2), 6, 8) }),
    '나비 회피 찌르기': (a, b) => [step(.3, [[a, { pose: 'backstep', face: b, fwd: -160, vy: 120 }], [b, { pose: 'crouchRun', face: a, to: near(b, a, 10) }]], () => { butterflies(chest(a), 10, 10); label(headP(a), '나비처럼!', '#e0c0ff'); }), ...dash(a, b, { sty: 'insect', nm: '나비 날개 회피 찌르기', hold: 'k_chudan', cut: 'k_tsuki', over: 3, w: 1.4, d: .08, pw: 1.5, fin: (a2, b2) => stab(a2, b2, 2) })],
    '독 안개': (a, b) => [step(.4, [[a, { pose: 'openPalm', aura: 1, elem: 'insect', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '등꽃 독 안개'); for (let i = 0; i < 80; i++) parts.push({ p: b.pos.clone().add(V3(R(-25, 25), R(0, 18), R(-25, 25))), v: V3(R(-6, 6), R(2, 8), R(-6, 6)), life: 2, c: pick(['#c8a0ff', '#e8d8ff', '#a070e0']), g: -2, s: 3 }); butterflies(chest(b), 8, 20); }),
      step(.5, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'hurt', face: a }]], () => hitAt(a, b, 'insect', '독!', 1.2)), step(.2, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])],
    '나비 폭풍': (a, b) => [step(.5, [[a, { pose: 'skySweep', aura: 1, elem: 'insect', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '벌레의 호흡 · 나비 폭풍', true); butterflies(chest(a), 40, 30, 2); tornado(b.pos, 'insect', 40, 18); }),
      step(.5, [[a, { pose: 'k_tsuki', face: b }], [b, { pose: 'hurt', face: a }]], () => { butterflies(chest(b), 30, 18, 1.6); hitAt(a, b, 'insect', '나비 폭풍!', 2); }), step(.2, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])],
    '독침 투척': (a, b) => [step(.3, [[a, { pose: 'throwPrep', aura: 1, elem: 'insect', face: b }], [b, { pose: 'guard', face: a }]], () => callout(a, '독침 투척')), step(.25, [[a, { pose: 'throw', face: b }], [b, { pose: 'block', face: a }]], () => { for (let k = 0; k < 6; k++) pending.push({ t: k * .04, fn: () => proj(a, b, 'senbon', k === 5 ? 'hit' : 'block', { c: '#c890ff', ek: 'insect', size: 1, v: 340, nm: '독침' }) }); butterflies(chest(a), 4, 6); }), step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])],
  });
  // ═══ 우즈이: 소리의 호흡 (쇠사슬 쌍칼, 칠 때마다 폭발) ═══
  set('uzui', {
    '소리의 호흡 · 굉': (a, b) => leap(a, b, { sty: 'sound', nm: '소리의 호흡 제1형 · 굉', h: 30, prep: 'k_dual', air: 'k_jodan', cut: 'k_kesa', r: 20, w: 6, pw: 1.8, fin: (a2, b2) => { const p = chest(b2); for (let k = 0; k < 5; k++) pending.push({ t: k * .07, fn: () => boom(p.clone().add(V3(R(-12, 12), R(-6, 8), R(-12, 12))), 1.2) }); rockShatter(V3(p.x, 0, p.z), .8); } }),
    '명현주소': (a, b) => spin(a, b, { sty: 'sound', nm: '소리의 호흡 제4형 · 명현주소', prep: 'k_dual', cut: 'k_dualOpen', rings: 3, r: 18, rad: 44, pw: 1.7, spinV: 26, extra: a2 => { for (let k = 0; k < 10; k++) pending.push({ t: k * .05, fn: () => { const an = k * .63; boom(a2.pos.clone().add(V3(Math.cos(an) * 20, 10, Math.sin(an) * 20)), .8); } }); } }),
    '보면 완성': (a, b) => [step(.6, [[a, { pose: 'taunt', aura: 1, elem: 'sound', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '보면 완성! 화려하게 간다', true); aura(a, 'sound', true); for (let k = 0; k < 5; k++) ring(chest(b), 3 + k * 3, pick(STY.sound.parts), false, 1.2, 2); }),
      ...form(a, b, { sty: 'sound', nm: '화려한 연타', prep: 'k_dual', cuts: Array.from({ length: 6 }, (_, i) => [i % 2 ? 'k_dualOpen' : 'k_dual', R(-2, 2), R(-2, 2), R(-1.5, 1.5), 18, 4, .1]), each: (a2, b2) => boom(chest(b2).add(V3(R(-6, 6), R(-4, 6), R(-6, 6))), 1), pw: 2.2 })],
    '향명 참참': (a, b) => form(a, b, { sty: 'sound', nm: '소리의 호흡 제5형 · 향명 참참', prep: 'k_dual', cuts: Array.from({ length: 5 }, (_, i) => [i % 2 ? 'k_dualOpen' : 'k_dual', 1.6, -1.4, (i - 2) * .4, 18, 4, .1]), each: (a2, b2) => boom(chest(b2), .8) }),
    '폭약 쿠나이': (a, b) => [step(.3, [[a, { pose: 'throwPrep', aura: 1, elem: 'sound', face: b }], [b, { pose: 'guard', face: a }]], () => callout(a, '폭약 쿠나이 투척')), step(.4, [[a, { pose: 'throw', face: b }], [b, { pose: 'block', face: a }]], () => { for (let k = 0; k < 8; k++) pending.push({ t: k * .05, fn: () => { const p = chest(b).add(V3(R(-20, 20), R(-6, 10), R(-20, 20))); proj(a, b, 'senbon', 'jump', { c: '#ffd040', ek: 'sound', size: 1, v: 320, nm: '' }); pending.push({ t: .25, fn: () => boom(p, .9) }); } }); pending.push({ t: .55, fn: () => hitAt(a, b, 'sound', '쿠나이 폭발!', 1.5) }); }), step(.3, [[a, { pose: 'k_dual', face: b }], [b, { pose: 'hurt', face: a }]])],
    '이도 연참': (a, b) => form(a, b, { sty: 'sound', nm: '소리의 호흡 · 이도 연참', prep: 'k_dual', cuts: [['k_dualOpen', 1.5, -1.3, .6, 18, 4, .1], ['k_dualOpen', 1.5, -1.3, -.6, 18, 4, .1], ['k_dual', -1.5, 1.5, PI2, 20, 4, .12]], each: (a2, b2) => boom(chest(b2), .7) }),
    '쌍검 돌진': (a, b) => dash(a, b, { sty: 'sound', nm: '쌍검 돌진', hold: 'k_dual', cut: 'k_dualOpen', w: 5, trail: (a2, b2, pts) => pts.forEach((p, i) => { if (i % 5 === 0) pending.push({ t: i * .01, fn: () => boom(p, .6) }); }) }),
    '화려 폭발': (a, b) => leap(a, b, { sty: 'sound', nm: '축제의 신 · 화려 폭발', h: 50, prep: 'k_dual', air: 'k_jodan', cut: 'k_kesa', r: 24, w: 7, pw: 2.2, ult: true, fin: (a2, b2) => { const p = chest(b2); for (let k = 0; k < 10; k++) pending.push({ t: k * .06, fn: () => boom(p.clone().add(V3(R(-25, 25), R(-6, 14), R(-25, 25))), 1.4) }); ultBlast(p, 'sound', 60, a2, '화려!'); } }),
    '음파 굉음': (a, b) => [step(.4, [[a, { pose: 'k_dual', aura: 1, elem: 'sound', face: b }], [b, { pose: 'guard', face: a }]], () => callout(a, '소리의 호흡 · 음파 굉음')),
      step(.5, [[a, { pose: 'openArms', face: b }], [b, { pose: 'hurt', face: a }]], () => { const fw = fwOf(a, b); for (let k = 0; k < 6; k++) pending.push({ t: k * .06, fn: () => { const p = chest(a).addScaledVector(fw, 8 + k * 9); ring(p, 3 + k, pick(STY.sound.parts), false, .7, 2.2); } }); pending.push({ t: .35, fn: () => { boom(chest(b), 1.3); hitAt(a, b, 'sound', '굉음!', 1.6); } }); }), step(.2, [[a, { pose: 'k_dual', face: b }], [b, { pose: 'guard', face: a }]])],
  });
  // ═══ 미츠리: 사랑의 호흡 (분홍 채찍검 띠) ═══
  set('mitsuri', {
    '사랑의 호흡 · 첫사랑의 전율': (a, b) => whip(a, b, { nm: '사랑의 호흡 제1형 · 첫사랑의 전율', n: 3, strands: 3, len: 36, pw: 1.5 }),
    '고양이 발 사랑바람': (a, b) => leap(a, b, { sty: 'love', nm: '사랑의 호흡 제6형 · 고양이 발 사랑바람', h: 40, air: 'flipAir', cut: 'k_yoko', r: 26, w: 4, inAir: (a2, b2) => { for (let k = 0; k < 4; k++) pending.push({ t: k * .08, fn: () => slashArc(a2, b2, 'love', 0, PI * 2, 18 + k * 4, R(-1, 1), 2.4, { life: .9, fwd: 0 }) }); }, pw: 1.8 }),
    '흔들리는 연정': (a, b) => spin(a, b, { sty: 'love', nm: '사랑의 호흡 제5형 · 흔들리는 연정 · 난조', prep: 'k_hasso', cut: 'k_yoko', rings: 5, helix: true, r: 24, w: 2.6, rad: 50, pw: 1.8, ult: true, spinV: 20 }),
    '애달픈 연정': (a, b) => whip(a, b, { nm: '사랑의 호흡 제2형 · 애달픈 연정', n: 2, strands: 4, len: 40, curl: 3.4, pw: 1.4 }),
    '연묘 시구레': (a, b) => whip(a, b, { nm: '사랑의 호흡 제3형 · 연묘 시구레', n: 5, strands: 2, len: 32, curl: 4, pw: 1.5 }),
    '채찍검 회오리': (a, b) => spin(a, b, { sty: 'love', nm: '채찍검 회오리', prep: 'k_hasso', cut: 'k_yoko', rings: 4, r: 28, w: 2.4, rad: 46, pw: 1.6, spinV: 26, dyk: 6 }),
    '사랑의 연격': (a, b) => whip(a, b, { nm: '사랑의 호흡 · 연격', n: 6, strands: 2, len: 28, curl: 2, pw: 1.4 }),
    '하트 돌진': (a, b) => dash(a, b, { sty: 'love', nm: '하트 돌진', hold: 'k_hasso', cut: 'k_yoko', path: 'coil', w: 3, d: .24, fin: (a2, b2) => { const p = chest(b2), pts = []; for (let i = 0; i < 40; i++) { const t2 = i / 39 * PI * 2, x = 16 * Math.pow(Math.sin(t2), 3), y = 13 * Math.cos(t2) - 5 * Math.cos(2 * t2) - 2 * Math.cos(3 * t2) - Math.cos(4 * t2); pts.push(p.clone().add(V3(x * .8, y * .8 + 6, 0))); } ribbon(pts, V3(0, 0, 1), 2, 'love', { dur: .3, life: 1.2 }); } }),
    '연정 대폭발': (a, b) => [...whip(a, b, { nm: '사랑의 호흡 · 연정 대폭발', n: 2, strands: 5, len: 44, curl: 3, pw: 2.2, ult: true, fin: (a2, b2) => { ultBlast(chest(b2), 'petal', 60, a2, '사랑!'); for (let i = 0; i < 80; i++) parts.push({ p: chest(b2), v: V3(R(-90, 90), R(20, 140), R(-90, 90)), life: 1.4, c: pick(STY.love.parts), g: -10, s: 2 }); } })],
  });
  // ═══ 무이치로: 안개의 호흡 (흰 안개·사라졌다 나타남) ═══
  const vanish = (a, b, nm, pw, ult) => [step(.45, [[a, { pose: 'k_chudan', aura: 1, elem: 'mist', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, nm, ult); mistVeil(a.pos, 120, 30); a.model.root.visible = false; const m0 = a.model; addLive({ max: 1.4, upd: () => true, end: () => { m0.root.visible = a.model === m0; } }); for (let k = 0; k < 4; k++) ghosts.push({ ch: a.ch, pos: a.pos.clone().add(V3(R(-20, 20), 0, R(-20, 20))), heading: a.heading, c: { ...a.c }, life: 1.2, color: '#e8eef4', dec: .6 }); }),
    step(.3, [[a, { pose: 'k_iaiReady', face: b, to: () => b.pos.clone().addScaledVector(fwOf(a, b), 12) }], [b, { pose: 'stance', face: a }]], () => { mistVeil(b.pos, 60, 20); addLive({ max: .9, upd: () => true, end: () => { a.model.root.visible = true; } }); }),
    step(.14, [[a, { pose: 'k_iaiCut', k: 99, face: b }], [b, { pose: 'hurt', face: a }]], () => { a.model.root.visible = true; slashArc(a, b, 'mist', -1.6, 1.6, 20, PI2, 5, { dur: .08, life: .9 }); slashArc(a, b, 'mist', 1.6, -1.6, 18, .5, 3, { dur: .08, life: .8 }); hitAt(a, b, 'mist', nm.split(' · ').pop() + '!', pw); }),
    step(.3, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]], () => { a.model.root.visible = true; })];
  set('muichiro', {
    '안개의 호흡 · 수평선': (a, b) => dash(a, b, { sty: 'mist', nm: '안개의 호흡 제1형 · 수평선 너머 먼 안개', hold: 'k_chudan', cut: 'k_tsuki', w: 2.4, d: .1, pre: a2 => mistVeil(a2.pos, 40, 12), fin: (a2, b2) => mistVeil(b2.pos, 40, 14) }),
    '흐린 하늘': (a, b) => form(a, b, { sty: 'mist', nm: '안개의 호흡 제4형 · 흐린 하늘', prep: 'k_hasso', cuts: Array.from({ length: 5 }, (_, i) => ['k_kesa', 1.7, -1.3, (i - 2) * .55, 18, 3.5, .09]), pre: a2 => mistVeil(a2.pos, 50, 20) }),
    '몽롱': (a, b) => vanish(a, b, '안개의 호흡 제7형 · 몽롱', 2.2, true),
    '수천원하 원정': (a, b) => dash(a, b, { sty: 'mist', nm: '안개의 호흡 제1형 · 수천원하 원정', hold: 'k_chudan', cut: 'k_tsuki', w: 2.2, d: .1, fin: (a2, b2) => mistVeil(b2.pos, 40, 14) }),
    '팔중 안개': (a, b) => form(a, b, { sty: 'mist', nm: '안개의 호흡 제2형 · 팔중 안개', prep: 'k_iaiReady', cuts: Array.from({ length: 8 }, (_, i) => [i % 2 ? 'k_kesa' : 'k_yoko', R(-2, 2), R(-2, 2), R(-1.5, 1.5), 16, 2.8, .07]), pre: a2 => mistVeil(a2.pos, 50, 16) }),
    '하얀 안개 바다': (a, b) => [step(.4, [[a, { pose: 'k_waki', aura: 1, elem: 'mist', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '안개의 호흡 제3형 · 하얀 안개 바다'); mistVeil(b.pos, 160, 50); }), ...form(a, b, { sty: 'mist', nm: '안개 바다 베기', prep: 'k_waki', reach: 10, cuts: [['k_yoko', -1.6, 1.6, PI2, 22, 5]] })],
    '이류 베기': (a, b) => form(a, b, { sty: 'mist', nm: '안개의 호흡 제4형 · 이류 베기', prep: 'k_hasso', cuts: [['k_kesa', 1.8, -1.5, .5, 22, 5, .14]], pre: a2 => mistVeil(a2.pos, 40, 14) }),
    '노을 구름바다': (a, b) => spin(a, b, { sty: 'mist', nm: '안개의 호흡 제5형 · 노을 구름바다', prep: 'k_waki', cut: 'k_yoko', rings: 4, r: 18, rad: 44, pw: 1.6, spinV: 28, extra: a2 => mistVeil(a2.pos, 140, 30) }),
    '달의 안개 소실': (a, b) => vanish(a, b, '안개의 호흡 제6형 · 달의 안개 소실', 1.9, false),
  });
  // ═══ 사네미: 바람의 호흡 (초록빛 바람 칼날·회오리) ═══
  set('sanemi', {
    '진사바람': (a, b) => dash(a, b, { sty: 'wind', nm: '바람의 호흡 제1형 · 진사바람 깎기', hold: 'k_lowRun', cut: 'k_yoko', w: 5, path: 'coil', d: .18, trail: (a2, b2, pts) => tornado(b2.pos, 'wind', 26, 12) }),
    '흑풍연산': (a, b) => wave(a, b, { sty: 'wind', nm: '바람의 호흡 제6형 · 흑풍연산', prep: 'k_jodan', cut: 'k_kesa', n: 4, gap: .07, v: 280, r: 14, w: 4 }),
    '정선 회오리': (a, b) => [...spin(a, b, { sty: 'wind', nm: '바람의 호흡 제9형 · 이즈나 아라시', prep: 'k_waki', cut: 'k_yoko', rings: 4, helix: true, r: 18, w: 4, rad: 50, pw: 2, ult: true, spinV: 34, extra: (a2, b2) => { tornado(a2.pos, 'wind', 70, 22); tornado(b2.pos, 'wind', 50, 14); } })],
    '조풍 날개': (a, b) => form(a, b, { sty: 'wind', nm: '바람의 호흡 제2형 · 조풍 날개', prep: 'k_hasso', cuts: [['k_kesa', 1.7, -1.3, .7, 20, 4.5, .1], ['k_kesa', 1.7, -1.3, -.7, 20, 4.5, .1], ['k_yoko', -1.6, 1.6, PI2, 22, 4.5, .1], ['k_upCut', -1.4, 1.7, 0, 20, 4.5, .1]] }),
    '청람풍수': (a, b) => wave(a, b, { sty: 'wind', nm: '바람의 호흡 제3형 · 청람풍수', prep: 'k_hasso', cut: 'k_yoko', n: 3, gap: .08, v: 300, r: 16, w: 4.5 }),
    '상승 진사바람': (a, b) => form(a, b, { sty: 'wind', nm: '바람의 호흡 제4형 · 상승 진사바람', prep: 'k_waki', cuts: [['k_upCut', -1.8, 1.9, 0, 24, 6, .16]], fin: (a2, b2) => { tornado(b2.pos, 'wind', 40, 12); b2.vel.y = Math.max(b2.vel.y, 200); b2.air = true; } }),
    '경풍 천구풍': (a, b) => leap(a, b, { sty: 'wind', nm: '바람의 호흡 제7형 · 경풍 천구풍', h: 44, air: 'flipAir', cut: 'k_kesa', inAir: (a2, b2) => { for (let k = 0; k < 3; k++) pending.push({ t: k * .1, fn: () => slashArc(a2, b2, 'wind', 0, PI * 2, 15 + k * 3, .3, 4, { dur: .2, life: .8, fwd: 0 }) }); }, pw: 1.7, fin: (a2, b2) => tornado(b2.pos, 'wind', 30, 14) }),
    '이즈나 아라시': (a, b) => spin(a, b, { sty: 'wind', nm: '바람의 호흡 제9형 · 이즈나 아라시', prep: 'k_waki', cut: 'k_yoko', rings: 4, helix: true, r: 18, w: 4, rad: 50, pw: 2, ult: true, spinV: 34, extra: a2 => tornado(a2.pos, 'wind', 70, 22) }),
    '바람 돌진': (a, b) => dash(a, b, { sty: 'wind', nm: '바람 돌진 베기', hold: 'k_lowRun', cut: 'k_yoko', w: 5, path: 'coil' }),
  });
  // ═══ 오바나이: 뱀의 호흡 (구불구불 뱀 모양 베기) ═══
  const snakeHead = (pts, dur) => beast('dragon', pts, 'serpent', dur, { w: 3.4, scale: .55, c: '#7a5ad0', c2: '#ece4ff' });
  set('obanai', {
    '뱀의 호흡 · 위이의 형': (a, b) => [step(.35, [[a, { pose: 'k_waki', aura: 1, elem: 'slash', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '뱀의 호흡 제1형 · 위이의 형'); aura(a, 'serpent'); }),
      step(.3, [[a, { pose: 'k_yoko', k: 96, face: b, fwd: 60 }], [b, { pose: 'block', face: a }]], () => { const p0 = chest(a), p1 = chest(b).addScaledVector(fwOf(a, b), 8); snakeHead(linePts(p0, p1, 36, u => [Math.sin(u * PI * 4) * 9, Math.sin(u * PI * 2) * 3]), .25); pending.push({ t: .22, fn: () => hitAt(a, b, 'serpent', '위이의 형!', 1.4) }); }),
      step(.25, [[a, { pose: 'k_chudan', face: b }], [b, { pose: 'guard', face: a }]])],
    '장반 장사': (a, b) => { const st = [step(.3, [[a, { pose: 'k_lowRun', aura: 1, elem: 'slash', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '뱀의 호흡 제5형 · 장반 장사', true); aura(a, 'serpent', true); })];
      for (let i = 0; i < 3; i++) st.push(step(.16, [[a, { pose: 'k_iaiCut', ghost: 1, face: b, to: () => b.pos.clone().add(V3(Math.cos(i * 2.3 + 1) * 18, 0, Math.sin(i * 2.3 + 1) * 18)) }], [b, { pose: 'guard', face: a }]], () => { const p0 = chest(a), p1 = chest(b).add(V3(Math.cos(i * 2.3 + 1) * 18, 0, Math.sin(i * 2.3 + 1) * 18)); ribbon(linePts(p0, p1, 24, u => [Math.sin(u * PI * 3) * 7, 0]), UP, 3, 'serpent', { dur: .12, life: .9 }); }));
      st.push(step(.2, [[a, { pose: 'k_kesa', k: 96, face: b }], [b, { pose: 'hurt', face: a }]], () => { snakeHead(linePts(chest(a).add(V3(0, 20, 0)), chest(b), 24, u => [Math.sin(u * PI * 3) * 8, 0]), .2); pending.push({ t: .18, fn: () => hitAt(a, b, 'serpent', '장반 장사!', 1.9) }); })); return st; },
    '협두의 독아': (a, b) => dash(a, b, { sty: 'serpent', nm: '뱀의 호흡 제2형 · 협두의 독아', hold: 'k_lowRun', cut: 'k_tsuki', path: 'snake', w: 2.4, d: .14, over: 6, fin: (a2, b2) => snakeHead(linePts(chest(a2), chest(b2), 16, u => [Math.sin(u * PI * 2) * 5, 0]), .12) }),
    '도사리 휘감기': (a, b) => spin(a, b, { sty: 'serpent', nm: '뱀의 호흡 제3형 · 도사리 휘감기', prep: 'k_waki', cut: 'k_yoko', rings: 3, helix: true, r: 16, w: 3.4, rad: 38, spinV: 24 }),
    '경도 장사': (a, b) => form(a, b, { sty: 'serpent', nm: '뱀의 호흡 제4형 · 경도 장사', prep: 'k_waki', cuts: Array.from({ length: 4 }, (_, i) => ['k_yoko', -1.6, 1.6, PI2 + (i % 2 ? .4 : -.4), 18, 3.4, .1]), each: (a2, b2, i) => { if (i === 3) snakeHead(linePts(chest(a2), chest(b2), 18, u => [Math.sin(u * PI * 3) * 6, 0]), .15); } }),
    '뱀 연찌르기': (a, b) => form(a, b, { sty: 'serpent', nm: '뱀의 호흡 · 연찌르기', prep: 'k_chudan', cuts: Array.from({ length: 6 }, () => ['k_tsuki', -.05, .05, 0, 2, 1, .07, 30]), each: (a2, b2) => ribbon(linePts(chest(a2), chest(b2), 12, u => [Math.sin(u * PI * 3) * 3, 0]), UP, 1.2, 'serpent', { dur: .05, life: .45 }) }),
    '독뱀 돌진': (a, b) => dash(a, b, { sty: 'serpent', nm: '독뱀 돌진', hold: 'k_lowRun', cut: 'k_iaiCut', path: 'snake', w: 3.2, d: .2, fin: (a2, b2) => snakeHead(linePts(chest(a2).add(V3(0, 6, 0)), chest(b2), 18, u => [Math.sin(u * PI * 2) * 6, 0]), .15) }),
    '뱀 꼬리 휘두르기': (a, b) => kicks(a, b, { nm: '뱀 꼬리 휘두르기', n: 2, pw: 1.3 }),
    '대사': (a, b) => [step(.5, [[a, { pose: 'k_waki', aura: 1, elem: 'slash', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '뱀의 호흡 · 대사', true); aura(a, 'serpent', true); }),
      step(.7, [[a, { pose: 'k_yoko', k: 96, face: b, spin: 16 }], [b, { pose: 'block', face: a }]], () => { const pts = []; const c = chest(b); for (let i = 0; i < 60; i++) { const u = i / 59, an = u * PI * 5; pts.push(c.clone().add(V3(Math.cos(an) * (30 - u * 20), u * 20 - 6, Math.sin(an) * (30 - u * 20)))); } beast('dragon', pts, 'serpent', .6, { w: 6, scale: 1.1, c: '#7a5ad0', c2: '#ece4ff' }); pending.push({ t: .55, fn: () => { hitAt(a, b, 'serpent', '대사!', 2.2); ultBlast(chest(b), 'slash', 50, a, '대사!'); } }); }),
      step(.3, [[a, { pose: 'k_chudan', spin: 0, face: b }], [b, { pose: 'hurt', face: a }]])],
  });
  // ═══ 히메지마: 바위의 호흡 (쇠사슬 철구·도끼) ═══
  set('himejima', {
    '바위의 호흡 · 사면 베기': (a, b) => stone(a, b, { nm: '바위의 호흡 제1형 · 사면 베기', n: 2, k: 1.1, pw: 1.8 }),
    '철구 투척': (a, b) => stone(a, b, { nm: '바위의 호흡 · 철구 투척', n: 1, cut: 'throw', k: 1, pw: 1.6 }),
    '와륜형부': (a, b) => stone(a, b, { nm: '바위의 호흡 제5형 · 와륜형부', n: 4, k: 1.6, pw: 2.4, ult: true, cut: 'skySweep', spinV: 10, fin: (a2, b2, p) => ultBlast(V3(p.x, 6, p.z), 'earth', 50, a2, '와륜형부!') }),
    '천면 부수기': (a, b) => stone(a, b, { nm: '바위의 호흡 제2형 · 천면 부수기', n: 1, k: 1.8, pw: 2, prep: 'hammerUp', cut: 'hammerDown' }),
    '암구 쌍극': (a, b) => stone(a, b, { nm: '바위의 호흡 제3형 · 암구 쌍극', n: 2, k: 1.2, pw: 1.7, axe: true }),
    '류암 박피': (a, b) => stone(a, b, { nm: '바위의 호흡 제4형 · 류암 박피', n: 3, k: 1, pw: 1.8, cut: 'skySweep', spinV: 12 }),
    '철구 낙하': (a, b) => [step(.4, [[a, { pose: 'skyRaise', aura: 1, elem: 'earth', face: b }], [b, { pose: 'guard', face: a }]], () => callout(a, '철구 낙하')),
      step(.6, [[a, { pose: 'hammerDown', face: b }], [b, { pose: 'block', face: a }]], () => { const ball = new THREE.Group(), m = new THREE.Mesh(sphG, ballMat); m.scale.setScalar(7); ball.add(m); const p = b.pos.clone(); ball.position.set(p.x, 140, p.z); scene3.add(ball); let hit = false;
        addLive({ g: ball, max: .9, upd: (dt, t, L) => { ball.position.y = Math.max(7, 140 - 400 * L.t * L.t * 2); if (!hit && ball.position.y <= 7) { hit = true; rockShatter(p, 1.5); hitAt(a, b, 'stone', '철구 낙하!', 1.9); } } }); }),
      step(.3, [[a, { pose: 'braced', face: b }], [b, { pose: 'hurt', face: a }]])],
    '쇠사슬 휘감기': (a, b) => stone(a, b, { nm: '바위의 호흡 · 쇠사슬 휘감기', n: 2, k: .8, pw: 1.5, cut: 'skySweep', spinV: 18 }),
    '바위 대분쇄': (a, b) => [step(.5, [[a, { pose: 'skyRaise', aura: 1, elem: 'earth', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '바위의 호흡 · 대분쇄', true); aura(a, 'stone', true); if (window.MV) MV.arc(a, b.pos.clone().addScaledVector(fwOf(b, a), 12).setY(0), .55, 50); }),
      step(.55, [[a, { pose: 'hammerUp', face: b }], [b, { pose: 'block', face: a }]]),
      step(.6, [[a, { pose: 'hammerDown', k: 96, face: b }], [b, { pose: 'hurt', face: a }]], () => flail(a, b, .5, p => { rockShatter(V3(p.x, 0, p.z), 2.2); ultBlast(V3(p.x, 6, p.z), 'earth', 70, a, '대분쇄!'); hitAt(a, b, 'stone', '대분쇄!', 2.6); }, true)),
      step(.3, [[a, { pose: 'braced', face: b }], [b, { pose: 'guard', face: a }]])],
  });
})();
