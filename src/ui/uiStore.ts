/**
 * 셸 로컬 UI 상태(저장되지 않음). 게임 진행 상태는 store/gameStore 가 가진다.
 * 창 배치·알림·설치 연출·메시지 전달 연출·다시 쓰기 연출처럼 '보기'에 관한 것만 둔다.
 */
import { create } from 'zustand';
import type { AppId, Id } from '@/core/types';
import type { ThreadKey } from './lib/text';

export type WinKey = AppId | 'settings';
export type WorkTab = 'card' | 'closed' | 'report';

export interface WinState {
  key: WinKey;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
}

export interface Notice {
  id: number;
  app: AppId;
  text: string;
  sub?: string;
  thread?: ThreadKey;
}

export interface RewritePlay {
  tone: 'erase' | 'restore';
  before: string;
  after: string;
}

interface UiLocal {
  /** boot: 콜드 오픈/로그인, os: 데스크톱 */
  phase: 'boot' | 'os';
  setPhase(p: 'boot' | 'os'): void;

  windows: Partial<Record<WinKey, WinState>>;
  zTop: number;
  setWindow(key: WinKey, patch: Partial<WinState>): void;
  openWindow(key: WinKey, init: Omit<WinState, 'z' | 'minimized' | 'key'>): void;
  focusWindow(key: WinKey): void;
  minimizeWindow(key: WinKey): void;
  closeWindow(key: WinKey): void;

  /** 독에 나타난 앱. 이후 새로 생기는 앱만 '설치' 연출 */
  shown: AppId[];
  installing: Partial<Record<AppId, number>>;
  markShown(app: AppId, installing?: boolean): void;
  clearInstalling(app: AppId): void;

  /** 알림: banner 는 위에서 잠깐 내려오고, notices 는 홈 화면에 남는다 */
  notices: Notice[];
  banner: Notice | null;
  pushNotice(n: Omit<Notice, 'id'>, opts?: { banner?: boolean }): void;
  dismissNotice(id: number): void;
  clearBanner(id?: number): void;

  /** DB 검색 프리필(밑줄 말 → 검색 앱) */
  searchPrefill: { q: string; nonce: number } | null;
  prefillSearch(q: string): void;

  workTab: WorkTab;
  setWorkTab(t: WorkTab): void;
  reportSeen: boolean;
  markReportSeen(): void;

  /** 메신저: 열린 대화와 전달 연출 */
  thread: ThreadKey | null;
  openThread(t: ThreadKey | null): void;
  revealed: Id[];
  reveal(ids: Id[]): void;
  typing: { thread: ThreadKey; from: string } | null;
  setTyping(t: { thread: ThreadKey; from: string } | null): void;

  /** 다시 쓰기 연출 대기(보이는 순간 한 번 재생). key = 'message:<id>' | 'record:<id>' | 'assignment:<id>' */
  rewritePlay: Record<string, RewritePlay>;
  queueRewrite(key: string, p: RewritePlay): void;
  doneRewrite(key: string): void;
  /** 복원 직후 번지는 먹 연출 */
  inkBloom: number;
  bloom(): void;

  /** 실록 용어 한 줄 풀이(탭하면 아래에 잠깐) */
  gloss: { term: string; text: string; nonce: number } | null;
  showGloss(term: string, text: string): void;
  hideGloss(): void;

  /** 짧은 한 줄 알림(바닥의 작은 알약). 튜토리얼이 아니라 규정·상태 안내용 */
  flash: { text: string; nonce: number } | null;
  say(text: string): void;
  clearFlash(): void;

  /** 불러오기·처음부터 뒤에 화면 쪽 상태를 비운다 */
  resetSession(): void;

  textScale: number;
  setTextScale(n: number): void;
}

let noticeSeq = 1;

function loadScale(): number {
  try {
    const v = Number(localStorage.getItem('gyeollok.textScale'));
    return v === 1.125 || v === 1.25 || v === 1.5 ? v : 1;
  } catch {
    return 1;
  }
}

export const useUi = create<UiLocal>()((set, get) => ({
  phase: 'boot',
  setPhase: (phase) => set({ phase }),

  windows: {},
  zTop: 10,
  setWindow(key, patch) {
    const w = get().windows[key];
    if (w) set({ windows: { ...get().windows, [key]: { ...w, ...patch } } });
  },
  openWindow(key, init) {
    const z = get().zTop + 1;
    set({ zTop: z, windows: { ...get().windows, [key]: { ...init, key, z, minimized: false } } });
  },
  focusWindow(key) {
    const w = get().windows[key];
    if (!w) return;
    const z = get().zTop + 1;
    set({ zTop: z, windows: { ...get().windows, [key]: { ...w, z, minimized: false } } });
  },
  minimizeWindow(key) {
    const w = get().windows[key];
    if (w) set({ windows: { ...get().windows, [key]: { ...w, minimized: true } } });
  },
  closeWindow(key) {
    const { [key]: _drop, ...rest } = get().windows;
    void _drop;
    set({ windows: rest });
  },

  shown: [],
  installing: {},
  markShown(app, installing = false) {
    if (get().shown.includes(app)) return;
    set({ shown: [...get().shown, app], installing: installing ? { ...get().installing, [app]: Date.now() } : get().installing });
  },
  clearInstalling(app) {
    const { [app]: _drop, ...rest } = get().installing;
    void _drop;
    set({ installing: rest });
  },

  notices: [],
  banner: null,
  pushNotice(n, opts) {
    const notice: Notice = { ...n, id: noticeSeq++ };
    set((s) => ({ notices: [...s.notices.slice(-4), notice], banner: opts?.banner === false ? s.banner : notice }));
  },
  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id), banner: s.banner?.id === id ? null : s.banner })),
  clearBanner: (id) => set((s) => (id === undefined || s.banner?.id === id ? { banner: null } : s)),

  searchPrefill: null,
  prefillSearch: (q) => set({ searchPrefill: { q, nonce: Date.now() + Math.random() } }),

  workTab: 'card',
  setWorkTab: (workTab) => set({ workTab }),
  reportSeen: false,
  markReportSeen: () => set({ reportSeen: true }),

  thread: null,
  openThread: (thread) => set({ thread }),
  revealed: [],
  reveal: (ids) => set((s) => ({ revealed: [...s.revealed, ...ids.filter((i) => !s.revealed.includes(i))] })),
  typing: null,
  setTyping: (typing) => set({ typing }),

  rewritePlay: {},
  queueRewrite: (key, p) => set((s) => ({ rewritePlay: { ...s.rewritePlay, [key]: p } })),
  doneRewrite(key) {
    if (!(key in get().rewritePlay)) return;
    const { [key]: _drop, ...rest } = get().rewritePlay;
    void _drop;
    set({ rewritePlay: rest });
  },
  inkBloom: 0,
  bloom: () => set((s) => ({ inkBloom: s.inkBloom + 1 })),

  gloss: null,
  showGloss: (term, text) => set({ gloss: { term, text, nonce: Date.now() + Math.random() } }),
  hideGloss: () => set({ gloss: null }),

  resetSession: () =>
    set({
      windows: {},
      shown: [],
      installing: {},
      notices: [],
      banner: null,
      workTab: 'card',
      reportSeen: false,
      thread: null,
      revealed: [],
      typing: null,
      rewritePlay: {},
      gloss: null,
      flash: null,
    }),

  flash: null,
  say: (text) => set({ flash: { text, nonce: Date.now() + Math.random() } }),
  clearFlash: () => set({ flash: null }),

  textScale: loadScale(),
  setTextScale(n) {
    try {
      localStorage.setItem('gyeollok.textScale', String(n));
    } catch {
      /* 저장소 없음 */
    }
    set({ textScale: n });
  },
}));
