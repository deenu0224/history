import { mergeModules } from '@/core/content';
import type { ContentBundle } from '@/core/types';
import { hasYear, solveReport, validateContent } from '@/core/validate';
import { content, modules } from '@/data';

export const ANSWER_WORDS = ['김일손', '이극돈', '무오', '연산', '1498'];

const clone = (): ContentBundle => structuredClone(content);
const codes = (c: ContentBundle) => validateContent(c, { historical: modules.historical, answerWords: ANSWER_WORDS }).errors.map((e) => e.code);

describe('validator — registry (v3)', () => {
  it('passes with no errors', () => {
    const r = validateContent(content, { historical: modules.historical, answerWords: ANSWER_WORDS });
    expect(r.errors).toEqual([]);
  });

  it('every report blank is solvable from data and only the answer confirms 누구', () => {
    const s = solveReport('rep_c2217', content);
    expect(s.solved).toEqual({ when: true, who: true, what: true, result: true });
    expect(s.candidateConfirms).toEqual(['per_yi_geukdon']);
  });

  it('year detector ignores coordinate codes', () => {
    expect(hasYear('#C-2217 · 일시 ####')).toBe(false);
    expect(hasYear('사망 1498년')).toBe(true);
  });
});

describe('validator — catches broken content', () => {
  it('verified without source / fictional in historical', () => {
    const c = clone();
    c.sources[0]!.sources = [];
    expect(codes(c)).toContain('verified_without_source');
    const bad = mergeModules({ ...modules.historical, places: [{ id: 'x', provenance: 'fictional', name: 'x', summary: '' }] });
    expect(validateContent(bad, { historical: { places: bad.places } }).errors.map((e) => e.code)).toContain('fictional_in_historical');
  });

  it('year leak in the assignment, answer leak in hints, archaic 졸 in DB', () => {
    const c = clone();
    c.assignments[0]!.header[1]!.value = '1498';
    c.messages.find((m) => m.hint)!.text = '이극돈이야';
    c.records[0]!.fields[0]!.value = '졸';
    const k = codes(c);
    expect(k).toEqual(expect.arrayContaining(['year_leak', 'answer_leak', 'archaic_term']));
  });

  it('unsolvable blank and indistinguishable candidate', () => {
    const c = clone();
    c.clues = c.clues.filter((x) => x.id !== 'cl_veteran');
    expect(codes(c)).toContain('blank_unsolvable');
    const d = clone();
    d.persons.find((p) => p.id === 'per_eo_segyeom')!.facts.push(
      { kind: 'office', value: '실록청 당상' },
      { kind: 'event', value: '『세조실록』 편찬 참여' },
    );
    expect(codes(d)).toContain('indistinguishable');
  });

  it('unindexed chips, unsatisfiable clue, restored content must be verified', () => {
    const c = clone();
    c.npcs[0]!.dialogue[1]!.grants = { terms: ['없는 칩'] };
    c.clues.find((x) => x.id === 'cl_alive')!.frame = { heard: ['b5', 'm2'] };
    c.sources.find((s) => s.id === 'src_verdict')!.provenance = 'reconstructed';
    c.records.find((r) => r.id === 'rec_alt_kwon_obok')!.provenance = 'verified';
    expect(codes(c)).toEqual(
      expect.arrayContaining(['term_not_indexed', 'clue_unsatisfiable', 'restored_not_verified', 'altered_not_fictional']),
    );
  });
});
