#!/usr/bin/env node
// 캐릭터 GLB/GLTF 뼈대를 UE4 네이밍으로 정규화하는 오프라인 도구.
// 규칙은 mocap.js 의 normBone(런타임 aliasBones)과 완전히 동일해야 한다(한쪽만 바꾸면 어긋남).
// 사용:
//   node tools/normchar.js <in.glb|in.gltf> [--key naruto] [--keep-head true|false] [--write out.gltf] [--check]
// 출력:
//   - 뼈대 매핑(old->new)과 UE4 필수 뼈(CORE/NEED) 커버리지 리포트
//   - assets/char/manifest.json 에 바로 붙일 수 있는 {"key","file","keepHead","bones":{...}} 스니펫
//   - --write: node.name 을 바꾼 정규화 .gltf 를 저장(.glb 입력도 .gltf 로 출력 — JSON 청크만 해석)
'use strict';
const fs = require('fs');
const path = require('path');

// ── mocap.js(:821 NEED, :822 CORE/UE4BONE, :825 normBone)와 1:1 동기 ──
const NEED = ['root', 'pelvis', 'spine_03', 'neck_01', 'Head', 'hand_r', 'hand_l', 'index_01_r', 'pinky_01_r', 'middle_01_r', 'middle_02_r', 'foot_l', 'ball_l', 'thigh_l', 'calf_l'];
const CORE = ['pelvis', 'spine_03', 'neck_01', 'Head', 'hand_l', 'hand_r'];
const UE4BONE = new Set(['root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'chest', 'abdomen_01', 'neck_01', 'Head']); // 이미 UE4 정상이면 그대로 통과
['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'].forEach(p => { UE4BONE.add(p + '_l'); UE4BONE.add(p + '_r'); });
['index', 'middle', 'ring', 'pinky', 'thumb'].forEach(f => [1, 2, 3].forEach(d => ['l', 'r'].forEach(s => UE4BONE.add(f + '_0' + d + '_' + s))));

function normBone(raw) {
  const orig = String(raw || ''); if (UE4BONE.has(orig)) return orig; // 정상 UE4 이름은 절대 바꾸지 않음
  let n = orig, side = '', mt;
  if (mt = n.match(/[._\- ]([lr])$/i)) { side = mt[1].toLowerCase(); n = n.slice(0, mt.index); }
  else if (mt = n.match(/[._\- ]([lr])(?=[._\- ])/i)) { side = mt[1].toLowerCase(); n = n.slice(0, mt.index + 1) + n.slice(mt.index + 2); } // Bip 식 중간 사이드
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

function isGlb(buf) { return buf.length >= 12 && buf.readUInt32LE(0) === 0x46546C67; }
function readGltfBuffer(buf) {
  if (isGlb(buf)) {
    const jsonLen = buf.readUInt32LE(12), jsonType = buf.readUInt32LE(16);
    if (jsonType !== 0x4E4F534A) throw Error('GLB 첫 청크가 JSON 아님(type=0x' + jsonType.toString(16) + ')');
    return JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8').replace(/^\uFEFF/, ''));
  }
  return JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, ''));
}
function readGltf(file) { return readGltfBuffer(fs.readFileSync(file)); }

// skin joints -> node 인덱스 + 이름; 런타임 aliasBones 와 동일하게 충돌 시 첫 번째 우선
function collectJoints(gltf) {
  const nodes = gltf.nodes || [];
  const out = []; // {idx, name}
  const seen = new Set();
  (gltf.skins || []).forEach(sk => (sk.joints || []).forEach(idx => {
    const nd = nodes[idx]; if (!nd || seen.has(idx)) return; seen.add(idx);
    out.push({ idx, name: nd.name == null ? '' : String(nd.name) });
  }));
  return out;
}

function normalizeJoints(gltf) {
  const joints = collectJoints(gltf);
  const taken = new Set(), bones = {}, renamed = [], unmapped = [], collisions = [];
  joints.forEach(j => { const want = normBone(j.name); if (!want) { unmapped.push(j.name); return; } if (taken.has(want)) { collisions.push(j.name + ' -> ' + want + ' (이미 사용)'); return; } taken.add(want); if (want !== j.name) { bones[j.name] = want; renamed.push(j.name + ' -> ' + want); } });
  return { joints, taken, bones, renamed, unmapped, collisions, coreMiss: CORE.filter(b => !taken.has(b)), needMiss: NEED.filter(b => !taken.has(b)) };
}

function main() {
  const argv = process.argv.slice(2);
  const flags = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') flags.check = true;
    else if (a === '--write') flags.write = argv[++i];
    else if (a === '--key') flags.key = argv[++i];
    else if (a === '--keep-head') flags.keepHead = argv[++i];
    else if (a === '--json') flags.json = true;
    else if (a === '-h' || a === '--help') { console.log('usage: node tools/normchar.js <in.glb|in.gltf> [--key K] [--keep-head true|false] [--write out.gltf] [--check]'); process.exit(0); }
    else pos.push(a);
  }
  if (!pos.length) { console.error('입력 파일 없음. -h 참조'); process.exit(2); }
  const file = pos[0];
  const key = flags.key || path.basename(file).replace(/\.(glb|gltf)$/i, '');
  const keepHead = flags.keepHead === 'false' ? false : true;

  let gltf; try { gltf = readGltf(file); } catch (e) { console.error('파싱 실패:', e.message); process.exit(1); }
  const R = normalizeJoints(gltf), joints = R.joints, taken = R.taken, bones = R.bones, renamed = R.renamed, unmapped = R.unmapped, collisions = R.collisions, coreMiss = R.coreMiss, needMiss = R.needMiss;
  if (!joints.length) { console.error('skins/joints 없음 — 스킨드 메시가 아니면 캐릭터 바디로 쓸 수 없음.'); process.exit(3); }
  const fext = flags.write ? (path.extname(flags.write) || '.glb') : '.glb';
  const entry = { key, file: key + fext, keepHead };
  if (Object.keys(bones).length) entry.bones = bones;
  if (flags.json) {
    console.log(JSON.stringify({ ok: !coreMiss.length, file: entry.file, key, joints: joints.length, bonesRenamed: renamed.length, bones, coreMiss, needMiss, unmapped, collisions }));
  } else {
    console.log('파일      : ' + file);
    console.log('joint 수   : ' + joints.length + '  (정규화 성공 ' + taken.size + ')');
    console.log('renamed   : ' + renamed.length + (renamed.length ? '\n  ' + renamed.slice(0, 12).join('\n  ') + (renamed.length > 12 ? '\n  …외 ' + (renamed.length - 12) : '') : ''));
    if (unmapped.length) console.log('unmapped  : ' + unmapped.join(', '));
    if (collisions.length) console.log('collision : ' + collisions.join(' | '));
    console.log('CORE 누락  : ' + (coreMiss.length ? coreMiss.join(',') : '없음(통과)') + '  → ' + (coreMiss.length ? '바디 사용 불가(buildRig 가 커스텀 건너뜀)' : '사용 가능'));
    console.log('NEED 누락  : ' + (needMiss.length ? needMiss.join(',') : '없음') + '  (손가락·발 세부 — 없으면 일부 동작/검 쥠 영향)');
    console.log('\n-- manifest.json 에 붙일 스니펫 --');
    console.log(JSON.stringify(entry, null, 2));
  }

  if (flags.write) {
    const nodes = gltf.nodes || [];
    // 런타임과 동일 우선순위(first-wins)로 node.name 갱신
    const used = new Set();
    joints.forEach(j => { const want = normBone(j.name); if (want && !used.has(want)) { used.add(want); nodes[j.idx].name = want; } });
    fs.writeFileSync(flags.write, JSON.stringify(gltf, null, 1), 'utf8');
    console.log('\n정규화 출력: ' + flags.write);
  }

  if (flags.check && coreMiss.length) process.exit(4);
}

module.exports = { normBone, normalizeJoints, readGltf, readGltfBuffer, isGlb, collectJoints, NEED, CORE };
if (require.main === module) main();
