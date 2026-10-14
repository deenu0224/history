// 실존 사건.
import type { HistoricalEvent } from '@/core/legacyTypes';
import { REF } from './refs';

export const events: HistoricalEvent[] = [
  {
    id: 'evt_seongjong_sillok',
    provenance: 'verified',
    name: '『성종실록』 편찬',
    year: 1495,
    personIds: ['per_yi_geukdon', 'per_eo_segyeom'],
    placeId: 'plc_chunchugwan',
    sourceIds: ['src_myoho', 'src_compile_order'],
    summary:
      '성종이 세상을 떠난 지 4개월 뒤인 1495년 4월, 춘추관 안에 실록청을 두고 편찬을 시작했다. ' +
      '실록청은 사관들이 집에 두었던 가장사초를 거두어 편찬에 썼다. 1499년 3월 인쇄를 마치고 네 사고에 봉안했다.',
    sources: [REF.seongjongSillok, REF.sillokCompileOrder, REF.sagwan, REF.geomyeol],
  },
  {
    id: 'evt_muo_sahwa',
    provenance: 'verified',
    name: '무오사화',
    hanja: '戊午士禍',
    year: 1498,
    personIds: ['per_kim_ilson', 'per_yi_geukdon', 'per_yu_jagwang', 'per_kim_jongjik', 'per_eo_segyeom'],
    placeId: 'plc_chunchugwan',
    sourceIds: ['src_sacho_order', 'src_house_search', 'src_verdict', 'src_proclaim', 'src_jouijemun'],
    summary:
      '『성종실록』 편찬 중 실록청 당상 이극돈이 김일손의 사초에 실린 김종직의 「조의제문」을 문제 삼아 유자광에게 알렸고, ' +
      '유자광이 이를 왕에게 고하면서 시작되었다. 7월 11일 왕이 사초를 대내로 들이게 했고, 7월 12일부터 26일까지 신문한 끝에 ' +
      '김일손 등이 처형되고 김종직은 부관참시되었다. 관련된 여러 관원이 곤장을 맞고 유배되었으며, 사초를 보고도 즉시 아뢰지 않은 수사관들은 파직·좌천되었다. ' +
      '‘戊午史禍’로도 적는다.',
    sources: [REF.muoSahwa, REF.seongjongSillok, REF.sillokSachoOrder, REF.sillokVerdict, REF.sillokProclaim],
  },
];
