import { citeEvidence } from './content';
import type { EvidenceView, Feedback, JudgeContext, JudgeResult, Year, YearDeduction } from './types';

/**
 * 연대 추리 엔진. 규칙 전문은 docs/ARCHITECTURE.md §5.
 *
 * L_s = max(context.from, notBefore of cited evidence with strength ∈ s)
 * U_s = min(context.to,   notAfter  of cited evidence with strength ∈ s)
 *   s = {decisive}            → L_dec, U_dec
 *   s = {decisive,supporting} → L_all, U_all   (weak 은 어떤 경계도 정당화하지 못한다)
 *
 * 판정 순서(먼저 걸리는 것으로 결정):
 *  1. 입력 오류(정수 아님, from > to)                         → undetermined
 *  2. 비약(非weak) 인용 증거 e 와 [from,to] ∩ [nb_e,na_e] = ∅  → wrong
 *  3. [from,to] ⊉ target                                    → wrong
 *  4. from > L_all 또는 to < U_all (경계 미정당화)            → undetermined
 *  5. [from,to] = target 이고 from ≤ L_dec, to ≥ U_dec        → confirmed
 *  6. to-from+1 ≤ maxPartialWidth                           → partial
 *  7. 그 외(근거는 맞지만 너무 넓음)                          → undetermined
 */

export interface Bounds {
  from?: Year;
  to?: Year;
}

const tighterMax = (a: Year | undefined, b: Year | undefined) =>
  a === undefined ? b : b === undefined ? a : Math.max(a, b);
const tighterMin = (a: Year | undefined, b: Year | undefined) =>
  a === undefined ? b : b === undefined ? a : Math.min(a, b);

/** 인용 증거 중 허용 강도의 것만으로 계산한 교집합 범위. from > to 이면 증거끼리 모순. */
export function impliedRange(
  views: readonly EvidenceView[],
  context: Bounds | undefined,
  allowSupporting: boolean,
): Bounds {
  let from = context?.from;
  let to = context?.to;
  for (const v of views) {
    const t = v.time;
    if (!t || t.strength === 'weak') continue;
    if (t.strength === 'supporting' && !allowSupporting) continue;
    from = tighterMax(from, t.notBefore);
    to = tighterMin(to, t.notAfter);
  }
  return { from, to };
}

export const overlaps = (aFrom: Year, aTo: Year, b: { notBefore?: Year; notAfter?: Year }) =>
  (b.notBefore ?? -Infinity) <= aTo && (b.notAfter ?? Infinity) >= aFrom;

function evidenceFeedback(v: EvidenceView, from: Year, to: Year): Feedback[] {
  const t = v.time;
  const name = `「${v.label}」`;
  const evidenceId = v.id;
  if (!t || (t.notBefore === undefined && t.notAfter === undefined))
    return [{ code: 'no_time_info', evidenceId, message: `${name}은(는) 연대와 관련된 정보가 없습니다.` }];

  const out: Feedback[] = [];
  const conflict = !overlaps(from, to, t);
  if (t.strength === 'weak') {
    const why = t.weakReason ?? '사용·복제 시기가 불확실함';
    out.push({ code: 'weak', evidenceId, message: t.feedback ?? `${name}은(는) 연대를 확정하기에 약합니다(${why}).` });
    if (conflict)
      out.push({
        code: 'weak_conflict',
        evidenceId,
        message: `제출한 범위가 ${name}와(과) 어긋나지만, 약한 증거라 판정 근거로 쓰지 않습니다.`,
      });
    return out;
  }
  // 카드 고유 문구가 있으면 그것을, 없으면 일반 문구(코드는 같다)
  const say = (generic: string) => t.feedback ?? `${name}은(는) ${generic}`;
  if (t.notBefore !== undefined && t.notAfter !== undefined)
    out.push({ code: 'bounds_both', evidenceId, message: say('하한과 상한을 모두 제한합니다.') });
  else if (t.notBefore !== undefined)
    out.push({ code: 'bounds_lower', evidenceId, message: say('하한만 제한합니다.') });
  else out.push({ code: 'bounds_upper', evidenceId, message: say('상한만 제한합니다.') });
  if (conflict) out.push({ code: 'contradiction', evidenceId, message: `제출한 범위가 ${name}와(과) 모순됩니다.` });
  return out;
}

export interface YearSubmission {
  from: Year;
  to: Year;
  evidenceIds: readonly string[];
}

export function judgeYear(d: YearDeduction, sub: YearSubmission, ctx: JudgeContext): JudgeResult {
  const result = (verdict: JudgeResult['verdict'], feedback: Feedback[], implied?: Bounds): JudgeResult => ({
    deductionId: d.id,
    verdict,
    feedback,
    implied,
  });
  const { from, to } = sub;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to)
    return result('undetermined', [
      { code: 'invalid_input', message: '시작 연도는 종료 연도보다 늦을 수 없고, 연도는 정수여야 합니다.' },
    ]);

  const { views, feedback } = citeEvidence(sub.evidenceIds, ctx);
  for (const v of views) feedback.push(...evidenceFeedback(v, from, to));
  const all = impliedRange(views, d.context, true);
  const dec = impliedRange(views, d.context, false);

  if (feedback.some((f) => f.code === 'contradiction')) return result('wrong', feedback, all);

  const { from: tFrom, to: tTo } = d.target;
  if (from > tFrom || to < tTo)
    return result(
      'wrong',
      [...feedback, { code: 'excludes_truth', message: '제출한 범위는 사실과 맞지 않습니다. 증거를 다시 검토하세요.' }],
      all,
    );

  const lowerOk = all.from !== undefined && from <= all.from;
  const upperOk = all.to !== undefined && to >= all.to;
  if (!lowerOk)
    feedback.push({
      code: 'unjustified_lower',
      message:
        all.from === undefined
          ? '시작 연도를 제한하는 증거가 인용되지 않았습니다.'
          : `시작 연도 ${from}은(는) 인용한 증거로 뒷받침되지 않습니다.`,
    });
  if (!upperOk)
    feedback.push({
      code: 'unjustified_upper',
      message:
        all.to === undefined
          ? '종료 연도를 제한하는 증거가 인용되지 않았습니다.'
          : `종료 연도 ${to}은(는) 인용한 증거로 뒷받침되지 않습니다.`,
    });
  if (!lowerOk || !upperOk) return result('undetermined', feedback, all);

  const decisiveOk = dec.from !== undefined && from <= dec.from && dec.to !== undefined && to >= dec.to;
  if (from === tFrom && to === tTo && decisiveOk) return result('confirmed', feedback, all);

  if (!decisiveOk)
    feedback.push({
      code: 'needs_decisive',
      message: '범위의 일부 경계가 보조 증거에만 근거합니다. 확정하려면 결정적 증거가 필요합니다.',
    });
  if (to - from + 1 <= d.maxPartialWidth) return result('partial', feedback, all);
  return result(
    'undetermined',
    [...feedback, { code: 'too_broad', message: '근거는 타당하지만 범위가 너무 넓어 연대를 좁혔다고 보기 어렵습니다.' }],
    all,
  );
}
