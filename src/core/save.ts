import { del, get, set } from 'idb-keyval';
import type { AppId, FlagValue, Id, PlayStats, RewriteEntry } from './types';
import { emptyDuty, type DutyState } from './duty';
import type { HintLevel, HintState } from './terminal';
import type { Frame, ReportDraft } from './report';

export const SAVE_VERSION = 5;
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

/**
 * 저장되는 게임 상태(v4: 「대조」). 구조를 바꾸면 SAVE_VERSION 을 올리고 migrations 에 변환을 추가한다.
 * v1 → v2: 걷기 폐지. v2 → v3: 현실 이동·카드 겹치기·기록하기.
 * v3 → v4: v3 「대조」 재설계. 손 노트·메모·증거 보드·기록관·튜토리얼·증거 카드·추리·도감 상태를 버린다(설정만 유지).
 * v4 → v5: v4 「근무」(페이퍼 플리즈식 밤 근무 3개). 체크리스트·배정 종결을 근무 상태(duty)로 대체.
 *   v3 의 진행(체크리스트 한 판)은 근무 구조와 대응하지 않으므로 버리고 설정만 남긴다(docs/DESIGN_V4.md §9).
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
  /** v5: 근무(밤)·건·경고·면담·재생 */
  duty: DutyState;
  /** v5: 타임라인 id → 본 적 있는 가장 늦은 시각(분) */
  obsReached: Record<Id, number>;
  /** v5: 메시지 id → 도착한 단말 시각('HH:MM') */
  arrivedAt: Record<Id, string>;
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
  4: (d) => {
    // v4(대조 체크리스트 한 판) → v5(근무 3개): 진행은 대응하지 않으므로 처음부터, 설정만 유지한다.
    const settings = (d.settings ?? {}) as Record<string, unknown>;
    return { ...freshV5(), settings: { ...freshV5().settings, ...settings } };
  },
};

/** v5 의 빈 상태(마이그레이션용). 스토어의 initialPersisted 와 같은 모양이어야 한다(save.test). */
export function freshV5(): PersistedState {
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
    opened: [],
    reports: {},
    filed: [],
    degraded: [],
    hints: { sent: {}, fails: {} },
    stats: {
      searches: 0,
      unknownSearches: 0,
      scrubs: 0,
      taps: 0,
      captures: 0,
      stamps: 0,
      stampMisses: 0,
      reportSubmits: 0,
      reportFails: 0,
      inspects: 0,
    },
    settings: { textSpeed: 1, volume: 0.8, showProvenance: false, hintLevel: 'normal', haptics: true, reduceFlicker: false },
    duty: emptyDuty(),
    obsReached: {},
    arrivedAt: {},
  };
}

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
