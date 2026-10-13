import { computeDomain, constraintBar, layoutLanes, makeScale, niceStep, parseYearInput, stepYear, ticks } from '@/ui/lib/timeline';
import { formatYearResult, parseYearNote, timeText, yearNoteId, yearResults } from '@/ui/lib/format';
import { emptyNotebook, addNote } from '@/core/notebook';

describe('timeline scale', () => {
  const sc = makeScale({ min: 1490, max: 1509 }, 200);
  it('maps years to px and back', () => {
    expect(sc.x(1490)).toBe(0);
    expect(sc.x(1500)).toBe(100);
    expect(sc.year(100)).toBe(1500);
  });
  it('bars include the end year', () => {
    const b = constraintBar({ notBefore: 1495, notAfter: 1498 }, sc)!;
    expect(b.left).toBe(50);
    expect(b.width).toBe(40);
    expect(constraintBar({ notBefore: 1500 }, sc)).toMatchObject({ openRight: true, openLeft: false });
    expect(constraintBar({}, sc)).toBeNull();
  });
  it('domain pads and snaps', () => {
    const d = computeDomain([1495, 1498], { min: 0, max: 1 });
    expect(d.min).toBeLessThanOrEqual(1495);
    expect(d.max).toBeGreaterThanOrEqual(1498);
    expect(computeDomain([], { min: 1, max: 2 })).toEqual({ min: 1, max: 2 });
    expect(ticks({ min: 1400, max: 1600 }, 4).every((y) => y % niceStep(200, 4) === 0)).toBe(true);
  });
  it('lanes separate overlaps', () => {
    expect(layoutLanes([{ x: 0, w: 50 }, { x: 10, w: 50 }, { x: 100, w: 20 }])).toEqual([0, 1, 0]);
  });
});

describe('year input', () => {
  it('parses and steps', () => {
    expect(parseYearInput('1498')).toBe(1498);
    expect(parseYearInput('abc')).toBeNull();
    expect(parseYearInput('')).toBeNull();
    expect(stepYear(1, -5)).toBe(1);
  });
});

describe('format', () => {
  it('year notes round-trip and pick best', () => {
    const id = yearNoteId('d:1', 1495, 1498, 'partial');
    expect(parseYearNote(id)).toMatchObject({ deductionId: 'd:1', from: 1495, to: 1498, verdict: 'partial' });
    let nb = addNote(emptyNotebook(), { id, section: 'verified', text: 'a' });
    nb = addNote(nb, { id: yearNoteId('d:1', 1498, 1498, 'confirmed'), section: 'verified', text: 'b' });
    expect(yearResults(nb)).toHaveLength(1);
    expect(yearResults(nb)[0]!.verdict).toBe('confirmed');
    expect(formatYearResult(1495, 1498, 'partial')).toBe('1495~1498 (부분 확정)');
    expect(timeText({ notBefore: 1495 })).toBe('1495년 이후');
  });
});
