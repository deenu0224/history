/** 책상의 관측 창: 책상 위 건의 짧은 장면(뷰어) + 시간 막대 + 들은 말 칩. 눌러서 전체 화면으로 키울 수 있다. 도장을 찍으면 화면이 꺼진다. */
import { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLElement>(null);
  const [small, setSmall] = useState(false);
  const live = !!card && !!card.timelineId && !card.done && panel !== 'log';

  // 장면이 180px 보다 낮으면 ⛶ 를 눈에 띄게(한 번 맥박). 불리언이 바뀔 때만 상태를 바꾸므로 캔버스 크기와 되먹임하지 않는다.
  useEffect(() => {
    const el = ref.current;
    if (!el || !live || expanded || typeof ResizeObserver === 'undefined') return setSmall(false);
    let raf = 0;
    const measure = () => {
      raf = 0;
      const h = el.querySelector('.obsv-screen')?.clientHeight ?? 999;
      setSmall(h > 0 && h < 180);
    };
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    measure();
    return () => {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [live, expanded, card?.timelineId]);

  let body;
  if (!card) body = <Dead text="신호 없음" sub="다음 건을 올리면 관측 창이 켜진다." />;
  else if (!card.timelineId) body = <Dead text="관측 생략" sub="이 건은 규정에 따라 관측하지 않는다." />;
  else if (card.done)
    body = (
      <Dead
        text="관측 종료"
        sub={card.observed.some((o) => o.available) ? '들은 말은 아래에 남는다.' : '관측 화면이 꺼졌다.'}
        verdict={card.impression ? { label: card.impression.label, stamp: card.impression.stamp, over: card.impression.overlay } : undefined}
        off
      />
    );
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
    <section ref={ref} className={`obsw ${expanded && card && !card.done ? 'expanded' : ''} ${small ? 'scene-small' : ''}`} data-testid="obs-window" data-state={!card ? 'idle' : card.done ? 'off' : 'on'}>
      {body}
      {card && <HeardStrip card={card} />}
    </section>
  );
}

function Dead({ text, sub, off, verdict }: { text: string; sub?: string; off?: boolean; verdict?: { label: string; stamp: string; over?: string } }) {
  return (
    <div className={`obsv obsv-dead ${off ? 'power-off' : ''}`} data-testid="obs-dead">
      <div className="obsv-screen">
        <p>
          <b>{text}</b>
          {sub && <small>{sub}</small>}
        </p>
        {verdict && (
          <span className={`obs-verdict v-${verdict.stamp}`} data-testid="obs-verdict">
            <i>내 판정</i>
            <b>{verdict.label}</b>
            <em>07</em>
            {verdict.over && <s>{verdict.over}</s>}
          </span>
        )}
      </div>
    </div>
  );
}
