/**
 * 범례 문자 → 타일 키 오토타일링 (순수 함수, Phaser 무관).
 * 담장은 이웃으로 모서리/끝, 지붕은 열(위치)로 용마루/몸통/처마, 'H' 는 처마 서까래/한지 창/기둥으로 결정한다.
 */
import { TILE_KEYS as K } from '@/game/art/registry';
import { charAt, findAnchors } from './grid';
import type { Ambient, MapData, Pt } from './types';

export interface TileCell {
  /** 바닥 타일 키 (없으면 공허) */
  ground: string | null;
  /** 벽/건물 타일 키 (소나무·우물은 스프라이트로 따로 그리므로 null) */
  wall: string | null;
}

export interface AutotileResult {
  cells: TileCell[][];
  /** 한지 창 위치(밤/램프 점등 오버레이용) */
  windows: Pt[];
  pines: Pt[];
  wells: Pt[];
}

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return h >>> 0;
}

export function groundKey(ch: string, x: number, y: number): string | null {
  const n = hash2(x, y);
  switch (ch) {
    case '.': {
      const r = n % 12;
      return r < 8 ? K.madangA : r < 10 ? K.madangB : K.madangC;
    }
    case ',':
      return n % 2 === 0 ? K.madangB : K.madangC;
    case '"':
      return n % 5 === 0 ? K.grassB : K.grassA;
    case '=':
      return K.bakseok;
    case '_':
      return K.maru;
    case 'o':
      return K.ondolFloor;
    case 'w':
      return K.labFloorWood;
    case 'c':
      return K.labCarpet;
    default:
      return null;
  }
}

const BUILDING = new Set(['H', 'P', 'D', 'R', 'N', 'M']);
const isSolidWallChar = (c: string) => '#HRPMNTU'.includes(c) && c !== ' ';

function wallTile(map: MapData, x: number, y: number, ch: string): { key: string | null; window?: boolean } {
  const at = (dx: number, dy: number) => charAt(map.walls, x + dx, y + dy);
  switch (ch) {
    case '#': {
      const conn = (c: string) => c === '#' || c === 'D';
      const n = conn(at(0, -1));
      const e = conn(at(1, 0));
      const s = conn(at(0, 1));
      const w = conn(at(-1, 0));
      if (e && w) return { key: K.wallH };
      if (n && s) return { key: K.wallV };
      if (e && s) return { key: K.wallCornerTl };
      if (w && s) return { key: K.wallCornerTr };
      if (e && n) return { key: K.wallCornerBl };
      if (w && n) return { key: K.wallCornerBr };
      if (e) return { key: K.wallEndL };
      if (w) return { key: K.wallEndR };
      if (n || s) return { key: K.wallV };
      return { key: K.wallH };
    }
    case 'R': {
      const above = at(0, -1) === 'R';
      const below = at(0, 1) === 'R';
      const left = at(-1, 0) === 'R';
      const right = at(1, 0) === 'R';
      const side = !left && right ? 'l' : left && !right ? 'r' : 'm';
      if (!above && below) return { key: side === 'l' ? K.roofRidgeL : side === 'r' ? K.roofRidgeR : K.roofRidge };
      if (above && below) return { key: side === 'l' ? K.roofEdgeL : side === 'r' ? K.roofEdgeR : K.roofBody };
      return { key: side === 'l' ? K.roofEaveL : side === 'r' ? K.roofEaveR : K.roofEave };
    }
    case 'H': {
      const up = at(0, -1);
      const down = at(0, 1);
      if (up === 'R' && 'HPD'.includes(down)) return { key: K.eaveRafter };
      const left = at(-1, 0);
      const right = at(1, 0);
      if (!BUILDING.has(left) || !BUILDING.has(right)) return { key: K.pillar };
      const open = !isSolidWallChar(down) && down !== 'D';
      if (open) return { key: K.windowHanji, window: true };
      return { key: K.innerWall };
    }
    case 'P':
      return { key: K.pillar };
    case 'D': {
      if (map.ambient === 'modern' || at(-1, 0) === 'M' || at(1, 0) === 'M') return { key: K.labDoor };
      if (at(-1, 0) === '#' || at(1, 0) === '#') return { key: K.doorGate };
      return { key: K.doorHanji };
    }
    case 'S':
      return { key: at(0, -1) === 'D' ? K.stairs : K.seomdol };
    case 'M':
      return { key: K.labWall };
    case 'N':
      return { key: K.labWindow };
    default:
      return { key: null };
  }
}

export function defaultGround(ambient: Ambient): string {
  return ambient === 'modern' ? K.labFloorWood : K.madangA;
}

export function autotile(map: MapData): AutotileResult {
  const cells: TileCell[][] = [];
  const windows: Pt[] = [];
  const { pines, wells } = findAnchors(map);
  for (let y = 0; y < map.h; y++) {
    const row: TileCell[] = [];
    for (let x = 0; x < map.w; x++) {
      const gc = charAt(map.ground, x, y);
      const wc = charAt(map.walls, x, y);
      let ground = groundKey(gc, x, y);
      let wall: string | null = null;
      if (wc !== ' ') {
        if (wc !== 'T' && wc !== 'U') {
          const t = wallTile(map, x, y, wc);
          wall = t.key;
          if (t.window) windows.push({ x, y });
        }
        if (!ground) ground = defaultGround(map.ambient);
      }
      row.push({ ground, wall });
    }
    cells.push(row);
  }
  return { cells, windows, pines, wells };
}
