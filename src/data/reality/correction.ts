/**
 * 새벽 6시 좌표 재계산(가상, 단 한 번의 스크립트 사건). DESIGN_V3 §7.
 *  - 관측기는 멀쩡하다. 소실이 진행되어, 관측기가 그 순간을 붙잡게 해 주던 간접 기록이 깎인다 → 하루의 일부가 흐려진다.
 *  - 트리거(v4): 근무 2 가 끝나는 06:00.
 *  - 흐려지는 구간은 그 구간의 핵심 단서를 이미 프레임으로 가진 경우에만(clue) → 실패 없음.
 *  - 프레임과 종결 보고서는 관측기에 저장되므로 소실의 영향을 받지 않는다(그대로).
 */
import type { CorrectionEvent } from '@/core/types';

export const corrections: CorrectionEvent[] = [
  {
    id: 'corr_dawn',
    provenance: 'fictional',
    clock: '06:00',
    trigger: { dutiesEnded: ['duty_2'] },
    degrade: [
      { from: 780, to: 900, clue: 'cl_veteran' },
      { from: 840, to: 960, clue: 'cl_order' },
      { from: 960, to: 1020, clue: 'cl_alive' },
    ],
    grants: { flags: ['report_open'] },
  },
];
