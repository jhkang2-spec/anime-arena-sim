// 원작 외형 A: 나루토 세계 7명 + 귀멸의 칼날 13명 — 체형(키·덩치)·옷·대표 소품을 원작처럼
// 모형 단위: 키 약 34, 앞 +x, 위 +y. 몸통(torso) 원점 = 허리(골반 위), 가슴 약 y 9, 어깨 약 y 12, 목 13.3. 머리(head) 원점 = 목 위, 얼굴 중심 y 2.2·앞면 x 2.
(function () {
  const L = window.LOOK; if (!L || typeof CH === 'undefined') return;
  const PI = Math.PI;
  const C = THREE;
  const has = k => !!(CH[k] && CH[k].model);
  // looks-core 의 뼈대 이름 보완: 팔(aF/aB)은 {up, fore} 묶음이라 그룹을 직접 이름 붙여 둔다
  const prep = m => { if (m._aFu) return m; m._aFu = m.aF.up; m._aFf = m.aF.fore; m._aBu = m.aB.up; m._aBf = m.aB.fore; m._shF = m.legF.userData.knee; m._shB = m.legB.userData.knee; return m; };
  const A = (key, bone, geo, c, p, r, s, opt) => { if (!has(key)) return; L.add(prep(CH[key].model), bone, geo, c, p || [0, 0, 0], r || [0, 0, 0], s || [1, 1, 1], Object.assign({ outline: false }, opt || {})); };
  const both = (key, boneF, boneB, geo, c, p, r, s, opt) => { A(key, boneF, geo, c, p, r, s, opt); A(key, boneB, geo, c, p && [p[0], p[1], -p[2]], r, s, opt); };
  const cylA = (r1, r2, h, t0, tl, seg = 16) => new C.CylinderGeometry(r1, r2, h, seg, 1, true, t0, tl);
  // 앞이 트인 하오리(겉옷) 몸판: 앞(θ=π/2) 양옆으로 gap 만큼 비움
  const haori = (key, map, color, { top = 12.6, bot = -7, r1 = 3.65, r2 = 4.7, gap = .38, half = null } = {}) => {
    const h = top - bot, y = (top + bot) / 2, sc = [.82, 1, 1.2];
    if (!half) A(key, 'torso', cylA(r1, r2, h, PI / 2 + gap, 2 * PI - 2 * gap, 20), color, [0, y, 0], [0, 0, 0], sc, { map });
    else { // 기유: 왼쪽 반 / 오른쪽 반 다른 천
      A(key, 'torso', cylA(r1, r2, h, PI / 2 + gap, PI - gap, 12), half[0].c, [0, y, 0], [0, 0, 0], sc, { map: half[0].map });
      A(key, 'torso', cylA(r1, r2, h, 3 * PI / 2, PI - gap, 12), half[1].c, [0, y, 0], [0, 0, 0], sc, { map: half[1].map });
    }
  };
  // 넓은 소매(위팔에 매달린 통)
  const sleeves = (key, map, color, len = 7.6, rb = 2.25, mapB, colorB) => {
    A(key, '_aFu', L.G.cyl(1.55, rb, len, 12, true), color, [0, -len / 2 + .4, 0], [0, 0, 0], [1, 1, 1], { map });
    A(key, '_aBu', L.G.cyl(1.55, rb, len, 12, true), colorB || color, [0, -len / 2 + .4, 0], [0, 0, 0], [1, 1, 1], { map: mapB || map });
  };
  const coatTex = (key, map, color) => { if (!has(key)) return; const m = CH[key].model; if (!m.coat || !m.coat.length) return; const set = new Set(m.coat.map(c => c.material)); set.forEach(mt => { if (map) { mt.map = map; mt.color && mt.color.set('#ffffff'); } else if (color && mt.color) mt.color.set(color); mt.needsUpdate = true; }); };
  const disc = (r, t = .12) => { const g = L.G.cyl(r, r, t, 18); g.rotateZ(PI / 2); return g; }; // x 방향을 보는 원판
  const rep = (t, u, v) => { t.repeat.set(u, v); return t; };

  // ── 무늬 그림 ──
  const P = {
    tanjiro: rep(L.checker('a_tanjiro', '#17704a', '#121212', 8), 3, 2.2),
    akatsuki: rep(L.pattern('a_akatsuki', (x, s) => { x.fillStyle = '#0d0d12'; x.fillRect(0, 0, s, s);
      const cloud = (cx, cy, k) => { x.beginPath(); [[0, 0, 1], [-.9, .25, .75], [.9, .25, .75], [-.45, -.45, .7], [.45, -.45, .7]].forEach(([dx, dy, r]) => { x.moveTo(cx + dx * k * 22 + r * k * 16, cy + dy * k * 22); x.arc(cx + dx * k * 22, cy + dy * k * 22, r * k * 16, 0, 7); }); x.fillStyle = '#c8141e'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#f4f4f4'; x.stroke(); };
      cloud(s * .3, s * .3, 1.1); cloud(s * .75, s * .72, 1); cloud(s * .8, s * .2, .7); }, 256), 2, 1.3),
    zenitsu: rep(L.pattern('a_zenitsu', (x, s) => { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#ffcf3a'); g.addColorStop(1, '#f39a14'); x.fillStyle = g; x.fillRect(0, 0, s, s); x.fillStyle = '#fbf6e4';
      const n = 4, w = s / n; for (let r = 0; r < n; r++) for (let i = 0; i < n + 1; i++) { const ox = i * w + (r % 2 ? w / 2 : 0), oy = r * w; x.beginPath(); x.moveTo(ox - w * .32, oy + w * .82); x.lineTo(ox + w * .32, oy + w * .82); x.lineTo(ox, oy + w * .25); x.closePath(); x.fill(); } }, 128), 3, 2),
    giyuPat: rep(L.pattern('a_giyu', (x, s) => { const n = 4, w = s / n, cols = ['#2a8a5a', '#d8b830', '#e07a28', '#3a9a6a']; for (let r = 0; r < n; r++) for (let i = 0; i < n; i++) { x.fillStyle = cols[(r + i * 2) % 4]; x.beginPath(); x.moveTo(i * w, r * w); x.lineTo(i * w + w, r * w); x.lineTo(i * w + (r % 2 ? 0 : w), r * w + w); x.closePath(); x.fill(); x.fillStyle = cols[(r + i * 2 + 1) % 4]; x.beginPath(); x.moveTo(i * w + (r % 2 ? w : 0), r * w); x.lineTo(i * w + w, r * w + w); x.lineTo(i * w, r * w + w); x.closePath(); x.fill(); } }, 128), 2, 2),
    rengoku: L.pattern('a_rengoku', (x, s) => { x.fillStyle = '#f6f2ea'; x.fillRect(0, 0, s, s); for (let i = 0; i < 9; i++) { const cx = (i + .5) * s / 9, h = s * (.28 + (i % 3) * .07); const g = x.createLinearGradient(0, s, 0, s - h); g.addColorStop(0, '#d8200e'); g.addColorStop(.6, '#ff7a10'); g.addColorStop(1, '#ffd24a'); x.fillStyle = g; x.beginPath(); x.moveTo(cx - s / 18, s); x.quadraticCurveTo(cx - s / 30, s - h * .6, cx + s / 40, s - h); x.quadraticCurveTo(cx + s / 26, s - h * .45, cx + s / 18, s); x.fill(); } }, 256),
    shinobu: L.pattern('a_shinobu', (x, s) => { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#f4f1fa'); g.addColorStop(.45, '#c9b3ef'); g.addColorStop(1, '#3fae98'); x.fillStyle = g; x.fillRect(0, 0, s, s); x.strokeStyle = '#1a1424'; x.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(i * s / 6, s); x.quadraticCurveTo(i * s / 6 + s / 12, s * .55, i * s / 6 - s / 14, s * .2); x.stroke(); } x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc((i * 37) % s, s * .55 + (i * 23) % (s * .4), 3, 0, 7); x.fill(); } }, 256),
    nezuko: rep(L.pattern('a_nezuko', (x, s) => { x.fillStyle = '#f2a6bf'; x.fillRect(0, 0, s, s); x.strokeStyle = '#c75d84'; x.lineWidth = 2; const w = s / 4, h = w * .866;
      for (let r = -1; r < 6; r++) for (let i = -1; i < 6; i++) { const cx = i * w + (r % 2 ? w / 2 : 0), cy = r * h; for (let k = 0; k < 6; k++) { const a = k * PI / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * w / 2, cy + Math.sin(a) * w / 2); x.stroke(); } x.beginPath(); for (let k = 0; k <= 6; k++) { const a = k * PI / 3 + PI / 6; x.lineTo(cx + Math.cos(a) * w * .58, cy + Math.sin(a) * w * .58); } x.stroke(); } }, 128), 3, 3),
    obanai: rep(L.pattern('a_obanai', (x, s) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#141414' : '#f2f2f2'; x.fillRect(i * s / 8, 0, s / 8, s); } }, 64), 3, 1),
    sanemi: L.pattern('a_sanemi', (x, s) => { x.fillStyle = '#f2f2f0'; x.fillRect(0, 0, s, s); x.fillStyle = '#121212'; x.font = `bold ${s * .32}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('殺', s * .5, s * .38); }, 256),
    himejima: rep(L.pattern('a_himejima', (x, s) => { x.fillStyle = '#7a6a48'; x.fillRect(0, 0, s, s); x.strokeStyle = '#5a4a30'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, i * s / 6 + s / 12); x.lineTo(s, i * s / 6 + s / 12); x.stroke(); } }, 64), 2, 2),
    muzzle: L.pattern('a_bamboo', (x, s) => { const g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#9cbd52'); g.addColorStop(.5, '#7a9a3a'); g.addColorStop(1, '#5a7a28'); x.fillStyle = g; x.fillRect(0, 0, s, s); x.fillStyle = '#4a6a20'; x.fillRect(s * .48, 0, s * .04, s); }, 32),
  };

  // ════ 나루토 세계 ════
  // 나루토: 주황·검정 점퍼(높은 깃·지퍼), 등 소용돌이, 어깨 소용돌이, 허벅지 쿠나이 주머니
  L.body('naruto', 1, 1);
  A('naruto', 'torso', L.G.cyl(3.55, 3.75, 10.5, 16, true), '#f07a18', [0, 6.2, 0], [0, 0, 0], [.8, 1, 1.18]);
  A('naruto', 'torso', L.G.cyl(3.2, 3.55, 3, 16, true), '#1c1c28', [0, 11.6, 0], [0, 0, 0], [.82, 1, 1.18]);
  A('naruto', 'torso', L.G.cyl(2.1, 2.45, 2.2, 16, true), '#1c1c28', [.1, 13.6, 0], [0, 0, 0], [.95, 1, 1.05]); // 높은 깃
  A('naruto', 'torso', L.G.box(.14, 10, .3), '#e8e8f0', [2.86, 7, 0]); // 지퍼
  A('naruto', 'torso', disc(1.5), '#d0401a', [-2.95, 8.6, 0]); A('naruto', 'torso', L.G.tor(.75, .2, 4, 12), '#f07a18', [-3.0, 8.6, 0], [0, PI / 2, 0]); // 등 소용돌이
  A('naruto', '_aFu', L.G.cyl(1.2, 1.15, 1.6, 10, true), '#1c1c28', [0, -1.6, 0]); A('naruto', '_aFu', disc(.55, .1), '#d0401a', [0, -1.6, 1.22], [0, -PI / 2, 0]);
  A('naruto', 'legF', L.G.cyl(1.62, 1.55, 1.3, 10, true), '#e8e8f0', [0, -3.5, 0]); A('naruto', 'legF', L.G.box(1.2, 2.2, 1.4), '#2a2a32', [0, -3.5, 1.5]); // 붕대·쿠나이 주머니
  A('naruto', '_shF', L.G.cyl(1.0, .95, 1.6, 10, true), '#1e3a7a', [0, -4.6, 0]); A('naruto', '_shB', L.G.cyl(1.0, .95, 1.6, 10, true), '#1e3a7a', [0, -4.6, 0]);

  // 사스케: 흰 셔츠(벌어진 높은 깃), 등 우치하 부채, 보라 밧줄 띠(뒤 매듭), 검은 팔 보호대, 등 뒤 쿠사나기
  L.body('sasuke', 1.01, .97);
  A('sasuke', 'torso', L.G.cyl(2.4, 2.9, 2.6, 14, true), '#e8ecf4', [-.25, 13.3, 0], [0, 0, 0], [1, 1, 1.05]);
  A('sasuke', 'torso', disc(1.45), '#c8141e', [-2.95, 10, 0]); A('sasuke', 'torso', L.G.box(.12, 1.3, 2.6), '#f4f4f4', [-2.98, 8.7, 0]); A('sasuke', 'torso', L.G.box(.12, 2, .5), '#f4f4f4', [-2.98, 7, 0]); // 우치하 부채
  A('sasuke', 'torso', L.G.tor(3.25, .55, 6, 18), '#6a3a9a', [0, 2.8, 0], [PI / 2, 0, 0], [.82, 1.18, 1]);
  A('sasuke', 'torso', L.G.sph(.9), '#6a3a9a', [-3.1, 2.6, .8]); A('sasuke', 'torso', L.G.sph(.9), '#6a3a9a', [-3.1, 2.6, -.8]); A('sasuke', 'torso', L.G.box(.5, 3.2, .5), '#6a3a9a', [-3.1, .6, .4], [.2, 0, 0]);
  both('sasuke', '_aFf', '_aBf', L.G.cyl(.95, .85, 3.6, 10, true), '#262a3c', [0, -2.6, 0]);
  A('sasuke', 'torso', L.G.box(.18, 13, .5), '#c8ccd8', [-3.2, 9, 0], [.48, 0, 0]); A('sasuke', 'torso', L.G.box(.42, 3, .42), '#1a1a22', [-3.2, 9 + 7.9 * Math.cos(.48), 7.9 * Math.sin(.48)], [.48, 0, 0]);

  // 카카시: 녹색 조끼(두루마리 주머니 4개), 비스듬한 이마 보호대(왼눈 가림), 팔 보호대
  L.body('kakashi', 1.03, 1);
  A('kakashi', 'torso', L.G.cyl(3.7, 3.85, 8.4, 16, true), '#4a6a3e', [0, 7.4, 0], [0, 0, 0], [.85, 1, 1.2]);
  A('kakashi', 'torso', L.G.cyl(2.1, 2.5, 1.8, 14, true), '#4a6a3e', [0, 12.4, 0], [0, 0, 0], [.95, 1, 1.05]);
  for (const z of [-1.6, -.55, .55, 1.6]) A('kakashi', 'torso', L.G.cyl(.42, .42, 2.6, 8), '#5c7c4c', [3.05, 8.4, z]);
  A('kakashi', 'torso', L.G.box(.12, 8, .25), '#2a3a2a', [3.15, 7.2, 0]);
  A('kakashi', 'head', L.G.cyl(2.16, 2.16, .62, 20, true), '#1a2040', [0, 2.95, 0], [.32, 0, 0], [1, 1, .94]);
  A('kakashi', 'head', L.G.box(.16, .95, 1.5), '#c8ccd8', [2.05, 2.62, -.62], [-.32, 0, 0]);
  both('kakashi', '_aFf', '_aBf', L.G.cyl(.9, .82, 2.8, 10, true), '#1a1a22', [0, -3.6, 0]);
  both('kakashi', 'legF', 'legB', L.G.cyl(1.5, 1.45, 1.1, 10, true), '#e8e8f0', [0, -4, 0]);

  // 사쿠라: 빨간 치파오 상의(세운 깃·등 원 무늬), 검은 반바지 위 분홍 치마, 장갑, 붉은 머리띠
  L.body('sakura', .95, .9);
  A('sakura', 'torso', L.G.cyl(1.9, 2.2, 1.4, 14, true), '#c8243a', [.1, 13.3, 0]);
  A('sakura', 'torso', disc(1.3), '#f4f4f4', [-2.95, 9, 0]); A('sakura', 'torso', disc(.9, .14), '#c8243a', [-3.0, 9, 0]);
  A('sakura', 'torso', L.G.box(.12, 1.4, 1.6), '#f4f4f4', [2.86, 11.6, .9], [0, 0, .2]);
  both('sakura', '_aFf', '_aBf', L.G.cyl(.86, .8, 2.4, 10, true), '#1a1a22', [0, -4.6, 0]);

  // 가아라: 등에 큰 표주박(끈 대각선), 이마의 붉은 '애', 눈가 검은 테, 적갈색 긴 코트 + 회색 조끼
  L.body('gaara', .96, .94);
  A('gaara', 'torso', L.G.sph(3.2, 14, 10), '#c8a070', [-5.4, 4.6, 0], [0, 0, 0], [.9, 1.05, .95], { outline: true });
  A('gaara', 'torso', L.G.sph(2.3, 12, 9), '#c8a070', [-5.0, 10.4, 0], [0, 0, 0], [.9, 1, .95], { outline: true });
  A('gaara', 'torso', L.G.cyl(.7, .8, 1.4, 8), '#7a5a3a', [-4.9, 13.2, 0]); A('gaara', 'torso', L.G.tor(1.6, .25, 4, 14), '#5a3a22', [-5.1, 7.6, 0], [PI / 2, 0, 0]);
  A('gaara', 'torso', L.G.box(.3, 15, .9), '#5a3a22', [0, 7.4, 0], [.62, 0, 0], [1, 1, 1]);
  A('gaara', 'torso', L.G.cyl(3.6, 3.8, 8, 16, true), '#7c7c74', [0, 7.4, 0], [0, 0, 0], [.84, 1, 1.18]);
  A('gaara', 'head', L.G.box(.1, .62, .14), '#c81e1e', [1.92, 3.55, -.82]); A('gaara', 'head', L.G.box(.1, .14, .55), '#c81e1e', [1.92, 3.7, -.82]); A('gaara', 'head', L.G.box(.1, .14, .55), '#c81e1e', [1.92, 3.42, -.82]);
  for (const z of [-1.24, 1.24]) A('gaara', 'head', L.G.sph(.72, 10, 8), '#1a0c0c', [1.32, 2.46, z * .97], [0, 0, 0], [.25, 1.25, 1]);
  coatTex('gaara', null, '#5a1818');

  // 이타치: 붉은 구름 아카츠키 망토(높은 깃·넓은 소매), 그어진 이마 보호대
  L.body('itachi', 1.02, .95);
  A('itachi', 'torso', cylA(3.9, 5.6, 22, 0, 2 * PI, 22), '#ffffff', [0, 2, 0], [0, 0, 0], [.82, 1, 1.18], { map: P.akatsuki });
  A('itachi', 'torso', L.G.cyl(2.2, 2.6, 2.9, 14, true), '#0d0d12', [.05, 13.6, 0], [0, 0, 0], [.95, 1, 1.02]);
  A('itachi', 'torso', L.G.cyl(2.18, 2.18, .2, 14, true), '#c8141e', [.05, 15.0, 0], [0, 0, 0], [.95, 1, 1.02]);
  sleeves('itachi', P.akatsuki, '#ffffff', 8, 2.4);
  A('itachi', 'head', L.G.cyl(2.14, 2.14, .55, 20, true), '#1a2040', [0, 3.15, 0], [0, 0, 0], [1, 1, .93]);
  A('itachi', 'head', L.G.box(.15, .62, 1.5), '#c8ccd8', [2.08, 3.15, 0]); A('itachi', 'head', L.G.box(.18, .08, 1.6), '#1a1a1a', [2.12, 3.15, 0], [.5, 0, 0]);
  coatTex('itachi', P.akatsuki);

  // 가이: 녹색 쫄쫄이, 주황 다리 토시, 허리에 맨 붉은 이마 보호대, 녹색 조끼, 바가지 머리·굵은 눈썹
  L.body('gai', 1.05, 1.16);
  A('gai', 'torso', L.G.cyl(3.7, 3.85, 8.2, 16, true), '#56763e', [0, 7.6, 0], [0, 0, 0], [.85, 1, 1.2]);
  for (const z of [-1.6, -.55, .55, 1.6]) A('gai', 'torso', L.G.cyl(.42, .42, 2.6, 8), '#668650', [3.05, 8.4, z]);
  A('gai', 'torso', L.G.tor(3.05, .45, 6, 18), '#c81e2a', [0, 2.7, 0], [PI / 2, 0, 0], [.82, 1.18, 1]); A('gai', 'torso', L.G.box(.16, .9, 1.6), '#c8ccd8', [2.7, 2.7, 0]);
  both('gai', '_shF', '_shB', L.G.cyl(1.15, 1.05, 3.6, 10, true), '#f07a18', [0, -4.2, 0]);
  A('gai', 'head', L.G.box(.5, .9, 3.9), '#141418', [1.72, 3.55, 0]); A('gai', 'head', L.G.cyl(2.2, 2.22, 1.2, 20, true), '#141418', [-.05, 3.4, 0], [0, 0, 0], [1.05, 1, 1]);
  for (const z of [-1.08, 1.08]) A('gai', 'head', L.G.box(.3, .42, 1.05), '#0a0a0a', [1.72, 3.1, z]);

  // ════ 귀멸의 칼날 ════ (대원 공통: 검은 제복·흰 각반은 기존 모형, 하오리·소품을 원작대로)
  // 탄지로: 녹색·검정 체크 하오리, 하나후다 귀걸이, 이마 흉터
  L.body('tanjiro', .98, .94);
  haori('tanjiro', P.tanjiro, '#ffffff'); sleeves('tanjiro', P.tanjiro, '#ffffff'); coatTex('tanjiro', P.tanjiro);
  for (const z of [-1.95, 1.95]) { A('tanjiro', 'head', L.G.box(.1, 1.15, .62), '#f4f2ea', [-.1, .9, z]); A('tanjiro', 'head', L.G.box(.12, .42, .42), '#d02a1a', [-.1, 1.05, z * 1.01]); }
  A('tanjiro', 'head', L.G.box(.12, .55, .7), '#8a2a1a', [1.98, 3.55, .55], [0, 0, .3]);

  // 네즈코: 분홍 삼잎(마엽) 기모노·밤색 띠, 대나무 재갈, 분홍 리본, 작은 체구
  L.body('nezuko', .86, .84);
  A('nezuko', 'torso', cylA(3.6, 4.9, 20, 0, 2 * PI, 20), '#ffffff', [0, 2.6, 0], [0, 0, 0], [.8, 1, 1.15], { map: P.nezuko });
  A('nezuko', 'torso', L.G.cyl(3.15, 3.15, 2.6, 16, true), '#b07a40', [0, 3.6, 0], [0, 0, 0], [.84, 1, 1.18]);
  A('nezuko', 'torso', L.G.cyl(2.0, 2.3, 1.2, 14, true), '#f2a6bf', [.05, 13.2, 0], [0, 0, 0], [.95, 1, 1.02], { map: P.nezuko });
  sleeves('nezuko', P.nezuko, '#ffffff', 7.4, 2.3);
  A('nezuko', 'head', L.G.cyl(.36, .36, 3.9, 8), '#ffffff', [1.98, 1.15, 0], [PI / 2, 0, 0], [1, 1, 1], { map: P.muzzle });
  for (const z of [-1, 1]) A('nezuko', 'head', L.G.tor(1.95, .07, 4, 16, PI * .9), '#7a1a2a', [.1, 1.25, 0], [0, 0, z * .05], [1, 1, 1]);
  for (const z of [-.7, .7]) A('nezuko', 'head', L.G.cone(.75, 1.8, 4), '#f490b4', [-2.1, 3.3, z], [0, 0, z > 0 ? -2.2 : 2.2], [1, 1, .4]);
  coatTex('nezuko', null, '#4a2414');

  // 젠이츠: 노랑 바탕 흰 삼각(비늘) 하오리, 작은 체구
  L.body('zenitsu', .94, .9);
  haori('zenitsu', P.zenitsu, '#ffffff'); sleeves('zenitsu', P.zenitsu, '#ffffff'); coatTex('zenitsu', P.zenitsu);

  // 이노스케: 멧돼지 탈, 맨 상체(가슴·복근), 털 허리 두르개, 짙은 바지
  L.body('inosuke', .98, 1.1);
  A('inosuke', 'head', L.G.sph(2.75, 14, 10), '#8794a2', [.45, 2.6, 0], [0, 0, 0], [1.45, 1.1, 1.15], { outline: true });
  A('inosuke', 'head', L.G.cyl(1.15, 1.35, 2.2, 12), '#c4a49a', [3.9, 1.9, 0], [0, 0, -PI / 2]);
  for (const z of [-.45, .45]) A('inosuke', 'head', L.G.sph(.28, 6, 5), '#3a2420', [5.0, 1.95, z]);
  for (const z of [-1.05, 1.05]) { A('inosuke', 'head', L.G.sph(.5, 8, 6), '#141414', [2.75, 3.05, z]); A('inosuke', 'head', L.G.cone(.7, 1.8, 5), '#6c7a88', [-.4, 4.85, z * 1.3], [z > 0 ? .5 : -.5, 0, .3]); A('inosuke', 'head', L.G.cone(.22, 1.2, 5), '#f2ecdc', [3.5, .95, z * .95], [0, 0, -2.6]); }
  for (let i = 0; i < 6; i++) A('inosuke', 'head', L.G.cone(.55, 2.2, 5), '#566472', [-2.1 - i * .2, 3.8 - i * .9, 0], [0, 0, 1.9 + i * .1]);
  for (const z of [-1.55, 1.55]) A('inosuke', 'torso', L.G.sph(1.6, 10, 8), '#ecc29a', [2.15, 9.4, z], [0, 0, 0], [.42, .78, 1]);
  for (let i = 0; i < 3; i++) for (const z of [-.6, .6]) A('inosuke', 'torso', L.G.box(.3, .9, 1.0), '#e4b890', [2.45, 6.8 - i * 1.25, z]);
  A('inosuke', 'torso', L.G.cyl(3.3, 4.3, 4.2, 18, true), '#6c5a46', [0, .6, 0], [0, 0, 0], [.84, 1, 1.18]);
  for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; A('inosuke', 'torso', L.G.cone(.65, 1.8, 4), '#5c4a38', [Math.sin(a) * 3.6, -2.2, Math.cos(a) * 4.9], [PI, 0, 0]); }

  // 기유: 반은 무지 적갈색, 반은 귀갑(녹·황·주황) 무늬의 짝짝이 하오리
  L.body('giyu', 1.02, .98);
  haori('giyu', null, '#ffffff', { half: [{ c: '#7e2626', map: null }, { c: '#ffffff', map: P.giyuPat }] });
  sleeves('giyu', P.giyuPat, '#ffffff', 7.6, 2.25, null, '#7e2626');
  coatTex('giyu', null, '#7e2626');

  // 렌고쿠: 흰 하오리 + 아래 단에 불꽃 무늬, 듬직한 체격
  L.body('rengoku', 1.03, 1.06);
  haori('rengoku', P.rengoku, '#ffffff', { bot: -9 }); sleeves('rengoku', P.rengoku, '#ffffff'); coatTex('rengoku', P.rengoku);

  // 시노부: 나비 날개 무늬 하오리(흰→보라→청록), 머리 뒤 나비 장식, 작은 체구
  L.body('shinobu', .9, .84);
  haori('shinobu', P.shinobu, '#ffffff'); sleeves('shinobu', P.shinobu, '#ffffff', 7.4, 2.4); coatTex('shinobu', P.shinobu);
  for (const z of [-1, 1]) { A('shinobu', 'head', L.G.box(.12, 1.4, 1.1), '#8a5ad0', [-1.6, 3.9, z * .75], [z * .5, 0, .35]); A('shinobu', 'head', L.G.box(.12, 1.0, .8), '#c8a8f0', [-1.6, 3.0, z * .65], [-z * .4, 0, .2]); }

  // 우즈이: 거구·민소매, 보석 박힌 이마띠, 붉은 눈 화장, 팔찌
  L.body('uzui', 1.2, 1.16);
  A('uzui', 'head', L.G.cyl(2.16, 2.16, .7, 20, true), '#dcdce4', [0, 3.3, 0], [0, 0, 0], [1, 1, .94]);
  A('uzui', 'head', L.G.box(.16, .95, 1.8), '#e8e8f0', [2.08, 3.3, 0]);
  [['#d01a3a', -.55], ['#2ab06a', 0], ['#3a6ad8', .55]].forEach(([c, z]) => A('uzui', 'head', L.G.sph(.24, 8, 6), c, [2.2, 3.3, z]));
  A('uzui', 'head', L.G.box(.08, 1.1, .2), '#c8143a', [1.9, 2.5, -1.15], [0, 0, .5]);
  both('uzui', '_aFu', '_aBu', L.G.cyl(1.22, 1.22, .55, 10, true), '#c8a040', [0, -1.2, 0]);
  both('uzui', '_aFf', '_aBf', L.G.cyl(.92, .9, 1.4, 10, true), '#c8a040', [0, -3.4, 0]);
  A('uzui', 'torso', L.G.tor(3.0, .3, 4, 16), '#c8a040', [0, 3.1, 0], [PI / 2, 0, 0], [.84, 1.18, 1]);

  // 미츠리: 분홍→연두로 물드는 세 가닥 땋은 머리, 가슴 트인 제복, 흰 하오리
  L.body('mitsuri', .97, .92);
  for (const z of [-1.1, 0, 1.1]) for (let i = 0; i < 6; i++) { const t = i / 5, col = t < .45 ? '#f490c0' : t < .7 ? '#d8b8a0' : '#9ad070'; A('mitsuri', 'head', L.G.sph(.85 - i * .06, 9, 7), col, [-2.1 - i * .15, 1.4 - i * 1.25, z * (1 + i * .12)]); }
  A('mitsuri', 'torso', L.G.box(.14, 3.4, 1.6), '#f8dcc8', [2.9, 10.8, 0]);
  haori('mitsuri', null, '#f6f6f2'); coatTex('mitsuri', null, '#f6f6f2');

  // 무이치로: 헐렁한 큰 제복(넓은 소매), 청록 머리끝, 작은 체구
  L.body('muichiro', .88, .84);
  sleeves('muichiro', null, '#141820', 8.4, 2.6);
  for (let i = 0; i < 7; i++) A('muichiro', 'head', L.G.cone(.4, 1.6, 5), '#4ad0c0', [-2.4 + (i % 2) * .2, -1.6 - (i % 3) * .3, -1.5 + i * .5], [0, 0, PI]);

  // 사네미: 앞섶을 연 제복(흉터 가득한 가슴), 등에 '殺' 흰 하오리, 얼굴 흉터
  L.body('sanemi', 1.03, 1.06);
  A('sanemi', 'torso', L.G.box(.18, 8.5, 2.6), '#e8c0a0', [2.85, 8.6, 0]);
  for (let i = 0; i < 6; i++) A('sanemi', 'torso', L.G.box(.1, .16, 2.4), '#9a4a4a', [2.97, 6 + i * 1.3, 0], [i * .5, 0, 0]);
  for (let i = 0; i < 3; i++) A('sanemi', 'head', L.G.box(.06, .14, 1.0), '#9a4a4a', [1.95, 1.6 + i * .7, (i - 1) * .7], [.9, 0, 0]);
  haori('sanemi', P.sanemi, '#ffffff'); sleeves('sanemi', null, '#f2f2f0'); if (has('sanemi')) { const m = CH.sanemi.model; m.coat.forEach(c => c.visible = false); m.coatOn = false; } // 등의 '殺' 이 보이게 망토 조각은 숨김

  // 오바나이: 흑백 줄무늬 하오리, 목에 감긴 흰 뱀(카부라마루), 입가 붕대
  L.body('obanai', .93, .88);
  haori('obanai', P.obanai, '#ffffff'); sleeves('obanai', P.obanai, '#ffffff'); coatTex('obanai', P.obanai);
  A('obanai', 'head', L.G.cyl(2.08, 2.08, 1.3, 20, true), '#f2f2ec', [.05, 1.1, 0], [0, 0, 0], [1, 1, .94]);
  A('obanai', 'torso', L.G.tor(2.7, .42, 6, 18, PI * 1.5), '#f6f6f6', [0, 12.8, 0], [PI / 2, 0, PI * .25], [.9, 1.15, 1]);
  A('obanai', 'torso', L.G.sph(.62, 8, 6), '#f6f6f6', [1.9, 13.6, 2.6], [0, 0, 0], [1.4, .8, .9]);
  for (const z of [-.25, .25]) A('obanai', 'torso', L.G.sph(.12, 5, 4), '#d0141e', [2.6, 13.85, 2.6 + z]);

  // 히메지마: 거인 체구, 목에 큰 염주, 이마 흉터, 갈색 줄 하오리
  L.body('himejima', 1.35, 1.38);
  for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2, s = Math.sin(a); A('himejima', 'torso', L.G.sph(.62, 8, 6), '#3e281a', [2.9 * s, 12.6 - 3.6 * Math.max(0, s), 4.1 * Math.cos(a)]); }
  A('himejima', 'head', L.G.box(.1, 1.4, .26), '#8a4a3a', [2.0, 3.4, 0]);
  haori('himejima', P.himejima, '#ffffff', { bot: -8 }); sleeves('himejima', P.himejima, '#ffffff', 8, 2.6); coatTex('himejima', P.himejima);

  L.done();
})();
