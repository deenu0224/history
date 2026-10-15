/**
 * 작은 아이콘. 현대 UI 의 선 아이콘(SVG, 2px)과 눈 4상태 픽셀 아이콘(24×24, 코드 정의 — 임시 스프라이트).
 * 눈 색: 열림 = amber, 닫힘 = teal(소실), 열리지 않음 = 점선 hanjiMuted. (UI_STYLE_GUIDE §5, ART_DIRECTION_V5)
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react';

const sv = (d: ReactNode, size = 24) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const IBack = () => sv(<path d="M15 5l-7 7 7 7" />);
export const IClose = () => sv(<><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>);
export const IGear = () => sv(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" /></>);
export const ISearch = ({ size = 24 }: { size?: number }) => sv(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>, size);
export const IWarn = ({ size = 22 }: { size?: number }) => sv(<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5" /><path d="M12 17.6v.1" /></>, size);
export const IChevR = ({ size = 22 }: { size?: number }) => sv(<path d="M9 5l7 7-7 7" />, size);
export const IChevL = ({ size = 22 }: { size?: number }) => sv(<path d="M15 5l-7 7 7 7" />, size);
export const IChevD = ({ size = 22 }: { size?: number }) => sv(<path d="M5 9l7 7 7-7" />, size);
export const IExt = ({ size = 18 }: { size?: number }) => sv(<><path d="M9 5H5v14h14v-4" /><path d="M13 5h6v6" /><path d="M19 5l-9 9" /></>, size);
export const IBan = ({ size = 22 }: { size?: number }) => sv(<><circle cx="12" cy="12" r="8.5" /><path d="M6 18L18 6" /></>, size);
export const IClear = ({ size = 22 }: { size?: number }) => sv(<><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>, size);
export const IMemory = () => sv(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>);
export const IChat = () => sv(<path d="M4 5.5h16v10.5H10l-5 4v-4H4z" />);
/** 그날의 방(도면) */
export const IPlan = () => sv(<><path d="M3.5 4.5h17v15h-17z" /><path d="M3.5 11h7v8.5" /><path d="M14 4.5v4h6.5" /><circle cx="15.5" cy="14.5" r="1.6" /></>);
export const IDoc = () => sv(<><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4" /><path d="M9 12h6M9 15.5h6" /></>);

// ───────────────────────── 눈 아이콘 ─────────────────────────
export type EyeLook = 'open' | 'unknown' | 'closed' | 'never';

type Grid = string[][];
const mk = (w: number, h: number): Grid => Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
const put = (g: Grid, x: number, y: number, c: string) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0]!.length) g[y]![x] = c;
};

const PAL: Record<string, string> = {
  o: '#e2a85c',
  f: '#1d1609',
  i: '#c98a3c',
  p: '#0b0a09',
  h: '#fff0c8',
  q: '#e2a85c',
  c: '#5c9a95',
  m: '#a39780',
};

const Q = ['.xxx.', 'x...x', '....x', '..xx.', '..x..', '.....', '..x..'];

function eyeRows(state: EyeLook): string[] {
  const W = 24;
  const g = mk(W, W);
  const cx = 11.5;
  const cy = 12;
  const a = 11;
  if (state === 'closed') {
    for (let x = 2; x <= 21; x++) {
      put(g, x, 11, 'c');
      put(g, x, 12, 'c');
    }
    put(g, 1, 12, 'c');
    put(g, 22, 12, 'c');
    for (const x of [6, 11, 12, 17]) {
      put(g, x, 13, 'c');
      put(g, x, 14, 'c');
    }
    return g.map((r) => r.join(''));
  }
  const bmax = 6.6;
  const inside = (x: number, y: number) => {
    const dx = Math.abs(x - cx) / a;
    if (dx > 1) return false;
    return Math.abs(y - cy) <= bmax * (1 - Math.pow(dx, 1.7));
  };
  const outline: [number, number][] = [];
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) outline.push([x, y]);
      else if (state !== 'never') put(g, x, y, 'f');
    }
  if (state === 'never') {
    outline.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    outline.forEach(([x, y], i) => {
      if (Math.floor(x / 2 + (y > cy ? 1 : 0)) % 2 === 0 || i % 3 === 0) put(g, x, y, 'm');
    });
    return g.map((r) => r.join(''));
  }
  const R = 4.6;
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y) || outline.some(([ox, oy]) => ox === x && oy === y)) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= R) put(g, x, y, d <= 2.2 ? 'p' : 'i');
    }
  put(g, 10, 10, 'h');
  for (const [x, y] of outline) put(g, x, y, 'o');
  if (state === 'unknown') Q.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'x' && put(g, 17 + rx, ry, 'q')));
  return g.map((r) => r.join(''));
}

const urls = new Map<string, string>();
function eyeUrl(state: EyeLook): string {
  const hit = urls.get(state);
  if (hit) return hit;
  const rows = eyeRows(state);
  const c = document.createElement('canvas');
  c.width = rows[0]!.length;
  c.height = rows.length;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = PAL[ch] ?? '#f0f';
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  const u = c.toDataURL('image/png');
  urls.set(state, u);
  return u;
}

export function EyeIcon({ look, size = 24, glow = false, label, style }: { look: EyeLook; size?: number; glow?: boolean; label?: string; style?: CSSProperties }) {
  const url = useMemo(() => eyeUrl(look), [look]);
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt={label ?? ''}
      draggable={false}
      style={{ imageRendering: 'pixelated', display: 'block', filter: glow ? 'drop-shadow(0 0 5px rgba(226,168,92,.6))' : undefined, ...style }}
    />
  );
}
