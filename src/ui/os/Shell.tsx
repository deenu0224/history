import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { bus } from '@/core/bus';
import type { AppId } from '@/core/types';
import { selectApps, useGameStore } from '@/store/gameStore';
import { APP_COMPONENT, DEFAULT_SIZE, UI_APPS, canonicalApp, type UiApp } from '../apps/registry';
import { Settings } from '../apps/Settings';
import { runBack, useLayout } from '../hooks';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { useUi, type WinKey } from '../uiStore';
import { Coach } from './Coach';
import { Dock } from './Dock';
import { FullscreenFrame, WORK_AREA, WindowFrame } from './Frames';
import { Overlays, Toasts } from './Overlays';
import { StatusBar } from './StatusBar';
import { ObjectivePin } from './Widgets';

const titleOf = (k: WinKey) => (k === 'settings' ? '설정' : (CONTENT.apps.find((a) => canonicalApp(a.app) === k)?.title ?? k));
const iconOf = (k: WinKey) => (k === 'settings' ? 'app_settings_sm' : appDefIcon(k));
function appDefIcon(k: UiApp) {
  const d = CONTENT.apps.find((a) => canonicalApp(a.app) === k);
  return d ? `${d.iconKey}_sm` : 'app_db_sm';
}

/** 검색 앱은 첫 메시지를 읽은 뒤(또는 90초 뒤) 생긴다: 처음 90초는 메신저만 보인다. */
function useVisibleApps(): UiApp[] {
  const unlocked = useGameStore(useShallow((s) => selectApps(s).map((a) => canonicalApp(a)).filter((a): a is UiApp => !!a)));
  const readFirst = useGameStore((s) => s.read.includes('m_c_01') || s.stats.searches > 0);
  const shown = useUi((s) => s.shown);
  const markShown = useUi((s) => s.markShown);
  const [t0] = useState(() => Date.now());
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const gateOpen = readFirst || Date.now() - t0 > 90_000;
  const want = [...new Set(unlocked)].filter((a) => a !== 'search' || gateOpen);
  const pending = want.filter((a) => !shown.includes(a as AppId));
  const first = pending[0];
  // 한 번에 하나씩 설치 연출
  useEffect(() => {
    if (!first) return;
    const t = setTimeout(() => {
      markShown(first as AppId, true);
      useUi.getState().pushToast({ text: `새 앱: ${titleOf(first)}`, tone: 'info' });
      setTimeout(() => useUi.getState().clearInstalling(first as AppId), 1700);
    }, shown.length === 0 ? 0 : 900);
    return () => clearTimeout(t);
  }, [first, markShown, shown.length]);
  return want.filter((a) => shown.includes(a as AppId));
}

export function Shell() {
  const layout = useLayout();
  const mode = layout.mode;
  const visible = useVisibleApps();
  const frontRaw = useGameStore((s) => s.ui.app);
  const front = canonicalApp(frontRaw);
  const modal = useGameStore((s) => s.ui.modal);
  const windows = useUi((s) => s.windows);
  const openWindow = useUi((s) => s.openWindow);
  const focusWindow = useUi((s) => s.focusWindow);
  const closeWindow = useUi((s) => s.closeWindow);
  const minimizeWindow = useUi((s) => s.minimizeWindow);
  const touchRecent = useUi((s) => s.touchRecent);
  const wallpaper = mode === 'mobile' && layout.h >= layout.w ? 'os_wallpaper_portrait' : 'os_wallpaper';
  const settingsOpen = !!modal && ['settings', 'save', 'help'].includes(modal.kind);
  const cascade = useRef(0);

  // 마운트 시 탭 동작 후 뒤로 가기 제스처 가로채기(모바일)
  useEffect(() => {
    if (mode !== 'mobile') return;
    history.pushState({ gyeollok: 1 }, '');
    const on = () => {
      history.pushState({ gyeollok: 1 }, '');
      if (!runBack()) {
        if (useUi.getState().switcher) useUi.getState().setSwitcher(false);
        else if (useGameStore.getState().ui.modal) useGameStore.getState().closeModal();
        else useGameStore.getState().closeApp();
      }
    };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, [mode]);

  // 버스 → 스토어
  useEffect(() => {
    const a = bus.on('app:open', ({ app, target }) => void useGameStore.getState().openApp(app, target));
    const b = bus.on('ui:open', ({ modal: m, id }) => useGameStore.getState().openModal(m, id));
    const c = bus.on('ui:close', () => useGameStore.getState().closeModal());
    const d = bus.on('notify', (n) => useUi.getState().pushToast({ text: n.text, tone: n.tone ?? 'info' }));
    return () => {
      a();
      b();
      c();
      d();
    };
  }, []);

  const place = useCallback(
    (key: WinKey) => {
      const size = DEFAULT_SIZE[key as UiApp | 'settings'] ?? { w: 700, h: 560 };
      const aw = layout.w - 24;
      const ah = layout.h - WORK_AREA.top - WORK_AREA.bottom - 16;
      const w = Math.min(size.w, aw);
      const h = Math.min(size.h, ah);
      const n = cascade.current++ % 5;
      const x = Math.max(12, Math.round((layout.w - w) / 2) - 60 + n * 30);
      const y = Math.max(WORK_AREA.top + 28, Math.round(WORK_AREA.top + 28 + n * 26));
      openWindow(key, { x, y: Math.min(y, layout.h - h - WORK_AREA.bottom), w, h });
    },
    [layout.w, layout.h, openWindow],
  );

  // 스토어의 앞 앱이 바뀌면 창을 연다/앞으로
  useEffect(() => {
    if (!front) return;
    touchRecent(front);
    if (mode !== 'desktop') return;
    if (!useUi.getState().windows[front]) place(front);
    else focusWindow(front);
  }, [front, frontRaw, mode, place, focusWindow, touchRecent]);

  useEffect(() => {
    if (!settingsOpen) return;
    touchRecent('settings');
    if (mode === 'desktop') {
      if (!useUi.getState().windows.settings) place('settings');
      else focusWindow('settings');
    }
    const tab = modal?.kind === 'save' ? 'save' : modal?.kind === 'help' ? 'help' : 'main';
    useUi.getState().setSettingsTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen, modal?.kind, mode]);

  // 창 포커스(최상단)를 스토어의 앞 앱과 맞춘다
  const topKey = useMemo(() => {
    let best: WinKey | null = null;
    let z = -1;
    for (const w of Object.values(windows)) if (w && !w.minimized && w.z > z) ((best = w.key), (z = w.z));
    return best;
  }, [windows]);
  useEffect(() => {
    if (mode !== 'desktop' || !topKey || topKey === 'settings') return;
    if (canonicalApp(useGameStore.getState().ui.app) !== topKey)
      useGameStore.setState((s) => ({ ui: { ...s.ui, app: topKey as AppId, appTarget: undefined } }));
  }, [topKey, mode]);

  const onDock = (app: UiApp) => {
    if (mode === 'desktop') {
      const w = windows[app];
      if (w && !w.minimized && topKey === app) return minimizeWindow(app);
      if (w) {
        focusWindow(app);
        useGameStore.setState((s) => ({ ui: { ...s.ui, app: app as AppId } }));
        return;
      }
    }
    if (!useGameStore.getState().openApp(app as AppId)) {
      // 합쳐진 앱(구 id)
      useGameStore.getState().openApp(app === 'search' ? 'reader' : app === 'notebook' ? 'archive' : (app as AppId));
    }
  };
  const closeKey = (k: WinKey) => {
    closeWindow(k);
    useUi.getState().dropRecent(k);
    if (k === 'settings') return useGameStore.getState().closeModal();
    if (canonicalApp(useGameStore.getState().ui.app) === k) {
      const next = Object.values(useUi.getState().windows).filter((w) => w && !w.minimized).sort((a, b) => b!.z - a!.z)[0];
      if (next && next.key !== 'settings') useGameStore.setState((s) => ({ ui: { ...s.ui, app: next.key as AppId } }));
      else useGameStore.getState().closeApp();
    }
  };
  const openSettings = () => useGameStore.getState().openModal('settings');
  const goHome = () => {
    useGameStore.getState().closeModal();
    useGameStore.getState().closeApp();
  };

  const openApps = Object.values(windows).filter((w): w is NonNullable<typeof w> => !!w && w.key !== 'settings').map((w) => w.key as UiApp);

  const mobileKey: WinKey | null = settingsOpen ? 'settings' : front;
  const Mobile = mobileKey ? (
    <FullscreenFrame
      title={titleOf(mobileKey)}
      iconKey={iconOf(mobileKey)}
      helpApp={mobileKey === 'settings' ? undefined : mobileKey}
      onBack={() => {
        if (runBack()) return;
        goHome();
      }}
    >
      <div className="app-host" data-app={mobileKey}>
        {mobileKey === 'settings' ? <Settings /> : (() => {
          const C = APP_COMPONENT[mobileKey as UiApp];
          return <C />;
        })()}
      </div>
    </FullscreenFrame>
  ) : (
    <div className="home" data-testid="home">
      <ObjectivePin />
    </div>
  );

  return (
    <div className={`os-shell os-${mode} ${layout.short ? 'short' : ''}`} data-testid="os" data-mode={mode}>
      <div className="wallpaper" style={{ backgroundImage: `var(--u-${wallpaper === 'os_wallpaper' ? 'wall' : 'wall-p'})` }} />
      <StatusBar mode={mode} onSettings={openSettings} onHome={goHome} />
      <main className="stage">
        {mode === 'desktop' ? (
          <>
            {Object.values(windows).map((w) => {
              if (!w) return null;
              const k = w.key;
              const C = k === 'settings' ? Settings : APP_COMPONENT[k as UiApp];
              return (
                <WindowFrame
                  key={k}
                  winKey={k}
                  title={titleOf(k)}
                  iconKey={iconOf(k)}
                  helpApp={k === 'settings' ? undefined : k}
                  active={topKey === k}
                  viewport={{ w: layout.w, h: layout.h }}
                  onFocus={() => focusWindow(k)}
                  onClose={() => closeKey(k)}
                >
                  <div className="app-host" data-app={k}>
                    <C />
                  </div>
                </WindowFrame>
              );
            })}
            {Object.values(windows).filter((w) => w && !w.minimized).length === 0 && (
              <div className="desk-widget">
                <ObjectivePin />
              </div>
            )}
          </>
        ) : (
          Mobile
        )}
      </main>
      <Dock
        apps={visible}
        frontApp={mode === 'desktop' ? (topKey === 'settings' ? null : (topKey as UiApp | null)) : front}
        openApps={mode === 'desktop' ? openApps : front ? [front] : []}
        onPick={(a) => onDock(a as UiApp)}
        orientation={mode === 'mobile' && layout.short ? 'left' : 'bottom'}
      />
      {mode === 'mobile' && <Switcher onPick={(k) => (k === 'settings' ? openSettings() : onDock(k as UiApp))} />}
      <Coach frontApp={front} />
      <Toasts />
      <Overlays />
    </div>
  );
}

function Switcher({ onPick }: { onPick(k: WinKey): void }) {
  const open = useUi((s) => s.switcher);
  const recent = useUi((s) => s.recent);
  const set = useUi((s) => s.setSwitcher);
  if (!open) return null;
  return (
    <div className="switcher" role="dialog" aria-label="실행 중인 앱" onClick={() => set(false)} data-testid="switcher">
      <div className="switcher-row" onClick={(e) => e.stopPropagation()}>
        {recent.map((k) => (
          <button
            key={k}
            className="switch-card"
            onClick={() => {
              set(false);
              onPick(k);
            }}
          >
            <Px k={iconOf(k)} scale={3} />
            <span>{titleOf(k)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { UI_APPS };
