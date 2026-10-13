import { useCallback, useEffect, useMemo, useRef } from 'react';
import { bus } from '@/core/bus';
import type { AppId } from '@/core/types';
import { selectApps, useGameStore } from '@/store/gameStore';
import { MessengerApp } from '../apps/Messenger';
import { ObserveApp } from '../apps/Observe';
import { SearchApp } from '../apps/Search';
import { SettingsApp } from '../apps/Settings';
import { WorkApp } from '../apps/Work';
import { fastMode, runBack, useIdleHints, useLayout } from '../hooks';
import { appIconKey } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { threadOf } from '../lib/text';
import { useUi, type WinKey } from '../uiStore';
import { Dock } from './Dock';
import { FullscreenFrame, WORK_AREA, WindowFrame } from './Frames';
import { Banner, Home, Overlays } from './Overlays';
import { StatusBar } from './StatusBar';

const COMPONENT: Record<WinKey, () => React.JSX.Element> = {
  work: WorkApp,
  viewer: ObserveApp,
  db: SearchApp,
  messenger: MessengerApp,
  settings: SettingsApp,
};
const SIZE: Record<WinKey, { w: number; h: number }> = {
  work: { w: 520, h: 680 },
  viewer: { w: 680, h: 660 },
  db: { w: 540, h: 640 },
  messenger: { w: 680, h: 560 },
  settings: { w: 480, h: 600 },
};

const titleOf = (k: WinKey) => (k === 'settings' ? '설정' : (CONTENT.apps.find((a) => a.app === k)?.title ?? k));
const iconOf = (k: WinKey) => (k === 'settings' ? 'app_settings_sm' : appIconKey(CONTENT.apps.find((a) => a.app === k)?.iconKey ?? 'app_db', true));

/** 앱은 데이터의 잠금 조건대로 하나씩 '설치'된다(독에 생기는 연출). 처음부터 있던 앱은 연출 없이. */
function useVisibleApps(): AppId[] {
  const inboxApps = useGameStore((s) => selectApps(s).join(','));
  const shown = useUi((s) => s.shown);
  const want = (inboxApps ? inboxApps.split(',') : []) as AppId[];
  const first = want.find((a) => !shown.includes(a));
  useEffect(() => {
    if (!first) return;
    const t = setTimeout(
      () => {
        useUi.getState().markShown(first, true);
        setTimeout(() => useUi.getState().clearInstalling(first), 1700);
      },
      fastMode() ? 0 : 900,
    );
    return () => clearTimeout(t);
  }, [first]);
  return want.filter((a) => shown.includes(a));
}

let lastRevealAt = 0;

/** 새로 도착한 메시지를 하나씩, 입력 중 표시를 거쳐 전달한다(알림·소리·읽지 않음 깜빡임이 이때 생긴다). */
function useMessageDelivery() {
  const inbox = useGameStore((s) => s.inbox);
  const revealed = useUi((s) => s.revealed);
  const pending = inbox.filter((id) => !revealed.includes(id));
  const nextId = pending[0];
  const batch = pending.length;
  useEffect(() => {
    if (!nextId) return;
    const m = CONTENT.messages.find((x) => x.id === nextId);
    if (!m) {
      useUi.getState().reveal([nextId]);
      return;
    }
    const thread = threadOf(m);
    const fast = fastMode();
    // 조용한 순간(방금 읽은 보고서, 방금 찍은 도장) 뒤에는 잠깐 숨을 둔다. 이어 오는 메시지는 바로 뒤따른다.
    const gap = fast ? 0 : m.hint ? 400 : Date.now() - lastRevealAt > 4000 ? 2400 : 450;
    const typeMs = fast ? 0 : thread === 'me' ? 500 : Math.min(1700, 700 + m.text.length * 14) / (batch > 4 ? 1.8 : 1);
    let t2 = 0;
    const t1 = window.setTimeout(() => {
      if (thread !== 'me' && typeMs > 0) useUi.getState().setTyping({ thread, from: m.from });
      t2 = window.setTimeout(() => {
        const ui = useUi.getState();
        ui.setTyping(null);
        ui.reveal([nextId]);
        lastRevealAt = Date.now();
        if (m.hint || thread === 'me') return;
        fx('message');
        const g = useGameStore.getState();
        const watching = g.ui.app === 'messenger' && ui.thread === thread;
        // 알림은 사람(오 실장·한 선임·위원회)의 말만. 시스템은 읽지 않음 표시로만 알린다.
        if (!watching && thread !== 'system') {
          const body = m.text.length > 46 ? `${m.text.slice(0, 46)}…` : m.text;
          ui.pushNotice({ app: 'messenger', thread, text: thread === 'committee' ? body : `${m.from}: ${body}` });
        }
      }, typeMs);
    }, gap);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      useUi.getState().setTyping(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextId]);
}

/** 다시 쓰기(말소·복원) 연출을 대기열에 올리고, 복원이면 먹이 번진다. 끝나면 스토어에 알린다. */
function useRewriteDirector() {
  const recent = useGameStore((s) => s.recentRewrites);
  useEffect(() => {
    if (!recent.length) return;
    const ui = useUi.getState();
    for (const r of recent) {
      const key = r.kind === 'message' ? `message:${r.targetId}` : r.kind === 'record' ? `record:${r.targetId}` : r.kind === 'assignment' ? `assignment:${r.targetId}` : null;
      if (!key) continue;
      const prev = useUi.getState().rewritePlay[key];
      ui.queueRewrite(key, { tone: r.tone, before: prev?.before ?? r.before, after: r.after });
    }
    const restore = recent.some((r) => r.tone === 'restore');
    if (restore) {
      fx('restore');
      ui.bloom();
    } else fx('erase');
    bus.emit('glitch', { intensity: restore ? 0.35 : 0.5, ms: 1400, kind: restore ? 'restore' : 'erase' } as { intensity: number; ms: number });
    useGameStore.getState().ackRewrites();
  }, [recent]);
}

export function Shell() {
  const layout = useLayout();
  const mode = layout.mode;
  const visible = useVisibleApps();
  const frontRaw = useGameStore((s) => s.ui.app);
  const modal = useGameStore((s) => s.ui.modal);
  const cold = useGameStore((s) => s.corrections.length > 0 && s.shifts.length === 0);
  const reduceFlicker = useGameStore((s) => s.settings.reduceFlicker);
  const windows = useUi((s) => s.windows);
  const openWindow = useUi((s) => s.openWindow);
  const focusWindow = useUi((s) => s.focusWindow);
  const closeWindow = useUi((s) => s.closeWindow);
  const minimizeWindow = useUi((s) => s.minimizeWindow);
  const settingsOpen = modal?.kind === 'settings';
  const cascade = useRef(0);
  const front = frontRaw;

  useMessageDelivery();
  useRewriteDirector();
  useIdleHints();

  // 모바일: 뒤로 가기 제스처는 앱 안쪽 → 설정 → 앱 닫기 순으로
  useEffect(() => {
    if (mode !== 'mobile') return;
    history.pushState({ gyeollok: 1 }, '');
    const on = () => {
      history.pushState({ gyeollok: 1 }, '');
      if (runBack()) return;
      const g = useGameStore.getState();
      if (g.ui.modal) g.closeModal();
      else g.closeApp();
    };
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, [mode]);

  useEffect(() => {
    const a = bus.on('app:open', ({ app, target }) => void useGameStore.getState().openApp(app, target));
    return () => a();
  }, []);

  const place = useCallback(
    (key: WinKey) => {
      const size = SIZE[key];
      const aw = layout.w - 24;
      const ah = layout.h - WORK_AREA.top - WORK_AREA.bottom - 16;
      const w = Math.min(size.w, aw);
      const h = Math.min(size.h, ah);
      const n = cascade.current++ % 4;
      // 처음 놓이는 자리: 관측은 왼쪽, 업무·DB·메신저는 오른쪽에서 조금씩 어긋나게(서로 덜 가리도록)
      const left = key === 'viewer' ? 28 : Math.max(12, layout.w - w - 40 - (key === 'work' ? 0 : key === 'db' ? 40 : key === 'messenger' ? 80 : 120));
      const top = WORK_AREA.top + 28 + (key === 'viewer' ? 0 : key === 'work' ? 6 : 20 + n * 14);
      openWindow(key, { x: left, y: Math.min(top, layout.h - h - WORK_AREA.bottom), w, h });
    },
    [layout.w, layout.h, openWindow],
  );

  // 스토어의 앞 앱이 바뀌면 창을 연다/앞으로
  useEffect(() => {
    if (!front || mode !== 'desktop') return;
    if (!useUi.getState().windows[front]) place(front);
    else focusWindow(front);
  }, [front, frontRaw, mode, place, focusWindow]);
  useEffect(() => {
    if (!settingsOpen || mode !== 'desktop') return;
    if (!useUi.getState().windows.settings) place('settings');
    else focusWindow('settings');
  }, [settingsOpen, mode, place, focusWindow]);

  const topKey = useMemo(() => {
    let best: WinKey | null = null;
    let z = -1;
    for (const w of Object.values(windows)) if (w && !w.minimized && w.z > z) ((best = w.key), (z = w.z));
    return best;
  }, [windows]);
  useEffect(() => {
    if (mode !== 'desktop' || !topKey || topKey === 'settings') return;
    if (useGameStore.getState().ui.app !== topKey) useGameStore.setState((s) => ({ ui: { ...s.ui, app: topKey as AppId, appTarget: undefined } }));
  }, [topKey, mode]);

  const onDock = (app: AppId) => {
    fx('tap');
    if (mode === 'desktop') {
      const w = windows[app];
      if (w && !w.minimized && topKey === app) return minimizeWindow(app);
      if (w) {
        focusWindow(app);
        useGameStore.setState((s) => ({ ui: { ...s.ui, app } }));
        return;
      }
    }
    useGameStore.getState().closeModal();
    useGameStore.getState().openApp(app);
  };
  const closeKey = (k: WinKey) => {
    closeWindow(k);
    if (k === 'settings') return useGameStore.getState().closeModal();
    if (useGameStore.getState().ui.app === k) {
      const next = Object.values(useUi.getState().windows).filter((w) => w && !w.minimized && w.key !== 'settings').sort((a, b) => b!.z - a!.z)[0];
      if (next) useGameStore.setState((s) => ({ ui: { ...s.ui, app: next.key as AppId } }));
      else useGameStore.getState().closeApp();
    }
  };
  const goHome = () => {
    useGameStore.getState().closeModal();
    useGameStore.getState().closeApp();
  };
  const openSettings = () => useGameStore.getState().openModal('settings');

  const mobileKey: WinKey | null = settingsOpen ? 'settings' : front;
  const wallpaper = mode === 'mobile' && layout.h >= layout.w ? 'wall-p' : 'wall';
  const openApps = Object.values(windows)
    .filter((w): w is NonNullable<typeof w> => !!w && w.key !== 'settings')
    .map((w) => w.key as AppId);
  const frontForDock = mode === 'desktop' ? (topKey && topKey !== 'settings' ? (topKey as AppId) : null) : (front as AppId | null);

  return (
    <div className={`os-shell os-${mode} ${layout.short ? 'short' : ''} ${cold ? 'os-cold' : ''} ${reduceFlicker ? 'calm' : ''}`} data-testid="os" data-mode={mode}>
      <div className="wallpaper" style={{ backgroundImage: `var(--u-${wallpaper})` }} />
      <StatusBar onSettings={openSettings} onHome={goHome} />
      <main className="stage">
        {mode === 'desktop' ? (
          <>
            {Object.values(windows).map((w) => {
              if (!w) return null;
              const C = COMPONENT[w.key];
              return (
                <WindowFrame
                  key={w.key}
                  winKey={w.key}
                  title={titleOf(w.key)}
                  iconKey={iconOf(w.key)}
                  active={topKey === w.key}
                  viewport={{ w: layout.w, h: layout.h }}
                  onFocus={() => focusWindow(w.key)}
                  onClose={() => closeKey(w.key)}
                >
                  <div className="app-host" data-app={w.key}>
                    <C />
                  </div>
                </WindowFrame>
              );
            })}
            {Object.values(windows).filter((w) => w && !w.minimized).length === 0 && <Home mode={mode} />}
          </>
        ) : mobileKey ? (
          (() => {
            const C = COMPONENT[mobileKey];
            return (
              <FullscreenFrame title={titleOf(mobileKey)} iconKey={iconOf(mobileKey)} onBack={() => (runBack() ? undefined : goHome())}>
                <div className="app-host" data-app={mobileKey}>
                  <C />
                </div>
              </FullscreenFrame>
            );
          })()
        ) : (
          <Home mode={mode} />
        )}
      </main>
      <Dock apps={visible} frontApp={frontForDock} openApps={mode === 'desktop' ? openApps : front ? [front] : []} onPick={onDock} orientation={mode === 'mobile' && layout.short ? 'left' : 'bottom'} />
      <Banner />
      <Overlays />
    </div>
  );
}
