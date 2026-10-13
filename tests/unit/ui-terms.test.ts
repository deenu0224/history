import { FEEDBACK } from '@/data/terminal';
import { canonicalApp } from '@/ui/apps/registry';
import { segmentExcerpt } from '@/ui/apps/SourceReader';
import { sfxFor } from '@/ui/lib/fx';
import { scrambleFrame } from '@/ui/lib/rewrites';
import { splitTerms } from '@/ui/lib/terms';
import type { SourcePhrase } from '@/core/types';

describe('splitTerms', () => {
  it('underlines known terms, longest first, without overlap', () => {
    const segs = splitTerms('김일손의 사초를 김일손(金馹孫)이', ['김일손', '사초', '김일손의']);
    expect(segs.filter((s) => s.term).map((s) => s.term)).toEqual(['김일손의', '사초', '김일손']);
    expect(segs.map((s) => s.text).join('')).toBe('김일손의 사초를 김일손(金馹孫)이');
  });
  it('ignores 1-char terms and empty input', () => {
    expect(splitTerms('가나다', ['가'])).toEqual([{ text: '가나다' }]);
    expect(splitTerms('', ['가나'])).toEqual([{ text: '' }]);
  });
});

describe('scrambleFrame', () => {
  it('starts near the old text and settles on the new one', () => {
    expect(scrambleFrame('옛 문장입니다', '새 문장', 1)).toBe('새 문장');
    const mid = scrambleFrame('옛 문장입니다', '새 문장', 0.4, () => 0.9);
    expect(mid.length).toBeGreaterThan(0);
  });
});

describe('segmentExcerpt', () => {
  it('splits an excerpt around phrases', () => {
    const ph = { id: 'p', text: '묘호는 성이라', sourceId: 's', provenance: 'verified' } as SourcePhrase;
    const segs = segmentExcerpt('앞 묘호는 성이라 뒤', [ph]);
    expect(segs.map((s) => s.text)).toEqual(['앞 ', '묘호는 성이라', ' 뒤']);
    expect(segs[1]!.phrase).toBe(ph);
  });
});

describe('feedback table', () => {
  it('every feedback kind has a sound mapping or is silent', () => {
    for (const [kind, spec] of Object.entries(FEEDBACK)) {
      if (spec.sfx === 'none') continue;
      expect(sfxFor(spec.sfx), `${kind}:${spec.sfx}`).toBeTruthy();
    }
  });
});

describe('canonicalApp', () => {
  it('folds merged apps', () => {
    expect(canonicalApp('reader')).toBe('search');
    expect(canonicalApp('archive')).toBe('notebook');
    expect(canonicalApp('board')).toBe('board');
    expect(canonicalApp(null)).toBeNull();
  });
});
