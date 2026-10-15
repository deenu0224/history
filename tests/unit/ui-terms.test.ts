import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '@/data/glossary';
import { richSegments, splitTerms } from '@/ui/lib/text';

describe('splitTerms: 글 속 검색어 밑줄', () => {
  it('긴 말을 먼저, 겹치지 않게 찾는다', () => {
    const segs = splitTerms('김일손의 사초를 모두 대내로 들여오라.', ['김일손', '사초', '대내로 들여오라', '대내']);
    expect(segs.filter((s) => s.term).map((s) => s.term)).toEqual(['김일손', '사초', '대내로 들여오라']);
    expect(segs.map((s) => s.text).join('')).toBe('김일손의 사초를 모두 대내로 들여오라.');
  });
  it('한 글자 말과 빈 목록은 밑줄을 치지 않는다', () => {
    expect(splitTerms('사초', ['사'])).toEqual([{ text: '사초' }]);
    expect(splitTerms('사초', [])).toEqual([{ text: '사초' }]);
    expect(splitTerms('', ['사초'])).toEqual([{ text: '' }]);
  });
  it('같은 말이 여러 번 나오면 모두 찾는다', () => {
    expect(splitTerms('권오복, 권오복', ['권오복']).filter((s) => s.term)).toHaveLength(2);
  });
});

describe('richSegments: 검색어 + 실록 용어 풀이', () => {
  it('검색어 밖의 실록 용어에 풀이를 단다', () => {
    const segs = richSegments('전교가 닿자 당상들이 사초를 폈다.', ['사초'], GLOSSARY);
    expect(segs.filter((s) => s.gloss).map((s) => s.gloss)).toEqual(['전교', '당상']);
    expect(segs.filter((s) => s.term).map((s) => s.term)).toEqual(['사초']);
  });
  it('검색어 안쪽의 말은 풀이로 쪼개지 않는다', () => {
    const segs = richSegments('대내로 들여오라', ['대내로 들여오라'], GLOSSARY);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.term).toBe('대내로 들여오라');
  });
  it('조각을 이어 붙이면 원문과 같다', () => {
    const text = '예로부터 사초는 임금이 스스로 보지 않습니다. 직필이 없기 때문입니다.';
    expect(richSegments(text, ['사초'], GLOSSARY).map((s) => s.text).join('')).toBe(text);
  });
});

describe('glossSegments — hard words get a tap-gloss, the quote stays verbatim', () => {
  it('longest first, no overlap, text unchanged', async () => {
    const { glossSegments } = await import('@/ui/lib/text');
    const { GLOSSARY1 } = await import('@/data/glossary');
    const t = '수사관(修史官) 등이 사초를 보고도 즉시 아뢰지 않았으므로 … 파직하고';
    const segs = glossSegments(t, GLOSSARY1);
    expect(segs.map((s) => s.text).join('')).toBe(t);
    expect(segs.filter((s) => s.gloss).map((s) => s.term)).toEqual(['수사관', '사초', '아뢰', '파직']);
    expect(segs.find((s) => s.term === '사초')!.gloss).toBe('사관이 쓴 기록 초고');
  });
});
