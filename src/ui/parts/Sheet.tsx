import { useEffect, useRef, type ReactNode } from 'react';
import { IClose } from './icons';

/**
 * 아래 시트. 바깥(어두운 면)을 탭하거나 Esc 로 닫는다. 컷을 가리지 않아야 할 때 scrim="clear".
 * 손잡이(━)·머리를 아래로 끌면 따라 내려오고, 충분히 끌면 닫힌다(손잡이가 약속하는 대로 — QA_UX).
 */
export function Sheet({
  title,
  onClose,
  children,
  foot,
  scrim = 'dim',
  headClass,
  maxH,
  testId,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
  scrim?: 'dim' | 'clear' | 'none';
  headClass?: string;
  maxH?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; y: number; dy: number; on: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { id: e.pointerId, y: e.clientY, dy: 0, on: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || d.id !== e.pointerId || !el) return;
    d.dy = Math.max(0, e.clientY - d.y);
    if (!d.on && d.dy > 6) {
      d.on = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* 무시 */
      }
      el.style.transition = 'none';
    }
    if (d.on) el.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = ref.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !el || !d.on) return;
    if (d.dy > Math.min(110, el.offsetHeight * 0.25)) {
      onClose();
      return;
    }
    el.style.transition = 'transform 0.18s ease-out';
    el.style.transform = '';
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      {scrim !== 'none' ? <div className={`scrim${scrim === 'clear' ? ' clear' : ''}`} onClick={onClose} /> : null}
      <section ref={ref} className="sheet" role="dialog" aria-label={typeof title === 'string' ? title : undefined} data-testid={testId} style={maxH ? { maxHeight: maxH } : undefined}>
        <div className="sgrab" data-testid={testId ? `${testId}-grab` : undefined} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="grab" />
          <div className="shead">
            <div className={`t-h ${headClass ?? ''}`}>{title}</div>
            <button className="ibtn" aria-label="닫기" onClick={onClose}>
              <IClose />
            </button>
          </div>
        </div>
        <div className="sbody">{children}</div>
        {foot ? <div className="sfoot">{foot}</div> : null}
      </section>
    </>
  );
}
