import { del, get, set } from 'idb-keyval';
import type { AppId, CollectionStage, FlagValue, Id, PlayerNotebook, PlayStats, Verdict } from './types';
import type { HintLevel, TutorialState } from './terminal';

export const SAVE_VERSION = 2;
export const SAVE_SCHEMA = 'gyeollok-save';
export type SaveSlot = 'auto' | 'manual';

export interface SolvedRecord {
  /** 지금까지의 최고 판정(partial | confirmed) */
  best: Extract<Verdict, 'partial' | 'confirmed'>;
  attempts: number;
}

export interface Settings {
  textSpeed: number;
  volume: number;
  showInteractHints: boolean;
  /** 엔딩 후 '재구성/가상' 표식 노출 */
  showProvenance: boolean;
  /** 힌트 단계: 끔 / 보통 / 자세히 */
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
  status: 'ok' | 'unknown' | 'too_short' | 'empty';
  /** 맞은 색인 항목 */
  entryIds: Id[];
}

/**
 * 저장되는 게임 상태(v2: 결록 단말). 구조를 바꾸면 SAVE_VERSION 을 올리고 migrations 에 변환을 추가한다.
 * v1 → v2: currentScene·examined 제거(걷기 폐지), 단말 상태 추가.
 */
export interface PersistedState {
  flags: Record<string, FlagValue>;
  /** 보유 증거 id → 공개 단계 */
  evidence: Record<Id, number>;
  collection: Record<Id, CollectionStage>;
  /** 손글씨 노트(오프라인 스캔) — 정합성 보정의 대상이 아니다 */
  notebook: PlayerNotebook;
  solved: Record<Id, SolvedRecord>;
  /** 판정 시도 수(풀지 못한 문제 포함) */
  attempts: Record<Id, number>;
  observations: Id[];
  /** 검색어 수첩(칩) — 표기 그대로 */
  terms: string[];
  searchLog: SearchLogEntry[];
  /** 한 번 이상 맞힌 색인 항목 */
  searched: Id[];
  /** 사료 뷰어 서재 */
  sources: Id[];
  /** 등록한 구절 */
  phrases: Id[];
  /** 도착한 메시지(도착 순) */
  inbox: Id[];
  read: Id[];
  /** 메시지 id → 고른 답장 id */
  replies: Record<Id, Id>;
  /** 적용된 정합성 보정 */
  corrections: Id[];
  /** 탭한 핫스팟 */
  tapped: Id[];
  /** 살펴본 기록관 전시물 */
  exhibitsSeen: Id[];
  /** 타임라인 id → 마지막 시각(분) */
  obsMinute: Record<Id, number>;
  appsOpened: AppId[];
  stats: PlayStats;
  tutorial: TutorialState;
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
