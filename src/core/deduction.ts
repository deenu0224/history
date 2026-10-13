import { judgeYear } from './chronology';
import { FACT_LABELS, citeEvidence, factText, hasFact, sameFact } from './content';
import type {
  CausalDeduction,
  CausalSubmissionLink,
  Deduction,
  DeductionSubmission,
  EventDeduction,
  Fact,
  Feedback,
  JudgeContext,
  JudgeResult,
  PersonDeduction,
  Reward,
  Verdict,
} from './types';

/**
 * 사실 기반 판정(인물·사건) 공통 규칙:
 *  1. 인용 증거가 입증한 사실 F(보유 단계 기준, 누적)
 *  2. 선택지와 모순되는 사실이 F 에 있으면           → wrong (그 사실을 지목)
 *  3. requiredFacts 중 F 에 없는 것이 있으면          → undetermined (사실 '종류'만 지목, 값은 비공개)
 *  4. 선택지가 정답이 아니면                          → wrong
 *  5. 그 외                                          → confirmed
 * 3 이 4 보다 먼저이므로 근거가 부족할 때는 정답/오답 여부가 새지 않는다.
 */

function citedFacts(evidenceIds: readonly string[], ctx: JudgeContext) {
  const { views, feedback } = citeEvidence(evidenceIds, ctx);
  const facts: Fact[] = [];
  for (const v of views) for (const f of v.facts) if (!hasFact(facts, f)) facts.push(f);
  if (views.length > 0 && facts.length === 0)
    feedback.push({ code: 'no_facts', message: '인용한 증거에서 확인된 사실이 없습니다.' });
  return { facts, feedback };
}

function missingFeedback(required: readonly Fact[], facts: readonly Fact[]): Feedback[] {
  const kinds = new Set(required.filter((f) => !hasFact(facts, f)).map((f) => f.kind));
  return [...kinds].map((kind) => ({
    code: 'missing_fact' as const,
    message: `아직 ${FACT_LABELS[kind]}을(를) 입증하는 증거가 인용되지 않았습니다.`,
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
        message: `'${factText(fact)}'은(는) ${person.name}와(과) 맞지 않습니다.`,
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
        message: `${person.name}에게서 '${factText(fact)}'을(를) 확인할 수 없습니다.`,
      })),
    ]);
  }
  return res('confirmed', feedback);
}

export function judgeEvent(
  d: EventDeduction,
  sub: { statementId: string; evidenceIds: readonly string[] },
  ctx: JudgeContext,
): JudgeResult {
  const res = (verdict: Verdict, feedback: Feedback[]): JudgeResult => ({ deductionId: d.id, verdict, feedback });
  const statement = d.statements.find((s) => s.id === sub.statementId);
  if (!statement) return res('undetermined', [{ code: 'unknown_choice', message: '선택지에 없는 진술입니다.' }]);

  const { facts, feedback } = citedFacts(sub.evidenceIds, ctx);
  const refuting = (statement.refutedBy ?? []).filter((f) => hasFact(facts, f));
  if (refuting.length > 0)
    return res('wrong', [
      ...feedback,
      ...refuting.map((fact) => ({
        code: 'fact_contradiction' as const,
        fact,
        message: `'${factText(fact)}'은(는) 이 진술과 모순됩니다.`,
      })),
    ]);

  const missing = missingFeedback(d.requiredFacts, facts);
  if (missing.length > 0) return res('undetermined', [...feedback, ...missing]);

  if (statement.id !== d.answer)
    return res('wrong', [
      ...feedback,
      { code: 'not_supported', message: '인용한 증거들은 이 진술을 뒷받침하지 않습니다.' },
    ]);
  return res('confirmed', feedback);
}

/**
 * 인과 추리(주 봉우리). 화살표마다 판정한다:
 *  1. 입력 오류(없는 마디, 자기 자신, 같은 화살표 중복, 화살표 0개)          → undetermined
 *  2. 화살표에 인용 사실이 없음                                              → 그 화살표 link_unsupported
 *     (근거 없이 화살표만 바꿔 보며 정답을 캐낼 수 없게, 틀린 화살표 판정보다 먼저)
 *  3. 정답 고리에 없는 화살표: 알려진 오답이면 그 고유 문구, 방향이 뒤집혔으면 link_reversed, 아니면 link_wrong
 *  4. 정답 화살표인데 필요한 사실이 인용되지 않음                             → link_unsupported(사실 '종류'만)
 *  판정: 3 이 하나라도 → wrong / 2·4 가 하나라도 → undetermined / 정답 화살표가 빠짐 → undetermined(chain_incomplete)
 *        / 그 외 → confirmed. 정답 마디·순서는 피드백에 나오지 않는다(틀린 화살표의 마디는 플레이어가 고른 것).
 */
export function judgeCausal(d: CausalDeduction, sub: { links: readonly CausalSubmissionLink[] }, ctx: JudgeContext): JudgeResult {
  const res = (verdict: Verdict, feedback: Feedback[]): JudgeResult => ({ deductionId: d.id, verdict, feedback });
  const node = new Map(d.nodes.map((n) => [n.id, n]));
  const key = (a: string, b: string) => `${a}>${b}`;
  const seen = new Set<string>();
  if (!sub.links.length) return res('undetermined', [{ code: 'invalid_input', message: '화살표를 하나 이상 이어 주세요.' }]);
  for (const l of sub.links) {
    if (!node.has(l.from) || !node.has(l.to) || l.from === l.to || seen.has(key(l.from, l.to)))
      return res('undetermined', [{ code: 'invalid_input', message: '잇는 방식이 올바르지 않습니다(같은 카드끼리, 또는 같은 화살표 두 번).' }]);
    seen.add(key(l.from, l.to));
  }
  const rule = new Map(d.links.map((r) => [key(r.from, r.to), r]));
  const wrongMsg = new Map((d.wrongLinks ?? []).map((w) => [key(w.from, w.to), w.message]));
  const feedback: Feedback[] = [];
  let wrong = false;
  let unsupported = false;
  for (const l of sub.links) {
    const link = { from: l.from, to: l.to };
    const name = `「${node.get(l.from)!.text}」 → 「${node.get(l.to)!.text}」`;
    const cited = citedFacts(l.evidenceIds, ctx);
    feedback.push(...cited.feedback.filter((f) => f.code !== 'no_facts').map((f) => ({ ...f, link })));
    if (cited.facts.length === 0) {
      unsupported = true;
      feedback.push({ code: 'link_unsupported', link, message: `${name}: 이 화살표를 받쳐 줄 카드가 없습니다.` });
      continue;
    }
    const r = rule.get(key(l.from, l.to));
    if (!r) {
      wrong = true;
      const known = wrongMsg.get(key(l.from, l.to));
      if (known) feedback.push({ code: 'link_wrong', link, message: known });
      else if (rule.has(key(l.to, l.from)))
        feedback.push({ code: 'link_reversed', link, message: `${name}: 무엇이 먼저였는지 다시 보세요. 화살표의 방향이 어긋납니다.` });
      else feedback.push({ code: 'link_wrong', link, message: `${name}: 인용한 카드들은 앞의 일이 뒤의 일을 낳았다고 말해 주지 않습니다.` });
      continue;
    }
    const kinds = new Set(r.requires.filter((f) => !hasFact(cited.facts, f)).map((f) => f.kind));
    if (kinds.size) {
      unsupported = true;
      for (const kind of kinds)
        feedback.push({
          code: 'link_unsupported',
          link,
          message: `${name}: 아직 ${FACT_LABELS[kind]}을(를) 입증하는 카드가 이 화살표에 없습니다.`,
        });
    }
  }
  if (wrong) return res('wrong', feedback);
  if (unsupported) return res('undetermined', feedback);
  const missing = d.links.filter((r) => !seen.has(key(r.from, r.to))).length;
  if (missing)
    return res('undetermined', [
      ...feedback,
      { code: 'chain_incomplete', message: `이은 화살표는 모두 맞지만, 끝까지 이어지지 않았습니다. 빠진 고리가 ${missing}개 있습니다.` },
    ]);
  return res('confirmed', feedback);
}

export function judgeDeduction(d: Deduction, sub: DeductionSubmission, ctx: JudgeContext): JudgeResult {
  if (sub.deductionId !== d.id || sub.kind !== d.kind)
    return {
      deductionId: d.id,
      verdict: 'undetermined',
      feedback: [{ code: 'unknown_deduction', message: '제출 형식이 추리 문제와 맞지 않습니다.' }],
    };
  switch (d.kind) {
    case 'year':
      return judgeYear(d, sub as Extract<DeductionSubmission, { kind: 'year' }>, ctx);
    case 'person':
      return judgePerson(d, sub as Extract<DeductionSubmission, { kind: 'person' }>, ctx);
    case 'event':
      return judgeEvent(d, sub as Extract<DeductionSubmission, { kind: 'event' }>, ctx);
    case 'causal':
      return judgeCausal(d, sub as Extract<DeductionSubmission, { kind: 'causal' }>, ctx);
  }
}

const RANK: Record<Verdict, number> = { wrong: 0, undetermined: 0, partial: 1, confirmed: 2 };

/**
 * 판정 + 이번 제출로 새로 지급할 보상. 이전 최고 판정(previous)보다 나아졌을 때만 지급한다.
 * partial → confirmed 로 올라가면 confirmed 보상만 지급(partial 보상은 이미 받음).
 * 처음부터 confirmed 이면 partial 보상도 함께 지급한다.
 */
export function resolveDeduction(
  d: Deduction,
  sub: DeductionSubmission,
  ctx: JudgeContext,
  previous?: Verdict,
): { result: JudgeResult; rewards: Reward[]; improved: boolean } {
  const result = judgeDeduction(d, sub, ctx);
  const before = previous ? RANK[previous] : 0;
  const now = RANK[result.verdict];
  const rewards: Reward[] = [];
  if (now > before) {
    if (before < 1) rewards.push(...(d.rewards.partial ?? []));
    if (now === 2) rewards.push(...d.rewards.confirmed);
  }
  return { result, rewards, improved: now > before };
}
