import { indexContent, mergeModules } from '@/core/content';
import type { ContentBundle, Evidence, JudgeContext, TimeConstraint, YearDeduction } from '@/core/types';
import { sample } from '@/data/sample';

export const sampleContent = (): ContentBundle => structuredClone(mergeModules(sample));

export function ctxFor(content: ContentBundle, owned: Record<string, number>): JudgeContext {
  const idx = indexContent(content);
  return { evidence: idx.evidence, persons: idx.persons, owned };
}

export function timeEv(id: string, time: TimeConstraint, label = id): Evidence {
  return { id, provenance: 'fictional', category: 'document', levels: [{ label, text: '', time }] };
}

export function yearDed(over: Partial<YearDeduction> = {}): YearDeduction {
  return {
    id: 'yd',
    kind: 'year',
    provenance: 'fictional',
    title: '',
    prompt: '',
    target: { from: 1498, to: 1498 },
    maxPartialWidth: 10,
    relevantEvidence: [],
    rewards: { confirmed: [] },
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
