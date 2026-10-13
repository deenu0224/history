/** 규정집: 지금까지 풀린 규정이 펼쳐진다. 이번 근무에 새로 생긴 규정은 '신설' 표시와 함께 눈에 띄게. 닫으면 읽은 것으로 친다. */
import { useEffect } from 'react';
import { selectDesk, useGameStore } from '@/store/gameStore';
import { fx } from '../lib/fx';

export function Rulebook({ onClose }: { onClose(): void }) {
  const st = useGameStore();
  const desk = selectDesk(st);

  useEffect(() => {
    fx('page');
    const on = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = () => {
    useGameStore.getState().markRulesRead();
    onClose();
  };

  return (
    <div className="book-back" data-testid="rulebook-back" onPointerDown={close}>
      <section className="book" role="dialog" aria-label="규정집" data-testid="rulebook" onPointerDown={(e) => e.stopPropagation()}>
        <header className="book-head">
          <h2>규정집</h2>
          <span>실록청 기록대조과 업무 규정</span>
          <button type="button" className="book-x" data-testid="rulebook-close" aria-label="규정집 닫기" onClick={close}>
            ×
          </button>
        </header>
        <ol className="book-rules">
          {desk.rules.map(({ rule, isNew }) => (
            <li key={rule.id} className={`rule ${isNew ? 'rule-new' : ''}`} data-testid={`rule-${rule.no}`} data-new={isNew || undefined}>
              <h3>
                <span className="rule-no">제{rule.no}조</span> {rule.title}
                {isNew && <b className="rule-tag">신설</b>}
              </h3>
              <p>{rule.text}</p>
            </li>
          ))}
          {desk.rules.length === 0 && <li className="rule quiet">아직 받은 규정이 없다. 근무를 시작하면 규정집이 채워진다.</li>}
        </ol>
        <footer className="book-foot">
          <button type="button" className="btn btn-primary" data-testid="rulebook-ok" onClick={close}>
            덮는다
          </button>
        </footer>
      </section>
    </div>
  );
}
