/**
 * 결록 단말 스토어(Zustand). 진행 상태 + 액션. core 를 호출해 상태를 바꾼다.
 * 앱 5개: 메신저 · 검색(원문 보기 포함) · 관측 뷰어 · 증거 보드(카드 겹치기 포함) · 손 노트(기록관 탭 포함).
 * 상태가 바뀔 때마다 syncState() 가 메시지 도착, 정합성 보정(말소), 현실 이동(복원), 튜토리얼 완료를 반영한다(순수 함수).
 * 복원은 자동이 아니다: 추리 확정 → 손 노트에 기록하기(recordFact) → 그 기록을 조건으로 가진 RealityShift 적용.
 */
import { create } from 'zustand';
import type { ModalKind } from '@/core/bus';
import { advanceStage, completion, countAtLeast, toStage } from '@/core/collection';
import { evidenceView, indexContent, maxLevel, type ContentIndex } from '@/core/content';
import { resolveDeduction } from '@/core/deduction';
import { addNote, emptyNotebook, openQuestions, resolveNote } from '@/core/notebook';
import { impliedRange } from '@/core/chronology';
import {
  clampMinute,
  displaySpeaker,
  hotspotStatus,
  linesAt,
  npcRoute,
  timelineTicks,
  viewerFrame,
  type HotspotStatus,
  type NpcRoute,
  type TimelineTick,
  type ViewerFrame,
} from '@/core/observation';
import { loadGame, saveGame, type PersistedState, type SaveFile, type SaveSlot, type Settings } from '@/core/save';
import { NO_ARTICLE_TEXT, searchIndex, searchMessage, type MatchKind, type SearchStatus } from '@/core/search';
import {
  activeSteps,
  checkState,
  coachVisible,
  dueCorrections,
  dueMessages,
  dueShifts,
  emptyStats,
  emptyTutorial,
  findLink,
  hintText,
  hintTier,
  isAppUnlocked,
  memoView,
  messageText,
  messageView,
  newlyDone,
  recordView,
  searchResultsView,
  tierFromIdle,
  unlockedApps,
  type RealityLayers,
} from '@/core/terminal';
import type {
  AppId,
  ArchiveExhibit,
  CollectionField,
  CollectionStage,
  ContentBundle,
  DbRecord,
  EvidenceLink,
  RecordAct,
  RewriteEntry,
  TimeConstraint,
  DeductionSubmission,
  FlagValue,
  Grants,
  Id,
  JudgeContext,
  JudgeResult,
  Message,
  NotebookGrant,
  PlayStats,
  Provenance,
  Reward,
  SearchResultRef,
  SourceRef,
  TerminalMemo,
  TutorialStep,
} from '@/core/types';
import { content as defaultContent } from '@/data';

export type FailKind = NonNullable<TutorialStep['failOn']>[number];

export interface UiState {
  modal: { kind: ModalKind; id?: Id } | null;
  paused: boolean;
  /** 앞에 열린 앱(모바일: 전체 화면 앱, 데스크톱: 활성 창) */
  app: AppId | null;
  /** 앱 안의 대상(예: 사료 뷰어의 sourceId) */
  appTarget?: Id;
  /** 진행 중인 관측 */
  observation: { timelineId: Id } | null;
}

export interface SearchHit {
  entryId: Id;
  match: MatchKind;
  term: string;
  results: SearchResultRef[];
  /** 말소된 기사: 결과 없음('해당 기사 없음'). 복원 뒤에는 false(표식 없음). */
  noArticle: boolean;
  /** 관측·사료와 연결되어 열린 조건부 보상의 메모 */
  linked: string[];
}

export interface SearchOutcome {
  query: string;
  normalized: string;
  status: SearchStatus;
  hits: SearchHit[];
  gained: Reward[];
  message: string;
}

export interface TapLine {
  speaker?: string;
  text: string;
  provenance: Provenance;
  sources?: SourceRef[];
}

export interface TapResult {
  hotspotId: Id;
  targetId: Id;
  kind: 'object' | 'npc';
  /** 화면 이름(신원 확인 전에는 '미확인 관료' 등) */
  label: string;
  minute: number;
  status: Exclude<HotspotStatus, 'hidden'>;
  lines: TapLine[];
  gained: Reward[];
}

export type PhraseStatus = 'registered' | 'already' | 'no_link' | 'unavailable';
export interface PhraseResult {
  status: PhraseStatus;
  message: string;
  gained: Reward[];
}

export type LinkStatus = 'linked' | 'already' | 'no_link' | 'not_ready' | 'not_owned';
export interface LinkResult {
  status: LinkStatus;
  message: string;
  link?: EvidenceLink;
  gained: Reward[];
}

export type RecordStatus = 'recorded' | 'already' | 'not_ready' | 'unknown';
export interface RecordResult {
  status: RecordStatus;
  act?: RecordAct;
  /** 이 기록으로 적용된 현실 이동 */
  shiftId?: Id;
  rewrites: RewriteEntry[];
}

export interface ExhibitResult {
  exhibit: ArchiveExhibit;
  lines: string[];
  gained: Reward[];
}

export interface TutorialView {
  step: TutorialStep;
  coach: boolean;
  tier: number;
  hint: string | null;
}

export interface GameActions {
  // ── 단말 ──
  openApp(app: AppId, target?: Id): boolean;
  closeApp(): void;
  search(query: string): SearchOutcome;
  startObservation(timelineId?: Id): boolean;
  scrubObservation(minute: number): number;
  tapHotspot(hotspotId: Id): TapResult | null;
  endObservation(): Reward[];
  openSource(sourceId: Id): boolean;
  registerPhrase(sourceId: Id, phraseId: Id): PhraseResult;
  readMessage(id: Id): Message | null;
  chooseReply(messageId: Id, choiceId: Id): boolean;
  inspectExhibit(id: Id): ExhibitResult | null;
  /** 증거 보드: 카드 겹치기. 정확히 맞는 조합이면 추론 카드가 생긴다. */
  linkEvidence(ids: Id[]): LinkResult;
  /** 손 노트에 기록하기(사관의 직필) → 복원(RealityShift) */
  recordFact(actId: Id): RecordResult;
  /** UI 가 다시 쓰기 연출을 마쳤음을 알림(recentRewrites 비움) */
  ackRewrites(): void;
  /** UI 가 자동으로 연 손 노트의 이전/이후 쪽을 닫음 */
  ackDiffPage(): void;
  // ── 튜토리얼 ──
  dismissCoach(stepId: Id): void;
  tickIdle(seconds: number): TutorialView | null;
  reportFail(kind: FailKind): void;
  // ── 추리·수집·노트 ──
  collectEvidence(id: Id, level?: number): boolean;
  revealEvidence(id: Id, level: number): boolean;
  submitDeduction(sub: DeductionSubmission): JudgeResult;
  advanceCollection(entryId: Id, stage: CollectionStage): boolean;
  applyRewards(rewards: readonly Reward[]): Reward[];
  setFlag(flag: string, value?: FlagValue): void;
  addNote(note: NotebookGrant): void;
  addHypothesis(text: string, refIds?: Id[]): Id;
  resolveQuestion(noteId: Id): void;
  // ── UI·설정·저장 ──
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
  lastResult: JudgeResult | null;
  lastSearch: SearchOutcome | null;
  lastTap: TapResult | null;
  lastSavedAt: string | null;
  /** 방금 일어난 다시 쓰기(말소·복원). UI 가 깜빡임/번짐 연출 뒤 ackRewrites(). 저장되지 않음. */
  recentRewrites: RewriteEntry[];
  /** 방금 복원이 일어났다: UI 가 손 노트의 이 현실 이동(shift id) 이전/이후 쪽을 자동으로 연다. 저장되지 않음. */
  pendingDiffPageId: Id | null;
}

export const DEFAULT_SETTINGS: Settings = {
  textSpeed: 1,
  volume: 0.8,
  showInteractHints: true,
  showProvenance: false,
  hintLevel: 'normal',
  haptics: true,
  reduceFlicker: false,
};

export const DEFAULT_TIMELINE = 'tl_obs001';
/** 원문 대조(구절 등록) 권한. 정합성 보정 뒤 동료가 열어 준다(검색 앱의 원문 보기 안). */
export const SOURCE_ACCESS_FLAG = 'source_access';
const SEARCH_LOG_MAX = 200;

export function initialPersisted(): PersistedState {
  return {
    flags: {},
    evidence: {},
    collection: {},
    notebook: emptyNotebook(),
    solved: {},
    attempts: {},
    observations: [],
    terms: [],
    searchLog: [],
    searched: [],
    sources: [],
    phrases: [],
    inbox: [],
    read: [],
    replies: {},
    corrections: [],
    shifts: [],
    rewriteLog: [],
    links: [],
    recorded: [],
    tapped: [],
    exhibitsSeen: [],
    obsMinute: {},
    appsOpened: [],
    stats: emptyStats(),
    tutorial: emptyTutorial(),
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const PERSISTED_KEYS = Object.keys(initialPersisted()) as (keyof PersistedState)[];

export function pickPersisted(s: PersistedState): PersistedState {
  const out = {} as Record<keyof PersistedState, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = s[k];
  return structuredClone(out) as PersistedState;
}

export function grantsToRewards(g?: Grants): Reward[] {
  if (!g) return [];
  return [
    ...(g.evidence ?? []).map((e): Reward => ({ type: 'evidence', evidenceId: e.id, level: e.level })),
    ...(g.collect ?? []).map((c): Reward => ({ type: 'collection', entryId: c.entryId, stage: c.stage ?? 1 })),
    ...(g.notebook ?? []).map((note): Reward => ({ type: 'notebook', note })),
    ...(g.flags ?? []).map((flag): Reward => ({ type: 'flag', flag })),
    ...(g.terms ?? []).map((term): Reward => ({ type: 'term', term })),
    ...(g.sources ?? []).map((sourceId): Reward => ({ type: 'source', sourceId })),
  ];
}

const addUnique = <T>(list: readonly T[], v: T): T[] => (list.includes(v) ? (list as T[]) : [...list, v]);

/** 보상 하나를 적용. 상태가 바뀌지 않으면 같은 객체를 돌려준다. */
export function reduceReward(s: PersistedState, r: Reward, idx: ContentIndex): PersistedState {
  switch (r.type) {
    case 'evidence': {
      const ev = idx.evidence[r.evidenceId];
      if (!ev) return s;
      const level = Math.min(Math.max(0, r.level ?? 0), maxLevel(ev));
      const cur = s.evidence[r.evidenceId];
      if (cur !== undefined && cur >= level) return s;
      return { ...s, evidence: { ...s.evidence, [r.evidenceId]: level } };
    }
    case 'collection': {
      if (!idx.collection[r.entryId]) return s;
      const next = advanceStage(s.collection, r.entryId, r.stage);
      return next === s.collection ? s : { ...s, collection: { ...next } };
    }
    case 'notebook': {
      const nb = addNote(s.notebook, r.note);
      return nb === s.notebook ? s : { ...s, notebook: nb };
    }
    case 'resolveQuestion': {
      const nb = resolveNote(s.notebook, r.noteId);
      const already = s.notebook.question.find((q) => q.id === r.noteId)?.resolved;
      return nb === s.notebook || already ? s : { ...s, notebook: nb };
    }
    case 'flag': {
      const value = r.value ?? true;
      return s.flags[r.flag] === value ? s : { ...s, flags: { ...s.flags, [r.flag]: value } };
    }
    case 'term': {
      const t = r.term.trim();
      return !t || s.terms.includes(t) ? s : { ...s, terms: [...s.terms, t] };
    }
    case 'source': {
      if (!idx.sources[r.sourceId] || s.sources.includes(r.sourceId)) return s;
      return { ...s, sources: [...s.sources, r.sourceId] };
    }
  }
}

export function reduceRewards(s: PersistedState, rewards: readonly Reward[], idx: ContentIndex) {
  const gained: Reward[] = [];
  let state = s;
  for (const r of rewards) {
    const next = reduceReward(state, r, idx);
    if (next !== state) gained.push(r);
    state = next;
  }
  return { state, gained };
}

const layersOf = (c: ContentBundle): RealityLayers => ({ corrections: c.corrections, shifts: c.shifts });

/** 레코드를 다시 쓰기 기록용 한 덩어리 글로. */
export const recordSummary = (r: DbRecord) => r.fields.map((f) => `${f.label}: ${f.value}`).join('\n');

/** 보정(말소) 하나를 적용하고 다시 쓰기 기록을 남긴다. */
function applyCorrection(s: PersistedState, id: Id, c: ContentBundle, idx: ContentIndex): { state: PersistedState; log: RewriteEntry[] } {
  const e = idx.corrections[id]!;
  const layers = layersOf(c);
  const log: RewriteEntry[] = [];
  const after: PersistedState = { ...s, corrections: [...s.corrections, id] };
  const entry = (kind: RewriteEntry['kind'], targetId: Id, before: string, aft: string): RewriteEntry => ({
    seq: s.rewriteLog.length + log.length,
    sourceId: id,
    tone: 'erase',
    kind,
    targetId,
    before,
    after: aft,
  });
  for (const p of e.memoPatches) {
    const memo = idx.memos[p.memoId];
    if (!memo || !checkState(s, memo.when)) continue;
    const b = memoView(memo, layers, s);
    const a = memoView(memo, layers, after);
    if (b && b.text !== (a?.text ?? '')) log.push(entry('memo', memo.id, b.text, a?.text ?? ''));
  }
  for (const rid of new Set(e.recordPatches.map((p) => p.recordId))) {
    const rec = idx.records[rid];
    if (!rec) continue;
    const b = recordSummary(recordView(rec, layers, s));
    const a = recordSummary(recordView(rec, layers, after));
    if (a !== b) log.push(entry('record', rid, b, a));
  }
  let state = reduceRewards(after, grantsToRewards(e.grants), idx).state;
  state = { ...state, rewriteLog: [...state.rewriteLog, ...log] };
  return { state, log };
}

/** 현실 이동(복원) 하나를 적용: 다시 쓰기 기록(이미 도착한 메시지만), 복원 보상, 손 노트 이전/이후. */
function applyShift(s: PersistedState, id: Id, c: ContentBundle, idx: ContentIndex): { state: PersistedState; log: RewriteEntry[] } {
  const sh = idx.shifts[id]!;
  const layers = layersOf(c);
  const after: PersistedState = { ...s, shifts: [...s.shifts, id] };
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
    if (!m || !s.inbox.includes(m.id)) continue; // 아직 오지 않은 메시지는 처음부터 새 현실로 도착한다
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
  const diffNotes: Reward[] = sh.notebookDiff.map((d) => ({
    type: 'notebook',
    note: { id: d.id, section: 'verified', text: d.after, before: d.before, refIds: [sh.id], provenance: d.provenance ?? 'verified' },
  }));
  let state = reduceRewards(after, [...grantsToRewards(sh.unlocks), ...diffNotes], idx).state;
  state = { ...state, rewriteLog: [...state.rewriteLog, ...log] };
  return { state, log };
}

/**
 * 조건으로 생기는 일을 반영(순수): 메시지 도착(도착 시 grants), 정합성 보정(말소), 현실 이동(복원), 튜토리얼 완료.
 * 연쇄(도착 → 플래그 → 다음 도착)를 위해 변화가 없을 때까지 반복한다.
 */
export function syncState(s0: PersistedState, c: ContentBundle, idx: ContentIndex) {
  let s = s0;
  const arrived: Id[] = [];
  const corrected: Id[] = [];
  const shifted: Id[] = [];
  const rewrites: RewriteEntry[] = [];
  for (let guard = 0; guard < 24; guard++) {
    let changed = false;
    for (const e of dueCorrections(c.corrections, s)) {
      const r = applyCorrection(s, e.id, c, idx);
      s = r.state;
      rewrites.push(...r.log);
      corrected.push(e.id);
      changed = true;
    }
    for (const sh of dueShifts(c.shifts, s)) {
      const r = applyShift(s, sh.id, c, idx);
      s = r.state;
      rewrites.push(...r.log);
      shifted.push(sh.id);
      changed = true;
    }
    for (const m of dueMessages(c.messages, s, new Set(s.inbox))) {
      s = { ...s, inbox: [...s.inbox, m.id] };
      s = reduceRewards(s, grantsToRewards(m.grants), idx).state;
      arrived.push(m.id);
      changed = true;
    }
    const done = newlyDone(c.tutorial, s, s.tutorial);
    if (done.length) {
      s = { ...s, tutorial: { ...s.tutorial, done: [...s.tutorial.done, ...done] } };
      changed = true;
    }
    if (!changed) break;
  }
  return { state: s, arrived, corrected, shifted, rewrites };
}

/** v1 저장 등으로 검색어 수첩이 비었을 때: 이미 얻은 플래그를 주는 획득처의 검색어를 채운다. */
export function backfillTerms(s: PersistedState, c: ContentBundle): PersistedState {
  const terms = new Set(s.terms);
  const consider = (g?: Grants) => {
    if (g?.terms?.length && g.flags?.length && g.flags.every((f) => s.flags[f])) g.terms.forEach((t) => terms.add(t));
  };
  c.worldObjects.forEach((o) => consider(o.grants));
  c.npcs.forEach((n) => n.dialogue.forEach((l) => consider(l.grants)));
  c.messages.forEach((m) => s.inbox.includes(m.id) && m.grants?.terms?.forEach((t) => terms.add(t)));
  return terms.size === s.terms.length ? s : { ...s, terms: [...terms] };
}

const freshUi = (): UiState => ({ modal: null, paused: false, app: null, observation: null });
const freshTransient = () => ({
  ui: freshUi(),
  lastResult: null,
  lastSearch: null,
  lastTap: null,
  recentRewrites: [] as RewriteEntry[],
  pendingDiffPageId: null as Id | null,
});

const NO_LINES_TEXT = '(지금은 별다른 말이나 움직임이 없다.)';
const LINK_MISS_TEXT = '이 카드들은 아직 하나로 이어지지 않는다.';
const HIDDEN_DEFAULT = '지금은 잘 보이지 않는다.';
const PHRASE_MISS_DEFAULT = '이 구절과 맞춰 볼 관측 기록이 아직 없다.';

export function createGameStore(content: ContentBundle = defaultContent) {
  const idx = indexContent(content);
  const personEntry = (personId?: Id) =>
    personId ? content.collection.find((e) => e.category === 'person' && e.refId === personId) : undefined;

  const initial = syncState(initialPersisted(), content, idx).state;

  return create<GameState>()((set, get) => {
    const persisted = () => pickPersisted(get());
    /** 영속 상태를 바꾸고 동기화 */
    const apply = (next: PersistedState) => {
      const r = syncState(next, content, idx);
      const extra: Partial<GameState> = {};
      if (r.rewrites.length) extra.recentRewrites = [...get().recentRewrites, ...r.rewrites];
      if (r.shifted.length) extra.pendingDiffPageId = r.shifted[r.shifted.length - 1]!;
      set({ ...r.state, ...extra });
      return r;
    };
    const commit = (rewards: readonly Reward[]) => {
      const { state, gained } = reduceRewards(get(), rewards, idx);
      if (gained.length) apply(state);
      return gained;
    };
    const bumpStats = (patch: Partial<Record<keyof PlayStats, number>>, extra: Partial<PersistedState> = {}) => {
      const s = get();
      const stats = { ...s.stats };
      for (const [k, v] of Object.entries(patch)) stats[k as keyof PlayStats] += v ?? 0;
      apply({ ...s, ...extra, stats });
    };
    const judgeContext = (): JudgeContext => ({ evidence: idx.evidence, persons: idx.persons, owned: get().evidence });
    const activeTimeline = () => {
      const o = get().ui.observation;
      return o ? idx.timelines[o.timelineId] : undefined;
    };

    const actions: GameActions = {
      // ── 앱 ──
      openApp(app, target) {
        if (!isAppUnlocked(content.apps, app, get())) return false;
        set((s) => ({ ui: { ...s.ui, app, appTarget: target } }));
        if (!get().appsOpened.includes(app)) apply({ ...get(), appsOpened: [...get().appsOpened, app] });
        return true;
      },
      closeApp: () => set((s) => ({ ui: { ...s.ui, app: null, appTarget: undefined } })),

      // ── 검색 ──
      search(query) {
        const s0 = get();
        const res = searchIndex(content.searchEntries, query, (e) => checkState(s0, e.requires));
        const rewards: Reward[] = [];
        const hits: SearchHit[] = res.matches.map(({ entry, match, term }) => {
          const view = searchResultsView(entry, layersOf(content), s0);
          rewards.push(...grantsToRewards(entry.grants));
          for (const r of view.results) if (r.kind === 'source') rewards.push({ type: 'source', sourceId: r.id });
          const linked: string[] = [];
          for (const c of entry.conditional ?? [])
            if (checkState(s0, c.when)) {
              rewards.push(...grantsToRewards(c.grants));
              if (c.note) linked.push(c.note);
            }
          return { entryId: entry.id, match, term, results: view.results, noArticle: view.noArticle, linked };
        });
        const top = hits[0];
        const status: SearchStatus = top?.noArticle ? 'no_article' : res.status;
        const topEntry = top && idx.searchEntries[top.entryId];
        const newIds = res.matches.map((m) => m.entry.id).filter((id) => !s0.searched.includes(id));
        const miss = res.status === 'unknown' || res.status === 'too_short';
        const log = [
          ...s0.searchLog,
          { seq: s0.stats.searches, query, normalized: res.normalized, status, entryIds: res.matches.map((m) => m.entry.id) },
        ].slice(-SEARCH_LOG_MAX);
        if (res.status !== 'empty')
          bumpStats(
            { searches: 1, unknownSearches: miss ? 1 : 0 },
            { searchLog: log, searched: [...s0.searched, ...newIds] },
          );
        const gained = commit(rewards);
        if (miss) actions.reportFail('unknown_search');
        const outcome: SearchOutcome = {
          query,
          normalized: res.normalized,
          status,
          hits,
          gained,
          message:
            status === 'no_article'
              ? searchMessage(status, query, hits.filter((h) => !h.noArticle).length, 0, topEntry?.noArticleText)
              : searchMessage(status, query, hits.length, newIds.length),
        };
        set({ lastSearch: outcome });
        return outcome;
      },

      // ── 관측 뷰어 ──
      startObservation(timelineId = DEFAULT_TIMELINE) {
        const tl = idx.timelines[timelineId];
        if (!tl || !isAppUnlocked(content.apps, 'viewer', get())) return false;
        set((s) => ({ ui: { ...s.ui, observation: { timelineId } } }));
        const s = get();
        if (s.obsMinute[tl.id] === undefined) apply({ ...s, obsMinute: { ...s.obsMinute, [tl.id]: tl.initial } });
        completeObservation(tl.observationId);
        return true;
      },
      scrubObservation(minute) {
        const tl = activeTimeline();
        if (!tl) return NaN;
        const m = clampMinute(tl, minute);
        const s = get();
        if (s.obsMinute[tl.id] !== m) bumpStats({ scrubs: 1 }, { obsMinute: { ...s.obsMinute, [tl.id]: m } });
        return m;
      },
      tapHotspot(hotspotId) {
        const tl = activeTimeline();
        const h = tl?.hotspots.find((x) => x.id === hotspotId);
        if (!tl || !h) return null;
        const s0 = get();
        const minute = s0.obsMinute[tl.id] ?? tl.initial;
        const status = hotspotStatus(h, minute, s0.flags);
        if (status === 'hidden') return null;
        bumpStats({ taps: 1 }, { tapped: addUnique(s0.tapped, hotspotId) });
        let result: TapResult;
        if (h.kind === 'object') {
          const obj = idx.worldObjects[h.targetId]!;
          const open = status === 'available';
          const gained = open ? commit(grantsToRewards(obj.grants)) : [];
          result = {
            hotspotId,
            targetId: obj.id,
            kind: 'object',
            label: obj.label,
            minute,
            status,
            lines: (open ? obj.examine : [obj.hiddenText ?? HIDDEN_DEFAULT]).map((text) => ({
              text,
              provenance: obj.provenance,
              sources: obj.sources,
            })),
            gained,
          };
        } else {
          const npc = idx.npcs[h.targetId]!;
          const lines = linesAt(npc, minute, s0.flags);
          const gained = commit(lines.flatMap((l) => grantsToRewards(l.grants)));
          const entry = personEntry(npc.personId);
          const identified = !npc.personId || (!!entry && (get().collection[entry.id] ?? 0) >= 2);
          const person = npc.personId ? idx.persons[npc.personId] : undefined;
          const label = identified && person ? person.name : npc.label;
          result = {
            hotspotId,
            targetId: npc.id,
            kind: 'npc',
            label,
            minute,
            status,
            lines: lines.length
              ? lines.map((l) => ({
                  speaker: displaySpeaker(npc, l, identified, person?.name, person?.hanja),
                  text: l.text,
                  provenance: l.provenance,
                  sources: l.sources,
                }))
              : [{ speaker: label, text: NO_LINES_TEXT, provenance: 'fictional' }],
            gained,
          };
        }
        set({ lastTap: result });
        return result;
      },
      endObservation() {
        const tl = activeTimeline();
        if (!tl) return [];
        set((s) => ({ ui: { ...s.ui, observation: null } }));
        return tl.returnObservationId ? completeObservation(tl.returnObservationId) : [];
      },

      // ── 사료 뷰어 ──
      openSource(sourceId) {
        if (!get().sources.includes(sourceId)) return false;
        return actions.openApp('search', sourceId);
      },
      registerPhrase(sourceId, phraseId) {
        const ph = idx.phrases[phraseId];
        const s0 = get();
        if (!ph || ph.sourceId !== sourceId || !s0.sources.includes(sourceId))
          return { status: 'unavailable', message: '이 사료에서 고를 수 없는 구절입니다.', gained: [] };
        if (!s0.flags[SOURCE_ACCESS_FLAG])
          return { status: 'unavailable', message: '원문 대조 권한이 아직 없습니다.', gained: [] };
        if (s0.phrases.includes(phraseId)) return { status: 'already', message: '이미 등록한 구절입니다.', gained: [] };
        if (!checkState(s0, ph.when)) {
          bumpStats({ phraseMisses: 1 });
          actions.reportFail('phrase_miss');
          return { status: 'no_link', message: ph.missText ?? PHRASE_MISS_DEFAULT, gained: [] };
        }
        bumpStats({ phrases: 1 }, { phrases: [...s0.phrases, phraseId] });
        const gained = commit(grantsToRewards(ph.grants));
        return { status: 'registered', message: '구절을 증거로 등록했다.', gained };
      },

      // ── 메신저 ──
      readMessage(id) {
        const m = idx.messages[id];
        if (!m || !get().inbox.includes(id)) return null;
        if (!get().read.includes(id)) apply({ ...get(), read: [...get().read, id] });
        return m;
      },
      chooseReply(messageId, choiceId) {
        const m = idx.messages[messageId];
        const s = get();
        const choice = m?.choices?.find((c) => c.id === choiceId);
        if (!m || !choice || !s.inbox.includes(messageId) || s.replies[messageId]) return false;
        const next = { ...s, replies: { ...s.replies, [messageId]: choiceId }, read: addUnique(s.read, messageId) };
        apply(reduceRewards(next, (choice.setsFlags ?? []).map((flag): Reward => ({ type: 'flag', flag })), idx).state);
        return true;
      },

      // ── 기록관 ──
      inspectExhibit(id) {
        const ex = idx.exhibits[id];
        const s = get();
        if (!ex || !checkState(s, ex.requires)) return null;
        if (!s.exhibitsSeen.includes(id)) bumpStats({ exhibits: 1 }, { exhibitsSeen: [...s.exhibitsSeen, id] });
        return { exhibit: ex, lines: ex.lines, gained: commit(grantsToRewards(ex.grants)) };
      },

      // ── 증거 보드: 카드 겹치기 ──
      linkEvidence(ids) {
        const s0 = get();
        const uniq = [...new Set(ids)];
        if (uniq.length < 2) return { status: 'no_link', message: '카드를 두 장 이상 겹쳐 보세요.', gained: [] };
        if (uniq.some((id) => s0.evidence[id] === undefined))
          return { status: 'not_owned', message: '아직 확보하지 않은 카드는 겹칠 수 없습니다.', gained: [] };
        const link = findLink(content.links, uniq);
        if (!link) {
          bumpStats({ linkMisses: 1 });
          actions.reportFail('link_miss');
          return { status: 'no_link', message: LINK_MISS_TEXT, gained: [] };
        }
        if (s0.links.includes(link.id)) return { status: 'already', message: '이미 이어 둔 카드들입니다.', link, gained: [] };
        if (!checkState(s0, link.requires)) {
          bumpStats({ linkMisses: 1 });
          actions.reportFail('link_miss');
          return { status: 'not_ready', message: link.missText ?? LINK_MISS_TEXT, link, gained: [] };
        }
        bumpStats({ links: 1 }, { links: [...s0.links, link.id] });
        const gained = commit([
          { type: 'evidence', evidenceId: link.result.id, level: link.result.level },
          ...grantsToRewards(link.grants),
        ]);
        return { status: 'linked', message: link.text, link, gained };
      },

      // ── 손 노트: 기록하기 ──
      recordFact(actId) {
        const act = idx.acts[actId];
        const s0 = get();
        if (!act) return { status: 'unknown', rewrites: [] };
        if (s0.recorded.includes(actId)) return { status: 'already', act, rewrites: [] };
        if (!checkState(s0, act.requires)) return { status: 'not_ready', act, rewrites: [] };
        const r = apply({ ...s0, recorded: [...s0.recorded, actId] });
        return { status: 'recorded', act, shiftId: r.shifted.includes(act.restores) ? act.restores : undefined, rewrites: r.rewrites };
      },
      ackRewrites: () => set({ recentRewrites: [] }),
      ackDiffPage: () => set({ pendingDiffPageId: null }),

      // ── 튜토리얼 ──
      dismissCoach(stepId) {
        const t = get().tutorial;
        if (!t.dismissed.includes(stepId)) set({ tutorial: { ...t, dismissed: [...t.dismissed, stepId] } });
      },
      tickIdle(seconds) {
        const view = selectTutorial(get(), content, get().ui.app ?? undefined);
        if (!view) return null;
        const tier = tierFromIdle(view.step, seconds, get().settings.hintLevel);
        const t = get().tutorial;
        if (tier > (t.idleTier[view.step.id] ?? 0))
          set({ tutorial: { ...t, idleTier: { ...t.idleTier, [view.step.id]: tier } } });
        return selectTutorial(get(), content, get().ui.app ?? undefined);
      },
      reportFail(kind) {
        const s = get();
        const steps = activeSteps(content.tutorial, s, s.tutorial).filter((st) => st.failOn?.includes(kind));
        if (!steps.length) return;
        const fails = { ...s.tutorial.fails };
        for (const st of steps) fails[st.id] = (fails[st.id] ?? 0) + 1;
        set({ tutorial: { ...s.tutorial, fails } });
      },

      // ── 추리·수집·노트 ──
      collectEvidence: (id, level = 0) => commit([{ type: 'evidence', evidenceId: id, level }]).length > 0,
      revealEvidence: (id, level) =>
        get().evidence[id] !== undefined && commit([{ type: 'evidence', evidenceId: id, level }]).length > 0,

      submitDeduction(sub) {
        const d = idx.deductions[sub.deductionId];
        if (!d || (d.requires && !get().flags[d.requires])) {
          const result: JudgeResult = {
            deductionId: sub.deductionId,
            verdict: 'undetermined',
            feedback: [{ code: 'unknown_deduction', message: '아직 풀 수 없는 추리입니다.' }],
          };
          set({ lastResult: result });
          return result;
        }
        const prev = get().solved[d.id];
        const { result, rewards, improved } = resolveDeduction(d, sub, judgeContext(), prev?.best);
        const attempts = (get().attempts[d.id] ?? 0) + 1;
        set((s) => ({
          lastResult: result,
          attempts: { ...s.attempts, [d.id]: attempts },
          solved: improved
            ? { ...s.solved, [d.id]: { best: result.verdict as 'partial' | 'confirmed', attempts } }
            : s.solved,
        }));
        bumpStats({ deductionAttempts: 1 });
        commit(rewards);
        if (result.verdict === 'wrong' || result.verdict === 'undetermined') actions.reportFail('wrong_deduction');
        return result;
      },

      advanceCollection: (entryId, stage) => commit([{ type: 'collection', entryId, stage: toStage(stage) }]).length > 0,
      applyRewards: (rewards) => commit(rewards),
      setFlag: (flag, value = true) => void commit([{ type: 'flag', flag, value }]),
      addNote: (note) => void commit([{ type: 'notebook', note }]),
      addHypothesis(text, refIds) {
        const nb = get().notebook;
        const id = `hyp_${nb.hypothesis.length + 1}_${Date.now().toString(36)}`;
        commit([{ type: 'notebook', note: { id, section: 'hypothesis', text, refIds } }]);
        return id;
      },
      resolveQuestion: (noteId) => void commit([{ type: 'resolveQuestion', noteId }]),

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
          notebook: { ...base.notebook, ...file.data.notebook },
          stats: { ...base.stats, ...file.data.stats },
          tutorial: { ...base.tutorial, ...file.data.tutorial },
        };
        const synced = backfillTerms(syncState(merged, content, idx).state, content);
        set({ ...synced, ...freshTransient(), lastSavedAt: file.savedAt });
        return true;
      },
      reset: () => set({ ...structuredClone(initial), ...freshTransient(), lastSavedAt: null }),
    };

    function completeObservation(id: Id): Reward[] {
      const obs = idx.observations[id];
      if (!obs) return [];
      if (!get().observations.includes(id)) apply({ ...get(), observations: [...get().observations, id] });
      return commit(grantsToRewards(obs.grants));
    }

    return {
      ...structuredClone(initial),
      ...freshTransient(),
      lastSavedAt: null,
      ...actions,
    };
  });
}

export type GameStore = ReturnType<typeof createGameStore>;

// ── 셀렉터(순수) ────────────────────────────────────────────────
export function selectApps(s: PersistedState, c: ContentBundle = defaultContent): AppId[] {
  return unlockedApps(c.apps, s);
}

export interface InboxItem {
  message: Message;
  read: boolean;
  reply?: Id;
}

/** 도착 순서대로, 지금 현실의 본문으로. thread 를 주면 그 대화만. 다시 쓰인 표식은 없다(selectRewrittenMessages 참고). */
export function selectInbox(s: PersistedState, c: ContentBundle = defaultContent, thread?: Message['thread']): InboxItem[] {
  const byId = new Map(c.messages.map((m) => [m.id, m]));
  const layers = layersOf(c);
  return s.inbox
    .map((id) => byId.get(id))
    .filter((m): m is Message => !!m && (!thread || m.thread === thread))
    .map((m) => ({ message: messageView(m, layers, s), read: s.read.includes(m.id), reply: s.replies[m.id] }));
}

export interface RewrittenMessage {
  messageId: Id;
  /** 플레이어가 처음 본 본문(연필 표시 '어제는 이렇게 말했었다') */
  original: string;
  /** 지금 본문 */
  current: string;
  /** 다시 쓰기들(오래된 순) */
  history: RewriteEntry[];
}

/** 플레이어만 아는 것: 다시 쓰인 메시지와 원래 본문(메신저의 연필 표시용). 플레이어가 본 적 있는 것만. */
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

export const selectUnread = (s: PersistedState) => s.inbox.filter((id) => !s.read.includes(id)).length;

/** 지금 현실의 DB 레코드(보정·복원 반영, 표식 없음). */
export function selectRecord(s: PersistedState, id: Id, c: ContentBundle = defaultContent): DbRecord | undefined {
  const rec = c.records.find((r) => r.id === id);
  return rec && recordView(rec, layersOf(c), s);
}

/** 단말 메모(보정 반영 — 지워진 메모는 없다). 손글씨 노트는 s.notebook 그대로. */
export function selectMemos(s: PersistedState, c: ContentBundle = defaultContent): TerminalMemo[] {
  return c.memos
    .filter((m) => checkState(s, m.when))
    .map((m) => memoView(m, layersOf(c), s))
    .filter((m): m is TerminalMemo => !!m);
}

// ── 복원·기록하기 ──────────────────────────────────────────────
/** 지금 기록할 수 있는 사실(추리 확정 뒤 손 노트의 '기록하기'). 이미 기록한 것은 recorded: true. */
export function selectRecordActs(s: PersistedState, c: ContentBundle = defaultContent) {
  return [...c.acts]
    .sort((a, b) => a.order - b.order)
    .map((act) => ({ act, available: checkState(s, act.requires), recorded: s.recorded.includes(act.id) }))
    .filter((x) => x.available || x.recorded);
}

export interface NotebookDiffPage {
  shiftId: Id;
  title: string;
  tone: 'restore';
  /** 손 노트의 이전(취소선) / 이후(새 글씨) */
  rows: { id: Id; before: string; after: string }[];
}

/** 손 노트의 '복원' 쪽들(이전/이후 나란히). 적용 순. pendingDiffPageId 와 shiftId 로 맞춘다. */
export function selectNotebookDiffs(s: PersistedState, c: ContentBundle = defaultContent): NotebookDiffPage[] {
  return s.shifts
    .map((id) => c.shifts.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((sh) => ({
      shiftId: sh.id,
      title: sh.title,
      tone: 'restore' as const,
      rows: sh.notebookDiff.map((d) => ({ id: d.id, before: d.before, after: d.after })),
    }));
}

export interface Restoration {
  shiftId: Id;
  title: string;
  /** '복원' 도장은 여기(개인 기록관 = 손 노트의 기록관 탭)에만 */
  stamp: '복원';
  items: { kind: 'source' | 'event' | 'record'; id: Id; title: string; provenance: Provenance; sources?: SourceRef[] }[];
}

/** 개인 기록관의 복원 목록(적용 순). */
export function selectRestorations(s: PersistedState, c: ContentBundle = defaultContent): Restoration[] {
  const idx = indexContent(c);
  return s.shifts
    .map((id) => idx.shifts[id])
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((sh) => ({
      shiftId: sh.id,
      title: sh.title,
      stamp: '복원' as const,
      items: sh.restores.map((r) => {
        if (r.kind === 'source') {
          const x = idx.sources[r.id]!;
          return { ...r, title: x.title, provenance: x.provenance, sources: x.sources };
        }
        if (r.kind === 'event') {
          const x = idx.events[r.id]!;
          return { ...r, title: x.name, provenance: x.provenance, sources: x.sources };
        }
        const x = recordView(idx.records[r.id]!, layersOf(c), s);
        return { ...r, title: x.title, provenance: x.provenance, sources: x.sources };
      }),
    }));
}

export type ProvenanceBadge = '검증' | '재구성' | '가상' | '변조';
export const provenanceBadge = (p: Provenance, altered = false): ProvenanceBadge =>
  altered ? '변조' : p === 'verified' ? '검증' : p === 'reconstructed' ? '재구성' : '가상';

/**
 * 엔딩 뒤 기록 열람 모드: 모든 DB 레코드의 지금 상태와 원래 상태. 변조된 레코드(altered)의 원래 상태는 '변조'.
 * 변조 상태는 절대 실제 역사로 표시하지 않는다.
 */
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

/** 도감 항목에서 지금 보이는 필드(단계 + 말소 여부). */
export function selectCodexFields(s: PersistedState, entryId: Id, c: ContentBundle = defaultContent): CollectionField[] {
  const e = c.collection.find((x) => x.id === entryId);
  const stage = s.collection[entryId] ?? 0;
  if (!e) return [];
  return e.fields.filter((f) => f.unlockStage <= stage && (!f.restoredBy || s.shifts.includes(f.restoredBy)));
}

// ── 연도 추리: 카드를 연표에 끌어다 놓는 UI 용 ───────────────────────
export interface YearCard {
  id: Id;
  label: string;
  text: string;
  level: number;
  /** 사료로 검증된 단계인가(단계 1 이상) */
  verified: boolean;
  /** 지금 공개된 연대 제약(없으면 연표에 올려도 경계를 만들지 않는다) */
  time?: TimeConstraint;
  /** 연표 위 모양: 이후(하한) / 이전(상한) / 둘 다 / 없음 */
  shape: 'lower' | 'upper' | 'both' | 'none';
  /** 카드 고유 피드백 한 줄(정답 없음) */
  feedback?: string;
}

/** 보유한 연도 관련 카드(관련 증거 + 연대 제약이 있는 보유 카드). */
export function selectYearCards(s: PersistedState, deductionId = 'ded_year_001', c: ContentBundle = defaultContent): YearCard[] {
  const d = c.deductions.find((x) => x.id === deductionId);
  const ids = new Set<Id>(d?.relevantEvidence ?? []);
  for (const ev of c.evidence) if (s.evidence[ev.id] !== undefined && ev.levels.some((l) => l.time)) ids.add(ev.id);
  const out: YearCard[] = [];
  for (const ev of c.evidence) {
    const level = s.evidence[ev.id];
    if (!ids.has(ev.id) || level === undefined) continue;
    const v = evidenceView(ev, level);
    const t = v.time;
    const shape: YearCard['shape'] = !t
      ? 'none'
      : t.notBefore !== undefined && t.notAfter !== undefined
        ? 'both'
        : t.notBefore !== undefined
          ? 'lower'
          : 'upper';
    out.push({ id: v.id, label: v.label, text: v.text, level: v.level, verified: v.level > 0, time: t, shape, feedback: t?.feedback });
  }
  return out;
}

/** 연표에 올린 카드들이 함의하는 범위(플레이어 자신의 증거로 계산 — 공개 가능). weak 는 경계를 만들지 않는다. */
export function selectYearPreview(s: PersistedState, cardIds: readonly Id[], deductionId = 'ded_year_001', c: ContentBundle = defaultContent) {
  const d = c.deductions.find((x) => x.id === deductionId);
  const views = cardIds
    .map((id) => {
      const ev = c.evidence.find((e) => e.id === id);
      const lv = s.evidence[id];
      return ev && lv !== undefined ? evidenceView(ev, lv) : undefined;
    })
    .filter((v): v is NonNullable<typeof v> => !!v);
  const ctx = d?.kind === 'year' ? d.context : undefined;
  const all = impliedRange(views, ctx, true);
  const decisive = impliedRange(views, ctx, false);
  const conflict = all.from !== undefined && all.to !== undefined && all.from > all.to;
  return { all, decisive, conflict };
}

// ── 관측 뷰어 보조 ─────────────────────────────────────────────
/** 스크럽 막대 눈금(이동·대사 시작·사물 열림). 지금 플래그로 들릴 수 있는 대사만. */
export function selectTimelineTicks(
  s: PersistedState,
  c: ContentBundle = defaultContent,
  timelineId: Id = DEFAULT_TIMELINE,
): TimelineTick[] {
  const tl = c.timelines.find((t) => t.id === timelineId);
  return tl ? timelineTicks(tl, c, s.flags) : [];
}

/** 인물 하나의 하루 동선(경로 하이라이트). */
export function selectNpcRoute(
  s: PersistedState,
  npcId: Id,
  c: ContentBundle = defaultContent,
  timelineId: Id = DEFAULT_TIMELINE,
): NpcRoute | null {
  const tl = c.timelines.find((t) => t.id === timelineId);
  const npc = c.npcs.find((n) => n.id === npcId);
  if (!tl || !npc) return null;
  return npcRoute(tl, npc, s.obsMinute[tl.id] ?? tl.initial);
}

export function selectExhibits(s: PersistedState, c: ContentBundle = defaultContent) {
  return c.exhibits.map((ex) => ({ exhibit: ex, unlocked: checkState(s, ex.requires), seen: s.exhibitsSeen.includes(ex.id) }));
}

/** 현재(또는 지정) 타임라인 프레임. 관측 뷰어 렌더러가 매 스크럽마다 읽는다. */
export function selectViewerFrame(
  s: PersistedState & { ui?: UiState },
  c: ContentBundle = defaultContent,
  timelineId: Id = s.ui?.observation?.timelineId ?? DEFAULT_TIMELINE,
): ViewerFrame | null {
  const tl = c.timelines.find((t) => t.id === timelineId);
  if (!tl) return null;
  return viewerFrame(tl, s.obsMinute[tl.id] ?? tl.initial, c, s.flags);
}

/** 지금 보여 줄 튜토리얼 단계(앱이 주어지면 그 앱 단계 우선) + 코치마크/힌트. */
export function selectTutorial(s: PersistedState, c: ContentBundle = defaultContent, app?: AppId): TutorialView | null {
  const steps = activeSteps(c.tutorial, s, s.tutorial);
  const step = (app && steps.find((st) => st.app === app)) || steps[0];
  if (!step) return null;
  const tier = hintTier(step, s.tutorial, s.settings.hintLevel);
  return { step, coach: coachVisible(step, s.tutorial, s.settings.hintLevel), tier, hint: hintText(step, tier) };
}

export interface Progress {
  observations: { done: number; total: number };
  deductions: { confirmed: number; partial: number; total: number };
  personsIdentified: number;
  artifactsCollected: number;
  sourcesVerified: number;
  eventsRecorded: number;
  archive: number;
  unresolvedQuestions: number;
}

/** 진행도(GDD §14). 인물=정체 식별(2)+, 유물=발견(1)+, 사료=정보 검증(3)+, 사건=관련 기록 연결(4)+. */
export function selectProgress(s: PersistedState, c: ContentBundle = defaultContent): Progress {
  const solved = Object.values(s.solved);
  return {
    observations: { done: s.observations.length, total: c.observations.length },
    deductions: {
      confirmed: solved.filter((r) => r.best === 'confirmed').length,
      partial: solved.filter((r) => r.best === 'partial').length,
      total: c.deductions.length,
    },
    personsIdentified: countAtLeast(c.collection, s.collection, 'person', 2),
    artifactsCollected: countAtLeast(c.collection, s.collection, 'artifact', 1),
    sourcesVerified: countAtLeast(c.collection, s.collection, 'source', 3),
    eventsRecorded: countAtLeast(c.collection, s.collection, 'event', 4),
    archive: completion(c.collection, s.collection).ratio,
    unresolvedQuestions: openQuestions(s.notebook).length,
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
