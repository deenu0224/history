import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Empty } from '../components/kit';
import { CONTENT } from '../lib/content';
import { VERDICT_LABEL, formatYears } from '../lib/format';
import { buildTimelineItems } from '../lib/graph';
import { computeDomain, layoutLanes, makeScale, ticks } from '../lib/timeline';

const W = 1100;
const KIND_LABEL = { person: '인물', event: '사건', artifact: '유물', source: '사료', observation: '관측' } as const;

export function TimelineView() {
  const collection = useGameStore((s) => s.collection);
  const notebook = useGameStore((s) => s.notebook);
  const items = useMemo(() => buildTimelineItems(CONTENT, collection, notebook), [collection, notebook]);
  if (items.length === 0)
    return (
      <Empty>
        연대표는 아직 비어 있다. 정보를 검증한 인물·사건·사료와, 직접 풀어낸 관측 연도가 이곳에 채워진다.
      </Empty>
    );
  const domain = computeDomain(items.flatMap((i) => [i.from, i.to]), { min: 1400, max: 1500 }, 40);
  const sc = makeScale(domain, W);
  const geo = items.map((it) => {
    const x = sc.x(it.from);
    const w = Math.max(sc.x(it.to + 1) - x, 10);
    const labelW = it.label.length * 14 + 28;
    return { x, w, boxW: Math.max(w, labelW) };
  });
  const lanes = layoutLanes(geo.map((g) => ({ x: g.x, w: g.boxW })), 8);
  const laneCount = Math.max(...lanes) + 1;
  const tk = ticks(domain, 10);
  const H = laneCount * 58 + 56;
  return (
    <div className="tl-wrap">
      <div className="tl-scroll" tabIndex={0}>
        <div className="tl" style={{ width: W, height: H }}>
          <div className="tl-axis" />
          {tk.map((y) => (
            <div key={y} className="tl-tick" style={{ left: sc.x(y) }}>
              <span>{y}</span>
            </div>
          ))}
          {items.map((it, i) => {
            const g = geo[i]!;
            return (
              <div key={it.id} className={`tl-item tl-${it.kind} ${it.verdict ? `tl-${it.verdict}` : ''}`} style={{ left: g.x, top: 38 + lanes[i]! * 58, width: g.boxW }}>
                <div className="tl-bar" style={{ width: g.w }} />
                <div className="tl-name">{it.label}</div>
                <div className="tl-when">
                  {formatYears(it.from, it.to)}
                  {it.verdict ? ` · ${VERDICT_LABEL[it.verdict]}` : ` · ${KIND_LABEL[it.kind]}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="dim tl-hint">좌우로 밀어 살펴본다. 정보 검증 단계에 이른 항목과 내가 특정한 관측 연도만 표시된다.</p>
    </div>
  );
}
