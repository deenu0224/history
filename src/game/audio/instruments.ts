/**
 * 국악기 합성(파일 없음). 모든 함수는 (env, 목적지, 시작 시각, ...) 이고 노드가 스스로 끝나며 정리된다.
 *  가야금·거문고: Karplus-Strong 가상 현(버퍼 캐시) + 농현/꺾는 음은 detune 곡선
 *  대금: 숨소리 노이즈 + 사인/삼각 + 느린 비브라토, 아주 약한 청(淸) 떨림
 *  해금: 톱니파를 포먼트 대역통과로 깎은 비음 + 활 소리, 매우 아껴 쓴다
 *  장구: 덩/쿵/덕/심장박동
 *  패드: 느린 어택의 디튠 삼각파(밤의 사무실)
 */
import { burst, noiseSource, tone, type Env } from './env';
import type { MusicEvent, Ornament, Stroke } from './compose';

const KS_RATE = 32000;

// ── Karplus-Strong ──
function renderPluck(freq: number, seconds: number, o: { bright: number; t60: number; pos: number; thunk: number }): Float32Array {
  const sr = KS_RATE;
  const n = Math.floor(sr * seconds);
  const out = new Float32Array(n);
  const D = sr / freq - 0.5; // 평균 필터 지연 0.5 보정
  let N = Math.floor(D);
  let d = D - N;
  if (d < 0.5) {
    N -= 1;
    d += 1;
  }
  const a = (1 - d) / (1 + d); // 1차 올패스(분수 지연)
  const ring = new Float32Array(Math.max(2, N));
  let s = 0x2468ace ^ Math.floor(freq * 100);
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
  // 여기(excitation): 로우패스된 노이즈 + 뜯는 위치 콤
  let lp = 0;
  for (let i = 0; i < ring.length; i++) {
    lp += o.bright * (rnd() - lp);
    ring[i] = lp;
  }
  const pk = Math.max(1, Math.round(ring.length * o.pos));
  const tmp = ring.slice();
  for (let i = 0; i < ring.length; i++) ring[i] = tmp[i] - tmp[(i - pk + ring.length) % ring.length] * 0.9;
  let peak = 0;
  for (let i = 0; i < ring.length; i++) peak = Math.max(peak, Math.abs(ring[i]));
  for (let i = 0; i < ring.length; i++) ring[i] /= peak || 1;
  const g = Math.pow(10, -3 / (o.t60 * freq)); // 한 주기당 감쇠
  let idx = 0;
  let prev = 0;
  let apx = 0;
  let apy = 0;
  for (let i = 0; i < n; i++) {
    const x = ring[idx];
    out[i] = x;
    const avg = 0.5 * (x + prev) * g;
    prev = x;
    const y = a * avg + apx - a * apy;
    apx = avg;
    apy = y;
    ring[idx] = y;
    idx = (idx + 1) % ring.length;
  }
  // 술대/손톱 소리: 처음 12ms 의 로우패스 노이즈
  if (o.thunk > 0) {
    let l2 = 0;
    const m = Math.floor(sr * 0.012);
    for (let i = 0; i < m; i++) {
      l2 += 0.25 * (rnd() - l2);
      out[i] += l2 * o.thunk * (1 - i / m);
    }
  }
  // 정규화 + 끝 페이드
  let mx = 0;
  for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(out[i]));
  const fade = Math.floor(sr * 0.15);
  for (let i = 0; i < n; i++) {
    let v = out[i] / (mx || 1);
    if (i > n - fade) v *= (n - i) / fade;
    out[i] = v * 0.9;
  }
  return out;
}

function pluckBuffer(e: Env, kind: 'gayageum' | 'geomungo', freq: number): AudioBuffer {
  const key = `${kind}:${Math.round(freq * 10)}`;
  const hit = e.cache.get(key);
  if (hit) return hit;
  const low = kind === 'geomungo';
  const seconds = low ? 4 : Math.min(4.5, Math.max(2.6, 700 / freq + 1.6));
  const data = renderPluck(freq, seconds, low ? { bright: 0.16, t60: 3.4, pos: 0.18, thunk: 0.5 } : { bright: 0.42, t60: 3.0, pos: 0.13, thunk: 0.18 });
  const buf = e.c.createBuffer(1, data.length, KS_RATE);
  buf.getChannelData(0).set(data);
  e.cache.set(key, buf);
  return buf;
}

/** 센트 곡선: 농현(떨림) / 꺾는 음(위에서 내려옴) / 밀어 올림 */
export function bendCurve(orn: Ornament, dur: number, n = 64): Float32Array | null {
  if (orn === 'none') return null;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * dur; // 초
    if (orn === 'vib') {
      const ramp = Math.min(1, Math.max(0, (x - 0.12) / 0.35));
      c[i] = Math.sin(2 * Math.PI * 5.2 * x) * 38 * ramp * Math.exp(-x * 0.45);
    } else if (orn === 'bendDown') {
      c[i] = 190 * Math.exp(-x / 0.07);
    } else {
      c[i] = -70 * Math.exp(-x / 0.05) + 55 * Math.min(1, Math.max(0, (x - 0.25) / 0.5)) * Math.exp(-x * 0.9);
    }
  }
  return c;
}

export function pluck(e: Env, bus: AudioNode, kind: 'gayageum' | 'geomungo', t: number, freq: number, vel: number, orn: Ornament): void {
  const c = e.c;
  const buf = pluckBuffer(e, kind, freq);
  const src = c.createBufferSource();
  src.buffer = buf;
  // 버퍼가 32k 로 만들어져 있어도 컨텍스트 레이트로 자동 보간된다
  const g = c.createGain();
  // KS 는 높은 음일수록 빨리 사라지고 작게 들린다 → 약간 보정
  g.gain.value = vel * (kind === 'geomungo' ? 0.42 : 0.8 * (1 + Math.min(1, Math.max(0, (freq - 300) / 700)) * 0.7));
  const curve = bendCurve(orn, Math.min(buf.duration, 2.2));
  if (curve) src.detune.setValueCurveAtTime(curve, t, Math.min(buf.duration, 2.2));
  src.connect(g).connect(bus);
  src.start(t);
  src.stop(t + buf.duration);
}

// ── 대금 ──
export function daegeum(e: Env, bus: AudioNode, t: number, freq: number, dur: number, vel: number, orn: Ornament): void {
  const c = e.c;
  const out = c.createGain();
  const peak = vel * 0.5;
  const att = Math.min(0.16, dur * 0.4);
  const rel = 0.45;
  const end = t + Math.max(dur, 0.3);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(peak, t + att);
  out.gain.setTargetAtTime(peak * 0.82, t + att, 0.4);
  out.gain.setValueAtTime(peak * 0.82, end);
  out.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(6000, freq * 5);
  lp.Q.value = 0.5;
  lp.connect(out).connect(bus);
  // 음정: 아래에서 슬쩍 들어옴 + 느린 비브라토
  const mk = (type: OscillatorType, mul: number, level: number) => {
    const o = c.createOscillator();
    o.type = type;
    const f = freq * mul;
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const g = c.createGain();
    g.gain.value = level;
    o.connect(g).connect(lp);
    o.start(t);
    o.stop(end + rel + 0.05);
    return o;
  };
  const o1 = mk('sine', 1, 0.8);
  const o2 = mk('triangle', 1, 0.28);
  const o3 = mk('sine', 2, 0.1);
  const depthCents = orn === 'vib' ? 28 : 10;
  const l = c.createOscillator();
  l.frequency.value = 4.6;
  const lg = c.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(freq * (depthCents / 1200) * Math.LN2, t + Math.min(0.9, dur * 0.7));
  l.connect(lg);
  for (const o of [o1, o2, o3]) lg.connect(o.frequency);
  l.start(t);
  l.stop(end + rel + 0.05);
  if (orn === 'bendDown') {
    for (const o of [o1, o2, o3]) {
      o.detune.setValueAtTime(120, t);
      o.detune.exponentialRampToValueAtTime(1, t + 0.18);
    }
  }
  // 숨소리
  const n = noiseSource(e, true);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(5000, freq * 2.2);
  bp.Q.value = 1.6;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.linearRampToValueAtTime(0.26, t + 0.03);
  ng.gain.exponentialRampToValueAtTime(0.1, t + 0.25);
  n.connect(bp).connect(ng).connect(lp);
  n.start(t, Math.random());
  n.stop(end + rel + 0.05);
  // 청(淸): 대금 특유의 얇은 떨림막 소리
  const cheong = noiseSource(e, true);
  const cf = c.createBiquadFilter();
  cf.type = 'bandpass';
  cf.frequency.value = 3800;
  cf.Q.value = 2.5;
  const cg = c.createGain();
  cg.gain.value = 0.035;
  cheong.connect(cf).connect(cg).connect(out);
  cheong.start(t, Math.random());
  cheong.stop(end + rel + 0.05);
}

// ── 해금 ──
export function haegeum(e: Env, bus: AudioNode, t: number, freq: number, dur: number, vel: number, orn: Ornament): void {
  const c = e.c;
  const out = c.createGain();
  const peak = vel * 0.3;
  const att = Math.min(0.6, dur * 0.35);
  const rel = 0.9;
  const end = t + Math.max(dur, 0.8);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(peak, t + att);
  out.gain.setValueAtTime(peak, end);
  out.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  out.connect(bus);
  const saw = c.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.setValueAtTime(freq * 0.99, t);
  saw.frequency.exponentialRampToValueAtTime(freq, t + 0.25);
  const saw2 = c.createOscillator();
  saw2.type = 'sawtooth';
  saw2.frequency.value = freq * 1.004;
  const mix = c.createGain();
  mix.gain.value = 0.5;
  saw.connect(mix);
  saw2.connect(mix);
  // 비음 포먼트
  const f1 = c.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 1050;
  f1.Q.value = 3;
  const f2 = c.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 2300;
  f2.Q.value = 2.5;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const g1 = c.createGain();
  g1.gain.value = 1.0;
  const g2 = c.createGain();
  g2.gain.value = 0.55;
  mix.connect(f1).connect(g1).connect(lp);
  mix.connect(f2).connect(g2).connect(lp);
  const low = c.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = Math.min(1500, freq * 3);
  mix.connect(low).connect(lp);
  lp.connect(out);
  const l = c.createOscillator();
  l.frequency.value = 5.2;
  const lg = c.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(freq * ((orn === 'vib' ? 24 : 12) / 1200) * Math.LN2, t + Math.min(1.5, dur * 0.8));
  l.connect(lg);
  lg.connect(saw.frequency);
  lg.connect(saw2.frequency);
  // 활 소리
  const bow = noiseSource(e, true);
  const bf = c.createBiquadFilter();
  bf.type = 'bandpass';
  bf.frequency.value = 2600;
  bf.Q.value = 0.8;
  const bg = c.createGain();
  bg.gain.value = 0.05;
  bow.connect(bf).connect(bg).connect(out);
  for (const n of [saw, saw2, l, bow]) {
    n.start(t);
    n.stop(end + rel + 0.05);
  }
}

// ── 장구 ──
export function janggu(e: Env, bus: AudioNode, t: number, stroke: Stroke, vel: number): void {
  const v = vel;
  switch (stroke) {
    case 'deong': // 양쪽: 낮은 울림 + 높은 가죽
      tone(e, bus, 118, t, { peak: 0.5 * v, attack: 0.004, decay: 0.38, glideTo: 88 });
      tone(e, bus, 215, t, { type: 'triangle', peak: 0.2 * v, attack: 0.003, decay: 0.16, glideTo: 190 });
      burst(e, bus, t, { type: 'lowpass', freq: 1200, peak: 0.16 * v, attack: 0.002, decay: 0.03 });
      break;
    case 'kung': // 왼쪽 궁편
      tone(e, bus, 100, t, { peak: 0.5 * v, attack: 0.005, decay: 0.45, glideTo: 70 });
      burst(e, bus, t, { type: 'lowpass', freq: 700, peak: 0.12 * v, attack: 0.002, decay: 0.03 });
      break;
    case 'deok': // 오른쪽 채편
      burst(e, bus, t, { type: 'bandpass', freq: 2600, q: 1.4, peak: 0.28 * v, attack: 0.001, decay: 0.07 });
      tone(e, bus, 280, t, { type: 'triangle', peak: 0.16 * v, attack: 0.002, decay: 0.09, glideTo: 230 });
      break;
    case 'lub':
      tone(e, bus, 66, t, { peak: 0.62 * v, attack: 0.006, decay: 0.26, glideTo: 46 });
      burst(e, bus, t, { type: 'lowpass', freq: 380, peak: 0.1 * v, attack: 0.003, decay: 0.05 });
      break;
    case 'dub':
      tone(e, bus, 78, t, { peak: 0.5 * v, attack: 0.006, decay: 0.2, glideTo: 54 });
      break;
  }
}

// ── 패드(밤의 사무실) ──
export function pad(e: Env, bus: AudioNode, t: number, freq: number, dur: number, vel: number): void {
  const c = e.c;
  const out = c.createGain();
  const att = Math.min(3.2, dur * 0.45);
  const rel = Math.min(3.2, dur * 0.5);
  const end = t + dur;
  const peak = vel * 0.17;
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(peak, t + att);
  out.gain.setValueAtTime(peak, Math.max(t + att, end - rel));
  out.gain.linearRampToValueAtTime(0.0001, end);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(1100, freq * 4);
  lp.Q.value = 0.4;
  lp.connect(out).connect(bus);
  for (const [det, type] of [[-7, 'triangle'], [6, 'sine']] as const) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(lp);
    o.start(t);
    o.stop(end + 0.1);
  }
}

// ── 이벤트 디스패치 ──
export function playMusicEvent(e: Env, bus: AudioNode, ev: MusicEvent, when: number): void {
  switch (ev.inst) {
    case 'gayageum':
      return pluck(e, bus, 'gayageum', when, ev.freq, ev.vel, ev.orn);
    case 'geomungo':
      return pluck(e, bus, 'geomungo', when, ev.freq, ev.vel, ev.orn);
    case 'daegeum':
      return daegeum(e, bus, when, ev.freq, ev.dur, ev.vel, ev.orn);
    case 'haegeum':
      return haegeum(e, bus, when, ev.freq, ev.dur, ev.vel, ev.orn);
    case 'janggu':
      return janggu(e, bus, when, ev.stroke ?? 'kung', ev.vel);
    case 'pad':
      return pad(e, bus, when, ev.freq, ev.dur, ev.vel);
  }
}
