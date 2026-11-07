// PIXELFX 통합층(11-07): patch-gg/pixelfx(오픈소스 MIT) 244종 픽셀 이펙트를 3D 전투에 얹는다.
// 화면 겹 캔버스(#pxfx, HUD 아래·WebGL 위)에 저해상도 픽셀버퍼로 그려 CSS 확대(픽셀아트 유지).
// 이벤트: wound/clash/explode/ultBlast/proj 래퍼 — 품질별 동시개수 예산, 요소별 팔레트, 버튼·J키 토글(localStorage arenaPixFx).
(function () {
  if (typeof THREE === 'undefined' || typeof window.PIXELFX_LIB === 'undefined') return;
  const L = window.PIXELFX_LIB, PX = window.PIXFX = { on: true, st: { spawns: 0, culled: 0, skipped: 0 }, lib: L };
  try { if (localStorage.getItem('arenaPixFx') === '0') PX.on = false; } catch (e) { }
  const Q = () => { try { return (window.getQuality && getQuality()) || 'mid'; } catch (e) { return 'mid'; } };
  const budget = () => Q() === 'low' ? 0 : (window.AAA && AAA.ultra) ? 46 : Q() === 'high' ? 14 : Q() === 'mid' ? 6 : 0;
  const stage = document.getElementById('stage'), glC = document.getElementById('gl'), hudC = document.getElementById('scene');
  const cv = document.createElement('canvas'); cv.id = 'pxfx';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;image-rendering:pixelated;opacity:.92;';
  if (stage && hudC) stage.insertBefore(cv, hudC);
  const ctx = cv.getContext('2d');
  let frame = null, img = null, W = 0, H = 0, active = [], dirty = false;
  function size() {
    const cw = (glC && glC.clientWidth) || (stage && stage.clientWidth) || 640, chh = (glC && glC.clientHeight) || 360;
    const bw = Q() === 'low' ? 256 : (window.AAA && AAA.ultra) ? 512 : Q() === 'high' ? 384 : 320;
    const w = bw, h = Math.max(120, Math.round(bw * chh / cw));
    if (w !== W || h !== H) { W = w; H = h; frame = L.createFrame(W, H); img = new ImageData(W, H); cv.width = W; cv.height = H; }
  }
  function scr(p) { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, off: v.z > 1 || v.z < -1 }; }
  const ELEM = { fire: '#ff5a50', flame: '#ff8a3a', lava: '#ff6a2a', sun: '#ffd24a', bolt: '#ffd24a', thunder: '#ffe15a', lightning: '#ffe15a', water: '#3fb8ff', ice: '#9ad6ff', frost: '#bfe8ff', snow: '#cfe9ff', wind: '#a8e6c8', air: '#c8f0d8', dark: '#8a3ad4', hollow: '#6a2ab4', shadow: '#7a35c4', void: '#5a2a8a', curse: '#9a4ae4', light: '#ffdf7a', chakra: '#ffcf4a', petal: '#ffb0c8', sand: '#d8b060', earth: '#b08050', rock: '#a08a60', stone: '#9a9a8a', metal: '#b8c8d8', slash: '#e8eef5', poison: '#6ad46a', venom: '#5ab45a' };
  function ramp(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16), k = (m) => 'rgb(' + m + ')';
    const mul = (s) => '#' + [r, g, b].map(v => Math.min(255, Math.round(v * s)).toString(16).padStart(2, '0')).join('');
    return [mul(.25), mul(.5), mul(.8), hex, mul(1.4)];
  }
  const EFX = { fire: 'fire/fireball', lava: 'fire/flame-pillar', sun: 'fire/flame-pillar', thunder: 'lightning/zap-hit', bolt: 'lightning/spark-arc', lightning: 'lightning/zap-hit', water: 'water/splash', ice: 'ice/ice-shatter', frost: 'ice/ice-crystal', snow: 'ice/snowflake-burst', wind: 'nature/spore-burst', air: 'nature/spore-burst', petal: 'nature/spore-burst', dark: 'shadow/hex-sigil', hollow: 'shadow/hex-sigil', shadow: 'shadow/eclipse', void: 'shadow/black-hole', curse: 'shadow/dark-explosion', light: 'holy/feather-burst', chakra: 'arcane/mana-burst', poison: 'nature/poison-cloud', venom: 'nature/poison-cloud', earth: 'nature/earth-spike', rock: 'nature/boulder', stone: 'nature/boulder', sand: 'nature/quake', metal: 'impacts/blunt-hit', slash: 'impacts/hit-spark' };
  function spawn(key, p3, o) {
    const cap = budget();
    if (!PX.on || cap === 0 || !p3 || typeof p3.clone !== 'function') { PX.st.skipped++; return; }
    if (active.length >= cap) { try { active.shift().fx.stop(); } catch (e) { } PX.st.culled++; }
    const mod = L.EFFECTS[key]; if (!mod) { PX.st.skipped++; return; }
    const s = scr(p3); if (s.off || s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40) { PX.st.skipped++; return; }
    try {
      const opts = Object.assign({ x: Math.round(s.x), y: Math.round(s.y), seed: (Math.random() * 1e6) | 0 }, o || {});
      const fx = L.createFx(mod, opts);
      active.push({ fx, loop: !!mod.meta.loop, st: false }); PX.st.spawns++;
      dirty = true;
    } catch (e) { PX.st.skipped++; }
  }
  PX.spawn = spawn;
  const chest = f => f && f.pos ? (f.pos.y !== undefined ? f.pos.clone().add(new THREE.Vector3(0, 1.05, 0)) : null) : null;
  const ang = (a, v) => { if (!a || !v || !a.pos || !v.pos) return 0; const pa = scr(a.pos.clone().add(new THREE.Vector3(0, 1, 0))), pv = scr(v.pos.clone().add(new THREE.Vector3(0, 1, 0))); return Math.atan2(pv.y - pa.y, pv.x - pa.x); };
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
        if (active.length || dirty) { for (const e of active) { try { e.fx.stop(); } catch (e2) { } } active = []; ctx.clearRect(0, 0, W, H); dirty = false; }
        return;
      }
      size();
      if (active.length) {
        L.clearFrame(frame);
        for (const e of active) {
          if (e.loop && !e.st && e.fx.t >= 2.1) { e.fx.stop(); e.st = true; }
          e.fx.update(dt); e.fx.draw(frame, 'front');
        }
        active = active.filter(e => !e.fx.done());
        L.composite(frame, img.data, null);
        ctx.putImageData(img, 0, 0);
        dirty = true;
      } else if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; }
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
