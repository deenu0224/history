/** 기록 화면: 글 카드 한 장(꼬리표 · 제목 · 메타 · 이어진 기록 칩 · 본문). 관측은 ObservePages 가 쪽을 넘긴다.
 *  칩은 본문 위에 둬서 첫 화면에서 바로 보인다(390×844). 열면 그 기록의 단서가 주머니에 들어간다. */
import { selectNode, type NodeView } from '@/store/v6/store';
import { D, KIND_TAG, useAutoCollect, useV6 } from './store';
import { LinkChips } from './LinkChips';
import { ObservePages } from './ObservePages';
import { Passage } from './Passage';

export function CardHead({ node, gain, sealed }: { node: NodeView; gain: { n: number; key: number } | null; sealed: boolean }) {
  const s = useV6((st) => st.s);
  const title = node.goalTarget && s.restored ? '돌아온 그날 실록' : node.title;
  return (
    <header className="v6-head">
      <div className="v6-tags">
        <span className="v6-tag">{KIND_TAG[node.kind] ?? '기록'}</span>
        {sealed ? (
          <span className="v6-seal" data-testid="seal">
            고정됨
          </span>
        ) : null}
      </div>
      <h2 className="v6-title">{title}</h2>
      <div className="v6-meta">
        <span className="who">{s.restored && node.goalTarget ? '손상 0건 · 고정률 100%' : (node.header?.text ?? '')}</span>
        {node.clues.total > 0 ? (
          <span className="cnt" data-testid="clue-count" data-got={node.clues.got} data-total={node.clues.total}>
            {gain ? (
              <em key={gain.key} className="gain" data-testid="clue-gain" role="status">
                +{gain.n} 단서
              </em>
            ) : null}
            단서 {node.clues.got}/{node.clues.total}
          </span>
        ) : null}
      </div>
    </header>
  );
}

export function RecordView() {
  const s = useV6((st) => st.s);
  const ui = useV6((st) => st.ui);
  const id = s.nodeStack[s.nodeStack.length - 1]!;
  const node = D.nodes[id];
  const furthest = Math.min(s.pages[id] ?? 0, (node?.pages.length ?? 1) - 1);
  const gain = useAutoCollect(id, furthest);
  const view = selectNode(s, D, ui.viewPage[id]);
  if (!view) return null;
  if (view.kind === 'observation') return <ObservePages key={id} node={view} gain={gain} />;
  return (
    <article className="v6-card" data-testid="record" data-node={view.id} key={view.id}>
      <CardHead node={view} gain={gain} sealed={s.fixed && view.goalTarget} />
      <LinkChips links={view.links} />
      <Passage blocks={view.blocks} found={view.foundLines} goalTarget={view.goalTarget} />
    </article>
  );
}
