/**
 * 업무 — 배정과 체크리스트. 문구는 docs/NARRATIVE_FIRST10.md(승인)와 DESIGN_V3 §5.
 *  - 배정 화면에는 해결 전까지 4자리 연도·실존 인물 이름을 쓰지 않는다(테스트). 참조는 제목만.
 *  - 체크리스트는 '참조 수렴 기록'에서 자동 생성된다는 설정(디에게틱). 도장 조건은 본 것·들은 것·찍은 것.
 */
import type { Assignment } from '@/core/types';

export const assignments: Assignment[] = [
  {
    id: 'as_c2217',
    provenance: 'fictional',
    code: '#C-2217',
    title: '좌표 손상 건',
    officer: '대조관 07',
    priority: '낮음',
    header: [
      { key: 'refs', label: '참조 수렴', value: '3건' },
      { key: 'when', label: '일시', value: '####' },
      { key: 'place', label: '장소', value: '미확인(참조: 실록청)' },
    ],
    refs: [
      { title: '참조 1 — 실록 편찬 관청(실록청) 기록', recordId: 'rec_seongjong_sillok' },
      { title: '참조 2 — 실록청 당상 인물 기록', recordId: 'rec_alt_yi_geukdon' },
      { title: '참조 3 — 해당일 실록 기사: 특이사항 없음', searchEntryId: 'se_order' },
    ],
    timelineId: 'tl_obs001',
    autoClassification: '자동 분류: 관측 오류(장비 노이즈) · 종결',
    reportId: 'rep_c2217',
    checklist: [
      {
        id: 'ck_place',
        no: 1,
        title: '장소 대조',
        refLabel: '실록청',
        prompt: '참조 기록이 가리키는 곳: 실록을 엮는 관청. 화면 속 장소가 맞는가.',
        teaches: ['look', 'stamp'],
        ready: { any: [{ seen: ['hs_obs_store_sacho'] }, { seen: ['hs_obs_hall_manuscript'] }, { seen: ['hs_obs_hall_desk_red'] }] },
        notReadyText: '아직 가까이 보지 않았다. 확대해서 보자.',
        expected: 'match',
        wrongText: '화면 속 서안과 사초 묶음이 참조 기록과 다른가? 다시 보자.',
      },
      {
        id: 'ck_person',
        no: 2,
        title: '인물 대조',
        refLabel: '실록청 당상',
        prompt: '참조 기록: 당상급 관원이 이곳에 있다. 찾아서 목소리를 프레임에 담을 것.',
        teaches: ['listen', 'capture'],
        ready: { clues: ['cl_dangsang'] },
        notReadyText: '그 사람의 목소리가 담긴 프레임이 아직 없다.',
        expected: 'match',
        wrongText: '프레임 속 그 사람은 참조 기록과 어긋나지 않는다.',
      },
      {
        id: 'ck_time',
        no: 3,
        title: '시각 대조',
        refLabel: '해당일 특이사항 없음',
        prompt: '참조 기록 기준: 이날은 아무 일도 없었다. 하루를 끝까지 볼 것.',
        teaches: ['scrub'],
        ready: { heard: ['m2'] },
        notReadyText: '하루를 끝까지 보자.',
        expected: 'mismatch',
        wrongText: "방금 들은 말이 '특이사항 없음'과 맞는가?",
      },
      {
        id: 'ck_verdict',
        no: 4,
        title: '판정',
        refLabel: '참조 수렴 3건',
        prompt: '참조 기록 기준: 해당일 특이사항 없음 → 노이즈 판정 권장',
        teaches: ['stamp'],
        ready: { stamped: ['ck_place', 'ck_person', 'ck_time'] },
        notReadyText: '위의 대조를 먼저 끝내자.',
        final: {
          recommend: 'match',
          recommendText: '참조 기록 기준: 해당일 특이사항 없음 → 노이즈 판정 권장',
          recommendButton: '일치(노이즈)',
          mismatchNeedsAnyClue: ['cl_order', 'cl_objection', 'cl_sealing', 'cl_alive', 'cl_jouijemun'],
          mismatchNeedsText: '불일치 판정에는 근거 프레임이 필요하다.',
        },
      },
    ],
  },
];
