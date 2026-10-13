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
 *   obs001_entered(obs_001) · obs001_returned(obs_001_return) · app_reader(m_c_08 / m_sys_reader)
 *   f_heard_myoho · f_saw_bundles · f_saw_lawbook · f_met_official · f_heard_jouijemun · f_saw_order · f_saw_sealing
 *   f_heard_alive · f_saw_red_desk (관측 #001) · corr_001_done(corr_001)
 *   ded_year_partial · ded_year_confirmed · ded_person_confirmed · ded_event_confirmed (추리 보상)
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
    { text: '모니터 하나만 켜져 있다. 결록 단말.', provenance: F },
  ],
  epilogueWhen: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
  teaserWhen: { all: ['ded_event_confirmed', 'archive_center_seen'] },
  quests: [
    {
      id: 'q_prologue',
      title: '프롤로그 — 이상',
      objectives: [
        {
          id: 'obj_read',
          text: '동료의 메시지를 읽는다.',
          app: 'messenger',
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
          hint: '사람들은 시간에 따라 자리를 옮긴다. 곳간과 대청을 모두 살펴보자.',
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
          id: 'obj_person',
          text: '증거 보드: 붉은 관복의 당상은 누구인가?',
          hint: '그가 맡은 자리, 그리고 예전에 맡았던 일.',
          app: 'board',
          showWhen: { all: ['obs001_returned'] },
          doneWhen: { state: { all: ['ded_person_confirmed'] } },
        },
        {
          id: 'obj_crosscheck',
          text: '들은 말을 검색하고, 사료의 구절로 카드를 검증한다.',
          hint: '들은 칭호, 거둬 온 꾸러미, 문제가 된 글, 왕의 명. 각각 맞는 기록이 있다.',
          app: 'reader',
          showWhen: { all: ['app_reader'] },
          doneWhen: { state: { minStats: { phrases: 3 } }, minCollectionDiscovered: 12 },
        },
        {
          id: 'obj_year',
          text: '증거 보드: 관측 #001 은 언제인가?',
          hint: '오래 쓰인 물건은 시점을 정하지 못한다. 시작과 끝을 각각 막아 주는 증거를 찾자.',
          app: 'board',
          showWhen: { all: ['app_reader'] },
          doneWhen: { state: { all: ['ded_year_confirmed'] } },
        },
        {
          id: 'obj_event',
          text: '증거 보드: 관청에서 무슨 일이 벌어졌는가?',
          hint: '평소와 달랐던 것은 무엇이었나. 그리고 그 뒤 실록은 어떻게 되었나.',
          app: 'board',
          showWhen: { all: ['ded_year_partial'] },
          doneWhen: { state: { all: ['ded_event_confirmed'] } },
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
          app: 'archive',
          doneWhen: { minCollectionDiscovered: 8 },
        },
        {
          id: 'obj_archive_center',
          text: '기록관 중앙 진열대에 관측 #001 기록을 놓는다.',
          app: 'archive',
          showWhen: { all: ['ded_event_confirmed'] },
          doneWhen: { state: { all: ['archive_center_seen'] } },
        },
        {
          id: 'obj_collect_all',
          text: '(선택) 도감 18개 항목을 모두 발견한다.',
          app: 'archive',
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
  { id: 'mg_sources', text: '들은 말은 사료와 맞춰 봐야 증거가 된다.', when: { all: ['obs001_entered'] }, provenance: F },
  { id: 'mg_titles', text: '칭호는 언제 생겼나? 관청은 언제 섰다가 언제 닫혔나?', when: { all: ['f_heard_myoho'] }, provenance: F },
  { id: 'mg_old', text: '오래 쓰인 물건으로는 해를 정하지 말 것.', when: { all: ['f_saw_lawbook'] }, provenance: F },
  { id: 'mg_time', text: '같은 자리도 시각이 다르면 다른 것이 보인다.', when: { minStats: { scrubs: 1 } }, provenance: F },
  { id: 'mg_correction', text: '0.998. 분명히 봤다. 여기 적었다.', when: { corrections: ['corr_001'] }, provenance: F },
];
