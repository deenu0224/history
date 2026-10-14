import { createGameStore, type GameStore } from '@/store/gameStore';

/** 가짜 시계를 가진 스토어 */
export function makeStore(seed = 7) {
  const clock = { t: 1_000_000 };
  const store = createGameStore({ now: () => clock.t, seed });
  const st = () => store.getState();
  /** 시간을 흘리며 tick(기본 250ms 간격) */
  const advance = (ms: number, step = 250) => {
    const end = clock.t + ms;
    while (clock.t < end) {
      clock.t = Math.min(end, clock.t + step);
      st().tick();
    }
  };
  return { store, st, clock, advance };
}

export type Harness = ReturnType<typeof makeStore>;

export const texts = (store: GameStore) => store.getState().messenger.log.map((m) => m.text);

/** 메신저를 열어 모든 대기 말풍선이 오도록 기다리고, 선택지가 뜨면 첫 번째로 답한다(최대 n분) */
export function drainMessages(h: Harness, minutes = 5, reply: 'first' | 'none' = 'first') {
  h.st().openMessenger();
  for (let i = 0; i < minutes * 60 * 4; i++) {
    h.advance(250);
    const m = h.st().messenger;
    if (m.choice && reply === 'first') h.st().chooseReply(m.choice.step.options[0].id);
    if (!m.planned && !m.queue.length && !m.choice && !m.tasks.length && !m.stalled) break;
    if (m.stalled) h.st().openMessenger();
  }
  h.st().closeMessenger();
}
