/**
 * 불일치 보고서(4칸) — 좌표 #C-2217. 칸마다 첨부 1~2개(프레임 또는 DB 기록). 판정은 core/report.ts.
 *  - 정답은 여기(데이터)에만. 피드백 문구에는 정답 연도·인물 이름·사건 이름을 쓰지 않는다(테스트).
 *  - 근무 3 에 열린다(위원회 직송 — 규정 5조 위반 경고장이 나오지만 복원되면 '해당 없음'). 네 칸이 모두 확인되면 도장 → shift_c2217.
 */
import type { ReportSpec } from '@/core/types';
import { FACT } from '@/data/historical/facts';
import { REF } from '@/data/historical/refs';

export const reports: ReportSpec[] = [
  {
    id: 'rep_c2217',
    provenance: 'verified',
    sources: [REF.sillokSachoOrder, REF.sillokVerdict, REF.yiGeukdon, REF.kimIlson, REF.seongjongSillok],
    assignmentId: 'as_c2217',
    title: '불일치 보고서 — 좌표 #C-2217',
    maxAttachments: 2,
    unlockWhen: { duties: ['duty_3'] },
    restores: 'shift_c2217',
    when: {
      label: '언제',
      prompt: '이 좌표는 몇 년의 일인가. 근거를 붙이고 시작·끝 해를 적는다.',
      target: { from: 1498, to: 1498 },
      maxPartialWidth: 5,
      emptyText: '이 칸에는 아직 근거가 없다. 프레임이나 기록을 붙이자.',
      noYearText: '해를 적지 않았다. 붙인 자료가 가리키는 해를 적자.',
      messages: {
        excludes_truth: '적은 해가 이 장면과 맞지 않는다. 붙인 자료를 다시 보자.',
        unjustified_lower: '붙인 자료가 그 해까지는 말해 주지 않는다. 시작을 받칠 근거가 없다.',
        unjustified_upper: '붙인 자료가 그 해까지는 말해 주지 않는다. 끝을 받칠 근거가 없다.',
        too_broad: '근거는 맞지만 범위가 너무 넓다.',
        needs_decisive: '범위는 맞다. 한 해로 묶을 근거가 더 필요하다.',
      },
      tips: [
        { has: ['cl_alive'], lacks: ['cl_rec_deaths'], message: '그날 누가 살아 있었는지는 보이지만, 그가 언제 사망했는지 붙인 자료가 없다.' },
        { has: ['cl_rec_deaths'], lacks: ['cl_alive'], message: '사망 기록만으로는 이 장면이 그 전인지 몇 해 전인지 알 수 없다.' },
        { has: ['cl_sillokcheong'], lacks: ['cl_when_pinned'], message: '범위는 맞다. 한 해로 묶을 근거가 더 필요하다.' },
      ],
    },
    who: {
      label: '누구',
      prompt: '그 자리에서 사초를 문제 삼은 당상은 누구인가. 인물 기록 하나와 그를 보여 주는 프레임을 붙인다.',
      candidates: ['per_yi_geukdon', 'per_eo_segyeom', 'per_kim_ilson'],
      answer: 'per_yi_geukdon',
      requiredFacts: [FACT.officeSillokDangsang, FACT.eventSejoSillok],
      noPersonText: '누구인지 가리키는 인물 기록을 붙이자.',
      twoPersonsText: '한 칸에는 한 사람만.',
      tips: [
        { has: ['cl_dangsang'], lacks: ['cl_veteran'], message: '그가 당상이라는 것은 보인다. 그가 예전에 무엇을 맡았는지는 아직 이 칸에 없다.' },
      ],
    },
    what: {
      label: '무슨 일',
      prompt: '그날 무슨 일이 있었나. 그 순간을 담은 프레임을 붙인다.',
      requires: [FACT.claimOrderAllSacho],
      missingText: ['그 일을 시작한 순간이 이 칸에 없다.'],
      wrong: [
        {
          fact: FACT.claimGajangCollected,
          message: '집에 둔 사초를 거두는 일은 실록을 엮을 때마다 있던 절차다. 그날만의 일이 아니다.',
        },
      ],
      near: [
        { fact: FACT.claimSachoCustom, message: '그 반대는 무엇에 대한 것이었나?' },
        { fact: FACT.claimSixArticles, message: '봉해 올린 것은 무엇 때문이었나?' },
        { fact: FACT.claimJouijemunInSacho, message: '글 한 편이 문제가 되었다. 그래서 누가 무엇을 명했나?' },
      ],
      emptyText: '이 칸에는 아직 근거가 없다. 그 순간의 프레임을 붙이자.',
    },
    result: {
      label: '그 결과',
      prompt: '그 일 뒤에 무엇이 남았나. 그날의 일과 그 뒤의 기록을 함께 붙인다.',
      requires: [FACT.claimOrderAllSacho, FACT.claimSameMonthDeaths],
      missingText: [
        '결과로 보이는 기록이다. 그런데 이 죽음이 그날의 일과 이어진다는 근거가 같이 없다.',
        '그날의 일은 보인다. 그 뒤에 무엇이 남았는지 보여 줄 기록이 없다.',
      ],
      wrong: [{ fact: FACT.claimSillokCompleted, message: '편찬은 멈추지 않고 끝났다. 그날이 낳은 일이 아니다.' }],
      near: [{ fact: FACT.claimDismissedNoReason, message: '그것도 그날 뒤에 남은 흔적이다. 그러나 가장 큰 공백은 따로 있다.' }],
      emptyText: '이 칸에는 아직 근거가 없다.',
    },
  },
];
