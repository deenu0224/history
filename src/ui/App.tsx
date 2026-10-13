import { useEffect, useMemo, useState } from 'react';
import { enableAutosave, useGameStore } from '@/store/gameStore';
import { setVolume, unlockAudio } from '@/game/audio';
import { Boot } from './os/Boot';
import { Shell } from './os/Shell';
import { osCssVars } from './lib/art';
import { installFeedback } from './lib/fx';
import { enterOs } from './lib/session';
import { useUi } from './uiStore';

const params = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export function App() {
  const phase = useUi((s) => s.phase);
  const scale = useUi((s) => s.textScale);
  const volume = useGameStore((s) => s.settings.volume);
  const [ready, setReady] = useState(false);
  const vars = useMemo(() => osCssVars(), []);

  useEffect(() => installFeedback(), []);
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);
  useEffect(() => setVolume(volume), [volume]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }, [scale]);

  // 테스트: ?test=1 이면 부트를 건너뛴다(&boot=1 로 부트 화면을 볼 수 있다)
  useEffect(() => {
    const p = params();
    if (p.get('test') === '1' && p.get('boot') !== '1') useUi.getState().setPhase('os');
  }, []);

  useEffect(() => {
    if (phase !== 'os') return;
    enterOs();
    setReady(true);
    return enableAutosave(useGameStore);
  }, [phase]);

  return (
    <div className="os-root" style={vars}>
      {phase === 'boot' ? <Boot /> : ready ? <Shell /> : null}
    </div>
  );
}
