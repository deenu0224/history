import type { Pt } from './types';

type SolidGrid = readonly (readonly boolean[])[];

const DIRS: readonly Pt[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const walkable = (g: SolidGrid, x: number, y: number) => g[y]?.[x] === false;

/** goals 에서 시작하는 다중 출발 BFS 거리장. 통행 가능한 칸만 확장한다. */
function distanceField(g: SolidGrid, goals: readonly Pt[]): Map<number, number> {
  const w = g[0]?.length ?? 0;
  const dist = new Map<number, number>();
  const queue: Pt[] = [];
  for (const p of goals) {
    if (!walkable(g, p.x, p.y)) continue;
    const k = p.y * w + p.x;
    if (dist.has(k)) continue;
    dist.set(k, 0);
    queue.push(p);
  }
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    const d = dist.get(c.y * w + c.x)!;
    for (const dir of DIRS) {
      const nx = c.x + dir.x;
      const ny = c.y + dir.y;
      if (!walkable(g, nx, ny)) continue;
      const k = ny * w + nx;
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

/**
 * from 에서 goals 중 가장 가까운 곳까지의 4방향 최단 경로(from 제외, 목표 포함).
 * 같은 길이의 경로가 여럿이면 진행 방향을 유지하는 쪽을 골라 계단 모양 지그재그를 줄인다.
 * 이미 목표 위면 [], 도달 불가면 null. from 이 고체여도(끼임) 인접 칸으로 빠져나온다.
 */
export function findPathToAny(g: SolidGrid, from: Pt, goals: readonly Pt[]): Pt[] | null {
  const w = g[0]?.length ?? 0;
  const dist = distanceField(g, goals);
  const distAt = (x: number, y: number) => (walkable(g, x, y) ? dist.get(y * w + x) : undefined);
  const path: Pt[] = [];
  let cur = from;
  let prev: Pt | null = null;
  let d = distAt(cur.x, cur.y);
  if (d === 0) return [];
  if (d === undefined) {
    // 시작 칸이 고체/고립: 가장 가까운 인접 칸으로
    let best: Pt | null = null;
    let bestD = Infinity;
    for (const dir of DIRS) {
      const nd = distAt(cur.x + dir.x, cur.y + dir.y);
      if (nd !== undefined && nd < bestD) {
        bestD = nd;
        best = { x: cur.x + dir.x, y: cur.y + dir.y };
      }
    }
    if (!best) return null;
    path.push(best);
    prev = cur;
    cur = best;
    d = bestD;
  }
  let guard = w * (g.length || 1) + 4;
  while (d > 0 && guard-- > 0) {
    let next: Pt | null = null;
    let nextStraight = false;
    for (const dir of DIRS) {
      const nx = cur.x + dir.x;
      const ny = cur.y + dir.y;
      const nd = distAt(nx, ny);
      if (nd === undefined || nd >= d) continue;
      const straight = prev !== null && cur.x - prev.x === dir.x && cur.y - prev.y === dir.y;
      if (!next || (straight && !nextStraight)) {
        next = { x: nx, y: ny };
        nextStraight = straight;
      }
    }
    if (!next) return null;
    path.push(next);
    prev = cur;
    cur = next;
    d = distAt(cur.x, cur.y)!;
  }
  return path;
}

export function findPath(g: SolidGrid, from: Pt, to: Pt): Pt[] | null {
  return findPathToAny(g, from, [to]);
}

/** target 의 4방향 이웃(통행 가능) 중 가장 가까운 곳까지의 경로. target 위/이웃에 이미 있으면 []. */
export function findPathToAdjacent(g: SolidGrid, from: Pt, target: Pt): Pt[] | null {
  const goals = DIRS.map((d) => ({ x: target.x + d.x, y: target.y + d.y })).filter((p) => walkable(g, p.x, p.y));
  if (goals.some((p) => p.x === from.x && p.y === from.y)) return [];
  if (goals.length === 0) return null;
  return findPathToAny(g, from, goals);
}

/** p 에서 가장 가까운(맨해튼 BFS) 통행 가능 칸. p 가 통행 가능하면 p. */
export function nearestWalkable(g: SolidGrid, p: Pt, maxRadius = 12): Pt | null {
  if (walkable(g, p.x, p.y)) return p;
  for (let r = 1; r <= maxRadius; r++) {
    let best: Pt | null = null;
    let bestD = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const q = { x: p.x + dx, y: p.y + dy };
        if (!walkable(g, q.x, q.y)) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
    }
    if (best) return best;
  }
  return null;
}
