import { mergeModules } from '@/core/content';
import type { ContentBundle, PersonDeduction, YearDeduction } from '@/core/types';
import { validateContent } from '@/core/validate';
import { content as registry, modules } from '@/data';
import { sampleContent } from './fixtures';

const codes = (c: ContentBundle, opts?: Parameters<typeof validateContent>[1]) =>
  validateContent(c, opts).errors.map((e) => e.code);
const warnCodes = (c: ContentBundle) => validateContent(c).warnings.map((e) => e.code);
const ded = <T>(c: ContentBundle, id: string) => c.deductions.find((d) => d.id === id) as T;

describe('validateContent', () => {
  it('accepts the sample content and the registry', () => {
    const r = validateContent(sampleContent());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(validateContent(registry, { historical: modules.historical }).ok).toBe(true);
  });

  it('requires a url source for verified items', () => {
    const c = sampleContent();
    c.persons[0]!.provenance = 'verified';
    expect(codes(c)).toContain('verified_without_source');
    c.persons[0]!.sources = [{ title: '실록', url: 'not a url' }];
    expect(codes(c)).toEqual(expect.arrayContaining(['bad_source', 'verified_without_source']));
    c.persons[0]!.sources = [{ title: '실록', url: 'https://sillok.history.go.kr/' }];
    expect(codes(c)).toEqual([]);
  });

  it('checks verified dialogue lines', () => {
    const c = sampleContent();
    c.npcs[0]!.dialogue[0]!.provenance = 'verified';
    expect(codes(c)).toContain('verified_without_source');
  });

  it('warns on reconstructed without sources', () => {
    const c = sampleContent();
    c.places[0]!.provenance = 'reconstructed';
    expect(warnCodes(c)).toContain('reconstructed_without_source');
  });

  it('forbids fictional data in the historical module', () => {
    const c = sampleContent();
    expect(codes(c, { historical: { persons: [c.persons[0]!] } })).toContain('fictional_in_historical');
  });

  it('detects duplicate ids across kinds', () => {
    const c = sampleContent();
    c.places.push({ ...c.places[0]!, id: 'sample_person_scribe' });
    expect(codes(c)).toContain('duplicate_id');
  });

  it('detects unresolved references', () => {
    const c = sampleContent();
    c.worldObjects[0]!.grants = { evidence: [{ id: 'nope' }] };
    c.collection[0]!.refId = 'sample_place_office'; // artifact 카테고리인데 장소를 가리킴
    c.events[0]!.personIds = ['ghost'];
    const errs = validateContent(c).errors.filter((e) => e.code === 'missing_ref');
    expect(errs.map((e) => e.id).sort()).toEqual(['sample_col_zither', 'sample_event_a', 'sample_obj_board']);
  });

  it('detects bad evidence levels in grants', () => {
    const c = sampleContent();
    c.worldObjects[1]!.grants = { evidence: [{ id: 'sample_ev_zither', level: 7 }] };
    expect(codes(c)).toContain('bad_level');
  });

  it('checks time constraint coherence', () => {
    const c = sampleContent();
    c.evidence.push({
      id: 'bad_t',
      provenance: 'fictional',
      category: 'object',
      levels: [{ label: 'x', text: '', time: { notBefore: 1500, notAfter: 1400, strength: 'decisive' } }],
    });
    c.evidence.push({ id: 'empty_t', provenance: 'fictional', category: 'object', levels: [{ label: 'x', text: '', time: { strength: 'weak' } }] });
    expect(codes(c)).toEqual(expect.arrayContaining(['bad_time', 'empty_time']));
    expect(warnCodes(c)).toContain('weak_without_reason');
  });

  it('year deduction: evidence must not contradict target; threshold & context sane', () => {
    const c = sampleContent();
    const d = ded<YearDeduction>(c, 'sample_ded_year');
    d.target = { from: 1499, to: 1499 };
    expect(codes(c)).toContain('evidence_contradicts_target');
    d.target = { from: 1498, to: 1498 };
    d.maxPartialWidth = 0;
    d.context = { from: 1500 };
    expect(codes(c)).toEqual(expect.arrayContaining(['bad_threshold', 'context_excludes_target']));
  });

  it('year deduction: warns when decisive evidence cannot confirm', () => {
    const c = sampleContent();
    const d = ded<YearDeduction>(c, 'sample_ded_year');
    d.relevantEvidence = d.relevantEvidence.filter((id) => id !== 'sample_ev_calendar');
    expect(warnCodes(c)).toContain('not_confirmable');
  });

  it('person deduction: answer must hold facts and candidates must be distinguishable', () => {
    const c = sampleContent();
    const d = ded<PersonDeduction>(c, 'sample_ded_person');
    d.requiredFacts = [{ kind: 'office', value: '샘플 사관직' }];
    expect(codes(c)).toContain('indistinguishable');
    d.requiredFacts = [{ kind: 'trait', value: '키가 큼' }];
    expect(codes(c)).toEqual(expect.arrayContaining(['unprovable_fact', 'answer_lacks_fact']));
    d.answer = 'sample_person_minister';
    d.requiredFacts = [];
    expect(codes(c)).toContain('evidence_contradicts_answer');
  });

  it('event deduction: answer statement must not be refuted', () => {
    const c = sampleContent();
    const d = c.deductions.find((x) => x.kind === 'event')!;
    if (d.kind !== 'event') throw new Error();
    d.answer = 'tolerated';
    expect(codes(c)).toContain('answer_refuted');
  });

  it('warns about evidence with no acquisition path', () => {
    const c = sampleContent();
    c.worldObjects = c.worldObjects.filter((w) => w.id !== 'sample_obj_zither');
    expect(validateContent(c).warnings.some((w) => w.code === 'unobtainable_evidence' && w.message.includes('sample_ev_zither'))).toBe(true);
  });

  it('mergeModules keeps every kind', () => {
    expect(mergeModules({ persons: [] }, {}).collection).toEqual([]);
  });
});
