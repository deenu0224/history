/** 컷 순수 수학(DOM 없음): 카메라 자르기·정수 배율·탭 영역·깊이 정렬·캐시 키. */
import { CHAR_FRAMES, SPRITES } from '@/game/art/registry';
import type { CutCamera, CutFigure, CutLayout, CutSpec, FigureHitbox, Facing } from './types';

export const TILE = 32;
/** 접지: 인물은 타일 위 +22 에 선다(NpcActor/디오라마와 동일), 일반 사물은 타일 바닥 -4, 바닥 깔개는 타일 중앙 */
export const FIGURE_FEET_DY = 22;
export const OBJECT_FEET_DY = TILE - 4;
export const MIN_TOUCH = 44;

/** 카메라를 장면(타일) 안으로 가둔다. 장면보다 크면 장면 크기로 줄인다. */
export function clampCamera(cam: CutCamera, sceneW: number, sceneH: number): CutCamera {
  const w = Math.min(cam.w, sceneW);
  const h = Math.min(cam.h, sceneH);
  const x = Math.min(Math.max(0, cam.x), sceneW - w);
  const y = Math.min(Math.max(0, cam.y), sceneH - h);
  return { x, y, w, h };
}

/** 타일 카메라 → 원본 px 정수 사각형 */
export function cameraToSource(cam: CutCamera): { sx: number; sy: number; sw: number; sh: number } {
  return {
    sx: Math.round(cam.x * TILE),
    sy: Math.round(cam.y * TILE),
    sw: Math.max(1, Math.round(cam.w * TILE)),
    sh: Math.max(1, Math.round(cam.h * TILE)),
  };
}

/**
 * 출력 레이아웃. 배율은 기기 px 기준 정수(최소 1)라 어떤 dpr 에서도 칸이 번지지 않는다.
 * outW/outH 는 CSS px, 결과는 기기 px.
 */
export function computeLayout(cam: CutCamera, outW: number, outH: number, dpr = 1): CutLayout {
  const { sx, sy, sw, sh } = cameraToSource(cam);
  const pw = Math.max(1, Math.round(outW * dpr));
  const ph = Math.max(1, Math.round(outH * dpr));
  const scale = Math.max(1, Math.floor(Math.min(pw / sw, ph / sh)));
  const dw = sw * scale;
  const dh = sh * scale;
  return { sx, sy, sw, sh, scale, dx: Math.floor((pw - dw) / 2), dy: Math.floor((ph - dh) / 2), dw, dh, pw, ph };
}

/** 한 화소가 CSS px 로 몇 칸인지(= scale / dpr). 인물 가독성 판단용 */
export const cssScale = (layout: CutLayout, dpr = 1): number => layout.scale / dpr;

/**
 * 카메라 도우미: (cx,cy) 타일 좌표를 가운데 두고, 목표 CSS 배율(예: 3.5)로 출력 영역을 꽉 채우는 카메라를 만든다.
 * 장면 크기를 주면 안쪽으로 민다.
 */
export function cameraAround(cx: number, cy: number, cssPxPerSource: number, outW: number, outH: number, scene?: { w: number; h: number }): CutCamera {
  const w = outW / cssPxPerSource / TILE;
  const h = outH / cssPxPerSource / TILE;
  const cam = { x: cx - w / 2, y: cy - h / 2, w, h };
  return scene ? clampCamera(cam, scene.w, scene.h) : cam;
}

/** 인물 프레임: 명시 frame > facing. 캐릭터는 0/5/10/15, 포즈·좌석은 0 정면/1 왼쪽/2 오른쪽 */
export function figureFrame(spriteKey: string, frame: number | undefined, facing: Facing | undefined): number {
  if (frame !== undefined) return frame;
  const f = facing ?? 'down';
  if (spriteKey.startsWith('char_') || spriteKey.startsWith('npc_')) return CHAR_FRAMES[f];
  return f === 'left' ? 1 : f === 'right' ? 2 : 0;
}

/** 인물 발 위치(장면 px). char_/pose_/npc_ 는 타일 +22, 그 밖(seat_ 좌석 등 사물형)은 사물 접지(+28) — 디오라마 규칙과 같다. */
export function figureFeet(f: Pick<CutFigure, 'x' | 'y' | 'spriteKey'>): { x: number; y: number } {
  const dy = /^(char_|pose_|npc_)/.test(f.spriteKey) ? FIGURE_FEET_DY : OBJECT_FEET_DY;
  return { x: f.x * TILE + TILE / 2, y: f.y * TILE + dy };
}

export interface DepthItem {
  /** 깊이: 클수록 앞. 바닥 깔개는 -500+y */
  depth: number;
  /** 같은 깊이면 먼저 만든 것이 뒤 */
  order: number;
}

/** 깊이 오름차순(뒤→앞) 안정 정렬. 제자리 정렬하지 않는다. */
export function depthSort<T extends DepthItem>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.depth - b.depth || a.order - b.order);
}

/**
 * 인물 탭 영역(CSS px). 스프라이트 전체 사각형을 쓰되 최소 44px 로 키우고, 중심은 스프라이트 몸통 중앙.
 * 뒤→앞(깊이순)으로 반환한다: DOM 에서 나중 것이 위에 놓여 앞 인물이 먼저 눌린다.
 * 출력 영역 밖으로 나간 부분은 잘라내되 최소 크기는 유지한다(중심이 영역 밖이면 제외).
 */
export function computeHitboxes(spec: CutSpec, outW: number, outH: number, dpr = 1, sceneSize?: { w: number; h: number }): FigureHitbox[] {
  const figs = spec.figures ?? [];
  if (figs.length === 0) return [];
  const cam = sceneSize ? clampCamera(spec.camera, sceneSize.w, sceneSize.h) : spec.camera;
  const L = computeLayout(cam, outW, outH, dpr);
  const k = L.scale / dpr;
  const offX = L.dx / dpr;
  const offY = L.dy / dpr;
  const out: (FigureHitbox & DepthItem)[] = [];
  figs.forEach((f, i) => {
    const sp = SPRITES[f.spriteKey] ?? SPRITES[aliasNpc(f.spriteKey)];
    const sw = sp?.w ?? 24;
    const sh = sp?.h ?? 36;
    const anchor = sp?.anchor ?? { x: sw / 2, y: sh };
    const feet = figureFeet(f);
    // 스프라이트 사각형(장면 px) → CSS px
    const left = (feet.x - anchor.x - L.sx) * k + offX;
    const top = (feet.y - anchor.y - L.sy) * k + offY;
    const w = sw * k;
    const h = sh * k;
    const cx = left + w / 2;
    const cy = top + h / 2;
    if (cx < 0 || cy < 0 || cx > outW || cy > outH) return;
    const bw = Math.max(MIN_TOUCH, w);
    const bh = Math.max(MIN_TOUCH, h);
    out.push({ id: f.id, x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh, depth: feet.y, order: i });
  });
  return depthSort(out).map(({ id, x, y, w, h }) => ({ id, x, y, w, h }));
}

/** NPC 별칭(npc_official_red 등) → 캐릭터 키. keys.ts 와 같은 표(순수 복사, 의존 최소화) */
const NPC_ALIAS: Record<string, string> = {
  npc_official_red: 'char_official_red',
  npc_official_blue: 'char_official_blue',
  npc_official_green: 'char_official_green',
  npc_historian: 'char_sagwan',
  npc_clerk: 'char_clerk',
  npc_servant: 'char_servant',
};
export const aliasNpc = (key: string): string => NPC_ALIAS[key] ?? key;

// ───────────────────────── 캐시 키 ─────────────────────────
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
}

/** FNV-1a 32bit → 8자리 hex */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** 그려지는 내용만 해시한다(id 는 제외: 같은 그림은 캐시를 공유). 키 순서·undefined 와 무관. */
export function specHash(spec: CutSpec): string {
  const { id: _id, ...rest } = spec;
  void _id;
  return fnv1a(stable(rest));
}

export const cutCacheKey = (spec: CutSpec, outW: number, outH: number, dpr: number): string => `${specHash(spec)}|${Math.round(outW)}x${Math.round(outH)}@${dpr}`;

/** 간단한 LRU(Map 삽입 순서 이용). 캔버스 메모리 상한용 */
export class Lru<V> {
  private m = new Map<string, V>();
  constructor(readonly max: number) {}
  get(k: string): V | undefined {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: V): void {
    this.m.delete(k);
    this.m.set(k, v);
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
  has(k: string): boolean {
    return this.m.has(k);
  }
  get size(): number {
    return this.m.size;
  }
  clear(): void {
    this.m.clear();
  }
}

/** 시드 난수(mulberry32): 낟알·노이즈를 컷마다 재현 가능하게 */
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
