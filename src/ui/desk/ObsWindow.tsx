/** 책상의 관측 창: 책상 위 건의 짧은 장면(뷰어) + 시간 막대 + 들은 말 칩. 눌러서 전체 화면으로 키울 수 있다. 도장을 찍으면 화면이 꺼진다. */
import { selectDesk, useGameStore, type CaseCardView } from '@/store/gameStore';
import { useUi } from '../uiStore';
import { HeardStrip } from './HeardStrip';
import { ObserveView } from './ObserveView';

export function ObsWindow({ card }: { card: CaseCardView | null }) {
  const st = useGameStore();
  const desk = selectDesk(st);
  const expanded = useUi((s) => s.obsExpanded);
  const setExpanded = useUi((s) => s.setObsExpanded);
  const panel = useUi((s) => s.panel);

  let body;
  if (!card) body = <Dead text="신호 없음" sub="다음 건을 올리면 관측 창이 켜진다." />;
  else if (!card.timelineId) body = <Dead text="관측 생략" sub="이 건은 규정에 따라 관측하지 않는다." />;
  else if (card.done) body = <Dead text="관측 종료" sub="도장이 찍힌 건." off />;
  else if (panel === 'log') body = <Dead text="관측기 로그 열람 중" />;
  else
    body = (
      <ObserveView
        key={card.timelineId}
        timelineId={card.timelineId}
        mode="case"
        shutter={desk.shutter}
        expanded={expanded}
        onToggleExpand={() => setExpanded(!expanded)}
      >
        {null}
      </ObserveView>
    );

  return (
    <section className={`obsw ${expanded && card && !card.done ? 'expanded' : ''}`} data-testid="obs-window" data-state={!card ? 'idle' : card.done ? 'off' : 'on'}>
      {body}
      {card && <HeardStrip card={card} />}
    </section>
  );
}

function Dead({ text, sub, off }: { text: string; sub?: string; off?: boolean }) {
  return (
    <div className={`obsv obsv-dead ${off ? 'power-off' : ''}`} data-testid="obs-dead">
      <div className="obsv-screen">
        <p>
          <b>{text}</b>
          {sub && <small>{sub}</small>}
        </p>
      </div>
    </div>
  );
}
