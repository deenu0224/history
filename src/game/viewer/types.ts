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
  /** 이 NPC 의 하루 길을 점선으로(null 이면 끔) */
  setRouteNpc(npcId: string | null): void;
}

export interface TestApi {
  listHotspots(): ViewerHotspotInfo[];
  tap(id: string): boolean;
  getMinute(): number;
  getCamera(): ViewerCamera | null;
}

declare global {
  interface Window {
    __VIEWER__?: TestApi;
  }
}
