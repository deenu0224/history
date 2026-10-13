import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { AnchorRect, ViewerCamera, ViewerHandle, ViewerSnapshot } from './viewer/types';

export type { ViewerHandle, ViewerCamera, ViewerSnapshot } from './viewer/types';

export interface ObservationViewerProps {
  timelineId: string;
  className?: string;
  /** 이 NPC 의 하루 길을 점선으로. 생략하면 마지막으로 탭한 인물, null 이면 끈다 */
  routeNpcId?: string | null;
  /** 빈 곳을 탭했을 때(CSS px). 튜토리얼 실패 집계에 쓴다: store.reportFail('empty_tap') */
  onEmptyTap?: (p: { x: number; y: number }) => void;
  /** 훼손 구간(분, [from,to)). 현재 시각이 안이면 화면이 깨지고 대사·핫스팟이 막힌다 */
  degraded?: { from: number; to: number }[];
  /** 훼손 중일 때 위쪽에 띄울 작은 라벨(기본 문구). 빈 문자열이면 숨김. 요소에 data-slot="viewer.degraded" */
  degradedLabel?: string;
  /** 대사가 처음 들렸을 때(관측 한 번에 줄마다 한 번) */
  onHear?: (lineId: string, npcId: string) => void;
  /** 핫스팟 탭(스토어 tapHotspot 호출과 별개의 알림) */
  onTapHotspot?: (hotspotId: string) => void;
}

type Controller = ViewerHandle & { setDegraded(s: { from: number; to: number }[] | undefined): void; destroy(): void };

const EMPTY: ViewerSnapshot = { minute: -1, centerTile: { x: 0, y: 0 }, zoom: 1, visibleHotspotIds: [], heardLineIds: [], thumbDataUrl: '' };

/**
 * 관측 뷰어: 과거 디오라마를 끌어 이동·핀치/휠로 확대하고, 시각(스토어 obsMinute)에 따라 인물이 움직인다.
 * 걷기·플레이어 없음. Phaser 는 마운트 시 한 번만(동적 import) 만든다.
 * 첫 available 핫스팟 위치에 `data-coach="viewer.hotspot.first"` 앵커(투명 div)를 둔다.
 */
export const ObservationViewer = forwardRef<ViewerHandle, ObservationViewerProps>(function ObservationViewer(
  { timelineId, className, routeNpcId, onEmptyTap, degraded, degradedLabel = '기록 손상 구간', onHear, onTapHotspot },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const ctl = useRef<Controller | null>(null);
  const queue = useRef<((c: Controller) => void)[]>([]);
  const tapCb = useRef(onEmptyTap);
  tapCb.current = onEmptyTap;
  const routeRef = useRef(routeNpcId);
  routeRef.current = routeNpcId;
  const hearCb = useRef(onHear);
  hearCb.current = onHear;
  const hotCb = useRef(onTapHotspot);
  hotCb.current = onTapHotspot;
  const degRef = useRef(degraded);
  degRef.current = degraded;
  const [degOn, setDegOn] = useState(false);

  const call = (fn: (c: Controller) => void) => {
    if (ctl.current) fn(ctl.current);
    else queue.current.push(fn);
  };

  useImperativeHandle(
    ref,
    (): ViewerHandle => ({
      focusHotspot: (id) => call((c) => c.focusHotspot(id)),
      focusTile: (x, y) => call((c) => c.focusTile(x, y)),
      setMinute: (m) => call((c) => c.setMinute(m)),
      getCamera: (): ViewerCamera | null => ctl.current?.getCamera() ?? null,
      zoomTo: (z) => call((c) => c.zoomTo(z)),
      zoomStep: (d) => call((c) => c.zoomStep(d)),
      setRouteNpc: (id) => call((c) => c.setRouteNpc(id)),
      playShift: (k) => call((c) => c.playShift(k)),
      focusTarget: (id) => call((c) => c.focusTarget(id)),
      fitToScene: () => call((c) => c.fitToScene()),
      focusSpeaker: () => call((c) => c.focusSpeaker()),
      snapshot: () => ctl.current?.snapshot() ?? EMPTY,
      flashShutter: () => call((c) => c.flashShutter()),
    }),
    [],
  );

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    let made: Controller | null = null;
    const setAnchor = (r: AnchorRect | null) => {
      const a = anchor.current;
      if (!a) return;
      if (!r) {
        a.style.display = 'none';
        return;
      }
      a.style.display = 'block';
      a.style.transform = `translate(${r.x}px, ${r.y}px)`;
      a.style.width = `${r.w}px`;
      a.style.height = `${r.h}px`;
    };
    void import('./viewer/createViewer').then(({ createViewer }) => {
      if (cancelled) return;
      made = createViewer(el, {
        timelineId,
        onEmptyTap: (p) => tapCb.current?.(p),
        onAnchor: setAnchor,
        onHear: (l, n) => hearCb.current?.(l, n),
        onTapHotspot: (id) => hotCb.current?.(id),
        onDegradedChange: setDegOn,
      });
      made.setDegraded(degRef.current);
      ctl.current = made;
      if (routeRef.current !== undefined) made.setRouteNpc(routeRef.current);
      for (const fn of queue.current.splice(0)) fn(made);
    });
    return () => {
      cancelled = true;
      ctl.current = null;
      made?.destroy();
      made = null;
    };
  }, [timelineId]);

  useEffect(() => {
    ctl.current?.setDegraded(degraded);
  }, [degraded]);

  useEffect(() => {
    if (routeNpcId !== undefined) ctl.current?.setRouteNpc(routeNpcId);
  }, [routeNpcId]);

  return (
    <div
      ref={box}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', background: '#0b0d12', touchAction: 'none', userSelect: 'none', isolation: 'isolate' }}
      role="application"
      aria-label="관측 화면"
    >
      <div
        ref={anchor}
        data-coach="viewer.hotspot.first"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0, display: 'none', pointerEvents: 'none' }}
      />
      {degOn && degradedLabel && (
        <div
          data-slot="viewer.degraded"
          role="status"
          style={{
            position: 'absolute',
            left: '50%',
            top: 12,
            transform: 'translateX(-50%)',
            zIndex: 6,
            pointerEvents: 'none',
            padding: '3px 9px',
            background: 'rgba(20,18,16,0.72)',
            border: '1px solid #5a5240',
            color: '#b9ae94',
            font: "500 11px/1.4 'Noto Sans KR', system-ui, sans-serif",
            letterSpacing: '0.04em',
          }}
        >
          {degradedLabel}
        </div>
      )}
    </div>
  );
});
