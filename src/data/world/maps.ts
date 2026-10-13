/**
 * 씬 맵(타일 단위). 한 글자 = 한 타일. 월드 구현(Phaser)은 MAP_LEGEND 의 기호를 아트 타일로 매핑한다.
 *  - ground: 바닥 레이어. ' ' 는 바닥 없음(통과 불가).
 *  - walls : 고체/장식 레이어. 통과 가능한 기호는 PASSABLE_WALLS(' ', 'D', 'S').
 *  - 'T'(소나무)는 2×2 앵커: 앵커 칸과 오른쪽·아래·오른쪽아래 칸, 모두 4칸을 막는다(나머지 3칸은 ' ' 로 적는다).
 *  - 상호작용 오브젝트(kind object/observe)가 놓인 칸은 막힌 것으로 본다. door 는 통과 가능.
 *
 * obs001(관측 #001)의 건물 배치는 재구성(reconstructed)이다. 검증된 도면이 없으므로 '관청다운' 일반 배치만 따른다.
 *   북쪽 대청(x10~29, y1~11): 열린 마루. 서안에서 사초를 검토한다.
 *   서쪽 곳간(x2~8, y5~13): 거둬 온 사초 꾸러미 보관. 문 (5,12).
 *   동쪽 회랑(x32~37, y3~21): 기둥 회랑. 북쪽 끝 벽(35,3)이 관측 경계(귀환 지점).
 *   남쪽 대문(19~20, 29), 우물(11,21), 소나무 다섯 그루.
 */
import type { Id } from '@/core/types';

export type SceneId = 'lab' | 'archive' | 'obs001';

export interface SceneMap {
  w: number;
  h: number;
  ground: string[];
  walls: string[];
  spawn: { x: number; y: number };
  ambient: 'past' | 'modern';
}

export const MAP_LEGEND = {
  ground: {
    '.': '흙 마당',
    ',': '흙 변형',
    '"': '풀',
    '=': '박석/돌길',
    _: '마루',
    o: '온돌 장판',
    w: '나무 바닥(현대)',
    c: '카펫(현대)',
    ' ': '없음',
  },
  walls: {
    '#': '기와 담장',
    H: '건물 벽(전통)',
    R: '지붕(기와, 통과 불가)',
    P: '기둥',
    D: '문(통과 가능, 장식)',
    S: '섬돌/계단(통과 가능)',
    M: '현대 벽',
    N: '창문 벽(현대)',
    T: '소나무(2×2 앵커)',
    U: '우물',
    ' ': '비어있음(통과 가능)',
  },
} as const;

export const PASSABLE_WALLS = new Set([' ', 'D', 'S']);

/** 씬 표시 정보. 과거 씬은 이름·연도·장소를 알려주지 않는다. */
export const SCENE_META: Record<SceneId, { title: string; hud: string[] }> = {
  lab: { title: '기록 분석실', hud: ['현재'] },
  archive: { title: '개인 기록관', hud: ['현재'] },
  obs001: {
    title: '관측 #001',
    hud: ['관측 #001', '시대: 미상', '연도: 미상', '장소: 미확인', '인물: 미확인', '관측 기록: 작성 중'],
  },
};

export const MAPS: Record<SceneId, SceneMap> = {
  lab: {
    w: 20,
    h: 14,
    ground: [
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwccccccccwwwwww",
      "wwwwwwccccccccwwwwww",
      "wwwwwwccccccccwwwwww",
      "wwwwwwccccccccwwwwww",
      "wwwwwwccccccccwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwwwww",
    ],
    walls: [
      "MMMMMMMMMMMMMMMMMMMM",
      "MNNMMNNMMNNMMNNMMNNM",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "M                  M",
      "MMMMMMMMMMDMMMMMMMMM",
    ],
    spawn: { x: 10, y: 11 },
    ambient: 'modern',
  },
  archive: {
    w: 18,
    h: 12,
    ground: [
      "wwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwww",
      "wwwccccccccccccwww",
      "wwwccccccccccccwww",
      "wwwccccccccccccwww",
      "wwwccccccccccccwww",
      "wwwccccccccccccwww",
      "wwwccccccccccccwww",
      "wwwwwwwwwwwwwwwwww",
      "wwwwwwwwwwwwwwwwww",
    ],
    walls: [
      "MMMMMMMMMMMMMMMMMM",
      "MMMMMMMMMMMMMMMMMM",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "M                M",
      "MMMMMMMMMDMMMMMMMM",
    ],
    spawn: { x: 9, y: 9 },
    ambient: 'modern',
  },
  obs001: {
    w: 40,
    h: 30,
    ground: [
      ",..........,..........,..........,......",
      ".\".\"\"\"\"\"\"\"____________________\"\"\"\"\"\"\"\".,",
      ".,\".......____________________....,...\".",
      ".\"\"....,..____________________..______\".",
      ".\",.......____________________..______..",
      ".._______.____________________,.______\".",
      ".\"_______.____________________..______\".",
      ".\"_______,____________________.,______..",
      ".._______.____________________..______\".",
      ".\"_______.____________________..______\".",
      ".\"_______.____________________..______,.",
      ",._______..==================...______\".",
      ".\"_______........,.==.......,...______\",",
      ".\"...=......,......==..,........______..",
      "..\"..==,..........,==........,..______\".",
      ".\"\"..===========================______\".",
      ".\"......,..........==.........,.______..",
      "..\",..........,....==....,......______\".",
      ".\"\"......,.........==..........,______\".",
      ".\"..,..........,...==.....,.....______..",
      "..\".......,........==,..........______\".",
      ".\"\"..,..........,..==......,....______\".",
      ",\".........,.......==.,..........,...\"..",
      "..\"...,..........,.==.......,.........\",",
      ".\"\".........,......==..,..........,..\"\".",
      ".\".....,..........,==........,.......\"..",
      "..\"..........,.....==...,..........,..\".",
      ".\"\"\"\"\"\"\"\"\"\"\".......==...\"\"\"\"\"\"\"\".....\"\".",
      ".\".,..........,....==....,..........,\"..",
      ".........,.........==..........,........",
    ],
    walls: [
      "########################################",
      "#         RRRRRRRRRRRRRRRRRRRR         #",
      "#         RRRRRRRRRRRRRRRRRRRR         #",
      "#         HHHHHHHHHHHHHHHHHHHH  HHHHHH #",
      "#         H                  H  P    P #",
      "# RRRRRRR H                  H         #",
      "# RRRRRRR H                  H         #",
      "# HHHHHHH H                  H  P    P #",
      "# H     H H                  H         #",
      "# H     H H                  H         #",
      "# H     H P  P  P      P  P  P  P    P #",
      "# H     H  SSSSSSSSSSSSSSSSSS          #",
      "# HHHDHHH                              #",
      "#    S                          P    P #",
      "#                                      #",
      "#                                      #",
      "#                               P    P #",
      "#                                      #",
      "#  T                                   #",
      "#                               P    P #",
      "#                                      #",
      "#          U                           #",
      "#                                      #",
      "#                                      #",
      "#     T                    T     T     #",
      "#            T                         #",
      "#                                      #",
      "#               RRR  RRR               #",
      "#               RRR  RRR               #",
      "###################DD###################",
    ],
    spawn: { x: 19, y: 26 },
    ambient: 'past',
  },};

/** 소나무 2×2 가 덮는 칸인가 */
function treeCovers(map: SceneMap, x: number, y: number): boolean {
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const) {
    if (map.walls[y - dy]?.[x - dx] === 'T') return true;
  }
  return false;
}

/** 지형만 보고 걸을 수 있는 칸인지(오브젝트·NPC 제외). */
export function isWalkableTile(map: SceneMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
  const g = map.ground[y]![x]!;
  const w = map.walls[y]![x]!;
  if (g === ' ') return false;
  if (!PASSABLE_WALLS.has(w)) return false;
  return !treeCovers(map, x, y);
}

/** 오브젝트로 막힌 칸 집합 키 */
export const tileKey = (x: number, y: number) => `${x},${y}`;

/** 맵에서 spawn 으로부터 걸어서 닿는 칸(BFS). blocked: 오브젝트가 차지한 칸. */
export function reachableTiles(map: SceneMap, blocked: ReadonlySet<string> = new Set()): Set<string> {
  const seen = new Set<string>();
  const start = map.spawn;
  if (!isWalkableTile(map, start.x, start.y) || blocked.has(tileKey(start.x, start.y))) return seen;
  const queue: [number, number][] = [[start.x, start.y]];
  seen.add(tileKey(start.x, start.y));
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = tileKey(nx, ny);
      if (seen.has(k) || blocked.has(k) || !isWalkableTile(map, nx, ny)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

export const isSceneId = (id: Id): id is SceneId => id in MAPS;
