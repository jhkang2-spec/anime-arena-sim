// 원작 외형 B: 원피스·원펀맨·블리치 — 실루엣·체형·옷·대표 소품으로 머리색 없이도 알아보게.
// 단위: 모형 키 약 34, 앞 +x, 위 +y, 오른쪽 +z. 몸통(torso) 원점 = 골반(가슴 앞면 x≈2.5, 등 x≈-2.5, 목 y≈12.7), 머리(head) 중심 (0,2.2,0) 반지름 2.
(function () {
  if (typeof LOOK === 'undefined' || typeof CH === 'undefined') return;
  // 팔 뼈대는 {up, fore} 묶음이라 그룹을 꺼내 쓰고, 망토 조각처럼 직접 넘긴 물체도 받는다
  const _bone = LOOK.bone;
  LOOK.bone = (m, name) => {
    if (name && name.isObject3D) return name;
    if (name === 'aF' || name === 'aB') return m[name] && (m[name].up || m[name]);
    if (name === 'foreF' || name === 'foreB') { const a = m[name === 'foreF' ? 'aF' : 'aB']; return a && (a.fore || _bone(m, name)); }
    return _bone(m, name);
  };
  const { box, cyl, sph, cone, tor, plane } = LOOK.G, PI = Math.PI;
  const A = (m, b, g, c, p, r, s, o) => LOOK.add(m, b, g, c, p, r, s, o);
  const kanji = (name, txt, bg, fg, vertical) => LOOK.pattern('kj2-' + name, (x, s) => {
    x.fillStyle = bg; x.fillRect(0, 0, s, s); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (vertical) { const n = txt.length; x.font = `900 ${Math.floor(s / (n + .4))}px serif`; [...txt].forEach((ch, i) => x.fillText(ch, s / 2, s * (i + .5) / n)); }
    else { x.font = `900 ${Math.floor(s * .78 / Math.max(1, txt.length * .62))}px serif`; x.strokeStyle = fg; x.lineWidth = s * .045; x.lineJoin = 'round'; x.strokeText(txt, s / 2, s / 2 + s * .04); x.fillText(txt, s / 2, s / 2 + s * .04); }
  }, 256);
  // 망토 등판 글자(망토 조각의 바깥 -x 면, 양쪽 모두)
  const coatMark = (m, idx, tex, w = 4.6, h = 3.8) => { const seg = m.coat && m.coat[idx]; if (!seg) return; A(m, seg, plane(w, h), '#ffffff', [-.3, -.9, 0], [0, -PI / 2, 0], [1, 1, 1], { map: tex, outline: false }); A(m, seg, plane(w, h), '#ffffff', [.3, -.9, 0], [0, PI / 2, 0], [1, 1, 1], { map: tex, outline: false }); };
  const eyeRotY = s => -s * .7; // 눈 자리 얼굴면 방향
  const M = k => CH[k] && CH[k].model;
  const ring = (m, b, r, t, y, c, x = 0, z = 0) => A(m, b, tor(r, t, 5, 14), c, [x, y, z], [PI / 2, 0, 0]);

  // ── 원피스 ──
  let m;
  if ((m = M('luffy'))) { // 앞섶 열린 빨간 조끼(노란 단추)·가슴 X 흉터·파란 반바지 흰 털 단·샌들
    A(m, 'torso', box(.1, 8, 2.6), '#f0c8a0', [2.52, 8.2, 0], [0, 0, 0], [1, 1, 1], { outline: false });
    A(m, 'torso', box(.06, 4.2, .28), '#c87a6a', [2.6, 8.6, 0], [.75, 0, 0], [1, 1, 1], { outline: false });
    A(m, 'torso', box(.06, 4.2, .28), '#c87a6a', [2.6, 8.6, 0], [-.75, 0, 0], [1, 1, 1], { outline: false });
    for (let i = 0; i < 4; i++) A(m, 'torso', sph(.2, 6, 5), '#f0c040', [2.55, 5.5 + i * 1.6, 1.45], [0, 0, 0], [1, 1, 1], { outline: false });
    ['legF', 'legB'].forEach(l => ring(m, l, 1.35, .42, -7.4, '#d8e6f4'));
    LOOK.body('luffy', .95, .95);
  }
  if ((m = M('zoro'))) { // 왼팔 검은 두건·허리 왼쪽 세 자루(와도 흰색·키테츠 붉은색·슈스이 검은색)·근육질
    ring(m, 'aB', 1.15, .32, -1.6, '#16161c');
    A(m, 'aB', box(.5, 1.2, .3), '#16161c', [0, -1.7, -1.3], [0, 0, .3]);
    [['#eceff2', -3.2], ['#a01a1a', -3.75], ['#141418', -4.3]].forEach(([c, z], i) => {
      const rz = -1.15 + i * .06, ax = [Math.sin(-rz), Math.cos(-rz)];
      A(m, 'body', cyl(.3, .26, 11, 7), c, [.4, 13.4 - i * .2, z], [0, 0, rz]);
      A(m, 'body', cyl(.3, .3, 2.6, 7), '#2a2a34', [.4 + ax[0] * 6.6, 13.4 - i * .2 + ax[1] * 6.6, z], [0, 0, rz]);
      A(m, 'body', cyl(.7, .7, .18, 10), '#c8a040', [.4 + ax[0] * 5.3, 13.4 - i * .2 + ax[1] * 5.3, z], [0, 0, rz]);
    });
    LOOK.body('zoro', 1.05, 1.12);
  }
  if ((m = M('sanji'))) { // 검은 정장 깃·꼬인 눈썹·한쪽 눈을 덮는 앞머리·마르고 큰 키
    [-1, 1].forEach(s => A(m, 'torso', box(.12, 4.2, .8), '#0e0e14', [2.58, 10, s * 1.05], [s * .35, 0, 0]));
    A(m, 'head', tor(.24, .07, 4, 10), '#f8d860', [1.66, 3.15, 1.15], [0, eyeRotY(1), 0], [1, 1, 1], { outline: false });
    A(m, 'head', box(.45, 1.9, 1.5), '#f8d860', [1.85, 2.55, -1.15], [0, eyeRotY(-1), .1]);
    LOOK.body('sanji', 1.08, .88);
  }
  if ((m = M('ace'))) { // 주황 카우보이모자(웃는·찡그린 단추)·붉은 구슬 목걸이·A 버클·검은 반바지와 장화·ASCE 문신·흰수염 문양·주근깨
    A(m, 'head', cyl(3.5, 3.5, .18, 16), '#e8742a', [-.15, 4.05, 0], [0, 0, .1]);
    A(m, 'head', cyl(1.95, 2.15, 1.8, 12), '#e8742a', [-.1, 4.95, 0], [0, 0, .1]);
    A(m, 'head', cyl(2.17, 2.17, .4, 12, true), '#2a2a2a', [-.12, 4.35, 0], [0, 0, .1]);
    A(m, 'head', sph(.34, 8, 6), '#3a7ad8', [1.95, 4.75, .55], [0, 0, 0], [.5, 1, 1]); A(m, 'head', sph(.34, 8, 6), '#d83a3a', [1.95, 4.75, -.55], [0, 0, 0], [.5, 1, 1]);
    A(m, 'torso', tor(1.7, .3, 5, 16), '#b8201a', [.55, 12.1, 0], [PI / 2, .35, 0], [1, 1, 1.2]);
    A(m, 'torso', box(.25, 1.3, 1.1), '#d8b048', [2.62, 2.6, 0]);
    A(m, 'torso', plane(.9, 1), '#d8b048', [2.76, 2.6, 0], [0, PI / 2, 0], [1, 1, 1], { map: kanji('aceA', 'A', '#d8b048', '#5a3a10'), outline: false });
    ['shinF', 'shinB'].forEach(l => A(m, l, cyl(1.02, .95, 5.2, 9), '#1a1a1e', [0, -3.4, 0]));
    A(m, 'aB', plane(.95, 4.2), '#e8b88a', [0, -3.4, -1.02], [0, PI, 0], [1, 1, 1], { map: kanji('asce', 'ASCE', '#e8b88a', '#1a2a5a', true), outline: false });
    A(m, 'torso', plane(5, 5), '#e8b88a', [-2.55, 8.2, 0], [0, -PI / 2, 0], [1, 1, 1], { outline: false, map: LOOK.pattern('wb-mark', (x, s) => {
      x.fillStyle = '#e8b88a'; x.fillRect(0, 0, s, s); x.strokeStyle = '#5a2a8a'; x.lineWidth = s * .09; x.lineCap = 'round';
      x.beginPath(); x.moveTo(s * .15, s * .2); x.lineTo(s * .85, s * .8); x.moveTo(s * .85, s * .2); x.lineTo(s * .15, s * .8); x.stroke();
      x.fillStyle = '#5a2a8a'; x.beginPath(); x.arc(s / 2, s / 2, s * .2, 0, 7); x.fill(); x.fillStyle = '#e8b88a'; x.beginPath(); x.ellipse(s / 2, s * .56, s * .14, s * .05, 0, 0, PI); x.fill();
    }, 128) });
    [-1, 1].forEach(s => [0, 1, 2].forEach(i => A(m, 'head', box(.05, .1, .1), '#8a4a2a', [1.72, 1.75 + (i % 2) * .15, s * (.85 + i * .22)], [0, 0, 0], [1, 1, 1], { outline: false })));
    LOOK.body('ace', 1.02, 1.05);
  }
  if ((m = M('kizaru'))) { // 노란 줄무늬 정장·주황 선글라스·해군 정의 망토·큰 키
    for (let i = -2; i <= 2; i++) A(m, 'torso', box(.06, 10, .12), '#b89a28', [2.52, 6.5, i * .78], [0, 0, 0], [1, 1, 1], { outline: false });
    ['legF', 'legB'].forEach(l => [-.5, .5].forEach(z => A(m, l, box(.08, 8, .12), '#b89a28', [1.25, -4, z], [0, 0, 0], [1, 1, 1], { outline: false })));
    [-1, 1].forEach(s => A(m, 'head', sph(.62, 8, 6), '#e8781a', [1.68, 2.45, s * 1.18], [0, eyeRotY(s), 0], [.3, .75, 1]));
    A(m, 'head', box(.12, .14, .9), '#3a2a1a', [1.98, 2.55, 0], [0, 0, 0], [1, 1, 1], { outline: false });
    coatMark(m, 1, kanji('seigi', '正義', '#f4f4f8', '#141418'), 6, 3.4);
    LOOK.body('kizaru', 1.15, .95);
  }
  if ((m = M('law'))) { // 흰 점박이 털모자·검은 긴 외투·손등 문신·턱수염·금 귀걸이
    const spots = LOOK.pattern('law-spots', (x, s) => { x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, s, s); x.fillStyle = '#5a4430'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse((i * 37) % s, (i * 53 + 20) % s, s * .06, s * .04, i, 0, 7); x.fill(); } }, 128);
    A(m, 'head', sph(2.32, 12, 8), '#ffffff', [-.12, 3.25, 0], [0, 0, 0], [1.08, .82, 1.06], { map: spots });
    A(m, 'head', tor(2.18, .45, 5, 16), '#ffffff', [-.08, 2.85, 0], [PI / 2, 0, 0], [1.04, 1.02, 1], { map: spots });
    ['foreF', 'foreB'].forEach(l => A(m, l, box(.9, .5, .7), '#1a2a4a', [.62, -6.8, 0], [0, 0, 0], [1, 1, 1], { outline: false }));
    A(m, 'head', box(.35, .6, .5), '#141418', [1.85, .25, 0]);
    [-1, 1].forEach(s => A(m, 'head', tor(.22, .06, 4, 10), '#e0b040', [-.05, 1.55, s * 1.95], [0, 0, 0], [1, 1, 1], { outline: false }));
    LOOK.body('law', 1.08, .95);
  }

  // ── 원펀맨 ──
  if ((m = M('saitama'))) { // 반짝이는 대머리·노란 슈트 지퍼·빨간 장갑과 장화·흰 망토
    A(m, 'head', sph(.55, 8, 6), '#ffffff', [.9, 4.1, .4], [0, 0, 0], [1, .45, 1], { outline: false });
    A(m, 'torso', box(.08, 9.5, .22), '#d8d8d8', [2.56, 6.6, 0], [0, 0, 0], [1, 1, 1], { outline: false });
    A(m, 'torso', box(.12, .6, .35), '#c0c0c0', [2.62, 11.2, .15], [0, 0, 0], [1, 1, 1], { outline: false });
    ['shinF', 'shinB'].forEach(l => A(m, l, cyl(1.02, .95, 5, 9), '#c81e2a', [0, -3.6, 0]));
    ['foreF', 'foreB'].forEach(l => A(m, l, cyl(.82, .76, 2.4, 9), '#c81e2a', [0, -5.2, 0]));
    LOOK.body('saitama', 1, 1);
  }
  if ((m = M('genos'))) { // 검은 금속 기계 팔(주황 핵)·어깨 장갑·가슴 판
    ['aF', 'aB'].forEach(l => { A(m, l, sph(1.55, 8, 6), '#22242a', [0, -.1, 0]); A(m, l, box(1.7, 4.6, 1.7), '#2a2c34', [0, -3.6, 0]); });
    ['foreF', 'foreB'].forEach(l => { A(m, l, box(1.5, 4.8, 1.5), '#2a2c34', [0, -3, 0]); A(m, l, sph(.38, 8, 6), '#ff8a20', [.62, -6.9, 0], [0, 0, 0], [1, 1, 1], { outline: false }); A(m, l, tor(.8, .14, 4, 12), '#ff9a3c', [0, -.4, 0], [PI / 2, 0, 0], [1, 1, 1], { outline: false }); });
    A(m, 'torso', box(.12, 3, 3.8), '#8a909a', [2.48, 9.2, 0]);
    LOOK.body('genos', 1.02, 1);
  }
  if ((m = M('tatsumaki'))) { // 아주 작은 키·옆트임 검은 원피스·물결치며 뜬 초록 곱슬머리
    [[1.95, .1], [-1.95, -.1]].forEach(([x, rz]) => A(m, 'torso', box(.25, 12, 4.3), '#141418', [x, -4.2, 0], [0, 0, rz]));
    for (let i = 0; i < 9; i++) { const a = -PI * .9 + i / 8 * PI * 1.8; A(m, 'head', tor(.55, .2, 4, 10, PI * 1.4), i % 2 ? '#6af0a0' : '#3ad07a', [-.3 + Math.cos(a) * .2 - .9, 1.3 + (i % 3) * .45, Math.sin(a) * 2.35], [0, -a, .6]); }
    LOOK.body('tatsumaki', .78, .82);
  }
  if ((m = M('bang'))) { // 흰 콧수염·짙은 흰 눈썹·무도복 띠·마른 큰 키
    A(m, 'head', box(.4, .38, 1.7), '#f4f4f8', [1.98, 1.28, 0]);
    [-1, 1].forEach(s => { A(m, 'head', box(.3, .5, .3), '#f4f4f8', [1.95, .95, s * .8]); A(m, 'head', box(.2, .22, .95), '#f4f4f8', [1.62, 3.12, s * 1.12], [0, eyeRotY(s), 0]); });
    [-1, 1].forEach(s => A(m, 'torso', box(.12, 5.5, .7), '#d8d8d8', [2.54, 9.3, s * .9], [s * .45, 0, 0], [1, 1, 1], { outline: false }));
    LOOK.body('bang', 1.08, .88);
  }
  if ((m = M('garou'))) { // 찢긴 검은 셔츠(살 드러남)·근육질
    [[9.5, 1.2, 1.3, 1.6], [6.2, -1.1, 1.6, 1.2], [3.8, .6, 1.1, 1.4], [10.8, -1.6, .9, .9]].forEach(([y, z, h, w]) => A(m, 'torso', box(.12, h, w), '#e8c0a0', [2.5, y, z], [0, 0, 0], [1, 1, 1], { outline: false }));
    ['aF', 'aB'].forEach(l => A(m, l, box(.3, 2.5, 1.1), '#e8c0a0', [.8, -4.5, 0], [0, 0, 0], [1, 1, 1], { outline: false }));
    LOOK.body('garou', 1.04, 1.12);
  }

  // ── 블리치 ──
  if ((m = M('ichigo'))) { // 참월을 맨 붉은 끈(가슴 앞뒤 대각선)
    A(m, 'torso', box(.16, 15, .95), '#9a1a1a', [2.62, 6.6, 0], [.62, 0, 0]);
    A(m, 'torso', box(.16, 15, .95), '#9a1a1a', [-2.62, 6.6, 0], [-.62, 0, 0]);
    LOOK.body('ichigo', 1.02, 1);
  }
  if ((m = M('byakuya'))) { // 6번대 대장 하오리 등판 '六'
    coatMark(m, 1, kanji('roku', '六', '#f4f4f8', '#141418'));
    LOOK.body('byakuya', 1.06, .95);
  }
  if ((m = M('rukia'))) { // 작은 체구·소데노시라유키 손잡이 끝 흰 끈·이마 가운데로 내린 머리 한 가닥
    A(m, 'foreF', box(.06, 5.5, .45), '#ffffff', [0, -10.8, .35], [0, 0, .1]);
    A(m, 'head', box(.28, 1.6, .32), '#141418', [2.05, 2.7, 0], [0, 0, .1]);
    LOOK.body('rukia', .88, .9);
  }
  if ((m = M('hitsugaya'))) { // 아이 키·10번대 '十'·등에 멘 초록 띠와 빙륜환 칼집(별 모양 날밑)
    coatMark(m, 1, kanji('juu', '十', '#f4f4f8', '#141418'));
    A(m, 'torso', box(.16, 15, .95), '#2a8a5a', [2.62, 6.6, 0], [-.62, 0, 0]); A(m, 'torso', box(.16, 15, .95), '#2a8a5a', [-2.62, 6.6, 0], [.62, 0, 0]);
    A(m, 'torso', cyl(.32, .3, 11, 7), '#14303a', [-3, 7.5, 0], [.62, 0, 0]);
    A(m, 'torso', box(.2, 2.2, .5), '#d8b040', [-3, 11.9, -2.6], [.62, 0, 0]); A(m, 'torso', box(.2, .5, 2.2), '#d8b040', [-3, 11.9, -2.6], [.62, 0, 0]);
    LOOK.body('hitsugaya', .85, .85);
  }
  if ((m = M('kenpachi'))) { // 거구·11번대 '十一'·머리 끝 방울·오른눈 안대와 끈·왼눈 흉터
    coatMark(m, 1, kanji('juuichi', '十一', '#f4f4f8', '#141418'), 5.6, 3.6);
    for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; A(m, 'head', sph(.3, 6, 5), '#e0c040', [-.6 + Math.cos(a) * 3.2, 4.3 + Math.sin(i * 1.7) * .9, Math.sin(a) * 3.2], [0, 0, 0], [1, 1, 1], { outline: false }); }
    A(m, 'head', box(.16, .95, 1.05), '#0e0e12', [1.66, 2.45, 1.2], [0, eyeRotY(1), 0]);
    A(m, 'head', tor(2.12, .07, 4, 18), '#0e0e12', [0, 2.6, 0], [PI / 2, .25, 0], [1, 1, .93], { outline: false });
    A(m, 'head', box(.06, 2.3, .12), '#8a2a2a', [1.78, 2.35, -1.05], [0, eyeRotY(-1), .2], [1, 1, 1], { outline: false });
    LOOK.body('kenpachi', 1.25, 1.25);
  }
  if ((m = M('aizen'))) { // 우에코 문도 시절: 흰 옷·높은 깃·보라 허리띠 매듭(넘긴 머리 한 가닥은 기본 머리 모양)
    A(m, 'torso', cyl(1.35, 1.1, 1.8, 10, true), '#f4f4f8', [.1, 13.3, 0]);
    A(m, 'torso', box(.3, 1.4, .9), '#5a3a9a', [2.6, 2.4, .5], [.3, 0, 0]);
    A(m, 'torso', box(.06, 9, .14), '#c8c0e0', [2.55, 7, -.3], [-.12, 0, 0], [1, 1, 1], { outline: false });
    LOOK.body('aizen', 1.06, .97);
  }
  LOOK.done();
})();
