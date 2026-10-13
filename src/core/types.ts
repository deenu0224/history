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
  /**
   * 카드 고유의 판정 피드백 한 줄(일반 문구 '하한만 제한합니다' 대신). 정답·정답 연도를 말하지 않는다(테스트).
   * 4자리 연도를 쓰지 않는다 — 경계 수치는 UI 가 time 에서 직접 보여 준다.
   */
  feedback?: string;
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
  /**
   * 현실 이동(RealityShift) 전의 상태. 손 노트에만 남는다: UI 는 before 를 취소선으로, text 를 새 글씨로 보여 준다.
   * 단말(메신저·DB)에는 이전 상태를 보여 주는 표식이 없다.
   */
  before?: string;
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

/** 인과 고리의 마디(플레이어가 보드에서 잇는 진술 카드). */
export interface CausalNode {
  id: Id;
  text: string;
}

/** 정답 고리의 한 연결. requires 의 사실이 모두 인용되어야 '뒷받침'된다. */
export interface CausalLinkRule {
  from: Id;
  to: Id;
  requires: Fact[];
}

/** 알려진 틀린 연결과 그 고유 피드백(정답을 말하지 않는다). */
export interface CausalWrongLink {
  from: Id;
  to: Id;
  message: string;
}

/**
 * 인과 추리: 마디를 화살표로 이어 '왜'를 설명한다. 각 화살표는 증거로 뒷받침되어야 한다.
 * 정답 = chain 의 연속한 쌍 전부(그리고 그것만). 판정 규칙은 core/deduction.ts judgeCausal.
 */
export interface CausalDeduction extends DeductionBase {
  kind: 'causal';
  nodes: CausalNode[];
  /** 정답 고리(원인 → 결과 순) */
  chain: Id[];
  links: CausalLinkRule[];
  wrongLinks?: CausalWrongLink[];
}

export type Deduction = YearDeduction | PersonDeduction | EventDeduction | CausalDeduction;

export interface CausalSubmissionLink {
  from: Id;
  to: Id;
  evidenceIds: Id[];
}

export type DeductionSubmission =
  | { kind: 'year'; deductionId: Id; from: Year; to: Year; evidenceIds: Id[] }
  | { kind: 'person'; deductionId: Id; candidateId: Id; evidenceIds: Id[] }
  | { kind: 'event'; deductionId: Id; statementId: Id; evidenceIds: Id[] }
  | { kind: 'causal'; deductionId: Id; links: CausalSubmissionLink[] };

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
  | 'unknown_choice'
  | 'link_wrong'
  | 'link_reversed'
  | 'link_unsupported'
  | 'chain_incomplete';

export interface Feedback {
  code: FeedbackCode;
  message: string;
  evidenceId?: Id;
  fact?: Fact;
  /** 인과 추리: 이 피드백이 가리키는 연결 */
  link?: { from: Id; to: Id };
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
  /** 이 현실 이동(RealityShift id)이 적용되기 전에는 단계와 상관없이 보이지 않는다(말소된 사실). */
  restoredBy?: Id;
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
/**
 * 앱 5개. 사료 뷰어는 검색 앱 안의 '원문 보기'(구절 탭)로, 개인 기록관은 손 노트의 '기록관' 탭으로 합쳐졌다.
 * 설정은 시스템 패널(앱 아님).
 */
export type AppId = 'messenger' | 'search' | 'viewer' | 'board' | 'notebook';

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
  /** 보드에서 카드 겹치기(연결) 성공/실패 */
  links: number;
  linkMisses: number;
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
  /** 적용된 현실 이동(RealityShift) */
  shifts?: Id[];
  /** 만든 카드 연결(EvidenceLink) */
  links?: Id[];
  /** 손 노트에 기록한 사실(RecordAct) */
  recorded?: Id[];
  minStats?: Partial<PlayStats>;
  /** 이 중 하나 이상(OR). 막힘 방지용 대체 경로에 쓴다. */
  any?: StateCondition[];
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
  /**
   * 말소된 기사: 색인어는 있으나 결과가 없다 → '해당 기사 없음'. results 는 비워 두고, 복원하는 RealityShift 의
   * searchRewrites 가 결과를 채운다(그 뒤로는 평범한 결과 — 복원 표식 없음).
   */
  noArticle?: boolean;
  /** noArticle 일 때의 문구(기본 '해당 기사 없음.'). 예: '그런 단어 없음.' */
  noArticleText?: string;
}

export interface DbField {
  key: string;
  label: string;
  value: string;
}

/** DB 메타데이터 레코드(가상). 정합성 보정·현실 이동의 대상이 될 수 있다. */
export interface DbRecord extends ContentBase {
  title: string;
  fields: DbField[];
  note?: string;
  /**
   * 변조된 상태(말소된 세계의 DB). 반드시 fictional. 원인 없는 결과(사인 없는 졸년 등)만 담는다.
   * RealityShift.recordRewrites 로만 실제 역사(verified)로 바뀐다. 엔딩 뒤 기록 열람 모드에서 원래 상태는 '변조'로 표시.
   */
  altered?: boolean;
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

/** archivist = 두 번째 동료(아키비스트, avatar_colleague_b). 기억이 한 선임과 다르게 흔들린다. */
export type MessageThread = 'colleague' | 'device' | 'system' | 'mail' | 'archivist';

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
  /** 복원 전시물: 이 현실 이동으로 되살아난 기록. 기록관(손 노트 탭)에만 '복원' 도장이 찍힌다. */
  restoredBy?: Id;
}

/** 단말 메모(동기화됨). 손글씨 노트와 달리 정합성 보정의 대상이다. */
export interface TerminalMemo extends ContentBase {
  title: string;
  text: string;
  when?: StateCondition;
}

/** 정합성 보정(가상). 조건이 되면 조용히 레코드·메모를 고친다(지운다). verified 콘텐츠는 건드릴 수 없다. */
export interface CorrectionEvent extends ContentBase {
  trigger: StateCondition;
  recordPatches: { recordId: Id; key: string; value: string }[];
  /** text 로 바꾸거나, remove 면 메모가 사라진다(흔적 없음). */
  memoPatches: { memoId: Id; text?: string; remove?: boolean }[];
  grants?: Grants;
}

// ── 현실 이동(복원) ──────────────────────────────────────────────
export interface MessageRewrite {
  messageId: Id;
  newText: string;
}

/** 레코드 다시 쓰기: 주어진 것만 바꾼다. fields 는 key 기준으로 바꾸거나 덧붙인다. */
export interface RecordRewrite {
  recordId: Id;
  title?: string;
  fields?: DbField[];
  note?: string;
  /** 복원 뒤 레코드가 실제 역사가 되면 'verified' + sources(url) 필수(검증기) */
  provenance?: Provenance;
  sources?: SourceRef[];
}

export interface SearchRewrite {
  entryId: Id;
  results: SearchResultRef[];
}

/** 복원된 기사(개인 기록관의 '복원' 도장 목록). source·event 는 verified 여야 한다. */
export interface RestoredItem {
  kind: 'source' | 'event' | 'record';
  id: Id;
}

/**
 * 현실 이동(가상 설정). 사실을 밝혀내면 세계 전체가 '원래부터' 그것을 알고 있었던 것이 된다.
 * 메신저의 지난 메시지가 새 현실로 다시 쓰이고, DB 레코드에 원인이 생기며, '해당 기사 없음'이 평범한 결과가 된다.
 * 단말에는 이전 상태를 보여 주는 표식이 없다. 이전/이후는 손 노트(notebookDiff)와 개인 기록관(restores)에만 남는다.
 */
export interface RealityShift extends ContentBase {
  /** 기록관 '복원' 도장 옆 이름 */
  title: string;
  when: StateCondition;
  /** 같은 순간 여러 개가 맞으면 order 순으로 적용 */
  order: number;
  messageRewrites: MessageRewrite[];
  recordRewrites: RecordRewrite[];
  searchRewrites?: SearchRewrite[];
  restores: RestoredItem[];
  /** 적용되는 순간 주는 것(복원 플래그, 서재 사료, 도감 단계 등) */
  unlocks?: Grants;
  /** 손 노트에 남는 이전/이후(취소선 + 새 글씨) */
  notebookDiff: { id: Id; before: string; after: string; provenance?: Provenance }[];
}

/** 다시 쓰기의 결: 말소(차갑게, 무음, 명도 한 칸) / 복원(따뜻한 먹 번짐). UI 연출 구분용. */
export type RewriteTone = 'erase' | 'restore';

/**
 * '기록하기'(사관의 직필): 추리를 확정한 뒤 플레이어가 손 노트에 핵심 문장을 직접 적으면(UI: 따라 쓰기/도장)
 * 그 사실이 복원된다. store.recordFact(actId) → 상태 recorded 에 들어가고 → when 에 recorded 를 가진 RealityShift 가 적용.
 */
export interface RecordAct extends ContentBase {
  title: string;
  /** 기록할 수 있는 조건(추리 확정 등) */
  requires: StateCondition;
  /** 따라 쓸 문장(검증된 실록·사전 문장 그대로). provenance verified + sources 필수. */
  sentence: string;
  /** 이 기록이 적용하는 현실 이동 */
  restores: Id;
  order: number;
}

/** 증거 보드의 카드 겹치기: inputs 를 정확히 그 조합으로 겹치면 result 카드가 생긴다(추론 카드). */
export interface EvidenceLink extends ContentBase {
  /** 정확히 이 카드들(순서 무관). 2장 이상. */
  inputs: Id[];
  result: { id: Id; level?: number };
  /** 겹치기가 성립하려면 더 필요한 상태 */
  requires?: StateCondition;
  /** requires 미충족 시 문구(정답 금지) */
  missText?: string;
  /** 성공 시 한 줄 */
  text: string;
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
  failOn?: ('unknown_search' | 'phrase_miss' | 'wrong_deduction' | 'empty_tap' | 'link_miss')[];
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
  shifts: RealityShift[];
  links: EvidenceLink[];
  acts: RecordAct[];
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
