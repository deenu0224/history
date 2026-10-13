/**
 * 도장 아트: 탑다운 찍힌 자국(64×40, 글자 면은 비워 둠 — UI 가 선명한 한글과 "07" 각인을 얹는다),
 * 손에 쥐는 도장(32×48), 불일치 도장 면 클로즈업(64×64).
 * 잉크 자국은 반투명이라 아래 종이가 비친다. 변형 a/b/c 는 시드·기울기·마름 정도가 달라 매번 다르게 보인다.
 */
import type { PixelSprite } from './pixel';
import { Grid, rng, sprite } from './draw';
import { D, DESKPAL, DESK_OUTLINE } from './desk_palette';

const sp = (g: Grid | Grid[], a?: { x: number; y: number }): PixelSprite => sprite(g, a, DESKPAL);

// ───────────────────────── 노이즈 ─────────────────────────

/** 격자 값 노이즈(쌍선형). 0..1 */
function makeNoise(seed: number, cell: number): (x: number, y: number) => number {
  const lat = new Map<string, number>();
  const val = (i: number, j: number) => {
    const k = `${i},${j}`;
    let v = lat.get(k);
    if (v === undefined) {
      v = rng(seed * 7919 + i * 131 + j * 977 + 13)();
      lat.set(k, v);
    }
    return v;
  };
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = fx - i;
    const ty = fy - j;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = val(i, j) * (1 - sx) + val(i + 1, j) * sx;
    const b = val(i, j + 1) * (1 - sx) + val(i + 1, j + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

// ───────────────────────── 찍힌 자국 ─────────────────────────

type InkTones = { d: string; m: string; l: string; f: string };
const INK: Record<'ok' | 'fix' | 'mismatch' | 'system' | 'aged', InkTones> = {
  ok: { d: D.G, m: D.H, l: D.I, f: D.J },
  fix: { d: D.U, m: D.V, l: D.W, f: D.X },
  mismatch: { d: D.R, m: D.S, l: D.T, f: D.Q },
  system: { d: D.K, m: D.L, l: D.M, f: D.N },
  aged: { d: D.A, m: D.B, l: D.C, f: D.D },
};

const IW = 64;
const IH = 40;

interface ImpOpts {
  seed: number;
  tilt: number;
  /** 0..1 잉크 마름(클수록 빠진 곳이 많다) */
  dry: number;
  /** 0..1 가장자리 일렁임 */
  wobble: number;
  splat: number;
  aged?: boolean;
}

/** 라운드 사각형 안쪽 거리(바깥은 음수). 모서리는 반경 r 로 둥글림. */
function insetDist(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): number {
  const dx = Math.min(x - x0, x1 - x);
  const dy = Math.min(y - y0, y1 - y);
  if (dx < r && dy < r) {
    const cx = dx < r ? r - dx : 0;
    const cy = dy < r ? r - dy : 0;
    return r - Math.hypot(cx, cy);
  }
  return Math.min(dx, dy);
}

function impression(tone: InkTones, o: ImpOpts): PixelSprite {
  const g = new Grid(IW, IH);
  const r = rng(o.seed);
  const nEdge = makeNoise(o.seed, 5);
  const nDry = makeNoise(o.seed + 31, 9);
  const nFine = makeNoise(o.seed + 77, 2);
  const x0 = 2;
  const y0 = 2;
  const x1 = IW - 3;
  const y1 = IH - 3;
  for (let y = 0; y < IH; y++) {
    for (let x = 0; x < IW; x++) {
      // 기울기: 가운데 기준으로 행마다 살짝 밀림
      const sx = x - (y - IH / 2) * o.tilt;
      const w = (nEdge(x, y) - 0.5) * 2.4 * o.wobble;
      const di0 = insetDist(sx, y, x0, y0, x1, y1, 5);
      // 바깥 테두리는 많이 일렁이고, 안쪽 가는 선은 덜 일렁인다
      const di = di0 + (di0 > 4.4 ? w * 0.35 : w);
      let cov = 0;
      if (di >= 0 && di < 3.2) {
        // 굵은 바깥 테두리: 가장자리에 잉크가 고인다(가운데가 살짝 옅음)
        const t = di / 3.2;
        const edge = Math.abs(t - 0.5) * 2;
        cov = 0.66 + 0.34 * edge;
      } else if (di >= 5.2 && di < 6.4) {
        cov = 0.78;
      } else if (di >= 3.2 && di < 3.8) {
        cov = 0.34; // 번짐
      }
      // 모서리 장식(안쪽 짧은 눈금): 위/아래 가운데 작은 마디
      const cxm = Math.abs(sx - IW / 2);
      if ((Math.abs(y - (y0 + 8)) < 0.6 || Math.abs(y - (y1 - 8)) < 0.6) && cxm > 18 && cxm < 25) cov = Math.max(cov, 0.7);
      if (cov > 0) {
        const dry = nDry(x, y) * 0.9 + nFine(x, y) * 0.35;
        // 마른 부분: 일부 구멍
        cov *= 1 - o.dry * Math.max(0, dry - 0.55) * 2.4;
        if (r() < o.dry * 0.12) cov *= 0.3;
        if (o.aged) cov *= 0.82 - 0.35 * nDry(x * 0.7 + 40, y * 0.7);
      }
      if (cov > 0.72) g.set(x, y, tone.d);
      else if (cov > 0.46) g.set(x, y, tone.m);
      else if (cov > 0.22) g.set(x, y, tone.l);
      else if (cov > 0.08) g.set(x, y, tone.f);
    }
  }
  // 튄 잉크 점
  const n = Math.round(14 * o.splat);
  for (let i = 0; i < n; i++) {
    const side = Math.floor(r() * 4);
    let x = Math.floor(r() * IW);
    let y = Math.floor(r() * IH);
    if (side === 0) y = Math.floor(r() * 2);
    else if (side === 1) y = IH - 1 - Math.floor(r() * 2);
    else if (side === 2) x = Math.floor(r() * 2);
    else x = IW - 1 - Math.floor(r() * 2);
    g.under(x, y, r() < 0.5 ? tone.l : tone.f);
  }
  // 종이 섬유에 먹힌 얼룩: 테두리 근처 약한 점
  g.speckle(r, tone.f, 0.004 + 0.004 * o.splat, 0, 0, IW, IH);
  return sp(g, { x: IW / 2, y: IH / 2 });
}

/** 시스템(기계) 도장: 흔들림 없는 이중 테두리 + 모서리 괄호 + 점선 바깥선. 잉크가 아니라 인쇄 느낌. */
function systemImpression(variant: number): PixelSprite {
  const g = new Grid(IW, IH);
  const { d, m, l, f } = INK.system;
  const r = rng(900 + variant);
  // 이중 테두리(2px + 1px)
  g.box(2, 2, IW - 4, IH - 4, d);
  g.box(3, 3, IW - 6, IH - 6, m);
  g.box(6, 6, IW - 12, IH - 12, l);
  // 모서리 괄호
  for (const [cx, cy, sx, sy] of [
    [2, 2, 1, 1],
    [IW - 3, 2, -1, 1],
    [2, IH - 3, 1, -1],
    [IW - 3, IH - 3, -1, -1],
  ] as const) {
    for (let k = 0; k < 7; k++) {
      g.set(cx + sx * k, cy + sy * 2, d);
      g.set(cx + sx * 2, cy + sy * k, d);
    }
  }
  // 모서리 둥글림(바깥 한 칸 삭제)
  g.set(2, 2, '.').set(IW - 3, 2, '.').set(2, IH - 3, '.').set(IW - 3, IH - 3, '.');
  // 바깥 점선
  const phase = variant % 4;
  for (let x = 5; x < IW - 5; x++) if ((x + phase) % 4 < 2) g.set(x, 0, f).set(x, IH - 1, f);
  for (let y = 4; y < IH - 4; y++) if ((y + phase) % 4 < 2) g.set(0, y, f).set(IW - 1, y, f);
  // 상·하단 눈금 마디
  for (let x = 12; x < IW - 12; x += 4) {
    g.set(x, 8, f);
    g.set(x, IH - 9, f);
  }
  // 일련 표식(작은 사각 세 개): 글자 면 위쪽 모서리
  g.rect(IW - 14, 9, 2, 2, m).rect(IW - 11, 9, 2, 2, m).rect(IW - 8, 9, 2, 2, l);
  // 주사선처럼 빠진 줄(변형마다 다른 위치)
  const cut = 6 + variant * 9;
  for (let x = 2; x < IW - 2; x++) if (r() < 0.55) g.set(x, cut % (IH - 8) + 4, '.');
  return sp(g, { x: IW / 2, y: IH / 2 });
}

const mk = (kind: keyof typeof INK, seed: number, o: Partial<ImpOpts>) =>
  impression(INK[kind], { seed, tilt: 0, dry: 0.35, wobble: 1, splat: 0.7, ...o });

// ───────────────────────── 손에 쥐는 도장 ─────────────────────────

/** 세로 단면 프로필로 만든 선반(旋盤) 손잡이. 왼쪽 밝음 → 오른쪽 어두움. */
function lathe(g: Grid, cx: number, rows: [number, number][], tones: [string, string, string, string]): void {
  for (const [y, hw] of rows) {
    const x0 = cx - hw;
    const wdt = hw * 2;
    for (let i = 0; i < wdt; i++) {
      const t = i / Math.max(1, wdt - 1);
      g.set(x0 + i, y, t < 0.2 ? tones[0] : t < 0.5 ? tones[1] : t < 0.82 ? tones[2] : tones[3]);
    }
  }
}

function heldStamp(ink: { b: [string, string, string]; label: string }, pressed: boolean): Grid {
  const g = new Grid(32, 48);
  const dy = pressed ? 5 : 0;
  // 바닥 그림자
  if (pressed) {
    g.ellipse(16, 46, 15, 1.8, D.s3);
    g.ellipse(16, 46, 12, 1.1, D.s4);
  } else {
    g.ellipse(17, 45, 15, 2.4, D.s2);
    g.ellipse(17, 45, 12, 1.6, D.s3);
  }
  const W: [string, string, string, string] = [D.w0, D.w1, D.w2, D.w3];
  // 손잡이: 둥근 머리 → 목 → 마디 → 몸통 → 받침 플랜지
  const rows: [number, number][] = [
    [0, 3], [1, 5], [2, 7], [3, 8], [4, 8], [5, 9], [6, 9], [7, 9], [8, 8], [9, 7], [10, 6],
    [11, 4], [12, 4], [13, 4], [14, 5], [15, 6], [16, 5], [17, 4], [18, 4], [19, 4], [20, 5],
    [21, 6], [22, 6], [23, 5], [24, 5], [25, 5], [26, 5], [27, 6], [28, 8], [29, 9],
  ].map(([y, hw]) => [y + 1 + dy, hw] as [number, number]);
  lathe(g, 16, rows, W);
  // 머리 하이라이트 + 결
  g.set(11, 5 + dy, D.a3).set(10, 6 + dy, D.a2).set(11, 6 + dy, D.a2).set(10, 7 + dy, D.a2).set(9, 8 + dy, D.w0);
  g.vline(13, 13 + dy, 4, D.w0);
  g.vline(12, 22 + dy, 5, D.w0);
  // 마디 홈
  g.hline(12, 16 + dy, 8, D.w3).hline(12, 21 + dy, 8, D.w3);
  // 플랜지 아래 그늘
  g.hline(7, 31 + dy, 18, D.w3);
  // 받침(고무 + 잉크 단면)
  const by = 32 + dy;
  g.rect(3, by, 26, 10, D.k4);
  g.hline(3, by, 26, D.k7);
  g.hline(3, by + 1, 26, D.k6);
  g.vline(3, by, 10, D.k6);
  g.vline(28, by, 10, D.k2);
  g.vline(27, by + 1, 9, D.k3);
  // 잉크 묻은 면(아래쪽 띠): 색은 도장마다 다르다
  g.rect(3, by + 6, 26, 4, ink.b[1]);
  g.hline(3, by + 6, 26, ink.b[0]);
  g.vline(28, by + 6, 4, ink.b[2]);
  g.hline(3, by + 9, 26, ink.b[2]);
  g.hline(5, by + 7, 5, ink.b[0]);
  // 받침 측면: 나사 + 음각 눈금
  g.set(6, by + 3, D.k8).set(25, by + 3, D.k8).set(6, by + 4, D.k2).set(25, by + 4, D.k2);
  g.hline(11, by + 3, 4, D.k3).hline(17, by + 3, 4, D.k3).hline(11, by + 4, 4, D.k5).hline(17, by + 4, 4, D.k5);
  // 눌렸을 때 가장자리로 번진 잉크
  if (pressed) {
    g.hline(0, by + 9, 4, ink.b[1]).hline(28, by + 9, 4, ink.b[1]);
    g.set(1, by + 10, ink.b[2]).set(30, by + 10, ink.b[2]).set(5, by + 10, ink.b[2]);
  }
  // 외곽선
  g.outline((n) => DESK_OUTLINE[n]);
  return g;
}

const HELD: Record<string, [string, string, string]> = {
  ok: [D.g3, D.g1, D.g0],
  fix: [D.u3, D.u1, D.u0],
  mismatch: [D.r0, D.r1, D.r3],
  system: [D.k9, D.k7, D.k5],
};

// ───────────────────────── 불일치 도장 면 클로즈업 ─────────────────────────

/**
 * TEMP: 거울상 글자 면 클로즈업. 실제 음각 글자는 그리지 않고 획 덩어리만 둔다.
 * 홈에 마른 붉은 잉크가 굳어 있다(장기간 같은 도장을 쓴 흔적).
 */
function stampFace(): PixelSprite {
  const N = 64;
  const g = new Grid(N, N);
  const r = rng(515);
  // 나무 블록 + 둥근 모서리
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const di = insetDist(x, y, 0, 0, N - 1, N - 1, 7);
      if (di >= 0) g.set(x, y, di < 1 ? D.w3 : di < 2 ? D.w1 : D.w2);
    }
  for (let i = 0; i < 12; i++) g.vline(1 + Math.floor(r() * 61), 2 + Math.floor(r() * 54), 3 + Math.floor(r() * 6), D.w3);
  g.hline(8, 1, 40, D.w0).vline(1, 8, 40, D.w1);
  // 고무판: 파인 바닥(어두움)
  const rx0 = 5;
  const ry0 = 5;
  const rw = 54;
  for (let y = ry0; y < ry0 + rw; y++)
    for (let x = rx0; x < rx0 + rw; x++) {
      const di = insetDist(x, y, rx0, ry0, rx0 + rw - 1, ry0 + rw - 1, 4);
      if (di >= 0) g.set(x, y, di < 1 ? D.k0 : D.k2);
    }
  g.speckle(r, D.k3, 0.08, 6, 6, 52, 52, D.k2);
  g.speckle(r, D.k1, 0.08, 6, 6, 52, 52, D.k2);
  // 솟은 면: 윗면 k6, 좌상 하이라이트 k8, 우하 그늘 k4
  const raise = (x: number, y: number, w: number, h: number) => {
    g.rect(x, y, w, h, D.k6);
    g.hline(x, y, w, D.k8).vline(x, y, h, D.k8);
    g.hline(x + 1, y + h - 1, w - 1, D.k4).vline(x + w - 1, y + 1, h - 1, D.k4);
  };
  const ring = (inset: number, th: number) => {
    const x0 = rx0 + inset;
    const y0 = ry0 + inset;
    const s = rw - inset * 2;
    raise(x0, y0, s, th);
    raise(x0, y0 + s - th, s, th);
    raise(x0, y0, th, s);
    raise(x0 + s - th, y0, th, s);
  };
  ring(3, 4);
  ring(11, 3);
  // 거울상 글자 자리표시(획 덩어리 3칸). 실제 음각 글자 아님.
  raise(16, 20, 12, 4);
  raise(23, 24, 4, 12);
  raise(16, 30, 7, 4);
  raise(31, 20, 4, 17);
  raise(35, 27, 8, 4);
  raise(35, 34, 8, 4);
  raise(46, 20, 4, 18);
  raise(40, 20, 6, 4);
  raise(40, 38, 10, 4);
  raise(17, 40, 10, 3);
  // 굳은 붉은 잉크: 솟은 면 가장자리 옆 홈(바닥)에 고인다
  const solid = (c: string) => c === D.k6 || c === D.k8 || c === D.k4;
  const crust: [number, number, string][] = [];
  for (let y = ry0 + 1; y < ry0 + rw - 1; y++)
    for (let x = rx0 + 1; x < rx0 + rw - 1; x++) {
      const c = g.get(x, y);
      if (c !== D.k2 && c !== D.k3 && c !== D.k1) continue;
      let near = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) if (solid(g.get(x + dx, y + dy))) near++;
      if (near >= 2 && r() < 0.5 + near * 0.08) crust.push([x, y, r() < 0.6 ? D.r2 : r() < 0.7 ? D.r3 : D.r1]);
    }
  for (const [x, y, c] of crust) g.set(x, y, c);
  // 굳은 덩어리 하이라이트
  for (let i = 0; i < 26; i++) {
    const [x, y] = crust[Math.floor(r() * crust.length)] ?? [0, 0];
    if (g.get(x, y) === D.r2) g.set(x, y, D.r0);
  }
  // 오른쪽 아래 각인 자리(작게 파인 사각형): 글자는 UI 가 얹는다
  g.rect(47, 50, 9, 4, D.k0);
  g.hline(47, 54, 9, D.k4);
  g.outline((n) => DESK_OUTLINE[n]);
  return sp(g, { x: 32, y: 32 });
}

// ───────────────────────── 내보내기 ─────────────────────────

export const DESK_STAMPS: Record<string, PixelSprite> = {
  // 확인 (녹)
  stamp_ok_a: mk('ok', 11, { tilt: 0.03, dry: 0.3 }),
  stamp_ok_b: mk('ok', 12, { tilt: -0.05, dry: 0.5, wobble: 1.15 }),
  stamp_ok_c: mk('ok', 13, { tilt: 0.0, dry: 0.2, splat: 1.2 }),
  // 정정 (청)
  stamp_fix_a: mk('fix', 21, { tilt: -0.04, dry: 0.3 }),
  stamp_fix_b: mk('fix', 22, { tilt: 0.05, dry: 0.5, wobble: 1.15 }),
  stamp_fix_c: mk('fix', 23, { tilt: 0.01, dry: 0.2, splat: 1.2 }),
  // 불일치 (적)
  stamp_mismatch_a: mk('mismatch', 31, { tilt: 0.04, dry: 0.3 }),
  stamp_mismatch_b: mk('mismatch', 32, { tilt: -0.05, dry: 0.5, wobble: 1.15 }),
  stamp_mismatch_c: mk('mismatch', 33, { tilt: 0.01, dry: 0.2, splat: 1.2 }),
  // 1년 묵은 불일치 (바래고 갈라진 잉크)
  stamp_mismatch_aged: mk('aged', 34, { tilt: -0.03, dry: 0.7, wobble: 1.3, splat: 0.4, aged: true }),
  // 시스템 '관측 오류 · 종결' (회색, 기계 인쇄)
  stamp_system_a: systemImpression(0),
  stamp_system_b: systemImpression(1),
  stamp_system_c: systemImpression(2),
  // 손에 쥐는 도장: 프레임 0 = 대기, 1 = 눌림
  stamp_hold_ok: sp([heldStamp({ b: HELD.ok, label: 'ok' }, false), heldStamp({ b: HELD.ok, label: 'ok' }, true)], { x: 16, y: 44 }),
  stamp_hold_fix: sp([heldStamp({ b: HELD.fix, label: 'fix' }, false), heldStamp({ b: HELD.fix, label: 'fix' }, true)], { x: 16, y: 44 }),
  stamp_hold_mismatch: sp([heldStamp({ b: HELD.mismatch, label: 'mm' }, false), heldStamp({ b: HELD.mismatch, label: 'mm' }, true)], { x: 16, y: 44 }),
  stamp_hold_system: sp([heldStamp({ b: HELD.system, label: 'sys' }, false), heldStamp({ b: HELD.system, label: 'sys' }, true)], { x: 16, y: 44 }),
  // 불일치 도장 면 클로즈업 (TEMP)
  stamp_face_mismatch: stampFace(),
};

/** 도장 종류 → 찍힌 자국 변형 키 */
export const STAMP_IMPRESSIONS = {
  ok: ['stamp_ok_a', 'stamp_ok_b', 'stamp_ok_c'],
  fix: ['stamp_fix_a', 'stamp_fix_b', 'stamp_fix_c'],
  mismatch: ['stamp_mismatch_a', 'stamp_mismatch_b', 'stamp_mismatch_c'],
  mismatchAged: ['stamp_mismatch_aged'],
  system: ['stamp_system_a', 'stamp_system_b', 'stamp_system_c'],
} as const;
