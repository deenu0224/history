# TERMINAL_DESIGN — 결록 단말

> 걷기 폐지 이후의 최상위 플레이 설계. 게임 전체가 연구원의 컴퓨터 화면 「결록 단말」이다(영화 〈서치〉(2018) 방식).
> 이야기와 플레이는 모두 OS 앱 안에서 일어난다. 역사 규칙은 그대로 절대적이다(`CLAUDE.md`, `HISTORICAL_SOURCES.md`).
> 스포일러(흑막·말소 원리)는 이 문서에 쓰지 않는다.

---

## 0. 요약

| 항목 | 결정 |
|---|---|
| 조작 | **탭·스크롤만**. 타자는 선택(검색어 칩으로 모든 진행 가능) |
| 화면 | 모바일 = 휴대폰처럼 전체 화면 앱 + 하단 독 / 데스크톱 = 창 OS. **같은 코드**, 레이아웃만 다름 |
| 앱 7개 | 메신저 · 통합 DB 검색 · 관측 뷰어 · 사료 뷰어 · 증거 보드 · 개인 기록관 · 손 노트 |
| 과거 관측 | 걷기 대신 **디오라마 + 하루 타임라인 스크럽**. 인물·사물을 그 시각에 탭 |
| 증거 검증 | 관측에서 얻은 카드(단계 0) → 들은 말로 **검색** → **사료 구절 등록** → 카드 단계 상승(연대 제약 공개) |
| 추리 판정 | 기존 엔진 그대로(`core/chronology`, `core/deduction`). UI 정답 하드코딩 금지 |
| SF 복선 | 중반 **정합성 보정**: 단말 메모·메타데이터만 조용히 바뀌고 손 노트는 그대로 |
| 레벨 디자인 | 닌텐도식 기승전결 · 해 보며 배우기 · 한 번에 하나 · 실패 무료 (§5) |
| 튜토리얼 | 앱별 코치마크 1줄 + 3단 힌트(넛지→방향→근접, UI 조작만) + 도움말 카드 (§8) |

---

## 1. 핵심 루프 (단말 안에서)

```
 메신저(소식·목표) ─► 검색(이름·물건) ─► 관측 뷰어(시간을 옮기며 탭)
        ▲                                         │ 들은 말 = 검색어 칩, 카드(단계 0)
        │                                         ▼
 기록관(전시) ◄─ 증거 보드(판정) ◄─ 사료 뷰어(구절 등록 → 카드 검증) ◄─ 검색(들은 말)
```

GDD §3 루프 `현대 조사 → 과거 관측 → 단서 수집 → 연대 추론 → 인물 식별 → 사료 검증 → 기록관 완성 → 다음 관측`
은 그대로이고, 각 단계가 앱 하나에 대응한다(§4).

**검색이 곧 추리다.** 색인에 있는 말만 결과가 나온다(Her Story 방식). 무엇을 검색할지 고르는 것이 추론이고,
결과는 검증된 기록(인물·실록 기사·탁영금)과 가상 DB 메타데이터다. 관측에서 직접 보고 들은 것만 증거 단계를
올린다(보지 않은 증거를 공짜로 주지 않는다 — `SearchEntry.conditional`).

---

## 2. 셸(OS) 구조

### 2.1 모바일(세로 우선, 가로 대응)
```
┌──────────────────────────┐
│ 23:04   결록 단말   ▮▮ ◔ │  상태 표시줄(시계=현실 시각 아님, 고정 연출)
├──────────────────────────┤
│                          │
│      (앱 전체 화면)       │  앱 하나만 보인다. 뒤로 = 독/스와이프
│                          │
│                          │
├──────────────────────────┤
│ 💬  🔍  📓  👁  🗂  🏛  📜 │  하단 독: 잠긴 앱은 자리째 숨김(새 앱이 '생기는' 연출)
└──────────────────────────┘
```
- 터치 영역 최소 44×44 CSS px, 한 손(엄지) 영역에 주요 버튼. 가로 모드: 독이 왼쪽 세로 줄.
- 관측 뷰어는 가로로 돌리면 디오라마가 넓어진다(강제 아님).

### 2.2 데스크톱(≥ 900px)
```
┌───────────────────────────────────────────────────────────┐
│ 결록 단말                                   23:04  ⚙ 도움말 │ 메뉴 막대
│ ┌─────────────┐ ┌──────────────────────────┐              │
│ │ 메신저       │ │ 관측 뷰어 #001            │   (배경화면)  │ 창: 끌기·최소화·앞으로
│ │ …           │ │  [디오라마]               │              │ 동시에 여러 창
│ └─────────────┘ │  ◀ ━━━━●━━━━━ ▶ 14:05     │              │
│                 └──────────────────────────┘              │
│ 💬 🔍 📓 👁 🗂 🏛 📜                                         │ 작업 표시줄
└───────────────────────────────────────────────────────────┘
```
- 같은 React 컴포넌트, 컨테이너만 `<Window>`(데스크톱) / `<FullscreenApp>`(모바일). `store.ui.app` = 앞에 있는 앱.
- 키보드: 검색창 Enter, 뷰어 ←/→ = 5분, Shift = 30분, Space = 재생/정지(선택).

---

## 3. 앱별 UX

### 3.1 메신저/메일 (`messenger`)
```
┌ 메신저 ───────────────────┐
│ ● 한 선임          (2)    │  대화 목록: 한 선임 / 관측 장치 / 결록 단말 / 관측 기록 요약
│   관측 장치               │
│   결록 단말               │
├──────────────────────────┤
│ 한 선임                    │
│ ┌───────────────────────┐ │
│ │아직 안 갔어? … _김일손_. │ │  밑줄 = 검색어 칩(탭 → 검색 앱으로 바로 검색)
│ └───────────────────────┘ │
│        [그러니까 이상한 거예요.] [ …그렇네요. ] │  답장: 분위기 플래그만
│ ── 할 일 ─────────────── │  목표(EPISODE_1.quests) 고정 핀
│ □ 통합 DB 에서 그 사관을 검색한다 │
└──────────────────────────┘
```
- 메시지는 조건이 되면 **도착**하고(`syncState`), 도착 즉시 `grants`가 적용된다(읽지 않아도 진행 막힘 없음).
- 답장(`chooseReply`)은 `reply_*` 플래그만 세운다. 퍼즐·잠금 플래그 금지(검증기 `choice_solves_puzzle`).
- `from: '나'` = 플레이어가 보낸 말(오른쪽 말풍선). 에필로그·예고도 여기로 온다.
- `provenance: verified` 메시지(에필로그 요약)는 출처 아이콘 표시.

### 3.2 통합 DB 검색 (`search`)
```
┌ 통합 DB 검색 ─────────────────────┐
│ [ 성종대왕 실록           ] [검색] │
│ 검색어 수첩: (김일손)(탁영금)(성종대왕)(성종대왕 실록)(사초)… │  ← 칩(가로 스크롤)
├──────────────────────────────────┤
│ 2건 일치 · 새 기록 1건             │
│ ▸ 『성종실록』 편찬 (사건)          │  결과 카드: kind 아이콘 + 제목 + 요약
│   ✓ 관측한 원고 더미와 맞아떨어진다. │  ← conditional.note (연결 표시)
│ ▸ 『연산군일기』 연산 1년 1월 14일  │  → [사료 뷰어에서 열기]
│ ▸ 메타데이터 — 김일손 관련 기록     │  레코드: 표 형식, 이상은 '너무 정상'으로만
│ ── 검색 기록 ──                     │
└──────────────────────────────────┘
```
- 정규화: NFKC·소문자·공백/문장부호/괄호/가운뎃점 제거. 한자·한글은 색인 항목이 두 표기를 모두 가진다.
- 일치: exact → contains(검색어가 2자 이상 색인어를 포함 — 문장째 넣어도 됨) → prefix(3자 이상·60%).
- 1자 검색은 정확 일치만, 아니면 `too_short`. 없는 말은 `unknown`: “‘타임머신’ — 색인에 없는 말입니다. 보고 들은 표현을 그대로 넣어 보세요.”
- 결과의 사료는 자동으로 사료 뷰어 서재(`sources`)에 들어간다. 결과 속 밑줄 말은 다시 칩이 된다.
- **이상은 미묘하게**: 메타데이터 표는 모두 '정상'. 교차 참조 밀도 0.998(상위 0.1%) 하나만 너무 고르다. 강조 색 없음.

### 3.3 관측 뷰어 (`viewer`) — 걷기 대체
```
┌ 관측 #001 ──────────────── 관측 종료 ┐
│ 시대 미상 · 연도 #### · 장소 미확인 · 인물 미확인 │  메타데이터 패널(고정 문자열)
│ ┌───────────────────────────────┐ │
│ │      (픽셀 디오라마, 쿼터뷰)     │ │  끌기 = 이동, 핀치/휠 = 확대(1×~3×)
│ │   🧍서리  ▦꾸러미               │ │  탭 = 핫스팟. 손가락 아래 24px 반경 판정
│ │                 🧍붉은 관복      │ │  노이즈: 경계 시각·한낮 짧게(명도/지터, 네온 금지)
│ └───────────────────────────────┘ │
│  08:00 ◀ ━━━━━━●━━━━━━━━ ▶ 19:00  14:05 │  스크럽 막대. 눈금 = 누군가 자리를 옮기는 시각
│  [▶ 재생 ×10]                         │  재생은 선택(시간 압박 없음)
├──────────────────────────────────────┤
│ 미확인 관원 (재구성)                   │  탭 결과 패널(store.lastTap)
│ “김일손(金馹孫)의 사초(史草)를 …” [실록] │  verified 대사는 출처 표식
│ +카드 '전교'  +검색어 (대내)(김일손의 사초) │
└──────────────────────────────────────┘
```
- 하루 08:00~19:00(480~1140분). 첫 진입 카메라는 곳간 앞, **08:00 에 서리(첫 핫스팟)가 화면 안**.
- NPC 위치 = 일정(`schedule`)에 따라 순수 계산(`npcPoseAt`): 웨이포인트 시각부터 12분간 선형 이동, 이후 머무름.
- 대사 = `DialogueLine.at`(시각 구간) ∧ `when`(플래그). 사물 = `Interactable.windows`, 구간 밖이면 `hiddenText`.
- 일부 정보는 **그 시각·그 자리에서만**: 주인이 비운 서안(10~12시, 17시~)의 법전, 당상이 일어선 14~15시의 서안.
- 신원 확인 전에는 실존 인물 이름을 화자로 쓰지 않는다(`displaySpeaker`, 도감 단계 2 이상이면 공개).
- 관측 종료 버튼 = 귀환. **재관측 자유**(마지막 시각 기억), 같은 보상은 두 번 주지 않는다.

### 3.4 사료 뷰어 (`reader`)
```
┌ 사료 뷰어 ─────────────────────────┐
│ 서재: 『연산군일기』 연산 1년 1월 14일 ▾ │
├───────────────────────────────────┤
│ 국역 (국사편찬위원회)                  │
│ 정부·육조·…빈청(賓廳)에 모여서          │
│ ░대행왕의 시호 및 묘호…를 의논하였다░    │  ░형광 구절░ = SourcePhrase (탭)
│ … ░묘호는 성(成)이라 하고░, 능호는 …    │
│ 출처: sillok.history.go.kr/id/kja_…   │
├───────────────────────────────────┤
│ [도장] '선왕의 칭호' → "묘호 '성종'"    │  등록 성공: 카드 단계 상승 + 연대 제약 공개
└───────────────────────────────────┘
```
- 본문은 `HistoricalSource.excerpt`(검증된 국역 그대로). 구절은 반드시 excerpt 의 부분 문자열(검증기).
- 연결할 관측이 없으면 `no_link`: “왕의 전교다. 관측에서 같은 말을 들었다면 맞춰 볼 수 있다.” — 벌점 없음, 다시 시도 가능.
- excerpt 가 없는 사료(「조의제문」, 『경국대전』)는 요약만 보이고 구절이 없다 → 해당 검증은 검색의 `conditional`.

### 3.5 증거 보드 (`board`)
기존 화면 재사용: `screens/Deduction.tsx`(+`YearPanel`, `FactPanels`), `components/EvidenceCard/EvidencePicker/Verdict`, `Graph`, `Timeline`.
```
┌ 증거 보드 ─────────────────────────┐
│ [누구인가 ✓] [언제인가 ◐] [무슨 일인가 🔒] │  잠긴 문제는 자물쇠(요건 문구 없이)
├───────────────────────────────────┤
│ 카드 더미(가로 스크롤)  ▣묘호 '성종' 1495↑ ▣실록청 1495–1499 │
│ 시작 [1495] ── 끝 [1498]   근거: ▣▣▣        │
│              [제출]                         │
│ 판정: 부분 확정 — '성종 승하 뒤'…           │
└───────────────────────────────────┘
```
- 판정은 `store.submitDeduction` → 엔진. 오답·미확정도 근거별 피드백(정답 비공개). 시도 무제한.

### 3.6 개인 기록관 (`archive`)
- 픽셀 전시실 한 장면(진열장·서가·인물 기록부·연대표·중앙 진열대)을 **갤러리 그리드**로도 볼 수 있다.
- 빛나는 칸 = 놓을 수 있는 전시물(`ArchiveExhibit.requires` 충족) → 탭(`inspectExhibit`) → 놓는 연출 + 도감 단계 상승.
- 도감(`Codex.tsx`)은 기록관의 '서랍'으로 재사용. 18항목, 카테고리별 수집률.

### 3.7 손 노트 (`notebook`) — 스캔한 종이
```
┌ 손 노트 ─────────── [손 노트 | 단말 메모] ┐
│  (종이 질감, 연필 글씨체)                │
│  관찰 · 증언 · 검증 · 가설 · 의문         │  PlayerNotebook 섹션 = 노트 쪽
│  ─ 교차 참조 밀도 0.998. 너무 고르다.     │
│  여백: "오래 쓰인 물건으로는 해를 정하지 말 것." │  NOTEBOOK_MARGINS(디에게틱 힌트)
└──────────────────────────────────────┘
```
- 손 노트 = `state.notebook`(오프라인, **보정 대상 아님**). 단말 메모 = `selectMemos()`(동기화, 보정됨).
- 두 탭을 나란히 놓으면 정합성 보정이 보인다(§7). 기존 `Notebook.tsx` 재사용(스킨만 종이로).

---

## 4. GDD 요구사항 대응

| GDD | 단말에서의 구현 |
|---|---|
| 연도 비공개(§0-3, §3.2) | 관측 뷰어 메타데이터는 고정 문자열(연도 `####`, 장소·인물 '미확인'). 시각(HH:MM)만 보이고 날짜 없음. 과거 문구·관측 중 목표·뷰어 튜토리얼 문구에 4자리 연도·왕대 금지(테스트) |
| 증거 기반 추론(§4~6) | 카드 단계 0(관측) → 사료 구절/검색으로 단계 1(연대 제약·사실 공개) → 보드 제출 → 엔진 판정 |
| 수집(§7) | 18 도감 항목. 검색·관측·구절·전시로 단계 상승. 선택 수집(대행왕) 포함 |
| 기록관(§7) | 개인 기록관 앱: 전시물 7(필수 5 + 선택 2) |
| 과거 관측의 제약(§8) | 관측자는 보이지 않고 바꿀 수 없다. 탭은 보기·듣기뿐. 정보는 시각·위치에 묶인다 |
| 재관측/대체 경로(§8) | 재관측 자유. 필수 증거마다 2개 이상 경로(예: 6조목 = 붉은 관복 15시~ / 푸른 관복 15~16시 / 사료 구절). 사료 뷰어는 보정 메시지를 읽지 않아도 검색 12회 뒤 열림 |
| 피드백(§11) | §11 촉감 표. 오답은 정답 비공개 + 근거 피드백. 추리 성공 시 연대표·기록관 반영 |
| 모바일(§11, CLAUDE 8) | 탭·스크롤만으로 완주(검증기: 진행 필수 색인은 칩으로 닿아야 함 `search_needs_typing`) |
| provenance(§12) | 탭 결과·메시지·레코드 모두 provenance. 재구성 대사는 표식 가능(설정 `showProvenance`) |

---

## 5. 레벨 디자인 원칙 — 닌텐도식

### 5.1 여덟 원칙과 적용
1. **기승전결(起承轉結)** — 각 메커니즘이 자기 작은 기승전결을 먼저 거친 뒤 결합된다(§5.2). 에피소드 전체도 기승전결.
2. **해 보며 배우기(월드 1-1)** — 첫 2분에 텍스트 벽 없음. 첫 화면엔 깜빡이는 메시지 하나, 첫 메시지에 첫 검색어(밑줄), 첫 관측 시각에 첫 핫스팟이 화면 안. 힌트는 동료 메시지·노트 여백이 1차 통로.
3. **한 번에 하나** — 한 비트에 새 동사 하나. 앱도 한 비트에 하나씩 생긴다(§6). 소개 → 단독 시험 → 결합.
4. **안전한 실험** — 틀린 검색·구절·추리는 무료. 실패 상태·진행 손실 없음. 재시도 즉시. 실패 문구는 장난스럽되 정보가 있다.
5. **만지는 맛** — 핵심 동사(검색·탭·스크럽·구절·제출)에 소리·픽셀 도장·작은 애니·진동(§11).
6. **호기심 보상** — 필수 경로 바로 옆에 비밀: 비운 서안(14~15시) → 전시 액자, '대행왕' 구절 → 선택 사료·전시, 선택 검색(이극돈·유자광·무오사화…), 보정 뒤 '정합성 보정' 검색 → "변경 0건" 로그.
7. **완만한 경사 + 숨 돌리기** — 봉우리(관측 轉, 연도 추리) 뒤엔 쉼(관측 종료·기록관·보정 이야기). 연도 추리(주 봉우리)는 하위 기술(검색·구절·보드)을 모두 익힌 뒤에만 열린다. 성종 재위 함정이 연도 추리의 轉.
8. **가족 누구나** — 큰 글씨(설정), 시간 압박 없음, 한 손 모바일, 짧은 세션: 각 結 = 저장할 만한 순간(자동 저장).

### 5.2 메커니즘별 기승전결
| 메커니즘 | 起(안전한 소개) | 承(살짝 변주) | 轉(뜻밖의 재조합) | 結(보상) |
|---|---|---|---|---|
| 검색 | 메시지 속 칩 '김일손' → 반드시 맞는다 | 결과 속 단어 '탁영금'을 다시 검색 | 과거에서 **들은 말**('성종대왕')이 현재 기록의 열쇠가 된다 | 카드 단계 상승(연대 제약 공개) 도장 |
| 관측 스크럽 | 08:00 화면 안의 서리를 탭 | 시간을 밀면 젊은 관원이 곳간으로 — 같은 사람, 다른 말 | 아침부터 '기다리던' 사람이 14시에 전교를 전한다(시간×장소×인물) | 봉함을 보고 관측 종료 — 손 노트에 남음 |
| 구절 등록 | 한 사료, 형광 구절 하나 → 도장 | 한 기사에 구절 셋: 본 것과 연결되는 것만 찍힌다(나머지는 무료 실패) | '아직 살아 있소'를 들은 그 사관의 처분 기사 — 같은 구절이 비극을 확정 | 연도 카드들이 모두 검증됨 |
| 증거 보드 | 인물 1문제, 카드 2장이면 충분 | 오답 후보 → '모순' 피드백으로 사실 읽기 | 연도: 범위 두 끝을 서로 다른 카드가 막는다 | 사건: 모든 것을 결합 → 에필로그 |
| 연도 추리 | 결정 카드 몇 장으로 범위 제출 → 부분 확정 | 카드를 더해 범위를 좁힌다 | **함정**: '성종'을 들었으니 성종 재위기? → 모순(묘호는 사후) | 「조의제문」 카드로 한 해 확정 → 연대표 완성 |
| 에피소드 | 起 프롤로그(메신저·검색·노트) | 承 관측 #001 | 轉 정합성 보정 + 성종 함정 | 結 기록관 중앙 진열 + 예고 |

### 5.3 비트 표(에피소드 1)
| 비트 | 새 동사 | 기승전결 역할 | 플레이어가 배우는 것 | 피드백 | 선택 보상 | 튜토리얼/힌트 | 예상(분) |
|---|---|---|---|---|---|---|---|
| B0 콜드 오픈 | (보기) | 에피소드 起 | 밤의 분석실, 단말 하나 | 글자 2줄, 탭하면 넘김 | — | 없음 | 0.2 |
| B1 메시지 | 탭해서 읽기 | 메신저 起 | 동료는 '정상'이라 한다. 밑줄 말 | 말풍선 팝·진동 | — | `tut_msg` 코치: “깜빡이는 메시지를 눌러 보세요.” | 0.3 |
| B2 첫 검색 | 칩 탭 = 검색 | 검색 起 | 검색 = 기록 열기. 메타데이터가 '너무 고르다' | 결과 캐스케이드, 노트 아이콘 등장 | '타임머신' 등 엉뚱한 검색 → 장난 피드백 | `tut_search_first` (실패 2회=힌트↑) | 0.7 |
| B3 손 노트 | 노트 펼치기 | 노트 起 | 내 관찰은 종이에 남는다(0.998) | 종이 넘김 | 동료 답장 고르기(분위기) | `tut_notebook` | 0.5 |
| B4 연결 검색 | 결과 속 말 재검색 | 검색 承 | 결과가 다음 검색어를 낳는다 | 첫 증거 카드 'NEW' 도장 | 선택 검색 '탁영'·'계운' | `tut_search_link` | 1 |
| B5 관측 진입 | 핫스팟 탭 | 관측 起 | 과거를 눌러 듣는다. 연도 #### | 진입 글리치, 칩 추가 '성종대왕' | 우물·항아리·병풍 묘사 | `tut_viewer_open`, `tut_viewer_tap` | 1.5 |
| B6 시간 | 스크럽 | 관측 承 | 시각이 자리와 말을 바꾼다 | 시계 틱 진동, 인물 이동 | 비운 서안의 법전(레드 헤링) | `tut_viewer_scrub`, 여백 “같은 자리도 시각이 다르면…” | 3 |
| B7 전교 | (스크럽+탭 결합) | 관측 轉 | 기다리던 사람이 14시에 명을 전한다 | 짧은 노이즈, '실록' 출처 표식 | 14~15시 당상의 빈 서안 → 액자 전시 | `tut_viewer_event` (방치 60초) | 3 |
| B8 귀환 | 관측 종료 | 관측 結 (저장점) | 본 것은 노트에 남는다 | 귀환 연출, 노트 쪽수 | — | `tut_return` | 0.5 |
| — 쉼 | | | 동료: “누가 누군지 보드에 붙여 봐” | | | | |
| B9 첫 판정 | 카드 골라 제출 | 보드 起·承 | 판정은 근거를 본다. 틀려도 무료 | 판정 도장 / 오답은 카드 흔들림 | — | `tut_board`, `tut_board_person` | 3 |
| B10 첫 전시 | 전시물 놓기 | 보드 結 = 기록관 起 (저장점) | 확인한 것이 진열된다 | 진열장 조명 | 빈 서안 액자 | `tut_archive` | 1 |
| B11 보정 | 두 탭 비교 | 노트 轉 · 에피소드 轉 (쉼) | 단말은 바뀌고 종이는 그대로 | 화면 한 칸 어두워짐(무음) | '정합성 보정' 검색 → “변경 0건” | `tut_notebook_compare`, 여백 “0.998. 분명히 봤다.” | 1.5 |
| B12 원문 | 들은 말 검색 → 구절 탭 | 검색 轉 · 구절 起承轉結 | 과거의 말이 기록의 열쇠, 구절이 카드를 검증 | 형광 잉크 번짐, 단계 상승 도장 | '대행왕' 구절 → 선택 사료·전시 | `tut_reader` (구절 실패 2회=힌트↑) | 4 |
| B13 연도 | 범위+근거 | 연도 起承轉結(주 봉우리) | 증거의 교집합. 사후 칭호의 함정 | 부분 확정 → 범위 좁힘 애니 → 연대표 채움 | 연대표 전시 | `tut_year` (방치 90초) | 4 |
| B14 사건 | 진술+근거 | 보드 結 · 결합 | 모든 것을 한 문장으로 | 확정 → 에필로그 메시지 | — | `tut_event` | 2 |
| B15 중앙 진열 | (전시) | 에피소드 結 (저장점) | 기록을 남긴 사람이 기록 때문에 사라졌다 | 진열 연출, 예고 알림·글리치 | 도감 18/18 | `tut_archive_center` | 1 |
| **합계** | | | | | | | **≈27** (빠른 플레이 ≈15) |

---

## 6. 진행 잠금(게이팅)

### 6.1 앱
| 앱 | 열리는 조건 | 비트 |
|---|---|---|
| 메신저, 검색 | 처음부터 | B1 |
| 손 노트 | `prologue_anomaly` (첫 검색 '김일손') | B3 |
| 관측 뷰어 | `obs_link_001` (관측 장치 메시지: 김일손+탁영금 조사) | B5 |
| 증거 보드 | `obs001_returned` | B9 |
| 개인 기록관 | `ded_person_confirmed` | B10 |
| 사료 뷰어 | `app_reader` (보정 메시지를 읽으면 동료가 열어 줌 / 막힘 방지: 보정 뒤 검색 12회) | B12 |

### 6.2 추리
| 추리 | requires | 이유 |
|---|---|---|
| 인물 `ded_person_001` | `f_met_official` (+보드 개방) | 보드 起: 관측만으로 풀 수 있는 쉬운 문제 |
| 연도 `ded_year_001` | `app_reader` | 주 봉우리는 구절 등록을 익힌 뒤 |
| 사건 `ded_event_001` | `ded_year_partial` | 결합은 마지막 |

### 6.3 관측 #001 의 시간표(스크럽)
| 시각 | 무엇 | 얻는 것 |
|---|---|---|
| 08:00~ | 곳간 앞 서리(첫 핫스팟): “성종대왕 실록을 다 엮어야…” | 카드 '선왕의 칭호', 칩 '성종대왕'·'성종대왕 실록' |
| 08:00~14:00 | 붉은 관복이 사초를 오래 본다 | 카드 '미확인 관료', 칩 없음 |
| 08:00~ | 곳간의 종이 꾸러미 / 대청 원고 더미 | 카드 '사초 꾸러미'·'선왕의 기록을 엮는 곳' |
| 10:00~12:00 | 젊은 관원이 곳간에서: “집에 두었던 것들이오” · 비운 서안의 『經國大典』 | 카드 '사초 꾸러미'(대체), '오래된 서책', 칩 '집에 둔 사초'·'經國大典' |
| 12:00~17:00 | 젊은 관원: 「조의제문」·점필재 (붉은 관복을 본 뒤) | 카드 '문제가 된 글'·'돌아가신 스승', 칩 |
| 13:00~ | 서리 귀엣말: 세조대왕 실록 편수 (붉은 관복을 본 뒤) | 카드 '서리의 귀엣말', 칩 '세조대왕 실록' |
| 14:00~16:00 | 대청 앞 관원: 전교(verified) | 카드 '전교', 칩 '대내'·'김일손의 사초' |
| 14:00~16:00 | 당상들의 간언(verified) / 14~15시 비운 당상 서안(선택) | 카드 '당상들의 간언', 칩 '직필' / 전시 액자 |
| 15:00~ | 여섯 조목을 봉함(붉은 관복 15시~, 푸른 관복 15~16시) | 카드 '봉해진 여섯 조목' |
| 16:00~ | 푸른 관복: “사초를 쓴 사관은 아직 살아 있소.” | 카드 '사초를 쓴 사관' |

### 6.4 증거 검증 경로(카드 단계 0 → 1)
| 카드 | 관측 | 검증(단계 1) |
|---|---|---|
| ev_myoho | 서리 c1 | 구절 `ph_myoho_seong` (src_myoho) |
| ev_sillokcheong | 꾸러미/원고 더미 | 검색 '성종대왕 실록' 등(`f_saw_bundles`) 또는 구절 `ph_compile` |
| ev_author_alive | 푸른 관복 b5 | 구절 `ph_verdict` |
| ev_jouijemun · ev_jongjik_dead | 젊은 관원 y3 | 검색 '조의제문'(`f_heard_jouijemun`) |
| ev_royal_order · ev_six_articles | 전교 m2 / 봉함 r3·b4 | 구절 `ph_order` · `ph_six` |
| ev_objection | 간언 b3 | (대체) 구절 `ph_custom` |
| ev_gajang | 꾸러미 / y2 | 검색 '사초'·'집에 둔 사초' |
| ev_lawbook | 비운 서안 | 검색 '經國大典' |
| ev_takyeong_record | — | 검색 '탁영금' |
| ev_unknown_official | 붉은 관복 r1 / 서리 c2 | 인물 추리 확정 보상 |
| ev_veteran | 서리 c3 | (단일 단계) |

---

## 7. 정합성 보정 사건 (가상, 복선)

- **데이터**: `src/data/terminal/archive.ts` `corrections[corr_001]`, 레코드 `rec_meta_kim_ilson`, 메모 `memo_anomaly`.
- **방아쇠**: 관측 종료(`obs001_returned`) 뒤 처음으로 추리를 제출했을 때(또는 검색 8회 이상). 보통 B9 첫 판정 직후 = 봉우리 뒤의 쉼.
- **효과(조용히)**: DB 메타데이터 '교차 참조 밀도' 0.998 → 0.712(정상 범위). 단말 메모 문장도 바뀐다. 표시·알림·흔적 없음.
  손 노트(`state.notebook`)의 “0.998” 은 **그대로**. 노트 의문 `q_correction` 추가, 여백 “0.998. 분명히 봤다. 여기 적었다.”
- **전달**: 시스템 “야간 정합성 보정 완료 · 변경 0건.” → 동료 “0.712던데? 정상 범위. 피곤해서 잘못 본 거야.” → 답장(분위기) → 동료가 사료 뷰어를 열어 준다.
  선택 검색 '정합성 보정'(보정 뒤에만 색인됨) → 시스템 로그 “보정 이력: 없음”.
- **규칙**: 보정은 `fictional` 레코드·메모만 바꿀 수 있다(검증기 `correction_touches_fact`). 검증된 역사 사실·사료는 절대 바뀌지 않는다.
  흑막·원리는 말하지 않는다(“단말은 늘 맞아.”). 연출은 명도 한 칸, 무음 — 형광·네온 금지.

---

## 8. 튜토리얼 · 힌트 (적당히)

### 8.1 구조
- **기본은 해 보며 배우기.** 텍스트 벽 없음. 1차 힌트 통로는 디에게틱(동료 메시지·노트 여백 `NOTEBOOK_MARGINS`).
- **코치마크**: 앱 첫 사용 시 **한 문장 이하** + 탭할 요소 **하나** 하이라이트(`TutorialStep.target` = `data-coach` 키). 그 행동을 하면 사라진다(`doneWhen`). ✕ 로 건너뛰기(`dismissCoach`).
- **막힘 힌트 3단**: 넛지 → 방향 → 근접(UI 조작만). 방치 `idleSeconds`(기본 40초)마다 한 단, 또는 같은 실패(`failOn`) 2회마다 한 단.
  - 실패 종류: `unknown_search`(없는 말·너무 짧음), `phrase_miss`, `wrong_deduction`(오답·미확정), `empty_tap`(UI 가 빈 곳 탭 시 `reportFail`).
  - 단계는 오르기만 하고 단계가 끝나면 사라진다.
  - **정답 금지**: 연도·인물·사건 정답, 4자리 연도, 정답 진술 문구는 힌트·코치·도움말·여백·목표에 쓰지 않는다(테스트 `terminal-content.test.ts`).
- **설정** `hintLevel`: 끔(코치·힌트 없음, 도움말만) / **보통**(기본) / 자세히(처음부터 1단, 방치 임계 절반, 실패 1회마다 한 단).
- **도움말**: 설정의 '도움말' + 각 앱 제목 줄의 ? → 앱별 `HelpCard` (다시 보기 가능).

### 8.2 단계 목록 (`src/data/terminal/tutorial.ts`)
| id | 앱 | 대상 키 | 보이는 때 → 끝나는 때 |
|---|---|---|---|
| tut_msg | messenger | `messenger.unread` | 시작 → m_c_01 읽음 |
| tut_search_first | search | `search.chip` | m_c_01 읽음 → se_kim_ilson |
| tut_notebook | notebook | `dock.notebook` | prologue_anomaly → 노트 열람 |
| tut_search_link | search | `search.result.term` | 노트 열람 → se_takyeong |
| tut_viewer_open | viewer | `dock.viewer` | obs_link_001 → obs001_entered |
| tut_viewer_tap | viewer | `viewer.hotspot.first` | 진입 → 탭 1회 |
| tut_viewer_scrub | viewer | `viewer.scrubber` | 탭 2회 → 스크럽 1회 |
| tut_viewer_event | viewer | `viewer.scrubber` | 붉은 관복 본 뒤 → 전교 |
| tut_return | viewer | `viewer.end` | 봉함 → 관측 종료 |
| tut_board | board | `board.deduction.person` | 귀환 → 인물 제출 1회 |
| tut_board_person | board | `board.evidence` | 제출 1회 → 인물 확정 |
| tut_archive | archive | `archive.slot.register` | 인물 확정 → 전시 1회 |
| tut_notebook_compare | notebook | `notebook.tab.memo` | 보정 → m_c_06 읽음 |
| tut_reader | reader | `reader.phrase` | 사료 뷰어 → 구절 1개 |
| tut_year | board | `board.deduction.year` | 구절 1개 → 연도 확정 |
| tut_event | board | `board.deduction.event` | 연도 부분 → 사건 확정 |
| tut_archive_center | archive | `archive.slot.center` | 사건 확정 → 중앙 진열 |

---

## 9. 첫 2분 (온보딩)

| 시각 | 화면 | 플레이어 행동 | 설계 의도 |
|---|---|---|---|
| 0:00 | 검은 화면 → “기록 분석실. 밤 11시.” / “모니터 하나만 켜져 있다. 결록 단말.” | 탭 | 분위기만, 설명 없음 |
| 0:10 | 데스크톱. 독에 아이콘 2개(메신저·검색). 메신저 배지 (1), 깜빡임 | 메신저 탭 | 누를 것이 하나뿐 |
| 0:20 | 동료: “…김일손. 데이터상 정상이라니까 — 직접 검색해 봐.” ‘김일손’ 밑줄 | 밑줄 탭 | 첫 검색어가 첫 메시지에 |
| 0:30 | 검색 앱이 열리며 자동 검색. 인물 카드·메타데이터 표·탁영금·처분 기사 | 결과 훑기 | 검색 = 기록 열기 |
| 0:50 | 독에 노트 아이콘이 '생긴다'(연필 자국). 동료: “봤지? 오류 0건…” 답장 2개 | 답장 고르기 | 결과 없는 선택지 아님(대사가 달라짐) |
| 1:10 | 노트: 연필 글씨 “교차 참조 밀도 0.998… 너무 고르다.” | 노트 넘기기 | 종이 노트의 존재(후반 복선) |
| 1:30 | 동료: “그 사람 거문고가 아직 남아 있다던데” / 결과 속 밑줄 ‘탁영금’ | 탭 | 결과가 다음 검색을 낳음 |
| 1:50 | 탁영금(보물 「김일손 거문고」) 기록. 첫 증거 카드 NEW 도장. 관측 장치: “관측 지점 #001 개방. 연도: ####.” 독에 눈 아이콘 | — | 첫 성취 + 다음 문 |

---

## 10. 에피소드 1 흐름 (15~30분)

1. **프롤로그(2~3분, B0~B4)** — 메신저·검색·노트. 이상(0.998)과 탁영금 → 관측 지점 개방.
2. **관측 #001(7~10분, B5~B8)** — 디오라마. 08:00 서리 → 곳간 → 대청 → 12시 「조의제문」 → 14시 전교 → 15시 봉함 → 16시 “아직 살아 있소” → 종료.
3. **쉼과 첫 판정(4분, B9~B10)** — 증거 보드로 붉은 관복의 당상을 특정(이극돈). 기록관 개방, 인물 기록부 전시.
4. **보정(1~2분, B11)** — 단말 메모가 바뀐다. 손 노트는 그대로. 동료가 사료 뷰어를 열어 준다.
5. **원문 대조(4~6분, B12)** — 들은 말로 검색, 국역 구절로 카드 검증(연대 제약이 열린다).
6. **연도(3~5분, B13)** — 부분 확정(1495~1498) → 함정(성종 재위기 = 모순) → 확정(1498).
7. **사건·결말(3분, B14~B15)** — 사초 문제 확정 → 에필로그(검증된 요약 + 연구원의 말) → 중앙 진열 → 이상 징후 #002 예고.

자동 저장은 영속 상태 변화마다(디바운스). 각 結(B4·B8·B10·B13·B15)은 자연스러운 멈춤 지점이다.

---

## 11. 촉감 피드백 (`src/data/terminal/feedback.ts` `FEEDBACK`)

| 종류(`FeedbackKind`) | 소리 | 도장/애니 | 진동(ms) |
|---|---|---|---|
| tap | tick | 1px 눌림 | 8 |
| search_hit / search_miss | search_hit / search_miss | 결과 캐스케이드 / 입력창 흔들림 | 12 / — |
| evidence_new | discover | `stamp_new` + 카드 뒤집혀 들어옴 | 18-40-18 |
| evidence_level | stamp | `stamp_verified` 카드 도장 | 25 |
| phrase_stamp / phrase_miss | stamp / paper | 형광 잉크 번짐 / 구절 '으쓱' | 25 / — |
| scrub_tick | clock_tick | 15분 눈금 통과 시 | 4 |
| verdict_confirmed / partial / wrong | success / partial / soft_thud | 연대표 채움 / 범위 좁힘 / 카드 살짝 밀림 | 20-60-40 / 20 / — |
| message / exhibit | message / case_open | 말풍선 팝 / 진열 조명 | 10 / 15-30-15 |

- 진동은 `settings.haptics` 이고 `navigator.vibrate` 가 있을 때만. 오답에는 진동 없음(벌처럼 느껴지지 않게).
- 모든 피드백은 120ms 안에 시작. 애니는 `prefers-reduced-motion` 에서 줄인다.

---

## 12. 접근성

- 본문 16px 이상(설정 확대 125/150%), 판독 텍스트는 선명한 글꼴(Galmuri 는 제목·UI 장식에만, 사료 본문은 시스템 세리프/산세리프).
- 시간 압박 없음: 관측은 멈춰 있고 플레이어가 시간을 옮긴다. 재생은 선택.
- 한 손 모바일: 주요 버튼 하단 1/3, 스크럽 막대는 엄지 영역. 핀치 없이도 ＋/－ 버튼.
- 색만으로 정보 전달 금지: 판정·잠김·provenance 는 아이콘+글자.
- 글리치 약하게(`reduceFlicker`), 빛 깜빡임 3Hz 미만.
- 스크린 리더: 핫스팟 목록 모드(뷰어 옆 '보이는 것' 목록 = `selectViewerFrame().hotspots` 중 available)로 탭 대체.
- 짧은 세션: 자동 저장 + 각 結에서 '여기까지' 지점.

---

## 13. Contracts (병렬 구현 계약)

### 13.1 스토어 API (`src/store/gameStore.ts`) — 정확한 시그니처
```ts
// 단말
openApp(app: AppId, target?: Id): boolean          // 잠긴 앱이면 false. ui.app/appTarget 설정, appsOpened 기록
closeApp(): void
search(query: string): SearchOutcome               // {query, normalized, status:'ok'|'unknown'|'too_short'|'empty', hits[{entryId, match, term, results: SearchResultRef[], linked: string[]}], gained, message}; lastSearch 갱신
startObservation(timelineId = 'tl_obs001'): boolean // 관측 뷰어 잠금 확인, 관측 완료 처리, ui.observation 설정
scrubObservation(minute: number): number           // [start,end] 로 고정·반올림한 값. 관측 중이 아니면 NaN
tapHotspot(hotspotId: Id): TapResult | null        // {hotspotId, targetId, kind, label, minute, status:'available'|'outside_window', lines[{speaker?, text, provenance, sources?}], gained}; hidden/관측 아님 → null; lastTap 갱신
endObservation(): Reward[]                         // 귀환 관측 완료, ui.observation = null
openSource(sourceId: Id): boolean                  // 서재에 있는 사료만 → openApp('reader', sourceId)
registerPhrase(sourceId: Id, phraseId: Id): PhraseResult // {status:'registered'|'already'|'no_link'|'unavailable', message, gained}
readMessage(id: Id): Message | null                // 도착한 것만
chooseReply(messageId: Id, choiceId: Id): boolean  // 한 번만
inspectExhibit(id: Id): ExhibitResult | null       // {exhibit, lines, gained}; 조건 미충족 null
// 튜토리얼
dismissCoach(stepId: Id): void
tickIdle(seconds: number): TutorialView | null     // UI 가 마지막 입력 후 경과 초를 주기적으로(예: 5초마다) 보낸다
reportFail(kind: 'unknown_search'|'phrase_miss'|'wrong_deduction'|'empty_tap'): void // UI 는 empty_tap 만 직접 호출
// 추리·수집·노트(기존)
collectEvidence, revealEvidence, submitDeduction(sub): JudgeResult, advanceCollection, applyRewards, setFlag,
addNote, addHypothesis, resolveQuestion
// UI·설정·저장
openModal(kind: ModalKind, id?), closeModal(), setPaused(b), updateSettings(patch), save(slot?), load(slot?), reset()
```
**제거됨**: `examine`, `talk`, `completeObservation`(내부), `setScene`, 상태 `currentScene`, `examined`(→ `tapped`).

상태(영속, v2): `flags, evidence, collection, notebook(손 노트), solved, attempts, observations, terms(칩), searchLog, searched, sources(서재), phrases, inbox(도착 순), read, replies, corrections, tapped, exhibitsSeen, obsMinute, appsOpened, stats, tutorial, settings{…, hintLevel, haptics, reduceFlicker}`.
비영속: `ui{modal, paused, app, appTarget?, observation}`, `lastResult`, `lastSearch`, `lastTap`, `lastSavedAt`.

셀렉터(순수, `(state, content?)`): `selectApps` · `selectInbox(s, c?, thread?)` · `selectUnread` · `selectRecord(s, id)`(보정 반영) ·
`selectMemos`(보정 반영) · `selectExhibits` · `selectViewerFrame(s, c?, timelineId?)` → `{minute, clock, glitch, npcs[{id, hotspotId, spriteKey, label, pose{x,y,action,moving,from,to,progress}}], hotspots[{id, targetId, kind, status, x, y}]}` ·
`selectTutorial(s, c?, app?)` → `{step, coach, tier, hint}` · `selectProgress`. 순수 헬퍼: `syncState`, `reduceReward(s)`, `grantsToRewards`, `backfillTerms`, `enableAutosave`.

코어 순수 모듈: `core/search.ts`(normalizeQuery, matchTerm, searchIndex, searchMessage), `core/observation.ts`(inWindow, npcPoseAt, linesAt, hotspotStatus, deriveHotspots, timelineMarks, glitchAt, displaySpeaker, viewerFrame, formatClock), `core/terminal.ts`(checkState, unlockedApps, dueMessages, dueCorrections, recordView, memoView, 튜토리얼 함수).

### 13.2 버스 이벤트 (`src/core/bus.ts`)
| 이벤트 | 페이로드 | 방향 |
|---|---|---|
| `app:open` | `{ app: AppId; target?: Id }` | 아무 쪽 → 셸 (셸이 `store.openApp` 호출) |
| `viewer:ready` | `{ timelineId }` | 뷰어(Phaser) → React |
| `viewer:tapped` | `{ hotspotId }` | 뷰어 → React. 뷰어가 먼저 `store.tapHotspot` 호출, React 는 `store.lastTap` 렌더 |
| `viewer:focus` | `{ hotspotId?; x?; y? }` | React → 뷰어(카메라 이동, 예: 노트에서 "어디서 봤지") |
| `glitch` | `{ intensity: 0~1; ms }` | 셸 → 오버레이·뷰어 (보정·관측 진입/종료) |
| `feedback` | `{ kind: FeedbackKind }` | 아무 쪽 → 셸(소리·진동, `FEEDBACK` 표) |
| `notify` | `{ text; tone? }` | 토스트 |
| `ui:open` / `ui:close` | `{ modal: ModalKind; id? }` | 모달(`evidence·deduction·collection·settings·save·help·sequence`) |

**제거됨**: `interact`, `scene:enter`, `scene:goto`, `world:pause`, `world:time`.

### 13.3 코치마크 대상 키(`data-coach`)
`messenger.unread`, `search.chip`, `search.result.term`, `dock.notebook`, `dock.viewer`, `viewer.hotspot.first`(뷰어가 첫 available 핫스팟 위치에 DOM 앵커 또는 `viewer:ready` 후 좌표 제공), `viewer.scrubber`, `viewer.end`, `board.deduction.person|year|event`, `board.evidence`, `archive.slot.register|center`, `notebook.tab.memo`, `reader.phrase`.

### 13.4 파일 소유 분할
| 트랙 | 소유 | 산출물 |
|---|---|---|
| (이번) 코어·데이터 | `src/core/**`, `src/store/**`, `src/data/**`, `tests/unit/**`(art/world/ui 테스트 제외), 이 문서 | 완료 |
| **A. OS 셸 + 앱 UI** | `src/ui/**`, `src/styles/**`, `src/App.tsx`, `src/main.tsx`, `tests/e2e/**` | `<Shell>`(모바일 전체화면/데스크톱 창), 독, 7개 앱, 코치마크 오버레이(`selectTutorial`), 토스트, 설정(힌트 수준·진동·글리치)·도움말, `FEEDBACK` 재생(오디오는 `src/game/audio.ts` API 사용). 기존 재사용: Deduction/YearPanel/FactPanels/Codex/Reader/Graph/Timeline/Notebook/EvidenceCard/EvidencePicker/Verdict/kit. 탭 결과 패널은 `lastTap`. 빈 곳 탭은 `reportFail('empty_tap')`. 방치 타이머 → `tickIdle`. |
| **B. 관측 뷰어** | `src/game/**`(art 제외) | React 컴포넌트 `<ObservationViewer timelineId="tl_obs001" />` + 명령형 API `{ focus(hotspotId|xy), setMinute(m), zoomTo(z), destroy() }`. Phaser 씬: `MAPS.obs001` 디오라마를 기존 tiles/autotile 로 렌더, NPC 액터(`NpcActor` 재사용)는 매 스크럽마다 `selectViewerFrame` 의 pose 로 배치(이동 중이면 from→to 경로 탐색 보간), 팬(끌기)·핀치/휠 줌·관성, 핫스팟 히트 테스트 → `store.tapHotspot` → `bus 'viewer:tapped'`, `glitch` 구독(명도·지터 셰이더/오버레이), `viewer:focus` 구독. 플레이어 캐릭터·이동·충돌·문·씬 전환 삭제. 스크럽 UI(막대)는 A 가 React 로 그리고 `store.scrubObservation` 호출, 뷰어는 store 구독으로 반응. |
| **C. 아트** | `src/game/art/**` | OS 아이콘(`app_*` 7종 + `_sm`), 창 크롬·독·상태 아이콘, 배경화면(가로/세로), 글리치 오버레이(`ov_*`), 노트 종이 질감·연필 글씨 장식, 도장 텍스처(`stamp_new/verified/ink/confirmed/partial`), 전시물(`exhibit_takyeong`, `exhibit_source_shelf`, `exhibit_person_register`, `exhibit_timeline`, `exhibit_center_record`, `exhibit_red_desk`, `exhibit_daehaengwang`), 아바타(한 선임/관측 장치/단말/나), 핫스팟 하이라이트(과하게 빛나지 않는 테두리). 탁영금 픽셀은 확정 특징만(CLAUDE 5). |

데이터가 참조하는 아트 키: 앱 `iconKey` = `app_messenger·app_db·app_notebook·app_observe·app_board·app_archive·app_reader`; 전시물 `spriteKey` 위 7종; NPC·사물 스프라이트는 기존 키 그대로.

### 13.5 더 이상 쓰지 않는 파일(정리 대상)
- `src/game/scenes/WorldScene.ts`(걷기·문·씬 전환) → B 가 `ObservationScene` 으로 대체. `src/game/logic/collision.ts`, `interact.ts`, `keys.ts`(이동 키) 폐기. `pathfinding.ts`·`autotile.ts`·`grid.ts`·`zoom.ts`·`clock.ts` 는 재사용 가능.
- `src/game/maps/fallback.ts`(lab/archive 내장 맵), `src/game/devFixture.ts`, `src/game/devEntry.tsx`, `dev-world.html` — 뷰어용 개발 진입점으로 교체.
- `src/ui/glue.ts`(interact/examine/talk 연결), `src/ui/screens/Hud.tsx`(걷기 HUD), `src/ui/screens/Dialog.tsx`(걷기 대화창 → 탭 결과 패널), `src/ui/lib/scene.ts`, `src/ui/lib/script.ts`(prologue/epilogue 시퀀스 → 메시지), `src/ui/screens/Database.tsx`(→ 검색 앱), `src/ui/screens/Archive.tsx`(→ 기록관 앱으로 재작성).
- 데이터: 연구실·기록관 맵(`MAPS.lab/archive`)과 lab_*/arc_*/obs_return_point 오브젝트는 삭제됨(검색·메시지·전시물로 이전).

### 13.6 현재 깨진 곳(타입체크, A·B 가 고칠 것)
`src/ui/App.tsx`(5: currentScene), `src/ui/glue.ts`(19: examine/talk/setScene/interact/scene:goto), `src/ui/lib/script.ts`(7: EPISODE_1.prologue/epilogue/afterReturn, sceneId), `src/ui/screens/Hud.tsx`(3), `src/ui/screens/Codex.tsx`(1: ModalKind), `src/game/scenes/WorldScene.ts`(19: interact·scene·world 이벤트, currentScene), `src/game/scenes/BootScene.ts`(1), `src/game/devEntry.tsx`(1). `src/core`·`src/store`·`src/data`·`tests/unit` 은 오류 0.
