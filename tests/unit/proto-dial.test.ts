import { describe, expect, it } from 'vitest';
import {
  BEAM_HALF,
  EONMUN28_TEXT,
  HOLE_FILL,
  MOMENTS,
  MURMUR_FLOOR,
  START_MINUTE,
  TIME_HINTS,
  TIME_WIN,
  canFixAt,
  garble,
  signalAt,
  withInlineGloss,
} from '@/proto/dial/model';
import { ARTICLE_0220_KO } from '@/data/v5/ep0/article';
import { LINES0 } from '@/data/v5/ep0/content';

const [memorial, rebuke, unseo] = MOMENTS;

describe('다이얼 시제품 모델(데이터에서 계산)', () => {
  it('순간은 Ep0 컷·들은 말·자리에서 나온다', () => {
    expect(MOMENTS.map((m) => m.cutId)).toEqual(['e0-1', 'e0-2', 'e0-3']);
    expect(memorial.seatId).toBe('C');
    expect(rebuke.seatId).toBe('K');
    expect(START_MINUTE).toBe(memorial.minute);
    // 두 화자 방향은 빔 하나에 함께 들어가지 않는다
    expect(Math.abs(memorial.angle - rebuke.angle)).toBeGreaterThan(BEAM_HALF * 2);
    for (const m of MOMENTS) for (const l of m.lines) expect(ARTICLE_0220_KO).toContain(l.text);
  });

  it('방향과 시각이 모두 맞아야 잠긴다. 창 밖은 맥놀이 없음(기울기 없음)', () => {
    const lock = signalAt(rebuke.angle, rebuke.minute);
    expect(lock.locked).toBe(true);
    expect(lock.beatHz).toBe(0);
    expect(canFixAt(lock)).toBe(true);

    const wrongTime = signalAt(rebuke.angle, START_MINUTE);
    expect(wrongTime.locked).toBe(false);
    expect(wrongTime.beatHz).toBeNull();
    expect(wrongTime.clarity).toBe(0);
    // 창 밖의 웅얼거림은 시각과 무관하다
    expect(signalAt(rebuke.angle, rebuke.minute - TIME_WIN - 5).murmur).toBe(wrongTime.murmur);
    expect(wrongTime.murmur).toBeLessThanOrEqual(MURMUR_FLOOR);

    const offBeam = signalAt(rebuke.angle + 90, rebuke.minute);
    expect(offBeam.moment).toBeNull();
  });

  it('가까울수록 맥놀이가 느려진다', () => {
    const far = signalAt(rebuke.angle, rebuke.minute + 3).beatHz!;
    const near = signalAt(rebuke.angle, rebuke.minute + 1).beatHz!;
    expect(far).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(0);
  });

  it('상소·운서 순간은 「누가」 칸을 열지 않는다(군상 줄만)', () => {
    expect(canFixAt(signalAt(memorial.angle, memorial.minute))).toBe(false);
    expect(canFixAt(signalAt(unseo.angle, unseo.minute))).toBe(false);
  });

  it('「소(疏)를 보고」 표식은 상소 뒤, 꾸짖음 근처(정확한 분 아님)', () => {
    const [lo, hi] = TIME_HINTS[0].span;
    expect(lo).toBeGreaterThan(memorial.minute);
    expect(lo).toBeLessThanOrEqual(rebuke.minute);
    expect(hi).toBeGreaterThanOrEqual(rebuke.minute);
    expect((lo + hi) / 2).not.toBe(rebuke.minute);
  });

  it('채울 글자와 돌아오는 기록은 국역 그대로', () => {
    expect(HOLE_FILL).toBe('임금이');
    expect(EONMUN28_TEXT.startsWith('이달에 임금이 친히 언문(諺文) 28자(字)를 지었는데')).toBe(true);
    const g = LINES0.find((l) => l.id === 'l_e0_gunsang')!;
    expect(withInlineGloss(g)).toContain('군상(君上, 임금)');
  });

  it('뭉갠 글자에는 한글 읽기 없는 한자가 남지 않고, 맑아질수록 글자가 는다', () => {
    const t = memorial.lines[0].text;
    const a = garble(t, 0.2, 3);
    const b = garble(t, 0.7, 3);
    expect(/[一-鿿]/.test(a + b)).toBe(false);
    expect(b.replace(/[…\s]/g, '').length).toBeGreaterThan(a.replace(/[…\s]/g, '').length);
    expect(garble(t, 1)).toBe(t);
  });
});
