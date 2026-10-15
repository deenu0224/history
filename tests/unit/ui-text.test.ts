import { describe, expect, it } from 'vitest';
import { ARTICLE_0220_PARTS } from '@/data/v5/ep0/article';
import { shorten } from '@/ui/lib/text';

describe('shorten: 긴 단락 접기', () => {
  it('짧으면 그대로', () => {
    expect(shorten('짧은 글.', 80)).toEqual({ head: '짧은 글.', truncated: false });
  });
  it('괄호(한자 풀이) 안에서 자르지 않고 낱말 사이에서 자른다', () => {
    const t = ARTICLE_0220_PARTS[0];
    const { head, truncated } = shorten(t, 78);
    expect(truncated).toBe(true);
    expect(head.length).toBeLessThanOrEqual(78);
    expect(t.startsWith(head)).toBe(true);
    expect((head.match(/\(/g) ?? []).length).toBe((head.match(/\)/g) ?? []).length);
    expect(head).toContain('최만리(崔萬理)');
  });
  it('낱말 경계가 없어도 괄호가 닫힌 곳까지 늘려 자른다', () => {
    const { head } = shorten('가나다라마바사아자차카타파하(巨大漢字說明長文)가나다라마바사', 20);
    expect((head.match(/\(/g) ?? []).length).toBe((head.match(/\)/g) ?? []).length);
  });
});
