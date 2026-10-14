import { describe, expect, it } from 'vitest';
import { postProcess } from '@/game/pov/post';
import { ERASED_PALETTE, MEMORY_PALETTE, hexToRgb } from '@/game/pov/palette';

function gradient(w: number, h: number): Uint8ClampedArray {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      a[i] = (x / w) * 255;
      a[i + 1] = (y / h) * 200;
      a[i + 2] = 90;
      a[i + 3] = 255;
    }
  return a;
}

const key = (r: number, g: number, b: number) => `${r},${g},${b}`;
const set = (p: readonly string[]) => new Set(p.map((h) => key(...hexToRgb(h))));

describe('pov post-process', () => {
  const w = 48;
  const h = 64;
  const depth = new Float32Array(w * h).map((_, i) => (i % w < w / 2 ? 2 : 9));

  it('memory output uses only the memory palette and is deterministic', () => {
    const a = postProcess({ w, h, rgba: gradient(w, h), depth, focusDepth: 2, overlay: 'memory', seed: 7 });
    const b = postProcess({ w, h, rgba: gradient(w, h), depth, focusDepth: 2, overlay: 'memory', seed: 7 });
    expect(Array.from(a)).toEqual(Array.from(b));
    const pal = set(MEMORY_PALETTE);
    for (let i = 0; i < a.length; i += 4) expect(pal.has(key(a[i], a[i + 1], a[i + 2]))).toBe(true);
  });

  it('erased output uses only the cold palette', () => {
    const a = postProcess({ w, h, rgba: gradient(w, h), overlay: 'erased', seed: 3 });
    const pal = set(ERASED_PALETTE);
    for (let i = 0; i < a.length; i += 4) expect(pal.has(key(a[i], a[i + 1], a[i + 2]))).toBe(true);
  });

  it('dithers smooth gradients (more than a handful of colours survive)', () => {
    const a = postProcess({ w, h, rgba: gradient(w, h), overlay: 'memory', seed: 1 });
    const used = new Set<string>();
    for (let i = 0; i < a.length; i += 4) used.add(key(a[i], a[i + 1], a[i + 2]));
    expect(used.size).toBeGreaterThan(6);
  });

  it('palettes have no pure black or white', () => {
    for (const p of [...MEMORY_PALETTE, ...ERASED_PALETTE]) {
      expect(p.toLowerCase()).not.toBe('#000000');
      expect(p.toLowerCase()).not.toBe('#ffffff');
    }
  });
});
