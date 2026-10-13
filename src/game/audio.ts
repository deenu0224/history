// Contract shared by world and UI. Implementation: world track (WebAudio synthesis, no asset files).
export type SfxName = 'discover' | 'success' | 'partial' | 'fail' | 'page' | 'step' | 'open' | 'close' | 'observe' | 'return' | 'select';
export type Ambience = 'past' | 'modern' | 'none';

const MASTER_SCALE = 0.55;
/** D 장조 5음계(옥타브 5~6) */
const PENTA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let volume = 0.8;
let wantAmbience: Ambience = 'none';
let activeAmbience: { kind: Ambience; stop: () => void } | null = null;
let lastStep = 0;

type ACtor = typeof AudioContext;

function getCtor(): ACtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: ACtor; webkitAudioContext?: ACtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const muted = () => volume <= 0.001;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = volume * MASTER_SCALE;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 1;
  sfxBus.connect(master);
  ambBus = ctx.createGain();
  ambBus.gain.value = 0.5;
  ambBus.connect(master);
  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** 첫 사용자 제스처에서 호출. 컨텍스트 생성/재개 후 대기 중이던 앰비언스를 시작한다. */
export function unlockAudio(): void {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().then(applyAmbience).catch(() => undefined);
  applyAmbience();
}

export function setVolume(v: number): void {
  volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
  if (ctx && master) master.gain.setTargetAtTime(volume * MASTER_SCALE, ctx.currentTime, 0.05);
  if (muted()) stopAmbienceNodes();
  else applyAmbience();
}

// ───────────────────────── 빌딩 블록 ─────────────────────────

function noiseSource(c: AudioContext, loop = false): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = loop;
  if (loop) s.loopStart = Math.random();
  return s;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(c: AudioContext, bus: AudioNode, freq: number, t: number, o: { type?: OscillatorType; peak?: number; attack?: number; decay?: number; glideTo?: number }): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + (o.attack ?? 0.01) + (o.decay ?? 0.3));
  env(g, t, o.peak ?? 0.2, o.attack ?? 0.01, o.decay ?? 0.3);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + (o.attack ?? 0.01) + (o.decay ?? 0.3) + 0.05);
}

function burst(c: AudioContext, bus: AudioNode, t: number, o: { type: BiquadFilterType; freq: number; q?: number; peak: number; attack?: number; decay: number; freqTo?: number }): void {
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = o.type;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + (o.attack ?? 0.005) + o.decay);
  f.Q.value = o.q ?? 0.7;
  const g = c.createGain();
  env(g, t, o.peak, o.attack ?? 0.005, o.decay);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + (o.attack ?? 0.005) + o.decay + 0.05);
}

// ───────────────────────── 효과음 ─────────────────────────

export function playSfx(name: SfxName): void {
  if (muted()) return;
  const c = ctx;
  if (!c || c.state !== 'running' || !sfxBus) return;
  const t = c.currentTime + 0.005;
  const bus = sfxBus;
  switch (name) {
    case 'page':
      burst(c, bus, t, { type: 'bandpass', freq: 3200, q: 0.8, peak: 0.16, attack: 0.012, decay: 0.09 });
      burst(c, bus, t + 0.07, { type: 'highpass', freq: 2200, peak: 0.1, attack: 0.01, decay: 0.12 });
      break;
    case 'open':
      burst(c, bus, t, { type: 'bandpass', freq: 1400, q: 0.9, peak: 0.12, attack: 0.02, decay: 0.16, freqTo: 3000 });
      break;
    case 'close':
      burst(c, bus, t, { type: 'bandpass', freq: 2600, q: 0.9, peak: 0.1, attack: 0.01, decay: 0.14, freqTo: 1100 });
      break;
    case 'select':
      tone(c, bus, 880, t, { type: 'sine', peak: 0.07, attack: 0.004, decay: 0.07 });
      break;
    case 'discover': {
      const f = PENTA[Math.floor(Math.random() * PENTA.length)];
      tone(c, bus, f, t, { type: 'sine', peak: 0.16, attack: 0.006, decay: 0.9 });
      tone(c, bus, f * 1.5, t + 0.012, { type: 'triangle', peak: 0.04, attack: 0.006, decay: 0.6 });
      burst(c, bus, t, { type: 'highpass', freq: 3500, peak: 0.03, decay: 0.05 });
      break;
    }
    case 'success':
      tone(c, bus, 659.25, t, { type: 'triangle', peak: 0.13, attack: 0.008, decay: 0.45 });
      tone(c, bus, 987.77, t + 0.16, { type: 'triangle', peak: 0.14, attack: 0.008, decay: 0.8 });
      tone(c, bus, 1318.5, t + 0.16, { type: 'sine', peak: 0.04, attack: 0.008, decay: 0.7 });
      break;
    case 'partial':
      tone(c, bus, 523.25, t, { type: 'sine', peak: 0.13, attack: 0.01, decay: 0.5 });
      tone(c, bus, 784, t + 0.005, { type: 'sine', peak: 0.03, attack: 0.01, decay: 0.35 });
      break;
    case 'fail':
      tone(c, bus, 110, t, { type: 'sine', peak: 0.28, attack: 0.004, decay: 0.28, glideTo: 48 });
      burst(c, bus, t, { type: 'lowpass', freq: 500, peak: 0.1, decay: 0.08 });
      break;
    case 'step': {
      const now = performance.now();
      if (now - lastStep < 140) return;
      lastStep = now;
      burst(c, bus, t, { type: 'lowpass', freq: 700 + Math.random() * 500, q: 0.5, peak: 0.035, attack: 0.002, decay: 0.035 });
      break;
    }
    case 'observe': {
      const src = noiseSource(c);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2.2;
      f.frequency.setValueAtTime(180, t);
      f.frequency.exponentialRampToValueAtTime(1400, t + 1.6);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      src.connect(f).connect(g).connect(bus);
      src.start(t, Math.random());
      src.stop(t + 2.2);
      tone(c, bus, 98, t, { type: 'sine', peak: 0.1, attack: 1.0, decay: 1.0 });
      break;
    }
    case 'return': {
      const src = noiseSource(c);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(1500, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 1.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.17, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      src.connect(f).connect(g).connect(bus);
      src.start(t, Math.random());
      src.stop(t + 1.9);
      tone(c, bus, 130.8, t + 0.5, { type: 'sine', peak: 0.07, attack: 0.5, decay: 0.9 });
      break;
    }
  }
}

// ───────────────────────── 앰비언스 ─────────────────────────

function stopAmbienceNodes(): void {
  activeAmbience?.stop();
  activeAmbience = null;
}

function applyAmbience(): void {
  const c = ctx;
  if (!c || c.state !== 'running' || !ambBus) return;
  if (muted() || wantAmbience === 'none') {
    stopAmbienceNodes();
    return;
  }
  if (activeAmbience?.kind === wantAmbience) return;
  stopAmbienceNodes();
  activeAmbience = wantAmbience === 'past' ? startPast(c, ambBus) : startModern(c, ambBus);
}

export function setAmbience(kind: Ambience): void {
  wantAmbience = kind;
  applyAmbience();
}

function makeLoopNoise(c: AudioContext, out: AudioNode, filter: { type: BiquadFilterType; freq: number; q?: number }, gainValue: number): { gain: GainNode; filter: BiquadFilterNode; src: AudioBufferSourceNode } {
  const src = noiseSource(c, true);
  const f = c.createBiquadFilter();
  f.type = filter.type;
  f.frequency.value = filter.freq;
  f.Q.value = filter.q ?? 0.6;
  const g = c.createGain();
  g.gain.value = gainValue;
  src.connect(f).connect(g).connect(out);
  src.start();
  return { gain: g, filter: f, src };
}

function lfo(c: AudioContext, rate: number, depth: number, target: AudioParam): OscillatorNode {
  const o = c.createOscillator();
  o.frequency.value = rate;
  const g = c.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

function startPast(c: AudioContext, bus: AudioNode): { kind: Ambience; stop: () => void } {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 2);
  out.connect(bus);
  const wind = makeLoopNoise(c, out, { type: 'lowpass', freq: 520, q: 0.4 }, 0.07);
  const l1 = lfo(c, 0.07, 0.04, wind.gain.gain);
  const l2 = lfo(c, 0.05, 220, wind.filter.frequency);
  const hiss = makeLoopNoise(c, out, { type: 'bandpass', freq: 1500, q: 0.5 }, 0.012);
  const l3 = lfo(c, 0.11, 0.008, hiss.gain.gain);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  const chirp = () => {
    if (!alive) return;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 1400;
    const t0 = c.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      tone(c, out, base, t0 + i * 0.11, { type: 'sine', peak: 0.022, attack: 0.008, decay: 0.07, glideTo: base * (1.15 + Math.random() * 0.2) });
    }
    timer = setTimeout(chirp, 5000 + Math.random() * 9000);
  };
  timer = setTimeout(chirp, 2500 + Math.random() * 3000);
  return {
    kind: 'past',
    stop() {
      alive = false;
      clearTimeout(timer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => {
        for (const n of [wind.src, hiss.src, l1, l2, l3]) {
          try {
            n.stop();
          } catch {
            /* 이미 정지 */
          }
        }
        out.disconnect();
      }, 700);
    },
  };
}

function startModern(c: AudioContext, bus: AudioNode): { kind: Ambience; stop: () => void } {
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + 2);
  out.connect(bus);
  const oscs: OscillatorNode[] = [];
  for (const [f, v] of [[50, 0.03], [100.4, 0.012], [150.2, 0.004]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = v;
    o.connect(g).connect(out);
    o.start();
    oscs.push(o);
  }
  const air = makeLoopNoise(c, out, { type: 'lowpass', freq: 260, q: 0.5 }, 0.03);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let alive = true;
  const typing = () => {
    if (!alive) return;
    const n = 3 + Math.floor(Math.random() * 7);
    let t = c.currentTime + 0.05;
    for (let i = 0; i < n; i++) {
      burst(c, out, t, { type: 'bandpass', freq: 2200 + Math.random() * 1500, q: 1.2, peak: 0.02 + Math.random() * 0.012, attack: 0.001, decay: 0.018 });
      t += 0.07 + Math.random() * 0.12;
    }
    timer = setTimeout(typing, 4000 + Math.random() * 8000);
  };
  timer = setTimeout(typing, 3000 + Math.random() * 3000);
  return {
    kind: 'modern',
    stop() {
      alive = false;
      clearTimeout(timer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => {
        for (const n of [...oscs, air.src]) {
          try {
            n.stop();
          } catch {
            /* 이미 정지 */
          }
        }
        out.disconnect();
      }, 700);
    },
  };
}
