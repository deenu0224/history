/**
 * POV 컷 공개 API. three 는 첫 renderPovCut 호출 때만 지연 로딩된다(별도 청크).
 * getFigureHitboxes 는 순수 수학이라 three 없이 즉시 쓸 수 있다.
 * 컷은 정지 이미지: 스펙마다 한 번 그려 캐시한다(같은 스펙의 동시 요청은 같은 Promise 를 공유).
 */
import { postProcess } from './post';
import { fnv1a, internalSize, povCamera, specKey } from './camera';
import type { PovPerf, PovSpec } from './types';
import type { PovVisibility } from './render3d';
export type { PovVisibility } from './render3d';

export type * from './types';
export { getFigureHitboxes, povCamera, project, sunAt, povInternalSize, parseTime } from './camera';
export { ROOM_EP1, ROOM_EP0, SLIP_SPOTS, PROP_SPOTS, ADDRESS_ALLOWED, occluders, isOccluded, seatEye, slipTop, validatePovSpec } from './room';
import { validatePovSpec } from './room';
export { MOOD, MEMORY_PALETTE, ERASED_PALETTE, moodCssVars } from './palette';

const cache = new Map<string, Promise<HTMLCanvasElement>>();
const MAX = 24;
export const povPerf: PovPerf[] = [];

/** 정지 컷 한 장(내부 해상도 캔버스). CSS 에서 image-rendering: pixelated 로 정수 배율 확대해 쓴다. */
export function renderPovCut(spec: PovSpec): Promise<HTMLCanvasElement> {
  const key = specKey(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  if ((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV) for (const e of validatePovSpec(spec)) console.warn('[pov]', e);
  const p = (async () => {
    const t0 = performance.now();
    const { render3d } = await import('./render3d');
    const raw = await render3d(spec);
    const t1 = performance.now();
    const px = postProcess({
      w: raw.w,
      h: raw.h,
      rgba: raw.rgba,
      depth: raw.depth,
      focusDepth: raw.focusDepth,
      overlay: spec.overlay,
      seed: spec.seed ?? fnv1a(key),
      vignette: spec.vignette,
    });
    const c = document.createElement('canvas');
    c.width = raw.w;
    c.height = raw.h;
    c.getContext('2d')!.putImageData(new ImageData(px as Uint8ClampedArray<ArrayBuffer>, raw.w, raw.h), 0, 0);
    const t2 = performance.now();
    povPerf.push({ key: spec.witnessId + '/' + spec.overlay, buildMs: raw.buildMs, renderMs: raw.renderMs, postMs: t2 - t1, totalMs: t2 - t0, w: raw.w, h: raw.h });
    return c;
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  if (cache.size > MAX) cache.delete(cache.keys().next().value as string);
  return p;
}

/**
 * 굽기용(scripts/render-cuts.mjs → pov-dev.html?bake): 후처리까지 끝난 픽셀 + 실제 보이는 인물·종이 조각(id 패스).
 * 캐시하지 않는다.
 */
export async function bakePovCut(spec: PovSpec): Promise<{ w: number; h: number; rgba: Uint8ClampedArray; visible: Record<string, PovVisibility> }> {
  const { render3d } = await import('./render3d');
  const raw = await render3d(spec);
  const rgba = postProcess({ w: raw.w, h: raw.h, rgba: raw.rgba, depth: raw.depth, focusDepth: raw.focusDepth, overlay: spec.overlay, seed: spec.seed ?? fnv1a(specKey(spec)), vignette: spec.vignette });
  return { w: raw.w, h: raw.h, rgba, visible: raw.visible };
}

/**
 * 그림체 비교 시안(굽기 전용, 캐시 없음). spec.size 는 style 마다 뜻이 다르다:
 *  - current: 내부 해상도(기존과 같음) · pixel: 최종 픽셀아트 해상도(렌더는 그 2배로 그려 줄인다)
 *  - painted: 출력 해상도 그대로(픽셀화 없음) · hd2d: painted 해상도, 인물은 pixelSize 의 픽셀아트로 덮는다
 * visible 은 언제나 그 스타일이 실제로 그린 렌더의 id 패스(가림·화면 밖 반영).
 */
export async function bakePovStyle(
  spec: PovSpec,
  pixelSize?: { w: number; h: number },
): Promise<{ w: number; h: number; rgba: Uint8ClampedArray; visible: Record<string, PovVisibility>; visibleScale: number }> {
  const style = spec.style ?? 'current';
  if (style === 'current') {
    const r = await bakePovCut({ ...spec, style: undefined });
    return { ...r, visibleScale: 1 };
  }
  const { render3d } = await import('./render3d');
  const seed = spec.seed ?? fnv1a(specKey({ ...spec, style: undefined }));
  const size = internalSize(spec);
  const runPixel = async (ps: { w: number; h: number }) => {
    const raw = await render3d({ ...spec, style: 'pixel', size: { w: ps.w * 2, h: ps.h * 2 } });
    const { postPixel } = await import('./post-pixel');
    return { raw, px: postPixel({ w2: raw.w, h2: raw.h, rgba: raw.rgba, depth: raw.depth, normal: raw.normal!, obj: raw.obj!, objNames: raw.objNames!, overlay: spec.overlay, seed, focusDepth: raw.focusDepth, bigFaces: spec.room === 'ep0', robes: { ...Object.fromEntries(spec.figures.map((f) => [f.id, f.robe ?? 'blue'])), ...(spec.self ? { self: spec.self.robe } : {}) } }) };
  };
  if (style === 'pixel') {
    const { raw, px } = await runPixel(size);
    return { w: px.w, h: px.h, rgba: px.rgba, visible: raw.visible, visibleScale: 2 };
  }
  const raw = await render3d({ ...spec, style: 'painted', size });
  const { postPainted } = await import('./post-painted');
  const fov = povCamera({ ...spec, size }).fovDeg;
  const focalPx = raw.h / 2 / Math.tan((fov * Math.PI) / 360);
  const rgba = postPainted({ w: raw.w, h: raw.h, rgba: raw.rgba, depth: raw.depth, normal: raw.normal, obj: raw.obj, objNames: raw.objNames, glow: raw.glow, focusDepth: raw.focusDepth, focalPx, overlay: spec.overlay, seed, vignette: spec.vignette });
  if (style === 'hd2d') {
    const ps = pixelSize ?? { w: Math.round(raw.w / 6), h: Math.round(raw.h / 6) };
    const { px } = await runPixel(ps);
    const sx = px.w / raw.w;
    const sy = px.h / raw.h;
    for (let y = 0; y < raw.h; y++)
      for (let x = 0; x < raw.w; x++) {
        const j = Math.min(px.h - 1, Math.floor(y * sy)) * px.w + Math.min(px.w - 1, Math.floor(x * sx));
        if (!px.figMask[j]) continue;
        const i = (y * raw.w + x) * 4;
        rgba[i] = px.rgba[j * 4];
        rgba[i + 1] = px.rgba[j * 4 + 1];
        rgba[i + 2] = px.rgba[j * 4 + 2];
      }
  }
  return { w: raw.w, h: raw.h, rgba, visible: raw.visible, visibleScale: 1 };
}

export function clearPovCache(): void {
  cache.clear();
}

export { internalSize };
