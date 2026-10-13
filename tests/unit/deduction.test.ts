import { judgeDeduction, judgeEvent, judgePerson, resolveDeduction } from '@/core/deduction';
import type { Deduction, EventDeduction, JudgeResult, PersonDeduction } from '@/core/types';
import { ctxFor, sampleContent } from './fixtures';

const c = sampleContent();
const get = <T extends Deduction>(id: string) => c.deductions.find((d) => d.id === id) as T;
const person = get<PersonDeduction>('sample_ded_person');
const event = get<EventDeduction>('sample_ded_event');
const codes = (r: JudgeResult) => r.feedback.map((f) => f.code);

const OFFICIAL = 'sample_ev_unknown_official';
const ZITHER = 'sample_ev_zither';

describe('judgePerson', () => {
  const full = ctxFor(c, { [OFFICIAL]: 0, [ZITHER]: 1 });

  it('confirms the right candidate with all required facts', () => {
    expect(judgePerson(person, { candidateId: 'sample_person_scribe', evidenceIds: [OFFICIAL, ZITHER] }, full).verdict).toBe(
      'confirmed',
    );
  });

  it('is undetermined (same answer for right and wrong candidates) when a required fact is missing', () => {
    for (const candidateId of ['sample_person_scribe', 'sample_person_scholar']) {
      const r = judgePerson(person, { candidateId, evidenceIds: [OFFICIAL] }, full);
      expect(r.verdict).toBe('undetermined');
      expect(codes(r)).toEqual(['missing_fact']);
      expect(r.feedback[0]!.message).toContain('소유물');
      expect(r.feedback[0]!.message).not.toContain('거문고');
    }
  });

  it('reveal level matters: zither at level 0 proves nothing', () => {
    const r = judgePerson(
      person,
      { candidateId: 'sample_person_scribe', evidenceIds: [OFFICIAL, ZITHER] },
      ctxFor(c, { [OFFICIAL]: 0, [ZITHER]: 0 }),
    );
    expect(r.verdict).toBe('undetermined');
  });

  it('wrong when cited facts contradict the candidate, naming the fact', () => {
    const r = judgePerson(person, { candidateId: 'sample_person_minister', evidenceIds: [OFFICIAL] }, full);
    expect(r.verdict).toBe('wrong');
    expect(r.feedback.find((f) => f.code === 'fact_contradiction')!.fact).toEqual({ kind: 'office', value: '샘플 사관직' });
  });

  it('wrong for a look-alike candidate once discriminating fact is cited', () => {
    const r = judgePerson(person, { candidateId: 'sample_person_scholar', evidenceIds: [OFFICIAL, ZITHER] }, full);
    expect(r.verdict).toBe('wrong');
    expect(r.feedback.some((f) => f.fact?.kind === 'possession')).toBe(true);
  });

  it('rejects candidates outside the list', () => {
    expect(codes(judgePerson(person, { candidateId: 'nobody', evidenceIds: [] }, full))).toEqual(['unknown_choice']);
  });

  it('reports evidence that proves no facts', () => {
    const r = judgePerson(
      person,
      { candidateId: 'sample_person_scribe', evidenceIds: ['sample_ev_book'] },
      ctxFor(c, { sample_ev_book: 0 }),
    );
    expect(codes(r)).toContain('no_facts');
  });
});

describe('judgeEvent', () => {
  const ctx = ctxFor(c, { sample_ev_order_record: 0, sample_ev_petition_log: 0 });
  const both = ['sample_ev_order_record', 'sample_ev_petition_log'];

  it('confirms the supported statement', () => {
    expect(judgeEvent(event, { statementId: 'ordered', evidenceIds: both }, ctx).verdict).toBe('confirmed');
  });
  it('wrong when a cited fact refutes the statement', () => {
    const r = judgeEvent(event, { statementId: 'tolerated', evidenceIds: ['sample_ev_order_record'] }, ctx);
    expect(r.verdict).toBe('wrong');
    expect(codes(r)).toContain('fact_contradiction');
  });
  it('undetermined when not refuted but required facts missing', () => {
    const r = judgeEvent(event, { statementId: 'permitted', evidenceIds: ['sample_ev_order_record'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toEqual(['missing_fact']);
    expect(judgeEvent(event, { statementId: 'ordered', evidenceIds: ['sample_ev_order_record'] }, ctx).verdict).toBe(
      'undetermined',
    );
  });
  it('wrong statement with full evidence but no refutation → not_supported', () => {
    const e2: EventDeduction = { ...event, statements: [...event.statements, { id: 'other', text: '?' }] };
    const r = judgeEvent(e2, { statementId: 'other', evidenceIds: both }, ctx);
    expect(r.verdict).toBe('wrong');
    expect(codes(r)).toContain('not_supported');
  });
  it('unknown statement', () => {
    expect(judgeEvent(event, { statementId: 'x', evidenceIds: [] }, ctx).feedback[0]!.code).toBe('unknown_choice');
  });
});

describe('judgeDeduction / resolveDeduction', () => {
  const year = get<Deduction>('sample_ded_year');
  const ctx = ctxFor(c, { sample_ev_edict: 0, sample_ev_calendar: 1, sample_ev_rumor: 0 });
  const confirmedSub = {
    kind: 'year' as const,
    deductionId: 'sample_ded_year',
    from: 1498,
    to: 1498,
    evidenceIds: ['sample_ev_edict', 'sample_ev_calendar'],
  };
  const partialSub = { ...confirmedSub, to: 1501, evidenceIds: ['sample_ev_edict', 'sample_ev_rumor'] };

  it('dispatches by kind and rejects mismatched submissions', () => {
    expect(judgeDeduction(year, confirmedSub, ctx).verdict).toBe('confirmed');
    const bad = judgeDeduction(year, { kind: 'person', deductionId: 'sample_ded_year', candidateId: 'x', evidenceIds: [] }, ctx);
    expect(bad.feedback[0]!.code).toBe('unknown_deduction');
  });

  it('first confirmed grants partial + confirmed rewards', () => {
    const { rewards, improved } = resolveDeduction(year, confirmedSub, ctx);
    expect(improved).toBe(true);
    expect(rewards.map((r) => r.type)).toEqual(['flag', 'flag', 'collection', 'notebook', 'resolveQuestion']);
  });

  it('partial then confirmed grants each reward set once', () => {
    const p = resolveDeduction(year, partialSub, ctx);
    expect(p.result.verdict).toBe('partial');
    expect(p.rewards).toEqual([{ type: 'flag', flag: 'sample_year_partial' }]);
    expect(resolveDeduction(year, partialSub, ctx, 'partial').rewards).toEqual([]);
    const c2 = resolveDeduction(year, confirmedSub, ctx, 'partial');
    expect(c2.rewards).toHaveLength(4);
    expect(resolveDeduction(year, confirmedSub, ctx, 'confirmed').rewards).toEqual([]);
  });

  it('failures grant nothing', () => {
    const r = resolveDeduction(year, { ...confirmedSub, from: 1400, to: 1450 }, ctx);
    expect(r.result.verdict).toBe('wrong');
    expect(r.rewards).toEqual([]);
  });
});
