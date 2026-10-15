/**
 * 에피소드 0 「하룻밤」 컷 렌더 명세 — 1444년(세종 26) 2월 20일, 집현전 학사들의 상소와 임금의 질책(kda_12602020_001).
 * 눈은 하나: 하위지(河緯地, 부교리) — 줄 끝(남쪽)에 앉은 젊은 관원. 화면 아래에 자기 소매가 보인다.
 *
 * provenance: reconstructed. 전각·자리 배치·시각·빛·자세·옷 색·임금의 모습(익선관 윤곽·붉은 포, 문양 없음)은 모두 재구성 연출이다.
 * verified 인 것은 사람(이름·관직, 실록 의금부 명단)과 「임금이 소를 보고 만리 등에게 이르기를」이라는 장면의 뼈대뿐이다
 * (HISTORICAL_SOURCES §13.1·§13.4). 일곱 사람 전원 출석·자리는 추정이다(§13.4-3).
 * 상소 겉장 머리글 「副提學 崔萬理」: 관직·이름 글자는 원문 그대로(verified), 겉장에 크게 적어 보이게 한 것은 재구성 연출(reconstructed).
 * 상소 본문 글자·언문 자모는 그리지 않는다(§13.4-7). 일월오봉도는 그리지 않는다(근거 없음).
 *
 * 인물 id(다른 모듈과의 계약): fig_king · fig_choi · fig_jeong · fig_kim · fig_row(이름 없이 줄에 앉은 사람 — 탭 대상 아님).
 * fig_row 는 여러 사람이 같은 id 를 쓴다(신석조·송처검·조근): 렌더의 id 패스가 한 덩어리로 합치고, 매니페스트에서 listed:false.
 * 이 파일은 런타임에 불러오지 않는다(컷은 미리 구운 이미지). 굽는 스크립트·dev 페이지·단위 테스트가 쓴다.
 */
import type { PovFigure, PovSpec } from '@/game/pov/types';
import { ROOM_EP0 } from '@/game/pov/room';

export const EP0_CUT_IDS = ['e0-1', 'e0-2', 'e0-3'] as const;
export type Ep0CutId = (typeof EP0_CUT_IDS)[number];
export const EP0_FIGURE_IDS = ['fig_king', 'fig_choi', 'fig_jeong', 'fig_kim', 'fig_row'] as const;
export type Ep0FigureId = (typeof EP0_FIGURE_IDS)[number];
/** 탭할 수 있는 사람(이름 붙이기 대상). fig_row 는 아니다 */
export const EP0_TAPPABLE: readonly Ep0FigureId[] = ['fig_king', 'fig_choi', 'fig_jeong', 'fig_kim'];
/** 컷 안 세부(탭 영역): 상소 겉장 머리글 */
export const EP0_DETAIL_IDS = ['d_scroll_head'] as const;
export type Ep0DetailId = (typeof EP0_DETAIL_IDS)[number];

export type Ep0Figure = PovFigure & { id: Ep0FigureId };

export interface Ep0CutRenderSpec {
  id: Ep0CutId;
  time: string;
  /** 내부 설명(화면에 쓰지 않는다 — UI 는 이름·연도를 알려주지 않는다) */
  note: string;
  /** 반드시 보여야 하고 탭할 수 있는 사람 */
  listed: Ep0FigureId[];
  /** 반드시 보여야 하는 세부(탭 영역) */
  details?: Ep0DetailId[];
  /** 굽는 대상 아님: 지워진 변형 없음(Ep0 은 열린 눈 하나) */
  erasable?: false;
  spec: Omit<PovSpec, 'size' | 'overlay'> & { figures: Ep0Figure[] };
}

const S = ROOM_EP0.seats;
/** 임금이 앉은 높이 = 단 + 방석 */
const KING_ELEV = ROOM_EP0.dais.h + 0.07;
/** 단 앞 가운데(줄이 바라보는 곳) */
const DAIS_FRONT = { x: 6.0, y: 2.4 };

type Opt = Partial<Omit<Ep0Figure, 'id'>>;
const at = (seat: keyof typeof S) => ({ x: S[seat].x, y: S[seat].y });
const king = (o: Opt = {}): Ep0Figure => ({ id: 'fig_king', personId: 'sejong', robe: 'royal', hat: 'ikseon', pos: at('K'), elev: KING_ELEV, facing: 90, pose: 'seated', build: 1.04, beard: 0.7, ...o });
const choi = (o: Opt = {}): Ep0Figure => ({ id: 'fig_choi', personId: 'choe_manri', robe: 'ink', pos: at('C'), facing: { x: S.K.x, y: S.K.y }, pose: 'seated-present', holding: 'memorial', build: 0.97, beard: 1, ...o });
const shin = (o: Opt = {}): Ep0Figure => ({ id: 'fig_row', personId: 'sin_seokjo', robe: 'slate', pos: at('R1'), facing: DAIS_FRONT, pose: 'seated', build: 1.0, beard: 0.9, ...o });
const kim = (o: Opt = {}): Ep0Figure => ({ id: 'fig_kim', personId: 'kim_mun', robe: 'green', pos: at('R2'), facing: DAIS_FRONT, pose: 'seated', build: 1.03, beard: 0.8, ...o });
const jeong = (o: Opt = {}): Ep0Figure => ({ id: 'fig_jeong', personId: 'jeong_changson', robe: 'blue', pos: at('R3'), facing: DAIS_FRONT, pose: 'seated', build: 0.98, beard: 0.6, ...o });
const song = (o: Opt = {}): Ep0Figure => ({ id: 'fig_row', personId: 'song_cheogeom', robe: 'ink', pos: at('R5'), facing: DAIS_FRONT, pose: 'seated', build: 0.96, beard: 0.4, ...o });
const jo = (o: Opt = {}): Ep0Figure => ({ id: 'fig_row', personId: 'jo_geun', robe: 'slate', pos: at('R6'), facing: DAIS_FRONT, pose: 'seated', build: 0.95, beard: 0.3, ...o });

/** 하위지의 눈(줄 끝에 앉은 눈높이)과 소매 */
const EYE = { x: S.HW.x - 0.04, y: S.HW.y - 0.05, h: 0.86 };
const SELF = { robe: 'green', hands: 'rest-both', item: 'none' } as const satisfies PovSpec['self'];
/** 임금 뒤 북쪽 고창 — 단 위 사람의 테 빛(장면 안 광원) */
const NORTH_LATTICE = { x: 6.0, y: 0.1, h: 2.7 };

const base = {
  room: 'ep0',
  witnessId: 'ha_wiji',
  seatId: 'HW',
  eye: EYE,
  time: '10:00',
  self: SELF,
} as const;

export const EP0_CUTS: readonly Ep0CutRenderSpec[] = [
  {
    id: 'e0-1',
    time: '10:00',
    note: '줄지어 앉은 관원들. 맨 앞 늙은 관원이 접은 상소를 받들어 올리고, 그 겉장 머리글이 보인다. 멀리 단 위 임금은 어둡고 작다(뒤에서 비치는 고창 빛).',
    listed: ['fig_king', 'fig_choi', 'fig_jeong', 'fig_kim'],
    details: ['d_scroll_head'],
    spec: {
      ...base,
      lookAt: { x: 6.55, y: 2.6, h: 1.0 },
      fov: 52,
      focus: 'fig_choi',
      figures: [king(), choi(), shin(), kim(), jeong(), song(), jo()],
      rim: { from: NORTH_LATTICE, strength: 1.2, ids: ['fig_king'] },
    },
  },
  {
    id: 'e0-2',
    time: '10:05',
    note: '줄의 머리 너머 단 위의 임금: 익선관 윤곽, 붉은 포, 몸을 조금 앞으로 기울이고 한 손을 내밀어 꾸짖는다. 앞에 늙은 관원이 깊이 엎드렸다.',
    listed: ['fig_king', 'fig_choi'],
    spec: {
      ...base,
      lookAt: { x: 6.1, y: 1.6, h: 1.2 },
      fov: 24,
      focus: 'fig_king',
      figures: [king({ pose: 'seated-gesture' }), choi({ pose: 'seated-bow', holding: 'none' }), shin(), kim(), jeong(), song(), jo()],
      rim: { from: NORTH_LATTICE, strength: 0.9, ids: ['fig_king'] },
    },
  },
  {
    id: 'e0-3',
    time: '10:06',
    note: '임금이 몸을 앞으로 숙여 곧장 말한다 — 그 한마디의 순간.',
    listed: ['fig_king'],
    spec: {
      ...base,
      lookAt: { x: 6.0, y: 1.45, h: 1.38 },
      fov: 13,
      focus: 'fig_king',
      figures: [king({ pose: 'seated-gesture', lean: 18 }), choi({ pose: 'seated-bow', holding: 'none' }), shin(), kim(), jeong(), song(), jo()],
      rim: { from: NORTH_LATTICE, strength: 0.8, ids: ['fig_king'] },
    },
  },
];

/** 그날의 방 도면 뒤에 까는 흐린 배경(사람 없음) */
export const EP0_ROOM_BACKDROP: Omit<PovSpec, 'size' | 'overlay'> = {
  room: 'ep0',
  witnessId: 'room',
  seatId: 'HW',
  eye: { x: 6.0, y: 4.6, h: 2.95 },
  lookAt: { x: 6.0, y: 4.75, h: 0 },
  fov: 112,
  roll: 0,
  time: '10:00',
  figures: [],
};

export const ep0CutById = (id: string): Ep0CutRenderSpec | undefined => EP0_CUTS.find((c) => c.id === id);
