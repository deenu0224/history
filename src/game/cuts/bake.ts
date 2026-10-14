/**
 * 장면 굽기(Phaser 무관). ObservationScene 의 bakeTiles/createStatics/createDioramaObjects/createObjects 중
 * 정지 컷에 필요한 순수 부분을 이식했다: 같은 autotile(바닥+벽) → 타일 캔버스, 사물은 깊이 정렬용 DrawItem 목록.
 *  - 타일 레이어(base)는 한 번만 굽고, 사물·인물은 컷마다 base 의 잘라낸 조각 위에 깊이순으로 얹는다.
 *  - 깊이 규칙은 장면과 같다: 바닥 깔개 -500+y / 인물 발 y / 사물 접지 y / 소나무 baseY-6 / 우물 baseY-2.
 */
import { ANIMS, OBJ_KEYS, SCENE_KEYS, SPRITES, TILES } from '@/game/art/registry';
import { renderSpriteToCanvas, type PixelSprite } from '@/game/art/pixel';
import { autotile } from '@/game/logic/autotile';
import { resolveObjectSprite } from '@/game/keys';
import { isIndoor } from '@/game/logic/diorama';
import { DIORAMAS } from '@/game/scenes/maps';
import { MAPS } from '@/data/world/maps';
import { worldObjects } from '@/data/world/worldObjects';
import type { MapData } from '@/game/logic/types';
import { FIGURE_FEET_DY, OBJECT_FEET_DY, TILE, depthSort, type DepthItem } from './math';
import type { CutSceneId } from './types';

export const cutPerf = {
  /** 장면별 마지막 굽기(ms) */
  bake: {} as Record<string, number>,
  /** 마지막 컷 그리기(ms) / 누적 */
  lastRender: 0,
  renders: 0,
  cacheHits: 0,
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ───────────────────────── 스프라이트 캔버스 캐시 ─────────────────────────
const spriteCanvases = new Map<string, HTMLCanvasElement>();
export function spriteCanvas(key: string, sprite: PixelSprite, frame: number): HTMLCanvasElement {
  const id = `${key}#${frame}`;
  let c = spriteCanvases.get(id);
  if (!c) {
    c = renderSpriteToCanvas(sprite, frame, 1);
    spriteCanvases.set(id, c);
  }
  return c;
}

export function lookupSprite(key: string): PixelSprite | undefined {
  return SPRITES[key] ?? TILES[key];
}

// ───────────────────────── 장면 정의 ─────────────────────────
export interface DrawItem extends DepthItem {
  /** 장식 id: `spriteKey@x,y` 또는 obs001 사물 id */
  id: string;
  /** 칸 id `@x,y` — hideStatic 으로 그 칸 전부 숨길 때 */
  tile: string;
  canvas: HTMLCanvasElement;
  /** 왼쪽 위 (장면 px) */
  x: number;
  y: number;
  spriteKey: string;
}

export interface LightSpot {
  /** 장식 id (숨기면 빛도 끈다) */
  itemId: string;
  tile: string;
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface Baked {
  sceneId: CutSceneId;
  /** 장면 크기(타일 / px) */
  tw: number;
  th: number;
  pw: number;
  ph: number;
  /** 바닥+벽 타일 레이어 */
  base: HTMLCanvasElement;
  items: DrawItem[];
  lights: LightSpot[];
  windows: { x: number; y: number }[];
  indoor: boolean;
  /** 레터박스 바탕 */
  ambient: string;
}

/** 등잔·화로 빛웅덩이(ObservationScene.LIGHTS 와 같은 값) */
const LIGHT_DEFS: Record<string, { radius: number; alpha: number; dy: number }> = {
  [OBJ_KEYS.lamp]: { radius: 92, alpha: 0.85, dy: -16 },
  [OBJ_KEYS.brazier]: { radius: 80, alpha: 0.7, dy: -10 },
  [OBJ_KEYS.floorLamp]: { radius: 96, alpha: 0.8, dy: -26 },
};

const ANIM_DEFAULT: Record<string, string> = {
  [OBJ_KEYS.lamp]: 'anim_lamp_flicker',
  [OBJ_KEYS.brazier]: 'anim_brazier_embers',
};

const animFirstFrame = (animKey: string | undefined): number | undefined => (animKey ? ANIMS.find((a) => a.key === animKey)?.frames[0] : undefined);

/** 레터박스·여백 색(과거 씬 공통의 어두운 실내/마당 색) */
const AMBIENT: Record<CutSceneId, string> = {
  obs001: '#2a2519',
  sc_daejojeon: '#17110e',
  sc_court_decree: '#2a2519',
  sc_council: '#17110e',
  sc_print_storage: '#17110e',
};

export function sceneMap(sceneId: CutSceneId): MapData {
  if (sceneId === 'obs001') return MAPS.obs001;
  return DIORAMAS[sceneId];
}

const FLAT = new Set<string>(SCENE_KEYS.flat);
const tileId = (x: number, y: number) => `@${x},${y}`;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function bakeScene(sceneId: CutSceneId): Baked {
  const t0 = now();
  const map = sceneMap(sceneId);
  const auto = autotile(map);
  const base = makeCanvas(map.w * TILE, map.h * TILE);
  const bctx = base.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;
  const blit = (tk: string, x: number, y: number) => {
    const sp = TILES[tk];
    if (sp) bctx.drawImage(spriteCanvas(tk, sp, 0), x * TILE, y * TILE);
  };
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const c = auto.cells[y]![x]!;
      if (c.ground) blit(c.ground, x, y);
      if (c.wall) blit(c.wall, x, y);
    }
  }

  const items: DrawItem[] = [];
  const lights: LightSpot[] = [];
  let order = 0;
  /** origin: 스프라이트 안에서 (cx, cy) 가 놓일 점 */
  const add = (id: string, tile: string, spriteKey: string, frame: number, cx: number, cy: number, ox: number, oy: number, depth: number) => {
    const sp = lookupSprite(spriteKey);
    if (!sp) return;
    items.push({ id, tile, spriteKey, canvas: spriteCanvas(spriteKey, sp, frame), x: Math.round(cx - ox), y: Math.round(cy - oy), depth, order: order++ });
    const ld = LIGHT_DEFS[spriteKey];
    if (ld) lights.push({ itemId: id, tile, x: cx, y: cy + ld.dy, radius: ld.radius, alpha: ld.alpha });
  };

  for (const p of auto.pines) {
    const baseY = (p.y + 2) * TILE;
    const sp = SPRITES[OBJ_KEYS.pine]!;
    add(`pine@${p.x},${p.y}`, tileId(p.x, p.y), OBJ_KEYS.pine, 0, (p.x + 1) * TILE, baseY, sp.w / 2, sp.h, baseY - 6);
  }
  for (const p of auto.wells) {
    const baseY = (p.y + 1) * TILE;
    const sp = SPRITES[OBJ_KEYS.well]!;
    add(`well@${p.x},${p.y}`, tileId(p.x, p.y), OBJ_KEYS.well, 0, p.x * TILE + TILE / 2, baseY - 1, sp.w / 2, sp.h, baseY - 2);
  }

  if (sceneId === 'obs001') {
    // 마당 사물(상호작용 사물의 그림만; 문·귀환 표식은 제외). 접지/원점은 ObservationScene.createObjects 와 같다.
    for (const def of worldObjects) {
      if (def.sceneId !== 'obs001' || def.kind === 'door' || def.spriteKey === 'door') continue;
      const res = resolveObjectSprite(def.spriteKey, { ambient: 'past' });
      if (res.kind === 'tile') continue;
      const sp = lookupSprite(res.key);
      if (!sp) continue;
      const id = def.id;
      const tile = tileId(def.x, def.y);
      const frame = animFirstFrame(res.anim) ?? res.frame;
      if (res.wallMounted) {
        const cx = def.x * TILE + TILE / 2;
        const cy = def.y * TILE + TILE / 2;
        add(id, tile, res.key, frame, cx, cy, sp.w / 2, sp.h / 2, def.y * TILE + 20);
      } else {
        const baseY = (def.y + 1) * TILE - 2;
        add(id, tile, res.key, frame, def.x * TILE + TILE / 2, baseY, sp.w / 2, sp.h, baseY);
      }
    }
  } else {
    for (const o of DIORAMAS[sceneId].objects) {
      const sp = SPRITES[o.spriteKey];
      if (!sp) continue;
      const flat = o.flat ?? FLAT.has(o.spriteKey);
      const anchor = sp.anchor ?? { x: sp.w / 2, y: sp.h };
      const figure = /^(char_|pose_)/.test(o.spriteKey);
      const cx = o.x * TILE + TILE / 2;
      const groundY = flat ? o.y * TILE + TILE / 2 : o.y * TILE + (figure ? FIGURE_FEET_DY : OBJECT_FEET_DY);
      const animKey = o.anim ?? (!o.flat ? ANIM_DEFAULT[o.spriteKey] : undefined);
      const frame = o.frame ?? animFirstFrame(animKey) ?? 0;
      add(`${o.spriteKey}@${o.x},${o.y}`, tileId(o.x, o.y), o.spriteKey, frame, cx, groundY, anchor.x, anchor.y, flat ? -500 + o.y : groundY);
    }
  }

  const baked: Baked = {
    sceneId,
    tw: map.w,
    th: map.h,
    pw: map.w * TILE,
    ph: map.h * TILE,
    base,
    items,
    lights,
    windows: auto.windows,
    indoor: isIndoor(sceneId),
    ambient: AMBIENT[sceneId],
  };
  cutPerf.bake[sceneId] = now() - t0;
  return baked;
}

const bakedCache = new Map<CutSceneId, Baked>();
export function getBaked(sceneId: CutSceneId): Baked {
  let b = bakedCache.get(sceneId);
  if (!b) {
    b = bakeScene(sceneId);
    bakedCache.set(sceneId, b);
  }
  return b;
}

export function clearBakedCache(): void {
  bakedCache.clear();
}

/** 이 장면의 장식 목록(id/칸/스프라이트): 컷 작성 시 hideStatic 대상 확인용 */
export function listDecor(sceneId: CutSceneId): { id: string; tile: string; spriteKey: string }[] {
  return getBaked(sceneId).items.map(({ id, tile, spriteKey }) => ({ id, tile, spriteKey }));
}

const sceneCache = new Map<CutSceneId, HTMLCanvasElement>();
/**
 * 장면 전체를 한 장으로(타일 + 모든 정적 장식, 인물·조명·색조 없음). 캐시됨 — 읽기 전용으로 쓸 것.
 */
export function renderScene(sceneId: CutSceneId): HTMLCanvasElement {
  let c = sceneCache.get(sceneId);
  if (c) return c;
  const b = getBaked(sceneId);
  c = makeCanvas(b.pw, b.ph);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(b.base, 0, 0);
  for (const it of depthSort(b.items)) ctx.drawImage(it.canvas, it.x, it.y);
  sceneCache.set(sceneId, c);
  return c;
}

/** 숨김 판정: id 정확히 일치 또는 `@x,y` 칸 일치 */
export function isHidden(it: { id: string; tile: string }, hide: ReadonlySet<string>): boolean {
  return hide.has(it.id) || hide.has(it.tile);
}
