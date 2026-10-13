/** 효과음 합성. 모두 짧고 여리게. 피크는 버스 기준 대략 0.1~0.3. */
import { burst, noiseSource, tone, type Env } from './env';

export const SFX_NAMES = [
  // 기존
  'discover', 'success', 'partial', 'fail', 'page', 'step', 'open', 'close', 'observe', 'return', 'select', 'shutter',
  // 결록 단말용
  'stamp_confirm', 'stamp_correct', 'stamp_red', 'stamp_auto', 'printer', 'warning', 'inspect_link', 'inspect_notation',
  'hear', 'restore', 'erase', 'queue_next', 'shift_end', 'message', 'capture_full',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/**
 * src/data/feedback.ts 의 FEEDBACK[].sfx 문자열(옛 이름 포함) → 실제 효과음. 'none' 은 의도적 무음.
 * UI 는 playFeedbackSfx(name) 로 이 표를 거치면 된다.
 */
export const SFX_ALIASES: Readonly<Record<string, SfxName | 'none'>> = {
  none: 'none',
  tick: 'select',
  search_hit: 'open',
  search_miss: 'close',
  clock_tick: 'step',
  paper: 'page',
  soft_thud: 'fail',
  stamp: 'stamp_confirm',
  ink_bloom: 'restore',
  message: 'message',
  capture_full: 'capture_full',
};

export function resolveSfx(name: string): SfxName | 'none' | undefined {
  if ((SFX_NAMES as readonly string[]).includes(name)) return name as SfxName;
  return SFX_ALIASES[name];
}

export function renderSfx(e: Env, bus: AudioNode, name: SfxName, t: number): void {
  const c = e.c;
  const R = Math.random;
  switch (name) {
    case 'page':
      burst(e, bus, t, { type: 'bandpass', freq: 3200, q: 0.8, peak: 0.16, attack: 0.012, decay: 0.09 });
      burst(e, bus, t + 0.07, { type: 'highpass', freq: 2200, peak: 0.1, attack: 0.01, decay: 0.12 });
      break;
    case 'open':
      burst(e, bus, t, { type: 'bandpass', freq: 1400, q: 0.9, peak: 0.12, attack: 0.02, decay: 0.16, freqTo: 3000 });
      break;
    case 'close':
      burst(e, bus, t, { type: 'bandpass', freq: 2600, q: 0.9, peak: 0.1, attack: 0.01, decay: 0.14, freqTo: 1100 });
      break;
    case 'select':
      tone(e, bus, 880, t, { peak: 0.08, attack: 0.004, decay: 0.07 });
      break;
    case 'message':
      tone(e, bus, 988, t, { type: 'triangle', peak: 0.07, attack: 0.004, decay: 0.08 });
      tone(e, bus, 1319, t + 0.08, { type: 'triangle', peak: 0.07, attack: 0.004, decay: 0.16 });
      break;
    case 'shutter':
      burst(e, bus, t, { type: 'highpass', freq: 2600, peak: 0.08, attack: 0.002, decay: 0.03 });
      tone(e, bus, 420, t + 0.035, { type: 'square', peak: 0.03, attack: 0.002, decay: 0.04, glideTo: 240 });
      burst(e, bus, t + 0.05, { type: 'bandpass', freq: 1800, q: 1.2, peak: 0.06, attack: 0.002, decay: 0.05 });
      break;
    case 'discover': {
      const f = [587.33, 659.25, 739.99, 880, 987.77, 1174.66][Math.floor(R() * 6)];
      tone(e, bus, f, t, { peak: 0.16, attack: 0.006, decay: 0.9 });
      tone(e, bus, f * 1.5, t + 0.012, { type: 'triangle', peak: 0.04, attack: 0.006, decay: 0.6 });
      burst(e, bus, t, { type: 'highpass', freq: 3500, peak: 0.03, decay: 0.05 });
      break;
    }
    case 'success':
      tone(e, bus, 659.25, t, { type: 'triangle', peak: 0.13, attack: 0.008, decay: 0.45 });
      tone(e, bus, 987.77, t + 0.16, { type: 'triangle', peak: 0.14, attack: 0.008, decay: 0.8 });
      tone(e, bus, 1318.5, t + 0.16, { peak: 0.04, attack: 0.008, decay: 0.7 });
      break;
    case 'partial':
      tone(e, bus, 523.25, t, { peak: 0.13, attack: 0.01, decay: 0.5 });
      tone(e, bus, 784, t + 0.005, { peak: 0.03, attack: 0.01, decay: 0.35 });
      break;
    case 'fail':
      tone(e, bus, 110, t, { peak: 0.28, attack: 0.004, decay: 0.28, glideTo: 48 });
      burst(e, bus, t, { type: 'lowpass', freq: 500, peak: 0.1, decay: 0.08 });
      break;
    case 'capture_full':
      tone(e, bus, 150, t, { peak: 0.22, attack: 0.004, decay: 0.2, glideTo: 70 });
      burst(e, bus, t, { type: 'lowpass', freq: 600, peak: 0.08, decay: 0.06 });
      break;
    case 'step':
      burst(e, bus, t, { type: 'lowpass', freq: 700 + R() * 500, q: 0.5, peak: 0.04, attack: 0.002, decay: 0.035 });
      break;
    case 'observe':
    case 'return': {
      const up = name === 'observe';
      const src = noiseSource(e);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2.2;
      f.frequency.setValueAtTime(up ? 180 : 1500, t);
      f.frequency.exponentialRampToValueAtTime(up ? 1400 : 200, t + (up ? 1.6 : 1.5));
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(up ? 0.2 : 0.17, t + (up ? 1.1 : 0.5));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (up ? 2.1 : 1.8));
      src.connect(f).connect(g).connect(bus);
      src.start(t, R());
      src.stop(t + 2.2);
      if (up) tone(e, bus, 98, t, { peak: 0.1, attack: 1.0, decay: 1.0 });
      else tone(e, bus, 130.8, t + 0.5, { peak: 0.07, attack: 0.5, decay: 0.9 });
      break;
    }
    case 'stamp_confirm': // 둔한 나무 소리 + 먹이 눌리는 소리
      tone(e, bus, 150, t, { peak: 0.3, attack: 0.003, decay: 0.12, glideTo: 70 });
      burst(e, bus, t, { type: 'lowpass', freq: 900, peak: 0.14, attack: 0.002, decay: 0.05 });
      burst(e, bus, t + 0.03, { type: 'bandpass', freq: 500, q: 0.9, peak: 0.06, attack: 0.01, decay: 0.12, freqTo: 250 });
      break;
    case 'stamp_correct':
      tone(e, bus, 150, t, { peak: 0.28, attack: 0.003, decay: 0.12, glideTo: 70 });
      burst(e, bus, t, { type: 'lowpass', freq: 900, peak: 0.12, attack: 0.002, decay: 0.05 });
      burst(e, bus, t + 0.03, { type: 'bandpass', freq: 500, q: 0.9, peak: 0.05, attack: 0.01, decay: 0.1, freqTo: 250 });
      tone(e, bus, 1180, t + 0.01, { type: 'triangle', peak: 0.08, attack: 0.001, decay: 0.05 });
      tone(e, bus, 880, t + 0.1, { peak: 0.06, attack: 0.01, decay: 0.45 });
      break;
    case 'stamp_red': // 더 무겁다
      tone(e, bus, 110, t, { peak: 0.4, attack: 0.004, decay: 0.24, glideTo: 44 });
      tone(e, bus, 190, t, { type: 'triangle', peak: 0.12, attack: 0.002, decay: 0.08, glideTo: 90 });
      burst(e, bus, t, { type: 'lowpass', freq: 650, peak: 0.2, attack: 0.002, decay: 0.08 });
      burst(e, bus, t + 0.04, { type: 'bandpass', freq: 420, q: 0.9, peak: 0.09, attack: 0.015, decay: 0.2, freqTo: 180 });
      break;
    case 'stamp_auto': // 평평한 회색 쿵
      tone(e, bus, 90, t, { peak: 0.2, attack: 0.004, decay: 0.09 });
      burst(e, bus, t, { type: 'lowpass', freq: 400, peak: 0.08, attack: 0.002, decay: 0.05 });
      break;
    case 'printer': {
      // 1초: 모터 소리 + 종이 이송 틱
      const src = noiseSource(e, true);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.06);
      g.gain.setValueAtTime(0.07, t + 0.88);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
      src.connect(f).connect(g).connect(bus);
      src.start(t, R());
      src.stop(t + 1.1);
      tone(e, bus, 96, t, { type: 'sawtooth', peak: 0.012, attack: 0.06, decay: 0.95 });
      for (let i = 0; i < 14; i++) {
        burst(e, bus, t + 0.04 + i * 0.066, { type: 'bandpass', freq: 2400 + (i % 3) * 400, q: 1.3, peak: 0.06, attack: 0.001, decay: 0.014 });
      }
      break;
    }
    case 'warning': {
      // 종이 찢김 + 낮은 음
      for (let i = 0; i < 7; i++) {
        burst(e, bus, t + i * 0.045, { type: 'highpass', freq: 1800 + R() * 1500, peak: 0.025 + R() * 0.02, attack: 0.002, decay: 0.04 });
      }
      tone(e, bus, 98, t + 0.2, { peak: 0.14, attack: 0.02, decay: 0.6, glideTo: 82 });
      tone(e, bus, 147, t + 0.2, { type: 'triangle', peak: 0.04, attack: 0.02, decay: 0.4 });
      break;
    }
    case 'inspect_link': // 팽팽한 줄 튕김
      tone(e, bus, 660, t, { peak: 0.1, attack: 0.002, decay: 0.5, glideTo: 640 });
      tone(e, bus, 1320, t, { type: 'triangle', peak: 0.03, attack: 0.002, decay: 0.25 });
      burst(e, bus, t, { type: 'highpass', freq: 4000, peak: 0.025, attack: 0.001, decay: 0.02 });
      break;
    case 'inspect_notation': // 부드러운 흔들림
      tone(e, bus, 330, t, { peak: 0.08, attack: 0.05, decay: 0.38, vib: [7, 14] });
      tone(e, bus, 495, t + 0.02, { type: 'triangle', peak: 0.025, attack: 0.05, decay: 0.3, vib: [7, 8] });
      break;
    case 'hear':
      burst(e, bus, t, { type: 'bandpass', freq: 4200, q: 1.4, peak: 0.03, attack: 0.02, decay: 0.1 });
      tone(e, bus, 1760, t + 0.03, { peak: 0.022, attack: 0.01, decay: 0.2 });
      break;
    case 'restore': {
      // 따뜻한 부풀음 + 먹 번짐
      tone(e, bus, 196, t, { peak: 0.09, attack: 0.5, decay: 1.2 });
      tone(e, bus, 294, t + 0.08, { peak: 0.07, attack: 0.5, decay: 1.1 });
      tone(e, bus, 392, t + 0.16, { type: 'triangle', peak: 0.06, attack: 0.5, decay: 1.0 });
      burst(e, bus, t, { type: 'bandpass', freq: 500, q: 0.8, peak: 0.07, attack: 0.5, decay: 0.9, freqTo: 1300 });
      break;
    }
    case 'erase': // 침묵 뒤 희미한 쏴
      burst(e, bus, t + 0.25, { type: 'bandpass', freq: 900, q: 0.7, peak: 0.05, attack: 0.3, decay: 0.5, freqTo: 300 });
      break;
    case 'queue_next': // 카드 미끄러짐
      burst(e, bus, t, { type: 'bandpass', freq: 1800, q: 1.0, peak: 0.09, attack: 0.02, decay: 0.12, freqTo: 3200 });
      burst(e, bus, t + 0.13, { type: 'bandpass', freq: 2200, q: 2, peak: 0.04, attack: 0.001, decay: 0.02 });
      break;
    case 'shift_end': // 부드러운 종
      for (const [mul, pk, dec] of [[1, 0.1, 2.2], [2.76, 0.035, 1.1], [5.4, 0.015, 0.6]] as const) {
        tone(e, bus, 523.25 * mul, t, { peak: pk, attack: 0.004, decay: dec });
      }
      break;
  }
}
