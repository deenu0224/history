/**
 * 픽셀 후처리(순수 CPU, 결정적). 저해상도 렌더 → 거리 흐림·번짐(bloom)·명암 등급·비네트·필름 입자 → 제한 팔레트 + 4×4 Bayer 디더.
 * 'erased' 는 차갑게 탈색, 잡음, 가로 찢김, 눈꺼풀처럼 어두워지는 위아래 가장자리.
 * 브라우저·노드 공용(three·DOM 없음) → 단위 테스트 가능.
 */
import { MEMORY_PALETTE, ERASED_PALETTE, MOOD, buildLut, hexToRgb } from './palette';
import { mulberry32 } from './camera';
import type { PovOverlay } from './types';

export interface PostInput {
  w: number;
  h: number;
  /** sRGB RGBA, 위쪽 행부터 */
  rgba: Uint8ClampedArray | Uint8Array;
  /** 픽셀별 카메라 거리(m). 하늘 = Infinity. 없으면 거리 효과 생략 */
  depth?: Float32Array;
  /** 초점 거리(m) — 은근한 피사계 심도 */
  focusDepth?: number;
  overlay: PovOverlay;
  seed: number;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);

let memLut: ReturnType<typeof buildLut> | null = null;
let ersLut: ReturnType<typeof buildLut> | null = null;
export const lutFor = (o: PovOverlay) =>
  o === 'erased' ? (ersLut ??= buildLut(ERASED_PALETTE)) : (memLut ??= buildLut(MEMORY_PALETTE));

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 한 채널 상자 흐림(가로+세로, 반경 r), 제자리 */
function boxBlur(ch: Float32Array, w: number, h: number, r: number): void {
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

const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function postProcess(inp: PostInput): Uint8ClampedArray {
  const { w, h, rgba, depth, overlay } = inp;
  const N = w * h;
  const R = new Float32Array(N);
  const G = new Float32Array(N);
  const B = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    R[i] = rgba[i * 4] / 255;
    G[i] = rgba[i * 4 + 1] / 255;
    B[i] = rgba[i * 4 + 2] / 255;
  }
  const rnd = mulberry32(inp.seed);

  // 1) 거리: 은근한 피사계 심도 + 먼 곳 채도 −30%(A12)
  if (depth) {
    const bR = R.slice();
    const bG = G.slice();
    const bB = B.slice();
    boxBlur(bR, w, h, 1);
    boxBlur(bG, w, h, 1);
    boxBlur(bB, w, h, 1);
    const fd = inp.focusDepth;
    for (let i = 0; i < N; i++) {
      const d = depth[i];
      let m = 0;
      if (fd !== undefined) {
        const rel = Math.abs(d - fd) / fd;
        m = d < fd ? smooth(0.35, 0.8, rel) * 0.85 : smooth(0.6, 2.2, rel) * 0.55;
      } else if (d < 0.6) m = 0.7; // 아주 가까운 것(내 소매)은 언제나 흐림
      if (m > 0) {
        R[i] += (bR[i] - R[i]) * m;
        G[i] += (bG[i] - G[i]) * m;
        B[i] += (bB[i] - B[i]) * m;
      }
      const far = smooth(5, 13, d);
      if (far > 0) {
        const L = lum(R[i], G[i], B[i]);
        const k = 0.3 * far;
        R[i] += (L - R[i]) * k;
        G[i] += (L - G[i]) * k;
        B[i] += (L - B[i]) * k;
      }
    }
  }

  // 2) 번짐: 밝은 곳(종이·문빛·등잔)만, 반 해상도에서 흐려 따뜻하게 더한다
  {
    const hw = Math.ceil(w / 2);
    const hh = Math.ceil(h / 2);
    const thr = overlay === 'erased' ? 0.62 : 0.68;
    const bR = new Float32Array(hw * hh);
    const bG = new Float32Array(hw * hh);
    const bB = new Float32Array(hw * hh);
    for (let y = 0; y < hh; y++)
      for (let x = 0; x < hw; x++) {
        const i = Math.min(h - 1, y * 2) * w + Math.min(w - 1, x * 2);
        const L = lum(R[i], G[i], B[i]);
        const k = Math.max(0, L - thr) / (1 - thr);
        const j = y * hw + x;
        bR[j] = R[i] * k;
        bG[j] = G[i] * k;
        bB[j] = B[i] * k;
      }
    for (const ch of [bR, bG, bB]) {
      boxBlur(ch, hw, hh, 3);
      boxBlur(ch, hw, hh, 3);
    }
    const [ar, ag, ab] = hexToRgb(MOOD.amber).map((c) => c / 255);
    const s = overlay === 'erased' ? 0.35 : 0.75;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        // 이중선형 업샘플
        const fx = Math.min(hw - 1.001, x / 2);
        const fy = Math.min(hh - 1.001, y / 2);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fx - x0;
        const ty = fy - y0;
        const j = y0 * hw + x0;
        const samp = (c: Float32Array) =>
          (c[j] * (1 - tx) + c[j + 1] * tx) * (1 - ty) + (c[j + hw] * (1 - tx) + c[j + hw + 1] * tx) * ty;
        const i = y * w + x;
        R[i] += samp(bR) * s * (0.5 + 0.5 * ar);
        G[i] += samp(bG) * s * (0.5 + 0.5 * ag);
        B[i] += samp(bB) * s * (0.5 + 0.5 * ab);
      }
  }

  // 3) 등급 + 비네트 + 입자
  const erased = overlay === 'erased';
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let r = R[i];
      let g = G[i];
      let b = B[i];
      let L = lum(r, g, b);
      if (!erased) {
        // 명암(키아로스쿠로): 그늘은 더 깊게, 밝음은 한지까지
        const L2 = Math.pow(Math.min(1.2, L), 1.18);
        const k = L > 1e-4 ? L2 / L : 0;
        r *= k;
        g *= k;
        b *= k;
        L = L2;
        // 채도 0.88, 그늘은 따뜻한 먹 쪽으로
        const sat = 0.88;
        r = L + (r - L) * sat;
        g = L + (g - L) * sat;
        b = L + (b - L) * sat;
        const sh = 1 - smooth(0.0, 0.35, L);
        r += sh * 0.012;
        g += sh * 0.006;
        b -= sh * 0.004;
      } else {
        // 탈색 + 차갑게
        const c = Math.pow(Math.min(1, L), 1.05) * 0.92;
        r = c * 0.86;
        g = c * 1.0;
        b = c * 1.0;
      }
      // 비네트(타원). 기억: 시선 쪽이 밝은 타원(A14). 지워짐: 위아래 눈꺼풀
      const dx = (x / (w - 1) - 0.5) * 2;
      const dy = (v - 0.48) * 2;
      const rr = Math.sqrt(dx * dx * 0.9 + dy * dy * 0.75);
      let vig = 1 - (erased ? 0.35 : 0.62) * smooth(0.5, 1.25, rr);
      if (erased) {
        const jag = (Math.sin(x * 0.37 + inp.seed) + Math.sin(x * 0.11 + 2.0)) * 0.012;
        const lid = smooth(0.02 + jag, 0.2 + jag, v) * smooth(0.02 - jag, 0.17 - jag, 1 - v);
        vig *= 0.08 + 0.92 * lid;
      }
      const grain = (rnd() - 0.5) * (erased ? 0.09 : 0.035);
      R[i] = r * vig + grain;
      G[i] = g * vig + grain;
      B[i] = b * vig + grain;
    }
  }

  // 4) 지워짐: 가로 찢김(행을 밀거나 비움)
  if (erased) {
    const bands = 9;
    for (let k = 0; k < bands; k++) {
      const y0 = Math.floor(rnd() * h);
      const bh = 1 + Math.floor(rnd() * 3);
      const dx = Math.round((rnd() - 0.5) * 30);
      const blank = rnd() < 0.35;
      for (let y = y0; y < Math.min(h, y0 + bh); y++) {
        const o = y * w;
        const rr = R.slice(o, o + w);
        const gg = G.slice(o, o + w);
        const bb = B.slice(o, o + w);
        for (let x = 0; x < w; x++) {
          const sx = Math.min(w - 1, Math.max(0, x - dx));
          if (blank) {
            const n = rnd() < 0.12 ? 0.25 : 0.03;
            R[o + x] = G[o + x] = B[o + x] = n;
          } else {
            R[o + x] = rr[sx] * 1.15;
            G[o + x] = gg[sx] * 1.15;
            B[o + x] = bb[sx] * 1.15;
          }
        }
      }
    }
  }

  // 5) 양자화: Bayer 4×4 + 5비트 조회표
  const { lut, rgb } = lutFor(overlay);
  const spread = erased ? 0.1 : 0.075;
  const out = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const t = BAYER4[(y & 3) * 4 + (x & 3)] * spread;
      const q = (c: number) => Math.max(0, Math.min(31, Math.round((c + t) * 31)));
      const p = lut[(q(R[i]) << 10) | (q(G[i]) << 5) | q(B[i])] * 3;
      out[i * 4] = rgb[p];
      out[i * 4 + 1] = rgb[p + 1];
      out[i * 4 + 2] = rgb[p + 2];
      out[i * 4 + 3] = 255;
    }
  return out;
}
