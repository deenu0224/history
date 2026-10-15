import type { Episode } from '@/core/types';
import { EP0 } from './ep0';
import { EP1 } from './episode';

export { EP1 } from './episode';
export { EP0, EP0_CUT_IDS, EP0_CUT_TIMES, EP0_EYE_IDS, EP0_FIGURE_IDS, EP0_SEAT_IDS, EP0_DETAIL_IDS, ROOM_EP0, SRC0, type Ep0CutId, type Ep0FigureId } from './ep0';
export { CUT_IDS, CUT_TIMES, EYE_IDS, FIGURE_IDS, SEAT_IDS, POINT_IDS, type CutId, type EyeId, type FigureId } from './ids';
export { SRC } from './sources';
export { LEDGER_NAMES } from './cards';
export { KIM_ALLOWED_BURSTS } from './messenger';
export { MISTRANSLATED_0711, ARTICLE_0711_KO } from './puzzle';

/** 에피소드 등록부(순서: Ep0 → Ep1) */
export const EPISODES: Readonly<Record<string, Episode>> = { ep0: EP0, ep1: EP1 };
export const EPISODE_ORDER = ['ep0', 'ep1'] as const;
