// 시점(교전 화면 아래 [카메라] 버튼 하나 — 누를 때마다 액션→쿼터뷰→3인칭→1인칭→자유): 액션뷰(기존 역동 카메라) / 3인칭(고른 인물 뒤·위에서 따라감) / 1인칭(고른 인물 눈높이에서 상대를 봄) / 자유(마우스로 돌려 보기).
// 자유: 왼쪽 끌기 = 궤도 회전, 오른쪽(또는 Shift) 끌기 = 이동, Ctrl+휠·두 손가락 집기 = 확대(그냥 휠은 페이지 스크롤 그대로), 두 번 클릭 = 액션뷰로.
// arena.js 의 camUpdate 를 감싼다(기존 카메라 계산·흔들림은 그대로 두고, 3인칭·1인칭일 때만 위치·시선을 덮어씀).
// 60fps 원칙: 매 화면 새 객체를 만들지 않도록 벡터는 미리 만들어 재사용한다.
(function () {
  if (typeof camUpdate !== 'function' || typeof camera === 'undefined') return;
  const V = { mode: 'act', key: null, f: null, init: false, hid: [], hidModel: null };
  try { const s = JSON.parse(localStorage.getItem('arenaView') || 'null'); if (s && ['act', 'quarter', 'tp', 'fp', 'free'].includes(s.mode)) { V.mode = s.mode; V.key = s.key || null; } } catch (e) {}
  const save = () => { try { localStorage.setItem('arenaView', JSON.stringify({ mode: V.mode, key: V.key })); } catch (e) {} };
  const sPos = new THREE.Vector3(), sLook = new THREE.Vector3(), want = new THREE.Vector3(), look = new THREE.Vector3(), dir = new THREE.Vector3(), eye = new THREE.Vector3(), shk = new THREE.Vector3();
  const EYE = new THREE.Vector3(3.0, 2.4, 0); // 머리 뼈대 기준 눈 위치(앞 +x, 위 +y; 모형 단위)
  const qHead = new THREE.Quaternion(), qFix = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2); // 카메라 -z(앞) → 머리 +x(앞)
  // 1인칭 동안 숨길 곳: 머리·목·깃(눈 바로 아래). 몸통·팔·손·다리는 그대로 보임
  function hideSelf(m) {
    if (V.hidModel === m) { V.hid.forEach(o => o.visible = false); return; }
    unhide(); V.hidModel = m;
    const add = o => { if (o && o.visible !== false) { V.hid.push(o); o.visible = false; } };
    add(m.head);
    if (m.body) m.body.children.forEach(o => { if (o.isMesh && o.position.y >= 25) add(o); }); // 목·깃(카메라 바로 아래). 몸통·팔·다리는 보임
  }
  const unhide = () => { V.hid.forEach(o => o.visible = true); V.hid = []; V.hidModel = null; };
  // 따라가는 인물은 '자리(fighter)' 기준 — 교대로 인물이 바뀌어도 같은 자리를 계속 따라가고 이름만 바꿈
  function follow() {
    if (V.f && F.includes(V.f) && V.f.ch) { if (V.f.ch.key !== V.key) { V.key = V.f.ch.key; V.init = false; unhide(); save(); syncUI(); } return V.f; }
    V.f = V.key ? F.find(x => x.ch && x.ch.key === V.key) || null : null; return V.f;
  }
  function setMode(m, key) {
    if (key !== undefined) { V.key = key; V.f = null; }
    if (m !== 'act' && m !== 'free' && m !== 'quarter' && !follow()) { V.f = F[0] || null; V.key = V.f && V.f.ch ? V.f.ch.key : null; }
    V.mode = m === 'free' || m === 'quarter' ? m : V.key ? m : 'act'; if (m === 'free') FR.init = false; V.init = false; unhide(); if (V.mode === 'act' && camera.near !== 1) { camera.near = 1; camera.updateProjectionMatrix(); } save(); syncUI();
  }
  window.setCamView = setMode; window.getCamView = () => ({ mode: V.mode, key: V.key });
  window.camEyeOf = (f, out) => { const h = (window.mocapHeadOf && window.mocapHeadOf(f)) || f.model.head; h.updateWorldMatrix(true, false); return (out || new THREE.Vector3()).copy(EYE).applyMatrix4(h.matrixWorld); }; // 시험용

  // ── 자유 시점(궤도 카메라) ──
  const FR = { init: false, yaw: 0, pitch: .35, dist: 120, tgt: new THREE.Vector3() }, fv = new THREE.Vector3();
  function freeCam() {
    if (!FR.init) { // 지금 카메라 자리에서 시작
      FR.tgt.set(0, 8, 0); if (F.length) { FR.tgt.set(0, 0, 0); F.forEach(f => FR.tgt.add(f.pos)); FR.tgt.divideScalar(F.length); FR.tgt.y = 9; }
      fv.copy(camera.position).sub(FR.tgt); FR.dist = Math.max(25, Math.min(400, fv.length())); FR.yaw = Math.atan2(fv.x, fv.z); FR.pitch = Math.asin(Math.max(-.2, Math.min(1.3, fv.y / FR.dist))); FR.init = true;
    }
    FR.pitch = Math.max(-.15, Math.min(1.45, FR.pitch));
    camera.position.set(FR.tgt.x + Math.sin(FR.yaw) * Math.cos(FR.pitch) * FR.dist, FR.tgt.y + Math.sin(FR.pitch) * FR.dist, FR.tgt.z + Math.cos(FR.yaw) * Math.cos(FR.pitch) * FR.dist);
    camera.position.y = Math.max(2, camera.position.y); camera.lookAt(FR.tgt);
  }
  // ── 쿼터뷰: 대각선 위(방위 45°, 약 37° 내려다봄) 고정 방향, 출전 인물이 모두 들어오게 자동 확대·축소 ──
  const QV = { init: false, c: new THREE.Vector3(), d: 160 }, qc = new THREE.Vector3(), qOff = new THREE.Vector3(Math.cos(.65) * Math.sin(Math.PI / 4), Math.sin(.65), Math.cos(.65) * Math.cos(Math.PI / 4));
  function quarterCam(dt) {
    let r = 30; qc.set(0, 0, 0);
    if (F.length) { F.forEach(f => qc.add(f.pos)); qc.divideScalar(F.length); F.forEach(f => { r = Math.max(r, Math.hypot(f.pos.x - qc.x, f.pos.z - qc.z) + 18 * (f.scale || 1)); }); }
    qc.y = 8;
    const vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect), need = r / Math.tan(Math.min(vfov, hfov) / 2) * 1.15;
    const want = Math.max(70, Math.min(420, need));
    if (!QV.init) { QV.c.copy(qc); QV.d = want; QV.init = true; }
    const a = 1 - Math.exp(-dt * 3); QV.c.lerp(qc, a); QV.d += (want - QV.d) * a;
    camera.position.copy(QV.c).addScaledVector(qOff, QV.d); camera.lookAt(QV.c);
    if (Math.abs(camera.fov - 48) > .1) { camera.fov += (48 - camera.fov) * .15; camera.updateProjectionMatrix(); }
  }
  const _cam = camUpdate;
  const rt = new THREE.Vector3(), sDir = new THREE.Vector3(1, 0, 0);
  const setNear = n => { if (Math.abs(camera.near - n) > 1e-4) { camera.near = n; camera.updateProjectionMatrix(); } };
  camUpdate = function (dt, idle) {
    _cam(dt, idle);
    if (V.mode === 'act') { if (V.hid.length) unhide(); setNear(1); return; }
    if (V.mode === 'free') { if (V.hid.length) unhide(); freeCam(); setNear(.5); return; }
    if (V.mode === 'quarter') { if (V.hid.length) unhide(); quarterCam(dt); setNear(1); return; }
    const f = follow();
    if (!f || !f.model) { setMode('act'); setNear(1); return; } // 인물이 빠지면 액션뷰로
    shk.copy(camera.position).sub(cam.pos); // 기존 흔들림(타격·폭발)
    let fov;
    if (V.mode === 'fp') {
      // 1인칭: 이번 화면의 자세가 다 잡힌 뒤(poseModel 다음) 머리 뼈대에 카메라를 딱 붙임 — 위치 감쇠 없음, 방향 = 머리의 실제 앞
      const h = (window.mocapHeadOf && window.mocapHeadOf(f)) || f.model.head; h.updateWorldMatrix(true, false); // 사람 동작 인물(mocap.js)이면 새 머리 기준
      eye.copy(EYE).applyMatrix4(h.matrixWorld);
      h.getWorldQuaternion(qHead);
      camera.position.copy(eye); camera.quaternion.copy(qHead).multiply(qFix);
      const sm = Math.min(.03, shk.length() * .004); if (sm > 1e-4) { camera.rotateX((Math.random() - .5) * sm); camera.rotateY((Math.random() - .5) * sm); } // 흔들림은 회전에만 아주 약하게
      hideSelf(f.model); setNear(.08); fov = 80; V.init = false;
    } else { // 어깨 너머 3인칭(부드럽게 따라감)
      if (V.hid.length) unhide();
      const sc = f.scale || 1, tg = f.faceT && F.includes(f.faceT) && f.faceT !== f ? f.faceT : null;
      if (tg) { dir.set(tg.pos.x - f.pos.x, 0, tg.pos.z - f.pos.z); if (dir.lengthSq() < .01) dir.set(Math.cos(f.heading), 0, Math.sin(f.heading)); }
      else dir.set(Math.cos(f.heading), 0, Math.sin(f.heading));
      dir.normalize();
      if (!V.init) sDir.copy(dir); else sDir.lerp(dir, 1 - Math.exp(-dt * 7)).normalize();
      rt.set(-sDir.z, 0, sDir.x);
      want.copy(f.pos).addScaledVector(sDir, -30 * sc).addScaledVector(rt, 10 * sc); want.y = f.pos.y + 21 * sc;
      if (tg) { look.copy(tg.pos); look.y += 16 * MS * (tg.scale || 1); look.addScaledVector(rt, 3 * sc); }
      else { look.copy(f.pos).addScaledVector(sDir, 60); look.y += 14 * sc; }
      if (!V.init) { sPos.copy(want); sLook.copy(look); V.init = true; }
      const far = sPos.distanceTo(want) > 120; // 순간이동·교대처럼 크게 튀면 바로 붙음
      const a = far ? 1 : 1 - Math.exp(-dt * 9);
      sPos.lerp(want, a); sLook.lerp(look, Math.min(1, a * 1.3)); sPos.y = Math.max(sPos.y, 2.2);
      camera.position.copy(sPos).addScaledVector(shk, .6); camera.lookAt(sLook);
      setNear(.5); fov = 60;
    }
    if (Math.abs(camera.fov - fov) > .1) { camera.fov += (fov - camera.fov) * .15; camera.updateProjectionMatrix(); }
  };

  // ── 화면 단추 ──
  const stage = document.getElementById('stage'); if (!stage) return;
  const css = document.createElement('style');
  css.textContent = '#viewBar{position:static;margin-top:5px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;max-width:100%;box-sizing:border-box}#viewBar .vt{font:700 11px/1 sans-serif;color:#9fb4e0;margin-right:2px}'
    + '#viewBar button,#viewBar select{min-height:32px;background:rgba(10,8,18,.78);border:2px solid #5a7ac8;border-radius:6px;padding:4px 8px;font:700 11px/1.1 sans-serif;color:#d8e6ff;cursor:pointer}'
    + '#viewBar button.on{background:#2a4a9a;color:#fff;border-color:#9fc0ff}#viewBar select{max-width:140px;padding:2px 3px}#viewBar button:hover{background:#1e2e5a}';
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'viewBar'; bar.title = '시점 고르기'; { const t = document.createElement('span'); t.className = 'vt'; t.textContent = '시점'; bar.appendChild(t); }
  const ORDER = ['act', 'quarter', 'tp', 'fp', 'free'], LBL = { act: '액션', quarter: '쿼터뷰', tp: '3인칭', fp: '1인칭', free: '자유' };
  const B = {}; /* 예전 단추 묶음과의 호환용(비어 있음) */
  const cyc = document.createElement('button'); cyc.type = 'button'; cyc.id = 'camCycle'; cyc.title = '누를 때마다 시점이 바뀝니다: 액션 → 쿼터뷰 → 3인칭 → 1인칭 → 자유(끌어 돌리기·두 손가락 확대)';
  cyc.onclick = () => { const i = ORDER.indexOf(V.mode), m = ORDER[(i + 1) % ORDER.length]; if (m === 'quarter') QV.init = false; setMode(m); };
  bar.appendChild(cyc);
  const sel = document.createElement('select'); sel.title = '따라갈 인물'; sel.onchange = () => setMode(V.mode === 'tp' || V.mode === 'fp' ? V.mode : 'tp', sel.value); bar.appendChild(sel);
  { const tb = document.getElementById('teamBar'); if (tb && tb.parentNode) tb.parentNode.insertBefore(bar, tb.nextSibling); else stage.parentNode.insertBefore(bar, stage.nextSibling); } // 교전 화면 바깥 아래(시야를 가리지 않게)
  let sig = '';
  function syncUI() {
    cyc.textContent = '🎥 카메라: ' + (LBL[V.mode] || '액션'); sel.style.display = V.mode === 'tp' || V.mode === 'fp' ? '' : 'none';
    const s = F.map(x => x.ch ? x.ch.key : '').join(',');
    if (s !== sig) { sig = s; sel.innerHTML = ''; F.forEach(x => { if (!x.ch) return; const op = document.createElement('option'); op.value = x.ch.key; op.textContent = x.ch.name; sel.appendChild(op); }); }
    if (V.key && F.some(x => x.ch && x.ch.key === V.key)) sel.value = V.key; else if (sel.options.length) sel.selectedIndex = 0;
  }
  setInterval(() => { if (V.mode !== 'act' && V.mode !== 'free' && V.mode !== 'quarter' && !follow()) setMode('act'); else syncUI(); }, 600);
  // 자유 시점 조작(교전 화면 위). 그냥 휠은 막지 않음(페이지 스크롤 유지)
  const P = new Map(); let drag = null, pinch = 0;
  stage.addEventListener('contextmenu', e => { if (V.mode === 'free') e.preventDefault(); });
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && V.mode !== 'free') return; P.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey, moved: false }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', e => {
    if (!P.has(e.pointerId) || !drag) return; const p0 = P.get(e.pointerId), dx = e.clientX - p0.x, dy = e.clientY - p0.y; P.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (P.size === 2) { const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) FR.dist = Math.max(18, Math.min(420, FR.dist * pinch / d)); pinch = d; return; }
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    if (!drag.moved) { drag.moved = true; if (V.mode !== 'free') setMode('free'); }
    if (drag.b === 2 || drag.sh) { const k = FR.dist * .0025; fv.set(-Math.cos(FR.yaw), 0, Math.sin(FR.yaw)).multiplyScalar(-dx * k); FR.tgt.add(fv); FR.tgt.y = Math.max(0, FR.tgt.y + dy * k); }
    else { FR.yaw -= dx * .008; FR.pitch += dy * .006; }
    e.preventDefault();
  });
  const end = e => { P.delete(e.pointerId); if (P.size < 2) pinch = 0; if (!P.size) drag = null; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', e => { if (!e.ctrlKey || V.mode !== 'free') return; e.preventDefault(); FR.dist = Math.max(18, Math.min(420, FR.dist * Math.exp(e.deltaY * .0015))); }, { passive: false });
  stage.addEventListener('dblclick', () => { if (V.mode === 'free') setMode('act'); });
  const ta = () => { stage.style.touchAction = V.mode === 'free' ? 'none' : ''; }; setInterval(ta, 600); ta();
  syncUI();
})();
