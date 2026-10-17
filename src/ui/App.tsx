import { useEffect, useLayoutEffect, useRef } from 'react';
import { MUSIC } from '@/data/feedback';
import { installAudioUnlock, setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { Director } from './Director';
import { installFeedback } from './lib/fx';
import { placeFloat } from './lib/floatPlace';
import { EDGE_GO_PX, EDGE_PX, goBack, openMessenger } from './lib/nav';
import { CardDetail } from './parts/CardDetail';
import { DocSheet, LogSheet } from './parts/LogSheets';
import { RoomSheet } from './parts/RoomSheet';
import { TagSheet } from './parts/TagSheet';
import { Boot } from './screens/Boot';
import { Home } from './screens/Home';
import { Messenger } from './screens/Messenger';
import { Restore } from './screens/Restore';
import { Rewrite } from './screens/Rewrite';
import { Search } from './screens/Search';
import { Settings } from './screens/Settings';
import { Viewer } from './screens/Viewer';
import { topScreen, useUi } from './uiStore';

const params = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

/** 알림·배너는 머리글 아래, 탭 대상이 없는 띠에 놓는다(lib/floatPlace) — 떠 있는 동안 화면이 바뀌면 다시 잰다 */
function useFloat(key: number | undefined, ref: React.RefObject<HTMLElement | null>, avoid: () => HTMLElement[]) {
  useLayoutEffect(() => {
    if (key === undefined) return;
    const put = () => {
      const el = ref.current;
      if (!el) return;
      const y = placeFloat(el, avoid());
      if (y !== null) {
        el.style.top = `${Math.round(y)}px`;
        el.style.bottom = 'auto';
      }
    };
    put();
    // 떠 있는 동안 화면이 바뀌면(시트가 올라옴·방이 열림) 다시 잰다
    const t = setInterval(put, 350);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function Layers() {
  const toast = useUi((s) => s.toast);
  const banner = useUi((s) => s.banner);
  const toastRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLButtonElement>(null);
  useFloat(banner?.key, bannerRef, () => []);
  useFloat(toast?.key, toastRef, () => (bannerRef.current ? [bannerRef.current] : []));
  return (
    <>
      {toast ? (
        <div ref={toastRef} key={toast.key} className={`toast ${toast.tone === 'amber' ? '' : toast.tone}`} role="status" data-testid="toast">
          <span className="t-b">{toast.text}</span>
        </div>
      ) : null}
      {banner ? (
        <button
          ref={bannerRef}
          key={banner.key}
          className="banner"
          data-testid="banner"
          onClick={() => openMessenger()}
        >
          <span className="from">{banner.from}</span>
          <span className="txt t-b" style={{ flex: 1, minWidth: 0 }}>
            {banner.text}
          </span>
        </button>
      ) : null}
    </>
  );
}

/**
 * 왼쪽 가장자리에서 오른쪽으로 밀면 뒤로(iOS 식). 가장자리 EDGE_PX 안에서 시작해 EDGE_GO_PX 넘게, 거의 수평으로.
 * 손가락을 따라 작은 「‹」 가 나온다. 뷰어의 컷 넘기기는 가장자리에서 시작한 밀기를 받지 않는다.
 */
function useEdgeBack() {
  useEffect(() => {
    let st: { x: number; y: number; id: number; done: boolean; hint: HTMLDivElement | null } | null = null;
    const app = () => document.querySelector<HTMLElement>('.app');
    const down = (x: number, y: number, id: number) => {
      const el = app();
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (x - r.left > EDGE_PX || x < r.left) return;
      const top = topScreen(useUi.getState());
      const g = useGameStore.getState();
      const overlay = !!useUi.getState().card || g.ui.roomOpen || !!g.ui.tagTarget || useUi.getState().logOpen || !!useUi.getState().docId;
      if (!overlay && (top === 'home' || top === 'restore')) return;
      st = { x, y, id, done: false, hint: null };
    };
    const move = (x: number, y: number, id: number) => {
      if (!st || st.id !== id || st.done) return;
      const dx = x - st.x;
      const dy = Math.abs(y - st.y);
      if (dy > 40 && dy > dx) {
        st.hint?.remove();
        st = null;
        return;
      }
      if (dx > 8 && !st.hint) {
        const h = document.createElement('div');
        h.className = 'edgehint';
        h.textContent = '‹';
        app()?.appendChild(h);
        st.hint = h;
      }
      if (st.hint) {
        st.hint.style.transform = `translateX(${Math.min(dx, EDGE_GO_PX) * 0.6}px)`;
        st.hint.style.top = `${y - (app()?.getBoundingClientRect().top ?? 0) - 22}px`;
        st.hint.classList.toggle('go', dx >= EDGE_GO_PX);
      }
      if (dx >= EDGE_GO_PX && dy < dx * 0.6) {
        st.done = true;
        goBack();
      }
    };
    const up = (id: number) => {
      if (!st || st.id !== id) return;
      const h = st.hint;
      if (h) setTimeout(() => h.remove(), st.done ? 160 : 0);
      st = null;
    };
    // 손가락은 터치 이벤트로 따라간다: 시트 위에서는 브라우저가 스크롤을 잡으며 pointercancel 을 보내지만
    // touchmove 는 계속 온다(시트 위 가장자리 밀기 = 시트 닫기, QA_UX). 마우스·펜은 포인터 이벤트.
    const pd = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      down(e.clientX, e.clientY, e.pointerId);
    };
    const pm = (e: PointerEvent) => e.pointerType !== 'touch' && move(e.clientX, e.clientY, e.pointerId);
    const pu = (e: PointerEvent) => e.pointerType !== 'touch' && up(e.pointerId);
    const ts = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (t && e.touches.length === 1) down(t.clientX, t.clientY, -1 - t.identifier);
    };
    const tm = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) move(t.clientX, t.clientY, -1 - t.identifier);
    };
    const te = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) up(-1 - t.identifier);
    };
    window.addEventListener('pointerdown', pd, true);
    window.addEventListener('pointermove', pm, true);
    window.addEventListener('pointerup', pu, true);
    window.addEventListener('pointercancel', pu, true);
    window.addEventListener('touchstart', ts, { capture: true, passive: true });
    window.addEventListener('touchmove', tm, { capture: true, passive: true });
    window.addEventListener('touchend', te, { capture: true, passive: true });
    window.addEventListener('touchcancel', te, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', pd, true);
      window.removeEventListener('pointermove', pm, true);
      window.removeEventListener('pointerup', pu, true);
      window.removeEventListener('pointercancel', pu, true);
      window.removeEventListener('touchstart', ts, true);
      window.removeEventListener('touchmove', tm, true);
      window.removeEventListener('touchend', te, true);
      window.removeEventListener('touchcancel', te, true);
    };
  }, []);
}

function Game() {
  const top = useUi(topScreen);
  useEdgeBack();
  return (
    <>
      <Director />
      {top === 'home' ? <Home /> : null}
      {top === 'viewer' ? <Viewer /> : null}
      {top === 'search' ? <Search /> : null}
      {top === 'messenger' ? <Messenger /> : null}
      {top === 'rewrite' ? <Rewrite /> : null}
      {top === 'restore' ? <Restore /> : null}
      {top === 'settings' ? <Settings /> : null}
      <RoomSheet />
      <TagSheet />
      <LogSheet />
      <DocSheet />
      <CardDetail />
      <Layers />
    </>
  );
}

export function App() {
  const phase = useUi((s) => s.phase);
  const textSize = useGameStore((s) => s.settings.textSize);
  const reduce = useGameStore((s) => s.settings.reduceMotion);
  const music = useGameStore((s) => s.settings.music);

  useEffect(() => installFeedback(), []);
  useEffect(() => {
    try {
      installAudioUnlock();
    } catch {
      /* 오디오 없음 */
    }
  }, []);
  // 테스트: ?test=1 이면 부트를 건너뛰고 바로 홈(&boot=1 이면 부트 화면). &ep=1 이면 에피소드 1 에서(잠금을 풀고)
  useEffect(() => {
    const p = params();
    if (p.get('test') === '1' && p.get('boot') !== '1') {
      const g = useGameStore.getState();
      const only = p.get('ep');
      if (only && only !== '0') {
        const id = `ep${only}`;
        useGameStore.setState({ unlocked: [...new Set([...g.unlocked, id])] });
        g.startEpisode(id);
      } else g.startEpisode();
      g.markPrologueSeen();
      useUi.getState().enterGame();
    }
  }, []);
  useEffect(() => {
    if (phase !== 'boot') return;
    try {
      setMusic(music ? MUSIC.boot : 'none');
    } catch {
      /* 오디오 없음 */
    }
  }, [phase, music]);

  return (
    <div className="app" data-text={textSize} data-motion={reduce ? 'reduced' : undefined}>
      {phase === 'boot' ? <Boot /> : <Game />}
    </div>
  );
}
