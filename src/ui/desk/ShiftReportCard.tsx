/** 근무 보고: 근무가 끝나면 프린터가 뱉는 종이. 처리·정확도·경고·종결 건 재생 횟수 + 오 실장 한 줄. */
import { selectShiftReport, useGameStore } from '@/store/gameStore';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';

export function ShiftReportCard({ dutyId }: { dutyId: string }) {
  const st = useGameStore();
  const r = selectShiftReport(st, dutyId);
  const close = useUi((s) => s.setShiftReportFor);
  const shift = CONTENT.workShifts.find((w) => w.id === dutyId);
  if (!r) return null;
  const pct = Math.round(r.accuracy * 100);
  return (
    <div className="report-back" data-testid="shift-report-back">
      <article className="report-paper" role="dialog" aria-label="근무 보고" data-testid="shift-report">
        <header>
          <small>근무 보고 · 대조관 07</small>
          <h2>{r.title}</h2>
        </header>
        {shift?.outro?.map((l) => (
          <p key={l} className="rp-outro">
            {l}
          </p>
        ))}
        <dl className="rp-rows">
          <div>
            <dt>처리</dt>
            <dd data-testid="rp-processed">
              {r.processed} / {r.goal}
              <i className={r.goalMet ? 'ok' : 'miss'}>{r.goalMet ? '목표 달성' : '목표 미달'}</i>
            </dd>
          </div>
          <div>
            <dt>정확도</dt>
            <dd data-testid="rp-accuracy">
              {pct}%<small>
                {' '}
                ({r.correct}/{r.processed})
              </small>
            </dd>
          </div>
          <div>
            <dt>경고</dt>
            <dd data-testid="rp-warnings">
              {r.warnings}장{r.voided > 0 && <small> · 해당 없음 {r.voided}</small>}
            </dd>
          </div>
          <div>
            <dt>종결 건 재생</dt>
            <dd data-testid="rp-replays">{r.replays}회</dd>
          </div>
        </dl>
        {r.line && (
          <p className="rp-line" data-testid="rp-line">
            <b>오 실장</b> {r.line}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="btn btn-primary btn-big"
            data-testid="shift-next"
            onClick={() => {
              fx('page');
              close(null);
              useUi.getState().setShownCase(null);
            }}
          >
            퇴근한다
          </button>
        </footer>
      </article>
    </div>
  );
}
