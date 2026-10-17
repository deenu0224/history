/**
 * 컷 넘기기 판정(순수). 멀리 밀었거나(슬라이드 폭의 30%) 빠르게 튕겼으면(손을 떼기 직전 속도) 한 장 넘긴다.
 * 속도는 누른 때부터의 평균이 아니라 최근 FLICK_WINDOW_MS 안의 움직임으로 잰다 — 잠깐 대고 있다가 튕겨도 넘어간다(QA_UX_R3).
 */
export interface SwipeSample {
  x: number;
  t: number;
}

export const FLICK_WINDOW_MS = 100;
/** 튕김으로 치는 속도(px/ms) */
export const FLICK_SPEED = 0.35;
/** 튕김으로 치는 최소 이동(px) — 떨림을 넘기기로 읽지 않게 */
export const FLICK_MIN_DX = 16;
export const FAR_RATIO = 0.3;

/** 최근 창 안의 수평 속도(px/ms, 오른쪽 +) */
export function flickVelocity(samples: readonly SwipeSample[], windowMs = FLICK_WINDOW_MS): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1]!;
  // 창 안의 가장 오래된 표본(창 안에 없으면 바로 앞 표본)
  let first = samples[samples.length - 2]!;
  for (let i = samples.length - 3; i >= 0; i--) {
    if (last.t - samples[i]!.t > windowMs) break;
    first = samples[i]!;
  }
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

/** -1 = 앞 컷, +1 = 다음 컷, 0 = 제자리. dx = 누른 곳부터 뗀 곳까지(오른쪽 +) */
export function swipeStep(dx: number, velocity: number, slideW: number): -1 | 0 | 1 {
  const dir = dx < 0 ? 1 : -1;
  if (slideW > 0 && Math.abs(dx) > slideW * FAR_RATIO) return dir;
  if (Math.abs(dx) >= FLICK_MIN_DX && Math.abs(velocity) >= FLICK_SPEED && Math.sign(velocity) === Math.sign(dx)) return dir;
  return 0;
}
