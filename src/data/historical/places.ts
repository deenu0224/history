// 실존 장소. 관측 #001 의 건물 배치는 재구성이며 여기 적지 않는다(world/maps.ts 참고).
import type { Place } from '@/core/types';
import { REF } from './refs';

export const places: Place[] = [
  {
    id: 'plc_chunchugwan',
    provenance: 'verified',
    name: '춘추관(실록청)',
    hanja: '春秋館',
    summary:
      '『성종실록』을 엮기 위한 임시 관청인 실록청이 1495년 4월 이 안에 설치되었다. ' +
      '춘추관 기사관은 다른 관직을 가진 정6품~정9품 관원이 겸했다.',
    sources: [REF.seongjongSillok, REF.gisagwan, REF.sagwan],
    authorNote: "관측 #001 의 마당·대청·곳간 배치는 재구성(검증된 도면 없음).",
  },
  {
    id: 'plc_daegu_museum',
    provenance: 'verified',
    name: '국립대구박물관',
    region: '대구 수성구',
    summary: '보물 「김일손 거문고」(탁영금)를 관리·소장하는 박물관(대구 수성구 청호로 321).',
    sources: [REF.takyeongKhs, REF.takyeongEncy],
  },
];
