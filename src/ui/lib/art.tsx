/** 픽셀 아트 → DOM 연결. 모든 그래픽은 src/game/art 의 코드 스프라이트다. */
import type { CSSProperties } from 'react';
import { toDataURL } from '@/game/art';
import { SPRITES } from '@/game/art/registry';

export const hasSprite = (key: string) => key in SPRITES;

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
    <img className={`px ${className}`} src={toDataURL(k, frame)} width={sp.w * scale} height={sp.h * scale} alt={alt} draggable={false} style={style} />
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
    '--u-pill': 'ov_observing_pill',
    '--u-scrub-track': 'ov_scrub_track',
    '--u-view': 'ov_viewfinder',
    '--u-card': 'board_card',
    '--u-polaroid': 'board_polaroid',
    '--u-paper': 'note_paper_tile',
    '--u-scan': 'ov_scanline',
    '--u-wall': 'os_wallpaper',
    '--u-wall-p': 'os_wallpaper_portrait',
    '--u-ul-a': 'note_underline_a',
    '--u-circle': 'note_circle_pencil',
  };
  const out: Record<string, string> = {};
  for (const [v, k] of Object.entries(keys)) if (hasSprite(k)) out[v] = url(k);
  return out as CSSProperties;
}

/** 책상 CSS 변수: 상판·종이·전표·규정집·실 등을 border-image / background 로 쓴다. */
export function deskCssVars(): CSSProperties {
  const keys: Record<string, string> = {
    '--d-surface': 'desk_surface',
    '--d-edge': 'desk_edge',
    '--d-lamp': 'desk_lamp_pool',
    '--d-card': 'desk_card',
    '--d-slip': 'desk_slip',
    '--d-rulebook': 'desk_rulebook_open',
    '--d-rules-tile': 'desk_rules_tile',
    '--d-gutter': 'desk_rulebook_gutter',
    '--d-thread': 'desk_thread_h',
    '--d-dash': 'desk_thread_dash',
    '--d-knot': 'desk_thread_knot',
    '--d-knot-y': 'desk_thread_knot_yellow',
    '--d-pin': 'desk_pin',
  };
  const out: Record<string, string> = {};
  for (const [v, k] of Object.entries(keys)) if (hasSprite(k)) out[v] = url(k);
  return out as CSSProperties;
}
