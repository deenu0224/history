/** 시드 기반 난수(mulberry32). 같은 시드는 항상 같은 악보를 낸다. */
export interface Rng {
  next(): number;
  int(n: number): number;
  range(lo: number, hi: number): number;
  chance(p: number): boolean;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(items: readonly (readonly [T, number])[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (n) => Math.floor(next() * n),
    range: (lo, hi) => lo + next() * (hi - lo),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    weighted(items) {
      let total = 0;
      for (const [, w] of items) total += w;
      let r = next() * total;
      for (const [v, w] of items) {
        r -= w;
        if (r <= 0) return v;
      }
      return items[items.length - 1][0];
    },
  };
  return rng;
}

/** 문자열 → 32비트 시드(FNV-1a) */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
