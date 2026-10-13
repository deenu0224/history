/**
 * 촉감 피드백. 어디서든 fx(kind) 를 부르면 FEEDBACK 표(src/data/feedback.ts)대로 소리·진동을 낸다.
 * 애니메이션(도장·팝)은 각 컴포넌트의 CSS 가 맡고 prefers-reduced-motion 에서 줄어든다.
 */
import { bus, type FeedbackKind } from '@/core/bus';
import { FEEDBACK } from '@/data/feedback';
import { playSfx, type SfxName } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';

/** FEEDBACK 표의 효과음 이름 → src/game/audio 의 SfxName ('none' 은 무음) */
const SFX: Record<string, SfxName> = {
  tick: 'select',
  search_hit: 'open',
  search_miss: 'close',
  paper: 'page',
  clock_tick: 'step',
  shutter: 'shutter',
  stamp: 'page',
  success: 'success',
  partial: 'partial',
  soft_thud: 'fail',
  message: 'select',
  ink_bloom: 'discover',
};

export const sfxFor = (name: string): SfxName | undefined => SFX[name];

export function fx(kind: FeedbackKind) {
  bus.emit('feedback', { kind });
}

/** 셸이 한 번 설치하는 구독 */
export function installFeedback(): () => void {
  return bus.on('feedback', ({ kind }) => {
    const spec = FEEDBACK[kind];
    if (!spec) return;
    const sfx = sfxFor(spec.sfx);
    if (sfx) playSfx(sfx);
    const s = useGameStore.getState().settings;
    if (s.haptics && spec.haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(spec.haptic);
      } catch {
        /* 제스처 없이는 거부될 수 있다 */
      }
    }
  });
}

/** 소리 없이 진동만(뷰어가 직접 소리를 내는 동작용) */
export function haptic(kind: FeedbackKind) {
  const spec = FEEDBACK[kind];
  const s = useGameStore.getState().settings;
  if (s.haptics && spec?.haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(spec.haptic);
    } catch {
      /* 무시 */
    }
  }
}
