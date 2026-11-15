// fx-sig.js — 전 세계관 대표 기술 '원작 형태' 연출 키트(11-15 소유자 지시: 나루토에 이어 모든 세계관 순차 적용).
// 레시피(형태) 14종을 색·크기만 바꿔 각 원작 기술에 연결한다. 연결: callout(기술 시작 문구) → 레시피(시전자→표적 이동·착탄 포함).
// 피해·판정은 기존 게임 로직 그대로 — 여기선 '보이는 형태'만 원작에 맞춘다. 전부 일정 시간 뒤 자동 소멸(잔재 남기지 않음).
(function () {
  if (typeof THREE === 'undefined' || typeof scene3 === 'undefined' || typeof update !== 'function') return;
  const SG = window.SIG_FX = { on: true, st: {} };
  const Q = () => { try { return (window.getQuality && getQuality()) || 'mid'; } catch (e) { return 'mid'; } };
  const ok = () => SG.on && Q() !== 'low';
  const rr = (a, b) => a + Math.random() * (b - a), V = (x, y, z) => new THREE.Vector3(x, y, z), C = c => new THREE.Color(c);
  const A = () => window.ANIME_FX, X = () => window.FX3, S = () => window.SFX_IMPACT;
  const BLOOM = 3, live = []; let tt = 0;
  const cnt = k => { SG.st[k] = (SG.st[k] || 0) + 1; };
  const chestOf = f => (typeof chest === 'function' && f && f.pos ? chest(f) : f.pos.clone().add(V(0, 10, 0)));
  const fwdOfF = f => (typeof fwdOf === 'function' ? fwdOf(f) : V(1, 0, 0));
  const enemyOf = f => F.find(o => o !== f && o.team !== f.team && o.pos) || null;
  const tag = (m, add = true) => { if (add) m.layers.enable(BLOOM); m.frustumCulled = false; m.renderOrder = 1400; scene3.add(m); return m; };
  const kill = o => { try { o.traverse(x => { if (x.material && x.material.dispose) x.material.dispose(); }); scene3.remove(o); } catch (e) { } };
  const add = (dur, up, end, delay = 0) => live.push({ t: -delay, dur, up, end });
  const NOISE = `float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+7.1;a*=.5;}return s;}`;
  const VS = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv = uv; vP = position; vec4 w = modelMatrix * vec4(position,1.); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const sm = (fs, u, o = {}) => new THREE.ShaderMaterial(Object.assign({ uniforms: Object.assign({ uT: { value: 0 }, uA: { value: 1 }, uC: { value: C('#ffffff') }, uC2: { value: C('#ffffff') } }, u || {}), vertexShader: VS, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }, o));
  const glowT = (() => { if (typeof glowTex !== 'undefined' && glowTex) return glowTex; const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
  const glowSprite = (c, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(s); return sp; };
  const impactAt = (p, c, s = 1, big = false) => { try { const a = A(); if (a) { a.star(p, C(c), 16 * s, .26); a.ring(p, C(c), 14 * s, .4); if (big) { a.ring(V(p.x, 0, p.z), C(c), 30 * s, .55, true); a.speedLines(p, C(c), .5, .9); } } } catch (e) { } try { S() && (big ? S().boom(p, 1.4 * s, false) : S().hit(p, 1.3, 'metal')); } catch (e) { } };

  // ① 초승달 파동(월아천충 등): 굵은 호 리본 — 심지(밝음)·몸통(색)·테두리(rim), dark=true 면 검은 몸통+붉은 테두리(흑 월아천충)
  const crescentG = (() => { const SEG = 40, A0 = 2.6, g = new THREE.BufferGeometry(), P = [], UV = [], I = []; for (let i = 0; i <= SEG; i++) { const u = i / SEG, a = -A0 / 2 + A0 * u, w = Math.pow(Math.sin(u * Math.PI), .55) * .42; [1 - w, 1 + w * .4].forEach((r, j) => { P.push(Math.cos(a) * r, Math.sin(a) * r, 0); UV.push(u, j); }); }
    for (let i = 0; i < SEG; i++) { const k = i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); return g; })();
  const CRES_FS = `uniform float uT, uA, uDark; uniform vec3 uC, uC2; varying vec2 vUv; ${NOISE}
    void main(){ float body = 1. - abs(vUv.y - .55) * 1.9; float n = fbm(vec2(vUv.x * 7. - uT * 6., vUv.y * 3.)); float edge = smoothstep(.0, .18, body);
      float a = clamp(body * 1.4 + n * .4, 0., 1.) * smoothstep(0., .08, vUv.x) * smoothstep(1., .9, vUv.x) * uA; if (a < .02) discard;
      vec3 col = uDark > .5 ? mix(uC2 * 1.6, uC, smoothstep(.05, .35, body)) : mix(uC2, mix(uC, vec3(1.), smoothstep(.6, 1., body)), edge) * 1.8;
      gl_FragColor = vec4(col, a); }`;
  function crescent(a, b, o = {}) { if (!ok() || !a || !b) return; const n = o.n || 1; for (let k = 0; k < n; k++) { const dark = !!o.dark;
      const m = new THREE.Mesh(crescentG, sm(CRES_FS, { uC: { value: C(o.c || '#7ad0ff') }, uC2: { value: C(o.rim || '#ffffff') }, uDark: { value: dark ? 1 : 0 } }, dark ? { blending: THREE.NormalBlending } : {})); tag(m, !dark);
      const s0 = chestOf(a), roll = (o.roll !== undefined ? o.roll : rr(-.5, .5)) + (k % 2 ? Math.PI / 2 * (o.cross ? 1 : 0) : 0), size = o.size || 16, sp = o.speed || 340;
      add(2.2, (q, dt) => { const e = chestOf(b), d = e.clone().sub(s0), L = d.length(), dir = d.normalize(), trav = Math.min(1, (q.t * sp) / Math.max(1, L)); m.position.copy(s0).addScaledVector(dir, L * trav);
          m.quaternion.copy(camera.quaternion); m.rotateZ(Math.atan2(dir.clone().project ? (() => { const p0 = s0.clone().project(camera), p1 = e.clone().project(camera); return p1.y - p0.y; })() : 0, 1) + roll); m.scale.setScalar(size * (.7 + trav * .5));
          m.material.uniforms.uT.value = tt; m.material.uniforms.uA.value = trav >= 1 ? Math.max(0, 1 - (q.t - q.hitT) * 4) : Math.min(1, q.t * 8);
          if (trav >= 1 && !q.hit) { q.hit = 1; q.hitT = q.t; impactAt(e, dark ? (o.rim || '#ff2a3a') : (o.c || '#7ad0ff'), size / 16, size >= 24); } },
        () => kill(m), (o.delay || 0) + k * (o.gap || .12)); } cnt('crescent'); }

  // ② 광선(허화·소각포·유니빔·X버너 …): 시전자→표적 원통, 흐르는 결 + 하얀 심지, 끝점 폭발
  const BEAM_FS = `uniform float uT, uA; uniform vec3 uC, uC2; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${NOISE}
    void main(){ float face = clamp(abs(dot(normalize(vN), normalize(vV))), 0., 1.); float n = fbm(vec2(vUv.x * 3., vUv.y * 10. - uT * 30.));
      float core = pow(face, 6.); float a = clamp((core * 1.1 + pow(face, 2.) * .28 + n * .18) * uA, 0., .95); vec3 col = mix(uC, uC2, core) * (1.15 + n * .5); gl_FragColor = vec4(col * a, a); } /* 11-15: 화면이 하얗게 타지 않게 심지는 날카롭게·번짐 축소 */`;
  const cylG = (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 24, 12, true); g.translate(0, .5, 0); g.rotateX(Math.PI / 2); return g; })();
  // back: 반동 분사(X 버너의 소프트 불꽃처럼 시전자 뒤쪽으로 넓게 퍼지는 불꽃 기둥) — 앞뒤로 동시에 터져 나감
  function beam(a, b, o = {}) { if (!ok() || !a || !b) return; const m = new THREE.Mesh(cylG, sm(BEAM_FS, { uC: { value: C(o.c || '#ff3030') }, uC2: { value: C(o.c2 || '#ffffff') } })); tag(m);
    const bk = o.back ? tag(new THREE.Mesh(cylG, sm(BEAM_FS, { uC: { value: C(o.backC || o.c || '#ff9a1a') }, uC2: { value: C('#fff6d0') } }))) : null; if (bk) bk.visible = false; const w = o.w || 3, dur = o.dur || .6, glow = glowSprite(o.c || '#ff3030', w * 5); tag(glow);
    add(dur + (o.charge || .25), q => { const s = chestOf(a).addScaledVector(fwdOfF(a), 3), e = chestOf(b); glow.position.copy(s); const ch = o.charge || .25;
        if (q.t < ch) { m.visible = false; m.position.copy(s); m.scale.set(.01, .01, .01); glow.material.opacity = q.t / ch; glow.scale.setScalar(w * 5 * (q.t / ch)); return; }
        m.visible = true; const L = s.distanceTo(e), u = (q.t - ch) / dur; m.position.copy(s); m.lookAt(e); const ww = w * (u < .15 ? u / .15 : u > .8 ? (1 - u) / .2 : 1) * (1 + Math.sin(tt * 40) * .06); m.scale.set(ww, ww, L);
        m.material.uniforms.uT.value = tt; m.material.uniforms.uA.value = 1; if (!q.hit) { q.hit = 1; impactAt(e, o.c || '#ff3030', w / 3, w >= 5); if (bk) try { const an = A(); if (an) { an.burst(s, C(o.c || '#ff9a1a'), w * 1.6, .5); an.ring(s, C('#ffffff'), w * 3, .35); an.speedLines(s, C(o.c || '#ff9a1a'), .6, 1); } } catch (e2) { } }
        if (bk) { const back = s.clone().sub(e).setY(0).normalize(), bl = (o.backL || 55) * (u < .15 ? u / .15 : 1), bw = ww * 1.8 * (1 + Math.sin(tt * 23) * .1); const bs = chestOf(a).addScaledVector(back, 2); bk.visible = true; bk.position.copy(bs); bk.lookAt(bs.clone().addScaledVector(back, 10).add(V(0, -1.5, 0))); bk.scale.set(bw, bw, bl); bk.material.uniforms.uT.value = tt * 1.3; bk.material.uniforms.uA.value = u > .8 ? (1 - u) / .2 * .8 : .8;
          const X3 = X(); if (X3 && X3.emit && Math.random() < .8) X3.emit(bs.clone().addScaledVector(back, rr(4, bl)), back.clone().multiplyScalar(rr(40, 120)).add(V(rr(-20, 20), rr(-10, 30), rr(-20, 20))), rr(.3, .6), rr(3, 6), 1, Math.random() < .5 ? '#ffb040' : '#fff0c0', -30); } else if (bk) bk.visible = false; if (Math.random() < .4) try { A() && A().star(e, C(o.c2 || '#ffffff'), w * 4, .12); } catch (e2) { } },
      () => { kill(m); kill(glow); if (bk) kill(bk); }, o.delay || 0); cnt('beam'); }

  // ③ 용(빙륜환·생생유전·염호·화뢰신·백룡): 굽이치는 마디 몸통 + 큰 머리 + 뿔, 시전자→표적으로 휘감아 돌진
  function dragon(a, b, o = {}) { if (!ok() || !a || !b) return; const g = new THREE.Group(); tag(g, true); const N = o.segs || 18, c = o.c || '#bfeaff', c2 = o.c2 || '#ffffff', sc = o.scale || 1;
    const segMat = sm(`uniform float uT, uA; uniform vec3 uC, uC2; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
      void main(){ float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.); float n = fbm(vP.xy * 3. + uT * 2.); float a = clamp((pow(1. - face, 1.5) * 1.3 + n * .4 + .15) * uA, 0., 1.); gl_FragColor = vec4(mix(uC, uC2, pow(face, 3.)) * 1.7 * a, a); }`, { uC: { value: C(c) }, uC2: { value: C(c2) } });
    const segs = []; for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), segMat); const r = (i === 0 ? 4.2 : 3.2 * (1 - i / N * .75)) * sc; m.scale.setScalar(r); m.layers.enable(BLOOM); g.add(m); segs.push(m); }
    const horns = [-1, 1].map(sd => { const h = new THREE.Mesh(new THREE.ConeGeometry(.6, 4, 8), segMat); h.layers.enable(BLOOM); g.add(h); return [h, sd]; }); const hg = glowSprite(c, 16 * sc); hg.layers.enable(BLOOM); g.add(hg);
    const s0 = chestOf(a), side = rr(-1, 1) > 0 ? 1 : -1, T = o.T || .9;
    add(T + .5, q => { const e = chestOf(b), u = Math.min(1, q.t / T), dir = e.clone().sub(s0), L = dir.length(); dir.normalize(); const lat = V(-dir.z, 0, dir.x).multiplyScalar(side);
        const path = k => { const uu = Math.max(0, u - k * .035); return s0.clone().addScaledVector(dir, L * uu).addScaledVector(lat, Math.sin(uu * Math.PI * 2.2) * 14 * sc * (1 - uu)).add(V(0, Math.sin(uu * Math.PI) * 14 * sc, 0)); };
        segs.forEach((m, i) => m.position.copy(path(i))); const head = segs[0].position, nxt = segs[1].position, hd = head.clone().sub(nxt).normalize();
        horns.forEach(([h, sd]) => { h.position.copy(head).addScaledVector(hd, 1.2 * sc).add(V(0, 3 * sc, 0)).addScaledVector(V(-hd.z, 0, hd.x), sd * 2 * sc); h.lookAt(h.position.clone().add(hd.clone().add(V(0, .8, 0)))); h.rotateX(Math.PI / 2); h.scale.setScalar(sc); });
        hg.position.copy(head); segMat.uniforms.uT.value = tt; segMat.uniforms.uA.value = u >= 1 ? Math.max(0, 1 - (q.t - T) * 2.5) : Math.min(1, q.t * 5);
        const X3 = X(); if (X3 && X3.emit && Math.random() < .6) X3.emit(head.clone(), V(rr(-20, 20), rr(-10, 20), rr(-20, 20)), .5, rr(1, 2), 5, Math.random() < .5 ? c : c2, 0);
        if (u >= 1 && !q.hit) { q.hit = 1; impactAt(e, c, 1.6 * sc, true); try { A() && A().burst(e, C(c), 10 * sc, .7); } catch (e2) { } } },
      () => kill(g), o.delay || 0); cnt('dragon'); }

  // ④ 꽃잎 칼날 떼(센본자쿠라·반딧불 화): 수백 장의 작은 칼날이 시전자 주위를 소용돌이치다 표적으로 쏟아짐
  function petals(a, b, o = {}) { if (!ok() || !a || !b) return; const N = o.n || 220, c = C(o.c || '#ffb0d0'); const geo = new THREE.PlaneGeometry(.9, .35), mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const im = new THREE.InstancedMesh(geo, mat, N); tag(im); const seeds = Array.from({ length: N }, () => ({ a: rr(0, 6.28), r: rr(4, 14), h: rr(0, 22), sp: rr(3, 6), d: rr(0, .35), rot: V(rr(0, 6), rr(0, 6), rr(0, 6)) })); const o3 = new THREE.Object3D(), T = o.T || 1.6;
    add(T + .4, q => { const s0 = a.pos, e = chestOf(b); seeds.forEach((s, i) => { const u = Math.min(1, Math.max(0, (q.t - .5 - s.d) / (T - .5))); const ang = s.a + tt * s.sp; const orb = V(s0.x + Math.cos(ang) * s.r, s0.y + s.h, s0.z + Math.sin(ang) * s.r);
          const tgt = e.clone().add(V(Math.cos(ang * 2) * 3, Math.sin(ang * 3) * 3, Math.sin(ang * 2) * 3)); o3.position.copy(orb).lerp(tgt, u * u); o3.rotation.set(s.rot.x + tt * 6, s.rot.y + tt * 5, s.rot.z); o3.scale.setScalar(1.6); o3.updateMatrix(); im.setMatrixAt(i, o3.matrix); });
        im.instanceMatrix.needsUpdate = true; mat.opacity = q.t > T ? Math.max(0, 1 - (q.t - T) * 2.5) : 1; if (q.t > .9 && !q.hit) { q.hit = 1; impactAt(e, o.c || '#ffb0d0', 1.2, false); } },
      () => kill(im), o.delay || 0); cnt('petals'); }

  // ⑤ 번개 돌진(벽력일섬): 지그재그 번개 자국 + 섬광 + 잔상줄기
  function lightningDash(a, b, o = {}) { if (!ok() || !a || !b) return; const c = o.c || '#ffe040'; add(.6, q => { if (q.done) return; q.done = 1; const s = chestOf(a), e = chestOf(b), X3 = X();
      if (X3 && X3.bolt) for (let i = 0; i < 4; i++) X3.bolt(s.clone().add(V(rr(-2, 2), rr(-3, 3), rr(-2, 2))), e.clone().add(V(rr(-3, 3), rr(-3, 3), rr(-3, 3))), i ? c : '#ffffff', rr(.25, .4), i ? 3 : 6, 3, .3);
      if (X3 && X3.streak) for (let i = 0; i < 16; i++) X3.streak(s.clone().lerp(e, Math.random()), e.clone().sub(s).normalize().multiplyScalar(rr(300, 500)), rr(.15, .3), rr(.4, .8), rr(1.5, 3), i & 1 ? '#ffffff' : c);
      impactAt(e, c, 1.3, true); try { A() && A().impactFrame(false); } catch (e2) { } }, null, o.delay || .25); cnt('ldash'); }

  // ⑥ 흑섬: 타격 순간 검은 번개(테두리 붉은 섬광)가 사방으로 + 공간 일그러짐
  function blackFlash(a, b, o = {}) { if (!ok() || !b) return; add(.5, q => { if (q.done) return; q.done = 1; const p = chestOf(b), X3 = X();
      if (X3 && X3.bolt) for (let i = 0; i < 10; i++) { const e = p.clone().add(V(rr(-22, 22), rr(-16, 20), rr(-22, 22))); X3.bolt(p.clone(), e, i % 3 ? '#100008' : '#ff2030', rr(.3, .5), i % 3 ? 5 : 2.5, 3, .32); }
      try { const an = A(); if (an) { an.star(p, C('#ff2030'), 30, .3); an.ring(p, C('#ff2030'), 20, .45); an.speedLines(p, C('#ff2030'), .5, 1); an.impactFrame(true); } } catch (e) { } if (typeof flashScreen === 'function') flashScreen(.35, '255,40,50'); try { S() && S().boom(p, 1.2, false); } catch (e) { } }, null, o.delay || .45); cnt('blackFlash'); }

  // ⑦ 구체 탄(허식·자·혁·빅뱅 액셀): 소용돌이 구체가 날아가 큰 돔 폭발. merge=true 면 빨강·파랑이 합쳐져 보라(자)
  const ORB_FS = `uniform float uT, uA; uniform vec3 uC, uC2; varying vec3 vN; varying vec3 vV; varying vec3 vP; ${NOISE}
    void main(){ vec3 p = normalize(vP); float sw = atan(p.z, p.x) * 3. + acos(clamp(p.y,-1.,1.)) * 5. - uT * 18.; float lines = pow(abs(sin(sw)), 10.); float face = clamp(dot(normalize(vN), normalize(vV)), 0., 1.), rim = pow(1. - face, 2.);
      vec3 col = mix(uC, uC2, pow(face, 3.)) * (1.4 + lines * 1.6) + uC * rim * 2.; gl_FragColor = vec4(col * uA, clamp((.55 + rim + lines * .5) * uA, 0., 1.)); }`;
  function orbShot(a, b, o = {}) { if (!ok() || !a || !b) return; const c = o.c || '#a040ff', s = o.size || 1, mk = (cc) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), sm(ORB_FS, { uC: { value: C(cc) }, uC2: { value: C('#ffffff') } })); tag(m); return m; };
    const m = mk(c), gl = glowSprite(c, 14 * s); tag(gl); const sides = o.merge ? [mk('#ff2030'), mk('#2a6aff')] : []; const sp = o.speed || 220, chg = o.merge ? .7 : .35;
    add(4, q => { const fw = fwdOfF(a), s0 = chestOf(a).addScaledVector(fw, 6); let p;
        if (q.t < chg) { const k = q.t / chg; if (o.merge) { sides[0].position.copy(s0).add(V(-fw.z, 0, fw.x).multiplyScalar(8 * (1 - k))); sides[1].position.copy(s0).add(V(fw.z, 0, -fw.x).multiplyScalar(8 * (1 - k))); sides.forEach(x => { x.scale.setScalar(2.2 * s); x.material.uniforms.uT.value = tt; }); }
          m.scale.setScalar(.1 + 3.4 * s * k); p = s0; q.from = s0.clone(); }
        else { sides.forEach(x => x.visible = false); const e = chestOf(b), L = q.from.distanceTo(e), u = Math.min(1, (q.t - chg) * sp / Math.max(1, L)); p = q.from.clone().lerp(e, u); m.scale.setScalar(3.4 * s * (1 + Math.sin(tt * 30) * .05));
          if (u >= 1 && !q.hit) { q.hit = 1; q.t = 4 - .05; try { const an = A(); if (an) { an.burst(e, C(c), 14 * s * (o.merge ? 2.4 : 1), .9); an.ring(V(e.x, 0, e.z), C(c), 40 * s * (o.merge ? 2 : 1), .7, true); an.speedLines(e, C(c), .6, 1); if (o.merge) an.impactFrame(true); } } catch (e2) { } if (typeof flashScreen === 'function' && o.merge) flashScreen(.6, '200,120,255'); try { S() && S().boom(e, 2 * s, !!o.merge); } catch (e2) { } } }
        m.position.copy(p); gl.position.copy(p); m.material.uniforms.uT.value = tt; },
      () => { kill(m); kill(gl); sides.forEach(kill); }, o.delay || 0); cnt('orb'); }

  // ⑧ 창(蒼) 흡인: 표적 주위 공간이 푸르게 소용돌이치며 수축
  const SPI_FS = `uniform float uT, uA; uniform vec3 uC; varying vec2 vUv; void main(){ vec2 c = vUv - .5; float r = length(c) * 2.; if (r > 1.) discard; float ang = atan(c.y, c.x); float arms = pow(abs(sin(ang * 3. + log(r + .02) * 7. + uT * 14.)), 6.); float a = clamp(arms * smoothstep(1., .4, r) * uA * 1.4, 0., 1.); gl_FragColor = vec4(mix(uC, vec3(1.), arms * .5) * 2. * a, a); }`;
  function implode(b, o = {}) { if (!ok() || !b) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), sm(SPI_FS, { uC: { value: C(o.c || '#3a7aff') } })); tag(m);
    add(1.1, q => { const p = chestOf(b), u = q.t / 1.1; m.position.copy(p); m.quaternion.copy(camera.quaternion); m.scale.setScalar(60 * (1 - u * .9)); m.material.uniforms.uT.value = tt; m.material.uniforms.uA.value = Math.min(1, q.t * 5) * (1 - u); if (u > .85 && !q.hit) { q.hit = 1; impactAt(p, o.c || '#3a7aff', 1.4, true); } }, () => kill(m), o.delay || .3); cnt('implode'); }

  // ⑨ 거대 충격파(진지한 펀치·헐크 스매시·영압 폭발): 바닥 링 여러 겹 + 공중 링 + 흙먼지 + 화면 집중선. punch=true 면 시전자 앞 거대 풍압 원뿔
  function shockwave(a, b, o = {}) { if (!ok() || !a) return; const c = o.c || '#ffffff', R = o.R || 60; add(1.2, q => { if (q.done) return; q.done = 1; const p = o.atTarget && b ? chestOf(b) : chestOf(a).addScaledVector(fwdOfF(a), 6); const an = A();
      try { if (an) { an.ring(V(p.x, 0, p.z), C(c), R, .8, true); an.ring(V(p.x, 0, p.z), C('#ffffff'), R * .6, .55, true); an.ring(p, C(c), R * .5, .5); an.star(p, C(c), R * .5, .3); an.speedLines(p, C(c), .7, 1.2); if (R >= 80) an.impactFrame(true); for (let i = 0; i < 6; i++) an.smoke(V(p.x + rr(-R, R) * .4, rr(0, 8), p.z + rr(-R, R) * .4), rr(6, 12), rr(1.2, 2)); } } catch (e) { }
      if (o.punch && b) beam(a, b, { c: '#e8f4ff', c2: '#ffffff', w: R * .18, dur: .45, charge: .02 });
      if (typeof flashScreen === 'function' && R >= 80) flashScreen(.5, '255,255,255'); try { S() && S().boom(p, R / 40, R >= 80); } catch (e) { } if (typeof shake !== 'undefined') shake = Math.max(shake, R / 8); }, null, o.delay || .25); cnt('shock'); }

  // ⑩ 화염 주먹·기둥(화권·염제·디아블 잠브·레드 호크): 툰 화염 덩어리가 줄지어 표적까지 분출
  function fireStream(a, b, o = {}) { if (!ok() || !a || !b) return; const c = o.c || '#ff7a1a', n = o.n || 9, s = o.size || 1; for (let i = 0; i < n; i++) add(.1, q => { if (q.done) return; q.done = 1; const s0 = chestOf(a), e = chestOf(b), p = s0.clone().lerp(e, (i + 1) / n);
      try { const an = A(); if (an) an.burst(p.add(V(rr(-1, 1), rr(-1, 1), rr(-1, 1))), C(c), (5 + i * .9) * s, .5 + i * .03); } catch (e2) { } if (i === n - 1) impactAt(e, c, 1.5 * s, true); }, null, (o.delay || .2) + i * .035); cnt('fire'); }

  // ⑪ 들러붙는 불꽃(네즈코 폭혈·환술 지옥도): 표적 몸에 붙어 일렁이는 불꽃(색 지정)
  const FL_FS = `uniform float uT, uA, uS; uniform vec3 uC, uC2; varying vec2 vUv; ${NOISE}
    void main(){ vec2 p = vUv; float n = fbm(vec2(p.x * 4. + uS, p.y * 3. - uT * 2.8)); float sway = sin(p.y * 6. - uT * 5. + uS) * .08 * p.y; float w = (1. - p.y) * .42 + .04; float shape = w - abs(p.x - .5 - sway) + (n - .5) * .22 * (.4 + p.y);
      if (shape < 0.) discard; float core = smoothstep(0., .14, shape); gl_FragColor = vec4(mix(uC, uC2, core) * 1.6, clamp(uA * (.5 + core * .5) * smoothstep(1., .7, p.y), 0., 1.)); }`;
  function flamesOn(b, o = {}) { if (!ok() || !b) return; const fl = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.6), sm(FL_FS, { uS: { value: rr(0, 40) }, uC: { value: C(o.c || '#ff3a7a') }, uC2: { value: C(o.c2 || '#ffd0e0') } })); tag(m); fl.push({ m, off: V(rr(-4, 4), rr(0, 14), rr(-4, 4)), s: rr(5, 9) }); }
    add(o.dur || 2.5, q => { const a2 = Math.min(1, q.t * 4) * Math.min(1, ((o.dur || 2.5) - q.t) * 2); fl.forEach((f, i) => { f.m.position.set(b.pos.x + f.off.x, b.pos.y + f.off.y * (b.scale || 1), b.pos.z + f.off.z); f.m.quaternion.copy(camera.quaternion); f.m.scale.set(f.s, f.s * (1 + .15 * Math.sin(tt * 9 + i)), 1); f.m.material.uniforms.uT.value = tt + i; f.m.material.uniforms.uA.value = a2; }); }, () => fl.forEach(f => kill(f.m)), o.delay || .35); cnt('flames'); }

  // ⑫ 연속 참격(해·팔·삼도류·난도질·인류 최강): 표적 주변에 수많은 참격 궤적이 연달아 그어짐
  function slashStorm(a, b, o = {}) { if (!ok() || !b) return; const n = o.n || 10, c = o.c || '#ffffff'; for (let i = 0; i < n; i++) add(.05, q => { if (q.done) return; q.done = 1; const p = chestOf(b).add(V(rr(-6, 6), rr(-6, 8), rr(-6, 6)));
      try { const an = A(); if (an) { an.slash(p, V(rr(-1, 1), 0, rr(-1, 1)), C(c), rr(10, 18) * (o.size || 1), .28, 1.5); if (i % 3 === 0) an.star(p, C(c), 10, .15); } } catch (e) { } try { if (i % 2 === 0) S() && S().hit(p, 1, 'blade'); } catch (e) { } }, null, (o.delay || .25) + i * (o.gap || .055)); cnt('slashes'); }

  // ⑬ 고무 팔(고무고무 총)·연타(개틀링·연속 보통 펀치): 늘어나는 팔(원통) / 수많은 주먹 잔상
  function rubberArm(a, b, o = {}) { if (!ok() || !a || !b) return; const n = o.barrage ? 14 : 1; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshToonMaterial({ color: o.c || '#f2c8a0' })); m.geometry.translate(0, .5, 0); m.geometry.rotateX(Math.PI / 2); m.frustumCulled = false; scene3.add(m);
      const fist = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshToonMaterial({ color: o.fist || o.c || '#f2c8a0' })); fist.frustumCulled = false; scene3.add(fist); const off = V(rr(-5, 5), rr(-4, 5), rr(-5, 5)), big = o.big ? 3.2 : 1;
      add(.32, q => { const s0 = chestOf(a).addScaledVector(fwdOfF(a), 2), e = chestOf(b).add(o.barrage ? off : V(0, 0, 0)), u = q.t / .32, ext = u < .5 ? u * 2 : (1 - u) * 2, p = s0.clone().lerp(e, ext); m.position.copy(s0); m.lookAt(p); m.scale.set(.9 * big, .9 * big, Math.max(.1, s0.distanceTo(p))); fist.position.copy(p); fist.scale.setScalar(2.2 * big * (o.barrage ? .8 : 1));
          if (ext > .95 && !q.hit) { q.hit = 1; impactAt(e, o.fireFist ? '#ff6a10' : '#ffffff', big * (o.barrage ? .5 : 1), !o.barrage); if (o.fireFist) try { A() && A().burst(e, C('#ff6a10'), 8 * big, .6); } catch (e2) { } } },
        () => { kill(m); kill(fist); }, (o.delay || .2) + i * .045); } cnt('rubber'); }

  // ⑭ 얼음 기둥(월백·천상옥좌·제로 지점 돌파): 바닥 흰 원 → 하늘로 솟는 얼음 결정 기둥이 표적을 가둠 → 산산조각
  function iceColumn(b, o = {}) { if (!ok() || !b) return; const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 1, 6, 1, true), sm(`uniform float uT, uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV; ${NOISE}
      void main(){ float face = clamp(abs(dot(normalize(vN), normalize(vV))), 0., 1.); float n = fbm(vUv * vec2(6., 14.)); float a = clamp((pow(1. - face, 1.5) * 1.2 + n * .35 + .15) * uA, 0., 1.); gl_FragColor = vec4(mix(vec3(.75, .92, 1.), vec3(1.), n) * 1.5 * a, a); }`, {})); tag(m);
    add(1.4, q => { const u = q.t / 1.4, h = Math.min(1, q.t * 4) * 90; m.position.set(b.pos.x, h / 2, b.pos.z); m.scale.set(8 * (b.scale || 1), Math.max(.1, h), 8 * (b.scale || 1)); m.material.uniforms.uA.value = u < .8 ? 1 : (1 - u) / .2;
        if (q.t > .05 && !q.ring) { q.ring = 1; try { A() && A().ring(V(b.pos.x, 0, b.pos.z), C('#e8faff'), 16, .5, true); } catch (e) { } }
        if (u > .8 && !q.hit) { q.hit = 1; const p = chestOf(b), X3 = X(); if (X3 && X3.streak) for (let i = 0; i < 30; i++) X3.streak(p.clone().add(V(rr(-4, 4), rr(-8, 8), rr(-4, 4))), V(rr(-1, 1), rr(-.3, 1), rr(-1, 1)).normalize().multiplyScalar(rr(120, 260)), rr(.3, .6), .04, rr(2, 3.5), i & 1 ? '#ffffff' : '#bfeaff', 200); impactAt(p, '#cfefff', 1.4, true); } },
      () => kill(m), o.delay || .3); cnt('ice'); }

  // ── 기술 ↔ 레시피 연결표(세계관별, 위에서부터 먼저 맞는 것) ──
  const T = (re, fn) => ({ re, fn });
  const MAP = {
    bleach: [
      T(/흑 월아천충|월아천충 연사|월아천충 · 연속/, (a, b, tx) => crescent(a, b, { dark: true, c: '#0a0006', rim: '#ff2a3a', size: 24, n: /연사|연속/.test(tx) ? 3 : 1 })),
      T(/무월/, (a, b) => crescent(a, b, { dark: true, c: '#000000', rim: '#6a0010', size: 70, speed: 240 })),
      T(/월아십자충/, (a, b) => crescent(a, b, { c: '#5ab8ff', rim: '#ffffff', size: 24, n: 2, cross: true, gap: 0 })),
      T(/월아천충/, (a, b) => crescent(a, b, { c: '#5ab8ff', rim: '#ffffff', size: 22 })),
      T(/허화|허섬/, (a, b, tx) => beam(a, b, { c: '#ff1a2a', c2: '#ffd0d0', w: /세로|허섬/.test(tx) ? 6 : 4, dur: .7, charge: .45 })),
      T(/센본자쿠라|천본앵|칼날 비/, (a, b) => petals(a, b, { c: '#ff9ac8', n: 260 })),
      T(/빙륜환|빙룡|대홍련/, (a, b, tx) => dragon(a, b, { c: '#9fdcff', c2: '#ffffff', scale: /대홍련/.test(tx) ? 1.6 : 1.3 })),
      T(/천상옥좌|월백|군조 빙결|육의 빙결|빙천 백화장|천년빙뢰|백도/, (a, b) => iceColumn(b)),
      T(/백뢰/, (a, b) => beam(a, b, { c: '#9fd0ff', c2: '#ffffff', w: 1.2, dur: .35, charge: .15 })),
      T(/검팔 일격|영압 폭발|영압 해방|해골 영압|안대 해제/, (a, b) => shockwave(a, b, { c: '#ffe060', R: 70 })),
      T(/난도질|노자라시|양손 내려베기|순보 연격|천쇄참월/, (a, b) => slashStorm(a, b, { c: '#fff2a0', n: 9 })),
    ],
    kimetsu: [
      T(/생생유전/, (a, b) => dragon(a, b, { c: '#3aa0ff', c2: '#e8f6ff', scale: 1.3 })),
      T(/물의 호흡|수면 베기|타격의 물결|마른 비|소용돌이|물방울|유류무|용소/, (a, b) => crescent(a, b, { c: '#3aa0ff', rim: '#ffffff', size: 18, n: 2, gap: .08 })),
      T(/염호/, (a, b) => dragon(a, b, { c: '#ff6a10', c2: '#fff2a0', scale: 1.5 })),
      T(/히노카미|원무|일훈|벽라의 하늘|휘휘은광|염무|물레/, (a, b) => crescent(a, b, { c: '#ff7a1a', rim: '#fff2a0', size: 22, n: 2, gap: .1 })),
      T(/부지화|성염|연옥|오르는 염천|기염만상|염파|불꽃 연격/, (a, b) => crescent(a, b, { c: '#ff5a10', rim: '#ffe080', size: 26 })),
      T(/화뢰신/, (a, b) => dragon(a, b, { c: '#ffd020', c2: '#ffffff', scale: 1.4, T: .55 })),
      T(/벽력일섬|뇌광|번개|전격 발도/, (a, b) => lightningDash(a, b, { c: '#ffe040' })),
      T(/폭혈|귀화/, (a, b) => flamesOn(b, { c: '#ff2a6a', c2: '#ffc0d8' })),
      T(/짐승의 호흡|난항 베기|미친 베기|찢어 베기/, (a, b) => slashStorm(a, b, { c: '#cfe0ff', n: 8 })),
    ],
    onepiece: [
      T(/레드 호크/, (a, b) => rubberArm(a, b, { fireFist: true, fist: '#ff5a10' })),
      T(/개틀링|제트 개틀링/, (a, b) => rubberArm(a, b, { barrage: true })),
      T(/거인의 총|엘레펀트 건|킹콩 건/, (a, b) => rubberArm(a, b, { big: true })),
      T(/고무고무 총|바주카|로켓|채찍|도끼|제트 스탬프/, (a, b) => rubberArm(a, b, {})),
      T(/기어 세컨드|기어 5/, (a, b, tx) => shockwave(a, b, { c: /5/.test(tx) ? '#ffffff' : '#ff9ab0', R: 40 })),
      T(/360 파운드 포|1080 파운드 포|매의 파도|흑승/, (a, b, tx) => crescent(a, b, { c: '#9fffc0', rim: '#ffffff', size: 24, n: /1080/.test(tx) ? 3 : 2 })),
      T(/용 말기/, (a, b) => { shockwave(a, b, { c: '#c8ffd8', R: 50, atTarget: true }); implode(b, { c: '#9fffc0' }); }),
      T(/삼도류|귀참|우시바리|호랑이 사냥|사자 노래|라쇼몽|일세계|삼천세계|아수라|구산팔해|번뇌봉/, (a, b) => slashStorm(a, b, { c: '#c8ffd8', n: 12 })),
      T(/디아블 잠브|이프릿 잠브|플람베|콜리어/, (a, b) => fireStream(a, b, { c: '#ff6a10', n: 6, size: .8 })),
      T(/반딧불 화/, (a, b) => petals(a, b, { c: '#ffb040', n: 160 })),
      T(/십자화/, (a, b) => crescent(a, b, { c: '#ff7a1a', rim: '#fff2a0', size: 22, n: 2, cross: true, gap: 0 })),
      T(/화권|염제|신화 불지옥|화주|화창/, (a, b, tx) => fireStream(a, b, { c: '#ff6a10', n: 12, size: /염제|신화/.test(tx) ? 1.8 : 1.3 })),
      T(/감마나이프|라디오 나이프/, (a, b) => beam(a, b, { c: '#7ab0ff', c2: '#ffffff', w: 1.6, dur: .4, charge: .15 })),
    ],
    opm: [
      T(/진지한 펀치|구름 날리기/, (a, b) => shockwave(a, b, { c: '#ffffff', R: 120, punch: true })),
      T(/진지한 박수|진지한 재채기|진지한 테이블|진지한 점프/, (a, b) => shockwave(a, b, { c: '#ffffff', R: 85 })),
      T(/연속 보통 펀치|진지한 연속/, (a, b) => rubberArm(a, b, { barrage: true, c: '#f2d0b0', fist: '#d03030' })),
      T(/소각|초고열/, (a, b, tx) => beam(a, b, { c: '#ff7a10', c2: '#fff0c0', w: /최대|마신|나선/.test(tx) ? 7 : 4, dur: .7, charge: .35, back: /최대|마신/.test(tx), backC: '#ffb060', backL: 35 })),
      T(/감마|살기 파동/, (a, b) => beam(a, b, { c: '#7a5aff', c2: '#e0d8ff', w: 6, dur: .7, charge: .4 })),
      T(/염동|초능력/, (a, b, tx) => shockwave(a, b, { c: '#60ff9a', R: /대압살|운석/.test(tx) ? 90 : 50, atTarget: true })),
      T(/유수암쇄권|암쇄|흐르는|선회 수류|물결 장풍/, (a, b) => crescent(a, b, { c: '#cfeaff', rim: '#ffffff', size: 12, n: 4, gap: .06, speed: 420 })),
    ],
    aot: [
      T(/뇌창/, (a, b) => { beam(a, b, { c: '#ffd060', c2: '#ffffff', w: .8, dur: .3, charge: .1 }); shockwave(a, b, { c: '#ffb040', R: 30, atTarget: true, delay: .55 }); }),
      T(/열풍 증기|열폭풍|증기 장벽|증기 원거리|거인화 폭발/, (a, b) => shockwave(a, b, { c: '#fff0d8', R: 90 })),
      T(/회전 베기|난도|인류 최강|목덜미|사지 절단|쌍검 연속|칼날 교체 난도/, (a, b) => slashStorm(a, b, { c: '#e8eef8', n: 10 })),
      T(/경질화 주먹|경질화 펀치|경질화 킥|헐크/, (a, b) => shockwave(a, b, { c: '#d8e8ff', R: 45, atTarget: true })),
    ],
    jjk: [
      T(/흑섬/, (a, b) => blackFlash(a, b)),
      T(/허식 · 자/, (a, b, tx) => orbShot(a, b, { c: '#a040ff', size: /200/.test(tx) ? 1.8 : 1.3, merge: true, speed: 260 })),
      T(/혁/, (a, b) => orbShot(a, b, { c: '#ff2030', size: .9, speed: 360 })),
      T(/창/, (a, b) => implode(b, { c: '#2a6aff' })),
      T(/세계를 가르는/, (a, b) => crescent(a, b, { c: '#ffffff', rim: '#ffd0d0', size: 80, speed: 500, roll: Math.PI / 2 })),
      T(/^해[!\s]*$|^팔[!\s]*$|해\(解\)|해 ·|팔\(捌\)|팔 ·|해·팔/, (a, b, tx) => slashStorm(a, b, { c: /팔/.test(tx) ? '#ffd0d0' : '#ffffff', n: /연속|난도|원거리/.test(tx) ? 14 : 8, size: /거대/.test(tx) ? 2 : 1 })),
      T(/불꽃 화살|개\(/, (a, b) => beam(a, b, { c: '#ff7a10', c2: '#fff0c0', w: 3, dur: .6, charge: .4 })),
      T(/공명|추\(簪\)|추 ·|못 비/, (a, b) => { shockwave(a, b, { c: '#7ab8ff', R: 26, atTarget: true, delay: .4 }); }),
      T(/칠할삼분/, (a, b) => slashStorm(a, b, { c: '#ffd040', n: 2, size: 1.6 })),
      T(/다이버전트/, (a, b) => shockwave(a, b, { c: '#3a6aff', R: 24, atTarget: true, delay: .45 })),
    ],
    marvel: [
      T(/유니빔/, (a, b) => beam(a, b, { c: '#9ff0ff', c2: '#ffffff', w: 5, dur: .8, charge: .4 })),
      T(/리펄서|플래저/, (a, b) => beam(a, b, { c: '#6ae0ff', c2: '#ffffff', w: 2, dur: .35, charge: .15 })),
      T(/솔라 플레어|마인드 스톤/, (a, b) => beam(a, b, { c: '#ffd040', c2: '#fffbe0', w: 4, dur: .7, charge: .35 })),
      T(/천둥 소환|뇌전 광역|번개 연사|벼락/, (a, b) => { if (window.NARUTO_FX && NARUTO_FX.kirin) NARUTO_FX.kirin(b); }),
      T(/헐크 스매시|그라운드 펌프|점프 스매시|클래핑/, (a, b) => shockwave(a, b, { c: '#8aff6a', R: 70, atTarget: true })),
      T(/웹/, (a, b) => beam(a, b, { c: '#ffffff', c2: '#ffffff', w: .5, dur: .4, charge: .05 })),
    ],
    csm: [
      T(/탕/, (a, b) => beam(a, b, { c: '#ffd060', c2: '#ffffff', w: .7, dur: .18, charge: .1 })),
      T(/압살/, (a, b) => shockwave(a, b, { c: '#ff3a3a', R: 70, atTarget: true })),
      T(/어뢰|대폭발|폭탄 투척/, (a, b, tx) => shockwave(a, b, { c: '#ff9a2a', R: /대폭발/.test(tx) ? 80 : 45, atTarget: true, delay: .6 })),
      T(/콘!/, (a, b) => { try { A() && A().burst(chestOf(b), C('#ffe0b0'), 22, .9); } catch (e) { } }),
      T(/난도질|전력 질주|최강의 데빌 헌터/, (a, b) => slashStorm(a, b, { c: '#ffb080', n: 10 })),
    ],
    reborn: [
      T(/X 버너/, (a, b) => beam(a, b, { c: '#ff8a10', c2: '#fff6d0', w: 9, dur: 1.1, charge: .6, back: true, backC: '#ffc060', backL: 60 })), /* 앞: 하드 불꽃 광선 / 뒤: 소프트 불꽃 반동 분사 */
      T(/빅뱅 액셀|버닝 액셀/, (a, b) => orbShot(a, b, { c: '#ff9a1a', size: 1.1, speed: 320 })),
      T(/제로 지점 돌파/, (a, b) => iceColumn(b)),
      T(/플레임 애로우/, (a, b) => beam(a, b, { c: '#ff3a3a', c2: '#ffd0c0', w: 5, dur: .7, charge: .45, back: true, backC: '#ff7a5a', backL: 30 })),
      T(/시구레|아메/, (a, b) => crescent(a, b, { c: '#4ab0ff', rim: '#ffffff', size: 20, n: 2 })),
      T(/백룡/, (a, b) => dragon(a, b, { c: '#ffffff', c2: '#e8e0ff', scale: 1.6 })),
      T(/구름 고슴도치|물어 죽인다/, (a, b) => shockwave(a, b, { c: '#a060ff', R: 40, atTarget: true })),
      T(/지옥도|환술/, (a, b) => flamesOn(b, { c: '#6a40d0', c2: '#e0d0ff' })),
    ],
  };
  SG.map = MAP;
  if (typeof callout === 'function') { const _c = callout; callout = function (f, text, ult) { const r = _c.apply(this, arguments);
    try { if (!ok() || !f || !f.ch || !f.pos) return r; const L = MAP[f.ch.world]; if (!L) return r; const tx = String(text || ''), b = enemyOf(f); if (!b) return r;
      const now = performance.now(); if (f.__sigT && now - f.__sigT < 250 && f.__sigTx === tx) return r; f.__sigT = now; f.__sigTx = tx; // 같은 문구 중복 호출 방지
      for (const m of L) if (m.re.test(tx)) { m.fn(f, b, tx); break; } } catch (e) { console.warn('[sig]', e); } return r; }; }
  const _up = update; update = function (dt) { const r = _up.apply(this, arguments);
    try { const d = Math.min(dt, .05); tt += d; for (let i = live.length - 1; i >= 0; i--) { const o = live[i]; o.t += d; if (o.t < 0) continue; try { o.up && o.up(o, d); } catch (e) { } if (o.t >= o.dur) { try { o.end && o.end(); } catch (e) { } live.splice(i, 1); } } } catch (e) { } return r; };
  Object.assign(SG, { crescent, beam, dragon, petals, lightningDash, blackFlash, orbShot, implode, shockwave, fireStream, flamesOn, slashStorm, rubberArm, iceColumn });
})();
