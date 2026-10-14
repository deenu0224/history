import type { CSSProperties, ReactNode } from 'react';
import { SPRITES, toDataURL } from '../src/game/art';

/** 코드 정의 스프라이트(레지스트리 키) → <img>, 정수 배율 */
export function Spr({ k, scale = 1, style }: { k: string; scale?: number; style?: CSSProperties }) {
  const url = toDataURL(k, 0, 1);
  const s = SPRITES[k]!;
  return <img src={url} width={s.w * scale} height={s.h * scale} alt="" draggable={false} style={{ imageRendering: 'pixelated', display: 'block', ...style }} />;
}

export interface FrameOpts {
  sat?: number;
  sab?: number;
}

/** 휴대폰 화면 한 장. sat/sab = 안전 영역(상단 상태 표시줄 / 하단 홈 인디케이터) */
export function Screen({ w, h, sat = 47, sab = 34, bg, children, radius, style, noDevice, dark }: { dark?: boolean; w: number; h: number; sat?: number; sab?: number; bg?: string; children: ReactNode; radius?: number; style?: CSSProperties; noDevice?: boolean }) {
  return (
    <div
      className="screen"
      data-screen
      style={{ width: w, height: h, ['--sat' as string]: `${sat}px`, ['--sab' as string]: `${sab}px`, background: bg ?? 'var(--bg)', borderRadius: radius, ...style }}
    >
      {children}
      {noDevice ? null : <DeviceBar sat={sat} dark={dark} />}
      {noDevice ? null : <div className="homebar" style={{ bottom: Math.max(6, Math.round(sab / 4)) }} />}
    </div>
  );
}

export function DeviceBar({ sat, dark }: { sat: number; dark?: boolean }) {
  return (
    <div className="devbar" style={{ height: sat, color: dark ? 'rgba(30,24,16,.85)' : undefined }}>
      <span>9:41</span>
      <span className="icons">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x="0.5" y="0.5" width="22" height="11" rx="3.2" stroke="currentColor" opacity=".55" /><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" /><rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".55" /></svg>
      </span>
    </div>
  );
}

// ───────────── 아이콘(현대 UI, 2px 선) ─────────────
const sv = (d: ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);
export const IBack = () => sv(<path d="M15 5l-7 7 7 7" />);
export const IClose = () => sv(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>);
export const IGear = () => sv(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>);
export const ISearch = () => sv(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>);
export const IWarn = ({ size = 22 }: { size?: number }) => sv(<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5" /><path d="M12 17.6v.1" /></>, size);
export const IChevR = ({ size = 22 }: { size?: number }) => sv(<path d="M9 5l7 7-7 7" />, size);
export const IChevD = ({ size = 22 }: { size?: number }) => sv(<path d="M5 9l7 7 7-7" />, size);
export const IExt = ({ size = 18 }: { size?: number }) => sv(<><path d="M9 5H5v14h14v-4" /><path d="M13 5h6v6" /><path d="M19 5l-9 9" /></>, size);
export const IBan = ({ size = 22 }: { size?: number }) => sv(<><circle cx="12" cy="12" r="8.5" /><path d="M6 18L18 6" /></>, size);
export const IClear = () => sv(<><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>, 22);

/** 위쪽 앱 바(현대): ‹ 제목 … 오른쪽 */
export function AppBar({ title, right, onDark = true }: { title: ReactNode; right?: ReactNode; onDark?: boolean }) {
  return (
    <div style={{ paddingTop: 'var(--sat)', height: 'calc(var(--sat) + 56px)', display: 'flex', alignItems: 'flex-end', paddingBottom: 6, paddingLeft: 6, paddingRight: 10, color: onDark ? 'var(--text)' : '#1e2024' }}>
      <button className="icon-btn" aria-label="뒤로"><IBack /></button>
      <div className="t-h" style={{ flex: 1, paddingLeft: 2 }}>{title}</div>
      {right}
    </div>
  );
}

/** 시각 숫자(픽셀 글꼴은 장식에만) */
export const Clock = ({ children, color = 'var(--muted)' }: { children: ReactNode; color?: string }) => (
  <span className="pixel" style={{ fontSize: 16, lineHeight: '24px', letterSpacing: '.02em', color }}>{children}</span>
);

/** 도면·표 등에 쓰는 가는 구분 라벨 */
export const SecLabel = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="t-m" style={{ whiteSpace: 'nowrap' }}>{children}</span>
    <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    {right}
  </div>
);
