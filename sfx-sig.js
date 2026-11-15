// sfx-sig.js — 11-15 소유자 평가 "게임 사운드는 '나아졌다' 정도. '좋아졌다·완벽해졌다' 여야 한다" → 기술별 전용 사운드 디자인.
// 원칙: 화면에 보이는 대표 기술 연출(fx-sig.js 14종 레시피·fx-naruto.js 나선환/치도리/나선수리검/미수옥/기린 등)과
//   ① 같은 타이밍(모으기 → 발사 → 비행 → 착탄)에 ② 원작 소리 성격(나선환=회오리 윙윙, 치도리=천 마리 새 지저귐, X 버너=앞 광선 굉음+뒤 반동 분사,
//   월아천충=날 선 바람 가름, 허식 자=두 음이 합쳐지는 낮은 공명, 흑섬=검은 번개 파열 …)을 실시간 합성으로 입힌다.
// 추가: 공격 동작 휘두름 바람(무기·발·주먹별) / 고속 근접 통과음(도플러) / 비행 인물 추진 분사음.
// 출력: sfx.js 공용 버스(SFX.rbus → 덕킹·글루 컴프·리미터)와 협곡 잔향(SFX.verbIn). 종·벨처럼 길게 울리는 순음은 쓰지 않는다(0.25초 넘는 사인 배음 금지).
(function () {
  if (typeof THREE === 'undefined') return;
  const SS = window.SFX_SIG = { on: true, st: {} };
  try { if (localStorage.getItem('arenaSfxSig') === '0') SS.on = false; } catch (e) { }
  const R = (a, b) => a + Math.random() * (b - a), cnt = k => { SS.st[k] = (SS.st[k] || 0) + 1; };
  let ctx = null, out = null, white = null, brown = null, voices = 0;
  const MAXV = 90;
  function ready() {
    if (!SS.on || !window.SFX || !SFX.on || !SFX.started || !SFX.ctx) return false;
    if (ctx !== SFX.ctx) build(SFX.ctx);
    return ctx.state === 'running' && voices < MAXV;
  }
  function build(c) {
    ctx = c; out = ctx.createGain(); out.gain.value = .85;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 26; // 들리지 않는 초저역 제거(헤드룸)
    out.connect(hp); hp.connect(SFX.rbus || ctx.destination);
    white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    brown = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  }
  // ── 공간: 카메라 기준 거리 감쇠·공기 고음 감쇠·좌우 위치 + 잔향 보냄 ──
  const tmp = new THREE.Vector3(), rt = new THREE.Vector3();
  function place(pos) { if (!pos || typeof camera === 'undefined') return { g: 1, pan: 0, d: 80 }; tmp.copy(pos).sub(camera.position); const d = tmp.length(); rt.set(1, 0, 0).applyQuaternion(camera.quaternion); return { g: 1 / (1 + Math.max(0, d - 60) / 180), pan: Math.max(-.9, Math.min(.9, tmp.dot(rt) / Math.max(30, d))), d }; }
  function bus(pos, send = .35, gain = 1) {
    const s = place(pos), p = ctx.createStereoPanner(), g = ctx.createGain(); p.pan.value = s.pan; g.gain.value = s.g * gain;
    let n = g; if (s.d > 140) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(1800, 16000 * Math.exp(-(s.d - 140) / 160)); g.connect(lp); n = lp; }
    p.connect(g); n.connect(out);
    if (send > 0 && SFX.verbIn) { const sg = ctx.createGain(); sg.gain.value = send * Math.min(1.7, .7 + s.d / 280); n.connect(sg); sg.connect(SFX.verbIn); }
    p.pan0 = s.pan; return p;
  }
  // 엔벌로프: 올림 a → 유지 h → 내림 r (지수)
  function env(g, t, a, peak, h, r, lin) { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setValueAtTime(peak, t + a + h); if (lin) g.gain.linearRampToValueAtTime(0, t + a + h + r); else g.gain.exponentialRampToValueAtTime(.0001, t + a + h + r); return t + a + h + r; }
  const live = s => { voices++; s.onended = () => { voices--; }; };
  // 잡음 층: type 필터, f0→f1 주파수 이동, q, 길이(a/h/r), brown=갈색잡음
  function nz(dst, t, o) {
    const s = ctx.createBufferSource(); s.buffer = o.brown ? brown : white; s.loop = true; s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0, t); if (o.f1) (o.linF ? f.frequency.linearRampToValueAtTime(o.f1, t + (o.sweep || (o.a || .003) + (o.h || 0) + (o.r || .1))) : f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + (o.sweep || (o.a || .003) + (o.h || 0) + (o.r || .1)))); f.Q.value = o.q ?? 1;
    const g = ctx.createGain(); const end = env(g, t, o.a || .003, o.g ?? .5, o.h || 0, o.r || .1, o.lin);
    s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random() * 1.5); s.stop(end + .05); live(s);
    return { s, f, g };
  }
  // 진동자 층: f0→f1, 비브라토(vib Hz, vibA 깊이), 필터(lp)
  function osc(dst, t, o) {
    const s = ctx.createOscillator(); s.type = o.type || 'sine'; s.frequency.setValueAtTime(o.f0, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(Math.max(18, o.f1), t + (o.sweep || (o.a || .005) + (o.h || 0) + (o.r || .1)));
    if (o.det) s.detune.value = o.det;
    let n = s; if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lp1) f.frequency.exponentialRampToValueAtTime(o.lp1, t + (o.sweep || (o.a || .005) + (o.h || 0) + (o.r || .1))); f.Q.value = o.q || .7; n.connect(f); n = f; }
    const g = ctx.createGain(); const end = env(g, t, o.a || .005, o.g ?? .3, o.h || 0, o.r || .1, o.lin); n.connect(g); g.connect(dst);
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.type = o.vibT || 'sine'; l.frequency.value = o.vib; lg.gain.value = o.vibA || 10; l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(end + .05); }
    if (o.am) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.am; lg.gain.value = (o.g ?? .3) * (o.amD || .6); l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(end + .05); }
    s.start(t); s.stop(end + .05); live(s); return { s, g };
  }
  // 떨림(진폭 변조): 굉음·분사의 거친 질감
  function flutter(param, t, end, hz, depth) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.type = 'triangle'; l.frequency.value = hz; lg.gain.value = depth; l.connect(lg); lg.connect(param); l.start(t); l.stop(end + .05); }
  // 잔 틱(불꽃 탁탁·전기 지직·파편)
  function ticks(dst, t, dur, n, f0, f1, g, q = 3) { for (let i = 0; i < n; i++) nz(dst, t + R(0, dur), { type: 'bandpass', f0: R(f0, f1), q, a: .001, r: R(.006, .02), g: g * R(.5, 1) }); }
  // 공기 타격(쿵): 사인 낙하 + 저역 잡음
  function thump(dst, t, k = 1) { osc(dst, t, { f0: 110 * R(.9, 1.1), f1: 34, a: .003, r: .22 + .2 * k, g: .9 * Math.min(1.6, k) }); nz(dst, t, { type: 'lowpass', f0: 1100, f1: 200, a: .002, r: .12 + .08 * k, g: .6 * Math.min(1.5, k) }); }
  // 휘두름 바람(쉭): 대역 잡음이 위로 쓸려 올라갔다 떨어짐
  function swoosh(dst, t, f0, f1, dur, g, q = 1.4) { nz(dst, t, { type: 'bandpass', f0, f1, q, a: dur * .55, r: dur * .45, g, sweep: dur * .6 }); }
  // 지속 굉음(광선·화염·분사): 갈색 잡음 저역 + 백색 잡음 지글 + 디튠 톱니 웅웅, 떨림
  function roar(dst, t, dur, o = {}) {
    const end = t + dur, w = o.w || 1, a = o.a || .03;
    const b1 = nz(dst, t, { brown: true, type: 'lowpass', f0: (o.lp || 900) + w * 120, q: .6, a, h: dur - a - .3, r: .35, g: (o.g ?? .8) * Math.min(1.5, .7 + w * .12) }); flutter(b1.g.gain, t, end, o.fl || 17, .18);
    const b2 = nz(dst, t, { type: 'bandpass', f0: o.siz || 2200, q: .6, a, h: dur - a - .3, r: .3, g: (o.g ?? .8) * .35 }); flutter(b2.g.gain, t, end, 23, .1);
    [0, 7].forEach(dt => osc(dst, t, { type: 'sawtooth', f0: (o.hz || 55) * (1 + dt / 200), det: dt * 4, lp: 420, a, h: dur - a - .3, r: .35, g: (o.g ?? .8) * .22 }));
    if (o.fire) ticks(dst, t, dur, Math.round(dur * 22), 1800, 5200, .22);
    if (o.elec) { ticks(dst, t, dur, Math.round(dur * 30), 2500, 8000, .25, 6); osc(dst, t, { type: 'sawtooth', f0: 118, lp: 3200, a, h: dur - a - .2, r: .2, g: .1, am: 47, amD: .8 }); }
    if (o.hum) osc(dst, t, { type: 'triangle', f0: o.hum, a, h: dur - a - .25, r: .25, g: .14, vib: 6, vibA: o.hum * .02 });
    return end;
  }
  // 모으기 상승음(윙~): 톱니 + 열리는 필터 + 빨라지는 떨림 + 잡음 스윕
  function charge(dst, t, dur, o = {}) {
    if (dur < .08) return; const f0 = o.f0 || 160, f1 = o.f1 || 720;
    osc(dst, t, { type: 'sawtooth', f0, f1, lp: 300, lp1: o.lp1 || 3600, a: dur * .9, r: .06, g: o.g ?? .14, vib: 7, vibA: f0 * .04, sweep: dur, lin: true });
    osc(dst, t, { type: 'triangle', f0: f0 * 1.5, f1: f1 * 1.5, a: dur * .9, r: .06, g: (o.g ?? .14) * .6, det: 9, sweep: dur, lin: true });
    nz(dst, t, { type: 'bandpass', f0: 300, f1: o.n1 || 3800, q: 2.2, a: dur * .92, r: .05, g: (o.g ?? .14) * 2.2, sweep: dur, lin: true });
  }
  // 발사 순간(파열): 광대역 순간음 + 서브 쿵
  function blast(dst, t, k = 1) { nz(dst, t, { type: 'highpass', f0: 900, a: .001, r: .04, g: .8 * k }); nz(dst, t, { type: 'lowpass', f0: 2600, f1: 380, a: .002, r: .18, g: .7 * k }); osc(dst, t, { f0: 95, f1: 32, a: .003, r: .35 + .15 * k, g: .85 * Math.min(1.5, k) }); }
  // 베기음(챙/싹): 고역 순간 + 내려가는 날 선 잡음
  function slice(dst, t, g = 1, hi = 6200) { nz(dst, t, { type: 'highpass', f0: 3500, a: .0008, r: .012, g: .7 * g }); nz(dst, t + .002, { type: 'bandpass', f0: hi * R(.9, 1.1), f1: hi * .32, q: 2.6, a: .002, r: .07, g: .5 * g }); }
  // 색 → 소리 성질
  const hsl = { h: 0, s: 0, l: 0 };
  function flavorOf(c) { try { new THREE.Color(c || '#ffffff').getHSL(hsl); } catch (e) { return 'energy'; } if (hsl.s < .2) return hsl.l < .2 ? 'dark' : 'white'; const h = hsl.h * 360; if (h < 45 || h > 340) return 'fire'; if (h < 70) return 'elec'; if (h < 170) return 'energy'; if (h < 250) return 'energy'; return 'dark'; }
  const chestOf = f => (typeof chest === 'function' && f && f.pos) ? chest(f) : (f && f.pos ? f.pos.clone() : null);
  const backOf = f => { try { const fw = typeof fwdOf === 'function' ? fwdOf(f) : new THREE.Vector3(1, 0, 0); return chestOf(f).addScaledVector(fw, -18); } catch (e) { return chestOf(f); } };
  const distAB = (a, b) => { const p = chestOf(a), q = chestOf(b); return p && q ? p.distanceTo(q) : 80; };

  // ═════ 레시피별 사운드(fx-sig.js 와 같은 시간표) ═════
  const SND = {
    // 월아천충·물의 호흡 등 초승달 참격: 날 세운 발사음 → 거리만큼 날아가는 바람 가름(다가올수록 높게) → 착탄 베기
    crescent(a, b, o) {
      const n = o.n || 1, sp = o.speed || 340, size = o.size || 16, big = size >= 50, dark = !!o.dark;
      for (let k = 0; k < n; k++) { const t = ctx.currentTime + .01 + (o.delay || 0) + k * (o.gap ?? .12), tr = Math.min(1.6, distAB(a, b) / sp), d = bus(chestOf(a), .4, big ? 1.3 : 1), e = bus(chestOf(b), .45);
        slice(d, t, big ? 1.3 : 1, dark ? 3800 : 6500); swoosh(d, t, 500, 2600, .22, .45, 1.1);
        nz(d, t + .02, { type: 'bandpass', f0: dark ? 700 : 1400, f1: dark ? 2400 : 4200, q: 1.8, a: tr * .8, r: .12, g: big ? .55 : .32, sweep: tr }); // 날아오는 바람 가름
        if (dark) { osc(d, t, { type: 'sawtooth', f0: 62, lp: 380, a: .05, h: tr, r: .3, g: .24, am: 31, amD: .5 }); ticks(d, t, tr, 10, 1500, 4000, .2); }
        if (big) { osc(d, t, { f0: 70, f1: 28, a: .02, r: 1.4, g: .8 }); nz(e, t + tr, { brown: true, type: 'lowpass', f0: 500, f1: 90, a: .01, r: 1.8, g: .9 }); }
        slice(e, t + tr, big ? 1.5 : 1, 5200); thump(e, t + tr, big ? 1.8 : .9); }
      cnt('crescent');
    },
    // 광선(허화·리펄서·유니빔·X 버너·소각포·불꽃 화살): 모으기 → 파열 → 굉음 지속 (back: 뒤로 반동 분사 굉음 따로)
    beam(a, b, o, tx) {
      const t = ctx.currentTime + .01 + (o.delay || 0), c = o.charge ?? .25, dur = o.dur || .6, w = o.w || 2, fl = flavorOf(o.c), d = bus(chestOf(a), .45, Math.min(1.4, .7 + w * .1));
      if (/탕/.test(tx)) { // 총성
        nz(d, t, { type: 'highpass', f0: 1200, a: .0005, r: .025, g: 1 }); nz(d, t, { type: 'bandpass', f0: 380, q: .8, a: .001, r: .09, g: .9 }); osc(d, t, { f0: 160, f1: 50, a: .002, r: .2, g: .7 }); nz(d, t + .02, { type: 'bandpass', f0: 1800, f1: 600, q: .7, a: .01, r: .5, g: .25 }); cnt('gun'); return; }
      if (/웹/.test(tx)) { swoosh(d, t, 1800, 6500, .09, .4, 2); nz(d, t + .06, { type: 'bandpass', f0: 900, q: 3, a: .002, r: .05, g: .3 }); cnt('web'); return; }
      charge(d, t, c, { f0: fl === 'dark' ? 90 : 170, f1: fl === 'dark' ? 380 : 900, g: .12 + w * .012 });
      const T = t + c; blast(d, T, Math.min(1.8, .7 + w * .14));
      roar(d, T, dur + .15, { w, g: .7, lp: fl === 'fire' ? 1100 : 800, siz: fl === 'elec' ? 3800 : fl === 'fire' ? 2000 : 2600, fire: fl === 'fire', elec: fl === 'elec', hum: fl === 'energy' || fl === 'white' ? 220 : fl === 'dark' ? 82 : 0, hz: w > 5 ? 44 : 58 });
      if (o.back) { const bk = bus(backOf(a), .5, 1.1); // X 버너: 뒤로 내뿜는 부드러운 불꽃(반동 제어) — 더 거칠고 낮은 분사음
        nz(bk, T + .02, { type: 'highpass', f0: 700, a: .05, h: dur * .9, r: .4, g: .55 }); const j = nz(bk, T, { brown: true, type: 'lowpass', f0: 700, a: .06, h: dur * .9, r: .45, g: .75 }); flutter(j.g.gain, T, T + dur + .5, 31, .25); ticks(bk, T, dur, 18, 1500, 4500, .2); }
      // 착탄 쪽 지글거림
      const e = bus(chestOf(b), .4, .9); nz(e, T + .04, { type: 'bandpass', f0: 3200, q: .8, a: .02, h: dur * .8, r: .2, g: .25 }); if (w >= 4) nz(e, T + dur, { brown: true, type: 'lowpass', f0: 600, f1: 100, a: .02, r: 1.3, g: .7 });
      cnt(o.back ? 'beamBack' : 'beam');
    },
    // 용(빙륜환·생생유전·염호·화뢰신·백룡): 포효(톱니 + 포먼트) + 속성 흐름음, 비행 T 초 뒤 착탄
    dragon(a, b, o) {
      const t = ctx.currentTime + .02 + (o.delay || 0), T = o.T || .9, sc = o.scale || 1, fl = flavorOf(o.c), d = bus(chestOf(a), .5, 1.1), e = bus(chestOf(b), .5);
      const g1 = osc(d, t, { type: 'sawtooth', f0: 95 / sc, f1: 62 / sc, a: .12, h: T * .6, r: .5, g: .32, vib: 23, vibA: 9, am: 27, amD: .5, sweep: T + .5 }); // 포효 몸통
      [620, 1250, 2400].forEach((f, i) => { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 3; nz(d, t + .02, { type: 'bandpass', f0: f, q: 4, a: .15, h: T * .5, r: .4, g: .22 - i * .05 }); });
      if (fl === 'fire') roar(d, t, T + .3, { g: .45, lp: 1200, fire: true });
      else if (fl === 'elec') roar(d, t, T + .3, { g: .4, elec: true });
      else { nz(d, t, { type: 'lowpass', f0: 1500, f1: 600, a: .2, h: T * .6, r: .4, g: .55 }); for (let i = 0; i < 12; i++) osc(d, t + R(0, T), { f0: R(400, 900), f1: R(1100, 2000), a: .005, r: .05, g: .07 }); /* 물·얼음 흐름 + 거품 */ if (o.c2 === '#ffffff' && /9fdcff|ffffff/.test(o.c)) ticks(d, t, T, 14, 4000, 9000, .12, 5); }
      thump(e, t + T, 1.5 * sc); nz(e, t + T, { type: 'lowpass', f0: 2400, f1: 300, a: .01, r: .9, g: .6 }); cnt('dragon');
    },
    // 꽃잎(센본자쿠라·반딧불): 수백 개 칼날의 사각거림 + 휘도는 바람
    petals(a, b, o) {
      const t = ctx.currentTime + .02, d = bus(chestOf(b), .45, 1), N = Math.min(70, Math.round((o.n || 220) / 4));
      const w = nz(d, t, { type: 'bandpass', f0: 900, f1: 3200, q: 1.2, a: .4, h: .8, r: .6, g: .4, sweep: 1.4 }); flutter(w.f.frequency, t, t + 1.8, 3.5, 700);
      ticks(d, t + .1, 1.6, N, 4500, 9500, .16, 4); nz(d, t, { type: 'highpass', f0: 6000, a: .3, h: .9, r: .5, g: .12 }); cnt('petals');
    },
    // 벽력일섬: 0.25초 지직 예비 → 천둥 파열 + 전기 지퍼 + 우르릉
    lightningDash(a, b, o) {
      const t = ctx.currentTime + .01, T = t + (o.delay ?? .25), d = bus(chestOf(a), .5, 1.1), e = bus(chestOf(b), .6, 1.2);
      ticks(d, t, .25, 14, 3000, 8000, .2, 6); osc(d, t, { type: 'sawtooth', f0: 120, lp: 2600, a: .2, r: .05, g: .12, am: 53 });
      nz(e, T, { type: 'highpass', f0: 1800, a: .0008, r: .03, g: 1.1 }); nz(e, T, { type: 'bandpass', f0: 3200, q: 1, a: .001, r: .12, g: .6 });
      osc(e, T, { type: 'sawtooth', f0: 3200, f1: 260, lp: 7000, a: .002, r: .14, g: .22 }); nz(e, T + .02, { brown: true, type: 'lowpass', f0: 420, f1: 120, a: .02, r: 1.3, g: .8 }); ticks(e, T, .5, 12, 2000, 7000, .25, 5); cnt('lightningDash');
    },
    // 흑섬: 빨아들이는 역회전음(0.12초) → 검은 번개 파열(일그러진 크랙 + 서브) → 지직 꼬리
    blackFlash(a, b, o) {
      const T = ctx.currentTime + .01 + (o.delay ?? .45), e = bus(chestOf(b), .55, 1.3);
      nz(e, T - .14, { type: 'lowpass', f0: 250, f1: 5000, q: 1.5, a: .14, r: .004, g: .45, lin: true, sweep: .14 });
      nz(e, T, { type: 'highpass', f0: 1400, a: .0006, r: .02, g: 1.2 }); nz(e, T, { type: 'bandpass', f0: 950, q: 1.6, a: .001, r: .07, g: 1 }); osc(e, T, { f0: 130, f1: 28, a: .002, r: .6, g: 1.1 });
      osc(e, T, { type: 'sawtooth', f0: 72, lp: 900, a: .004, r: .35, g: .3, am: 41, amD: .8 }); ticks(e, T, .45, 16, 1800, 6500, .3, 5); cnt('blackFlash');
    },
    // 허식 자(두 구슬 합체)·혁·빅뱅 액셀: 모으기(합체면 낮은 파랑음+높은 빨강음이 서로 다가감) → 발사 → 낮은 공명 비행
    orbShot(a, b, o) {
      const t = ctx.currentTime + .01 + (o.delay || 0), chg = o.merge ? .7 : .35, sp = o.speed || 220, s = o.size || 1, tr = Math.min(2.2, distAB(a, b) / sp), d = bus(chestOf(a), .5, 1.1), fl = flavorOf(o.c);
      if (o.merge) { osc(d, t, { type: 'triangle', f0: 82, f1: 150, a: chg * .9, r: .05, g: .26, vib: 5, vibA: 3, sweep: chg }); osc(d, t, { type: 'sawtooth', f0: 600, f1: 300, lp: 1800, a: chg * .9, r: .05, g: .1, sweep: chg }); nz(d, t, { type: 'bandpass', f0: 200, f1: 1600, q: 3, a: chg * .9, r: .05, g: .3, lin: true, sweep: chg }); }
      else charge(d, t, chg, { f0: fl === 'fire' ? 220 : 180, f1: 800, g: .13 });
      const T = t + chg; blast(d, T, 1 + s * .3);
      roar(d, T, tr, { g: .5 * s, lp: 600, hz: o.merge ? 41 : 60, hum: o.merge ? 110 : fl === 'energy' ? 220 : 0, fire: fl === 'fire' });
      const e = bus(chestOf(b), .6, 1.2); if (o.merge) nz(e, T + tr, { brown: true, type: 'lowpass', f0: 500, f1: 70, a: .02, r: 2.2, g: 1 }); cnt('orbShot');
    },
    // 창(아오): 주변을 빨아들이는 역스윕 → 끝에서 둔탁한 압착
    implode(b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .3), e = bus(chestOf(b), .5, 1.1);
      nz(e, t, { type: 'lowpass', f0: 4000, f1: 160, q: 1.4, a: .65, r: .04, g: .55, lin: true, sweep: .7 }); osc(e, t, { type: 'triangle', f0: 420, f1: 55, a: .6, r: .06, g: .22, sweep: .7 });
      nz(e, t, { type: 'bandpass', f0: 600, q: 6, a: .5, r: .1, g: .2 }); thump(e, t + .7, 1.4); ticks(e, t + .7, .3, 10, 800, 2600, .3); cnt('implode');
    },
    // 충격파(진지한 펀치·영압 폭발·기어 세컨드·헐크 스매시): 공기 파열 크랙 → 거대 쿵 → 아래로 쓸리는 바람 → 우르릉·잔해
    shockwave(a, b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .25), k = Math.min(2.4, (o.R || 60) / 55) * (o.punch ? 1.4 : 1), p = o.atTarget && b ? chestOf(b) : chestOf(a), e = bus(p, .7, Math.min(1.5, .7 + k * .3));
      nz(e, t, { type: 'highpass', f0: 1200, a: .0008, r: .03, g: .9 }); osc(e, t, { f0: 80, f1: 22, a: .004, r: .9 + k * .5, g: Math.min(1.4, .7 + k * .3) });
      nz(e, t, { type: 'lowpass', f0: 3000, f1: 400, a: .003, r: .3, g: .8 }); nz(e, t + .01, { type: 'bandpass', f0: 5500, f1: 300, q: .8, a: .02, r: .9 + k * .4, g: .45, sweep: 1 + k * .4 });
      nz(e, t + .02, { brown: true, type: 'lowpass', f0: 380, f1: 80, a: .03, r: 1 + k * .8, g: .8 }); if (k > 1.2) ticks(e, t + .2, 1.6, Math.round(10 * k), 900, 3000, .22); cnt(o.punch ? 'seriousPunch' : 'shockwave');
    },
    // 화염 연사(디아블 잠브·화권·염제): 발마다 '훅' 점화 + 이어지는 불길 굉음·탁탁
    fireStream(a, b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .2), n = o.n || 9, s = o.size || 1, d = bus(chestOf(a), .45, Math.min(1.4, .8 + s * .2));
      for (let i = 0; i < n; i += 2) nz(d, t + i * .035, { type: 'lowpass', f0: 300, f1: 1800, q: .8, a: .03, r: .25, g: .4 * s });
      roar(d, t, n * .035 + .6 + s * .3, { g: .5 * s, lp: 1300, siz: 1900, fire: true, hz: 50 }); cnt('fireStream');
    },
    // 불꽃 휘감김(폭혈·지옥도): 점화 '화륵' + 불타는 지속음
    flamesOn(b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .35), dur = o.dur || 2.5, e = bus(chestOf(b), .4, .9), fl = flavorOf(o.c);
      nz(e, t, { type: 'lowpass', f0: 250, f1: 2400, q: .8, a: .06, r: .4, g: .6 }); const L = nz(e, t + .05, { type: 'lowpass', f0: fl === 'dark' ? 600 : 1000, q: .7, a: .3, h: dur - .8, r: .5, g: .35 }); flutter(L.g.gain, t, t + dur, 9, .12);
      ticks(e, t, dur, Math.round(dur * 14), 1800, 5000, .18); if (fl === 'dark') osc(e, t, { type: 'triangle', f0: 70, a: .3, h: dur - .8, r: .5, g: .16, vib: 3, vibA: 4 }); cnt('flamesOn');
    },
    // 난도질(해·팔·삼도류·회전 베기): 화면 속 베기선마다 한 번씩 '챙/싹'(위치를 대상 주위로 흩뿌림)
    slashStorm(a, b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .25), n = o.n || 10, gp = o.gap || .055, s = o.size || 1, p = chestOf(b);
      for (let i = 0; i < n; i++) { const q = p.clone().add(new THREE.Vector3(R(-30, 30), R(-6, 8), R(-30, 30))), e = bus(q, .35, .8 * s); slice(e, t + i * gp + R(0, .01), R(.75, 1.1) * s, R(5000, 7500)); if (i % 3 === 0) nz(e, t + i * gp, { type: 'lowpass', f0: 600, a: .002, r: .06, g: .35 }); }
      swoosh(bus(p, .3), t - .05, 700, 3000, .2 + n * gp, .3, 1); cnt('slashStorm');
    },
    // 고무고무(총·개틀링·거인의 총·레드 호크): 늘어나는 '뾰옹' + 바람 → 주먹 명중 쿵(개틀링은 연타)
    rubberArm(a, b, o) {
      const t = ctx.currentTime + .01 + (o.delay ?? .2), d = bus(chestOf(a), .3, 1), e = bus(chestOf(b), .45, 1.1);
      if (o.barrage) { for (let i = 0; i < 14; i++) { const ti = t + i * .045; swoosh(d, ti - .03, 700, 2200, .06, .18, 1.6); nz(e, ti + .05, { type: 'lowpass', f0: 1400, a: .002, r: .05, g: .45 }); osc(e, ti + .05, { f0: 140, f1: 55, a: .002, r: .08, g: .35 }); } cnt('gatling'); return; }
      const big = !!o.big; osc(d, t - .15, { type: 'sine', f0: big ? 300 : 420, f1: big ? 110 : 170, a: .01, r: .28, g: .22, vib: 19, vibA: 24 }); // 고무 늘어남
      swoosh(d, t - .12, big ? 350 : 600, big ? 1500 : 2600, .3, .45, 1.2); const T = t + .3; thump(e, T, big ? 2 : 1.2); nz(e, T, { type: 'highpass', f0: 1600, a: .001, r: .02, g: .6 });
      if (o.fireFist) roar(e, T - .05, .7, { g: .5, lp: 1300, fire: true }); cnt('rubberArm');
    },
    // 얼음 기둥(천상옥좌·제로 지점 돌파): 얼어붙는 우지직(점점 높아짐) + 저역 갈림 + 짧은 결정음 → 마지막 쩍
    iceColumn(b, o) {
      const t = ctx.currentTime + .01, e = bus(chestOf(b), .5, 1);
      for (let i = 0; i < 40; i++) { const u = i / 40; nz(e, t + u * 1.1 + R(0, .03), { type: 'bandpass', f0: 1200 + u * 3500 + R(-200, 200), q: 3, a: .001, r: R(.01, .03), g: .35 * R(.5, 1) }); }
      nz(e, t, { brown: true, type: 'lowpass', f0: 260, a: .5, h: .4, r: .5, g: .5 }); for (let i = 0; i < 8; i++) osc(e, t + .3 + R(0, .9), { f0: R(2600, 5200), a: .001, r: R(.06, .14), g: .06 });
      nz(e, t + 1.2, { type: 'highpass', f0: 1500, a: .001, r: .05, g: .8 }); thump(e, t + 1.2, .8); cnt('iceColumn');
    },
    // 기린: 먹구름 우르릉(0~0.55초) → 하늘에서 떨어지는 거대 낙뢰 크랙 + 천둥 굴림(협곡 잔향 크게)
    kirin(a, b) {
      const t = ctx.currentTime + .01, p = chestOf(b), sky = bus(p.clone().add(new THREE.Vector3(0, 120, 0)), .9, 1.1), e = bus(p, .9, 1.5);
      nz(sky, t, { brown: true, type: 'lowpass', f0: 300, a: .4, h: .1, r: .3, g: .6 }); ticks(sky, t + .2, .35, 8, 2500, 7000, .15, 6);
      const T = t + .55; nz(e, T, { type: 'highpass', f0: 1500, a: .0005, r: .05, g: 1.3 }); nz(e, T, { type: 'bandpass', f0: 2500, q: .7, a: .001, r: .25, g: .8 }); osc(e, T, { type: 'sawtooth', f0: 4200, f1: 180, lp: 9000, a: .001, r: .2, g: .25 });
      osc(e, T, { f0: 90, f1: 24, a: .004, r: 1.8, g: 1.2 }); const rb = nz(e, T + .05, { brown: true, type: 'lowpass', f0: 700, f1: 90, a: .05, r: 3, g: 1 }); flutter(rb.g.gain, T, T + 3, 4, .3); ticks(e, T, 1, 24, 1500, 7000, .3, 5); cnt('kirin');
    },
  };
  SS.snd = SND;

  // ═════ fx-sig.js 연결표에 사운드 덧입히기: 각 항목의 레시피 호출과 옵션을 읽어 같은 인자로 사운드도 재생 ═════
  const RECIPES = Object.keys(SND).filter(k => k !== 'kirin');
  const CALL_RE = new RegExp('(' + RECIPES.join('|') + ')\\((a, b|b)(?:, (\\{[^{}]*\\}))?\\)', 'g');
  function hookSig(tries) {
    const SG = window.SIG_FX; if (!SG || !SG.map) { if (tries < 40) setTimeout(() => hookSig(tries + 1), 250); return; }
    let n = 0;
    Object.values(SG.map).forEach(list => list.forEach(m => {
      if (m.__snd) return; const src = String(m.fn), calls = [];
      let mt; CALL_RE.lastIndex = 0; while ((mt = CALL_RE.exec(src))) { let of = () => ({}); if (mt[3]) { try { of = new Function('tx', 'return (' + mt[3] + ');'); } catch (e) { } } calls.push({ name: mt[1], tgtOnly: mt[2] === 'b', of }); }
      if (/kirin/.test(src)) calls.push({ name: 'kirin', of: () => ({}) });
      if (!calls.length) return; const f0 = m.fn;
      m.fn = function (a, b, tx) { const r = f0.apply(this, arguments); try { if (ready()) for (const c of calls) { let o = {}; try { o = c.of(String(tx || '')) || {}; } catch (e) { } if (c.tgtOnly) SND[c.name](b, o, tx); else SND[c.name](a, b, o, String(tx || '')); } } catch (e) { SS.err = String(e && e.message || e); } return r; };
      m.__snd = 1; n++;
    }));
    SS.hooked = n;
  }
  hookSig(0);

  // ═════ 나루토 대표 기술(fx-naruto.js): 모으기 상태·비행체 목록을 살펴 지속음 시작/정지 ═════
  const chg = new Map(), fly = new Map();
  function loopNode(pos, gain = 1) { const d = bus(pos, .4, gain), g = ctx.createGain(); g.gain.value = 0; g.connect(d); return { d, g, srcs: [], pan: d }; }
  function stopLoop(L, fade = .15) { if (!L || L.dead) return; L.dead = true; const t = ctx.currentTime; try { L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(L.g.gain.value, t); L.g.gain.linearRampToValueAtTime(0, t + fade); } catch (e) { } L.srcs.forEach(s => { try { s.stop(t + fade + .05); } catch (e) { } }); }
  function addSrc(L, s) { L.srcs.push(s); live(s); return s; }
  function loopNoise(L, type, f, q, g, brownN) { const s = ctx.createBufferSource(); s.buffer = brownN ? brown : white; s.loop = true; const fi = ctx.createBiquadFilter(); fi.type = type; fi.frequency.value = f; fi.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; s.connect(fi); fi.connect(gg); gg.connect(L.g); s.start(ctx.currentTime, Math.random()); addSrc(L, s); return { s, fi, gg }; }
  function loopOsc(L, type, f, g, lp) { const s = ctx.createOscillator(); s.type = type; s.frequency.value = f; let n = s; if (lp) { const fi = ctx.createBiquadFilter(); fi.type = 'lowpass'; fi.frequency.value = lp; n.connect(fi); n = fi; } const gg = ctx.createGain(); gg.gain.value = g; n.connect(gg); gg.connect(L.g); s.start(); addSrc(L, s); return { s, gg }; }
  function lfoL(L, param, hz, depth, type = 'sine') { const l = ctx.createOscillator(), lg = ctx.createGain(); l.type = type; l.frequency.value = hz; lg.gain.value = depth; l.connect(lg); lg.connect(param); l.start(); addSrc(L, l); return l; }
  const NARUTO_LOOP = {
    // 나선환: 손바닥 위 회오리 — 중심 주파수가 빠르게 도는 대역 잡음 + 점점 높아지는 윙윙
    rasen(L, big) { const w = loopNoise(L, 'bandpass', 1300, 2.4, .9); lfoL(L, w.fi.frequency, big ? 7 : 11, 700); const w2 = loopNoise(L, 'bandpass', 2800, 3, .4); lfoL(L, w2.fi.frequency, 17, 1100);
      const o = loopOsc(L, 'triangle', big ? 300 : 520, .07); o.s.frequency.linearRampToValueAtTime(big ? 620 : 980, ctx.currentTime + 1.2); lfoL(L, o.s.frequency, 9, 25); loopNoise(L, 'lowpass', 300, .7, big ? .7 : .35, true); return 1; },
    // 치도리: 천 마리 새 지저귐(빠른 FM 짹짹) + 전기 지직 + 120Hz 윙
    chidori(L) { for (let i = 0; i < 3; i++) { const o = loopOsc(L, 'sine', 3800 + i * 600, .05); const fm = lfoL(L, o.s.frequency, 26 + i * 7, 1300 + i * 300, 'sawtooth'); fm.detune.value = i * 50; }
      const c = loopNoise(L, 'bandpass', 5200, 4, .5); lfoL(L, c.gg.gain, 37, .45, 'square'); const bz = loopOsc(L, 'sawtooth', 120, .09, 3000); lfoL(L, bz.gg.gain, 53, .08, 'square'); return 1; },
    // 나선수리검: 고속 회전 칼날의 날카로운 비명(톱니 + 진폭 떨림) + 바람
    shuri(L, big) { const o = loopOsc(L, 'sawtooth', big ? 640 : 880, .08, 4200); lfoL(L, o.gg.gain, 62, .07, 'square'); lfoL(L, o.s.frequency, 5, 40); const w = loopNoise(L, 'bandpass', 2200, 1.6, .7); lfoL(L, w.fi.frequency, 13, 900); loopNoise(L, 'highpass', 6000, .7, .25); loopNoise(L, 'lowpass', 400, .7, .4, true); return 1; },
    // 미수옥: 깊게 쿵쿵 맥동하는 저음 + 빨려드는 바람
    biju(L) { const o = loopOsc(L, 'sine', 46, .5); const o2 = loopOsc(L, 'sawtooth', 92, .12, 300); lfoL(L, o.gg.gain, 5.5, .35); lfoL(L, o2.gg.gain, 5.5, .1); const w = loopNoise(L, 'bandpass', 500, 2, .6); lfoL(L, w.fi.frequency, .8, 300); loopNoise(L, 'lowpass', 220, .7, .7, true); return 1; },
  };
  let lastClones = null;
  function narutoTick() {
    const NX = window.NARUTO_FX; if (!NX || !NX.charge) return;
    for (const [f, c] of NX.charge) { if (chg.has(f) && chg.get(f).c === c) { const L = chg.get(f).L; if (L && !L.dead && f.pos) { const s = place(chestOf(f)); L.pan.pan.setTargetAtTime(s.pan, ctx.currentTime, .05); } continue; }
      const old = chg.get(f); if (old) stopLoop(old.L); const mk = NARUTO_LOOP[c.kind]; if (!mk) { chg.set(f, { c, L: null }); continue; }
      const L = loopNode(chestOf(f), c.big ? 1.3 : 1); mk(L, c.big); const t = ctx.currentTime; L.g.gain.setValueAtTime(0, t); L.g.gain.linearRampToValueAtTime(.55, t + .12); L.g.gain.linearRampToValueAtTime(.9, t + 1); chg.set(f, { c, L }); cnt('nx_' + c.kind); }
    for (const [f, v] of chg) if (!NX.charge.has(f) || NX.charge.get(f) !== v.c) { // 모으기 끝: 나선환·치도리는 맞힐 때 파열음
      if (v.L) { const p = chestOf(f), carried = (NX.flying || []).some(x => x.a === f && x.t < .2); stopLoop(v.L, carried ? .05 : .12); if ((v.c.kind === 'rasen' || v.c.kind === 'chidori') && p && v.c.t < v.c.life - .05) { const e = bus(p, .55, 1.2), t = ctx.currentTime; if (v.c.kind === 'rasen') { blast(e, t, 1.2); swoosh(e, t, 3000, 400, .5, .5, .9); nz(e, t, { type: 'bandpass', f0: 1400, f1: 300, q: 2, a: .01, r: .7, g: .5 }); } else { nz(e, t, { type: 'highpass', f0: 1800, a: .0005, r: .03, g: 1.1 }); ticks(e, t, .4, 18, 2500, 8000, .3, 6); osc(e, t, { f0: 100, f1: 35, a: .003, r: .35, g: .8 }); } } }
      chg.delete(f); }
    // 비행 중인 나선수리검·미수옥: 투사체를 따라가는 지속음(도플러)
    const FL = NX.flying || []; for (const x of FL) { if (fly.has(x) || !(x.kind === 'shuri' || x.kind === 'biju')) continue; const L = loopNode(x.pr && x.pr.p, x.info && x.info.big ? 1.4 : 1.1); NARUTO_LOOP[x.kind](L, x.info && x.info.big); L.g.gain.setValueAtTime(.9, ctx.currentTime); fly.set(x, L); }
    for (const [x, L] of fly) { if (!FL.includes(x)) { stopLoop(L, .05); fly.delete(x); continue; } if (x.pr && x.pr.p) { const s = place(x.pr.p); L.pan.pan.setTargetAtTime(s.pan, ctx.currentTime, .04); } }
    // 그림자 분신: 생길 때·사라질 때 '펑'
    if (typeof clones !== 'undefined' && Array.isArray(clones)) { if (lastClones) { const cur = new Set(clones); let k = 0; for (const cl of clones) if (!lastClones.has(cl) && cl.pos && k++ < 3) poofS(cl.pos); k = 0; for (const cl of lastClones) if (!cur.has(cl) && cl.pos && k++ < 3) poofS(cl.pos); } lastClones = new Set(clones); }
  }
  function poofS(p) { if (gapK('poof', 60)) return; const e = bus(p, .25, .8), t = ctx.currentTime; nz(e, t, { type: 'lowpass', f0: 2600, f1: 300, q: .7, a: .004, r: .28, g: .55 }); osc(e, t, { f0: 160, f1: 60, a: .003, r: .12, g: .3 }); cnt('poof'); }
  // 나루토 callout 연동(기린·천조·사박궤·카무이) — fx-naruto 의 시간표와 맞춤
  if (typeof callout === 'function') { const _c = callout; callout = function (f, text, ult) { const r = _c.apply(this, arguments);
    try { if (!f || !f.ch || f.ch.world !== 'naruto' || !ready() || !(window.NARUTO_FX && NARUTO_FX.on)) return r; const tx = String(text || ''), b = (typeof F !== 'undefined') ? F.find(o => o !== f && o.team !== f.team) : null; if (!b) return r;
      if (/^기린/.test(tx)) SND.kirin(f, b);
      else if (/천조|아마테라스/.test(tx)) { const t = ctx.currentTime + .45, e = bus(chestOf(b), .35, 1); nz(e, t, { type: 'lowpass', f0: 200, f1: 1400, a: .08, r: .3, g: .5 }); const L = nz(e, t, { type: 'lowpass', f0: 650, q: .8, a: .3, h: 2.3, r: .5, g: .45 }); flutter(L.g.gain, t, t + 3.1, 7, .15); osc(e, t, { type: 'triangle', f0: 58, a: .4, h: 2.2, r: .5, g: .2, vib: 2, vibA: 3 }); ticks(e, t, 3, 26, 1500, 4000, .15); cnt('amaterasu'); }
      else if (/사막 장송|사박궤|사박 대장/.test(tx)) { const t = ctx.currentTime + .02, e = bus(chestOf(b), .45, 1.1); const s = nz(e, t, { type: 'bandpass', f0: 1800, f1: 3800, q: .9, a: .9, r: .2, g: .5, sweep: 1 }); flutter(s.g.gain, t, t + 1.1, 19, .2); ticks(e, t, 1, 40, 3000, 9000, .1, 2); nz(e, t + 1.05, { type: 'lowpass', f0: 1800, f1: 200, a: .003, r: .6, g: .9 }); thump(e, t + 1.05, 1.6); ticks(e, t + 1.05, .4, 16, 600, 2400, .35); cnt('sandCoffin'); }
      else if (/^카무이$|카무이 /.test(tx) && !/수리검/.test(tx)) { const t = ctx.currentTime + .1, e = bus(chestOf(b), .5, 1); const w = nz(e, t, { type: 'bandpass', f0: 2400, f1: 200, q: 3, a: .25, r: .2, g: .5, sweep: .45 }); flutter(w.f.frequency, t, t + .5, 14, 400); osc(e, t, { type: 'triangle', f0: 500, f1: 60, a: .3, r: .1, g: .2, sweep: .4 }); cnt('kamui'); }
    } catch (e) { } return r; }; }

  // ═════ 공격 동작 휘두름 바람: 주먹·손바닥·발차기·도끼차기·베기·늘어남 자세로 바뀌는 순간 ═════
  const gapK = (k, ms) => { const t = performance.now(); if (gapK.m[k] && t - gapK.m[k] < ms) return true; gapK.m[k] = t; return false; }; gapK.m = {};
  const pst = new WeakMap();
  function swingTick() {
    if (typeof F === 'undefined' || typeof POSE === 'undefined') return;
    const ST = [[POSE.slash, 'blade'], [POSE.punch, 'fist'], [POSE.palm, 'fist'], [POSE.kick, 'kick'], [POSE.highKick, 'kick'], [POSE.axe, 'kick'], [POSE.stretch, 'rubber']];
    for (const f of F) {
      if (!f || !f.pos) continue; const s = pst.get(f) || {}; const tg = f.tgt;
      if (tg !== s.tg) { s.tg = tg; const hit = ST.find(x => x[0] && x[0] === tg); if (hit && !gapK('sw' + (f.ch && f.ch.key), 85)) {
        const kind = hit[1] === 'fist' && f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible ? 'blade' : hit[1], d = bus(chestOf(f), .12, .8), t = ctx.currentTime, k = R(.85, 1.15), heavy = f.mode > 0 || (f._coUlt && performance.now() / 1000 - (f._coT || 0) < 2.6);
        if (kind === 'blade') { swoosh(d, t, 900 * k, 4200 * k, .14, .32, 1.8); nz(d, t + .05, { type: 'highpass', f0: 6500, a: .03, r: .05, g: .1 }); }
        else if (kind === 'kick') swoosh(d, t, 320 * k, 1300 * k, .2, heavy ? .5 : .38, 1.2);
        else if (kind === 'rubber') swoosh(d, t, 450 * k, 1900 * k, .16, .3, 1.3);
        else swoosh(d, t, 500 * k, 1700 * k, .11, heavy ? .4 : .28, 1.5);
        if (heavy) nz(d, t, { brown: true, type: 'lowpass', f0: 500, a: .06, r: .12, g: .3 });
        cnt('swing_' + kind); } }
      pst.set(f, s);
    }
  }
  // 동작 판정(resolve)마다 휘두름 바람 — 모션캡처 동작은 자세 이름이 안 바뀌므로 판정 순간에 낸다. 빗나감·회피는 더 크게(헛스윙 바람)
  function swingAt(a, b, o) { if (!a || !a.pos || gapK('sw' + (a.ch && a.ch.key), 85)) return; const w = window.SFX_WEAPON ? SFX_WEAPON(a) : 'fist', miss = o === 'miss' || o === 'dodge' || o === 'jump', d = bus(chestOf(miss && b && b.pos ? b : a), .15, miss ? 1.1 : .75), t = ctx.currentTime, k = R(.85, 1.15);
    if (w === 'blade') { swoosh(d, t, 1000 * k, 4600 * k, miss ? .2 : .12, miss ? .5 : .3, 1.8); nz(d, t + .04, { type: 'highpass', f0: 6500, a: .03, r: .06, g: miss ? .18 : .1 }); }
    else if (w === 'chainsaw') { swoosh(d, t, 700, 2600, .16, .35, 1.2); osc(d, t, { type: 'sawtooth', f0: 110, f1: 150, lp: 2200, a: .02, r: .2, g: .12, am: 33 }); }
    else if (w === 'blunt') swoosh(d, t, 260 * k, 1000 * k, miss ? .26 : .18, miss ? .55 : .38, 1.1);
    else swoosh(d, t, 480 * k, 1700 * k, miss ? .16 : .1, miss ? .45 : .26, 1.5);
    cnt('swing_' + w + (miss ? '_miss' : '')); }
  if (typeof resolve === 'function') { const _r = resolve; resolve = function (a, b, ek, o) { const r = _r.apply(this, arguments); try { if (ready()) swingAt(a, b, o); } catch (e) { } return r; }; }
  // ═════ 고속 근접 통과음(도플러) + 비행 인물 추진 분사음 ═════
  const fst = new WeakMap(), jets = new Map(); let flyGap = 0;
  let lastT = 0;
  function flyTick() {
    if (typeof F === 'undefined' || typeof camera === 'undefined') return;
    const now = performance.now() / 1000, dt = Math.min(.1, Math.max(.008, now - (lastT || now - .016))); lastT = now; const cp = camera.position;
    for (const f of F) {
      if (!f || !f.pos) continue; let s = fst.get(f); const p = f.pos;
      if (!s) { fst.set(f, { x: p.x, y: p.y, z: p.z, by: 0 }); continue; }
      const vx = (p.x - s.x) / dt, vy = (p.y - s.y) / dt, vz = (p.z - s.z) / dt, sp = Math.hypot(vx, vy, vz); s.x = p.x; s.y = p.y; s.z = p.z;
      const dx = cp.x - p.x, dy = cp.y - (p.y + 10), dz = cp.z - p.z, dl = Math.hypot(dx, dy, dz) || 1, closing = (vx * dx + vy * dy + vz * dz) / dl;
      // 근접 통과: 빠르게(>260) 카메라 쪽으로 다가와 120 안 → 한 번 '휘익'(가까워지며 높아졌다 지나가며 낮아짐, 좌→우 이동)
      if (sp > 320 && sp < 3000 && dl < 95 && closing > 160 && now > s.by && now > flyGap) { s.by = now + 2.5; flyGap = now + 1.6; const t = ctx.currentTime, d = bus(chestOf(f), .2, Math.min(1.3, sp / 400)), pan0 = d.pan.value;
        nz(d, t, { type: 'bandpass', f0: 900, f1: 2600, q: 1.2, a: .22, r: .02, g: .5, sweep: .22 }); nz(d, t + .22, { type: 'bandpass', f0: 2600, f1: 500, q: 1.2, a: .01, r: .35, g: .5, sweep: .35 });
        d.pan.setValueAtTime(pan0, t); d.pan.linearRampToValueAtTime(-Math.sign(pan0 || 1) * .8, t + .5); cnt('flyby'); }
      // 비행 인물(아이언맨·비전·토르·츠나·레제 …) 공중: 추진 분사 지속음(속도에 따라 크기·밝기)
      const flyer = f.ch && f.ch.sig && f.ch.sig.fly, inAir = f.air || (p.y || 0) > 12;
      let J = jets.get(f);
      if (flyer && inAir && !f.down) {
        if (!J && jets.size < 2) { J = loopNode(chestOf(f), .8); const a = loopNoise(J, 'highpass', 1400, .7, .35); const b2 = loopNoise(J, 'lowpass', 600, .7, .55, true); lfoL(J, b2.gg.gain, 21, .12, 'triangle'); J.hiF = a.fi; J.g.gain.setValueAtTime(0, ctx.currentTime); jets.set(f, J); cnt('jet'); }
        if (J) { const t = ctx.currentTime, s2 = place(chestOf(f)), k = Math.min(1, .25 + sp / 500); J.g.gain.setTargetAtTime(.45 * k * s2.g, t, .12); J.pan.pan.setTargetAtTime(s2.pan, t, .06); J.hiF.frequency.setTargetAtTime(900 + k * 2500, t, .1); }
      } else if (J) { stopLoop(J, .4); jets.delete(f); }
    }
    for (const [f, J] of jets) if (!F.includes(f)) { stopLoop(J, .3); jets.delete(f); }
  }
  (function loop() { try { if (ready()) { narutoTick(); swingTick(); flyTick(); } } catch (e) { SS.err = String(e && e.message || e); } requestAnimationFrame(loop); })();
  SS.set = on => { SS.on = !!on; try { localStorage.setItem('arenaSfxSig', on ? '1' : '0'); } catch (e) { } };
})();
