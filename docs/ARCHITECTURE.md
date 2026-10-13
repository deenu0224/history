# ARCHITECTURE — 결록(缺錄)

> **v4 「근무」(최신, 이 머리말이 아래 본문보다 우선한다)** — 설계 `DESIGN_V4.md` §3(엔진)·§8(계약)·§9(저장).
> - 콘텐츠 번들에 `workShifts, cases, rules, interviews` 추가(`src/data/duty/`: 근무·건·규정·면담 + 건의 관측 장면 `caseTimelines`/`caseNpcs`). 배정(`assignments`)의 체크리스트는 삭제.
> - 새 코어 `core/duty.ts`(순수): 기록 카드 조각·변조·짝 → 검사 관계(differs/notation/none), 도장 판정 `judgeStamp`(not_ready 와 경고 구분), 규정 기능(capture·frame_for_correct·no_reopen), 근무 시계·큐, 경고·카운터(`dutyCounters`), 근무 보고.
> - 상태 조건(`StateCondition`)에 `duties, dutiesEnded, cases, current, counters, reached` 추가(`core/terminal.ts checkState`).
> - 스토어: 근무 액션(`startDuty, nextCase, inspect, stampCase, openReplay, finishInterview, endDuty`)과 셀렉터(`selectDesk, selectCaseCard, selectVerdictHistory, selectReplay, selectInterview, selectShiftReport, selectCaseLedger`). `apply()` 는 영속 키만 쓴다.
> - 저장 v5(`migrations[4]`: 설정만 남기고 버림). 검증기 10절(근무·건·TODO_VERIFY·#C-2217 정답 금지·일상 건 힌트 정답 금지).
>
> **v3 「대조」** — 설계 `DESIGN_V3.md`.
> - 콘텐츠 번들: `persons, artifacts, sources, events, places, worldObjects, npcs, timelines, clues, apps, assignments, closedReports, reports, searchEntries, records, messages, hints, corrections, shifts`. 증거 카드(evidence)·추리(deductions)·도감(collection)·노트·메모·구절·전시물·튜토리얼·카드 겹치기·기록하기는 삭제.
> - 새 코어 `core/report.ts`: 프레임(ViewerSnapshot + clueIds) → 단서(Clue: frame/record/combo) → 보고서 4칸 판정(언제=`chronology.judgeYear`, 누구=`deduction.judgePerson`, 무슨 일·그 결과=`judgeFacts`). 단서는 판정 엔진에 `clueAsEvidence` 로 넘긴다(§4~6 규칙 그대로).
> - `core/terminal.ts`: 상태 조건(heard·seen·clues·stamped·closed·opened·filed·hintsDone…), 앱 잠금, 메시지·보정·현실 이동, 레이어 보기(레코드·메시지·검색·배정 헤더·종결 보고서), 힌트 사다리(메신저만).
> - 저장 v4(`migrations[3]`: 설정만 남기고 버림). 스토어 계약은 `src/store/gameStore.ts` 머리 주석과 `DESIGN_V3.md` §10.
> - 검증기 `core/validate.ts`: 보고서 칸의 데이터 풀이 가능성(브루트포스), 단서 프레임 조건의 만족 가능성, 칩 색인, 해결 전 4자리 연도 금지, 힌트·피드백 정답 금지, 현대 문장 '졸' 금지, 복원 규칙.

> 코어 엔진·스토어·데이터 계약 문서. 그래픽(`src/game/art`)과 사료 목록(`HISTORICAL_SOURCES.md`)은 별도 문서를 따른다.

## 1. 계층

```
data (src/data)        순수 데이터. 콘텐츠 모듈 + 레지스트리. 로직 없음.
  ↓
core (src/core)        순수 TS 로직. React/Phaser 의존 없음. 단위 테스트 대상.
  ↓
store (src/store)      Zustand 단일 스토어. 진행 상태 + 액션. core 를 호출해 상태를 바꾼다.
  ↓            ↘
game (src/game)  ⇄ bus ⇄  ui (src/ui)
Phaser: 맵·이동·NPC·상호작용     React: 패널·노트·도감·추론판·메뉴
```

- **정답은 데이터에만 있다.** UI/Phaser 코드는 정답·연도·인물명을 하드코딩하지 않는다. 판정은 항상 `store.submitDeduction()` → `core/deduction.ts` 를 거친다.
- core 는 부수 효과가 없다(예외: `save.ts` 의 IndexedDB 입출력).
- 상태 변경은 오직 스토어 액션으로. 버스는 "일어난 일"의 알림 채널이다.

## 2. 데이터 흐름

```
[Phaser] 플레이어가 E/Space/탭
   → bus.emit('interact', { targetId })
[연결부(ui 또는 game 부트)] bus.on('interact')
   → store.examine(id) | store.talk(npcId)
   → 반환값(lines, gained)으로 UI 패널 표시, bus.emit('ui:open', {modal:'examine', id})
   → React 가 모달을 열면 bus.emit('world:pause', { paused: true })
[React 추론판] store.submitDeduction(submission)
   → core 판정 → 보상(Reward[]) 적용 → lastResult 갱신 → UI 가 결과/피드백 렌더
[자동 저장] enableAutosave(useGameStore) 가 영속 상태 변화를 감지해 'auto' 슬롯에 저장
```

Phaser 씬은 상태를 읽을 때 `useGameStore.getState()` / `useGameStore.subscribe()` 를 직접 쓴다(React 훅 불필요).

## 3. Phaser ↔ React 버스 계약 (`src/core/bus.ts`)

| 이벤트 | 페이로드 | 보내는 쪽 → 받는 쪽 | 의미 |
|---|---|---|---|
| `interact` | `{ targetId }` | Phaser → 연결부 | 오브젝트/NPC 상호작용 |
| `scene:enter` | `{ sceneId }` | Phaser → React | 씬 진입 완료 (`store.setScene` 호출은 수신 측) |
| `scene:goto` | `{ sceneId, spawn? }` | React → Phaser | 씬 전환 요청(문, 관측 시작/귀환) |
| `ui:open` | `{ modal, id? }` | 양방향 | 모달 열기. `modal ∈ examine·dialogue·evidence·notebook·collection·deduction·archive·settings·save` |
| `ui:close` | `{ modal? }` | 양방향 | 모달 닫기 |
| `world:pause` | `{ paused }` | React → Phaser | 입력·시간 정지/재개 |
| `world:time` | `{ minute }` | Phaser → React | 게임 내 시각(0~1439분) |
| `notify` | `{ text, tone? }` | 양방향 | 토스트 알림 |

API: `bus.on(type, fn) → unsubscribe`, `bus.once`, `bus.off`, `bus.emit(type, payload)`, `bus.clear()`. 테스트·격리용으로 `createBus<E>()` 제공. 씬 `shutdown` 시 반드시 구독 해제.

## 4. 도메인 모델 (`src/core/types.ts`)

| 타입 | 핵심 필드 |
|---|---|
| `ContentBase` | `id`, `provenance`, `sources?: SourceRef[]`, `authorNote?` — **모든 콘텐츠 공통** |
| `SourceRef` | `{ title, url, note? }` |
| `HistoricalPerson` | `name, hanja?, born?, died?, summary, facts: Fact[]` |
| `HistoricalArtifact` | `name, made?{from?,to?,estimated}, material?, holder?, sourceIds?` |
| `HistoricalSource` | 사료(실록 기사·문집): `title, compiled?, author?, excerpt?` |
| `HistoricalEvent` / `Place` | 사건(`year?, personIds?, placeId?`) / 장소 |
| `Evidence` | `category, levels: EvidenceLevel[]` — 단계별 `label, text, proves?: Fact[], time?: TimeConstraint` |
| `TimeConstraint` | `notBefore?, notAfter?`(포함), `strength: decisive·supporting·weak`, `weakReason?` |
| `Fact` | `{ kind: name·office·possession·claim…, value }` |
| `Deduction` | `YearDeduction · PersonDeduction · EventDeduction` (§5, §6) |
| `Observation` | 관측 장면: `sceneId, title, lines, grants?` |
| `Interactable` | `sceneId, x, y(타일), spriteKey, kind: object·npc·door·observe, label(식별 전), examine[], grants?, requires?(플래그), targetSceneId?` |
| `NpcDef` | `label, personId?, schedule: Waypoint[]{time(분),x,y,sceneId?,action?}, dialogue: DialogueLine[]{text, provenance, sources?, when?: FlagCondition, grants?}` |
| `CollectionEntry` | `category, refId, title, unidentifiedTitle, fields[{key,label,value,unlockStage}], links?` |
| `PlayerNotebook` | `observed · testimony · verified · hypothesis · question` 섹션별 `NoteEntry[]` |
| `Reward` | `evidence{evidenceId, level?}` · `collection{entryId, stage}` · `notebook{note}` · `resolveQuestion{noteId}` · `flag{flag, value?}` |
| `Grants` | `evidence?[{id, level?}], collect?[{entryId, stage?}], notebook?[], flags?[], observation?` — 상호작용/대사/관측의 획득물. 내부적으로 `Reward[]` 로 변환된다 |

증거 공개 단계: `levels[0]` 은 처음 얻은 카드(예: "미확인 관료"). `evidenceView(ev, level)` 은 0..level 단계의 `proves` 를 **누적**하고, `time` 은 **가장 늦게 정의된 단계 것**을 쓴다. 판정은 항상 플레이어가 보유한 단계 기준이다(공개 안 된 정보로는 증명할 수 없다).

## 5. 연대 추리 규칙 (`src/core/chronology.ts`)

### 5.1 입력
- 문제 `YearDeduction`: `target: {from, to}`(정답, 포함 범위, 단일 연도면 from=to), `context?: {from?, to?}`(근거 없이 주어지는 전제, 예: 조선 개국 1392), `maxPartialWidth`(부분 확정 허용 폭).
- 제출: `{ from, to, evidenceIds[] }`. 정수, `from ≤ to`.

### 5.2 정의
인용 증거 집합 `E`(중복 제거, **보유한 것만**, 보유 단계 기준 `time`)에 대해

```
L_all = max( context.from, { e.notBefore | e∈E, strength(e) ∈ {decisive, supporting} } )
U_all = min( context.to,   { e.notAfter  | e∈E, strength(e) ∈ {decisive, supporting} } )
L_dec, U_dec = 위와 같되 strength = decisive 만
```
값이 하나도 없으면 해당 경계는 "정의되지 않음"이다. **weak 증거는 어떤 경계에도 기여하지 않는다.**

### 5.3 판정 (위에서부터 처음 걸리는 규칙으로 결정)

| # | 조건 | 판정 | 피드백 코드 |
|---|---|---|---|
| 1 | 정수가 아님 또는 `from > to` | undetermined | `invalid_input` |
| 2 | 인용한 **비약** 증거 e 에 대해 `[from,to] ∩ [nb_e, na_e] = ∅` | **wrong** | `contradiction`(그 증거) |
| 3 | `from > target.from` 또는 `to < target.to` (제출 범위가 정답을 포함하지 않음) | **wrong** | `excludes_truth`(어느 쪽인지 말하지 않음) |
| 4 | `L_all` 미정의 또는 `from > L_all` / `U_all` 미정의 또는 `to < U_all` | undetermined | `unjustified_lower` / `unjustified_upper` |
| 5 | `[from,to] = target` 이고 `from ≤ L_dec` 이고 `to ≥ U_dec` | **confirmed** | — |
| 6 | `to − from + 1 ≤ maxPartialWidth` | **partial** | (`needs_decisive`: 경계 중 하나라도 보조 증거에만 근거) |
| 7 | 그 외 | undetermined | `too_broad` |

증거별 피드백(항상 첨부): `no_time_info`(연대 정보 없음), `weak`(“연대를 확정하기에 약합니다(장기간 사용된 물건)”), `bounds_lower`(하한만 제한), `bounds_upper`(상한만), `bounds_both`, `contradiction`, `weak_conflict`(약한 증거와 어긋나지만 판정에 쓰지 않음), `not_owned`, `unknown_evidence`.

### 5.4 성질 (단위 테스트로 보장)
- **정당화 = 경계가 증거보다 느슨하거나 같을 것.** 하한 `from` 은 인용 증거가 말하는 하한 이하여야 하고(`from ≤ L_all`), 상한도 대칭. 증거보다 좁게 주장하면 근거 없는 주장이다.
- 검증기(§7)가 "관련 증거의 모든 단계 제약이 정답을 포함"함을 보장하므로 `L_all ≤ target.from`, `U_all ≥ target.to`. 따라서 **정당화된 제출은 항상 정답을 포함**하고, 규칙 3 은 근거 없이 찍은 경우에만 걸린다.
- **확정**은 정답 범위와 정확히 같고, 두 경계가 모두 결정적 증거(또는 context)로 정당화될 때만. 보조 증거만으로 정확히 맞혀도 partial.
- `maxPartialWidth` 는 포함 경계(폭 = 해당 연 수). 정답 폭 이상이어야 한다(검증기).
- **정답 비공개:** 실패 피드백은 플레이어가 제출한 숫자와 자신이 인용한 증거 정보만 담는다. `implied`(인용 증거의 교집합)도 플레이어 자신의 증거로 계산되므로 공개해도 된다. 반복 제출로 이분 탐색하는 것을 막고 싶다면 UI 에서 `attempts` 를 노출/제한한다.
- 이견이 있는 사안은 `target` 을 범위로 둔다(가짜 단일 정답 금지).

## 6. 인물·사건 추리 (`src/core/deduction.ts`)

인용 증거가 입증한 사실 집합 `F`(보유 단계 기준, 누적)로 판정한다.

**인물** (`PersonDeduction{subjectEvidenceId, candidates, answer, requiredFacts}`)
1. 후보가 목록에 없음 → undetermined `unknown_choice`
2. `F` 의 사실 f 에 대해 후보가 같은 `kind` 의 사실을 가지지만 값이 모두 다름 → **wrong** `fact_contradiction`(사실 명시)
3. `requiredFacts` 중 `F` 에 없는 것 → undetermined `missing_fact`(**종류만** 명시: “아직 소유물을 입증하는 증거가…”)
4. 후보 ≠ 정답 → **wrong** `fact_unverified`(그 후보에게서 확인할 수 없는 필수 사실)
5. confirmed

후보에게 그 종류의 사실이 아예 없으면 "모순"이 아니라 "확인 불가"로 본다. 3 이 4 보다 앞이므로, 근거가 부족한 동안은 정답 후보와 오답 후보가 같은 판정을 받는다(정답 누설 방지).

**사건 서술** (`EventDeduction{statements[{id,text,refutedBy?}], answer, requiredFacts}`) — 명하였다/허락하였다/묵인하였다 류
1. 선택지 없음 → `unknown_choice` · 2. 선택 진술의 `refutedBy` 가 `F` 에 있음 → wrong `fact_contradiction` · 3. 필수 사실 누락 → undetermined `missing_fact` · 4. 정답 아님 → wrong `not_supported` · 5. confirmed

**보상** (`resolveDeduction(d, sub, ctx, previousBest)`): 판정 등급 wrong=undetermined < partial < confirmed. 이전 최고 등급보다 올라갈 때만 지급. partial 진입 시 `rewards.partial`, confirmed 진입 시 `rewards.confirmed`(처음부터 confirmed 이면 둘 다). 같은 보상을 두 번 주지 않는다.

## 7. 출처(provenance) 규칙과 검증기 (`src/core/validate.ts`)

| 값 | 의미 | 규칙 |
|---|---|---|
| `verified` | 공신력 있는 출처로 확인된 사실 | `sources` 에 `http(s)` url 을 가진 항목 ≥ 1 (**error**) |
| `reconstructed` | 사실 기반 연출(세부·대사 창작) | 출처 없으면 **warning** |
| `fictional` | SF 설정 | `historical/` 모듈에 있으면 **error** |

대사(`DialogueLine`)와 도감 필드(`CollectionField.provenance`)도 같은 규칙. `validateContent(content, { historical })` 가 검사하는 항목:

- id 유일성(모든 종류 통틀어), 대사 id·진술 id·필드 key 중복
- 모든 참조 해석: `relatedIds, sourceIds, personIds, placeId, personId, refId(카테고리와 종류 일치), links`, Grants/Reward 의 증거·도감·관측, 증거 단계 범위
- 증거 연대 제약: 경계 ≥1, 정수, `notBefore ≤ notAfter`, weak 이면 `weakReason`(warning)
- 연도 추리: `target` 정합, `maxPartialWidth ≥ 정답 폭`, `context ⊇ target`, **관련 증거의 모든 단계 제약 ⊇ target**(증거가 정답과 모순되면 error), 연대 정보 있는 증거 ≥1, 결정적 증거만으로 정답이 정확히 도출되지 않으면 `not_confirmable` warning
- 인물 추리: 정답 ∈ 후보, 정답이 필수 사실을 모두 가짐, 관련 증거의 사실이 정답과 모순 없음, **오답 후보는 필수 사실 중 하나 이상이 없어야 함**(`indistinguishable`), 필수 사실이 관련 증거로 입증 가능
- 사건 추리: 정답 진술이 반박되지 않음, 오답 진술이 반박 가능하지 않으면 warning
- 획득 경로: 관련 증거가 어떤 오브젝트/관측/대사/보상으로도 얻을 수 없으면 warning(진행 불가 방지)

반환: `{ ok, errors[], warnings[] }`, 각 항목 `{ severity, code, id, message }`. 테스트 `validate.test.ts` 가 레지스트리 전체를 검사하므로 콘텐츠 추가 후 `npx vitest run` 이 실패하면 콘텐츠 오류다.

## 8. 수집(도감) (`src/core/collection.ts`)

단계: `0 미발견 · 1 발견 · 2 정체 식별 · 3 정보 검증 · 4 관련 기록 연결 · 5 도감 완성`. 이벤트 매핑 `discover=1, identify=2, verify=3, link=4, complete=5`.
- 단계는 **오르기만** 한다(`advanceStage`). 오브젝트 `grants.collect` 기본은 1, 추리 보상으로 2~5.
- 제목: 0 `???`, 1 `unidentifiedTitle`, 2+ `title`. 필드는 `unlockStage ≤ 현재 단계` 만 표시.
- 완성도 `completion()` = Σstage / (5·항목수). 진행도: 인물 식별 = person ≥2, 유물 수집 = artifact ≥1, 사료 검증 = source ≥3, 사건 기록 = event ≥4.

## 9. 스토어 (`src/store/gameStore.ts`)

`createGameStore(content)` 팩토리(테스트용) + 기본 인스턴스 `useGameStore`(레지스트리 콘텐츠).

상태: `flags, evidence(id→공개 단계), collection(id→단계), notebook, solved(id→{best, attempts}), attempts, observations, examined, currentScene, settings` (= 영속 상태) + `ui{modal, paused}, lastResult, lastSavedAt`.

액션:
```ts
collectEvidence(id, level=0): boolean         revealEvidence(id, level): boolean  // 보유한 것만
examine(objectId): {object, lines, gained} | null   // requires 미충족 시 null, observe 는 관측 완료 처리
completeObservation(id): Reward[]             talk(npcId): {lines, gained} | null  // 조건 만족 대사 + grants
submitDeduction(sub): JudgeResult             // 시도 수 기록, 개선 시 보상 적용, lastResult 갱신
advanceCollection(entryId, stage): boolean    applyRewards(rewards): Reward[]   setFlag(flag, value=true)
addNote(note)  addHypothesis(text, refIds?): id  resolveQuestion(noteId)
setScene(id)  openModal(kind, id?)  closeModal()  setPaused(b)  updateSettings(patch)
save(slot='manual'): Promise<SaveFile>   load(slot='manual'): Promise<boolean>   reset()
```
헬퍼: `selectProgress(state, content)`, `enableAutosave(store, ms)`, `grantsToRewards`, `reduceReward(s)`(순수 함수).

## 10. 저장 스키마 (`src/core/save.ts`)

- 키: `gyeollok-save:auto`, `gyeollok-save:manual` (idb-keyval 기본 스토어).
- 파일: `{ schema: 'gyeollok-save', version: 1, savedAt: ISO, slot, data: PersistedState }`.
- 불러오기: 스키마 불일치/손상 → `SaveError`; 미래 버전 → `SaveError`; 과거 버전 → `migrations[v]`(v→v+1)를 순서대로 적용. 빈 슬롯 → `null`.
- **스키마 변경 절차:** `PersistedState` 수정 → `SAVE_VERSION` +1 → `migrations[이전버전] = (data) => 새 data` 추가 → save.test 에 마이그레이션 케이스 추가. 스토어 `load` 는 누락 필드를 기본값으로 채운다(settings·notebook 섹션 포함).

## 11. 디렉터리

```
src/
  core/        types.ts · content.ts(병합·색인·증거 단계) · chronology.ts · deduction.ts
               collection.ts · notebook.ts · world.ts(조건·NPC 일정·대사) · validate.ts · bus.ts · save.ts
  store/       gameStore.ts
  data/
    index.ts           레지스트리: modules{historical,fictional,deduction,world,sample}, content
    historical/        persons · artifacts · sources · events · places   (verified/reconstructed)
    fictional/         persons · places · events                        (SF 설정)
    deduction/         evidence · deductions · observations · collection
    world/             worldObjects · npcs
    sample/            PLACEHOLDER(sample_ 접두, fictional). INCLUDE_SAMPLE=false 로 제외
  game/        Phaser (scenes/, art/)
  ui/          React (screens/, components/)
tests/unit/    core·store 단위 테스트 (fixtures.ts 는 sample 모듈을 직접 사용)
```

## 12. 에피소드 추가 절차

1. **사실 확보**: `docs/HISTORICAL_SOURCES.md` 의 출처로 인물·유물·사료·사건·장소를 `data/historical/*.ts` 에 `verified`(url 필수) 또는 `reconstructed` 로 작성. 인물의 `facts` 는 출처로 확인된 것만.
2. **증거 설계**: `data/deduction/evidence.ts` 에 카드 작성. 처음 단계는 정체를 숨기고(`'미확인 관료'`), 이후 단계에서 `proves`/`time` 공개. 연대 제약의 `strength` 는 보수적으로: 제작 추정·장기 사용·후대 모사 가능 물건은 `weak` + `weakReason`.
3. **추리 작성**: `data/deduction/deductions.ts`. 연도 추리는 결정적 증거들의 교집합이 정확히 `target` 이 되도록(아니면 `not_confirmable` 경고). 인물 추리의 `requiredFacts` 는 모든 오답 후보를 걸러야 한다. 보상으로 도감 단계·노트·플래그를 연결.
4. **획득 경로 배치**: `data/world/*.ts` 에 오브젝트(`grants`)·NPC 대사(`when` 조건, `provenance`)·관측을 배치해 모든 관련 증거를 얻을 수 있게 한다. 중요한 증거는 재관측/대체 경로를 둔다.
5. **도감**: `data/deduction/collection.ts` 에 항목과 단계별 필드.
6. `npx vitest run` — 레지스트리 검증이 통과해야 한다. 실제 콘텐츠가 갖춰지면 `src/data/index.ts` 의 `INCLUDE_SAMPLE = false`.
