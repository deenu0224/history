/**
 * 인쇄본 보관 창고 — 재구성(reconstructed). 서가·판가, 선장본 더미와 보자기 묶음, 궤, 서책을 궤에 넣는 서리.
 * 보관 방식·가구 형태는 일반형 임시(temp). 화기(화로)는 두지 않는다.
 */
import type { Diorama } from './types';

export const sc_print_storage: Diorama = {
  w: 14,
  h: 10,
  ground: [
    '______________',
    '______________',
    '______________',
    ',.,.,.,.,.,.,.',
    '.,.,.,.,.,.,.,',
    '..............',
    '.,..,..,..,...',
    '..............',
    ',.,.,.,.,.,.,.',
    '......,.......',
  ],
  walls: [
    'PHHHPHHHHPHHHP',
    'P            P',
    'P            P',
    'P            P',
    'P            P',
    'P            P',
    'P            P',
    'P            P',
    'P            P',
    'PHHHHHDHHHHHHP',
  ],
  spawn: { x: 6, y: 8 },
  ambient: 'past',
  objects: [
    // 북쪽 벽: 서가 + 판가
    { spriteKey: 'obj_bookshelf', x: 2, y: 2 },
    { spriteKey: 'obj_bookshelf', x: 3, y: 2 },
    { spriteKey: 'obj_bookshelf', x: 4, y: 2 },
    { spriteKey: 'obj_block_rack', x: 6, y: 2 },
    { spriteKey: 'obj_block_rack', x: 7, y: 2 },
    { spriteKey: 'obj_bookshelf', x: 9, y: 2 },
    { spriteKey: 'obj_bookshelf', x: 10, y: 2 },
    { spriteKey: 'obj_bookshelf', x: 11, y: 2 },
    // 왼쪽: 선장본 더미 · 보자기 묶음 · 낱장 인쇄지
    { spriteKey: 'obj_book_pile_tall', x: 2, y: 5 },
    { spriteKey: 'obj_book_pile_tall', x: 3, y: 5 },
    { spriteKey: 'obj_book_bundle', x: 5, y: 5 },
    { spriteKey: 'obj_sheets_pile', x: 2, y: 7 },
    { spriteKey: 'obj_books_stack', x: 4, y: 7 },
    { spriteKey: 'obj_book_bundle', x: 5, y: 7 },
    // 오른쪽: 궤 + 서책을 궤에 넣는 서리
    { spriteKey: 'obj_chest_long', x: 10.5, y: 4 },
    { spriteKey: 'obj_chest', x: 12, y: 4 },
    { spriteKey: 'obj_book_bundle', x: 8, y: 4 },
    { spriteKey: 'obj_chest_open', x: 9, y: 6 },
    { spriteKey: 'pose_clerk_packing', x: 10, y: 6, anim: 'anim_clerk_packing' },
    { spriteKey: 'obj_chest', x: 12, y: 6 },
    { spriteKey: 'obj_chest', x: 12, y: 7 },
    { spriteKey: 'obj_book_bundle', x: 9, y: 8 },
    { spriteKey: 'obj_jar', x: 11, y: 8 },
    // 문 옆 등잔
    { spriteKey: 'obj_lamp', x: 4, y: 8, anim: 'anim_lamp_flicker' },
  ],
};
