/**
 * 개인 기록관 전시물(손 노트의 '기록관' 탭) + 정합성 보정(말소) 사건 + 단말 메모.
 * 복원 전시물(restoredBy)에는 기록관에서만 '복원' 도장이 찍힌다. 단말 어디에도 복원 표식은 없다.
 */
import type { ArchiveExhibit, CorrectionEvent, TerminalMemo } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const R = 'reconstructed' as const;
const V = 'verified' as const;

export const exhibits: ArchiveExhibit[] = [
  {
    id: 'ex_takyeong',
    provenance: V,
    sources: [REF.takyeongKhs, REF.takyeongEncy],
    title: '첫 번째 진열장 — 탁영금',
    slot: 'case',
    spriteKey: 'exhibit_takyeong',
    requires: { all: ['obs001_returned'] },
    lines: [
      '픽셀로 다시 그린 탁영금이 놓였다. 길이와 너비의 비, 160 대 19.',
      "중앙의 '濯纓琴' 세 글자와 학 그림, 원형 그대로인 용두와 운족.",
      '암호도, 장치도 없다. 한 사관이 아끼던 악기일 뿐이다.',
    ],
    grants: {
      collect: [
        { entryId: 'col_art_takyeong', stage: 3 },
        { entryId: 'col_plc_daegu_museum', stage: 3 },
      ],
    },
    collectionIds: ['col_art_takyeong', 'col_plc_daegu_museum'],
  },
  {
    // 첫 복원 전시물
    id: 'ex_shelf_sources',
    provenance: V,
    sources: [REF.sillokSachoOrder, REF.sillokHouseSearch],
    title: '사료 서가 — 7월 11일·12일',
    slot: 'shelf',
    spriteKey: 'exhibit_source_shelf',
    requires: { all: ['restored_order'] },
    restoredBy: 'shift_order',
    lines: [
      '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.”',
      '“예로부터 사초(史草)는 임금이 스스로 보지 않습니다.”',
      '이튿날, 그의 집에서 문서를 수색했다.',
    ],
  },
  {
    id: 'ex_person_register',
    provenance: V,
    sources: [REF.yiGeukdon, REF.kimIlson],
    title: '인물 기록부',
    slot: 'register',
    spriteKey: 'exhibit_person_register',
    requires: { all: ['ded_person_confirmed'] },
    lines: [
      '이극돈 — 실록청 당상. 『세조실록』 편수에도 참여했다.',
      '김일손 — 사초를 쓴 사관. 김종직의 문인.',
      '기록하는 사람과, 기록을 엮는 사람이 한 관청 안에 있었다.',
    ],
    grants: {
      collect: [
        { entryId: 'col_per_yi_geukdon', stage: 3 },
        { entryId: 'col_per_kim_ilson', stage: 3 },
        { entryId: 'col_art_takyeong', stage: 4 },
        { entryId: 'col_per_kim_jongjik', stage: 3 },
        { entryId: 'col_per_eo_segyeom', stage: 2 },
        { entryId: 'col_per_yu_jagwang', stage: 2 },
      ],
    },
    collectionIds: ['col_per_yi_geukdon', 'col_per_kim_ilson', 'col_per_kim_jongjik', 'col_per_eo_segyeom', 'col_per_yu_jagwang'],
  },
  {
    id: 'ex_timeline',
    provenance: V,
    sources: [REF.sillokSeongjongDeath, REF.sillokMyoho, REF.sillokCompileOrder, REF.seongjongSillok],
    title: '연대표',
    slot: 'timeline',
    spriteKey: 'exhibit_timeline',
    requires: { all: ['ded_year_confirmed'] },
    lines: [
      '1494년(음력 12월 24일) 성종 승하.',
      '1495년 1월 묘호 ‘성’ 결정. 4월 실록청 설치.',
      '1498년 7월 ― 관측 #001.',
      '1499년 3월 『성종실록』 완성.',
    ],
    grants: {
      collect: [
        { entryId: 'col_evt_seongjong_sillok', stage: 5 },
        { entryId: 'col_src_myoho', stage: 5 },
        { entryId: 'col_plc_chunchugwan', stage: 4 },
        { entryId: 'col_src_seongjong_death', stage: 3 },
        { entryId: 'col_src_compile_order', stage: 4 },
      ],
    },
    collectionIds: ['col_evt_seongjong_sillok', 'col_src_myoho', 'col_src_seongjong_death', 'col_src_compile_order'],
  },
  {
    id: 'ex_center',
    provenance: V,
    sources: [REF.muoSahwa, REF.sillokSachoOrder, REF.sillokVerdict, REF.sillokProclaim, REF.seongjongSillok],
    title: '중앙 진열대 — 관측 #001',
    slot: 'center',
    spriteKey: 'exhibit_center_record',
    requires: { all: ['restored_event'] },
    restoredBy: 'shift_cause',
    lines: [
      '관측 #001 기록이 중앙에 놓인다.',
      '7월 11일, 사초를 대내로 들이라는 전교. 이튿날 그의 집을 수색.',
      '7월 26일, “김일손·권오복·권경유는 대역의 죄에 해당하니 능지 처사하고.” 이튿날 종묘 사직에 고유. 김종직 부관참시.',
      '실록 편찬은 멈추지 않았다. 이듬해 『성종실록』이 완성되었다.',
    ],
    grants: {
      collect: [
        { entryId: 'col_evt_muo_sahwa', stage: 5 },
        { entryId: 'col_src_sacho_order', stage: 5 },
        { entryId: 'col_per_kim_ilson', stage: 5 },
        { entryId: 'col_art_takyeong', stage: 5 },
        { entryId: 'col_per_yi_geukdon', stage: 5 },
        { entryId: 'col_per_kim_jongjik', stage: 4 },
        { entryId: 'col_per_yu_jagwang', stage: 3 },
        { entryId: 'col_src_verdict', stage: 3 },
        { entryId: 'col_src_house_search', stage: 3 },
      ],
      flags: ['archive_center_seen'],
      notebook: [
        {
          id: 'q_next',
          section: 'question',
          text: '다른 시대, 다른 사관의 기록에서도 원인 없는 결과가 보인다. 무엇이 이어져 있는가?',
          provenance: F,
        },
      ],
    },
    collectionIds: ['col_evt_muo_sahwa', 'col_src_sacho_order', 'col_src_verdict', 'col_src_house_search'],
  },
  {
    id: 'ex_register_restored',
    provenance: V,
    sources: [REF.muoSahwa, REF.yiGeukdon],
    title: '인물 기록부 — 고치지 않은 한 줄',
    slot: 'register',
    spriteKey: 'exhibit_person_register',
    requires: { all: ['restored_person'] },
    restoredBy: 'shift_person',
    lines: [
      '이극돈의 칸에 한 줄이 더해진다.',
      '수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면.',
    ],
    collectionIds: ['col_per_yi_geukdon', 'col_per_eo_segyeom'],
  },
  // ── 선택 전시물(호기심 보상) ─────────────────────────────
  {
    id: 'ex_red_desk',
    provenance: R,
    sources: [REF.yiGeukdon],
    title: '작은 액자 — 같은 장을 넘긴 자국',
    slot: 'shelf',
    spriteKey: 'exhibit_red_desk',
    requires: { all: ['f_saw_red_desk'] },
    lines: [
      '당상이 자리를 비운 짧은 틈에 본 서안.',
      '같은 장을 몇 번이고 넘긴 자국. 그가 무엇을 찾고 있었는지는, 기록이 말해 준다.',
    ],
  },
  {
    id: 'ex_daehaengwang',
    provenance: V,
    sources: [REF.sillokDaehaengwang, REF.sillokMyoho],
    title: '작은 서첩 — 이름 없는 왕',
    slot: 'shelf',
    spriteKey: 'exhibit_daehaengwang',
    requires: { searched: ['se_daehaengwang'] },
    lines: [
      '묘호를 정하기 전, 세상을 떠난 왕은 ‘대행왕’이라 불렸다.',
      '‘성종’이라는 이름은 그 뒤에야 생겼다.',
    ],
    grants: { collect: [{ entryId: 'col_src_daehaengwang', stage: 4 }] },
    collectionIds: ['col_src_daehaengwang'],
  },
];

/** 단말 메모(동기화). 손 노트(PlayerNotebook)와 나란히 보이며, 이쪽만 보정(말소)된다. */
export const memos: TerminalMemo[] = [
  {
    id: 'memo_anomaly',
    provenance: F,
    title: '메모 — 김일손 관련 기록',
    text: '김일손 1498년 7월 졸, 사인 기록 없음. 같은 달 권오복·권경유. 오류 0건. 다시 볼 것.',
    when: { all: ['prologue_anomaly'] },
  },
  {
    id: 'memo_order',
    provenance: F,
    title: '메모 — 관측 #001',
    text: '관측 #001: 왕이 한 사관의 사초를 모두 대내로 들이라 명함. 실록 검색: 해당 기사 없음.',
    when: { searched: ['se_sacho_order'], all: ['f_saw_order'] },
  },
];

/**
 * 정합성 보정 #001 (가상, 말소의 거울). 관측 뒤 그 전교 이야기를 동료와 나눈 밤, 단말이 조용히 '본 것'에 관한
 * 단말 메모를 지운다. 동료는 그 대화를 기억하지 못한다. 손 노트는 오프라인이라 그대로다. 흑막·원리는 말하지 않는다.
 * 연출 톤: erase(차갑게, 무음, 명도 한 칸).
 */
export const corrections: CorrectionEvent[] = [
  {
    id: 'corr_001',
    provenance: F,
    trigger: {
      all: ['obs001_returned', 'talked_order'],
      // 보통은 귀환 뒤 첫 판정을 낸 밤. 막힘 방지: 검색을 충분히 한 뒤.
      any: [{ minStats: { deductionAttempts: 1 } }, { minStats: { searches: 14 } }],
    },
    recordPatches: [],
    memoPatches: [{ memoId: 'memo_order', remove: true }],
    grants: {
      flags: ['corr_001_done'],
      notebook: [
        {
          id: 'q_correction',
          section: 'question',
          text: '전교를 들었다는 단말 메모가 사라졌다. 선임은 어제 대화를 기억하지 못한다. 이 노트에는 그대로다. 무엇이 지웠나?',
          provenance: F,
        },
      ],
    },
  },
];
