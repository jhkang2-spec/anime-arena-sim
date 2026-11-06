// 원작 외형 도구: 인물 모형(뼈대 그룹)에 옷·소품·무늬를 붙이고 키·덩치를 정한다. 각 세계관 파일(looks-*.js)이 이 도구를 쓴다.
// 60fps 원칙: 인물 하나당 붙이는 조각은 같은 재질끼리 하나로 합쳐(LOOK.done) 그리기 호출을 적게 유지한다.
(function () {
  if (typeof CH === 'undefined') return;
  const toonC = {}, tex = {};
  const mat = (c, map) => { const k = c + (map ? map.uuid : ''); return toonC[k] || (toonC[k] = new THREE.MeshToonMaterial({ color: c, gradientMap: gm, map: map || null })); };
  const pend = new Map(); // model → [{parent, geo, mat}]
  const LOOK = window.LOOK = {
    // 뼈대 이름: root, body(골반), torso(몸통), head, aF/aB(위팔, .userData.fore? 아래팔은 첫 자식 그룹), legF/legB(넓적다리, .userData.knee 정강이)
    bone(m, name) {
      // 팔은 {up, fore} 묶음이다(위팔 그룹·아래팔 그룹)
      if (name === 'foreF' || name === 'foreB') { const a = name === 'foreF' ? m.aF : m.aB; return a && (a.fore || (a.isObject3D ? a : a.up)); }
      if (name === 'aF' || name === 'aB') { const a = m[name]; return a && (a.isObject3D ? a : a.up); }
      if (name === 'shinF' || name === 'shinB') { const l = name === 'shinF' ? m.legF : m.legB; return l.userData.knee || l; }
      return m[name];
    },
    // 조각 붙이기: geo 는 THREE 도형, c 는 색(또는 재질), 위치·회전·크기는 뼈대 기준(모형 단위: 키 약 34, 앞이 +x, 위가 +y)
    add(m, boneName, geo, c, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], opt = {}) {
      const parent = LOOK.bone(m, boneName); if (!parent) return null;
      const g = geo.clone(); const o = new THREE.Object3D(); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.updateMatrix(); g.applyMatrix4(o.matrix);
      const mt = c && c.isMaterial ? c : mat(c, opt.map);
      if (!pend.has(m)) pend.set(m, []); pend.get(m).push({ parent, geo: g, mat: mt, outline: opt.outline !== false });
      return g;
    },
    // 기존 부품 숨기기/색 바꾸기 (예: 머리 대신 멧돼지 탈)
    hide(m, test) { m.root.traverse(o => { if (o.isMesh && test(o)) o.visible = false; }); },
    recolor(m, from, to) { m.root.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === from.replace('#', '').toLowerCase()) o.material = mat(to, o.material.map); }); },
    // 무늬 그림(캔버스) — 같은 이름은 한 번만 만든다. draw(ctx, size)
    pattern(name, draw, size = 128, rep = [1, 1]) { if (tex[name]) return tex[name]; const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.magFilter = THREE.NearestFilter; return (tex[name] = t); },
    checker(name, a, b, n = 6) { return LOOK.pattern(name, (x, s) => { const k = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * k, j * k, k, k); } }); },
    // 키·덩치(원작 체형): h = 키 배율(기본 1), w = 덩치(가로·두께) 배율
    body(key, h = 1, w = 1) { if (CH[key]) { CH[key].bodyScale = h; CH[key].bulk = w; } },
    // 같은 뼈대·같은 재질 조각을 하나로 합쳐 붙임(윤곽선도 하나로)
    done() {
      pend.forEach((list, m) => {
        const groups = new Map();
        list.forEach(it => { const k = it.parent.uuid + '|' + it.mat.uuid + '|' + it.outline; if (!groups.has(k)) groups.set(k, { parent: it.parent, mat: it.mat, outline: it.outline, geos: [] }); groups.get(k).geos.push(it.geo.index ? it.geo.toNonIndexed() : it.geo); });
        groups.forEach(g => {
          const names = ['position', 'normal', 'uv'].filter(nm => g.geos.every(x => x.attributes[nm])), out = new THREE.BufferGeometry();
          names.forEach(nm => { const sz = g.geos[0].attributes[nm].itemSize, arr = new Float32Array(g.geos.reduce((s, x) => s + x.attributes[nm].count * sz, 0)); let off = 0; g.geos.forEach(x => { arr.set(x.attributes[nm].array, off); off += x.attributes[nm].count * sz; }); out.setAttribute(nm, new THREE.BufferAttribute(arr, sz)); });
          out.computeBoundingSphere(); const mesh = new THREE.Mesh(out, g.mat); g.parent.add(mesh);
          if (g.outline) { const e = new THREE.Mesh(out, OUT); e.scale.setScalar(1.035); mesh.add(e); }
          if (m.mats && !m.mats.includes(g.mat)) m.mats.push(g.mat);
        });
      });
      pend.clear();
      // 이미 싸우는 인물에게도 키·덩치 반영
      if (typeof F !== 'undefined') F.forEach(f => { f.scale = f.ch.bodyScale || 1; f.bulk = f.ch.bulk || 1; });
    },
    G: { // 자주 쓰는 도형
      box: (x, y, z) => new THREE.BoxGeometry(x, y, z), cyl: (r1, r2, h, s = 10, open = false) => new THREE.CylinderGeometry(r1, r2, h, s, 1, open), sph: (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h),
      cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s), tor: (r, t, rs = 6, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc), plane: (w, h) => new THREE.PlaneGeometry(w, h),
    },
  };
})();
