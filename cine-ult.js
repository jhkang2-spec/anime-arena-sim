// ═══ 필살기 시네마틱(시각 고도화): 필살기 폭발(ultBlast) 순간 전역 슬로모션 + 레터박스 바 + bloom·수차 스파이크 + 속성색 플래시.
// arena.js 의 ultBlast·flashScreen·hexRgb·ELEM 과 aaa.js 의 AAA.force(U.uBloomK/uCA) 를 공개 전역으로만 건드린다.
// 필살기 순간에만 발동(쿨다운 1.5s) → 평소 플레이·성능에 영향 없음. 삭제 시 <script> 한 줄만 빼면 원상복구.
(function () {
  if (typeof ultBlast !== 'function' || typeof flashScreen !== 'function') return;
  const C = window.CINE = { scale: 1, active: false, until: 0 };
  // ── 레터박스 바(위/아래) — 품질 무관으로 확실히 티 남 ──
  const stage = document.getElementById('stage') || document.body;
  const wrap = document.createElement('div'); wrap.id = 'cineBars';
  wrap.style.cssText = 'position:fixed;left:0;right:0;top:0;bottom:0;pointer-events:none;z-index:6';
  const bt = document.createElement('div'), bb = document.createElement('div');
  [bt, bb].forEach(b => { b.style.cssText = 'position:absolute;left:0;right:0;height:0;background:#000;transition:height .16s ease;box-shadow:0 0 40px rgba(0,0,0,.7)'; });
  bt.style.top = '0'; bb.style.bottom = '0'; wrap.appendChild(bt); wrap.appendChild(bb); stage.appendChild(wrap);

  const RAMP = .16, HOLD = .5, REL = .7, LOW = .3, BAR = '8vh';
  function hex2rgb(h) { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h || ''); return m ? parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) : '255,255,255'; }
  let t0 = 0;
  function trigger(ek) {
    const now = performance.now(); if (now < C.until) return; C.until = now + 1500;
    C.active = true; t0 = now;
    bt.style.height = bb.style.height = BAR;
    try { const c = (typeof ELEM !== 'undefined' && ELEM[ek] && ELEM[ek].c) || '#ffffff'; flashScreen(.5, hex2rgb(c)); } catch (e) { }
    if (window.AAA && AAA.force) { AAA.force.uCA = .013; if (AAA.ultra) AAA.force.uBloomK = .5; }
  }
  function end() {
    C.active = false; C.scale = 1; bt.style.height = bb.style.height = '0';
    if (window.AAA && AAA.force) { delete AAA.force.uCA; delete AAA.force.uBloomK; }
  }
  (function frame() {
    if (C.active) {
      const el = (performance.now() - t0) / 1000;
      if (el < RAMP) C.scale = 1 - (1 - LOW) * (el / RAMP);
      else if (el < RAMP + HOLD) C.scale = LOW;
      else if (el < RAMP + HOLD + REL) { const k = (el - RAMP - HOLD) / REL; C.scale = LOW + (1 - LOW) * k; }
      else end();
    }
    requestAnimationFrame(frame);
  })();

  const _ub = ultBlast;
  ultBlast = function (p, ek, rad, owner, nm) { try { trigger(ek); } catch (e) { } return _ub.apply(this, arguments); };
})();
