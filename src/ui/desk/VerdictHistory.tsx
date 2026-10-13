/** 카드 뒤: 같은 좌표에 지난 도장들(오늘 / 어제 / 그저께 / 1년 전). 1년 전 바랜 도장을 탭하면 확대된다. */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { VerdictHistoryEntry } from '@/store/gameStore';
import { useGameStore } from '@/store/gameStore';
import { fx } from '../lib/fx';
import { Impression } from './Impression';

export function VerdictHistory({ entries, code, onBack }: { entries: VerdictHistoryEntry[]; code: string; onBack(): void }) {
  const [zoom, setZoom] = useState<VerdictHistoryEntry | null>(null);
  return (
    <article className="dcard dc-history" data-testid="verdict-history">
      <header className="dc-head">
        <span className="dc-code">{code}</span>
        <span className="dc-kind">판정 이력</span>
        <button type="button" className="dc-flip" data-testid="history-back" onClick={onBack}>
          카드
        </button>
      </header>
      <ul className="vh-list">
        {entries.map((e, i) => {
          const tappable = !!e.closedReportId;
          const body = (
            <>
              <span className="vh-when">{e.when}</span>
              <span className="vh-officer">{e.officer}</span>
              <span className="vh-imp">
                <Impression caseId={`hist${i}`} stamp={e.impression.stamp} label={e.impression.label} engraving={e.impression.engraving} faded={e.impression.faded} scale={2} salt={e.when} />
                {e.impression.overlay && !e.impression.faded && <Impression caseId={`hist${i}`} stamp="auto_close" system label={e.impression.overlay} engraving="" scale={2} salt="sys" className="imp-over" />}
              </span>
              {e.impression.faded && e.impression.overlay && <span className="vh-note">{e.impression.overlay}</span>}
            </>
          );
          return (
            <li key={`${e.when}-${i}`} className={`vh-row ${e.impression.faded ? 'aged' : ''}`} data-testid={`history-${e.impression.faded ? 'aged' : 'today'}-${i}`}>
              {tappable ? (
                <button
                  type="button"
                  className="vh-btn"
                  data-testid="history-aged"
                  onClick={() => {
                    fx('page');
                    if (e.closedReportId) useGameStore.getState().openClosedReport(e.closedReportId);
                    setZoom(e);
                  }}
                >
                  {body}
                </button>
              ) : (
                <div className="vh-btn static">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {zoom &&
        createPortal(
        <div className="aged-zoom" data-testid="aged-zoom" role="dialog" aria-label="바랜 도장" onClick={() => setZoom(null)}>
          <div className="aged-paper">
            <Impression caseId="aged" stamp="mismatch" label={zoom.impression.label} engraving={zoom.impression.engraving} faded scale={4} className="aged-imp" />
            <p className="aged-eng" data-testid="aged-eng">
              {zoom.impression.engraving}
            </p>
            <p className="aged-line" data-testid="aged-line">
              나는 이 도장을 찍은 기억이 없다.
            </p>
            <button type="button" className="btn btn-small aged-x" data-testid="aged-close" onClick={() => setZoom(null)}>
              닫기
            </button>
          </div>
        </div>,
          document.querySelector('.os-root') ?? document.body,
        )}
    </article>
  );
}
