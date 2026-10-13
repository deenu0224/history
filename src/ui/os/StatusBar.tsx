import { useEffect, useState } from 'react';
import { Px } from '../lib/art';
import { useUi } from '../uiStore';
import type { ShellMode } from '../hooks';

/** 게임 안의 시계: 23:04 에서 시작해 현실 1분마다 1분 흐른다(연출 전용). */
export function useGameClock(): string {
  const [min, setMin] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMin((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const total = (23 * 60 + 4 + min) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function StatusBar({ mode, onSettings, onHome }: { mode: ShellMode; onSettings(): void; onHome(): void }) {
  const clock = useGameClock();
  const recent = useUi((s) => s.recent);
  const setSwitcher = useUi((s) => s.setSwitcher);
  return (
    <header className="statusbar" data-testid="statusbar">
      <button className="sb-clock" onClick={onHome} aria-label="홈으로" data-testid="status-clock">
        {clock}
      </button>
      <span className="sb-title">결록 단말</span>
      <div className="sb-icons">
        <Px k="stat_sync" scale={2} />
        <Px k="stat_signal" scale={2} />
        <Px k="stat_battery" scale={2} />
        {mode === 'mobile' && recent.length > 1 && (
          <button className="sb-btn" aria-label="실행 중인 앱" data-testid="open-switcher" onClick={() => setSwitcher(true)}>
            ▣
          </button>
        )}
        <button className="sb-btn" aria-label="설정" data-testid="open-settings" onClick={onSettings}>
          <Px k="app_settings_sm" scale={2} />
        </button>
      </div>
    </header>
  );
}
