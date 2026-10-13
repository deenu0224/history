/** 패널 이동(앱 ↔ 책상 위 패널, 밑줄 말 → DB 등). 앱을 열면 스토어에도 알린다(조건 판정용). */
import type { AppId } from '@/core/types';
import { selectApps, useGameStore } from '@/store/gameStore';
import { APP_PANEL, PANEL_APP, useUi, type Panel } from '../uiStore';

export const isDbOpen = () => selectApps(useGameStore.getState()).includes('db');

/** 패널을 연다. 앱 패널이면 스토어의 ui.app 도 맞춘다. 잠긴 앱이면 열지 않는다. */
export function openPanel(panel: Panel | null): boolean {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  if (panel === null) {
    ui.openPanel(null);
    g.closeApp();
    return true;
  }
  const app = PANEL_APP[panel];
  if (app) {
    if (!g.openApp(app)) return false;
  } else g.closeApp();
  ui.openPanel(panel);
  return true;
}

export const openApp = (app: AppId) => openPanel(APP_PANEL[app]);
export const closePanel = () => openPanel(null);

/** 밑줄 말을 눌렀을 때: DB 가 열려 있으면 그 말로 바로 검색. 아직이면 아무 일도 하지 않는다. */
export function searchFor(term: string) {
  if (!isDbOpen()) {
    useUi.getState().say('지금은 DB 를 열람할 수 없다.');
    return;
  }
  useUi.getState().prefillSearch(term);
  openPanel('db');
}
