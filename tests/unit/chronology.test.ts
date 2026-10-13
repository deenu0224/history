import { impliedRange, judgeYear } from '@/core/chronology';
import { evidenceView } from '@/core/content';
import type { JudgeResult } from '@/core/types';
import { ctxFor, ownAll, sampleContent, timeEv, yearDed } from './fixtures';

const codes = (r: JudgeResult) => r.feedback.map((f) => f.code);
const forEv = (r: JudgeResult, id: string) => r.feedback.filter((f) => f.evidenceId === id).map((f) => f.code);

const lo = timeEv('lo', { notBefore: 1498, strength: 'decisive' });
const hi = timeEv('hi', { notAfter: 1498, strength: 'decisive' });
const both = timeEv('both', { notBefore: 1496, notAfter: 1500, strength: 'decisive' });
const supLo = timeEv('supLo', { notBefore: 1498, strength: 'supporting' });
const supHi = timeEv('supHi', { notAfter: 1498, strength: 'supporting' });
const weakLo = timeEv('weakLo', { notBefore: 1498, strength: 'weak', weakReason: '장기간 사용된 물건' });
const weakHi = timeEv('weakHi', { notAfter: 1498, strength: 'weak' });
const lateCopy = timeEv('lateCopy', { notBefore: 1600, strength: 'weak', weakReason: '후대 모사본일 수 있음' });
const ALL = [lo, hi, both, supLo, supHi, weakLo, weakHi, lateCopy];
const ctx = ownAll(ALL);
const D = yearDed();

describe('impliedRange', () => {
  const v = (e: typeof lo) => evidenceView(e, 0);
  it('intersects non-weak bounds and ignores weak', () => {
    expect(impliedRange([v(lo), v(hi), v(weakLo)], undefined, true)).toEqual({ from: 1498, to: 1498 });
    expect(impliedRange([v(weakLo), v(weakHi)], undefined, true)).toEqual({ from: undefined, to: undefined });
  });
  it('decisive-only excludes supporting', () => {
    expect(impliedRange([v(supLo), v(hi)], undefined, false)).toEqual({ from: undefined, to: 1498 });
    expect(impliedRange([v(supLo), v(hi)], undefined, true)).toEqual({ from: 1498, to: 1498 });
  });
  it('context participates and evidence tightens it', () => {
    expect(impliedRange([v(both)], { from: 1392, to: 1910 }, true)).toEqual({ from: 1496, to: 1500 });
    expect(impliedRange([], { from: 1392 }, true)).toEqual({ from: 1392, to: undefined });
  });
});

describe('judgeYear verdicts', () => {
  it('confirmed: decisive lower + upper pin the exact year', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['lo', 'hi'] }, ctx);
    expect(r.verdict).toBe('confirmed');
    expect(forEv(r, 'lo')).toEqual(['bounds_lower']);
    expect(forEv(r, 'hi')).toEqual(['bounds_upper']);
    expect(r.implied).toEqual({ from: 1498, to: 1498 });
  });

  it('exact range pinned only by supporting evidence is partial, not confirmed', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['supLo', 'hi'] }, ctx);
    expect(r.verdict).toBe('partial');
    expect(codes(r)).toContain('needs_decisive');
  });

  it('partial: justified, contains truth, within threshold', () => {
    const r = judgeYear(D, { from: 1496, to: 1500, evidenceIds: ['both'] }, ctx);
    expect(r.verdict).toBe('partial');
    expect(forEv(r, 'both')).toEqual(['bounds_both']);
    expect(codes(r)).not.toContain('needs_decisive');
  });

  it('a looser-than-evidence range is still justified', () => {
    const r = judgeYear(D, { from: 1494, to: 1502, evidenceIds: ['both'] }, ctx);
    expect(r.verdict).toBe('partial');
  });

  it('partial threshold is inclusive', () => {
    const d = yearDed({ maxPartialWidth: 5 });
    expect(judgeYear(d, { from: 1496, to: 1500, evidenceIds: ['both'] }, ctx).verdict).toBe('partial');
    const r = judgeYear(d, { from: 1495, to: 1500, evidenceIds: ['both'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toContain('too_broad');
  });

  it('undetermined: lower bound not justified by any cited evidence', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['hi'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toContain('unjustified_lower');
    expect(codes(r)).not.toContain('unjustified_upper');
  });

  it('undetermined: bound tighter than evidence allows', () => {
    const r = judgeYear(D, { from: 1497, to: 1499, evidenceIds: ['both'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toEqual(expect.arrayContaining(['unjustified_lower', 'unjustified_upper']));
  });

  it('weak evidence never justifies a bound, even when it would pin the year', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['weakLo', 'weakHi'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(forEv(r, 'weakLo')).toEqual(['weak']);
    expect(r.feedback.find((f) => f.evidenceId === 'weakLo')!.message).toContain('장기간 사용된 물건');
  });

  it('weak + decisive: weak adds nothing, decisive decides', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['weakLo', 'hi'] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['weakLo', 'lo', 'hi'] }, ctx).verdict).toBe(
      'confirmed',
    );
  });

  it('conflict with weak evidence is only a warning', () => {
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['lateCopy', 'lo', 'hi'] }, ctx);
    expect(r.verdict).toBe('confirmed');
    expect(forEv(r, 'lateCopy')).toEqual(['weak', 'weak_conflict']);
  });

  it('wrong: submitted range contradicts cited non-weak evidence', () => {
    const r = judgeYear(D, { from: 1490, to: 1497, evidenceIds: ['lo'] }, ctx);
    expect(r.verdict).toBe('wrong');
    expect(forEv(r, 'lo')).toContain('contradiction');
  });

  it('wrong: range excludes the truth (no contradiction cited)', () => {
    const r = judgeYear(D, { from: 1500, to: 1505, evidenceIds: [] }, ctx);
    expect(r.verdict).toBe('wrong');
    expect(codes(r)).toEqual(['excludes_truth']);
  });

  it('wrong takes precedence over unjustified', () => {
    const r = judgeYear(D, { from: 1499, to: 1499, evidenceIds: ['weakLo'] }, ctx);
    expect(r.verdict).toBe('wrong');
  });

  it('never reveals the answer in failure feedback', () => {
    const subs = [
      { from: 1500, to: 1505, evidenceIds: ['lo'] },
      { from: 1450, to: 1460, evidenceIds: ['hi', 'weakLo'] },
      { from: 1450, to: 1520, evidenceIds: ['supLo'] },
      { from: 1400, to: 1600, evidenceIds: [] },
    ];
    for (const s of subs) {
      const r = judgeYear(D, s, ctx);
      expect(r.verdict).not.toBe('confirmed');
      for (const f of r.feedback) expect(f.message).not.toContain('1498');
    }
  });

  it('undetermined without any evidence and without context', () => {
    const r = judgeYear(D, { from: 1490, to: 1500, evidenceIds: [] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toEqual(expect.arrayContaining(['unjustified_lower', 'unjustified_upper']));
  });

  it('context alone justifies broad bounds but is too broad', () => {
    const d = yearDed({ context: { from: 1392, to: 1910 } });
    const r = judgeYear(d, { from: 1392, to: 1910, evidenceIds: [] }, ctx);
    expect(r.verdict).toBe('undetermined');
    expect(codes(r)).toEqual(['too_broad']);
  });

  it('context cannot justify a tighter bound on the side evidence leaves open', () => {
    const d = yearDed({ context: { from: 1392, to: 1910 }, maxPartialWidth: 20 });
    const r = judgeYear(d, { from: 1492, to: 1498, evidenceIds: ['hi'] }, ctx);
    expect(r.verdict).toBe('undetermined'); // 하한 1492 는 context(1392)로만 정당화 → 1492 > 1392
    const r2 = judgeYear(d, { from: 1392, to: 1498, evidenceIds: ['hi'] }, ctx);
    expect(r2.verdict).toBe('undetermined');
    expect(codes(r2)).toContain('too_broad');
  });

  it('target ranges (uncertain history) confirm only on the exact range', () => {
    const d = yearDed({ target: { from: 1496, to: 1500 } });
    expect(judgeYear(d, { from: 1496, to: 1500, evidenceIds: ['both'] }, ctx).verdict).toBe('confirmed');
    expect(judgeYear(d, { from: 1495, to: 1500, evidenceIds: ['both'] }, ctx).verdict).toBe('partial');
    expect(judgeYear(d, { from: 1497, to: 1500, evidenceIds: ['both'] }, ctx).verdict).toBe('wrong');
  });

  it('rejects invalid input', () => {
    expect(judgeYear(D, { from: 1500, to: 1490, evidenceIds: ['lo'] }, ctx).feedback[0]!.code).toBe('invalid_input');
    expect(judgeYear(D, { from: 1498.5, to: 1499, evidenceIds: [] }, ctx).verdict).toBe('undetermined');
    expect(judgeYear(D, { from: NaN, to: 1499, evidenceIds: [] }, ctx).verdict).toBe('undetermined');
  });

  it('ignores unowned, unknown and duplicate citations', () => {
    const partial = { ...ctx, owned: { hi: 0 } };
    const r = judgeYear(D, { from: 1498, to: 1498, evidenceIds: ['lo', 'hi', 'hi', 'ghost'] }, partial);
    expect(r.verdict).toBe('undetermined');
    expect(forEv(r, 'lo')).toEqual(['not_owned']);
    expect(forEv(r, 'ghost')).toEqual(['unknown_evidence']);
    expect(forEv(r, 'hi')).toEqual(['bounds_upper']);
  });
});

describe('judgeYear on sample content (reveal levels)', () => {
  const c = sampleContent();
  const d = c.deductions.find((x) => x.id === 'sample_ded_year')!;
  if (d.kind !== 'year') throw new Error('fixture');

  it('calendar at level 0 carries no time info', () => {
    const r = judgeYear(d, { from: 1498, to: 1498, evidenceIds: ['sample_ev_edict', 'sample_ev_calendar'] }, ctxFor(c, {
      sample_ev_edict: 0,
      sample_ev_calendar: 0,
    }));
    expect(r.verdict).toBe('undetermined');
    expect(forEv(r, 'sample_ev_calendar')).toEqual(['no_time_info']);
  });

  it('calendar at level 1 confirms', () => {
    const r = judgeYear(d, { from: 1498, to: 1498, evidenceIds: ['sample_ev_edict', 'sample_ev_calendar'] }, ctxFor(c, {
      sample_ev_edict: 0,
      sample_ev_calendar: 1,
    }));
    expect(r.verdict).toBe('confirmed');
  });

  it('edict + rumor gives partial (upper from supporting testimony)', () => {
    const r = judgeYear(d, { from: 1498, to: 1501, evidenceIds: ['sample_ev_edict', 'sample_ev_rumor'] }, ctxFor(c, {
      sample_ev_edict: 0,
      sample_ev_rumor: 0,
    }));
    expect(r.verdict).toBe('partial');
    expect(codes(r)).toContain('needs_decisive');
  });
});
