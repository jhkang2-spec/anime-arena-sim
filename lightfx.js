// 순간 광원·화면 효과 — 소유자 요청(11-05): 기술끼리 부딪히거나 맞을 때 순간적으로 빛나고 뿌예지는 화려한 광원 효과
// 1) 동적 점광원 풀(재사용, 항상 장면에 두고 세기만 바꿔 셰이더 재컴파일 없음) — 주변 인물·바닥·바위가 실제로 밝아짐
// 2) 화면 효과(절제): 가장자리 플래시·화이트아웃·비네트 펄스·먼지 헤이즈·빛줄기·렌즈 플레어·색수차 근사·방사 흐림 근사
// 3) 속성별(번개 스트로브·불 일렁임·얼음 서리·어둠 흡수·물 일렁임·영역전개 색조 반전)
// 4) 광과민 배려: 강한 번쩍임은 초당 3회까지, 같은 프레임 중첩 제한, 품질 단계(getQuality) 연동, 낮 배경 보정
// 공개 함수(wound·clash·callout·explode·ultBlast)를 감싸기만 하고 다른 파일은 고치지 않는다. 끄기: localStorage arenaLightFx = '0'
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined' || typeof camera === 'undefined') return;
  const LF = window.LIGHTFX = { on: true, st: { light: 0, edge: 0, strong: 0, blocked: 0, haze: 0, ca: 0, rays: 0, flare: 0, domain: 0, dash: 0, ko: 0 } };
  try { if (localStorage.getItem('arenaLightFx') === '0') LF.on = false; } catch (e) { }
  const Q = () => (typeof getQuality === 'function' ? getQuality() : 'mid') || 'mid';
  const nowS = () => performance.now() / 1000;
  const isDay = () => { try { return localStorage.getItem('arenaWorld') !== 'train'; } catch (e) { return true; } };
  const ekOf = (f, ek) => ek || (f && (f.elem || (f.ch && f.ch.sig && f.ch.sig.elem))) || 'power';
  const colOf = ek => (typeof ELEM !== 'undefined' && ELEM[ek] && ELEM[ek].c) || '#fff0c8';
  const kindOf = ek => /bolt|light|sound/.test(ek) ? 'bolt' : /fire|sun|steam|kurama/.test(ek) ? 'fire' : /ice|mist/.test(ek) ? 'ice' : /dark|hollow|getsuga|blood|room/.test(ek) ? 'dark' : /water/.test(ek) ? 'water' : 'other';
  const cHex = c => { const k = new THREE.Color(c); return [Math.round(k.r * 255), Math.round(k.g * 255), Math.round(k.b * 255)]; };
  const rgba = (c, a) => { const [r, g, b] = cHex(c); return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`; };

  // ═══ 1) 점광원 풀 ═══
  const NPOOL = 8, POOL = [];
  for (let i = 0; i < NPOOL; i++) { const l = new THREE.PointLight('#ffffff', 0, 120, 2); scene3.add(l); POOL.push({ l, t: 9, dur: 0, peak: 0, kind: 'other', rise: 0, p: new THREE.Vector3() }); }
  const capN = () => { const q = Q(); return q === 'low' ? 2 : q === 'mid' ? 4 : (window.AAA && AAA.ultra) ? 8 : 6; };
  function light(p, col, peak, dur, rad, kind, rise) {
    if (!LF.on || !p) return;
    const cap = capN(); let best = null;
    for (let i = 0; i < cap; i++) { const s = POOL[i]; if (s.t >= s.dur) { best = s; break; } if (!best || (s.peak * (1 - s.t / s.dur)) < (best.peak * (1 - best.t / best.dur))) best = s; }
    if (!best) return;
    best.t = 0; best.dur = dur; best.peak = peak * (isDay() ? 1.7 : 1); best.kind = kind || 'other'; best.rise = rise || 0;
    best.p.copy(p); best.l.position.set(p.x, p.y + 4, p.z); best.l.color.set(col); best.l.distance = rad; LF.st.light++;
  }
  function tickLights(dt) {
    const cap = capN();
    for (let i = 0; i < NPOOL; i++) {
      const s = POOL[i];
      if (i >= cap || s.t >= s.dur) { s.l.intensity = 0; continue; }
      s.t += dt; const u = Math.min(1, s.t / Math.max(.01, s.dur));
      let k = s.rise ? (u < s.rise ? u / s.rise : Math.pow(1 - (u - s.rise) / (1 - s.rise), 1.6)) : (s.t < .04 ? s.t / .04 : Math.pow(1 - u, 1.8));
      if (s.kind === 'bolt') k *= Math.random() < .35 ? .25 : 1;
      else if (s.kind === 'fire') k *= .78 + .22 * Math.sin(s.t * 38 + i);
      s.l.intensity = s.peak * Math.max(0, k) * .5; /* 소유자 요청(11-05): 눈부심 — 빛 세기 절반 */
    }
  }

  // ═══ 2) 화면 효과 겹(캔버스 하나, HUD 글자 아래) ═══
  const stage = document.getElementById('stage'), glC = document.getElementById('gl'), hudC = document.getElementById('scene');
  const ov = document.createElement('canvas'); ov.id = 'lfx';
  ov.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;opacity:.5;'; /* 화면 번쩍임·테두리 빛 절반 */
  if (stage && hudC) stage.insertBefore(ov, hudC);
  const oc = ov.getContext('2d');
  const S = { edges: [], white: 0, whiteC: '#ffffff', vig: 0, vigC: '#000000', haze: 0, hazeC: '#c8b89a', rays: [], ca: 0, blur: 0, domain: 0, domainC: '#7a3cff', tintK: null, tintT: 0, tintC: '#fff', dark: 0 };
  const strongT = [];
  function allowStrong() { const t = nowS(); while (strongT.length && t - strongT[0] > 1) strongT.shift(); if (strongT.length >= 3) { LF.st.blocked++; return false; } strongT.push(t); LF.st.strong++; return true; }
  let frameEdges = 0;
  function edge(col, a, dur) { if (frameEdges >= ((window.AAA && AAA.ultra) ? 3 : 2)) return; frameEdges++; S.edges.push({ col, a: Math.min(.42, a * (isDay() ? 1.25 : 1)), t: 0, dur }); if (S.edges.length > 6) S.edges.shift(); LF.st.edge++; }
  function ray(p3, col, dur, n) { if (Q() === 'low') return; S.rays.push({ p3: p3.clone(), col, t: 0, dur, n: n || 9, seed: Math.random() * 6.28 }); if (S.rays.length > 3) S.rays.shift(); LF.st.rays++; }
  function tint(kind, col, dur) { S.tintK = kind; S.tintC = col; S.tintT = dur; }
  const scr = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2 * ov.width, y: (1 - v.y) / 2 * ov.height, back: v.z > 1 || v.z < -1 }; };

  let lastFilter = '';
  function drawOverlay(dt) {
    const sh = Q() === 'low' ? 2 : (window.AAA && AAA.ultra) ? 0 : 1; // 11-07: 울트라는 화면 겹도 1:1 해상도(도트 수 증량)
    const W = Math.max(64, (stage ? stage.clientWidth : 640) >> sh), H = Math.max(40, (stage ? stage.clientHeight : 380) >> sh);
    if (ov.width !== W || ov.height !== H) { ov.width = W; ov.height = H; }
    oc.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy), day = isDay();
    // 먼지·연기 헤이즈(뿌예짐): 아래쪽이 더 진한 흙빛 막 + 흐르는 얼룩
    if (S.haze > .01) {
      const t = nowS(), a = Math.min(.42, S.haze);
      const g = oc.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(S.hazeC, a * .35)); g.addColorStop(1, rgba(S.hazeC, a)); oc.fillStyle = g; oc.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) { const x = (Math.sin(t * .23 + i * 1.7) * .5 + .5) * W, y = H * (.45 + .4 * Math.sin(t * .17 + i)), r = W * (.22 + .08 * i); const gg = oc.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, rgba(S.hazeC, a * .45)); gg.addColorStop(1, rgba(S.hazeC, 0)); oc.fillStyle = gg; oc.fillRect(0, 0, W, H); }
      S.haze *= Math.pow(.55, dt);
    }
    // 어둠 속성: 빛을 빨아들이듯 어두워짐 + 보라 테두리
    if (S.dark > .01) { oc.fillStyle = `rgba(8,0,16,${Math.min(.32, S.dark)})`; oc.fillRect(0, 0, W, H); const g = oc.createRadialGradient(cx, cy, R * .55, cx, cy, R); g.addColorStop(0, 'rgba(120,40,255,0)'); g.addColorStop(1, `rgba(140,60,255,${Math.min(.4, S.dark * 1.2)})`); oc.fillStyle = g; oc.fillRect(0, 0, W, H); S.dark = Math.max(0, S.dark - dt * .7); }
    // 영역전개: 보라 공간 색조(지속) — 시작 순간은 CSS 색조 반전으로
    if (S.domain > 0) { const k = Math.min(1, S.domain); oc.fillStyle = rgba(S.domainC, .16 * k); oc.fillRect(0, 0, W, H); const g = oc.createRadialGradient(cx, cy, R * .2, cx, cy, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(S.domainC, .38 * k)); oc.fillStyle = g; oc.fillRect(0, 0, W, H); S.domain -= dt; }
    // 속성 일렁임(불=주황 일렁임 / 얼음=청백 서리 / 물=물빛 띠)
    if (S.tintT > 0) {
      const t = nowS(), k = Math.min(1, S.tintT / .4);
      if (S.tintK === 'fire') { const a = (.12 + .08 * Math.sin(t * 31)) * k; const g = oc.createRadialGradient(cx, cy, R * .45, cx, cy, R); g.addColorStop(0, 'rgba(255,120,30,0)'); g.addColorStop(1, `rgba(255,110,20,${a * 2})`); oc.fillStyle = g; oc.fillRect(0, 0, W, H); }
      else if (S.tintK === 'ice') { const g = oc.createRadialGradient(cx, cy, R * .5, cx, cy, R); g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(1, `rgba(215,245,255,${.42 * k})`); oc.fillStyle = g; oc.fillRect(0, 0, W, H); oc.strokeStyle = `rgba(240,252,255,${.35 * k})`; oc.lineWidth = 1; for (let i = 0; i < 14; i++) { const ang = i / 14 * 6.283 + t * .2, r0 = R * .78, x0 = cx + Math.cos(ang) * r0, y0 = cy + Math.sin(ang) * r0; oc.beginPath(); oc.moveTo(x0, y0); oc.lineTo(x0 + Math.cos(ang + .6) * 9, y0 + Math.sin(ang + .6) * 9); oc.lineTo(x0 + Math.cos(ang) * 16, y0 + Math.sin(ang) * 16); oc.stroke(); } }
      else if (S.tintK === 'water') { for (let i = 0; i < 5; i++) { const y = ((t * 40 + i * H / 5) % (H + 30)) - 15; oc.fillStyle = `rgba(90,170,255,${.07 * k})`; oc.beginPath(); for (let x = 0; x <= W; x += 8) oc.lineTo(x, y + Math.sin(x * .05 + t * 6 + i) * 6); oc.lineTo(W, y + 14); oc.lineTo(0, y + 14); oc.fill(); } }
      S.tintT -= dt;
    }
    // 빛줄기(갓레이): 화면에 비친 광원에서 퍼지는 가는 빛살 + 렌즈 플레어
    oc.globalCompositeOperation = 'lighter';
    S.rays = S.rays.filter(r => {
      r.t += dt; const u = r.t / r.dur; if (u >= 1) return false;
      const s = scr(r.p3); if (s.back) return true;
      const a = (u < .15 ? u / .15 : 1 - (u - .15) / .85) * (day ? .32 : .24);
      for (let i = 0; i < r.n; i++) { const ang = r.seed + i / r.n * 6.283 + r.t * .4, len = R * (.7 + .3 * Math.sin(i * 2.3)), w = .05 + .03 * Math.sin(i * 1.7); const g = oc.createLinearGradient(s.x, s.y, s.x + Math.cos(ang) * len, s.y + Math.sin(ang) * len); g.addColorStop(0, rgba(r.col, a)); g.addColorStop(1, rgba(r.col, 0)); oc.fillStyle = g; oc.beginPath(); oc.moveTo(s.x, s.y); oc.lineTo(s.x + Math.cos(ang - w) * len, s.y + Math.sin(ang - w) * len); oc.lineTo(s.x + Math.cos(ang + w) * len, s.y + Math.sin(ang + w) * len); oc.closePath(); oc.fill(); }
      if (Q() !== 'low') { LF.st.flare++; const dx = cx - s.x, dy = cy - s.y; [[.35, 10, .2], [.7, 6, .16], [1.25, 14, .1], [1.6, 5, .14]].forEach(([f, rr, aa]) => { const x = s.x + dx * f, y = s.y + dy * f, g = oc.createRadialGradient(x, y, 0, x, y, rr); g.addColorStop(0, rgba(r.col, aa * a * 3)); g.addColorStop(1, rgba(r.col, 0)); oc.fillStyle = g; oc.beginPath(); oc.arc(x, y, rr, 0, 6.283); oc.fill(); }); }
      return true;
    });
    // 가장자리 플래시(히트 플래시) — 화면 가운데는 비우고 테두리 쪽만 밝아짐
    S.edges = S.edges.filter(e => {
      e.t += dt; const u = e.t / e.dur; if (u >= 1) return false;
      const a = e.a * (u < .2 ? u / .2 : 1 - (u - .2) / .8);
      const g = oc.createRadialGradient(cx, cy, R * .38, cx, cy, R * 1.02); g.addColorStop(0, rgba(e.col, 0)); g.addColorStop(1, rgba(e.col, a)); oc.fillStyle = g; oc.fillRect(0, 0, W, H);
      return true;
    });
    oc.globalCompositeOperation = 'source-over';
    // 화이트아웃(필살기 정점) → 색 복귀
    if (S.white > .005) { oc.fillStyle = rgba(S.whiteC, Math.min(.5, S.white)); oc.fillRect(0, 0, W, H); S.white *= Math.pow(.02, dt); }
    // 비네트 펄스(집중)
    if (S.vig > .01) { const g = oc.createRadialGradient(cx, cy, R * .35, cx, cy, R); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(S.vigC, Math.min(.55, S.vig))); oc.fillStyle = g; oc.fillRect(0, 0, W, H); S.vig *= Math.pow(.12, dt); }
    // 색수차·방사 흐림·영역전개 반전: 그림판 캔버스에 짧게 CSS 필터(그 밖엔 비움)
    const parts = [];
    if (S.ca > 0) { const k = Math.max(1, Math.round(3 * Math.min(1, S.ca / .1))); parts.push(`drop-shadow(${k}px 0 0 rgba(255,40,60,.5)) drop-shadow(${-k}px 0 0 rgba(40,230,255,.5))`); S.ca -= dt; }
    if (S.blur > 0) { parts.push(`blur(${(1.2 * Math.min(1, S.blur / .12)).toFixed(2)}px)`); S.blur -= dt; }
    if (S.domainFlash > 0) { const k = Math.min(1, S.domainFlash / .25); parts.push(`invert(${(.85 * k).toFixed(2)}) hue-rotate(${Math.round(180 * k)}deg)`); S.domainFlash -= dt; }
    const f = parts.join(' ');
    if (glC && f !== lastFilter) { glC.style.filter = f; lastFilter = f; }
    frameEdges = 0;
  }

  // ═══ 3) 사건 → 빛 연출 ═══
  function hit(v, a, ek) {
    const p = typeof chest === 'function' ? chest(v) : v.pos.clone(); const e = ekOf(a, ek), col = colOf(e), kind = kindOf(e);
    const t = nowS(), recent = a && a._coT && t - a._coT < 2.6, grade = recent ? (a._coUlt ? 'ult' : 'mid') : 'basic';
    if (grade === 'basic') { light(p, col, 1.6, .2, 60, kind); edge(col, .08, .14); return; }
    if (grade === 'mid') { light(p, col, 3.2, .38, 95, kind); edge(col, .18, .22); if (Math.random() < .35) S.ca = .08; S.haze = Math.min(.5, S.haze + .05); flavor(kind, col, .45); return; }
    light(p, col, 8, 1, 190, kind); light(p.clone().add(new THREE.Vector3(0, 12, 0)), '#ffffff', 4.5, .35, 120, 'other');
    if (allowStrong()) { S.white = Math.max(S.white, isDay() ? .32 : .42); S.whiteC = kind === 'dark' ? '#d8c0ff' : '#ffffff'; S.ca = .12; }
    else edge(col, .3, .3);
    S.vig = .4; S.vigC = '#000000'; ray(p, col, .9, 11); S.haze = Math.min(.55, S.haze + .25); S.hazeC = kind === 'ice' ? '#d8eef8' : kind === 'water' ? '#a8c8e0' : '#c8b89a'; LF.st.haze++; flavor(kind, col, .8);
  }
  function flavor(kind, col, dur) {
    if (kind === 'bolt') { edge('#dff0ff', .22, .08); setTimeout(() => edge('#ffffff', .18, .07), 90); setTimeout(() => edge('#cfe4ff', .12, .07), 180); }
    else if (kind === 'fire') tint('fire', col, dur);
    else if (kind === 'ice') tint('ice', col, dur);
    else if (kind === 'water') tint('water', col, dur);
    else if (kind === 'dark') S.dark = Math.max(S.dark, .3);
  }
  const DOMAIN_RE = /영역\s*전개|무량공처|복마어주자|영역/;
  function onCallout(f, text, ult) {
    if (!f) return; const p = typeof chest === 'function' ? chest(f) : f.pos.clone(), e = ekOf(f), col = colOf(e), kind = kindOf(e);
    if (DOMAIN_RE.test(String(text || ''))) { LF.st.domain++; S.domain = 4; S.domainC = /스쿠나|복마/.test(String(text)) ? '#c0203a' : '#7a3cff'; if (allowStrong()) S.domainFlash = .25; light(p, S.domainC, 5, 1.6, 200, 'other', .3); ray(p, S.domainC, 1.6, 14); return; }
    if (ult) { light(p, col, 4.5, 1.2, 140, kind, .55); S.vig = Math.max(S.vig, .32); ray(p, col, 1.2, 12); flavor(kind, col, 1); }
    else light(p, col, 1.8, .45, 70, kind, .4);
  }
  function onClash(a, b, big) { if (!a || !b) return; const p = (typeof chest === 'function' ? chest(a).add(chest(b)) : a.pos.clone().add(b.pos)).multiplyScalar(.5); light(p, '#fff6e0', big ? 3.6 : 1.8, big ? .3 : .16, big ? 110 : 70, 'bolt'); edge('#fff4dc', big ? .2 : .09, .12); }
  function onExplode(p, ek, pw) { if (!p) return; const e = ekOf(null, ek), col = colOf(e), kind = kindOf(e); pw = pw || 1; light(p, col, 2 + pw * 1.5, .3 + .15 * pw, 80 + pw * 30, kind); S.haze = Math.min(.5, S.haze + .08 * pw); if (pw >= 2) { edge(col, .16 + .04 * pw, .25); if (pw >= 3 && Math.random() < .5) S.ca = .1; } }
  function onUltBlast(p, ek, rad) { if (!p) return; const e = ekOf(null, ek), col = colOf(e), kind = kindOf(e); light(p, col, 9, 1.1, 200, kind); if (allowStrong()) { S.white = Math.max(S.white, isDay() ? .34 : .45); S.ca = .12; } ray(p, col, 1.1, 13); S.haze = Math.min(.6, S.haze + .35); S.vig = .45; flavor(kind, col, 1); }

  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); try { if (LF.on) fn.apply(this, arguments); } catch (e) { console.warn('lightfx', name, e); } return r; }; };
  wrap('wound', (v, a, text, ek) => hit(v, a, ek));
  wrap('clash', (a, b, text, big) => onClash(a, b, big));
  wrap('callout', (f, text, ult) => onCallout(f, text, ult));
  wrap('explode', (p, ek, pw) => onExplode(p, ek, pw));
  wrap('ultBlast', (p, ek, rad) => onUltBlast(p, ek, rad));
  // 필살기 맞받아치기: 두 기술이 부딪히는 순간(조금 뒤) 큰 섬광·색수차·빛줄기
  if (window.TACTICS && typeof TACTICS.hook === 'function') {
    TACTICS.hook('ultReaction', ev => { if (!LF.on || !ev || ev.kind !== 'counter' || !ev.caster || !ev.other) return; setTimeout(() => { try { const p = chest(ev.caster).add(chest(ev.other)).multiplyScalar(.5); light(p, '#ffffff', 7.5, .9, 190, 'bolt'); light(p, colOf(ekOf(ev.caster)), 5, 1.1, 170, 'other'); if (allowStrong()) { S.white = Math.max(S.white, .4); S.ca = .14; } ray(p, '#fff4d0', 1.1, 16); S.haze = Math.min(.6, S.haze + .3); } catch (e) { } }, 650); });
    TACTICS.hook('interaction', ev => { if (!LF.on || !ev || !ev.f) return; try { light(chest(ev.f), /감전/.test(ev.kind) ? '#fff060' : /불|얼음/.test(ev.kind) ? '#ffd0a0' : '#c8e0ff', 2.6, .4, 90, /감전/.test(ev.kind) ? 'bolt' : 'other'); } catch (e) { } });
  }
  // KO: 붉은 비네트 펄스 / 돌진(빠른 이동): 짧은 방사 흐림
  let lastKO = window.HP && HP.st ? HP.st.ko : 0;
  function watch() {
    if (window.HP && HP.st && HP.st.ko > lastKO) { lastKO = HP.st.ko; LF.st.ko++; S.vig = Math.max(S.vig, .5); S.vigC = '#5a0008'; }
    if (Q() !== 'low' && typeof F !== 'undefined' && S.blur <= 0) { for (const f of F) { const v = f.vel; if (v && Math.hypot(v.x, v.z) > 520) { S.blur = .12; LF.st.dash++; break; } } }
  }

  let last = performance.now();
  (function loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    try { if (LF.on) { watch(); tickLights(dt); drawOverlay(dt); } else { POOL.forEach(s => { s.l.intensity = 0; }); if (ov.width) oc.clearRect(0, 0, ov.width, ov.height); if (glC && lastFilter) { glC.style.filter = ''; lastFilter = ''; } } } catch (e) { console.warn('lightfx loop', e); }
    requestAnimationFrame(loop);
  })(performance.now());
  LF.set = on => { LF.on = !!on; try { localStorage.setItem('arenaLightFx', on ? '1' : '0'); } catch (e) { } };
  LF.test = { hit, onCallout, onClash, onExplode, onUltBlast, S, POOL };
})();
