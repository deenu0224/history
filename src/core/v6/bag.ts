/** 단서 주머니(DESIGN_V6 §2.3): 같은 문장 합치기, 낱말 칩, 묶음 세기, 도달 가능한 주머니 상태 열거 */
import type { Card, Clue, Conclusion, Id } from './types';

export interface BagCard {
  id: Id;
  card: Card;
  /** 나온 곳(같은 문장을 두 곳에서 얻으면 카드는 하나, 나온 곳 둘) */
  origins: Id[];
}

/** 주머니 카드: 모은 단서 + 얻은 결론(결론은 뒤에) */
export function bagCards(clues: Readonly<Record<Id, Clue>>, conclusions: Readonly<Record<Id, Conclusion>>, collected: readonly Id[], found: readonly Id[], origins: Readonly<Record<Id, Id[]>> = {}): BagCard[] {
  const seen = new Set<string>();
  const out: BagCard[] = [];
  for (const id of collected) {
    const c = clues[id];
    if (!c) continue;
    // 같은 문장을 두 곳에서 얻으면 카드는 하나(dupOf)
    const dup = out.find((b) => b.id === c.dupOf || (clues[b.id]?.dupOf === id));
    if (dup) {
      dup.origins = [...new Set([...dup.origins, ...(origins[id] ?? [])])];
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, card: c, origins: [...(origins[id] ?? [])] });
  }
  for (const id of found) {
    const c = conclusions[id];
    if (c) out.push({ id, card: c, origins: [] });
  }
  return out;
}

/** 낱말 칩: 둘 이상의 카드가 가진 낱말만(미끼도 낱말을 가진다) */
export function sharedChips(cards: readonly BagCard[]): string[] {
  const count = new Map<string, number>();
  for (const b of cards) for (const w of new Set((b.card as Clue).chips ?? [])) count.set(w, (count.get(w) ?? 0) + 1);
  return [...count].filter(([, n]) => n >= 2).map(([w]) => w);
}

export const withChip = (cards: readonly BagCard[], chip: string): BagCard[] => cards.filter((b) => ((b.card as Clue).chips ?? []).includes(chip));

/** C(n, k) 묶음 */
export function combinations<T>(xs: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, cur: T[]) => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let i = start; i < xs.length; i++) {
      cur.push(xs[i]!);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}

export const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
