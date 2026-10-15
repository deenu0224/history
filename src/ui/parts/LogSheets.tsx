/** 내 관측 로그 · 문서 시트. 이미 본 컷은 소실에도 남는다(면역). */
import { currentEpisode, useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { resultView, selectLog } from '@/store/selectors';
import { cutNo } from '../lib/format';
import { EyeIcon } from './icons';
import { Sheet } from './Sheet';
import { useUi } from '../uiStore';

export function LogSheet() {
  const open = useUi((s) => s.logOpen);
  const log = useView(selectLog);
  if (!open) return null;
  const close = () => useUi.getState().setLog(false);
  const goCut = (cutId: string) => {
    const eye = currentEpisode(useGameStore.getState()).eyes.find((e) => e.cuts.includes(cutId));
    if (!eye) return;
    useGameStore.getState().viewCut(eye.id, eye.cuts.indexOf(cutId));
    close();
    const ui = useUi.getState();
    if (!ui.stack.includes('viewer')) ui.push('viewer');
  };
  return (
    <Sheet title="내 관측 로그" onClose={close} testId="log-sheet" maxH="80%">
      <div className="t-m" style={{ marginBottom: 8 }}>
        본 컷 {log.cuts.length}장
      </div>
      <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
        {log.cuts.map((c) => (
          <button key={c.cutId} className="chip" onClick={() => goCut(c.cutId)} data-testid={`log-cut-${cutNo(c.cutId)}`} style={{ flex: '0 0 auto' }}>
            {c.closedEye ? <EyeIcon look="closed" size={18} /> : null}
            <span className="clock" style={{ color: 'inherit' }}>
              {cutNo(c.cutId)}
            </span>
            <span className="t-m" style={{ lineHeight: '20px' }}>
              {c.time}
            </span>
          </button>
        ))}
      </div>
      {log.evidence.length ? (
        <>
          <div className="seclabel t-m">들은 말 · 본 것</div>
          {log.evidence.map((e) => (
            <div key={e.id} className="t-b keep read" style={{ margin: '0 0 8px', lineHeight: '25px' }}>
              {e.text}
            </div>
          ))}
        </>
      ) : null}
      {log.witness.length ? (
        <>
          <div className="seclabel t-m">증인만 본 것</div>
          {log.witness.map((w) => (
            <div key={w.lineId} className="t-b keep read" style={{ color: 'var(--hanji-muted)' }}>
              <span style={{ borderBottom: '1.5px dashed var(--hanji-muted)' }}>{w.text}</span>
              <div className="t-m">{w.note}</div>
            </div>
          ))}
        </>
      ) : null}
      {log.docs.length ? (
        <>
          <div className="seclabel t-m">문서</div>
          {log.docs.map((d) => (
            <button key={d.id} className="hit" onClick={() => { if (useGameStore.getState().openDoc(d.id)) useUi.getState().setDoc(d.id); }}>
              <div className="t-b" style={{ fontWeight: 600 }}>
                {d.title}
              </div>
              <div className="sub">{d.subtitle}</div>
            </button>
          ))}
        </>
      ) : null}
      {log.searches.length ? (
        <>
          <div className="seclabel t-m">찾아본 낱말</div>
          {log.searches.map((s, i) => (
            <div key={i} className="t-b" style={{ display: 'flex', gap: 10 }}>
              <span className="clock t-m">{s.clock}</span>
              <span style={{ flex: 1 }}>「{s.query}」</span>
              <span className="t-m">{s.text}</span>
            </div>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

export function DocSheet() {
  const id = useUi((s) => s.docId);
  const doc = useView((ep, s) => (id ? resultView(ep, s, { kind: 'log', id }) : null), [id]);
  if (!id || !doc) return null;
  return (
    <Sheet title="문서" onClose={() => useUi.getState().setDoc(null)} testId="doc-sheet" maxH="76%">
      <div className="hanji" style={{ borderRadius: 10, padding: '16px 16px 14px' }}>
        <div className="t-b" style={{ fontWeight: 700, color: '#25211e' }}>
          {doc.title}
        </div>
        <div className="t-m" style={{ color: '#6b5e45' }}>
          {doc.subtitle}
        </div>
        {doc.lines.map((l, i) => (
          <div key={i} className="t-b keep read" style={{ marginTop: 8, color: '#3a342f' }}>
            {l}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
