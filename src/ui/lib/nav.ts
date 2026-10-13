/** 앱 사이 이동(밑줄 말 → DB, 알림 → 앱 등). */
import { selectApps, useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

export const isDbOpen = () => selectApps(useGameStore.getState()).includes('db');

/** 밑줄 말을 눌렀을 때: DB 가 열려 있으면 그 말로 바로 검색. 아직이면(대조 중) 아무 일도 하지 않는다(규정 4조). */
export function searchFor(term: string) {
  if (!isDbOpen()) {
    useUi.getState().say('대조 중에는 DB 를 열람하지 않는다.');
    return;
  }
  useUi.getState().prefillSearch(term);
  useGameStore.getState().openApp('db');
}

export const goApp = (app: Parameters<ReturnType<typeof useGameStore.getState>['openApp']>[0], target?: string) =>
  void useGameStore.getState().openApp(app, target);
