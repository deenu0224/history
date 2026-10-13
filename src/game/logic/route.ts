import { findPath, nearestWalkable } from './pathfinding';
import type { Pt } from './types';

export type Solid = readonly (readonly boolean[])[];

/** 두 타일 사이의 걷는 경로(시작 포함, 타일 좌표). 못 찾으면 직선. */
export function walkRoute(solid: Solid, from: Pt, to: Pt): Pt[] {
  if (from.x === to.x && from.y === to.y) return [from];
  const a = nearestWalkable(solid, from) ?? from;
  const b = nearestWalkable(solid, to) ?? to;
  const p = findPath(solid, a, b);
  if (!p) return [from, to];
  return [from, ...(a.x !== from.x || a.y !== from.y ? [a] : []), ...p, ...(b.x !== to.x || b.y !== to.y ? [to] : [])];
}

export function pathLength(pts: readonly Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return l;
}

/** 꺾은선 위 비율 t(0~1)의 점 */
export function pointAlong(pts: readonly Pt[], t: number): Pt {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1 || t <= 0) return pts[0]!;
  const total = pathLength(pts);
  if (total === 0 || t >= 1) return pts[pts.length - 1]!;
  let d = t * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= seg) return seg === 0 ? b : { x: a.x + ((b.x - a.x) * d) / seg, y: a.y + ((b.y - a.y) * d) / seg };
    d -= seg;
  }
  return pts[pts.length - 1]!;
}

export type Facing4 = 'down' | 'left' | 'right' | 'up';

export function facingFromVector(dx: number, dy: number, prev: Facing4 = 'down'): Facing4 {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
