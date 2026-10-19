/** 역사 고정과 복원(DESIGN_V6 §6.7, §6.8). 구멍 안 풀이는 lines.ts RESTORED_MODERN(복원 뒤에만 로드) */
import type { FixSpec, Monologue } from '@/core/v6/types';

export const FIX: FixSpec = {
  line: 'L_holed',
  restoredModernLine: 'm_tail',
  /** 복원 2박자: 이웃 기록이 돌아온다 */
  returns: ['N9', 'N11', 'N8'],
  citationLabel: '『세종실록』 103권, 세종 26년 2월 20일 경자',
  monologue: ['mo_restore'],
  firstFixHint: 'ev.goal',
};

/** 07 독백(fictional). 한 선임 줄이 아니다 */
export const MONOLOGUES: Monologue[] = [
  { id: 'mo_B', provenance: 'fictional', lines: ['상소… 받은 사람이 언문을 만들었다고?'] },
  { id: 'mo_E', provenance: 'fictional', lines: ['그런데 이 칸엔 기록의 말이 들어가야 해. 그가 누구인지.'] },
  {
    id: 'mo_restore',
    provenance: 'fictional',
    postRestore: true,
    lines: ['상소는 언문을 지은 사람에게 올린 글이었다.', '한글을 지은 임금, 세종.', '그 칸이 비어 있었다는 것은 이제 관측기 기록에만 남아 있다.'],
  },
];
