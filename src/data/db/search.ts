/**
 * 통합 DB 색인. 결과는 검증된 콘텐츠(인물·사료·유물·사건) 또는 DB 레코드를 가리킨다.
 *  - 말소된 세계: 그날의 실록 기사는 DB 에 없다. 그 기사를 가리키는 말은 noArticle → '해당 기사 없음'. 복원이 결과를 채운다.
 *  - terms: 보고 들은 표현과 한자/한글 이형. 들은 말의 칩(밑줄)은 모두 색인에 있어야 한다(검증기).
 *  - DB 는 대조 종결 뒤에 열린다(규정 4조).
 */
import type { SearchEntry } from '@/core/types';

const F = 'fictional' as const;

export const searchEntries: SearchEntry[] = [
  {
    id: 'se_order',
    provenance: F,
    noArticle: true,
    terms: ['대내로 들여오라', '김일손의 사초', '사초를 모두 대내로', '대내', '전교'],
    results: [],
  },
  {
    id: 'se_jikpil',
    provenance: F,
    noArticle: true,
    terms: ['직필', '直筆', '임금이 스스로 보지 않습니다'],
    results: [],
  },
  {
    id: 'se_kim_ilson',
    provenance: F,
    terms: ['김일손', '金馹孫', '탁영', '濯纓', '계운'],
    results: [
      { kind: 'record', id: 'rec_alt_kim_ilson' },
      { kind: 'record', id: 'rec_kim_ilson_posts' },
      { kind: 'person', id: 'per_kim_ilson' },
      { kind: 'artifact', id: 'art_takyeong' },
    ],
    grants: { terms: ['권오복', '권경유'] },
  },
  {
    id: 'se_kwon',
    provenance: F,
    terms: ['권오복', '권경유', '權五福', '權景裕'],
    results: [
      { kind: 'record', id: 'rec_alt_kwon_obok' },
      { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
    ],
  },
  {
    id: 'se_sillokcheong',
    provenance: F,
    terms: ['실록청', '성종대왕 실록', '성종실록', '성종대왕', '實錄廳'],
    results: [
      { kind: 'record', id: 'rec_seongjong_sillok' },
      { kind: 'record', id: 'rec_sillokcheong_reward' },
      { kind: 'event', id: 'evt_seongjong_sillok' },
      { kind: 'source', id: 'src_compile_order' },
    ],
    grants: { terms: ['이극돈', '어세겸'] },
  },
  {
    id: 'se_dangsang',
    provenance: F,
    terms: ['당상', '실록청 당상', '堂上'],
    results: [
      { kind: 'record', id: 'rec_alt_yi_geukdon' },
      { kind: 'record', id: 'rec_eo_segyeom' },
    ],
  },
  {
    id: 'se_yi_geukdon',
    provenance: F,
    terms: ['이극돈', '李克墩'],
    results: [
      { kind: 'record', id: 'rec_alt_yi_geukdon' },
      { kind: 'person', id: 'per_yi_geukdon' },
    ],
  },
  {
    id: 'se_eo_segyeom',
    provenance: F,
    terms: ['어세겸', '魚世謙'],
    results: [
      { kind: 'record', id: 'rec_eo_segyeom' },
      { kind: 'person', id: 'per_eo_segyeom' },
    ],
  },
  {
    id: 'se_sejo_sillok',
    provenance: F,
    terms: ['세조대왕 실록', '세조실록', '편수'],
    results: [{ kind: 'record', id: 'rec_alt_yi_geukdon' }],
  },
  {
    id: 'se_jouijemun',
    provenance: F,
    terms: ['조의제문', '弔義帝文', '점필재', '김종직', '金宗直'],
    results: [
      { kind: 'source', id: 'src_jouijemun' },
      { kind: 'person', id: 'per_kim_jongjik' },
      { kind: 'record', id: 'rec_alt_kim_jongjik' },
    ],
  },
  {
    id: 'se_sacho',
    provenance: F,
    terms: ['사초', '집에 둔 사초', '가장사초', '史草'],
    results: [{ kind: 'record', id: 'rec_sagwan_system' }],
  },
  {
    id: 'se_gyeongguk',
    provenance: F,
    optional: true,
    terms: ['經國大典', '경국대전'],
    results: [{ kind: 'source', id: 'src_gyeongguk' }],
  },
  {
    id: 'se_takyeong',
    provenance: F,
    optional: true,
    terms: ['탁영금', '濯纓琴', '거문고'],
    results: [{ kind: 'artifact', id: 'art_takyeong' }],
  },
  {
    id: 'se_muo',
    provenance: F,
    optional: true,
    noArticle: true,
    terms: ['무오사화', '戊午士禍', '戊午史禍'],
    results: [],
  },
  {
    id: 'se_correction',
    provenance: F,
    optional: true,
    terms: ['좌표 재계산', '재계산', '관측기 로그', '소실'],
    results: [{ kind: 'record', id: 'rec_sys_log' }],
  },
];
