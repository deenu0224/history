/**
 * 목업용 코드 정의 픽셀 아트(전부 임시 = SPRITE_META `temp` 후보).
 *  - 눈 아이콘 24×24 (A13): 열림 / 이름 모름 / 닫힘 / 열리지 않음 / 눈꺼풀 반쯤
 *  - 앞쪽 덮개(A2/A3 후보): 남색 소매 + 손 + 종이
 *  - 회전 아이콘 48×48
 */
import { useMemo, type CSSProperties } from 'react';

type Grid = string[][];
const mk = (w: number, h: number): Grid => Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
const inb = (g: Grid, x: number, y: number) => y >= 0 && y < g.length && x >= 0 && x < g[0]!.length;
const put = (g: Grid, x: number, y: number, c: string) => {
  if (inb(g, x, y)) g[y]![x] = c;
};

const urlCache = new Map<string, string>();
/** 문자 격자 → PNG data URL (1배, 정수 배율은 CSS 로) */
export function gridURL(rows: string[], pal: Record<string, string>, key: string): string {
  const hit = urlCache.get(key);
  if (hit) return hit;
  const h = rows.length;
  const w = rows[0]!.length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x]!;
      if (ch === '.') continue;
      ctx.fillStyle = pal[ch] ?? '#f0f';
      ctx.fillRect(x, y, 1, 1);
    }
  const u = c.toDataURL('image/png');
  urlCache.set(key, u);
  return u;
}

export function PixImg({ rows, pal, id, scale = 1, style }: { rows: string[]; pal: Record<string, string>; id: string; scale?: number; style?: CSSProperties }) {
  const url = useMemo(() => gridURL(rows, pal, id), [rows, pal, id]);
  const w = rows[0]!.length * scale;
  const h = rows.length * scale;
  return <img src={url} width={w} height={h} alt="" draggable={false} style={{ imageRendering: 'pixelated', display: 'block', ...style }} />;
}

// ───────────────────────── 눈 아이콘 ─────────────────────────
export type EyeState = 'open' | 'unknown' | 'closed' | 'never' | 'half';
type Tone = 'dark' | 'paper';

const EYE_PAL: Record<Tone, Record<string, string>> = {
  dark: { o: '#ffd27a', f: '#1d1609', i: '#e9a04a', p: '#14110f', h: '#fff0b8', q: '#ffd27a', c: '#6f8196', m: '#93a3b4', g: '#ffd27a55' },
  paper: { o: '#6b4a1c', f: '#e9dfc4', i: '#b87a22', p: '#2b1d0c', h: '#fff4d2', q: '#6b4a1c', c: '#6f8196', m: '#55616d', g: '#00000000' },
};

const Q = ['.xxx.', 'x...x', '....x', '..xx.', '..x..', '.....', '..x..'];

function eyeRows(state: EyeState): string[] {
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
  const bmax = state === 'half' ? 3.4 : 6.6;
  const inside = (x: number, y: number) => {
    const dx = Math.abs(x - cx) / a;
    if (dx > 1) return false;
    const hh = bmax * (1 - Math.pow(dx, 1.7));
    return Math.abs(y - cy) <= hh;
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
  // 홍채·동공
  const R = 4.6;
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y) || outline.some(([ox, oy]) => ox === x && oy === y)) continue;
      const d = Math.hypot(x - cx + 0.0, y - cy + 0.0);
      if (d <= R) put(g, x, y, d <= 2.2 ? 'p' : 'i');
    }
  if (state !== 'half') put(g, 10, 10, 'h');
  for (const [x, y] of outline) put(g, x, y, 'o');
  if (state === 'unknown') {
    Q.forEach((row, ry) => [...row].forEach((ch, rx) => ch === 'x' && put(g, 18 + rx - 1, 0 + ry - 0, 'q')));
  }
  return g.map((r) => r.join(''));
}

export function Eye({ state = 'open', tone = 'dark', size = 24, glow = false, style }: { state?: EyeState; tone?: Tone; size?: number; glow?: boolean; style?: CSSProperties }) {
  const rows = useMemo(() => eyeRows(state), [state]);
  const scale = Math.max(1, Math.round(size / 24));
  return (
    <span style={{ display: 'inline-block', width: size, height: size, filter: glow ? 'drop-shadow(0 0 5px rgba(255,210,122,.65))' : undefined, ...style }}>
      <PixImg rows={rows} pal={EYE_PAL[tone]} id={`eye-${state}-${tone}`} scale={scale} />
    </span>
  );
}

// ───────────────────────── 앞쪽 덮개: 소매 ─────────────────────────
const SLEEVE_PAL: Record<string, string> = {
  o: '#161f2e', // 윤곽
  a: '#3c5068', // blue2
  b: '#566f8c', // blue1
  c: '#7f9ab4', // blue0 하이라이트
  d: '#263648', // blue3 접힌 그림자
  l: '#efe5cb', // 안감(한지)
  m: '#c0b08a',
  s: '#d9a67c', // 피부
  t: '#f0cfa8',
  u: '#a8774f',
  v: '#6b4430',
  w: '#efe5cb', // 종이
  x: '#dccfae',
  y: '#988a68',
  z: '#14110f40', // 그림자
  k: '#25211e', // 먹선
};

/** 소매 + 손 + 종이: 오른쪽 아래 모서리에서 왼쪽 위로 들어온다. 56×40. */
function sleeveRows(): string[] {
  const W = 60;
  const H = 40;
  const g = mk(W, H);
  const solid = (x: number, y: number) => g[y]?.[x] !== '.' && g[y]?.[x] !== undefined;
  // 종이(손에 쥔 종이 한 장, 오른쪽 위로 비스듬히)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x - 8;
      const v = y - 4;
      if (u >= 0 && u < 26 && v >= 0 + Math.floor(u * 0.18) && v < 22 + Math.floor(u * 0.18)) put(g, x, y, (u + v) % 7 === 0 ? 'x' : 'w');
    }
  // 종이 위 글줄(먹)
  for (let r = 0; r < 4; r++) for (let u = 3; u < 20 - (r % 2) * 5; u++) if (u % 5 !== 0) put(g, 8 + u, 9 + r * 4 + Math.floor(u * 0.18), 'y');
  // 소매 몸통: 오른쪽 아래에서 위로 솟은 사다리꼴
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const yy = y - 14;
      if (yy < 0) continue;
      const left = 26 - Math.floor(yy * 0.55) - Math.floor(Math.max(0, 8 - yy) * 0); // 왼쪽 경계(아래로 갈수록 왼쪽으로 퍼짐)
      const topEdge = 14 + Math.floor(Math.max(0, x - 30) * 0.22);
      if (x >= left && y >= topEdge - (x < 40 ? 0 : 0)) {
        // 접힘
        const fold = (x + y * 1.3) % 11;
        const ch = fold < 1.3 ? 'd' : fold > 8.2 ? 'c' : fold > 5 ? 'b' : 'a';
        put(g, x, y, ch);
      }
    }
  // 소맷부리 안감(손목 쪽 가장자리의 밝은 띠)
  for (let x = 24; x < 46; x++) {
    const y0 = 13 + Math.floor((x - 24) * 0.12);
    put(g, x, y0, 'l');
    put(g, x, y0 + 1, 'l');
    put(g, x, y0 + 2, 'm');
  }
  // 손: 소맷부리 위쪽 왼편
  const hand: [number, number, string][] = [];
  for (let y = 5; y < 17; y++)
    for (let x = 16; x < 36; x++) {
      const d = Math.hypot((x - 26) / 10, (y - 12) / 5.2);
      if (d <= 1) hand.push([x, y, d > 0.78 ? 'u' : y < 10 ? 't' : 's']);
    }
  hand.forEach(([x, y, c]) => put(g, x, y, c));
  // 손가락 마디
  for (const fx of [18, 22, 26]) {
    put(g, fx, 11, 'v');
    put(g, fx + 1, 12, 'v');
  }
  // 윤곽
  const out: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y]![x] !== '.') continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) out.push([x, y]);
    }
  out.forEach(([x, y]) => put(g, x, y, 'o'));
  return g.map((r) => r.join(''));
}

export function Sleeve({ scale = 3, style, flip = false }: { scale?: number; style?: CSSProperties; flip?: boolean }) {
  const rows = useMemo(sleeveRows, []);
  return <PixImg rows={rows} pal={SLEEVE_PAL} id="sleeve-navy" scale={scale} style={{ transform: flip ? 'scaleX(-1)' : undefined, ...style }} />;
}

// ───────────────────────── 회전 아이콘(48×48) ─────────────────────────
function rotateRows(): string[] {
  const W = 48;
  const g = mk(W, W);
  // 휴대폰 (세로)
  for (let y = 8; y < 40; y++)
    for (let x = 17; x < 31; x++) {
      const edge = x < 19 || x >= 29 || y < 10 || y >= 38;
      put(g, x, y, edge ? 'o' : 'f');
    }
  for (let x = 22; x < 26; x++) put(g, x, 12, 'p');
  for (let x = 21; x < 27; x++) put(g, x, 35, 'p');
  // 화살 호(오른쪽 위에서 시계 방향)
  const arc = (r: number, from: number, to: number) => {
    for (let a = from; a <= to; a += 1.2) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(24 + r * Math.cos(rad));
      const y = Math.round(24 + r * Math.sin(rad));
      put(g, x, y, 'a');
      put(g, x + 1, y, 'a');
    }
  };
  arc(21, -62, 8);
  arc(21, 118, 188);
  // 화살촉
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [2, 2]].forEach(([dx, dy]) => put(g, 42 + dx - 2, 27 + dy! + 1, 'a'));
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, -1], [2, -1], [3, -1], [2, -2]].forEach(([dx, dy]) => put(g, 6 + dx! - 2, 21 + dy!, 'a'));
  return g.map((r) => r.join(''));
}
export function RotateIcon({ scale = 1, style }: { scale?: number; style?: CSSProperties }) {
  const rows = useMemo(rotateRows, []);
  return <PixImg rows={rows} pal={{ o: '#d99a3c', f: '#1a1612', p: '#d99a3c', a: '#e8dfc8' }} id="rotate" scale={scale} style={style} />;
}
