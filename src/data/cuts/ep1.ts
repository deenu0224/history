/**
 * 에피소드 1 컷 렌더 명세(DESIGN_V5 §4.3·§4.4·§13) — 컷 id → 증인의 눈(POV) 장면 스펙.
 * provenance: reconstructed(방·자리·시각·자세·옷 색·빛 모두 재구성 연출). 옷 색은 증거가 아니다.
 *
 * - 컷 id·시각·인물 id 는 판정 데이터의 계약(src/data/v5/ids.ts)을 그대로 쓴다: 컷 'e{눈}-{n}', 인물 'fig_*'.
 * - 인물은 그 시각에 그 자리에 있던 사람을 모두 놓는다(§4.3). 화면에 실제로 보이는 사람은 렌더의 id 패스가 계산해
 *   매니페스트(public/cuts/ep1/manifest.json)의 탭 영역이 된다 — 가림·화면 밖이 그대로 반영된다.
 * - `listed` = DESIGN 표가 그 컷에 적은 사람(반드시 보여야 함). `absent` = 그 자리에 있지만 시야 밖이어야 하는 사람.
 * - 아뢰는 포즈는 실록청 당상 넷(이극돈·윤효손·「?」 둘)만(§13-4). 김일손은 그리지 않는다(§13-18).
 * - 「?」 두 관원(유순·안침)은 누가 U·A 자리였는지 정하지 않는다: personId 'unknown_ua'(짝), 인물 id 는 자리 이름(fig_u, fig_a).
 * 이 파일은 런타임에 불러오지 않는다(컷은 미리 구운 이미지). 굽는 스크립트·dev 페이지·단위 테스트가 쓴다.
 */
import type { PovFigure, PovSpec, SeatId } from '@/game/pov/types';
import type { CutId, FigureId } from '@/data/v5/ids';

export type Ep1Figure = PovFigure & { id: FigureId };

export interface CutRenderSpec {
  id: CutId;
  /** 눈 번호(1 윤효손 · 2 이극돈 · 3 어세겸 · 4 홍귀달) */
  eye: 1 | 2 | 3 | 4;
  time: string;
  /** 내부 설명(화면에 쓰지 않는다 — UI 는 이름·연도를 알려주지 않는다) */
  note: string;
  /** DESIGN 표가 이 컷에 적은 사람: 반드시 보여야 한다 */
  listed: FigureId[];
  /** 그 시각 방에 있지만 이 눈의 시야 밖이어야 하는 사람(DESIGN 의 「시야 밖」) */
  absent?: FigureId[];
  /** 보여야 하는 종이 조각 수(가림 검증, §4.2 SP ← W) */
  slipsVisible?: number;
  /** 닫히는 눈(E3): 06:00 뒤 지워진 기억 변형도 굽는다 */
  erasable?: boolean;
  spec: Omit<PovSpec, 'size' | 'overlay'> & { figures: Ep1Figure[] };
}

// ── 사람(옷 색·체격은 화면 읽기용 구분) ─────────────────────────────
type Opt = Partial<Omit<Ep1Figure, 'id'>>;
const yi = (o: Opt = {}): Ep1Figure => ({ id: 'fig_yi', personId: 'yi_geukdon', robe: 'red', seat: 'Y', pose: 'seated', build: 1.06, ...o });
const yun = (o: Opt = {}): Ep1Figure => ({ id: 'fig_yun', personId: 'yun_hyoson', robe: 'green', seat: 'W', pose: 'seated', build: 0.95, beard: 0.6, ...o });
const eo = (o: Opt = {}): Ep1Figure => ({ id: 'fig_eo', personId: 'eo_segyeom', robe: 'red-dark', seat: 'O', pose: 'seated', build: 1.0, beard: 1, ...o });
const hong = (o: Opt = {}): Ep1Figure => ({ id: 'fig_hong', personId: 'hong_gwidal', robe: 'blue', seat: 'H', pose: 'seated', build: 0.98, beard: 0.9, ...o });
const qU = (o: Opt = {}): Ep1Figure => ({ id: 'fig_u', personId: 'unknown_ua', robe: 'young', seat: 'U', pose: 'seated', beard: 0.5, ...o });
const qA = (o: Opt = {}): Ep1Figure => ({ id: 'fig_a', personId: 'unknown_ua', robe: 'slate', seat: 'A', pose: 'seated', build: 1.02, beard: 0.7, ...o });
const msg = (o: Opt = {}): Ep1Figure => ({ id: 'fig_msg', robe: 'messenger', seat: 'B', pose: 'standing', facing: 270, beard: 0, ...o });
const clerk = (o: Opt = {}): Ep1Figure => ({ id: 'fig_clerk', robe: 'clerk', hat: 'clerk-cap', pose: 'standing', beard: 0, build: 0.92, ...o });

/** §4.3 자리(재구성) — 서리와 이동하는 사람의 도면 좌표 */
const AT = {
  CLK_0910: { x: 7.6, y: 4.8 },
  CLK_1145: { x: 9.0, y: 4.6 },
  CLK_1320: { x: 9.4, y: 2.9 },
  CLK_1540: { x: 10.4, y: 1.6 },
  CLK_1610: { x: 10.6, y: 1.6 },
  HONG_EDGE: { x: 8.0, y: 4.8 },
  /** 15:00 절취·봉함: 이극돈은 SP 앞으로 다가앉는다 */
  YI_SP: { x: 4.0, y: 3.8 },
  /** 15:00 받으려는 사람(서안 남쪽, M2 곁) */
  MSG_1500: { x: 5.45, y: 4.78 },
  /** 15:20 봉한 꾸러미를 들고 문으로 나감 */
  MSG_1520: { x: 6.05, y: 7.7 },
} as const;

/** 14:00~14:20 문 쪽을 향해 앉은 사람들 */
const toward = (seat: SeatId): Opt => ({ facing: seat });

const SELF = {
  1: { robe: 'green', hands: 'rest', item: 'brush' },
  2: { robe: 'red', hands: 'rest', item: 'sheet' },
  3: { robe: 'red-dark', hands: 'rest-both', item: 'none' },
  4: { robe: 'blue', hands: 'rest-left', item: 'book' },
} as const satisfies Record<number, PovSpec['self']>;

export const EP1_CUTS: readonly CutRenderSpec[] = [
  // ── E1 윤효손(W, 서쪽을 봄) — 초록 소매 + 붓 ─────────────────────
  {
    id: 'e1-1',
    eye: 1,
    time: '09:10',
    note: '서안 너머 붉은 관복이 사초를 읽는다. 서리가 꾸러미를 내려놓는다(이름표는 멀어 안 읽힘).',
    listed: ['fig_yi', 'fig_clerk'],
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      lookAt: { x: 4.6, y: 4.95, h: 0.62 },
      fov: 58,
      time: '09:10',
      focus: 'fig_yi',
      figures: [yi({ pose: 'seated-reading', holding: 'paper', facing: 0 }), clerk({ pos: AT.CLK_0910, pose: 'standing-placing', facing: 222, holding: 'bundle' }), qU({ facing: 45 }), eo({ facing: 90 }), hong({ pose: 'seated-writing' }), qA({ pose: 'seated-writing' })],
      self: SELF[1],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e1-2',
    eye: 1,
    time: '11:40',
    note: '붉은 관복이 한 장을 오래 들고 있다. 어깨 뒤에서 서리의 귓속말(화면 밖).',
    listed: ['fig_yi'],
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      lookAt: { x: 3.6, y: 3.78, h: 0.74 },
      fov: 30,
      time: '11:40',
      focus: 'fig_yi',
      figures: [yi({ pose: 'seated-reading', holding: 'paper', facing: 0, lean: 10 }), clerk({ pos: { x: 9.6, y: 4.4 }, pose: 'kneel-whisper', facing: 'W' }), qU(), qA(), eo(), hong({ pose: 'seated-writing' })],
      self: SELF[1],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e1-3',
    eye: 1,
    time: '13:20',
    note: '자기 손과 교정하는 종이뿐. 어깨 뒤 귓속말(화면 밖).',
    listed: [],
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      eye: { x: 8.84, y: 3.76, h: 0.9 },
      lookAt: { x: 8.05, y: 3.82, h: 0.2 },
      fov: 54,
      time: '13:20',
      focus: 'desk',
      figures: [clerk({ pos: AT.CLK_1320, pose: 'kneel-whisper', facing: 'W' }), yi(), eo(), hong({ pose: 'seated-writing' }), qU(), qA()],
      self: { robe: 'green', hands: 'write', item: 'sheet', at: { x: 8.2, y: 3.8, h: 0.305 } },
      props: { bundles: 2 },
    },
  },
  {
    id: 'e1-4',
    eye: 1,
    time: '14:00',
    note: '문 앞의 사람이 접은 종이를 펴 읽는다(① 전교).',
    listed: ['fig_msg'],
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      lookAt: { x: 6.4, y: 8.2, h: 0.55 },
      fov: 55,
      time: '14:00',
      focus: 'fig_msg',
      figures: [msg({ pose: 'standing-reading', holding: 'paper' }), yi(toward('B')), eo(toward('B')), hong(toward('B')), qU(toward('B')), qA(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[1],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e1-5',
    eye: 1,
    time: '15:00',
    note: '붉은 관복의 손이 종이 조각을 가려 접는다. 사초 더미 너머로 다섯 장(한 장은 더미에 가림).',
    listed: ['fig_yi'],
    slipsVisible: 5,
    spec: {
      witnessId: 'yun_hyoson',
      seatId: 'W',
      lookAt: { x: 5.0, y: 3.8, h: 0.5 },
      fov: 26,
      time: '15:00',
      focus: 'fig_yi',
      figures: [yi({ pos: AT.YI_SP, pose: 'seated-folding', facing: 0 }), msg({ pos: AT.MSG_1500, pose: 'standing', facing: 250 }), eo(), hong({ pose: 'seated-writing' }), qU(), qA()],
      self: SELF[1],
      props: { slips: 'spread', wrapSlips: true, nameTag: true },
    },
  },

  // ── E2 이극돈(Y, 동쪽을 봄) — 붉은 소매 + 종이 ─────────────────────
  {
    id: 'e2-1',
    eye: 2,
    time: '11:45',
    note: '서안 너머 초록 관복(E1 자리). 서리가 「윤 대감」이라 부르며 교정 끝난 권을 묻는다.',
    listed: ['fig_yun', 'fig_clerk'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 9.0, y: 4.15, h: 0.72 },
      fov: 38,
      time: '11:45',
      focus: 'fig_yun',
      figures: [yun({ pose: 'seated-writing', facing: 180, headYaw: -35 }), clerk({ pos: AT.CLK_1145, pose: 'standing', facing: 'W', holding: 'book', lean: 12 }), qA({ pose: 'seated-writing' }), eo(), hong({ pose: 'seated-writing' }), qU()],
      self: SELF[2],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e2-2',
    eye: 2,
    time: '13:20',
    note: '윗자리(병풍 앞)의 늙은 관원이 뚜렷하다. 서리가 초록 관복 쪽으로 몸을 숙인다(귓속말은 안 들림).',
    listed: ['fig_eo', 'fig_clerk', 'fig_yun'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 7.6, y: 2.4, h: 0.62 },
      fov: 58,
      time: '13:20',
      focus: 'fig_eo',
      figures: [eo({ pose: 'seated-reading', holding: 'book' }), yun({ pose: 'seated-writing', facing: 180, headYaw: 30 }), clerk({ pos: AT.CLK_1320, pose: 'kneel-whisper', facing: 'W' }), hong({ pose: 'seated-writing' }), qA(), qU()],
      self: SELF[2],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e2-3',
    eye: 2,
    time: '14:05',
    note: '맞은편 초록 관복과 그 옆 「?」 하나가 문 쪽을 향해 아뢴다. 윗자리 관원은 말이 없다(시야 밖).',
    listed: ['fig_yun', 'fig_a'],
    absent: ['fig_u'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 9.3, y: 5.0, h: 0.62 },
      fov: 50,
      time: '14:05',
      focus: 'fig_yun',
      figures: [yun({ pose: 'seated-address', facing: 'B' }), qA({ pose: 'seated-address', facing: 'B' }), qU({ pose: 'seated-address', facing: 'B' }), eo(toward('B')), hong(toward('B')), msg({ pose: 'standing', holding: 'paper-folded' }), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[2],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e2-4',
    eye: 2,
    time: '14:40',
    note: '문 앞의 사람이 듣고 서 있다. 내 목소리(극돈 등)가 절취를 청한다.',
    listed: ['fig_msg'],
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      lookAt: { x: 6.0, y: 8.4, h: 0.85 },
      fov: 46,
      time: '14:40',
      focus: 'fig_msg',
      figures: [msg({ holding: 'paper-folded', facing: 250 }), yun(toward('B')), eo(toward('B')), hong(toward('B')), qU(toward('B')), qA(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[2],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e2-5',
    eye: 2,
    time: '15:00',
    note: '손 앞에 종이 여섯 장(한 장은 더미 곁), 「金馹孫」 이름표 꾸러미, 싸는 중인 보자기, 위쪽에 받으려는 손.',
    listed: ['fig_msg'],
    slipsVisible: 6,
    spec: {
      witnessId: 'yi_geukdon',
      seatId: 'Y',
      eye: { x: 4.02, y: 3.8, h: 0.93 },
      lookAt: { x: 5.35, y: 3.88, h: 0.36 },
      fov: 66,
      time: '15:00',
      focus: 'desk',
      figures: [msg({ pos: AT.MSG_1500, pose: 'standing-reach', facing: { x: 4.95, y: 4.05 } }), yun(), eo(), hong({ pose: 'seated-writing' }), qU(), qA()],
      self: { robe: 'red', hands: 'seal', item: 'none', at: { x: 4.66, y: 3.8, h: 0.37 } },
      props: { slips: 'spread', wrapSlips: true, nameTag: true, bundles: 2 },
    },
  },

  // ── E3 어세겸(O, 남쪽을 봄, 닫히는 눈) — 진한 붉은 두 소매(공수) ─────
  {
    id: 'e3-1',
    eye: 3,
    time: '13:40',
    note: '서안 모서리에 책을 내려놓는 남색 관원이 혼잣말처럼 말한다(국장 도감).',
    listed: ['fig_hong'],
    erasable: true,
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 7.9, y: 4.6, h: 0.7 },
      fov: 46,
      time: '13:40',
      focus: 'fig_hong',
      figures: [hong({ pos: AT.HONG_EDGE, pose: 'standing-placing', facing: { x: 7.4, y: 4.4 }, holding: 'book' }), yun({ pose: 'seated-writing' }), qA({ pose: 'seated-writing' }), yi({ pose: 'seated-reading', holding: 'paper' }), qU()],
      self: SELF[3],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e3-2',
    eye: 3,
    time: '14:00',
    note: '서안 너머 문 앞 낭독(① 전교).',
    listed: ['fig_msg'],
    erasable: true,
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 6.0, y: 8.6, h: 0.5 },
      fov: 48,
      time: '14:00',
      focus: 'fig_msg',
      figures: [msg({ pose: 'standing-reading', holding: 'paper' }), yi(toward('B')), yun(toward('B')), hong(toward('B')), qU(toward('B')), qA(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[3],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e3-3',
    eye: 3,
    time: '14:05',
    note: '서안 너머 아래 양옆의 「?」 둘이 문 쪽으로 아뢴다. 서안 양 끝(붉은·초록)은 시야 밖. 내 자리는 말이 없다.',
    listed: ['fig_u', 'fig_a'],
    absent: ['fig_yi', 'fig_yun'],
    erasable: true,
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 6.14, y: 7.0, h: 0.8 },
      fov: 100,
      pano: { hfov: 100 },
      vignette: 0.3,
      exposure: 1.35,
      time: '14:05',
      focus: 'fig_msg',
      figures: [qU({ pose: 'seated-address', facing: 'B' }), qA({ pose: 'seated-address', facing: 'B' }), yi({ pose: 'seated-address', facing: 'B' }), yun({ pose: 'seated-address', facing: 'B' }), msg({ pose: 'standing', holding: 'paper-folded' }), hong(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[3],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e3-4',
    eye: 3,
    time: '14:20',
    note: '문 앞의 사람이 다시 읽는다(② 전교). 그리고 긴 침묵.',
    listed: ['fig_msg'],
    erasable: true,
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 6.0, y: 8.6, h: 0.95 },
      fov: 30,
      time: '14:20',
      focus: 'fig_msg',
      figures: [msg({ pose: 'standing-reading', holding: 'paper' }), yi(toward('B')), yun(toward('B')), hong(toward('B')), qU(toward('B')), qA(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[3],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e3-5',
    eye: 3,
    time: '15:40',
    note: '구석 책상 옆에서 서리가 남색 관원에게 「조의제문」 이야기를 한다.',
    listed: ['fig_clerk', 'fig_hong'],
    erasable: true,
    spec: {
      witnessId: 'eo_segyeom',
      seatId: 'O',
      lookAt: { x: 10.7, y: 1.4, h: 0.6 },
      fov: 38,
      time: '15:40',
      focus: 'fig_hong',
      figures: [hong({ pose: 'seated', facing: 135, headYaw: 40 }), clerk({ pos: AT.CLK_1540, pose: 'kneel', facing: 'H', lean: 16 }), yun(), yi({ pos: AT.YI_SP }), qU(), qA()],
      self: SELF[3],
      props: { sealedBundle: false, bundles: 2 },
    },
  },

  // ── E4 홍귀달(H, 구석 — 남서쪽을 봄) — 남색 왼소매 + 책 ──────────────
  {
    id: 'e4-1',
    eye: 4,
    time: '13:50',
    note: '구석 책상 위 교정 중인 책, 창빛.',
    listed: [],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      eye: { x: 11.12, y: 1.08, h: 0.9 },
      lookAt: { x: 10.58, y: 1.62, h: 0.06 },
      fov: 54,
      time: '13:50',
      focus: 'desk',
      figures: [yun({ pose: 'seated-writing' }), qA(), eo(), yi(), qU()],
      self: { robe: 'blue', hands: 'write', item: 'book', at: { x: 10.66, y: 1.52, h: 0.315 } },
      props: { bundles: 2 },
    },
  },
  {
    id: 'e4-2',
    eye: 4,
    time: '14:00',
    note: '멀리 작게 보이는 낭독자(문까지 9.21칸 — 낭독 반경 8 밖). 앞의 초록 관복에 아래가 가린다.',
    listed: ['fig_msg'],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 6.6, y: 7.6, h: 0.45 },
      fov: 58,
      time: '14:00',
      figures: [msg({ pose: 'standing-reading', holding: 'paper' }), yun(toward('B')), qA(toward('B')), yi(toward('B')), eo(toward('B')), qU(toward('B')), clerk({ seat: 'CL', facing: 'B' })],
      self: SELF[4],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e4-3',
    eye: 4,
    time: '14:50',
    note: '문 앞의 사람이 서안 앞까지 들어와 짧게 읽는다(③ 「가하다」). 서안 위 손과 종이는 멀어 셀 수 없다.',
    listed: ['fig_msg'],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 5.6, y: 4.6, h: 0.62 },
      fov: 48,
      time: '14:50',
      focus: 'fig_msg',
      figures: [msg({ seat: 'M2', pose: 'standing-reading', holding: 'paper', facing: { x: 4.0, y: 3.8 } }), yi({ pos: AT.YI_SP, pose: 'seated-writing' }), yun(toward('M2')), qA(toward('M2')), qU(toward('M2')), eo(toward('M2'))],
      self: SELF[4],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e4-4',
    eye: 4,
    time: '15:20',
    note: '봉한 꾸러미를 든 사람이 문을 나간다.',
    listed: ['fig_msg'],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 6.5, y: 7.6, h: 0.5 },
      fov: 54,
      time: '15:20',
      focus: 'fig_msg',
      figures: [msg({ pos: AT.MSG_1520, pose: 'standing-carrying', holding: 'sealed', facing: 95 }), yun(), qA(), yi({ pos: AT.YI_SP }), eo(), qU()],
      self: SELF[4],
      props: { bundles: 2 },
    },
  },
  {
    id: 'e4-5',
    eye: 4,
    time: '16:10',
    note: '가까이 다가온 서리의 귓속말(전해 들은 말).',
    listed: ['fig_clerk'],
    spec: {
      witnessId: 'hong_gwidal',
      seatId: 'H',
      lookAt: { x: 9.16, y: 4.5, h: 0.62 },
      fov: 58,
      time: '16:10',
      focus: 'fig_clerk',
      figures: [clerk({ pos: AT.CLK_1610, pose: 'kneel', facing: 'H', lean: 26 }), yun(), qA(), yi(), eo(), qU()],
      self: SELF[4],
      props: { bundles: 2 },
    },
  },
];

/** 그날의 방 도면 뒤에 까는 흐린 배경(사람 없음 — 자리를 알려주지 않는다) */
export const EP1_ROOM_BACKDROP: Omit<PovSpec, 'size' | 'overlay'> = {
  witnessId: 'room',
  seatId: 'O',
  eye: { x: 6.0, y: 4.2, h: 2.95 },
  lookAt: { x: 6.0, y: 4.75, h: 0 },
  fov: 112,
  roll: 0,
  time: '14:00',
  figures: [],
  props: { bundles: 2 },
};

export const cutById = (id: string): CutRenderSpec | undefined => EP1_CUTS.find((c) => c.id === id);
