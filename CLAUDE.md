# 결록(缺錄) — 개발 에이전트 규칙

역사 미스터리 웹게임. 최상위 기획: `docs/GDD.md`. 반드시 먼저 읽을 것: `docs/STORY_BIBLE.md`, `docs/ARCHITECTURE.md`, `docs/HISTORICAL_SOURCES.md`, `docs/ART_DIRECTION.md`.

## 절대 규칙
1. 역사 콘텐츠는 `docs/HISTORICAL_SOURCES.md`에 출처와 함께 검증된 것만 `provenance: 'verified'`로 넣는다. 확인 못 한 것은 넣지 않거나 `unverified` 목록에 남긴다. 가짜 실록 기사·가짜 유물·가짜 인용 금지.
2. 모든 콘텐츠에 provenance(`verified` / `reconstructed` / `fictional`)를 단다. 재구성 대사를 사실처럼 표시하지 않는다.
3. 과거 관측 중 연도·시대·장소·인물을 UI가 알려주지 않는다. 플레이어가 추론해야 한다.
4. 추리 판정은 데이터(증거의 연대 제약·사실)로 계산한다. UI에 정답 하드코딩 금지.
5. 탁영금 등 실존 유물에 존재하지 않는 암호·장치·문양을 추가하지 않는다.
6. `scenario-private/`는 스포일러. `src/`에서 import 금지, 공개 문서에 인용 금지.
7. 모든 그래픽은 코드로 정의한 픽셀 아트(`src/game/art`). 임시 스프라이트는 `SPRITE_META`에 `temp`로 표시.
8. 모바일(터치, 세로/가로)에서 실제 플레이 가능해야 한다. 모바일 우선.
9. 플레이 방식은 「결록 단말」(연구원 컴퓨터 화면, 영화 「서치」 방식). 캐릭터 이동 없음. 설계: `docs/TERMINAL_DESIGN.md`.
10. 큰 틀의 레벨 디자인은 닌텐도식: 메커니즘별 기승전결, 텍스트 대신 해보며 배우기, 한 번에 하나의 새 요소, 실패해도 손해 없는 실험, 만지는 맛이 있는 핵심 동작, 호기심 보상, 완만한 난이도 곡선, 누구나 할 수 있는 접근성.

## 명령
- `npm run dev` / `npm run build` / `npm run typecheck`
- `npm test` (Vitest 단위) / `npm run test:e2e` (Playwright, 데스크톱·모바일)

## 서브 에이전트 모델 규칙
| 작업 | 에이전트 | 모델 |
|---|---|---|
| 설계, 어려운 로직 (물리, AI), 역사 검증 | `architect` | opus (필요 시 fable로 지정) |
| 일반 모듈 구현 | `implementer` | sonnet |
| 파일 탐색, 단순 반복 작업 | `scout` | haiku |

- 서브 에이전트를 쓸 때는 위 표에 맞는 에이전트를 고른다.
- 기본 에이전트(general-purpose 등)를 쓸 경우에도 `model`을 위 표대로 지정한다.
- 병렬 에이전트는 파일 소유 범위를 겹치지 않게 나눈다.
