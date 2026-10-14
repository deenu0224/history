import { describe, expect, it } from 'vitest';
import { MIN_TOUCH, getFigureHitboxes, povCamera, povInternalSize, project, sunAt } from '@/game/pov/camera';
import type { PovSpec } from '@/game/pov/types';

const spec: PovSpec = {
  witnessId: 'hong_gwidal',
  seatId: 'H',
  lookAt: { x: 6.6, y: 7.6, h: 0.4 },
  fov: 60,
  time: '14:00',
  overlay: 'memory',
  figures: [
    { id: 'reader', pose: 'standing-reading', seat: 'B', facing: 270 },
    { id: 'yun', personId: 'yun_hyoson', pose: 'seated', seat: 'W', facing: 'B' },
    { id: 'behind', pose: 'seated', pos: { x: 11.9, y: 0.3 } },
  ],
  size: { w: 292, h: 390 },
};

describe('pov camera', () => {
  it('projects the look target to the frame centre (roll keeps the centre fixed)', () => {
    const cam = povCamera(spec);
    const q = project(cam, cam.target)!;
    expect(q.u).toBeCloseTo(0.5, 6);
    expect(q.v).toBeCloseTo(0.5, 6);
  });

  it('basis is orthonormal', () => {
    const { right, up, forward } = povCamera(spec);
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    expect(dot(right, up)).toBeCloseTo(0, 6);
    expect(dot(right, forward)).toBeCloseTo(0, 6);
    expect(dot(up, forward)).toBeCloseTo(0, 6);
  });

  it('hitboxes: visible figures only, ≥44 CSS px, inside the cut, far first', () => {
    const boxes = getFigureHitboxes(spec, 390, 520);
    expect(boxes.map((b) => b.id).sort()).toEqual(['reader', 'yun']);
    for (const b of boxes) {
      expect(b.w).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(b.h).toBeGreaterThanOrEqual(MIN_TOUCH);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(390);
      expect(b.y + b.h).toBeLessThanOrEqual(520);
    }
    expect(boxes[boxes.length - 1].id).toBe('yun'); // nearer → drawn/tapped on top
  });

  it('afternoon sun comes from the south-west and its elevation is compressed (staging)', () => {
    const s = sunAt('14:00');
    expect(s.azimuthDeg).toBeGreaterThan(180);
    expect(s.azimuthDeg).toBeLessThan(270);
    expect(s.elevDeg).toBeLessThan(s.realElevDeg);
    expect(s.toSun[2]).toBeGreaterThan(0); // south = +z
  });

  it('internal size is an integer division of device pixels', () => {
    expect(povInternalSize(390, 520, 3)).toEqual({ w: 292, h: 390, scale: 4 });
    expect(povInternalSize(390, 520, 2)).toEqual({ w: 260, h: 346, scale: 3 });
  });
});
