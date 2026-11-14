// 체인소맨(11-14 소유자 요청): 악마의 힘·계약·변신. 원작 기술명, 모양은 코드로 만듦(이미지·모형 파일 없음).
//  덴지(체인소 변신·머리/팔 톱날·사슬) · 파워(피의 무기) · 아키(여우·저주·미래의 악마 + 일본도) · 마키마(지배·손가락 총·압살)
//  · 레제(폭탄의 악마 — 폭발 추진으로 공중 기동: fly) · 키시베(단검·격투)
(function () {
  const NW = window.NEWWORLD; if (!NW) return;
  NW.addWorld('csm', { name: '체인소맨', stroke: '#e86a1a', dodge: '악마의 반사신경' }, ['denji', 'power', 'aki', 'makima', 'reze', 'kishibe']);
  Object.assign(ELEM, {
    chainsaw: { c: '#ff7a2a', parts: ['#ffffff', '#ffd080', '#ff7a2a', '#8a1a10'], g: 120, style: 'metal' },   // 톱날 불티 + 피
    fiend: { c: '#ff2a4a', parts: ['#ffd0d8', '#ff6a80', '#ff2a4a', '#6a0010'], g: 80, style: 'flame' },       // 피의 마인
    control: { c: '#ffcf4a', parts: ['#ffffff', '#ffe8a0', '#ffcf4a', '#c03030'], g: 0, style: 'spark' },     // 지배의 악마(황금 눈)
    bomb: { c: '#ff9a2a', parts: ['#fff2a0', '#ffc040', '#ff6a10', '#3a2a24'], g: -30, style: 'flame' },      // 폭탄의 악마
    fox: { c: '#ffd8a0', parts: ['#ffffff', '#fff0d0', '#ffd8a0', '#c08a50'], g: -4, style: 'gust' },         // 여우의 악마
    curse: { c: '#c060ff', parts: ['#ffffff', '#e0c0ff', '#c060ff', '#3a1060'], g: -6, style: 'shadow' },     // 저주의 악마
  });
  const civ = (o) => Object.assign({ skin: '#f2d2b4', top: '#f4f4f0', top2: '#1a1a1e', pants: '#1a1a22', sandal: '#141418', sleeve: '#f4f4f0', belt: '#141418', wrap: '#1a1a1e', coat: '#1a1a22', coat2: '#101014', glove: '#f2d2b4', band: '#1a1a1e', plate: '#c0c4cc', eye: '#3a2a2a' }, o);
  Object.assign(PALS, {
    denji: civ({ hair: '#e8b830', hair2: '#f4d060', eye: '#8a5a2a', top2: '#1a1a1e' }),            // 공안 정장(흰 셔츠·검은 넥타이)
    power: civ({ hair: '#f2b8c8', hair2: '#ffd8e0', eye: '#e8a020', top: '#f4f4f0', skin: '#f6dac4' }),
    aki: civ({ hair: '#141418', hair2: '#24242c', eye: '#2a3a5a' }),
    makima: civ({ hair: '#d86a5a', hair2: '#e88a7a', eye: '#e8c040', skin: '#f6dcc8' }),
    reze: civ({ hair: '#5a2a4a', hair2: '#7a3a5a', eye: '#3a7a5a', top: '#2a2a30', pants: '#2a2a30', skin: '#f2d4bc' }),
    kishibe: civ({ hair: '#d8d8dc', hair2: '#ececf0', eye: '#4a4a4a', skin: '#e8c8a8' }),
  });
  const sawFx = (a, b) => { const p = chest(b); for (let i = 0; i < 18; i++) parts.push({ p: p.clone(), v: V3(R(-120, 120), R(20, 160), R(-120, 120)), life: R(.25, .5), c: pick(['#ffffff', '#ffd080', '#ff7a2a']), g: 260, s: 1.2 }); for (let i = 0; i < 10; i++) parts.push({ p: p.clone(), v: V3(R(-60, 60), R(-10, 80), R(-60, 60)), life: R(.6, 1), c: pick(['#c81e2a', '#8a1010']), g: 200, s: 1.6 }); };
  const saw = (nm, op = {}) => withFx((a, b) => T.melee(a, b, nm, 'chainsaw', { prep: 'slashPrep', strike: 'slash', strike2: 'spreadSlash', n: 3, ...op }), sawFx);

  defChar('denji', '덴지', 'csm', {
    '체인소맨 변신(스타터 당기기)': (a, b) => [...seq(a, b, [['braced', .45, { aura: 1, elem: 'chainsaw' }]]), ...T.buff(a, b, '부릉! 체인소맨', 'chainsaw', { dur: 7, pose: 'skyRaise' })],
    '팔 체인소 난도질': saw('팔 체인소 · 난도질', { n: 5 }),
    '머리 톱날 돌진': (a, b) => T.dash(a, b, '머리 톱날 돌진', null, 'chainsaw', 1.4, false, { run: 'crouchRun', hold: 'shoulder' }),
    '체인소 회전 베기': (a, b) => T.aoe(a, b, '체인소 · 회전 베기', 'chainsaw', { prep: 'slashPrep', strike: 'spreadSlash', spin: 14, rad: 30, pw: 1.6 }),
    '사슬 휘감기': (a, b) => T.ranged(a, b, '체인소 사슬 · 휘감기', 'arrow', 'chainsaw', { size: .9, v: 380, prep: 'windBack', cast: 'throw' }),
    '하늘 낙하 톱질': (a, b) => T.aoe(a, b, '하늘에서 · 내리 톱질', 'chainsaw', { prep: 'slashPrep', strike: 'swordDown', jump: 1, rad: 34, pw: 2.0, ult: true }),
    '톱날 발차기': (a, b) => T.melee(a, b, '톱날 발차기', 'chainsaw', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 2 }),
    '피 보충 · 재생': (a, b) => [...seq(a, b, [['kneel', .4, { aura: 1, elem: 'fiend' }]]), ...T.buff(a, b, '피를 마시고 · 재생', 'fiend', { dur: 3, pose: 'braced' })],
    '체인소맨 · 전력 질주 난도질': (a, b) => [...T.dash(a, b, '전력 질주!', null, 'chainsaw', 1.2, false, { run: 'crouchRun', hold: 'slash' }), ...saw('체인소맨 · 전력 난도질', { n: 6, pw: 2.2, ult: true })(a, b)],
  }, { name: '체인소', hand: null, elem: 'chainsaw', kind: 'getsuga' });

  defChar('power', '파워', 'csm', {
    '피의 망치': (a, b) => withFx((x, y) => T.melee(x, y, '피의 망치!', 'fiend', { prep: 'hammerUp', strike: 'hammerDown', n: 1, pw: 1.9 }), (x, y) => pending.push({ t: .3, fn: () => explode(V3(y.pos.x, 0, y.pos.z), 'fiend', 1.3) }))(a, b),
    '피의 낫': (a, b) => T.melee(a, b, '피의 낫 · 베기', 'fiend', { prep: 'slashPrep', strike: 'spreadSlash', n: 2 }),
    '피의 창 투척': (a, b) => T.ranged(a, b, '피의 창!', 'arrow', 'fiend', { n: 3, size: 1, v: 400, prep: 'windBack', cast: 'throw' }),
    '혈액 대검': (a, b) => T.melee(a, b, '혈액 대검', 'fiend', { prep: 'slashPrep', strike: 'swordDown', n: 1, pw: 1.7 }),
    '피의 가시 폭발': (a, b) => T.aoe(a, b, '피의 가시', 'fiend', { prep: 'axe', strike: 'hammerDown', rad: 32, pw: 1.5 }),
    '파워 님의 최강 일격': (a, b) => [...seq(a, b, [['hammerUp', .5, { aura: 1, elem: 'fiend' }]]), ...T.aoe(a, b, '파워 님이 최강이다!', 'fiend', { prep: 'hammerUp', strike: 'hammerDown', jump: 1, rad: 44, pw: 2.2, ult: true })],
    '할퀴기 연타': (a, b) => T.melee(a, b, '할퀴기', 'fiend', { prep: 'punchPrep', strike: 'punch', strike2: 'punchL', n: 4 }),
  }, { name: '혈액 조작', hand: null, elem: 'fiend', kind: 'arrow' });

  defChar('aki', '하야카와 아키', 'csm', {
    '여우의 악마 · 콘!': (a, b) => withFx((x, y) => T.at(x, y, '콘!', 'fox', 'flames', { pose: 'fingerPoint', pw: 2.0, ult: true }), (x, y) => pending.push({ t: .25, fn: () => { const p = chest(y); dome(p, 26, '#ffd8a0', '#fff6e0'); explode(p, 'fox', 1.8); } }))(a, b),
    '저주의 악마 · 못 세 번': (a, b) => withFx((x, y) => T.melee(x, y, '저주의 악마 · 세 번 찔러라', 'curse', { prep: 'slashPrep', strike: 'k_tsuki', n: 3, pw: 1.6, ult: true }), (x, y) => pending.push({ t: .6, fn: () => { const p = chest(y); dome(p, 20, '#c060ff', '#200030'); for (let i = 0; i < 6; i++) bolt(p.clone().add(V3(R(-12, 12), 30, R(-12, 12))), p, '#c060ff', .6, 2); } }))(a, b),
    '미래의 악마 · 예지': (a, b) => [...seq(a, b, [['stare', .4, { aura: 1, elem: 'light' }]]), ...T.buff(a, b, '미래의 악마 · 예지 회피', 'light', { dur: 5, pose: 'k_chudan' })],
    '일본도 거합': (a, b) => T.melee(a, b, '거합 베기', 'slash', { prep: 'k_iaiReady', strike: 'k_iaiCut', n: 1, pw: 1.6 }),
    '일본도 연격': (a, b) => T.melee(a, b, '일본도 연격', 'slash', { prep: 'k_chudan', strike: 'k_kesa', strike2: 'k_upCut', n: 4 }),
    '돌진 찌르기': (a, b) => T.dash(a, b, '돌진 찌르기', null, 'slash', 1.1, false, { run: 'k_run', hold: 'k_tsuki' }),
    '여우 · 물어뜯기': (a, b) => T.at(a, b, '여우 · 물어뜯기', 'fox', 'flames', { pose: 'fingerPoint', pw: 1.4 }),
  }, { name: '여우의 악마', hand: null, elem: 'fox', kind: 'getsuga' });
  NW.sword('aki', { L: 13, W: .8, c: '#e8eaf0', h: '#1a1a22', g: '#c8a040' });

  defChar('makima', '마키마', 'csm', {
    '탕(손가락 총)': (a, b) => T.ranged(a, b, '탕.', 'arrow', 'control', { n: 1, size: 1.3, v: 620, prep: 'fingerPoint', cast: 'fingerPoint' }),
    '탕 · 탕 · 탕': (a, b) => T.ranged(a, b, '탕 · 탕 · 탕', 'arrow', 'control', { n: 3, size: 1.1, v: 620, prep: 'fingerPoint', cast: 'fingerPoint' }),
    '지배 · 무릎 꿇어라': (a, b) => T.at(a, b, '무릎 꿇어', 'control', 'flames', { pose: 'stare', pw: 1.6 }),
    '압살': (a, b) => [...seq(a, b, [['stare', .55, { aura: 1, elem: 'control' }]]), ...T.aoe(a, b, '압살', 'control', { prep: 'openPalm', strike: 'hammerDown', rad: 48, pw: 2.4, ult: true })],
    '지배의 사슬': (a, b) => T.ranged(a, b, '지배의 사슬', 'arrow', 'control', { n: 4, size: .8, v: 360, prep: 'openArms', cast: 'openPalm' }),
    '계약 · 대가': (a, b) => [...seq(a, b, [['seal', .45, { aura: 1, elem: 'control' }]]), ...T.buff(a, b, '계약 · 피해 전가', 'control', { dur: 5, pose: 'crossArms' })],
  }, { name: '지배', hand: null, elem: 'control', kind: 'orb' });

  defChar('reze', '레제', 'csm', {
    '폭탄 변신(목 핀)': (a, b) => [...seq(a, b, [['braced', .4, { aura: 1, elem: 'bomb' }]]), ...T.buff(a, b, '봄! 폭탄의 악마', 'bomb', { dur: 7, pose: 'skyRaise' })],
    '폭발 발차기': withFx((a, b) => T.melee(a, b, '폭발 발차기', 'bomb', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 2, pw: 1.4 }), (a, b) => pending.push({ t: .25, fn: () => explode(chest(b), 'bomb', 1.2) })),
    '손가락 폭탄 투척': (a, b) => T.ranged(a, b, '폭탄 투척', 'fireball', 'bomb', { n: 3, size: 1.1, v: 300, prep: 'windBack', cast: 'throw' }),
    '어뢰 폭격': (a, b) => T.ranged(a, b, '어뢰!', 'fireball', 'bomb', { n: 5, size: 1.4, v: 260, prep: 'openArms', cast: 'openPalm', ult: true }),
    '폭발 추진 돌진': (a, b) => T.dash(a, b, '폭발 추진 돌진', null, 'bomb', 1.3, false, { run: 'crouchRun', hold: 'punch' }),
    '대폭발': (a, b) => T.aoe(a, b, '대폭발', 'bomb', { prep: 'braced', strike: 'openPalm', rad: 46, pw: 2.2, ult: true }),
  }, { name: '폭탄', hand: null, elem: 'bomb', kind: 'fireball', fly: true });

  defChar('kishibe', '키시베', 'csm', {
    '단검 투척': (a, b) => T.ranged(a, b, '단검 투척', 'arrow', 'metal', { n: 4, size: .7, v: 460, prep: 'windBack', cast: 'throw' }),
    '근접 격투 연타': (a, b) => T.melee(a, b, '근접 격투', 'metal', { prep: 'punchPrep', strike: 'punch', strike2: 'elbow', n: 5 }),
    '단검 연격': (a, b) => T.melee(a, b, '단검 연격', 'slash', { prep: 'slashPrep', strike: 'slash', strike2: 'spreadSlash', n: 4 }),
    '최강의 데빌 헌터': (a, b) => [...seq(a, b, [['braced', .4, { aura: 1, elem: 'metal' }]]), ...T.melee(a, b, '최강의 데빌 헌터', 'slash', { prep: 'slashPrep', strike: 'spreadSlash', n: 6, pw: 2.0, ult: true })],
    '발 걸어 넘기기': (a, b) => T.melee(a, b, '발 걸기', 'metal', { prep: 'kickPrep', strike: 'sweep', n: 1, pw: 1.2 }),
  }, { name: '단검', hand: null, elem: 'metal', kind: 'arrow' });

  if (window.registerCharAsset) {
    const suit = (x) => Object.assign({ coat: { c: '#1a1a22', len: 'thigh', sleeves: true }, shirt: '#f4f4f0', tie: '#141418' }, x);
    registerCharAsset('denji', { body: 'n', cos: suit(), hair: { s: 'messy', n: 22, L: .7 }, face: 'sharp', facep: { es: 1.05, ba: .3 } });
    registerCharAsset('power', { body: 'f', cos: suit(), hair: { s: 'long', n: 26, L: 1.4 }, face: 'sharp', facep: { es: 1.15, ba: .2 } });
    registerCharAsset('aki', { body: 'n', cos: suit(), hair: { s: 'pony', n: 18, L: .7 }, face: 'calm', facep: { jw: .9, jl: 1.05, es: .9, ba: .3 } });
    registerCharAsset('makima', { body: 'f', cos: suit({ tie: '#141418' }), hair: { s: 'pony', n: 22, L: 1.1 }, face: 'calm', facep: { es: 1.0, ba: .1 } });
    registerCharAsset('reze', { body: 'f', cos: { shirt: '#2a2a30', skirt: { c: '#2a2a30', len: 'thigh' }, scarf: '#2a2a30' }, hair: { s: 'bob', n: 20, L: .8 }, face: 'round', facep: { es: 1.1, ba: .15 } });
    registerCharAsset('kishibe', { body: 'm', cos: suit(), hair: { s: 'short', n: 16, L: .5 }, face: 'sleepy', facep: { jw: 1.05, jl: 1.08, es: .85, ba: .2 } });
  }
  NW.finish({ csm: { lunge: 1.6, kb: 1.2, hs: 1.1, combo: .34 } }, { denji: { combo: .45, kb: 1.3 }, makima: { kb: 1.5, hs: 1.2 }, reze: { lunge: 1.9 }, kishibe: { combo: .5 } });
})();
