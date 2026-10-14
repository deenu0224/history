import { describe, expect, it } from 'vitest';
import { ROOM_EP1, SLIP_SPOTS, isOccluded, seatEye, slipTop, validatePovSpec } from '@/game/pov/room';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('pov room (DESIGN_V5 §4.2, §13)', () => {
  it('keeps the plan distances (B → H far corner is outside the reading radius 8)', () => {
    const s = ROOM_EP1.seats;
    expect(dist(s.B, s.H)).toBeCloseTo(9.21, 2);
    expect(dist(s.B, s.Y)).toBeCloseTo(5.46, 2);
    expect(dist(s.B, s.W)).toBeCloseTo(5.7, 2);
    expect(dist(s.B, s.U)).toBeCloseTo(4.67, 2);
    expect(dist(s.B, s.A)).toBeCloseTo(4.97, 2);
  });

  it('the 사초 stack really hides exactly one slip from the W (윤효손) seat', () => {
    const eye = seatEye('W');
    const hidden = SLIP_SPOTS.map((_, i) => isOccluded(eye, slipTop(i)));
    expect(hidden.filter(Boolean)).toHaveLength(1);
    expect(hidden[SLIP_SPOTS.length - 1]).toBe(true);
  });

  it('Y (이극돈) and O (어세겸) see all six slips', () => {
    for (const seat of ['Y', 'O'] as const) {
      const eye = seatEye(seat);
      expect(SLIP_SPOTS.some((_, i) => isOccluded(eye, slipTop(i)))).toBe(false);
    }
  });

  it('only the recorded remonstrators may use the speaking pose; 김일손 is never drawn', () => {
    const ok = validatePovSpec({
      figures: [
        { id: 'a', personId: 'yi_geukdon', pose: 'seated-address' },
        { id: 'b', personId: 'yun_hyoson', pose: 'seated-address' },
        { id: 'c', personId: 'unknown_ua', pose: 'seated-address' },
        { id: 'd', personId: 'hong_gwidal', pose: 'seated' },
      ],
    });
    expect(ok).toEqual([]);
    const bad = validatePovSpec({
      figures: [
        { id: 'h', personId: 'hong_gwidal', pose: 'seated-address' },
        { id: 'e', personId: 'eo_segyeom', pose: 'seated-address' },
        { id: 'k', personId: 'kim_ilson', pose: 'standing' },
        { id: 'x', pose: 'seated-address' },
      ],
    });
    expect(bad).toHaveLength(4);
  });
});
