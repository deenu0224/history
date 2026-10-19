/** v6 앱 루트: 첫 화면(Intro) → 기록 · 메신저 · 역사 고정 · 복원 3박자 · 끝 카드. 화면 하나 = 초점 하나, 주요 버튼 ≤ 3. */
import { useEffect, useRef, useState } from 'react';
import { selectNav, type V6State } from '@/store/v6/store';
import { HoldButton, FreshButton } from '../parts/HoldButton';
import { BottomBar } from './BottomBar';
import { ClueBag } from './ClueBag';
import { EndCard, MonologueScreen } from './Closing';
import { GoalBar } from './GoalBar';
import { Intro } from './Intro';
import { MessengerScreen } from './Messenger';
import { PinScreen } from './PinScreen';
import { RecordView } from './RecordView';
import { D, useV6 } from './store';

type View = 'record' | 'messenger' | 'pin' | 'mono' | 'end';

/** 저장에서 이어 열 때 보던 곳: 복원 박자와 끝난 에피소드를 따라간다 */
function initialView(s: V6State): View {
  if (s.epilogueDone) return 'end';
  if (s.restored) return s.restoreStep === 0 ? 'pin' : s.restoreStep === 1 ? 'record' : 'mono';
  return 'record';
}

const EDGE_PX = 24;
const EDGE_GO_PX = 64;

function Game() {
  const s = useV6((st) => st.s);
  const [view, setView] = useState<View>(() => initialView(useV6.getState().s));
  const [bagOpen, setBagOpen] = useState(false);
  const prev = useRef<View>('record');
  const body = useRef<HTMLDivElement>(null);
  const st = useV6.getState();
  const nav = selectNav(s, D, Date.now());
  const top = s.nodeStack[s.nodeStack.length - 1];

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [view, top]);

  const closeBag = () => {
    st.clearResult();
    setBagOpen(false);
  };
  const toRecord = () => {
    if (bagOpen) closeBag();
    if (top !== D.start) st.openNode(D.start);
    setView('record');
  };
  const openMessenger = () => {
    if (view === 'messenger') return;
    prev.current = view;
    closeBag();
    setView('messenger');
  };
  const back = () => {
    if (bagOpen) return closeBag();
    if (view === 'messenger') return setView(prev.current);
    if (view === 'pin') return setView('record');
    if (view === 'record') return void st.back();
  };
  /** 복원 박자: 단락(역사 고정 화면) → 이웃 기록 → 07 독백 → 끝 카드 */
  const nextBeat = () => {
    if (s.epilogueDone) return setView('end');
    const r = st.advanceRestore();
    if (r === 'neighbors') {
      if (top !== D.start) st.openNode(D.start);
      setView('record');
    } else if (r === 'monologue') setView('mono');
    else setView('end');
  };
  const doFix = () => {
    st.fix();
  };

  // 왼쪽 가장자리에서 밀면 뒤로
  const edge = useRef<{ x: number; y: number } | null>(null);

  let center: React.ReactNode = null;
  const cta = 'btn primary navprimary v6-cta';
  if (view === 'pin') {
    center = !s.restored ? (
      <HoldButton className={`${cta} gold`} mode={s.settings.holdMode} testId="pin-hold" onDone={doFix}>
        길게 눌러 역사 고정
      </HoldButton>
    ) : !s.epilogueDone && s.restoreStep === 0 ? (
      <FreshButton className={`${cta} gold`} testId="restored-next" onClick={nextBeat}>
        기록이 돌아왔다 ›
      </FreshButton>
    ) : (
      <button className={`${cta} gold`} data-testid="next-beat" onClick={nextBeat}>
        다음 ›
      </button>
    );
  } else if (view === 'mono') {
    center = (
      <button className={`${cta} gold`} data-testid="next-beat" onClick={nextBeat}>
        다음 ›
      </button>
    );
  } else if (view === 'record') {
    if (nav.center === 'fix')
      center = (
        <button
          className={`${cta} gold`}
          data-testid="center-fix"
          onClick={() => {
            if (bagOpen) closeBag();
            setView('pin');
          }}
        >
          역사 고정 ›
        </button>
      );
    else if (nav.center === 'next')
      center = (
        <button className={`${cta} gold`} data-testid="next-beat" onClick={nextBeat}>
          다음 ›
        </button>
      );
    else if (bagOpen)
      center = (
        <button className={cta} data-testid="combine" disabled={s.picked.length < 2} onClick={() => st.combine()}>
          맞춰 보기
        </button>
      );
    else
      center = (
        <button className={cta} data-testid="center-combine" onClick={() => setBagOpen(true)}>
          맞춰 보기 · 단서 {nav.badge}
        </button>
      );
  }

  return (
    <div
      className="scr v6-scr"
      data-screen={view}
      data-testid="game"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        edge.current = e.clientX - r.left <= EDGE_PX ? { x: e.clientX, y: e.clientY } : null;
      }}
      onPointerUp={(e) => {
        const o = edge.current;
        edge.current = null;
        if (o && e.clientX - o.x > EDGE_GO_PX && Math.abs(e.clientY - o.y) < 48) back();
      }}
    >
      <GoalBar onTap={toRecord} />
      <main className="v6-main">
        {view === 'messenger' ? (
          <MessengerScreen />
        ) : (
          <div className="v6-body" ref={body} data-testid="body">
            {view === 'record' ? <RecordView /> : view === 'pin' ? <PinScreen /> : view === 'mono' ? <MonologueScreen /> : <EndCard onBrowse={toRecord} />}
          </div>
        )}
        {bagOpen && view === 'record' ? <ClueBag onClose={() => setBagOpen(false)} /> : null}
      </main>
      <BottomBar onBack={back} center={center} onMessenger={openMessenger} unread={nav.messengerUnread} messengerOff={view === 'messenger' || view === 'end'} />
    </div>
  );
}

export function V6App() {
  const started = useV6((st) => st.s.started);
  const fx = useV6((st) => st.fx.length);
  const text = useV6((st) => st.s.settings.textSize);

  useEffect(() => {
    if (fx) useV6.getState().ackFx();
  }, [fx]);
  // 메신저 시계: 말풍선이 때맞춰 도착한다
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => useV6.getState().tick(), 500);
    return () => clearInterval(t);
  }, [started]);

  return (
    <div
      className="app v6"
      data-testid="app"
      data-text={text}
      onPointerDown={() => useV6.getState().setTouching(true)}
      onPointerUp={() => useV6.getState().setTouching(false)}
      onPointerCancel={() => useV6.getState().setTouching(false)}
    >
      {started ? <Game /> : <Intro />}
    </div>
  );
}
