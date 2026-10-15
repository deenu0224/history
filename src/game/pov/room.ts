/**
 * 에피소드 1 「그날의 방」 — 실록청 대청 도면(DESIGN_V5 §4.2). provenance: reconstructed.
 * 검증된 도면은 없다. 일반형 대청(우물마루·기둥·분합문·병풍·서안)을 12×9칸에 앉힌 것.
 * 1칸 = 1m 로 놓는다(들림 반경 6칸 = 6m 가 자연스러운 규모). 순수 데이터 + 순수 기하(three 없음).
 */
import type { Ep0SeatId, Ep1SeatId, PlanPoint, PovPose, SeatId } from './types';

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
  /** §13: 앉은 자리 좌표는 그대로, 주인만 바뀜(옛 H → W 윤효손, 옛 N 구석 → H 홍귀달) */
  seats: {
    W: { x: 9.0, y: 3.75, facingDeg: 180 },
    Y: { x: 3.5, y: 3.75, facingDeg: 0 },
    O: { x: 6.0, y: 2.0, facingDeg: 90 },
    H: { x: 11.2, y: 1.0, facingDeg: 135 },
    U: { x: 2.6, y: 5.4, facingDeg: 45 },
    A: { x: 9.8, y: 5.4, facingDeg: 135 },
    B: { x: 6.0, y: 8.6, facingDeg: 270 },
    SP: { x: 4.6, y: 3.8, facingDeg: 0 },
    M2: { x: 6.0, y: 5.2, facingDeg: 270 },
    CL: { x: 1.4, y: 5.9, facingDeg: 0 },
  } satisfies Record<Ep1SeatId, Seat>,
  /** 큰 서안(x4.5–7.5, y3.0–4.5) */
  desk: { x0: 4.5, x1: 7.5, y0: 3.0, y1: 4.5, h: 0.36 },
  /** 사초 더미(가림) x6.6–7.2, y3.2–4.2. top = 더미 꼭대기 높이 */
  stack: { x0: 6.6, x1: 7.2, y0: 3.2, y1: 4.2, top: 0.52 },
  /** 병풍(윗자리 표시) */
  screen: { x0: 3.4, x1: 8.6, y: 0.45, h: 1.75, panels: 8 },
} as const;

/**
 * 에피소드 0 「하룻밤」 대전(1444년 2월 20일 친국 자리 — 어느 전각인지 기사에 없다, HISTORICAL_SOURCES §13.4-2).
 * provenance: reconstructed. ROOM_EP1 과 같은 12×9칸 틀(우물마루·기둥·띠살문·연등천장)을 쓰되,
 * 북쪽 가운데에 낮은 단(임금 자리)과 무늬 없는 가리개, 사방 띠살문은 닫혀 한지로 낮빛을 걸러 들인다.
 * 일월오봉도·자모 모양은 그리지 않는다(근거 없음). 자리 배치도 재구성: 동쪽 줄은 단을 향해 비스듬히 앉고
 * 하위지(부교리)는 그 줄 끝(남쪽)이다. 최만리는 줄에서 나와 단 앞 가운데에 엎드린다.
 */
export const ROOM_EP0 = {
  id: 'ep0_hall',
  provenance: 'reconstructed' as const,
  w: 12,
  h: 9,
  wallH: 3.1,
  ridgeH: 4.5,
  plinth: 0.75,
  eave: { out: 1.9, h: 3.25 },
  /** 임금의 단(마루 위 높이 h) + 앞 디딤 한 단 */
  dais: { x0: 4.3, x1: 7.7, y0: 0.35, y1: 2.15, h: 0.42, step: { y1: 2.55, h: 0.2 } },
  /** 단 위 가리개(무늬 없는 비단 판 — 그림 내용을 주장하지 않는다) */
  screen: { x0: 4.75, x1: 7.25, y: 0.55, h: 1.85, panels: 5 },
  seats: {
    K: { x: 6.0, y: 1.3, facingDeg: 90 },
    C: { x: 6.05, y: 3.25, facingDeg: 270 },
    R1: { x: 8.05, y: 3.05, facingDeg: 215 },
    R2: { x: 8.25, y: 4.3, facingDeg: 220 },
    R3: { x: 8.45, y: 5.55, facingDeg: 225 },
    HW: { x: 8.65, y: 6.85, facingDeg: 230 },
    R5: { x: 3.75, y: 3.6, facingDeg: 320 },
    R6: { x: 3.55, y: 4.85, facingDeg: 315 },
  } satisfies Record<Ep0SeatId, Seat>,
} as const;

/**
 * 잘라 낸 종이 조각 여섯 장의 자리(15:00, 서안 위). 다섯 장은 SP 앞 보자기 위에 나란히(긴 변이 동서), 한 장은 따로
 * 사초 더미 바로 서쪽에 놓였다 → W(윤효손) 자리에서는 그 한 장의 시선이 더미 윗면 아래로 지나 가린다(§4.2 SP ← W).
 * Y(이극돈)·O(어세겸) 자리에서는 여섯 장이 모두 보인다. rot 은 도(0 = 긴 변이 남북).
 * 기하 조건: W 에서 보이려면 x ≤ 5.46(더미 서쪽 면 위를 지남), 가리려면 x ≥ 6.36.
 */
export const SLIP_SPOTS: readonly { x: number; y: number; rot: number }[] = [
  { x: 4.84, y: 3.5, rot: 86 },
  { x: 4.87, y: 3.64, rot: 93 },
  { x: 4.83, y: 3.78, rot: 88 },
  { x: 4.88, y: 3.92, rot: 95 },
  { x: 4.85, y: 4.06, rot: 84 },
  { x: 6.47, y: 3.74, rot: -4 },
];

/** 15:00 소품 자리: 보자기(다섯 장 밑), 끈, 「金馹孫」 이름표 꾸러미(재구성: 이름표 형태는 일반형) */
export const PROP_SPOTS = {
  cloth: { x: 4.86, y: 3.78, half: 0.42 },
  cord: { x: 5.2, y: 4.3 },
  nameTag: { x: 5.5, y: 3.34, rot: 6 },
} as const;

export const SLIP_SIZE = { w: 0.09, l: 0.26 } as const;

/** 가리는 물체(도면 데이터에서 계산). 지금은 사초 더미 하나뿐(§2.3 「가림은 사초 더미 하나뿐」). */
export function occluders(): Box3[] {
  const s = ROOM_EP1.stack;
  return [{ min: [s.x0, ROOM_EP1.desk.h, s.y0], max: [s.x1, s.top, s.y1] }];
}

/** 앉은 눈높이(방석 포함, m) / 선 눈높이 */
export const EYE_SEATED = 0.85;
export const EYE_STANDING = 1.5;

export const isSeatId = (s: unknown): s is SeatId => typeof s === 'string' && (s in ROOM_EP1.seats || s in ROOM_EP0.seats);

/** 자리 id → 자리(ep1·ep0 자리 id 는 겹치지 않는다) */
export function seatOf(id: SeatId): Seat {
  return id in ROOM_EP1.seats ? ROOM_EP1.seats[id as Ep1SeatId] : ROOM_EP0.seats[id as Ep0SeatId];
}

/**
 * 아뢰는(간언) 포즈를 쓸 수 있는 사람(§13-4, kja_10407011_001 「實錄廳堂上李克墩、柳洵、尹孝孫、安琛啓」).
 * 유순·안침은 「?」 두 관원(누가 U/A 인지 정하지 않는다) → personId 'unknown_ua'. 홍귀달·어세겸은 아뢰지 않는다.
 */
export const ADDRESS_ALLOWED: ReadonlySet<string> = new Set(['yi_geukdon', 'yun_hyoson', 'unknown_ua']);

/** 화면에 그리지 않는 사람: 김일손은 그 방에 없다(§13-18, kja_10407012_002) */
export const NEVER_DRAWN: ReadonlySet<string> = new Set(['kim_ilson']);

/** 스펙 내용 규칙 검사(콘텐츠 검증용, 렌더는 막지 않는다). 위반 문장 목록 */
export function validatePovSpec(spec: { figures: readonly { id: string; personId?: string; pose: PovPose }[] }): string[] {
  const errs: string[] = [];
  for (const f of spec.figures) {
    if (f.pose === 'seated-address' && !(f.personId && ADDRESS_ALLOWED.has(f.personId)))
      errs.push(`${f.id}: 아뢰는 포즈는 실록청 당상(이극돈·윤효손·「?」 둘)만 — ${f.personId ?? '(이름 없음)'}`);
    if (f.personId && NEVER_DRAWN.has(f.personId)) errs.push(`${f.id}: ${f.personId} 는 그날 그 방에 없다`);
  }
  return errs;
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
