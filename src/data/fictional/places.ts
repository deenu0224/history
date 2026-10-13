// SF 설정 장소(가상). 실존 기관을 사칭하지 않는다.
import type { Place } from '@/core/types';

export const places: Place[] = [
  {
    id: 'plc_lab',
    provenance: 'fictional',
    name: '실록청(實錄廳) — 국가역사복원기관',
    summary:
      '대한민국 국가역사복원기관(가상, Office of Historical Reconstruction). 역사 소실에 상시 대응하려고 세웠다. ' +
      '관측운영과(관측기 운용·좌표 계산), 기록대조과(대조관), 복원심의위원회(불일치 보고서 승인), 통합 역사 DB 관리단(소실 탐지·좌표 손상 건 생성·자동 분류). ' +
      '이름은 조선의 실록 편찬 관청에서 따왔다.',
  },
];
