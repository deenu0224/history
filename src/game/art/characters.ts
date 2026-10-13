/**
 * 캐릭터 스프라이트 (24×36). 4방향(아래/왼/오른/위) × (idle + walk 4프레임) + 추가 동작.
 *
 * 프레임 배치 (CHAR_FRAMES 참고):
 *   0-4   down  (0=idle, 1-4=walk)
 *   5-9   left
 *   10-14 right
 *   15-19 up
 *   20    bow (NPC 인사)
 *   21-23 write (사관, 앉아서 기록)
 *   24-25 read  (사관, 서책 읽기)
 *
 * 주의: 관복의 색/흉배/품계 표현은 전부 TEMP 이며 고증 전 임시 도상이다(ART_DIRECTION.md 참고).
 */
import type { PixelSprite } from './pixel';
import { C, PALETTE, tintPalette } from './palettes';
import { Grid, sprite, withPalette } from './draw';

export const CHAR_W = 24;
export const CHAR_H = 36;

export type Dir = 'down' | 'left' | 'right' | 'up';
export const DIRS: Dir[] = ['down', 'left', 'right', 'up'];

export const CHAR_FRAMES = {
  down: 0,
  left: 5,
  right: 10,
  up: 15,
  bow: 20,
  write: [21, 22, 23],
  read: [24, 25],
} as const;

type Tones = [string, string, string, string]; // 밝음, 중간, 어두움, 윤곽선

interface Style {
  kind: 'danryeong' | 'clerk' | 'servant' | 'modern';
  robe: Tones;
  inner: string; // 동정/속옷 색
  belt: [string, string]; // 허리띠 [기본, 하이라이트]
  skin: [string, string, string]; // 밝음, 기본, 그늘
  hair: [string, string]; // 머리/수염 기본, 하이라이트
  beard: 'none' | 'short' | 'long' | 'mustache' | 'goatee';
  beardTone?: [string, string];
  hat: 'samo' | 'gat' | 'topknot' | 'hair';
  hatTone: [string, string, string]; // 기본, 하이라이트, 그늘
  build: -1 | 0 | 1; // 마름/보통/풍채
  badge?: [string, string]; // 흉배(TEMP)
  brush?: boolean; // 허리춤 붓
  glasses?: boolean;
  wrinkle?: boolean;
  pants?: [string, string, string];
  shoe: string;
  hunch?: boolean;
}

const HAT_DARK: [string, string, string] = [C.ink1, C.ink0, C.ink2];

// ───────────────────────── 머리 ─────────────────────────

function hatFront(g: Grid, st: Style, dx: number, dy: number): void {
  const [base, hi, sh] = st.hatTone;
  const S = (x: number, y: number, c: string) => g.set(x + dx, y + dy, c);
  const H = (x: number, y: number, w: number, c: string) => g.hline(x + dx, y + dy, w, c);
  if (st.hat === 'samo') {
    // 양쪽 날개(각)
    H(2, 4, 5, sh);
    H(2, 3, 5, base);
    H(2, 3, 1, hi);
    H(17, 4, 5, sh);
    H(17, 3, 5, base);
    S(21, 3, hi);
    // 모자 몸체
    H(9, 0, 6, base);
    H(8, 1, 8, base);
    for (let y = 2; y <= 6; y++) H(7, y, 10, base);
    for (let y = 1; y <= 6; y++) S(8, y, hi), S(9, y, hi);
    for (let y = 1; y <= 6; y++) S(15, y, sh), S(16, y, sh);
    H(7, 7, 10, sh); // 이마 닿는 띠
    H(8, 7, 2, base);
    // 윗부분 반사
    S(10, 1, hi);
  } else if (st.hat === 'gat') {
    // 챙
    H(4, 6, 16, base);
    H(3, 7, 18, sh);
    H(5, 6, 4, hi);
    // 갓모자(원통)
    for (let y = 0; y <= 5; y++) H(8, y, 8, base);
    for (let y = 0; y <= 5; y++) S(9, y, hi), S(14, y, sh), S(15, y, sh);
    H(8, 0, 8, hi);
    H(8, 5, 8, sh);
  } else if (st.hat === 'topknot') {
    // 상투 + 망건
    H(11, 1, 2, base);
    H(10, 2, 4, base);
    S(11, 2, hi);
    for (let y = 3; y <= 6; y++) H(8, y, 8, base);
    H(9, 3, 3, hi);
    H(8, 7, 8, C.cloth1);
    H(8, 6, 8, st.hat === 'topknot' ? base : base);
    S(8, 7, C.cloth0);
    S(15, 7, C.cloth2);
    S(7, 8, C.cloth2);
    S(7, 9, C.cloth1);
  } else {
    // 현대 머리(짧은 머리)
    H(9, 2, 6, base);
    H(8, 3, 8, base);
    for (let y = 4; y <= 6; y++) H(7, y, 10, base);
    H(7, 7, 10, base);
    H(9, 3, 3, hi);
    H(8, 4, 2, hi);
    // 옆머리 + 가르마
    S(7, 8, base);
    S(7, 9, base);
    S(16, 8, sh);
    S(16, 9, sh);
    H(8, 8, 3, base);
    S(14, 8, base);
    S(15, 8, base);
    S(12, 7, sh);
    S(13, 8, sh);
  }
}

function headFront(g: Grid, st: Style, dx: number, dy: number): void {
  const [hi, base, sh] = st.skin;
  const S = (x: number, y: number, c: string) => g.set(x + dx, y + dy, c);
  const H = (x: number, y: number, w: number, c: string) => g.hline(x + dx, y + dy, w, c);
  const wide = st.build === 1 ? 1 : 0;
  // 얼굴
  H(9, 8, 6, base);
  for (let y = 9; y <= 12; y++) H(8 - wide, y, 8 + wide * 2, base);
  H(9, 13, 6, base);
  H(10, 14, 4, base);
  // 광대/그늘
  for (let y = 9; y <= 13; y++) S(15 + wide, y, sh), S(14, y, y < 13 ? sh : base);
  H(9, 8, 6, sh); // 모자 그림자
  S(9, 9, hi);
  S(9, 10, hi);
  S(8 - wide, 11, hi);
  // 귀
  S(7 - wide, 10, st.skin[2]);
  S(16 + wide, 10, st.skin[2]);
  // 눈썹/눈
  H(9, 9, 2, st.hair[0]);
  H(13, 9, 2, st.hair[0]);
  S(10, 10, C.ink3);
  S(13, 10, C.ink3);
  S(10, 11, sh);
  S(13, 11, sh);
  // 코
  S(12, 11, sh);
  // 입
  if (st.beard === 'none' || st.beard === 'mustache') S(11, 13, C.red1), S(12, 13, C.red1);
  if (st.glasses) {
    H(9, 10, 3, C.steel1);
    H(12, 10, 3, C.steel1);
    S(9, 10, C.steel2);
    S(12, 10, C.steel2);
    S(10, 10, C.ink3);
    S(13, 10, C.ink3);
  }
  if (st.wrinkle) {
    S(9, 12, sh);
    S(14, 12, sh);
  }
  // 수염
  const [bc, bh] = st.beardTone ?? st.hair;
  if (st.beard === 'mustache') {
    H(9, 12, 6, bc);
    S(8, 13, bc);
    S(15, 13, bc);
    S(9, 12, bh);
  } else if (st.beard === 'goatee') {
    H(9, 12, 2, bc);
    H(13, 12, 2, bc);
    H(11, 14, 2, bc);
    H(11, 15, 2, bc);
    S(11, 16, bc);
    S(11, 14, bh);
  } else if (st.beard === 'short') {
    H(9, 12, 6, bc);
    for (let y = 13; y <= 14; y++) H(9, y, 6, bc);
    H(10, 15, 4, bc);
    S(9, 13, bh);
    S(10, 13, bh);
    S(12, 13, C.red1);
  } else if (st.beard === 'long') {
    H(9, 12, 6, bc);
    for (let y = 13; y <= 14; y++) H(8, y, 8, bc);
    H(9, 15, 6, bc);
    H(10, 16, 4, bc);
    H(10, 17, 4, bc);
    H(11, 18, 2, bc);
    H(11, 19, 2, bc);
    S(11, 20, bc);
    for (let y = 13; y <= 18; y++) S(10, y, bh);
    S(9, 13, bh);
    S(12, 11, sh);
    S(11, 13, st.skin[2]);
    S(12, 13, C.red1);
  }
  if (st.hat !== 'hair' && st.hat !== 'topknot') {
    // 구레나룻이 모자 아래로 나옴(성인)
    if (st.beard !== 'none') {
      S(8, 9, bc);
      S(15, 9, bc);
    }
  }
  hatFront(g, st, dx, dy);
}

function headSide(g: Grid, st: Style, dx: number, dy: number): void {
  // 왼쪽을 바라봄
  const [hi, base, sh] = st.skin;
  const S = (x: number, y: number, c: string) => g.set(x + dx, y + dy, c);
  const H = (x: number, y: number, w: number, c: string) => g.hline(x + dx, y + dy, w, c);
  H(8, 8, 6, base);
  for (let y = 9; y <= 12; y++) H(7, y, 8, base);
  H(8, 13, 6, base);
  H(9, 14, 4, base);
  S(6, 11, base); // 코
  S(6, 10, hi);
  S(7, 12, sh);
  for (let y = 9; y <= 13; y++) S(13, y, sh);
  S(8, 10, C.ink3);
  H(7, 9, 2, st.hair[0]);
  S(13, 10, st.skin[2]);
  S(14, 10, st.skin[1]);
  S(8, 11, hi);
  if (st.beard === 'none') S(7, 13, C.red1);
  const [bc, bh] = st.beardTone ?? st.hair;
  if (st.beard === 'mustache') H(6, 12, 3, bc);
  if (st.beard === 'goatee') {
    S(7, 12, bc);
    H(7, 14, 2, bc);
    S(7, 15, bc);
    S(7, 16, bc);
  }
  if (st.beard === 'short') {
    H(7, 12, 4, bc);
    H(7, 13, 5, bc);
    H(8, 14, 3, bc);
    S(7, 13, bh);
  }
  if (st.beard === 'long') {
    H(7, 12, 5, bc);
    H(7, 13, 6, bc);
    H(7, 14, 5, bc);
    H(8, 15, 4, bc);
    H(8, 16, 4, bc);
    H(8, 17, 3, bc);
    H(9, 18, 2, bc);
    H(9, 19, 2, bc);
    S(9, 20, bc);
    for (let y = 13; y <= 18; y++) S(8, y, bh);
  }
  if (st.glasses) {
    H(6, 10, 3, C.steel1);
    S(8, 10, C.ink3);
  }
  // 뒤쪽 머리/모자
  const [hb, hh, hs] = st.hatTone;
  if (st.hat === 'samo') {
    for (let y = 1; y <= 7; y++) H(8, y, 8, hb);
    H(9, 0, 6, hb);
    for (let y = 1; y <= 7; y++) S(9, y, hh), S(15, y, hs);
    S(8, 7, hs);
    // 날개(옆에서는 뒤로 길게)
    H(14, 4, 8, hb);
    H(14, 5, 8, hs);
    H(14, 4, 1, hh);
    S(21, 4, hh);
  } else if (st.hat === 'gat') {
    H(3, 6, 16, hb);
    H(4, 7, 14, hs);
    H(5, 6, 4, hh);
    for (let y = 0; y <= 5; y++) H(8, y, 8, hb);
    for (let y = 0; y <= 5; y++) S(9, y, hh), S(14, y, hs), S(15, y, hs);
    H(8, 0, 8, hh);
  } else if (st.hat === 'topknot') {
    H(10, 1, 3, hb);
    H(9, 2, 5, hb);
    S(10, 2, hh);
    for (let y = 3; y <= 8; y++) H(8, y, 8, hb);
    for (let y = 9; y <= 11; y++) H(12, y, 4, hb);
    H(8, 7, 7, C.cloth1);
    S(14, 7, C.cloth0);
    S(15, 8, C.cloth2);
    S(16, 8, C.cloth2);
  } else {
    for (let y = 2; y <= 8; y++) H(8, y, 8, hb);
    H(9, 2, 6, hb);
    for (let y = 9; y <= 11; y++) H(11, y, 5, hb);
    H(9, 3, 3, hh);
    H(8, 4, 2, hh);
    H(14, 5, 2, hs);
    S(7, 8, hb);
    S(7, 9, hb);
  }
}

function headBack(g: Grid, st: Style, dx: number, dy: number): void {
  const S = (x: number, y: number, c: string) => g.set(x + dx, y + dy, c);
  const H = (x: number, y: number, w: number, c: string) => g.hline(x + dx, y + dy, w, c);
  const [hb, hh, hs] = st.hatTone;
  // 목/귀
  H(10, 14, 4, st.skin[2]);
  S(7, 10, st.skin[2]);
  S(16, 10, st.skin[2]);
  // 뒷머리
  const hair = st.hair[0];
  for (let y = 8; y <= 13; y++) H(8, y, 8, st.hat === 'hair' ? hb : hair);
  H(9, 14, 6, hair);
  H(10, 13, 4, hs);
  // 모자 / 머리
  hatFront(g, st, dx, dy);
  if (st.hat === 'samo') {
    // 뒷면: 날개가 뒤에서 보임 + 모자 뒤판 음영
    for (let y = 1; y <= 7; y++) S(12, y, hs);
    H(7, 7, 10, hs);
  }
  if (st.hat === 'topknot') {
    for (let y = 3; y <= 7; y++) S(12, y, hh);
  }
  void hh;
}

// ───────────────────────── 몸 ─────────────────────────

interface Pose {
  dir: Dir;
  /** 0 idle, 1..4 walk */
  f: number;
  bob: number;
}

function legsAndFeet(g: Grid, st: Style, dir: Dir, f: number): void {
  const fwd = f === 1 ? 1 : f === 3 ? -1 : 0; // 1: 왼발 앞, -1: 오른발 앞
  const shoe = st.shoe;
  const shoeHi = C.ink0;
  const sole = st.kind === 'danryeong' || st.kind === 'clerk' ? C.hanji2 : st.kind === 'modern' ? C.char3 : C.ochre1;
  const drawShoe = (x: number, y: number, w = 3) => {
    g.rect(x, y, w, 2, shoe);
    g.hline(x, y, w, shoeHi);
    g.hline(x, y + 2, w, sole);
  };
  if (dir === 'down' || dir === 'up') {
    const ly = fwd === 1 ? 32 : 31;
    const ry = fwd === -1 ? 32 : 31;
    if (st.kind === 'modern' || st.kind === 'servant') {
      const [pl, pm, pd] = st.pants ?? st.robe;
      // 바지: 두 다리
      const top = st.kind === 'modern' ? 26 : 24;
      g.rect(8, top, 4, ly - top + 1, pm);
      g.rect(12, top, 4, ry - top + 1, pm);
      g.vline(8, top, ly - top + 1, pl);
      g.vline(15, top, ry - top + 1, pd);
      g.vline(11, top + 3, ly - top - 2, pd);
      g.vline(12, top + 3, ry - top - 2, pd);
      if (st.kind === 'servant') {
        g.hline(8, ly - 2, 4, C.cloth3);
        g.hline(12, ry - 2, 4, C.cloth3);
      }
    }
    drawShoe(7, ly + (st.kind === 'modern' || st.kind === 'servant' ? 0 : 0), 4);
    drawShoe(13, ry, 4);
  } else {
    // 옆모습: 앞발/뒷발
    const step = f === 1 ? 3 : f === 3 ? -3 : 0;
    const fx = 10 + step;
    const bx = 10 - step;
    if (st.kind === 'modern' || st.kind === 'servant') {
      const [pl, pm, pd] = st.pants ?? st.robe;
      const top = st.kind === 'modern' ? 26 : 24;
      const draw = (x: number, c: string, h: string) => {
        g.rect(x, top, 4, 7, c);
        g.vline(x, top, 7, h);
      };
      draw(bx + 1, pd, pd);
      draw(fx, pm, pl);
    }
    drawShoe(bx, 31, 5);
    drawShoe(fx - 1, step === 0 ? 31 : 32, 5);
    // 앞쪽(왼쪽)으로 신코
    g.set(fx - 2, step === 0 ? 32 : 33, shoe);
  }
}

function robeBody(g: Grid, st: Style, p: Pose): void {
  const [r0, r1, r2, r3] = st.robe;
  const { dir, f } = p;
  const dy = p.bob;
  const bd = st.build;
  const top = 15 + dy;
  const hem = st.kind === 'clerk' ? 29 : 30;
  const skirtLast = st.kind === 'clerk' ? 29 : 30;
  const R = (x: number, y: number, w: number, h: number, c: string) => g.rect(x, y, w, h, c);
  const swing = f === 1 ? 1 : f === 3 ? -1 : 0;

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const sw = st.kind === 'clerk' ? 5 : st.kind === 'danryeong' ? 6 : 6; // 몸 반폭
    const half = sw + bd;
    // 몸통 (상체)
    for (let y = top; y <= 21 + dy; y++) {
      const w = y === top ? half - 1 : half;
      R(12 - w, y, w * 2, 1, r1);
    }
    // 치마 자락(아래로 퍼짐)
    for (let y = 22 + dy; y <= hem; y++) {
      const flare = st.kind === 'clerk' ? Math.floor((y - 22) / 4) : Math.floor((y - 22) / 3);
      const w = half + flare;
      R(12 - w, y, w * 2, 1, r1);
    }
    // 음영
    for (let y = top; y <= hem; y++) {
      const flare = y < 22 + dy ? 0 : st.kind === 'clerk' ? Math.floor((y - 22) / 4) : Math.floor((y - 22) / 3);
      const w = (y === top ? half - 1 : half) + flare;
      g.set(12 - w, y, r0);
      g.set(13 - w, y, r0);
      g.set(11 + w, y, r2);
      g.set(10 + w, y, r2);
    }
    // 중앙 주름
    for (let y = 22 + dy; y <= hem; y += 1) if (y % 3 !== 0) g.set(back ? 12 : 11, y, r2);
    g.set(back ? 11 : 12, 24 + dy, r0).set(back ? 11 : 12, 25 + dy, r0);
    // 아랫단
    g.hline(12 - half - Math.floor((hem - 22) / 3), hem, (half + Math.floor((hem - 22) / 3)) * 2, r2);
    // 허리띠
    const beltY = 21 + dy;
    R(12 - half, beltY, half * 2, 2, st.belt[0]);
    g.hline(12 - half, beltY, half * 2, st.belt[1]);
    if (st.kind === 'danryeong') {
      if (!back) {
        for (const x of [8, 11, 14]) g.set(x + (bd > 0 ? 0 : 0), beltY, C.ochre0).set(x, beltY + 1, C.ochre2);
        g.set(12, beltY, C.lamp1);
      } else {
        g.rect(11, beltY + 2, 3, 3, st.belt[0]);
        g.set(11, beltY + 4, st.belt[1]);
      }
    }
    // 목깃/동정
    if (!back) {
      g.hline(9, top, 6, r2);
      g.set(11, top, st.inner).set(12, top, st.inner);
      g.set(10, top + 1, r2).set(13, top + 1, r2);
      g.set(11, top + 1, st.inner);
      g.set(12, top + 1, st.inner);
      g.set(11, top + 2, r0).set(12, top + 2, r0);
      // 앞섶(우임)
      for (let k = 0; k < 6; k++) g.set(12 + Math.floor(k / 2) - 1, top + 2 + k, r0);
      g.set(9, top, r3).set(14, top, r3);
    } else {
      g.hline(10, top, 4, r2);
      g.hline(10, top + 1, 4, r0);
    }
    // 흉배(TEMP 도상)
    if (st.badge && !back) {
      const bx = 10;
      const by = top + 3;
      g.rect(bx, by, 5, 4, st.badge[0]);
      g.box(bx, by, 5, 4, st.badge[1]);
      g.set(bx + 2, by + 1, st.badge[1]).set(bx + 1, by + 2, st.badge[1]).set(bx + 3, by + 2, st.badge[1]);
    }
    // 소매
    const sleeveW = st.kind === 'danryeong' ? 4 : st.kind === 'clerk' ? 3 : 3;
    const sleeveH = st.kind === 'danryeong' ? 10 : st.kind === 'clerk' ? 8 : 9;
    const lx = 12 - half - sleeveW + (st.kind === 'danryeong' ? 1 : 1);
    const rx = 12 + half - (st.kind === 'danryeong' ? 1 : 1);
    const lyS = top + 1 + (swing === 1 ? 1 : swing === -1 ? -1 : 0);
    const ryS = top + 1 + (swing === -1 ? 1 : swing === 1 ? -1 : 0);
    const sleeve = (x: number, y: number, left: boolean) => {
      R(x, y, sleeveW, sleeveH, r1);
      g.hline(x, y, sleeveW, r0);
      g.vline(left ? x : x + sleeveW - 1, y, sleeveH, left ? r0 : r2);
      g.vline(left ? x + sleeveW - 1 : x, y + 1, sleeveH - 1, left ? r2 : r1);
      g.hline(x, y + sleeveH - 1, sleeveW, r2);
      // 한삼 / 소맷단
      if (st.kind === 'danryeong') g.hline(x, y + sleeveH - 2, sleeveW, st.inner);
      else g.hline(x, y + sleeveH - 1, sleeveW, st.skin[1]);
    };
    sleeve(lx, lyS, true);
    sleeve(rx, ryS, false);
    // 외곽선(로브 + 소매)
    if (st.brush && !back) {
      g.line(9, beltY + 1, 8, beltY + 6, C.ochre1);
      g.set(8, beltY + 7, C.ink2);
      g.set(9, beltY, C.ochre0);
    }
  } else {
    // 옆모습 (왼쪽을 향함)
    const half = 4 + (bd > 0 ? 1 : 0);
    for (let y = top; y <= hem; y++) {
      const flare = y < 22 + dy ? 0 : st.kind === 'clerk' ? Math.floor((y - 22) / 4) : Math.floor((y - 22) / 3);
      const x0 = 12 - half - flare;
      const x1 = 12 + half + flare + (st.kind === 'danryeong' ? 0 : 0);
      R(x0, y, x1 - x0, 1, r1);
      g.set(x0, y, r0);
      g.set(x0 + 1, y, r0);
      g.set(x1 - 1, y, r2);
      g.set(x1 - 2, y, r2);
    }
    g.hline(12 - half - Math.floor((hem - 22) / 3), hem, (half + Math.floor((hem - 22) / 3)) * 2, r2);
    // 허리띠
    const beltY = 21 + dy;
    R(12 - half, beltY, half * 2, 2, st.belt[0]);
    g.hline(12 - half, beltY, half * 2, st.belt[1]);
    if (st.kind === 'danryeong') g.set(9, beltY, C.ochre0);
    // 목깃
    g.hline(9, top, 4, r2);
    g.set(9, top, st.inner);
    g.set(10, top + 1, st.inner);
    if (st.brush) {
      g.line(14, beltY + 1, 15, beltY + 6, C.ochre1);
      g.set(15, beltY + 7, C.ink2);
    }
    // 팔(소매) — 몸 중앙에서 앞뒤로 스윙
    const sleeveW = st.kind === 'danryeong' ? 5 : 3;
    const sleeveH = st.kind === 'danryeong' ? 10 : 8;
    const sx = 10 + (f === 1 ? -1 : f === 3 ? 1 : 0);
    R(sx, top + 1, sleeveW, sleeveH, r1);
    g.vline(sx, top + 1, sleeveH, r0);
    g.vline(sx + sleeveW - 1, top + 2, sleeveH - 1, r2);
    g.hline(sx, top + 1, sleeveW, r0);
    g.hline(sx, top + sleeveH, sleeveW, r2);
    if (st.kind === 'danryeong') g.hline(sx, top + sleeveH - 1, sleeveW, st.inner);
    else g.hline(sx, top + sleeveH, sleeveW, st.skin[1]);
  }
  void r3;
  void skirtLast;
}

/** 현대 코트 / 하인 저고리 같은 짧은 상의 */
function shortBody(g: Grid, st: Style, p: Pose): void {
  const [r0, r1, r2] = st.robe;
  const { dir, f } = p;
  const dy = p.bob;
  const top = 15 + dy;
  const swing = f === 1 ? 1 : f === 3 ? -1 : 0;
  const bd = st.build;
  const modern = st.kind === 'modern';
  const bottom = modern ? 27 : 23;
  const R = (x: number, y: number, w: number, h: number, c: string) => g.rect(x, y, w, h, c);
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    const half = 5 + bd;
    R(12 - half, top, half * 2, bottom - top + 1, r1);
    g.vline(12 - half, top, bottom - top + 1, r0);
    g.vline(13 - half, top, bottom - top + 1, r0);
    g.vline(11 + half, top, bottom - top + 1, r2);
    g.vline(10 + half, top, bottom - top + 1, r2);
    g.hline(12 - half, bottom, half * 2, r2);
    // 어깨
    g.hline(12 - half, top, half * 2, r0);
    if (modern) {
      // 코트: 앞 트임 + 옷깃 + 셔츠
      if (!back) {
        R(10, top, 4, 9, C.navy3);
        g.vline(10, top, 9, r2).vline(13, top, 9, r2);
        g.set(11, top, C.steel3).set(12, top, C.steel3).set(11, top + 1, C.steel2).set(12, top + 1, C.steel2);
        g.set(9, top, r0).set(14, top, r0).set(9, top + 1, r2).set(14, top + 1, r2);
        g.line(11, top + 2, 12, top + 6, C.teal2); // 목걸이 끈
        g.rect(11, top + 6, 2, 3, C.teal3);
        g.set(11, top + 6, C.hanji0);
        g.vline(12, top + 9, bottom - top - 8, r2);
        g.set(8, top + 9, C.steel1).set(15, top + 9, C.steel1);
      } else {
        g.vline(12, top + 2, bottom - top - 1, r2);
        g.hline(9, top, 6, r0);
        g.hline(9, top + 1, 6, r2);
      }
      // 코트 주머니/하단
      g.hline(12 - half, bottom - 1, half * 2, r2);
      // 가방끈
      if (!back) g.line(9, top, 14, bottom - 3, C.wood2);
      if (back) {
        g.rect(8, top + 3, 8, 8, C.wood1);
        g.box(8, top + 3, 8, 8, C.wood2);
        g.hline(9, top + 4, 6, C.wood0);
        g.rect(11, top + 6, 2, 2, C.ochre1);
      }
    } else {
      // 저고리: 앞깃(우임) + 고름 + 허리띠
      if (!back) {
        g.line(10, top, 13, top + 6, r2);
        g.line(14, top, 12, top + 3, r2);
        g.set(11, top, st.inner);
        g.set(12, top, st.inner);
        g.set(12, top + 3, C.red1);
        g.set(11, top + 4, C.red1);
        g.set(12, top + 5, C.red1);
      } else {
        g.vline(12, top + 1, 8, r2);
        g.hline(10, top, 4, r2);
      }
      g.hline(12 - half, 22 + dy, half * 2, C.ink0);
      g.hline(12 - half, 23 + dy, half * 2, C.ink1);
    }
    // 팔
    const armW = 3;
    const armH = modern ? 10 : 9;
    const lyA = top + 1 + (swing === 1 ? 1 : swing === -1 ? -1 : 0);
    const ryA = top + 1 + (swing === -1 ? 1 : swing === 1 ? -1 : 0);
    const arm = (x: number, y: number, left: boolean) => {
      R(x, y, armW, armH, r1);
      g.vline(left ? x : x + armW - 1, y, armH, left ? r0 : r2);
      g.hline(x, y, armW, r0);
      g.hline(x, y + armH - 1, armW, r2);
      // 손
      R(x, y + armH, armW, 2, st.skin[1]);
      g.set(left ? x : x + armW - 1, y + armH, st.skin[0]);
      g.hline(x, y + armH + 1, armW, st.skin[2]);
    };
    arm(12 - half - armW + 1, lyA, true);
    arm(12 + half - 1, ryA, false);
  } else {
    // 옆모습
    const half = 4;
    R(12 - half, top, half * 2, bottom - top + 1, r1);
    g.vline(12 - half, top, bottom - top + 1, r0);
    g.vline(11 + half, top, bottom - top + 1, r2);
    g.hline(12 - half, top, half * 2, r0);
    g.hline(12 - half, bottom, half * 2, r2);
    if (modern) {
      g.hline(12 - half, bottom - 1, half * 2, r2);
      g.set(8, top + 1, C.steel3);
      g.set(8, top + 2, C.steel2);
      g.rect(14, top + 3, 3, 7, C.wood1).box(14, top + 3, 3, 7, C.wood2);
    } else {
      g.hline(12 - half, 22 + dy, half * 2, C.ink1);
      g.set(8, top, st.inner);
    }
    const armH = modern ? 10 : 9;
    const sx = 10 + (f === 1 ? -1 : f === 3 ? 1 : 0);
    R(sx, top + 1, 3, armH, r1);
    g.vline(sx, top + 1, armH, r0);
    g.vline(sx + 2, top + 1, armH, r2);
    g.hline(sx, top + armH, 3, r2);
    R(sx, top + armH + 1, 3, 2, st.skin[1]);
    g.hline(sx, top + armH + 2, 3, st.skin[2]);
  }
}

/** 한 프레임 그리기 */
function drawFrame(st: Style, dir: Dir, f: number): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  const bob = f === 2 || f === 4 ? -1 : 0;
  // 바닥 그림자
  g.ellipse(12, 34, 7, 1.6, C.shade1);
  const p: Pose = { dir, f, bob };
  legsAndFeet(g, st, dir, f);
  if (st.kind === 'danryeong' || st.kind === 'clerk') robeBody(g, st, p);
  else shortBody(g, st, p);
  const hy = bob + (st.hunch ? 1 : 0);
  if (dir === 'down') headFront(g, st, 0, hy);
  else if (dir === 'up') headBack(g, st, 0, hy);
  else headSide(g, st, 0, hy);
  return dir === 'right' ? flipKeep(g) : g;
}

function flipKeep(g: Grid): Grid {
  return g.flipH();
}

/** 인사(bow) : 정면, 고개를 숙이고 두 손을 모음 */
function drawBow(st: Style): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  g.ellipse(12, 34, 7, 1.6, C.shade1);
  const p: Pose = { dir: 'down', f: 0, bob: 0 };
  legsAndFeet(g, st, 'down', 0);
  if (st.kind === 'danryeong' || st.kind === 'clerk') robeBody(g, st, p);
  else shortBody(g, st, p);
  // 몸을 숙인 느낌: 상체를 덮어 어깨선을 아래로, 머리를 아래/앞으로
  const [r0, r1, r2] = st.robe;
  g.rect(6, 15, 12, 6, r1);
  g.hline(6, 15, 12, r0);
  g.hline(6, 20, 12, r2);
  // 머리(숙임): 정수리가 보임
  headFront(g, st, 0, 5);
  // 모은 손(소매 앞쪽)
  g.rect(7, 23, 10, 4, r1);
  g.hline(7, 23, 10, r0);
  g.hline(7, 26, 10, r2);
  g.rect(10, 24, 4, 2, st.skin[1]);
  g.hline(10, 25, 4, st.skin[2]);
  g.set(7, 23, r0).set(16, 23, r2);
  return g;
}

/** 앉은 자세 (사관): write / read */
function drawSeated(st: Style, mode: 'write' | 'read', k: number): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  const [r0, r1, r2] = st.robe;
  g.ellipse(12, 33, 10, 2, C.shade1);
  // 책상다리 하의(퍼진 자락)
  for (let y = 27; y <= 33; y++) {
    const w = 7 + Math.floor((y - 27) / 2) + (y === 33 ? 0 : 0);
    g.rect(12 - w, y, w * 2, 1, r1);
    g.set(12 - w, y, r0);
    g.set(12 - w + 1, y, r0);
    g.set(11 + w, y, r2);
    g.set(10 + w, y, r2);
  }
  g.hline(2, 33, 20, r2);
  // 무릎 선
  g.line(7, 29, 11, 31, r2).line(17, 29, 13, 31, r2);
  g.rect(3, 33, 3, 1, st.shoe).rect(18, 33, 3, 1, st.shoe);
  // 상체(앉아서 더 낮음)
  const top = 20;
  for (let y = top; y <= 28; y++) {
    const w = y === top ? 5 : 6;
    g.rect(12 - w, y, w * 2, 1, r1);
    g.set(12 - w, y, r0);
    g.set(11 + w, y, r2);
  }
  g.hline(6, 27, 12, st.belt[0]);
  g.hline(6, 27, 12, st.belt[0]);
  g.hline(6, 26, 12, st.belt[1]);
  g.set(9, top, r2).set(14, top, r2).set(10, top, r2).set(13, top, r2);
  g.set(11, top, st.inner).set(12, top, st.inner);
  g.set(11, top + 1, st.inner).set(12, top + 1, st.inner);
  // 머리
  const headDy = mode === 'read' ? 5 + (k === 1 ? 1 : 0) : 5 + (k === 1 ? 1 : 0);
  headFront(g, st, 0, headDy);
  if (mode === 'write') {
    // 오른손: 붓을 쥐고 좌우로 움직임, 왼손은 소매를 잡음
    const hx = [12, 14, 11][k] ?? 12;
    g.rect(6, 22, 4, 6, r1).vline(6, 22, 6, r0).hline(6, 27, 4, r2);
    g.rect(7, 26, 3, 2, st.skin[1]);
    // 오른 소매 (앞으로 뻗음)
    g.rect(hx - 1, 24, 6, 3, r1);
    g.hline(hx - 1, 24, 6, r0);
    g.hline(hx - 1, 26, 6, r2);
    g.rect(hx + 4, 25, 2, 2, st.skin[1]);
    // 붓
    g.line(hx + 5, 25, hx + 7, 21, C.ochre1);
    g.set(hx + 7, 20, C.ink2).set(hx + 7, 21, C.ink3);
    // 종이/서안 윗면 일부
    g.rect(8, 29, 10, 3, C.hanji0);
    g.hline(8, 29, 10, C.hanji1);
    g.hline(9, 30, 4 + k * 2, C.ink1);
    g.set(hx + 7, 28, C.ink2);
  } else {
    // 책을 펼쳐서 읽음: 두 손으로 서책을 가슴 앞에
    const lift = k === 1 ? 1 : 0;
    g.rect(6, 22, 3, 6, r1).vline(6, 22, 6, r0);
    g.rect(15, 22, 3, 6, r1).vline(17, 22, 6, r2);
    g.rect(7, 22 - lift, 10, 8, C.hanji0);
    g.box(7, 22 - lift, 10, 8, C.hanji2);
    g.vline(12, 22 - lift, 8, C.hanji3);
    g.vline(11, 22 - lift, 8, C.red1);
    for (let i = 0; i < 3; i++) {
      g.hline(8, 24 - lift + i * 2, 3, C.ink1);
      g.hline(13, 24 - lift + i * 2, 3, C.ink1);
    }
    g.rect(6, 27, 3, 2, st.skin[1]).rect(15, 27, 3, 2, st.skin[1]);
  }
  return g;
}

function finish(grids: Grid[], st: Style): Grid[] {
  // 외곽선: 로브 계열은 로브 윤곽색, 머리/피부는 짙은 갈색, 모자는 ink
  const robeChars = new Set<string>(st.robe.slice(0, 3));
  const skinChars = new Set<string>(st.skin);
  const hatChars = new Set<string>(st.hatTone);
  const beltChars = new Set<string>(st.belt);
  return grids.map((g) => {
    g.outline((n) => {
      if (robeChars.has(n)) return st.robe[3];
      if (skinChars.has(n)) return C.skin3;
      if (hatChars.has(n)) return C.ink3;
      if (beltChars.has(n)) return C.ochre3;
      if (n === C.ink0 || n === C.ink1 || n === C.ink2 || n === C.ink3) return C.ink3;
      if (n === C.shade1 || n === C.shade0 || n === C.shade2) return undefined;
      if (n === st.shoe) return C.ink3;
      return st.robe[3];
    });
    return g;
  });
}

function buildCharacter(st: Style, extras: { bow?: boolean; write?: boolean; read?: boolean }): PixelSprite {
  const frames: Grid[] = [];
  for (const d of DIRS) for (let f = 0; f < 5; f++) frames.push(drawFrame(st, d, f));
  if (extras.bow) frames.push(drawBow(st));
  if (extras.write) for (let k = 0; k < 3; k++) frames.push(drawSeated(st, 'write', k));
  if (extras.read) for (let k = 0; k < 2; k++) frames.push(drawSeated(st, 'read', k));
  return sprite(finish(frames, st), { x: 12, y: 34 });
}

// ───────────────────────── 스타일 정의 ─────────────────────────

const OFFICIAL_SKIN: [string, string, string] = [C.skin0, C.skin0, C.skin1];
const SERVANT_SKIN: [string, string, string] = [C.skin0, C.skin1, C.skin2];

const modernStyle: Style = {
  kind: 'modern',
  robe: [C.char3, C.char2, C.char1, C.char0],
  inner: C.steel2,
  belt: [C.char1, C.char2],
  skin: OFFICIAL_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'none',
  hat: 'hair',
  hatTone: [C.ink2, C.ink0, C.ink3],
  build: 0,
  glasses: true,
  pants: [C.navy4, C.navy3, C.navy2],
  shoe: C.ink2,
};

const officialRed: Style = {
  kind: 'danryeong',
  robe: [C.red0, C.red1, C.red2, C.red3],
  inner: C.hanji0,
  belt: [C.ochre2, C.ochre0],
  skin: OFFICIAL_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'long',
  beardTone: [C.cloth1, C.cloth0],
  hat: 'samo',
  hatTone: HAT_DARK,
  build: 1,
  badge: [C.ochre1, C.ochre0],
  wrinkle: true,
  shoe: C.ink2,
};
const officialBlue: Style = {
  kind: 'danryeong',
  robe: [C.blue0, C.blue1, C.blue2, C.blue3],
  inner: C.hanji0,
  belt: [C.ochre2, C.ochre0],
  skin: OFFICIAL_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'goatee',
  hat: 'samo',
  hatTone: HAT_DARK,
  build: 0,
  badge: [C.hanji1, C.ink1],
  shoe: C.ink2,
};
const officialGreen: Style = {
  kind: 'danryeong',
  robe: [C.grass0, C.grass1, C.grass2, C.grass3],
  inner: C.hanji0,
  belt: [C.ink1, C.ink0],
  skin: OFFICIAL_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'mustache',
  hat: 'samo',
  hatTone: HAT_DARK,
  build: -1,
  shoe: C.ink2,
};
const sagwan: Style = {
  kind: 'danryeong',
  robe: [C.green0, C.green1, C.green2, C.green3],
  inner: C.hanji0,
  belt: [C.ink1, C.ochre1],
  skin: OFFICIAL_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'none',
  hat: 'samo',
  hatTone: HAT_DARK,
  build: -1,
  brush: true,
  shoe: C.ink2,
};
const clerk: Style = {
  kind: 'clerk',
  robe: [C.stone1, C.stone2, C.stone3, C.ink2],
  inner: C.cloth1,
  belt: [C.wood2, C.wood1],
  skin: SERVANT_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'none',
  hat: 'gat',
  hatTone: HAT_DARK,
  build: 0,
  hunch: true,
  shoe: C.ink2,
};
const servant: Style = {
  kind: 'servant',
  robe: [C.cloth0, C.cloth1, C.cloth2, C.cloth3],
  inner: C.cloth0,
  belt: [C.ink0, C.ink1],
  skin: SERVANT_SKIN,
  hair: [C.ink2, C.ink0],
  beard: 'none',
  hat: 'topknot',
  hatTone: [C.ink1, C.ink0, C.ink2],
  build: 0,
  pants: [C.cloth0, C.cloth1, C.cloth2],
  shoe: C.ochre2,
};

const playerModern = buildCharacter(modernStyle, {});
/** 과거 관찰용: 같은 연구자를 채도 낮추고 반투명하게. 푸른 기운을 약간 섞는다. */
const playerObserver = withPalette(
  playerModern,
  tintPalette(playerModern.palette, { desat: 0.7, alpha: 0.6, toward: [160, 190, 205], mix: 0.28 }),
);

export const CHARACTERS: Record<string, PixelSprite> = {
  char_player_modern: playerModern,
  char_player_observer: playerObserver,
  char_official_red: buildCharacter(officialRed, { bow: true }),
  char_official_blue: buildCharacter(officialBlue, { bow: true }),
  char_official_green: buildCharacter(officialGreen, { bow: true }),
  char_sagwan: buildCharacter(sagwan, { bow: true, write: true, read: true }),
  char_clerk: buildCharacter(clerk, { bow: true }),
  char_servant: buildCharacter(servant, { bow: true }),
};

void PALETTE;
