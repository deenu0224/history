/**
 * 그날의 방 기하(순수). DESIGN_V5 §2.3:
 *  - 들림: 귓속말 1.5칸, 말 6칸, 낭독 8칸. 반경 안 = 또렷, 반경 × 1.25 까지 = 흐림, 그 밖 = 안 들림. 사이에 벽이 있으면 안 들림.
 *  - 보임: 시야 부채꼴(반각 50°), 작은 것을 셀 수 있는 거리 5칸, 사람·몸짓 10칸. 가림(사초 더미) 너머의 작은 것은 일부만.
 * 거리·가림은 저장하지 않고 여기서 계산한다(검증기·판정·UI 가 같은 함수를 쓴다).
 */
import type { Hhmm, Pos, Rect, RoomPlan, Seat, Volume } from './types';

export type Clarity = 'clear' | 'garbled' | 'none';

export function allPositions(room: RoomPlan): Pos[] {
  return [...room.seats, ...room.points, ...room.doors];
}

export function posOf(room: RoomPlan, id: string): Pos {
  const p = room.seats.find((s) => s.id === id) ?? room.points.find((s) => s.id === id) ?? room.doors.find((s) => s.id === id);
  if (!p) throw new Error(`room: 알 수 없는 자리 '${id}'`);
  return p;
}

export function hasPos(room: RoomPlan, id: string): boolean {
  return allPositions(room).some((p) => p.id === id);
}

export function seatOf(room: RoomPlan, id: string): Seat | undefined {
  return room.seats.find((s) => s.id === id);
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** 두 선분 교차(끝점 접촉 포함 안 함) */
function segmentsCross(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  const [x1, y1, x2, y2] = a;
  const [x3, y3, x4, y4] = b;
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  const eps = 1e-9;
  return t > eps && t < 1 - eps && u > eps && u < 1 - eps;
}

/** 선분 p→q 가 사각형 내부를 지나는가(Liang–Barsky) */
export function segmentHitsRect(p: { x: number; y: number }, q: { x: number; y: number }, r: Rect): boolean {
  const [x0, y0, x1, y1] = r;
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const clip = (pp: number, qq: number) => {
    if (Math.abs(pp) < 1e-12) return qq >= 0;
    const t = qq / pp;
    if (pp < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (!clip(-dx, p.x - x0) || !clip(dx, x1 - p.x) || !clip(-dy, p.y - y0) || !clip(dy, y1 - p.y)) return false;
  return t1 - t0 > 1e-9;
}

export function wallBetween(room: RoomPlan, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return room.walls.some((w) => segmentsCross([a.x, a.y, b.x, b.y], w));
}

export interface Hearing {
  /** 가장 가까운 소리 자리까지 거리 */
  distance: number;
  originId: string;
  radius: number;
  clarity: Clarity;
}

/** 듣는 사람 자리에서 그 말이 어떻게 들리는가(소리 자리가 여럿이면 가장 잘 들리는 쪽) */
export function hearing(room: RoomPlan, listener: { x: number; y: number }, origins: string[], volume: Volume): Hearing {
  const radius = room.hearingRadius[volume];
  let best: Hearing | null = null;
  for (const id of origins) {
    const o = posOf(room, id);
    const d = dist(listener, o);
    const blocked = wallBetween(room, listener, o);
    const clarity: Clarity = blocked ? 'none' : d <= radius + 1e-9 ? 'clear' : d <= radius * room.garbleFactor + 1e-9 ? 'garbled' : 'none';
    const h = { distance: round2(d), originId: id, radius, clarity };
    const rank = (c: Clarity) => (c === 'clear' ? 0 : c === 'garbled' ? 1 : 2);
    if (!best || rank(h.clarity) < rank(best.clarity) || (h.clarity === best.clarity && h.distance < best.distance)) best = h;
  }
  if (!best) throw new Error('room: 소리 자리가 없다');
  return best;
}

/** 각 차(0~180) */
export function angleDiff(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return Math.abs(d);
}

export function bearing(from: { x: number; y: number }, to: { x: number; y: number }): number {
  return ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;
}

export interface Sight {
  distance: number;
  inCone: boolean;
  occluded: boolean;
  occluderId?: string;
  /** 사람·몸짓을 볼 수 있다(actionRange 안, 시야 안) */
  visible: boolean;
  /** 작은 것을 셀 수 있다(detailRange 안, 시야 안, 가림 없음) */
  countable: boolean;
}

export function sight(room: RoomPlan, viewer: { x: number; y: number }, dirDeg: number, target: { x: number; y: number }): Sight {
  const d = dist(viewer, target);
  const inCone = d < 1e-6 || angleDiff(bearing(viewer, target), dirDeg) <= room.sight.halfAngleDeg + 1e-9;
  const occ = room.furniture.find((f) => f.occludes && segmentHitsRect(viewer, target, f.rect));
  const visible = inCone && d <= room.sight.actionRange + 1e-9;
  return {
    distance: round2(d),
    inCone,
    occluded: !!occ,
    ...(occ ? { occluderId: occ.id } : {}),
    visible,
    countable: visible && d <= room.sight.detailRange + 1e-9 && !occ,
  };
}

/** 'HH:MM' → 분 */
export function minutes(t: Hhmm): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** 같은 순간으로 보는 간격(±5분) */
export const SAME_MOMENT_MIN = 5;
export const sameMoment = (a: Hhmm, b: Hhmm) => Math.abs(minutes(a) - minutes(b)) <= SAME_MOMENT_MIN;
