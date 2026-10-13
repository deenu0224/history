import type { Id } from './types';

/** Phaser ↔ React 이벤트 계약. 상태 변경은 스토어로, 버스는 '일어난 일' 알림에만 쓴다. */
export type ModalKind =
  | 'examine'
  | 'dialogue'
  | 'evidence'
  | 'notebook'
  | 'collection'
  | 'deduction'
  | 'archive'
  | 'settings'
  | 'save';

export interface BusEvents {
  /** Phaser: 플레이어가 대상과 상호작용(E/Space/탭) */
  interact: { targetId: Id };
  /** Phaser: 씬 진입 완료 */
  'scene:enter': { sceneId: Id };
  /** React → Phaser: 씬 전환 요청 */
  'scene:goto': { sceneId: Id; spawn?: { x: number; y: number } };
  /** 어느 쪽이든: 모달 열기/닫기 */
  'ui:open': { modal: ModalKind; id?: Id };
  'ui:close': { modal?: ModalKind };
  /** React → Phaser: 입력·시간 정지 */
  'world:pause': { paused: boolean };
  /** Phaser: 게임 내 시각(분) 변화 */
  'world:time': { minute: number };
  /** 어느 쪽이든: 획득 알림 토스트 */
  notify: { text: string; tone?: 'info' | 'discover' | 'success' | 'warning' };
}

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
