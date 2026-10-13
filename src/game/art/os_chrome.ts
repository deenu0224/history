/**
 * 결록 단말 OS 크롬: 창 프레임/버튼/탭/스크롤/체크박스/입력창/배지(9-slice 포함) + 상태바 아이콘 12×12.
 * 9-slice 는 가장자리와 평행한 선만 써서 늘려도 깨지지 않는다. 터치 단말이라 커서는 없다.
 */
import type { PixelSprite } from './pixel';
import { Grid, sprite } from './draw';
import { O, OSPAL, OS_OUTLINE } from './os_palette';

/** 9-slice 정의 — ui.ts 의 NINE_SLICE 에 합쳐진다 */
export const OS_NINE_SLICE: Record<string, { left: number; right: number; top: number; bottom: number }> = {};
const reg = (key: string, s: { left: number; right: number; top: number; bottom: number }) => {
  OS_NINE_SLICE[key] = s;
};

const sp = (g: Grid, a?: { x: number; y: number }): PixelSprite => sprite(g, a ?? { x: Math.floor(g.w / 2), y: Math.floor(g.h / 2) }, OSPAL);

interface BoxStyle {
  fill: string;
  edge: string; // 가장 바깥
  hi: string; // 안쪽 상·좌 하이라이트
  lo: string; // 안쪽 하·우 그늘
  /** 모서리 깎기 */
  cut?: number;
}
/** 베벨 박스(바깥 1px 외곽 + 안쪽 1px 하이라이트/그늘). 가운데는 균일 → 9-slice 안전 */
function box(w: number, h: number, st: BoxStyle): Grid {
  const g = new Grid(w, h);
  const cut = st.cut ?? 1;
  g.rect(0, 0, w, h, st.edge);
  g.rect(1, 1, w - 2, h - 2, st.fill);
  g.hline(1, 1, w - 2, st.hi);
  g.vline(1, 1, h - 2, st.hi);
  g.hline(1, h - 2, w - 2, st.lo);
  g.vline(w - 2, 1, h - 2, st.lo);
  for (let i = 0; i < cut; i++)
    for (let j = 0; j < cut - i; j++) g.set(i, j, '.').set(w - 1 - i, j, '.').set(i, h - 1 - j, '.').set(w - 1 - i, h - 1 - j, '.');
  return g;
}

// ───────────────────────── 창 ─────────────────────────
function windowFrame(active: boolean): PixelSprite {
  const W = 48, H = 48;
  const g = new Grid(W, H);
  const body = O.k2;
  g.rect(0, 0, W, H, O.k0);
  g.rect(1, 1, W - 2, H - 2, active ? O.k4 : O.k3); // 테두리 안쪽 밝은 선
  g.rect(2, 2, W - 4, H - 4, body);
  // 타이틀바 영역(위 20행): 안쪽 밝은 띠
  const tb = active ? O.k3 : O.k2;
  g.rect(2, 2, W - 4, 17, tb);
  g.hline(2, 2, W - 4, active ? O.k5 : O.k4);
  g.hline(2, 18, W - 4, O.k1);
  g.hline(2, 19, W - 4, active ? O.k4 : O.k3);
  // 활성 창: 하단 안쪽 청록 가는 선(포커스)
  if (active) g.hline(3, H - 3, W - 6, O.t1);
  // 모서리 깎기
  for (const [x, y] of [[0, 0], [1, 0], [0, 1]] as const) g.set(x, y, '.').set(W - 1 - x, y, '.');
  g.set(0, H - 1, '.').set(W - 1, H - 1, '.');
  return sp(g);
}
reg('os_window', { left: 6, right: 6, top: 20, bottom: 6 });
reg('os_window_idle', { left: 6, right: 6, top: 20, bottom: 6 });

function titleBtn(kind: 'min' | 'max' | 'close', state: 'n' | 'h'): PixelSprite {
  const g = new Grid(16, 16);
  const bg = state === 'h' ? (kind === 'close' ? O.r2 : O.k5) : '.';
  if (bg !== '.') {
    g.rect(1, 1, 14, 14, bg);
    for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]] as const) g.set(x, y, '.');
  }
  const c = state === 'h' ? O.kw : O.k9;
  if (kind === 'min') g.hline(4, 10, 8, c);
  else if (kind === 'max') g.box(4, 4, 8, 8, c).hline(4, 5, 8, c);
  else {
    g.line(4, 4, 11, 11, c);
    g.line(11, 4, 4, 11, c);
  }
  // 글리프 아래 그늘 + 끝점 하이라이트(가독성, 평면 방지)
  const sh = g.clone();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (sh.get(x, y) === c) g.under(x + 1, y + 1, O.s4);
  const hl = state === 'h' ? O.k9 : O.kw;
  if (kind === 'min') g.set(4, 10, hl).set(11, 10, O.k7);
  else if (kind === 'max') g.set(4, 4, hl).set(11, 11, O.k7);
  else g.set(4, 4, hl).set(11, 11, O.k7);
  return sp(g);
}

// ───────────────────────── 버튼 ─────────────────────────
function button(state: 'n' | 'h' | 'p', primary: boolean): PixelSprite {
  const W = 24, H = 24;
  let st: BoxStyle;
  if (primary) {
    st =
      state === 'n' ? { fill: O.t1, edge: O.k0, hi: O.t2, lo: O.t0 }
      : state === 'h' ? { fill: O.t2, edge: O.k0, hi: O.t3, lo: O.t1 }
      : { fill: O.t0, edge: O.k0, hi: O.t0, lo: O.t1 };
  } else {
    st =
      state === 'n' ? { fill: O.k4, edge: O.k0, hi: O.k5, lo: O.k3 }
      : state === 'h' ? { fill: O.k5, edge: O.k0, hi: O.k6, lo: O.k4 }
      : { fill: O.k2, edge: O.k0, hi: O.k1, lo: O.k3 };
  }
  const g = box(W, H, st);
  if (state === 'h') {
    // 호버: 호박색 가는 밑선(램프)
    g.hline(3, H - 3, W - 6, primary ? O.t4 : O.a3);
  }
  return sp(g);
}
for (const k of ['os_btn', 'os_btn_hover', 'os_btn_pressed', 'os_btn_primary', 'os_btn_primary_hover', 'os_btn_primary_pressed']) reg(k, { left: 6, right: 6, top: 6, bottom: 6 });

// ───────────────────────── 패널/카드/입력창 ─────────────────────────
function panel(): PixelSprite {
  const g = box(24, 24, { fill: O.k2, edge: O.k0, hi: O.k3, lo: O.k1, cut: 2 });
  return sp(g);
}
reg('os_panel', { left: 6, right: 6, top: 6, bottom: 6 });

function field(focus: boolean): PixelSprite {
  const W = 24, H = 20;
  const g = new Grid(W, H);
  g.rect(0, 0, W, H, focus ? O.t2 : O.k0);
  g.rect(1, 1, W - 2, H - 2, focus ? O.t1 : O.k4);
  g.rect(2, 2, W - 4, H - 4, O.k1);
  g.hline(2, 2, W - 4, O.k0); // 안쪽으로 파인 느낌(위 그늘)
  g.hline(2, H - 3, W - 4, O.k2);
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]] as const) g.set(x, y, '.');
  return sp(g);
}
reg('os_field', { left: 5, right: 5, top: 5, bottom: 5 });
reg('os_field_focus', { left: 5, right: 5, top: 5, bottom: 5 });

// ───────────────────────── 탭 ─────────────────────────
function tab(active: boolean): PixelSprite {
  const W = 24, H = 22;
  const g = new Grid(W, H);
  const fill = active ? O.k3 : O.k1;
  g.rect(0, 0, W, H, O.k0);
  g.rect(1, 1, W - 2, H - 1, active ? O.k5 : O.k3);
  g.rect(2, 2, W - 4, H - 2, fill);
  if (active) {
    g.hline(2, 2, W - 4, O.k4);
    g.hline(3, 1, W - 6, O.a2); // 활성 탭: 램프색 윗선
    g.hline(3, 0, W - 6, O.a0);
  } else {
    g.hline(2, 2, W - 4, O.k2);
  }
  // 바닥은 열린 형태(콘텐츠와 이어짐)
  g.hline(1, H - 1, W - 2, active ? fill : O.k0);
  g.set(0, 0, '.').set(W - 1, 0, '.').set(0, 1, '.').set(W - 1, 1, '.').set(1, 0, '.').set(W - 2, 0, '.');
  if (active) g.set(1, 1, '.').set(W - 2, 1, '.');
  return sp(g);
}
reg('os_tab', { left: 6, right: 6, top: 4, bottom: 3 });
reg('os_tab_idle', { left: 6, right: 6, top: 4, bottom: 3 });

// ───────────────────────── 스크롤바 ─────────────────────────
function scrollThumb(): PixelSprite {
  const g = box(8, 24, { fill: O.k6, edge: O.k1, hi: O.k8, lo: O.k5, cut: 1 });
  // 그립 선
  g.hline(2, 11, 4, O.k4).hline(2, 13, 4, O.k4);
  return sp(g);
}
reg('os_scroll_thumb', { left: 3, right: 3, top: 3, bottom: 3 });
function scrollTrack(): PixelSprite {
  const g = new Grid(8, 16);
  g.rect(0, 0, 8, 16, O.k0);
  g.rect(1, 0, 6, 16, O.k1);
  g.vline(1, 0, 16, O.k0);
  g.vline(6, 0, 16, O.k2);
  return sp(g);
}
reg('os_scroll_track', { left: 3, right: 3, top: 3, bottom: 3 });

// ───────────────────────── 체크박스 ─────────────────────────
function checkbox(on: boolean): PixelSprite {
  const g = box(14, 14, { fill: on ? O.t1 : O.k1, edge: on ? O.k0 : O.k0, hi: on ? O.t2 : O.k2, lo: on ? O.t0 : O.k3, cut: 1 });
  if (!on) {
    g.box(1, 1, 12, 12, O.k5);
    g.rect(2, 2, 10, 10, O.k1);
  } else {
    g.rect(1, 1, 12, 12, O.t1);
    g.hline(1, 1, 12, O.t2);
    g.vline(1, 1, 12, O.t2);
    g.hline(1, 12, 12, O.t0);
    g.vline(12, 1, 12, O.t0);
    g.set(3, 7, O.kw).set(4, 8, O.kw).set(5, 9, O.kw).set(6, 8, O.kw).set(7, 7, O.kw).set(8, 6, O.kw).set(9, 5, O.kw).set(10, 4, O.kw);
    g.set(3, 8, O.t4).set(4, 9, O.t4).set(5, 10, O.t4);
  }
  return sp(g);
}

// ───────────────────────── 배지 ─────────────────────────
function badge(): PixelSprite {
  const g = new Grid(12, 12);
  g.ellipse(6, 6, 5.5, 5.5, O.a1);
  g.ellipse(6, 6, 4.5, 4.5, O.a2);
  g.hline(4, 2, 4, O.a3).hline(3, 3, 2, O.a3);
  g.ring(6, 6, 5.5, 5.5, O.a1);
  g.outline((n) => OS_OUTLINE[n]);
  return sp(g);
}
function badgeDot(): PixelSprite {
  const g = new Grid(8, 8);
  g.ellipse(4, 4, 3, 3, O.a2);
  g.set(3, 2, O.a4).set(4, 2, O.a3);
  g.outline((n) => OS_OUTLINE[n]);
  return sp(g);
}

// ───────────────────────── 상태바 아이콘 12×12 ─────────────────────────
const STAT_MAP: Record<string, string> = { '#': O.k9, o: O.k7, a: O.a3, A: O.a2, t: O.t3, d: O.k4, x: O.k1 };
function stat(rows: string[]): PixelSprite {
  const g = new Grid(12, 12).stamp(rows, STAT_MAP, 0, 0);
  return sp(g);
}
const statSignal = () =>
  stat([
    '............',
    '............',
    '..........dd',
    '..........dd',
    '.......##.dd',
    '.......##.dd',
    '....##.##.dd',
    '....##.##.dd',
    '.##.##.##.dd',
    '.##.##.##.dd',
    '.oo.oo.oo.dd',
    '............',
  ]);
const statBattery = () =>
  stat([
    '............',
    '............',
    '............',
    '##########..',
    '#ttttdddd#..',
    '#ttttdddd###',
    '#ttttdddd###',
    '#ttttdddd#..',
    '##########..',
    '............',
    '............',
    '............',
  ]);
const statClock = () =>
  stat([
    '............',
    '...oooooo...',
    '..o######o..',
    '.o#......#o.',
    '.o#..#...#o.',
    '.o#..#...#o.',
    '.o#..#aa.#o.',
    '.o#......#o.',
    '..o######o..',
    '...oooooo...',
    '............',
    '............',
  ]);
const statLock = () =>
  stat([
    '............',
    '....####....',
    '...#....#...',
    '...#....#...',
    '...#....#...',
    '..########..',
    '..########..',
    '..###xx###..',
    '..###xx###..',
    '..########..',
    '..oooooooo..',
    '............',
  ]);
const statSync = () =>
  stat([
    '............',
    '...#####....',
    '..#.....#...',
    '.#.......##.',
    '.#......ttt.',
    '.#.....tttt.',
    '.####.....#.',
    '.ooo......#.',
    '.oo.......#.',
    '...#.....#..',
    '....#####...',
    '............',
  ]);
const statWarn = () =>
  stat([
    '............',
    '.....aa.....',
    '.....aa.....',
    '....aAAa....',
    '....aAAa....',
    '...aAxxAa...',
    '...aAxxAa...',
    '..aAAxxAAa..',
    '..aAAAAAAa..',
    '.aAAAxxAAAa.',
    '.aaaaaaaaaa.',
    '............',
  ]);

export const OS_CHROME: Record<string, PixelSprite> = {
  os_window: windowFrame(true),
  os_window_idle: windowFrame(false),
  os_title_min: titleBtn('min', 'n'),
  os_title_max: titleBtn('max', 'n'),
  os_title_close: titleBtn('close', 'n'),
  os_title_min_hover: titleBtn('min', 'h'),
  os_title_max_hover: titleBtn('max', 'h'),
  os_title_close_hover: titleBtn('close', 'h'),
  os_btn: button('n', false),
  os_btn_hover: button('h', false),
  os_btn_pressed: button('p', false),
  os_btn_primary: button('n', true),
  os_btn_primary_hover: button('h', true),
  os_btn_primary_pressed: button('p', true),
  os_panel: panel(),
  os_field: field(false),
  os_field_focus: field(true),
  os_tab: tab(true),
  os_tab_idle: tab(false),
  os_scroll_thumb: scrollThumb(),
  os_scroll_track: scrollTrack(),
  os_checkbox_off: checkbox(false),
  os_checkbox_on: checkbox(true),
  os_badge: badge(),
  os_badge_dot: badgeDot(),
  stat_signal: statSignal(),
  stat_battery: statBattery(),
  stat_clock: statClock(),
  stat_lock: statLock(),
  stat_sync: statSync(),
  stat_warning: statWarn(),
};
