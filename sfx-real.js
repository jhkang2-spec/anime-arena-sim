// 실감 타격음 합성 레이어 — 현재 리포에 녹음 자산(assets/sfx)이 없어 기존 sfx.js 가 조용한 상태라도, WebAudio 로 타격·검사 부딪힘·폭발을 실시간 합성해 '맞는 느낌'을 낸다.
// 자산이 복구되면(SFX.decN ≥ 12) 자동으로 물러난다(이중 재생 방지). 연결: sfx.js 의 normal 버스(덕킹·리미터 공유) 또는 단독 버스.
// 디자인: 짧은 트랜지언트(klik) + 몸통(저역 스윕) + 질감(대역잡음) + 잔향 꼬리 — 층과 매개변수를 판마다 무작위화해 반복음을 없앤다.
(function () {
  if (typeof THREE === 'undefined') return;
  const SR = window.SFXREAL = { on: true, plays: 0, st: { hits: 0, clashes: 0, exps: 0, casts: 0, blocked: 0 } };
  const R2 = (a, b) => a + Math.random() * (b - a);
  let ctx = null, bus = null, nb = null, voices = 0;
  const lastAt = {};
  function ready() {
    if (!SR.on || !window.SFX || !SFX.on) return false;
    if ((SFX.decN || 0) >= 12) { SR.st.blocked++; return false; } // 녹음 자산 살아있음 → 기존 체계가 맡는다
    if (!SFX.started || !SFX.ctx) return false;
    if (ctx !== SFX.ctx) { ctx = SFX.ctx; bus = SFX.rbus || ctx.destination; nb = null; }
    return ctx.state === 'running';
  }
  function noise() { if (nb) return nb; nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return nb; }
  // 공간: 거리 감쇠·고음 공기 감쇠·카메라 기준 스테레오 팬
  let camR = new THREE.Vector3(1, 0, 0), camP = new THREE.Vector3();
  function spatial(p) {
    const g = ctx.createGain();
    if (p && typeof camera !== 'undefined' && camera) {
      camera.getWorldDirection(tailTmp); camP.copy(camera.position); camR.crossVectors(tailTmp, new THREE.Vector3(0, 1, 0)).normalize();
      const dx = p.x - camP.x, dy = (p.y || 0) - camP.y, dz = p.z - camP.z, d = Math.hypot(dx, dy, dz);
      g.gain.value = Math.max(.22, 1.5 - d / 280);
      let node = g;
      if (d > 130) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = d > 280 ? 1900 : 4200; node.connect(lp); node = lp; }
      if (ctx.createStereoPanner) { const sp2 = ctx.createStereoPanner(); const pn = (camR.x * dx + camR.z * dz) / Math.max(1, d); sp2.pan.value = Math.max(-.85, Math.min(.85, pn)); node.connect(sp2); node = sp2; }
      node.connect(bus);
      return { input: g };
    }
    g.connect(bus);
    return { input: g };
  }
  let tailTmp = new THREE.Vector3();
  function track(nodes, endT) { voices += nodes.length; setTimeout(() => { voices -= nodes.length; }, Math.max(0, (endT - ctx.currentTime) * 1000) + 60); }
  function nz(t0, dur, o) { // 대역 잡음 층
    const s = ctx.createBufferSource(); s.buffer = noise(); s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0, t0); if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(o.g, t0 + (o.atk || .004)); g.gain.exponentialRampToValueAtTime(.0007, t0 + dur);
    s.connect(f); f.connect(g); s.start(t0, R2(0, .9)); s.stop(t0 + dur + .02);
    return { src: s, nodes: [s, f, g], out: g };
  }
  function tone(t0, f0, f1, dur, type, g, o = {}) { // 진동자 층(주파스 스윕)
    const s = ctx.createOscillator(); s.type = type; s.frequency.setValueAtTime(f0, t0); if (f1) s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur * (o.fT || 1));
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + (o.atk || .006)); gn.gain.exponentialRampToValueAtTime(.0007, t0 + dur);
    s.connect(gn); s.start(t0); s.stop(t0 + dur + .02);
    if (o.wob) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.wob; lg.gain.value = o.wobA || 30; l.connect(lg); lg.connect(s.frequency); l.start(t0); l.stop(t0 + dur); return { src: s, nodes: [s, gn, l, lg], out: gn }; }
    return { src: s, nodes: [s, gn], out: gn };
  }
  function to(sp, x) { x.out.connect(sp.input); }
  const cd = (k, ms) => { const t = performance.now(); if ((lastAt[k] || 0) + ms > t) return false; lastAt[k] = t; return true; };
  const posOf = f => f ? (typeof chest === 'function' ? chest(f) : f.pos) : null;
  const SWORD_KEYS = /^(zoro|tanjiro|giyu|rengoku|sanemi|obanai|muichiro|shinobu|mitsuri|inosuke|himejima|zenitsu|kenpachi|byakuya|rukia|hitsugaya|ichigo|aizen|sukuna|nanami|levi|mikasa|annie|reiner|yuji|megumi)$/;
  const nameOf = (a, ek, text) => String(ek || '') + '|' + String(text || '') + '|' + ((a && a.ch && a.ch.key) || '');

  // ── 타격: 트랜지언트 + 저역 몸통 + 질감(무기/신체 분류) ──
  function hitS(v, a, text, ek) {
    if (!v || !a || v === a || (a.team && v.team && a.team === v.team)) return;
    if (!cd('hit' + (v.ch && v.ch.key || v.id), 45)) return;
    const t0 = ctx.currentTime + .001, sp = spatial(posOf(v)), N = nameOf(a, ek, text);
    const sword = /slash/.test(N) || SWORD_KEYS.test((a.ch && a.ch.key) || '');
    const heavy = a._coUlt && performance.now() / 1000 - (a._coT || 0) < 3;
    const P = R2(.9, 1.15) * (heavy ? 1.35 : 1);
    if (sword) {
      to(sp, nz(t0, .075 * R2(.9, 1.1), { type: 'bandpass', f0: 5400 * R2(.9, 1.1), f1: 1700, q: 1.1, g: .5 * P, atk: .003 }));           // 벳는 결
      to(sp, nz(t0 + .008, .09, { type: 'lowpass', f0: 420, g: .5 * P }));                                                              // 살에 박히는 둔타
      to(sp, tone(t0 + .006, 88 * R2(.9, 1.1), 44, .2 * P, 'sine', .55 * P));                                                           // 몸이 흡수하는 쿵
    } else {
      const k = /kick|sweep|knee|axe/i.test(String(ek || '') + String(text || ''));
      to(sp, nz(t0, .018, { type: 'highpass', f0: 2600, g: .5 * P, atk: .002 }));                                                       // klik 트랜지언트
      to(sp, tone(t0, (k ? 92 : 128) * R2(.92, 1.08), k ? 38 : 56, .17 * P, 'triangle', .62 * P));                                       // 저역 'omp'
      to(sp, nz(t0 + .004, .1, { type: 'bandpass', f0: 230, q: 1.4, g: .42 * P }));                                                     // 가슴·가죽 울림
      if (k) to(sp, nz(t0 - .03, .05, { type: 'bandpass', f0: 1500, f1: 600, q: .9, g: .16 }));                                          // 발바람 선행
    }
    if (heavy) to(sp, tone(t0 + .01, 55, 30, .5, 'sine', .5));
    track([sp], t0 + .6); SR.st.hits++;
  }
  // ── 검사 부딪힘: 불화음 배음(금속 공명) + 충격 + 저역 ──
  function clashS(a, b, text, big) {
    if (!a || !b) return; if (!cd('clash', 60)) return;
    const t0 = ctx.currentTime + .001, mid = posOf(a).clone().lerp(posOf(b), .5), sp = spatial(mid), P = big ? 1.3 : 1;
    const parry = /받아|쳐|막|가드/.test(String(text || ''));
    const base = (parry ? 1900 : 1250) * R2(.9, 1.12);
    [1, 2.02, 2.98, 4.13, 5.42, 6.79].forEach((r, i) => to(sp, tone(t0 + i * .0012, base * r, base * r * .985, (big ? .9 : .55) * R2(.8, 1.2), 'triangle', (.26 - i * .03) * P)));
    to(sp, nz(t0, .03, { type: 'bandpass', f0: 4200, q: 2, g: .34 * P }));
    to(sp, tone(t0, 70, 44, .16, 'sine', .3 * P));
    track([sp], t0 + 1); SR.st.clashes++;
  }
  // ── 폭발: 서브 스윕 + 갈라지는 크래클 + 저주파 잔울림 ──
  function expS(p, ek, pw, ult) {
    if (!p) return; if (!cd('exp' + Math.round(p.x) + '_' + Math.round(p.z), 70)) return;
    const t0 = ctx.currentTime + .001, sp = spatial(p), P = Math.max(.6, Math.min(2.2, pw || 1)) * (ult ? 1.5 : 1);
    to(sp, tone(t0, 150 * R2(.9, 1.1), 30, 1.1 * (ult ? 1.4 : 1), 'sine', .7 * P, { fT: .55 }));                                  // 서브 붐
    to(sp, nz(t0, .8, { type: 'lowpass', f0: 6200, f1: 280, g: .5 * P }));                                                        // 몸체 크래클
    to(sp, nz(t0 + .02, .28, { type: 'bandpass', f0: 2400, f1: 900, q: .7, g: .3 * P }));                                          // 파편 틱
    to(sp, nz(t0 + .1, 1.3 * P, { type: 'lowpass', f0: 130, g: .34 * P }));                                                        // 잔울림
    if (/bolt|light|thunder/i.test(String(ek || ''))) { to(sp, nz(t0, .05, { type: 'highpass', f0: 3600, g: .5 * P })); to(sp, tone(t0, 1300, 2700, .09, 'sawtooth', .22 * P, { wob: 60, wobA: 220 })); }
    if (/fire|flame|sun|lava/i.test(String(ek || ''))) for (let i = 0; i < 4; i++) to(sp, nz(t0 + R2(.05, .5), .04, { type: 'bandpass', f0: R2(1400, 2800), q: 3, g: .16 * P }));
    if (/water|wave|ice/i.test(String(ek || ''))) to(sp, nz(t0 + .01, .4, { type: 'bandpass', f0: 1100, f1: 320, q: 1.2, g: .4 * P }));
    track([sp], t0 + 1.8); SR.st.exps++;
  }
  // ── 시전·투사체: 갈 채비(차징 상승음)와 바람(휘파람) ──
  function castS(f, text, ult) {
    if (!f) return; if (!cd('cast' + (f.ch && f.ch.key || ''), 260)) return;
    const t0 = ctx.currentTime + .001, sp = spatial(posOf(f)), P = ult ? 1.4 : .8, N = String(text || '');
    to(sp, nz(t0, ult ? .5 : .3, { type: 'bandpass', f0: 520, f1: 1900, q: .8, g: .24 * P }));                                    // 휘두르기 바람
    if (ult) {
      to(sp, tone(t0, 170, 880, .55, 'triangle', .3, { wob: 5, wobA: 14 }));                                                      // 기 상승
      to(sp, tone(t0, 178, 924, .55, 'triangle', .22));                                                                           // 이완(디트유닝 비트)
    }
    if (/불|염|화|아마테라스|연옥|디아블/.test(N)) to(sp, nz(t0 + .04, .4, { type: 'bandpass', f0: 700, f1: 2100, q: .7, g: .3 }));
    else if (/번개|뇌|벽력|치도리|전/.test(N)) to(sp, nz(t0 + .04, .12, { type: 'highpass', f0: 3200, g: .3 }));
    else if (/얼음|빙|서리/.test(N)) { [2100, 2650, 3300].forEach(x => to(sp, tone(t0 + .03, x * R2(.97, 1.03), x, .3, 'sine', .1))); }
    else if (/물|파도|수룡/.test(N)) to(sp, nz(t0 + .04, .35, { type: 'bandpass', f0: 950, f1: 380, q: 1.3, g: .3 }));
    track([sp], t0 + .8); SR.st.casts++;
  }
  function shootS(a) { if (!a) return; if (!cd('shoot' + (a.ch && a.ch.key || ''), 160)) return; const t0 = ctx.currentTime, sp = spatial(posOf(a)); to(sp, nz(t0, .22, { type: 'bandpass', f0: 640, f1: 1650, q: .8, g: .3 })); track([sp], t0 + .3); }

  const wrap = (name, fn) => { const o = window[name]; if (typeof o !== 'function') return; window[name] = function () { const r = o.apply(this, arguments); try { if (ready() && voices < 14) fn.apply(this, arguments); } catch (e) { console.warn('sfx-real', name, e); } return r; }; };
  wrap('wound', (v, a, text, ek) => hitS(v, a, text, ek));
  wrap('clash', (a, b, text, big) => clashS(a, b, text, big));
  wrap('explode', (p, ek, pw) => expS(p, ek, pw, false));
  wrap('ultBlast', (p, ek, rad, owner) => expS(p, ek, 2.2, true));
  wrap('callout', (f, text, ult) => castS(f, text, ult));
  if (typeof proj === 'function') wrap('proj', (a, b, kind, mode, o) => shootS(a));
  SR.set = on => { SR.on = !!on; };
})();
