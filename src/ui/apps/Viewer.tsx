/** 관측 뷰어: 메타데이터(연도 ####) · 디오라마(<ObservationViewer/>) · 시간 스크러버 · 탭 결과 · 보이는 것 목록. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bus } from '@/core/bus';
import { formatClock } from '@/core/observation';
import { selectNpcRoute, selectTimelineTicks, selectViewerFrame, useGameStore, type TapResult } from '@/store/gameStore';
import { ObservationViewer, type ViewerHandle } from '@/game/ObservationViewer';
import { playSfx } from '@/game/audio';
import { Px } from '../lib/art';
import { CONTENT, IDX } from '../lib/content';
import { fx } from '../lib/fx';
import { describeRewards } from '../lib/rewards';
import { prefersReducedMotion, useLayout, useWidth } from '../hooks';

const TL_ID = 'tl_obs001';

export function Viewer() {
  const observing = useGameStore((s) => s.ui.observation);
  const done = useGameStore((s) => s.observations.length > 0);
  const start = useGameStore((s) => s.startObservation);
  const tl = IDX.timelines[TL_ID]!;
  if (!observing)
    return (
      <div className="viewer-intro" data-testid="app-viewer">
        <MetaPanel />
        <div className="intro-card">
          <Px k="app_observe" scale={3} />
          <p>{done ? '지난 관측을 다시 볼 수 있습니다. 마지막으로 본 시각에서 이어집니다.' : '관측 지점이 열려 있습니다.'}</p>
          <button
            className="btn btn-primary btn-big"
            data-testid="viewer-start"
            onClick={() => {
              if (start(tl.id)) {
                playSfx('observe');
                bus.emit('glitch', { intensity: 0.8, ms: 900 });
              }
            }}
          >
            {done ? '다시 관측' : '관측 시작'}
          </button>
        </div>
      </div>
    );
  return <Observing timelineId={observing.timelineId} />;
}

function MetaPanel({ compact = false }: { compact?: boolean }) {
  const tl = IDX.timelines[TL_ID]!;
  return (
    <dl className={`meta ${compact ? 'meta-compact' : ''}`} data-testid="meta-panel">
      {tl.meta.map((m) => (
        <div key={m.label}>
          <dt>{m.label}</dt>
          <dd>{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Observing({ timelineId }: { timelineId: string }) {
  const tl = IDX.timelines[timelineId]!;
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root, 360);
  const { short } = useLayout();
  const wide = width >= 720 || short;
  const scrubUnder = wide && !short;
  const viewer = useRef<ViewerHandle>(null);
  const end = useGameStore((s) => s.endObservation);
  const lastTap = useGameStore((s) => s.lastTap);
  const [routeNpc, setRouteNpc] = useState<string | null | undefined>(undefined);

  // 탭 결과가 새로 오면 촉감 피드백
  const prevTap = useRef<TapResult | null>(lastTap);
  useEffect(() => {
    if (lastTap && lastTap !== prevTap.current) {
      if (lastTap.kind === 'npc') setRouteNpc(lastTap.targetId);
    }
    prevTap.current = lastTap;
  }, [lastTap]);

  const finish = () => {
    fx('tap');
    end();
    playSfx('return');
    bus.emit('glitch', { intensity: 0.8, ms: 900 });
  };

  return (
    <div className={`viewer ${wide ? 'viewer-wide' : ''}`} ref={root} data-testid="app-viewer">
      <div className="viewer-main">
        <div className="viewer-top">
          <span className="obs-pill" data-testid="observing-pill">
            <span className="obs-dot">
              <Px k="ov_observing_dot" scale={1} frame={0} />
              <Px k="ov_observing_dot" scale={1} frame={1} />
            </span>
            관측 중
          </span>
          <MetaPanel compact />
          <button className="btn btn-small" data-testid="viewer-end" data-coach="viewer.end" onClick={finish}>
            관측 종료
          </button>
        </div>
        <div className="stage-box">
          <ObservationViewer
            ref={viewer}
            timelineId={timelineId}
            className="viewer-canvas"
            routeNpcId={routeNpc}
            onEmptyTap={() => useGameStore.getState().reportFail('empty_tap')}
          />
          <div className="vf" aria-hidden="true" />
          <NoiseLayer />
          <div className="zoom-btns">
            <button aria-label="확대" data-testid="zoom-in" onClick={() => viewer.current?.zoomStep(1)}>
              ＋
            </button>
            <button aria-label="축소" data-testid="zoom-out" onClick={() => viewer.current?.zoomStep(-1)}>
              －
            </button>
          </div>
        </div>
        {scrubUnder && <Scrubber tlId={tl.id} />}
      </div>
      <div className="viewer-side">
        {!scrubUnder && <Scrubber tlId={tl.id} />}
        <TapPanel tap={lastTap} />
        {lastTap?.kind === 'npc' && <RoutePanel npcId={lastTap.targetId} />}
        <HotspotList onPick={(id) => viewer.current?.focusHotspot(id)} open={wide} />
      </div>
    </div>
  );
}

/** 인물을 탭하면 그 사람의 하루 길(머문 시각)을 보여 준다. 시각을 누르면 그때로 옮긴다. 장면 위 점선은 뷰어가 그린다. */
function RoutePanel({ npcId }: { npcId: string }) {
  const minute = useGameStore((s) => s.obsMinute[TL_ID] ?? 0);
  const scrub = useGameStore((s) => s.scrubObservation);
  const route = useMemo(
    () => selectNpcRoute(useGameStore.getState(), npcId, CONTENT, TL_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [npcId, minute],
  );
  if (!route || route.points.length < 2) return null;
  return (
    <div className="route-panel" data-testid="route-panel">
      <span className="route-title">{route.label}의 하루 길</span>
      <ol>
        {route.points.map((p, i) => (
          <li key={p.minute}>
            <button
              type="button"
              className={`route-stop ${i === route.current ? 'on' : ''}`}
              aria-current={i === route.current ? 'step' : undefined}
              data-testid={`route-stop-${p.minute}`}
              onClick={() => {
                fx('tap');
                scrub(p.minute);
              }}
            >
              {formatClock(p.minute)}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NoiseLayer() {
  const g = useGameStore((s) => selectViewerFrame(s, CONTENT)?.glitch ?? 0);
  const flick = useGameStore((s) => s.settings.reduceFlicker);
  const [f, setF] = useState(0);
  useEffect(() => {
    if (g <= 0 || flick || prefersReducedMotion()) return;
    const t = setInterval(() => setF((n) => (n + 1) % 4), 110);
    return () => clearInterval(t);
  }, [g, flick]);
  if (g <= 0) return null;
  return (
    <div className="noise" style={{ opacity: flick ? g * 0.2 : g * 0.55 }} aria-hidden="true">
      <Px k="ov_noise" scale={1} frame={f} className="noise-img" />
    </div>
  );
}

function Scrubber({ tlId }: { tlId: string }) {
  const tl = IDX.timelines[tlId]!;
  const minute = useGameStore((s) => s.obsMinute[tlId] ?? tl.initial);
  const scrub = useGameStore((s) => s.scrubObservation);
  const track = useRef<HTMLDivElement>(null);
  const bucket = useRef(Math.floor(minute / 15));
  const [playing, setPlaying] = useState(false);
  const flags = useGameStore((s) => s.flags);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ticks = useMemo(() => selectTimelineTicks(useGameStore.getState(), CONTENT, tlId), [flags, tlId]);
  const span = tl.end - tl.start;

  const set = useCallback(
    (m: number) => {
      const v = scrub(m);
      if (Number.isNaN(v)) return;
      const b = Math.floor(v / 15);
      if (b !== bucket.current) {
        bucket.current = b;
        fx('scrub_tick');
      }
    },
    [scrub],
  );

  const fromPointer = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    set(tl.start + f * span);
  };
  const dragging = useRef(false);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const cur = useGameStore.getState().obsMinute[tlId] ?? tl.initial;
      if (cur >= tl.end) return setPlaying(false);
      set(cur + 1);
    }, 100);
    return () => clearInterval(t);
  }, [playing, set, tl, tlId]);

  const hold = useRef<{ t?: number; i?: number }>({});
  const stopHold = () => {
    clearTimeout(hold.current.t);
    clearInterval(hold.current.i);
  };
  useEffect(() => stopHold, []);
  const startHold = (d: number) => {
    const step = () => set((useGameStore.getState().obsMinute[tlId] ?? tl.initial) + d);
    step();
    hold.current.t = window.setTimeout(() => (hold.current.i = window.setInterval(step, 70)), 350);
  };

  const pct = ((minute - tl.start) / span) * 100;
  const hours: number[] = [];
  for (let h = Math.ceil(tl.start / 60); h * 60 <= tl.end; h++) hours.push(h * 60);

  return (
    <div className="scrub" data-testid="scrubber" data-coach="viewer.scrubber" data-minute={minute}>
      <div className="scrub-clock" data-testid="scrub-clock">
        {formatClock(minute)}
      </div>
      <div className="scrub-row">
        <button className="step-btn" aria-label="5분 뒤로" data-testid="scrub-back" onPointerDown={(e) => (e.preventDefault(), startHold(-5))} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}>
          ◀
        </button>
        <div
          className="scrub-track"
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="관측 시각"
          aria-valuemin={tl.start}
          aria-valuemax={tl.end}
          aria-valuenow={minute}
          aria-valuetext={formatClock(minute)}
          data-testid="scrub-track"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={(e) => {
            const d = e.shiftKey ? 30 : 5;
            if (e.key === 'ArrowRight') (e.preventDefault(), set(minute + d));
            else if (e.key === 'ArrowLeft') (e.preventDefault(), set(minute - d));
            else if (e.key === 'Home') set(tl.start);
            else if (e.key === 'End') set(tl.end);
            else if (e.key === ' ') (e.preventDefault(), setPlaying((p) => !p));
          }}
        >
          <div className="scrub-rail">
            <div className="scrub-fill" style={{ width: `${pct}%` }} />
          </div>
          {ticks.map((t) => (
            <i key={`${t.kind}${t.minute}`} className={`scrub-tick tick-${t.kind}`} data-kind={t.kind} style={{ left: `${((t.minute - tl.start) / span) * 100}%` }} />
          ))}
          {hours.map((m) => (
            <i key={`h${m}`} className="scrub-hour" style={{ left: `${((m - tl.start) / span) * 100}%` }}>
              {(m / 60) % 2 === 0 && <b>{m / 60}</b>}
            </i>
          ))}
          <div className="scrub-knob" style={{ left: `${pct}%` }}>
            <Px k="ov_scrub_knob" scale={2} />
          </div>
        </div>
        <button className="step-btn" aria-label="5분 앞으로" data-testid="scrub-fwd" onPointerDown={(e) => (e.preventDefault(), startHold(5))} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}>
          ▶
        </button>
      </div>
      <div className="scrub-actions">
        <button className="btn btn-small" data-testid="viewer-play" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? '■ 멈춤' : '▶ 재생 ×10'}
        </button>
      </div>
    </div>
  );
}

function TapPanel({ tap }: { tap: TapResult | null }) {
  const showProv = useGameStore((s) => s.settings.showProvenance);
  if (!tap)
    return (
      <div className="tap-panel idle" data-testid="tap-panel">
        <p className="dim">사람이나 물건을 눌러 보세요.</p>
      </div>
    );
  const gained = describeRewards(tap.gained);
  return (
    <div className="tap-panel" data-testid="tap-panel" key={`${tap.hotspotId}:${tap.minute}`}>
      <header>
        <b>{tap.label}</b>
        <span className="dim">{formatClock(tap.minute)}</span>
        {tap.status === 'outside_window' && <span className="chip chip-dim">지금은 보이지 않음</span>}
      </header>
      {tap.lines.map((l, i) => (
        <p key={i} className={`tap-line prov-${l.provenance}`}>
          {l.speaker && <b className="spk">{l.speaker}</b>}
          {l.text}
          {l.provenance === 'verified' && l.sources && l.sources.length > 0 && (
            <a className="src-mark" href={l.sources[0]!.url} target="_blank" rel="noopener noreferrer" title={l.sources[0]!.title}>
              실록
            </a>
          )}
          {showProv && l.provenance === 'reconstructed' && <span className="prov-mark">재구성</span>}
        </p>
      ))}
      {gained.length > 0 && (
        <ul className="gained">
          {gained.map((g) => (
            <li key={g.key} className={`gain gain-${g.icon}`}>
              <span className="gain-mark" aria-hidden="true">
                {g.icon === 'card' ? '＋' : g.icon === 'stamp' ? '✓' : '·'}
              </span>
              {g.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HotspotList({ onPick, open }: { onPick(id: string): void; open: boolean }) {
  const minute = useGameStore((s) => s.obsMinute[TL_ID] ?? 0);
  const flags = useGameStore((s) => s.flags);
  const tapHotspot = useGameStore((s) => s.tapHotspot);
  const items = useMemo(() => {
    const f = selectViewerFrame(useGameStore.getState(), CONTENT, TL_ID);
    return (f?.hotspots ?? [])
      .filter((h) => h.status === 'available')
      .map((h) => ({
        id: h.id,
        label: h.kind === 'npc' ? (IDX.npcs[h.targetId]?.label ?? '사람') : (IDX.worldObjects[h.targetId]?.label ?? '물건'),
        kind: h.kind,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute, flags]);
  return (
    <details className="hs-list" data-testid="hotspot-list" open={open}>
      <summary>지금 보이는 것 ({items.length})</summary>
      <ul>
        {items.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              className="hs-btn"
              data-testid={`hotspot-${h.id}`}
              onClick={() => {
                onPick(h.id);
                tapHotspot(h.id);
                bus.emit('viewer:tapped', { hotspotId: h.id });
              }}
            >
              <span aria-hidden="true">{h.kind === 'npc' ? '☻' : '▪'}</span> {h.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
