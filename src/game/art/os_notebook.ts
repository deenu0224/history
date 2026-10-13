/**
 * 손글씨 노트 / 증거 보드 소품: 종이 질감 타일, 연필 밑줄·표시, 압정, 끈, 색인 카드, 폴라로이드 틀.
 * 디지털 UI(차가운 슬레이트)와 대비되는 아날로그 톤(따뜻한 종이, 흑연, 절제된 붉은 잉크).
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { O, OSPAL, OS_OUTLINE } from './os_palette';

const sp = (g: Grid, a?: { x: number; y: number }): PixelSprite => sprite(g, a, OSPAL);

export const OS_NOTEBOOK_NINE_SLICE: Record<string, { left: number; right: number; top: number; bottom: number }> = {
  board_card: { left: 6, right: 6, top: 8, bottom: 6 },
  board_polaroid: { left: 8, right: 8, top: 8, bottom: 16 },
};

/** 한지 느낌 64×64 타일. 가장자리가 이어진다(wrap). 줄은 8px 간격의 아주 옅은 선. */
function paperTile(): PixelSprite {
  const N = 64;
  const g = new Grid(N, N, O.p0);
  const r = rng(404);
  g.speckle(r, O.p1, 0.07, 0, 0, N, N, undefined, true);
  // 한지 섬유: 짧은 가는 획
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    const len = 2 + Math.floor(r() * 4);
    const dx = r() < 0.5 ? 1 : 0;
    const dy = dx ? (r() < 0.5 ? 1 : 0) : 1;
    for (let k = 0; k < len; k++) g.setW(x + dx * k, y + dy * k, O.p1);
  }
  g.speckle(r, O.p2, 0.006, 0, 0, N, N, undefined, true);
  // 아주 옅은 가로 줄(8px)
  for (let y = 7; y < N; y += 8) for (let x = 0; x < N; x++) g.setW(x, y, (x * 3 + y) % 7 === 0 ? O.p2 : O.p1);
  return sp(g);
}

/** 연필 밑줄 40×5: 약간 흔들리는 선, 끝이 가늘어짐 */
function underline(kind: 0 | 1 | 2): PixelSprite {
  const W = 40, H = 6;
  const g = new Grid(W, H);
  const r = rng(90 + kind);
  const stroke = (y0: number, x0: number, x1: number, wob: number) => {
    let y = y0;
    for (let x = x0; x < x1; x++) {
      if (r() < wob) y += r() < 0.5 ? -1 : 1;
      y = Math.max(1, Math.min(H - 2, y));
      g.set(x, y, O.g1);
      if ((x + kind) % 3 === 0) g.set(x, y + 1, O.s3);
      if (x > x0 + 2 && x < x1 - 3 && r() < 0.7) g.set(x, y, O.g0);
    }
  };
  if (kind === 0) stroke(3, 1, 38, 0.12);
  else if (kind === 1) {
    stroke(2, 1, 37, 0.1);
    stroke(4, 3, 39, 0.1);
  } else {
    for (let x = 1; x < 39; x++) {
      const y = 3 + Math.round(Math.sin(x / 2.2) * 1.2);
      g.set(x, y, x % 7 < 5 ? O.g1 : O.g0);
      g.set(x, y + 1, O.s3);
    }
  }
  return sp(g);
}

function markCheck(red: boolean): PixelSprite {
  const g = new Grid(16, 16);
  const c = red ? O.r1 : O.g1, d = red ? O.r2 : O.g0, h = red ? O.r0 : O.k7;
  g.line(2, 8, 5, 12, c).line(3, 8, 6, 12, d);
  g.line(6, 12, 13, 2, c).line(7, 12, 14, 2, d);
  g.set(1, 7, h).set(14, 1, h).set(2, 7, h);
  return sp(g);
}
function markCircle(red: boolean): PixelSprite {
  const W = 24, H = 20;
  const g = new Grid(W, H);
  const c = red ? O.r1 : O.g1, d = red ? O.r2 : O.g0;
  // 손으로 그린 타원: 시작점과 끝점이 어긋나는 나선
  const pts: [number, number][] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2.15 + 0.6;
    const k = 1 - i * 0.004;
    pts.push([Math.round(12 + Math.cos(t) * 9.5 * k), Math.round(10 + Math.sin(t) * 7.2 * k + (i > 34 ? 0.6 : 0))]);
  }
  for (let i = 1; i < pts.length; i++) g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c);
  pts.forEach(([x, y], i) => {
    if (i % 6 === 3) g.set(x, y, d);
    if (i % 4 === 1) g.under(x + 1, y + 1, O.s3);
  });
  return sp(g);
}
function markCross(): PixelSprite {
  const g = new Grid(16, 16);
  g.line(3, 3, 12, 12, O.r1).line(4, 3, 12, 11, O.r2);
  g.line(12, 3, 3, 12, O.r1).line(11, 3, 3, 11, O.r2);
  g.set(2, 2, O.r0).set(13, 2, O.r0);
  return sp(g);
}

function pin(color: 'r' | 't' | 'a'): PixelSprite {
  const g = new Grid(10, 12);
  const [c0, c1, c2] = color === 'r' ? [O.r0, O.r1, O.r2] : color === 't' ? [O.t3, O.t2, O.t1] : [O.a4, O.a2, O.a1];
  g.ellipse(5, 4, 4, 4, c1);
  g.ellipse(4.5, 3.5, 2.5, 2.5, c0);
  g.set(3, 2, O.kw);
  g.hline(2, 6, 6, c2).set(7, 3, c2).set(7, 4, c2);
  g.rect(4, 8, 2, 3, O.k7);
  g.set(4, 11, O.k4);
  g.set(6, 7, O.s4).set(6, 8, O.s4);
  g.outline((n) => OS_OUTLINE[n]);
  return sp(g, { x: 5, y: 4 });
}

/** 가로 끈 한 토막(16×3). 가로로 이어 붙인다. */
function stringH(): PixelSprite {
  const g = new Grid(16, 3);
  g.hline(0, 1, 16, O.r1);
  for (let x = 0; x < 16; x += 2) g.set(x, 0, O.r0);
  for (let x = 1; x < 16; x += 2) g.set(x, 2, O.r2);
  g.set(0, 0, O.r0).set(1, 0, '.');
  return sp(g, { x: 8, y: 1 });
}
function knot(): PixelSprite {
  const g = new Grid(7, 7);
  g.ellipse(3.5, 3.5, 2.5, 2.5, O.r1);
  g.set(2, 2, O.r0).set(3, 2, O.r0).set(4, 4, O.r2).set(3, 5, O.r2);
  g.outline((n) => OS_OUTLINE[n]);
  return sp(g);
}

/** 색인 카드 9-slice 32×24. 윗부분 붉은 가로선(머리줄). 오른쪽·아래 약한 그림자 */
function indexCard(): PixelSprite {
  const W = 32, H = 24;
  const g = new Grid(W, H);
  g.rect(1, 1, W - 1, H - 1, O.s3); // 그림자
  g.rect(0, 0, W - 1, H - 1, O.p0);
  g.box(0, 0, W - 1, H - 1, O.p2);
  g.hline(1, 1, W - 3, O.kw);
  g.hline(1, 5, W - 3, O.r0);
  g.rect(1, 6, W - 3, H - 8, O.p0);
  g.hline(1, H - 3, W - 3, O.p1);
  return sp(g);
}
/** 폴라로이드 형 사진 틀 9-slice 48×56 — 가운데는 비워 둔다(사진을 아래에 깐다) */
function polaroid(): PixelSprite {
  const W = 48, H = 56;
  const g = new Grid(W, H);
  g.rect(1, 1, W - 1, H - 1, O.s3);
  g.rect(0, 0, W - 1, H - 1, O.p0);
  g.box(0, 0, W - 1, H - 1, O.p2);
  g.hline(1, 1, W - 3, O.kw);
  // 사진 창(투명)
  for (let y = 8; y < H - 16; y++) for (let x = 8; x < W - 9; x++) g.set(x, y, '.');
  // 창 둘레 안쪽 그늘
  g.hline(7, 7, W - 14, O.p3);
  g.vline(7, 7, H - 22, O.p3);
  g.hline(7, H - 17, W - 14, O.p1);
  g.vline(W - 9, 7, H - 22, O.p1);
  // 아래 여백: 연필 줄(캡션 자리)
  g.hline(10, H - 8, W - 21, O.p1);
  return sp(g);
}

export const OS_NOTEBOOK: Record<string, PixelSprite> = {
  note_paper_tile: paperTile(),
  note_underline_a: underline(0),
  note_underline_b: underline(1),
  note_underline_c: underline(2),
  note_check_pencil: markCheck(false),
  note_check_red: markCheck(true),
  note_circle_pencil: markCircle(false),
  note_circle_red: markCircle(true),
  note_cross_red: markCross(),
  board_pin_red: pin('r'),
  board_pin_teal: pin('t'),
  board_pin_amber: pin('a'),
  board_string_h: stringH(),
  board_string_knot: knot(),
  board_card: indexCard(),
  board_polaroid: polaroid(),
};
