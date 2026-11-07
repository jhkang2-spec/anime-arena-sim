# 애니 아레나 시뮬레이터 (anime-arena-sim)

3D 애니메이션 캐릭터 팀 배틀 자동 전투 시뮬레이터. 브라우저에서 바로 도는 토너먼트/AI/밸런스/렌더링 실험장.

## 실행

```
python -m http.server 8080   # 또는 npx serve .
```

`index.html` 열기. 품질 프리셋(Low/Mid/High/Ultra)과 그림자·오라·실감음 토글은 HUD 버튼 또는 `F G H R` 키.

## 구조

- `arena.js` — 게임 루프·HUD(2D 레이어)·해상도 스케일링·환경 밀도
- `ai-fsm.js` / `ai-balance.js` / `tactics.js` — 상태기계 AI, 버프/태그, 아드레날린·교대 부스트
- `mocap.js` / `model-hd.js` — 절차적 캐릭터 리그·얼굴 텍스처·고밀도 메시
- `fx*.js` / `lightfx.js` / `fx-danger.js` — 파티클·체적 효과·적 오라 조명
- `sfx.js` / `sfx-real.js` — 레이어링 전투음(자산: `assets/sfx`, 전부 오픈소스) + 절차적 백업
- `env.js` / `ground-gen.js` — 그림자·HDRI급 조명· 절차적 지형 텍스처

## 자산 라이선스 (오픈소스 활용)

- 사운드: Kenney(RPG Audio/Impact Sounds, CC0), rubberduck(100-CC0-SFX / 25-CC0-bang, CC0), joth(Chunky Explosion, CC0), OpenGameArt CC0 컷 — 전체 목록 `assets/sfx/LICENSE.txt`, 편집 매니페스트 `assets/sfx/use/manifest.json`
- 배경음악: "Battle March" by [PlayOnLoop.com](https://www.playonloop.com) — CC-BY 3.0 (attribution)
- 폰트: Noto Sans/Serif KR (Google Fonts, OFL)
- 엔진: three.js (MIT, CDN 로드)

## 공개 주소

https://jhkang2-spec.github.io/anime-arena-sim/
