import { describe, expect, it } from 'vitest';
import {
  ANIMS,
  CHAR_FRAMES,
  CHAR_H,
  CHAR_KEYS,
  NINE_SLICE,
  OBJ_KEYS,
  PALETTE,
  REFERENCE_NEEDED,
  SPRITES,
  SPRITE_META,
  TILES,
  TILE_KEYS,
  UI_KEYS,
  validateSprite,
} from '@/game/art';
import type { PixelSprite } from '@/game/art';
import { isValidHex, OUTLINE_OF } from '@/game/art/palettes';

describe('art registry', () => {
  it('has content', () => {
    expect(Object.keys(TILES).length).toBeGreaterThan(30);
    expect(Object.keys(SPRITES).length).toBeGreaterThan(40);
  });

  it('keys do not collide between TILES and SPRITES', () => {
    const t = new Set(Object.keys(TILES));
    for (const k of Object.keys(SPRITES)) expect(t.has(k), k).toBe(false);
  });

  it.each([...Object.entries(TILES), ...Object.entries(SPRITES)])('%s is a valid sprite', (_key, sp) => {
    expect(validateSprite(sp)).toEqual([]);
  });

  it('tiles are 32x32 single frames', () => {
    for (const [k, sp] of Object.entries(TILES)) {
      expect(`${k} ${sp.w}x${sp.h}`).toBe(`${k} 32x32`);
      expect(sp.frames.length, k).toBe(1);
    }
  });

  it('key constants all resolve', () => {
    for (const v of Object.values(TILE_KEYS)) expect(TILES[v], v).toBeDefined();
    for (const v of [...Object.values(OBJ_KEYS), ...Object.values(CHAR_KEYS), ...Object.values(UI_KEYS)]) expect(SPRITES[v], v).toBeDefined();
  });

  it('every sprite has exactly one meta with a valid status', () => {
    for (const k of [...Object.keys(TILES), ...Object.keys(SPRITES)]) {
      expect(SPRITE_META[k], k).toBeDefined();
      expect(['temp', 'final']).toContain(SPRITE_META[k].status);
    }
    for (const k of Object.keys(SPRITE_META)) expect(TILES[k] ?? SPRITES[k], `meta for unknown ${k}`).toBeDefined();
  });

  it('temp sprites document why, and reference ids exist', () => {
    const ids = new Set(REFERENCE_NEEDED.map((r) => r.id));
    for (const [k, m] of Object.entries(SPRITE_META)) {
      if (m.status !== 'temp') continue;
      expect(m.note, k).toBeTruthy();
      for (const id of m.needsReference ?? []) expect(ids.has(id), `${k} -> ${id}`).toBe(true);
    }
  });

  it('geomungo is clearly marked temporary', () => {
    expect(SPRITES['artifact_geomungo_TEMP']).toBeDefined();
    expect(SPRITE_META['artifact_geomungo_TEMP'].status).toBe('temp');
    const g = SPRITES['artifact_geomungo_TEMP'];
    expect(g.w / g.h).toBeGreaterThanOrEqual(5.5);
  });

  it('palette is valid and outline map points at palette chars', () => {
    for (const [ch, hex] of Object.entries(PALETTE)) {
      expect(ch.length).toBe(1);
      expect(isValidHex(hex), hex).toBe(true);
    }
    for (const [k, v] of Object.entries(OUTLINE_OF)) {
      expect(PALETTE[k]).toBeDefined();
      expect(PALETTE[v]).toBeDefined();
    }
  });
});

describe('characters', () => {
  const chars = Object.values(CHAR_KEYS).map((k) => [k, SPRITES[k]] as const);

  it.each(chars)('%s has the standard frame layout', (key, sp) => {
    expect(sp.h).toBe(CHAR_H);
    expect(sp.frames.length).toBeGreaterThanOrEqual(20);
    if (key === 'char_sagwan') expect(sp.frames.length).toBe(26);
    else if (key === 'char_player_modern' || key === 'char_player_observer') expect(sp.frames.length).toBe(20);
    else expect(sp.frames.length).toBe(21);
  });

  it('walk frames differ from idle and from each other', () => {
    for (const [key, sp] of chars) {
      for (const d of ['down', 'left', 'up'] as const) {
        const base = CHAR_FRAMES[d];
        const walk = [1, 2, 3, 4].map((i) => sp.frames[base + i].join('\n'));
        expect(new Set(walk).size, `${key} ${d}`).toBeGreaterThanOrEqual(3);
        expect(walk[0], key).not.toBe(sp.frames[base].join('\n'));
      }
    }
  });

  it('official variants are visually distinct', () => {
    const sig = (k: string) => SPRITES[k].frames[0].join('');
    const keys = ['char_official_red', 'char_official_blue', 'char_official_green', 'char_sagwan', 'char_clerk', 'char_servant'];
    expect(new Set(keys.map(sig)).size).toBe(keys.length);
    const robe = (k: string) => SPRITES[k].palette;
    expect(robe('char_official_red')).not.toEqual(robe('char_official_blue'));
  });

  it('observer shares pixels with the modern player but is translucent', () => {
    const a = SPRITES['char_player_modern'];
    const b = SPRITES['char_player_observer'];
    expect(b.frames).toEqual(a.frames);
    const alphas = Object.values(b.palette).map((h) => (h.length === 9 ? parseInt(h.slice(7), 16) : 255));
    expect(Math.max(...alphas)).toBeLessThan(200);
  });
});

describe('sprites are not flat', () => {
  it('every sprite uses at least 3 colors (shading)', () => {
    for (const [k, sp] of [...Object.entries(TILES), ...Object.entries(SPRITES)]) {
      expect(Object.keys(sp.palette).length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('animations', () => {
  const all: Record<string, PixelSprite> = { ...SPRITES, ...TILES };
  it('keys are unique and frames are in range', () => {
    const seen = new Set<string>();
    for (const a of ANIMS) {
      expect(seen.has(a.key), a.key).toBe(false);
      seen.add(a.key);
      const sp = all[a.spriteKey];
      expect(sp, a.spriteKey).toBeDefined();
      for (const f of a.frames) expect(f >= 0 && f < sp.frames.length, `${a.key} frame ${f}`).toBe(true);
      expect(a.frameRate).toBeGreaterThan(0);
    }
  });

  it('includes walk/idle for each direction and role-specific anims', () => {
    const keys = new Set(ANIMS.map((a) => a.key));
    for (const d of ['down', 'left', 'right', 'up']) {
      expect(keys.has(`char_official_red_walk_${d}`)).toBe(true);
      expect(keys.has(`char_player_modern_idle_${d}`)).toBe(true);
    }
    expect(keys.has('char_sagwan_write')).toBe(true);
    expect(keys.has('char_sagwan_read')).toBe(true);
    expect(keys.has('char_servant_bow')).toBe(true);
    expect(keys.has('char_player_modern_bow')).toBe(false);
    expect(keys.has('anim_lamp_flicker')).toBe(true);
  });
});

describe('9-slice', () => {
  it('panels exist and slices fit inside', () => {
    for (const [k, s] of Object.entries(NINE_SLICE)) {
      const sp = SPRITES[k];
      expect(sp, k).toBeDefined();
      expect(s.left + s.right).toBeLessThan(sp.w);
      expect(s.top + s.bottom).toBeLessThan(sp.h);
    }
  });
});

describe('validateSprite', () => {
  const ok: PixelSprite = { w: 2, h: 2, palette: { a: '#112233' }, frames: [['a.', '.a']] };
  it('accepts a valid sprite', () => expect(validateSprite(ok)).toEqual([]));
  it('rejects bad row length', () => expect(validateSprite({ ...ok, frames: [['a', '.a']] }).length).toBeGreaterThan(0));
  it('rejects unknown palette char', () => expect(validateSprite({ ...ok, frames: [['ab', '.a']] }).length).toBeGreaterThan(0));
  it('rejects wrong row count', () => expect(validateSprite({ ...ok, frames: [['a.']] }).length).toBeGreaterThan(0));
  it('rejects bad color', () => expect(validateSprite({ ...ok, palette: { a: 'red' } }).length).toBeGreaterThan(0));
  it("rejects '.' in palette", () => expect(validateSprite({ ...ok, palette: { a: '#112233', '.': '#000000' } }).length).toBeGreaterThan(0));
  it('rejects empty frame', () => expect(validateSprite({ ...ok, frames: [['..', '..']] }).length).toBeGreaterThan(0));
});
