/** 핫스팟 히트 테스트(순수). 좌표는 CSS px(손가락 기준이므로 기기 해상도와 무관). */
export interface HitTarget {
  id: string;
  /** 대상의 시각적 중심(화면 CSS px) */
  cx: number;
  cy: number;
  /** 시각적 절반 크기(CSS px) */
  halfW: number;
  halfH: number;
  /** 클수록 동률에서 우선(인물 > 사물) */
  priority?: number;
}

/** 손가락 판정 최소 지름 44 CSS px → 반 22 */
export const MIN_HIT_HALF = 22;

/** 각 대상의 판정 상자를 최소 크기로 부풀린 뒤, 점이 들어간 것 중 정규화 거리가 가장 가까운 것. */
export function pickHotspot(px: number, py: number, targets: readonly HitTarget[], minHalf = MIN_HIT_HALF): string | null {
  let best: string | null = null;
  let bestScore = Infinity;
  for (const t of targets) {
    const hw = Math.max(t.halfW, minHalf);
    const hh = Math.max(t.halfH, minHalf);
    const dx = Math.abs(px - t.cx);
    const dy = Math.abs(py - t.cy);
    if (dx > hw || dy > hh) continue;
    const score = Math.hypot(dx / hw, dy / hh) - (t.priority ?? 0) * 0.2;
    if (score < bestScore) {
      bestScore = score;
      best = t.id;
    }
  }
  return best;
}
