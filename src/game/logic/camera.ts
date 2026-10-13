/**
 * 관측 뷰어 카메라 수학(순수, Phaser 무관).
 *  - 좌표계: 월드 px(텍셀). 카메라 = 화면 중심의 월드 좌표 + zoom(기기 px / 텍셀).
 *  - 화면 좌표는 뷰 왼쪽 위 기준 기기 px.
 *  - zoom 은 제스처 중엔 연속, 놓으면 정수 기기 픽셀로 스냅(도트 선명).
 */
export interface Cam {
  x: number;
  y: number;
  zoom: number;
}
export interface Size {
  w: number;
  h: number;
}
export interface Pt2 {
  x: number;
  y: number;
}

export const TILE_PX = 32;
/** 기준 배율의 몇 배까지 확대하는가 */
export const MAX_ZOOM_FACTOR = 3;

/**
 * 시작 배율(기기 px/텍셀). 인물이 휴대폰(390px)에서도 읽히도록 세로 모바일은 가로 ~9타일.
 * cssW/cssH: 컨테이너 CSS 크기.
 */
export function chooseBaseZoom(cssW: number, cssH: number, dpr = 1): number {
  if (cssW <= 0 || cssH <= 0) return 2;
  const d = Math.max(1, dpr);
  let css: number;
  if (cssW < 700 || cssH < 520) {
    css = cssH > cssW ? cssW / (TILE_PX * 9) : Math.min(cssW / (TILE_PX * 12), cssH / (TILE_PX * 7));
  } else {
    css = Math.min(4, Math.max(2, Math.round(Math.min(cssW / (TILE_PX * 14), cssH / (TILE_PX * 8.5)))));
  }
  return Math.max(1, Math.round(css * d));
}

/** 월드 전체가 뷰를 덮는 최소 배율(그 아래로는 맵 밖이 보인다). */
export function coverZoom(view: Size, world: Size): number {
  return Math.max(view.w / world.w, view.h / world.h);
}

/** 정수 기기 px 로 스냅(1.5 미만은 0.5 단위). 범위로 고정. */
export function snapZoom(z: number, min: number, max: number): number {
  const s = z >= 1.5 ? Math.round(z) : Math.round(z * 2) / 2;
  return Math.min(max, Math.max(min, s));
}

export interface ZoomRange {
  base: number;
  min: number;
  max: number;
}

export function zoomRange(base: number, view: Size, world: Size): ZoomRange {
  const cover = coverZoom(view, world);
  const max = Math.max(base, snapZoom(base * MAX_ZOOM_FACTOR, 1, 64));
  const min = Math.min(base, Math.max(cover, snapZoom(base * 0.5, 0.5, base)));
  return { base, min, max };
}

/** 확대 단계: 최소, 기준, 기준×2, 최대(중복 제거, 정렬). */
export function zoomLevels(r: ZoomRange): number[] {
  const set = new Set([r.min, r.base, snapZoom(r.base * 2, r.min, r.max), r.max]);
  return [...set].sort((a, b) => a - b);
}

/** 두 번 탭: 다음 단계로 확대, 최대면 기준으로 되돌린다. */
export function nextZoomLevel(zoom: number, r: ZoomRange): number {
  const lv = zoomLevels(r);
  const next = lv.find((l) => l > zoom + 0.01);
  return next ?? r.base;
}

export const screenToWorld = (c: Cam, v: Size, sx: number, sy: number): Pt2 => ({
  x: c.x + (sx - v.w / 2) / c.zoom,
  y: c.y + (sy - v.h / 2) / c.zoom,
});

export const worldToScreen = (c: Cam, v: Size, wx: number, wy: number): Pt2 => ({
  x: (wx - c.x) * c.zoom + v.w / 2,
  y: (wy - c.y) * c.zoom + v.h / 2,
});

/**
 * 중심 제한: 보이는 영역이 맵 밖으로 slack(월드 px) 이상 나가지 않게. 영역이 맵보다 크면 맵 가운데.
 */
export function clampCenter(x: number, y: number, zoom: number, view: Size, world: Size, slack = 0): Pt2 {
  const hw = view.w / 2 / zoom;
  const hh = view.h / 2 / zoom;
  const ax = (min: number, max: number, v: number) => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, v)));
  return {
    x: ax(hw - slack, world.w - hw + slack, x),
    y: ax(hh - slack, world.h - hh + slack, y),
  };
}

/** 화면의 한 점(sx,sy) 아래 월드 점이 그대로이도록 배율을 바꾼다. */
export function zoomAt(c: Cam, newZoom: number, v: Size, sx: number, sy: number): Cam {
  const p = screenToWorld(c, v, sx, sy);
  return {
    zoom: newZoom,
    x: p.x - (sx - v.w / 2) / newZoom,
    y: p.y - (sy - v.h / 2) / newZoom,
  };
}

/** 휠 델타 → 배율 비율. deltaMode 1(줄)은 16배. */
export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const d = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 100 : deltaY;
  return Math.exp(-Math.max(-300, Math.min(300, d)) * 0.0016);
}

/** 관성: 속도(px/s)에 지수 감쇠. */
export function decayVelocity(v: Pt2, dt: number, rate = 5): Pt2 {
  const k = Math.exp(-rate * dt);
  const out = { x: v.x * k, y: v.y * k };
  return Math.hypot(out.x, out.y) < 6 ? { x: 0, y: 0 } : out;
}

/** 지수 보간 비율(프레임 독립) */
export const smoothK = (dt: number, rate: number): number => 1 - Math.exp(-rate * dt);

/** 초기 프레이밍: 타일 중심을 월드 px 로, 기준 배율로. */
export function initialCam(tile: Pt2, zoom: number, view: Size, world: Size): Cam {
  const c = clampCenter(tile.x * TILE_PX + TILE_PX / 2, tile.y * TILE_PX + TILE_PX / 2, zoom, view, world, TILE_PX);
  return { ...c, zoom };
}
