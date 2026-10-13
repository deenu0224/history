/** 크로스페이드 수학. 등전력(equal-power) 곡선으로 음량 꺼짐 없이 교차한다. */
export const FADE_MIN = 0.05;
export const FADE_DEFAULT = 2.5;

/** 사용자가 준 페이드 시간을 2~3초 근처의 안전한 범위로 맞춘다(명시적 0 은 즉시 전환 허용). */
export function clampFade(sec: number | undefined, fallback = FADE_DEFAULT): number {
  if (sec === undefined || !Number.isFinite(sec)) return fallback;
  return Math.min(8, Math.max(0, sec));
}

/** n 개 표본의 등전력 곡선. dir 'in' 은 0→1, 'out' 은 1→0. */
export function equalPowerCurve(n: number, dir: 'in' | 'out'): Float32Array {
  const c = new Float32Array(Math.max(2, n));
  for (let i = 0; i < c.length; i++) {
    const x = i / (c.length - 1);
    c[i] = dir === 'in' ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
  }
  return c;
}

/** 크로스페이드 한가운데(x=0.5)에서 두 곡선의 전력 합은 1 이다. */
export const crossfadePowerAt = (x: number): number => Math.sin((x * Math.PI) / 2) ** 2 + Math.cos((x * Math.PI) / 2) ** 2;

export interface FadePlan {
  /** 새 트랙 시작 시각 */
  inStart: number;
  /** 옛 트랙 페이드 아웃 시작 시각(=inStart) */
  outStart: number;
  /** 페이드 길이 */
  dur: number;
  /** 옛 트랙을 완전히 정리해도 되는 시각(리버브 꼬리 포함) */
  disposeAt: number;
}

export function planCrossfade(now: number, fadeSec: number, tail = 3): FadePlan {
  const dur = clampFade(fadeSec);
  return { inStart: now, outStart: now, dur, disposeAt: now + dur + tail };
}
