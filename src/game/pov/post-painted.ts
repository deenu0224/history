/**
 * 그림체 시안 B — 「고급 일러스트」 후처리(순수 CPU, 결정적, three·DOM 없음). 고해상도(780×1044 안팎), 픽셀화 없음.
 *
 *   1) 거리 기반 가림 그늘(SSAO 비슷한 수평 비교) — 접지·모서리·옷 주름 사이가 부드럽게 어두워진다.
 *   2) 공기 원근: 먼 곳은 따뜻한 연무로 바래고 흐려진다(+ 피사계 심도).
 *   3) 넓은 번짐(문빛·종이), 호박 색조.
 *   4) 붓질 필터: 일반화 쿠와하라(사분면 4개, 적분 영상) — 3D 기본 도형의 매끈한 음영이 붓 자국 덩어리가 된다.
 *      먼 곳·흐린 곳은 큰 붓, 초점 인물은 작은 붓.
 *   5) 먹 번짐 가장자리: 물체·거리 경계를 흐린 마스크로 어둡게 + 면 안의 밝기 차(DoG) 로 물감 고임.
 *   6) 한지 질감: 저주파 얼룩 + 섬유 가닥(짧은 곡선) — 종이에 칠한 느낌.
 *   7) 색 등급(그늘은 쪽빛 도는 먹, 밝음은 한지), 비네트, 고운 입자.
 *   8) 지워짐: 청록으로 씻겨 바래고(물감이 빠져 종이가 드러남), 위아래가 번지듯 닫힌다.
 */
import { MOOD, hexToRgb } from './palette';
import { mulberry32 } from './camera';
import type { PovOverlay } from './types';

export interface PaintedInput {
  w: number;
  h: number;
  rgba: Uint8Array | Uint8ClampedArray;
  depth: Float32Array;
  normal?: Float32Array;
  obj?: Uint16Array;
  objNames?: string[];
  focusDepth?: number;
  /** 빛줄기·먼지 덧칠(가산, sRGB RGBA) — 붓질 뒤에 얹는다 */
  glow?: Uint8Array | Uint8ClampedArray;
  /** 세로 초점 거리(px) — 가림 그늘 반경 계산 */
  focalPx: number;
  overlay: PovOverlay;
  seed: number;
  vignette?: number;
}

const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 상자 흐림(제자리, 반경 r) */
export function boxBlur(ch: Float32Array, w: number, h: number, r: number): void {
  if (r <= 0) return;
  const tmp = new Float32Array(Math.max(w, h));
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let s = 0;
    for (let i = -r; i <= r; i++) s += ch[o + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) {
      tmp[x] = s / n;
      s += ch[o + Math.min(w - 1, x + r + 1)] - ch[o + Math.max(0, x - r)];
    }
    for (let x = 0; x < w; x++) ch[o + x] = tmp[x];
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let i = -r; i <= r; i++) s += ch[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      tmp[y] = s / n;
      s += ch[Math.min(h - 1, y + r + 1) * w + x] - ch[Math.max(0, y - r) * w + x];
    }
    for (let y = 0; y < h; y++) ch[y * w + x] = tmp[y];
  }
}
const gauss3 = (ch: Float32Array, w: number, h: number, r: number) => {
  const a = Math.max(1, Math.round(r / 1.7));
  boxBlur(ch, w, h, a);
  boxBlur(ch, w, h, a);
  boxBlur(ch, w, h, a);
};

/** 값 잡음(격자 해시 + 부드러운 보간) */
function valueNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
}

/**
 * 일반화 쿠와하라(사분면 4개). 반경 rad[i] 를 픽셀마다 고른다(0 이면 그대로). 적분 영상으로 O(N).
 * 사분면 중 밝기 분산이 가장 작은 쪽의 평균 — 가장자리를 지키며 면을 붓 자국 덩어리로 만든다.
 */
function kuwahara(R: Float32Array, G: Float32Array, B: Float32Array, w: number, h: number, rad: Uint8Array): void {
  const W1 = w + 1;
  const sz = W1 * (h + 1);
  const iR = new Float64Array(sz);
  const iG = new Float64Array(sz);
  const iB = new Float64Array(sz);
  const iL2 = new Float64Array(sz);
  const iL = new Float64Array(sz);
  for (let y = 0; y < h; y++) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sl = 0;
    let sl2 = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const L = lum(R[i], G[i], B[i]);
      sr += R[i];
      sg += G[i];
      sb += B[i];
      sl += L;
      sl2 += L * L;
      const k = (y + 1) * W1 + x + 1;
      const u = y * W1 + x + 1;
      iR[k] = iR[u] + sr;
      iG[k] = iG[u] + sg;
      iB[k] = iB[u] + sb;
      iL[k] = iL[u] + sl;
      iL2[k] = iL2[u] + sl2;
    }
  }
  const sum = (I: Float64Array, x0: number, y0: number, x1: number, y1: number) => I[(y1 + 1) * W1 + x1 + 1] - I[y0 * W1 + x1 + 1] - I[(y1 + 1) * W1 + x0] + I[y0 * W1 + x0];
  const oR = new Float32Array(w * h);
  const oG = new Float32Array(w * h);
  const oB = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = rad[i];
      if (r === 0) {
        oR[i] = R[i];
        oG[i] = G[i];
        oB[i] = B[i];
        continue;
      }
      const xa = Math.max(0, x - r);
      const xb = Math.min(w - 1, x + r);
      const ya = Math.max(0, y - r);
      const yb = Math.min(h - 1, y + r);
      // 네 사분면(겹치는 가운데 행·열 포함), 분산 가중 평균(부드러운 쿠와하라: 1/(1+σ²·k)^4)
      let tw = 0;
      let ar = 0;
      let ag = 0;
      let ab = 0;
      for (let q = 0; q < 4; q++) {
        const x0 = q & 1 ? x : xa;
        const x1 = q & 1 ? xb : x;
        const y0 = q & 2 ? y : ya;
        const y1 = q & 2 ? yb : y;
        const n = (x1 - x0 + 1) * (y1 - y0 + 1);
        const m = sum(iL, x0, y0, x1, y1) / n;
        const v = Math.max(0, sum(iL2, x0, y0, x1, y1) / n - m * m);
        const wt = 1 / Math.pow(1 + v * 900, 4);
        tw += wt;
        ar += (sum(iR, x0, y0, x1, y1) / n) * wt;
        ag += (sum(iG, x0, y0, x1, y1) / n) * wt;
        ab += (sum(iB, x0, y0, x1, y1) / n) * wt;
      }
      oR[i] = ar / tw;
      oG[i] = ag / tw;
      oB[i] = ab / tw;
    }
  R.set(oR);
  G.set(oG);
  B.set(oB);
}

export function postPainted(inp: PaintedInput): Uint8ClampedArray {
  const { w, h, depth, overlay } = inp;
  const erased = overlay === 'erased';
  const N = w * h;
  const R = new Float32Array(N);
  const G = new Float32Array(N);
  const B = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    R[i] = inp.rgba[i * 4] / 255;
    G[i] = inp.rgba[i * 4 + 1] / 255;
    B[i] = inp.rgba[i * 4 + 2] / 255;
  }
  const rnd = mulberry32(inp.seed);
  const scale = w / 390; // 390 CSS 폭 기준 배율

  // 1) 가림 그늘(수평 비교 AO) ───────────────────────────
  const ao = new Float32Array(N).fill(1);
  {
    const K = 16;
    const dirs: [number, number][] = [];
    for (let k = 0; k < K; k++) {
      const a = (k / K) * Math.PI * 2 + 0.3;
      dirs.push([Math.cos(a), Math.sin(a)]);
    }
    const rr = mulberry32(inp.seed ^ 0x55);
    const radWorld = 0.45; // m
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        const d = depth[i];
        if (!(d < 40)) continue;
        const rp = Math.min(60 * scale, (radWorld * inp.focalPx) / d);
        if (rp < 1.5) continue;
        let occ = 0;
        const jit = rr();
        for (let k = 0; k < K; k++) {
          const s = ((k % 4) + 0.5 + jit) / 4.5;
          const xx = Math.round(x + dirs[k][0] * rp * s);
          const yy = Math.round(y + dirs[k][1] * rp * s);
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const dd = depth[yy * w + xx];
          const diff = d - dd; // 표본이 더 가까우면 +
          if (diff > 0.02 && diff < radWorld * 1.6) occ += smooth(0.02, 0.18, diff) * (1 - smooth(radWorld * 0.8, radWorld * 1.6, diff));
        }
        ao[i] = 1 - (occ / K) * 1.25;
      }
    gauss3(ao, w, h, 2 * scale);
    for (let i = 0; i < N; i++) {
      const a = Math.max(0.35, Math.min(1, ao[i]));
      // 그늘은 따뜻한 먹 쪽으로(검정이 아니라 갈색 그늘)
      R[i] *= a;
      G[i] *= 0.06 + a * 0.94 - (1 - a) * 0.04;
      B[i] *= 0.1 + a * 0.9 - (1 - a) * 0.08;
    }
  }

  // 2) 공기 원근 + 피사계 심도 ──────────────────────────────
  {
    const bR = R.slice();
    const bG = G.slice();
    const bB = B.slice();
    const r = Math.round(3 * scale);
    gauss3(bR, w, h, r);
    gauss3(bG, w, h, r);
    gauss3(bB, w, h, r);
    const [hr, hg, hb] = erased ? [0.55, 0.62, 0.62] : [0.78, 0.66, 0.5];
    const fd = inp.focusDepth;
    for (let i = 0; i < N; i++) {
      const d = depth[i];
      let m = 0;
      if (fd !== undefined) {
        const rel = Math.abs(d - fd) / fd;
        m = d < fd ? smooth(0.35, 0.8, rel) * 0.9 : smooth(0.5, 2.0, rel) * 0.7;
      } else if (d < 0.6) m = 0.7;
      if (m > 0) {
        R[i] += (bR[i] - R[i]) * m;
        G[i] += (bG[i] - G[i]) * m;
        B[i] += (bB[i] - B[i]) * m;
      }
      const haze = smooth(4, 16, d) * 0.22;
      if (haze > 0) {
        const L = lum(R[i], G[i], B[i]);
        R[i] += (hr * (0.35 + L) - R[i]) * haze;
        G[i] += (hg * (0.35 + L) - G[i]) * haze;
        B[i] += (hb * (0.35 + L) - B[i]) * haze;
      }
    }
  }

  // 3) 번짐(넓게, 두 반경) ─────────────────────────────────
  {
    const thr = 0.62;
    const bR = new Float32Array(N);
    const bG = new Float32Array(N);
    const bB = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const L = lum(R[i], G[i], B[i]);
      const k = Math.max(0, L - thr) / (1 - thr);
      bR[i] = R[i] * k;
      bG[i] = G[i] * k;
      bB[i] = B[i] * k;
    }
    const sR = bR.slice();
    const sG = bG.slice();
    const sB = bB.slice();
    gauss3(sR, w, h, 6 * scale);
    gauss3(sG, w, h, 6 * scale);
    gauss3(sB, w, h, 6 * scale);
    gauss3(bR, w, h, 22 * scale);
    gauss3(bG, w, h, 22 * scale);
    gauss3(bB, w, h, 22 * scale);
    const [ar, ag, ab] = (erased ? hexToRgb(MOOD.teal) : hexToRgb(MOOD.amber)).map((c) => c / 255);
    const s = erased ? 0.5 : 0.85;
    for (let i = 0; i < N; i++) {
      R[i] += (sR[i] * 0.5 + bR[i] * 0.8) * s * (0.4 + 0.6 * ar);
      G[i] += (sG[i] * 0.5 + bG[i] * 0.8) * s * (0.4 + 0.6 * ag);
      B[i] += (sB[i] * 0.5 + bB[i] * 0.8) * s * (0.4 + 0.6 * ab);
    }
  }

  // 4) 붓질(쿠와하라) ────────────────────────────────────
  {
    const rad = new Uint8Array(N);
    const fd = inp.focusDepth;
    const base = Math.max(2, Math.round(4.5 * scale));
    for (let i = 0; i < N; i++) {
      const d = depth[i];
      let r = base;
      if (fd !== undefined && d < 40) {
        const rel = Math.abs(d - fd) / fd;
        r = Math.round(base * (0.75 + 0.9 * smooth(0.2, 1.5, rel)));
      } else if (!(d < 40)) r = Math.round(base * 1.6);
      rad[i] = Math.min(12, r);
    }
    kuwahara(R, G, B, w, h, rad);
    // 두 번째(작은 붓) — 붓 자국 가장자리를 다듬는다
    for (let i = 0; i < N; i++) rad[i] = Math.max(1, Math.round(rad[i] * 0.5));
    kuwahara(R, G, B, w, h, rad);
  }

  // 4b) 붓 결: 구조 텐서 방향(형태의 결)을 따라 흰 잡음을 선 적분(LIC) → 붓 자국 명암 ──────────
  {
    const L0 = new Float32Array(N);
    for (let i = 0; i < N; i++) L0[i] = lum(R[i], G[i], B[i]);
    gauss3(L0, w, h, 2 * scale);
    const Jxx = new Float32Array(N);
    const Jxy = new Float32Array(N);
    const Jyy = new Float32Array(N);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = (L0[i + 1] - L0[i - 1]) * 0.5;
        const gy = (L0[i + w] - L0[i - w]) * 0.5;
        Jxx[i] = gx * gx;
        Jxy[i] = gx * gy;
        Jyy[i] = gy * gy;
      }
    gauss3(Jxx, w, h, 4 * scale);
    gauss3(Jxy, w, h, 4 * scale);
    gauss3(Jyy, w, h, 4 * scale);
    const tx = new Float32Array(N);
    const ty = new Float32Array(N);
    const defA = -0.55; // 결이 없는 넓은 면: 비스듬한 붓질
    const cohK = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Jxx[i];
      const b = Jxy[i];
      const c = Jyy[i];
      const tr = a + c;
      const disc = Math.sqrt(Math.max(0, (a - c) * (a - c) + 4 * b * b));
      const coh = tr > 1e-9 ? disc / tr : 0;
      const th = 0.5 * Math.atan2(2 * b, a - c) + Math.PI / 2; // 기울기에 수직 = 형태를 따라
      const k = smooth(0.3, 0.75, coh) * smooth(1.5e-4, 1.5e-3, tr);
      cohK[i] = k;
      const vx = Math.cos(th) * k + Math.cos(defA) * (1 - k);
      const vy = Math.sin(th) * k + Math.sin(defA) * (1 - k);
      const l = Math.hypot(vx, vy) || 1;
      tx[i] = vx / l;
      ty[i] = vy / l;
    }
    // 잡음(붓 털 굵기 ≈ 1.5px@390)
    const cell = Math.max(1, Math.round(1.2 * scale));
    const nw = Math.ceil(w / cell) + 1;
    const nh = Math.ceil(h / cell) + 1;
    const noise = new Float32Array(nw * nh);
    for (let i = 0; i < noise.length; i++) noise[i] = rnd() - 0.5;
    const samp = (x: number, y: number) => noise[Math.min(nh - 1, Math.max(0, Math.floor(y / cell))) * nw + Math.min(nw - 1, Math.max(0, Math.floor(x / cell)))];
    const steps = Math.round(9 * scale);
    const st = new Float32Array(N);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let acc = samp(x, y);
        for (const sgn of [1, -1]) {
          let px = x + 0.5;
          let py = y + 0.5;
          let i = y * w + x;
          let lx = tx[i] * sgn;
          let ly = ty[i] * sgn;
          for (let s2 = 0; s2 < steps; s2++) {
            px += lx;
            py += ly;
            const xi = px | 0;
            const yi = py | 0;
            if (xi < 0 || yi < 0 || xi >= w || yi >= h) break;
            i = yi * w + xi;
            let nx = tx[i];
            let ny = ty[i];
            if (nx * lx + ny * ly < 0) {
              nx = -nx;
              ny = -ny;
            }
            lx = nx;
            ly = ny;
            acc += samp(px, py);
          }
        }
        st[y * w + x] = acc / Math.sqrt(2 * steps + 1);
      }
    for (let i = 0; i < N; i++) {
      const L = lum(R[i], G[i], B[i]);
      const k = 1 + st[i] * (0.03 + 0.06 * cohK[i]) * (0.4 + smooth(0.03, 0.3, L) - 0.6 * smooth(0.55, 0.95, L));
      R[i] *= k;
      G[i] *= k;
      B[i] *= k;
    }
  }

  // 5) 먹 번짐 가장자리(물체·거리 경계) + 물감 고임(DoG) ───────────────
  {
    const edge = new Float32Array(N);
    const obj = inp.obj;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const d = depth[i];
        let e = 0;
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          const dj = depth[j];
          if (dj > d * 1.08 + 0.04) e = 1; // 가까운 쪽 가장자리
          else if (obj && obj[j] !== obj[i] && Math.abs(dj - d) < 0.3) e = Math.max(e, 0.45);
        }
        edge[i] = e;
      }
    const soft = edge.slice();
    gauss3(soft, w, h, 1.6 * scale);
    const Lb = new Float32Array(N);
    for (let i = 0; i < N; i++) Lb[i] = lum(R[i], G[i], B[i]);
    const Lw = Lb.slice();
    gauss3(Lw, w, h, 7 * scale);
    for (let i = 0; i < N; i++) {
      const k = 1 - Math.min(0.5, soft[i] * 0.7) - Math.max(0, Lw[i] - Lb[i]) * 0.9;
      const kk = Math.max(0.3, k);
      R[i] *= kk;
      G[i] *= kk * 0.98 + 0.02 * (1 - soft[i]);
      B[i] *= kk * 0.95 + 0.05 * (1 - soft[i]);
    }
  }

  // 5b) 먹선(수묵채색의 윤곽): 사람·가까운 물체 실루엣에 굵기가 변하는 붓 선 ───────────
  if (inp.obj && inp.objNames) {
    const obj = inp.obj;
    const isFig = inp.objNames.map((n) => n.startsWith('fig_') || n === 'self');
    const line = new Float32Array(N);
    const nz = valueNoise(inp.seed + 101);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const d = depth[i];
        if (!(d < 40)) continue;
        let e = 0;
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          if (depth[j] > d * 1.06 + 0.03) e = Math.max(e, isFig[obj[i]] ? 1 : 0.55);
          else if (isFig[obj[i]] && obj[j] !== obj[i] && depth[j] > d) e = Math.max(e, 0.8);
        }
        if (!e) continue;
        // 굵기: 붓 압력(잡음) × 가까울수록 굵게
        const press = nz(x / (14 * scale), y / (14 * scale));
        const r = (0.4 + 1.6 * press * press) * scale * (0.7 + 0.6 * smooth(6, 1, d));
        const ri = Math.ceil(r);
        for (let yy = -ri; yy <= ri; yy++)
          for (let xx = -ri; xx <= ri; xx++) {
            const xa = x + xx;
            const ya = y + yy;
            if (xa < 0 || ya < 0 || xa >= w || ya >= h) continue;
            const dd = Math.hypot(xx, yy);
            if (dd > r + 0.5) continue;
            const j = ya * w + xa;
            // 선은 가까운 쪽(물체 안)으로만 번진다
            if (depth[j] > d * 1.06 + 0.03) continue;
            const a = e * Math.min(1, r + 0.5 - dd);
            if (a > line[j]) line[j] = a;
          }
      }
    gauss3(line, w, h, 0.5 * scale);
    for (let i = 0; i < N; i++) {
      const a = Math.min(1, line[i]) * 0.78;
      if (a <= 0) continue;
      R[i] += (0.07 - R[i]) * a;
      G[i] += (0.06 - G[i]) * a;
      B[i] += (0.055 - B[i]) * a;
    }
  }

  // 5c) 빛줄기·먼지: 붓질 뒤에 가산(먼지는 작은 번짐 + 심지), 빛줄기는 부드럽게 ─────────
  if (inp.glow) {
    const gR = new Float32Array(N);
    const gG = new Float32Array(N);
    const gB = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      gR[i] = inp.glow[i * 4] / 255;
      gG[i] = inp.glow[i * 4 + 1] / 255;
      gB[i] = inp.glow[i * 4 + 2] / 255;
    }
    const hR = gR.slice();
    const hG = gG.slice();
    const hB = gB.slice();
    gauss3(hR, w, h, 2.5 * scale);
    gauss3(hG, w, h, 2.5 * scale);
    gauss3(hB, w, h, 2.5 * scale);
    for (let i = 0; i < N; i++) {
      R[i] += gR[i] * 0.4 + hR[i] * 0.75;
      G[i] += gG[i] * 0.36 + hG[i] * 0.66;
      B[i] += gB[i] * 0.28 + hB[i] * 0.48;
    }
  }

  // 6) 한지 질감: 얼룩 + 섬유 ─────────────────────────────
  {
    const n1 = valueNoise(inp.seed + 11);
    const n2 = valueNoise(inp.seed + 23);
    const tex = new Float32Array(N);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / scale;
        const v = y / scale;
        const blot = n1(u / 60, v / 60) * 0.55 + n1(u / 22, v / 22) * 0.3 + n2(u / 7, v / 7) * 0.15;
        tex[y * w + x] = (blot - 0.5) * 0.16;
      }
    // 섬유: 짧은 곡선 가닥(밝거나 어둡게)
    const fibres = Math.round(1400 * scale * scale);
    for (let k = 0; k < fibres; k++) {
      let x = rnd() * w;
      let y = rnd() * h;
      let a = rnd() * Math.PI * 2;
      const len = (8 + rnd() * 30) * scale;
      const s = (rnd() < 0.5 ? -1 : 1) * (0.025 + rnd() * 0.035);
      for (let t = 0; t < len; t++) {
        const xi = Math.round(x);
        const yi = Math.round(y);
        if (xi >= 0 && yi >= 0 && xi < w && yi < h) tex[yi * w + xi] += s;
        a += (rnd() - 0.5) * 0.25;
        x += Math.cos(a);
        y += Math.sin(a);
      }
    }
    gauss3(tex, w, h, 0.6 * scale);
    for (let i = 0; i < N; i++) {
      const L = lum(R[i], G[i], B[i]);
      // 밝은 곳(종이처럼 칠이 얇은 곳) 에서 질감이 더 보인다
      const k = 1 + tex[i] * (0.5 + 0.8 * Math.min(1, L));
      R[i] *= k;
      G[i] *= k;
      B[i] *= k;
    }
  }

  // 7) 색 등급 + 비네트 + 입자 ─────────────────────────────
  const vigK = inp.vignette ?? (erased ? 0.4 : 0.55);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let r = R[i];
      let g = G[i];
      let b = B[i];
      let L = lum(r, g, b);
      if (!erased) {
        const L2 = Math.pow(Math.min(1.3, L), 1.15);
        const k = L > 1e-4 ? L2 / L : 0;
        r *= k;
        g *= k;
        b *= k;
        L = L2;
        const sat = 0.82;
        r = L + (r - L) * sat;
        g = L + (g - L) * sat;
        b = L + (b - L) * sat;
        // 그늘: 쪽빛 도는 먹(아주 조금), 밝음: 한지
        const sh = 1 - smooth(0, 0.3, L);
        r += sh * 0.004 - (1 - sh) * 0;
        g += sh * 0.008;
        b += sh * 0.016;
        const hi = smooth(0.55, 1.0, L);
        r += hi * 0.03;
        g += hi * 0.015;
        b -= hi * 0.02;
        // 검은 바닥을 먹색으로 들어 올림(순흑 금지)
        // 그늘 들어 올림(따뜻한 갈색 먹 — 깎아지른 검정이 아니라 칠한 어둠)
        const lift = 1 - smooth(0, 0.25, L);
        r = 0.035 + r * 0.965 + lift * 0.035;
        g = 0.03 + g * 0.97 + lift * 0.024;
        b = 0.027 + b * 0.973 + lift * 0.018;
      } else {
        // 물감이 빠져 종이가 드러나는 지워짐: 대비를 줄이고 청록으로 씻는다
        const c = Math.pow(Math.min(1, L), 0.9);
        const wash = 0.25 + c * 0.7;
        r = wash * 0.72;
        g = wash * 0.9;
        b = wash * 0.88;
      }
      const dx = (x / (w - 1) - 0.5) * 2;
      const dy = (y / (h - 1) - 0.48) * 2;
      const rr = Math.sqrt(dx * dx * 0.9 + dy * dy * 0.75);
      let vig = 1 - vigK * smooth(0.45, 1.3, rr);
      if (erased) {
        const v = y / (h - 1);
        const jag = (Math.sin(x * 0.02 + inp.seed) + Math.sin(x * 0.007 + 2)) * 0.015;
        const lid = smooth(0.0 + jag, 0.2 + jag, v) * smooth(0.0 - jag, 0.17 - jag, 1 - v);
        vig *= 0.1 + 0.9 * lid;
      }
      const grain = (rnd() - 0.5) * 0.03;
      R[i] = r * vig + grain;
      G[i] = g * vig + grain;
      B[i] = b * vig + grain;
    }

  // 8) 지워짐: 가로로 씻긴 띠(물감이 빠져 바탕 종이가 드러남) ───────────
  if (erased) {
    for (let k = 0; k < 7; k++) {
      const y0 = Math.floor(rnd() * h);
      const bh = Math.round((3 + rnd() * 14) * scale);
      const dx = Math.round((rnd() - 0.5) * 40 * scale);
      const fade = 0.35 + rnd() * 0.4;
      for (let y = y0; y < Math.min(h, y0 + bh); y++) {
        const t = Math.sin(((y - y0) / bh) * Math.PI);
        const o = y * w;
        const rr = R.slice(o, o + w);
        const gg = G.slice(o, o + w);
        const bb = B.slice(o, o + w);
        for (let x = 0; x < w; x++) {
          const sx = Math.min(w - 1, Math.max(0, x - Math.round(dx * t)));
          const m = fade * t;
          R[o + x] = rr[sx] + (0.42 - rr[sx]) * m;
          G[o + x] = gg[sx] + (0.52 - gg[sx]) * m;
          B[o + x] = bb[sx] + (0.5 - bb[sx]) * m;
        }
      }
    }
  }

  const out = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    out[i * 4] = Math.round(R[i] * 255);
    out[i * 4 + 1] = Math.round(G[i] * 255);
    out[i * 4 + 2] = Math.round(B[i] * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
}
