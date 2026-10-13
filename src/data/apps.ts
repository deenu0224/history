/**
 * 결록 단말 앱 4개와 잠금(v4). 업무(책상)·메신저는 처음부터 → 관측(근무가 시작되면) → DB 검색(#C-2217 첫 종결 뒤).
 * '종결된 보고서'·'불일치 보고서'는 업무 앱의 탭. 관측기 로그(종결 건 재생)는 관측 앱의 탭.
 */
import type { AppDef } from '@/core/types';

const F = 'fictional' as const;

export const OPENED_FLAG = (assignmentId: string) => `${assignmentId}_opened`;

export const apps: AppDef[] = [
  { id: 'app_work', provenance: F, app: 'work', title: '업무', iconKey: 'app_work', order: 0 },
  {
    id: 'app_viewer',
    provenance: F,
    app: 'viewer',
    title: '관측',
    iconKey: 'app_observe',
    order: 1,
    unlockWhen: { duties: ['duty_1'] },
  },
  { id: 'app_db', provenance: F, app: 'db', title: 'DB 검색', iconKey: 'app_db', order: 2, unlockWhen: { closed: ['as_c2217'] } },
  { id: 'app_messenger', provenance: F, app: 'messenger', title: '메신저', iconKey: 'app_messenger', order: 3 },
];
