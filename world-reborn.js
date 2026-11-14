// 가정교사 히트맨 리본(11-14 소유자 요청): 사기(死氣)의 불꽃 7속성(대공·폭풍·비·구름·안개·번개·태양) — 지상·공중전.
//  츠나(하이퍼 사기 모드 · X 글러브 불꽃 추진 비행: fly · X 버너 · 제로 지점 돌파) · 리본(레옹 · 사기탄 · 카오스 샷)
//  · 고쿠데라(다이너마이트 · 폭풍 불꽃 · 플레임 애로우) · 야마모토(시구레 소엔류 · 비 불꽃) · 히바리(톤파 · 구름 불꽃 증식)
//  · 뱌쿠란(백룡 · 하얀 날개 비행: fly) · 무쿠로(육도윤회 · 환술 · 삼지창)
(function () {
  const NW = window.NEWWORLD; if (!NW) return;
  NW.addWorld('reborn', { name: '가정교사 히트맨 리본', stroke: '#ff8a1a', dodge: '초직감' }, ['tsuna', 'reborn', 'gokudera', 'yamamoto', 'hibari', 'byakuran', 'mukuro']);
  Object.assign(ELEM, {
    rb_sky: { c: '#ff9a1a', parts: ['#ffffff', '#fff0b0', '#ffb030', '#ff6a10'], g: -20, style: 'flame' },    // 대공(투명한 주황 불꽃)
    rb_storm: { c: '#ff3a3a', parts: ['#ffffff', '#ffb0a0', '#ff3a3a', '#8a1010'], g: -10, style: 'flame' },  // 폭풍(분해)
    rb_rain: { c: '#4ab0ff', parts: ['#ffffff', '#c0e8ff', '#4ab0ff', '#1a5aa0'], g: 60, style: 'splash' },   // 비(진정)
    rb_cloud: { c: '#a060ff', parts: ['#ffffff', '#e0c8ff', '#a060ff', '#4a1aa0'], g: -6, style: 'shadow' },  // 구름(증식)
    rb_mist: { c: '#6a40d0', parts: ['#ffffff', '#c8b0ff', '#6a40d0', '#20104a'], g: -2, style: 'gust' },     // 안개(환술)
    rb_thunder: { c: '#6aff6a', parts: ['#ffffff', '#d0ffd0', '#6aff6a', '#1a8a1a'], g: 0, style: 'spark' },  // 번개(경화)
    rb_sun: { c: '#ffe040', parts: ['#ffffff', '#fff8c0', '#ffe040', '#c0a010'], g: -10, style: 'flame' },    // 태양(활성)
  });
  const gak = (o) => Object.assign({ skin: '#f2d2b4', top: '#f4f4f0', top2: '#3a3a44', pants: '#5a5a66', sandal: '#2a2a30', sleeve: '#f4f4f0', belt: '#2a2a30', wrap: '#3a3a44', coat: '#3a3a44', coat2: '#2a2a30', glove: '#f2d2b4', band: '#3a3a44', plate: '#c0c4cc', eye: '#7a4a2a' }, o);
  Object.assign(PALS, {
    tsuna: gak({ hair: '#8a4a1a', hair2: '#b06a2a', eye: '#ff9a1a', glove: '#1a1a1e', band: '#ff9a1a' }),       // 이마 불꽃·X 글러브
    reborn: gak({ hair: '#141418', hair2: '#24242c', top: '#1a1a22', top2: '#ffe040', pants: '#1a1a22', sleeve: '#1a1a22', eye: '#141418', band: '#ff9a1a' }),
    gokudera: gak({ hair: '#d8d8e0', hair2: '#ececf2', eye: '#3a7a5a', top: '#3a3a44', top2: '#ff3a3a' }),
    yamamoto: gak({ hair: '#141418', hair2: '#24242c', eye: '#3a2a2a', top2: '#4ab0ff' }),
    hibari: gak({ hair: '#141418', hair2: '#24242c', eye: '#3a3a5a', coat: '#1a1a22', top: '#f4f4f0', top2: '#c81e2a', pants: '#1a1a22' }),
    byakuran: gak({ hair: '#f4f4f8', hair2: '#ffffff', eye: '#a080ff', top: '#f4f4f8', top2: '#e8e8ee', pants: '#f4f4f8', sleeve: '#f4f4f8', skin: '#f6dcc8' }),
    mukuro: gak({ hair: '#3a2a6a', hair2: '#4a3a8a', eye: '#c81e2a', top: '#2a3a2a', top2: '#1a1a22', coat: '#2a3a2a' }),
  });
  const flameBurst = (ek) => (a, b) => { const p = chest(b), c = ELEM[ek].c; for (let i = 0; i < 24; i++) parts.push({ p: p.clone(), v: V3(R(-90, 90), R(20, 140), R(-90, 90)), life: R(.4, .8), c: pick(ELEM[ek].parts), g: -30, s: R(1.4, 2.4) }); ring(p, 10, c, false, .5, 3); };
  const xBurner = (a, b) => { const p = chest(b), c = '#ff9a1a'; for (let i = 0; i < 4; i++) pending.push({ t: i * .05, fn: () => explode(p.clone().add(V3(R(-6, 6), R(-4, 6), R(-6, 6))), 'rb_sky', 1.6) }); dome(p, 30, c, '#fff4d0'); shake = Math.max(shake, 12); };

  defChar('tsuna', '사와다 츠나요시', 'reborn', {
    '하이퍼 사기 모드': (a, b) => [...seq(a, b, [['braced', .45, { aura: 1, elem: 'rb_sky' }]]), ...T.buff(a, b, '하이퍼 사기 모드', 'rb_sky', { dur: 8, pose: 'skyRaise' })],
    'X 버너': (a, b) => withFx((x, y) => T.ranged(x, y, 'X 버너!!', 'beam', 'rb_sky', { size: 2.6, v: 520, prep: 'openPalm', cast: 'openPalm', wind: .5, ult: true }), (x, y) => pending.push({ t: .5, fn: () => xBurner(x, y) }))(a, b),
    '빅뱅 액셀': (a, b) => withFx((x, y) => T.dash(x, y, '빅뱅 액셀', null, 'rb_sky', 1.6, true, { run: 'crouchRun', hold: 'seriousPunch' }), flameBurst('rb_sky'))(a, b),
    '제로 지점 돌파 · 개': (a, b) => [...seq(a, b, [['palm', .5, { aura: 1, elem: 'rb_sky' }]]), ...T.at(a, b, '사기의 제로 지점 돌파 · 개(改)', 'ice', 'ice', { pose: 'openPalm', pw: 2.0, ult: true })],
    '사기 불꽃 연타': withFx((a, b) => T.melee(a, b, '사기 불꽃 · 연타', 'rb_sky', { prep: 'punchPrep', strike: 'punch', strike2: 'uppercut', n: 5 }), flameBurst('rb_sky')),
    'X 스트림': (a, b) => T.aoe(a, b, 'X 스트림', 'rb_sky', { prep: 'openArms', strike: 'spinKick', spin: 12, rad: 36, pw: 1.7 }),
    '불꽃 추진 · 급강하 펀치': (a, b) => T.aoe(a, b, '불꽃 추진 · 급강하', 'rb_sky', { prep: 'punchPrep', strike: 'seriousPunch', jump: 1, rad: 32, pw: 1.9 }),
    '버닝 액셀': (a, b) => T.ranged(a, b, '버닝 액셀', 'fireball', 'rb_sky', { size: 2.0, v: 320, prep: 'windBack', cast: 'openPalm' }),
  }, { name: '대공의 불꽃', hand: null, elem: 'rb_sky', kind: 'orb', fly: true });

  defChar('reborn', '리본', 'reborn', {
    '사기탄': (a, b) => T.ranged(a, b, '사기탄!', 'arrow', 'rb_sky', { size: .9, v: 700, prep: 'fingerPoint', cast: 'fingerPoint' }),
    '카오스 샷': (a, b) => T.ranged(a, b, '카오스 샷', 'arrow', 'rb_sun', { n: 6, size: 1, v: 520, prep: 'fingerPoint', cast: 'fingerPoint', ult: true, modes: ['hit', 'hit', 'block'] }),
    '레옹 해머': (a, b) => T.melee(a, b, '레옹 · 해머', 'rb_sun', { prep: 'hammerUp', strike: 'hammerDown', n: 1, pw: 1.6 }),
    '태양 불꽃 · 활성': (a, b) => [...seq(a, b, [['crossArms', .4, { aura: 1, elem: 'rb_sun' }]]), ...T.buff(a, b, '태양의 불꽃 · 활성', 'rb_sun', { dur: 4, pose: 'crossArms' })],
    '킥 · 스파르타 교육': (a, b) => T.melee(a, b, '스파르타 교육', 'rb_sun', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 3 }),
    '레옹 권총 · 연사': (a, b) => T.ranged(a, b, '레옹 권총 · 연사', 'arrow', 'metal', { n: 4, size: .7, v: 640, prep: 'fingerPoint', cast: 'fingerPoint' }),
  }, { name: '레옹', hand: null, elem: 'rb_sun', kind: 'arrow' });

  defChar('gokudera', '고쿠데라 하야토', 'reborn', {
    '다이너마이트 · 2배 폭탄': (a, b) => T.ranged(a, b, '2배 폭탄!', 'fireball', 'rb_storm', { n: 4, size: .9, v: 280, prep: 'windBack', cast: 'throw' }),
    '3배 폭탄': (a, b) => T.ranged(a, b, '3배 폭탄!!', 'fireball', 'rb_storm', { n: 6, size: 1, v: 280, prep: 'openArms', cast: 'throw', ult: true }),
    '로켓 봄': (a, b) => T.ranged(a, b, '로켓 봄', 'fireball', 'rb_storm', { n: 3, size: 1.2, v: 380, prep: 'windBack', cast: 'throw', homing: .9 }),
    '플레임 애로우': withFx((a, b) => T.ranged(a, b, '플레임 애로우!', 'beam', 'rb_storm', { size: 2.0, v: 560, prep: 'archer', cast: 'archer', wind: .45, ult: true }), flameBurst('rb_storm')),
    '폭풍 불꽃 · 분해': (a, b) => T.at(a, b, '폭풍의 불꽃 · 분해', 'rb_storm', 'flames', { pose: 'point', pw: 1.5 }),
    '근접 다이너마이트': (a, b) => withFx((x, y) => T.melee(x, y, '근접 폭파', 'rb_storm', { prep: 'punchPrep', strike: 'punch', n: 2 }), (x, y) => pending.push({ t: .3, fn: () => explode(chest(y), 'rb_storm', 1.1) }))(a, b),
  }, { name: '폭풍의 불꽃', hand: null, elem: 'rb_storm', kind: 'fireball' });

  defChar('yamamoto', '야마모토 타케시', 'reborn', {
    '시구레 소엔류 · 시노츠쿠 아메': (a, b) => T.melee(a, b, '시구레 소엔류 · 제8형 시노츠쿠 아메', 'rb_rain', { prep: 'k_waki', strike: 'k_kesa', n: 1, pw: 1.8 }),
    '사카마쿠 아메': (a, b) => T.aoe(a, b, '제7형 · 사카마쿠 아메', 'rb_rain', { prep: 'k_hasso', strike: 'spreadSlash', spin: 10, rad: 30, pw: 1.5 }),
    '우츠시 아메': (a, b) => T.melee(a, b, '제9형 · 우츠시 아메', 'rb_rain', { prep: 'k_chudan', strike: 'k_yoko', strike2: 'k_upCut', n: 3, pw: 1.4 }),
    '아키사메': (a, b) => [...seq(a, b, [['k_jodan', .5, { aura: 1, elem: 'rb_rain' }]]), ...T.aoe(a, b, '공격형 · 아키사메', 'rb_rain', { prep: 'k_jodan', strike: 'swordDown', jump: 1, rad: 44, pw: 2.2, ult: true })],
    '비의 불꽃 · 진정': (a, b) => T.ranged(a, b, '비의 불꽃 · 진정', 'getsuga', 'rb_rain', { size: 1.4, v: 380, prep: 'k_hasso', cast: 'spreadSlash' }),
    '야구 투구 · 강속구': (a, b) => T.ranged(a, b, '강속구!', 'fireball', 'metal', { size: .8, v: 600, prep: 'windBack', cast: 'throw' }),
    '돌진 베기': (a, b) => T.dash(a, b, '돌진 · 베어 가르기', null, 'rb_rain', 1.2, false, { run: 'k_run', hold: 'k_kesa' }),
  }, { name: '비의 불꽃', hand: null, elem: 'rb_rain', kind: 'getsuga' });
  NW.sword('yamamoto', { L: 13, W: .8, c: '#e8f0f8', h: '#1a1a22', g: '#4ab0ff' });

  defChar('hibari', '히바리 쿄야', 'reborn', {
    '톤파 난타': (a, b) => T.melee(a, b, '톤파 난타', 'rb_cloud', { prep: 'punchPrep', strike: 'punch', strike2: 'elbow', n: 6 }),
    '물어 죽인다': (a, b) => [...seq(a, b, [['stare', .4, { aura: 1, elem: 'rb_cloud' }]]), ...T.melee(a, b, '물어 죽여주지', 'rb_cloud', { prep: 'punchPrep', strike: 'uppercut', strike2: 'punch', n: 4, pw: 2.0, ult: true })],
    '구름 고슴도치 · 증식': (a, b) => T.aoe(a, b, '구름 고슴도치 · 증식', 'rb_cloud', { prep: 'openArms', strike: 'openPalm', rad: 42, pw: 1.8 }),
    '톤파 · 쇠사슬': (a, b) => T.ranged(a, b, '톤파 · 쇠사슬', 'arrow', 'rb_cloud', { n: 2, size: 1, v: 400, prep: 'windBack', cast: 'throw' }),
    '돌진 타격': (a, b) => T.dash(a, b, '돌진 타격', null, 'rb_cloud', 1.2, false, { run: 'crouchRun', hold: 'punch' }),
  }, { name: '구름의 불꽃', hand: null, elem: 'rb_cloud', kind: 'orb' });

  defChar('byakuran', '뱌쿠란', 'reborn', {
    '백룡': (a, b) => T.ranged(a, b, '백룡(白龍)', 'beam', 'rb_sky', { size: 2.2, v: 420, prep: 'openArms', cast: 'openPalm', ult: true }),
    '백지공권': (a, b) => withFx((x, y) => T.melee(x, y, '백지공권', 'rb_sky', { prep: 'palm', strike: 'openPalm', n: 1, pw: 1.9 }), flameBurst('rb_sky'))(a, b),
    '하얀 날개 · 강하': (a, b) => T.aoe(a, b, '하얀 날개 · 강하', 'light', { prep: 'openArms', strike: 'hammerDown', jump: 1, rad: 36, pw: 1.8 }),
    '하얀 손가락': (a, b) => T.ranged(a, b, '하얀 손가락', 'arrow', 'light', { n: 3, size: .8, v: 560, prep: 'fingerPoint', cast: 'fingerPoint' }),
    '마시멜로 여유': (a, b) => [...seq(a, b, [['taunt', .4, { aura: 1, elem: 'light' }]]), ...T.buff(a, b, '여유 · 마시멜로', 'light', { dur: 4, pose: 'crossArms' })],
  }, { name: '하얀 날개', hand: null, elem: 'rb_sky', kind: 'orb', fly: true });

  defChar('mukuro', '로쿠도 무쿠로', 'reborn', {
    '제1도 · 지옥도': (a, b) => [...seq(a, b, [['seal', .5, { aura: 1, elem: 'rb_mist' }]]), ...T.aoe(a, b, '제1도 · 지옥도(환술 불기둥)', 'rb_mist', { prep: 'seal', strike: 'openPalm', rad: 46, pw: 2.1, ult: true })],
    '삼지창 연격': (a, b) => T.melee(a, b, '삼지창 연격', 'rb_mist', { prep: 'k_waki', strike: 'k_tsuki', strike2: 'spreadSlash', n: 4 }),
    '환술 · 연꽃': (a, b) => T.at(a, b, '환술 · 연꽃 감옥', 'rb_mist', 'flames', { pose: 'stare', pw: 1.5 }),
    '제4도 · 수라도': (a, b) => T.melee(a, b, '제4도 · 수라도(격투)', 'rb_mist', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 4, pw: 1.3 }),
    '환술 뱀': (a, b) => T.ranged(a, b, '환술 · 뱀', 'arrow', 'rb_mist', { n: 3, size: 1, v: 360, prep: 'openPalm', cast: 'openPalm' }),
  }, { name: '안개의 불꽃', hand: null, elem: 'rb_mist', kind: 'orb' });

  if (window.registerCharAsset) {
    const nami = (x) => Object.assign({ shirt: '#f4f4f0', coat: { c: '#3a3a44', len: 'hip', sleeves: false }, tie: '#c81e2a' }, x); // 나미모리 중학교
    registerCharAsset('tsuna', { body: 'n', cos: nami(), hair: { s: 'spiky', n: 26, L: .9 }, face: 'round', facep: { es: 1.1, ba: .25 } });
    registerCharAsset('reborn', { body: 'n', cos: { coat: { c: '#1a1a22', len: 'hip', sleeves: true, closed: true }, shirt: '#ffe040', tie: '#ff9a1a' }, hair: { s: 'short', n: 14, L: .5 }, face: 'calm', facep: { es: 1.2, ba: .1 } });
    registerCharAsset('gokudera', { body: 'n', cos: nami({ coat: { c: '#3a3a44', len: 'hip', sleeves: true }, tie: '#ff3a3a' }), hair: { s: 'messy', n: 22, L: .8 }, face: 'sharp', facep: { jw: .92, es: .95, ba: .4 } });
    registerCharAsset('yamamoto', { body: 'n', cos: nami({ tie: '#4ab0ff' }), hair: { s: 'short', n: 18, L: .55 }, face: 'calm', facep: { es: 1.0, ba: .1 } });
    registerCharAsset('hibari', { body: 'n', cos: { coat: { c: '#1a1a22', len: 'thigh', sleeves: true }, shirt: '#f4f4f0', band: '#c81e2a' }, hair: { s: 'short', n: 18, L: .7 }, face: 'sharp', facep: { jw: .9, es: .88, ba: .45 } });
    registerCharAsset('byakuran', { body: 'n', cos: { coat: { c: '#f4f4f8', len: 'thigh', sleeves: true }, shirt: '#e8e8ee' }, hair: { s: 'spiky', n: 24, L: .8 }, face: 'calm', facep: { es: .95, ba: .05 } });
    registerCharAsset('mukuro', { body: 'n', cos: { coat: { c: '#2a3a2a', len: 'knee', sleeves: true }, shirt: '#1a1a22' }, hair: { s: 'pony', n: 18, L: .9 }, face: 'sharp', facep: { jw: .9, es: 1.0, ba: .3 } });
  }
  NW.finish({ reborn: { lunge: 1.7, kb: 1.15, hs: 1.08, combo: .32 } }, { tsuna: { lunge: 2.1, kb: 1.35 }, hibari: { combo: .5, kb: 1.25 }, byakuran: { lunge: 2.0, kb: 1.4 }, gokudera: { lunge: 1.2 } });
})();
