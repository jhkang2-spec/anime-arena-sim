// 실제 사람 동작(모션 캡처) 인물 — 소유자 승인(11-05 "내려받아 적용"). 공개 무료 자료(CC0, assets/cc0/LICENSE.txt):
//  - Quaternius Universal Animation Library: 마네킹(보통 남자 몸) + 동작 46개 (ual1.glb)
//  - Quaternius Universal Base Characters: 남자(근육형)·여자 몸 (ubc_male / ubc_female.gltf) — 같은 뼈 65개라 같은 동작을 그대로 씀
// 소유자 요청(11-05): 남녀 체형 분리 → 원작 의상·외형으로 한눈에 구분.
//  - 몸: 여자(사쿠라·루키아·타츠마키·네즈코·시노부·미츠리) / 근육형 남자(가이·조로·켄파치·히메지마·우즈이 등) / 보통 남자. 키·덩치는 원작 배율(bodyScale·bulk).
//  - 옷: 뼈 부위·몸 위치별 색칠(윗옷·앞섶·소매·허리띠·바지·각반·신·장갑) + 하오리·망토·긴 옷자락(무늬: 체크·삼각·불꽃·반반·구름·물결 등).
//  - 머리: 기존 인물 머리(머리 모양·머리색·눈·가면·머리띠·밀짚모자·멧돼지 탈)를 Head 뼈에, 검은 손 뼈에.
//  - 위치·방향은 기존 인물(f.model.root)을 따르고, 기존 모형은 그리기 층만 빼서 숨긴다(기술 이펙트 rasen·chid·glow·fxg 는 그대로).
//  - 동작: motions2.js 의 상황 분류(f.mo.d.cat) → 클립 교차 페이드. 불러오기 실패 시 기존 모형 그대로(자동 대체). setMocap(false) 로 끔.
// 60fps 원칙: 인물마다 몸 1벌(출전 최대 5 + 교대 퇴장 중), 프레임마다 새 객체를 만들지 않는다.
(function () {
  if (typeof CH === 'undefined' || typeof scene3 === 'undefined' || typeof camUpdate !== 'function') return;
  const KEY = 'arenaMocap', HIDE = 5, FX_KEYS = ['rasen', 'chid', 'glow', 'fxg'];
  let on = true; try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { }
  const MC = window.MOCAP = { useMpfb: (() => { try { return localStorage.getItem('arenaMpfb') !== '0'; } catch (e) { return false; } })(), on, ready: false, failed: null, rigs: new Map(), clipN: 0, ms: 0, lineup: null };
  const TPL = {}, CLIPS = {}; // TPL.n 보통 남자(마네킹) · TPL.m 근육형 남자 · TPL.f 여자
  const TARGET_H = 33; // 기존 모형 키(모형 단위)
  const mA = new THREE.Matrix4(), mB = new THREE.Matrix4(), vA = new THREE.Vector3(), qA = new THREE.Quaternion(), sA = new THREE.Vector3();

  const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(Error('불러오기 실패 ' + src)); document.head.appendChild(s); });
  const BASE = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const NEED = ['root', 'pelvis', 'spine_03', 'neck_01', 'Head', 'hand_r', 'hand_l', 'index_01_r', 'pinky_01_r', 'middle_01_r', 'middle_02_r', 'foot_l', 'ball_l', 'thigh_l', 'calf_l'];
  // 동작 호환 검사: 클립 트랙이 가리키는 뼈가 몸에 있는지
  const clipCheck = (tp) => { const bad = {}; Object.values(CLIPS).forEach(c => { const m = c.tracks.filter(tr => !tp.bones.has(tr.name.split('.')[0])).length; if (m) bad[c.name] = m; }); return bad; };
  function tpl(scene) { // 몸 메쉬 1개만 남김(눈·눈썹·머리카락 메쉬 제외 — 머리는 원작 인물 머리를 씀)
    const keep = o => /Main|Superhero|Joint/i.test(o.material && o.material.name || ''); // 몸·관절만(눈·눈썹·머리카락 재질 MI_Eyes·MI_Hair 는 뺌)
    const drop = []; scene.traverse(o => { if (o.isMesh && !keep(o)) drop.push(o); }); drop.forEach(o => o.parent.remove(o));
    scene.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(scene), names = new Set(); scene.traverse(o => { if (o.isBone) names.add(o.name); });
    const miss = NEED.filter(b => !names.has(b)), wp = n => { let o = null; scene.traverse(x => { if (x.isBone && x.name === n) o = x; }); return o ? new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) : null; };
    const fa = wp('foot_l'), fb = wp('ball_l'), fwd = fa && fb ? fb.sub(fa) : new THREE.Vector3(0, 0, 1); const yaw = Math.atan2(fwd.x, fwd.z); // 발끝 방향 = 앞(+z 기준 축 보정)
    return { scene, h: box.max.y - box.min.y, minY: box.min.y, bones: names, miss, yaw };
  }
  // 제자리 동작(전투 담당 진단 11-05): 클립의 골반 수평 이동(루트 모션) 때문에 보이는 몸이 위치값(f.pos·물리 캡슐)에서 벗어남 →
  //  골반 위치 트랙을 첫 장면 기준으로 수평 이동만 지움(높이는 유지 — 앉기·넘어짐·점프 높이 그대로). 큰 이동(넘어짐·구르기)도 제자리에서 넘어지게 함(끝 위치 넘겨주기 없음)
  //  끄려면 localStorage arenaInPlace=0 (비교 측정용)
  function inPlaceClips(scene) {
    MC.inPlace = (() => { try { return localStorage.getItem('arenaInPlace') !== '0'; } catch (e) { return true; } })(); if (!MC.inPlace) return;
    let pel = null; scene.traverse(o => { if (o.isBone && o.name === 'pelvis') pel = o; }); if (!pel || !pel.parent) return;
    scene.updateMatrixWorld(true); const q = new THREE.Quaternion(); pel.parent.getWorldQuaternion(q); const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q.invert()).normalize(); // 골반 부모 좌표의 '위'(UAL 은 +z)
    let n = 0;
    Object.values(CLIPS).forEach(c => { const t = c.tracks.find(x => x.name === 'pelvis.position'); if (!t) return; const v = t.values, x0 = v[0], y0 = v[1], z0 = v[2];
      for (let i = 0; i < v.length; i += 3) { const d = (v[i] - x0) * up.x + (v[i + 1] - y0) * up.y + (v[i + 2] - z0) * up.z; v[i] = x0 + up.x * d; v[i + 1] = y0 + up.y * d; v[i + 2] = z0 + up.z * d; } n++; });
    MC.inPlaceN = n;
  }
  (async () => {
    try {
      if (!THREE.GLTFLoader) await loadScript(BASE + 'loaders/GLTFLoader.js');
      if (!THREE.SkeletonUtils) await loadScript(BASE + 'utils/SkeletonUtils.js');
      const L = new THREE.GLTFLoader(), get = u => new Promise((ok, no) => L.load(u, ok, undefined, no));
      const [n, m, f] = await Promise.all([get('assets/cc0/ual1.glb'), get('assets/cc0/ubc_male.gltf').catch(() => null), get('assets/cc0/ubc_female.gltf').catch(() => null)]);
      n.animations.forEach(c => { CLIPS[c.name] = c; }); MC.clipN = n.animations.length;
      TPL.n = tpl(n.scene); TPL.m = m ? tpl(m.scene) : TPL.n; TPL.f = f ? tpl(f.scene) : TPL.n;
      inPlaceClips(n.scene);
      await loadMPFB(get); // 매끈한 사람 몸(없으면 기존 몸으로)
      await loadCharBodies(get); // 캐릭터별 커스텀 모델(assets/char/manifest.json) — 없으면 no-op
      MC.report = {}; ['n', 'm', 'f'].forEach(k => { const tp = TPL[k]; MC.report[k] = { h: +tp.h.toFixed(3), yawDeg: Math.round(tp.yaw * 180 / Math.PI), missingBones: tp.miss, clipTrackMismatch: clipCheck(tp), fallback: (k === 'm' && !m) || (k === 'f' && !f) }; if (tp.miss.length) console.warn('[mocap] 몸', k, '필수 뼈 없음', tp.miss); });
      if (TPL.n.miss.length) throw Error('기본 몸 필수 뼈 없음: ' + TPL.n.miss.join(','));
      MC.ready = true;
    } catch (e) { MC.failed = String(e && e.message || e); console.warn('[mocap] 기존 모형으로 대체:', MC.failed); }
  })();

  // ═══ 체형·의상(원작) ═══
  const FEMALE = new Set(['sakura', 'rukia', 'tatsumaki', 'nezuko', 'shinobu', 'mitsuri']);
  const HERO = new Set(['gai', 'zoro', 'kenpachi', 'himejima', 'uzui', 'garou', 'sanemi', 'rengoku', 'ace', 'genos', 'kizaru']);
  // ═══ 인물 자산 표(레지스트리): 새 인물은 표에 한 줄만 더하면 됨(그리기·교전 코드 수정 없음) ═══
  //  body: 'n' 보통 남자·'m' 근육형 남자·'f' 여자 / cos: 의상(아래 COS 형식) / weapon: 무기 붙일 뼈 / headK: 머리 크기 배율
  const REG = window.CHAR_ASSETS = {};
  // 머리 대 키 비율(원작 그림체): 사람 몸(약 1:8)보다 머리를 키움 — 소년·소녀 1:6.5 안팎, 어른 1:7, 아이 체형(히츠가야·타츠마키) 1:5.5
  const HEADK = { hitsugaya: 1.1, tatsumaki: 1.08, muichiro: 1.05 };
  // 머리 대 키 비율(소유자 11-05 '머리만 크다' → 원작 그림체 기준): 성인 남자 1:7.2 · 성인 여자 1:7 · 10대 소년 1:6.7 · 작은 소녀·소년 1:6.4 · 아이 체형 1:5.8. 인물 표 headRatio 로 덮어쓰기
  const HRATIO = { naruto: 6.7, sasuke: 6.8, sakura: 6.6, gaara: 6.7, ichigo: 7, rukia: 6.4, hitsugaya: 5.8, tatsumaki: 5.8, tanjiro: 6.7, zenitsu: 6.6, inosuke: 6.7, nezuko: 6.4, muichiro: 6.2, shinobu: 6.6, mikasa: 7.1, annie: 6.6, nobara: 6.7, mitsuri: 7, luffy: 7, himejima: 7.6, gai: 7.3, kenpachi: 7.6, uzui: 7.5 };
  const headRatioOf = k => (REG[k] && REG[k].headRatio) || HRATIO[k] || (FEMALE.has(k) ? 7 : 7.2); // MPFB 몸(11-05)부터는 몸 비율에 맞춰 거의 그대로(머리만 큰 문제 해결)
  const regOf = k => REG[k] || (REG[k] = { body: FEMALE.has(k) ? 'f' : HERO.has(k) ? 'm' : 'n', cos: COS[k] || {}, weapon: { r: 'hand_r', l: 'hand_l' }, headK: HEADK[k] || 1 });
  window.registerCharAsset = (k, def) => { const r = Object.assign(regOf(k), def || {}); const old = MC.rigs.get(k); if (old && !old.bad) scene3.remove(old.holder); MC.rigs.delete(k); return r; };
  const bodyOf = k => regOf(k).body;
  // coat: 하오리·망토·긴 옷(허리 아래 옷자락 + 소매·등판 색) / len: thigh·knee·shin·ankle / pat: 무늬
  // open: 앞섶이 맨살(조끼·풀어헤친 앞) / shirt: 앞섶 색 / bare: 웃통 벗음 / cape: 등 망토 / warmer: 각반·다리 토시 / sash: 허리띠 넓게
  const COS = {
    naruto: { shoulder: '#1c1c28' }, sasuke: { shirt: '#cfd4e2', sash: '#6a3a9a' }, kakashi: { vest: '#3e5a3a' }, sakura: { skirt: { c: '#e8a0c0', len: 'thigh', slit: true }, sleeveless: true },
    luffy: { open: true, shorts: { c: '#2a5aa8', cuff: '#4a7ac8', knee: .315 } }, zoro: { coat: { c: '#2e4a34', c2: '#22382a', pat: 'grad', len: 'shin', sleeves: true }, sash: '#8a1a24', wide: true, open: true }, sanji: { shirt: '#e8e8f0', tie: '#141418' }, ichigo: { shirt: '#e8e8f0', sash: '#e8e8f0', hakama: { c: '#101014', len: 'ankle' } },
    byakuya: { coat: { c: '#f4f4f8', len: 'shin' }, scarf: '#d8ead8', hakama: { c: '#101014', len: 'ankle' } }, rukia: { shirt: '#e8e8f0', sash: '#e8e8f0', hakama: { c: '#101014', len: 'ankle' } }, saitama: { cape: '#f4f4f8', sash: '#141414', boots: '#c81e2a' },
    genos: { metalArms: '#5a5e68', metalBody: '#7a808c', core: '#ff9a3a' }, gaara: { sash: '#c8a060' }, itachi: { coat: { c: '#141418', c2: '#c81e2a', pat: 'cloud', len: 'ankle', sleeves: true, closed: true } },
    gai: { warmer: '#f07a18', vest: '#3a6a3a' }, ace: { bare: true, sash: '#c89a40' }, kizaru: { coat: { c: '#f4f4f8', len: 'shin' } }, law: { coat: { c: '#f0e8a0', c2: '#141418', pat: 'hem', len: 'thigh', sleeves: true } },
    hitsugaya: { coat: { c: '#f4f4f8', len: 'shin' }, sash: '#e8e8f0', hakama: { c: '#101014', len: 'ankle' } }, kenpachi: { coat: { c: '#e8e8f0', len: 'knee', pat: 'torn' }, sash: '#e8e8f0', hakama: { c: '#101014', len: 'ankle' } }, aizen: { coat: { c: '#f4f4f8', len: 'ankle', sleeves: true } },
    tatsumaki: { skirt: { c: '#1a2a22', len: 'ankle', slit: true }, dress: '#1a2a22', sleeveless: false }, bang: { shirt: '#4a4a52' }, garou: { open: true },
    tanjiro: { coat: { c: '#1a6a4a', c2: '#101010', pat: 'checker', len: 'thigh', sleeves: true } }, nezuko: { skirt: { c: '#f0a0b8', c2: '#e07090', pat: 'hemp', len: 'knee' }, coat: { c: '#5a2a1a', len: 'thigh', sleeves: true } },
    zenitsu: { coat: { c: '#f8c830', c2: '#f4f4f8', pat: 'tri', len: 'thigh', sleeves: true } }, inosuke: { bare: true, furPants: '#5a4a3a' },
    giyu: { coat: { c: '#8a2a2a', c2: '#c8a040', pat: 'split', len: 'thigh', sleeves: true } }, rengoku: { coat: { c: '#f4f4f8', c2: '#e0401a', pat: 'flame', len: 'knee', sleeves: true } },
    shinobu: { coat: { c: '#c8b0f0', c2: '#6a3ab0', pat: 'grad', len: 'thigh', sleeves: true } }, uzui: { bare: true, sash: '#c8a040' }, mitsuri: { coat: { c: '#f4f4f8', len: 'knee', sleeves: true }, skirt: { c: '#2a3a2a', len: 'thigh' }, open: true, stock: '#8ac070' },
    muichiro: { coat: { c: '#1a2a30', c2: '#4ad0c0', pat: 'grad', len: 'thigh', sleeves: true } }, sanemi: { coat: { c: '#f4f4f8', len: 'knee', sleeves: true }, open: true },
    obanai: { coat: { c: '#f4f4f8', c2: '#2a2a32', pat: 'stripe', len: 'knee', sleeves: true } }, himejima: { coat: { c: '#6a5a3a', c2: '#4a3a2a', pat: 'grad', len: 'ankle', sleeves: true } },
  };
  // ═══ 체형(원작 실루엣): 몸 종류 기본 + 인물별 배율(정점을 뼈 축 둘레로 늘이고 줄임 — 뼈는 그대로라 동작 호환) ═══
  //  waist 허리 · chest 가슴통 · bust 앞가슴(여성 곡선) · hip 골반 · arm 팔 굵기 · shoulder 어깨 폭(키 대비 더하기) · thigh 넓적다리 · calf 종아리 · neck 목
  const SIL0 = { f: { waist: .86, chest: .95, bust: 1.12, hip: 1.12, arm: .84, shoulder: -.012, thigh: .97, calf: .9, neck: .85 }, m: { waist: .96, chest: 1.06, bust: 1, hip: 1, arm: 1.08, shoulder: .012, thigh: 1.04, calf: 1.02, neck: 1.05 }, n: { waist: .97, chest: 1.02, bust: 1, hip: 1, arm: .97, shoulder: 0, thigh: 1, calf: 1, neck: 1 } };
  const SIL = { himejima: { arm: 1.25, chest: 1.2, waist: 1.15, thigh: 1.2, calf: 1.15, neck: 1.2, shoulder: .02 }, kenpachi: { chest: 1.12, arm: 1.12, shoulder: .015 }, uzui: { chest: 1.12, arm: 1.12, shoulder: .012 }, gai: { arm: 1.15, chest: 1.12, thigh: 1.1, calf: 1.1 },
    zoro: { chest: 1.08, arm: 1.08 }, sanemi: { chest: 1.08, arm: 1.06 }, inosuke: { chest: 1.1, arm: 1.05, waist: .92 }, garou: { waist: .92 }, ace: { chest: 1.05 }, rengoku: { chest: 1.04 },
    muichiro: { arm: .8, chest: .86, waist: .9, thigh: .84, calf: .85, neck: .85, shoulder: -.01 }, zenitsu: { arm: .88, chest: .92 }, hitsugaya: { arm: .84, chest: .86, thigh: .88, shoulder: -.01 }, obanai: { arm: .86, chest: .9 }, gaara: { arm: .88, chest: .9 },
    tatsumaki: { arm: .78, chest: .82, waist: .84, hip: .98, thigh: .78, calf: .8, bust: 1.02 }, nezuko: { arm: .85, waist: .88 }, shinobu: { arm: .8, waist: .84 }, rukia: { arm: .84, chest: .9, bust: 1.04 }, mitsuri: { arm: 1, thigh: 1.06, hip: 1.12, bust: 1.18 }, sakura: { arm: .9 },
    luffy: { arm: .92, chest: .95 }, sanji: { waist: .9, thigh: .95 }, law: { arm: .92 }, byakuya: { arm: .92, chest: .95 }, itachi: { arm: .92, chest: .95 }, sasuke: { arm: .95 }, bang: { arm: .92 }, kizaru: { waist: .95 }, saitama: { arm: 1 } };
  // MPFB 몸 위 인물별 체형(몸 종류 기본은 MPFB 가 이미 가짐 — 여기서는 원작 차이만): 여성 6명 개별화(11-05 소유자 "여자 캐릭터들이 뭔지 모르겠다")
  const SIL_M = { mikasa: { arm: .98, chest: 1.0, waist: .9, thigh: 1.02, shoulder: .004 }, annie: { arm: .86, chest: .9, waist: .88, thigh: .94, shoulder: -.006 }, nobara: { arm: .88, waist: .88, hip: 1.04, thigh: .96 }, sakura: { arm: .9, waist: .92, thigh: .96 }, rukia: { arm: .82, chest: .88, bust: .92, hip: .93, thigh: .88, calf: .88, shoulder: -.008, neck: .9 }, tatsumaki: { arm: .76, chest: .8, bust: .9, waist: .82, hip: .92, thigh: .78, calf: .8, shoulder: -.012, neck: .85 },
    nezuko: { arm: .84, waist: .88, bust: .97, thigh: .92 }, shinobu: { arm: .8, waist: .84, bust: .94, thigh: .9, calf: .9, shoulder: -.008 }, mitsuri: { thigh: 1.08, calf: 1.04, hip: 1.1, bust: 1.16, waist: .92, arm: 1.02 },
    himejima: { arm: 1.2, chest: 1.15, waist: 1.1, neck: 1.15, shoulder: .015 }, kenpachi: { chest: 1.08, arm: 1.08, shoulder: .01 }, muichiro: { arm: .85, chest: .9, thigh: .88, shoulder: -.008 }, hitsugaya: { arm: .86, chest: .88, shoulder: -.008 } };
  const silOf = k => { const r = regOf(k); if (!r.sil) { const b = SIL0[r.body] || SIL0.n, o = SIL[k] || {}; r.sil = {}; Object.keys(b).forEach(q => { r.sil[q] = q === 'shoulder' ? b[q] + (o[q] || 0) : b[q] * (o[q] || 1); }); } return r.sil; };
  const LEN = { thigh: .40, knee: .29, shin: .17, ankle: .07 };
  const C = h => new THREE.Color(h);
  // 무늬: u(둘레 0~1, 0=앞), v(높이 0~1 위→아래), 반환: 0~1 섞음(0=c, 1=c2)
  const PAT = {
    checker: (u, v) => ((Math.floor(u * 18) + Math.floor(v * 7)) & 1),
    tri: (u, v) => { const a = (u * 14) % 1, b = (v * 6) % 1; return b > Math.abs(a - .5) * 2 ? 1 : 0; },
    flame: (u, v) => v > .55 + Math.sin(u * 40) * .12 + Math.sin(u * 17) * .06 ? 1 : 0,
    split: (u) => ((u + .25) % 1 < .5 ? 0 : 1),
    cloud: (u, v) => { const x = u * 8 % 1 - .5, y = v * 4 % 1 - .5; return x * x + y * y * 1.6 < .06 && Math.floor(u * 8 + v * 4) % 2 ? 1 : 0; },
    grad: (u, v) => Math.min(1, Math.max(0, (v - .3) * 1.6)),
    stripe: (u, v) => (Math.floor(u * 12) & 1),
    hem: (u, v) => (v > .8 ? 1 : 0),
    hemp: (u, v) => { const x = (u * 16) % 1, y = (v * 8) % 1; return Math.abs(x - .5) < .08 || Math.abs(y - .5) < .08 || Math.abs(x - y) < .07 ? 1 : 0; },
    torn: () => 0,
  };
  const patCol = (cs, u, v, out) => { const k = cs.pat && PAT[cs.pat] ? PAT[cs.pat](u, v) : 0; setC(out, cs.c); return k ? out.lerp(setC(PCT, cs.c2 || cs.c), k) : out; }; const PCT = new THREE.Color();

  // 뼈 부위 + 몸 위치(높이·앞뒤·좌우, 키에 대한 비율)로 색
  // 칠하기 가속(모형 만들기 시간): 정규식 결과·색 해석을 뼈 이름·색 문자열마다 한 번만
  const RTC = new Map(), RT = (re, b) => { let m = RTC.get(re.source); if (!m) RTC.set(re.source, m = new Map()); let v = m.get(b); if (v === undefined) m.set(b, v = re.test(b)); return v; };
  const SCC = new Map(), setC = (out, v) => { if (v && v.isColor) return out.copy(v); let c = SCC.get(v); if (!c) SCC.set(v, c = new THREE.Color(v)); return out.copy(c); };
  function colorAt(key, P, bone, x, y, z, h, out) {
    const cs = regOf(key).cos, yn = y / h, xn = x / h, zn = z / h, front = zn > .02, mid = Math.abs(xn) < .055;
    const coat = cs.coat, sl = coat && coat.sleeves;
    if (RT(/^head$|neck/i, bone)) return setC(out, cs.scarf && RT(/neck/, bone) ? cs.scarf : P.skin);
    if (RT(/hand|index|middle|ring|pinky|thumb/, bone)) return setC(out, cs.metalArms || P.glove || P.skin);
    if (RT(/upperarm|lowerarm/, bone)) {
      if (cs.metalArms) return setC(out, cs.metalArms);
      if (cs.sleeveless && !(coat && sl)) return setC(out, RT(/upperarm/, bone) && yn > .78 ? (P.top || P.skin) : P.skin); // 민소매(어깨만 옷)
      if (sl) { const u = (Math.atan2(xn, zn) / (Math.PI * 2) + 1) % 1; return patCol(coat, u * 2 % 1, Math.min(1, Math.max(0, (.78 - yn) / .4)), out); }
      if (cs.bare) return setC(out, P.skin);
      return setC(out, P.sleeve || P.top);
    }
    if (RT(/spine|clavicle/, bone)) {
      if (cs.bare) return setC(out, P.skin);
      if (cs.metalBody) { if (front && Math.hypot(xn, yn - .7) < .022) return setC(out, cs.core); if (front && Math.abs(xn) < .004) return setC(out, '#3a3e48'); return setC(out, Math.abs(yn - .66) < .004 || Math.abs(yn - .6) < .004 ? '#4a4e58' : cs.metalBody); } // 기계 몸통: 가슴 코어(주황 빛)·판 이음선
      if (coat && !coat.closed && !(front && mid)) { const u = (Math.atan2(xn, zn) / (Math.PI * 2) + 1) % 1; return patCol(coat, u, Math.min(1, Math.max(0, (.8 - yn) / .4)), out); }
      if (coat && coat.closed) { const u = (Math.atan2(xn, zn) / (Math.PI * 2) + 1) % 1; return patCol(coat, u, Math.min(1, Math.max(0, (.85 - yn) / .5)), out); }
      if (cs.open && front && Math.abs(xn) < .045) return setC(out, P.skin);
      if (cs.tie && front && Math.abs(xn) < .012 && yn > .62) return setC(out, cs.tie);
      if (cs.shirt && front && Math.abs(xn) < .035 && yn > .62) return setC(out, cs.shirt);
      if (cs.vest && yn > .58 && yn < .78) return setC(out, cs.vest);
      if (cs.shoulder && yn > .76) return setC(out, cs.shoulder);
      if (cs.dress) return setC(out, cs.dress);
      return setC(out, P.top || '#888');
    }
    if (RT(/pelvis|root/, bone)) { if (cs.sash) return setC(out, cs.sash); if (cs.dress) return setC(out, cs.dress); return setC(out, yn > .5 ? (P.belt || P.top) : (P.pants || P.top)); }
    if (RT(/thigh|calf/, bone)) {
      if (cs.shorts) { const k = cs.shorts.knee; if (yn < k - .02) return setC(out, P.skin); if (yn < k + .012) return setC(out, cs.shorts.cuff); return setC(out, cs.shorts.c); } // 반바지(무릎 위, 접단)
      if (cs.furPants) { const n = (Math.sin(x * 900) * Math.sin(y * 700)) > .3; return setC(out, cs.furPants).multiplyScalar(n ? .75 : 1); }
      if (cs.boots && yn < .22) return setC(out, cs.boots);
      if (cs.warmer && yn < .2 && yn > .07) return setC(out, cs.warmer);
      if (cs.stock && yn < .3) return setC(out, cs.stock); // 스타킹(미츠리 초록)
      if (cs.dress) return setC(out, cs.dress);
      if (RT(/calf/, bone) && yn < .16 && P.wrap && !cs.boots) return setC(out, P.wrap);
      return setC(out, P.pants || P.top);
    }
    if (RT(/foot|ball/, bone)) return setC(out, cs.boots || P.sandal || P.pants || '#333');
    return setC(out, P.top || '#888');
  }

  const GET = ['getX', 'getY', 'getZ', 'getW'], NMAX = { Uint8Array: 255, Uint16Array: 65535, Int8Array: 127, Int16Array: 32767 };
  const NMX = new WeakMap(), comp = (a, i, k) => { const v = k === 0 ? a.getX(i) : k === 1 ? a.getY(i) : k === 2 ? a.getZ(i) : a.getW(i); if (!a.normalized) return v; let d = NMX.get(a); if (d === undefined) NMX.set(a, d = NMAX[a.array.constructor.name] || 1); return v / d; };
  function paint(mesh, key, P, dark, h, minY, noSculpt) {
    const PT0 = performance.now(), PL = n => { const t = performance.now(); (MC.prof || (MC.prof = {}))['p.' + n] = ((MC.prof || {})['p.' + n] || 0) + t - PT0; };
    const g = mesh.geometry.clone(), si = g.attributes.skinIndex, sw = g.attributes.skinWeight, pos = g.attributes.position, n = pos.count, bones = mesh.skeleton.bones;
    const cols = new Float32Array(n * 3), headI = bones.findIndex(b => /^head$/i.test(b.name));
    const bindInv = mesh.bindMatrixInverse, bindM = mesh.bindMatrix;
    const headJoint = new THREE.Vector3().setFromMatrixPosition(mB.copy(mesh.skeleton.boneInverses[headI]).invert()).applyMatrix4(bindInv);
    const hc = new THREE.Vector3(), hp = []; let hn = 0, hr = 0;
    const c = new THREE.Color(), cc = new THREE.Color(), wp = new THREE.Vector3(), S = noSculpt ? Object.assign({ waist: 1, chest: 1, bust: 1, hip: 1, arm: 1, shoulder: 0, thigh: 1, calf: 1, neck: 1 }, MC.mpfbSil === false ? {} : (regOf(key).silM || SIL_M[key] || {})) : silOf(key);
    // 뼈 마디 위치(묶기 자세)와 자식 마디 → 뼈 축
    const J = bones.map((b, i) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert()));
    const CHD = bones.map(b => { const k = b.children.find(x => x.isBone); return k ? bones.indexOf(k) : -1; });
    const kOf = nm => /spine_01/.test(nm) ? S.waist : /spine_02/.test(nm) ? (S.waist + S.chest) / 2 : /spine_03/.test(nm) ? S.chest : /clavicle/.test(nm) ? (1 + S.chest) / 2 : /upperarm/.test(nm) ? S.arm : /lowerarm/.test(nm) ? S.arm * .96 : /pelvis/.test(nm) ? S.hip : /thigh/.test(nm) ? S.thigh : /calf/.test(nm) ? S.calf : /neck/.test(nm) ? S.neck : 1;
    const seg = new THREE.Vector3(), prj = new THREE.Vector3(), acc = new THREE.Vector3(), one = new THREE.Vector3();
    const KB = bones.map(b => kOf(b.name)), PELB = bones.map(b => /pelvis/.test(b.name)), ARMB = bones.map(b => /clavicle|upperarm|lowerarm|hand|index|middle|ring|pinky|thumb/.test(b.name)), SP3B = bones.map(b => /spine_03/.test(b.name)); /* 뼈마다 한 번만 판정 */
    function sculpt(v, bi, out) { // 뼈 축 둘레로 굵기 배율 + 어깨 폭 + 앞가슴
      const k = KB[bi], a = J[bi], ci = CHD[bi]; out.copy(v);
      if (ci >= 0 && k !== 1) { seg.subVectors(J[ci], a); const L2 = seg.lengthSq() || 1; let tt = Math.max(0, Math.min(1, prj.subVectors(v, a).dot(seg) / L2)); if (PELB[bi]) { prj.set(a.x, v.y, a.z); } else prj.copy(a).addScaledVector(seg, tt); out.sub(prj).multiplyScalar(k).add(prj); }
      if (ARMB[bi] && S.shoulder) out.x += Math.sign(v.x || 1) * S.shoulder * h;
      if (SP3B[bi] && S.bust !== 1 && v.z > 0) out.z += v.z * (S.bust - 1);
      return out;
    }
    for (let i = 0; i < n; i++) {
      wp.fromBufferAttribute(pos, i).applyMatrix4(bindM); // 묶기 자세의 몸 위치(앞 +z, 위 +y)
      c.setRGB(0, 0, 0); let best = -1, bw = 0; acc.set(0, 0, 0); let ws = 0;
      for (let k = 0; k < 4; k++) { const w = comp(sw, i, k); if (!w) continue; acc.addScaledVector(sculpt(wp, si[GET[k]](i), one), w); ws += w; }
      if (ws > 0) { acc.divideScalar(ws); one.copy(acc).applyMatrix4(bindInv); pos.setXYZ(i, one.x, one.y, one.z); }
      for (let k = 0; k < 4; k++) {
        const w = comp(sw, i, k); if (!w) continue; const bi = si[GET[k]](i);
        colorAt(key, P, bones[bi].name, wp.x, wp.y - minY, wp.z, h, cc); c.r += cc.r * w; c.g += cc.g * w; c.b += cc.b * w; if (w > bw) { bw = w; best = bi; }
      }
      if (dark) c.multiplyScalar(.72);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      if (best === headI) { // 몸의 머리는 원작 인물 머리로 바꾸므로 머리뼈 자리로 접어 숨김(중심·크기는 재 둠)
        vA.fromBufferAttribute(pos, i).applyMatrix4(bindM).applyMatrix4(mesh.skeleton.boneInverses[headI]); hp.push(vA.clone()); hc.add(vA); hn++;
        if (!(noSculpt && MC.mpfbFace === true)) pos.setXYZ(i, headJoint.x, headJoint.y, headJoint.z); // MPFB 몸은 얼굴(코·귀·턱 모양)을 그대로 쓰고 눈·눈썹·머리카락만 얹음
      }
    }
    if (hn) { hc.divideScalar(hn); hp.forEach(p => { hr = Math.max(hr, p.distanceTo(hc)); }); }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); pos.needsUpdate = true;
    PL('loop'); smoothNormals(g, mesh.geometry.uuid); PL('all'); MC.prof.pv = (MC.prof.pv || 0) + n;
    return { g, headC: hc, headR: hr };
  }
  const SNC = new Map(); /* 틀 메시별 같은 자리 정점 묶음 번호(재사용) */
  function smoothNormals(g, ck) { // 같은 자리 정점의 법선을 평균 → 각진 면이 둥글게 보임(툰 셰이딩)
    g.computeVertexNormals(); const p = g.attributes.position, nr = g.attributes.normal, n = p.count; let grp = ck && SNC.get(ck), ng = 0;
    if (!grp || grp.length !== n) { const map = new Map(); grp = new Int32Array(n); for (let i = 0; i < n; i++) { const k = Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000); let id = map.get(k); if (id === undefined) map.set(k, id = map.size); grp[i] = id; } if (ck) SNC.set(ck, grp); }
    for (let i = 0; i < n; i++) if (grp[i] >= ng) ng = grp[i] + 1; const acc = new Float32Array(ng * 3), na = nr.array;
    for (let i = 0; i < n; i++) { const q = grp[i] * 3; acc[q] += na[i * 3]; acc[q + 1] += na[i * 3 + 1]; acc[q + 2] += na[i * 3 + 2]; }
    for (let i = 0; i < n; i++) { const q = grp[i] * 3, l = Math.hypot(acc[q], acc[q + 1], acc[q + 2]) || 1; na[i * 3] = acc[q] / l; na[i * 3 + 1] = acc[q + 1] / l; na[i * 3 + 2] = acc[q + 2] / l; } nr.needsUpdate = true;
  }
  function outline(mesh, thick) { // 뒷면 윤곽선(뼈 따라 움직임)
    const m = new THREE.MeshBasicMaterial({ color: 0x14100c, side: THREE.BackSide, skinning: true });
    m.onBeforeCompile = sh => { sh.uniforms.olPx = window.OLPX || (window.OLPX = { value: new THREE.Vector2(.0012, .0022) }); /* 화면 기준 최소 두께(aaa.js 가 매 장면 1화소로 맞춤): 멀어지면 얇아져 끊기고 계단지던 윤곽선을 고르게 */
      sh.vertexShader = 'uniform vec2 olPx;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * ' + thick.toFixed(5) + ';').replace('#include <project_vertex>', '#include <project_vertex>\n vec3 olNo = normal;\n#ifdef USE_SKINNING\n olNo = (bindMatrixInverse * (skinWeight.x * boneMatX + skinWeight.y * boneMatY + skinWeight.z * boneMatZ + skinWeight.w * boneMatW) * bindMatrix * vec4(normal, 0.)).xyz;\n#endif\n { vec4 olN = projectionMatrix * modelViewMatrix * vec4(olNo, 0.); float olL = length(olN.xy); if (olL > 1e-5) gl_Position.xy += olN.xy / olL * olPx * gl_Position.w; }'); };
    const o = new THREE.SkinnedMesh(mesh.geometry, m); o.bind(mesh.skeleton, mesh.bindMatrix); o.position.copy(mesh.position); o.quaternion.copy(mesh.quaternion); o.scale.copy(mesh.scale); o.frustumCulled = false;
    mesh.parent.add(o); return o;
  }
  // 옷자락(하오리·긴 옷·치마): 허리 → len 까지 벌어지는 원통(앞 트임), 무늬는 정점 색
  function skirtGeo(cs, h, top, bot, rx, rz, open) {
    const PXk = PX() > 1 ? ((window.AAA && AAA.ultra) ? 4.5 : 3) : 1, seg = (cs.pleat ? 84 : 40) * PXk, rows = (cs.pleat ? 14 : 10) * PXk, gap = open ? .55 : 0, pos = [], col = [], idx = [], c = new THREE.Color();
    for (let r = 0; r <= rows; r++) {
      const v = r / rows, y = top + (bot - top) * v, fl = 1 + v * (open ? .35 : .22);
      for (let s = 0; s <= seg; s++) {
        const th = gap / 2 + (Math.PI * 2 - gap) * s / seg, u = th / (Math.PI * 2);
        let yy = y; if (cs.pat === 'torn' && r === rows) yy += (Math.sin(s * 7.3) * .5 + .5) * .03 * h;
        const pl = cs.pleat ? 1 + (Math.abs(Math.sin(th * cs.pleat * .5)) - .5) * .09 * (.25 + v) : 1; // 주름(접힘 깊이는 아래로 갈수록)
        pos.push(Math.sin(th) * rx * fl * pl, yy, Math.cos(th) * rz * fl * pl); patCol(cs, u, v, c); if (cs.pleat) c.multiplyScalar(.82 + .18 * Math.abs(Math.sin(th * cs.pleat * .5))); col.push(c.r, c.g, c.b);
      }
    }
    for (let r = 0; r < rows; r++) for (let s = 0; s < seg; s++) { const a = r * (seg + 1) + s, b = a + seg + 1; if (cs.slit && r >= rows * .3) { const th = gap / 2 + (Math.PI * 2 - gap) * (s + .5) / seg; if (Math.abs(Math.sin(th)) > .965) continue; } idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function skinSkirt(g, body, waist, bot, kneeY, rx) { // 옷자락 정점을 허리·넓적다리·종아리 뼈에 나눠 붙임(다리를 따라 벌어져 겹침 줄임)
    const sk = body.skeleton, B_ = sk.bones, idx = n => B_.findIndex(b => b.name === n), ip = idx('pelvis'), itl = idx('thigh_l'), itr = idx('thigh_r'), icl = idx('calf_l'), icr = idx('calf_r'); if (ip < 0 || itl < 0 || itr < 0) return null;
    const jx = i => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert()).applyMatrix4(body.bindMatrixInverse).x, sL = Math.sign(jx(itl) - jx(itr)) || 1;
    const p = g.attributes.position, n = p.count, SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4), kv = Math.min(1, Math.max(0, (waist - kneeY) / (waist - bot)));
    for (let i = 0; i < n; i++) {
      const y = p.getY(i), x = p.getX(i), v = Math.min(1, Math.max(0, (waist - y) / (waist - bot))), legW = Math.min(.97, Math.max(0, (v - .04) / .5)), share = Math.min(1, Math.max(0, .5 + .5 * x * sL / (rx * 1.1)));
      const cf = v > kv && icl >= 0 ? (v - kv) / (1 - kv + 1e-6) * .6 : 0, L = share >= .5;
      SI.set([ip, itl, itr, L ? icl : icr], i * 4); SW.set([1 - legW, legW * share * (L ? 1 - cf : 1), legW * (1 - share) * (L ? 1 : 1 - cf), legW * cf * (L ? share : 1 - share)], i * 4);
      const s = SW[i * 4] + SW[i * 4 + 1] + SW[i * 4 + 2] + SW[i * 4 + 3]; for (let k = 0; k < 4; k++) SW[i * 4 + k] /= s;
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    const ms = new THREE.SkinnedMesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, side: THREE.DoubleSide, skinning: true }));
    ms.position.copy(body.position); ms.quaternion.copy(body.quaternion); ms.scale.copy(body.scale); ms.bind(sk, body.bindMatrix); ms.frustumCulled = false; return ms;
  }
  function capeGeo(col, h) { // 등 망토: 어깨 → 종아리
    const g = new THREE.PlaneGeometry(.34 * h, .6 * h, 6, 12), p = g.attributes.position, cl = [], c = C(col);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -Math.pow(x / (.17 * h), 2) * .03 * h - (y < 0 ? -y * .08 : 0)); cl.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); g.computeVertexNormals(); return g;
  }

  // 기존 인물 조각을 '그리기 층'에서만 빼기(보이기 여부는 게임 논리 그대로 남김)
  const saved = new WeakMap();
  const fxSet = m => { const s = new Set(); FX_KEYS.forEach(k => m[k] && m[k].traverse && m[k].traverse(o => s.add(o))); return s; };
  function hideOld(m) { const fx = m._mcFx || (m._mcFx = fxSet(m)); m.root.traverse(o => { if ((o.isMesh || o.isLine || o.isPoints) && !fx.has(o) && o.layers.mask !== (1 << HIDE)) { saved.set(o, o.layers.mask); o.layers.set(HIDE); } }); }
  function showOld(m) { m.root.traverse(o => { if (saved.has(o)) { o.layers.mask = saved.get(o); saved.delete(o); } }); }
  function cloneVis(src) { // 기존 조각 복제(원래 층으로) + 보이기 동기화 짝
    const c = src.clone(true), a = [], b = [];
    src.traverse(o => a.push(o)); c.traverse(o => b.push(o));
    b.forEach((o, i) => { if (saved.has(a[i])) o.layers.mask = saved.get(a[i]); });
    return { obj: c, pairs: a.map((o, i) => [o, b[i]]) };
  }
  function rel(base, obj, out) { base.updateMatrixWorld(true); mA.copy(base.matrixWorld).invert(); return out.multiplyMatrices(mA, obj.matrixWorld); }
  function attach(bone, base, matInBase, obj) { // base 좌표의 자리(matInBase)에 obj 를 두되 bone 을 따라 움직이게
    const box = new THREE.Group(); mB.copy(rel(base, bone, new THREE.Matrix4())).invert().multiply(matInBase).decompose(box.position, box.quaternion, box.scale); bone.add(box); box.add(obj); return box;
  }

  // ═══ 새 머리(새 몸 비례): 얼굴(턱·광대·코·귀) + 애니풍 큰 눈(흰자·눈동자·동공·하이라이트) + 눈썹·입 + 인물별 머리카락 갈래·장식 ═══
  // 머리카락 style: spiky(뾰족)·back(뒤로 뻗침)·short·bowl(바가지)·bald·long·pony(묶음)·braids(땋은 두 갈래)·bob·flame(불꽃)·messy·slick(넘김)·curly
  // acc: band(이마 보호대)·bandTilt(한쪽 눈 가림)·hairband·mask(입 가리개)·strawhat·cowboy·fluffyhat·boar(멧돼지 탈)·butterfly·earrings·scarL(이마 흉터)·shades·kenseikan·patch(안대)·muzzle(대나무 재갈)·bandage·jewel·earR3(귀걸이 3)·tattoo
  const HAIR = {
    naruto: { s: 'spiky', n: 26, L: 1.0, acc: ['band'] }, sasuke: { s: 'back', n: 22, L: 1.0 }, kakashi: { s: 'spiky', n: 20, L: 1.1, tilt: .6, acc: ['bandTilt', 'mask'] }, sakura: { s: 'bob', n: 22, L: .9, acc: ['hairband'] },
    luffy: { s: 'short', n: 22, L: .55, acc: ['strawhat', 'scarEye'] }, zoro: { s: 'short', n: 26, L: .4, acc: ['earR3'] }, sanji: { s: 'slick', n: 18, L: .8, cover: 'R' }, ichigo: { s: 'spiky', n: 28, L: 1.0 },
    byakuya: { s: 'long', n: 22, L: 1.6, acc: ['kenseikan'] }, rukia: { s: 'bob', n: 20, L: .8, strand: true }, saitama: { s: 'bald' }, genos: { s: 'spiky', n: 20, L: .7 },
    gaara: { s: 'messy', n: 22, L: .65, acc: ['tattoo'] }, itachi: { s: 'pony', n: 18, L: .8, acc: ['band'] }, gai: { s: 'bowl', brow: 2.2 }, ace: { s: 'messy', n: 24, L: .8, acc: ['cowboy'] },
    kizaru: { s: 'slick', n: 14, L: .5, acc: ['shades'] }, law: { s: 'short', n: 16, L: .5, acc: ['fluffyhat'] }, hitsugaya: { s: 'spiky', n: 26, L: .95 }, kenpachi: { s: 'spiky', n: 18, L: 1.4, acc: ['patch'] },
    aizen: { s: 'slick', n: 16, L: .7, strand: true }, tatsumaki: { s: 'curly', n: 26, L: .8 }, bang: { s: 'long', n: 18, L: 1.2 }, garou: { s: 'back', n: 22, L: 1.1 },
    tanjiro: { s: 'messy', n: 26, L: .8, acc: ['scarL', 'earrings'] }, nezuko: { s: 'long', n: 26, L: 1.9, tip: '#e8783a', acc: ['muzzle', 'ribbon'] }, zenitsu: { s: 'spiky', n: 26, L: .85, tip: '#ff9a20' }, inosuke: { s: 'short', n: 14, L: .5, acc: ['boar'] },
    giyu: { s: 'pony', n: 22, L: 1.0, messy: true }, rengoku: { s: 'flame', n: 28, L: 1.25, tip: '#e0401a' }, shinobu: { s: 'bob', n: 22, L: .9, tip: '#8a5ad0', acc: ['butterfly'] }, uzui: { s: 'back', n: 16, L: .8, acc: ['jewel'] },
    mitsuri: { s: 'braids', n: 18, L: .7, tip: '#9ad070' }, muichiro: { s: 'long', n: 24, L: 1.6, tip: '#4ad0c0' }, sanemi: { s: 'spiky', n: 26, L: .9, acc: ['scarL'] }, obanai: { s: 'messy', n: 18, L: .8, acc: ['bandage'] },
    himejima: { s: 'short', n: 14, L: .3, acc: ['scarL'] },
  };
  const FACE = { sasuke: 'sharp', itachi: 'sharp', zoro: 'sharp', kenpachi: 'sharp', byakuya: 'sharp', hitsugaya: 'sharp', law: 'sharp', garou: 'sharp', sanemi: 'sharp', obanai: 'sharp', uzui: 'sharp', gaara: 'sharp', kizaru: 'sleepy', kakashi: 'sleepy', giyu: 'calm', muichiro: 'calm', aizen: 'calm', bang: 'sleepy', saitama: 'dot', himejima: 'calm', genos: 'sharp' };
  // 얼굴형(원작 설정 대조, 11-05): jw 턱 폭 · jl 턱 길이(아래로) · ck 광대 · ey 눈 높이(+위) · ez 눈 사이(+넓게) · es 눈 크기 · eh 눈 세로 · ba 눈썹 각(+ 안쪽이 내려감=사나움, - 처짐=걱정) · by 눈썹 높이 · bw 눈썹 굵기 · mw 입 폭 · mk 얼굴 표식
  const FACEP = {
    naruto: { es: 1.05, ba: .12, mw: 1.3, mk: ['whisker'] }, sasuke: { jw: .88, jl: 1.08, es: .9, eh: .92, ba: .38 }, kakashi: { es: .95, ba: .05, mk: ['scarV'] }, sakura: { jw: .9, jl: .94, es: 1.16, ey: -.06, ba: -.05 },
    luffy: { jw: 1.04, es: 1.1, mw: 1.7, ba: .05 }, zoro: { jl: 1.06, es: .86, eh: .9, ba: .42, ck: 1.1, mk: ['closedL'] }, sanji: { jw: .9, jl: 1.08, es: .95, ba: .22, mk: ['curlBrow'] }, ichigo: { jl: 1.03, es: .94, ba: .55, bw: 1.2 },
    byakuya: { jw: .86, jl: 1.12, es: .9, eh: .9, ba: .12 }, rukia: { jw: .88, jl: .92, es: 1.16, ba: .08 }, saitama: { jw: .86, jl: 1.12, ck: .9, mw: .8 }, genos: { jw: .9, jl: 1.05, es: .95, ba: .3, sclera: '#121216' },
    gaara: { es: .95, ba: .2, bw: 0, mk: ['ring'] }, itachi: { jw: .88, jl: 1.08, es: .9, eh: .9, ba: .08, mk: ['trough'] }, gai: { jw: 1.22, jl: 1.08, ck: 1.15, es: 1.15, ba: -.08, mw: 1.5 }, ace: { es: 1.0, ba: .1, mw: 1.3, mk: ['freckle'] },
    kizaru: { jw: .95, jl: 1.15, es: .9 }, law: { jw: .88, jl: 1.06, es: .92, ba: .3, mk: ['bags'] }, hitsugaya: { jw: .84, jl: .9, es: 1.12, ba: .52 }, kenpachi: { jw: 1.06, jl: 1.2, ck: 1.25, es: .8, eh: .85, ba: .48, mw: 1.4, mk: ['scarK'] },
    aizen: { jw: .9, jl: 1.08, es: .9, ba: .14 }, tatsumaki: { jw: .8, jl: .86, es: 1.22, ba: .45 }, bang: { jw: .95, jl: 1.1, es: .78, ba: -.05, bw: 1.4 }, garou: { jw: .9, jl: 1.05, es: .9, ba: .52 },
    tanjiro: { es: 1.08, ba: -.04 }, nezuko: { jw: .88, jl: .92, es: 1.2 }, zenitsu: { es: 1.0, ba: -.38, mw: 1.2 }, inosuke: { jw: .88, es: 1.15 }, giyu: { jw: .9, jl: 1.05, es: .95, eh: .9 },
    rengoku: { jw: 1.02, es: 1.26, ba: .28, bw: 1.6 }, shinobu: { jw: .86, jl: .92, es: 1.16, ba: -.05 }, uzui: { jw: .95, jl: 1.1, es: .95, ba: .2, mk: ['flowerL'] }, mitsuri: { jw: .88, jl: .92, es: 1.2, ba: -.12, mk: ['moles'] },
    muichiro: { jw: .86, jl: .92, es: 1.16 }, sanemi: { jl: 1.04, es: .85, eh: .88, ba: .58, mk: ['scarS'] }, obanai: { jw: .9, es: .92, ba: .32 }, himejima: { jw: 1.15, jl: 1.15, ck: 1.1, es: .95, blind: true, ba: -.15 },
  };
  const matC = {}, basicC = {};
  const toon = (c, side) => { const k = c + (side || ''); return matC[k] || (matC[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: typeof gm !== 'undefined' ? gm : null, side: side || THREE.FrontSide })); };
  const flat = c => basicC[c] || (basicC[c] = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
  const vToon = (() => { let m = null; return () => m || (m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null })); })();
  function gradCone(r, L, c1, c2) { // 머리카락 한 갈래(뿌리 c1 → 끝 c2), 뿌리가 원점·+y 로 뻗음
    const g = new THREE.ConeGeometry(r, L, PX() > 1 ? ((window.AAA && AAA.ultra) ? 28 : 18) : 7, PX() > 1 ? ((window.AAA && AAA.ultra) ? 34 : 22) : 6); g.scale(1, 1, .58); g.translate(0, L / 2, 0); g.userData.lock = L; /* 납작한 머리 갈래(리본형) */ const p = g.attributes.position, col = [], a = C(c1), b = C(c2), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) { t.copy(a).lerp(b, Math.max(0, p.getY(i) / L - .35) / .65); col.push(t.r, t.g, t.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  }
  // 얼굴 피부: 푸른 달빛에 회색·흰색으로 바래지 않게 — 받는 빛은 절반, 나머지는 따뜻한 자체 발광(인물 피부톤 그대로 보이게, 11-05 37명 측정 뒤 조정)
  const skinC = {}; const skinMat = c => skinC[c] || (skinC[c] = new THREE.MeshToonMaterial({ color: new THREE.Color(c).multiplyScalar(.56), emissive: new THREE.Color(c).multiply(new THREE.Color(.58, .52, .45)), gradientMap: typeof gm !== 'undefined' ? gm : null }));
  // ═══ 애니 얼굴 2판(소유자 11-05 "얼굴형·이목구비가 부자연스럽다"): 구 조각 대신 매끈한 한 덩어리 얼굴(V 턱·작은 코·광대 평면) + 그린 얼굴(캔버스) ═══
  //  얼굴 메시: 구를 깎아 아래로 좁아지는 턱선·앞이 납작한 얼굴·작은 코 돌기. 정면 투영 UV 로 얼굴 그림(눈·눈썹·입·표식)을 입힘(뒤·옆은 피부색)
  //  눈 그림: 흰자 → 홍채(위 짙고 아래 밝은 그라데이션)·동공·하이라이트 2개 → 굵은 윗속눈썹 선(눈꼬리 날개)·가는 아랫선. 눈매(둥근·날카로운·졸린·점) · 사륜안/윤회안/불꽃 눈/맹인/검은 흰자 지원
  const FACE_TEX = 512;
  const SG = n => Math.round(n * ((window.AAA && AAA.ultra) ? 5.5 : (PX() > 1 ? 4 : 1))); /* 울트라: 모자·탈 분할 4배→5.5배 */
  const FACE_X = new Set(['saitama', 'inosuke', 'law', 'luffy', 'kizaru', 'himejima', 'aizen', 'nanami']); /* 머리카락이 적은 인물: 울트라 얼굴 분할 더 */
  function faceGeo(R, FP) {
    const g = new THREE.SphereGeometry(R, PX() > 1 ? ((window.AAA && AAA.ultra) ? (FACE_X.has(MC._fk) ? 380 : 240) : (FACE_X.has(MC._fk) ? 300 : 180)) : 56, PX() > 1 ? ((window.AAA && AAA.ultra) ? (FACE_X.has(MC._fk) ? 266 : 170) : (FACE_X.has(MC._fk) ? 210 : 130)) : 40), p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R;
      x *= .95; y *= 1.04; z *= .9;
      if (y < .12) { const t = Math.min(1, (.12 - y) / 1.1), tt = Math.pow(t, 1.25);           // 아래로 갈수록: 폭을 좁히고(V 턱) 길이를 늘이고 턱끝을 앞으로
        z *= 1 - (.5 - (FP.jw - 1) * .55) * tt; y -= (.1 + (FP.jl - 1) * .5) * tt * (1 + y * .2); if (x > 0) x += .1 * tt * x; x *= 1 - .18 * tt * (x < 0 ? 1 : 0); }
      if (x > .55) x -= (x - .55) * .28;                                                           // 얼굴 앞면을 조금 납작하게(애니 얼굴 평면)
      const nb = Math.exp(-(((y + .17) / .09) ** 2 + (z / .07) ** 2)); x += .06 * nb;              // 작은 코
      p.setXYZ(i, x * R, y * R, z * R);
      if (x > .05) uv.setXY(i, .5 - z / 1.9, .52 + y / 2.1); else uv.setXY(i, .02, .02);         // 정면 투영(화면 오른쪽 = 인물 왼쪽)
    }
    g.computeVertexNormals(); return g;
  }
  function drawFace(key, P, FP, MK, H, eyeOver) {
    const S = PX() > 1 && window.AAA && AAA.ultra ? (renderer.capabilities.isWebGL2 ? 768 : 512) : FACE_TEX, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), skin = P.skin || '#f0c8a0', hair = P.hair || '#222'; // 11-07: 울트라 얼굴 텍스처 768(WebGL1 폴백은 512 유지 — NPOT mipmaps 금지 회피)
    x.fillStyle = skin; x.fillRect(0, 0, S, S);
    const U = u => u * S, V = v => (1 - v) * S, zU = z => U(.5 - z / 1.9), yV = y => V(.52 + y / 2.1);   // 얼굴 좌표(R 단위) → 그림 좌표
    const fs = FACE[key] || 'round', es = FP.es, ec0 = eyeOver || P.eye || '#3a2a1a';
    const FEAT = MC.faceFeatures === true; // 소유자 11-05 결정: 눈·눈썹·입 그림을 지움(매끈한 얼굴 + 얼굴형만). 흉터·무늬·입 가리개 같은 표식은 유지. 다시 켜려면 MOCAP.faceFeatures = true
    if (FEAT) {
    // 볼 홍조
    if (FEMALE.has(key) || /tanjiro|zenitsu|nezuko|muichiro/.test(key)) [-1, 1].forEach(s => { const gx = x.createRadialGradient(zU(.42 * s), yV(-.3), 2, zU(.42 * s), yV(-.3), 34); gx.addColorStop(0, 'rgba(240,120,120,.45)'); gx.addColorStop(1, 'rgba(240,120,120,0)'); x.fillStyle = gx; x.fillRect(0, 0, S, S); });
    if (MK.includes('ring')) [-1, 1].forEach(s => { x.fillStyle = '#20141a'; x.beginPath(); x.ellipse(zU((.34 + FP.ez) * s), yV(-.06 + FP.ey), 52 * es, 50 * es, 0, 0, 7); x.fill(); x.fillStyle = skin; });
    [-1, 1].forEach(s => { // s: +1 = 인물 오른쪽(그림 왼쪽)
      const cx = zU((.34 + FP.ez) * s), cy = yV(-.08 + FP.ey), ew = 50 * es, eh = 58 * es * FP.eh * (fs === 'sleepy' ? .7 : fs === 'sharp' ? .74 : fs === 'calm' ? .84 : fs === 'dot' ? .3 : 1), tilt = (fs === 'sharp' ? .16 : 0) * s, ec = s < 0 && P.eyeL && !eyeOver ? P.eyeL : ec0;
      x.save(); x.translate(cx, cy); x.rotate(tilt);
      if (MK.includes('closedL') && s < 0) { x.strokeStyle = '#1a1010'; x.lineWidth = 6; x.beginPath(); x.arc(0, -10, ew * .9, .35, Math.PI - .35); x.stroke(); x.strokeStyle = '#a0584a'; x.lineWidth = 5; x.beginPath(); x.moveTo(-6, -eh * 1.3); x.lineTo(6, eh * 1.3); x.stroke(); x.restore(); return; }
      if (fs === 'dot') { x.fillStyle = '#141010'; x.beginPath(); x.ellipse(0, 0, 9, 9, 0, 0, 7); x.fill(); x.restore(); return; }
      // 흰자(눈 모양으로 자름)
      x.beginPath(); x.ellipse(0, 0, ew, eh, 0, 0, 7); x.fillStyle = FP.sclera || '#fbfbfd'; x.fill(); x.save(); x.clip();
      if (!FP.blind) {
        const ir = ew * .74, iy = eh * .08, gr = x.createLinearGradient(0, -eh, 0, eh); const c = new THREE.Color(ec);
        gr.addColorStop(0, '#' + c.clone().multiplyScalar(.35).getHexString()); gr.addColorStop(.45, '#' + c.getHexString()); gr.addColorStop(1, '#' + c.clone().lerp(new THREE.Color('#ffffff'), .45).getHexString());
        x.fillStyle = gr; x.beginPath(); x.ellipse(0, iy, ir, eh * .92, 0, 0, 7); x.fill(); x.lineWidth = 5; x.strokeStyle = '#120808'; x.stroke();
        if (key === 'rengoku') { x.lineWidth = 7; x.strokeStyle = '#d8301a'; x.beginPath(); x.ellipse(0, iy, ir * .92, eh * .85, 0, 0, 7); x.stroke(); }
        const rinne = s < 0 && key === 'sasuke' && P.eyeL && !eyeOver, shar = /^#[cd][0-3]/i.test(ec) && /sasuke|itachi|kakashi/.test(key);
        if (rinne) { x.strokeStyle = '#3a2a5a'; x.lineWidth = 2; [.3, .55, .8].forEach(k => { x.beginPath(); x.ellipse(0, iy, ir * k, eh * .9 * k, 0, 0, 7); x.stroke(); }); }
        else { x.fillStyle = '#0c0808'; x.beginPath(); x.ellipse(0, iy + 2, ir * .36, eh * .4, 0, 0, 7); x.fill(); }
        if (shar && !rinne) { x.fillStyle = '#0c0808'; [0, 2.1, 4.2].forEach(a => { x.beginPath(); x.arc(Math.cos(a) * ir * .55, iy + Math.sin(a) * eh * .5, 5, 0, 7); x.fill(); }); }
        x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-ir * .35, iy - eh * .38, ir * .26, eh * .2, -.4, 0, 7); x.fill(); x.beginPath(); x.arc(ir * .35, iy + eh * .35, ir * .12, 0, 7); x.fill();
      }
      x.restore();
      if (fs === 'sleepy' || fs === 'calm') { x.fillStyle = skin; x.fillRect(-ew - 4, -eh - 30, ew * 2 + 8, (fs === 'sleepy' ? eh * .55 : eh * .3) + 30); }
      // 윗속눈썹(굵은 선 + 눈꼬리 날개) · 아랫선
      const top = fs === 'sleepy' ? -eh * .45 : fs === 'calm' ? -eh * .7 : -eh * .96;
      x.strokeStyle = '#140c0c'; x.lineCap = 'round'; x.lineWidth = fs === 'sharp' ? 15 : 13;
      x.beginPath(); x.moveTo(-ew * 1.08 * s, top + eh * .35); x.quadraticCurveTo(0, top - eh * .22, ew * 1.12 * s, top + eh * .2); x.lineTo(ew * 1.32 * s, top - eh * (fs === 'sharp' ? .05 : .12)); x.stroke(); // 눈꼬리(바깥쪽) 날개
      x.lineWidth = 5; x.beginPath(); x.moveTo(-ew * .6 * s, eh * .95); x.quadraticCurveTo(0, eh * 1.08, ew * .85 * s, eh * .78); x.stroke();
      if (FEMALE.has(key)) { x.lineWidth = 4; [.75, 1.0].forEach(k => { x.beginPath(); x.moveTo(ew * k * s, top + eh * .25); x.lineTo(ew * (k + .3) * s, top - eh * .05); x.stroke(); }); } // 속눈썹 끝
      if (MK.includes('bags')) { x.strokeStyle = 'rgba(80,50,60,.75)'; x.lineWidth = 3; x.beginPath(); x.arc(0, eh * .9, ew * .8, .3, Math.PI - .3); x.stroke(); }
      if (MK.includes('trough')) { x.strokeStyle = '#5a3a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(-ew * .2 * s, eh * 1.05); x.lineTo(-ew * .45 * s, eh * 1.75); x.stroke(); }
      x.restore();
      // 눈썹: 각도 ba(+ 안쪽이 내려감), 굵기 bw
      if (FP.bw > 0) { const by = cy - eh * 1.25 - 16 * es - FP.by * 100, bw = 13 * FP.bw * (H.brow || 1), a = (.12 - FP.ba * .9) * -s;
        x.save(); x.translate(cx, by); x.rotate(a); x.fillStyle = hair; x.beginPath(); x.moveTo(-ew * 1.0 * s, bw * .2); x.quadraticCurveTo(0, -bw * 1.2, ew * 1.15 * s, -bw * .1); x.lineTo(ew * 1.15 * s, bw * .45); x.quadraticCurveTo(0, -bw * .1, -ew * 1.0 * s, bw * .9); x.closePath(); x.fill();
        if (MK.includes('curlBrow') && s < 0) { x.strokeStyle = hair; x.lineWidth = 4; x.beginPath(); x.arc(-ew * 1.0 * s + 6, bw * .5, 8, 0, 5.2); x.stroke(); }
        x.restore(); }
    });
    } // 눈·눈썹·입 끝
    // 코(작은 그늘) · 입
    if (FEAT) {     x.strokeStyle = 'rgba(150,80,60,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(U(.5) + 3, yV(-.14)); x.lineTo(U(.5) - 4, yV(-.2)); x.stroke(); }
    if (FEAT && (!H.acc || !H.acc.includes('mask'))) { const mw = 26 * FP.mw, my = yV(-.47 - (FP.jl - 1) * .35); x.strokeStyle = '#5a1a18'; x.lineWidth = 6; x.beginPath(); x.moveTo(U(.5) - mw, my - (FP.mw > 1.4 ? 4 : 0)); x.quadraticCurveTo(U(.5), my + (FP.mw > 1.4 ? 8 : 2), U(.5) + mw, my - (FP.mw > 1.4 ? 4 : 0)); x.stroke(); }
    if (H.acc && H.acc.includes('mask')) { x.fillStyle = P.mask || '#1a2040'; x.beginPath(); x.moveTo(0, yV(-.12)); x.quadraticCurveTo(U(.5), yV(-.02), S, yV(-.12)); x.lineTo(S, S); x.lineTo(0, S); x.fill(); } // 입 가리개(카카시)
    // 표식
    const line = (c, w, pts) => { x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(zU(a), yV(b)) : x.moveTo(zU(a), yV(b)))); x.stroke(); };
    if (MK.includes('whisker')) [-1, 1].forEach(s => [0, 1, 2].forEach(i => line('#3a1a10', 6, [[.3 * s, -.27 - i * .07], [.58 * s, -.24 - i * .08]])));
    if (MK.includes('freckle')) [-1, 1].forEach(s => [[0, 0], [.05, .04], [-.04, .05], [.03, -.04], [.08, -.02]].forEach(([a, b]) => { x.fillStyle = '#a8683e'; x.beginPath(); x.arc(zU((.36 + a) * s), yV(-.3 + b), 3, 0, 7); x.fill(); }));
    if (MK.includes('scarV')) line('#a05a4a', 4, [[-(.34 + FP.ez), .2], [-(.34 + FP.ez) - .02, -.35]]);
    if (MK.includes('scarK')) { line('#8a4a3a', 5, [[-.2, .5], [-.4, -.05], [-.5, -.5]]); line('#8a4a3a', 4, [[.12, -.32], [.32, -.6]]); }
    if (MK.includes('scarS')) [[[-.5, .3], [-.15, -.2]], [[.15, .25], [.45, -.15]], [[-.25, -.35], [.1, -.55]], [[.05, .55], [-.2, .3]]].forEach(pp => line('#9a4a3a', 4, pp));
    if (MK.includes('moles')) [-1, 1].forEach(s => { x.fillStyle = '#3a2018'; x.beginPath(); x.arc(zU(.36 * s), yV(-.3), 3.5, 0, 7); x.fill(); });
    if (MK.includes('flowerL')) { x.strokeStyle = '#c8243a'; x.lineWidth = 4; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; x.beginPath(); x.moveTo(zU(-.34) + Math.cos(a) * 52, yV(-.06) + Math.sin(a) * 52); x.lineTo(zU(-.34) + Math.cos(a) * 66, yV(-.06) + Math.sin(a) * 66); x.stroke(); } }
    if (H.acc && H.acc.includes('scarEye')) line('#8a2a1a', 3, [[-.26, -.24], [-.42, -.24]]), line('#8a2a1a', 2, [[-.3, -.2], [-.31, -.28]]), line('#8a2a1a', 2, [[-.38, -.2], [-.39, -.28]]);
    if (H.acc && H.acc.includes('scarL')) line(key === 'tanjiro' ? '#b8402a' : '#a0584a', key === 'tanjiro' ? 9 : 5, key === 'tanjiro' ? [[-.2, .42], [-.32, .32], [-.26, .24]] : [[-.15, .5], [-.35, .3]]);
    if (H.acc && H.acc.includes('tattoo')) { x.fillStyle = '#c01a1a'; x.font = 'bold 40px serif'; x.fillText('愛', zU(-.3) - 20, yV(.42) + 14); }
    return cv;
  }
  function animeFace(key, P, R, FP, MK, H, rig) {
    MC._fk = key; const cv = drawFace(key, P, FP, MK, H), tex = new THREE.CanvasTexture(cv); tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    const skin = P.skin || '#f0c8a0', m = new THREE.MeshToonMaterial({ map: tex, color: new THREE.Color(.42, .42, .42), gradientMap: typeof gm !== 'undefined' ? gm : null }); m.userData.matUp = 1; // 재질 담당 덧칠 제외(얼굴 그림 선이 흐려지지 않게)
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = diffuseColor.rgb * 1.45;'); }; // 그림 색이 달빛에 바래지 않게(얼굴 그림 자체 발광)
    const mesh = new THREE.Mesh(faceGeo(R, FP), m);
    rig.faceRedraw = ec => { const c2 = drawFace(key, P, FP, MK, H, ec); tex.image = c2; tex.needsUpdate = true; };
    return mesh;
  }
  function buildHead(key, P, R, rig, opt = {}) {
    const MF = !!opt.mpfbFace, FX = MF ? (opt.fx || .9) : 1; // MPFB 얼굴 앞면까지의 거리 배율
    const H = regOf(key).hair || HAIR[key] || { s: 'short', n: 20, L: .6 }, acc = (H.acc || []).concat({ gojo: ['blindfold'] }[key] || []), g = new THREE.Group(), skin = P.skin || '#f0c8a0', hair = P.hair || '#222', tip = H.tip || P.hair2 || hair;
    const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * R, y * R, z * R); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); g.add(m); return m; };
    const boar = acc.includes('boar'), skinM = skinMat(skin), FP = Object.assign({ jw: 1, jl: 1, ck: 1, ey: 0, ez: 0, es: 1, eh: 1, ba: 0, by: 0, bw: FEMALE.has(key) ? .55 : 1, mw: FEMALE.has(key) ? .8 : 1 }, regOf(key).facep || FACEP[key] || {}, opt.face || {}), MK = FP.mk || [];
    // 얼굴: 두개골 + 턱 + 광대 + 코 + 귀
    const NEWF = !MF && MC.newFace !== false;
    { const sk = add(new THREE.SphereGeometry(R, 28, 20), skinM, 0, 0, 0, .95, 1.05, .9); if (MF || NEWF) sk.visible = false; } // (MPFB 얼굴·새 얼굴이면 크기 기준만)
    if (NEWF) { const fm = animeFace(key, P, R, FP, MK, H, rig); g.add(fm); rig.faceMesh = fm;
      add(new THREE.CylinderGeometry(R * .3, R * .36, R * 1.0, 16), skinM, -.06, -1.05, 0); // 목
      [-1, 1].forEach(s => add(new THREE.SphereGeometry(R * .2, 10, 8), skinM, -.05, -.1, .84 * s, .5, 1, .35)); } // 귀
    if (!MF && !NEWF) {
    const lowM = acc.includes('mask') ? toon(P.mask || '#1a2040') : skinM; // 카카시: 입 가리개가 턱까지 덮음
    add(new THREE.SphereGeometry(R * .62, 20, 14), lowM, .26, -.48 - (FP.jl - 1) * .35, 0, .95, .74 * FP.jl, .84 * FP.jw); // 턱(폭·길이) — 애니 얼굴: 아래로 좁아지는 V 턱
    add(new THREE.SphereGeometry(R * .2, 14, 10), lowM, .55, -.86 - (FP.jl - 1) * .62, 0, 1, .8, 1.1 * FP.jw); // 턱끝(갸름한 턱선)
    add(new THREE.CylinderGeometry(R * .36, R * .42, R * 1.0, 16), skinM, -.02, -1.0, 0); // 목(머리-몸 이음새가 회색으로 드러나지 않게 덮음)
    [-1, 1].forEach(s => add(new THREE.SphereGeometry(R * .32 * FP.ck, 12, 10), lowM, .52, -.24, .42 * s * (.9 + .1 * FP.jw), 1, .8, .9)); // 광대
    add(new THREE.ConeGeometry(R * .07, R * .2, 6), lowM, .97, -.16, 0, 1, 1, 1, 0, 0, -Math.PI / 2); // 코
    [-1, 1].forEach(s => add(new THREE.SphereGeometry(R * .2, 10, 8), skinM, -.02, -.05, .9 * s, .55, 1, .35)); // 귀
    }
    if (!boar && !NEWF) {
      // 눈: 흰자·눈동자(테두리 진하게)·동공·하이라이트. 사륜안(빨강+점 셋)·눈 색 좌우 다름(eyeL) 지원
      [-1, 1].forEach(s => {
        const ec = s < 0 && P.eyeL ? P.eyeL : (P.eye || '#3a2a1a'), ry = Math.PI / 2 + s * (.28 + FP.ez * .6), z = (.34 + FP.ez) * s, e = new THREE.Group(); e.position.set((.865 - FP.ez * .5 - Math.max(0, -FP.ey) * .15) * R * FX, (-.08 + FP.ey) * R, z * R); e.rotation.y = ry; g.add(e);
        const fs = regOf(key).face || FACE[key] || 'round'; if (fs === 'sharp') { e.scale.set(.95, .72, 1); e.rotateZ(-s * .2); } else if (fs === 'sleepy') { e.scale.set(1, .62, 1); } else if (fs === 'calm') { e.scale.set(.95, .82, 1); } else if (fs === 'dot') { e.scale.set(.42, .42, 1); }
        e.scale.x *= FP.es * .82; e.scale.y *= FP.es * FP.eh * .86; // 눈 크기(원작 비율: 얼굴 폭의 약 1/4)
        if (fs !== 'round' && fs !== 'dot') { const lid = new THREE.Mesh(new THREE.PlaneGeometry(.66 * R, .09 * R), flat('#1a1010')); lid.position.set(0, (fs === 'sleepy' ? .2 : .33) * R, .03 * R); e.add(lid); } // 윗눈꺼풀(눈매)
        const disc = (r, c, zz, sy = 1.25, x = 0, y = 0) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r * R, 20), flat(c)); m.position.set(x * R, y * R, zz * R); m.scale.y = sy; e.add(m); return m; };
        if (MK.includes('ring')) { const rg = new THREE.Mesh(new THREE.RingGeometry(.29 * R, .4 * R, 24), flat('#1a1014')); rg.scale.y = 1.25; rg.position.z = -.004 * R; e.add(rg); } // 눈 둘레 검은 테(가아라)
        if (MK.includes('bags') || MK.includes('trough')) { const bg = MK.includes('bags'), ln = new THREE.Mesh(new THREE.PlaneGeometry(bg ? .36 * R : .03 * R, bg ? .035 * R : .26 * R), flat('#5a3a3a')); ln.position.set(bg ? 0 : -s * .1 * R, bg ? -.47 * R : -.52 * R, .005 * R); if (!bg) ln.rotation.z = s * .25; e.add(ln); } // 눈 밑 그늘(로)·눈물 자국 줄(이타치)
        if (FP.blind) { disc(.3, '#eeeef4', 0, 1.3); disc(.24, '#dcdce6', .01, 1.3); const br = new THREE.Mesh(new THREE.BoxGeometry(.04 * R, .045 * R * FP.bw, .3 * R), toon(hair)); br.position.set(.86 * R * FX, (.27 + FP.ey + FP.by) * R, (.39 + FP.ez) * s * R); br.rotation.set(s * (.15 - FP.ba), -s * .38, s * -.12); g.add(br); return; } // 앞 못 보는 눈(히메지마): 흰 눈만
        if (MK.includes('closedL') && s < 0) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(.5 * R, .04 * R), flat('#1a1010')); ln.rotation.z = .12; e.add(ln); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.04 * R, .75 * R), flat('#9a5a4a')); sc.position.z = .01 * R; e.add(sc); } else { // 왼눈 감김·세로 흉터(조로 타임스킵 뒤)
        disc(.3, FP.sclera || '#fbfbfb', 0, 1.3); disc(.225, '#1a1010', .01, 1.32); { const im = disc(.195, ec, .015, 1.32); im.material = new THREE.MeshBasicMaterial({ color: ec, side: THREE.DoubleSide }); (rig.eyeMats = rig.eyeMats || []).push([im.material, im.material.color.clone()]); } // 눈동자는 인물마다 따로(변신 때 색 바꿈) disc(.12, new THREE.Color(ec).multiplyScalar(.6).getStyle(), .017, 1.3, 0, .05); // 큰 흰자·진한 테두리·눈동자 위쪽 그늘
        const sharingan = /^#[cd][0-3]/i.test(ec) && (key === 'sasuke' || key === 'itachi');
        disc(.085, '#0a0a0a', .02, 1.15);
        if (sharingan) [0, 2.1, 4.2].forEach(a => disc(.03, '#0a0a0a', .022, 1, Math.cos(a) * .11, Math.sin(a) * .11 * 1.25));
        if (key === 'rengoku') disc(.11, '#e0401a', .018, 1.25);
        disc(.065, '#ffffff', .025, 1, -.06, .11); disc(.03, '#ffffff', .025, 1, .07, -.08); }
        if (FP.bw > 0) { const br = new THREE.Mesh(new THREE.BoxGeometry(.04 * R, .045 * R * (H.brow || 1) * FP.bw, .3 * R * Math.min(1.15, .9 + FP.es * .1)), toon(hair)); br.position.set((.9 - FP.ez * .5) * R * FX, (.24 + FP.ey + FP.by + (FP.es - 1) * .22) * R, (.34 + FP.ez) * s * R); br.rotation.set(s * (.15 - FP.ba), -s * .26, s * -.12); g.add(br); // 눈썹(각도: 사나움·처짐)
          if (MK.includes('curlBrow') && s < 0) { const cu = new THREE.Mesh(new THREE.TorusGeometry(.055 * R, .014 * R, 6, 14, Math.PI * 1.6), toon(hair)); cu.position.set(.92 * R, (.25 + FP.ey) * R, -.22 * R); cu.rotation.set(0, Math.PI / 2, 0); g.add(cu); } } // 상디 말린 눈썹 끝
      });
      if (!MF && !acc.includes('mask')) add(new THREE.BoxGeometry(.03 * R, .035 * R, .18 * R * FP.mw), flat('#7a2a2a'), .9 - (FP.jl - 1) * .1, -.48 - (FP.jl - 1) * .3, 0, 1, 1, 1, 0, 0, 0); // 입(MPFB 얼굴은 입술이 있음)
      // 얼굴 표식(원작): 수염 자국(나루토)·주근깨(에이스)·흉터(카카시·켄파치·사네미)·점(미츠리)·눈가 무늬(우즈이)
      const pl = (w, hh, c, x, y, z, ry, rz) => add(new THREE.PlaneGeometry(w * R, hh * R), flat(c), x, y, z, 1, 1, 1, 0, ry, rz);
      if (MK.includes('whisker')) [-1, 1].forEach(s => [0, 1, 2].forEach(i => pl(.26, .022, '#5a3a24', .9, -.3 - i * .075 - (FP.jl - 1) * .2, .5 * s, Math.PI / 2 + s * .55, s * (.12 - i * .1))));
      if (MK.includes('freckle')) [-1, 1].forEach(s => [[0, 0], [.07, .05], [-.06, .06], [.03, -.06]].forEach(([a, b]) => add(new THREE.CircleGeometry(.022 * R, 6), flat('#a8683e'), .93, -.27 + b, (.42 + a) * s, 1, 1, 1, 0, Math.PI / 2 + s * .5, 0)));
      if (MK.includes('scarV')) pl(.035, .62, '#9a5a4a', .87, -.02, -(.4 + FP.ez), Math.PI / 2 - .42, 0);
      if (MK.includes('scarK')) { pl(.04, 1.05, '#8a4a3a', .86, -.1, -.42, Math.PI / 2 - .45, .25); pl(.03, .5, '#8a4a3a', .9, -.45, .2, Math.PI / 2 + .2, -.3); }
      if (MK.includes('scarS')) [[.84, .1, -.35, .5], [.9, -.35, .3, -.6], [.82, .3, .45, .9], [.93, -.55, -.15, .2]].forEach(([x, y, z, r]) => pl(.03, .42, '#9a4a3a', x, y, z, Math.PI / 2 + z * 1.1, r));
      if (MK.includes('moles')) [-1, 1].forEach(s => [0, 1].forEach(i => add(new THREE.CircleGeometry(.02 * R, 6), flat('#3a2018'), .91, -.36 - i * .07, (.36 + i * .05) * s, 1, 1, 1, 0, Math.PI / 2 + s * .45, 0)));
      if (MK.includes('flowerL')) [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2; add(new THREE.CircleGeometry(.045 * R, 8), flat('#c8243a'), .78, -.08 + FP.ey + Math.sin(a) * .2, -(.4 + FP.ez) + Math.cos(a) * .2, 1, 1, 1, 0, Math.PI / 2 - .45, 0); });
    }
    // 머리카락: 뚜껑 + 갈래(뿌리는 머리 위 구면, 방향은 스타일별)
    const strands = [], hatOn = acc.includes('strawhat') || acc.includes('cowboy') || acc.includes('fluffyhat'), CHS = [], noCh = !!opt.noChain || MC.hairChain === false;
    // 갈래 하나: k(복원력)가 있으면 뼈 체인 무리(grp)로, 없으면 기존 통짜 갈래(머리 흔들림 스프링)
    const BEND = { spiky: [-1, .4, 0, .18], back: [-.6, -1, 0, .28], messy: [0, -1, 0, .3], flame: [-1, .8, 0, .22], long: [0, -1, 0, .12], pony: [0, -1, 0, .15], bob: [0, -1, 0, .22], curly: [0, -1, 0, .45], short: [0, -1, 0, .2], slick: [-1, -.4, 0, .25], bowl: [0, -1, 0, .2] }[H.s] || [0, -1, 0, .2];
    const bendLock = (piv, geo) => { const L = geo.userData && geo.userData.lock; if (!L) return; piv.updateMatrix(); const b = new THREE.Vector3(BEND[0], BEND[1], BEND[2]).normalize().applyQuaternion(piv.quaternion.clone().invert()); b.y = 0; if (b.lengthSq() < 1e-4) b.set(1, 0, 0); b.normalize(); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = Math.max(0, p.getY(i) / L), d = t * t * L * BEND[3] * 2.2; p.setXYZ(i, p.getX(i) + b.x * d, p.getY(i) * (1 - .1 * t * BEND[3]), p.getZ(i) + b.z * d); } geo.computeVertexNormals(); }; // 갈래를 곡선으로 휨(뿌리 곧게 → 끝으로 갈수록 스타일 방향)
    const strand = (piv, geo, w, k, grp, len, col) => { bendLock(piv, geo); if (k && !noCh) { piv.updateMatrix(); CHS.push({ geo, m: piv.matrix.clone(), root: piv.position.clone(), dir: new THREE.Vector3(0, 1, 0).applyQuaternion(piv.quaternion), len, k, grp, c: C(col || hair) }); return; }
      piv.add(new THREE.Mesh(geo, vToon())); g.add(piv); strands.push({ piv, q0: piv.quaternion.clone(), w }); };
    const HANG = Object.assign({ long: .06, pony: .08, bob: .14, curly: .14 }, MC.allHair === false ? {} : { spiky: .4, messy: .3, flame: .35, back: .3, short: .45, slick: .35 }), BACK_K = { long: .1, pony: .1, bob: .14, curly: .14, braids: .12, bowl: .25, back: .4, spiky: .45, messy: .4, flame: .45 };
    if (H.s !== 'bald' && !boar) {
      // 정수리 돔(이마 위까지) + 옆·뒤 덮개(얼굴 앞 창만 열고 뒤통수·옆머리·목덜미까지 360° 덮음). three 구: 앞(+x) = phi π
      const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.05, 28, 12, 0, Math.PI * 2, 0, H.s === 'bowl' ? 1.25 : 1.02), toon(hair)); dome.scale.set(.98, 1.04, .94); g.add(dome);
      const down = { short: 1.95, slick: 2.0, spiky: 2.0, back: 2.05, messy: 2.05, flame: 2.05, bowl: 2.0, bob: 2.35, curly: 2.35, long: 2.5, pony: 2.15, braids: 2.2 }[H.s] || 2.0, win = H.s === 'bob' || H.s === 'curly' || H.s === 'long' ? 1.05 : .95;
      const back = new THREE.Mesh(new THREE.SphereGeometry(R * 1.055, 28, 14, Math.PI + win, Math.PI * 2 - 2 * win, .9, down - .9), toon(hair, THREE.DoubleSide)); back.scale.set(.98, 1.04, .95); g.add(back);
      const n = Math.round((H.n || 20) * (PX() > 1 ? ((window.AAA && AAA.ultra) ? 4.4 : 3.4) : 1)), L = (H.L || .7) * R * .88, rr = R * (PX() > 1 ? .62 : 1) * (H.s === 'short' ? .19 : .24); // 머리카락 부피 줄임(11-05)
      for (let i = 0; i < n; i++) {
        const k = i / n, az = k * Math.PI * 2 * 1.618 % (Math.PI * 2), pol = .25 + (i % 7) * .2; // 위에서 0 ~ 뒤통수 아래 1.45
        const nx = Math.sin(pol) * Math.cos(az), ny = Math.cos(pol), nz = Math.sin(pol) * Math.sin(az); // 뿌리 방향(앞 +x)
        if (nx > .55 && ny < .75 && H.s !== 'bowl') continue; // 얼굴 앞은 비움(앞머리는 따로)
        if (hatOn && ny > .55) continue; // 모자 속(정수리)은 갈래 없음 — 모자가 잘 보이게
        const dir = new THREE.Vector3(nx, ny, nz); let len = L * (.75 + (i * 37 % 10) / 20);
        if (H.s === 'spiky') dir.add(new THREE.Vector3(-.2, .35, 0));
        else if (H.s === 'back') dir.add(new THREE.Vector3(-1.1, .25, 0));
        else if (H.s === 'flame') { dir.add(new THREE.Vector3(-.5, .9, 0)); len *= 1.1; }
        else if (H.s === 'long' || H.s === 'pony') { dir.set(nx * .3 - .5, -1, nz * .45); len *= H.s === 'pony' ? .55 : 1.25; }
        else if (H.s === 'bob' || H.s === 'curly' || H.s === 'braids') { dir.set(nx * .55, -.9, nz * .75); len *= H.s === 'braids' ? .6 : .75; }
        else if (H.s === 'slick') dir.add(new THREE.Vector3(-1.2, -.2, 0));
        else if (H.s === 'messy') dir.add(new THREE.Vector3(Math.sin(i * 2.3) * .5, .1, Math.cos(i * 1.7) * .5));
        else if (H.s === 'bowl') { dir.set(nx * .5, -.9, nz * .5); len *= .45; }
        else dir.add(new THREE.Vector3(0, .15, 0));
        if (H.tilt) dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), H.tilt * .5);
        dir.normalize();
        const piv = new THREE.Group(); piv.position.set(nx * R * .92, ny * R * .98, nz * R * .9); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        strand(piv, gradCone(rr, len, hair, tip), .6 + (i % 4) * .2, HANG[H.s], 'm' + Math.floor((Math.atan2(nz, nx) + Math.PI) / (Math.PI * 2) * 8) % 8, len);
      }
      // 앞머리(이마 위 몇 갈래)
      const fr = H.s === 'bowl' ? 9 : H.s === 'slick' ? 0 : H.s === 'short' ? 3 : 5;
      for (let i = 0; i < fr; i++) { const z = (i / Math.max(1, fr - 1) - .5) * 1.1; const piv = new THREE.Group(); piv.position.set(.78 * R, .62 * R, z * R); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.55, -1, z * .2).normalize()); piv.add(new THREE.Mesh(gradCone(R * .17, R * (H.s === 'bowl' ? .42 : .5), hair, tip), vToon())); g.add(piv); strands.push({ piv, q0: piv.quaternion.clone(), w: .3 }); }
      if (H.cover) { const piv = new THREE.Group(); piv.position.set(.82 * R, .55 * R, (H.cover === 'L' ? -.3 : .3) * R); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.35, -1, 0).normalize()); strand(piv, gradCone(R * .3, R * .85, hair, tip), .4, .2, 'cover', R * .85); }
      if (H.strand) { const piv = new THREE.Group(); piv.position.set(.85 * R, .6 * R, 0); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.3, -1, 0).normalize()); strand(piv, gradCone(R * .08, R * .9, hair, tip), 1, .1, 'strand', R * .9); }
      // 뒷머리: 스타일별 뒤통수 갈래(뒤·아래로) — 옆모습·뒷모습에서 맨살이 보이지 않게
      const backN = H.s === 'bald' ? 0 : H.s === 'short' || H.s === 'slick' ? 6 : 9;
      for (let i = 0; i < backN; i++) { const z = (i / (backN - 1) - .5) * 1.5, piv = new THREE.Group(); piv.position.set(-.85 * R, (.15 - Math.abs(z) * .25) * R, z * R);
        const d = H.s === 'back' || H.s === 'spiky' || H.s === 'messy' || H.s === 'flame' ? new THREE.Vector3(-1, H.s === 'back' ? .55 : .2, z * .6) : new THREE.Vector3(-.35, -1, z * .3);
        piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); const bl = R * (H.s === 'back' ? 1.05 : H.s === 'bob' || H.s === 'curly' ? .75 : H.s === 'short' ? .4 : .65); strand(piv, gradCone(R * .22, bl, hair, tip), .8, BACK_K[H.s], 'b' + (z < -.3 ? 0 : z > .3 ? 2 : 1), bl); }
      if (H.s === 'pony') { const piv = new THREE.Group(); piv.position.set(-.85 * R, -.1 * R, 0); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.4, -1, 0).normalize()); strand(piv, gradCone(R * .32, R * 2.2, hair, tip), 1.3, .05, 'pony', R * 2.2); }
      if (H.s === 'braids') [-1, 1].forEach(s => { const piv = new THREE.Group(); piv.position.set(-.3 * R, -.3 * R, .8 * s * R); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.25, -1, .1 * s).normalize());
        if (!noCh) { const gs = [], ca = C(hair), cb = C(tip); for (let j = 0; j < 6; j++) { const sg = new THREE.SphereGeometry(R * (.24 - j * .02), 10, 8).toNonIndexed(); sg.scale(1, 1.2, 1); sg.translate(0, j * R * .38, 0); const cc = j > 3 ? cb : ca, cl = []; for (let q = 0; q < sg.attributes.position.count; q++) cl.push(cc.r, cc.g, cc.b); sg.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3)); gs.push(sg); }
          const all = []; gs.forEach(x => all.push(x)); const P = [], CL = []; all.forEach(x => { P.push(...x.attributes.position.array); CL.push(...x.attributes.color.array); }); const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute('color', new THREE.Float32BufferAttribute(CL, 3));
          strand(piv, mg, 1.4, .05, 'br' + s, R * 2.1); return; } // 땋은 두 갈래: 마디마다 굽는 체인
        for (let j = 0; j < 6; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(R * (.24 - j * .02), 10, 8), toon(j > 3 ? tip : hair)); b.position.y = j * R * .38; b.scale.set(1, 1.2, 1); piv.add(b); } g.add(piv); strands.push({ piv, q0: piv.quaternion.clone(), w: 1.4 }); });
    }
    // 장식
    const band = (y, tiltZ, col, plate) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.06, R * .22, 28, 1, true), toon(col, THREE.DoubleSide)); b.position.y = y * R; b.rotation.z = tiltZ; g.add(b);
      if (plate) { const p = new THREE.Mesh(new THREE.BoxGeometry(R * .08, R * .2, R * .62), toon(plate)); p.position.set(1.05 * R, 0, 0); b.add(p); } return b; };
    if (acc.includes('band')) band(.42, 0, P.band || '#1e3a7a', P.plate || '#c8ccd8');
    if ((acc.includes('band') || acc.includes('bandTilt')) && !noCh) [-1, 1].forEach(sd => { const piv = new THREE.Group(); piv.position.set(-1.0 * R, (acc.includes('band') ? .4 : .3) * R, sd * .12 * R); piv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.5, -1, sd * .35).normalize());
      const rg = new THREE.BoxGeometry(R * .2, R * 1.1, R * .03, 1, 6, 1); rg.translate(0, R * .55, 0); strand(piv, rg, 1, .04, 'tail' + sd, R * 1.1, P.band || '#1e3a7a'); }); // 매듭 끈(흔들림 체인)
    if (acc.includes('band') || acc.includes('bandTilt')) { const lf = new THREE.Mesh(new THREE.TorusGeometry(R * .07, R * .012, 4, 16, Math.PI * 1.7), flat('#6a6e78')); lf.position.set(1.08 * R, (acc.includes('band') ? .42 : .3) * R, 0); lf.rotation.y = Math.PI / 2; g.add(lf); } // 금속판 나뭇잎 문양 각인
    if (acc.includes('bandTilt')) { const b = band(.3, 0, P.band || '#1a2040', P.plate || '#c8ccd8'); b.rotation.set(-.35, 0, -.12); } // 왼눈(사륜안) 가림
    if (acc.includes('blindfold')) { const bf = band(-.05, 0, '#141418'); bf.scale.set(1.02, 1.6, 1.0); } // 고죠 검은 안대(눈을 가리는 띠)
    if (acc.includes('hairband')) { const hb = band(.58, 0, P.band || '#c8243a'); hb.scale.set(.97, .7, .93); hb.rotation.z = .35; }
    if (acc.includes('jewel')) { const b = band(.42, 0, '#c8a040'); [-.3, 0, .3].forEach((z, i) => { const j = new THREE.Mesh(new THREE.OctahedronGeometry(R * .09), toon(['#e04a8a', '#4ad0e0', '#e0c040'][i])); j.position.set(1.08 * R, 0, z * R); b.add(j); }); }
    if (acc.includes('mask')) add(new THREE.SphereGeometry(R * .99, 24, 12, -Math.PI / 2.2, Math.PI / 1.1, Math.PI * .52, Math.PI * .4), toon(P.mask || '#1a2040'), .02, 0, 0, .97, 1.05, .93, 0, Math.PI / 2, 0);
    if (acc.includes('bandage')) add(new THREE.SphereGeometry(R * 1.0, 24, 12, -Math.PI / 2.2, Math.PI / 1.1, Math.PI * .55, Math.PI * .35), toon('#f0f0f0'), .02, 0, 0, .97, 1.05, .93, 0, Math.PI / 2, 0);
    if (acc.includes('strawhat')) { const hat = new THREE.Group(); hat.position.y = .55 * R; hat.rotation.z = .22; g.add(hat); const hm = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y * R; hat.add(o); };
      hm(new THREE.CylinderGeometry(R * 2.0, R * 2.05, R * .07, SG(32), SG(3)), toon(P.hat || '#e8c860', THREE.DoubleSide), 0); hm(new THREE.CylinderGeometry(R * 1.02, R * 1.12, R * .7, SG(28), SG(6)), toon(P.hat || '#e8c860'), .38); hm(new THREE.CylinderGeometry(R * 1.13, R * 1.13, R * .2, SG(28), SG(2), true), toon(P.hatband || '#c81e2a', THREE.DoubleSide), .14); }
    if (acc.includes('cowboy')) { add(new THREE.CylinderGeometry(R * 1.6, R * 1.6, R * .06, SG(24), SG(2)), toon('#e05a1a'), 0, .62, 0, 1, 1, .8); add(new THREE.CylinderGeometry(R * .85, R * 1.0, R * .6, SG(20), SG(6)), toon('#e05a1a'), 0, .92, 0); }
    if (acc.includes('fluffyhat')) { add(new THREE.SphereGeometry(R * 1.15, SG(20), SG(14), 0, Math.PI * 2, 0, 1.4), toon('#f4f4f4'), 0, .25, 0, 1, 1.05, 1); [[.6, .3], [-.2, .7], [.1, -.6]].forEach(([a, b]) => add(new THREE.SphereGeometry(R * .14, 8, 6), toon('#5a3a2a'), Math.cos(a) * .9, .95, b, 1, .4, 1)); }
    if (acc.includes('boar')) { add(new THREE.SphereGeometry(R * 1.32, SG(24), SG(18)), toon('#6a6a74'), .05, .05, 0, 1.05, 1, .95); add(new THREE.CylinderGeometry(R * .32, R * .42, R * .6, SG(14), SG(4)), toon('#d8b8b0'), 1.3, -.2, 0, 1, 1, 1, 0, 0, -Math.PI / 2);
      [-1, 1].forEach(s => { add(new THREE.ConeGeometry(R * .26, R * .6, 8), toon('#5a5a64'), -.1, 1.1, .7 * s, 1, 1, 1, s * -.4, 0, 0); add(new THREE.SphereGeometry(R * .13, 10, 8), flat('#f0f0f0'), 1.0, .35, .5 * s); add(new THREE.ConeGeometry(R * .07, R * .35, 6), toon('#f0f0e0'), 1.35, -.45, .3 * s, 1, 1, 1, 0, 0, .6); }); }
    if (acc.includes('butterfly')) [-1, 1].forEach(s => add(new THREE.CircleGeometry(R * .32, 3), flat(s < 0 ? '#c8b0f0' : '#8a5ad0'), -.5, .55, .55 + s * .12, 1, 1.4, 1, 0, Math.PI / 2 + s * .6, s * .5));
    if (acc.includes('ribbon')) [-1, 1].forEach(s => add(new THREE.CircleGeometry(R * .3, 3), flat('#f0a0b8'), -.75, .2, s * .32, 1, 1.4, 1, 0, -Math.PI / 2, s * .8));
    if (acc.includes('earrings')) [-1, 1].forEach(s => add(new THREE.PlaneGeometry(R * .14, R * .38), flat('#f4f4f0'), -.02, -.45, .95 * s, 1, 1, 1, 0, 0, 0));
    if (acc.includes('earR3')) [0, 1, 2].forEach(i => add(new THREE.SphereGeometry(R * .05, 6, 4), toon('#e0c040'), -.05, -.3 - i * .1, -.97));
    if (acc.includes('scarL')) add(new THREE.PlaneGeometry(R * .25, R * .1), flat('#a02a2a'), .97, .45, -.3, 1, 1, 1, 0, Math.PI / 2, .4);
    if (acc.includes('scarEye')) add(new THREE.PlaneGeometry(R * .2, R * .03), flat('#8a2a1a'), .97, -.3, -.4, 1, 1, 1, 0, Math.PI / 2, 0);
    if (acc.includes('tattoo')) add(new THREE.PlaneGeometry(R * .16, R * .16), flat('#c01a1a'), .96, .48, .32, 1, 1, 1, 0, Math.PI / 2, 0);
    if (acc.includes('shades')) add(new THREE.BoxGeometry(R * .06, R * .22, R * 1.0, 1, SG(4), SG(16)), toon('#f0a020'), .95, .05, 0);
    if (acc.includes('kenseikan')) [-1, 1].forEach(s => add(new THREE.BoxGeometry(R * .1, R * .5, R * .1), toon('#f4f4f8'), .1, .75, .6 * s, 1, 1, 1, s * .4, 0, 0));
    if (acc.includes('patch')) add(new THREE.CircleGeometry(R * .2, 16), flat('#0a0a0a'), .9, .03, -.37, 1, 1.2, 1, 0, Math.PI / 2 - .38, 0);
    if (acc.includes('muzzle')) add(new THREE.CylinderGeometry(R * .08, R * .08, R * .95, 10), toon('#5a8a3a'), .92, -.45, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    rig.strands = strands; rig.hairSet = null;
    if (CHS.length) { const hc = hairChains(g, CHS, R); rig.hairSet = hc.set; rig.hairMesh = hc.mesh; }
    return g;
  }
  // 머리카락 끝 흔들림(스프링): 머리의 움직임과 반대로 늦게 따라옴 + 중력
  const sp = new THREE.Vector3(), hpW = new THREE.Vector3(), qInvH = new THREE.Quaternion(), qS = new THREE.Quaternion(), eS = new THREE.Euler();
  function springHair(rig, dt) {
    if (!rig.strands || !rig.strands.length || !rig.headG) return;
    rig.headG.getWorldPosition(hpW);
    if (!rig.hp0) { rig.hp0 = hpW.clone(); rig.sv = new THREE.Vector3(); rig.sx = new THREE.Vector3(); }
    sp.copy(hpW).sub(rig.hp0).divideScalar(Math.max(dt, 1e-3)); rig.hp0.copy(hpW); // 머리 속도(월드)
    if (!rig.hv0) rig.hv0 = sp.clone(); const acc = rig.hv1 || (rig.hv1 = new THREE.Vector3()); acc.copy(sp).sub(rig.hv0).divideScalar(Math.max(dt, 1e-3)); rig.hv0.copy(sp);
    sp.multiplyScalar(.0009).addScaledVector(acc, .00022); // 달리는 동안은 살짝 뒤로(속도), 출발·멈춤·방향 바꿈 때 크게 출렁(가속도)
    rig.headG.getWorldQuaternion(qInvH); qInvH.invert(); sp.applyQuaternion(qInvH).multiplyScalar(-1); // 머리 기준, 반대 방향
    sp.clampLength(0, .6);
    rig.sv.add(sp.sub(rig.sx).multiplyScalar(18 * dt)).multiplyScalar(Math.max(0, 1 - 6 * dt)); rig.sx.addScaledVector(rig.sv, 1).clampLength(0, .42); // 스프링·감쇠(최대 약 24°)
    const t = performance.now() / 1000;
    for (let i = 0; i < rig.strands.length; i++) { const s = rig.strands[i]; eS.set(rig.sx.z * s.w + Math.sin(t * 3 + i) * .02, 0, -rig.sx.x * s.w + Math.cos(t * 2.6 + i) * .02); qS.setFromEuler(eS); s.piv.quaternion.copy(qS).multiply(s.q0); }
  }

  // ═══ 뼈 체인 물리 2(머리카락·넓은 소매 — 소유자 11-05 "물리 체인 걸어서 흔들리거나 흩날리게") ═══
  // 갈래마다 기준점(anchor: 머리 그룹·아래팔 뼈) 아래에 마디 뼈를 두고, 입자(Verlet)를 '세계 좌표'로 굴려 관성(늦게 따라옴)·중력·바람을 받게 한 뒤
  // 마디 뼈를 입자 쪽으로 돌린다. 쉬는 모양(머리 모양·소매 모양)으로 돌아가려는 힘(stiff)이 갈래마다 다름 — 짧은 뾰족 머리는 세게(약하게 흔들림), 긴 머리·소매는 약하게.
  // 충돌: 머리 구(쉬는 자리보다 안으로는 못 들어감)·몸통 캡슐·어깨 구·넓적다리 캡슐. 비용: 인물당 마디 약 30~45개, 매 화면 새 객체 없음.
  const CW = { mi: new THREE.Matrix4(), s: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3() };
  // 마디 가중치: s = 뿌리부터 거리(마디 길이 단위). 뿌리 반 마디는 기준점과 섞어 두피·팔에서 떨어지지 않게, 이후는 이웃 마디 가운데끼리 섞어 매끈하게 굽힘
  function segW(s, segs) {
    if (s < .5) { const f = Math.max(0, s) / .5; return [[-1, 1 - f], [0, f]]; }
    const u = s - .5, j = Math.min(segs - 1, Math.floor(u)), f = u - j;
    return j >= segs - 1 ? [[segs - 1, 1]] : [[j, 1 - f], [j + 1, f]];
  }
  // 체인 하나 만들기: P = 기준점 좌표의 쉬는 점들(뿌리 포함 segs+1개), k = 쉬는 모양 복원력(60fps 기준 한 장면 비율)
  function mkChain(anchor, P, k, rh) {
    const bones = [], D = [];
    for (let j = 0; j < P.length - 1; j++) { const b = new THREE.Bone(); b.position.copy(P[j]); anchor.add(b); bones.push(b); D.push(P[j + 1].clone().sub(P[j]).normalize()); }
    return { P, D, bones, k, rh: rh || null, x: P.map(() => new THREE.Vector3()), xp: P.map(() => new THREE.Vector3()), t: P.map(() => new THREE.Vector3()), on: false };
  }
  // 충돌체(세계 좌표) — 인물마다 한 번 만들고 매 화면 값만 갱신
  function colPrep(rig) {
    const c = rig.col || (rig.col = { hc: new THREE.Vector3(), hs: 1, ta: new THREE.Vector3(), tb: new THREE.Vector3(), sl: new THREE.Vector3(), sr: new THREE.Vector3(), l: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], hw: 33 });
    const b = rig.bones, hw = c.hw = TARGET_H * Math.abs(rig.holder.scale.y || 1);
    if (rig.headG) { rig.headG.getWorldPosition(c.hc); c.hs = CW.s.setFromMatrixScale(rig.headG.matrixWorld).y; }
    (b.spine_03 || b.pelvis).getWorldPosition(c.ta); b.pelvis.getWorldPosition(c.tb); c.tr = hw * .068;
    if (b.upperarm_l) b.upperarm_l.getWorldPosition(c.sl); if (b.upperarm_r) b.upperarm_r.getWorldPosition(c.sr); c.sr2 = hw * .045;
    if (b.thigh_l && b.calf_l && b.thigh_r && b.calf_r) { b.thigh_l.getWorldPosition(c.l[0]); b.calf_l.getWorldPosition(c.l[1]); b.thigh_r.getWorldPosition(c.l[2]); b.calf_r.getWorldPosition(c.l[3]); c.lr = hw * .05; } else c.lr = 0;
    return c;
  }
  function sphOut(p, c, r) { CW.d.subVectors(p, c); const d = CW.d.length(); if (d < r && d > 1e-5) p.copy(c).addScaledVector(CW.d, r / d); }
  function setTick(rig, set, dt, col) {
    const A = set.anchor, M = A.matrixWorld; CW.mi.copy(M).invert();
    const hw = col.hw, g = -set.g * hw * dt * dt, damp = Math.pow(set.damp, dt * 60), tm = performance.now() / 1000, wx = Math.sin(tm * .9) * set.wind * hw * dt * dt, wz = Math.cos(tm * .7) * set.wind * .7 * hw * dt * dt;
    for (let c = 0; c < set.chains.length; c++) { if (col.budget-- <= 0) break; /* 인물당 체인 수 상한: 넘는 체인은 쉬는 모양 그대로 */
      const ch = set.chains[c], P = ch.P, x = ch.x, xp = ch.xp, t = ch.t, n = P.length, kk = 1 - Math.pow(1 - ch.k, dt * 60);
      for (let i = 0; i < n; i++) t[i].copy(P[i]).applyMatrix4(M);
      if (!ch.on || x[0].distanceToSquared(t[0]) > hw * hw * .09) { for (let i = 0; i < n; i++) { x[i].copy(t[i]); xp[i].copy(t[i]); } ch.on = true; } // 처음·순간 이동(교대·되살리기)은 쉬는 자리에서 다시
      x[0].copy(t[0]); xp[0].copy(t[0]);
      for (let i = 1; i < n; i++) { const q = x[i]; CW.d.subVectors(q, xp[i]).multiplyScalar(damp); xp[i].copy(q); q.add(CW.d); q.y += g; q.x += wx * i; q.z += wz * i; q.lerp(t[i], kk); }
      for (let it = 0; it < 2; it++) for (let i = 1; i < n; i++) {
        const a = x[i - 1], q = x[i], L = t[i].distanceTo(t[i - 1]); CW.d.subVectors(q, a); const d = CW.d.length() || 1e-5; q.copy(a).addScaledVector(CW.d, L / d);
        if (set.head && rig.headG) { const r = ch.rh ? Math.min(set.headR, ch.rh[i] * .97) * col.hs : set.headR * col.hs; sphOut(q, col.hc, r); }
        if (set.torso) { pushOut(q, col.ta, col.tb, col.tr); sphOut(q, col.sl, col.sr2); sphOut(q, col.sr, col.sr2); }
        if (set.legs && col.lr) { pushOut(q, col.l[0], col.l[1], col.lr); pushOut(q, col.l[2], col.l[3], col.lr); }
      }
      // 마디 뼈: 기준점 좌표로 옮겨 위치 = 입자, 방향 = 다음 입자 쪽(쉬는 방향에서 최소 회전)
      for (let j = 0; j < n - 1; j++) { const b = ch.bones[j]; CW.a.copy(x[j]).applyMatrix4(CW.mi); CW.b.copy(x[j + 1]).applyMatrix4(CW.mi); b.position.copy(CW.a); CW.e.subVectors(CW.b, CW.a).normalize(); if (CW.e.lengthSq() > .5) b.quaternion.setFromUnitVectors(ch.D[j], CW.e); }
    }
  }
  function chainTick(rig, dt) {
    if (!rig.csets || !rig.csets.length || !rig.holder.visible) return;
    dt = Math.min(.04, Math.max(.001, dt));
    rig.holder.updateMatrixWorld(true); const col = colPrep(rig);
    col.budget = MC.chainMax || (PX() > 1 ? 40 : 28); for (let i = 0; i < rig.csets.length; i++) setTick(rig, rig.csets[i], dt, col);
  }
  const vToonSk = (() => { let m = null; return () => m || (m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, skinning: true, side: THREE.DoubleSide })); })();
  const skC = {}; const toonSk = c => skC[c] || (skC[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: typeof gm !== 'undefined' ? gm : null, skinning: true, side: THREE.DoubleSide }));
  // 머리카락 체인: 같은 무리(grp) 갈래를 한 체인으로 묶어 한 개의 뼈 메시로(그리기 호출도 줄어듦)
  function hairChains(g, list, R) {
    const groups = new Map(); list.forEach(s => { let a = groups.get(s.grp); if (!a) groups.set(s.grp, a = []); a.push(s); });
    const bones = [g], inv = [new THREE.Matrix4()], chains = [], POS = [], COL = [], SI = [], SW = [], IDX = [], tmp = new THREE.Vector3();
    groups.forEach(arr => {
      const root = new THREE.Vector3(), dir = new THREE.Vector3(); let L = 0, k = 0;
      arr.forEach(s => { root.add(s.root); dir.add(s.dir); L = Math.max(L, s.len); k += s.k; }); root.divideScalar(arr.length); dir.normalize(); k /= arr.length;
      const segs = L > R * 1.1 ? 3 : 2, sl = L / segs, P = []; for (let j = 0; j <= segs; j++) P.push(root.clone().addScaledVector(dir, sl * j));
      const ch = mkChain(g, P, k, P.map(p => p.length())), b0 = bones.length; chains.push(ch);
      ch.bones.forEach((b, j) => { bones.push(b); inv.push(new THREE.Matrix4().makeTranslation(-P[j].x, -P[j].y, -P[j].z)); });
      arr.forEach(s => { const gp = s.geo.attributes.position, gc = s.geo.attributes.color, base = POS.length / 3;
        for (let i = 0; i < gp.count; i++) { tmp.fromBufferAttribute(gp, i).applyMatrix4(s.m); POS.push(tmp.x, tmp.y, tmp.z); if (gc) COL.push(gc.getX(i), gc.getY(i), gc.getZ(i)); else COL.push(s.c.r, s.c.g, s.c.b);
          const w = segW(tmp.sub(root).dot(dir) / sl, segs); for (let q = 0; q < 4; q++) { const e = w[q]; SI.push(e ? (e[0] < 0 ? 0 : b0 + e[0]) : 0); SW.push(e ? e[1] : 0); } }
        const ix = s.geo.index; if (ix) for (let i = 0; i < ix.count; i++) IDX.push(base + ix.getX(i)); else for (let i = 0; i < gp.count; i++) IDX.push(base + i);
      });
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(POS, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setIndex(IDX); geo.computeVertexNormals();
    const ms = new THREE.SkinnedMesh(geo, vToonSk()); ms.frustumCulled = false; ms.userData.hairChain = 1; g.add(ms); ms.bind(new THREE.Skeleton(bones, inv), new THREE.Matrix4());
    return { mesh: ms, set: { anchor: g, chains, g: 5.5, damp: .9, wind: .35, head: true, headR: R * 1.0, torso: true, legs: false } };
  }
  // 넓은 소매(기모노·하오리·사신복): 아래팔을 감싸는 통 + 아래로 처지는 소맷자락. 위쪽은 아래팔 뼈에 붙고, 처진 부분은 기둥 3개 × 2마디 체인
  //  쉬는 자세(묶기 자세) 좌표로 만들고, 마디 뼈는 아래팔 뼈의 자식(기준점 좌표 = 아래팔 뼈 좌표 = boneInverse × 묶기 좌표)
  function sleeveChain(rig, body, side, cs, P_, h) {
    const sk = body.skeleton, BN = sk.bones, bi = n => BN.findIndex(b => b.name.toLowerCase() === n), il = bi('lowerarm_' + side), ih = bi('hand_' + side); if (il < 0 || ih < 0) return null;
    const J = i => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(sk.boneInverses[i]).invert()), E = J(il), W = J(ih), la = BN[il], Binv = sk.boneInverses[il];
    const ax = W.clone().sub(E), Lf = ax.length(); ax.normalize();
    const dn = new THREE.Vector3(0, -1, 0).addScaledVector(ax, ax.y); if (dn.lengthSq() < .05) dn.set(0, 0, -1); dn.normalize(); const sv = new THREE.Vector3().crossVectors(ax, dn).normalize();
    const u0 = -.12, u1 = 1.1, rs = h * .034, Dd = h * .15, NU = 8 * PX(), NV = 18 * PX(), cols = 3, segs = 2;
    const cen = u => E.clone().addScaledVector(ax, Lf * (u0 + (u1 - u0) * u)), prof = u => .55 + .45 * u;
    // 기둥(체인) 쉬는 점: 팔 축 → 아래로 처진 끝
    const chains = [], bones = [la], inv = [Binv.clone()];
    for (let c = 0; c < cols; c++) { const u = c / (cols - 1), C0 = cen(u), P = []; for (let j = 0; j <= segs; j++) P.push(C0.clone().addScaledVector(dn, Dd * prof(u) * j / segs).applyMatrix4(Binv));
      const ch = mkChain(la, P, .035), b0 = bones.length; ch.bones.forEach((b, j) => { bones.push(b); inv.push(new THREE.Matrix4().makeTranslation(-P[j].x, -P[j].y, -P[j].z).multiply(Binv)); }); ch.b0 = b0; chains.push(ch); }
    // 통: 둘레 φ(0~2π) — 위 반쪽은 팔을 감싸고(팔 뼈), 아래 반쪽은 처짐(체인)
    const POS = [], COL = [], SI = [], SW = [], IDX = [], c = new THREE.Color(), p = new THREE.Vector3(), BMi = new THREE.Matrix4().copy(body.bindMatrix).invert();
    const coat = cs.coat && cs.coat.sleeves ? cs.coat : null;
    for (let iu = 0; iu <= NU; iu++) { const u = iu / NU, C0 = cen(u);
      for (let iv = 0; iv <= NV; iv++) { const ph = iv / NV * Math.PI * 2, sn = Math.sin(ph), drop = sn > 0 ? sn : 0;
        p.copy(C0).addScaledVector(sv, Math.cos(ph) * rs * (1 + .25 * drop)).addScaledVector(dn, sn > 0 ? Dd * prof(u) * Math.pow(sn, 1.6) : sn * rs * .95);
        POS.push(...p.clone().applyMatrix4(BMi).toArray());
        if (coat) patCol(coat, (iv / NV + (side === 'l' ? .5 : 0)) % 1, .3 + drop * .5, c); else c.set(P_.sleeve || '#101014'); if (iu === NU || drop > .97) c.multiplyScalar(.82); // 소맷부리·끝단 그늘
        COL.push(c.r, c.g, c.b);
        const s = drop * segs, cf = u * (cols - 1), c0 = Math.min(cols - 2, Math.floor(cf)), fc = cf - c0, w = segW(s, segs), out = [];
        w.forEach(([j, ww]) => { if (j < 0) out.push([0, ww]); else { out.push([chains[c0].b0 + j, ww * (1 - fc)]); out.push([chains[c0 + 1].b0 + j, ww * fc]); } });
        out.sort((a, b) => b[1] - a[1]); let tot = 0; for (let q = 0; q < 4; q++) tot += out[q] ? out[q][1] : 0;
        for (let q = 0; q < 4; q++) { SI.push(out[q] ? out[q][0] : 0); SW.push(out[q] ? out[q][1] / (tot || 1) : 0); } } }
    for (let iu = 0; iu < NU; iu++) for (let iv = 0; iv < NV; iv++) { const a = iu * (NV + 1) + iv, b = a + NV + 1; IDX.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(POS, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setIndex(IDX); geo.computeVertexNormals();
    const ms = new THREE.SkinnedMesh(geo, rig.matD); ms.position.copy(body.position); ms.quaternion.copy(body.quaternion); ms.scale.copy(body.scale); ms.bind(new THREE.Skeleton(bones, inv), body.bindMatrix); ms.frustumCulled = false; ms.castShadow = Q.shadow;
    body.parent.add(ms);
    return { mesh: ms, set: { anchor: la, chains, g: 7, damp: .88, wind: .25, head: false, torso: true, legs: true } };
  }
  // 허리띠 매듭 끝(늘어진 끈 2가닥, 흔들림 체인): 골반 뼈에 붙고 아래 3마디가 관성·중력으로 흔들림. x 는 키 비율(+ 인물 오른쪽?), 묶기 자세 좌표
  function sashTails(rig, body, h, minY, col, xs, len, opt = {}) {
    const sk = body.skeleton, BN = sk.bones, ip = BN.findIndex(b => b.name.toLowerCase() === (opt.bone || 'pelvis')); if (ip < 0) return null;
    const pel = BN[ip], Binv = sk.boneInverses[ip], BMi = new THREE.Matrix4().copy(body.bindMatrix).invert(), segs = 3, NV = 9, W = h * (opt.w || .022), bones = [pel], inv = [Binv.clone()], chains = [], POS = [], COL = [], SI = [], SW = [], IDX = [], cc = C(col), p = new THREE.Vector3();
    // 앞면 높이의 몸 표면 z: 몸 정점 중 허리 높이·x 근처 가장 앞쪽
    const pos = body.geometry.attributes.position, bm = body.bindMatrix, Y = minY + h * (opt.y || .545); let zf = h * .06;
    xs.forEach((xk, ci) => { let z = -1e9; for (let i = 0; i < pos.count; i += 3) { p.fromBufferAttribute(pos, i).applyMatrix4(bm); if (Math.abs(p.y - Y) < h * .02 && Math.abs(p.x - xk * h) < h * .02 && p.z > z) z = p.z; } if (z > -1e8) zf = z + h * .012;
      const L = h * len * (1 - ci * .18), P = []; for (let j = 0; j <= segs; j++) P.push(new THREE.Vector3(xk * h + j * h * .004 * (ci ? 1 : -1), Y - L * j / segs, zf).applyMatrix4(Binv));
      const ch = mkChain(pel, P, .03), b0 = bones.length; ch.bones.forEach((b, j) => { bones.push(b); inv.push(new THREE.Matrix4().makeTranslation(-P[j].x, -P[j].y, -P[j].z).multiply(Binv)); }); chains.push(ch);
      const base = POS.length / 3; for (let r = 0; r <= NV; r++) { const t = r / NV, w = W * (1 - t * .25); for (let q = 0; q < 2; q++) { p.set(xk * h + (q ? w : -w) / 2, Y - L * t, zf).applyMatrix4(BMi); POS.push(p.x, p.y, p.z); COL.push(cc.r * (r === NV ? .8 : 1), cc.g * (r === NV ? .8 : 1), cc.b * (r === NV ? .8 : 1));
        const sw = segW(t * segs, segs); for (let k = 0; k < 4; k++) { const e = sw[k]; SI.push(e ? (e[0] < 0 ? 0 : b0 + e[0]) : 0); SW.push(e ? e[1] : 0); } } }
      for (let r = 0; r < NV; r++) { const a = base + r * 2; IDX.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(POS, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(COL, 3)); geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setIndex(IDX); geo.computeVertexNormals();
    const ms = new THREE.SkinnedMesh(geo, rig.matD); ms.position.copy(body.position); ms.quaternion.copy(body.quaternion); ms.scale.copy(body.scale); ms.bind(new THREE.Skeleton(bones, inv), body.bindMatrix); ms.frustumCulled = false; body.parent.add(ms);
    return { mesh: ms, set: { anchor: pel, chains, g: 6, damp: .88, wind: .3, head: false, torso: !!opt.torso, legs: true } };
  }
  const SCARF_TAIL = { mikasa: ['#c81e2a', [.03, .045], .16], byakuya: ['#d8ead8', [-.03, -.045], .2], sukuna: ['#2a2a2a', [.02, .035], .12], uzui: null };
  // 허리띠 끈이 있는 인물(원작): 색·위치(키 비율 x)·길이
  const SASH_TAIL = { ichigo: ['#e8e8f0', [-.035, -.025], .12], rukia: ['#e8e8f0', [-.03, -.022], .1], zoro: ['#8a1a24', [-.04, -.03], .16], luffy: ['#e0c070', [-.05, -.042], .11], tanjiro: ['#e8e8f0', [-.035, -.027], .08], nezuko: ['#c89a5a', [.0, .01], .1], hitsugaya: ['#e8e8f0', [-.03, -.022], .1], gaara: ['#c8a060', [-.04, -.03], .12] };
  // ═══ 덧옷 메시(조끼·사신복 윗옷·열린 조끼·넥타이): 옷(또는 몸) 메시의 몸통 부분을 법선 방향으로 띄운 겹 + 작은 부품(주머니·단추·넥타이) ═══
  //  같은 뼈·같은 가중치를 그대로 써서 동작을 정확히 따라감. fn(x,y,z,뼈,색) → 띄움 배율(없으면 그 자리 겹 없음), 좌표는 키 비율(앞 +z, 위 +y)
  //  parts: 상자 [x, y, w, hgt, d, 색, 띄움] — 몸 표면 바로 위에, 가장 가까운 정점의 뼈 가중치를 받아 붙음
  function shellPart(rig, src, h, minY, fn, parts) {
    const g0 = src.geometry, pos = g0.attributes.position, nor = g0.attributes.normal, si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, n = pos.count, bones = src.skeleton.bones, bindM = src.bindMatrix, BMi = new THREE.Matrix4().copy(bindM).invert();
    const W = [], NW = [], keep = new Float32Array(n), cols = new Float32Array(n * 3), c = new THREE.Color(), v = new THREE.Vector3(), nv = new THREE.Vector3(), off = h * .0065;
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(bindM); nv.fromBufferAttribute(nor, i).transformDirection(bindM); W.push(v.clone()); NW.push(nv.clone());
      let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = comp(sw, i, k); if (w > bw) { bw = w; best = si[GET[k]](i); } }
      const k = fn(v.x / h, (v.y - minY) / h, v.z / h, bones[best].name.toLowerCase(), c); keep[i] = k || 0; if (k) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    }
    const map = new Int32Array(n).fill(-1), P = [], C = [], S = [], SWt = [], IDX = [], ix = g0.index, tri = ix ? ix.count : n, at = q => (ix ? ix.getX(q) : q);
    const put = i => { if (map[i] >= 0) return map[i]; map[i] = P.length / 3; v.copy(W[i]).addScaledVector(NW[i], off * keep[i]).applyMatrix4(BMi); P.push(v.x, v.y, v.z); C.push(cols[i * 3], cols[i * 3 + 1], cols[i * 3 + 2]); for (let k = 0; k < 4; k++) { S.push(si[GET[k]](i)); SWt.push(comp(sw, i, k)); } return map[i]; };
    for (let q = 0; q + 2 < tri; q += 3) { const a = at(q), b = at(q + 1), d = at(q + 2); if (keep[a] && keep[b] && keep[d]) IDX.push(put(a), put(b), put(d)); }
    (parts || []).forEach(([px, py, pw, ph, pd, pc, po]) => { // 부품 상자: 표면 높이는 근처 정점의 가장 앞쪽
      const X = px * h, Y = minY + py * h, zs = (() => { let z = -1e9, nb = -1, nd = 1e9; for (let i = 0; i < n; i++) { const w = W[i]; const dx = w.x - X, dy = w.y - Y; if (Math.abs(dx) < h * .015 && Math.abs(dy) < h * .015 && w.z > z) z = w.z; const dd = dx * dx + dy * dy + (w.z > 0 ? 0 : 1e3); if (dd < nd) { nd = dd; nb = i; } } return [z > -1e8 ? z : h * .08, nb]; })();
      const bx = new THREE.BoxGeometry(pw * h, ph * h, pd * h).toNonIndexed(), bp = bx.attributes.position, base = P.length / 3, cc = new THREE.Color(pc), nb = zs[1];
      for (let i = 0; i < bp.count; i++) { v.set(bp.getX(i) + X, bp.getY(i) + Y, bp.getZ(i) + zs[0] + off * (po || 1) + pd * h / 2).applyMatrix4(BMi); P.push(v.x, v.y, v.z); C.push(cc.r, cc.g, cc.b); for (let k = 0; k < 4; k++) { S.push(si[GET[k]](nb)); SWt.push(comp(sw, nb, k)); } IDX.push(base + i); }
    });
    if (!IDX.length) return null;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(S, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SWt, 4)); geo.setIndex(IDX); smoothNormals(geo);
    const ms = new THREE.SkinnedMesh(geo, rig.mat); ms.position.copy(src.position); ms.quaternion.copy(src.quaternion); ms.scale.copy(src.scale); ms.bind(src.skeleton, src.bindMatrix); ms.frustumCulled = false; ms.castShadow = Q.shadow; ms.renderOrder = 2;
    src.parent.add(ms); return ms;
  }
  const NOT_TORSO = /upperarm|lowerarm|hand|index|middle|ring|pinky|thumb|thigh|calf|foot|ball|head|eye|jaw|tongue|teeth/;
  // 인물별 덧옷(원작): 조끼(지퍼·두루마리 주머니·등 소용돌이·높은 깃) / 사신복 윗옷(겹친 V깃·흰 속옷 깃·허리띠, 대장 하오리는 겉에) / 루피 앞 열린 조끼(단추) / 상디 넥타이
  const SHELL = {
    vest: (col) => ({ fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .515 || y > .842) return 0; if (/neck/.test(b) && y > .835) return 0;
        const ax = Math.abs(x), front = z > .01; c.set(col);
        if (y > .8) { c.multiplyScalar(.9); return 1.9; }                                              // 높은 깃(말린 목둘레)
        if (front && ax < .004) { c.set('#26282a'); return 1.25; }                                    // 지퍼
        if (!front) { const r = Math.hypot(x, (y - .705) * 1.1); if (r < .03 && r > .019) c.set('#b8261e'); else if (r < .006) c.set('#b8261e'); } // 등 소용돌이 무늬(붉은 원)
        if (y < .54) { c.multiplyScalar(.82); return 1.35; }                                           // 아랫단
        return 1.15; },
      parts: [[-.047, .715, .026, .05, .013, col, 1.2], [-.047, .66, .026, .045, .013, col, 1.2], [.047, .715, .026, .05, .013, col, 1.2], [.047, .66, .026, .045, .013, col, 1.2], // 가슴 두루마리 주머니 2×2
        [-.047, .742, .028, .008, .016, '#2a3a28', 1.3], [-.047, .684, .028, .008, .016, '#2a3a28', 1.3], [.047, .742, .028, .008, .016, '#2a3a28', 1.3], [.047, .684, .028, .008, .016, '#2a3a28', 1.3]] }), // 주머니 덮개
    shini: (sash, coat, ext) => ({ fn: (x, y, z, b, c) => { if (ext && ext.badge && /upperarm_l/.test(b) && y > .69 && y < .725) { c.set(Math.abs(y - .707) < .006 && z > 0 ? '#c8243a' : '#f4f4f8'); return 2.2; } // 부대장 완장
        if (NOT_TORSO.test(b) || y < .49 || y > .83) return 0;
        if (ext && ext.strap && Math.abs(-x + (y - .68) * .75) < .011 && y > .55 && y < .8) { c.set(ext.strap); return 2.0; } // 가슴을 가로지르는 띠
        const ax = Math.abs(x), front = z > .005, sk = /neck/.test(b);
        if (sk && y > .8) return 0;
        if (coat && !(front && ax < .055) && y > .53) { c.set(coat.c); return 1.6; }                  // 대장 하오리(겉, 앞이 트임)
        if (y < .565 && y > .512) { c.set(sash); return 2.1; }                                         // 허리띠
        if (y <= .512) { c.set('#101014'); return 1; }
        if (front) { const vw = Math.max(0, (y - .6) / .23) * .05, lap = x < 0 ? .0 : .004;              // 겹친 V깃(왼쪽 섶이 위)
          if (ax < vw - .012 + lap) { c.set('#e8c8a8'); return .3; }                                    // V 안(가슴)
          if (ax < vw + lap) { c.set('#f2f2f4'); return 1.55; } }                                       // 흰 속옷 깃
        c.set('#101014'); return 1.1; } }),
    luffy: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || /neck/.test(b) || y < .555 || y > .812) return 0; const front = z > .005, ax = Math.abs(x);
        if (front && ax < .029) return 0; c.set('#c81e2a'); if ((front && ax < .036) || y < .57) c.multiplyScalar(.78); return 1.2; }, // 앞섶 트임·단 그늘
      parts: [[.034, .74, .009, .009, .006, '#f0c830', 1.3], [.034, .69, .009, .009, .006, '#f0c830', 1.3], [.034, .64, .009, .009, .006, '#f0c830', 1.3], [-.034, .74, .009, .009, .006, '#f0c830', 1.3], [-.034, .69, .009, .009, .006, '#f0c830', 1.3], [-.034, .64, .009, .009, .006, '#f0c830', 1.3]] },
    kimono: (c, c2, obi) => ({ fn: (x, y, z, b, cc) => { if (NOT_TORSO.test(b) || y < .5 || y > .83) return 0; if (/neck/.test(b) && y > .8) return 0; const ax = Math.abs(x), front = z > .005;
        if (y < .6 && y > .52) { cc.set(obi); if (front && Math.abs(y - .56) < .006) cc.set('#e8c8a0'); return 2.2; }                     // 넓은 띠(오비) + 띠끈
        if (front) { const vw = Math.max(0, (y - .63) / .2) * .045; if (ax < vw - .01) { cc.set('#f6dcc8'); return .3; } if (ax < vw + .002) { cc.set('#f4f4f0'); return 1.5; } }
        const k = PAT.hemp((Math.atan2(x, z) / (Math.PI * 2) + 1) % 1, (.83 - y) / .3); cc.set(c).lerp(new THREE.Color(c2), k); return 1.1; } }),
    sanji: { fn: () => 0, parts: [[-.018, .823, .02, .016, .01, '#f4f4f8', 2], [.018, .823, .02, .016, .01, '#f4f4f8', 2], [0, .808, .016, .014, .012, '#16161c', 1.6], [0, .78, .02, .04, .006, '#16161c', 1.5], [0, .74, .025, .045, .006, '#16161c', 1.6], [0, .70, .028, .04, .006, '#16161c', 1.7], [0, .675, .022, .018, .006, '#16161c', 1.75]] }, // 넥타이(매듭 + 넓어지는 날)
    jacket: (top, sh, swirl) => ({ fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .53 || y > .835) return 0; if (/neck/.test(b) && y > .82) return 0; const front = z > .01, ax = Math.abs(x);
        c.set(y > .75 ? sh : top); if (y > .805) { c.set(sh); return 1.8; } if (front && ax < .004) { c.set('#c8ccd4'); return 1.3; } // 높은 깃·지퍼
        if (!front && swirl) { const r = Math.hypot(x, (y - .68) * 1.1), a = Math.atan2(y - .68, x); if (r < .034 && Math.abs(((r * 90 - a / (Math.PI * 2) * 3) % 1 + 1) % 1 - .5) < .2) c.set(swirl); } return 1.1; } }), // 등 소용돌이 무늬
    collar: (col) => ({ fn: (x, y, z, b, c) => { if (!/neck|spine_03|clavicle/.test(b) || y < .8 || y > .865) return 0; c.set(col); return 2.4; } }),
    zoro: { fn: (x, y, z, b, c) => { if (/upperarm_l/.test(b) && y > .7 && y < .745) { c.set('#141418'); return 2.2; } return 0; } }, // 왼팔 검은 두건
    saitama: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .52 || y > .82) return 0; if (z > .01 && Math.abs(x) < .004 && y > .62) { c.set('#c8a020'); return 1.2; } if (y > .535 && y < .565) { c.set('#141414'); return 1.8; } return 0; }, // 지퍼·검은 벨트
      parts: [[0, .55, .03, .03, .008, '#e0c040', 2.2]] },                                                                                                                       // 둥근 금 버클
    genos: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .52 || y > .83) return 0; const seam = Math.abs(((y * 40) % 1) - .5) > .44 || (Math.abs(x) < .003); c.set(seam ? '#3a3e48' : '#8a909c'); if (z > .01 && Math.hypot(x, y - .7) < .022) { c.set('#ff9a3a'); return 2.6; } return 2.0; } }, // 금속 판 갑옷·가슴 코어
    corps: { fn: () => 0, parts: [.74, .70, .66, .62].map(y => [0, y, .008, .008, .006, '#d8b040', 1.4]) },
    // 조사병단(진격의 거인): 가슴까지 오는 짧은 갈색 재킷(앞 트임 → 흰 셔츠) · 가슴 가죽 띠 X자 + 허리 띠 · 넓적다리 띠 · 등 자유의 날개 문장 · 허리 입체기동장치 상자
    aot: (o = {}) => ({ fn: (x, y, z, b, c) => { const front = z > .01, ax = Math.abs(x);
        if (/thigh/.test(b) && (Math.abs(y - .46) < .008 || Math.abs(y - .4) < .008)) { c.set('#3a2a1a'); return 1.6; }                       // 넓적다리 띠
        if (NOT_TORSO.test(b) || y < .52 || y > .835) return 0; if (/neck/.test(b) && y > .82 && !o.scarf) return 0;
        if (o.scarf && y > .79 && /neck|spine_03|clavicle/.test(b)) { c.set(o.scarf); return 3.2; }                                            // 목도리(미카사)
        if (o.tie && front && ax < .012 && y > .74 && y < .8) { c.set(o.tie); return 2.4; }                                                   // 크라바트(리바이)
        if (front && (Math.abs(ax - (y - .58) * .45) < .006) && y > .58 && y < .72) { c.set('#4a3220'); return 1.9; }                         // 가슴 X자 가죽 띠
        if (Math.abs(y - .545) < .012) { c.set('#4a3220'); return 1.9; }                                                                       // 허리 띠
        if (y > .665) { if (front && ax < .028) { c.set('#ecebe6'); return .6; } if (!front && Math.hypot(x, (y - .74) * 1.2) < .028) { c.set(Math.abs(x) < .002 ? '#f4f4f8' : x > 0 ? '#f4f4f8' : '#2a4aa0'); return 1.6; } c.set('#8a6440'); return 1.4; } // 짧은 재킷·자유의 날개
        c.set('#ecebe6'); return .6; },                                                                                                       // 흰 셔츠
      parts: [[-.075, .54, .03, .04, .05, '#7a7e88', 2.2], [.075, .54, .03, .04, .05, '#7a7e88', 2.2], [-.075, .505, .012, .03, .012, '#3a3e48', 3.4], [.075, .505, .012, .03, .012, '#3a3e48', 3.4]] }), // 입체기동장치(허리 양옆 상자·손잡이)
    // 주술고전 교복: 남색 높은 깃 + 소용돌이 단추(금) + 허리 아래 길게 / 이타도리 붉은 후드 / 고죠 검은 제복
    jjk: (col, hood) => ({ fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .845) return 0; const front = z > .01;
        if (y > .8) { if (hood && !front) { c.set(hood); return 3.4; } c.set(col); return 2.2; }                                              // 높은 깃 / 등 후드
        if (hood && !front && y > .74) { c.set(hood); return 2.4; } if (hood && front && y > .79 && Math.abs(x) > .03) { c.set(hood); return 1.8; }
        c.set(col); if (front && Math.abs(x) < .003) c.multiplyScalar(.7); return 1.1; },
      parts: [[0, .785, .016, .016, .008, '#d8b040', 2.6]] }),                                                                                 // 소용돌이 금단추
    nanami: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .83) return 0; const front = z > .01, ax = Math.abs(x);
        if (front && ax < .022 && y > .64) { c.set(ax < .007 && y < .8 ? (Math.sin(y * 300) * Math.sin(x * 900) > .3 ? '#5a3a1a' : '#e8c040') : '#2a3a6a'); return ax < .007 ? 1.8 : 1.0; } // 푸른 셔츠·표범 무늬 넥타이
        c.set('#e8dcc0'); if (front && Math.abs(ax - .028) < .003) c.multiplyScalar(.82); return 1.3; } },                                     // 베이지 정장 재킷(깃 선)
    gaara: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .83) return 0; if (Math.abs(x + (y - .68) * .8) < .012 && y > .56) { c.set('#c8a060'); return 2.2; } c.set('#7a2424'); if (y > .8) c.multiplyScalar(.8); return 1.2; } },
    kizaru: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .82) return 0; const front = z > .01; if (front && Math.abs(x) < .02 && y > .66) { c.set(Math.abs(x) < .006 && y < .79 ? '#2a2a30' : '#f4f4f8'); return 1.1; } c.set(Math.abs(((x * 60) % 1 + 1) % 1 - .5) > .42 ? '#3a3420' : '#e8c840'); return 1.2; } },
    law: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .52 || y > .845) return 0; const front = z > .01; if (y > .8 && !front) { c.set('#f0e8a0'); return 3.0; } if (front && Math.hypot(x, y - .7) < .03) { c.set(Math.hypot(x, y - .7) < .018 ? '#f0e8a0' : '#141418'); return 1.4; } c.set(y > .76 ? '#141418' : '#f0e8a0'); return 1.2; } },
    bang: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .83) return 0; const front = z > .01; if (y > .52 && y < .56) { c.set('#2a2a30'); return 2.0; } if (front) { const vw = Math.max(0, (y - .62) / .2) * .045; if (Math.abs(x) < vw - .008) { c.set('#e8c8a8'); return .3; } if (Math.abs(x) < vw) { c.set('#3a3a42'); return 1.6; } } c.set('#5a5e6a'); return 1.2; } },
    aizen: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || y < .5 || y > .84) return 0; const front = z > .01; if (y > .8) { c.set('#f4f4f8'); return 2.6; } if (y > .53 && y < .565) { c.set('#4a3a6a'); return 2.0; } if (front && Math.abs(x) < .004) { c.set('#c8c8d0'); return 1.3; } c.set('#f0f0f4'); return 1.2; } },
    ace: { fn: () => 0, parts: [-.04, -.025, -.01, .01, .025, .04].map((x, i) => [x, .79 - Math.abs(x) * .6, .012, .012, .012, '#c8241e', 2.0]) },
    itachi: { fn: (x, y, z, b, c) => { if (!/neck|spine_03|clavicle/.test(b) || y < .79 || y > .87) return 0; c.set(z > .01 && Math.abs(x) < .006 ? '#c81e2a' : '#141418'); return 3.0; } },
    uzui: { fn: (x, y, z, b, c) => { if (/upperarm/.test(b) && Math.abs(y - .735) < .012) { c.set('#c8a040'); return 2.0; } if (/lowerarm/.test(b) && Math.abs(y - .6) < .012) { c.set('#c8a040'); return 2.0; } return 0; } },
  };
  const SHELL_OF = { gaara: SHELL.gaara, kizaru: SHELL.kizaru, law: SHELL.law, bang: SHELL.bang, aizen: SHELL.aizen, ace: SHELL.ace, itachi: SHELL.itachi, uzui: SHELL.uzui, himejima: SHELL.kimono('#6a5a3a', '#4a3a2a', '#2a2a2a'),  eren: SHELL.aot(), mikasa: SHELL.aot({ scarf: '#c81e2a' }), levi: SHELL.aot({ tie: '#f4f4f8' }), armin: SHELL.aot(), reiner: SHELL.aot(),
    yuji: SHELL.jjk('#1a2038', '#c81e2a'), megumi: SHELL.jjk('#1a2038'), nobara: SHELL.jjk('#1a2038'), gojo: SHELL.jjk('#141418'), nanami: SHELL.nanami, sukuna: SHELL.kimono('#f2eee4', '#e4ded0', '#1a1a1a'), naruto: SHELL.jacket('#f07a18', '#1c1c28', '#c8243a'), sasuke: SHELL.collar('#d8dce6'), zoro: SHELL.zoro, saitama: SHELL.saitama, genos: SHELL.genos,  tanjiro: SHELL.corps, zenitsu: SHELL.corps, giyu: SHELL.corps, rengoku: SHELL.corps, muichiro: SHELL.corps, obanai: SHELL.corps, kakashi: SHELL.vest('#3e5a3a'), gai: SHELL.vest('#3a6a3a'), ichigo: SHELL.shini('#e8e8f0', null, { strap: '#8a2a1a' }), rukia: SHELL.shini('#e8e8f0', null, { badge: 1 }), byakuya: SHELL.shini('#e8e8f0', { c: '#f4f4f8' }), hitsugaya: SHELL.shini('#e8e8f0', { c: '#f4f4f8' }), kenpachi: SHELL.shini('#e8e8f0', { c: '#e8e8f0' }), luffy: SHELL.luffy, sanji: SHELL.sanji, nezuko: SHELL.kimono('#f2a6bc', '#d86a8a', '#7a2a3a'),
    mikasa_old: { fn: (x, y, z, b, c) => { if (!/neck|spine_03|clavicle/.test(b) || y < .79 || y > .87) return 0; c.set('#c81e2a'); if (Math.abs(y - .83) < .004) c.multiplyScalar(.8); return 3.2; }, // 빨간 목도리(두툼하게 감음) + 앞으로 늘어진 끝
      parts: [[.02, .76, .022, .07, .012, '#c81e2a', 2.2], [.03, .705, .02, .05, .01, '#b01a26', 2.4]] },
    annie: { fn: (x, y, z, b, c) => { if (NOT_TORSO.test(b) || z > .01 || y < .76 || y > .86) return 0; c.set('#e8e8ec').multiplyScalar(y > .83 ? .92 : 1); return 3.6; } }, // 후드(목 뒤로 접힌 두건)
    nobara: { fn: () => 0, parts: [[-.018, .74, .008, .008, .006, '#d8b040', 1.4], [-.018, .7, .008, .008, .006, '#d8b040', 1.4], [-.018, .66, .008, .008, .006, '#d8b040', 1.4]] } }; // 교복 금단추
  const WIDE_SET = new Set(['zoro', 'ichigo', 'rukia', 'byakuya', 'hitsugaya', 'kenpachi', 'aizen', 'tanjiro', 'nezuko', 'zenitsu', 'giyu', 'rengoku', 'shinobu', 'mitsuri', 'muichiro', 'sanemi', 'obanai', 'himejima', 'sukuna']); // 기모노·하오리·사신복(넓은 소매)만
  const WIDE_SLEEVE = k => { const r = regOf(k); return r.wideSleeve !== undefined ? !!r.wideSleeve : WIDE_SET.has(k); };

  // ═══ MPFB 몸(Blender+MakeHuman 플러그인으로 만든 매끈한 사람 몸, CC0) + 실제 옷 메시(CC0) — 소유자 11-05 "기하학적·속옷만 입은 듯" ═══
  // 몸 7종: 마른 근육 소년체 m_slim · 근육형 m_muscle · 평범 m_avg · 아이 체형 m_boy · 날씬한 여성 f_slim · 곡선+근육 f_curvy · 작은 체형 f_small
  // 동작: UAL 마네킹 뼈(보이지 않는 '운전 뼈대')를 기존대로 움직이고, 매 화면 MPFB 뼈로 옮겨 씀(쉬는 자세 차이는 뼈 방향 맞춤으로 보정)
  const MP_PRESET = { naruto: 'm_slim', sasuke: 'm_slim', kakashi: 'm_avg', sakura: 'f_slim', luffy: 'm_slim', zoro: 'm_muscle', sanji: 'm_slim', ichigo: 'm_slim', byakuya: 'm_avg', rukia: 'f_slim', saitama: 'm_avg', genos: 'm_slim',
    gaara: 'm_slim', itachi: 'm_slim', gai: 'm_muscle', ace: 'm_avg', kizaru: 'm_avg', law: 'm_slim', hitsugaya: 'm_boy', kenpachi: 'm_muscle', aizen: 'm_avg', tatsumaki: 'f_small', bang: 'm_avg', garou: 'm_slim',
    tanjiro: 'm_slim', nezuko: 'f_slim', zenitsu: 'm_slim', inosuke: 'm_slim', giyu: 'm_slim', rengoku: 'm_avg', shinobu: 'f_slim', uzui: 'm_muscle', mitsuri: 'f_curvy', muichiro: 'm_boy', sanemi: 'm_avg', obanai: 'm_slim', himejima: 'm_muscle', mikasa: 'f_curvy', annie: 'f_small', nobara: 'f_slim' };
  // 옷(실제 메시): LS 긴소매 셔츠+바지 · JK 재킷 · TS 반소매+바지 · SUIT 정장 / 여: FT 반소매+청바지 · FS 반소매+반바지 · FP 짧은 상의+레깅스 · FE 정장 — 색은 원작 색으로 칠함
  const GN = { LS: 'G_male_casualsuit01', JK: 'G_male_casualsuit05', TS: 'G_male_casualsuit06', SUIT: 'G_male_elegantsuit01', MSH: 'G_shoes01', FT: 'G_female_casualsuit01', FS: 'G_female_casualsuit02', FP: 'G_female_sportsuit01', FE: 'G_female_elegantsuit01', FSH: 'G_shoes02' };
  const GAR = { naruto: 'LS', sasuke: 'LS', kakashi: 'JK', sakura: 'FS', luffy: 'TS', zoro: 'TS', sanji: 'SUIT', ichigo: 'LS', byakuya: 'LS', rukia: 'FT', saitama: 'LS', genos: 'TS', gaara: 'LS', itachi: 'LS', gai: 'LS', ace: '', kizaru: 'SUIT', law: 'LS',
    hitsugaya: 'LS', kenpachi: 'LS', aizen: 'LS', tatsumaki: 'FE', bang: 'LS', garou: 'TS', tanjiro: 'LS', nezuko: 'FT', zenitsu: 'LS', inosuke: '', giyu: 'LS', rengoku: 'LS', shinobu: 'FT', uzui: '', mitsuri: 'FT', muichiro: 'LS', sanemi: 'LS', obanai: 'LS', himejima: 'LS' };
  const MPFB = {};
  function tplM(scene) { scene.updateMatrixWorld(true); const box = new THREE.Box3(); let body = null; scene.traverse(o => { if (o.isSkinnedMesh && !/^G_/.test(o.name)) body = o; }); box.setFromObject(body || scene);
    const names = new Set(); scene.traverse(o => { if (o.isBone) names.add(o.name.toLowerCase()); });
    const wp = n => { let o = null; scene.traverse(x => { if (x.isBone && x.name.toLowerCase() === n) o = x; }); return o ? new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) : null; };
    const fa = wp('foot_l'), fb = wp('ball_l'), fwd = fa && fb ? fb.sub(fa) : new THREE.Vector3(0, 0, 1);
    return { scene, h: box.max.y - box.min.y, minY: box.min.y, yaw: Math.atan2(fwd.x, fwd.z), bones: names, miss: NEED.filter(b => !names.has(b.toLowerCase())), mpfb: true }; }
  async function loadMPFB(get) {
    const names = ['m_slim', 'm_muscle', 'm_avg', 'm_boy', 'f_slim', 'f_curvy', 'f_small'];
    const res = await Promise.all(names.map(n => get('assets/mpfb/mpfb_' + n + '.glb').catch(() => null)));
    names.forEach((n, i) => { if (res[i]) MPFB[n] = tplM(res[i].scene); });
    MC.mpfb = Object.keys(MPFB).length; MC._get = get;
  }
  // ═══ 캐릭터별 커스텀 모델 드롭인(11-07, 소유자 선택 경로) ═══
  // assets/char/manifest.json = [{"key":"naruto","file":"naruto.glb","keepHead":true,"bones":{"Hips":"pelvis"}}]
  // Mixamo·VRM·UE4·Bip본 본 이름을 UE4 네이밍으로 정규화해, 기존 46개 동작 클립이 그대로 바인딩되게 한다(추가 리타깃 없음).
  // 모델은 자기 얼굴·머리·머리카락을 직접 보유 → keepHead:true(기본)면 절차형 머리 덧셈을 건너뛴다. 매니페스트 없으면 완전 no-op.
  const CHAR = MC.char = {}; MC.charReport = {};
  const CORE = ['pelvis', 'spine_03', 'neck_01', 'Head', 'hand_l', 'hand_r'];
  const UE4BONE = new Set(['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'chest', 'abdomen_01', 'neck_01', 'Head']); // 이미 UE4 정상이면 그대로 통과(파괴 금지)
  ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'].forEach(p => { UE4BONE.add(p + '_l'); UE4BONE.add(p + '_r'); });
  ['index', 'middle', 'ring', 'pinky', 'thumb'].forEach(f => [1, 2, 3].forEach(d => ['l', 'r'].forEach(s => UE4BONE.add(f + '_0' + d + '_' + s))));
  function normBone(raw) {
    const orig = String(raw || ''); if (UE4BONE.has(orig)) return orig; // 정상 UE4 이름은 절대 바꾸지 않음
    let n = orig, side = '', mt;
    if (mt = n.match(/[._\- ]([lr])$/i)) { side = mt[1].toLowerCase(); n = n.slice(0, mt.index); }
    else if (mt = n.match(/[._\- ]([lr])(?=[._\- ])/i)) { side = mt[1].toLowerCase(); n = n.slice(0, mt.index + 1) + n.slice(mt.index + 2); } // Bip 식 중간 사이드(Bip01_L_Hand · "Bip R Thigh")
    else if (/(^|[^a-z])l([._\-]|$)/i.test(n) && !/(^|[^a-z])r([._\-]|$)/i.test(n)) side = 'l';
    else if (/(^|[^a-z])r([._\-]|$)/i.test(n)) side = 'r';
    else if (/left/i.test(n)) side = 'l'; else if (/right/i.test(n)) side = 'r';
    const low = n.toLowerCase().replace(/mixamorig|mixamo|j_bip|bip01|skeleton|joint|_?bone|take|def[_-]?|vrm[_0-9]*|rig_|left|right|[_\s]+/gi, '').replace(/[^a-z0-9]/g, '');
    const S = side ? '_' + side : '';
    const fg = low.match(/(?:^|hand)(thumb|index|middle|ring|pinky)(?:fun)?0*(\d)/); if (fg) return fg[1] + '_0' + fg[2] + S;
    const sp = low.match(/^(?:spine|vertebra)(\d*)$/); if (sp) { const k = sp[1] ? Math.min(3, +sp[1] + 1) : 1; return 'spine_0' + k; }
    if (/^chest/.test(low)) return 'spine_03';
    if (/^neck/.test(low)) return 'neck_01';
    if (/^head/.test(low)) return 'Head';
    if (/^(pelvis|hips?)/.test(low)) return 'pelvis';
    if (/^(clavicle|collar|shoulder)/.test(low)) return 'clavicle' + S;
    if (/^(upperarm|arm)/.test(low)) return 'upperarm' + S;
    if (/^(lowerarm|forearm|elbow)/.test(low)) return 'lowerarm' + S;
    if (/^hand/.test(low)) return 'hand' + S;
    if (/^(thigh|upleg|upperleg)/.test(low)) return 'thigh' + S;
    if (/^(calf|shin|lowerleg|leg|knee)/.test(low)) return 'calf' + S;
    if (/^foot/.test(low)) return 'foot' + S;
    if (/^(ball|toe)/.test(low)) return 'ball' + S;
    if (low === 'root') return 'root';
    return null;
  }
  function aliasBones(scene, manual) {
    const taken = new Set(), renames = [];
    scene.traverse(o => { if (o.isBone) { const cur = (o.name || '').trim(); const want = (manual && manual[cur]) || normBone(cur); if (want && !taken.has(want)) { taken.add(want); if (want !== cur) renames.push([o, want]); } } });
    renames.forEach(([o, w]) => { o.name = w; });
    return renames.length;
  }
  function tplChar(scene) {
    scene.updateMatrixWorld(true); const box = new THREE.Box3(); let body = null;
    scene.traverse(o => { if (o.isSkinnedMesh) { if (!body) body = o; box.setFromObject(o); } });
    if (!body) return null;
    const names = new Set(); scene.traverse(o => { if (o.isBone) names.add(o.name); });
    const wp = n => { let o = null; scene.traverse(x => { if (x.isBone && x.name === n) o = x; }); return o ? new THREE.Vector3().setFromMatrixPosition(o.matrixWorld) : null; };
    const fa = wp('foot_l'), fb = wp('ball_l'), fwd = fa && fb ? fb.sub(fa) : new THREE.Vector3(0, 0, 1);
    return { scene, h: box.max.y - box.min.y, minY: box.min.y, yaw: Math.atan2(fwd.x, fwd.z), bones: names, miss: NEED.filter(b => !names.has(b)), charTpl: true };
  }
  async function loadCharBodies(get) {
    let man = null;
    try { const rp = await fetch('assets/char/manifest.json', { cache: 'no-cache' }); if (rp.status !== 200) return; man = await rp.json(); } catch (e) { return; }
    if (!man) return;
    const list = (man && man.list) || (Array.isArray(man) ? man : []);
    for (const it of list) {
      try {
        if (!it || !it.key) continue; if (!it.file) it.file = it.key + '.glb';
        const g = await get('assets/char/' + it.file);
        if (!g || !g.scene) { MC.charReport[it.key] = 'no-scene'; continue; }
        const renamed = aliasBones(g.scene, it.bones);
        const tp = tplChar(g.scene);
        if (!tp) { MC.charReport[it.key] = 'no-skinned-mesh'; continue; }
        tp.keepHead = it.keepHead !== false;
        const coreMiss = CORE.filter(b => !tp.bones.has(b));
        MC.charReport[it.key] = { bonesRenamed: renamed, coreMiss: coreMiss, h: +tp.h.toFixed(2) };
        if (coreMiss.length) continue;
        CHAR[it.key] = tp; if (it.scale) tp.scale = it.scale;
      } catch (e) { MC.charReport[it && it.key || '?'] = String(e && e.message || e); }
    }
    MC.charN = Object.keys(CHAR).length;
  }
  // 울트라: 고분할 몸(서브디비전 1단, Blender 로 구움 — tools/blender/work/make_bodies_hd.py) 을 처음 울트라가 켜질 때만 내려받아 쓰고, 다 받으면 모형을 다시 만듦
  const MPFB_HD = {};
  function ensureHD() { if (MC.hdLoading || !MC._get) return; MC.hdLoading = true; const names = ['m_slim', 'm_muscle', 'm_avg', 'm_boy', 'f_slim', 'f_curvy', 'f_small'];
    Promise.all(names.map(n => MC._get('assets/mpfb/mpfb_' + n + '_hd.glb').catch(() => null))).then(res => { names.forEach((n, i) => { if (res[i]) MPFB_HD[n] = tplM(res[i].scene); }); MC.hd = Object.keys(MPFB_HD).length; MC.px = -1; }); }
  // 뼈 옮겨 쓰기 준비: 운전 뼈대(UAL)와 MPFB 뼈를 이름으로 짝짓고, 쉬는 자세 방향 차이를 맞추는 보정 회전을 잰다
  const qT = new THREE.Quaternion(), qP = new THREE.Quaternion(), vT = new THREE.Vector3(), vS2 = new THREE.Vector3();
  // 회전은 holder 아래 사슬(부모들의 회전만 곱함)로 계산 — holder 의 덩치 배율(가로·세로 다름)이 회전을 비틀지 않게
  function chainQ(o, stop, out) { out.identity(); const a = []; for (let p = o; p && p !== stop; p = p.parent) a.push(p); for (let i = a.length - 1; i >= 0; i--) out.multiply(a[i].quaternion); return out; }
  function setupRetarget(rig, dRoot, tRoot, dSkel, tSkel) {
    const dB = {}; dRoot.traverse(o => { if (o.isBone) dB[o.name.toLowerCase()] = o; });
    rig.holder.updateMatrixWorld(true); // 복제본은 이미 쉬는 자세(pose() 는 뼈대 뿌리의 부모 변환을 무시해 틀어지므로 쓰지 않음)
    const H = rig.holder, wq = o => chainQ(o, H, new THREE.Quaternion()), wpos = o => o.getWorldPosition(new THREE.Vector3());
    const list = []; tRoot.traverse(o => { if (o.isBone) list.push(o); });
    const A = new Map();
    list.forEach(t => {
      const s = dB[t.name.toLowerCase()];
      let a = t.parent && A.get(t.parent) ? A.get(t.parent).clone() : new THREE.Quaternion();
      const tc = t.children.find(c => c.isBone && dB[c.name.toLowerCase()]);
      if (s && tc) { const sc = dB[tc.name.toLowerCase()], dt = wpos(tc).sub(wpos(t)).normalize(), ds = wpos(sc).sub(wpos(s)).normalize(); if (dt.lengthSq() > 0 && ds.lengthSq() > 0) a = new THREE.Quaternion().setFromUnitVectors(dt, ds); }
      A.set(t, a);
      t.userData.rt = s ? { s, C: wq(s).invert().multiply(a).multiply(wq(t)) } : null;
    });
    const sp = dB.pelvis, tp = list.find(b => b.name.toLowerCase() === 'pelvis');
    rig.rt = { list, sp, tp, sp0: sp ? rig.holder.worldToLocal(wpos(sp)) : null, tp0: tp ? rig.holder.worldToLocal(wpos(tp)) : null, k: sp && tp ? wpos(tp).y / Math.max(1e-3, wpos(sp).y) : 1, wq: new Map(), dRoot };
  }
  function applyRetarget(rig) {
    const R = rig.rt; if (!R) return;
    R.dRoot.updateMatrixWorld(true);
    for (let i = 0; i < R.list.length; i++) {
      const t = R.list[i], rt = t.userData.rt, pw = R.wq.get(t.parent) || chainQ(t.parent, rig.holder, qP);
      let w = R.wq.get(t); if (!w) { w = new THREE.Quaternion(); R.wq.set(t, w); }
      if (rt) { chainQ(rt.s, rig.holder, w); w.multiply(rt.C); t.quaternion.copy(pw).invert().multiply(w); }
      else w.copy(pw).multiply(t.quaternion);
    }
    if (R.sp && R.tp) { // 골반 높이·흔들림(키 비율로)
      rig.holder.worldToLocal(R.sp.getWorldPosition(vS2)).sub(R.sp0).multiplyScalar(R.k);
      vT.copy(R.tp0).add(vS2); rig.holder.localToWorld(vT); R.tp.parent.updateMatrixWorld(true); R.tp.position.copy(R.tp.parent.worldToLocal(vT));
    }
    rig.root.updateMatrixWorld(true);
  }
  const animate = (rig, dt) => { rig.mixer.update(dt); if (rig.rt) applyRetarget(rig); };

  // ═══ 변신 형태(모형 자체가 바뀌는 기술) — 기술이 f.mode·f.modeK 를 켜면 모형을 덧입히고, 유지 시간이 끝나면(또는 교대) 되돌림 ═══
  // shell: 몸을 감싸는 빛 외피(색·두께·투명도) / tint: 몸 색 덧칠 / eye: 눈동자 색 / headAdd: 얼굴 장식 / coat: 긴 코트 / wings: 얼음 날개 / hair: 머리색
  // 인물별로 바꾸려면 CHAR_ASSETS[key].forms[modeK] = {...} (교전 수치는 combat 쪽 데이터 — 여기서는 모양만)
  const FORMS = {
    kurama: { shell: { c: '#ffb020', o: .62, t: .035 }, tint: '#ffc030', tintK: .45, eye: '#ff6a10', headAdd: ['whiskerBold'], hair: '#ffd040' },     // 나루토 구미 차크라 모드: 금빛 차크라 외피·주황 눈
    sage: { eye: '#e0a020', headAdd: ['sageMarks'] },                                                                    // 선인 모드: 눈 주위 주황 무늬·두꺼비 눈
    gear2: { tint: '#ff5a4a', tintK: .55, shell: { c: '#ff8a7a', o: .18, t: .015 } },                                                                              // 루피 기어 2: 몸이 붉게(증기는 기존 이펙트)
    gear5: { hair: '#f4f4f4', tint: '#ffffff', tintK: .7, shell: { c: '#ffffff', o: .4, t: .03 } },                    // 기어 5: 흰 머리·흰 옷·하얀 구름 외피
    bankai: { coat: { c: '#0a0a0e', c2: '#c81e2a', pat: 'hem', len: 'ankle' } },                                         // 이치고 만해 천쇄참월: 긴 검은 코트(안감 붉은 끝단)
    hollow: { headAdd: ['hollowMask'], eye: '#f0c020', coat: { c: '#0a0a0e', c2: '#c81e2a', pat: 'hem', len: 'ankle' } }, // 호로화: 흰 가면(붉은 줄)
    daiguren: { wings: '#bfe8ff', tint: '#d8f0ff', tintK: .25 },                                                         // 히츠가야 대홍련빙륜환: 얼음 날개·꼬리
    gate: { tint: '#ff4a3a', tintK: .4, shell: { c: '#3aff8a', o: .3, t: .03 } },                                        // 가이 팔문: 붉은 피부·푸른 기운
    byakugo: { headAdd: ['diamond'] },                                                                                   // 사쿠라 백호인: 이마 마름모(무늬는 기존 이펙트)
    monster: { tint: '#5a2a6a', tintK: .3, shell: { c: '#8a3aff', o: .3, t: .03 } },                                    // 가로우 괴인화
    cosmic: { tint: '#2a3aaa', tintK: .4, shell: { c: '#9ab0ff', o: .4, t: .035 } },                                     // 가로우 우주적 공포
    reiatsu: { shell: { c: '#f8e040', o: .35, t: .04 } },                                                                // 켄파치 영압 해방
    hogyoku: { shell: { c: '#e8e0ff', o: .3, t: .03 } },                                                                 // 아이젠 붕옥 융합
    white: { tint: '#ffffff', tintK: .4 },
  };
  const formOf = (key, mk) => { const r = regOf(key); return (r.forms && r.forms[mk]) || FORMS[mk] || null; };
  function shellMesh(rig, sh) { // 몸·옷을 감싸는 빛 외피(같은 뼈대로 움직임)
    const m = new THREE.MeshBasicMaterial({ color: sh.c, transparent: true, opacity: sh.o, blending: THREE.AdditiveBlending, depthWrite: false, skinning: true });
    m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normalize(normal) * ' + sh.t.toFixed(4) + ';'); };
    const g = new THREE.Group(); rig.meshes.forEach(o => { const x = new THREE.SkinnedMesh(o.geometry, m); x.bind(o.skeleton, o.bindMatrix); x.position.copy(o.position); x.quaternion.copy(o.quaternion); x.scale.copy(o.scale); x.frustumCulled = false; o.parent.add(x); g.children.push(x); });
    return { list: g.children, mat: m };
  }
  function headAdds(rig, names) { // 얼굴 장식(머리 그룹에 붙임, 변신 끝나면 떼어 냄)
    const hg = rig.headG; if (!hg) return []; const R = hg.children[0].geometry.parameters.radius, out = [];
    const put = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * R, y * R, z * R); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); hg.add(m); out.push(m); };
    names.forEach(n => {
      if (n === 'hollowMask') { put(new THREE.SphereGeometry(R * 1.02, 24, 16, -Math.PI / 2.1, Math.PI / 1.05, .15, 2.5), flat('#f4f2ea'), .03, 0, 0, 0, Math.PI / 2, 0, .99, 1.06, .95);
        [-.18, .18].forEach(z => put(new THREE.PlaneGeometry(R * .08, R * .9), flat('#b01818'), 1.02, .1, z - .25, 0, Math.PI / 2, 0)); }
      if (n === 'sageMarks') [-1, 1].forEach(s => put(new THREE.RingGeometry(R * .2, R * .32, 16, 1, 0, Math.PI), flat('#e86a1a'), .86, .05, .4 * s, 0, Math.PI / 2 + s * .42, Math.PI));
      if (n === 'whiskerBold') [-1, 1].forEach(s => [0, 1, 2].forEach(i => put(new THREE.PlaneGeometry(R * .3, R * .035), flat('#2a1408'), .93, -.28 - i * .09, .55 * s, 0, Math.PI / 2 + s * .5, s * .15)));
      if (n === 'diamond') put(new THREE.CircleGeometry(R * .09, 4), flat('#9a3ad0'), .99, .5, 0, 0, Math.PI / 2, 0, 1, 1.4, 1);
    });
    return out;
  }
  function setForm(rig, f, mk) {
    if (rig.formK === mk) return;
    const old = rig.form; if (old) { if (old.undo) try { old.undo(); } catch (e) { } if (old.cloth && rig.cloths) rig.cloths = rig.cloths.filter(x => x !== old.cloth); (old.adds || []).forEach(o => o.parent && o.parent.remove(o)); (old.shell ? old.shell.list : []).forEach(o => o.parent && o.parent.remove(o)); (old.aura ? old.aura.list : []).forEach(o => o.parent && o.parent.remove(o)); (old.extra || []).forEach(o => o.parent && o.parent.remove(o)); if (old.hairRestore) old.hairRestore(); }
    if (rig.faceEyeOn && rig.faceRedraw) { rig.faceRedraw(null); rig.faceEyeOn = false; } rig.form = null; rig.formK = mk; rig.tintK = 0; rig.tint = null; if (rig.eyeMats) rig.eyeMats.forEach(([m, c]) => m.color.copy(c));
    const ELC = { kurama: '#ffb020', dark: '#8a3aff', ice: '#bfe8ff', petal: '#ff9ad0', hollow: '#f4f2ea', power: '#f8e040', steam: '#ff8a7a', fire: '#ff6a20', lightning: '#ffe85a', water: '#5ab0ff', wind: '#b0ffd0' };
    const F_ = mk && (formOf(rig.ch.key, mk) || { shell: { c: ELC[f && f.modeElem] || '#ffffff', o: .32, t: .03 } }); if (!F_) return;
    // 통계(시험용): 변신 횟수·지속
    const fs_ = MC.formStat || (MC.formStat = {}), e_ = fs_[rig.ch.key + ':' + mk] || (fs_[rig.ch.key + ':' + mk] = { n: 0, t: 0 }); e_.n++; rig.formStatE = e_;
    const st = { adds: [], extra: [] };
    if (F_.shell) { st.shell = shellMesh(rig, F_.shell); st.shellO = F_.shell.o; } // 표에 없는 변신(원소 색 오라)도 불투명도를 여기서 기억(해제·교대 직후 null 방지)
    if (F_.headAdd) st.adds = headAdds(rig, F_.headAdd);
    if (F_.build) { try { const r = F_.build(rig) || {}; (r.adds || []).forEach(o => st.adds.push(o)); st.undo = r.undo; st.tick = r.tick; } catch (e) { console.warn('[mocap] form build', e); } } // 모형 교체형 변신(거인화 등): 덧붙일 모형·되돌리기·매 화면 처리
    if (F_.tint) { rig.tint = new THREE.Color(F_.tint); rig.tintK = F_.tintK || .3; }
    if (F_.eye && rig.eyeMats) rig.eyeMats.forEach(([m]) => m.color.set(F_.eye)); if (F_.eye && rig.faceRedraw) { rig.faceRedraw(F_.eye); rig.faceEyeOn = true; }
    if (F_.hair && rig.headG) { const hairM = toon(rig.ch.P.hair || '#222'), mats = new Set(); rig.headG.traverse(o => { if (o.isMesh && o.material && (o.material === vToon() || o.material === hairM || o.material === vToonSk())) mats.add(o); }); const saved = []; mats.forEach(o => { saved.push([o, o.material]); o.material = o.isSkinnedMesh ? toonSk(F_.hair) : toon(F_.hair); }); st.hairRestore = () => saved.forEach(([o, m]) => { o.material = m; }); }
    if (F_.coat && rig.preset) { const bodyM = rig.meshes.find(o => o.name === 'Human') || rig.meshes[0], B = MPFB[rig.preset], h = B.h, waist = B.minY + h * .55, bot = B.minY + h * LEN[F_.coat.len || 'ankle'], r0 = .13;
      const g = skirtGeo(F_.coat, h, 0, bot - waist, h * r0, h * r0 * .8, true); g.translate(0, waist, 0); const ms = clothSkirt(g, bodyM, waist, bot, h * r0); if (ms) { bodyM.parent.add(ms); st.extra.push(ms); (rig.cloths = rig.cloths || []).push(ms); st.cloth = ms; } }
    if (F_.wings && rig.bones.spine_03) { const wm = new THREE.MeshBasicMaterial({ color: F_.wings, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      [-1, 1].forEach(s => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(7 * s, 6); sh.lineTo(11 * s, 2); sh.lineTo(8 * s, -1); sh.lineTo(12 * s, -4); sh.lineTo(6 * s, -3); sh.lineTo(2 * s, -6); sh.lineTo(0, 0);
        const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), wm); w.rotation.y = Math.PI / 2; w.position.set(-1.6, 1, 0); const box = new THREE.Group(); box.add(w); rig.holder.add(box); st.extra.push(box); st.wing = st.wing || []; st.wing.push(box); }); }
    { const ac = (F_.shell && F_.shell.c) || F_.hair || F_.tint || F_.wings || '#ffffff';
      if (!rig.burst) { const bm = new THREE.MeshBasicMaterial({ color: ac, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); const bs = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bm), br = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 6, 40), bm.clone()); br.rotation.x = Math.PI / 2; const bg = new THREE.Group(); bg.add(bs, br); rig.holder.add(bg); rig.burst = { g: bg, s: bs, r: br }; }
      rig.burst.s.material.color.set(ac); rig.burst.r.material.color.set(ac); rig.burstT = 0;
      if (F_.shell) { const au = Object.assign({}, F_.shell, { t: F_.shell.t * 3.2, o: F_.shell.o * .45 }); st.aura = shellMesh(rig, au); st.auraO = au.o; } }
    rig.form = st;
    // 변신 순간: 빛이 감싸며 부풀었다 가라앉음(외피 두께로)
    rig.formT = 0;
  }
  function formTick(rig, f, dt) {
    const mk = f && f.mode > 0 ? f.modeK : null; setForm(rig, f, mk);
    if (rig.burst && rig.burstT !== undefined && rig.burstT >= .7) rig.burst.g.visible = false; // 연출이 끝난 변신 고리는 항상 숨김
    if (rig.burst && rig.burstT !== undefined && rig.burstT < .7) { rig.burstT += dt; const k = Math.min(1, rig.burstT / .6), e = 1 - Math.pow(1 - k, 3); rig.burst.g.visible = true; rig.burst.g.position.set(0, 17, 0);
      rig.burst.s.scale.setScalar(3 + e * 22); rig.burst.s.material.opacity = (1 - k) * .75; rig.burst.r.scale.setScalar(4 + e * 30); rig.burst.r.position.y = -16; rig.burst.r.material.opacity = (1 - k) * .9; if (k >= 1) rig.burst.g.visible = false; }
    if (rig.formStatE && mk) rig.formStatE.t += dt;
    const st = rig.form; if (!st) { if (rig.mat.userData.tintOn) { rig.mat.userData.tintOn = 0; } return; }
    rig.formT = (rig.formT || 0) + dt; if (st.tick) try { st.tick(rig, f, dt); } catch (e) { st.tick = null; }
    if (st.aura) st.aura.mat.opacity = st.auraO * (.6 + .4 * Math.sin(rig.formT * 6)) * (1 + Math.max(0, 1 - rig.formT * 1.5) * 2);
    if (st.shell) st.shell.mat.opacity = (st.shellO || .3) * (1 + Math.max(0, 1 - rig.formT * 2) * 1.2) * (.85 + Math.sin(rig.formT * 9) * .15);
    if (st.wing && rig.bones.spine_03) { rig.bones.spine_03.getWorldPosition(vA); rig.holder.worldToLocal(vA); st.wing.forEach(b => { b.position.copy(vA); }); }
  }

  // ═══ 옷자락 물리(스프링 뼈 체인): 하오리·코트·치마·망토가 관성·중력·바람으로 흩날리고, 다리 캡슐에 막혀 몸을 뚫지 않음 ═══
  // 옷자락 정점을 '세로 줄(기둥)'마다 3마디 뼈에 나눠 붙이고, 매 화면 입자(Verlet)로 흔든 뒤 뼈 방향을 맞춘다.
  // 좌표는 holder 기준(덩치 배율 비틀림 없이). 비용: 인물당 기둥 8×3마디 ≈ 0.05ms
  function clothSkirt(g, body, waist, bot, rx, cols = PX() > 1 ? ((window.AAA && AAA.ultra) ? 18 : 12) : 8, opt = {}) {
    const th0 = opt.th0 || 0, thL = opt.thL || Math.PI * 2, full = thL >= Math.PI * 2 - 1e-3, rz = opt.rz || .8;
    const sk = body.skeleton, BN = sk.bones, bi = n => BN.findIndex(b => b.name.toLowerCase() === n), ip = bi(opt.root || 'pelvis'); if (ip < 0) return null;
    const pelvis = BN[ip], segs = 3;
    // 지금(쉬는/기본 자세) 놓인 자리 그대로 뼈를 만든다: 뼈 세계 위치 = 몸 세계행렬 × 옷자락 정점 자리, 묶음 역행렬 = 뼈세계⁻¹ × 몸세계 × bindMatrix⁻¹
    body.updateMatrixWorld(true); const MW = body.matrixWorld.clone(), BMi = new THREE.Matrix4().copy(body.bindMatrix).invert(), bones = [pelvis], inv = [sk.boneInverses[ip].clone()], chains = [];
    const L = (waist - bot) / segs, wv = new THREE.Vector3();
    for (let c = 0; c < cols; c++) {
      const th = th0 + (full ? c / cols : c / (cols - 1)) * thL, x = Math.sin(th) * rx, z = Math.cos(th) * rx * rz, ch = [];
      let parent = pelvis;
      for (let s = 0; s <= segs; s++) { // 마디 뼈(맨 아래 끝점 포함)
        const fl = 1 + s / segs * .3; wv.set(x * fl, waist - L * s, z * fl).applyMatrix4(MW);
        const b = new THREE.Bone(); b.name = 'cloth_' + c + '_' + s; parent.updateMatrixWorld(true); b.position.copy(parent.worldToLocal(wv.clone())); parent.add(b); b.updateMatrixWorld(true);
        bones.push(b); inv.push(new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(MW).multiply(BMi)); ch.push({ b, rest: b.quaternion.clone(), restPos: b.position.clone() });
        parent = b;
      }
      chains.push(ch);
    }
    // 정점 → 가장 가까운 두 기둥 × 높이 마디
    const p = g.attributes.position, n = p.count, SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); let th = Math.atan2(x, z / rz) - th0; while (th < 0) th += Math.PI * 2;
      const cf = full ? th / (Math.PI * 2) * cols : Math.min(cols - 1 - 1e-3, Math.max(0, th / thL * (cols - 1))), c0 = Math.floor(cf) % cols, c1 = full ? (c0 + 1) % cols : Math.min(cols - 1, c0 + 1), wc = cf - Math.floor(cf);
      const sf = Math.min(segs - 1e-3, Math.max(0, (waist - y) / L)), s0 = Math.floor(sf), ws = sf - s0;
      const id = (c, s) => 1 + c * (segs + 1) + s; // 0 = 골반
      // 위 마디·아래 마디 사이를 높이로, 이웃 기둥 사이를 각도로 섞음(가장 큰 4개)
      const cand = [[id(c0, s0), (1 - wc) * (1 - ws)], [id(c0, s0 + 1), (1 - wc) * ws], [id(c1, s0), wc * (1 - ws)], [id(c1, s0 + 1), wc * ws]];
      let tot = 0; cand.forEach(q => { tot += q[1]; }); cand.forEach((q, k) => { SI[i * 4 + k] = q[0]; SW[i * 4 + k] = q[1] / (tot || 1); });
    }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, side: THREE.DoubleSide, skinning: true });
    const ms = new THREE.SkinnedMesh(g, mat); ms.position.copy(body.position); ms.quaternion.copy(body.quaternion); ms.scale.copy(body.scale);
    ms.bind(new THREE.Skeleton(bones, inv), body.bindMatrix); ms.frustumCulled = false;
    ms.userData.cloth = { chains, segs, L };
    return ms;
  }
  // 다리 충돌 캡슐(holder 좌표): 넓적다리·종아리
  const cQ3 = new THREE.Quaternion(), cP = new THREE.Vector3(), cA = new THREE.Vector3(), cB = new THREE.Vector3(), cD = new THREE.Vector3(), cQ = new THREE.Quaternion(), cQ2 = new THREE.Quaternion(), cV = new THREE.Vector3(), cU = new THREE.Vector3();
  const hp = (rig, o, out) => rig.holder.worldToLocal(o.getWorldPosition(out));
  function pushOut(p, a, b, r) { cD.subVectors(b, a); const t = Math.max(0, Math.min(1, cV.subVectors(p, a).dot(cD) / (cD.lengthSq() || 1))); cU.copy(a).addScaledVector(cD, t); cV.subVectors(p, cU); const d = cV.length(); if (d < r && d > 1e-4) p.copy(cU).addScaledVector(cV, r / d); }
  function clothTick(rig, dt) {
    if (!rig.cloths || !rig.cloths.length) return;
    const b = rig.bones, caps = rig._caps || (rig._caps = [['thigh_l', 'calf_l'], ['thigh_r', 'calf_r'], ['calf_l', 'foot_l'], ['calf_r', 'foot_r']].filter(([x, y]) => b[x] && b[y]).map(([x, y]) => [new THREE.Vector3(), new THREE.Vector3(), b[x], b[y]]));
    for (let i = 0; i < caps.length; i++) { hp(rig, caps[i][2], caps[i][0]); hp(rig, caps[i][3], caps[i][1]); }
    const legR = 1.35, grav = -200 * dt * dt, wind = Math.sin(performance.now() / 700) * .03, drag = -Math.min(1.2, rig.spd * dt * .06); // 달리면 뒤로 흩날림(앞 = +x)
    rig.cloths.forEach(ms => {
      const C = ms.userData.cloth;
      C.chains.forEach(ch => {
        // 입자 준비(처음엔 쉬는 자리)
        if (!ch.pts) { ch.pts = ch.map(n => hp(rig, n.b, new THREE.Vector3())); ch.prev = ch.pts.map(v => v.clone()); ch.len = []; for (let i = 1; i < ch.length; i++) ch.len.push(ch.pts[i].distanceTo(ch.pts[i - 1])); }
        hp(rig, ch[0].b, ch.pts[0]); // 허리에 붙은 첫 점은 몸을 따라감
        for (let i = 1; i < ch.pts.length; i++) { const q = ch.pts[i], pv = ch.prev[i]; cV.subVectors(q, pv).multiplyScalar(.9); pv.copy(q); q.add(cV); q.y += grav; q.z += wind; q.x += drag * i / (ch.pts.length - 1); }
        for (let it = 0; it < 2; it++) for (let i = 1; i < ch.pts.length; i++) {
          const a = ch.pts[i - 1], q = ch.pts[i]; cV.subVectors(q, a); const d = cV.length() || 1e-4; q.copy(a).addScaledVector(cV, ch.len[i - 1] / d);
          caps.forEach(([x, y]) => pushOut(q, x, y, legR));
          q.y = Math.min(q.y, ch.pts[0].y - .25 * i); // 허리 위로 말려 올라가지 않게
        }
        // 뼈 방향 맞추기: 각 마디 뼈가 다음 입자를 향하도록(holder 기준 회전)
        for (let i = 0; i < ch.length - 1; i++) {
          const node = ch[i]; node.b.quaternion.copy(node.rest); node.b.updateMatrixWorld(true);
          const from = hp(rig, ch[i + 1].b, cB).sub(hp(rig, node.b, cA)).normalize(), to = cD.subVectors(ch.pts[i + 1], ch.pts[i]).normalize();
          const wq = chainQ(node.b, rig.holder, cQ), dq = cQ2.setFromUnitVectors(from, to); // 쉬는 방향 → 원하는 방향
          const pq = chainQ(node.b.parent, rig.holder, cQ3); node.b.quaternion.copy(pq.invert().multiply(dq).multiply(wq)); node.b.updateMatrixWorld(true);
        }
      });
    });
  }

  // ═══ 검 디테일(11-05 소유자 "검과 무기 모델링을 디테일하게"): 기존 검(손잡이·코등이·상자 날)을 같은 자리·같은 길이로 고분할 일본도로 바꿔 그림 ═══
  //  칼날: 마름모 단면(능선 시노기)·칼등·휜 날(소리)·뾰족 끝(깃사키)·하몬 물결 무늬(정점 색) / 하바키(금 고리) / 코등이: 원판 + 투각 구멍 4 + 테 / 손잡이: 감은 끈이 엇갈리는 마름모 무늬 + 끝 장식
  //  넓은 칼(이치고 참월): 넓은 외날·흰 날끝·천 감은 손잡이. 원래 검 조각은 그리기 층에서만 빼고(보이기 동기화는 그대로) 새 검을 그 자식으로 붙임
  const katC = {}; const katMat = () => katC.m || (katC.m = (() => { const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, side: THREE.DoubleSide }); m.userData.matUp = 1; return m; })());
  function colGeo(g, fn) { const p = g.attributes.position, c = [], t = new THREE.Color(); for (let i = 0; i < p.count; i++) { fn(p.getX(i), p.getY(i), p.getZ(i), t); c.push(t.r, t.g, t.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; }
  function katanaHD(len, w, th, col, big) {
    const G = new THREE.Group(), add = g => { const m = new THREE.Mesh(g, katMat()); G.add(m); return m; }, steel = new THREE.Color(col || '#e8eef5'), N = PX() > 1 ? ((window.AAA && AAA.ultra) ? 72 : 48) : 24;
    // 칼날: 길이 방향 N 마디 × 단면 6점(칼등 2·능선 2·날끝 1·반대 능선) — y 는 -0.5 → -0.5-len, z 가 날 쪽
    const P = [], I = [], C2 = [], cc = new THREE.Color(), W = big ? w : Math.max(w, .5), T = big ? th : Math.max(th, .16);
    for (let i = 0; i <= N; i++) { const t = i / N, y = -.5 - t * len, sori = Math.sin(t * Math.PI * .9) * len * (big ? 0 : .025), tip = t > .9 ? (1 - t) / .1 : 1, ww = W * (big ? 1 : (1 - t * .25)) * (big ? (t > .94 ? (1 - t) / .06 * .7 + .3 : 1) : Math.max(.05, tip)), tt = T * (1 - t * .3);
      const back = -ww / 2 + sori, edge = ww / 2 + sori + (big ? 0 : 0), ridge = back + ww * .3, ring = [[0, back], [tt / 2, ridge], [0, edge], [-tt / 2, ridge]];
      ring.forEach(([x, z], k) => { P.push(x, y, z); const ham = .55 + Math.sin(t * 60) * .08 + Math.sin(t * 23) * .05; const isEdge = k === 2 || (k !== 0 && (z - back) / (ww || 1) > ham);
        cc.copy(steel); if (isEdge) cc.lerp(new THREE.Color('#ffffff'), .55); else if (k === 0) cc.multiplyScalar(.78); if (big && k === 2) cc.set('#ffffff'); C2.push(cc.r, cc.g, cc.b); }); }
    for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; I.push(a, c, b, b, c, d); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); bg.setIndex(I); bg.computeVertexNormals(); add(bg);
    if (!big) {
      add(colGeo(new THREE.BoxGeometry(T * 1.6, .45, W * 1.08), (x, y, z, t) => t.set('#c8a040')).translate(0, -.55, 0));                                                     // 하바키
      const ts = add(colGeo(new THREE.CylinderGeometry(.85, .85, .16, 40), (x, y, z, t) => { const r = Math.hypot(x, z); t.set(r > .74 ? '#b08a30' : '#3a3428'); })); ts.position.y = -.38; // 코등이(테·몸)
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2 + .78, h = add(colGeo(new THREE.CylinderGeometry(.13, .13, .18, 10), (x, y, z, t) => t.set('#0c0a08'))); h.position.set(Math.cos(a) * .48, -.38, Math.sin(a) * .48); }); // 투각 구멍
    } else add(colGeo(new THREE.BoxGeometry(T * 2, .3, W * .5), (x, y, z, t) => t.set('#2a2a30'))).translate(0, -.4, -W * .25);
    // 손잡이: 감은 끈 마름모(정점 색) + 끝 장식
    const hg = new THREE.CylinderGeometry(.32, .3, 3, PX() > 1 ? 24 : 14, PX() > 1 ? 40 : 20); colGeo(hg, (x, y, z, t) => { const a = Math.atan2(z, x) / (Math.PI * 2), u = (y + 1.5) * 1.6; const d = Math.abs(((u + a * 2) % 1 + 1) % 1 - .5) + Math.abs(((u - a * 2) % 1 + 1) % 1 - .5); t.set(big ? (Math.floor(u * 3) % 2 ? '#e8e4dc' : '#c8c0b0') : d < .42 ? '#f0ece4' : '#16141a'); }); hg.translate(0, 1.2, 0); add(hg);
    add(colGeo(new THREE.SphereGeometry(.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), (x, y, z, t) => t.set('#b08a30'))).position.y = 2.7;                                                  // 끝 장식(카시라)
    return G;
  }
  // 인물별 고유 무기(원작): 날 모양(톱날·이 빠짐·찌르기 바늘·넓은 식칼·입체기동 마디 날)과 손잡이·코등이 색
  const WEAPON = {
    zoro: { r: { wrap: '#f2f2f2', tsuba: '#c8a040' }, l: { wrap: '#7a1418', tsuba: '#2a2a30' } },               // 오른손 와도이치몬지(흰 끈) · 왼손 산다이 키테츠(붉은 끈)
    inosuke: { saw: 1, steel: '#8a96a8', wrap: '#5a4a3a' },                                                    // 톱날 쌍칼(이 빠진 톱니)
    kenpachi: { chip: 1, wrap: '#2a2a30' },                                                                    // 이 빠진 칼
    shinobu: { needle: 1, wrap: '#4a3a7a', tsuba: '#a07ad0', fly: 1 },                                         // 찌르기 전용 가는 칼 + 나비 코등이
    uzui: { cleaver: 1, chain: 1, wrap: '#c8a040', steel: '#c8ccd8' },                                         // 넓은 식칼 쌍칼 + 사슬
    levi: { odm: 1 }, mikasa: { odm: 1 }, eren: { odm: 1 },                                                   // 입체기동 마디 날(끊어 쓰는 칼날 이음선)
    tanjiro: { wrap: '#1a1a1a', tsuba: '#2a2a30' }, giyu: { wrap: '#2a3a5a' }, rengoku: { wrap: '#8a2a1a', tsuba: '#c84a1a' }, zenitsu: { wrap: '#d8b030' }, muichiro: { wrap: '#2a6a6a' }, obanai: { wrap: '#4a4a5a' }, sanemi: { wrap: '#2a5a3a' },
  };
  function weaponShape(blade, W_, la, wa, bb, sz) { // 날 정점 모양 바꾸기(폭 방향 w 0=칼등 ~ 1=날끝)
    const p = blade.geometry.attributes.position, G = k => p['get' + k.toUpperCase()].bind(p), S = k => p['set' + k.toUpperCase()].bind(p);
    for (let i = 0; i < p.count; i++) { const u = (G(la)(i) - bb.min[la]) / (sz[la] || 1), w = (G(wa)(i) - bb.min[wa]) / (sz[wa] || 1); let nw = w;
      if (W_.saw && w > .6) nw = .6 + (w - .6) * (.35 + .65 * Math.abs(((u * 18) % 1) - .5) * 2);                 // 톱니
      if (W_.chip && w > .7) { const k = Math.sin(u * 37) * Math.sin(u * 11); if (k > .55) nw = .7 + (w - .7) * .2; } // 이 빠짐
      if (W_.needle) nw = .5 + (w - .5) * .3;                                                                   // 가는 찌르기 날
      if (W_.cleaver) nw = w * 2.1 - (u > .9 ? (u - .9) * 6 * w : 0);                                            // 넓은 식칼(끝은 비스듬히)
      if (nw !== w) S(wa)(i, bb.min[wa] + nw * sz[wa]); }
    p.needsUpdate = true; blade.geometry.computeVertexNormals();
  }
  function upgradeSword(s, key, side) {
    const W_0 = WEAPON[key] || {}, W_ = Object.assign({}, W_0, W_0[side] || {}); // s: 복제된 기존 검(model-hd: 상자 손잡이 + 원통 코등이 + 휜 날 압출) — 같은 자리·크기로 세부를 덧입힘
    if (MC.swordHD === false) return; const ms = []; s.traverse(o => { if (o.isMesh && o.geometry) ms.push(o); });
    const box = new THREE.Box3(), len = o => { o.geometry.computeBoundingBox(); const sz = o.geometry.boundingBox.getSize(new THREE.Vector3()); return Math.max(sz.x, sz.y, sz.z); };
    const blade = ms.filter(o => o.geometry.type === 'ExtrudeGeometry').sort((x, y) => len(y) - len(x))[0];
    if (blade) { // 날: 하몬(날끝 쪽 흰 물결)·능선(밝은 줄)·칼등(어둡게) — 날 폭 방향 비율로 정점 색
      const g = blade.geometry.clone(); g.computeBoundingBox(); const bb = g.boundingBox, sz = bb.getSize(new THREE.Vector3()), la = sz.x > sz.y ? 'x' : 'y', wa = la === 'x' ? 'y' : 'x', p = g.attributes.position, c = [], st = new THREE.Color(blade.material.color || '#e8eef5'), t = new THREE.Color();
      if (W_.steel) st.set(W_.steel);
      for (let i = 0; i < p.count; i++) { const u = (p['get' + la.toUpperCase()](i) - bb.min[la]) / (sz[la] || 1), w = (p['get' + wa.toUpperCase()](i) - bb.min[wa]) / (sz[wa] || 1), ham = .6 + Math.sin(u * 55) * .07 + Math.sin(u * 19) * .05;
        t.copy(st); if (W_.odm && Math.abs(((u * 7) % 1) - .5) > .47) t.set('#3a3e48'); else if (w > ham) t.lerp(new THREE.Color('#ffffff'), .6); else if (Math.abs(w - .33) < .04) t.multiplyScalar(1.12); else if (w < .12) t.multiplyScalar(.72); c.push(t.r, t.g, t.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); blade.geometry = g; if (W_.saw || W_.chip || W_.needle || W_.cleaver) weaponShape(blade, W_, la, wa, bb, sz); const m = blade.material.clone(); m.vertexColors = true; m.color.set('#ffffff'); blade.material = m; }
    const handle = ms.filter(o => o.geometry.type === 'BoxGeometry').sort((x, y) => y.geometry.parameters.height - x.geometry.parameters.height)[0];
    if (handle) { const pr = handle.geometry.parameters, r = Math.min(pr.width, pr.depth) / 2, hg = new THREE.CylinderGeometry(r * 1.05, r, pr.height, PX() > 1 ? 24 : 14, PX() > 1 ? 40 : 20); // 손잡이: 엇갈려 감은 끈(마름모) + 끝 장식
      colGeo(hg, (x, y, z, tt) => { const an = Math.atan2(z, x) / (Math.PI * 2), u = (y / pr.height + .5) * 6; const d = Math.abs(((u + an * 2) % 1 + 1) % 1 - .5) + Math.abs(((u - an * 2) % 1 + 1) % 1 - .5); tt.set(d < .42 ? '#efe9de' : (W_.wrap || '#17151c')); });
      const hm = new THREE.Mesh(hg, katMat()); hm.position.copy(handle.position); hm.quaternion.copy(handle.quaternion); hm.scale.copy(handle.scale); handle.parent.add(hm); handle.layers.set(HIDE);
      const cap = new THREE.Mesh(colGeo(new THREE.SphereGeometry(r * 1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), (x, y, z, tt) => tt.set('#b08a30')), katMat()); cap.position.y = pr.height / 2; hm.add(cap);
      if (W_.chain) for (let i = 0; i < 9; i++) { const lk = new THREE.Mesh(colGeo(new THREE.TorusGeometry(r * .9, r * .22, 6, 12), (x, y, z, tt) => tt.set('#a8acb4')), katMat()); lk.position.set(Math.sin(i * .5) * r * 1.5, pr.height / 2 + r * 1.2 + i * r * 1.5, 0); lk.rotation.y = i % 2 ? Math.PI / 2 : 0; hm.add(lk); } }
    const tsuba = ms.filter(o => o.geometry.type === 'CylinderGeometry').sort((x, y) => y.geometry.parameters.radiusTop - x.geometry.parameters.radiusTop)[0];
    if (tsuba) { const R = tsuba.geometry.parameters.radiusTop, H = tsuba.geometry.parameters.height; // 코등이: 금 테 + 투각 구멍 4
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R * .97, H * .45, 6, 40), katMat()); colGeo(rim.geometry, (x, y, z, tt) => tt.set(W_.tsuba || '#b08a30')); rim.rotation.x = Math.PI / 2; tsuba.add(rim);
      if (W_.fly) [-1, 1].forEach(sd => { const w = new THREE.Mesh(colGeo(new THREE.CircleGeometry(R * 1.3, 3), (x, y, z, tt) => tt.set(sd < 0 ? '#c8b0f0' : '#8a5ad0')), katMat()); w.rotation.set(Math.PI / 2, 0, sd * .6); w.position.x = sd * R * .6; tsuba.add(w); }); // 나비 날개 코등이
      [0, 1, 2, 3].forEach(i => { const an = i * Math.PI / 2 + .78, h = new THREE.Mesh(colGeo(new THREE.CylinderGeometry(R * .14, R * .14, H * 1.15, 10), (x, y, z, tt) => tt.set('#0c0a08')), katMat()); h.position.set(Math.cos(an) * R * .55, 0, Math.sin(an) * R * .55); tsuba.add(h); }); }
  }
  // ═══ 카츠유(사쿠라 소환 민달팽이) 곡면 모형: 꼬리→몸통→들린 머리로 이어지는 한 덩어리(아래 납작), 등의 푸른 줄무늬, 더듬이 2(끝 검은 눈), 점액 광택 ═══
  //  canon-naruto.js 소환 장면이 window.mkKatsuyu 가 있으면 이것을 씀(앞쪽 +x 가 머리, 기존 구 5개 모형과 같은 크기·자리)
  window.mkKatsuyu = () => {
    const g = new THREE.Group(), curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-40, 3, 0), new THREE.Vector3(-26, 6, 0), new THREE.Vector3(-10, 9, 0), new THREE.Vector3(2, 12, 0), new THREE.Vector3(9, 18, 0), new THREE.Vector3(11, 22, 0)]);
    const NS = 64, NR = 40, P = [], C2 = [], I = [], cc = new THREE.Color(), rad = t => (t < .15 ? .25 + t / .15 * .75 : t < .7 ? 1 : 1 - (t - .7) / .3 * .35) * 11 * (t > .86 ? Math.sqrt(Math.max(0, 1 - ((t - .86) / .14) ** 2)) : 1); // 머리 끝은 둥글게
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3();
    for (let i = 0; i <= NS; i++) { const t = i / NS, c = curve.getPoint(t); curve.getTangent(t, T); B.crossVectors(T, up).normalize(); N.crossVectors(B, T).normalize(); const r = rad(t);
      for (let j = 0; j <= NR; j++) { const a = j / NR * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), fl = sa < 0 ? .45 : 1; // 아래(배)는 납작
        p.copy(c).addScaledVector(N, sa * r * fl).addScaledVector(B, ca * r * 1.08); if (sa < 0 && t < .75) p.y = Math.max(p.y, .2); P.push(p.x, p.y, p.z);
        const stripe = sa > .55 && Math.abs(Math.sin(t * 30)) > .55 && t < .85; cc.set(stripe ? '#4a70d0' : sa > 0 ? '#f2f5ff' : '#d8def0'); if (Math.abs(ca) < .12 && sa > .8 && t < .9) cc.set('#3a5cc0'); C2.push(cc.r, cc.g, cc.b); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C2, 3)); geo.setIndex(I); geo.computeVertexNormals();
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: new THREE.Color('#bfd8ff'), emissive: new THREE.Color('#1a2440') }); mat.userData.matUp = 1; mat.transparent = true; mat.userData.op0 = 1; // 점액 광택(사라질 때 소환 장면의 fade 가 투명도를 줄임)
    g.add(new THREE.Mesh(geo, mat));
    const head = curve.getPoint(.97); [-1, 1].forEach(sd => { const st = new THREE.CatmullRomCurve3([head.clone().add(new THREE.Vector3(0, 2, sd * 3)), head.clone().add(new THREE.Vector3(2, 6, sd * 4.2)), head.clone().add(new THREE.Vector3(4, 9, sd * 5))]);
      const tg = new THREE.TubeGeometry(st, 16, .9, 10, false); g.add(new THREE.Mesh(tg, mat)); const e = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), (() => { const m = new THREE.MeshPhongMaterial({ color: '#141420', shininess: 120, transparent: true }); m.userData.op0 = 1; return m; })()); e.position.copy(st.getPoint(1)); g.add(e); }); // 더듬이 + 눈
    return g;
  };
  function buildRig(ch) {
    const key = ch.key, P = ch.P || {}, m = ch.model, preset = regOf(key).mpfb || MP_PRESET[key] || (FEMALE.has(key) ? 'f_slim' : 'm_avg'), CU = CHAR[key] && CHAR[key].bones && !CORE.some(b => !CHAR[key].bones.has(b)) ? CHAR[key] : null, MB = !CU && MC.useMpfb !== false && ((PX() > 1 && MPFB_HD[preset]) || MPFB[preset]), B = CU || MB || TPL[bodyOf(key)], root = THREE.SkeletonUtils.clone(B.scene), holder = new THREE.Group(), inner = new THREE.Group();
    if (MB) { const want = new Set([GN[GAR[key] !== undefined ? GAR[key] : (FEMALE.has(key) ? 'FT' : 'LS')], FEMALE.has(key) || /^f_/.test(preset) ? GN.FSH : GN.MSH]); const drop = []; root.traverse(o => { if (o.isMesh && /^G_/.test(o.name) && !want.has(o.name)) drop.push(o); }); drop.forEach(o => o.parent.remove(o)); }
    const K = TARGET_H / B.h * (B.scale || 1); inner.rotation.y = Math.PI / 2 - B.yaw; inner.scale.setScalar(K); inner.position.y = -B.minY * K; inner.add(root); holder.add(inner);
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, skinning: true });
    // 몸 색도 달빛에 회색으로 바래지 않게: 정점 색의 일부를 자체 발광으로(받는 빛은 줄임) — 얼굴 피부와 같은 원리
    mat.color.setScalar(.66); mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.34;'); };
    const rig = { ch, holder, inner, root, mat, isCU: !!CU, meshes: [], outs: [], bones: {}, pairs: [], cur: null, act: null, moRef: null, swd: [], tick: 0, r: 0, combo: 0, state: null, v: new THREE.Vector3(), last: new THREE.Vector3(), spd: 0, alt: 0, body: MB ? (/^f_/.test(preset) ? 'f' : preset === 'm_muscle' ? 'm' : 'n') : bodyOf(key), preset: MB ? preset : null };
    if (PX() > 1 && MC.weave !== false && (MC.weave === true || (window.AAA && AAA.ultra))) { const wv = MC._weave || (MC._weave = (() => { const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), im = x.createImageData(S, S); // 11-07: 울트라는 직물결(weave) 자동 켬(명시 false 존중) — 옷감 실감
        for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const u = (i % 8) / 8, v = (j % 8) / 8, over = ((i >> 3) + (j >> 3)) & 1, nx = over ? Math.sin(u * Math.PI * 2) * .5 : 0, ny = over ? 0 : Math.sin(v * Math.PI * 2) * .5, k = (j * S + i) * 4; im.data[k] = 128 + nx * 100; im.data[k + 1] = 128 + ny * 100; im.data[k + 2] = 255; im.data[k + 3] = 255; }
        x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24, 24); return t; })());
      mat.normalMap = wv; mat.normalScale = new THREE.Vector2(.35, .35); } // 옷감 결(평직 법선)
    rig.matD = mat.clone(); rig.matD.side = THREE.DoubleSide; rig.matD.onBeforeCompile = mat.onBeforeCompile; rig.csets = [];
    let head = null, tq = performance.now(); const LAP = n => { const t = performance.now(); (MC.prof || (MC.prof = {}))[n] = (MC.prof[n] || 0) + t - tq; tq = t; }; /* 만들기 단계별 시간(진단용) */
    root.traverse(o => {
      if (o.isBone) { rig.bones[o.name] = o; if (o.name === 'head') rig.bones.Head = o; if (o.name === 'Root') rig.bones.root = o; }
      if (o.isSkinnedMesh) {
        if (CU) { o.material.skinning = true; o.castShadow = CU_SHADOW(); o.frustumCulled = false; rig.meshes.push(o); }
        else {
          const dark = /Joint/i.test(o.material.name || ''), r = paint(o, key, P, dark, B.h, B.minY, !!MB); if (/^G_/.test(o.name)) { o.renderOrder = 1; } o.geometry = r.g; o.material = dark ? mat.clone() : mat; if (dark) o.material.vertexColors = true;
          o.castShadow = Q.shadow; o.frustumCulled = false; rig.meshes.push(o); if (r.headR) head = r;
        }
      }
    });
    LAP('paint');
    rig.meshes.slice().forEach(o => { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; rig.outs.push(outline(o, (bb.max.y - bb.min.y) * .0045)); });
    let animRoot = root;
    if (MB) { const D = TPL.n, dRoot = THREE.SkeletonUtils.clone(D.scene), dIn = new THREE.Group(); let dSkel = null; dRoot.traverse(o => { if (o.isSkinnedMesh && !dSkel) dSkel = o.skeleton; }); const dm = []; dRoot.traverse(o => { if (o.isMesh) dm.push(o); }); dm.forEach(o => o.parent.remove(o));
      const KD = TARGET_H / D.h; dIn.rotation.y = Math.PI / 2 - D.yaw; dIn.scale.setScalar(KD); dIn.position.y = -D.minY * KD; dIn.add(dRoot); holder.add(dIn); animRoot = dRoot; rig.dRoot = dRoot; rig.dSkel = dSkel; }
    rig.mixer = new THREE.AnimationMixer(animRoot); rig.acts = {};
    Object.keys(CLIPS).forEach(n => { rig.acts[n] = rig.mixer.clipAction(CLIPS[n]); });
    scene3.add(holder); holder.visible = false; holder.userData.mcRig = 1;
    // 묶기 자세: 서 있는 기본 자세 첫 장면에서 머리·검·옷자락 자리를 잰다
    holder.position.set(0, 0, 0); holder.rotation.set(0, 0, 0); holder.scale.set(1, 1, 1); holder.updateMatrixWorld(true);
    if (MB && rig.dSkel) { const tSkel = rig.meshes[0].skeleton; setupRetarget(rig, rig.dRoot, root, rig.dSkel, tSkel); }
    rig.acts.Idle_Loop.play(); animate(rig, 0); holder.updateMatrixWorld(true);
    const hb = rig.bones.Head;
    const CU_HEAD = !!CU && CU.keepHead === false; // 커스텀 모델이지만 머리가 없으면(keepHead:false) 절차형 머리 덧셈
    if (hb && (head || CU_HEAD) && m && m.head) { // 원작 머리(머리 모양·색·눈·가면·머리띠·모자)
      rel(holder, hb, mB).decompose(vA, qA, sA);
      const box = new THREE.Group(); if (head) box.position.copy(head.headC); box.quaternion.copy(qA).invert(); box.scale.set(1 / sA.x, 1 / sA.y, 1 / sA.z); hb.add(box);
      const rH = head ? head.headR * sA.x : 0, R = (rig.preset || CU_HEAD) && MC.headRatio !== false ? TARGET_H / (headRatioOf(key) * 2.42) : rH * (rig.body === 'f' ? 1.15 : 1.09) * (regOf(key).headK || 1); rig.headR = R; if ((rig.preset || CU_HEAD) && MC.headFix !== false) { holder.updateMatrixWorld(true); const hp_ = new THREE.Vector3(); hb.getWorldPosition(hp_); holder.worldToLocal(hp_); hp_.add(new THREE.Vector3(-R * (MC.headBack || .12), R * (MC.headUp || .72), 0)); holder.localToWorld(hp_); box.position.copy(hb.worldToLocal(hp_)); } // 머리 중심을 머리 관절 바로 위·조금 뒤로 — 절차형 머리(MPFB·머리없는 커스텀) 중심 보정
      // 머리 크기 = 키 ÷ (원작 머리 대 키 비율) — 얼굴(정수리~턱끝) 높이 약 2.04R, 머리 중심이 MPFB 정수리보다 낮아 실측 보정 2.42
      if (regOf(key).oldHead) { const cv = cloneVis(m.head), hc = cv.obj, k = R * 1.13 / 2.0; hc.position.set(-.15 * k, -2.2 * k, 0); hc.rotation.set(0, 0, 0); hc.scale.setScalar(k); box.add(hc); rig.headObj = hc; rig.pairs.push(...cv.pairs); }
      else { const hg = buildHead(key, P, rig.preset && MC.mpfbFace === true ? R * (MC.faceR || .86) : R, rig, { mpfbFace: !!(rig.preset && MC.mpfbFace === true), fx: MC.faceFX || .9 }); box.add(hg); rig.headG = hg; if (rig.hairSet) rig.csets.push(rig.hairSet); const eye = new THREE.Object3D(); eye.scale.setScalar(R / 2); eye.position.set(0, -2.2 * R / 2, 0); hg.add(eye); rig.headObj = eye; rig.pairs.push([m.head, hg]); } // 1인칭 눈 기준(기존 머리 좌표와 같은 배율) · 1인칭이면 자기 머리 숨김
    }
    // 옷자락·망토(몸 좌표 = root 좌표, 템플릿 단위)
    const cs = regOf(key).cos, h = B.h, pel = rig.bones.pelvis, sp3 = rig.bones.spine_03, cm = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: typeof gm !== 'undefined' ? gm : null, side: THREE.DoubleSide });
    rig.cloth = [];
    const bodyM = rig.meshes.reduce((a, b) => (!a || b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a), null);
    const skirt = (c, open, r0) => { if (!c || !pel || !bodyM) return; const waist = B.minY + h * .55, bot = B.minY + h * LEN[c.len || 'knee'], g = skirtGeo(c, h, 0, bot - waist, h * r0, h * r0 * .78, open); g.translate(0, waist, 0);
      const ms = MB ? clothSkirt(g, bodyM, waist, bot, h * r0) : skinSkirt(g, bodyM, waist, bot, B.minY + h * .28, h * r0); if (ms) { ms.castShadow = Q.shadow; bodyM.parent.add(ms); rig.skirts = (rig.skirts || []).concat(ms); if (ms.userData.cloth) (rig.cloths = rig.cloths || []).push(ms); } };
    if (cs.hakama) skirt(Object.assign({ pleat: 14 }, cs.hakama), false, rig.body === 'f' ? .1 : .11); // 하카마(사신복 아래)
    if (cs.coat) skirt(cs.coat, !cs.coat.closed, rig.body === 'm' ? .125 : .115);
    if (cs.skirt) skirt(cs.skirt, false, rig.body === 'f' ? .1 : .105);
    if (cs.cape && sp3 && MB && bodyM) { const top = B.minY + h * .8, bot = B.minY + h * .18, rx = h * .13, cs2 = { c: cs.cape }, th0 = Math.PI * .62, thL = Math.PI * .76, seg = 20 * (PX() > 1 ? 4 : 1), rows = 10 * (PX() > 1 ? 4 : 1), pos = [], col = [], idx = [], cc = C(cs.cape);
      for (let r = 0; r <= rows; r++) { const v = r / rows, y = top + (bot - top) * v, fl = 1 + v * .45; for (let s = 0; s <= seg; s++) { const th = th0 + thL * s / seg; pos.push(Math.sin(th) * rx * fl, y, Math.cos(th) * rx * .75 * fl - h * .01); col.push(cc.r, cc.g, cc.b); } }
      for (let r = 0; r < rows; r++) for (let s = 0; s < seg; s++) { const a = r * (seg + 1) + s, b2 = a + seg + 1; idx.push(a, b2, a + 1, b2, b2 + 1, a + 1); }
      const cgm = new THREE.BufferGeometry(); cgm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cgm.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); cgm.setIndex(idx); cgm.computeVertexNormals();
      const ms = clothSkirt(cgm, bodyM, top, bot, rx, 5, { root: 'spine_03', th0, thL, rz: .75 }); if (ms) { ms.castShadow = Q.shadow; bodyM.parent.add(ms); (rig.cloths = rig.cloths || []).push(ms); } }
    else if (cs.cape && sp3) { const cg = capeGeo(cs.cape, h); cg.translate(0, -h * .3, 0); const ms = new THREE.Mesh(cg, cm); const mm = new THREE.Matrix4().makeTranslation(0, B.minY + h * .8, -h * .085); ms.castShadow = true; rig.cloth.push(attach(sp3, root, mm, ms)); }
    // 넓은 소매(체인) · 덧옷 메시(조끼·사신복 윗옷·열린 조끼·넥타이) — MPFB 몸만
    LAP('retarget·head·skirt');
    if (MB && bodyM) {
      if (WIDE_SLEEVE(key) && MC.sleeves !== false) ['l', 'r'].forEach(sd => { try { const r = sleeveChain(rig, bodyM, sd, cs, P, h); if (r) { rig.csets.push(r.set); (rig.sleeves = rig.sleeves || []).push(r.mesh); } } catch (e) { console.warn('[mocap] 소매', key, e); } });
      const ST_ = regOf(key).sashTail !== undefined ? regOf(key).sashTail : SASH_TAIL[key]; const CF_ = cs.coat && !cs.coat.closed && cs.coat.sleeves && MC.haoriFlap !== false ? cs.coat : null; if (CF_) { try { const r = sashTails(rig, bodyM, h, B.minY, CF_.c, [-.058, .058], .2, { bone: 'spine_03', y: .77, torso: true, w: .032 }); if (r) { rig.csets.unshift(r.set); rig.flap = r.mesh; } } catch (e) { console.warn('[mocap] 하오리 앞자락', key, e); } } /* 하오리·겉옷 앞자락 2장(가슴 앞에서 늘어져 흔들림) */
      const SC_ = SCARF_TAIL[key]; if (SC_ && MC.sashTail !== false) { try { const r = sashTails(rig, bodyM, h, B.minY, SC_[0], SC_[1], SC_[2], { bone: 'spine_03', y: .79, torso: true }); if (r) { rig.csets.push(r.set); rig.scarf = r.mesh; } } catch (e) { console.warn('[mocap] 목도리 끝', key, e); } }
      if (ST_ && MC.sashTail !== false) { try { const r = sashTails(rig, bodyM, h, B.minY, ST_[0], ST_[1], ST_[2]); if (r) { rig.csets.push(r.set); rig.sash = r.mesh; } } catch (e) { console.warn('[mocap] 허리띠 끈', key, e); } }
      const SH = regOf(key).shell !== undefined ? regOf(key).shell : SHELL_OF[key];
      if (SH && MC.shells !== false) { const src = rig.meshes.find(o => /^G_/.test(o.name) && !/shoes/i.test(o.name)) || bodyM; try { const ms = shellPart(rig, src, h, B.minY, SH.fn, SH.parts); if (ms) { rig.shell = ms; rig.outs.push(outline(ms, h * .0045)); } } catch (e) { console.warn('[mocap] 덧옷', key, e); } }
    }
    // 검: 새끼손가락 → 검지 쪽(주먹 위)으로 날이 나오게
    const grip = (side, grp) => {
      const W = regOf(key).weapon || {}, hand = rig.bones[W[side] || ('hand_' + side)], i1 = rig.bones['index_01_' + side], p1 = rig.bones['pinky_01_' + side], m1 = rig.bones['middle_01_' + side], m2 = rig.bones['middle_02_' + side];
      if (!hand || !i1 || !p1 || !grp) return;
      const H = id => rel(holder, id, new THREE.Matrix4()), pos = o => new THREE.Vector3().setFromMatrixPosition(H(o));
      const y = pos(i1).sub(pos(p1)).normalize(), fx = pos(m2).sub(pos(m1)).normalize(), x = fx.sub(y.clone().multiplyScalar(fx.dot(y))).normalize(), z = new THREE.Vector3().crossVectors(x, y);
      const basis = new THREE.Matrix4().makeBasis(x, y, z); basis.setPosition(pos(hand).lerp(pos(m1), .6));
      const cv = cloneVis(grp), s = cv.obj; s.position.set(0, 0, 0); s.rotation.set(0, 0, 0); s.scale.set(1, 1, 1);
      attach(hand, holder, basis, s); rig.pairs.push(...cv.pairs); rig.swd.push({ orig: grp, obj: s }); try { upgradeSword(s, key, side); } catch (e) { console.warn('[mocap] 검 디테일', key, e); }
    };
    if (m && m.swd) { grip('r', m.swd.grp); if (m.swd.grp2) grip('l', m.swd.grp2); }
    LAP('sleeve·shell·sword'); MC.prof.n = (MC.prof.n || 0) + 1;
    rig.acts.Idle_Loop.stop(); rig.cur = null; rig.state = null;
    return rig;
  }
  const VAR = MC.var = new Map(); /* 인물별 모형 2벌: n 보통 · hd 고분할(울트라에서 가까운 인물만). MC.rigs 에는 지금 쓰는 쪽(다른 파일이 읽음) */
  const mkVar = (ch, hd) => { MC._builtAt = frameN; let r; MC._bpx = hd ? 2 : 1; try { r = buildRig(ch); } catch (e) { console.error('[mocap] 인물 만들기 실패', ch.key, e); r = { bad: true }; } MC._bpx = 0; if (!r.bad) r.hd = hd; return r; };
  const varOf = ch => { let v = VAR.get(ch.key); if (!v) VAR.set(ch.key, v = {}); return v; };
  const rigOf = ch => { if (!MC.ready || !MC.on || !ch || !ch.model) return null; let r = MC.rigs.get(ch.key); if (!r) { const v = varOf(ch); r = v.n || (v.n = mkVar(ch, false)); MC.rigs.set(ch.key, r); } return r.bad ? null : r; };
  const hdOf = ch => { const v = varOf(ch); if (!v.hd) { v.hd = mkVar(ch, true); if (!v.hd.bad) { v.hd.holder.visible = false; v.hd.warm = 2; } } return v.hd.bad ? null : v.hd; };
  // 거리 단계(이력 있음): 가까워지면 near 안에서 고분할, 멀어지면 far 밖에서 보통 — 경계에서 깜빡이지 않게
  const lodWant = (f, rig) => { if (!ULTRA() || MC.lod === false || !MC.hd) return false; camera.getWorldPosition(camP); const d = camP.distanceTo(f.pos), H = 33 * MS * (f.scale || 1); const near = (MC.lodNear || 3.4) * H, far = (MC.lodFar || 4.2) * H; f._lodHD = f._lodHD ? d < far : d < near; return f._lodHD; };
  function lodSwap(f) { const k = f.ch.key, v = varOf(f.ch), cur = MC.rigs.get(k); const want = lodWant(f) ? (v.hd && !v.hd.bad ? v.hd : null) : (v.n || null); if (!want || want === cur || want.warm > 0) return;
    if (cur && !cur.bad) cur.holder.visible = false; want.state = null; want.act = null; MC.rigs.set(k, want); MC.lodSw = (MC.lodSw || 0) + 1; }

  // ═══ 공통 동작 상태기(모든 인물 같은 규칙) ═══
  // 상태: Idle·Walk·Run·Sprint·Combat Stance·Attack Combo·Heavy·Skill Cast·Dodge·Block·Hit·Knockback·Stagger·Knockdown·Get Up·Death
  // 상태 → 클립(같은 뼈 65개 UAL 동작). once: 한 번 재생 / hit: 적중 시점(클립 진행률) / next: 끝나면 이어갈 상태
  const ST = {
    Idle: { c: 'Idle_Loop' }, Walk: { c: 'Walk_Loop', ref: 14 }, Run: { c: 'Jog_Fwd_Loop', ref: 35 }, Sprint: { c: 'Sprint_Loop', ref: 59 },
    CombatStance: { c: 'Sword_Idle' }, AttackCombo: { c: ['Punch_Jab', 'Punch_Cross'], once: 1, hit: .38, fit: 1 }, Heavy: { c: 'Punch_Cross', once: 1, hit: .45, fit: 1, slow: 1.35 },
    SwordCombo: { c: 'Sword_Attack', once: 1, hit: .42, fit: 1 }, Kick: { c: 'Punch_Cross', once: 1, hit: .45, fit: 1, kick: 1, min: .42 }, SkillCast: { c: 'Spell_Simple_Enter', once: 1, next: 'SkillHold' }, SkillHold: { c: 'Spell_Simple_Idle_Loop' }, SkillRelease: { c: 'Spell_Simple_Shoot', once: 1, hit: .4, fit: 1 },
    Dodge: { c: 'Roll', once: 1, fit: 1, min: .45 }, Block: { c: 'Spell_Simple_Idle_Loop', ts: .5 }, Hit: { c: ['Hit_Chest', 'Hit_Head'], once: 1 }, Knockback: { c: 'Hit_Chest', once: 1, ts: .7 },
    Stagger: { c: 'Hit_Head', once: 1, ts: .55 }, Knockdown: { c: 'Death01', once: 1, ts: 1.6 }, GetUp: { c: 'Death01', once: 1, ts: -1.9 }, Death: { c: 'Death01', once: 1 },
    Taunt: { c: ['Dance_Loop', 'Idle_Talking_Loop'] }, PowerUp: { c: 'Spell_Simple_Idle_Loop' }, Tired: { c: 'Crouch_Idle_Loop', ts: 1.3 }, Air: { c: 'Jump_Loop' }, JumpUp: { c: 'Jump_Start', once: 1, next: 'Air' }, Land: { c: 'Jump_Land', once: 1, ts: 1.6 },
  };
  // 이벤트 훅(교전 쪽에서 씀): mocapOn('hit'|'state', fn) → fn({ f, key, state, clip, t })
  const HOOK = { hit: [], state: [] };
  window.mocapOn = (type, fn) => { (HOOK[type] || (HOOK[type] = [])).push(fn); return () => { HOOK[type] = HOOK[type].filter(x => x !== fn); }; };
  const emit = (type, d) => { const L = HOOK[type]; if (L) for (let i = 0; i < L.length; i++) try { L[i](d); } catch (e) { console.error('[mocap hook]', e); } };

  const swordOf = f => !!(f.model && f.model.swd && f.model.swd.grp && f.model.swd.grp.visible);
  function catOf(f) {
    if (f.mo && f.mo.d && f.mo.d.cat) return f.mo.d.cat;
    const p = String(f.hpose || '');
    if (f.hand || (f.giantArm || 0) > .05 || (f.stretch || 0) > .05) return 'cast';
    if (/slash|k_|sword|iai|cut/.test(p)) return 'cut'; if (/kick|sweep|axe|knee/.test(p)) return 'kick'; if (/punch|palm|elbow|upper|shoulder|feint/.test(p)) return 'strike';
    if (/seal|charge/.test(p)) return 'charge'; if (/cast/.test(p)) return 'cast'; if (/block|uke/.test(p)) return 'defend'; if (/hurt/.test(p)) return 'hurt'; if (/kneel/.test(p)) return 'down';
    if (/air|flip/.test(p)) return 'air'; if (/land/.test(p)) return 'land'; if (/run/.test(p)) return 'run'; if (/duck|dodge|step/.test(p)) return 'evade'; if (/taunt|point/.test(p)) return 'taunt';
    return 'idle';
  }
  // 상황(기존 판단 결과) → 상태
  const noFistOf = rig => !!(window.TACTICS && TACTICS.STYLE && rig.ch && TACTICS.STYLE[rig.ch.key] && TACTICS.STYLE[rig.ch.key].noFist); /* attack-moves.js 11-05 */
  function stateFor(f, rig) {
    const sw = swordOf(f), air = f.air && f.pos.y > 3, spd = rig.spd, kb = f.kb ? Math.hypot(f.kb.x, f.kb.z) : 0;
    let cat = catOf(f);
    if (f.stun > .8 && !air) return 'Knockdown';
    if (kb > 120 && cat !== 'down') return 'Knockback';
    if (f.stun > .35 && cat !== 'hurt') return 'Stagger';
    if (f.stun > 0 && cat !== 'down' && cat !== 'hurt') cat = 'hurt';
    if (air && !/hurt|cut|strike|kick|cast/.test(cat)) return f.vel && f.vel.y > 60 ? 'JumpUp' : 'Air';
    if (/idle|tired|hurtIdle|taunt/.test(cat) && spd > 40) cat = 'run';
    switch (cat) {
      case 'run': case 'strafe': return spd > 45 ? 'Sprint' : spd > 18 ? 'Run' : 'Walk';
      case 'retreat': return 'Walk';
      case 'strike': return noFistOf(rig) ? 'Kick' : 'AttackCombo'; /* 손 금지 인물(상디)은 주먹 클립 대신 차기 */
      case 'kick': return rig.r < .25 && !(window.TACTICS && TACTICS.STYLE && TACTICS.STYLE[rig.ch.key] && TACTICS.STYLE[rig.ch.key].noFist) ? 'Heavy' : 'Kick'; /* 손 금지 인물(상디)은 Heavy(주먹 클립) 대신 Kick — attack-moves.js 11-05 */
      case 'cut': return sw ? 'SwordCombo' : noFistOf(rig) ? 'Kick' : 'AttackCombo';
      case 'defend': return 'Block';
      case 'evade': return 'Dodge';
      case 'hurt': return 'Hit';
      case 'down': return f.stun > .3 ? 'Knockdown' : 'PowerUp'; // 기술의 'kneel' 자세(변신·기 모으기)는 넘어짐이 아님 — 맞아서 쓰러질 때(stun)만 눕기(소유자 11-05 '변신하면 뒤로 눕는다')
      case 'land': return 'Land';
      case 'air': return 'Air';
      case 'charge': return 'SkillCast';
      case 'cast': return f.hand ? 'SkillHold' : 'SkillRelease';
      case 'taunt': return 'Taunt';
      case 'tired': return 'Tired';
      default: return sw ? 'CombatStance' : 'Idle';
    }
  }
  function clipOf(rig, st, f) {
    const s = ST[st], c = s.c;
    if (Array.isArray(c)) return st === 'AttackCombo' ? c[rig.combo++ % c.length] : c[rig.r < .5 ? 0 : 1];
    if (st === 'Idle' && F.length === 1 && Math.floor(performance.now() / 5000) % 3 === 2) return 'Idle_Talking_Loop'; // 혼자 몸풀기: 가끔 몸 털기
    return c;
  }
  function enter(rig, f, st) {
    const s = ST[st], n = clipOf(rig, st, f), a = rig.acts[n]; if (!a) return;
    const clip = a.getClip();
    let ts = s.ts || 1;
    if (s.fit && f && f.mo && f.mo.dur) ts = Math.min(2.6, Math.max(.9, clip.duration / Math.max(s.min || .3, f.mo.dur * 1.6))) / (s.slow || 1);
    if (s.ref) ts = Math.min(st === 'Walk' ? 1.4 : 2.2, Math.max(.6, rig.spd / s.ref)); // 이동 속도 맞춤(발 미끄러짐 줄임)
    if (st === 'Walk' && f && f.mo && f.mo.d && f.mo.d.cat === 'retreat') ts = -Math.abs(ts);
    a.reset(); a.setLoop(s.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!s.once; a.enabled = true; a.timeScale = ts; a.setEffectiveWeight(1); a.play();
    if (ts < 0) a.time = clip.duration;
    const fade = s.once ? .08 : .2;
    if (rig.act && rig.act !== a) rig.act.crossFadeTo(a, fade, false); else a.fadeIn(fade);
    rig.act = a; rig.cur = n; rig.state = st; rig.hitDone = !s.hit; if (s.kick) rig.kickT = ['front', 'round', 'axe'][Math.floor(Math.random() * 3)];
    if (f) emit('state', { f, key: rig.ch.key, state: st, clip: n, t: performance.now() });
  }
  const doneOf = rig => { const a = rig.act; if (!a || !ST[rig.state] || !ST[rig.state].once) return false; const d = a.getClip().duration; return a.timeScale < 0 ? a.time <= .02 : a.time >= d - .02; };
  function drive(f, rig, dt) {
    const moChanged = f.mo !== rig.moRef; rig.moRef = f.mo; if (moChanged) rig.r = Math.random();
    const s = rig.state && ST[rig.state], fin = doneOf(rig);
    let want = null;
    if (!rig.state) want = stateFor(f, rig);
    else if (fin) {
      if (rig.state === 'Knockdown') want = f.stun > .3 ? null : 'GetUp';        // 넘어져 있다가 일어남
      else if (s.next) want = s.next;
      else want = stateFor(f, rig);
      if (want && ST[want].once && want === rig.state && !moChanged) want = rig.spd > 40 ? 'Run' : swordOf(f) ? 'CombatStance' : 'Idle'; // 같은 한 번짜리 반복 방지
    } else if (moChanged || (!s.once && rig.tick++ % 10 === 0)) {
      const w = stateFor(f, rig);
      if (s.once && !moChanged) want = null;                                     // 한 번짜리 동작은 끝까지(다음 판단 전까지)
      else if (w !== rig.state || (ST[w].once && moChanged)) want = w;
      else if (s.ref) rig.act.timeScale = Math.min(rig.state === 'Walk' ? 1.4 : 2.2, Math.max(.6, rig.spd / s.ref)) * Math.sign(rig.act.timeScale || 1);
    }
    if (rig.state === 'Knockdown' && want && want !== 'GetUp' && !fin) want = null; // 넘어진 중엔 다른 동작 안 함
    if (rig.state === 'Death') want = null; // KO 는 그대로 누워 있음(교대·되살리기 때 setChar 로 새로 시작)
    if (want && s && s.hit && !rig.hitDone && !fin && !/Hit|Knock|Stagger/.test(want)) want = null; // 공격은 적중 시점까지 이어감(맞을 때만 끊김)
    if (want && s && s.hit && !rig.hitDone) { rig.hitDone = true; emit('hit', { f, key: rig.ch.key, state: rig.state, clip: rig.cur, t: performance.now(), cut: true }); } // 맞아서 끊기면 그때 알림
    if (want) enter(rig, f, want);
    animate(rig, dt);
    if (ST[rig.state] && ST[rig.state].kick) kickOverlay(rig);
    stanceOverlay(rig); powerOverlay(rig); postureFix(rig);
    clothTick(rig, dt);
    // 적중 시점 이벤트(교전 쪽 훅)
    const st2 = ST[rig.state];
    if (st2 && st2.hit && !rig.hitDone && rig.act) { const p = rig.act.time / rig.act.getClip().duration; if (p >= st2.hit) { rig.hitDone = true; emit('hit', { f, key: rig.ch.key, state: rig.state, clip: rig.cur, t: performance.now() }); } }
  }

  // 발차기(무료 동작 묶음에 없음): 주먹 동작 위에 다리 뼈 회전을 덧입힘 — 앞차기·돌려차기·내려찍기
  const KAX = new THREE.Vector3(), qK = new THREE.Quaternion(), qWk = new THREE.Quaternion(), KF = new THREE.Vector3(), KL = new THREE.Vector3(), KU = new THREE.Vector3(0, 1, 0);
  function rotW(bone, axisW, ang) { if (!bone || !ang) return; bone.getWorldQuaternion(qWk); KAX.copy(axisW).applyQuaternion(qWk.invert()).normalize(); qK.setFromAxisAngle(KAX, ang); bone.quaternion.multiply(qK); bone.updateMatrixWorld(true); }
  function kickOverlay(rig) {
    if (rig.amOwn) return; /* attack-moves.js 가 이 공격의 다리 동작을 맡음 */
    const a = rig.act; if (!a) return; const p = Math.min(1, a.time / a.getClip().duration), s = Math.sin(Math.PI * Math.min(1, p * 1.15)), b = rig.bones;
    rig.holder.updateMatrixWorld(true); KF.set(1, 0, 0).applyQuaternion(rig.holder.quaternion); KL.crossVectors(KF, KU).normalize();
    const chamber = Math.sin(Math.PI * Math.min(1, p * 2.2)) * (p < .45 ? 1 : .15);
    if (rig.kickT === 'front') { rotW(b.thigh_r, KL, 1.55 * s); rotW(b.calf_r, KL, -1.6 * chamber); rotW(b.spine_01, KL, -.25 * s); }
    else if (rig.kickT === 'round') { rotW(b.pelvis, KU, .7 * s); rotW(b.thigh_r, KF, -1.25 * s); rotW(b.thigh_r, KL, .9 * s); rotW(b.calf_r, KL, -1.3 * chamber); rotW(b.spine_02, KF, .35 * s); }
    else { const up = Math.sin(Math.PI * Math.min(1, p * 1.7)); rotW(b.thigh_r, KL, 2.1 * up); rotW(b.spine_01, KL, -.3 * up); }
  }
  // ═══ 인물별 기본 자세(소유자 11-05 "체형·자세로 멀리서도 누구인지"): 서 있기·전투 대기·걷기 위에 등뼈·목·어깨·팔 각도를 덧입힘 ═══
  //  sl 등 굽힘(+ 구부정, - 가슴 폄) · hd 고개 숙임 · sh 어깨 올림(+ 움츠림) · ar 팔 벌림 · lb 뒤로 젖힘(골반 위) · tl 고개 갸웃
  const STANCE = {
    naruto: { sl: -.06, ar: .12 }, sasuke: { sl: -.04, hd: -.06 }, kakashi: { sl: .2, hd: .12, sh: -.04 }, sakura: { sl: -.04, ar: .04 }, luffy: { sl: .06, ar: .14 }, zoro: { sl: -.1, ar: .16 }, sanji: { lb: .08, ar: -.04 },
    ichigo: { sl: .1, hd: .04 }, byakuya: { sl: -.1, hd: -.08 }, rukia: { sl: -.06, ar: .04 }, saitama: { sl: .06, hd: .02 }, genos: { sl: -.06, ar: .06 }, gaara: { sl: -.02, ar: -.04 }, itachi: { sl: -.04, hd: .04 },
    gai: { sl: -.18, ar: .2 }, ace: { sl: .02, ar: .1 }, kizaru: { lb: .14, sl: .04, ar: .08 }, law: { sl: .06, hd: .04 }, hitsugaya: { sl: -.08 }, kenpachi: { sl: .14, ar: .26, hd: -.04 }, aizen: { sl: -.08, hd: -.04 },
    tatsumaki: { sl: -.1, hd: -.08, ar: .06 }, bang: { sl: .12, hd: .06 }, garou: { sl: .2, ar: .2, hd: -.06 }, tanjiro: { sl: -.04, ar: .06 }, nezuko: { sl: .04, sh: .06, tl: .12 }, zenitsu: { sl: .24, sh: .14, hd: .06, ar: -.06 },
    inosuke: { sl: .3, ar: .3, hd: -.1 }, giyu: { sl: 0, hd: .03 }, rengoku: { sl: -.18, ar: .1, hd: -.04 }, shinobu: { sl: -.04, tl: .1 }, uzui: { sl: -.14, ar: .14 }, mitsuri: { sl: .06, sh: .08, ar: -.08, tl: .1 },
    muichiro: { sl: .06, hd: .06, tl: .12 }, sanemi: { sl: .18, ar: .2, hd: -.04 }, obanai: { sl: .12, hd: .06 }, himejima: { sl: -.06, ar: .12, hd: .05 }, mikasa: { sl: -.06, hd: .04, ar: .06 }, annie: { sl: .1, hd: .08, sh: .04, ar: -.04 }, nobara: { sl: -.08, lb: .04, ar: .1, tl: -.06 },
  };
  const STANCE_ON = { PowerUp: 0, Idle: 1, CombatStance: 1, Taunt: .7, Walk: .8, Run: .5, Sprint: .35, Block: .5, Tired: .5 };
  function powerOverlay(rig) { // 기 모으기·변신 자세: 다리 벌려 낮추고 가슴 펴고 팔을 옆·아래로 힘줘 벌림, 고개는 하늘 쪽
    if (rig.state !== 'PowerUp') { rig.puT = 0; return; } rig.puT = Math.min(1, (rig.puT || 0) + .08); const w = rig.puT, b = rig.bones; KF.set(1, 0, 0).applyQuaternion(rig.holder.quaternion); KL.crossVectors(KF, KU).normalize();
    rotW(b.spine_02, KL, -.12 * w); rotW(b.spine_03, KL, -.14 * w); rotW(b.Head, KL, -.22 * w); rotW(b.upperarm_l, KF, -.55 * w); rotW(b.upperarm_r, KF, .55 * w); rotW(b.lowerarm_l, KF, -.35 * w); rotW(b.lowerarm_r, KF, .35 * w); rotW(b.thigh_l, KF, -.12 * w); rotW(b.thigh_r, KF, .12 * w);
  }
  // 목 세우기(11-05 소유자 "목·머리가 앞으로 튀어나옴"): 동작 클립의 앞으로 숙인 목을 옆모습에서 어깨 위로 세움(목 앞기울기의 70% 되돌림). 넘어짐·구르기·공중은 그대로
  const PF_SKIP = /Knockdown|Death|GetUp|Dodge|Air|JumpUp|Land|Hit|Stagger|Knockback/;
  const pfA = new THREE.Vector3(), pfB = new THREE.Vector3();
  function postureFix(rig) {
    if (MC.neckFix === false || PF_SKIP.test(rig.state || '')) return; const b = rig.bones, nk = b.neck_01, hd = b.Head; if (!nk || !hd) return;
    const lean = () => { nk.getWorldPosition(pfA); hd.getWorldPosition(pfB); rig.holder.worldToLocal(pfA); rig.holder.worldToLocal(pfB); return Math.atan2(pfB.x - pfA.x, pfB.y - pfA.y); };
    KF.set(1, 0, 0).applyQuaternion(rig.holder.quaternion); KL.crossVectors(KF, KU).normalize();
    const sp = b.spine_02, pv = b.pelvis, top = b.neck_01; if (sp && pv) { const tl = () => { pv.getWorldPosition(pfA); top.getWorldPosition(pfB); rig.holder.worldToLocal(pfA); rig.holder.worldToLocal(pfB); return Math.atan2(pfB.x - pfA.x, pfB.y - pfA.y); }; // 상체(골반→목) 앞기울기도 세움
      const t0 = tl(), tf = (t0 - (MC.trunkLean || .03)) * (MC.trunkK || .65); if (Math.abs(tf) > .01) { rotW(sp, KL, tf); if (Math.abs(tl() - (MC.trunkLean || .03)) > Math.abs(t0 - (MC.trunkLean || .03))) rotW(sp, KL, -2 * tf); } }
    const a0 = lean(), fix = a0 * (MC.neckK || .7); if (Math.abs(fix) < .01) return; rotW(nk, KL, fix); if (Math.abs(lean()) > Math.abs(a0)) rotW(nk, KL, -2 * fix); // 방향 확인 뒤 반대로
    rotW(hd, KL, 0); }
  function stanceOverlay(rig) {
    const S = regOf(rig.ch.key).stance || STANCE[rig.ch.key]; if (!S || MC.stance === false) return; const w = STANCE_ON[rig.state] || 0; if (!w) return;
    const b = rig.bones; KF.set(1, 0, 0).applyQuaternion(rig.holder.quaternion); KL.crossVectors(KF, KU).normalize();
    if (S.lb) rotW(b.spine_01, KL, -S.lb * w);
    if (S.sl) { rotW(b.spine_02, KL, S.sl * .5 * w); rotW(b.spine_03, KL, S.sl * .5 * w); rotW(b.neck_01 || b.neck, KL, -S.sl * .55 * w); }
    if (S.hd) rotW(b.Head, KL, S.hd * w);
    if (S.tl) rotW(b.Head, KF, S.tl * w);
    if (S.sh) { rotW(b.clavicle_l, KF, S.sh * w); rotW(b.clavicle_r, KF, -S.sh * w); }
    if (S.ar) { rotW(b.upperarm_l, KF, -S.ar * w); rotW(b.upperarm_r, KF, S.ar * w); }
  }
  // 시선: 머리를 상대 쪽으로(±50°, 부드럽게)
  const qL = new THREE.Quaternion(), axL = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qW = new THREE.Quaternion();
  function lookAt(rig, f) {
    const hb = rig.bones.Head, tg = f && (f.faceT || f.target); if (!hb || !tg || !tg.pos || tg === f) { rig.look = (rig.look || 0) * .9; return; }
    const want = Math.atan2(-(tg.pos.z - f.pos.z), tg.pos.x - f.pos.x), body = rig.holder.rotation.y; // 몸이 보는 방향 기준 상대 각(앞 +x 를 y축으로 돌린 각)
    let d = want - body; d = Math.atan2(Math.sin(d), Math.cos(d)); d = Math.max(-.87, Math.min(.87, d));
    rig.look = (rig.look || 0) + (d - (rig.look || 0)) * .15;
    hb.getWorldQuaternion(qW); axL.copy(up).applyQuaternion(qW.invert()).normalize(); qL.setFromAxisAngle(axL, rig.look); hb.quaternion.multiply(qL);
  }

  function place(rig, src, f) { // src: 따라갈 기존 모형 뿌리(위치·방향·기울기·크기)
    const h = rig.holder;
    h.position.copy(src.position); h.rotation.copy(src.rotation); h.scale.copy(src.scale);
    if (rig.state === 'Knockdown' || rig.state === 'GetUp' || rig.state === 'Death') h.rotation.z = 0; // 넘어짐은 동작이 맡음
    h.visible = true;
    { const fl = f && f.flash > 0 ? 1 : 0; rig.mat.emissive.setRGB(.07 + fl * .85, .05 + fl * .85, .04 + fl * .85); if (rig.tint && rig.tintK) rig.mat.emissive.lerp(rig.tint, rig.tintK); if (rig.matD) rig.matD.emissive.copy(rig.mat.emissive); }
    if (rig.cloth) { const k = Math.min(1, rig.spd / 160); rig.cloth.forEach(c => { const u = c.userData; u.sw = (u.sw || 0) + (k * .35 - (u.sw || 0)) * .15; c.children[0].rotation.x = u.sw + Math.sin(performance.now() / 260 + u.sw * 9) * .03 * (k + .2); }); }
    const ov = Q.outline && (typeof OUT === 'undefined' || OUT.visible); rig.outs.forEach(o => { o.visible = ov; });
    for (let i = 0; i < rig.pairs.length; i++) { const p = rig.pairs[i]; p[1].visible = p[0].visible; }
  }

  // ═══ 품질(낮음·중간·높음) + 동작 LOD(먼 인물은 동작 갱신을 덜 자주) ═══
  // 측정(11-05, 5인): 그리기 호출 294·삼각형 10.5만·반투명 이펙트 조각 4,284개 — 반투명 이펙트를 숨기면 12.4→9.4ms. 그래서 단계마다 이펙트 상한·그림자·윤곽선·동작 LOD 를 함께 바꾼다
  const ULTRA = () => (MC.forcePx || (Q && Q.poly) || (window.AAA && AAA.ultra ? 2 : 1)) > 1;
  const PX = () => MC._bpx || MC.forcePx || (Q && Q.poly) || (window.AAA && AAA.ultra ? 2 : 1); // aaa.js 울트라(내부는 high)와 연동 // 울트라: 머리카락·얼굴·옷자락·소매 분할 약 2배(면 수 약 4~5배), 옷자락 체인 기둥 8→12
  const QUAL = { ultra: { outline: true, shadow: true, fxCap: 1e9, lodFar: 1e9, lodSkip: 1, poly: 2 }, low: { outline: false, shadow: false, fxCap: 22, lodFar: 70, lodSkip: 3 }, mid: { outline: true, shadow: true, fxCap: 48, lodFar: 120, lodSkip: 2 }, high: { outline: true, shadow: true, fxCap: 1e9, lodFar: 1e9, lodSkip: 1 } };
  let qName = 'mid'; try { const s = localStorage.getItem('arenaQuality'); if (QUAL[s]) qName = s; } catch (e) { }
  let Q = QUAL[qName];
  const CU_SHADOW = () => (MC.charShadow === true) || (MC.charShadow !== false && Q.shadow && ULTRA()); // 커스텀(GLB) 바디는 기본(울트라 외) 그림자 미캐스트 — 성능 확보, MC.charShadow 로 강제 가능
  window.setQuality = q => { if (!QUAL[q]) return qName; const rebuild = (QUAL[q].poly || 1) !== (Q.poly || 1); if (rebuild) { MC.rigs.forEach(r => { if (!r.bad) { scene3.remove(r.holder); if (typeof baseTop !== "undefined" && baseTop) baseTop.delete(r.holder); } }); MC.rigs.clear(); } qName = q; Q = QUAL[q]; try { localStorage.setItem('arenaQuality', q); } catch (e) { } MC.rigs.forEach(r => { if (!r.bad) r.meshes.forEach(o => { o.castShadow = r.isCU ? CU_SHADOW() : Q.shadow; }); }); return qName; };
  window.getQuality = () => qName;
  const sunL = scene3.children.find(o => o.isDirectionalLight);
  const applyQ = () => { if (sunL) sunL.castShadow = Q.shadow; };
  if (typeof fxBudget === 'function') { const _fb = fxBudget; fxBudget = function () { _fb(); applyQ(); // eslint-disable-line no-global-assign
    if (!isFinite(Q.fxCap) || typeof baseTop === 'undefined' || !baseTop) return; let k = 0; const ch = scene3.children; for (let i = ch.length - 1; i >= 0; i--) { const o = ch[i]; if (baseTop.has(o) || !o.visible || o.userData.mcRig) continue; if (++k > Q.fxCap) { o.visible = false; o.userData.fxHid = true; } } }; }
  const camP = new THREE.Vector3();

  let lastT = 0, scan = 0, frameN = 0;
  const _cu = camUpdate;
  camUpdate = function (dt, idle) { // eslint-disable-line no-global-assign
    const t0 = performance.now();
    try { if (MC.ready && MC.on) step(); } catch (e) { console.error('[mocap]', e); }
    MC.ms += (performance.now() - t0 - MC.ms) * .05;
    const r = _cu.apply(this, arguments);
    if (MC.dbgCam) try { MC.dbgCam(camera); } catch (e) { MC.dbgCam = null; } // 시험용 가까이 보기
    return r;
  };
  const tmpRoot = new THREE.Object3D();
  function tickAnim(rig, f, dt) { // 동작 LOD: 먼 인물은 몇 장면에 한 번 몰아서 갱신
    camera.getWorldPosition(camP); const far = rig.holder.position.distanceTo(camP) > Q.lodFar;
    rig.acc = (rig.acc || 0) + dt;
    if (far && (frameN + rig.id) % Q.lodSkip !== 0) return false;
    const d = rig.acc; rig.acc = 0; return d;
  }
  let rigId = 0;
  // 대기 팀원 모형 미리 만들기(교대 등장 순간 끊김 방지): 이번 화면에 새로 만든 모형이 없고 0.5초 넘게 조용하면 켠 세계관의 아직 안 만든 인물 하나를 만들어 둠(숨김)
  function prebuild() { if (MC.prebuild === false || typeof TEAMS === 'undefined' || typeof getTeams !== 'function') return; if (frameN - (MC._builtAt || 0) < 30) return;
    if (ULTRA() && MC.hd && MC.lod !== false) for (let i = 0; i < F.length; i++) { const f = F[i]; if (f.ch && f.ch.model && !varOf(f.ch).hd) { hdOf(f.ch); MC.preHD = (MC.preHD || 0) + 1; return; } }
    const ws = getTeams(); for (let i = 0; i < ws.length; i++) { const L = TEAMS[ws[i]] || []; for (let j = 0; j < L.length; j++) { const ch = CH[L[j]]; if (ch && ch.model && !MC.rigs.has(L[j])) { const r = rigOf(ch); if (r) { r.holder.visible = false; r.warm = 2; } MC.pre = (MC.pre || 0) + 1; return; } } } }
  function step() {
    { const px = ULTRA() ? 2 : 1; if (px > 1) ensureHD(); if (MC.px !== undefined && MC.px !== px && px === 1) { VAR.forEach((v, k) => { if (v.hd && !v.hd.bad) { scene3.remove(v.hd.holder); if (typeof baseTop !== "undefined" && baseTop) baseTop.delete(v.hd.holder); if (MC.rigs.get(k) === v.hd) MC.rigs.set(k, v.n); } v.hd = null; }); } if (MC.px === -1) VAR.forEach(v => { if (v.hd && !v.hd.bad) scene3.remove(v.hd.holder); v.hd = null; }); MC.px = px; } // 울트라 켜고 끌 때 모형 다시 만들기
    const now = performance.now() / 1000, dt = lastT ? Math.min(.05, now - lastT) : .016; lastT = now; frameN++;
    const seen = new Set(), doScan = (scan++ % 15) === 0;
    if (MC.lineup) { // 시험용: 대표 인물 나란히 세우기
      MC.lineup.forEach((k, i) => { const ch = CH[k], rig = MC.lineupHD && MC.hd ? hdOf(ch) : rigOf(ch); if (!rig) return; seen.add(rig); hideOld(ch.model);
        const st = MC.lineupState || 'Idle'; if (rig.state !== st || doneOf(rig)) enter(rig, null, st); animate(rig, dt); if (ST[rig.state].kick) kickOverlay(rig); rig.holder.updateMatrixWorld(true); stanceOverlay(rig); powerOverlay(rig); postureFix(rig); clothTick(rig, dt); springHair(rig, dt); chainTick(rig, dt); formTick(rig, MC.lineupForm ? { mode: 1, modeK: MC.lineupForm[k] || MC.lineupForm } : null, dt);
        tmpRoot.position.set(MC.lineupX || 0, 0, (MC.lineupZ || 0) + (i - (MC.lineup.length - 1) / 2) * 16); /* 시험용 위치(빈 자리) */ tmpRoot.rotation.set(0, 0, 0); const s = MS * (ch.bodyScale || 1), bk = ch.bulk || 1; tmpRoot.scale.set(s * bk, s, s * bk); place(rig, tmpRoot, null); });
      F.forEach(f => hideOld(f.model));
      MC.rigs.forEach(r => { if (!r.bad && !seen.has(r)) r.holder.visible = false; });
      return;
    }
    F.forEach(f => {
      if (MC.ready && MC.on && f.ch && MC.rigs.get(f.ch.key)) lodSwap(f);
      const rig = rigOf(f.ch); if (!rig) return; seen.add(rig); if (rig.id === undefined) rig.id = rigId++;
      if (typeof baseTop !== 'undefined' && baseTop && !baseTop.has(rig.holder)) baseTop.add(rig.holder); // 이펙트 상한(fxBudget)이 인물을 이펙트로 세어 숨기지 않게
      const m = f.model; if (doScan || !m._mcHid) { hideOld(m); m._mcHid = true; }
      rig.v.copy(f.pos); const d = rig.v.distanceTo(rig.last) / Math.max(dt, 1e-3); rig.last.copy(f.pos); rig.spd += ((rig.v.y > 3 ? d * .3 : d) - rig.spd) * .25;
      place(rig, m.root, f);
      const adt = tickAnim(rig, f, dt); if (adt !== false) { drive(f, rig, adt); lookAt(rig, f); rig.cacc = (rig.cacc || 0) + adt; if (rig.hd || !ULTRA() || (frameN + (rig.id || 0)) % 2 === 0) { springHair(rig, rig.cacc); chainTick(rig, rig.cacc); rig.cacc = 0; } } formTick(rig, f, dt);
    });
    // 교대로 물러나는 인물(기존 모형이 아직 보이는 동안 뛰어 나감)
    Object.values(CH).forEach(ch => {
      const m = ch.model; if (!m || !m.root.visible || F.some(f => f.ch === ch)) return;
      const rig = MC.rigs.get(ch.key); if (!rig || rig.bad) return; seen.add(rig); hideOld(m);
      if (rig.state !== 'Sprint') enter(rig, null, 'Sprint');
      animate(rig, dt); place(rig, m.root, null); formTick(rig, null, dt); // 교대로 나가는 인물: 변신 외피·오라·변신 고리를 풀고 진행(남아 보이던 테 방지)
    });
    prebuild();
    VAR.forEach(v => { const r = v.hd; if (r && !r.bad && !seen.has(r)) { if (r.warm > 0) { r.warm--; r.holder.visible = true; r.holder.position.set(0, -3000, 0); seen.add(r); } else if (MC.rigs.get(r.ch.key) !== r) r.holder.visible = false; } });
    MC.rigs.forEach(r => { if (!r.bad && !seen.has(r) && r.warm > 0) { r.warm--; r.holder.visible = true; r.holder.position.set(0, -3000, 0); seen.add(r); } });
    MC.rigs.forEach(r => { if (!r.bad && !seen.has(r)) { r.holder.visible = false; if (r.state === 'Death') r.state = null; if (r.formK) setForm(r, null, null); } }); // 무대에서 빠지면 KO·변신 풀림
  }

  // 1인칭(camview.js): 눈 위치는 새 머리(원작 머리 복제) 기준
  window.mocapHeadOf = f => { if (!MC.ready || !MC.on || !f || !f.ch) return null; const r = MC.rigs.get(f.ch.key); return r && !r.bad && r.holder.visible && r.headObj ? r.headObj : null; };
  window.setMocap = v => { MC.on = !!v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { }
    if (!MC.on) { Object.values(CH).forEach(c => c.model && (showOld(c.model), c.model._mcHid = false)); MC.rigs.forEach(r => { if (!r.bad) r.holder.visible = false; }); } return MC.on; };
  window.MOCAP_STATES = Object.keys(ST); window.MOCAP_FORMS = Object.keys(FORMS);
  window.mocapForce = (key, state) => { const v = VAR.get(key); if (v) [v.n, v.hd].forEach(x => { if (x && !x.bad && x !== MC.rigs.get(key) && ST[state]) { const f2 = F.find(y => y.ch && y.ch.key === key) || null; enter(x, f2, state); } }); const r = MC.rigs.get(key); if (!r || r.bad || !ST[state]) return false; const f = F.find(x => x.ch && x.ch.key === key) || null; enter(r, f, state); r.forced = state === 'Death' ? 1e9 : 0; return true; }; // 예: mocapForce('naruto','Death') — KO
  window.mocapState = () => ({ on: MC.on, ready: MC.ready, failed: MC.failed, quality: qName, clips: MC.clipN, rigs: MC.rigs.size, ms: +MC.ms.toFixed(2), report: MC.report,
    playing: F.map(f => { const r = MC.rigs.get(f.ch && f.ch.key); return (f.ch && f.ch.name) + ':' + (r && r.body) + ':' + (r && r.state) + '/' + (r && r.cur); }) });
})();
