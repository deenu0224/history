import { describe, expect, it } from 'vitest';
import { findPath, findPathToAdjacent, nearestWalkable } from '@/game/logic/pathfinding';
import { autotile, groundKey } from '@/game/logic/autotile';
import { buildSolidGrid, findAnchors } from '@/game/logic/grid';
import { chooseZoom } from '@/game/logic/zoom';
import { ambientTint, darkness, GameClock } from '@/game/logic/clock';
import { moveBox } from '@/game/logic/collision';
import { pickInteractable } from '@/game/logic/interact';
import { resolveObjectSprite, resolveNpcSprite } from '@/game/keys';
import { getMap } from '@/game/maps/fallback';
import type { MapData } from '@/game/logic/types';

const grid = (rows: string[]) => rows.map((r) => [...r].map((c) => c === '#'));

describe('pathfinding', () => {
  const g = grid(['.....', '.###.', '.....']);
  it('finds shortest 4-dir path excluding start', () => {
    const p = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 })!;
    expect(p).toHaveLength(4);
    expect(p[3]).toEqual({ x: 4, y: 0 });
  });
  it('routes around walls and returns null when unreachable', () => {
    expect(findPath(g, { x: 0, y: 1 }, { x: 4, y: 1 })!.length).toBeGreaterThan(4);
    const closed = grid(['.#.']);
    expect(findPath(closed, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });
  it('adjacent path ends next to a solid target', () => {
    const p = findPathToAdjacent(g, { x: 0, y: 0 }, { x: 2, y: 1 })!;
    const last = p[p.length - 1];
    expect(Math.abs(last.x - 2) + Math.abs(last.y - 1)).toBe(1);
    expect(findPathToAdjacent(g, { x: 2, y: 0 }, { x: 2, y: 1 })).toEqual([]);
  });
  it('nearestWalkable', () => {
    expect(nearestWalkable(g, { x: 2, y: 1 })).not.toBeNull();
    expect(nearestWalkable(g, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('autotile', () => {
  const map: MapData = {
    w: 8,
    h: 6,
    ground: Array(6).fill('........'),
    walls: ['########', '#RRRRRR#', '#RRRRRR#', '#HHDHHH#', '#      #', '########'],
    spawn: { x: 1, y: 4 },
    ambient: 'past',
  };
  const r = autotile(map);
  it('picks wall corners and runs', () => {
    expect(r.cells[0][0].wall).toBe('tile_wall_corner_tl');
    expect(r.cells[0][3].wall).toBe('tile_wall_h');
    expect(r.cells[5][7].wall).toBe('tile_wall_corner_br');
    expect(r.cells[2][0].wall).toBe('tile_wall_v');
  });
  it('roof rows by position and ends', () => {
    expect(r.cells[1][3].wall).toBe('tile_roof_ridge');
    expect(r.cells[2][3].wall).toBe('tile_roof_eave');
    expect(r.cells[1][1].wall).toBe('tile_roof_ridge_l');
    expect(r.cells[2][6].wall).toBe('tile_roof_eave_r');
  });
  it('facade: windows face open ground, door by context', () => {
    expect(r.cells[3][2].wall).toBe('tile_window_hanji');
    expect(r.windows.length).toBeGreaterThan(0);
    expect(r.cells[3][3].wall).toBe('tile_door_hanji');
  });
  it('ground keys deterministic; modern door', () => {
    expect(groundKey('.', 3, 4)).toBe(groundKey('.', 3, 4));
    expect(groundKey('=', 0, 0)).toBe('tile_bakseok');
    expect(groundKey(' ', 0, 0)).toBeNull();
    const m = autotile({ ...map, ambient: 'modern' });
    expect(m.cells[3][3].wall).toBe('tile_lab_door');
  });
  it('solid grid: trees cover 2x2, doors passable, void blocked', () => {
    const t: MapData = { w: 4, h: 3, ground: ['.... ', '....', '....'].map((s) => s.slice(0, 4)), walls: ['T D ', '    ', '    '], spawn: { x: 0, y: 2 }, ambient: 'past' };
    const s = buildSolidGrid(t);
    expect(s[1][1]).toBe(true);
    expect(s[0][2]).toBe(false);
    expect(findAnchors(t).pines).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('real/fallback maps', () => {
  for (const id of ['lab', 'archive', 'obs001']) {
    it(`${id}: consistent dims and walkable spawn`, () => {
      const m = getMap(id);
      expect(m.ground).toHaveLength(m.h);
      expect(m.walls.every((r) => r.length === m.w)).toBe(true);
      const s = buildSolidGrid(m);
      expect(s[m.spawn.y][m.spawn.x]).toBe(false);
      autotile(m);
    });
  }
});

describe('zoom / clock / collision / interact / keys', () => {
  it('chooseZoom', () => {
    expect(chooseZoom(1280, 720)).toBeGreaterThanOrEqual(2);
    expect(chooseZoom(1920, 1080)).toBe(3);
    expect(chooseZoom(390, 844)).toBe(1);
    expect(chooseZoom(844, 390)).toBe(2);
  });
  it('clock and tint', () => {
    const c = new GameClock(1439, 60);
    c.tick(1);
    expect(c.whole).toBe(59);
    expect(darkness(ambientTint(720))).toBeLessThan(0.1);
    expect(darkness(ambientTint(0))).toBeGreaterThan(0.9);
  });
  it('moveBox blocks and slides', () => {
    const g = grid(['...', '.#.', '...']);
    const r = moveBox(g, { x: 48, y: 30, halfW: 7, h: 8 }, 0, 20);
    expect(r.hitY).toBe(true);
    expect(r.y).toBeLessThanOrEqual(32);
  });
  it('pickInteractable prefers facing target in range', () => {
    const list = [
      { id: 'a', x: 20, y: 0 },
      { id: 'b', x: 0, y: 24 },
      { id: 'far', x: 200, y: 0 },
    ];
    expect(pickInteractable({ x: 0, y: 0 }, 'right', list)?.id).toBe('a');
    expect(pickInteractable({ x: 0, y: 0 }, 'down', list)?.id).toBe('b');
    expect(pickInteractable({ x: 500, y: 0 }, 'down', list)).toBeNull();
  });
  it('sprite key aliasing with graceful fallback', () => {
    expect(resolveObjectSprite('obj_desk_writing', { ambient: 'past' }).key).toBe('obj_seoan');
    expect(resolveObjectSprite('obj_display_case', { ambient: 'modern', filled: true }).key).toBe('obj_case_filled');
    expect(resolveObjectSprite('door', { ambient: 'modern' }).key).toBe('tile_lab_door');
    expect(resolveObjectSprite('door', { ambient: 'past' }).key).toBe('tile_door_hanji');
    expect(resolveObjectSprite('nope', { ambient: 'past' }).placeholder).toBe(true);
    expect(resolveNpcSprite('npc_historian')).toBe('char_sagwan');
  });
});
