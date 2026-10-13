// 결록 도메인 타입(v3 「대조」). 데이터(src/data) → 코어(src/core) → 스토어(src/store) 가 공유한다.
// 설계: docs/DESIGN_V3.md

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

/** 낯선 실록 용어의 한 줄 풀이(탭하면 보임). 사실만, 짧게. */
export interface Gloss {
  term: string;
  gloss: string;
}

// ── 사실(Fact): 단서가 입증하고, 인물·칸이 요구한다 ─────────────────
export type FactKind =
  | 'name'
  | 'courtesyName'
  | 'penName'
  | 'office'
  | 'clan'
  | 'origin'
  | 'relation'
  | 'possession'
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
  /** 검증된 사실. 누구 칸에서 단서 사실과 대조된다. */
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
  relatedIds?: Id[];
}

/** 사료(실록 기사, 문집 등). 웹 출처(SourceRef)와 구분된다. */
export interface HistoricalSource extends ContentBase {
  title: string;
  hanja?: string;
  compiled?: Year;
  author?: string;
  summary: string;
  /** 원문/번역 발췌. verified 일 때만 원문으로 표시. */
  excerpt?: string;
  glossary?: Gloss[];
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

// ── 연대 제약(연대 판정용) ─────────────────────────────────────────
export type EvidenceStrength = 'decisive' | 'supporting' | 'weak';

/** notBefore/notAfter 는 포함(inclusive) 경계. 최소 하나는 있어야 한다. */
export interface TimeConstraint {
  notBefore?: Year;
  notAfter?: Year;
  strength: EvidenceStrength;
  weakReason?: string;
  /** 카드 고유 피드백 한 줄. 정답·4자리 연도를 쓰지 않는다(테스트). */
  feedback?: string;
}

/**
 * 판정 엔진(chronology·deduction)이 읽는 증거 형태. v3 에서는 단서(Clue)를 이 형태로 바꿔 판정에 넘긴다(core/report.ts).
 */
export interface EvidenceLevel {
  label: string;
  text: string;
  proves?: Fact[];
  time?: TimeConstraint;
}
export type EvidenceCategory = 'object' | 'document' | 'person' | 'testimony' | 'place' | 'observation';
export interface Evidence extends ContentBase {
  category: EvidenceCategory;
  levels: [EvidenceLevel, ...EvidenceLevel[]];
}
export interface EvidenceView {
  id: Id;
  level: number;
  label: string;
  text: string;
  facts: Fact[];
  time?: TimeConstraint;
}

// ── 조건 ───────────────────────────────────────────────────────
export type FlagValue = boolean | number | string;

export interface FlagCondition {
  all?: string[];
  none?: string[];
}

/** 체크리스트 도장 */
export type Stamp = 'match' | 'mismatch';

export interface PlayStats {
  searches: number;
  unknownSearches: number;
  scrubs: number;
  taps: number;
  captures: number;
  stamps: number;
  stampMisses: number;
  reportSubmits: number;
  reportFails: number;
}

/**
 * 상태 조건. 모든 항목은 AND(any 는 OR).
 * heard: 들은 대사 · seen: (확대해서) 본 핫스팟 · clues: 지금 가진 프레임이 증명하는 단서 ·
 * stamped: 도장 찍은 체크리스트 항목 · closed: 종결된 배정 · opened: 열어 본 종결 보고서 ·
 * hintsDone: 끝까지 받은 힌트 사다리 · filed: 도장 찍은 보고서
 */
export interface StateCondition extends FlagCondition {
  searched?: Id[];
  records?: Id[];
  read?: Id[];
  appsOpened?: AppId[];
  heard?: Id[];
  seen?: Id[];
  clues?: Id[];
  stamped?: Id[];
  closed?: Id[];
  opened?: Id[];
  corrections?: Id[];
  shifts?: Id[];
  filed?: Id[];
  hintsDone?: Id[];
  minStats?: Partial<PlayStats>;
  any?: StateCondition[];
}

export interface Grants {
  flags?: string[];
  /** 검색어 칩(보고 들은 그대로) */
  terms?: string[];
}

// ── 관측·월드 ─────────────────────────────────────────────────
/** 관측 타임라인의 시각 구간(분). [from, to) */
export interface TimeWindow {
  from: number;
  to: number;
}

export type InteractableKind = 'object' | 'npc' | 'door' | 'observe';

export interface Interactable extends ContentBase {
  sceneId: Id;
  /** 타일 좌표 */
  x: number;
  y: number;
  spriteKey: string;
  kind: InteractableKind;
  /** 표시 이름(식별 전) */
  label: string;
  examine: string[];
  grants?: Grants;
  /** 이 플래그가 truthy 일 때만 보인다 */
  requires?: string;
  targetSceneId?: Id;
  windows?: TimeWindow[];
  hiddenText?: string;
}

export interface Waypoint {
  /** 하루 분(0~1439). 해당 시각부터 이 위치로 이동/체류. */
  time: number;
  x: number;
  y: number;
  sceneId?: Id;
  action?: string;
}

/** 엿듣기 규칙: 기준 배율의 minZoom 배 이상 확대 + 화면 중심에서 radiusTiles 타일 이내. */
export interface HearSpec {
  minZoom?: number;
  radiusTiles?: number;
}
export const HEAR_DEFAULT_MIN_ZOOM = 1.6;
export const HEAR_DEFAULT_RADIUS = 3;

export interface DialogueLine {
  /** 콘텐츠 전체에서 유일(hearLine·프레임·단서가 이 id 를 쓴다) */
  id: Id;
  speaker?: string;
  text: string;
  provenance: Provenance;
  sources?: SourceRef[];
  when?: FlagCondition;
  /** 이 시각 구간에만 들린다/보인다(없으면 항상) */
  at?: TimeWindow[];
  /** 엿듣기 규칙(없으면 기본값) */
  hear?: HearSpec;
  /** 들으면 생기는 것(검색어 칩·플래그) */
  grants?: Grants;
  glossary?: Gloss[];
}

export interface NpcDef extends ContentBase {
  sceneId: Id;
  spriteKey: string;
  /** 표시 이름(예: '붉은 관복') — 실존 인물 이름은 쓰지 않는다 */
  label: string;
  personId?: Id;
  schedule: Waypoint[];
  dialogue: DialogueLine[];
}

export interface Hotspot {
  id: Id;
  targetId: Id;
  kind: 'object' | 'npc';
  windows?: TimeWindow[];
  visibleWhen?: FlagCondition;
}

export interface ObservationTimeline extends ContentBase {
  sceneId: Id;
  title: string;
  start: number;
  end: number;
  initial: number;
  camera: { x: number; y: number };
  /** 메타데이터 패널(연도 '####' 등) */
  meta: { label: string; value: string }[];
  hotspots: Hotspot[];
  /** 화면 불안정(노이즈) 구간. 0~1 */
  glitches?: { from: number; to: number; intensity: number }[];
}

// ── 단서(프레임·기록에서 계산) ────────────────────────────────────
/** 프레임이 이 단서를 증명하는 조건. 모든 항목 AND. */
export interface FrameMatch {
  heard?: Id[];
  heardAny?: Id[];
  visible?: Id[];
  visibleAny?: Id[];
  minute?: TimeWindow;
}

/**
 * 단서: 프레임(frame) 또는 DB 기록(record) 또는 한 칸 안의 조합(combo)에서 생긴다.
 * proves(사실)·time(연대 제약)이 보고서 판정의 재료다. 정답은 데이터에만 있다.
 */
export interface Clue extends ContentBase {
  label: string;
  text: string;
  proves?: Fact[];
  time?: TimeConstraint;
  frame?: FrameMatch;
  record?: Id;
  /** all: 같은 칸 첨부의 단서들, report: 보고서 어디든 있어야 하는 단서 */
  combo?: { all: Id[]; report?: Id[]; missingReportText?: string };
  /** 기록에 없는 목격(불일치 근거) */
  unrecorded?: boolean;
  /** 핵심 단서: 보정 트리거·훼손 보호 */
  key?: boolean;
}

// ── 업무: 배정·체크리스트 ─────────────────────────────────────────
export type Verb = 'look' | 'listen' | 'capture' | 'scrub' | 'stamp' | 'search' | 'report';

export interface ChecklistItem {
  id: Id;
  no: number;
  title: string;
  /** 참조 표시(예: '실록청') — 이름·연도 금지 */
  refLabel: string;
  prompt: string;
  teaches: Verb[];
  /** 도장이 눌리는 조건 */
  ready: StateCondition;
  notReadyText: string;
  expected?: Stamp;
  wrongText?: string;
  /** 마지막 판정 항목 */
  final?: {
    recommend: Stamp;
    recommendText: string;
    recommendButton: string;
    /** [불일치]에 필요한 근거(지금 프레임 단서 중 하나) */
    mismatchNeedsAnyClue: Id[];
    mismatchNeedsText: string;
  };
}

export interface Assignment extends ContentBase {
  code: string;
  title: string;
  officer: string;
  priority: string;
  header: { key: string; label: string; value: string }[];
  /** 참조 수렴 기록(종결 뒤 탭하면 DB 기록) */
  refs: { title: string; recordId?: Id; searchEntryId?: Id }[];
  timelineId: Id;
  checklist: ChecklistItem[];
  /** 제출 직후 자동 분류 문구 */
  autoClassification: string;
  reportId: Id;
}

/** 종결된 보고서(콘텐츠: 옛 보고서·예고 보고서). 이번 건의 종결은 상태에서 만든다. */
export interface ClosedReport extends ContentBase {
  code: string;
  when: string;
  officer: string;
  verdict: string;
  classification: string;
  note: string;
  fields?: { label: string; value: string }[];
  showWhen?: StateCondition;
  order: number;
}

// ── 보고서 ───────────────────────────────────────────────────────
export type BlankKey = 'when' | 'who' | 'what' | 'result';
export const BLANK_KEYS: readonly BlankKey[] = ['when', 'who', 'what', 'result'];

export interface FactBlankSpec {
  label: string;
  prompt: string;
  requires: Fact[];
  /** 요구 사실이 빠졌을 때(같은 순서) */
  missingText: string[];
  /** 이 사실이 있으면 어긋남 */
  wrong?: { fact: Fact; message: string }[];
  /** 이 사실만 있으면 근거 부족(가까움) */
  near?: { fact: Fact; message: string }[];
  emptyText: string;
  tips?: BlankTip[];
}

/** 칸 고유 피드백: 칸의 단서 집합이 has 를 모두 갖고 lacks 를 하나도 갖지 않으면(확인 전) 이 문구를 덧붙인다. 정답 금지. */
export interface BlankTip {
  has?: Id[];
  lacks?: Id[];
  message: string;
}

export interface ReportSpec extends ContentBase {
  assignmentId: Id;
  title: string;
  maxAttachments: number;
  unlockWhen: StateCondition;
  when: {
    label: string;
    prompt: string;
    target: { from: Year; to: Year };
    maxPartialWidth: number;
    /** chronology 피드백 코드 → 칸 고유 문구(정답·연도 금지) */
    messages: Partial<Record<FeedbackCode, string>>;
    emptyText: string;
    noYearText: string;
    tips?: BlankTip[];
  };
  who: {
    label: string;
    prompt: string;
    candidates: Id[];
    answer: Id;
    requiredFacts: Fact[];
    noPersonText: string;
    twoPersonsText: string;
    tips?: BlankTip[];
  };
  what: FactBlankSpec;
  result: FactBlankSpec;
  /** 도장 → 이 현실 이동 */
  restores: Id;
}

// ── 판정 결과 ─────────────────────────────────────────────────────
export type Verdict = 'confirmed' | 'partial' | 'undetermined' | 'wrong';

export type FeedbackCode =
  | 'invalid_input'
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
  | 'unknown_choice'
  | 'missing_report_clue'
  | 'empty';

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
  implied?: { from?: Year; to?: Year };
}

/** 판정 엔진 내부 문제 형태(보고서 칸에서 만든다) */
export interface YearDeduction extends ContentBase {
  kind: 'year';
  target: { from: Year; to: Year };
  context?: { from?: Year; to?: Year };
  maxPartialWidth: number;
}
export interface PersonDeduction extends ContentBase {
  kind: 'person';
  candidates: Id[];
  answer: Id;
  requiredFacts: Fact[];
}

/** 판정에 필요한 최소 문맥. owned: 보유 증거 id → 공개 단계. */
export interface JudgeContext {
  evidence: Readonly<Record<Id, Evidence>>;
  persons: Readonly<Record<Id, HistoricalPerson>>;
  owned: Readonly<Record<Id, number>>;
}

// ── 결록 단말 ───────────────────────────────────────────────────
/** 앱 4개: 업무 · 관측 · DB 검색 · 메신저 */
export type AppId = 'work' | 'viewer' | 'db' | 'messenger';

export interface AppDef extends ContentBase {
  app: AppId;
  title: string;
  iconKey: string;
  order: number;
  unlockWhen?: StateCondition;
}

export type SearchRefKind = 'person' | 'artifact' | 'source' | 'event' | 'place' | 'record';
export interface SearchResultRef {
  kind: SearchRefKind;
  id: Id;
}

export interface SearchEntry extends ContentBase {
  terms: string[];
  requires?: StateCondition;
  results: SearchResultRef[];
  grants?: Grants;
  optional?: boolean;
  /** 말소된 기사: 색인어는 있으나 결과가 없다 → '해당 기사 없음'. 복원이 결과를 채운다. */
  noArticle?: boolean;
  noArticleText?: string;
}

export interface DbField {
  key: string;
  label: string;
  value: string;
}

/** DB 레코드(현대 DB). 말소된 세계의 상태는 altered + fictional. */
export interface DbRecord extends ContentBase {
  title: string;
  fields: DbField[];
  note?: string;
  altered?: boolean;
  /** 인물 기록이면 그 인물(누구 칸의 후보) */
  personId?: Id;
  glossary?: Gloss[];
}

/** 메신저 스레드: 오 실장(상사) · 한 선임(동료) · 시스템 · 나 */
export type MessageThread = 'chief' | 'senior' | 'system' | 'me';

export interface MessageChoice {
  id: Id;
  text: string;
  setsFlags?: string[];
}

export interface Message extends ContentBase {
  thread: MessageThread;
  from: string;
  text: string;
  /** 도착 조건. 없으면 시작부터. hint 메시지는 힌트 사다리가 보낸다. */
  when?: StateCondition;
  order: number;
  grants?: Grants;
  choices?: MessageChoice[];
  /** 단말 시계 표시(연출) */
  clock?: string;
  /** 힌트 사다리 전용(when 으로 오지 않는다) */
  hint?: boolean;
}

export type FailKind = 'stamp_miss' | 'report_fail' | 'unknown_search' | 'empty_tap' | 'capture_full';

/** 힌트 사다리(메신저만). 방치·실패로 한 단씩, 최대 steps 개. */
export interface HintLadder extends ContentBase {
  activeWhen: StateCondition;
  doneWhen: StateCondition;
  steps: { idle: number; fails?: number; messageId: Id }[];
  failOn?: FailKind[];
  order: number;
}

/** 새벽 정합성 보정(가상). */
export interface CorrectionEvent extends ContentBase {
  trigger: StateCondition;
  /** 훼손 구간. clue 가 있으면 그 단서를 프레임으로 가진 경우에만(실패 없음) */
  degrade: { from: number; to: number; clue?: Id }[];
  /** 이번 배정 종결의 판정 표시를 바꾸고 소견을 지운다 */
  closure?: { assignmentId: Id; verdictShown: Stamp; clearNote: boolean };
  clock?: string;
  grants?: Grants;
}

// ── 현실 이동(복원) ──────────────────────────────────────────────
export interface MessageRewrite {
  messageId: Id;
  newText: string;
}
export interface RecordRewrite {
  recordId: Id;
  title?: string;
  fields?: DbField[];
  note?: string;
  provenance?: Provenance;
  sources?: SourceRef[];
}
export interface SearchRewrite {
  entryId: Id;
  results: SearchResultRef[];
}
export interface RestoredItem {
  kind: 'source' | 'event' | 'record';
  id: Id;
}

export interface RealityShift extends ContentBase {
  title: string;
  when: StateCondition;
  order: number;
  messageRewrites: MessageRewrite[];
  recordRewrites: RecordRewrite[];
  searchRewrites?: SearchRewrite[];
  /** 배정 헤더 다시 쓰기(일시 #### → 복원된 날짜) */
  assignmentRewrites?: { assignmentId: Id; header: { key: string; value: string }[] }[];
  /** 종결 보고서 다시 쓰기 */
  closedRewrites?: { reportId: Id; verdict?: string; classification?: string; note?: string }[];
  /** 이번 배정 종결의 분류 다시 쓰기 */
  closureRewrite?: { assignmentId: Id; classification: string; verdictShown?: Stamp };
  restores: RestoredItem[];
  unlocks?: Grants;
}

export type RewriteTone = 'erase' | 'restore';

/** 합의된 현실이 다시 쓰인 기록(저장됨). 단말에는 표식이 없고, 플레이어 쪽 화면만 읽는다. */
export interface RewriteEntry {
  seq: number;
  sourceId: Id;
  tone: RewriteTone;
  kind: 'message' | 'record' | 'search' | 'assignment' | 'closed' | 'closure';
  targetId: Id;
  before: string;
  after: string;
}

// ── 콘텐츠 번들 ────────────────────────────────────────────────
export interface ContentBundle {
  persons: HistoricalPerson[];
  artifacts: HistoricalArtifact[];
  sources: HistoricalSource[];
  events: HistoricalEvent[];
  places: Place[];
  worldObjects: Interactable[];
  npcs: NpcDef[];
  timelines: ObservationTimeline[];
  clues: Clue[];
  apps: AppDef[];
  assignments: Assignment[];
  closedReports: ClosedReport[];
  reports: ReportSpec[];
  searchEntries: SearchEntry[];
  records: DbRecord[];
  messages: Message[];
  hints: HintLadder[];
  corrections: CorrectionEvent[];
  shifts: RealityShift[];
}

export type ContentKey = keyof ContentBundle;
export type ContentModule = Partial<ContentBundle>;
export type ContentItem = ContentBundle[ContentKey][number];
