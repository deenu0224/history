# TERMINAL_DESIGN — 결록 단말

> 걷기 폐지 이후의 최상위 플레이 설계. 게임 전체가 연구원의 컴퓨터 화면 「결록 단말」이다(영화 〈서치〉(2018) 방식).
> 이야기와 플레이는 모두 OS 앱 안에서 일어난다. 역사 규칙은 그대로 절대적이다(`CLAUDE.md`, `HISTORICAL_SOURCES.md`).
> 스포일러(흑막·말소 원리, 왜 손 노트만 남는가)는 이 문서에 쓰지 않는다.

---

## 0. 요약

| 항목 | 결정 |
|---|---|
| 조작 | **탭·스크롤만**. 타자는 선택(검색어 칩으로 모든 진행 가능) |
| 화면 | 모바일 = 휴대폰처럼 전체 화면 앱 + 하단 독 / 데스크톱 = 창 OS. **같은 코드**, 레이아웃만 다름 |
| 앱 5개 | 손 노트(기록관 탭 포함) · 통합 DB 검색(원문 보기 포함) · 메신저 · 관측 뷰어 · 증거 보드. 설정은 시스템 패널 |
| 말소된 것 | 게임 세계에는 **무오사화가 없다**. 그 실록 기사가 DB 에 없고(검색 "해당 기사 없음"), 빈 장도 없다. 남은 것은 **원인 없는 결과**뿐 |
| 과거 관측 | 디오라마 + 하루 타임라인 스크럽. 인물·사물을 그 시각에 탭 |
| 주 봉우리 | **인과 추리**: "같은 달, 세 사람은 왜 죽었나?" — 카드를 화살표로 잇고 화살표마다 근거 |
| 연도 추리 | 짧은 중간 퍼즐(DB 에 졸년이 보이므로). 성종 재위 함정이 轉 |
| 핵심 동사 | **기록하기**(사관의 직필): 확정한 사실을 손 노트에 직접 적으면 그 사실이 복원된다 |
| 현실 이동 | 복원되면 세계는 **원래부터 알고 있었다**. 동료는 고마워하지 않는다 — "그걸 모르는 사람이 어디 있어." 이전/이후는 손 노트에만 |
| 말소의 거울 | 중반 **정합성 보정**(밤사이): 내가 본 것에 관한 단말 메모가 사라지고 동료는 대화를 기억하지 못한다. 손 노트는 그대로 |
| 레벨 디자인 | 닌텐도식 기승전결 · 해 보며 배우기 · 한 번에 하나 · 실패 무료 (§5) |

### 0.1 거시 흐름(기승전결)
```
起  내가 쓴 단어가 세상에 없다   손 노트 「무오█화 — 계속 조사」 → 검색 "그런 단어 없음"
承  원인 없는 죽음을 검색한다     김일손 1498년 7월 졸, 사인 없음 · 같은 달 권오복·권경유 → 탁영금 → 관측
轉  본 것이 실록에 없다           들은 전교 → "해당 기사 없음" + 밤사이 단말 메모 말소(동료는 기억 못 함)
結  인과를 잇고, 손으로 기록한다   카드 겹치기 → 연도 → 인과 확정 → 기록하기 → 현실 재기록
    → "그걸 모르는 사람이 어딨어" → 손 노트: "나만 기억한다. 바뀌기 전을."
```
죽음은 실록 문장 수준으로만 다룬다(처분 기사의 문장 그대로). 극화하지 않는다.

### 0.2 동기의 세 층
| 층 | 플레이어가 느끼는 것 | 어디서 |
|---|---|---|
| 의문 | 왜 그들은 이유 없이 죽었나? 내가 어젯밤 쓴 단어는 무엇이었나? | B0 노트, B2 DB(사인 없음 ×3) |
| 사명 | 이 사실을 붙잡아 둘 수 있는 곳은 오프라인 손 노트뿐이다. 내가 기록하면 다시 '있던 일'이 된다 | B11 메모 말소, B13~B14 기록하기 |
| 위협 | 말소는 번진다(#002). 그리고 바뀌기 전을 기억하는 사람은 나 하나다(고독) | 현실 이동마다 동료의 "원래 알았다", 예고 |

---

## 1. 핵심 루프 (단말 안에서)

```
 손 노트(의문·기록하기) ─► 검색(이름·물건·들은 말) ─► 관측 뷰어(시간을 옮기며 탭)
        ▲                                                 │ 들은 말 = 검색어 칩, 카드(단계 0)
        │                                                 ▼
 현실 이동(복원) ◄─ 증거 보드(겹치기·판정) ◄─ 검색의 원문 보기(구절 → 카드 검증)
```
**검색이 곧 추리다.** 색인에 있는 말만 결과가 나온다(Her Story 방식). 말소된 기사는 색인어는 있지만
결과가 없다 — "해당 기사 없음". 이 빈 결과가 퍼즐의 출발점이다. 관측에서 직접 보고 들은 것만 증거 단계를 올린다.

---

## 2. 셸(OS) 구조

### 2.1 모바일(세로 우선, 가로 대응)
```
┌──────────────────────────┐
│ 23:04   결록 단말   ▮▮ ◔ │  상태 표시줄(고정 연출)
├──────────────────────────┤
│      (앱 전체 화면)       │  앱 하나만 보인다. 뒤로 = 독/스와이프
├──────────────────────────┤
│   📓   🔍   💬   👁   🗂   │  하단 독(5): 아직 없는 앱은 자리째 숨김 → 하나씩 '설치'되는 연출
└──────────────────────────┘
```
- 터치 영역 최소 44×44 CSS px, 한 손(엄지) 영역에 주요 버튼. 가로 모드: 독이 왼쪽 세로 줄.

### 2.2 데스크톱(≥ 900px)
- 같은 React 컴포넌트, 컨테이너만 `<Window>`(데스크톱) / `<FullscreenApp>`(모바일). `store.ui.app` = 앞에 있는 앱.
- 키보드: 검색창 Enter, 뷰어 ←/→ = 5분, Shift = 30분, Space = 재생/정지(선택).

---

## 3. 앱별 UX

### 3.1 손 노트 (`notebook`) — 첫 화면, 오프라인 스캔
탭: **노트**(관찰·증언·검증·가설·의문) · **단말 메모** · **기록관** · **기록하기**.
- 콜드 오픈: 어젯밤 내 글씨 「무오█화 — 계속 조사」(한 글자 번짐). 번진 단어 = 검색어 칩.
- **기록하기**(`selectRecordActs` → `recordFact(actId)`): 추리를 확정하면 적을 문장(검증된 실록·사전 문장 그대로)이 나타난다.
  UI 는 따라 쓰기/도장 연출(`FEEDBACK.record_fact`). 적는 순간 복원(현실 이동)이 일어난다.
- **복원 쪽**: 복원 직후 `pendingDiffPageId` 가 생기면 UI 가 손 노트의 이전/이후 쪽을 자동으로 연다(`selectNotebookDiffs`).
  왼쪽 = 이전(취소선), 오른쪽 = 이후(새 글씨). 노트 항목 `NoteEntry.before` 도 같은 내용. 닫으면 `ackDiffPage()`.
- **기록관 탭**: 전시물 그리드(`selectExhibits`) + 복원 목록(`selectRestorations`, '복원' 도장은 여기에만) + 도감(`selectCodexFields`).
- **단말 메모 탭**: `selectMemos()`(동기화, 말소 대상). 손 노트와 나란히 놓으면 말소가 보인다.

### 3.2 통합 DB 검색 (`search`) — 원문 보기 포함
- 정규화·일치: `core/search.ts`(NFKC·문장부호 제거, exact → contains → prefix).
- 상태: `ok` · `unknown`("색인에 없는 말") · `too_short` · **`no_article`**(맨 위 결과가 말소된 기사: "해당 기사 없음." / 콜드 오픈 단어는 "그런 단어 없음.").
  `SearchHit.noArticle`. 복원 뒤에는 같은 검색이 평범한 결과(표식 없음).
- 변조된 레코드(`rec_alt_*`)는 표 형식: 생몰, 졸 "1498년 7월", **사인 "기록 없음"**, 상태 "정상 · 오류 0건". 강조 색 없음.
- **원문 보기**: 사료 결과를 누르면 같은 앱 안에서 본문(`HistoricalSource.excerpt`)과 형광 구절(`SourcePhrase`)을 연다(`openSource` → `openApp('search', sourceId)`).
  구절 등록은 원문 대조 권한(`source_access`, B11 뒤 동료가 열어 줌) 이후. 권한 전에는 `unavailable`.

### 3.3 관측 뷰어 (`viewer`)
- 하루 08:00~19:00(480~1140분). 첫 진입 카메라는 안쪽 방 앞, **08:00 에 서리(첫 핫스팟)가 화면 안**.
- 메타데이터 패널은 고정 문자열(연도 `####`, 장소·인물 '미확인'). 시각(HH:MM)만, 날짜 없음.
- **눈금**: `selectTimelineTicks()` → `{minute, kind: 'move'|'speech'|'object', targetIds}[]`(지금 플래그로 들릴 수 있는 대사만). 내용은 주지 않는다.
- **동선 하이라이트**: 인물을 탭하면 `selectNpcRoute(s, npcId)` → `{points[{minute,x,y,action}], current}` 로 하루 경로를 그린다.
- 신원 확인 전에는 실존 인물 이름을 화자로 쓰지 않는다. 재관측 자유, 같은 보상은 두 번 주지 않는다.

### 3.4 증거 보드 (`board`)
문제: [누구인가] [언제인가] [왜 죽었나]. 잠긴 문제는 자물쇠(요건 문구 없이).
- **카드 겹치기**: 카드 두 장을 겹치면(`linkEvidence(ids)`) 정확히 맞는 조합일 때 추론 카드가 생긴다. 실패는 무료(`no_link`), 조건 부족은 `not_ready`(정답 없는 한 줄).
- **연도(드래그 연표)**: 카드를 연표에 끌어 올린다. `selectYearCards()` → 각 카드의 `shape`(lower/upper/both/none), `time`, 카드 고유 `feedback`.
  `selectYearPreview(s, ids)` → 올린 카드들이 함의하는 범위(all/decisive, 모순 여부). 제출은 `submitDeduction({kind:'year',…})`. 신뢰도 입력은 없다.
- **인과(봉우리)**: 마디 카드(`CausalDeduction.nodes`)를 화살표로 잇고, 화살표마다 근거 카드를 붙인다.
  제출 `{kind:'causal', links:[{from,to,evidenceIds}]}`. 피드백은 화살표별(`Feedback.link`): 받칠 카드 없음 / 방향이 뒤집힘 / 알려진 오답의 고유 문구 / 모자란 사실의 '종류' / 빠진 고리 수.

### 3.5 메신저 (`messenger`)
- 메시지는 조건이 되면 도착하고 도착 즉시 `grants`. 답장은 `reply_*` 플래그만(퍼즐 금지).
- **다시 쓰기**: 복원 뒤 지난 메시지 본문은 새 현실로 바뀐다(`selectInbox` 가 이미 바뀐 본문을 준다). 메신저 자체에는 표식이 없다.
  연출: `recentRewrites`(tone `restore`)를 보고 해당 말풍선을 깜빡여 바꾼 뒤 `ackRewrites()`.
  **연필 표시**(플레이어만의 기억): `selectRewrittenMessages()[id].original` 을 말풍선 곁에 연필 글씨 "어제는 이렇게 말했었다"로 남긴다.
- 스레드: `system`(결록 단말) · `colleague`(한 선임, '나') · `device`(관측 장치) · `archivist`(서 아키비스트, `avatar_colleague_b`).

---

## 4. GDD 요구사항 대응

| GDD | 단말에서의 구현 |
|---|---|
| 연도 비공개 | 관측 뷰어 메타데이터 고정 문자열. 과거 문구·관측 중 목표·뷰어 튜토리얼에 4자리 연도·왕대 금지(테스트) |
| 증거 기반 추론 | 카드 단계 0(관측) → 검색·구절로 단계 1 → 겹치기로 추론 카드 → 보드 제출 → 엔진 판정(정답 하드코딩 없음) |
| 사료 추리 | 말소된 기사 = 검색의 빈 결과. 복원된 원문은 검증된 국역 그대로 열람·구절 등록 |
| 수집·기록관 | 18 도감 항목(말소된 필드는 복원 전 숨김) + 손 노트의 기록관 탭, 복원 도장 |
| 과거 관측의 제약 | 관측자는 보이지 않고 바꿀 수 없다. "관측은 과거를 바꾸지 않습니다. 바뀌는 것은 현재가 기억하는 기록입니다."(관측 장치) |
| 재관측/대체 경로 | 재관측 자유. 필수 증거마다 2개 이상 경로. 말소·원문 권한·대화에는 검색 횟수 막힘 방지 |
| 모바일 | 탭·스크롤만으로 완주(검증기 `search_needs_typing`, 테스트의 칩 전용 완주) |
| provenance | 모든 콘텐츠 provenance. 변조 레코드는 fictional + `altered`, 엔딩 뒤 열람 모드에서 '변조'(`selectRecordLedger`, `provenanceBadge`) |

---

## 5. 레벨 디자인 원칙 — 닌텐도식

### 5.1 여덟 원칙과 적용
1. **기승전결** — 각 메커니즘이 자기 작은 기승전결을 거친 뒤 결합된다(§5.2). 에피소드 전체는 §0.1.
2. **해 보며 배우기** — 첫 화면은 내 손 노트 한 쪽. 번진 단어 하나가 첫 칩. 텍스트 벽 없음.
3. **한 번에 하나** — 앱도 하나씩 설치된다: 노트 → 검색 → 메신저 → 뷰어 → 보드. 새 동사도 비트당 하나.
4. **안전한 실험** — 틀린 검색·구절·겹치기·추리는 무료. 재시도 즉시.
5. **만지는 맛** — 검색·탭·스크럽·구절·겹치기·제출·**기록하기(따라 쓰기)**에 소리·도장·진동(§11).
6. **호기심 보상** — 비운 서안(14~15시) 액자, '대행왕' 구절 → 선택 사료·전시, 선택 검색(이극돈·유자광·…), 보정 뒤 '정합성 보정' 검색 → "변경 0건".
7. **완만한 경사 + 숨 돌리기** — 봉우리(관측 轉, 인과) 뒤엔 쉼(귀환·기록관·복원 쪽). 인과는 하위 기술(검색·구절·겹치기·연도)을 모두 익힌 뒤.
8. **누구나** — 큰 글씨, 시간 압박 없음, 한 손 모바일, 짧은 세션(각 結에서 자동 저장).

### 5.2 메커니즘별 기승전결
| 메커니즘 | 起 | 承 | 轉 | 結 |
|---|---|---|---|---|
| 검색 | 노트의 번진 단어 → "그런 단어 없음"(실패도 정보) | 동료의 칩 '김일손' → 사인 없는 졸년 | 들은 전교 → "해당 기사 없음" | 복원 뒤 같은 검색이 평범한 결과 |
| 관측 스크럽 | 08:00 화면 안의 서리 | 시간을 밀면 젊은 관원이 안쪽 방으로 | 기다리던 사람이 14시에 전교를 전한다 | 봉함을 보고 관측 종료 |
| 구절 | 묘호 구절 하나 → 도장 | 한 기사에 구절 여럿: 본 것과 연결되는 것만 | 복원된 7월 11일 기사의 구절이 관측 카드를 검증 | 원문 서가 전시 |
| 증거 보드 | 인물 1문제, 카드 2장 | 오답 → '모순' 피드백으로 사실 읽기 | 카드 겹치기: 본 것 + 기록된 것 = 새 카드 | 인과의 화살표 |
| 연도(중간) | 결정 카드로 범위 → 부분 확정 | 카드를 더해 좁힘 | **함정**: '성종'을 들었으니 성종 재위기? → 모순(묘호는 사후) | 겹친 카드로 한 해 확정 |
| 인과(봉우리) | 화살표 하나 → '받칠 카드 없음' | 근거를 붙이면 '빠진 고리 n개' | 그럴듯한 오답(평소의 수납·역병) → 고유 반박 | 세 마디가 이어진다 |
| 기록하기 | 첫 문장(전교)을 따라 쓴다 | 동료가 "다 아는 거잖아" — 메시지가 바뀐다 | 손 노트에만 이전이 남는다 | "나만 기억한다. 바뀌기 전을." |

### 5.3 비트 표(에피소드 1)
| 비트 | 새 동사 | 역할 | 배우는 것 / 느끼는 것 | 피드백 | 선택 보상 | 튜토리얼/힌트 | 분 |
|---|---|---|---|---|---|---|---|
| B0 콜드 오픈 | 노트 보기 | 에피소드 起 · 의문 | 내가 쓴 단어 「무오█화」 | 종이 넘김 | — | `tut_cold` | 0.3 |
| B1 없는 단어 | 칩 탭 = 검색 | 검색 起 | "그런 단어 없음." 검색 앱·메신저가 설치된다 | 입력창 흔들림 → 메신저 팝 | '무오'·'무오사화' 직접 입력 → 같은 결과 | `tut_msg` | 0.5 |
| B2 원인 없는 죽음 | 결과 읽기 | 검색 承 · 의문 | 김일손 1498년 7월 졸, 사인 없음. 같은 달 권오복·권경유 | 결과 캐스케이드, 첫 카드 | '권오복' 칩 → 카드 '같은 달의 졸년' | `tut_search_first` | 1 |
| B3 답장 | 답장 고르기 | 메신저 承 | 동료는 "정상"이라 한다 | 말풍선 | 두 답장(분위기) | — | 0.5 |
| B4 연결 검색 | 칩 재검색 | 검색 承 | 탁영금 → 관측 지점 + 규칙 한 줄 | NEW 도장 | '탁영'·'계운' | `tut_search_link` | 1 |
| B5 관측 진입 | 핫스팟 탭 | 관측 起 | 과거를 눌러 듣는다. 연도 #### | 진입 글리치 | 우물·항아리·병풍 | `tut_viewer_open/tap` | 1.5 |
| B6 시간 | 스크럽 | 관측 承 | 시각이 자리와 말을 바꾼다(눈금·동선) | 시계 틱 | 비운 서안의 법전 | `tut_viewer_scrub` | 3 |
| B7 전교 | (결합) | 관측 轉 | 기다리던 사람이 14시에 명을 전한다 | '실록' 출처 표식 | 비운 당상 서안 → 액자 | `tut_viewer_event` | 3 |
| B8 본 것이 없다 | 들은 말 검색 | 에피소드 轉① | "해당 기사 없음." 동료: "그건 상상이야" | 빈 결과 | — | `tut_order_search` | 1 |
| B9 첫 판정 | 카드 골라 제출 | 보드 起·承 | 판정은 근거를 본다. 틀려도 무료 | 판정 도장 | 기록관 탭의 인물 기록부 | `tut_board(_person)`, `tut_archive` | 3 |
| B10 쉼 | — | — | 기록관 탭, 손 노트 정리 | 진열 조명 | 빈 서안 액자 | — | 1 |
| B11 밤사이 말소 | 두 탭 비교 | 에피소드 轉② · 사명 | 메모가 사라졌다. 동료는 기억 못 한다. 손 노트는 그대로 | 명도 한 칸(tone `erase`, 무음) | '정합성 보정' 검색 → "변경 0건" | `tut_notebook_compare` | 1.5 |
| B12 원문 | 구절 탭 | 구절 起承 | 원문 대조 권한. 남아 있는 기록으로 카드를 검증 | 형광 잉크 번짐 | '대행왕' → 선택 사료·전시 | `tut_source` | 3 |
| B13 연도 + 겹치기 | 연표 드래그 · 카드 겹치기 | 연도 起承轉結(짧게) | 범위의 교집합 → 성종 함정 → 겹친 카드로 한 해 | 범위 좁힘 애니 | 연대표 전시 | `tut_year`, `tut_link`, `tut_year_exact` | 4 |
| B13' 첫 기록 → **첫 현실 이동** | 기록하기 | 기록하기 起 · 사명의 보상 | 손으로 적자 7월 11일 기사가 '원래부터 있던 것'이 된다. 동료: "다 아는 거잖아. 갑자기 왜?" 지난 메시지가 바뀐다 | 먹 번짐(tone `restore`), 손 노트 이전/이후 쪽이 자동으로 열림 | 원문 서가 전시(복원 도장), 원문 구절로 카드 검증 | `tut_record` | 2 |
| B14 인과(봉우리) | 화살표 잇기 | 보드 結 · 주 봉우리 | 「조의제문」이 실린 사초 → 전교 → 같은 달의 죽음 | 화살표별 피드백 | 당상 기록(수사관 파면) 복원 | `tut_cause` | 5 |
| B14' 기록 → **현실 이동: 무오사화** | 기록하기 | 에피소드 結 | 메신저의 첫 메시지마저 바뀐다. "무오사화를? 우리 부서에 그걸 모르는 사람이 어디 있어." | 큰 먹 번짐, 노트 쪽 | 아키비스트의 어긋난 기억 | `tut_record_cause` | 2 |
| B15 중앙 진열 + 예고 | 전시 | 에피소드 結 · 위협 · 고독 | "나만 기억한다. 바뀌기 전을." 이상 징후 #002 | 진열 연출, 예고 글리치 | 도감 18/18 | `tut_archive_center` | 1 |
| **합계** | | | | | | | **≈35** (빠른 플레이 ≈18) |

---

## 6. 진행 잠금(게이팅)

### 6.1 앱(하나씩 설치)
| 앱 | 설치 조건 | 비트 |
|---|---|---|
| 손 노트 | 처음부터(콜드 오픈) | B0 |
| 통합 DB 검색 | 손 노트를 연다 | B0 |
| 메신저 | 콜드 오픈 단어 검색(`se_muo`) 또는 검색 2회 | B1 |
| 관측 뷰어 | `obs_link_001`(김일손 + 탁영금 조사) | B5 |
| 증거 보드 | `obs001_returned` | B9 |
| (원문 구절 등록) | `source_access`(B11 동료 / 막힘 방지: 보정 뒤 검색 20회) | B12 |

### 6.2 추리 · 기록하기
| 무엇 | 조건 | 결과 |
|---|---|---|
| 인물 `ded_person_001` | `f_met_official` | 기록관 탭, (복원 뒤) 기록하기 `act_person` |
| 연도 `ded_year_001` | `source_access` | 부분 → `ded_year_partial`, 확정 → 기록하기 `act_order` |
| 카드 겹치기 `lnk_same_month` | 전교 + 같은 달의 졸년 (+ '아직 살아 있다'를 들었을 것) | 추론 카드 '사초와 세 죽음' |
| 인과 `ded_cause_001` | `ded_year_partial` (튜토리얼은 첫 복원 뒤에 안내) | 확정 → 기록하기 `act_cause` |
| `act_order` → `shift_order` | `ded_year_confirmed` | 7월 11일·12일 기사 복원, `restored_order` |
| `act_person` → `shift_person` | `ded_person_confirmed` + `restored_order` | 수사관 파면 사유 복원 |
| `act_cause` → `shift_cause` | `ded_cause_confirmed` + `restored_order` | 7월 26·27일 기사, 무오사화 사건, 네 인물 레코드 복원 |
| 에필로그 | `restored_order` + `restored_person` + `restored_event` | 복원된 기사 요약 → 나 → 한 선임 → 손 노트 |

### 6.3 관측 #001 의 시간표(스크럽)
| 시각 | 무엇 | 얻는 것 |
|---|---|---|
| 08:00~ | 안쪽 방 앞 서리: "성종대왕 실록을 다 엮어야…" | 카드 '선왕의 칭호', 칩 '성종대왕'·'성종대왕 실록' |
| 08:00~14:00 | 붉은 관복이 사초를 오래 본다 | 카드 '미확인 관료' |
| 08:00~ | 안쪽 방의 종이 꾸러미 / 대청 원고 더미 | 카드 '사초 꾸러미'·'선왕의 기록을 엮는 곳' |
| 10:00~12:00 | 젊은 관원: "안쪽 방의 꾸러미가 다 집에 둔 사초요." · 비운 서안의 『經國大典』 | 칩 '집에 둔 사초'·'經國大典' |
| 12:00~17:00 | 젊은 관원: 「조의제문」·점필재 (붉은 관복을 본 뒤) | 카드 '문제가 된 글'·'돌아가신 스승' |
| 13:00~ | 서리 귀엣말: 세조대왕 실록 편수 | 카드 '서리의 귀엣말' |
| 14:00~16:00 | 대청 앞 관원: 전교(verified) | 카드 '전교', 칩 '대내'·'김일손의 사초' |
| 14:00~16:00 | 당상들의 간언(verified) | 카드 '당상들의 간언', 칩 '직필' |
| 15:00~ | 여섯 조목을 봉함("당상들이 … 붉은 관복의 당상도 그 자리에 있다") | 카드 '봉해진 여섯 조목' |
| 16:00~ | 푸른 관복: "사초를 쓴 사관은 아직 살아 있소." | 카드 '사초를 쓴 사관' |

### 6.4 연도 단서표(말소 전제)
| 카드 | 얻는 곳 | 검증(단계 1) | 연대 제약 | 역할 |
|---|---|---|---|---|
| ev_myoho 묘호 '성종' | 서리 c1 | 구절 `ph_myoho_seong` | ≥1495 결정 | 하한. **轉 함정**(성종 재위기로 답하면 모순) |
| ev_sillokcheong 실록청 | 꾸러미/원고 | 검색 '성종대왕 실록' 또는 구절 `ph_compile` | 1495~1499 결정 | 하한·상한(넓음) |
| ev_unknown_official 이극돈 | 붉은 관복 | 인물 추리 확정 | 1495~1498 결정 | 하한·상한 |
| ev_author_alive 김일손 생존 | 푸른 관복 b5 | 검색 '김일손'(전교로 이름을 안 뒤): DB 졸년 | ≤1498 결정 | **상한** |
| ev_jongjik_dead | 젊은 관원 y3 | 검색 '조의제문' | ≥1492 보조 | 약한 하한 |
| ev_jouijemun | 젊은 관원 y3 | 검색 '조의제문' | ≥1457 보조 | 거의 못 좁힘(말소된 세계에선 '왜 지금'이 없다) |
| ev_lawbook | 비운 서안 | 검색 '經國大典' | ≥1471 약함 | 레드 헤링 |
| ev_takyeong_record | 검색 '탁영금' | — | ≥1490 약함 | 레드 헤링 |
| ev_db_deaths 같은 달의 졸년 | 검색 '권오복'·'권경유' | — | 없음 | 겹치기 재료(변조된 DB 상태, fictional) |
| **ev_same_month 사초와 세 죽음** | **보드 겹치기**: 전교 + 같은 달의 졸년 (생존 확인 필요) | — | **≥1498 결정** | **한 해로 만드는 결정적 연결** |

- 교집합: 묘호·실록청·당상·생존 → 1495~1498(부분 확정). + 사초와 세 죽음 → 1498(확정).
- 카드마다 고유 피드백(`TimeConstraint.feedback`) — "하한만 제한합니다" 같은 일반 문구 반복 없음. 정답·4자리 연도 없음(테스트).

### 6.5 인과 추리(봉우리) — `ded_cause_001`
| 마디 | 정답 고리 | 뒷받침 |
|---|---|---|
| 한 사초에 실린 「조의제문」이 문제가 되었다 | ① | |
| 왕이 그 사관의 사초를 모두 대내로 들이라 명했다 | ② | ①→②: 「조의제문」 사초 수록(관측 y3) + 전교(관측 m2) |
| 같은 달, 사초의 주인과 두 사람이 사인 없이 죽었다 | ③ | ②→③: '사초와 세 죽음'(겹치기 카드) |
| 실록청이 평소처럼 사관들의 집에서 사초를 거두었다 | 오답 | "…늘 있던 절차다. 그것만으로 사람이 죽지는 않는다." |
| 그해 역병과 흉년이 돌았다 | 오답 | (동료의 B2 말 — 받칠 카드가 없다) |
| 실록 편찬이 멈추었다 | 오답 | 『성종실록』 완성 기록이 반박 |

판정(`core/deduction.ts` `judgeCausal`): 근거 없는 화살표는 맞든 틀리든 '받칠 카드 없음'(정답 캐내기 방지) →
틀린 화살표(고유 문구/방향 뒤집힘) → 정답 화살표의 모자란 사실(종류만) → 빠진 고리 수. 정답 마디·순서·연도는 피드백에 나오지 않는다.

---

## 7. 말소와 복원 — 합의된 현실의 다시 쓰기 (가상)

### 7.1 말소된 세계(시작 상태)
- 무오사화의 실록 기사(7월 11·12·26·27일)와 사건 항목이 DB 에 없다. 검색은 "해당 기사 없음", 빈 장·빈 날짜 없음.
- 남은 것: **원인 없는 결과**. 김일손 1498년 7월 졸(사인 없음), 같은 달 권오복·권경유 졸(사인 없음), 이극돈 1498년 파직(사유 없음),
  이미 세상을 떠난 김종직의 사후 처분 1건(내용 없음). 이것들은 변조된 레코드(`rec_alt_*`, `provenance: 'fictional'`, `altered: true`)다.
  절대 실제 역사로 표시하지 않고, 엔딩 뒤 열람 모드에서 원래 상태는 '변조'.
- 인물 요약(`HistoricalPerson.summary`)은 두 현실 모두에서 참인 사실만 쓴다. 말소된 사실은 도감 필드 `restoredBy` 로 복원 전 숨긴다.

### 7.2 밤사이 말소(정합성 보정 `corr_001`, tone `erase`)
- **방아쇠**: 귀환 뒤 그 전교 이야기를 동료와 나눈 뒤(`talked_order`), 첫 판정을 낸 밤(또는 검색 14회).
- **효과**: 단말 메모 `memo_order`(전교를 들었다, 실록에 없다)가 **사라진다**. 동료: "어제 무슨 사초 얘기 했었나? 기억이 잘 안 나네."
  손 노트의 같은 기록(`note_no_article`)은 그대로. 의문 `q_correction`. 시스템: "야간 정합성 보정 완료 · 변경 0건."
- 연출: 명도 한 칸, 무음, 진동 없음(`FEEDBACK.erase`). 형광·네온 금지.

### 7.3 복원(현실 이동 `RealityShift`, tone `restore`)
- 추리 확정만으로는 일어나지 않는다. 플레이어가 손 노트에 **기록하기**를 해야 한다(사관의 직필).
- 효과: 메시지 다시 쓰기(이미 받은 것만 기록에 남고, 아직 안 온 것은 처음부터 새 현실로 도착), 레코드에 원인이 생김(verified + 출처),
  "해당 기사 없음"이 평범한 결과, 복원된 사료가 서재에, 도감 필드 공개. 시스템: "통합 역사 DB 동기화: 정상 · 변경 0건."
- **단말에는 표식이 없다.** 이전/이후는 손 노트(취소선 + 새 글씨, 자동으로 열리는 쪽)와 메신저의 연필 표시(플레이어 기억), 기록관의 '복원' 도장에만.
- 동료는 고마워하지 않는다. 원래 다 아는 일이다: "그 기사? 실록청 사람이면 다 아는 거잖아. 갑자기 왜?" / "너 신입 때 나한테 그걸로 발표했잖아."
- 아키비스트(두 번째 동료)는 다르게 흔들린다: 교정한 기억은 있는데 교정 이력이 비어 있다.

| 현실 이동 | 기록할 문장(검증) | 복원되는 것 | 다시 쓰이는 말 |
|---|---|---|---|
| `shift_order` | 「김일손의 사초를 모두 대내로 들여오라」(7/11) | 7월 11일·12일 기사 | B8 "그건 상상이야" → "실록에 그대로 있는 기사잖아", B11 "기억이 안 나네" → "다 아는 걸 밤새" |
| `shift_person` | 수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면(백과사전 「무오사화」) | 이극돈 파직 사유 | (레코드) |
| `shift_cause` | 「김일손·권오복·권경유는 대역의 죄에 해당하니 능지 처사하고」(7/26) | 7월 26·27일 기사, 무오사화 사건, 김일손·권오복·권경유·김종직 레코드 | B1 "사인 없는 졸년 기록, 옛날엔 흔해" → "무오사화 때 화를 입은 사관이야. 그걸 왜 또 봐?", B2 "역병도 있고 흉년도…" → "같은 달인 게 당연하지. 무오사화잖아." |

- **규칙**(검증기): 복원되는 사료·사건은 verified(출처 URL). 복원 레코드는 verified 로 다시 쓰여야 한다. 말소된 사료·사건은 복원 전 어떤 검색 결과·보상에도 없다(`erased_reachable`).
  변조 레코드는 fictional. 말소된 기사(`noArticle`)마다 그것을 채우는 현실 이동이 있어야 한다. 기록하기 문장은 verified.

---

## 8. 튜토리얼 · 힌트

### 8.1 구조
- 기본은 해 보며 배우기. 1차 힌트 통로는 디에게틱(동료 메시지·노트 여백 `NOTEBOOK_MARGINS`).
- 코치마크: 앱 첫 사용 시 한 문장 + 요소 하나 하이라이트(`data-coach`). 행동하면 사라진다.
- 막힘 힌트 3단: 넛지 → 방향 → 근접(UI 조작만). 방치 `idleSeconds` 마다, 또는 같은 실패 2회마다 한 단.
  실패 종류: `unknown_search`, `phrase_miss`, `wrong_deduction`, `empty_tap`, `link_miss`.
- **정답 금지**: 연도·인물·사건 정답, 4자리 연도, 인과 정답 마디 문장은 힌트·코치·도움말·여백·목표·겹치기 문구·카드 피드백에 쓰지 않는다(테스트).

### 8.2 단계 목록 (`src/data/terminal/tutorial.ts`)
| id | 앱 | 대상 키 | 보이는 때 → 끝나는 때 |
|---|---|---|---|
| tut_cold | notebook | `notebook.term` | 시작 → '무오█화' 검색 |
| tut_msg | messenger | `messenger.unread` | 메신저 설치 → m_c_01 읽음 |
| tut_search_first | search | `search.chip` | m_c_01 읽음 → '김일손' |
| tut_search_link | search | `search.chip` | '김일손' → '탁영금' |
| tut_viewer_open/tap/scrub/event | viewer | `dock.viewer`·`viewer.hotspot.first`·`viewer.scrubber` | 관측 지점 → 전교 |
| tut_return | viewer | `viewer.end` | 봉함 → 관측 종료 |
| tut_order_search | search | `search.chip` | 귀환 → 들은 전교 검색 |
| tut_board / tut_board_person | board | `board.deduction.person`·`board.evidence` | 귀환 → 인물 확정 |
| tut_archive | notebook | `notebook.tab.archive` | 인물 확정 → 전시 1회 |
| tut_notebook_compare | notebook | `notebook.tab.memo` | 보정 → m_c_07 읽음 |
| tut_source | search | `search.source.phrase` | 원문 대조 권한 → 구절 1개 |
| tut_year | board | `board.deduction.year` | 구절 1개 → 연도 부분 확정 |
| tut_link | board | `board.link` | 연도 부분 → 겹치기 카드 |
| tut_year_exact | board | `board.deduction.year` | 겹치기 카드 → 연도 확정 |
| tut_record | notebook | `notebook.record` | 연도 확정 → act_order |
| tut_cause | board | `board.deduction.cause` | 첫 복원 → 인과 확정 |
| tut_record_cause | notebook | `notebook.record` | 인과 확정 → act_cause |
| tut_archive_center | notebook | `archive.slot.center` | 무오사화 복원 → 중앙 진열 |

---

## 9. 첫 2분 (온보딩)

| 시각 | 화면 | 플레이어 행동 | 의도 |
|---|---|---|---|
| 0:00 | 검은 화면 → "기록 분석실. 밤 11시." / "모니터 하나만 켜져 있다. 그 옆에, 어젯밤 내가 쓴 노트." | 탭 | 분위기만 |
| 0:10 | 손 노트 한 쪽(종이 질감). 「무오█화 — 계속 조사」. 한 글자가 번졌다. 독에 노트 하나 → 검색 아이콘이 '설치'된다 | 번진 단어 탭 | 누를 것이 하나뿐. 의문이 먼저 |
| 0:25 | 검색: "그런 단어 없음." | — | 내가 쓴 단어가 세상에 없다 |
| 0:35 | 메신저가 설치되며 깜빡인다. 시스템 "로그인했습니다…" · 한 선임 "…「김일손」. 사인 없는 졸년 기록, 옛날엔 흔해." | 메시지 → 밑줄 탭 | 다음 문이 하나 |
| 0:50 | 변조 레코드: 1498년 7월 졸, 사인 기록 없음. 칩 '권오복'·'권경유' | 칩 탭 | 원인 없는 결과 ×3 |
| 1:20 | 한 선임 "봤지? 오류 0건…" 답장 2개 → "…「탁영금」, 보물이야." | 답장 → 칩 | 결과 있는 선택(대사가 달라짐) |
| 1:50 | 탁영금 기록, 첫 카드 도장. 관측 장치 "관측 지점 #001 개방" + "관측은 과거를 바꾸지 않습니다. 바뀌는 것은 현재가 기억하는 기록입니다." | — | 첫 성취 + 규칙 한 줄 |

---

## 10. 에피소드 1 흐름 (≈20~35분)
1. **起(2~3분, B0~B4)** — 손 노트의 없는 단어 → 원인 없는 죽음 → 탁영금 → 관측 지점.
2. **承(7~10분, B5~B7)** — 디오라마. 08:00 서리 → 안쪽 방 → 「조의제문」 → 14시 전교 → 15시 봉함 → 16시 "아직 살아 있소".
3. **轉(5분, B8~B11)** — 들은 전교가 실록에 없다. 첫 판정(이극돈). 밤사이 메모 말소. 원문 대조 권한.
4. **結 1(6~8분, B12~B13')** — 구절 → 연도(함정) → 카드 겹치기 → 한 해 → 첫 기록 → 첫 현실 이동.
5. **結 2(6~8분, B14~B15)** — 인과(봉우리) → 기록 → 무오사화 복원 → 에필로그("나만 기억한다") → 중앙 진열 → #002 예고.

---

## 11. 촉감 피드백 (`src/data/terminal/feedback.ts` `FEEDBACK`)
| 종류 | 소리 | 도장/애니 | 진동(ms) |
|---|---|---|---|
| tap | tick | 1px 눌림 | 8 |
| search_hit / search_miss | search_hit / search_miss | 결과 캐스케이드 / 입력창 흔들림 | 12 / — |
| evidence_new / evidence_level | discover / stamp | `stamp_new` / `stamp_verified` | 18-40-18 / 25 |
| phrase_stamp / phrase_miss | stamp / paper | 형광 잉크 번짐 / 으쓱 | 25 / — |
| link / link_miss | stamp / paper | 카드 합쳐짐 / 미끄러져 갈라짐 | 18-30-18 / — |
| record_fact | brush | 연필 따라 쓰기 + `stamp_ink` | 12-20-12-20-30 |
| **restore** | ink_bloom | `stamp_restored`, 따뜻한 먹 번짐 + 글자 깜빡여 바뀜 | 30-60-30 |
| **erase** | (무음) | 명도 한 칸 | — |
| scrub_tick | clock_tick | 눈금 통과 | 4 |
| verdict_confirmed / partial / wrong | success / partial / soft_thud | 연대표 채움 / 범위 좁힘 / 카드 밀림 | 20-60-40 / 20 / — |
| message / exhibit | message / case_open | 말풍선 팝 / 진열 조명 | 10 / 15-30-15 |

진동은 `settings.haptics` 이고 지원될 때만. 오답·말소에는 진동 없음. `prefers-reduced-motion` 에서 애니 축소.

---

## 12. 접근성
- 본문 16px 이상(확대 125/150%), 사료 본문은 선명한 글꼴. 시간 압박 없음. 한 손 모바일.
- 색만으로 정보 전달 금지: 판정·잠김·provenance·복원 도장은 아이콘+글자.
- 글리치 약하게(`reduceFlicker`), 빛 깜빡임 3Hz 미만. 다시 쓰기 깜빡임도 같은 규칙.
- 스크린 리더: 핫스팟 목록 모드, 손 노트 이전/이후는 "이전: … / 이후: …" 문장으로 읽힌다.

---

## 13. Contracts (병렬 구현 계약)

### 13.1 스토어 API (`src/store/gameStore.ts`)
```ts
// 단말
openApp(app: AppId, target?: Id): boolean      // AppId = 'messenger'|'search'|'viewer'|'board'|'notebook'
closeApp(): void
search(query): SearchOutcome                   // status: 'ok'|'unknown'|'too_short'|'empty'|'no_article'; hits[].noArticle
startObservation(tl?), scrubObservation(m), tapHotspot(id), endObservation()
openSource(sourceId): boolean                  // → openApp('search', sourceId) (원문 보기)
registerPhrase(sourceId, phraseId): PhraseResult  // source_access 전에는 'unavailable'
readMessage(id), chooseReply(messageId, choiceId)
inspectExhibit(id): ExhibitResult | null       // exhibit.restoredBy 가 있으면 기록관에서 '복원' 도장
// 보드·기록
linkEvidence(ids: Id[]): LinkResult            // {status:'linked'|'already'|'no_link'|'not_ready'|'not_owned', message, link?, gained}
submitDeduction(sub): JudgeResult              // sub.kind: 'year'|'person'|'event'|'causal'
recordFact(actId): RecordResult                // {status:'recorded'|'already'|'not_ready'|'unknown', act?, shiftId?, rewrites}
ackRewrites(): void                            // recentRewrites 비움(연출 끝)
ackDiffPage(): void                            // pendingDiffPageId 비움
// 튜토리얼·기타(기존)
dismissCoach, tickIdle, reportFail('unknown_search'|'phrase_miss'|'wrong_deduction'|'empty_tap'|'link_miss'), collectEvidence, …
```
상태(영속, **v3**): 기존 + `shifts`(적용 순), `rewriteLog: RewriteEntry[]`, `links`, `recorded`. 마이그레이션 v2→v3: 새 배열, 앱 id 매핑(reader→search, archive→notebook).
비영속: `ui`, `lastResult`, `lastSearch`, `lastTap`, **`recentRewrites: RewriteEntry[]`**, **`pendingDiffPageId: Id | null`**, `lastSavedAt`.

`RewriteEntry = {seq, sourceId, tone: 'erase'|'restore', kind: 'message'|'record'|'memo'|'search', targetId, before, after}`.

셀렉터(순수):
- 기존: `selectApps` · `selectInbox`(지금 현실의 본문) · `selectUnread` · `selectRecord`(보정·복원 반영) · `selectMemos`(지워진 메모 제외) · `selectExhibits` · `selectViewerFrame` · `selectTutorial` · `selectProgress`
- 현실 이동: `selectRewrittenMessages(s)` → `{[messageId]: {original, current, history}}`(연필 표시) · `selectNotebookDiffs(s)` → `[{shiftId, title, tone:'restore', rows[{id,before,after}]}]` ·
  `selectRestorations(s)` → `[{shiftId, title, stamp:'복원', items[{kind,id,title,provenance,sources}]}]` · `selectRecordActs(s)` → `[{act, available, recorded}]` ·
  `selectRecordLedger(s)` → 레코드별 `{current, currentBadge, original, originalBadge('변조'), restored}` · `provenanceBadge(p, altered)` · `selectCodexFields(s, entryId)`
- 연도: `selectYearCards(s)` → `[{id,label,text,level,verified,time,shape,feedback}]` · `selectYearPreview(s, ids)` → `{all, decisive, conflict}`
- 뷰어: `selectTimelineTicks(s)` · `selectNpcRoute(s, npcId)`

코어: `core/terminal.ts`(`checkState`(+shifts/links/recorded), `dueShifts`, `recordView`/`memoView`/`messageView`/`messageText`/`searchResultsView`(RealityLayers), `findLink`),
`core/deduction.ts`(`judgeCausal`), `core/chronology.ts`(카드 고유 피드백), `core/observation.ts`(`timelineTicks`, `npcRoute`), `core/search.ts`(`no_article`, `NO_ARTICLE_TEXT`).

### 13.2 버스 이벤트
기존(`app:open`, `viewer:*`, `glitch`, `feedback`, `notify`, `ui:*`). `FeedbackKind` 추가: `link`, `link_miss`, `record_fact`, `restore`, `erase`.
UI 는 `recentRewrites` 를 구독해 tone 에 맞춰 `feedback` 을 낸다(restore = 먹 번짐, erase = 무음 명도).

### 13.3 코치마크 대상 키(`data-coach`)
`notebook.term`, `notebook.tab.memo`, `notebook.tab.archive`, `notebook.record`, `messenger.unread`, `search.chip`, `search.source.phrase`,
`dock.viewer`, `viewer.hotspot.first`, `viewer.scrubber`, `viewer.end`, `board.deduction.person|year|cause`, `board.evidence`, `board.link`, `archive.slot.center`.

### 13.4 아트 키
앱 아이콘 `app_notebook·app_db·app_messenger·app_observe·app_board`. 아바타: 한 선임 / `avatar_colleague_b`(아키비스트) / 관측 장치 / 단말 / 나.
도장 `stamp_new/verified/ink/confirmed/partial/restored`. 전시물 `exhibit_*`(복원 전시물은 기존 키 재사용 + 복원 도장 겹침).
