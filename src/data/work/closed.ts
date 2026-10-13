/**
 * 종결된 보고서(콘텐츠). 이번 배정의 종결은 상태(closures)에서 만든다.
 *  - cr_c2217_prev: 1년 전 같은 좌표에 대한 내 보고서(가상). 소견은 승인 문구('졸' → '사망' 용어 결정 반영).
 *    근거 프레임은 '관측 오류 종결 건 보존 기간 만료로 폐기' — 프레임이 왜 중요한지, 왜 그때 실패했는지.
 *  - 예고: 복원 뒤 대조관 07 의 '관측 오류' 보고서가 더 보인다. 일시는 ####.
 * 해결 전 화면에 4자리 연도를 쓰지 않는다. 현대 날짜도 '1년 전'처럼 상대 표기.
 */
import type { ClosedReport } from '@/core/types';

const F = 'fictional' as const;

export const closedReports: ClosedReport[] = [
  {
    id: 'cr_c2217_prev',
    provenance: F,
    code: '#C-2217',
    when: '1년 전',
    officer: '대조관 07',
    verdict: '불일치',
    classification: '관측 오류 · 종결',
    note: '14시경 대문에서 전교 전달 확인. 해당 기사 없음. 같은 달 사망한 세 사람과의 연관을 조사 중. 다음 관측 때 확인 예정.',
    fields: [
      { label: '일시', value: '####' },
      { label: '근거 프레임', value: '1장 — 관측 오류 종결 건 보존 기간 만료로 폐기' },
    ],
    showWhen: { closed: ['as_c2217'] },
    order: 2,
  },
  {
    id: 'cr_c0408',
    provenance: F,
    code: '#C-0408',
    when: '2년 전',
    officer: '대조관 07',
    verdict: '불일치',
    classification: '관측 오류 · 종결',
    note: '',
    fields: [
      { label: '일시', value: '####' },
      { label: '근거 프레임', value: '보존 기간 만료로 폐기' },
    ],
    showWhen: { filed: ['rep_c2217'] },
    order: 3,
  },
  {
    id: 'cr_c3391',
    provenance: F,
    code: '#C-3391',
    when: '3년 전',
    officer: '대조관 07',
    verdict: '불일치',
    classification: '관측 오류 · 종결',
    note: '',
    fields: [
      { label: '일시', value: '####' },
      { label: '근거 프레임', value: '보존 기간 만료로 폐기' },
    ],
    showWhen: { filed: ['rep_c2217'] },
    order: 4,
  },
];
