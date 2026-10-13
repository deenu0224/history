/**
 * UI 장식: 9-slice 패널 + 24×24 아이콘.
 * 아이콘은 어두운 윤곽 + 중간톤 면이라 한지 패널/현대 패널 어디서나 읽힌다.
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, autoOutline, rng, sprite } from './draw';
import { OS_NINE_SLICE } from './os_chrome';
import { OS_OBSERVE_NINE_SLICE } from './os_observe';
import { OS_NOTEBOOK_NINE_SLICE } from './os_notebook';
import { DESK_NINE_SLICE } from './desk_ui';

/** 9-slice 정의 (Phaser add.nineslice 의 leftWidth 등과 일치) */
export const NINE_SLICE: Record<string, { left: number; right: number; top: number; bottom: number }> = {
  ui_panel_hanji: { left: 12, right: 12, top: 12, bottom: 12 },
  ui_panel_modern: { left: 12, right: 12, top: 12, bottom: 12 },
  ...OS_NINE_SLICE,
  ...OS_OBSERVE_NINE_SLICE,
  ...OS_NOTEBOOK_NINE_SLICE,
  ...DESK_NINE_SLICE,
};

function panelHanji(): PixelSprite {
  const N = 48;
  const g = new Grid(N, N);
  // 한지 바탕
  g.rect(2, 2, N - 4, N - 4, C.hanji0);
  const r = rng(5);
  g.speckle(r, C.hanji1, 0.05, 3, 3, N - 6, N - 6);
  g.speckle(r, C.hanji2, 0.012, 3, 3, N - 6, N - 6);
  // 가장자리 안쪽 은은한 그늘(스트레치 안전: 가장자리와 평행한 선)
  g.box(2, 2, N - 4, N - 4, C.hanji1);
  // 안쪽 가는 먹선 (이중 테두리)
  g.box(6, 6, N - 12, N - 12, C.ink0);
  g.box(7, 7, N - 14, N - 14, C.hanji1);
  // 바깥 먹 테두리
  g.box(0, 0, N, N, C.ink2);
  g.box(1, 1, N - 2, N - 2, C.ink1);
  // 모서리 장식(구름머리 모티프를 단순화한 L자 장식 + 주홍 점)
  const corner = (x: number, y: number, fx: number, fy: number) => {
    const px = (dx: number) => (fx ? N - 1 - (x + dx) : x + dx);
    const py = (dy: number) => (fy ? N - 1 - (y + dy) : y + dy);
    for (let i = 0; i < 9; i++) {
      g.set(px(i), py(0), C.ink2);
      g.set(px(0), py(i), C.ink2);
    }
    g.set(px(1), py(1), C.red1).set(px(2), py(1), C.red1).set(px(1), py(2), C.red1);
    g.set(px(2), py(2), C.red0);
    g.set(px(4), py(3), C.ochre1).set(px(3), py(4), C.ochre1);
    g.set(px(5), py(4), C.ochre2).set(px(4), py(5), C.ochre2);
  };
  corner(3, 3, 0, 0);
  corner(3, 3, 1, 0);
  corner(3, 3, 0, 1);
  corner(3, 3, 1, 1);
  return sprite(g, { x: 24, y: 24 });
}

function panelModern(): PixelSprite {
  const N = 48;
  const g = new Grid(N, N);
  g.rect(0, 0, N, N, C.navy0);
  g.rect(2, 2, N - 4, N - 4, C.navy1);
  g.rect(3, 3, N - 6, N - 6, C.navy2);
  const r = rng(9);
  g.speckle(r, C.navy1, 0.06, 4, 4, N - 8, N - 8);
  g.speckle(r, C.navy3, 0.02, 4, 4, N - 8, N - 8);
  // 외곽 하이라이트 (위·왼쪽 밝게, 아래·오른쪽 어둡게)
  g.hline(1, 1, N - 2, C.steel0);
  g.vline(1, 1, N - 2, C.steel0);
  g.hline(1, N - 2, N - 2, C.navy0);
  g.vline(N - 2, 1, N - 2, C.navy0);
  g.box(0, 0, N, N, C.navy0);
  // 안쪽 가는 선
  g.box(6, 6, N - 12, N - 12, C.navy3);
  // 모서리 청록 포인트
  const corner = (fx: number, fy: number) => {
    const px = (dx: number) => (fx ? N - 1 - dx : dx);
    const py = (dy: number) => (fy ? N - 1 - dy : dy);
    for (let i = 3; i < 10; i++) {
      g.set(px(i), py(3), C.teal2);
      g.set(px(3), py(i), C.teal2);
    }
    g.set(px(4), py(4), C.teal3).set(px(3), py(3), C.teal3);
    g.set(px(5), py(5), C.teal1);
  };
  corner(0, 0);
  corner(1, 0);
  corner(0, 1);
  corner(1, 1);
  return sprite(g, { x: 24, y: 24 });
}

// ───────────────────────── 아이콘 24×24 ─────────────────────────
const I = 24;
const icon = (g: Grid): PixelSprite => sprite(autoOutline(g), { x: 12, y: 12 });

function iconNotebook(): PixelSprite {
  const g = new Grid(I, I);
  g.rect(5, 2, 15, 20, C.blue1);
  g.rect(5, 2, 15, 1, C.blue0);
  g.vline(5, 2, 20, C.blue0);
  g.vline(19, 2, 20, C.blue2);
  g.hline(5, 21, 15, C.blue2);
  // 스프링/제본 구멍
  for (let y = 4; y < 21; y += 3) g.rect(3, y, 4, 2, C.ochre1).set(3, y, C.ochre0).set(6, y + 1, C.ochre3);
  // 라벨
  g.rect(9, 5, 8, 7, C.hanji0);
  g.box(9, 5, 8, 7, C.hanji2);
  g.hline(10, 7, 6, C.ink1).hline(10, 9, 5, C.ink1).hline(10, 11, 3, C.ink0);
  // 책갈피
  g.rect(15, 18, 2, 5, C.red1).set(15, 22, C.red0).set(16, 22, '.');
  g.vline(15, 18, 4, C.red0);
  return icon(g);
}

function iconCodex(): PixelSprite {
  const g = new Grid(I, I);
  // 펼친 책(좌우 페이지)
  g.rect(2, 5, 10, 15, C.hanji0);
  g.rect(12, 5, 10, 15, C.hanji1);
  g.hline(2, 5, 10, C.hanji1);
  g.vline(12, 5, 15, C.hanji3);
  g.vline(11, 6, 14, C.hanji2);
  for (let i = 0; i < 5; i++) {
    g.hline(4, 8 + i * 2, 6, C.ink1);
    g.hline(14, 8 + i * 2, 6, C.ink0);
  }
  // 표지 모서리
  g.rect(1, 19, 22, 2, C.red1).hline(1, 19, 22, C.red0).hline(1, 20, 22, C.red2);
  g.rect(1, 4, 1, 16, C.red1).rect(22, 4, 1, 16, C.red2);
  // 도장(채집 표시)
  g.rect(16, 6, 3, 3, C.red0).set(17, 7, C.red2);
  return icon(g);
}

function iconTimeline(): PixelSprite {
  const g = new Grid(I, I);
  g.rect(1, 11, 22, 3, C.wood1).hline(1, 11, 22, C.wood0).hline(1, 13, 22, C.wood3);
  const node = (cx: number, cy: number, c0: string, c1: string) => {
    g.ellipse(cx, cy, 3, 3, c1);
    g.ellipse(cx, cy, 2, 2, c0);
    g.set(cx - 1, cy - 1, C.hanji0);
  };
  node(4, 12, C.ochre0, C.ochre2);
  node(12, 12, C.red0, C.red2);
  node(20, 12, C.teal2, C.teal0);
  // 깃발(사건 표식): 높이가 다름
  g.vline(4, 3, 6, C.ink1).rect(5, 3, 4, 3, C.ochre1).hline(5, 3, 4, C.ochre0);
  g.vline(12, 17, 5, C.ink1).rect(13, 18, 5, 3, C.red1).hline(13, 18, 5, C.red0);
  g.vline(20, 5, 4, C.ink1).rect(15, 5, 5, 3, C.teal1).hline(15, 5, 5, C.teal2);
  return icon(g);
}

function iconMagnifier(): PixelSprite {
  const g = new Grid(I, I);
  // 손잡이
  g.line(15, 15, 21, 21, C.wood2);
  g.line(16, 15, 21, 20, C.wood1);
  g.line(15, 16, 20, 21, C.wood3);
  g.rect(14, 14, 3, 3, C.ochre1);
  // 렌즈
  g.ellipse(10, 10, 8, 8, C.ochre2);
  g.ellipse(10, 10, 6, 6, C.teal3);
  g.ellipse(10, 11, 5.4, 5, C.navy4);
  g.ellipse(10, 10, 5.4, 5.4, C.teal2);
  g.ellipse(9, 9, 3, 3, C.teal3);
  g.set(7, 6, C.hanji0).set(8, 6, C.hanji0).set(6, 7, C.hanji0).set(6, 8, C.hanji0);
  g.ring(10, 10, 6, 6, C.ochre1);
  return icon(g);
}

function iconArchive(): PixelSprite {
  const g = new Grid(I, I);
  // 문서 보관함(서랍식)
  g.rect(2, 3, 20, 7, C.wood1);
  g.hline(2, 3, 20, C.wood0);
  g.rect(2, 10, 20, 11, C.wood2);
  g.hline(2, 10, 20, C.wood1);
  g.vline(2, 3, 18, C.wood0);
  g.vline(21, 3, 18, C.wood3);
  g.hline(2, 20, 20, C.wood3);
  g.hline(2, 9, 20, C.wood3);
  // 라벨 + 손잡이
  g.rect(7, 5, 10, 3, C.hanji0).hline(8, 6, 6, C.ink1);
  g.rect(9, 12, 6, 2, C.ochre1).hline(9, 12, 6, C.ochre0);
  g.rect(7, 16, 10, 3, C.hanji0).hline(8, 17, 5, C.ink1);
  g.rect(10, 19, 4, 1, C.ochre1);
  // 서랍 틈 밖으로 나온 종이
  g.rect(14, 1, 5, 3, C.hanji1).hline(14, 1, 5, C.hanji0);
  return icon(g);
}

function iconSettings(): PixelSprite {
  const g = new Grid(I, I);
  const cx = 11.5;
  const cy = 11.5;
  // 톱니 8개
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const tx = cx + Math.cos(a) * 8.5;
    const ty = cy + Math.sin(a) * 8.5;
    g.ellipse(tx, ty, 2, 2, C.stone2);
  }
  g.ellipse(cx, cy, 8, 8, C.stone1);
  g.ellipse(cx, cy, 6.5, 6.5, C.stone0);
  g.ellipse(cx, cy, 3, 3, C.hanji2);
  g.ellipse(cx, cy, 2, 2, C.stone3);
  g.set(7, 6, C.hanji1).set(8, 5, C.hanji1).set(6, 7, C.hanji1);
  g.ring(cx, cy, 8, 8, C.stone2);
  g.hline(10, 18, 4, C.stone2);
  return icon(g);
}

function iconEvidence(): PixelSprite {
  const g = new Grid(I, I);
  // 증거 카드(약간 기울임) + 핀
  g.rect(4, 4, 16, 17, C.hanji0);
  g.hline(4, 4, 16, C.hanji1);
  g.vline(19, 4, 17, C.hanji2);
  g.hline(4, 20, 16, C.hanji2);
  // 사진 영역
  g.rect(6, 8, 7, 6, C.navy3);
  g.rect(6, 8, 7, 6, C.blue2);
  g.ellipse(9, 10, 1.5, 1.5, C.skin1);
  g.rect(7, 12, 5, 2, C.blue1);
  g.box(6, 8, 7, 6, C.ink1);
  // 글줄
  g.hline(14, 9, 4, C.ink1).hline(14, 11, 4, C.ink0).hline(14, 13, 3, C.ink0);
  g.hline(6, 16, 12, C.ink1).hline(6, 18, 8, C.ink0);
  // 인장 + 핀
  g.rect(15, 15, 3, 3, C.red1).set(16, 16, C.red3);
  g.ellipse(12, 4, 2.5, 2.5, C.red1);
  g.set(11, 3, C.red0).set(12, 3, C.red0);
  g.vline(12, 6, 2, C.ink1);
  return icon(g);
}

function iconPerson(): PixelSprite {
  const g = new Grid(I, I);
  // 사모 쓴 흉상(인물 도감용)
  g.rect(4, 15, 16, 7, C.blue1);
  g.ellipse(12, 15, 8, 4, C.blue1);
  g.hline(5, 15, 14, C.blue0);
  g.rect(10, 13, 4, 3, C.skin1);
  g.set(11, 15, C.hanji0).set(12, 15, C.hanji0);
  // 얼굴
  g.ellipse(12, 10, 4, 4.5, C.skin0);
  g.vline(15, 8, 5, C.skin1);
  g.set(10, 10, C.ink3).set(14, 10, C.ink3);
  g.hline(11, 13, 3, C.ink1);
  // 사모
  g.rect(8, 3, 8, 5, C.ink1);
  g.rect(9, 2, 6, 1, C.ink1);
  g.hline(8, 3, 3, C.ink0);
  g.rect(2, 5, 6, 2, C.ink1).rect(16, 5, 6, 2, C.ink1);
  g.hline(2, 5, 6, C.ink0).hline(16, 5, 3, C.ink0);
  g.hline(8, 7, 8, C.ink2);
  return icon(g);
}

function iconScroll(): PixelSprite {
  const g = new Grid(I, I);
  // 두루마리(사료): 가로로 놓인 종이 + 양쪽 말림
  g.rect(5, 6, 14, 12, C.hanji0);
  g.hline(5, 6, 14, C.hanji1);
  g.hline(5, 17, 14, C.hanji2);
  for (let i = 0; i < 4; i++) g.hline(7, 8 + i * 3, 8 + (i % 2) * 2, C.ink1);
  g.set(17, 9, C.ink0).set(17, 12, C.ink0);
  // 말린 부분
  g.rect(2, 4, 4, 16, C.hanji1);
  g.vline(2, 4, 16, C.hanji2).vline(3, 4, 16, C.hanji0).vline(5, 4, 16, C.hanji3);
  g.rect(18, 4, 4, 16, C.hanji1);
  g.vline(18, 4, 16, C.hanji0).vline(21, 4, 16, C.hanji3).vline(20, 4, 16, C.hanji2);
  // 축
  g.rect(1, 3, 22, 1, C.wood2);
  g.rect(1, 20, 22, 1, C.wood2);
  g.rect(0, 2, 2, 3, C.wood1).rect(22, 2, 2, 3, C.wood1);
  g.rect(0, 19, 2, 3, C.wood1).rect(22, 19, 2, 3, C.wood1);
  // 묶음끈
  g.vline(12, 6, 12, C.red1).set(12, 12, C.red0);
  return icon(g);
}

function iconEvent(): PixelSprite {
  const g = new Grid(I, I);
  // 달력 낱장 + 별 표시(사건)
  g.rect(3, 4, 18, 18, C.hanji0);
  g.rect(3, 4, 18, 5, C.red1);
  g.hline(3, 4, 18, C.red0);
  g.hline(3, 8, 18, C.red2);
  g.rect(7, 2, 2, 4, C.ink1).rect(15, 2, 2, 4, C.ink1);
  g.vline(21, 9, 13, C.hanji2);
  g.hline(3, 21, 18, C.hanji2);
  // 별
  const star = [
    '..o..',
    '..o..',
    'ooooo',
    '.ooo.',
    '.o.o.',
  ];
  g.stamp(star, { o: C.ochre1 }, 9, 11);
  g.set(11, 12, C.ochre0).set(10, 13, C.ochre0).set(11, 11, C.lamp1);
  g.set(6, 18, C.ink0).set(8, 18, C.ink0).set(15, 18, C.ink0).set(17, 18, C.ink0);
  return icon(g);
}

function iconPlace(): PixelSprite {
  const g = new Grid(I, I);
  // 지도 핀
  g.ellipse(12, 21, 6, 1.6, C.shade1);
  g.ellipse(12, 9, 7, 7, C.red1);
  for (let i = 0; i < 8; i++) g.rect(12 - (7 - i), 12 + i, (7 - i) * 2, 1, C.red1);
  g.ellipse(12, 9, 3, 3, C.hanji0);
  g.ellipse(12, 9, 2, 2, C.red3);
  g.vline(6, 6, 5, C.red0).vline(7, 4, 3, C.red0).set(8, 3, C.red0).set(9, 2, C.red0);
  g.vline(17, 8, 6, C.red2).vline(18, 7, 3, C.red2);
  g.set(11, 7, C.hanji0);
  g.set(10, 18, C.red2).set(11, 19, C.red2);
  return icon(g);
}

function iconLock(): PixelSprite {
  const g = new Grid(I, I);
  // 걸쇠
  g.ring(12, 8, 5, 5.5, C.stone1);
  g.ring(12, 8, 4, 4.5, C.stone2);
  g.rect(7, 8, 2, 4, C.stone1).rect(15, 8, 2, 4, C.stone2);
  g.vline(8, 4, 5, C.stone0);
  // 몸체
  g.rect(4, 11, 16, 11, C.ochre1);
  g.rect(4, 11, 16, 2, C.ochre0);
  g.rect(4, 20, 16, 2, C.ochre2);
  g.vline(18, 13, 7, C.ochre2).vline(19, 13, 7, C.ochre2);
  // 열쇠구멍
  g.ellipse(12, 16, 2, 2, C.ink3);
  g.rect(11, 17, 2, 3, C.ink3);
  g.set(5, 12, C.lamp0);
  return icon(g);
}

function iconCheck(): PixelSprite {
  const g = new Grid(I, I);
  g.ellipse(12, 12, 10, 10, C.green2);
  g.ellipse(12, 12, 9, 9, C.green1);
  g.ellipse(11, 10, 6, 6, C.green0);
  g.ellipse(12, 12, 9, 9, '.');
  g.ellipse(12, 12, 9, 9, C.green1);
  g.ellipse(10, 9, 5, 4.5, C.green0);
  // 체크 표시
  g.line(6, 12, 10, 16, C.hanji0).line(6, 13, 10, 17, C.hanji0).line(7, 12, 10, 15, C.hanji0);
  g.line(10, 16, 18, 7, C.hanji0).line(10, 17, 18, 8, C.hanji0).line(11, 16, 18, 9, C.hanji0);
  g.set(18, 6, C.hanji0);
  g.line(7, 14, 10, 18, C.hanji2).line(11, 18, 18, 9, C.hanji2);
  return icon(g);
}

function iconQuestion(): PixelSprite {
  const g = new Grid(I, I);
  g.ellipse(12, 12, 10, 10, C.ochre1);
  g.ellipse(11, 11, 8, 8, C.ochre0);
  g.ellipse(12, 12, 9, 9, '.');
  g.ellipse(12, 12, 9, 9, C.ochre1);
  g.ellipse(10, 9, 5, 4.5, C.ochre0);
  g.ring(12, 12, 9, 9, C.ochre2);
  // 물음표
  const q = [
    '.ooo.',
    'o...o',
    '....o',
    '...o.',
    '..o..',
    '..o..',
    '.....',
    '..o..',
  ];
  g.stamp(q, { o: C.ink2 }, 9, 6);
  g.set(10, 6, C.ink2).set(14, 7, C.ink2);
  return icon(g);
}

export const UI_SPRITES: Record<string, PixelSprite> = {
  ui_panel_hanji: panelHanji(),
  ui_panel_modern: panelModern(),
  icon_notebook: iconNotebook(),
  icon_codex: iconCodex(),
  icon_timeline: iconTimeline(),
  icon_magnifier: iconMagnifier(),
  icon_archive: iconArchive(),
  icon_settings: iconSettings(),
  icon_evidence: iconEvidence(),
  icon_person: iconPerson(),
  icon_scroll: iconScroll(),
  icon_event: iconEvent(),
  icon_place: iconPlace(),
  icon_lock: iconLock(),
  icon_check: iconCheck(),
  icon_question: iconQuestion(),
};
