/**
 * DB 레코드. fictional = 가상 DB 메타데이터(정합성 보정 대상 가능). verified = 출처 있는 제도 설명.
 * 수치(교차 참조 밀도 등)는 가상 DB 의 값이며 실제 실록에 대한 주장이 아니다.
 */
import type { DbRecord } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;

export const records: DbRecord[] = [
  {
    id: 'rec_meta_kim_ilson',
    provenance: F,
    title: '메타데이터 — 김일손 관련 기록',
    fields: [
      { key: 'xref', label: '교차 참조 밀도', value: '0.998 (상위 0.1%)' },
      { key: 'errors', label: '오류 보고', value: '0건' },
      { key: 'origin', label: '원본 대조', value: '통과' },
      { key: 'status', label: '상태', value: '정상' },
    ],
    note: '통합 DB 정합성 모델 기준.',
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
      { key: 'private', label: '원칙', value: '왕은 사초를 보지 않는 것이 관례였다.' },
    ],
    sources: [REF.sagwan, REF.geomyeol, REF.sillokSachoOrder],
  },
];
