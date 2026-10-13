import type { Evidence, JudgeContext, TimeConstraint, YearDeduction } from '@/core/types';

export function timeEv(id: string, time: TimeConstraint, label = id): Evidence {
  return { id, provenance: 'fictional', category: 'document', levels: [{ label, text: '', time }] };
}

export function yearDed(over: Partial<YearDeduction> = {}): YearDeduction {
  return {
    id: 'yd',
    kind: 'year',
    provenance: 'fictional',
    target: { from: 1498, to: 1498 },
    maxPartialWidth: 10,
    ...over,
  };
}

/** 증거 목록 → 모두 보유(단계 0)한 문맥 */
export function ownAll(evs: Evidence[]): JudgeContext {
  return {
    evidence: Object.fromEntries(evs.map((e) => [e.id, e])),
    persons: {},
    owned: Object.fromEntries(evs.map((e) => [e.id, 0])),
  };
}
