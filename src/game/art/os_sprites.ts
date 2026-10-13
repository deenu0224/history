/** 결록 단말(OS) 스프라이트 모음 — registry.ts 가 SPRITES 에 합친다. */
import type { PixelSprite } from './pixel';
import { OS_ICONS } from './os_icons';
import { OS_CHROME } from './os_chrome';

export const OS_SPRITES: Record<string, PixelSprite> = {
  ...OS_ICONS,
  ...OS_CHROME,
};
