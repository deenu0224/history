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
  /** door: 이동할 씬 */
  targetSceneId?: Id;
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
