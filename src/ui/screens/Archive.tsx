import { useMemo } from 'react';
import { completion } from '@/core/collection';
import { UI_KEYS } from '@/game/art';
import { selectProgress, useGameStore } from '@/store/gameStore';
import { Modal, PixelIcon, CATEGORY_ICON } from '../components/kit';
import { CATEGORY_LABEL, CATEGORY_ORDER, CONTENT } from '../lib/content';
import { pct } from '../lib/format';

export function ArchiveScreen() {
  const close = useGameStore((s) => s.closeModal);
  const open = useGameStore((s) => s.openModal);
  const flags = useGameStore((s) => s.flags);
  const evidence = useGameStore((s) => s.evidence);
  const collection = useGameStore((s) => s.collection);
  const notebook = useGameStore((s) => s.notebook);
  const solved = useGameStore((s) => s.solved);
  const observations = useGameStore((s) => s.observations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const p = useMemo(() => selectProgress(useGameStore.getState(), CONTENT), [flags, evidence, collection, notebook, solved, observations]);
  const total = completion(CONTENT.collection, collection);
  const questions = notebook.question.filter((q) => !q.resolved);
  const stats = [
    ['확인한 관측', `${p.observations.done} / ${p.observations.total}`],
    ['연대 추리', `확정 ${p.deductions.confirmed} · 부분 ${p.deductions.partial} / ${p.deductions.total}`],
    ['특정한 인물', `${p.personsIdentified}`],
    ['수집한 유물', `${p.artifactsCollected}`],
    ['검증한 사료', `${p.sourcesVerified}`],
    ['기록한 사건', `${p.eventsRecorded}`],
  ];
  return (
    <Modal title="개인 기록관" icon={UI_KEYS.iconArchive} onClose={close} wide>
      <div className="scroll archive">
        <section className="archive-hero">
          <div className="archive-ring" style={{ ['--p' as string]: `${Math.round(total.ratio * 100)}` }}>
            <b>{pct(total.ratio)}</b>
            <span>기록관 완성도</span>
          </div>
          <dl className="stat-grid">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h4>분류별 수집</h4>
          <ul className="cat-bars">
            {CATEGORY_ORDER.map((c) => {
              const s = completion(CONTENT.collection, collection, c);
              return (
                <li key={c}>
                  <PixelIcon sprite={CATEGORY_ICON[c]} size={20} />
                  <span className="cat-name">{CATEGORY_LABEL[c]}</span>
                  <span className="codex-bar">
                    <i style={{ width: pct(s.ratio) }} />
                  </span>
                  <b>{pct(s.ratio)}</b>
                  <small>
                    {s.discovered}/{s.total}
                  </small>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h4>풀지 못한 의문 ({questions.length})</h4>
          {questions.length === 0 ? (
            <p className="dim">남은 의문이 없다.</p>
          ) : (
            <ul className="notes">
              {questions.map((q) => (
                <li key={q.id}>
                  <span className="note-text">{q.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="archive-actions">
          <button className="btn" onClick={() => open('collection')}>
            <PixelIcon sprite={UI_KEYS.iconCodex} size={18} /> 도감
          </button>
          <button className="btn" onClick={() => open('deduction', 'timeline')}>
            <PixelIcon sprite={UI_KEYS.iconTimeline} size={18} /> 연대표
          </button>
          <button className="btn" onClick={() => open('evidence')}>
            <PixelIcon sprite={UI_KEYS.iconEvidence} size={18} /> 증거 관계도
          </button>
        </div>
        <p className="dim">증거 {Object.keys(evidence).length}점 확보</p>
      </div>
    </Modal>
  );
}
