/**
 * 에피소드 1 「한 사관의 흔적」 진행 스크립트(데이터만) — 결록 단말 버전.
 *  - 목표 완료 판정은 상태 조건(StateCondition)으로만 한다. 정답 내용은 여기 두지 않는다.
 *  - 프롤로그 본문·에필로그·예고는 메신저 메시지(src/data/terminal/messages.ts)로 전달된다. 여기에는
 *    데스크톱이 켜지기 전의 짧은 콜드 오픈과 목표(퀘스트)만 둔다.
 *  - 관측 중 보이는 목표 문구(app: 'viewer')에는 연도·왕대·인물 이름을 넣지 않는다.
 *  - 비트 구조는 docs/TERMINAL_DESIGN.md §레벨 디자인(기승전결) 비트 표를 따른다.
 *
 * 쓰이는 플래그(출처):
 *   prologue_anomaly·research_kim_ilson(se_kim_ilson) · research_takyeong(se_takyeong) · obs_link_001(m_dev_01)
 *   obs001_entered(obs_001) · obs001_returned(obs_001_return) · talked_order(m_c_05) · source_access(m_c_09 / m_sys_access)
 *   f_heard_myoho · f_saw_bundles · f_saw_lawbook · f_met_official · f_heard_jouijemun · f_saw_order · f_saw_sealing
 *   f_heard_alive · f_saw_red_desk (관측 #001) · corr_001_done(corr_001)
 *   ded_year_partial · ded_year_confirmed · ded_person_confirmed · ded_cause_confirmed (추리 보상)
 *   restored_order · restored_person · restored_event (기록하기 → 현실 이동)
 *   archive_center_seen(ex_center) · reply_*(메시지 답장, 분위기 전용)
 */
import type { AppId, FlagCondition, Id, Provenance, StateCondition } from '@/core/types';

export interface ScriptLine {
  speaker?: string;
  text: string;
  provenance: Provenance;
}

export interface ObjectiveCheck {
  state?: StateCondition;
  /** 도감 항목 중 단계 1 이상인 것의 수 */
  minCollectionDiscovered?: number;
}

export interface Objective {
  id: Id;
  text: string;
  /** 막혔을 때 보여 줄 힌트(정답을 말하지 않는다) */
  hint?: string;
  /** 이 목표를 수행하는 앱 */
  app?: AppId;
  optional?: boolean;
  /** 이 조건을 만족해야 목록에 나타난다 */
  showWhen?: StateCondition;
  doneWhen: ObjectiveCheck;
}

export interface Quest {
  id: Id;
  title: string;
  objectives: Objective[];
}

export interface EpisodeScript {
  id: Id;
  title: string;
  quests: Quest[];
  /** 새 게임: 데스크톱이 켜지기 전 콜드 오픈(입력 없음, 탭하면 넘어감) */
  coldOpen: ScriptLine[];
  /** 에필로그 메시지가 도착하는 조건(UI 가 전체 화면 연출을 겹칠 때 사용) */
  epilogueWhen: FlagCondition;
  /** 예고 메시지가 도착하는 조건 */
  teaserWhen: FlagCondition;
}

const F = 'fictional' as const;

export const EPISODE_1: EpisodeScript = {
  id: 'ep1',
  title: '한 사관의 흔적',
  coldOpen: [
    { text: '기록 분석실. 밤 11시.', provenance: F },
    { text: '모니터 하나만 켜져 있다. 그 옆에, 어젯밤 내가 쓴 노트.', provenance: F },
  ],
  epilogueWhen: { all: ['restored_order', 'restored_person', 'restored_event'] },
  teaserWhen: { all: ['restored_event', 'archive_center_seen'] },
  quests: [
    {
      id: 'q_prologue',
      title: '프롤로그 — 내가 쓴 단어',
      objectives: [
        {
          id: 'obj_cold',
          text: '어젯밤 노트의 단어를 검색한다.',
          app: 'notebook',
          doneWhen: { state: { searched: ['se_muo'] } },
        },
        {
          id: 'obj_read',
          text: '동료의 메시지를 읽는다.',
          app: 'messenger',
          showWhen: { searched: ['se_muo'] },
          doneWhen: { state: { read: ['m_c_01'] } },
        },
        {
          id: 'obj_check_db',
          text: '통합 DB 에서 그 사관을 검색한다.',
          app: 'search',
          showWhen: { read: ['m_c_01'] },
          doneWhen: { state: { all: ['prologue_anomaly'] } },
        },
        {
          id: 'obj_research_takyeong',
          text: '그 사관과 연결된 유물을 찾는다.',
          app: 'search',
          showWhen: { all: ['prologue_anomaly'] },
          doneWhen: { state: { all: ['research_takyeong'] } },
        },
        {
          id: 'obj_observe',
          text: '관측 뷰어를 연다.',
          app: 'viewer',
          showWhen: { all: ['obs_link_001'] },
          doneWhen: { state: { all: ['obs001_entered'] } },
        },
      ],
    },
    {
      id: 'q_observation',
      title: '관측 #001',
      objectives: [
        {
          id: 'obj_explore',
          text: '시간을 옮기며 관청 사람들의 말을 듣는다.',
          hint: '사람들은 시간에 따라 자리를 옮긴다. 안쪽 방과 대청을 모두 살펴보자.',
          app: 'viewer',
          showWhen: { all: ['obs001_entered'] },
          doneWhen: { state: { all: ['f_heard_myoho', 'f_saw_bundles', 'f_met_official'] } },
        },
        {
          id: 'obj_witness',
          text: '관청에 닿은 소식을 지켜본다.',
          hint: '아침부터 대문 쪽에서 누군가 기다리고 있었다.',
          app: 'viewer',
          showWhen: { all: ['f_met_official'] },
          doneWhen: { state: { all: ['f_saw_order', 'f_saw_sealing'] } },
        },
        {
          id: 'obj_return',
          text: '관측을 마친다.',
          app: 'viewer',
          showWhen: { all: ['f_saw_sealing'] },
          doneWhen: { state: { all: ['obs001_returned'] } },
        },
      ],
    },
    {
      id: 'q_research',
      title: '대조와 추리',
      objectives: [
        {
          id: 'obj_order_search',
          text: '관측에서 들은 말을 검색한다.',
          app: 'search',
          showWhen: { all: ['obs001_returned'] },
          doneWhen: { state: { searched: ['se_sacho_order'] } },
        },
        {
          id: 'obj_person',
          text: '증거 보드: 붉은 관복의 당상은 누구인가?',
          hint: '그가 맡은 자리, 그리고 예전에 맡았던 일.',
          app: 'board',
          showWhen: { all: ['obs001_returned'] },
          doneWhen: { state: { all: ['ded_person_confirmed'] } },
        },
        {
          id: 'obj_crosscheck',
          text: '들은 말을 검색하고, 원문의 구절로 카드를 검증한다.',
          hint: '들은 칭호, 거둬 온 꾸러미. 각각 맞는 기록이 있다.',
          app: 'search',
          showWhen: { all: ['source_access'] },
          doneWhen: { state: { minStats: { phrases: 2 } } },
        },
        {
          id: 'obj_year',
          text: '증거 보드: 관측 #001 은 언제인가?',
          hint: '오래 쓰인 물건은 시점을 정하지 못한다. 시작과 끝을 각각 막아 주는 증거를 찾자.',
          app: 'board',
          showWhen: { all: ['source_access'] },
          doneWhen: { state: { all: ['ded_year_confirmed'] } },
        },
        {
          id: 'obj_link',
          text: '증거 보드: 본 것과 기록된 것을 겹쳐 본다.',
          hint: '같은 달의 이름들도 기록이다.',
          app: 'board',
          showWhen: { all: ['ded_year_partial'] },
          doneWhen: { state: { evidence: ['ev_same_month'] } },
        },
        {
          id: 'obj_record_order',
          text: '손 노트: 확정한 사실을 손으로 기록한다.',
          app: 'notebook',
          showWhen: { all: ['ded_year_confirmed'] },
          doneWhen: { state: { all: ['restored_order'] } },
        },
        {
          id: 'obj_cause',
          text: '증거 보드: 같은 달, 세 사람은 왜 죽었나?',
          hint: '화살표마다 근거가 있어야 한다. 무엇이 무엇을 낳았는가.',
          app: 'board',
          showWhen: { all: ['ded_year_partial', 'restored_order'] },
          doneWhen: { state: { all: ['ded_cause_confirmed'] } },
        },
        {
          id: 'obj_record_cause',
          text: '손 노트: 그 까닭을 손으로 기록한다.',
          app: 'notebook',
          showWhen: { all: ['ded_cause_confirmed'] },
          doneWhen: { state: { all: ['restored_event'] } },
        },
        {
          id: 'obj_record_person',
          text: '손 노트: 당상에 관한 한 줄을 기록한다.',
          app: 'notebook',
          showWhen: { all: ['ded_person_confirmed', 'restored_order'] },
          doneWhen: { state: { all: ['restored_person'] } },
        },
      ],
    },
    {
      id: 'q_archive',
      title: '기록관',
      objectives: [
        {
          id: 'obj_collect8',
          text: '도감 항목 8개 이상을 발견한다.',
          app: 'notebook',
          doneWhen: { minCollectionDiscovered: 8 },
        },
        {
          id: 'obj_archive_center',
          text: '기록관 중앙 진열대에 관측 #001 기록을 놓는다.',
          app: 'notebook',
          showWhen: { all: ['restored_event'] },
          doneWhen: { state: { all: ['archive_center_seen'] } },
        },
        {
          id: 'obj_collect_all',
          text: '(선택) 도감 18개 항목을 모두 발견한다.',
          app: 'notebook',
          optional: true,
          doneWhen: { minCollectionDiscovered: 18 },
        },
      ],
    },
  ],
};

/** 관측 중 메타데이터 패널 문구(UI 가 연도·장소를 표시하지 않도록 고정 문자열) */
export const OBSERVATION_HUD = ['관측 #001', '시대: 미상', '연도: ####', '장소: 미확인', '인물: 미확인', '관측 기록: 작성 중'];

/** 손 노트 여백의 메모(디에게틱 힌트). 조건이 되면 노트 여백에 연필 글씨로 보인다. 정답을 쓰지 않는다. */
export const NOTEBOOK_MARGINS: { id: Id; text: string; when: StateCondition; provenance: Provenance }[] = [
  { id: 'mg_cold', text: '무엇을 조사하고 있었지? 단어 하나만 남았다.', when: { searched: ['se_muo'] }, provenance: F },
  { id: 'mg_deaths', text: '같은 달, 세 사람. 이유는 한 줄도 없다.', when: { all: ['prologue_anomaly'] }, provenance: F },
  { id: 'mg_sources', text: '들은 말은 기록과 맞춰 봐야 증거가 된다.', when: { all: ['obs001_entered'] }, provenance: F },
  { id: 'mg_titles', text: '칭호는 언제 생겼나? 관청은 언제 섰다가 언제 닫혔나?', when: { all: ['f_heard_myoho'] }, provenance: F },
  { id: 'mg_old', text: '오래 쓰인 물건으로는 해를 정하지 말 것.', when: { all: ['f_saw_lawbook'] }, provenance: F },
  { id: 'mg_time', text: '같은 자리도 시각이 다르면 다른 것이 보인다.', when: { minStats: { scrubs: 1 } }, provenance: F },
  { id: 'mg_correction', text: '메모는 지워졌다. 종이에는 남아 있다.', when: { corrections: ['corr_001'] }, provenance: F },
  { id: 'mg_shift', text: '아무도 바뀌기 전을 기억하지 못한다. 그래서 여기 적는다.', when: { all: ['restored_order'] }, provenance: F },
];
