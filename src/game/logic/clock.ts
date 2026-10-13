/** 게임 시계와 시각별 색조(순수). */
export const MINUTES_PER_DAY = 1440;
export type RGB = [number, number, number];

export class GameClock {
  /** 실수 분(0..1440) */
  minute: number;
  constructor(
    start = 540,
    /** 실시간 1초당 게임 분 */
    public minutesPerSecond = 2,
  ) {
    this.minute = start;
  }
  tick(dtSeconds: number): void {
    this.minute = (this.minute + dtSeconds * this.minutesPerSecond) % MINUTES_PER_DAY;
  }
  get whole(): number {
    return Math.floor(this.minute) % MINUTES_PER_DAY;
  }
}

const KEYS: [number, RGB][] = [
  [0, [0.5, 0.56, 0.74]],
  [300, [0.5, 0.56, 0.74]],
  [360, [0.86, 0.76, 0.76]],
  [450, [1, 0.98, 0.94]],
  [1020, [1, 0.97, 0.9]],
  [1110, [0.96, 0.74, 0.62]],
  [1200, [0.62, 0.58, 0.72]],
  [1260, [0.5, 0.56, 0.74]],
  [1440, [0.5, 0.56, 0.74]],
];

/** 하루 중 minute 의 곱셈 색조(과거 씬). */
export function ambientTint(minute: number): RGB {
  const m = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, c1] = KEYS[i];
    if (m <= t1) {
      const [t0, c0] = KEYS[i - 1];
      const f = t1 === t0 ? 0 : (m - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return KEYS[KEYS.length - 1][1];
}

export const luminance = (c: RGB) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
/** 0(대낮)..1(한밤): 램프/창 점등 세기. */
export function darkness(c: RGB): number {
  return Math.min(1, Math.max(0, (1 - luminance(c)) / 0.45));
}

export function rgbToHex(c: RGB): number {
  const f = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return (f(c[0]) << 16) | (f(c[1]) << 8) | f(c[2]);
}

/** 현대 씬 고정 색조(차가운 어둠). */
export const MODERN_TINTS: Record<string, RGB> = {
  lab: [0.46, 0.54, 0.72],
  archive: [0.52, 0.6, 0.76],
  default: [0.56, 0.63, 0.78],
};
