import { useEffect, useMemo, useState } from 'react';
import { MUSIC } from '@/data/feedback';
import { installAudioUnlock, setMusic } from '@/game/audio';
import { enableAutosave, useGameStore } from '@/store/gameStore';
import { DeskShell } from './desk/DeskShell';
import { Boot } from './os/Boot';
import { deskCssVars, osCssVars } from './lib/art';
import { installFeedback } from './lib/fx';
import { enterOs } from './lib/session';
import { useUi } from './uiStore';

const params = () => new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export function App() {
  const phase = useUi((s) => s.phase);
  const scale = useUi((s) => s.textScale);
  const [ready, setReady] = useState(false);
  const vars = useMemo(() => ({ ...osCssVars(), ...deskCssVars() }), []);

  useEffect(() => installFeedback(), []);
  // 오디오: 어떤 제스처에서든 스스로 풀린다(한 번만 설치)
  useEffect(() => {
    try {
      installAudioUnlock();
    } catch {
      /* 오디오 없음 */
    }
  }, []);
  // 부트·프롤로그의 음악(책상에 들어가면 책상의 감독이 이어받는다)
  useEffect(() => {
    if (phase !== 'boot') return;
    try {
      setMusic(MUSIC.boot);
    } catch {
      /* 오디오 없음 */
    }
  }, [phase]);
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
      {phase === 'boot' ? <Boot /> : ready ? <DeskShell /> : null}
    </div>
  );
}
