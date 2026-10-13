import { useMemo, useState } from 'react';
import { evidenceView, factText } from '@/core/content';
import { entryView, stageOf } from '@/core/collection';
import { useGameStore } from '@/store/gameStore';
import { Chip, Empty } from '../components/kit';
import { CONTENT, IDX } from '../lib/content';
import { buildGraph, type GNode } from '../lib/graph';
import { STRENGTH_LABEL, timeText } from '../lib/format';
import { useLayout } from '../hooks';

const COL_X = { evidence: 0, entry: 1, deduction: 2 } as const;
const COL_TITLE = { evidence: '증거', entry: '인물 · 사건 · 유물', deduction: '추리' } as const;
const NW = 150;
const NH = 44;
const GAPY = 14;
const GAPX = 62;

export function GraphView() {
  const layout = useLayout();
  const evidence = useGameStore((s) => s.evidence);
  const collection = useGameStore((s) => s.collection);
  const solved = useGameStore((s) => s.solved);
  const notebook = useGameStore((s) => s.notebook);
  const [sel, setSel] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => buildGraph(CONTENT, { evidence, collection, solved, notebook }), [evidence, collection, solved, notebook]);

  if (nodes.length === 0) return <Empty>연결할 증거가 아직 없다. 단서를 모으면 이곳에 관계가 그려진다.</Empty>;

  const cols: Record<GNode['kind'], GNode[]> = { evidence: [], entry: [], deduction: [] };
  nodes.forEach((n) => cols[n.kind].push(n));
  const rows = Math.max(...Object.values(cols).map((c) => c.length));
  const pos: Record<string, { x: number; y: number }> = {};
  for (const kind of Object.keys(cols) as GNode['kind'][])
    cols[kind].forEach((n, i) => (pos[n.id] = { x: COL_X[kind] * (NW + GAPX), y: 28 + i * (NH + GAPY) }));
  const W = 3 * NW + 2 * GAPX;
  const H = 28 + rows * (NH + GAPY);
  const selected = sel ? nodes.find((n) => n.id === sel) : null;
  const linked = new Set<string>();
  if (sel) for (const e of edges) { if (e.a === sel) linked.add(e.b); if (e.b === sel) linked.add(e.a); }

  const list = layout === 'portrait';
  return (
    <div className="graph">
      {list ? (
        <div className="graph-list">
          {(['evidence', 'entry', 'deduction'] as const).map((k) => (
            <section key={k}>
              <h4>{COL_TITLE[k]}</h4>
              {cols[k].map((n) => (
                <button key={n.id} className={`gnode-btn gk-${k} ${sel === n.id ? 'on' : ''} ${sel && linked.has(n.id) ? 'linked' : ''}`} onClick={() => setSel(sel === n.id ? null : n.id)}>
                  <b>{n.label}</b>
                  <small>{edges.filter((e) => e.a === n.id || e.b === n.id).length}개 연결</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="증거 관계도">
          {(['evidence', 'entry', 'deduction'] as const).map((k) => (
            <text key={k} className="gcol" x={COL_X[k] * (NW + GAPX) + NW / 2} y={14} textAnchor="middle">
              {COL_TITLE[k]}
            </text>
          ))}
          {edges.map((e, i) => {
            const a = pos[e.a]!;
            const b = pos[e.b]!;
            const [l, r] = a.x <= b.x ? [a, b] : [b, a];
            const x1 = l.x + NW;
            const y1 = l.y + NH / 2;
            const x2 = r.x;
            const y2 = r.y + NH / 2;
            const hot = sel && (e.a === sel || e.b === sel);
            return <path key={i} className={`gedge ${hot ? 'hot' : ''} ${sel && !hot ? 'dim' : ''}`} d={`M${x1},${y1} C${x1 + 36},${y1} ${x2 - 36},${y2} ${x2},${y2}`} />;
          })}
          {nodes.map((n) => {
            const p = pos[n.id]!;
            return (
              <g key={n.id} className={`gnode gk-${n.kind} ${sel === n.id ? 'on' : ''} ${sel && sel !== n.id && !linked.has(n.id) ? 'dim' : ''}`} transform={`translate(${p.x},${p.y})`} onClick={() => setSel(sel === n.id ? null : n.id)} tabIndex={0} role="button" aria-label={n.label} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(sel === n.id ? null : n.id)}>
                <rect width={NW} height={NH} rx={3} />
                <text x={NW / 2} y={n.sub ? 19 : 26} textAnchor="middle">{clip(n.label, 11)}</text>
                {n.sub && <text className="gsub" x={NW / 2} y={34} textAnchor="middle">{clip(n.sub, 14)}</text>}
              </g>
            );
          })}
        </svg>
      )}
      <aside className="graph-detail">{selected ? <NodeDetail node={selected} linkedNodes={nodes.filter((n) => linked.has(n.id))} /> : <p className="dim">노드를 눌러 연결된 기록을 확인한다. 이미 알아낸 연결만 표시된다.</p>}</aside>
    </div>
  );
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function NodeDetail({ node, linkedNodes }: { node: GNode; linkedNodes: GNode[] }) {
  const level = useGameStore((s) => s.evidence[node.ref]);
  const stage = useGameStore((s) => stageOf(s.collection, node.ref));
  const solved = useGameStore((s) => s.solved[node.ref]);
  return (
    <div className="gdetail">
      <h4>{node.label}</h4>
      {node.kind === 'evidence' && level !== undefined && IDX.evidence[node.ref] && (() => {
        const v = evidenceView(IDX.evidence[node.ref]!, level);
        return (
          <>
            <p>{v.text}</p>
            <div className="chips">
              {v.facts.map((f, i) => <Chip key={i}>{factText(f)}</Chip>)}
              {v.time && <Chip tone="accent">{timeText(v.time)} · {STRENGTH_LABEL[v.time.strength]}</Chip>}
            </div>
          </>
        );
      })()}
      {node.kind === 'entry' && IDX.collection[node.ref] && (
        <dl className="fields">
          {entryView(IDX.collection[node.ref]!, stage).fields.map((f) => (
            <div key={f.key} className="field"><dt>{f.label}</dt><dd>{f.value}</dd></div>
          ))}
        </dl>
      )}
      {node.kind === 'deduction' && IDX.deductions[node.ref] && (
        <>
          <p>{IDX.deductions[node.ref]!.prompt}</p>
          <Chip tone="good">{solved?.best === 'confirmed' ? '확정' : '부분 확정'}</Chip>
        </>
      )}
      {linkedNodes.length > 0 && (
        <p className="gdetail-links">
          연결: {linkedNodes.map((n) => n.label).join(' · ')}
        </p>
      )}
    </div>
  );
}
