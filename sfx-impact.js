// sfx-impact.js — 전투 사운드 전면 개편(11-14 소유자 지시: "식사 중 젓가락·숟가락 부딪히는 소리 같다 → 박진감·긴장감·사실감").
// 원인: 기존 음원 대부분이 Kenney 의 짧고 가벼운 금속 clang/block 샘플 → 고음 위주 '딸깍'만 남고 몸통·저역·잔향이 없음.
// 해결: WebAudio 실시간 합성 층을 기존 샘플 위에 얹는다(가벼운 금속 샘플은 음량↓·피치↓).
//  타격 = 서브 쿵(피치 하강) + 몸통 펀치(저역 잡음) + 살 파열음(중역 슬랩) + 트랜지언트 크랙(고역) + 속성 질감
//  칼 맞부딪힘 = 비조화 배음(묵직한 강철 울림) + 긁힘 스윕 + 저음 충격 + 긴 잔향
//  폭발·필살기 = 피치가 떨어지는 초저역 붐 + 갈색잡음 우르릉 + 파편 꼬리 (필살기는 천둥 파열 + 긴 홀 잔향)
//  필살기 시전 = 차오르는 라이저(상승 잡음 스윕 + 톱니 톤 + 떨림)
//  마스터 = 드라이브(포화) → 공용 버스(sfx.js 의 덕킹·글루 컴프·리미터)
(function () {
  if (typeof THREE === 'undefined') return;
  const SI = window.SFX_IMPACT = { on: true, st: { hit: 0, clash: 0, boom: 0, riser: 0, drop: 0 } };
  try { if (localStorage.getItem('arenaSfxImpact') === '0') SI.on = false; } catch (e) { }
  const R = (a, b) => a + Math.random() * (b - a);
  // ── 무기 분류(11-15 소유자 지시: "교전이 전부 둔탁하다 → 주먹은 주먹 소리, 검·칼 캐릭터는 검 소리로 리얼하게") ──
  // blade 검·칼·낫 / chainsaw 전기톱 / blunt 망치·철퇴·톤파·방패(금속 둔기) / fist 맨손(주먹·발)
  const WPN = {
    blade: /^(zoro|ichigo|byakuya|rukia|hitsugaya|kenpachi|aizen|tanjiro|zenitsu|inosuke|giyu|rengoku|shinobu|uzui|mitsuri|muichiro|sanemi|obanai|mikasa|levi|armin|aki|kishibe|nanami|yamamoto|sukuna|mukuro)$/,
    chainsaw: /^(denji)$/, blunt: /^(himejima|thor|captain|power|hibari)$/,
  };
  const weaponOf = f => { if (!f || !f.ch) return 'fist'; const k = f.ch.key || ''; for (const w in WPN) if (WPN[w].test(k)) return w; try { if (f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible) return 'blade'; } catch (e) { } return 'fist'; };
  window.SFX_WEAPON = weaponOf;
  let ctx = null, out = null, drive = null, verb = null, verbIn = null, white = null, brown = null, voices = 0;
  const MAXV = 28, last = {};
  function ready() {
    if (!SI.on || !window.SFX || !SFX.on || !SFX.started || !SFX.ctx) return false;
    if (ctx !== SFX.ctx) build(SFX.ctx);
    return ctx.state === 'running';
  }
  function curve(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }
  function ir(sec, decay) { const L = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, L, ctx.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < L; i++) { const t = i / L; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < ctx.sampleRate * .012 ? i / (ctx.sampleRate * .012) : 1); } } return b; }
  function build(c) {
    ctx = c;
    const dest = SFX.rbus || ctx.destination;
    out = ctx.createGain(); out.gain.value = .9;
    drive = ctx.createWaveShaper(); drive.curve = curve(1.35); drive.oversample = '2x'; // 11-15: 2.2 는 저역을 뭉개 '둔탁'의 원인 → 가볍게
    const tone = ctx.createBiquadFilter(); tone.type = 'lowshelf'; tone.frequency.value = 110; tone.gain.value = 1.5; // 저역 무게(과하면 먹먹)
    out.connect(drive); drive.connect(tone); tone.connect(dest);
    verbIn = ctx.createGain(); verb = ctx.createConvolver(); verb.buffer = ir(2.2, 2.6); const vh = ctx.createBiquadFilter(); vh.type = 'highpass'; vh.frequency.value = 150; const vo = ctx.createGain(); vo.gain.value = .5;
    verbIn.connect(vh); vh.connect(verb); verb.connect(vo); vo.connect(dest);
    white = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); { const d = white.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    brown = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  }
  // ── 공간: 카메라 기준 거리 감쇠 + 좌우 팬 ──
  const cr = new THREE.Vector3(), tmp = new THREE.Vector3();
  function place(pos) { if (!pos || typeof camera === 'undefined') return { g: 1, pan: 0, d: 80 }; tmp.copy(pos).sub(camera.position); const d = tmp.length(); cr.set(1, 0, 0).applyQuaternion(camera.quaternion); const pan = Math.max(-.85, Math.min(.85, tmp.dot(cr) / Math.max(30, d))); return { g: 1 / (1 + Math.max(0, d - 60) / 170), pan, d }; }
  function chain(sp, send) { const p = ctx.createStereoPanner(); p.pan.value = sp.pan; const g = ctx.createGain(); g.gain.value = sp.g; p.connect(g); g.connect(out); if (send > 0) { const s = ctx.createGain(); s.gain.value = send * Math.min(1.6, .7 + sp.d / 300); g.connect(s); s.connect(verbIn); } return p; }
  function track(node, end) { voices++; node.onended = () => { voices--; }; return end; }
  function env(g, t, a, peak, d, curve = 'exp') { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); else g.gain.linearRampToValueAtTime(0, t + a + d); }
  // 기본 소리 조각
  function sub(dst, t, f0, f1, dur, gain) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * .8); env(g, t, .004, gain, dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + .05); track(o); }
  function nz(dst, t, type, f, q, dur, gain, o = {}) { const s = ctx.createBufferSource(); s.buffer = o.brown ? brown : white; s.playbackRate.value = o.rate || 1; const b = ctx.createBiquadFilter(); b.type = type; b.frequency.setValueAtTime(f, t); if (o.f1) b.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sweep || dur)); b.Q.value = q; const g = ctx.createGain(); env(g, t, o.a || .002, gain, dur, o.lin ? 'lin' : 'exp');
    s.connect(b); b.connect(g); g.connect(dst); s.start(t, Math.random() * 1.5); s.stop(t + (o.a || .002) + dur + .05); track(s); return g; }
  function tone(dst, t, type, f0, f1, dur, gain, a = .003) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); env(g, t, a, gain, dur); o.connect(g); g.connect(dst); o.start(t); o.stop(t + a + dur + .05); track(o); }
  const busy = () => voices > MAXV;
  const gap = (k, s) => { const t = performance.now(); if (last[k] && t - last[k] < s) return true; last[k] = t; return false; };

  // ── 타격 ──
  const FLAV = { fire: 'fire', kurama: 'fire', sun: 'fire', blood: 'fire', lava: 'fire', bolt: 'bolt', light: 'bolt', getsuga: 'bolt', sound: 'bolt', bflash: 'bolt', ice: 'ice', water: 'water', mist: 'water', dark: 'dark', hollow: 'dark', cursed: 'dark', shadow: 'dark', earth: 'earth', sand: 'earth', gamma: 'earth', wind: 'wind', petal: 'wind', psychic: 'wind', metal: 'metal', slash: 'blade', odm: 'blade' };
  const P0 = () => window.SFX && SFX.play && SFX.play.__orig;
  function hit(pos, pw = 1, ek, a) {
    if (!ready() || busy() || gap('hit', 38)) { SI.st.drop++; return; } SI.st.hit++;
    const t = ctx.currentTime + .002, k = Math.max(.6, Math.min(2.6, pw)), sp = place(pos), w = weaponOf(a), d = chain(sp, (w === 'blade' ? .22 : .14) + .06 * k), fl = FLAV[ek] || 'metal';
    SI.st['hit_' + w] = (SI.st['hit_' + w] || 0) + 1;
    if (w === 'blade' || w === 'chainsaw') {
      // 칼이 살·옷을 가르는 소리: 날 끝 '칭'(초고역 순간) → 위에서 아래로 쓸리는 '샥'(5k→1.8k) → 옷·살 결(중역) → 가벼운 몸통(무겁게 뭉개지 않음)
      nz(d, t, 'highpass', R(4200, 5200), .7, .007, .55);
      nz(d, t + .001, 'bandpass', R(4800, 6200), 1.3, .09 + .02 * k, .6, { f1: R(1600, 2100), sweep: .09 });
      nz(d, t + .004, 'bandpass', R(1100, 1500), .8, .06, .32);
      nz(d, t + .002, 'bandpass', R(6800, 8200), 7, .05, .14);                                         // 날의 짧은 쇳결(울리지 않게 0.05초)
      sub(d, t, R(85, 100), 42, .1 + .04 * k, .38 * Math.pow(k, .5));
      try { const P = P0(); if (P) P.call(SFX, 'slash', pos, { rate: R(.92, 1.08), gain: .55 + .1 * k, gap: 0 }); } catch (e) { }
      if (w === 'chainsaw') { tone(d, t, 'sawtooth', R(88, 104), 70, .32, .2); nz(d, t, 'bandpass', 2400, 1, .3, .4, { f1: 1200 }); for (let i = 0; i < 6; i++) nz(d, t + i * .035, 'bandpass', R(900, 1600), 2, .02, .25); } // 체인 톱날 갈림
      if (k > 1.5) { sub(d, t + .01, 70, 34, .3, .45); nz(d, t + .01, 'bandpass', 3000, .9, .25, .3, { f1: 700 }); }
    } else if (w === 'blunt') {
      // 금속 둔기(망치·철퇴·톤파·방패): 쇠가 몸에 박히는 묵직한 '퍽'+짧은 쇳소리
      nz(d, t, 'highpass', R(2600, 3400), .7, .012, .55); nz(d, t, 'bandpass', R(240, 320), 1.1, .1, .8); sub(d, t, R(95, 115), 36, .16 + .07 * k, .85 * Math.pow(k, .55));
      nz(d, t + .002, 'bandpass', R(2800, 3600), 5, .07, .22);
      try { const P = P0(); if (P) P.call(SFX, 'clangHeavy', pos, { rate: R(.55, .65), gain: .45, gap: 0, lp: 3000 }); } catch (e) { }
    } else {
      // 맨손 타격 '퍽!': 짧고 단단하게 — 살갗 스냅(1.6~2.4k) + 주먹이 몸에 꽂히는 노크(220~320Hz) + 짧은 서브(길게 끌지 않음 = 둔탁함 제거)
      const kick = /kick|차기|킥/.test(String(ek || ''));
      nz(d, t, 'highpass', R(2600, 3600), .7, .012, .6);                                                 // 순간 크랙
      nz(d, t + .001, 'bandpass', R(1600, 2400), 1.1, .05, .7);                                          // 살갗 스냅
      nz(d, t, 'bandpass', kick ? R(170, 230) : R(230, 320), 1.2, .075 + .02 * k, .75 * Math.pow(k, .5)); // 몸통 노크
      sub(d, t, kick ? R(85, 100) : R(100, 120), 44, .085 + .05 * k, .6 * Math.pow(k, .55));
      try { const P = P0(); if (P) P.call(SFX, k > 1.4 ? 'heavy' : 'punch', pos, { rate: R(.95, 1.1), gain: .5, gap: 0 }); } catch (e) { }
      if (k > 1.5) { nz(d, t + .004, 'highpass', 2000, .7, .02, .5); nz(d, t + .01, 'lowpass', 600, .7, .2, .35, { brown: true }); sub(d, t + .005, 75, 34, .26, .4); } // 강타: 공기 파열 + 짧은 무게
    }
    switch (fl) {
      case 'fire': for (let i = 0; i < 10; i++) nz(d, t + R(.02, .4), 'highpass', R(2500, 6000), 1, R(.006, .016), R(.15, .35)); nz(d, t, 'bandpass', 700, .6, .35, .3, { f1: 2400, a: .03 }); break;
      case 'bolt': tone(d, t, 'sawtooth', R(2200, 3000), 260, .16, .22); nz(d, t, 'highpass', 4500, .8, .09, .4); for (let i = 0; i < 4; i++) nz(d, t + R(0, .15), 'bandpass', R(3000, 7000), 4, .01, .3); break;
      case 'ice': for (let i = 0; i < 5; i++) tone(d, t + R(0, .06), 'sine', R(2400, 5200), 0, R(.12, .3), R(.06, .12), .001); nz(d, t, 'highpass', 5000, 1, .12, .25); break;
      case 'water': nz(d, t, 'lowpass', 1400, .8, .32, .45, { f1: 260, a: .01 }); for (let i = 0; i < 4; i++) tone(d, t + R(.02, .2), 'sine', R(500, 900), R(1200, 1800), .05, .08); break;
      case 'dark': nz(d, t - .0, 'lowpass', 600, 1.2, .25, .35, { a: .12, lin: true }); sub(d, t, 62, 40, .5, .45); break;
      case 'earth': nz(d, t, 'lowpass', 380, .6, .5, .55, { brown: true }); for (let i = 0; i < 6; i++) nz(d, t + R(.05, .45), 'bandpass', R(900, 2500), 2, .02, .18); break;
      case 'wind': nz(d, t, 'bandpass', 700, 2, .32, .35, { f1: 3200, a: .02 }); break;
      case 'blade': nz(d, t, 'bandpass', 5200, 3, .07, .35, { f1: 2400 }); tone(d, t, 'triangle', R(1100, 1500), 0, .18, .05); break;
      default: nz(d, t, 'bandpass', 1500, 1.5, .1, .25); break;
    }
  }
  // ── 칼·주먹 맞부딪힘(막기) ──
  const RATIO = [1, 2.76, 5.4, 8.93, 13.34];
  function clashS(pos, big, a, b) {
    if (!ready() || busy() || gap('clash', 70)) { SI.st.drop++; return; } SI.st.clash++;
    const t = ctx.currentTime + .002, sp = place(pos), d = chain(sp, big ? .6 : .42), f = R(430, 640) * (big ? .8 : 1), L = big ? 1.6 : 1;
    const wa = weaponOf(a), wb = weaponOf(b), steelA = wa !== 'fist', steelB = wb !== 'fist';
    if (a && b && !steelA && !steelB) { // 맨손 막기: 팔뚝·손바닥끼리 '팍' + 옷 스침(쇳소리 없음)
      SI.st.clash_fist = (SI.st.clash_fist || 0) + 1;
      nz(d, t, 'highpass', 2400, .7, .01, .55); nz(d, t + .001, 'bandpass', R(1300, 1900), 1.2, .045, .6); nz(d, t, 'bandpass', R(260, 340), 1.2, .07, .7); sub(d, t, 120, 50, .09, .5 * L);
      nz(d, t + .015, 'bandpass', 3200, .8, .08, .18, { f1: 1500 }); try { const P = P0(); if (P) P.call(SFX, 'block', pos, { rate: R(.9, 1.05), gain: .5, gap: 0 }); } catch (e) { } return; }
    if (a && b && steelA !== steelB) { // 칼 ↔ 맨손(팔 보호대·기 두른 팔): 짧고 둔한 쇳소리 + 팔 막는 퍽
      SI.st.clash_mixed = (SI.st.clash_mixed || 0) + 1;
      nz(d, t, 'highpass', 2000, .5, .008, .8); nz(d, t + .001, 'bandpass', R(2400, 3000), 5, .07, .4); nz(d, t, 'bandpass', 300, 1.1, .08, .6); sub(d, t, 130, 50, .1, .55 * L);
      try { const P = P0(); if (P) P.call(SFX, 'clangHeavy', pos, { rate: R(.7, .8), gain: .5, gap: 0, lp: 4000 }); } catch (e) { } return; }
    SI.st.clash_steel = (SI.st.clash_steel || 0) + 1;
    /* 11-15 소유자 지적 '부딪힐 때 종·벨 소리 — 짜친다': 비조화 사인 배음(1초 이상 울림)=종소리였음 → 제거.
       실제 칼 맞부딪힘: ① 날끼리 닿는 날카로운 충돌(광대역 잡음 8ms) ② 짧은 금속 '챙'(좁은 대역 잡음 2.5~5.5kHz, 0.12초 — 사인 아님) ③ 날이 미끄러지며 긁힘(고역→중역 스윕)
       ④ 손목에 전해지는 둔탁한 저음 ⑤ CC0 녹음(Kenney 묵직한 금속음·베기음)을 낮은 음높이로 겹침 */
    nz(d, t, 'highpass', 1800, .5, .008, 1.0);                                                         // ① 충돌 순간
    nz(d, t + .001, 'bandpass', R(2600, 3400), 6, .11 * L, .55); nz(d, t + .002, 'bandpass', R(4400, 5600), 7, .08 * L, .38); // ② 금속 '챙'(잡음 기반, 짧게)
    nz(d, t + .012, 'bandpass', R(5200, 6400), 3.5, .2 * L, .3, { f1: R(1500, 2100), sweep: .2 * L });  // ③ 긁힘
    sub(d, t, 150, 55, .14, .75); nz(d, t, 'lowpass', 700, .8, .06, .6);                               // ④ 둔탁한 무게
    try { const P = window.SFX && SFX.play && SFX.play.__orig; if (P) { P.call(SFX, 'clangHeavy', pos, { rate: R(.66, .78) * (big ? .9 : 1), gain: big ? 1.1 : .85, gap: 0 }); P.call(SFX, 'slash', pos, { rate: R(.8, .95), gain: .55, gap: 0, delay: .01 }); } } catch (e) { } // ⑤ CC0 녹음 층
  }
  // ── 폭발·필살기 ──
  function boom(pos, size = 1, ult = false) {
    if (!ready() || gap(ult ? 'ult' : 'boom', ult ? 250 : 90)) { SI.st.drop++; return; } SI.st.boom++;
    const t = ctx.currentTime + .002, s = Math.max(.6, Math.min(3, size)), sp = place(pos), d = chain(sp, ult ? .75 : .45), L = ult ? 2.2 : 1.1 + s * .25;
    if (ult) { nz(d, t, 'highpass', 600, .5, .06, .9); nz(d, t, 'lowpass', 3500, .5, .35, .6); }   // 천둥 파열
    sub(d, t, ult ? 85 : 95, ult ? 24 : 30, L, ult ? 1.3 : 1.0 * Math.pow(s, .4));                    // 초저역 붐
    nz(d, t, 'lowpass', 2200, .7, .22, .9, { f1: 300 });                                             // 바삭한 몸통
    nz(d, t + .01, 'lowpass', 420, .6, L * 1.1, .8, { brown: true, f1: 110, a: .02 });               // 우르릉
    const n = ult ? 26 : 12; for (let i = 0; i < n; i++) nz(d, t + R(.15, L * .9), 'bandpass', R(1200, 4500), 2.5, R(.01, .03), R(.06, .2)); // 파편 꼬리
    if (window.SFX && SFX.duck) try { SFX.duck(ult ? 1.2 : .5); } catch (e) { }
  }
  // ── 필살기 라이저 ──
  function riser(pos, dur = .9) {
    if (!ready() || gap('riser', 600)) return; SI.st.riser++;
    const t = ctx.currentTime + .002, sp = place(pos), d = chain(sp, .5);
    nz(d, t, 'bandpass', 300, 2.2, dur, .5, { f1: 4200, sweep: dur, a: dur * .85, lin: true });
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(520, t + dur); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(3800, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16, t + dur * .9); g.gain.linearRampToValueAtTime(0, t + dur + .05);
    lfo.frequency.setValueAtTime(6, t); lfo.frequency.linearRampToValueAtTime(18, t + dur); lg.gain.value = .06; lfo.connect(lg); lg.connect(g.gain);
    o.connect(lp); lp.connect(g); g.connect(d); o.start(t); o.stop(t + dur + .1); lfo.start(t); lfo.stop(t + dur + .1); track(o);
    sub(d, t + dur * .95, 140, 45, .35, .6);
  }
  Object.assign(SI, { hit, clash: clashS, boom, riser });

  // ── 가벼운 금속 샘플 정리: 음량↓·피치↓(합성 층이 주인공) ──
  const THIN = { clang: [.3, .72], ring: [0, 1], block: [.4, .8], parry: [.45, .82], scrape: [.5, .85], bell: [0, 1], gong: [0, 1], ui: [.5, 1], cloth: [.55, .9] }; // 종·벨·공 계열은 교전에서 무음(소유자 지적)
  (function wrapPlay(tries) {
    if (!window.SFX || !SFX.play) { if (tries < 40) setTimeout(() => wrapPlay(tries + 1), 250); return; }
    if (SFX.play.__si) return; const P = SFX.play;
    SFX.play = function (name, pos, o) { const k = SI.on && THIN[name]; if (k) { if (k[0] === 0) return null; o = Object.assign({}, o || {}); o.gain = (o.gain ?? 1) * k[0]; o.rate = (o.rate || 1) * k[1]; } return P.call(this, name, pos, o); }; SFX.play.__orig = P;
    SFX.play.__si = true;
  })(0);

  // ── 전투 이벤트 연결 ──
  const chestOf = f => (typeof chest === 'function' && f && f.pos) ? chest(f) : (f && f.pos) || null;
  const ekOf = (a, ek) => ek || (a && a.elem) || (a && a.ch && a.ch.sig && a.ch.sig.elem) || 'metal';
  let lastRes = 0;
  if (typeof resolve === 'function') { const _r = resolve; resolve = function (a, b, ek, o, nm, pw, at) { const r = _r.apply(this, arguments);
    try { if (!b || !b.pos || o === 'miss' || o === 'dodge') return r; if (o === 'block' || o === 'counter') clashS(chestOf(b), (pw || 1) >= 1.6, a, b); else { hit(chestOf(b), pw || 1, ekOf(a, ek), a); lastRes = performance.now(); } } catch (e) { } return r; }; }
  if (typeof wound === 'function') { const _w = wound; wound = function (v, a, text, ek) { const r = _w.apply(this, arguments);
    try { if (v && v.pos && performance.now() - lastRes > 60) hit(chestOf(v), .9, ekOf(a, ek), a); } catch (e) { } return r; }; }
  if (typeof clash === 'function') { const _k = clash; clash = function (a, b, text, big) { const r = _k.apply(this, arguments);
    try { if (a && b && a.pos && b.pos) clashS(chestOf(a).add(chestOf(b)).multiplyScalar(.5), !!big, a, b); } catch (e) { } return r; }; }
  if (typeof explode === 'function') { const _e = explode; explode = function (p, ek, pw = 1) { const r = _e.apply(this, arguments); try { boom(p, pw, false); } catch (e) { } return r; }; }
  if (typeof ultBlast === 'function') { const _u = ultBlast; ultBlast = function (p, ek, rad, owner, nm) { const r = _u.apply(this, arguments); try { boom(p, (rad || 40) / 30, true); } catch (e) { } return r; }; }
  if (typeof callout === 'function') { const _c = callout; callout = function (f, text, ult) { const r = _c.apply(this, arguments); try { if (ult && f) riser(chestOf(f), .85); } catch (e) { } return r; }; }
})();
