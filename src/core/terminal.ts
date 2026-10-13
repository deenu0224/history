/**
 * 결록 단말의 순수 로직: 상태 조건, 앱 잠금, 메시지 도착, 정합성 보정·현실 이동(합의된 현실의 다시 쓰기),
 * 레코드/메모/메시지/검색 결과 보기, 카드 겹치기, 튜토리얼·힌트.
 *
 * 다시 쓰기의 적용 순서(콘텐츠 기준, 결정적): 정합성 보정(적용 순) → 현실 이동(적용 순). 나중 것이 이긴다.
 */
import type {
  AppDef,
  AppId,
  CorrectionEvent,
  DbRecord,
  EvidenceLink,
  FlagValue,
  Id,
  Message,
  PlayStats,
  RealityShift,
  SearchEntry,
  SearchResultRef,
  StateCondition,
  TerminalMemo,
  TutorialStep,
} from './types';

export const APP_IDS: readonly AppId[] = ['messenger', 'search', 'viewer', 'board', 'notebook'];

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
    links: 0,
    linkMisses: 0,
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
  shifts: readonly Id[];
  links: readonly Id[];
  recorded: readonly Id[];
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
  if (!has(s.shifts, c.shifts) || !has(s.links, c.links) || !has(s.recorded, c.recorded)) return false;
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

export function dueShifts(shifts: readonly RealityShift[], s: ConditionState): RealityShift[] {
  return shifts.filter((x) => !s.shifts.includes(x.id) && checkState(s, x.when)).sort((a, b) => a.order - b.order);
}

/** 현실 층(콘텐츠)과 적용된 id. 상태(PersistedState)는 corrections·shifts 를 그대로 넘기면 된다. */
export interface RealityLayers {
  corrections: readonly CorrectionEvent[];
  shifts: readonly RealityShift[];
}
export interface RealityApplied {
  corrections: readonly Id[];
  shifts: readonly Id[];
}

const appliedIn = <T extends { id: Id }>(list: readonly T[], applied: readonly Id[]): T[] =>
  applied.map((id) => list.find((x) => x.id === id)).filter((x): x is T => !!x);

/** 보정·현실 이동이 적용된 레코드. 흔적·표식을 남기지 않는다(같은 객체 또는 새 객체만). */
export function recordView(rec: DbRecord, layers: RealityLayers, applied: RealityApplied): DbRecord {
  let out = rec;
  for (const e of appliedIn(layers.corrections, applied.corrections))
    for (const p of e.recordPatches)
      if (p.recordId === rec.id) out = { ...out, fields: out.fields.map((f) => (f.key === p.key ? { ...f, value: p.value } : f)) };
  for (const sh of appliedIn(layers.shifts, applied.shifts))
    for (const r of sh.recordRewrites) {
      if (r.recordId !== rec.id) continue;
      let fields = out.fields;
      for (const f of r.fields ?? [])
        fields = fields.some((x) => x.key === f.key) ? fields.map((x) => (x.key === f.key ? f : x)) : [...fields, f];
      out = {
        ...out,
        fields,
        ...(r.title !== undefined ? { title: r.title } : {}),
        ...(r.note !== undefined ? { note: r.note } : {}),
        ...(r.provenance ? { provenance: r.provenance } : {}),
        ...(r.sources ? { sources: r.sources } : {}),
      };
    }
  return out;
}

/** 보정이 적용된 메모. 지워졌으면 null. */
export function memoView(memo: TerminalMemo, layers: RealityLayers, applied: RealityApplied): TerminalMemo | null {
  let text = memo.text;
  for (const e of appliedIn(layers.corrections, applied.corrections))
    for (const p of e.memoPatches)
      if (p.memoId === memo.id) {
        if (p.remove) return null;
        if (p.text !== undefined) text = p.text;
      }
  return text === memo.text ? memo : { ...memo, text };
}

/** 지금 현실의 메시지 본문. */
export function messageText(m: Message, layers: RealityLayers, applied: RealityApplied): string {
  let text = m.text;
  for (const sh of appliedIn(layers.shifts, applied.shifts))
    for (const r of sh.messageRewrites) if (r.messageId === m.id) text = r.newText;
  return text;
}

export function messageView(m: Message, layers: RealityLayers, applied: RealityApplied): Message {
  const text = messageText(m, layers, applied);
  return text === m.text ? m : { ...m, text };
}

/** 지금 현실의 검색 결과. noArticle 항목은 다시 쓰이기 전까지 결과가 없다('해당 기사 없음'). */
export function searchResultsView(
  e: SearchEntry,
  layers: RealityLayers,
  applied: RealityApplied,
): { results: SearchResultRef[]; noArticle: boolean } {
  let results = e.results;
  let rewritten = false;
  for (const sh of appliedIn(layers.shifts, applied.shifts))
    for (const r of sh.searchRewrites ?? [])
      if (r.entryId === e.id) {
        results = r.results;
        rewritten = true;
      }
  return { results, noArticle: !!e.noArticle && !rewritten };
}

// ── 카드 겹치기 ───────────────────────────────────────────────
const sameSet = (a: readonly Id[], b: readonly Id[]) => {
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
};

/** 고른 카드 집합과 정확히 같은 입력을 가진 연결(없으면 undefined). */
export function findLink(links: readonly EvidenceLink[], ids: readonly Id[]): EvidenceLink | undefined {
  return links.find((l) => sameSet(l.inputs, ids));
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
