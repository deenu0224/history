/**
 * 화면 로컬 UI 상태(저장되지 않음). 게임 진행 상태는 store/gameStore 가 가진다.
 * 책상 위의 '보기'에 관한 것만 둔다: 열린 패널, 검사 모드, 알림, 메시지 전달 연출, 다시 쓰기 연출.
 */
import { create } from 'zustand';
import type { AppId, Id } from '@/core/types';
import type { ThreadKey } from './lib/text';

/** 책상 위에 올라오는 패널. 앱(업무·관측·DB·메신저)과 규정집·설정·메뉴. */
export type Panel = 'rules' | 'menu' | 'filing' | 'log' | 'db' | 'messenger' | 'settings';
export type FilingTab = 'closed' | 'report';

export const APP_PANEL: Record<AppId, Panel> = { work: 'filing', viewer: 'log', db: 'db', messenger: 'messenger' };
export const PANEL_APP: Partial<Record<Panel, AppId>> = { filing: 'work', log: 'viewer', db: 'db', messenger: 'messenger' };

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

/** 카드 위에 잠깐 뜨는 안내(도장이 아직 안 눌림, 검사 결과) */
export interface CardMsg {
  text: string;
  tone: 'info' | 'warn' | 'yellow' | 'red';
  n: number;
}

interface UiLocal {
  /** boot: 프롤로그/콜드 오픈/로그인, os: 책상 */
  phase: 'boot' | 'os';
  setPhase(p: 'boot' | 'os'): void;

  panel: Panel | null;
  openPanel(p: Panel | null): void;
  filingTab: FilingTab;
  setFilingTab(t: FilingTab): void;

  /** 알림: banner 는 위에서 잠깐 내려온다(사람의 말만) */
  notices: Notice[];
  banner: Notice | null;
  pushNotice(n: Omit<Notice, 'id'>, opts?: { banner?: boolean }): void;
  dismissNotice(id: number): void;
  clearBanner(id?: number): void;

  /** DB 검색 프리필(밑줄 말 → 검색 앱) */
  searchPrefill: { q: string; nonce: number } | null;
  prefillSearch(q: string): void;

  reportSeen: boolean;
  markReportSeen(): void;

  /** 메신저: 열린 대화와 전달 연출 */
  thread: ThreadKey | null;
  openThread(t: ThreadKey | null): void;
  revealed: Id[];
  reveal(ids: Id[]): void;
  typing: { thread: ThreadKey; from: string } | null;
  setTyping(t: { thread: ThreadKey; from: string } | null): void;

  /** 다시 쓰기 연출 대기. key = 'message:<id>' | 'record:<id>' | 'assignment:<id>' | 'case:<id>' | 'warning:<id>' */
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

  // ── 책상 ──
  /** 책상 위에 보이는 카드(방금 도장 찍은 카드 포함). 다음 건이 올라오면 바뀐다 */
  shownCase: Id | null;
  setShownCase(id: Id | null): void;
  /** 검사 모드(기록 낱말 → 관측 낱말을 차례로 짚는다) */
  inspect: boolean;
  setInspect(v: boolean): void;
  /** 짚은 조각(기록 쪽 또는 관측 쪽). 반대쪽 조각을 누르면 실이 이어진다 */
  sel: { side: 'rec' | 'obs'; id: Id } | null;
  select(sel: { side: 'rec' | 'obs'; id: Id } | null): void;
  /** 정정 직후: 바뀌어 있던 낱말이 번지며 원문으로 돌아오는 연출 */
  ghost: { caseId: Id; segId: Id; from: string; at: number } | null;
  setGhost(g: { caseId: Id; segId: Id; from: string } | null): void;
  cardMsg: CardMsg | null;
  cardSay(text: string, tone?: CardMsg['tone']): void;
  clearCardMsg(): void;
  /** 방금 막 만들어진 실(키 → 시각). 새 실만 번쩍이고, 나머지는 정지 상태로 그린다 */
  bornLinks: Record<string, number>;
  bornLink(key: string): void;
  /** 카드가 뒤집혀 판정 이력을 보인다 */
  flipped: boolean;
  setFlipped(v: boolean): void;
  /** 방금 찍은 도장 연출(건 id → 시각) */
  freshStamp: { caseId: Id; at: number } | null;
  stampFresh(caseId: Id): void;
  /** 관측 창 확대 */
  obsExpanded: boolean;
  setObsExpanded(v: boolean): void;
  /** 서랍을 처음 열었는가(마른 잉크 클로즈업) */
  drawerSeen: boolean;
  markDrawerSeen(): void;
  /** 읽어야 하는 경고장(프린터에서 나온 뒤 탭해서 닫는다) */
  slipReading: Id[];
  readSlip(ids: Id[]): void;
  closeSlip(): void;
  /** 근무 보고 종이(근무가 끝난 직후) */
  shiftReportFor: Id | null;
  setShiftReportFor(id: Id | null): void;
  /** 프린터 연출 */
  printerNonce: number;
  print(): void;
  /** 이번 세션에서 읽은 규칙 안내(근무 명세를 한 번 접는다) */
  briefingOpen: boolean;
  setBriefingOpen(v: boolean): void;

  /** 책상 위 상태만 비운다(근무가 새로 시작될 때) */
  resetDesk(): void;
  /** 불러오기·처음부터 뒤에 화면 쪽 상태를 비운다 */
  resetSession(): void;

  textScale: number;
  setTextScale(n: number): void;
  musicVolume: number;
  sfxVolume: number;
  setMusicVolume(n: number): void;
  setSfxVolume(n: number): void;
}

let noticeSeq = 1;

function readNum(key: string, fallback: number, ok?: (n: number) => boolean): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = Number(raw);
    return Number.isFinite(v) && (!ok || ok(v)) ? v : fallback;
  } catch {
    return fallback;
  }
}
function writeNum(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* 저장소 없음 */
  }
}

const volOk = (n: number) => n >= 0 && n <= 1;

const deskFresh = () => ({
  shownCase: null as Id | null,
  inspect: false,
  sel: null as { side: 'rec' | 'obs'; id: Id } | null,
  ghost: null as { caseId: Id; segId: Id; from: string; at: number } | null,
  cardMsg: null as CardMsg | null,
  bornLinks: {} as Record<string, number>,
  flipped: false,
  freshStamp: null as { caseId: Id; at: number } | null,
  obsExpanded: false,
  slipReading: [] as Id[],
  shiftReportFor: null as Id | null,
  briefingOpen: true,
});

export const useUi = create<UiLocal>()((set, get) => ({
  phase: 'boot',
  setPhase: (phase) => set({ phase }),

  panel: null,
  openPanel: (panel) => set({ panel }),
  filingTab: 'closed',
  setFilingTab: (filingTab) => set({ filingTab }),

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

  flash: null,
  say: (text) => set({ flash: { text, nonce: Date.now() + Math.random() } }),
  clearFlash: () => set({ flash: null }),

  ...deskFresh(),
  setShownCase: (shownCase) => set({ shownCase }),
  setInspect: (inspect) => set({ inspect, sel: null }),
  select: (sel) => set({ sel }),
  setGhost: (g) => set({ ghost: g ? { ...g, at: Date.now() } : null }),
  cardSay: (text, tone = 'info') => set({ cardMsg: { text, tone, n: Date.now() + Math.random() } }),
  clearCardMsg: () => set({ cardMsg: null }),
  bornLink: (key) => set((s) => ({ bornLinks: { ...s.bornLinks, [key]: Date.now() } })),
  setFlipped: (flipped) => set({ flipped }),
  stampFresh: (caseId) => set({ freshStamp: { caseId, at: Date.now() } }),
  setObsExpanded: (obsExpanded) => set({ obsExpanded }),
  drawerSeen: false,
  markDrawerSeen: () => set({ drawerSeen: true }),
  readSlip: (ids) => set((s) => ({ slipReading: [...s.slipReading, ...ids.filter((i) => !s.slipReading.includes(i))] })),
  closeSlip: () => set((s) => ({ slipReading: s.slipReading.slice(1) })),
  setShiftReportFor: (shiftReportFor) => set({ shiftReportFor }),
  printerNonce: 0,
  print: () => set((s) => ({ printerNonce: s.printerNonce + 1 })),
  setBriefingOpen: (briefingOpen) => set({ briefingOpen }),

  resetDesk: () => set(deskFresh()),
  resetSession: () =>
    set({
      panel: null,
      notices: [],
      banner: null,
      filingTab: 'closed',
      reportSeen: false,
      thread: null,
      revealed: [],
      typing: null,
      rewritePlay: {},
      gloss: null,
      flash: null,
      drawerSeen: false,
      ...deskFresh(),
    }),

  textScale: readNum('gyeollok.textScale', 1, (v) => v === 1 || v === 1.125 || v === 1.25 || v === 1.5),
  setTextScale(n) {
    writeNum('gyeollok.textScale', n);
    set({ textScale: n });
  },
  musicVolume: readNum('gyeollok.musicVolume', 0.8, volOk),
  sfxVolume: readNum('gyeollok.sfxVolume', 1, volOk),
  setMusicVolume(n) {
    writeNum('gyeollok.musicVolume', n);
    set({ musicVolume: n });
  },
  setSfxVolume(n) {
    writeNum('gyeollok.sfxVolume', n);
    set({ sfxVolume: n });
  },
}));
