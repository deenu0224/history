/**
 * 규정집(가상, 실록청 기록대조과 업무 규정). 닌텐도식: 근무마다 새 규정 하나, 그 규정이 새 종류의 건을 만든다.
 *  근무 1: 1~3조(확인·정정·규정 외 도장) · 근무 2: 4조(정정에는 근거 프레임 — 셔터) · 근무 3: 5조(종결 건 재판정 금지).
 * '표기가 달라도 뜻이 같으면 확인'은 규정에 적지 않는다 — 함정 건의 경고장으로 배운다(해 보며 배우기).
 */
import type { RuleDef } from '@/core/types';

const F = 'fictional' as const;

export const rules: RuleDef[] = [
  {
    id: 'rule_1',
    provenance: F,
    no: 1,
    title: '확인',
    text: '기록 카드의 문장과 관측이 같으면 확인(초록) 도장을 찍는다. 대조는 보는 것이 먼저다 — 관측하지 않고 찍지 않는다.',
  },
  {
    id: 'rule_2',
    provenance: F,
    no: 2,
    title: '정정',
    text: '기록의 낱말이 관측과 다르면, 그 낱말과 관측의 낱말을 차례로 짚은 뒤 정정(파랑) 도장을 찍는다. 기록은 검증된 원문으로 복원된다.',
  },
  {
    id: 'rule_3',
    provenance: F,
    no: 3,
    title: '기록 없는 좌표',
    text: '대조할 기록이 없는 좌표 손상 건은 통합 역사 DB 관리단이 자동 종결한다. 대조관의 도장은 확인·정정 둘이다.',
    violation: '규정 3조 위반 — 규정 외 도장(불일치). 대조관의 도장은 확인·정정 둘뿐이다.',
  },
  {
    id: 'rule_4',
    provenance: F,
    no: 4,
    title: '근거 프레임',
    text: '정정 건에는 다른 말이 들린 순간을 담은 근거 프레임 1장을 붙인다. 관측 화면에 셔터를 둔다.',
    enables: ['capture', 'frame_for_correct'],
  },
  {
    id: 'rule_5',
    provenance: F,
    no: 5,
    title: '종결 건',
    text: '관측 오류로 자동 종결된 건은 재관측·재판정하지 않는다. 관측기 로그 재생과 재판정 요청은 경고 대상이다.',
    violation: '규정 5조 위반 — 자동 종결 건 재관측·재판정.',
    enables: ['no_reopen'],
  },
];
