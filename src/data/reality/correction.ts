/**
 * 새벽 정합성 보정(가상). DESIGN_V3 §7.
 *  - 트리거: 1년 전 내 보고서를 열었고, (핵심 단서 셋을 프레임으로 확보 또는 hl_frames 힌트를 끝까지 받음).
 *  - 훼손 구간은 그 구간의 핵심 단서를 이미 프레임으로 가진 경우에만(clue) → 실패 없음.
 *  - 이번 건 종결의 판정 표시가 [일치(노이즈)]로 바뀌고 내 소견이 지워진다. 프레임은 남는다(날것의 증언).
 */
import type { CorrectionEvent } from '@/core/types';

export const corrections: CorrectionEvent[] = [
  {
    id: 'corr_dawn',
    provenance: 'fictional',
    clock: '06:00',
    trigger: {
      opened: ['cr_c2217_prev'],
      any: [{ clues: ['cl_order', 'cl_veteran', 'cl_alive'] }, { hintsDone: ['hl_frames'] }],
    },
    degrade: [
      { from: 780, to: 900, clue: 'cl_veteran' },
      { from: 840, to: 960, clue: 'cl_order' },
      { from: 960, to: 1020, clue: 'cl_alive' },
    ],
    closure: { assignmentId: 'as_c2217', verdictShown: 'match', clearNote: true },
    grants: { flags: ['report_open'] },
  },
];
