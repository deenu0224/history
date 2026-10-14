import type { ReactNode } from 'react';
import { RotateGuard } from './RotateGuard';
import './shell.css';

/**
 * 앱 루트를 감싸는 세로 폰 틀. 폰: 전체 화면 + 안전 영역. 데스크톱: 가운데 세로 컬럼 + 어두운 배경.
 * 자식은 CSS 변수 --app-w / --app-h 로 틀 크기를 알 수 있다.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="phone-backdrop">
      <div className="phone-frame">{children}</div>
      <RotateGuard />
    </div>
  );
}
