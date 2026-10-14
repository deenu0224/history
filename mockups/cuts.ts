/**
 * 목업용 컷 스펙 — 실제 렌더러(`src/game/cuts`)에 obs001(실록청 대청) 조각을 넣는다.
 * 컷 번호·시각은 DESIGN_V5 §4.4(재구성). 인물 배치는 목업용 근사치(최종 아님).
 */
import type { CutSpec } from '../src/game/cuts';

export interface Area {
  w: number;
  h: number;
}
/** 중심(cx,cy 타일), 가로 tw 타일 → 출력 비율(w:h)에 맞는 카메라 */
export const cam = (cx: number, cy: number, tw: number, a: Area) => {
  const h = (tw * a.h) / a.w;
  return { x: cx - tw / 2, y: cy - h / 2, w: tw, h };
};

const min = (hh: number, mm: number) => hh * 60 + mm;

/** E1 첫 번째 기억 1-1 ~ 1-5 (다섯 장). 1-2 가 목업의 주인공 컷 */
export function e1Cuts(a: Area, opts: { tagged?: boolean; unknownServant?: boolean } = {}): CutSpec[] {
  const { tagged = false, unknownServant = true } = opts;
  return [
    {
      id: 'c1-1',
      sceneId: 'obs001',
      fill: true,
      camera: cam(19.2, 6.2, 4.4, a),
      time: min(9, 10),
      figures: [
        { id: 'red', spriteKey: 'npc_official_red', x: 19, y: 5, facing: 'down' },
        { id: 'clerk', spriteKey: 'npc_clerk', x: 20.6, y: 7.0, facing: 'left' },
      ],
    },
    {
      id: 'c1-2',
      sceneId: 'obs001',
      fill: true,
      camera: cam(19.3, 6.4, 5.8, a),
      time: min(11, 40),
      figures: [
        { id: 'red', spriteKey: 'npc_official_red', x: 19, y: 5, facing: 'down', highlight: tagged ? 'tagged' : 'unknown' },
        { id: 'servant', spriteKey: 'npc_servant', x: 20.3, y: 7.2, facing: 'left', highlight: unknownServant ? 'unknown' : 'none' },
      ],
    },
    {
      id: 'c1-3',
      sceneId: 'obs001',
      fill: true,
      camera: cam(19.4, 7.4, 3.6, a),
      time: min(13, 20),
      figures: [{ id: 'servant', spriteKey: 'npc_servant', x: 20.5, y: 7.8, facing: 'left' }],
    },
    {
      id: 'c1-4',
      sceneId: 'obs001',
      fill: true,
      camera: cam(19, 9.2, 5.8, a),
      time: min(14, 0),
      figures: [
        { id: 'clerk', spriteKey: 'npc_clerk', x: 17.5, y: 9, facing: 'right' },
        { id: 'red', spriteKey: 'npc_official_red', x: 19.5, y: 9, facing: 'left' },
      ],
    },
    {
      id: 'c1-5',
      sceneId: 'obs001',
      fill: true,
      camera: cam(19.1, 5.8, 3.9, a),
      time: min(15, 0),
      lights: true,
      figures: [{ id: 'red', spriteKey: 'npc_official_red', x: 19, y: 5, facing: 'down' }],
    },
  ];
}

/** E2 2-1: 서안 너머 남색 관복(첫 번째 기억의 주인 자리). 이름 붙이기 퍼즐 T2 의 컷 */
export function e2Cut21(a: Area): CutSpec {
  return {
    id: 'c2-1',
    sceneId: 'obs001',
    fill: true,
    camera: cam(15.4, 6.0, 3.9, a),
    time: min(11, 40),
    figures: [
      { id: 'blue', spriteKey: 'npc_official_blue', x: 15, y: 5, facing: 'down', highlight: 'unknown' },
      { id: 'green', spriteKey: 'npc_official_green', x: 16.6, y: 6.7, facing: 'left' },
    ],
  };
}

/** 닫힌 눈 E3 의 안 본 컷(3-5) — 소실 오버레이 */
export function e3ClosedCut(a: Area): CutSpec {
  return {
    id: 'c3-5',
    sceneId: 'obs001',
    fill: true,
    camera: cam(24.2, 6.4, 3.9, a),
    time: min(15, 40),
    overlay: 'erased',
    figures: [{ id: 'sagwan', spriteKey: 'npc_historian', x: 24, y: 7, facing: 'left' }],
  };
}
