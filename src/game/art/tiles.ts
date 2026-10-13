/**
 * 32×32 타일 (3/4 탑다운, RPG 시점).
 * 관아 마당/담장/건물 정면/실내, 자연, 현대 연구실.
 * 모든 질감은 시드 고정 난수로 생성 → 결정적(deterministic).
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, rng, sprite } from './draw';

const T = 32;
const tile = (g: Grid): PixelSprite => sprite(g, { x: 16, y: 16 });

// ───────────────────────── 공통 헬퍼 ─────────────────────────

/** 이어지는(seamless) 점 흩뿌리기 */
function dust(g: Grid, seed: number, spec: [string, number][]): void {
  const r = rng(seed);
  for (const [ch, d] of spec) g.speckle(r, ch, d, 0, 0, g.w, g.h, undefined, true);
}

/** 기와 가로 띠(수키와 열). x0..x1, y0..y1 포함. */
function capBand(g: Grid, x0: number, x1: number, y0: number, y1: number): void {
  const colTone = [C.roof1, C.roof0, C.roof1, C.roof2];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) g.set(x, y, colTone[(x - x0 + 3) % 4]);
  // 골(암키와) 그림자선
  for (let x = x0; x <= x1; x++) if ((x - x0 + 3) % 4 === 3) for (let y = y0 + 2; y <= y1 - 2; y += 5) g.set(x, y, C.roof3);
  g.hline(x0, y0, x1 - x0 + 1, C.roof3); // 윗 윤곽
  g.hline(x0, y0 + 1, x1 - x0 + 1, C.roof0); // 하이라이트 능선
  g.hline(x0, y1 - 1, x1 - x0 + 1, C.roof2);
  g.hline(x0, y1, x1 - x0 + 1, C.roof3); // 아랫 윤곽
}
/** 기와 세로 띠 */
function capStrip(g: Grid, x0: number, x1: number, y0: number, y1: number): void {
  const rowTone = [C.roof1, C.roof0, C.roof1, C.roof2];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.set(x, y, rowTone[(y - y0 + 3) % 4]);
  g.vline(x0, y0, y1 - y0 + 1, C.roof3);
  g.vline(x1, y0, y1 - y0 + 1, C.roof3);
  g.vline(x0 + 1, y0, y1 - y0 + 1, C.roof0);
  g.vline(x1 - 1, y0, y1 - y0 + 1, C.roof2);
  for (let y = y0; y <= y1; y++) if ((y - y0 + 3) % 4 === 3) for (let x = x0 + 3; x <= x1 - 3; x += 4) g.set(x, y, C.roof3);
}

/** 돌담 면(토석담): 줄눈 돌쌓기. 가로로 32px 주기라 타일끼리 이어진다. */
function stoneFace(g: Grid, x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const r = rng(seed);
  g.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, C.soil2);
  const rowH = 5;
  const widthsFor = (): number[] => {
    const ws: number[] = [];
    let sum = 0;
    const opts = [6, 8, 5, 7];
    while (sum < T) {
      let w = opts[Math.floor(r() * opts.length)];
      if (sum + w > T - 4) w = T - sum;
      ws.push(w);
      sum += w;
    }
    return ws;
  };
  let y = y0 + 2;
  while (y + rowH - 1 <= y1 - 1) {
    const ws = widthsFor();
    let x = Math.floor(r() * T);
    for (const w of ws) {
      const tone = [C.stone0, C.stone1, C.soil0, C.stone1][Math.floor(r() * 4)];
      const sh = tone === C.soil0 ? C.soil1 : C.stone2;
      for (let j = 0; j < rowH - 1; j++)
        for (let i = 0; i < w - 1; i++) {
          const gx = x + i;
          const gxm = ((gx % T) + T) % T;
          if (gxm < x0 || gxm > x1) continue;
          let c = tone;
          if (j === rowH - 2 || i === w - 2) c = sh; // 아래/오른쪽 그늘
          if (j === 0 && i < w - 2) c = tone === C.stone0 ? C.hanji1 : C.stone0; // 윗 하이라이트
          g.set(gxm, y + j, c);
        }
      x += w;
    }
    y += rowH;
  }
  // 처마 그늘 + 하단
  g.hline(x0, y0, x1 - x0 + 1, C.stone3);
  g.hline(x0, y0 + 1, x1 - x0 + 1, C.soil3);
  g.hline(x0, y1, x1 - x0 + 1, C.soil3);
  g.hline(x0, y1 - 1, x1 - x0 + 1, C.soil2);
}

function ridgedRoof(g: Grid, y0: number, y1: number): void {
  // 지붕 사면: 수키와(볼록) 열
  const colTone = [C.roof1, C.roof0, C.roof1, C.roof2];
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < T; x++) {
      let c = colTone[x % 4];
      // 기와 겹침선: 열마다 위상 다른 가로 그림자
      if ((y + (x >> 2) * 3) % 8 === 0) c = x % 4 === 1 ? C.roof1 : C.roof3;
      g.set(x, y, c);
    }
}

// ───────────────────────── 마당/길/풀 ─────────────────────────

function madang(seed: number, variant: 'a' | 'b' | 'c'): PixelSprite {
  const g = new Grid(T, T, C.soil1);
  const r = rng(seed);
  dust(g, seed + 1, [
    [C.soil0, 0.1],
    [C.soil2, 0.09],
    [C.soil3, 0.02],
  ]);
  if (variant === 'b') {
    // 자갈
    for (let n = 0; n < 5; n++) {
      const x = 2 + Math.floor(r() * 27);
      const y = 2 + Math.floor(r() * 27);
      g.setW(x, y, C.stone1).setW(x + 1, y, C.stone1).setW(x, y - 1, C.stone0).setW(x + 1, y + 1, C.soil3).setW(x, y + 1, C.stone2);
    }
  }
  if (variant === 'c') {
    // 빗자루 쓴 자국 (완만한 곡선)
    for (const y0 of [6, 17, 27]) {
      const x0 = Math.floor(r() * 10);
      for (let i = 0; i < 18; i++) {
        const y = y0 + Math.round(Math.sin((i + x0) * 0.4) * 1);
        g.setW(x0 + i, y, C.soil2);
        if (i % 3 === 0) g.setW(x0 + i, y + 1, C.soil0);
      }
    }
    // 작은 갈라짐
    const cx = 20 + Math.floor(r() * 6);
    g.setW(cx, 10, C.soil3).setW(cx + 1, 11, C.soil3).setW(cx + 1, 12, C.soil3).setW(cx + 2, 13, C.soil3);
  }
  return tile(g);
}

function bakseok(): PixelSprite {
  // 박석: 불규칙 돌판 (wrap Voronoi)
  const sites: [number, number][] = [];
  const r = rng(77);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++) sites.push([i * 10.67 + 1 + r() * 7, j * 10.67 + 1 + r() * 7]);
  const owner = (x: number, y: number): number => {
    let best = 0;
    let bd = 1e9;
    sites.forEach(([sx, sy], idx) => {
      let dx = Math.abs(x - sx);
      let dy = Math.abs(y - sy);
      dx = Math.min(dx, T - dx);
      dy = Math.min(dy, T - dy);
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = idx;
      }
    });
    return best;
  };
  const ow: number[][] = Array.from({ length: T }, (_, y) => Array.from({ length: T }, (_, x) => owner(x, y)));
  const g = new Grid(T, T);
  const tones = [C.stone0, C.stone1, C.stone0, C.hanji2, C.stone1, C.stone0, C.stone1, C.hanji2, C.stone0];
  const at = (x: number, y: number) => ow[((y % T) + T) % T][((x % T) + T) % T];
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const o = ow[y][x];
      let c = tones[o];
      const right = at(x + 1, y) !== o;
      const below = at(x, y + 1) !== o;
      const left = at(x - 1, y) !== o;
      const up = at(x, y - 1) !== o;
      if (right || below) c = C.soil3; // 틈새 흙
      else if (left || up) c = c === C.stone0 ? C.hanji1 : C.stone0; // 하이라이트
      else if (at(x + 2, y + 1) !== o || at(x + 1, y + 2) !== o) c = c === C.stone1 ? C.stone2 : C.stone1; // 안쪽 그늘
      g.set(x, y, c);
    }
  dust(g, 78, [
    [C.stone2, 0.04],
    [C.stone0, 0.03],
  ]);
  return tile(g);
}

function grass(seed: number, flowers: boolean): PixelSprite {
  const g = new Grid(T, T, C.grass1);
  const r = rng(seed);
  dust(g, seed + 1, [
    [C.grass0, 0.1],
    [C.grass2, 0.12],
  ]);
  for (let n = 0; n < 16; n++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    g.setW(x, y, C.grass2).setW(x, y - 1, C.grass0).setW(x + 1, y - 2, C.grass0).setW(x, y + 1, C.grass3);
  }
  if (flowers) {
    for (let n = 0; n < 3; n++) {
      const x = 3 + Math.floor(r() * 26);
      const y = 3 + Math.floor(r() * 26);
      g.setW(x, y, C.hanji0).setW(x + 1, y, C.lamp1).setW(x, y + 1, C.grass3);
    }
  }
  return tile(g);
}

// ───────────────────────── 담장 ─────────────────────────
const CAP_Y0 = 2;
const CAP_Y1 = 15;
const FACE_Y0 = 16;
const STRIP_X0 = 9;
const STRIP_X1 = 22;

function wallPart(kind: 'h' | 'endL' | 'endR' | 'v' | 'tl' | 'tr' | 'bl' | 'br'): PixelSprite {
  const g = new Grid(T, T);
  const SEED = 31;
  const face = (x0: number, x1: number, y0 = FACE_Y0) => {
    stoneFace(g, x0, x1, y0, T - 1, SEED);
  };
  switch (kind) {
    case 'h':
      face(0, 31);
      capBand(g, 0, 31, CAP_Y0, CAP_Y1);
      break;
    case 'endL':
      face(STRIP_X0, 31);
      capBand(g, STRIP_X0, 31, CAP_Y0, CAP_Y1);
      g.vline(STRIP_X0, FACE_Y0, 16, C.soil3);
      break;
    case 'endR':
      face(0, STRIP_X1);
      capBand(g, 0, STRIP_X1, CAP_Y0, CAP_Y1);
      g.vline(STRIP_X1, FACE_Y0, 16, C.soil3);
      break;
    case 'v':
      capStrip(g, STRIP_X0, STRIP_X1, 0, 31);
      g.rect(STRIP_X1 + 1, 2, 3, 30, C.shade0);
      g.rect(STRIP_X1 + 1, 2, 1, 30, C.shade1);
      break;
    case 'tl':
      face(STRIP_X1 + 1, 31);
      capBand(g, STRIP_X0, 31, CAP_Y0, CAP_Y1);
      capStrip(g, STRIP_X0, STRIP_X1, CAP_Y0, 31);
      g.hline(STRIP_X0, CAP_Y0, STRIP_X1 - STRIP_X0 + 1, C.roof3);
      break;
    case 'tr':
      return wallPartFlip('tl');
    case 'bl':
      face(STRIP_X0, 31);
      capBand(g, STRIP_X0, 31, CAP_Y0, CAP_Y1);
      capStrip(g, STRIP_X0, STRIP_X1, 0, CAP_Y1);
      g.vline(STRIP_X0, FACE_Y0, 16, C.soil3);
      break;
    case 'br':
      return wallPartFlip('bl');
  }
  return tile(g);
}
function wallPartFlip(k: 'tl' | 'bl'): PixelSprite {
  const sp = wallPart(k);
  return { ...sp, frames: sp.frames.map((f) => f.map((row) => [...row].reverse().join(''))) };
}

// ───────────────────────── 건물 정면 ─────────────────────────

function roofBody(): PixelSprite {
  const g = new Grid(T, T);
  ridgedRoof(g, 0, T - 1);
  return tile(g);
}

function roofRidge(end: 'mid' | 'l' | 'r'): PixelSprite {
  const g = new Grid(T, T);
  ridgedRoof(g, 12, T - 1);
  // 용마루(적새 + 마루기와)
  const x0 = end === 'l' ? 4 : 0;
  const x1 = end === 'r' ? 27 : 31;
  for (let x = x0; x <= x1; x++) {
    g.set(x, 5, C.roof3);
    g.set(x, 6, C.roof0);
    g.set(x, 7, C.stone0);
    g.set(x, 8, x % 4 === 0 ? C.roof2 : C.roof1);
    g.set(x, 9, x % 4 === 0 ? C.roof3 : C.roof1);
    g.set(x, 10, C.roof2);
    g.set(x, 11, C.roof3);
  }
  // 적새 가로 줄눈
  for (let x = x0; x <= x1; x += 8) g.vline(x, 6, 5, C.roof3);
  if (end !== 'mid') {
    // 치미(용마루 끝 장식) — 약식
    const ex = end === 'l' ? 4 : 23;
    g.rect(ex, 1, 5, 11, C.roof1).rect(ex, 1, 5, 1, C.roof0).rect(ex + (end === 'l' ? 0 : 4), 1, 1, 11, C.roof0);
    g.box(ex, 1, 5, 11, C.roof3);
    g.set(ex + 2, 4, C.lamp2).set(ex + 2, 5, C.lamp3);
    // 양쪽 가장자리 투명 정리
    for (let y = 12; y < T; y++) for (let x = 0; x < (end === 'l' ? 4 : 0); x++) g.set(x, y, '.');
    for (let y = 12; y < T; y++) for (let x = end === 'r' ? 28 : 32; x < T; x++) g.set(x, y, '.');
  }
  return tile(g);
}

function roofEdge(side: 'l' | 'r'): PixelSprite {
  const g = new Grid(T, T);
  ridgedRoof(g, 0, T - 1);
  // 측면 박공 마감(막음 기와 + 풍판)
  g.rect(0, 0, 4, T, C.roof2);
  g.vline(0, 0, T, C.roof3);
  g.vline(1, 0, T, C.roof1);
  g.vline(3, 0, T, C.roof3);
  for (let y = 0; y < T; y += 4) g.set(2, y, C.roof3).set(1, y + 1, C.roof0);
  return side === 'l' ? tile(g) : tile(g.flipH());
}

function roofEave(side: 'm' | 'l' | 'r'): PixelSprite {
  const g = new Grid(T, T);
  const left = side === 'l' ? 3 : 0;
  const right = side === 'r' ? 28 : 31;
  ridgedRoof(g, 0, 20);
  // 막새(기와 끝 원판)
  for (let x = left; x <= right; x++) {
    for (let y = 21; y <= 22; y++) g.set(x, y, C.roof2);
  }
  for (let cx = 4 + (left > 0 ? left - 0 : 0); cx <= right - 3; cx += 8) {
    g.ellipse(cx, 25, 3, 3, C.roof0);
    g.ellipse(cx, 25, 2, 2, C.roof1);
    g.set(cx, 25, C.lamp3);
    g.ring(cx, 25, 3, 3, C.roof3);
    g.set(cx - 1, 23, C.hanji1).set(cx - 2, 24, C.hanji1);
  }
  // 처마 아래 그늘
  for (let x = left; x <= right; x++) {
    if (g.get(x, 28) === '.') g.set(x, 28, C.shade2);
    if (g.get(x, 29) === '.') g.set(x, 29, C.shade1);
    if (g.get(x, 30) === '.') g.set(x, 30, C.shade0);
  }
  for (let y = 0; y < 21; y++) for (let x = 0; x < left; x++) g.set(x, y, '.');
  for (let y = 0; y < 21; y++) for (let x = right + 1; x < T; x++) g.set(x, y, '.');
  if (side !== 'm') {
    // 추녀 쪽 가장자리 마감
    const ex = side === 'l' ? left : right;
    g.vline(ex, 0, 23, C.roof3);
    g.vline(ex + (side === 'l' ? 1 : -1), 0, 22, C.roof0);
  }
  return tile(g);
}

/** 서까래 + 창방 단청 띠 */
function eaveRafter(): PixelSprite {
  const g = new Grid(T, T, C.wood3);
  // 서까래 끝 (둥근 단면)
  for (let x = 0; x < T; x += 6) {
    g.rect(x, 0, 5, 13, C.wood1);
    g.vline(x, 0, 13, C.wood0);
    g.vline(x + 1, 0, 13, C.wood0);
    g.vline(x + 4, 0, 13, C.wood2);
    g.hline(x, 12, 5, C.wood3);
    // 서까래 끝 단청 점
    g.rect(x + 1, 10, 3, 2, C.green1).set(x + 2, 10, C.green0);
  }
  g.hline(0, 0, T, C.shade2);
  g.hline(0, 1, T, C.shade1);
  // 도리(가로 보)
  g.rect(0, 13, T, 5, C.ochre2);
  g.hline(0, 13, T, C.ochre3);
  g.hline(0, 14, T, C.ochre1);
  g.hline(0, 17, T, C.wood3);
  // 창방 단청 띠
  g.rect(0, 18, T, 11, C.green2);
  g.hline(0, 18, T, C.green3);
  g.hline(0, 19, T, C.green1);
  g.hline(0, 28, T, C.green3);
  for (let x = 0; x < T; x += 8) {
    // 휘 문양: 붉은 마름모 + 오커 점 + 푸른 가장자리
    g.stamp(
      [
        '   bb   ',
        '  brrb  ',
        ' brrrrb ',
        'brroorrb',
        ' brrrrb ',
        '  brrb  ',
        '   bb   ',
      ],
      { b: C.blue1, r: C.red1, o: C.ochre0 },
      x,
      20,
    );
    g.set(x + 3, 23, C.ochre0).set(x + 4, 23, C.ochre1);
    g.hline(x, 19, 2, C.hanji1);
    g.hline(x, 27, 2, C.hanji1);
  }
  // 아래 그늘
  g.rect(0, 29, T, 1, C.green3);
  g.rect(0, 30, T, 1, C.shade2);
  g.rect(0, 31, T, 1, C.shade1);
  return tile(g);
}

function plaster(seed: number): Grid {
  const g = new Grid(T, T, C.hanji1);
  dust(g, seed, [
    [C.hanji0, 0.08],
    [C.hanji2, 0.06],
  ]);
  return g;
}

function pillar(): PixelSprite {
  const g = plaster(5);
  g.rect(0, 0, T, 3, C.hanji2);
  g.hline(0, 3, T, C.hanji3);
  g.rect(0, 4, T, 2, C.shade0);
  // 주초(주춧돌)
  g.rect(8, 25, 16, 7, C.stone1);
  g.hline(8, 25, 16, C.stone0);
  g.hline(9, 26, 14, C.stone0);
  g.vline(8, 25, 7, C.stone3);
  g.vline(23, 25, 7, C.stone3);
  g.vline(22, 26, 6, C.stone2);
  g.hline(8, 31, 16, C.stone3);
  g.rect(9, 29, 13, 2, C.stone2);
  // 기둥(원기둥 음영)
  g.rect(12, 0, 8, 26, C.wood1);
  g.vline(12, 0, 26, C.wood3);
  g.vline(13, 0, 26, C.wood0);
  g.vline(14, 0, 26, C.wood0);
  g.vline(17, 0, 26, C.wood2);
  g.vline(18, 0, 26, C.wood2);
  g.vline(19, 0, 26, C.wood3);
  for (let y = 4; y < 24; y += 5) g.set(15, y, C.wood2).set(16, y + 1, C.wood0);
  // 기둥 아래 접합부
  g.hline(11, 25, 10, C.wood3);
  g.hline(10, 26, 12, C.shade1);
  return tile(g);
}

function hanjiLattice(g: Grid, x0: number, y0: number, w: number, h: number, lit: boolean): void {
  const paper = lit ? C.lamp0 : C.hanji0;
  const paperShade = lit ? C.lamp1 : C.hanji1;
  g.rect(x0, y0, w, h, paper);
  // 안쪽 그늘(살 그림자)
  g.rect(x0, y0, w, 1, paperShade);
  g.rect(x0, y0, 1, h, paperShade);
  if (lit) {
    g.rect(x0 + 2, y0 + 2, w - 4, h - 4, C.lamp0);
  }
}

function window_(lit: boolean): PixelSprite {
  const g = plaster(9);
  // 문틀
  g.rect(0, 0, T, 25, C.wood2);
  g.hline(0, 0, T, C.wood3);
  g.hline(0, 1, T, C.wood1);
  g.vline(0, 0, 25, C.wood3);
  g.vline(31, 0, 25, C.wood3);
  g.vline(1, 1, 24, C.wood1);
  // 한지 면
  hanjiLattice(g, 3, 3, 26, 20, lit);
  // 문살(격자)
  const lat = lit ? C.lamp3 : C.wood1;
  const latHi = lit ? C.lamp2 : C.wood0;
  for (let x = 3 + 4; x < 29; x += 5) g.vline(x, 3, 20, lat);
  for (let y = 3 + 5; y < 23; y += 5) g.hline(3, y, 26, lat);
  for (let x = 3 + 4; x < 29; x += 5) for (let y = 3 + 5; y < 23; y += 5) g.set(x, y, latHi);
  g.box(2, 2, 28, 22, C.wood3);
  g.hline(3, 2, 26, C.wood1);
  if (!lit) {
    // 종이 결/얼룩
      const r = rng(12);
    for (let n = 0; n < 8; n++) {
      const x = 4 + Math.floor(r() * 24);
      const y = 4 + Math.floor(r() * 18);
      if (g.get(x, y) === C.hanji0) g.set(x, y, C.hanji1);
    }
  } else {
    // 따뜻한 번짐
    g.rect(3, 3, 26, 1, C.lamp1);
  }
  // 머름(아래 판벽)
  g.rect(0, 25, T, 7, C.wood1);
  g.hline(0, 25, T, C.wood0);
  g.hline(0, 26, T, C.wood0);
  g.hline(0, 27, T, C.wood2);
  g.box(3, 28, 26, 4, C.wood2);
  g.hline(4, 29, 24, C.wood0);
  g.hline(0, 31, T, C.wood3);
  g.vline(0, 25, 7, C.wood3);
  g.vline(31, 25, 7, C.wood3);
  return tile(g);
}

function doorLeaf(g: Grid, x0: number, w: number, hand: 'l' | 'r'): void {
  g.rect(x0, 0, w, 31, C.wood2);
  hanjiLattice(g, x0 + 2, 2, w - 4, 20, false);
  for (let x = x0 + 2 + 3; x < x0 + w - 2; x += 4) g.vline(x, 2, 20, C.wood1);
  for (let y = 2 + 4; y < 22; y += 4) g.hline(x0 + 2, y, w - 4, C.wood1);
  g.box(x0 + 1, 1, w - 2, 22, C.wood3);
  // 하부 판문
  g.rect(x0 + 1, 24, w - 2, 7, C.wood1);
  g.box(x0 + 2, 25, w - 4, 5, C.wood2);
  g.hline(x0 + 3, 26, w - 6, C.wood0);
  // 손잡이(철제 고리)
  const hx = hand === 'l' ? x0 + w - 4 : x0 + 3;
  g.rect(hx, 14, 2, 2, C.ink2);
  g.set(hx, 14, C.stone1);
  g.vline(hx, 17, 3, C.ink1);
}
function door(): PixelSprite {
  const g = plaster(15);
  g.rect(0, 0, T, 32, C.wood3);
  doorLeaf(g, 1, 14, 'l');
  doorLeaf(g, 17, 14, 'r');
  g.vline(15, 0, 32, C.wood3);
  g.vline(16, 0, 32, C.wood3);
  g.hline(0, 31, T, C.wood3);
  g.hline(0, 0, T, C.wood3);
  g.hline(1, 1, 30, C.wood1);
  // 문턱
  g.hline(0, 30, T, C.wood0);
  return tile(g);
}

function doorInner(): PixelSprite {
  const g = new Grid(T, T, C.wood2);
  g.rect(0, 0, T, 4, C.wood2);
  g.hline(0, 0, T, C.wood1);
  g.hline(0, 3, T, C.wood3);
  // 미닫이 문판 2장 겹침
  g.rect(2, 4, 16, 24, C.hanji0);
  g.rect(14, 4, 16, 24, C.hanji1);
  for (const [px, pw, base] of [[2, 16, C.hanji0], [14, 16, C.hanji1]] as [number, number, string][]) {
    g.box(px, 4, pw, 24, C.wood1);
    for (let x = px + 3; x < px + pw - 1; x += 3) g.vline(x, 5, 22, base === C.hanji0 ? C.wood0 : C.hanji2);
    for (const y of [9, 22]) g.hline(px + 1, y, pw - 2, C.wood1);
  }
  g.vline(14, 4, 24, C.wood3);
  g.vline(15, 4, 24, C.wood1);
  // 손잡이 홈
  g.rect(24, 15, 3, 4, C.wood3);
  g.rect(25, 16, 1, 2, C.ink3);
  // 문턱/문지방
  g.rect(0, 28, T, 4, C.wood1);
  g.hline(0, 28, T, C.wood0);
  g.hline(0, 31, T, C.wood3);
  g.vline(0, 0, T, C.wood3);
  g.vline(31, 0, T, C.wood3);
  return tile(g);
}

function gateDoor(): PixelSprite {
  const g = new Grid(T, T, C.wood2);
  // 세로 판재
  for (let x = 0; x < T; x += 8) {
    g.rect(x, 0, 8, T, C.wood1);
    g.vline(x, 0, T, C.wood3);
    g.vline(x + 1, 0, T, C.wood0);
    g.vline(x + 6, 0, T, C.wood2);
    g.vline(x + 7, 0, T, C.wood2);
    for (let y = 3 + (x % 16); y < T; y += 11) g.set(x + 3, y, C.wood2).set(x + 4, y + 1, C.wood2);
  }
  // 철띠 + 징(문정)
  for (const y of [4, 24]) {
    g.rect(0, y, T, 4, C.ink1);
    g.hline(0, y, T, C.ink0);
    g.hline(0, y + 3, T, C.ink3);
    for (let x = 4; x < T; x += 8) g.rect(x - 1, y, 3, 3, C.ochre1).set(x - 1, y, C.ochre0).set(x + 1, y + 2, C.ochre3);
  }
  for (let y = 12; y < 22; y += 8)
    for (let x = 4; x < T; x += 8) g.set(x, y, C.ochre1).set(x - 1, y - 1, C.ochre0).set(x + 1, y + 1, C.ochre3);
  // 문고리
  g.ring(28, 16, 3, 3, C.ink2).ring(28, 16, 2, 2, C.stone2);
  g.rect(27, 12, 3, 2, C.ochre2);
  g.hline(0, 0, T, C.wood3);
  g.hline(0, 31, T, C.wood3);
  return tile(g);
}

// ───────────────────────── 바닥 ─────────────────────────

function plankFloor(base: string[], seam: string, hi: string, seed: number, plankH = 8): Grid {
  const g = new Grid(T, T);
  const r = rng(seed);
  const rows = T / plankH;
  for (let p = 0; p < rows; p++) {
    const y0 = p * plankH;
    // 판재 하나: 두 토막으로 나뉘며 이음매 위치가 열마다 다름
    const joint = 6 + Math.floor(r() * 20);
    const segs: [number, number, string][] = [
      [0, joint, base[Math.floor(r() * base.length)]],
      [joint, T - joint, base[Math.floor(r() * base.length)]],
    ];
    for (const [sx, sw, tone] of segs) {
      for (let j = 0; j < plankH; j++) for (let i = 0; i < sw; i++) g.setW(sx + i, y0 + j, tone);
      g.hline(sx, y0, sw, hi);
      for (let j = 1; j < plankH - 1; j++) g.setW(sx, y0 + j, seam);
      // 나뭇결
      for (let n = 0; n < 4; n++) {
        const gx = sx + 1 + Math.floor(r() * Math.max(1, sw - 6));
        const gy = y0 + 2 + Math.floor(r() * (plankH - 4));
        const len = 3 + Math.floor(r() * 5);
        for (let k = 0; k < len; k++) g.setW(gx + k, gy, base[1]);
      }
    }
    g.hline(0, y0 + plankH - 1, T, seam);
  }
  return g;
}

function maru(): PixelSprite {
  const g = plankFloor([C.wood0, C.wood1, C.wood0], C.wood2, C.hanji2, 41);
  dust(g, 42, [[C.wood2, 0.012]]);
  return tile(g);
}

function toenmaru(): PixelSprite {
  const g = plankFloor([C.wood0, C.wood1, C.wood0], C.wood2, C.hanji2, 43).crop(0, 0, T, T);
  // 하단 24px 만 상판, 이후 앞 가장자리 + 바닥 그림자
  for (let y = 18; y < T; y++) for (let x = 0; x < T; x++) g.set(x, y, C.soil1);
  const r = rng(44);
  g.speckle(r, C.soil2, 0.1, 0, 22, T, 10).speckle(r, C.soil0, 0.08, 0, 22, T, 10);
  g.rect(0, 18, T, 2, C.wood0);
  g.rect(0, 20, T, 5, C.wood1);
  g.hline(0, 18, T, C.hanji2);
  g.hline(0, 20, T, C.wood2);
  g.hline(0, 24, T, C.wood3);
  for (let x = 6; x < T; x += 12) g.vline(x, 21, 3, C.wood2);
  g.rect(0, 25, T, 2, C.shade2);
  g.rect(0, 27, T, 2, C.shade1);
  g.rect(0, 29, T, 2, C.shade0);
  return tile(g);
}

function seomdol(): PixelSprite {
  const g = new Grid(T, T, C.soil1);
  dust(g, 51, [
    [C.soil0, 0.1],
    [C.soil2, 0.09],
  ]);
  // 그림자
  g.rect(4, 24, 25, 3, C.shade1);
  g.rect(5, 27, 23, 2, C.shade0);
  // 윗면
  g.rect(3, 9, 26, 10, C.stone0);
  g.rect(3, 9, 26, 1, C.hanji1);
  g.rect(24, 10, 5, 9, C.stone1);
  g.rect(4, 17, 22, 2, C.stone1);
  g.set(9, 12, C.stone1).set(10, 12, C.stone1).set(17, 14, C.stone1).set(18, 14, C.stone1);
  // 앞면
  g.rect(3, 19, 26, 6, C.stone1);
  g.rect(3, 19, 26, 1, C.stone0);
  g.rect(3, 23, 26, 2, C.stone2);
  g.vline(16, 19, 6, C.stone2);
  // 윤곽
  g.box(3, 9, 26, 16, C.stone3);
  g.hline(3, 19, 26, C.stone2);
  return tile(g);
}

function stairs(): PixelSprite {
  const g = new Grid(T, T, C.soil1);
  dust(g, 55, [[C.soil2, 0.08]]);
  // 소맷돌(양옆)
  for (const x of [0, 28]) {
    g.rect(x, 0, 4, T, C.stone1);
    g.vline(x === 0 ? 0 : 31, 0, T, C.stone3);
    g.vline(x === 0 ? 3 : 28, 0, T, C.stone3);
    g.vline(x === 0 ? 1 : 29, 0, T, C.stone0);
  }
  // 층계 3단
  for (let i = 0; i < 3; i++) {
    const y = i * 10 + 1;
    g.rect(4, y, 24, 4, C.stone0);
    g.hline(4, y, 24, C.hanji1);
    g.rect(4, y + 4, 24, 5, C.stone1);
    g.hline(4, y + 8, 24, C.stone2);
    g.hline(4, y + 9, 24, C.shade1);
    g.vline(15, y + 4, 5, C.stone2);
    g.set(8, y + 1, C.stone1).set(20, y + 2, C.stone1);
  }
  return tile(g);
}

function ondol(): PixelSprite {
  const g = new Grid(T, T, C.wood0);
  dust(g, 61, [
    [C.wood1, 0.1],
    [C.ochre1, 0.07],
    [C.hanji2, 0.03],
  ]);
  // 장판지 이음
  g.vline(0, 0, T, C.wood2);
  g.vline(1, 0, T, C.ochre1);
  g.vline(16, 0, T, C.wood2);
  g.vline(17, 0, T, C.ochre1);
  // 기름 먹인 광택(사선)
  for (let i = 0; i < 9; i++) {
    g.setW(6 + i, 20 - i, C.ochre0);
    g.setW(7 + i, 20 - i, C.ochre1);
  }
  for (let i = 0; i < 6; i++) g.setW(21 + i, 31 - i, C.ochre1);
  // 가로 이음
  for (let y = 7; y < T; y += 16) g.hline(0, y, T, C.wood1);
  return tile(g);
}

function innerWall(): PixelSprite {
  const g = new Grid(T, T, C.hanji1);
  dust(g, 71, [
    [C.hanji0, 0.1],
    [C.hanji2, 0.07],
  ]);
  g.vline(15, 0, 26, C.hanji2);
  g.vline(16, 0, 26, C.hanji0);
  // 위 그늘/천장 보
  g.rect(0, 0, T, 4, C.wood2);
  g.hline(0, 0, T, C.wood1);
  g.hline(0, 3, T, C.wood3);
  g.rect(0, 4, T, 2, C.hanji2);
  g.rect(0, 6, T, 1, C.hanji1);
  // 굽도리(아랫부분)
  g.rect(0, 25, T, 7, C.wood1);
  g.hline(0, 25, T, C.wood0);
  g.hline(0, 26, T, C.wood0);
  g.hline(0, 31, T, C.wood3);
  g.box(2, 28, 28, 3, C.wood2);
  g.rect(0, 22, T, 3, C.hanji2);
  g.rect(0, 21, T, 1, C.hanji1);
  return tile(g);
}

// ───────────────────────── 현대 연구실 ─────────────────────────

function labFloorWood(): PixelSprite {
  const g = plankFloor([C.wood2, C.wood1, C.wood2, C.wood3], C.wood3, C.wood1, 81, 8);
  g.speckle(rng(82), C.wood3, 0.02, 0, 0, T, T, undefined, true);
  return tile(g);
}

function labCarpet(): PixelSprite {
  const g = new Grid(T, T, C.carpet1);
  const r = rng(91);
  g.speckle(r, C.carpet0, 0.18, 0, 0, T, T, undefined, true);
  g.speckle(r, C.carpet2, 0.14, 0, 0, T, T, undefined, true);
  // 직조 결
  for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < T; x += 4) g.set(x, y, C.carpet0);
  return tile(g);
}

function labWallBase(): Grid {
  const g = new Grid(T, T, C.navy2);
  g.rect(0, 0, T, 3, C.navy1);
  g.hline(0, 3, T, C.navy3);
  for (let x = 0; x < T; x += 16) g.vline(x, 4, 12, C.navy3);
  for (let x = 1; x < T; x += 16) g.vline(x, 4, 12, C.navy1);
  // 의자 레일
  g.rect(0, 16, T, 2, C.navy4);
  g.hline(0, 16, T, C.steel0);
  g.hline(0, 18, T, C.navy1);
  // 하부 패널
  g.rect(0, 19, T, 9, C.navy1);
  for (let x = 0; x < T; x += 16) {
    g.rect(x + 2, 20, 12, 7, C.navy2);
    g.hline(x + 2, 20, 12, C.navy3);
    g.vline(x + 2, 20, 7, C.navy3);
    g.hline(x + 2, 26, 12, C.navy0);
  }
  // 걸레받이
  g.rect(0, 28, T, 4, C.char1);
  g.hline(0, 28, T, C.char3);
  g.hline(0, 31, T, C.char0);
  return g;
}
function labWall(): PixelSprite {
  return tile(labWallBase());
}
function labWindow(): PixelSprite {
  const g = labWallBase();
  g.rect(3, 3, 26, 22, C.char2);
  g.box(3, 3, 26, 22, C.char0);
  g.hline(4, 4, 24, C.char3);
  // 밤 유리
  for (let y = 6; y < 22; y++) g.hline(6, y, 20, y < 12 ? C.night0 : C.night1);
  // 멀리 도시 실루엣
  const skyline: [number, number][] = [[6, 5], [9, 8], [12, 4], [15, 7], [18, 3], [21, 6], [24, 4]];
  for (const [x, h] of skyline) g.rect(x, 22 - h, 3, h, C.navy0);
  const lights: [number, number][] = [[10, 16], [13, 18], [19, 17], [22, 19], [7, 18]];
  for (const [x, y] of lights) g.set(x, y, C.citylight);
  g.set(16, 14, C.citylight);
  // 창틀 십자 + 반사
  g.vline(15, 6, 16, C.char2);
  g.vline(16, 6, 16, C.char1);
  g.hline(6, 13, 20, C.char2);
  g.line(8, 8, 11, 5, C.navy2).line(20, 12, 23, 9, C.navy2);
  // 창턱
  g.rect(2, 25, 28, 2, C.steel0);
  g.hline(2, 25, 28, C.steel1);
  g.hline(2, 27, 28, C.navy0);
  return tile(g);
}
function labDoor(): PixelSprite {
  const g = labWallBase();
  g.rect(0, 28, T, 4, C.char1);
  // 문틀
  g.rect(3, 0, 26, 32, C.wood3);
  g.rect(5, 2, 22, 30, C.wood2);
  g.hline(5, 2, 22, C.wood1);
  g.vline(5, 2, 30, C.wood1);
  // 패널
  g.box(8, 5, 16, 10, C.wood3);
  g.rect(9, 6, 14, 8, C.wood1);
  g.hline(9, 6, 14, C.wood0);
  g.box(8, 18, 16, 11, C.wood3);
  g.rect(9, 19, 14, 9, C.wood1);
  g.hline(9, 19, 14, C.wood0);
  g.hline(9, 27, 14, C.wood2);
  // 손잡이
  g.rect(22, 16, 3, 2, C.steel1).set(22, 16, C.steel3).set(24, 17, C.steel0);
  g.hline(3, 0, 26, C.wood3);
  g.hline(5, 31, 22, C.shade1);
  return tile(g);
}

// ───────────────────────── 레지스트리 ─────────────────────────
export const TILE_DEFS: Record<string, PixelSprite> = {
  // 마당/길/풀
  tile_madang_a: madang(101, 'a'),
  tile_madang_b: madang(102, 'b'),
  tile_madang_c: madang(103, 'c'),
  tile_bakseok: bakseok(),
  tile_grass_a: grass(111, false),
  tile_grass_b: grass(112, true),
  // 담장
  tile_wall_h: wallPart('h'),
  tile_wall_end_l: wallPart('endL'),
  tile_wall_end_r: wallPart('endR'),
  tile_wall_v: wallPart('v'),
  tile_wall_corner_tl: wallPart('tl'),
  tile_wall_corner_tr: wallPart('tr'),
  tile_wall_corner_bl: wallPart('bl'),
  tile_wall_corner_br: wallPart('br'),
  // 건물 정면
  tile_roof_body: roofBody(),
  tile_roof_ridge: roofRidge('mid'),
  tile_roof_ridge_l: roofRidge('l'),
  tile_roof_ridge_r: roofRidge('r'),
  tile_roof_edge_l: roofEdge('l'),
  tile_roof_edge_r: roofEdge('r'),
  tile_roof_eave: roofEave('m'),
  tile_roof_eave_l: roofEave('l'),
  tile_roof_eave_r: roofEave('r'),
  tile_eave_rafter: eaveRafter(),
  tile_pillar: pillar(),
  tile_window_hanji: window_(false),
  tile_window_hanji_lit: window_(true),
  tile_door_hanji: door(),
  tile_door_gate: gateDoor(),
  tile_maru: maru(),
  tile_toenmaru: toenmaru(),
  tile_seomdol: seomdol(),
  tile_stairs: stairs(),
  // 실내
  tile_ondol_floor: ondol(),
  tile_inner_wall: innerWall(),
  tile_door_inner: doorInner(),
  // 현대 연구실
  tile_lab_floor_wood: labFloorWood(),
  tile_lab_carpet: labCarpet(),
  tile_lab_wall: labWall(),
  tile_lab_window: labWindow(),
  tile_lab_door: labDoor(),
};
