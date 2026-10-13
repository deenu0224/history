import { describe, expect, it } from 'vitest';
import {
  chooseBaseZoom,
  clampCenter,
  coverZoom,
  decayVelocity,
  initialCam,
  nextZoomLevel,
  screenToWorld,
  snapZoom,
  wheelFactor,
  worldToScreen,
  zoomAt,
  zoomLevels,
  zoomRange,
} from '@/game/logic/camera';

const world = { w: 1280, h: 960 };

describe('viewer camera math', () => {
  it('base zoom: phone portrait shows ~9 tiles across, integer device px', () => {
    expect(chooseBaseZoom(390, 844, 3)).toBe(4);
    expect(chooseBaseZoom(412, 915, 2.625)).toBe(Math.round((412 / 288) * 2.625));
    expect(Number.isInteger(chooseBaseZoom(390, 844, 2.75))).toBe(true);
    expect(chooseBaseZoom(844, 390, 3)).toBeGreaterThanOrEqual(3);
  });
  it('base zoom: desktop is 2..4 css px per texel', () => {
    expect(chooseBaseZoom(1280, 800, 1)).toBe(3);
    expect(chooseBaseZoom(1920, 1080, 2)).toBeLessThanOrEqual(8);
    expect(chooseBaseZoom(0, 0)).toBe(2);
  });
  it('snap zoom to integer device px and clamp', () => {
    expect(snapZoom(3.4, 1, 12)).toBe(3);
    expect(snapZoom(3.6, 1, 12)).toBe(4);
    expect(snapZoom(0.7, 0.5, 12)).toBe(0.5);
    expect(snapZoom(99, 1, 12)).toBe(12);
    expect(snapZoom(0.1, 0.8, 12)).toBe(0.8);
  });
  it('zoom range: 1x..3x of base, min never shows outside the map', () => {
    const view = { w: 1170, h: 2532 };
    const r = zoomRange(4, view, world);
    expect(r.max).toBe(12);
    expect(r.min).toBeGreaterThanOrEqual(coverZoom(view, world) - 1e-9);
    expect(r.min).toBeLessThanOrEqual(r.base);
    const lv = zoomLevels(r);
    expect(lv[0]).toBe(r.min);
    expect(lv[lv.length - 1]).toBe(12);
    expect(lv).toEqual([...lv].sort((a, b) => a - b));
  });
  it('double tap cycles up the levels then back to base', () => {
    const r = zoomRange(4, { w: 1170, h: 2532 }, world);
    expect(nextZoomLevel(r.base, r)).toBe(8);
    expect(nextZoomLevel(8, r)).toBe(12);
    expect(nextZoomLevel(12, r)).toBe(r.base);
  });
  it('screen/world round trip', () => {
    const cam = { x: 300, y: 400, zoom: 4 };
    const v = { w: 1170, h: 2532 };
    const p = screenToWorld(cam, v, 100, 200);
    const s = worldToScreen(cam, v, p.x, p.y);
    expect(s.x).toBeCloseTo(100);
    expect(s.y).toBeCloseTo(200);
    expect(screenToWorld(cam, v, v.w / 2, v.h / 2)).toEqual({ x: 300, y: 400 });
  });
  it('zoomAt keeps the point under the finger fixed', () => {
    const cam = { x: 640, y: 480, zoom: 4 };
    const v = { w: 1170, h: 2532 };
    const before = screenToWorld(cam, v, 300, 900);
    const z = zoomAt(cam, 8, v, 300, 900);
    const after = screenToWorld(z, v, 300, 900);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(z.zoom).toBe(8);
  });
  it('clampCenter keeps the view inside the map (+slack) and centers when larger', () => {
    const v = { w: 1000, h: 800 };
    const c = clampCenter(-500, 5000, 4, v, world, 0);
    expect(c.x).toBe(125); // half view = 125 world px
    expect(c.y).toBe(960 - 100);
    const mid = clampCenter(0, 0, 0.5, { w: 4000, h: 4000 }, world, 0);
    expect(mid).toEqual({ x: 640, y: 480 });
    const slack = clampCenter(-500, 480, 4, v, world, 64);
    expect(slack.x).toBe(125 - 64);
  });
  it('initial framing centers on the timeline camera tile', () => {
    const v = { w: 1170, h: 2532 };
    const c = initialCam({ x: 6, y: 9 }, 4, v, world);
    const s = worldToScreen(c, v, 6 * 32 + 16, 9 * 32 + 16);
    // 첫 핫스팟 근처(타일 6,9)가 화면 안, 가장자리에 걸리지 않는다
    expect(s.x).toBeGreaterThan(100);
    expect(s.x).toBeLessThan(v.w - 100);
    expect(s.y).toBeGreaterThan(100);
    expect(s.y).toBeLessThan(v.h - 100);
  });
  it('wheel factor: scroll up zooms in, down zooms out, clamped', () => {
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-100000)).toBeLessThan(2);
    expect(wheelFactor(-3, 1)).toBeGreaterThan(1);
  });
  it('inertia decays to a stop', () => {
    let v = { x: 800, y: -200 };
    for (let i = 0; i < 200; i++) v = decayVelocity(v, 1 / 60);
    expect(v).toEqual({ x: 0, y: 0 });
    const v1 = decayVelocity({ x: 100, y: 0 }, 0.1);
    expect(v1.x).toBeLessThan(100);
    expect(v1.x).toBeGreaterThan(0);
  });
});
