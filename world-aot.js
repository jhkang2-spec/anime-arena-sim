// 진격의 거인(11-05): 조사병단 입체기동 + 아홉 거인의 힘. 원작 기술·행동만, 모양은 코드로 만듦(이미지·모형 파일 없음).
(function () {
  const NW = window.NEWWORLD; if (!NW) return;
  NW.addWorld('aot', { name: '진격의 거인', stroke: '#5a4a2a', dodge: '입체기동 회피' }, ['eren', 'mikasa', 'levi', 'armin', 'reiner', 'annie']);
  // 조사병단 제복: 짧은 갈색 재킷·흰 셔츠·흰 바지·갈색 장화·가죽 벨트(입체기동 장비)
  const corps = (o) => Object.assign({ skin: '#f0cfae', top: '#a8875a', top2: '#7a5a3a', pants: '#ecebe4', sandal: '#5a3a24', sleeve: '#a8875a', belt: '#4a3020', wrap: '#ecebe4', coat: '#2a5a3a', coat2: '#1e3e2a', glove: '#f0cfae', band: '#4a3020', plate: '#c8ccd8', eye: '#2a2a2a' }, o);
  Object.assign(PALS, {
    eren: corps({ hair: '#3a2618', hair2: '#4a3220', eye: '#2a9a6a' }),
    mikasa: corps({ hair: '#141418', hair2: '#26262e', eye: '#2a2a32', skin: '#f2d6be', wrap: '#c81e2a' }),
    levi: corps({ hair: '#121216', hair2: '#26262e', eye: '#5a6a7a', wrap: '#f4f4f8' }),
    armin: corps({ hair: '#f0d070', hair2: '#f8e4a0', eye: '#3a7ad0' }),
    reiner: corps({ hair: '#e0c070', hair2: '#f0d890', eye: '#c89a40', skin: '#eac6a0' }),
    annie: corps({ hair: '#f0d890', hair2: '#f8e8b0', eye: '#6aa0d0', top: '#e8e8ec', sleeve: '#e8e8ec', top2: '#c8c8d0' }),
  });
  const ODM = { L: 15, W: .7, cut: true, c: '#dfe6ee', h: '#5a5e68', g: '#3a3e48', dual: true }; // 교체식 직선 칼날(끝 비스듬)
  const gasP = (f, n) => { const budget = (typeof ftAvg === 'undefined' || ftAvg < 21) ? n : (n >> 1); for (let i = 0; i < budget; i++) parts.push({ p: f.pos.clone().add(V3(R(-1.8, 1.8), R(1.5, 8), R(-1.8, 1.8))), v: V3(R(-16, 16), R(-50, 6), R(-16, 16)), life: .5, c: '#e8eef6', g: 20, s: R(1.4, 2.8) }); };
  // 입체기동 진입(11-09): 측면 급상승 선회(밴킹·와이어) → 반대 밴킹 대각 다이빙 + 스핀 — 그대로 떠 있지 않고 궤적으로 파고든다
  const air = (a, b, d = .3) => {
    const sgn = Math.random() < .5 ? 1 : -1, side = R(18, 30), tilt = sgn * R(.8, 1.3), dd = fwdOf(b);
    const F1 = V3(b.pos.x + dd.z * side * sgn, 0, b.pos.z - dd.x * side * sgn);
    const D1 = V3(b.pos.x + dd.z * side * .3 * sgn - dd.x * 5, 0, b.pos.z - dd.x * side * .3 * sgn - dd.z * 5);
    return [step(.32, [[a, { pose: 'flipAir', to: () => F1, vy: R(150, 230), tilt, face: b, ghost: 1 }], [b, { pose: 'stance', face: a }]], () => { try { NW.wire(a, V3(F1.x + R(-8, 8), R(44, 76), F1.z + R(-8, 8))); } catch (e) { } gasP(a, 8); }),
    step(d, [[a, { pose: 'flipAir', to: () => D1, vy: R(-80, 30), tilt: -tilt * .8, spin: R(8, 14) * sgn, face: b, ghost: 1 }], [b, { pose: 'stance', face: a }]], () => { try { NW.wire(a, chest(b).add(V3(R(-14, 14), R(26, 44), R(-14, 14)))); } catch (e) { } gasP(a, 6); })];
  };
  const odmCut = (nm, ek, op = {}) => (a, b) => {
    const sgn = Math.random() < .5 ? 1 : -1, dd = fwdOf(b), side = R(16, 26);
    const PAST = V3(b.pos.x - dd.z * side * sgn, 0, b.pos.z + dd.x * side * sgn); // 베고 적 반대편을 지나 빠져나감(스윙어라운드)
    return [...air(a, b), ...T.melee(a, b, nm, ek, { prep: 'xSwords', strike: 'spreadSlash', arc: [-2.2, 1.4, 28], arcW: 8, n: op.n || 2, reach: 6, ...op }),
    step(.3, [[a, { pose: 'crouchRun', to: () => PAST, face: b, tilt: sgn * .4 }], [b, { pose: 'stance', face: a }]], () => { try { ring(V3(a.pos.x, .3, a.pos.z), 5, '#dfe8f2', false, .5, 1.4); } catch (e) { } })];
  };
  const spear = (nm, n = 1) => (a, b) => [...T.ranged(a, b, nm, 'arrow', 'spear', { n, size: 1.2, v: 330, prep: 'point', cast: 'throw' })].concat([step(.2, [[a, { pose: 'guard', face: b }], [b, { pose: 'stance', face: a }]], () => { const p = chest(b); explode(p, 'spear', 1.8); ring(V3(p.x, .3, p.z), 6, '#ffb040', true, 1, 3); })]);
  const titanFist = (nm, ek, pw = 1.8) => (a, b) => T.aoe(a, b, nm, ek, { prep: 'punchPrep', strike: 'hammerDown', rad: 34, pw, reach: 14 });

  defChar('eren', '에렌', 'aot', {
    '입체기동 · 목덜미 베기': odmCut('입체기동 · 목덜미 베기', 'odm', { n: 2 }),
    '입체기동 · 회전 돌진': (a, b) => [...air(a, b), ...T.dash(a, b, '입체기동 · 회전 돌진', null, 'odm', 1.2, false, { run: 'flipAir' })],
    '가스 분사 회피 베기': odmCut('가스 분사 · 역습 베기', 'vapor', { n: 1, prep: 'iai', strike: 'iaiEnd' }),
    '뇌창': spear('뇌창 투척'),
    '와이어 앵커 견제': (a, b) => T.ranged(a, b, '와이어 앵커', 'senbon', 'odm', { n: 2, size: .7, v: 380, prep: 'point', cast: 'throw' }),
    '거인화 · 진격의 거인': (a, b) => NW.titanBuff(a, b, '진격의 거인', 'titan', 'titan_attack', 2.6, 7, 'skyRaise'),
    '진격의 거인 · 주먹': titanFist('진격의 거인 · 주먹', 'titan', 2),
    '진격의 거인 · 경질화 주먹': titanFist('경질화 주먹', 'harden', 2.3),
    '진격의 거인 · 포효': (a, b) => T.aoe(a, b, '진격의 거인 · 포효', 'vapor', { prep: 'braced', strike: 'braced', rad: 46, pw: 1.2, reach: 30 }),
    '지면 경질화 가시': (a, b) => [...seq(a, b, [['kneel', .35, { aura: 1, elem: 'harden' }]]), ...T.at(a, b, '경질화 · 결정 가시', 'harden', 'ice', { pose: 'kneel', pw: 1.8 })],
    '시조의 힘 · 좌표': (a, b) => [...seq(a, b, [['skyRaise', .5, { aura: 1, elem: 'titan' }]]), ...T.sky(a, b, '시조의 힘 · 땅울림', 'titan', { ult: true, w: 30 })],
    '격투 · 잡아 넘기기': (a, b) => T.melee(a, b, '격투 · 잡아 넘기기', 'power', { prep: 'shoulder', strike: 'palm', n: 2 }),
  }, { name: '목덜미 베기', hand: null, elem: 'odm', kind: 'getsuga' });
  defChar('mikasa', '미카사', 'aot', {
    '쌍검 연속 베기': odmCut('쌍검 연속 베기', 'odm', { n: 4 }),
    '아커만 회전 베기': (a, b) => [...air(a, b), ...T.aoe(a, b, '아커만 · 회전 베기', 'odm', { jump: true, prep: 'flipAir', strike: 'spreadSlash', rad: 30, pw: 1.6, spin: 22 })],
    '목덜미 일섬': odmCut('목덜미 일섬', 'odm', { n: 1, prep: 'iai', strike: 'iaiEnd', pw: 1.8 }),
    '공중 연속 회전': (a, b) => [...air(a, b, .25), ...air(a, b, .25), ...T.melee(a, b, '공중 연속 회전 베기', 'odm', { prep: 'xSwords', strike: 'spreadSlash', n: 3, spin: 18 })],
    '뇌창': spear('뇌창 연사', 2),
    '칼날 교체 난도': odmCut('칼날 교체 · 난도', 'odm', { n: 5 }),
    '와이어 끌어당기기': (a, b) => [...air(a, b), ...T.dash(a, b, '와이어 · 끌어당겨 베기', null, 'odm', 1.1, false, { run: 'crouchRun' })],
    '가스 분사 회피': (a, b) => [...air(a, b, .4), ...T.melee(a, b, '가스 분사 · 반격', 'vapor', { prep: 'iai', strike: 'iaiEnd', n: 1 })],
    '맨손 격투': (a, b) => T.melee(a, b, '맨손 격투', 'power', { prep: 'punchPrep', strike: 'kick', strike2: 'highKick', n: 3 }),
    '발목 베기': odmCut('발목 베기', 'odm', { n: 2, prep: 'crouchRun', strike: 'sweep' }),
    '목덜미 베기 · 낙하': (a, b) => [...air(a, b), ...T.aoe(a, b, '낙하 · 목덜미 베기', 'odm', { jump: true, prep: 'flipAir', strike: 'swordDown', rad: 24, pw: 1.7 })],
    '아커만의 각성': (a, b) => [...seq(a, b, [['braced', .45, { aura: 1, elem: 'odm' }]]), ...T.buff(a, b, '아커만의 힘 · 각성', 'odm', { dur: 5, pose: 'braced' }), ...odmCut('각성 · 난도', 'odm', { n: 6, ult: true })(a, b)],
  }, { name: '쌍검 베기', hand: null, elem: 'odm', kind: 'getsuga' });
  defChar('levi', '리바이', 'aot', {
    '회전 베기': (a, b) => [...air(a, b), ...T.aoe(a, b, '회전 베기', 'odm', { jump: true, prep: 'flipAir', strike: 'spreadSlash', rad: 32, pw: 1.8, spin: 30, ult: true })],
    '역수 쌍검 난도': odmCut('역수 쌍검 · 난도', 'odm', { n: 6 }),
    '와이어 고속 기동': (a, b) => [...air(a, b, .2), ...air(a, b, .2), ...T.dash(a, b, '고속 기동 · 일격', null, 'odm', 1.2, false, { run: 'crouchRun', hold: 'iaiEnd' })],
    '눈 베기': odmCut('짐승 거인 · 눈 베기', 'odm', { n: 2, prep: 'iai', strike: 'iaiEnd' }),
    '뇌창 일제 투척': spear('뇌창 · 일제 투척', 3),
    '칼날 교체': (a, b) => [...seq(a, b, [['xSwords', .3, { aura: 1, elem: 'odm' }]]), ...odmCut('칼날 교체 · 연속 베기', 'odm', { n: 3 })(a, b)],
    '사지 절단': odmCut('사지 절단', 'odm', { n: 4, arc: [-2.6, 1.6, 34] }),
    '공중 낙하 베기': (a, b) => [...air(a, b), ...T.aoe(a, b, '낙하 베기', 'odm', { jump: true, prep: 'flipAir', strike: 'swordDown', rad: 22, pw: 1.6 })],
    '발차기': (a, b) => T.melee(a, b, '리바이 발차기', 'power', { prep: 'kickPrep', strike: 'highKick', n: 2 }),
    '신호탄': (a, b) => T.ranged(a, b, '신호탄', 'fireball', 'spear', { size: .6, v: 260, prep: 'point', cast: 'point' }),
    '가스 분사 회피': (a, b) => [...air(a, b, .4), ...T.melee(a, b, '가스 분사 · 반격', 'vapor', { prep: 'iai', strike: 'iaiEnd', n: 2 })],
    '인류 최강 · 난도': (a, b) => [...air(a, b, .2), ...air(a, b, .2), ...odmCut('인류 최강 · 회전 난도', 'odm', { n: 8, ult: true, spin: 24 })(a, b)],
  }, { name: '회전 베기', hand: null, elem: 'odm', kind: 'getsuga' });
  defChar('armin', '아르민', 'aot', {
    '거인화 · 초대형 거인': (a, b) => NW.titanBuff(a, b, '초대형 거인', 'titan', 'titan_colossal', 3.2, 7, 'skyRaise'),
    '초대형 거인 · 열풍 증기': (a, b) => T.aoe(a, b, '초대형 거인 · 증기 방출', 'vapor', { prep: 'braced', strike: 'braced', rad: 52, pw: 1.4, reach: 34 }),
    '초대형 거인 · 거인화 폭발': (a, b) => [...seq(a, b, [['skyRaise', .45, { aura: 1, elem: 'titan' }]]), ...T.aoe(a, b, '거인화 폭발', 'titan', { prep: 'skyRaise', strike: 'hammerDown', rad: 60, pw: 2.4, ult: true })],
    '초대형 거인 · 내려치기': titanFist('초대형 거인 · 내려치기', 'titan', 2.2),
    '초대형 거인 · 걷어차기': (a, b) => T.melee(a, b, '초대형 거인 · 걷어차기', 'titan', { prep: 'kickPrep', strike: 'kick', n: 1, pw: 2 }),
    '뇌창': spear('뇌창'),
    '입체기동 · 베기': odmCut('입체기동 · 베기', 'odm', { n: 1 }),
    '작전 · 미끼': (a, b) => [...air(a, b, .3), ...T.ranged(a, b, '신호탄 · 교란', 'fireball', 'spear', { size: .6, v: 260, prep: 'point' })],
    '와이어 앵커 견제': (a, b) => T.ranged(a, b, '와이어 앵커', 'senbon', 'odm', { n: 2, size: .7, v: 380, prep: 'point', cast: 'throw' }),
    '증기 장벽': (a, b) => [...seq(a, b, [['braced', .4, { aura: 1, elem: 'vapor' }]]), ...T.at(a, b, '증기 장벽', 'vapor', 'flames', { pose: 'braced', pw: 1.2 })],
    '초대형 거인 · 잡아 던지기': (a, b) => T.melee(a, b, '초대형 거인 · 잡아 던지기', 'titan', { prep: 'shoulder', strike: 'palm', n: 1, pw: 2 }),
    '열폭풍': (a, b) => [...seq(a, b, [['skyRaise', .5, { aura: 1, elem: 'vapor' }]]), ...T.sky(a, b, '초대형 거인 · 열폭풍', 'vapor', { ult: true, w: 34 })],
  }, { name: '증기', hand: null, elem: 'vapor', kind: 'fireball' });
  defChar('reiner', '라이너', 'aot', {
    '거인화 · 갑옷 거인': (a, b) => NW.titanBuff(a, b, '갑옷 거인', 'harden', 'titan_armored', 2.5, 7, 'braced'),
    '갑옷 거인 · 돌진 태클': (a, b) => T.dash(a, b, '갑옷 거인 · 돌진', null, 'harden', 1.8, false, { run: 'crouchRun', hold: 'shoulder' }),
    '갑옷 거인 · 경질화 펀치': titanFist('경질화 펀치', 'harden', 2.1),
    '갑옷 거인 · 어깨 박치기': (a, b) => T.melee(a, b, '갑옷 거인 · 어깨 박치기', 'harden', { prep: 'shoulder', strike: 'shoulder', n: 1, pw: 1.9 }),
    '갑옷 거인 · 잡아 조르기': (a, b) => T.melee(a, b, '갑옷 거인 · 조르기', 'harden', { prep: 'punchPrep', strike: 'palm', n: 2 }),
    '경질화 · 팔 갑옷': (a, b) => [...seq(a, b, [['crossArms', .35, { aura: 1, elem: 'harden' }]]), ...T.melee(a, b, '경질화 · 팔 막기 반격', 'harden', { prep: 'crossArms', strike: 'punch', n: 2 })],
    '경질화 해제 · 기동': (a, b) => T.dash(a, b, '경질화 해제 · 고속 돌진', null, 'vapor', 1.4, false, { run: 'run' }),
    '포효': (a, b) => T.aoe(a, b, '갑옷 거인 · 포효', 'vapor', { prep: 'braced', strike: 'braced', rad: 40, pw: 1.1, reach: 28 }),
    '격투 · 레슬링': (a, b) => T.melee(a, b, '격투 · 메치기', 'power', { prep: 'shoulder', strike: 'palm', n: 2 }),
    '라이너 발차기': (a, b) => T.melee(a, b, '발차기', 'power', { prep: 'kickPrep', strike: 'kick', n: 2 }),
    '거인화 · 낙하 착지': (a, b) => [...seq(a, b, [['flipAir', .35, { aura: 1, elem: 'harden' }]]), ...T.aoe(a, b, '갑옷 거인 · 낙하', 'harden', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 50, pw: 2.2, ult: true })],
    '전사 · 대포 돌격': (a, b) => [...T.dash(a, b, '갑옷 거인 · 전사 돌격', null, 'harden', 2.2, true, { run: 'crouchRun', hold: 'shoulder' })],
  }, { name: '돌진', hand: null, elem: 'harden', kind: 'fireball' });
  defChar('annie', '애니', 'aot', {
    '로우킥': (a, b) => T.melee(a, b, '로우킥', 'power', { prep: 'kickPrep', strike: 'sweep', n: 2 }),
    '하이킥': (a, b) => T.melee(a, b, '하이킥', 'power', { prep: 'kickPrep', strike: 'highKick', n: 1, pw: 1.4 }),
    '서브미션 · 관절 꺾기': (a, b) => T.melee(a, b, '관절 꺾기', 'power', { prep: 'shoulder', strike: 'palm', n: 2 }),
    '거인화 · 여성형 거인': (a, b) => NW.titanBuff(a, b, '여성형 거인', 'titan', 'titan_female', 2.4, 7, 'braced'),
    '여성형 거인 · 경질화 킥': (a, b) => T.melee(a, b, '여성형 거인 · 경질화 킥', 'harden', { prep: 'kickPrep', strike: 'highKick', n: 1, pw: 2.1 }),
    '여성형 거인 · 경질화 주먹': titanFist('경질화 주먹', 'harden', 2),
    '여성형 거인 · 목덜미 방어': (a, b) => [...seq(a, b, [['crossArms', .35, { aura: 1, elem: 'harden' }]]), ...T.at(a, b, '목덜미 경질화', 'harden', 'ice', { pose: 'crossArms', pw: 1.3 })],
    '여성형 거인 · 비명': (a, b) => [...seq(a, b, [['skyRaise', .45, { aura: 1, elem: 'vapor' }]]), ...T.aoe(a, b, '여성형 거인 · 비명(거인 부르기)', 'vapor', { prep: 'skyRaise', strike: 'braced', rad: 56, pw: 1.6, ult: true })],
    '여성형 거인 · 질주': (a, b) => T.dash(a, b, '여성형 거인 · 질주', null, 'titan', 1.6, false, { run: 'run' }),
    '수정체 경질화': (a, b) => [...seq(a, b, [['kneel', .5, { aura: 1, elem: 'harden' }]]), ...T.buff(a, b, '수정체 경질화', 'harden', { dur: 3, pose: 'kneel' })],
    '반지 칼날': (a, b) => T.melee(a, b, '반지 칼날 · 손 베기', 'odm', { prep: 'punchPrep', strike: 'palm', n: 1 }),
    '격투 · 업어치기': (a, b) => T.melee(a, b, '업어치기', 'power', { prep: 'shoulder', strike: 'palm', n: 1, pw: 1.5 }),
  }, { name: '하이킥', hand: null, elem: 'harden', kind: 'getsuga' });

  ['eren', 'mikasa', 'levi'].forEach(k => NW.sword(k, ODM));
  // 몸(남/녀·근육)·제복·머리·얼굴 — 모션 캡처 몸 레지스트리
  if (window.registerCharAsset) {
    const corpsCos = (x) => Object.assign({ coat: { c: '#a8875a', len: 'thigh', sleeves: true }, cape: '#2a5a3a', shirt: '#ecebe4', sash: '#4a3020', boots: '#5a3a24' }, x);
    const titanForm = (tint, k, shell) => ({ tint, tintK: k, shell: shell || { c: '#fff0d8', o: .2, t: .02 }, eye: '#2a9a6a' });
    registerCharAsset('eren', { body: 'n', cos: corpsCos(), hair: { s: 'messy', n: 22, L: .95 }, face: 'sharp', facep: { jl: 1.04, es: .98, ba: .45, bw: 1.15 },
      forms: { titan_attack: { tint: '#c27a5c', tintK: .04, shell: { c: '#ffb08a', o: .035, t: .015 }, build: NW.titanBuild('attack') } } });
    registerCharAsset('mikasa', { body: 'f', cos: corpsCos({ scarf: '#c81e2a' }), hair: { s: 'bob', n: 22, L: .8 }, face: 'calm', facep: { jw: .9, jl: 1.0, es: 1.0, ba: .2, mk: [] } });
    registerCharAsset('levi', { body: 'n', cos: corpsCos({ tie: '#f4f4f8' }), hair: { s: 'short', n: 18, L: .55 }, face: 'sleepy', facep: { jw: .9, jl: 1.02, es: .82, eh: .7, ba: .3 } });
    registerCharAsset('armin', { body: 'n', cos: corpsCos(), hair: { s: 'bob', n: 22, L: .85 }, face: 'round', facep: { jw: .9, jl: .96, es: 1.15, ba: -.05 },
      forms: { titan_colossal: { tint: '#9a2a22', tintK: .04, shell: { c: '#ffb08a', o: .06, t: .03 }, build: NW.titanBuild('colossal') } } });
    registerCharAsset('reiner', { body: 'm', cos: corpsCos(), hair: { s: 'short', n: 18, L: .45 }, face: 'sharp', facep: { jw: 1.08, jl: 1.06, es: .9, ba: .2, bw: 1.25 },
      forms: { titan_armored: { tint: '#efe6cc', tintK: .04, shell: { c: '#ffffff', o: .4, t: .05 }, build: NW.titanBuild('armored') } } });
    registerCharAsset('annie', { body: 'f', cos: { shirt: '#e8e8ec', coat: { c: '#e8e8ec', len: 'thigh', sleeves: true }, boots: '#5a3a24' }, hair: { s: 'pony', n: 20, L: .7 }, face: 'sleepy', facep: { jw: .9, es: .95, eh: .78, ba: .1 },
      forms: { titan_female: { tint: '#d89a7a', tintK: .04, shell: { c: '#cfe8ff', o: .08, t: .025 }, build: NW.titanBuild('female') } } });
  }
  NW.aotProf = { aot: { lunge: 1.9, kb: 1.15, hs: 1, combo: .25, blink: 1 } };
  NW.aotKeyp = { levi: { lunge: 2.4, combo: .4 }, mikasa: { lunge: 2.2, combo: .35 }, reiner: { kb: 1.6 }, armin: { kb: 1.7 } };
})();
