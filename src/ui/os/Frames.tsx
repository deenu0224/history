/** 앱을 감싸는 틀: 데스크톱 <WindowFrame>(끌기·크기·최소화·닫기) / 모바일 <FullscreenFrame>(뒤로). */
import { useRef, type ReactNode } from 'react';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { useUi, type WinKey } from '../uiStore';

const MENU_H = 40;
const DOCK_H = 84;

export function WindowFrame({
  winKey,
  title,
  iconKey,
  active,
  children,
  onClose,
  onFocus,
  viewport,
}: {
  winKey: WinKey;
  title: string;
  iconKey: string;
  children: ReactNode;
  active: boolean;
  onClose(): void;
  onFocus(): void;
  viewport: { w: number; h: number };
}) {
  const win = useUi((s) => s.windows[winKey]);
  const setWindow = useUi((s) => s.setWindow);
  const minimize = useUi((s) => s.minimizeWindow);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  if (!win) return null;

  const clampPos = (x: number, y: number, w: number) => ({
    x: Math.min(Math.max(x, 60 - w), viewport.w - 80),
    y: Math.min(Math.max(y, MENU_H + 24), viewport.h - 80),
  });

  return (
    <section
      className={`win ${active ? 'win-active' : 'win-idle'} ${win.minimized ? 'win-min' : ''}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      data-testid={`win-${winKey}`}
      aria-label={title}
      onPointerDownCapture={() => !active && onFocus()}
    >
      <header
        className="win-title"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onFocus();
          drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => drag.current && setWindow(winKey, clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy, win.w))}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <Px k={iconKey} scale={2} className="win-icon" />
        <h2>{title}</h2>
        <span className="win-spacer" />
        <button type="button" className="win-btn" aria-label="최소화" data-testid={`min-${winKey}`} onClick={() => minimize(winKey)}>
          <Px k="os_title_min" scale={2} />
        </button>
        <button
          type="button"
          className="win-btn"
          aria-label="닫기"
          data-testid={`close-${winKey}`}
          onClick={() => {
            fx('tap');
            onClose();
          }}
        >
          <Px k="os_title_close" scale={2} />
        </button>
      </header>
      <div className="win-body">{children}</div>
      <div
        className="win-grip"
        aria-hidden="true"
        onPointerDown={(e) => {
          onFocus();
          size.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.stopPropagation();
        }}
        onPointerMove={(e) => {
          const s = size.current;
          if (s)
            setWindow(winKey, {
              w: Math.max(380, Math.min(viewport.w - win.x - 8, s.w + e.clientX - s.x)),
              h: Math.max(320, Math.min(viewport.h - win.y - 8, s.h + e.clientY - s.y)),
            });
        }}
        onPointerUp={() => (size.current = null)}
      />
    </section>
  );
}

export function FullscreenFrame({ title, iconKey, children, onBack }: { title: string; iconKey: string; children: ReactNode; onBack(): void }) {
  return (
    <section className="fs" aria-label={title} data-testid="fs-app">
      <header className="fs-head">
        <button type="button" className="fs-back" aria-label="뒤로" data-testid="app-back" onClick={onBack}>
          ←
        </button>
        <Px k={iconKey} scale={2} className="fs-icon" />
        <h2>{title}</h2>
      </header>
      <div className="fs-body">{children}</div>
    </section>
  );
}

export const WORK_AREA = { top: MENU_H, bottom: DOCK_H };
