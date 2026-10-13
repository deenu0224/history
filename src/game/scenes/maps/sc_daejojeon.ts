/**
 * 겨울 궁궐 안채(침전류) 내실 — 재구성(reconstructed). 특정 전각의 실제 구조를 주장하지 않는다.
 * 병풍을 등지고 정돈된 이부자리(몸 형상 없음), 좌우 휘장, 화로, 무릎 꿇은 내관·궁녀.
 * 복식·가구 세부는 임시(temp) — SPRITE_META 참고.
 */
import type { Diorama } from './types';

export const sc_daejojeon: Diorama = {
  w: 15,
  h: 10,
  ground: [
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
    'ooooooooooooooo',
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
    // 뒤: 병풍 3폭 + 이부자리 + 양옆 휘장
    { spriteKey: 'obj_screen_bamboo', x: 5, y: 2 },
    { spriteKey: 'obj_folding_screen', x: 7, y: 2 },
    { spriteKey: 'obj_screen_bamboo', x: 9, y: 2 },
    { spriteKey: 'obj_hwijang', x: 3.5, y: 3 },
    { spriteKey: 'obj_hwijang', x: 10.5, y: 3 },
    { spriteKey: 'obj_bedding', x: 7, y: 3 },
    // 침상 앞 소반(뚜껑 덮은 그릇)
    { spriteKey: 'obj_soban', x: 7, y: 5 },
    // 화로: 겨울
    { spriteKey: 'obj_brazier', x: 3, y: 5, anim: 'anim_brazier_embers' },
    { spriteKey: 'obj_brazier', x: 11, y: 5, anim: 'anim_brazier_embers' },
    // 무릎 꿇은 시종들(가운데를 향함)
    { spriteKey: 'pose_kneel_naegwan', x: 5, y: 5, frame: 2 },
    { spriteKey: 'pose_kneel_gungnyeo_a', x: 5, y: 7, frame: 2 },
    { spriteKey: 'pose_kneel_gungnyeo_b', x: 9, y: 5, frame: 1 },
    { spriteKey: 'pose_kneel_naegwan', x: 9, y: 7, frame: 1 },
    // 등잔 + 세간
    { spriteKey: 'obj_lamp', x: 2, y: 2, anim: 'anim_lamp_flicker' },
    { spriteKey: 'obj_lamp', x: 12, y: 2, anim: 'anim_lamp_flicker' },
    { spriteKey: 'obj_chest', x: 1, y: 7 },
    { spriteKey: 'obj_jar', x: 13, y: 7 },
    // 문 앞: 걷어 묶은 휘장 + 돗자리
    { spriteKey: 'obj_hwijang_tied', x: 7, y: 9 },
    { spriteKey: 'obj_mat', x: 7, y: 8, flat: true },
  ],
};
