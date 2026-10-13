/** 앰비언스 레이어(과거 바람·새 / 현대 사무실 험·타이핑). 음악이 나오면 버스 쪽에서 낮춘다. */
import { burst, noiseSource, tone, type Env } from './env';

export type Ambience = 'past' | 'modern' | 'none';
export interface AmbHandle {
  kind: Ambience;
  stop: () => void;
}

function loopNoise(e: Env, out: AudioNode, f: { type: BiquadFilterType; freq: number; q?: number }, gainValue: number) {
  const src = noiseSource(e, true);
  const fl = e.c.createBiquadFilter();
  fl.type = f.type;
  fl.frequency.value = f.freq;
  fl.Q.value = f.q ?? 0.6;
  const g = e.c.createGain();
  g.gain.value = gainValue;
  src.connect(fl).connect(g).connect(out);
  src.start(0, Math.random());
  return { gain: g, filter: fl, src };
}

function lfo(e: Env, rate: number, depth: number, target: AudioParam): OscillatorNode {
  const o = e.c.createOscillator();
  o.frequency.value = rate;
  const g = e.c.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

function finish(e: Env, out: GainNode, nodes: Array<AudioScheduledSourceNode>, clear: () => void): void {
  clear();
  const t = e.c.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0.0001, t + 0.6);
  setTimeout(() => {
    for (const n of nodes) {
      try {
        n.stop();
      } catch {
        /* 이미 정지 */
      }
    }
    out.disconnect();
  }, 700);
}

export function startPast(e: Env, bus: AudioNode): AmbHandle {
  const c = e.c;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 2);
  out.connect(bus);
  const wind = loopNoise(e, out, { type: 'lowpass', freq: 520, q: 0.4 }, 0.07);
  const l1 = lfo(e, 0.07, 0.04, wind.gain.gain);
  const l2 = lfo(e, 0.05, 220, wind.filter.frequency);
  const hiss = loopNoise(e, out, { type: 'bandpass', freq: 1500, q: 0.5 }, 0.012);
  const l3 = lfo(e, 0.11, 0.008, hiss.gain.gain);
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const chirp = () => {
    if (!alive) return;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    const t0 = c.currentTime + 0.05;
    for (let i = 0; i < n; i++) tone(e, out, base, t0 + i * 0.11, { peak: 0.022, attack: 0.008, decay: 0.07, glideTo: base * (1.15 + Math.random() * 0.2) });
    timer = setTimeout(chirp, 5000 + Math.random() * 9000);
  };
  timer = setTimeout(chirp, 2500 + Math.random() * 3000);
  return {
    kind: 'past',
    stop: () =>
      finish(e, out, [wind.src, hiss.src, l1, l2, l3], () => {
        alive = false;
        clearTimeout(timer);
      }),
  };
}

export function startModern(e: Env, bus: AudioNode): AmbHandle {
  const c = e.c;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 2);
  out.connect(bus);
  const oscs: OscillatorNode[] = [];
  for (const [f, v] of [[50, 0.03], [100.4, 0.012], [150.2, 0.004]] as const) {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = v;
    o.connect(g).connect(out);
    o.start();
    oscs.push(o);
  }
  const air = loopNoise(e, out, { type: 'lowpass', freq: 260, q: 0.5 }, 0.03);
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const typing = () => {
    if (!alive) return;
    const n = 3 + Math.floor(Math.random() * 7);
    let t = c.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      burst(e, out, t, { type: 'bandpass', freq: 2200 + Math.random() * 1500, q: 1.2, peak: 0.02 + Math.random() * 0.012, attack: 0.001, decay: 0.018 });
      t += 0.07 + Math.random() * 0.12;
    }
    timer = setTimeout(typing, 4000 + Math.random() * 8000);
  };
  timer = setTimeout(typing, 3000 + Math.random() * 3000);
  return {
    kind: 'modern',
    stop: () =>
      finish(e, out, [...oscs, air.src], () => {
        alive = false;
        clearTimeout(timer);
      }),
  };
}
