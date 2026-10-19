import { describe, expect, it } from 'vitest';
import { EP0_V6 as D } from '@/data/v6/ep0';
import { validateEp0 } from '@/core/v6/validate';

describe('v6 검증기(V1~V8, F1~F8)', () => {
  const r = validateEp0(D);

  it('오류 0건', () => {
    expect(r.errors).toEqual([]);
  });

  it('모든 틀린 묶음이 코드를 받는다(105 − 맞는 묶음 7 = 98)', () => {
    const total = Object.values(r.codes).reduce((a, b) => a + b, 0);
    expect(total).toBe(98);
    expect(r.codes.conflict).toBeGreaterThan(0);
    expect(r.codes.other).toBeGreaterThan(0);
    expect(r.codes.unlinked).toBeGreaterThan(0);
    expect(r.codes.twice).toBeGreaterThan(0);
    expect(r.codes.off_goal).toBeGreaterThan(0);
  });

  it('V2: 도달 가능한 모든 주머니 상태에서 무작위 맞춰 보기가 새 결론을 낼 확률 ≤ 1/5', () => {
    expect(r.oddsUnit.max).toBeLessThanOrEqual(1 / 5);
    // 설계표(§6.4): N0 + 관측 1쪽(카드 7장) 21묶음 중 2 — 이것이 최대
    expect(r.oddsUnit.max).toBeCloseTo(2 / 21, 6);
    expect(r.oddsUnit.maxState?.bag.length).toBe(7);
    expect(r.oddsClue.max).toBeLessThanOrEqual(1 / 5);
    // 상태별 값도 설계표와 같다: 단서 11장 결론 없음 4/55, A 뒤 3/66 …
    const sizes = r.oddsUnit.bySize;
    expect(sizes[14]).toBeLessThan(0.02);
    expect(sizes[15]).toBeLessThan(0.02);
  });
});
