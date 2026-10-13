import {
  advanceStage,
  applyCollectionEvent,
  completion,
  countAtLeast,
  entryView,
  STAGE_LABELS,
  toStage,
  visibleFields,
} from '@/core/collection';
import { sampleContent } from './fixtures';

const c = sampleContent();
const zither = c.collection.find((e) => e.id === 'sample_col_zither')!;

describe('collection stages', () => {
  it('has six labelled stages', () => {
    expect(Object.values(STAGE_LABELS)).toEqual(['미발견', '발견', '정체 식별', '정보 검증', '관련 기록 연결', '도감 완성']);
  });

  it('only advances, never regresses, and returns the same object when unchanged', () => {
    let p = advanceStage({}, 'a', 3);
    expect(p).toEqual({ a: 3 });
    const same = advanceStage(p, 'a', 1);
    expect(same).toBe(p);
    p = applyCollectionEvent(p, 'a', 'complete');
    expect(p.a).toBe(5);
    expect(applyCollectionEvent({}, 'b', 'discover')).toEqual({ b: 1 });
  });

  it('clamps stages', () => {
    expect(toStage(9)).toBe(5);
    expect(toStage(-2)).toBe(0);
    expect(advanceStage({}, 'a', 99)).toEqual({ a: 5 });
  });

  it('unlocks fields and title by stage', () => {
    expect(entryView(zither, 0).title).toBe('???');
    expect(entryView(zither, 1).title).toBe('오래된 현악기');
    expect(entryView(zither, 2).title).toBe('샘플 거문고');
    expect(visibleFields(zither, 1).map((f) => f.key)).toEqual(['look']);
    expect(visibleFields(zither, 3).map((f) => f.key)).toEqual(['look', 'owner']);
    expect(entryView(zither, 4).stageLabel).toBe('관련 기록 연결');
  });

  it('computes completion and category counts', () => {
    const progress = { sample_col_zither: 5, sample_col_person: 2 } as const;
    const all = completion(c.collection, progress);
    expect(all).toEqual({ total: 5, discovered: 2, completed: 1, ratio: 7 / 25 });
    expect(completion(c.collection, progress, 'artifact').ratio).toBe(1);
    expect(completion([], {}).ratio).toBe(0);
    expect(countAtLeast(c.collection, progress, 'person', 2)).toBe(1);
    expect(countAtLeast(c.collection, progress, 'person', 3)).toBe(0);
  });
});
