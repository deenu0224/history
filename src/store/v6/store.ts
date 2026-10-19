/**
 * 결록 v6 스토어(Zustand). 설계: docs/DESIGN_V6.md. 상태 전이는 ./engine.ts, 화면 보기는 ./selectors.ts.
 * 시계는 createV6Store({ now }) 로 넣는다. 저장은 localStorage(v5 의 IndexedDB 저장과 키가 다르다).
 *
 * ── UI 계약 ────────────────────────────────────────────────
 *  시작     start() · markPrologueSeen()
 *  따라가기 openNode(id) · followLink(linkId) · back() · setPage(nodeId, page)
 *  모으기   collect(clueId)
 *  맞춰 보기 pick(cardId) · unpick(cardId) · combine() → CombineOutcome(fail 이면 text = 왜 아닌지) · clearResult()
 *  원문 보기 toggleWonmun(lineId)
 *  고정     fix() → restored | not_ready | not_recorded · advanceRestore() → 다음 박자 | 'done'
 *  메신저   openMessenger() · tick() · chooseReply(optionId) · setTouching(bool)
 *  저장     save() · load() · reset() · setSettings(partial)
 *  연출     fx(큐) → ackFx()
 *  보기     selectors.ts 의 select*(state, data)
 */
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { release } from '@/core/messenger';
import { seedFrom } from '@/core/rng';
import type { Id } from '@/core/v6/types';
import { EP0_V6 } from '@/data/v6/ep0';
import type { Ep0Data } from '@/core/v6/types';
import * as E from './engine';
import { freshState, makeCtx, parseSave, pickPersisted, serialize, V6_SAVE_KEY, V6SaveError, type CombineOutcome, type Fx, type V6State } from './engine';
import type { Settings } from '@/store/state';

export * from './selectors';
export type { CombineOutcome, Fx, V6State } from './engine';
export { PICK_N, RESTORE_STEPS, HINT_EVERY, V6_SAVE_KEY, V6_SAVE_VERSION } from './engine';

export interface V6Ui {
  touching: boolean;
  /** 마지막 맞춰 보기 결과(시트 안 「왜 아닌지」 · 결론) */
  result: CombineOutcome | null;
  /** 관측처럼 쪽이 있는 기록에서 보고 있는 쪽 */
  viewPage: Record<Id, number>;
}

export interface V6Actions {
  start(): 'started' | 'already';
  markPrologueSeen(): void;
  openNode(id: Id): ReturnType<typeof E.openNode>;
  followLink(linkId: Id): ReturnType<typeof E.followLink>;
  back(): Id | null;
  setPage(nodeId: Id, page: number): number;
  collect(clueId: Id): ReturnType<typeof E.collect>;
  pick(cardId: Id): ReturnType<typeof E.pick>;
  unpick(cardId: Id): boolean;
  combine(): CombineOutcome;
  clearResult(): void;
  toggleWonmun(lineId: Id): boolean;
  fix(): E.FixOutcome;
  advanceRestore(): ReturnType<typeof E.advanceRestore>;
  openMessenger(): void;
  tick(): void;
  chooseReply(optionId: Id): boolean;
  setTouching(on: boolean): void;
  setSettings(p: Partial<Settings>): void;
  save(): boolean;
  load(): boolean;
  reset(): void;
  ackFx(): void;
}

export interface V6Store extends V6Actions {
  s: V6State;
  ui: V6Ui;
  fx: Fx[];
}

export interface V6Options {
  now?: () => number;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  seed?: number;
  data?: Ep0Data;
  /** 액션마다 자동 저장(기본 true) */
  autosave?: boolean;
}

export type V6StoreApi = UseBoundStore<StoreApi<V6Store>>;

function defaultStorage(): V6Options['storage'] {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function createV6Store(opts: V6Options = {}): V6StoreApi {
  const now = opts.now ?? (() => Date.now());
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage;
  const data = opts.data ?? EP0_V6;
  const seed = opts.seed ?? seedFrom('gyeollok-v6');
  const autosave = opts.autosave ?? true;

  return create<V6Store>((set, get) => {
    const persist = () => {
      if (!storage) return false;
      try {
        storage.setItem(V6_SAVE_KEY, JSON.stringify(serialize(get().s, new Date(now()))));
        return true;
      } catch {
        return false;
      }
    };
    /** 작업 사본을 고쳐 한 번에 반영한다 */
    function run<T>(fn: (w: E.Work, c: E.Ctx) => T, opt: { save?: boolean; ui?: (r: T, ui: V6Ui) => V6Ui } = {}): T {
      const cur = get();
      const w: E.Work = { s: structuredClone(cur.s), fx: [] };
      w.s.lastActiveAt = now();
      const r = fn(w, makeCtx(now(), data));
      set({ s: w.s, fx: [...cur.fx, ...w.fx], ui: opt.ui ? opt.ui(r, cur.ui) : cur.ui });
      if (autosave && opt.save !== false && w.s.started) persist();
      return r;
    }
    return {
      s: freshState(seed, now()),
      ui: { touching: false, result: null, viewPage: {} },
      fx: [],
      start: () => run((w, c) => E.start(w, c)),
      markPrologueSeen: () => run((w) => void (w.s.prologueSeen = true), { save: false }),
      openNode: (id) => run((w, c) => E.openNode(w, c, id), { ui: (r, ui) => (r.status === 'ok' ? { ...ui, viewPage: { ...ui.viewPage, [id]: 0 } } : ui) }),
      followLink: (linkId) => run((w, c) => E.followLink(w, c, linkId), { ui: (r, ui) => (r.status === 'ok' && r.to ? { ...ui, viewPage: { ...ui.viewPage, [r.to]: 0 } } : ui) }),
      back: () => run((w) => E.back(w)),
      setPage: (nodeId, page) =>
        run((w, c) => E.setPage(w, c, nodeId, page), { ui: (p, ui) => ({ ...ui, viewPage: { ...ui.viewPage, [nodeId]: p } }) }),
      collect: (clueId) => run((w, c) => E.collect(w, c, clueId)),
      pick: (id) => run((w) => E.pick(w, id), { ui: (_r, ui) => ({ ...ui, result: null }) }),
      unpick: (id) => run((w) => E.unpick(w, id), { ui: (_r, ui) => ({ ...ui, result: null }) }),
      combine: () => run((w, c) => E.combine(w, c), { ui: (r, ui) => ({ ...ui, result: r }) }),
      clearResult: () => set({ ui: { ...get().ui, result: null } }),
      toggleWonmun: (lineId) => run((w) => E.toggleWonmun(w, lineId)),
      fix: () => run((w, c) => E.fix(w, c)),
      advanceRestore: () => run((w, c) => E.advanceRestore(w, c)),
      openMessenger: () => run((w, c) => E.openMessenger(w, c)),
      tick: () => run((w, c) => void E.tick(w, c, get().ui.touching), { save: false }),
      chooseReply: (optionId) => run((w, c) => E.chooseReply(w, c, optionId)),
      setTouching: (on) => {
        set({ ui: { ...get().ui, touching: on } });
        if (!on) run((w) => void (w.s.messenger = release(w.s.messenger, now(), w.s.settings.fastMessages)), { save: false });
      },
      setSettings: (p) => run((w) => void (w.s.settings = { ...w.s.settings, ...p })),
      save: () => persist(),
      load: () => {
        if (!storage) return false;
        let raw: string | null = null;
        try {
          raw = storage.getItem(V6_SAVE_KEY);
        } catch {
          return false;
        }
        if (!raw) return false;
        try {
          const s = parseSave(JSON.parse(raw));
          set({ s, fx: [], ui: { touching: false, result: null, viewPage: {} } });
          return true;
        } catch (e) {
          if (e instanceof V6SaveError || e instanceof SyntaxError) return false;
          throw e;
        }
      },
      reset: () => {
        const keep = get().s.settings;
        const s = freshState(seed, now());
        s.settings = keep;
        set({ s, fx: [], ui: { touching: false, result: null, viewPage: {} } });
        try {
          storage?.removeItem(V6_SAVE_KEY);
        } catch {
          /* 저장소가 막혀 있어도 새로 시작한다 */
        }
      },
      ackFx: () => set({ fx: [] }),
    };
  });
}


/** 앱 전체에서 쓰는 단일 스토어(처음 쓸 때 만든다 — import 만으로 저장소를 건드리지 않는다) */
let single: V6StoreApi | null = null;
export const getV6Store = (): V6StoreApi => (single ??= createV6Store());
export { pickPersisted };
