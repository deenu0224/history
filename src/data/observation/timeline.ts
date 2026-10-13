/**
 * 관측 #C-2217 타임라인(관측 앱). obs001 오브젝트·NPC 일정에서 핫스팟을 만든다(core/observation deriveHotspots).
 *  - 08:00~19:00 (480~1140분). 시작 카메라는 마당·곳간 쪽: 08:00 에 서리가 꾸러미를 나르는 것이 화면 안에 있다.
 *  - 메타데이터: 좌표 #C-2217, 일시 '####', 장소·인물 '미확인'. 시각(HH:MM)만 보여 주고 날짜는 보여 주지 않는다.
 *  - 노이즈: 관측의 경계(진입·종료 직전)와 13:56 의 미세 지직(전교 직전)에만. 형광·네온 없이 명도와 지터.
 */
import { deriveHotspots } from '@/core/observation';
import type { ObservationTimeline } from '@/core/types';
import { npcs } from '@/data/world/npcs';
import { worldObjects } from '@/data/world/worldObjects';

export const timelines: ObservationTimeline[] = [
  {
    id: 'tl_obs001',
    provenance: 'fictional',
    sceneId: 'obs001',
    title: '관측 — 좌표 #C-2217',
    start: 480,
    end: 1140,
    initial: 480,
    camera: { x: 8, y: 10 },
    meta: [
      { label: '좌표', value: '#C-2217' },
      { label: '일시', value: '####' },
      { label: '장소', value: '미확인' },
      { label: '인물', value: '미확인' },
    ],
    hotspots: deriveHotspots('obs001', { worldObjects, npcs }),
    glitches: [
      { from: 480, to: 492, intensity: 0.6 },
      { from: 836, to: 840, intensity: 0.15 },
      { from: 1128, to: 1141, intensity: 0.6 },
    ],
  },
];
