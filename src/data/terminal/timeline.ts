/**
 * 관측 #001 타임라인(관측 뷰어). 기존 obs001 오브젝트·NPC 일정에서 핫스팟을 만든다(core/observation deriveHotspots).
 *  - 08:00~19:00 (480~1140분). 시작 카메라는 곳간 앞: 08:00 에 서리(첫 핫스팟)가 화면 안에 있다(World 1-1 원칙).
 *  - 메타데이터 패널은 연도 '####', 장소·인물 '미확인'. 시각(HH:MM)은 보여 주되 날짜는 보여 주지 않는다.
 *  - 노이즈는 관측의 경계(진입·종료 직전)와, 한낮의 짧은 흔들림에만 — 형광·네온 없이 명도와 지터.
 */
import { deriveHotspots } from '@/core/observation';
import type { ObservationTimeline } from '@/core/types';
import { SCENE_META } from '@/data/world/maps';
import { npcs } from '@/data/world/npcs';
import { worldObjects } from '@/data/world/worldObjects';

export const timelines: ObservationTimeline[] = [
  {
    id: 'tl_obs001',
    provenance: 'fictional',
    sceneId: 'obs001',
    observationId: 'obs_001',
    returnObservationId: 'obs_001_return',
    title: SCENE_META.obs001.title,
    start: 480,
    end: 1140,
    initial: 480,
    camera: { x: 6, y: 9 },
    meta: [
      { label: '관측', value: '#001' },
      { label: '시대', value: '미상' },
      { label: '연도', value: '####' },
      { label: '장소', value: '미확인' },
      { label: '인물', value: '미확인' },
      { label: '관측 기록', value: '작성 중' },
    ],
    hotspots: deriveHotspots('obs001', { worldObjects, npcs }),
    glitches: [
      { from: 480, to: 492, intensity: 0.6 },
      { from: 836, to: 846, intensity: 0.25 },
      { from: 1128, to: 1141, intensity: 0.6 },
    ],
  },
];
