/** 책상(야간 근무 책상) 스프라이트 모음 — registry.ts 가 SPRITES 에 합친다. */
import type { PixelSprite } from './pixel';
import { DESK_STAMPS } from './desk_stamps';
import { DESK_UI } from './desk_ui';

export const DESK_SPRITES: Record<string, PixelSprite> = {
  ...DESK_STAMPS,
  ...DESK_UI,
};
