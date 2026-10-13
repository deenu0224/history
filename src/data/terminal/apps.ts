/**
 * 결록 단말 앱과 잠금 조건. 한 박자에 새 앱 하나(닌텐도식 원칙 3) — TERMINAL_DESIGN §레벨 디자인 비트 표.
 *   B1 메신저·검색(시작) → B3 손 노트(첫 이상 감지) → B5 관측 뷰어(관측 지점 개방)
 *   → B9 증거 보드(관측 종료) → B11 기록관(첫 인물 확정) → B13 사료 뷰어(보정 사건 뒤 동료가 열어 줌)
 */
import type { AppDef } from '@/core/types';

const F = 'fictional' as const;

export const apps: AppDef[] = [
  { id: 'app_messenger', provenance: F, app: 'messenger', title: '메신저', iconKey: 'app_messenger', order: 0 },
  { id: 'app_search', provenance: F, app: 'search', title: '통합 DB 검색', iconKey: 'app_db', order: 1 },
  {
    id: 'app_notebook',
    provenance: F,
    app: 'notebook',
    title: '손 노트',
    iconKey: 'app_notebook',
    order: 2,
    unlockWhen: { all: ['prologue_anomaly'] },
  },
  {
    id: 'app_viewer',
    provenance: F,
    app: 'viewer',
    title: '관측 뷰어',
    iconKey: 'app_observe',
    order: 3,
    unlockWhen: { all: ['obs_link_001'] },
  },
  {
    id: 'app_board',
    provenance: F,
    app: 'board',
    title: '증거 보드',
    iconKey: 'app_board',
    order: 4,
    unlockWhen: { all: ['obs001_returned'] },
  },
  {
    id: 'app_archive',
    provenance: F,
    app: 'archive',
    title: '개인 기록관',
    iconKey: 'app_archive',
    order: 5,
    unlockWhen: { all: ['ded_person_confirmed'] },
  },
  {
    id: 'app_reader',
    provenance: F,
    app: 'reader',
    title: '사료 뷰어',
    iconKey: 'app_reader',
    order: 6,
    unlockWhen: { all: ['app_reader'] },
  },
];
