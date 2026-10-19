/** 복원 3박자의 끝: 07 독백(허구) → 「다음 기록 준비 중」 끝 카드. */
import { selectMonologues } from '@/store/v6/store';
import { D, useV6 } from './store';

export function MonologueScreen() {
  const s = useV6((st) => st.s);
  const ms = selectMonologues(s, D).filter((m) => D.fix.monologue.includes(m.id));
  return (
    <article className="v6-card mono" data-testid="mono">
      <header className="v6-head">
        <div className="v6-tags">
          <span className="v6-tag">07의 독백</span>
        </div>
      </header>
      <div className="v6-mono-lines read">
        {ms.flatMap((m) => m.lines).map((l, i) => (
          <p key={i} style={{ animationDelay: `${i * 0.5}s` }}>
            {l}
          </p>
        ))}
      </div>
    </article>
  );
}

export function EndCard({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="v6-end" data-testid="end-card">
      <span className="rule" />
      <div className="v6-end-t">하룻밤</div>
      <p className="v6-end-s">다음 기록 준비 중</p>
      <p className="muted">그날은 고정되었다. 다음 기록이 열리면 이어서 따라간다.</p>
      <div className="v6-end-btns">
        <button className="btn secondary" data-testid="browse" onClick={onBrowse}>
          기록 다시 보기
        </button>
        <button
          className="btn ghost"
          data-testid="restart"
          onClick={() => {
            useV6.getState().reset();
          }}
        >
          처음부터 다시
        </button>
      </div>
    </div>
  );
}
