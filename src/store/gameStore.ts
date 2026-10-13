import { create } from 'zustand';
import type { ModalKind } from '@/core/bus';
import { advanceStage, completion, countAtLeast, toStage } from '@/core/collection';
import { indexContent, maxLevel, type ContentIndex } from '@/core/content';
import { resolveDeduction } from '@/core/deduction';
import { addNote, emptyNotebook, openQuestions, resolveNote } from '@/core/notebook';
import { loadGame, saveGame, type PersistedState, type SaveFile, type SaveSlot, type Settings } from '@/core/save';
import type {
  CollectionStage,
  ContentBundle,
  DeductionSubmission,
  DialogueLine,
  FlagValue,
  Grants,
  Id,
  Interactable,
  JudgeContext,
  JudgeResult,
  NotebookGrant,
  Reward,
} from '@/core/types';
import { availableLines, canInteract } from '@/core/world';
import { content as defaultContent } from '@/data';

export interface UiState {
  modal: { kind: ModalKind; id?: Id } | null;
  paused: boolean;
}

export interface ExamineResult {
  object: Interactable;
  lines: string[];
  /** 이번 상호작용으로 실제 상태가 바뀐 보상들 */
  gained: Reward[];
}

export interface GameActions {
  collectEvidence(id: Id, level?: number): boolean;
  revealEvidence(id: Id, level: number): boolean;
  examine(objectId: Id): ExamineResult | null;
  completeObservation(id: Id): Reward[];
  talk(npcId: Id): { lines: DialogueLine[]; gained: Reward[] } | null;
  submitDeduction(sub: DeductionSubmission): JudgeResult;
  advanceCollection(entryId: Id, stage: CollectionStage): boolean;
  applyRewards(rewards: readonly Reward[]): Reward[];
  setFlag(flag: string, value?: FlagValue): void;
  addNote(note: NotebookGrant): void;
  addHypothesis(text: string, refIds?: Id[]): Id;
  resolveQuestion(noteId: Id): void;
  setScene(sceneId: Id | null): void;
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
  lastSavedAt: string | null;
}

export const DEFAULT_SETTINGS: Settings = { textSpeed: 1, volume: 0.8, showInteractHints: true, showProvenance: false };

export function initialPersisted(): PersistedState {
  return {
    flags: {},
    evidence: {},
    collection: {},
    notebook: emptyNotebook(),
    solved: {},
    attempts: {},
    observations: [],
    examined: [],
    currentScene: null,
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
  ];
}

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

export function createGameStore(content: ContentBundle = defaultContent) {
  const idx = indexContent(content);

  return create<GameState>()((set, get) => {
    const persisted = () => pickPersisted(get());
    const commit = (rewards: readonly Reward[]) => {
      const { state, gained } = reduceRewards(get(), rewards, idx);
      if (gained.length) set(state);
      return gained;
    };
    const judgeContext = (): JudgeContext => ({ evidence: idx.evidence, persons: idx.persons, owned: get().evidence });

    const actions: GameActions = {
      collectEvidence: (id, level = 0) => commit([{ type: 'evidence', evidenceId: id, level }]).length > 0,
      revealEvidence: (id, level) =>
        get().evidence[id] !== undefined && commit([{ type: 'evidence', evidenceId: id, level }]).length > 0,

      examine(objectId) {
        const obj = idx.worldObjects[objectId];
        if (!obj || !canInteract(obj, get().flags)) return null;
        const gained = commit(grantsToRewards(obj.grants));
        if (obj.grants?.observation) gained.push(...actions.completeObservation(obj.grants.observation));
        if (!get().examined.includes(objectId)) set({ examined: [...get().examined, objectId] });
        return { object: obj, lines: obj.examine, gained };
      },

      completeObservation(id) {
        const obs = idx.observations[id];
        if (!obs) return [];
        if (!get().observations.includes(id)) set({ observations: [...get().observations, id] });
        return commit(grantsToRewards(obs.grants));
      },

      talk(npcId) {
        const npc = idx.npcs[npcId];
        if (!npc) return null;
        const lines = availableLines(npc, get().flags);
        const gained = commit(lines.flatMap((l) => grantsToRewards(l.grants)));
        return { lines, gained };
      },

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
        commit(rewards);
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

      setScene: (sceneId) => set({ currentScene: sceneId }),
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
        set({
          ...base,
          ...file.data,
          settings: { ...base.settings, ...file.data.settings },
          notebook: { ...base.notebook, ...file.data.notebook },
          ui: { modal: null, paused: false },
          lastResult: null,
          lastSavedAt: file.savedAt,
        });
        return true;
      },
      reset: () =>
        set({ ...initialPersisted(), ui: { modal: null, paused: false }, lastResult: null, lastSavedAt: null }),
    };

    return {
      ...initialPersisted(),
      ui: { modal: null, paused: false },
      lastResult: null,
      lastSavedAt: null,
      ...actions,
    };
  });
}

export type GameStore = ReturnType<typeof createGameStore>;

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
