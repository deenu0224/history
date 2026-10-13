/**
 * 촉감 피드백. 어디서든 bus 'feedback' 을 내보내면 셸이 이 표대로 소리·진동을 낸다(TERMINAL_DESIGN §11).
 * 애니메이션(도장·팝)은 각 컴포넌트가 CSS 클래스로 처리하고 prefers-reduced-motion 에서 줄어든다.
 */
import { bus, type FeedbackKind } from '@/core/bus';
import { FEEDBACK } from '@/data/terminal';
import { playSfx, type SfxName } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';

/** FEEDBACK 표의 효과음 이름 → src/game/audio 의 SfxName */
const SFX: Record<string, SfxName> = {
  tick: 'select',
  search_hit: 'open',
  search_miss: 'close',
  discover: 'discover',
  stamp: 'page',
  paper: 'page',
  clock_tick: 'step',
  success: 'success',
  partial: 'partial',
  soft_thud: 'fail',
  message: 'select',
  case_open: 'open',
  brush: 'page',
  ink_bloom: 'discover',
};

export const sfxFor = (name: string): SfxName | undefined => SFX[name];

/** 촉감 피드백 요청 */
export function fx(kind: FeedbackKind) {
  bus.emit('feedback', { kind });
}

/** 셸이 한 번 설치하는 구독 */
export function installFeedback(): () => void {
  return bus.on('feedback', ({ kind }) => {
    const spec = FEEDBACK[kind];
    if (!spec) return;
    const sfx = SFX[spec.sfx];
    if (sfx) playSfx(sfx);
    const s = useGameStore.getState().settings;
    if (s.haptics && spec.haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(spec.haptic);
      } catch {
        /* 일부 브라우저는 제스처 없이 거부 */
      }
    }
  });
}
