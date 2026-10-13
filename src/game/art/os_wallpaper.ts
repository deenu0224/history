/**
 * 결록 단말 배경화면. 밤의 연구실 서고 — 추상적인 서가 실루엣, 멀리 한 점의 호박 램프빛.
 * 아이콘이 얹히는 왼쪽/위쪽은 고요하게 둔다. 최근접(pixelated) 확대 전제.
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { O, OSPAL } from './os_palette';

function wallpaper(w: number, h: number, seed: number, lamp: { x: number; y: number }): PixelSprite {
  const g = new Grid(w, h);
  const r = rng(seed);
  // 세로 그라데이션(위 k0 → 아래 k2), 디더 경계
  const bands = [O.k0, O.k1, O.k2];
  for (let y = 0; y < h; y++) {
    const t = (y / h) * 2.0;
    const i = Math.min(1, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < w; x++) {
      const thr = ((x + y * 2) % 4) / 4 + 0.125;
      g.set(x, y, f > thr ? bands[i + 1] : bands[i]);
    }
  }
  // 멀리 보이는 서가 열(뒤): 밝기 낮은 기둥들
  const horizon = Math.floor(h * 0.62);
  const stack = (x0: number, wd: number, top: number, base: string, line: string, dots: string) => {
    g.rect(x0, top, wd, horizon + 14 - top, base);
    g.vline(x0, top, horizon + 14 - top, line);
    for (let y = top + 6; y < horizon + 12; y += 8) {
      g.hline(x0, y, wd, line);
      // 칸 안의 상자/문서철(희미)
      let x = x0 + 2;
      while (x < x0 + wd - 3) {
        const bw = 2 + Math.floor(r() * 4);
        const bh = 2 + Math.floor(r() * 4);
        if (r() < 0.7) g.rect(x, y - bh, bw, bh, dots);
        x += bw + 1 + Math.floor(r() * 2);
      }
    }
  };
  const colW = w > h ? 26 : 22;
  for (let x = Math.floor(colW * 0.4); x < w; x += colW + 4) {
    const top = horizon - 30 - Math.floor(r() * 22);
    stack(x, colW, top, O.k2, O.k3, O.k3);
  }
  // 바닥
  g.rect(0, horizon + 14, w, h - horizon - 14, O.k1);
  g.hline(0, horizon + 14, w, O.k3);
  for (let y = horizon + 18; y < h; y += 5) g.hline(0, y, w, O.k2);
  // 앞줄 서가(더 어둡고 아래쪽, 한 줄)
  const front = horizon + 14;
  for (let x = Math.floor(colW * 0.9); x < w; x += colW * 2 + 14) {
    const top = front - 36 - Math.floor(r() * 14);
    g.rect(x, top, colW + 4, h - top, O.k1);
    g.vline(x, top, h - top, O.k2);
    g.vline(x + colW + 3, top, h - top, O.k0);
    for (let y = top + 8; y < h; y += 9) g.hline(x, y, colW + 4, O.k2);
  }
  // 램프빛: 동심 디더 번짐
  const glow = [
    [Math.floor(w * 0.24), O.m1],
    [Math.floor(w * 0.14), O.m2],
    [Math.floor(w * 0.06), O.m3],
  ] as const;
  for (const [rad, ch] of glow) {
    for (let y = lamp.y - rad; y <= lamp.y + rad; y++)
      for (let x = lamp.x - rad; x <= lamp.x + rad; x++) {
        const dx = x - lamp.x, dy = (y - lamp.y) * 1.25;
        if (dx * dx + dy * dy <= rad * rad && (x + y) % 2 === 0) g.set(x, y, ch);
      }
  }
  g.rect(lamp.x - 1, lamp.y - 1, 3, 3, O.a3).set(lamp.x, lamp.y - 1, O.a4);
  g.hline(lamp.x - 2, lamp.y + 2, 5, O.a1);
  // 아주 약한 입자
  g.speckle(r, O.k3, 0.004);
  return sprite(g, { x: Math.floor(w / 2), y: Math.floor(h / 2) }, OSPAL);
}

export const OS_WALLPAPERS: Record<string, PixelSprite> = {
  os_wallpaper: wallpaper(320, 180, 11, { x: 256, y: 64 }),
  os_wallpaper_portrait: wallpaper(180, 320, 12, { x: 132, y: 70 }),
};
