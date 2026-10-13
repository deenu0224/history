/**
 * DB 레코드(현대 통합 역사 DB). 현대 문장 → '졸' 대신 '사망', '사망 연월', '사인: 기록 없음'.
 *  - altered(변조된 상태, fictional): 말소된 세계의 DB. 원인 없는 결과만 담는다(사인 없는 사망, 사유 없는 파직,
 *    내용 없는 사후 처분). 날짜·이름은 검증된 사실에서 가져오되, '기록 없음' 빈칸이 곧 변조다.
 *    복원(shift_c2217.recordRewrites)으로만 실제 역사(verified + 출처)가 된다. 엔딩 뒤 열람 모드에서 원래 상태는 '변조'.
 *  - 연도 표시 결정(DESIGN_V3 §1 6회): DB 는 현대 DB 라 사망 연월에 연도를 보인다. 연도 칸은 그 숫자를 '찍는' 것으로
 *    풀리지 않는다(살아 있던 프레임 + 이 기록 + 전교 프레임이 함께 있어야 정당화).
 *  - personId: 누구 칸의 후보가 된다.
 */
import type { DbRecord } from '@/core/types';
import { REF } from '@/data/historical/refs';
import { GLOSS } from '@/data/glossary';

const F = 'fictional' as const;
const V = 'verified' as const;
const OK = { key: 'status', label: '상태', value: '정상 · 오류 0건 · 원본 대조 통과' };

export const records: DbRecord[] = [
  {
    id: 'rec_alt_kim_ilson',
    provenance: F,
    altered: true,
    personId: 'per_kim_ilson',
    title: '인물 기록 — 김일손(金馹孫)',
    fields: [
      { key: 'life', label: '생몰', value: '1464 ~ 1498' },
      { key: 'career', label: '관직', value: '승문원 정자 겸 춘추관 기사관 외' },
      { key: 'death', label: '사망 연월', value: '1498년 7월' },
      { key: 'cause', label: '사인', value: '기록 없음' },
      { key: 'same', label: '같은 달 사망', value: '권오복, 권경유 (사인 기록 없음)' },
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
      { key: 'death', label: '사망 연월', value: '1498년 7월' },
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
      { key: 'death', label: '사망 연월', value: '1498년 7월' },
      { key: 'cause', label: '사인', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_alt_yi_geukdon',
    provenance: F,
    altered: true,
    personId: 'per_yi_geukdon',
    title: '인물 기록 — 이극돈(李克墩)',
    fields: [
      { key: 'life', label: '생몰', value: '1435 ~ 1503' },
      { key: 'career', label: '이력', value: '『세조실록』 편수관' },
      { key: 'office', label: '관직', value: '지관사 · 『성종실록』 실록청 당상' },
      { key: 'dismissed', label: '파직', value: '1498년' },
      { key: 'reason', label: '파직 사유', value: '기록 없음' },
      OK,
    ],
    glossary: [GLOSS.sillokcheong, GLOSS.dangsang, GLOSS.pyeonsu],
  },
  {
    id: 'rec_eo_segyeom',
    provenance: V,
    personId: 'per_eo_segyeom',
    title: '인물 기록 — 어세겸(魚世謙)',
    fields: [{ key: 'career', label: '이력', value: '『성종실록』 편찬의 명을 받음(연산 1년 4월 19일)' }],
    sources: [REF.sillokCompileOrder],
  },
  {
    id: 'rec_alt_kim_jongjik',
    provenance: F,
    altered: true,
    title: '인물 기록 — 김종직(金宗直)',
    fields: [
      { key: 'life', label: '생몰', value: '1431 ~ 1492' },
      { key: 'pen', label: '호', value: '점필재' },
      { key: 'after', label: '사후 처분', value: '1498년, 1건' },
      { key: 'content', label: '처분 내용', value: '기록 없음' },
      OK,
    ],
  },
  {
    id: 'rec_seongjong_sillok',
    provenance: V,
    title: '『성종실록』 편찬 기록',
    fields: [
      { key: 'office', label: '「『성종실록』 편찬 실록청」', value: '1495년 4월, 춘추관 안에 설치' },
      {
        key: 'order',
        label: '편찬 명령',
        value: '어세겸·이극돈·유순·성현·권건·신종호·조위에게 편찬을 명함(연산 1년 4월 19일)',
      },
      { key: 'done', label: '완성', value: '1499년 3월 인쇄 완료, 네 사고에 봉안' },
    ],
    sources: [REF.seongjongSillok, REF.sillokCompileOrder],
    glossary: [GLOSS.sillokcheong],
  },
  {
    id: 'rec_sagwan_system',
    provenance: V,
    title: '사관과 사초',
    fields: [
      { key: 'sagwan', label: '사관', value: '좁은 뜻의 사관은 춘추관 기사관을 겸한 예문관 봉교·대교·검열이다.' },
      { key: 'gajang', label: '집에 둔 사초', value: '사초를 2부 작성해 1부는 춘추관에 내고, 1부는 사관의 집에 보관했다(가장사초).' },
      { key: 'collect', label: '실록청', value: '실록청이 서면 집에 둔 사초를 거두어 편찬에 썼다.' },
    ],
    sources: [REF.sagwan, REF.geomyeol],
    glossary: [GLOSS.sacho, GLOSS.sillokcheong],
  },
  {
    id: 'rec_sys_log',
    provenance: F,
    title: '실록청 단말 시스템 로그',
    fields: [
      { key: 'sync', label: '동기화', value: '정상' },
      { key: 'correction', label: '좌표 재계산', value: '매일 06:00' },
      { key: 'immune', label: '관측기', value: '관측기와 관측 데이터·시스템 로그는 소실의 영향을 받지 않는다.' },
      { key: 'rule', label: '규정 4조', value: '대조 중에는 DB 를 열람하지 않는다(선입견 방지).' },
    ],
  },
  // v4 근무 2~3 조사용(HISTORICAL_SOURCES §10.3 D-1·D-2). 연도·왕대·권차·기사 id 를 가린다(월·일만).
  {
    id: 'rec_sillokcheong_reward',
    provenance: V,
    title: '『성종실록』 실록청 — 하사 기록',
    fields: [
      { key: 'when', label: '날짜', value: '12월 21일' },
      { key: 'heads', label: '총재관', value: '신승선·어세겸 — 안장 갖춘 말 한 필, 표리 한 벌, 비단 한 필' },
      { key: 'dang', label: '당상', value: '이극돈·유순·홍귀달·윤효손·안침·허침·조익정·이육·신종호 — 안장 갖춘 말 한 필, 표리 한 벌' },
      { key: 'rule', label: '기준', value: '『세조실록』의 예에 따라 출사한 날짜에 차등을 둠' },
    ],
    note: '실록청은 그 일 전에도 일하고 있었다.',
    sources: [REF.sillokReward],
    glossary: [GLOSS.sillokcheong, GLOSS.pyori],
  },
  {
    id: 'rec_kim_ilson_posts',
    provenance: V,
    title: '인사 기록 — 김일손(金馹孫)',
    fields: [
      { key: 'post1', label: '충청도 도사', value: '이익과 병폐 26가지를 조목으로 상소(5월 28일)' },
      { key: 'post2', label: '헌납', value: '신녕 현감의 일과 단월역 왜인의 일을 아룀(10월 9일)' },
    ],
    note: '살아서 관직에 있던 사람.',
    sources: [REF.sillokKimIlsonMemorial, REF.sillokKimIlsonHeonnap],
  },
];
