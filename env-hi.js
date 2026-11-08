// ═══ 환경 고도화: 하늘 기반 조명(IBL) + 태양 반사 + PBR 재질 부스트 ═══
// (1) 하늘 equirect env 맵을 만들고 scene.environment로 걸어 PBR 바닥·바위·금속이 하늘빛을 받고(연한 필) 태양 디스크를 반사한다.
// (2) env 맵의 태양 위치/색은 day cycle(world-sky.js)과 연동 — 해가 뜨면 바닥·바위·물체에 하이글라이트가 함께 돈다.
// (3) 기존 Standard 재질의 envMapIntensity·바닥 normalScale·anisotropy를 끌어올려 질감이 빛에 더 선명하게 반응하게 한다.
// renderer/PMREM 미지원 시 조용히 스킵(try/catch). SKY.on=false 이면 env 갱신 정지.
(function () {
  if (typeof scene3 === 'undefined' || typeof THREE === 'undefined' || typeof renderer === 'undefined') return;
  if (typeof document === 'undefined') return;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // ── (1) 하늘 env 맵(2:1 equirect, 작게: 성능) ──
  const EW = 256, EH = 128;
  const cv = document.createElement('canvas'); cv.width = EW; cv.height = EH;
  const g2 = cv.getContext('2d');
  const skyTex = new THREE.CanvasTexture(cv);
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  let pmrem = null, envRT = null;
  try { pmrem = new THREE.PMREMGenerator(renderer); if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader(); } catch (e) { pmrem = null; }

  function paintSky() {
    const bg = scene3.background && scene3.background.isColor ? scene3.background : new THREE.Color('#0b1322');
    const top = bg.clone().lerp(new THREE.Color('#2a4a78'), 0.35);   // 천정 쪽 약간 짙은 하늘
    const hor = bg.clone().lerp(new THREE.Color('#cfe0f2'), 0.18);   // 지평선 밝게
    const grd = bg.clone().multiplyScalar(0.55);                     // 지면 쪽 어둡게
    const lg = g2.createLinearGradient(0, 0, 0, EH);
    lg.addColorStop(0, '#' + top.getHexString());
    lg.addColorStop(0.5, '#' + hor.getHexString());
    lg.addColorStop(0.52, '#' + grd.getHexString());
    lg.addColorStop(1, '#' + grd.getHexString());
    g2.fillStyle = lg; g2.fillRect(0, 0, EW, EH);
    // ── (2) 태양 디스크: 해 방향을 equirect UV로 ──
    if (typeof sun !== 'undefined' && sun && sun.position) {
      const d = sun.position.clone(); const L = d.length() || 1; d.divideScalar(L);
      const az = Math.atan2(d.x, d.z), el = Math.asin(clamp(d.y, -1, 1));
      const u = ((az / (Math.PI * 2)) + 0.5) * EW, v = (0.5 - el / Math.PI) * EH;
      const sc = (sun.color && sun.color.isColor ? sun.color : new THREE.Color('#fff2d8'));
      const rad = EH * 0.16;
      const rg = g2.createRadialGradient(u, v, 0, u, v, rad);
      rg.addColorStop(0, 'rgba(255,255,255,' + clamp(0.55 + sun.intensity * 0.3, 0, 1) + ')');
      rg.addColorStop(0.35, 'rgba(' + [sc.r, sc.g, sc.b].map(c => Math.round(255 * Math.min(1, c * 1.4))).join(',') + ',.7)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g2.globalCompositeOperation = 'lighter'; g2.fillStyle = rg;
      g2.beginPath(); g2.arc(u, v, rad, 0, 6.2832); g2.fill(); g2.globalCompositeOperation = 'source-over';
    }
    skyTex.needsUpdate = true;
    if (pmrem) { try { if (envRT) envRT.dispose(); envRT = pmrem.fromEquirectangular(skyTex); scene3.environment = envRT.texture; return; } catch (e) { } }
    scene3.environment = skyTex; // PMREM 없으면 equirect 직접(조금은Sharp지만 동작)
  }

  // ── (3) Standard 재질 부스트: envMapIntensity 전역 + 바닥 normalScale/anisotropy ──
  try {
    const maxAniso = renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 8;
    const bumpTex = m => ['map', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach(k => { const t = m[k]; if (t && t.anisotropy < maxAniso) { t.anisotropy = maxAniso; t.needsUpdate = true; } });
    scene3.traverse(o => {
      const m = o.isMesh && o.material; if (!m) return;
      const list = Array.isArray(m) ? m : [m];
      list.forEach(mat => {
        if (!mat.isMeshStandardMaterial) return;
        mat.envMapIntensity = Math.max(mat.envMapIntensity || 0, 1.15);
        const rad = o.geometry && o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : 0;
        if (rad > 500) { if (mat.normalScale && mat.normalScale.isVector2) mat.normalScale.set(Math.max(mat.normalScale.x, 2.1), Math.max(mat.normalScale.y, 2.1)); bumpTex(mat); }
        mat.needsUpdate = true;
      });
    });
  } catch (e) { }

  paintSky();
  let fr = 0;
  (function loop() { if (window.SKY && SKY.on) { if ((++fr % 240) === 0) paintSky(); } requestAnimationFrame(loop); })();
})();
