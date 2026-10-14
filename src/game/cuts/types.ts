/**
 * 컷(고정 카메라 정지 장면) 공용 타입. v5: 과거 장면은 증인의 기억처럼 3~5컷의 정지 화면으로 보인다.
 * 줌·팬·시간 스크러빙 없음. Phaser 무관.
 */

/** 컷으로 그릴 수 있는 장면: 마당 전체 지도(obs001) + 디오라마 4곳 */
export type CutSceneId = 'obs001' | 'sc_daejojeon' | 'sc_court_decree' | 'sc_council' | 'sc_print_storage';

export const CUT_SCENE_IDS: readonly CutSceneId[] = ['obs001', 'sc_daejojeon', 'sc_court_decree', 'sc_council', 'sc_print_storage'];

/** 타일 단위 원본 사각형(소수 허용: 0.5 타일 단위 권장). 장면 밖으로 나가면 안쪽으로 밀어 넣는다. */
export interface CutCamera {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FigureHighlight = 'none' | 'unknown' | 'tagged';
export type Facing = 'down' | 'left' | 'right' | 'up';

export interface CutFigure {
  /** 컷 안에서 유일한 id (탭 대상) */
  id: string;
  /** 아트 레지스트리 키: char_* / pose_* / seat_* (또는 NPC 별칭 npc_*) */
  spriteKey: string;
  /** 타일 좌표(디오라마 장식과 같은 규칙: 중심 = x*32+16, 발 = y*32+22). 소수 허용 */
  x: number;
  y: number;
  /** 명시 프레임(없으면 facing → 프레임) */
  frame?: number;
  facing?: Facing;
  /** unknown: 정체 미상(윤곽+물음표) / tagged: 표식을 단 인물(금빛 윤곽) */
  highlight?: FigureHighlight;
  /** 흐릿하게(기억이 희미한 인물) */
  dim?: boolean;
}

export type CutOverlay = 'memory' | 'erased' | 'none';

export interface CutSpec {
  id: string;
  sceneId: CutSceneId;
  camera: CutCamera;
  figures?: CutFigure[];
  /** 숨길 정적 장식. 장식 id(`spriteKey@x,y` 또는 obs001 사물 id) 또는 `@x,y`(그 칸 전부) */
  hideStatic?: string[];
  /** 관측 시각(분, 0..1440): 곱셈 색조 + 밤 창 점등. 없으면 색조 없음 */
  time?: number;
  /** 등잔·화로 빛웅덩이 */
  lights?: boolean;
  /** 기본 'memory' */
  overlay?: CutOverlay;
  /** 0..1 가장자리 어둠. 기본: memory 0.5 / erased 0.8 / none 0 */
  vignette?: number;
}

/** CSS px 단위 탭 영역 */
export interface FigureHitbox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 출력 레이아웃(기기 px). 원본 사각형 → 정수 배율 → 가운데 정렬 */
export interface CutLayout {
  /** 원본 px 사각형 (장면 좌표, 32px/타일) */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** 정수 배율 (기기 px per 원본 px) */
  scale: number;
  /** 목적지(기기 px) */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** 출력 전체(기기 px) */
  pw: number;
  ph: number;
}
