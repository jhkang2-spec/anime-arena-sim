// 전투 효과음 3판 — 소유자 평가(11-05) "사운드도 전체적으로 훨씬 더 고도화해야 해, 실제와 유사하게"
// 자료: assets/sfx (모두 CC0, 출처 assets/sfx/LICENSE.txt). use/ 는 실제 녹음을 잘라 만든 모노 OGG(기록 use/manifest.json, loop* 는 이음매 없는 지속음).
// 구조: 소리(층 2~3겹 무작위 조합) → 거리 고음 감쇠 → 3D 위치 → [건조 + 협곡 잔향(코드로 만든 임펄스 응답·절벽 메아리)] → 밀도 자동 레벨 → 덕킹 → 압축·리미터 → 출력
// 지속음: 속성 기술(불·번개·물·얼음·바람·어둠), 기 모으기 상승음(시전 시간 내내), 날아가는 투사체(도플러 근사), 협곡 환경음, 배경음악(EXTRA 에 파일이 있을 때).
// 공개 함수(wound·clash·callout·explode·ultBlast·proj·spawnSummon·GROUND2.gen)만 감싸고, 나머지는 상태를 살펴 소리를 낸다.
// 브라우저 자동재생 정책 때문에 첫 클릭/터치 때 소리가 켜진다. 🔊 효과음 켜고 끄기·음량, 🎵 음악 켜고 끄기·음량(localStorage).
(function () {
  if (typeof THREE === 'undefined') return;
  const B = 'assets/sfx/';
  const K = 'RPGsounds_Kenney/OGG/', C1 = '100-CC0-SFX_0/';
  const seq = (pre, from, to, ext, pad) => { const a = []; for (let i = from; i <= to; i++) a.push(pre + (pad ? String(i).padStart(pad, '0') : i) + ext); return a; };
  const U = (n, k, skip) => seq('use/' + n + '_', 1, k, '.ogg', 2).filter((x, i) => !(skip || []).includes(i + 1));

  // 코디네이터가 받아 넣는 추가 자산(CC0). 파일을 assets/sfx/ 아래에 두고 경로를 여기에 적으면 켜진다(없으면 대체 소리로).
  const EXTRA = { music: ['extra/battle_a.ogg'], wind: ['extra/wind_a.wav'], birds: ['extra/birds_a.ogg', 'extra/birds_chirp.wav'], sand: [], land: ['extra/land_01.wav', 'extra/land_02.wav', 'extra/land_03.wav'], rubble: ['extra/fall_04.ogg', 'extra/fall_05.ogg'] };
  // 파형 검사(11-06): land_01~03 은 150Hz 아래가 거의 전부인 둔탁한 쿵(중심 576~851Hz) → 착지·몸 쓰러짐. fall_01~07 은 중심 3.7~6kHz 의 달그락(물건 떨어짐)이라 몸 소리로는 안 맞아 제외, 그중 촘촘한 04·05 만 암벽 부서짐 잔돌 층으로 씀.

  // 단발 소리 지도: f 파일 후보, gain(정규화 뒤 상대 크기), rate 재생 속도 범위, lp 저역 통과 Hz, hp 고역 통과 Hz, send 잔향 보냄, pri 우선순위
  const MAP = {
    swish:     { f: [...U('swing', 4), ...U('whoosh', 13)], gain: .42, rate: [.92, 1.12], send: .12, pri: 1 },
    swishBig:  { f: [...U('whoosh', 13), ...U('swing', 4)], gain: .55, rate: [.7, .85], lp: 4000, send: .18, pri: 1 },
    slash:     { f: U('slash', 8), gain: .7, rate: [.94, 1.08], send: .18, pri: 2 },
    punch:     { f: U('punch', 5), gain: .8, rate: [.9, 1.1], send: .14, pri: 2 },
    heavy:     { f: U('punchHeavy', 7), gain: .85, rate: [.88, 1.05], send: .2, pri: 2 },
    thud:      { f: [...U('punchHeavy', 7), ...U('punch', 5)], gain: .7, rate: [.6, .75], lp: 700, send: .1, pri: 2 },
    clang:     { f: U('clang', 23), gain: .72, rate: [.95, 1.06], send: .28, pri: 2 },
    clangHeavy:{ f: U('clangHeavy', 5), gain: .75, rate: [.88, 1.02], send: .3, pri: 2 },
    ring:      { f: [...U('ring', 4), ...U('unsheathe', 4)], gain: .32, rate: [.94, 1.06], send: .35, pri: 1 },
    scrape:    { f: [...U('scrape', 2), ...U('unsheathe', 4)], gain: .55, rate: [.85, 1], send: .25, pri: 1 },
    block:     { f: U('block', 9), gain: .72, rate: [.92, 1.08], send: .16, pri: 2 },
    parry:     { f: [...U('clang', 23).slice(0, 8), ...U('unsheathe', 4)], gain: .65, rate: [1, 1.12], send: .3, pri: 2 },
    cloth:     { f: [...seq(K + 'cloth', 1, 4, '.ogg'), ...U('clothH', 5)], gain: .28, rate: [.9, 1.15], send: .05, pri: 0 },
    flap:      { f: [...U('clothH', 5), ...U('whoosh', 13)], gain: .3, rate: [.55, .75], lp: 1600, send: .06, pri: 0 },
    step:      { f: [...U('stepOut', 2), ...seq(K + 'footstep0', 0, 9, '.ogg')], gain: .16, rate: [.85, 1.1], lp: 5000, send: .04, pri: 0, cap: 3 },
    land:      { f: [...U('stepOut', 2), K + 'dropLeather.ogg'], gain: .4, rate: [.7, .85], lp: 2200, send: .1, pri: 1 },
    landX:     { f: EXTRA.land, gain: .55, rate: [.95, 1.1], send: .1, pri: 1 },
    bodyfall:  { f: EXTRA.land, gain: .9, rate: [.78, .9], send: .22, pri: 2 },
    rubble:    { f: EXTRA.rubble, gain: .5, rate: [.85, 1], send: .35, pri: 1 },
    gravel:    { f: U('gravel', 7), gain: .5, rate: [.85, 1.1], send: .15, pri: 1 },
    stones:    { f: [...U('break', 5), ...U('gravel', 7)], gain: .6, rate: [.8, 1.05], send: .25, pri: 1 },
    debris:    { f: U('debris', 7), gain: .7, rate: [.8, .98], send: .4, pri: 2 },
    crack:     { f: [...U('crack', 4), ...U('ice', 6)], gain: .4, rate: [.95, 1.25], send: .25, pri: 1 },
    expS:      { f: U('expS', 9), gain: .72, rate: [.92, 1.06], send: .38, pri: 2 },
    expL:      { f: U('expL', 9), gain: .85, rate: [.85, 1], send: .5, pri: 3 },
    boom:      { f: [...U('boom', 2), ...U('expL', 9).slice(0, 3)], gain: .9, rate: [.6, .72], lp: 900, send: .45, pri: 3 },
    fire:      { f: U('fire', 6), gain: .62, rate: [.92, 1.08], send: .25, pri: 1 },
    thunder:   { f: U('thunder', 7), gain: .66, rate: [.92, 1.08], send: .4, pri: 1 },
    zap:       { f: U('thunder', 7), gain: .22, rate: [1.25, 1.6], hp: 900, send: .15, pri: 0 },
    water:     { f: U('water', 5), gain: .6, rate: [.92, 1.08], send: .25, pri: 1 },
    ice:       { f: U('ice', 6), gain: .6, rate: [.92, 1.1], send: .3, pri: 1 },
    wind:      { f: U('wind', 5), gain: .6, rate: [.9, 1.1], send: .25, pri: 1 },
    earth:     { f: U('earth', 6), gain: .66, rate: [.9, 1.05], send: .3, pri: 1 },
    dark:      { f: U('dark', 3), gain: .62, rate: [.8, .95], send: .4, pri: 1 },
    spell:     { f: U('magic', 6), gain: .5, rate: [.95, 1.1], send: .3, pri: 1 },
    shot:      { f: U('shot', 4), gain: .45, rate: [.92, 1.1], send: .2, pri: 1 },
    shotBig:   { f: U('shotBig', 6), gain: .58, rate: [.85, 1], send: .3, pri: 2 },
    charge:    { f: U('charge', 3), gain: .5, rate: [.85, 1], send: .3, pri: 2 },
    morph:     { f: [...U('charge', 3), ...U('magic', 6)], gain: .6, rate: [.8, .95], send: .35, pri: 2 },
    roar:      { f: U('roar', 8), gain: .85, rate: [.6, .8], lp: 2600, send: .45, pri: 3 },
    summon:    { f: U('dark', 3), gain: .6, rate: [.75, .9], send: .45, pri: 2 },
    domain:    { f: [...U('dark', 3), ...U('boom', 2)], gain: .65, rate: [.5, .6], lp: 1400, send: .6, pri: 3 },
    gong:      { f: [C1 + 'gong_01.ogg', C1 + 'gong_02.ogg'], gain: .45, rate: [.9, 1], send: .4, pri: 2 },
    bell:      { f: [C1 + 'bell_01.ogg', C1 + 'bell_02.ogg', C1 + 'bell_03.ogg'], gain: .32, rate: [.95, 1.05], send: .3, pri: 1 },
    ui:        { f: [C1 + 'switch_01.ogg', C1 + 'switch_02.ogg'], gain: .3, rate: [1, 1.1], pri: 3 },
  };
  // 지속음(루프): 파형 검사로 고른 것만(이음매 차 3dB 이하·흔들림 3dB 이하). loopElec_02·03, loopWater_02, loopWind_01 은 제외.
  const LOOP = {
    fire:    { f: ['use/loopFire_01.ogg', 'use/loopFire_03.ogg'], gain: .5, lp: 6000, send: .2 },
    crackle: { f: ['use/loopFire_02.ogg'], gain: .3, send: .15 },
    thunder: { f: ['use/loopElec_01.ogg'], gain: .38, hp: 400, send: .25 },
    water:   { f: ['use/loopWater_01.ogg'], gain: .45, lp: 7000, send: .2 },
    wind:    { f: ['use/loopWind_02.ogg', 'use/loopWind_03.ogg'], gain: .5, send: .2 },
    dark:    { f: ['use/loopHum_01.ogg'], gain: .7, rate: .45, lp: 280, send: .35 },
    charge:  { f: ['use/loopCharge_01.ogg', 'use/loopCharge_02.ogg'], gain: .55, send: .25 },
    rush:    { f: ['use/loopWind_02.ogg', 'use/loopWind_03.ogg'], gain: .5, hp: 700, send: .1 },
    ambWind: { f: ['use/loopWind_02.ogg', 'use/loopWind_03.ogg'], gain: .06, rate: .5, lp: 520 },
    ambSand: { f: ['use/loopWind_03.ogg'], gain: .018, hp: 2800 },
  };
  // 타격 조합: 초기 충격음 + 본체 + 꼬리(확률). 층마다 파일·속도·지연을 무작위로 골라 같은 소리 반복을 막는다.
  const COMBO = {
    swordSword: [{ s: 'clang', g: 1 }, { s: 'clangHeavy', g: .45, lp: 2600, rate: .8, d: [0, .006] }, { s: 'ring', g: .8, d: [.012, .04], p: .75 }],
    swordSwordBig: [{ s: 'clangHeavy', g: 1 }, { s: 'clang', g: .6, rate: .85, d: [0, .008] }, { s: 'ring', g: 1, d: [.015, .05] }, { s: 'thud', g: .5, d: [0, .01] }],
    swordFlesh: [{ s: 'slash', g: 1 }, { s: 'thud', g: .55, d: [0, .012] }, { s: 'cloth', g: .8, d: [.01, .03], p: .6 }],
    swordGuard: [{ s: 'parry', g: 1 }, { s: 'block', g: .5, lp: 1800, d: [0, .01] }, { s: 'ring', g: .5, d: [.02, .05], p: .5 }],
    fistFlesh: [{ s: 'punch', g: 1 }, { s: 'thud', g: .6, d: [0, .01] }, { s: 'cloth', g: .7, d: [.005, .025], p: .55 }],
    fistHeavy: [{ s: 'heavy', g: 1 }, { s: 'thud', g: .8, d: [0, .012] }, { s: 'cloth', g: .8, d: [.01, .03], p: .6 }],
    fistGuard: [{ s: 'block', g: 1 }, { s: 'thud', g: .45, lp: 600, d: [0, .01] }, { s: 'cloth', g: 1, d: [0, .02], p: .7 }],
    kick: [{ s: 'heavy', g: 1, rate: .92 }, { s: 'thud', g: .75, d: [0, .01] }, { s: 'flap', g: .6, d: [0, .01] }, { s: 'cloth', g: .8, d: [.01, .03], p: .6 }],
  };

  const ELEM_SND = { fire: 'fire', flame: 'fire', sun: 'fire', lava: 'fire', bolt: 'thunder', thunder: 'thunder', lightning: 'thunder', water: 'water', ice: 'ice', frost: 'ice', snow: 'ice', wind: 'wind', air: 'wind', dark: 'dark', hollow: 'dark', shadow: 'dark', void: 'dark', curse: 'dark', light: 'spell', chakra: 'spell', kurama: 'spell', petal: 'wind', sand: 'earth', earth: 'earth', rock: 'earth', stone: 'earth', metal: 'clang', slash: 'slash' };
  const elemSnd = ek => { if (!ek) return null; const k = String(ek).toLowerCase(); for (const n in ELEM_SND) if (k.includes(n)) return ELEM_SND[n]; return null; };
  const R2 = (a, b) => a + Math.random() * (b - a);
  const FILES = [...new Set([...Object.values(MAP).flatMap(m => m.f), ...Object.values(LOOP).flatMap(m => m.f), ...EXTRA.wind, ...EXTRA.birds, ...EXTRA.sand, ...EXTRA.music, ...EXTRA.land, ...EXTRA.rubble])];
  const DECODE = FILES.filter(f => !EXTRA.music.includes(f));
  const SFX = window.SFX = { on: true, vol: .8, music: true, musicVol: .35, started: false, loaded: 0, total: DECODE.length, plays: {}, files: FILES, errors: 0, extra: EXTRA,
    stats: { events: 0, layers: 0, voices: 0, maxVoices: 0, stolen: 0, dropped: 0, skipped: 0, loops: 0, overs: 0, peakDb: -120, clip: 0, t0: 0 } };
  try { const s = localStorage.getItem('arenaSfx'); if (s === '0') SFX.on = false; const v = parseFloat(localStorage.getItem('arenaSfxVol')); if (v >= 0 && v <= 1) SFX.vol = v; const m = localStorage.getItem('arenaMusic'); if (m === '0') SFX.music = false; const mv = parseFloat(localStorage.getItem('arenaMusicVol')); if (mv >= 0 && mv <= 1) SFX.musicVol = mv; } catch (e) { }

  let ctx = null, sfxMaster = null, normal = null, duckG = null, ultBus = null, ambBus = null, musicBus = null, verb = null, verbIn = null, ana = null, anaBuf = null;
  const buf = {}, norm = {}, live = [], lastAt = {}, lastPick = {};
  // 정규화: 가장 큰 50ms 구간의 RMS 를 -16dBFS 에 맞춤(파일마다 9dB 넘게 차이 나던 크기 불균형 해소). 봉우리는 1.4 를 넘지 않게.
  function measure(p, d) {
    const x = d.getChannelData(0), n = x.length, w = Math.max(64, Math.floor(d.sampleRate * .05));
    let best = 0, pk = 0, all = 0;
    for (let i = 0; i < n; i += w) { let s = 0; const e = Math.min(n, i + w); for (let j = i; j < e; j++) { const v = x[j]; s += v * v; const a = v < 0 ? -v : v; if (a > pk) pk = a; } all += s; const r = s / (e - i); if (r > best) best = r; }
    const isLoop = /\/loop/.test(p), lvl = Math.sqrt(isLoop ? all / n : best) || 1e-4;
    let g = Math.pow(10, -16 / 20) / lvl; g = Math.min(Math.max(g, .5), 4, 1.4 / (pk || 1));
    norm[p] = g;
  }
  // 협곡 잔향: 잡음 감쇠 꼬리(시간 갈수록 어두워짐) + 절벽 메아리(좌우 번갈아 늦게 오는 반사)
  function makeIR() {
    const sr = ctx.sampleRate, len = Math.floor(sr * 2.8), ir = ctx.createBuffer(2, len, sr);
    const taps = [[.023, .5], [.037, .42], [.061, .36], [.094, .3], [.142, .26], [.21, .3], [.33, .24], [.47, .17], [.68, .1]];
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c); let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr, env = t < .015 ? 0 : Math.exp(-6.9 * (t - .015) / 2.3) * (t < .06 ? (t - .015) / .045 : 1);
        const k = Math.min(.95, .25 + t * .5); lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
        d[i] = lp * env * .55;
      }
      taps.forEach(([t, g], i) => { const at = Math.floor((t + (c ? .004 * (i % 3) : 0)) * sr), side = (i % 2) === c ? 1 : .55; for (let j = 0; j < Math.floor(sr * .006); j++) { const q = at + j; if (q < len) d[q] += (Math.random() * 2 - 1) * g * side * Math.exp(-j / (sr * .0015)); } });
    }
    return ir;
  }
  function softClip() { const ws = ctx.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, a = Math.abs(x); c[i] = a < .9 ? x : Math.sign(x) * (.9 + .1 * Math.tanh((a - .9) / .1)); } ws.curve = c; ws.oversample = '2x'; return ws; }
  function start() {
    if (SFX.started) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); SFX.started = true; SFX.ctx = ctx; SFX.stats.t0 = ctx.currentTime;
    const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -20; glue.knee.value = 10; glue.ratio.value = 2.5; glue.attack.value = .012; glue.release.value = .22;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .12;
    const out = ctx.createGain(); out.gain.value = .82; ana = ctx.createAnalyser(); ana.fftSize = 4096; anaBuf = new Float32Array(ana.fftSize);
    const sc = softClip();
    glue.connect(lim); lim.connect(out); out.connect(ana); out.connect(sc); sc.connect(ctx.destination);
    SFX.lim = lim;
    sfxMaster = ctx.createGain(); sfxMaster.gain.value = SFX.on ? SFX.vol : 0; sfxMaster.connect(glue);
    duckG = ctx.createGain(); duckG.connect(sfxMaster);
    normal = ctx.createGain(); normal.connect(duckG); ultBus = ctx.createGain(); ultBus.connect(sfxMaster);
    ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(duckG);
    verbIn = ctx.createGain(); verbIn.gain.value = 1; const pre = ctx.createBiquadFilter(); pre.type = 'highpass'; pre.frequency.value = 180;
    verb = ctx.createConvolver(); verb.normalize = true; verb.buffer = makeIR(); const vOut = ctx.createGain(); vOut.gain.value = .55;
    verbIn.connect(pre); pre.connect(verb); verb.connect(vOut); vOut.connect(sfxMaster);
    musicBus = ctx.createGain(); musicBus.gain.value = SFX.music ? SFX.musicVol : 0; musicBus.connect(glue);
    DECODE.forEach(p => fetch(B + p).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(a => ctx.decodeAudioData(a)).then(d => { buf[p] = d; measure(p, d); SFX.loaded++; if (SFX.loaded === SFX.total) ambStart(); }).catch(() => { SFX.errors++; SFX.loaded++; if (SFX.loaded === SFX.total) ambStart(); }));
    musicStart();
    if (hint.remove) hint.remove();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, start, { passive: true }));

  const LP = { x: 0, y: 0, z: 0 };
  function syncListener() {
    if (!ctx || typeof camera === 'undefined') return;
    const L = ctx.listener, p = camera.position, d = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    LP.x = p.x; LP.y = p.y; LP.z = p.z;
    if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = d.x; L.forwardY.value = d.y; L.forwardZ.value = d.z; L.upX.value = u.x; L.upY.value = u.y; L.upZ.value = u.z; }
    else { L.setPosition(p.x, p.y, p.z); L.setOrientation(d.x, d.y, d.z, u.x, u.y, u.z); }
  }
  const distOf = p => p ? Math.hypot(p.x - LP.x, (p.y || 0) - LP.y, p.z - LP.z) : 0;
  // 거리 고음 감쇠: 멀수록 공기가 고음을 먹는다(20m 안은 그대로, 300 넘으면 약 2kHz)
  const airCut = d => Math.max(1600, Math.min(20000, 20000 * Math.exp(-Math.max(0, d - 20) / 130)));
  function setPos(pn, p) { if (pn.positionX) { pn.positionX.value = p.x; pn.positionY.value = p.y || 0; pn.positionZ.value = p.z; } else pn.setPosition(p.x, p.y || 0, p.z); }
  function pickFile(name, cand) { if (cand.length === 1) return cand[0]; const h = lastPick[name] || []; let c = cand.filter(f => !h.includes(f)); if (!c.length) c = cand; const f = c[(Math.random() * c.length) | 0]; h.push(f); if (h.length > Math.min(3, cand.length - 1)) h.shift(); lastPick[name] = h; return f; }
  function steal(pri) {
    let k = -1, kp = 9, kt = 1e9;
    for (let i = 0; i < live.length; i++) { const v = live[i]; if (v.loop) continue; if (v.pri < kp || (v.pri === kp && v.t0 < kt)) { k = i; kp = v.pri; kt = v.t0; } }
    if (k < 0 || kp > pri) return false;
    const v = live[k]; live.splice(k, 1); try { v.g.gain.setTargetAtTime(0, ctx.currentTime, .008); v.src.stop(ctx.currentTime + .05); } catch (e) { } SFX.stats.stolen++; return true;
  }
  const MAXV = 30;
  // 소리 한 개(층 하나) 만들기: 원본 → [저역·고역 통과] → 크기 → 3D 위치 → 건조 버스 + 잔향 보냄
  function voice(p, m, pos, o) {
    const t = ctx.currentTime + Math.max(0, o.delay || 0), src = ctx.createBufferSource(); src.buffer = buf[p];
    const rate = (o.rate || 1) * (m.rate ? (Array.isArray(m.rate) ? R2(m.rate[0], m.rate[1]) : m.rate) : 1); src.playbackRate.value = rate;
    if (o.loop) src.loop = true;
    const off = o.loop ? Math.random() * buf[p].duration : 0;
    let node = src; const d = distOf(pos);
    const lpf = Math.min(o.lp || 20000, m.lp || 20000, pos ? airCut(d) : 20000);
    let filt = null; if (lpf < 19000 || o.loop) { filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = lpf; filt.Q.value = .5; node.connect(filt); node = filt; }
    const hpf = o.hp || m.hp; if (hpf) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hpf; node.connect(h); node = h; }
    const g = ctx.createGain(), lvl = (m.gain || .5) * (o.gain ?? 1) * (norm[p] || 1) * (o.loop ? 1 : R2(.88, 1.08)); g.gain.value = o.fadeIn ? 0 : lvl; node.connect(g); node = g;
    if (o.fadeIn) g.gain.setTargetAtTime(lvl, t, o.fadeIn / 3);
    let pn = null;
    if (pos && typeof pos.x === 'number') { pn = ctx.createPanner(); pn.panningModel = 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = 55; pn.rolloffFactor = .8; pn.maxDistance = 2000; setPos(pn, pos); node.connect(pn); node = pn; }
    node.connect(o.bus || (o.ult ? ultBus : normal));
    const send = (o.send ?? m.send ?? .15) * (pos ? Math.min(1.8, .7 + d / 260) : .8);
    if (send > .01 && !o.dry) { const sg = ctx.createGain(); sg.gain.value = send; node.connect(sg); sg.connect(verbIn); }
    src.start(t, off);
    const dur = o.dur; if (dur && !o.loop) { g.gain.setValueAtTime(lvl, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur); src.stop(t + dur + .02); }
    const v = { src, g, f: filt, pn, pri: o.pri ?? m.pri ?? 1, t0: t, loop: !!o.loop, lvl, rate };
    src.onended = () => { const i = live.indexOf(v); if (i >= 0) live.splice(i, 1); };
    live.push(v); SFX.stats.voices = live.length; if (live.length > SFX.stats.maxVoices) SFX.stats.maxVoices = live.length;
    return v;
  }
  // 재생: 같은 이름은 gap 안에 겹치지 않게, 상한 30(낮은 우선순위·오래된 것부터 양보)
  function play(name, pos, o = {}) {
    if (!ctx || !SFX.on) return null; const m = MAP[name]; if (!m) return null;
    const t = ctx.currentTime; if (lastAt[name] && t - lastAt[name] < (o.gap ?? .06)) return null; lastAt[name] = t;
    const cand = m.f.filter(f => buf[f]); if (!cand.length) return null;
    if (m.cap && live.filter(v => v.name === name).length >= m.cap) return null;
    const pri = o.pri ?? m.pri ?? 1;
    if ((pri === 0 && live.length >= 16) || (pri === 1 && live.length >= 24)) { SFX.stats.skipped++; return null; }
    if (live.length >= MAXV && !steal(pri)) { SFX.stats.dropped++; return null; }
    const v = voice(pickFile(name, cand), m, pos, o); v.name = name;
    if (m.rise) { v.src.playbackRate.setValueAtTime(v.rate, t); v.src.playbackRate.linearRampToValueAtTime(v.rate * m.rise, t + Math.min(1.6, v.src.buffer.duration / v.rate)); }
    SFX.plays[name] = (SFX.plays[name] || 0) + 1; SFX.stats.events++;
    return v.src;
  }
  SFX.play = play;
  // 층 조합 재생: 한 타격 = 2~3겹(층마다 다른 파일·지연·속도)
  function combo(kind, pos, o = {}) {
    const L = COMBO[kind]; if (!L || !ctx || !SFX.on) return;
    const t = ctx.currentTime; if (lastAt['c:' + kind] && t - lastAt['c:' + kind] < (o.gap ?? .05)) return; lastAt['c:' + kind] = t;
    L.forEach((l, i) => { if (l.p && (live.length > 14 || Math.random() > l.p)) return; const dl = l.d ? R2(l.d[0], l.d[1]) : 0; play(l.s, pos, { gap: 0, gain: l.g * (o.gain ?? 1), rate: (l.rate || 1) * (o.rate || 1), lp: l.lp, delay: dl, ult: o.ult, pri: i ? 1 : 2 }); if (i) SFX.stats.layers++; });
    SFX.plays['c:' + kind] = (SFX.plays['c:' + kind] || 0) + 1;
  }
  SFX.combo = combo;
  // 필살 저역 서브: 실제 저음 폭발(저역만) + 사인 낙하(55→32Hz) — 몸으로 느끼는 무게감
  function sub(pos, sec = 1.1, amt = 1) {
    if (!ctx || !SFX.on) return; const t = ctx.currentTime;
    play('boom', pos, { gap: .2, lp: 160, rate: .55, gain: .8 * amt, ult: true, send: .2, pri: 3 });
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(58, t); o.frequency.exponentialRampToValueAtTime(30, t + sec);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42 * amt, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + sec);
    o.connect(g); g.connect(ultBus); o.start(t); o.stop(t + sec + .05); SFX.plays.sub = (SFX.plays.sub || 0) + 1; SFX.stats.events++;
  }
  SFX.sub = sub;
  // 지속음 시작: 위치를 따라가는 루프(follow 함수가 매 화면 위치를 줌), 끝나면 서서히 꺼짐
  const loops = [];
  function loopStart(key, pos, o = {}) {
    if (!ctx || !SFX.on) return null; const m = LOOP[key]; if (!m) return null; const cand = m.f.filter(f => buf[f]); if (!cand.length) return null;
    if ((o.pri ?? 2) < 3 && !o.bus && loops.filter(x => !x.amb && !x.dead).length >= 5) { SFX.stats.skipped++; return null; }
    if (live.length >= MAXV && !steal(1)) { SFX.stats.dropped++; return null; }
    const f = pickFile('L:' + key, cand), v = voice(f, m, pos, Object.assign({ loop: true, fadeIn: o.fadeIn ?? .12, send: m.send, pri: 2, lp: m.lp }, o));
    const L = Object.assign(v, { key, name: 'L:' + key, follow: o.follow, base: v.rate, tick: o.tick, next: 0, born: ctx.currentTime, life: o.life, amb: !!o.bus, lp: m.lp });
    loops.push(L); SFX.stats.loops++; SFX.plays['L:' + key] = (SFX.plays['L:' + key] || 0) + 1;
    return L;
  }
  function loopStop(L, fade = .25) { if (!L || L.dead) return; L.dead = true; if (L.drone) loopStop(L.drone, fade + .2); const t = ctx.currentTime; try { L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(L.g.gain.value, t); L.g.gain.linearRampToValueAtTime(0, t + fade); L.src.stop(t + fade + .05); } catch (e) { } const i = loops.indexOf(L); if (i >= 0) loops.splice(i, 1); }
  SFX.loopStart = loopStart; SFX.loopStop = loopStop; SFX.loops = loops;
  // 속성 기술 고유음: 불 화염 루프·번개 지직 루프+불똥·물 흐름·얼음 갈라짐(잘게 연속)·바람 휘몰이(주위를 도는 위치)·어둠 저음 드론
  const elemL = new WeakMap();
  function elemLoop(f, es, sec) {
    if (!f || !es) return; const fl = () => posOf(f), end = ctx.currentTime + sec;
    const prevL = elemL.get(f); if (prevL && !prevL.dead && prevL.es === es) { prevL.life = Math.max(prevL.life || 0, end); return; }
    if (prevL && !prevL.dead) loopStop(prevL, .2);
    if (f._sndElemT && ctx.currentTime < f._sndElemT) return; f._sndElemT = ctx.currentTime + 1.6;
    const n0 = loops.length;
    if (es === 'fire') { loopStart('fire', fl(), { follow: fl, life: end }); if (Math.random() < .7) loopStart('crackle', fl(), { follow: fl, life: end }); }
    else if (es === 'thunder') loopStart('thunder', fl(), { follow: fl, life: end, tick: L => { play('zap', fl(), { gap: .05 }); L.next = ctx.currentTime + R2(.09, .32); } });
    else if (es === 'water') loopStart('water', fl(), { follow: fl, life: end });
    else if (es === 'ice') { const L = loopStart('wind', fl(), { follow: fl, life: end, gain: .25, hp: 2500, tick: L2 => { play('crack', fl(), { gap: .04, gain: R2(.5, 1) }); L2.next = ctx.currentTime + R2(.12, .35); } }); if (!L) play('ice', fl()); }
    else if (es === 'wind') { let a = Math.random() * 6.3; loopStart('wind', fl(), { life: end, follow: () => { const p = fl(); if (!p) return null; a += .16; return { x: p.x + Math.cos(a) * 14, y: p.y + 4, z: p.z + Math.sin(a) * 14 }; }, tick: L => { L.f.frequency.setTargetAtTime(R2(900, 5000), ctx.currentTime, .12); L.next = ctx.currentTime + .25; } }); }
    else if (es === 'dark') loopStart('dark', fl(), { follow: fl, life: end, fadeIn: .3 });
    else if (es === 'earth') loopStart('dark', fl(), { follow: fl, life: end, gain: .6, tick: L => { play('gravel', fl(), { gap: .08, gain: .5 }); L.next = ctx.currentTime + R2(.2, .45); } });
    if (loops.length > n0) { const L = loops[n0]; L.es = es; elemL.set(f, L); }
  }
  // 기 모으기 상승 루프: 시전 시간 동안 음높이·밝기·크기가 함께 올라가고, 끝나거나 끊기면 바로 놓음
  function chargeStart(f, sec, ult) {
    const L = loopStart('charge', posOf(f), { follow: () => posOf(f), gain: ult ? 1 : .45, fadeIn: .2, pri: 3, ult }); if (!L) return null;
    const t = ctx.currentTime, e = t + Math.max(.4, sec);
    L.src.playbackRate.setValueAtTime(L.base * .62, t); L.src.playbackRate.linearRampToValueAtTime(L.base * (ult ? 1.45 : 1.15), e);
    if (L.f) { L.f.frequency.cancelScheduledValues(t); L.f.frequency.setValueAtTime(320, t); L.f.frequency.exponentialRampToValueAtTime(ult ? 7000 : 3500, e); L.f.Q.value = 2.5; L.noAir = true; }
    L.g.gain.cancelScheduledValues(t); L.g.gain.setValueAtTime(0, t); L.g.gain.linearRampToValueAtTime(L.lvl * .35, t + .25); L.g.gain.linearRampToValueAtTime(L.lvl, e);
    if (ult) { play('charge', posOf(f), { gap: .3, gain: .6, ult: true }); const dr = loopStart('dark', posOf(f), { follow: () => posOf(f), gain: .9, fadeIn: .4, pri: 3, ult: true }); if (dr) { dr.noAir = true; L.drone = dr; } }
    return L;
  }
  // 필살기 전용 묶음(소유자 11-05 "더 웅장하고 크면서 충격파 소리와 함께"): 0.1초 정적 → 굉음(폭발 본체·서브 30~60Hz·금속성 크랙·공기 충격파 '쿠웅', 협곡 잔향 크게) → 퍼지는 바람 휘몰이·잔해 우수수 → 낮은 여운 2~3초, 속성 층 덧입힘
  let ultAt = 0;
  function ultPack(p, ek) {
    if (!ctx || !SFX.on || !p) return; const t = ctx.currentTime; if (t - ultAt < .35) return; ultAt = t;
    const q = { x: p.x, y: (p.y || 0) + 4, z: p.z }, D = .1, U = { ult: true, gap: 0, pri: 3 };
    const g = duckG.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(.03, t + .015); g.setValueAtTime(.03, t + D); g.linearRampToValueAtTime(.35, t + D + .05); g.setValueAtTime(.35, t + 2.6); g.linearRampToValueAtTime(1, t + 3.4);
    if (musicBus) { const m = musicBus.gain, hi = SFX.music ? SFX.musicVol : 0; m.cancelScheduledValues(t); m.setValueAtTime(m.value, t); m.linearRampToValueAtTime(hi * .15, t + .03); m.setValueAtTime(hi * .15, t + 2.6); m.linearRampToValueAtTime(hi, t + 3.6); }
    play('boom', q, Object.assign({}, U, { delay: D, gain: 1.25, send: 1 }));
    play('expL', q, Object.assign({}, U, { delay: D + .01, gain: 1.15, send: .9 }));
    play('expL', q, Object.assign({}, U, { delay: D + .03, gain: .7, rate: .62, lp: 1200, send: 1 }));
    play('clangHeavy', q, Object.assign({}, U, { delay: D, gain: .55, rate: .55, send: .8 }));
    play('crack', q, Object.assign({}, U, { delay: D + .02, gain: .8, rate: .8, send: .6 }));
    play('swishBig', q, Object.assign({}, U, { delay: D + .05, gain: 1.3, rate: .42, lp: 900, send: 1, dur: 1.6 }));
    const o = ctx.createOscillator(), og = ctx.createGain(), T = t + D; o.type = 'sine'; o.frequency.setValueAtTime(62, T); o.frequency.exponentialRampToValueAtTime(29, T + 1.8);
    og.gain.setValueAtTime(0, T); og.gain.linearRampToValueAtTime(.62, T + .015); og.gain.exponentialRampToValueAtTime(.001, T + 2.2); o.connect(og); og.connect(ultBus); o.start(T); o.stop(T + 2.3);
    SFX.plays.sub = (SFX.plays.sub || 0) + 1;
    let a = Math.random() * 6.3; const w = loopStart('wind', q, { ult: true, gain: 1.6, life: t + 2.2, fadeIn: .25, pri: 3, follow: () => { a += .2; const r = 10 + (ctx.currentTime - t) * 40; return { x: q.x + Math.cos(a) * r, y: q.y + 3, z: q.z + Math.sin(a) * r }; } });
    if (w && w.f) { w.noAir = true; w.f.frequency.setValueAtTime(600, t); w.f.frequency.exponentialRampToValueAtTime(4500, t + .6); w.f.frequency.exponentialRampToValueAtTime(900, t + 2.2); }
    play('debris', q, Object.assign({}, U, { delay: D + .2, gain: .9, send: .7 }));
    for (let i = 0; i < 7; i++) play('gravel', { x: q.x + R2(-30, 30), y: q.y, z: q.z + R2(-30, 30) }, { gap: 0, ult: true, pri: 2, gain: R2(.4, .8) * (1 - i / 10), delay: D + R2(.35, 2), rate: R2(.8, 1.1) });
    const hum = loopStart('dark', q, { ult: true, gain: 1.5, life: t + 3.2, fadeIn: .4, pri: 3 }); if (hum && hum.f) { hum.noAir = true; hum.f.frequency.value = 180; }
    const es = elemSnd(ek); if (es) { play(es, q, Object.assign({}, U, { delay: D + .02, gain: 1.1, send: .7 })); const ek2 = { fire: 'fire', thunder: 'thunder', water: 'water', wind: 'wind', dark: 'dark' }[es]; if (ek2 && ek2 !== 'wind' && ek2 !== 'dark') loopStart(ek2, q, { ult: true, gain: 1.3, life: t + 1.8, fadeIn: .1, pri: 3 }); if (es === 'thunder') for (let i = 0; i < 5; i++) play('zap', q, { gap: 0, ult: true, gain: 2, delay: D + R2(.05, 1.4) }); if (es === 'ice') for (let i = 0; i < 4; i++) play('crack', q, { gap: 0, ult: true, gain: .9, delay: D + R2(.1, 1.2) }); }
    SFX.plays.ultPack = (SFX.plays.ultPack || 0) + 1; SFX.stats.events++;
  }
  SFX.ultPack = ultPack;
  // 덕킹: 필살 때 다른 소리·환경음·음악을 잠깐 낮춤
  function duck(sec) { if (!ctx) return; const t = ctx.currentTime; [[duckG.gain, .4], [musicBus.gain, (SFX.music ? SFX.musicVol : 0) * .35]].forEach(([g, lo]) => { const hi = g === duckG.gain ? 1 : (SFX.music ? SFX.musicVol : 0); g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(lo, t + .08); g.setValueAtTime(lo, t + sec); g.linearRampToValueAtTime(hi, t + sec + .6); }); }
  SFX.duck = duck;
  const posOf = f => f && f.pos ? { x: f.pos.x, y: (f.pos.y || 0) + 10, z: f.pos.z } : null;
  const sword = f => !!(f && f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  const kicking = (f, text) => { try { if (typeof POSE !== 'undefined' && f && f.tgt && (f.tgt === POSE.kick || f.tgt === POSE.highKick)) return true; } catch (e) { } return /차기|킥|발차|kick/i.test(String(text || '')); };
  const ekOf = (f, ek) => ek || (f && (f.elem || (f.ch && f.ch.sig && f.ch.sig.elem))) || '';
  const DOMAIN_RE = /영역\s*전개|무량공처|복마어주자|감옥|영역/;
  const recentUlt = f => f && f._coUlt && f._coT && performance.now() / 1000 - f._coT < 2.6;
  // 지면 파괴 크기별: 자갈 → 깨짐 → 바위 붕괴(파편이 0.2~1.4초에 걸쳐 떨어짐)
  function ground(p, level) {
    if (!p) return; const q = { x: p.x, y: (p.y || 0) + 2, z: p.z };
    if (level < 1.2) play('gravel', q, { gap: .1, gain: .5 + level * .3 });
    else if (level < 2.2) { play('stones', q, { gap: .12 }); play('gravel', q, { gap: 0, gain: .6, delay: R2(.05, .15) }); }
    else { play('debris', q, { gap: .15 }); play('stones', q, { gap: 0, gain: .8, delay: .04 }); const n = level >= 3.2 ? 5 : 3; for (let i = 0; i < n; i++) play('gravel', { x: q.x + R2(-15, 15), y: q.y, z: q.z + R2(-15, 15) }, { gap: 0, gain: R2(.35, .7) * (1 - i / (n + 2)), delay: R2(.2, 1.4), rate: R2(.8, 1.1) }); if (level >= 3.2) sub(q, .9, .5); }
  }
  SFX.ground = ground;

  // ── 공개 함수 감싸기 ──
  const wrap = (name, fn) => { const o = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null); if (typeof o !== 'function') return false; try { eval(name + ' = function () { const r = o.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) { } return r; }'); return true; } catch (e) { return false; } };
  // 맞음: 무기·재질별 조합(칼-살 / 주먹-살 / 발차기), 필살 직후면 무거운 타격 + 저역 서브
  wrap('wound', function (v, a, text, ek) {
    const p = posOf(v); if (!p) return;
    if (sword(a)) combo('swordFlesh', p); else if (kicking(a, text)) combo('kick', p); else combo(Math.random() < .35 ? 'fistHeavy' : 'fistFlesh', p);
    if (recentUlt(a)) { combo('fistHeavy', p, { gap: .15, gain: .8 }); sub(p, 1, .8); }
    const es = elemSnd(ekOf(a, ek)); if (es && Math.random() < .5) play(es, p, { gain: .55, gap: .12 });
  });
  // 막기·쳐내기·맞부딪힘: 칼-칼 금속 울림(+긁힘), 칼-팔 쳐내기, 주먹-가드 팔
  wrap('clash', function (a, b, text, big) {
    const p = posOf(b) || posOf(a); if (!p) return; const t = String(text || '');
    if (sword(a) && sword(b)) { combo(big ? 'swordSwordBig' : 'swordSword', p); if (/힘겨루기|맞부딪|격돌|밀어/.test(t)) play('scrape', p, { gap: 0, delay: .08 }); }
    else if (sword(a) || sword(b)) combo('swordGuard', p);
    else combo('fistGuard', p, { gain: big ? 1.1 : 1 });
    if (big) play('thud', p, { gain: .5, gap: .15 });
  });
  // 기술 외침: 휘두름 / 필살은 기 모으기 상승 루프 + 덕킹 / 영역전개 / 속성 지속음
  wrap('callout', function (f, text, ult) {
    const p = posOf(f); const t = String(text || '');
    if (ult) { duck(1.4); if (!f.castUntil || f.castUntil < performance.now() / 1000) { const s = fst.get(f) || {}; if (s.chg) loopStop(s.chg, .1); s.chg = chargeStart(f, 1.4, true); s.chgEnd = ctx && ctx.currentTime + 1.5; fst.set(f, s); } }
    else play(Math.random() < .55 ? 'swish' : 'spell', p, { gain: .8 });
    play('flap', p, { gain: .7, gap: .2 });
    if (DOMAIN_RE.test(t) && ctx) { play('domain', p, { ult: true, dur: 3, gap: 1 }); play('gong', p, { gap: 1 }); loopStart('dark', p, { follow: () => posOf(f), life: ctx.currentTime + 3.2, gain: 1.2 }); }
    const es = elemSnd(ekOf(f)); if (es && ctx) { play(es, p, { gap: .15, delay: ult ? .45 : .12 }); elemLoop(f, es, ult ? 2.4 : 1.2); }
  });
  wrap('explode', function (p, ek, pw = 1) { if (!p) return; play(pw >= 1.6 ? 'expL' : 'expS', p, { gap: .08, gain: Math.min(1.2, .6 + pw * .2) }); const es = elemSnd(ek); if (es) play(es, p, { gain: .6, gap: .1 }); if (pw >= 2 && !(window.GROUND2 && window.GROUND2.gen)) ground(p, pw); });
  wrap('ultBlast', function (p, ek) { ultPack(p, ek); });
  wrap('proj', function (a, b, kind, mode, o = {}) { const p = posOf(a); const big = (o && (o.size || 1) >= 2) || /big|large|bijuu|fireball|getsuga|arrow/.test(String(kind)); play(big ? 'shotBig' : 'shot', p); play('swish', p, { gap: .05, gain: .6 }); const es = elemSnd(o && (o.ek || o.elem) || ekOf(a)); if (es) play(es, p, { gain: .45, gap: .15 }); });
  if (typeof window.spawnSummon === 'function') { const o = window.spawnSummon; window.spawnSummon = function (owner, kind) { const r = o.apply(this, arguments); try { const p = posOf(owner); if (/mahoraga|마허라/.test(String(kind))) { play('roar', p, { ult: true, gap: .5 }); sub(p, 1.2, .8); duck(1.5); } else play('summon', p, { gap: .3 }); } catch (e) { } return r; }; }
  if (window.GROUND2 && typeof window.GROUND2.gen === 'function') { const og = window.GROUND2.gen; window.GROUND2.gen = function (p, level) { const r = og.apply(this, arguments); try { if (p && p.y <= 30) ground(p, +level || 1); } catch (e) { } return r; }; }

  // ── 환경음: 협곡 바람(돌풍처럼 천천히 커졌다 작아짐)·모래 바람·먼 새(파일 있을 때) ──
  let ambOn = false;
  function lfo(param, hz, depth) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hz; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); }
  function ambStart() {
    if (ambOn || !ctx) return; ambOn = true;
    const w = EXTRA.wind.find(f => buf[f]), s = EXTRA.sand.find(f => buf[f]);
    if (w) { LOOP.ambWind = { f: [w], gain: .1, lp: 3000 }; } if (s) { LOOP.ambSand = { f: [s], gain: .05 }; }
    const a = loopStart('ambWind', null, { bus: ambBus, dry: false, send: .1, fadeIn: 2, pri: 3 }); if (a) { lfo(a.g.gain, .071, a.lvl * .45); lfo(a.g.gain, .13, a.lvl * .25); if (a.f) lfo(a.f.frequency, .05, 180); }
    const b = loopStart('ambSand', null, { bus: ambBus, send: .05, fadeIn: 3, pri: 3 }); if (b) lfo(b.g.gain, .043, b.lvl * .8);
    SFX.amb = { wind: !!a, sand: !!b, birds: EXTRA.birds.some(f => buf[f]) };
  }
  let birdT = 0;
  function birds() {
    if (!SFX.amb || !SFX.amb.birds || !ctx || ctx.currentTime < birdT) return; birdT = ctx.currentTime + R2(7, 18);
    const f = EXTRA.birds.filter(x => buf[x]); if (!f.length) return; const an = Math.random() * 6.3;
    MAP.birds = MAP.birds || { f, gain: .06, rate: [.95, 1.05], send: .5, pri: 0 };
    play('birds', { x: LP.x + Math.cos(an) * 420, y: 120, z: LP.z + Math.sin(an) * 420 }, { bus: ambBus, gap: 3 });
  }
  // ── 배경음악: EXTRA.music 에 파일이 있을 때만(스트리밍 재생, 무작위 곡 이어 틀기) ──
  let mEl = null;
  function musicStart() {
    if (!EXTRA.music.length || mEl || !ctx) return;
    mEl = new Audio(); mEl.preload = 'auto'; mEl.crossOrigin = 'anonymous';
    const next = () => { mEl.src = B + EXTRA.music[(Math.random() * EXTRA.music.length) | 0]; if (SFX.music) mEl.play().catch(() => { }); };
    mEl.onended = next; try { ctx.createMediaElementSource(mEl).connect(musicBus); } catch (e) { }
    next(); SFX.musicEl = mEl;
  }
  function setMusic(on) { SFX.music = on; try { localStorage.setItem('arenaMusic', on ? '1' : '0'); } catch (e) { } if (musicBus) musicBus.gain.setTargetAtTime(on ? SFX.musicVol : 0, ctx.currentTime, .2); if (mEl) { if (on) mEl.play().catch(() => { }); else mEl.pause(); } }
  SFX.setMusic = setMusic;

  // ── 동적 믹싱: 동시 소리가 많으면 일반 버스를 자동으로 낮춤 + 출력 봉우리 측정(클리핑 감시) ──
  function mix() {
    const n = live.length; normal.gain.setTargetAtTime(1 / (1 + .05 * Math.max(0, n - 8)), ctx.currentTime, .08);
    ana.getFloatTimeDomainData(anaBuf); let pk = 0; for (let i = 0; i < anaBuf.length; i++) { const a = Math.abs(anaBuf[i]); if (a > pk) pk = a; if (a > 1) SFX.stats.overs++; }
    const db = 20 * Math.log10(pk + 1e-9); if (db > SFX.stats.peakDb) SFX.stats.peakDb = +db.toFixed(2); if (pk >= 1) SFX.stats.clip++;
    SFX.stats.voices = n;
  }
  // 지속음 매 화면: 위치 따라가기, 거리 고음 감쇠, 수명 끝나면 끄기, 덧소리(tick)
  function loopsTick() {
    const t = ctx.currentTime;
    for (const L of loops.slice()) {
      if (L.life && t > L.life) { loopStop(L, .35); continue; }
      if (L.follow) { const p = L.follow(); if (!p) { loopStop(L, .2); continue; } if (L.pn) setPos(L.pn, p); if (L.f && !L.noAir && !L.tick) L.f.frequency.setTargetAtTime(Math.min(L.lp || 20000, airCut(distOf(p))), t, .05); L.pos = p; }
      if (L.tick && t >= L.next) L.tick(L);
    }
  }
  // 투사체 날아가는 소리: 다가오면 높고 멀어지면 낮게(도플러 근사, 음속 1,100 단위/초)
  const pv = new Map();
  function projTick() {
    if (typeof projs === 'undefined' || !Array.isArray(projs)) return; const cur = new Set(projs);
    for (const [p, L] of pv) if (!cur.has(p) || p.done) { loopStop(L, .08); pv.delete(p); }
    for (const p of projs) {
      if (p.done || !p.p || !p.v) continue; let L = pv.get(p);
      if (!L) { if (pv.size >= 2 || (p.size || 1) < 1.1 && !p.ek) continue; const es = elemSnd(p.ek); L = loopStart(es === 'fire' ? 'fire' : es === 'thunder' ? 'thunder' : es === 'water' ? 'water' : 'rush', p.p, { fadeIn: .05, gain: Math.min(1.4, .6 + (p.size || 1) * .3), pri: 1 }); if (!L) continue; L.noAir = true; pv.set(p, L); }
      if (L.pn) setPos(L.pn, p.p);
      const dx = LP.x - p.p.x, dy = LP.y - p.p.y, dz = LP.z - p.p.z, dl = Math.hypot(dx, dy, dz) || 1, vr = (p.v.x * dx + p.v.y * dy + p.v.z * dz) / dl, k = Math.min(1.45, Math.max(.7, 1100 / (1100 - vr)));
      L.src.playbackRate.setTargetAtTime(L.base * k, ctx.currentTime, .03); if (L.f) L.f.frequency.setTargetAtTime(airCut(dl), ctx.currentTime, .04);
    }
  }

  // ── 상태 살피기(매 화면): KO·교대·패배·재출전·날아감·착지·미끄러짐·옷 펄럭임·변신·발소리·기 모으기 ──
  const prev = { ko: 0, swaps: 0, defeat: 0, revive: 0, launched: 0, gg: 0, names: '' }, fst = new WeakMap();
  let lastT = 0;
  function watch() {
    syncListener(); if (!ctx) return; mix(); if (!SFX.on) return;
    loopsTick(); projTick(); birds();
    const now = performance.now() / 1000, dt = Math.min(.1, Math.max(.001, now - (lastT || now - .016))); lastT = now;
    const H = window.HP && HP.st, KN = window.KNOCK && KNOCK.st, GG = window.GROUNDGEN;
    const camP = typeof camera !== 'undefined' ? camera.position : null;
    if (H) {
      if (H.ko > prev.ko) { combo('fistHeavy', camP, { gain: .9 }); play('bodyfall', camP, { gap: .3, delay: .35 }); sub(camP, .8, .5); play('gong', camP, { gap: .5, delay: .25 }); }
      if (H.defeat > prev.defeat) play('gong', camP, { rate: .8, gap: .5 });
      if (H.revive > prev.revive) play('bell', camP, { gap: .5 });
      prev.ko = H.ko; prev.defeat = H.defeat; prev.revive = H.revive;
    }
    if (KN && KN.wall) { const W = KN.wall, pw = prev.wall || {}; let wf = null, wd = -1; if (typeof F !== 'undefined') for (const f of F) { if (!f.pos) continue; const e = Math.hypot(f.pos.x / 360, (f.pos.z + 60) / (f.pos.z + 60 < 0 ? 330 : 660)); if (e > wd) { wd = e; wf = f; } } const wp = posOf(wf) || camP;
      if (W.embed > (pw.embed || 0) || W.break > (pw.break || 0)) { const br = W.break > (pw.break || 0); play('bodyfall', wp, { gap: .1, gain: 1.1, rate: .75 }); play('debris', wp, { gap: .1, delay: .02, gain: br ? 1 : .6 }); play('rubble', wp, { gap: .1, delay: .08, gain: br ? 1 : .6 }); if (br) { for (let i = 0; i < 4; i++) play('gravel', wp, { gap: 0, gain: R2(.4, .7), delay: R2(.25, 1.2) }); sub(wp, .9, .6); } }
      if (W.kick > (pw.kick || 0)) { play('landX', wp, { gap: .1, gain: .9 }); play('gravel', wp, { gap: .1, gain: .5, delay: .03 }); play('flap', wp, { gap: .1, delay: .08 }); }
      if (W.slide > (pw.slide || 0)) play('gravel', wp, { gap: .1, dur: 1.1, rate: .65, lp: 2600, gain: .9 });
      if (W.sword > (pw.sword || 0)) { play('scrape', wp, { gap: .1, dur: 1, rate: .8 }); play('ring', wp, { gap: .1, delay: .05 }); play('gravel', wp, { gap: .1, gain: .5, dur: .9, rate: .7 }); }
      if (W.chakra > (pw.chakra || 0)) { play('spell', wp, { gap: .1 }); play('wind', wp, { gap: .1, gain: .7 }); }
      prev.wall = Object.assign({}, W); }
    if (KN) { if (KN.launched > prev.launched) { play('swishBig', camP, { gap: .2 }); play('flap', camP, { gap: .2, gain: .8 }); } prev.launched = KN.launched; }
    if (GG && !(window.GROUND2 && window.GROUND2.gen)) { if (GG.events > prev.gg) ground(camP, 1.5); prev.gg = GG.events; }
    if (typeof F !== 'undefined') {
      const names = F.map(f => f.ch && f.ch.key).join(','); if (prev.names && names !== prev.names) { play('cloth', camP, { gap: .3 }); play('bell', camP, { rate: 1.2, gain: .6, gap: .3 }); } prev.names = names;
      for (const f of F) {
        if (!f.pos) continue; let s = fst.get(f); if (!s || s.x === undefined) { s = Object.assign(s || {}, { x: f.pos.x, z: f.pos.z, acc: 0, air: !!f.air, mk: null, slideT: 0, flapT: 0 }); fst.set(f, s); }
        const d = Math.hypot(f.pos.x - s.x, f.pos.z - s.z), sp = d / dt; s.x = f.pos.x; s.z = f.pos.z;
        if (!f.air && d < 20) { s.acc += d; if (s.acc > 26) { s.acc = 0; play('step', posOf(f), { gap: .13, gain: Math.min(1.3, .6 + sp / 300) }); } }
        if (f.air) { s.airT = (s.airT || 0) + 1; s.vyMin = Math.min(s.vyMin || 0, f.vel ? f.vel.y : 0); if (sp > 220 && now > s.flapT) { s.flapT = now + .9; play('flap', posOf(f), { gap: .35, gain: Math.min(1, sp / 400) }); } }
        else {
          if (s.air && (s.airT || 0) > 18 && now > (s.landT || 0)) { s.landT = now + .9; SFX.stats.landings = (SFX.stats.landings || 0) + 1; const hard = (s.airT > 40) || (s.vyMin || 0) < -220; if (hard) { play('bodyfall', posOf(f), { gap: .12 }) || play('thud', posOf(f), { gap: .12, gain: .9 }); play('gravel', posOf(f), { gap: .12, gain: .55, delay: .02 }); play('cloth', posOf(f), { gap: .1, delay: .03 }); } else { play('landX', posOf(f), { gap: .12, gain: Math.min(1, .5 + (s.airT || 0) / 60) }) || play('land', posOf(f), { gap: .12 }); play('cloth', posOf(f), { gap: .1, gain: .6 }); } }
          s.airT = 0; s.vyMin = 0;
          const kb = f.kb && f.kb.length ? f.kb.length() : 0; if ((kb > 70 || sp > 260) && d < 20 && now > s.slideT) { s.slideT = now + .5; play('gravel', posOf(f), { gap: .05, dur: .45, rate: R2(.62, .78), lp: 2400, gain: Math.min(1.1, .4 + Math.max(kb, sp * .4) / 300) }); }
        }
        if (!s.air && f.air && (!f.vel || f.vel.y > 120)) play('cloth', posOf(f), { gap: .12, gain: .7 });
        s.air = !!f.air;
        const mk = f.mode > 0 ? f.modeK : null; if (mk && mk !== s.mk) { play('morph', posOf(f), { ult: true, gap: .4 }); play('spell', posOf(f), { gap: .2 }); } s.mk = mk;
        const casting = (f.castUntil || 0) > now;
        if (casting && (!s.chg || s.chgId !== f.castId) && (f.castUlt || (f.castDur || 0) > 1.05)) { if (s.chg) loopStop(s.chg, .08); s.chg = chargeStart(f, f.castUntil - now, !!f.castUlt); s.chgId = f.castId; s.chgEnd = 0; }
        else if (s.chg && !casting && (!s.chgEnd || ctx.currentTime > s.chgEnd)) { loopStop(s.chg, .12); s.chg = null; }
      }
    }
  }
  (function loop() { try { watch(); } catch (e) { SFX.lastErr = String(e && e.message || e); } requestAnimationFrame(loop); })();

  // ── 단추(교전 화면 왼쪽 아래): 🔊 효과음 켜기/끄기 + 음량, 🎵 음악 켜기/끄기 + 음량(음악 파일이 있을 때) ──
  const stage = document.getElementById('stage');
  const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:6px;bottom:6px;z-index:6;display:flex;gap:4px;align-items:center';
  const bs = 'min-width:36px;height:36px;border-radius:18px;border:1px solid #8a6420;background:rgba(10,8,14,.7);color:#ffe8b0;font-size:16px;cursor:pointer;padding:0 8px';
  const btn = document.createElement('button'); btn.id = 'sfxBtn'; btn.type = 'button'; btn.style.cssText = bs;
  const vol = document.createElement('input'); vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.value = String(Math.round(SFX.vol * 100)); vol.title = '효과음 음량'; vol.style.cssText = 'width:64px;accent-color:#e8b84a';
  const mbtn = document.createElement('button'); mbtn.id = 'musicBtn'; mbtn.type = 'button'; mbtn.style.cssText = bs + (EXTRA.music.length ? '' : ';display:none');
  const mvol = document.createElement('input'); mvol.type = 'range'; mvol.min = '0'; mvol.max = '100'; mvol.value = String(Math.round(SFX.musicVol * 100)); mvol.title = '음악 음량'; mvol.style.cssText = 'width:56px;accent-color:#9fd8ff' + (EXTRA.music.length ? '' : ';display:none');
  const paint = () => { btn.textContent = SFX.on ? '🔊' : '🔇'; btn.title = SFX.on ? '효과음 끄기' : '효과음 켜기'; mbtn.textContent = SFX.music ? '🎵' : '🚫'; mbtn.title = SFX.music ? '음악 끄기' : '음악 켜기'; };
  btn.onclick = e => { e.stopPropagation(); start(); SFX.on = !SFX.on; try { localStorage.setItem('arenaSfx', SFX.on ? '1' : '0'); } catch (er) { } if (sfxMaster) sfxMaster.gain.value = SFX.on ? SFX.vol : 0; if (!SFX.on) loops.slice().forEach(L => { if (!L.amb) loopStop(L, .1); }); paint(); if (SFX.on) play('ui'); };
  vol.oninput = e => { start(); SFX.vol = vol.value / 100; try { localStorage.setItem('arenaSfxVol', String(SFX.vol)); } catch (er) { } if (sfxMaster && SFX.on) sfxMaster.gain.setTargetAtTime(SFX.vol, ctx.currentTime, .03); };
  mbtn.onclick = e => { e.stopPropagation(); start(); setMusic(!SFX.music); paint(); };
  mvol.oninput = e => { start(); SFX.musicVol = mvol.value / 100; try { localStorage.setItem('arenaMusicVol', String(SFX.musicVol)); } catch (er) { } if (musicBus && SFX.music) musicBus.gain.setTargetAtTime(SFX.musicVol, ctx.currentTime, .05); };
  vol.onpointerdown = mvol.onpointerdown = e => e.stopPropagation();
  paint();
  const hint = document.createElement('div'); hint.textContent = '화면을 누르면 소리가 켜집니다';
  hint.style.cssText = 'font-size:11px;color:#ffe8b0;background:rgba(10,8,14,.6);padding:2px 6px;border-radius:4px;pointer-events:none';
  if (stage && stage.appendChild) { [btn, vol, mbtn, mvol].forEach(x => box.appendChild(x)); if (SFX.on) box.appendChild(hint); stage.appendChild(box); }
})();
