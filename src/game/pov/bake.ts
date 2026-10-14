/**
 * 굽기 API(개발 전용, pov-dev.html?bake). scripts/render-cuts.mjs 가 Playwright 로 window.__povBake 를 부른다.
 * 컷 하나 = 내부 해상도 렌더 → 후처리 → 정수 배율 최근접 확대 → WebP(무손실) 데이터 URL + 실제 보이는 인물(id 패스).
 * 프로덕션 번들에 들어가지 않는다(런타임은 미리 구운 이미지만 읽는다 — three 를 싣지 않는다).
 */
import { bakePovCut, type PovSpec, type PovVisibility } from './index';
import { EP1_CUTS, EP1_ROOM_BACKDROP } from '@/data/cuts/ep1';

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
    const r = await bakePovCut({ ...EP1_ROOM_BACKDROP, overlay: 'memory', size: { w, h } } as PovSpec);
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
  const cut = EP1_CUTS.find((c) => c.id === id);
  if (!cut) throw new Error(`unknown cut ${id}`);
  const r = await bakePovCut({ ...cut.spec, overlay: variant, size: { w, h } } as PovSpec);
  const big = upscale(toCanvas(r.rgba, w, h), scale);
  return { id, variant, w, h, scale, dataUrl: big.toDataURL(format, quality), visible: r.visible, ms: performance.now() - t0 };
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
      cuts: { id: string; erasable: boolean; listed: string[]; witnessId: string; time: string }[];
      bake: typeof bake;
      sheet: typeof sheet;
    };
  }
}

window.__povBake = { cuts: EP1_CUTS.map((c) => ({ id: c.id, erasable: !!c.erasable, listed: [...c.listed], witnessId: c.spec.witnessId, time: c.time })), bake, sheet };
document.body.dataset.bakeReady = '1';
