// SF 설정 장소(가상). 실존 기관을 사칭하지 않는다.
import type { Place } from '@/core/types';

export const places: Place[] = [
  {
    id: 'plc_lab',
    provenance: 'fictional',
    name: '기록 분석실',
    summary: '근미래 역사 연구기관의 기록 분석실. 통합 역사 데이터베이스의 단말과 관측 장치가 있다.',
  },
  {
    id: 'plc_archive',
    provenance: 'fictional',
    name: '개인 기록관',
    summary: '연구소 지하의 개인 열람실. 관측과 조사로 확인한 자료가 전시물로 쌓인다.',
  },
];
