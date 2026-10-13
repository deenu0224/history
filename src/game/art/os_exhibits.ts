/**
 * 개인 기록관 전시 스프라이트 96×96. 검증된 특징만 사용한다.
 *  - 탁영금(거문고): 길이:너비:두께 = 160:19:10 비례, 중앙에 「濯纓琴」 각자 영역(글자는 그리지 않고 파인 자리만),
 *    학(鶴) 그림, 용두(龍頭)와 운족(雲足). 그 외 장식/괘/현은 넣지 않는다. 박물관 사진과 대조 전까지 temp.
 *  - 실록 서책: 선장본(꿰맨 책) 일반형. 사초 묶음: 일반형. — 둘 다 임시.
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { O, OSPAL, OS_OUTLINE } from './os_palette';

const sp = (g: Grid, a: { x: number; y: number }): PixelSprite => sprite(g, a, OSPAL);

function geomungo(): PixelSprite {
  const g = new Grid(96, 96);
  const r = rng(77);
  // 바닥 그림자
  g.ellipse(52, 62, 42, 3.2, O.s2);
  g.ellipse(52, 62, 34, 2.2, O.s3);
  // 운족(구름 모양 발): 몸통 아래 두 곳
  const foot = (cx: number) => {
    g.rect(cx - 3, 52, 7, 6, O.w2);
    g.ellipse(cx, 58, 4.5, 2.4, O.w2);
    g.hline(cx - 3, 52, 7, O.w1);
    g.set(cx - 4, 58, O.w3).set(cx + 4, 58, O.w3);
    g.hline(cx - 2, 58, 5, O.w1);
  };
  foot(26);
  foot(82);
  // 몸통 측면(두께 10 → 약 5px)
  g.rect(12, 47, 84 - 4, 5, O.w2);
  g.hline(12, 47, 80, O.w3);
  g.hline(12, 51, 80, O.w3);
  // 윗면(너비 19 → 약 10px)
  g.rect(12, 37, 80, 10, O.w1);
  g.hline(12, 37, 80, O.w0);
  g.hline(12, 38, 80, O.w0);
  g.hline(12, 46, 80, O.w2);
  g.speckle(r, O.w2, 0.07, 13, 39, 78, 7, O.w1);
  g.speckle(r, O.w0, 0.05, 13, 39, 78, 7, O.w1);
  // 둥근 오른쪽 끝
  g.set(91, 37, '.').set(91, 51, '.').set(91, 38, O.w0);
  // 용두(왼쪽 끝): 몸통에서 위로 솟은 머리
  g.rect(6, 33, 9, 14, O.w1);
  g.ellipse(9, 38, 5, 6, O.w1);
  g.ellipse(8, 37, 3.4, 4.4, O.w0);
  g.rect(2, 41, 6, 6, O.w1); // 주둥이
  g.hline(2, 41, 6, O.w0);
  g.hline(2, 46, 10, O.w2);
  g.set(4, 43, O.w3).set(5, 43, O.w3); // 콧구멍
  g.set(8, 34, O.w3).set(9, 34, O.k1); // 눈
  g.line(10, 31, 13, 28, O.w2).line(11, 31, 14, 28, O.w1); // 뿔
  g.rect(12, 47, 3, 5, O.w2);
  // 학 그림: 몸통 오른쪽 윗면의 작은 화면
  g.rect(64, 38, 14, 8, O.p1);
  g.box(64, 38, 14, 8, O.w3);
  g.rect(66, 43, 6, 2, O.k9); // 몸
  g.line(71, 43, 74, 40, O.k9); // 목
  g.set(74, 40, O.k2).set(75, 40, O.a2); // 머리/부리
  g.line(67, 43, 64, 41, O.k8); // 꼬리
  g.vline(68, 45, 1, O.k3).vline(70, 45, 1, O.k3);
  // 중앙 각자 영역(「濯纓琴」): 글자 없이 파인 칸만
  g.rect(40, 40, 10, 5, O.w3);
  g.rect(41, 41, 8, 3, O.w2);
  g.hline(41, 41, 8, O.w3);
  // 외곽선
  g.outline((n) => (n === O.s2 || n === O.s3 ? undefined : OS_OUTLINE[n]));
  return sp(g, { x: 48, y: 62 });
}

function silrokBook(): PixelSprite {
  const g = new Grid(96, 96);
  const r = rng(31);
  g.ellipse(50, 84, 32, 4, O.s2);
  // 쪽 가장자리(두께)
  g.rect(24, 16, 54, 66, O.p1);
  g.rect(26, 17, 54, 66, O.p0);
  for (let y = 20; y < 80; y += 3) g.hline(78, y, 3, O.p2); // 책 배 쪽 결
  // 표지
  g.rect(20, 10, 54, 66, O.w2);
  g.rect(21, 11, 52, 64, O.p3);
  g.speckle(r, O.p4, 0.05, 21, 11, 52, 64, O.p3);
  g.speckle(r, O.p2, 0.04, 21, 11, 52, 64, O.p3);
  g.hline(21, 11, 52, O.p2);
  g.vline(21, 11, 64, O.p2);
  // 제첨(표제 띠 자리, 글자 없음)
  g.rect(33, 18, 14, 38, O.p0);
  g.box(33, 18, 14, 38, O.p4);
  g.vline(40, 22, 30, O.p1);
  // 선장본 꿰맴: 책등 쪽 구멍과 실
  for (const y of [14, 28, 43, 58, 72]) {
    g.rect(26, y, 2, 2, O.g0);
    g.set(26, y, O.g1);
  }
  g.vline(27, 12, 62, O.r1);
  for (const y of [14, 28, 43, 58, 72]) g.hline(23, y, 5, O.r1).hline(23, y + 1, 5, O.r2);
  g.outline((n) => (n === O.s2 ? undefined : OS_OUTLINE[n]));
  return sp(g, { x: 48, y: 84 });
}

function sachoBundle(): PixelSprite {
  const g = new Grid(96, 96);
  const r = rng(52);
  g.ellipse(48, 78, 36, 4, O.s2);
  // 접어 쌓은 종이 더미
  const sheet = (x: number, y: number, w: number, h: number, c: string, e: string) => {
    g.rect(x, y, w, h, c);
    g.hline(x, y, w, e);
    g.hline(x, y + h - 1, w, O.p3);
  };
  sheet(14, 54, 68, 12, O.p1, O.p0);
  sheet(16, 44, 66, 11, O.p0, O.kw);
  sheet(13, 34, 68, 11, O.p1, O.p0);
  sheet(17, 24, 64, 11, O.p0, O.kw);
  sheet(15, 66, 66, 8, O.p2, O.p1);
  g.speckle(r, O.p2, 0.06, 14, 24, 68, 48);
  // 가장자리 접힌 결
  for (let y = 26; y < 70; y += 4) g.set(15 + (y % 3), y, O.p3);
  // 묶음 끈(세로 두 줄 + 매듭)
  for (const x of [34, 62]) {
    g.rect(x, 22, 3, 54, O.a1);
    g.vline(x, 22, 54, O.a2);
    g.vline(x + 2, 22, 54, O.a0);
  }
  g.rect(31, 20, 8, 4, O.a2).hline(31, 20, 8, O.a3);
  g.set(30, 23, O.a1).set(38, 24, O.a1);
  g.outline((n) => (n === O.s2 ? undefined : OS_OUTLINE[n]));
  return sp(g, { x: 48, y: 78 });
}

export const OS_EXHIBITS: Record<string, PixelSprite> = {
  exhibit_geomungo_TEMP: geomungo(),
  exhibit_silrok_book_TEMP: silrokBook(),
  exhibit_sacho_bundle_TEMP: sachoBundle(),
};
