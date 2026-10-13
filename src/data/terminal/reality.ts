/**
 * 현실 이동(복원) · 기록하기 · 카드 겹치기 — 가상 설정(fictional). 역사 사실 자체는 복원되는 verified 사료·사건뿐이다.
 *
 * 흐름: 추리 확정 → 손 노트에 '기록하기'(RecordAct: 검증된 문장을 따라 쓴다) → RealityShift 적용.
 *   세계는 '원래부터' 그것을 알고 있었던 것이 된다: 지난 메시지가 다시 쓰이고, DB 레코드에 원인이 생기고,
 *   '해당 기사 없음'이 평범한 결과가 된다. 단말에는 이전 상태의 표식이 없다. 이전/이후는 손 노트(notebookDiff)와
 *   기록관(복원 도장)에만 남는다. 동료는 고마워하지 않는다 — "그걸 모르는 사람이 어디 있어."
 *
 * 복원되는 기사(6): 『연산군일기』 7월 11일(사초 반입)·12일(집 수색)·26일(처분)·27일(고유·부관참시) 4건,
 *   「무오사화」 사건 항목, 이극돈 등 수사관의 파면(백과사전 「무오사화」). 모두 docs/HISTORICAL_SOURCES.md 확정 사항.
 */
import type { EvidenceLink, RealityShift, RecordAct } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const V = 'verified' as const;

// ── 카드 겹치기(증거 보드) ────────────────────────────────────
export const links: EvidenceLink[] = [
  {
    id: 'lnk_same_month',
    provenance: F,
    inputs: ['ev_royal_order', 'ev_db_deaths'],
    result: { id: 'ev_same_month' },
    requires: { evidence: ['ev_author_alive'] },
    missText: '이어질 듯하다. 그런데 그 사초의 주인이 그날 살아 있었는지, 아직 들은 적이 없다.',
    text: '전교와 같은 달의 졸년이 겹쳤다. 사초를 거둔 날과 세 죽음이 한 해에 묶인다.',
    grants: {
      notebook: [
        {
          id: 'note_link_same_month',
          section: 'hypothesis',
          text: '그날 그는 살아 있었다. 그리고 같은 달에 죽었다. 사초를 거둔 일과 세 죽음은 떨어져 있지 않다.',
          provenance: F,
        },
      ],
    },
  },
];

// ── 기록하기(사관의 직필) ─────────────────────────────────────
export const acts: RecordAct[] = [
  {
    id: 'act_order',
    provenance: V,
    sources: [REF.sillokSachoOrder],
    order: 1,
    title: '그날의 전교',
    requires: { all: ['ded_year_confirmed'] },
    sentence: '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.”',
    restores: 'shift_order',
  },
  {
    id: 'act_person',
    provenance: V,
    sources: [REF.muoSahwa],
    order: 2,
    title: '보고도 고하지 않은 죄',
    requires: { all: ['ded_person_confirmed', 'restored_order'] },
    sentence:
      '어세겸·이극돈·유순(柳珣)·윤효손(尹孝孫)·김전(金銓) 등은 수사관(修史官)으로서 문제의 사초를 보고도 고하지 않은 죄로 파면되었다.',
    restores: 'shift_person',
  },
  {
    id: 'act_cause',
    provenance: V,
    sources: [REF.sillokVerdict],
    order: 3,
    title: '같은 달의 처분',
    requires: { all: ['ded_cause_confirmed', 'restored_order'] },
    sentence: '김일손(金馹孫)·권오복(權五福)·권경유(權景𥙿)는 대역(大逆)의 죄에 해당하니 능지 처사(凌遲處死)하고',
    restores: 'shift_cause',
  },
];

// ── 현실 이동 ─────────────────────────────────────────────────
export const shifts: RealityShift[] = [
  {
    id: 'shift_order',
    provenance: F,
    order: 1,
    title: '사초를 들이라 — 7월 11일·12일 기사',
    when: { recorded: ['act_order'] },
    restores: [
      { kind: 'source', id: 'src_sacho_order' },
      { kind: 'source', id: 'src_house_search' },
    ],
    searchRewrites: [{ entryId: 'se_sacho_order', results: [{ kind: 'source', id: 'src_sacho_order' }, { kind: 'source', id: 'src_house_search' }] }],
    messageRewrites: [
      {
        messageId: 'm_c_06a',
        newText: '그 전교를 봤다고? 실록에 그대로 있는 기사잖아. …정리는 보드에 해 둬. 누가 누군지부터.',
      },
      {
        messageId: 'm_c_07',
        newText: '어제 그 전교 얘기 했던가? 실록청 사람이면 다 아는 걸 밤새 붙들고 있더라. 피곤했나 봐.',
      },
    ],
    recordRewrites: [
      {
        recordId: 'rec_alt_kim_ilson',
        fields: [{ key: 'sacho', label: '사초', value: '1498년 음력 7월 11일, 왕명으로 모두 대내에 들임' }],
      },
    ],
    unlocks: {
      flags: ['restored_order'],
      sources: ['src_sacho_order', 'src_house_search'],
      collect: [
        { entryId: 'col_src_sacho_order', stage: 3 },
        { entryId: 'col_src_house_search', stage: 2 },
        { entryId: 'col_evt_muo_sahwa', stage: 1 },
      ],
    },
    notebookDiff: [
      {
        id: 'nd_order_search',
        before: '들은 전교를 검색 → 해당 기사 없음.',
        after: '『연산군일기』 7월 11일 — “김일손의 사초를 모두 대내로 들여오라.” 원래부터 있던 기사라고 한다.',
        provenance: V,
      },
      {
        id: 'nd_order_colleague',
        before: '선임: “실록에 없는 걸 봤다고? 그건 관측이 아니라 상상이야.”',
        after: '선임: “실록에 그대로 있는 기사잖아.” — 그렇게 말한 적이 없다. 나는 기억한다.',
        provenance: F,
      },
    ],
  },
  {
    id: 'shift_person',
    provenance: F,
    order: 2,
    title: '수사관의 파면',
    when: { recorded: ['act_person'] },
    restores: [{ kind: 'record', id: 'rec_alt_yi_geukdon' }],
    messageRewrites: [],
    recordRewrites: [
      {
        recordId: 'rec_alt_yi_geukdon',
        provenance: V,
        sources: [REF.yiGeukdon, REF.muoSahwa],
        fields: [
          { key: 'reason', label: '파직 사유', value: '수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면' },
          { key: 'sacho', label: '사초', value: '실록청 당상으로 사초를 정리하다 김일손 사초 속 「조의제문」을 문제 삼음' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
    ],
    unlocks: {
      flags: ['restored_person'],
      collect: [
        { entryId: 'col_per_yi_geukdon', stage: 4 },
        { entryId: 'col_per_eo_segyeom', stage: 3 },
        { entryId: 'col_src_jouijemun', stage: 3 },
      ],
    },
    notebookDiff: [
      {
        id: 'nd_person',
        before: '이극돈: 1498년 파직. 사유 기록 없음.',
        after: '이극돈: 문제의 사초를 보고도 고하지 않은 죄로 파면. 그 사초 속 「조의제문」을 문제 삼은 사람도 그였다.',
        provenance: V,
      },
    ],
  },
  {
    id: 'shift_cause',
    provenance: F,
    order: 3,
    title: '같은 달의 처분 — 무오사화',
    when: { recorded: ['act_cause'] },
    restores: [
      { kind: 'source', id: 'src_verdict' },
      { kind: 'source', id: 'src_proclaim' },
      { kind: 'event', id: 'evt_muo_sahwa' },
      { kind: 'record', id: 'rec_alt_kim_ilson' },
      { kind: 'record', id: 'rec_alt_kwon_obok' },
      { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
      { kind: 'record', id: 'rec_alt_kim_jongjik' },
    ],
    searchRewrites: [
      {
        entryId: 'se_muo',
        results: [
          { kind: 'event', id: 'evt_muo_sahwa' },
          { kind: 'source', id: 'src_sacho_order' },
          { kind: 'source', id: 'src_verdict' },
          { kind: 'source', id: 'src_proclaim' },
        ],
      },
      {
        entryId: 'se_kim_ilson',
        results: [
          { kind: 'person', id: 'per_kim_ilson' },
          { kind: 'record', id: 'rec_alt_kim_ilson' },
          { kind: 'artifact', id: 'art_takyeong' },
          { kind: 'source', id: 'src_verdict' },
        ],
      },
      {
        entryId: 'se_kwon',
        results: [
          { kind: 'record', id: 'rec_alt_kwon_obok' },
          { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
          { kind: 'source', id: 'src_verdict' },
        ],
      },
    ],
    messageRewrites: [
      {
        messageId: 'm_c_01',
        newText: '아직 안 갔어? 또 그 사관 기록이야? 「김일손」. 무오사화 때 화를 입은 사관이야. 그걸 왜 또 봐?',
      },
      { messageId: 'm_c_03a', newText: '같은 달인 게 당연하지. 무오사화잖아. 그걸 이제 와서 왜 물어?' },
    ],
    recordRewrites: [
      {
        recordId: 'rec_alt_kim_ilson',
        provenance: V,
        sources: [REF.kimIlson, REF.sillokVerdict, REF.sillokProclaim, REF.sillokSachoOrder],
        fields: [
          { key: 'death', label: '졸', value: '1498년 음력 7월' },
          { key: 'cause', label: '사인', value: '사초 사건 — 대역의 죄로 능지처사(7월 26일 처분, 27일 종묘 사직에 고유)' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
      {
        recordId: 'rec_alt_kwon_obok',
        provenance: V,
        sources: [REF.sillokVerdict, REF.sillokHouseSearch],
        fields: [
          { key: 'death', label: '처분', value: '1498년 음력 7월 26일' },
          { key: 'cause', label: '사인', value: '사초 사건 관련자로 김일손과 함께 능지처사 처분' },
          { key: 'letter', label: '편지', value: '이목과 함께 김일손에게 보낸 편지가 김일손의 집에서 나옴(7월 12일)' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
      {
        recordId: 'rec_alt_kwon_gyeongyu',
        provenance: V,
        sources: [REF.sillokVerdict],
        fields: [
          { key: 'death', label: '처분', value: '1498년 음력 7월 26일' },
          { key: 'cause', label: '사인', value: '사초 사건 관련자로 김일손과 함께 능지처사 처분' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
      {
        recordId: 'rec_alt_kim_jongjik',
        provenance: V,
        sources: [REF.kimJongjik, REF.sillokProclaim],
        fields: [
          { key: 'after', label: '사후 처분', value: '1498년' },
          { key: 'content', label: '처분 내용', value: '「조의제문」과 관련되어 대역으로 논단, 부관참시' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
    ],
    unlocks: {
      flags: ['restored_event'],
      sources: ['src_verdict', 'src_proclaim'],
      collect: [
        { entryId: 'col_evt_muo_sahwa', stage: 4 },
        { entryId: 'col_src_verdict', stage: 3 },
        { entryId: 'col_src_sacho_order', stage: 4 },
        { entryId: 'col_src_house_search', stage: 3 },
        { entryId: 'col_per_kim_ilson', stage: 4 },
        { entryId: 'col_per_kim_jongjik', stage: 4 },
      ],
    },
    notebookDiff: [
      {
        id: 'nd_cold',
        before: '무오█화 — 계속 조사',
        after: '무오사화. 기록했다.',
        provenance: F,
      },
      {
        id: 'nd_kim_ilson',
        before: '김일손: 1498년 7월 졸. 사인 기록 없음.',
        after: '김일손: 7월 26일, 대역의 죄로 능지처사 처분. 「조의제문」을 실은 그의 사초 때문에.',
        provenance: V,
      },
      {
        id: 'nd_kwon',
        before: '권오복·권경유: 같은 달 졸. 사인 없음.',
        after: '권오복·권경유: 김일손과 같은 날 같은 처분.',
        provenance: V,
      },
      {
        id: 'nd_jongjik',
        before: '김종직: 사후 처분 1건. 내용 없음.',
        after: '김종직: 대역으로 논단되어 부관참시.',
        provenance: V,
      },
      {
        id: 'nd_cause_colleague',
        before: '선임: “사인 없는 졸년 기록, 옛날엔 흔해.”',
        after: '선임: “무오사화 때 화를 입은 사관이야.” — 처음부터 그렇게 말했다고 한다.',
        provenance: F,
      },
    ],
  },
];
