import type { Diorama } from './types';
import { sc_daejojeon } from './sc_daejojeon';
import { sc_court_decree } from './sc_court_decree';
import { sc_council } from './sc_council';
import { sc_print_storage } from './sc_print_storage';

export type { Diorama, DioramaObject } from './types';
export { sc_daejojeon, sc_court_decree, sc_council, sc_print_storage };

/** 디오라마 장면 ID → 맵 */
export const DIORAMAS: Record<'sc_daejojeon' | 'sc_court_decree' | 'sc_council' | 'sc_print_storage', Diorama> = {
  sc_daejojeon,
  sc_court_decree,
  sc_council,
  sc_print_storage,
};
