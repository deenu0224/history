/**
 * 컷 렌더러 공개 API (v5: 고정 카메라 정지 컷, Phaser 없음).
 *  - renderScene(sceneId)                  : 장면 전체 정지 이미지(캐시)
 *  - renderCut(spec, outW, outH, dpr)      : 컷 캔버스(캐시, 읽기 전용)
 *  - cutToDataURL(...)                     : <img> 용
 *  - getFigureHitboxes(spec, outW, outH)   : 인물 탭 영역(CSS px, ≥44)
 *  - <CutView> / <CutStrip>                : React 표시·스와이프
 */
export type { CutSpec, CutFigure, CutCamera, CutSceneId, CutOverlay, FigureHighlight, FigureHitbox, CutLayout, Facing } from './types';
export { CUT_SCENE_IDS } from './types';
export { renderScene, listDecor, getBaked, clearBakedCache, cutPerf } from './bake';
export { renderCut, cutToDataURL, getFigureHitboxes, clearCutCache } from './render';
export { cameraAround, clampCamera, computeLayout, cssScale, depthSort, specHash, MIN_TOUCH } from './math';
