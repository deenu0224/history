/**
 * 저장(IndexedDB, idb-keyval). v6 = v5 「눈을 빌려 다시 쓰기」.
 * 이전 버전(v1~v5: 걷기·대조·근무)의 진행은 v5 구조와 대응하지 않으므로 버리고 설정만 남긴다(DESIGN_V5 §10).
 * 스키마(PersistedState)는 스토어가 정의한다 — 여기서는 버전·마이그레이션·입출력만 다룬다.
 */
import { del, get, set } from 'idb-keyval';

export const SAVE_VERSION = 6;
export const SAVE_SCHEMA = 'gyeollok-save';
export type SaveSlot = 'auto' | 'manual';

export interface SaveFile<T = Record<string, unknown>> {
  schema: typeof SAVE_SCHEMA;
  version: number;
  savedAt: string;
  slot: SaveSlot;
  data: T;
}

/** 옛 설정 키 → v6 설정(알아볼 수 있는 것만 옮긴다) */
export function carrySettings(old: unknown): Record<string, unknown> {
  const o = (old && typeof old === 'object' ? old : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof o.volume === 'number') out.volume = o.volume;
  if (o.hintLevel === 'off' || o.hintLevel === 'normal' || o.hintLevel === 'detailed') out.hintLevel = o.hintLevel;
  if (typeof o.haptics === 'boolean') out.haptics = o.haptics;
  if (typeof o.showProvenance === 'boolean') out.showProvenance = o.showProvenance;
  if (typeof o.reduceFlicker === 'boolean') out.reduceMotion = o.reduceFlicker;
  if (typeof o.reduceMotion === 'boolean') out.reduceMotion = o.reduceMotion;
  for (const k of ['music', 'fastMessages'] as const) if (typeof o[k] === 'boolean') out[k] = o[k];
  if (o.textSize === 'normal' || o.textSize === 'large') out.textSize = o.textSize;
  if (o.holdMode === 'hold' || o.holdMode === 'double_tap') out.holdMode = o.holdMode;
  return out;
}

/** version n → n+1 변환. 키는 '변환 전' 버전. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** v1~v5 → v6: 진행을 모두 버리고 설정만 남긴다(스토어가 빈 상태에 settings 를 덮는다). */
const resetKeepSettings: Migration = (d) => ({ __reset: true, settings: carrySettings(d.settings) });

export const migrations: Record<number, Migration> = {
  1: resetKeepSettings,
  2: resetKeepSettings,
  3: resetKeepSettings,
  4: resetKeepSettings,
  5: resetKeepSettings,
};

export const slotKey = (slot: SaveSlot) => `${SAVE_SCHEMA}:${slot}`;

export class SaveError extends Error {}

export function migrate(raw: unknown, table: Record<number, Migration> = migrations, target = SAVE_VERSION): SaveFile {
  if (!raw || typeof raw !== 'object') throw new SaveError('저장 데이터가 손상되었습니다.');
  const file = raw as Partial<SaveFile> & { data?: unknown };
  if (file.schema !== SAVE_SCHEMA || typeof file.version !== 'number' || !file.data)
    throw new SaveError('알 수 없는 저장 형식입니다.');
  if (file.version > target) throw new SaveError('더 새로운 버전의 저장 데이터입니다.');
  let data = file.data as Record<string, unknown>;
  for (let v = file.version; v < target; v++) {
    const step = table[v];
    if (!step) throw new SaveError(`v${v} → v${v + 1} 마이그레이션이 없습니다.`);
    data = step(data);
    if (data.__reset) break; // 진행을 버렸다 — 이후 단계는 필요 없다
  }
  return { ...(file as SaveFile), version: target, data };
}

export async function saveGame<T>(slot: SaveSlot, data: T, now = new Date()): Promise<SaveFile<T>> {
  const file: SaveFile<T> = { schema: SAVE_SCHEMA, version: SAVE_VERSION, savedAt: now.toISOString(), slot, data };
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
