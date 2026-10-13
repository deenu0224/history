/**
 * 현대 연구실 오브젝트. 차분한 숯색/남색/청회색 + 절제된 청록 + 따뜻한 램프빛.
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, autoOutline, rng, sprite } from './draw';

const softShadow = (g: Grid, cx: number, cy: number, rx: number, ry: number) => {
  g.ellipse(cx, cy, rx, ry, C.shade0);
  g.ellipse(cx, cy, rx - 2, Math.max(1, ry - 1), C.shade1);
};

/** 글로우/그림자 색은 외곽선 계산에서 제외 */
function outlineSolid(g: Grid): Grid {
  const soft = new Set([C.glow0, C.glow1, C.shade0, C.shade1, C.shade2]);
  const solid = new Grid(g.w, g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (!soft.has(g.get(x, y)) && g.get(x, y) !== '.') solid.set(x, y, g.get(x, y));
  const marks = solid.clone();
  autoOutline(marks);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (marks.get(x, y) !== '.' && solid.get(x, y) === '.') g.set(x, y, marks.get(x, y));
  return g;
}

function labDeskFrame(f: number): Grid {
  const g = new Grid(48, 40);
  softShadow(g, 24, 37, 22, 3);
  // 책상 몸체
  g.rect(2, 22, 44, 14, C.wood2);
  g.rect(2, 22, 44, 1, C.wood1);
  // 서랍부(오른쪽)
  g.rect(31, 24, 14, 11, C.wood1);
  g.box(31, 24, 14, 11, C.wood3);
  g.hline(32, 29, 12, C.wood3);
  g.rect(36, 26, 4, 1, C.steel1).rect(36, 31, 4, 1, C.steel1);
  // 무릎 공간(어둡게)
  g.rect(5, 24, 24, 11, C.wood3);
  g.rect(5, 24, 24, 1, C.shade2);
  // 다리
  g.rect(2, 34, 3, 3, C.wood3).rect(43, 34, 3, 3, C.wood3);
  // 상판
  g.rect(1, 17, 46, 6, C.wood1);
  g.hline(1, 17, 46, C.wood0);
  g.hline(1, 18, 46, C.wood0);
  g.hline(1, 22, 46, C.wood3);
  const r = rng(14);
  g.speckle(r, C.wood2, 0.05, 2, 19, 44, 3, C.wood1);
  // 모니터
  g.rect(14, 3, 20, 14, C.char1);
  g.box(14, 3, 20, 14, C.char0);
  g.hline(15, 4, 18, C.char3);
  const sc = f === 0 ? C.teal1 : C.teal2;
  g.rect(16, 5, 16, 9, C.teal0);
  g.rect(16, 5, 16, 9, f === 0 ? C.teal0 : C.teal1);
  // 화면 내용(텍스트 줄 + 표)
  for (let i = 0; i < 5; i++) g.hline(17, 6 + i * 2, 6 + ((i * 5 + f * 3) % 8), i === (1 + f) ? C.teal3 : sc);
  g.rect(27, 6, 4, 5, C.teal1).hline(27, 8, 4, C.teal3);
  g.set(30 - f, 12, C.lamp0); // 커서
  // 반사
  g.set(16, 5, C.steel2).set(17, 5, C.steel1);
  // 받침
  g.rect(22, 17, 4, 1, C.char2);
  g.rect(19, 18, 10, 1, C.char1);
  // 화면 빛번짐(책상 위)
  g.rect(15, 19, 18, 2, f === 0 ? C.glow1 : C.glow0);
  // 키보드
  g.rect(16, 20, 14, 3, C.char2);
  g.hline(16, 20, 14, C.char3);
  for (let x = 17; x < 29; x += 2) g.set(x, 21, C.char1).set(x, 22, C.char1);
  // 마우스, 머그컵, 서류
  g.rect(33, 20, 2, 2, C.char3);
  g.rect(37, 18, 6, 3, C.hanji0).hline(37, 18, 6, C.hanji1).hline(38, 19, 3, C.ink1);
  g.rect(3, 18, 5, 4, C.steel2).rect(4, 18, 3, 1, C.lamp3).set(8, 19, C.steel1).hline(3, 21, 5, C.steel0);
  // 램프 연결 램프등(작은 조명)
  g.set(11, 17, C.lamp1);
  return outlineSolid(g);
}
function labDesk(): PixelSprite {
  return sprite([labDeskFrame(0), labDeskFrame(1)], { x: 24, y: 37 });
}

function labShelf(): PixelSprite {
  const g = new Grid(32, 64);
  softShadow(g, 16, 61, 14, 3);
  g.rect(1, 2, 30, 58, C.char1);
  g.rect(3, 4, 26, 54, C.char0);
  g.vline(1, 2, 58, C.char3).vline(2, 2, 58, C.char2);
  g.vline(30, 2, 58, C.char0);
  g.hline(1, 2, 30, C.char3);
  g.rect(0, 59, 32, 3, C.char2).hline(0, 59, 32, C.char3);
  const r = rng(52);
  const cols = [C.navy3, C.teal1, C.steel0, C.navy4, C.teal2, C.char3, C.hanji2, C.wood1];
  for (let s = 0; s < 4; s++) {
    const top = 5 + s * 13;
    g.rect(4, top, 24, 11, C.navy1);
    g.hline(4, top, 24, C.shade2);
    let x = 5;
    while (x < 27) {
      const kind = r();
      if (kind < 0.7) {
        // 세워 둔 바인더/상자
        const w = 3 + Math.floor(r() * 3);
        const h = 7 + Math.floor(r() * 3);
        const c = cols[Math.floor(r() * cols.length)];
        const ww = Math.min(w, 27 - x);
        if (ww < 2) break;
        g.rect(x, top + 11 - h, ww, h, c);
        g.vline(x, top + 11 - h, h, C.steel1);
        g.vline(x + ww - 1, top + 11 - h, h, C.navy0);
        g.rect(x + (ww > 2 ? 1 : 0), top + 11 - h + 2, Math.max(1, ww - 2), 2, C.hanji0);
        x += ww;
      } else {
        // 누워 있는 문서함
        const w = 8;
        const ww = Math.min(w, 27 - x);
        if (ww < 5) break;
        g.rect(x, top + 6, ww, 5, C.steel0);
        g.hline(x, top + 6, ww, C.steel2);
        g.hline(x, top + 10, ww, C.navy2);
        g.rect(x + 2, top + 8, ww - 4, 1, C.hanji0);
        x += ww;
      }
    }
    g.rect(2, top + 11, 28, 2, C.char2);
    g.hline(2, top + 11, 28, C.steel0);
    g.hline(2, top + 12, 28, C.char0);
  }
  return sprite(outlineSolid(g), { x: 16, y: 62 });
}

function caseFrame(filled: boolean): Grid {
  const g = new Grid(32, 36);
  softShadow(g, 16, 33, 14, 3);
  // 하부 장
  g.rect(3, 20, 26, 12, C.char1);
  g.rect(3, 20, 26, 1, C.char3);
  g.rect(5, 23, 22, 8, C.char0);
  g.box(5, 23, 22, 8, C.char2);
  g.rect(14, 26, 4, 2, C.steel1).set(15, 27, C.char0);
  g.rect(3, 31, 26, 2, C.char0);
  // 유리 상부
  g.rect(3, 6, 26, 15, C.navy1);
  g.rect(5, 8, 22, 11, C.navy2);
  // 벨벳 깔개
  g.rect(5, 15, 22, 4, C.teal0).hline(5, 15, 22, C.teal1);
  // 유물
  if (filled) {
    g.rect(8, 11, 10, 5, C.hanji0).hline(8, 11, 10, C.hanji1).hline(8, 15, 10, C.hanji2);
    g.vline(9, 11, 5, C.red1).set(9, 12, C.red0).set(9, 14, C.red0);
    g.rect(10, 12, 6, 1, C.ink1).hline(10, 14, 5, C.ink1);
    // 두루마리
    g.rect(19, 12, 7, 4, C.hanji1);
    g.ellipse(25, 14, 1.5, 2, C.hanji0);
    g.ellipse(19, 14, 1.5, 2, C.hanji0);
    g.hline(19, 12, 7, C.hanji0).hline(19, 15, 7, C.hanji3);
    g.set(22, 13, C.ink1).set(23, 14, C.ink1);
    g.rect(22, 15, 2, 2, C.red1);
    // 따뜻한 점광
    g.rect(6, 8, 20, 1, C.glow0);
  } else {
    g.hline(8, 17, 16, C.teal1);
  }
  // 유리 반사
  g.line(7, 9, 12, 9, C.steel2).line(6, 11, 9, 11, C.steel1);
  g.line(19, 8, 16, 12, C.navy4).line(23, 8, 20, 12, C.navy3);
  // 금속 테두리
  g.box(3, 6, 26, 15, C.steel0);
  g.hline(4, 6, 24, C.steel2);
  g.rect(2, 4, 28, 3, C.steel0);
  g.hline(2, 4, 28, C.steel3);
  g.hline(2, 6, 28, C.navy1);
  // 팻말
  g.rect(11, 21, 10, 2, C.lamp2).hline(11, 21, 10, C.lamp1);
  return outlineSolid(g);
}

function stand(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 29, 11, 2.5);
  // 받침
  g.ellipse(16, 27, 10, 3, C.char1);
  g.rect(6, 25, 20, 3, C.char2).hline(6, 25, 20, C.char3).hline(6, 27, 20, C.char0);
  // 기둥
  g.rect(10, 13, 12, 12, C.char2);
  g.vline(10, 13, 12, C.char3).vline(11, 13, 12, C.steel0).vline(20, 13, 12, C.char1).vline(21, 13, 12, C.char0);
  g.rect(13, 19, 6, 3, C.lamp2).hline(13, 19, 6, C.lamp1);
  g.set(14, 20, C.lamp3).set(16, 20, C.lamp3);
  // 윗판
  g.ellipse(16, 12, 12, 4, C.steel0);
  g.ellipse(16, 11, 11, 3, C.steel2);
  g.hline(8, 10, 8, C.steel3);
  g.ellipse(16, 11, 7, 2, C.navy2);
  g.hline(12, 11, 6, C.navy3);
  return sprite(outlineSolid(g), { x: 16, y: 29 });
}

function chair(): PixelSprite {
  const g = new Grid(24, 32);
  softShadow(g, 12, 29, 9, 2);
  // 바퀴 다리
  g.line(12, 24, 4, 28, C.char2).line(12, 24, 20, 28, C.char2).line(12, 24, 8, 29, C.char2).line(12, 24, 16, 29, C.char2);
  g.rect(3, 28, 2, 2, C.char0).rect(19, 28, 2, 2, C.char0).rect(7, 29, 2, 2, C.char0).rect(15, 29, 2, 2, C.char0);
  g.rect(11, 20, 3, 5, C.char3).vline(11, 20, 5, C.steel0);
  // 좌판
  g.rect(3, 15, 18, 6, C.teal1);
  g.rect(3, 15, 18, 1, C.teal2);
  g.rect(3, 20, 18, 1, C.teal0);
  g.vline(20, 15, 6, C.teal0);
  g.hline(4, 17, 6, C.teal2);
  // 등받이
  g.rect(4, 2, 16, 13, C.teal1);
  g.rect(5, 3, 14, 11, C.teal2);
  g.hline(5, 3, 14, C.teal3);
  g.rect(6, 6, 12, 1, C.teal1).rect(6, 10, 12, 1, C.teal1);
  g.vline(18, 3, 11, C.teal1);
  // 프레임/팔걸이
  g.rect(1, 12, 2, 6, C.char2).rect(21, 12, 2, 6, C.char2);
  g.rect(1, 11, 3, 2, C.char3).rect(20, 11, 3, 2, C.char3);
  g.rect(10, 14, 4, 1, C.char1);
  return sprite(outlineSolid(g), { x: 12, y: 29 });
}

function floorLamp(): PixelSprite {
  const g = new Grid(24, 40);
  // 빛 번짐
  g.ellipse(12, 18, 11, 11, C.glow1);
  g.ellipse(12, 18, 7, 7, C.glow0);
  softShadow(g, 12, 38, 7, 1.5);
  // 받침/기둥
  g.ellipse(12, 37, 6, 2, C.char2);
  g.hline(7, 36, 10, C.char3);
  g.rect(11, 14, 2, 23, C.steel0);
  g.vline(11, 14, 23, C.steel2);
  // 갓
  g.rect(6, 5, 12, 2, C.lamp0);
  g.stamp(
    [
      '  oooooooo  ',
      ' ohhhhhhhhs ',
      'ohhhhhhhhhhs',
      'ohhhhhhhhhhs',
      'oghhhhhhhhgs',
    ],
    { o: C.ochre1, h: C.lamp1, s: C.ochre2, g: C.lamp2 },
    6,
    6,
  );
  g.hline(6, 11, 12, C.lamp3);
  g.hline(8, 12, 8, C.lamp0);
  // 전구 광점
  g.rect(10, 12, 4, 2, C.lamp0);
  return sprite(outlineSolid(g), { x: 12, y: 37 });
}

function terminalFrame(f: number): Grid {
  const g = new Grid(32, 40);
  softShadow(g, 16, 37, 14, 3);
  // 본체
  g.rect(3, 6, 26, 30, C.char1);
  g.vline(3, 6, 30, C.char3).vline(4, 6, 30, C.char2);
  g.vline(28, 6, 30, C.char0);
  g.hline(3, 6, 26, C.char3);
  g.rect(3, 34, 26, 3, C.char0);
  // 화면 베젤
  g.rect(6, 8, 20, 15, C.char0);
  g.box(6, 8, 20, 15, C.char2);
  g.rect(8, 10, 16, 11, C.teal0);
  // DB 표
  for (let row = 0; row < 4; row++) {
    const y = 11 + row * 2;
    const hi = row === (f === 0 ? 1 : 2);
    if (hi) g.rect(8, y, 16, 2, C.teal1);
    g.hline(9, y, 4, hi ? C.teal3 : C.teal2);
    g.hline(14, y, 3 + row, hi ? C.teal3 : C.teal2);
    g.hline(20, y, 3, hi ? C.lamp1 : C.teal1);
  }
  g.vline(13, 10, 11, C.teal1).vline(19, 10, 11, C.teal1);
  g.set(8, 10, C.steel2).set(9, 10, C.steel1);
  // 키 패널
  g.rect(5, 25, 22, 7, C.char2);
  g.hline(5, 25, 22, C.char3);
  for (let r = 0; r < 3; r++) for (let x = 7; x < 25; x += 3) g.rect(x, 26 + r * 2, 2, 1, C.char3).set(x, 27 + r * 2, C.char0);
  // LED
  g.set(24, 34, f === 0 ? C.teal3 : C.teal0).set(22, 34, f === 0 ? C.teal0 : C.lamp1).set(20, 34, C.red1);
  // 슬릿
  for (let x = 6; x < 14; x += 2) g.vline(x, 34, 2, C.char2);
  // 화면 빛
  g.rect(7, 23, 18, 1, f === 0 ? C.glow1 : C.glow0);
  return outlineSolid(g);
}
function terminal(): PixelSprite {
  return sprite([terminalFrame(0), terminalFrame(1)], { x: 16, y: 37 });
}

function plant(): PixelSprite {
  const g = new Grid(24, 32);
  softShadow(g, 12, 29, 8, 2);
  // 화분
  g.rect(6, 20, 12, 9, C.char2);
  g.rect(5, 19, 14, 3, C.char3);
  g.hline(5, 19, 14, C.steel0);
  g.vline(6, 22, 7, C.char3).vline(7, 22, 7, C.steel0);
  g.rect(8, 26, 8, 1, C.teal0);
  g.rect(16, 22, 2, 7, C.char1);
  g.rect(7, 28, 10, 1, C.char1);
  // 흙
  g.rect(7, 18, 10, 2, C.wood3);
  // 잎들
  const leaf = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    g.line(x0, y0, x1, y1, C.teal1);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 2; i < n; i++) {
      const x = Math.round(x0 + (dx * i) / n);
      const y = Math.round(y0 + (dy * i) / n);
      const span = Math.round(w * Math.sin((i / n) * Math.PI));
      for (let k = -span; k <= span; k++) {
        g.set(x + k, y, k < 0 ? C.teal2 : C.teal1);
      }
      g.set(x - span, y, C.teal3);
    }
  };
  leaf(12, 18, 4, 7, 2);
  leaf(12, 18, 19, 6, 2);
  leaf(12, 18, 12, 3, 2);
  leaf(12, 18, 7, 12, 2);
  leaf(12, 18, 17, 12, 2);
  return sprite(outlineSolid(g), { x: 12, y: 29 });
}

export const MODERN_OBJECTS: Record<string, PixelSprite> = {
  obj_lab_desk: labDesk(),
  obj_lab_shelf: labShelf(),
  obj_case_empty: sprite(caseFrame(false), { x: 16, y: 33 }),
  obj_case_filled: sprite(caseFrame(true), { x: 16, y: 33 }),
  obj_display_stand: stand(),
  obj_chair: chair(),
  obj_floor_lamp: floorLamp(),
  obj_terminal: terminal(),
  obj_plant: plant(),
};
