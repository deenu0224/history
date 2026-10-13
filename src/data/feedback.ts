/**
 * 촉감 피드백 표(닌텐도식 원칙 5: 핵심 동작은 만질 때 기분이 좋아야 한다). UI·뷰어·오디오가 같은 표를 쓴다.
 *  sfx: src/game/audio 의 효과음 키(SFX_NAMES; 'none' = 의도적 무음) · stamp: 픽셀 도장 텍스처 키(src/game/art) · anim: CSS/Phaser 애니 이름
 *  haptic: navigator.vibrate 패턴(ms). settings.haptics=false 거나 미지원이면 생략. 오답·말소에는 진동 없음.
 */
import type { FeedbackKind } from '@/core/bus';

export interface FeedbackSpec {
  sfx: string;
  stamp?: string;
  anim: string;
  haptic?: number[];
}

export const FEEDBACK: Record<FeedbackKind, FeedbackSpec> = {
  tap: { sfx: 'select', anim: 'press-1px', haptic: [8] },
  search_hit: { sfx: 'open', anim: 'results-cascade', haptic: [12] },
  search_miss: { sfx: 'close', anim: 'field-wobble' },
  scrub_tick: { sfx: 'step', anim: 'none', haptic: [4] },
  hear: { sfx: 'hear', anim: 'underline-ink', haptic: [6] },
  shutter: { sfx: 'shutter', anim: 'flash-white', haptic: [14, 30, 10] },
  capture_full: { sfx: 'capture_full', anim: 'film-shake' },
  // 확인 도장(초록). 모든 도장 자국 아래 각인 07.
  stamp: { sfx: 'stamp_confirm', stamp: 'stamp_confirm', anim: 'stamp-press', haptic: [25] },
  stamp_correct: { sfx: 'stamp_correct', stamp: 'stamp_correct', anim: 'stamp-press', haptic: [25, 40, 15] },
  // 서랍의 불일치 도장(빨강, 마른 잉크): 무겁게
  stamp_red: { sfx: 'stamp_red', stamp: 'stamp_red', anim: 'stamp-press-heavy', haptic: [40] },
  stamp_miss: { sfx: 'page', anim: 'stamp-lift' },
  // 시스템의 회색 자동 분류 도장(0.3초 뒤 덮임)
  stamp_auto: { sfx: 'stamp_auto', stamp: 'stamp_grey', anim: 'stamp-overlay-grey' },
  verdict_confirmed: { sfx: 'success', stamp: 'stamp_confirmed', anim: 'blank-fill', haptic: [20, 60, 40] },
  verdict_partial: { sfx: 'partial', stamp: 'stamp_partial', anim: 'range-narrow', haptic: [20] },
  verdict_wrong: { sfx: 'fail', anim: 'card-nudge' },
  message: { sfx: 'message', anim: 'bubble-pop', haptic: [10] },
  // 복원: 따뜻한 먹 번짐 + 글자 깜빡여 바뀜. 말소: 차갑게, 명도 한 칸, 진동 없음.
  restore: { sfx: 'restore', stamp: 'stamp_restored', anim: 'ink-spread-rewrite', haptic: [30, 60, 30] },
  erase: { sfx: 'erase', anim: 'dim-one-step' },
  printer: { sfx: 'printer', anim: 'paper-feed' },
  // 경고장: 오답에는 진동 없음(닌텐도식: 실패는 벌이 아니라 정보)
  warning: { sfx: 'warning', anim: 'slip-feed-red' },
  inspect_link: { sfx: 'inspect_link', anim: 'thread-red', haptic: [12] },
  inspect_notation: { sfx: 'inspect_notation', anim: 'thread-yellow-flicker-cut', haptic: [6] },
  inspect_none: { sfx: 'select', anim: 'thread-fade' },
  queue_next: { sfx: 'queue_next', anim: 'card-slide-in' },
  shift_end: { sfx: 'shift_end', anim: 'report-card-print' },
  page: { sfx: 'page', anim: 'page-turn' },
};

/** 배경 음악 트랙(src/game/audio setMusic). UI 가 장면에 따라 부른다 — DESIGN_V4 §계약. */
export const MUSIC = {
  boot: 'title',
  desk: 'office',
  observe: 'observe',
  tension: 'tension',
  restore: 'restore',
  ending: 'ending',
} as const;
