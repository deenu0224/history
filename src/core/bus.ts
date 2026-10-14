import type { Id } from './types';

export type ModalKind = 'tag' | 'card' | 'room' | 'search' | 'messenger' | 'rewrite' | 'restore' | 'settings';

/**
 * 결록 단말 이벤트 계약(v5). 상태 변경은 스토어로, 버스는 '일어난 일' 알림과 화면 간 요청에만 쓴다.
 */
export interface BusEvents {
  /** 촉각 피드백 요청(소리·진동·애니). 코드표는 src/data/feedback.ts */
  feedback: { kind: FeedbackKind };
  /** 위쪽 한 줄 배너(새 메시지 등) */
  notify: { text: string; tone?: 'info' | 'discover' | 'success' | 'warning' };
  'ui:open': { modal: ModalKind; id?: Id };
  'ui:close': { modal?: ModalKind };
}

/** UI_STYLE_GUIDE §7 */
export type FeedbackKind =
  | 'tap'
  | 'swipe'
  | 'tag_ok'
  | 'tag_no'
  | 'eye_open'
  | 'eye_close'
  | 'merge'
  | 'contradiction'
  | 'resolve'
  | 'message'
  | 'write'
  | 'write_grey'
  | 'write_fail'
  | 'restore'
  | 'search_hit'
  | 'search_miss'
  | 'page';

type Handler<T> = (payload: T) => void;

export interface Bus<E> {
  on<K extends keyof E>(type: K, fn: Handler<E[K]>): () => void;
  once<K extends keyof E>(type: K, fn: Handler<E[K]>): () => void;
  off<K extends keyof E>(type: K, fn: Handler<E[K]>): void;
  emit<K extends keyof E>(type: K, payload: E[K]): void;
  clear(): void;
}

export function createBus<E>(): Bus<E> {
  const map = new Map<keyof E, Set<Handler<never>>>();
  const bus: Bus<E> = {
    on(type, fn) {
      let set = map.get(type);
      if (!set) map.set(type, (set = new Set()));
      set.add(fn as Handler<never>);
      return () => bus.off(type, fn);
    },
    once(type, fn) {
      const off = bus.on(type, (p) => {
        off();
        fn(p);
      });
      return off;
    },
    off(type, fn) {
      map.get(type)?.delete(fn as Handler<never>);
    },
    emit(type, payload) {
      for (const fn of [...(map.get(type) ?? [])]) (fn as Handler<E[typeof type]>)(payload);
    },
    clear() {
      map.clear();
    },
  };
  return bus;
}

export const bus = createBus<BusEvents>();
