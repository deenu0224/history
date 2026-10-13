import { TILE } from './types';
import { isSolid } from './grid';

type SolidGrid = readonly (readonly boolean[])[];

export interface Box {
  /** 발 위치(px) */
  x: number;
  y: number;
  halfW: number;
  /** 발에서 위로의 높이 */
  h: number;
}

function overlapsSolid(g: SolidGrid, x: number, y: number, halfW: number, h: number): boolean {
  const x0 = Math.floor((x - halfW) / TILE);
  const x1 = Math.floor((x + halfW - 0.001) / TILE);
  const y0 = Math.floor((y - h) / TILE);
  const y1 = Math.floor((y - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(g, tx, ty)) return true;
  return false;
}

/** 축 분리 이동 + 충돌. 벽에 닿으면 미끄러진다. */
export function moveBox(g: SolidGrid, b: Box, dx: number, dy: number): { x: number; y: number; hitX: boolean; hitY: boolean } {
  let { x, y } = b;
  let hitX = false;
  let hitY = false;
  if (dx !== 0) {
    if (!overlapsSolid(g, x + dx, y, b.halfW, b.h)) x += dx;
    else {
      hitX = true;
      // 경계까지 붙이기
      const step = Math.sign(dx);
      while (!overlapsSolid(g, x + step * 0.5, y, b.halfW, b.h) && Math.abs(dx) > 0.5) {
        x += step * 0.5;
        dx -= step * 0.5;
      }
    }
  }
  if (dy !== 0) {
    if (!overlapsSolid(g, x, y + dy, b.halfW, b.h)) y += dy;
    else {
      hitY = true;
      const step = Math.sign(dy);
      while (!overlapsSolid(g, x, y + step * 0.5, b.halfW, b.h) && Math.abs(dy) > 0.5) {
        y += step * 0.5;
        dy -= step * 0.5;
      }
    }
  }
  return { x, y, hitX, hitY };
}
