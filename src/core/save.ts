import { del, get, set } from 'idb-keyval';
import type { AppId, FlagValue, Id, PlayStats, RewriteEntry, Stamp } from './types';
import type { HintLevel, HintState } from './terminal';
import type { Frame, ReportDraft } from './report';

export const SAVE_VERSION = 4;
export const SAVE_SCHEMA = 'gyeollok-save';
export type SaveSlot = 'auto' | 'manual';

export interface Settings {
  textSpeed: number;
  volume: number;
  /** 엔딩 후 '재구성/가상' 표식 노출 */
  showProvenance: boolean;
  /** 메신저 힌트: 끔 / 보통 / 자세히 */
  hintLevel: HintLevel;
  /** 모바일 진동(navigator.vibrate) */
  haptics: boolean;
  /** 화면 불안정(글리치) 연출 약하게 */
  reduceFlicker: boolean;
}

export interface SearchLogEntry {
  seq: number;
  query: string;
  normalized: string;
  status: 'ok' | 'unknown' | 'too_short' | 'empty' | 'no_article';
  entryIds: Id[];
}

/** 배정 종결(이번 건). 플레이어가 찍은 것과, 지금 현실이 보여 주는 것은 다를 수 있다(보정·복원). */
export interface Closure {
  /** 플레이어가 실제로 찍은 판정 */
  verdict: Stamp;
  /** 지금 현실이 보여 주는 판정(보정 뒤 '일치(노이즈)'로 바뀔 수 있다) */
  shownVerdict: Stamp;
  /** 플레이어가 적은 소견(보정이 지울 수 있다) */
  note: string;
  /** 근거로 붙인 프레임 */
  frameIds: Id[];
  /** 지금 현실의 분류 문구 */
  classification: string;
}

/**
 * 저장되는 게임 상태(v4: 「대조」). 구조를 바꾸면 SAVE_VERSION 을 올리고 migrations 에 변환을 추가한다.
 * v1 → v2: 걷기 폐지. v2 → v3: 현실 이동·카드 겹치기·기록하기.
 * v3 → v4: v3 「대조」 재설계. 손 노트·메모·증거 보드·기록관·튜토리얼·증거 카드·추리·도감 상태를 버린다(설정만 유지).
 */
export interface PersistedState {
  flags: Record<string, FlagValue>;
  /** 검색어 칩(보고 들은 그대로) */
  terms: string[];
  searchLog: SearchLogEntry[];
  /** 한 번 이상 맞힌 색인 항목 */
  searched: Id[];
  /** 열어 본 DB 기록 */
  recordsOpened: Id[];
  /** 도착한 메시지(도착 순) */
  inbox: Id[];
  read: Id[];
  replies: Record<Id, Id>;
  corrections: Id[];
  shifts: Id[];
  rewriteLog: RewriteEntry[];
  /** 들은 대사(관측 내내 누적) */
  heard: Id[];
  /** 확대해서 본 핫스팟 */
  seen: Id[];
  /** 관측에서 머문 시(時) — 8~18 */
  hoursVisited: number[];
  /** 탭한 핫스팟 */
  tapped: Id[];
  /** 타임라인 id → 마지막 시각(분) */
  obsMinute: Record<Id, number>;
  appsOpened: AppId[];
  /** 필름(최대 6장, 칸 순서) */
  frames: Frame[];
  /** 지금까지 찍은 수(프레임 id·seq 용) */
  frameSeq: number;
  /** 열어 본 배정 */
  assignmentsOpened: Id[];
  /** 체크리스트 항목 → 찍은 도장 */
  checklist: Record<Id, Stamp>;
  /** 배정 → 종결 */
  closures: Record<Id, Closure>;
  /** 열어 본 종결 보고서 */
  opened: Id[];
  /** 보고서 초안 */
  reports: Record<Id, ReportDraft>;
  /** 도장 찍은(확정된) 보고서 */
  filed: Id[];
  /** 관측 훼손 구간 */
  degraded: { from: number; to: number }[];
  hints: HintState;
  stats: PlayStats;
  settings: Settings;
}

export interface SaveFile {
  schema: typeof SAVE_SCHEMA;
  version: number;
  savedAt: string;
  slot: SaveSlot;
  data: PersistedState;
}

/** version n → n+1 변환. 키는 '변환 전' 버전. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
export const migrations: Record<number, Migration> = {
  1: (d) => {
    const { currentScene: _scene, examined, ...rest } = d as Record<string, unknown> & { examined?: unknown };
    void _scene;
    const settings = (rest.settings ?? {}) as Record<string, unknown>;
    return {
      ...rest,
      terms: [],
      searchLog: [],
      searched: [],
      sources: [],
      phrases: [],
      inbox: [],
      read: [],
      replies: {},
      corrections: [],
      tapped: Array.isArray(examined) ? (examined as string[]).map((id) => `hs_${id}`) : [],
      exhibitsSeen: [],
      obsMinute: {},
      appsOpened: [],
      stats: {
        searches: 0,
        unknownSearches: 0,
        scrubs: 0,
        taps: 0,
        phrases: 0,
        phraseMisses: 0,
        deductionAttempts: Object.values((rest.attempts ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0),
        exhibits: 0,
      },
      tutorial: { done: [], dismissed: [], fails: {}, idleTier: {} },
      settings: { hintLevel: 'normal', haptics: true, reduceFlicker: false, ...settings },
    };
  },
  2: (d) => {
    const APP_MAP: Record<string, string> = { reader: 'search', archive: 'notebook' };
    const opened = Array.isArray(d.appsOpened) ? (d.appsOpened as string[]).map((a) => APP_MAP[a] ?? a) : [];
    const stats = (d.stats ?? {}) as Record<string, number>;
    return {
      ...d,
      shifts: [],
      rewriteLog: [],
      links: [],
      recorded: [],
      appsOpened: [...new Set(opened)],
      stats: { links: 0, linkMisses: 0, ...stats },
    };
  },
  3: (d) => {
    // v3(손 노트·보드) → v4(대조): 진행은 호환되지 않으므로 버리고 설정만 남긴다.
    const old = (d.settings ?? {}) as Record<string, unknown>;
    const { showInteractHints: _hints, ...settings } = old;
    void _hints;
    return {
      flags: {},
      terms: [],
      searchLog: [],
      searched: [],
      recordsOpened: [],
      inbox: [],
      read: [],
      replies: {},
      corrections: [],
      shifts: [],
      rewriteLog: [],
      heard: [],
      seen: [],
      hoursVisited: [],
      tapped: [],
      obsMinute: {},
      appsOpened: [],
      frames: [],
      frameSeq: 0,
      assignmentsOpened: [],
      checklist: {},
      closures: {},
      opened: [],
      reports: {},
      filed: [],
      degraded: [],
      hints: { sent: {}, fails: {} },
      stats: { searches: 0, unknownSearches: 0, scrubs: 0, taps: 0, captures: 0, stamps: 0, stampMisses: 0, reportSubmits: 0, reportFails: 0 },
      settings: { textSpeed: 1, volume: 0.8, showProvenance: false, hintLevel: 'normal', haptics: true, reduceFlicker: false, ...settings },
    };
  },
};

export const slotKey = (slot: SaveSlot) => `${SAVE_SCHEMA}:${slot}`;

export class SaveError extends Error {}

export function migrate(raw: unknown, table: Record<number, Migration> = migrations, target = SAVE_VERSION): SaveFile {
  if (!raw || typeof raw !== 'object') throw new SaveError('저장 데이터가 손상되었습니다.');
  const file = raw as Partial<SaveFile> & { data?: unknown };
  if (file.schema !== SAVE_SCHEMA || typeof file.version !== 'number' || !file.data)
    throw new SaveError('알 수 없는 저장 형식입니다.');
  if (file.version > target) throw new SaveError('더 새로운 버전의 저장 데이터입니다.');
  let data = file.data as unknown as Record<string, unknown>;
  for (let v = file.version; v < target; v++) {
    const step = table[v];
    if (!step) throw new SaveError(`v${v} → v${v + 1} 마이그레이션이 없습니다.`);
    data = step(data);
  }
  return { ...(file as SaveFile), version: target, data: data as unknown as PersistedState };
}

export async function saveGame(slot: SaveSlot, data: PersistedState, now = new Date()): Promise<SaveFile> {
  const file: SaveFile = { schema: SAVE_SCHEMA, version: SAVE_VERSION, savedAt: now.toISOString(), slot, data };
  await set(slotKey(slot), structuredClone(file));
  return file;
}

/** 슬롯이 비어 있으면 null. 손상/미래 버전이면 SaveError. */
export async function loadGame(slot: SaveSlot): Promise<SaveFile | null> {
  const raw = await get(slotKey(slot));
  if (raw === undefined) return null;
  return migrate(raw);
}

export async function deleteSave(slot: SaveSlot): Promise<void> {
  await del(slotKey(slot));
}

export async function peekSave(slot: SaveSlot): Promise<{ savedAt: string; version: number } | null> {
  const raw = (await get(slotKey(slot))) as Partial<SaveFile> | undefined;
  return raw?.savedAt && typeof raw.version === 'number' ? { savedAt: raw.savedAt, version: raw.version } : null;
}
