import { del, get, set } from 'idb-keyval';
import type { CollectionStage, FlagValue, Id, PlayerNotebook, Verdict } from './types';

export const SAVE_VERSION = 1;
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
}

/** 저장되는 게임 상태(v1). 구조를 바꾸면 SAVE_VERSION 을 올리고 migrations 에 변환을 추가한다. */
export interface PersistedState {
  flags: Record<string, FlagValue>;
  /** 보유 증거 id → 공개 단계 */
  evidence: Record<Id, number>;
  collection: Record<Id, CollectionStage>;
  notebook: PlayerNotebook;
  solved: Record<Id, SolvedRecord>;
  /** 판정 시도 수(풀지 못한 문제 포함) */
  attempts: Record<Id, number>;
  observations: Id[];
  examined: Id[];
  currentScene: Id | null;
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
export const migrations: Record<number, Migration> = {};

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
