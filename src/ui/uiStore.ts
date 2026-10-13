/**
 * 셸 로컬 UI 상태(저장되지 않음). 게임 진행 상태는 store/gameStore 가 가진다.
 * 창 배치·토스트·설치 연출·검색 프리필처럼 '보기'에 관한 것만 둔다.
 */
import { create } from 'zustand';
import type { AppId, Id } from '@/core/types';

/** 앱 + 시스템 창(설정) */
export type WinKey = AppId | 'settings';

export interface WinState {
  key: WinKey;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
}

export interface Toast {
  id: number;
  text: string;
  sub?: string;
  tone: 'info' | 'discover' | 'success' | 'warning';
}

export type SettingsTab = 'main' | 'save' | 'help';

interface UiLocal {
  /** boot: 콜드 오픈/로그인, os: 데스크톱 */
  phase: 'boot' | 'os';
  setPhase(p: 'boot' | 'os'): void;

  // 데스크톱 창
  windows: Partial<Record<WinKey, WinState>>;
  zTop: number;
  setWindow(key: WinKey, patch: Partial<WinState>): void;
  openWindow(key: WinKey, init: Omit<WinState, 'z' | 'minimized' | 'key'>): void;
  focusWindow(key: WinKey): void;
  minimizeWindow(key: WinKey): void;
  closeWindow(key: WinKey): void;

  // 앱 전환 이력(모바일 전환기)
  recent: WinKey[];
  switcher: boolean;
  setSwitcher(b: boolean): void;
  touchRecent(key: WinKey): void;
  dropRecent(key: WinKey): void;

  // 설치(앱이 하나씩 '생기는' 연출)
  shown: AppId[];
  installing: Partial<Record<AppId, number>>;
  markShown(app: AppId, installing?: boolean): void;
  clearInstalling(app: AppId): void;

  // 검색 프리필(메시지/결과 속 밑줄 말 → 검색 앱)
  searchPrefill: { q: string; nonce: number } | null;
  prefillSearch(q: string): void;

  // 설정 창 탭
  settingsTab: SettingsTab;
  setSettingsTab(t: SettingsTab): void;

  // 손 노트 탭 요청(현실 이동 뒤 '고쳐 쓴 줄' 자동 열기 등)
  notebookTab: string | null;
  setNotebookTab(t: string | null): void;

  // 토스트
  toasts: Toast[];
  pushToast(t: Omit<Toast, 'id'>): void;
  dropToast(id: number): void;

  // 도감 NEW 표시
  fresh: Record<Id, number>;
  markFresh(id: Id): void;
  clearFresh(id: Id): void;

  // 현실 재기록(애니메이션을 이미 본 항목)
  seenRewrites: Record<string, true>;
  markRewriteSeen(key: string): void;
  /** 화면 밝기 한 칸 어두워짐(현실 재기록·보정) */
  dip: number;
  triggerDip(): void;

  // 힌트 카드를 접었는지
  hintHidden: string | null;
  hideHint(key: string | null): void;

  // 글자 크기(로컬 취향, 저장 파일과 무관)
  textScale: number;
  setTextScale(n: number): void;
}

let toastSeq = 1;

function loadScale(): number {
  try {
    const v = Number(localStorage.getItem('gyeollok.textScale'));
    return v === 1.25 || v === 1.5 ? v : 1;
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
    if (!w) return;
    set({ windows: { ...get().windows, [key]: { ...w, ...patch } } });
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

  recent: [],
  switcher: false,
  setSwitcher: (switcher) => set({ switcher }),
  touchRecent: (key) => set({ recent: [key, ...get().recent.filter((k) => k !== key)].slice(0, 8) }),
  dropRecent: (key) => set({ recent: get().recent.filter((k) => k !== key) }),

  shown: [],
  installing: {},
  markShown(app, installing = false) {
    if (get().shown.includes(app)) return;
    set({
      shown: [...get().shown, app],
      installing: installing ? { ...get().installing, [app]: Date.now() } : get().installing,
    });
  },
  clearInstalling(app) {
    const { [app]: _drop, ...rest } = get().installing;
    void _drop;
    set({ installing: rest });
  },

  searchPrefill: null,
  prefillSearch: (q) => set({ searchPrefill: { q, nonce: Date.now() + Math.random() } }),

  settingsTab: 'main',
  setSettingsTab: (settingsTab) => set({ settingsTab }),

  notebookTab: null,
  setNotebookTab: (notebookTab) => set({ notebookTab }),

  toasts: [],
  pushToast(t) {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
  },
  dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  fresh: {},
  markFresh: (id) => set((s) => ({ fresh: { ...s.fresh, [id]: Date.now() } })),
  clearFresh(id) {
    if (!(id in get().fresh)) return;
    const { [id]: _drop, ...rest } = get().fresh;
    void _drop;
    set({ fresh: rest });
  },

  seenRewrites: {},
  markRewriteSeen: (key) => set((s) => (s.seenRewrites[key] ? s : { seenRewrites: { ...s.seenRewrites, [key]: true } })),
  dip: 0,
  triggerDip: () => set((s) => ({ dip: s.dip + 1 })),

  hintHidden: null,
  hideHint: (hintHidden) => set({ hintHidden }),

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
