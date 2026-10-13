/**
 * 결록 단말 스토어(v3 「대조」, Zustand). 진행 상태 + 액션. core 를 호출해 상태를 바꾼다. 설계: docs/DESIGN_V3.md.
 *
 * 앱 4개: 업무(배정·체크리스트·보고서·종결된 보고서) · 관측 · DB 검색 · 메신저.
 * 상태가 바뀔 때마다 syncState() 가 메시지 도착, 정합성 보정(말소), 현실 이동(복원)을 반영한다(순수 함수).
 *
 * ── UI 계약(요약) ──────────────────────────────────────────────
 *  업무   openAssignment(id) → 관측 앱 열림
 *         stampChecklist(itemId, 'match'|'mismatch', note?) → StampResult
 *           · 'stamped' | 'not_ready'(조건 미충족, message) | 'wrong'(본 것과 다른 판정, message) | 'already' | 'closed'(마지막 항목: 자동 종결)
 *         openClosedReport(id)
 *  관측   startObservation() · scrubObservation(m) · endObservation()
 *         reportView(snapshot)  — 뷰어가 카메라가 멈출 때(스로틀) 부른다. 기준 배율 INSPECT_ZOOM 배 이상이면 화면의 핫스팟을 '봤다'
 *         hearLine(lineId)      — 뷰어가 대사를 처음 들려줄 때(관측당 줄마다 한 번)
 *         tapHotspot(id)        — 사물 살펴보기(단서는 만들지 않는다)
 *  필름   captureFrame(snapshot) · replaceFrame(index, snapshot) · removeFrame(frameId) — 최대 6장 → CaptureResult
 *  보고서 attach(blank, ref) · detach(blank, ref) · setYear(from, to) · submitReport(id) → ReportResult · stampReport(id) → FileResult
 *  DB     search(query) → SearchOutcome · openRecord(id)
 *  메신저 readMessage(id) · chooseReply(messageId, choiceId)
 *  힌트   tickIdle(secondsSinceLastAction) · reportFail(kind)   (메신저로만 온다)
 *  연출   recentRewrites(말소·복원 다시 쓰기) → UI 연출 뒤 ackRewrites()
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
import { loadGame, saveGame, type Closure, type PersistedState, type SaveFile, type SaveSlot, type Settings } from '@/core/save';
import { NO_ARTICLE_TEXT, searchIndex, searchMessage, type MatchKind, type SearchStatus } from '@/core/search';
import {
  activeLadders,
  assignmentHeader,
  checkState,
  closedReportView,
  dueCorrections,
  dueMessages,
  dueShifts,
  emptyHints,
  emptyStats,
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
import type {
  AppId,
  Assignment,
  BlankKey,
  ChecklistItem,
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
  RewriteEntry,
  SearchResultRef,
  SourceRef,
  Stamp,
} from '@/core/types';
import { BLANK_KEYS } from '@/core/types';
import { content as defaultContent } from '@/data';
import { GLOSSARY } from '@/data/glossary';

export type { Frame, ViewerSnapshot, AttachmentRef, ReportDraft, ReportResult } from '@/core/report';
export type { FailKind } from '@/core/types';

/** 이 배율(기준의 배수) 이상으로 화면에 있던 핫스팟을 '봤다'고 친다(① 장소 대조). 엿듣기 기본 minZoom 과 같다. */
export const INSPECT_ZOOM = 1.6;
export const DEFAULT_TIMELINE = 'tl_obs001';

export interface UiState {
  modal: { kind: ModalKind; id?: Id } | null;
  paused: boolean;
  app: AppId | null;
  appTarget?: Id;
  observation: { timelineId: Id } | null;
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

export type StampStatus = 'stamped' | 'not_ready' | 'wrong' | 'already' | 'closed' | 'unknown';
export interface StampResult {
  status: StampStatus;
  message?: string;
  /** 마지막 항목: 자동 분류 문구(회색 도장) */
  autoClassification?: string;
}

export type CaptureStatus = 'captured' | 'replaced' | 'removed' | 'full' | 'degraded' | 'protected' | 'unknown';
export interface CaptureResult {
  status: CaptureStatus;
  frame?: Frame;
  /** 이번에 새로 생긴 단서(가진 프레임 전체 기준) */
  newClues: Id[];
  message?: string;
}

export type AttachStatus = 'attached' | 'detached' | 'full' | 'already' | 'locked' | 'unknown';
export type FileStatus = 'filed' | 'not_ready' | 'already' | 'locked';
export interface FileResult {
  status: FileStatus;
  shiftId?: Id;
  rewrites: RewriteEntry[];
  result?: ReportResult;
}

export interface GameActions {
  openApp(app: AppId, target?: Id): boolean;
  closeApp(): void;
  // 업무
  openAssignment(id: Id): boolean;
  stampChecklist(itemId: Id, verdict: Stamp, note?: string): StampResult;
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
  return {
    flags: {},
    terms: [],
    searchLog: [],
    searched: [],
    recordsOpened: [],
    inbox: [],
    read: [],
    replies: {},
    corrections: [],
    shifts: [],
    rewriteLog: [],
    heard: [],
    seen: [],
    hoursVisited: [],
    tapped: [],
    obsMinute: {},
    appsOpened: [],
    frames: [],
    frameSeq: 0,
    assignmentsOpened: [],
    checklist: {},
    closures: {},
    opened: [],
    reports: {},
    filed: [],
    degraded: [],
    hints: emptyHints(),
    stats: emptyStats(),
    settings: { ...DEFAULT_SETTINGS },
  };
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

/** 조건 판정용 상태(프레임 단서·도장·종결·끝난 힌트를 계산해 넣는다). */
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
    stamped: Object.keys(s.checklist),
    closed: Object.keys(s.closures),
    opened: s.opened,
    corrections: s.corrections,
    shifts: s.shifts,
    filed: s.filed,
    hintsDone: laddersDone(c.hints, s.hints),
    stats: s.stats,
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
const closureSummary = (cl: Closure) => `판정: ${STAMP_LABEL[cl.shownVerdict]}\n분류: ${cl.classification}\n소견: ${cl.note}`;
export const STAMP_LABEL: Record<Stamp, string> = { match: '일치', mismatch: '불일치' };

function closedVisible(s: PersistedState, c: ContentBundle) {
  const cs = conditionState(s, c);
  return c.closedReports.filter((r) => checkState(cs, r.showWhen));
}

/** 정합성 보정(말소) 하나를 적용 */
function applyCorrection(s: PersistedState, id: Id, idx: ContentIndex) {
  const e = idx.corrections[id]!;
  const log: RewriteEntry[] = [];
  const entry = (kind: RewriteEntry['kind'], targetId: Id, before: string, after: string): RewriteEntry => ({
    seq: s.rewriteLog.length + log.length,
    sourceId: id,
    tone: 'erase',
    kind,
    targetId,
    before,
    after,
  });
  const held = cluesOfFrames(s.frames);
  const spans = e.degrade.filter((d) => !d.clue || held.includes(d.clue)).map((d) => ({ from: d.from, to: d.to }));
  let state: PersistedState = { ...s, corrections: [...s.corrections, id], degraded: [...s.degraded, ...spans] };
  if (e.closure && state.closures[e.closure.assignmentId]) {
    const before = state.closures[e.closure.assignmentId]!;
    const after: Closure = { ...before, shownVerdict: e.closure.verdictShown, note: e.closure.clearNote ? '' : before.note };
    state = { ...state, closures: { ...state.closures, [e.closure.assignmentId]: after } };
    if (closureSummary(before) !== closureSummary(after))
      log.push(entry('closure', e.closure.assignmentId, closureSummary(before), closureSummary(after)));
  }
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
  if (sh.closureRewrite && after.closures[sh.closureRewrite.assignmentId]) {
    const aid = sh.closureRewrite.assignmentId;
    const before = after.closures[aid]!;
    const next: Closure = {
      ...before,
      classification: sh.closureRewrite.classification,
      shownVerdict: sh.closureRewrite.verdictShown ?? before.shownVerdict,
    };
    after = { ...after, closures: { ...after.closures, [aid]: next } };
    log.push(entry('closure', aid, closureSummary(before), closureSummary(next)));
  }
  const state = applyGrants(after, sh.unlocks);
  return { state: { ...state, rewriteLog: [...state.rewriteLog, ...log] }, log };
}

/** 조건으로 생기는 일(메시지 도착, 보정, 현실 이동)을 변화가 없을 때까지 반영(순수). */
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
      s = applyGrants({ ...s, inbox: [...s.inbox, m.id] }, m.grants);
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
});

const hoursText = (hours: readonly number[]) => {
  if (!hours.length) return '없음';
  const h = [...hours].sort((a, b) => a - b);
  return `${String(h[0]).padStart(2, '0')}~${String(h[h.length - 1]).padStart(2, '0')}시`;
};

export function createGameStore(content: ContentBundle = defaultContent) {
  const idx = indexContent(content);
  const initial = syncState(initialPersisted(), content, idx).state;
  const mainReport = () => content.reports[0]?.id ?? '';

  return create<GameState>()((set, get) => {
    const persisted = () => pickPersisted(get());
    const cs = () => conditionState(get(), content);
    const apply = (next: PersistedState) => {
      const r = syncState(next, content, idx);
      const extra: Partial<GameState> = {};
      if (r.rewrites.length) extra.recentRewrites = [...get().recentRewrites, ...r.rewrites];
      set({ ...r.state, ...extra });
      return r;
    };
    const bump = (patch: Partial<Record<keyof PlayStats, number>>, extra: Partial<PersistedState> = {}) => {
      const s = get();
      const stats = { ...s.stats };
      for (const [k, v] of Object.entries(patch)) stats[k as keyof PlayStats] += v ?? 0;
      return apply({ ...s, ...extra, stats });
    };
    const activeTimeline = () => {
      const o = get().ui.observation;
      return o ? idx.timelines[o.timelineId] : undefined;
    };
    const minuteNow = () => {
      const tl = activeTimeline() ?? idx.timelines[DEFAULT_TIMELINE];
      return tl ? (get().obsMinute[tl.id] ?? tl.initial) : 0;
    };
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
    const deliverHint = (idle: number): Message | null => {
      const s = get();
      for (const l of activeLadders(content.hints, cs())) {
        const step = nextHintStep(l, s.hints, idle, s.settings.hintLevel);
        if (!step) continue;
        const hints = { ...s.hints, sent: { ...s.hints.sent, [l.id]: step.index + 1 } };
        const inbox = addUnique(s.inbox, step.messageId);
        apply({ ...s, hints, inbox });
        return idx.messages[step.messageId] ?? null;
      }
      return null;
    };

    const actions: GameActions = {
      openApp(app, target) {
        if (!isAppUnlocked(content.apps, app, cs())) return false;
        set((s) => ({ ui: { ...s.ui, app, appTarget: target } }));
        if (!get().appsOpened.includes(app)) apply({ ...get(), appsOpened: [...get().appsOpened, app] });
        return true;
      },
      closeApp: () => set((s) => ({ ui: { ...s.ui, app: null, appTarget: undefined } })),

      // ── 업무 ──
      openAssignment(id) {
        if (!idx.assignments[id]) return false;
        const s = get();
        apply({ ...s, assignmentsOpened: addUnique(s.assignmentsOpened, id), flags: { ...s.flags, [`${id}_opened`]: true } });
        return true;
      },
      stampChecklist(itemId, verdict, note = '') {
        const a = content.assignments.find((x) => x.checklist.some((i) => i.id === itemId));
        const item = a?.checklist.find((i) => i.id === itemId);
        if (!a || !item) return { status: 'unknown' };
        const s = get();
        if (s.closures[a.id]) return { status: 'closed', autoClassification: s.closures[a.id]!.classification };
        if (s.checklist[itemId] && !item.final) return { status: 'already' };
        const miss = (message: string): StampResult => {
          bump({ stampMisses: 1 });
          actions.reportFail('stamp_miss');
          return { status: 'not_ready', message };
        };
        if (!checkState(cs(), item.ready)) {
          const extra = item.id === 'ck_time' ? ` 확인한 시간대: ${hoursText(s.hoursVisited)}` : '';
          return miss(item.notReadyText + extra);
        }
        if (item.final) {
          if (verdict === 'mismatch' && !item.final.mismatchNeedsAnyClue.some((c) => cluesOfFrames(s.frames).includes(c)))
            return miss(item.final.mismatchNeedsText);
          const unrecorded = s.frames.filter((f) => f.clueIds.some((c) => idx.clues[c]?.unrecorded)).map((f) => f.id);
          const closure: Closure = {
            verdict,
            shownVerdict: verdict,
            note: note.trim(),
            frameIds: verdict === 'mismatch' ? unrecorded : [],
            classification: a.autoClassification,
          };
          bump(
            { stamps: 1 },
            {
              checklist: { ...s.checklist, [itemId]: verdict },
              closures: { ...s.closures, [a.id]: closure },
              flags: { ...s.flags, [verdict === 'mismatch' ? 'closed_mismatch' : 'closed_match']: true },
            },
          );
          return { status: 'closed', autoClassification: a.autoClassification };
        }
        if (item.expected && item.expected !== verdict) {
          bump({ stampMisses: 1 });
          actions.reportFail('stamp_miss');
          return { status: 'wrong', message: item.wrongText };
        }
        bump({ stamps: 1 }, { checklist: { ...s.checklist, [itemId]: verdict } });
        return { status: 'stamped' };
      },
      openClosedReport(id) {
        if (!closedVisible(get(), content).some((r) => r.id === id)) return false;
        if (!get().opened.includes(id)) apply({ ...get(), opened: [...get().opened, id] });
        return true;
      },

      // ── 관측 ──
      startObservation(timelineId = DEFAULT_TIMELINE) {
        const tl = idx.timelines[timelineId];
        if (!tl || !isAppUnlocked(content.apps, 'viewer', cs())) return false;
        set((s) => ({ ui: { ...s.ui, observation: { timelineId } } }));
        const s = get();
        const m = s.obsMinute[tl.id] ?? tl.initial;
        apply({ ...s, obsMinute: { ...s.obsMinute, [tl.id]: m }, hoursVisited: addUnique(s.hoursVisited, Math.floor(m / 60)) });
        return true;
      },
      scrubObservation(minute) {
        const tl = activeTimeline();
        if (!tl) return NaN;
        const m = clampMinute(tl, minute);
        const s = get();
        if (s.obsMinute[tl.id] !== m)
          bump(
            { scrubs: 1 },
            { obsMinute: { ...s.obsMinute, [tl.id]: m }, hoursVisited: addUnique(s.hoursVisited, Math.min(18, Math.floor(m / 60))) },
          );
        return m;
      },
      endObservation: () => set((s) => ({ ui: { ...s.ui, observation: null } })),
      reportView(snap) {
        const s = get();
        if (inSpans(snap.minute, s.degraded)) return;
        const hour = Math.min(18, Math.floor(snap.minute / 60));
        const seen = snap.zoom + 1e-6 >= INSPECT_ZOOM ? addAll(s.seen, snap.visibleHotspotIds) : s.seen;
        const hoursVisited = addUnique(s.hoursVisited, hour);
        if (seen !== s.seen || hoursVisited !== s.hoursVisited) apply({ ...s, seen, hoursVisited });
      },
      hearLine(lineId) {
        const s = get();
        const f = findLine(content.npcs, lineId);
        const m = minuteNow();
        if (!f || inSpans(m, s.degraded) || !lineActiveAt(content.npcs, lineId, m, s.flags)) return false;
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
        if (!frame || frame.status === 'hidden' || inSpans(minute, s0.degraded)) return null;
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
            lines: (open ? obj.examine : [obj.hiddenText ?? '지금은 잘 보이지 않는다.']).map((text) => ({
              text,
              provenance: obj.provenance,
              sources: obj.sources,
            })),
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

      // ── 필름 ──
      captureFrame(snap) {
        const s = get();
        if (inSpans(snap.minute, s.degraded)) return { status: 'degraded', newClues: [], message: '이 구간은 훼손되어 찍히지 않는다.' };
        if (s.frames.length >= MAX_FRAMES) {
          actions.reportFail('capture_full');
          return { status: 'full', newClues: [], message: '필름이 다 찼다. 한 장을 비우거나 덮어쓰자.' };
        }
        const clean = snapshotClean(snap);
        const before = cluesOfFrames(s.frames);
        const frame: Frame = { ...clean, id: `fr_${s.frameSeq + 1}`, seq: s.frameSeq + 1, clueIds: frameClues(clean, content.clues) };
        bump({ captures: 1 }, { frames: [...s.frames, frame], frameSeq: s.frameSeq + 1 });
        return { status: 'captured', frame, newClues: frame.clueIds.filter((c) => !before.includes(c)) };
      },
      replaceFrame(index, snap) {
        const s = get();
        const old = s.frames[index];
        if (!old) return actions.captureFrame(snap);
        if (inSpans(snap.minute, s.degraded)) return { status: 'degraded', newClues: [], message: '이 구간은 훼손되어 찍히지 않는다.' };
        if (isProtected(old)) return { status: 'protected', newClues: [], message: '이 장면은 이제 다시 찍을 수 없다. 이 프레임은 버릴 수 없다.' };
        const clean = snapshotClean(snap);
        const frame: Frame = { ...clean, id: `fr_${s.frameSeq + 1}`, seq: s.frameSeq + 1, clueIds: frameClues(clean, content.clues) };
        const frames = s.frames.map((f, i) => (i === index ? frame : f));
        const before = cluesOfFrames(s.frames.filter((_, i) => i !== index));
        bump({ captures: 1 }, { frames, frameSeq: s.frameSeq + 1, reports: dropFrameRefs(s.reports, old.id) });
        return { status: 'replaced', frame, newClues: frame.clueIds.filter((c) => !before.includes(c)) };
      },
      removeFrame(frameId) {
        const s = get();
        const old = s.frames.find((f) => f.id === frameId);
        if (!old) return { status: 'unknown', newClues: [] };
        if (isProtected(old)) return { status: 'protected', newClues: [], message: '이 장면은 이제 다시 찍을 수 없다. 이 프레임은 버릴 수 없다.' };
        apply({ ...s, frames: s.frames.filter((f) => f.id !== frameId), reports: dropFrameRefs(s.reports, frameId) });
        return { status: 'removed', newClues: [] };
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
        const result = judgeReport(spec, draftOf(reportId), world());
        if (!result.complete) return { status: 'not_ready', rewrites: [], result };
        const r = apply({ ...get(), filed: [...get().filed, reportId] });
        return { status: 'filed', shiftId: r.shifted.includes(spec.restores) ? spec.restores : undefined, rewrites: r.rewrites, result };
      },

      // ── DB ──
      search(query) {
        const s0 = get();
        if (!isAppUnlocked(content.apps, 'db', cs())) {
          const out: SearchOutcome = { query, normalized: '', status: 'locked', hits: [], message: '대조 중에는 DB 를 열람할 수 없다(규정 4조).' };
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
        };
        set({ ...syncState(merged, content, idx).state, ...freshTransient(), lastSavedAt: file.savedAt });
        return true;
      },
      reset: () => set({ ...structuredClone(initial), ...freshTransient(), lastSavedAt: null }),
    };

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

export interface ChecklistView {
  item: ChecklistItem;
  stamp: Stamp | null;
  /** 도장이 눌릴 수 있는가 */
  ready: boolean;
}

export interface AssignmentView {
  assignment: Assignment;
  /** 지금 현실의 헤더(일시 #### → 복원 뒤 날짜) */
  header: Assignment['header'];
  opened: boolean;
  items: ChecklistView[];
  /** 종결(이번 건): 지금 현실이 보여 주는 판정·분류·소견 */
  closure: (Closure & { verdictLabel: string; shownLabel: string }) | null;
  /** 참조 탭 가능(DB 열린 뒤) */
  refsOpen: boolean;
}

export function selectAssignment(s: PersistedState, id: Id, c: ContentBundle = defaultContent): AssignmentView | null {
  const a = c.assignments.find((x) => x.id === id);
  if (!a) return null;
  const cs = conditionState(s, c);
  const cl = s.closures[a.id];
  return {
    assignment: a,
    header: assignmentHeader(a, layersOf(c), s),
    opened: s.assignmentsOpened.includes(a.id),
    items: a.checklist.map((item) => ({ item, stamp: s.checklist[item.id] ?? null, ready: checkState(cs, item.ready) })),
    closure: cl ? { ...cl, verdictLabel: STAMP_LABEL[cl.verdict], shownLabel: STAMP_LABEL[cl.shownVerdict] } : null,
    refsOpen: isAppUnlocked(c.apps, 'db', cs),
  };
}

export interface FrameView {
  frame: Frame;
  index: number;
  /** 버리거나 덮어쓸 수 없다(훼손 구간의 유일한 핵심 프레임) */
  protected: boolean;
  /** 이 프레임에 들린 대사(화자·본문) */
  lines: { id: Id; speaker?: string; text: string; provenance: Provenance; glossary?: Gloss[] }[];
}

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
  /** 이번 배정의 종결(상태에서 만든 것) */
  current: boolean;
  opened: boolean;
}

/** 업무 → 종결된 보고서 탭. 이번 건이 맨 위, 이어서 콘텐츠의 옛 보고서(지금 현실 기준). */
export function selectClosedReports(s: PersistedState, c: ContentBundle = defaultContent): ClosedReportView[] {
  const out: ClosedReportView[] = [];
  for (const a of c.assignments) {
    const cl = s.closures[a.id];
    if (!cl) continue;
    out.push({
      id: a.id,
      code: a.code,
      when: '오늘',
      officer: a.officer,
      verdict: STAMP_LABEL[cl.shownVerdict],
      classification: cl.classification,
      note: cl.note,
      fields: [{ label: '근거 프레임', value: `${cl.frameIds.length}장` }],
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

export interface ReportView {
  reportId: Id;
  unlocked: boolean;
  filed: boolean;
  draft: ReportDraft;
  /** 마지막 제출 판정(제출 전 null) */
  result: ReportResult | null;
  /** 언제 칸: 붙인 자료가 함의하는 범위(플레이어 자신의 근거 — 공개 가능) */
  impliedYears: { from?: number; to?: number };
  /** 붙일 수 있는 것: 프레임 + 열어 본 DB 기록 */
  attachable: { frames: Id[]; records: Id[] };
}

export function selectReport(
  s: PersistedState & { lastReport?: Record<Id, ReportResult> },
  reportId?: Id,
  c: ContentBundle = defaultContent,
): ReportView | null {
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
}

/** 도착 순서대로, 지금 현실의 본문으로. thread 를 주면 그 대화만. 다시 쓰인 표식은 없다. */
export function selectInbox(s: PersistedState, c: ContentBundle = defaultContent, thread?: Message['thread']): InboxItem[] {
  const byId = new Map(c.messages.map((m) => [m.id, m]));
  const layers = layersOf(c);
  return s.inbox
    .map((id) => byId.get(id))
    .filter((m): m is Message => !!m && (!thread || m.thread === thread))
    .map((m) => ({ message: messageView(m, layers, s), read: s.read.includes(m.id), reply: s.replies[m.id] }));
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

/** 관측 훼손 구간(뷰어 degraded 프롭) */
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

/** @deprecated v3 에는 코치마크가 없다(힌트는 메신저로만). 뷰어 호환용으로 항상 null. */
export function selectTutorial(..._args: unknown[]): null {
  return null;
}

export interface Progress {
  stamped: number;
  frames: number;
  heard: number;
  recordsOpened: number;
  closed: boolean;
  corrected: boolean;
  filed: boolean;
}

export function selectProgress(s: PersistedState): Progress {
  return {
    stamped: Object.keys(s.checklist).length,
    frames: s.frames.length,
    heard: s.heard.length,
    recordsOpened: s.recordsOpened.length,
    closed: Object.keys(s.closures).length > 0,
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

export const useGameStore = createGameStore();

