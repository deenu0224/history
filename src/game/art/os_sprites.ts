/** 결록 단말(OS) 스프라이트 모음 — registry.ts 가 SPRITES 에 합친다. */
import type { PixelSprite } from './pixel';
import { OS_ICONS } from './os_icons';
import { OS_CHROME } from './os_chrome';
import { OS_WALLPAPERS } from './os_wallpaper';
import { OS_OBSERVE } from './os_observe';
import { OS_NOTEBOOK } from './os_notebook';
import { OS_AVATARS } from './os_avatars';
import { OS_EXHIBITS } from './os_exhibits';

export const OS_SPRITES: Record<string, PixelSprite> = {
  ...OS_ICONS,
  ...OS_CHROME,
  ...OS_WALLPAPERS,
  ...OS_OBSERVE,
  ...OS_NOTEBOOK,
  ...OS_AVATARS,
  ...OS_EXHIBITS,
};
