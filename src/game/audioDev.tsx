/** 오디오 개발 페이지(/audio-dev.html): 음악 트랙·효과음·볼륨을 눌러 보고, 컨텍스트 상태/마지막 효과음을 확인한다. */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getAudioDebug,
  installAudioUnlock,
  onAudioDebug,
  playSfx,
  setAmbience,
  setMusic,
  setMusicVolume,
  setMuted,
  setReducedAudio,
  setSfxVolume,
  setVolume,
  unlockAudio,
  SFX_NAMES,
  TRACK_IDS,
  type Ambience,
} from './audio';

installAudioUnlock();

const btn: React.CSSProperties = { padding: '12px 14px', margin: 4, background: '#1c2230', color: '#e8ebf2', border: '1px solid #39425a', borderRadius: 8, fontSize: 14, minHeight: 44 };

function Slider({ label, init, on }: { label: string; init: number; on: (v: number) => void }) {
  const [v, setV] = useState(init);
  return (
    <label style={{ display: 'block', margin: '6px 0' }}>
      {label} {v.toFixed(2)}
      <input type="range" min={0} max={1} step={0.01} value={v} style={{ width: '100%' }} onChange={(e) => (setV(+e.target.value), on(+e.target.value))} />
    </label>
  );
}

function App() {
  const [, force] = useState(0);
  useEffect(() => {
    const off = onAudioDebug(() => force((n) => n + 1));
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => (off(), clearInterval(id));
  }, []);
  const d = getAudioDebug();
  return (
    <div style={{ padding: '12px 16px', maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ margin: '8px 0' }}>결록 오디오</h2>
      <pre data-testid="debug" style={{ background: '#121620', padding: 10, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
        {`state: ${d.state}  (sr ${d.sampleRate})\nlast sfx: ${d.lastSfx || '-'} (${d.lastSfxAgoMs < 0 ? '-' : d.lastSfxAgoMs + 'ms ago'})\nplayed ${d.played} · queued ${d.queued} · dropped ${d.dropped} · unlocks ${d.unlocks}\nmusic: ${d.music} (want ${d.wantedMusic}) · ambience: ${d.ambience}\nvol m${d.volume} s${d.sfxVolume} mu${d.musicVolume} · reduced ${d.reduced} · muted ${d.muted} · hidden ${d.hidden}\nlast event: ${d.lastEvent || '-'}`}
      </pre>
      <button style={btn} onClick={() => unlockAudio()}>unlockAudio()</button>
      <h3>음악</h3>
      {(['none', ...TRACK_IDS] as const).map((t) => (
        <button key={t} style={{ ...btn, borderColor: d.wantedMusic === t ? '#d9b36a' : '#39425a' }} onClick={() => setMusic(t)}>
          {t}
        </button>
      ))}
      <h3>앰비언스</h3>
      {(['none', 'past', 'modern'] as Ambience[]).map((a) => (
        <button key={a} style={btn} onClick={() => setAmbience(a)}>
          {a}
        </button>
      ))}
      <h3>볼륨</h3>
      <Slider label="master" init={0.8} on={setVolume} />
      <Slider label="sfx" init={1} on={setSfxVolume} />
      <Slider label="music" init={0.7} on={setMusicVolume} />
      <button style={btn} onClick={() => setMuted(!d.muted)}>mute toggle</button>
      <button style={btn} onClick={() => setReducedAudio(!d.reduced)}>reduced toggle</button>
      <h3>효과음</h3>
      {SFX_NAMES.map((s) => (
        <button key={s} style={btn} onClick={() => playSfx(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
