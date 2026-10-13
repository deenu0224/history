/** 오프라인 렌더(OfflineAudioContext). 헤드리스 검증·WAV 저장·개발 페이지의 미리듣기용. 실제 믹서 그래프와 같은 코드를 쓴다. */
import { generateLoop, TRACKS, type TrackId } from './compose';
import { makeEnv } from './env';
import { buildGraph, MASTER_SCALE, MUSIC_SCALE } from './graph';
import { playMusicEvent } from './instruments';
import { renderSfx, type SfxName } from './sfx';

export interface Rendered {
  sampleRate: number;
  channels: Float32Array[];
}

function makeCtx(seconds: number, sr: number): OfflineAudioContext {
  return new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
}

export async function renderSfxOffline(name: SfxName, seconds = 3.2, sr = 44100, masterVolume = 0.8): Promise<Rendered> {
  const c = makeCtx(seconds, sr);
  const g = buildGraph(c);
  g.master.gain.value = masterVolume * MASTER_SCALE;
  renderSfx(makeEnv(c), g.sfxBus, name, 0.05);
  const buf = await c.startRendering();
  return { sampleRate: sr, channels: [buf.getChannelData(0), buf.getChannelData(1)] };
}

export async function renderTrackOffline(id: TrackId, seconds = 30, sr = 44100, opts: { masterVolume?: number; musicVolume?: number; startPass?: number; seed?: number; skip?: number } = {}): Promise<Rendered> {
  const skip = opts.skip ?? 0;
  const total = seconds + skip;
  const c = makeCtx(total, sr);
  const g = buildGraph(c);
  g.master.gain.value = (opts.masterVolume ?? 0.8) * MASTER_SCALE;
  g.musicBus.gain.value = (opts.musicVolume ?? 0.7) * MUSIC_SCALE;
  const e = makeEnv(c);
  const tg = c.createGain();
  tg.gain.value = TRACKS[id].level;
  tg.connect(g.musicIn);
  // skip: 앞 skip 초를 렌더한 뒤 잘라내고 그 뒤 seconds 를 돌려준다(후반 구간 확인용)
  let pass = opts.startPass ?? 0;
  let offset = 0;
  while (offset < total) {
    const loop = generateLoop(id, pass, opts.seed ?? 0);
    for (const ev of loop.events) {
      const at = offset + ev.t;
      if (at < total) playMusicEvent(e, tg, ev, at);
    }
    offset += loop.length;
    pass++;
  }
  const buf = await c.startRendering();
  const from = Math.floor(skip * sr);
  return { sampleRate: sr, channels: [buf.getChannelData(0).slice(from), buf.getChannelData(1).slice(from)] };
}

/** 16-bit PCM 스테레오 WAV */
export function encodeWav(r: Rendered): Uint8Array {
  const n = r.channels[0].length;
  const out = new Uint8Array(44 + n * 4);
  const dv = new DataView(out.buffer);
  const w = (o: number, s: string) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF');
  dv.setUint32(4, 36 + n * 4, true);
  w(8, 'WAVEfmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true);
  dv.setUint32(24, r.sampleRate, true);
  dv.setUint32(28, r.sampleRate * 4, true);
  dv.setUint16(32, 4, true);
  dv.setUint16(34, 16, true);
  w(36, 'data');
  dv.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < 2; ch++) {
      const v = Math.max(-1, Math.min(1, r.channels[ch][i]));
      dv.setInt16(44 + i * 4 + ch * 2, Math.round(v * 32767), true);
    }
  }
  return out;
}
