// 원작 재현 기술: 이름만 같은 게 아니라 원작의 동작·모양·색을 그대로 따라 만든 기술들.
// fxstyle.js 의 자동 고유 이펙트는 여기 목록(window.CANON)에 있는 기술에는 덧씌우지 않는다.
(function () {
  if (typeof CH === 'undefined' || !CH.gai) return;
  window.CANON = window.CANON || new Set();
  const live = [];
  // ── 붉은 용(밤가이): 머리(주둥이·위아래 턱·뿔·갈기·눈) + 머리 궤적을 따라오는 몸통 마디 ──
  const red = '#ff2a14', red2 = '#ff7a3a', core = '#ffd8b0';
  const coneG = new THREE.ConeGeometry(1, 1, 8); coneG.userData.shared = true;
  const sphG = new THREE.SphereGeometry(1, 12, 9); sphG.userData.shared = true;
  function makeDragon() {
    const g = new THREE.Group(), head = new THREE.Group(); g.add(head);
    const part = (geo, c, op, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, addMat(c, op)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); head.add(m); return m; };
    // 주둥이(앞으로 뾰족) — 머리 앞쪽이 +z
    part(coneG, red, .9, 6, 18, 5, 0, 1.5, 6, PI / 2, 0, 0); part(coneG, core, .8, 3, 14, 2.6, 0, 1.6, 6, PI / 2, 0, 0);
    const jaw = part(coneG, red, .85, 5, 15, 3, 0, -2.2, 5, PI / 2 + .35, 0, 0); // 아래턱(벌어짐)
    part(sphG, red, .8, 8, 7, 9, 0, 0, -3); part(sphG, core, .7, 4.5, 4, 5, 0, 0, -3);   // 머리통
    [-1, 1].forEach(s => { part(coneG, red2, .9, 1.4, 14, 1.4, s * 4, 6, -8, -1.1, 0, s * .35); // 뿔(뒤로 휨)
      const eye = new THREE.Sprite(spriteMat(flareTex, '#fff2c0', 1)); eye.scale.set(5, 5, 1); eye.position.set(s * 3.6, 3, 2); head.add(eye); });
    for (let i = 0; i < 7; i++) part(coneG, i % 2 ? red : red2, .75, 1.6, 10 + i, 1.6, Math.sin(i) * 3, 3 + i * .6, -10 - i * 1.8, -1.6 + i * .08, 0, (i - 3) * .25); // 갈기
    const glow = new THREE.Sprite(spriteMat(glowTex, red, .7)); glow.scale.set(60, 60, 1); head.add(glow);
    const segs = []; for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(sphG, addMat(i % 3 ? red : red2, .75 - i * .02)); const r = 7.5 - i * .28; s.scale.setScalar(r); g.add(s); segs.push(s); }
    scene3.add(g); return { g, head, jaw, segs, trail: [] };
  }
  function nightGuy(a, b) {
    const d = () => dirTo(a, b);
    const steam = (n, k) => { for (let i = 0; i < n; i++) parts.push({ p: a.pos.clone().add(V3(R(-6, 6), R(0, 26), R(-6, 6))), v: V3(R(-12, 12), R(50, 120) * k, R(-12, 12)), life: R(1, 1.6), c: pick(['#ff3a2a', '#ff6a40', '#c81a10', '#ff9a70']), g: -20, s: pick([2, 3]) }); };
    let dr = null;
    return [
      // 1) 팔문 개방: 피처럼 붉은 증기가 몸에서 솟음
      step(.55, [[a, { pose: 'braced', aura: 1, elem: 'blood', face: b }], [b, { pose: 'guard', face: a }]], () => { callout(a, '팔문둔갑 · 경문 개방', false); steam(120, 1.2); pillar(V3(a.pos.x, 0, a.pos.z), 14, '#ff2a14', 1.4); ring(V3(a.pos.x, .4, a.pos.z), 5, '#ff3a2a', true, 1.4, 2.6); for (let i = 0; i < 6; i++) pending.push({ t: i * .08, fn: () => steam(30, 1) }); shake = Math.max(shake, 6); }),
      // 2) 네 발로 엎드리듯 낮게 웅크림 — 땅이 갈라짐
      step(.4, [[a, { pose: 'crouchRun', aura: 1, elem: 'blood', face: b, k: 60 }], [b, { pose: 'block', face: a }]], () => { callout(a, '밤가이', true); moses(V3(a.pos.x, 0, a.pos.z), V3(a.pos.x, 0, a.pos.z).addScaledVector(d(), 30), 12, 2.4); steam(80, 1.6); light(chest(a), '#ff2a14', 8); }),
      // 3) 발차기 자세로 수평 비행 — 붉은 용머리가 앞장서고 몸통이 궤적을 따라옴
      step(.6, [[a, { pose: 'highKick', k: 95, tilt: 1.25, vy: 40, ghost: 1, elem: 'blood', face: b, to: () => b.pos.clone().addScaledVector(d(), 26) }], [b, { pose: 'block', face: a }]], () => {
        dr = makeDragon(); live.push({ dr, a, b, t: 0, phase: 'fly' }); shake = Math.max(shake, 10);
        for (let i = 0; i < 8; i++) pending.push({ t: i * .06, fn: () => ghosts.push({ ch: a.ch, pos: a.pos.clone(), heading: a.heading, c: { ...a.c }, life: .8, color: '#ff3a2a', dec: .3 }) });
      }),
      // 4) 충돌: 거대한 붉은 폭발
      step(.25, [[a, { pose: 'highKick', tilt: .6, face: b }], [b, { pose: 'hurt', face: a }]], () => {
        const p = chest(b); resolve(a, b, 'blood', 'hit', '밤가이!', 2.8); ultBlast(p, 'blood', 80, a, '밤가이!'); dome(p, 40, '#ff2a14'); for (let i = 0; i < 5; i++) ring(p, 4 + i * 4, i % 2 ? '#ffffff' : '#ff2a14', false, 1.4, 3); scorch(p, 30); shake = 20;
        const L = live.find(x => x.dr === dr); if (L) L.phase = 'fade';
      }),
      step(.35, [[a, { pose: 'land', tilt: 0, face: b }], [b, { pose: 'hurt', face: a }]])];
  }
  // 용 움직임: 머리는 시전자의 발끝 앞, 몸통은 머리가 지나온 자리를 따라감
  const _env = envUpdate;
  envUpdate = function (dt, t) {
    _env(dt, t);
    for (let i = live.length - 1; i >= 0; i--) { const L = live[i], { dr, a } = L; L.t += dt;
      const fw = fwdOf(a), hp = a.pos.clone().add(V3(0, 16, 0)).addScaledVector(fw, 18);
      if (L.phase === 'fly') { dr.head.position.lerp(hp, L.t < .05 ? 1 : .5); } else { dr.head.position.addScaledVector(fw, 160 * dt); L.fadeT = (L.fadeT || 0) + dt; }
      dr.trail.unshift(dr.head.position.clone()); if (dr.trail.length > 70) dr.trail.pop();
      dr.head.lookAt(dr.head.position.clone().add(fw)); dr.jaw.rotation.x = PI / 2 + .3 + Math.sin(t * 20) * .12;
      dr.segs.forEach((s, k) => { const q = dr.trail[Math.min(dr.trail.length - 1, 2 + k * 3)]; if (q) s.position.copy(q).add(V3(0, Math.sin(t * 12 + k * .7) * 2, 0)); });
      if (Math.random() < .8) parts.push({ p: dr.head.position.clone().add(V3(R(-6, 6), R(-6, 6), R(-6, 6))), v: fw.clone().multiplyScalar(-R(40, 120)).add(V3(R(-20, 20), R(-10, 30), R(-20, 20))), life: R(.5, .9), c: pick(['#ff2a14', '#ff7a3a', '#ffd8b0']), g: 0, s: pick([1, 2, 3]) });
      light(dr.head.position, '#ff2a14', 6);
      const fade = L.phase === 'fade' ? Math.max(0, 1 - L.fadeT / .6) : 1; dr.g.traverse(o => { if (o.material) o.material.opacity = (o.material.userData.op0 ?? (o.material.userData.op0 = o.material.opacity)) * fade; });
      if (L.t > 3 || fade <= 0) { kill(dr.g); live.splice(i, 1); } }
  };
  CH.gai.skills['밤가이'] = nightGuy; window.CANON.add('밤가이'); window.CANON.add('팔문둔갑 · 경문 개방');
})();
