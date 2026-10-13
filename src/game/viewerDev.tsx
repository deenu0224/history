/** 개발 전용 진입점(viewer-dev.html): 뷰어를 전체 화면으로 올리고 최소 스크러버만 붙인다. 프로덕션 번들에 들어가지 않는다. */
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { formatClock } from '@/core/observation';
import { content } from '@/data';
import { useGameStore } from '@/store/gameStore';
import { ObservationViewer, type ViewerHandle, type ViewerSnapshot } from './ObservationViewer';

/** 장면 선택: ?tl=tl_a0412&m=700 (없으면 대조전). 디오라마 4곳 + 마당(obs001) + 노이즈 장면 */
const TIMELINES = content.timelines;
const params = new URLSearchParams(window.location.search);
const FIRST = TIMELINES.find((t) => t.id === params.get('tl')) ?? TIMELINES.find((t) => t.id === 'tl_a0412') ?? TIMELINES[0]!;

function openTimeline(id: string, minute?: number): void {
  const tl = TIMELINES.find((t) => t.id === id)!;
  const st = useGameStore.getState();
  st.setFlag('obs_link_001', true);
  st.setFlag('f_saw_order', true);
  // 개발 전용: 책상 위 건이 아니어도 연다(스토어 규칙 우회)
  useGameStore.setState((s) => ({
    ui: { ...s.ui, observation: { timelineId: id } },
    obsMinute: { ...s.obsMinute, [id]: minute ?? s.obsMinute[id] ?? tl.initial },
  }));
}
openTimeline(FIRST.id, params.get('m') ? Number(params.get('m')) : undefined);

function Dev() {
  const ref = useRef<ViewerHandle>(null);
  const [TL, setTL] = useState(FIRST.id);
  const tlDef = TIMELINES.find((t) => t.id === TL)!;
  const minute = useGameStore((s) => s.obsMinute[TL] ?? tlDef.initial);
  const tap = useGameStore((s) => s.lastTap);
  const [empty, setEmpty] = useState(0);
  const [heard, setHeard] = useState<string[]>([]);
  const [snap, setSnap] = useState<ViewerSnapshot | null>(null);
  const [deg, setDeg] = useState(false);
  const degraded = useMemo(() => (deg && TL === 'tl_obs001' ? [{ from: 600, to: 660 }] : []), [deg, TL]);
  const pick = (id: string) => {
    openTimeline(id);
    setTL(id);
    setSnap(null);
    setHeard([]);
  };
  const demo = (m: number, id: string) => {
    ref.current?.setMinute(m);
    window.setTimeout(() => ref.current?.focusTarget(id), 60);
  };
  const capture = () => {
    ref.current?.flashShutter();
    setSnap(ref.current?.snapshot() ?? null);
  };
  useEffect(() => {
    document.title = `viewer ${formatClock(minute)}`;
  }, [minute]);
  const btn = { background: '#25211e', color: '#dccfae', border: '1px solid #5a5240', borderRadius: 6, padding: '10px 14px', fontSize: 16, minWidth: 44, minHeight: 44 } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ObservationViewer key={TL} ref={ref} timelineId={TL} onEmptyTap={() => setEmpty((n) => n + 1)} degraded={degraded} onHear={(id) => setHeard((h) => [...h, id])} />
        <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button style={btn} onClick={() => ref.current?.zoomStep(1)} aria-label="확대">＋</button>
          <button style={btn} onClick={() => ref.current?.zoomStep(-1)} aria-label="축소">－</button>
          <button style={btn} onClick={capture} aria-label="캡처" id="btn-capture">◉</button>
        </div>
        {tap && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, background: '#25211eee', color: '#e8dfc8', padding: 10, borderRadius: 8, fontSize: 14, maxHeight: '28%', overflow: 'auto' }}>
            <b>{tap.label}</b> {formatClock(tap.minute)} · {tap.status}
            {tap.lines.map((l, i) => (
              <div key={i}>{l.speaker ? `${l.speaker}: ` : ''}{l.text}</div>
            ))}
          </div>
        )}
        <div id="empty-taps" style={{ position: 'absolute', left: 8, top: 56, color: '#8a826c', fontSize: 11 }}>empty {empty} · heard {heard.join(',')}</div>
        <select
          id="scene-select"
          value={TL}
          onChange={(e) => pick(e.target.value)}
          style={{ position: 'absolute', left: 8, top: 8, maxWidth: '60%', background: '#25211e', color: '#dccfae', border: '1px solid #5a5240', borderRadius: 6, padding: '8px 6px', fontSize: 13 }}
          aria-label="장면"
        >
          {TIMELINES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.sceneId} · {t.id}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', left: 8, top: 76, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button style={{ ...btn, fontSize: 12, padding: '6px 8px' }} id="btn-fit" onClick={() => ref.current?.fitToScene()}>전체</button>
          <button style={{ ...btn, fontSize: 12, padding: '6px 8px' }} id="btn-speaker" onClick={() => ref.current?.focusSpeaker()}>말하는 이</button>
          {TL === 'tl_obs001' && (
            <>
              <button style={{ ...btn, fontSize: 12, padding: '6px 8px' }} id="demo-1200" onClick={() => demo(720, 'hs_npc_young_official')}>12:00 엿듣기</button>
              <button style={{ ...btn, fontSize: 12, padding: '6px 8px' }} id="demo-1400" onClick={() => demo(840, 'hs_npc_blue_official')}>14:00 엿듣기</button>
              <button style={{ ...btn, fontSize: 12, padding: '6px 8px' }} id="btn-deg" onClick={() => setDeg((d) => !d)}>훼손 {deg ? 'ON' : 'off'} (10:00–11:00)</button>
            </>
          )}
        </div>
        {snap && (
          <div id="snap" style={{ position: 'absolute', right: 8, bottom: 8, width: 130, background: '#25211eee', color: '#e8dfc8', padding: 6, fontSize: 10 }}>
            <img src={snap.thumbDataUrl} alt="" style={{ width: '100%', display: 'block' }} />
            {formatClock(snap.minute)} x{snap.zoom} ({snap.centerTile.x},{snap.centerTile.y})<br />
            hs: {snap.visibleHotspotIds.join(',')}<br />
            hear: {snap.heardLineIds.join(',')}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 14px calc(10px + env(safe-area-inset-bottom))', background: '#14161b', color: '#dccfae', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', width: 48 }}>{formatClock(minute)}</span>
        <input
          type="range"
          min={tlDef.start}
          max={tlDef.end}
          step={1}
          value={minute}
          onChange={(e) => ref.current?.setMinute(Number(e.target.value))}
          style={{ flex: 1, height: 36 }}
          aria-label="시각"
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dev />
  </StrictMode>,
);
