/**
 * Ep0 그날의 방 도면(reconstructed — 이 날 기사에는 장소가 없다). 12×9칸, 위가 북(높은 자리).
 * 높은 자리 K 에 임금, 그 앞 C 에 상소를 든 최만리, 그 뒤 한 줄(J·ROW·M), 줄 끝 HA 에 보는 사람(하위지).
 * 병풍·어좌 장식은 두지 않는다(일월오봉도 등은 이 날 이 자리에 있었다는 근거가 없다). 이 에피소드에서 방 화면은 열리지 않는다.
 */
import type { RoomPlan } from '@/core/types';

export const ROOM_EP0: RoomPlan = {
  id: 'room_c2209',
  provenance: 'reconstructed',
  w: 12,
  h: 9,
  walls: [
    [0, 0, 12, 0],
    [12, 0, 12, 9],
    [0, 9, 4, 9],
    [8, 9, 12, 9],
    [0, 0, 0, 9],
  ],
  doors: [{ id: 'DOOR', x: 6.0, y: 9.0, label: '문' }],
  screen: [5.4, 0.1, 6.6, 0.2],
  furniture: [{ id: 'dais', label: '높은 자리', rect: [4.8, 0.4, 7.2, 1.6], occludes: false }],
  seats: [
    { id: 'K', x: 6.0, y: 1.0, facingDeg: 90 },
    { id: 'C', x: 6.0, y: 4.2, facingDeg: 270 },
    { id: 'J', x: 4.2, y: 5.6, facingDeg: 270 },
    { id: 'ROW', x: 6.0, y: 5.6, facingDeg: 270 },
    { id: 'M', x: 7.8, y: 5.6, facingDeg: 270 },
    { id: 'HA', x: 9.6, y: 5.6, facingDeg: 270 },
  ],
  points: [],
  hearingRadius: { whisper: 1.5, talk: 6, read: 8 },
  garbleFactor: 1.25,
  sight: { halfAngleDeg: 50, detailRange: 5, actionRange: 10 },
};
