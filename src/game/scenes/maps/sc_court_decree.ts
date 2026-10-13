/**
 * 궁궐 마당의 교지 낭독 — 재구성(reconstructed). 정전 앞 박석 길, 계단 위에서 교지를 받든 관원,
 * 마당 양옆에 줄지어 선 관원들. 건물 구조·의식 절차는 일반형이며 특정 사건의 장면이 아니다.
 */
import type { Diorama } from './types';

export const sc_court_decree: Diorama = {
  w: 19,
  h: 12,
  ground: [
    '.,...,...,.....,...',
    '.....,.............',
    '...,..........,....',
    '...................',
    '..._____===_____...',
    '."..,...===...,..".',
    '....,...===........',
    '..,.....===.....,..',
    '."......===......".',
    '....,...===...,....',
    '.,......===.....,..',
    '.........===.......',
  ],
  walls: [
    '###################',
    '#  RRRRRRRRRRRRR  #',
    '#  RRRRRRRRRRRRR  #',
    '#  PHHHHDDDHHHHP  #',
    '#       SSS       #',
    '#                 #',
    '#                 #',
    '# T               #',
    '#                 #',
    '#               T #',
    '#                 #',
    '########DDD########',
  ],
  spawn: { x: 9, y: 10 },
  ambient: 'past',
  objects: [
    // 계단 위: 교지를 받든 관원 + 받침
    { spriteKey: 'pose_decree_red', x: 9, y: 4 },
    { spriteKey: 'obj_decree_stand', x: 7, y: 4 },
    { spriteKey: 'char_naegwan', x: 11, y: 4, frame: 0 },
    // 마당 양옆에 줄지어 선 관원(정전을 향해 뒷모습)
    { spriteKey: 'char_official_blue', x: 5, y: 6, frame: 15 },
    { spriteKey: 'char_official_green', x: 7, y: 6, frame: 15 },
    { spriteKey: 'char_official_red', x: 11, y: 6, frame: 15 },
    { spriteKey: 'char_official_blue', x: 13, y: 6, frame: 15 },
    { spriteKey: 'char_official_green', x: 5, y: 8, frame: 15 },
    { spriteKey: 'char_official_blue', x: 7, y: 8, frame: 15 },
    { spriteKey: 'char_official_green', x: 11, y: 8, frame: 15 },
    { spriteKey: 'char_official_red', x: 13, y: 8, frame: 15 },
    { spriteKey: 'char_clerk', x: 4, y: 10, frame: 15 },
    { spriteKey: 'char_clerk', x: 14, y: 10, frame: 15 },
    { spriteKey: 'obj_rock_a', x: 2, y: 5 },
    { spriteKey: 'obj_rock_b', x: 16, y: 5 },
    { spriteKey: 'obj_grass_tuft', x: 3, y: 10 },
    { spriteKey: 'obj_grass_tuft', x: 15, y: 10 },
  ],
};
