/// <reference types="vite/client" />
/**
 * 맵 리졸버. 콘텐츠의 src/data/world/maps.ts(MAPS)가 있으면 우선 사용하고,
 * 없으면 아래 소형 테스트 맵을 쓴다. (import.meta.glob 이라 파일이 없어도 빌드가 깨지지 않는다.)
 */
import type { MapData } from '../logic/types';

type RawMap = Partial<MapData> & Pick<MapData, 'w' | 'h' | 'ground' | 'walls' | 'spawn'>;

const globbed = import.meta.glob('../../data/world/maps.ts', { eager: true }) as Record<string, { MAPS?: Record<string, RawMap> }>;
const contentMaps: Record<string, RawMap> = Object.values(globbed)[0]?.MAPS ?? {};

const pad = (rows: string[], w: number, h: number): string[] =>
  Array.from({ length: h }, (_, y) => (rows[y] ?? '').padEnd(w, ' ').slice(0, w));

function make(rows: { ground: string[]; walls: string[]; spawn: { x: number; y: number }; ambient: 'past' | 'modern' }): MapData {
  const h = rows.ground.length;
  const w = Math.max(...rows.ground.map((r) => r.length), ...rows.walls.map((r) => r.length));
  return { w, h, ground: pad(rows.ground, w, h), walls: pad(rows.walls, w, h), spawn: rows.spawn, ambient: rows.ambient };
}

/** 연구실(현대): 22×14 */
const LAB = make({
  ambient: 'modern',
  spawn: { x: 10, y: 8 },
  ground: [
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwcccccccccwwwwwww',
    'wwwwwwcccccccccwwwwwww',
    'wwwwwwcccccccccwwwwwww',
    'wwwwwwcccccccccwwwwwww',
    'wwwwwwcccccccccwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwww',
  ],
  walls: [
    'MMMMMMMMMMMMMMMMMMMMMM',
    'MMNNMMMNNMMMNNMMMDMMMM',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'M                    M',
    'MMMMMMMMMMMMMMMMMMMMMM',
  ],
});

/** 기록 보관실(현대): 18×12 */
const ARCHIVE = make({
  ambient: 'modern',
  spawn: { x: 3, y: 4 },
  ground: [
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwccccccccccwwww',
    'wwwwccccccccccwwww',
    'wwwwccccccccccwwww',
    'wwwwccccccccccwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwww',
  ],
  walls: [
    'MMMMMMMMMMMMMMMMMM',
    'MMDMMNNMMMNNMMNNMM',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'M                M',
    'MMMMMMMMMMMMMMMMMM',
  ],
});

/** 관측 001(과거): 관아 마당, 22×16 */
const OBS001 = make({
  ambient: 'past',
  spawn: { x: 11, y: 12 },
  ground: [
    '                      ',
    '                      ',
    '                      ',
    '......................',
    '...,..........,.......',
    '.,..........,.........',
    '   ________________   ',
    '.,........,=.......,..',
    '.....,.....=..,.......',
    ',........,.=......,...',
    '""..,......=.,........',
    '""......,..=.....,....',
    '...,.......=,........,',
    '.......,...=....,.....',
    '..,........=........,.',
    '......,....=...,......',
  ],
  walls: [
    '                      ',
    '   RRRRRRRRRRRRRRRR   ',
    '   RRRRRRRRRRRRRRRR   ',
    '###RRRRRRRRRRRRRRRR###',
    '#  HHHHHHHHHHHHHHHH  #',
    '#  PHHPHHPHDHHPHHHP  #',
    '#          S         #',
    '#                    #',
    '#                    #',
    '#   TT          U    #',
    '#   TT               #',
    '#                    #',
    '#                    #',
    '#                    #',
    '#                    #',
    '###########D##########',
  ],
});

const FALLBACK: Record<string, MapData> = { lab: LAB, archive: ARCHIVE, obs001: OBS001 };

/** 알 수 없는 씬 id 용 기본 맵(과거 마당). */
const GENERIC: MapData = OBS001;

function normalize(raw: RawMap): MapData {
  const w = raw.w;
  const h = raw.h;
  return {
    w,
    h,
    ground: pad(raw.ground, w, h),
    walls: pad(raw.walls, w, h),
    spawn: raw.spawn,
    ambient: raw.ambient ?? 'past',
  };
}

const cache = new Map<string, MapData>();

/** 콘텐츠 MAPS 를 우선하고, 없으면 내장 테스트 맵. */
export function getMap(sceneId: string): MapData {
  const hit = cache.get(sceneId);
  if (hit) return hit;
  const raw = contentMaps[sceneId];
  const map = raw ? normalize(raw) : (FALLBACK[sceneId] ?? GENERIC);
  cache.set(sceneId, map);
  return map;
}

export function hasContentMap(sceneId: string): boolean {
  return sceneId in contentMaps;
}

export const KNOWN_SCENES = ['lab', 'archive', 'obs001'] as const;
