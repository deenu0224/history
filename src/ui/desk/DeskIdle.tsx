/** 카드가 없을 때 카드 자리: 로그인 · 근무 명세 · 다음 건(벨) · 근무 종료 · 에피소드 끝. */
import { useState } from 'react';
import { selectDesk, selectProgress, useGameStore } from '@/store/gameStore';
import { EPISODE_1 } from '@/data/script';
import { CONTENT } from '../lib/content';
import { fmtMinute } from '../lib/desk';
import { fx } from '../lib/fx';
import { openPanel } from '../lib/nav';
import { useUi } from '../uiStore';
import { endDuty, loadNext, startDuty } from './actions';

export function DeskIdle() {
  const st = useGameStore();
  const desk = selectDesk(st);
  const open = useUi((s) => s.briefingOpen);
  const setOpen = useUi((s) => s.setBriefingOpen);

  if (desk.episodeDone) return <EndCard />;

  if (!desk.shift) {
    const next = CONTENT.workShifts.find((w) => w.id === desk.nextDutyId);
    if (!next) return null;
    return (
      <article className="dcard dc-login" data-testid="duty-login">
        <header className="dc-head">
          <span className="dc-code">결록 단말</span>
          <span className="dc-kind">대조관 07</span>
        </header>
        <h2 className="dc-title">{next.title}</h2>
        <p className="dc-cite">
          근무 {next.no} · {fmtMinute(next.startClock)} 시작
        </p>
        <ul className="dc-brief">
          {next.briefing.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary btn-big" data-testid="duty-start" onClick={() => (fx('tap'), startDuty(next.id))}>
          로그인 — 근무 시작
        </button>
      </article>
    );
  }

  return (
    <article className="dcard dc-brief-card" data-testid="duty-briefing">
      <header className="dc-head">
        <span className="dc-code">근무 명세</span>
        <span className="dc-kind">
          {desk.shift.title} · 목표 {desk.goal}건
        </span>
        <button type="button" className="dc-flip" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? '접기' : '펼치기'}
        </button>
      </header>
      {open && (
        <ul className="dc-brief">
          {desk.briefing.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <DeskBell />
    </article>
  );
}

/** 카드 자리의 안내: 근무를 끝낼 수 없을 때의 이유(벨은 위쪽 띠에 있다). */
export function DeskBell() {
  const st = useGameStore();
  const desk = selectDesk(st);
  if (!desk.endBlockedText) return null;
  return (
    <p className="dc-todo" data-testid="end-blocked">
      {desk.endBlockedText}{' '}
      <button type="button" className="btn btn-small" data-testid="open-filing" onClick={() => (fx('tap'), openPanel('filing'))}>
        업무 열기
      </button>
    </p>
  );
}

export function NextButton({ compact }: { compact?: boolean }) {
  const st = useGameStore();
  const desk = selectDesk(st);
  const code = CONTENT.cases.find((c) => c.id === desk.nextLoadable)?.code;
  if (!desk.nextLoadable) {
    return desk.queue.some((q) => !q.done) && !desk.canEnd ? (
      <p className="dc-todo" data-testid="no-time">
        남은 근무 시간에 들어가지 않는 건이 남아 있다.
      </p>
    ) : null;
  }
  return (
    <button type="button" className={`bell ${compact ? 'bell-compact' : ''}`} data-testid="next-case" onClick={loadNext} disabled={desk.suspended}>
      <span className="bell-dome" aria-hidden="true" />
      <span>
        다음 건 <b>{code}</b>
      </span>
    </button>
  );
}

export function EndButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="bell bell-end"
      data-testid="duty-end"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        endDuty();
        window.setTimeout(() => setBusy(false), 800);
      }}
    >
      <span className="bell-dome" aria-hidden="true" />
      <span>근무 종료</span>
    </button>
  );
}

function EndCard() {
  const st = useGameStore();
  const p = selectProgress(st);
  const teaser = st.opened.includes('cr_c0408') || st.opened.includes('cr_c3391');
  return (
    <article className="dcard dc-end" data-testid="episode-end">
      <header className="dc-head">
        <span className="dc-code">에피소드 1</span>
        <span className="dc-kind">{EPISODE_1.title}</span>
      </header>
      <p className="dc-text">세 번의 밤이 끝났다. 기록은 돌아왔고, 그것을 기억하는 사람은 나 하나다.</p>
      <p className="dc-text dim">
        처리 {p.casesDone}건 · 필름 {p.frames}장
      </p>
      <p className="dc-todo" data-testid="teaser-note">
        {teaser ? '종결된 보고서 두 건이 더 있다. 07 의 관측 오류.' : '[업무] 종결된 보고서 2건이 새로 확인되었습니다 — 대조관 07 · 관측 오류.'}
      </p>
      <div className="end-actions">
        <button
          type="button"
          className="btn btn-primary"
          data-testid="open-teaser"
          onClick={() => {
            fx('tap');
            useUi.getState().setFilingTab('closed');
            openPanel('filing');
          }}
        >
          종결된 보고서 보기
        </button>
        <button type="button" className="btn" data-testid="open-ledger" onClick={() => (fx('tap'), openPanel('settings'))}>
          기록 열람 모드
        </button>
      </div>
    </article>
  );
}
