/** 뷰어 내부 계약(React ↔ Phaser). */
export interface AnchorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** React 가 만들고 Phaser 씬이 읽는 가변 호스트 객체(콜백은 언제든 교체될 수 있다). */
export interface ViewerHost {
  timelineId: string;
  /** 빈 곳을 탭했을 때(CSS px, 컨테이너 기준). 튜토리얼 실패 집계(reportFail('empty_tap')) 등에 쓴다. */
  onEmptyTap?: (p: { x: number; y: number }) => void;
  /** 코치마크 앵커(첫 available 핫스팟의 컨테이너 기준 CSS px 사각형). 없으면 null. */
  onAnchor?: (r: AnchorRect | null) => void;
  /** 훼손 구간(분). 현재 시각이 이 안이면 장면이 깨진다 */
  degraded?: { from: number; to: number }[];
  /** 훼손 여부가 바뀔 때 */
  onDegradedChange?: (on: boolean) => void;
  /** 대사가 처음 들렸을 때(관측당 줄마다 한 번) */
  onHear?: (lineId: string, npcId: string) => void;
  /** 핫스팟을 탭했을 때(스토어 호출과 별개로 알림) */
  onTapHotspot?: (hotspotId: string) => void;
  /** 씬 준비 완료 */
  onReady?: () => void;
}

export interface ViewerCamera {
  /** 화면 중심의 월드 px(텍셀) */
  x: number;
  y: number;
  /** 기기 px / 텍셀 */
  zoom: number;
  /** CSS px / 텍셀 */
  zoomCss: number;
  minZoom: number;
  maxZoom: number;
  baseZoom: number;
  /** 컨테이너 CSS px */
  width: number;
  height: number;
  dpr: number;
}

export interface ViewerHotspotInfo {
  id: string;
  /** 페이지(client) 좌표 CSS px — Playwright 가 그대로 클릭할 수 있다 */
  x: number;
  y: number;
  available: boolean;
}

/** 캡처 시점의 화면 정보 */
export interface ViewerSnapshot {
  minute: number;
  centerTile: { x: number; y: number };
  /** 기준 배율의 몇 배인가(1 = 처음 화면). 대사 엿듣기 minZoom 과 같은 단위 */
  zoom: number;
  /** 절반 이상 화면에 있고 지금 available 인 핫스팟 */
  visibleHotspotIds: string[];
  /** 지금 범위 안이라 들리는 대사 */
  heardLineIds: string[];
  /** 현재 화면의 작은 JPEG(폭 ~240px) data URL. 얻지 못하면 '' */
  thumbDataUrl: string;
}

export interface ViewerHandle {
  /** 핫스팟(id: 'hs_…' 또는 대상 id)으로 카메라를 부드럽게 옮긴다 */
  focusHotspot(id: string): void;
  /** 타일 좌표로 */
  focusTile(x: number, y: number): void;
  /** 스토어 scrubObservation 을 거쳐 시각을 바꾼다(관측 중이 아니면 뷰어 내부 미리보기) */
  setMinute(m: number): void;
  getCamera(): ViewerCamera | null;
  /** 배율(기기 px/텍셀)을 단계로 스냅해 이동. 화면 중심 기준 */
  zoomTo(zoom: number): void;
  /** +1 확대 / -1 축소 한 단계(＋/－ 버튼용) */
  zoomStep(dir: 1 | -1): void;
  /** 체크리스트용: 대상(핫스팟/인물/사물 id)을 부드럽게 화면 가운데로. 인물은 엿들을 수 있는 배율까지 확대한다 */
  focusTarget(hotspotId: string): void;
  /** 지금 화면을 찍는다(동기). 뷰어가 아직 준비 전이면 빈 값 */
  snapshot(): ViewerSnapshot;
  /** 셔터 연출(하얀 번쩍임 + 소리) */
  flashShutter(): void;
  /** 장면 전체가 한눈에 보이게 되돌린다(디오라마: 처음 화면). 시작 화면도 이것이다 */
  fitToScene(): void;
  /** 말하는 인물(없으면 보이는 첫 인물)을 엿들을 수 있는 배율로 화면 가운데에. 인물이 없으면 fitToScene */
  focusSpeaker(): void;
  /** 이 NPC 의 하루 길을 점선으로(null 이면 끔) */
  setRouteNpc(npcId: string | null): void;
  /** 지움(차갑게 감광·탈채색) / 되살림(따뜻한 먹 번짐) 연출. bus 'glitch' 에 kind 가 실려도 같다 */
  playShift(kind: 'erase' | 'restore'): void;
}

export interface TestApi {
  listHotspots(): ViewerHotspotInfo[];
  tap(id: string): boolean;
  getMinute(): number;
  getCamera(): ViewerCamera | null;
  snapshot(): ViewerSnapshot;
  /** 지금까지 들은 대사 id */
  listHeard(): string[];
  /** 기준 배율의 z 배로 즉시(애니메이션 없이) */
  setZoom(z: number): void;
  /** 대상(핫스팟/인물/사물 id)을 즉시 화면 가운데로 */
  centerOn(id: string): boolean;
}

declare global {
  interface Window {
    __VIEWER__?: TestApi;
  }
}
