/** 오디오 컨텍스트 + 공유 자원(노이즈, 합성 버퍼 캐시). 실시간·오프라인 컨텍스트 모두 같은 코드를 쓴다. */
export interface Env {
  c: BaseAudioContext;
  noise: AudioBuffer;
  cache: Map<string, AudioBuffer>;
}

export function makeNoiseBuffer(c: BaseAudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let s = 0x1234567;
  for (let i = 0; i < len; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    d[i] = (s / 2147483648) - 1;
  }
  return buf;
}

export const makeEnv = (c: BaseAudioContext): Env => ({ c, noise: makeNoiseBuffer(c), cache: new Map() });

// ── 기본 블록 ──
export function noiseSource(e: Env, loop = false): AudioBufferSourceNode {
  const s = e.c.createBufferSource();
  s.buffer = e.noise;
  s.loop = loop;
  return s;
}

export function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

export interface ToneOpts {
  type?: OscillatorType;
  peak?: number;
  attack?: number;
  decay?: number;
  glideTo?: number;
  /** 비브라토 [Hz, 폭(Hz)] */
  vib?: readonly [number, number];
}

export function tone(e: Env, bus: AudioNode, freq: number, t: number, o: ToneOpts): void {
  const c = e.c;
  const osc = c.createOscillator();
  const g = c.createGain();
  const a = o.attack ?? 0.01;
  const d = o.decay ?? 0.3;
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + a + d);
  env(g, t, o.peak ?? 0.2, a, d);
  osc.connect(g).connect(bus);
  if (o.vib) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = o.vib[0];
    lg.gain.value = o.vib[1];
    l.connect(lg).connect(osc.frequency);
    l.start(t);
    l.stop(t + a + d + 0.05);
  }
  osc.start(t);
  osc.stop(t + a + d + 0.05);
}

export interface BurstOpts {
  type: BiquadFilterType;
  freq: number;
  q?: number;
  peak: number;
  attack?: number;
  decay: number;
  freqTo?: number;
  offset?: number;
}

export function burst(e: Env, bus: AudioNode, t: number, o: BurstOpts): void {
  const c = e.c;
  const src = noiseSource(e);
  const f = c.createBiquadFilter();
  const a = o.attack ?? 0.005;
  f.type = o.type;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + a + o.decay);
  f.Q.value = o.q ?? 0.7;
  const g = c.createGain();
  env(g, t, o.peak, a, o.decay);
  src.connect(f).connect(g).connect(bus);
  src.start(t, o.offset ?? Math.random() * 1.5);
  src.stop(t + a + o.decay + 0.05);
}
