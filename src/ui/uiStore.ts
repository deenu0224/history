/**
 * 화면 이동·일시 표시(UI 전용 상태, 저장 안 함). 게임 상태는 store/gameStore.ts 가 갖는다.
 *  - 화면은 스택: 바닥은 홈, 뷰어·찾기·메신저·다시 쓰기·복원·설정이 그 위에 쌓인다(뒤로 = 팝).
 *  - 시트(이름 붙이기·그날의 방·인물 카드·로그·문서)는 스토어 ui(tagTarget, roomOpen)나 여기 값으로 연다.
 */
import { create } from 'zustand';
import type { Id } from '@/core/types';

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
  setSearchSeed(q: string | null): void;
  showToast(text: string, tone?: Toast['tone']): void;
  showBanner(from: string, text: string): void;
  clearBanner(): void;
  flashMerge(posId?: Id): void;
  flashName(figureId: Id): void;
}

let seq = 0;

export const useUi = create<UiStore>()((set, get) => ({
  phase: 'boot',
  boot: 'title',
  stack: ['home'],
  card: null,
  picked: null,
  logOpen: false,
  docId: null,
  roomFocus: null,
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
    set({ banner: { key, from, text } });
    setTimeout(() => {
      if (get().banner?.key === key) set({ banner: null });
    }, 2800);
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
