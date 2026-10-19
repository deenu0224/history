/**
 * 「그날은 주파수다」 다이얼 프로토타입의 판정 모델(순수 함수, 화면·소리 없음).
 *
 * 관측기 = 수신기. 바깥 고리 = 방향(하위지 자리에서 쏘는 빔), 안쪽 고리 = 그날 안의 시각(분).
 * 모든 판정은 Ep0 데이터(src/data/v5/ep0)에서 계산한다 — 자리 좌표(ROOM_EP0), 컷의 시각·들은 말(CUTS0·LINES0),
 * 눈의 자리(EYES0), 이름 붙이기 근거(TAGS0 T0b), 구멍 문장(HOLED_0220). 화면에 정답을 박지 않는다.
 *
 * provenance: 들리는 말은 LINES0 의 verified 국역 그대로. 시각(10:00 등)·자리·목소리·빔·맥놀이는 reconstructed.
 */
import { ROOM_EP0 } from '@/data/v5/ep0/room';
import { CUTS0, EYES0, GROUPS0, HOLED_0220, HOLED_EONMUN28, LINES0, TAGS0 } from '@/data/v5/ep0/content';
import { SRC0 } from '@/data/v5/ep0/sources';
import type { Line, SourceRef } from '@/core/types';

// ── 조율 상수 ──────────────────────────────────────────────
/** 빔 반각(도). 이 안의 사람 소리만 들린다 */
export const BEAM_HALF = 12;
/** 잠금: 빔 중심과 자리 각도 차이가 이 안 + 시각이 정확히 같은 분 */
export const LOCK_DEG = 2;
/** 맥놀이가 나는 시각 창(분, ±). 창 밖은 정적만 — 멀리서 덥다/춥다를 주지 않는다 */
export const TIME_WIN = 3;
/** 빔 안이지만 시각이 맞지 않을 때 새어 나오는 웅얼거림(시각과 무관한 상수 — 기울기가 없다) */
export const MURMUR_FLOOR = 0.16;
/** 바깥 고리 눈금(도) / 안쪽 고리 눈금(도/분) */
export const OUTER_STEP = 3;
export const DEG_PER_MIN = 6;
/** 안쪽 고리의 범위(분, 하루 기준) */
export const MIN_LO = 9 * 60 + 35;
export const MIN_HI = 10 * 60 + 25;
/** 잠금 상태에서도 남는 정적(고정 전 = 고정력 약화). 길게 눌러 고정하면 0 */
export const LOCK_RESIDUE = 0.1;
export const HOLD_MS = 1500;

export const parseHm = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};
export const fmtHm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const norm360 = (a: number): number => ((a % 360) + 360) % 360;
/** 두 각도의 최단 차(0..180) */
export const angDiff = (a: number, b: number): number => {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
};
/** a→b 로 가는 부호 있는 최단 회전(-180..180) */
export const angDelta = (from: number, to: number): number => {
  const d = norm360(to - from);
  return d > 180 ? d - 360 : d;
};

// ── 데이터에서 만든 「그날의 순간」 ──────────────────────────
const EYE = EYES0[0];
const seat = (id: string) => {
  const s = ROOM_EP0.seats.find((x) => x.id === id);
  if (!s) throw new Error(`seat ${id}`);
  return s;
};
if (!EYE.seatId) throw new Error('eye seat');
export const OBSERVER = seat(EYE.seatId);
/** 관측자 자리에서 본 자리의 방향(화면 좌표: 0=동, 90=남) */
export const seatAngle = (id: string): number => {
  const s = seat(id);
  return norm360((Math.atan2(s.y - OBSERVER.y, s.x - OBSERVER.x) * 180) / Math.PI);
};

export type Voice = 'reader' | 'king';
export interface Moment {
  id: string;
  cutId: string;
  minute: number;
  seatId: string;
  angle: number;
  groupId: string;
  /** 무리의 보이는 이름(이름이 아니다 — 「높은 자리의 사람」 등) */
  groupLabel: string;
  lines: Line[];
  voice: Voice;
}

const lineById = (id: string): Line => {
  const l = LINES0.find((x) => x.id === id);
  if (!l) throw new Error(`line ${id}`);
  return l;
};
const groupOf = (l: Line) => ('groupId' in l.speaker ? l.speaker.groupId : l.speaker.figureId);

export const MOMENTS: Moment[] = EYE.cuts.map((cutId) => {
  const cut = CUTS0.find((c) => c.id === cutId)!;
  const lines = cut.heard.map((h) => lineById(h.lineId));
  const groupId = groupOf(lines[0]);
  const seatId = lines[0].origin[0];
  return {
    id: `m_${cutId}`,
    cutId,
    minute: parseHm(cut.time),
    seatId,
    angle: seatAngle(seatId),
    groupId,
    groupLabel: GROUPS0.find((g) => g.id === groupId)?.label ?? '',
    lines,
    voice: groupId === 'g_king' ? 'king' : 'reader',
  };
});
/** 관측이 열리는 시각 = 이 눈의 첫 컷 */
export const START_MINUTE = MOMENTS[0].minute;
export const START_BEAM = 90;

// ── 신호 ──────────────────────────────────────────────────
export interface Signal {
  /** 빔 안에서 가장 센 순간(없으면 null) */
  moment: Moment | null;
  /** 0..1 — 빔·시각이 모두 맞을수록 1 */
  clarity: number;
  /** 0..1 — 빔 안이면 시각과 무관하게 새는 웅얼거림 */
  murmur: number;
  /** 맥놀이 주파수(Hz). null = 맥놀이 없음(창 밖) / 0 = 맑은 한 음(잠금) */
  beatHz: number | null;
  locked: boolean;
  angErr: number;
  timeErr: number;
}

export function signalAt(beamDeg: number, minute: number): Signal {
  let best: Signal = { moment: null, clarity: 0, murmur: 0, beatHz: null, locked: false, angErr: 180, timeErr: 999 };
  for (const m of MOMENTS) {
    const angErr = angDiff(beamDeg, m.angle);
    if (angErr > BEAM_HALF) continue;
    const timeErr = Math.abs(minute - m.minute);
    const beamF = 1 - angErr / BEAM_HALF;
    const timeF = timeErr <= TIME_WIN ? 1 - timeErr / (TIME_WIN + 1) : 0;
    const locked = angErr <= LOCK_DEG && timeErr === 0;
    const clarity = locked ? 1 : Math.min(0.97, beamF * timeF);
    const murmur = MURMUR_FLOOR * Math.max(0.35, beamF);
    const score = clarity * 10 + murmur;
    const bestScore = best.clarity * 10 + best.murmur;
    if (score > bestScore) {
      const beatHz = clarity > 0 ? (locked ? 0 : 0.7 + 7.3 * (1 - clarity)) : null;
      best = { moment: m, clarity, murmur, beatHz, locked, angErr, timeErr };
    }
  }
  return best;
}

// ── 낱말이 가리키는 다른 순간(추론 표식) ───────────────────────
export interface TimeHint {
  id: string;
  /** 누르는 낱말(고정할 문장 안) */
  phrase: string;
  /** 이 말을 맑게 들은 뒤에야 누를 수 있다 */
  needsMoment: string;
  /** 표식이 놓이는 범위(분) — 「근처」, 정확한 분이 아니다 */
  span: [number, number];
}

/**
 * 「임금이 소(疏)를 보고」: 소 = 방금 들은 상소. 「보고」 → 그 뒤, 상소를 받은 쪽(구멍 문장의 화자 무리)이 말하는 첫 순간 근처.
 * 범위는 그 순간을 비켜 둔 7분 폭(앞 4분·뒤 2분) — 마지막 몇 분은 맥놀이로 찾는다.
 */
export const TIME_HINTS: TimeHint[] = (() => {
  const memorial = MOMENTS.find((m) => m.lines.some((l) => l.id === 'l_e0_memorial'))!;
  const reply = MOMENTS.find((m) => m.minute > memorial.minute && m.groupId !== memorial.groupId)!;
  return [{ id: 'h_after_memorial', phrase: '소(疏)를 보고', needsMoment: memorial.id, span: [reply.minute - 4, reply.minute + 2] }];
})();

// ── 고정할 문장의 「누가」 칸 ─────────────────────────────────
const T0B = TAGS0.find((t) => t.id === 'T0b')!;
/** 이 줄을 맑게 들으면 「누가」 칸이 맥박친다(자기를 군상이라 부르는 말 — 이름 붙이기 T0b 의 근거와 같다) */
export const HOLE_EVIDENCE: string[] = T0B.acceptedEvidence;
export const canFixAt = (s: Signal): boolean => s.locked && !!s.moment && s.moment.lines.some((l) => HOLE_EVIDENCE.includes(l.id));

const whoPart = HOLED_0220.find((p) => 'gap' in p && p.who);
/** 채워질 글자(국역 그대로 「임금이」) */
export const HOLE_FILL = whoPart && 'gap' in whoPart ? whoPart.gap : '';
/** 구멍 뒤 바로 이어지는 남은 조각(「 소(疏)를 보고, 」) */
export const HOME_AFTER = (() => {
  const i = HOLED_0220.indexOf(whoPart!);
  const next = HOLED_0220[i + 1];
  return next && 'text' in next ? next.text : '';
})();
/** 고정 뒤 이어서 보여 줄 국역(HOLED_0220 의 다음 칸 하나) */
export const HOME_TAIL = (() => {
  const i = HOLED_0220.indexOf(whoPart!);
  const next = HOLED_0220[i + 2];
  return next && 'gap' in next ? next.gap : '';
})();
/** 是月 기사 — 고정 뒤 돌아오는 이웃 기록(구멍 없이 이어 붙인 국역) */
export const EONMUN28_TEXT = HOLED_EONMUN28.map((p) => ('gap' in p ? p.gap : p.text)).join('');
export const SOURCES: { home: SourceRef; eonmun: SourceRef } = { home: SRC0.art0220, eonmun: SRC0.eonmun28 };

// ── 글자 표시 ────────────────────────────────────────────
/** 국역 줄에 inline 풀이를 넣는다: 「군상(君上)」 → 「군상(君上, 임금)」. 다른 글자는 바꾸지 않는다 */
export function withInlineGloss(l: Line): string {
  let t = l.text;
  for (const g of l.glosses ?? []) {
    if (!g.inline) continue;
    t = t.replace(new RegExp(`${g.term}\\(([^)]*)\\)`), `${g.term}($1, ${g.gloss})`);
  }
  return t;
}

const hash = (seed: number, i: number): number => {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

/**
 * 맑기에 비례해 글자를 뭉갠다. 한자 괄호는 통째로 뺀다(한글 읽기 없는 한자가 남지 않게).
 * 빠진 글자는 「…」 하나로 모은다. clarity ≥ 1 이면 원문 그대로.
 */
export function garble(text: string, clarity: number, seed = 1): string {
  if (clarity >= 1) return text;
  const bare = text.replace(/\([^)]*\)/g, '').replace(/[‘’"“”]/g, '');
  const keep = Math.max(0, clarity) ** 0.85;
  let out = '';
  let dropped = false;
  [...bare].forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (!dropped && !out.endsWith(' ')) out += ' ';
      return;
    }
    if (hash(seed, i) < keep) {
      out += ch;
      dropped = false;
    } else if (!dropped) {
      out = out.replace(/ $/, '') + '…';
      dropped = true;
    }
  });
  return out.trim() || '…';
}
