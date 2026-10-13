/**
 * 관측 권한 정지 면담(경고 3장). 오 실장과의 짧은 장면 → 경고장을 다시 읽는다 → 권한 복구, 근무 계속(게임 오버 없음).
 * 오 실장은 규정의 목소리지 악당이 아니다. 정답(연도·인물·사건)을 말하지 않는다.
 */
import type { InterviewDef } from '@/core/types';

const F = 'fictional' as const;
const CHIEF = '오 실장';

export const interviews: InterviewDef[] = [
  {
    id: 'iv_suspension',
    provenance: F,
    lines: [
      { from: '결록 단말', text: '관측 권한이 정지되었습니다 · 경고 3회 · 기록대조과 실장 면담 대기.' },
      { from: CHIEF, text: '07, 앉아.' },
      { from: CHIEF, text: '경고 세 장. 규정이야. 관측 권한 정지.' },
      { from: CHIEF, text: '종결 건 또 열었지. …뭘 찾는 건데.', when: { counters: [{ key: 'replays', min: 1 }] } },
    ],
    recapAfter: 2,
    choices: [
      { id: 'iv_sorry', text: '다시 읽어 보니 맞는 말이네요.', setsFlags: ['interview_accept'] },
      { id: 'iv_seen', text: '기록에 없는 걸 봤어요.', setsFlags: ['interview_seen'] },
    ],
    closing: [
      { from: CHIEF, text: '그래. 그럼 됐어.', when: { all: ['interview_accept'] } },
      { from: CHIEF, text: '…본 걸로는 안 돼. 근거가 있어야 돼. 그게 규정이야.', when: { all: ['interview_seen'] } },
      { from: CHIEF, text: '권한 복구해 둘게. 면담 한 번에 한 번. 그것도 규정이야.' },
    ],
  },
];
