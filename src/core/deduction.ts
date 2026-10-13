import { josa } from './josa';
import { FACT_LABELS, citeEvidence, factText, hasFact, sameFact } from './content';

export { judgeYear } from './chronology';
import type { Fact, Feedback, JudgeContext, JudgeResult, PersonDeduction, Verdict } from './types';

/**
 * 사실 기반 판정(인물 — 보고서 '누구' 칸) 규칙:
 *  1. 인용 증거가 입증한 사실 F(보유 단계 기준, 누적)
 *  2. 선택지와 모순되는 사실이 F 에 있으면           → wrong (그 사실을 지목)
 *  3. requiredFacts 중 F 에 없는 것이 있으면          → undetermined (사실 '종류'만 지목, 값은 비공개)
 *  4. 선택지가 정답이 아니면                          → wrong
 *  5. 그 외                                          → confirmed
 * 3 이 4 보다 먼저이므로 근거가 부족할 때는 정답/오답 여부가 새지 않는다.
 */

export function citedFacts(evidenceIds: readonly string[], ctx: JudgeContext) {
  const { views, feedback } = citeEvidence(evidenceIds, ctx);
  const facts: Fact[] = [];
  for (const v of views) for (const f of v.facts) if (!hasFact(facts, f)) facts.push(f);
  if (views.length > 0 && facts.length === 0)
    feedback.push({ code: 'no_facts', message: '인용한 증거에서 확인된 사실이 없습니다.' });
  return { facts, feedback };
}

export function missingFeedback(required: readonly Fact[], facts: readonly Fact[]): Feedback[] {
  const kinds = new Set(required.filter((f) => !hasFact(facts, f)).map((f) => f.kind));
  return [...kinds].map((kind) => ({
    code: 'missing_fact' as const,
    message: `아직 ${josa(FACT_LABELS[kind], '을/를')} 입증하는 증거가 인용되지 않았습니다.`,
  }));
}

/** 인물 f.kind 의 사실이 하나라도 있고 값이 다르면 모순. 그 종류의 사실이 없으면 '확인 불가'. */
export function personConflicts(personFacts: readonly Fact[], facts: readonly Fact[]) {
  const contradicting: Fact[] = [];
  for (const f of facts) {
    const sameKind = personFacts.filter((p) => p.kind === f.kind);
    if (sameKind.length > 0 && !sameKind.some((p) => sameFact(p, f))) contradicting.push(f);
  }
  return contradicting;
}

export function judgePerson(
  d: PersonDeduction,
  sub: { candidateId: string; evidenceIds: readonly string[] },
  ctx: JudgeContext,
): JudgeResult {
  const res = (verdict: Verdict, feedback: Feedback[]): JudgeResult => ({ deductionId: d.id, verdict, feedback });
  const person = ctx.persons[sub.candidateId];
  if (!person || !d.candidates.includes(sub.candidateId))
    return res('undetermined', [{ code: 'unknown_choice', message: '후보 목록에 없는 인물입니다.' }]);

  const { facts, feedback } = citedFacts(sub.evidenceIds, ctx);
  const contradicting = personConflicts(person.facts, facts);
  if (contradicting.length > 0)
    return res('wrong', [
      ...feedback,
      ...contradicting.map((fact) => ({
        code: 'fact_contradiction' as const,
        fact,
        message: `${josa(`'${factText(fact)}'`, '은/는')} ${josa(person.name, '와/과')} 맞지 않습니다.`,
      })),
    ]);

  const missing = missingFeedback(d.requiredFacts, facts);
  if (missing.length > 0) return res('undetermined', [...feedback, ...missing]);

  if (sub.candidateId !== d.answer) {
    const unverified = d.requiredFacts.filter((f) => !hasFact(person.facts, f));
    return res('wrong', [
      ...feedback,
      ...unverified.map((fact) => ({
        code: 'fact_unverified' as const,
        fact,
        message: `${person.name}에게서 ${josa(`'${factText(fact)}'`, '을/를')} 확인할 수 없습니다.`,
      })),
    ]);
  }
  return res('confirmed', feedback);
}
