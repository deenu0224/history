/**
 * 에피소드 1 연출 스크립트(데이터만). v3: 목표(퀘스트) 목록은 없다 — 업무의 체크리스트가 목표다.
 *  - 콜드 오픈: 데스크톱이 켜지기 전 짧은 줄(입력 없음, 탭하면 넘어감). docs/NARRATIVE_FIRST10.md.
 *  - 관측 HUD 에는 연도·장소·인물을 넣지 않는다.
 */
import type { Provenance, SourceRef, StateCondition } from '@/core/types';
import { REF } from './historical/refs';

export interface ScriptLine {
  speaker?: string;
  text: string;
  provenance: Provenance;
}

const F = 'fictional' as const;

export const EPISODE_1 = {
  id: 'ep1',
  title: '한 사관의 흔적',
  /**
   * 첫 실행 프롤로그(건너뛰기 가능). 설명 대신 소실을 눈앞에서 보여준다:
   * 실록 한 쪽에서 한 줄이 글자째 사라지고, 아래 줄이 올라와 빈칸 없이 메운다.
   * 사라지는 줄은 검증된 실록 원문 — 플레이어는 14:00 관측에서 이 말을 다시 듣는다.
   */
  prologue: {
    erased: {
      text: '김일손의 사초를 모두 대내로 들여오라.',
      provenance: 'verified' as Provenance,
      sources: [REF.sillokSachoOrder] as SourceRef[],
    },
    beats: [
      { text: '방금, 한 줄이 사라졌다.', provenance: F },
      { text: '빈칸은 남지 않는다. 찢긴 자국도. 기억도.', provenance: F },
      { text: '그래서 아무도 모른다.', provenance: F },
      { text: '實錄廳 기록대조과. 대조관 07.', provenance: F },
    ] as ScriptLine[],
  },
  coldOpen: [
    { text: '23:04. 기록대조과. 야근.', provenance: F },
    { text: '모니터에 배정 하나. 우선순위 낮음.', provenance: F },
  ] as ScriptLine[],
  /** 첫 10분이 끝나는 지점(오 실장의 보정 예고) */
  first10EndWhen: { read: ['m_chief_04'] } as StateCondition,
  /** 에필로그(복원) */
  epilogueWhen: { filed: ['rep_c2217'] } as StateCondition,
  /** 예고 */
  teaserWhen: { filed: ['rep_c2217'], opened: ['cr_c0408'] } as StateCondition,
};

export const OBSERVATION_HUD = ['좌표 #C-2217', '일시: ####', '장소: 미확인', '인물: 미확인'];
