import { useMemo, useState } from 'react';
import { UI_KEYS } from '@/game/art';
import { NOTEBOOK_SECTIONS, SECTION_LABELS } from '@/core/notebook';
import type { Id, NotebookSection } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { EvidenceCard } from '../components/EvidenceCard';
import { Empty, Modal, PixelIcon, Tabs } from '../components/kit';
import { IDX } from '../lib/content';

type Tab = 'evidence' | NotebookSection;
const PROV: Record<string, string> = { reconstructed: '재구성', fictional: '가상' };

export function NotebookScreen() {
  const close = useGameStore((s) => s.closeModal);
  const modalId = useGameStore((s) => s.ui.modal?.id);
  const evidence = useGameStore((s) => s.evidence);
  const notebook = useGameStore((s) => s.notebook);
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const addHypothesis = useGameStore((s) => s.addHypothesis);
  const resolveQuestion = useGameStore((s) => s.resolveQuestion);
  const [tab, setTab] = useState<Tab>((modalId as Tab) && (modalId === 'evidence' || NOTEBOOK_SECTIONS.includes(modalId as NotebookSection)) ? (modalId as Tab) : 'evidence');
  const [text, setText] = useState('');
  const [refs, setRefs] = useState<Id[]>([]);

  const owned = useMemo(() => Object.entries(evidence).filter(([id]) => IDX.evidence[id]), [evidence]);
  const visible = (sec: NotebookSection) => notebook[sec].filter((n) => !n.id.startsWith('ui_db:'));
  const tabs = [
    { id: 'evidence' as Tab, label: '증거 카드', badge: owned.length },
    ...NOTEBOOK_SECTIONS.map((s) => ({ id: s as Tab, label: SECTION_LABELS[s], badge: visible(s).length })),
  ];

  const add = () => {
    const t = text.trim();
    if (!t) return;
    addHypothesis(t, refs.length ? refs : undefined);
    setText('');
    setRefs([]);
  };

  return (
    <Modal title="조사 노트" icon={UI_KEYS.iconNotebook} onClose={close}>
      <Tabs tabs={tabs} value={tab} onChange={(v) => setTab(v as Tab)} className="tabs-scroll" />
      <div className="scroll">
        {tab === 'evidence' ? (
          owned.length === 0 ? (
            <Empty>아직 확보한 증거가 없다. 주변을 살펴보자.</Empty>
          ) : (
            <div className="grid-cards">
              {owned.map(([id, level]) => (
                <EvidenceCard key={id} ev={IDX.evidence[id]!} level={level} />
              ))}
            </div>
          )
        ) : (
          <>
            {visible(tab).length === 0 && <Empty>{tab === 'hypothesis' ? '세운 가설이 없다. 아래에 직접 적어 보자.' : '기록이 없다.'}</Empty>}
            <ul className="notes">
              {visible(tab).map((n) => (
                <li key={n.id} className={n.resolved ? 'resolved' : ''}>
                  <span className="note-text">{n.text}</span>
                  {showProv && n.provenance && PROV[n.provenance] && <span className="prov-mark">{PROV[n.provenance]}</span>}
                  {n.refIds && n.refIds.length > 0 && (
                    <span className="note-refs">
                      {n.refIds.map((r) => IDX.evidence[r] && <i key={r}>{IDX.evidence[r]!.levels[Math.min(evidence[r] ?? 0, IDX.evidence[r]!.levels.length - 1)]!.label}</i>)}
                    </span>
                  )}
                  {tab === 'question' && !n.resolved && (
                    <button className="btn btn-small" onClick={() => resolveQuestion(n.id)}>
                      해소됨으로 표시
                    </button>
                  )}
                  {n.resolved && <span className="note-done">해소</span>}
                </li>
              ))}
            </ul>
            {tab === 'hypothesis' && (
              <form
                className="hyp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  add();
                }}
              >
                <label htmlFor="hyp">새 가설</label>
                <textarea id="hyp" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="증거로 뒷받침되는지 확인되지 않은 생각을 적어 둔다." />
                {owned.length > 0 && (
                  <div className="hyp-refs">
                    <span>근거로 묶기</span>
                    {owned.map(([id, level]) => {
                      const ev = IDX.evidence[id]!;
                      const on = refs.includes(id);
                      return (
                        <button type="button" key={id} className={`pill ${on ? 'on' : ''}`} onClick={() => setRefs(on ? refs.filter((r) => r !== id) : [...refs, id])}>
                          {ev.levels[Math.min(level, ev.levels.length - 1)]!.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button className="btn btn-primary" type="submit" disabled={!text.trim()}>
                  가설 기록
                </button>
              </form>
            )}
          </>
        )}
      </div>
      <footer className="modal-foot">
        <PixelIcon sprite={UI_KEYS.iconQuestion} size={16} />
        <span>미해결 의문 {notebook.question.filter((q) => !q.resolved).length}건</span>
      </footer>
    </Modal>
  );
}
