import type { AppId, Id } from './types';

/**
 * 결록 단말 이벤트 계약. 상태 변경은 스토어로, 버스는 '일어난 일' 알림과 화면 간 요청에만 쓴다.
 * 걷기 폐지로 interact / scene:* / world:* 이벤트는 제거되었다.
 */
export type ModalKind = 'evidence' | 'deduction' | 'collection' | 'settings' | 'save' | 'help' | 'sequence';

export interface BusEvents {
  /** 아무 쪽 → 셸: 앱을 열거나 앱 안의 대상으로 이동(예: 검색 결과 → 사료 뷰어) */
  'app:open': { app: AppId; target?: Id };
  /** 관측 뷰어(Phaser) → React: 텍스처·씬 준비 완료 */
  'viewer:ready': { timelineId: Id };
  /** 관측 뷰어 → React: store.tapHotspot 을 호출한 뒤 결과 패널을 띄우라는 알림(결과는 store.lastTap) */
  'viewer:tapped': { hotspotId: Id };
  /** React → 관측 뷰어: 카메라를 대상(핫스팟 id 또는 타일 좌표)으로 이동 */
  'viewer:focus': { hotspotId?: Id; x?: number; y?: number };
  /** 셸 → 화면 불안정 연출(정합성 보정·관측 진입/종료). intensity 0~1 */
  glitch: { intensity: number; ms: number };
  /** 촉각 피드백 요청(소리·도장·진동). 코드표는 TERMINAL_DESIGN §촉감 */
  feedback: { kind: FeedbackKind };
  /** 토스트 알림 */
  notify: { text: string; tone?: 'info' | 'discover' | 'success' | 'warning' };
  'ui:open': { modal: ModalKind; id?: Id };
  'ui:close': { modal?: ModalKind };
}

export type FeedbackKind =
  | 'tap'
  | 'search_hit'
  | 'search_miss'
  | 'evidence_new'
  | 'evidence_level'
  | 'phrase_stamp'
  | 'phrase_miss'
  | 'scrub_tick'
  | 'verdict_confirmed'
  | 'verdict_partial'
  | 'verdict_wrong'
  | 'message'
  | 'exhibit';

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
