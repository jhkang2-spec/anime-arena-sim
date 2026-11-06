// 인물별 원작 기술 추가(11-05 소유자: "스킬의 종류와 가짓수를 더 늘려줘, 단조로워")
// 인물마다 9개 → 12~16개. 근접·원거리·광역·하늘·대상 지정·돌진·늘이기 템플릿(T.*)을 섞어 종류를 다양하게,
// 원소(ELEM)·투사체 종류·자세·궤적·타수·크기를 기술마다 다르게 해 fx3 계열 연출(리본 검기·에너지 구·화염·충격 고리)이 서로 다르게 붙는다.
(function () {
  if (typeof CH === 'undefined' || typeof T === 'undefined') return;
  const M = (nm, ek, op = {}) => (a, b) => [...seq(a, b, [[op.pre || 'punchPrep', .22, { aura: 1, elem: ek }]]), ...T.melee(a, b, nm, ek, { prep: op.pre || 'punchPrep', ...op })];
  const SW = (nm, ek, op = {}) => (a, b) => [...seq(a, b, [[op.pre || 'swordLevel', .26, { aura: 1, elem: ek }]]), ...T.melee(a, b, nm, ek, { prep: op.pre || 'swordLevel', strike: 'swordDown', arc: [-2.2, 1.0, 26], arcW: 7, ...op })];
  const RG = (nm, kind, ek, op = {}) => (a, b) => T.ranged(a, b, nm, kind, ek, op);
  const AO = (nm, ek, op = {}) => (a, b) => T.aoe(a, b, nm, ek, op);
  const SK = (nm, ek, op = {}) => (a, b) => T.sky(a, b, nm, ek, op);
  const AT = (nm, ek, kind, op = {}) => (a, b) => T.at(a, b, nm, ek, kind, op);
  const DS = (nm, ek, size = 1, ult = false, op = {}) => (a, b) => T.dash(a, b, nm, null, ek, size, ult, op);
  const ST = (nm, op = {}) => (a, b) => T.stretch(a, b, nm, op);
  const ADD = {
    naruto: {
      '우즈마키 나루토 연탄': M('나루토 연탄', 'kurama', { n: 5, strike: 'kick', strike2: 'highKick', pre: 'seal' }),
      '나선연환': DS('나선연환', 'wind', 1.4),
      '혹성나선환': RG('선술 · 혹성나선환', 'orb', 'wind', { n: 4, size: .8, v: 260, prep: 'seal', cast: 'twoHand' }),
      '선술 · 대옥나선연환': DS('선술 · 대옥나선연환', 'kurama', 2.2, true, { run: 'crouchRun' }),
      '쿠나이 투척': RG('쿠나이 투척', 'arrow', 'metal', { n: 3, size: .6, v: 420, prep: 'punchPrep', cast: 'throw' }),
      '구미 차크라 팔': RG('구미 · 차크라 팔', 'orb', 'kurama', { size: 1.6, v: 300, prep: 'armsWide', cast: 'palm' }),
    },
    sasuke: {
      '화둔 · 호룡화의 술': RG('화둔 · 호룡화의 술', 'fireball', 'fire', { n: 5, size: 1.1, v: 230, prep: 'mouthSeal', cast: 'blow', from: fromHigh }),
      '치도리 류': AO('치도리 류', 'bolt', { rad: 32, pw: 1.4, prep: 'chidori', strike: 'duck' }),
      '쿠사나기 · 치도리 도': SW('쿠사나기 · 치도리 도', 'bolt', { pre: 'iai', strike: 'iaiEnd', arc: [-.5, .5, 30], n: 2 }),
      '풍마수리검': RG('풍마수리검', 'rasenshuriken', 'metal', { size: .9, v: 330, prep: 'windBack', cast: 'throw' }),
      '사륜안 환술': AT('사륜안 · 환술', 'dark', 'vortex', { pose: 'eyeHand' }),
    },
    kakashi: {
      '뇌둔 · 뇌수추적아': DS('뇌둔 · 뇌수추적아', 'bolt', 1.3),
      '화둔 · 호화구의 술': RG('화둔 · 호화구의 술', 'fireball', 'fire', { size: 1.6, v: 220, prep: 'mouthSeal', cast: 'blow' }),
      '분신 대폭파': AO('그림자 분신 대폭파', 'fire', { rad: 40, pw: 1.6, prep: 'seal' }),
      '토둔 · 추아의 술': AO('토둔 · 추아의 술', 'earth', { rad: 30, pw: 1.2, prep: 'hammerDown', strike: 'duck' }),
      '쿠나이 연격': M('쿠나이 연격', 'metal', { n: 3, strike: 'punch', strike2: 'palm' }),
    },
    sakura: {
      '차크라 메스': M('차크라 메스', 'light', { n: 2, strike: 'palm', pre: 'openPalm' }),
      '괴력 · 대지 분쇄': AO('괴력 · 대지 분쇄', 'earth', { rad: 48, pw: 2, jump: true, prep: 'flipAir', strike: 'hammerDown' }),
      '체술 연격': M('체술 연격', 'power', { n: 4, strike: 'punch', strike2: 'kick' }),
      '부적 폭탄 쿠나이': RG('부적 폭탄 쿠나이', 'arrow', 'fire', { n: 2, size: .7, v: 380, cast: 'throw' }),
      '백호인 · 백호호권': AO('백호인 · 백호호권', 'power', { rad: 52, pw: 2.2, ult: true, prep: 'windBack', strike: 'punch' }),
    },
    luffy: {
      '고무고무 엘레펀트 건': ST('기어 서드 · 고무고무 엘레펀트 건', { giant: 1.4, ult: true, ek: 'dark' }),
      '고무고무 도끼': AO('고무고무 도끼', 'power', { rad: 30, pw: 1.5, jump: true, prep: 'highKick', strike: 'axe' }),
      '고무고무 로켓': DS('고무고무 로켓', 'power', 1.2),
      '고무고무 제트 개틀링': ST('기어 세컨드 · 고무고무 제트 개틀링', { n: 8, ek: 'steam' }),
      '고무고무 제트 스탬프': ST('고무고무 제트 스탬프', { ek: 'steam' }),
      '패왕색 패기': AO('패왕색 패기', 'dark', { rad: 60, pw: 1.2, prep: 'stare', strike: 'stance' }),
    },
    zoro: {
      '삼도류 · 호랑이 사냥': SW('삼도류 · 호랑이 사냥', 'slash', { pre: 'xSwords', strike: 'swordDown', arc: [-2.5, .6, 30], arcW: 9 }),
      '삼십육 번뇌봉': RG('일도류 · 삼십육 번뇌봉', 'getsuga', 'slash', { size: 1.2, v: 360, prep: 'swordLevel', cast: 'iaiEnd' }),
      '이도류 · 매의 파도': AO('이도류 · 매의 파도', 'wind', { rad: 44, pw: 1.4, spin: 14, prep: 'spreadSlash', strike: 'spreadSlash' }),
      '구산팔해 · 일세계': SW('구산팔해 · 일세계', 'slash', { pre: 'iai', strike: 'iaiEnd', arc: [-.6, .6, 40], arcW: 12, pw: 2, ult: true }),
      '이도류 · 라쇼몽': SW('이도류 · 라쇼몽', 'slash', { pre: 'twoHandSword', strike: 'swordDown', arc: [-2.8, 1.2, 36], arcW: 10 }),
    },
    sanji: {
      '무통 숏': M('무통 숏', 'fire', { strike: 'highKick', pre: 'kickPrep' }),
      '에폴 숏': M('에폴 숏', 'fire', { strike: 'kick', pre: 'kickPrep', n: 2 }),
      '프와트린 숏': M('프와트린 숏', 'fire', { strike: 'spinKick', pre: 'handstand' }),
      '지옥의 기억': AO('지옥의 기억', 'fire', { rad: 54, pw: 2.2, ult: true, spin: 16, prep: 'spinKick', strike: 'spinKick' }),
    },
    ichigo: {
      '월아십자충': RG('월아십자충', 'getsuga', 'getsuga', { n: 2, size: 1.4, v: 340, prep: 'twoHandSword', cast: 'spreadSlash' }),
      '허섬': RG('허섬', 'orb', 'hollow', { size: 1.8, v: 300, prep: 'maskPull', cast: 'openPalm', ult: true }),
      '순보 연격': SW('순보 연격', 'getsuga', { n: 4, strike: 'swordDown', strike2: 'iaiEnd', pre: 'swordLevel' }),
      '참월 돌진': DS('참월 돌진', 'getsuga', 1.4, false, { run: 'crouchRun' }),
    },
    byakuya: {
      '천본앵 · 섬경': SW('종경 · 천본앵 섬경', 'petal', { pre: 'swordDown', strike: 'spreadSlash', arc: [-3, 3, 34], arcW: 9, ult: true }),
      '천본앵 · 호경': AO('천본앵 · 호경', 'petal', { rad: 50, pw: 1.8, prep: 'openPalm', strike: 'stance' }),
      '순보 · 섬화': SW('순보 · 섬화', 'light', { pre: 'iai', strike: 'iaiEnd', arc: [-.4, .4, 24] }),
      '파도 · 뇌후포': RG('파도 · 뇌후포', 'orb', 'bolt', { size: 1.5, v: 280, prep: 'openPalm', cast: 'twoHand' }),
    },
    rukia: {
      '파도 · 쌍련창화추': RG('파도 · 쌍련창화추', 'fireball', 'ice', { n: 2, size: 1.3, v: 260, prep: 'twoHand', cast: 'openPalm' }),
      '파도 · 백뢰': RG('파도 · 백뢰', 'arrow', 'light', { size: .8, v: 460, prep: 'fingerPoint', cast: 'fingerPoint' }),
      '순보 회전 베기': SW('순보 회전 베기', 'ice', { pre: 'swordLevel', strike: 'spreadSlash', spin: 12, arc: [-3, 3, 26] }),
    },
    saitama: {
      '진지한 재채기': AO('진지한 재채기', 'power', { rad: 70, pw: 2.4, ult: true, prep: 'seriousWind', strike: 'stance' }),
      '진지한 점프 낙하': AO('진지한 점프 낙하', 'earth', { rad: 46, pw: 2, jump: true, prep: 'flipAir', strike: 'hammerDown' }),
      '보통 걸어차기': M('보통 걸어차기', 'power', { strike: 'kick', pre: 'stance' }),
    },
    genos: {
      '기관총 블로': M('기관총 블로', 'fire', { n: 8, strike: 'punch', strike2: 'punchL' }),
      '팔꿈치 부스터 펀치': DS('팔꿈치 부스터 펀치', 'fire', 1.2),
      '방사 소각': AO('방사 소각', 'fire', { rad: 42, pw: 1.6, prep: 'armsWide', strike: 'openArms' }),
    },
    gaara: {
      '유사 폭류': AO('유사 폭류', 'sand', { rad: 56, pw: 1.8, prep: 'skyRaise', strike: 'hammerDown', ult: true }),
      '모래 분신': RG('모래 분신', 'orb', 'sand', { n: 2, size: 1.1, v: 200, prep: 'seal', cast: 'point' }),
      '모래 방패 돌진': DS('모래 방패 돌진', 'sand', 1.3),
    },
    itachi: {
      '수사노오 · 야사카니 곡옥': RG('수사노오 · 야사카니 곡옥', 'orb', 'dark', { n: 3, size: 1.2, v: 300, prep: 'openArms', cast: 'twoHand' }),
      '이자나미': AT('이자나미', 'dark', 'vortex', { pose: 'eyeHand', ult: true }),
      '까마귀 환술': AT('까마귀 환술', 'dark', 'petals', { pose: 'stare' }),
    },
    gai: {
      '저녁 코끼리': M('팔문둔갑 · 저녁 코끼리', 'steam', { n: 5, strike: 'punch', strike2: 'punchL', pre: 'braced', ult: true }),
      '나뭇잎 열풍': M('나뭇잎 열풍', 'wind', { strike: 'spinKick', pre: 'kickPrep' }),
      '나뭇잎 승풍': M('나뭇잎 승풍', 'wind', { strike: 'highKick', pre: 'kickPrep' }),
    },
    ace: {
      '화주': AO('화주', 'fire', { rad: 30, pw: 1.4, prep: 'skyRaise', strike: 'stance' }),
      '양염': AO('양염', 'fire', { rad: 38, pw: 1.4, spin: 10, prep: 'armsWide', strike: 'openArms' }),
      '화탄': RG('화탄', 'fireball', 'fire', { n: 6, size: .6, v: 380, prep: 'fingerPoint', cast: 'fingerPoint' }),
    },
    kizaru: {
      '빛 탄환 연사': RG('빛 탄환 연사', 'arrow', 'light', { n: 6, size: .6, v: 520, prep: 'fingerPoint', cast: 'fingerPoint' }),
      '광속 돌진 차기': DS('광속 돌진 차기', 'light', 1.3),
      '손끝 광선': RG('손끝 광선', 'arrow', 'light', { size: 1.4, v: 600, prep: 'fingerPoint', cast: 'fingerPoint' }),
    },
    law: {
      '앰퓨테이트': SW('앰퓨테이트', 'room', { pre: 'iai', strike: 'iaiEnd', arc: [-.5, .5, 30] }),
      '퍼니쳐 빌레': RG('퍼니쳐 빌레', 'arrow', 'room', { size: 2, v: 420, prep: 'swordLevel', cast: 'iaiEnd', ult: true }),
      '쇼크 빌레': AO('쇼크 빌레', 'bolt', { rad: 34, pw: 1.6, prep: 'palm', strike: 'palm' }),
    },
    hitsugaya: {
      '천년빙뢰': AT('천년빙뢰', 'ice', 'ice', { pose: 'skyRaise', ult: true, pw: 1.8 }),
      '빙룡선미': SW('빙룡선미', 'ice', { pre: 'swordLevel', strike: 'spreadSlash', arc: [-2.8, 2.8, 30], arcW: 9 }),
      '빙룡 돌진': DS('빙룡 돌진', 'ice', 1.5),
    },
    kenpachi: {
      '안대 해제': AO('안대 해제 · 영압 방출', 'power', { rad: 50, pw: 1.4, prep: 'maskPull', strike: 'stance' }),
      '방울 소리 돌격': DS('방울 소리 돌격', 'power', 1.4),
      '양손 내려베기': SW('양손 내려베기', 'power', { pre: 'twoHandSword', strike: 'swordDown', arc: [-2.6, 1.3, 40], arcW: 12, pw: 1.8 }),
    },
    aizen: {
      '파도 · 창화추': RG('파도 · 창화추', 'fireball', 'light', { size: 1.4, v: 280, prep: 'openPalm', cast: 'openPalm' }),
      '파도 · 뇌후포': RG('파도 · 뇌후포', 'orb', 'bolt', { size: 1.6, v: 280, prep: 'twoHand', cast: 'twoHand' }),
      '파도 · 쌍련창화추': RG('파도 · 쌍련창화추', 'fireball', 'light', { n: 2, size: 1.3, v: 260, prep: 'twoHand', cast: 'openPalm' }),
    },
    tatsumaki: {
      '염동 · 운석 낙하': SK('염동 · 운석 낙하', 'psychic', { ult: true, w: 26 }),
      '염동 · 지면 들어올리기': AO('염동 · 지면 들어올리기', 'earth', { rad: 46, pw: 1.6, prep: 'skyRaise', strike: 'hammerDown' }),
      '염동 · 파편 비': RG('염동 · 파편 비', 'orb', 'psychic', { n: 8, size: .6, v: 320, prep: 'skyRaise', cast: 'point', from: fromHigh }),
    },
    bang: {
      '흐르는 손바닥 연타': M('유수암쇄권 · 흐르는 손바닥', 'water', { n: 6, strike: 'palm', pre: 'openPalm' }),
      '암쇄 · 만연파': AO('암쇄 · 만연파', 'water', { rad: 40, pw: 1.6, prep: 'braced', strike: 'palm' }),
      '회오리 받아치기': M('유수 · 회오리 받아치기', 'water', { strike: 'spinKick', pre: 'guard', spin: 10 }),
    },
    garou: {
      '격류 선풍 받아치기': M('격류 · 선풍 받아치기', 'water', { strike: 'spinKick', pre: 'guard', spin: 12 }),
      '무술 사냥 연타': M('무술 사냥 · 연타', 'dark', { n: 6, strike: 'punch', strike2: 'kick' }),
      '무술 사냥 돌진': DS('무술 사냥 돌진', 'dark', 1.3),
    },
    tanjiro: {
      '물의 호흡 제4형 · 타격의 물결': KM('swordLevel', '물의 호흡 제4형 · 타격의 물결', 'water', { n: 3, strike: 'spreadSlash', arc: [-2.6, 2.6, 26] }),
      '물의 호흡 제5형 · 마른 비': KM('iai', '물의 호흡 제5형 · 마른 비', 'water', { strike: 'iaiEnd', arc: [-.4, .4, 22] }),
      '물의 호흡 제6형 · 소용돌이': (a, b) => T.aoe(a, b, '물의 호흡 제6형 · 소용돌이', 'water', { rad: 38, pw: 1.4, spin: 16, prep: 'spreadSlash', strike: 'spreadSlash' }),
      '물의 호흡 제7형 · 물방울 파문 찌르기': KM('swordLevel', '물의 호흡 제7형 · 물방울 파문 찌르기', 'water', { strike: 'iaiEnd', arc: [-.2, .2, 34], arcW: 4 }),
      '히노카미 카구라 · 염무': KM('swordLevel', '히노카미 카구라 · 염무', 'sun', { n: 2, strike: 'swordDown', strike2: 'spreadSlash', arc: [-2.6, 1.2, 30], arcW: 9 }),
      '히노카미 카구라 · 화차': KM('twoHandSword', '히노카미 카구라 · 화차', 'sun', { strike: 'swordDown', spin: 14, arc: [-3.1, 3.1, 30], arcW: 10 }),
      '히노카미 카구라 · 양화돌': KM('swordLevel', '히노카미 카구라 · 양화돌', 'sun', { strike: 'iaiEnd', arc: [-.3, .3, 36], arcW: 8, ult: true }),
    },
    nezuko: {
      '폭혈 · 대폭발': AO('혈귀술 · 폭혈 대폭발', 'blood', { rad: 50, pw: 2, ult: true, prep: 'armsWide', strike: 'stance' }),
      '혈귀 도약 차기': M('혈귀 도약 차기', 'blood', { strike: 'highKick', pre: 'flipAir' }),
      '피 손톱 할퀴기': M('피 손톱 할퀴기', 'blood', { n: 3, strike: 'palm', pre: 'crouchRun' }),
    },
    zenitsu: {
      '천둥 낙하 일섬': SK('천둥 낙하 일섬', 'bolt', { w: 18 }),
      '전격 발도술': KM('iai', '번개의 호흡 · 전격 발도', 'bolt', { strike: 'iaiEnd', arc: [-.5, .5, 30], arcW: 6 }),
      '번개 삼연 일섬': KM('iai', '벽력일섬 · 삼연', 'bolt', { n: 3, strike: 'iaiEnd', arc: [-.5, .5, 26] }),
    },
    inosuke: {
      '짐승의 호흡 · 저미기': KM('xSwords', '짐승의 호흡 · 저미기', 'slash', { n: 4, strike: 'spreadSlash', strike2: 'swordDown' }),
      '쌍검 회전 던지기': RG('짐승의 호흡 · 쌍검 회전 던지기', 'getsuga', 'slash', { n: 2, size: .9, v: 360, prep: 'xSwords', cast: 'throw' }),
      '멧돼지 돌진': DS('멧돼지 돌진', 'power', 1.4, false, { run: 'crouchRun' }),
    },
    giyu: {
      '물의 호흡 제5형 · 마른 비': KM('iai', '물의 호흡 제5형 · 마른 비', 'water', { strike: 'iaiEnd', arc: [-.4, .4, 22] }),
      '물의 호흡 제10형 · 생생유전': KM('swordLevel', '물의 호흡 제10형 · 생생유전', 'water', { n: 4, strike: 'spreadSlash', spin: 12, arc: [-3, 3, 30], arcW: 9, ult: true }),
      '물의 호흡 · 횡수차': KM('swordLevel', '물의 호흡 · 횡수차', 'water', { strike: 'spreadSlash', spin: 16, arc: [-3, 3, 28] }),
    },
    rengoku: {
      '부지화 연격': KM('swordLevel', '불꽃의 호흡 · 부지화 연격', 'fire', { n: 3, strike: 'iaiEnd', arc: [-.5, .5, 30] }),
      '염호 돌진': (a, b) => T.dash(a, b, '불꽃의 호흡 · 염호 돌진', null, 'fire', 1.6, false, { run: 'crouchRun' }),
      '하오리 회전 베기': KM('twoHandSword', '불꽃 하오리 회전 베기', 'fire', { strike: 'spreadSlash', spin: 14, arc: [-3, 3, 30], arcW: 10 }),
    },
    shinobu: {
      '등꽃 독 주입': KM('swordLevel', '등꽃 독 주입', 'insect', { strike: 'iaiEnd', arc: [-.15, .15, 30], arcW: 3 }),
      '나비 반격 찌르기': KM('iai', '나비의 춤 · 반격 찌르기', 'insect', { n: 2, strike: 'iaiEnd', arc: [-.2, .2, 28], arcW: 3 }),
      '벌의 침 · 진곡 연격': KM('swordLevel', '벌의 침 · 진곡 연격', 'insect', { n: 4, strike: 'iaiEnd', arc: [-.2, .2, 28], arcW: 3 }),
    },
    uzui: {
      '쇠사슬 쌍검 투척': RG('쇠사슬 쌍검 투척', 'getsuga', 'sound', { n: 2, size: 1.1, v: 320, prep: 'xSwords', cast: 'throw' }),
      '화려한 폭렬 연참': KM('xSwords', '화려한 폭렬 연참', 'sound', { n: 4, strike: 'spreadSlash', strike2: 'swordDown' }),
      '음률 폭음': AO('소리의 호흡 · 음률 폭음', 'sound', { rad: 44, pw: 1.6, prep: 'xSwords', strike: 'duck' }),
    },
    mitsuri: {
      '채찍검 휘감기': KM('swordLevel', '사랑의 호흡 · 채찍검 휘감기', 'petal', { strike: 'spreadSlash', spin: 18, arc: [-3, 3, 34], arcW: 6 }),
      '연격 난무': KM('swordLevel', '사랑의 호흡 · 연격 난무', 'petal', { n: 5, strike: 'spreadSlash', strike2: 'swordDown' }),
      '하트 회오리 베기': (a, b) => T.aoe(a, b, '사랑의 호흡 · 하트 회오리', 'petal', { rad: 40, pw: 1.4, spin: 16, prep: 'spreadSlash', strike: 'spreadSlash' }),
    },
    muichiro: {
      '안개 순보 베기': KM('iai', '안개의 호흡 · 순보 베기', 'mist', { strike: 'iaiEnd', arc: [-.5, .5, 28] }),
      '안개 찌르기 연격': KM('swordLevel', '안개의 호흡 · 찌르기 연격', 'mist', { n: 4, strike: 'iaiEnd', arc: [-.2, .2, 26], arcW: 4 }),
      '안개 휘감기 일섬': KM('swordLevel', '안개의 호흡 · 휘감기 일섬', 'mist', { strike: 'spreadSlash', spin: 12, arc: [-3, 3, 28] }),
    },
    sanemi: {
      '제5형 · 목초 강풍': KM('swordLevel', '바람의 호흡 제5형 · 목초 강풍', 'wind', { strike: 'swordDown', arc: [-2.6, 1.2, 34], arcW: 10 }),
      '바람 칼날 투척': RG('바람의 호흡 · 바람 칼날', 'getsuga', 'wind', { n: 3, size: .9, v: 380, prep: 'swordLevel', cast: 'spreadSlash' }),
      '바람 회오리 연참': (a, b) => T.aoe(a, b, '바람의 호흡 · 회오리 연참', 'wind', { rad: 42, pw: 1.5, spin: 18, prep: 'spreadSlash', strike: 'spreadSlash' }),
    },
    obanai: {
      '뱀 칼날 곡선 찌르기': KM('swordLevel', '뱀의 호흡 · 곡선 찌르기', 'insect', { strike: 'iaiEnd', arc: [-.6, .2, 30], arcW: 4 }),
      '카부라마루 협공': KM('iai', '카부라마루 협공', 'insect', { n: 3, strike: 'iaiEnd', strike2: 'swordDown' }),
      '뱀 회오리 베기': (a, b) => T.aoe(a, b, '뱀의 호흡 · 회오리 베기', 'insect', { rad: 36, pw: 1.3, spin: 14, prep: 'spreadSlash', strike: 'spreadSlash' }),
    },
    himejima: {
      '철구 회전 연타': (a, b) => T.aoe(a, b, '바위의 호흡 · 철구 회전 연타', 'earth', { rad: 46, pw: 1.8, spin: 16, prep: 'hammerUp', strike: 'hammerDown' }),
      '도끼 투척': RG('바위의 호흡 · 도끼 투척', 'getsuga', 'earth', { size: 1.4, v: 300, prep: 'hammerUp', cast: 'throw' }),
      '바위 내려찍기 지진': AO('바위의 호흡 · 대지 내려찍기', 'earth', { rad: 56, pw: 2.2, jump: true, prep: 'hammerUp', strike: 'hammerDown', ult: true }),
    },
  };
  let added = 0;
  for (const key in ADD) { const c = CH[key]; if (!c) continue; for (const nm in ADD[key]) { if (!c.skills[nm]) { c.skills[nm] = ADD[key][nm]; added++; } } }
  window.SKILLS_MORE = { added, counts: () => Object.fromEntries(Object.values(CH).map(c => [c.key, Object.keys(c.skills).length])) };
})();
