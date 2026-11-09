// 피격 반응 다양화(11-09, 소유자 주문: "피격 경직·모션 다양하게"):
//  - 공격 방향(좌/우/뒤)·강도·공중 여부에 따라 반응 자세 분기: 허트L/R/B(경미) → 스태거L/R/B(경직, 모캡 'Stagger') → 허트U(공중 경직)
//  - 넉백(knock.js)·다운(KO)과 충돌 없이, wound 끝에 반응 자세만 얹는다. 속도/궤도는 그대로 보존.
(function () {
  if (typeof wound !== 'function' || typeof apply !== 'function' || typeof POSE === 'undefined' || typeof POSE.hurt === 'undefined') return;
  const P = POSE;
  if (!P.hurtL) {
    P.hurtL = Object.assign({}, P.hurt, { lean: -7, twist: .5, armX: .25 });
    P.hurtR = Object.assign({}, P.hurt, { lean: -7, twist: -.5, armX: -.25 });
    P.hurtB = Object.assign({}, P.hurt, { lean: -9, twist: -.7, leg: .1, bob: 4, kneeF: .35, kneeB: .35 });
    P.staggerL = Object.assign({}, P.hurt, { lean: -12, twist: 1.1, armX: .5, leg: .15, bob: 5, kneeF: .5, kneeB: .5 });
    P.staggerR = Object.assign({}, P.hurt, { lean: -12, twist: -1.1, armX: -.5, leg: .15, bob: 5, kneeF: .5, kneeB: .5 });
    P.staggerB = Object.assign({}, P.hurt, { lean: -15, twist: -1.3, armX: -.8, leg: .05, bob: 6, kneeF: .65, kneeB: .65 });
    P.hurtU = Object.assign({}, P.hurt, { lean: -6, bob: -4, leg: .7, kneeF: .55, kneeB: .3, arm: -1.2, barm: -1.4 });
  }
  const now = () => performance.now() / 1000;
  const _w = wound;
  wound = function (v, a, text, ek) {
    const r = _w.apply(this, arguments);
    try {
      if (!v || !a || v.down || !F.includes(v) || v.hp <= 0) return r;
      if (v.away) return r; // 벽 박힘 연극 중에는 간섭 금지
      const recent = a && a._coT && now() - a._coT < 2.6, ult = recent && a._coUlt, mid = recent && !ult; // 넉백(knock.js)과 같은 등급 신호
      const fw = fwdOf(v), ad = dirTo(v, a);
      const side = ad.x * -fw.z + ad.z * fw.x;             // 공격이 들어온 좌/우
      const back = ad.x * fw.x + ad.z * fw.z < -.25;        // 뒤에서 맞았나
      const airY = (v.air && v.pos.y > 4) || (window.PHYS && PHYS.flights && PHYS.flights.has(v));
      const strong = mid || ult;
      const fam = airY ? ['hurtU'] : (strong ? (back ? ['staggerB'] : side > 0 ? ['staggerR'] : ['staggerL']) : (back ? ['hurtB'] : side > 0 ? ['hurtR'] : ['hurtL']));
      const vx = v.vel.x, vy = v.vel.y, vz = v.vel.z;
      apply(v, { pose: fam[0], face: a, k: strong ? 80 : 60 }, strong ? .34 : .24);
      v.vel.set(vx, vy, vz);
      const st = airY ? Math.max(.18, Math.min(.5, v.stun || 0)) : ult ? R(.5, .8) : mid ? R(.36, .55) : R(.12, .26); // 경직: 중간 이상은 모캡 'Stagger' 구간(.35↑)
      if ((v.stun || 0) < st) v.stun = st;
      v.__hrT = performance.now() / 1000;
      const HR = window.__hr = window.__hr || { n: 0, by: {} }; HR.n++; HR.by[fam[0]] = (HR.by[fam[0]] || 0) + 1;
    } catch (e) { }
    return r;
  };
})();
