/** 세션 시작: 스토어(진행 상태)와 맞게 화면 쪽 상태를 정리한다. 부팅·불러오기·처음부터에서 쓴다. */
import { useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

/** 책상에 들어갈 때: 이미 도착한 메시지는 연출 없이 둔다. */
export function enterOs() {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  ui.reveal(g.inbox);
  // 이어하기: 책상 위에 건이 있으면 그대로 보여 준다
  if (g.duty.current && !ui.shownCase) ui.setShownCase(g.duty.current);
}

/** 화면 쪽 상태를 비우고 다시 시작한다(스토어를 바꾼 직후에 부른다). */
export function restartSession() {
  useUi.getState().resetSession();
  useGameStore.getState().closeModal();
  useGameStore.getState().closeApp();
  enterOs();
}
