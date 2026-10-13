/** 월드 순수 로직이 공유하는 타입. Phaser 의존 없음. */
export interface Pt {
  x: number;
  y: number;
}

export type Ambient = 'past' | 'modern';
export type Facing = 'down' | 'left' | 'right' | 'up';

export interface MapData {
  w: number;
  h: number;
  /** 바닥 문자 격자 (행 = y) */
  ground: string[];
  /** 벽/고체/오브젝트 문자 격자 */
  walls: string[];
  spawn: Pt;
  ambient: Ambient;
}

export const TILE = 32;
