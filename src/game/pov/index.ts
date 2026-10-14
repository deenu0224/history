/**
 * POV 컷 공개 API. three 는 첫 renderPovCut 호출 때만 지연 로딩된다(별도 청크).
 * getFigureHitboxes 는 순수 수학이라 three 없이 즉시 쓸 수 있다.
 * 컷은 정지 이미지: 스펙마다 한 번 그려 캐시한다(같은 스펙의 동시 요청은 같은 Promise 를 공유).
 */
import { postProcess } from './post';
import { fnv1a, internalSize, specKey } from './camera';
import type { PovPerf, PovSpec } from './types';

export type * from './types';
export { getFigureHitboxes, povCamera, project, sunAt, povInternalSize, parseTime } from './camera';
export { ROOM_EP1, SLIP_SPOTS, ADDRESS_ALLOWED, occluders, isOccluded, seatEye, slipTop, validatePovSpec } from './room';
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
  if (import.meta.env?.DEV) for (const e of validatePovSpec(spec)) console.warn('[pov]', e);
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

export function clearPovCache(): void {
  cache.clear();
}

export { internalSize };
