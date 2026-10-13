/** 단말의 앱 5개. 사료 뷰어는 검색 앱 안으로, 기록관은 손 노트의 탭으로 합쳐졌다(옛 저장의 reader/archive 는 여기서 옮긴다). */
import type { ComponentType } from 'react';
import type { AppId } from '@/core/types';
import { Messenger } from './Messenger';
import { Search } from './Search';
import { Viewer } from './Viewer';
import { Board } from './Board';
import { Notebook } from './Notebook';

export type UiApp = 'messenger' | 'search' | 'viewer' | 'board' | 'notebook';
export const UI_APPS: readonly UiApp[] = ['messenger', 'search', 'viewer', 'board', 'notebook'];

export const APP_COMPONENT: Record<UiApp, ComponentType> = {
  messenger: Messenger,
  search: Search,
  viewer: Viewer,
  board: Board,
  notebook: Notebook,
};

/** 스토어의 앱 id(구버전 reader/archive 포함)를 화면의 앱으로 */
export function canonicalApp(app: AppId | string | null | undefined): UiApp | null {
  if (!app) return null;
  if (app === 'reader') return 'search';
  if (app === 'archive') return 'notebook';
  return (UI_APPS as readonly string[]).includes(app) ? (app as UiApp) : null;
}

export const DEFAULT_SIZE: Record<UiApp | 'settings', { w: number; h: number }> = {
  messenger: { w: 760, h: 560 },
  search: { w: 700, h: 640 },
  viewer: { w: 900, h: 660 },
  board: { w: 940, h: 660 },
  notebook: { w: 920, h: 660 },
  settings: { w: 560, h: 600 },
};
