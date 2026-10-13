/**
 * 결록 단말의 순수 로직: 상태 조건, 앱 잠금, 메시지 도착, 정합성 보정, 레코드/메모 보기, 튜토리얼·힌트.
 */
import type {
  AppDef,
  AppId,
  CorrectionEvent,
  DbRecord,
  FlagValue,
  Id,
  Message,
  PlayStats,
  StateCondition,
  TerminalMemo,
  TutorialStep,
} from './types';

export const APP_IDS: readonly AppId[] = ['messenger', 'search', 'viewer', 'reader', 'board', 'archive', 'notebook'];

export function emptyStats(): PlayStats {
  return {
    searches: 0,
    unknownSearches: 0,
    scrubs: 0,
    taps: 0,
    phrases: 0,
    phraseMisses: 0,
    deductionAttempts: 0,
    exhibits: 0,
  };
}

/** 조건 판정에 필요한 상태(PersistedState 가 구조적으로 만족한다). */
export interface ConditionState {
  flags: Readonly<Record<string, FlagValue>>;
  evidence: Readonly<Record<Id, number>>;
  searched: readonly Id[];
  read: readonly Id[];
  appsOpened: readonly AppId[];
  phrases: readonly Id[];
  tapped: readonly Id[];
  attempts: Readonly<Record<Id, number>>;
  corrections: readonly Id[];
  stats: PlayStats;
}

export function checkState(s: ConditionState, c?: StateCondition): boolean {
  if (!c) return true;
  const has = (list: readonly string[], ids?: readonly string[]) => (ids ?? []).every((id) => list.includes(id));
  if (!(c.all ?? []).every((f) => Boolean(s.flags[f]))) return false;
  if ((c.none ?? []).some((f) => Boolean(s.flags[f]))) return false;
  if (!(c.evidence ?? []).every((id) => s.evidence[id] !== undefined)) return false;
  if (!has(s.searched, c.searched) || !has(s.read, c.read) || !has(s.appsOpened, c.appsOpened)) return false;
  if (!has(s.phrases, c.phrases) || !has(s.tapped, c.tapped) || !has(s.corrections, c.corrections)) return false;
  if (!(c.attempted ?? []).every((id) => (s.attempts[id] ?? 0) > 0)) return false;
  for (const [k, v] of Object.entries(c.minStats ?? {}))
    if ((s.stats[k as keyof PlayStats] ?? 0) < (v ?? 0)) return false;
  if (c.any && c.any.length > 0 && !c.any.some((sub) => checkState(s, sub))) return false;
  return true;
}

/** 조건이 참조하는 플래그(검증기용) */
export function conditionFlags(c?: StateCondition): string[] {
  return [...(c?.all ?? []), ...(c?.none ?? []), ...(c?.any ?? []).flatMap(conditionFlags)];
}

export function unlockedApps(apps: readonly AppDef[], s: ConditionState): AppId[] {
  return [...apps]
    .sort((a, b) => a.order - b.order)
    .filter((a) => checkState(s, a.unlockWhen))
    .map((a) => a.app);
}

export function isAppUnlocked(apps: readonly AppDef[], app: AppId, s: ConditionState): boolean {
  const def = apps.find((a) => a.app === app);
  return !!def && checkState(s, def.unlockWhen);
}

/** 아직 도착하지 않았고 조건을 만족한 메시지(order 순) */
export function dueMessages(messages: readonly Message[], s: ConditionState, arrived: ReadonlySet<Id>): Message[] {
  return messages.filter((m) => !arrived.has(m.id) && checkState(s, m.when)).sort((a, b) => a.order - b.order);
}

export function dueCorrections(events: readonly CorrectionEvent[], s: ConditionState): CorrectionEvent[] {
  return events.filter((e) => !s.corrections.includes(e.id) && checkState(s, e.trigger));
}

/** 보정이 적용된 레코드(보정은 흔적을 남기지 않는다 — 표시도 하지 않는다). */
export function recordView(rec: DbRecord, events: readonly CorrectionEvent[], applied: readonly Id[]): DbRecord {
  let fields = rec.fields;
  for (const e of events)
    if (applied.includes(e.id))
      for (const p of e.recordPatches)
        if (p.recordId === rec.id) fields = fields.map((f) => (f.key === p.key ? { ...f, value: p.value } : f));
  return fields === rec.fields ? rec : { ...rec, fields };
}

export function memoView(memo: TerminalMemo, events: readonly CorrectionEvent[], applied: readonly Id[]): TerminalMemo {
  let text = memo.text;
  for (const e of events) if (applied.includes(e.id)) for (const p of e.memoPatches) if (p.memoId === memo.id) text = p.text;
  return text === memo.text ? memo : { ...memo, text };
}

// ── 튜토리얼·힌트 ─────────────────────────────────────────────
export type HintLevel = 'off' | 'normal' | 'detailed';
export const DEFAULT_IDLE_SECONDS = 40;
export const FAILS_PER_TIER = 2;

export interface TutorialState {
  done: Id[];
  /** 코치마크를 건너뛴 단계 */
  dismissed: Id[];
  /** 단계별 실패 수 */
  fails: Record<Id, number>;
  /** 단계별 방치로 오른 힌트 단계(0~3) */
  idleTier: Record<Id, number>;
}

export function emptyTutorial(): TutorialState {
  return { done: [], dismissed: [], fails: {}, idleTier: {} };
}

/** 보여 줄 단계: showWhen 충족, 아직 doneWhen 미충족·미완료. order 순. */
export function activeSteps(steps: readonly TutorialStep[], s: ConditionState, t: TutorialState): TutorialStep[] {
  return steps
    .filter((st) => !t.done.includes(st.id) && checkState(s, st.showWhen) && !checkState(s, st.doneWhen))
    .sort((a, b) => a.order - b.order);
}

/** 이제 완료된 단계(스토어가 done 에 넣는다) */
export function newlyDone(steps: readonly TutorialStep[], s: ConditionState, t: TutorialState): Id[] {
  return steps.filter((st) => !t.done.includes(st.id) && checkState(s, st.doneWhen)).map((st) => st.id);
}

export function idleThreshold(step: TutorialStep, level: HintLevel): number {
  const base = step.idleSeconds ?? DEFAULT_IDLE_SECONDS;
  return level === 'detailed' ? Math.round(base / 2) : base;
}

/** 방치 시간 → 힌트 단계(0~3). 0초 이상 threshold 마다 한 단계. */
export function tierFromIdle(step: TutorialStep, seconds: number, level: HintLevel): number {
  if (level === 'off') return 0;
  return Math.max(0, Math.min(3, Math.floor(seconds / idleThreshold(step, level))));
}

/**
 * 현재 힌트 단계. 끔=0. 보통: max(방치 단계, 실패 2회마다 1). 자세히: 최소 1, 실패 1회마다 1.
 */
export function hintTier(step: TutorialStep, t: TutorialState, level: HintLevel): number {
  if (level === 'off') return 0;
  const fails = t.fails[step.id] ?? 0;
  const perTier = level === 'detailed' ? 1 : FAILS_PER_TIER;
  const tier = Math.max(t.idleTier[step.id] ?? 0, Math.floor(fails / perTier), level === 'detailed' ? 1 : 0);
  return Math.min(3, tier);
}

export function hintText(step: TutorialStep, tier: number): string | null {
  return tier <= 0 ? null : step.hints[Math.min(3, tier) - 1]!;
}

export function coachVisible(step: TutorialStep, t: TutorialState, level: HintLevel): boolean {
  return level !== 'off' && !t.dismissed.includes(step.id) && !t.done.includes(step.id);
}
