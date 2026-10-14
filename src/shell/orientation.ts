/** 세로 전용 정책의 순수 로직(브라우저 API 는 인자로 받아 테스트 가능하게 둔다). */

export const LANDSCAPE_TOUCH_QUERY = '(orientation: landscape) and (pointer: coarse)';
export const STANDALONE_QUERY = '(display-mode: standalone), (display-mode: fullscreen)';

type MatchFn = (q: string) => { matches: boolean };

/** 터치 기기가 가로로 누워 있으면 true. 데스크톱(마우스)은 창이 넓어도 false. */
export function isTouchLandscape(match: MatchFn): boolean {
  try {
    return match(LANDSCAPE_TOUCH_QUERY).matches;
  } catch {
    return false;
  }
}

export function isStandalone(match: MatchFn, navStandalone?: boolean): boolean {
  try {
    return match(STANDALONE_QUERY).matches || navStandalone === true;
  } catch {
    return navStandalone === true;
  }
}

type OrientationLike = { lock?: (o: 'portrait') => Promise<void> };

/** 설치형(standalone/fullscreen)에서만 세로 잠금을 시도한다. 실패는 무시. */
export async function tryLockPortrait(
  orientation: OrientationLike | undefined,
  standalone: boolean,
): Promise<boolean> {
  if (!standalone || !orientation?.lock) return false;
  try {
    await orientation.lock('portrait');
    return true;
  } catch {
    return false;
  }
}
