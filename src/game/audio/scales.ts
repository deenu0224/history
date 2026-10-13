/**
 * 국악 음계. 5음 음계를 '으뜸음 + 반음 간격'으로 정의한다.
 *  평조(平調): 솔 라 도 레 미 (G A C D E) — 맑고 평온. 제목·복원에 쓴다.
 *  계면조(界面調): 라 도 레 미 솔 (A C D E G) — 어둡고 떨리는 음(라)과 꺾는 음(레). 관측·긴장에 쓴다.
 *   '미 라 시 도 미' 의 시(B)는 라→도로 올라갈 때 지나가는 경과음으로만 쓴다(분수 도수 x.5).
 * 도수(degree): 0 = 으뜸음, 1..4 = 같은 옥타브의 다음 음, 5 = 한 옥타브 위 으뜸음. 음수는 아래쪽.
 */
export type ScaleName = 'pyeongjo' | 'gyemyeonjo';

export interface ScaleDef {
  name: ScaleName;
  label: string;
  /** 으뜸음 MIDI 번호 */
  rootMidi: number;
  /** 으뜸음으로부터의 반음 간격(5개, 오름차순) */
  steps: readonly number[];
  /** 도수 i 와 i+1 사이 경과음의 으뜸음 기준 반음 오프셋 */
  passing: Readonly<Record<number, number>>;
  /** 꺾는 음(아래로 휘어 내려오는 음)의 도수 */
  bendDegrees: readonly number[];
  /** 떠는 음(농현)의 도수 */
  vibDegrees: readonly number[];
}

export const PYEONGJO: ScaleDef = {
  name: 'pyeongjo',
  label: '평조',
  rootMidi: 55, // G3
  steps: [0, 2, 5, 7, 9],
  passing: {},
  bendDegrees: [],
  vibDegrees: [0, 3],
};

export const GYEMYEONJO: ScaleDef = {
  name: 'gyemyeonjo',
  label: '계면조',
  rootMidi: 57, // A3
  steps: [0, 3, 5, 7, 10],
  passing: { 0: 2 },
  bendDegrees: [2],
  vibDegrees: [0],
};

export const SCALES: Record<ScaleName, ScaleDef> = { pyeongjo: PYEONGJO, gyemyeonjo: GYEMYEONJO };

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** 도수(정수 또는 x.5 경과음) → MIDI */
export function degreeToMidi(scale: ScaleDef, degree: number): number {
  const n = scale.steps.length;
  const base = Math.floor(degree);
  const isPass = degree - base >= 0.5;
  const oct = Math.floor(base / n);
  const idx = ((base % n) + n) % n;
  let semis = scale.steps[idx];
  if (isPass) {
    const p = scale.passing[idx];
    if (p !== undefined) semis = p;
    // 경과음이 정의되지 않은 곳은 아래 음을 그대로 쓴다
  }
  return scale.rootMidi + oct * 12 + semis;
}

export const degreeToFreq = (scale: ScaleDef, degree: number): number => midiToFreq(degreeToMidi(scale, degree));

/** 정수 도수의 5음 안에서의 위치(0..4) */
export const degreeIndex = (degree: number): number => {
  const b = Math.floor(degree);
  return ((b % 5) + 5) % 5;
};
