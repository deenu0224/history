/**
 * 컷 렌더러(Phaser 무관): baked 장면의 카메라 조각 + 인물을 깊이순으로 얹고, 시각 색조·밤 창·기억/지워짐 처리 후
 * 정수 배율(최근접)로 출력 캔버스에 올린다. 등잔 빛웅덩이·비네트·낟알은 출력 해상도에서 얹어 부드럽다.
 */
import { TILE_KEYS, TILES } from '@/game/art/registry';
import { sceneTint } from '@/game/logic/diorama';
import { cutPerf, getBaked, isHidden, lookupSprite, sceneMap, spriteCanvas, type DrawItem } from './bake';
import { TILE, Lru, aliasNpc, clampCamera, computeHitboxes, computeLayout, cutCacheKey, depthSort, figureFeet, figureFrame, mulberry32, specHash } from './math';
import type { CutFigure, CutSpec, FigureHitbox } from './types';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const defaultDpr = () => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

const HL_COLOR = { unknown: '#cfe6ff', tagged: '#ffd25a' } as const;
const GLYPH_Q = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];
const GLYPH_TAG = ['..#..', '.###.', '#####', '.###.', '..#..'];

const silhouettes = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let byColor = silhouettes.get(src);
  if (!byColor) silhouettes.set(src, (byColor = new Map()));
  let c = byColor.get(color);
  if (!c) {
    c = makeCanvas(src.width, src.height);
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
  }
  return c;
}

function drawGlyph(g: CanvasRenderingContext2D, rows: string[], x: number, y: number, fill: string): void {
  g.fillStyle = '#12100d';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    rows.forEach((r, ry) => [...r].forEach((ch, rx) => ch === '#' && g.fillRect(x + rx + dx, y + ry + dy, 1, 1)));
  }
  g.fillStyle = fill;
  rows.forEach((r, ry) => [...r].forEach((ch, rx) => ch === '#' && g.fillRect(x + rx, y + ry, 1, 1)));
}

interface FigureDraw extends DrawItem {
  fig: CutFigure;
  sw: number;
  sh: number;
}

function figureItem(f: CutFigure, i: number): FigureDraw | null {
  const key = aliasNpc(f.spriteKey);
  const sp = lookupSprite(key);
  if (!sp) return null;
  const frame = figureFrame(key, f.frame, f.facing);
  const anchor = sp.anchor ?? { x: sp.w / 2, y: sp.h };
  const feet = figureFeet(f);
  return {
    id: f.id,
    tile: '',
    spriteKey: key,
    canvas: spriteCanvas(key, sp, frame),
    x: Math.round(feet.x - anchor.x),
    y: Math.round(feet.y - anchor.y),
    depth: feet.y,
    order: 100000 + i,
    fig: f,
    sw: sp.w,
    sh: sp.h,
  };
}

function drawFigure(g: CanvasRenderingContext2D, it: FigureDraw, ox: number, oy: number): void {
  const f = it.fig;
  const x = it.x - ox;
  const y = it.y - oy;
  const hl = f.highlight ?? 'none';
  if (hl !== 'none') {
    const col = HL_COLOR[hl];
    // 발밑 고리
    const feet = figureFeet(f);
    g.save();
    g.globalAlpha = 0.55;
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(Math.round(feet.x - ox), Math.round(feet.y - oy) - 1, 11, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const sil = silhouette(it.canvas, col);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]] as const) g.drawImage(sil, x + dx, y + dy);
  }
  if (f.dim) {
    g.save();
    g.globalAlpha = 0.5;
    g.drawImage(it.canvas, x, y);
    g.restore();
  } else {
    g.drawImage(it.canvas, x, y);
  }
  if (hl === 'unknown') drawGlyph(g, GLYPH_Q, x + Math.round(it.sw / 2) - 2, y - 10, HL_COLOR.unknown);
  else if (hl === 'tagged') drawGlyph(g, GLYPH_TAG, x + Math.round(it.sw / 2) - 2, y - 8, HL_COLOR.tagged);
}

/** 지워짐: 채도 제거 + 차가운 색 + 알갱이 노이즈 + 가로 끊김(원본 해상도라 알갱이가 굵다) */
function eraseProcess(sc: HTMLCanvasElement, seed: number): void {
  const g = sc.getContext('2d')!;
  const img = g.getImageData(0, 0, sc.width, sc.height);
  const d = img.data;
  const rnd = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
    const r = d[i]! * 0.15 + l * 0.85;
    const gg = d[i + 1]! * 0.15 + l * 0.85;
    const b = d[i + 2]! * 0.15 + l * 0.85;
    const n = (rnd() - 0.5) * 46;
    d[i] = Math.max(0, Math.min(255, (r * 0.82 + 10) * 0.9 + n));
    d[i + 1] = Math.max(0, Math.min(255, (gg * 0.92 + 14) * 0.9 + n));
    d[i + 2] = Math.max(0, Math.min(255, (b * 1.08 + 24) * 0.9 + n));
  }
  g.putImageData(img, 0, 0);
  // 가로 끊김 몇 줄
  const bands = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < bands; i++) {
    const y = Math.floor(rnd() * sc.height);
    const h = 1 + Math.floor(rnd() * 2);
    const shift = Math.floor((rnd() - 0.5) * 14);
    g.drawImage(sc, 0, y, sc.width, h, shift, y, sc.width, h);
    g.fillStyle = 'rgba(200,220,240,0.12)';
    g.fillRect(0, y, sc.width, h);
  }
}

const grainCache = new Map<number, HTMLCanvasElement>();
function grainTile(seed: number): HTMLCanvasElement {
  let c = grainCache.get(seed);
  if (!c) {
    c = makeCanvas(64, 64);
    const g = c.getContext('2d')!;
    const img = g.createImageData(64, 64);
    const rnd = mulberry32(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(rnd() * 255);
    }
    g.putImageData(img, 0, 0);
    grainCache.set(seed, c);
  }
  return c;
}

function drawVignette(g: CanvasRenderingContext2D, pw: number, ph: number, v: number, rgb: string): void {
  if (v <= 0) return;
  const cx = pw / 2;
  const cy = ph / 2;
  const r = Math.hypot(cx, cy);
  const grad = g.createRadialGradient(cx, cy, r * 0.42, cx, cy, r);
  grad.addColorStop(0, `rgba(${rgb},0)`);
  grad.addColorStop(0.65, `rgba(${rgb},${(v * 0.35).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${rgb},${Math.min(1, v * 0.95).toFixed(3)})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, pw, ph);
}

function drawGrain(g: CanvasRenderingContext2D, pw: number, ph: number, seed: number, alpha: number, px: number): void {
  const pat = g.createPattern(grainTile(seed % 7), 'repeat');
  if (!pat) return;
  g.save();
  g.globalAlpha = alpha;
  g.scale(px, px);
  g.fillStyle = pat;
  g.fillRect(0, 0, pw / px, ph / px);
  g.restore();
}

const rgbCss = (c: [number, number, number]) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

const cutCache = new Lru<HTMLCanvasElement>(12);
const urlCache = new Lru<string>(24);

/**
 * 컷 한 장을 outW×outH(CSS px) 영역, dpr 배 해상도로 그린다. 반환 캔버스는 캐시되어 공유된다 → 읽기 전용.
 * 캔버스 픽셀 크기 = round(outW*dpr) × round(outH*dpr).
 */
export function renderCut(spec: CutSpec, outW: number, outH: number, dpr: number = defaultDpr()): HTMLCanvasElement {
  const key = cutCacheKey(spec, outW, outH, dpr);
  const hit = cutCache.get(key);
  if (hit) {
    cutPerf.cacheHits++;
    return hit;
  }
  const t0 = now();
  const baked = getBaked(spec.sceneId);
  const cam = clampCamera(spec.camera, baked.tw, baked.th);
  const L = computeLayout(cam, outW, outH, dpr);
  const seed = parseInt(specHash(spec), 16) >>> 0;

  // 1) 원본 해상도 합성: 타일 조각 + 깊이순 사물/인물
  const sc = makeCanvas(L.sw, L.sh);
  const g = sc.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(baked.base, L.sx, L.sy, L.sw, L.sh, 0, 0, L.sw, L.sh);
  const hide = new Set(spec.hideStatic ?? []);
  const visible = (x: number, y: number, w: number, h: number) => x < L.sx + L.sw && y < L.sy + L.sh && x + w > L.sx && y + h > L.sy;
  const draw: (DrawItem | FigureDraw)[] = baked.items.filter((it) => !isHidden(it, hide) && visible(it.x, it.y, it.canvas.width, it.canvas.height));
  (spec.figures ?? []).forEach((f, i) => {
    const it = figureItem(f, i);
    if (it && visible(it.x - 12, it.y - 12, it.canvas.width + 24, it.canvas.height + 24)) draw.push(it);
  });
  for (const it of depthSort(draw)) {
    if ('fig' in it) drawFigure(g, it, L.sx, L.sy);
    else g.drawImage(it.canvas, it.x - L.sx, it.y - L.sy);
  }

  // 2) 시각 색조(곱셈) + 밤 창 점등
  const tint = spec.time !== undefined ? sceneTint(spec.sceneId, spec.time) : null;
  if (tint) {
    g.save();
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = rgbCss(tint.color);
    g.fillRect(0, 0, sc.width, sc.height);
    g.restore();
    const lit = TILES[TILE_KEYS.windowHanjiLit];
    if (lit && tint.dark > 0.25) {
      g.save();
      g.globalAlpha = Math.min(1, tint.dark * 1.1);
      const litCanvas = spriteCanvas(TILE_KEYS.windowHanjiLit, lit, 0);
      for (const w of baked.windows) {
        const wx = w.x * TILE - L.sx;
        const wy = w.y * TILE - L.sy;
        if (wx > -TILE && wy > -TILE && wx < L.sw && wy < L.sh) g.drawImage(litCanvas, wx, wy);
      }
      g.restore();
    }
  }
  const overlay = spec.overlay ?? 'memory';
  if (overlay === 'erased') eraseProcess(sc, seed);

  // 2.5) 기억이 닿지 않는 바깥(레터박스)
  const out = makeCanvas(L.pw, L.ph);
  const o = out.getContext('2d')!;
  o.imageSmoothingEnabled = false;
  o.fillStyle = baked.ambient;
  o.fillRect(0, 0, L.pw, L.ph);
  if (tint) {
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = rgbCss(tint.color);
    o.fillRect(0, 0, L.pw, L.ph);
    o.restore();
  }
  // 3) 정수 배율 최근접 확대
  o.drawImage(sc, 0, 0, L.sw, L.sh, L.dx, L.dy, L.dw, L.dh);

  // 4) 빛웅덩이(출력 해상도, 가산)
  if (spec.lights) {
    const strength = tint ? tint.dark : 0.6;
    o.save();
    o.globalCompositeOperation = 'lighter';
    for (const l of baked.lights) {
      if (isHidden({ id: l.itemId, tile: l.tile }, hide)) continue;
      const cx = (l.x - L.sx) * L.scale + L.dx;
      const cy = (l.y - L.sy) * L.scale + L.dy;
      // 빛 반경은 장면 px 기준 × 배율(과하게 번지지 않도록 0.8)
      const r = l.radius * L.scale * 0.8;
      if (cx + r < 0 || cy + r < 0 || cx - r > L.pw || cy - r > L.ph) continue;
      const grad = o.createRadialGradient(cx, cy, 0, cx, cy, r);
      const a = Math.min(1, l.alpha * strength);
      grad.addColorStop(0, `rgba(255,196,120,${(0.6 * a).toFixed(3)})`);
      grad.addColorStop(0.25, `rgba(255,176,96,${(0.38 * a).toFixed(3)})`);
      grad.addColorStop(0.6, `rgba(240,140,64,${(0.13 * a).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(220,120,50,0)');
      o.fillStyle = grad;
      o.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    o.restore();
  }

  // 5) 기억/지워짐 처리
  const grainPx = Math.max(1, Math.round(L.pw / Math.max(1, outW)));
  if (overlay === 'memory') {
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = 'rgb(250,238,218)';
    o.fillRect(0, 0, L.pw, L.ph);
    o.restore();
    drawVignette(o, L.pw, L.ph, spec.vignette ?? 0.5, '46,24,8');
    drawGrain(o, L.pw, L.ph, seed, 0.07, grainPx);
  } else if (overlay === 'erased') {
    o.save();
    o.globalCompositeOperation = 'multiply';
    o.fillStyle = 'rgb(176,196,224)';
    o.fillRect(0, 0, L.pw, L.ph);
    o.restore();
    drawVignette(o, L.pw, L.ph, spec.vignette ?? 0.8, '6,10,18');
    drawGrain(o, L.pw, L.ph, seed, 0.14, grainPx);
    // 감은 눈꺼풀: 위아래에서 내려오는 어둠
    for (const top of [true, false]) {
      const hh = L.ph * 0.16;
      const y0 = top ? 0 : L.ph - hh;
      const grad = o.createLinearGradient(0, top ? 0 : L.ph, 0, top ? hh : L.ph - hh);
      grad.addColorStop(0, 'rgba(4,6,12,0.92)');
      grad.addColorStop(1, 'rgba(4,6,12,0)');
      o.fillStyle = grad;
      o.fillRect(0, y0, L.pw, hh);
    }
  } else if (spec.vignette) {
    drawVignette(o, L.pw, L.ph, spec.vignette, '10,8,6');
  }

  cutCache.set(key, out);
  cutPerf.lastRender = now() - t0;
  cutPerf.renders++;
  return out;
}

/** <img src> 용 PNG data URL(캐시됨) */
export function cutToDataURL(spec: CutSpec, outW: number, outH: number, dpr: number = defaultDpr()): string {
  const key = cutCacheKey(spec, outW, outH, dpr);
  const hit = urlCache.get(key);
  if (hit) return hit;
  const url = renderCut(spec, outW, outH, dpr).toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}

/** 인물 탭 영역(CSS px, ≥44px, 뒤→앞). renderCut 과 같은 레이아웃을 쓴다. */
export function getFigureHitboxes(spec: CutSpec, outW: number, outH: number, dpr: number = defaultDpr()): FigureHitbox[] {
  const m = sceneMap(spec.sceneId);
  return computeHitboxes(spec, outW, outH, dpr, { w: m.w, h: m.h });
}

export function clearCutCache(): void {
  cutCache.clear();
  urlCache.clear();
}

