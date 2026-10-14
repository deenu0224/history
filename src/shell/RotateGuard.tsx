import { useEffect, useState } from 'react';
import {
  LANDSCAPE_TOUCH_QUERY,
  isStandalone,
  isTouchLandscape,
  tryLockPortrait,
} from './orientation';

/** 터치 기기가 가로일 때 전체를 덮는 안내. 아래 앱은 멈추지 않고 그대로 돈다. */
export function RotateGuard() {
  const [landscape, setLandscape] = useState(() =>
    typeof matchMedia === 'function' ? isTouchLandscape(matchMedia.bind(window)) : false,
  );

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(LANDSCAPE_TOUCH_QUERY);
    const on = () => setLandscape(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // 첫 제스처에서 (설치형일 때만) 세로 잠금 시도 — 실패해도 조용히 무시.
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const once = () => {
      window.removeEventListener('pointerdown', once, true);
      const nav = navigator as Navigator & { standalone?: boolean };
      void tryLockPortrait(
        (screen as Screen & { orientation?: { lock?: (o: 'portrait') => Promise<void> } }).orientation,
        isStandalone(matchMedia.bind(window), nav.standalone),
      );
    };
    window.addEventListener('pointerdown', once, true);
    return () => window.removeEventListener('pointerdown', once, true);
  }, []);

  if (!landscape) return null;
  return (
    <div className="rotate-guard" role="alert" aria-live="assertive">
      <svg className="rotate-guard__icon" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
          <rect x="22" y="8" width="20" height="36" rx="2" />
          <path d="M30 38h4" />
          <path d="M12 52a24 24 0 0 0 40 0" />
          <path d="M52 52l-2 -8M52 52l-8 -2" />
        </g>
      </svg>
      <p className="rotate-guard__msg">세로로 돌려 주세요</p>
    </div>
  );
}
