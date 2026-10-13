/**
 * 짧은 디오라마(대조전·교지·회의·인쇄 보관) 뷰어용 순수 로직. Phaser 무관.
 *  - 한눈에 보이는 시작 배율(fit) · 배율 범위 · 확대 시 자유 중심 제한
 *  - 말하는 인물 칸의 정적 인물 장식 숨김
 *  - 장면별 색조(실내는 해 아래 빛이 약하다)
 */
import { MAX_ZOOM_FACTOR, clampCenter, snapZoom, type Pt2, type Size, type ZoomRange } from './camera';
import { viewerTint, type ViewerTint } from './tint';
import type { RGB } from './clock';

/** 디오라마가 아닌 장면(마당 전체 지도) */
export const FULL_MAP_SCENES: readonly string[] = ['obs001'];

/** 실내 디오라마(벽·지붕 아래): 낮 빛이 약하고 등잔·화로의 빛웅덩이가 잘 보인다 */
export const INDOOR_SCENES: readonly string[] = ['sc_daejojeon', 'sc_council', 'sc_print_storage'];

export const isIndoor = (sceneId: string): boolean => INDOOR_SCENES.includes(sceneId);

/**
 * 월드 전체가 뷰 안에 들어오는 가장 큰 배율(정수 기기 px, 2 미만이면 0.5 단위).
 * margin(월드 px)은 가장자리 여백. 7% 이내로 넘치는 건 봐준다(모서리 벽).
 */
export function fitZoom(view: Size, world: Size, margin = 0): number {
  const w = world.w + margin * 2;
  const h = world.h + margin * 2;
  const raw = Math.min(view.w / w, view.h / h);
  if (!(raw > 0)) return 1;
  const lenient = raw * 1.07;
  if (lenient >= 2) return Math.max(2, Math.floor(lenient));
  return Math.max(0.5, Math.floor(raw * 2) / 2);
}

/** base = fit(처음 화면, 엿듣기 기준). 더 줄이지 않고, 최대는 base × 3. */
export function dioramaZoomRange(fit: number, view: Size, world: Size): ZoomRange {
  void view;
  void world;
  return { base: fit, min: fit, max: Math.max(fit, snapZoom(fit * MAX_ZOOM_FACTOR, 1, 64)) };
}

/**
 * 디오라마 중심 제한. 처음 배율(base) 이하에서는 맵을 가운데에 둔다.
 * 확대하면 뷰가 맵보다 큰 축에서도 중심이 맵 안(0..W)을 오갈 수 있다 → 어디든 화면 가운데에 둘 수 있다
 * (세로 모바일에서 아래쪽 인물을 가운데로 데려와 엿듣기 범위에 넣는다).
 */
export function clampDioramaCenter(x: number, y: number, zoom: number, base: number, view: Size, world: Size, slack = 0): Pt2 {
  if (zoom <= base + 1e-6) return clampCenter(x, y, zoom, view, world, slack);
  const hw = view.w / 2 / zoom;
  const hh = view.h / 2 / zoom;
  const ax = (lo: number, hi: number, span: number, v: number) => {
    if (lo > hi) return Math.min(span, Math.max(0, v));
    return Math.min(hi, Math.max(lo, v));
  };
  return {
    x: ax(hw - slack, world.w - hw + slack, world.w, x),
    y: ax(hh - slack, world.h - hh + slack, world.h, y),
  };
}

export interface StaticDef {
  spriteKey: string;
  x: number;
  y: number;
}

/** 서 있거나 앉은 인물 장식인가(말하는 인물 칸에서 숨길 대상) */
export const isFigureKey = (spriteKey: string): boolean => /^(char_|pose_|seat_)/.test(spriteKey);

export const tileKey = (x: number, y: number): string => `${Math.round(x)},${Math.round(y)}`;

/** 말하는 인물이 서는 칸(모든 웨이포인트)에 놓인 정적 인물 장식은 그리지 않는다. */
export function hiddenStatics<T extends StaticDef>(objects: readonly T[], npcTiles: readonly { x: number; y: number }[]): Set<T> {
  const taken = new Set(npcTiles.map((t) => tileKey(t.x, t.y)));
  const out = new Set<T>();
  for (const o of objects) if (isFigureKey(o.spriteKey) && taken.has(tileKey(o.x, o.y))) out.add(o);
  return out;
}

const INDOOR_WARM: RGB = [0.94, 0.88, 0.78];

/** 관측 시각 → 곱셈 색조. 실내는 낮 하늘색을 절반쯤 줄이고 따뜻한 실내 빛을 섞는다(밤에는 어둠이 그대로). */
export function sceneTint(sceneId: string, minute: number): ViewerTint {
  const t = viewerTint(minute);
  if (!isIndoor(sceneId)) return t;
  const k = 0.5 * (1 - t.dark);
  const color: RGB = [t.color[0] + (INDOOR_WARM[0] * t.color[0] - t.color[0]) * k, t.color[1] + (INDOOR_WARM[1] * t.color[1] - t.color[1]) * k, t.color[2] + (INDOOR_WARM[2] * t.color[2] - t.color[2]) * k];
  // 실내라 불빛이 낮에도 은은히 보인다
  return { color, dark: Math.max(t.dark, 0.42) };
}
