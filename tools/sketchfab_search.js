#!/usr/bin/env node
// Sketchfab 무료(다운로드 가능) 모델 탐색 — 토큰 불필요(공개 검색 API).
// 사용: node tools/sketchfab_search.js "anime character rigged" [--count 8] [--cc] [--min-anim 1] [--max-verts 60000] [--json]
//   --cc        : CC 라이선스만(비상업 포함). 라이선스 코드는 표기 — 상업 재배포는 by / by-sa / 0 만 안전.
//   --min-anim  : 애니메이션 클립 있는(리깅) 모델만. 인형 아닌 리깅 humanoid 찾는 데 유용.
//   --max-verts : 정점 상한(게임 성능). 0이면 무제한.
'use strict';
const API = 'https://api.sketchfab.com/v3';
function arg(name) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : null; }
function has(name) { return process.argv.includes('--' + name); }

(async () => {
  const q = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
  if (!q) { console.error('사용: node tools/sketchfab_search.js "<검색어>" [--count N] [--cc] [--min-anim N] [--max-verts N] [--json]'); process.exitCode = 2; return; }
  const count = Math.min(50, +(arg('count') || 8));
  const minAnim = +(arg('min-anim') || 0);
  const maxVerts = +(arg('max-verts') || 0);
  const url = API + '/search?type=models&downloadable=true&count=' + count + (has('cc') ? '&license_type=cc' : '') + '&sort_by=' + encodeURIComponent(arg('sort') || '-viewCount') + '&q=' + encodeURIComponent(q);
  let data;
  try { const r = await fetch(url, { headers: { 'User-Agent': 'anime-arena-sim/1.0' } }); if (!r.ok) throw Error('HTTP ' + r.status); data = await r.json(); }
  catch (e) { console.error('검색 실패:', e.message); process.exitCode = 1; return; }
  let res = (data.results || []).filter(m => m.isDownloadable);
  if (minAnim > 0) res = res.filter(m => (m.animationCount || 0) >= minAnim);
  if (maxVerts > 0) res = res.filter(m => (m.vertexCount || 0) <= maxVerts);
  if (has('json')) { console.log(JSON.stringify(res.map(m => ({ uid: m.uid, name: m.name, license: (m.license || {}).code || '', licenseLabel: (m.license || {}).label || '', anim: m.animationCount || 0, verts: m.vertexCount || 0, faces: m.faceCount || 0, url: m.viewerUrl, by: (m.user && m.user.displayName) || '' })), null, 2)); return; }
  if (!res.length) { console.log('조건에 맞는 다운로드 가능 모델 없음. 검색어/조건 완화 권장.'); return; }
  console.log('결과 ' + res.length + '건 (uid / license / anim / verts / 이름 / by):\n');
  res.forEach(m => {
    const L = m.license || {}, tag = (L.code || '') + ' ' + (L.label || '');
    const lic = (L.code || L.label || '?');
    const nc = /noncommercial|by-nc|\bnc\b/i.test(tag);
    const flag = nc ? ' [비상업]' : (/by|attribution|public domain|zero/i.test(tag) ? ' [CC]' : '');
    console.log('  ' + m.uid + '  ' + String(lic).slice(0, 28).padEnd(30) + ('anim=' + (m.animationCount || 0)).padEnd(9) + ('v=' + (m.vertexCount || 0)).padEnd(11) + flag + '  ' + m.name + '  (by ' + ((m.user && m.user.displayName) || '?') + ')');
    console.log('       ' + m.viewerUrl);
  });
  console.log('\n적용: node tools/sketchfab_get.js <위 uid> --key <캐릭터키> --token <SKf-...>');
})();
