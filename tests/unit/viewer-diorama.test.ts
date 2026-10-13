import { describe, expect, it } from 'vitest';
import { clampDioramaCenter, dioramaZoomRange, fitZoom, hiddenStatics, isIndoor, sceneTint } from '@/game/logic/diorama';
import { DIORAMAS } from '@/game/scenes/maps';
import { content } from '@/data';
import { SPRITES } from '@/game/art';

describe('diorama fit', () => {
  it('fits the whole scene at integer zoom (mobile portrait / desktop)', () => {
    expect(fitZoom({ w: 1170, h: 2352 }, { w: 480, h: 320 })).toBe(2);
    expect(fitZoom({ w: 1170, h: 2352 }, { w: 608, h: 384 })).toBe(2);
    expect(fitZoom({ w: 2532, h: 1100 }, { w: 480, h: 320 })).toBe(3);
    expect(fitZoom({ w: 100, h: 100 }, { w: 480, h: 320 })).toBe(0.5);
  });
  it('range: base = min = fit, max = 3x', () => {
    const r = dioramaZoomRange(2, { w: 1, h: 1 }, { w: 1, h: 1 });
    expect(r).toEqual({ base: 2, min: 2, max: 6 });
  });
  it('center free when zoomed in, fixed at base', () => {
    const view = { w: 1170, h: 2352 };
    const world = { w: 480, h: 320 };
    expect(clampDioramaCenter(10, 10, 2, 2, view, world, 0)).toEqual({ x: 240, y: 160 });
    const c = clampDioramaCenter(240, 250, 4, 2, view, world, 64);
    expect(c.y).toBe(250);
    expect(clampDioramaCenter(240, 999, 4, 2, view, world, 64).y).toBe(320);
  });
});

describe('diorama statics', () => {
  it('hides figure decor on speaker tiles only', () => {
    const objs = [
      { spriteKey: 'char_clerk', x: 3, y: 4 },
      { spriteKey: 'obj_chest', x: 3, y: 4 },
      { spriteKey: 'seat_council_red', x: 5, y: 5 },
    ];
    const h = hiddenStatics(objs, [{ x: 3, y: 4 }]);
    expect(h.has(objs[0]!)).toBe(true);
    expect(h.has(objs[1]!)).toBe(false);
    expect(h.has(objs[2]!)).toBe(false);
  });
  it('all diorama sprites exist and speakers stand clear of figure decor', () => {
    for (const [id, d] of Object.entries(DIORAMAS)) {
      for (const o of d.objects) expect(SPRITES[o.spriteKey], `${id}:${o.spriteKey}`).toBeTruthy();
      const tiles = content.timelines
        .filter((t) => t.sceneId === id)
        .flatMap((t) => t.hotspots.filter((h) => h.kind === 'npc').flatMap((h) => content.npcs.find((n) => n.id === h.targetId)?.schedule ?? []));
      expect(hiddenStatics(d.objects, tiles).size, id).toBe(0);
    }
  });
});

describe('scene tint', () => {
  it('indoor scenes are warmer by day, dark stays dark', () => {
    expect(isIndoor('sc_council')).toBe(true);
    expect(isIndoor('sc_court_decree')).toBe(false);
    const out = sceneTint('sc_court_decree', 700);
    const inn = sceneTint('sc_council', 700);
    expect(inn.color[2]).toBeLessThan(out.color[2]);
    expect(inn.dark).toBeGreaterThanOrEqual(0.42);
    expect(sceneTint('sc_council', 120).dark).toBeGreaterThan(0.5);
  });
});
