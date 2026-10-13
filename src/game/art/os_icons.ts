/**
 * 결록 단말 앱 아이콘. 32×32(본판) + 16×16(_sm).
 * 디지털 앱은 짙은 슬레이트 타일 + 밝은 글리프, 손글씨 노트만 종이 타일(아날로그)로 구분한다.
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { O, OSPAL, OS_OUTLINE } from './os_palette';

const sp = (g: Grid): PixelSprite => sprite(g, { x: Math.floor(g.w / 2), y: Math.floor(g.h / 2) }, OSPAL);

type Tone = { top: string; bot: string; hi: string; lo: string };
const SLATE: Tone = { top: O.k4, bot: O.k3, hi: O.k5, lo: O.k2 };
const DEEP: Tone = { top: O.k3, bot: O.k2, hi: O.k4, lo: O.k1 };
const PAPER: Tone = { top: O.p0, bot: O.p1, hi: O.kw, lo: O.p3 };

/** 둥근 모서리 앱 타일 (n×n) + 외곽선 */
function tile(n: number, t: Tone = SLATE): Grid {
  const g = new Grid(n, n);
  const cut = n >= 32 ? 3 : 2;
  g.rect(0, 0, n, n, t.top);
  // 아래쪽으로 갈수록 살짝 어두워지는 디더 그라데이션
  const y0 = Math.floor(n * 0.5);
  const y1 = Math.floor(n * 0.72);
  for (let y = y0; y < n; y++)
    for (let x = 0; x < n; x++) if (y >= y1 || (x + y) % 2 === 0) g.set(x, y, t.bot);
  // 모서리 깎기
  for (let i = 0; i < cut; i++)
    for (let j = 0; j < cut - i; j++) {
      g.set(i, j, '.').set(n - 1 - i, j, '.').set(i, n - 1 - j, '.').set(n - 1 - i, n - 1 - j, '.');
    }
  // 하이라이트(좌상) / 그늘(우하)
  g.hline(cut, 0, n - 2 * cut, t.hi);
  g.vline(0, cut, n - 2 * cut, t.hi);
  g.hline(cut, n - 1, n - 2 * cut, t.lo);
  g.vline(n - 1, cut, n - 2 * cut, t.lo);
  return g;
}
/** 타일 위 글리프를 다 그린 뒤 바깥 외곽선 */
function finish(g: Grid, n: number): PixelSprite {
  // 타일 바깥에만 외곽선을 두른다
  const o = g.clone();
  o.outline((nb) => OS_OUTLINE[nb]);
  void n;
  return sp(o);
}

// ──────────────────────────── 32×32 ────────────────────────────
function appDb(): PixelSprite {
  const g = tile(32);
  // 쌓인 기록 판 3장
  const slab = (y: number, lit: boolean) => {
    g.rect(5, y, 17, 5, O.k5);
    g.hline(5, y, 17, O.k7);
    g.hline(5, y + 4, 17, O.k3);
    g.rect(7, y + 1, 2, 3, lit ? O.t3 : O.k8);
    g.hline(11, y + 1, 7, O.k8);
    g.hline(11, y + 3, 4, O.k6);
  };
  slab(5, false);
  slab(11, true);
  slab(17, false);
  // 돋보기
  g.ellipse(21, 20, 7, 7, O.k9);
  g.ellipse(21, 20, 5.5, 5.5, O.t1);
  g.ellipse(21, 20, 4, 4, O.t0);
  g.hline(18, 18, 4, O.t2).hline(17, 19, 2, O.t3);
  g.set(18, 17, O.t4);
  g.hline(20, 22, 4, O.t1);
  g.line(26, 25, 29, 28, O.a3);
  g.line(25, 25, 28, 28, O.a2);
  g.line(27, 25, 29, 27, O.a4);
  return finish(g, 32);
}

function appObserve(): PixelSprite {
  const g = tile(32, DEEP);
  // 뷰파인더 모서리
  for (const [x, y, fx, fy] of [[4, 4, 1, 1], [27, 4, -1, 1], [4, 27, 1, -1], [27, 27, -1, -1]] as const) {
    g.hline(fx > 0 ? x : x - 3, y, 4, O.k6).vline(x, fy > 0 ? y : y - 3, 4, O.k6);
  }
  g.ellipse(16, 16, 10, 10, O.k7);
  g.ellipse(16, 16, 9, 9, O.k4);
  g.ellipse(16, 16, 7.5, 7.5, O.k1);
  g.ellipse(16, 16, 6, 6, O.t0);
  g.ellipse(16, 16, 4.5, 4.5, O.t1);
  g.ellipse(16, 16, 2.5, 2.5, O.k1);
  // 은은한 주사선
  for (let y = 10; y <= 22; y += 2) for (let x = 8; x <= 24; x++) {
    const c = g.get(x, y);
    if (c === O.t0 || c === O.t1) g.set(x, y, c === O.t0 ? O.k1 : O.t0);
  }
  g.ring(16, 16, 10, 10, O.k8);
  // 유리 반사
  g.hline(11, 10, 3, O.k8).set(10, 11, O.k8).set(10, 12, O.k7);
  g.set(15, 15, O.t3).set(16, 15, O.t4);
  // 관측 램프(호박)
  g.rect(25, 5, 2, 2, O.a3).set(25, 5, O.a4);
  return finish(g, 32);
}

function appReader(): PixelSprite {
  const g = tile(32, SLATE);
  // 펼친 서책
  g.rect(4, 22, 24, 3, O.k1); // 그림자
  // 좌/우 페이지 (윗선은 안쪽이 높음)
  g.rect(4, 9, 12, 14, O.p1);
  g.rect(16, 9, 12, 14, O.p0);
  g.hline(4, 8, 3, O.p1).hline(25, 8, 3, O.p0);
  g.set(4, 9, O.p3).set(27, 9, O.p3);
  g.rect(4, 9, 1, 14, O.p2);
  g.rect(27, 9, 1, 14, O.p1);
  g.vline(15, 8, 16, O.p3);
  g.vline(16, 8, 16, O.p2);
  g.rect(14, 8, 4, 1, O.p2);
  g.hline(5, 23, 22, O.p3);
  g.hline(5, 24, 22, O.k2);
  // 글줄(세로쓰기 암시 — 판독 불가한 획)
  for (let i = 0; i < 4; i++) {
    g.vline(6 + i * 2 + 1, 11, 9 - (i % 2), O.k6);
    g.vline(18 + i * 2 + 1, 11, 10 - ((i + 1) % 2), O.g1);
  }
  g.rect(25, 8, 2, 7, O.t2).set(25, 14, O.t1).set(26, 14, O.t1);
  return finish(g, 32);
}

function appBoard(): PixelSprite {
  const g = tile(32, DEEP);
  // 보드 프레임 + 코르크(차분한 갈색)
  g.rect(3, 4, 26, 24, O.w3);
  g.rect(4, 5, 24, 22, O.w1);
  const r = rng(321);
  g.speckle(r, O.w0, 0.14, 4, 5, 24, 22);
  g.speckle(r, O.w2, 0.14, 4, 5, 24, 22);
  g.hline(4, 5, 24, O.w2);
  g.hline(4, 26, 24, O.w3);
  // 카드 3장
  const card = (x: number, y: number, w: number, h: number, rot: number) => {
    g.rect(x + 1, y + 1, w, h, O.s4);
    g.rect(x, y, w, h, rot ? O.p1 : O.p0);
    g.hline(x + 1, y + 2, w - 3, O.g1);
    g.hline(x + 1, y + 4, w - 4, O.p3);
    if (h > 7) g.hline(x + 1, y + 6, w - 5, O.p3);
  };
  card(6, 8, 9, 8, 0);
  card(19, 7, 8, 7, 1);
  card(12, 18, 10, 7, 0);
  // 끈
  g.line(10, 8, 22, 7, O.r1);
  g.line(10, 8, 16, 18, O.r1);
  g.line(22, 7, 16, 18, O.r0);
  // 압정
  const pin = (x: number, y: number) => g.set(x, y, O.r0).set(x + 1, y, O.r1).set(x, y + 1, O.r1).set(x + 1, y + 1, O.r2);
  pin(9, 7);
  pin(21, 6);
  pin(15, 17);
  return finish(g, 32);
}

function appMessenger(): PixelSprite {
  const g = tile(32, SLATE);
  // 뒤 말풍선 (청록)
  g.rect(12, 5, 16, 11, O.t2);
  g.hline(12, 5, 16, O.t3);
  g.rect(12, 15, 16, 1, O.t1);
  g.set(12, 5, '.').set(27, 5, '.').set(12, 15, '.').set(27, 15, '.');
  g.rect(24, 16, 3, 1, O.t1).rect(25, 17, 2, 1, O.t1).set(26, 18, O.t1);
  g.hline(15, 8, 9, O.t4).hline(15, 11, 6, O.t3);
  // 앞 말풍선 (밝은 회색)
  g.rect(4, 13, 17, 12, O.k9);
  g.hline(4, 13, 17, O.kw);
  g.rect(4, 24, 17, 1, O.k7);
  g.set(4, 13, '.').set(20, 13, '.').set(4, 24, '.').set(20, 24, '.');
  g.rect(7, 25, 3, 1, O.k8).rect(7, 26, 2, 1, O.k8).set(7, 27, O.k7);
  // 말줄임(점 3개)
  g.rect(8, 18, 2, 2, O.k5).rect(12, 18, 2, 2, O.k5).rect(16, 18, 2, 2, O.a2);
  return finish(g, 32);
}

function appMail(): PixelSprite {
  const g = tile(32, SLATE);
  g.rect(4, 8, 24, 17, O.k4);
  g.rect(4, 25, 24, 1, O.s4);
  g.rect(5, 9, 22, 15, O.k9);
  g.hline(5, 9, 22, O.kw);
  g.hline(5, 23, 22, O.k8);
  // 봉투 접힘선
  g.line(5, 9, 15, 17, O.k7);
  g.line(26, 9, 16, 17, O.k7);
  g.line(5, 23, 12, 16, O.k8);
  g.line(26, 23, 19, 16, O.k8);
  g.hline(14, 17, 4, O.k7);
  // 뒤쪽 윗면 삼각 안쪽 음영
  g.line(7, 10, 15, 16, O.k8);
  g.line(24, 10, 16, 16, O.k8);
  // 안읽음 표시(호박)
  g.ellipse(25, 8, 3, 3, O.a2);
  g.ellipse(25, 8, 2, 2, O.a3);
  g.set(24, 7, O.a4);
  return finish(g, 32);
}

function appArchive(): PixelSprite {
  const g = tile(32, DEEP);
  // 진열장: 유리 상자 + 받침대
  g.rect(6, 5, 20, 17, O.k5);
  g.rect(7, 6, 18, 15, O.k2);
  // 안쪽 조명(호박, 은은)
  g.rect(8, 6, 16, 1, O.a3);
  g.rect(9, 7, 14, 2, O.m2).rect(11, 9, 10, 3, O.m1);
  // 유리 반사
  g.line(9, 18, 14, 8, O.k4).line(11, 20, 17, 9, O.k4);
  // 전시물: 말아둔 사료 두루마리
  g.rect(11, 14, 10, 5, O.p1);
  g.rect(11, 14, 10, 1, O.p0);
  g.rect(10, 13, 1, 7, O.p3).rect(21, 13, 1, 7, O.p3);
  g.hline(12, 16, 7, O.g1).hline(12, 18, 5, O.p3);
  g.hline(7, 21, 18, O.k3);
  // 받침
  g.rect(5, 22, 22, 3, O.k6);
  g.hline(5, 22, 22, O.k8);
  g.rect(8, 25, 16, 2, O.k4);
  g.rect(6, 27, 20, 1, O.k3);
  // 프레임 모서리
  g.vline(6, 5, 17, O.k8).hline(6, 5, 20, O.k8);
  return finish(g, 32);
}

function appNotebook(): PixelSprite {
  const g = tile(32, PAPER);
  // 줄 노트 (종이 타일 자체가 노트)
  for (let y = 8; y < 28; y += 4) g.hline(5, y, 22, O.p2);
  g.vline(9, 3, 26, O.r0);
  // 스프링 구멍
  for (let y = 5; y < 28; y += 6) g.set(4, y, O.p4).set(4, y + 1, O.p3);
  // 손글씨 낙서
  g.hline(11, 7, 5, O.g1).set(13, 6, O.g1).set(16, 6, O.g1).hline(17, 7, 3, O.g1);
  g.hline(11, 11, 8, O.g1).set(12, 10, O.g1).set(15, 10, O.g1);
  g.hline(11, 15, 4, O.g1).set(13, 14, O.g1);
  // 연필 (우하→좌상 대각)
  const px = (x: number, y: number, c: string) => g.set(x, y, c);
  for (let i = 0; i < 14; i++) {
    const x = 28 - i, y = 15 + i;
    // 몸통 3px 폭
    px(x, y - 1, O.a3);
    px(x, y, O.a2);
    px(x + 1, y, O.a1);
    px(x - 1, y, O.a2);
    px(x, y + 1, O.a1);
  }
  // 연필 윗부분(지우개/쇠고리) 우상단
  g.rect(27, 12, 3, 3, O.r0).set(27, 12, O.r1);
  g.rect(26, 15, 3, 1, O.k8);
  // 연필심 쪽(좌하)
  g.set(15, 27, O.f0).set(14, 28, O.f1).set(14, 27, O.f0).set(13, 28, O.g0);
  // 지나간 밑줄
  g.hline(11, 27, 3, O.g1);
  return finish(g, 32);
}

function appSettings(): PixelSprite {
  const g = tile(32, SLATE);
  // 톱니 8개
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = 16 + Math.cos(a) * 10.2;
    const y = 16 + Math.sin(a) * 10.2;
    g.ellipse(x, y, 2.2, 2.2, O.k8);
    g.ellipse(x, y, 1.2, 1.2, O.k9);
  }
  g.ellipse(16, 16, 9, 9, O.k8);
  g.ellipse(16, 16, 8, 8, O.k7);
  // 하이라이트/그늘
  g.ring(16, 16, 8, 8, O.k8);
  g.hline(10, 9, 6, O.k9).hline(9, 11, 2, O.k9);
  g.hline(14, 23, 8, O.k6).hline(21, 20, 2, O.k6);
  g.ellipse(16, 16, 4, 4, O.k2);
  g.ring(16, 16, 4, 4, O.k5);
  g.set(14, 14, O.k4);
  g.hline(15, 18, 3, O.k3);
  return finish(g, 32);
}

function appTimeline(): PixelSprite {
  const g = tile(32, DEEP);
  // 축
  g.hline(4, 16, 24, O.k8);
  g.hline(4, 17, 24, O.k5);
  for (let x = 6; x < 28; x += 4) g.vline(x, 18, 2, O.k6);
  // 사건 카드 (위/아래 교차)
  const up = (x: number, w: number, c: string) => {
    g.vline(x, 11, 5, O.k6);
    g.rect(x - 1, 6, w, 5, c);
    g.hline(x - 1, 6, w, O.k9);
    g.hline(x, 8, w - 3, O.k4);
  };
  const dn = (x: number, w: number, c: string) => {
    g.vline(x, 18, 4, O.k6);
    g.rect(x - 1, 22, w, 5, c);
    g.hline(x - 1, 22, w, O.k8);
    g.hline(x, 24, w - 3, O.k4);
  };
  up(8, 8, O.k7);
  dn(14, 8, O.k7);
  up(22, 7, O.k7);
  // 강조 노드(호박)
  g.ellipse(8, 16.5, 2, 2, O.t3);
  g.ellipse(14, 16.5, 2, 2, O.k9);
  g.ellipse(22, 16.5, 2.5, 2.5, O.a3);
  g.ellipse(22, 16.5, 1.2, 1.2, O.a4);
  return finish(g, 32);
}

// ──────────────────────────── 16×16 ────────────────────────────
function smDb(): PixelSprite {
  const g = tile(16);
  g.rect(3, 3, 8, 2, O.k7).rect(3, 6, 8, 2, O.k7).rect(3, 9, 6, 2, O.k7);
  g.set(4, 3, O.t3).set(4, 6, O.t3);
  g.ellipse(10, 10, 3.5, 3.5, O.k9).ellipse(10, 10, 2.2, 2.2, O.t1);
  g.line(13, 13, 14, 14, O.a3);
  return finish(g, 16);
}
function smObserve(): PixelSprite {
  const g = tile(16, DEEP);
  g.ellipse(8, 8, 5.5, 5.5, O.k7).ellipse(8, 8, 4.2, 4.2, O.k1);
  g.ellipse(8, 8, 2.2, 2.2, O.t1).set(7, 7, O.t4);
  g.hline(5, 6, 6, O.k2).hline(5, 10, 6, O.k2);
  g.set(12, 3, O.a3);
  return finish(g, 16);
}
function smReader(): PixelSprite {
  const g = tile(16);
  g.rect(2, 4, 6, 8, O.p1).rect(8, 4, 6, 8, O.p0);
  g.vline(8, 4, 8, O.p3).hline(2, 12, 12, O.p3);
  g.vline(4, 6, 4, O.k6).vline(5, 6, 3, O.k6).vline(10, 6, 4, O.g1).vline(11, 6, 3, O.g1);
  return finish(g, 16);
}
function smBoard(): PixelSprite {
  const g = tile(16, DEEP);
  g.rect(2, 2, 12, 12, O.w1).box(2, 2, 12, 12, O.w3);
  g.rect(4, 4, 4, 4, O.p0).rect(9, 5, 3, 3, O.p1).rect(6, 9, 5, 3, O.p0);
  g.line(5, 4, 10, 5, O.r1).line(5, 4, 8, 9, O.r1);
  g.set(5, 4, O.r0).set(10, 5, O.r0).set(8, 9, O.r0);
  return finish(g, 16);
}
function smMessenger(): PixelSprite {
  const g = tile(16);
  g.rect(6, 2, 8, 6, O.t2).hline(6, 2, 8, O.t3);
  g.rect(2, 6, 9, 6, O.k9).hline(2, 6, 9, O.kw).set(4, 12, O.k8).set(3, 13, O.k8);
  g.set(4, 9, O.k5).set(6, 9, O.k5).set(8, 9, O.a2);
  return finish(g, 16);
}
function smMail(): PixelSprite {
  const g = tile(16);
  g.rect(2, 4, 12, 9, O.k9).hline(2, 4, 12, O.kw);
  g.line(2, 4, 7, 8, O.k7).line(13, 4, 8, 8, O.k7);
  g.rect(12, 3, 2, 2, O.a3);
  return finish(g, 16);
}
function smArchive(): PixelSprite {
  const g = tile(16, DEEP);
  g.rect(3, 2, 10, 9, O.k5).rect(4, 3, 8, 7, O.k2);
  g.hline(4, 3, 8, O.a3).rect(6, 6, 4, 3, O.p1);
  g.rect(2, 11, 12, 2, O.k6).hline(2, 11, 12, O.k8);
  return finish(g, 16);
}
function smNotebook(): PixelSprite {
  const g = tile(16, PAPER);
  g.hline(3, 4, 9, O.p2).hline(3, 7, 9, O.p2).hline(3, 10, 6, O.p2);
  g.vline(4, 2, 12, O.r0);
  g.line(13, 6, 7, 12, O.a2).line(12, 6, 6, 12, O.a1).set(6, 13, O.g0).set(13, 5, O.r0);
  return finish(g, 16);
}
function smSettings(): PixelSprite {
  const g = tile(16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.set(Math.round(7.5 + Math.cos(a) * 5), Math.round(7.5 + Math.sin(a) * 5), O.k9);
  }
  g.ellipse(8, 8, 4.5, 4.5, O.k8).ellipse(8, 8, 2, 2, O.k2);
  return finish(g, 16);
}
function smTimeline(): PixelSprite {
  const g = tile(16, DEEP);
  g.hline(2, 8, 12, O.k8);
  g.rect(3, 3, 4, 3, O.k7).vline(4, 6, 2, O.k6);
  g.rect(9, 10, 4, 3, O.k7).vline(10, 9, 1, O.k6);
  g.set(4, 8, O.t3).set(10, 8, O.a3).set(11, 8, O.a3);
  return finish(g, 16);
}

export const OS_ICONS: Record<string, PixelSprite> = {
  app_db: appDb(),
  app_observe: appObserve(),
  app_reader: appReader(),
  app_board: appBoard(),
  app_messenger: appMessenger(),
  app_mail: appMail(),
  app_archive: appArchive(),
  app_notebook: appNotebook(),
  app_settings: appSettings(),
  app_timeline: appTimeline(),
  app_db_sm: smDb(),
  app_observe_sm: smObserve(),
  app_reader_sm: smReader(),
  app_board_sm: smBoard(),
  app_messenger_sm: smMessenger(),
  app_mail_sm: smMail(),
  app_archive_sm: smArchive(),
  app_notebook_sm: smNotebook(),
  app_settings_sm: smSettings(),
  app_timeline_sm: smTimeline(),
};
