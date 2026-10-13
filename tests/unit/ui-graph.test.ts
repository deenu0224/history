import { CONTENT } from '@/ui/lib/content';
import { buildGraph, buildTimelineItems } from '@/ui/lib/graph';
import { emptyNotebook } from '@/core/notebook';

describe('graph and timeline builders', () => {
  it('shows nothing before discovery', () => {
    const g = buildGraph(CONTENT, { evidence: {}, collection: {}, solved: {}, notebook: emptyNotebook() });
    expect(g.nodes).toHaveLength(0);
    expect(buildTimelineItems(CONTENT, {}, emptyNotebook())).toHaveLength(0);
  });
  it('only lists discovered entries', () => {
    const first = CONTENT.collection[0]!;
    const g = buildGraph(CONTENT, { evidence: {}, collection: { [first.id]: 1 }, solved: {}, notebook: emptyNotebook() });
    expect(g.nodes.map((n) => n.ref)).toEqual([first.id]);
  });
});
