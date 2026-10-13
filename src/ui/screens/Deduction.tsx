import { useState } from 'react';
import { UI_KEYS } from '@/game/art';
import type { Deduction, EventDeduction, PersonDeduction, YearDeduction } from '@/core/types';
import { checkCondition } from '@/core/world';
import { useGameStore } from '@/store/gameStore';
import { Empty, Modal, Tabs } from '../components/kit';
import { CONTENT } from '../lib/content';
import { VERDICT_LABEL } from '../lib/format';
import { EventPanel, PersonPanel } from './FactPanels';
import { GraphView } from './Graph';
import { TimelineView } from './Timeline';
import { YearPanel } from './YearPanel';

type Tab = 'year' | 'person' | 'event' | 'graph' | 'timeline';
const TABS: { id: Tab; label: string }[] = [
  { id: 'year', label: '연대 추론' },
  { id: 'person', label: '인물 추리' },
  { id: 'event', label: '사건 해결' },
  { id: 'graph', label: '증거 관계도' },
  { id: 'timeline', label: '연대표' },
];

function Chooser<T extends Deduction>({ list, render }: { list: T[]; render(d: T): React.ReactNode }) {
  const solved = useGameStore((s) => s.solved);
  const [sel, setSel] = useState(list[0]?.id);
  const cur = list.find((d) => d.id === sel) ?? list[0];
  if (!cur) return <Empty>아직 풀 수 있는 추리가 없다. 관측과 조사를 이어가자.</Empty>;
  return (
    <>
      {list.length > 1 && (
        <div className="chooser" role="tablist">
          {list.map((d) => (
            <button key={d.id} role="tab" aria-selected={d.id === cur.id} className={`pill ${d.id === cur.id ? 'on' : ''}`} onClick={() => setSel(d.id)}>
              {d.title}
              {solved[d.id] && <em> · {VERDICT_LABEL[solved[d.id]!.best]}</em>}
            </button>
          ))}
        </div>
      )}
      <h3 className="dtitle">
        {cur.title}
        {solved[cur.id] && <span className="dtag">{VERDICT_LABEL[solved[cur.id]!.best]}</span>}
      </h3>
      {render(cur)}
    </>
  );
}

export function DeductionScreen() {
  const close = useGameStore((s) => s.closeModal);
  const modal = useGameStore((s) => s.ui.modal);
  const flags = useGameStore((s) => s.flags);
  const initial: Tab = modal?.kind === 'evidence' ? 'graph' : TABS.some((t) => t.id === modal?.id) ? (modal!.id as Tab) : 'year';
  const [tab, setTab] = useState<Tab>(initial);
  const avail = CONTENT.deductions.filter((d) => checkCondition(flags, d.requires ? { all: [d.requires] } : undefined));
  const of = <K extends Deduction['kind']>(k: K) => avail.filter((d): d is Extract<Deduction, { kind: K }> => d.kind === k);
  const solved = useGameStore((s) => s.solved);
  const counts: Record<Tab, number | undefined> = {
    year: of('year').filter((d) => !solved[d.id] || solved[d.id]!.best !== 'confirmed').length || undefined,
    person: of('person').filter((d) => !solved[d.id]).length || undefined,
    event: of('event').filter((d) => !solved[d.id]).length || undefined,
    graph: undefined,
    timeline: undefined,
  };
  return (
    <Modal title="추론" icon={UI_KEYS.iconTimeline} onClose={close} wide className="modal-deduction">
      <Tabs tabs={TABS.map((t) => ({ ...t, badge: counts[t.id] }))} value={tab} onChange={(v) => setTab(v as Tab)} className="tabs-scroll" />
      <div className="scroll">
        {tab === 'year' && <Chooser<YearDeduction> key="y" list={of('year')} render={(d) => <YearPanel key={d.id} d={d} onGoTimeline={() => setTab('timeline')} />} />}
        {tab === 'person' && <Chooser<PersonDeduction> key="p" list={of('person')} render={(d) => <PersonPanel key={d.id} d={d} />} />}
        {tab === 'event' && <Chooser<EventDeduction> key="e" list={of('event')} render={(d) => <EventPanel key={d.id} d={d} />} />}
        {tab === 'graph' && <GraphView />}
        {tab === 'timeline' && <TimelineView />}
      </div>
    </Modal>
  );
}
