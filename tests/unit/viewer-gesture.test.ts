import { describe, expect, it } from 'vitest';
import { Gesture, type GestureHandlers } from '@/game/logic/gesture';
import { MIN_HIT_HALF, pickHotspot } from '@/game/logic/hit';
import { viewerTint } from '@/game/logic/tint';
import { facingFromVector, pathLength, pointAlong, walkRoute } from '@/game/logic/route';

function rec() {
  const log: string[] = [];
  const pans: [number, number][] = [];
  const pinches: number[] = [];
  const h: GestureHandlers = {
    pan: (dx, dy) => pans.push([dx, dy]),
    pinch: (r) => pinches.push(r),
    tap: (x, y) => log.push(`tap ${x},${y}`),
    doubleTap: (x, y) => log.push(`dbl ${x},${y}`),
    fling: (vx, vy) => log.push(`fling ${Math.sign(vx)},${Math.sign(vy)}`),
    end: (d) => log.push(`end ${d}`),
    begin: () => log.push('begin'),
  };
  return { log, pans, pinches, g: new Gesture(h) };
}

describe('gesture state machine', () => {
  it('a still touch is a tap', () => {
    const { g, log } = rec();
    g.down(1, 50, 60, 0);
    g.move(1, 52, 61, 20);
    g.up(1, 52, 61, 60);
    expect(log).toEqual(['begin', 'tap 52,61', 'end false']);
  });
  it('drag beyond slop pans without tapping; first pan carries the slop distance', () => {
    const { g, log, pans } = rec();
    g.down(1, 0, 0, 0);
    g.move(1, 4, 0, 10);
    expect(pans).toHaveLength(0);
    g.move(1, 14, 0, 20);
    expect(pans[0]).toEqual([14, 0]);
    g.move(1, 20, 0, 30);
    expect(pans[1]).toEqual([6, 0]);
    g.up(1, 20, 0, 400);
    expect(log).not.toContain('tap 20,0');
    expect(log.at(-1)).toBe('end true');
  });
  it('quick flick ends with a fling in the drag direction', () => {
    const { g, log } = rec();
    g.down(1, 0, 0, 0);
    g.move(1, 40, 0, 30);
    g.move(1, 80, 0, 60);
    g.up(1, 90, 0, 70);
    expect(log).toContain('fling 1,0');
  });
  it('slow release after a pause does not fling', () => {
    const { g, log } = rec();
    g.down(1, 0, 0, 0);
    g.move(1, 40, 0, 30);
    g.up(1, 40, 0, 600);
    expect(log.some((l) => l.startsWith('fling'))).toBe(false);
  });
  it('second tap close in time and space is a double tap', () => {
    const { g, log } = rec();
    g.down(1, 100, 100, 0);
    g.up(1, 100, 100, 50);
    g.down(2, 104, 102, 150);
    g.up(2, 104, 102, 190);
    expect(log.filter((l) => l.startsWith('tap'))).toHaveLength(1);
    expect(log).toContain('dbl 104,102');
  });
  it('taps far apart or slow are two taps', () => {
    const { g, log } = rec();
    g.down(1, 100, 100, 0);
    g.up(1, 100, 100, 50);
    g.down(2, 300, 100, 150);
    g.up(2, 300, 100, 190);
    expect(log.filter((l) => l.startsWith('tap'))).toHaveLength(2);
  });
  it('two fingers pinch; releasing one never taps', () => {
    const { g, log, pinches } = rec();
    g.down(1, 100, 100, 0);
    g.down(2, 200, 100, 5);
    g.move(2, 300, 100, 20);
    expect(pinches[0]).toBeCloseTo(2);
    g.up(2, 300, 100, 40);
    g.up(1, 100, 100, 60);
    expect(log.some((l) => l.startsWith('tap'))).toBe(false);
    expect(log.at(-1)).toBe('end true');
  });
});

describe('hit testing', () => {
  const t = (id: string, cx: number, cy: number, hw = 6, hh = 8, priority = 0) => ({ id, cx, cy, halfW: hw, halfH: hh, priority });
  it('tiny sprites get a >=44 css px target', () => {
    expect(MIN_HIT_HALF * 2).toBeGreaterThanOrEqual(44);
    const list = [t('a', 100, 100)];
    expect(pickHotspot(100 + 21, 100 - 21, list)).toBe('a');
    expect(pickHotspot(100 + 23, 100, list)).toBeNull();
  });
  it('picks the closest of overlapping targets; people win ties', () => {
    const list = [t('obj', 100, 100), t('npc', 110, 100, 6, 8, 1)];
    expect(pickHotspot(104, 100, list)).toBe('npc');
    expect(pickHotspot(90, 100, [t('x', 100, 100), t('y', 90, 100)])).toBe('y');
    expect(pickHotspot(0, 0, list)).toBeNull();
  });
  it('large sprites keep their own size', () => {
    expect(pickHotspot(100 + 50, 100, [t('big', 100, 100, 60, 30)])).toBe('big');
  });
});

describe('time-of-day tint', () => {
  it('stays readable through the whole observation day and warms toward evening', () => {
    for (let m = 480; m <= 1140; m += 15) {
      const { color, dark } = viewerTint(m);
      expect(Math.min(...color)).toBeGreaterThanOrEqual(0.5);
      expect(dark).toBeGreaterThanOrEqual(0);
      expect(dark).toBeLessThanOrEqual(1);
    }
    const noon = viewerTint(720);
    const dusk = viewerTint(1110);
    expect(noon.dark).toBeLessThan(0.1);
    expect(dusk.dark).toBeGreaterThan(noon.dark);
    expect(dusk.color[2]).toBeLessThan(dusk.color[0]);
  });
});

describe('walk routes', () => {
  const g = ['.....', '.###.', '.....'].map((r) => [...r].map((c) => c === '#'));
  it('walks around walls, polyline interpolation is continuous', () => {
    const p = walkRoute(g, { x: 0, y: 1 }, { x: 4, y: 1 });
    expect(p[0]).toEqual({ x: 0, y: 1 });
    expect(p.at(-1)).toEqual({ x: 4, y: 1 });
    expect(pathLength(p)).toBeGreaterThan(4);
    const a = pointAlong(p, 0.5);
    expect(g[Math.round(a.y)]![Math.round(a.x)]).toBe(false);
    expect(pointAlong(p, 0)).toEqual(p[0]);
    expect(pointAlong(p, 1)).toEqual(p.at(-1));
  });
  it('same tile and facing', () => {
    expect(walkRoute(g, { x: 0, y: 0 }, { x: 0, y: 0 })).toHaveLength(1);
    expect(facingFromVector(3, 1)).toBe('right');
    expect(facingFromVector(0, -2)).toBe('up');
    expect(facingFromVector(0, 0, 'left')).toBe('left');
  });
});

describe('컷 넘기기 — 엿보기·빠른 튕김(QA_UX_R3)', async () => {
  const { flickVelocity, swipeStep } = await import('@/game/logic/swipe');
  it('최근 창의 속도로 튕김을 잰다(오래 대고 있다가 튕겨도)', () => {
    const s = [{ x: 300, t: 0 }, { x: 300, t: 400 }, { x: 290, t: 410 }, { x: 250, t: 430 }];
    expect(flickVelocity(s)).toBeLessThan(-1);
    expect(swipeStep(-50, flickVelocity(s), 382)).toBe(1); // 13% 밀기 + 빠름 → 다음 컷
  });
  it('짧고 느린 밀기는 제자리, 30% 넘게 밀면 속도와 관계없이 넘긴다', () => {
    expect(swipeStep(-60, -0.1, 382)).toBe(0);
    expect(swipeStep(-120, 0, 382)).toBe(1);
    expect(swipeStep(130, 0, 382)).toBe(-1);
  });
  it('떨림(16px 미만)이나 반대 방향 속도는 넘기지 않는다', () => {
    expect(swipeStep(-10, -2, 382)).toBe(0);
    expect(swipeStep(-40, 0.8, 382)).toBe(0);
  });
});
