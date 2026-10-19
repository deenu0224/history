import type { Ep0Data } from '@/core/v6/types';
import { EP0_LINES } from './lines';
import { EP0_WORLD } from './questions';
import { NODES, START } from './nodes';
import { CLUES } from './clues';
import { COMBOS, CONCLUSIONS, WHY, WHY_TEMPLATES } from './combos';
import { FIX, MONOLOGUES } from './fix';
import { HINTS0 } from './messenger';

export { BURSTS0, ERASED0, EVENTS0, HINT_BURSTS } from './messenger';
export { HOLED_PARTS, HOLED_N9_PARTS } from './lines';

export const EP0_V6: Ep0Data = {
  id: 'ep0',
  lines: EP0_LINES,
  world: EP0_WORLD,
  nodes: NODES,
  start: START,
  clues: CLUES,
  conclusions: CONCLUSIONS,
  combos: COMBOS,
  why: WHY,
  whyTemplates: WHY_TEMPLATES,
  fix: FIX,
  monologues: MONOLOGUES,
  answerTokens: ['임금', '왕', '군상', '세종', '이도'],
  names: ['최만리', '정창손', '하위지', '김문', '신석조', '송처검', '조근', '설총', '부제학', '직제학', '직전', '응교', '부교리', '부수찬', '저작랑', '의금부', '집현전', '언문', '이두', '운서', '만리', '최항', '박팽년', '신숙주', '이선로', '이개', '강희안', '이유', '이용', '운회', '오례의주', '초수리', '청주', '동궁', '의사청'],
  hints: HINTS0,
};
