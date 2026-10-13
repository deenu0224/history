/**
 * 에피소드 1 「한 사관의 흔적」 진행 스크립트(데이터만). UI/연결부가 읽어 퀘스트 목표·프롤로그·에필로그를 띄운다.
 *  - 목표 완료 판정은 플래그(FlagCondition)·도감 발견 수로만 한다. 정답 내용은 여기 두지 않는다.
 *  - 과거 장면 중에 보이는 문구(OBSERVATION 목표)에는 연도·왕대·인물 이름을 넣지 않는다.
 *  - 모든 줄에 provenance. 연구소·관측·말소는 fictional.
 *
 * 쓰이는 플래그(출처):
 *   prologue_anomaly(lab_db_console) · research_takyeong(lab_case_takyeong) · research_kim_ilson(lab_person_terminal)
 *   obs001_entered(obs_001) · obs001_returned(obs_001_return)
 *   f_heard_myoho · f_saw_bundles · f_saw_lawbook · f_met_official · f_heard_jouijemun · f_saw_order · f_saw_sealing (관측 #001)
 *   ded_year_partial · ded_year_confirmed · ded_person_confirmed · ded_event_confirmed (추리 보상)
 *   archive_center_seen(arc_center_case)
 */
import type { FlagCondition, Id, Provenance } from '@/core/types';

export interface ScriptLine {
  speaker?: string;
  text: string;
  provenance: Provenance;
}

export interface ObjectiveCheck {
  flags?: FlagCondition;
  /** 도감 항목 중 단계 1 이상인 것의 수 */
  minCollectionDiscovered?: number;
}

export interface Objective {
  id: Id;
  text: string;
  /** 막혔을 때 보여 줄 힌트(정답을 말하지 않는다) */
  hint?: string;
  sceneId?: Id;
  optional?: boolean;
  /** 이 조건을 만족해야 목록에 나타난다 */
  showWhen?: FlagCondition;
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
  /** 새 게임 시작 시 연구실에서 */
  prologue: ScriptLine[];
  /** 귀환 직후 기록관에서(obs_001_return 관측 문구 뒤) */
  afterReturn: ScriptLine[];
  /** 세 추리를 모두 확정한 뒤 */
  epilogue: ScriptLine[];
  epilogueWhen: FlagCondition;
  /** 에필로그 뒤, 다음 미스터리 예고 */
  teaser: ScriptLine[];
  teaserWhen: FlagCondition;
}

const F = 'fictional' as const;
const V = 'verified' as const;

export const EPISODE_1: EpisodeScript = {
  id: 'ep1',
  title: '한 사관의 흔적',
  prologue: [
    { text: '기록 분석실. 밤 11시. 모니터 세 대만 켜져 있다.', provenance: F },
    { speaker: '연구원', text: '…또 이 구간이야.', provenance: F },
    {
      text: '조선왕조실록 교차 참조 지도. 한 사관을 둘러싼 선들이 지나치게 고르게 놓여 있다.',
      provenance: F,
    },
    { speaker: '동료 연구원', text: '데이터상 정상이야. 날짜도, 출처도, 원본 대조도 전부 통과.', provenance: F },
    { speaker: '동료 연구원', text: '너무 매끄럽다는 건 오류가 아니라 칭찬 아니야?', provenance: F },
    { speaker: '연구원', text: '…그러니까 이상한 거야.', provenance: F },
    { text: '동료가 퇴근한 뒤에도, 그 매끄러움은 화면에 남아 있었다.', provenance: F },
  ],
  afterReturn: [
    { speaker: '연구원', text: '들은 말, 본 것. 전부 노트에 남았다.', provenance: F },
    { speaker: '연구원', text: '이제 분석실 단말로 하나씩 사료와 맞춰 보자.', provenance: F },
  ],
  epilogueWhen: { all: ['ded_year_confirmed', 'ded_person_confirmed', 'ded_event_confirmed'] },
  epilogue: [
    {
      text: '1498년 음력 7월 11일. 왕은 한 사관의 사초를 대내로 들이라 명했다.',
      provenance: V,
    },
    {
      text: '당상들은 "임금이 만약 사초를 보면 후세에 직필이 없다"고 아뢰었고, 사초에서 여섯 조목이 뽑혀 올라갔다.',
      provenance: V,
    },
    {
      text: '이튿날부터 신문이 이어졌다. 김일손은 그달 처형되었고, 스승 김종직은 부관참시되었다.',
      provenance: V,
    },
    { text: '실록 편찬은 멈추지 않았다. 이듬해 『성종실록』이 완성되어 사고에 봉안되었다.', provenance: V },
    { speaker: '연구원', text: '기록을 남긴 사람이, 기록 때문에 사라졌다.', provenance: F },
    { speaker: '연구원', text: '그런데 그 기록들은 모두 제자리에 있다. 빠진 날도, 찢긴 장도 없이.', provenance: F },
    { speaker: '연구원', text: '그 매끄러움은, 이 비극 때문만은 아니다.', provenance: F },
  ],
  teaserWhen: { all: ['ded_event_confirmed', 'archive_center_seen'] },
  teaser: [
    { text: '기록관의 조명이 한 칸 어두워졌다가 돌아온다.', provenance: F },
    { text: 'DB 단말에 새 알림. 이상 징후 #002.', provenance: F },
    { text: '다른 시대, 다른 사관의 자료 주변에서 같은 매끄러움이 감지된다.', provenance: F },
    { text: '관측 장치가 새 연결을 찾고 있다. 아직 열리지 않는다.', provenance: F },
    { speaker: '연구원', text: '…이번에는, 누구지?', provenance: F },
  ],
  quests: [
    {
      id: 'q_prologue',
      title: '프롤로그 — 이상',
      objectives: [
        {
          id: 'obj_check_db',
          text: '통합 역사 DB 단말을 확인한다.',
          sceneId: 'lab',
          doneWhen: { flags: { all: ['prologue_anomaly'] } },
        },
        {
          id: 'obj_research_takyeong',
          text: '김일손과 연결된 유물 자료를 조사한다.',
          sceneId: 'lab',
          showWhen: { all: ['prologue_anomaly'] },
          doneWhen: { flags: { all: ['research_takyeong'] } },
        },
        {
          id: 'obj_research_person',
          text: '인물 사전 단말에서 김일손을 조회한다.',
          sceneId: 'lab',
          showWhen: { all: ['research_takyeong'] },
          doneWhen: { flags: { all: ['research_kim_ilson'] } },
        },
        {
          id: 'obj_observe',
          text: '관측 장치에 앉는다.',
          sceneId: 'lab',
          showWhen: { all: ['research_kim_ilson'] },
          doneWhen: { flags: { all: ['obs001_entered'] } },
        },
      ],
    },
    {
      id: 'q_observation',
      title: '관측 #001',
      objectives: [
        {
          id: 'obj_explore',
          text: '관청을 둘러보고 사람들의 말을 듣는다.',
          hint: '관원들은 시간에 따라 자리를 옮긴다. 곳간과 대청을 모두 살펴보자.',
          sceneId: 'obs001',
          doneWhen: { flags: { all: ['f_heard_myoho', 'f_saw_bundles', 'f_met_official'] } },
        },
        {
          id: 'obj_witness',
          text: '관청에 닿은 소식을 지켜본다.',
          hint: '붉은 관복의 관료를 만난 뒤, 대문 쪽을 살펴보자.',
          sceneId: 'obs001',
          showWhen: { all: ['f_met_official'] },
          doneWhen: { flags: { all: ['f_saw_order', 'f_saw_sealing'] } },
        },
        {
          id: 'obj_return',
          text: '회랑 끝의 관측 경계에서 귀환한다.',
          sceneId: 'obs001',
          showWhen: { all: ['f_saw_sealing'] },
          doneWhen: { flags: { all: ['obs001_returned'] } },
        },
      ],
    },
    {
      id: 'q_research',
      title: '대조와 추리',
      objectives: [
        {
          id: 'obj_crosscheck',
          text: '분석실의 단말과 서가에서 관측 내용을 사료와 대조한다.',
          hint: '들은 칭호, 거둬 온 꾸러미, 문제가 된 글, 왕의 명. 각각 맞는 자료가 있다.',
          sceneId: 'lab',
          showWhen: { all: ['obs001_returned'] },
          doneWhen: { flags: { all: ['obs001_returned'] }, minCollectionDiscovered: 12 },
        },
        {
          id: 'obj_year',
          text: '추론판: 관측 #001 은 언제인가?',
          hint: '오래 쓰인 물건은 시점을 정하지 못한다. 시작과 끝을 각각 막아 주는 증거를 찾자.',
          showWhen: { all: ['obs001_entered'] },
          doneWhen: { flags: { all: ['ded_year_confirmed'] } },
        },
        {
          id: 'obj_person',
          text: '추론판: 붉은 관복의 당상은 누구인가?',
          hint: '그가 맡은 자리, 그리고 예전에 맡았던 일.',
          showWhen: { all: ['f_met_official'] },
          doneWhen: { flags: { all: ['ded_person_confirmed'] } },
        },
        {
          id: 'obj_event',
          text: '추론판: 관청에서 무슨 일이 벌어졌는가?',
          hint: '평소와 달랐던 것은 무엇이었나. 그리고 그 뒤 실록은 어떻게 되었나.',
          showWhen: { all: ['f_saw_order'] },
          doneWhen: { flags: { all: ['ded_event_confirmed'] } },
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
          doneWhen: { minCollectionDiscovered: 8 },
        },
        {
          id: 'obj_archive_center',
          text: '기록관 중앙 진열대에 관측 #001 기록을 놓는다.',
          sceneId: 'archive',
          showWhen: { all: ['ded_event_confirmed'] },
          doneWhen: { flags: { all: ['archive_center_seen'] } },
        },
        {
          id: 'obj_collect_all',
          text: '(선택) 도감 17개 항목을 모두 발견한다.',
          optional: true,
          doneWhen: { minCollectionDiscovered: 17 },
        },
      ],
    },
  ],
};

/** 관측 중 HUD 문구(UI 가 연도·장소를 표시하지 않도록 고정 문자열) */
export const OBSERVATION_HUD = ['관측 #001', '시대: 미상', '연도: 미상', '장소: 미확인', '인물: 미확인', '관측 기록: 작성 중'];
