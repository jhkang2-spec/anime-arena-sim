// 인물별 원작 기술 2차 추가(11-05 소유자: "객체당 기술 가짓수를 10개 이상 늘려줘, 더 다양하게")
// 49명 각 10개 이상. 원작 이름·연출, 근접·원거리·광역·이동기·잡기·연계·버프·카운터를 고루, 원거리 비중을 넉넉히(약 40%).
// 규칙: 기술당 주 이펙트 1개(템플릿 하나) · 인물별 허용 속성만(ALLOW, 첫 값이 기본) — window.CHAR_ELEM_ALLOW 로 내보내 이펙트 필터가 쓸 수 있게.
// 상태 효과(가속·강화·둔화…)는 tactics.js 의 이름·속성 규칙(TX.tagsOf)으로 자동 — 그래서 원작 이름과 속성을 정확히 단다.
(function () {
  if (typeof CH === 'undefined' || typeof T === 'undefined') return;
  const ALLOW = {
    naruto: ['wind', 'kurama', 'metal'], sasuke: ['bolt', 'fire', 'dark', 'metal'], kakashi: ['bolt', 'water', 'earth', 'fire', 'dark', 'metal'], sakura: ['earth', 'power', 'light', 'metal'],
    luffy: ['power', 'metal', 'steam', 'dark'], zoro: ['slash', 'wind', 'dark'], sanji: ['fire', 'power'], ichigo: ['getsuga', 'hollow'], byakuya: ['petal', 'light', 'bolt'], rukia: ['ice', 'light'],
    saitama: ['power'], genos: ['fire', 'metal'], gaara: ['sand'], itachi: ['fire', 'dark', 'water'], gai: ['wind', 'steam', 'power'], ace: ['fire'], kizaru: ['light'], law: ['room', 'bolt'],
    hitsugaya: ['ice'], kenpachi: ['power', 'slash'], aizen: ['dark', 'light', 'bolt'], tatsumaki: ['psychic', 'earth'], bang: ['water', 'power'], garou: ['dark', 'water', 'power'],
    tanjiro: ['water', 'sun'], nezuko: ['blood'], zenitsu: ['bolt'], inosuke: ['slash', 'power'], giyu: ['water'], rengoku: ['fire'], shinobu: ['insect'], uzui: ['sound'], mitsuri: ['petal'],
    muichiro: ['mist'], sanemi: ['wind'], obanai: ['slash', 'insect'], himejima: ['earth', 'metal'],
    eren: ['odm', 'titan', 'harden', 'vapor', 'spear', 'power'], mikasa: ['odm', 'spear', 'power', 'vapor'], levi: ['odm', 'spear', 'power', 'vapor'], armin: ['vapor', 'titan', 'odm', 'spear'],
    reiner: ['harden', 'titan', 'power', 'vapor'], annie: ['power', 'harden', 'titan'], yuji: ['cursed', 'bflash', 'blood'], megumi: ['shadow2', 'cursed'], nobara: ['nail', 'cursed', 'bflash'],
    gojo: ['ao', 'aka', 'murasaki', 'cursed', 'bflash'], sukuna: ['shrine', 'fire', 'cursed', 'bflash'], nanami: ['cursed', 'bflash'],
  };
  window.CHAR_ELEM_ALLOW = Object.assign(window.CHAR_ELEM_ALLOW || {}, ALLOW);
  const ok = (key, ek) => { const L = ALLOW[key]; return !L || L.includes(ek) ? ek : L[0]; };
  // 순수 근접 캐릭터(원작에서 원거리 투사체가 없는 이들): 'r:' 코드를 무기 계열 근접 코드로 변환 — 원거리 커팅 금지
  const MELEE_ONLY = { tanjiro: 's', zenitsu: 'i', giyu: 's', rengoku: 's', shinobu: 'i', uzui: 's', mitsuri: 'w', muichiro: 'i', sanemi: 's', obanai: 'w', himejima: 't2', inosuke: 'w', nezuko: 'k', sanji: 'k', kenpachi: 't2', luffy: 'm' };
  // 코드 → 템플릿 하나(주 이펙트 1개). o: 추가 옵션
  const P = { punch: ['punchPrep', 'punch'], kick: ['kickPrep', 'highKick'], sword: ['swordLevel', 'swordDown'], iai: ['iai', 'iaiEnd'], spin: ['spreadSlash', 'spreadSlash'], two: ['twoHandSword', 'swordDown'], palm: ['openPalm', 'palm'], grab: ['crouchRun', 'palm'], counter: ['guard', 'punch'] };
  function build(key, nm, code, ek0, o = {}) {
    const ek = ok(key, ek0);
    if (MELEE_ONLY[key] && code.indexOf('r:') === 0) { code = MELEE_ONLY[key]; if (code === 'i') o = Object.assign({ arc: [-.3, .3, 32] }, o); if (code === 's') o = Object.assign({ arc: [-2.2, 1, 30] }, o); }
    const [c, arg] = code.split(':');
    const ult = !!o.u;
    switch (c) {
      case 'm': case 'k': case 's': case 'i': case 'w': case 't2': case 'p': case 'g': case 'c': {
        const pk = { m: 'punch', k: 'kick', s: 'sword', i: 'iai', w: 'spin', t2: 'two', p: 'palm', g: 'grab', c: 'counter' }[c], [pre, strike] = P[pk];
        const sw = /sword|iai|spin|two/.test(pk), arc = o.arc || (pk === 'iai' ? [-.5, .5, 28] : pk === 'spin' ? [-3, 3, 30] : pk === 'two' ? [-2.6, 1.3, 36] : pk === 'sword' ? [-2.2, 1.0, 28] : null);
        const op = { prep: o.pre || pre, strike: o.st || strike, n: o.n || 1, ult, spin: o.spin || (pk === 'spin' ? 14 : 0), reach: o.reach };
        if (sw) Object.assign(op, { arc, arcW: o.arcW || (pk === 'two' ? 11 : 7) });
        if (o.st2) op.strike2 = o.st2;
        return (a, b) => [...seq(a, b, [[op.prep, c === 'c' ? .34 : .22, { aura: 1, elem: ek }]]), ...T.melee(a, b, nm, ek, op)];
      }
      case 'r': return (a, b) => T.ranged(a, b, nm, arg || 'orb', ek, { n: o.n || 1, size: o.size || 1, v: o.v || 280, prep: o.pre || 'seal', cast: o.cast || 'throw', ult, from: o.high ? fromHigh : undefined });
      case 'a': return (a, b) => T.aoe(a, b, nm, ek, { rad: o.rad || 40, pw: o.pw || 1.5, jump: !!o.jump, spin: o.spin || 0, prep: o.pre || 'axe', strike: o.st || 'duck', ult });
      case 'y': return (a, b) => T.sky(a, b, nm, ek, { ult, w: o.w || 22 });
      case 'at': return (a, b) => T.at(a, b, nm, ek, arg || 'vortex', { pose: o.pre || 'stare', ult, pw: o.pw });
      case 'd': return (a, b) => T.dash(a, b, nm, null, ek, o.size || 1.3, ult, { run: o.run || 'crouchRun' });
      case 'x': return (a, b) => T.stretch(a, b, nm, { n: o.n || 1, giant: o.giant || 0, ek, ult });
    }
    return null;
  }
  // [이름, 코드, 속성, 옵션] — 코드: m 주먹·k 발차기·s 검·i 발도·w 회전 베기·t2 양손 내려베기·p 장타·g 잡기·c 카운터 / r:종류 원거리 / a 광역 / y 하늘 / at:종류 대상 지정 / d 돌진 / x 늘이기
  const L = {
    naruto: [['풍둔 · 열풍장', 'r:arrow', 'wind', { size: 1.4, v: 360, cast: 'palm' }], ['나선구', 'r:orb', 'wind', { size: 1.1, v: 300 }], ['구미 · 미니 미수옥', 'r:bijuu', 'kurama', { size: .8, v: 360, cast: 'blow' }],
      ['그림자 분신 · 쿠나이 난사', 'r:arrow', 'metal', { n: 6, size: .5, v: 440 }], ['선술 · 나선수리검 투척', 'r:rasenshuriken', 'wind', { size: 1.2, v: 300, u: 1 }], ['풍둔 · 대돌파', 'a', 'wind', { rad: 50, pre: 'mouthSeal', st: 'blow' }],
      ['구미 · 꼬리 휘두르기', 'a', 'kurama', { rad: 44, spin: 14 }], ['나선 다연환', 'd', 'kurama', { size: 1.5 }], ['선술 · 개구리 권법', 'm', 'wind', { n: 3 }], ['나루토 이천 연탄', 'k', 'kurama', { n: 6 }], ['그림자 분신 · 바꿔치기 반격', 'c', 'metal']],
    sasuke: [['화둔 · 호봉선화의 술', 'r:fireball', 'fire', { n: 6, size: .6, v: 320, pre: 'mouthSeal', cast: 'blow' }], ['화둔 · 용화의 술', 'r:fireball', 'fire', { size: 1.4, v: 300, pre: 'mouthSeal', cast: 'blow' }], ['조풍쌍 · 와이어 수리검', 'r:arrow', 'metal', { n: 4, size: .6, v: 420 }],
      ['스사노오 · 화살 연사', 'r:arrow', 'dark', { n: 3, size: 1.3, v: 420, pre: 'archer', cast: 'archer' }], ['윤회안 · 천손', 'd', 'dark', { size: 1.2 }], ['사륜안 · 환술 반사', 'at:vortex', 'dark', { pre: 'eyeHand' }],
      ['쿠사나기 연격', 's', 'metal', { n: 3 }], ['쿠사나기 · 치도리 찌르기', 'i', 'bolt', { arc: [-.2, .2, 32] }], ['스사노오 · 칼 휘두르기', 't2', 'dark'], ['완성체 스사노오 · 참격', 't2', 'dark', { u: 1, arc: [-3, 1.4, 50], arcW: 16 }], ['스사노오 · 늑골 방어', 'c', 'dark']],
    kakashi: [['수둔 · 대폭포의 술', 'a', 'water', { rad: 52, pre: 'seal', st: 'openArms' }], ['수둔 · 수진벽', 'a', 'water', { rad: 30, pre: 'mouthSeal', st: 'blow' }], ['수둔 · 수포탄', 'r:orb', 'water', { n: 3, size: .8, v: 300, pre: 'mouthSeal', cast: 'blow' }],
      ['사륜안 · 복사 인술', 'r:fireball', 'fire', { size: 1.3, v: 280 }], ['쿠나이 와이어 함정', 'r:arrow', 'metal', { n: 3, size: .6, v: 420 }], ['카무이 라이키리', 'd', 'bolt', { size: 1.6, u: 1 }],
      ['라이키리 이연', 'm', 'bolt', { n: 2, pre: 'chidori', st: 'palm' }], ['그림자 분신 · 기습', 'm', 'metal', { n: 3 }], ['바꿔치기 · 반격', 'c', 'metal'], ['뇌둔 · 뇌수추적아 이연', 'r:orb', 'bolt', { n: 2, size: 1, v: 380 }]],
    sakura: [['괴력 · 지면 강타', 'a', 'earth', { rad: 46, pre: 'punchPrep', st: 'hammerDown' }], ['괴력 · 바위 던지기', 'r:orb', 'earth', { size: 1.5, v: 260, pre: 'hammerUp' }], ['쿠나이 · 견제 투척', 'r:arrow', 'metal', { n: 3, size: .5, v: 420 }],
      ['백호인 · 연속 괴력 주먹', 'm', 'power', { n: 5 }], ['괴력 · 하늘 발뒤꿈치 찍기', 'a', 'earth', { rad: 40, jump: true, pre: 'flipAir', st: 'axe' }], ['카츠유 · 산성 분사', 'r:orb', 'light', { n: 3, size: .8, v: 260, cast: 'palm' }],
      ['의료 인술 · 손바닥 메스', 'p', 'light', { n: 2 }], ['잡아 내던지기', 'g', 'power'], ['괴력 · 반격 주먹', 'c', 'power'], ['돌진 괴력 주먹', 'd', 'power', { size: 1.4 }]],
    luffy: [['고무고무 총 난사', 'x', 'power', { n: 4 }], ['고무고무 화살', 'x', 'power'], ['고무고무 바주카 · 원거리', 'x', 'power', { n: 2 }], ['고무고무 로켓 낙하', 'a', 'power', { rad: 40, jump: true, pre: 'flipAir', st: 'hammerDown' }],
      ['고무고무 풍선 · 튕겨내기', 'c', 'power'], ['기어 세컨드 · 제트 바주카', 'x', 'steam', { n: 2 }], ['기어 세컨드 · 제트 피스톨', 'x', 'steam'], ['기어 서드 · 기간트 피스톨', 'x', 'power', { giant: 1.2, u: 1 }],
      ['기어 포스 · 콩 건', 'x', 'dark', { giant: 1, u: 1 }], ['기어 포스 · 컬버린', 'x', 'dark', { giant: .8 }], ['고무고무 낫', 'k', 'power', { st: 'spinKick' }], ['패왕색 · 위압', 'at:vortex', 'dark']],
    zoro: [['일도류 · 사자 노래 연타', 'i', 'slash', { n: 3 }], ['이도류 · 응사자 노래', 'i', 'slash', { arc: [-.4, .4, 34] }], ['일도류 · 대진 사자 노래', 'i', 'slash', { arc: [-.3, .3, 44], u: 1 }],
      ['삼도류 · 우시바리 비참', 'r:getsuga', 'slash', { size: 1.1, v: 360 }], ['일도류 · 72 파운드 포', 'r:getsuga', 'wind', { size: 1, v: 380 }], ['이도류 · 108 파운드 포', 'r:getsuga', 'wind', { size: 1.4, v: 340 }],
      ['삼도류 · 흑승 용 말기', 'a', 'dark', { rad: 44, spin: 18 }], ['삼도류 · 귀참 연격', 's', 'slash', { n: 3 }], ['구도류 아수라 · 망자 희롱', 't2', 'dark', { u: 1 }], ['패기 · 칼날 막기 반격', 'c', 'slash']],
    sanji: [['디아블 잠브 · 콜리어 프리트', 'k', 'fire', { n: 2 }], ['디아블 잠브 · 무통 숏', 'k', 'fire'], ['디아블 잠브 · 프랑 바흐', 'k', 'fire', { n: 3 }], ['스카이 워크 · 공중 연격', 'k', 'power', { n: 4, pre: 'flipAir' }],
      ['퀴송 · 연속 발차기', 'k', 'power', { n: 6 }], ['앙티엠 · 하쉬 연사', 'r:fireball', 'fire', { n: 4, size: .6, v: 360, pre: 'kickPrep', cast: 'highKick' }], ['불꽃 발차기 · 원거리 화염', 'r:fireball', 'fire', { size: 1.2, v: 320, pre: 'spinKick', cast: 'highKick' }],
      ['파티 테이블 · 회전 킥', 'a', 'power', { rad: 34, spin: 18, pre: 'handstand', st: 'spinKick' }], ['디아블 잠브 · 플람베', 'd', 'fire', { size: 1.3 }], ['발 받아치기 · 카운터', 'c', 'power', { st: 'kick' }]],
    ichigo: [['월아천충 · 연속 투척', 'r:getsuga', 'getsuga', { n: 3, size: .9, v: 360, pre: 'swordLevel', cast: 'spreadSlash' }], ['흑 월아천충 · 원거리', 'r:getsuga', 'getsuga', { size: 1.6, v: 320, pre: 'twoHandSword', cast: 'swordDown' }],
      ['허화 · 흑 월아 연사', 'r:getsuga', 'hollow', { n: 2, size: 1.3, v: 340, pre: 'maskPull', cast: 'swordDown' }], ['월아천충 · 근접 일섬', 'i', 'getsuga'], ['천쇄참월 · 고속 연참', 's', 'getsuga', { n: 5 }],
      ['참월 회전 베기', 'w', 'getsuga'], ['순보 · 뒤로 돌아 베기', 'd', 'getsuga'], ['호로화 · 맨손 허섬', 'r:orb', 'hollow', { size: 1.2, v: 360, pre: 'maskPull', cast: 'openPalm' }], ['칼날 받아치기', 'c', 'getsuga', { pre: 'guard', st: 'swordDown' }], ['무월 · 최후의 월아천충', 't2', 'getsuga', { u: 1, arc: [-3, 1.4, 60], arcW: 18 }]],
    byakuya: [['센본자쿠라 · 칼날 비', 'r:arrow', 'petal', { n: 8, size: .4, v: 360, pre: 'swordDown', cast: 'openPalm' }], ['천본앵 · 화편', 'r:orb', 'petal', { n: 3, size: .8, v: 300, cast: 'openPalm' }], ['파도 · 창화추 원거리', 'r:fireball', 'light', { size: 1.3, v: 300, cast: 'openPalm' }],
      ['파도 · 백뢰 연사', 'r:arrow', 'light', { n: 3, size: .6, v: 480, pre: 'fingerPoint', cast: 'fingerPoint' }], ['순보 · 등 뒤 일섬', 'i', 'light'], ['천본앵 · 일점 집중', 'at:petals', 'petal'],
      ['천본앵 · 방패', 'c', 'petal', { pre: 'openPalm' }], ['순보 연속 베기', 's', 'petal', { n: 3 }], ['천본앵 · 회오리', 'a', 'petal', { rad: 46, spin: 14 }], ['백제검 · 날개', 'y', 'light', { u: 1 }]],
    rukia: [['소매 흰 눈 · 원거리 빙결', 'r:orb', 'ice', { size: 1.2, v: 300, pre: 'swordLevel', cast: 'swordDown' }], ['첫 번째 춤 · 월백 원거리', 'at:ice', 'ice', { pre: 'swordDown' }], ['네 번째 춤 · 얼음 칼날 투척', 'r:arrow', 'ice', { n: 4, size: .6, v: 420 }],
      ['파도 · 창화추 연사', 'r:fireball', 'light', { n: 2, size: 1, v: 300, cast: 'openPalm' }], ['박도 · 육장광뢰 원거리', 'r:arrow', 'light', { n: 6, size: .5, v: 420, cast: 'fingerPoint' }], ['순보 · 얼음 찌르기', 'i', 'ice', { arc: [-.2, .2, 30] }],
      ['소매 흰 눈 · 연속 베기', 's', 'ice', { n: 3 }], ['얼음 막 · 받아치기', 'c', 'ice', { st: 'swordDown' }], ['백하벌 · 절대 영도', 'a', 'ice', { rad: 52, u: 1 }], ['얼음 회전 베기', 'w', 'ice']],
    saitama: [['보통 펀치 · 원거리 풍압', 'r:orb', 'power', { size: 1.4, v: 420, pre: 'punchPrep', cast: 'punch' }], ['진지한 펀치 · 구름 날리기', 'r:orb', 'power', { size: 2.4, v: 380, pre: 'seriousWind', cast: 'seriousPunch', u: 1 }], ['돌멩이 던지기', 'r:orb', 'power', { size: .7, v: 520 }],
      ['보통 연속 펀치 · 풍압 난타', 'r:orb', 'power', { n: 6, size: .6, v: 440, pre: 'punchPrep', cast: 'punch' }], ['보통 꿀밤 연타', 'm', 'power', { n: 3, st: 'palm' }], ['보통 걸어가기 돌진', 'd', 'power', { size: 1.2 }],
      ['보통 박치기', 'm', 'power'], ['보통 잡아 던지기', 'g', 'power'], ['보통 피하기 · 반격', 'c', 'power'], ['진지한 점프 · 착지 충격', 'a', 'power', { rad: 56, jump: true, pre: 'flipAir', st: 'land' }]],
    genos: [['소각포 · 원거리 연사', 'r:fireball', 'fire', { n: 3, size: .9, v: 360, pre: 'openPalm', cast: 'openPalm' }], ['양팔 소각 · 십자', 'r:fireball', 'fire', { n: 2, size: 1.3, v: 320, pre: 'twoHand', cast: 'openPalm' }], ['로켓 펀치 · 사출', 'r:orb', 'metal', { size: 1.2, v: 420, cast: 'punch' }],
      ['기관포 견제 사격', 'r:arrow', 'metal', { n: 8, size: .4, v: 520, cast: 'openPalm' }], ['초고열 · 화염 장벽', 'a', 'fire', { rad: 36 }], ['부스터 · 공중 낙하 펀치', 'a', 'fire', { rad: 38, jump: true, pre: 'flipAir', st: 'hammerDown' }],
      ['기계 팔 · 잡아 소각', 'g', 'fire'], ['기계 팔 · 막고 반격', 'c', 'metal'], ['초고속 연타 · 부스터', 'm', 'metal', { n: 6 }], ['마신 소각포 · 최대', 'r:fireball', 'fire', { size: 2.2, v: 300, u: 1, pre: 'twoHand' }]],
    gaara: [['사막 장송 · 원거리 조이기', 'at:vortex', 'sand', { pre: 'openPalm' }], ['모래 수리검 연사', 'r:arrow', 'sand', { n: 6, size: .5, v: 400, cast: 'openPalm' }], ['사박 · 모래 탄환', 'r:orb', 'sand', { n: 4, size: .8, v: 340, cast: 'openPalm' }],
      ['모래 · 거대 손', 'r:orb', 'sand', { size: 1.8, v: 260, cast: 'openPalm' }], ['사막 부유 · 낙하 공격', 'a', 'sand', { rad: 44, jump: true }], ['모래 방패 · 받아치기', 'c', 'sand', { pre: 'crossArms' }],
      ['모래 갑옷 · 박치기', 'm', 'sand'], ['모래 늪', 'a', 'sand', { rad: 50 }], ['사우 · 모래 우산', 'y', 'sand'], ['모래 거인 팔 · 내려치기', 'a', 'sand', { rad: 40, pre: 'skyRaise', st: 'hammerDown', u: 1 }]],
    itachi: [['화둔 · 호화구 원거리', 'r:fireball', 'fire', { size: 1.6, v: 280, pre: 'mouthSeal', cast: 'blow' }], ['화둔 · 봉선화 연사', 'r:fireball', 'fire', { n: 6, size: .5, v: 360, pre: 'mouthSeal', cast: 'blow' }], ['수리검 술 · 사각 투척', 'r:arrow', 'fire', { n: 4, size: .5, v: 440 }],
      ['수둔 · 수룡탄', 'r:orb', 'water', { size: 1.6, v: 280, pre: 'seal', cast: 'twoHand' }], ['아마테라스 · 원거리 점화', 'at:flames', 'dark', { pre: 'eyeHand' }], ['까마귀 분신 · 기습', 'm', 'dark', { n: 2 }],
      ['쿠나이 · 근접 연격', 's', 'fire', { n: 3 }], ['환술 · 손가락 반격', 'c', 'dark', { pre: 'eyeHand', st: 'fingerPoint' }], ['수사노오 · 토츠카 찌르기', 'i', 'dark', { u: 1, arc: [-.3, .3, 40] }], ['수사노오 · 팔 휘두르기', 'a', 'dark', { rad: 44 }]],
    gai: [['아침 공작 · 원거리 열권', 'r:fireball', 'steam', { n: 5, size: .7, v: 400, pre: 'braced', cast: 'punch' }], ['낮 호랑이 · 공기 주먹', 'r:orb', 'steam', { size: 2, v: 360, pre: 'braced', cast: 'punch', u: 1 }], ['쌍절곤 · 투척', 'r:arrow', 'power', { size: .8, v: 380 }],
      ['나뭇잎 대낙하', 'a', 'wind', { rad: 40, jump: true, pre: 'flipAir', st: 'axe' }], ['나뭇잎 선풍 · 연속', 'k', 'wind', { n: 3, st: 'spinKick' }], ['다이나믹 엔트리 · 날아차기', 'd', 'power', { size: 1.4 }],
      ['팔문 · 생문 개방', 'm', 'steam', { n: 4 }], ['나뭇잎 강력 선풍 · 회전', 'a', 'wind', { rad: 38, spin: 18 }], ['쌍절곤 · 받아치기', 'c', 'power'], ['체술 · 잡아 넘기기', 'g', 'power']],
    ace: [['화권 · 원거리', 'r:fireball', 'fire', { size: 1.8, v: 320, pre: 'punchPrep', cast: 'punch' }], ['반딧불 화 · 연사', 'r:fireball', 'fire', { n: 8, size: .4, v: 300, cast: 'fingerPoint' }], ['화창 · 연사', 'r:arrow', 'fire', { n: 3, size: .9, v: 420, cast: 'fingerPoint' }],
      ['신화 불지옥 · 화염 기둥', 'y', 'fire', { u: 1 }], ['염상망 · 불꽃 벽', 'a', 'fire', { rad: 44 }], ['불꽃 몸 · 받아넘기기', 'c', 'fire'], ['화권 · 근접 연타', 'm', 'fire', { n: 3 }], ['불꽃 발차기', 'k', 'fire'], ['불꽃 돌진', 'd', 'fire'], ['십자화 · 원거리', 'r:arrow', 'fire', { size: 1.2, v: 380, cast: 'fingerPoint' }]],
    kizaru: [['팔척경옥 · 연사', 'r:arrow', 'light', { n: 8, size: .5, v: 560, pre: 'openArms', cast: 'openPalm' }], ['빛 발차기 · 원거리', 'r:arrow', 'light', { size: 1.2, v: 600, pre: 'kickPrep', cast: 'highKick' }], ['아마노무라쿠모 · 투척', 'r:arrow', 'light', { size: 1.4, v: 520 }],
      ['광속 연속 발차기', 'k', 'light', { n: 5 }], ['광속 이동 · 등 뒤 발차기', 'd', 'light'], ['천총운검 · 베기', 's', 'light', { n: 2 }], ['빛의 비 · 하늘', 'y', 'light'], ['손가락 레이저 · 점사', 'r:arrow', 'light', { n: 3, size: .6, v: 640, cast: 'fingerPoint' }],
      ['빛 몸 · 흘려보내기', 'c', 'light'], ['대광명 · 섬광 폭발', 'a', 'light', { rad: 54, u: 1 }]],
    law: [['룸 · 샴블즈 바꿔치기', 'd', 'room'], ['메스 · 심장 빼기', 'p', 'room'], ['타쿠트 · 바위 던지기', 'r:orb', 'room', { n: 3, size: 1, v: 300, pre: 'fingerPoint', cast: 'fingerPoint' }], ['라디오 나이프 · 원거리', 'r:getsuga', 'bolt', { size: 1.2, v: 360, pre: 'swordLevel', cast: 'iaiEnd' }],
      ['카운터 쇼크 · 접촉', 'p', 'bolt'], ['룸 · 무작위 절단', 'w', 'room'], ['인젝션 샷 · 돌진', 'd', 'room', { size: 1.4 }], ['스캔 · 원거리 절단', 'at:vortex', 'room', { pre: 'fingerPoint' }], ['키코쿠 · 받아치기', 'c', 'room', { st: 'swordDown' }], ['룸 · 공중 낙하 베기', 'a', 'room', { rad: 36, jump: true }]],
    hitsugaya: [['빙륜환 · 얼음 용 원거리', 'r:orb', 'ice', { size: 1.6, v: 300, pre: 'swordLevel', cast: 'spreadSlash' }], ['빙륜환 · 얼음 칼날 연사', 'r:arrow', 'ice', { n: 5, size: .5, v: 420 }], ['군조빙결 · 얼음 가시', 'at:ice', 'ice', { pre: 'swordDown' }],
      ['육의 빙결 · 원거리 봉인', 'at:ice', 'ice', { pre: 'openPalm' }], ['사슬 · 낫 휘감기', 'r:arrow', 'ice', { size: .8, v: 380 }], ['순보 · 얼음 찌르기', 'i', 'ice'], ['얼음 날개 · 공중 베기', 'a', 'ice', { rad: 40, jump: true }],
      ['빙결 · 받아치기', 'c', 'ice', { st: 'swordDown' }], ['빙룡 연속 베기', 's', 'ice', { n: 3 }], ['대홍련 빙륜환 · 얼음 꽃', 'y', 'ice', { u: 1 }]],
    kenpachi: [['영압 · 원거리 참격', 'r:getsuga', 'power', { size: 1.6, v: 320, pre: 'twoHandSword', cast: 'swordDown' }], ['방울 소리 · 기습 베기', 'i', 'slash'], ['난도질 · 연속 베기', 's', 'slash', { n: 6 }],
      ['맨손 · 칼날 잡기 반격', 'c', 'power', { pre: 'guard', st: 'punch' }], ['검팔 · 회전 베기', 'w', 'slash'], ['영압 폭발 · 원거리 압박', 'at:vortex', 'power', { pre: 'braced' }], ['어깨 박치기', 'g', 'power'], ['검팔 · 지면 쪼개기', 'a', 'power', { rad: 44, pre: 'twoHandSword', st: 'hammerDown' }],
      ['검팔 · 돌진 일격', 'd', 'power', { size: 1.6 }], ['노자라시 · 일도 양단', 't2', 'power', { u: 1, arc: [-3, 1.4, 58], arcW: 18 }]],
    aizen: [['파도 · 백뢰 원거리', 'r:arrow', 'light', { size: .8, v: 520, pre: 'fingerPoint', cast: 'fingerPoint' }], ['파도 · 뇌명포 원거리', 'r:orb', 'bolt', { size: 1.6, v: 300, pre: 'openPalm', cast: 'openPalm' }], ['흑관 · 원거리 봉인', 'at:vortex', 'dark', { pre: 'openPalm', u: 1 }],
      ['경화수월 · 환영 베기', 'i', 'dark'], ['순보 · 등 뒤 찌르기', 'i', 'light', { arc: [-.2, .2, 30] }], ['손가락 하나로 막기', 'c', 'light', { pre: 'fingerPoint', st: 'swordDown' }], ['붕옥 · 영압 폭발', 'a', 'dark', { rad: 50 }],
      ['완전최면 · 유인 베기', 's', 'dark', { n: 2 }], ['육장광뢰 · 원거리 구속', 'r:arrow', 'light', { n: 6, size: .4, v: 420, cast: 'fingerPoint' }], ['비룡격적진천뢰포 · 원거리', 'r:orb', 'bolt', { size: 2, v: 300, pre: 'twoHand', cast: 'openPalm' }]],
    tatsumaki: [['염동 · 돌 탄환 연사', 'r:orb', 'psychic', { n: 6, size: .5, v: 420, cast: 'fingerPoint' }], ['염동 · 건물 조각 던지기', 'r:orb', 'earth', { size: 1.8, v: 260, pre: 'skyRaise', cast: 'point' }], ['염동 · 원거리 조이기', 'at:vortex', 'psychic', { pre: 'openPalm' }],
      ['염동 · 들어 올려 내던지기', 'g', 'psychic', { pre: 'openPalm', st: 'point' }], ['염동 · 끌어당기기', 'at:vortex', 'psychic', { pre: 'fingerPoint' }], ['염동 · 장벽 반사', 'c', 'psychic', { pre: 'openPalm', st: 'point' }], ['염동 · 공중 낙하', 'a', 'psychic', { rad: 44, jump: true }],
      ['염동 · 대지 뒤집기', 'a', 'earth', { rad: 56, pre: 'skyRaise', st: 'hammerDown', u: 1 }], ['염동 · 순간 이동', 'd', 'psychic'], ['염동 · 소용돌이 파편', 'y', 'psychic']],
    bang: [['유수암쇄권 · 원거리 장풍', 'r:orb', 'water', { size: 1.2, v: 340, pre: 'openPalm', cast: 'palm' }], ['흐르는 물 · 연속 장풍', 'r:orb', 'water', { n: 4, size: .6, v: 380, pre: 'openPalm', cast: 'palm' }], ['유수 · 흘려 던지기', 'g', 'water'],
      ['유수 · 받아넘기기', 'c', 'water', { st: 'palm' }], ['암쇄 · 정권 찌르기', 'm', 'power'], ['유수 · 회전 발차기', 'k', 'water', { st: 'spinKick' }], ['유수 · 돌진 연타', 'd', 'water'], ['암쇄 · 지면 장타', 'a', 'power', { rad: 36, st: 'palm' }],
      ['유수암쇄권 · 쌍장', 'p', 'water', { n: 2 }], ['유수암쇄권 · 전력', 'm', 'water', { n: 8, u: 1 }]],
    garou: [['유수암쇄권 · 원거리 장풍', 'r:orb', 'water', { size: 1.2, v: 340, pre: 'openPalm', cast: 'palm' }], ['괴인 · 살기 파동', 'at:vortex', 'dark', { pre: 'braced' }], ['감마선 · 연사', 'r:arrow', 'dark', { n: 4, size: .7, v: 460, cast: 'openPalm' }],
      ['우주적 공포 · 핵분열 주먹', 'r:orb', 'dark', { size: 2, v: 360, u: 1, cast: 'punch' }], ['무술 사냥 · 받아치기', 'c', 'water', { st: 'palm' }], ['격류 · 흘려 던지기', 'g', 'water'], ['괴인 · 손톱 베기', 'p', 'dark', { n: 3 }],
      ['괴인 · 회전 발차기', 'k', 'dark', { st: 'spinKick' }], ['괴인 · 돌진', 'd', 'dark', { size: 1.4 }], ['유수암쇄권 · 지면 장타', 'a', 'power', { rad: 40, st: 'palm' }]],
    tanjiro: [['물의 호흡 제2형 · 물레 원거리', 'r:getsuga', 'water', { size: 1, v: 340, pre: 'swordLevel', cast: 'spreadSlash' }], ['물의 호흡 · 물결 칼날 투척', 'r:getsuga', 'water', { n: 2, size: .8, v: 360, pre: 'swordLevel', cast: 'spreadSlash' }], ['히노카미 카구라 · 벽라의 하늘 원거리', 'r:getsuga', 'sun', { size: 1.2, v: 340, pre: 'twoHandSword', cast: 'swordDown' }],
      ['히노카미 카구라 · 환일홍', 'i', 'sun'], ['히노카미 카구라 · 청란풍', 'w', 'sun'], ['히노카미 카구라 · 사광 변일', 'r:getsuga', 'sun', { size: 1.4, v: 320, pre: 'twoHandSword', cast: 'spreadSlash' }],
      ['히노카미 카구라 · 일훈 연격', 's', 'sun', { n: 4 }], ['물의 호흡 · 받아넘기기', 'c', 'water', { st: 'swordDown' }], ['박치기', 'm', 'water'], ['히노카미 카구라 · 십삼형 연결', 't2', 'sun', { u: 1, arc: [-3, 1.4, 52], arcW: 16 }]],
    nezuko: [['혈귀술 · 폭혈 원거리', 'r:fireball', 'blood', { n: 3, size: .8, v: 320, cast: 'openPalm' }], ['폭혈 · 피 뿌리기', 'r:orb', 'blood', { n: 5, size: .5, v: 360, cast: 'openPalm' }], ['폭혈 · 점화', 'at:flames', 'blood', { pre: 'openPalm' }],
      ['발차기 · 연속', 'k', 'blood', { n: 4 }], ['발차기 · 머리 차기', 'k', 'blood', { st: 'highKick' }], ['할퀴기 · 반격', 'c', 'blood', { st: 'palm' }], ['도약 내려찍기', 'a', 'blood', { rad: 38, jump: true, pre: 'flipAir', st: 'axe' }], ['잡아 던지기', 'g', 'blood'],
      ['혈귀 · 돌진', 'd', 'blood'], ['혈귀화 · 폭혈 대연쇄', 'a', 'blood', { rad: 56, u: 1 }]],
    zenitsu: [['번개의 호흡 · 원거리 뇌격', 'r:arrow', 'bolt', { size: 1.2, v: 620, pre: 'iai', cast: 'iaiEnd' }], ['벽력일섬 · 번개 칼날', 'r:getsuga', 'bolt', { size: 1, v: 520, pre: 'iai', cast: 'iaiEnd' }], ['번개 · 낙뢰 견제', 'y', 'bolt'],
      ['벽력일섬 · 사연', 'i', 'bolt', { n: 4 }], ['벽력일섬 · 신속 돌진', 'd', 'bolt', { size: 1.4 }], ['칼집 · 받아치기', 'c', 'bolt', { st: 'iaiEnd' }], ['잠든 · 회피 발도', 'i', 'bolt', { pre: 'kneel' }], ['번개 · 회전 베기', 'w', 'bolt'],
      ['번개 · 공중 일섬', 'a', 'bolt', { rad: 34, jump: true }], ['칠형 · 화뢰신 · 용', 'r:arrow', 'bolt', { size: 2, v: 640, pre: 'iai', cast: 'iaiEnd', u: 1 }]],
    inosuke: [['짐승의 호흡 · 칼 던지기', 'r:getsuga', 'slash', { n: 2, size: .8, v: 360, pre: 'xSwords', cast: 'throw' }], ['짐승의 호흡 · 톱날 원거리', 'r:arrow', 'slash', { n: 3, size: .6, v: 420, pre: 'xSwords' }], ['공간 식각 · 감각 포착', 'at:vortex', 'power', { pre: 'xSwords' }],
      ['짐승의 호흡 · 연속 찢기', 's', 'slash', { n: 5 }], ['짐승의 호흡 · 회전 베기', 'w', 'slash'], ['멧돼지 박치기', 'm', 'power'], ['짐승 · 관절 꺾어 회피 반격', 'c', 'slash', { st: 'spreadSlash' }],
      ['짐승의 호흡 · 도약 베기', 'a', 'slash', { rad: 34, jump: true }], ['짐승 · 물어뜯기 돌진', 'd', 'power'], ['짐승의 호흡 · 일의 이빨 · 꿰뚫기 연격', 'i', 'slash', { n: 2, u: 1 }]],
    giyu: [['물의 호흡 · 물결 칼날', 'r:getsuga', 'water', { size: 1, v: 360, pre: 'swordLevel', cast: 'spreadSlash' }], ['물의 호흡 · 수룡 원거리', 'r:orb', 'water', { size: 1.5, v: 300, pre: 'swordLevel', cast: 'swordDown' }], ['물의 호흡 · 물보라 연사', 'r:arrow', 'water', { n: 4, size: .5, v: 420 }],
      ['잔잔한 물결 · 받아넘기기', 'c', 'water', { st: 'swordDown' }], ['물의 호흡 · 유류무 연격', 's', 'water', { n: 4 }], ['물의 호흡 · 회전 베기', 'w', 'water'], ['물의 호흡 · 찌르기', 'i', 'water', { arc: [-.2, .2, 32] }],
      ['물의 호흡 · 도약 낙하', 'a', 'water', { rad: 38, jump: true }], ['물의 호흡 · 돌진', 'd', 'water'], ['반점 · 잔잔한 물결 개', 't2', 'water', { u: 1 }]],
    rengoku: [['불꽃의 호흡 · 원거리 염파', 'r:getsuga', 'fire', { size: 1.2, v: 340, pre: 'swordLevel', cast: 'swordDown' }], ['불꽃의 호흡 · 염호 원거리', 'r:fireball', 'fire', { size: 1.8, v: 300, pre: 'twoHandSword', cast: 'swordDown' }], ['불꽃의 호흡 · 불티 칼날', 'r:arrow', 'fire', { n: 4, size: .5, v: 420 }],
      ['불꽃의 호흡 · 받아넘기기', 'c', 'fire', { st: 'swordDown' }], ['불꽃의 호흡 · 연속 베기', 's', 'fire', { n: 4 }], ['불꽃의 호흡 · 회전 베기', 'w', 'fire'], ['불꽃의 호흡 · 일섬', 'i', 'fire'],
      ['불꽃의 호흡 · 도약 내려베기', 'a', 'fire', { rad: 40, jump: true, pre: 'twoHandSword', st: 'hammerDown' }], ['불꽃의 호흡 · 기염 돌진', 'd', 'fire', { size: 1.5 }], ['오의 · 구 · 연옥 진염', 't2', 'fire', { u: 1, arc: [-3, 1.4, 56], arcW: 18 }]],
    shinobu: [['독침 · 연사', 'r:arrow', 'insect', { n: 5, size: .4, v: 480, pre: 'swordLevel', cast: 'iaiEnd' }], ['나비의 춤 · 원거리 찌르기', 'r:arrow', 'insect', { size: .8, v: 560, pre: 'iai', cast: 'iaiEnd' }], ['등꽃 독 안개', 'at:vortex', 'insect', { pre: 'openPalm' }],
      ['벌의 침 · 진곡 · 비상', 'i', 'insect', { arc: [-.2, .2, 34] }], ['나비의 춤 · 회피 반격', 'c', 'insect', { st: 'iaiEnd' }], ['잠자리의 춤 · 연속 찌르기', 'i', 'insect', { n: 6 }], ['지네의 춤 · 지그재그 돌진', 'd', 'insect'],
      ['나비의 춤 · 공중 찌르기', 'a', 'insect', { rad: 30, jump: true }], ['등꽃 독 · 회전 베기', 'w', 'insect'], ['벌레의 호흡 · 최후의 독', 'i', 'insect', { u: 1, arc: [-.2, .2, 40] }]],
    uzui: [['폭약 구슬 · 투척', 'r:fireball', 'sound', { n: 4, size: .6, v: 360 }], ['쌍검 · 사슬 원거리', 'r:getsuga', 'sound', { size: 1.2, v: 340, pre: 'xSwords', cast: 'throw' }], ['소리의 호흡 · 폭음 탄', 'r:orb', 'sound', { n: 3, size: .8, v: 340 }],
      ['보면 · 리듬 받아치기', 'c', 'sound', { st: 'spreadSlash' }], ['소리의 호흡 · 쌍검 연참', 's', 'sound', { n: 4 }], ['소리의 호흡 · 회전 폭참', 'w', 'sound'], ['소리의 호흡 · 도약 굉', 'a', 'sound', { rad: 40, jump: true, pre: 'xSwords', st: 'hammerDown' }],
      ['화려 · 돌진 참격', 'd', 'sound', { size: 1.4 }], ['쌍검 · 일섬', 'i', 'sound'], ['명현주소 · 극', 'a', 'sound', { rad: 54, spin: 16, u: 1 }]],
    mitsuri: [['채찍검 · 원거리 휘두르기', 'r:getsuga', 'petal', { size: 1.2, v: 340, pre: 'swordLevel', cast: 'spreadSlash' }], ['사랑의 호흡 · 꽃잎 칼날', 'r:arrow', 'petal', { n: 5, size: .5, v: 420, cast: 'spreadSlash' }], ['연묘 시구레 · 원거리', 'r:getsuga', 'petal', { n: 3, size: .8, v: 360, cast: 'spreadSlash' }],
      ['사랑의 호흡 · 받아넘기기', 'c', 'petal', { st: 'spreadSlash' }], ['사랑의 호흡 · 연격', 's', 'petal', { n: 5 }], ['사랑의 호흡 · 회전', 'w', 'petal'], ['사랑의 호흡 · 도약 베기', 'a', 'petal', { rad: 40, jump: true }],
      ['사랑의 호흡 · 돌진', 'd', 'petal'], ['사랑의 호흡 · 찌르기', 'i', 'petal'], ['고양이 발 사랑바람 · 극', 'a', 'petal', { rad: 54, spin: 18, u: 1 }]],
    muichiro: [['안개의 호흡 · 원거리 안개 칼날', 'r:getsuga', 'mist', { size: 1, v: 360, pre: 'swordLevel', cast: 'spreadSlash' }], ['안개의 호흡 · 칼날 비', 'r:arrow', 'mist', { n: 5, size: .5, v: 420 }], ['안개의 호흡 · 안개 덮기', 'at:vortex', 'mist', { pre: 'swordLevel' }],
      ['안개의 호흡 · 받아넘기기', 'c', 'mist', { st: 'swordDown' }], ['안개의 호흡 · 연격', 's', 'mist', { n: 4 }], ['안개의 호흡 · 회전 베기', 'w', 'mist'], ['안개의 호흡 · 일섬', 'i', 'mist'],
      ['안개의 호흡 · 도약 베기', 'a', 'mist', { rad: 36, jump: true }], ['안개의 호흡 · 돌진', 'd', 'mist'], ['칠형 · 몽롱 · 극', 'i', 'mist', { u: 1, arc: [-.5, .5, 44] }]],
    sanemi: [['바람의 호흡 · 원거리 진사바람', 'r:getsuga', 'wind', { size: 1.2, v: 380, pre: 'swordLevel', cast: 'spreadSlash' }], ['바람의 호흡 · 칼날 폭풍 연사', 'r:arrow', 'wind', { n: 5, size: .5, v: 440 }], ['바람의 호흡 · 회오리 원거리', 'r:orb', 'wind', { size: 1.4, v: 320 }],
      ['바람의 호흡 · 받아치기', 'c', 'wind', { st: 'swordDown' }], ['바람의 호흡 · 연격', 's', 'wind', { n: 5 }], ['바람의 호흡 · 회전 베기', 'w', 'wind'], ['바람의 호흡 · 일섬', 'i', 'wind'],
      ['바람의 호흡 · 도약 내려베기', 'a', 'wind', { rad: 40, jump: true, st: 'hammerDown' }], ['바람의 호흡 · 돌진', 'd', 'wind', { size: 1.4 }], ['구형 · 이즈나 아라시 · 극', 'a', 'wind', { rad: 56, spin: 18, u: 1 }]],
    obanai: [['뱀의 호흡 · 원거리 곡선 칼날', 'r:getsuga', 'slash', { size: 1, v: 360, pre: 'swordLevel', cast: 'spreadSlash' }], ['뱀의 호흡 · 칼날 연사', 'r:arrow', 'slash', { n: 4, size: .5, v: 420 }], ['카부라마루 · 독 물기', 'at:vortex', 'insect', { pre: 'openPalm' }],
      ['뱀의 호흡 · 휘감아 받아치기', 'c', 'slash', { st: 'spreadSlash' }], ['뱀의 호흡 · 연찌르기', 'i', 'slash', { n: 4, arc: [-.3, .2, 30] }], ['뱀의 호흡 · 회전 베기', 'w', 'slash'], ['뱀의 호흡 · 연격', 's', 'slash', { n: 3 }],
      ['뱀의 호흡 · 도약 베기', 'a', 'slash', { rad: 34, jump: true }], ['뱀의 호흡 · 곡선 돌진', 'd', 'slash'], ['뱀의 호흡 · 오형 · 장반 장사 · 극', 'w', 'slash', { u: 1, arc: [-3.1, 3.1, 44], arcW: 12 }]],
    himejima: [['바위의 호흡 · 철구 원거리', 'r:orb', 'metal', { size: 1.6, v: 300, pre: 'hammerUp', cast: 'throw' }], ['바위의 호흡 · 도끼 원거리', 'r:getsuga', 'metal', { size: 1.3, v: 320, pre: 'hammerUp', cast: 'throw' }], ['바위의 호흡 · 쇠사슬 견제', 'r:arrow', 'metal', { n: 2, size: .8, v: 380 }],
      ['쇠사슬 · 막고 받아치기', 'c', 'metal', { st: 'hammerDown' }], ['철구 · 근접 강타', 'm', 'earth', { pre: 'hammerUp', st: 'hammerDown' }], ['쇠사슬 · 휘감아 당기기', 'g', 'metal'], ['바위의 호흡 · 회전 철구', 'a', 'earth', { rad: 44, spin: 16 }],
      ['바위의 호흡 · 도약 내려찍기', 'a', 'earth', { rad: 46, jump: true, pre: 'hammerUp', st: 'hammerDown' }], ['바위의 호흡 · 돌진', 'd', 'earth', { size: 1.5 }], ['바위의 호흡 · 오형 · 와륜형부 · 극', 'a', 'earth', { rad: 58, u: 1, pre: 'hammerUp', st: 'hammerDown' }]],
    eren: [['뇌창 · 원거리 폭발', 'r:arrow', 'spear', { size: 1.2, v: 360 }], ['와이어 · 끌어당겨 베기', 's', 'odm', { n: 2 }], ['입체기동 · 공중 낙하 베기', 'a', 'odm', { rad: 30, jump: true }], ['진격의 거인 · 경질화 수정 투척', 'r:orb', 'harden', { size: 1.4, v: 300 }],
      ['진격의 거인 · 발차기', 'k', 'titan'], ['진격의 거인 · 잡아 던지기', 'g', 'titan'], ['진격의 거인 · 받아치기', 'c', 'titan'], ['증기 · 거인 몸 열풍', 'a', 'vapor', { rad: 40 }], ['진격의 거인 · 돌진', 'd', 'titan', { size: 1.6 }], ['진격의 거인 · 경질화 손톱', 'p', 'harden', { n: 2 }]],
    mikasa: [['뇌창 · 연사', 'r:arrow', 'spear', { n: 3, size: .9, v: 380 }], ['칼날 · 원거리 투척', 'r:arrow', 'odm', { n: 2, size: .7, v: 440 }], ['입체기동 · 회전 돌진 베기', 'd', 'odm', { size: 1.3 }], ['아커만 · 받아치기', 'c', 'odm', { st: 'spreadSlash' }],
      ['쌍검 · 일섬', 'i', 'odm'], ['쌍검 · 회전 베기', 'w', 'odm'], ['맨손 · 잡아 넘기기', 'g', 'power'], ['맨손 · 발차기', 'k', 'power'], ['입체기동 · 공중 낙하', 'a', 'odm', { rad: 30, jump: true }], ['가스 분사 · 연속 베기', 's', 'vapor', { n: 4 }]],
    levi: [['뇌창 · 원거리 폭발', 'r:arrow', 'spear', { size: 1.2, v: 380 }], ['칼날 · 원거리 투척', 'r:arrow', 'odm', { n: 3, size: .6, v: 460 }], ['입체기동 · 회전 돌진', 'd', 'odm', { size: 1.4 }], ['역수 쌍검 · 받아치기', 'c', 'odm', { st: 'spreadSlash' }],
      ['역수 쌍검 · 일섬', 'i', 'odm'], ['역수 쌍검 · 회전 난도', 'w', 'odm', { n: 3 }], ['맨손 · 머리 차기', 'k', 'power', { st: 'highKick' }], ['맨손 · 잡아 내리찍기', 'g', 'power'], ['입체기동 · 낙하 베기', 'a', 'odm', { rad: 30, jump: true }], ['가스 분사 · 연속 베기', 's', 'vapor', { n: 6 }]],
    armin: [['뇌창 · 원거리', 'r:arrow', 'spear', { size: 1.1, v: 360 }], ['초대형 거인 · 증기 원거리', 'r:orb', 'vapor', { size: 1.8, v: 240, cast: 'openArms' }], ['신호탄 · 견제', 'r:fireball', 'odm', { size: .6, v: 420 }], ['초대형 거인 · 주먹', 'm', 'titan'],
      ['초대형 거인 · 밟기', 'a', 'titan', { rad: 44, st: 'hammerDown' }], ['초대형 거인 · 잡기', 'g', 'titan'], ['입체기동 · 회피 반격', 'c', 'odm', { st: 'spreadSlash' }], ['입체기동 · 돌진', 'd', 'odm'], ['증기 · 열 폭발', 'a', 'vapor', { rad: 50, u: 1 }], ['입체기동 · 쌍검 베기', 's', 'odm', { n: 2 }]],
    reiner: [['경질화 · 파편 투척', 'r:orb', 'harden', { n: 3, size: .8, v: 320 }], ['갑옷 거인 · 바위 던지기', 'r:orb', 'titan', { size: 1.6, v: 260 }], ['갑옷 거인 · 받아치기', 'c', 'harden'], ['갑옷 거인 · 연속 주먹', 'm', 'harden', { n: 3 }],
      ['갑옷 거인 · 발차기', 'k', 'titan'], ['갑옷 거인 · 땅 찍기', 'a', 'titan', { rad: 44, st: 'hammerDown' }], ['갑옷 거인 · 메치기', 'g', 'titan'], ['갑옷 거인 · 증기 분출', 'a', 'vapor', { rad: 36 }], ['갑옷 거인 · 질주 돌진', 'd', 'harden', { size: 1.8 }], ['경질화 · 팔꿈치 찍기', 'm', 'harden']],
    annie: [['경질화 · 파편 투척', 'r:orb', 'harden', { n: 3, size: .7, v: 340 }], ['여성형 거인 · 바위 걷어차기', 'r:orb', 'titan', { size: 1.4, v: 300, pre: 'kickPrep', cast: 'highKick' }], ['격투 · 로우킥 연타', 'k', 'power', { n: 3 }], ['격투 · 받아치기', 'c', 'power', { st: 'kick' }],
      ['격투 · 무릎 차기', 'k', 'power', { st: 'kick' }], ['여성형 거인 · 돌려차기', 'k', 'titan', { st: 'spinKick' }], ['여성형 거인 · 잡아 조르기', 'g', 'titan'], ['여성형 거인 · 도약 착지', 'a', 'titan', { rad: 40, jump: true }], ['여성형 거인 · 질주 돌진', 'd', 'titan', { size: 1.6 }], ['경질화 · 손등 방어 주먹', 'm', 'harden'], ['여성형 거인 · 거인 부르기 비명', 'at:vortex', 'titan', { pre: 'braced' }]],
    yuji: [['다이버전트 주먹 · 원거리 충격', 'r:orb', 'cursed', { size: 1.2, v: 360, pre: 'punchPrep', cast: 'punch' }], ['돌 던지기 · 견제', 'r:orb', 'cursed', { n: 3, size: .5, v: 480 }], ['혈액 조작 · 천혈 연사', 'r:arrow', 'blood', { n: 3, size: .5, v: 520, cast: 'fingerPoint' }],
      ['흑섬 · 받아치기', 'c', 'bflash'], ['다이버전트 · 연속 발차기', 'k', 'cursed', { n: 3 }], ['잡아 박치기', 'g', 'cursed'], ['도약 · 내려찍기 주먹', 'a', 'cursed', { rad: 36, jump: true, st: 'hammerDown' }], ['돌진 · 어깨 박치기', 'd', 'cursed'], ['연속 주먹 · 러시', 'm', 'cursed', { n: 6 }], ['흑섬 · 연속 각성', 'm', 'bflash', { n: 4, u: 1 }]],
    megumi: [['옥견 · 원거리 물기', 'r:orb', 'shadow2', { n: 2, size: .9, v: 340, cast: 'openPalm' }], ['누에 · 전기 급강하', 'r:arrow', 'shadow2', { size: 1.2, v: 460, cast: 'openPalm' }], ['만상 · 낙하 압살', 'y', 'shadow2'],
      ['두꺼비 · 혀 끌어당기기', 'at:vortex', 'shadow2', { pre: 'openPalm' }], ['그림자 · 받아치기', 'c', 'shadow2'], ['삼절곤 · 회전 타격', 'w', 'cursed'], ['그림자 · 잡아 끌기', 'g', 'shadow2'], ['그림자 잠수 · 기습', 'd', 'shadow2'],
      ['그림자 무기 · 단검 찌르기', 'i', 'cursed'], ['대사 · 땅에서 솟아 물기', 'a', 'shadow2', { rad: 34 }]],
    nobara: [['못 투척 · 3연', 'r:arrow', 'nail', { n: 3, size: .5, v: 480, pre: 'hammerUp', cast: 'throw' }], ['추 · 못 폭발 원거리', 'r:arrow', 'nail', { size: .9, v: 440, cast: 'throw' }], ['공명 · 원격 저주', 'at:vortex', 'cursed', { pre: 'hammerUp' }],
      ['망치 · 받아치기', 'c', 'cursed', { st: 'hammerDown' }], ['망치 · 연타', 'm', 'nail', { n: 3, pre: 'hammerUp', st: 'hammerDown' }], ['발차기 · 견제', 'k', 'cursed'], ['망치 · 지면 못 박기', 'a', 'nail', { rad: 34, st: 'hammerDown' }], ['돌진 · 망치 휘두르기', 'd', 'nail'],
      ['흑섬 · 망치', 'm', 'bflash', { pre: 'hammerUp', st: 'hammerDown' }], ['공명 · 대형 못', 'r:arrow', 'nail', { size: 1.6, v: 420, u: 1 }]],
    gojo: [['창 · 원거리 흡인', 'r:orb', 'ao', { size: 1.2, v: 300, pre: 'fingerPoint', cast: 'fingerPoint' }], ['혁 · 원거리 척력', 'r:orb', 'aka', { size: 1.2, v: 360, pre: 'fingerPoint', cast: 'fingerPoint' }], ['창 · 연속 흡인', 'r:orb', 'ao', { n: 3, size: .7, v: 320, cast: 'fingerPoint' }],
      ['무하한 · 받아넘기기', 'c', 'ao', { pre: 'openPalm', st: 'palm' }], ['주력 · 연속 타격', 'm', 'cursed', { n: 4 }], ['창 · 순간 접근 발차기', 'k', 'ao'], ['혁 · 근접 폭발', 'p', 'aka'], ['창 · 공중 낙하', 'a', 'ao', { rad: 40, jump: true }],
      ['순간이동 · 등 뒤 타격', 'd', 'ao'], ['허식 · 자 · 근거리 발사', 'r:orb', 'murasaki', { size: 2, v: 340, u: 1, pre: 'twoHand', cast: 'fingerPoint' }]],
    sukuna: [['해 · 원거리 참격', 'r:getsuga', 'shrine', { n: 3, size: .8, v: 420, cast: 'fingerPoint' }], ['팔 · 원거리 절단', 'r:getsuga', 'shrine', { size: 1.4, v: 380, cast: 'openPalm' }], ['개 · 화염 화살', 'r:arrow', 'fire', { size: 1.8, v: 380, pre: 'archer', cast: 'archer', u: 1 }],
      ['맨손 · 받아치기', 'c', 'cursed'], ['맨손 · 연속 타격', 'm', 'cursed', { n: 5 }], ['맨손 · 발차기', 'k', 'cursed'], ['맨손 · 잡아 내던지기', 'g', 'cursed'], ['해 · 근접 난도', 'w', 'shrine'],
      ['순간 접근 · 팔꿈치', 'd', 'cursed'], ['해 · 지면 갈라내기', 'a', 'shrine', { rad: 46 }]],
    nanami: [['칠할삼분 · 원거리 파편', 'r:orb', 'cursed', { n: 3, size: .6, v: 400 }], ['와라가라 · 붕괴 파편', 'r:orb', 'cursed', { n: 5, size: .7, v: 320 }], ['넥타이 · 감아 당기기', 'g', 'cursed'],
      ['칼 · 받아치기', 'c', 'cursed', { st: 'swordDown' }], ['둔기 칼 · 일격', 't2', 'cursed'], ['칠할삼분 · 약점 찌르기', 'i', 'cursed'], ['발차기 · 견제', 'k', 'cursed'], ['칼 · 회전 타격', 'w', 'cursed'],
      ['시간외 노동 · 돌진', 'd', 'cursed', { size: 1.4 }], ['흑섬 · 칼', 's', 'bflash', { u: 1 }]],
  };
  let added = 0, skipped = 0; const per = {};
  for (const key in L) { const c = CH[key]; if (!c) continue; per[key] = 0;
    for (const [nm, code, ek, o] of L[key]) { if (c.skills[nm]) { skipped++; continue; } const fn = build(key, nm, code, ek, o || {}); if (!fn) continue; c.skills[nm] = fn; added++; per[key]++; } }
  const ranged = Object.values(L).flat().filter(x => /^(r|at|y)/.test(x[1])).length, all = Object.values(L).flat().length;
  // ═══ 순수 근접 캐릭터 원천 차단: 등록 완료된 기술 중 원거리(T.ranged/shot/beam)를 무기 근접기로 치환 ═══
  const MELEE_STYLE = { tanjiro: 'sword', giyu: 'sword', rengoku: 'sword', sanemi: 'sword', obanai: 'sword', mitsuri: 'whip', muichiro: 'iai', zenitsu: 'iai', shinobu: 'thrust', uzui: 'dual', inosuke: 'claw', nezuko: 'kick', sanji: 'kick', kenpachi: 'greatsword', luffy: 'fist' };
  const PREP = { sword: ['swordLevel', 'swordDown'], iai: ['iai', 'iaiEnd'], thrust: ['swordLevel', 'point'], dual: ['xSwords', 'spreadSlash'], whip: ['xSwords', 'spreadSlash'], claw: ['xSwords', 'slash'], kick: ['kickPrep', 'highKick'], greatsword: ['twoHandSword', 'swordDown'], fist: ['punchPrep', 'punch'] };
  let meleeFixed = 0;
  for (const key in MELEE_STYLE) {
    const c = CH[key]; if (!c || !c.skills) continue;
    for (const nm in c.skills) {
      const fn = c.skills[nm];
      if (typeof fn === 'function' && /T\.ranged|shot\(|beam\(/.test(String(fn))) {
        const [prep, strike] = PREP[MELEE_STYLE[key]];
        const isUlt = /ult:\s*!0|ult:\s*true|u:\s*1/.test(String(fn));
        const ek = (ALLOW[key] || ['power'])[0];
        const nm2 = nm.replace(/ 원거리| 투척| 발사/g, ' 난격');
        c.skills[nm] = (a, b) => T.melee(a, b, nm2, ek, { prep, strike, arc: [-2.2, 1, 30], arcW: 9, n: 2, pw: 1.7, ult: isUlt });
        meleeFixed++;
      }
    }
  }
  window.MELEE_ONLY_FIXED = meleeFixed;
  window.SKILLS_MORE2 = { added, skipped, per, rangedShare: +(ranged / all).toFixed(2), counts: () => Object.fromEntries(Object.values(CH).map(c => [c.key, Object.keys(c.skills).length])) };
})();
