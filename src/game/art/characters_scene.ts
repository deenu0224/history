/**
 * 디오라마용 자세 스프라이트(24×36 또는 32×40). 걷기 프레임이 없는 정지 자세라 CHARACTERS 와 따로 둔다.
 *   - pose_kneel_*      : 무릎 꿇고 앉은 시종/궁녀. 프레임 0=정면, 1=왼쪽, 2=오른쪽 (앵커 12,34)
 *   - pose_clerk_packing: 서리가 궤 옆에서 서책을 넣는 두 프레임(왼쪽을 향함)
 *   - pose_decree_*     : 교지(두루마리)를 두 손으로 받들고 선 관원 (정면)
 *   - seat_council_*    : 방석 위에 앉아 낮은 책상(서안)을 앞에 둔 관원. 프레임 0=정면, 1=왼쪽, 2=오른쪽
 * 모든 복식/자세는 재구성이며 고증 전 임시다(SPRITE_META 참고).
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, rng, sprite } from './draw';
import {
  CHAR_H,
  CHAR_W,
  clerk,
  drawFrame,
  finish,
  gungnyeoA,
  gungnyeoB,
  headFront,
  headSide,
  naegwan,
  officialBlue,
  officialGreen,
  officialRed,
  servant,
  type Style,
} from './characters';

// ───────────────────────── 무릎 꿇기 ─────────────────────────

function mound(g: Grid, tones: [string, string, string], pts: [number, number, number][]): void {
  // pts: [y, x0, x1]
  const [t0, t1, t2] = tones;
  for (const [y, x0, x1] of pts) {
    g.hline(x0, y, x1 - x0 + 1, t1);
    g.set(x0, y, t0).set(x0 + 1, y, t0);
    g.set(x1, y, t2).set(x1 - 1, y, t2);
  }
  const last = pts[pts.length - 1];
  g.hline(last[1], last[0], last[2] - last[1] + 1, tones[2]);
}

function kneelFront(st: Style): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  const [r0, r1, r2] = st.robe;
  const sk = st.skirt ?? [r0, r1, r2];
  g.ellipse(12, 33, 10, 2, C.shade1);
  // 하체: 앞으로 모인 무릎 아래 자락
  const pts: [number, number, number][] = [];
  for (let y = 27; y <= 33; y++) {
    const hw = 5 + Math.floor((y - 27) * 0.75);
    pts.push([y, 12 - hw, 12 + hw - 1]);
  }
  mound(g, sk, pts);
  for (let y = 29; y <= 32; y += 2) g.set(12, y, sk[2]).set(11, y + 1, sk[0]);
  g.set(8, 28, sk[0]).set(9, 28, sk[0]);
  // 상체
  for (let y = 20; y <= 28; y++) {
    const w = y === 20 ? 5 : 6;
    g.hline(12 - w, y, w * 2, r1);
    g.set(12 - w, y, r0).set(13 - w, y, r0);
    g.set(11 + w, y, r2).set(10 + w, y, r2);
  }
  g.hline(6, 26, 12, st.belt[0]);
  g.hline(6, 27, 12, st.belt[1]);
  if (st.skirt) g.hline(6, 25, 12, sk[2]);
  // 깃
  g.hline(9, 20, 6, r2);
  g.set(11, 20, st.inner).set(12, 20, st.inner).set(11, 21, st.inner).set(12, 21, st.inner);
  g.set(10, 21, r2).set(13, 21, r2);
  if (st.sash && st.skirt) {
    g.set(11, 22, st.sash[0]).set(12, 22, st.sash[0]);
    g.vline(11, 23, 3, st.sash[0]).vline(12, 23, 3, st.sash[1]);
  }
  // 앞에 모은 손(소매 안으로)
  g.rect(7, 24, 10, 4, r1);
  g.hline(7, 24, 10, r0);
  g.hline(7, 27, 10, r2);
  g.set(7, 25, r0).set(16, 25, r2);
  g.rect(10, 25, 4, 2, st.skin[1]);
  g.hline(10, 26, 4, st.skin[2]);
  headFront(g, st, 0, 5);
  return g;
}

function kneelSide(st: Style, book: 0 | 1 | 2 = 0): Grid {
  const g = new Grid(CHAR_W, CHAR_H);
  const [r0, r1, r2] = st.robe;
  const sk = st.skirt ?? [r0, r1, r2];
  g.ellipse(12, 33, 10, 2, C.shade1);
  // 하체: 앞(왼쪽) 무릎 → 뒤꿈치 위 엉덩이
  const pts: [number, number, number][] = [
    [26, 10, 18],
    [27, 8, 19],
    [28, 7, 19],
    [29, 5, 19],
    [30, 4, 19],
    [31, 4, 19],
    [32, 4, 19],
    [33, 4, 19],
  ];
  mound(g, sk, pts);
  g.set(6, 29, sk[0]).set(5, 30, sk[0]).set(6, 30, sk[0]);
  g.vline(11, 30, 3, sk[2]);
  // 상체(살짝 앞으로 숙임)
  for (let y = 20; y <= 27; y++) {
    const x0 = y < 22 ? 9 : 10;
    g.hline(x0, y, 8, r1);
    g.set(x0, y, r0);
    g.set(x0 + 7, y, r2);
  }
  g.hline(10, 25, 8, st.belt[0]);
  g.hline(10, 26, 8, st.belt[1]);
  if (st.skirt) g.hline(10, 24, 8, sk[2]);
  // 앞으로 내민 팔 + 손
  const ay = book === 2 ? 28 : 24;
  g.rect(6, ay, 8, 3, r1);
  g.hline(6, ay, 8, r0);
  g.hline(6, ay + 2, 8, r2);
  g.rect(4, ay + 1, 3, 2, st.skin[1]);
  g.hline(4, ay + 2, 3, st.skin[2]);
  if (book > 0) {
    // 들고 있는 서책(선장본): book=1 앞에 든 모습, book=2 궤 안에 내려놓는 모습
    const by = book === 1 ? ay - 4 : ay + 2;
    g.rect(0, by, 8, 5, C.hanji0);
    g.hline(0, by, 8, C.hanji1);
    g.rect(1, by + 1, 6, 3, C.blue1);
    g.hline(1, by + 1, 6, C.blue0);
    g.hline(1, by + 3, 6, C.blue2);
    g.set(2, by + 2, C.hanji0).set(2, by + 3, C.hanji0);
    g.set(6, by + 1, C.red1);
    g.hline(4, ay + 1, 3, st.skin[1]);
  }
  headSide(g, st, 0, 5);
  return g;
}

function kneelSprite(st: Style): PixelSprite {
  const f = kneelFront(st);
  const l = kneelSide(st);
  const r = l.flipH();
  return sprite(finish([f, l, r], st), { x: 12, y: 34 });
}

function packingSprite(): PixelSprite {
  return sprite(finish([kneelSide(clerk, 1), kneelSide(clerk, 2)], clerk), { x: 12, y: 34 });
}

// ───────────────────────── 교지를 받든 관원 ─────────────────────────

function decreeOfficial(st: Style): PixelSprite {
  const g = drawFrame(st, 'down', 0);
  const [r0, r1, r2] = st.robe;
  // 앞으로 모은 팔(소매)이 두루마리를 받친다
  g.rect(5, 25, 14, 4, r1);
  g.hline(5, 25, 14, r0);
  g.hline(5, 28, 14, r2);
  g.set(5, 26, r0).set(18, 26, r2);
  // 두루마리(황색 비단) + 축: 가슴 높이, 얼굴·수염 아래
  g.rect(3, 20, 18, 5, C.ochre0);
  g.hline(3, 20, 18, C.lamp0);
  g.hline(3, 21, 18, C.lamp1);
  g.hline(3, 24, 18, C.ochre1);
  g.vline(20, 20, 5, C.ochre2);
  for (const x of [7, 17]) g.vline(x, 21, 3, C.ochre1);
  // 축 마구리(나무)
  g.rect(1, 19, 3, 7, C.wood1).vline(1, 19, 7, C.wood0).hline(1, 25, 3, C.wood3);
  g.rect(20, 19, 3, 7, C.wood1).vline(22, 19, 7, C.wood3).hline(20, 25, 3, C.wood3);
  // 붉은 끈과 늘어진 술
  g.rect(11, 19, 3, 7, C.red1);
  g.vline(11, 19, 7, C.red0).vline(13, 19, 7, C.red2);
  g.vline(12, 26, 3, C.red1);
  g.set(12, 29, C.red2).set(11, 29, C.red2);
  // 손: 두루마리 양끝을 아래에서 받친다
  g.rect(4, 23, 3, 3, st.skin[1]);
  g.rect(17, 23, 3, 3, st.skin[1]);
  g.set(4, 23, st.skin[0]).set(17, 23, st.skin[0]);
  g.hline(4, 25, 3, st.skin[2]).hline(17, 25, 3, st.skin[2]);
  const [out] = finish([g], st);
  return sprite(out, { x: 12, y: 34 });
}

// ───────────────────────── 방석에 앉은 관원 + 낮은 책상 ─────────────────────────

const SW = 32;
const SH = 40;

function cushion(g: Grid, cx: number, y: number, hw: number, tone: [string, string, string]): void {
  g.rect(cx - hw, y, hw * 2, 5, tone[1]);
  g.hline(cx - hw, y, hw * 2, tone[0]);
  g.hline(cx - hw, y + 4, hw * 2, tone[2]);
  g.vline(cx - hw, y, 5, tone[0]);
  g.vline(cx + hw - 1, y, 5, tone[2]);
  g.set(cx - hw, y, C.hanji1).set(cx + hw - 1, y, C.hanji1);
  g.set(cx, y + 2, tone[2]);
}

function councilFront(st: Style, seed: number): Grid {
  const g = new Grid(SW, SH);
  const [r0, r1, r2] = st.robe;
  const r = rng(seed);
  g.ellipse(16, 38, 14, 2, C.shade1);
  // 방석
  cushion(g, 16, 32, 11, [C.hanji0, C.hanji1, C.hanji2]);
  g.hline(5, 36, 22, C.shade1);
  g.hline(5, 32, 22, st.robe[1]);
  g.hline(5, 36, 22, st.robe[2]);
  // 책상다리 하체
  for (let y = 28; y <= 35; y++) {
    const w = 7 + Math.floor((y - 28) * 0.55);
    g.hline(16 - w, y, w * 2, r1);
    g.set(16 - w, y, r0).set(17 - w, y, r0);
    g.set(15 + w, y, r2).set(14 + w, y, r2);
  }
  g.hline(5, 35, 22, r2);
  g.set(12, 33, r2).set(13, 34, r2).set(20, 33, r2).set(19, 34, r2);
  // 상체
  for (let y = 19; y <= 29; y++) {
    const w = y === 19 ? 6 : 7;
    g.hline(16 - w, y, w * 2, r1);
    g.set(16 - w, y, r0).set(17 - w, y, r0);
    g.set(15 + w, y, r2).set(14 + w, y, r2);
  }
  g.hline(9, 27, 14, st.belt[0]);
  g.hline(9, 28, 14, st.belt[1]);
  g.set(14, 27, C.ochre0).set(17, 27, C.ochre0);
  // 깃 + 흉배
  g.hline(13, 19, 6, r2);
  g.set(15, 19, st.inner).set(16, 19, st.inner).set(15, 20, st.inner).set(16, 20, st.inner);
  g.set(14, 20, r2).set(17, 20, r2);
  if (st.badge) {
    g.rect(14, 22, 5, 4, st.badge[0]);
    g.box(14, 22, 5, 4, st.badge[1]);
    g.set(16, 23, st.badge[1]);
  }
  headFront(g, st, 4, 4);
  // 낮은 책상(서안): 윗면 + 앞 판 + 짧은 다리
  g.rect(3, 29, 26, 5, C.wood0);
  g.hline(3, 29, 26, C.hanji2);
  g.rect(24, 30, 5, 4, C.wood1);
  g.hline(3, 33, 26, C.wood1);
  for (let i = 0; i < 3; i++) g.hline(5 + i * 7, 31 + (i % 2), 5, C.wood1);
  g.rect(3, 34, 26, 2, C.wood2);
  g.hline(3, 34, 26, C.wood1);
  g.hline(3, 35, 26, C.wood3);
  g.rect(5, 36, 3, 2, C.wood3).rect(24, 36, 3, 2, C.wood3);
  g.set(3, 28, C.wood0).set(28, 28, C.wood0);
  // 문서 + 붓
  g.rect(11, 30, 10, 3, C.hanji0);
  g.hline(11, 30, 10, C.hanji1);
  g.hline(12, 31, 5, C.ink1);
  g.set(18, 31, C.ink2);
  g.line(21, 31, 25, 29, C.ochre1);
  g.set(26, 29, C.ink2);
  g.rect(5, 30, 4, 3, C.ink2).hline(5, 30, 4, C.ink0);
  // 소매가 책상 위에 얹힘
  g.rect(7, 27, 6, 4, r1);
  g.hline(7, 27, 6, r0);
  g.hline(7, 30, 6, r2);
  g.rect(19, 27, 6, 4, r1);
  g.hline(19, 27, 6, r0);
  g.hline(19, 30, 6, r2);
  g.rect(12, 28, 2, 2, st.skin[1]);
  g.rect(18, 28, 2, 2, st.skin[1]);
  r();
  return g;
}

function councilSide(st: Style, seed: number): Grid {
  // 왼쪽을 바라보며 앉음: 책상은 왼쪽(그의 앞)
  const g = new Grid(SW, SH);
  const [r0, r1, r2] = st.robe;
  const r = rng(seed);
  g.ellipse(17, 38, 14, 2, C.shade1);
  cushion(g, 19, 32, 10, [C.hanji0, C.hanji1, C.hanji2]);
  g.hline(9, 32, 20, st.robe[1]);
  g.hline(9, 36, 20, st.robe[2]);
  // 하체(앞쪽 무릎이 왼쪽으로)
  for (let y = 28; y <= 35; y++) {
    const x0 = y < 30 ? 14 : y < 32 ? 12 : 11;
    g.hline(x0, y, 27 - x0 - 3, r1);
    g.set(x0, y, r0).set(x0 + 1, y, r0);
    g.set(23, y, r2).set(22, y, r2);
  }
  g.hline(11, 35, 13, r2);
  // 상체
  for (let y = 19; y <= 29; y++) {
    const x0 = y < 22 ? 15 : 16;
    g.hline(x0, y, 9, r1);
    g.set(x0, y, r0);
    g.set(x0 + 8, y, r2).set(x0 + 7, y, r2);
  }
  g.hline(16, 27, 9, st.belt[0]);
  g.hline(16, 28, 9, st.belt[1]);
  headSide(g, st, 6, 4);
  // 낮은 책상: 옆모습(좁고 세로로 긴 판)
  g.rect(2, 24, 9, 11, C.wood0);
  g.hline(2, 24, 9, C.hanji2);
  g.vline(2, 24, 11, C.wood0);
  g.rect(8, 25, 3, 10, C.wood1);
  for (let i = 0; i < 3; i++) g.vline(4 + i * 2, 26 + (i % 2) * 2, 5, C.wood1);
  g.rect(2, 35, 9, 2, C.wood2);
  g.hline(2, 35, 9, C.wood1);
  g.hline(2, 36, 9, C.wood3);
  g.rect(3, 37, 2, 1, C.wood3).rect(8, 37, 2, 1, C.wood3);
  // 문서 + 붓
  g.rect(4, 27, 5, 7, C.hanji0);
  g.hline(4, 27, 5, C.hanji1);
  g.vline(8, 27, 7, C.hanji1);
  g.vline(5, 29, 3, C.ink1).vline(7, 29, 2, C.ink1);
  g.line(10, 30, 7, 26, C.ochre1);
  g.set(7, 25, C.ink2);
  // 앞으로 뻗은 팔
  g.rect(8, 28, 8, 3, r1);
  g.hline(8, 28, 8, r0);
  g.hline(8, 30, 8, r2);
  g.rect(6, 28, 3, 3, st.skin[1]);
  g.hline(6, 30, 3, st.skin[2]);
  r();
  return g;
}

function councilSprite(st: Style, seed: number): PixelSprite {
  const f = councilFront(st, seed);
  const l = councilSide(st, seed + 1);
  const rg = l.flipH();
  const frames = [f, l, rg];
  // 외곽선: 로브/피부/나무 등 재질별(characters.finish 와 동일 규칙) + 책상 나무
  frames.forEach((g) =>
    g.outline((n) => {
      if (n === C.wood0 || n === C.wood1 || n === C.wood2 || n === C.wood3) return C.wood3;
      if (n === C.hanji0 || n === C.hanji1 || n === C.hanji2) return C.ink1;
      if (st.robe.slice(0, 3).includes(n)) return st.robe[3];
      if (st.skin.includes(n)) return C.skin3;
      if (n === C.shade1 || n === C.shade0 || n === C.shade2) return undefined;
      return C.ink3;
    }),
  );
  return sprite(frames, { x: 16, y: 38 });
}

export const SCENE_POSES: Record<string, PixelSprite> = {
  pose_kneel_naegwan: kneelSprite(naegwan),
  pose_kneel_gungnyeo_a: kneelSprite(gungnyeoA),
  pose_kneel_gungnyeo_b: kneelSprite(gungnyeoB),
  pose_kneel_servant: kneelSprite(servant),
  pose_clerk_packing: packingSprite(),
  pose_decree_red: decreeOfficial(officialRed),
  pose_decree_blue: decreeOfficial(officialBlue),
  seat_council_red: councilSprite(officialRed, 31),
  seat_council_blue: councilSprite(officialBlue, 41),
  seat_council_green: councilSprite(officialGreen, 51),
};
