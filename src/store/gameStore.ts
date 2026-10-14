/**
 * 결록 단말 스토어(v5 「눈을 빌려 다시 쓰기」, Zustand). 설계: docs/DESIGN_V5.md, 메신저: docs/DIALOGUE_GUIDE.md.
 * 상태 전이는 ./engine.ts(순수에 가까운 함수), 화면 보기는 ./selectors.ts. 시계는 createGameStore({ now }) 로 넣는다.
 *
 * ── UI 계약 ─────────────────────────────────────────────────────
 *  시작     startEpisode() · markPrologueSeen()
 *  넘기기   openEye(eyeId) · viewCut(eyeId, index) · closeViewer()
 *  이름     tapFigure(cutId, figureId) → 시트 보기 · tag(figureId, cardId, evidenceId, cutId?) → TagOutcome
 *  방       openRoom(time?) · selectRoomTime(time) · closeRoom() · resolveContradiction(id, claimId)
 *  찾기     search(query) · openCard(id) · openRecord(id) · openDoc(id)
 *  메신저   openMessenger() · closeMessenger() · readMessage() · chooseReply(optionId) · setTouching(bool)
 *  시간     tick() — UI 가 250~500ms 마다 부른다(메신저 배달·힌트·닫히는 눈) · tickIdle() 같은 것 · resume()
 *  다시쓰기 composeRewrite() · placePiece(pieceId) · openSlot(kind) · fillSlot(lineId, kind, value) · clearSlot · removeLine
 *           submitRewrite() · submitLine(lineId)
 *  복원     restore() · advanceRestore() · finishEpilogue()
 *  저장     save(slot) · load(slot) · reset() · setSettings(partial)
 *  연출     fx(큐) → UI 가 보여 준 뒤 ackFx()
 *  보기     selectors.ts 의 select*(EP1, state) — 아래 use* 훅이 감싼다
 */
import { create } from 'zustand';
import { EP1 } from '@/data/v5';
import { loadGame, migrate, saveGame, SaveError, type SaveSlot } from '@/core/save';
import { seedFrom } from '@/core/rng';
import * as M from '@/core/messenger';
import type { Episode, Hhmm, Id, SlotKind } from '@/core/types';
import * as E from './engine';
import { selectCut } from './selectors';
import { DEFAULT_SETTINGS, freshState, pickPersisted, PERSISTED_KEYS, type PersistedState, type Settings } from './state';

export * from './state';
export * from './selectors';
export type { Fx, TagOutcome, SearchOutcome, SubmitOutcome, ViewStatus, RestoreStep } from './engine';
export { RESTORE_STEPS, rewriteAvailable, roomUnlocked, timeChips } from './engine';

export interface UiState {
  /** 지금 손가락을 대고 있다(밀기·시트 조작) — 메시지를 미룬다 */
  touching: boolean;
  messengerOpen: boolean;
  roomOpen: boolean;
  /** 열린 이름 붙이기 시트 */
  tagTarget: { cutId: Id; figureId: Id } | null;
}

export interface GameActions {
  startEpisode(): 'started' | 'already';
  markPrologueSeen(): void;
  openEye(eyeId: Id): { status: E.ViewStatus; cutId?: Id; index?: number };
  viewCut(eyeId: Id, index: number): { status: E.ViewStatus; cutId?: Id };
  closeViewer(): void;
  tapFigure(cutId: Id, figureId: Id): { tappable: boolean };
  closeTagSheet(): void;
  tag(figureId: Id, cardId: Id, evidenceId: Id, cutId?: Id): E.TagOutcome;
  openRoom(time?: Hhmm): 'opened' | 'locked';
  selectRoomTime(time: Hhmm): { merges: string[][] };
  closeRoom(): void;
  resolveContradiction(id: Id, claimId: Id): ReturnType<typeof E.resolveContradiction>;
  search(query: string): E.SearchOutcome;
  openCard(id: Id): boolean;
  openRecord(id: Id): boolean;
  openDoc(id: Id): boolean;
  openMessenger(): void;
  closeMessenger(): void;
  /** 메신저를 열어 둔 채 읽음 처리 */
  readMessage(): void;
  chooseReply(optionId: Id): boolean;
  setTouching(on: boolean): void;
  tick(): void;
  /** tick 의 별칭(방치 시간·힌트) */
  tickIdle(): void;
  resume(): Id | null;
  composeRewrite(): 'opened' | 'locked' | 'restored';
  placePiece(pieceId: Id): ReturnType<typeof E.placePiece>;
  openSlot(kind: SlotKind): void;
  fillSlot(lineId: Id, kind: SlotKind, value: string): ReturnType<typeof E.fillSlot>;
  clearSlot(lineId: Id, kind: SlotKind): void;
  removeLine(lineId: Id): boolean;
  submitRewrite(): ReturnType<typeof E.submitRewrite>;
  submitLine(lineId: Id): ReturnType<typeof E.submitLine>;
  restore(): 'restored' | 'not_ready' | 'already';
  advanceRestore(): E.RestoreStep | 'done';
  finishEpilogue(): void;
  setSettings(patch: Partial<Settings>): void;
  save(slot?: SaveSlot): Promise<void>;
  load(slot?: SaveSlot): Promise<'loaded' | 'empty' | 'error'>;
  reset(): void;
  ackFx(): void;
  /** 지금 시각(ms) — 셀렉터에 넘길 때 */
  now(): number;
}

export interface GameState extends PersistedState, GameActions {
  ui: UiState;
  fx: E.Fx[];
  lastError: string | null;
}

export interface StoreOptions {
  /** 시계(ms). 기본 Date.now */
  now?: () => number;
  seed?: number;
  episode?: Episode;
}

const initialUi = (): UiState => ({ touching: false, messengerOpen: false, roomOpen: false, tagTarget: null });

export function initialPersisted(seed = 1, now = 0): PersistedState {
  return freshState(seed, now);
}

export function createGameStore(opts: StoreOptions = {}) {
  const clock = opts.now ?? (() => Date.now());
  const ep = opts.episode ?? EP1;
  const seed = opts.seed ?? seedFrom(String(clock()));

  return create<GameState>()((set, get) => {
    const ctx = (): E.Ctx => {
      const ui = get().ui;
      return { ep, now: clock(), touching: ui.touching, messengerOpen: ui.messengerOpen };
    };
    /** 엔진 동작 하나를 실행하고 상태·연출 큐를 반영 */
    function run<R>(fn: (w: E.Work, c: E.Ctx) => R, opts2?: { action?: boolean }): R {
      const c = ctx();
      const r = E.act(pickPersisted(get()), c, (w) => fn(w, c), opts2);
      set({ ...r.state, fx: [...get().fx, ...r.fx] });
      return r.result;
    }

    return {
      ...freshState(seed, clock()),
      ui: initialUi(),
      fx: [],
      lastError: null,
      now: () => clock(),

      startEpisode: () => run((w, c) => E.startEpisode(w, c)),
      markPrologueSeen: () => run((w) => void (w.s.prologueSeen = true)),
      openEye: (eyeId) => run((w, c) => E.openEye(w, c, eyeId)),
      viewCut: (eyeId, index) => run((w, c) => E.viewCut(w, c, eyeId, index)),
      closeViewer: () => run((w, c) => E.closeViewer(w, c)),
      tapFigure: (cutId, figureId) => {
        const v = selectCut(ep, get(), cutId);
        const f = v?.figures.find((x) => x.figureId === figureId);
        const tappable = !!f?.tappable;
        set({ ui: { ...get().ui, tagTarget: tappable ? { cutId, figureId } : null } });
        return { tappable };
      },
      closeTagSheet: () => set({ ui: { ...get().ui, tagTarget: null } }),
      tag: (figureId, cardId, evidenceId, cutId) => {
        const target = cutId ?? get().ui.tagTarget?.cutId ?? currentCut(ep, get());
        if (!target) return { judgement: { status: 'invalid', reason: 'not_viewed' }, openedEyes: [] };
        const out = run((w, c) => E.tag(w, c, target, figureId, cardId, evidenceId));
        if (out.judgement.status === 'judged' && out.judgement.verdict === 'ok') set({ ui: { ...get().ui, tagTarget: null } });
        return out;
      },
      openRoom: (time) => {
        const r = run((w, c) => E.openRoom(w, c, time));
        if (r === 'opened') set({ ui: { ...get().ui, roomOpen: true } });
        return r;
      },
      selectRoomTime: (time) => run((w, c) => E.selectRoomTime(w, c, time)),
      closeRoom: () => set({ ui: { ...get().ui, roomOpen: false } }),
      resolveContradiction: (id, claimId) => run((w, c) => E.resolveContradiction(w, c, id, claimId)),
      search: (q) => run((w, c) => E.search(w, c, q)),
      openCard: (id) => run((w, c) => E.openCard(w, c, id)),
      openRecord: (id) => run((w, c) => E.openRecord(w, c, id)),
      openDoc: (id) => run((w, c) => E.openDoc(w, c, id)),
      openMessenger: () => {
        set({ ui: { ...get().ui, messengerOpen: true } });
        run((w, c) => void (w.s.messenger = M.openMessenger(w.s.messenger, c.now, E.msgCtx(w, c))), { action: false });
      },
      closeMessenger: () => set({ ui: { ...get().ui, messengerOpen: false } }),
      readMessage: () => run((w, c) => void (w.s.messenger = M.openMessenger(w.s.messenger, c.now, E.msgCtx(w, c))), { action: false }),
      chooseReply: (optionId) =>
        run((w, c) => {
          const r = M.choose(w.s.messenger, optionId, c.now, E.msgCtx(w, c));
          w.s.messenger = r.state;
          return r.ok;
        }),
      setTouching: (on) => {
        set({ ui: { ...get().ui, touching: on } });
        if (!on) run((w, c) => void (w.s.messenger = M.release(w.s.messenger, c.now, w.s.settings.fastMessages)), { action: false });
      },
      tick: () => run(() => undefined, { action: false }),
      tickIdle: () => run(() => undefined, { action: false }),
      resume: () => run((w, c) => E.resume(w, c), { action: false }),
      composeRewrite: () => run((w, c) => E.composeRewrite(w, c)),
      placePiece: (pieceId) => run((w, c) => E.placePiece(w, c, pieceId)),
      openSlot: (kind) => run((w, c) => E.openSlot(w, c, kind)),
      fillSlot: (lineId, kind, value) => run((w, c) => E.fillSlot(w, c, lineId, kind, value)),
      clearSlot: (lineId, kind) => run((w, c) => E.clearSlot(w, c, lineId, kind)),
      removeLine: (lineId) => run((w, c) => E.removeLine(w, c, lineId)),
      submitRewrite: () => run((w, c) => E.submitRewrite(w, c)),
      submitLine: (lineId) => run((w, c) => E.submitLine(w, c, lineId)),
      restore: () => run((w, c) => E.restore(w, c)),
      advanceRestore: () => run((w, c) => E.advanceRestore(w, c)),
      finishEpilogue: () => run((w, c) => E.finishEpilogue(w, c)),
      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      save: async (slot = 'auto') => {
        await saveGame(slot, pickPersisted(get()));
      },
      load: async (slot = 'auto') => {
        try {
          const file = await loadGame(slot);
          if (!file) return 'empty';
          set({ ...hydrate(file.data, seed, clock()), ui: initialUi(), fx: [], lastError: null });
          return 'loaded';
        } catch (e) {
          set({ lastError: e instanceof SaveError ? e.message : String(e) });
          return 'error';
        }
      },
      reset: () => set({ ...freshState(seed, clock()), settings: get().settings, ui: initialUi(), fx: [], lastError: null }),
      ackFx: () => set({ fx: [] }),
    };
  });
}

/** 저장 데이터(마이그레이션 뒤) → 상태. 옛 진행은 버리고 설정만(__reset) */
export function hydrate(data: Record<string, unknown>, seed: number, now: number): PersistedState {
  const fresh = freshState(seed, now);
  const settings = { ...DEFAULT_SETTINGS, ...((data.settings ?? {}) as Partial<Settings>) };
  if (data.__reset) return { ...fresh, settings };
  const out = { ...fresh } as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) if (k in data) out[k] = data[k];
  return { ...(out as unknown as PersistedState), settings };
}

/** 테스트·도구: 원본 저장 객체를 바로 상태로 */
export function hydrateRaw(raw: unknown, seed = 1, now = 0): PersistedState {
  return hydrate(migrate(raw).data, seed, now);
}

function currentCut(ep: Episode, s: PersistedState): Id | undefined {
  const v = s.viewer;
  return v ? ep.eyes.find((e) => e.id === v.eyeId)?.cuts[v.index] : undefined;
}


export type GameStore = ReturnType<typeof createGameStore>;

/** 영속 상태가 바뀌면 'auto' 슬롯에 저장(디바운스) */
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

export const EPISODE = EP1;
export const useGameStore = createGameStore();
