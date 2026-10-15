/**
 * 굽기 API(개발 전용, pov-dev.html?bake). scripts/render-cuts.mjs 가 Playwright 로 window.__povBake 를 부른다.
 * 컷 하나 = 내부 해상도 렌더 → 후처리 → 정수 배율 최근접 확대 → WebP(무손실) 데이터 URL + 실제 보이는 인물(id 패스).
 * 프로덕션 번들에 들어가지 않는다(런타임은 미리 구운 이미지만 읽는다 — three 를 싣지 않는다).
 */
import { bakePovCut, bakePovStyle, type PovSpec, type PovStyle, type PovVisibility } from './index';
import { EP1_CUTS, EP1_ROOM_BACKDROP } from '@/data/cuts/ep1';
import { EP0_CUTS, EP0_ROOM_BACKDROP } from '@/data/cuts/ep0';

/** 굽기 대상 에피소드: 컷 목록 + 방 배경. 컷 id 는 에피소드끼리 겹치지 않는다 */
const EPISODES = {
  ep1: { cuts: EP1_CUTS, backdrop: EP1_ROOM_BACKDROP },
  ep0: { cuts: EP0_CUTS, backdrop: EP0_ROOM_BACKDROP },
} as const;
type EpisodeId = keyof typeof EPISODES;
const ALL_CUTS: readonly { id: string; spec: Omit<PovSpec, 'size' | 'overlay'> }[] = [...EP1_CUTS, ...EP0_CUTS];
const findCut = (id: string) => ALL_CUTS.find((c) => c.id === id);
/** 방 배경 id: 'room'(ep1) · 'room:ep0' */
const backdropOf = (id: string) => EPISODES[(id.split(':')[1] ?? 'ep1') as EpisodeId].backdrop;

export type BakeVariant = 'memory' | 'erased' | 'backdrop';

export interface BakeResult {
  id: string;
  variant: BakeVariant;
  /** 내부 해상도 */
  w: number;
  h: number;
  scale: number;
  dataUrl: string;
  visible: Record<string, PovVisibility>;
  ms: number;
}

function toCanvas(rgba: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
  return c;
}

function upscale(src: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width * scale;
  c.height = src.height * scale;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

async function bake(id: string, variant: BakeVariant, w: number, h: number, scale: number, format = 'image/webp', quality = 1): Promise<BakeResult> {
  const t0 = performance.now();
  if (variant === 'backdrop') {
    const r = await bakePovCut({ ...backdropOf(id), overlay: 'memory', size: { w, h } } as PovSpec);
    const base = toCanvas(r.rgba, w, h);
    const out = document.createElement('canvas');
    out.width = w * scale;
    out.height = h * scale;
    const g = out.getContext('2d')!;
    g.filter = `blur(${Math.round(2.5 * scale)}px) brightness(0.55) saturate(0.7)`;
    g.imageSmoothingEnabled = true;
    g.drawImage(base, -scale * 4, -scale * 4, out.width + scale * 8, out.height + scale * 8);
    return { id: 'room-backdrop', variant, w, h, scale, dataUrl: out.toDataURL(format, 0.82), visible: {}, ms: performance.now() - t0 };
  }
  const cut = findCut(id);
  if (!cut) throw new Error(`unknown cut ${id}`);
  const r = await bakePovCut({ ...cut.spec, overlay: variant, size: { w, h } } as PovSpec);
  const big = upscale(toCanvas(r.rgba, w, h), scale);
  return { id, variant, w, h, scale, dataUrl: big.toDataURL(format, quality), visible: r.visible, ms: performance.now() - t0 };
}

/**
 * 출시 굽기(기본 그림체 = 픽셀아트, ART 승인 시안 A): 내부 130×174 → 정수 배율 최근접 확대 → 아래 넘치는 행을 잘라 outW×outH.
 *   @3x 1170×1560 = ×9(1566 → 1560) · @2x 780×1040 = ×6(1044 → 1040).
 * visible 은 픽셀아트가 실제로 그린 2배 렌더(260×348)의 id 패스. visW/visH 는 그 좌표를 출력 이미지 0..1 로 바꿀 때 나눌 값
 * (잘린 아래 행 반영 — visH 는 출력 높이에 해당하는 렌더 행 수).
 */
export const PIXEL_SIZE = { w: 130, h: 174 } as const;

async function bakePixel(id: string, variant: BakeVariant, outW: number, outH: number, format = 'image/webp'): Promise<BakeResult & { visW: number; visH: number; outW: number; outH: number }> {
  const t0 = performance.now();
  const backdrop = variant === 'backdrop';
  const base = backdrop ? backdropOf(id) : findCut(id)?.spec;
  if (!base) throw new Error(`unknown cut ${id}`);
  const r = await bakePovStyle({ ...base, overlay: backdrop ? 'memory' : variant, size: { ...PIXEL_SIZE }, style: 'pixel' } as PovSpec);
  const scale = outW / r.w;
  if (!Number.isInteger(scale) || r.h * scale < outH) throw new Error(`pixel bake ${id}: ${r.w}×${r.h} does not fill ${outW}×${outH} at an integer scale`);
  const big = upscale(toCanvas(r.rgba, r.w, r.h), scale);
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const g = out.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  if (backdrop) g.filter = `blur(${Math.round(scale * 0.8)}px) brightness(0.55) saturate(0.7)`;
  g.drawImage(big, 0, 0);
  const vs = r.visibleScale;
  return {
    id: backdrop ? 'room-backdrop' : id,
    variant,
    w: r.w,
    h: r.h,
    scale,
    dataUrl: out.toDataURL(format, 1),
    visible: backdrop ? {} : r.visible,
    ms: performance.now() - t0,
    visW: r.w * vs,
    visH: (outH / scale) * vs,
    outW,
    outH,
  };
}

/**
 * 그림체 비교 시안 한 장: style 별 기본 해상도로 그려 outW 폭 이미지(PNG 데이터 URL)로. 굽기 기본 출력과 무관.
 * current = 내부 195×260(@2x 굽기와 같음) · pixel = 130×174(390 CSS 에서 3px 한 칸) · painted/hd2d = 780×1044.
 */
export const STYLE_SIZE: Record<PovStyle, { w: number; h: number }> = {
  current: { w: 195, h: 260 },
  pixel: { ...PIXEL_SIZE },
  painted: { w: 780, h: 1044 },
  hd2d: { w: 780, h: 1044 },
};

async function bakeStyle(id: string, variant: 'memory' | 'erased', style: PovStyle, outW = 390, size?: { w: number; h: number }) {
  const t0 = performance.now();
  const cut = findCut(id);
  if (!cut) throw new Error(`unknown cut ${id}`);
  const sz = size ?? STYLE_SIZE[style];
  const r = await bakePovStyle({ ...cut.spec, overlay: variant, size: sz, style } as PovSpec, STYLE_SIZE.pixel);
  const src = toCanvas(r.rgba, r.w, r.h);
  const outH = Math.round((outW * 4) / 3);
  const c = document.createElement('canvas');
  c.width = outW;
  c.height = outH;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0a09';
  g.fillRect(0, 0, outW, outH);
  // 픽셀 계열은 정수 배율 최근접 확대(넘치는 행은 아래에서 자름), 회화는 부드럽게 축소
  const pixelish = style === 'pixel' || style === 'current';
  if (pixelish && outW % r.w === 0) {
    g.imageSmoothingEnabled = false;
    const k = outW / r.w;
    g.drawImage(src, 0, 0, r.w * k, r.h * k);
  } else if (pixelish) {
    // 정수 배율로 먼저 키운 뒤 부드럽게 줄인다(가장자리 계단이 고르게)
    const k = Math.ceil(outW / r.w) * 2;
    const big = upscale(src, k);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(big, 0, 0, outW, (r.h * outW) / r.w);
  } else {
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, outW, (r.h * outW) / r.w);
  }
  const vis = Object.fromEntries(Object.entries(r.visible).map(([k, v]) => [k, Math.round(v.px / (r.visibleScale * r.visibleScale))]));
  return { id, variant, style, w: r.w, h: r.h, dataUrl: c.toDataURL('image/png'), full: style === 'painted' || style === 'hd2d' ? src.toDataURL('image/png') : upscale(src, Math.max(1, Math.round(780 / r.w))).toDataURL('image/png'), visible: vis, ms: performance.now() - t0 };
}

/** 비교 모음: 행 = 컷, 열 = 그림체. 칸은 모두 같은 표시 크기(tileW). */
async function compareSheet(rows: { label: string; tiles: { dataUrl: string; caption?: string }[] }[], cols: string[], tileW: number, title = ''): Promise<string> {
  const tileH = Math.round((tileW * 4) / 3);
  const pad = 14;
  const left = 120;
  const top = 64 + (title ? 34 : 0);
  const cap = 24;
  const c = document.createElement('canvas');
  c.width = left + cols.length * (tileW + pad) + pad;
  c.height = top + rows.length * (tileH + cap + pad) + pad;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0a09';
  g.fillRect(0, 0, c.width, c.height);
  g.textBaseline = 'middle';
  if (title) {
    g.font = '600 20px Pretendard, sans-serif';
    g.fillStyle = '#a39780';
    g.fillText(title, pad, 26);
  }
  g.font = '700 22px Pretendard, sans-serif';
  cols.forEach((t, k) => {
    g.fillStyle = '#e9dfc6';
    g.fillText(t, left + k * (tileW + pad) + 2, top - 22);
  });
  for (let rI = 0; rI < rows.length; rI++) {
    const y = top + rI * (tileH + cap + pad);
    g.font = '700 22px Pretendard, sans-serif';
    g.fillStyle = rows[rI].label.includes('erased') ? '#5c9a95' : '#e2a85c';
    const parts = rows[rI].label.split(' ');
    parts.forEach((p, k) => g.fillText(p, pad, y + 20 + k * 26));
    for (let k = 0; k < rows[rI].tiles.length; k++) {
      const t = rows[rI].tiles[k];
      const img = new Image();
      img.src = t.dataUrl;
      await img.decode();
      const x = left + k * (tileW + pad);
      g.imageSmoothingEnabled = false;
      g.drawImage(img, x, y, tileW, tileH);
      if (t.caption) {
        g.font = '500 14px Pretendard, sans-serif';
        g.fillStyle = '#a39780';
        g.fillText(t.caption, x + 2, y + tileH + cap / 2 + 2);
      }
    }
  }
  return c.toDataURL('image/png');
}

/** 확인용 모음 이미지(PNG): 칸마다 이미지 + 아래 글자 */
async function sheet(items: { label: string; dataUrl: string }[], cols: number, cellW: number, cellH: number): Promise<string> {
  const pad = 10;
  const lab = 30;
  const rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * (cellW + pad) + pad;
  c.height = rows * (cellH + lab + pad) + pad;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0b0a09';
  g.fillRect(0, 0, c.width, c.height);
  g.font = '600 20px Pretendard, sans-serif';
  g.textBaseline = 'middle';
  for (let i = 0; i < items.length; i++) {
    const img = new Image();
    img.src = items[i].dataUrl;
    await img.decode();
    const x = pad + (i % cols) * (cellW + pad);
    const y = pad + Math.floor(i / cols) * (cellH + lab + pad);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, x, y, cellW, cellH);
    g.fillStyle = items[i].label.includes('erased') ? '#5c9a95' : '#e2a85c';
    g.fillText(items[i].label, x + 4, y + cellH + lab / 2);
  }
  return c.toDataURL('image/png');
}

declare global {
  interface Window {
    __povBake?: {
      cuts: BakeCutInfo[];
      episodes: Record<EpisodeId, BakeCutInfo[]>;
      bake: typeof bake;
      bakePixel: typeof bakePixel;
      sheet: typeof sheet;
      bakeStyle: typeof bakeStyle;
      compareSheet: typeof compareSheet;
    };
  }
}

interface BakeCutInfo {
  id: string;
  erasable: boolean;
  listed: string[];
  details: string[];
  witnessId: string;
  time: string;
}
const info = (c: { id: string; erasable?: boolean; listed: readonly string[]; details?: readonly string[]; time: string; spec: { witnessId: string } }): BakeCutInfo => ({
  id: c.id,
  erasable: !!c.erasable,
  listed: [...c.listed],
  details: [...(c.details ?? [])],
  witnessId: c.spec.witnessId,
  time: c.time,
});
window.__povBake = { cuts: EP1_CUTS.map(info), episodes: { ep1: EP1_CUTS.map(info), ep0: EP0_CUTS.map(info) }, bake, bakePixel, sheet, bakeStyle, compareSheet };
document.body.dataset.bakeReady = '1';
