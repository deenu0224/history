// 실존 유물. 특징은 공식 데이터(국가유산청)·백과사전에서 '확정'인 것만. 암호·숨은 문양·장치 금지(CLAUDE.md 5).
import type { HistoricalArtifact } from '@/core/legacyTypes';
import { REF } from './refs';

export const artifacts: HistoricalArtifact[] = [
  {
    id: 'art_takyeong',
    provenance: 'verified',
    name: '탁영금',
    hanja: '濯纓琴',
    made: { from: 1490, to: 1490, estimated: true },
    material: '나무',
    holder: '국립대구박물관',
    summary:
      '김일손이 쓰던 거문고. 보물 「김일손 거문고」(1988년 6월 16일 지정). 길이 160㎝, 너비 19㎝, 높이 10㎝. ' +
      '중앙부에 「濯纓琴」 세 글자가 음각되어 있고 학 그림이 있다. 용두와 운족은 원형 그대로다. ' +
      '제작 시기는 1490년경으로 추정된다.',
    relatedIds: ['per_kim_ilson', 'plc_daegu_museum'],
    sources: [REF.takyeongKhs, REF.takyeongEncy],
    authorNote:
      '제작 1490 은 추정(근거 명문 미제시). 학 그림 위치는 이견(머리/하단부) → 위치를 단정하지 않음. ' +
      "'濯纓琴' 각자의 생전/사후 여부 미확인 → 과거 장면에 탁영금을 두지 않는다. 뒷면 글씨 원문, 보수 내역은 쓰지 않음.",
  },
];
