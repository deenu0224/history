import { describe, expect, it } from 'vitest';
import { getAudioDebug, installAudioUnlock, playSfx, setAmbience, setMusic, setMusicVolume, setReducedAudio, setSfxVolume, setVolume, unlockAudio } from '@/game/audio';

// node 환경(window/AudioContext 없음)에서도 모든 공개 API 가 던지지 않고 아무 일도 하지 않아야 한다.
describe('audio facade without WebAudio', () => {
  it('does not throw and reports unsupported', () => {
    expect(() => {
      installAudioUnlock();
      unlockAudio();
      setVolume(0.5);
      setSfxVolume(1);
      setMusicVolume(0.4);
      setReducedAudio(false);
      setAmbience('past');
      setMusic('title', { fade: 2 });
      playSfx('stamp_confirm');
      playSfx('tick'); // FEEDBACK 옛 이름
      playSfx('nope-unknown');
    }).not.toThrow();
    const d = getAudioDebug();
    expect(d.supported).toBe(false);
    expect(d.wantedMusic).toBe('title');
    expect(d.dropped).toBe(1);
  });
});
