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

/**
 * 방 도면에 정의된 자리·지점 id(DESIGN_V5 §4.2, §13 개정):
 * W 윤효손(앞자리, 옛 H) · Y 이극돈(사초 서안 곁) · O 어세겸(윗자리) · H 홍귀달(구석 책상, 옛 N) ·
 * U·A 「?」 두 관원(유순·안침 — 누가 어느 자리인지는 사료에 없다) · B 문 앞 낭독 · SP 봉함 자리 · M2 서안 앞 · CL 서리
 */
export type SeatId = 'W' | 'Y' | 'O' | 'H' | 'U' | 'A' | 'B' | 'SP' | 'M2' | 'CL';

export type PovPose =
  | 'seated' // 책상다리, 손은 무릎 위
  | 'seated-reading' // 앉아서 종이를 든다
  | 'seated-writing' // 앉아서 서안 위로 손을 뻗는다
  | 'seated-address' // 앉아서 몸을 앞으로 숙여 아뢴다(간언자만: §13-4)
  | 'standing'
  | 'standing-reading' // 서서 펼친 종이를 가슴 앞에
  | 'standing-carrying' // 서서 꾸러미를 안는다
  | 'standing-placing' // 서서 몸을 숙여 서안 모서리에 물건을 내려놓는다
  | 'standing-reach' // 서서 두 손을 앞으로 내밀어 받으려 한다
  | 'seated-folding' // 앉아서 서안 위 종이를 두 손으로 가려 접는다
  | 'kneel' // 무릎 꿇고 앉음(서리)
  | 'kneel-whisper' // 무릎 꿇고 몸을 기울여 손을 입가에(귓속말, 서리만)
  | 'kneel-point'; // 무릎 꿇고 한 손으로 가리킨다(서리)

export type Holding = 'none' | 'paper' | 'paper-folded' | 'scroll' | 'bundle' | 'sealed' | 'slips' | 'book';

/** 옷 색은 증거가 아니다(DESIGN_V5 §6회 (4)). 화면 읽기용 구분일 뿐. */
export type RobeId = 'red' | 'red-dark' | 'blue' | 'green' | 'slate' | 'messenger' | 'clerk' | 'young';

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
  /** 몸 크기 배율(기본 1). 사람마다 조금씩 다르게 — 실루엣 구분용 */
  build?: number;
  /** 몸통 앞 기울기 덮어쓰기(도) */
  lean?: number;
  /** 머리 돌림(도, +는 왼쪽). 귓속말·듣기 */
  headYaw?: number;
}

/** 눈의 주인 자신의 몸(앞쪽 덮개). */
export interface SelfRig {
  robe: RobeId;
  /**
   * rest: 화면 아래 오른쪽 모서리의 소매·손 / rest-left: 왼쪽 모서리 / rest-both: 두 소매가 아래 양쪽 /
   * hold-slips: 두 손이 종이 조각을 쥠 / write: 붓을 쥔 오른손 + 종이를 누르는 왼손 /
   * read: 두 손이 펼친 책 양쪽을 잡음 / seal: 두 손이 보자기 모서리를 접는다
   */
  hands: 'rest' | 'rest-left' | 'rest-both' | 'hold-slips' | 'write' | 'read' | 'seal' | 'none';
  /** 손이 닿는 도면 점(hold-slips·write·read·seal; rest-both 이면 맞잡은 두 소매를 얹는 자리). 없으면 시선 앞 0.5m */
  at?: PlanPoint;
  /**
   * 눈의 주인마다 다른 손의 표지(실루엣 구분용, 증거 아님): brush 붓 · sheet 종이 한 장 · book 책 모서리 · none.
   * write 에서는 붓, read 에서는 펼친 책, write-sheet 는 종이 위 교정.
   */
  item?: 'brush' | 'sheet' | 'book' | 'none';
  /** 덮개가 차지하는 크기 배율(기본 1) */
  scale?: number;
  /**
   * 내 손·소매의 테 빛이 오는 장면 안 광원 자리(기본: 낮에는 남쪽 문, 아침에는 동쪽 창). 그늘 속 손이 휴대폰에서
   * 읽히도록 실루엣 가장자리만 밝힌다(화면 문법 — 소매 색 한 단 밝힘과 같은 예외).
   */
  rimFrom?: PlanPoint;
}

export type PovOverlay = 'memory' | 'erased';

/**
 * 컷 그림체(비교용 시안). 없거나 'current' 이면 지금 출력 그대로(굽기 기본값).
 * pixel = 저해상도 진짜 픽셀아트(작은 팔레트·띠 명암·1px 외곽선) · painted = 고해상도 회화풍 ·
 * hd2d = 회화풍 배경 위 픽셀 인물.
 */
export type PovStyle = 'current' | 'pixel' | 'painted' | 'hd2d';

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
  /** 서안 위 이름표 달린 꾸러미들(이름표는 멀어 안 읽힘, 글자 없음) — 아침에 들어온 꾸러미 */
  bundles?: number;
  /** 2-5: 여섯 장을 보자기 위에 펼쳐 놓고 싸는 중(손 앞 클로즈업) */
  wrapSlips?: boolean;
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
  /** 노출(눈의 적응). 기본 1.08 */
  exposure?: number;
  /** 내부 해상도(px). 기본 270×360 */
  size?: { w: number; h: number };
  /**
   * 넓은 시야(DESIGN_V5 시야 반각 50°)를 사람 비율을 지키며 담는 파니니 계열 투영: 가로 시야각(도).
   * 가로는 파니니(d), 세로는 직선(수평 고정) → 세로선은 곧고, 시선과 나란하지 않은 가로선(서안 가장자리·마루 귀틀)도 곧다.
   * d = 0.5 이면 수평선 근처가 거의 등각(가장자리 사람이 늘어나지 않고 오히려 조금 커진다). d = 0 은 직선 투영과 같다.
   * horizon = 수평선이 놓일 화면 높이(0 위 … 1 아래, 렌즈 이동 — 고개를 숙이지 않으므로 세로선이 기울지 않는다).
   * 세로 시야는 가로에서 정해진다(fov 무시). 탭 영역은 굽기의 id 패스로만 계산한다(getFigureHitboxes 는 직선 투영).
   */
  pano?: { hfov: number; d?: number; horizon?: number };
  /**
   * 남쪽 닫힌 띠살문(양옆 칸) 한지가 걸러 들이는 빛의 세기 배율(기본 1). 장면 안 광원이다 — 문 곁에 앉은 사람의
   * 등·어깨를 비춰 실루엣을 읽히게 할 때(재구성 연출).
   */
  latticeGlow?: number;
  /**
   * 사람 실루엣의 테 빛: 장면 안 광원 자리(문·띠살문·창)를 등진 사람의 가장자리를 밝힌다. ids 없으면 모든 사람.
   * 빛의 출처는 반드시 장면 안 광원이다(ART_DIRECTION_V5 §11).
   */
  rim?: { from: PlanPoint; strength?: number; ids?: string[] };
  /**
   * 장면 안 반사광·작은 광원(예: 창빛을 받은 책상 위 종이가 얼굴로 되비치는 빛). 위치·색·세기·닿는 거리(m).
   * 장면 밖 조명이 아니라 그 자리에 실제로 있는 밝은 면을 대신한다(재구성 연출).
   */
  bounces?: { at: PlanPoint; color?: string; intensity: number; distance?: number }[];
  /** 비네트 세기(0..1). 기본 0.62(기억) */
  vignette?: number;
  /** 결정적 잡음 씨앗(기본: 스펙 해시) */
  seed?: number;
  /** 그림체(기본 'current' = 런타임 renderPovCut). 출시 굽기(scripts/render-cuts.mjs)는 'pixel'(승인 시안 A) — bake.ts bakePixel */
  style?: PovStyle;
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
