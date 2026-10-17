import { describe, expect, it } from 'vitest';
import { hearing, posOf, segmentHitsRect, sight, angleDiff, sameMoment } from '@/core/room';
import { EP1 } from '@/data/v5';
import { mergesAt } from '@/core/ep';
import { winningClaims, winningValue } from '@/core/contradiction';

const R = EP1.room;
const P = (id: string) => posOf(R, id);

describe('그날의 방 — DESIGN_V5 §4.2 계산 표', () => {
  it.each([
    ['B', 'Y', 'read', 5.46, 'clear'],
    ['B', 'W', 'read', 5.7, 'clear'],
    ['B', 'O', 'read', 6.6, 'clear'],
    ['B', 'U', 'read', 4.67, 'clear'],
    ['B', 'A', 'read', 4.97, 'clear'],
    ['B', 'H', 'read', 9.21, 'garbled'],
    ['M2', 'H', 'read', 6.68, 'clear'],
    ['Y', 'H', 'talk', 8.18, 'none'],
    ['Y', 'W', 'talk', 5.5, 'clear'],
  ] as const)('%s → %s (%s): %s칸 %s', (from, to, vol, d, clarity) => {
    const h = hearing(R, P(to), [from], vol);
    expect(h.distance).toBeCloseTo(d, 2);
    expect(h.clarity).toBe(clarity);
  });

  it('보임: 봉함 자리(SP)를 셀 수 있는 눈은 이극돈·어세겸, 윤효손은 사초 더미에 가림, 홍귀달은 멂', () => {
    const toSP = (seat: string, dir: number) => sight(R, P(seat), dir, P('SP'));
    expect(toSP('Y', 0)).toMatchObject({ distance: 1.1, countable: true });
    expect(toSP('O', 90).distance).toBeCloseTo(2.28, 2);
    expect(toSP('O', 135)).toMatchObject({ occluded: false, countable: true });
    expect(toSP('W', 180)).toMatchObject({ distance: 4.4, occluded: true, occluderId: 'stack', countable: false });
    expect(toSP('H', 157)).toMatchObject({ distance: 7.17, countable: false, visible: true });
  });

  it('helpers', () => {
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 10, y: 0 }, [4, -1, 5, 1])).toBe(true);
    expect(segmentHitsRect({ x: 0, y: 3 }, { x: 10, y: 3 }, [4, -1, 5, 1])).toBe(false);
    expect(angleDiff(350, 10)).toBe(20);
    expect(sameMoment('11:40', '11:45')).toBe(true);
    expect(sameMoment('13:40', '13:50')).toBe(false);
  });

  it('겹침: 11:40 에 두 기억이 본 같은 자리는 같은 사람(W, Y), 13:20 에 귓속말의 윗자리 = 2-2 의 늙은 관원', () => {
    expect(mergesAt(EP1, ['e1-2', 'e2-1'], '11:40').map((m) => m.posId)).toEqual(['W', 'Y']);
    const m1320 = mergesAt(EP1, ['e1-3', 'e2-2'], '13:20');
    expect(m1320.find((m) => m.posId === 'O')!.keys).toEqual(['e1-3#say:l_e1_3', 'e2-2#fig_eo']);
    expect(mergesAt(EP1, ['e1-3'], '13:20')).toEqual([]);
  });

  it('모순의 승자는 방의 기하로 계산된다: X1 「모두」, X2 「여섯」', () => {
    const [x1, x2] = EP1.contradictions;
    expect(winningClaims(EP1, x1)).toEqual(['c_scope_all']);
    expect(winningValue(EP1, x1)).toBe('모두');
    expect(winningValue(EP1, x2)).toBe('6');
  });
});

describe('모순 근거 2칸(규칙 11): 판단 + 자리 사실', () => {
  it('승패를 가르는 자리 = 진 주장을 깨는 자리만 — X1: 반경 밖의 홍귀달(E4), X2: 가려진 윤효손(E1)', async () => {
    const { decisiveWitnesses, resolve, supportingWitnesses } = await import('@/core/contradiction');
    const [x1, x2] = EP1.contradictions;
    expect(decisiveWitnesses(EP1, x1)).toEqual(['E4']);
    expect(decisiveWitnesses(EP1, x2)).toEqual(['E1']);
    expect(supportingWitnesses(EP1, x1).sort()).toEqual(['E1', 'E3']);
    expect(supportingWitnesses(EP1, x2)).toEqual(['E2']);
    // 두 칸이 다 차야 판정
    expect(resolve(EP1, x1, 'c_scope_all')).toEqual({ status: 'invalid' });
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E4').status).toBe('resolved');
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E1').status).toBe('retry'); // 이긴 쪽을 받치는 자리는 통과하지 않는다
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E3').status).toBe('retry');
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E2').status).toBe('retry'); // 주장이 없는 자리는 가르지 않는다
    expect(resolve(EP1, x1, 'c_scope_six', 'X1:E4').status).toBe('retry');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E1').status).toBe('resolved');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E2').status).toBe('retry');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E4').status).toBe('retry');
    // 찍기: 판단 2 × 자리 4 중 통과 1 → 1/8
    for (const x of [x1, x2]) {
      const seats = ['E1', 'E2', 'E3', 'E4'];
      const pass = x.claims.flatMap((c) => seats.map((e) => resolve(EP1, x, c, `${x.id}:${e}`).status)).filter((st) => st === 'resolved').length;
      expect(pass).toBe(1);
    }
    expect(resolve(EP1, x2, 'c_count_5', 'X2:E2')).toEqual({ status: 'retry', text: x2.retryText });
  });
});
