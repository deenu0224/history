/**
 * 촉감 피드백 표(UI_STYLE_GUIDE §7, 닌텐도식 원칙: 핵심 동작은 만질 때 기분이 좋아야 한다).
 *  sfx: src/game/audio 의 효과음 이름(SFX_NAMES 또는 SFX_ALIASES; 'none' = 의도적 무음) · anim: CSS 애니 이름
 *  haptic: navigator.vibrate 패턴(ms). iOS 사파리는 웹 진동이 없으므로 같은 순간에 소리·시각 피드백이 늘 함께 있다.
 *  실패·소실에는 진동 없음.
 */
import type { FeedbackKind } from '@/core/bus';

export interface FeedbackSpec {
  sfx: string;
  anim: string;
  haptic?: number[];
}

export const FEEDBACK: Record<FeedbackKind, FeedbackSpec> = {
  tap: { sfx: 'select', anim: 'press-1px' },
  swipe: { sfx: 'page', anim: 'cut-snap' },
  tag_ok: { sfx: 'success', anim: 'ink-line-name', haptic: [18] },
  tag_no: { sfx: 'fail', anim: 'sheet-line' },
  tags_done: { sfx: 'stamp_correct', anim: 'all-named', haptic: [12, 50, 24] },
  eye_open: { sfx: 'discover', anim: 'eyelid-open', haptic: [20, 40, 20] },
  eye_close: { sfx: 'none', anim: 'eye-cold-line' },
  merge: { sfx: 'select', anim: 'circles-merge', haptic: [10] },
  contradiction: { sfx: 'hear', anim: 'alert-mark' },
  resolve: { sfx: 'partial', anim: 'claim-sink', haptic: [12] },
  message: { sfx: 'message', anim: 'bubble-rise' },
  write: { sfx: 'page', anim: 'ink-bleed', haptic: [15] },
  write_grey: { sfx: 'page', anim: 'witness-grey' },
  write_fail: { sfx: 'fail', anim: 'line-cold-blink' },
  restore: { sfx: 'restore', anim: 'ink-spread-rewrite', haptic: [30, 60, 30, 60, 80] },
  search_hit: { sfx: 'open', anim: 'results-cascade' },
  search_miss: { sfx: 'close', anim: 'field-wobble' },
  page: { sfx: 'page', anim: 'page-turn' },
};

/** 배경 음악 트랙(src/game/audio setMusic). UI 가 장면에 따라 부른다. */
export const MUSIC = {
  boot: 'title',
  home: 'office',
  observe: 'observe',
  tension: 'tension',
  restore: 'restore',
  ending: 'ending',
} as const;
