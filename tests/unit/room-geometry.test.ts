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

describe('모순 근거 2칸(규칙 11): 판단 + 자리 × 사실', () => {
  const allK = () => ({ viewedCuts: EP1.cuts.map((c) => c.id), named: {}, merges: [], openedEyes: EP1.eyes.filter((e) => e.seatId).map((e) => e.id), closedEyes: [], cardsFound: [], restored: false });

  it('승패를 가르는 자리 = 진 주장을 깨는 자리만 — X1: 반경 밖의 홍귀달(E4), X2: 가려진 윤효손(E1)', async () => {
    const { decisiveWitnesses, supportingWitnesses } = await import('@/core/contradiction');
    const [x1, x2] = EP1.contradictions;
    expect(decisiveWitnesses(EP1, x1)).toEqual(['E4']);
    expect(decisiveWitnesses(EP1, x2)).toEqual(['E1']);
    expect(supportingWitnesses(EP1, x1).sort()).toEqual(['E1', 'E3']);
    expect(supportingWitnesses(EP1, x2)).toEqual(['E2']);
  });

  it('근거 줄은 자리마다 두 사실(거리·사이에 있는 것)이고, 받는 줄은 그 말을 막은 사실 하나다(QA_FUN_R4 R4-1)', async () => {
    const { decisiveFacts, resolve, witnessFacts } = await import('@/core/contradiction');
    const [x1, x2] = EP1.contradictions;
    // X1: 홍귀달 자리는 반경 밖(거리 줄), 사이에 벽은 없다 → 거리 줄만
    expect(decisiveFacts(EP1, x1)).toEqual(['X1:E4:dist']);
    // X2: 윤효손 자리는 셀 수 있는 거리 안이지만 시선 위에 기록 더미 → 시선 줄만
    expect(decisiveFacts(EP1, x2)).toEqual(['X2:E1:line']);
    const f2 = witnessFacts(EP1, allK(), x2);
    const yun = f2.find((f) => f.id === 'X2:E1:dist')!;
    expect(yun.distance).toBeLessThan(yun.limit);
    expect(f2.find((f) => f.id === 'X2:E1:line')!.between).toEqual(['기록 더미']);
    expect(witnessFacts(EP1, allK(), x1).find((f) => f.id === 'X1:E4:line')!.between).toEqual([]);
    // 두 칸이 다 차야 판정
    expect(resolve(EP1, x1, 'c_scope_all')).toEqual({ status: 'invalid' });
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E4:dist').status).toBe('resolved');
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E4:line').status).toBe('retry'); // 진 쪽 자리라도 막은 사실이 아니면
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E1:dist').status).toBe('retry'); // 이긴 쪽을 받치는 자리
    expect(resolve(EP1, x1, 'c_scope_all', 'X1:E2:dist').status).toBe('retry'); // 주장이 없는 자리
    expect(resolve(EP1, x1, 'c_scope_six', 'X1:E4:dist').status).toBe('retry');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E1:line').status).toBe('resolved');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E1:dist').status).toBe('retry');
    expect(resolve(EP1, x2, 'c_count_6', 'X2:E2:line').status).toBe('retry');
    expect(resolve(EP1, x2, 'c_count_5', 'X2:E2:dist')).toEqual({ status: 'retry', text: x2.retryText });
  });

  it('찍기 확률: 무작위 ≤ 1/8(실제 1/16), 진 쪽 자리를 알아도 1/2 — ② 는 ① 에 묶이지 않는다', async () => {
    const { decisiveWitnesses, resolve, witnessFacts } = await import('@/core/contradiction');
    for (const x of EP1.contradictions) {
      const facts = witnessFacts(EP1, allK(), x).map((f) => f.id);
      expect(facts.length).toBe(8); // 자리 4 × 사실 2
      const tries = x.claims.flatMap((c) => facts.map((f) => resolve(EP1, x, c, f).status));
      const pass = tries.filter((st) => st === 'resolved').length;
      expect(pass).toBe(1);
      expect(pass / tries.length).toBeLessThanOrEqual(1 / 8);
      expect(pass / tries.length).toBe(1 / 16);
      // 「진 말의 자리」를 안 사람: 판단은 맞혀도 그 자리의 두 줄 중 하나 → 1/2
      const loserSeat = decisiveWitnesses(EP1, x)[0]!;
      const win = x.claims.find((c) => facts.some((f) => resolve(EP1, x, c, f).status === 'resolved'))!;
      const seatRows = facts.filter((f) => f.startsWith(`${x.id}:${loserSeat}:`));
      expect(seatRows.filter((f) => resolve(EP1, x, win, f).status === 'resolved').length / seatRows.length).toBe(1 / 2);
    }
  });
});
