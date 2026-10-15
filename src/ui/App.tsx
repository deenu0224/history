import { useEffect } from 'react';
import { MUSIC } from '@/data/feedback';
import { installAudioUnlock, setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { Director } from './Director';
import { installFeedback } from './lib/fx';
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

function Layers() {
  const toast = useUi((s) => s.toast);
  const banner = useUi((s) => s.banner);
  return (
    <>
      {toast ? (
        <div key={toast.key} className={`toast ${toast.tone === 'amber' ? '' : toast.tone}`} role="status" data-testid="toast">
          <span className="t-b">{toast.text}</span>
        </div>
      ) : null}
      {banner ? (
        <button
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
    const down = (e: PointerEvent) => {
      const el = app();
      if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const r = el.getBoundingClientRect();
      if (e.clientX - r.left > EDGE_PX || e.clientX < r.left) return;
      const top = topScreen(useUi.getState());
      const g = useGameStore.getState();
      const overlay = !!useUi.getState().card || g.ui.roomOpen || !!g.ui.tagTarget || useUi.getState().logOpen || !!useUi.getState().docId;
      if (!overlay && (top === 'home' || top === 'restore')) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false, hint: null };
    };
    const move = (e: PointerEvent) => {
      if (!st || st.id !== e.pointerId || st.done) return;
      const dx = e.clientX - st.x;
      const dy = Math.abs(e.clientY - st.y);
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
        st.hint.style.top = `${e.clientY - (app()?.getBoundingClientRect().top ?? 0) - 22}px`;
        st.hint.classList.toggle('go', dx >= EDGE_GO_PX);
      }
      if (dx >= EDGE_GO_PX && dy < dx * 0.6) {
        st.done = true;
        goBack();
      }
    };
    const up = (e: PointerEvent) => {
      if (!st || st.id !== e.pointerId) return;
      const h = st.hint;
      if (h) setTimeout(() => h.remove(), st.done ? 160 : 0);
      st = null;
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
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
