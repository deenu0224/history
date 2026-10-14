import { describe, expect, it } from 'vitest';
import {
  Lru,
  MIN_TOUCH,
  cameraAround,
  cameraToSource,
  clampCamera,
  computeHitboxes,
  computeLayout,
  cutCacheKey,
  depthSort,
  figureFeet,
  figureFrame,
  fnv1a,
  mulberry32,
  specHash,
} from '@/game/cuts/math';
import type { CutSpec } from '@/game/cuts/types';
import { DIORAMAS } from '@/game/scenes/maps';
import { MAPS } from '@/data/world/maps';

const base: CutSpec = {
  id: 'a',
  sceneId: 'sc_council',
  camera: { x: 3, y: 2, w: 4, h: 5.5 },
  figures: [{ id: 'f1', spriteKey: 'char_official_red', x: 5, y: 4, facing: 'down' }],
};

describe('camera crop / scale math', () => {
  it('converts tile camera to integer source px', () => {
    expect(cameraToSource({ x: 3, y: 2, w: 4, h: 5.5 })).toEqual({ sx: 96, sy: 64, sw: 128, sh: 176 });
  });

  it('clamps camera inside the scene and shrinks oversize', () => {
    expect(clampCamera({ x: -2, y: 9, w: 4, h: 4 }, 15, 10)).toEqual({ x: 0, y: 6, w: 4, h: 4 });
    expect(clampCamera({ x: 14, y: 0, w: 4, h: 4 }, 15, 10)).toEqual({ x: 11, y: 0, w: 4, h: 4 });
    expect(clampCamera({ x: 0, y: 0, w: 40, h: 30 }, 15, 10)).toEqual({ x: 0, y: 0, w: 15, h: 10 });
  });

  it('uses the largest integer device scale that fits, centred', () => {
    // 4x5.5 tiles = 128x176 px into 390x520 @1x → min(3.04, 2.95) = 2
    const L = computeLayout({ x: 3, y: 2, w: 4, h: 5.5 }, 390, 520, 1);
    expect(L.scale).toBe(2);
    expect(L.dw).toBe(256);
    expect(L.dh).toBe(352);
    expect(L.dx).toBe(Math.floor((390 - 256) / 2));
    expect(L.dy).toBe(Math.floor((520 - 352) / 2));
    // @3x the same cut fits at scale 8 device px (= 2.67 css px)
    const L3 = computeLayout({ x: 3, y: 2, w: 4, h: 5.5 }, 390, 520, 3);
    expect(L3.scale).toBe(8);
    expect(L3.pw).toBe(1170);
    expect(L3.dx).toBeGreaterThanOrEqual(0);
  });

  it('never goes below scale 1 and never overflows when it fits', () => {
    const L = computeLayout({ x: 0, y: 0, w: 40, h: 30 }, 100, 100, 1);
    expect(L.scale).toBe(1);
    const M = computeLayout({ x: 1, y: 1, w: 5, h: 5 }, 390, 520, 2);
    expect(M.dw).toBeLessThanOrEqual(M.pw);
    expect(M.dh).toBeLessThanOrEqual(M.ph);
  });

  it('fill grows the visible rect around the camera instead of letterboxing', () => {
    const scene = { w: 15, h: 10 };
    const cam = { x: 5, y: 3, w: 4, h: 5.5 };
    const plain = computeLayout(cam, 390, 520, 1, scene, false);
    const filled = computeLayout(cam, 390, 520, 1, scene, true);
    expect(filled.scale).toBe(plain.scale);
    expect(filled.sw).toBeGreaterThanOrEqual(plain.sw);
    expect(filled.dw).toBeGreaterThan(plain.dw - 1);
    // camera stays inside the visible rect
    expect(filled.sx).toBeLessThanOrEqual(plain.sx);
    expect(filled.sx + filled.sw).toBeGreaterThanOrEqual(plain.sx + plain.sw);
    // never reads outside the scene
    expect(filled.sx).toBeGreaterThanOrEqual(0);
    expect(filled.sy).toBeGreaterThanOrEqual(0);
    expect(filled.sx + filled.sw).toBeLessThanOrEqual(scene.w * 32);
    expect(filled.sy + filled.sh).toBeLessThanOrEqual(scene.h * 32);
    // leftover letterbox is under one scaled pixel
    expect(filled.pw - filled.dw).toBeLessThan(filled.scale + 1);
  });

  it('cameraAround fills the output at the requested css scale and stays in the scene', () => {
    const c = cameraAround(7, 5, 3, 390, 520);
    expect(c.w * 32 * 3).toBeCloseTo(390);
    expect(c.h * 32 * 3).toBeCloseTo(520);
    const edge = cameraAround(0, 0, 3, 390, 520, { w: 15, h: 10 });
    expect(edge.x).toBe(0);
    expect(edge.y).toBe(0);
  });
});

describe('figure frame / feet', () => {
  it('maps facing to character frames and pose frames', () => {
    expect(figureFrame('char_clerk', undefined, 'up')).toBe(15);
    expect(figureFrame('char_clerk', undefined, 'left')).toBe(5);
    expect(figureFrame('char_clerk', undefined, undefined)).toBe(0);
    expect(figureFrame('pose_kneel_naegwan', undefined, 'right')).toBe(2);
    expect(figureFrame('seat_council_red', undefined, 'left')).toBe(1);
    expect(figureFrame('char_clerk', 21, 'up')).toBe(21);
  });
  it('characters stand at +22, object-like figures at +28 (same as dioramas)', () => {
    expect(figureFeet({ x: 2, y: 3, spriteKey: 'char_clerk' })).toEqual({ x: 80, y: 118 });
    expect(figureFeet({ x: 2, y: 3, spriteKey: 'pose_kneel_servant' }).y).toBe(118);
    expect(figureFeet({ x: 2, y: 3, spriteKey: 'seat_council_red' }).y).toBe(124);
  });
});

describe('hitboxes', () => {
  it('are at least 44 css px, centred on the sprite, and inside the view', () => {
    const boxes = computeHitboxes(base, 390, 520, 2, { w: 15, h: 10 });
    expect(boxes).toHaveLength(1);
    const b = boxes[0]!;
    expect(b.w).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(b.h).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(b.x + b.w / 2).toBeGreaterThan(0);
    expect(b.x + b.w / 2).toBeLessThan(390);
  });

  it('small on screen → clamps up to 44; big on screen → sprite size', () => {
    const far: CutSpec = { ...base, camera: { x: 0, y: 0, w: 15, h: 10 } };
    const small = computeHitboxes(far, 390, 520, 1, { w: 15, h: 10 })[0]!;
    expect(small.w).toBe(MIN_TOUCH);
    expect(small.h).toBe(MIN_TOUCH);
    const close: CutSpec = { ...base, camera: { x: 4, y: 2.5, w: 3, h: 4 } };
    const big = computeHitboxes(close, 390, 520, 1, { w: 15, h: 10 })[0]!;
    expect(big.w).toBeCloseTo(24 * 4);
    expect(big.h).toBeCloseTo(36 * 4);
  });

  it('drops figures whose centre is outside the cut and orders back to front', () => {
    const spec: CutSpec = {
      ...base,
      camera: { x: 3, y: 2, w: 6, h: 8 },
      figures: [
        { id: 'front', spriteKey: 'char_clerk', x: 5, y: 8 },
        { id: 'out', spriteKey: 'char_clerk', x: 14, y: 8 },
        { id: 'back', spriteKey: 'char_clerk', x: 5, y: 3 },
      ],
    };
    const ids = computeHitboxes(spec, 390, 520, 1, { w: 15, h: 10 }).map((b) => b.id);
    expect(ids).toEqual(['back', 'front']);
  });

  it('matches the layout the renderer uses (fill shifts boxes)', () => {
    const a = computeHitboxes(base, 390, 520, 1, { w: 15, h: 10 })[0]!;
    const b = computeHitboxes({ ...base, fill: true }, 390, 520, 1, { w: 15, h: 10 })[0]!;
    expect(a.x).not.toBe(b.x);
  });
});

describe('depth sort', () => {
  it('sorts back to front, stable on ties (figures after decor), flat items below everything', () => {
    const items = [
      { n: 'fig', depth: 100, order: 100001 },
      { n: 'desk', depth: 100, order: 3 },
      { n: 'mat', depth: -500 + 8, order: 9 },
      { n: 'screen', depth: 60, order: 1 },
      { n: 'lamp', depth: 140, order: 2 },
    ];
    expect(depthSort(items).map((i) => i.n)).toEqual(['mat', 'screen', 'desk', 'fig', 'lamp']);
  });
  it('does not mutate its input', () => {
    const items = [
      { depth: 2, order: 0 },
      { depth: 1, order: 1 },
    ];
    depthSort(items);
    expect(items[0]!.depth).toBe(2);
  });
});

describe('cache keys', () => {
  it('fnv1a is deterministic', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
    expect(fnv1a('')).toHaveLength(8);
  });
  it('specHash ignores id and key order, but not content', () => {
    const a = specHash(base);
    expect(specHash({ ...base, id: 'zzz' })).toBe(a);
    const reordered: CutSpec = { figures: base.figures, camera: { h: 5.5, w: 4, y: 2, x: 3 }, sceneId: 'sc_council', id: 'q' };
    expect(specHash(reordered)).toBe(a);
    expect(specHash({ ...base, time: 600 })).not.toBe(a);
    expect(specHash({ ...base, overlay: 'erased' })).not.toBe(a);
    expect(specHash({ ...base, camera: { ...base.camera, x: 3.5 } })).not.toBe(a);
    expect(specHash({ ...base, figures: [{ ...base.figures![0]!, highlight: 'tagged' }] })).not.toBe(a);
    // undefined fields do not matter
    expect(specHash({ ...base, time: undefined })).toBe(a);
  });
  it('cutCacheKey separates sizes and dpr', () => {
    const k = cutCacheKey(base, 390, 520, 2);
    expect(cutCacheKey(base, 390, 520, 2)).toBe(k);
    expect(cutCacheKey(base, 390.2, 520, 2)).toBe(k);
    expect(cutCacheKey(base, 360, 520, 2)).not.toBe(k);
    expect(cutCacheKey(base, 390, 520, 3)).not.toBe(k);
  });
  it('Lru evicts the least recently used', () => {
    const l = new Lru<number>(2);
    l.set('a', 1);
    l.set('b', 2);
    l.get('a');
    l.set('c', 3);
    expect(l.has('b')).toBe(false);
    expect(l.has('a')).toBe(true);
    expect(l.size).toBe(2);
  });
  it('mulberry32 is seeded', () => {
    const r1 = mulberry32(5);
    const r2 = mulberry32(5);
    expect([r1(), r1()]).toEqual([r2(), r2()]);
  });
});

describe('scene sizes line up with the tile cameras the dev page uses', () => {
  it('known scene dimensions', () => {
    expect([MAPS.obs001.w, MAPS.obs001.h]).toEqual([40, 30]);
    expect([DIORAMAS.sc_council.w, DIORAMAS.sc_council.h]).toEqual([15, 10]);
  });
});
