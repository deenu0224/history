/**
 * 관원들의 회의(어전 아닌 일반 회의실) — 재구성(reconstructed). 마루 홀 가운데 통로를 두고 두 줄로 마주 앉아
 * 낮은 책상 앞에서 기록한다. 빈자리 하나, 뒤쪽 병풍. 임금의 자리는 그리지 않는다.
 */
import type { Diorama } from './types';

export const sc_council: Diorama = {
  w: 15,
  h: 10,
  ground: [
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______________',
    '_______,_______',
  ],
  walls: [
    'PHHHPHHPHHPHHHP',
    'P             P',
    'P             P',
    'P             P',
    'P             P',
    'P             P',
    'P             P',
    'P             P',
    'P             P',
    'PHHHHHHDHHHHHHP',
  ],
  spawn: { x: 7, y: 8 },
  ambient: 'past',
  objects: [
    { spriteKey: 'obj_folding_screen', x: 7, y: 2 },
    // 가운데 통로 돗자리
    ...[3, 4, 5, 6, 7, 8].map((y) => ({ spriteKey: 'obj_mat', x: 7, y, flat: true })),
    // 왼쪽 줄(오른쪽을 바라봄): frame 2
    { spriteKey: 'seat_council_red', x: 4, y: 3, frame: 2 },
    { spriteKey: 'seat_council_blue', x: 4, y: 5, frame: 2 },
    { spriteKey: 'seat_council_green', x: 4, y: 7, frame: 2 },
    // 오른쪽 줄(왼쪽을 바라봄): frame 1 — 맨 아래는 빈자리
    { spriteKey: 'seat_council_green', x: 10, y: 3, frame: 1 },
    { spriteKey: 'seat_council_red', x: 10, y: 5, frame: 1 },
    { spriteKey: 'seat_council_empty', x: 10, y: 7, frame: 1 },
    // 기록하는 사관(통로 끝)
    { spriteKey: 'char_sagwan', x: 7, y: 8, frame: 21, anim: 'char_sagwan_write' },
    // 등잔 + 화로
    { spriteKey: 'obj_lamp', x: 2, y: 2, anim: 'anim_lamp_flicker' },
    { spriteKey: 'obj_lamp', x: 12, y: 2, anim: 'anim_lamp_flicker' },
    { spriteKey: 'obj_brazier', x: 1, y: 7, anim: 'anim_brazier_embers' },
    { spriteKey: 'obj_brazier', x: 13, y: 7, anim: 'anim_brazier_embers' },
  ],
};
