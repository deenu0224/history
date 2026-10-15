/**
 * 뒤로 가기 하나(아래 막대의 [‹ 뒤로] · 왼쪽 가장자리에서 밀기 · 둘 다 같은 길). UI_STYLE_GUIDE §0-3·§2.0
 * 순서: 위에 떠 있는 것부터 닫는다 — 인물 카드 → 문서 → 지금까지 본 것 → 그날의 방 → 이름 붙이기 시트 → 화면(스택 팝).
 * 화면이 자기 뒤로를 따로 가지면(찾기: 이름 붙이기 시트로 돌아가기) registerBack 으로 맡긴다.
 */
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { topScreen, useUi, type Screen } from '../uiStore';

/** 왼쪽 가장자리 밀기: 이 폭 안에서 시작한 밀기는 뒤로 가기(컷 넘기기보다 먼저) */
export const EDGE_PX = 24;
/** 이만큼 오른쪽으로 밀면 뒤로 */
export const EDGE_GO_PX = 64;

const custom = new Map<Screen, () => void>();

/** 화면 고유의 뒤로(마운트 동안만) */
export function useBackHandler(screen: Screen, fn: () => void) {
  useEffect(() => {
    custom.set(screen, fn);
    return () => {
      if (custom.get(screen) === fn) custom.delete(screen);
    };
  }, [screen, fn]);
}

/** 뒤로 한 걸음. 아무것도 하지 않았으면 false(홈·복원 장면) */
export function goBack(): boolean {
  const ui = useUi.getState();
  const g = useGameStore.getState();
  if (ui.phase !== 'game') return false;
  if (ui.card) {
    ui.closeCard();
    return true;
  }
  if (ui.docId) {
    ui.setDoc(null);
    return true;
  }
  if (ui.logOpen) {
    ui.setLog(false);
    return true;
  }
  if (g.ui.roomOpen) {
    g.closeRoom();
    ui.setRoomFocus(null);
    return true;
  }
  if (g.ui.tagTarget) {
    g.closeTagSheet();
    return true;
  }
  const top = topScreen(ui);
  if (top === 'home' || top === 'restore') return false;
  const own = custom.get(top);
  if (own) {
    own();
    return true;
  }
  if (top === 'viewer') {
    g.closeTagSheet();
    g.closeViewer();
  }
  ui.pop();
  return true;
}

/** 어디서든 메신저로: 떠 있는 시트·카드는 닫고 간다(대화창 위에 시트가 남지 않게) */
export function openMessenger() {
  const ui = useUi.getState();
  const g = useGameStore.getState();
  if (ui.card) ui.closeCard();
  if (ui.docId) ui.setDoc(null);
  if (ui.logOpen) ui.setLog(false);
  if (g.ui.roomOpen) {
    g.closeRoom();
    ui.setRoomFocus(null);
  }
  if (g.ui.tagTarget) g.closeTagSheet();
  ui.clearBanner();
  ui.push('messenger');
}
