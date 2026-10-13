import type { TimeConstraint, Year } from '@/core/types';

/** 연대 추론판·연대표가 쓰는 순수 스케일 수학. 한 해는 [year, year+1) 칸으로 본다. */
export interface Domain {
  min: Year;
  max: Year;
}

export interface Scale {
  domain: Domain;
  width: number;
  /** 해의 시작 위치(px) */
  x(year: number): number;
  /** px → 해(내림) */
  year(px: number): number;
  /** 해 칸 하나의 너비(px) */
  unit: number;
}

export function makeScale(domain: Domain, width: number): Scale {
  const span = Math.max(1, domain.max - domain.min + 1);
  const unit = width / span;
  return {
    domain,
    width,
    unit,
    x: (year) => (year - domain.min) * unit,
    year: (px) => Math.floor(px / unit) + domain.min,
  };
}

/** 값들(미정의 무시)을 감싸는 영역. 여백을 두고 10년 단위로 맞춘다. */
export function computeDomain(values: readonly (number | undefined | null)[], fallback: Domain, minSpan = 20): Domain {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return fallback;
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  if (hi - lo < minSpan) {
    const mid = Math.round((lo + hi) / 2);
    lo = mid - Math.floor(minSpan / 2);
    hi = mid + Math.ceil(minSpan / 2);
  }
  const pad = Math.max(2, Math.round((hi - lo) * 0.12));
  const step = niceStep(hi - lo + 2 * pad, 8);
  return { min: Math.floor((lo - pad) / step) * step, max: Math.ceil((hi + pad) / step) * step };
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
export function niceStep(span: number, targetTicks: number): number {
  const raw = Math.max(1, span) / Math.max(1, targetTicks);
  return STEPS.find((s) => s >= raw) ?? 1000;
}

export function ticks(domain: Domain, target = 6): number[] {
  const step = niceStep(domain.max - domain.min, target);
  const out: number[] = [];
  for (let y = Math.ceil(domain.min / step) * step; y <= domain.max; y += step) out.push(y);
  return out;
}

export interface BarGeom {
  left: number;
  width: number;
  /** 하한이 없어 왼쪽으로 열려 있음 */
  openLeft: boolean;
  openRight: boolean;
}

/** 연대 제약 → 막대. 포함 경계이므로 notAfter 해의 끝까지 칠한다. */
export function constraintBar(t: Pick<TimeConstraint, 'notBefore' | 'notAfter'>, scale: Scale): BarGeom | null {
  if (t.notBefore === undefined && t.notAfter === undefined) return null;
  const { min, max } = scale.domain;
  const a = t.notBefore ?? min;
  const b = t.notAfter ?? max;
  const l = Math.max(min, a);
  const r = Math.min(max, b);
  if (r < l) return { left: scale.x(Math.min(Math.max(a, min), max)), width: 0, openLeft: false, openRight: false };
  const left = scale.x(l);
  return {
    left,
    width: scale.x(r + 1) - left,
    openLeft: t.notBefore === undefined,
    openRight: t.notAfter === undefined,
  };
}

/** [from,to] 범위 막대(포함 경계). */
export function rangeBar(from: Year, to: Year, scale: Scale): { left: number; width: number } {
  const { min, max } = scale.domain;
  const l = Math.max(min, Math.min(from, to));
  const r = Math.min(max, Math.max(from, to));
  const left = scale.x(l);
  return { left, width: Math.max(0, scale.x(r + 1) - left) };
}

/** 가로로 겹치는 항목을 여러 줄(lane)에 배치. 입력 순서를 보존해 lane 번호를 돌려준다. */
export function layoutLanes(items: readonly { x: number; w: number }[], gap = 6): number[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a]!.x - items[b]!.x);
  const laneEnd: number[] = [];
  const out = new Array<number>(items.length).fill(0);
  for (const i of order) {
    const it = items[i]!;
    let lane = laneEnd.findIndex((end) => end + gap <= it.x);
    if (lane < 0) {
      lane = laneEnd.length;
      laneEnd.push(0);
    }
    laneEnd[lane] = it.x + it.w;
    out[i] = lane;
  }
  return out;
}

export const MIN_YEAR = 1;
export const MAX_YEAR = 2999;

export function clampYear(n: number): number {
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, Math.round(n)));
}

/** 직접 입력 문자열 → 연도. 비어 있거나 숫자가 아니면 null. */
export function parseYearInput(s: string): number | null {
  const t = s.trim();
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= MIN_YEAR && n <= MAX_YEAR ? n : null;
}

export const stepYear = (value: number, delta: number) => clampYear(value + delta);
