/**
 * 에피소드 0 「하룻밤」 id 표 — 컷 렌더 명세(src/data/cuts/**)·UI 와 맞물리는 계약(DESIGN_V5 §14).
 * 눈 하나 E0(하위지, 주어짐·주인을 안다), 컷 셋 e0-1~e0-3. 사람: fig_king · fig_choi(최만리) · fig_jeong(정창손) ·
 * fig_kim(김문) · fig_row(줄지어 앉은 다른 관원들, 탭 불가). 보는 사람 = 하위지(자리 HA, 줄 끝).
 */
export const EP0_EYE_IDS = ['E0'] as const;
export const EP0_CUT_IDS = ['e0-1', 'e0-2', 'e0-3'] as const;
export type Ep0CutId = (typeof EP0_CUT_IDS)[number];

/** 컷 id → 시각(재구성) */
export const EP0_CUT_TIMES: Readonly<Record<Ep0CutId, string>> = { 'e0-1': '10:00', 'e0-2': '10:10', 'e0-3': '10:15' };

export const EP0_FIGURE_IDS = ['fig_king', 'fig_choi', 'fig_jeong', 'fig_kim', 'fig_row'] as const;
export type Ep0FigureId = (typeof EP0_FIGURE_IDS)[number];

/** 도면 자리 id(src/data/v5/ep0/room.ts): K 높은 자리 · C 줄 맨 앞(최만리) · J·M·ROW 줄 · HA 줄 끝(보는 사람) */
export const EP0_SEAT_IDS = ['K', 'C', 'J', 'M', 'ROW', 'HA'] as const;

/** e0-1 의 본 것(탭하면 한글 읽기가 나온다) — 렌더 쪽은 두루마리 첫머리 「副提學 崔萬理」가 읽히게 그린다 */
export const EP0_DETAIL_IDS = ['d_scroll_head', 'd_e0_dais'] as const;
