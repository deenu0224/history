/**
 * 힌트 사다리(순수). DESIGN_V5 §7: 그 상황이 된 뒤 처음 30초 침묵 · 시간(초)이나 실패 수로 한 단 · 사다리당 최대 3통 ·
 * 풀리면 멈춤 · 설정 끔/보통/자세히(자세히 = 시간 절반). 보내는 것은 메신저(자발, 90초 간격)뿐.
 */
import type { Cond, HintLadder, Id } from './types';

export type HintLevel = 'off' | 'normal' | 'detailed';

/** 조건 판정에 필요한 진행 요약(스토어가 만든다) */
export interface Progress {
  viewed: readonly Id[];
  tagsDone: readonly Id[];
  eyesOpen: readonly Id[];
  roomOpened: boolean;
  revealed: readonly Id[];
  resolved: readonly Id[];
  closureDone: boolean;
  rewriteOpen: boolean;
  allRestored: boolean;
  restored: boolean;
  viewingEye: Id | null;
  swipes: number;
  fails: Readonly<Record<string, number>>;
}

export function check(p: Progress, c: Cond): boolean {
  const all = (have: readonly Id[], need?: readonly Id[]) => (need ?? []).every((x) => have.includes(x));
  if (!all(p.viewed, c.allViewed)) return false;
  if (c.anyViewed && !c.anyViewed.some((x) => p.viewed.includes(x))) return false;
  if (!all(p.tagsDone, c.tagsDone)) return false;
  if ((c.tagsNotDone ?? []).some((x) => p.tagsDone.includes(x))) return false;
  if (!all(p.eyesOpen, c.eyesOpen)) return false;
  if (c.roomOpened !== undefined && p.roomOpened !== c.roomOpened) return false;
  if (!all(p.revealed, c.revealed)) return false;
  if ((c.unresolved ?? []).some((x) => p.resolved.includes(x))) return false;
  if (!all(p.resolved, c.resolved)) return false;
  if (c.closureDone !== undefined && p.closureDone !== c.closureDone) return false;
  if (c.rewriteOpen !== undefined && p.rewriteOpen !== c.rewriteOpen) return false;
  if (c.allRestored !== undefined && p.allRestored !== c.allRestored) return false;
  if (c.restored !== undefined && p.restored !== c.restored) return false;
  if (c.viewingEye !== undefined && p.viewingEye !== c.viewingEye) return false;
  if (c.maxSwipes !== undefined && p.swipes > c.maxSwipes) return false;
  if (c.minSwipes !== undefined && p.swipes < c.minSwipes) return false;
  if (c.minFails && (p.fails[c.minFails.key] ?? 0) < c.minFails.n) return false;
  if (c.any && c.any.length && !c.any.some((x) => check(p, x))) return false;
  return true;
}

export interface HintState {
  /** 사다리 → 상황이 시작된 시각(ms) */
  activeSince: Record<Id, number>;
  /** 사다리 → 보낸 단 수 */
  sent: Record<Id, number>;
  /** 사다리 → 마지막으로 보낸 시각 */
  lastSentAt: Record<Id, number>;
}

export const emptyHintState = (): HintState => ({ activeSince: {}, sent: {}, lastSentAt: {} });

export const DEFAULT_SILENCE_S = 30;

/** 상황 시작 시각을 갱신한다(켜졌다 꺼졌다 하면 다시 센다) */
export function trackActive(ladders: readonly HintLadder[], h: HintState, p: Progress, now: number): HintState {
  const activeSince = { ...h.activeSince };
  for (const l of ladders) {
    const on = check(p, l.activeWhen) && !check(p, l.doneWhen);
    if (on && activeSince[l.id] === undefined) activeSince[l.id] = now;
    if (!on && activeSince[l.id] !== undefined) delete activeSince[l.id];
  }
  return { ...h, activeSince };
}

/** 지금 보낼 단(없으면 null). 한 번에 한 단, 한 사다리. */
export function dueHint(ladders: readonly HintLadder[], h: HintState, p: Progress, now: number, level: HintLevel): { ladderId: Id; stepId: Id; text: string; index: number } | null {
  if (level === 'off') return null;
  const k = level === 'detailed' ? 0.5 : 1;
  for (const l of ladders) {
    const since = h.activeSince[l.id];
    if (since === undefined) continue;
    const sent = h.sent[l.id] ?? 0;
    const step = l.steps[sent];
    if (!step) continue;
    const silence = (l.silenceS ?? DEFAULT_SILENCE_S) * 1000 * k;
    if (now - since < silence) continue;
    const base = sent === 0 ? since : (h.lastSentAt[l.id] ?? since);
    const timeOk = now - base >= step.afterS * 1000 * k;
    const failOk = step.fails !== undefined && l.failKey !== undefined && (p.fails[l.failKey] ?? 0) >= step.fails;
    if (timeOk || failOk) return { ladderId: l.id, stepId: step.id, text: step.text, index: sent };
  }
  return null;
}

export function markSent(h: HintState, ladderId: Id, now: number): HintState {
  return { ...h, sent: { ...h.sent, [ladderId]: (h.sent[ladderId] ?? 0) + 1 }, lastSentAt: { ...h.lastSentAt, [ladderId]: now } };
}
