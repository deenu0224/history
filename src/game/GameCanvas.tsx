// Contract: mounts the Phaser game into a full-size container. Implementation: world track.
import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { useGameStore } from '@/store/gameStore';
import { setVolume, unlockAudio } from './audio';

export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let game: Phaser.Game | null = null;

    // Phaser 는 큰 번들이라 지연 로드한다.
    void import('./createGame').then((m) => {
      if (cancelled) return;
      game = m.createGame(el);
    });

    setVolume(useGameStore.getState().settings.volume);
    const offVol = useGameStore.subscribe((s, prev) => {
      if (s.settings.volume !== prev.settings.volume) setVolume(s.settings.volume);
    });

    const unlock = () => unlockAudio();
    const evts = ['pointerdown', 'keydown', 'touchstart'] as const;
    for (const e of evts) window.addEventListener(e, unlock, { passive: true });

    return () => {
      cancelled = true;
      offVol();
      for (const e of evts) window.removeEventListener(e, unlock);
      game?.destroy(true);
      game = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      className="game-canvas"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#0b0d12', touchAction: 'none' }}
    />
  );
}
