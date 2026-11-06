// 상황별 몸동작 사전 — 키프레임 자세를 이어 붙여(부드럽게 섞어) 대기·이동·공격·방어·피격·기술 준비·도발 등을 다양하게 보여 준다.
// arena.js 의 apply(자세 정하기)·update(매 화면)·poseModel(그리기)을 감싼다. 기술 고유 자세(나선환 손·고무 팔 늘이기 등)는 건드리지 않는다.
// 60fps 원칙: 동작표는 불러올 때 한 번만 숫자 배열로 만들고, 매 화면에는 인물마다 미리 만든 객체 하나에 값만 덮어쓴다.
(function () {
  if (typeof POSE === 'undefined' || typeof apply !== 'function' || typeof update !== 'function') return;

  // 각도 0 = 아래, + = 앞. arm/fore = 앞팔 위팔·아래팔(아래팔은 절대 각도), barm/bfore = 뒷팔, leg = 보폭, kick = 앞다리 들기,
  // lean = 앞으로 숙임, bob = 웅크림, twist = 몸통 돌림, spread = 다리 벌림, armX = 팔 벌림, sw/sw2 = 칼 방향(0 위, -1.57 앞), gy = 두 손 모음,
  // hd = 고개 젖힘(+ 위), ht = 고개 돌림, tl = 몸 전체 기울임(- 앞), hy = 살짝 뜸
  const KEYS = ['arm', 'fore', 'barm', 'bfore', 'leg', 'kick', 'lean', 'bob', 'twist', 'spread', 'armX', 'sw', 'sw2', 'gy', 'hd', 'ht', 'tl', 'hy'];
  const NK = KEYS.length, IX = {}; KEYS.forEach((k, i) => IX[k] = i);
  const BASE = { arm: .35, fore: 2.65, barm: .85, bfore: 2.35, leg: .42, kick: 0, lean: 2, bob: 2.5, twist: -.32, spread: .1, armX: .18, sw: NaN, sw2: NaN, gy: 0, hd: 0, ht: 0, tl: 0, hy: 0 };

  // 자주 쓰는 팔 모양
  const G = { arm: .35, fore: 2.65, barm: .85, bfore: 2.35 };                 // 기본 가드
  const HG = { arm: 1.15, fore: 2.9, barm: 1.0, bfore: 2.85 };               // 높은 가드
  const DN = { arm: .08, fore: .2, barm: .08, bfore: .2, armX: .15 };         // 팔 내림
  const HIP = { arm: -.35, fore: 1.15, barm: -.35, bfore: 1.15, armX: .35 };  // 허리춤 주먹
  const PF = { arm: 1.57, fore: 1.57 }, PB = { barm: 1.57, bfore: 1.57 };     // 앞손·뒷손 뻗음
  const UP = { arm: 2.95, fore: 3.05, barm: 2.9, bfore: 3.0 };               // 두 팔 위로
  // 칼 자세(moves.js 와 같은 값)
  const S = {
    chudan: { arm: .55, fore: 1.25, barm: .6, bfore: 1.2, sw: -1.05, gy: .42 }, hasso: { arm: .35, fore: 2.75, barm: .55, bfore: 2.6, sw: .35, gy: .35 },
    jodan: { arm: 2.75, fore: 3.05, barm: 2.7, bfore: 3.0, sw: 1.15, gy: .25 }, waki: { arm: -.35, fore: .25, barm: -.2, bfore: .35, sw: 2.3, gy: .3 },
    kesa: { arm: .75, fore: .95, barm: .8, bfore: 1.0, sw: -2.2, gy: .4 }, upcut: { arm: 1.9, fore: 2.4, barm: 1.7, bfore: 2.2, sw: -.55, gy: .4 },
    yoko: { arm: 1.45, fore: 1.5, barm: 1.3, bfore: 1.45, sw: -1.57, gy: .45 }, tsuki: { arm: 1.4, fore: 1.55, barm: 1.25, bfore: 1.45, sw: -1.57, gy: .5 },
    iaiR: { arm: .15, fore: 1.4, barm: .35, bfore: 1.9, sw: 2.5, gy: .55 }, iaiC: { arm: 1.75, fore: 1.7, barm: -.4, bfore: .3, sw: -1.35, gy: 0 },
    uke: { arm: 2.3, fore: 2.6, barm: 2.2, bfore: 2.5, sw: -1.57, gy: .3 }, run: { arm: .2, fore: .9, barm: .3, bfore: 1.6, sw: 2.0, gy: 0 },
  };
  const o = (...a) => Object.assign({}, ...a);

  // ═══ 동작 사전 ═══
  // M(이름, 분류, 설정, 키프레임[[시각 0~1, 바뀌는 값]...])
  // 설정: loop = 한 바퀴 초(반복), ph = 'run'(달리기 걸음에 맞춤), t = 어울리는 성향, a = 'sword'(칼 든 인물만) | 'free'(맨손만) | 'any', only = 그 인물만, wrap = 팔이 한 바퀴 도는 동작
  const DEF = [];
  const M = (n, cat, opt, frames) => DEF.push({ n, cat, ...opt, frames });

  // ── 대기 ──
  M('숨 고르기', 'idle', { loop: 2.6, a: 'free' }, [[0, o(G, { bob: 2.5 })], [.5, { bob: 1.4, arm: .45, barm: .95, hd: .06 }], [1, { bob: 2.5 }]]);
  M('어깨 돌리기', 'idle', { loop: 1.8, a: 'free' }, [[0, o(G, { armX: .1 })], [.25, { armX: .55, twist: -.1 }], [.5, { armX: .2, arm: .6, twist: -.45 }], [.75, { armX: .5, barm: 1.1 }], [1, { armX: .1 }]]);
  M('목 풀기', 'idle', { loop: 2.2, a: 'any' }, [[0, { ht: 0, hd: 0 }], [.25, { ht: .55, hd: -.15 }], [.5, { ht: 0, hd: .25 }], [.75, { ht: -.55, hd: -.15 }], [1, { ht: 0, hd: 0 }]]);
  M('손목 털기', 'idle', { loop: .9, a: 'free' }, [[0, o(DN, { arm: .4, fore: 1.0, barm: .4, bfore: 1.0 })], [.25, { fore: .5, bfore: 1.3 }], [.5, { fore: 1.1, bfore: .6 }], [.75, { fore: .5, bfore: 1.2 }], [1, { fore: 1.0, bfore: 1.0 }]]);
  M('복서 스텝', 'idle', { loop: .55, a: 'free', t: ['boxer', 'brawl', 'tech'] }, [[0, o(HG, { bob: 4, hy: 0, twist: -.4 })], [.5, { bob: 2.5, hy: 1.4, twist: -.3 }], [1, { bob: 4, hy: 0, twist: -.4 }]]);
  M('무에타이 가드', 'idle', { loop: 1.4, a: 'free', t: ['kick', 'taijutsu'] }, [[0, o(HG, { lean: -2, bob: 2, kick: .2 })], [.5, { kick: .55, lean: -3, armX: .3 }], [1, { kick: .2, lean: -2 }]]);
  M('닌자 낮은 자세', 'idle', { loop: 1.8, a: 'free', t: ['ninja'] }, [[0, { arm: .9, fore: 2.0, barm: -.6, bfore: .2, bob: 9, lean: 6, spread: .35, twist: -.55 }], [.5, { bob: 10, arm: 1.0, ht: .2 }], [1, { bob: 9, arm: .9, ht: 0 }]]);
  M('이리 와 손짓', 'idle', { loop: 1.0, a: 'free', t: ['wild', 'brawl', 'flow', 'gai'] }, [[0, { arm: 1.35, fore: 2.0, barm: .3, bfore: .8, lean: -1, twist: -.2 }], [.5, { fore: 2.8 }], [1, { fore: 2.0 }]]);
  M('팔짱', 'idle', { loop: 3.0, a: 'free', t: ['calm', 'noble'] }, [[0, { arm: .95, fore: 2.35, barm: .95, bfore: 2.35, armX: -.35, lean: -1.5, bob: 1, twist: -.1 }], [.5, { hd: .08, ht: .15 }], [1, { hd: 0, ht: 0 }]]);
  M('주머니 손 무심', 'idle', { loop: 3.2, a: 'free', t: ['calm', 'noble', 'saitama'] }, [[0, o(DN, { armX: .05, lean: -1, bob: .8, twist: 0, leg: .3 })], [.5, { ht: .25, hd: -.05 }], [1, { ht: 0, hd: 0 }]]);
  M('좌우 살피기', 'idle', { loop: 2.4, a: 'any' }, [[0, { ht: 0 }], [.2, { ht: .6 }], [.45, { ht: .6 }], [.65, { ht: -.6 }], [.85, { ht: -.6 }], [1, { ht: 0 }]]);
  M('체중 옮기기', 'idle', { loop: 2.0, a: 'any' }, [[0, { twist: -.45, spread: .15, bob: 3 }], [.5, { twist: -.15, spread: .3, bob: 4.5, lean: 3 }], [1, { twist: -.45, spread: .15, bob: 3 }]]);
  M('제자리 뛰기', 'idle', { loop: .45, a: 'free', t: ['wild', 'kick', 'taijutsu'] }, [[0, o(G, { hy: 0, bob: 3 })], [.5, { hy: 2.2, bob: 1, armX: .3 }], [1, { hy: 0, bob: 3 }]]);
  M('기지개', 'idle', { loop: 3.0, a: 'free', t: ['calm', 'wild'] }, [[0, o(G)], [.4, o(UP, { lean: -3, hd: .3, armX: .4 })], [.7, o(UP, { lean: -2, armX: .6 })], [1, o(G, { hd: 0 })]]);
  M('손가락 꺾기', 'idle', { loop: 1.4, a: 'free', t: ['brawl', 'wild', 'flow'] }, [[0, { arm: 1.1, fore: 1.9, barm: 1.1, bfore: 1.9, armX: -.4, gy: .35, twist: 0 }], [.5, { fore: 2.2, bfore: 2.2, hd: -.1 }], [1, { fore: 1.9, bfore: 1.9, hd: 0 }]]);
  M('학 자세', 'idle', { loop: 2.2, a: 'free', t: ['kick', 'taijutsu', 'flow'] }, [[0, { arm: 2.1, fore: 2.9, barm: -.5, bfore: .6, kick: 1.1, leg: .15, bob: 1, lean: 0, armX: .5 }], [.5, { arm: 2.3, hy: .4 }], [1, { arm: 2.1, hy: 0 }]]);
  M('엄지척 나이스 가이', 'idle', { loop: 2.0, a: 'free', only: ['gai'] }, [[0, { arm: 1.35, fore: 2.55, barm: .2, bfore: .6, twist: .25, lean: 0, hd: .15 }], [.5, { arm: 1.45, hd: .25 }], [1, { arm: 1.35, hd: .15 }]]);
  M('칼 고쳐 쥐기', 'idle', { loop: 2.4, a: 'sword' }, [[0, o(S.chudan)], [.35, o(S.chudan, { sw: -.6, gy: .2 })], [.55, o(S.chudan, { sw: -1.2, gy: .5 })], [1, o(S.chudan)]]);
  M('칼끝 흔들기', 'idle', { loop: 1.2, a: 'sword' }, [[0, o(S.chudan, { bob: 4 })], [.5, o(S.chudan, { sw: -1.3, bob: 5, twist: -.35 })], [1, o(S.chudan, { bob: 4 })]]);
  M('칼 어깨에 메기', 'idle', { loop: 2.6, a: 'sword', t: ['wild', 'big'] }, [[0, { arm: 1.9, fore: 3.0, barm: .1, bfore: .3, sw: 2.7, gy: 0, lean: -1, twist: -.15 }], [.5, { hd: .1, ht: .2 }], [1, { hd: 0, ht: 0 }]]);
  M('발도 대기', 'idle', { loop: 2.0, a: 'sword', t: ['iai', 'calm'] }, [[0, o(S.iaiR, { bob: 8, lean: 6, spread: .25 })], [.5, o(S.iaiR, { bob: 9, hd: -.1 })], [1, o(S.iaiR, { bob: 8, hd: 0 })]]);
  M('팔상 자세 숨', 'idle', { loop: 2.4, a: 'sword', t: ['breath'] }, [[0, o(S.hasso, { bob: 4 })], [.5, o(S.hasso, { bob: 2.8, hd: .08 })], [1, o(S.hasso, { bob: 4, hd: 0 })]]);
  M('협단 낮춤', 'idle', { loop: 2.2, a: 'sword', t: ['wild', 'dance'] }, [[0, o(S.waki, { bob: 6, lean: 3 })], [.5, o(S.waki, { bob: 7, twist: -.8 })], [1, o(S.waki, { bob: 6 })]]);
  M('상단 겨눔', 'idle', { loop: 2.0, a: 'sword', t: ['big', 'breath'] }, [[0, o(S.jodan, { bob: 2 })], [.5, o(S.jodan, { bob: 3, sw: 1.0 })], [1, o(S.jodan, { bob: 2 })]]);
  M('공중 부유', 'idle', { loop: 2.4, a: 'free', only: ['tatsumaki'] }, [[0, { arm: .9, fore: 1.6, barm: .6, bfore: 1.0, armX: .7, hy: 2, bob: 0, lean: 0 }], [.5, { hy: 3.2, armX: .9 }], [1, { hy: 2, armX: .7 }]]);

  // ── 지침·피격 뒤 대기 ──
  M('무릎 짚고 헐떡임', 'tired', { loop: .75, a: 'any' }, [[0, { arm: .4, fore: .55, barm: .4, bfore: .55, bob: 7, lean: 9, hd: -.25, armX: .1 }], [.5, { bob: 8, lean: 10, hd: -.1 }], [1, { bob: 7, lean: 9, hd: -.25 }]]);
  M('어깨 들썩 숨', 'tired', { loop: .6, a: 'any' }, [[0, o(DN, { bob: 4, lean: 4, hd: -.15 })], [.5, { bob: 2.5, hd: .05, armX: .25 }], [1, { bob: 4, hd: -.15 }]]);
  M('비틀 버팀', 'tired', { loop: 1.4, a: 'any' }, [[0, { twist: -.6, spread: .35, bob: 5, lean: 5, armX: .4 }], [.5, { twist: -.1, lean: 3, ht: .3 }], [1, { twist: -.6, lean: 5, ht: 0 }]]);
  M('입가 훔치기', 'hurtIdle', { loop: 1.6, a: 'free' }, [[0, o(G)], [.35, { arm: 1.6, fore: 3.0, ht: -.3, hd: .1 }], [.6, { arm: 1.3, fore: 2.4, ht: .2 }], [1, o(G, { ht: 0, hd: 0 })]]);
  M('어깨 부여잡기', 'hurtIdle', { loop: 1.8, a: 'any' }, [[0, { arm: .1, fore: .3, barm: 1.4, bfore: 2.7, armX: -.3, lean: 4, bob: 4, twist: -.4, hd: -.1 }], [.5, { bob: 5, twist: -.6 }], [1, { bob: 4, twist: -.4 }]]);
  M('고개 털기', 'hurtIdle', { loop: 1.1, a: 'any' }, [[0, { ht: 0, hd: 0 }], [.2, { ht: .5 }], [.4, { ht: -.5 }], [.6, { ht: .3, hd: .1 }], [1, { ht: 0, hd: 0 }]]);
  M('가드 다시 올림', 'hurtIdle', { loop: 1.6, a: 'free' }, [[0, o(DN, { bob: 3 })], [.5, o(HG, { bob: 4, lean: 3 })], [1, o(HG, { bob: 4 })]]);

  // ── 달리기(걸음과 맞춤) ──
  M('전력질주 팔치기', 'run', { ph: 'run', a: 'free' }, [[0, { arm: .1, fore: 1.6, barm: .1, bfore: 1.6, lean: 7, twist: 0 }], [.25, { arm: -.9, fore: .5, barm: 1.1, bfore: 2.6, twist: .18 }], [.5, { arm: .1, fore: 1.6, barm: .1, bfore: 1.6, twist: 0 }], [.75, { arm: 1.1, fore: 2.6, barm: -.9, bfore: .5, twist: -.18 }]]);
  M('닌자 달리기', 'run', { ph: 'run', a: 'free', t: ['ninja'] }, [[0, { arm: -1.25, fore: -1.0, barm: -1.25, bfore: -1.0, lean: 12, bob: 3, armX: .2, hd: .2 }], [.5, { arm: -1.35, fore: -1.1, barm: -1.15, bfore: -.95 }]]);
  M('칼 끌며 질주', 'run', { ph: 'run', a: 'sword' }, [[0, { arm: -.6, fore: -.2, barm: 1.0, bfore: 1.9, lean: 9, bob: 5, sw: 2.6, gy: 0, twist: -.25 }], [.5, { barm: .7, bfore: 1.6 }]]);
  M('칼 겨누고 돌진', 'run', { ph: 'run', a: 'sword', t: ['thrust', 'breath'] }, [[0, o(S.chudan, { lean: 8, bob: 4, sw: -1.4 })], [.5, o(S.chudan, { lean: 9, bob: 5, sw: -1.5 })]]);
  M('칼 들고 달리기', 'run', { ph: 'run', a: 'sword' }, [[0, o(S.run, { lean: 6 })], [.25, o(S.run, { barm: -.4, bfore: .6 })], [.5, o(S.run)], [.75, o(S.run, { barm: 1.0, bfore: 2.3 })]]);
  M('숙여 태클 돌진', 'run', { ph: 'run', a: 'free', t: ['wild', 'brawl', 'big'] }, [[0, { arm: .9, fore: 2.4, barm: .9, bfore: 2.4, lean: 13, bob: 6, armX: -.1, twist: -.4 }], [.5, { lean: 14, bob: 7 }]]);
  M('가드 올리고 전진', 'run', { ph: 'run', a: 'free', t: ['boxer', 'tech'] }, [[0, o(HG, { lean: 6, bob: 4 })], [.5, o(HG, { lean: 6, bob: 5, twist: -.5 })]]);
  M('팔 펄럭 질주', 'run', { ph: 'run', a: 'free', t: ['rubber', 'wild'] }, [[0, { arm: -.5, fore: -.2, barm: -.5, bfore: -.2, armX: 1.1, lean: 8 }], [.25, { arm: .3, fore: .9, armX: 1.3 }], [.5, { arm: -.5, fore: -.2, barm: .3, bfore: .9 }], [.75, { armX: 1.0, barm: -.5, bfore: -.2 }]]);
  M('여유로운 걸음', 'run', { ph: 'run', a: 'free', t: ['calm', 'noble', 'saitama'] }, [[0, o(DN, { lean: 2, armX: .1 })], [.25, { arm: -.25, fore: 0, barm: .3, bfore: .45 }], [.5, { arm: .08, fore: .2, barm: .08, bfore: .2 }], [.75, { arm: .3, fore: .45, barm: -.25, bfore: 0 }]]);
  M('지그재그 대시', 'run', { ph: 'run', a: 'free', t: ['flow', 'dance', 'taijutsu'] }, [[0, { arm: .6, fore: 2.0, barm: -.6, bfore: .4, twist: -.6, lean: 9 }], [.5, { arm: -.6, fore: .4, barm: .6, bfore: 2.0, twist: .5, lean: 9 }]]);
  M('미끄러지듯 순보', 'run', { ph: 'run', a: 'any', t: ['calm', 'noble', 'flow'] }, [[0, { lean: 10, bob: 3, armX: .05, ht: 0 }], [.5, { lean: 11, bob: 3.5 }]]);
  M('옆걸음 가드', 'strafe', { loop: .6, a: 'free' }, [[0, o(G, { twist: -.7, spread: .25, bob: 5 })], [.5, o(G, { twist: -.75, spread: .45, bob: 6 })], [1, { spread: .25, bob: 5 }]]);
  M('옆걸음 칼', 'strafe', { loop: .6, a: 'sword' }, [[0, o(S.chudan, { twist: -.6, spread: .3, bob: 5 })], [.5, o(S.chudan, { spread: .45, bob: 6 })], [1, o(S.chudan, { spread: .3, bob: 5 })]]);
  M('게걸음 낮게', 'strafe', { loop: .5, a: 'any', t: ['ninja', 'wild'] }, [[0, { bob: 9, spread: .5, lean: 5, twist: -.8, armX: .5 }], [.5, { bob: 10, spread: .35 }], [1, { bob: 9, spread: .5 }]]);
  M('뒷걸음 가드', 'retreat', { loop: .7, a: 'free' }, [[0, o(HG, { lean: -4, bob: 4 })], [.5, o(HG, { lean: -5, bob: 5, hd: -.05 })], [1, { lean: -4, bob: 4, hd: 0 }]]);
  M('뒷걸음 칼 겨눔', 'retreat', { loop: .7, a: 'sword' }, [[0, o(S.chudan, { lean: -4, bob: 4, sw: -1.3 })], [.5, o(S.chudan, { lean: -5, bob: 5, sw: -1.4 })], [1, o(S.chudan, { lean: -4, sw: -1.3 })]]);
  M('물러서며 손 내밈', 'retreat', { loop: .8, a: 'free', t: ['calm', 'psychic'] }, [[0, { arm: 1.5, fore: 1.7, barm: .2, bfore: .5, lean: -5, bob: 3 }], [.5, { arm: 1.6, lean: -6 }], [1, { arm: 1.5, lean: -5 }]]);

  // ── 맨손 공격 ──
  M('잽', 'strike', { a: 'free', t: ['boxer', 'brawl'] }, [[0, o(HG, { twist: -.4 })], [.3, o(PF, { twist: -.1, lean: 4 })], [.6, o(PF, { twist: -.1 })], [1, { arm: 1.0, fore: 2.6, twist: -.35 }]]);
  M('원투', 'strike', { a: 'free', t: ['boxer', 'brawl'] }, [[0, o(HG, { twist: -.4 })], [.25, o(PF, { twist: -.2, lean: 4 })], [.45, { arm: 1.0, fore: 2.7 }], [.7, o(PB, { twist: .65, lean: 6 })], [1, o(PB, { twist: .6 })]]);
  M('훅', 'strike', { a: 'free', t: ['boxer', 'brawl', 'wild'] }, [[0, o(G, { twist: -.6 })], [.3, { arm: 1.3, fore: 2.6, armX: .9, twist: -.7 }], [.6, { arm: 1.45, fore: 2.75, armX: -.2, twist: .7, lean: 5 }], [1, { armX: -.1, twist: .6 }]]);
  M('어퍼컷', 'strike', { a: 'free', t: ['boxer', 'brawl'] }, [[0, o(G, { bob: 8, lean: 5 })], [.4, { arm: .2, fore: 2.0, bob: 9 }], [.7, { arm: 2.7, fore: 3.05, bob: 0, lean: 1, hy: 1.5, twist: .6 }], [1, { arm: 2.6, fore: 3.0, hy: 0 }]]);
  M('뒷손 스트레이트', 'strike', { a: 'free', t: ['boxer', 'brawl', 'tech'] }, [[0, o(G, { twist: -.5 })], [.35, { barm: .4, bfore: 2.0, twist: -.65 }], [.65, o(PB, { twist: .75, lean: 7, spread: .15 })], [1, o(PB, { twist: .7 })]]);
  M('팔꿈치 치기', 'strike', { a: 'free', t: ['flow', 'wild', 'taijutsu'] }, [[0, o(G, { twist: -.7 })], [.45, { arm: 1.5, fore: 3.05, twist: -.8 }], [.75, { arm: 1.6, fore: 3.1, twist: .95, lean: 6 }], [1, { twist: .9 }]]);
  M('손날 치기', 'strike', { a: 'free', t: ['ninja', 'flow'] }, [[0, o(G)], [.35, { arm: 2.6, fore: 2.9, twist: -.4 }], [.7, { arm: 1.2, fore: 1.25, twist: .5, lean: 6 }], [1, { arm: 1.1, fore: 1.15 }]]);
  M('쌍장 밀어치기', 'strike', { a: 'free', t: ['flow', 'calm', 'psychic'] }, [[0, o(HIP, { bob: 5 })], [.5, { arm: 1.45, fore: 1.6, barm: 1.45, bfore: 1.6, armX: -.1, lean: 7, bob: 4, twist: 0 }], [1, { lean: 6 }]]);
  M('연타 러시', 'strike', { a: 'free', t: ['brawl', 'rubber', 'boxer', 'wild'] }, [[0, o(HG)], [.12, o(PF, { lean: 5 })], [.24, { arm: 1.0, fore: 2.6, barm: 1.57, bfore: 1.57 }], [.36, o(PF, { barm: 1.0, bfore: 2.6 })], [.48, { arm: 1.0, fore: 2.6, barm: 1.57, bfore: 1.57 }], [.6, o(PF, { barm: 1.0, bfore: 2.6 })], [.72, { arm: 1.0, fore: 2.6, barm: 1.57, bfore: 1.57 }], [.84, o(PF, { barm: 1.0, bfore: 2.6 })], [1, o(PF)]]);
  M('박치기', 'strike', { a: 'any', t: ['wild', 'brawl', 'big'] }, [[0, { lean: -5, hd: .3, armX: .4, arm: .2, fore: .6, barm: .2, bfore: .6 }], [.55, { lean: 15, hd: -.4, bob: 4 }], [1, { lean: 12, hd: -.2 }]]);
  M('어깨 몸통박치기', 'strike', { a: 'any', t: ['big', 'wild', 'brawl'] }, [[0, { twist: -.4, lean: 3 }], [.5, { twist: -1.1, lean: 10, bob: 6, arm: .3, fore: 1.6, barm: .3, bfore: 1.6, armX: -.2 }], [1, { twist: -1.0, lean: 9 }]]);
  M('두 주먹 내려치기', 'strike', { a: 'free', t: ['big', 'wild'] }, [[0, o(UP, { gy: .5, lean: -3, hd: .2 })], [.55, { arm: 1.0, fore: 1.1, barm: 1.0, bfore: 1.1, lean: 9, bob: 7, hd: -.2 }], [1, { lean: 8 }]]);
  M('돌며 백피스트', 'strike', { a: 'free', t: ['flow', 'dance', 'taijutsu'] }, [[0, o(G, { twist: .6 })], [.4, { twist: -1.3, armX: .2 }], [.75, { arm: 1.57, fore: 1.6, armX: 1.1, twist: 1.3, lean: 3 }], [1, { twist: 1.2 }]]);
  M('무심한 한 방', 'strike', { a: 'free', t: ['saitama', 'calm'] }, [[0, o(DN, { lean: 0, twist: 0, bob: 1 })], [.6, o(DN, { lean: 0 })], [.75, o(PF, { lean: 3, twist: .25 })], [1, o(PF, { lean: 3 })]]);
  M('고무 총 당기기', 'strike', { a: 'free', only: ['luffy'] }, [[0, { arm: -1.3, fore: -1.0, barm: .6, bfore: 1.8, twist: -.9, lean: 2 }], [.55, { arm: -1.45, fore: -1.2, twist: -1.0 }], [.75, o(PF, { twist: .7, lean: 8 })], [1, o(PF, { twist: .6 })]]);
  M('니킥 당기기', 'strike', { a: 'any', t: ['kick', 'taijutsu', 'wild'] }, [[0, { arm: 1.9, fore: 2.6, barm: 1.9, bfore: 2.6, armX: -.2, lean: 2 }], [.5, { arm: 1.1, fore: 1.3, barm: 1.1, bfore: 1.3, kick: 2.0, leg: .2, lean: 8, bob: 2 }], [1, { kick: 1.6 }]]);
  M('잡아 던지기', 'strike', { a: 'free', t: ['big', 'brawl', 'wild'] }, [[0, { arm: 1.4, fore: 1.6, barm: 1.4, bfore: 1.6, lean: 7, bob: 5 }], [.4, { arm: 1.6, fore: 2.4, barm: 1.6, bfore: 2.4, armX: -.3 }], [.8, { arm: 2.4, fore: 2.8, barm: 2.0, bfore: 2.6, twist: 1.2, lean: -2 }], [1, { twist: 1.1 }]]);
  M('유수 흐름 손', 'strike', { a: 'free', t: ['flow'] }, [[0, { arm: 1.2, fore: 1.9, barm: .8, bfore: 1.6, twist: -.3, bob: 5 }], [.25, { arm: 1.6, fore: 2.3, barm: 1.2, bfore: 1.4, twist: .2 }], [.5, { arm: 1.0, fore: 1.4, barm: 1.6, bfore: 2.2, twist: -.2 }], [.75, { arm: 1.6, fore: 1.7, barm: 1.0, bfore: 1.8, twist: .4, lean: 6 }], [1, o(PF, { barm: 1.5, bfore: 1.6, lean: 7 })]]);
  M('팔 휘둘러 치기', 'strike', { a: 'free', t: ['big', 'wild'] }, [[0, { arm: 1.5, fore: 1.6, armX: 1.3, twist: -.9 }], [.6, { armX: -.2, twist: 1.0, lean: 6 }], [1, { twist: .9 }]]);
  M('양손 밀쳐내기', 'strike', { a: 'free', t: ['brawl', 'big'] }, [[0, { arm: .9, fore: 2.4, barm: .9, bfore: 2.4, bob: 4 }], [.5, { arm: 1.5, fore: 1.6, barm: 1.5, bfore: 1.6, lean: 8, bob: 3 }], [1, { lean: 7 }]]);
  M('정권 지르기', 'strike', { a: 'free', t: ['taijutsu', 'kick'] }, [[0, o(HIP, { bob: 7, spread: .4 })], [.5, o(PF, { barm: -.4, bfore: 1.1, twist: .4, bob: 7, spread: .4 })], [1, o(PF)]]);
  M('불꽃 주먹 내지르기', 'strike', { a: 'free', only: ['ace', 'rengoku', 'naruto'] }, [[0, { arm: -.6, fore: 1.0, twist: -.9, bob: 6 }], [.55, o(PF, { twist: .8, lean: 9, bob: 4, spread: .3 })], [1, o(PF, { lean: 8 })]]);

  // ── 발차기 ──
  M('앞차기', 'kick', { a: 'any', t: ['kick', 'taijutsu'] }, [[0, o(G, { kick: 0 })], [.4, { kick: 1.0, lean: -1 }], [.65, { kick: 1.75, lean: -4 }], [1, { kick: .4, lean: 1 }]]);
  M('옆차기', 'kick', { a: 'any', t: ['kick', 'taijutsu'] }, [[0, o(G)], [.4, { kick: 1.0, twist: -.6 }], [.7, { kick: 1.65, twist: -1.0, lean: -7, armX: .5 }], [1, { kick: .5, twist: -.6, lean: -2 }]]);
  M('돌려차기', 'kick', { a: 'any', t: ['kick', 'taijutsu', 'flow'] }, [[0, o(G, { twist: -.4 })], [.45, { kick: 1.2, twist: .6 }], [.75, { kick: 1.6, twist: 1.25, armX: .8, lean: -3 }], [1, { kick: .3, twist: .5 }]]);
  M('뒤돌려차기', 'kick', { a: 'any', t: ['kick', 'flow'] }, [[0, o(G, { twist: .5 })], [.35, { twist: -1.4, kick: .5 }], [.7, { twist: 1.6, kick: 1.75, lean: -5, armX: .9 }], [1, { kick: .3, twist: 1.2 }]]);
  M('내려찍기', 'kick', { a: 'any', t: ['kick', 'taijutsu'] }, [[0, o(G)], [.45, { kick: 2.7, lean: -5, armX: .6 }], [.7, { kick: .5, lean: 4, bob: 5 }], [1, { kick: .2, bob: 4 }]]);
  M('발 쓸기', 'kick', { a: 'any', t: ['kick', 'flow', 'ninja'] }, [[0, o(G, { bob: 4 })], [.4, { bob: 13, lean: 6, spread: .45, twist: -.6 }], [.75, { kick: 1.25, bob: 13, twist: 1.3, armX: .9 }], [1, { kick: .3, bob: 10 }]]);
  M('이단 차기', 'kick', { a: 'any', t: ['kick', 'taijutsu'] }, [[0, o(G, { bob: 6 })], [.35, { hy: 4, kick: 1.5, bob: 0 }], [.55, { kick: .3 }], [.75, { kick: 1.8, hy: 3, lean: -4 }], [1, { kick: .3, hy: 0 }]]);
  M('하이킥', 'kick', { a: 'any', t: ['kick', 'taijutsu', 'dance'] }, [[0, o(G)], [.5, { kick: 2.6, lean: -6, twist: .5, armX: .6 }], [1, { kick: .4, lean: 0 }]]);
  M('연속 발차기', 'kick', { a: 'any', t: ['kick'] }, [[0, o(G)], [.14, { kick: 1.5, lean: -4 }], [.28, { kick: .5, twist: .3 }], [.42, { kick: 1.9, twist: .8 }], [.56, { kick: .5, twist: -.2 }], [.7, { kick: 1.6, twist: .5 }], [.85, { kick: 2.3, lean: -6 }], [1, { kick: .4, lean: 0 }]]);
  M('나뭇잎 선풍', 'kick', { a: 'any', only: ['gai', 'nezuko', 'sanji'] }, [[0, { bob: 9, lean: 6, twist: -.8, armX: .3 }], [.4, { bob: 2, hy: 3, kick: 1.5, twist: 1.5, armX: 1.2 }], [.75, { kick: 1.6, twist: 2.4, hy: 2 }], [1, { kick: .3, twist: 1.6, hy: 0 }]]);
  M('낮은 회전 차기', 'kick', { a: 'any', t: ['kick', 'dance'] }, [[0, { bob: 6 }], [.4, { bob: 14, spread: .55, lean: 7, arm: .1, fore: .1 }], [.8, { kick: 1.4, twist: 1.8, bob: 13 }], [1, { kick: .3, twist: 1.0, bob: 9 }]]);
  M('날아 무릎', 'kick', { a: 'any', t: ['kick', 'wild', 'taijutsu'] }, [[0, { bob: 7 }], [.5, { hy: 4.5, kick: 2.1, leg: .2, arm: 2.0, fore: 2.8, barm: -.4, bfore: .5, bob: 0 }], [1, { hy: 0, kick: .6 }]]);
  M('로우킥', 'kick', { a: 'any', t: ['kick', 'boxer'] }, [[0, o(HG)], [.5, { kick: .85, twist: .7, lean: 3 }], [1, { kick: .2, twist: .2 }]]);
  M('밀어차기', 'kick', { a: 'any', t: ['kick', 'calm'] }, [[0, o(G)], [.45, { kick: 1.2, lean: -2 }], [.7, { kick: 1.55, lean: -9 }], [1, { kick: .3, lean: -2 }]]);
  M('주머니 손 발차기', 'kick', { a: 'free', only: ['sanji', 'kizaru'] }, [[0, o(DN, { armX: .05, lean: -1 })], [.5, o(DN, { kick: 2.2, lean: -7, twist: .4 })], [1, o(DN, { kick: .3, lean: -1 })]]);

  // ── 칼 공격 ──
  M('가사베기', 'cut', { a: 'sword' }, [[0, o(S.jodan)], [.45, o(S.jodan, { sw: 1.4 })], [.75, o(S.kesa, { twist: .55, lean: 6 })], [1, o(S.kesa)]]);
  M('횡베기', 'cut', { a: 'sword' }, [[0, o(S.hasso, { twist: -.7 })], [.55, o(S.yoko, { twist: .85, armX: .6, lean: 5 })], [1, o(S.yoko, { twist: .9 })]]);
  M('역베기', 'cut', { a: 'sword' }, [[0, o(S.waki)], [.6, o(S.upcut, { twist: .5, lean: 3 })], [1, o(S.upcut)]]);
  M('찌르기', 'cut', { a: 'sword', t: ['thrust'] }, [[0, o(S.chudan, { lean: 1 })], [.4, o(S.chudan, { arm: .35, fore: 1.0, barm: .4, bfore: 1.0, lean: -1 })], [.65, o(S.tsuki, { lean: 10, spread: .2 })], [1, o(S.tsuki)]]);
  M('발도 일섬', 'cut', { a: 'sword', t: ['iai', 'calm'] }, [[0, o(S.iaiR, { bob: 8 })], [.6, o(S.iaiR, { bob: 9 })], [.75, o(S.iaiC, { twist: .9, lean: 7 })], [1, o(S.iaiC)]]);
  M('회전베기', 'cut', { a: 'sword', t: ['wild', 'dance'] }, [[0, o(S.yoko, { twist: -1.3 })], [.5, o(S.yoko, { twist: .3, armX: .9 })], [.8, o(S.yoko, { twist: 1.7, armX: .8 })], [1, o(S.yoko, { twist: 1.4 })]]);
  M('올려베기', 'cut', { a: 'sword' }, [[0, o(S.kesa, { bob: 6 })], [.6, o(S.upcut, { bob: 1, hy: 1.5 })], [1, o(S.upcut, { hy: 0 })]]);
  M('양손 내려베기', 'cut', { a: 'sword', t: ['big', 'breath'] }, [[0, o(S.jodan, { lean: -3, sw: 1.5 })], [.5, o(S.jodan, { sw: 1.7, lean: -4 })], [.8, o(S.kesa, { lean: 10, bob: 8, sw: -2.4, twist: .1 })], [1, o(S.kesa, { bob: 7 })]]);
  M('연속 베기', 'cut', { a: 'sword', t: ['wild', 'dance', 'thrust'] }, [[0, o(S.hasso)], [.2, o(S.kesa, { twist: .5 })], [.4, o(S.upcut, { twist: -.4 })], [.6, o(S.kesa, { twist: .6 })], [.8, o(S.yoko, { twist: -.5 })], [1, o(S.yoko, { twist: .8 })]]);
  M('수면 가르기', 'cut', { a: 'sword', t: ['breath', 'calm'], only: ['tanjiro', 'giyu'] }, [[0, o(S.yoko, { twist: -1.1, bob: 5, sw: -1.5 })], [.6, o(S.yoko, { twist: 1.1, bob: 5, armX: .7, lean: 6, sw: -1.6 })], [1, o(S.yoko, { twist: 1.2 })]]);
  M('찌르기 연타', 'cut', { a: 'sword', t: ['thrust'], only: ['shinobu', 'obanai', 'law'] }, [[0, o(S.chudan)], [.15, o(S.tsuki, { lean: 9 })], [.3, o(S.chudan, { arm: .4, fore: 1.1 })], [.45, o(S.tsuki, { lean: 10 })], [.6, o(S.chudan, { arm: .4, fore: 1.1 })], [.8, o(S.tsuki, { lean: 11 })], [1, o(S.tsuki)]]);
  M('뛰어 내려베기', 'cut', { a: 'sword', t: ['wild', 'big', 'breath'] }, [[0, o(S.jodan, { bob: 6 })], [.45, o(S.jodan, { hy: 5, bob: 0, sw: 1.6 })], [.8, o(S.kesa, { hy: 0, bob: 9, lean: 10 })], [1, o(S.kesa, { bob: 8 })]]);
  M('채찍 휘감기', 'cut', { a: 'sword', only: ['mitsuri', 'obanai'] }, [[0, o(S.hasso, { armX: .9 })], [.3, o(S.yoko, { twist: -1.0, armX: 1.2, sw: -.6 })], [.6, o(S.yoko, { twist: .8, sw: -2.4, armX: 1.0 })], [1, o(S.yoko, { twist: 1.3, sw: -1.2 })]]);
  M('뒤돌아 베기', 'cut', { a: 'sword', t: ['calm', 'noble', 'iai'] }, [[0, o(S.chudan, { twist: .6 })], [.5, o(S.waki, { twist: -1.6, ht: .5 })], [.8, o(S.yoko, { twist: 1.0, ht: 0, lean: 4 })], [1, o(S.yoko, { twist: .9 })]]);
  M('X자 베기', 'cut', { a: 'sword', dual: true }, [[0, { arm: 2.4, fore: 2.9, barm: 2.4, bfore: 2.9, sw: .9, sw2: .9, armX: .6, gy: 0 }], [.6, { arm: .9, fore: 1.0, barm: .9, bfore: 1.0, sw: -2.3, sw2: -2.3, armX: -.3, lean: 8 }], [1, { lean: 7 }]]);
  M('칼 털기', 'cut', { a: 'sword', t: ['calm', 'noble'] }, [[0, o(S.yoko)], [.5, o(S.kesa, { sw: -2.7, twist: .2 })], [1, o(S.kesa, { sw: -2.6, lean: 1 })]]);

  // ── 방어 ──
  M('팔 막기', 'defend', { a: 'free' }, [[0, o(G)], [.4, { arm: 1.3, fore: 2.85, barm: 1.2, bfore: 2.9, lean: -1, bob: 4 }], [1, { bob: 4 }]]);
  M('X자 막기', 'defend', { a: 'free', t: ['brawl', 'big', 'ninja'] }, [[0, o(G)], [.4, { arm: 1.6, fore: 2.6, barm: 1.6, bfore: 2.6, armX: -.45, lean: 1, bob: 5 }], [1, { bob: 5 }]]);
  M('쳐내기', 'defend', { a: 'free', t: ['flow', 'taijutsu', 'boxer'] }, [[0, o(G)], [.45, { arm: 1.5, fore: 2.3, armX: -.3, twist: -.4 }], [.75, { arm: 1.6, fore: 2.4, armX: 1.0, twist: -.7, lean: 2 }], [1, { armX: .7 }]]);
  M('웅크려 막기', 'defend', { a: 'any', t: ['boxer', 'big'] }, [[0, o(HG)], [.4, o(HG, { bob: 8, lean: 5, armX: -.25, hd: -.2 })], [1, { bob: 8 }]]);
  M('검 받아막기', 'defend', { a: 'sword' }, [[0, o(S.chudan)], [.4, o(S.uke, { bob: 5, lean: -2 })], [1, o(S.uke, { bob: 6 })]]);
  M('검 쳐내기', 'defend', { a: 'sword' }, [[0, o(S.chudan)], [.45, o(S.chudan, { sw: -1.6, twist: -.5 })], [.75, o(S.chudan, { sw: .3, twist: -.9, armX: .4 })], [1, o(S.chudan, { sw: 0 })]]);
  M('검 옆막기', 'defend', { a: 'sword' }, [[0, o(S.chudan)], [.45, { arm: 1.1, fore: 2.2, barm: 1.0, bfore: 2.1, sw: 0, gy: .3, twist: -.7, bob: 4 }], [1, { bob: 5 }]]);
  M('한 손 받아내기', 'defend', { a: 'free', t: ['calm', 'noble', 'saitama'] }, [[0, o(DN, { lean: 0 })], [.45, { arm: 1.5, fore: 1.9, barm: .08, bfore: .2, lean: -1 }], [1, { arm: 1.5, fore: 2.0 }]]);
  M('원 그려 흘리기', 'defend', { a: 'free', t: ['flow', 'calm'] }, [[0, { arm: 1.2, fore: 2.0, barm: .9, bfore: 1.7 }], [.33, { arm: 1.6, fore: 2.6, armX: .4, twist: -.4 }], [.66, { arm: 1.0, fore: 1.6, armX: .9, twist: -.8 }], [1, { arm: 1.2, fore: 2.0, armX: .3, twist: -.3 }]]);

  // ── 회피 ──
  M('숙여 피하기', 'evade', { a: 'any' }, [[0, { bob: 3 }], [.4, { bob: 13, lean: 9, hd: -.1 }], [1, { bob: 10, lean: 6 }]]);
  M('뒤로 젖혀 피하기', 'evade', { a: 'any', t: ['flow', 'calm', 'dance'] }, [[0, { lean: 1 }], [.4, { lean: -13, bob: 4, hd: .45, armX: .6 }], [1, { lean: -9, hd: .3 }]]);
  M('옆으로 흘려 피하기', 'evade', { a: 'any' }, [[0, { twist: -.3 }], [.45, { twist: -1.0, spread: .45, bob: 6, lean: 3, ht: .3 }], [1, { twist: -.8, spread: .35 }]]);
  M('위빙', 'evade', { a: 'free', t: ['boxer', 'flow'] }, [[0, o(HG, { bob: 4 })], [.33, o(HG, { bob: 10, twist: -.6, lean: 5 })], [.66, o(HG, { bob: 10, twist: .3, lean: 5 })], [1, o(HG, { bob: 5, twist: -.4 })]]);
  M('뒤로 물러 뜀', 'evade', { a: 'any' }, [[0, { bob: 6, lean: 2 }], [.5, { hy: 2.5, lean: -7, bob: 1, armX: .7 }], [1, { hy: 0, bob: 6, lean: -2 }]]);
  M('고개 슬립', 'evade', { a: 'any', t: ['boxer', 'calm', 'saitama'] }, [[0, {}], [.4, { ht: .55, lean: 3, twist: .35, hd: -.1 }], [1, { ht: .2, twist: 0, hd: 0 }]]);
  M('웅크려 구를 준비', 'evade', { a: 'any', t: ['ninja', 'dance'] }, [[0, { bob: 4 }], [.5, { bob: 14, lean: 12, arm: 1.3, fore: 2.8, barm: 1.3, bfore: 2.8, armX: -.2 }], [1, { bob: 12 }]]);
  M('옆 재주넘기', 'evade', { a: 'any', t: ['dance', 'ninja', 'flow'] }, [[0, { bob: 5 }], [.4, o(UP, { tl: .5, hy: 3, armX: 1.3, spread: .5 })], [.75, { tl: -.2, hy: 2 }], [1, { tl: 0, hy: 0, bob: 6 }]]);
  M('잔상 비켜서기', 'evade', { a: 'any', t: ['calm', 'noble', 'flow'] }, [[0, {}], [.5, { twist: -.9, lean: 0, ht: -.4 }], [1, { twist: -.6, ht: -.2 }]]);

  // ── 맞음 ──
  M('고개 젖혀짐', 'hurt', { a: 'any' }, [[0, {}], [.3, { hd: .75, lean: -7, armX: .7, arm: .6, fore: 1.0 }], [1, { hd: .3, lean: -4, armX: .4 }]]);
  M('배 맞고 숙임', 'hurt', { a: 'any' }, [[0, {}], [.35, { lean: 15, bob: 7, arm: .8, fore: 1.4, barm: .8, bfore: 1.4, armX: -.2, hd: -.3 }], [1, { lean: 12, bob: 6 }]]);
  M('옆으로 휘청', 'hurt', { a: 'any' }, [[0, {}], [.35, { twist: -1.0, armX: 1.1, lean: -3, spread: .45, ht: -.4 }], [1, { twist: -.6, armX: .6, ht: -.2 }]]);
  M('비틀거림', 'hurt', { a: 'any' }, [[0, { twist: -.5, lean: 3 }], [.33, { twist: .4, lean: -3, armX: .8 }], [.66, { twist: -.4, lean: 4, spread: .4 }], [1, { twist: .1, lean: 1 }]]);
  M('팔 휘저어 균형', 'hurt', { a: 'any', wrap: true }, [[0, { arm: 2.0, fore: 2.4, barm: 2.0, bfore: 2.4, lean: -6, armX: .6 }], [.33, { arm: 3.2, fore: 3.6, barm: 1.0, bfore: 1.3 }], [.66, { arm: 1.0, fore: 1.3, barm: 3.2, bfore: 3.6 }], [1, { arm: 2.0, fore: 2.4, barm: 2.0, bfore: 2.4, lean: -3 }]]);
  M('얼굴 감싸기', 'hurt', { a: 'any' }, [[0, {}], [.4, { arm: 1.6, fore: 3.1, barm: 1.5, bfore: 3.05, armX: -.4, lean: 5, bob: 5, hd: -.2 }], [1, { bob: 5 }]]);
  M('뒤로 밀려남', 'hurt', { a: 'any' }, [[0, {}], [.3, { lean: -10, arm: 1.6, fore: 1.7, barm: 1.4, bfore: 1.5, armX: .9, hd: .3 }], [1, { lean: -6, armX: .5 }]]);
  M('전기 맞은 듯 경련', 'hurt', { a: 'any', loop: .18 }, [[0, { armX: .9, arm: 1.0, fore: 1.2, lean: -2 }], [.5, { armX: .5, arm: .7, fore: 1.0, lean: -4, hd: .2 }], [1, { armX: .9, lean: -2 }]]);

  // ── 쓰러짐·일어남 ──
  M('한 무릎 꿇음', 'down', { a: 'any' }, [[0, { bob: 6 }], [.5, { bob: 11, lean: 8, leg: 1.05, spread: .3, arm: .6, fore: .9, barm: 1.2, bfore: 2.4, hd: -.25 }], [1, { bob: 10, hd: -.15 }]]);
  M('한 손 땅 짚기', 'down', { a: 'any' }, [[0, { bob: 6 }], [.5, { bob: 13, lean: 11, arm: .1, fore: .1, barm: .9, bfore: 2.2, spread: .4, hd: -.3 }], [1, { bob: 12 }]]);
  M('짚고 일어남', 'down', { a: 'any' }, [[0, { bob: 13, lean: 11, arm: .1, fore: .1 }], [.5, { bob: 8, lean: 6, arm: .6, fore: 1.2 }], [1, o(G, { bob: 3, lean: 2 })]]);
  M('주저앉아 숨', 'down', { a: 'any', loop: .8 }, [[0, { bob: 12, lean: 6, arm: .2, fore: .4, barm: .2, bfore: .4, hd: -.3 }], [.5, { bob: 11, hd: -.15 }], [1, { bob: 12, hd: -.3 }]]);

  // ── 착지 ──
  M('무릎 굽혀 착지', 'land', { a: 'any' }, [[0, { bob: 0 }], [.3, { bob: 12, lean: 7, armX: .7 }], [1, { bob: 4, lean: 3, armX: .3 }]]);
  M('한 손 짚고 착지', 'land', { a: 'any', t: ['big', 'wild', 'boxer'] }, [[0, {}], [.3, { bob: 14, lean: 10, arm: .1, fore: .1, barm: 1.7, bfore: 1.9, armX: .9, spread: .45, hd: .2 }], [1, { bob: 10 }]]);
  M('사뿐 착지', 'land', { a: 'any', t: ['calm', 'noble', 'dance'] }, [[0, {}], [.4, { bob: 4, lean: 1, armX: .4 }], [1, { bob: 2 }]]);
  M('미끄러지며 착지', 'land', { a: 'any', t: ['ninja', 'wild'] }, [[0, {}], [.3, { bob: 9, lean: -4, spread: .55, armX: 1.0, twist: -.7 }], [1, { bob: 7, spread: .4 }]]);

  // ── 공중 ──
  M('공중 웅크림', 'air', { a: 'any' }, [[0, {}], [.4, { arm: 1.4, fore: 2.8, barm: 1.4, bfore: 2.8, armX: -.2, lean: 10, tl: -.35 }], [1, { tl: -.2, lean: 6 }]]);
  M('날개 펼침', 'air', { a: 'any', t: ['dance', 'flow', 'psychic'] }, [[0, {}], [.5, { arm: 1.8, fore: 2.0, barm: 1.8, bfore: 2.0, armX: 1.4, lean: -3, hd: .2 }], [1, { armX: 1.2 }]]);
  M('공중 내려찍기 준비', 'air', { a: 'free', t: ['big', 'wild'] }, [[0, {}], [.5, o(UP, { gy: .5, lean: -4, hd: .25 })], [1, o(UP, { lean: -2 })]]);
  M('공중 다이브', 'air', { a: 'any', t: ['ninja', 'wild'] }, [[0, {}], [.5, { lean: 15, arm: 1.6, fore: 1.7, barm: 1.6, bfore: 1.7, tl: -.4 }], [1, { tl: -.3 }]]);
  M('공중 칼 치켜듦', 'air', { a: 'sword' }, [[0, o(S.chudan)], [.5, o(S.jodan, { lean: -3, sw: 1.6 })], [1, o(S.jodan, { sw: 1.4 })]]);
  M('뒤로 젖힌 공중', 'air', { a: 'any', t: ['flow', 'dance'] }, [[0, {}], [.5, { lean: -12, hd: .4, armX: 1.0, arm: 2.2, fore: 2.4, tl: .35 }], [1, { tl: .2 }]]);

  // ── 기술 준비 ──
  M('기 모으기 떨림', 'charge', { a: 'free', loop: .22 }, [[0, o(HIP, { bob: 7, spread: .45, lean: 1, armX: .55, hd: .1 })], [.5, o(HIP, { bob: 7.6, armX: .62, hd: .14 })], [1, { bob: 7, armX: .55, hd: .1 }]]);
  M('두 손 앞으로 뻗기', 'charge', { a: 'free', t: ['psychic', 'calm'] }, [[0, o(G)], [.5, { arm: 1.57, fore: 1.62, barm: 1.57, bfore: 1.62, armX: -.05, lean: 5, gy: .3 }], [1, { lean: 5 }]]);
  M('하늘로 손 들기', 'charge', { a: 'free', t: ['psychic', 'big', 'calm'] }, [[0, o(G)], [.6, o(UP, { lean: -4, hd: .45 })], [1, o(UP, { hd: .4 })]]);
  M('팔 돌리기', 'charge', { a: 'free', loop: .45, wrap: true, t: ['rubber', 'brawl', 'wild'] }, [[0, { arm: 0, fore: .3, barm: .4, bfore: 1.4, twist: -.6, lean: 1 }], [.25, { arm: 1.57, fore: 1.87 }], [.5, { arm: 3.14, fore: 3.44 }], [.75, { arm: 4.71, fore: 5.01 }], [1, { arm: 6.28, fore: 6.58 }]]);
  M('손바닥 허리춤 모으기', 'charge', { a: 'free', t: ['brawl', 'taijutsu', 'boxer'] }, [[0, o(G)], [.5, { arm: -.2, fore: 1.0, barm: -.2, bfore: 1.0, armX: -.2, gy: .5, twist: -.9, bob: 6, spread: .4 }], [1, { bob: 7 }]]);
  M('인 맺기 연속', 'charge', { a: 'free', t: ['ninja'], only: ['naruto', 'sasuke', 'kakashi', 'sakura', 'itachi', 'gaara'] }, [[0, { arm: .9, fore: 2.6, barm: 1.1, bfore: 2.75, lean: 0, bob: 1, gy: .5 }], [.25, { arm: 1.0, fore: 2.4, barm: .95, bfore: 2.9 }], [.5, { arm: .85, fore: 2.75, barm: 1.15, bfore: 2.5 }], [.75, { arm: 1.05, fore: 2.5, barm: 1.0, bfore: 2.8 }], [1, { arm: .9, fore: 2.6, barm: 1.1, bfore: 2.75 }]]);
  M('검 겨눠 기 모음', 'charge', { a: 'sword' }, [[0, o(S.chudan, { bob: 4 })], [.5, o(S.chudan, { bob: 6, sw: -1.4, lean: 3 })], [1, o(S.jodan, { bob: 4 })]]);
  M('전집중 호흡', 'charge', { a: 'sword', t: ['breath'] }, [[0, o(S.waki, { bob: 5 })], [.5, o(S.waki, { bob: 6, lean: 4, hd: -.15 })], [1, o(S.yoko, { bob: 5, sw: -1.5 })]]);
  M('손가락 겨눔', 'charge', { a: 'free', t: ['calm', 'noble'], only: ['aizen', 'kizaru', 'byakuya', 'itachi', 'law', 'tatsumaki'] }, [[0, o(DN)], [.5, { arm: 1.6, fore: 1.6, barm: .08, bfore: .2, lean: 0, ht: 0 }], [1, { arm: 1.62, fore: 1.62 }]]);
  M('칼 한 손 하늘로', 'charge', { a: 'sword', t: ['big', 'breath', 'noble'] }, [[0, o(S.chudan)], [.6, { arm: 3.0, fore: 3.1, barm: .3, bfore: .8, sw: 0, gy: 0, lean: -3, hd: .3 }], [1, { hd: .35 }]]);

  // ── 도발·승리 ──
  M('가슴 두드리기', 'taunt', { a: 'free', t: ['wild', 'big', 'brawl'] }, [[0, { arm: 1.0, fore: 2.8, barm: .5, bfore: 1.0, armX: -.4 }], [.5, { arm: .5, fore: 1.0, barm: 1.0, bfore: 2.8 }], [1, { arm: 1.0, fore: 2.8, barm: .5, bfore: 1.0 }]]);
  M('웃으며 젖히기', 'taunt', { a: 'any', t: ['rubber', 'wild'] }, [[0, {}], [.5, { lean: -7, hd: .5, armX: .9, arm: .5, fore: .9, barm: .5, bfore: .9 }], [1, { lean: -6, hd: .45 }]]);
  M('손가락 까딱', 'taunt', { a: 'free', t: ['calm', 'noble', 'flow'] }, [[0, { arm: 1.4, fore: 2.6, barm: .08, bfore: .2, lean: -1 }], [.5, { fore: 2.9 }], [1, { fore: 2.6 }]]);
  M('승리 주먹', 'taunt', { a: 'free', t: ['brawl', 'gai', 'wild'] }, [[0, o(G)], [.5, { arm: 2.9, fore: 3.05, barm: .3, bfore: .9, hd: .3, hy: 1 }], [1, { hy: 0 }]]);
  M('칼 피 털고 거두기', 'taunt', { a: 'sword', t: ['calm', 'noble', 'iai'] }, [[0, o(S.yoko)], [.35, o(S.kesa, { sw: -2.7 })], [.7, o(S.iaiR, { bob: 3 })], [1, o(S.iaiR, { bob: 2, hd: .05 })]]);
  M('어깨 으쓱', 'taunt', { a: 'free', t: ['calm', 'saitama'] }, [[0, o(DN)], [.5, o(DN, { arm: .4, fore: 1.6, barm: .4, bfore: 1.6, armX: .7, hd: .1 })], [1, o(DN)]]);
  M('목 긋는 손짓 대신 노려봄', 'taunt', { a: 'any', t: ['noble', 'calm', 'wild'] }, [[0, {}], [.5, { hd: -.15, ht: .1, lean: 3, bob: 3 }], [1, { hd: -.12 }]]);

  // ── 몸풀기(혼자 소환 때 순서대로 이어 감) — 실제 몸풀기 순서: 숨 → 체중 옮기기 → 어깨·목·손목 → 스트레칭 → 제자리 뛰기 → 섀도복싱 ──
  M('섀도복싱 콤보', 'idle', { loop: 2.4, a: 'free', t: ['boxer', 'brawl', 'tech', 'taijutsu'] }, [[0, o(HG, { twist: -.4, bob: 4 })], [.1, { arm: .85, fore: 2.95, twist: -.62, bob: 5.5, lean: 0 }], [.17, o(PF, { twist: -.08, lean: 5, bob: 4 })], [.27, o(HG, { twist: -.45 })], [.35, { barm: .45, bfore: 2.1, twist: -.8, bob: 5.5 }], [.44, o(PB, { arm: 1.1, fore: 2.9, twist: .78, lean: 7, spread: .15 })], [.54, o(HG, { twist: -.2 })], [.62, { arm: 1.25, fore: 2.65, armX: .95, twist: -.75 }], [.7, { arm: 1.45, fore: 2.75, armX: -.2, twist: .72, lean: 5 }], [.8, o(HG, { bob: 11, twist: -.5, lean: 6, armX: .18 })], [.88, o(HG, { bob: 10.5, twist: .3 })], [1, o(HG, { twist: -.4, bob: 4, lean: 2 })]]);
  M('스쿼트', 'idle', { loop: 1.8, a: 'any', t: ['gai', 'taijutsu', 'big', 'kick'] }, [[0, { bob: 1, lean: 1, arm: .3, fore: .5, barm: .3, bfore: .5, spread: .25, twist: 0 }], [.45, { bob: 13, lean: 9, arm: 1.57, fore: 1.6, barm: 1.57, bfore: 1.6, spread: .32 }], [.55, { bob: 13.5 }], [1, { bob: 1, lean: 1, arm: .3, fore: .5, barm: .3, bfore: .5 }]]);
  M('런지 스트레칭', 'idle', { loop: 2.8, a: 'any' }, [[0, { leg: .5, bob: 3, lean: 2 }], [.4, { leg: .95, bob: 10, lean: 4, spread: .18, arm: .5, fore: .75, barm: .5, bfore: .75, armX: -.1 }], [.7, { leg: .95, bob: 11, lean: 5 }], [1, { leg: .5, bob: 3, lean: 2, spread: .1 }]]);
  M('허리 돌리기', 'idle', { loop: 2.2, a: 'any' }, [[0, { arm: -.35, fore: .9, barm: -.35, bfore: .9, armX: .55, twist: -.65, lean: 2 }], [.25, { lean: -3, twist: 0 }], [.5, { twist: .65, lean: 2 }], [.75, { lean: 6, twist: 0 }], [1, { twist: -.65, lean: 2 }]]);
  M('팔 교차 스트레칭', 'idle', { loop: 2.8, a: 'free' }, [[0, o(G)], [.3, { arm: 1.45, fore: 1.5, armX: -.85, barm: 1.3, bfore: 2.6, twist: .35, ht: -.3 }], [.7, { arm: 1.5, armX: -.95 }], [1, o(G, { armX: .18, twist: -.32, ht: 0 })]]);
  M('발목 돌리기', 'idle', { loop: 1.4, a: 'any' }, [[0, { kick: .35, leg: .3, bob: 2, armX: .35 }], [.25, { kick: .5, spread: .2 }], [.5, { kick: .35, spread: .05 }], [.75, { kick: .2, spread: .15 }], [1, { kick: .35, spread: .1 }]]);
  M('하품', 'idle', { loop: 3.4, a: 'free', only: ['saitama'] }, [[0, o(DN)], [.35, { arm: 1.9, fore: 2.9, barm: .08, bfore: .2, hd: .5, lean: -3, bob: .5 }], [.6, { hd: .55 }], [1, o(DN, { hd: 0, lean: -1 })]]);
  M('전집중 호흡 몸풀기', 'idle', { loop: 3.0, a: 'sword', t: ['breath'] }, [[0, o(S.chudan, { bob: 3, hd: 0 })], [.4, o(S.chudan, { bob: 5.5, lean: 4, hd: .15, sw: -1.3 })], [.55, o(S.chudan, { bob: 6, hd: -.05 })], [1, o(S.chudan, { bob: 3, hd: 0 })]]);
  M('검 휘둘러 몸풀기', 'idle', { loop: 2.6, a: 'sword' }, [[0, o(S.chudan)], [.18, o(S.jodan, { bob: 3 })], [.36, o(S.kesa, { twist: .5, bob: 5 })], [.56, o(S.waki, { bob: 4 })], [.78, o(S.upcut, { twist: -.3, bob: 2 })], [1, o(S.chudan)]]);

  // ═══ 숫자 배열로 굽기(불러올 때 한 번) ═══
  DEF.forEach(d => {
    let prev = BASE; const T = [], FR = [];
    d.frames.forEach(([t, v]) => { const cur = o(prev, v); prev = cur; T.push(t); const a = new Float32Array(NK); KEYS.forEach((k, i) => a[i] = cur[k] === undefined ? NaN : cur[k]); FR.push(a); });
    d.T = T; d.FR = FR; d.loopN = !!(d.loop || d.ph); d.t = d.t || []; d.a = d.a || 'any';
    d.hasSw = d.frames.some(([, v]) => v.sw !== undefined);
  });
  const BYCAT = {}; DEF.forEach(d => (BYCAT[d.cat] = BYCAT[d.cat] || []).push(d));
  window.MOTIONS = DEF; window.MOTION_COUNT = DEF.length;
  window.MOTION_USED = new Map();

  // 인물 성향(원작 무술 결)
  const STY = {
    naruto: ['ninja', 'brawl'], sasuke: ['ninja', 'calm'], kakashi: ['ninja', 'calm'], sakura: ['brawl', 'ninja'], gaara: ['calm', 'psychic'], itachi: ['ninja', 'calm', 'noble'],
    gai: ['kick', 'taijutsu', 'gai'], luffy: ['rubber', 'brawl', 'wild'], zoro: ['wild', 'big'], sanji: ['kick', 'dance'], ace: ['brawl', 'wild'], kizaru: ['calm', 'kick'], law: ['calm', 'noble'],
    ichigo: ['big', 'wild'], byakuya: ['calm', 'noble'], rukia: ['dance', 'calm'], hitsugaya: ['calm'], kenpachi: ['wild', 'big'], aizen: ['calm', 'noble'],
    saitama: ['saitama', 'calm', 'boxer'], genos: ['boxer', 'tech'], tatsumaki: ['psychic', 'calm', 'noble'], bang: ['flow', 'calm'], garou: ['flow', 'wild'],
    tanjiro: ['breath'], nezuko: ['kick', 'wild'], zenitsu: ['iai'], inosuke: ['wild', 'dance'], giyu: ['calm', 'breath'], rengoku: ['breath', 'big'], shinobu: ['thrust', 'dance'],
    uzui: ['big', 'wild'], mitsuri: ['dance'], muichiro: ['calm', 'breath'], sanemi: ['wild'], obanai: ['dance', 'thrust'], himejima: ['big', 'calm'],
  };

  // ═══ 상황 → 동작 분류 ═══
  const CAT = {
    guard: 'idle', stance: 'idle', m_high: 'idle', m_low: 'idle', m_open: 'idle', stare: 'idle', k_chudan: 'idle', k_hasso: 'idle', k_waki: 'idle', k_jodan: 'idle', swordLevel: 'idle', k_dual: 'idle',
    run: 'run', crouchRun: 'run', k_run: 'run', k_lowRun: 'run',
    punch: 'strike', punchL: 'strike', palm: 'strike', elbow: 'strike', uppercut: 'strike', feint: 'strike', shoulder: 'strike', punchPrep: 'strike',
    kick: 'kick', highKick: 'kick', kickPrep: 'kick', axe: 'kick', sweep: 'kick', jumpKnee: 'kick',
    slash: 'cut', slashPrep: 'cut', k_kesa: 'cut', k_yoko: 'cut', k_upCut: 'cut', k_tsuki: 'cut', k_iaiCut: 'cut', iaiEnd: 'cut', spreadSlash: 'cut', twoHandSword: 'cut', swordDown: 'cut', k_dualOpen: 'cut',
    block: 'defend', k_uke: 'defend',
    duck: 'evade', crouchDodge: 'evade', sidestep: 'evade', backstep: 'evade',
    hurt: 'hurt', kneel: 'down', land: 'land', landRec: 'land',
    taunt: 'taunt', point: 'taunt',
    air: 'air', flipAir: 'air',
    cast: 'charge', seal: 'charge', iai: 'charge',
  };
  let now = 0;
  const swordOf = f => !!(f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  const dualOf = f => !!(f.model && f.model.swd && f.model.swd.grp2 && f.model.swd.grp2.visible);
  function pickMotion(f, cat) {
    const list = BYCAT[cat]; if (!list) return null;
    const sw = swordOf(f), du = sw && dualOf(f), my = STY[f.ch.key] || [], hist = f.moHist || (f.moHist = []);
    let tot = 0; const W = pickMotion.W || (pickMotion.W = new Float32Array(64));
    for (let i = 0; i < list.length; i++) {
      const d = list[i]; let w = 1;
      if (d.only && !d.only.includes(f.ch.key)) w = 0;
      else if (d.a === 'sword' && !sw) w = 0; else if (d.a === 'free' && sw) w = 0; else if (d.dual && !du) w = 0;
      if (w) { let m = 0; for (const t of d.t) if (my.includes(t)) m++; w *= (1 + m * 2.2) * (d.only ? 2.5 : 1); if (hist.includes(d.n)) w *= hist[hist.length - 1] === d.n ? .05 : .3; }
      W[i] = w; tot += w;
    }
    if (tot <= 0) return null;
    let r = Math.random() * tot;
    for (let i = 0; i < list.length; i++) { r -= W[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  // 혼자 소환(몸풀기) 때는 실제 몸풀기 순서대로, 인물 성격별 동작을 끼워 이어 간다
  const BYNAME = {}; DEF.forEach(d => BYNAME[d.n] = d);
  const ROUTINE = ['숨 고르기', '체중 옮기기', '어깨 돌리기', '목 풀기', '손목 털기', '팔 교차 스트레칭', '허리 돌리기', '런지 스트레칭', '발목 돌리기', '기지개', '제자리 뛰기', '섀도복싱 콤보', '좌우 살피기'];
  const SWORD_ROUTINE = ['숨 고르기', '체중 옮기기', '목 풀기', '허리 돌리기', '런지 스트레칭', '발목 돌리기', '칼 고쳐 쥐기', '검 휘둘러 몸풀기', '칼끝 흔들기', '좌우 살피기'];
  const PERSONAL = { gai: ['스쿼트', '엄지척 나이스 가이', '학 자세', '무에타이 가드'], saitama: ['하품', '주머니 손 무심'], tanjiro: ['전집중 호흡 몸풀기', '팔상 자세 숨'], giyu: ['전집중 호흡 몸풀기', '발도 대기'], rengoku: ['전집중 호흡 몸풀기', '상단 겨눔'], zenitsu: ['발도 대기'], luffy: ['팔 돌리기', '웃으며 젖히기'], sanji: ['발목 돌리기', '주머니 손 무심'], naruto: ['인 맺기 연속', '이리 와 손짓'], kenpachi: ['칼 어깨에 메기'], genos: ['복서 스텝'], garou: ['유수 흐름 손'], bang: ['원 그려 흘리기'], aizen: ['팔짱'], byakuya: ['팔짱'], tatsumaki: ['공중 부유', '팔짱'], itachi: ['인 맺기 연속', '팔짱'], nezuko: ['제자리 뛰기'], inosuke: ['협단 낮춤', '제자리 뛰기'] };
  const usable = (f, d) => !!d && !(d.only && !d.only.includes(f.ch.key)) && !(d.a === 'sword' && !swordOf(f)) && !(d.a === 'free' && swordOf(f)) && !(d.dual && !dualOf(f));
  function routineNext(f) {
    if (!f.rt || f.rt.key !== f.ch.key) { const base = (swordOf(f) ? SWORD_ROUTINE : ROUTINE).slice(), per = PERSONAL[f.ch.key] || []; per.forEach((n, i) => base.splice(3 + i * 3, 0, n)); f.rt = { key: f.ch.key, list: base.filter(n => usable(f, BYNAME[n])), i: 0 }; }
    const L = f.rt.list; if (!L.length) return null; const d = BYNAME[L[f.rt.i % L.length]]; f.rt.i++; return d;
  }
  function choose(f, s, d) {
    if (!f.ch || f.ch.key === undefined) return;
    if (s.hand || s.giantArm || (s.stretch || 0) > 0 || s.spin || s.tilt || s.lock || f.hand || (f.giantArm || 0) > .05) { f.mo = null; return; } // 기술 고유 자세는 그대로
    let pose = s.pose; if (f.stun > 0 && !s.vy) pose = f.stun > .8 ? 'kneel' : 'hurt';
    let cat = CAT[pose]; if (!cat) { f.mo = null; return; }
    const tg = f.faceT || f.target, dist = tg && tg.pos ? Math.hypot(tg.pos.x - f.pos.x, tg.pos.z - f.pos.z) : 99;
    if (cat === 'run') { const fw = s.fwd || 0, sd = Math.abs(s.side || 0); if (!s.to && sd > Math.abs(fw) + 20) cat = 'strafe'; else if (!s.to && fw < -40) cat = 'retreat'; }
    if (cat === 'idle') {
      if (Math.abs(s.side || 0) > 50) cat = 'strafe';
      else if (f.gauge !== undefined && f.gauge < 40 && Math.random() < .55) cat = 'tired';
      else if (now - (f._hurtAt || -9) < 2.2 && Math.random() < .55) cat = 'hurtIdle';
      else if (dist > 85 && Math.random() < .3) cat = 'taunt';
    }
    if (cat === 'strike' && swordOf(f) && Math.random() < .75) cat = 'cut';
    if (cat === 'cut' && !swordOf(f)) cat = Math.random() < .5 ? 'strike' : 'kick';
    if (cat === 'kick' && swordOf(f) && Math.random() < .5) cat = 'cut';
    if (cat === 'hurt' || cat === 'down') f._hurtAt = now;
    // 같은 반복 동작이 이어지면 바로 바꾸지 않고 이어 감(잦은 바뀜 방지)
    const alone = F.length === 1, solo = alone && cat === 'idle';
    if (alone && f.mo && f.mo.rt && (cat === 'strike' || cat === 'kick' || cat === 'cut') && f.mo.t < (f.mo.d.loop || 1) && Math.random() < .6) { f.tgt = f._mt; return; } // 혼자 몸풀기 중에는 하던 몸풀기를 이어 감
    if (f.mo && (f.mo.d.cat === cat || (solo && f.mo.rt)) && f.mo.d.loopN && f.mo.t < (f.mo.d.loop || 1) * (solo ? 2 : 1.5)) { f.tgt = f._mt; return; }
    if (f.mo && f.mo.d.wrap && f.c) ['arm', 'fore', 'barm', 'bfore'].forEach(k => { const v = f.c[k] || 0; f.c[k] = Math.atan2(Math.sin(v), Math.cos(v)); }); // 한 바퀴 돌던 팔 각도 정리
    const rtd = solo ? routineNext(f) : null, dm = rtd || pickMotion(f, cat); if (!dm) { f.mo = null; return; }
    if (!f._mt) f._mt = {};
    f.mo = { d: dm, t: 0, dur: Math.max(.08, d || .3), sp: R(.85, 1.15), rt: !!rtd };
    f.moHist.push(dm.n); if (f.moHist.length > 5) f.moHist.shift();
    const U = window.MOTION_USED; U.set(dm.n, (U.get(dm.n) || 0) + 1);
    evalMotion(f, 0);
  }
  // 관절별 시차(가까운 관절이 먼저, 먼 관절·머리는 늦게 따라옴 = 겹침 동작) + 가속·감속 곡선
  const KOFF = new Float32Array(NK); [['twist', .07], ['bob', .05], ['spread', .04], ['leg', .05], ['kick', .02], ['lean', .03], ['arm', 0], ['barm', 0], ['fore', -.05], ['bfore', -.05], ['armX', -.03], ['hd', -.09], ['ht', -.09], ['sw', -.06], ['sw2', -.06], ['gy', -.03]].forEach(([k, v]) => KOFF[IX[k]] = v);
  const ease = u => u * u * u * (u * (u * 6 - 15) + 10); // 부드러운 출발·도착
  function sampleKey(d, u, i) {
    const T = d.T, FR = d.FR, n = T.length; let a, b, t0, t1;
    if (n === 1) return FR[0][i];
    if (u >= T[n - 1]) { a = FR[n - 1]; t0 = T[n - 1]; if (d.loopN) { b = FR[0]; t1 = 1; } else return a[i]; }
    else if (u < T[0]) return FR[0][i];
    else { let j = 0; while (j < n - 2 && u >= T[j + 1]) j++; a = FR[j]; b = FR[j + 1]; t0 = T[j]; t1 = T[j + 1]; }
    const va = a[i], vb = b[i]; if (va !== va) return vb; if (vb !== vb) return va;
    return va + (vb - va) * ease(Math.max(0, Math.min(1, (u - t0) / Math.max(1e-4, t1 - t0))));
  }
  const ANT = { strike: 1, kick: 1, cut: 1, charge: 1 };
  function evalMotion(f, dt) {
    const mo = f.mo, d = mo.d, mt = f._mt;
    mo.t += dt;
    let u;
    if (d.ph === 'run') u = (((f.run || 0) / (PI * 2)) % 1 + 1) % 1;
    else if (d.loop) u = (mo.t / (d.loop * mo.sp)) % 1;
    else u = Math.min(1, mo.t / mo.dur);
    for (let i = 0; i < NK; i++) {
      let uk = u + KOFF[i]; uk = d.loopN ? ((uk % 1) + 1) % 1 : Math.max(0, Math.min(1, uk));
      const v = sampleKey(d, uk, i); mt[KEYS[i]] = v !== v ? undefined : v;
    }
    // 전조(때리기 전 뒤로 당김·무게 뒷발·자세 낮춤, 발차기 전 축발 디딤·팔로 균형, 기술 전 숨 들이쉼) + 팔로스루(지나쳐 갔다 돌아옴)
    if (!d.loopN && ANT[d.cat]) {
      const env = u < .26 ? Math.sin(PI * u / .26) : 0, ft = u > .6 ? Math.sin(PI * Math.min(1, (u - .6) / .4)) : 0;
      mt.twist = (mt.twist || 0) - .32 * env + .14 * ft; mt.lean = (mt.lean || 0) - 2.4 * env + 1.3 * ft; mt.bob = (mt.bob || 0) + 2.2 * env;
      if (d.cat === 'strike' || d.cat === 'cut') { mt.arm -= .22 * env; mt.barm -= .12 * env; }
      else if (d.cat === 'kick') { mt.armX = (mt.armX || 0) + .4 * env + .25 * ft; mt.bob += 1.2 * env; }
      else { mt.hd = (mt.hd || 0) + .14 * env; mt.bob += 1.6 * env; }
    }
    if (d.wrap) { const c = f.c; ['arm', 'fore', 'barm', 'bfore'].forEach(k => { const cur = c[k] ?? 0, tv = mt[k]; mt[k] = cur + Math.atan2(Math.sin(tv - cur), Math.cos(tv - cur)); }); }
    if (!d.hasSw && swordOf(f)) { mt.sw = undefined; mt.sw2 = undefined; }
    f.tgt = mt;
  }

  // ═══ 감싸기 ═══
  let lastDt = .016;
  const _apply = apply;
  apply = function (f, s, d) {
    const grounded = !f.air && !f.arc;
    _apply(f, s, d);
    // 점프 전 무릎 굽힘(전조): 땅에서 뛰어오를 때 아주 잠깐 웅크렸다가 뜀
    if (s.vy > 0 && grounded && f.air && !f._jump) { f._jump = { vy: f.vel.y, t: .1, T: .1 }; f.vel.y = 0; f.air = false; }
    try { choose(f, s, d); } catch (e) { f.mo = null; console.error(e); }
  };
  const _update = update;
  update = function (dt, t) {
    now += dt; lastDt = dt;
    for (let i = 0; i < F.length; i++) { const f = F[i], j = f._jump; if (j) { j.t -= dt; if (j.t <= 0) { f._jump = null; f.vel.y = j.vy; f.air = true; } } }
    for (let i = 0; i < F.length; i++) { const f = F[i]; if (f.mo) { if (f.hand || (f.giantArm || 0) > .05) { f.mo = null; continue; } evalMotion(f, dt); } }
    return _update(dt, t);
  };
  const _setChar = setChar;
  setChar = function (f, ch) { f.mo = null; f.moHist = []; f.ik = null; f.rt = null; f._jump = null; f.hdc = f.htc = f.tlc = f.hyc = 0; return _setChar(f, ch); };
  // ═══ 사람 몸 원리: 발 디딤(발 IK)·골반 높이 보정·무게 이동·척추 마디 시차·방향 전환 기울임·관절 가동 범위 ═══
  const L1 = 8, L2 = 7.1, LMAX = L1 + L2 - .08, HIPH = 15; // 넓적다리·정강이(발바닥까지) 길이, 골반 높이(모형 단위)
  const clampv2 = (v, a, b) => v < a ? a : v > b ? b : v;
  function legIK(m, g, dt) {
    const ik = g.ik || (g.ik = { P: [new THREE.Vector3(), new THREE.Vector3()], sw: [{ on: false, t: 0, T: .3, fx: 0, fz: 0, tx: 0, tz: 0 }, { on: false, t: 0, T: .3, fx: 0, fz: 0, tx: 0, tz: 0 }], w: 0, init: false, drop: 0, roll: 0, lastH: g.heading, shift: 0, steps: 0 });
    const s0 = MS * (g.scale || 1), sx = s0 * (g.bulk || 1), H = g.heading + (g.spinA || 0), fx = Math.cos(H), fz = Math.sin(H), rx = -fz, rz = fx;
    const vx = g.vel.x + (g.kb ? g.kb.x : 0), vz = g.vel.z + (g.kb ? g.kb.z : 0), hs = Math.hypot(vx, vz), tg = g.tgt || {};
    // 방향 전환 기울임(몸 전체가 도는 쪽 안으로)
    let dh = g.heading - ik.lastH; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); ik.lastH = g.heading;
    const om = dt > 0 ? dh / dt : 0; ik.roll += (clampv2(om * Math.min(hs, 200) * .0011, -.24, .24) * (g.air ? 0 : 1) - ik.roll) * Math.min(1, dt * 6);
    m.body.rotation.x += ik.roll;
    const kickNow = (g.c.kick || 0) > .3 || (tg.kick || 0) > .3;
    const ok = !g.air && !g.arc && !g._jump && Math.abs(g.tilt || 0) < .15 && Math.abs(g.fallA || 0) < .15 && !g.spinV && !g.roll && (g.hyc || 0) < .3 && Math.abs(g.tlc || 0) < .15;
    ik.w += ((ok ? 1 : 0) - ik.w) * Math.min(1, dt * 10);
    if (!ok && ik.w < .03) { ik.init = false; ik.drop = 0; return; }
    const spread = tg.spread !== undefined ? tg.spread : (g.c.spread || .1), stance = Math.sin(Math.min(1, tg.leg !== undefined ? tg.leg : .42)) * HIPH * .55;
    const lat = (1.7 + HIPH * Math.sin(spread) * .6) * sx, nF = stance * sx, nB = -stance * .8 * sx;
    const px = g.pos.x, pz = g.pos.z;
    const NX0 = px + fx * nF + rx * lat, NZ0 = pz + fz * nF + rz * lat, NX1 = px + fx * nB - rx * lat, NZ1 = pz + fz * nB - rz * lat;
    if (!ik.init) { ik.P[0].set(NX0, 0, NZ0); ik.P[1].set(NX1, 0, NZ1); ik.sw[0].on = ik.sw[1].on = false; ik.init = true; }
    // 걸음: 디딘 발은 땅에 고정, 몸이 멀어지면 한 발씩 다음 자리로 내디딤(속도에 따라 보폭·빠르기)
    const T = clampv2(.34 - hs * .0011, .13, .34), lead = hs > 6 ? T * 1.25 : 0;
    const NX = [NX0, NX1], NZ = [NZ0, NZ1];
    const thr = hs > 8 ? clampv2(2.2 + hs * .032, 2.6, 8.5) : 2.4;
    if (!ik.sw[0].on && !ik.sw[1].on) {
      let best = -1, be = thr;
      for (let i = 0; i < 2; i++) { if (i === 0 && kickNow) continue; const ex = ik.P[i].x - (NX[i] + vx * lead * .5), ez = ik.P[i].z - (NZ[i] + vz * lead * .5), e = Math.hypot(ex, ez); if (e > be) { be = e; best = i; } }
      if (best >= 0) { const s = ik.sw[best]; s.on = true; s.t = 0; s.T = T; s.fx = ik.P[best].x; s.fz = ik.P[best].z; s.tx = NX[best] + vx * lead; s.tz = NZ[best] + vz * lead; ik.steps++; }
    }
    const lift = [0, 0], swingU = [-1, -1];
    for (let i = 0; i < 2; i++) {
      const s = ik.sw[i];
      if (i === 0 && kickNow) { s.on = false; ik.P[0].set(NX0, 0, NZ0); continue; } // 차는 다리는 동작대로, 내리면 제자리에 디딤
      if (!s.on) continue;
      s.t += dt / s.T; s.tx += vx * dt * .3; s.tz += vz * dt * .3; const u = Math.min(1, s.t), e = u * u * (3 - 2 * u);
      ik.P[i].x = s.fx + (s.tx - s.fx) * e; ik.P[i].z = s.fz + (s.tz - s.fz) * e; lift[i] = Math.sin(PI * u) * Math.min(5, 1.6 + hs * .022); swingU[i] = u;
      if (u >= 1) s.on = false;
    }
    // 디딘 발이 다리 길이보다 멀어지면(넉백·미끄러짐) 끌려옴
    const d = [0, 0];
    for (let i = 0; i < 2; i++) {
      const dx = ik.P[i].x - px, dz = ik.P[i].z - pz; let fwd = (dx * fx + dz * fz) / sx;
      const reach = 11.5; if (fwd > reach || fwd < -reach) { const k = (Math.abs(fwd) - reach) * sx, sg = Math.sign(fwd); ik.P[i].x -= fx * sg * k; ik.P[i].z -= fz * sg * k; fwd = sg * reach; }
      d[i] = fwd;
    }
    // 골반 높이: 두 발에 닿도록 무릎을 굽혀 낮춤(걸음마다 자연히 오르내림) + 디딘 발 쪽으로 무게 이동
    const hipBase = HIPH + m.body.position.y; let need = 0;
    for (let i = 0; i < 2; i++) { if (i === 0 && kickNow) continue; const hmax = Math.sqrt(Math.max(0, LMAX * LMAX - d[i] * d[i])) + lift[i]; need = Math.max(need, hipBase - hmax); }
    ik.drop += (clampv2(need, 0, 7) - ik.drop) * Math.min(1, dt * 18);
    m.body.position.y -= ik.drop * ik.w;
    const shiftT = swingU[1] >= 0 ? Math.sin(PI * swingU[1]) * .55 : swingU[0] >= 0 ? -Math.sin(PI * swingU[0]) * .55 : 0;
    ik.shift += (shiftT - ik.shift) * Math.min(1, dt * 10); m.body.position.z += ik.shift * ik.w;
    const hip = hipBase - ik.drop;
    const legs = [m.legF, m.legB];
    for (let i = 0; i < 2; i++) {
      if (i === 0 && kickNow) continue;
      const cx = Math.max(.5, Math.cos(legs[i].rotation.x)), h = Math.max(1, (hip - lift[i]) / cx), D = Math.min(LMAX, Math.hypot(d[i], h));
      const A = Math.acos(clampv2((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), K = PI - Math.acos(clampv2((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
      const thigh = Math.atan2(d[i], h) + A, w = ik.w, lg = legs[i];
      lg.rotation.z += (thigh - lg.rotation.z) * w; const kn = lg.userData.knee; kn.rotation.z += (-K - kn.rotation.z) * w;
    }
    // 팔 흔들기 박자를 실제 걸음에 맞춤(팔은 반대 다리와 엇갈림)
    if (hs > 8 && ik.w > .5) { if (swingU[0] >= 0) g.run = -PI / 2 + PI * swingU[0]; else if (swingU[1] >= 0) g.run = PI / 2 + PI * swingU[1]; }
  }
  // 척추 마디 시차: 골반이 먼저 돌고 가슴·어깨는 늦게, 고개는 시선 유지
  function spine(m, g, dt) {
    const tw = m.body.rotation.y; g.chTw = g.chTw === undefined ? tw : g.chTw + (tw - g.chTw) * Math.min(1, dt * 9);
    const rel = clampv2(g.chTw - tw, -.6, .6); m.torso.rotation.y = rel; m.head.rotation.y -= rel * .8;
  }
  // 관절 가동 범위(팔꿈치·무릎은 한 방향, 어깨·고관절·목 범위)
  function limits(m, g) {
    const wrap = g.mo && g.mo.d.wrap;
    [m.aF, m.aB].forEach(a => { if (!a || !a.fore) return; a.fore.rotation.z = clampv2(a.fore.rotation.z, 0, 2.7); if (!wrap && !(g.stretch > 0) && !(g.giantArm > 0)) a.up.rotation.z = clampv2(a.up.rotation.z, -1.7, 3.35); });
    [m.legF, m.legB].forEach(l => { l.rotation.z = clampv2(l.rotation.z, -1.1, 2.9); const k = l.userData.knee; if (k) k.rotation.z = clampv2(k.rotation.z, -2.5, 0); });
    m.head.rotation.y = clampv2(m.head.rotation.y, -1.2, 1.2); m.head.rotation.z = clampv2(m.head.rotation.z, -.65, .8);
  }
  // 고개·몸 기울임·살짝 뜸은 그리기 때 부드럽게 더함
  const _poseModel = poseModel;
  poseModel = function (m, g, t) {
    _poseModel(m, g, t);
    if (!g.ch || !g.tgt) return;
    const tg = g.mo ? g.tgt : null, k = .18;
    g.hdc = (g.hdc || 0) + (((tg && tg.hd) || 0) - (g.hdc || 0)) * k; g.htc = (g.htc || 0) + (((tg && tg.ht) || 0) - (g.htc || 0)) * k;
    g.tlc = (g.tlc || 0) + (((tg && tg.tl) || 0) - (g.tlc || 0)) * k; g.hyc = (g.hyc || 0) + (((tg && tg.hy) || 0) - (g.hyc || 0)) * .25;
    if (Math.abs(g.hdc) > 1e-3) m.head.rotation.z = g.hdc;
    if (Math.abs(g.htc) > 1e-3) m.head.rotation.y += g.htc;
    if (Math.abs(g.tlc) > 1e-3) m.root.rotation.z += g.tlc;
    if (g.hyc > 1e-3 && !g.air) m.root.position.y += g.hyc * (g.scale || 1);
    if (g._jump) m.body.position.y -= Math.sin(PI * Math.min(1, 1 - g._jump.t / g._jump.T)) * 5; // 점프 전 무릎 굽힘
    if (!g.vel || !m.body || !m.legF) return;
    const dt = Math.min(.05, lastDt);
    try { spine(m, g, dt); legIK(m, g, dt); limits(m, g); } catch (e) { g.ik = null; console.error(e); }
  };
  console.log('[motions2] 동작 ' + DEF.length + '개, 분류 ' + Object.keys(BYCAT).length + '개');
})();
