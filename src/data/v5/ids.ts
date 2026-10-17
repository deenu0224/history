/**
 * 에피소드 1 id 표 — 다른 모듈(컷 렌더 명세 src/data/cuts/**, UI)과 맞물리는 계약.
 *
 * 컷 id 규칙: `e{눈 번호}-{컷 번호}` (DESIGN_V5 §4.4 의 표기 「1-4」 = 'e1-4').
 *   E1 윤효손(주어진 눈) · E2 이극돈 · E3 어세겸(06:00 에 닫힘) · E4 홍귀달. 눈마다 5컷, 모두 20컷.
 * 눈 id: 'E1'…'E4', 열리지 않는 눈 'E5'(김일손).
 * 인물 표시(figure) id: 'fig_*'. 방의 자리 id: §4.2 도면 기호(Y, W, O, H, U, A, B, M2, SP …).
 */

export const EYE_IDS = ['E1', 'E2', 'E3', 'E4', 'E5'] as const;
export type EyeId = (typeof EYE_IDS)[number];

export const CUT_IDS = [
  'e1-1', 'e1-2', 'e1-3', 'e1-4', 'e1-5',
  'e2-1', 'e2-2', 'e2-3', 'e2-4', 'e2-5',
  'e3-1', 'e3-2', 'e3-3', 'e3-4', 'e3-5',
  'e4-1', 'e4-2', 'e4-3', 'e4-4', 'e4-5',
] as const;
export type CutId = (typeof CUT_IDS)[number];

/** 컷 id → 시각(재구성). 렌더 명세와 판정 데이터가 같은 순간을 가리키는지 확인하는 데 쓴다. */
export const CUT_TIMES: Readonly<Record<CutId, string>> = {
  'e1-1': '09:10', 'e1-2': '11:40', 'e1-3': '13:20', 'e1-4': '14:00', 'e1-5': '15:00',
  'e2-1': '11:45', 'e2-2': '13:20', 'e2-3': '14:05', 'e2-4': '14:40', 'e2-5': '15:00',
  'e3-1': '13:40', 'e3-2': '14:00', 'e3-3': '14:05', 'e3-4': '14:20', 'e3-5': '15:40',
  'e4-1': '13:50', 'e4-2': '14:00', 'e4-3': '14:50', 'e4-4': '15:20', 'e4-5': '16:10',
};

export const FIGURE_IDS = [
  'fig_yun', // 초록 관복 — 윤효손(E1 의 주인)
  'fig_yi', // 책상 너머 관원 — 이극돈(E2)
  'fig_eo', // 윗자리 관원 — 어세겸(E3)
  'fig_hong', // 남색 관복 — 홍귀달(E4)
  'fig_u', // 「?」 — 유순·안침(짝)
  'fig_a', // 「?」 — 유순·안침(짝)
  'fig_msg', // 전교를 가져온 사람(이름 없음)
  'fig_clerk', // 서리(가상)
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

/** 도면 자리·지점 id(§4.2). 좌표는 src/data/v5/room.ts */
export const SEAT_IDS = ['Y', 'W', 'O', 'H', 'U', 'A'] as const;
export const POINT_IDS = ['B', 'M2', 'SP', 'DOOR', 'HONG_EDGE', 'CLK_0910', 'CLK_1140', 'CLK_1145', 'CLK_1320', 'CLK_1540', 'CLK_1610'] as const;
