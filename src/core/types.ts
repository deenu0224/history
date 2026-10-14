/**
 * 결록 v5 「눈을 빌려 다시 쓰기」 도메인 타입. 데이터(src/data/v5) → 코어(src/core) → 스토어(src/store) 가 공유한다.
 * 설계: docs/DESIGN_V5.md §2(시스템)·§3(데이터 계약)·§4/§13(에피소드 1). 메신저: docs/DIALOGUE_GUIDE.md.
 *
 * 원칙
 *  - 정답은 데이터에만 있다. UI 는 판정 결과 코드만 받는다(core/tag.ts, core/contradiction.ts, core/rewrite.ts).
 *  - 모든 콘텐츠에 provenance. verified 는 출처(url) 필수(core/validate.ts).
 *  - 컷의 그림(렌더 명세)은 src/data/cuts/** (다른 모듈 소유). 여기의 CutRef 는 판정에 필요한 사실만 담고 id 로 맞물린다.
 */

export type Id = string;
export type Provenance = 'verified' | 'reconstructed' | 'fictional';
/** 'HH:MM'(24시간). 컷의 시각은 모두 재구성이다. */
export type Hhmm = string;

export interface SourceRef {
  /** 기사 id(kja_…)나 백과사전 항목 id(E00…) */
  id?: Id;
  title: string;
  url: string;
  note?: string;
}

/** 낯선 실록 용어의 한 줄 풀이(탭하면 보임). */
export interface Gloss {
  term: string;
  gloss: string;
}

// ── 사실 키 ─────────────────────────────────────────────────────
/** 판정에 쓰는 사실 키. 예 'ijo_panseo_1494', 'surname_yun', 'sillokcheong_staff'. */
export type FactKey = string;

/** 원장(검증기 전용): HISTORICAL_SOURCES 에서 그 사람에게 확인된 verified 사실 키 전부. 화면 카드보다 넓다. */
export interface LedgerEntry {
  key: FactKey;
  source: SourceRef;
}

// ── 방(그날의 방 도면) ───────────────────────────────────────────
export interface Pos {
  id: Id;
  x: number;
  y: number;
  /** 도면 라벨(현대 언어, 이름 없음) */
  label?: string;
}
export interface Seat extends Pos {
  /** 0 = 동, 90 = 남(화면 아래) */
  facingDeg: number;
}
/** [x0, y0, x1, y1] 축 정렬 사각형 */
export type Rect = [number, number, number, number];
export type Segment = [number, number, number, number];
export type Volume = 'whisper' | 'talk' | 'read';

export interface RoomPlan {
  id: Id;
  provenance: 'reconstructed';
  w: number;
  h: number;
  walls: Segment[];
  doors: Pos[];
  /** 병풍(윗자리 표시) */
  screen: Rect;
  furniture: { id: Id; label: string; rect: Rect; occludes: boolean }[];
  seats: Seat[];
  /** 봉함 자리·낭독 자리·서리의 위치 등 */
  points: Pos[];
  hearingRadius: Record<Volume, number>;
  garbleFactor: number;
  sight: { halfAngleDeg: number; detailRange: number; actionRange: number };
}

// ── 사람 ─────────────────────────────────────────────────────────
export interface Fact {
  id: Id;
  text: string;
  keys: FactKey[];
  provenance: 'verified';
  source: SourceRef;
  /** 사화의 달 기사 등: 복원 뒤에만 카드에 보인다 */
  afterRestore?: true;
}

/** 소실 세계의 '원인 없는 결과'(변조, fictional). 복원 때 restoredText(verified) 로 다시 쓰인다. */
export interface AlteredField {
  id: Id;
  label: string;
  display: string;
  provenance: 'fictional';
  restoredText: string;
  restoredSource: SourceRef;
  /** 06:00 재계산에 이 줄이 지워진다(눈이 닫힘) */
  erasedByClosure?: Id;
}

export interface PersonCard {
  id: Id;
  name: string;
  hanja: string;
  /** '1435 ~ 1503' 처럼 검증된 생몰(없으면 비움) */
  lifespan?: string;
  provenance: 'verified';
  facts: Fact[];
  altered?: AlteredField[];
  /** '이 방의 카드'(실록청 기록 있음) — 검증기: sillokcheong_staff 키(함의 포함)와 일치 */
  roomAnchored: boolean;
  /** 이 사람의 눈. never = 열릴 기록이 없음 */
  eye: { eyeId?: Id; never?: { reason: string; restoredLines?: { text: string; source: SourceRef }[] } };
  /** 찾기 색인어(이름·한자 등) */
  searchTerms: string[];
  /** 한 선임이 처음부터 올려 둔 카드 */
  starter?: true;
  /** 복원 뒤에만 검색되는 카드 */
  afterRestore?: true;
  authorNote?: string;
}

export interface Figure {
  id: Id;
  /** 숨은 진실(이름 없는 사람은 없음) */
  truePersonId?: Id;
  anonymous?: true;
  /** 등장 자체의 근거 */
  provenance: Provenance;
  /** 이름 붙이기 전 화면 라벨(옷 색 등). 실존 인물 이름 금지 */
  label: string;
  /** 같은 사람을 알아보는 데만 쓰는 겉모습(정체 증거로 쓰지 않음) */
  visibleTraits: string[];
  /** 「?」로 남다가 복원 때 짝 이름이 내려앉는다 */
  revealOnRestore?: { personIds: Id[]; pairLabel: string; source: SourceRef };
}

/** 실록이 적은 화자 단위(검증 대사는 이 단위로만 말한다) */
export interface SpeakerGroup {
  id: Id;
  label: string;
  restoredLabel: string;
  /** 사람 id(카드 id) */
  members: Id[];
  source: SourceRef;
}

// ── 들은 말·본 것(근거) ──────────────────────────────────────────
export type SlotKind = 'who' | 'whose' | 'scope' | 'count' | 'speaker';
export type Refers = { figureId: Id } | { posId: Id; time: Hhmm };

export interface Line {
  id: Id;
  text: string;
  provenance: Provenance;
  sources?: SourceRef[];
  speaker: { figureId: Id } | { groupId: Id; figureIds: Id[] };
  /** 소리가 나는 자리(무리면 여럿) */
  origin: Id[];
  volume: Volume;
  /** 이 말이 가리키는 사람/자리(이름 붙이기 근거) */
  refers?: Refers;
  /** 이 말이 담은 사실(이름 붙이기 근거) */
  keys?: FactKey[];
  /** 밑줄 낱말: 찾기어 */
  terms?: string[];
  /** 첫 등장 풀이(인용 글자는 바꾸지 않는다) */
  glosses?: Gloss[];
  /** '…하셨답디다' 같은 전해 들은 말 */
  hearsay?: true;
}

export interface Detail {
  id: Id;
  label: string;
  provenance: Provenance;
  sources?: SourceRef[];
  targetPosId: Id;
  /** small: 셀 수 있는 거리(detailRange)·가림 적용 / action: 사람·몸짓(actionRange) */
  size: 'small' | 'action';
  /** 가림 너머로 일부만 본 것(검증기: 방 계산과 일치) */
  occludedView?: true;
  terms?: string[];
}

export type EvidenceKind = 'line' | 'detail' | 'fact';

// ── 컷과 눈 ─────────────────────────────────────────────────────
export type Pose =
  | 'sit'
  | 'read_paper'
  | 'hold_page'
  | 'remonstrate'
  | 'propose'
  | 'stand_read'
  | 'stand'
  | 'reach'
  | 'whisper'
  | 'carry_books'
  | 'cut_slips'
  | 'leave_bundle'
  | 'sit_silent';

export interface CutFigure {
  figureId: Id;
  /** 그 순간의 자리(도면 seat 또는 point id) */
  seatId: Id;
  pose: Pose;
  visibleTraits: string[];
}

export interface CutHeard {
  lineId: Id;
  /** 방 계산과 같아야 한다(검증기 ②) */
  clarity: 'clear' | 'garbled';
  /** 흐린 말풍선의 글자(garbled 일 때) */
  garbledText?: string;
}

/** 컷 = 한 사람의 기억 속 고정 한 장(판정용 사실). 그림 명세는 src/data/cuts/<id> */
export interface CutRef {
  id: Id;
  eyeId: Id;
  /** 컷의 순서(1부터) */
  n: number;
  time: Hhmm;
  /** 이 순간 이 사람이 보던 쪽 */
  viewpoint: { dirDeg: number };
  figures: CutFigure[];
  heard: CutHeard[];
  details: Id[];
  /** 화면 읽기용 대체 텍스트(이름·연도·장소 없음) */
  alt: string;
  provenance: 'reconstructed';
}

export type EyeOpenWhen =
  | { kind: 'given'; ownerHidden: true }
  | { kind: 'tag'; figureId: Id }
  | { kind: 'never'; reason: string };

export interface Eye {
  id: Id;
  /** 눈의 주인(카드 id) */
  personId: Id;
  /** 눈의 주인이 다른 기억에 나올 때의 figure id(없으면 화면에 안 나옴) */
  figureId?: Id;
  /** 닻: 방의 기록 + 그날의 기록(verified id) / 소실 세계 표시(fictional) */
  anchor: { room: SourceRef[]; day: { source: SourceRef; inWorld: string } } | null;
  seatId?: Id;
  /** 앞쪽 덮개(소매) — 렌더러 힌트 */
  foreground?: string;
  cuts: Id[];
  openWhen: EyeOpenWhen;
  /** 이 눈을 닫는 사건 */
  closeAt?: Id;
  order: number;
}

export interface EyeClosure {
  id: Id;
  eyeId: Id;
  trigger: {
    eyeOpen: Id;
    /** 아래 중 하나 */
    anyOf: ({ cutViewed: Id } | { secondsAfterEyeOpen: number })[];
  };
  effect: { erase: { cardId: Id; alteredId: Id }; clock: Hhmm };
  systemLine: string;
}

// ── 이름 붙이기 ──────────────────────────────────────────────────
export type TagVerdict = 'ok' | 'not_pointing' | 'contradicts' | 'not_unique' | 'no_room_record';

export interface TagRule {
  id: Id;
  figureId: Id;
  personId: Id;
  /** 검증기가 사실 키로 다시 계산해 확인한다 */
  acceptedEvidence: Id[];
  uniquenessNote: string;
  /** 미끼 카드 → 실패 때 한 선임 반응(이벤트 id) */
  decoys: { personId: Id; event: Id }[];
}

// ── 모순 ────────────────────────────────────────────────────────
export interface Claim {
  id: Id;
  slot: SlotKind;
  /** 칸에 넣는 값(판정용) */
  value: string;
  /** 칩 표시 */
  label: string;
  /** 이 값을 확인해 준 근거(하나라도 로그에 있으면 확인한 값) */
  from: Id[];
  hearsay?: true;
}

export interface Contradiction {
  id: Id;
  slot: SlotKind;
  claims: [Id, Id];
  resolvedBy:
    | { kind: 'hearing'; lineId: Id; time: Hhmm; sourcePosId: Id }
    | { kind: 'sight'; targetPosId: Id; time: Hhmm; occluderId: Id };
  /** claims: 두 주장 모두 확인했을 때 / slot_open: 그 위에 다시 쓰기에서 그 칸을 열었을 때 */
  revealWhen: 'claims' | 'slot_open';
  /** 진 쪽의 새 이름 */
  loserLabel: string;
  loserNote?: string;
  /** 틀린 쪽을 골랐을 때 */
  retryText: string;
  buttons: [string, string];
}

// ── 기록 다시 쓰기 ───────────────────────────────────────────────
export interface RecordSegment {
  text: string;
  /** 편집 표시(실록 문장이 아님, 「( )」) */
  editorial?: true;
  slot?: { kind: SlotKind; accepts: string; display: string };
}

export interface RecordSentence {
  id: Id;
  /** 'L1'… / 'S1'… */
  label: string;
  source: SourceRef;
  segments: RecordSegment[];
  provenance: 'verified';
  optional?: true;
  /** 실록 전문 안의 순서 */
  order: number;
  /** 줄 머리 시각(재구성) */
  time: Hhmm;
}

export interface RecordPiece {
  id: Id;
  label: string;
  /** 하나라도 로그에 있으면 쓸 수 있다 */
  from: Id[];
  sentenceId?: Id;
  witnessOnly?: true;
  provenance: Provenance;
  time: Hhmm;
  /** 모순에서 진 뒤의 라벨(예: 뒤섞인 전해 들은 말) */
  contestedBy?: Id;
}

export interface RestoredPart {
  sentenceId?: Id;
  text: string;
  /** 머리(예: 실록청 당상 … 아뢰기를) */
  header?: true;
  folded?: { reason: 'mistranslation'; original: string; note: string };
}

export interface RestoredArticle {
  id: Id;
  source: SourceRef;
  citation: string;
  /** 국역 전문(verified). parts 를 이으면 이것과 같다(검증기) */
  fullText: string;
  parts: RestoredPart[];
}

// ── 기록 카드·찾기 ───────────────────────────────────────────────
export interface RecordCard {
  id: Id;
  title: string;
  /** 짧은 국역 축약(verified) */
  lines: { text: string; source: SourceRef }[];
  provenance: 'verified' | 'fictional';
  /** 열면 인물 카드를 얻는다 */
  personIds?: Id[];
  /** 복원 뒤에만 검색된다 */
  afterRestore?: true;
  /** 복원 전에는 말소된 기사('해당 기사 없음') */
  erasedBeforeRestore?: true;
  /** 카드에 붙는 꼬리표(예: 「김일손의 말을 옮긴 기록(그의 주장)」) */
  tag?: string;
  /** 「앞뒤 기록」(복원 뒤 호기심 보상) */
  aside?: 'before' | 'after';
  glosses?: Gloss[];
}

export type SearchResultKind = 'person' | 'record' | 'log';
export interface SearchEntry {
  id: Id;
  terms: string[];
  results: { kind: SearchResultKind; id: Id }[];
  afterRestore?: true;
  /** 복원 전에는 '해당 기사 없음' */
  noArticleBeforeRestore?: true;
}

/** 내 관측 로그의 문서(1년 전 보고서·예고) — fictional */
export interface LogDocument {
  id: Id;
  code: string;
  when: string;
  officer: string;
  fields: { label: string; value: string }[];
  note: string;
  result: string;
  provenance: 'fictional';
}

// ── 메신저 ──────────────────────────────────────────────────────
export type MsgFrom = 'han' | 'oh' | 'system' | 'me';
export type Presence = 'online' | 'away';

export type Step =
  | { kind: 'say'; id: Id; from: 'han' | 'oh'; text: string; heavy?: true; restored?: string }
  | { kind: 'system'; id: Id; text: string }
  | { kind: 'status'; presence: Presence }
  | { kind: 'attach'; id: Id; docId: Id; label: string }
  | { kind: 'pause'; ms: number; fakeTyping?: true }
  | { kind: 'async'; event: Id; minS: number; maxS: number; capS: number }
  | ChoiceStep;

export interface ChoiceStep {
  kind: 'choice';
  id: Id;
  options: { id: Id; text: string; then: Step[] }[];
  /** 고른 갈래 뒤 공통 */
  after?: Step[];
  /** 「(답 없음)」이 허용되는가. 아니면 기한이 지나면 after 를 이어서 한다 */
  allowNoReply?: true;
}

export interface Burst {
  id: Id;
  steps: Step[];
  /** 자발 메시지(90초 간격 제한) */
  spontaneous?: true;
  /** 같은 사건이 다시 와도 보낸다(기본 한 번만) */
  repeatable?: true;
}

// ── 힌트 사다리 ──────────────────────────────────────────────────
export interface Cond {
  allViewed?: Id[];
  anyViewed?: Id[];
  tagsDone?: Id[];
  tagsNotDone?: Id[];
  eyesOpen?: Id[];
  roomOpened?: boolean;
  revealed?: Id[];
  unresolved?: Id[];
  closureDone?: boolean;
  rewriteOpen?: boolean;
  allRestored?: boolean;
  restored?: boolean;
  /** 지금 이 눈의 컷을 보고 있다 */
  viewingEye?: Id;
  maxSwipes?: number;
  minSwipes?: number;
  minFails?: { key: string; n: number };
  any?: Cond[];
}

export interface HintLadder {
  id: Id;
  activeWhen: Cond;
  doneWhen: Cond;
  /** 상황 시작 뒤 첫 침묵(초), 기본 30 */
  silenceS?: number;
  /** 실패 수 카운터 키(store.fails) */
  failKey?: string;
  steps: { id: Id; text: string; afterS: number; fails?: number }[];
}

// ── 에피소드 번들 ────────────────────────────────────────────────
export interface HomeCard {
  code: string;
  date: { before: string; after: string };
  place: { before: string; after: string; source: SourceRef; note: string };
  task: string;
  detection: string;
  status: { before: string; after: string };
}

export interface Episode {
  id: Id;
  title: string;
  room: RoomPlan;
  cards: PersonCard[];
  figures: Figure[];
  groups: SpeakerGroup[];
  lines: Line[];
  details: Detail[];
  cuts: CutRef[];
  eyes: Eye[];
  closures: EyeClosure[];
  tags: TagRule[];
  claims: Claim[];
  contradictions: Contradiction[];
  sentences: RecordSentence[];
  pieces: RecordPiece[];
  article: RestoredArticle;
  records: RecordCard[];
  search: SearchEntry[];
  docs: LogDocument[];
  bursts: Burst[];
  ladders: HintLadder[];
  home: HomeCard;
  /** 판정용 사실 키 함의 */
  implies: Record<FactKey, FactKey[]>;
  /** 검증기 전용 원장 */
  ledger: Record<Id, LedgerEntry[]>;
  /** 그날 그 방에 있던 실명 인물(유일성 대상) */
  roomPersons: Id[];
  /** 성씨 → 사실 키 */
  surnameKeys: Record<string, FactKey>;
  /** 다시 쓰기에 꼭 돌아와야 하는 문장 */
  requiredSentences: Id[];
  /** 복원 뒤 이야기 */
  epilogue: {
    monologue: string[];
    teaserDocId: Id;
    oldReportDocId: Id;
    /** 「이 장면에 대해」 */
    aboutScene: string;
    /** 현실 재기록 뒤에도 남는 로그 줄(부재의 증거) */
    witnessLogLabel: string;
  };
  /** 단말 시계 저장점 */
  clocks: { start: Hhmm; S1: Hhmm; S2: Hhmm; E4: Hhmm; S3: Hhmm; S4: Hhmm; S5: Hhmm };
}
