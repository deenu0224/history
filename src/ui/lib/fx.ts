/**
 * 촉감 피드백. 어디서든 fx(kind) 를 부르면 FEEDBACK 표(src/data/feedback.ts)대로 소리·진동을 낸다.
 * 애니메이션(도장·팝)은 각 컴포넌트의 CSS 가 맡고 prefers-reduced-motion 에서 줄어든다.
 */
import { bus, type FeedbackKind } from '@/core/bus';
import { FEEDBACK } from '@/data/feedback';
import { playSfx, resolveSfx, type SfxName } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';

/** FEEDBACK 표의 효과음 이름 → src/game/audio 의 SfxName ('none' 은 무음) */
export const sfxFor = (name: string): SfxName | undefined => {
  const r = resolveSfx(name);
  return r && r !== 'none' ? r : undefined;
};

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
    if (s.haptics && spec.haptic && canVibrate()) {
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
  if (s.haptics && spec?.haptic && canVibrate()) {
    try {
      navigator.vibrate(spec.haptic);
    } catch {
      /* 무시 */
    }
  }
}

/** 사용자가 한 번이라도 탭한 뒤에만 진동한다(브라우저가 그 전 호출을 막고 경고를 남긴다). */
function canVibrate(): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : true;
}
