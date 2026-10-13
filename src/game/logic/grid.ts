import type { MapData, Pt } from './types';

/** 통행 불가 벽 문자. D(문)·S(섬돌)·공백은 통행 가능. */
export const SOLID_WALL_CHARS: ReadonlySet<string> = new Set(['#', 'H', 'R', 'P', 'M', 'N', 'T', 'U']);

export function charAt(rows: readonly string[], x: number, y: number): string {
  const r = rows[y];
  if (!r) return ' ';
  const c = r[x];
  return c === undefined ? ' ' : c;
}

export function inBounds(w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export interface Anchors {
  /** 소나무 2×2 의 좌상단 타일 */
  pines: Pt[];
  wells: Pt[];
}

/** 'T' 문자를 2×2 단위로 묶어 앵커(좌상단)를 구한다. */
export function findAnchors(map: Pick<MapData, 'w' | 'h' | 'walls'>): Anchors {
  const seen = new Set<string>();
  const pines: Pt[] = [];
  const wells: Pt[] = [];
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const c = charAt(map.walls, x, y);
      if (c === 'U') wells.push({ x, y });
      if (c !== 'T' || seen.has(`${x},${y}`)) continue;
      pines.push({ x, y });
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        if (charAt(map.walls, x + dx, y + dy) === 'T') seen.add(`${x + dx},${y + dy}`);
      }
    }
  }
  return { pines, wells };
}

/** solid[y][x] — 맵 바깥/바닥도 벽도 없는 칸은 통행 불가(공허). */
export function buildSolidGrid(map: MapData): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < map.h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < map.w; x++) {
      const wc = charAt(map.walls, x, y);
      const gc = charAt(map.ground, x, y);
      let solid = SOLID_WALL_CHARS.has(wc);
      if (!solid && wc === ' ' && gc === ' ') solid = true;
      row.push(solid);
    }
    grid.push(row);
  }
  // 소나무는 앵커 기준 2×2 전체가 고체
  for (const p of findAnchors(map).pines) {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      if (grid[p.y + dy]?.[p.x + dx] !== undefined) grid[p.y + dy][p.x + dx] = true;
    }
  }
  return grid;
}

export function isSolid(grid: readonly (readonly boolean[])[], x: number, y: number): boolean {
  const v = grid[y]?.[x];
  return v === undefined ? true : v;
}
