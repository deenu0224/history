/**
 * 책상(결록 단말의 근무 화면). 세로 폰: 위 띠 / 기록 카드 / 관측 창 / 도장 레일. 가로·데스크톱: 카드·레일은 왼쪽, 관측 창은 오른쪽.
 * 앱(업무·관측·DB·메신저)과 규정집·설정은 책상 위로 올라오는 패널이다. 캐릭터 이동 없음, 튜토리얼 팝업 없음.
 */
import { useEffect, useRef, useState } from 'react';
import { bus } from '@/core/bus';
import { selectCaseCard, selectDesk, useGameStore } from '@/store/gameStore';
import { MessengerApp } from '../apps/Messenger';
import { SearchApp } from '../apps/Search';
import { SettingsApp } from '../apps/Settings';
import { runBack, useIdleHints } from '../hooks';
import { appIconKey } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { closePanel, openPanel } from '../lib/nav';
import { Banner, Overlays } from '../os/Overlays';
import { useUi } from '../uiStore';
import { CardPaper } from './CardPaper';
import { DeskIdle, EndButton, NextButton } from './DeskIdle';
import { doStamp } from './actions';
import { useAppBus, useMessageDelivery, useMusicDirector, useRewriteDirector, useSlipDirector } from './directors';
import { DrawerView } from './Drawer';
import { FilingApp } from './Filing';
import { Interview } from './Interview';
import { LogPanel } from './LogPanel';
import { ObsWindow } from './ObsWindow';
import { PanelFrame } from './PanelFrame';
import { Rulebook } from './Rulebook';
import { ShiftReportCard } from './ShiftReportCard';
import { SlipList, SlipReader } from './Slips';
import { StampRail } from './StampRail';
import { Threads } from './Threads';
import { TopStrip } from './TopStrip';

export function DeskShell() {
  const st = useGameStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const desk = selectDesk(st);
  const panel = useUi((s) => s.panel);
  const shownId = useUi((s) => s.shownCase);
  const inspect = useUi((s) => s.inspect);
  const setInspect = useUi((s) => s.setInspect);
  const expanded = useUi((s) => s.obsExpanded);
  const flipped = useUi((s) => s.flipped);
  const reportFor = useUi((s) => s.shiftReportFor);
  const reading = useUi((s) => s.slipReading.length > 0);
  const born = useUi((s) => s.bornLinks);
  const reduceFlicker = st.settings.reduceFlicker;
  const [drawer, setDrawer] = useState(false);
  const [slipList, setSlipList] = useState(false);

  useMessageDelivery();
  useRewriteDirector();
  useSlipDirector();
  useMusicDirector();
  useAppBus();
  useIdleHints();

  const cardId = st.duty.current ?? shownId;
  const card = cardId ? selectCaseCard(st, cardId) : null;
  const active = !!card && !card.done && st.duty.current === card.case.id && !desk.suspended;

  // 모바일 뒤로 가기: 안쪽 화면부터 닫는다
  useEffect(() => {
    history.pushState({ gyeollok: 1 }, '');
    const on = () => {
      history.pushState({ gyeollok: 1 }, '');
      if (runBack()) return;
      const ui = useUi.getState();
      if (ui.obsExpanded) return ui.setObsExpanded(false);
      if (ui.panel) closePanel();
    };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);

  // 검사 모드는 카드가 있을 때만
  useEffect(() => {
    if (inspect && (!card || card.done || card.kind !== 'routine')) setInspect(false);
  }, [inspect, card, setInspect]);

  useEffect(() => {
    zoneRef.current?.scrollTo({ top: 0 });
  }, [cardId]);

  const needsRoutine = !!card && card.kind === 'routine' && !card.done;
  // 관측 창이 살아 있지 않으면(신호 없음 · 도장 찍힘 · 관측 생략) 세로 화면에서 접어 카드에 자리를 준다
  const obsLive = !!card && !!card.timelineId && !card.done && panel !== 'log';

  // 도장이 책상을 내리친다: 짧은 흔들림(줄인 움직임 설정이면 없음)
  const shake = useUi((s) => s.shake);
  const [shaking, setShaking] = useState<'' | 'shake' | 'shake-heavy'>('');
  useEffect(() => {
    if (!shake || reduceFlicker) return;
    setShaking(shake.heavy ? 'shake-heavy' : 'shake');
    const t = window.setTimeout(() => setShaking(''), shake.heavy ? 420 : 240);
    return () => window.clearTimeout(t);
  }, [shake, reduceFlicker]);

  const layout = (
    <>
      <PlaqueBar card={card} canInspect={needsRoutine && active} />
      <div className="zone-card" ref={zoneRef}>{card ? <CardPaper card={card} /> : <DeskIdle />}</div>
      <ObsWindow card={card} />
      <StampRail card={card} canStamp={active} dutyActive={!!desk.shift} onDrawer={() => setDrawer(true)} onSlips={() => setSlipList(true)} />
    </>
  );

  const close = () => closePanel();
  return (
    <div
      ref={rootRef}
      className={`desk-root ${inspect ? 'inspecting' : ''} ${reduceFlicker ? 'calm' : ''} ${expanded ? 'obs-big' : ''} ${desk.suspended ? 'suspended' : ''}`}
      data-testid="os"
      data-inspect={inspect || undefined}
    >
      <TopStrip onSlips={() => setSlipList(true)} />
      <main className={`desk ${obsLive ? '' : 'obs-off'} ${shaking}`}>{layout}</main>
      <Threads rootRef={rootRef} links={card?.links ?? []} born={born} hidden={!card || card.done || flipped || expanded} />

      {panel === 'menu' && <div className="menu-back" data-testid="menu-back" onPointerDown={close} />}
      {panel === 'rules' && <Rulebook onClose={close} />}
      {panel === 'messenger' && (
        <PanelFrame title="메신저" iconKey="app_messenger_sm" onClose={close} testId="panel-messenger">
          <div className="app-host" data-app="messenger">
            <MessengerApp />
          </div>
        </PanelFrame>
      )}
      {panel === 'db' && (
        <PanelFrame title="DB 검색" iconKey="app_db_sm" onClose={close} testId="panel-db">
          <div className="app-host" data-app="db">
            <SearchApp />
          </div>
        </PanelFrame>
      )}
      {panel === 'filing' && (
        <PanelFrame title="업무" iconKey="app_work_sm" onClose={close} testId="panel-filing">
          <div className="app-host" data-app="work">
            <FilingApp />
          </div>
        </PanelFrame>
      )}
      {panel === 'log' && (
        <PanelFrame title="관측 · 관측기 로그" iconKey="app_observe_sm" onClose={close} testId="panel-log">
          <div className="app-host" data-app="viewer">
            <LogPanel />
          </div>
        </PanelFrame>
      )}
      {panel === 'settings' && (
        <PanelFrame title="설정" iconKey="app_settings_sm" onClose={close} testId="panel-settings">
          <div className="app-host" data-app="settings">
            <SettingsApp />
          </div>
        </PanelFrame>
      )}

      {drawer && (
        <DrawerView
          canStamp={active}
          onClose={() => setDrawer(false)}
          onStamp={() => {
            setDrawer(false);
            window.setTimeout(() => doStamp('mismatch'), 120);
          }}
        />
      )}
      {slipList && <SlipList onClose={() => setSlipList(false)} />}
      <SlipReader />
      {reportFor && !reading && <ShiftReportCard dutyId={reportFor} />}
      <Interview hidden={reading} />
      <Banner />
      <Overlays />
    </div>
  );
}

/** 카드 위 띠: 번호판(큐) + 검사 모드 버튼 / 벨(다음 건 · 근무 종료) */
function PlaqueBar({ card, canInspect }: { card: ReturnType<typeof selectCaseCard>; canInspect: boolean }) {
  const st = useGameStore();
  const desk = selectDesk(st);
  const inspect = useUi((s) => s.inspect);
  const setInspect = useUi((s) => s.setInspect);
  const used = useUi((s) => s.inspectUsed);
  const nudge = useUi((s) => s.inspectNudge);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => tick((n) => n + 1), 6100);
    return () => window.clearTimeout(t);
  }, [nudge]);
  if (!desk.shift) return <div className="plaque-bar" />;
  // 검사 버튼은 한 번 쓰기 전까지, 첫 건(보기·엿듣기만 배우는 건)이 지난 뒤에만 숨 쉰다. 짚지 않고 정정을 누르면 크게 한 번.
  const everInspected = used || Object.values(st.duty.cases).some((c) => c.links.length > 0);
  const anyStamped = Object.values(st.duty.cases).some((c) => !!c.stamp);
  const heard = !!card && card.observed.some((o) => o.available);
  const nudged = nudge > 0 && Date.now() - nudge < 6000;
  const pulse = inspect ? '' : nudged ? 'pulse-hard' : !everInspected && anyStamped && heard ? 'pulse-soft' : '';
  const nowCode = card && !card.done ? card.code : (CONTENT.cases.find((c) => c.id === desk.nextLoadable)?.code ?? '— — —');
  const showBell = !card || card.done;
  return (
    <div className="plaque-bar" data-testid="plaque-bar">
      <div className="plaque" data-testid="plaque" aria-label={`대기 번호 ${nowCode}`}>
        <span className="plaque-code">{nowCode}</span>
        <span className="plaque-dots" aria-hidden="true">
          {desk.queue.map((q) => (
            <i key={q.caseId} className={q.done ? 'done' : q.current ? 'now' : ''} />
          ))}
        </span>
      </div>
      <span className="plaque-fill" />
      {canInspect && (
        <button
          type="button"
          className={`inspect-toggle ${inspect ? 'on' : ''} ${pulse}`}
          data-testid="inspect-toggle"
          aria-pressed={inspect}
          onClick={() => {
            fx('tap');
            setInspect(!inspect);
          }}
        >
          <i className="lens" aria-hidden="true" />
          {inspect ? '검사 중' : '검사'}
        </button>
      )}
      {showBell && (desk.canEnd ? <EndButton /> : <NextButton compact />)}
    </div>
  );
}

export { appIconKey, bus, openPanel };
