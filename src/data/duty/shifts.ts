/**
 * 근무 3개(밤 셋, 합계 25~35분). 설계: docs/DESIGN_V4.md §2 비트표·§4 사례표, 근무 1 은 docs/NARRATIVE_SHIFT1.md(승인).
 *  - 시간은 행동이 쓴다(실시간 압박 없음): 건 하나 = minutes, 종결 건 재생 한 구간 = 60분.
 *  - 근무 2: 길이 420분, 기록 건 5 × 65분 = 325분 → 재생 1회까지는 목표 달성, 2회부터 한 건이 들어가지 않는다(선택의 값).
 *  - 근무 3 은 불일치 보고서가 들어가야 끝난다(실패 없음 — 자동 종결을 골라도 양식은 남는다).
 * 근무 보고의 오 실장 한 줄은 조건이 맞는 첫 줄(정답·연도 없음).
 */
import type { WorkShift } from '@/core/types';

const F = 'fictional' as const;

export const workShifts: WorkShift[] = [
  {
    id: 'duty_1',
    provenance: F,
    no: 1,
    title: '첫 번째 밤',
    startClock: 23 * 60 + 4,
    length: 420,
    goal: 5,
    queue: ['case_a0412', 'case_a0419', 'case_a0423', 'case_a0431', 'case_c2217'],
    newRules: ['rule_1', 'rule_2', 'rule_3'],
    briefing: ['근무 명세 · 대조관 07 · 처리 목표 5건', '확인: 기록 문장 = 관측.', '정정: 기록의 낱말이 관측과 다르다 → 다른 낱말을 짚고 정정.'],
    reportLines: [
      { when: { all: ['closed_mismatch'] }, text: '첫날부터 서랍을 열었네. …내일 보자.' },
      { when: { counters: [{ key: 'warnings:duty_1', min: 1 }] }, text: '경고는 내일 안 따라가. 내일 보자.' },
      { text: '깔끔하네. 내일 보자.' },
    ],
  },
  {
    id: 'duty_2',
    provenance: F,
    no: 2,
    title: '두 번째 밤',
    startClock: 23 * 60,
    length: 420,
    goal: 5,
    queue: ['case_a0501', 'case_a0502', 'case_a0503', 'case_a0504', 'case_a0505'],
    newRules: ['rule_4'],
    briefing: ['근무 명세 · 대조관 07 · 처리 목표 5건 · 06:00 종료', '규정 4조 신설: 정정 건에는 근거 프레임 1장.'],
    reportLines: [
      {
        when: { counters: [{ key: 'goal:duty_2', max: 0 }, { key: 'replays:duty_2', min: 1 }] },
        text: '목표 미달. …07, 로그에 종결 건 재생이 찍혀 있더라. 뭐 봤어?',
      },
      { when: { counters: [{ key: 'replays:duty_2', min: 1 }] }, text: '다섯 건 다 했네. …로그에 재생이 찍혔던데. 뭐 봤어?' },
      { when: { counters: [{ key: 'goal:duty_2', max: 0 }] }, text: '목표 미달. 내일은 속도 내.' },
      { text: '깔끔하네. 새 규정도 금방 익혔고.' },
    ],
    outro: ['06:00. 좌표 재계산.'],
  },
  {
    id: 'duty_3',
    provenance: F,
    no: 3,
    title: '세 번째 밤',
    startClock: 23 * 60,
    length: 420,
    goal: 5,
    queue: ['case_c4410', 'case_a0601', 'case_c0951', 'case_a0602', 'case_c2217_re'],
    newRules: ['rule_5'],
    briefing: ['근무 명세 · 대조관 07 · 처리 목표 5건', '규정 5조 신설: 자동 종결 건은 재관측·재판정하지 않는다.'],
    endWhen: { filed: ['rep_c2217'] },
    endBlockedText: '아직 끝나지 않았다. 업무에 불일치 보고서 양식이 열려 있다.',
    reportLines: [
      { when: { filed: ['rep_c2217'] }, text: '위원회 건이라 경고는 빠졌어. …다음엔 미리 말해.' },
      { text: '수고했어.' },
    ],
  },
];
