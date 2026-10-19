/** v6 코드 선 아이콘(SVG 2px). 그림 파일 없음. 뒤로·닫기·메신저는 기존 parts/icons 를 쓴다. */
import type { ReactNode } from 'react';

const sv = (d: ReactNode, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const ITarget = ({ size = 22 }: { size?: number }) => sv(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /></>, size);
export const ILink = ({ size = 22 }: { size?: number }) => sv(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>, size);
export const IPair = ({ size = 22 }: { size?: number }) => sv(<><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></>, size);
export const IEye = ({ size = 22 }: { size?: number }) => sv(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>, size);
export const IEar = ({ size = 22 }: { size?: number }) => sv(<><path d="M7 9.5a5 5 0 0 1 10 0c0 3.2-3 3.8-3 6.5a2.5 2.5 0 0 1-5 0" /><path d="M10.5 9.5a1.6 1.6 0 0 1 3.2 0" /></>, size);
export const IDocLine = ({ size = 22 }: { size?: number }) => sv(<><path d="M6 3.5h8l4 4v13H6z" /><path d="M9 12h6M9 15.5h6" /></>, size);
export const IStar = ({ size = 22 }: { size?: number }) => sv(<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z" />, size);
export const IX = ({ size = 22 }: { size?: number }) => sv(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>, size);
export const ICheck = ({ size = 22 }: { size?: number }) => sv(<path d="M5 12.5l4.5 4.5L19 7.5" />, size);
export const ILock = ({ size = 22 }: { size?: number }) => sv(<><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>, size);
export const IChevDown = ({ size = 20 }: { size?: number }) => sv(<path d="M5 9l7 7 7-7" />, size);
export const IChevUp = ({ size = 20 }: { size?: number }) => sv(<path d="M5 15l7-7 7 7" />, size);
export const IChevRight = ({ size = 20 }: { size?: number }) => sv(<path d="M9 5l7 7-7 7" />, size);
