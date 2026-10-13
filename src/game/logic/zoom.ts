/**
 * 뷰포트(CSS px) → 카메라 배율(캔버스 px/텍셀).
 * 캔버스는 기기 해상도(CSS px × dpr)로 그리므로, 목표 배율(CSS px/텍셀)을 dpr 로 곱해 **정수**로 반올림한다
 * → 텍셀이 항상 정수 기기 픽셀이라 도트가 번지거나 들쭉날쭉해지지 않는다.
 *  - 데스크톱: CSS 기준 정수 ≥2 (가로 ~16타일)
 *  - 모바일 세로: 가로 ~9타일 (dpr 2.6 이면 텍셀 4px = 1.5 CSS px)
 *  - 모바일 가로: 가로 ~14타일 / 세로 ~7타일
 */
export function chooseZoom(viewW: number, viewH: number, tile = 32, dpr = 1): number {
  if (viewW <= 0 || viewH <= 0) return 2;
  const portrait = viewH > viewW;
  let css: number;
  if (portrait && viewW < 700) css = viewW / (tile * 9);
  else if (viewH < 520) css = Math.min(viewW / (tile * 14), viewH / (tile * 7));
  else css = Math.max(2, Math.floor(Math.min(viewW / (tile * 16), viewH / (tile * 9))));
  return Math.max(1, Math.round(css * Math.max(1, dpr)));
}
