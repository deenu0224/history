import { ambientTint, darkness, type RGB } from './clock';

export interface ViewerTint {
  color: RGB;
  /** 0(대낮)~1(한밤): 램프·창 점등 세기 */
  dark: number;
}

/** 관측 시각(분) → 곱셈 색조. 관측 구간(08~19시)에서 너무 어두워 읽기 힘들지 않도록 아래를 받친다. */
export function viewerTint(minute: number): ViewerTint {
  const c = ambientTint(minute);
  const floor = 0.5;
  const color: RGB = [Math.max(floor, c[0]), Math.max(floor, c[1]), Math.max(floor, c[2])];
  return { color, dark: darkness(color) };
}
