/** 세션 시작: 스토어(진행 상태)와 맞게 화면 쪽 상태를 정리한다. 부팅·불러오기·처음부터에서 쓴다. */
import { selectApps, useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';
import { CONTENT } from './content';

/** 데스크톱에 들어갈 때: 이미 열린 앱은 연출 없이 독에 두고, 처음이면 알림 하나만 홈에 둔다. */
export function enterOs() {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  for (const a of selectApps(g)) ui.markShown(a);
  ui.reveal(g.inbox);
  for (const id of ['m_sys_login', 'm_sys_assign']) if (g.inbox.includes(id) && !g.read.includes(id)) g.readMessage(id);
  const a = CONTENT.assignments[0];
  if (a && !g.assignmentsOpened.includes(a.id) && Object.keys(g.closures).length === 0)
    ui.pushNotice({ app: 'work', text: `[업무] 좌표 손상 건 ${a.code} 배정`, sub: `우선순위 ${a.priority}` }, { banner: false });
}

/** 화면 쪽 상태를 비우고 다시 시작한다(스토어를 바꾼 직후에 부른다). */
export function restartSession() {
  useUi.getState().resetSession();
  useGameStore.getState().closeModal();
  useGameStore.getState().closeApp();
  enterOs();
}
