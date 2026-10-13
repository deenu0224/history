import { describe, expect, it } from 'vitest';
import { content } from '@/data';
import { fmtSpan, hash, impressionLook, isGlue, stepFor, toneOf } from '@/ui/lib/desk';
import { hasSprite } from '@/ui/lib/art';

describe('책상 UI 보조', () => {
  it('이음 조각과 짚을 수 있는 낱말을 id 규칙으로 가른다', () => {
    expect(isGlue('a0419_x0')).toBe(true);
    expect(isGlue('a0419_yi')).toBe(false);
    expect(isGlue('a0431d_month')).toBe(false);
  });
  it('모든 건의 짚을 수 있는 조각이 한 개 이상이고, 이음 조각은 짝에 쓰이지 않는다', () => {
    for (const c of content.cases.filter((x) => x.kind === 'routine')) {
      const pairIds = c.pairs.flatMap((p) => [p.record, p.observed]);
      expect(pairIds.some(isGlue), c.code).toBe(false);
    }
  });
  it('도장 자국은 같은 건·도장이면 늘 같은 변형이고, 실제 스프라이트다', () => {
    const a = impressionLook('case_a0412', 'confirm');
    const b = impressionLook('case_a0412', 'confirm');
    expect(a).toEqual(b);
    expect(hasSprite(a.sprite)).toBe(true);
    expect(hasSprite(impressionLook('x', 'mismatch', { faded: true }).sprite)).toBe(true);
    expect(impressionLook('x', 'auto_close').sprite).toMatch(/^stamp_system_/);
    expect(Math.abs(a.tilt)).toBeLessThanOrEqual(5);
    expect(hash('a')).not.toBe(hash('b'));
  });
  it('도장 색조와 시간 표기', () => {
    expect(toneOf('confirm')).toBe('ok');
    expect(toneOf('correct')).toBe('fix');
    expect(toneOf('mismatch')).toBe('mismatch');
    expect(toneOf('auto_close')).toBe('system');
    expect(fmtSpan(40)).toBe('40분');
    expect(fmtSpan(60)).toBe('1시간');
    expect(fmtSpan(170)).toBe('2시간 50분');
    expect(stepFor(40)).toBe(1);
    expect(stepFor(660)).toBe(5);
  });
});
