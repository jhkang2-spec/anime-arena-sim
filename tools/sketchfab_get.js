#!/usr/bin/env node
// Sketchfab 모델을 내려받아 assets/char/<key>.glb 로 두고 뼈대를 UE4로 정규화해 manifest.json 에 자동 반영한다.
// 사용:
//   node tools/sketchfab_get.js <uid 또는 sketchfab 페이지 URL> --key <캐릭터키> [--token <SKf-...>]   (API 경로)
//   node tools/sketchfab_get.js --url <직접 .glb 링크> --key <키> [--author A] [--license "CC-BY 4.0"]   (토큰 없이)
//   [--keep-head false] 모델에 머리가 없어 절차형 머리를 얹을 때.  [--out 파일명]
// 토큰: Sketchfab 계정 → 설정 → 액세스 토큰(권장) . 무료도 "다운로드"는 로그인 계정 기준이라 gltf_url(.glb) 는 인증 응답에만 담긴다.
// 안전장치: 파일 쓰기 전에 내용이 진짜 단일 .glb 인지 마직으로 검증(.gltf+외부 bin 는 런타임에 죽으므로 거부), CORE 뼈대 미확보 시 아무것도 쓰지 않는다.
'use strict';
const fs = require('fs'), path = require('path');
const { readGltfBuffer, normalizeJoints, isGlb } = require('./normchar.js');
const API = 'https://api.sketchfab.com/v3';
const CHARDIR = path.join(__dirname, '..', 'assets', 'char');
const MANIFEST = path.join(CHARDIR, 'manifest.json');
const ATTR = path.join(CHARDIR, 'ATTRIBUTION.txt');
function arg(n) { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : null; }
function fail(m, c) { console.error('\u2717 ' + m); process.exitCode = c || 1; const E = new Error(m); E.__fail = 1; throw E; }

(async () => {
  try {
    const key = arg('key'); if (!key) fail('--key 필요');
  const token = arg('token') || process.env.SKETCHFAB_TOKEN || '';
  const direct = arg('url');
  const keepHead = arg('keep-head') !== 'false';
  let outBase = arg('out') || key;
  if (/[\\\/]/.test(outBase)) { console.warn('warn: --out 은 파일명만(구분자 _ 로 치환)'); outBase = outBase.replace(/[\\\/]/g, '_'); }
  const file = outBase + '.glb';                       // 단일 .glb 만 지원(외부 bin/texture 런타임 미해석 방지)
  const outFile = path.join(CHARDIR, file);

  let dlUrl, lic = {}, author = arg('author') || '', title = arg('title') || '', uid = '', sourceUrl = direct || '';
  if (!direct) {
    const a = process.argv[2]; if (!a || a.startsWith('--')) fail('uid/URL 또는 --url 필요');
    const m = String(a).match(/[0-9a-f]{32}/i); uid = m ? m[0] : a;
    if (!token) fail('토큰 필요(--token 또는 SKETCHFAB_TOKEN). 또는 브라우저에서 받은 .glb 직링크로 --url.');
    let d; try { const r = await fetch(API + '/models/' + uid, { headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'anime-arena-sim/1.0' } }); if (!r.ok) throw Error('HTTP ' + r.status + ' (토큰/다운로드가능 확인)'); d = await r.json(); } catch (e) { fail('모델 조회 실패: ' + e.message); }
    if (!d.gltf_url) fail((d.gta_url ? 'gta_url(.gltf+외부 bin)만 존재 — 이 도구는 단일 .glb만 지원' : 'glb 링크 없음(다운로드 불가 모델 또는 토큰 권한 부족)'));
    dlUrl = d.gltf_url; lic = d.license || {}; author = author || (d.user && d.user.displayName) || '?'; title = title || d.name || ''; sourceUrl = d.viewerUrl || sourceUrl;
  } else dlUrl = direct;

  let buf; try { const r = await fetch(dlUrl, { headers: { 'User-Agent': 'anime-arena-sim/1.0' } }); if (!r.ok) throw Error('HTTP ' + r.status); buf = Buffer.from(await r.arrayBuffer()); } catch (e) { fail('다운로드 실패: ' + e.message); }
  if (!isGlb(buf)) {
    if (/^\s*\{/.test(buf.toString('utf8', 0, 64))) fail('내용이 .gltf(JSON + 외부 bin/texture) 로 보입니다 — 런타임이 bin 을 해석 못 해 사멸. 완전한 단일 .glb 만 지원(Sketchfab gltf_url 는 .glb).');
    fail('다운로드 내용이 .glb 아님(HTML 오류/zip 가능). URL/토큰 확인.');
  }
  let gltf; try { gltf = readGltfBuffer(buf); } catch (e) { fail('glb 파싱 실패: ' + e.message); }
  const R = normalizeJoints(gltf);
  if (!R.joints.length) fail('스킨드 메시/조인트 없음 — 리깅되지 않은 메시는 캐릭터 바디로 쓸 수 없음.');
  if (R.coreMiss.length) fail('CORE 뼈대 미확보: ' + R.coreMiss.join(',') + ' — 매니페스트 bones 에 수동 지정 후 재시도하세요.\n  자동 매핑된 뼈: ' + JSON.stringify(R.bones) + '\n  (파일/매니페스트 변경 없음)');

  // 검증 통과 후에만 쓰기
  fs.mkdirSync(CHARDIR, { recursive: true });
  fs.writeFileSync(outFile, buf);

  const entry = { key, file, keepHead }; if (Object.keys(R.bones).length) entry.bones = R.bones;
  let man = null;
  if (fs.existsSync(MANIFEST)) { try { const j = JSON.parse(fs.readFileSync(MANIFEST, 'utf8').replace(/^\uFEFF/, '')); man = (j && j.list) ? j : { list: Array.isArray(j) ? j : [] }; } catch (e) { fail('manifest.json 손상: ' + e.message + ' — 백업·복구 후 재시도(타 key 유실 방지 위해 중단).'); } }
  if (!man) man = { list: [] };
  man.list = man.list.filter(x => x && x.key !== key); man.list.push(entry);
  fs.writeFileSync(MANIFEST, JSON.stringify(man, null, 2));
  fs.appendFileSync(ATTR, '\n[key] ' + key + '\n' + [title || outBase, 'by ' + (author || '?'), 'license: ' + (arg('license') || lic.code || lic.label || '(미기록)') + (lic.name ? ' ' + lic.name : ''), 'source: ' + ((lic.url || sourceUrl) || '(직링크)') + (uid ? ('  uid:' + uid) : '')].join('\n') + '\n');

  console.log('\u2713 저장: assets/char/' + file + '  (' + (buf.length / 1024).toFixed(0) + 'KB)');
  console.log('\u9aa8 정규화: 조인트 ' + R.joints.length + ' / 재명명 ' + Object.keys(R.bones).length + ' / CORE 전부 확보');
  if (R.unmapped.length) console.log('참고 정규화 유예 뼈(선택, 전투 지장無): ' + R.unmapped.slice(0, 8).join(', ') + (R.unmapped.length > 8 ? ' 외 ' + (R.unmapped.length - 8) : ''));
  console.log('manifest 갱신됨. 브라우저 콘솔 확인: MOCAP.charReport["' + key + '"]');
  } catch (e) { if (e && e.__fail) return; console.error('실행 오류:', (e && (e.message || e)) || e); process.exitCode = 1; }
})();
