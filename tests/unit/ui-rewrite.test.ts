import { describe, expect, it } from 'vitest';
import { changedLines, scrambleAt } from '@/ui/lib/text';

const seq = () => {
  let i = 0;
  return () => ((i++ * 0.37) % 1);
};

describe('scrambleAt: 다시 쓰이는 글', () => {
  const from = '07, 그거 자동 종결됐더라. 자주 있어.';
  const to = '07, 그거 교과서 건이야. 깔끔하게 했더라.';
  it('시작은 처음 문장, 끝은 새 문장', () => {
    // 처음에는 처음 문장이 그대로 보인다(목표의 문장부호 자리만 새 문장을 따른다)
    expect(scrambleAt(from, to, 0, seq()).startsWith('07, 그거 자동')).toBe(true);
    expect(scrambleAt(from, to, 1, seq())).toBe(to);
  });
  it('중간에는 왼쪽부터 굳고 공백·문장부호는 그대로다', () => {
    const mid = scrambleAt(from, to, 0.6, seq());
    expect(mid.slice(0, 3)).toBe(to.slice(0, 3));
    expect(mid[2]).toBe(',');
    expect(mid).not.toBe(to);
  });
});

describe('changedLines: 바뀐 줄만', () => {
  it('같은 라벨의 줄이 달라졌을 때만 돌려준다', () => {
    const before = '사인: 기록 없음\n상태: 정상';
    const after = '사인: 사초 사건 — 대역의 죄로 능지처사\n상태: 정상';
    expect(changedLines(before, after)).toEqual([{ label: '사인', from: '사인: 기록 없음', to: '사인: 사초 사건 — 대역의 죄로 능지처사' }]);
  });
  it('새로 생긴 줄은 from 이 비어 있다', () => {
    expect(changedLines('a: 1', 'a: 1\nb: 2')).toEqual([{ label: 'b', from: '', to: 'b: 2' }]);
  });
});
