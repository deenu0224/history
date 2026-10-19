/**
 * v6 「기록을 따라가 그날을 고정한다」 타입. DESIGN_V6 §3~§6.
 * 모든 콘텐츠는 provenance 를 단다. 판정은 사실(Fact)을 이어 계산하고, 답은 데이터에만 있다.
 */
export type Id = string;
export type Provenance = 'verified' | 'reconstructed' | 'fictional';

// ── 글(§4) ─────────────────────────────────────────────
/** 손상된 줄의 조각: 남은 글 또는 구멍. 구멍의 restored 는 복원 뒤에만 쓴다(국역 그대로). */
export type HolePart = { text: string } | { hole: true; restored: string; who?: true; accepts?: string };

/** 검증 문장: HISTORICAL_SOURCES 에 적힌 국역·원문만. 원문 wonmun 이 null 이면 「확보 전」 */
export interface VerifiedLine {
  id: Id;
  provenance: 'verified';
  source: 'sillok' | 'encykorea';
  articleId: string;
  kukyeok: string;
  wonmun: string | null;
  citation: string;
  url: string;
  note?: string;
  /** 손상된 줄이면 조각(구멍 포함). 이으면 kukyeok 과 같다 */
  parts?: HolePart[];
}

/** 현대어 풀이(F1~F8). 손상된 줄은 modernParts 로, 구멍 안 풀이는 복원 데이터(fix.ts)에만 */
export interface ModernLine {
  id: Id;
  provenance: 'reconstructed';
  sourceId: Id;
  modern: string;
  /** 손상된 줄: 구멍 자리를 같은 순서로 */
  modernParts?: ({ text: string } | { hole: true })[];
  glossTerms: string[];
  reviewed: boolean;
}

/** 재구성 묘사(관측의 본 것) */
export interface SceneLine {
  id: Id;
  provenance: 'reconstructed';
  text: string;
  basis: Id[];
}

export interface LineBundle {
  verified: Record<Id, VerifiedLine>;
  modern: Record<Id, ModernLine>;
  scenes: Record<Id, SceneLine>;
  /** 낱말 풀이(원문 보기에만) */
  gloss: Record<string, string>;
  /** 복원 뒤에만 로드: 손상된 줄의 구멍마다 현대어 풀이 */
  restoredModern: Record<Id, string[]>;
}

// ── 사실·카드(§3.1) ────────────────────────────────────
export type Val = { e: Id } | { t: string } | { w: string[] };
export interface Fact {
  s: Id;
  k: string;
  v: Val;
}
export type EntityKind = 'named' | 'word' | 'role' | 'slot' | 'thing';
export interface Entity {
  label: string;
  kind: EntityKind;
}
export type KeyKind = 'ident' | 'words' | 'plain';
export interface KeySpec {
  kind: KeyKind;
  label: string;
}
/** 변수는 ? 로 시작. then.k 가 '≡' 면 같은 대상, '≠' 면 다른 대상 */
export interface Pat {
  s: string;
  k: string;
  v: { e: string } | { t: string };
}
export interface Rule {
  id: Id;
  if: Pat[];
  then: Pat;
}
export interface Question {
  id: Id;
  subject: Id;
  /** '누구' = 같은 대상으로 묶인 이름·역할, 그 밖 = 그 키의 값 */
  key: string;
  accept?: EntityKind[];
}
export interface Goal {
  id: Id;
  /** 목표 띠(큰 목표 하나) */
  text: string;
  question: Question;
}
export interface World {
  entities: Record<Id, Entity>;
  /** 일부러 만든 순서(대표 고르기·결정성) */
  order: Id[];
  keys: Record<string, KeySpec>;
  rules: Rule[];
  /** 에피소드 내내 참인 사실(N0 에 보이는 것) */
  facts: Fact[];
  questions: Question[];
  goal: Goal;
}

export type CardKind = 'heard' | 'seen' | 'record' | 'conclusion';
export interface Card {
  id: Id;
  kind: CardKind;
  short: string;
  provenance: Provenance;
  facts: Fact[];
  /** 이 카드가 말하는 주된 대상(「다른 대상」 판정) */
  about: Id;
  /** 이 카드가 닿는 곳(「이어지지 않음」 기본 문구) */
  reach: string;
  /** 「왜 아닌지」 글에서 이 카드를 가리키는 말(짧은 이름 말고 글에 쓰이는 낱말, V8) */
  mentions?: string[];
}
export interface Clue extends Card {
  kind: 'heard' | 'seen' | 'record';
  /** ModernLine 또는 SceneLine id */
  line: Id;
  /** 들은 말 앞의 무대 지시(재구성). {holder} 는 결론 뒤 이름으로 바뀐다 */
  stage?: string;
  /** 같은 문장을 다른 곳에서도 얻는 단서(합쳐 카드 하나, 나온 곳 둘) */
  dupOf?: Id;
  sources: Id[];
  chips: string[];
  decoy?: boolean;
}
export interface Conclusion extends Card {
  kind: 'conclusion';
  question: Id;
  /** 숨은 물음의 값(엔티티 id 또는 토큰) */
  value: string;
  text: string;
  /** 이 결론 뒤 화면 이름이 바뀐다 */
  renames?: Record<string, string>;
  /** 큰 목표 대상 문장 아래 「지금까지 밝힌 것」 줄 */
  goalLine?: string;
  /** 이 결론이 나오면 열리는 칩 */
  monologue?: Id;
}

// ── 기록 그래프(§2, §6.2) ──────────────────────────────
export type NodeKind = 'sillok' | 'observation' | 'person' | 'current' | 'fragment';
export type LinkKind = 'place' | 'time' | 'person' | 'event';
export interface Link {
  id: Id;
  kind: LinkKind;
  label: string;
  to: Id;
  /** 이 결론이 나온 뒤에만 보인다 */
  showAfter?: Id;
  /** 복원 뒤에만 보인다 */
  restoredOnly?: boolean;
  /** 잠긴 칩(점선 + 까닭). 복원되면 열린다 */
  locked?: { reason: string; opensOnRestore?: boolean };
}
export type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'line'; line: Id; marks?: { clue: Id; text: string }[] }
  | { kind: 'scene'; line: Id; clue?: Id }
  | { kind: 'heard'; line: Id; clue: Id }
  | { kind: 'note'; text: string; provenance: Provenance };
export interface Page {
  blocks: Block[];
}
export interface RecordNode {
  id: Id;
  kind: NodeKind;
  title: string;
  provenance: Provenance;
  header?: { text: string; provenance: Provenance };
  pages: Page[];
  links: Link[];
  /** 복원 뒤에만 열린다 */
  restoredOnly?: boolean;
  /** 뚫린 줄 아래 「지금까지 밝힌 것」을 붙이는 노드 */
  goalTarget?: boolean;
}

// ── 판정 결과(§3.3, §5) ───────────────────────────────
export type FailCode = 'conflict' | 'other' | 'unlinked' | 'ambiguous' | 'twice' | 'off_goal';
export const FAIL_LABEL: Record<FailCode, string> = {
  conflict: '어긋남',
  other: '다른 대상',
  unlinked: '이어지지 않음',
  ambiguous: '하나로 좁혀지지 않음',
  twice: '같은 말 두 번',
  off_goal: '목표와 닿지 않음',
};
export type Judgement =
  | { status: 'conclusion'; conclusionId: Id; question: Id; value: string }
  | { status: 'goal'; value: string }
  | { status: 'already'; conclusionId?: Id; goal?: true }
  | { status: 'fail'; code: FailCode; text: string; shake: Id[] };

export interface WhyOverride {
  /** 정렬된 카드 id */
  pair: Id[];
  code: FailCode;
  text: string;
}

/** 지켜야 하는 맞는 묶음(검증기 V1 의 기대) */
export interface Combo {
  id: Id;
  /** 대체 가능한 묶음들(각각 정렬된 카드 id) */
  sets: Id[][];
  /** 결론 id, 큰 목표면 'goal' */
  gives: Id | 'goal';
}

// ── 고정·복원(§6.7, §6.8) ─────────────────────────────
export interface FixSpec {
  /** 손상된 줄(VerifiedLine id) */
  line: Id;
  /** 고정 줄 현대어 */
  restoredModernLine: Id;
  /** 복원 뒤 돌아오는 기록 */
  returns: Id[];
  citationLabel: string;
  monologue: string[];
  firstFixHint?: Id;
}

// ── 메신저 ─────────────────────────────────────────────
export interface Monologue {
  id: Id;
  provenance: 'fictional';
  lines: string[];
  /** 복원 뒤에만 */
  postRestore?: boolean;
}

export interface Ep0Data {
  id: Id;
  lines: LineBundle;
  world: World;
  nodes: Record<Id, RecordNode>;
  start: Id;
  clues: Record<Id, Clue>;
  conclusions: Record<Id, Conclusion>;
  combos: Combo[];
  why: WhyOverride[];
  /** 코드별 기본 틀({A} {B} {키} {값A} {값B} {대상A} {대상B} {무리} …) */
  whyTemplates: Record<FailCode, string>;
  fix: FixSpec;
  monologues: Monologue[];
  /** 큰 목표의 답 낱말과 별칭(검증기 V4) */
  answerTokens: string[];
  /** 고유명(F8) */
  names: string[];
  /** 한 선임 힌트 사다리(볼 곳만): 이 결론이 나오기 전까지 */
  hints: { id: Id; until: Id }[];
}
