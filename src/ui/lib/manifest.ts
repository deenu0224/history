/**
 * 미리 구운 컷(public/cuts/<에피소드>/)의 목록과 탭 영역. 컷 이미지는 상대 경로로 불러온다(vite base './').
 * 에피소드마다 목록이 따로 있다(ep0, ep1). 런타임은 three.js / src/game/pov 를 가져오지 않는다.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export interface CutFigureBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  listed: boolean;
}
/** 컷 안의 세부(두루마리 머리글 같은 것)의 탭 영역 — 사람 상자보다 먼저 눌린다 */
export interface CutDetailBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CutFiles {
  memory: { dpr3: string; dpr2: string };
  erased?: { dpr3: string; dpr2: string };
}
export interface CutEntry {
  time: string;
  files: CutFiles;
  figures: CutFigureBox[];
  details?: CutDetailBox[];
}
export interface CutManifest {
  css: { w: number; h: number };
  minTouchCss: number;
  cuts: Record<string, CutEntry>;
}

export const DEFAULT_EP = 'ep1';
export const cutDir = (epId: string = DEFAULT_EP) => `./cuts/${epId}/`;
export const backdropSrc = (epId: string = DEFAULT_EP) => `${cutDir(epId)}room-backdrop.webp`;
/** 옛 호환: 에피소드 1 의 배경 */
export const BACKDROP = backdropSrc('ep1');

const cache = new Map<string, CutManifest>();
const pending = new Map<string, Promise<CutManifest | null>>();

export function loadManifest(epId: string = DEFAULT_EP): Promise<CutManifest | null> {
  const hit = cache.get(epId);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(epId);
  if (!p) {
    p = fetch(`${cutDir(epId)}manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<CutManifest>) : null))
      .then((m) => {
        if (m) cache.set(epId, m);
        return m;
      })
      .catch(() => null);
    pending.set(epId, p);
  }
  return p;
}

/** 지금 에피소드의 컷 목록 */
export function useManifest(): CutManifest | null {
  const epId = useGameStore((s) => s.episodeId);
  const [m, setM] = useState<CutManifest | null>(cache.get(epId) ?? null);
  useEffect(() => {
    const hit = cache.get(epId);
    if (hit) {
      setM(hit);
      return;
    }
    setM(null);
    let live = true;
    void loadManifest(epId).then((x) => live && setM(x));
    return () => {
      live = false;
    };
  }, [epId]);
  return m;
}

/** 컷 id → 이미지 srcset(기억 / 지워진 기억) */
export function cutSrc(entry: CutEntry | undefined, id: string, variant: 'memory' | 'erased' = 'memory', epId: string = DEFAULT_EP) {
  const f = variant === 'erased' ? entry?.files.erased : entry?.files.memory;
  const d3 = f?.dpr3 ?? `${id}.webp`;
  const d2 = f?.dpr2 ?? `${id}.2x.webp`;
  const dir = cutDir(epId);
  return { src: `${dir}${d2}`, srcSet: `${dir}${d2} 780w, ${dir}${d3} 1170w` };
}

/** 미리 받아 두기(다음 컷) */
export function preloadCut(entry: CutEntry | undefined, id: string, erased = false, epId: string = DEFAULT_EP) {
  if (typeof Image === 'undefined') return;
  const s = cutSrc(entry, id, erased ? 'erased' : 'memory', epId);
  const img = new Image();
  img.srcset = s.srcSet;
  img.src = s.src;
}
