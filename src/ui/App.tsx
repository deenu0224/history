import { useEffect, useMemo } from 'react';
import { selectApps, enableAutosave, useGameStore } from '@/store/gameStore';
import { setVolume, unlockAudio } from '@/game/audio';
import type { AppId } from '@/core/types';
import { Boot } from './os/Boot';
import { Shell } from './os/Shell';
import { osCssVars } from './lib/art';
import { installFeedback } from './lib/fx';
import { useUi } from './uiStore';

const params = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

/** 로그인(Boot) 직후: 이미 열려 있는 앱은 연출 없이 독에 둔다(이후 생기는 앱만 '설치' 연출). */
function initShown() {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  for (const a of selectApps(g) as AppId[]) ui.markShown(a);
  if (g.inbox.includes('m_sys_boot') && !g.read.includes('m_sys_boot')) g.readMessage('m_sys_boot');
}

export function App() {
  const phase = useUi((s) => s.phase);
  const scale = useUi((s) => s.textScale);
  const volume = useGameStore((s) => s.settings.volume);
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

  // 테스트: ?test=1 이면 부트를 건너뛴다(?boot=1 로 부트 화면을 볼 수 있다)
  useEffect(() => {
    const p = params();
    if (p.get('test') === '1' && p.get('boot') !== '1') {
      initShown();
      if (p.get('all') === '1') for (const a of selectApps(useGameStore.getState()) as AppId[]) useUi.getState().markShown(a);
      useUi.getState().setPhase('os');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'os') return;
    initShown();
    return enableAutosave(useGameStore);
  }, [phase]);

  return (
    <div className="os-root" style={vars}>
      {phase === 'boot' ? <Boot /> : <Shell />}
    </div>
  );
}
