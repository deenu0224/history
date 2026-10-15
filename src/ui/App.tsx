import { useEffect } from 'react';
import { MUSIC } from '@/data/feedback';
import { installAudioUnlock, setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { Director } from './Director';
import { installFeedback } from './lib/fx';
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
          onClick={() => {
            const ui = useUi.getState();
            ui.clearBanner();
            ui.push('messenger');
          }}
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

function Game() {
  const top = useUi(topScreen);
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
