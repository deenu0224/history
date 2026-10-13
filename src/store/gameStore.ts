/**
 * 결록 단말 스토어(v4 「근무」, Zustand). 진행 상태 + 액션. core 를 호출해 상태를 바꾼다. 설계: docs/DESIGN_V4.md.
 *
 * 페이퍼 플리즈식 밤 근무 3개. 책상(업무 앱) = 왼쪽 기록 카드 + 오른쪽 관측 + 도장(확인·정정, 서랍의 불일치) + 프린터(규정·경고장·근무 보고).
 * 앱 4개는 그대로: 업무(책상·보고서·종결된 보고서) · 관측(장면·관측기 로그 재생) · DB 검색 · 메신저.
 * 상태가 바뀔 때마다 syncState() 가 메시지 도착, 좌표 재계산(소실 진행), 현실 이동(복원)을 반영한다(순수 함수).
 *
 * ── UI 계약(요약, 세부는 DESIGN_V4 §8) ─────────────────────────────
 *  근무   startDuty(id) · nextCase() · endDuty() · markRulesRead()
 *  건     inspect(recordSegId, observedSegId) → InspectResult    (기록 낱말 → 관측 낱말: 빨간 실 / 노란 깜빡임 / 없음)
 *         stampCase('confirm'|'correct'|'mismatch'|'auto_close') → CaseStampResult  (경고장은 result.warning)
 *  면담   finishInterview(choiceId?)       (경고 3장 → 관측 권한 정지 → 면담 → 계속)
 *  재생   openReplay(windowId) → ReplayResult · endObservation()   (관측기 로그의 종결 건 재생: 근무 시간을 쓴다)
 *  관측   startObservation(timelineId) · scrubObservation(m) · reportView(snapshot) · hearLine(lineId) · tapHotspot(id)
 *  필름   captureFrame(snapshot) — 지금 관측이 책상 위 건이면 그 건의 근거 프레임(규정 4조), 종결 건 재생이면 필름(최대 6장)
 *         replaceFrame(index, snapshot) · removeFrame(frameId)
 *  보고서 attach · detach · setYear · submitReport · stampReport(=위원회 직송 제출)
 *  DB     search(query) · openRecord(id)      메신저 readMessage · chooseReply      힌트 tickIdle · reportFail
 *  연출   recentRewrites / recentSlips → UI 연출 뒤 ackRewrites() / ackSlips()
 */
import { create } from 'zustand';
import type { ModalKind } from '@/core/bus';
import { indexContent, type ContentIndex } from '@/core/content';
import {
  clampMinute,
  findLine,
  inSpans,
  lineActiveAt,
  npcRoute,
  timelineTicks,
  viewerFrame,
  type NpcRoute,
  type TimelineTick,
  type ViewerFrame,
} from '@/core/observation';
import {
  MAX_FRAMES,
  cluesOfFrames,
  emptyDraft,
  frameClues,
  judgeReport,
  reportBaseClues,
  blankClues,
  sameRef,
  type AttachmentRef,
  type Frame,
  type ReportDraft,
  type ReportResult,
  type ReportWorld,
  type ViewerSnapshot,
} from '@/core/report';
import { impliedRange } from '@/core/chronology';
import { freshV5, loadGame, saveGame, type PersistedState, type SaveFile, type SaveSlot, type Settings } from '@/core/save';
import { NO_ARTICLE_TEXT, searchIndex, searchMessage, type MatchKind, type SearchStatus } from '@/core/search';
import {
  activeLadders,
  assignmentHeader,
  checkState,
  closedReportView,
  dueCorrections,
  dueMessages,
  dueShifts,
  isAppUnlocked,
  laddersDone,
  messageText,
  messageView,
  nextHintStep,
  recordView,
  searchResultsView,
  unlockedApps,
  type ConditionState,
  type RealityLayers,
} from '@/core/terminal';
import {
  OFFICER_ENGRAVING,
  STAMP_NAMES,
  SUSPEND_AT,
  activeRules,
  caseDone,
  clockText,
  derivedExpected,
  dutyClock,
  dutyCounters,
  frameShows,
  inspectRelation,
  judgeStamp,
  liveWarnings,
  nextLoadable,
  observedAvailable,
  observedOfSegment,
  originalText,
  recordSegments,
  pendingCases,
  queueExhausted,
  replayWindow,
  ruleEnabled,
  ruleWith,
  shiftReport,
  shownSegments,
  type CaseProgress,
  type DutyState,
  type InspectLink,
  type InspectRelation,
  type ShiftReport,
  type ShownSegment,
  type WarningSlip,
} from '@/core/duty';
import type {
  AppId,
  Assignment,
  BlankKey,
  CaseDef,
  CaseStamp,
  ContentBundle,
  DbRecord,
  FailKind,
  FlagValue,
  Gloss,
  Grants,
  Id,
  Message,
  PlayStats,
  Provenance,
  ReplayWindow,
  RewriteEntry,
  RuleDef,
  SearchResultRef,
  SourceRef,
  WorkShift,
} from '@/core/types';
import { BLANK_KEYS } from '@/core/types';
import { content as defaultContent } from '@/data';
import { GLOSSARY } from '@/data/glossary';

export type { Frame, ViewerSnapshot, AttachmentRef, ReportDraft, ReportResult } from '@/core/report';
export type { FailKind, CaseStamp } from '@/core/types';
export type { WarningSlip, ShiftReport, InspectRelation, ShownSegment } from '@/core/duty';

/** 이 배율(기준의 배수) 이상으로 화면에 있던 핫스팟을 '봤다'고 친다. 엿듣기 기본 minZoom 과 같다. */
export const INSPECT_ZOOM = 1.6;
export const DEFAULT_TIMELINE = 'tl_obs001';

export interface UiState {
  modal: { kind: ModalKind; id?: Id } | null;
  paused: boolean;
  app: AppId | null;
  appTarget?: Id;
  /** 지금 관측 중인 타임라인. window: 관측기 로그 재생 구간(이 밖으로 스크럽되지 않는다) */
  observation: { timelineId: Id; window?: { from: number; to: number } } | null;
}

export interface SearchHit {
  entryId: Id;
  match: MatchKind;
  term: string;
  results: SearchResultRef[];
  /** 말소된 기사: 결과 없음('해당 기사 없음'). 복원 뒤에는 false(표식 없음). */
  noArticle: boolean;
}

export interface SearchOutcome {
  query: string;
  normalized: string;
  status: SearchStatus | 'locked';
  hits: SearchHit[];
  message: string;
}

export interface TapResult {
  hotspotId: Id;
  targetId: Id;
  kind: 'object' | 'npc';
  label: string;
  minute: number;
  status: 'available' | 'outside_window';
  lines: { speaker?: string; text: string; provenance: Provenance; sources?: SourceRef[] }[];
}

export type CaptureStatus = 'captured' | 'replaced' | 'removed' | 'full' | 'degraded' | 'protected' | 'locked' | 'unknown';
export interface CaptureResult {
  status: CaptureStatus;
  /** case: 책상 위 건의 근거 프레임(규정 4조) · film: 종결 건 재생의 필름 */
  target?: 'case' | 'film';
  frame?: Frame;
  /** 이번에 새로 생긴 단서(필름 전체 기준) */
  newClues: Id[];
  /** 근거 프레임: 이 프레임이 담은 관측 대상(짚을 수 있는 말·대상) */
  shows?: Id[];
  message?: string;
}

export type AttachStatus = 'attached' | 'detached' | 'full' | 'already' | 'locked' | 'unknown';
export type FileStatus = 'filed' | 'not_ready' | 'already' | 'locked' | 'suspended';
export interface FileResult {
  status: FileStatus;
  shiftId?: Id;
  rewrites: RewriteEntry[];
  result?: ReportResult;
  /** 규정 5조 위반 경고장(복원되면 '해당 없음'으로 다시 쓰인다) */
  warning?: WarningSlip;
}

export type DutyStatus = 'started' | 'ended' | 'already' | 'locked' | 'blocked' | 'unknown';
export interface DutyResult {
  status: DutyStatus;
  message?: string;
  report?: ShiftReport & { line: string };
}

export type NextCaseStatus = 'loaded' | 'busy' | 'empty' | 'no_time' | 'suspended' | 'no_duty';
export interface NextCaseResult {
  status: NextCaseStatus;
  caseId?: Id;
  message?: string;
}

export interface InspectResult {
  status: 'linked' | 'unavailable' | 'not_current' | 'done' | 'suspended' | 'unknown';
  relation?: InspectRelation;
  recordSegId?: Id;
  observedSegId?: Id;
  /** notation: '표기 차이 — 판단은 대조관' */
  message?: string;
}

export type CaseStampStatus = 'stamped' | 'not_ready' | 'not_current' | 'already' | 'suspended' | 'unknown';
export interface CaseStampResult {
  status: CaseStampStatus;
  stamp?: CaseStamp;
  correct?: boolean;
  message?: string;
  warning?: WarningSlip;
  /** 정정이 맞으면 검증된 원문으로 복원 */
  restored?: { text: string; sources: SourceRef[] };
  /** lost/noise: 0.3초 뒤 덮이는 회색 자동 분류 문구 */
  autoClassification?: string;
  /** 경고 3장 → 관측 권한 정지(면담) */
  suspended?: boolean;
}

export type ReplayStatus = 'opened' | 'locked' | 'suspended' | 'no_time' | 'unknown';
export interface ReplayResult {
  status: ReplayStatus;
  window?: ReplayWindow;
  /** 쓴 근무 시간(분) */
  cost?: number;
  warning?: WarningSlip;
  message?: string;
}

export interface GameActions {
  openApp(app: AppId, target?: Id): boolean;
  closeApp(): void;
  // 근무
  startDuty(id: Id): DutyResult;
  nextCase(): NextCaseResult;
  inspect(recordSegId: Id, observedSegId: Id): InspectResult;
  stampCase(stamp: CaseStamp): CaseStampResult;
  openReplay(windowId: Id, caseId?: Id): ReplayResult;
  finishInterview(choiceId?: Id): boolean;
  endDuty(): DutyResult;
  markRulesRead(): void;
  // 업무(배정·종결된 보고서)
  openAssignment(id: Id): boolean;
  openClosedReport(id: Id): boolean;
  // 관측
  startObservation(timelineId?: Id): boolean;
  scrubObservation(minute: number): number;
  endObservation(): void;
  reportView(snapshot: ViewerSnapshot): void;
  hearLine(lineId: Id): boolean;
  tapHotspot(hotspotId: Id): TapResult | null;
  // 필름
  captureFrame(snapshot: ViewerSnapshot): CaptureResult;
  replaceFrame(index: number, snapshot: ViewerSnapshot): CaptureResult;
  removeFrame(frameId: Id): CaptureResult;
  // 보고서
  attach(blank: BlankKey, ref: AttachmentRef, reportId?: Id): AttachStatus;
  detach(blank: BlankKey, ref: AttachmentRef, reportId?: Id): AttachStatus;
  setYear(from: number | undefined, to: number | undefined, reportId?: Id): void;
  submitReport(reportId?: Id): ReportResult | null;
  stampReport(reportId?: Id): FileResult;
  // DB
  search(query: string): SearchOutcome;
  openRecord(id: Id): DbRecord | null;
  // 메신저
  readMessage(id: Id): Message | null;
  chooseReply(messageId: Id, choiceId: Id): boolean;
  // 힌트(메신저)
  tickIdle(seconds: number): Message | null;
  reportFail(kind: FailKind): void;
  ackRewrites(): void;
  ackSlips(): void;
  // 기타
  setFlag(flag: string, value?: FlagValue): void;
  openModal(kind: ModalKind, id?: Id): void;
  closeModal(): void;
  setPaused(paused: boolean): void;
  updateSettings(patch: Partial<Settings>): void;
  save(slot?: SaveSlot): Promise<SaveFile>;
  load(slot?: SaveSlot): Promise<boolean>;
  reset(): void;
}

export interface GameState extends PersistedState, GameActions {
  ui: UiState;
  lastSearch: SearchOutcome | null;
  lastTap: TapResult | null;
  /** 보고서 id → 마지막 제출 판정 */
  lastReport: Record<Id, ReportResult>;
  lastSavedAt: string | null;
  /** 방금 일어난 다시 쓰기(말소·복원). UI 연출 뒤 ackRewrites(). 저장되지 않음. */
  recentRewrites: RewriteEntry[];
  /** 방금 프린터가 뱉은 경고장. UI 연출 뒤 ackSlips(). 저장되지 않음. */
  recentSlips: WarningSlip[];
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 1,
  volume: 0.8,
  showProvenance: false,
  hintLevel: 'normal',
  haptics: true,
  reduceFlicker: false,
};

const SEARCH_LOG_MAX = 200;

export function initialPersisted(): PersistedState {
  return { ...freshV5(), settings: { ...DEFAULT_SETTINGS } };
}

export const PERSISTED_KEYS = Object.keys(initialPersisted()) as (keyof PersistedState)[];

export function pickPersisted(s: PersistedState): PersistedState {
  const out = {} as Record<keyof PersistedState, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = s[k];
  return structuredClone(out) as PersistedState;
}

const addUnique = <T>(list: readonly T[], v: T): T[] => (list.includes(v) ? (list as T[]) : [...list, v]);
const addAll = <T>(list: readonly T[], vs: readonly T[]): T[] => {
  let out = list as T[];
  for (const v of vs) out = addUnique(out, v);
  return out;
};

const layersOf = (c: ContentBundle): RealityLayers => ({ corrections: c.corrections, shifts: c.shifts });
const casesById = (c: ContentBundle) => Object.fromEntries(c.cases.map((x) => [x.id, x])) as Record<Id, CaseDef>;

/** 처리한 소실·노이즈 건의 배정(= v3 의 '종결된 배정') */
function closedAssignments(s: PersistedState, c: ContentBundle): Id[] {
  return [...new Set(c.cases.filter((x) => x.assignmentId && caseDone(s.duty, x.id)).map((x) => x.assignmentId!))];
}

/** 조건 판정용 상태(프레임 단서·종결·끝난 힌트·근무 카운터를 계산해 넣는다). */
export function conditionState(s: PersistedState, c: ContentBundle = defaultContent): ConditionState {
  return {
    flags: s.flags,
    searched: s.searched,
    recordsOpened: s.recordsOpened,
    read: s.read,
    appsOpened: s.appsOpened,
    heard: s.heard,
    seen: s.seen,
    clues: cluesOfFrames(s.frames),
    stamped: [],
    closed: closedAssignments(s, c),
    opened: s.opened,
    corrections: s.corrections,
    shifts: s.shifts,
    filed: s.filed,
    hintsDone: laddersDone(c.hints, s.hints),
    stats: s.stats,
    duties: s.duty.started,
    dutiesEnded: s.duty.ended,
    cases: Object.keys(s.duty.cases).filter((id) => caseDone(s.duty, id)),
    current: s.duty.current,
    counters: dutyCounters(s.duty, c.workShifts, casesById(c)),
    reached: s.obsReached,
  };
}

/** 획득(플래그·검색어 칩) 적용. 바뀌지 않으면 같은 객체. */
export function applyGrants(s: PersistedState, g?: Grants): PersistedState {
  if (!g) return s;
  let out = s;
  for (const f of g.flags ?? []) if (out.flags[f] !== true) out = { ...out, flags: { ...out.flags, [f]: true } };
  const terms = addAll(out.terms, (g.terms ?? []).map((t) => t.trim()).filter(Boolean));
  if (terms !== out.terms) out = { ...out, terms };
  return out;
}

export const recordSummary = (r: DbRecord) => r.fields.map((f) => `${f.label}: ${f.value}`).join('\n');

function closedVisible(s: PersistedState, c: ContentBundle) {
  const cs = conditionState(s, c);
  return c.closedReports.filter((r) => checkState(cs, r.showWhen));
}

const activeShift = (s: PersistedState, c: ContentBundle): WorkShift | undefined =>
  s.duty.active ? c.workShifts.find((w) => w.id === s.duty.active) : undefined;

/** 지금 단말 시계('HH:MM'). 근무 중이 아니면 마지막 근무의 시계. */
export function terminalClock(s: PersistedState, c: ContentBundle = defaultContent): string | undefined {
  const id = s.duty.active ?? s.duty.ended[s.duty.ended.length - 1];
  const w = id ? c.workShifts.find((x) => x.id === id) : undefined;
  return w ? clockText(w, dutyClock(s.duty, w.id)) : undefined;
}

/** 새벽 좌표 재계산(소실 진행) 하나를 적용 */
function applyCorrection(s: PersistedState, id: Id, idx: ContentIndex) {
  const e = idx.corrections[id]!;
  const log: RewriteEntry[] = [];
  const held = cluesOfFrames(s.frames);
  const spans = e.degrade.filter((d) => !d.clue || held.includes(d.clue)).map((d) => ({ from: d.from, to: d.to }));
  let state: PersistedState = { ...s, corrections: [...s.corrections, id], degraded: [...s.degraded, ...spans] };
  const fmtSpans = (xs: { from: number; to: number }[]) => xs.map((x) => `${x.from}-${x.to}`).join(',');
  if (spans.length)
    log.push({ seq: s.rewriteLog.length, sourceId: id, tone: 'erase', kind: 'observation', targetId: DEFAULT_TIMELINE, before: fmtSpans(s.degraded), after: fmtSpans(state.degraded) });
  state = applyGrants(state, e.grants);
  return { state: { ...state, rewriteLog: [...state.rewriteLog, ...log] }, log };
}

/** 현실 이동(복원) 하나를 적용: 플레이어가 본 적 있는 것만 다시 쓰기 기록에 남긴다. */
function applyShift(s: PersistedState, id: Id, c: ContentBundle, idx: ContentIndex) {
  const sh = idx.shifts[id]!;
  const layers = layersOf(c);
  let after: PersistedState = { ...s, shifts: [...s.shifts, id] };
  const log: RewriteEntry[] = [];
  const entry = (kind: RewriteEntry['kind'], targetId: Id, before: string, aft: string): RewriteEntry => ({
    seq: s.rewriteLog.length + log.length,
    sourceId: id,
    tone: 'restore',
    kind,
    targetId,
    before,
    after: aft,
  });
  for (const r of sh.messageRewrites) {
    const m = idx.messages[r.messageId];
    if (!m || !s.inbox.includes(m.id)) continue;
    const b = messageText(m, layers, s);
    if (b !== r.newText) log.push(entry('message', m.id, b, r.newText));
  }
  for (const r of sh.recordRewrites) {
    const rec = idx.records[r.recordId];
    if (!rec) continue;
    const b = recordSummary(recordView(rec, layers, s));
    const a = recordSummary(recordView(rec, layers, after));
    if (a !== b) log.push(entry('record', rec.id, b, a));
  }
  for (const r of sh.searchRewrites ?? [])
    if (s.searched.includes(r.entryId)) {
      const e = idx.searchEntries[r.entryId];
      if (!e) continue;
      const b = searchResultsView(e, layers, s);
      log.push(entry('search', e.id, b.noArticle ? (e.noArticleText ?? NO_ARTICLE_TEXT) : `${b.results.length}건`, `${r.results.length}건`));
    }
  for (const r of sh.assignmentRewrites ?? []) {
    const a = idx.assignments[r.assignmentId];
    if (!a) continue;
    const fmt = (h: Assignment['header']) => h.map((x) => `${x.label}: ${x.value}`).join('\n');
    const b = fmt(assignmentHeader(a, layers, s));
    const aa = fmt(assignmentHeader(a, layers, after));
    if (b !== aa) log.push(entry('assignment', a.id, b, aa));
  }
  const visible = new Set(closedVisible(s, c).map((r) => r.id));
  for (const r of sh.closedRewrites ?? []) {
    const cr = idx.closedReports[r.reportId];
    if (!cr || !visible.has(cr.id)) continue;
    const fmt = (x: typeof cr) => `판정: ${x.verdict}\n분류: ${x.classification}\n소견: ${x.note}`;
    const b = fmt(closedReportView(cr, layers, s));
    const aa = fmt(closedReportView(cr, layers, after));
    if (b !== aa) log.push(entry('closed', cr.id, b, aa));
  }
  for (const r of sh.caseRewrites ?? []) {
    const cd = idx.cases[r.caseId];
    if (cd && r.detection && s.duty.cases[cd.id]) log.push(entry('case', cd.id, cd.detection ?? '', r.detection));
  }
  if (sh.voidWarnings?.length) {
    const warnings = after.duty.warnings.map((w) => {
      const v = sh.voidWarnings!.find((x) => x.ruleId === w.ruleId);
      if (!v || w.voided) return w;
      log.push(entry('warning', w.id, w.reason, v.text));
      return { ...w, voided: true, voidText: v.text };
    });
    after = { ...after, duty: { ...after.duty, warnings } };
  }
  if (sh.clearDegraded && after.degraded.length) {
    log.push(entry('observation', DEFAULT_TIMELINE, after.degraded.map((x) => `${x.from}-${x.to}`).join(','), ''));
    after = { ...after, degraded: [] };
  }
  const state = applyGrants(after, sh.unlocks);
  return { state: { ...state, rewriteLog: [...state.rewriteLog, ...log] }, log };
}

/** 조건으로 생기는 일(메시지 도착, 좌표 재계산, 현실 이동)을 변화가 없을 때까지 반영(순수). */
export function syncState(s0: PersistedState, c: ContentBundle, idx: ContentIndex) {
  let s = s0;
  const arrived: Id[] = [];
  const corrected: Id[] = [];
  const shifted: Id[] = [];
  const rewrites: RewriteEntry[] = [];
  for (let guard = 0; guard < 24; guard++) {
    let changed = false;
    for (const e of dueCorrections(c.corrections, conditionState(s, c))) {
      const r = applyCorrection(s, e.id, idx);
      s = r.state;
      rewrites.push(...r.log);
      corrected.push(e.id);
      changed = true;
    }
    for (const sh of dueShifts(c.shifts, conditionState(s, c))) {
      const r = applyShift(s, sh.id, c, idx);
      s = r.state;
      rewrites.push(...r.log);
      shifted.push(sh.id);
      changed = true;
    }
    for (const m of dueMessages(c.messages, conditionState(s, c), new Set(s.inbox))) {
      const clock = terminalClock(s, c);
      s = applyGrants({ ...s, inbox: [...s.inbox, m.id], arrivedAt: clock ? { ...s.arrivedAt, [m.id]: clock } : s.arrivedAt }, m.grants);
      arrived.push(m.id);
      changed = true;
    }
    if (!changed) break;
  }
  return { state: s, arrived, corrected, shifted, rewrites };
}

const freshUi = (): UiState => ({ modal: null, paused: false, app: null, observation: null });
const freshTransient = () => ({
  ui: freshUi(),
  lastSearch: null,
  lastTap: null,
  lastReport: {} as Record<Id, ReportResult>,
  recentRewrites: [] as RewriteEntry[],
  recentSlips: [] as WarningSlip[],
});

/** 근무 보고의 오 실장 한 줄(조건이 맞는 첫 줄) */
function reportLine(shift: WorkShift, s: PersistedState, c: ContentBundle): string {
  const cs = conditionState(s, c);
  return shift.reportLines.find((l) => checkState(cs, l.when))?.text ?? '';
}

export function createGameStore(content: ContentBundle = defaultContent) {
  const idx = indexContent(content);
  const cases = casesById(content);
  const initial = syncState(initialPersisted(), content, idx).state;
  const mainReport = () => content.reports[0]?.id ?? '';

  return create<GameState>()((set, get) => {
    const persisted = () => pickPersisted(get());
    const cs = () => conditionState(get(), content);
    const apply = (next: PersistedState) => {
      const r = syncState(next, content, idx);
      // 영속 키만 쓴다(호출부가 옛 ui 등 일시 상태를 섞어 넘겨도 덮어쓰지 않는다)
      const extra: Partial<GameState> = {};
      for (const k of PERSISTED_KEYS) (extra as Record<string, unknown>)[k] = r.state[k];
      if (r.rewrites.length) extra.recentRewrites = [...get().recentRewrites, ...r.rewrites];
      set(extra);
      return r;
    };
    const bumpStats = (stats: PlayStats, patch: Partial<Record<keyof PlayStats, number>>) => {
      const out = { ...stats };
      for (const [k, v] of Object.entries(patch)) out[k as keyof PlayStats] += v ?? 0;
      return out;
    };
    const bump = (patch: Partial<Record<keyof PlayStats, number>>, extra: Partial<PersistedState> = {}) => {
      const s = get();
      return apply({ ...s, ...extra, stats: bumpStats(s.stats, patch) });
    };
    const activeTimeline = () => {
      const o = get().ui.observation;
      return o ? idx.timelines[o.timelineId] : undefined;
    };
    const minuteNow = () => {
      const tl = activeTimeline() ?? idx.timelines[DEFAULT_TIMELINE];
      return tl ? (get().obsMinute[tl.id] ?? tl.initial) : 0;
    };
    const rulesNow = (s: PersistedState = get()): RuleDef[] => activeRules(content.workShifts, content.rules, s.duty.started);
    const currentCase = (): CaseDef | undefined => {
      const id = get().duty.current;
      return id ? cases[id] : undefined;
    };
    const progressOf = (id: Id): CaseProgress => get().duty.cases[id] ?? { openedAt: 0, links: [] };
    const world = (): ReportWorld => ({
      clues: content.clues,
      frames: get().frames,
      records: Object.fromEntries(content.records.map((r) => [r.id, recordView(r, layersOf(content), get())])),
      persons: idx.persons,
    });
    const reportUnlocked = (id: Id) => {
      const spec = idx.reports[id];
      return !!spec && checkState(cs(), spec.unlockWhen) && !get().filed.includes(id);
    };
    const draftOf = (id: Id): ReportDraft => get().reports[id] ?? emptyDraft();
    const setDraft = (id: Id, d: ReportDraft) => apply({ ...get(), reports: { ...get().reports, [id]: d } });
    const snapshotClean = (snap: ViewerSnapshot): ViewerSnapshot => ({
      minute: Math.round(snap.minute),
      centerTile: { x: snap.centerTile.x, y: snap.centerTile.y },
      zoom: snap.zoom,
      visibleHotspotIds: [...new Set(snap.visibleHotspotIds)],
      heardLineIds: [...new Set(snap.heardLineIds)].filter((l) => lineActiveAt(content.npcs, l, snap.minute, get().flags)),
      ...(snap.thumbDataUrl ? { thumbDataUrl: snap.thumbDataUrl } : {}),
    });
    /** 훼손 구간에서 찍힌, 다른 프레임으로 대신할 수 없는 핵심 프레임 */
    const isProtected = (f: Frame) => {
      const s = get();
      if (!s.degraded.length || !inSpans(f.minute, s.degraded)) return false;
      const keys = f.clueIds.filter((id) => idx.clues[id]?.key);
      return keys.some((k) => !s.frames.some((o) => o.id !== f.id && o.clueIds.includes(k)));
    };
    /** 종결 건 재생(필름)인가 */
    const filmContext = () => {
      const s = get();
      const tl = activeTimeline();
      if (!tl) return false;
      if (s.duty.replay) return cases[s.duty.replay.caseId]?.timelineId === tl.id;
      return false;
    };
    const deliverHint = (idle: number): Message | null => {
      const s = get();
      for (const l of activeLadders(content.hints, cs())) {
        const step = nextHintStep(l, s.hints, idle, s.settings.hintLevel);
        if (!step) continue;
        const hints = { ...s.hints, sent: { ...s.hints.sent, [l.id]: step.index + 1 } };
        const inbox = addUnique(s.inbox, step.messageId);
        const clock = terminalClock(s, content);
        apply({ ...s, hints, inbox, arrivedAt: clock ? { ...s.arrivedAt, [step.messageId]: clock } : s.arrivedAt });
        return idx.messages[step.messageId] ?? null;
      }
      return null;
    };
    /** 경고장 한 장을 뽑는다. 살아 있는 경고가 SUSPEND_AT 이면 관측 권한 정지. */
    const issueWarning = (duty: DutyState, w: Omit<WarningSlip, 'id' | 'seq' | 'dutyId'>): { duty: DutyState; slip: WarningSlip } => {
      const slip: WarningSlip = { ...w, id: `warn_${duty.warnings.length + 1}`, seq: duty.warnings.length + 1, dutyId: duty.active ?? '' };
      let next: DutyState = { ...duty, warnings: [...duty.warnings, slip] };
      if (!next.suspended && liveWarnings(next, next.active ?? undefined).length >= SUSPEND_AT) {
        const open = liveWarnings(next, next.active ?? undefined).map((x) => x.id);
        next = {
          ...next,
          suspended: true,
          replay: null,
          interviews: [...next.interviews, { seq: next.interviews.length + 1, dutyId: next.active ?? '', slipIds: open, done: false }],
        };
      }
      return { duty: next, slip };
    };
    const pushSlip = (slip: WarningSlip) => set({ recentSlips: [...get().recentSlips, slip] });
    const minuteSpend = (duty: DutyState, minutes: number): DutyState => {
      const id = duty.active;
      return id ? { ...duty, clock: { ...duty.clock, [id]: dutyClock(duty, id) + minutes } } : duty;
    };
    const markReached = (s: PersistedState, tlId: Id, m: number): PersistedState =>
      (s.obsReached[tlId] ?? -1) >= m ? s : { ...s, obsReached: { ...s.obsReached, [tlId]: m } };

    const actions: GameActions = {
      openApp(app, target) {
        if (!isAppUnlocked(content.apps, app, cs())) return false;
        set((s) => ({ ui: { ...s.ui, app, appTarget: target } }));
        if (!get().appsOpened.includes(app)) apply({ ...get(), appsOpened: [...get().appsOpened, app] });
        return true;
      },
      closeApp: () => set((s) => ({ ui: { ...s.ui, app: null, appTarget: undefined } })),

      // ── 근무 ──
      startDuty(id) {
        const w = content.workShifts.find((x) => x.id === id);
        const s = get();
        if (!w) return { status: 'unknown' };
        if (s.duty.started.includes(id)) return { status: 'already' };
        const prev = content.workShifts.filter((x) => x.no < w.no);
        if (s.duty.active || prev.some((x) => !s.duty.ended.includes(x.id))) return { status: 'locked' };
        apply({ ...s, duty: { ...s.duty, active: id, started: [...s.duty.started, id], clock: { ...s.duty.clock, [id]: 0 }, current: null } });
        return { status: 'started' };
      },
      nextCase() {
        const s = get();
        const w = activeShift(s, content);
        if (!w) return { status: 'no_duty' };
        if (s.duty.suspended) return { status: 'suspended', message: '관측 권한 정지 중. 면담이 먼저다.' };
        if (s.duty.current) return { status: 'busy', caseId: s.duty.current };
        const next = nextLoadable(w, s.duty, cases);
        if (!next) return pendingCases(w, s.duty).length ? { status: 'no_time', message: '남은 근무 시간에 이 건은 들어가지 않는다.' } : { status: 'empty' };
        const c = cases[next]!;
        const progress: CaseProgress = s.duty.cases[next] ?? { openedAt: dutyClock(s.duty, w.id), links: [] };
        let st: PersistedState = { ...s, duty: { ...s.duty, current: next, replay: null, cases: { ...s.duty.cases, [next]: progress } } };
        if (c.assignmentId) st = { ...st, assignmentsOpened: addUnique(st.assignmentsOpened, c.assignmentId), flags: { ...st.flags, [`${c.assignmentId}_opened`]: true } };
        apply(st);
        set((x) => ({ ui: { ...x.ui, observation: null } }));
        return { status: 'loaded', caseId: next };
      },
      inspect(recordSegId, observedSegId) {
        const s = get();
        const c = currentCase();
        if (!c) return { status: 'not_current' };
        if (s.duty.suspended) return { status: 'suspended' };
        if (caseDone(s.duty, c.id)) return { status: 'done' };
        const recOk = recordSegments(c).some((x) => x.id === recordSegId);
        const obs = observedOfSegment(c, observedSegId);
        if (!recOk || !obs) return { status: 'unknown' };
        if (!observedAvailable(obs, s)) return { status: 'unavailable', message: obs.kind === 'line' ? '아직 들은 말이 아니다.' : '아직 본 대상이 아니다.' };
        const relation = inspectRelation(c, recordSegId, observedSegId);
        const p = progressOf(c.id);
        const link: InspectLink = { record: recordSegId, observed: observedSegId, relation };
        const links = p.links.some((l) => l.record === recordSegId && l.observed === observedSegId) ? p.links : [...p.links, link];
        bump({ inspects: 1 }, { duty: { ...s.duty, cases: { ...s.duty.cases, [c.id]: { ...p, links } } } });
        if (relation === 'none') actions.reportFail('inspect_none');
        return {
          status: 'linked',
          relation,
          recordSegId,
          observedSegId,
          message: relation === 'notation' ? '표기 차이 — 판단은 대조관' : relation === 'differs' ? '다르다' : undefined,
        };
      },
      stampCase(stamp) {
        const s = get();
        const c = currentCase();
        if (!c) return { status: 'not_current' };
        if (s.duty.suspended) return { status: 'suspended', message: '관측 권한 정지 중. 면담이 먼저다.' };
        if (caseDone(s.duty, c.id)) return { status: 'already' };
        const rules = rulesNow();
        const decision = judgeStamp({
          c,
          stamp,
          progress: progressOf(c.id),
          memory: s,
          rules,
          ready: checkState(cs(), c.readyWhen),
          mismatchRule: rules.find((r) => r.id === 'rule_3'),
        });
        if (decision.status === 'not_ready') {
          bump({ stampMisses: 1 });
          actions.reportFail('case_not_ready');
          return { status: 'not_ready', stamp, message: decision.message };
        }
        let duty: DutyState = {
          ...s.duty,
          current: null,
          replay: null,
          cases: { ...s.duty.cases, [c.id]: { ...progressOf(c.id), stamp, correct: decision.correct, doneAt: dutyClock(s.duty, s.duty.active ?? '') + c.minutes } },
        };
        duty = minuteSpend(duty, c.minutes);
        let slip: WarningSlip | undefined;
        if (decision.warning) {
          const r = issueWarning(duty, { caseId: c.id, ruleId: decision.warning.ruleId, reason: decision.warning.reason });
          duty = r.duty;
          slip = r.slip;
        }
        // 건마다 '<건>_<도장>' 플래그. 첫 좌표 손상 건(근무 1)은 closed_mismatch / closed_match 도 남긴다(메시지 분기).
        let flags: PersistedState['flags'] = { ...s.flags, [`${c.id}_${stamp}`]: true };
        if (c.kind === 'lost' && !s.flags.closed_mismatch && !s.flags.closed_match)
          flags = { ...flags, [stamp === 'mismatch' ? 'closed_mismatch' : 'closed_match']: true };
        bump({ stamps: 1 }, { duty, flags });
        set((x) => ({ ui: { ...x.ui, observation: null } }));
        if (slip) pushSlip(slip);
        const assignment = c.assignmentId ? idx.assignments[c.assignmentId] : undefined;
        return {
          status: 'stamped',
          stamp,
          correct: decision.correct,
          warning: slip,
          suspended: get().duty.suspended || undefined,
          restored: decision.restored && c.record ? { text: originalText(c), sources: c.record.sources } : undefined,
          autoClassification: c.kind !== 'routine' ? assignment?.autoClassification ?? '자동 분류: 관측 오류(장비 노이즈) · 종결' : undefined,
        };
      },
      openReplay(windowId, caseId) {
        const s = get();
        const w = activeShift(s, content);
        const lost = caseId
          ? cases[caseId]
          : content.cases.find((x) => x.replay?.windows.some((y) => y.id === windowId) && caseDone(s.duty, x.id));
        const win = lost && replayWindow(lost, windowId);
        if (!w || !lost || !win || !lost.timelineId) return { status: 'unknown' };
        if (s.duty.suspended) return { status: 'suspended', message: '관측 권한 정지 중. 면담이 먼저다.' };
        if (!caseDone(s.duty, lost.id) || !replayAllowed(s)) return { status: 'locked' };
        const cost = lost.replay!.minutes;
        if (dutyClock(s.duty, w.id) + cost > w.length) return { status: 'no_time', message: '남은 근무 시간이 모자란다.' };
        let duty = minuteSpend({ ...s.duty, replay: { caseId: lost.id, windowId }, current: s.duty.current }, cost);
        duty = { ...duty, replays: [...duty.replays, { seq: duty.replays.length + 1, dutyId: w.id, caseId: lost.id, windowId, at: dutyClock(s.duty, w.id) }] };
        let slip: WarningSlip | undefined;
        const noReopen = ruleWith(rulesNow(), 'no_reopen');
        if (noReopen) {
          const r = issueWarning(duty, { caseId: lost.id, ruleId: noReopen.id, reason: noReopen.violation ?? '규정 위반.' });
          duty = r.duty;
          slip = r.slip;
        }
        const tl = idx.timelines[lost.timelineId]!;
        const m = Math.max(win.from, Math.min(win.to, s.obsMinute[tl.id] ?? win.from));
        apply(markReached({ ...s, duty, obsMinute: { ...s.obsMinute, [tl.id]: m } }, tl.id, m));
        if (slip) pushSlip(slip);
        if (get().duty.suspended) return { status: 'suspended', warning: slip, message: '관측 권한 정지 중. 면담이 먼저다.' };
        set((x) => ({ ui: { ...x.ui, observation: { timelineId: tl.id, window: { from: win.from, to: win.to } } } }));
        return { status: 'opened', window: win, cost, warning: slip };
      },
      finishInterview(choiceId) {
        const s = get();
        if (!s.duty.suspended) return false;
        const iv = s.duty.interviews[s.duty.interviews.length - 1];
        const warnings = s.duty.warnings.map((w) => (iv?.slipIds.includes(w.id) ? { ...w, cleared: true } : w));
        const interviews = s.duty.interviews.map((x) => (x === iv ? { ...x, done: true, choice: choiceId } : x));
        const choice = content.interviews[0]?.choices.find((x) => x.id === choiceId);
        let flags = s.flags;
        for (const f of choice?.setsFlags ?? []) flags = { ...flags, [f]: true };
        apply({ ...s, flags, duty: { ...s.duty, suspended: false, warnings, interviews } });
        return true;
      },
      endDuty() {
        const s = get();
        const w = activeShift(s, content);
        if (!w) return { status: 'unknown' };
        if (s.duty.suspended) return { status: 'blocked', message: '면담이 먼저다.' };
        if (!queueExhausted(w, s.duty, cases)) return { status: 'blocked', message: '아직 처리할 건이 남았다.' };
        if (!checkState(cs(), w.endWhen)) return { status: 'blocked', message: w.endBlockedText ?? '아직 근무를 끝낼 수 없다.' };
        apply({ ...s, duty: { ...s.duty, active: null, current: null, replay: null, ended: [...s.duty.ended, w.id] } });
        set((x) => ({ ui: { ...x.ui, observation: null } }));
        const report = shiftReport(w, get().duty, cases);
        return { status: 'ended', report: { ...report, line: reportLine(w, get(), content) } };
      },
      markRulesRead() {
        const s = get();
        const ids = rulesNow().map((r) => r.id);
        const rulesRead = addAll(s.duty.rulesRead, ids);
        if (rulesRead !== s.duty.rulesRead) apply({ ...s, duty: { ...s.duty, rulesRead } });
      },

      // ── 업무 ──
      openAssignment(id) {
        if (!idx.assignments[id]) return false;
        const s = get();
        apply({ ...s, assignmentsOpened: addUnique(s.assignmentsOpened, id), flags: { ...s.flags, [`${id}_opened`]: true } });
        return true;
      },
      openClosedReport(id) {
        if (!closedVisible(get(), content).some((r) => r.id === id)) return false;
        if (!get().opened.includes(id)) apply({ ...get(), opened: [...get().opened, id] });
        return true;
      },

      // ── 관측 ──
      startObservation(timelineId) {
        const s = get();
        const cur = currentCase();
        const id = timelineId ?? cur?.timelineId ?? DEFAULT_TIMELINE;
        const tl = idx.timelines[id];
        if (!tl || !isAppUnlocked(content.apps, 'viewer', cs())) return false;
        if (s.duty.suspended) return false;
        // 사건 장면은 책상 위 건의 것만. 종결 건(관측기 로그)은 openReplay 로만 연다.
        const owner = content.cases.find((x) => x.timelineId === id);
        if (owner && owner.id !== cur?.id && !(s.duty.replay && cases[s.duty.replay.caseId]?.timelineId === id)) return false;
        const win = s.duty.replay ? replayWindow(cases[s.duty.replay.caseId]!, s.duty.replay.windowId) : undefined;
        const useWin = win && cases[s.duty.replay!.caseId]?.timelineId === id ? { from: win.from, to: win.to } : undefined;
        set((x) => ({ ui: { ...x.ui, observation: { timelineId: id, ...(useWin ? { window: useWin } : {}) } } }));
        const raw = s.obsMinute[tl.id] ?? tl.initial;
        const m = useWin ? Math.max(useWin.from, Math.min(useWin.to, raw)) : raw;
        apply(markReached({ ...s, obsMinute: { ...s.obsMinute, [tl.id]: m }, hoursVisited: addUnique(s.hoursVisited, Math.floor(m / 60)) }, tl.id, m));
        return true;
      },
      scrubObservation(minute) {
        const tl = activeTimeline();
        if (!tl) return NaN;
        const win = get().ui.observation?.window;
        let m = clampMinute(tl, minute);
        if (win) m = Math.max(win.from, Math.min(win.to, m));
        const s = get();
        if (s.obsMinute[tl.id] !== m)
          bump(
            { scrubs: 1 },
            markReached(
              { ...s, obsMinute: { ...s.obsMinute, [tl.id]: m }, hoursVisited: addUnique(s.hoursVisited, Math.min(18, Math.floor(m / 60))) },
              tl.id,
              m,
            ),
          );
        return m;
      },
      endObservation: () => {
        set((s) => ({ ui: { ...s.ui, observation: null } }));
        const s = get();
        if (s.duty.replay) apply({ ...s, duty: { ...s.duty, replay: null } });
      },
      reportView(snap) {
        const s = get();
        if (inSpans(snap.minute, s.degraded) && filmContext()) return;
        const hour = Math.min(18, Math.floor(snap.minute / 60));
        const seen = snap.zoom + 1e-6 >= INSPECT_ZOOM ? addAll(s.seen, snap.visibleHotspotIds) : s.seen;
        const hoursVisited = addUnique(s.hoursVisited, hour);
        if (seen !== s.seen || hoursVisited !== s.hoursVisited) apply({ ...s, seen, hoursVisited });
      },
      hearLine(lineId) {
        const s = get();
        const f = findLine(content.npcs, lineId);
        const m = minuteNow();
        if (!f || (inSpans(m, s.degraded) && activeTimeline()?.id === DEFAULT_TIMELINE) || !lineActiveAt(content.npcs, lineId, m, s.flags)) return false;
        if (s.heard.includes(lineId)) return true;
        apply(applyGrants({ ...s, heard: [...s.heard, lineId] }, f.line.grants));
        return true;
      },
      tapHotspot(hotspotId) {
        const tl = activeTimeline() ?? idx.timelines[DEFAULT_TIMELINE];
        const h = tl?.hotspots.find((x) => x.id === hotspotId || x.targetId === hotspotId);
        if (!tl || !h) return null;
        const s0 = get();
        const minute = s0.obsMinute[tl.id] ?? tl.initial;
        const frame = viewerFrame(tl, minute, content, s0.flags).hotspots.find((x) => x.id === h.id);
        if (!frame || frame.status === 'hidden' || (inSpans(minute, s0.degraded) && tl.id === DEFAULT_TIMELINE)) return null;
        bump({ taps: 1 }, { tapped: addUnique(s0.tapped, h.id) });
        let result: TapResult;
        if (h.kind === 'object') {
          const obj = idx.worldObjects[h.targetId]!;
          const open = frame.status === 'available';
          if (open) apply(applyGrants(get(), obj.grants));
          result = {
            hotspotId: h.id,
            targetId: obj.id,
            kind: 'object',
            label: obj.label,
            minute,
            status: frame.status,
            lines: (open ? obj.examine : [obj.hiddenText ?? '지금은 잘 보이지 않는다.']).map((text) => ({ text, provenance: obj.provenance, sources: obj.sources })),
          };
        } else {
          const npc = idx.npcs[h.targetId]!;
          const acts = npc.dialogue.filter((l) => !l.speaker && lineActiveAt(content.npcs, l.id, minute, s0.flags));
          result = {
            hotspotId: h.id,
            targetId: npc.id,
            kind: 'npc',
            label: npc.label,
            minute,
            status: frame.status,
            lines: acts.length
              ? acts.map((l) => ({ text: l.text, provenance: l.provenance, sources: l.sources }))
              : [{ text: '(가까이 확대하면 말이 들릴지도 모른다.)', provenance: 'fictional' }],
          };
        }
        set({ lastTap: result });
        return result;
      },

      // ── 필름 / 근거 프레임 ──
      captureFrame(snap) {
        const s = get();
        if (s.duty.suspended) return { status: 'locked', newClues: [], message: '관측 권한 정지 중.' };
        if (!ruleEnabled(rulesNow(), 'capture')) return { status: 'locked', newClues: [], message: '셔터가 아직 없다.' };
        const tl = activeTimeline();
        const cur = currentCase();
        const clean = snapshotClean(snap);
        if (tl && cur && cur.timelineId === tl.id && !filmContext()) {
          // 책상 위 건의 근거 프레임(한 장, 덮어쓰기)
          const p = progressOf(cur.id);
          const frame: Frame = { ...clean, id: `cf_${cur.id}_${s.stats.captures + 1}`, seq: s.stats.captures + 1, clueIds: [] };
          bump({ captures: 1 }, { duty: { ...s.duty, cases: { ...s.duty.cases, [cur.id]: { ...p, frame } } } });
          return { status: p.frame ? 'replaced' : 'captured', target: 'case', frame, newClues: [], shows: cur.observed.filter((o) => frameShows(frame, o)).map((o) => o.id) };
        }
        if (!filmContext()) return { status: 'locked', newClues: [], message: '지금은 찍을 장면이 없다.' };
        if (inSpans(snap.minute, s.degraded)) return { status: 'degraded', target: 'film', newClues: [], message: '이 구간은 흐려져 찍히지 않는다.' };
        if (s.frames.length >= MAX_FRAMES) {
          actions.reportFail('capture_full');
          return { status: 'full', target: 'film', newClues: [], message: '필름이 다 찼다. 한 장을 비우거나 덮어쓰자.' };
        }
        const before = cluesOfFrames(s.frames);
        const frame: Frame = { ...clean, id: `fr_${s.frameSeq + 1}`, seq: s.frameSeq + 1, clueIds: frameClues(clean, content.clues) };
        bump({ captures: 1 }, { frames: [...s.frames, frame], frameSeq: s.frameSeq + 1 });
        return { status: 'captured', target: 'film', frame, newClues: frame.clueIds.filter((c) => !before.includes(c)) };
      },
      replaceFrame(index, snap) {
        const s = get();
        const old = s.frames[index];
        if (!old) return actions.captureFrame(snap);
        if (!filmContext()) return { status: 'locked', newClues: [], message: '지금은 찍을 장면이 없다.' };
        if (inSpans(snap.minute, s.degraded)) return { status: 'degraded', target: 'film', newClues: [], message: '이 구간은 흐려져 찍히지 않는다.' };
        if (isProtected(old)) return { status: 'protected', target: 'film', newClues: [], message: '이 장면은 이제 다시 찍을 수 없다. 이 프레임은 버릴 수 없다.' };
        const clean = snapshotClean(snap);
        const frame: Frame = { ...clean, id: `fr_${s.frameSeq + 1}`, seq: s.frameSeq + 1, clueIds: frameClues(clean, content.clues) };
        const frames = s.frames.map((f, i) => (i === index ? frame : f));
        const before = cluesOfFrames(s.frames.filter((_, i) => i !== index));
        bump({ captures: 1 }, { frames, frameSeq: s.frameSeq + 1, reports: dropFrameRefs(s.reports, old.id) });
        return { status: 'replaced', target: 'film', frame, newClues: frame.clueIds.filter((c) => !before.includes(c)) };
      },
      removeFrame(frameId) {
        const s = get();
        const old = s.frames.find((f) => f.id === frameId);
        if (!old) return { status: 'unknown', newClues: [] };
        if (isProtected(old)) return { status: 'protected', target: 'film', newClues: [], message: '이 장면은 이제 다시 찍을 수 없다. 이 프레임은 버릴 수 없다.' };
        apply({ ...s, frames: s.frames.filter((f) => f.id !== frameId), reports: dropFrameRefs(s.reports, frameId) });
        return { status: 'removed', target: 'film', newClues: [] };
      },

      // ── 보고서 ──
      attach(blank, ref, reportId = mainReport()) {
        if (!reportUnlocked(reportId)) return 'locked';
        const s = get();
        if (ref.kind === 'frame' ? !s.frames.some((f) => f.id === ref.id) : !s.recordsOpened.includes(ref.id)) return 'unknown';
        const d = draftOf(reportId);
        const cur = d[blank].attachments;
        if (cur.some((x) => sameRef(x, ref))) return 'already';
        if (cur.length >= (idx.reports[reportId]?.maxAttachments ?? 2)) return 'full';
        setDraft(reportId, { ...d, [blank]: { ...d[blank], attachments: [...cur, ref] } });
        return 'attached';
      },
      detach(blank, ref, reportId = mainReport()) {
        if (!reportUnlocked(reportId)) return 'locked';
        const d = draftOf(reportId);
        const cur = d[blank].attachments;
        if (!cur.some((x) => sameRef(x, ref))) return 'unknown';
        setDraft(reportId, { ...d, [blank]: { ...d[blank], attachments: cur.filter((x) => !sameRef(x, ref)) } });
        return 'detached';
      },
      setYear(from, to, reportId = mainReport()) {
        if (!reportUnlocked(reportId)) return;
        const d = draftOf(reportId);
        setDraft(reportId, { ...d, when: { ...d.when, from, to } });
      },
      submitReport(reportId = mainReport()) {
        const spec = idx.reports[reportId];
        if (!spec || !reportUnlocked(reportId)) return null;
        const result = judgeReport(spec, draftOf(reportId), world());
        set((s) => ({ lastReport: { ...s.lastReport, [reportId]: result } }));
        bump({ reportSubmits: 1, reportFails: result.complete ? 0 : 1 });
        if (!result.complete) actions.reportFail('report_fail');
        return result;
      },
      stampReport(reportId = mainReport()) {
        const spec = idx.reports[reportId];
        if (!spec) return { status: 'locked', rewrites: [] };
        if (get().filed.includes(reportId)) return { status: 'already', rewrites: [] };
        if (!reportUnlocked(reportId)) return { status: 'locked', rewrites: [] };
        if (get().duty.suspended) return { status: 'suspended', rewrites: [] };
        const result = judgeReport(spec, draftOf(reportId), world());
        if (!result.complete) return { status: 'not_ready', rewrites: [], result };
        const s = get();
        // 이번 근무의 그 좌표 건(재탐지)은 보고서로 처리된다
        let duty = s.duty;
        const redetect = content.cases.find(
          (x) => x.assignmentId === spec.assignmentId && x.dutyId === duty.active && !caseDone(duty, x.id) && x.expected.includes('report'),
        );
        if (redetect)
          duty = {
            ...duty,
            current: duty.current === redetect.id ? null : duty.current,
            cases: { ...duty.cases, [redetect.id]: { ...(duty.cases[redetect.id] ?? { openedAt: dutyClock(duty, duty.active ?? ''), links: [] }), stamp: 'report', correct: true, doneAt: dutyClock(duty, duty.active ?? '') } },
          };
        let slip: WarningSlip | undefined;
        const noReopen = ruleWith(rulesNow(), 'no_reopen');
        if (noReopen) {
          // 위원회 직송은 규정 5조 위반으로 경고장이 먼저 나온다. 정지 계산 전에 복원이 지울 수 있게 살아 있는 수에는 넣지 않는다.
          slip = { id: `warn_${duty.warnings.length + 1}`, seq: duty.warnings.length + 1, dutyId: duty.active ?? '', caseId: redetect?.id, ruleId: noReopen.id, reason: noReopen.violation ?? '규정 위반.' };
          duty = { ...duty, warnings: [...duty.warnings, slip] };
        }
        const r = apply({ ...s, duty, filed: [...s.filed, reportId], stats: bumpStats(s.stats, { stamps: 1 }) });
        if (slip) {
          const now = get().duty.warnings.find((w) => w.id === slip!.id) ?? slip;
          pushSlip(now);
          slip = now;
          // 복원이 없었다면(데이터 오류) 그때만 정지 계산
          if (!now.voided && liveWarnings(get().duty, get().duty.active ?? undefined).length >= SUSPEND_AT) {
            const d = get().duty;
            apply({ ...get(), duty: { ...d, suspended: true, interviews: [...d.interviews, { seq: d.interviews.length + 1, dutyId: d.active ?? '', slipIds: liveWarnings(d, d.active ?? undefined).map((w) => w.id), done: false }] } });
          }
        }
        return { status: 'filed', shiftId: r.shifted.includes(spec.restores) ? spec.restores : undefined, rewrites: r.rewrites, result, warning: slip };
      },

      // ── DB ──
      search(query) {
        const s0 = get();
        if (!isAppUnlocked(content.apps, 'db', cs())) {
          const out: SearchOutcome = { query, normalized: '', status: 'locked', hits: [], message: 'DB 검색 권한이 아직 없다.' };
          set({ lastSearch: out });
          return out;
        }
        const res = searchIndex(content.searchEntries, query, (e) => checkState(cs(), e.requires));
        let grantsState: PersistedState = s0;
        const hits: SearchHit[] = res.matches.map(({ entry, match, term }) => {
          const view = searchResultsView(entry, layersOf(content), s0);
          grantsState = applyGrants(grantsState, entry.grants);
          return { entryId: entry.id, match, term, results: view.results, noArticle: view.noArticle };
        });
        const top = hits[0];
        const status: SearchStatus = top?.noArticle ? 'no_article' : res.status;
        const newIds = res.matches.map((m) => m.entry.id).filter((id) => !s0.searched.includes(id));
        const miss = res.status === 'unknown' || res.status === 'too_short';
        const log = [
          ...s0.searchLog,
          { seq: s0.stats.searches, query, normalized: res.normalized, status, entryIds: res.matches.map((m) => m.entry.id) },
        ].slice(-SEARCH_LOG_MAX);
        if (res.status !== 'empty')
          bump(
            { searches: 1, unknownSearches: miss ? 1 : 0 },
            { searchLog: log, searched: [...s0.searched, ...newIds], terms: grantsState.terms, flags: grantsState.flags },
          );
        if (miss) actions.reportFail('unknown_search');
        const topEntry = top && idx.searchEntries[top.entryId];
        const outcome: SearchOutcome = {
          query,
          normalized: res.normalized,
          status,
          hits,
          message:
            status === 'no_article'
              ? searchMessage(status, query, hits.filter((h) => !h.noArticle).length, 0, topEntry?.noArticleText)
              : searchMessage(status, query, hits.length, newIds.length),
        };
        set({ lastSearch: outcome });
        return outcome;
      },
      openRecord(id) {
        const rec = idx.records[id];
        if (!rec || !isAppUnlocked(content.apps, 'db', cs())) return null;
        if (!get().recordsOpened.includes(id)) apply({ ...get(), recordsOpened: [...get().recordsOpened, id] });
        return recordView(rec, layersOf(content), get());
      },

      // ── 메신저 ──
      readMessage(id) {
        const m = idx.messages[id];
        if (!m || !get().inbox.includes(id)) return null;
        if (!get().read.includes(id)) apply({ ...get(), read: [...get().read, id] });
        return messageView(m, layersOf(content), get());
      },
      chooseReply(messageId, choiceId) {
        const m = idx.messages[messageId];
        const s = get();
        const choice = m?.choices?.find((c) => c.id === choiceId);
        if (!m || !choice || !s.inbox.includes(messageId) || s.replies[messageId]) return false;
        const next = { ...s, replies: { ...s.replies, [messageId]: choiceId }, read: addUnique(s.read, messageId) };
        apply(applyGrants(next, { flags: choice.setsFlags }));
        return true;
      },

      // ── 힌트 ──
      tickIdle: (seconds) => deliverHint(seconds),
      reportFail(kind) {
        const s = get();
        const ladders = activeLadders(content.hints, cs()).filter((l) => l.failOn?.includes(kind));
        if (!ladders.length) return;
        const fails = { ...s.hints.fails };
        for (const l of ladders) fails[l.id] = (fails[l.id] ?? 0) + 1;
        set({ hints: { ...s.hints, fails } });
        deliverHint(0);
      },
      ackRewrites: () => set({ recentRewrites: [] }),
      ackSlips: () => set({ recentSlips: [] }),

      setFlag: (flag, value = true) => void apply({ ...get(), flags: { ...get().flags, [flag]: value } }),
      openModal: (kind, id) => set((s) => ({ ui: { ...s.ui, modal: { kind, id } } })),
      closeModal: () => set((s) => ({ ui: { ...s.ui, modal: null } })),
      setPaused: (paused) => set((s) => ({ ui: { ...s.ui, paused } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      async save(slot = 'manual') {
        const file = await saveGame(slot, persisted());
        set({ lastSavedAt: file.savedAt });
        return file;
      },
      async load(slot = 'manual') {
        const file = await loadGame(slot);
        if (!file) return false;
        const base = initialPersisted();
        const merged: PersistedState = {
          ...base,
          ...file.data,
          settings: { ...base.settings, ...file.data.settings },
          stats: { ...base.stats, ...file.data.stats },
          hints: { ...base.hints, ...file.data.hints },
          duty: { ...base.duty, ...file.data.duty },
        };
        set({ ...syncState(merged, content, idx).state, ...freshTransient(), lastSavedAt: file.savedAt });
        return true;
      },
      reset: () => set({ ...structuredClone(initial), ...freshTransient(), lastSavedAt: null }),
    };

    /** 종결 건 재생이 허용되는 근무인가(근무 1 에는 관측기 로그 재생이 없다) */
    function replayAllowed(s: PersistedState) {
      return s.duty.active !== content.workShifts[0]?.id;
    }

    return { ...structuredClone(initial), ...freshTransient(), lastSavedAt: null, ...actions };
  });
}

function dropFrameRefs(reports: Record<Id, ReportDraft>, frameId: Id): Record<Id, ReportDraft> {
  let changed = false;
  const out: Record<Id, ReportDraft> = {};
  for (const [id, d] of Object.entries(reports)) {
    const nd = { ...d } as ReportDraft;
    for (const k of BLANK_KEYS) {
      const atts = d[k].attachments.filter((a) => !(a.kind === 'frame' && a.id === frameId));
      if (atts.length !== d[k].attachments.length) {
        changed = true;
        (nd as unknown as Record<BlankKey, { attachments: AttachmentRef[] }>)[k] = { ...d[k], attachments: atts };
      }
    }
    out[id] = nd;
  }
  return changed ? out : reports;
}

export type GameStore = ReturnType<typeof createGameStore>;


// ── 셀렉터(순수) ────────────────────────────────────────────────
export function selectApps(s: PersistedState, c: ContentBundle = defaultContent): AppId[] {
  return unlockedApps(c.apps, conditionState(s, c));
}

/** 근무 id 의 상대 표기(오늘·어제·그저께) — 지금(또는 마지막) 근무 기준 */
function relativeNight(s: PersistedState, c: ContentBundle, dutyId: Id): string {
  const now = c.workShifts.find((w) => w.id === (s.duty.active ?? s.duty.ended[s.duty.ended.length - 1]));
  const then = c.workShifts.find((w) => w.id === dutyId);
  const d = (now?.no ?? 0) - (then?.no ?? 0);
  return d <= 0 ? '오늘' : d === 1 ? '어제' : '그저께';
}

// ── 책상(업무 앱) ───────────────────────────────────────────────
export interface StampImpression {
  stamp: CaseStamp;
  label: string;
  /** 모든 도장 자국 아래 작은 각인 */
  engraving: string;
  /** 1년 전 도장처럼 바랜 잉크 */
  faded?: boolean;
  /** 0.3초 뒤 덮이는 회색 시스템 도장(관측 오류 · 종결) */
  overlay?: string;
}

export interface CaseObservedView {
  id: Id;
  kind: 'line' | 'target';
  lineId?: Id;
  hotspotId?: Id;
  /** 들었거나 봤다 → 짚을 수 있다 */
  available: boolean;
  speaker?: string;
  provenance: Provenance;
  segments: { id: Id; text: string; gloss?: Gloss }[];
}

export interface CaseCardView {
  case: CaseDef;
  code: string;
  title: string;
  kind: CaseDef['kind'];
  /** 기록 카드 머리(실록식 날짜, 4자리 연도 없음) */
  citation?: string;
  /** 날짜 조각 + 문장 조각(보이는 글자, 변조면 바뀐 낱말). restored 면 원문 */
  dateSegments: ShownSegment[];
  segments: ShownSegment[];
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
  /** 정정이 맞아 검증된 원문으로 복원됐다 */
  restored: boolean;
  /** 지금 카드 문장의 출처 표시: 검증(원문) / 변조(바뀐 낱말이 있음 — 엔딩 뒤 열람에서만 표식) */
  sources: SourceRef[];
  /** 좌표 손상 건: 배정 헤더(일시 #### 등, 지금 현실 기준)·탐지 한 줄·시스템 권장 */
  header?: Assignment['header'];
  detection?: string;
  recommend?: string;
  /** 관측: 장면 타임라인(없으면 '관측 생략') */
  timelineId?: Id;
  observed: CaseObservedView[];
  links: InspectLink[];
  /** 정정에 근거 프레임이 필요하다(규정 4조) / 붙은 프레임 / 그 프레임이 담은 관측 대상 */
  needsFrame: boolean;
  frame?: Frame;
  frameShows: Id[];
  /** 찍은 도장 */
  stamp?: CaseStamp;
  correct?: boolean;
  impression?: StampImpression;
  /** lost/noise: 도장이 눌릴 수 있는가(하루를 끝까지 봤다 등) */
  ready: boolean;
  notReadyText?: string;
  current: boolean;
  done: boolean;
}

export function selectCaseCard(s: PersistedState, caseId: Id, c: ContentBundle = defaultContent): CaseCardView | null {
  const cd = c.cases.find((x) => x.id === caseId);
  if (!cd) return null;
  const p = s.duty.cases[cd.id];
  const restored = p?.stamp === 'correct' && !!p.correct;
  const shown = shownSegments(cd, restored);
  const dateIds = new Set((cd.record?.date ?? []).map((x) => x.id));
  const rules = activeRules(c.workShifts, c.rules, s.duty.started);
  const layers = layersOf(c);
  const a = cd.assignmentId ? c.assignments.find((x) => x.id === cd.assignmentId) : undefined;
  let detection = cd.detection;
  for (const shId of s.shifts)
    for (const r of c.shifts.find((x) => x.id === shId)?.caseRewrites ?? []) if (r.caseId === cd.id && r.detection) detection = r.detection;
  const observed: CaseObservedView[] = cd.observed.map((o) => {
    const line = o.lineId ? findLine(c.npcs, o.lineId)?.line : undefined;
    return {
      id: o.id,
      kind: o.kind,
      lineId: o.lineId,
      hotspotId: o.hotspotId,
      available: observedAvailable(o, s),
      speaker: line?.speaker,
      provenance: line?.provenance ?? 'reconstructed',
      segments: o.segments,
    };
  });
  const sys = a?.autoClassification ?? '자동 분류: 관측 오류(장비 노이즈) · 종결';
  return {
    case: cd,
    code: cd.code,
    title: cd.title,
    kind: cd.kind,
    citation: cd.record?.citation,
    dateSegments: shown.filter((x) => dateIds.has(x.id)),
    segments: shown.filter((x) => !dateIds.has(x.id)),
    leadingEllipsis: !!cd.record?.leadingEllipsis,
    trailingEllipsis: !!cd.record?.trailingEllipsis,
    restored,
    sources: cd.record?.sources ?? [],
    header: a ? assignmentHeader(a, layers, s) : undefined,
    detection,
    recommend: cd.recommend,
    timelineId: cd.timelineId,
    observed,
    links: p?.links ?? [],
    needsFrame: cd.kind === 'routine' && ruleEnabled(rules, 'frame_for_correct'),
    frame: p?.frame,
    frameShows: p?.frame ? cd.observed.filter((o) => frameShows(p.frame, o)).map((o) => o.id) : [],
    stamp: p?.stamp,
    correct: p?.correct,
    impression: p?.stamp
      ? {
          stamp: p.stamp,
          label: STAMP_NAMES[p.stamp],
          engraving: OFFICER_ENGRAVING,
          ...(cd.kind !== 'routine' && p.stamp !== 'report' ? { overlay: sys.replace('자동 분류: ', '') } : {}),
        }
      : undefined,
    ready: checkState(conditionState(s, c), cd.readyWhen),
    notReadyText: cd.notReadyText,
    current: s.duty.current === cd.id,
    done: !!p?.stamp,
  };
}

export interface DeskView {
  /** 진행 중 근무(없으면 다음 근무를 시작할 차례 / 에피소드 끝) */
  shift: WorkShift | null;
  /** 다음에 시작할 근무 */
  nextDutyId: Id | null;
  clock: string | null;
  /** 남은 근무 시간(분) */
  minutesLeft: number;
  goal: number;
  processed: number;
  queue: { caseId: Id; code: string; kind: CaseDef['kind']; done: boolean; current: boolean; minutes: number }[];
  current: CaseCardView | null;
  /** '다음 건' 벨: 올릴 수 있는 건 */
  nextLoadable: Id | null;
  canEnd: boolean;
  endBlockedText?: string;
  suspended: boolean;
  /** 규정집(번호 순), 새로 생겼고 아직 안 읽은 규정 */
  rules: { rule: RuleDef; isNew: boolean }[];
  /** 셔터가 있는가(규정 4조) */
  shutter: boolean;
  /** 이번 근무의 경고장(살아 있음/면담 정리/해당 없음) */
  slips: WarningSlip[];
  briefing: string[];
  /** 모든 근무가 끝났다 */
  episodeDone: boolean;
}

export function selectDesk(s: PersistedState, c: ContentBundle = defaultContent): DeskView {
  const shift = activeShift(s, c) ?? null;
  const byId = casesById(c);
  const nextDuty = [...c.workShifts].sort((a, b) => a.no - b.no).find((w) => !s.duty.started.includes(w.id));
  const rules = activeRules(c.workShifts, c.rules, s.duty.started);
  const newIds = new Set(shift?.newRules ?? []);
  const counters = dutyCounters(s.duty, c.workShifts, byId);
  return {
    shift,
    nextDutyId: shift ? null : (nextDuty?.id ?? null),
    clock: shift ? clockText(shift, dutyClock(s.duty, shift.id)) : null,
    minutesLeft: shift ? shift.length - dutyClock(s.duty, shift.id) : 0,
    goal: shift?.goal ?? 0,
    processed: shift ? (counters[`processed:${shift.id}`] ?? 0) : 0,
    queue: (shift?.queue ?? []).map((id) => ({
      caseId: id,
      code: byId[id]?.code ?? id,
      kind: byId[id]?.kind ?? 'routine',
      done: caseDone(s.duty, id),
      current: s.duty.current === id,
      minutes: byId[id]?.minutes ?? 0,
    })),
    current: s.duty.current ? selectCaseCard(s, s.duty.current, c) : null,
    nextLoadable: shift && !s.duty.current ? nextLoadable(shift, s.duty, byId) : null,
    canEnd: !!shift && !s.duty.suspended && queueExhausted(shift, s.duty, byId) && checkState(conditionState(s, c), shift.endWhen),
    endBlockedText: shift && queueExhausted(shift, s.duty, byId) && !checkState(conditionState(s, c), shift.endWhen) ? shift.endBlockedText : undefined,
    suspended: s.duty.suspended,
    rules: rules.map((rule) => ({ rule, isNew: newIds.has(rule.id) && !s.duty.rulesRead.includes(rule.id) })),
    shutter: ruleEnabled(rules, 'capture'),
    slips: shift ? s.duty.warnings.filter((w) => w.dutyId === shift.id) : [],
    briefing: shift?.briefing ?? [],
    episodeDone: !shift && !nextDuty,
  };
}

/** 근무 보고(근무가 끝난 뒤 프린터가 뱉는 종이) */
export function selectShiftReport(s: PersistedState, dutyId: Id, c: ContentBundle = defaultContent): (ShiftReport & { line: string }) | null {
  const w = c.workShifts.find((x) => x.id === dutyId);
  if (!w || !s.duty.started.includes(dutyId)) return null;
  return { ...shiftReport(w, s.duty, casesById(c)), line: reportLine(w, s, c) };
}

/** 판정 이력(카드가 뒤집히면): 같은 좌표의 지난 도장들. 1년 전 도장은 바랜 잉크. */
export interface VerdictHistoryEntry {
  when: string;
  officer: string;
  impression: StampImpression;
  /** 탭하면 여는 종결 보고서(1년 전 내 보고서) */
  closedReportId?: Id;
  current: boolean;
}

export function selectVerdictHistory(s: PersistedState, assignmentId: Id = 'as_c2217', c: ContentBundle = defaultContent): VerdictHistoryEntry[] {
  const a = c.assignments.find((x) => x.id === assignmentId);
  if (!a) return [];
  const out: VerdictHistoryEntry[] = [];
  const sys = a.autoClassification.replace('자동 분류: ', '');
  for (const cd of c.cases.filter((x) => x.assignmentId === assignmentId)) {
    const p = s.duty.cases[cd.id];
    if (!p?.stamp) continue;
    out.push({
      when: relativeNight(s, c, cd.dutyId),
      officer: a.officer,
      impression: { stamp: p.stamp, label: STAMP_NAMES[p.stamp], engraving: OFFICER_ENGRAVING, ...(p.stamp !== 'report' ? { overlay: sys } : {}) },
      current: s.duty.current === cd.id || cd.dutyId === s.duty.active,
    });
  }
  out.reverse();
  for (const r of closedVisible(s, c).filter((x) => x.code === a.code)) {
    const v = closedReportView(r, layersOf(c), s);
    out.push({
      when: v.when,
      officer: v.officer,
      impression: { stamp: 'mismatch', label: v.verdict, engraving: OFFICER_ENGRAVING, faded: true, overlay: v.classification },
      closedReportId: v.id,
      current: false,
    });
  }
  return out;
}

export interface ReplayView {
  /** 관측기 로그에서 재생할 수 있는 종결 건 */
  caseId: Id | null;
  available: boolean;
  /** 지금 근무에서 재생하면 규정 위반 경고(규정 5조) */
  violation: boolean;
  costMinutes: number;
  minutesLeft: number;
  windows: (ReplayWindow & { degraded: boolean; affordable: boolean })[];
  active: { caseId: Id; windowId: Id } | null;
  /** 이번 근무의 재생 횟수 */
  count: number;
}

export function selectReplay(s: PersistedState, c: ContentBundle = defaultContent): ReplayView {
  const shift = activeShift(s, c);
  const lost = c.cases.find((x) => x.replay && caseDone(s.duty, x.id));
  const rules = activeRules(c.workShifts, c.rules, s.duty.started);
  const left = shift ? shift.length - dutyClock(s.duty, shift.id) : 0;
  const cost = lost?.replay?.minutes ?? 0;
  return {
    caseId: lost?.id ?? null,
    available: !!lost && !!shift && shift.id !== c.workShifts[0]?.id && !s.duty.suspended,
    violation: ruleEnabled(rules, 'no_reopen'),
    costMinutes: cost,
    minutesLeft: left,
    windows: (lost?.replay?.windows ?? []).map((w) => ({
      ...w,
      degraded: s.degraded.some((d) => d.from <= w.from && d.to >= w.to),
      affordable: cost <= left,
    })),
    active: s.duty.replay,
    count: shift ? s.duty.replays.filter((r) => r.dutyId === shift.id).length : 0,
  };
}

export interface InterviewView {
  /** 면담 중(관측 권한 정지) */
  active: boolean;
  lines: { from: string; text: string }[];
  /** 다시 읽어 주는 경고장 */
  recap: WarningSlip[];
  recapAfter: number;
  choices: { id: Id; text: string }[];
  /** 끝난 면담의 맺음 줄(선택 반영) */
  closing: { from: string; text: string }[];
}

export function selectInterview(s: PersistedState, c: ContentBundle = defaultContent): InterviewView | null {
  const def = c.interviews[0];
  const iv = s.duty.interviews[s.duty.interviews.length - 1];
  if (!def || !iv) return null;
  const cs = conditionState(s, c);
  return {
    active: s.duty.suspended,
    lines: def.lines.filter((l) => checkState(cs, l.when)).map(({ from, text }) => ({ from, text })),
    recap: s.duty.warnings.filter((w) => iv.slipIds.includes(w.id)),
    recapAfter: def.recapAfter,
    choices: def.choices.map(({ id, text }) => ({ id, text })),
    // 맺음 줄은 이번 면담에서 고른 답만 반영한다(지난 면담의 답 플래그는 보지 않는다)
    closing: iv.done
      ? def.closing
          .filter((l) => {
            const chosen = def.choices.find((x) => x.id === iv.choice)?.setsFlags ?? [];
            const choiceFlags = def.choices.flatMap((x) => x.setsFlags ?? []);
            const need = (l.when?.all ?? []).filter((f) => choiceFlags.includes(f));
            return need.every((f) => chosen.includes(f)) && checkState(cs, { ...l.when, all: (l.when?.all ?? []).filter((f) => !choiceFlags.includes(f)) });
          })
          .map(({ from, text }) => ({ from, text }))
      : [],
  };
}

/** 관측 범위(시간 막대): 재생 구간이면 그 구간, 아니면 타임라인 전체 */
export function selectObservationRange(s: PersistedState & { ui?: UiState }, c: ContentBundle = defaultContent): { from: number; to: number } | null {
  const o = s.ui?.observation;
  if (!o) return null;
  if (o.window) return o.window;
  const tl = c.timelines.find((t) => t.id === o.timelineId);
  return tl ? { from: tl.start, to: tl.end } : null;
}

export interface FrameView {
  frame: Frame;
  index: number;
  /** 버리거나 덮어쓸 수 없다(흐려진 구간의 유일한 핵심 프레임) */
  protected: boolean;
  /** 이 프레임에 들린 대사(화자·본문) */
  lines: { id: Id; speaker?: string; text: string; provenance: Provenance; glossary?: Gloss[] }[];
}

/** #C-2217 필름(관측기 로그 재생에서 찍은 것, 최대 6장) */
export function selectFrames(s: PersistedState, c: ContentBundle = defaultContent): { frames: FrameView[]; max: number; left: number } {
  const keyIds = new Set(c.clues.filter((x) => x.key).map((x) => x.id));
  const frames = s.frames.map((frame, index) => {
    const prot =
      s.degraded.length > 0 &&
      inSpans(frame.minute, s.degraded) &&
      frame.clueIds.some((k) => keyIds.has(k) && !s.frames.some((o) => o.id !== frame.id && o.clueIds.includes(k)));
    const lines = frame.heardLineIds
      .map((id) => findLine(c.npcs, id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map(({ line }) => ({ id: line.id, speaker: line.speaker, text: line.text, provenance: line.provenance, glossary: line.glossary }));
    return { frame, index, protected: prot, lines };
  });
  return { frames, max: MAX_FRAMES, left: MAX_FRAMES - s.frames.length };
}

export interface ClosedReportView {
  id: Id;
  code: string;
  when: string;
  officer: string;
  verdict: string;
  classification: string;
  note: string;
  fields: { label: string; value: string }[];
  /** 이번 에피소드에서 내가 처리한 건(상태에서 만든 것) */
  current: boolean;
  opened: boolean;
}

/** 업무 → 종결된 보고서 탭. 내가 처리한 좌표 손상 건이 위, 이어서 콘텐츠의 옛 보고서(관측기 로그 — 복원 뒤에도 그대로). */
export function selectClosedReports(s: PersistedState, c: ContentBundle = defaultContent): ClosedReportView[] {
  const out: ClosedReportView[] = [];
  for (const cd of [...c.cases].reverse()) {
    if (cd.kind === 'routine') continue;
    const p = s.duty.cases[cd.id];
    if (!p?.stamp) continue;
    const a = cd.assignmentId ? c.assignments.find((x) => x.id === cd.assignmentId) : undefined;
    const report = p.stamp === 'report';
    out.push({
      id: cd.id,
      code: cd.code,
      when: relativeNight(s, c, cd.dutyId),
      officer: a?.officer ?? '대조관 07',
      verdict: STAMP_NAMES[p.stamp],
      classification: report ? '복원심의위원회 직송' : (a?.autoClassification ?? '자동 분류: 관측 오류(장비 노이즈) · 종결').replace('자동 분류: ', ''),
      note: '',
      fields: [],
      current: true,
      opened: true,
    });
  }
  for (const r of closedVisible(s, c).sort((a, b) => a.order - b.order)) {
    const v = closedReportView(r, layersOf(c), s);
    out.push({
      id: v.id,
      code: v.code,
      when: v.when,
      officer: v.officer,
      verdict: v.verdict,
      classification: v.classification,
      note: v.note,
      fields: v.fields ?? [],
      current: false,
      opened: s.opened.includes(v.id),
    });
  }
  return out;
}

/** 배정 헤더(지금 현실: 일시 #### → 복원 뒤 날짜) */
export function selectAssignment(s: PersistedState, id: Id, c: ContentBundle = defaultContent) {
  const a = c.assignments.find((x) => x.id === id);
  if (!a) return null;
  return { assignment: a, header: assignmentHeader(a, layersOf(c), s), opened: s.assignmentsOpened.includes(a.id), refsOpen: isAppUnlocked(c.apps, 'db', conditionState(s, c)) };
}

export interface ReportView {
  reportId: Id;
  unlocked: boolean;
  filed: boolean;
  draft: ReportDraft;
  /** 마지막 제출 판정(제출 전 null) */
  result: ReportResult | null;
  /** 언제 칸: 붙인 자료가 함의하는 범위(플레이어 자신의 근거 — 공개 가능) */
  impliedYears: { from?: number; to?: number };
  /** 붙일 수 있는 것: 필름 프레임 + 열어 본 DB 기록 */
  attachable: { frames: Id[]; records: Id[] };
}

export function selectReport(s: PersistedState & { lastReport?: Record<Id, ReportResult> }, reportId?: Id, c: ContentBundle = defaultContent): ReportView | null {
  const spec = reportId ? c.reports.find((r) => r.id === reportId) : c.reports[0];
  if (!spec) return null;
  const draft = s.reports[spec.id] ?? emptyDraft();
  const w: ReportWorld = {
    clues: c.clues,
    frames: s.frames,
    records: Object.fromEntries(c.records.map((r) => [r.id, recordView(r, layersOf(c), s)])),
    persons: Object.fromEntries(c.persons.map((p) => [p.id, p])),
  };
  const { ids } = blankClues(draft.when.attachments, reportBaseClues(draft, w), w);
  const byId = new Map(c.clues.map((x) => [x.id, x]));
  const views = ids
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => ({ id: x.id, level: 0, label: x.label, text: x.text, facts: x.proves ?? [], time: x.time }));
  return {
    reportId: spec.id,
    unlocked: checkState(conditionState(s, c), spec.unlockWhen),
    filed: s.filed.includes(spec.id),
    draft,
    result: s.lastReport?.[spec.id] ?? null,
    impliedYears: impliedRange(views, undefined, true),
    attachable: { frames: s.frames.map((f) => f.id), records: s.recordsOpened },
  };
}

export interface InboxItem {
  message: Message;
  read: boolean;
  reply?: Id;
  /** 단말 시각(메시지에 없으면 도착 시각) */
  clock?: string;
}

/** 도착 순서대로, 지금 현실의 본문으로. thread 를 주면 그 대화만. 다시 쓰인 표식은 없다. */
export function selectInbox(s: PersistedState, c: ContentBundle = defaultContent, thread?: Message['thread']): InboxItem[] {
  const byId = new Map(c.messages.map((m) => [m.id, m]));
  const layers = layersOf(c);
  return s.inbox
    .map((id) => byId.get(id))
    .filter((m): m is Message => !!m && (!thread || m.thread === thread))
    .map((m) => ({ message: messageView(m, layers, s), read: s.read.includes(m.id), reply: s.replies[m.id], clock: m.clock ?? s.arrivedAt[m.id] }));
}

export const selectUnread = (s: PersistedState) => s.inbox.filter((id) => !s.read.includes(id)).length;

export interface RewrittenMessage {
  messageId: Id;
  /** 내가 처음 본 본문(나만 기억한다) */
  original: string;
  current: string;
  history: RewriteEntry[];
}

/** 플레이어만 아는 것: 다시 쓰인 메시지와 원래 본문. */
export function selectRewrittenMessages(s: PersistedState): Record<Id, RewrittenMessage> {
  const out: Record<Id, RewrittenMessage> = {};
  for (const e of s.rewriteLog)
    if (e.kind === 'message') {
      const cur = out[e.targetId];
      if (cur) {
        cur.current = e.after;
        cur.history.push(e);
      } else out[e.targetId] = { messageId: e.targetId, original: e.before, current: e.after, history: [e] };
    }
  return out;
}

/** 지금 현실의 DB 레코드(복원 반영, 표식 없음). */
export function selectRecord(s: PersistedState, id: Id, c: ContentBundle = defaultContent): DbRecord | undefined {
  const rec = c.records.find((r) => r.id === id);
  return rec && recordView(rec, layersOf(c), s);
}

/** 관측 흐림 구간(뷰어 degraded 프롭). #C-2217 장면(tl_obs001)에만 해당한다. */
export const selectDegraded = (s: PersistedState) => s.degraded;

/** 낯선 실록 용어 풀이 */
export function selectGlossary(term?: string): Gloss[] {
  return term ? GLOSSARY.filter((g) => g.term === term) : GLOSSARY;
}

export type ProvenanceBadge = '검증' | '재구성' | '가상' | '변조';
export const provenanceBadge = (p: Provenance, altered = false): ProvenanceBadge =>
  altered ? '변조' : p === 'verified' ? '검증' : p === 'reconstructed' ? '재구성' : '가상';

/** 엔딩 뒤 기록 열람 모드: 모든 DB 레코드의 지금 상태와 원래 상태. 변조 상태는 실제 역사로 표시하지 않는다. */
export function selectRecordLedger(s: PersistedState, c: ContentBundle = defaultContent) {
  return c.records.map((rec) => {
    const current = recordView(rec, layersOf(c), s);
    return {
      id: rec.id,
      current,
      currentBadge: provenanceBadge(current.provenance, !!rec.altered && current.provenance !== 'verified'),
      original: rec,
      originalBadge: provenanceBadge(rec.provenance, !!rec.altered),
      restored: !!rec.altered && current.provenance === 'verified',
    };
  });
}

/**
 * 엔딩 뒤 기록 열람 — 근무의 건: 검증된 원문(출처)과 변조된 낱말('변조', 가상), 관측 대사(재구성/검증), 내 도장.
 * 재구성 대사를 사실처럼 표시하지 않는다(배지).
 */
export function selectCaseLedger(s: PersistedState, c: ContentBundle = defaultContent) {
  return c.cases
    .filter((x) => x.kind === 'routine')
    .map((cd) => {
      const p = s.duty.cases[cd.id];
      const lines = cd.observed
        .map((o) => (o.lineId ? findLine(c.npcs, o.lineId)?.line : undefined))
        .filter((l): l is NonNullable<typeof l> => !!l)
        .map((l) => ({ text: l.text, badge: provenanceBadge(l.provenance), sources: l.sources ?? [] }));
      return {
        id: cd.id,
        code: cd.code,
        citation: cd.record?.citation ?? '',
        original: { text: originalText(cd), date: (cd.record?.date ?? []).map((x) => x.text).join(''), badge: '검증' as ProvenanceBadge, sources: cd.record?.sources ?? [] },
        distortion: cd.record?.distortion
          ? {
              from: recordSegments(cd).find((x) => x.id === cd.record!.distortion!.segmentId)?.text ?? '',
              to: cd.record.distortion.text,
              badge: '변조' as ProvenanceBadge,
            }
          : null,
        notation: cd.pairs.filter((x) => x.notation && x.note).map((x) => x.note!),
        lines,
        stamp: p?.stamp ? STAMP_NAMES[p.stamp] : null,
        correct: p?.correct ?? null,
        expected: derivedExpected(cd).map((x) => STAMP_NAMES[x]),
      };
    });
}

/** 스크럽 막대 눈금(이동·대사 시작·사물 열림). 내용은 주지 않는다. */
export function selectTimelineTicks(s: PersistedState, c: ContentBundle = defaultContent, timelineId: Id = DEFAULT_TIMELINE): TimelineTick[] {
  const tl = c.timelines.find((t) => t.id === timelineId);
  return tl ? timelineTicks(tl, c, s.flags) : [];
}

export function selectNpcRoute(s: PersistedState, npcId: Id, c: ContentBundle = defaultContent, timelineId: Id = DEFAULT_TIMELINE): NpcRoute | null {
  const tl = c.timelines.find((t) => t.id === timelineId);
  const npc = c.npcs.find((n) => n.id === npcId);
  if (!tl || !npc) return null;
  return npcRoute(tl, npc, s.obsMinute[tl.id] ?? tl.initial);
}

/** 현재(또는 지정) 타임라인 프레임. 관측 렌더러가 매 스크럽마다 읽는다. */
export function selectViewerFrame(
  s: PersistedState & { ui?: UiState },
  c: ContentBundle = defaultContent,
  timelineId: Id = s.ui?.observation?.timelineId ?? DEFAULT_TIMELINE,
): ViewerFrame | null {
  const tl = c.timelines.find((t) => t.id === timelineId);
  if (!tl) return null;
  return viewerFrame(tl, s.obsMinute[tl.id] ?? tl.initial, c, s.flags);
}

/** @deprecated 코치마크 없음(힌트는 메신저로만). 뷰어 호환용으로 항상 null. */
export function selectTutorial(..._args: unknown[]): null {
  return null;
}

export interface Progress {
  dutiesEnded: number;
  casesDone: number;
  frames: number;
  heard: number;
  recordsOpened: number;
  corrected: boolean;
  filed: boolean;
}

export function selectProgress(s: PersistedState): Progress {
  return {
    dutiesEnded: s.duty.ended.length,
    casesDone: Object.values(s.duty.cases).filter((x) => x.stamp).length,
    frames: s.frames.length,
    heard: s.heard.length,
    recordsOpened: s.recordsOpened.length,
    corrected: s.corrections.length > 0,
    filed: s.filed.length > 0,
  };
}

/** 영속 상태가 바뀌면 debounce 후 'auto' 슬롯에 저장. 해제 함수를 돌려준다. */
export function enableAutosave(store: GameStore, delayMs = 1500): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsub = store.subscribe((s, prev) => {
    if (!PERSISTED_KEYS.some((k) => s[k] !== prev[k])) return;
    clearTimeout(timer);
    timer = setTimeout(() => void store.getState().save('auto'), delayMs);
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}

export { STAMP_NAMES, OFFICER_ENGRAVING };

export const useGameStore = createGameStore();
