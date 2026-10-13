/** 픽셀 아트 → DOM 연결. 모든 그래픽은 src/game/art 의 코드 스프라이트다. */
import type { CSSProperties } from 'react';
import { toDataURL } from '@/game/art';
import { SPRITES } from '@/game/art/registry';

export const hasSprite = (key: string) => key in SPRITES;

/** 존재하는 첫 키. 아트 트랙이 아직 안 만든 키를 대체 키로 받는다. */
export function pickSprite(...keys: (string | undefined)[]): string | undefined {
  return keys.find((k): k is string => !!k && hasSprite(k));
}

/** 전시물 스프라이트: 정식 키가 없으면 임시(TEMP) 도상, 그것도 없으면 기록관 아이콘. */
const EXHIBIT_ALIAS: Record<string, string[]> = {
  exhibit_takyeong: ['exhibit_geomungo_TEMP'],
  exhibit_source_shelf: ['exhibit_silrok_book_TEMP'],
  exhibit_center_record: ['exhibit_sacho_bundle_TEMP'],
  exhibit_person_register: ['exhibit_silrok_book_TEMP'],
  exhibit_timeline: ['exhibit_silrok_book_TEMP'],
  exhibit_red_desk: ['exhibit_sacho_bundle_TEMP'],
  exhibit_daehaengwang: ['exhibit_silrok_book_TEMP'],
};
export function exhibitSprite(key: string): string {
  return pickSprite(key, ...(EXHIBIT_ALIAS[key] ?? []), 'app_archive') as string;
}

export function Px({
  k,
  scale = 1,
  className = '',
  style,
  alt = '',
  frame = 0,
}: {
  k: string;
  scale?: number;
  frame?: number;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  const sp = SPRITES[k];
  if (!sp) return <span className={`px-missing ${className}`} style={{ width: 16 * scale, height: 16 * scale, ...style }} />;
  return (
    <img
      className={`px ${className}`}
      src={toDataURL(k, frame)}
      width={sp.w * scale}
      height={sp.h * scale}
      alt={alt}
      draggable={false}
      style={style}
    />
  );
}

export const appIconKey = (iconKey: string, small = false) => (small && hasSprite(`${iconKey}_sm`) ? `${iconKey}_sm` : iconKey);

const url = (k: string) => `url("${toDataURL(k)}")`;

/** CSS 가 border-image / background 로 쓰는 스프라이트를 루트 변수로 한 번에 내보낸다. */
export function osCssVars(): CSSProperties {
  const keys: Record<string, string> = {
    '--u-window': 'os_window',
    '--u-window-idle': 'os_window_idle',
    '--u-btn': 'os_btn',
    '--u-btn-hover': 'os_btn_hover',
    '--u-btn-pressed': 'os_btn_pressed',
    '--u-btn-primary': 'os_btn_primary',
    '--u-btn-primary-hover': 'os_btn_primary_hover',
    '--u-btn-primary-pressed': 'os_btn_primary_pressed',
    '--u-panel': 'os_panel',
    '--u-field': 'os_field',
    '--u-field-focus': 'os_field_focus',
    '--u-tab': 'os_tab',
    '--u-tab-idle': 'os_tab_idle',
    '--u-pill': 'ov_observing_pill',
    '--u-scrub-track': 'ov_scrub_track',
    '--u-scrub-fill': 'ov_scrub_fill',
    '--u-view': 'ov_viewfinder',
    '--u-card': 'board_card',
    '--u-polaroid': 'board_polaroid',
    '--u-paper': 'note_paper_tile',
    '--u-scan': 'ov_scanline',
    '--u-wall': 'os_wallpaper',
    '--u-wall-p': 'os_wallpaper_portrait',
    '--u-chk-off': 'os_checkbox_off',
    '--u-chk-on': 'os_checkbox_on',
    '--u-ul-a': 'note_underline_a',
    '--u-ul-b': 'note_underline_b',
    '--u-ul-c': 'note_underline_c',
    '--u-circle': 'note_circle_pencil',
    '--u-check': 'note_check_pencil',
    '--u-cross': 'note_cross_red',
    '--u-dot0': 'ov_observing_dot',
  };
  const out: Record<string, string> = {};
  for (const [v, k] of Object.entries(keys)) if (hasSprite(k)) out[v] = url(k);
  return out as CSSProperties;
}
