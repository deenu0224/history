/**
 * 관측 · 관측기 로그: 종결된 #C-2217 의 관측 데이터는 소실의 영향을 받지 않는다. 구간을 골라 재생한다 — 근무 시간을 쓴다(구간당 60분).
 * 재생 전에 값을 보여 주고 확인을 받는다. 재생 중에는 확대·엿듣기·셔터(필름 6장). 시간 막대는 그 구간 안으로만 움직인다.
 */
import { useState } from 'react';
import { findLine } from '@/core/observation';
import { MAX_FRAMES } from '@/core/report';
import type { ViewerSnapshot } from '@/core/report';
import {
  selectClosedReports,
  selectFrames,
  selectReplay,
  selectDesk,
  useGameStore,
  type Frame,
  type FrameView,
} from '@/store/gameStore';
import { Polaroid } from '../components/Polaroid';
import { RichText } from '../components/RichText';
import { Sheet } from '../components/Sheet';
import { CONTENT } from '../lib/content';
import { fmtMinute, fmtSpan } from '../lib/desk';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { ObserveView } from './ObserveView';

export function LogPanel() {
  const st = useGameStore();
  const replaying = !!st.duty.replay && !!st.ui.observation;
  return replaying ? <ReplayRoom /> : <LogList />;
}

function LogList() {
  const st = useGameStore();
  const replay = selectReplay(st);
  const desk = selectDesk(st);
  const [pending, setPending] = useState<string | null>(null);
  const mine = selectClosedReports(st).find((r) => !r.current && r.code === '#C-2217');
  const today = selectClosedReports(st).find((r) => r.current && r.code === '#C-2217');
  const { frames } = selectFrames(st);
  const win = replay.windows.find((w) => w.id === pending);
  const open = pending ? replay.windows.find((w) => w.id === pending) : undefined;
  void win;

  const go = () => {
    if (!pending) return;
    const r = useGameStore.getState().openReplay(pending);
    setPending(null);
    if (r.status === 'opened') fx('page');
    else {
      fx('stamp_miss');
      useUi.getState().say(r.message ?? '지금은 재생할 수 없다.');
    }
  };

  if (!replay.caseId)
    return (
      <div className="log" data-testid="app-log">
        <p className="quiet pad">관측기 로그에 보존된 종결 건이 아직 없다.</p>
      </div>
    );

  return (
    <div className="log" data-testid="app-log">
      <section className="log-entry" data-testid="log-entry">
        <h3>
          #C-2217 <small>관측 오류 · 종결</small>
        </h3>
        <p className="quiet">관측 데이터 보존 중 · 보존 30일 · 열람 {st.duty.replays.length}회. 관측기 로그는 소실의 영향을 받지 않는다.</p>
        {today && (
          <p className="log-line">
            {today.when} · {today.verdict} · {today.classification}
          </p>
        )}
        {mine && (
          <div className="log-mine" data-testid="log-mine">
            <b>{mine.when} · 내 소견</b>
            <p>
              <RichText text={mine.note} plainTerms />
            </p>
          </div>
        )}
      </section>

      <section className="log-windows">
        <h4>재생 구간</h4>
        {replay.violation && (
          <p className="log-violation" data-testid="log-violation">
            규정 5조 — 종결 건 재관측은 경고 대상이다. 재생마다 경고장이 나온다.
          </p>
        )}
        {!desk.shift && <p className="quiet">근무 중에만 재생할 수 있다.</p>}
        <div className="win-grid">
          {replay.windows.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`rwin ${w.degraded ? 'degraded' : ''} ${replay.violation ? 'violation' : ''}`}
              data-testid={`replay-${w.id}`}
              disabled={!replay.available || !w.affordable}
              onClick={() => (fx('tap'), setPending(w.id))}
            >
              <b>{w.label}</b>
              <small>−{replay.costMinutes}분{w.degraded ? ' · 흐림' : ''}</small>
              {!w.affordable && <small>시간이 모자란다</small>}
            </button>
          ))}
        </div>
        {!replay.available && <p className="quiet">종결 건 재생은 근무 2 부터 열린다.</p>}
      </section>

      {frames.length > 0 && (
        <section className="log-film">
          <h4>필름 {frames.length}/{MAX_FRAMES}</h4>
          <div className="film" data-testid="film-list">
            {frames.map((fv, i) => (
              <Polaroid key={fv.frame.id} frame={fv.frame} index={i} lock={fv.protected} testId={`frame-${i}`} />
            ))}
          </div>
        </section>
      )}

      {open && (
        <Sheet title="관측기 로그 재생" onClose={() => setPending(null)} testId="replay-confirm-sheet">
          <p className="rc-win">
            <b>{open.label}</b> 구간을 재생한다.
          </p>
          <ul className="rc-costs">
            <li data-testid="replay-cost">
              근무 시간 <b>{fmtSpan(replay.costMinutes)}</b>을 쓴다.
            </li>
            <li>
              지금 남은 시간 <b>{fmtSpan(replay.minutesLeft)}</b> → <b>{fmtSpan(replay.minutesLeft - replay.costMinutes)}</b>
            </li>
            {replay.violation && <li className="rc-warn">규정 5조 위반 — 경고장 1장이 나온다.</li>}
            {open.degraded && <li>이 구간은 흐려진 부분이 있다. 흐린 곳은 찍히지 않는다.</li>}
          </ul>
          <div className="rc-actions">
            <button type="button" className="btn btn-primary btn-big" data-testid="replay-confirm" onClick={go}>
              재생한다
            </button>
            <button type="button" className="btn btn-big" data-testid="replay-cancel" onClick={() => setPending(null)}>
              그만둔다
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

interface ShotCard {
  n: number;
  count: number;
  minute: number;
  thumb?: string;
  who: string[];
  lines: { speaker?: string; text: string }[];
  empty: boolean;
}

function describeShot(frame: Frame, count: number): ShotCard {
  const lines = frame.heardLineIds
    .map((id) => findLine(CONTENT.npcs, id)?.line)
    .filter((l): l is NonNullable<typeof l> => !!l && !!l.speaker)
    .map((l) => ({ speaker: l.speaker, text: l.text.replace(/^[“"]|[”"]$/g, '') }));
  const who = frame.visibleHotspotIds.map((id) => CONTENT.npcs.find((n) => `hs_${n.id}` === id)?.label).filter((x): x is string => !!x);
  return { n: Date.now(), count, minute: frame.minute, thumb: frame.thumbDataUrl, who: [...new Set(who)], lines, empty: lines.length === 0 && frame.clueIds.length === 0 };
}

function ReplayRoom() {
  const st = useGameStore();
  const rp = st.duty.replay!;
  const cd = CONTENT.cases.find((c) => c.id === rp.caseId)!;
  const win = cd.replay?.windows.find((w) => w.id === rp.windowId);
  const { frames } = selectFrames(st);
  const [sheet, setSheet] = useState<null | 'replace' | 'heard' | { frame: number }>(null);
  const [pendingSnap, setPendingSnap] = useState<ViewerSnapshot | null>(null);
  const [shot, setShot] = useState<ShotCard | null>(null);
  const [shake, setShake] = useState(0);

  const exit = () => {
    fx('page');
    useGameStore.getState().endObservation();
  };
  const replaceAt = (i: number) => {
    const snap = pendingSnap;
    if (!snap) return;
    const r = useGameStore.getState().replaceFrame(i, snap);
    if ((r.status === 'replaced' || r.status === 'captured') && r.frame) setShot(describeShot(r.frame, useGameStore.getState().frames.length));
    else {
      fx('stamp_miss');
      useUi.getState().say(r.message ?? '바꿀 수 없다.');
    }
    setSheet(null);
    setPendingSnap(null);
  };
  const heardCount = st.heard.filter((id) => findLine(CONTENT.npcs, id)?.line.speaker).length;

  return (
    <div className="replay" data-testid="app-replay">
      <header className="replay-head">
        <div>
          <b>재생 · {win?.label ?? ''}</b>
          <small>근무 시계가 이미 넘어갔다. 이 구간 밖으로는 볼 수 없다.</small>
        </div>
        <button type="button" className="btn btn-small" data-testid="replay-exit" onClick={exit}>
          재생 끝내기
        </button>
      </header>
      <div className="replay-view">
        <ObserveView
          timelineId={cd.timelineId!}
          mode="film"
          shutter
          onFull={(snap) => {
            setPendingSnap(snap);
            setShake((n) => n + 1);
            setSheet('replace');
          }}
          onShot={(f) => setShot(describeShot(f, useGameStore.getState().frames.length))}
        >
          <div className="replay-under">
            <button type="button" className="btn btn-small" data-testid="heard-log-open" onClick={() => setSheet('heard')}>
              들은 말{heardCount > 0 ? ` ${heardCount}` : ''}
            </button>
            {shot && (
              <div className={`replay-shot ${shot.empty ? 'empty' : ''}`} key={shot.n} role="status" data-testid="shot-card">
                {shot.thumb ? <img src={shot.thumb} alt="" draggable={false} /> : <i className="obs-shot-ph" />}
                <span>
                  <b>
                    필름 {shot.count}/{MAX_FRAMES} · {fmtMinute(shot.minute)}
                  </b>
                  {shot.empty ? (
                    <span data-testid="shot-empty">이 프레임에는 확인할 만한 것이 없다.</span>
                  ) : (
                    <>
                      {shot.who.length > 0 && <span>{shot.who.join(' · ')}</span>}
                      {shot.lines.slice(0, 2).map((l, i) => (
                        <span key={i}>
                          {l.speaker && <small>{l.speaker} </small>}「{l.text}」
                        </span>
                      ))}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className={`film ${shake ? 'film-shake' : ''}`} key={shake} data-testid="film">
            {Array.from({ length: MAX_FRAMES }, (_, i) => {
              const fv = frames[i];
              return fv ? <Polaroid key={fv.frame.id} frame={fv.frame} index={i} lock={fv.protected} testId={`frame-${i}`} onClick={() => setSheet({ frame: i })} /> : <Polaroid key={`e${i}`} index={i} empty testId={`slot-${i}`} />;
            })}
          </div>
        </ObserveView>
      </div>
      {sheet === 'replace' && (
        <Sheet title="필름이 가득 찼다 — 어느 장면을 바꿀까" onClose={() => (setSheet(null), setPendingSnap(null))} testId="replace-sheet" wide>
          <div className="attach-grid">
            {frames.map((fv, i) => (
              <Polaroid key={fv.frame.id} frame={fv.frame} index={i} lock={fv.protected} testId={`frame-replace-${i}`} onClick={() => replaceAt(i)} />
            ))}
          </div>
          <p className="quiet">잠긴 장면은 다시 찍을 수 없어 바꿀 수 없다.</p>
        </Sheet>
      )}
      {sheet === 'heard' && <HeardLog onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && frames[sheet.frame] && <FrameSheet fv={frames[sheet.frame]!} onClose={() => setSheet(null)} />}
    </div>
  );
}

function HeardLog({ onClose }: { onClose(): void }) {
  const heard = useGameStore((s) => s.heard);
  const rows = heard.map((id) => findLine(CONTENT.npcs, id)).filter((f): f is NonNullable<typeof f> => !!f && !!f.line.speaker);
  return (
    <Sheet title="들은 말" onClose={onClose} testId="heard-log">
      {rows.length === 0 && <p className="quiet">아직 들은 말이 없다. 말하는 사람에게 다가가 확대해 보자.</p>}
      {rows.map(({ line }) => (
        <p key={line.id} className="frame-line" data-testid={`heard-${line.id}`}>
          {line.speaker && <small>{line.speaker}</small>}「<RichText text={line.text} />」
        </p>
      ))}
    </Sheet>
  );
}

function FrameSheet({ fv, onClose }: { fv: FrameView; onClose(): void }) {
  const [msg, setMsg] = useState('');
  return (
    <Sheet title={`프레임 ${fmtMinute(fv.frame.minute)}`} onClose={onClose} testId="frame-sheet">
      <div className="frame-big">
        <Polaroid frame={fv.frame} lock={fv.protected} className="pol-lg" />
        <div className="frame-lines">
          {fv.lines.length === 0 && <p className="quiet">들린 말이 없는 장면.</p>}
          {fv.lines.map((l) => (
            <p key={l.id} className="frame-line">
              {l.speaker && <small>{l.speaker}</small>}
              {l.text.startsWith('(') ? <i>{l.text}</i> : <>「<RichText text={l.text} />」</>}
            </p>
          ))}
        </div>
      </div>
      {msg && <p className="check-msg" role="status">{msg}</p>}
      <button
        type="button"
        className="btn btn-big"
        data-testid="frame-remove"
        onClick={() => {
          const r = useGameStore.getState().removeFrame(fv.frame.id);
          if (r.status === 'removed') onClose();
          else setMsg(r.message ?? '비울 수 없다.');
        }}
      >
        {fv.protected ? '다시 찍을 수 없는 장면' : '이 칸 비우기'}
      </button>
    </Sheet>
  );
}
