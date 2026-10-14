/**
 * 에피소드 1 연출 스크립트(데이터만). 승인된 프롤로그 8줄(DESIGN_V5 §12-1 교체본)과 콜드 오픈.
 *  - 콜드 오픈: 홈이 켜지기 전 짧은 줄(입력 없음, 탭하면 넘어감). UI_STYLE_GUIDE §2.1.
 *  - 관측(컷)에는 연도·장소·인물을 넣지 않는다.
 */
import type { Provenance } from '@/core/types';

export interface ScriptLine {
  speaker?: string;
  text: string;
  provenance: Provenance;
}

const F = 'fictional' as const;

export const EPISODE_1 = {
  id: 'ep1',
  title: '한 사관의 흔적',
  /** 첫 실행 프롤로그(세계관). 건너뛸 수 있다. */
  prologue: [
    { text: '언제부터인지, 역사가 사라지기 시작했다.', provenance: F },
    { text: '책장이 찢기는 것도, 파일이 지워지는 것도 아니다. 기록도, 기억도 — 처음부터 없었던 것처럼.', provenance: F },
    { text: '사람들은 그것을 「역사 소실」이라 부른다. 무엇이 사라졌는지는, 아무도 모른다.', provenance: F },
    { text: '정부는 오래전부터 알고 있었다. 그리고 소실의 영향을 받지 않는 장치를 만들었다. 관측기.', provenance: F },
    { text: '관측기는 과거를 직접 본다. 단, 그날을 기록으로 남긴 사람의 눈으로만.', provenance: F },
    { text: '實錄廳 실록청. 사라진 기록을 찾아 과거를 보고, 다시 적는 국가기관.', provenance: F },
    { text: '나는 그곳의 대조관이다. 남은 기록을 따라, 그 자리에 있던 사람의 눈을 빌린다.', provenance: F },
    { text: '그리고 사라진 하루를, 다시 적는다.', provenance: F },
  ] as ScriptLine[],
  coldOpen: [
    { text: '23:04. 기록대조과. 야근.', provenance: F },
    { text: '모니터에 배정 하나. 우선순위 낮음.', provenance: F },
  ] as ScriptLine[],
};
