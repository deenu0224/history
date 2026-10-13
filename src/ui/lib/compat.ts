/**
 * 스토어 신규 기능(현실 이동·인과 사슬·기록하기)의 덕 타이핑 어댑터.
 * 스토어/데이터 트랙이 API 를 확정하기 전까지 컴파일이 깨지지 않게 하고, 있으면 그대로 쓴다.
 */
import { useGameStore } from '@/store/gameStore';
import type { Id } from '@/core/types';

type AnyFn = (...a: unknown[]) => unknown;
const st = () => useGameStore.getState() as unknown as Record<string, unknown>;

export const hasAction = (name: string) => typeof st()[name] === 'function';
export function callAction<T = unknown>(name: string, ...args: unknown[]): T | undefined {
  const f = st()[name];
  return typeof f === 'function' ? ((f as AnyFn)(...args) as T) : undefined;
}

/** 적용된 현실 이동 id 목록(없으면 빈 배열) */
export function useShifts(): Id[] {
  const raw = useGameStore((s) => (s as unknown as { shifts?: unknown }).shifts);
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  return [];
}
