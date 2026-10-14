/**
 * POV 컷(증인의 눈높이 기억 컷) 공용 타입.
 * 저해상도 3D(three, 지연 로딩) → 제한 팔레트 픽셀 후처리. 정지 이미지 한 장(연속 렌더 루프 없음).
 * 좌표: 도면 단위 = 칸(1칸 = 1m 로 가정, reconstructed). 도면 x→동, y→남(화면 아래). 높이 h 는 마루 위 m.
 * 3D 세계 좌표는 (x, h, y) = (planX, height, planY).
 */

/** 도면 위 한 점(+선택 높이, m). */
export interface PlanPoint {
  x: number;
  y: number;
  h?: number;
}

/** 방 도면에 정의된 자리·지점 id(§4.2: H 홍귀달, Y 이극돈, O 어세겸, N 윤효손, B 낭독 자리, SP 봉함 자리) */
export type SeatId = 'H' | 'Y' | 'O' | 'N' | 'B' | 'SP' | 'CL' | 'GJ';

export type PovPose =
  | 'seated' // 책상다리, 손은 무릎 위
  | 'seated-reading' // 앉아서 종이를 든다
  | 'seated-writing' // 앉아서 서안 위로 손을 뻗는다
  | 'seated-address' // 앉아서 몸을 앞으로 숙여 아뢴다
  | 'standing'
  | 'standing-reading' // 서서 펼친 종이를 가슴 앞에
  | 'standing-carrying'; // 서서 꾸러미를 안는다

export type Holding = 'none' | 'paper' | 'scroll' | 'bundle' | 'slips' | 'book';

/** 옷 색은 증거가 아니다(DESIGN_V5 §6회 (4)). 화면 읽기용 구분일 뿐. */
export type RobeId = 'red' | 'red-dark' | 'blue' | 'green' | 'messenger' | 'clerk' | 'young';

export type HatId = 'samo' | 'clerk-cap' | 'none';

export interface PovFigure {
  /** 컷 안에서 유일한 id(탭 대상) */
  id: string;
  /** 숨은 정체(판정은 데이터 쪽. 렌더는 쓰지 않는다) */
  personId?: string;
  pose: PovPose;
  /** 도면 자리 id 또는 직접 위치 중 하나 */
  seat?: SeatId;
  pos?: { x: number; y: number };
  /** 도: 0 = 동, 90 = 남. 또는 바라볼 도면 점/자리 id. 없으면 자리 기본 방향 */
  facing?: number | { x: number; y: number } | SeatId;
  holding?: Holding;
  robe?: RobeId;
  hat?: HatId;
  /** 0..1 수염(나이 든 관원). 기본: samo 인 관원 0.8, 그 밖 0 */
  beard?: number;
}

/** 눈의 주인 자신의 몸(앞쪽 덮개). */
export interface SelfRig {
  robe: RobeId;
  /** rest: 화면 아래 모서리의 소매·손 / hold-slips: 두 손이 종이 조각을 쥠 / write: 붓을 쥔 손 */
  hands: 'rest' | 'hold-slips' | 'write' | 'none';
  /** 손이 닿는 도면 점(hold-slips·write). 없으면 시선 앞 0.5m */
  at?: PlanPoint;
}

export type PovOverlay = 'memory' | 'erased';

/** 서안 위 소품 상태(시각별). */
export interface PovProps {
  /** 잘라 낸 종이 조각: none / spread(서안 위 SP 근처에 여섯 장, 한 장은 사초 더미 그늘) / held(손에) */
  slips?: 'none' | 'spread' | 'held';
  /** 봉한 꾸러미 */
  sealedBundle?: boolean;
  /** 「金馹孫」 이름표 꾸러미(reconstructed: 이름표 형태는 일반형) */
  nameTag?: boolean;
  /** 등잔에 불(기본 false: 7월 오후) */
  lamps?: boolean;
}

export interface PovSpec {
  /** 눈의 주인(personId). 렌더는 자리·덮개만 쓴다 */
  witnessId: string;
  seatId: SeatId;
  /** 시선이 닿는 곳: 도면 점(+높이) 또는 자리 id 또는 컷 안 인물 id */
  lookAt: PlanPoint | string;
  /** 'HH:MM' 또는 0..1440 분. 해 방향·빛 색. 시각은 재구성(reconstructed) */
  time: string | number;
  /** 은근한 초점(피사계 심도). 인물 id */
  focus?: string;
  figures: PovFigure[];
  overlay: PovOverlay;
  /** 눈 위치 덮어쓰기(몸을 숙임 등). 없으면 자리 + 앉은 눈높이 */
  eye?: PlanPoint;
  /** 세로 시야각(도). 기본 58 */
  fov?: number;
  /** 고개 기울임(도, +는 반시계). 기본: 증인별 작은 값 */
  roll?: number;
  self?: SelfRig;
  props?: PovProps;
  /** 내부 해상도(px). 기본 270×360 */
  size?: { w: number; h: number };
  /** 결정적 잡음 씨앗(기본: 스펙 해시) */
  seed?: number;
}

/** CSS px 단위 탭 영역 */
export interface PovHitbox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 렌더 계측(dev) */
export interface PovPerf {
  key: string;
  buildMs: number;
  renderMs: number;
  postMs: number;
  totalMs: number;
  w: number;
  h: number;
}
