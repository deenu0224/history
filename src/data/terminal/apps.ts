/**
 * 결록 단말 앱 5개와 설치(잠금) 조건. 한 박자에 새 앱 하나(닌텐도식 원칙 3) — TERMINAL_DESIGN §비트 표.
 *   B0 손 노트(콜드 오픈: 어젯밤 내 글씨) → 노트를 열면 검색 설치 → 그 단어를 검색하면('그런 단어 없음') 메신저 설치
 *   → B5 관측 뷰어(관측 지점 개방) → B9 증거 보드(관측 종료).
 *   사료 뷰어는 검색 앱의 '원문 보기'(구절 등록은 원문 대조 권한 source_access 뒤), 개인 기록관은 손 노트의 '기록관' 탭.
 *   설정은 시스템 패널(앱 아님).
 */
import type { AppDef } from '@/core/types';
import { MESSENGER_WHEN } from './messages';

const F = 'fictional' as const;

export const apps: AppDef[] = [
  { id: 'app_notebook', provenance: F, app: 'notebook', title: '손 노트', iconKey: 'app_notebook', order: 0 },
  {
    id: 'app_search',
    provenance: F,
    app: 'search',
    title: '통합 DB 검색',
    iconKey: 'app_db',
    order: 1,
    unlockWhen: { appsOpened: ['notebook'] },
  },
  {
    id: 'app_messenger',
    provenance: F,
    app: 'messenger',
    title: '메신저',
    iconKey: 'app_messenger',
    order: 2,
    unlockWhen: MESSENGER_WHEN,
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
];
