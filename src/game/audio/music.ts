/** 음악 재생기: 룩어헤드 스케줄러 + 등전력 크로스페이드. 한 번에 한 트랙(페이드 중엔 두 트랙). */
import { generateLoop, TRACKS, type MusicEvent, type TrackId } from './compose';
import { equalPowerCurve, planCrossfade, clampFade, FADE_DEFAULT } from './crossfade';
import type { Env } from './env';
import type { Graph } from './graph';
import { playMusicEvent } from './instruments';

export type MusicTrack = TrackId | 'none';
export interface MusicOpts {
  /** 크로스페이드 초(기본 2.5) */
  fade?: number;
  /** 트랙 상대 음량 0..1 (기본 1) */
  volume?: number;
  /** 작곡 시드 변형(기본 0) */
  seed?: number;
}

const LOOKAHEAD = 1.6;
const TICK_MS = 250;

interface Voice {
  id: TrackId;
  gain: GainNode;
  /** 퇴장 전용 게인(페이드 인 곡선과 겹쳐도 충돌하지 않게 분리) */
  out: GainNode;
  timer: ReturnType<typeof setInterval> | undefined;
  events: MusicEvent[];
  cursor: number;
  pass: number;
  passStart: number;
  length: number;
  seed: number;
  level: number;
}

export class MusicEngine {
  private current: Voice | null = null;
  constructor(
    private e: Env,
    private g: Graph,
  ) {}

  get track(): MusicTrack {
    return this.current?.id ?? 'none';
  }

  set(track: MusicTrack, opts: MusicOpts = {}): void {
    if (track === this.track) return;
    const c = this.e.c;
    const now = c.currentTime;
    const fade = clampFade(opts.fade, FADE_DEFAULT);
    const plan = planCrossfade(now, fade);
    const old = this.current;
    this.current = null;
    if (old) this.retire(old, plan.dur, plan.disposeAt - now);
    if (track === 'none') return;
    const spec = TRACKS[track];
    const gain = c.createGain();
    const level = spec.level * Math.min(1, Math.max(0, opts.volume ?? 1));
    const out = c.createGain();
    gain.connect(out).connect(this.g.musicIn);
    if (plan.dur <= 0.01) gain.gain.value = level;
    else {
      const curve = equalPowerCurve(Math.max(8, Math.round(plan.dur * 20)), 'in').map((v) => v * level);
      gain.gain.value = 0;
      gain.gain.setValueCurveAtTime(curve, now, plan.dur);
    }
    const seed = opts.seed ?? 0;
    const first = generateLoop(track, 0, seed);
    const v: Voice = { id: track, gain, out, timer: undefined, events: first.events, cursor: 0, pass: 0, passStart: now + 0.12, length: first.length, seed, level };
    this.current = v;
    this.pump(v);
    v.timer = setInterval(() => this.pump(v), TICK_MS);
  }

  private pump(v: Voice): void {
    const now = this.e.c.currentTime;
    for (let guard = 0; guard < 4000; guard++) {
      if (v.cursor >= v.events.length) {
        if (now + LOOKAHEAD < v.passStart + v.length) return;
        v.pass += 1;
        v.passStart += v.length;
        const next = generateLoop(v.id, v.pass, v.seed);
        v.events = next.events;
        v.length = next.length;
        v.cursor = 0;
        continue;
      }
      const ev = v.events[v.cursor];
      const at = v.passStart + ev.t;
      if (at > now + LOOKAHEAD) return;
      v.cursor++;
      if (at < now - 0.03) continue; // 이미 지난 이벤트(탭이 멈췄다 돌아온 경우)
      playMusicEvent(this.e, v.gain, ev, Math.max(at, now));
    }
  }

  private retire(v: Voice, fade: number, disposeIn: number): void {
    clearInterval(v.timer);
    const c = this.e.c;
    const t = c.currentTime;
    const g = v.out.gain;
    if (fade <= 0.01) g.setValueAtTime(0, t);
    else g.setValueCurveAtTime(equalPowerCurve(Math.max(8, Math.round(fade * 20)), 'out'), t, fade);
    setTimeout(() => {
      try {
        v.gain.disconnect();
        v.out.disconnect();
      } catch {
        /* 이미 해제 */
      }
    }, Math.max(0, disposeIn) * 1000 + 200);
  }

  stop(): void {
    this.set('none', { fade: 0.3 });
  }
}
