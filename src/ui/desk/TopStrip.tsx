/** 위 띠: 근무 시계·시간 예산 · 처리 n/목표 · 경고 ●○○ · 규정집 · 메신저(읽지 않음) · 메뉴(업무·관측·DB·설정). */
import { useEffect, useRef, useState } from 'react';
import { selectApps, selectDesk, selectReplay, useGameStore } from '@/store/gameStore';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fmtSpan } from '../lib/desk';
import { fx } from '../lib/fx';
import { openPanel } from '../lib/nav';
import { useUi, type Panel } from '../uiStore';

/** UI 에 도착한(전달 연출이 끝난) 읽지 않은 메시지 수 */
export function useUnread(): number {
  const inbox = useGameStore((s) => s.inbox);
  const read = useGameStore((s) => s.read);
  const revealed = useUi((s) => s.revealed);
  return inbox.filter((id) => revealed.includes(id) && !read.includes(id)).length;
}

export function TopStrip({ onSlips }: { onSlips(): void }) {
  const st = useGameStore();
  const desk = selectDesk(st);
  const replay = selectReplay(st);
  const apps = selectApps(st);
  const panel = useUi((s) => s.panel);
  const reportSeen = useUi((s) => s.reportSeen);
  const unread = useUnread();
  const live = desk.slips.filter((w) => !w.cleared && !w.voided).length;
  const newRules = desk.rules.some((r) => r.isNew);
  const length = desk.shift?.length ?? 420;
  const spent = desk.shift ? length - desk.minutesLeft : 0;
  const [spend, setSpend] = useState<{ n: number; d: number } | null>(null);
  const prev = useRef(spent);

  // 시간이 쓰이면 '−40분' 이 시계에서 떠오른다
  useEffect(() => {
    const d = spent - prev.current;
    prev.current = spent;
    if (d > 0) {
      setSpend({ n: Date.now(), d });
      const t = window.setTimeout(() => setSpend(null), 1800);
      return () => window.clearTimeout(t);
    }
  }, [spent]);

  const rep = st.reports[CONTENT.reports[0]?.id ?? ''];
  void rep;
  const reportOpen = !!desk.shift && !!CONTENT.reports[0] && st.duty.started.includes('duty_3');
  const menuNews = {
    filing: reportOpen && !reportSeen && !st.filed.length,
    log: !!desk.shift && replay.caseId !== null && desk.shift.no >= 2 && st.duty.replays.length === 0,
    db: false,
  };
  const toggle = (p: Panel) => {
    fx('tap');
    openPanel(panel === p ? null : p);
  };

  return (
    <header className="strip" data-testid="top-strip">
      <div className="strip-clock" data-testid="clock">
        <b className="clock-time" data-testid="clock-time">
          {desk.clock ?? '--:--'}
        </b>
        <span className="budget" role="progressbar" aria-label="근무 시간" aria-valuemin={0} aria-valuemax={length} aria-valuenow={spent} data-testid="budget" title={desk.shift ? `남은 ${fmtSpan(desk.minutesLeft)}` : undefined}>
          <i style={{ width: `${Math.min(100, (spent / length) * 100)}%` }} />
          {desk.shift && <em>{fmtSpan(desk.minutesLeft)}</em>}
        </span>
        {spend && (
          <span className="spend" key={spend.n} aria-hidden="true">
            −{spend.d}분
          </span>
        )}
      </div>
      <button type="button" className="strip-count" data-testid="processed" aria-label={`처리 ${desk.processed} / 목표 ${desk.goal}`} onClick={onSlips}>
        <small>처리</small>
        <b>{desk.processed}</b>
        <span>/{desk.goal || '-'}</span>
      </button>
      <button type="button" className={`strip-warn warn-${live}`} data-testid="warnings" data-live={live} aria-label={`경고 ${live} / 3`} onClick={onSlips}>
        <small>경고</small>
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < live ? 'on' : ''} />
        ))}
      </button>
      <span className="strip-gap" />
      <button type="button" className={`strip-btn ${newRules ? 'news' : ''}`} data-testid="open-rules" aria-label="규정집" onClick={() => toggle('rules')}>
        <Px k="desk_rulebook_closed" scale={1} className="strip-book" />
        {newRules && <i className="news-dot" aria-label="신설 규정" />}
      </button>
      <button type="button" className={`strip-btn ${unread ? 'blink' : ''} ${panel === 'messenger' ? 'on' : ''}`} data-testid="open-messenger" aria-label={`메신저${unread ? ` · 읽지 않음 ${unread}` : ''}`} onClick={() => toggle('messenger')}>
        <Px k="app_messenger_sm" scale={2} />
        {unread > 0 && (
          <span className="strip-badge" data-testid="messenger-badge">
            {unread}
          </span>
        )}
      </button>
      <button type="button" className={`strip-btn ${panel === 'menu' ? 'on' : ''}`} data-testid="open-menu" aria-label="메뉴" aria-expanded={panel === 'menu'} onClick={() => toggle('menu')}>
        <span className="burger" aria-hidden="true" />
        {(menuNews.filing || menuNews.log) && <i className="news-dot" />}
      </button>
      {panel === 'menu' && (
        <nav className="menu" data-testid="menu" aria-label="메뉴">
          {CONTENT.apps
            .filter((a) => a.app !== 'messenger' && apps.includes(a.app))
            .map((a) => {
              const p: Panel = a.app === 'work' ? 'filing' : a.app === 'viewer' ? 'log' : 'db';
              const news = p === 'filing' ? menuNews.filing : p === 'log' ? menuNews.log : false;
              return (
                <button key={a.app} type="button" className="menu-item" data-testid={`menu-${a.app}`} onClick={() => (fx('tap'), openPanel(p))}>
                  <Px k={a.iconKey.endsWith('_sm') ? a.iconKey : `${a.iconKey}_sm`} scale={2} />
                  <span>{a.title}</span>
                  {news && <i className="news-dot" />}
                </button>
              );
            })}
          <button type="button" className="menu-item" data-testid="menu-settings" onClick={() => (fx('tap'), openPanel('settings'))}>
            <Px k="app_settings_sm" scale={2} />
            <span>설정</span>
          </button>
        </nav>
      )}
    </header>
  );
}
