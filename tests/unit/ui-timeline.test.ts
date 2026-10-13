import { describe, expect, it } from 'vitest';
import { messages } from '@/data/messages/messages';
import { hintMessages } from '@/data/messages/hints';
import { apps } from '@/data/apps';
import { clampYear, fmtMinute, parseClock, THREAD_LABEL, THREAD_ORDER, threadOf, yearStepFor, YEAR_MAX } from '@/ui/lib/text';
import { hasSprite, appIconKey } from '@/ui/lib/art';

describe('시각 표기', () => {
  it('하루 분을 HH:MM 으로, 되돌려 읽는다', () => {
    expect(fmtMinute(480)).toBe('08:00');
    expect(fmtMinute(836)).toBe('13:56');
    expect(fmtMinute(1440 + 5)).toBe('00:05');
    expect(parseClock('23:04')).toBe(23 * 60 + 4);
    expect(parseClock('06:00')).toBe(360);
    expect(parseClock('####')).toBeNull();
    expect(parseClock(undefined)).toBeNull();
  });
});

describe('연도 스텝퍼', () => {
  it('꾹 누를수록 빨라지고, 범위를 벗어나지 않는다', () => {
    expect(yearStepFor(0)).toBe(1);
    expect(yearStepFor(6)).toBe(5);
    expect(yearStepFor(30)).toBe(10);
    expect(clampYear(0)).toBe(1);
    expect(clampYear(99999)).toBe(YEAR_MAX);
    expect(clampYear(1498.4)).toBe(1498);
  });
});

describe('메신저 스레드', () => {
  it('모든 메시지가 이름 붙은 대화에 들어간다', () => {
    for (const m of [...messages, ...hintMessages]) {
      const k = threadOf(m);
      expect(THREAD_ORDER).toContain(k);
      expect(THREAD_LABEL[k]).toBeTruthy();
    }
  });
  it('복원심의위원회의 승인 메시지는 따로 묶인다', () => {
    const m = messages.find((x) => x.id === 'm_sys_committee')!;
    expect(threadOf(m)).toBe('committee');
    expect(THREAD_LABEL.committee).toBe('복원심의위원회');
  });
});

describe('앱 아이콘', () => {
  it('데이터가 가리키는 아이콘이 모두 스프라이트로 이어진다', () => {
    for (const a of apps) {
      expect(hasSprite(appIconKey(a.iconKey)), a.iconKey).toBe(true);
      expect(hasSprite(appIconKey(a.iconKey, true)), `${a.iconKey}_sm`).toBe(true);
    }
  });
});
