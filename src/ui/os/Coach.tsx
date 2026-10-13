/** 코치마크(한 줄 + 대상 하이라이트 링)와 3단 힌트(디에게틱 → 명시). 방치 시간은 tickIdle 로 스토어에 알린다. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { selectTutorial, useGameStore } from '@/store/gameStore';
import { CONTENT } from '../lib/content';
import { idleSeconds, touchInput } from '../hooks';
import { useUi } from '../uiStore';
import { canonicalApp, type UiApp } from '../apps/registry';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

/** 다른 창에 가려진 대상은 건너뛴다 */
function exposed(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 24));
  if (!top) return true;
  const mine = el.closest('.win, .fs');
  return !mine || mine === top.closest('.win, .fs');
}

function findTarget(key: string, app: string): Element | null {
  const sel = `[data-coach="${key}"]`;
  const scoped = [...document.querySelectorAll(`[data-app="${app}"] ${sel}`)].filter((e) => visible(e) && exposed(e));
  const any = [...document.querySelectorAll(sel)].filter((e) => visible(e) && exposed(e));
  return scoped[0] ?? any[0] ?? null;
}

export function Coach({ frontApp }: { frontApp: UiApp | null }) {
  const view = useGameStore(useShallow((s) => selectTutorial(s, CONTENT, s.ui.app ?? undefined)));
  const hintLevel = useGameStore((s) => s.settings.hintLevel);
  const dismiss = useGameStore((s) => s.dismissCoach);
  const hintHidden = useUi((s) => s.hintHidden);
  const hideHint = useUi((s) => s.hideHint);
  const noteOpen = useGameStore((s) => s.flags.prologue_anomaly);
  const [rect, setRect] = useState<Rect | null>(null);
  const [onDock, setOnDock] = useState(false);
  const raf = useRef(0);
  const stepApp = view ? canonicalApp(view.step.app) : null;

  // 입력 감시 + 방치 시간
  useEffect(() => {
    const on = () => touchInput();
    window.addEventListener('pointerdown', on, true);
    window.addEventListener('keydown', on, true);
    window.addEventListener('wheel', on, true);
    const t = setInterval(() => {
      const s = idleSeconds();
      if (s >= 8 && !document.hidden) useGameStore.getState().tickIdle(s);
    }, 5000);
    return () => {
      window.removeEventListener('pointerdown', on, true);
      window.removeEventListener('keydown', on, true);
      window.removeEventListener('wheel', on, true);
      clearInterval(t);
    };
  }, []);

  const showCoach = !!view?.coach && hintLevel !== 'off';

  useLayoutEffect(() => {
    if (!view || !showCoach) {
      setRect(null);
      return;
    }
    const step = view.step;
    const update = () => {
      let el = findTarget(step.target, stepApp ?? step.app);
      let dock = false;
      if (!el && stepApp && stepApp !== frontApp) {
        el = findTarget(`dock.${stepApp}`, 'dock');
        dock = !!el;
      }
      setOnDock(dock);
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect((p) => (p && Math.abs(p.x - r.x) < 1 && Math.abs(p.y - r.y) < 1 && Math.abs(p.w - r.width) < 1 && Math.abs(p.h - r.height) < 1 ? p : { x: r.x, y: r.y, w: r.width, h: r.height }));
    };
    const loop = () => {
      update();
      raf.current = window.setTimeout(loop, 250) as unknown as number;
    };
    loop();
    return () => clearTimeout(raf.current);
  }, [view?.step.id, showCoach, frontApp, stepApp, view]);

  if (!view) return null;
  const hintKey = `${view.step.id}:${view.tier}`;
  const showHint = !!view.hint && hintHidden !== hintKey && hintLevel !== 'off';
  const ring = rect && showCoach;
  // 말풍선은 대상(과 대상이 가리키는 내용)을 덮지 않게 위/아래 중 여유 있는 쪽에 둔다. 독·상태 표시줄은 침범하지 않는다.
  const dockEl = document.querySelector('[data-testid="dock"]')?.getBoundingClientRect();
  const dockBottom = !dockEl || dockEl.height > dockEl.width ? false : true;
  const topLimit = (document.querySelector('[data-testid="statusbar"]')?.getBoundingClientRect().bottom ?? 40) + 4;
  const bottomLimit = dockEl && dockBottom ? dockEl.top - 4 : window.innerHeight - 4;
  const leftLimit = dockEl && !dockBottom ? dockEl.right + 8 : 8;
  const BUBBLE_H = 76;
  const spaceAbove = rect ? rect.y - 12 - topLimit : 0;
  const spaceBelow = rect ? bottomLimit - (rect.y + rect.h + 12) : 0;
  const shortScreen = window.innerHeight < 520;
  const below = rect ? (spaceBelow >= BUBBLE_H ? spaceBelow >= spaceAbove || spaceAbove < BUBBLE_H : false) : false;

  return (
    <>
      {ring && rect && (
        <div className="coach-layer" aria-live="polite" data-testid="coach">
          <div className="coach-ring" style={{ left: rect.x - 6, top: rect.y - 6, width: rect.w + 12, height: rect.h + 12 }} />
          <div
            key={view.step.id}
            className={`coach-bubble ${shortScreen ? 'short' : below ? 'below' : 'above'}`}
            style={{
              left: Math.min(Math.max(leftLimit, rect.x + rect.w / 2 - 130), Math.max(leftLimit, window.innerWidth - 268)),
              top: below ? rect.y + rect.h + 12 : spaceAbove >= BUBBLE_H ? undefined : topLimit,
              bottom: below || spaceAbove < BUBBLE_H ? undefined : window.innerHeight - rect.y + 12,
            }}
          >
            <span>{view.step.coach}</span>
            <button aria-label="코치마크 닫기" onClick={() => dismiss(view.step.id)}>
              ✕
            </button>
          </div>
        </div>
      )}
      {showCoach && !rect && !onDock && (
        <div className="coach-banner" data-testid="coach-banner">
          <span>{view.step.coach}</span>
          <button aria-label="코치마크 닫기" onClick={() => dismiss(view.step.id)}>
            ✕
          </button>
        </div>
      )}
      {showHint && (
        <div className={`hint ${view.tier <= 1 ? 'hint-diegetic' : 'hint-explicit'}`} role="status" data-testid="hint">
          {view.tier <= 1 ? (
            <>
              <span className="hint-from">{noteOpen ? '노트 여백' : '한 선임'}</span>
              <p className={noteOpen ? 'hand' : ''}>{view.hint}</p>
            </>
          ) : (
            <>
              <span className="hint-from">힌트 {view.tier}/3</span>
              <p>{view.hint}</p>
            </>
          )}
          <button aria-label="힌트 접기" onClick={() => hideHint(hintKey)}>
            ✕
          </button>
        </div>
      )}
    </>
  );
}
