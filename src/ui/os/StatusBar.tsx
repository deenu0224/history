import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fmtMinute, parseClock } from '../lib/text';

/** 단말 시계: 마지막으로 도착한 시각 있는 메시지의 시각에서 현실 1분마다 1분(연출 전용). */
export function useGameClock(): string {
  const inbox = useGameStore((s) => s.inbox);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  let base = 23 * 60 + 4;
  for (let i = inbox.length - 1; i >= 0; i--) {
    const c = parseClock(CONTENT.messages.find((m) => m.id === inbox[i])?.clock);
    if (c !== null) {
      base = c;
      break;
    }
  }
  const [since, setSince] = useState({ base, at: now });
  if (since.base !== base) setSince({ base, at: now });
  return fmtMinute(base + Math.min(25, Math.floor((now - since.at) / 60_000)));
}

export function StatusBar({ onSettings, onHome }: { onSettings(): void; onHome(): void }) {
  const clock = useGameClock();
  return (
    <header className="statusbar" data-testid="statusbar">
      <button type="button" className="sb-clock" onClick={onHome} aria-label="홈으로" data-testid="status-clock">
        {clock}
      </button>
      <span className="sb-title">결록 단말</span>
      <div className="sb-icons">
        <Px k="stat_sync" scale={2} />
        <Px k="stat_signal" scale={2} />
        <Px k="stat_battery" scale={2} />
        <button type="button" className="sb-btn" aria-label="설정" data-testid="open-settings" onClick={onSettings}>
          <Px k="app_settings_sm" scale={2} />
        </button>
      </div>
    </header>
  );
}
