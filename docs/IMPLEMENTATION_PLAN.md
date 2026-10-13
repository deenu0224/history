# IMPLEMENTATION PLAN — 버티컬 슬라이스 (에피소드 1)

원칙: 문서보다 플레이 가능한 루프. 각 단계는 "완료 조건"을 실제로 실행해 확인한다.

## 피벗: 결록 단말 (걷기 폐지)
설계 `docs/TERMINAL_DESIGN.md`. 코어·데이터·스토어·단위 테스트는 단말 모델로 전환 완료(검색 색인, 관측 타임라인, 사료 구절,
메시지, 기록관 전시물, 정합성 보정, 튜토리얼·힌트, 저장 v2). 다음 병렬 트랙(파일 소유는 TERMINAL_DESIGN §13.4):
| 트랙 | 담당 | 산출물 |
|---|---|---|
| A. OS 셸 + 앱 UI | implementer (sonnet) | `src/ui/**`: 셸(모바일 전체화면/데스크톱 창), 7개 앱, 코치마크·힌트, 설정·도움말, e2e |
| B. 관측 뷰어 | implementer (sonnet) | `src/game/**`: `<ObservationViewer/>` 디오라마, 팬·줌, 타임라인 NPC, 핫스팟 탭 |
| C. 아트 추가 | implementer (sonnet) | `src/game/art/**`: 앱 아이콘, 창 크롬, 배경화면, 글리치, 노트 질감, 도장, 전시물 |
완료 조건: 모바일 뷰포트에서 탭만으로 프롤로그 → 관측 → 3개 추리 → 기록관 → 예고까지 완주(e2e), 데스크톱 창 모드 동일.
아래 Phase 1~2 의 '이동·카메라 추적·연구실 씬' 항목은 폐기되고 단말 앱으로 대체된다.

## 작업 분할 (divide and conquer)
| 트랙 | 담당 에이전트 | 산출물 | 의존 |
|---|---|---|---|
| A. 역사 검증 | architect (opus) | `docs/HISTORICAL_SOURCES.md` | 없음 |
| B. 코어 엔진 | architect (opus) | `src/core/*`, `src/store/*`, 단위 테스트, `docs/ARCHITECTURE.md` | 없음 |
| C. 픽셀 아트 | implementer (sonnet) | `src/game/art/*`, `docs/ART_DIRECTION.md` | 없음 |
| D. 에피소드 콘텐츠 | architect (opus) | `src/data/historical|fictional|deduction/*` | A, B |
| E. 월드(Phaser) | implementer (sonnet) | `src/game/scenes/*`, 맵, 이동, NPC, 상호작용 | B, C |
| F. 인터페이스(React) | implementer (sonnet) | `src/ui/*` 화면, 반응형/모바일 | B, C |
| G. 통합·검증 | 메인 | Playwright E2E, 스크린샷, 버그 수정 | 전부 |

## 단계와 완료 조건
### Phase 1 기술 기반
- [ ] Vite + React + Phaser 부팅, 픽셀 렌더링(`pixelArt: true`), 반응형 캔버스
- [ ] 키보드(WASD/방향키) + 터치(탭 이동) 이동, 카메라 추적
- [ ] 상호작용(E/Space/탭) → 이벤트 버스 → React 패널
- [ ] IndexedDB 자동 저장/불러오기
- 완료 조건: PC·모바일 뷰포트에서 캐릭터가 움직이고, 오브젝트 조사 결과가 하단 패널에 뜬다.

### Phase 2 게임플레이
- [ ] 연구실(현대) 씬, 관측 #001(과거) 씬
- [ ] NPC 동선·대화(조건부), 증거 획득, 조사 노트, 도감 등록
- [ ] 연대 추론판: 범위 입력 + 근거 카드 선택 + 판정(확정/부분/미확정/오답) + 근거별 피드백
- 완료 조건: 오답 시 정답 비공개 + 근거 피드백, 정답 시 보상 반영.

### Phase 3 역사 콘텐츠
- [ ] 검증 자료만으로 인물 3+, 유물 1+, 사료 3+, 수집 8+
- [ ] 연도·인물·사건 퍼즐 각 1개
- [ ] `validateContent()` 통과(검증 항목 출처 URL 필수)

### Phase 4 그래픽·연출
- [ ] 조선 관청 맵 완성, 인물 애니메이션, 유물 스프라이트(고증 반영), 관측 진입/귀환 연출, 수집 연출, 등불 조명, 효과음(WebAudio 합성)

### Phase 5 데모
- [ ] 프롤로그 → 관측 → 3개 추리 → 귀환 → 기록관 전시 → 다음 미스터리 예고
- [ ] Playwright: 데스크톱/모바일 전체 흐름 통과, 스크린샷 확인
- 목표 플레이 시간 15~30분

## 보고 형식 (단계마다)
구현 완료 사항 / 실제 플레이 가능 여부 / 역사자료 검증 상태 / 임시 vs 최종 그래픽 / 알려진 문제 / 다음 우선순위
