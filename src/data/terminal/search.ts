/**
 * 통합 DB 색인. 결과는 검증된 콘텐츠(인물·사료·유물·사건·장소) 또는 DB 레코드를 가리킨다.
 *  - 말소된 세계: 무오사화의 실록 기사는 DB 에 없다. 그 기사를 가리키는 말은 noArticle 항목으로 두어
 *    '해당 기사 없음'(콜드 오픈의 단어는 '그런 단어 없음')을 돌려준다. 복원(RealityShift.searchRewrites)이 결과를 채운다.
 *  - 원인 없는 결과(사인 없는 졸년 등)는 변조된 레코드(rec_alt_*, fictional)로 보인다.
 *  - terms: 보고 들은 표현과 한자/한글 이형. 정규화·일치 규칙은 core/search.ts.
 *  - grants: 맞히면 항상. conditional: 관측에서 그 단서를 실제로 얻었을 때만 증거 단계가 오른다.
 *  - optional: 칩 없이 직접 입력해야 닿는 호기심 보상. 진행 필수 증거는 모두 칩으로 닿는다(검증기).
 */
import type { SearchEntry } from '@/core/types';

const F = 'fictional' as const;

export const searchEntries: SearchEntry[] = [
  // ── 콜드 오픈: 내가 쓴 단어가 세상에 없다 ───────────────────
  {
    id: 'se_muo',
    provenance: F,
    noArticle: true,
    noArticleText: '그런 단어 없음.',
    terms: ['무오█화', '무오', '무오사화', '戊午士禍', '戊午史禍'],
    results: [],
    conditional: [
      {
        when: { none: ['restored_event'] },
        grants: {
          notebook: [
            {
              id: 'note_no_word',
              section: 'observed',
              text: '어젯밤 내가 쓴 단어를 검색했다. "그런 단어 없음." 무엇을 조사하고 있었는지 기억나지 않는다.',
              provenance: F,
            },
          ],
        },
      },
    ],
  },

  // ── 프롤로그: 원인 없는 죽음 ─────────────────────────────────
  {
    id: 'se_kim_ilson',
    provenance: F,
    terms: ['김일손', '金馹孫', '탁영', '濯纓', '계운'],
    results: [
      { kind: 'record', id: 'rec_alt_kim_ilson' },
      { kind: 'artifact', id: 'art_takyeong' },
    ],
    grants: {
      flags: ['prologue_anomaly', 'research_kim_ilson'],
      collect: [{ entryId: 'col_per_kim_ilson', stage: 2 }],
      terms: ['권오복', '권경유'],
      notebook: [
        { id: 'q_anomaly', section: 'question', text: '김일손은 왜 죽었나? 같은 달의 두 사람은?', provenance: F },
        {
          id: 'note_anomaly',
          section: 'observed',
          text: 'DB: 김일손 1498년 7월 졸. 사인 기록 없음. 같은 달 권오복·권경유도 — 역시 사인 없음. 오류 0건. 이유가 하나도 없다.',
          provenance: F,
        },
        {
          id: 'note_kim_ilson',
          section: 'verified',
          text: '김일손: 1464~1498. 1486년 급제, 승문원 정자 겸 춘추관 기사관. 김종직의 문인.',
          refIds: ['per_kim_ilson'],
          provenance: 'verified',
        },
      ],
    },
    conditional: [
      {
        // 관측에서 그의 이름(전교)과 '아직 살아 있다'를 들었다면: 그 사관의 졸년이 장면의 끝을 막는다
        when: { evidence: ['ev_author_alive', 'ev_royal_order'] },
        grants: { evidence: [{ id: 'ev_author_alive', level: 1 }], collect: [{ entryId: 'col_per_kim_ilson', stage: 3 }] },
        note: '관측에서 "아직 살아 있다"던 그 사관 — 전교에 이름이 나온 사람. 졸년이 DB 에 있다.',
      },
    ],
  },
  {
    id: 'se_kwon',
    provenance: F,
    terms: ['권오복', '權五福', '권경유', '權景裕', '權景𥙿'],
    results: [
      { kind: 'record', id: 'rec_alt_kwon_obok' },
      { kind: 'record', id: 'rec_alt_kwon_gyeongyu' },
    ],
    grants: {
      evidence: [{ id: 'ev_db_deaths' }],
      notebook: [
        {
          id: 'note_same_month',
          section: 'observed',
          text: '권오복·권경유: 둘 다 김일손과 같은 달에 졸. 사인 기록 없음. 세 사람, 한 달.',
          provenance: F,
        },
      ],
    },
  },
  {
    id: 'se_takyeong',
    provenance: F,
    terms: ['탁영금', '濯纓琴', '김일손 거문고', '金馹孫 琴', '거문고'],
    results: [
      { kind: 'artifact', id: 'art_takyeong' },
      { kind: 'place', id: 'plc_daegu_museum' },
    ],
    grants: {
      evidence: [{ id: 'ev_takyeong_record' }],
      collect: [
        { entryId: 'col_art_takyeong', stage: 2 },
        { entryId: 'col_plc_daegu_museum', stage: 2 },
      ],
      flags: ['research_takyeong'],
    },
  },

  // ── 관측에서 들은 말 → 사료 ─────────────────────────────
  {
    id: 'se_myoho',
    provenance: F,
    terms: ['성종대왕', '성종', '成宗', '묘호', '廟號'],
    results: [
      { kind: 'source', id: 'src_myoho' },
      { kind: 'source', id: 'src_seongjong_death' },
    ],
    grants: {
      collect: [
        { entryId: 'col_src_myoho', stage: 2 },
        { entryId: 'col_src_seongjong_death', stage: 2 },
      ],
    },
    conditional: [
      { when: { evidence: ['ev_myoho'] }, grants: {}, note: '관측에서 들은 칭호와 같은 말이 기록에 있다. 원문에서 확인할 것.' },
    ],
  },
  {
    id: 'se_daehaengwang',
    provenance: F,
    optional: true,
    terms: ['대행왕', '大行王'],
    results: [{ kind: 'source', id: 'src_daehaengwang' }],
    grants: { collect: [{ entryId: 'col_src_daehaengwang', stage: 2 }] },
  },
  {
    id: 'se_sillokcheong',
    provenance: F,
    terms: ['실록청', '實錄廳', '성종실록', '成宗實錄', '성종대왕 실록', '실록 편찬'],
    results: [
      { kind: 'event', id: 'evt_seongjong_sillok' },
      { kind: 'source', id: 'src_compile_order' },
      { kind: 'place', id: 'plc_chunchugwan' },
    ],
    grants: {
      collect: [
        { entryId: 'col_evt_seongjong_sillok', stage: 2 },
        { entryId: 'col_plc_chunchugwan', stage: 2 },
        { entryId: 'col_src_compile_order', stage: 2 },
        { entryId: 'col_per_yi_geukdon', stage: 1 },
        { entryId: 'col_per_eo_segyeom', stage: 1 },
      ],
    },
    conditional: [
      {
        when: { all: ['f_saw_bundles'] },
        grants: { evidence: [{ id: 'ev_sillokcheong', level: 1 }, { id: 'ev_sillok_done' }] },
        note: '관측한 원고 더미 — 선왕의 치세를 엮는 관청과 맞아떨어진다.',
      },
    ],
  },
  {
    id: 'se_gajang',
    provenance: F,
    terms: ['가장사초', '家藏史草', '사초', '史草', '집에 둔 사초', '사초 두 벌'],
    results: [{ kind: 'record', id: 'rec_sagwan_system' }],
    conditional: [
      {
        when: { evidence: ['ev_gajang'] },
        grants: { evidence: [{ id: 'ev_gajang', level: 1 }] },
        note: '안쪽 방의 종이 꾸러미 — 사관들이 집에 두었던 사초다.',
      },
    ],
  },
  {
    id: 'se_jouijemun',
    provenance: F,
    terms: ['조의제문', '弔義帝文', '점필재', '佔畢齋', '김종직', '金宗直'],
    results: [
      { kind: 'source', id: 'src_jouijemun' },
      { kind: 'person', id: 'per_kim_jongjik' },
      { kind: 'record', id: 'rec_alt_kim_jongjik' },
    ],
    grants: {
      collect: [
        { entryId: 'col_per_kim_jongjik', stage: 2 },
        { entryId: 'col_src_jouijemun', stage: 2 },
      ],
    },
    conditional: [
      {
        when: { all: ['f_heard_jouijemun'] },
        grants: { evidence: [{ id: 'ev_jouijemun', level: 1 }, { id: 'ev_jongjik_dead', level: 1 }] },
        note: '젊은 관원이 말한 글과 "돌아가신" 지은이 — 기록과 맞춰 보았다.',
      },
    ],
  },
  {
    // 말소된 기사: 관측에서 들은 전교. 복원 전에는 '해당 기사 없음'.
    id: 'se_sacho_order',
    provenance: F,
    noArticle: true,
    terms: ['김일손의 사초', '대내', '大內', '사초를 모두 대내로 들여오라', '전교', '傳敎', '6조목', '여섯 조목'],
    results: [],
    conditional: [
      {
        when: { all: ['f_saw_order'], none: ['restored_order'] },
        grants: {
          notebook: [
            {
              id: 'note_no_article',
              section: 'observed',
              text: '들은 전교를 검색했다 → 해당 기사 없음. 분명히 들었다. 여기 적어 둔다.',
              provenance: F,
            },
          ],
        },
      },
    ],
  },
  {
    id: 'se_gyeongguk',
    provenance: F,
    terms: ['경국대전', '經國大典', '을사대전'],
    results: [{ kind: 'source', id: 'src_gyeongguk' }],
    grants: { collect: [{ entryId: 'col_src_gyeongguk', stage: 2 }] },
    conditional: [
      {
        when: { evidence: ['ev_lawbook'] },
        grants: { evidence: [{ id: 'ev_lawbook', level: 1 }], collect: [{ entryId: 'col_src_gyeongguk', stage: 3 }] },
        note: '서안 위의 책. 다만 법전은 오래 쓰인다.',
      },
    ],
  },
  {
    id: 'se_sejo_sillok',
    provenance: F,
    terms: ['세조실록', '世祖實錄', '세조대왕 실록'],
    results: [{ kind: 'person', id: 'per_yi_geukdon' }],
    grants: { collect: [{ entryId: 'col_per_yi_geukdon', stage: 1 }] },
  },
  {
    id: 'se_jikpil',
    provenance: F,
    terms: ['직필', '直筆'],
    results: [{ kind: 'record', id: 'rec_sagwan_system' }],
  },

  // ── 선택 검색(호기심 보상, 직접 입력) ─────────────────────
  {
    id: 'se_yi_geukdon',
    provenance: F,
    optional: true,
    terms: ['이극돈', '李克墩', '李克敦'],
    results: [
      { kind: 'person', id: 'per_yi_geukdon' },
      { kind: 'record', id: 'rec_alt_yi_geukdon' },
      { kind: 'source', id: 'src_compile_order' },
    ],
    grants: { collect: [{ entryId: 'col_per_yi_geukdon', stage: 1 }] },
  },
  {
    id: 'se_yu_jagwang',
    provenance: F,
    optional: true,
    terms: ['유자광', '柳子光'],
    results: [{ kind: 'person', id: 'per_yu_jagwang' }],
    grants: { collect: [{ entryId: 'col_per_yu_jagwang', stage: 1 }] },
  },
  {
    id: 'se_eo_segyeom',
    provenance: F,
    optional: true,
    terms: ['어세겸', '魚世謙'],
    results: [{ kind: 'person', id: 'per_eo_segyeom' }],
    grants: { collect: [{ entryId: 'col_per_eo_segyeom', stage: 1 }] },
  },
  {
    id: 'se_chunchugwan',
    provenance: F,
    optional: true,
    terms: ['춘추관', '春秋館', '기사관', '記事官'],
    results: [{ kind: 'place', id: 'plc_chunchugwan' }],
    grants: { collect: [{ entryId: 'col_plc_chunchugwan', stage: 2 }] },
  },
  {
    id: 'se_sagwan',
    provenance: F,
    optional: true,
    terms: ['사관', '史官', '한림'],
    results: [{ kind: 'record', id: 'rec_sagwan_system' }],
  },
  {
    id: 'se_db',
    provenance: F,
    optional: true,
    terms: ['조선왕조실록', '통합 DB', '통합 역사 DB'],
    results: [{ kind: 'record', id: 'rec_db_overview' }],
  },
  {
    // 보정 사건 뒤에만 색인에 나타난다(가상). "변경 0건" — 플레이어만 아는 모순.
    id: 'se_correction',
    provenance: F,
    optional: true,
    terms: ['정합성 보정', '정합성', '보정', '야간 보정'],
    requires: { corrections: ['corr_001'] },
    results: [{ kind: 'record', id: 'rec_sys_log' }],
  },
];
