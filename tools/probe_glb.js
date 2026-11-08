#!/usr/bin/env node
// 공개 .glb 직링크를 내려받지 않고(파일 안 씀) 뼈대 정규화·CORE/NEED 커버리지만 미리 검증한다.
// 사용: node tools/probe_glb.js <glb-url> [glb-url ...]
'use strict';
const { readGltfBuffer, normalizeJoints, isGlb, CORE } = require('./normchar.js');
(async () => {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.error('사용: node tools/probe_glb.js <glb-url> [...]'); process.exitCode = 2; return; }
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'anime-arena-sim/1.0' } });
      if (!r.ok) { console.log('HTTP ' + r.status + '  ' + u); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!isGlb(buf)) { console.log((/^\s*\{/.test(buf.toString('utf8', 0, 64)) ? '[.gltf(bin분리?)]' : '[비-GLB]') + '  ' + u); continue; }
      const R = normalizeJoints(readGltfBuffer(buf));
      const ok = !R.coreMiss.length;
      console.log((ok ? 'OK  ' : 'NO  ') + 'joints=' + R.joints.length + ' renames=' + Object.keys(R.bones).length +
        ' CORE[' + (R.coreMiss.join(',') || '완전') + ']' + (R.collisions.length ? ' collide=' + R.collisions.length : '') + '  ' + u);
    } catch (e) { console.log('ERR ' + (e.message || e) + '  ' + u); }
  }
})();
