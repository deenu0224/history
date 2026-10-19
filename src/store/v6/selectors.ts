/**
 * v6 화면 보기(순수). 상태 + Ep0 데이터 → 화면이 그대로 쓰는 값. 정답은 어디에도 없다.
 * 복원 전에는 구멍·가린 출처, 복원 뒤에는 돌아온 글과 출처.
 */
import * as M from '@/core/messenger';
import { bagCards, sharedChips, type BagCard } from '@/core/v6/bag';
import { clueOrigins, clueProgress, visibleLinks, type LinkView } from '@/core/v6/graph';
import { fillLabels, glossFor, kukyeokView, modernView, sourceView, wonmunView, type WonmunView } from '@/core/v6/lines';
import type { Block, Clue, Conclusion, Ep0Data, Id } from '@/core/v6/types';
import { EP0_V6 } from '@/data/v6/ep0';
import { fixCandidate, fixRate, graphCtx, makeCtx, nextHint, PICK_N, RESTORE_STEPS, type V6State } from './engine';

const DEFAULT_LABELS: Record<string, string> = { holder: '두루마리를 편 관원' };

/** 결론이 바꾼 이름(두루마리를 편 관원 → 최만리) */
export function selectLabels(s: V6State, d: Ep0Data = EP0_V6): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of s.found) Object.assign(out, d.conclusions[id]?.renames ?? {});
  return out;
}

export interface LineView {
  lineId: Id;
  verifiedId: Id;
  /** 화면 글(현대어 풀이; 손상된 줄은 구멍 그대로) */
  text: string;
  /** 밑줄 조각. clue 가 있으면 눌러 모은다 */
  segments: { text: string; clue?: Id; collected?: boolean; seen?: boolean }[];
  provenance: 'reconstructed';
  damaged: boolean;
  wonmunOpen: boolean;
  /** 이 줄에 단서 밑줄이 있다 */
  hasClue: boolean;
}

export interface BlockView {
  kind: Block['kind'];
  text?: string;
  provenance?: string;
  line?: LineView;
  /** 들은 말 앞 무대 지시(재구성) */
  stage?: string;
  /** 묘사 글(본 것) */
  scene?: { id: Id; text: string; basis: Id[] };
  clue?: Id;
  collected?: boolean;
}

function lineView(s: V6State, d: Ep0Data, lineId: Id, marks: { clue: Id; text: string }[] = []): LineView {
  const m = d.lines.modern[lineId]!;
  const text = modernView(d.lines, lineId, s.restored, selectLabels(s, d), DEFAULT_LABELS);
  const segs: LineView['segments'] = [];
  let rest = text;
  const sorted = [...marks].sort((a, b) => (a.text === '*' ? 0 : text.indexOf(a.text)) - (b.text === '*' ? 0 : text.indexOf(b.text)));
  for (const mk of sorted) {
    const base = { clue: mk.clue, collected: s.collected.includes(mk.clue) };
    if (mk.text === '*') {
      segs.push({ text: rest, ...base });
      rest = '';
      continue;
    }
    const i = rest.indexOf(mk.text);
    if (i < 0) continue;
    if (i > 0) segs.push({ text: rest.slice(0, i) });
    segs.push({ text: mk.text, ...base });
    rest = rest.slice(i + mk.text.length);
  }
  if (rest) segs.push({ text: rest });
  if (!segs.length) segs.push({ text });
  return {
    lineId,
    verifiedId: m.sourceId,
    text,
    segments: segs,
    provenance: 'reconstructed',
    damaged: !!m.modernParts && !s.restored,
    wonmunOpen: s.wonmunOpen.includes(lineId),
    hasClue: marks.length > 0,
  };
}

export interface NodeView {
  id: Id;
  title: string;
  kind: string;
  provenance: string;
  header?: { text: string; provenance: string };
  /** 지금 보는 쪽 · 넘겨 본 가장 먼 쪽 */
  page: number;
  furthest: number;
  pageCount: number;
  blocks: BlockView[];
  links: LinkView[];
  /** 기록 머리 「단서 n/m」 */
  clues: { got: number; total: number };
  canBack: boolean;
  /** 큰 목표 대상 문장 아래 「지금까지 밝힌 것」 */
  foundLines: string[];
  goalTarget: boolean;
}

export function selectNode(s: V6State, d: Ep0Data = EP0_V6, at?: number): NodeView | null {
  const id = s.nodeStack[s.nodeStack.length - 1];
  const n = id ? d.nodes[id] : undefined;
  if (!n) return null;
  const furthest = Math.min(s.pages[n.id] ?? 0, n.pages.length - 1);
  // 보는 쪽: 넘겨 본 쪽까지만 갈 수 있다(아직 안 넘긴 쪽은 보이지 않는다)
  const page = Math.max(0, Math.min(at ?? furthest, furthest));
  const labels = selectLabels(s, d);
  return {
    id: n.id,
    title: n.title,
    kind: n.kind,
    provenance: n.provenance,
    ...(n.header ? { header: n.header } : {}),
    page,
    furthest,
    pageCount: n.pages.length,
    blocks: n.pages[page]!.blocks.map((b) => blockView(s, d, b, labels)),
    links: visibleLinks(n, graphCtx(s)),
    clues: clueProgress(d.nodes, n.id, s.collected),
    canBack: s.nodeStack.length > 1,
    foundLines: n.goalTarget ? s.found.map((f) => d.conclusions[f]?.goalLine).filter((x): x is string => !!x) : [],
    goalTarget: !!n.goalTarget,
  };
}

function blockView(s: V6State, d: Ep0Data, b: Block, labels: Record<string, string>): BlockView {
  switch (b.kind) {
    case 'heading':
      return { kind: 'heading', text: b.text };
    case 'note':
      return { kind: 'note', text: b.text, provenance: b.provenance };
    case 'line':
      return { kind: 'line', line: lineView(s, d, b.line, b.marks) };
    case 'scene': {
      const sc = d.lines.scenes[b.line]!;
      return { kind: 'scene', scene: { id: sc.id, text: sc.text, basis: sc.basis }, ...(b.clue ? { clue: b.clue, collected: s.collected.includes(b.clue) } : {}) };
    }
    case 'heard': {
      const clue = d.clues[b.clue]!;
      const lv = lineView(s, d, b.line, [{ clue: b.clue, text: '*' }]);
      return { kind: 'heard', line: lv, clue: b.clue, collected: s.collected.includes(b.clue), ...(clue.stage ? { stage: fillLabels(clue.stage, labels, DEFAULT_LABELS) } : {}) };
    }
  }
}

// ── 큰 목표 ───────────────────────────────────────────────
export interface GoalView {
  text: string;
  status: 'open' | 'solved' | 'fixed';
  /** 풀린 값(고정 전에도 목표 띠에 보인다) */
  answer: string | null;
  /** 지금까지 밝힌 것 */
  foundLines: string[];
}

export function selectGoal(s: V6State, d: Ep0Data = EP0_V6): GoalView {
  return {
    text: d.world.goal.text,
    status: s.fixed ? 'fixed' : s.goalValue !== null ? 'solved' : 'open',
    answer: s.goalValue !== null ? (d.world.entities[s.goalValue]?.label ?? null) : null,
    foundLines: s.found.map((f) => d.conclusions[f]?.goalLine).filter((x): x is string => !!x),
  };
}

// ── 주머니 ────────────────────────────────────────────────
export interface CardView {
  id: Id;
  short: string;
  kindLabel: '들은 말' | '본 것' | '기록' | '결론';
  kind: string;
  /** 카드 글(현대어 한 줄 / 결론 문구) */
  text: string;
  stage?: string;
  chips: string[];
  /** 나온 곳(기록 id) */
  origins: Id[];
  decoy?: boolean;
  picked: boolean;
  conclusion: boolean;
  /** 원문 보기가 있는 줄 */
  lineId?: Id;
}

const KIND_LABEL = { heard: '들은 말', seen: '본 것', record: '기록', conclusion: '결론' } as const;

function cardView(s: V6State, d: Ep0Data, b: BagCard): CardView {
  const labels = selectLabels(s, d);
  if (b.card.kind === 'conclusion') {
    const c = b.card as Conclusion;
    return { id: b.id, short: c.short, kindLabel: '결론', kind: 'conclusion', text: c.text, chips: [], origins: [], picked: s.picked.includes(b.id), conclusion: true };
  }
  const c = b.card as Clue;
  const sc = d.lines.scenes[c.line];
  return {
    id: b.id,
    short: c.short,
    kindLabel: KIND_LABEL[c.kind],
    kind: c.kind,
    text: sc ? sc.text : modernView(d.lines, c.line, s.restored, labels, DEFAULT_LABELS),
    ...(c.stage ? { stage: fillLabels(c.stage, labels, DEFAULT_LABELS) } : {}),
    chips: c.chips,
    origins: b.origins,
    ...(c.decoy ? { decoy: true } : {}),
    picked: s.picked.includes(b.id),
    conclusion: false,
    ...(d.lines.modern[c.line] ? { lineId: c.line } : {}),
  };
}

export interface BagView {
  cards: CardView[];
  /** 시트 위 낱말 줄(둘 이상의 카드가 가진 낱말) */
  chips: string[];
  n: number;
  slots: (CardView | null)[];
  canCombine: boolean;
  count: number;
}

export function selectBag(s: V6State, d: Ep0Data = EP0_V6, chip?: string): BagView {
  const origins = Object.fromEntries(Object.entries(clueOrigins(d.nodes)).map(([k, os]) => [k, os.map((o) => o.node)]));
  let cards = bagCards(d.clues, d.conclusions, s.collected, s.found, origins);
  const chips = sharedChips(cards);
  if (chip) cards = cards.filter((b) => ((b.card as Clue).chips ?? []).includes(chip));
  const all = bagCards(d.clues, d.conclusions, s.collected, s.found, origins);
  const views = cards.map((b) => cardView(s, d, b));
  const byId = new Map(all.map((b) => [b.id, cardView(s, d, b)]));
  return {
    cards: views,
    chips,
    n: PICK_N,
    slots: Array.from({ length: PICK_N }, (_, i) => (s.picked[i] ? (byId.get(s.picked[i]!) ?? null) : null)),
    canCombine: s.picked.length === PICK_N,
    count: all.length,
  };
}

/** 얻은 결론들(주머니 속 금색 카드) */
export function selectFound(s: V6State, d: Ep0Data = EP0_V6): { id: Id; short: string; text: string }[] {
  return s.found.map((id) => ({ id, short: d.conclusions[id]!.short, text: d.conclusions[id]!.text }));
}

// ── 원문 보기 ─────────────────────────────────────────────
export interface WonmunPanel {
  lineId: Id;
  open: boolean;
  /** ① 국역 그대로(◆ verified) */
  kukyeok: string;
  /** ② 원문(확보된 것만, 손상된 줄은 같은 자리 손상) */
  wonmun: WonmunView;
  /** ③ 낱말 풀이 */
  gloss: { term: string; meaning: string }[];
  /** ④ 출처(복원 전에는 가림) */
  source: { text: string; url?: string; note?: string };
  /** 재구성 묘사의 원문 보기 */
  scene?: undefined;
}

export function selectWonmun(s: V6State, lineId: Id, d: Ep0Data = EP0_V6): WonmunPanel | null {
  const m = d.lines.modern[lineId];
  if (!m) return null;
  return {
    lineId,
    open: s.wonmunOpen.includes(lineId),
    kukyeok: kukyeokView(d.lines, m.sourceId, s.restored),
    wonmun: wonmunView(d.lines, m.sourceId, s.restored),
    gloss: glossFor(d.lines, lineId),
    source: sourceView(d.lines, m.sourceId, s.restored),
  };
}

/** 재구성 묘사(본 것)의 원문 보기: 「재구성」과 근거 줄 */
export function selectSceneBasis(id: Id, d: Ep0Data = EP0_V6) {
  const sc = d.lines.scenes[id];
  return sc ? { note: '재구성 — 기록에는 이 모습이 없다', basis: sc.basis } : null;
}

// ── 아래 막대·역사 고정·복원 ───────────────────────────────
export interface NavView {
  center: 'combine' | 'fix' | 'next';
  label: string;
  badge: number;
  canBack: boolean;
  messengerUnread: number;
}

export function selectNav(s: V6State, d: Ep0Data = EP0_V6, now = 0): NavView {
  const center = s.restored ? 'next' : s.goalValue !== null ? 'fix' : 'combine';
  return {
    center,
    label: center === 'next' ? '다음 ›' : center === 'fix' ? '역사 고정 ›' : `맞춰 보기 · 단서 ${selectBag(s, d).count}`,
    badge: selectBag(s, d).count,
    canBack: s.nodeStack.length > 1,
    messengerUnread: M.view(s.messenger, now, s.restored).unread,
  };
}

export interface FixView {
  ready: boolean;
  /** 고정할 문장: 큰 목표의 답이 손상된 줄에 앉은 모습 */
  sentence: string;
  /** 현대어 줄(복원 전 구멍, 복원 뒤 풀이) */
  modern: string;
  rate: { fixed: number; total: number; pct: number };
  restored: boolean;
  citation?: string;
  url?: string;
  step: (typeof RESTORE_STEPS)[number];
  returned: Id[];
}

export function selectFix(s: V6State, d: Ep0Data = EP0_V6): FixView {
  const cand = fixCandidate(makeCtx(0, d), s.goalValue);
  const v = d.lines.verified[d.fix.line]!;
  const src = sourceView(d.lines, v.id, s.restored);
  return {
    ready: s.goalValue !== null && !s.fixed,
    sentence: s.restored ? v.kukyeok : (cand?.filled ?? kukyeokView(d.lines, v.id, false)),
    modern: modernView(d.lines, d.fix.restoredModernLine, s.restored),
    rate: fixRate(s),
    restored: s.restored,
    ...(s.restored ? { citation: src.text, url: src.url } : {}),
    step: RESTORE_STEPS[Math.min(s.restoreStep, RESTORE_STEPS.length - 1)]!,
    returned: s.restored ? d.fix.returns : [],
  };
}

/** 07 독백(fictional): 지금까지 나온 것 */
export function selectMonologues(s: V6State, d: Ep0Data = EP0_V6) {
  return d.monologues.filter((m) => s.seenMonologues.includes(m.id)).map((m) => ({ id: m.id, lines: m.lines, provenance: m.provenance }));
}

export const selectMessenger = (s: V6State, now: number) => M.view(s.messenger, now, s.restored);

/** 다음 힌트(디버그·테스트): 다섯 번 헛맞춤이 되면 나갈 것 */
export const selectNextHint = (s: V6State, d: Ep0Data = EP0_V6) => nextHint(s, makeCtx(0, d));
