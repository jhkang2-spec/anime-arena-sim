// 주술회전(11-05): 주력·술식·영역전개. 원작 기술만, 모양은 코드로 만듦(이미지·모형 파일 없음).
(function () {
  const NW = window.NEWWORLD; if (!NW) return;
  NW.addWorld('jjk', { name: '주술회전', stroke: '#2a3a8a', dodge: '주력 강화 회피' }, ['yuji', 'megumi', 'nobara', 'gojo', 'sukuna', 'nanami']);
  // 주술고전 교복: 짙은 남색 깃 높은 상의·금 단추
  const school = (o) => Object.assign({ skin: '#f2d2b4', top: '#1a2038', top2: '#10142a', pants: '#1a2038', sandal: '#141418', sleeve: '#1a2038', belt: '#10142a', wrap: '#f4f4f8', coat: '#1a2038', coat2: '#10142a', glove: '#f2d2b4', band: '#10142a', plate: '#c8a040', eye: '#5a3a2a' }, o);
  Object.assign(PALS, {
    yuji: school({ hair: '#f0a0a8', hair2: '#3a2a2a', eye: '#a06a3a', top2: '#c81e2a' }),
    megumi: school({ hair: '#141822', hair2: '#24283a', eye: '#2a5a5a' }),
    nobara: school({ hair: '#b8642a', hair2: '#d07a3a', eye: '#a06a3a', top: '#1a2038', pants: '#1a2038' }),
    gojo: school({ hair: '#f4f6fa', hair2: '#ffffff', eye: '#6ad0ff', skin: '#f6dcc4' }),
    sukuna: school({ hair: '#f0a0a8', hair2: '#3a2a2a', eye: '#c81e2a', top: '#f4f2ea', top2: '#2a2a2a', pants: '#f4f2ea', sleeve: '#f4f2ea', wrap: '#2a2a2a' }),
    nanami: { hair: '#f0d890', hair2: '#f8e8b0', skin: '#efcfae', top: '#e8dcc0', top2: '#2a3a6a', pants: '#e8dcc0', sandal: '#5a3a24', eye: '#3a6a3a', sleeve: '#e8dcc0', belt: '#3a2a1a', wrap: '#2a3a6a', coat: '#e8dcc0', coat2: '#c8b890', glove: '#efcfae', band: '#2a3a6a', plate: '#c8a040' },
  });
  // 흑섬: 타격 순간 0.000001초 안 주력 — 검은 번개 + 붉은 섬광 + 공간 일그러짐
  const blackFlash = (a, b) => { const p = chest(b); for (let i = 0; i < 6; i++) bolt(p.clone().add(V3(R(-14, 14), R(-10, 14), R(-14, 14))), p.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), i % 2 ? '#0a0004' : '#ff2a2a', .5, 2.4); dome(p, 18, '#ff2a2a', '#000000'); ring(p, 8, '#ff2a2a', false, .6, 3); shake = Math.max(shake, 10); };
  const bf = (nm, op = {}) => withFx((a, b) => T.melee(a, b, nm, 'bflash', { prep: 'punchPrep', strike: 'punch', n: 1, pw: 2.2, ult: !!op.ult, ...op }), blackFlash);
  const shiki = (nm, kind, ek, op = {}) => (a, b) => [...seq(a, b, [['seal', .32, { aura: 1, elem: 'shadow2' }]]), ...T.ranged(a, b, nm, kind, ek, { size: 1.3, v: 230, prep: 'seal', cast: 'point', ...op })];
  const slashRain = (a, b, n, c) => { const p = chest(b); for (let i = 0; i < n; i++) pending.push({ t: i * .03, fn: () => mark(p.clone().add(V3(R(-12, 12), R(-12, 12), R(-12, 12))), R(0, PI), R(12, 26), c, .7, .5) }); };

  defChar('yuji', '이타도리', 'jjk', {
    '다이버전트 주먹(발산)': (a, b) => withFx((x, y) => T.melee(x, y, '다이버전트 주먹', 'cursed', { prep: 'punchPrep', strike: 'punch', n: 2 }), (x, y) => pending.push({ t: .35, fn: () => { const p = chest(y); ring(p, 6, '#3a6aff', false, .5, 2.6); explode(p, 'cursed', 1.2); } }))(a, b),
    '흑섬': bf('흑섬', { ult: true }),
    '흑섬 연속': (a, b) => [...bf('흑섬!')(a, b), ...bf('흑섬 · 연속')(a, b)],
    '만자차기': (a, b) => T.melee(a, b, '만자차기', 'cursed', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 2 }),
    '주력 강화 연타': (a, b) => T.melee(a, b, '주력 강화 · 연타', 'cursed', { prep: 'punchPrep', strike: 'punch', strike2: 'uppercut', n: 5 }),
    '팔꿈치 박치기': (a, b) => T.melee(a, b, '팔꿈치 치기', 'cursed', { prep: 'shoulder', strike: 'elbow', n: 1, pw: 1.4 }),
    '혈액 조작 · 천혈': (a, b) => T.ranged(a, b, '혈액 조작 · 천혈', 'arrow', 'blood', { size: .8, v: 420, prep: 'twoHand', cast: 'twoHand' }),
    '혈액 조작 · 초신성': (a, b) => T.ranged(a, b, '혈액 조작 · 초신성', 'orb', 'blood', { n: 4, size: .7, v: 260, prep: 'twoHand', cast: 'openPalm' }),
    '해(解)': (a, b) => withFx((x, y) => T.at(x, y, '해', 'shrine', 'petals', { pose: 'openPalm', pw: 1.5 }), (x, y) => slashRain(x, y, 8, '#ffe0e0'))(a, b),
    '드롭킥': (a, b) => [...seq(a, b, [['flipAir', .3, { vy: 220 }]]), ...T.aoe(a, b, '드롭킥', 'cursed', { jump: true, prep: 'flipAir', strike: 'kick', rad: 18, pw: 1.4 })],
    '던지기 · 투척': (a, b) => T.ranged(a, b, '돌 던지기', 'fireball', 'earth', { size: .6, v: 400, prep: 'punchPrep', cast: 'throw' }),
    '흑섬 · 각성': (a, b) => [...seq(a, b, [['braced', .5, { aura: 1, elem: 'bflash' }]]), ...T.buff(a, b, '흑섬 각성 · 존', 'bflash', { dur: 5, pose: 'braced' }), ...bf('흑섬 · 존', { ult: true })(a, b)],
  }, { name: '다이버전트 주먹', hand: null, elem: 'cursed', kind: 'getsuga' });
  defChar('megumi', '후시구로', 'jjk', {
    '십종영법술 · 옥견': (a, b) => withFx((x, y) => T.dash(x, y, '옥견 · 백·흑', null, 'shadow2', 1.3, false, { run: 'crouchRun', hold: 'seal' }), (x, y) => { for (let i = 0; i < 2; i++) burst(x.pos.clone().add(V3(i ? 6 : -6, 4, 0)), 18, i ? ['#0a0a12', '#2a2a40'] : ['#ffffff', '#d8d8e8'], 1, 0, 2); })(a, b),
    '십종영법술 · 누에': shiki('누에 · 번개 날개', 'arrow', 'bolt', { n: 2 }),
    '십종영법술 · 두꺼비': (a, b) => T.ranged(a, b, '두꺼비 · 혀 잡기', 'senbon', 'shadow2', { size: 1, v: 300, prep: 'seal', cast: 'point' }),
    '십종영법술 · 대사': (a, b) => [...seq(a, b, [['seal', .35, { aura: 1, elem: 'shadow2' }]]), ...T.at(a, b, '대사 · 땅에서 솟는 뱀', 'shadow2', 'flames', { pose: 'seal', pw: 1.6 })],
    '십종영법술 · 만상': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'water' }]]), ...T.sky(a, b, '만상 · 물 폭포', 'water', { w: 26 })],
    '십종영법술 · 탈토': (a, b) => withFx((x, y) => T.melee(x, y, '탈토 · 토끼 떼', 'shadow2', { prep: 'seal', strike: 'palm', n: 3 }), (x, y) => burst(x.pos.clone().add(V3(0, 4, 0)), 40, ['#ffffff', '#e8e8f0'], 1.4, 30, 1.6))(a, b),
    '십종영법술 · 원아': shiki('원아 · 사슴 정화', 'orb', 'light', { size: 1.4 }),
    '그림자 잠수': (a, b) => [step(.35, [[a, { pose: 'kneel', ghost: 1, face: b, to: near(a, b, 6) }], [b, { pose: 'stance', face: a }]], () => { ring(V3(a.pos.x, .3, a.pos.z), 6, '#1a1a2a', true, 1, 2.4); }), ...T.melee(a, b, '그림자 · 기습', 'shadow2', { prep: 'crouchRun', strike: 'uppercut', n: 1, pw: 1.4 })],
    '삼절곤 · 연타': (a, b) => T.melee(a, b, '삼절곤 연타', 'shadow2', { prep: 'xSwords', strike: 'spreadSlash', n: 4 }),
    '그림자 무기 창고 · 검': (a, b) => T.melee(a, b, '그림자 · 검', 'shadow2', { prep: 'iai', strike: 'iaiEnd', n: 2 }),
    '영역전개 · 감합암예정': (a, b) => [...seq(a, b, [['seal', .6, { aura: 1, elem: 'shadow2' }]]), step(.3, [[a, { pose: 'seal', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '영역전개 · 감합암예정', true); NW.domain(a, b, 'void', '감합암예정', 'shadow2'); }), ...T.aoe(a, b, '그림자 바다 · 습격', 'shadow2', { prep: 'seal', strike: 'palm', rad: 40, pw: 2 })],
    '조복의식 · 팔악검 이우 장군 마허라': (a, b) => [...seq(a, b, [['seal', .7, { aura: 1, elem: 'light' }]]), ...T.buff(a, b, '팔악검 이우 장군 마허라', 'light', { dur: 5, giant: '#e8e0d0', pose: 'skyRaise' }), ...T.aoe(a, b, '퇴마의 검', 'light', { prep: 'skyRaise', strike: 'hammerDown', rad: 46, pw: 2.4, ult: true })],
  }, { name: '옥견', hand: null, elem: 'shadow2', kind: 'getsuga' });
  defChar('nobara', '쿠기사키', 'jjk', {
    '추(簪)': (a, b) => withFx((x, y) => T.ranged(x, y, '추', 'senbon', 'nail', { n: 4, size: .7, v: 360, prep: 'punchPrep', cast: 'throw' }), (x, y) => pending.push({ t: .6, fn: () => { for (let i = 0; i < 4; i++) explode(chest(y).add(V3(R(-8, 8), R(-6, 6), R(-8, 8))), 'cursed', .9); } }))(a, b),
    '공명': (a, b) => [...seq(a, b, [['kneel', .45, { aura: 1, elem: 'nail' }]]), ...T.at(a, b, '공명 · 짚인형', 'cursed', 'flames', { pose: 'kneel', pw: 1.9, ult: true })],
    '망치 · 못 박기': (a, b) => T.melee(a, b, '망치 · 못 박기', 'nail', { prep: 'axe', strike: 'hammerDown', n: 2 }),
    '못 투척 · 연사': (a, b) => T.ranged(a, b, '못 연사', 'senbon', 'nail', { n: 6, size: .5, v: 400, prep: 'punchPrep', cast: 'throw' }),
    '흑섬': bf('흑섬 · 망치'),
    '망치 휘두르기': (a, b) => T.melee(a, b, '망치 휘두르기', 'nail', { prep: 'axe', strike: 'spreadSlash', n: 3 }),
    '공명 · 자기 몸': (a, b) => [...seq(a, b, [['kneel', .4, { aura: 1, elem: 'blood' }]]), ...T.at(a, b, '공명 · 내 몸을 통한 일격', 'blood', 'flames', { pose: 'kneel', pw: 1.7 })],
    '추 · 원거리 폭발': (a, b) => T.ranged(a, b, '추 · 폭발 못', 'orb', 'nail', { n: 2, size: .9, v: 300, prep: 'punchPrep', cast: 'throw' }),
    '발차기': (a, b) => T.melee(a, b, '쿠기사키 발차기', 'power', { prep: 'kickPrep', strike: 'highKick', n: 2 }),
    '박치기': (a, b) => T.melee(a, b, '박치기', 'power', { prep: 'shoulder', strike: 'shoulder', n: 1 }),
    '머리털 공명': (a, b) => T.at(a, b, '공명 · 머리카락', 'cursed', 'flames', { pose: 'stare', pw: 1.4 }),
    '못 비 · 추 난사': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'nail' }]]), ...T.sky(a, b, '추 · 못 비', 'nail', { w: 20 })],
  }, { name: '추', hand: null, elem: 'nail', kind: 'senbon' });
  defChar('gojo', '고죠', 'jjk', {
    '무하한': (a, b) => [step(.5, [[a, { pose: 'stance', aura: 1, elem: 'ao', face: b }], [b, { pose: 'punchPrep', face: a, to: near(b, a, 5) }]], () => { callout(a, '무하한', false); dome(chest(a), 12, '#9ad0ff', '#ffffff'); }), step(.4, [[a, { pose: 'stance', face: b }], [b, { pose: 'hurt', face: a }]], () => { label(headP(b), '닿지 않는다!', '#9ad0ff'); ring(chest(a), 6, '#6ad0ff', false, .8, 1.6); })],
    '술식순전 · 창(蒼)': (a, b) => withFx((x, y) => T.ranged(x, y, '술식순전 · 창', 'orb', 'ao', { size: 1.5, v: 200, prep: 'point', cast: 'point' }), (x, y) => pending.push({ t: .5, fn: () => { const p = chest(y); for (let i = 0; i < 30; i++) parts.push({ p: p.clone().add(V3(R(-30, 30), R(-10, 30), R(-30, 30))), v: p.clone().sub(p.clone().add(V3(R(-30, 30), 0, R(-30, 30)))).multiplyScalar(0), life: .7, c: pick(ELEM.ao.parts), g: 0, s: 2 }); ring(p, 12, '#2a8aff', false, .7, .3); } }))(a, b),
    '술식반전 · 혁(赫)': (a, b) => T.ranged(a, b, '술식반전 · 혁', 'orb', 'aka', { size: 1.6, v: 340, prep: 'point', cast: 'point' }),
    '허식 · 자(茈)': (a, b) => [...seq(a, b, [['armsWide', .45, { aura: 1, elem: 'ao' }], ['twoHand', .4, { aura: 1, elem: 'aka' }]]), ...T.ranged(a, b, '허식 · 자', 'bijuu', 'murasaki', { size: 3, v: 260, prep: 'twoHand', cast: 'point', ult: true })],
    '영역전개 · 무량공처': (a, b) => [...seq(a, b, [['seal', .55, { aura: 1, elem: 'cursed' }]]), step(.3, [[a, { pose: 'seal', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '영역전개 · 무량공처', true); NW.domain(a, b, 'void', '무량공처', 'ao'); }), step(.9, [[a, { pose: 'stare', face: b }], [b, { pose: 'kneel', face: a }]], () => label(headP(b), '무한한 정보에 멈춤', '#cfe0ff')), ...T.melee(a, b, '무량공처 · 일격', 'cursed', { prep: 'punchPrep', strike: 'punch', n: 3, pw: 2, ult: true })],
    '순간이동': (a, b) => [step(.12, [[a, { pose: 'stance', ghost: 1, face: b, to: near(a, b, 6) }], [b, { pose: 'stance', face: a }]], () => { ring(V3(a.pos.x, .3, a.pos.z), 5, '#9ad0ff', true, .5, 2); }), ...T.melee(a, b, '순간이동 · 일격', 'cursed', { prep: 'punchPrep', strike: 'punch', n: 1, pw: 1.5 })],
    '흑섬': bf('고죠 · 흑섬'),
    '주력 강화 타격': (a, b) => T.melee(a, b, '주력 강화 · 연타', 'cursed', { prep: 'punchPrep', strike: 'punch', strike2: 'highKick', n: 4 }),
    '창 · 끌어당기기': (a, b) => [step(.3, [[a, { pose: 'point', aura: 1, elem: 'ao', face: b }], [b, { pose: 'hurt', face: a, to: near(b, a, 8) }]], () => { callout(a, '창 · 끌어당김', false); ring(chest(a), 10, '#2a8aff', false, .6, .3); }), ...T.melee(a, b, '창 · 끌어당겨 때리기', 'ao', { prep: 'punchPrep', strike: 'punch', n: 1, pw: 1.6 })],
    '혁 · 최대 출력': (a, b) => [...seq(a, b, [['point', .45, { aura: 1, elem: 'aka' }]]), ...T.ranged(a, b, '혁 · 최대 출력', 'bijuu', 'aka', { size: 2.2, v: 380, prep: 'point', cast: 'point' })],
    '공중 부유': (a, b) => [step(.4, [[a, { pose: 'stance', vy: 200, face: b, aura: 1, elem: 'ao' }], [b, { pose: 'stance', face: a }]]), ...T.ranged(a, b, '공중 · 창 연사', 'orb', 'ao', { n: 3, size: .9, v: 260, prep: 'point', cast: 'point' })],
    '허식 · 자 (200%)': (a, b) => [...seq(a, b, [['seal', .6, { aura: 1, elem: 'murasaki' }]]), ...T.ranged(a, b, '허식 · 자 200%', 'bijuu', 'murasaki', { size: 4, v: 220, prep: 'twoHand', cast: 'point', ult: true })],
  }, { name: '창', hand: null, elem: 'ao', kind: 'orb' });
  defChar('sukuna', '스쿠나', 'jjk', {
    '해(解)': (a, b) => withFx((x, y) => T.at(x, y, '해', 'shrine', 'petals', { pose: 'openPalm', pw: 1.5 }), (x, y) => slashRain(x, y, 10, '#ffe0e0'))(a, b),
    '팔(捌)': (a, b) => withFx((x, y) => T.melee(x, y, '팔', 'shrine', { prep: 'openPalm', strike: 'palm', n: 1, pw: 2 }), (x, y) => pending.push({ t: .4, fn: () => { const p = chest(y); for (let i = 0; i < 3; i++) mark(p.clone().add(V3(0, i * 4 - 4, 0)), R(-.3, .3), 28, '#ff6a6a', 1, .6); } }))(a, b),
    '개(▢) · 후가': (a, b) => [...seq(a, b, [['archer', .55, { aura: 1, elem: 'fire' }]]), ...T.ranged(a, b, '개 · 후가', 'arrow', 'fire', { size: 2.4, v: 300, prep: 'archer', cast: 'archer', ult: true })],
    '영역전개 · 복마어주자': (a, b) => [...seq(a, b, [['seal', .55, { aura: 1, elem: 'shrine' }]]), step(.3, [[a, { pose: 'seal', face: b }], [b, { pose: 'stance', face: a }]], () => { callout(a, '영역전개 · 복마어주자', true); NW.domain(a, b, 'shrine', '복마어주자', 'shrine'); }), step(1.1, [[a, { pose: 'stare', face: b }], [b, { pose: 'hurt', face: a }]], () => { slashRain(a, b, 30, '#ffe0e0'); }), step(.2, [[a, { pose: 'stare', face: b }], [b, defSpec('hit')]], () => resolve(a, b, 'shrine', 'hit', '복마어주자', 2.6))],
    '세계를 가르는 참격': (a, b) => [...seq(a, b, [['seal', .5, { aura: 1, elem: 'shrine' }]]), ...T.ranged(a, b, '세계를 가르는 참격', 'getsuga', 'shrine', { size: 3, v: 500, prep: 'openPalm', cast: 'spreadSlash', ult: true })],
    '흑섬': bf('스쿠나 · 흑섬'),
    '맨손 격투': (a, b) => T.melee(a, b, '저주의 왕 · 맨손', 'shrine', { prep: 'punchPrep', strike: 'punch', strike2: 'highKick', n: 4 }),
    '해 · 연속': (a, b) => withFx((x, y) => T.at(x, y, '해 · 연속', 'shrine', 'petals', { pose: 'openPalm', pw: 1.3 }), (x, y) => slashRain(x, y, 18, '#ffd0d0'))(a, b),
    '팔 · 거대 참격': (a, b) => T.aoe(a, b, '팔 · 내려 가르기', 'shrine', { prep: 'openPalm', strike: 'spreadSlash', rad: 34, pw: 1.8 }),
    '반전술식 · 회복': (a, b) => [...seq(a, b, [['braced', .5, { aura: 1, elem: 'shrine' }]]), ...T.buff(a, b, '반전술식', 'shrine', { dur: 3, pose: 'braced' })],
    '불꽃 화살 · 연사': (a, b) => T.ranged(a, b, '개 · 불꽃 화살', 'fireball', 'fire', { n: 3, size: 1, v: 300, prep: 'archer', cast: 'archer' }),
    '마허라 소환': (a, b) => [...seq(a, b, [['seal', .65, { aura: 1, elem: 'light' }]]), ...T.buff(a, b, '팔악검 이우 장군 마허라', 'light', { dur: 4, giant: '#e8e0d0', pose: 'skyRaise' }), ...T.aoe(a, b, '퇴마의 검', 'light', { prep: 'skyRaise', strike: 'hammerDown', rad: 44, pw: 2.2 })],
  }, { name: '해', hand: null, elem: 'shrine', kind: 'getsuga' });
  defChar('nanami', '나나미', 'jjk', {
    '칠할삼분': (a, b) => withFx((x, y) => T.melee(x, y, '술식 · 칠할삼분', 'cursed', { prep: 'slashPrep', strike: 'swordDown', n: 1, pw: 1.8 }), (x, y) => pending.push({ t: .3, fn: () => { const p = chest(y); bolt(p.clone().add(V3(-10, 3, 0)), p.clone().add(V3(10, 3, 0)), '#ffd040', .6, 2); mark(p.clone().add(V3(0, 3, 0)), 0, 20, '#ffd040', 1, .6); } }))(a, b),
    '시간외 노동': (a, b) => [...seq(a, b, [['braced', .5, { aura: 1, elem: 'cursed' }]]), ...T.buff(a, b, '시간외 노동 · 주력 해방', 'cursed', { dur: 6, pose: 'braced' })],
    '와라가라(瓦落瓦落)': (a, b) => [...seq(a, b, [['axe', .45, { aura: 1, elem: 'earth' }]]), ...T.aoe(a, b, '확장술식 · 와라가라', 'earth', { prep: 'axe', strike: 'hammerDown', rad: 48, pw: 2.2, ult: true })],
    '둔기 칼 · 연타': (a, b) => T.melee(a, b, '둔기 칼 · 연타', 'cursed', { prep: 'slashPrep', strike: 'spreadSlash', n: 4 }),
    '흑섬 연속 4회': (a, b) => [...bf('흑섬')(a, b), ...bf('흑섬 · 4회 연속', { ult: true })(a, b)],
    '넥타이 감기': (a, b) => T.melee(a, b, '넥타이 감아 베기', 'cursed', { prep: 'slashPrep', strike: 'swordDown', n: 2 }),
    '주먹 · 약점 타격': (a, b) => T.melee(a, b, '약점 타격', 'cursed', { prep: 'punchPrep', strike: 'punch', n: 2, pw: 1.4 }),
    '돌진 베기': (a, b) => T.dash(a, b, '돌진 · 칠할삼분', null, 'cursed', 1.3, false, { run: 'crouchRun', hold: 'swordDown' }),
    '벽 파괴 · 파편': (a, b) => T.ranged(a, b, '파편 날리기', 'fireball', 'earth', { n: 3, size: .8, v: 320, prep: 'axe', cast: 'throw' }),
    '발차기': (a, b) => T.melee(a, b, '나나미 발차기', 'power', { prep: 'kickPrep', strike: 'kick', n: 2 }),
    '칠할삼분 · 정밀 베기': (a, b) => withFx((x, y) => T.melee(x, y, '칠할삼분 · 정밀', 'cursed', { prep: 'iai', strike: 'iaiEnd', n: 1, pw: 2 }), (x, y) => pending.push({ t: .3, fn: () => mark(chest(y), .2, 22, '#ffd040', 1, .6) }))(a, b),
    '어른의 책임': (a, b) => [...seq(a, b, [['braced', .45, { aura: 1, elem: 'bflash' }]]), ...bf('어른의 책임 · 흑섬')(a, b)],
  }, { name: '칠할삼분', hand: null, elem: 'cursed', kind: 'getsuga' });

  NW.sword('nanami', { L: 12, W: .9, c: '#e8e8ec', h: '#f4f4f8', g: '#2a3a6a' }); // 천으로 감은 둔기 칼
  if (window.registerCharAsset) {
    const uni = (x) => Object.assign({ coat: { c: '#1a2038', len: 'thigh', sleeves: true, closed: true }, shirt: '#1a2038' }, x);
    registerCharAsset('yuji', { body: 'n', cos: uni({ hood: '#c81e2a' }), hair: { s: 'spiky', n: 22, L: .55, tip: '#3a2a2a' }, face: 'round', facep: { es: 1.05, ba: .2, mk: [] } });
    registerCharAsset('megumi', { body: 'n', cos: uni(), hair: { s: 'spiky', n: 26, L: 1.0 }, face: 'sharp', facep: { jw: .9, jl: 1.04, es: .92, ba: .35 } });
    registerCharAsset('nobara', { body: 'f', cos: uni({ skirt: { c: '#1a2038', len: 'thigh' } }), hair: { s: 'bob', n: 20, L: .8 }, face: 'sharp', facep: { jw: .9, jl: .94, es: 1.1, ba: .25 } });
    registerCharAsset('gojo', { body: 'n', cos: uni(), hair: { s: 'spiky', n: 24, L: .9 }, face: 'calm', facep: { jw: .88, jl: 1.08, es: 1.05, ba: .05, mk: [] } });
    registerCharAsset('sukuna', { body: 'm', cos: { coat: { c: '#f4f2ea', len: 'ankle', sleeves: true }, sash: '#2a2a2a', scarf: '#2a2a2a' }, hair: { s: 'spiky', n: 22, L: .6, tip: '#3a2a2a' }, face: 'sharp', facep: { jl: 1.04, es: .9, ba: .5, bw: 1.1 } });
    registerCharAsset('nanami', { body: 'm', cos: { coat: { c: '#e8dcc0', len: 'thigh', sleeves: true }, shirt: '#2a3a6a', tie: '#e8c040' }, hair: { s: 'slick', n: 16, L: .6, acc: ['shades'] }, face: 'sleepy', facep: { jw: 1.02, jl: 1.08, es: .85, eh: .75, ba: .1 } });
  }
  NW.finish(Object.assign({}, NW.aotProf, { jjk: { lunge: 1.5, kb: 1.15, hs: 1.05, combo: .28 } }), Object.assign({}, NW.aotKeyp, { gojo: { lunge: 2.4, blink: 1, kb: 1.4 }, sukuna: { kb: 1.6, hs: 1.2 }, yuji: { combo: .4 } }));
})();
