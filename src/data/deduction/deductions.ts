/**
 * 에피소드 1 추리 세 개. 정답은 증거의 연대 제약·사실에서만 도출된다(UI 하드코딩 금지).
 *
 * 인물(쉬운 起): 실록청 당상 + 『세조실록』 편찬 참여 → 이극돈.
 * 연도(짧은 중간 퍼즐 — DB 에 졸년이 보이므로 봉우리가 아니다):
 *   C1 묘호 [1495,) ∩ C2 실록청 [1495,1499] ∩ C3 이극돈 당상 [1495,1498] ∩ C4 김일손 생존 (,1498] → 1495~1498(부분 확정).
 *   보드의 카드 겹치기로 만든 '사초와 세 죽음' [1498,) 을 더하면 → 1498(확정). 轉: 묘호를 듣고 성종 재위기로 답하면 C1 과 모순.
 * 인과(주 봉우리): 「같은 달 세 사람은 왜 죽었나?」 「조의제문」이 실린 사초 → 왕의 전교 → 같은 달의 죽음.
 *   화살표마다 증거로 뒷받침(core/deduction judgeCausal). 확정하면 손 노트에 '기록하기'가 열리고, 기록이 무오사화를 복원한다.
 * 잠금: 인물(f_met_official) → 연도(source_access) → 인과(ded_year_partial).
 */
import type { Deduction } from '@/core/types';
import { FACT } from '@/data/historical/facts';
import { REF } from '@/data/historical/refs';

export const YEAR_EVIDENCE = [
  'ev_myoho',
  'ev_sillokcheong',
  'ev_unknown_official',
  'ev_author_alive',
  'ev_jongjik_dead',
  'ev_jouijemun',
  'ev_lawbook',
  'ev_takyeong_record',
  'ev_same_month',
];

export const deductions: Deduction[] = [
  {
    id: 'ded_year_001',
    kind: 'year',
    provenance: 'verified',
    title: '관측 #001 — 언제인가',
    prompt: '이 관청의 장면은 몇 년의 일인가? 증거를 골라 시작·끝 연도를 제출하라.',
    target: { from: 1498, to: 1498 },
    maxPartialWidth: 5,
    relevantEvidence: YEAR_EVIDENCE,
    // 닌텐도식 램프: 연도는 구절 등록(원문 대조 권한)을 익힌 뒤에 열린다.
    requires: 'source_access',
    sources: [REF.sillokMyoho, REF.seongjongSillok, REF.yiGeukdon, REF.kimIlson, REF.sillokSachoOrder, REF.sillokVerdict],
    rewards: {
      partial: [
        { type: 'flag', flag: 'ded_year_partial' },
        {
          type: 'notebook',
          note: {
            id: 'note_year_partial',
            section: 'hypothesis',
            text: '관측 #001 은 앞선 왕의 실록을 엮던 몇 해 사이의 일이다. 한 해로 좁힐 결정적 단서가 더 필요하다.',
            provenance: 'fictional',
          },
        },
      ],
      confirmed: [
        { type: 'flag', flag: 'ded_year_confirmed' },
        { type: 'collection', entryId: 'col_evt_seongjong_sillok', stage: 3 },
        { type: 'collection', entryId: 'col_plc_chunchugwan', stage: 3 },
        { type: 'collection', entryId: 'col_src_myoho', stage: 4 },
        {
          type: 'notebook',
          note: {
            id: 'note_year_confirmed',
            section: 'verified',
            text: '관측 #001 은 1498년(음력)의 실록청이다. 『성종실록』 편찬 도중, 한 사초가 문제가 된 해.',
            refIds: ['ded_year_001'],
            provenance: 'verified',
          },
        },
        { type: 'resolveQuestion', noteId: 'q_when' },
      ],
    },
  },
  {
    id: 'ded_person_001',
    kind: 'person',
    provenance: 'verified',
    title: '미확인 관료 — 누구인가',
    prompt: '사초 검토를 지휘하던 붉은 관복의 당상은 누구인가?',
    subjectEvidenceId: 'ev_unknown_official',
    candidates: ['per_yi_geukdon', 'per_kim_ilson', 'per_yu_jagwang', 'per_eo_segyeom'],
    answer: 'per_yi_geukdon',
    requiredFacts: [FACT.officeSillokDangsang, FACT.eventSejoSillok],
    relevantEvidence: ['ev_unknown_official', 'ev_veteran', 'ev_takyeong_record'],
    requires: 'f_met_official',
    sources: [REF.yiGeukdon],
    rewards: {
      confirmed: [
        { type: 'flag', flag: 'ded_person_confirmed' },
        { type: 'evidence', evidenceId: 'ev_unknown_official', level: 1 },
        { type: 'collection', entryId: 'col_per_yi_geukdon', stage: 3 },
        { type: 'collection', entryId: 'col_per_eo_segyeom', stage: 2 },
        { type: 'collection', entryId: 'col_per_yu_jagwang', stage: 2 },
        {
          type: 'notebook',
          note: {
            id: 'note_person_confirmed',
            section: 'verified',
            text: '붉은 관복의 당상은 이극돈. 『세조실록』 편찬에 참여했고, 『성종실록』 실록청 당상으로 사초를 정리했다.',
            refIds: ['per_yi_geukdon'],
            provenance: 'verified',
          },
        },
        { type: 'resolveQuestion', noteId: 'q_who' },
      ],
    },
  },
  {
    id: 'ded_cause_001',
    kind: 'causal',
    provenance: 'verified',
    title: '같은 달, 세 사람 — 왜 죽었나',
    prompt: '사인 없는 세 죽음. 카드들을 화살표로 이어, 무엇이 무엇을 낳았는지 보여라. 화살표마다 근거 카드를 붙인다.',
    nodes: [
      { id: 'n_jouijemun', text: '한 사초에 실린 「조의제문」이 문제가 되었다' },
      { id: 'n_order', text: '왕이 그 사관의 사초를 모두 대내로 들이라 명했다' },
      { id: 'n_deaths', text: '같은 달, 사초의 주인과 두 사람이 사인 없이 죽었다' },
      { id: 'n_routine', text: '실록청이 평소처럼 사관들의 집에서 사초를 거두었다' },
      { id: 'n_plague', text: '그해 역병과 흉년이 돌았다' },
      { id: 'n_halted', text: '실록 편찬이 멈추었다' },
    ],
    chain: ['n_jouijemun', 'n_order', 'n_deaths'],
    links: [
      { from: 'n_jouijemun', to: 'n_order', requires: [FACT.claimJouijemunInSacho, FACT.claimOrderAllSacho] },
      { from: 'n_order', to: 'n_deaths', requires: [FACT.claimOrderThenDeaths] },
    ],
    wrongLinks: [
      {
        from: 'n_routine',
        to: 'n_deaths',
        message: '집에 둔 사초를 거두는 일은 실록을 엮을 때마다 있던 절차다. 그것만으로 사람이 죽지는 않는다.',
      },
      {
        from: 'n_routine',
        to: 'n_order',
        message: '거두는 일은 늘 있었다. 왕이 한 사람의 사초를 콕 집어 들이라 한 데에는 다른 까닭이 있다.',
      },
      {
        from: 'n_plague',
        to: 'n_deaths',
        message: '돌림병이라면 같은 사초 곁의 사람들만 같은 달에 골라 데려가지는 않는다. 이 화살표를 받칠 카드는 없다.',
      },
      {
        from: 'n_order',
        to: 'n_halted',
        message: '편찬은 멈추지 않았다. 완성되어 사고에 봉안된 기록이 있다.',
      },
      {
        from: 'n_halted',
        to: 'n_deaths',
        message: '편찬은 멈추지 않았다. 멈추지 않은 일이 죽음을 낳을 수는 없다.',
      },
      {
        from: 'n_jouijemun',
        to: 'n_deaths',
        message: '글 한 편이 곧장 사람을 죽이지는 않는다. 그 사이에 누군가의 명이 있었다.',
      },
    ],
    relevantEvidence: [
      'ev_jouijemun',
      'ev_royal_order',
      'ev_same_month',
      'ev_db_deaths',
      'ev_gajang',
      'ev_objection',
      'ev_six_articles',
      'ev_sillok_done',
      'ev_author_alive',
    ],
    // 인과(봉우리)는 연도를 한 번 넘긴 뒤(부분 확정 이상)에 열린다.
    requires: 'ded_year_partial',
    sources: [REF.sillokSachoOrder, REF.sillokVerdict, REF.jouijemun, REF.muoSahwa],
    rewards: {
      confirmed: [
        { type: 'flag', flag: 'ded_cause_confirmed' },
        {
          type: 'notebook',
          note: {
            id: 'note_cause_confirmed',
            section: 'hypothesis',
            text: '세 사람은 사초 때문에 죽었다. 「조의제문」이 실린 사초 → 왕의 전교 → 같은 달의 죽음. DB 에는 없다. 손으로 적어 둘 것.',
            provenance: 'fictional',
          },
        },
        { type: 'resolveQuestion', noteId: 'q_what' },
      ],
    },
  },
];
