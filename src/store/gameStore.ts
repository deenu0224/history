/**
 * 결록 단말 스토어(v5 「눈을 빌려 다시 쓰기」, Zustand). 설계: docs/DESIGN_V5.md, 메신저: docs/DIALOGUE_GUIDE.md.
 * 상태 전이는 ./engine.ts(순수에 가까운 함수), 화면 보기는 ./selectors.ts. 시계는 createGameStore({ now }) 로 넣는다.
 *
 * ── UI 계약 ─────────────────────────────────────────────────────
 *  에피소드 startEpisode(id?) — id 없으면 지금 에피소드(새 저장은 ep0). 다른 id 면 진행을 새로 시작하고 대화는 이어진다
 *           selectEpisodes(state) — 에피소드 선택 화면 · currentEpisode(state) · useEpisode()
 *  시작     markPrologueSeen()
 *  넘기기   openEye(eyeId) · viewCut(eyeId, index) · closeViewer()
 *  이름     tapFigure(cutId, figureId) → 시트 보기 · tag(figureId, cardId, evidenceId, cutId?) → TagOutcome
 *           followFactLink(factId, cardId) — 카드 줄 낱말 링크 → 인물 카드 +1(fx cards_gained)
 *  방       openRoom(time?) · openRoomAtCut(cutId) · openRoomFromTag(cardId?)(시트의 「이 시각, 그날의 방」 — 방을 닫으면 시트로 돌아온다)
 *           selectRoomTime(time) · linkMarkers(keyA, keyB)(「같은 사람 잇기」 — 시범 시각 밖의 겹침은 플레이어가 잇는다)
 *           closeRoom() · leaveRoom()(시트로 돌아가지 않고 닫기) · resolveContradiction(id, claimId, evidenceId)(근거 2칸: 판단 + 자리 사실, 기다릴 땐 'wait')
 *  찾기     search(query) · openCard(id) · openRecord(id)(fx cards_gained) · openDoc(id)
 *           searchFromTag() — 시트를 접고 돌아올 자리를 기억(ui.tagReturn) · returnToTag(cardId?) — 시트를 다시 연다(ui.tagCard)
 *  힌트     askHint() — 07 「어디부터 볼까요?」 → 켜진 사다리의 다음 단을 바로
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
import { EP1, EPISODE_ORDER, EPISODES } from '@/data/v5';
import { loadGame, migrate, saveGame, SaveError, type SaveSlot } from '@/core/save';
import { seedFrom } from '@/core/rng';
import * as M from '@/core/messenger';
import type { LinkJudgement } from '@/core/link';
import type { Episode, Hhmm, Id, SlotKind } from '@/core/types';
import * as E from './engine';
import { selectCut, selectSearchSeed } from './selectors';
import { DEFAULT_SETTINGS, FIRST_EPISODE_ID, freshState, pickPersisted, PERSISTED_KEYS, type PersistedState, type Settings } from './state';

export * from './state';
export * from './selectors';
export type { Fx, TagOutcome, SearchOutcome, SubmitOutcome, ViewStatus, RestoreStep } from './engine';
export { RESTORE_STEPS, rewriteAvailable, roomUnlocked, timeChips, switchEpisode } from './engine';
export { EPISODES, EPISODE_ORDER } from '@/data/v5';

export interface UiState {
  /** 지금 손가락을 대고 있다(밀기·시트 조작) — 메시지를 미룬다 */
  touching: boolean;
  messengerOpen: boolean;
  roomOpen: boolean;
  /** 열린 이름 붙이기 시트 */
  tagTarget: { cutId: Id; figureId: Id } | null;
  /** 시트에서 「찾기로 더」를 눌러 접어 둔 자리(찾기 뒤 returnToTag 로 돌아간다) */
  tagReturn: { cutId: Id; figureId: Id; cardId?: Id } | null;
  /** 시트를 다시 열 때 미리 고른 카드 */
  tagCard: Id | null;
  /** 시트의 「이 시각, 그날의 방」으로 열었다 — 방을 닫으면 그 시트로 돌아온다(tagReturn) */
  roomReturnsToTag: boolean;
}

export interface GameActions {
  /** id 없으면 지금 에피소드. 잠긴 에피소드는 'locked' */
  startEpisode(id?: Id): 'started' | 'already' | 'locked' | 'unknown';
  followFactLink(factId: Id, cardId: Id): ReturnType<typeof E.followFactLink>;
  openRoomAtCut(cutId: Id): ReturnType<typeof E.openRoomAtCut>;
  /** 열린 이름 붙이기 시트에서 그 컷의 시각으로 방을 연다(시트는 접어 두고, 방을 닫으면 돌아온다) */
  openRoomFromTag(cardId?: Id): ReturnType<typeof E.openRoomAtCut>;
  /** 「같은 사람 잇기」: 한 관측의 표시 A 와 다른 관측의 표시 B(등장 키) */
  linkMarkers(keyA: string, keyB: string): LinkJudgement;
  /** 방을 닫되 시트로 돌아가지 않는다(방에서 컷으로 갈 때) */
  leaveRoom(): void;
  askHint(): ReturnType<typeof E.askHint>;
  /** 이름 붙이기 시트 → 찾기(돌아올 자리 기억). 미리 채울 낱말을 돌려준다 */
  searchFromTag(cardId?: Id): { seed: string[] };
  /** 찾기 → 이름 붙이기 시트로 돌아간다(cardId 를 고른 채) */
  returnToTag(cardId?: Id): boolean;
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
  resolveContradiction(id: Id, claimId: Id, evidenceId?: Id): ReturnType<typeof E.resolveContradiction>;
  search(query: string): E.SearchOutcome;
  openCard(id: Id): boolean;
  openRecord(id: Id): boolean;
  openDoc(id: Id): boolean;
  openMessenger(): void;
  closeMessenger(): void;
  /** 메신저를 열어 둔 채 읽음 처리 */
  readMessage(): void;
  chooseReply(optionId: Id): boolean;
  /** 다시 쓰인 말풍선의 먹 번짐을 보여 줬다(한 번만) */
  markInkSeen(ids: readonly Id[]): void;
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
  /** 이 에피소드 데이터로 바꿔 끼운다(같은 id 의 등록 데이터 대신, 테스트용). 처음 에피소드도 이것 */
  episode?: Episode;
  /** 처음 에피소드 id(기본 ep0). 잠금을 풀고 시작한다 */
  episodeId?: Id;
}

const initialUi = (): UiState => ({ touching: false, messengerOpen: false, roomOpen: false, tagTarget: null, tagReturn: null, tagCard: null, roomReturnsToTag: false });

/** 상태의 에피소드 데이터 */
export const episodeById = (id: Id): Episode => EPISODES[id] ?? EP1;
export const currentEpisode = (s: Pick<PersistedState, 'episodeId'>): Episode => episodeById(s.episodeId);

/** 에피소드 선택 화면 */
export function selectEpisodes(s: Pick<PersistedState, 'episodeId' | 'unlocked' | 'completed'>) {
  return EPISODE_ORDER.map((id) => {
    const ep = EPISODES[id];
    const state = id === s.episodeId ? 'current' : s.completed.includes(id) ? 'done' : s.unlocked.includes(id) ? 'available' : 'locked';
    return { id, order: ep.order, title: ep.title, code: ep.home.code, state: state as 'current' | 'done' | 'available' | 'locked', done: s.completed.includes(id) };
  });
}

export function initialPersisted(seed = 1, now = 0): PersistedState {
  return freshState(seed, now);
}

export function createGameStore(opts: StoreOptions = {}) {
  const clock = opts.now ?? (() => Date.now());
  const seed = opts.seed ?? seedFrom(String(clock()));
  const override = opts.episode;
  const firstId = opts.episodeId ?? override?.id ?? FIRST_EPISODE_ID;
  const epOf = (id: Id): Episode => (override && override.id === id ? override : episodeById(id));

  return create<GameState>()((set, get) => {
    const ctx = (): E.Ctx => {
      const ui = get().ui;
      return { ep: epOf(get().episodeId), now: clock(), touching: ui.touching, messengerOpen: ui.messengerOpen };
    };
    /** 엔진 동작 하나를 실행하고 상태·연출 큐를 반영 */
    function run<R>(fn: (w: E.Work, c: E.Ctx) => R, opts2?: { action?: boolean }): R {
      const c = ctx();
      const r = E.act(pickPersisted(get()), c, (w) => fn(w, c), opts2);
      set({ ...r.state, fx: [...get().fx, ...r.fx] });
      return r.result;
    }

    return {
      ...freshState(seed, clock(), firstId),
      ui: initialUi(),
      fx: [],
      lastError: null,
      now: () => clock(),

      startEpisode: (id) => {
        const target = id ?? get().episodeId;
        if (!EPISODES[target] && override?.id !== target) return 'unknown';
        if (target !== get().episodeId) {
          if (!get().unlocked.includes(target)) return 'locked';
          set({ ...E.switchEpisode(pickPersisted(get()), target, clock()), ui: initialUi() });
        }
        return run((w, c) => E.startEpisode(w, c));
      },
      followFactLink: (factId, cardId) => run((w, c) => E.followFactLink(w, c, factId, cardId)),
      openRoomAtCut: (cutId) => {
        const r = run((w, c) => E.openRoomAtCut(w, c, cutId));
        if (r.status === 'opened') set({ ui: { ...get().ui, roomOpen: true } });
        return r;
      },
      openRoomFromTag: (cardId) => {
        const t = get().ui.tagTarget;
        if (!t) return { status: 'no_cut', merges: [] };
        const r = run((w, c) => E.openRoomAtCut(w, c, t.cutId));
        if (r.status === 'opened')
          set({ ui: { ...get().ui, roomOpen: true, tagTarget: null, tagCard: null, tagReturn: { ...t, ...(cardId ? { cardId } : {}) }, roomReturnsToTag: true } });
        return r;
      },
      linkMarkers: (a, b) => run((w, c) => E.linkMarkers(w, c, a, b)),
      leaveRoom: () => set({ ui: { ...get().ui, roomOpen: false, roomReturnsToTag: false, ...(get().ui.roomReturnsToTag ? { tagReturn: null } : {}) } }),
      askHint: () => run((w, c) => E.askHint(w, c)),
      searchFromTag: (cardId) => {
        const t = get().ui.tagTarget;
        const ep = epOf(get().episodeId);
        set({ ui: { ...get().ui, tagTarget: null, tagReturn: t ? { ...t, ...(cardId ? { cardId } : {}) } : null } });
        return { seed: t ? selectSearchSeed(ep, get(), t.cutId) : selectSearchSeed(ep, get()) };
      },
      returnToTag: (cardId) => {
        const r = get().ui.tagReturn;
        if (!r) return false;
        set({ ui: { ...get().ui, tagTarget: { cutId: r.cutId, figureId: r.figureId }, tagReturn: null, tagCard: cardId ?? r.cardId ?? null } });
        return true;
      },
      markPrologueSeen: () => run((w) => void (w.s.prologueSeen = true)),
      openEye: (eyeId) => run((w, c) => E.openEye(w, c, eyeId)),
      viewCut: (eyeId, index) => run((w, c) => E.viewCut(w, c, eyeId, index)),
      closeViewer: () => run((w, c) => E.closeViewer(w, c)),
      tapFigure: (cutId, figureId) => {
        const v = selectCut(epOf(get().episodeId), get(), cutId);
        const f = v?.figures.find((x) => x.figureId === figureId);
        const tappable = !!f?.tappable;
        set({ ui: { ...get().ui, tagTarget: tappable ? { cutId, figureId } : null, tagCard: null } });
        return { tappable };
      },
      closeTagSheet: () => set({ ui: { ...get().ui, tagTarget: null, tagCard: null } }),
      tag: (figureId, cardId, evidenceId, cutId) => {
        const target = cutId ?? get().ui.tagTarget?.cutId ?? currentCut(epOf(get().episodeId), get());
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
      closeRoom: () => {
        const ui = get().ui;
        const back = ui.roomReturnsToTag && ui.tagReturn;
        set({
          ui: {
            ...ui,
            roomOpen: false,
            roomReturnsToTag: false,
            ...(back ? { tagTarget: { cutId: back.cutId, figureId: back.figureId }, tagCard: back.cardId ?? null, tagReturn: null } : {}),
          },
        });
      },
      resolveContradiction: (id, claimId, evidenceId) => run((w, c) => E.resolveContradiction(w, c, id, claimId, evidenceId)),
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
      markInkSeen: (ids) => run((w) => void (w.s.messenger = M.markInkSeen(w.s.messenger, ids)), { action: false }),
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
      reset: () => set({ ...freshState(seed, clock(), firstId), settings: get().settings, ui: initialUi(), fx: [], lastError: null }),
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

/**
 * @deprecated 지금 에피소드는 currentEpisode(state) / useEpisode(). 옛 UI 호환: 싱글턴 스토어의 에피소드를 따라가는 살아 있는 바인딩.
 */
export let EPISODE: Episode = EP1;
export const useGameStore = createGameStore();
EPISODE = currentEpisode(useGameStore.getState());
useGameStore.subscribe((st, prev) => {
  if (st.episodeId !== prev.episodeId) EPISODE = currentEpisode(st);
});
