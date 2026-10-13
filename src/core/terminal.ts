/**
 * 결록 단말의 순수 로직(v3): 상태 조건, 앱 잠금, 메시지 도착, 정합성 보정·현실 이동(합의된 현실의 다시 쓰기),
 * 레코드/메시지/검색 결과/배정 헤더/종결 보고서 보기, 힌트 사다리.
 *
 * 다시 쓰기 순서(결정적): 정합성 보정(적용 순) → 현실 이동(적용 순). 나중 것이 이긴다.
 */
import type {
  AppDef,
  AppId,
  Assignment,
  ClosedReport,
  CorrectionEvent,
  DbRecord,
  FlagValue,
  HintLadder,
  Id,
  Message,
  PlayStats,
  RealityShift,
  SearchEntry,
  SearchResultRef,
  StateCondition,
} from './types';

export const APP_IDS: readonly AppId[] = ['work', 'viewer', 'db', 'messenger'];

export function emptyStats(): PlayStats {
  return {
    searches: 0,
    unknownSearches: 0,
    scrubs: 0,
    taps: 0,
    captures: 0,
    stamps: 0,
    stampMisses: 0,
    reportSubmits: 0,
    reportFails: 0,
  };
}

/** 조건 판정에 필요한 상태. clues 는 '지금 가진 프레임이 증명하는 단서'(스토어가 계산해 넘긴다). */
export interface ConditionState {
  flags: Readonly<Record<string, FlagValue>>;
  searched: readonly Id[];
  recordsOpened: readonly Id[];
  read: readonly Id[];
  appsOpened: readonly AppId[];
  heard: readonly Id[];
  seen: readonly Id[];
  clues: readonly Id[];
  stamped: readonly Id[];
  closed: readonly Id[];
  opened: readonly Id[];
  corrections: readonly Id[];
  shifts: readonly Id[];
  filed: readonly Id[];
  hintsDone: readonly Id[];
  stats: PlayStats;
}

export function checkState(s: ConditionState, c?: StateCondition): boolean {
  if (!c) return true;
  const has = (list: readonly string[], ids?: readonly string[]) => (ids ?? []).every((id) => list.includes(id));
  if (!(c.all ?? []).every((f) => Boolean(s.flags[f]))) return false;
  if ((c.none ?? []).some((f) => Boolean(s.flags[f]))) return false;
  if (!has(s.searched, c.searched) || !has(s.recordsOpened, c.records) || !has(s.read, c.read)) return false;
  if (!has(s.appsOpened, c.appsOpened) || !has(s.heard, c.heard) || !has(s.seen, c.seen)) return false;
  if (!has(s.clues, c.clues) || !has(s.stamped, c.stamped) || !has(s.closed, c.closed)) return false;
  if (!has(s.opened, c.opened) || !has(s.corrections, c.corrections) || !has(s.shifts, c.shifts)) return false;
  if (!has(s.filed, c.filed) || !has(s.hintsDone, c.hintsDone)) return false;
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

/** 아직 도착하지 않았고 조건을 만족한 메시지(order 순). 힌트 메시지는 제외(사다리가 보낸다). */
export function dueMessages(messages: readonly Message[], s: ConditionState, arrived: ReadonlySet<Id>): Message[] {
  return messages
    .filter((m) => !m.hint && !arrived.has(m.id) && checkState(s, m.when))
    .sort((a, b) => a.order - b.order);
}

export function dueCorrections(events: readonly CorrectionEvent[], s: ConditionState): CorrectionEvent[] {
  return events.filter((e) => !s.corrections.includes(e.id) && checkState(s, e.trigger));
}

export function dueShifts(shifts: readonly RealityShift[], s: ConditionState): RealityShift[] {
  return shifts.filter((x) => !s.shifts.includes(x.id) && checkState(s, x.when)).sort((a, b) => a.order - b.order);
}

// ── 현실 층 ─────────────────────────────────────────────────────
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

/** 현실 이동이 적용된 레코드. 표식을 남기지 않는다. */
export function recordView(rec: DbRecord, layers: RealityLayers, applied: RealityApplied): DbRecord {
  let out = rec;
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

/** 지금 현실의 배정 헤더(일시 #### → 복원된 날짜). */
export function assignmentHeader(a: Assignment, layers: RealityLayers, applied: RealityApplied): Assignment['header'] {
  let header = a.header;
  for (const sh of appliedIn(layers.shifts, applied.shifts))
    for (const r of sh.assignmentRewrites ?? [])
      if (r.assignmentId === a.id)
        header = header.map((h) => {
          const nv = r.header.find((x) => x.key === h.key);
          return nv ? { ...h, value: nv.value } : h;
        });
  return header;
}

/** 지금 현실의 종결 보고서(콘텐츠). */
export function closedReportView(r: ClosedReport, layers: RealityLayers, applied: RealityApplied): ClosedReport {
  let out = r;
  for (const sh of appliedIn(layers.shifts, applied.shifts))
    for (const w of sh.closedRewrites ?? [])
      if (w.reportId === r.id)
        out = {
          ...out,
          ...(w.verdict !== undefined ? { verdict: w.verdict } : {}),
          ...(w.classification !== undefined ? { classification: w.classification } : {}),
          ...(w.note !== undefined ? { note: w.note } : {}),
        };
  return out;
}

// ── 힌트 사다리(메신저만) ─────────────────────────────────────────
export type HintLevel = 'off' | 'normal' | 'detailed';
/** 첫 침묵(초): 사다리가 켜진 뒤 이 시간 전에는 아무것도 보내지 않는다 */
export const HINT_SILENCE_SECONDS = 20;

export interface HintState {
  /** 사다리 id → 보낸 단 수 */
  sent: Record<Id, number>;
  /** 사다리 id → 실패 수 */
  fails: Record<Id, number>;
}

export function emptyHints(): HintState {
  return { sent: {}, fails: {} };
}

/** 지금 켜진 사다리(order 순) */
export function activeLadders(ladders: readonly HintLadder[], s: ConditionState): HintLadder[] {
  return ladders
    .filter((l) => checkState(s, l.activeWhen) && !checkState(s, l.doneWhen))
    .sort((a, b) => a.order - b.order);
}

/**
 * 방치 시간·실패 수로 보낼 다음 단(없으면 null). 보통: 단의 idle 초 / 자세히: 절반. 끔: 없음.
 * 한 번에 한 단만 오른다(스토어가 보낸 뒤 sent 를 올린다).
 */
export function nextHintStep(l: HintLadder, h: HintState, idleSeconds: number, level: HintLevel) {
  if (level === 'off') return null;
  const sent = h.sent[l.id] ?? 0;
  const step = l.steps[sent];
  if (!step) return null;
  const k = level === 'detailed' ? 0.5 : 1;
  const idleOk = idleSeconds >= Math.max(HINT_SILENCE_SECONDS, step.idle * k);
  const failOk = step.fails !== undefined && (h.fails[l.id] ?? 0) >= step.fails;
  return idleOk || failOk ? { index: sent, messageId: step.messageId } : null;
}

/** 끝까지 보낸 사다리 */
export const laddersDone = (ladders: readonly HintLadder[], h: HintState): Id[] =>
  ladders.filter((l) => (h.sent[l.id] ?? 0) >= l.steps.length).map((l) => l.id);
