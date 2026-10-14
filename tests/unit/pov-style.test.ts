import { describe, expect, it } from 'vitest';
import { PIXEL_ERASED_PALETTE, PIXEL_PALETTE, postPixel } from '@/game/pov/post-pixel';
import { postPainted } from '@/game/pov/post-painted';
import { hexToRgb } from '@/game/pov/palette';

/** 2배 입력: 왼쪽 위에서 밝아지는 벽(방) 앞에 가운데 사람 하나(가까움) */
function scene(w2: number, h2: number) {
  const N = w2 * h2;
  const rgba = new Uint8Array(N * 4);
  const depth = new Float32Array(N);
  const normal = new Float32Array(N * 3);
  const obj = new Uint16Array(N);
  for (let y = 0; y < h2; y++)
    for (let x = 0; x < w2; x++) {
      const i = y * w2 + x;
      const fig = Math.abs(x - w2 / 2) < w2 / 8 && y > h2 / 3;
      const v = fig ? 0.35 : 0.15 + 0.75 * (x / w2) * (1 - y / h2);
      rgba[i * 4] = Math.round(255 * Math.min(1, v * 1.05));
      rgba[i * 4 + 1] = Math.round(255 * v * 0.9);
      rgba[i * 4 + 2] = Math.round(255 * v * 0.72);
      rgba[i * 4 + 3] = 255;
      depth[i] = fig ? 3 : 8;
      normal[i * 3 + 2] = 1;
      obj[i] = fig ? 1 : 2;
    }
  return { rgba, depth, normal, obj, objNames: ['', 'fig_a', 'hall'] };
}

const colours = (rgba: Uint8ClampedArray) => {
  const s = new Set<string>();
  for (let i = 0; i < rgba.length; i += 4) s.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`);
  return s;
};
const asSet = (pal: readonly string[]) => new Set(pal.map((h) => hexToRgb(h).join(',')));

describe('pov style: pixel', () => {
  const s = scene(120, 160);
  const out = postPixel({ w2: 120, h2: 160, ...s, overlay: 'memory', seed: 3 });

  it('halves the resolution and uses only the small palette (≤24 colours)', () => {
    expect([out.w, out.h]).toEqual([60, 80]);
    expect(PIXEL_PALETTE.length).toBeLessThanOrEqual(24);
    const pal = asSet(PIXEL_PALETTE);
    for (const c of colours(out.rgba)) expect(pal.has(c)).toBe(true);
  });

  it('draws a 1px ink outline on the near side of a figure silhouette', () => {
    const ink = hexToRgb(PIXEL_PALETTE[0]).join(',');
    const y = 60;
    const x0 = Math.ceil(30 - 60 / 8); // first figure column at half res
    const i = (y * out.w + x0) * 4;
    expect(`${out.rgba[i]},${out.rgba[i + 1]},${out.rgba[i + 2]}`).toBe(ink);
    expect(out.figMask[y * out.w + 30]).toBe(1);
  });

  it('erased uses only the cold palette and is deterministic', () => {
    const a = postPixel({ w2: 120, h2: 160, ...s, overlay: 'erased', seed: 9 });
    const b = postPixel({ w2: 120, h2: 160, ...s, overlay: 'erased', seed: 9 });
    expect(a.rgba).toEqual(b.rgba);
    const pal = asSet(PIXEL_ERASED_PALETTE);
    for (const c of colours(a.rgba)) expect(pal.has(c)).toBe(true);
  });
});

describe('pov style: painted', () => {
  it('keeps full resolution, is not palette-quantised, and is deterministic', () => {
    const s = scene(96, 128);
    const inp = { w: 96, h: 128, rgba: s.rgba, depth: s.depth, obj: s.obj, objNames: s.objNames, focalPx: 120, overlay: 'memory' as const, seed: 5 };
    const a = postPainted(inp);
    const b = postPainted(inp);
    expect(a.length).toBe(96 * 128 * 4);
    expect(a).toEqual(b);
    expect(colours(a).size).toBeGreaterThan(200);
  });
});
