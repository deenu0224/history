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
 *
 * 출시 굽기 보강(약점 고침):
 *   - 띠살: render3d 가 성긴 띠살을 세로살·가로 띠·한지로 따로 번호 매기면, 2×2 안 살 픽셀 수로 1px 줄을 고르게 찍는다(잡음 대신 고른 줄).
 *   - 벽빛: 둥근 비네트 없음 + 방 면 밝은 쪽 압축 + 체커는 띠가 바뀌는 곳 2px 안에서만(과녁 동심원 없음). 채움광 감쇠는 render3d 에서 눅인다.
 *   - 사람: 어두운 옷 한 단 들어 올림, 옷 픽셀은 그 옷 색 계열(+먹)로만, 역광 테 1px, 얼굴에 눈·눈썹 줄과 볼 그늘 몇 픽셀.
 *   - 이름표 「金馹孫」: 8×9 픽셀 글자를 직접 찍는다(glyphs.ts).
 *   - (ep0) 상소 겉장 머리글 「副提學 崔萬理」: 같은 방식으로 두 줄 세로쓰기(물체 'detail:d_scroll_head').
 */
import { hexToRgb, rgbToOklab } from './palette';
import { mulberry32 } from './camera';
import { MEMORIAL_HEAD_COLUMNS, MEMORIAL_HEAD_GLYPHS, NAME_TAG_GLYPHS_SMALL } from './glyphs';
import type { PovOverlay } from './types';

/** 기억(따뜻함) 24색: 먹 4 · 나무 3 · 한지(무명 겸) 3 · 호박 3 · 붉은 3 · 초록 3 · 남 3 · 피부 2 */
export const PIXEL_PALETTE: readonly string[] = [
  '#0d0b0a', '#1a1613', '#2a231e', '#3d332b',
  '#5a4130', '#7e5d40', '#a78360',
  '#b9a682', '#d8c7a1', '#ede0c0',
  '#8e5a2a', '#c9873f', '#f0c27e',
  '#3e1a18', '#742f2a', '#a8473c',
  '#24352b', '#3a5643', '#5e7d61',
  '#26323f', '#384a60', '#556c84',
  '#8a5e44', '#c99b74',
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
  /** (쓰지 않음 — 픽셀아트는 화면 안 비네트를 그리지 않는다; UI 가 가장자리를 어둡게 한다) */
  vignette?: number;
  /** 사람(물체 이름 → 옷 색 id: red · red-dark · green · blue · young · slate · messenger · clerk). 옷 픽셀을 그 색 계열(+먹)로만 —
   *  따뜻한 빛에서 남색이 초록으로, 붉은 옷이 갈색으로 새지 않게 */
  robes?: Record<string, string>;
  /** 초점 거리(m) — 초점 인물 둘레 외곽선을 조금 더 진하게 */
  focusDepth?: number;
  /** 가까운 큰 얼굴에 2px 눈·눈썹 줄(ep0 임금 클로즈업). 기본 false = 예전 그대로 */
  bigFaces?: boolean;
}

/** 옷 색 계열(팔레트 색) — 먹 4색은 언제나 허용 */
const ROBE_FAMILY: Record<string, readonly string[]> = {
  red: ['#3e1a18', '#742f2a', '#a8473c'],
  'red-dark': ['#3e1a18', '#742f2a', '#a8473c'],
  green: ['#24352b', '#3a5643', '#5e7d61'],
  blue: ['#26323f', '#384a60', '#556c84'],
  young: ['#26323f', '#384a60', '#556c84'],
  slate: ['#26323f', '#384a60', '#556c84', '#5a4130'],
  ink: ['#26323f', '#384a60'],
  royal: ['#3e1a18', '#742f2a', '#a8473c'],
};
const INKS = ['#0d0b0a', '#1a1613', '#2a231e', '#3d332b'];

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
  const n = lab.length;
  const dist = (q: number[], p: number[]) => {
    const dl = (q[0] - p[0]) * 1.2;
    const da = (q[1] - p[1]) * 2.2;
    const db = (q[2] - p[2]) * 2.2;
    return Math.sqrt(dl * dl + da * da + db * db);
  };
  // 섞어도 되는 짝: 색상이 가깝거나(같은 계열) 한쪽이 먹(무채) — 붉음과 초록을 섞어 잡색을 만들지 않는다
  const pairs: [number, number, number[]][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const a = lab[i];
      const b = lab[j];
      const ci = Math.hypot(a[1], a[2]);
      const cj = Math.hypot(b[1], b[2]);
      const hueClose = Math.hypot(a[1] - b[1], a[2] - b[2]) < 0.045;
      const neutral = (ci < 0.02 && a[0] < 0.3) || (cj < 0.02 && b[0] < 0.3);
      if (!(hueClose || neutral)) continue;
      if (Math.abs(a[0] - b[0]) > 0.22) continue; // 너무 먼 밝기는 섞지 않는다(지글거림)
      if ((a[0] + b[0]) / 2 < 0.36) continue; // 어둠은 단색 띠(먹 속 체커는 지저분하다)
      pairs.push([i, j, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]]);
    }
  for (let r = 0; r < 32; r++)
    for (let g = 0; g < 32; g++)
      for (let b = 0; b < 32; b++) {
        const q = rgbToOklab((r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2));
        let b1 = 0;
        let d1 = Infinity;
        for (let i = 0; i < n; i++) {
          const d = dist(q, lab[i]);
          if (d < d1) {
            d1 = d;
            b1 = i;
          }
        }
        const k = (r << 10) | (g << 5) | b;
        p1[k] = b1;
        p2[k] = b1;
        // 50% 체커가 단색보다 확실히 가까울 때만 무늬
        let bm = Infinity;
        let pi = -1;
        for (let m = 0; m < pairs.length; m++) {
          const d = dist(q, pairs[m][2]);
          if (d < bm) {
            bm = d;
            pi = m;
          }
        }
        if (pi >= 0 && bm < d1 * 0.55 && d1 > 0.018) {
          p1[k] = pairs[pi][0];
          p2[k] = pairs[pi][1];
          t[k] = 255;
        }
      }
  const out = { rgb, lab: lab as [number, number, number][], p1, p2, t };
  palCache.set(key, out);
  return out;
}

/** 사람 픽셀 밝기 바닥(sRGB 휘도) — 가장 어두운 붉은·초록·남색 칸에 닿는 정도 */
const FIG_FLOOR = 0.17;
/** 피부(따뜻하고 중간 채도) — 얼굴·손은 옷 계열 제한에서 뺀다 */
const isSkin = (r: number, g: number, b: number): boolean => r >= 0.2 && g / r > 0.55 && g / r < 0.92 && b / r < 0.78;
const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Kind = 0 | 1 | 2 | 3 | 4; // 0 하늘 · 1 방 · 2 소품 · 3 종이 조각 · 4 사람(인물·내 몸)
/** 띠살 칸의 역할: 1 한지 · 2 세로살 · 3 가로 띠 (render3d 가 style 'pixel' 에서 따로 번호 매긴다) */
const panelRole = (name: string | undefined): number => (name === 'hanji' ? 1 : name === 'lattice' ? 2 : name === 'lattice-h' ? 3 : 0);
const kindOf = (name: string | undefined): Kind =>
  !name ? 0 : name === 'hall' ? 1 : name.startsWith('slip:') || name.startsWith('detail:') ? 3 : name.startsWith('fig_') || name === 'self' ? 4 : 2;

export function postPixel(inp: PixelInput): PixelOutput {
  const { w2, h2, overlay } = inp;
  const erased = overlay === 'erased';
  const w = w2 >> 1;
  const h = h2 >> 1;
  const N = w * h;
  const kinds = inp.objNames.map(kindOf);
  kinds[0] = 0;
  const roles = inp.objNames.map(panelRole);
  const hanjiId = inp.objNames.indexOf('hanji');
  /** 띠살 칸 픽셀: 0 아님 · 1 한지 · 2 살(나무) — 고른 줄무늬로 다시 그린 결과 */
  const panel = new Uint8Array(N);

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
      // 띠살 칸: 2×2 안의 살 픽셀 수로 1px 줄을 고르게(경계에 걸친 살은 왼쪽/위 칸 하나에만)
      if (hanjiId > 0) {
        let cp = 0;
        let cv = 0;
        let ch = 0;
        for (const s of idx) {
          const ro = roles[inp.obj[s]];
          if (ro === 1) cp++;
          else if (ro === 2) cv++;
          else if (ro === 3) ch++;
        }
        if (cp + cv + ch >= 3 || (roles[best] > 0 && cp + cv + ch >= 2)) {
          const left = x > 0 ? panel[i - 1] : 0;
          const up = y > 0 ? panel[i - w] : 0;
          const wood = ch >= 2 || (ch === 1 && up !== 3) || cv >= 2 || (cv === 1 && left !== 2);
          const want = wood ? (ch >= 1 && (ch >= 2 || up !== 3) ? 3 : 2) : 1;
          let n2 = 0;
          let r2 = 0;
          let g2 = 0;
          let b2 = 0;
          for (const s of idx) {
            const ro = roles[inp.obj[s]];
            if (wood ? ro >= 2 : ro === 1) {
              n2++;
              r2 += inp.rgba[s * 4];
              g2 += inp.rgba[s * 4 + 1];
              b2 += inp.rgba[s * 4 + 2];
            }
          }
          if (n2) {
            R[i] = r2 / n2 / 255;
            G[i] = g2 / n2 / 255;
            B[i] = b2 / n2 / 255;
          }
          if (wood && !n2) {
            R[i] *= 0.4;
            G[i] *= 0.36;
            B[i] *= 0.32;
          }
          panel[i] = want;
          obj[i] = hanjiId;
        }
      }
    }

  // 2) 물체 번호 고립 픽셀 정리(사방이 같은 다른 물체면 그 물체로) ──
  {
    const o2 = obj.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const a = obj[i - 1];
        if (obj[i] !== a && obj[i + 1] === a && obj[i - w] === a && obj[i + w] === a && kinds[obj[i]] < 3 && !panel[i]) {
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
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let r = R[i];
      let g = G[i];
      let b = B[i];
      let L = lum(r, g, b);
      if (!erased) {
        // 명암: 그늘 깊게, 밝음 한지로 — 컷보다 대비를 조금 더(작은 화면에서 띠가 읽히게)
        let L2 = Math.pow(Math.min(1.2, L * 1.12), 1.08);
        // 밝은 쪽 압축: 문빛·창빛 둘레가 동심원 띠 여러 겹이 되지 않게(띠 2~3단)
        // 방 면은 더 납작하게(채움광 기울기가 띠 여러 겹이 되지 않게 — 넓은 면 2~3단)
        if (L2 > 0.55) L2 = 0.55 + (L2 - 0.55) * (kinds[obj[i]] === 1 ? 0.55 : 0.72);
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
      // 사람: 역광의 어두운 옷이 먹 덩어리가 되지 않게 한 단 들어 올림(색상 유지, 채도 약간) — 모자·머리털(무채 먹)은 거의 그대로
      if (kinds[obj[i]] === 4) {
        const Lf = lum(r, g, b);
        const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1e-4, Lf);
        const neutral = chroma < 0.3;
        const lift = Math.max(Lf, Math.min(neutral ? FIG_FLOOR * 0.65 : FIG_FLOOR, Lf * (neutral ? 2 : 3)));
        if (Lf > 1e-4 && lift > Lf) {
          const k = lift / Lf;
          const sat = neutral ? 1 : 1.15;
          r = lift + (r * k - lift) * sat;
          g = lift + (g * k - lift) * sat;
          b = lift + (b * k - lift) * sat;
        }
      }
      // 비네트 없음: 둥근 비네트는 낮은 색 수에서 과녁·모서리 얼룩이 된다 — 화면 가장자리 어둠은 UI(.cutvig)가 맡는다
      const vig = 1;
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
  const nearCaches = [new Int16Array(32768).fill(-1), new Int16Array(32768).fill(-1)];
  /** hue = 사람 옷: 색상을 더 무겁게(남색이 초록·먹으로 새지 않게) */
  const nearest = (r: number, g: number, b: number, hue = false) => {
    const k = idxOf(r, g, b);
    const nearCache = nearCaches[hue ? 1 : 0];
    const cw = hue ? 3.6 : 2.2;
    if (nearCache[k] >= 0) return nearCache[k];
    const q = rgbToOklab(((k >> 10) & 31) * 8.2, ((k >> 5) & 31) * 8.2, (k & 31) * 8.2);
    let best = 0;
    let bd = Infinity;
    for (let j = 0; j < npal; j++) {
      const p = pal.lab[j];
      const d = ((q[0] - p[0]) * 1.2) ** 2 + ((q[1] - p[1]) * cw) ** 2 + ((q[2] - p[2]) * cw) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    nearCache[k] = best;
    return best;
  };
  const palHex = (erased ? PIXEL_ERASED_PALETTE : PIXEL_PALETTE).map((x) => x.toLowerCase());
  const famIdx: (number[] | null)[] = inp.objNames.map((name) => {
    const fam = !erased && inp.robes ? ROBE_FAMILY[inp.robes[name]] : undefined;
    if (!fam) return null;
    return [...INKS, ...fam].map((x) => palHex.indexOf(x)).filter((j) => j >= 0);
  });
  const allIdx = Array.from({ length: npal }, (_, j) => j);
  const nearestIn = (r: number, g: number, b: number, set: number[]): [number, number] => {
    const q = rgbToOklab(r * 255, g * 255, b * 255);
    let best = set[0];
    let bd = Infinity;
    for (const j of set) {
      const p = pal.lab[j];
      const d = ((q[0] - p[0]) * 1.2) ** 2 + ((q[1] - p[1]) * 1.5) ** 2 + ((q[2] - p[2]) * 1.5) ** 2;
      if (d < bd) {
        bd = d;
        best = j;
      }
    }
    return [best, bd];
  };
  const ix = new Uint8Array(N);
  /** 방 픽셀이 두 색 한가운데인지 + 그 두 색 */
  const tk = new Uint8Array(N);
  const p1k = new Uint8Array(N);
  const p2k = new Uint8Array(N);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const k = idxOf(R[i], G[i], B[i]);
      const kd = kinds[obj[i]];
      // 사람·종이는 셀(디더 없음: 가장 가까운 단색), 방은 두 색 한가운데일 때만 2×2 체커
      const fam = kd === 4 && famIdx[obj[i]];
      if (fam && !isSkin(R[i], G[i], B[i])) {
        // 옷 계열이 일반 최근접보다 크게 멀면(손에 든 종이·붓·띠) 일반 색 그대로
        const [jf, df] = nearestIn(R[i], G[i], B[i], fam);
        const [, dg] = nearestIn(R[i], G[i], B[i], allIdx);
        if (df < dg * 2.2 + 0.0015) {
          ix[i] = jf;
          continue;
        }
      }
      if (kd >= 3 || panel[i]) {
        ix[i] = nearest(R[i], G[i], B[i], kd === 4);
        continue;
      }
      ix[i] = nearest(R[i], G[i], B[i]);
      tk[i] = pal.t[k] ? 1 : 0;
      p1k[i] = pal.p1[k];
      p2k[i] = pal.p2[k];
    }
  // 4b) 방·소품: 넓은 면은 단색 띠. 두 색 한가운데(체커)는 띠가 바뀌는 곳 가까이(2px 안에 한가운데가 아닌 픽셀)만 —
  //     평평한 벽 전체가 체커가 되지 않고, 띠 경계에만 짧은 무늬가 생긴다
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!tk[i]) continue;
      const o = obj[i];
      let edge = false;
      for (let yy = Math.max(0, y - 2); yy <= Math.min(h - 1, y + 2) && !edge; yy++)
        for (let xx = Math.max(0, x - 2); xx <= Math.min(w - 1, x + 2); xx++) {
          const j = yy * w + xx;
          if (obj[j] === o && !tk[j]) {
            edge = true;
            break;
          }
        }
      ix[i] = edge ? (((x + y) & 1) === 1 ? p2k[i] : p1k[i]) : ix[i];
    }

  // 5) 색 고립 픽셀(디더 체커가 아닌 섬) 정리 ───────────────────
  {
    const c2 = ix.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const v = ix[i];
        if (panel[i]) continue;
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
  // 7b) 역광 테: 외곽선(먹) 바로 안쪽 1px — 그 바깥 배경이 밝으면 한 단(아주 어두우면 두 단) 밝게.
  //     어두운 옷이 밝은 한지·벽 앞에서 모자·소매·손 모양을 잃지 않게. 빛의 출처는 뒤의 밝은 면이다.
  {
    const bgL = (j: number) => palLab[out[j]][0];
    const rim = out.slice();
    for (let y = 2; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const o = obj[i];
        if (kinds[o] !== 4 || inp.objNames[o] === 'self' || out[i] === INK) continue;
        let best = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const j1 = i + dy * w + dx;
          const j2 = j1 + dy * w + dx;
          if (obj[j1] !== o || out[j1] !== INK) continue;
          if (obj[j2] === o || kinds[obj[j2]] === 4) continue;
          best = Math.max(best, bgL(j2));
        }
        if (best > 0.72) {
          const L0 = palLab[out[i]][0];
          rim[i] = L0 < 0.36 && best > 0.8 ? br1[br1[out[i]]] : br1[out[i]];
        }
      }
    out.set(rim);
  }

  // 7c) 얼굴: 피부 덩어리에 몇 픽셀만 — 눈썹·눈 줄(한 단/두 단 어둡게), 빛 반대쪽 볼 그늘. 웃는 얼굴·눈동자 없음.
  if (!erased) {
    const skin = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (kinds[obj[i]] !== 4 || inp.objNames[obj[i]] === 'self' || out[i] === INK) continue;
      if (isSkin(R[i], G[i], B[i])) skin[i] = 1;
    }
    const seen = new Uint8Array(N);
    const stack: number[] = [];
    for (let s0 = 0; s0 < N; s0++) {
      if (!skin[s0] || seen[s0]) continue;
      const comp: number[] = [];
      stack.push(s0);
      seen[s0] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        comp.push(i);
        const x = i % w;
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          if (j < 0 || j >= N || seen[j] || !skin[j] || obj[j] !== obj[s0]) continue;
          if ((j === i - 1 && x === 0) || (j === i + 1 && x === w - 1)) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
      let fx0 = w;
      let fx1 = 0;
      let fy0 = h;
      let fy1 = 0;
      for (const i of comp) {
        const x = i % w;
        const y = (i / w) | 0;
        fx0 = Math.min(fx0, x);
        fx1 = Math.max(fx1, x);
        fy0 = Math.min(fy0, y);
        fy1 = Math.max(fy1, y);
      }
      const fw = fx1 - fx0 + 1;
      const fh = fy1 - fy0 + 1;
      if (fw < 3 || fh < 3 || comp.length < 7) continue;
      // 머리: 덩어리 위가 같은 사람의 어두운 모자·머리털이어야 한다(손·목 제외)
      let capped = 0;
      for (let x = fx0; x <= fx1; x++) {
        const j = (fy0 - 1) * w + x;
        if (fy0 > 0 && obj[j] === obj[s0] && palLab[out[j]][0] < 0.3) capped++;
      }
      if (capped < Math.ceil(fw / 2)) continue;
      const inC = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && skin[y * w + x] && seen[y * w + x] && obj[y * w + x] === obj[s0];
      // 빛 쪽: 왼쪽 반과 오른쪽 반의 평균 밝기
      let lL = 0;
      let nL = 0;
      let lR = 0;
      let nR = 0;
      const mid = (fx0 + fx1) / 2;
      for (const i of comp) {
        const x = i % w;
        const Lq = lum(R[i], G[i], B[i]);
        if (x < mid) {
          lL += Lq;
          nL++;
        } else if (x > mid) {
          lR += Lq;
          nR++;
        }
      }
      const darkRight = nL && nR ? lR / nR < lL / nL : false;
      // 얼굴 높이: 행 폭이 최대 폭의 반 이상인 첫 행부터, 목(좁아짐) 전까지
      const rowW = Array.from({ length: fh }, (_, k) => {
        let n = 0;
        for (let x = fx0; x <= fx1; x++) if (inC(x, fy0 + k)) n++;
        return n;
      });
      const maxW = Math.max(...rowW);
      let top = 0;
      while (top < fh - 1 && rowW[top] < maxW * 0.5) top++;
      let bot = top;
      while (bot + 1 < fh && rowW[bot + 1] >= maxW * 0.6) bot++;
      const faceH = bot - top + 1;
      if (faceH < 3) continue;
      // 눈썹·눈 줄: 얼굴 위에서 3할쯤
      const ey = fy0 + top + Math.max(1, Math.round(faceH * 0.3));
      if (inp.bigFaces && fw >= 12 && faceH >= 9) {
        // 가까운 큰 얼굴(ep0 임금 클로즈업): 눈 줄 2px + 그 위 눈썹 2px(한 단) — 여전히 눈동자·표정 없음
        for (const [ex, dir] of [[fx0 + Math.round((fw - 1) * 0.3), 1], [fx1 - Math.round((fw - 1) * 0.3), -1]] as const)
          for (const xx of [ex, ex + dir]) {
            if (inC(xx, ey)) out[ey * w + xx] = dk2[out[ey * w + xx]];
            if (inC(xx - dir, ey - 2)) out[(ey - 2) * w + xx - dir] = dk1[out[(ey - 2) * w + xx - dir]];
          }
      } else if (fw >= 5) {
        for (const ex of [fx0 + Math.round((fw - 1) * 0.28), fx1 - Math.round((fw - 1) * 0.28)]) if (inC(ex, ey)) out[ey * w + ex] = dk2[out[ey * w + ex]];
        if (faceH >= 7) for (const ex of [fx0 + Math.round((fw - 1) * 0.28), fx1 - Math.round((fw - 1) * 0.28)]) if (inC(ex, ey - 1)) out[(ey - 1) * w + ex] = dk1[out[(ey - 1) * w + ex]];
      } else {
        for (let x = fx0 + 1; x < fx1; x++) if (inC(x, ey)) out[ey * w + x] = dk1[out[ey * w + x]];
      }
      // 빛 반대쪽 가장자리 세로 그늘(눈 줄 아래)
      if (fw >= 4 && faceH >= 4)
        for (let y = ey + 1; y <= fy0 + bot; y++) {
          let x = darkRight ? fx1 : fx0;
          while (x >= fx0 && x <= fx1 && !inC(x, y)) x += darkRight ? -1 : 1;
          if (inC(x, y)) out[y * w + x] = dk1[out[y * w + x]];
        }
    }
  }

  // 7d) 이름표 「金馹孫」: 줄인 24px 글자는 뭉개진다 — 이름표 자리에 8×9 픽셀 글자를 직접 찍는다(종이 = 이름표의 가장 흔한 색)
  {
    const tagId = inp.objNames.indexOf('nametag');
    if (tagId > 0) {
      let x0 = w;
      let x1 = -1;
      let y0 = h;
      let y1 = -1;
      const hist = new Map<number, number>();
      for (let i = 0; i < N; i++)
        if (obj[i] === tagId) {
          const x = i % w;
          const y = (i / w) | 0;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          hist.set(out[i], (hist.get(out[i]) ?? 0) + 1);
        }
      const GW = 8;
      const GH = 9;
      const rows = GH * 3;
      if (x1 - x0 + 1 >= GW + 1 && y1 - y0 + 1 >= rows + 1) {
        // 종이: 이름표에서 가장 흔한 (먹 아닌) 색 — 그늘이라 어두우면 한 단 밝게(글자와 대비)
        let paper = -1;
        let pc = -1;
        for (const [c, n] of hist)
          if (palLab[c][0] > 0.3 && n > pc) {
            pc = n;
            paper = c;
          }
        if (paper < 0) paper = br1[br1[1]];
        if (palLab[paper][0] < 0.55) paper = br1[paper];
        const top = y0 + Math.floor((y1 - y0 + 1 - rows) / 2);
        const glyphs = [NAME_TAG_GLYPHS_SMALL['金'], NAME_TAG_GLYPHS_SMALL['馹'], NAME_TAG_GLYPHS_SMALL['孫']];
        for (let y = y0; y <= y1; y++) {
          let xa = w;
          let xb = -1;
          for (let x = x0; x <= x1; x++)
            if (obj[y * w + x] === tagId) {
              xa = Math.min(xa, x);
              xb = Math.max(xb, x);
            }
          if (xb < 0) continue;
          const gx = Math.round((xa + xb + 1) / 2 - GW / 2);
          const gy = y - top;
          const row = gy >= 0 && gy < rows ? glyphs[Math.floor(gy / GH)][gy % GH] : '';
          for (let x = xa; x <= xb; x++) {
            const i = y * w + x;
            if (obj[i] !== tagId) continue;
            const edge = obj[i - 1] !== tagId || obj[i + 1] !== tagId || obj[i - w] !== tagId || obj[i + w] !== tagId;
            const g = row[x - gx];
            if (g === '#') out[i] = 1;
            else if (!edge) out[i] = paper;
          }
        }
      }
    }
  }

  // 7e) (ep0) 상소 겉장 머리글: 겉장 자리에 8×9 글자 두 줄(오른쪽 副提學, 왼쪽 崔萬理)을 직접 찍는다
  {
    const hid = inp.objNames.indexOf('detail:d_scroll_head');
    if (hid > 0) {
      let x0 = w;
      let x1 = -1;
      let y0 = h;
      let y1 = -1;
      const hist = new Map<number, number>();
      for (let i = 0; i < N; i++)
        if (obj[i] === hid) {
          const x = i % w;
          const y = (i / w) | 0;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          hist.set(out[i], (hist.get(out[i]) ?? 0) + 1);
        }
      const GW = 8;
      const GH = 9;
      const cols = MEMORIAL_HEAD_COLUMNS.length;
      // 글자 사이 틈: 자리가 넉넉하면 줄 사이 2px·글자 사이 1px, 모자라면 줄 사이 1px·글자 사이 0
      const roomy = x1 - x0 + 1 >= GW * cols + 2 + 2 && y1 - y0 + 1 >= GH * 3 + 2 + 2;
      const GAP = roomy ? 2 : 1;
      const VG = roomy ? 1 : 0;
      const rows = GH * 3 + VG * 2;
      const colsW = GW * cols + GAP * (cols - 1);
      const fits = x1 - x0 + 1 >= colsW + 1 && y1 - y0 + 1 >= rows + 1;
      if (x1 >= x0) {
        let paper = -1;
        let pc = -1;
        for (const [c, n] of hist)
          if (palLab[c][0] > 0.3 && n > pc) {
            pc = n;
            paper = c;
          }
        if (paper < 0) paper = br1[br1[1]];
        if (palLab[paper][0] < 0.6) paper = br1[paper];
        if (palLab[paper][0] < 0.6) paper = br1[paper];
        const top = y0 + Math.floor((y1 - y0 + 1 - rows) / 2);
        const left = x0 + Math.floor((x1 - x0 + 1 - colsW) / 2);
        const bw = x1 - x0 + 1;
        const bh = y1 - y0 + 1;
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            const i = y * w + x;
            if (obj[i] !== hid) continue;
            const edge = obj[i - 1] !== hid || obj[i + 1] !== hid || obj[i - w] !== hid || obj[i + w] !== hid;
            let ink = false;
            if (fits) {
              const gy = y - top;
              const gx = x - left;
              if (gy >= 0 && gy < rows && gx >= 0 && gx < colsW && gx % (GW + GAP) < GW) {
                // 세로쓰기: 오른쪽 줄이 첫 줄
                const col = cols - 1 - Math.floor(gx / (GW + GAP));
                const r = Math.floor(gy / (GH + VG));
                const ry = gy % (GH + VG);
                if (r < 3 && ry < GH) ink = MEMORIAL_HEAD_GLYPHS[MEMORIAL_HEAD_COLUMNS[col][r]][ry][gx % (GW + GAP)] === '#';
              }
            } else {
              // 멀어서 글자가 들어가지 않으면: 두 줄 세로 먹 획(글씨로 읽히는 끊긴 줄)
              const u = (x - x0) / bw;
              const v = (y - y0) / bh;
              const inCol = Math.abs(u - 0.32) < 0.1 || Math.abs(u - 0.68) < 0.1;
              ink = inCol && v > 0.12 && v < 0.88 && (y - y0) % 3 !== 2;
            }
            if (ink) out[i] = 1;
            else if (!edge) out[i] = paper;
          }
        // 은근한 호박 반짝임: 겉장 위 가장자리(빛을 받는 모서리)만 — 눈길을 끄는 단서 표시(화면 문법)
        const amber = palHex.indexOf('#c9873f');
        const amberHi = palHex.indexOf('#f0c27e');
        if (amber >= 0 && amberHi >= 0)
          for (let x = x0; x <= x1; x++)
            for (let y = y0; y <= y1; y++) {
              const i = y * w + x;
              if (obj[i] !== hid) continue;
              out[i] = x >= x1 - Math.max(1, Math.round(bw * 0.25)) ? amberHi : amber;
              break;
            }
      }
    }
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
