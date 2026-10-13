/**
 * 관측 뷰어 오버레이: 주사선, 잡음/글리치(4프레임), 뷰파인더 모서리, 타임라인 스크러버, "관측 중" 표시.
 * 전부 저대비/반투명. 글자는 넣지 않는다(문구는 UI 텍스트로 얹는다).
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { O, OSPAL } from './os_palette';

const sp = (g: Grid | Grid[], a?: { x: number; y: number }): PixelSprite => sprite(g, a, OSPAL);

export const OS_OBSERVE_NINE_SLICE: Record<string, { left: number; right: number; top: number; bottom: number }> = {
  ov_viewfinder: { left: 12, right: 12, top: 12, bottom: 12 },
  ov_scrub_track: { left: 4, right: 4, top: 2, bottom: 2 },
  ov_scrub_fill: { left: 4, right: 4, top: 2, bottom: 2 },
  ov_observing_pill: { left: 8, right: 8, top: 6, bottom: 6 },
};

function scanline(): PixelSprite {
  const g = new Grid(32, 32);
  for (let y = 0; y < 32; y++) {
    const c = y % 4 === 0 ? O.s2 : y % 4 === 2 ? O.s1 : O.l1;
    g.hline(0, y, 32, c);
  }
  return sp(g);
}

function noise(): PixelSprite {
  const frames: Grid[] = [];
  for (let f = 0; f < 4; f++) {
    const g = new Grid(64, 64);
    const r = rng(700 + f * 17);
    g.speckle(r, O.l2, 0.05);
    g.speckle(r, O.s3, 0.05);
    g.speckle(r, O.l3, 0.008);
    // 글리치 띠: 가로로 밀린 얇은 줄 몇 개
    const bands = 2 + (f % 2);
    for (let b = 0; b < bands; b++) {
      const y = Math.floor(r() * 60);
      const hgt = 1 + Math.floor(r() * 2);
      const x0 = Math.floor(r() * 30);
      const len = 14 + Math.floor(r() * 30);
      for (let j = 0; j < hgt; j++) {
        g.hline(x0, y + j, len, O.l2);
        g.hline(x0 + 3, y + j, Math.max(2, len - 12), O.l3);
        g.hline(Math.max(0, x0 - 6), y + j, 5, O.s3);
      }
    }
    // 프레임마다 다른 가로 줄 끊김
    g.hline(0, 8 + f * 15, 64, O.s2);
    frames.push(g);
  }
  return sp(frames);
}

function viewfinder(): PixelSprite {
  const N = 48;
  const g = new Grid(N, N);
  const arm = 9;
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const X = (x: number) => (fx ? N - 1 - x : x);
    const Y = (y: number) => (fy ? N - 1 - y : y);
    for (let i = 0; i < arm; i++) {
      g.set(X(2 + i), Y(2), O.k8);
      g.set(X(2), Y(2 + i), O.k8);
      g.set(X(2 + i), Y(3), O.k4);
      g.set(X(3), Y(2 + i), O.k4);
    }
    g.set(X(2), Y(2), O.k9);
  }
  return sp(g);
}

function scrubTrack(): PixelSprite {
  const g = new Grid(24, 8);
  g.rect(0, 2, 24, 4, O.k1);
  g.hline(0, 2, 24, O.k0);
  g.hline(0, 5, 24, O.k3);
  g.set(0, 2, '.').set(23, 2, '.').set(0, 5, '.').set(23, 5, '.');
  return sp(g);
}
function scrubFill(): PixelSprite {
  const g = new Grid(24, 8);
  g.rect(0, 2, 24, 4, O.t1);
  g.hline(0, 2, 24, O.t0);
  g.hline(0, 3, 24, O.t2);
  g.hline(0, 5, 24, O.t0);
  return sp(g);
}
function scrubTick(major: boolean): PixelSprite {
  const h = major ? 10 : 6;
  const g = new Grid(3, h);
  g.vline(1, 0, h, major ? O.k8 : O.k6);
  g.vline(0, 0, h, O.s3);
  g.vline(2, 0, h, O.s3);
  g.set(1, 0, O.k9);
  return sp(g);
}
function scrubKnob(): PixelSprite {
  const g = new Grid(12, 20);
  g.rect(1, 1, 10, 18, O.k6);
  g.rect(2, 2, 8, 16, O.k5);
  g.hline(2, 2, 8, O.k8);
  g.vline(2, 2, 16, O.k7);
  g.vline(9, 2, 16, O.k4);
  g.hline(2, 17, 8, O.k4);
  g.hline(3, 8, 6, O.k3).hline(3, 10, 6, O.k3).hline(3, 12, 6, O.k3);
  g.rect(4, 4, 4, 2, O.a2).hline(4, 4, 4, O.a3);
  g.set(1, 1, '.').set(10, 1, '.').set(1, 18, '.').set(10, 18, '.');
  g.outline(() => O.k0);
  return sp(g);
}

/** "관측 중" 표시: 맥동하는 램프 점(2프레임) + 문구가 들어갈 9-slice 알약 */
function observingDot(): PixelSprite {
  const fr: Grid[] = [];
  for (let f = 0; f < 2; f++) {
    const g = new Grid(16, 16);
    if (f === 0) {
      g.ellipse(8, 8, 7, 7, O.m1).ellipse(8, 8, 5.5, 5.5, O.m2);
      g.ellipse(8, 8, 3.5, 3.5, O.a3).ellipse(8, 8, 2, 2, O.a4);
    } else {
      g.ellipse(8, 8, 6, 6, O.m1);
      g.ellipse(8, 8, 3.5, 3.5, O.a2).ellipse(8, 8, 2, 2, O.a3);
    }
    fr.push(g);
  }
  return sp(fr);
}
function observingPill(): PixelSprite {
  const W = 24, H = 16;
  const g = new Grid(W, H);
  g.rect(0, 0, W, H, O.s5);
  g.box(0, 0, W, H, O.a1);
  g.box(1, 1, W - 2, H - 2, O.s4);
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]] as const) g.set(x, y, '.');
  for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]] as const) g.set(x, y, O.a1);
  return sp(g);
}

export const OS_OBSERVE: Record<string, PixelSprite> = {
  ov_scanline: scanline(),
  ov_noise: noise(),
  ov_viewfinder: viewfinder(),
  ov_scrub_track: scrubTrack(),
  ov_scrub_fill: scrubFill(),
  ov_scrub_tick: scrubTick(false),
  ov_scrub_tick_major: scrubTick(true),
  ov_scrub_knob: scrubKnob(),
  ov_observing_dot: observingDot(),
  ov_observing_pill: observingPill(),
};
