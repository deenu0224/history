import type { CollectionCategory, CollectionEntry, CollectionField, CollectionStage, Id } from './types';

export const STAGE_LABELS: Record<CollectionStage, string> = {
  0: '미발견',
  1: '발견',
  2: '정체 식별',
  3: '정보 검증',
  4: '관련 기록 연결',
  5: '도감 완성',
};

/** 게임 이벤트 → 도달 단계 */
export const COLLECTION_EVENTS = {
  discover: 1,
  identify: 2,
  verify: 3,
  link: 4,
  complete: 5,
} as const satisfies Record<string, CollectionStage>;
export type CollectionEvent = keyof typeof COLLECTION_EVENTS;

export type CollectionProgress = Readonly<Record<Id, CollectionStage>>;

export const MAX_STAGE: CollectionStage = 5;

export function stageOf(progress: CollectionProgress, entryId: Id): CollectionStage {
  return progress[entryId] ?? 0;
}

export function toStage(n: number): CollectionStage {
  return Math.max(0, Math.min(MAX_STAGE, Math.floor(n))) as CollectionStage;
}

/** 단계는 오르기만 한다. 변화가 없으면 같은 객체를 돌려준다. */
export function advanceStage(progress: CollectionProgress, entryId: Id, stage: number): CollectionProgress {
  const next = toStage(stage);
  if (next <= stageOf(progress, entryId)) return progress;
  return { ...progress, [entryId]: next };
}

export function applyCollectionEvent(progress: CollectionProgress, entryId: Id, event: CollectionEvent) {
  return advanceStage(progress, entryId, COLLECTION_EVENTS[event]);
}

export function visibleFields(entry: CollectionEntry, stage: CollectionStage): CollectionField[] {
  return entry.fields.filter((f) => f.unlockStage <= stage);
}

export interface CollectionEntryView {
  id: Id;
  category: CollectionCategory;
  stage: CollectionStage;
  stageLabel: string;
  title: string;
  fields: CollectionField[];
}

export function entryView(entry: CollectionEntry, stage: CollectionStage): CollectionEntryView {
  const title = stage >= 2 ? entry.title : stage === 1 ? entry.unidentifiedTitle : '???';
  return {
    id: entry.id,
    category: entry.category,
    stage,
    stageLabel: STAGE_LABELS[stage],
    title,
    fields: visibleFields(entry, stage),
  };
}

export interface CompletionStats {
  total: number;
  discovered: number;
  completed: number;
  /** Σstage / (5·total), 0~1 */
  ratio: number;
}

export function completion(
  entries: readonly CollectionEntry[],
  progress: CollectionProgress,
  category?: CollectionCategory,
): CompletionStats {
  const list = category ? entries.filter((e) => e.category === category) : entries;
  let sum = 0;
  let discovered = 0;
  let completed = 0;
  for (const e of list) {
    const s = stageOf(progress, e.id);
    sum += s;
    if (s >= 1) discovered++;
    if (s === MAX_STAGE) completed++;
  }
  return { total: list.length, discovered, completed, ratio: list.length ? sum / (MAX_STAGE * list.length) : 0 };
}

export function countAtLeast(
  entries: readonly CollectionEntry[],
  progress: CollectionProgress,
  category: CollectionCategory,
  stage: CollectionStage,
): number {
  return entries.filter((e) => e.category === category && stageOf(progress, e.id) >= stage).length;
}
