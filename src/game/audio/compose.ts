/**
 * 순수 작곡 로직(오디오 API 없음, 시드 결정적). 악절(phrase)을 만들고, 트랙 설계도로 한 바퀴(loop)의 이벤트 목록을 낸다.
 * 구조: 장단(cycle) → 구간(section) → 문답(call & response) 악절 + 반주(거문고·장구·패드·해금 지속음).
 * 여백(rest)을 일부러 길게 둔다. 같은 트랙이라도 pass(회차)마다 시드가 달라져 매번 조금씩 다르게 흐른다.
 */
import { makeRng, hashSeed, type Rng } from './rng';
import { SCALES, degreeToFreq, degreeIndex, type ScaleDef, type ScaleName } from './scales';

export type Inst = 'gayageum' | 'daegeum' | 'geomungo' | 'janggu' | 'haegeum' | 'pad';
/** vib=농현(떨기) · bendDown=꺾는 음 · bendUp=밀어 올림 */
export type Ornament = 'none' | 'vib' | 'bendDown' | 'bendUp';
/** 덩(양쪽) · 쿵(왼쪽 낮은 북) · 덕(오른쪽 채) · lub/dub=심장박동 */
export type Stroke = 'deong' | 'kung' | 'deok' | 'lub' | 'dub';
export type TrackId = 'title' | 'office' | 'observe' | 'tension' | 'restore' | 'ending';
export const TRACK_IDS: readonly TrackId[] = ['title', 'office', 'observe', 'tension', 'restore', 'ending'];

export interface MusicEvent {
  /** 루프 시작으로부터 초 */
  t: number;
  inst: Inst;
  freq: number;
  dur: number;
  vel: number;
  orn: Ornament;
  stroke?: Stroke;
}

export interface PhraseNote {
  tick: number;
  degree: number;
  dur: number;
  vel: number;
  orn: Ornament;
}

export type Contour = 'arch' | 'descend' | 'ascend' | 'wave';

export interface PhraseOpts {
  ticks: number;
  lo: number;
  hi: number;
  start: number;
  /** null 이면 자유 종지 */
  end: number | null;
  contour: Contour;
  /** 음 길이 후보(틱) */
  durs: readonly number[];
  restProb: number;
  ornRate: number;
  vel: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function contourTarget(c: Contour, p: number, o: PhraseOpts): number {
  const amp = (o.hi - o.start) * 0.75;
  switch (c) {
    case 'arch':
      return o.start + amp * Math.sin(Math.PI * p);
    case 'descend':
      return o.start + ((o.end ?? o.lo) - o.start) * p;
    case 'ascend':
      return o.start + (o.hi - o.start) * 0.8 * Math.min(1, p * 1.2);
    case 'wave':
      return o.start + amp * 0.6 * Math.sin(2 * Math.PI * p);
  }
}

/** 한 악절. 같은 rng 상태면 같은 결과. */
export function generatePhrase(rng: Rng, scale: ScaleDef, o: PhraseOpts): PhraseNote[] {
  const notes: PhraseNote[] = [];
  let t = 0;
  let deg = clamp(Math.round(o.start), o.lo, o.hi);
  let repeat = 0;
  while (t < o.ticks) {
    if (notes.length > 0 && rng.chance(o.restProb)) {
      t += rng.pick([1, 2, 2, 3]);
      continue;
    }
    let dur = rng.pick(o.durs);
    dur = Math.max(1, Math.min(dur, o.ticks - t));
    const target = contourTarget(o.contour, t / o.ticks, o);
    const cands: Array<readonly [number, number]> = [];
    for (let d = -3; d <= 3; d++) {
      const c = deg + d;
      if (c < o.lo || c > o.hi) continue;
      const stepPen = Math.abs(d) <= 1 ? 1 : Math.abs(d) === 2 ? 0.55 : 0.18;
      const same = d === 0 ? (repeat >= 1 ? 0.04 : 0.3) : 1;
      cands.push([c, Math.exp(-Math.abs(c - target) * 0.75) * stepPen * same] as const);
    }
    const next = cands.length ? rng.weighted(cands) : deg;
    repeat = next === deg ? repeat + 1 : 0;
    // 경과음(계면조의 시): 라→도 상행에서 가끔
    if (scale.passing[degreeIndex(deg)] !== undefined && next === deg + 1 && dur >= 2 && rng.chance(0.35)) {
      notes.push({ tick: t, degree: deg + 0.5, dur: 1, vel: o.vel * 0.7, orn: 'none' });
      t += 1;
      dur = Math.max(1, dur - 1);
    }
    notes.push({ tick: t, degree: next, dur, vel: o.vel * rng.range(0.82, 1.0), orn: 'none' });
    deg = next;
    t += dur;
  }
  if (notes.length === 0) return notes;
  // 종지
  const last = notes[notes.length - 1];
  if (o.end !== null) {
    last.degree = o.end;
    last.dur = Math.max(last.dur, 3);
    last.vel = o.vel * 0.9;
  }
  // 장식
  notes.forEach((n, i) => {
    const idx = degreeIndex(n.degree);
    const isLast = i === notes.length - 1;
    if (Number.isInteger(n.degree) && scale.bendDegrees.includes(idx) && n.dur >= 2 && rng.chance(0.55)) n.orn = 'bendDown';
    else if (n.dur >= 3 && (isLast ? rng.chance(0.75) : rng.chance(o.ornRate * (scale.vibDegrees.includes(idx) ? 1.6 : 0.8)))) n.orn = 'vib';
    else if (n.dur >= 2 && i > 0 && notes[i - 1].degree < n.degree - 1.5 && rng.chance(o.ornRate * 0.5)) n.orn = 'bendUp';
  });
  return notes;
}

/** idx(0..4) 음 중 target 에 가장 가까운 도수(범위 안) */
export function nearestDegree(idx: number, target: number, lo: number, hi: number): number {
  let best = lo;
  let bd = Infinity;
  for (let d = lo; d <= hi; d++) {
    if (degreeIndex(d) !== idx) continue;
    const dist = Math.abs(d - target);
    if (dist < bd) {
      bd = dist;
      best = d;
    }
  }
  return best;
}

// ───────────────────────── 트랙 설계도 ─────────────────────────

export interface VoiceSpec {
  inst: Inst;
  lo: number;
  hi: number;
  phrase: readonly [number, number];
  durs: readonly number[];
  restProb: number;
  ornRate: number;
  vel: number;
  contour?: Contour;
}

export interface JangguHit {
  tick: number;
  stroke: Stroke;
  vel: number;
}

export interface Section {
  cycles: number;
  /** 문답 악절(voices 를 번갈아: 마지막 목소리가 대답으로 으뜸음에 닿는다) */
  dialogue?: { voices: VoiceSpec[]; gap: readonly [number, number]; startTick: number };
  /** 거문고 등 저음 반주: 장단 안의 틱 위치에서 확률적으로 */
  bass?: { inst: Inst; ticks: readonly number[]; degs: readonly number[]; p: number; vel: number };
  /** 해금·대금 지속음 */
  sustain?: { inst: Inst; lo: number; hi: number; dur: readonly [number, number]; gap: readonly [number, number]; vel: number };
  janggu?: { hits: readonly JangguHit[]; p: number; scale: number };
  pad?: { chords: readonly (readonly number[])[]; chordCycles: number; vel: number };
}

export interface TrackSpec {
  id: TrackId;
  scale: ScaleName;
  tickSec: number;
  cycleTicks: number;
  /** 트랙 믹스 보정(0..1) */
  level: number;
  sections: Section[];
}

const G = (inst: Inst, lo: number, hi: number, o: Partial<VoiceSpec> = {}): VoiceSpec => ({
  inst,
  lo,
  hi,
  phrase: [8, 14],
  durs: [1, 2, 2, 3, 4],
  restProb: 0.12,
  ornRate: 0.35,
  vel: 0.7,
  ...o,
});

// 굿거리 풍(12/8) 장구 — 아주 여리게
const GUTGURI: readonly JangguHit[] = [
  { tick: 0, stroke: 'deong', vel: 0.62 },
  { tick: 3, stroke: 'kung', vel: 0.32 },
  { tick: 5, stroke: 'deok', vel: 0.26 },
  { tick: 6, stroke: 'deok', vel: 0.3 },
  { tick: 9, stroke: 'kung', vel: 0.3 },
  { tick: 10, stroke: 'deok', vel: 0.22 },
];

const HEART: readonly JangguHit[] = [
  { tick: 0, stroke: 'lub', vel: 0.7 },
  { tick: 0.72, stroke: 'dub', vel: 0.42 },
];

export const TRACKS: Record<TrackId, TrackSpec> = {
  // 평조 · 느린 12틱 장단 · 가야금 독주 → 대금 문답 → 해금 → 여운
  title: {
    id: 'title',
    scale: 'pyeongjo',
    tickSec: 0.5,
    cycleTicks: 12,
    level: 1,
    sections: [
      {
        cycles: 4,
        dialogue: { voices: [G('gayageum', 0, 8, { phrase: [10, 16], vel: 0.62, durs: [2, 3, 4, 6] })], gap: [3, 6], startTick: 3 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -3], p: 0.8, vel: 0.5 },
        pad: { chords: [[-5, 0]], chordCycles: 4, vel: 0.14 },
      },
      {
        cycles: 6,
        dialogue: {
          voices: [G('daegeum', 5, 10, { phrase: [10, 16], durs: [3, 4, 6, 8], vel: 0.6, restProb: 0.15 }), G('gayageum', 0, 8, { phrase: [8, 14], vel: 0.6 })],
          gap: [3, 8],
          startTick: 2,
        },
        bass: { inst: 'geomungo', ticks: [0, 6], degs: [-5, -3, -1], p: 0.55, vel: 0.45 },
        pad: { chords: [[-5, 0, 3]], chordCycles: 6, vel: 0.2 },
      },
      {
        cycles: 4,
        dialogue: {
          voices: [G('gayageum', 0, 9, { phrase: [8, 12], vel: 0.65, durs: [1, 2, 3] }), G('daegeum', 5, 10, { phrase: [10, 14], durs: [3, 4, 6, 8], vel: 0.55 })],
          gap: [2, 6],
          startTick: 0,
        },
        sustain: { inst: 'haegeum', lo: 2, hi: 5, dur: [14, 22], gap: [8, 16], vel: 0.26 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2], p: 0.7, vel: 0.45 },
        pad: { chords: [[-3, 2, 4]], chordCycles: 4, vel: 0.2 },
      },
      {
        cycles: 2,
        dialogue: { voices: [G('daegeum', 5, 10, { phrase: [14, 18], durs: [4, 6, 8], vel: 0.55, contour: 'descend' })], gap: [6, 10], startTick: 2 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5], p: 1, vel: 0.5 },
        pad: { chords: [[-5, 0, 3]], chordCycles: 2, vel: 0.16 },
      },
    ],
  },
  // 평조 · 12/8 굿거리 느낌 · 밤의 사무실: 조용한 패드 + 장구 + 가끔 가야금/대금
  office: {
    id: 'office',
    scale: 'pyeongjo',
    tickSec: 0.2,
    cycleTicks: 12,
    level: 0.9,
    sections: [
      {
        cycles: 8,
        dialogue: { voices: [G('gayageum', 2, 9, { phrase: [7, 11], vel: 0.55, durs: [2, 3, 3, 4, 6], restProb: 0.2 })], gap: [14, 40], startTick: 6 },
        janggu: { hits: GUTGURI, p: 0.5, scale: 0.6 },
        pad: { chords: [[-5, 0, 3], [-3, 2, 4]], chordCycles: 4, vel: 0.24 },
      },
      {
        cycles: 12,
        dialogue: {
          voices: [G('gayageum', 2, 9, { phrase: [8, 12], vel: 0.6, durs: [1, 2, 3, 3, 4] }), G('daegeum', 5, 9, { phrase: [10, 16], durs: [3, 4, 6, 9], vel: 0.42, restProb: 0.2 })],
          gap: [8, 26],
          startTick: 3,
        },
        bass: { inst: 'geomungo', ticks: [0, 6], degs: [-5, -3, -1], p: 0.55, vel: 0.4 },
        janggu: { hits: GUTGURI, p: 0.8, scale: 0.75 },
        pad: { chords: [[-5, 0, 3], [-4, 1, 3], [-3, 2, 4], [-5, 0, 3]], chordCycles: 3, vel: 0.24 },
      },
      {
        cycles: 8,
        dialogue: { voices: [G('gayageum', 2, 10, { phrase: [8, 14], vel: 0.62, durs: [1, 2, 2, 3], contour: 'wave' })], gap: [10, 30], startTick: 0 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2], p: 0.5, vel: 0.4 },
        janggu: { hits: GUTGURI, p: 0.7, scale: 0.7 },
        pad: { chords: [[-3, 2, 4], [-5, 0, 3]], chordCycles: 4, vel: 0.24 },
      },
      {
        cycles: 6,
        dialogue: { voices: [G('daegeum', 5, 9, { phrase: [14, 18], durs: [4, 6, 9], vel: 0.4, contour: 'descend' })], gap: [14, 30], startTick: 8 },
        janggu: { hits: GUTGURI, p: 0.35, scale: 0.5 },
        pad: { chords: [[-5, 0, 3]], chordCycles: 6, vel: 0.22 },
      },
    ],
  },
  // 계면조 · 진양조풍 자유로운 느린 호흡 · 대금의 긴 숨 + 가야금 농현
  observe: {
    id: 'observe',
    scale: 'gyemyeonjo',
    tickSec: 0.9,
    cycleTicks: 24,
    level: 1,
    sections: [
      {
        cycles: 1,
        dialogue: { voices: [G('gayageum', 0, 7, { phrase: [8, 12], durs: [3, 4, 6, 8], vel: 0.62, ornRate: 0.6, restProb: 0.2 })], gap: [4, 8], startTick: 4 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5], p: 1, vel: 0.5 },
        pad: { chords: [[-5, -2, 0]], chordCycles: 2, vel: 0.2 },
      },
      {
        cycles: 2,
        dialogue: {
          voices: [G('daegeum', 4, 9, { phrase: [12, 18], durs: [4, 6, 8, 10], vel: 0.6, ornRate: 0.7, restProb: 0.2 }), G('gayageum', 0, 7, { phrase: [8, 12], durs: [2, 3, 4, 6], vel: 0.6, ornRate: 0.6, restProb: 0.2 })],
          gap: [3, 8],
          startTick: 2,
        },
        bass: { inst: 'geomungo', ticks: [0, 12], degs: [-5, -2, -3], p: 0.7, vel: 0.45 },
        janggu: { hits: [{ tick: 0, stroke: 'kung', vel: 0.35 }], p: 0.6, scale: 0.8 },
        pad: { chords: [[-5, -2, 0], [-3, 0, 2]], chordCycles: 1, vel: 0.2 },
      },
      {
        cycles: 1,
        dialogue: { voices: [G('daegeum', 4, 8, { phrase: [14, 20], durs: [6, 8, 10], vel: 0.52, ornRate: 0.8, contour: 'descend' })], gap: [6, 10], startTick: 6 },
        sustain: { inst: 'haegeum', lo: 1, hi: 4, dur: [18, 24], gap: [4, 8], vel: 0.24 },
        bass: { inst: 'geomungo', ticks: [0, 12], degs: [-5, -2], p: 0.8, vel: 0.45 },
        pad: { chords: [[-5, -2, 0]], chordCycles: 1, vel: 0.2 },
      },
    ],
  },
  // 계면조 · 낮은 거문고 + 심장박동 장구 + 해금 지속음
  tension: {
    id: 'tension',
    scale: 'gyemyeonjo',
    tickSec: 0.4,
    cycleTicks: 2,
    level: 0.95,
    sections: [
      {
        cycles: 30,
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2], p: 0.1, vel: 0.5 },
        janggu: { hits: HEART, p: 1, scale: 0.4 },
        pad: { chords: [[-5, -2]], chordCycles: 30, vel: 0.22 },
      },
      {
        cycles: 40,
        sustain: { inst: 'haegeum', lo: 0, hi: 3, dur: [14, 24], gap: [6, 12], vel: 0.32 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2, -1], p: 0.18, vel: 0.5 },
        janggu: { hits: HEART, p: 1, scale: 0.6 },
        pad: { chords: [[-5, -2], [-5, -1]], chordCycles: 20, vel: 0.22 },
      },
      {
        cycles: 30,
        dialogue: { voices: [G('gayageum', 2, 8, { phrase: [5, 9], durs: [1, 2, 3], vel: 0.5, ornRate: 0.6, restProb: 0.3 })], gap: [18, 40], startTick: 10 },
        sustain: { inst: 'haegeum', lo: 0, hi: 3, dur: [14, 24], gap: [4, 10], vel: 0.34 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2, -3], p: 0.22, vel: 0.5 },
        janggu: { hits: HEART, p: 1, scale: 0.72 },
        pad: { chords: [[-5, -2]], chordCycles: 30, vel: 0.24 },
      },
    ],
  },
  // 평조 · 따뜻한 상행 아르페지오 + 대금
  restore: {
    id: 'restore',
    scale: 'pyeongjo',
    tickSec: 0.45,
    cycleTicks: 12,
    level: 1,
    sections: [
      {
        cycles: 3,
        dialogue: { voices: [G('gayageum', 0, 9, { phrase: [10, 14], contour: 'ascend', durs: [2, 2, 3, 4], vel: 0.62, restProb: 0.1 })], gap: [4, 8], startTick: 0 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -3], p: 0.8, vel: 0.45 },
        pad: { chords: [[-5, 0, 2]], chordCycles: 3, vel: 0.22 },
      },
      {
        cycles: 6,
        dialogue: {
          voices: [G('daegeum', 5, 10, { phrase: [10, 16], durs: [3, 4, 6, 8], vel: 0.6, ornRate: 0.5 }), G('gayageum', 0, 9, { phrase: [8, 12], contour: 'ascend', vel: 0.62 })],
          gap: [2, 6],
          startTick: 0,
        },
        bass: { inst: 'geomungo', ticks: [0, 6], degs: [-5, -3, -1], p: 0.6, vel: 0.42 },
        janggu: { hits: [{ tick: 0, stroke: 'deong', vel: 0.4 }], p: 0.6, scale: 0.8 },
        pad: { chords: [[-5, 0, 2], [-3, 2, 4]], chordCycles: 3, vel: 0.22 },
      },
      {
        cycles: 4,
        dialogue: {
          voices: [G('gayageum', 0, 10, { phrase: [8, 12], contour: 'wave', durs: [1, 2, 2, 3], vel: 0.65 }), G('daegeum', 5, 10, { phrase: [10, 14], durs: [4, 6, 8], vel: 0.58 })],
          gap: [2, 5],
          startTick: 0,
        },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5, -2], p: 0.7, vel: 0.42 },
        pad: { chords: [[-3, 2, 4], [-5, 0, 2]], chordCycles: 2, vel: 0.22 },
      },
      {
        cycles: 2,
        dialogue: { voices: [G('daegeum', 5, 10, { phrase: [14, 18], contour: 'descend', durs: [4, 6, 8], vel: 0.52 })], gap: [8, 12], startTick: 2 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5], p: 1, vel: 0.45 },
        pad: { chords: [[-5, 0, 2]], chordCycles: 2, vel: 0.18 },
      },
    ],
  },
  // 평조 · 아주 느리고 성긴 여운
  ending: {
    id: 'ending',
    scale: 'pyeongjo',
    tickSec: 0.8,
    cycleTicks: 12,
    level: 0.95,
    sections: [
      {
        cycles: 2,
        dialogue: { voices: [G('gayageum', 0, 8, { phrase: [8, 12], durs: [3, 4, 6, 8], vel: 0.58, restProb: 0.2 })], gap: [5, 10], startTick: 2 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5], p: 0.9, vel: 0.45 },
        pad: { chords: [[-5, 0, 3]], chordCycles: 2, vel: 0.2 },
      },
      {
        cycles: 3,
        dialogue: { voices: [G('daegeum', 5, 9, { phrase: [10, 14], durs: [4, 6, 8, 10], vel: 0.52, ornRate: 0.7 })], gap: [8, 14], startTick: 2 },
        sustain: { inst: 'haegeum', lo: 2, hi: 5, dur: [14, 22], gap: [8, 14], vel: 0.22 },
        bass: { inst: 'geomungo', ticks: [0, 6], degs: [-5, -3], p: 0.6, vel: 0.42 },
        pad: { chords: [[-3, 2, 4], [-5, 0, 3]], chordCycles: 2, vel: 0.2 },
      },
      {
        cycles: 2,
        dialogue: { voices: [G('gayageum', 0, 8, { phrase: [8, 12], durs: [2, 3, 4, 6], vel: 0.55, contour: 'descend' })], gap: [6, 12], startTick: 2 },
        bass: { inst: 'geomungo', ticks: [0], degs: [-5], p: 0.8, vel: 0.4 },
        pad: { chords: [[-5, 0, 3]], chordCycles: 2, vel: 0.2 },
      },
      {
        cycles: 1,
        pad: { chords: [[-5, 0, 3]], chordCycles: 1, vel: 0.16 },
      },
    ],
  },
};

export const trackLengthSec = (spec: TrackSpec): number => spec.sections.reduce((s, x) => s + x.cycles, 0) * spec.cycleTicks * spec.tickSec;

/** 한 회차(pass)의 이벤트. 같은 (track, pass, seed) 면 항상 같다. */
export function generateLoop(id: TrackId, pass = 0, seed = 0): { events: MusicEvent[]; length: number } {
  const spec = TRACKS[id];
  const scale = SCALES[spec.scale];
  const rng = makeRng((hashSeed(id) ^ Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(pass + 1, 0x85ebca6b)) >>> 0);
  const events: MusicEvent[] = [];
  const ts = spec.tickSec;
  const push = (e: MusicEvent) => events.push({ ...e, t: Math.max(0, e.t) });
  let base = 0; // 구간 시작 틱

  for (const sec of spec.sections) {
    const secTicks = sec.cycles * spec.cycleTicks;

    if (sec.dialogue) {
      const { voices, gap, startTick } = sec.dialogue;
      let t = startTick;
      let i = 0;
      let prevEnd: number[] = [];
      while (t < secTicks - 2) {
        const v = voices[i % voices.length];
        const isAnswer = voices.length === 1 ? i % 2 === 1 : i % voices.length === voices.length - 1;
        const len = v.phrase[0] + rng.int(v.phrase[1] - v.phrase[0] + 1);
        const mid = (v.lo + v.hi) / 2;
        const endIdx = isAnswer ? 0 : rng.pick([1, 3, 3]);
        const end = nearestDegree(endIdx, mid - 1, v.lo, v.hi);
        // 대답은 질문이 끝난 음 근처에서 시작
        const startRef = prevEnd.length ? prevEnd[prevEnd.length - 1] : mid;
        const start = clamp(Math.round(startRef + rng.range(-2, 2)), v.lo, v.hi);
        const contour: Contour = v.contour ?? (isAnswer ? rng.pick(['descend', 'wave'] as const) : rng.pick(['arch', 'ascend', 'wave'] as const));
        const notes = generatePhrase(rng, scale, {
          ticks: len,
          lo: v.lo,
          hi: v.hi,
          start,
          end,
          contour,
          durs: v.durs,
          restProb: v.restProb,
          ornRate: v.ornRate,
          vel: v.vel,
        });
        for (const n of notes) {
          push({ t: (base + t + n.tick) * ts, inst: v.inst, freq: degreeToFreq(scale, n.degree), dur: n.dur * ts, vel: n.vel, orn: n.orn });
        }
        prevEnd = notes.length ? [notes[notes.length - 1].degree] : prevEnd;
        t += len + gap[0] + rng.int(gap[1] - gap[0] + 1);
        i++;
      }
    }

    if (sec.bass) {
      const b = sec.bass;
      for (let c = 0; c < sec.cycles; c++) {
        for (const tk of b.ticks) {
          if (!rng.chance(b.p)) continue;
          const deg = rng.pick(b.degs);
          push({ t: (base + c * spec.cycleTicks + tk) * ts + rng.range(0, 0.04), inst: b.inst, freq: degreeToFreq(scale, deg), dur: 4 * ts, vel: b.vel * rng.range(0.85, 1), orn: 'none' });
        }
      }
    }

    if (sec.sustain) {
      const s = sec.sustain;
      let t = rng.int(s.gap[1] + 1);
      let deg = rng.int(s.hi - s.lo + 1) + s.lo;
      while (t < secTicks - 6) {
        const dur = s.dur[0] + rng.int(s.dur[1] - s.dur[0] + 1);
        deg = clamp(deg + rng.pick([-1, 0, 1, 1, -2, 2]), s.lo, s.hi);
        push({ t: (base + t) * ts, inst: s.inst, freq: degreeToFreq(scale, deg), dur: dur * ts, vel: s.vel, orn: rng.chance(0.5) ? 'vib' : 'none' });
        t += dur + s.gap[0] + rng.int(s.gap[1] - s.gap[0] + 1);
      }
    }

    if (sec.janggu) {
      const j = sec.janggu;
      for (let c = 0; c < sec.cycles; c++) {
        for (const h of j.hits) {
          if (!rng.chance(j.p)) continue;
          push({ t: (base + c * spec.cycleTicks + h.tick) * ts + rng.range(0, 0.012), inst: 'janggu', freq: 0, dur: 0.3, vel: h.vel * j.scale * rng.range(0.85, 1.05), orn: 'none', stroke: h.stroke });
        }
      }
    }

    if (sec.pad) {
      const p = sec.pad;
      const chordTicks = p.chordCycles * spec.cycleTicks;
      let k = 0;
      for (let t = 0; t < secTicks; t += chordTicks) {
        const chord = p.chords[k % p.chords.length];
        for (const d of chord) {
          push({ t: (base + t) * ts, inst: 'pad', freq: degreeToFreq(scale, d), dur: chordTicks * ts + 1.5, vel: p.vel, orn: 'none' });
        }
        k++;
      }
    }

    base += secTicks;
  }
  events.sort((a, b) => a.t - b.t);
  return { events, length: base * ts };
}
