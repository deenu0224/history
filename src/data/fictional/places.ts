// SF 설정 장소(가상). 실존 기관을 사칭하지 않는다.
import type { Place } from '@/core/types';

export const places: Place[] = [
  {
    id: 'plc_lab',
    provenance: 'fictional',
    name: '기록대조과',
    summary: '근미래 역사 연구기관의 기록대조과. 대조관이 관측 장치로 과거를 보고 기록과 대조해 일치·불일치 도장을 찍는다.',
  },
];
