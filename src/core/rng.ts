/**
 * 결정적 난수(mulberry32). 상태는 숫자 하나라 저장 슬롯에 그대로 넣는다(메신저 타이밍 재현용).
 */
export function nextRandom(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** 가변 래퍼: 한 계산 안에서 여러 번 뽑을 때 */
export class Rng {
  constructor(public state: number) {}
  next(): number {
    const [v, s] = nextRandom(this.state);
    this.state = s;
    return v;
  }
  /** [min, max] 정수가 아니라 실수 구간 */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h | 0;
}
