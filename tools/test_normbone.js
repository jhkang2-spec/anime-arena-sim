#!/usr/bin/env node
// normBone 회귀 + mocap.js/normchar.js 규칙 드리프트 감시 테스트. CI(node --check)와 함께 실행 권장.
// 사용: node tools/test_normbone.js
'use strict';
const fs = require('fs'), path = require('path');
const { normBone } = require('./normchar.js');
let fails = 0;
function eq(inp, exp) { const got = normBone(inp); if (got !== exp) { console.error('FAIL  ' + JSON.stringify(inp) + ' -> ' + JSON.stringify(got) + ' (기대 ' + JSON.stringify(exp) + ')'); fails++; } }

// UE4 정상 이름은 절대 파괴하지 않음(패스스루)
[['hand_l', 'hand_l'], ['hand_r', 'hand_r'], ['Head', 'Head'], ['thigh_l', 'thigh_l'], ['calf_r', 'calf_r'], ['ball_l', 'ball_l'], ['pelvis', 'pelvis'], ['neck_01', 'neck_01'], ['spine_03', 'spine_03'], ['index_02_r', 'index_02_r']].forEach(([a, b]) => eq(a, b));
// Mixamo
[['mixamorigHips', 'pelvis'], ['mixamorigSpine', 'spine_01'], ['mixamorigSpine1', 'spine_02'], ['mixamorigSpine2', 'spine_03'], ['mixamorigNeck', 'neck_01'], ['mixamorigHead', 'Head'], ['mixamorigLeftShoulder', 'clavicle_l'], ['mixamorigLeftArm', 'upperarm_l'], ['mixamorigRightArm', 'upperarm_r'], ['mixamorigLeftForeArm', 'lowerarm_l'], ['mixamorigRightHand', 'hand_r'], ['mixamorigLeftUpLeg', 'thigh_l'], ['mixamorigLeftLeg', 'calf_l'], ['mixamorigLeftFoot', 'foot_l'], ['mixamorigRightToeBase', 'ball_r'], ['mixamorigLeftHandIndex1', 'index_01_l'], ['mixamorigRightHandMiddle2', 'middle_02_r'], ['mixamorigLeftHandPinky3', 'pinky_03_l']].forEach(([a, b]) => eq(a, b));
// Bip(중간 위치 사이드)
[['Bip01_Pelvis', 'pelvis'], ['Bip01_L_Hand', 'hand_l'], ['Bip01 R Thigh', 'thigh_r'], ['Bip01_L_Forearm', 'lowerarm_l'], ['Bip01_Head', 'Head'], ['Bip01_Spine2', 'spine_03'], ['Bip01_L_Toe0', 'ball_l']].forEach(([a, b]) => eq(a, b));
// 'right'가 'rig' 접두사에 먹히지 않는지(회귀 가드)
eq('mixamorigRightArm', 'upperarm_r'); eq('RightHand', 'hand_r');
// 손잡기 NEED 손가락
eq('LeftHandThumb1', 'thumb_01_l');

// 규칙 드리프트: mocap.js(런타임)가 normchar와 동일한 핵심 정규식 조각을 품고 있는지
const mocap = fs.readFileSync(path.join(__dirname, '..', 'mocap.js'), 'utf8');
function srcHas(s) { if (!mocap.includes(s)) { console.error('DRIFT  mocap.js 에 규칙 조각 없음: ' + s); fails++; } }
['[._\\- ]([lr])(?=[._\\- ])/i', 'mixamorig|mixamo|j_bip|bip01|skeleton|joint', 'rig_', '(?:^|hand)(thumb|index|middle|ring|pinky)(?:fun)?0*(\\d)', '^(?:spine|vertebra)(\\d*)$', '^(thigh|upleg|upperleg)', '^(calf|shin|lowerleg|leg|knee)'].forEach(srcHas);

if (fails) { console.error('\nnormBone 테스트 실패: ' + fails); process.exitCode = 1; }
else console.log('normBone 테스트 통과 (' + '규칙 드리프트 가드 포함)');
