/** 관측: 그 사람의 눈으로 쓴 글 3~5쪽. 쪽 한 장 = 카드 한 장(가로 스냅, 다음 쪽 모서리가 비친다) + 점. 아직 안 넘긴 쪽은 보이지 않는다. */
import { useEffect, useRef } from 'react';
import { selectNode, type NodeView } from '@/store/v6/store';
import { D, useV6 } from './store';
import { CardHead } from './RecordView';
import { LinkChips } from './LinkChips';
import { Passage } from './Passage';
import { IChevRight } from './icons';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ObservePages({ node, gain }: { node: NodeView; gain: { n: number; key: number } | null }) {
  const s = useV6((st) => st.s);
  const ui = useV6((st) => st.ui);
  const track = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = node.id;
  const furthest = node.furthest;
  const cur = Math.min(ui.viewPage[id] ?? furthest, furthest);
  const hasNext = furthest + 1 < node.pageCount;
  const pages = Array.from({ length: furthest + 1 }, (_, i) => selectNode(s, D, i)!);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - 16, behavior: reduced() ? 'auto' : 'smooth' });
  };
  // 쪽이 새로 열리면 그 쪽으로 간다
  const lastFurthest = useRef(furthest);
  useEffect(() => {
    if (furthest !== lastFurthest.current) go(furthest);
    lastFurthest.current = furthest;
  }, [furthest]);
  useEffect(() => () => clearTimeout(settle.current), []);

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = track.current;
      const first = el?.children[0] as HTMLElement | undefined;
      if (!el || !first) return;
      const step = first.getBoundingClientRect().width + 12;
      const idx = Math.max(0, Math.min(node.pageCount - 1, Math.round(el.scrollLeft / step)));
      if (idx !== (useV6.getState().ui.viewPage[id] ?? furthest) || idx > furthest) useV6.getState().setPage(id, idx);
    }, 90);
  };
  const open = (i: number) => {
    if (i > furthest) useV6.getState().setPage(id, i);
    else go(i);
  };

  return (
    <article className="v6-obs" data-testid="record" data-node={id} data-page={cur} data-furthest={furthest}>
      <CardHead node={node} gain={gain} sealed={false} />
      <div className="v6-track" ref={track} onScroll={onScroll} data-testid="pages">
        {pages.map((p, i) => (
          <section key={i} className="v6-page" data-testid={`page-${i + 1}`} aria-label={`${i + 1}쪽`}>
            <div className="v6-pageno">
              {i + 1} / {node.pageCount}쪽
            </div>
            <Passage blocks={p.blocks} found={[]} goalTarget={false} />
            {i === furthest && hasNext ? (
              <button className="v6-next" data-testid="next-page" onClick={() => open(furthest + 1)}>
                다음 쪽 <IChevRight size={18} />
              </button>
            ) : null}
          </section>
        ))}
        {hasNext ? (
          <section className="v6-page stub" aria-hidden="true">
            <div className="v6-pageno">
              {furthest + 2} / {node.pageCount}쪽
            </div>
            <p className="v6-text muted">밀거나 「다음 쪽」을 누르면 넘어간다.</p>
          </section>
        ) : null}
      </div>
      <div className="v6-dots" role="tablist" aria-label="쪽">
        {Array.from({ length: node.pageCount }, (_, i) => (
          <button key={i} className={`v6-dot${i === cur ? ' on' : ''}${i > furthest ? ' far' : ''}`} data-testid={`dot-${i + 1}`} aria-label={`${i + 1}쪽`} aria-selected={i === cur} onClick={() => open(i)}>
            <i />
          </button>
        ))}
      </div>
      <LinkChips links={node.links} />
    </article>
  );
}
