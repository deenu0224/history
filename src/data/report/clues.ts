/**
 * 단서: 프레임(들린 대사·보이는 핫스팟·시각)과 DB 기록에서 데이터로 계산된다(core/report.ts).
 * 핵심 프레임(DESIGN_V3 §4): F1 붉은 관복 r2 · F2 「조의제문」 y3 · F3 전교 m2 · F4 간언 b2/b3 · F5 서리 귓속말 c3 · F6 「살아 있소」 b5.
 *  - unrecorded: 기록(해당일 특이사항 없음)과 다른 목격 → ④ [불일치] 근거.
 *  - key: 보정 트리거·훼손 보호에 쓰는 핵심 단서.
 *  - 기록 단서의 provenance 는 그 기록을 따른다(변조 상태 = fictional).
 *  - time.feedback 에는 정답·4자리 연도를 쓰지 않는다(테스트).
 */
import type { Clue } from '@/core/types';
import { FACT } from '@/data/historical/facts';
import { REF } from '@/data/historical/refs';

const R = 'reconstructed' as const;
const V = 'verified' as const;
const F = 'fictional' as const;
const RED = 'hs_npc_red_official';

export const clues: Clue[] = [
  // ── 프레임 단서 ──────────────────────────────────────────────
  {
    id: 'cl_bundles',
    provenance: R,
    sources: [REF.sagwan, REF.geomyeol],
    label: '사초 꾸러미',
    text: '이름표가 달린 종이 꾸러미가 쌓여 있다. 여러 집에서 거둬 온 사초다.',
    proves: [FACT.claimGajangCollected],
    frame: { visibleAny: ['hs_obs_store_sacho', 'hs_obs_hall_manuscript'] },
  },
  {
    id: 'cl_gajang',
    provenance: R,
    sources: [REF.sagwan, REF.geomyeol],
    label: '집에 둔 사초',
    text: '젊은 관원: 사관은 집에도 사초를 적어 두고, 실록을 엮을 때 그것까지 거둔다.',
    proves: [FACT.claimGajangCollected],
    frame: { heardAny: ['y1', 'y2'] },
  },
  {
    id: 'cl_myoho',
    provenance: R,
    sources: [REF.sillokMyoho, REF.myoho],
    label: '선왕의 칭호',
    text: "서리가 엮는 실록을 '성종대왕 실록'이라 부른다. 묘호는 왕이 세상을 떠난 뒤에 붙는다.",
    proves: [FACT.claimMyoho],
    time: {
      notBefore: 1495,
      strength: 'decisive',
      feedback: '묘호는 왕이 세상을 떠난 뒤에 붙는다. 이 칭호가 들린 날은 그 왕의 치세 안일 수 없다.',
    },
    frame: { heard: ['c1'] },
  },
  {
    id: 'cl_dangsang',
    provenance: R,
    sources: [REF.yiGeukdon],
    label: '붉은 관복의 당상',
    text: '붉은 관복의 노관이 사초를 붙들고 있다. 서리들은 그를 당상이라 부르고, 실록을 엮는 일이 그의 손을 거친다.',
    proves: [FACT.officeSillokDangsang],
    frame: { visible: [RED], heardAny: ['r1', 'r2', 'c2', 'c3'] },
  },
  {
    id: 'cl_veteran',
    provenance: R,
    sources: [REF.yiGeukdon],
    label: '서리의 귓속말',
    text: '“저 당상 영감은 세조대왕 실록 때도 편수를 맡으셨다지.” 붉은 관복을 두고 한 말이다.',
    proves: [FACT.officeSillokDangsang, FACT.eventSejoSillok],
    frame: { visible: [RED], heard: ['c3'] },
    key: true,
  },
  {
    id: 'cl_jouijemun',
    provenance: R,
    sources: [REF.jouijemun, REF.muoSahwa],
    label: '문제가 된 글',
    text: '당상이 어느 사초에 실린 글 한 편을 문제 삼았다. 「조의제문」이라고 한다.',
    proves: [FACT.claimJouijemunInSacho],
    frame: { heard: ['y3'] },
    unrecorded: true,
  },
  {
    id: 'cl_order',
    provenance: V,
    sources: [REF.sillokSachoOrder],
    label: '전교',
    text: '“김일손(金馹孫)의 사초(史草)를 모두 대내(大內)로 들여오라.” 왕의 명이 관청에 닿았다.',
    proves: [FACT.claimOrderAllSacho, FACT.nameKimIlson],
    frame: { heard: ['m2'] },
    unrecorded: true,
    key: true,
  },
  {
    id: 'cl_objection',
    provenance: V,
    sources: [REF.sillokSachoOrder],
    label: '당상들의 간언',
    text: '“예로부터 사초는 임금이 스스로 보지 않습니다.” “임금이 만약 사초를 보면 후세에 직필이 없기 때문입니다.”',
    proves: [FACT.claimSachoCustom],
    frame: { heardAny: ['b2', 'b3'] },
    unrecorded: true,
  },
  {
    id: 'cl_sealing',
    provenance: R,
    sources: [REF.sillokSachoOrder],
    label: '봉함',
    text: '당상들이 사초에서 몇 장을 가려 뽑아 봉한다. 붉은 관복도 그 자리에 있다.',
    proves: [FACT.claimSixArticles],
    frame: { heardAny: ['r3', 'b4'] },
    unrecorded: true,
  },
  {
    id: 'cl_alive',
    provenance: R,
    sources: [REF.muoSahwa, REF.sillokVerdict],
    label: '살아 있는 사관',
    text: '“사초를 쓴 사관은 아직 살아 있소. 곧 불려 가겠지.”',
    proves: [FACT.claimAuthorAlive],
    frame: { heard: ['b5'] },
    unrecorded: true,
    key: true,
  },

  // ── 기록 단서 ───────────────────────────────────────────────
  {
    id: 'cl_rec_deaths',
    provenance: F,
    label: '같은 달 사망 — 사인 기록 없음',
    text: '통합 DB: 김일손 사망. 사인 기록 없음. 같은 달 사망: 권오복, 권경유 — 역시 사인 기록 없음.',
    proves: [FACT.claimSameMonthDeaths],
    record: 'rec_alt_kim_ilson',
    authorNote: '말소된 세계의 DB 상태(변조). 실제 역사로 표시하지 않는다.',
  },
  {
    id: 'cl_rec_kwon_obok',
    provenance: F,
    label: '같은 달 사망 — 권오복',
    text: '통합 DB: 권오복 사망. 사인 기록 없음.',
    proves: [FACT.claimSameMonthDeaths],
    record: 'rec_alt_kwon_obok',
  },
  {
    id: 'cl_rec_kwon_gyeongyu',
    provenance: F,
    label: '같은 달 사망 — 권경유',
    text: '통합 DB: 권경유 사망. 사인 기록 없음.',
    proves: [FACT.claimSameMonthDeaths],
    record: 'rec_alt_kwon_gyeongyu',
  },
  {
    id: 'cl_rec_geukdon',
    provenance: F,
    label: '사유 없는 파직',
    text: '통합 DB: 실록청 당상 이극돈, 파직. 파직 사유 기록 없음.',
    proves: [FACT.claimDismissedNoReason],
    record: 'rec_alt_yi_geukdon',
  },
  {
    id: 'cl_sillokcheong',
    provenance: V,
    sources: [REF.seongjongSillok, REF.sillokCompileOrder],
    label: '실록청의 기간',
    text: '『성종실록』 실록청은 춘추관 안에 설치되어 편찬을 마치고 인쇄까지 끝낸 뒤 닫혔다.',
    proves: [FACT.claimSillokCompleted],
    time: {
      notBefore: 1495,
      notAfter: 1499,
      strength: 'decisive',
      feedback: '임시 관청은 문을 연 날과 닫은 날이 있다. 앞뒤를 함께 막지만, 그 사이가 몇 해나 된다.',
    },
    record: 'rec_seongjong_sillok',
  },

  // ── 조합(칸 안) ─────────────────────────────────────────────
  {
    id: 'cl_when_pinned',
    provenance: R,
    sources: [REF.sillokSachoOrder, REF.sillokVerdict, REF.kimIlson],
    label: '살아 있던 사관과 그의 사망',
    text:
      '그날 사초의 주인은 살아 있었고 곧 불려 갈 참이었다. DB 는 그가 사인 기록 없이 사망한 해와 달을 적고 있다. ' +
      '좌표는 원인 없는 결과들이 가리키는 한 점이다 — 이 장면은 그 죽음과 같은 해에 묶인다.',
    time: {
      notBefore: 1498,
      notAfter: 1498,
      strength: 'decisive',
      feedback: '살아 있던 사람과 그가 사망한 기록이 한 칸에 놓였다. 시작과 끝이 같은 해로 모인다.',
    },
    combo: {
      all: ['cl_alive', 'cl_rec_deaths'],
      report: ['cl_order'],
      missingReportText: '살아 있다는 사관이 누구인지, 이 보고서 어디에도 이름이 없다.',
    },
    authorNote:
      '유령 좌표 규칙(세계 규칙 3): 원인 없는 결과(같은 달 사망·사인 없음)들이 가리키는 점. 전교 프레임(보고서 안)이 그 사관의 이름을 준다.',
  },
];
