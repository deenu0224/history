/**
 * 증인의 눈 = 카메라. 순수 수학(three 없음): 탭 영역 계산과 3D 렌더가 같은 기저를 쓴다.
 * three 의 카메라는 이 기저(right, up, -forward)를 그대로 받는다 → 투영이 정확히 일치.
 */
import { EYE_SEATED, EYE_STANDING, ROOM_EP1, isSeatId, isSeatedPose, seatEye, seatOf } from './room';
import type { PlanPoint, PovFigure, PovHitbox, PovSpec } from './types';

export type V3 = [number, number, number];

export const DEFAULT_FOV = 58;
export const DEFAULT_SIZE = { w: 270, h: 360 } as const;
export const MIN_TOUCH = 44;
export const NEAR = 0.05;
export const FAR = 60;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export interface PovCamera {
  eye: V3;
  target: V3;
  right: V3;
  up: V3;
  forward: V3;
  fovDeg: number;
  aspect: number;
  /** 렌즈 이동: 화면 가운데가 가리키는 세로 tan(앞쪽 덮개 배치용, 파노라마에서만 0 이 아니다) */
  shiftTan?: number;
}

/** 증인별 기본 고개 기울임(도). 아주 작게 — 사람 눈은 수평계가 아니다. */
const WITNESS_ROLL: Record<string, number> = {
  yun_hyoson: -1.6,
  yi_geukdon: 1.2,
  eo_segyeom: -0.8,
  hong_gwidal: 2.0,
};

/** 인물 위치(도면) */
export function figurePos(f: PovFigure): { x: number; y: number } {
  if (f.pos) return f.pos;
  if (f.seat) {
    const s = seatOf(f.seat);
    return { x: s.x, y: s.y };
  }
  return { x: 6, y: 4.5 };
}

/** 인물 방향(도, 0 = 동, 90 = 남) */
export function figureFacing(f: PovFigure, all: readonly PovFigure[] = []): number {
  const p = figurePos(f);
  const fc = f.facing;
  if (typeof fc === 'number') return fc;
  let t: { x: number; y: number } | undefined;
  if (typeof fc === 'string') {
    const other = all.find((o) => o.id === fc);
    t = other ? figurePos(other) : isSeatId(fc) ? seatOf(fc) : undefined;
  } else if (fc) t = fc;
  if (t) return (Math.atan2(t.y - p.y, t.x - p.x) * 180) / Math.PI;
  return f.seat ? seatOf(f.seat).facingDeg : 90;
}

/** 인물 머리 높이(사모 꼭대기 포함, m) — 탭 영역·시선 높이용 */
export const figureHeight = (f: PovFigure): number => (isSeatedPose(f.pose) ? 1.0 : 1.76);
export const figureRadius = (f: PovFigure): number => (isSeatedPose(f.pose) ? 0.42 : 0.3);

/** lookAt 해석 → 세계 좌표 */
export function resolveLookAt(spec: PovSpec): V3 {
  const la = spec.lookAt;
  if (typeof la === 'string') {
    const fig = spec.figures.find((f) => f.id === la);
    if (fig) {
      const p = figurePos(fig);
      return [p.x, isSeatedPose(fig.pose) ? EYE_SEATED - 0.1 : EYE_STANDING - 0.25, p.y];
    }
    if (isSeatId(la)) {
      const s = seatOf(la);
      return [s.x, la === 'B' ? EYE_STANDING - 0.3 : la === 'SP' ? ROOM_EP1.desk.h : EYE_SEATED - 0.1, s.y];
    }
    return [6, 1, 4.5];
  }
  return [la.x, la.h ?? 0.9, la.y];
}

export function resolveEye(spec: PovSpec): V3 {
  if (spec.eye) return [spec.eye.x, spec.eye.h ?? EYE_SEATED, spec.eye.y];
  return seatEye(spec.seatId);
}

export function internalSize(spec: PovSpec): { w: number; h: number } {
  return spec.size ?? DEFAULT_SIZE;
}

export function povCamera(spec: PovSpec): PovCamera {
  const eye = resolveEye(spec);
  const target = resolveLookAt(spec);
  const { w, h } = internalSize(spec);
  const forward = norm(sub(target, eye));
  let right = cross(forward, [0, 1, 0]);
  if (Math.hypot(...right) < 1e-6) right = [1, 0, 0];
  right = norm(right);
  let up = cross(right, forward);
  const rollDeg = spec.roll ?? WITNESS_ROLL[spec.witnessId] ?? 0;
  const r = (rollDeg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const r2: V3 = [right[0] * c + up[0] * s, right[1] * c + up[1] * s, right[2] * c + up[2] * s];
  const u2: V3 = [-right[0] * s + up[0] * c, -right[1] * s + up[1] * c, -right[2] * s + up[2] * c];
  right = r2;
  up = u2;
  return { eye, target, right, up, forward, fovDeg: spec.fov ?? DEFAULT_FOV, aspect: w / h };
}

/** 세계 점 → 정규화 화면(0..1, 위가 0) + 깊이(m). 카메라 뒤면 null */
export function project(cam: PovCamera, p: V3): { u: number; v: number; depth: number } | null {
  const d = sub(p, cam.eye);
  const z = dot(d, cam.forward);
  if (z < NEAR) return null;
  const t = Math.tan((cam.fovDeg * Math.PI) / 360);
  const nx = dot(d, cam.right) / (z * t * cam.aspect);
  const ny = dot(d, cam.up) / (z * t);
  return { u: (nx + 1) / 2, v: (1 - ny) / 2, depth: z };
}

/** 인물의 세계 경계 상자 모서리 8개 */
export function figureCorners(f: PovFigure): V3[] {
  const p = figurePos(f);
  const r = figureRadius(f);
  const h = figureHeight(f);
  const out: V3[] = [];
  for (const dx of [-r, r]) for (const dz of [-r, r]) for (const y of [0, h]) out.push([p.x + dx, y, p.y + dz]);
  return out;
}

/**
 * 인물 탭 영역(CSS px, 컷 영역 w×h 기준). 경계 상자를 투영하고 화면 안으로 자른 뒤 최소 44px 로 키운다.
 * 화면 밖·카메라 뒤 인물은 빠진다. 가까운 인물이 앞(배열 뒤쪽 = 위에 그려짐)이 되도록 먼 것부터 정렬.
 */
export function getFigureHitboxes(spec: PovSpec, w: number, h: number): PovHitbox[] {
  const cam = povCamera(spec);
  const items: { box: PovHitbox; depth: number }[] = [];
  for (const f of spec.figures) {
    const pts = figureCorners(f)
      .map((c) => project(cam, c))
      .filter((q): q is NonNullable<typeof q> => q !== null);
    if (pts.length === 0) continue;
    let x0 = Math.min(...pts.map((q) => q.u)) * w;
    let x1 = Math.max(...pts.map((q) => q.u)) * w;
    let y0 = Math.min(...pts.map((q) => q.v)) * h;
    let y1 = Math.max(...pts.map((q) => q.v)) * h;
    if (x1 < 0 || x0 > w || y1 < 0 || y0 > h) continue;
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(w, x1);
    y1 = Math.min(h, y1);
    const grow = (a: number, b: number, lim: number): [number, number] => {
      if (b - a >= MIN_TOUCH) return [a, b];
      const c = (a + b) / 2;
      let s = Math.max(0, c - MIN_TOUCH / 2);
      s = Math.min(s, Math.max(0, lim - MIN_TOUCH));
      return [s, s + Math.min(MIN_TOUCH, lim)];
    };
    [x0, x1] = grow(x0, x1, w);
    [y0, y1] = grow(y0, y1, h);
    const depth = Math.min(...pts.map((q) => q.depth));
    items.push({ box: { id: f.id, x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }, depth });
  }
  return items.sort((a, b) => b.depth - a.depth).map((i) => i.box);
}

// ── 해(시각 → 방향) ───────────────────────────────────────────

export const parseTime = (t: string | number): number => {
  if (typeof t === 'number') return t;
  const [hh, mm] = t.split(':').map(Number);
  return hh * 60 + (mm || 0);
};

export interface Sun {
  /** 해 쪽을 가리키는 단위 벡터(세계) */
  toSun: V3;
  /** 연출된 고도(도). 실제 고도를 눌러 문 안으로 빛줄기가 들어오게 한다(재구성 연출) */
  elevDeg: number;
  realElevDeg: number;
  azimuthDeg: number;
  /** 0..1 빛의 따뜻함(낮을수록 따뜻) */
  warmth: number;
}

/**
 * 한양(북위 37.5°) 음력 7월 ≈ 양력 8월 초, 적위 약 +17°. 지방태양시 기준.
 * 실제 오후 2시 고도(≈60°)라면 깊은 처마 때문에 빛이 마루에 닿지 않는다 → 고도를 눌러(연출) 빛줄기를 만든다.
 * 이 압축은 역사 주장이 아니라 화면 연출이다(ART_DIRECTION_V5 §4).
 */
export function sunAt(time: string | number): Sun {
  const min = parseTime(time);
  const lat = (37.5 * Math.PI) / 180;
  const dec = (17 * Math.PI) / 180;
  const H = (((min / 60 - 12) * 15) * Math.PI) / 180;
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  const el = Math.asin(sinEl);
  // 방위각(북 = 0, 시계 방향)
  const cosAz = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (H > 0) az = 2 * Math.PI - az;
  const realElevDeg = (el * 180) / Math.PI;
  const elevDeg = Math.max(8, Math.min(realElevDeg, 20 + (realElevDeg - 20) * 0.32));
  const e = (elevDeg * Math.PI) / 180;
  // 세계: 북 = -z, 동 = +x
  const toSun = norm([Math.sin(az) * Math.cos(e), Math.sin(e), -Math.cos(az) * Math.cos(e)]);
  return { toSun, elevDeg, realElevDeg, azimuthDeg: (az * 180) / Math.PI, warmth: Math.max(0, Math.min(1, 1 - (elevDeg - 10) / 30)) };
}

/** 안정된 해시(캐시 키·잡음 씨앗) */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const specKey = (spec: PovSpec): string => JSON.stringify(spec);

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 표시 배율: 기기 px 기준 정수 배율로 내부 해상도를 고른다(목표 폭 ≈ target). */
export function povInternalSize(cssW: number, cssH: number, dpr: number, target = 270): { w: number; h: number; scale: number } {
  const devW = Math.round(cssW * dpr);
  const devH = Math.round(cssH * dpr);
  const scale = Math.max(1, Math.round(devW / target));
  return { w: Math.floor(devW / scale), h: Math.floor(devH / scale), scale };
}

export type { PlanPoint };
