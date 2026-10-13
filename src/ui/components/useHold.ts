/**
 * 길게 눌러 완료하는 동작의 공통 훅. 누르는 동안 진행도(0~1)가 차오르고, 중간에 떼면 물러난다(손해 없음).
 * 키보드는 Enter/Space 를 눌러 유지, 보조기기의 클릭(detail 0)은 바로 완료한다.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fx } from '../lib/fx';

export function useHold(ms: number, onComplete: () => void, opts: { disabled?: boolean; onShort?(): void; sound?: boolean } = {}) {
  const [p, setP] = useState(0);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const raf = useRef(0);
  const start = useRef(0);
  const holding = useRef(false);
  const done = useRef(false);
  const cb = useRef(onComplete);
  cb.current = onComplete;
  const short = useRef(opts.onShort);
  short.current = opts.onShort;
  const disabled = useRef(opts.disabled);
  disabled.current = opts.disabled;

  const stop = (reset: boolean) => {
    const was = holding.current;
    holding.current = false;
    cancelAnimationFrame(raf.current);
    if (reset) {
      setP(0);
      if (was) short.current?.();
    }
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    if (!holding.current) return;
    const k = Math.min(1, (performance.now() - start.current) / ms);
    setP(k);
    if (k >= 1) {
      holding.current = false;
      done.current = true;
      cb.current();
      window.setTimeout(() => {
        done.current = false;
        setP(0);
      }, 380);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = (x?: number, y?: number) => {
    if (disabled.current || holding.current || done.current) return;
    if (x !== undefined && y !== undefined) setOrigin({ x, y });
    holding.current = true;
    start.current = performance.now();
    if (opts.sound !== false) fx('tap');
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== undefined && e.button > 0) return;
      const r = e.currentTarget.getBoundingClientRect();
      begin(((e.clientX - r.left) / Math.max(1, r.width)) * 100, ((e.clientY - r.top) / Math.max(1, r.height)) * 100);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 합성 이벤트 */
      }
    },
    onPointerUp: () => stop(!done.current),
    onPointerCancel: () => stop(true),
    onPointerLeave: () => !done.current && stop(true),
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        begin(50, 50);
      }
    },
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === ' ') stop(!done.current);
    },
    onBlur: () => stop(!done.current),
    onClick: (e: { detail: number }) => {
      if (e.detail === 0 && !holding.current && !done.current && !disabled.current) {
        done.current = true;
        cb.current();
        window.setTimeout(() => (done.current = false), 380);
      }
    },
  };
  return { p, origin, handlers, holding: p > 0 };
}
