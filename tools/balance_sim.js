// ③ 밸런스 실험: hp.js 실제 ADV·DMG 상수를 파싱해 속성 상성이 KO 소모량에 미치는 스윙을 정량화.
// 목표: 상성은 '가속/지연 양념'(TTK 최대 약 ±25%대)이어야 하고 어떤 페어링도 치명적(>2배)이면 안 됨.
const fs = require('fs');
const t = fs.readFileSync(__dirname + '/../hp.js', 'utf8');
const advTxt = (t.match(/const ADV\s*=\s*\{[\s\S]*?\};/) || [''])[0].replace(/;\s*$/, '');
const ADV = Function('return ' + advTxt.replace(/^const ADV\s*=\s*/, ''))();
const elemMatch = (a, d) => { if (!a || !d || a === a && a === d) return 1; const A = ADV[a], B = ADV[d]; if (A && A.indexOf(d) >= 0) return 1.25; if (B && B.indexOf(atkSafe(a)) >= 0) return .85; return 1; };
const atkSafe = x => x; // placeholder to mirror hp.js shape (def beats atk)

// hp.js와 동일 매칭(복사):
function match2(atk, def) { if (!atk || !def || atk === def) return 1; const A = ADV[atk], B = ADV[def]; if (A && A.indexOf(def) >= 0) return 1.25; if (B && B.indexOf(atk) >= 0) return .85; return 1; }

// 50명 시그니처 elem
const a = fs.readFileSync(__dirname + '/../arena.js', 'utf8');
const ao = fs.readFileSync(__dirname + '/../world-aot.js', 'utf8');
const aj = fs.readFileSync(__dirname + '/../world-jjk.js', 'utf8');
const elems = [];
for (const src of [a, ao, aj]) for (const m of src.matchAll(/elem\s*:\s*'([a-z0-9_]+)'/g)) elems.push(m[1]);
const uniq = [...new Set(elems)];

const DMG = { basic: [50, 75], mid: [120, 175], ult: [330, 440] };
const mid = k => (DMG[k][0] + DMG[k][1]) / 2;
function avgMult(grade) { return (mid('basic') + mid('mid') + mid('ult')) / 3; } // 참고용
const HP = 1000;
function hitsToKO(mul) { // 한 타 평균 피해로 단순화(combo·air 제외 상한)
  const base = (mid('basic') * 0.6 + mid('mid') * 0.3 + mid('ult') * 0.1); // 체감 가중(기본 많음)
  const per = base * mul; return Math.ceil(HP / per);
}
let adv = 0, neu = 0, dis = 0, total = 0; const mults = [];
for (const x of uniq) for (const y of uniq) { if (x === y) continue; const m = match2(x, y); total++; mults.push(m); if (m > 1) adv++; else if (m < 1) dis++; else neu++; }
console.log('elem count(시그니처)=' + uniq.length);
console.log('페어링 분포: 우세=' + adv + '(' + (adv / total * 100).toFixed(0) + '%) 중립=' + neu + '(' + (neu / total * 100).toFixed(0) + '%) 열세=' + dis + '(' + (dis / total * 100).toFixed(0) + '%)');
const base = (mid('basic') * 0.6 + mid('mid') * 0.3 + mid('ult') * 0.1);
console.log('중립 평균 1타=' + base.toFixed(0) + ' → 중립 KO타수=' + hitsToKO(1) + ' | 우세 KO타수=' + hitsToKO(1.25) + ' | 열세 KO타수=' + hitsToKO(0.85));
const mn = Math.min(...mults), mx = Math.max(...mults);
console.log('배율 범위=[' + mn + ',' + mx + ']  최대 스윙=' + (mx / mn).toFixed(2) + '배  (목표 < 1.7배)');

// AI 거리표 sanity: kind + 명시 MBIAS (ai-fsm과 동일 로직)
const PREF = { naruto: 26, onepiece: 15, bleach: 22, opm: 14, kimetsu: 18, jjk: 20, aot: 16 };
const MBIAS = { gai: -11, sakura: -8, luffy: -5, zoro: -3, garou: -3, kenpachi: -2, levi: -3, mikasa: -3, eren: -3 };
function aiPref(world, kind, key) { return Math.max(10, Math.min(42, (PREF[world] || 20) + (kind === 'fireball' || kind === 'arrow' ? 10 : kind === 'senbon' ? 8 : kind === 'rasenshuriken' ? 4 : kind === 'getsuga' ? -3 : 0) + (MBIAS[key] || 0))); }
const rows = [];
for (const src of [a, ao, aj]) {
  const starts = [...src.matchAll(/defChar\(\s*'([a-z_]+)'\s*,\s*'([^']*)'\s*,\s*'([^']+)'/g)];
  for (let i = 0; i < starts.length; i++) {
    const m = starts[i], key = m[1], world = m[3];
    const block = src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : m.index + 1400);
    const kind = (block.match(/kind\s*:\s*'([a-z]+)'/) || [])[1] || '';
    rows.push((key + ' ').padEnd(12) + ('[' + world + ']').padEnd(10) + 'kind=' + (kind || '-').padEnd(13) + 'pref=' + aiPref(world, kind, key));
  }
}
console.log('\n--- AI 선호거리(kind+MBIAS) — 낮을수록 최근접 ---');
console.log(rows.sort((x, y) => (parseInt(x.split('pref=')[1]) - parseInt(y.split('pref=')[1]))).join('\n'));
