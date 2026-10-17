/**
 * 화면 이동·일시 표시(UI 전용 상태, 저장 안 함). 게임 상태는 store/gameStore.ts 가 갖는다.
 *  - 화면은 스택: 바닥은 홈, 뷰어·찾기·메신저·다시 쓰기·복원·설정이 그 위에 쌓인다(뒤로 = 팝).
 *  - 시트(이름 붙이기·그날의 방·인물 카드·로그·문서)는 스토어 ui(tagTarget, roomOpen)나 여기 값으로 연다.
 */
import { create } from 'zustand';
import type { Id, SlotKind } from '@/core/types';

export type Screen = 'home' | 'viewer' | 'search' | 'messenger' | 'rewrite' | 'restore' | 'settings';
export type BootStep = 'title' | 'prologue' | 'cold';

export interface Toast {
  key: number;
  text: string;
  tone: 'amber' | 'cold' | 'alert';
}
export interface Banner {
  key: number;
  from: string;
  text: string;
}

export interface UiStore {
  phase: 'boot' | 'game';
  boot: BootStep;
  stack: Screen[];
  /** 인물 카드 상세 */
  card: { id: Id; picking?: boolean } | null;
  /** 인물 카드 상세에서 「이 사람으로」 를 눌러 이름 붙이기 시트로 돌려보낸 카드 */
  picked: Id | null;
  logOpen: boolean;
  docId: Id | null;
  /** 그날의 방에서 열어 둘 모순 */
  roomFocus: Id | null;
  /** 역사 고정 칸에서 고른 값이 모순에 걸려 방으로 왔다 — 판단을 미리 고르고, 풀리면 그 칸에 다시 넣는다 */
  pendingFill: { lineId: Id; kind: SlotKind; value: string; contradictionId: Id } | null;
  /** 찾기 입력 미리 채움 */
  searchSeed: string | null;
  /** 이름 붙이기 시트에서 넘어온 찾기: 그 컷에서 들은 밑줄 낱말들 */
  seedTerms: string[];
  /** 막 먹선이 그어진 카드 줄(연출용) */
  inkNew: string[];
  toast: Toast | null;
  banner: Banner | null;
  /** 겹침 라벨을 보일 마감 시각(ms) */
  mergeUntil: number;
  /** 막 이어진 자리(「같은 사람」 라벨 위치) */
  mergePos: Id | null;
  /** 열린 눈에서 막 닫힘이 일어난 눈(연출용) */
  closedFlash: Id | null;
  /** 막 이름이 붙은 사람(컷 위 이름표가 한 번 튄다) */
  freshName: Id | null;

  setBoot(b: BootStep): void;
  enterGame(): void;
  push(s: Screen): void;
  pop(): void;
  go(s: Screen): void;
  home(): void;
  openCard(id: Id, picking?: boolean): void;
  closeCard(): void;
  setPicked(id: Id | null): void;
  setLog(on: boolean): void;
  setDoc(id: Id | null): void;
  setRoomFocus(id: Id | null): void;
  setPendingFill(p: UiStore['pendingFill']): void;
  setSearchSeed(q: string | null): void;
  showToast(text: string, tone?: Toast['tone']): void;
  showBanner(from: string, text: string): void;
  clearBanner(): void;
  flashMerge(posId?: Id): void;
  flashName(figureId: Id): void;
}

let seq = 0;
/** 띄우기를 기다리는 배너(연출이 끝나길 기다리는 동안 새 배너가 오면 옛것은 버린다) */
let pendingBanner = 0;

export const useUi = create<UiStore>()((set, get) => ({
  phase: 'boot',
  boot: 'title',
  stack: ['home'],
  card: null,
  picked: null,
  logOpen: false,
  docId: null,
  roomFocus: null,
  pendingFill: null,
  searchSeed: null,
  seedTerms: [],
  inkNew: [],
  toast: null,
  banner: null,
  mergeUntil: 0,
  mergePos: null,
  closedFlash: null,
  freshName: null,

  setBoot: (boot) => set({ boot }),
  enterGame: () => set({ phase: 'game', stack: ['home'] }),
  push: (s) => {
    const st = get().stack;
    if (st[st.length - 1] !== s) set({ stack: [...st, s] });
  },
  pop: () => {
    const st = get().stack;
    if (st.length > 1) set({ stack: st.slice(0, -1) });
  },
  go: (s) => set({ stack: s === 'home' ? ['home'] : ['home', s] }),
  home: () => set({ stack: ['home'] }),
  openCard: (id, picking) => set({ card: { id, picking } }),
  closeCard: () => set({ card: null }),
  setPicked: (picked) => set({ picked }),
  setLog: (logOpen) => set({ logOpen }),
  setDoc: (docId) => set({ docId }),
  setRoomFocus: (roomFocus) => set({ roomFocus }),
  setPendingFill: (pendingFill) => set({ pendingFill }),
  setSearchSeed: (searchSeed) => set({ searchSeed }),
  showToast: (text, tone = 'amber') => {
    const key = ++seq;
    set({ toast: { key, text, tone } });
    setTimeout(() => {
      if (get().toast?.key === key) set({ toast: null });
    }, 2600);
  },
  showBanner: (from, text) => {
    const key = ++seq;
    // 화면이 보상 연출 중이면(역사 고정의 복원 연출·고정률 차오름 — [data-float-wait]) 끝난 뒤에 띄운다(QA_UX_R3 ux3-04). 최대 4초
    const busy = () => typeof document !== 'undefined' && !!document.querySelector('[data-float-wait]');
    const t0 = Date.now();
    pendingBanner = key;
    const show = () => {
      if (pendingBanner !== key) return; // 그 사이 새 배너가 왔다
      if (busy() && Date.now() - t0 < 4000) {
        setTimeout(show, 200);
        return;
      }
      set({ banner: { key, from, text } });
      setTimeout(() => {
        if (get().banner?.key === key) set({ banner: null });
      }, 2800);
    };
    show();
  },
  clearBanner: () => set({ banner: null }),
  flashMerge: (posId) => {
    set({ mergeUntil: Date.now() + 1500, mergePos: posId ?? null });
    setTimeout(() => set({ mergeUntil: 0 }), 1550);
  },
  flashName: (figureId) => {
    set({ freshName: figureId });
    setTimeout(() => {
      if (get().freshName === figureId) set({ freshName: null });
    }, 2400);
  },
}));

export const topScreen = (s: UiStore): Screen => s.stack[s.stack.length - 1];

/**
 * 이어하기: 마지막으로 보던 화면을 이 기기에만 기억한다(편의 — 진행은 저장 파일에). 안전한 화면만 되돌린다:
 * 뷰어(보던 관측이 저장에 있으면) · 역사 고정(열려 있고 복원 전) · 메신저 · 찾기. 복원 장면·설정은 홈으로.
 */
const LAST_KEY = 'gyeollok.lastScreen';
useUi.subscribe((s, prev) => {
  if (s.stack === prev.stack || s.phase !== 'game') return;
  try {
    localStorage.setItem(LAST_KEY, topScreen(s));
  } catch {
    /* 저장소 없음 */
  }
});
export function lastScreen(): Screen | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v === 'viewer' || v === 'rewrite' || v === 'messenger' || v === 'search' ? v : null;
  } catch {
    return null;
  }
}
