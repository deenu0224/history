/** 경고장·규정 전표: 프린터가 뱉으면 책상 위로 올라와 읽는다(탭해서 닫는다). 경고장 목록은 탭한 프린터에서. */
import { useEffect } from 'react';
import { selectDesk, useGameStore } from '@/store/gameStore';
import { Scramble } from '../components/Scramble';
import { Sheet } from '../components/Sheet';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';

const ruleNo = (id?: string) => CONTENT.rules.find((r) => r.id === id)?.no;
const caseCode = (id?: string) => CONTENT.cases.find((c) => c.id === id)?.code;

/** 지금 읽는 전표(맨 앞 하나). 경고장 `warn_n` / 규정 `rule:<id>` */
export function SlipReader() {
  const st = useGameStore();
  const queue = useUi((s) => s.slipReading);
  const close = useUi((s) => s.closeSlip);
  const id = queue[0];

  useEffect(() => {
    if (!id) return;
    const on = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && (fx('page'), close());
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [id, close]);

  if (!id) return null;
  if (id.startsWith('rule:')) {
    const r = CONTENT.rules.find((x) => `rule:${x.id}` === id);
    if (!r) return null;
    return (
      <div className="slip-back" data-testid="slip-back" onPointerDown={() => (fx('page'), close())}>
        <article className="slip slip-rule" role="dialog" aria-label={`규정 ${r.no}조 신설`} data-testid="slip" data-kind="rule" onPointerDown={(e) => e.stopPropagation()}>
          <header className="slip-head">
            <b>규정 {r.no}조 신설</b>
            <span>{r.title}</span>
          </header>
          <p className="slip-reason" data-testid="slip-reason">
            {r.text}
          </p>
          <footer className="slip-foot">
            <span>기록대조과 · 규정집에 끼운다</span>
            <button type="button" className="btn btn-primary" data-testid="slip-ok" onClick={() => (fx('page'), close())}>
              알겠다
            </button>
          </footer>
        </article>
      </div>
    );
  }
  const w = st.duty.warnings.find((x) => x.id === id);
  if (!w) return null;
  const nth = selectDesk(st).slips.findIndex((x) => x.id === w.id) + 1;
  return (
    <div className="slip-back" data-testid="slip-back" onPointerDown={() => (fx('page'), close())}>
      <article className="slip slip-warn" role="alertdialog" aria-label="경고장" data-testid="slip" data-kind="warning" onPointerDown={(e) => e.stopPropagation()}>
        <header className="slip-head">
          <b>경고장 {nth > 0 ? `No.${nth}` : ''}</b>
          <span>
            {ruleNo(w.ruleId) ? `규정 ${ruleNo(w.ruleId)}조` : '업무 규정'}
            {caseCode(w.caseId) ? ` · ${caseCode(w.caseId)}` : ''}
          </span>
        </header>
        <p className="slip-reason" data-testid="slip-reason">
          <Scramble text={w.voided && w.voidText ? w.voidText : w.reason} playKey={`warning:${w.id}`} hold={1500} />
        </p>
        <footer className="slip-foot">
          <span>대조관 07</span>
          <button type="button" className="btn btn-primary" data-testid="slip-ok" onClick={() => (fx('page'), close())}>
            알겠다
          </button>
        </footer>
      </article>
    </div>
  );
}

/** 이번 근무의 경고장 목록 */
export function SlipList({ onClose }: { onClose(): void }) {
  const st = useGameStore();
  const desk = selectDesk(st);
  const read = useUi((s) => s.readSlip);
  return (
    <Sheet title="이번 근무의 경고장" onClose={onClose} testId="slip-list">
      {desk.slips.length === 0 && <p className="quiet">경고장이 없다.</p>}
      <ul className="slip-rows">
        {desk.slips.map((w, i) => (
          <li key={w.id} className={`slip-row ${w.voided ? 'voided' : ''} ${w.cleared ? 'cleared' : ''}`} data-testid={`slip-row-${i}`}>
            <b>
              No.{i + 1}
              {ruleNo(w.ruleId) ? ` · 규정 ${ruleNo(w.ruleId)}조` : ''}
              {caseCode(w.caseId) ? ` · ${caseCode(w.caseId)}` : ''}
            </b>
            <span className="slip-row-text">
              <Scramble text={w.voided && w.voidText ? w.voidText : w.reason} playKey={`warning:${w.id}`} />
            </span>
            <small>{w.voided ? '해당 없음' : w.cleared ? '면담 정리' : '살아 있음'}</small>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                fx('page');
                read([w.id]);
                onClose();
              }}
            >
              다시 읽기
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
