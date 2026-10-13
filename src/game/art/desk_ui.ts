/**
 * 책상 UI 아트: 책상 상판, 기록 카드/경고 전표 9-slice, 규정집, 프린터, 대기 번호판, 서랍, 조사 실, 램프 빛 웅덩이.
 * 글자는 그리지 않는다 — UI 가 선명한 텍스트를 얹는다. 따뜻한 색은 램프 호박/종이/나무만.
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { D, DESKPAL, DESK_OUTLINE } from './desk_palette';

const sp = (g: Grid | Grid[], a?: { x: number; y: number }): PixelSprite => sprite(g, a, DESKPAL);

export const DESK_NINE_SLICE: Record<string, { left: number; right: number; top: number; bottom: number }> = {
  desk_card: { left: 8, right: 10, top: 14, bottom: 10 },
  desk_slip: { left: 9, right: 7, top: 8, bottom: 7 },
  desk_rulebook_open: { left: 16, right: 16, top: 10, bottom: 14 },
};

// ───────────────────────── 책상 상판 ─────────────────────────

/** 어두운 나무 상판 64×64. 가장자리가 이어진다(wrap). 가로 판재 4장, 판마다 이음매 위치가 다르다. */
function deskSurface(): PixelSprite {
  const N = 64;
  const g = new Grid(N, N, D.w3);
  const r = rng(2024);
  const plankH = 16;
  const tones = [D.w3, D.w2, D.w3, D.w2];
  for (let p = 0; p < 4; p++) {
    const y0 = p * plankH;
    const joint = 8 + Math.floor(r() * 40);
    const segs: [number, number, string][] = [
      [0, joint, tones[(p + 1) % 4]],
      [joint, N - joint, tones[p % 4]],
    ];
    for (const [sx, sw, base] of segs) {
      for (let j = 0; j < plankH; j++) for (let i = 0; i < sw; i++) g.setW(sx + i, y0 + j, base);
      // 나뭇결: 길고 가는 선 + 옅은 선
      for (let n = 0; n < 5; n++) {
        const gy = y0 + 2 + Math.floor(r() * (plankH - 4));
        const gx = sx + Math.floor(r() * sw);
        const len = 6 + Math.floor(r() * 16);
        const tone = r() < 0.7 ? D.w4 : D.w2;
        for (let k = 0; k < len; k++) g.setW(gx + k, gy + (k > len / 2 && r() < 0.2 ? 1 : 0), tone);
      }
      g.speckle(r, D.w2, 0.025, sx, y0 + 1, sw, plankH - 2, undefined, true);
      // 판재 윗모서리 하이라이트 + 아래 이음 그림자
      for (let i = 0; i < sw; i++) g.setW(sx + i, y0, D.w2 === tones[p % 4] ? D.w1 : D.w2);
      for (let i = 0; i < sw; i++) g.setW(sx + i, y0 + plankH - 1, D.w4);
      for (let j = 1; j < plankH - 1; j++) g.setW(sx, y0 + j, D.w4);
    }
    // 옹이 하나
    if (p === 1 || p === 3) {
      const kx = Math.floor(r() * 50) + 6;
      const ky = y0 + 6 + Math.floor(r() * 4);
      g.ellipse(kx, ky, 3, 1.6, D.w4).ellipse(kx, ky, 1.8, 0.8, D.w3);
      g.hline(kx - 5, ky - 2, 3, D.w2).hline(kx + 3, ky + 2, 3, D.w2);
    }
  }
  // 오래 쓴 흔적: 긁힌 자국 + 컵 자국(아주 옅음)
  g.line(10, 20, 22, 24, D.w2).line(40, 40, 52, 38, D.w2).line(30, 55, 38, 58, D.w2);
  g.ring(47, 14, 4, 3, D.w2);
  g.ring(47, 14, 3, 2, D.w2);
  g.speckle(r, D.w4, 0.02, 0, 0, N, N, undefined, true);
  return sp(g, { x: 32, y: 32 });
}

/** 책상 앞 모서리(가로 이음 64×16): 윗면 끝 → 모따기 → 앞판 → 아래 그림자 */
function deskEdge(): PixelSprite {
  const W = 64;
  const g = new Grid(W, 16);
  const r = rng(77);
  g.rect(0, 0, W, 3, D.w2);
  g.hline(0, 0, W, D.w1);
  g.rect(0, 3, W, 2, D.w1);
  g.hline(0, 3, W, D.w0);
  g.rect(0, 5, W, 8, D.w2);
  g.hline(0, 5, W, D.w3);
  for (let i = 0; i < 6; i++) {
    const y = 6 + Math.floor(r() * 6);
    const x = Math.floor(r() * W);
    for (let k = 0; k < 10 + Math.floor(r() * 14); k++) g.setW(x + k, y, D.w3);
  }
  g.rect(0, 13, W, 1, D.w4);
  g.rect(0, 14, W, 2, D.s3);
  return sp(g, { x: 32, y: 8 });
}

/** 램프 빛 웅덩이 192×128. 반투명 호박색 동심 타원, 경계는 체크 디더링. 가운데가 가장 밝다. */
function lampPool(): PixelSprite {
  const W = 192;
  const H = 128;
  const g = new Grid(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const steps: [number, string][] = [
    [1.0, D.m1],
    [0.8, D.m2],
    [0.6, D.m3],
    [0.4, D.m4],
  ];
  const r = rng(5);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - cx) / (W / 2), (y + 0.5 - cy) / (H / 2));
      if (d >= 1) continue;
      // 단계 경계에서 디더
      let level = -1;
      for (let i = 0; i < steps.length; i++) if (d < steps[i][0]) level = i;
      if (level < 0) continue;
      const edge = steps[level][0] - d;
      let lv = level;
      if (edge < 0.05 && (x + y) % 2 === 0 && lv > 0) lv--;
      if (level === 0 && edge < 0.03 && r() < 0.5) continue;
      g.set(x, y, steps[lv][1]);
    }
  return sp(g, { x: W / 2, y: H / 2 });
}

// ───────────────────────── 종이: 기록 카드 / 경고 전표 ─────────────────────────

/**
 * 기록 카드 9-slice 48×48 (left 8, right 10, top 14, bottom 10). 낡은 흰 종이.
 * 위 칸에 붉은 머리줄 + 펀치 구멍, 오른쪽·아래에 그림자와 접힌 모서리. 가운데는 비워 두고
 * 줄무늬는 `desk_rules_tile` 을 UI 가 가운데 영역에 깔아 쓴다(9-slice 가 늘어나도 줄 굵기가 변하지 않게).
 */
function deskCard(): PixelSprite {
  const N = 48;
  const g = new Grid(N, N);
  const r = rng(808);
  const px1 = N - 3; // 종이 오른쪽 끝(그림자 2칸 제외)
  const py1 = N - 3;
  // 그림자
  g.rect(2, 2, N - 2, N - 2, D.s2);
  g.rect(1, 1, N - 3, N - 3, D.s3);
  // 종이
  g.rect(0, 0, px1 + 1, py1 + 1, D.p0);
  // 섬유/얼룩
  g.speckle(r, D.p1, 0.08, 1, 1, px1 - 1, py1 - 1, D.p0);
  g.speckle(r, D.p2, 0.012, 1, 1, px1 - 1, py1 - 1, D.p0);
  // 테두리: 위/왼쪽 하이라이트, 오른쪽/아래 그늘
  g.hline(0, 0, px1 + 1, D.p1);
  g.vline(0, 0, py1 + 1, D.p1);
  g.hline(1, 1, px1 - 1, D.p0);
  g.vline(px1, 0, py1 + 1, D.p2);
  g.hline(0, py1, px1 + 1, D.p2);
  g.vline(px1 - 1, 2, py1 - 2, D.p1);
  g.hline(2, py1 - 1, px1 - 2, D.p1);
  // 머리줄(붉은 줄 + 가는 줄)
  g.hline(1, 9, px1 - 1, D.r0);
  g.hline(1, 10, px1 - 1, D.r2);
  g.hline(1, 12, px1 - 1, D.p2);
  // 펀치 구멍(왼쪽 위): 뒤의 책상 나무색이 비친다
  g.rect(3, 3, 3, 3, D.w3);
  g.set(3, 3, D.w4).set(4, 3, D.w4).set(3, 4, D.w4);
  g.set(5, 5, D.p1).set(5, 4, D.p2);
  // 오른쪽 머리줄 칸막이
  g.vline(px1 - 8, 1, 8, D.p2);
  // 왼쪽 세로 여백선(붉은, 세로로 늘어나도 괜찮음)
  g.vline(6, 13, py1 - 13, D.z2);
  // 아래 바닥 가는 줄
  g.hline(1, py1 - 6, px1 - 1, D.p1);
  // 접힌 모서리(오른쪽 아래): 7×7 모서리 상자에서 i+j>6 은 잘려 나가고, 접힌 날개가 안쪽에 보인다
  const cx0 = px1 - 6;
  const cy0 = py1 - 6;
  for (let j = 0; j < 9; j++)
    for (let i = 0; i < 9; i++) {
      const x = cx0 + i;
      const y = cy0 + j;
      if (i + j > 6) g.set(x, y, '.');
      else if (i + j === 6) g.set(x, y, D.p3);
      else if (i + j >= 3 && i >= 1 && j >= 1) g.set(x, y, i + j === 5 ? D.p2 : D.p1);
    }
  return sp(g, { x: 24, y: 24 });
}

/** 괘선 타일 16×8: 가로 괘선 한 줄(가로로 이어붙임). 세로 간격은 UI 가 background-size 로 정함. */
function rulesTile(): PixelSprite {
  const g = new Grid(16, 8);
  for (let x = 0; x < 16; x++) g.set(x, 7, x % 5 === 2 ? D.z2 : D.z1);
  g.set(3, 6, D.z1).set(11, 6, D.z1);
  return sp(g, { x: 8, y: 4 });
}

/** 경고 전표 9-slice 48×24 (left 9, right 7, top 8, bottom 7): 붉은 기운 종이 띠. 왼쪽에 절취선, 위쪽에 붉은 띠. */
function deskSlip(): PixelSprite {
  const W = 48;
  const H = 24;
  const g = new Grid(W, H);
  const r = rng(133);
  const x1 = W - 3;
  const y1 = H - 3;
  g.rect(2, 2, W - 2, H - 2, D.s2);
  g.rect(1, 1, W - 3, H - 3, D.s3);
  g.rect(0, 0, x1 + 1, y1 + 1, D.q0);
  g.speckle(r, D.q1, 0.09, 1, 1, x1 - 1, y1 - 1, D.q0);
  g.speckle(r, D.q2, 0.014, 1, 1, x1 - 1, y1 - 1, D.q0);
  // 위 붉은 띠
  g.rect(0, 0, x1 + 1, 6, D.r1);
  g.hline(0, 0, x1 + 1, D.r0);
  g.hline(0, 5, x1 + 1, D.r2);
  g.hline(0, 6, x1 + 1, D.r3);
  // 띠 위의 작은 눈금(경고 표식 자리)
  for (let x = 12; x < x1 - 4; x += 5) g.set(x, 2, D.r2);
  // 테두리
  g.vline(0, 6, y1 - 5, D.q1);
  g.vline(x1, 7, y1 - 6, D.q3);
  g.hline(0, y1, x1 + 1, D.q3);
  g.hline(1, y1 - 1, x1 - 1, D.q1);
  // 절취선(왼쪽): 세로 점선 + 가장자리 톱니
  for (let y = 8; y < y1 - 1; y++) if (y % 3 !== 2) g.set(6, y, D.q3);
  for (let y = 7; y < y1; y += 3) g.set(0, y, '.').set(1, y, D.q2);
  // 아래 가는 줄
  g.hline(10, y1 - 4, x1 - 12, D.q2);
  return sp(g, { x: 24, y: 12 });
}

// ───────────────────────── 규정집 ─────────────────────────

/** 닫힌 규정집 48×64: 어두운 녹청 가죽 표지, 왼쪽 책등 띠, 황동 모서리, 빈 라벨 칸(글자는 UI), 늘어진 붉은 책갈피. */
function rulebookClosed(): PixelSprite {
  const W = 48;
  const H = 64;
  const g = new Grid(W, H);
  const r = rng(61);
  g.ellipse(25, 61, 22, 2.6, D.s2);
  g.ellipse(25, 61, 18, 1.8, D.s3);
  // 쪽배(오른쪽/아래 종이 단면)
  g.rect(5, 4, 40, 54, D.p1);
  for (let y = 5; y < 58; y += 2) g.hline(40, y, 5, D.p0);
  for (let x = 6; x < 45; x += 2) g.vline(x, 56, 3, D.p0);
  g.vline(44, 4, 54, D.p2);
  g.hline(5, 58, 40, D.p3);
  // 표지
  g.rect(2, 2, 40, 54, D.c1);
  g.rect(3, 3, 38, 52, D.c0);
  g.hline(2, 2, 40, D.c3);
  g.vline(2, 2, 54, D.c3);
  g.vline(41, 3, 53, D.c2);
  g.hline(3, 55, 39, D.c2);
  // 가죽 질감
  g.speckle(r, D.c1, 0.1, 4, 4, 36, 50, D.c0);
  g.speckle(r, D.c3, 0.04, 4, 4, 36, 50, D.c0);
  // 책등 띠(왼쪽)
  g.rect(2, 2, 7, 54, D.c2);
  g.vline(2, 2, 54, D.c3);
  g.vline(8, 3, 53, D.c1);
  for (const y of [10, 22, 34, 46]) g.hline(2, y, 7, D.b1).hline(2, y + 1, 7, D.b0);
  // 황동 모서리
  const corner = (x: number, y: number, fx: number, fy: number) => {
    for (let i = 0; i < 5; i++) {
      g.set(x + fx * i, y, D.b2);
      g.set(x, y + fy * i, D.b2);
    }
    g.set(x + fx, y + fy, D.b3);
    g.set(x + fx * 2, y + fy, D.b1);
    g.set(x + fx, y + fy * 2, D.b1);
  };
  corner(41, 2, -1, 1);
  corner(41, 55, -1, -1);
  corner(2, 55, 1, -1);
  // 표지 안쪽 테두리선(황동, 가는)
  g.box(12, 6, 26, 46, D.b1);
  g.hline(12, 6, 26, D.b2);
  g.set(12, 6, D.b3);
  // 빈 라벨 칸 (UI 가 규정집 제목을 얹는다)
  g.rect(16, 12, 18, 10, D.p0);
  g.box(16, 12, 18, 10, D.b2);
  g.hline(17, 13, 16, D.p1);
  g.hline(17, 20, 16, D.p1);
  // 아래 작은 문장(빈 방패형): 장식
  g.ellipse(25, 38, 5, 5, D.c2);
  g.ring(25, 38, 5, 5, D.b1);
  g.ring(25, 38, 2.4, 2.4, D.b0);
  g.set(25, 38, D.b2);
  // 붉은 책갈피: 아래로 늘어짐
  g.vline(33, 56, 6, D.r1).vline(34, 56, 6, D.r2);
  g.set(33, 62, D.r1).set(34, 61, D.r3).set(33, 61, D.r0);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 24, y: 60 });
}

/**
 * 펼친 규정집 9-slice 96×64 (left 16, right 16, top 10, bottom 14): 표지 테두리 + 양쪽 쪽배 단면 + 종이 두 면.
 * 가운데 접히는 홈은 늘어나면 퍼지므로 별도 스프라이트 `desk_rulebook_gutter` 를 UI 가 중앙에 얹는다.
 */
function rulebookOpen(): PixelSprite {
  const W = 96;
  const H = 64;
  const g = new Grid(W, H);
  const r = rng(62);
  // 그림자
  g.rect(3, 4, W - 3, H - 4, D.s3);
  g.rect(2, 3, W - 4, H - 5, D.s2);
  // 표지(바깥)
  g.rect(0, 0, W - 2, H - 3, D.c1);
  g.hline(0, 0, W - 2, D.c3);
  g.vline(0, 0, H - 3, D.c3);
  g.vline(W - 3, 1, H - 4, D.c2);
  g.hline(1, H - 4, W - 3, D.c2);
  g.speckle(r, D.c0, 0.1, 1, 1, W - 4, H - 6, D.c1);
  // 쪽배(양쪽 가장자리 단면): 겹겹의 선
  const stack = (x0: number, dir: 1 | -1) => {
    for (let i = 0; i < 6; i++) {
      const x = x0 + dir * i;
      g.vline(x, 3, H - 3 - 12 - i, i % 2 === 0 ? D.p1 : D.p0);
    }
  };
  stack(3, 1);
  stack(W - 6, -1);
  // 종이 면
  g.rect(9, 3, W - 20, H - 14, D.p0);
  g.speckle(r, D.p1, 0.07, 9, 3, W - 20, H - 14, D.p0);
  g.speckle(r, D.p2, 0.01, 9, 3, W - 20, H - 14, D.p0);
  g.hline(9, 3, W - 20, D.p1);
  // 아래 쪽배 단면
  for (let i = 0; i < 5; i++) g.hline(9 + i, H - 11 + i, W - 20 - i * 2, i % 2 === 0 ? D.p1 : D.p0);
  g.hline(14, H - 6, W - 30, D.p3);
  // 황동 모서리(바깥 네 귀)
  for (const [cx, cy, fx, fy] of [
    [0, 0, 1, 1],
    [W - 3, 0, -1, 1],
    [0, H - 4, 1, -1],
    [W - 3, H - 4, -1, -1],
  ] as const) {
    for (let i = 0; i < 4; i++) {
      g.set(cx + fx * i, cy, D.b2);
      g.set(cx, cy + fy * i, D.b2);
    }
    g.set(cx + fx, cy + fy, D.b3);
  }
  // 붉은 책갈피 리본(위로 삐져나옴 → 아래 오른쪽 쪽 위)
  g.vline(W - 24, H - 14, 12, D.r1).vline(W - 23, H - 14, 12, D.r2);
  g.set(W - 24, H - 3, D.r0);
  return sp(g, { x: 48, y: 32 });
}

/** 규정집 가운데 접힘 8×32: 세로로 타일링. 반투명이라 종이 위에 얹는다. */
function rulebookGutter(): PixelSprite {
  const g = new Grid(8, 32);
  for (let y = 0; y < 32; y++) {
    g.set(0, y, D.s1);
    g.set(1, y, D.s2);
    g.set(2, y, D.s3);
    g.set(3, y, D.s4);
    g.set(4, y, D.s3);
    g.set(5, y, D.n1);
    g.set(6, y, D.n2);
    g.set(7, y, D.s1);
  }
  // 제본 실 마디(8행마다)
  for (let y = 4; y < 32; y += 16) g.set(3, y, D.p3).set(4, y, D.p2).set(3, y + 1, D.p3);
  return sp(g, { x: 4, y: 16 });
}

// ───────────────────────── 프린터 ─────────────────────────

/** 종이를 내뱉는 프린터 96×80, 3프레임. 앞 슬롯에서 종이가 길어지며 나온다. LED 는 프레임마다 깜빡. */
function printerFrame(f: number): Grid {
  const g = new Grid(96, 80);
  const r = rng(300);
  // 그림자
  g.ellipse(48, 74, 42, 4, D.s2);
  g.ellipse(48, 74, 34, 3, D.s3);
  // 뒤 용지함(위에 종이 뭉치)
  g.rect(18, 2, 60, 8, D.p1);
  g.hline(18, 2, 60, D.p0);
  g.hline(18, 9, 60, D.p3);
  for (let x = 20; x < 76; x += 3) g.set(x, 5, D.p2);
  g.rect(22, 6, 52, 3, D.p0);
  g.hline(22, 8, 52, D.p2);
  // 윗면(밝음)
  g.rect(8, 10, 80, 22, D.k5);
  g.hline(8, 10, 80, D.k8);
  g.hline(9, 11, 78, D.k7);
  g.vline(8, 10, 22, D.k7);
  g.rect(9, 12, 78, 19, D.k5);
  g.speckle(r, D.k6, 0.1, 9, 12, 78, 19, D.k5);
  g.speckle(r, D.k4, 0.08, 9, 12, 78, 19, D.k5);
  // 환기 홈(윗면 오른쪽)
  for (let i = 0; i < 6; i++) g.hline(58, 14 + i * 3, 24, D.k2).hline(58, 15 + i * 3, 24, D.k6);
  // 윗면 왼쪽: 작은 표시창 + LED
  g.rect(14, 15, 22, 9, D.k1);
  g.box(14, 15, 22, 9, D.k3);
  g.hline(16, 18, 10, D.a1).hline(16, 20, 14, D.a0);
  const on = f === 1;
  g.rect(40, 17, 3, 3, on ? D.a4 : D.a2);
  g.set(40, 17, on ? D.p0 : D.a3);
  g.ellipse(41, 18, 4, 3, on ? D.m3 : D.m2);
  g.rect(40, 17, 3, 3, on ? D.a4 : D.a2);
  // 앞면
  g.rect(8, 32, 80, 28, D.k4);
  g.hline(8, 32, 80, D.k3);
  g.vline(8, 32, 28, D.k5);
  g.vline(87, 32, 28, D.k2);
  g.hline(8, 59, 80, D.k1);
  g.speckle(r, D.k5, 0.07, 9, 33, 78, 25, D.k4);
  g.speckle(r, D.k3, 0.06, 9, 33, 78, 25, D.k4);
  // 앞 위쪽 모따기 하이라이트
  g.hline(9, 33, 78, D.k6);
  g.hline(9, 34, 78, D.k5);
  // 슬롯(용지 배출구): 어두운 틈 + 아랫입술 하이라이트
  g.rect(20, 38, 56, 5, D.k0);
  g.hline(20, 38, 56, D.k1);
  g.hline(20, 43, 56, D.k7);
  g.hline(19, 44, 58, D.k6);
  g.vline(19, 38, 6, D.k6).vline(76, 38, 6, D.k2);
  // 나사
  for (const [x, y] of [[12, 36], [83, 36], [12, 55], [83, 55]]) g.set(x, y, D.k7).set(x + 1, y, D.k3);
  // 앞 패널 작은 버튼 2개
  g.rect(14, 50, 6, 4, D.k3).hline(14, 50, 6, D.k6).hline(14, 53, 6, D.k1);
  g.rect(23, 50, 6, 4, D.k3).hline(23, 50, 6, D.k6).hline(23, 53, 6, D.k1);
  g.set(16, 51, D.a2).set(17, 51, D.a2);
  // 발
  g.rect(12, 60, 10, 5, D.k2).hline(12, 60, 10, D.k4);
  g.rect(74, 60, 10, 5, D.k2).hline(74, 60, 10, D.k4);
  // 슬롯 안쪽 어두움을 덮지 않도록 종이는 슬롯 아래 앞면 위로 늘어진다
  const len = [3, 13, 25][f] ?? 3;
  const curl = f === 2 ? 1 : 0;
  const x0 = 26;
  const w = 44;
  // 종이는 슬롯 안에서 나와 앞면 위를 덮고 책상 쪽으로 내려온다
  const top = 41;
  g.rect(x0, top, w, len, D.p0);
  g.hline(x0, top, w, D.p1);
  g.vline(x0 + w - 1, top, len, D.p2);
  g.vline(x0, top, len, D.p1);
  // 인쇄된 흔적(글자 흉내 없이 가는 줄)
  for (let y = top + 4; y < top + len - 3; y += 3) g.hline(x0 + 4, y, 22 + (y % 7), D.p2);
  // 앞쪽 끝 말림 + 그림자
  g.hline(x0 + curl, top + len - 1, w - curl * 2, D.p2);
  g.hline(x0 + 1, top + len, w - 2, D.s3);
  g.hline(x0 + 2, top + len + 1, w - 4, D.s2);
  // 슬롯 윗입술이 종이 위로
  g.hline(20, 38, 56, D.k1);
  g.rect(20, 39, 56, 2, D.k0);
  // 외곽선(다리·본체)
  g.outline((n) => DESK_OUTLINE[n]);
  return g;
}

function printer(): PixelSprite {
  return sp([printerFrame(0), printerFrame(1), printerFrame(2)], { x: 48, y: 72 });
}

// ───────────────────────── 대기 번호판 ─────────────────────────

/** 대기 번호판 56×32: 나무 틀 + 황동 테두리 + 어두운 숫자 창(빈칸 — UI 가 숫자를 얹는다) + 라벨 홈(빈칸). */
function queuePlaque(): PixelSprite {
  const W = 56;
  const H = 32;
  const g = new Grid(W, H);
  const r = rng(91);
  g.ellipse(28, 29, 25, 2.4, D.s3);
  // 나무 판
  g.rect(1, 1, W - 2, 27, D.w1);
  g.hline(1, 1, W - 2, D.w0);
  g.vline(1, 1, 27, D.w0);
  g.vline(W - 2, 2, 26, D.w2);
  g.hline(2, 27, W - 3, D.w2);
  for (let i = 0; i < 5; i++) {
    const y = 3 + Math.floor(r() * 22);
    g.hline(3 + Math.floor(r() * 10), y, 8 + Math.floor(r() * 18), D.w2);
  }
  // 라벨 홈(위): 빈 황동 띠
  g.rect(8, 3, W - 16, 6, D.b1);
  g.hline(8, 3, W - 16, D.b3);
  g.hline(8, 8, W - 16, D.b0);
  g.rect(10, 4, W - 20, 4, D.k2);
  // 숫자 창(아래)
  g.rect(8, 11, W - 16, 14, D.b1);
  g.hline(8, 11, W - 16, D.b3);
  g.vline(8, 11, 14, D.b2);
  g.hline(8, 24, W - 16, D.b0);
  g.rect(10, 13, W - 20, 10, D.k1);
  g.hline(10, 13, W - 20, D.k0);
  // 창 안의 은은한 램프 번짐(글자 뒤)
  g.rect(12, 15, W - 24, 6, D.k2);
  g.hline(12, 15, W - 24, D.a0);
  g.hline(12, 20, W - 24, D.a0);
  // 나사
  for (const [x, y] of [[4, 4], [W - 6, 4], [4, 22], [W - 6, 22]]) g.set(x, y, D.b3).set(x + 1, y, D.b0).set(x, y + 1, D.b1);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 28, y: 28 });
}

// ───────────────────────── 서랍 ─────────────────────────

function drawerFront(g: Grid, y0: number, h: number): void {
  const W = 64;
  g.rect(0, y0, W, h, D.w2);
  g.hline(0, y0, W, D.w1);
  g.hline(0, y0 + 1, W, D.w0);
  g.vline(0, y0, h, D.w1);
  g.vline(W - 1, y0, h, D.w3);
  g.hline(0, y0 + h - 1, W, D.w4);
  // 안쪽 판(우물 천장 홈)
  g.box(5, y0 + 5, W - 10, h - 10, D.w3);
  g.box(6, y0 + 6, W - 12, h - 12, D.w1);
  g.hline(6, y0 + 6, W - 12, D.w2);
  const r = rng(12 + h);
  for (let i = 0; i < 6; i++) g.hline(9 + Math.floor(r() * 30), y0 + 8 + Math.floor(r() * (h - 16)), 6 + Math.floor(r() * 14), D.w3);
  // 황동 손잡이 + 열쇠 구멍
  g.rect(24, y0 + Math.floor(h / 2) - 2, 16, 4, D.b2);
  g.hline(24, y0 + Math.floor(h / 2) - 2, 16, D.b3);
  g.hline(24, y0 + Math.floor(h / 2) + 1, 16, D.b0);
  g.set(23, y0 + Math.floor(h / 2) - 1, D.b1).set(40, y0 + Math.floor(h / 2) - 1, D.b1);
  g.rect(31, y0 + 6, 2, 3, D.b1).set(31, y0 + 6, D.b3).set(31, y0 + 7, D.k1).set(32, y0 + 8, D.k1);
  // 이름표 홈(빈칸)
  g.rect(46, y0 + 7, 10, 5, D.b1);
  g.rect(47, y0 + 8, 8, 3, D.p0);
  g.hline(47, y0 + 10, 8, D.p1);
}

function drawerClosed(): PixelSprite {
  const g = new Grid(64, 36);
  g.ellipse(32, 33, 30, 2.2, D.s3);
  drawerFront(g, 4, 26);
  g.rect(0, 30, 64, 2, D.s3);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 32, y: 32 });
}

/** 열린 서랍 64×60: 위에서 보이는 내부(종이 뭉치·도장 패드·펜) + 아래 앞판 */
function drawerOpen(): PixelSprite {
  const g = new Grid(64, 60);
  const r = rng(444);
  g.ellipse(32, 57, 30, 2.4, D.s3);
  // 상자 내부(위에서 본 모습)
  g.rect(2, 2, 60, 28, D.w4);
  g.rect(4, 4, 56, 24, D.w3);
  g.hline(4, 4, 56, D.k0).hline(4, 5, 56, D.w4);
  g.vline(4, 4, 24, D.w4);
  g.speckle(r, D.w2, 0.08, 5, 6, 54, 20, D.w3);
  // 안의 물건: 종이 뭉치 / 잉크 패드 / 연필 / 작은 상자
  g.rect(8, 10, 20, 14, D.p0);
  g.hline(8, 10, 20, D.p1);
  g.vline(27, 10, 14, D.p2);
  g.hline(8, 23, 20, D.p2);
  g.rect(10, 8, 16, 3, D.p1).hline(10, 8, 16, D.p0);
  g.hline(11, 14, 10, D.p2).hline(11, 16, 12, D.p2).hline(11, 18, 8, D.p2);
  g.rect(33, 12, 13, 11, D.k3);
  g.box(33, 12, 13, 11, D.k1);
  g.rect(35, 14, 9, 7, D.r2);
  g.hline(35, 14, 9, D.r1);
  g.set(36, 15, D.r0).set(37, 15, D.r0);
  g.line(50, 9, 56, 22, D.a2).line(51, 9, 57, 22, D.a1);
  g.set(50, 8, D.k2).set(51, 8, D.k2);
  g.rect(49, 24, 8, 3, D.b1).hline(49, 24, 8, D.b3);
  // 앞판(아래, 살짝 밝음)
  g.rect(0, 30, 64, 24, D.w2);
  g.hline(0, 30, 64, D.w0);
  g.hline(0, 31, 64, D.w1);
  g.vline(0, 30, 24, D.w1);
  g.vline(63, 30, 24, D.w3);
  g.hline(0, 53, 64, D.w4);
  g.box(6, 36, 52, 12, D.w3);
  g.box(7, 37, 50, 10, D.w1);
  g.rect(24, 40, 16, 4, D.b2);
  g.hline(24, 40, 16, D.b3);
  g.hline(24, 43, 16, D.b0);
  g.rect(46, 33, 10, 3, D.b1);
  g.rect(47, 34, 8, 1, D.p0);
  g.rect(0, 54, 64, 2, D.s3);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 32, y: 56 });
}

// ───────────────────────── 조사 실 ─────────────────────────

/** 가로 실 16×4: 꼬임이 4칸 주기로 이어진다. 아래 반투명 그림자. */
function threadSeg(c: [string, string, string]): PixelSprite {
  const g = new Grid(16, 4);
  for (let x = 0; x < 16; x++) {
    const ph = x % 4;
    g.set(x, 1, ph < 2 ? c[0] : c[1]);
    g.set(x, 2, ph < 2 ? c[1] : c[2]);
    g.set(x, 3, D.s2);
  }
  return sp(g, { x: 8, y: 2 });
}

/** 황색 점선 실 16×4: 점 10 + 틈 6. 가로로 이어도 점선이 끊김 없이 반복된다. */
function threadDash(): PixelSprite {
  const g = new Grid(16, 4);
  for (let x = 0; x < 10; x++) {
    g.set(x, 1, x % 4 < 2 ? D.y2 : D.y1);
    g.set(x, 2, x % 4 < 2 ? D.y1 : D.y0);
    g.set(x, 3, D.s1);
  }
  g.set(0, 1, D.y2).set(9, 2, D.y0);
  return sp(g, { x: 8, y: 2 });
}

/** 실 매듭 10×10 (꼬리 두 가닥) */
function knot(c: [string, string, string, string]): PixelSprite {
  const g = new Grid(10, 10);
  // 꼬리
  g.line(1, 8, 4, 5, c[1]).line(2, 9, 5, 6, c[2]);
  g.line(8, 8, 6, 5, c[1]).line(9, 9, 6, 6, c[2]);
  // 매듭 덩어리
  g.ellipse(5, 4, 3, 3, c[1]);
  g.ellipse(4.5, 3.5, 1.8, 1.8, c[0]);
  g.set(3, 2, c[3]);
  g.set(6, 5, c[2]).set(5, 6, c[2]).set(6, 6, c[2]);
  g.hline(3, 4, 4, c[2]);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 5, y: 4 });
}

/** 황동 압정 8×10: 실 끝을 고정 */
function pin(): PixelSprite {
  const g = new Grid(8, 10);
  g.ellipse(4, 3, 3.2, 3, D.b2);
  g.ellipse(3.5, 2.5, 1.8, 1.6, D.b3);
  g.set(2, 1, D.p0);
  g.set(5, 4, D.b1).set(4, 5, D.b1).set(5, 5, D.b0);
  g.rect(3, 6, 2, 3, D.k8);
  g.set(3, 9, D.k6);
  g.set(5, 7, D.s3);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 4, y: 3 });
}

export const DESK_UI: Record<string, PixelSprite> = {
  desk_surface: deskSurface(),
  desk_edge: deskEdge(),
  desk_lamp_pool: lampPool(),
  desk_card: deskCard(),
  desk_rules_tile: rulesTile(),
  desk_slip: deskSlip(),
  desk_rulebook_closed: rulebookClosed(),
  desk_rulebook_open: rulebookOpen(),
  desk_rulebook_gutter: rulebookGutter(),
  desk_printer: printer(),
  desk_queue_plaque: queuePlaque(),
  desk_drawer_closed: drawerClosed(),
  desk_drawer_open: drawerOpen(),
  desk_thread_h: threadSeg([D.r0, D.r1, D.r2]),
  desk_thread_dash: threadDash(),
  desk_thread_knot: knot([D.r0, D.r1, D.r2, D.r3]),
  desk_thread_knot_yellow: knot([D.y2, D.y1, D.y0, D.a0]),
  desk_pin: pin(),
};
