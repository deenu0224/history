/**
 * DB 레코드.
 *  - altered(변조된 상태, fictional): 말소된 세계의 DB. 원인 없는 결과만 담는다(사인 없는 졸년, 사유 없는 파직,
 *    내용 없는 사후 처분). 날짜·이름은 검증된 사실에서 가져오되, '사인 기록 없음' 같은 빈칸이 곧 변조다.
 *    복원(RealityShift.recordRewrites)으로만 실제 역사(verified + 출처)가 되며, 엔딩 뒤 열람 모드에서 원래 상태는 '변조'로 표시된다.
 *  - 권오복·권경유는 실록 kja_10407026_004 의 이름과 처분 외에는 검증하지 않았다 → 변조 상태도 최소(이름 + 같은 달 졸 + 사인 없음).
 *  - fictional(일반): 단말 시스템 레코드. verified: 출처 있는 제도 설명.
 */
import type { DbRecord } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const OK = { key: 'status', label: '상태', value: '정상 · 오류 0건 · 원본 대조 통과' };

export const records: DbRecord[] = [
  {
    id: 'rec_alt_kim_ilson',
    provenance: F,
    altered: true,
    title: '인물 기록 — 김일손(金馹孫)',
    fields: [
      { key: 'life', label: '생몰', value: '1464 ~ 1498' },
      { key: 'career', label: '관직', value: '승문원 정자 겸 춘추관 기사관 외' },
      { key: 'death', label: '졸', value: '1498년 7월' },
      { key: 'cause', label: '사인', value: '기록 없음' },
      OK,
    ],
    note: '통합 역사 DB 인물 색인.',
  },
  {
    id: 'rec_alt_kwon_obok',
    provenance: F,
    altered: true,
    title: '인물 기록 — 권오복(權五福)',
    fields: [
      { key: 'death', label: '졸', value: '1498년 7월' },
      { key: 'cause', label: '사인', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_alt_kwon_gyeongyu',
    provenance: F,
    altered: true,
    title: '인물 기록 — 권경유(權景裕)',
    fields: [
      { key: 'death', label: '졸', value: '1498년 7월' },
      { key: 'cause', label: '사인', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_alt_yi_geukdon',
    provenance: F,
    altered: true,
    title: '인물 기록 — 이극돈(李克墩)',
    fields: [
      { key: 'life', label: '생몰', value: '1435 ~ 1503' },
      { key: 'office', label: '관직', value: '지관사 · 『성종실록』 실록청 당상' },
      { key: 'dismissed', label: '파직', value: '1498년' },
      { key: 'reason', label: '파직 사유', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_alt_kim_jongjik',
    provenance: F,
    altered: true,
    title: '인물 기록 — 김종직(金宗直)',
    fields: [
      { key: 'life', label: '생몰', value: '1431 ~ 1492' },
      { key: 'after', label: '사후 처분', value: '1498년, 1건' },
      { key: 'content', label: '처분 내용', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_db_overview',
    provenance: F,
    title: '통합 역사 DB — 실록 색인 현황',
    fields: [
      { key: 'status', label: '상태', value: '정상' },
      { key: 'check', label: '최근 정합성 점검', value: '통과' },
    ],
  },
  {
    id: 'rec_sys_log',
    provenance: F,
    title: '단말 시스템 로그',
    fields: [
      { key: 'sync', label: '동기화', value: '정상' },
      { key: 'correction', label: '정합성 보정', value: '완료 · 변경 0건' },
      { key: 'history', label: '보정 이력', value: '없음' },
    ],
  },
  {
    id: 'rec_sagwan_system',
    provenance: 'verified',
    title: '사관과 사초',
    fields: [
      { key: 'sagwan', label: '사관', value: '좁은 뜻의 사관은 춘추관 기사관을 겸한 예문관 봉교·대교·검열이다.' },
      { key: 'gajang', label: '가장사초', value: '사초를 2부 작성해 1부는 춘추관에 내고, 1부는 사관의 집에 보관했다.' },
      { key: 'collect', label: '실록청', value: '실록청이 서면 집에 둔 사초(가장사초)를 거두어 편찬에 썼다.' },
    ],
    sources: [REF.sagwan, REF.geomyeol],
  },
];
