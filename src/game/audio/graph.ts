/** 믹서 그래프: (sfx | amb | music→리버브) → master → 리미터 → 출력 */
export const MASTER_SCALE = 0.8;
export const MUSIC_SCALE = 0.85;
export const AMB_BASE = 0.5;

export interface Graph {
  master: GainNode;
  limiter: DynamicsCompressorNode;
  sfxBus: GainNode;
  ambBus: GainNode;
  /** 트랙 게인들이 여기로 모인다(리버브 앞) */
  musicIn: GainNode;
  musicBus: GainNode;
}

function reverbIR(c: BaseAudioContext, seconds = 2.6): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let s = 0x9e3779b9 ^ (ch * 7919);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const x = s / 2147483648 - 1;
      const t = i / c.sampleRate;
      lp += (0.55 - Math.min(0.4, t * 0.25)) * (x - lp); // 시간이 갈수록 고역이 먼저 사라짐
      d[i] = lp * Math.exp(-t / 0.75) * (t < 0.012 ? t / 0.012 : 1);
    }
  }
  return ir;
}

export function buildGraph(c: BaseAudioContext): Graph {
  const master = c.createGain();
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -5;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.18;
  master.connect(limiter).connect(c.destination);

  const sfxBus = c.createGain();
  sfxBus.connect(master);
  const ambBus = c.createGain();
  ambBus.gain.value = AMB_BASE;
  ambBus.connect(master);

  const musicIn = c.createGain();
  const musicBus = c.createGain();
  const dry = c.createGain();
  dry.gain.value = 0.78;
  const send = c.createGain();
  send.gain.value = 0.4;
  const conv = c.createConvolver();
  conv.buffer = reverbIR(c);
  const wet = c.createGain();
  wet.gain.value = 0.6;
  musicIn.connect(dry).connect(musicBus);
  musicIn.connect(send).connect(conv).connect(wet).connect(musicBus);
  musicBus.connect(master);
  return { master, limiter, sfxBus, ambBus, musicIn, musicBus };
}
