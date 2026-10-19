/** 기록 그래프(DESIGN_V6 §2.2, §6.2): 칩의 보임·잠김, 노드 열기, 단서 나온 곳 */
import type { Block, Id, Link, RecordNode } from './types';

export interface GraphCtx {
  found: readonly Id[];
  restored: boolean;
}

export type LinkView = Link & { state: 'open' | 'locked'; lockReason?: string };

/** 보이는 칩(결론·복원 뒤에만 나오는 것은 거른다). 잠긴 칩은 까닭과 함께 */
export function visibleLinks(node: RecordNode, ctx: GraphCtx): LinkView[] {
  return node.links
    .filter((l) => (!l.showAfter || ctx.found.includes(l.showAfter)) && (!l.restoredOnly || ctx.restored))
    .map((l) => {
      const locked = l.locked && !(l.locked.opensOnRestore && ctx.restored);
      return { ...l, state: locked ? ('locked' as const) : ('open' as const), ...(locked ? { lockReason: l.locked!.reason } : {}) };
    });
}

export const nodeAvailable = (n: RecordNode, ctx: GraphCtx) => !n.restoredOnly || ctx.restored;

/** from 에서 칩으로 열 수 있는가 */
export function canFollow(nodes: Readonly<Record<Id, RecordNode>>, fromId: Id, linkId: Id, ctx: GraphCtx): { ok: true; to: Id } | { ok: false; reason: 'unknown' | 'locked' | 'hidden' } {
  const from = nodes[fromId];
  const l = from?.links.find((x) => x.id === linkId);
  if (!from || !l) return { ok: false, reason: 'unknown' };
  const v = visibleLinks(from, ctx).find((x) => x.id === linkId);
  if (!v) return { ok: false, reason: 'hidden' };
  if (v.state === 'locked') return { ok: false, reason: 'locked' };
  const to = nodes[l.to];
  if (!to) return { ok: false, reason: 'unknown' };
  if (!nodeAvailable(to, ctx)) return { ok: false, reason: 'locked' };
  return { ok: true, to: to.id };
}

/** 열어 본 노드에서 보이는 칩으로 닿을 수 있는 노드 */
export function reachable(nodes: Readonly<Record<Id, RecordNode>>, start: Id, ctx: GraphCtx): Set<Id> {
  const seen = new Set<Id>([start]);
  const q = [start];
  while (q.length) {
    const n = nodes[q.shift()!];
    if (!n) continue;
    for (const l of visibleLinks(n, ctx)) {
      if (l.state === 'locked' || seen.has(l.to) || !nodes[l.to] || !nodeAvailable(nodes[l.to]!, ctx)) continue;
      seen.add(l.to);
      q.push(l.to);
    }
  }
  return seen;
}

export interface Origin {
  node: Id;
  page: number;
}

/** 단서 id → 나온 곳(노드·쪽). 밑줄(marks)·관측 블록으로 정해진다 */
export function clueOrigins(nodes: Readonly<Record<Id, RecordNode>>): Record<Id, Origin[]> {
  const out: Record<Id, Origin[]> = {};
  const put = (clue: Id, node: Id, page: number) => ((out[clue] ??= []).some((o) => o.node === node && o.page === page) ? 0 : out[clue]!.push({ node, page }));
  for (const n of Object.values(nodes))
    n.pages.forEach((p, i) =>
      p.blocks.forEach((b: Block) => {
        if (b.kind === 'line') b.marks?.forEach((m) => put(m.clue, n.id, i));
        else if ((b.kind === 'scene' && b.clue) || b.kind === 'heard') put(b.kind === 'heard' ? b.clue : b.clue!, n.id, i);
      }),
    );
  return out;
}

/** 기록 머리 「단서 n/m」(숨은 단서 없음) */
export function clueProgress(nodes: Readonly<Record<Id, RecordNode>>, nodeId: Id, collected: readonly Id[]): { got: number; total: number } {
  const ids = Object.entries(clueOrigins(nodes))
    .filter(([, os]) => os.some((o) => o.node === nodeId))
    .map(([id]) => id);
  return { got: ids.filter((i) => collected.includes(i)).length, total: ids.length };
}
