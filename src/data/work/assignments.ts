/**
 * 업무 — 좌표 손상 건 #C-2217 의 배정(헤더·참조). v4: 체크리스트는 없다 — 근무의 건(data/duty/cases.ts)이 이 배정을 가리킨다.
 *  - 배정 화면에는 해결 전까지 4자리 연도·실존 인물 이름을 쓰지 않는다(테스트). 참조는 제목만.
 *  - 좌표는 통합 역사 DB 관리단이 간접 기록 3건이 겹치는 기록 없는 지점으로 자동 탐지(삼각측량). 탐지 한 줄만 보여 주고 남은 참조 수 같은 계기판은 두지 않는다.
 *  - 과거의 장소는 언제나 「『성종실록』 편찬 실록청」으로 적는다(플레이어의 기관 실록청과 구별).
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
    detection: '좌표 #C-2217 · 일시 #### · 이 지점을 가리키는 기록 3건에서 자동 탐지',
    header: [
      { key: 'when', label: '일시', value: '####' },
      { key: 'place', label: '장소', value: '미확인(기록상: 『성종실록』 편찬 실록청)' },
    ],
    refs: [
      { title: '이 지점을 가리키는 기록 — 「『성종실록』 편찬 실록청」 편찬 기록', recordId: 'rec_seongjong_sillok' },
      { title: '이 지점을 가리키는 기록 — 그 실록청 당상의 인물 기록', recordId: 'rec_alt_yi_geukdon' },
      { title: '이 지점을 가리키는 기록 — 해당일 실록 기사: 특이사항 없음', searchEntryId: 'se_order' },
    ],
    timelineId: 'tl_obs001',
    autoClassification: '자동 분류: 관측 오류(장비 노이즈) · 종결',
    reportId: 'rep_c2217',
  },
];
