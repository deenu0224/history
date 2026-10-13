/** 캡처용 순수 계산. */
import type { HitTarget } from './hit';
import { MIN_HIT_HALF } from './hit';

/** 판정 상자(최소 손가락 크기로 부풀림) 중 화면(0..w, 0..h CSS px) 안에 있는 비율 0..1 */
export function visibleFraction(t: HitTarget, w: number, h: number, minHalf = MIN_HIT_HALF): number {
  const hw = Math.max(t.halfW, minHalf);
  const hh = Math.max(t.halfH, minHalf);
  const ix = Math.max(0, Math.min(t.cx + hw, w) - Math.max(t.cx - hw, 0));
  const iy = Math.max(0, Math.min(t.cy + hh, h) - Math.max(t.cy - hh, 0));
  return (ix * iy) / (4 * hw * hh);
}

/** 판정 상자의 중심이 화면 안에 있는가(찍기용: 인물이 화면 가장자리에 걸쳐도 "보인다"고 친다) */
export const centerVisible = (t: HitTarget, w: number, h: number): boolean => t.cx >= 0 && t.cx <= w && t.cy >= 0 && t.cy <= h;

export const mostlyVisible = (t: HitTarget, w: number, h: number): boolean => visibleFraction(t, w, h) >= 0.5;

export interface Span {
  from: number;
  to: number;
}
/** minute 가 훼손 구간 [from,to) 안인가 */
export const inDegraded = (minute: number, spans?: readonly Span[]): boolean =>
  !!spans && spans.some((s) => minute >= s.from && minute < s.to);
