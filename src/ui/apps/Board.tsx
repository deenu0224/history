/** 증거 보드: 문제별 탭(인과 사슬 · 누구인가 · 언제인가 · 무슨 일인가) + 관계도 + 연대표. 잠긴 문제는 자물쇠만(요건 문구 없음). */
import { useState } from 'react';
import type { Deduction, EventDeduction, PersonDeduction, YearDeduction } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { Empty, PixelIcon } from '../components/kit';
import { UI_KEYS } from '@/game/art';
import { CONTENT } from '../lib/content';
import { VERDICT_LABEL } from '../lib/format';
import { EventPanel, PersonPanel } from '../screens/FactPanels';
import { GraphView } from '../screens/Graph';
import { TimelineView } from '../screens/Timeline';
import { ChainPanel, chainDeductions } from './Chain';
import { Combine } from './Combine';
import { YearDragPanel } from './YearDrag';

type Tab = 'combine' | 'chain' | 'person' | 'year' | 'event' | 'graph' | 'timeline';

export function Board() {
  const flags = useGameStore((s) => s.flags);
  const solved = useGameStore((s) => s.solved);
  const [tab, setTab] = useState<Tab>('person');
  const of = <K extends Deduction['kind']>(k: K) => CONTENT.deductions.filter((d): d is Extract<Deduction, { kind: K }> => d.kind === k);
  const chains = chainDeductions();
  const locked = (list: Deduction[]) => list.length > 0 && list.every((d) => d.requires && !flags[d.requires]);
  const mark = (list: Deduction[]) => {
    const rec = list.map((d) => solved[d.id]?.best);
    return rec.includes('confirmed') ? '✓' : rec.includes('partial') ? '◐' : '';
  };

  const tabs: { id: Tab; label: string; list?: Deduction[]; coach?: string; hide?: boolean }[] = [
    { id: 'combine', label: '겹치기', hide: CONTENT.links.length === 0 },
    { id: 'chain', label: '인과', list: chains, hide: chains.length === 0 },
    { id: 'person', label: '누구인가', list: of('person'), coach: 'board.deduction.person' },
    { id: 'year', label: '언제인가', list: of('year'), coach: 'board.deduction.year' },
    { id: 'event', label: '무슨 일인가', list: of('event'), coach: 'board.deduction.event' },
    { id: 'graph', label: '관계도' },
    { id: 'timeline', label: '연대표' },
  ];

  return (
    <div className="board" data-testid="app-board">
      <div className="tabs tabs-scroll" role="tablist">
        {tabs
          .filter((t) => !t.hide)
          .map((t) => {
            const lk = t.list ? locked(t.list) : false;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tab ${tab === t.id ? 'on' : ''} ${lk ? 'locked' : ''}`}
                data-testid={`board-tab-${t.id}`}
                data-coach={t.coach}
                onClick={() => setTab(t.id)}
              >
                {lk && <PixelIcon sprite={UI_KEYS.iconLock} size={16} />}
                {t.label}
                {t.list && <em className="tab-mark">{mark(t.list)}</em>}
              </button>
            );
          })}
      </div>
      <div className="board-body scroll">
        {tab === 'combine' && <Combine />}
        {tab === 'chain' && <ChainPanel />}
        {tab === 'person' && <Chooser<PersonDeduction> kind="person" list={of('person')} render={(d) => <PersonPanel key={d.id} d={d} />} />}
        {tab === 'year' && <Chooser<YearDeduction> kind="year" list={of('year')} render={(d) => <YearDragPanel key={d.id} d={d} onGoTimeline={() => setTab('timeline')} />} />}
        {tab === 'event' && <Chooser<EventDeduction> kind="event" list={of('event')} render={(d) => <EventPanel key={d.id} d={d} />} />}
        {tab === 'graph' && <GraphView />}
        {tab === 'timeline' && <TimelineView />}
      </div>
    </div>
  );
}

function Chooser<T extends Deduction>({ list, render }: { kind: string; list: T[]; render(d: T): React.ReactNode }) {
  const solved = useGameStore((s) => s.solved);
  const flags = useGameStore((s) => s.flags);
  const open = list.filter((d) => !d.requires || flags[d.requires]);
  const [sel, setSel] = useState(open[0]?.id);
  const cur = open.find((d) => d.id === sel) ?? open[0];
  if (!cur)
    return (
      <div className="locked-panel" data-testid="board-locked">
        <PixelIcon sprite={UI_KEYS.iconLock} size={48} />
        <p>아직 풀 수 없는 문제입니다.</p>
      </div>
    );
  return (
    <>
      {open.length > 1 && (
        <div className="chooser" role="tablist">
          {open.map((d) => (
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

export { Empty };
