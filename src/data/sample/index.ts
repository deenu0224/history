/**
 * ⚠ PLACEHOLDER — 엔진/테스트 구동용 가상 샘플. 실제 역사 콘텐츠가 아니다.
 * 모든 항목은 provenance 'fictional', id 는 'sample_' 접두사.
 * 실제 에피소드 콘텐츠가 들어오면 src/data/index.ts 의 INCLUDE_SAMPLE 을 false 로 바꾼다.
 * (테스트는 이 파일을 직접 import 하므로 계속 동작한다.)
 */
import type { ContentModule, Fact } from '@/core/types';

const F = 'fictional' as const;
const office: Fact = { kind: 'office', value: '샘플 사관직' };
const zitherFact: Fact = { kind: 'possession', value: '샘플 거문고' };
const orderFact: Fact = { kind: 'claim', value: '왕명으로 기록됨' };
const noPetitionFact: Fact = { kind: 'claim', value: '신하의 청원 기록 없음' };

export const SAMPLE_SCENE = 'sample_scene_office';

export const sample: ContentModule = {
  persons: [
    {
      id: 'sample_person_scribe',
      provenance: F,
      name: '샘플 인물 갑',
      summary: '테스트용 가상 사관.',
      facts: [office, zitherFact, { kind: 'name', value: '갑' }],
    },
    {
      id: 'sample_person_minister',
      provenance: F,
      name: '샘플 인물 을',
      summary: '테스트용 가상 관료.',
      facts: [{ kind: 'office', value: '샘플 판서직' }, { kind: 'name', value: '을' }],
    },
    {
      id: 'sample_person_scholar',
      provenance: F,
      name: '샘플 인물 병',
      summary: '테스트용 가상 사관(소유물로 구별).',
      facts: [office, { kind: 'possession', value: '샘플 서책' }, { kind: 'name', value: '병' }],
    },
  ],
  artifacts: [
    {
      id: 'sample_artifact_zither',
      provenance: F,
      name: '샘플 거문고',
      made: { from: 1490, estimated: true },
      summary: '테스트용 가상 유물.',
      sourceIds: ['sample_source_record'],
    },
  ],
  sources: [
    {
      id: 'sample_source_record',
      provenance: F,
      title: '샘플 기록',
      summary: '테스트용 가상 사료.',
      excerpt: '왕이 명하여 게시문을 붙이게 하였다. 청원은 없었다.',
    },
  ],
  events: [
    {
      id: 'sample_event_a',
      provenance: F,
      name: '샘플 사건',
      year: 1498,
      personIds: ['sample_person_scribe'],
      placeId: 'sample_place_office',
      summary: '테스트용 가상 사건.',
    },
  ],
  places: [{ id: 'sample_place_office', provenance: F, name: '샘플 관청', summary: '테스트용 가상 장소.' }],

  evidence: [
    {
      id: 'sample_ev_unknown_official',
      provenance: F,
      category: 'person',
      levels: [
        { label: '미확인 관료', text: '붓을 들고 무언가 적는 관료.', proves: [office] },
        { label: '샘플 인물 갑', text: '신원이 확인된 관료.', proves: [{ kind: 'name', value: '갑' }] },
      ],
    },
    {
      id: 'sample_ev_zither',
      provenance: F,
      category: 'object',
      levels: [
        {
          label: '오래된 거문고',
          text: '손때가 많이 묻은 거문고.',
          time: { notBefore: 1490, strength: 'weak', weakReason: '장기간 사용된 물건' },
        },
        { label: '관료의 거문고', text: '관료가 아끼는 거문고.', proves: [zitherFact] },
      ],
    },
    {
      id: 'sample_ev_edict',
      provenance: F,
      category: 'document',
      levels: [{ label: '관청 게시문', text: '새로 붙은 게시문.', time: { notBefore: 1498, strength: 'decisive' } }],
    },
    {
      id: 'sample_ev_calendar',
      provenance: F,
      category: 'document',
      levels: [
        { label: '낡은 책력', text: '표지가 찢긴 책력.' },
        { label: '올해의 책력', text: '올해 것으로 보이는 책력.', time: { notAfter: 1498, strength: 'decisive' } },
      ],
    },
    {
      id: 'sample_ev_rumor',
      provenance: F,
      category: 'testimony',
      levels: [
        {
          label: '하급 관리의 소문',
          text: '몇 해 전 일을 이야기한다.',
          time: { notBefore: 1495, notAfter: 1501, strength: 'supporting' },
        },
      ],
    },
    { id: 'sample_ev_book', provenance: F, category: 'object', levels: [{ label: '서책', text: '제목 없는 서책.' }] },
    {
      id: 'sample_ev_order_record',
      provenance: F,
      category: 'document',
      levels: [{ label: '기록 초안', text: '왕명이라 적힌 초안.', proves: [orderFact] }],
    },
    {
      id: 'sample_ev_petition_log',
      provenance: F,
      category: 'document',
      levels: [{ label: '청원 목록', text: '해당 건의 청원이 보이지 않는다.', proves: [noPetitionFact] }],
    },
  ],

  deductions: [
    {
      id: 'sample_ded_year',
      kind: 'year',
      provenance: F,
      title: '관측 연도',
      prompt: '이 장면은 언제인가?',
      target: { from: 1498, to: 1498 },
      context: { from: 1392, to: 1910 },
      maxPartialWidth: 10,
      relevantEvidence: ['sample_ev_edict', 'sample_ev_calendar', 'sample_ev_rumor', 'sample_ev_zither'],
      rewards: {
        partial: [{ type: 'flag', flag: 'sample_year_partial' }],
        confirmed: [
          { type: 'flag', flag: 'sample_year_confirmed' },
          { type: 'collection', entryId: 'sample_col_event', stage: 3 },
          { type: 'notebook', note: { id: 'sample_note_year', section: 'verified', text: '관측 연도를 특정했다.' } },
          { type: 'resolveQuestion', noteId: 'sample_q_when' },
        ],
      },
    },
    {
      id: 'sample_ded_person',
      kind: 'person',
      provenance: F,
      title: '미확인 관료',
      prompt: '이 관료는 누구인가?',
      subjectEvidenceId: 'sample_ev_unknown_official',
      candidates: ['sample_person_scribe', 'sample_person_minister', 'sample_person_scholar'],
      answer: 'sample_person_scribe',
      requiredFacts: [office, zitherFact],
      relevantEvidence: ['sample_ev_unknown_official', 'sample_ev_zither'],
      rewards: {
        confirmed: [
          { type: 'evidence', evidenceId: 'sample_ev_unknown_official', level: 1 },
          { type: 'collection', entryId: 'sample_col_person', stage: 2 },
        ],
      },
    },
    {
      id: 'sample_ded_event',
      kind: 'event',
      provenance: F,
      title: '기록의 서술',
      prompt: '왕은 이 일을 어떻게 하였는가?',
      eventId: 'sample_event_a',
      statements: [
        { id: 'ordered', text: '명하였다' },
        { id: 'permitted', text: '허락하였다', refutedBy: [noPetitionFact] },
        { id: 'tolerated', text: '묵인하였다', refutedBy: [orderFact] },
      ],
      answer: 'ordered',
      requiredFacts: [orderFact, noPetitionFact],
      relevantEvidence: ['sample_ev_order_record', 'sample_ev_petition_log'],
      rewards: { confirmed: [{ type: 'collection', entryId: 'sample_col_event', stage: 4 }] },
    },
  ],

  observations: [
    {
      id: 'sample_obs_courtyard',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      title: '관청 마당',
      lines: ['관료들이 게시문 앞에 모여 있다.'],
      grants: {
        evidence: [{ id: 'sample_ev_edict' }],
        notebook: [{ id: 'sample_note_board', section: 'observed', text: '새 게시문이 붙었다.' }],
      },
    },
  ],

  worldObjects: [
    {
      id: 'sample_obj_board',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      x: 4,
      y: 3,
      spriteKey: 'sample_board',
      kind: 'observe',
      label: '게시판',
      examine: ['종이가 여러 장 붙어 있다.'],
      grants: { observation: 'sample_obs_courtyard', collect: [{ entryId: 'sample_col_place' }] },
    },
    {
      id: 'sample_obj_zither',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      x: 8,
      y: 5,
      spriteKey: 'sample_zither',
      kind: 'object',
      label: '현악기',
      examine: ['줄이 여섯 개인 악기다.'],
      grants: { evidence: [{ id: 'sample_ev_zither' }], collect: [{ entryId: 'sample_col_zither' }] },
    },
    {
      id: 'sample_obj_desk',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      x: 10,
      y: 2,
      spriteKey: 'sample_desk',
      kind: 'object',
      label: '서안',
      examine: ['서류가 쌓여 있다.'],
      requires: 'sample_flag_desk_open',
      grants: {
        evidence: [
          { id: 'sample_ev_calendar', level: 1 },
          { id: 'sample_ev_book' },
          { id: 'sample_ev_order_record' },
          { id: 'sample_ev_petition_log' },
        ],
        collect: [{ entryId: 'sample_col_source' }],
        flags: ['sample_desk_searched'],
      },
    },
  ],

  npcs: [
    {
      id: 'sample_npc_scribe',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      spriteKey: 'sample_official',
      label: '미확인 관료',
      personId: 'sample_person_scribe',
      schedule: [
        { time: 480, x: 2, y: 2 },
        { time: 720, x: 9, y: 5, action: 'write' },
      ],
      dialogue: [
        {
          id: 'greet',
          provenance: F,
          text: '(관측자를 보지 못한다.)',
          grants: {
            evidence: [{ id: 'sample_ev_unknown_official' }],
            collect: [{ entryId: 'sample_col_person' }],
            notebook: [{ id: 'sample_q_when', section: 'question', text: '지금은 언제인가?' }],
          },
        },
        {
          id: 'rumor',
          provenance: F,
          text: '몇 해 전 그 일 이후로…',
          when: { all: ['sample_desk_searched'] },
          grants: {
            evidence: [{ id: 'sample_ev_rumor' }],
            notebook: [{ id: 'sample_note_rumor', section: 'testimony', text: '몇 해 전 일을 언급했다.' }],
          },
        },
      ],
    },
  ],

  collection: [
    {
      id: 'sample_col_zither',
      provenance: F,
      category: 'artifact',
      refId: 'sample_artifact_zither',
      title: '샘플 거문고',
      unidentifiedTitle: '오래된 현악기',
      fields: [
        { key: 'look', label: '외형', value: '여섯 줄', unlockStage: 1 },
        { key: 'owner', label: '소유자', value: '샘플 인물 갑', unlockStage: 3 },
      ],
      links: ['sample_col_person'],
    },
    {
      id: 'sample_col_person',
      provenance: F,
      category: 'person',
      refId: 'sample_person_scribe',
      title: '샘플 인물 갑',
      unidentifiedTitle: '미확인 관료',
      fields: [{ key: 'office', label: '관직', value: '샘플 사관직', unlockStage: 2 }],
    },
    {
      id: 'sample_col_event',
      provenance: F,
      category: 'event',
      refId: 'sample_event_a',
      title: '샘플 사건',
      unidentifiedTitle: '알 수 없는 사건',
      fields: [{ key: 'year', label: '연도', value: '1498', unlockStage: 3 }],
    },
    {
      id: 'sample_col_place',
      provenance: F,
      category: 'place',
      refId: 'sample_place_office',
      title: '샘플 관청',
      unidentifiedTitle: '어느 관청',
      fields: [],
    },
    {
      id: 'sample_col_source',
      provenance: F,
      category: 'source',
      refId: 'sample_source_record',
      title: '샘플 기록',
      unidentifiedTitle: '오래된 문서',
      fields: [],
    },
  ],
  // ── 단말(샘플) ──
  apps: [
    { id: 'sample_app_messenger', provenance: F, app: 'messenger', title: '메신저', iconKey: 'icon', order: 0 },
    { id: 'sample_app_search', provenance: F, app: 'search', title: '검색', iconKey: 'icon', order: 1 },
    { id: 'sample_app_viewer', provenance: F, app: 'viewer', title: '뷰어', iconKey: 'icon', order: 2 },
    {
      id: 'sample_app_notebook',
      provenance: F,
      app: 'notebook',
      title: '노트',
      iconKey: 'icon',
      order: 3,
      unlockWhen: { all: ['sample_desk_searched'] },
    },
    { id: 'sample_app_board', provenance: F, app: 'board', title: '보드', iconKey: 'icon', order: 4 },
  ],
  searchEntries: [
    {
      id: 'sample_se_record',
      provenance: F,
      terms: ['샘플 기록', '樣本'],
      results: [{ kind: 'source', id: 'sample_source_record' }],
      grants: { collect: [{ entryId: 'sample_col_source', stage: 1 }] },
      conditional: [
        { when: { all: ['sample_desk_searched'] }, grants: { flags: ['sample_record_linked'] }, note: '서안의 문서와 같다.' },
      ],
    },
  ],
  records: [
    { id: 'sample_rec_meta', provenance: F, title: '샘플 메타', fields: [{ key: 'xref', label: '밀도', value: '0.9' }] },
  ],
  phrases: [
    {
      id: 'sample_ph_order',
      provenance: F,
      sourceId: 'sample_source_record',
      text: '왕이 명하여',
      when: { evidence: ['sample_ev_order_record'] },
      grants: { flags: ['sample_phrase_ok'] },
    },
  ],
  timelines: [
    {
      id: 'sample_tl',
      provenance: F,
      sceneId: SAMPLE_SCENE,
      observationId: 'sample_obs_courtyard',
      title: '샘플 관측',
      start: 480,
      end: 900,
      initial: 480,
      camera: { x: 4, y: 3 },
      meta: [{ label: '연도', value: '####' }],
      hotspots: [
        { id: 'hs_sample_npc_scribe', targetId: 'sample_npc_scribe', kind: 'npc' },
        { id: 'hs_sample_obj_zither', targetId: 'sample_obj_zither', kind: 'object', windows: [{ from: 600, to: 700 }] },
        {
          id: 'hs_sample_obj_desk',
          targetId: 'sample_obj_desk',
          kind: 'object',
          visibleWhen: { all: ['sample_flag_desk_open'] },
        },
      ],
    },
  ],
  messages: [
    { id: 'sample_m1', provenance: F, thread: 'colleague', from: '샘플', text: '안녕.', order: 0, grants: { terms: ['샘플 기록'] } },
    {
      id: 'sample_m2',
      provenance: F,
      thread: 'colleague',
      from: '샘플',
      text: '찾았어?',
      order: 1,
      when: { searched: ['sample_se_record'] },
      choices: [{ id: 'yes', text: '응', setsFlags: ['sample_reply_yes'] }],
    },
    {
      id: 'sample_m3',
      provenance: F,
      thread: 'system',
      from: '단말',
      text: '서안 열람 권한.',
      order: 2,
      when: { searched: ['sample_se_record'], minStats: { searches: 3 } },
      grants: { flags: ['sample_flag_desk_open'] },
    },
  ],
  memos: [{ id: 'sample_memo', provenance: F, title: '메모', text: '0.9', when: {} }],
  corrections: [
    {
      id: 'sample_corr',
      provenance: F,
      trigger: { all: ['sample_reply_yes'] },
      recordPatches: [{ recordId: 'sample_rec_meta', key: 'xref', value: '0.5' }],
      memoPatches: [{ memoId: 'sample_memo', text: '0.5' }],
      grants: { flags: ['sample_corrected'] },
    },
  ],
  exhibits: [
    {
      id: 'sample_ex',
      provenance: F,
      title: '샘플 전시',
      slot: 'case',
      spriteKey: 'sample_zither',
      requires: { evidence: ['sample_ev_zither'] },
      lines: ['거문고가 놓였다.'],
      grants: { collect: [{ entryId: 'sample_col_zither', stage: 3 }] },
    },
  ],
  tutorial: [
    {
      id: 'sample_tut_search',
      provenance: F,
      order: 0,
      app: 'search',
      target: 'search.chip',
      coach: '검색해 보세요.',
      showWhen: {},
      doneWhen: { searched: ['sample_se_record'] },
      failOn: ['unknown_search'],
      hints: ['넛지', '방향', '근접'],
      idleSeconds: 40,
    },
  ],
  help: [{ id: 'sample_help', provenance: F, app: 'search', title: '검색', lines: ['검색합니다.'] }],
};
