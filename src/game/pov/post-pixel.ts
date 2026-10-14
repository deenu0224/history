/**
 * 그림체 시안 A — 「진짜 픽셀아트」 후처리(순수 CPU, 결정적, three·DOM 없음).
 *
 * 입력은 목표 해상도의 2배로 그린 렌더(색 + 거리 + 법선 + 물체 번호). 과정:
 *   1) 2×2 → 1 축소: 다수결 물체(인물·내 몸·종이 조각은 가중 2 — 가는 사모 날개·종이가 살아남는다) 의 색 평균.
 *   2) 고립 픽셀 정리(물체 번호): 사방이 다른 물체인 1px 섬을 이웃 물체로.
 *   3) 명암 등급: 대비·따뜻한 그늘 + 밝기 띠(포스터라이즈) — 인물은 띠 사이를 부드럽게 잇지 않는다(셀).
 *   4) 작은 팔레트(기억 23색 / 지워짐 10색) 양자화: 가장 가까운 두 색 사이의 경계 근처에서만 2×2 체커 디더.
 *      → 넓은 면은 단색 띠, 띠와 띠 사이에만 짧은 무늬.
 *   5) 색 고립 픽셀 정리(디더 무늬 아닌 1px 섬).
 *   6) 외곽선: 인물·내 몸의 바깥 1px 은 먹(가까운 쪽 픽셀), 안쪽 접힘(법선 꺾임)은 한 단 어둡게.
 *      방(기둥·서안) 은 거리가 끊기는 곳만 한 단 어둡게(선택 외곽선).
 *   7) 빛을 받는 윗가장자리 하이라이트 1px(인물 머리·어깨, 문빛 쪽).
 *   8) 지워짐: 위아래 눈꺼풀 띠(계단), 가로 찢김(행 밀기), 청록 팔레트.
 */
import { hexToRgb, rgbToOklab } from './palette';
import { mulberry32 } from './camera';
import type { PovOverlay } from './types';

/** 기억(따뜻함) 23색: 먹 4 · 나무 3 · 한지 3 · 호박 3 · 붉은 3 · 초록 2 · 남 2 · 피부 2 · 무명 1 */
export const PIXEL_PALETTE: readonly string[] = [
  '#0d0b0a', '#1a1613', '#2a231e', '#3d332b',
  '#5a4130', '#7e5d40', '#a78360',
  '#cdb68e', '#e8d8b2', '#f6ecd2',
  '#8e5a2a', '#c9873f', '#f0c27e',
  '#3e1a18', '#742f2a', '#a8473c',
  '#22362f', '#4a6e5d',
  '#26323f', '#51677c',
  '#8a5e44', '#c99b74',
  '#a9a291',
];

/** 지워진 기억 10색: 청록 8 + 무채 2 */
export const PIXEL_ERASED_PALETTE: readonly string[] = [
  '#07090a', '#111a1d', '#1d2c30', '#2c4245', '#3f5d5d', '#5c8783', '#86b0a9', '#bcd8d0',
  '#4b5257', '#7d868b',
];

export interface PixelInput {
  /** 입력(2배) 해상도 */
  w2: number;
  h2: number;
  rgba: Uint8Array | Uint8ClampedArray;
  depth: Float32Array;
  normal: Float32Array;
  obj: Uint16Array;
  objNames: string[];
  overlay: PovOverlay;
  seed: number;
  /** 비네트(기본 0.5) */
  vignette?: number;
  /** 초점 거리(m) — 초점 인물 둘레 외곽선을 조금 더 진하게 */
  focusDepth?: number;
}

export interface PixelOutput {
  w: number;
  h: number;
  rgba: Uint8ClampedArray;
  /** 축소 뒤 물체 번호(합성용: hd2d) */
  obj: Uint16Array;
  /** 인물·내 몸 + 그 외곽선 마스크(hd2d 합성용) */
  figMask: Uint8Array;
}

interface Pal {
  rgb: Uint8Array;
  lab: [number, number, number][];
  /** 5비트 조회: 가장 가까운 색 · 두 번째 · 섞임 비율(0..0.5 → 0..255) */
  p1: Uint8Array;
  p2: Uint8Array;
  t: Uint8Array;
}

const palCache = new Map<string, Pal>();

function buildPal(pal: readonly string[]): Pal {
  const key = pal.join();
  const hit = palCache.get(key);
  if (hit) return hit;
  const rgb = new Uint8Array(pal.length * 3);
  const lab = pal.map((h, i) => {
    const c = hexToRgb(h);
    rgb.set(c, i * 3);
    return rgbToOklab(c[0], c[1], c[2]);
  });
  const N = 32 * 32 * 32;
  const p1 = new Uint8Array(N);
  const p2 = new Uint8Array(N);
  const t = new Uint8Array(N);
  for (let r = 0; r < 32; r++)
    for (let g = 0; g < 32; g++)
      for (let b = 0; b < 32; b++) {
        const q = rgbToOklab((r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2));
        let b1 = 0;
        let d1 = Infinity;
        let b2 = 0;
        let d2 = Infinity;
        for (let i = 0; i < lab.length; i++) {
          const p = lab[i];
          const dl = (q[0] - p[0]) * 1.6;
          const da = q[1] - p[1];
          const db = q[2] - p[2];
          const d = Math.sqrt(dl * dl + da * da + db * db);
          if (d < d1) {
            b2 = b1;
            d2 = d1;
            b1 = i;
            d1 = d;
          } else if (d < d2) {
            b2 = i;
            d2 = d;
          }
        }
        const k = (r << 10) | (g << 5) | b;
        p1[k] = b1;
        p2[k] = b2;
        t[k] = Math.round((d1 / Math.max(1e-6, d1 + d2)) * 2 * 255);
      }
  const out = { rgb, lab: lab as [number, number, number][], p1, p2, t };
  palCache.set(key, out);
  return out;
}

const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Kind = 0 | 1 | 2 | 3 | 4; // 0 하늘 · 1 방 · 2 소품 · 3 종이 조각 · 4 사람(인물·내 몸)
const kindOf = (name: string | undefined): Kind =>
  !name ? 0 : name === 'hall' ? 1 : name.startsWith('slip:') ? 3 : name.startsWith('fig_') || name === 'self' ? 4 : 2;

export function postPixel(inp: PixelInput): PixelOutput {
  const { w2, h2, overlay } = inp;
  const erased = overlay === 'erased';
  const w = w2 >> 1;
  const h = h2 >> 1;
  const N = w * h;
  const kinds = inp.objNames.map(kindOf);
  kinds[0] = 0;

  // 1) 2×2 다수결 축소 ───────────────────────────────────
  const R = new Float32Array(N);
  const G = new Float32Array(N);
  const B = new Float32Array(N);
  const D = new Float32Array(N);
  const NZ = new Float32Array(N * 3);
  let obj = new Uint16Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const idx = [(2 * y) * w2 + 2 * x, (2 * y) * w2 + 2 * x + 1, (2 * y + 1) * w2 + 2 * x, (2 * y + 1) * w2 + 2 * x + 1];
      let best = -1;
      let bw = -1;
      let bd = Infinity;
      for (const s of idx) {
        const o = inp.obj[s];
        let wt = 0;
        for (const s2 of idx) if (inp.obj[s2] === o) wt += kinds[o] >= 3 ? 2 : 1;
        const d = inp.depth[s];
        if (wt > bw || (wt === bw && d < bd)) {
          bw = wt;
          best = o;
          bd = d;
        }
      }
      let n = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let d = Infinity;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (const s of idx)
        if (inp.obj[s] === best) {
          n++;
          r += inp.rgba[s * 4];
          g += inp.rgba[s * 4 + 1];
          b += inp.rgba[s * 4 + 2];
          d = Math.min(d, inp.depth[s]);
          nx += inp.normal[s * 3];
          ny += inp.normal[s * 3 + 1];
          nz += inp.normal[s * 3 + 2];
        }
      const i = y * w + x;
      R[i] = r / n / 255;
      G[i] = g / n / 255;
      B[i] = b / n / 255;
      D[i] = d;
      const nl = Math.hypot(nx, ny, nz) || 1;
      NZ[i * 3] = nx / nl;
      NZ[i * 3 + 1] = ny / nl;
      NZ[i * 3 + 2] = nz / nl;
      obj[i] = best;
    }

  // 2) 물체 번호 고립 픽셀 정리(사방이 같은 다른 물체면 그 물체로) ──
  {
    const o2 = obj.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const a = obj[i - 1];
        if (obj[i] !== a && obj[i + 1] === a && obj[i - w] === a && obj[i + w] === a && kinds[obj[i]] < 3) {
          o2[i] = a;
          R[i] = (R[i - 1] + R[i + 1]) / 2;
          G[i] = (G[i - 1] + G[i + 1]) / 2;
          B[i] = (B[i - 1] + B[i + 1]) / 2;
          D[i] = D[i - 1];
        }
      }
    obj = o2;
  }

  // 3) 등급 + 비네트 + 밝기 띠 ─────────────────────────────
  const vigK = inp.vignette ?? (erased ? 0.3 : 0.5);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let r = R[i];
      let g = G[i];
      let b = B[i];
      let L = lum(r, g, b);
      if (!erased) {
        // 명암: 그늘 깊게, 밝음 한지로 — 컷보다 대비를 조금 더(작은 화면에서 띠가 읽히게)
        const L2 = Math.pow(Math.min(1.2, L), 1.15);
        const k = L > 1e-4 ? L2 / L : 0;
        r *= k;
        g *= k;
        b *= k;
        L = L2;
        const sat = 0.92;
        r = L + (r - L) * sat;
        g = L + (g - L) * sat;
        b = L + (b - L) * sat;
        const sh = 1 - smooth(0, 0.3, L);
        r += sh * 0.015;
        g += sh * 0.006;
        b -= sh * 0.006;
        // 먼 곳은 바랜다(A12)
        const far = smooth(5, 13, D[i]);
        if (far > 0) {
          r += (L - r) * 0.3 * far;
          g += (L - g) * 0.3 * far;
          b += (L - b) * 0.3 * far;
        }
      } else {
        const c = Math.pow(Math.min(1, L), 1.05) * 0.95;
        r = c * 0.86;
        g = c;
        b = c;
      }
      // 비네트(계단 — 띠 4단)
      const dx = (x / (w - 1) - 0.5) * 2;
      const dy = (y / (h - 1) - 0.48) * 2;
      const rr = Math.sqrt(dx * dx * 0.9 + dy * dy * 0.75);
      const vig = 1 - vigK * Math.round(smooth(0.55, 1.3, rr) * 4) / 4;
      R[i] = r * vig;
      G[i] = g * vig;
      B[i] = b * vig;
    }

  // 4) 팔레트: 가장 가까운 두 색 경계 근처만 체커 ─────────────────
  const pal = buildPal(erased ? PIXEL_ERASED_PALETTE : PIXEL_PALETTE);
  const P = pal.rgb;
  const npal = P.length / 3;
  const idxOf = (r: number, g: number, b: number) => {
    const q = (c: number) => Math.max(0, Math.min(31, Math.round(c * 31)));
    return (q(r) << 10) | (q(g) << 5) | q(b);
  };
  const ix = new Uint8Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const k = idxOf(R[i], G[i], B[i]);
      const t = pal.t[k] / 255; // 0 = 바로 그 색, 1 = 두 색 한가운데
      const kd = kinds[obj[i]];
      // 사람·종이는 셀(디더 없음), 방은 경계 35% 폭에서만 2×2 체커
      const lo = kd >= 3 ? 2 : 0.62;
      const pick2 = t > lo && ((x + y) & 1) === 1;
      ix[i] = pick2 ? pal.p2[k] : pal.p1[k];
    }

  // 5) 색 고립 픽셀(디더 체커가 아닌 섬) 정리 ───────────────────
  {
    const c2 = ix.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const v = ix[i];
        const nb = [ix[i - 1], ix[i + 1], ix[i - w], ix[i + w]];
        if (nb.includes(v)) continue;
        // 대각선이 같은 색이면 체커 무늬 — 둔다
        if (ix[i - w - 1] === v || ix[i - w + 1] === v || ix[i + w - 1] === v || ix[i + w + 1] === v) {
          if (kinds[obj[i]] < 3) continue;
        }
        // 가장 많은 이웃 색으로
        let best = nb[0];
        let bc = 0;
        for (const a of nb) {
          let c = 0;
          for (const b of nb) if (a === b) c++;
          if (c > bc) {
            bc = c;
            best = a;
          }
        }
        if (bc >= 2) c2[i] = best;
      }
    ix.set(c2);
  }

  // 색 번호 → 밝기 순서(한 단 어둡게/밝게 고르기)
  const palLab = pal.lab;
  const darker = (p: number, steps: number): number => {
    // 같은 계열(색상 가까움) 에서 밝기가 낮은 색 중 가장 가까운 것을 steps 번
    let cur = p;
    for (let s = 0; s < steps; s++) {
      const [L0, a0, b0] = palLab[cur];
      let best = cur;
      let bd = Infinity;
      for (let j = 0; j < npal; j++) {
        const [L1, a1, b1] = palLab[j];
        if (L1 >= L0 - 0.03) continue;
        const d = (L0 - 0.1 - L1) ** 2 * 0.5 + ((a1 - a0) ** 2 + (b1 - b0) ** 2) * 6;
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      cur = best;
    }
    return cur;
  };
  const brighter = (p: number): number => {
    const [L0, a0, b0] = palLab[p];
    let best = p;
    let bd = Infinity;
    for (let j = 0; j < npal; j++) {
      const [L1, a1, b1] = palLab[j];
      if (L1 <= L0 + 0.03) continue;
      const d = (L1 - L0 - 0.1) ** 2 * 0.5 + ((a1 - a0) ** 2 + (b1 - b0) ** 2) * 6;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return best;
  };
  const dk1 = Array.from({ length: npal }, (_, p) => darker(p, 1));
  const dk2 = Array.from({ length: npal }, (_, p) => darker(p, 2));
  const br1 = Array.from({ length: npal }, (_, p) => brighter(p));
  const INK = 0;

  // 6) 외곽선 ───────────────────────────────────────
  const out = ix.slice();
  const figMask = new Uint8Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = obj[i];
      const kd = kinds[o];
      if (kd === 0) continue;
      const d = D[i];
      let outer = false;
      let crease = false;
      let depthEdge = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (obj[j] !== o) {
          if (D[j] > d * 1.04 + 0.02) outer = true;
        } else {
          if (D[j] > d * 1.12 + 0.05) depthEdge = true;
          const dot = NZ[i * 3] * NZ[j * 3] + NZ[i * 3 + 1] * NZ[j * 3 + 1] + NZ[i * 3 + 2] * NZ[j * 3 + 2];
          if (dot < 0.55 && D[j] >= d) crease = true;
        }
      }
      if (kd === 4) {
        if (outer) out[i] = INK + (erased ? 0 : 1) * 0; // 바깥 = 먹
        else if (depthEdge) out[i] = dk2[ix[i]];
        else if (crease) out[i] = dk1[ix[i]];
        figMask[i] = 1;
      } else if (kd === 3) {
        if (outer) out[i] = dk2[ix[i]];
      } else if (kd === 2) {
        if (outer || depthEdge) out[i] = dk1[ix[i]];
      } else if (kd === 1) {
        if (outer || depthEdge) out[i] = dk1[ix[i]];
      }
    }

  // 7) 빛 받는 윗가장자리 하이라이트(사람): 위가 사람이 아니고, 이 픽셀이 주변보다 밝을 때 한 단 밝게
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (kinds[obj[i]] !== 4 || out[i] !== ix[i]) continue;
      const up = obj[i - w] !== obj[i];
      if (!up) continue;
      const below = i + w;
      if (obj[below] !== obj[i]) continue;
      const Lh = palLab[ix[i]][0];
      if (Lh > 0.42 && NZ[i * 3 + 1] > 0.2) out[i] = br1[ix[i]];
    }
  // 외곽선 바깥 1px 까지 인물 마스크 확장(hd2d 합성용)
  const fm2 = figMask.slice();
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (figMask[i]) continue;
      if ((figMask[i - 1] || figMask[i + 1] || figMask[i - w] || figMask[i + w]) && out[i] === INK) fm2[i] = 1;
    }

  // 8) 지워짐: 눈꺼풀(계단) + 가로 찢김 ──────────────────────
  if (erased) {
    const rnd = mulberry32(inp.seed);
    for (let y = 0; y < h; y++) {
      const v = y / (h - 1);
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const jag = Math.round(Math.sin(x * 0.5 + inp.seed) * 1.5 + Math.sin(x * 0.17 + 2) * 2);
        const top = Math.round(h * 0.09) + jag;
        const bot = Math.round(h * 0.08) - jag;
        if (y < top || y >= h - bot) out[i] = 0;
        else if (y === top || y === h - bot - 1) out[i] = Math.min(out[i], 1);
        void v;
      }
    }
    for (let k = 0; k < 6; k++) {
      const y0 = Math.floor(rnd() * h);
      const bh = 1 + Math.floor(rnd() * 2);
      const dx = Math.round((rnd() - 0.5) * 14);
      for (let y = y0; y < Math.min(h, y0 + bh); y++) {
        const row = out.slice(y * w, y * w + w);
        for (let x = 0; x < w; x++) out[y * w + x] = row[Math.min(w - 1, Math.max(0, x - dx))];
      }
    }
  }

  const rgba = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) {
    const p = out[i] * 3;
    rgba[i * 4] = P[p];
    rgba[i * 4 + 1] = P[p + 1];
    rgba[i * 4 + 2] = P[p + 2];
    rgba[i * 4 + 3] = 255;
  }
  return { w, h, rgba, obj, figMask: fm2 };
}
