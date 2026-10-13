import { indexContent } from '@/core/content';
import type { CollectionEntry, CollectionCategory } from '@/core/types';
import { content } from '@/data';

/** 스토어가 쓰는 것과 같은 레지스트리 콘텐츠(읽기 전용). */
export const CONTENT = content;
export const IDX = indexContent(content);

export const CATEGORY_ORDER: CollectionCategory[] = ['artifact', 'source', 'person', 'event', 'place'];
export const CATEGORY_LABEL: Record<CollectionCategory, string> = {
  artifact: '유물',
  source: '사료',
  person: '인물',
  event: '사건',
  place: '장소',
};

export const entriesOf = (cat: CollectionCategory): CollectionEntry[] =>
  CONTENT.collection.filter((e) => e.category === cat);

const byRef: Record<string, CollectionEntry> = {};
for (const e of CONTENT.collection) byRef[`${e.category}:${e.refId}`] = e;
export const entryForRef = (cat: CollectionCategory, refId: string): CollectionEntry | undefined => byRef[`${cat}:${refId}`];
