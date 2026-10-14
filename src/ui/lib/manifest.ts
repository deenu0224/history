/**
 * 미리 구운 컷(public/cuts/ep1)의 목록과 탭 영역. 컷 이미지는 상대 경로로 불러온다(vite base './').
 * 런타임은 three.js / src/game/pov 를 가져오지 않는다.
 */
import { useEffect, useState } from 'react';

export interface CutFigureBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  listed: boolean;
}
export interface CutFiles {
  memory: { dpr3: string; dpr2: string };
  erased?: { dpr3: string; dpr2: string };
}
export interface CutEntry {
  time: string;
  files: CutFiles;
  figures: CutFigureBox[];
}
export interface CutManifest {
  css: { w: number; h: number };
  minTouchCss: number;
  cuts: Record<string, CutEntry>;
}

export const CUT_DIR = './cuts/ep1/';
export const BACKDROP = `${CUT_DIR}room-backdrop.webp`;

let cache: CutManifest | null = null;
let pending: Promise<CutManifest | null> | null = null;

export function loadManifest(): Promise<CutManifest | null> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(`${CUT_DIR}manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<CutManifest>) : null))
    .then((m) => (cache = m))
    .catch(() => null);
  return pending;
}

export function useManifest(): CutManifest | null {
  const [m, setM] = useState<CutManifest | null>(cache);
  useEffect(() => {
    if (m) return;
    let live = true;
    void loadManifest().then((x) => live && setM(x));
    return () => {
      live = false;
    };
  }, [m]);
  return m;
}

/** 컷 id → 이미지 srcset(기억 / 지워진 기억) */
export function cutSrc(entry: CutEntry | undefined, id: string, variant: 'memory' | 'erased' = 'memory') {
  const f = variant === 'erased' ? entry?.files.erased : entry?.files.memory;
  const d3 = f?.dpr3 ?? `${id}.webp`;
  const d2 = f?.dpr2 ?? `${id}.2x.webp`;
  return { src: `${CUT_DIR}${d2}`, srcSet: `${CUT_DIR}${d2} 780w, ${CUT_DIR}${d3} 1170w` };
}

/** 미리 받아 두기(다음 컷) */
export function preloadCut(entry: CutEntry | undefined, id: string, erased = false) {
  if (typeof Image === 'undefined') return;
  const s = cutSrc(entry, id, erased ? 'erased' : 'memory');
  const img = new Image();
  img.srcset = s.srcSet;
  img.src = s.src;
}
