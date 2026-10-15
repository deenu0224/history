/**
 * 그날의 방 도면(DESIGN_V5 §4.2, §13). provenance: reconstructed — 검증된 도면은 없다(일반형).
 * 12×9칸, 위가 북(병풍 = 윗자리), 아래 가운데가 문. 좌표는 src/game/pov/room.ts(ROOM_EP1)와 같다.
 * 거리·반경·가림은 저장하지 않고 core/room.ts 가 계산한다.
 */
import type { RoomPlan } from '@/core/types';

export const ROOM: RoomPlan = {
  id: 'room_c2217',
  provenance: 'reconstructed',
  w: 12,
  h: 9,
  // 바깥 벽(안쪽 벽 없음 — 한 방)
  walls: [
    [0, 0, 12, 0],
    [12, 0, 12, 9],
    [0, 9, 4, 9],
    [8, 9, 12, 9],
    [0, 0, 0, 9],
  ],
  doors: [
    { id: 'DOOR', x: 6.0, y: 9.0, label: '문' },
    { id: 'STORE_DOOR', x: 0, y: 7.0, label: '곳간 문' },
  ],
  screen: [3.4, 0.2, 8.6, 0.6],
  furniture: [
    { id: 'desk', label: '책상', rect: [4.5, 3.0, 7.5, 4.5], occludes: false },
    { id: 'stack', label: '기록 더미', rect: [6.6, 3.2, 7.2, 4.2], occludes: true },
    { id: 'corner_desk', label: '구석 책상', rect: [10.6, 0.5, 11.8, 1.4], occludes: false },
  ],
  seats: [
    { id: 'Y', x: 3.5, y: 3.75, facingDeg: 0 },
    { id: 'W', x: 9.0, y: 3.75, facingDeg: 180 },
    { id: 'O', x: 6.0, y: 2.0, facingDeg: 90 },
    { id: 'H', x: 11.2, y: 1.0, facingDeg: 135 },
    { id: 'U', x: 2.6, y: 5.4, facingDeg: 45 },
    { id: 'A', x: 9.8, y: 5.4, facingDeg: 135 },
  ],
  points: [
    { id: 'B', x: 6.0, y: 8.6, label: '문 앞' },
    { id: 'M2', x: 6.0, y: 5.2, label: '책상 앞' },
    { id: 'SP', x: 4.6, y: 3.8, label: '봉하는 자리' },
    { id: 'DOOR', x: 6.0, y: 9.0, label: '문' },
    { id: 'HONG_EDGE', x: 8.0, y: 4.8, label: '책상 남동쪽 모서리' },
    { id: 'CLK_0910', x: 7.6, y: 4.8 },
    { id: 'CLK_1140', x: 9.6, y: 4.4 },
    { id: 'CLK_1145', x: 9.0, y: 4.6 },
    { id: 'CLK_1320', x: 9.4, y: 2.9 },
    { id: 'CLK_1540', x: 10.4, y: 1.6 },
    { id: 'CLK_1610', x: 10.6, y: 1.6 },
  ],
  hearingRadius: { whisper: 1.5, talk: 6, read: 8 },
  garbleFactor: 1.25,
  sight: { halfAngleDeg: 50, detailRange: 5, actionRange: 10 },
};
