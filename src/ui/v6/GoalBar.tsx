/** 목표 띠: 에피소드의 큰 목표 하나만(번호·단계 없음). 풀리면 금색, 고정되면 「완료」. */
import { selectGoal } from '@/store/v6/store';
import { D, useV6 } from './store';
import { ITarget } from './icons';

export function GoalBar({ onTap }: { onTap: () => void }) {
  const s = useV6((st) => st.s);
  const g = selectGoal(s, D);
  return (
    <button className={`v6-goal ${g.status}`} data-testid="goal-bar" data-status={g.status} onClick={onTap}>
      <ITarget />
      <span className="gl">목표</span>
      <span className="gt">
        {g.status === 'open' ? g.text : g.status === 'solved' ? `밝혔다 · '누가' = ${g.answer ?? ''}` : '완료 — 그날이 고정되었다'}
      </span>
    </button>
  );
}
