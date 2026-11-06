// ═══ 추가 기술: 캐릭터마다 8~10개, 근접·돌진·원거리·광역·하늘·지정·강화·광선 고루 ═══
(function () {
  try { if (!CH || !T) return; } catch (e) { return; } // arena.js 가 못 떴으면 조용히 건너뜀
  // 광선(빔) 기술: 준비 자세 → 발사 자세로 쭉 뻗는 광선 + 맞은 자리 폭발
  const beam = (nm, ek, o = {}) => (a, b) => {
    const out = pick(['hit', 'dodge', 'block', 'hit', 'jump']), E = ELEM[ek];
    return [
      step(o.wind || .3, [[a, { pose: o.prep || 'twoHand', aura: 1, elem: ek, face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, nm, o.ult)),
      step(o.dur || .5, [[a, { pose: o.cast || 'openPalm', k: 90, face: b, elem: ek, fwd: -20 }], [b, defSpec(out)]], () => {
        add({ k: 'beam', f: a, t: b, r: o.r || 2.4, c: o.c || E.c, c2: o.c2 || '#ffffff', ek, life: o.life || .7 });
        if (o.cross) add({ k: 'beam', f: a, t: b, r: (o.r || 2.4) * .5, c: '#ffffff', c2: E.c, ek, life: (o.life || .7) * .8 });
        light(chest(a), E.c, o.ult ? 8 : 4);
        pending.push({ t: .15, fn: () => resolve(a, b, ek, out, nm + '!', o.pw || 1.3) });
        if (o.ult) pending.push({ t: .3, fn: () => ultBlast(chest(b), ek, o.rad || 55, a, nm + '!') });
      }),
      step(.2, [[a, { pose: 'guard', face: b }], [b, { pose: out === 'hit' ? 'hurt' : 'guard', face: a }]])];
  };
  // 준비 동작(seq) + 기술 틀을 한 줄로
  const pre = (list, fn) => (a, b) => [...seq(a, b, list), ...fn(a, b)];
  const wf = (fn, c) => (typeof withFx === 'function' ? withFx(fn, (a, b) => { for (let i = 0; i < 3; i++) pending.push({ t: i * .07, fn: () => { add({ k: 'spiral', p: chest(a), c, life: .9 }); ring(chest(a), 3 + i * 2, i % 2 ? '#ffffff' : c, false, .8, 2); } }); }) : fn);
  const add2 = (key, sk) => { if (CH[key]) Object.assign(CH[key].skills, sk); };

  // ── 나루토 세계 ──
  add2('naruto', {
    '다중 그림자 분신술': (a, b) => [step(.3, [[a, { pose: 'crossArms', aura: 1, face: b, k: 70 }], [b, { pose: 'stance', face: a }]], () => { callout(a, '다중 그림자 분신술'); for (let i = 0; i < 6; i++) pending.push({ t: i * .05, fn: () => spawnClone(a, b) }); }), ...T.melee(a, b, '우즈마키 나루토 연탄', 'wind', { n: 4, prep: 'kickPrep', strike: 'highKick', strike2: 'kick', arc: [1.2, -1.6, 18] })],
    '선인 모드': pre([['kneel', .4, { aura: 1, elem: 'kurama' }]], (a, b) => T.buff(a, b, '선인 모드', 'kurama', { dur: 6, pose: 'openArms' })),
    '초대옥나선수리검': pre([['skyRaise', .45, { hand: 'rasen', handSize: 2.4, aura: 1, elem: 'wind' }]], (a, b) => T.ranged(a, b, '선술 · 초대옥나선수리검', 'rasenshuriken', 'wind', { size: 2.6, v: 170, from: fromHigh, prep: 'throwPrep', cast: 'throw', ult: true })),
  });
  add2('sasuke', {
    '치도리 천본': pre([['crouchRun', .25, { hand: 'chidori', aura: 1, elem: 'bolt' }]], (a, b) => T.ranged(a, b, '치도리 천본', 'senbon', 'bolt', { n: 10, size: 1, v: 340, prep: 'openPalm', cast: 'skySweep' })),
    '치도리 예창': beam('치도리 예창', 'bolt', { prep: 'crouchRun', cast: 'palm', r: 1.4, life: .55, pw: 1.4 }),
    '염둔 가구츠치': pre([['eyeHand', .35, { aura: 1, elem: 'dark' }]], (a, b) => T.at(a, b, '염둔 · 가구츠치', 'dark', 'flames', { pose: 'openPalm', pw: 1.8, ult: true })),
  });
  add2('kakashi', {
    '천년살': (a, b) => T.melee(a, b, '나뭇잎 비전 체술 오의 · 천년살', 'power', { prep: 'seal', strike: 'punch', pw: .9, reach: 6 }),
    '토둔 토류벽': pre([['seal', .2], ['hammerDown', .25, { aura: 1, elem: 'earth' }]], (a, b) => T.aoe(a, b, '토둔 · 토류벽', 'earth', { prep: 'seal', strike: 'hammerDown', rad: 36 })),
    '뇌둔 자전': beam('뇌둔 · 자전', 'bolt', { prep: 'eyeHand', cast: 'fingerPoint', c: '#c080ff', r: 1.6, pw: 1.5 }),
    '닌견 추적': pre([['thumbBite', .25, { aura: 1 }], ['hammerDown', .2, { aura: 1, elem: 'earth' }]], (a, b) => T.ranged(a, b, '구치요세 · 닌견 추적', 'orb', 'earth', { n: 6, size: 1.1, v: 220, prep: 'hammerDown', cast: 'point' })),
    '카무이 수리검': pre([['eyeHand', .25, { aura: 1, elem: 'dark' }]], (a, b) => T.ranged(a, b, '카무이 수리검', 'senbon', 'dark', { n: 6, size: 1.2, v: 300, prep: 'throwPrep', cast: 'throw' })),
    '수둔 수교탄': pre([['seal', .2], ['twoHand', .25, { aura: 1, elem: 'water' }]], (a, b) => T.ranged(a, b, '수둔 · 수교탄의 술', 'bijuu', 'water', { size: 1.9, v: 190, prep: 'twoHand', cast: 'palm' })),
  });
  add2('sakura', {
    '사쿠라 돌격': wf((a, b) => T.dash(a, b, '괴력 돌격', null, 'earth', 1.4, false, { run: 'crouchRun' }), ELEM['earth'].c),
    '백호인 해방': pre([['seal', .3, { aura: 1, elem: 'petal' }]], (a, b) => T.buff(a, b, '음봉인 해방 · 백호인', 'petal', { giant: '#c080ff', dur: 5, pose: 'openArms' })),
    '카츠유 소환': pre([['thumbBite', .3, { aura: 1 }], ['hammerDown', .25, { aura: 1, elem: 'water' }]], (a, b) => T.aoe(a, b, '구치요세 · 카츠유', 'water', { prep: 'hammerUp', strike: 'hammerDown', rad: 50, pw: 1.8, ult: true })),
    '쿠나이 투척': (a, b) => T.ranged(a, b, '쿠나이 투척', 'senbon', 'metal', { n: 5, size: 1.2, v: 320, prep: 'throwPrep', cast: 'throw' }),
    '의료 인술': pre([['openPalm', .35, { aura: 1, elem: 'psychic' }]], (a, b) => T.buff(a, b, '의료 인술 · 장선술', 'psychic', { dur: 3, pose: 'openPalm' })),
    '괴력 발차기': (a, b) => T.melee(a, b, '괴력 내려찍기 발차기', 'earth', { prep: 'kickPrep', strike: 'axe', arc: [-1.6, 1.0, 20], arcW: 8, pw: 1.8 }),
  });
  add2('gaara', {
    '사박궤': pre([['openPalm', .3, { aura: 1, elem: 'sand' }]], (a, b) => T.at(a, b, '사박궤', 'sand', 'vortex', { pose: 'openPalm', pw: 1.3 })),
    '모래 방패': pre([['crossArms', .3, { aura: 1, elem: 'sand' }]], (a, b) => T.buff(a, b, '절대 방어 · 모래 방패', 'sand', { giant: '#e0c080', dur: 4, pose: 'crossArms' })),
    '모래 쓰나미': pre([['armsWide', .35, { aura: 1, elem: 'sand' }]], (a, b) => T.aoe(a, b, '사둔 · 모래 쓰나미', 'sand', { prep: 'skyRaise', strike: 'skySweep', rad: 56, pw: 1.8 })),
    '모래 창': pre([['fingerPoint', .25, { aura: 1, elem: 'sand' }]], (a, b) => T.ranged(a, b, '모래 창', 'arrow', 'sand', { n: 3, size: 1.3, v: 300, prep: 'fingerPoint', cast: 'point' })),
    '사막 층대': (a, b) => T.sky(a, b, '사둔 · 사막 층대', 'sand', {}),
    '모래 손': (a, b) => T.melee(a, b, '모래 손 · 사박', 'sand', { prep: 'openPalm', strike: 'palm', n: 3, reach: 14, pw: 1.2 }),
  });
  add2('itachi', {
    '수리검 술': (a, b) => T.ranged(a, b, '수리검 술', 'senbon', 'metal', { n: 8, size: 1, v: 330, prep: 'throwPrep', cast: 'throw' }),
    '까마귀 분신': pre([['crossArms', .3, { aura: 1, elem: 'dark' }]], (a, b) => T.at(a, b, '까마귀 분신술', 'dark', 'vortex', { pose: 'openArms', pw: 1.2 })),
    '수둔 수교탄': pre([['seal', .2], ['twoHand', .25, { aura: 1, elem: 'water' }]], (a, b) => T.ranged(a, b, '수둔 · 수교탄의 술', 'bijuu', 'water', { size: 2, v: 190, prep: 'twoHand', cast: 'palm' })),
    '야타의 거울': pre([['openPalm', .3, { aura: 1, elem: 'hollow' }]], (a, b) => T.buff(a, b, '야타의 거울', 'hollow', { giant: '#ff4a3a', dur: 4, pose: 'crossArms' })),
    '봉선화 손톱 홍': pre([['seal', .15], ['mouthSeal', .25, { aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '화둔 · 봉선화 손톱 홍', 'fireball', 'fire', { n: 6, size: .9, v: 260, from: fromHead, prep: 'mouthSeal', cast: 'blow' })),
  });
  add2('gai', {
    '나뭇잎 대선풍': pre([['spinKick', .3, { spin: 24, aura: 1, elem: 'wind' }]], (a, b) => T.aoe(a, b, '나뭇잎 대선풍', 'wind', { prep: 'kickPrep', strike: 'spinKick', rad: 34, spin: 26 })),
    '낮 호랑이': pre([['braced', .35, { aura: 1, elem: 'kurama' }]], (a, b) => T.ranged(a, b, '팔문둔갑 · 낮 호랑이', 'bijuu', 'wind', { size: 2.6, v: 200, prep: 'braced', cast: 'palm', ult: true })),
    '팔문둔갑 경문': pre([['kneel', .3, { aura: 1, elem: 'kurama' }]], (a, b) => T.buff(a, b, '팔문둔갑 · 경문 개방', 'kurama', { giant: '#ff5a2a', dur: 5, pose: 'braced' })),
    '나뭇잎 강력선풍': (a, b) => T.melee(a, b, '나뭇잎 강력선풍', 'wind', { prep: 'kickPrep', strike: 'highKick', arc: [1.4, -1.8, 26], arcW: 8, pw: 1.8 }),
    '다이나믹 엔트리': wf((a, b) => T.dash(a, b, '다이나믹 엔트리', null, 'power', 1.5, false, { run: 'crouchRun' }), ELEM['power'].c),
    '쌍절곤 연타': (a, b) => T.melee(a, b, '쌍절곤 연타', 'metal', { n: 8, strike: 'slash', strike2: 'punch', arc: [-2, 1, 14] }),
  });

  // ── 원피스 ──
  add2('luffy', {
    '고무고무 바주카': (a, b) => T.melee(a, b, '고무고무 바주카', 'power', { prep: 'windBack', strike: 'palm', pw: 1.9, reach: 8 }),
    '고무고무 채찍': (a, b) => T.melee(a, b, '고무고무 채찍', 'metal', { prep: 'kickPrep', strike: 'spinKick', spin: 22, arc: [1.2, -1.6, 30], arcW: 8 }),
    '레드 호크': pre([['windBack', .3, { aura: 1, elem: 'fire' }]], (a, b) => T.stretch(a, b, '고무고무 레드 호크', { ek: 'fire' })),
    '킹콩 건': pre([['thumbBite', .3, { aura: 1 }], ['windBack', .35, { giantArm: 1, aura: 1, elem: 'power' }]], (a, b) => T.stretch(a, b, '기어 포스 · 킹콩 건', { giant: 1.4, ult: true, ek: 'power' })),
  });
  add2('zoro', {
    '용 말기': pre([['xSwords', .25, { aura: 1, elem: 'wind' }]], (a, b) => T.aoe(a, b, '용 말기', 'wind', { prep: 'xSwords', strike: 'spreadSlash', rad: 36, spin: 26 })),
    '1080 파운드 포': pre([['windBack', .3, { aura: 1, elem: 'slash' }]], (a, b) => T.ranged(a, b, '1080 파운드 포', 'getsuga', 'slash', { n: 3, size: 1.2, v: 270, prep: 'windBack', cast: 'spreadSlash' })),
    '삼천세계': pre([['xSwords', .4, { spin: 30, aura: 1, elem: 'slash' }]], (a, b) => T.melee(a, b, '삼도류 오의 · 삼천세계', 'slash', { prep: 'xSwords', strike: 'spreadSlash', spin: 30, arc: [-2.4, 1.2, 40], arcW: 12, pw: 2.2, ult: true })),
    '흑승 대용 말기': pre([['twoHandSword', .35, { aura: 1, elem: 'dark' }]], (a, b) => T.aoe(a, b, '흑승 · 대용 말기', 'dark', { prep: 'twoHandSword', strike: 'spreadSlash', rad: 50, spin: 30, pw: 2 })),
    '우시바리': wf((a, b) => T.dash(a, b, '일도류 · 우시바리', null, 'slash', 1.2, false, { run: 'crouchRun', hold: 'iai' }), ELEM['slash'].c),
  });
  add2('sanji', {
    '콜리어 슛': (a, b) => T.melee(a, b, '콜리어 슛', 'fire', { prep: 'kickPrep', strike: 'highKick', arc: [1.2, -1.6, 20], arcW: 6, pw: 1.4 }),
    '앙티엠 하쉬': pre([['handstand', .25, { aura: 1, elem: 'fire' }]], (a, b) => T.melee(a, b, '앙티엠 하쉬', 'fire', { n: 8, prep: 'kickPrep', strike: 'kick', strike2: 'highKick', arc: [1, -1.4, 14] })),
    '이프릿 잠브': pre([['spinKick', .4, { spin: 26, aura: 1, elem: 'getsuga' }]], (a, b) => T.buff(a, b, '이프릿 잠브', 'getsuga', { giant: '#4ab0ff', dur: 5, pose: 'spinKick' })),
    '콘카세': (a, b) => T.aoe(a, b, '콘카세', 'fire', { jump: true, rad: 32, prep: 'flipAir', strike: 'axe', tilt: -.8 }),
    '플람베 샷': pre([['spinKick', .3, { spin: 20, aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '플람베 샷', 'fireball', 'fire', { size: 1.6, v: 260, prep: 'kickPrep', cast: 'highKick' })),
    '스카이 워크 연격': (a, b) => T.sky(a, b, '스카이 워크 · 하늘 연격', 'fire', {}),
  });
  add2('ace', {
    '화창': pre([['fingerPoint', .25, { aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '화창', 'arrow', 'fire', { n: 3, size: 1.3, v: 320, prep: 'fingerPoint', cast: 'point' })),
    '십자화': beam('십자화', 'fire', { prep: 'crossArms', cast: 'openArms', r: 2.8, cross: true, pw: 1.6 }),
    '신화 불지옥': pre([['armsWide', .35, { aura: 1, elem: 'fire' }]], (a, b) => T.at(a, b, '신화 · 불지옥', 'fire', 'flames', { pose: 'openArms', pw: 1.6, ult: true })),
    '염상망': pre([['openArms', .3, { aura: 1, elem: 'fire' }]], (a, b) => T.aoe(a, b, '염상망', 'fire', { prep: 'openArms', strike: 'skySweep', rad: 48, pw: 1.6 })),
    '불꽃 분신': pre([['laughBack', .3, { aura: 1, elem: 'fire' }]], (a, b) => T.buff(a, b, '메라메라 · 불꽃 몸', 'fire', { giant: '#ff6a10', dur: 4, pose: 'openArms' })),
    '화권 연타': (a, b) => T.melee(a, b, '불주먹 연타', 'fire', { n: 6, strike: 'punch', strike2: 'punchL', pw: 1.2 }),
  });
  add2('kizaru', {
    '야타의 거울': wf((a, b) => T.dash(a, b, '야타노카가미', null, 'light', 1.4, false, { run: 'crouchRun' }), ELEM['light'].c),
    '아마노무라쿠모 광선': beam('빛의 손가락 레이저', 'light', { prep: 'fingerPoint', cast: 'fingerPoint', r: 1, life: .5, pw: 1.4 }),
    '빛의 비': (a, b) => T.sky(a, b, '빛의 비', 'light', { ult: false }),
    '광속 연타': (a, b) => T.melee(a, b, '광속 연타 발차기', 'light', { n: 10, prep: 'kickPrep', strike: 'kick', strike2: 'highKick', arc: [1, -1.4, 14] }),
    '빛 대폭발': pre([['skyRaise', .4, { aura: 1, elem: 'light' }]], (a, b) => T.aoe(a, b, '빛의 대폭발', 'light', { prep: 'skyRaise', strike: 'openArms', rad: 60, pw: 2.2, ult: true })),
    '광속 이동': (a, b) => [step(.2, [[a, { pose: 'crouchRun', aura: 1, elem: 'light', face: b }], [b, { pose: 'stance', face: a }]], () => callout(a, '광속 이동')), step(.25, [[a, { pose: 'highKick', to: () => b.pos.clone().add(dirTo(a, b).multiplyScalar(10)), ghost: 1, face: b, k: 95 }], [b, { pose: 'hurt', face: a }]], () => { burst(chest(a), 24, ELEM.light.parts, 2); resolve(a, b, 'light', pick(['hit', 'block', 'hit']), '광속 발차기!', 1.5); })],
  });
  add2('law', {
    '카운터 쇼크': (a, b) => T.melee(a, b, '카운터 쇼크', 'bolt', { prep: 'openPalm', strike: 'palm', pw: 1.6, reach: 5 }),
    '메스': wf((a, b) => T.dash(a, b, '메스', null, 'room', 1.2, false, { run: 'crouchRun', hold: 'palm' }), ELEM['room'].c),
    '타쿠트': (a, b) => T.sky(a, b, '타쿠트', 'room', {}),
    '라디오 나이프': pre([['iai', .3, { aura: 1, elem: 'bolt' }]], (a, b) => T.melee(a, b, '라디오 나이프', 'bolt', { prep: 'iai', strike: 'spreadSlash', arc: [-2.2, 1, 30], arcW: 10, pw: 1.8 })),
    '인젝션 샷': wf((a, b) => T.dash(a, b, '인젝션 샷', null, 'slash', 1.3, false, { run: 'crouchRun', hold: 'iai' }), ELEM['slash'].c),
    '룸 확장': pre([['openArms', .35, { aura: 1, elem: 'room' }]], (a, b) => T.buff(a, b, '룸 확장', 'room', { giant: '#7ab0ff', dur: 4, pose: 'openArms' })),
  });

  // ── 블리치 ──
  add2('ichigo', {
    '월아천충 연사': pre([['twoHandSword', .25, { aura: 1, elem: 'getsuga' }]], (a, b) => T.ranged(a, b, '월아천충 연사', 'getsuga', 'getsuga', { n: 3, size: 1.3, v: 280, prep: 'twoHandSword', cast: 'swordDown' })),
    '무월': pre([['swordLevel', .5, { aura: 1, elem: 'dark' }]], (a, b) => T.at(a, b, '최후의 월아천충 · 무월', 'dark', 'vortex', { pose: 'swordDown', pw: 2.4, ult: true })),
    '허화 세로': beam('세로', 'hollow', { prep: 'maskPull', cast: 'openPalm', r: 3, pw: 1.8 }),
    '천쇄참월 연격': (a, b) => T.melee(a, b, '천쇄참월 고속 연격', 'getsuga', { n: 6, prep: 'iai', strike: 'swordDown', strike2: 'spreadSlash', arc: [-2.2, 1, 18] }),
  });
  add2('byakuya', {
    '경엄': pre([['openPalm', .3, { aura: 1, elem: 'petal' }]], (a, b) => T.at(a, b, '센본자쿠라 · 경엄', 'petal', 'petals', { pose: 'openPalm', pw: 1.4 })),
    '천본앵경엄': pre([['swordDown', .4, { aura: 1, elem: 'petal' }]], (a, b) => T.buff(a, b, '반카이 · 천본앵경엄', 'petal', { giant: '#ffb0d0', dur: 5, pose: 'openArms' })),
    '백제검': pre([['swordLevel', .3, { aura: 1, elem: 'light' }]], (a, b) => T.ranged(a, b, '종경 · 백제검', 'getsuga', 'light', { size: 1.8, v: 300, prep: 'swordLevel', cast: 'swordDown' })),
    '육장광뢰': pre([['fingerPoint', .3, { aura: 1, elem: 'light' }]], (a, b) => T.at(a, b, '박도 61 · 육장광뢰', 'light', 'ice', { pose: 'fingerPoint', pw: 1.2 })),
    '창화추': beam('파도 33 · 창화추', 'getsuga', { prep: 'openPalm', cast: 'openPalm', r: 2.6, pw: 1.4 }),
    '순보 연참': (a, b) => T.melee(a, b, '순보 연참', 'petal', { n: 3, prep: 'iai', strike: 'iaiEnd', arc: [-1.6, .9, 20], reach: 4 }),
  });
  add2('rukia', {
    '두 번째 춤 백련': beam('두 번째 춤 · 백련', 'ice', { prep: 'swordLevel', cast: 'swordDown', r: 4, life: .8, pw: 1.6 }),
    '창화추': beam('파도 33 · 창화추', 'getsuga', { prep: 'openPalm', cast: 'openPalm', r: 2.4, pw: 1.3 }),
    '적화포': pre([['fingerPoint', .25, { aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '파도 31 · 적화포', 'fireball', 'fire', { size: 1.4, v: 260, prep: 'fingerPoint', cast: 'openPalm' })),
    '하쿠카 노 토가메': pre([['swordLevel', .45, { aura: 1, elem: 'ice' }]], (a, b) => T.buff(a, b, '반카이 · 하쿠카 노 토가메', 'ice', { giant: '#e8faff', dur: 5, pose: 'openArms' })),
    '얼음 칼날 연무': (a, b) => T.melee(a, b, '얼음 칼날 연무', 'ice', { n: 4, prep: 'slashPrep', strike: 'slash', strike2: 'swordDown', arc: [-2, 1, 18] }),
    '순보 찌르기': wf((a, b) => T.dash(a, b, '순보 찌르기', null, 'ice', 1.2, false, { run: 'crouchRun', hold: 'swordLevel' }), ELEM['ice'].c),
    '얼음 가시밭': pre([['swordDown', .3, { aura: 1, elem: 'ice' }]], (a, b) => T.aoe(a, b, '얼음 가시밭', 'ice', { prep: 'swordLevel', strike: 'swordDown', rad: 40 })),
  });
  add2('hitsugaya', {
    '군조 빙결': pre([['swordLevel', .3, { aura: 1, elem: 'ice' }]], (a, b) => T.ranged(a, b, '군조 빙결 천본 꽃', 'senbon', 'ice', { n: 12, size: 1, v: 320, prep: 'swordLevel', cast: 'skySweep' })),
    '육의 빙결': pre([['swordDown', .3, { aura: 1, elem: 'ice' }]], (a, b) => T.at(a, b, '육의 빙결', 'ice', 'ice', { pose: 'swordDown', pw: 1.4 })),
    '빙천 백화장': pre([['skyRaise', .4, { aura: 1, elem: 'ice' }]], (a, b) => T.aoe(a, b, '빙천 백화장', 'ice', { prep: 'skyRaise', strike: 'swordDown', rad: 56, pw: 2, ult: true })),
    '순보 베기': (a, b) => T.melee(a, b, '순보 베기', 'ice', { prep: 'iai', strike: 'iaiEnd', arc: [-2, .8, 22], reach: 4 }),
    '빙결 방패': pre([['crossArms', .3, { aura: 1, elem: 'ice' }]], (a, b) => T.buff(a, b, '얼음 날개 방패', 'ice', { giant: '#bfefff', dur: 3, pose: 'crossArms' })),
    '용선회 연사': pre([['twoHandSword', .3, { aura: 1, elem: 'ice' }]], (a, b) => T.ranged(a, b, '용선회 연사', 'getsuga', 'ice', { n: 2, size: 1.5, v: 260, prep: 'twoHandSword', cast: 'swordDown' })),
  });
  add2('kenpachi', {
    '노자라시': (a, b) => T.melee(a, b, '노자라시', 'power', { prep: 'slashPrep', strike: 'swordDown', arc: [-2.4, 1.1, 30], arcW: 10, pw: 1.8 }),
    '영압 폭발': pre([['laughBack', .35, { aura: 1, elem: 'power' }]], (a, b) => T.aoe(a, b, '영압 폭발', 'power', { prep: 'laughBack', strike: 'hammerDown', rad: 50, pw: 1.8 })),
    '난도질 연타': (a, b) => T.melee(a, b, '난도질 연타', 'slash', { n: 10, prep: 'slashPrep', strike: 'slash', strike2: 'swordDown', arc: [-2, 1, 16] }),
    '쌍수 일격': pre([['twoHandSword', .5, { aura: 1, elem: 'power' }]], (a, b) => T.melee(a, b, '쌍수 일격', 'power', { prep: 'twoHandSword', strike: 'swordDown', arc: [-2.6, 1.3, 50], arcW: 16, pw: 2.6, ult: true })),
    '해골 영압': pre([['laughBack', .4, { aura: 1, elem: 'hollow' }]], (a, b) => T.buff(a, b, '해골 영압', 'hollow', { giant: '#ffe040', dur: 4, pose: 'laughBack' })),
    '돌격': wf((a, b) => T.dash(a, b, '맹돌격', null, 'power', 1.6, false, { run: 'crouchRun', hold: 'slashPrep' }), ELEM['power'].c),
  });
  add2('aizen', {
    '뇌명포': beam('파도 63 · 뇌명포', 'bolt', { prep: 'fingerPoint', cast: 'openPalm', r: 2.6, pw: 1.5 }),
    '비룡격적진천뢰포': beam('파도 88 · 비룡격적진천뢰포', 'light', { prep: 'twoHand', cast: 'openPalm', r: 5, life: .9, pw: 2, ult: true, rad: 60 }),
    '육장광뢰': pre([['fingerPoint', .3, { aura: 1, elem: 'light' }]], (a, b) => T.at(a, b, '박도 61 · 육장광뢰', 'light', 'ice', { pose: 'fingerPoint', pw: 1.2 })),
    '완전최면': pre([['swordLevel', .35, { aura: 1, elem: 'petal' }]], (a, b) => T.at(a, b, '경화수월 · 완전최면', 'petal', 'petals', { pose: 'openPalm', pw: 1.5 })),
    '붕옥 각성': pre([['openArms', .45, { aura: 1, elem: 'dark' }]], (a, b) => T.buff(a, b, '붕옥 각성', 'dark', { giant: '#c8a0ff', dur: 6, pose: 'openArms' })),
    '적화포': pre([['fingerPoint', .2, { aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '파도 31 · 적화포', 'fireball', 'fire', { size: 1.6, v: 280, prep: 'fingerPoint', cast: 'openPalm' })),
  });

  // ── 원펀맨 ──
  add2('saitama', {
    '진지한 박수': pre([['armsWide', .4, { aura: 1, elem: 'power' }]], (a, b) => T.aoe(a, b, '진지한 박수', 'power', { prep: 'armsWide', strike: 'twoHand', rad: 62, pw: 2.4, ult: true })),
    '진지한 테이블 뒤집기': pre([['kneel', .3, { aura: 1, elem: 'earth' }]], (a, b) => T.aoe(a, b, '진지한 테이블 뒤집기', 'earth', { prep: 'kneel', strike: 'skyRaise', rad: 50, pw: 2 })),
    '연속 보통 발차기': (a, b) => T.melee(a, b, '연속 보통 발차기', 'power', { n: 8, prep: 'kickPrep', strike: 'kick', strike2: 'highKick', arc: [1, -1.4, 14] }),
    '보통 꿀밤': (a, b) => T.melee(a, b, '보통 꿀밤', 'power', { prep: 'fingerPoint', strike: 'point', pw: 1.5, reach: 5 }),
    '진지한 연속 보통 펀치': pre([['seriousWind', .4, { aura: 1, elem: 'power' }]], (a, b) => T.melee(a, b, '진지한 연속 보통 펀치', 'power', { n: 16, strike: 'punch', strike2: 'punchL', pw: 1.6, ult: true })),
  });
  add2('genos', {
    '가동률 최대 소각포': beam('가동률 최대 · 소각포', 'fire', { prep: 'braced', cast: 'openPalm', r: 4.5, life: 1, pw: 2.2, ult: true, rad: 65 }),
    '마신 소각포': pre([['braced', .3, { aura: 1, elem: 'fire' }]], (a, b) => T.ranged(a, b, '마신 소각포', 'fireball', 'fire', { n: 3, size: 1.4, v: 260, prep: 'twoHand', cast: 'palm' })),
    '나선 소각포': pre([['openPalm', .3, { aura: 1, elem: 'fire' }]], (a, b) => T.at(a, b, '나선 소각포', 'fire', 'vortex', { pose: 'openPalm', pw: 1.5 })),
    '로켓 펀치': pre([['windBack', .3, { aura: 1, elem: 'metal' }]], (a, b) => T.ranged(a, b, '로켓 펀치', 'orb', 'metal', { size: 1.7, v: 320, prep: 'windBack', cast: 'punch' })),
    '초고속 연속 타격': (a, b) => T.melee(a, b, '초고속 연속 타격', 'metal', { n: 10, strike: 'punch', strike2: 'punchL' }),
    '부스터 돌진': wf((a, b) => T.dash(a, b, '부스터 돌진', null, 'fire', 1.6, false, { run: 'crouchRun', hold: 'braced' }), ELEM['fire'].c),
  });
  add2('tatsumaki', {
    '염동 회오리': pre([['openArms', .3, { aura: 1, elem: 'psychic' }]], (a, b) => T.at(a, b, '염동 회오리', 'psychic', 'vortex', { pose: 'skyRaise', pw: 1.4 })),
    '건물 던지기': pre([['skyRaise', .45, { aura: 1, elem: 'psychic' }]], (a, b) => T.ranged(a, b, '건물 던지기', 'bijuu', 'earth', { size: 2.8, v: 170, from: fromHigh, prep: 'skyRaise', cast: 'skySweep', ult: true })),
    '염동 장벽': pre([['crossArms', .3, { aura: 1, elem: 'psychic' }]], (a, b) => T.buff(a, b, '염동 장벽', 'psychic', { giant: '#60ff9a', dur: 4, pose: 'openArms' })),
    '염동 압축': (a, b) => T.aoe(a, b, '염동 압축', 'psychic', { prep: 'openPalm', strike: 'twoHand', rad: 40, pw: 1.6 }),
    '염동 창': pre([['fingerPoint', .25, { aura: 1, elem: 'psychic' }]], (a, b) => T.ranged(a, b, '염동 창', 'arrow', 'psychic', { n: 3, size: 1.3, v: 320, prep: 'fingerPoint', cast: 'point' })),
    '공중 연격': (a, b) => T.sky(a, b, '염동 · 공중 연격', 'psychic', {}),
  });
  add2('bang', {
    '유수암쇄권 천변': pre([['openPalm', .4, { aura: 1, elem: 'water' }]], (a, b) => T.melee(a, b, '유수암쇄권 · 천변', 'water', { n: 14, strike: 'palm', strike2: 'openPalm', pw: 1.5, ult: true })),
    '흐르는 물 발차기': (a, b) => T.melee(a, b, '흐르는 물 발차기', 'water', { prep: 'kickPrep', strike: 'highKick', arc: [1.2, -1.6, 22], arcW: 6 }),
    '선회 수류': (a, b) => T.aoe(a, b, '선회 수류', 'water', { prep: 'openArms', strike: 'palm', rad: 36, spin: 22 }),
    '암쇄 돌진': wf((a, b) => T.dash(a, b, '암쇄 돌진', null, 'water', 1.3, false, { run: 'crouchRun', hold: 'openPalm' }), ELEM['water'].c),
    '물결 장풍': pre([['twoHand', .3, { aura: 1, elem: 'water' }]], (a, b) => T.ranged(a, b, '물결 장풍', 'orb', 'water', { n: 6, size: 1.1, v: 260, prep: 'twoHand', cast: 'palm' })),
    '정권 찌르기': (a, b) => T.melee(a, b, '정권 찌르기', 'water', { prep: 'braced', strike: 'punch', pw: 2, reach: 6 }),
  });
  // ── 귀멸의 칼날 (호흡 형) ──
  add2('tanjiro', {
    '물레': wf((a, b) => T.aoe(a, b, '물의 호흡 제2형 · 물레', 'water', { jump: true, rad: 30, prep: 'flipAir', strike: 'swordDown', spin: 22, tilt: -.8 }), '#6ac0ff'),
    '용소': wf((a, b) => T.melee(a, b, '물의 호흡 제8형 · 용소', 'water', { prep: 'skyRaise', strike: 'swordDown', arc: [-2.5, 1.2, 30], arcW: 10, pw: 1.7 }), '#6ac0ff'),
    '벽라의 하늘': wf((a, b) => T.melee(a, b, '히노카미 카구라 · 벽라의 하늘', 'sun', { prep: 'twoHandSword', strike: 'spreadSlash', arc: [-2.2, 1, 34], arcW: 12, pw: 1.8 }), '#ff6a20'),
    '휘휘은광': wf((a, b) => T.aoe(a, b, '히노카미 카구라 · 휘휘은광', 'sun', { prep: 'swordLevel', strike: 'spreadSlash', rad: 46, spin: 26, pw: 2, ult: true }), '#ff6a20'),
  });
  add2('nezuko', {
    '폭혈 연쇄': wf((a, b) => T.at(a, b, '혈귀술 · 폭혈 연쇄', 'blood', 'flames', { pose: 'openPalm', pw: 1.5 }), '#ff4a7a'),
    '거대화': pre([['kneel', .35, { aura: 1, elem: 'blood' }]], (a, b) => T.buff(a, b, '혈귀화 · 거대화', 'blood', { giant: '#ff4a7a', dur: 5, pose: 'braced' })),
    '머리박기': wf((a, b) => T.dash(a, b, '머리박기', null, 'power', 1.4, false, { run: 'crouchRun' }), ELEM['power'].c),
    '폭혈 발차기': wf((a, b) => T.melee(a, b, '폭혈 화염 발차기', 'blood', { prep: 'kickPrep', strike: 'highKick', strike2: 'spinKick', n: 3, arc: [1.2, -1.6, 22], pw: 1.4 }), '#ff4a7a'),
    '연속 할퀴기': (a, b) => T.melee(a, b, '연속 할퀴기', 'blood', { n: 6, strike: 'slash', strike2: 'palm', arc: [-2, 1, 12] }),
    '폭혈 회오리': wf((a, b) => T.aoe(a, b, '혈귀술 · 폭혈 회오리', 'blood', { prep: 'spinKick', strike: 'spinKick', rad: 40, spin: 26, pw: 1.8, ult: true }), '#ff4a7a'),
  });
  add2('zenitsu', {
    '벽력일섬 팔연': wf((a, b) => T.melee(a, b, '벽력일섬 · 팔연', 'bolt', { n: 8, prep: 'iai', strike: 'iaiEnd', arc: [-.5, .5, 26], reach: 4, pw: 1.2 }), '#ffd040'),
    '벽력일섬 신속': wf((a, b) => T.dash(a, b, '벽력일섬 · 신속', null, 'bolt', 1.5, false, { run: 'crouchRun', hold: 'iai' }), ELEM['bolt'].c),
    '뇌광 발도': wf((a, b) => T.ranged(a, b, '번개의 호흡 · 뇌광 발도', 'getsuga', 'bolt', { size: 1.5, v: 340, prep: 'iai', cast: 'iaiEnd' }), '#ffd040'),
    '번개 연격': (a, b) => T.melee(a, b, '번개 연격', 'bolt', { n: 5, prep: 'iai', strike: 'slash', strike2: 'iaiEnd', arc: [-2, 1, 16] }),
    '잠든 일섬': pre([['kneel', .4, { aura: 1, elem: 'bolt' }]], (a, b) => T.melee(a, b, '잠든 젠이츠 · 벽력일섬', 'bolt', { prep: 'iai', strike: 'iaiEnd', arc: [-.4, .4, 30], reach: 4, pw: 1.8 })),
    '번개 낙뢰': (a, b) => T.sky(a, b, '번개의 호흡 · 낙뢰', 'bolt', {}),
  });
  add2('inosuke', {
    '꿰뚫기': wf((a, b) => T.dash(a, b, '짐승의 호흡 제1의 엄니 · 꿰뚫기', null, 'slash', 1.3, false, { run: 'crouchRun', hold: 'xSwords' }), '#a0f0b0'),
    '썰기': (a, b) => T.melee(a, b, '제2의 엄니 · 썰기', 'slash', { prep: 'xSwords', strike: 'spreadSlash', arc: [-2.2, 1, 22], arcW: 8 }),
    '물어뜯기': (a, b) => T.melee(a, b, '제3의 엄니 · 물어뜯기', 'slash', { n: 2, prep: 'xSwords', strike: 'slash', strike2: 'spreadSlash', arc: [-1.6, 1.6, 18] }),
    '난항 베기': wf((a, b) => T.melee(a, b, '제6의 엄니 · 난항 베기', 'slash', { n: 7, prep: 'xSwords', strike: 'slash', strike2: 'spreadSlash', arc: [-2, 1, 14], pw: 1.2 }), '#a0f0b0'),
    '폭렬 돌진': wf((a, b) => T.aoe(a, b, '제8의 엄니 · 폭렬 돌진', 'earth', { jump: true, rad: 34, prep: 'flipAir', strike: 'xSwords', tilt: -.8 }), '#c89a5a'),
    '돌린 베기': (a, b) => T.aoe(a, b, '제10의 엄니 · 돌린 베기', 'slash', { prep: 'xSwords', strike: 'spreadSlash', rad: 38, spin: 28, pw: 1.6, ult: true }),
  });
  add2('giyu', {
    '수면 베기': (a, b) => T.melee(a, b, '물의 호흡 제1형 · 수면 베기', 'water', { prep: 'swordLevel', strike: 'spreadSlash', arc: [-.4, .4, 28], arcW: 8 }),
    '물레': wf((a, b) => T.aoe(a, b, '물의 호흡 제2형 · 물레', 'water', { jump: true, rad: 30, prep: 'flipAir', strike: 'swordDown', spin: 22, tilt: -.8 }), '#6ac0ff'),
    '유류무': (a, b) => T.melee(a, b, '물의 호흡 제3형 · 유류무', 'water', { n: 4, prep: 'iai', strike: 'slash', strike2: 'spreadSlash', arc: [-2, 1, 18] }),
    '소용돌이': wf((a, b) => T.aoe(a, b, '물의 호흡 제6형 · 소용돌이', 'water', { prep: 'swordLevel', strike: 'spreadSlash', rad: 42, spin: 30, pw: 1.6 }), '#6ac0ff'),
    '물방울 파문 찌르기': wf((a, b) => T.dash(a, b, '물의 호흡 제7형 · 물방울 파문 찌르기', null, 'water', 1.2, false, { run: 'crouchRun', hold: 'swordLevel' }), ELEM['water'].c),
    '용소': wf((a, b) => T.melee(a, b, '물의 호흡 제8형 · 용소', 'water', { prep: 'skyRaise', strike: 'swordDown', arc: [-2.5, 1.2, 34], arcW: 12, pw: 1.9, ult: true }), '#6ac0ff'),
  });
  add2('rengoku', {
    '오르는 염천': wf((a, b) => T.melee(a, b, '불꽃의 호흡 제2형 · 오르는 염천', 'fire', { prep: 'swordDown', strike: 'skyRaise', arc: [1.2, -2.2, 30], arcW: 10, pw: 1.5 }), '#ff8a20'),
    '기염만상': wf((a, b) => T.melee(a, b, '불꽃의 호흡 제3형 · 기염만상', 'fire', { prep: 'skyRaise', strike: 'swordDown', arc: [-2.5, 1.2, 36], arcW: 12, pw: 1.8 }), '#ff8a20'),
    '염호': wf((a, b) => T.ranged(a, b, '불꽃의 호흡 제5형 · 염호', 'bijuu', 'fire', { size: 2.4, v: 220, prep: 'twoHandSword', cast: 'swordDown', ult: true }), '#ff8a20'),
    '불꽃 연격': (a, b) => T.melee(a, b, '불꽃 연격', 'fire', { n: 6, prep: 'slashPrep', strike: 'slash', strike2: 'swordDown', arc: [-2, 1, 18] }),
    '화염 돌진': wf((a, b) => T.dash(a, b, '불꽃 돌진 베기', null, 'fire', 1.5, false, { run: 'crouchRun', hold: 'swordLevel' }), ELEM['fire'].c),
  });
  add2('shinobu', {
    '진곡': wf((a, b) => T.dash(a, b, '벌레의 호흡 · 봉아의 춤 · 진곡', null, 'insect', 1.2, false, { run: 'crouchRun', hold: 'swordLevel' }), '#c890ff'),
    '독 연속 찌르기': (a, b) => T.melee(a, b, '독 연속 찌르기', 'insect', { n: 6, prep: 'swordLevel', strike: 'point', strike2: 'iaiEnd', reach: 5 }),
    '나비 회피 찌르기': pre([['flipAir', .3, { aura: 1, elem: 'insect' }]], (a, b) => T.melee(a, b, '나비 날개 회피 찌르기', 'insect', { prep: 'swordLevel', strike: 'point', reach: 4, pw: 1.4 })),
    '독 안개': wf((a, b) => T.at(a, b, '등꽃 독 안개', 'insect', 'vortex', { pose: 'openPalm', pw: 1.2 }), '#c890ff'),
    '나비 폭풍': wf((a, b) => T.at(a, b, '벌레의 호흡 · 나비 폭풍', 'petal', 'petals', { pose: 'skySweep', pw: 1.6, ult: true }), '#c890ff'),
    '독침 투척': (a, b) => T.ranged(a, b, '독침 투척', 'senbon', 'insect', { n: 6, size: 1, v: 320, prep: 'throwPrep', cast: 'throw' }),
  });
  add2('uzui', {
    '향명 참참': wf((a, b) => T.melee(a, b, '소리의 호흡 제4형 · 향명 참참', 'sound', { n: 5, prep: 'xSwords', strike: 'spreadSlash', strike2: 'swordDown', arc: [-2.2, 1, 22], pw: 1.3 }), '#ffd040'),
    '폭약 쿠나이': (a, b) => T.ranged(a, b, '폭약 쿠나이 투척', 'senbon', 'sound', { n: 8, size: 1.1, v: 300, prep: 'throwPrep', cast: 'throw' }),
    '이도 연참': (a, b) => T.melee(a, b, '이도 연참', 'sound', { n: 6, prep: 'xSwords', strike: 'slash', strike2: 'spreadSlash', arc: [-2, 1, 16] }),
    '쌍검 돌진': wf((a, b) => T.dash(a, b, '쌍검 돌진', null, 'sound', 1.4, false, { run: 'crouchRun', hold: 'xSwords' }), ELEM['sound'].c),
    '화려 폭발': wf((a, b) => T.aoe(a, b, '축제의 신 · 화려 폭발', 'sound', { prep: 'skyRaise', strike: 'hammerDown', rad: 56, pw: 2.2, ult: true }), '#ffd040'),
    '음파 굉음': beam('소리의 호흡 · 음파 굉음', 'sound', { prep: 'xSwords', cast: 'openArms', r: 3.4, pw: 1.4 }),
  });
  add2('mitsuri', {
    '애달픈 연정': wf((a, b) => T.melee(a, b, '사랑의 호흡 제2형 · 애달픈 연정', 'petal', { prep: 'skySweep', strike: 'spreadSlash', arc: [-2.4, 1.2, 32], arcW: 8, pw: 1.4 }), '#ffb0d0'),
    '연묘 시구레': (a, b) => T.melee(a, b, '사랑의 호흡 제3형 · 연묘 시구레', 'petal', { n: 6, prep: 'slashPrep', strike: 'slash', strike2: 'spreadSlash', arc: [-2.2, 1, 20] }),
    '채찍검 회오리': wf((a, b) => T.aoe(a, b, '채찍검 회오리', 'petal', { prep: 'openArms', strike: 'spreadSlash', rad: 44, spin: 28, pw: 1.6 }), '#ffb0d0'),
    '사랑의 연격': (a, b) => T.melee(a, b, '사랑의 연격', 'petal', { n: 8, strike: 'slash', strike2: 'highKick', arc: [-2, 1, 14] }),
    '하트 돌진': wf((a, b) => T.dash(a, b, '하트 돌진', null, 'petal', 1.3, false, { run: 'crouchRun' }), ELEM['petal'].c),
    '연정 대폭발': wf((a, b) => T.aoe(a, b, '사랑의 호흡 · 연정 대폭발', 'petal', { prep: 'armsWide', strike: 'skySweep', rad: 58, pw: 2.2, ult: true }), '#ffb0d0'),
  });
  add2('muichiro', {
    '수천원하 원정': (a, b) => T.melee(a, b, '안개의 호흡 제1형 · 수천원하 원정', 'mist', { prep: 'swordLevel', strike: 'point', reach: 5, pw: 1.4 }),
    '팔중 안개': wf((a, b) => T.melee(a, b, '안개의 호흡 제2형 · 팔중 안개', 'mist', { n: 8, prep: 'iai', strike: 'slash', strike2: 'spreadSlash', arc: [-2, 1, 16] }), '#dde8f0'),
    '하얀 안개 바다': wf((a, b) => T.at(a, b, '안개의 호흡 제3형 · 하얀 안개 바다', 'mist', 'vortex', { pose: 'skySweep', pw: 1.3 }), '#dde8f0'),
    '이류 베기': (a, b) => T.melee(a, b, '안개의 호흡 제4형 · 이류 베기', 'mist', { prep: 'slashPrep', strike: 'spreadSlash', arc: [-2.2, 1, 24], arcW: 8 }),
    '노을 구름바다': wf((a, b) => T.aoe(a, b, '안개의 호흡 제5형 · 노을 구름바다', 'mist', { prep: 'swordLevel', strike: 'spreadSlash', rad: 44, spin: 24, pw: 1.6 }), '#dde8f0'),
    '달의 안개 소실': wf((a, b) => T.dash(a, b, '안개의 호흡 제6형 · 달의 안개 소실', null, 'mist', 1.6, true, { run: 'crouchRun', hold: 'iai' }), '#dde8f0'),
  });
  add2('sanemi', {
    '조풍 날개': wf((a, b) => T.melee(a, b, '바람의 호흡 제2형 · 조풍 날개', 'wind', { n: 4, prep: 'slashPrep', strike: 'spreadSlash', strike2: 'slash', arc: [-2.2, 1, 22] }), '#9fe0ff'),
    '청람풍수': wf((a, b) => T.ranged(a, b, '바람의 호흡 제3형 · 청람풍수', 'getsuga', 'wind', { n: 3, size: 1.4, v: 290, prep: 'slashPrep', cast: 'spreadSlash' }), '#9fe0ff'),
    '상승 진사바람': (a, b) => T.melee(a, b, '바람의 호흡 제4형 · 상승 진사바람', 'wind', { prep: 'swordDown', strike: 'skyRaise', arc: [1.2, -2.2, 28], arcW: 10, pw: 1.5 }),
    '경풍 천구풍': wf((a, b) => T.aoe(a, b, '바람의 호흡 제7형 · 경풍 천구풍', 'wind', { jump: true, rad: 40, prep: 'flipAir', strike: 'swordDown', spin: 24, tilt: -.8, pw: 1.7 }), '#9fe0ff'),
    '이즈나 아라시': wf((a, b) => T.at(a, b, '바람의 호흡 제9형 · 이즈나 아라시', 'wind', 'vortex', { pose: 'spreadSlash', pw: 2, ult: true }), '#9fe0ff'),
    '바람 돌진': wf((a, b) => T.dash(a, b, '바람 돌진 베기', null, 'wind', 1.4, false, { run: 'crouchRun', hold: 'slashPrep' }), ELEM['wind'].c),
  });
  add2('obanai', {
    '협두의 독아': wf((a, b) => T.melee(a, b, '뱀의 호흡 제2형 · 협두의 독아', 'slash', { prep: 'swordLevel', strike: 'point', reach: 4, pw: 1.4 }), '#a0f0b0'),
    '도사리 휘감기': wf((a, b) => T.aoe(a, b, '뱀의 호흡 제3형 · 도사리 휘감기', 'slash', { prep: 'swordLevel', strike: 'spreadSlash', rad: 36, spin: 26 }), '#a0f0b0'),
    '경도 장사': (a, b) => T.melee(a, b, '뱀의 호흡 제4형 · 경도 장사', 'slash', { n: 4, prep: 'iai', strike: 'slash', strike2: 'iaiEnd', arc: [-2, 1, 18] }),
    '뱀 연찌르기': (a, b) => T.melee(a, b, '뱀 연찌르기', 'insect', { n: 6, prep: 'swordLevel', strike: 'point', strike2: 'iaiEnd', reach: 5 }),
    '독뱀 돌진': wf((a, b) => T.dash(a, b, '독뱀 돌진', null, 'insect', 1.3, false, { run: 'crouchRun', hold: 'swordLevel' }), ELEM['insect'].c),
    '뱀 꼬리 휘두르기': (a, b) => T.melee(a, b, '뱀 꼬리 휘두르기', 'slash', { prep: 'kickPrep', strike: 'spinKick', spin: 20, arc: [1.2, -1.6, 24] }),
    '대사': wf((a, b) => T.at(a, b, '뱀의 호흡 · 대사', 'insect', 'vortex', { pose: 'spreadSlash', pw: 1.8, ult: true }), '#a0f0b0'),
  });
  add2('himejima', {
    '천면 부수기': wf((a, b) => T.aoe(a, b, '바위의 호흡 제2형 · 천면 부수기', 'earth', { prep: 'hammerUp', strike: 'hammerDown', rad: 44, pw: 1.8 }), '#c89a5a'),
    '암구 쌍극': (a, b) => T.melee(a, b, '바위의 호흡 제3형 · 암구 쌍극', 'earth', { n: 2, prep: 'windBack', strike: 'hammerDown', strike2: 'punch', pw: 1.6 }),
    '류암 박피': wf((a, b) => T.ranged(a, b, '바위의 호흡 제4형 · 류암 박피', 'bijuu', 'earth', { size: 2.2, v: 210, prep: 'windBack', cast: 'throw' }), '#c89a5a'),
    '철구 낙하': (a, b) => T.sky(a, b, '철구 낙하', 'earth', {}),
    '쇠사슬 휘감기': (a, b) => T.melee(a, b, '쇠사슬 휘감기', 'metal', { prep: 'openArms', strike: 'skySweep', spin: 20, arc: [-2.4, 1.2, 36], arcW: 8, reach: 14 }),
    '바위 대분쇄': wf((a, b) => T.aoe(a, b, '바위의 호흡 · 대분쇄', 'earth', { jump: true, rad: 60, prep: 'skyRaise', strike: 'hammerDown', pw: 2.4, ult: true, tilt: -.6 }), '#c89a5a'),
  });
  add2('garou', {
    '반사 유수암쇄권': (a, b) => T.melee(a, b, '괴인 유수암쇄권 · 반사', 'dark', { out: ['block', 'counter', 'hit'], prep: 'guard', strike: 'palm', pw: 1.6 }),
    '우주적 공포 감마선': beam('우주적 공포 · 감마선', 'light', { prep: 'twoHand', cast: 'openPalm', r: 4, life: .9, pw: 2.2, ult: true, rad: 60 }),
    '괴인 각성': pre([['laughBack', .4, { aura: 1, elem: 'dark' }]], (a, b) => T.buff(a, b, '괴인 각성', 'dark', { giant: '#9a4aff', dur: 5, pose: 'laughBack' })),
    '선회 발차기': (a, b) => T.melee(a, b, '선회 발차기', 'dark', { prep: 'kickPrep', strike: 'spinKick', spin: 22, arc: [1.2, -1.6, 24] }),
    '살기 돌진': wf((a, b) => T.dash(a, b, '살기 돌진', null, 'hollow', 1.4, false, { run: 'crouchRun' }), ELEM['hollow'].c),
    '난반사 연격': (a, b) => T.melee(a, b, '난반사 연격', 'hollow', { n: 12, strike: 'palm', strike2: 'highKick', arc: [1, -1.4, 14] }),
  });
})();
