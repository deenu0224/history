/**
 * 현실 이동(복원) — 가상 설정. 역사 사실 자체는 복원되는 verified 사료·사건·레코드뿐이다. DESIGN_V3 §8.
 * 보고서 도장(filed: rep_c2217) → 주소가 돌아온다: 일시 #### → 연산군 4년 7월 11일, 기록·메시지가 다시 쓰인다.
 * 단말에는 표식이 없다. 이전을 기억하는 건 그것을 눈앞에서 본 나뿐(rewriteLog 는 플레이어 쪽 화면만 읽는다).
 *
 * 복원되는 것: 『연산군일기』 7월 11일(사초 반입)·12일(집 수색)·26일(처분)·27일(고유·부관참시), 「무오사화」 사건,
 *   이극돈 등 수사관의 파면(백과사전 「무오사화」), 김일손·권오복·권경유·김종직 레코드. 모두 HISTORICAL_SOURCES 확정 사항.
 */
import type { RealityShift } from '@/core/types';
import { REF } from '@/data/historical/refs';

const V = 'verified' as const;
const RESTORED = '사초 사건 — 대역의 죄로 능지처사 처분(연산 4년 7월 26일)';

export const shifts: RealityShift[] = [
  {
    id: 'shift_c2217',
    provenance: 'fictional',
    order: 1,
    title: '좌표 #C-2217 — 연산군 4년 7월 11일',
    when: { filed: ['rep_c2217'] },
    restores: [
      { kind: 'source', id: 'src_sacho_order' },
      { kind: 'source', id: 'src_house_search' },
      { kind: 'source', id: 'src_verdict' },
      { kind: 'source', id: 'src_proclaim' },
      { kind: 'event', id: 'evt_muo_sahwa' },
      { kind: 'record', id: 'rec_alt_kim_ilson' },
      { kind: 'record', id: 'rec_alt_kwon_obok' },
      { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
      { kind: 'record', id: 'rec_alt_yi_geukdon' },
      { kind: 'record', id: 'rec_alt_kim_jongjik' },
    ],
    assignmentRewrites: [
      {
        assignmentId: 'as_c2217',
        header: [
          { key: 'when', value: '연산군 4년 7월 11일' },
          { key: 'place', value: '춘추관 실록청' },
        ],
      },
    ],
    closureRewrite: { assignmentId: 'as_c2217', classification: '정상 종결 · 기사 대조 일치', verdictShown: 'match' },
    closedRewrites: [
      {
        reportId: 'cr_c2217_prev',
        verdict: '일치',
        classification: '정상 종결',
        note: '14시경 대문에서 전교 전달 확인. 『연산군일기』 7월 11일 기사와 일치.',
      },
    ],
    searchRewrites: [
      { entryId: 'se_order', results: [{ kind: 'source', id: 'src_sacho_order' }, { kind: 'source', id: 'src_house_search' }] },
      { entryId: 'se_jikpil', results: [{ kind: 'source', id: 'src_sacho_order' }] },
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
          { kind: 'record', id: 'rec_alt_kim_ilson' },
          { kind: 'person', id: 'per_kim_ilson' },
          { kind: 'source', id: 'src_verdict' },
          { kind: 'artifact', id: 'art_takyeong' },
        ],
      },
      {
        entryId: 'se_kwon',
        results: [
          { kind: 'record', id: 'rec_alt_kwon_obok' },
          { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
          { kind: 'source', id: 'src_verdict' },
          { kind: 'source', id: 'src_house_search' },
        ],
      },
    ],
    messageRewrites: [
      { messageId: 'm_sys_closed', newText: '#C-2217 — 분류: 정상 · 기사 대조 일치.' },
      { messageId: 'm_chief_02', newText: '07, 그거 무오사화 7월 11일 좌표잖아. 교과서 건이야. 깔끔하게 했더라.' },
      { messageId: 'm_chief_02n', newText: '07, 그거 무오사화 7월 11일 좌표잖아. 교과서 건이야. 깔끔하게 했더라.' },
      { messageId: 'm_chief_05', newText: '보정 로그 깨끗하더라. 변경 0건. 수고했어.' },
      { messageId: 'm_senior_01', newText: '07, 밤샜어? 무오사화 좌표 대조라며. 그거 신입 연습용인데.' },
    ],
    recordRewrites: [
      {
        recordId: 'rec_alt_kim_ilson',
        provenance: V,
        sources: [REF.kimIlson, REF.sillokVerdict, REF.sillokProclaim, REF.sillokSachoOrder],
        fields: [
          { key: 'cause', label: '사인', value: RESTORED },
          { key: 'same', label: '같은 처분', value: '권오복, 권경유' },
          { key: 'sacho', label: '사초', value: '연산 4년 7월 11일, 왕명으로 모두 대내에 들임' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
      {
        recordId: 'rec_alt_kwon_obok',
        provenance: V,
        sources: [REF.sillokVerdict, REF.sillokHouseSearch],
        fields: [
          { key: 'cause', label: '사인', value: '사초 사건 관련자로 김일손과 함께 능지처사 처분(7월 26일)' },
          { key: 'letter', label: '편지', value: '이목과 함께 김일손에게 보낸 편지가 김일손의 집에서 나옴(7월 12일)' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
      {
        recordId: 'rec_alt_kwon_gyeongyu',
        provenance: V,
        sources: [REF.sillokVerdict],
        fields: [
          { key: 'cause', label: '사인', value: '사초 사건 관련자로 김일손과 함께 능지처사 처분(7월 26일)' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
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
      {
        recordId: 'rec_alt_kim_jongjik',
        provenance: V,
        sources: [REF.kimJongjik, REF.sillokProclaim],
        fields: [
          { key: 'content', label: '처분 내용', value: '「조의제문」과 관련되어 대역으로 논단, 부관참시' },
          { key: 'status', label: '상태', value: '정상' },
        ],
      },
    ],
    unlocks: { flags: ['restored_c2217'] },
  },
];
