/**
 * 촉감 피드백 표(닌텐도식 원칙 5: 핵심 동작은 만질 때 기분이 좋아야 한다). UI·뷰어·오디오가 같은 표를 쓴다.
 *  sfx: src/game/audio 의 효과음 키 · stamp: 픽셀 도장 텍스처 키(src/game/art) · anim: CSS/Phaser 애니 이름
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
  tap: { sfx: 'tick', anim: 'press-1px', haptic: [8] },
  search_hit: { sfx: 'search_hit', anim: 'results-cascade', haptic: [12] },
  search_miss: { sfx: 'search_miss', anim: 'field-wobble' },
  scrub_tick: { sfx: 'clock_tick', anim: 'none', haptic: [4] },
  hear: { sfx: 'paper', anim: 'underline-ink', haptic: [6] },
  shutter: { sfx: 'shutter', anim: 'flash-white', haptic: [14, 30, 10] },
  capture_full: { sfx: 'soft_thud', anim: 'film-shake' },
  stamp: { sfx: 'stamp', stamp: 'stamp_ink', anim: 'stamp-press', haptic: [25] },
  stamp_miss: { sfx: 'paper', anim: 'stamp-lift' },
  stamp_auto: { sfx: 'none', stamp: 'stamp_grey', anim: 'stamp-overlay-grey' },
  verdict_confirmed: { sfx: 'success', stamp: 'stamp_confirmed', anim: 'blank-fill', haptic: [20, 60, 40] },
  verdict_partial: { sfx: 'partial', stamp: 'stamp_partial', anim: 'range-narrow', haptic: [20] },
  verdict_wrong: { sfx: 'soft_thud', anim: 'card-nudge' },
  message: { sfx: 'message', anim: 'bubble-pop', haptic: [10] },
  // 복원: 따뜻한 먹 번짐 + 글자 깜빡여 바뀜. 말소: 무음, 명도 한 칸, 진동 없음.
  restore: { sfx: 'ink_bloom', stamp: 'stamp_restored', anim: 'ink-spread-rewrite', haptic: [30, 60, 30] },
  erase: { sfx: 'none', anim: 'dim-one-step' },
};
