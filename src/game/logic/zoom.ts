/** 뷰포트(CSS px) → 정수 카메라 배율. 데스크톱 ≥2, 모바일 세로는 가로 ~10-12타일. */
export function chooseZoom(viewW: number, viewH: number, tile = 32): number {
  if (viewW <= 0 || viewH <= 0) return 2;
  const portrait = viewH > viewW;
  if (portrait && viewW < 700) {
    return Math.max(1, Math.floor(viewW / (tile * 10)));
  }
  if (viewH < 520) {
    // 가로 모드 휴대폰
    return Math.max(1, Math.round(Math.min(viewW / (tile * 14), viewH / (tile * 7))));
  }
  return Math.max(2, Math.floor(Math.min(viewW / (tile * 16), viewH / (tile * 9))));
}
