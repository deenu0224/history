/**
 * 코드 기반 픽셀 드로잉 도구. 결과는 PixelSprite(문자 격자)로 굳는다.
 * 순수 함수 — DOM 불필요.
 */
import type { PixelSprite } from './pixel';
import { OUTLINE_OF, PALETTE } from './palettes';

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Grid {
  readonly w: number;
  readonly h: number;
  private c: string[][];

  constructor(w: number, h: number, fill = '.') {
    this.w = w;
    this.h = h;
    this.c = Array.from({ length: h }, () => Array<string>(w).fill(fill));
  }

  static from(rows: string[]): Grid {
    const g = new Grid(rows[0]?.length ?? 0, rows.length);
    rows.forEach((r, y) => [...r].forEach((ch, x) => (g.c[y][x] = ch)));
    return g;
  }

  clone(): Grid {
    const g = new Grid(this.w, this.h);
    g.c = this.c.map((r) => r.slice());
    return g;
  }

  inb(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): string {
    x = Math.floor(x);
    y = Math.floor(y);
    return this.inb(x, y) ? this.c[y][x] : '.';
  }
  set(x: number, y: number, ch: string): this {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.inb(x, y)) this.c[y][x] = ch;
    return this;
  }
  /** 가장자리가 이어지는(wrap) set — 타일링 텍스처용 */
  setW(x: number, y: number, ch: string): this {
    x = ((Math.floor(x) % this.w) + this.w) % this.w;
    y = ((Math.floor(y) % this.h) + this.h) % this.h;
    this.c[y][x] = ch;
    return this;
  }
  /** 비어있는 칸에만 */
  under(x: number, y: number, ch: string): this {
    if (this.get(x, y) === '.') this.set(x, y, ch);
    return this;
  }
  fill(ch: string): this {
    for (const r of this.c) r.fill(ch);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }
  box(x: number, y: number, w: number, h: number, ch: string): this {
    this.hline(x, y, w, ch).hline(x, y + h - 1, w, ch).vline(x, y, h, ch).vline(x + w - 1, y, h, ch);
    return this;
  }
  hline(x: number, y: number, len: number, ch: string): this {
    for (let i = 0; i < len; i++) this.set(x + i, y, ch);
    return this;
  }
  vline(x: number, y: number, len: number, ch: string): this {
    for (let i = 0; i < len; i++) this.set(x, y + i, ch);
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string): this {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, ch);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }
  /** 채운 타원 (cx,cy 중심, rx,ry 반지름) */
  ellipse(cx: number, cy: number, rx: number, ry: number, ch: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / (rx + 0.25);
        const dy = (y + 0.5 - cy) / (ry + 0.25);
        if (dx * dx + dy * dy <= 1) this.set(x, y, ch);
      }
    return this;
  }
  /** 타원 윤곽만 */
  ring(cx: number, cy: number, rx: number, ry: number, ch: string): this {
    const inside = (x: number, y: number) => {
      const dx = (x + 0.5 - cx) / (rx + 0.25);
      const dy = (y + 0.5 - cy) / (ry + 0.25);
      return dx * dx + dy * dy <= 1;
    };
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++)
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++)
        if (inside(x, y) && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1))) this.set(x, y, ch);
    return this;
  }
  /** 아스키 아트 도장. ' ' 와 '.' 는 건너뜀. map 에 없는 글자는 그대로 쓴다. */
  stamp(art: string[], map: Record<string, string>, x: number, y: number): this {
    art.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === ' ' || ch === '.') return;
        this.set(x + i, y + j, map[ch] ?? ch);
      }),
    );
    return this;
  }
  /** 다른 그리드를 얹는다('.' 제외) */
  paste(g: Grid, x: number, y: number): this {
    for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) if (g.c[j][i] !== '.') this.set(x + i, y + j, g.c[j][i]);
    return this;
  }
  /** 영역 내 무작위 점 흩뿌리기. only: 해당 글자 위에만. */
  speckle(r: () => number, ch: string, density: number, x = 0, y = 0, w = this.w, h = this.h, only?: string, wrap = false): this {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++)
        if (r() < density) {
          if (only !== undefined && this.get(x + i, y + j) !== only) continue;
          if (wrap) this.setW(x + i, y + j, ch);
          else this.set(x + i, y + j, ch);
        }
    return this;
  }
  replace(from: string, to: string): this {
    for (const r of this.c) for (let i = 0; i < r.length; i++) if (r[i] === from) r[i] = to;
    return this;
  }
  /** 좌우 반전 */
  flipH(): Grid {
    const g = new Grid(this.w, this.h);
    g.c = this.c.map((r) => r.slice().reverse());
    return g;
  }
  shift(dx: number, dy: number): Grid {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) g.set(x + dx, y + dy, this.c[y][x]);
    return g;
  }
  /** 영역 일부만 잘라낸 새 그리드 */
  crop(x: number, y: number, w: number, h: number): Grid {
    const g = new Grid(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.c[j][i] = this.get(x + i, y + j);
    return g;
  }
  /**
   * 외곽선: 투명 칸 중 4방향 이웃이 불투명인 곳에 outlineFor(이웃 글자) 색을 칠한다.
   * 재질별로 "같은 계열의 어두운 색"을 쓰기 위한 함수형 인터페이스.
   */
  outline(outlineFor: (neighbor: string) => string | undefined, diagonal = false): this {
    const marks: [number, number, string][] = [];
    const dirs = diagonal
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.c[y][x] !== '.') continue;
        for (const [dx, dy] of dirs) {
          const n = this.get(x + dx, y + dy);
          if (n !== '.') {
            const o = outlineFor(n);
            if (o) {
              marks.push([x, y, o]);
              break;
            }
          }
        }
      }
    for (const [x, y, o] of marks) this.c[y][x] = o;
    return this;
  }
  /** 단색 외곽선 */
  outlineAll(ch: string): this {
    return this.outline(() => ch);
  }
  rows(): string[] {
    return this.c.map((r) => r.join(''));
  }
  /** 사용된 글자 집합 */
  used(): Set<string> {
    const s = new Set<string>();
    for (const r of this.c) for (const ch of r) if (ch !== '.') s.add(ch);
    return s;
  }
}

/** 그리드(들)로 스프라이트를 만든다. 팔레트는 사용된 글자만 추려서 담는다. */
export function sprite(frames: Grid | Grid[], anchor?: { x: number; y: number }, palette: Record<string, string> = PALETTE): PixelSprite {
  const fs = Array.isArray(frames) ? frames : [frames];
  const used = new Set<string>();
  for (const f of fs) for (const ch of f.used()) used.add(ch);
  const pal: Record<string, string> = {};
  for (const ch of used) {
    const hex = palette[ch];
    if (hex) pal[ch] = hex;
  }
  const first = fs[0];
  return { w: first.w, h: first.h, palette: pal, frames: fs.map((f) => f.rows()), anchor: anchor ?? { x: Math.floor(first.w / 2), y: first.h - 1 } };
}

/** 스프라이트의 팔레트만 바꾼 변형 */
export function withPalette(sp: PixelSprite, palette: Record<string, string>): PixelSprite {
  return { ...sp, palette: { ...palette }, frames: sp.frames.map((f) => f.slice()) };
}

/** 재질별 어두운 계열색 외곽선 (순흑 사용 안 함) */
export function autoOutline(g: Grid, diagonal = false): Grid {
  return g.outline((n) => OUTLINE_OF[n], diagonal);
}
