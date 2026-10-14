/**
 * 에피소드 1 「그날의 방」 — 실록청 대청 도면(DESIGN_V5 §4.2). provenance: reconstructed.
 * 검증된 도면은 없다. 일반형 대청(우물마루·기둥·분합문·병풍·서안)을 12×9칸에 앉힌 것.
 * 1칸 = 1m 로 놓는다(들림 반경 6칸 = 6m 가 자연스러운 규모). 순수 데이터 + 순수 기하(three 없음).
 */
import type { PlanPoint, PovPose, SeatId } from './types';

export interface Seat {
  x: number;
  y: number;
  /** 0 = 동, 90 = 남 */
  facingDeg: number;
}

/** 축 정렬 상자(세계 좌표: x = 도면 x, y = 높이, z = 도면 y) */
export interface Box3 {
  min: [number, number, number];
  max: [number, number, number];
}

export const ROOM_EP1 = {
  id: 'ep1_sillokcheong_hall',
  provenance: 'reconstructed' as const,
  w: 12,
  h: 9,
  /** 대들보 아래 높이(m) */
  wallH: 3.1,
  ridgeH: 4.5,
  /** 남쪽 문(가운데 두 칸, 분합문을 들어 올림) */
  door: { x0: 4, x1: 8, top: 2.55 },
  /** 동쪽 창 */
  window: { y0: 3.3, y1: 4.7, sill: 0.75, top: 2.0 },
  /** 서쪽 곳간 문 */
  storeDoor: { y0: 6.4, y1: 7.6, top: 2.1 },
  /** 기단(마당보다 높은 마루) */
  plinth: 0.75,
  /** 처마가 벽에서 나온 길이와 처마 끝 높이 */
  eave: { out: 1.9, h: 3.25 },
  seats: {
    H: { x: 9.0, y: 3.75, facingDeg: 180 },
    Y: { x: 3.5, y: 3.75, facingDeg: 0 },
    O: { x: 6.0, y: 2.0, facingDeg: 90 },
    N: { x: 11.2, y: 1.0, facingDeg: 135 },
    B: { x: 6.0, y: 8.6, facingDeg: 270 },
    SP: { x: 4.6, y: 3.8, facingDeg: 0 },
    CL: { x: 8.6, y: 6.6, facingDeg: 225 },
    GJ: { x: 8.0, y: 6.5, facingDeg: 315 },
  } satisfies Record<SeatId, Seat>,
  /** 큰 서안(x4.5–7.5, y3.0–4.5) */
  desk: { x0: 4.5, x1: 7.5, y0: 3.0, y1: 4.5, h: 0.36 },
  /** 사초 더미(가림) x6.6–7.2, y3.2–4.2. top = 더미 꼭대기 높이 */
  stack: { x0: 6.6, x1: 7.2, y0: 3.2, y1: 4.2, top: 0.52 },
  /** 병풍(윗자리 표시) */
  screen: { x0: 3.4, x1: 8.6, y: 0.45, h: 1.75, panels: 8 },
} as const;

/** 잘라 낸 종이 조각 여섯 장의 자리(서안 위, 'spread'). 마지막 한 장은 사초 더미 바로 앞 → 홍귀달 자리에서 가림. */
export const SLIP_SPOTS: readonly { x: number; y: number; rot: number }[] = [
  { x: 4.72, y: 3.42, rot: 4 },
  { x: 4.86, y: 3.66, rot: -6 },
  { x: 4.7, y: 3.92, rot: 8 },
  { x: 4.92, y: 4.14, rot: -3 },
  { x: 5.08, y: 3.5, rot: 10 },
  { x: 6.5, y: 3.74, rot: -4 },
];

export const SLIP_SIZE = { w: 0.09, l: 0.26 } as const;

/** 가리는 물체(도면 데이터에서 계산). 지금은 사초 더미 하나뿐(§2.3 「가림은 사초 더미 하나뿐」). */
export function occluders(): Box3[] {
  const s = ROOM_EP1.stack;
  return [{ min: [s.x0, ROOM_EP1.desk.h, s.y0], max: [s.x1, s.top, s.y1] }];
}

/** 앉은 눈높이(방석 포함, m) / 선 눈높이 */
export const EYE_SEATED = 0.85;
export const EYE_STANDING = 1.5;

export const isSeatId = (s: unknown): s is SeatId => typeof s === 'string' && s in ROOM_EP1.seats;

export function seatOf(id: SeatId): Seat {
  return ROOM_EP1.seats[id];
}

export const isSeatedPose = (p: PovPose): boolean => p.startsWith('seated');

/** 세계 좌표 [x, 높이, 도면y] */
export const toWorld = (p: PlanPoint): [number, number, number] => [p.x, p.h ?? 0, p.y];

/**
 * 선분(a→b)이 상자를 지나는가(slab). 끝점 바로 앞(eps)은 무시해 대상 자신과 닿는 것을 가림으로 치지 않는다.
 */
export function segmentHitsBox(a: readonly number[], b: readonly number[], box: Box3, eps = 1e-3): boolean {
  let t0 = eps;
  let t1 = 1 - eps;
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-9) {
      if (a[i] < box.min[i] || a[i] > box.max[i]) return false;
      continue;
    }
    let ta = (box.min[i] - a[i]) / d;
    let tb = (box.max[i] - a[i]) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

/** 눈(세계) → 점(세계) 시선이 가리는 물체에 막히는가 */
export function isOccluded(eye: readonly number[], target: readonly number[], boxes: readonly Box3[] = occluders()): boolean {
  return boxes.some((b) => segmentHitsBox(eye, target, b));
}

/** 자리의 앉은 눈 세계 좌표 */
export function seatEye(id: SeatId): [number, number, number] {
  const s = seatOf(id);
  const r = (s.facingDeg * Math.PI) / 180;
  // 머리는 엉덩이보다 조금 앞
  return [s.x + Math.cos(r) * 0.06, EYE_SEATED, s.y + Math.sin(r) * 0.06];
}

/** 종이 조각 i 의 윗면 가운데(세계) */
export function slipTop(i: number): [number, number, number] {
  const s = SLIP_SPOTS[i];
  return [s.x, ROOM_EP1.desk.h + 0.004, s.y];
}
