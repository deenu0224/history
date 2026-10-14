/**
 * 저장되는 게임 상태(v6, DESIGN_V5). 구조를 바꾸면 core/save.ts 의 SAVE_VERSION 을 올리고 migrations 에 변환을 추가한다.
 */
import { createMessenger, type MessengerState } from '@/core/messenger';
import { emptyHintState, type HintLevel, type HintState } from '@/core/hints';
import type { DraftLine, LineResult } from '@/core/rewrite';
import type { Hhmm, Id, SlotKind, TagVerdict } from '@/core/types';

export interface Settings {
  volume: number;
  music: boolean;
  haptics: boolean;
  /** 메신저 힌트: 끔 / 보통 / 자세히 */
  hintLevel: HintLevel;
  /** 글자 크기 「크게」 = 모든 단계 +2px */
  textSize: 'normal' | 'large';
  reduceMotion: boolean;
  /** 메시지 빠르게(모든 시간 × 0.4, 망설임 없음) */
  fastMessages: boolean;
  /** 길게 누르기(1.2초) 대신 두 번 탭 */
  holdMode: 'hold' | 'double_tap';
  /** 엔딩 뒤 열람 모드의 세 층위 표식 */
  showProvenance: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  music: true,
  haptics: true,
  hintLevel: 'normal',
  textSize: 'normal',
  reduceMotion: false,
  fastMessages: false,
  holdMode: 'hold',
  showProvenance: false,
};

export interface TagLogEntry {
  cutId: Id;
  figureId: Id;
  cardId: Id;
  evidenceId: Id;
  verdict: TagVerdict;
  at: number;
}

export interface SearchLogEntry {
  seq: number;
  query: string;
  normalized: string;
  status: 'ok' | 'unknown' | 'too_short' | 'empty' | 'no_article';
  results: { kind: 'person' | 'record' | 'log'; id: Id }[];
  /** 단말 시계 */
  clock: Hhmm;
}

export interface RewriteState {
  open: boolean;
  lines: DraftLine[];
  results: Record<Id, LineResult>;
  submits: number;
  seq: number;
  /** 모두 돌아온(복원 가능한) 제출이 있었다 */
  complete: boolean;
}

export interface PersistedState {
  seed: number;
  /** 스토어 쪽 난수(태그 실패 30% 반응 등) */
  rng: number;
  started: boolean;
  prologueSeen: boolean;
  /** 단말 시계(저장점마다 앞으로 간다) */
  clock: Hhmm;
  savepoints: Id[];
  // ── 관측 ──
  /** 관측 로그: 본 컷(처음 본 순서) */
  viewedCuts: Id[];
  cutViewedAt: Record<Id, number>;
  viewer: { eyeId: Id; index: number; enteredAt: number } | null;
  swipes: number;
  // ── 사람 ──
  named: Record<Id, Id>;
  tagLog: TagLogEntry[];
  fails: Record<string, number>;
  cardsFound: Id[];
  cardsOpened: Id[];
  recordsOpened: Id[];
  docs: Id[];
  docsOpened: Id[];
  // ── 눈 ──
  openedEyes: Id[];
  eyeOpenedAt: Record<Id, number>;
  closedEyes: Id[];
  closures: Id[];
  pendingClosure: Id | null;
  // ── 방 ──
  roomOpened: boolean;
  roomOpenedAfterRestore: boolean;
  roomTime: Hhmm | null;
  merges: string[][];
  // ── 모순 ──
  revealed: Id[];
  /** 모순 id → 이긴 주장 id */
  resolved: Record<Id, Id>;
  slotsOpened: SlotKind[];
  // ── 찾기 ──
  searchLog: SearchLogEntry[];
  // ── 다시 쓰기·복원 ──
  rewrite: RewriteState;
  restored: boolean;
  restoreStep: number;
  epilogueDone: boolean;
  // ── 메신저·힌트 ──
  messenger: MessengerState;
  hints: HintState;
  lastActionAt: number;
  lastActiveAt: number;
  settings: Settings;
}

export function freshState(seed = 1, now = 0): PersistedState {
  return {
    seed,
    rng: seed ^ 0x5bd1e995,
    started: false,
    prologueSeen: false,
    clock: '23:04',
    savepoints: [],
    viewedCuts: [],
    cutViewedAt: {},
    viewer: null,
    swipes: 0,
    named: {},
    tagLog: [],
    fails: {},
    cardsFound: [],
    cardsOpened: [],
    recordsOpened: [],
    docs: [],
    docsOpened: [],
    openedEyes: [],
    eyeOpenedAt: {},
    closedEyes: [],
    closures: [],
    pendingClosure: null,
    roomOpened: false,
    roomOpenedAfterRestore: false,
    roomTime: null,
    merges: [],
    revealed: [],
    resolved: {},
    slotsOpened: [],
    searchLog: [],
    rewrite: { open: false, lines: [], results: {}, submits: 0, seq: 0, complete: false },
    restored: false,
    restoreStep: 0,
    epilogueDone: false,
    messenger: createMessenger(seed, now),
    hints: emptyHintState(),
    lastActionAt: now,
    lastActiveAt: now,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export const PERSISTED_KEYS = Object.keys(freshState()) as (keyof PersistedState)[];

export function pickPersisted(s: PersistedState): PersistedState {
  const out = {} as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as PersistedState;
}
