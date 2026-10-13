import type { Facing, Pt } from './types';

export interface Candidate {
  id: string;
  /** 중심(px) */
  x: number;
  y: number;
}

const FACE_VEC: Record<Facing, Pt> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** 범위(px) 안에서 가장 가까운(바라보는 방향 가중) 상호작용 대상. */
export function pickInteractable<T extends Candidate>(player: Pt, facing: Facing, list: readonly T[], range = 48): T | null {
  const f = FACE_VEC[facing];
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of list) {
    const dx = c.x - player.x;
    const dy = c.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > range) continue;
    const dot = d === 0 ? 1 : (dx * f.x + dy * f.y) / d;
    const score = d - (dot > 0.5 ? 14 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function facingFromVector(dx: number, dy: number, fallback: Facing = 'down'): Facing {
  if (dx === 0 && dy === 0) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
