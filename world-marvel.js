// 마블 어벤져스(캐릭터 확장): 주요 인물 추가 + 세계관별 '비행 가능(fly)' 명확 분리.
// 비행형(아이언맨·토르·비전)은 기존 검증된 항공(hover/jump)·원거리(T.ranged)·돌진(T.dash) 키트로 공중전 재현.
// 기존 태그/세계관 모드 그대로 유지(NW.addWorld, world-aot.js 와 동일 등록 경로).
(function () {
  const NW = window.NEWWORLD; if (!NW) return;
  NW.addWorld('marvel', { name: '마블 어벤져스', stroke: '#c0392b', dodge: '회피·방어' }, ['ironman', 'captain', 'thor', 'hulk', 'spiderman', 'vision']);

  Object.assign(ELEM, {
    repulsor: { c: '#7fe3ff', parts: ['#ffffff', '#c8f4ff', '#7fe3ff', '#2a8ad0'], g: 0, style: 'spark' },
    gamma: { c: '#7dff6a', parts: ['#ffffff', '#c8ffb0', '#7dff6a', '#1f8a2a'], g: -6, style: 'flame' },
    cosmic: { c: '#ff7a3a', parts: ['#ffe080', '#ffb040', '#ff7a3a', '#c02a10'], g: -10, style: 'flame' },
    shield: { c: '#e8b04a', parts: ['#fff0c0', '#e8b04a', '#c87a2a', '#5a3a12'], g: 120, style: 'metal' },
    web: { c: '#e8ecf2', parts: ['#ffffff', '#eef2f8', '#c8d2e0', '#8a94a6'], g: 160, style: 'splash' },
    mystic: { c: '#ff5a7a', parts: ['#ffd0e0', '#ff9ab0', '#ff5a7a', '#a01838'], g: -8, style: 'shadow' },
    storm: { c: '#9fd8ff', parts: ['#ffffff', '#cfeaff', '#9fd8ff', '#3a6ad0'], g: 0, style: 'spark' },
  });

  const arm = (o) => Object.assign({ skin: '#e8c8a8', top: '#b8322a', top2: '#d8b24a', pants: '#b8322a', sandal: '#d8b24a', sleeve: '#b8322a', belt: '#d8b24a', wrap: '#d8b24a', coat: '#b8322a', coat2: '#d8b24a', glove: '#d8b24a', band: '#2a2a30', plate: '#c8ccd8', eye: '#bfe6ff' }, o);
  Object.assign(PALS, {
    ironman: arm({ hair: '#7a4a22', hair2: '#8a5a2a', eye: '#bfe6ff' }),
    captain: { skin: '#eccaa8', top: '#2a5a9a', top2: '#c0392b', pants: '#2a3a5a', sandal: '#c0392b', sleeve: '#2a5a9a', belt: '#c8a24a', wrap: '#c0392b', coat: '#2a5a9a', coat2: '#c0392b', glove: '#2a5a9a', band: '#2a3a5a', plate: '#c8ccd8', hair: '#5a6a7a', hair2: '#6a7a8a', eye: '#3a7ad0' },
    thor: { skin: '#e8c4a0', top: '#3a4a7a', top2: '#2a2a34', pants: '#3a4a7a', sandal: '#2a2a34', sleeve: '#3a4a7a', belt: '#7a5a2a', wrap: '#2a2a34', coat: '#1a1a24', coat2: '#2a2a34', glove: '#e8c4a0', band: '#2a2a34', plate: '#c8ccd8', hair: '#e6d27a', hair2: '#f0e0a0', eye: '#3a7ad0' },
    hulk: { skin: '#5aa85a', top: '#4a8a4a', top2: '#3a7a3a', pants: '#3a6a8a', sandal: '#3a7a3a', sleeve: '#5aa85a', belt: '#3a6a8a', wrap: '#3a6a8a', coat: '#4a8a4a', coat2: '#3a7a3a', glove: '#5aa85a', band: '#3a5a7a', plate: '#5aa85a', hair: '#2a4a2a', hair2: '#3a5a3a', eye: '#2a6a2a' },
    spiderman: { skin: '#c0392b', top: '#c0392b', top2: '#2a5a9a', pants: '#2a5a9a', sandal: '#c0392b', sleeve: '#c0392b', belt: '#2a5a9a', wrap: '#c0392b', coat: '#c0392b', coat2: '#2a5a9a', glove: '#c0392b', band: '#2a2a2a', plate: '#2a5a9a', hair: '#2a2a2a', hair2: '#3a3a3a', eye: '#e8e8f0' },
    vision: { skin: '#c0392b', top: '#c0392b', top2: '#7a5a2a', pants: '#7a3a2a', sandal: '#7a5a2a', sleeve: '#c0392b', belt: '#e6c24a', wrap: '#2a2a34', coat: '#c0392b', coat2: '#7a5a2a', glove: '#e6c24a', band: '#2a2a34', plate: '#e8e8f0', hair: '#2a2a30', hair2: '#3a3a44', eye: '#7a5a2a' },
  });

  const hover = (a, b, d = .3) => [step(d, [[a, { pose: 'flipAir', vy: R(210, 290), side: R(-140, 140), face: b, ghost: 1 }], [b, { pose: 'stance', face: a }]])];
  const jump = (a, b, d = .28) => [step(d, [[a, { pose: 'flipAir', vy: R(240, 340), face: b, ghost: 1 }], [b, { pose: 'stance', face: a }]])];

  defChar('ironman', '아이언맨', 'marvel', {
    '리펄서 블래스트': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '리펄서 블래스트', 'orb', 'repulsor', { size: 1.1, v: 360, prep: 'palm', cast: 'palm' })],
    '리펄서 연사': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '리펄서 연사', 'senbon', 'repulsor', { n: 3, size: .8, v: 340, prep: 'palm', cast: 'palm' })],
    '마이크로 미사일': (a, b) => [...hover(a, b, .25), ...T.ranged(a, b, '마이크로 미사일', 'arrow', 'repulsor', { n: 4, size: 1, v: 300, prep: 'point', cast: 'throw' })],
    '플래저': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '플래저 산탄', 'fireball', 'repulsor', { n: 2, size: 1.2, v: 320, prep: 'palm' })],
    '유니빔': (a, b) => [...seq(a, b, [['crossArms', .45, { aura: 1, elem: 'repulsor' }]]), ...T.ranged(a, b, '유니빔', 'orb', 'repulsor', { size: 2.4, v: 460, ult: true, prep: 'crossArms', cast: 'palm' }), step(.2, [[a, { pose: 'palm', face: b, aura: 1, elem: 'repulsor' }]], () => { try { const h = handP(a), d = dirTo(a, b); bolt(h, h.clone().addScaledVector(d, 130), '#7fe3ff', .4, 4); light(h, '#7fe3ff', 12); } catch (e) { } })],
    '아크 리액터 과부하': (a, b) => [...seq(a, b, [['skyRaise', .5, { aura: 1, elem: 'repulsor' }]]), ...T.aoe(a, b, '아크 리액터 방출', 'repulsor', { prep: 'skyRaise', strike: 'palm', rad: 48, pw: 2.2, ult: true })],
    '플라이트 대시': (a, b) => [...hover(a, b, .18), ...T.dash(a, b, '플라이트 대시', null, 'repulsor', 1.4, false, { run: 'flipAir', hold: 'palm' })],
    '공중 강타': (a, b) => [...hover(a, b, .22), ...T.aoe(a, b, '공중 강타', 'repulsor', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 30, pw: 1.8 })],
    '미사일 강습': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '미사일 강습', 'arrow', 'repulsor', { n: 6, size: 1, v: 320, ult: true, prep: 'skyRaise', cast: 'throw' })],
    '나노 실드': (a, b) => [...seq(a, b, [['crossArms', .35, { aura: 1, elem: 'shield' }]]), ...T.at(a, b, '나노 실드', 'shield', 'repulsor', { pose: 'crossArms', pw: 1.2 })],
    '호버링 재배치': (a, b) => hover(a, b, .4),
  }, { name: '리펄서', hand: null, elem: 'repulsor', kind: 'orb', fly: true });

  defChar('captain', '캡틴 아메리카', 'marvel', {
    '실드 스로우': (a, b) => [...T.ranged(a, b, '실드 스로우', 'arrow', 'shield', { size: 1.2, v: 360, prep: 'throw', cast: 'throw' }), step(.3, [[a, { pose: 'palm', face: b, elem: 'shield' }], [b, { pose: 'hurt', face: a }]], () => { try { bolt(chest(b), handP(a), '#e8b04a', .35, 1.8); ring(V3(b.pos.x, .4, b.pos.z), 8, '#e8b04a', true, .6, 1.2); light(chest(b), '#e8b04a', 5); } catch (e) { } })],
    '실드 연속 스로우': (a, b) => T.ranged(a, b, '실드 반사 스로우', 'arrow', 'shield', { n: 2, size: 1.1, v: 340, prep: 'throw', cast: 'throw' }),
    '실드 배치': (a, b) => T.melee(a, b, '실드 배치', 'shield', { prep: 'punchPrep', strike: 'punch', n: 2, reach: 7 }),
    '실드 가드': (a, b) => [...seq(a, b, [['crossArms', .3, { aura: 1, elem: 'shield' }]]), ...T.at(a, b, '진동 실드 가드', 'shield', 'shield', { pose: 'crossArms', pw: 1.1 })],
    '콤보 펀치': (a, b) => T.melee(a, b, '콤보 펀치', 'power', { prep: 'punchPrep', strike: 'punch', strike2: 'uppercut', n: 3 }),
    '강타 하이킥': (a, b) => T.melee(a, b, '강타 하이킥', 'power', { prep: 'kickPrep', strike: 'highKick', n: 1, pw: 1.4 }),
    '방패 돌진': (a, b) => T.dash(a, b, '방패 돌진', null, 'shield', 1.4, false, { run: 'crouchRun', hold: 'punch' }),
  }, { name: '실드 스로우', hand: null, elem: 'shield', kind: 'arrow', fly: false });

  defChar('thor', '토르', 'marvel', {
    '묠니르 투척': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '묠니르 투척', 'arrow', 'storm', { size: 1.6, v: 380, prep: 'throw', cast: 'throw' }), step(.32, [[a, { pose: 'point', face: b, elem: 'storm' }], [b, { pose: 'hurt', face: a }]], () => { try { bolt(chest(b), handP(a), '#9fd8ff', .38, 2.4); ring(V3(b.pos.x, .4, b.pos.z), 10, '#9fd8ff', true, .6, 1.2); } catch (e) { } })],
    '천둥 소환': (a, b) => [...seq(a, b, [['skyRaise', .4, { aura: 1, elem: 'storm' }]]), ...T.sky(a, b, '천둥 소환', 'storm', { ult: true, w: 26 })],
    '묠니르 일격': (a, b) => T.melee(a, b, '묠니르 일격', 'storm', { prep: 'hammerUp', strike: 'hammerDown', n: 1, pw: 2, reach: 9 }),
    '뇌전 광역': (a, b) => [...T.aoe(a, b, '뇌전 방출', 'storm', { prep: 'skyRaise', strike: 'skyRaise', rad: 42, pw: 1.8, ult: true }), step(.28, [[a, { pose: 'skyRaise', face: b }], [b, { pose: 'hurt' }]], () => { try { for (let i = 0; i < 8; i++) { const gx = b.pos.x + R(-34, 34), gz = b.pos.z + R(-34, 34); bolt(V3(gx, 95, gz), V3(gx, 1, gz), '#cfe8ff', .5, 2); } light(chest(b), '#cfe8ff', 12); flashScreen(.06); } catch (e) { } })],
    '플래시 돌진': (a, b) => [...hover(a, b, .15), ...T.dash(a, b, '플래시 소환 돌진', null, 'storm', 1.5, false, { run: 'flipAir' })],
    '공중 망치 강타': (a, b) => [...hover(a, b, .22), ...T.aoe(a, b, '공중 강타', 'storm', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 32, pw: 2 })],
    '번개 연사': (a, b) => T.ranged(a, b, '번개 연사', 'senbon', 'storm', { n: 3, size: .9, v: 360, prep: 'skyRaise', cast: 'palm' }),
    '벼락 강화 일격': (a, b) => T.melee(a, b, '벼락 강화 일격', 'storm', { prep: 'hammerUp', strike: 'hammerDown', n: 2, pw: 1.8, reach: 10 }),
  }, { name: '묠니르', hand: null, elem: 'storm', kind: 'arrow', fly: true });

  defChar('hulk', '헐크', 'marvel', {
    '헐크 스매시': (a, b) => T.melee(a, b, '헐크 스매시', 'gamma', { prep: 'hammerUp', strike: 'hammerDown', n: 2, pw: 2.2, reach: 12 }),
    '그라운드 펌프': (a, b) => [...seq(a, b, [['hammerUp', .4, { aura: 1, elem: 'gamma' }]]), ...T.aoe(a, b, '그라운드 펌프', 'gamma', { prep: 'hammerDown', strike: 'hammerDown', rad: 46, pw: 2.4, ult: true }), step(.22, [[a, { pose: 'braced', face: b }]], () => { try { const g = V3(b.pos.x, 0, b.pos.z); if (window.FX3) { if (FX3.ground) FX3.ground(g, 3.2, 'gamma'); if (FX3.crack) FX3.crack(g, 34, 'gamma', { grow: .8, dur: 6 }); if (FX3.floatRocks) FX3.floatRocks(g, 18, 40, 1.6); } } catch (e) { } })],
    '점프 스매시': (a, b) => [...jump(a, b), ...T.aoe(a, b, '점프 스매시', 'gamma', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 38, pw: 2.1 })],
    '클래핑 핸드': (a, b) => T.aoe(a, b, '박수 충격파', 'gamma', { prep: 'crossArms', strike: 'palm', rad: 30, pw: 1.6 }),
    '집어 던지기': (a, b) => T.melee(a, b, '집어 던지기', 'gamma', { prep: 'shoulder', strike: 'palm', n: 1, pw: 2 }),
    '헐크 포효': (a, b) => [...seq(a, b, [['skyRaise', .45, { aura: 1, elem: 'gamma' }]]), ...T.aoe(a, b, '헐크 포효', 'gamma', { prep: 'skyRaise', strike: 'braced', rad: 44, pw: 1.2 })],
    '헐크 돌진': (a, b) => T.dash(a, b, '헐크 돌진', null, 'gamma', 1.9, true, { run: 'crouchRun', hold: 'shoulder' }),
  }, { name: '스매시', hand: null, elem: 'gamma', kind: 'fireball', fly: false });

  const web = (a, to, life = .28) => { try { const h = handP(a); bolt(h, to.clone(), '#eef2f8', life, 1.3); bolt(h, to.clone().add(V3(R(-3, 3), R(-3, 3), R(-3, 3))), '#c8d2e0', life, 1.0); mark(to.clone(), R(0, PI), 5, '#e8ecf2', .5, 1); } catch (e) { } };

  defChar('spiderman', '스파이더맨', 'marvel', {
    '웹 슈팅': (a, b) => [...seq(a, b, [['point', .22, { aura: 1, elem: 'web' }]]), ...T.ranged(a, b, '웹 슈팅', 'senbon', 'web', { n: 2, size: .8, v: 440, prep: 'point', cast: 'throw' }), step(.16, [[a, { pose: 'point', face: b, elem: 'web' }], [b, { pose: 'hurt', face: a }]], () => web(a, chest(b)))],
    '웹 옐링': (a, b) => [...seq(a, b, [['point', .2, { aura: 1, elem: 'web' }]]), step(.18, [[a, { pose: 'point', face: b, elem: 'web' }], [b, { pose: 'hurt', face: a }]], () => { web(a, chest(b)); try { b.kb.addScaledVector(dirTo(b, a), 240); b.air = true; } catch (e) { } }), ...T.melee(a, b, '당겨 붙여 타격', 'web', { prep: 'punchPrep', strike: 'punch', n: 2, reach: 9 })],
    '웹 스윙 기동': (a, b) => [step(.16, [[a, { pose: 'point', face: b, elem: 'web' }], [b, { pose: 'stance', face: a }]], () => { try { const h = handP(a), ax = a.pos.clone().lerp(b.pos, .7).setY(70); bolt(h, ax, '#eef2f8', .45, 1.5); } catch (e) { } }), step(.34, [[a, { pose: 'flipAir', face: b, fwd: 180, vy: R(250, 330), to: near(a, b, 12), ghost: 1, elem: 'web' }], [b, { pose: 'hurt', face: a }]], () => web(a, chest(b))), ...T.aoe(a, b, '웹 스윙 강타', 'web', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 26, pw: 1.8 })],
    '스파이더 콤보': (a, b) => T.melee(a, b, '스파이더 콤보', 'web', { prep: 'punchPrep', strike: 'punch', strike2: 'highKick', n: 4 }),
    '웹 돔': (a, b) => [...seq(a, b, [['point', .25, { aura: 1, elem: 'web' }]]), ...T.aoe(a, b, '웹 돔', 'web', { prep: 'point', strike: 'palm', rad: 30, pw: 1.2 }), step(.16, [[a, { pose: 'palm', face: b, elem: 'web' }], [b, { pose: 'hurt' }]], () => { try { ring(V3(b.pos.x, .4, b.pos.z), 14, '#eef2f8', true, .8, 1.4); for (let i = 0; i < 3; i++) mark(V3(b.pos.x + R(-8, 8), .3, b.pos.z + R(-8, 8)), R(0, PI), 6, '#e8ecf2', .5, 1.4); } catch (e) { } })],
    '스파이더 센스 반격': (a, b) => [...seq(a, b, [['guard', .25, { aura: 1 }]]), ...T.melee(a, b, '회피 반격', 'web', { prep: 'flipAir', strike: 'highKick', n: 1, pw: 1.5 }), step(.12, [[a, { pose: 'guard', face: b }]], () => { try { arc(a, -1.4, 1.4, 8, '#eef2f8', 3, .6); } catch (e) { } })],
    '웹 스윙 강타': (a, b) => [step(.18, [[a, { pose: 'point', face: b, aura: 1, elem: 'web' }], [b, { pose: 'stance', face: a }]], () => { try { const h = handP(a), ax = b.pos.clone().setY(120); bolt(h, ax, '#ffffff', .5, 2); light(h, '#eef2f8', 10); } catch (e) { } }), step(.4, [[a, { pose: 'flipAir', face: b, vy: R(320, 420), to: near(a, b, 8), ghost: 1, aura: 1, elem: 'web' }], [b, { pose: 'hurt', face: a }]], () => web(a, chest(b))), ...T.aoe(a, b, '스파이더 필살 강타', 'web', { jump: true, prep: 'flipAir', strike: 'hammerDown', rad: 34, pw: 2.4, ult: true })],
  }, { name: '웹 슈터', hand: null, elem: 'web', kind: 'senbon', fly: false });

  defChar('vision', '비전', 'marvel', {
    '솔라 플레어': (a, b) => [...hover(a, b, .2), ...T.ranged(a, b, '솔라 플레어', 'orb', 'cosmic', { size: 2.2, v: 440, ult: true, prep: 'crossArms', cast: 'palm' }), step(.2, [[a, { pose: 'palm', face: b, aura: 1, elem: 'cosmic' }]], () => { try { const h = handP(a), d = dirTo(a, b); bolt(h, h.clone().addScaledVector(d, 120), '#ff7a3a', .4, 4); light(h, '#ff7a3a', 12); } catch (e) { } })],
    '위상 관통': (a, b) => T.melee(a, b, '위상 관통', 'mystic', { prep: 'punchPrep', strike: 'punch', n: 2, pw: 1.6, reach: 8 }),
    '마인드 스톤 방출': (a, b) => [...hover(a, b, .2), ...T.aoe(a, b, '마인드 스톤 방출', 'cosmic', { prep: 'skyRaise', strike: 'palm', rad: 36, pw: 1.8 })],
    '위상 돌진': (a, b) => [...hover(a, b, .15), ...T.dash(a, b, '위상 돌진', null, 'mystic', 1.3, false, { run: 'flipAir' })],
    '위상 통과': (a, b) => [...seq(a, b, [['crossArms', .25, { aura: 1, elem: 'mystic' }]]), ...T.at(a, b, '위상 통과', 'mystic', 'mystic', { pose: 'crossArms', pw: 1 })],
    '코스믹 돌진': (a, b) => T.dash(a, b, '코스믹 돌진', null, 'cosmic', 1.5, false, { run: 'crouchRun', hold: 'palm' }),
  }, { name: '솔라 플레어', hand: null, elem: 'cosmic', kind: 'orb', fly: true });

  NW.marvelProf = { marvel: { lunge: 1.6, kb: 1.1, hs: 1, combo: .25, blink: 1 } };
  NW.marvelKeyp = { ironman: { lunge: 1.9 }, hulk: { kb: 1.6 }, thor: { lunge: 1.8 } };

  // ── 캐릭터별 외형 정체성(aot 와 동일한 registerCharAsset 경로: 머리·의상·망토·무기·체형) ──
  if (window.registerCharAsset) {
    registerCharAsset('ironman', { body: 'n', cos: { coat: { c: '#b8322a', c2: '#d8b24a', pat: 'split', len: 'thigh', sleeves: true }, shirt: '#b8322a', vest: '#b8322a', sash: '#d8b24a', boots: '#d8b24a', metalArms: '#d8b24a', metalBody: '#b8322a', core: '#7fe3ff', plate: '#c8ccd8' }, hair: { s: 'short', n: 12, L: .3 }, face: 'sharp', facep: { jw: .95, jl: 1.02, es: .9, ba: .3, bw: 1.05 } });
    registerCharAsset('captain', { body: 'm', cos: { coat: { c: '#2a5a9a', c2: '#c0392b', pat: 'grad', len: 'thigh', sleeves: true }, shirt: '#e8e8ec', vest: '#2a5a9a', sash: '#c8a24a', boots: '#c0392b', plate: '#c8ccd8' }, hair: { s: 'short', n: 18, L: .5 }, face: 'round', facep: { jw: 1.0, jl: 1.0, es: 1.0, ba: .2, bw: 1.15 } });
    registerCharAsset('thor', { body: 'm', cos: { cape: '#1a1a24', shirt: '#3a4a7a', vest: '#2a2a34', sash: '#7a5a2a', boots: '#2a2a34', plate: '#c8ccd8' }, hair: { s: 'long', n: 26, L: 1.25 }, face: 'sharp', facep: { jw: 1.05, jl: 1.06, es: .95, ba: .4, bw: 1.2 } });
    registerCharAsset('hulk', { body: 'm', cos: { bare: true, shorts: { c: '#3a6a8a', cuff: '#2a4a6a', knee: .3 }, sash: '#2a4a6a', warmer: '#3a6a8a' }, hair: { s: 'messy', n: 16, L: .55 }, face: 'sharp', facep: { jw: 1.15, jl: 1.05, es: .8, ba: .55, bw: 1.3 } });
    registerCharAsset('spiderman', { body: 'n', cos: { coat: { c: '#c0392b', len: 'knee', sleeves: true }, shirt: '#2a5a9a', pants: '#2a5a9a', sash: '#c0392b', boots: '#c0392b', wide: true }, hair: { s: 'short', n: 8, L: .18 }, face: 'round', facep: { jw: .95, jl: 1.0, es: 1.2, eh: .9, ba: .1, bw: 1.0 } });
    registerCharAsset('vision', { body: 'n', cos: { cape: '#2a2a34', coat: { c: '#c0392b', c2: '#7a5a2a', len: 'thigh', sleeves: true }, shirt: '#c0392b', sash: '#e6c24a', boots: '#7a5a2a', plate: '#e8e8f0' }, hair: { s: 'short', n: 14, L: .45 }, face: 'sharp', facep: { jw: .95, jl: 1.05, es: .9, ba: .3, bw: 1.0 } });
  }
  if (window.NW && NW.sword) { NW.sword('thor', { L: 14, W: 3.4, c: '#a8b0bc', h: '#6a4a2a', g: '#2a2a2a', dual: false }); }
  // ── 체형 구분감: 헐크(초대형)·비전(슬림)·토르(근육)·캡틴(근육) — aot 처럼 CH 직접 ──
  if (CH.hulk) { CH.hulk.bodyScale = 1.55; CH.hulk.bulk = 1.55; }
  if (CH.thor) { CH.thor.bodyScale = 1.15; CH.thor.bulk = 1.2; }
  if (CH.captain) { CH.captain.bodyScale = 1.08; CH.captain.bulk = 1.15; }
  if (CH.vision) { CH.vision.bodyScale = 1.02; CH.vision.bulk = .92; }
  if (CH.ironman) { CH.ironman.bulk = 1.05; }
  if (CH.spiderman) { CH.spiderman.bodyScale = .96; CH.spiderman.bulk = .92; }

  NW.finish(NW.marvelProf, NW.marvelKeyp); // addTeam 으로 marvel 팀 등록 + prof/keyp 머지(NW.finish 는 머지라 기존 aot/jjk 유지)
})();
