// SF 설정 사건(가상). 실제 역사에 공백이 있다고 주장하지 않는다.
import type { HistoricalEvent } from '@/core/types';

export const events: HistoricalEvent[] = [
  {
    id: 'evt_anomaly_001',
    provenance: 'fictional',
    name: '이상 징후 #001',
    placeId: 'plc_lab',
    summary:
      '한 사관을 둘러싼 자료의 교차 참조가 통계적으로 "지나치게 매끄럽다". 날짜·출처·원본 모두 정상이며, ' +
      '다른 연구원들은 이상을 느끼지 못한다. 원리는 밝혀지지 않았다.',
  },
  {
    id: 'evt_anomaly_002',
    provenance: 'fictional',
    name: '이상 징후 #002',
    placeId: 'plc_lab',
    summary: '관측 #001 을 마친 뒤 감지된 두 번째 매끄러움. 다른 시대, 다른 사관의 자료 주변.',
  },
];
