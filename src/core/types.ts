// 결록 도메인 타입. 데이터(src/data) → 코어(src/core) → 스토어(src/store) 가 공유한다.

export type Id = string;
/** 서기 연도(정수). 음력/월일은 다루지 않는다. */
export type Year = number;

// ── 출처·정보 층위 ──────────────────────────────────────────────
export type Provenance = 'verified' | 'reconstructed' | 'fictional';

export interface SourceRef {
  title: string;
  url: string;
  note?: string;
}

export interface ContentBase {
  id: Id;
  provenance: Provenance;
  /** verified 이면 url 있는 출처 1개 이상 필수(validate.ts). */
  sources?: SourceRef[];
  /** 작가용 메모. UI에 노출하지 않는다. */
  authorNote?: string;
}

// ── 사실(Fact): 증거가 입증하고, 인물·진술이 보유/요구한다 ─────────
export type FactKind =
  | 'name'
  | 'courtesyName'
  | 'penName'
  | 'office'
  | 'clan'
  | 'origin'
  | 'relation'
  | 'possession'
  | 'handwriting'
  | 'event'
  | 'claim'
  | 'trait';

export interface Fact {
  kind: FactKind;
  value: string;
}

// ── 역사 콘텐츠 ────────────────────────────────────────────────
export interface HistoricalPerson extends ContentBase {
  name: string;
  hanja?: string;
  born?: Year;
  died?: Year;
  summary: string;
  /** 검증된 사실. 인물 추리에서 증거 사실과 대조된다. */
  facts: Fact[];
  relatedIds?: Id[];
}

export interface HistoricalArtifact extends ContentBase {
  name: string;
  hanja?: string;
  /** 제작 추정 시기. 추정치는 확정 연대로 쓰지 않는다. */
  made?: { from?: Year; to?: Year; estimated: boolean };
  material?: string;
  holder?: string;
  summary: string;
  sourceIds?: Id[];
  relatedIds?: Id[];
}

/** 사료(실록 기사, 문집 등). 웹 출처(SourceRef)와 구분된다. */
export interface HistoricalSource extends ContentBase {
  title: string;
  hanja?: string;
  compiled?: Year;
  author?: string;
  summary: string;
  /** 원문/번역 발췌. provenance 가 verified 일 때만 원문으로 표시. */
  excerpt?: string;
  relatedIds?: Id[];
}

export interface HistoricalEvent extends ContentBase {
  name: string;
  hanja?: string;
  year?: Year;
  personIds?: Id[];
  placeId?: Id;
  sourceIds?: Id[];
  summary: string;
}

export interface Place extends ContentBase {
  name: string;
  hanja?: string;
  region?: string;
  summary: string;
}

// ── 증거 ──────────────────────────────────────────────────────
export type EvidenceStrength = 'decisive' | 'supporting' | 'weak';

/** 연대 제약. notBefore/notAfter 는 포함(inclusive) 경계. 최소 하나는 있어야 한다. */
export interface TimeConstraint {
  notBefore?: Year;
  notAfter?: Year;
  strength: EvidenceStrength;
  /** weak 인 이유. 예: '장기간 사용된 물건', '후대 모사본일 수 있음' */
  weakReason?: string;
}

/** 증거 카드의 공개 단계. levels[0] 은 처음 얻었을 때(예: '미확인 관료'). */
export interface EvidenceLevel {
  label: string;
  text: string;
  /** 이 단계에서 새로 입증되는 사실(이전 단계 사실은 누적). */
  proves?: Fact[];
  /** 이 단계부터 알려지는 연대 제약(나중 단계가 덮어쓴다). */
  time?: TimeConstraint;
}

export type EvidenceCategory = 'object' | 'document' | 'person' | 'testimony' | 'place' | 'observation';

export interface Evidence extends ContentBase {
  category: EvidenceCategory;
  levels: [EvidenceLevel, ...EvidenceLevel[]];
  relatedIds?: Id[];
}

/** 특정 공개 단계에서 플레이어가 보는 증거. */
export interface EvidenceView {
  id: Id;
  level: number;
  label: string;
  text: string;
  facts: Fact[];
  time?: TimeConstraint;
}

// ── 보상·획득 ─────────────────────────────────────────────────
export type FlagValue = boolean | number | string;

export type NotebookSection = 'observed' | 'testimony' | 'verified' | 'hypothesis' | 'question';

export interface NotebookGrant {
  id: Id;
  section: NotebookSection;
  text: string;
  refIds?: Id[];
  provenance?: Provenance;
}

export type Reward =
  | { type: 'evidence'; evidenceId: Id; level?: number }
  | { type: 'term'; term: string }
  | { type: 'source'; sourceId: Id }
  | { type: 'collection'; entryId: Id; stage: CollectionStage }
  | { type: 'notebook'; note: NotebookGrant }
  | { type: 'resolveQuestion'; noteId: Id }
  | { type: 'flag'; flag: string; value?: FlagValue };

export interface Grants {
  evidence?: { id: Id; level?: number }[];
  collect?: { entryId: Id; stage?: CollectionStage }[];
  notebook?: NotebookGrant[];
  flags?: string[];
  observation?: Id;
  /** 검색어 수첩에 추가되는 표현(보고 들은 그대로). 칩으로 검색할 수 있다. */
  terms?: string[];
  /** 사료 뷰어 서재에 들어가는 사료 id */
  sources?: Id[];
}

/** 모든 플래그 조건은 truthy 검사. */
export interface FlagCondition {
  all?: string[];
  none?: string[];
}

// ── 관측·월드 ─────────────────────────────────────────────────
export interface Observation extends ContentBase {
  sceneId: Id;
  title: string;
  lines: string[];
  grants?: Grants;
}

export type InteractableKind = 'object' | 'npc' | 'door' | 'observe';

/** 관측 타임라인의 시각 구간(분). [from, to) */
export interface TimeWindow {
  from: number;
  to: number;
}

export interface Interactable extends ContentBase {
  sceneId: Id;
  /** 타일 좌표 */
  x: number;
  y: number;
  spriteKey: string;
  kind: InteractableKind;
  /** 식별 전 표시 이름 */
  label: string;
  examine: string[];
  grants?: Grants;
  /** 이 플래그가 truthy 일 때만 상호작용 가능 */
  requires?: string;
  /** door: 이동할 씬 (터미널 전환 후 미사용) */
  targetSceneId?: Id;
  /** 관측 뷰어: 이 시각 구간에만 살펴볼 수 있다(없으면 항상) */
  windows?: TimeWindow[];
  /** 구간 밖에서 탭했을 때 보여 줄 문구 */
  hiddenText?: string;
}

export interface Waypoint {
  /** 게임 내 하루 분(0~1439). 해당 시각부터 이 위치로 이동/체류. */
  time: number;
  x: number;
  y: number;
  sceneId?: Id;
  action?: string;
}

export interface DialogueLine {
  id: Id;
  speaker?: string;
  text: string;
  provenance: Provenance;
  sources?: SourceRef[];
  when?: FlagCondition;
  /** 관측 뷰어: 이 시각 구간에만 들리는 말/보이는 행동(없으면 항상) */
  at?: TimeWindow[];
  grants?: Grants;
}

export interface NpcDef extends ContentBase {
  sceneId: Id;
  spriteKey: string;
  /** 식별 전 표시 이름(예: '미확인 관료') */
  label: string;
  personId?: Id;
  schedule: Waypoint[];
  dialogue: DialogueLine[];
}

// ── 추리 ──────────────────────────────────────────────────────
export type Verdict = 'confirmed' | 'partial' | 'undetermined' | 'wrong';

interface DeductionBase extends ContentBase {
  title: string;
  prompt: string;
  /** 이 추리에 쓰일 수 있는 증거(검증·획득 가능성 검사용). */
  relevantEvidence: Id[];
  rewards: { confirmed: Reward[]; partial?: Reward[] };
  requires?: string;
}

export interface YearDeduction extends DeductionBase {
  kind: 'year';
  /** 정답 범위(포함). 단일 연도면 from === to. */
  target: { from: Year; to: Year };
  /** 근거 없이 주어지는 전제(예: 조선 개국~). 경계 정당화에 쓰인다. */
  context?: { from?: Year; to?: Year };
  /** 부분 확정 허용 최대 폭(연 수, 포함 범위 to-from+1). */
  maxPartialWidth: number;
}

export interface PersonDeduction extends DeductionBase {
  kind: 'person';
  /** 미확인 인물 카드(증거 id) */
  subjectEvidenceId: Id;
  candidates: Id[];
  answer: Id;
  /** 신원을 특정하는 데 반드시 인용되어야 할 사실 */
  requiredFacts: Fact[];
}

export interface EventStatement {
  id: Id;
  text: string;
  /** 이 사실이 인용되면 진술이 반박된다. */
  refutedBy?: Fact[];
}

export interface EventDeduction extends DeductionBase {
  kind: 'event';
  eventId: Id;
  statements: EventStatement[];
  answer: Id;
  requiredFacts: Fact[];
}

export type Deduction = YearDeduction | PersonDeduction | EventDeduction;

export type DeductionSubmission =
  | { kind: 'year'; deductionId: Id; from: Year; to: Year; evidenceIds: Id[] }
  | { kind: 'person'; deductionId: Id; candidateId: Id; evidenceIds: Id[] }
  | { kind: 'event'; deductionId: Id; statementId: Id; evidenceIds: Id[] };

export type FeedbackCode =
  | 'invalid_input'
  | 'unknown_deduction'
  | 'unknown_evidence'
  | 'not_owned'
  | 'no_time_info'
  | 'weak'
  | 'bounds_lower'
  | 'bounds_upper'
  | 'bounds_both'
  | 'contradiction'
  | 'weak_conflict'
  | 'excludes_truth'
  | 'unjustified_lower'
  | 'unjustified_upper'
  | 'needs_decisive'
  | 'too_broad'
  | 'no_facts'
  | 'fact_contradiction'
  | 'fact_unverified'
  | 'missing_fact'
  | 'not_supported'
  | 'unknown_choice';

export interface Feedback {
  code: FeedbackCode;
  message: string;
  evidenceId?: Id;
  fact?: Fact;
}

export interface JudgeResult {
  deductionId: Id;
  verdict: Verdict;
  feedback: Feedback[];
  /** 연도 추리: 인용한(약하지 않은) 증거가 함의하는 범위. 플레이어 자신의 증거로 계산되므로 공개 가능. */
  implied?: { from?: Year; to?: Year };
}

// ── 수집 ──────────────────────────────────────────────────────
export type CollectionCategory = 'artifact' | 'source' | 'person' | 'event' | 'place';
/** 0 미발견, 1 발견, 2 정체 식별, 3 정보 검증, 4 관련 기록 연결, 5 도감 완성 */
export type CollectionStage = 0 | 1 | 2 | 3 | 4 | 5;

export interface CollectionField {
  key: string;
  label: string;
  value: string;
  unlockStage: CollectionStage;
  provenance?: Provenance;
}

export interface CollectionEntry extends ContentBase {
  category: CollectionCategory;
  /** 연결된 콘텐츠 id(카테고리와 같은 종류여야 함) */
  refId: Id;
  title: string;
  /** stage 1 에서 보이는 이름 */
  unidentifiedTitle: string;
  spriteKey?: string;
  fields: CollectionField[];
  links?: Id[];
}

// ── 노트 ──────────────────────────────────────────────────────
export interface NoteEntry extends NotebookGrant {
  seq: number;
  resolved?: boolean;
}

export type PlayerNotebook = Record<NotebookSection, NoteEntry[]>;

// ── 결록 단말(터미널) ───────────────────────────────────────────
export type AppId = 'messenger' | 'search' | 'viewer' | 'reader' | 'board' | 'archive' | 'notebook';

/** 플레이 통계(상태 조건·튜토리얼 판정용). 오르기만 한다. */
export interface PlayStats {
  searches: number;
  unknownSearches: number;
  scrubs: number;
  taps: number;
  phrases: number;
  phraseMisses: number;
  deductionAttempts: number;
  exhibits: number;
}

/**
 * 플래그 조건의 확장. 모든 항목은 AND.
 * all/none: 플래그 truthy 검사 · evidence: 보유 증거 · searched: 한 번 이상 맞힌 검색 항목
 * read: 읽은 메시지 · appsOpened: 열어 본 앱 · phrases: 등록한 구절 · tapped: 탭한 핫스팟
 * attempted: 한 번 이상 제출한 추리 · corrections: 적용된 보정 · minStats: 통계 하한
 */
export interface StateCondition extends FlagCondition {
  evidence?: Id[];
  searched?: Id[];
  read?: Id[];
  appsOpened?: AppId[];
  phrases?: Id[];
  tapped?: Id[];
  attempted?: Id[];
  corrections?: Id[];
  minStats?: Partial<PlayStats>;
}

export interface AppDef extends ContentBase {
  app: AppId;
  title: string;
  /** src/game/art 의 아이콘 키 */
  iconKey: string;
  order: number;
  /** 없으면 처음부터 열림 */
  unlockWhen?: StateCondition;
}

/** 검색 결과가 가리키는 콘텐츠 */
export type SearchRefKind = 'person' | 'artifact' | 'source' | 'event' | 'place' | 'evidence' | 'record';
export interface SearchResultRef {
  kind: SearchRefKind;
  id: Id;
}

/**
 * 통합 DB 색인 항목. terms 는 정규화 전 표기(한글·한자 이형 포함). provenance 는 색인 자체(가상 DB)의 층위,
 * 결과로 보이는 내용은 각 ref 콘텐츠의 provenance 를 따른다.
 */
export interface SearchEntry extends ContentBase {
  terms: string[];
  /** 이 조건이 아니면 색인에 없는 것처럼 동작 */
  requires?: StateCondition;
  results: SearchResultRef[];
  /** 맞힐 때마다(최초 1회 효과) 주는 것 */
  grants?: Grants;
  /** 관측·사료로 뒷받침될 때만 주는 것(증거 단계 상승 등) */
  conditional?: { when: StateCondition; grants: Grants; note?: string }[];
  /** 칩 없이 직접 입력해야 닿는 선택 검색(호기심 보상). 진행 필수 항목에는 쓰지 않는다. */
  optional?: boolean;
}

/** DB 메타데이터 레코드(가상). 정합성 보정의 대상이 될 수 있다. */
export interface DbRecord extends ContentBase {
  title: string;
  fields: { key: string; label: string; value: string }[];
  note?: string;
}

/** 사료 뷰어에서 고를 수 있는 구절. text 는 사료 excerpt 의 부분 문자열이어야 한다(검증기). */
export interface SourcePhrase extends ContentBase {
  sourceId: Id;
  text: string;
  /** 연결할 관측이 있어야 효과가 난다 */
  when?: StateCondition;
  grants?: Grants;
  /** when 불충족 시 피드백 */
  missText?: string;
}

export interface Hotspot {
  id: Id;
  /** worldObject 또는 npc id */
  targetId: Id;
  kind: 'object' | 'npc';
  windows?: TimeWindow[];
  visibleWhen?: FlagCondition;
}

/** 관측 뷰어의 하루. 분 단위 [start, end]. */
export interface ObservationTimeline extends ContentBase {
  sceneId: Id;
  /** 뷰어 시작 시 완료 처리되는 관측 */
  observationId: Id;
  /** 관측 종료 시 완료 처리되는 관측 */
  returnObservationId?: Id;
  title: string;
  start: number;
  end: number;
  initial: number;
  /** 첫 진입 카메라 중심(타일). 첫 핫스팟이 화면 안에 있도록. */
  camera: { x: number; y: number };
  /** 메타데이터 패널(연도 '####' 등) */
  meta: { label: string; value: string }[];
  hotspots: Hotspot[];
  /** 화면 불안정(노이즈) 구간. 0~1 */
  glitches?: { from: number; to: number; intensity: number }[];
}

export type MessageThread = 'colleague' | 'device' | 'system' | 'mail';

export interface MessageChoice {
  id: Id;
  text: string;
  /** 분위기·후속 대사용 플래그만. 퍼즐 플래그 금지(검증기). */
  setsFlags?: string[];
}

export interface Message extends ContentBase {
  thread: MessageThread;
  /** 표시 이름 */
  from: string;
  text: string;
  /** 도착 조건. 없으면 시작부터. */
  when?: StateCondition;
  /** 같은 순간 도착 시 정렬 */
  order: number;
  /** 도착하는 순간 적용 */
  grants?: Grants;
  choices?: MessageChoice[];
}

export interface ArchiveExhibit extends ContentBase {
  title: string;
  slot: 'case' | 'shelf' | 'register' | 'timeline' | 'center';
  spriteKey: string;
  requires?: StateCondition;
  lines: string[];
  grants?: Grants;
  /** 이 전시물이 보여 주는 도감 항목 */
  collectionIds?: Id[];
}

/** 단말 메모(동기화됨). 손글씨 노트와 달리 정합성 보정의 대상이다. */
export interface TerminalMemo extends ContentBase {
  title: string;
  text: string;
  when?: StateCondition;
}

/** 정합성 보정(가상). 조건이 되면 조용히 레코드·메모를 고친다. verified 콘텐츠는 건드릴 수 없다. */
export interface CorrectionEvent extends ContentBase {
  trigger: StateCondition;
  recordPatches: { recordId: Id; key: string; value: string }[];
  memoPatches: { memoId: Id; text: string }[];
  grants?: Grants;
}

/** 튜토리얼 단계: 앱 첫 사용 코치마크 + 막힘 시 3단 힌트(UI 조작만, 퍼즐 정답 금지) */
export interface TutorialStep extends ContentBase {
  id: Id;
  app: AppId;
  /** UI 요소 키(하이라이트 대상). 계약: TERMINAL_DESIGN §Contracts */
  target: string;
  /** 코치마크: 한 문장 이하 */
  coach: string;
  showWhen: StateCondition;
  doneWhen: StateCondition;
  /** [넛지, 방향, 근접] */
  hints: [string, string, string];
  /** 이 실패가 쌓이면 힌트 단계가 오른다 */
  failOn?: ('unknown_search' | 'phrase_miss' | 'wrong_deduction' | 'empty_tap')[];
  /** 기본 40초 */
  idleSeconds?: number;
  order: number;
}

export interface HelpCard extends ContentBase {
  id: Id;
  app: AppId;
  title: string;
  lines: string[];
}

// ── 콘텐츠 번들 ────────────────────────────────────────────────
export interface ContentBundle {
  persons: HistoricalPerson[];
  artifacts: HistoricalArtifact[];
  sources: HistoricalSource[];
  events: HistoricalEvent[];
  places: Place[];
  evidence: Evidence[];
  deductions: Deduction[];
  observations: Observation[];
  worldObjects: Interactable[];
  npcs: NpcDef[];
  collection: CollectionEntry[];
  // ── 결록 단말(터미널) ──
  apps: AppDef[];
  searchEntries: SearchEntry[];
  records: DbRecord[];
  phrases: SourcePhrase[];
  timelines: ObservationTimeline[];
  messages: Message[];
  exhibits: ArchiveExhibit[];
  corrections: CorrectionEvent[];
  memos: TerminalMemo[];
  tutorial: TutorialStep[];
  help: HelpCard[];
}

export type ContentKey = keyof ContentBundle;
export type ContentModule = Partial<ContentBundle>;
export type ContentItem = ContentBundle[ContentKey][number];

/** 판정에 필요한 최소 문맥. owned: 보유 증거 id → 공개 단계. */
export interface JudgeContext {
  evidence: Readonly<Record<Id, Evidence>>;
  persons: Readonly<Record<Id, HistoricalPerson>>;
  owned: Readonly<Record<Id, number>>;
}
