/**
 * 관측 디오라마(대조전·교지·회의·인쇄 보관) 전용 오브젝트. 전부 재구성이며 고증 전 임시다(SPRITE_META 참고).
 * 앵커 = 바닥 접지점 중앙. `SCENE_FLAT_OBJECTS` 에 든 것은 바닥에 깔리는 것이라 캐릭터보다 항상 아래에 그린다.
 */
import type { PixelSprite } from './pixel';
import { C } from './palettes';
import { Grid, autoOutline, rng, sprite } from './draw';

const softShadow = (g: Grid, cx: number, cy: number, rx: number, ry: number) => {
  g.ellipse(cx, cy, rx, ry, C.shade0);
  g.ellipse(cx, cy, Math.max(1, rx - 2), Math.max(1, ry - 1), C.shade1);
};

/** 반투명 글로우/그림자를 외곽선 대상에서 빼고 외곽선 */
function outlineSolid(g: Grid): Grid {
  return autoOutline(g);
}

// ───────────────────────── 휘장 ─────────────────────────

const CURTAIN_TONES = [C.blue0, C.blue1, C.blue2, C.blue3] as const;

/** 휘장(걸개 천). 전체가 내려온 모양. 32×64 */
function hwijangClosed(): PixelSprite {
  const g = new Grid(32, 64);
  g.ellipse(16, 62, 14, 1.6, C.shade1);
  // 걸이대
  g.rect(0, 0, 32, 3, C.wood1);
  g.hline(0, 0, 32, C.wood0);
  g.hline(0, 2, 32, C.wood3);
  g.rect(0, 0, 2, 5, C.wood2).rect(30, 0, 2, 5, C.wood2);
  // 천: 세로 주름(사인 파)
  for (let x = 1; x < 31; x++) {
    const t = Math.sin((x / 30) * Math.PI * 7 + 0.6);
    const tone = t > 0.55 ? CURTAIN_TONES[0] : t > 0 ? CURTAIN_TONES[1] : t > -0.55 ? CURTAIN_TONES[2] : CURTAIN_TONES[3];
    const bottom = 55 + Math.round(t * 1.2);
    for (let y = 4; y <= bottom; y++) g.set(x, y, tone);
    // 위쪽 개더링 그늘
    g.set(x, 4, CURTAIN_TONES[3]);
    g.set(x, 5, t > 0 ? CURTAIN_TONES[2] : CURTAIN_TONES[3]);
    // 아랫단 띠(황토색 장식 선)
    for (let y = bottom - 5; y <= bottom - 3; y++) g.set(x, y, y === bottom - 4 ? C.ochre1 : C.ochre2);
    if (x % 4 === 1) g.set(x, bottom - 4, C.ochre0);
    g.set(x, bottom, CURTAIN_TONES[3]);
  }
  // 걸이 고리
  for (let x = 3; x < 31; x += 5) g.set(x, 3, C.ochre1).set(x, 4, C.ochre2);
  // 중간 가는 가로 비침(천 결)
  for (let y = 10; y < 46; y += 7) for (let x = 1; x < 31; x += 3) if (g.get(x, y) === CURTAIN_TONES[1]) g.set(x, y, CURTAIN_TONES[0]);
  // 바닥 그림자 겹침
  g.hline(2, 57, 28, C.shade1);
  return sprite(outlineSolid(g), { x: 16, y: 58 });
}

/** 휘장을 걷어 묶은 모양. 양옆으로 몰린 천 + 가운데 비움. 64×64 (두 칸 폭) */
function hwijangTied(): PixelSprite {
  const g = new Grid(64, 64);
  g.ellipse(32, 62, 28, 1.6, C.shade1);
  g.rect(0, 0, 64, 3, C.wood1);
  g.hline(0, 0, 64, C.wood0);
  g.hline(0, 2, 64, C.wood3);
  g.rect(0, 0, 2, 5, C.wood2).rect(62, 0, 2, 5, C.wood2);
  const side = (x0: number, dir: 1 | -1) => {
    for (let i = 0; i < 14; i++) {
      const x = dir === 1 ? x0 + i : x0 - i;
      const t = Math.sin((i / 13) * Math.PI * 3.2 + 0.4);
      const tone = t > 0.5 ? CURTAIN_TONES[0] : t > -0.1 ? CURTAIN_TONES[1] : t > -0.6 ? CURTAIN_TONES[2] : CURTAIN_TONES[3];
      // 가운데로 갈수록 천이 위로 걷어 올라간 모양(사선 아랫단)
      const bottom = 56 - Math.round(i * (i < 7 ? 1.2 : 0.4)) + (dir === 1 ? 0 : 0);
      for (let y = 4; y <= 56 - Math.round(Math.max(0, 13 - i) * 0.0) && y <= 56; y++) {
        if (y > 56 - Math.round((i / 13) * 14)) break;
        g.set(x, y, tone);
      }
      void bottom;
    }
  };
  side(2, 1);
  side(61, -1);
  // 묶는 끈 + 술
  for (const [cx, dir] of [[8, 1], [55, -1]] as const) {
    g.rect(cx - 4, 27, 9, 3, C.ochre1);
    g.hline(cx - 4, 27, 9, C.ochre0);
    g.hline(cx - 4, 29, 9, C.ochre3);
    g.vline(cx + dir * 0, 30, 6, C.red1);
    g.vline(cx + dir * 1, 30, 5, C.red2);
    g.set(cx, 36, C.red0);
  }
  // 걸이 고리
  for (let x = 3; x < 62; x += 5) if (x < 17 || x > 46) g.set(x, 3, C.ochre1).set(x, 4, C.ochre2);
  // 아랫단 띠
  for (let i = 0; i < 14; i++) {
    for (const x of [2 + i, 61 - i]) {
      const yb = 56 - Math.round((i / 13) * 14);
      g.set(x, yb - 2, C.ochre2).set(x, yb - 3, C.ochre1);
    }
  }
  return sprite(outlineSolid(g), { x: 32, y: 58 });
}

// ───────────────────────── 병풍 변형 ─────────────────────────

/** 병풍(수묵 대나무) 64×48. 일반 구도 자리표시(TEMP). */
function screenBamboo(): PixelSprite {
  const g = new Grid(64, 48);
  softShadow(g, 32, 45, 29, 2.5);
  const panels = 5;
  const pw = 12;
  const x0 = 2;
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw;
    const top = 3 + (i % 2) * 2;
    const bottom = 42;
    const h = bottom - top;
    g.rect(px, top, pw, h, C.wood2);
    g.rect(px + 1, top + 1, pw - 2, h - 2, C.hanji1);
    g.rect(px + 2, top + 2, pw - 4, h - 4, C.hanji0);
    g.hline(px, top, pw, C.wood1);
    g.vline(px, top, h, C.wood1);
    g.vline(px + pw - 1, top, h, C.wood3);
    g.hline(px, bottom - 1, pw, C.wood3);
    const shadeSide = i % 2 === 0 ? px + pw - 3 : px + 2;
    g.vline(shadeSide, top + 2, h - 4, C.hanji1);
    g.hline(px + 1, top + 1, pw - 2, C.red2);
    g.hline(px + 1, bottom - 2, pw - 2, C.red2);
  }
  const r = rng(2203);
  // 대나무 줄기: 패널을 가로질러 서 있는 세 그루
  const stalk = (x: number, y0: number, y1: number, tone: string, light: string) => {
    for (let y = y0; y < y1; y++) {
      g.set(x, y, tone).set(x + 1, y, light);
      if ((y - y0) % 7 === 5) {
        g.set(x - 1, y, tone).set(x + 2, y, tone);
      }
    }
  };
  stalk(10, 8, 40, C.green2, C.green1);
  stalk(24, 6, 40, C.green2, C.green1);
  stalk(41, 9, 40, C.green2, C.green1);
  stalk(53, 8, 40, C.green1, C.green0);
  // 잎: 짧은 사선 획
  const leaf = (x: number, y: number, dir: 1 | -1, tone: string) => {
    g.line(x, y, x + dir * 4, y + 2, tone);
    g.line(x, y + 1, x + dir * 3, y + 3, tone);
  };
  for (let i = 0; i < 26; i++) {
    const sx = [10, 24, 41, 53][i % 4];
    const sy = 9 + Math.floor(r() * 26);
    const dir = r() < 0.5 ? -1 : 1;
    leaf(sx + (dir === 1 ? 1 : 0), sy, dir as 1 | -1, r() < 0.6 ? C.green2 : C.green1);
  }
  // 바위 + 안개
  g.ellipse(33, 38, 7, 2.6, C.ink1).ellipse(31, 37, 4, 2, C.ink0);
  for (let x = 4; x < 58; x++) if (x % 7 < 4 && g.get(x, 32) === C.hanji0) g.set(x, 32, C.hanji1);
  // 낙관 + 먹 점(글자 아님)
  g.rect(55, 36, 3, 3, C.red1).set(56, 37, C.red0);
  for (const [x, y] of [[6, 9], [6, 12], [7, 15], [18, 11], [18, 14]]) g.set(x, y, C.ink1);
  for (let i = 0; i < panels; i++) g.hline(x0 + i * pw, 41, pw, C.wood3);
  return sprite(outlineSolid(g), { x: 32, y: 44 });
}

/** 낮은 침병(머리맡 병풍) 64×32. 그림 없는 비단 면 + 붉은 띠. */
function screenLow(): PixelSprite {
  const g = new Grid(64, 32);
  softShadow(g, 32, 29, 29, 2.2);
  const panels = 4;
  const pw = 15;
  const x0 = 2;
  for (let i = 0; i < panels; i++) {
    const px = x0 + i * pw;
    const top = 4 + (i % 2);
    const bottom = 27;
    g.rect(px, top, pw, bottom - top, C.wood2);
    g.rect(px + 1, top + 1, pw - 2, bottom - top - 2, C.ochre1);
    g.rect(px + 2, top + 2, pw - 4, bottom - top - 4, C.ochre0);
    g.hline(px, top, pw, C.wood1);
    g.vline(px, top, bottom - top, C.wood1);
    g.vline(px + pw - 1, top, bottom - top, C.wood3);
    g.hline(px, bottom - 1, pw, C.wood3);
    // 비단 결과 문양(작은 마름모, 4칸 간격)
    for (let yy = top + 5; yy < bottom - 4; yy += 4)
      for (let xx = px + 4 + ((yy / 4) % 2) * 2; xx < px + pw - 3; xx += 4) g.set(xx, yy, C.ochre1);
    const sh = i % 2 === 0 ? px + pw - 3 : px + 2;
    g.vline(sh, top + 2, bottom - top - 4, C.ochre1);
    g.hline(px + 1, top + 1, pw - 2, C.red2);
    g.hline(px + 1, bottom - 2, pw - 2, C.red2);
  }
  return sprite(outlineSolid(g), { x: 32, y: 28 });
}

// ───────────────────────── 이부자리(몸 없음, 정돈된 자리만) ─────────────────────────

/**
 * 정돈된 이부자리 64×48. 누운 사람 형상이 없다: 평평하게 펴 놓은 비단 이불 + 머리맡 베개 + 앞쪽으로 드리운 자락.
 */
function bedding(): PixelSprite {
  const g = new Grid(64, 48);
  const r = rng(3303);
  softShadow(g, 32, 44, 29, 3);
  // 요(바닥 깔개): 앞으로 약간 보이는 두꺼운 단면
  g.rect(3, 14, 58, 26, C.hanji1);
  g.hline(3, 14, 58, C.hanji0);
  g.rect(3, 36, 58, 4, C.hanji2);
  g.hline(3, 36, 58, C.hanji1);
  g.hline(3, 39, 58, C.hanji3);
  g.vline(60, 15, 24, C.hanji2);
  // 요 바느질 선
  for (let x = 6; x < 58; x += 2) g.set(x, 17, C.hanji2);
  // 비단 이불(평평): 얕은 청록
  g.rect(14, 16, 44, 22, C.green1);
  g.hline(14, 16, 44, C.green0);
  g.vline(14, 16, 22, C.green0);
  g.vline(57, 17, 21, C.green2);
  g.hline(15, 37, 43, C.green2);
  // 비단 결(연한 마름모 누비 + 가는 결)
  for (let y = 19; y < 36; y += 4)
    for (let x = 18 + ((y / 4) % 2) * 3; x < 56; x += 6) {
      g.set(x, y, C.green0);
      g.set(x + 1, y + 1, C.green2);
    }
  g.speckle(r, C.green0, 0.03, 15, 17, 42, 20, C.green1);
  // 이불 끝 띠(발치 쪽 오른쪽): 황토색
  g.rect(50, 16, 4, 22, C.ochre1);
  g.vline(50, 16, 22, C.ochre0);
  g.vline(53, 17, 21, C.ochre2);
  for (let y = 18; y < 36; y += 3) g.set(51, y, C.ochre0).set(52, y + 1, C.ochre2);
  // 앞으로 드리운 이불자락(아래 가장자리 주름)
  for (let x = 14; x < 58; x++) {
    const t = Math.sin(x * 0.55);
    const hgt = 3 + Math.round(t * 1.1);
    for (let k = 0; k < hgt; k++) g.set(x, 38 + k, k === hgt - 1 ? C.green3 : t > 0 ? C.green2 : C.green1);
  }
  g.hline(14, 38, 44, C.green2);
  // 베개(머리맡): 목침 + 비단 보
  g.rect(5, 19, 9, 14, C.wood1);
  g.hline(5, 19, 9, C.wood0);
  g.vline(5, 19, 14, C.wood0);
  g.hline(5, 32, 9, C.wood3);
  g.rect(7, 22, 5, 8, C.red1);
  g.vline(7, 22, 8, C.red0);
  g.vline(11, 23, 7, C.red2);
  g.set(9, 26, C.ochre1);
  // 가장자리 정리
  g.set(3, 14, '.').set(60, 14, '.');
  return sprite(outlineSolid(g), { x: 32, y: 42 });
}

// ───────────────────────── 소반 / 교지 받침 / 서안 / 방석 / 돗자리 ─────────────────────────

function soban(): PixelSprite {
  const g = new Grid(24, 28);
  softShadow(g, 12, 25, 10, 2);
  // 다리
  g.rect(4, 17, 2, 7, C.wood2).rect(18, 17, 2, 7, C.wood2).rect(11, 19, 2, 5, C.wood3);
  g.vline(4, 17, 7, C.wood1);
  // 상판(둥근 소반)
  g.ellipse(12, 13, 10, 5, C.wood1);
  g.ellipse(12, 12, 10, 4.4, C.wood0);
  g.ring(12, 12, 9, 3.6, C.wood1);
  g.hline(5, 17, 14, C.wood3);
  // 뚜껑 덮인 그릇(청자빛)
  g.ellipse(12, 11, 4.4, 2.6, C.green1);
  g.ellipse(12, 9, 3.6, 2.4, C.green0);
  g.ellipse(12, 7, 1.4, 1, C.green1);
  g.set(10, 8, C.hanji0);
  g.hline(8, 12, 8, C.green2);
  return sprite(outlineSolid(g), { x: 12, y: 24 });
}

/** 교지를 올린 낮은 붉은 칠 받침 32×32 */
function decreeStand(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 28, 13, 2.6);
  // 다리
  g.rect(5, 20, 3, 8, C.red2).rect(24, 20, 3, 8, C.red2);
  g.vline(5, 20, 8, C.red1);
  // 상판
  g.rect(2, 14, 28, 7, C.red1);
  g.hline(2, 14, 28, C.red0);
  g.rect(24, 15, 6, 6, C.red2);
  g.hline(2, 20, 28, C.red3);
  g.hline(4, 17, 14, C.red2);
  // 두루마리
  g.rect(5, 8, 22, 6, C.ochre0);
  g.hline(5, 8, 22, C.lamp0);
  g.hline(5, 9, 22, C.lamp1);
  g.hline(5, 13, 22, C.ochre1);
  g.vline(26, 8, 6, C.ochre2);
  g.rect(3, 7, 3, 8, C.wood1).vline(3, 7, 8, C.wood0).hline(3, 14, 3, C.wood3);
  g.rect(26, 7, 3, 8, C.wood1).vline(28, 7, 8, C.wood3).hline(26, 14, 3, C.wood3);
  g.rect(14, 7, 3, 8, C.red1).vline(14, 7, 8, C.red0).vline(16, 7, 8, C.red2);
  g.vline(15, 15, 3, C.red1).set(15, 18, C.red2);
  return sprite(outlineSolid(g), { x: 16, y: 28 });
}

/** 빈 낮은 책상 32×32 */
function lowDesk(): PixelSprite {
  const g = new Grid(32, 32);
  softShadow(g, 16, 28, 14, 3);
  g.rect(4, 21, 3, 7, C.wood2).rect(25, 21, 3, 7, C.wood2);
  g.vline(4, 21, 7, C.wood1);
  g.rect(7, 21, 18, 4, C.wood1);
  g.hline(7, 21, 18, C.wood0);
  g.ellipse(16, 25, 4, 1.6, '.');
  g.hline(12, 26, 8, C.wood3);
  g.rect(2, 11, 28, 10, C.wood0);
  g.hline(2, 11, 28, C.hanji2);
  g.rect(2, 19, 28, 2, C.wood1);
  g.hline(2, 20, 28, C.wood2);
  const r = rng(77);
  g.speckle(r, C.wood1, 0.05, 3, 12, 26, 7, C.wood0);
  for (let i = 0; i < 4; i++) g.hline(4 + i * 6, 13 + (i % 3) * 2, 4, C.wood1);
  g.set(2, 10, C.wood0).set(3, 10, C.wood0).set(29, 10, C.wood0).set(28, 10, C.wood0);
  return sprite(outlineSolid(g), { x: 16, y: 28 });
}

function cushionSprite(tone: 'red' | 'blue' | 'green' | 'plain'): PixelSprite {
  const g = new Grid(32, 32);
  const [t0, t1, t2] =
    tone === 'red' ? [C.red0, C.red1, C.red2] : tone === 'blue' ? [C.blue0, C.blue1, C.blue2] : tone === 'green' ? [C.green0, C.green1, C.green2] : [C.hanji0, C.hanji1, C.hanji2];
  softShadow(g, 16, 25, 12, 3);
  g.rect(5, 16, 22, 7, t1);
  g.hline(5, 16, 22, t0);
  g.vline(5, 16, 7, t0);
  g.hline(5, 22, 22, t2);
  g.vline(26, 16, 7, t2);
  g.rect(7, 17, 18, 4, t1);
  g.hline(7, 17, 18, t0);
  g.set(15, 19, t2).set(16, 19, t2).set(15, 20, t2);
  // 모서리 술
  for (const [x, y] of [[5, 16], [26, 16], [5, 22], [26, 22]]) g.set(x, y, C.ochre1);
  g.set(5, 16, C.ochre0);
  return sprite(outlineSolid(g), { x: 16, y: 25 });
}

/** 방석 세 장 줄 96×32 */
function cushionRow(): PixelSprite {
  const g = new Grid(96, 32);
  const tones: ('red' | 'blue' | 'green')[] = ['blue', 'red', 'green'];
  tones.forEach((t, i) => g.paste(Grid.from(cushionSprite(t).frames[0]), i * 32, 0));
  // 팔레트 글자를 master 로 되돌릴 필요 없음: cushionSprite 가 master 팔레트를 쓴다.
  void g;
  return sprite(g, { x: 48, y: 25 });
}

/** 돗자리(왕골) 32×32 타일: 이어 붙여 통로 깔개로 쓴다. 바닥에 깔림. */
function mat(): PixelSprite {
  const g = new Grid(32, 32, C.hanji1);
  const r = rng(555);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const warp = (x + (Math.floor(y / 2) % 2) * 2) % 4;
      g.set(x, y, warp < 2 ? C.hanji1 : C.hanji0);
      if (y % 8 === 7) g.set(x, y, C.hanji2);
    }
  g.speckle(r, C.hanji2, 0.04, 0, 0, 32, 32);
  g.speckle(r, C.ochre0, 0.02, 0, 0, 32, 32);
  // 양 끝 가선(천 테두리)
  g.rect(0, 0, 32, 2, C.green2).hline(0, 0, 32, C.green1);
  g.rect(0, 30, 32, 2, C.green2).hline(0, 31, 32, C.green3);
  return sprite(g, { x: 16, y: 16 });
}

// ───────────────────────── 서책 더미 / 궤 / 판가 ─────────────────────────

/** 선장본 한 권(옆에서 본 책등 + 쪽배). 위에서 쌓을 때 쓴다. */
function volume(g: Grid, x: number, y: number, w: number, h: number, cover: [string, string, string], tie = true): void {
  g.rect(x, y, w, h, C.hanji0);
  for (let j = 1; j < h; j += 2) g.hline(x + 1, y + j, w - 2, C.hanji1);
  g.hline(x, y + h - 1, w, C.hanji2);
  // 앞뒤 표지(위/아래 얇은 판)
  g.hline(x, y, w, cover[0]);
  g.hline(x, y + h - 1, w, cover[2]);
  g.vline(x, y, h, cover[1]);
  g.vline(x + w - 1, y, h, cover[2]);
  if (tie) {
    // 오침안정법 실 자국(책배 쪽)
    g.set(x + 1, y + 1, C.red1);
    g.set(x + 1, y + h - 2, C.red1);
  }
}

/** 인쇄본 서책 높이 쌓은 더미 32×48 */
function bookPileTall(): PixelSprite {
  const g = new Grid(32, 48);
  softShadow(g, 16, 44, 13, 3);
  const covers: [string, string, string][] = [
    [C.blue0, C.blue1, C.blue3],
    [C.ochre0, C.ochre1, C.ochre3],
    [C.green0, C.green1, C.green3],
    [C.blue0, C.blue1, C.blue3],
    [C.red0, C.red1, C.red3],
    [C.ochre0, C.ochre1, C.ochre3],
    [C.green0, C.green1, C.green3],
  ];
  let y = 40;
  const r = rng(808);
  covers.forEach((c, i) => {
    const h = 4 + (i % 2);
    const dx = Math.floor(r() * 4) - 2;
    const w = 22 - (i > 4 ? 2 : 0) + (i % 3);
    y -= h;
    volume(g, 5 + dx + (i > 4 ? 1 : 0), y, w, h, c);
  });
  // 맨 위 제첨 쪽지
  g.rect(12, y - 1, 6, 2, C.hanji0);
  g.set(13, y - 1, C.ink1).set(15, y - 1, C.ink1);
  return sprite(outlineSolid(g), { x: 16, y: 42 });
}

/** 보자기로 싼 서책 묶음 32×36 */
function bookBundle(): PixelSprite {
  const g = new Grid(32, 36);
  softShadow(g, 16, 32, 13, 3);
  // 천 덩어리
  g.rect(4, 12, 24, 18, C.blue1);
  g.rect(5, 10, 22, 3, C.blue1);
  g.hline(5, 10, 22, C.blue0);
  g.hline(4, 12, 24, C.blue0);
  g.vline(4, 12, 18, C.blue0);
  g.vline(27, 12, 18, C.blue2);
  g.hline(4, 29, 24, C.blue3);
  // 주름
  g.line(8, 14, 12, 28, C.blue2);
  g.line(22, 13, 18, 27, C.blue2);
  g.line(15, 12, 16, 22, C.blue0);
  g.speckle(rng(99), C.blue2, 0.05, 5, 13, 22, 16, C.blue1);
  // 묶음 매듭(위)
  g.rect(13, 7, 6, 4, C.blue2);
  g.set(14, 7, C.blue0);
  g.line(12, 9, 8, 6, C.blue1).line(19, 9, 24, 6, C.blue1);
  // 끈
  g.vline(15, 12, 17, C.red1);
  g.vline(16, 12, 17, C.red2);
  g.hline(5, 21, 22, C.red1);
  g.set(15, 21, C.red0).set(16, 21, C.red0);
  return sprite(outlineSolid(g), { x: 16, y: 31 });
}

/** 낱장 인쇄지 더미(제본 전) 32×28 */
function sheetsPile(): PixelSprite {
  const g = new Grid(32, 28);
  softShadow(g, 16, 25, 13, 2.6);
  // 접지(반으로 접은 인쇄 종이) 두 더미
  const stack = (x: number, y: number, w: number, h: number) => {
    g.rect(x, y, w, h, C.hanji0);
    g.hline(x, y, w, C.hanji1);
    for (let j = 2; j < h - 1; j += 2) g.hline(x + 1, y + j, w - 2, C.hanji1);
    g.hline(x, y + h - 1, w, C.hanji2);
    g.vline(x + w - 1, y, h, C.hanji2);
    g.vline(x, y, h, C.hanji1);
  };
  stack(3, 14, 15, 8);
  stack(14, 11, 15, 11);
  // 윗면 인쇄 흔적(글자 흉내 없는 작은 줄 칸)
  g.rect(16, 11, 11, 1, C.hanji0);
  for (let j = 0; j < 3; j++) g.hline(17, 12 + j * 0, 9, C.hanji1);
  g.hline(5, 14, 11, C.hanji1);
  g.vline(10, 14, 1, C.ink1).vline(13, 14, 1, C.ink1);
  g.vline(20, 11, 1, C.ink1).vline(23, 11, 1, C.ink1);
  // 위에 얹은 판자(눌러 놓은 판)
  g.rect(9, 9, 14, 3, C.wood1);
  g.hline(9, 9, 14, C.wood0);
  g.hline(9, 11, 14, C.wood3);
  return sprite(outlineSolid(g), { x: 16, y: 24 });
}

/** 열린 궤 32×40: 뚜껑이 뒤로 젖혀지고 서책이 보인다 */
function chestOpen(): PixelSprite {
  const g = new Grid(32, 40);
  softShadow(g, 16, 36, 14, 3);
  // 뚜껑(뒤로 세워짐: 안쪽 면이 보임)
  g.rect(4, 2, 24, 12, C.wood2);
  g.hline(4, 2, 24, C.wood1);
  g.vline(4, 2, 12, C.wood1);
  g.vline(27, 2, 12, C.wood3);
  g.rect(6, 4, 20, 8, C.wood3);
  g.hline(6, 4, 20, C.wood2);
  for (const x of [4, 24]) {
    g.rect(x, 2, 4, 12, C.ink1);
    g.vline(x, 2, 12, C.ink0);
  }
  g.set(5, 5, C.ochre1).set(5, 10, C.ochre1).set(25, 5, C.ochre1).set(25, 10, C.ochre1);
  // 몸통 윗면(열린 안쪽): 서책 책배가 가득
  g.rect(3, 14, 26, 8, C.wood3);
  g.hline(3, 14, 26, C.wood2);
  const vols: [number, number, number][] = [
    [5, 3, 0],
    [8, 3, 1],
    [11, 3, 2],
    [14, 3, 0],
    [17, 3, 2],
    [20, 3, 1],
    [23, 3, 0],
  ];
  const covers: [string, string][] = [
    [C.blue1, C.blue0],
    [C.ochre1, C.ochre0],
    [C.green1, C.green0],
  ];
  for (const [x, w, k] of vols) {
    g.rect(x, 14, w, 7, C.hanji0);
    g.hline(x, 14, w, covers[k][1]);
    g.hline(x, 15, w, covers[k][0]);
    g.vline(x + w, 14, 7, C.wood3);
    g.hline(x, 17, w - 1, C.hanji1);
    g.hline(x, 19, w - 1, C.hanji1);
  }
  // 몸통 앞면
  g.rect(3, 22, 26, 12, C.wood1);
  g.hline(3, 22, 26, C.wood0);
  g.rect(3, 31, 26, 3, C.wood2);
  g.rect(26, 22, 3, 12, C.wood2);
  for (let x = 9; x < 24; x += 7) g.vline(x, 23, 8, C.wood2);
  for (const x of [3, 25]) {
    g.rect(x, 14, 4, 20, C.ink1);
    g.vline(x, 14, 20, C.ink0);
    g.set(x + 1, 17, C.ochre1).set(x + 1, 25, C.ochre1).set(x + 1, 31, C.ochre1);
  }
  g.stamp(['o.o.o', 'ooooo', '.ooo.', '.oko.', '.ooo.'], { o: C.ochre1, k: C.ink3 }, 14, 25);
  return sprite(outlineSolid(g), { x: 16, y: 34 });
}

/** 긴 궤(두 칸 폭) 64×32. 닫힘. */
function chestLong(): PixelSprite {
  const g = new Grid(64, 32);
  softShadow(g, 32, 28, 28, 3);
  g.rect(3, 8, 58, 8, C.wood0);
  g.hline(3, 8, 58, C.hanji2);
  g.rect(52, 9, 9, 7, C.wood1);
  const r = rng(88);
  for (let i = 0; i < 4; i++) g.hline(6 + Math.floor(r() * 10), 10 + i * 2 - (i > 2 ? 1 : 0), 14 + Math.floor(r() * 12), C.wood1);
  g.rect(3, 16, 58, 4, C.wood1);
  g.hline(3, 16, 58, C.wood0);
  g.rect(3, 20, 58, 8, C.wood1);
  g.hline(3, 20, 58, C.wood3);
  g.rect(3, 26, 58, 2, C.wood2);
  g.rect(58, 20, 3, 8, C.wood2);
  for (let x = 12; x < 56; x += 11) g.vline(x, 21, 5, C.wood2);
  for (const x of [3, 20, 41, 57]) {
    g.rect(x, 8, 4, 20, C.ink1);
    g.vline(x, 8, 20, C.ink0);
    g.set(x + 1, 11, C.ochre1).set(x + 1, 17, C.ochre1).set(x + 1, 24, C.ochre1);
  }
  g.hline(3, 19, 58, C.ink1);
  g.stamp(['o.o.o', 'ooooo', '.ooo.', '.oko.', '.ooo.'], { o: C.ochre1, k: C.ink3 }, 30, 17);
  return sprite(outlineSolid(g), { x: 32, y: 28 });
}

/** 목판(인쇄용 판목)을 꽂아 둔 판가 32×56. TEMP: 보관 방식 미확인. */
function blockRack(): PixelSprite {
  const g = new Grid(32, 56);
  softShadow(g, 16, 52, 14, 3);
  // 기둥 + 선반
  g.rect(2, 4, 3, 46, C.wood2).rect(27, 4, 3, 46, C.wood2);
  g.vline(2, 4, 46, C.wood1).vline(29, 4, 46, C.wood3);
  g.rect(2, 2, 28, 3, C.wood1).hline(2, 2, 28, C.wood0).hline(2, 4, 28, C.wood3);
  const r = rng(404);
  for (const sy of [8, 22, 36]) {
    // 칸 안쪽 어둠
    g.rect(5, sy, 22, 12, C.wood3);
    // 판목: 세로로 꽂은 두꺼운 널(마구리가 보임)
    let x = 6;
    while (x < 25) {
      const w = 2 + Math.floor(r() * 2);
      g.rect(x, sy + 1, w, 11, r() < 0.5 ? C.wood0 : C.hanji3);
      g.vline(x, sy + 1, 11, C.hanji2);
      g.vline(x + w - 1, sy + 1, 11, C.wood2);
      g.hline(x, sy + 1, w, C.hanji1);
      x += w + 0;
    }
    g.rect(2, sy + 12, 28, 3, C.wood1);
    g.hline(2, sy + 12, 28, C.wood0);
    g.hline(2, sy + 14, 28, C.wood3);
  }
  // 삐져나온 판목 하나(한 칸 위로 반쯤)
  g.rect(12, 5, 3, 6, C.hanji3).vline(12, 5, 6, C.hanji2).vline(14, 5, 6, C.wood2).hline(12, 5, 3, C.hanji1);
  return sprite(outlineSolid(g), { x: 16, y: 50 });
}

export const SCENE_OBJECTS: Record<string, PixelSprite> = {
  obj_hwijang: hwijangClosed(),
  obj_hwijang_tied: hwijangTied(),
  obj_screen_bamboo: screenBamboo(),
  obj_screen_low: screenLow(),
  obj_bedding: bedding(),
  obj_soban: soban(),
  obj_decree_stand: decreeStand(),
  obj_low_desk: lowDesk(),
  obj_cushion_red: cushionSprite('red'),
  obj_cushion_blue: cushionSprite('blue'),
  obj_cushion_green: cushionSprite('green'),
  obj_cushion_plain: cushionSprite('plain'),
  obj_cushion_row: cushionRow(),
  obj_mat: mat(),
  obj_book_pile_tall: bookPileTall(),
  obj_book_bundle: bookBundle(),
  obj_sheets_pile: sheetsPile(),
  obj_chest_open: chestOpen(),
  obj_chest_long: chestLong(),
  obj_block_rack: blockRack(),
};

/** 바닥에 깔리는 것(캐릭터보다 항상 아래). 키 → true */
export const SCENE_FLAT_OBJECTS: ReadonlySet<string> = new Set(['obj_mat', 'obj_cushion_row', 'obj_cushion_red', 'obj_cushion_blue', 'obj_cushion_green', 'obj_cushion_plain']);
