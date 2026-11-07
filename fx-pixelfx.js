// PIXELFX 통합층(11-07, 라운드D 전환): patch-gg/pixelfx(MIT) 244종 픽셀 이펙트를 3D 월드공간에 빌보드 스프라이트로 띄운다.
// 화면 오버레이(2D)가 아니라 WebGL 씬 안의 실제 물체: 원근 축소·시차·절벽 뒤 가림(depth test)이 그대로 동작.
// 각 fx는 자기 프레임(메타 size·origin, 회전 시 패딩)에 렌더 → CanvasTexture(NearestFilter 픽셀 선 유지) → 가산 블렌딩 평면.
// 이벤트: wound/clash/explode/ultBlast/proj 래퍼 — 품질별 동시개수 예산, 요소별 팔레트, 버튼·J키 토글(localStorage arenaPixFx).
(function () {
  if (typeof THREE === 'undefined' || typeof window.PIXELFX_LIB === 'undefined') return;
  const L = window.PIXELFX_LIB, PX = window.PIXFX = { on: true, st: { spawns: 0, culled: 0, skipped: 0, live: 0 }, lib: L };
  try { if (localStorage.getItem('arenaPixFx') === '0') PX.on = false; } catch (e) { }
  const Q = () => { try { return (window.getQuality && getQuality()) || 'mid'; } catch (e) { return 'mid'; } };
  const budget = () => Q() === 'low' ? 0 : (window.AAA && AAA.ultra) ? 46 : Q() === 'high' ? 14 : Q() === 'mid' ? 6 : 0;
  const U = 0.085; // 픽셀→월드 단위(캐릭터 키 33유닛 기준 hit-spark ~11유닛, big-explosion ~30유닛)
  const GEO = new THREE.PlaneGeometry(1, 1);
  const active = [];
  const ELEM = { fire: '#ff5a50', flame: '#ff8a3a', lava: '#ff6a2a', sun: '#ffd24a', bolt: '#ffd24a', thunder: '#ffe15a', lightning: '#ffe15a', water: '#3fb8ff', ice: '#9ad6ff', frost: '#bfe8ff', snow: '#cfe9ff', wind: '#a8e6c8', air: '#c8f0d8', dark: '#8a3ad4', hollow: '#6a2ab4', shadow: '#7a35c4', void: '#5a2a8a', curse: '#9a4ae4', light: '#ffdf7a', chakra: '#ffcf4a', petal: '#ffb0c8', sand: '#d8b060', earth: '#b08050', rock: '#a08a60', stone: '#9a9a8a', metal: '#b8c8d8', slash: '#e8eef5', poison: '#6ad46a', venom: '#5ab45a' };
  function ramp(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const mul = (s) => '#' + [r, g, b].map(v => Math.min(255, Math.round(v * s)).toString(16).padStart(2, '0')).join('');
    return [mul(.25), mul(.5), mul(.8), hex, mul(1.4)];
  }
  const EFX = { fire: 'fire/fireball', lava: 'fire/flame-pillar', sun: 'fire/flame-pillar', thunder: 'lightning/zap-hit', bolt: 'lightning/spark-arc', lightning: 'lightning/zap-hit', water: 'water/splash', ice: 'ice/ice-shatter', frost: 'ice/ice-crystal', snow: 'ice/snowflake-burst', wind: 'nature/spore-burst', air: 'nature/spore-burst', petal: 'nature/spore-burst', dark: 'shadow/hex-sigil', hollow: 'shadow/hex-sigil', shadow: 'shadow/eclipse', void: 'shadow/black-hole', curse: 'shadow/dark-explosion', light: 'holy/feather-burst', chakra: 'arcane/mana-burst', poison: 'nature/poison-cloud', venom: 'nature/poison-cloud', earth: 'nature/earth-spike', rock: 'nature/boulder', stone: 'nature/boulder', sand: 'nature/quake', metal: 'impacts/blunt-hit', slash: 'impacts/hit-spark' };
  function spawn(key, p3, o) {
    const cap = budget();
    if (!PX.on || cap === 0 || !p3 || typeof p3.clone !== 'function' || typeof scene3 === 'undefined') { PX.st.skipped++; return; }
    const mod = L.EFFECTS[key]; if (!mod) { PX.st.skipped++; return; }
    if (camera && camera.position.distanceTo(p3) > 190) { PX.st.culled++; return; }
    if (active.length >= cap) { try { PX.kill(active.shift()); } catch (e) { } PX.st.culled++; }
    try {
      const meta = mod.meta || {}, S = meta.size || [128, 128], O = meta.origin || [S[0] >> 1, S[1] >> 1];
      const ang = (o && o.angle) || 0;
      let fw = S[0], fh = S[1], ax = O[0], ay = O[1];
      if (ang) { // 회전은 자기 프레임 밖으로 나갈 수 있다 — 앵커에서 가장 먼 모서리 반지름으로 패딩
        const r = Math.ceil(Math.max(Math.hypot(O[0], O[1]), Math.hypot(S[0] - O[0], O[1]), Math.hypot(O[0], S[1] - O[1]), Math.hypot(S[0] - O[0], S[1] - O[1])));
        fw = fh = r * 2; ax = ay = r;
      }
      const opts = Object.assign({ seed: (Math.random() * 1e6) | 0 }, o || {});
      opts.x = ax; opts.y = ay; // 페인터는 (opts.x,opts.y)를 프레임 좌표의 앵커로 place — ox/oy는 별도 윈도우 오프셋(0)
      const fx = L.createFx(mod, opts);
      const fr = L.createFrame(fw, fh, 0, 0);
      const cv2 = document.createElement('canvas'); cv2.width = fw; cv2.height = fh;
      const c2 = cv2.getContext('2d');
      const img = c2.createImageData(fw, fh);
      const tex = new THREE.CanvasTexture(cv2);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .95 });
      const mesh = new THREE.Mesh(GEO, mat);
      mesh.scale.set(fw * U, fh * U, 1);
      // 앵커(원점)를 월드 p3에 놓기: 프레임 중심 = 앵커 + (fw/2-ax, fh/2-ay), 프레임 y는 아래→월드 y는 위
      mesh.position.set(p3.x + (fw / 2 - ax) * U, p3.y + (ay - fh / 2) * U, p3.z);
      scene3.add(mesh);
      active.push({ fx, fr, cv2, c2, img, tex, mat, mesh, fw, fh, st: false, born: performance.now() });
      PX.st.spawns++;
    } catch (e) { PX.st.skipped++; }
  }
  PX.spawn = spawn;
  PX.kill = (e) => { try { scene3.remove(e.mesh); } catch (err) { } try { e.tex.dispose(); e.mat.dispose(); } catch (err) { } };
  const chest = f => f && f.pos ? (f.pos.y !== undefined ? f.pos.clone().add(new THREE.Vector3(0, 1.05, 0)) : null) : null;
  const ang = (a, v) => { if (!a || !v || !a.pos || !v.pos || !camera) return 0; const pa = a.pos.clone().add(new THREE.Vector3(0, 1, 0)).project(camera), pv = v.pos.clone().add(new THREE.Vector3(0, 1, 0)).project(camera); return Math.atan2(-(pv.y - pa.y), pv.x - pa.x); };
  const elemOf = (a, ek) => ek || (a && a.elem) || (a && a.ch && a.ch.sig && a.ch.sig.elem) || null;

  const _w = wound;
  wound = function (v, a, text, ek) {
    _w(v, a, text, ek);
    try {
      const ek2 = elemOf(a, ek), col = ELEM[ek2] || '#e8eef5';
      spawn('impacts/hit-spark', chest(v), { palette: ramp(col), angle: ang(a, v), light: .9 });
      const ef = EFX[ek2];
      if (ef && (window.AAA && AAA.ultra || Q() !== 'low')) spawn(ef, chest(v), { light: 1.1 });
      if (a && a.crit) spawn('impacts/crit-hit', chest(v), { angle: ang(a, v) });
    } catch (e) { }
  };
  const _cl = clash;
  clash = function (a, b, text, big) {
    _cl.apply(this, arguments);
    try { if (a && a.pos) spawn('impacts/parry', chest(a), { angle: Math.random() * 3 }); } catch (e) { }
  };
  const _ex = explode;
  explode = function (p, ek, pw = 1) {
    _ex(p, ek, pw);
    try {
      const col = ELEM[ek] || '#ffb04a';
      spawn(pw >= 1.3 ? 'explosions/big-explosion' : 'explosions/small-explosion', p, { palette: ramp(col), light: 1.2 });
    } catch (e) { }
  };
  const _ub = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) {
    _ub.apply(this, arguments);
    try {
      const col = ELEM[ek] || '#b060ff';
      spawn((rad || 40) >= 45 ? 'explosions/big-explosion' : 'explosions/small-explosion', p, { palette: ramp(col), light: 1.35 });
      spawn('arcane/mana-burst', p, { palette: ramp(col) });
    } catch (e) { }
  };
  const _pr = proj;
  proj = function (a, b, kind, mode, o) {
    _pr.apply(this, arguments);
    try {
      const ek2 = kind && kind.toLowerCase ? kind.toLowerCase() : null;
      if (a && a.pos) spawn('projectiles/magic-missile', chest(a), { palette: ELEM[ek2] ? ramp(ELEM[ek2]) : undefined, light: 1.1 });
    } catch (e) { }
  };

  const _up = update;
  update = function (dt, t) {
    _up(dt, t);
    try {
      if (!PX.on || budget() === 0) {
        for (const e of active) PX.kill(e);
        if (active.length) active.length = 0;
        PX.st.live = 0;
        return;
      }
      PX.st.live = active.length;
      if (!active.length) return;
      for (let i = active.length - 1; i >= 0; i--) {
        const e = active[i];
        if (e.fx.meta.loop && !e.st && e.fx.t >= 2.1) { e.fx.stop(); e.st = true; }
        e.fx.update(dt);
        if (e.fx.done()) { PX.kill(e); active.splice(i, 1); continue; }
        L.clearFrame(e.fr);
        e.fx.draw(e.fr);
        L.composite(e.fr, e.img.data, null);
        e.c2.putImageData(e.img, 0, 0);
        e.tex.needsUpdate = true;
        if (camera) e.mesh.quaternion.copy(camera.quaternion);
      }
    } catch (e) { }
  };

  const bar = document.getElementById('viewBar');
  if (bar) {
    const b = document.createElement('button');
    b.textContent = '픽셀FX'; b.type = 'button';
    b.style.cssText = 'margin:2px;padding:3px 9px;font:700 11px "Noto Sans KR";color:#ffe9a8;background:rgba(10,8,18,.6);border:1px solid #c8a050;border-radius:6px;cursor:pointer';
    const sync = () => { b.style.background = PX.on ? 'rgba(120,60,10,.75)' : 'rgba(10,8,18,.6)'; b.style.opacity = PX.on ? '1' : '.55'; };
    b.onclick = () => { PX.on = !PX.on; try { localStorage.setItem('arenaPixFx', PX.on ? '1' : '0'); } catch (e) { } sync(); };
    bar.appendChild(b); sync();
  }
  window.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    if (e.key === 'j' || e.key === 'J') { PX.on = !PX.on; try { localStorage.setItem('arenaPixFx', PX.on ? '1' : '0'); } catch (e2) { } const bs = document.querySelectorAll('#viewBar button'); bs.forEach && bs.forEach(x => { if (x.textContent === '픽셀FX') x.style.background = PX.on ? 'rgba(120,60,10,.75)' : 'rgba(10,8,18,.6)'; }); }
  });
})();
