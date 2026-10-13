/**
 * 메신저 초상 32×32. 원형 배경 + 어깨/머리. 플레이어는 성별 단서를 넣지 않는다.
 * 결록 연구소(허구)의 DB 봇 문장은 실존 기관과 무관한 추상 도형(끊어진 고리 + 점).
 */
import type { PixelSprite } from './pixel';
import { Grid, sprite } from './draw';
import { O, OSPAL, OS_OUTLINE } from './os_palette';

/** 원형 배경(바깥은 투명) + 어깨 클리핑 */
function base(bg: string, rim: string): Grid {
  const g = new Grid(32, 32);
  g.ellipse(16, 16, 15.5, 15.5, bg);
  g.ring(16, 16, 15.5, 15.5, rim);
  return g;
}
/** 원 안쪽만 허용하도록 바깥을 지운다 */
function clip(g: Grid): Grid {
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const dx = (x + 0.5 - 16) / 15.75, dy = (y + 0.5 - 16) / 15.75;
      if (dx * dx + dy * dy > 1) g.set(x, y, '.');
    }
  g.outline((n) => OS_OUTLINE[n]);
  return g;
}
const sp = (g: Grid): PixelSprite => sprite(clip(g), { x: 16, y: 16 }, OSPAL);

function head(g: Grid, skin: [string, string, string], cy = 13) {
  g.rect(14, cy + 6, 4, 5, skin[1]); // 목
  g.ellipse(16, cy, 5.5, 6.5, skin[0]);
  g.vline(21, cy - 3, 8, skin[1]);
}
function face(g: Grid, cy = 13, eye = O.k1) {
  g.set(13, cy + 1, eye).set(19, cy + 1, eye);
  g.hline(15, cy + 5, 3, O.f2);
}
const SK: [string, string, string] = [O.f0, O.f1, O.f2];

function player(): PixelSprite {
  const g = base(O.t1, O.t0);
  g.rect(0, 0, 32, 32, O.t1);
  g.ellipse(16, 16, 15.5, 15.5, O.t1);
  g.hline(5, 5, 10, O.t2); // 배경 빛
  // 어깨: 짙은 코트
  g.ellipse(16, 33, 14, 9, O.k3);
  g.ellipse(16, 33, 12, 7, O.k4);
  g.line(16, 25, 12, 30, O.k2).line(16, 25, 20, 30, O.k2); // 옷깃
  // 청록 사원증 끈
  g.line(13, 25, 15, 32, O.t3).line(19, 25, 17, 32, O.t3);
  head(g, SK);
  // 머리카락: 짧고 중립적인 단발 실루엣
  g.ellipse(16, 8.5, 6.5, 4.5, O.h1);
  g.rect(10, 9, 2, 4, O.h1).rect(20, 9, 2, 4, O.h1);
  g.hline(12, 11, 3, O.h1);
  g.hline(13, 7, 5, O.h2);
  face(g);
  return sp(g);
}

function colleagueA(): PixelSprite {
  const g = base(O.k4, O.k2);
  g.ellipse(16, 16, 15.5, 15.5, O.k5);
  g.hline(5, 5, 10, O.k6);
  // 흰 가운
  g.ellipse(16, 33, 14, 9, O.k8);
  g.ellipse(16, 33, 12, 7, O.k9);
  g.rect(14, 25, 4, 2, O.k4);
  g.line(14, 27, 12, 31, O.k7).line(18, 27, 20, 31, O.k7);
  head(g, SK);
  g.ellipse(16, 8.5, 7, 4.5, O.h0);
  g.rect(9, 9, 3, 6, O.h0).rect(20, 9, 3, 5, O.h0);
  g.hline(12, 10, 3, O.h0).hline(17, 10, 2, O.h0);
  g.set(12, 7, O.h1).set(13, 6, O.h1);
  // 안경
  g.box(11, 12, 5, 4, O.k9).box(17, 12, 5, 4, O.k9);
  g.hline(16, 13, 1, O.k8);
  g.set(12, 13, O.k1).set(19, 13, O.k1);
  g.set(12, 12, O.kw);
  g.hline(15, 18, 3, O.f2);
  return sp(g);
}

function colleagueB(): PixelSprite {
  const g = base(O.a0, O.k1);
  g.ellipse(16, 16, 15.5, 15.5, O.a0);
  g.hline(5, 5, 8, O.a1);
  // 서고 선반 윤곽(배경)
  g.vline(4, 4, 22, O.a1).vline(27, 4, 22, O.a1);
  g.hline(4, 20, 3, O.a1).hline(25, 20, 3, O.a1);
  // 카디건
  g.ellipse(16, 33, 14, 9, O.w2);
  g.ellipse(16, 33, 12, 7, O.w1);
  g.line(16, 26, 16, 32, O.w3);
  g.rect(13, 25, 6, 2, O.p1);
  g.rect(20, 28, 3, 2, O.p0); // 이름표
  head(g, [O.f0, O.f1, O.f2]);
  // 머리: 희끗한 회색, 뒤로 묶음
  g.ellipse(16, 8.5, 6.5, 4, O.k8);
  g.rect(10, 9, 2, 3, O.k8).rect(20, 9, 2, 3, O.k8);
  g.set(14, 7, O.k9).set(16, 6, O.k9);
  g.ellipse(16, 5, 2.5, 1.8, O.k7);
  face(g, 13, O.k1);
  g.hline(12, 15, 2, O.f2).hline(18, 15, 2, O.f2); // 눈가 주름
  return sp(g);
}

function dbBot(): PixelSprite {
  const g = base(O.k2, O.k0);
  g.ellipse(16, 16, 15.5, 15.5, O.k2);
  g.hline(6, 4, 8, O.k3);
  // 끊어진 고리(缺): 오른쪽 위가 비어 있다
  for (let a = 0; a < 360; a += 3) {
    const t = (a * Math.PI) / 180;
    if (a > 300 || a < 20) continue; // 틈
    const x = 16 + Math.cos(t) * 9.2, y = 16 + Math.sin(t) * 9.2;
    g.set(x, y, O.k8).set(x + 1, y, O.k7).set(x, y + 1, O.k7);
  }
  // 안쪽 사각 격자(기록 칸)
  g.box(11, 11, 10, 10, O.k5);
  g.hline(11, 16, 10, O.k4).vline(16, 11, 10, O.k4);
  g.rect(12, 12, 3, 3, O.t2).rect(17, 17, 3, 3, O.t1);
  // 틈에 놓인 호박 점
  g.rect(24, 6, 3, 3, O.a2).set(24, 6, O.a4);
  return sp(g);
}

export const OS_AVATARS: Record<string, PixelSprite> = {
  avatar_player: player(),
  avatar_colleague_a: colleagueA(),
  avatar_colleague_b: colleagueB(),
  avatar_system: dbBot(),
};
