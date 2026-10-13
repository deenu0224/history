import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AnchorRect, ViewerCamera, ViewerHandle } from './viewer/types';

export type { ViewerHandle, ViewerCamera } from './viewer/types';

export interface ObservationViewerProps {
  timelineId: string;
  className?: string;
  /** 이 NPC 의 하루 길을 점선으로. 생략하면 마지막으로 탭한 인물, null 이면 끈다 */
  routeNpcId?: string | null;
  /** 빈 곳을 탭했을 때(CSS px). 튜토리얼 실패 집계에 쓴다: store.reportFail('empty_tap') */
  onEmptyTap?: (p: { x: number; y: number }) => void;
}

type Controller = ViewerHandle & { destroy(): void };

/**
 * 관측 뷰어: 과거 디오라마를 끌어 이동·핀치/휠로 확대하고, 시각(스토어 obsMinute)에 따라 인물이 움직인다.
 * 걷기·플레이어 없음. Phaser 는 마운트 시 한 번만(동적 import) 만든다.
 * 첫 available 핫스팟 위치에 `data-coach="viewer.hotspot.first"` 앵커(투명 div)를 둔다.
 */
export const ObservationViewer = forwardRef<ViewerHandle, ObservationViewerProps>(function ObservationViewer(
  { timelineId, className, routeNpcId, onEmptyTap },
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
      });
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
    if (routeNpcId !== undefined) ctl.current?.setRouteNpc(routeNpcId);
  }, [routeNpcId]);

  return (
    <div
      ref={box}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', background: '#0b0d12', touchAction: 'none', userSelect: 'none' }}
      role="application"
      aria-label="관측 화면"
    >
      <div
        ref={anchor}
        data-coach="viewer.hotspot.first"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: 0, display: 'none', pointerEvents: 'none' }}
      />
    </div>
  );
});
