/**
 * 관측: 뷰어 + 시각 막대 + 필름. 코치마크 없음 — 「…」, 셔터 깜빡임, 밑줄이 가르친다.
 * 카메라가 멈추면(≈400ms) 본 것을 스토어에 알리고(reportView), 셔터는 지금 화면을 프레임으로 남긴다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findLine, timelineTicks } from '@/core/observation';
import { MAX_FRAMES } from '@/core/report';
import { ObservationViewer, type ViewerHandle } from '@/game/ObservationViewer';
import {
  DEFAULT_TIMELINE,
  selectAssignment,
  selectDegraded,
  selectFrames,
  selectNpcRoute,
  useGameStore,
  type Frame,
  type FrameView,
  type ViewerSnapshot,
} from '@/store/gameStore';
import { Polaroid } from '../components/Polaroid';
import { RichText } from '../components/RichText';
import { Sheet } from '../components/Sheet';
import { useBackHandler, useWidth } from '../hooks';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx, haptic } from '../lib/fx';
import { fmtMinute } from '../lib/text';

const TL = CONTENT.timelines.find((t) => t.id === DEFAULT_TIMELINE)!;
const SETTLE_MS = 400;

type Sheets = null | 'replace' | 'heard' | { frame: number };

export function ObserveApp() {
  const viewer = useRef<ViewerHandle>(null);
  const box = useRef<HTMLDivElement>(null);
  const st = useGameStore();
  const minute = st.obsMinute[TL.id] ?? TL.initial;
  const { frames } = selectFrames(st);
  const degraded = useMemo(() => selectDegraded(st), [st.degraded]); // eslint-disable-line react-hooks/exhaustive-deps
  const header = selectAssignment(st, CONTENT.assignments[0]!.id)?.header ?? [];
  const w = useWidth(box, 390);

  const [sheet, setSheet] = useState<Sheets>(null);
  const [pending, setPending] = useState<ViewerSnapshot | null>(null);
  const [note, setNote] = useState<{ text: string; n: number } | null>(null);
  const [blink, setBlink] = useState(0);
  const [route, setRoute] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [shot, setShot] = useState<ShotCard | null>(null);
  useBackHandler(sheet !== null, () => (setSheet(null), true));

  // 관측에 들어간다 / 나온다
  useEffect(() => {
    useGameStore.getState().startObservation(DEFAULT_TIMELINE);
    return () => useGameStore.getState().endObservation();
  }, []);

  // 카메라가 멈추면 본 것을 알린다
  useEffect(() => {
    let key = '';
    let changedAt = performance.now();
    let sent = false;
    const t = setInterval(() => {
      const h = viewer.current;
      const cam = h?.getCamera();
      if (!h || !cam) return;
      const m = useGameStore.getState().obsMinute[TL.id] ?? TL.initial;
      const k = `${cam.x.toFixed(1)}|${cam.y.toFixed(1)}|${cam.zoom.toFixed(3)}|${m}`;
      const now = performance.now();
      if (k !== key) {
        key = k;
        changedAt = now;
        sent = false;
      } else if (!sent && now - changedAt >= SETTLE_MS) {
        sent = true;
        const snap = h.snapshot();
        if (snap.minute >= 0) useGameStore.getState().reportView(snap);
      }
    }, 120);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4500);
    return () => clearTimeout(t);
  }, [note]);
  useEffect(() => {
    if (!blink) return;
    const t = setTimeout(() => setBlink(0), 6000);
    return () => clearTimeout(t);
  }, [blink]);
  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => setShot(null), 5200);
    return () => clearTimeout(t);
  }, [shot]);

  const onHear = useCallback((lineId: string) => {
    if (!useGameStore.getState().hearLine(lineId)) return;
    const f = findLine(CONTENT.npcs, lineId);
    if (!f) return;
    fx('hear');
    // 말풍선이 이미 보여 주므로 자막은 두지 않는다. 들은 말은 '들은 말' 목록에 쌓인다.
    setBlink(Date.now());
  }, []);

  const onTapHotspot = useCallback(() => {
    const t = useGameStore.getState().lastTap;
    if (!t) return;
    if (t.kind === 'npc') setRoute(t.targetId);
    const text = t.lines.map((l) => l.text).join(' ');
    if (text) setNote({ text, n: Date.now() });
  }, []);

  const scrub = useCallback((m: number) => {
    const h = viewer.current;
    if (h) h.setMinute(m);
    else useGameStore.getState().scrubObservation(m);
  }, []);

  const capture = () => {
    const h = viewer.current;
    const snap = h?.snapshot();
    if (!h || !snap || snap.minute < 0) return;
    const r = useGameStore.getState().captureFrame(snap);
    if (r.status === 'captured') {
      h.flashShutter();
      haptic('shutter');
      setBlink(0);
      setNote(null);
      setShot(describeShot(r.frame!, r.newClues.length > 0, useGameStore.getState().frames.length));
    } else if (r.status === 'full') {
      fx('capture_full');
      setShake((n) => n + 1);
      setPending(snap);
      setSheet('replace');
    } else {
      fx('capture_full');
      setNote({ text: r.message ?? '지금은 찍을 수 없다.', n: Date.now() });
    }
  };

  const replaceAt = (i: number) => {
    const snap = pending ?? viewer.current?.snapshot();
    if (!snap) return;
    const r = useGameStore.getState().replaceFrame(i, snap);
    if (r.status === 'replaced' || r.status === 'captured') {
      viewer.current?.flashShutter();
      if (r.frame) setShot(describeShot(r.frame, r.newClues.length > 0, useGameStore.getState().frames.length));
      haptic('shutter');
      setSheet(null);
      setPending(null);
    } else {
      fx('stamp_miss');
      setNote({ text: r.message ?? '바꿀 수 없다.', n: Date.now() });
      setSheet(null);
    }
  };

  const metaItems = TL.meta.map((m) => {
    const hv = m.label === '일시' ? header.find((h) => h.key === 'when')?.value : m.label === '장소' ? header.find((h) => h.key === 'place')?.value : undefined;
    const value = hv === undefined ? m.value : hv.startsWith('미확인') ? '미확인' : hv;
    return { label: m.label, value };
  });
  const routeInfo = route ? selectNpcRoute(st, route) : null;
  const wide = w >= 700;
  const heardCount = st.heard.filter((id) => findLine(CONTENT.npcs, id)?.line.speaker).length;

  return (
    <div className={`obs ${wide ? 'obs-wide' : ''}`} data-testid="app-observe" ref={box}>
      <div className="obs-meta" data-testid="obs-meta">
        {metaItems.map((m) => (
          <span key={m.label} className="obs-metum">
            <i>{m.label}</i>
            <b>{m.value}</b>
          </span>
        ))}
      </div>

      <div className="obs-view">
        <ObservationViewer
          ref={viewer}
          timelineId={TL.id}
          degraded={degraded}
          degradedLabel="좌표 고정 실패 구간"
          routeNpcId={route}
          onHear={onHear}
          onTapHotspot={onTapHotspot}
          onEmptyTap={() => useGameStore.getState().reportFail('empty_tap')}
        />
        <div className="obs-pill" aria-hidden="true">
          <i className="obs-dot" />
          관측 중
        </div>
        <div className="obs-zoom">
          <button type="button" className="round" data-testid="zoom-in" aria-label="확대" onClick={() => viewer.current?.zoomStep(1)}>
            ＋
          </button>
          <button type="button" className="round" data-testid="zoom-out" aria-label="축소" onClick={() => viewer.current?.zoomStep(-1)}>
            －
          </button>
        </div>
        {routeInfo && (
          <div className="obs-route" data-testid="obs-route">
            <span>{routeInfo.label} · 하루 동선</span>
            <button type="button" aria-label="동선 끄기" onClick={() => setRoute(null)}>
              ×
            </button>
          </div>
        )}
        <button type="button" className="obs-heard-btn" data-testid="heard-log-open" onClick={() => setSheet('heard')}>
          들은 말{heardCount > 0 ? ` ${heardCount}` : ''}
        </button>
        {note && (
          <p className="obs-note" key={note.n} role="status">
            {note.text}
          </p>
        )}
        {shot && (
          <div className={`obs-shot ${shot.empty ? 'empty' : ''}`} key={shot.n} role="status" data-testid="shot-card">
            {shot.thumb ? <img src={shot.thumb} alt="" draggable={false} /> : <i className="obs-shot-ph" />}
            <div className="obs-shot-body">
              <b>
                필름 {shot.count}/{MAX_FRAMES} · {fmtMinute(shot.minute)}
              </b>
              {shot.empty ? (
                <span data-testid="shot-empty">이 프레임에는 확인할 만한 것이 없다.</span>
              ) : (
                <>
                  {shot.who.length > 0 && <span className="obs-shot-who">{shot.who.join(' · ')}</span>}
                  {shot.lines.slice(0, 2).map((l, i) => (
                    <span key={i} className="obs-shot-line">
                      {l.speaker && <small>{l.speaker} </small>}「{l.text}」
                    </span>
                  ))}
                  {shot.lines.length === 0 && <span className="quiet">들린 말은 없다.</span>}
                </>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          className={`shutter ${blink ? 'blink' : ''}`}
          data-testid="shutter"
          aria-label="셔터"
          onClick={capture}
        >
          <Px k="ov_noise" scale={1} className="shutter-ring" />
          <span className="shutter-core" aria-hidden="true" />
        </button>
      </div>

      <div className="obs-ctl">
        <Scrubber minute={minute} degraded={degraded} onScrub={scrub} />
        <div className={`film ${shake ? 'film-shake' : ''}`} key={shake} data-testid="film">
          {Array.from({ length: MAX_FRAMES }, (_, i) => {
            const fv = frames[i];
            return fv ? (
              <Polaroid key={fv.frame.id} frame={fv.frame} index={i} lock={fv.protected} testId={`frame-${i}`} onClick={() => setSheet({ frame: i })} />
            ) : (
              <Polaroid key={`e${i}`} index={i} empty testId={`slot-${i}`} />
            );
          })}
        </div>
      </div>

      {sheet === 'replace' && (
        <Sheet title="필름이 가득 찼다 — 어느 장면을 바꿀까" onClose={() => (setSheet(null), setPending(null))} testId="replace-sheet" wide>
          <div className="attach-grid">
            {frames.map((fv, i) => (
              <Polaroid
                key={fv.frame.id}
                frame={fv.frame}
                index={i}
                lock={fv.protected}
                testId={`frame-replace-${i}`}
                onClick={() => replaceAt(i)}
              />
            ))}
          </div>
          <p className="quiet">잠긴 장면은 다시 찍을 수 없어 바꿀 수 없다.</p>
        </Sheet>
      )}
      {sheet === 'heard' && <HeardLog onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && frames[sheet.frame] && (
        <FrameSheet fv={frames[sheet.frame]!} onClose={() => setSheet(null)} />
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

/** 방금 찍은 프레임에 무엇이 담겼는지(누가 · 어떤 말) 한눈에. 아무것도 없으면 그렇게 말한다. */
function describeShot(frame: Frame, fresh: boolean, count: number): ShotCard {
  const lines = frame.heardLineIds
    .map((id) => findLine(CONTENT.npcs, id)?.line)
    .filter((l): l is NonNullable<typeof l> => !!l && !!l.speaker)
    .map((l) => ({ speaker: l.speaker, text: l.text.replace(/^[“"]|[”"]$/g, '') }));
  const who = frame.visibleHotspotIds
    .map((id) => CONTENT.npcs.find((n) => `hs_${n.id}` === id)?.label)
    .filter((x): x is string => !!x);
  void fresh;
  return {
    n: Date.now(),
    count,
    minute: frame.minute,
    thumb: frame.thumbDataUrl,
    who: [...new Set(who)],
    lines,
    empty: lines.length === 0 && frame.clueIds.length === 0,
  };
}

/** 지금까지 들은 말(밑줄 = 검색어). 말풍선이 사라진 뒤에도 다시 읽을 수 있다. */
function HeardLog({ onClose }: { onClose(): void }) {
  const heard = useGameStore((s) => s.heard);
  const rows = heard
    .map((id) => findLine(CONTENT.npcs, id))
    .filter((f): f is NonNullable<typeof f> => !!f && !!f.line.speaker);
  return (
    <Sheet title="들은 말" onClose={onClose} testId="heard-log">
      {rows.length === 0 && <p className="quiet">아직 들은 말이 없다. 말하는 사람(「…」)에게 다가가 확대해 보자.</p>}
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
      {msg && (
        <p className="check-msg" role="status">
          {msg}
        </p>
      )}
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
        {fv.protected ? '🔒 다시 찍을 수 없는 장면' : '이 칸 비우기'}
      </button>
    </Sheet>
  );
}

// ── 시각 막대 ──────────────────────────────────────────────────
function Scrubber({ minute, degraded, onScrub }: { minute: number; degraded: { from: number; to: number }[]; onScrub(m: number): void }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const raf = useRef(0);
  const want = useRef<number | null>(null);
  const flags = useGameStore((s) => s.flags);
  const ticks = useMemo(() => timelineTicks(TL, CONTENT, flags), [flags]);
  const span = TL.end - TL.start;
  const pct = (m: number) => ((m - TL.start) / span) * 100;

  const push = (m: number) => {
    const c = Math.max(TL.start, Math.min(TL.end, Math.round(m)));
    want.current = c;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const v = want.current;
      want.current = null;
      if (v === null) return;
      if (Math.floor(v / 60) !== Math.floor(minute / 60)) fx('scrub_tick');
      onScrub(v);
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const at = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    return TL.start + Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width))) * span;
  };
  const step = (d: number) => {
    fx('scrub_tick');
    const cur = useGameStore.getState().obsMinute[TL.id] ?? TL.initial;
    onScrub(Math.max(TL.start, Math.min(TL.end, cur + d)));
  };
  const hold = useRef<number>(0);
  const holdStep = (d: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    step(d);
    window.clearTimeout(hold.current);
    hold.current = window.setTimeout(function rep() {
      step(d);
      hold.current = window.setTimeout(rep, 90);
    }, 420);
  };
  const release = () => window.clearTimeout(hold.current);
  useEffect(() => () => window.clearTimeout(hold.current), []);

  return (
    <div className="scrub" data-testid="scrub">
      <button type="button" className="round" data-testid="scrub-prev" aria-label="5분 전" onClick={(e) => e.detail === 0 && step(-5)} onPointerDown={holdStep(-5)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
        ◀
      </button>
      <div
        className="scrub-track"
        ref={track}
        data-testid="scrubber"
        role="slider"
        tabIndex={0}
        aria-label="시각"
        aria-valuemin={TL.start}
        aria-valuemax={TL.end}
        aria-valuenow={minute}
        aria-valuetext={fmtMinute(minute)}
        onPointerDown={(e) => {
          drag.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          push(at(e.clientX));
        }}
        onPointerMove={(e) => drag.current && push(at(e.clientX))}
        onPointerUp={() => (drag.current = false)}
        onPointerCancel={() => (drag.current = false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') (e.preventDefault(), step(-5));
          else if (e.key === 'ArrowRight') (e.preventDefault(), step(5));
          else if (e.key === 'PageDown') (e.preventDefault(), step(-30));
          else if (e.key === 'PageUp') (e.preventDefault(), step(30));
        }}
      >
        <div className="scrub-rail" />
        <div className="scrub-fill" style={{ width: `${pct(minute)}%` }} />
        {degraded.map((d, i) => (
          <i key={i} className="scrub-bad" style={{ left: `${pct(Math.max(d.from, TL.start))}%`, width: `${pct(Math.min(d.to, TL.end)) - pct(Math.max(d.from, TL.start))}%` }} />
        ))}
        {ticks.map((t, i) => (
          <i key={`${t.minute}-${i}`} className={`scrub-tick tick-${t.kind}`} style={{ left: `${pct(t.minute)}%` }} />
        ))}
        {[9, 12, 15, 18].map((h) => (
          <em key={h} className="scrub-hour" style={{ left: `${pct(h * 60)}%` }}>
            {h}
          </em>
        ))}
        <span className="scrub-knob" style={{ left: `${pct(minute)}%` }} />
      </div>
      <button type="button" className="round" data-testid="scrub-next" aria-label="5분 뒤" onClick={(e) => e.detail === 0 && step(5)} onPointerDown={holdStep(5)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
        ▶
      </button>
      <output className="scrub-time" data-testid="scrub-time">
        {fmtMinute(minute)}
      </output>
    </div>
  );
}
