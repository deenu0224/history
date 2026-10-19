/**
 * 다이얼 프로토타입의 실시간 합성음(WebAudio). 게임 엔진의 기본 블록(env.ts: 노이즈 버퍼·tone·burst)을 다시 쓴다.
 *  - 정적: 루프 노이즈 → 대역 통과
 *  - 맥놀이: 가까운 두 사인(차 = 거리). 잠금이면 차 0 = 맑은 한 음
 *  - 웅얼거림: 음절 리듬의 포먼트 블립(화자마다 음색·빠르기 다름). 맑을수록 저역 통과가 열린다
 *  - 눈금 딸깍, 고정 종소리
 * 첫 제스처 안에서 start() 를 부른다(iOS). 실패하면 조용히 무음.
 */
import { makeEnv, noiseSource, tone, burst, type Env } from '@/game/audio/env';
import type { Voice } from './model';

export interface AudioState {
  staticLevel: number;
  beatHz: number | null;
  beatLevel: number;
  voice: Voice | null;
  voiceLevel: number;
  /** 0..1 — 1 이면 말소리가 또렷(저역 통과 활짝) */
  voiceClarity: number;
}

const VOICES: Record<Voice, { f0: number; syl: number; wave: OscillatorType; shift: number; beat: number }> = {
  // 상소를 읽는 소리: 높고 고른 낭독
  reader: { f0: 150, syl: 0.17, wave: 'triangle', shift: 1.08, beat: 392 },
  // 높은 자리의 목소리: 낮고 느리며 끊어 말함
  king: { f0: 104, syl: 0.23, wave: 'sawtooth', shift: 0.94, beat: 330 },
};
const VOWELS: [number, number][] = [
  [730, 1090], // 아
  [530, 1840], // 에
  [300, 2200], // 이
  [570, 840], // 오
  [320, 800], // 우
  [600, 1200], // 어
];

export class DialAudio {
  private ctx: AudioContext | null = null;
  private e: Env | null = null;
  private master!: GainNode;
  private staticG!: GainNode;
  private beatG!: GainNode;
  private oscA!: OscillatorNode;
  private oscB!: OscillatorNode;
  private voiceBus!: GainNode;
  private voiceLp!: BiquadFilterNode;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextSyl = 0;
  private sylIdx = 0;
  private st: AudioState = { staticLevel: 0.6, beatHz: null, beatLevel: 0, voice: null, voiceLevel: 0, voiceClarity: 0 };

  start(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
      return;
    }
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    const c = this.ctx;
    void c.resume().catch(() => undefined);
    this.e = makeEnv(c);
    this.master = c.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(c.destination);

    // 정적
    const n = noiseSource(this.e, true);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.45;
    this.staticG = c.createGain();
    this.staticG.gain.value = 0;
    n.connect(bp).connect(this.staticG).connect(this.master);
    n.start();

    // 맥놀이
    this.beatG = c.createGain();
    this.beatG.gain.value = 0;
    this.oscA = c.createOscillator();
    this.oscB = c.createOscillator();
    this.oscA.frequency.value = 330;
    this.oscB.frequency.value = 330;
    const half = c.createGain();
    half.gain.value = 0.5;
    this.oscA.connect(half);
    this.oscB.connect(half);
    half.connect(this.beatG).connect(this.master);
    this.oscA.start();
    this.oscB.start();

    // 말소리 버스
    this.voiceLp = c.createBiquadFilter();
    this.voiceLp.type = 'lowpass';
    this.voiceLp.frequency.value = 700;
    this.voiceBus = c.createGain();
    this.voiceBus.gain.value = 0;
    this.voiceLp.connect(this.voiceBus).connect(this.master);

    this.nextSyl = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
    this.apply();
  }

  set(s: AudioState): void {
    this.st = s;
    this.apply();
  }

  private apply(): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const s = this.st;
    this.staticG.gain.setTargetAtTime(0.16 * s.staticLevel, t, 0.05);
    const v = s.voice ? VOICES[s.voice] : VOICES.king;
    const base = v.beat;
    this.oscA.frequency.setTargetAtTime(base, t, 0.03);
    this.oscB.frequency.setTargetAtTime(base + (s.beatHz ?? 0), t, 0.03);
    this.beatG.gain.setTargetAtTime(s.beatHz === null ? 0 : 0.07 * s.beatLevel, t, 0.06);
    this.voiceBus.gain.setTargetAtTime(0.5 * s.voiceLevel, t, 0.08);
    this.voiceLp.frequency.setTargetAtTime(500 + 3200 * s.voiceClarity, t, 0.08);
  }

  /** 음절 하나 = 포먼트 두 개를 지난 펄스 */
  private schedule(): void {
    const c = this.ctx;
    const e = this.e;
    if (!c || !e || c.state !== 'running') return;
    const s = this.st;
    if (this.nextSyl < c.currentTime) this.nextSyl = c.currentTime + 0.02;
    while (this.nextSyl < c.currentTime + 0.25) {
      const t = this.nextSyl;
      const v = s.voice ? VOICES[s.voice] : null;
      if (v && s.voiceLevel > 0.01) {
        const i = this.sylIdx++;
        // 3~5 음절마다 쉼(어절 경계)
        if (i % 5 === 4 || (i % 7 === 6 && s.voice === 'king')) {
          this.nextSyl += v.syl * 1.6;
          continue;
        }
        const dur = v.syl * (0.75 + 0.5 * ((i * 37) % 11) / 11);
        const [f1, f2] = VOWELS[(i * 7 + (s.voice === 'king' ? 3 : 0)) % VOWELS.length];
        const osc = c.createOscillator();
        osc.type = v.wave;
        const f0 = v.f0 * (1 + 0.06 * Math.sin(i * 1.7)) * (i % 5 === 3 ? 0.92 : 1);
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.linearRampToValueAtTime(f0 * 0.96, t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        for (const [f, q, a] of [[f1 * v.shift, 6, 1], [f2 * v.shift, 9, 0.6]] as const) {
          const bp = c.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = f;
          bp.Q.value = q;
          const ga = c.createGain();
          ga.gain.value = a;
          osc.connect(bp).connect(ga).connect(g);
        }
        g.connect(this.voiceLp);
        osc.start(t);
        osc.stop(t + dur + 0.05);
        this.nextSyl += dur + 0.02;
      } else {
        this.nextSyl += 0.1;
      }
    }
  }

  tick(kind: 'outer' | 'inner'): void {
    if (!this.e || !this.ctx) return;
    const t = this.ctx.currentTime;
    burst(this.e, this.master, t, { type: 'bandpass', freq: kind === 'outer' ? 3200 : 2100, q: 4, peak: 0.12, decay: 0.018 });
  }

  chime(): void {
    if (!this.e || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => tone(this.e!, this.master, f, t + i * 0.12, { peak: 0.09, attack: 0.01, decay: 1.4 }));
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.e = null;
  }
}

/** 진동(허용될 때만). 실패는 무시 */
export function buzz(p: number | number[]): void {
  try {
    const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
    if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
    nav.vibrate?.(p);
  } catch {
    /* 미지원 */
  }
}
