/** 앱을 감싸는 틀: 데스크톱 <WindowFrame>(끌기·크기·최소화·닫기) / 모바일 <FullscreenFrame>(뒤로·도움말). */
import { useRef, useState, type ReactNode } from 'react';
import type { AppId } from '@/core/types';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi, type WinKey } from '../uiStore';

export interface FrameProps {
  winKey: WinKey;
  title: string;
  iconKey: string;
  helpApp?: AppId;
  children: ReactNode;
}

export function HelpSheet({ app, onClose }: { app: AppId; onClose(): void }) {
  const card = CONTENT.help.find((h) => h.app === app);
  return (
    <div className="help-sheet" role="dialog" aria-label="도움말" data-testid="help-sheet" onPointerDown={(e) => e.stopPropagation()}>
      <div className="help-card">
        <h3>{card?.title ?? '도움말'}</h3>
        {card ? (
          <ul>
            {card.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="dim">이 앱의 도움말이 없습니다.</p>
        )}
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

const MENU_H = 40;
const DOCK_H = 84;

export function WindowFrame({
  winKey,
  title,
  iconKey,
  helpApp,
  active,
  children,
  onClose,
  onFocus,
  viewport,
}: FrameProps & { active: boolean; onClose(): void; onFocus(): void; viewport: { w: number; h: number } }) {
  const win = useUi((s) => s.windows[winKey]);
  const setWindow = useUi((s) => s.setWindow);
  const minimize = useUi((s) => s.minimizeWindow);
  const [help, setHelp] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  if (!win) return null;

  const clampPos = (x: number, y: number, w: number) => ({
    x: Math.min(Math.max(x, 60 - w), viewport.w - 80),
    y: Math.min(Math.max(y, MENU_H + 24), viewport.h - 80),
  });

  const onTitleDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onFocus();
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setWindow(winKey, clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy, win.w));
  };
  const onTitleUp = () => {
    drag.current = null;
  };

  const onGripDown = (e: React.PointerEvent) => {
    onFocus();
    size.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };
  const onGripMove = (e: React.PointerEvent) => {
    const s = size.current;
    if (!s) return;
    setWindow(winKey, {
      w: Math.max(420, Math.min(viewport.w - win.x - 8, s.w + e.clientX - s.x)),
      h: Math.max(320, Math.min(viewport.h - win.y - 8, s.h + e.clientY - s.y)),
    });
  };

  return (
    <section
      className={`win ${active ? 'win-active' : 'win-idle'} ${win.minimized ? 'win-min' : ''}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }}
      data-testid={`win-${winKey}`}
      aria-label={title}
      onPointerDownCapture={() => !active && onFocus()}
    >
      <header className="win-title" onPointerDown={onTitleDown} onPointerMove={onTitleMove} onPointerUp={onTitleUp} onPointerCancel={onTitleUp}>
        <Px k={iconKey} scale={2} className="win-icon" />
        <h2>{title}</h2>
        <span className="win-spacer" />
        {helpApp && (
          <button className="win-btn win-help" aria-label="도움말" data-testid={`help-${winKey}`} onClick={() => setHelp((v) => !v)}>
            ?
          </button>
        )}
        <button className="win-btn" aria-label="최소화" data-testid={`min-${winKey}`} onClick={() => minimize(winKey)}>
          <Px k="os_title_min" scale={2} />
        </button>
        <button
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
      <div className="win-body">
        {children}
        {help && helpApp && <HelpSheet app={helpApp} onClose={() => setHelp(false)} />}
      </div>
      <div className="win-grip" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={() => (size.current = null)} aria-hidden="true" />
    </section>
  );
}

export function FullscreenFrame({
  title,
  iconKey,
  helpApp,
  children,
  onBack,
  hideBack,
}: Omit<FrameProps, 'winKey'> & { onBack(): void; hideBack?: boolean }) {
  const [help, setHelp] = useState(false);
  return (
    <section className="fs" aria-label={title} data-testid="fs-app">
      <header className="fs-head">
        {!hideBack && (
          <button className="fs-back" aria-label="뒤로" data-testid="app-back" onClick={onBack}>
            ←
          </button>
        )}
        <Px k={iconKey} scale={2} className="fs-icon" />
        <h2>{title}</h2>
        <span className="win-spacer" />
        {helpApp && (
          <button className="fs-help" aria-label="도움말" data-testid="app-help" onClick={() => setHelp((v) => !v)}>
            ?
          </button>
        )}
      </header>
      <div className="fs-body">
        {children}
        {help && helpApp && <HelpSheet app={helpApp} onClose={() => setHelp(false)} />}
      </div>
    </section>
  );
}

export const WORK_AREA = { top: MENU_H, bottom: DOCK_H };
