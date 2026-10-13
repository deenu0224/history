/**
 * 에피소드 1 추리 세 개. 정답은 증거의 연대 제약·사실에서만 도출된다(UI 하드코딩 금지).
 *
 * 연도: C1 묘호 [1495,) ∩ C2 실록청 [1495,1499] ∩ C3 이극돈 당상 [1495,1498] ∩ C4 김일손 생존 (,1498]
 *       → 1495~1498 (부분 확정). C6 「조의제문」 문제 [1498,) 를 더하면 → 1498 (확정).
 *       함정: 묘호 '성종'을 듣고 성종 재위기(1469~1494)로 답하면 C1 과 모순.
 * 인물: 실록청 당상 + 『세조실록』 편찬 참여 → 이극돈.
 * 사건: 왕의 사초 반입 명 + 6조목을 뽑아 봉함 → 사초 문제(무오사화의 발단).
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
    requires: 'obs001_entered',
    sources: [REF.sillokMyoho, REF.seongjongSillok, REF.yiGeukdon, REF.sillokVerdict, REF.sillokSachoOrder],
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
    id: 'ded_event_001',
    kind: 'event',
    provenance: 'verified',
    title: '관측 #001 — 무슨 일이 벌어지는가',
    prompt: '관청에서 지금 벌어지는 일을 가장 잘 설명하는 진술은?',
    eventId: 'evt_muo_sahwa',
    statements: [
      {
        id: 'st_routine',
        text: '평소처럼 거둔 사초로 선왕의 실록을 엮고 있을 뿐이다.',
        refutedBy: [FACT.claimOrderAllSacho, FACT.claimSachoCustom],
      },
      {
        id: 'st_crisis',
        text: '한 사관의 사초에 실린 글이 문제가 되어, 왕이 그 사초를 직접 보려 한다.',
      },
      {
        id: 'st_custom',
        text: '왕이 사초를 들여다보는 것은 늘 있던 일이다.',
        refutedBy: [FACT.claimSachoCustom],
      },
      {
        id: 'st_blocked',
        text: '당상들의 반대로 사초는 한 장도 왕에게 들어가지 않았다.',
        refutedBy: [FACT.claimSixArticles],
      },
      {
        id: 'st_halted',
        text: '이 일로 실록 편찬은 끝내 중단되었다.',
        refutedBy: [FACT.claimSillokCompleted],
      },
    ],
    answer: 'st_crisis',
    requiredFacts: [FACT.claimOrderAllSacho, FACT.claimSixArticles],
    relevantEvidence: ['ev_royal_order', 'ev_objection', 'ev_six_articles', 'ev_gajang', 'ev_sillok_done', 'ev_jouijemun'],
    requires: 'f_saw_order',
    sources: [REF.sillokSachoOrder, REF.seongjongSillok],
    rewards: {
      confirmed: [
        { type: 'flag', flag: 'ded_event_confirmed' },
        { type: 'collection', entryId: 'col_evt_muo_sahwa', stage: 4 },
        { type: 'collection', entryId: 'col_src_sacho_order', stage: 4 },
        { type: 'collection', entryId: 'col_src_house_search', stage: 2 },
        { type: 'collection', entryId: 'col_src_verdict', stage: 2 },
        {
          type: 'notebook',
          note: {
            id: 'note_event_confirmed',
            section: 'verified',
            text:
              '관측한 날은 왕이 김일손의 사초를 대내로 들이라 명한 날(음력 7월 11일)이다. 이튿날부터 신문이 시작되었고, ' +
              '그달 김일손은 처형되었다. 무오사화.',
            refIds: ['evt_muo_sahwa', 'src_sacho_order'],
            provenance: 'verified',
          },
        },
        { type: 'resolveQuestion', noteId: 'q_what' },
      ],
    },
  },
];
