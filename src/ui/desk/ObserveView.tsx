/**
 * 관측 화면(뷰어 + 시간 막대 + 셔터). 책상의 관측 창(case)과 관측기 로그 재생(film)이 같이 쓴다.
 * 코치마크 없음 — 들린 말·눈금·셔터 깜빡임이 가르친다. 카메라가 멈추면(≈400ms) 본 것을 스토어에 알린다(reportView).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { findLine, timelineTicks } from '@/core/observation';
import { ObservationViewer, type ViewerHandle } from '@/game/ObservationViewer';
import { selectDegraded, selectFrames, selectObservationRange, useGameStore, type Frame, type ViewerSnapshot } from '@/store/gameStore';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fmtMinute, stepFor, viewerCall } from '../lib/desk';
import { fx, haptic } from '../lib/fx';
import { useUi } from '../uiStore';

const SETTLE_MS = 400;

export interface ObserveViewProps {
  timelineId: string;
  /** case: 책상 위 건의 관측 창(셔터 = 근거 프레임) · film: 관측기 로그 재생(셔터 = 필름) */
  mode: 'case' | 'film';
  /** 셔터를 보인다(case: 규정 4조 뒤) */
  shutter: boolean;
  expanded?: boolean;
  onToggleExpand?(): void;
  /** 필름이 가득 찼을 때 어느 장면을 바꿀지 묻는다 */
  onFull?(snap: ViewerSnapshot): void;
  /** 필름에 찍혔다(연출용) */
  onShot?(frame: Frame, newClues: number): void;
  children?: ReactNode;
}

export function ObserveView({ timelineId, mode, shutter, expanded, onToggleExpand, onFull, onShot, children }: ObserveViewProps) {
  const viewer = useRef<ViewerHandle>(null);
  const st = useGameStore();
  const tl = CONTENT.timelines.find((t) => t.id === timelineId)!;
  const range = selectObservationRange(st) ?? { from: tl.start, to: tl.end };
  const minute = st.obsMinute[tl.id] ?? tl.initial;
  const degraded = useMemo(() => (tl.id === 'tl_obs001' ? selectDegraded(st) : []), [st.degraded, tl.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [wide, setWide] = useState(false);
  const [blink, setBlink] = useState(0);
  const [note, setNote] = useState<{ text: string; n: number } | null>(null);
  const [shot, setShot] = useState<{ n: number; thumb?: string; minute: number; text: string } | null>(null);

  // 관측에 들어간다(책상 위 건). 재생은 openReplay 가 이미 열어 두었다.
  useEffect(() => {
    if (mode !== 'case') return;
    const g = useGameStore.getState();
    if (g.ui.observation?.timelineId !== timelineId) g.startObservation(timelineId);
  }, [timelineId, mode]);

  // 좁은 세로 화면의 관측 창은 처음부터 말하는 인물 쪽으로(전체 화면은 인물이 너무 작다). 전체/말하는 이 버튼으로 오간다.
  useEffect(() => {
    if (mode !== 'case') return;
    const narrow = typeof window !== 'undefined' && window.innerWidth < 700 && window.innerHeight >= window.innerWidth;
    const t = window.setTimeout(() => {
      setWide(!narrow);
      if (narrow) viewerCall(viewer.current, 'focusSpeaker');
      else viewerCall(viewer.current, 'fitToScene');
    }, 60);
    return () => window.clearTimeout(t);
  }, [timelineId, mode]);

  // 카메라가 멈추면 본 것을 알린다
  useEffect(() => {
    let key = '';
    let changedAt = performance.now();
    let sent = false;
    const t = setInterval(() => {
      const h = viewer.current;
      const cam = h?.getCamera();
      if (!h || !cam) return;
      const m = useGameStore.getState().obsMinute[tl.id] ?? tl.initial;
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
  }, [tl.id, tl.initial]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 4200);
    return () => clearTimeout(t);
  }, [note]);
  useEffect(() => {
    if (!blink) return;
    const t = setTimeout(() => setBlink(0), 6000);
    return () => clearTimeout(t);
  }, [blink]);
  useEffect(() => {
    if (!shot) return;
    const t = setTimeout(() => setShot(null), 2600);
    return () => clearTimeout(t);
  }, [shot]);

  const onHear = useCallback((lineId: string) => {
    if (!useGameStore.getState().hearLine(lineId)) return;
    if (!findLine(CONTENT.npcs, lineId)) return;
    fx('hear');
    setBlink(Date.now());
  }, []);

  const onTapHotspot = useCallback(() => {
    const t = useGameStore.getState().lastTap;
    if (!t) return;
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
    if (r.status === 'captured' || r.status === 'replaced') {
      h.flashShutter();
      haptic('shutter');
      setBlink(0);
      setNote(null);
      if (r.target === 'case') {
        setShot({ n: Date.now(), thumb: r.frame?.thumbDataUrl, minute: r.frame?.minute ?? 0, text: '근거 프레임을 카드에 붙였다' });
        useUi.getState().cardSay('근거 프레임을 붙였다', 'info');
      } else if (r.frame) onShot?.(r.frame, r.newClues.length);
    } else if (r.status === 'full') {
      fx('capture_full');
      onFull?.(snap);
    } else {
      fx('stamp_miss');
      setNote({ text: r.message ?? '지금은 찍을 수 없다.', n: Date.now() });
    }
  };

  return (
    <div className={`obsv ${expanded ? 'expanded' : ''} obsv-${mode}`} data-testid="observe-view" data-minute={minute} data-timeline={timelineId}>
      <div className="obsv-screen">
        <ObservationViewer
          ref={viewer}
          timelineId={tl.id}
          degraded={degraded}
          degradedLabel="좌표 고정 실패 구간"
          routeNpcId={mode === 'film' ? undefined : null}
          onHear={onHear}
          onTapHotspot={onTapHotspot}
          onEmptyTap={() => useGameStore.getState().reportFail('empty_tap')}
        />
        <div className="obsv-pill" aria-hidden="true">
          <i className="obs-dot" />
          <span>관측 중</span>
          <b>{fmtMinute(minute)}</b>
        </div>
        <div className="obsv-tools">
          {onToggleExpand && (
            <button type="button" className="round" data-testid="obs-expand" aria-label={expanded ? '관측 창 줄이기' : '관측 창 크게'} aria-pressed={!!expanded} onClick={() => (fx('tap'), onToggleExpand())}>
              {expanded ? '▣' : '⛶'}
            </button>
          )}
          <button type="button" className="round" data-testid="zoom-in" aria-label="확대" onClick={() => (fx('tap'), viewer.current?.zoomStep(1))}>
            ＋
          </button>
          <button type="button" className="round" data-testid="zoom-out" aria-label="축소" onClick={() => (fx('tap'), viewer.current?.zoomStep(-1))}>
            －
          </button>
          <button
            type="button"
            className="round round-text"
            data-testid="obs-fit"
            aria-label={wide ? '말하는 이 보기' : '장면 전체 보기'}
            onClick={() => {
              fx('tap');
              if (wide) viewerCall(viewer.current, 'focusSpeaker') || viewer.current?.zoomStep(1);
              else viewerCall(viewer.current, 'fitToScene') || viewer.current?.zoomTo(0.01);
              setWide(!wide);
            }}
          >
            {wide ? '인물' : '전체'}
          </button>
        </div>
        {note && (
          <p className="obsv-note" key={note.n} role="status">
            {note.text}
          </p>
        )}
        {shot && (
          <div className="obsv-shot" key={shot.n} role="status" data-testid="shot-card">
            {shot.thumb ? <img src={shot.thumb} alt="" draggable={false} /> : <i className="obs-shot-ph" />}
            <span>
              <b>{fmtMinute(shot.minute)}</b>
              {shot.text}
            </span>
          </div>
        )}
        {shutter && (
          <button type="button" className={`shutter ${blink ? 'blink' : ''}`} data-testid="shutter" aria-label="셔터" onClick={capture}>
            <Px k="ov_noise" scale={1} className="shutter-ring" />
            <span className="shutter-core" aria-hidden="true" />
          </button>
        )}
      </div>
      <Scrubber tlId={tl.id} minute={minute} range={range} degraded={degraded} onScrub={scrub} />
      {children}
    </div>
  );
}

// ── 시간 막대 ──────────────────────────────────────────────────
export function Scrubber({
  tlId,
  minute,
  range,
  degraded,
  onScrub,
}: {
  tlId: string;
  minute: number;
  range: { from: number; to: number };
  degraded: { from: number; to: number }[];
  onScrub(m: number): void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const raf = useRef(0);
  const want = useRef<number | null>(null);
  const flags = useGameStore((s) => s.flags);
  const tl = CONTENT.timelines.find((t) => t.id === tlId)!;
  const ticks = useMemo(() => timelineTicks(tl, CONTENT, flags).filter((t) => t.minute >= range.from && t.minute <= range.to), [tl, flags, range.from, range.to]);
  const span = Math.max(1, range.to - range.from);
  const stepSize = stepFor(span);
  const pct = (m: number) => ((m - range.from) / span) * 100;
  const clampM = (m: number) => Math.max(range.from, Math.min(range.to, Math.round(m)));
  const minRef = useRef(minute);
  minRef.current = minute;

  const push = (m: number) => {
    const c = clampM(m);
    want.current = c;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const v = want.current;
      want.current = null;
      if (v === null) return;
      if (v !== minRef.current) fx('scrub_tick');
      onScrub(v);
    });
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const at = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    return range.from + Math.max(0, Math.min(1, (x - r.left) / Math.max(1, r.width))) * span;
  };
  const step = (d: number) => {
    fx('scrub_tick');
    const cur = useGameStore.getState().obsMinute[tlId] ?? tl.initial;
    onScrub(clampM(cur + d));
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

  // 눈금 글자: 긴 구간은 정각, 짧은 구간은 양 끝
  const labels: number[] = [];
  if (span >= 180) {
    const every = span > 480 ? 3 : 1;
    for (let h = Math.ceil(range.from / 60); h * 60 <= range.to; h++) if (h % every === 0 || span <= 240) labels.push(h * 60);
  } else {
    labels.push(range.from, range.to);
  }

  return (
    <div className="scrub" data-testid="scrub">
      <button type="button" className="round" data-testid="scrub-prev" aria-label={`${stepSize}분 전`} onClick={(e) => e.detail === 0 && step(-stepSize)} onPointerDown={holdStep(-stepSize)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
        ◀
      </button>
      <div
        className="scrub-track"
        ref={track}
        data-testid="scrubber"
        role="slider"
        tabIndex={0}
        aria-label="시각"
        aria-valuemin={range.from}
        aria-valuemax={range.to}
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
          if (e.key === 'ArrowLeft') (e.preventDefault(), step(-stepSize));
          else if (e.key === 'ArrowRight') (e.preventDefault(), step(stepSize));
          else if (e.key === 'PageDown') (e.preventDefault(), step(-stepSize * 6));
          else if (e.key === 'PageUp') (e.preventDefault(), step(stepSize * 6));
        }}
      >
        <div className="scrub-rail" />
        <div className="scrub-fill" style={{ width: `${pct(minute)}%` }} />
        {degraded.map((d, i) => {
          const a = Math.max(d.from, range.from);
          const b = Math.min(d.to, range.to);
          return b > a ? <i key={i} className="scrub-bad" style={{ left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%` }} /> : null;
        })}
        {ticks.map((t, i) => (
          <i key={`${t.minute}-${t.kind}-${i}`} className={`scrub-tick tick-${t.kind}`} style={{ left: `${pct(t.minute)}%` }} />
        ))}
        {labels.map((m) => (
          <em key={m} className="scrub-hour" style={{ left: `${pct(m)}%` }}>
            {span >= 180 ? Math.floor(m / 60) : fmtMinute(m)}
          </em>
        ))}
        <span className="scrub-knob" style={{ left: `${pct(minute)}%` }} />
      </div>
      <button type="button" className="round" data-testid="scrub-next" aria-label={`${stepSize}분 뒤`} onClick={(e) => e.detail === 0 && step(stepSize)} onPointerDown={holdStep(stepSize)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release}>
        ▶
      </button>
      <output className="scrub-time" data-testid="scrub-time">
        {fmtMinute(minute)}
      </output>
    </div>
  );
}

export { selectFrames };
