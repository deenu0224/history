/**
 * 개인 기록관 전시물(옛 기록관 맵 오브젝트 arc_* 를 옮김) + 정합성 보정 사건 + 단말 메모.
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
    spriteKey: 'art_takyeong',
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
    id: 'ex_shelf_sources',
    provenance: V,
    sources: [REF.sillokSachoOrder, REF.sagwan],
    title: '사료 서가',
    slot: 'shelf',
    spriteKey: 'obj_lab_shelf',
    requires: { all: ['obs001_returned'] },
    lines: [
      '확인한 사료가 한 칸씩 꽂힌다.',
      '“임금이 만약 사초를 보면 후세에 직필(直筆)이 없기 때문입니다.”',
      '사초는 왕도 보지 않는다는 원칙. 그날, 그 원칙이 시험받았다.',
    ],
  },
  {
    id: 'ex_person_register',
    provenance: V,
    sources: [REF.yiGeukdon, REF.kimIlson, REF.muoSahwa],
    title: '인물 기록부',
    slot: 'register',
    spriteKey: 'obj_lab_desk',
    requires: { all: ['ded_person_confirmed'] },
    lines: [
      '이극돈 — 실록청 당상. 김일손 — 사초를 쓴 사관.',
      '김일손은 사초에 이극돈의 비행을 적었고, 두 사람은 사이가 벌어져 있었다.',
      '기록하는 사람과 기록되는 사람이 한 관청 안에서 마주쳤다.',
    ],
    grants: {
      collect: [
        { entryId: 'col_per_yi_geukdon', stage: 5 },
        { entryId: 'col_per_kim_ilson', stage: 4 },
        { entryId: 'col_art_takyeong', stage: 4 },
        { entryId: 'col_per_kim_jongjik', stage: 3 },
        { entryId: 'col_per_eo_segyeom', stage: 3 },
        { entryId: 'col_per_yu_jagwang', stage: 3 },
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
    spriteKey: 'obj_lab_shelf',
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
    sources: [REF.muoSahwa, REF.sillokSachoOrder, REF.sillokVerdict, REF.seongjongSillok],
    title: '중앙 진열대 — 관측 #001',
    slot: 'center',
    spriteKey: 'obj_display_case',
    requires: { all: ['ded_event_confirmed'] },
    lines: [
      '관측 #001 기록이 중앙에 놓인다.',
      '7월 11일, 사초를 대내로 들이라는 전교. 이튿날부터 신문.',
      '7월 26일 처분. 김일손 능지처사. 스승 김종직 부관참시.',
      '실록 편찬은 멈추지 않았다. 이듬해 『성종실록』이 완성되었다.',
    ],
    grants: {
      collect: [
        { entryId: 'col_evt_muo_sahwa', stage: 5 },
        { entryId: 'col_src_sacho_order', stage: 5 },
        { entryId: 'col_per_kim_ilson', stage: 5 },
        { entryId: 'col_art_takyeong', stage: 5 },
        { entryId: 'col_src_verdict', stage: 3 },
        { entryId: 'col_src_house_search', stage: 3 },
      ],
      flags: ['archive_center_seen'],
      notebook: [
        {
          id: 'q_next',
          section: 'question',
          text: '같은 "매끄러움"이 다른 시대의 사관 주변에서도 감지된다. 무엇이 이어져 있는가?',
          provenance: F,
        },
      ],
    },
    collectionIds: ['col_evt_muo_sahwa', 'col_src_sacho_order', 'col_src_verdict', 'col_src_house_search'],
  },
  // ── 선택 전시물(호기심 보상) ─────────────────────────────
  {
    id: 'ex_red_desk',
    provenance: R,
    sources: [REF.yiGeukdon],
    title: '작은 액자 — 같은 장을 넘긴 자국',
    slot: 'shelf',
    spriteKey: 'obj_desk_writing',
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
    spriteKey: 'obj_books_stack',
    requires: { searched: ['se_daehaengwang'] },
    lines: [
      '묘호를 정하기 전, 세상을 떠난 왕은 ‘대행왕’이라 불렸다.',
      '‘성종’이라는 이름은 그 뒤에야 생겼다.',
    ],
    grants: { collect: [{ entryId: 'col_src_daehaengwang', stage: 4 }] },
    collectionIds: ['col_src_daehaengwang'],
  },
];

/** 단말 메모(동기화). 손 노트(PlayerNotebook)와 나란히 보이며, 이쪽만 보정된다. */
export const memos: TerminalMemo[] = [
  {
    id: 'memo_anomaly',
    provenance: F,
    title: '메모 — 김일손 관련 기록',
    text: '교차 참조 밀도 0.998(상위 0.1%). 오류 0건. 너무 고르다. 다시 볼 것.',
    when: { all: ['prologue_anomaly'] },
  },
  {
    id: 'memo_obs001',
    provenance: F,
    title: '메모 — 관측 #001',
    text: '관측 #001 종료. 연도 미상. 들은 말을 사료와 대조할 것.',
    when: { all: ['obs001_returned'] },
  },
];

/**
 * 정합성 보정 #001 (가상, 복선). 관측에서 돌아와 처음 추리를 시도한 밤(또는 검색을 충분히 한 뒤), 단말이 조용히
 * 메타데이터와 단말 메모를 고친다. 손 노트는 오프라인이라 그대로다. 흑막·원리는 말하지 않는다.
 */
export const corrections: CorrectionEvent[] = [
  {
    id: 'corr_001',
    provenance: F,
    trigger: {
      all: ['obs001_returned'],
      any: [{ minStats: { deductionAttempts: 1 } }, { minStats: { searches: 8 } }],
    },
    recordPatches: [{ recordId: 'rec_meta_kim_ilson', key: 'xref', value: '0.712 (정상 범위)' }],
    memoPatches: [{ memoId: 'memo_anomaly', text: '교차 참조 밀도 0.712(정상 범위). 특이사항 없음.' }],
    grants: {
      flags: ['corr_001_done'],
      notebook: [
        {
          id: 'q_correction',
          section: 'question',
          text: '단말 메모의 숫자가 바뀌었다(0.998 → 0.712). 손으로 적은 이 노트에는 그대로다. 무엇이 고쳤나?',
          provenance: F,
        },
      ],
    },
  },
];
