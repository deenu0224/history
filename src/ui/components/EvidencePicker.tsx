import { useMemo } from 'react';
import { evidenceView } from '@/core/content';
import type { Id } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { IDX } from '../lib/content';
import { EvidenceCard } from './EvidenceCard';
import { Empty } from './kit';

export function EvidencePicker({
  selected,
  onToggle,
  sort = 'time',
  hint,
}: {
  selected: Id[];
  onToggle(id: Id): void;
  sort?: 'time' | 'none';
  hint?: string;
}) {
  const owned = useGameStore((s) => s.evidence);
  const list = useMemo(() => {
    const items = Object.entries(owned).filter(([id]) => IDX.evidence[id]);
    if (sort === 'none') return items;
    const hasTime = ([id, lv]: [string, number]) => (evidenceView(IDX.evidence[id]!, lv).time ? 0 : 1);
    return [...items].sort((a, b) => hasTime(a) - hasTime(b));
  }, [owned, sort]);
  if (list.length === 0) return <Empty>인용할 수 있는 증거가 없다. 먼저 단서를 모으자.</Empty>;
  return (
    <div className="picker">
      <div className="picker-head">
        <h4>근거 증거 선택</h4>
        <span>{selected.length}개 인용</span>
      </div>
      {hint && <p className="dim picker-hint">{hint}</p>}
      <div className="picker-list">
        {list.map(([id, lv]) => (
          <EvidenceCard key={id} ev={IDX.evidence[id]!} level={lv} selected={selected.includes(id)} onClick={() => onToggle(id)} />
        ))}
      </div>
    </div>
  );
}
