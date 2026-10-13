/**
 * 과거(조선) 오브젝트 + 자연물. 전부 코드 정의 픽셀.
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, autoOutline, rng, sprite } from './draw';

const softShadow = (g: Grid, cx: number, cy: number, rx: number, ry: number) => {
  g.ellipse(cx, cy, rx, ry, C.shade0);
  g.ellipse(cx, cy, rx - 2, Math.max(1, ry - 1), C.shade1);
};

/** 세로 대칭 단면 프로필로 항아리류 */
function vase(g: Grid, cx: number, profile: [number, number][], tones: [string, string, string, string]): void {
  for (const [y, hw] of profile) {
    const x0 = cx - hw;
    const x1 = cx + hw - 1;
    const wdt = x1 - x0 + 1;
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / Math.max(1, wdt - 1);
      const c = t < 0.22 ? tones[0] : t < 0.5 ? tones[1] : t < 0.8 ? tones[2] : tones[3];
      g.set(x, y, c);
    }
  }
}

// ───────────────────────── 서안 + 문방사우 ─────────────────────────
function seoan(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 28, 14, 3);
  // 다리/측판(ㄷ자 다리)
  g.rect(4, 20, 3, 9, C.wood2).rect(25, 20, 3, 9, C.wood2);
  g.vline(4, 20, 9, C.wood1).vline(25, 20, 9, C.wood1);
  // 앞 장식 판(풍혈 모양 투각)
  g.rect(7, 20, 18, 5, C.wood1);
  g.hline(7, 20, 18, C.wood0);
  g.ellipse(16, 25, 5, 2.4, '.');
  g.hline(11, 26, 10, C.wood3);
  g.rect(7, 25, 4, 1, C.wood2).rect(21, 25, 4, 1, C.wood2);
  // 상판 (윗면)
  g.rect(2, 9, 28, 11, C.wood0);
  g.hline(2, 9, 28, C.hanji2);
  g.rect(2, 18, 28, 2, C.wood1);
  g.hline(2, 19, 28, C.wood2);
  // 나뭇결
  const r = rng(7);
  g.speckle(r, C.wood1, 0.05, 3, 10, 26, 7, C.wood0);
  for (let i = 0; i < 4; i++) g.hline(4 + i * 6, 12 + (i % 3) * 2, 4, C.wood1);
  // 양끝 올림(반곡)
  g.set(2, 8, C.wood0).set(3, 8, C.wood0).set(29, 8, C.wood0).set(28, 8, C.wood0);
  g.set(2, 9, C.wood1).set(29, 9, C.wood1);
  // 종이
  g.rect(14, 10, 12, 7, C.hanji0);
  g.hline(14, 10, 12, C.hanji1);
  g.vline(25, 10, 7, C.hanji1);
  g.hline(16, 12, 6, C.ink1).hline(16, 14, 8, C.ink1).hline(17, 15, 3, C.ink0);
  g.set(22, 12, C.ink1).set(23, 14, C.ink2);
  // 문진
  g.rect(22, 15, 4, 2, C.stone1).hline(22, 15, 4, C.stone0).hline(22, 17, 4, C.stone3);
  // 벼루
  g.rect(4, 11, 9, 6, C.ink1);
  g.hline(4, 11, 9, C.ink0);
  g.vline(4, 11, 6, C.ink0);
  g.hline(4, 16, 9, C.ink3);
  g.rect(5, 12, 4, 3, C.ink3);
  g.set(5, 12, C.blue2).set(6, 12, C.blue2);
  g.rect(9, 13, 3, 2, C.ink2);
  g.set(10, 13, C.ink0);
  // 먹
  g.rect(10, 11, 3, 1, C.ink2).set(10, 11, C.ochre1);
  // 붓(붓대 + 붓털)
  g.line(13, 18, 24, 14, C.ochre1);
  g.line(13, 17, 23, 13, C.ochre0);
  g.rect(24, 12, 2, 2, C.ink2);
  g.set(26, 12, C.ink3);
  g.set(12, 18, C.wood3);
  autoOutline(g);
  return sprite(g, { x: 16, y: 28 });
}

// ───────────────────────── 서책/사초 ─────────────────────────

/** 선장본 한 권을 위에서 본 뚜껑 + 앞쪽 책배 */
function book(g: Grid, x: number, y: number, w: number, h: number, cover: [string, string, string]): void {
  // 윗면(표지)
  g.rect(x, y, w, h, cover[0]);
  g.hline(x, y, w, cover[1]);
  g.hline(x, y + h - 1, w, cover[2]);
  g.vline(x + w - 1, y, h, cover[2]);
  // 책등 쪽(왼쪽) 오침 실 + 구멍
  g.vline(x + 2, y + 1, h - 2, cover[2]);
  for (let i = 0; i < 4; i++) {
    const yy = y + 1 + Math.round((i * (h - 3)) / 3);
    g.set(x + 1, yy, C.red1).set(x + 2, yy, C.red0);
  }
  g.vline(x, y, h, cover[2]);
  // 제첨(제목 쪽지)
  g.rect(x + w - 6, y + 1, 4, Math.max(2, h - 3), C.hanji0);
  g.set(x + w - 5, y + 2, C.ink1);
  if (h > 5) g.set(x + w - 5, y + 4, C.ink1);
}
function bookEdge(g: Grid, x: number, y: number, w: number, hgt: number): void {
  // 책배(종이 단면)
  g.rect(x, y, w, hgt, C.hanji0);
  for (let j = 1; j < hgt; j += 2) g.hline(x, y + j, w, C.hanji1);
  g.vline(x + w - 1, y, hgt, C.hanji2);
  g.hline(x, y + hgt - 1, w, C.hanji2);
}

function booksStack(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 27, 13, 3);
  // 맨 아래 책
  bookEdge(g, 4, 21, 23, 4);
  book(g, 4, 15, 23, 6, [C.blue1, C.blue0, C.blue3]);
  // 가운데 (살짝 틀어서)
  bookEdge(g, 6, 15, 19, 1);
  book(g, 7, 10, 19, 5, [C.ochre1, C.ochre0, C.ochre3]);
  // 맨 위
  book(g, 10, 5, 15, 5, [C.green1, C.green0, C.green3]);
  g.rect(10, 10, 15, 1, C.hanji1);
  g.set(24, 6, C.red0);
  autoOutline(g);
  return sprite(g, { x: 16, y: 27 });
}

function sachoBundle(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 27, 13, 3);
  // 낱장 묶음(두꺼운 종이 더미)
  g.rect(5, 12, 22, 9, C.hanji0);
  g.hline(5, 12, 22, C.hanji1);
  g.rect(5, 21, 22, 5, C.hanji1);
  for (let y = 22; y < 26; y += 1) g.hline(5, y, 22, y % 2 ? C.hanji0 : C.hanji1);
  g.hline(5, 26, 22, C.hanji2);
  g.vline(26, 12, 14, C.hanji2);
  // 종이 가장자리 불규칙
  g.set(5, 12, '.').set(6, 12, C.hanji1).set(27, 20, '.');
  // 윗면 글씨 (붓줄 흔적)
  for (let j = 0; j < 4; j++) {
    g.hline(8, 14 + j * 2, 8 + ((j * 5) % 7), C.ink1);
    g.hline(21, 14 + j * 2, 3 + (j % 2), C.ink0);
  }
  // 묶은 끈
  g.vline(12, 11, 16, C.red1).vline(13, 11, 16, C.red0).vline(20, 11, 16, C.red1).vline(21, 11, 16, C.red0);
  g.hline(12, 17, 10, C.red1);
  // 매듭 + 늘어진 끈
  g.rect(15, 16, 4, 3, C.red0).rect(16, 17, 2, 1, C.red2);
  g.line(15, 19, 12, 25, C.red1).line(18, 19, 21, 24, C.red1);
  // 꼬리표
  g.rect(8, 21, 4, 6, C.hanji0);
  g.set(9, 22, C.ink1).set(9, 24, C.ink1).set(10, 23, C.ink1);
  g.vline(10, 19, 2, C.red1);
  autoOutline(g);
  return sprite(g, { x: 16, y: 27 });
}

// ───────────────────────── 서가/책장 ─────────────────────────
function bookshelf(): PixelSprite {
  const g = new Grid(32, 64);
  softShadow(g, 16, 61, 14, 3);
  // 몸체
  g.rect(1, 4, 30, 57, C.wood2);
  g.rect(3, 6, 26, 53, C.wood3);
  g.vline(1, 4, 57, C.wood1);
  g.vline(2, 4, 57, C.wood0);
  g.vline(30, 4, 57, C.wood3);
  // 상단 장식 지붕 
  g.rect(0, 1, 32, 4, C.wood1);
  g.hline(0, 1, 32, C.wood0);
  g.hline(0, 4, 32, C.wood3);
  g.rect(2, 0, 28, 1, C.wood2);
  // 받침
  g.rect(0, 59, 32, 4, C.wood1);
  g.hline(0, 59, 32, C.wood0);
  g.hline(0, 62, 32, C.wood3);
  // 칸 3개
  const covers: [string, string][] = [
    [C.blue1, C.blue0],
    [C.ochre1, C.ochre0],
    [C.green1, C.green0],
    [C.hanji1, C.hanji0],
    [C.red1, C.red0],
    [C.blue2, C.blue1],
  ];
  const r = rng(3);
  for (let s = 0; s < 3; s++) {
    const top = 7 + s * 17;
    // 선반 칸 안쪽(어둡게)
    g.rect(4, top, 24, 14, C.wood3);
    g.rect(4, top, 24, 1, C.shade2);
    // 책 더미들(책배가 보이게 눕혀 쌓음)
    let x = 5;
    while (x < 26) {
      const w = 5 + Math.floor(r() * 4);
      const cnt = 2 + Math.floor(r() * 3);
      const ww = Math.min(w, 27 - x);
      if (ww < 3) break;
      let y = top + 14;
      for (let k = 0; k < cnt; k++) {
        const cov = covers[Math.floor(r() * covers.length)];
        y -= 3;
        g.rect(x, y, ww, 1, cov[1]);
        g.rect(x, y + 1, ww, 1, cov[0]);
        g.hline(x, y + 2, ww, C.hanji0);
      }
      // 제첨 쪽지
      g.set(x + 1, y + 1, C.hanji0);
      x += ww + 1;
    }
    // 선반판
    g.rect(2, top + 14, 28, 3, C.wood1);
    g.hline(2, top + 14, 28, C.wood0);
    g.hline(2, top + 16, 28, C.wood3);
  }
  // 문 자물쇠 장식(아래 칸 아님) — 장식 철물
  g.rect(14, 56, 4, 2, C.ochre1).set(14, 56, C.ochre0);
  autoOutline(g);
  return sprite(g, { x: 16, y: 62 });
}

// ───────────────────────── 등잔 ─────────────────────────
function lampFrame(f: number): Grid {
  const g = new Grid(32, 32);
  // 빛 번짐
  const rr = [13, 14, 12][f];
  g.ellipse(16, 12, rr, rr - 1, C.glow1);
  g.ellipse(16, 12, rr - 5, rr - 6, C.glow0);
  // 그림자
  softShadow(g, 16, 30, 5, 1.5);
  // 받침(원반)
  g.ellipse(16, 28, 5, 2, C.wood1);
  g.hline(12, 27, 8, C.wood0);
  g.hline(12, 29, 8, C.wood3);
  // 기둥
  g.rect(15, 17, 3, 11, C.wood1);
  g.vline(15, 17, 11, C.wood0);
  g.vline(17, 17, 11, C.wood2);
  g.rect(14, 22, 5, 1, C.wood0).rect(14, 23, 5, 1, C.wood2);
  // 등잔 접시(도기)
  g.ellipse(16, 17, 5, 2, C.hanji1);
  g.hline(12, 16, 9, C.hanji0);
  g.hline(13, 19, 7, C.hanji3);
  g.set(11, 17, C.hanji2).set(21, 17, C.hanji2);
  // 기름
  g.hline(13, 17, 6, C.ochre2);
  // 심지
  g.set(17, 16, C.ink2);
  // 불꽃 (프레임마다 기울기/높이가 다름)
  const lean = [0, 1, -1][f];
  const fx = 17;
  g.set(fx, 16, C.lamp1);
  g.rect(fx - 1, 13, 2, 3, C.lamp1);
  g.set(fx, 14, C.lamp0).set(fx, 13, C.lamp0);
  g.set(fx - 1, 14, C.lamp2).set(fx + 1, 14, C.lamp2).set(fx - 2, 15, C.lamp3);
  g.set(fx + lean, 12, C.lamp1);
  g.set(fx + lean, 11, C.lamp2);
  if (f === 1) g.set(fx + lean, 10, C.lamp2);
  return autoOutlineKeepGlow(g);
}
/** 광원 번짐 색은 윤곽선 제외 */
function autoOutlineKeepGlow(g: Grid): Grid {
  const base = g.clone();
  // 글로우만 있는 칸은 투명으로 취급해서 외곽선을 만든다
  const solid = new Grid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const ch = base.get(x, y);
      if (ch !== '.' && ch !== C.glow0 && ch !== C.glow1 && ch !== C.shade0 && ch !== C.shade1 && ch !== C.shade2) solid.set(x, y, ch);
    }
  const marks = solid.clone();
  autoOutline(marks);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const m = marks.get(x, y);
      if (m !== '.' && solid.get(x, y) === '.') g.set(x, y, m);
    }
  return g;
}
function lamp(): PixelSprite {
  return sprite([lampFrame(0), lampFrame(1), lampFrame(2)], { x: 16, y: 29 });
}

// ───────────────────────── 병풍 ─────────────────────────
function folding(): PixelSprite {
  const g = new Grid(64, 48);
  softShadow(g, 32, 45, 29, 2.5);
  const panels = 5;
  const pw = 12;
  const x0 = 2;
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw;
    const top = 3 + (i % 2) * 2;
    const bottom = 42 - (i % 2 === 0 ? 0 : 0);
    const h = bottom - top;
    // 테두리 + 비단/종이
    g.rect(px, top, pw, h, C.wood2);
    g.rect(px + 1, top + 1, pw - 2, h - 2, C.hanji1);
    g.rect(px + 2, top + 2, pw - 4, h - 4, C.hanji0);
    g.hline(px, top, pw, C.wood1);
    g.vline(px, top, h, C.wood1);
    g.vline(px + pw - 1, top, h, C.wood3);
    g.hline(px, bottom - 1, pw, C.wood3);
    // 접히는 쪽 음영(홀짝)
    const shadeSide = i % 2 === 0 ? px + pw - 3 : px + 2;
    g.vline(shadeSide, top + 2, h - 4, C.hanji1);
    g.vline(shadeSide + (i % 2 === 0 ? 1 : -1), top + 2, h - 4, C.hanji1);
  }
  // 수묵 산수: 패널 전체를 가로지르는 산세 (원경 + 근경 + 안개)
  const L = panels * pw;
  const paper = (x: number, yy: number) => {
    const c = g.get(x, yy);
    return c === C.hanji0 || c === C.hanji1;
  };
  for (let x = 4; x < L - 3; x++) {
    const gx = x0 + x;
    const far = Math.round(17 + 5 * Math.sin(x * 0.19) + 3 * Math.sin(x * 0.07 + 1));
    const near = Math.round(28 + 4 * Math.sin(x * 0.27 + 2) + 2 * Math.sin(x * 0.11));
    for (let yy = far; yy < 36; yy++) if (paper(gx, yy)) g.set(gx, yy, yy < far + 2 ? C.hanji3 : C.hanji2);
    for (let yy = near; yy < 38; yy++) if (paper(gx, yy) || g.get(gx, yy) === C.hanji2 || g.get(gx, yy) === C.hanji3) g.set(gx, yy, yy < near + 2 ? C.ink0 : (x + yy) % 4 === 0 ? C.ink0 : C.ink1);
  }
  // 안개 띠
  for (let x = 4; x < L - 3; x++) {
    const gx = x0 + x;
    for (const yy of [24, 25]) if ((x + yy) % 9 < 6 && paper(gx, yy) === false && (g.get(gx, yy) === C.hanji2 || g.get(gx, yy) === C.hanji3)) g.set(gx, yy, C.hanji1);
  }
  // 해(달) + 소나무
  g.ellipse(14, 10, 3, 3, C.red2);
  g.ellipse(14, 10, 2, 2, C.red1);
  g.set(13, 9, C.red0);
  g.line(46, 38, 47, 22, C.ink1);
  g.ellipse(47, 20, 5, 2, C.ink1).ellipse(51, 15, 4, 2, C.ink1).ellipse(44, 24, 4, 1.5, C.ink1);
  g.speckle(rng(4), C.ink2, 0.2, 40, 12, 14, 14, C.ink1);
  // 새 두 마리
  g.set(30, 12, C.ink1).set(31, 11, C.ink1).set(32, 12, C.ink1);
  g.set(36, 15, C.ink1).set(37, 14, C.ink1).set(38, 15, C.ink1);
  // 바닥 접힘 그림자
  for (let i = 0; i < panels; i++) g.hline(x0 + i * pw, 41, pw, C.wood3);
  // 낙관
  g.rect(55, 36, 3, 3, C.red1).set(56, 37, C.red0);
  autoOutline(g);
  return sprite(g, { x: 32, y: 44 });
}

// ───────────────────────── 궤/항아리/화로 ─────────────────────────
function chest(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 28, 14, 3);
  // 뚜껑 윗면
  g.rect(3, 8, 26, 8, C.wood0);
  g.hline(3, 8, 26, C.hanji2);
  g.rect(24, 9, 5, 7, C.wood1);
  for (let i = 0; i < 3; i++) g.hline(5, 10 + i * 2, 15, C.wood1);
  // 뚜껑 앞면
  g.rect(3, 16, 26, 4, C.wood1);
  g.hline(3, 16, 26, C.wood0);
  // 몸통 앞면
  g.rect(3, 20, 26, 8, C.wood1);
  g.rect(3, 20, 26, 1, C.wood3);
  g.rect(3, 26, 26, 2, C.wood2);
  g.rect(26, 20, 3, 8, C.wood2);
  for (let x = 9; x < 24; x += 7) g.vline(x, 21, 5, C.wood2);
  // 철물: 모서리 + 띠
  for (const x of [3, 25]) {
    g.rect(x, 8, 4, 20, C.ink1);
    g.vline(x, 8, 20, C.ink0);
    g.set(x + 1, 11, C.ochre1).set(x + 1, 17, C.ochre1).set(x + 1, 24, C.ochre1);
    g.set(x + 2, 12, C.ochre0).set(x + 2, 18, C.ochre0);
  }
  g.rect(3, 19, 26, 1, C.ink1);
  g.hline(3, 19, 26, C.ink1);
  // 나비 자물쇠판
  g.stamp(
    [
      'o.o.o',
      'ooooo',
      '.ooo.',
      '.oko.',
      '.ooo.',
    ],
    { o: C.ochre1, k: C.ink3 },
    14,
    17,
  );
  g.set(15, 18, C.ochre0).set(16, 17, C.ochre0);
  autoOutline(g);
  return sprite(g, { x: 16, y: 28 });
}

function jar(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 29, 10, 2.5);
  const prof: [number, number][] = [
    [4, 5], [5, 7], [6, 6], [7, 5], [8, 5], [9, 6],
    [10, 8], [11, 10], [12, 11], [13, 12], [14, 12], [15, 13], [16, 13], [17, 13], [18, 13],
    [19, 12], [20, 12], [21, 11], [22, 10], [23, 9], [24, 8], [25, 7], [26, 7], [27, 7],
  ];
  vase(g, 16, prof, [C.wood0, C.wood1, C.wood2, C.wood3]);
  // 입구 테두리 + 속
  g.hline(10, 4, 12, C.wood2);
  g.hline(11, 4, 10, C.wood3);
  g.hline(12, 4, 8, C.shade2);
  // 윤기(유약 하이라이트)
  g.vline(8, 14, 5, C.ochre0).vline(9, 13, 3, C.hanji2);
  g.set(7, 16, C.wood0).set(7, 17, C.wood0);
  // 몸통 띠 문양
  for (let x = 6; x < 26; x++) if (g.get(x, 10) !== '.') g.set(x, 10, C.wood3);
  // 얼룩
  g.speckle(rng(9), C.wood3, 0.06, 5, 12, 22, 12);
  // 잿빛 흙 묻음
  g.hline(10, 27, 12, C.wood3);
  autoOutline(g);
  return sprite(g, { x: 16, y: 29 });
}

function brazierFrame(f: number): Grid {
  const g = new Grid(32, 32);
  const r = rng(40 + f);
  // 열기 번짐
  g.ellipse(16, 14, 12, 8, C.glow1);
  softShadow(g, 16, 29, 11, 2);
  // 다리
  g.rect(8, 25, 3, 4, C.ink1).rect(21, 25, 3, 4, C.ink1).rect(15, 26, 3, 3, C.ink1);
  // 몸통(오목한 그릇)
  g.ellipse(16, 21, 11, 6, C.ink1);
  g.ellipse(16, 20, 11, 5, C.ink0);
  g.hline(8, 24, 16, C.ink2);
  // 입구(재)
  g.ellipse(16, 17, 11, 5, C.stone3);
  g.ellipse(16, 17, 9.5, 4, C.stone1);
  // 숯불
  g.ellipse(16, 17, 8, 3, C.stone2);
  const coals: [number, number][] = [
    [10, 17], [12, 16], [14, 18], [16, 16], [18, 18], [20, 16], [21, 17], [13, 15], [17, 15], [15, 17],
  ];
  coals.forEach(([x, y], i) => {
    const hot = (i + f) % 3;
    g.set(x, y, hot === 0 ? C.lamp1 : hot === 1 ? C.red0 : C.red1);
    g.set(x + 1, y, hot === 0 ? C.lamp2 : C.red2);
  });
  g.speckle(r, C.stone1, 0.15, 9, 15, 14, 5, C.stone2);
  // 림 하이라이트
  g.hline(8, 15, 3, C.stone0).hline(22, 17, 2, C.stone2);
  // 손잡이 고리
  g.ring(5, 20, 2, 2, C.ink2).ring(27, 20, 2, 2, C.ink2);
  // 불씨 튀김
  if (f === 1) g.set(15, 12, C.lamp1).set(19, 11, C.lamp2);
  else g.set(13, 11, C.lamp2).set(17, 10, C.lamp1);
  return autoOutlineKeepGlow(g);
}
function brazier(): PixelSprite {
  return sprite([brazierFrame(0), brazierFrame(1)], { x: 16, y: 29 });
}

// ───────────────────────── 거문고 (임시) ─────────────────────────
/**
 * TEMP: 거문고 실물 고증 전 임시 도상. 6현·16괘의 긴 현악기 형태만 암시한다.
 * 정확한 비례/문양/괘 배치/술대 등은 검증된 참고자료가 도착한 뒤 교체한다.
 */
function geomungoTemp(): PixelSprite {
  const W = 96;
  const g = new Grid(W, 16);
  softShadow(g, 48, 14, 44, 1.5);
  // 몸통: 어두운 목재, 오른쪽이 약간 좁아짐
  for (let x = 2; x < W - 2; x++) {
    const t = x / W;
    const top = 2 + Math.round(t * 1.5);
    const bot = 13 - Math.round(t * 1.5);
    for (let y = top; y <= bot; y++) {
      const rel = (y - top) / Math.max(1, bot - top);
      g.set(x, y, rel < 0.15 ? C.wood1 : rel < 0.5 ? C.wood2 : C.wood3);
    }
  }
  g.rect(0, 3, 3, 10, C.wood3).set(0, 3, C.wood2);
  g.rect(W - 3, 4, 3, 8, C.wood3);
  // 괘(16개 암시): 왼쪽 → 오른쪽 일정 간격 받침
  for (let i = 0; i < 16; i++) {
    const fx = 10 + i * 3 + Math.floor(i / 6);
    g.rect(fx, 3, 2, 8, C.wood0);
    g.vline(fx, 3, 8, C.hanji2);
    g.vline(fx + 1, 3, 8, C.wood2);
  }
  // 현 6줄(가는 선, 줄마다 밝기 교차)
  for (let i = 0; i < 6; i++) g.hline(4, 4 + i, W - 8, i % 2 ? C.hanji2 : C.hanji1);
  // 현침/돌괘 위치 포인트
  g.rect(72, 3, 2, 9, C.ink1);
  g.rect(6, 3, 2, 9, C.ink1);
  // 현 매듭 끝
  for (let i = 0; i < 6; i++) g.set(W - 5, 4 + i, C.red1);
  // 임시 표식(빨간 모서리 점) — 개발 중에 TEMP임을 알아보게
  g.set(1, 1, C.red0).set(2, 1, C.red0).set(1, 2, C.red0);
  autoOutline(g);
  return sprite(g, { x: 48, y: 13 });
}

// ───────────────────────── 현판/우물 ─────────────────────────
function plaque(): PixelSprite {
  const g = new Grid(64, 24);
  // 걸이 끈
  g.vline(10, 0, 4, C.ink0).vline(53, 0, 4, C.ink0);
  g.set(9, 0, C.ink1).set(54, 0, C.ink1);
  // 본판
  g.rect(2, 4, 60, 18, C.wood3);
  g.rect(3, 5, 58, 16, C.wood2);
  g.rect(5, 7, 54, 12, C.ink2);
  g.box(5, 7, 54, 12, C.ochre2);
  g.hline(6, 8, 52, C.ink1);
  g.hline(2, 4, 60, C.wood1);
  g.hline(3, 5, 58, C.wood1);
  g.hline(2, 21, 60, C.wood3);
  // 임시 글자(실제 한자 아님: 획 조합 자리표시)
  const r = rng(88);
  for (let c = 0; c < 3; c++) {
    const gx = 12 + c * 15;
    const gy = 9;
    for (let k = 0; k < 5; k++) {
      const horiz = r() < 0.5;
      const len = 4 + Math.floor(r() * 5);
      const sx = gx + Math.floor(r() * 4);
      const sy = gy + Math.floor(r() * 7);
      if (horiz) g.hline(sx, sy, len, C.ochre0);
      else g.vline(sx, sy, Math.min(len, gy + 8 - sy), C.ochre0);
    }
    g.vline(gx + 5, gy, 8, C.ochre0);
    g.hline(gx + 1, gy + 4, 9, C.ochre1);
  }
  // 모서리 철물
  for (const [x, y] of [[3, 5], [60, 5], [3, 20], [60, 20]]) g.set(x, y, C.ochre1);
  autoOutline(g);
  g.set(8, 0, '.'); // 매듭 위 투명 유지
  return sprite(g, { x: 32, y: 22 });
}

function well(): PixelSprite {
  const g = new Grid(32, 40);
  softShadow(g, 16, 37, 14, 3);
  // 우물 몸통(돌 원통)
  g.ellipse(16, 30, 13, 6, C.stone2);
  g.rect(3, 22, 26, 8, C.stone1);
  // 돌 쌓기 결
  for (let y = 24; y < 31; y += 3) {
    g.hline(3, y, 26, C.stone2);
    const off = (y / 3) % 2 ? 0 : 4;
    for (let x = 3 + off; x < 29; x += 8) g.vline(x, y, 3, C.stone2);
  }
  g.vline(3, 22, 8, C.stone0).vline(4, 22, 8, C.stone0);
  g.vline(27, 22, 8, C.stone3).vline(28, 22, 8, C.stone3);
  g.ellipse(16, 30, 13, 6, '.');
  g.ellipse(16, 29, 13, 5, C.stone1);
  g.rect(3, 24, 26, 5, C.stone1);
  for (let y = 25; y < 31; y += 3) g.hline(3, y, 26, C.stone2);
  // 윗 테두리
  g.ellipse(16, 22, 13, 6, C.stone0);
  g.ellipse(16, 22, 10, 4, C.stone3);
  g.ellipse(16, 23, 9, 3, C.blue3);
  g.ellipse(16, 23, 6, 2, C.blue2);
  g.hline(13, 22, 5, C.blue1).set(14, 22, C.blue0);
  g.hline(5, 18, 3, C.hanji1).hline(24, 20, 2, C.stone0);
  // 우물 틀(기둥+가로대)
  g.rect(4, 4, 3, 22, C.wood2).vline(4, 4, 22, C.wood1).vline(6, 4, 22, C.wood3);
  g.rect(25, 4, 3, 22, C.wood2).vline(25, 4, 22, C.wood1).vline(27, 4, 22, C.wood3);
  g.rect(3, 3, 26, 3, C.wood1).hline(3, 3, 26, C.wood0).hline(3, 5, 26, C.wood3);
  // 도르래 + 줄 + 두레박
  g.ring(16, 8, 3, 3, C.ink1).set(16, 8, C.ink2);
  g.vline(16, 11, 7, C.ochre2);
  g.rect(13, 18, 7, 5, C.wood1).hline(13, 18, 7, C.wood0).hline(13, 22, 7, C.wood3).vline(13, 18, 5, C.wood0);
  g.hline(13, 20, 7, C.ink1);
  autoOutline(g);
  return sprite(g, { x: 16, y: 36 });
}

// ───────────────────────── 자연: 소나무, 풀, 돌 ─────────────────────────
function pine(): PixelSprite {
  const g = new Grid(64, 64);
  softShadow(g, 32, 60, 20, 4);
  // 줄기: 아래가 굵고 위로 가늘며 살짝 휘어 올라감
  const r = rng(61);
  for (let y = 61; y >= 16; y--) {
    const t = (61 - y) / 45;
    const w = Math.round(8 - t * 4);
    const x0 = 28 + Math.round(Math.sin(t * 3.2) * 2.5) + (t > 0.5 ? 1 : 0);
    for (let i = 0; i < w; i++) {
      const c = i === 0 ? C.wood1 : i === w - 1 ? C.wood3 : i < w * 0.45 ? C.wood1 : C.wood2;
      g.set(x0 + i, y, c);
    }
    // 거북등 껍질
    if (y % 3 === 0) for (let i = 1; i < w - 1; i++) if (r() < 0.45) g.set(x0 + i, y, C.wood3);
    if (y % 4 === 1) for (let i = 1; i < w - 2; i++) if (r() < 0.3) g.set(x0 + i, y, C.wood0);
  }
  // 뿌리 퍼짐
  g.hline(24, 60, 4, C.wood2).hline(25, 61, 5, C.wood2).hline(35, 60, 5, C.wood3).hline(34, 61, 6, C.wood3);
  g.set(24, 61, C.wood3).set(40, 61, C.wood3);
  // 가지
  g.line(30, 44, 16, 38, C.wood2).line(31, 45, 17, 39, C.wood3);
  g.line(35, 34, 51, 29, C.wood2).line(35, 35, 50, 30, C.wood3);
  g.line(30, 26, 14, 22, C.wood2).line(31, 27, 15, 23, C.wood3);
  g.line(35, 22, 50, 15, C.wood2);
  // 솔잎 군 (납작한 층운 모양)
  const clump = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
    const rr = rng(seed);
    const cl = new Grid(64, 64);
    cl.ellipse(cx, cy, rx, ry, C.grass2);
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      if (rr() < 0.6) cl.set(x, cy - ry - 1, C.grass2);
      if (rr() < 0.45) cl.set(x, cy + ry, C.grass2);
      if (rr() < 0.3) cl.set(x, cy + ry + 1, C.grass3);
    }
    for (let y = cy - ry - 1; y < cy; y++)
      for (let x = cx - rx; x <= cx + rx; x++) if (cl.get(x, y) !== '.' && (x - cx) * 0.5 + (y - cy) * 1.2 < -ry * 0.3) cl.set(x, y, C.grass1);
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++)
      for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
        const c = cl.get(x, y);
        if (c === '.') continue;
        if ((x * 3 + y * 5) % 7 === 0) cl.set(x, y, c === C.grass1 ? C.grass0 : C.grass3);
        if ((x + y * 2) % 9 === 0) cl.set(x + 1, y, c === C.grass1 ? C.grass0 : C.grass3);
      }
    for (let y = cy + Math.floor(ry * 0.3); y <= cy + ry + 1; y++)
      for (let x = cx - rx - 1; x <= cx + rx + 1; x++) if (cl.get(x, y) !== '.' && (x + y) % 2 === 0) cl.set(x, y, C.grass3);
    g.paste(cl, 0, 0);
  };
  clump(14, 22, 11, 5, 2);
  clump(52, 15, 10, 5, 3);
  clump(14, 38, 12, 5, 4);
  clump(52, 29, 11, 5, 6);
  clump(32, 12, 13, 6, 1);
  clump(34, 28, 12, 5, 5);
  clump(35, 44, 13, 5, 7);
  autoOutline(g);
  return sprite(g, { x: 32, y: 61 });
}

function rock(variant: 'a' | 'b'): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 27, 12, 3);
  const poly =
    variant === 'a'
      ? ([[5, 25], [4, 18], [8, 11], [14, 7], [21, 9], [26, 15], [27, 23], [22, 26]] as [number, number][])
      : ([[8, 26], [6, 21], [9, 16], [15, 14], [20, 17], [24, 22], [22, 26]] as [number, number][]);
  // 다각형 채움(스캔라인)
  const inside = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const cx = variant === 'a' ? 16 : 15;
  const cy = variant === 'a' ? 16 : 20;
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      if (!inside(x + 0.5, y + 0.5)) continue;
      // 광원: 좌상단
      const d = (x - cx) * 0.7 + (y - cy) * 1.0;
      g.set(x, y, d < -6 ? C.stone0 : d < -1 ? C.stone1 : d < 5 ? C.stone2 : C.stone3);
    }
  // 모서리 면 구분선/균열/이끼
  if (variant === 'a') {
    g.line(14, 8, 12, 16, C.stone2).line(12, 16, 15, 22, C.stone3).line(21, 10, 20, 15, C.stone2);
    g.speckle(rng(5), C.grass1, 0.4, 7, 12, 8, 3, C.stone1);
  } else {
    g.line(15, 15, 14, 21, C.stone2).line(19, 18, 21, 23, C.stone3);
    g.speckle(rng(6), C.grass1, 0.4, 10, 16, 8, 3, C.stone1);
  }
  g.speckle(rng(8), C.stone3, 0.04, 4, 8, 24, 20, C.stone1);
  autoOutline(g);
  return sprite(g, { x: 16, y: 27 });
}

function grassTuft(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 27, 9, 2);
  const blades: [number, number, number, number][] = [
    [16, 27, 16, 11], [14, 27, 10, 14], [18, 27, 23, 13], [12, 27, 7, 19], [20, 27, 26, 18],
    [15, 27, 13, 9], [17, 27, 19, 10],
  ];
  blades.forEach(([x0, y0, x1, y1], i) => {
    g.line(x0, y0, x1, y1, i % 3 === 0 ? C.grass0 : i % 3 === 1 ? C.grass1 : C.grass2);
    g.line(x0 + 1, y0, x1 + 1, y1 + 1, C.grass3);
  });
  g.set(16, 10, C.grass0).set(10, 13, C.grass0).set(23, 12, C.grass0);
  g.rect(11, 26, 11, 2, C.grass3);
  g.speckle(rng(2), C.grass2, 0.4, 10, 24, 12, 3);
  autoOutline(g);
  return sprite(g, { x: 16, y: 27 });
}

export const PAST_OBJECTS: Record<string, PixelSprite> = {
  obj_seoan: seoan(),
  obj_books_stack: booksStack(),
  obj_bookshelf: bookshelf(),
  obj_sacho_bundle: sachoBundle(),
  obj_lamp: lamp(),
  obj_folding_screen: folding(),
  obj_chest: chest(),
  obj_jar: jar(),
  obj_brazier: brazier(),
  artifact_geomungo_TEMP: geomungoTemp(),
  obj_plaque: plaque(),
  obj_well: well(),
  obj_pine: pine(),
  obj_rock_a: rock('a'),
  obj_rock_b: rock('b'),
  obj_grass_tuft: grassTuft(),
};
