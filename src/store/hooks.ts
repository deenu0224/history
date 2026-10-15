/**
 * React 편의 훅. 셀렉터는 매번 새 객체를 돌려주므로(zustand v5 의 useSyncExternalStore 는 같은 참조를 요구한다)
 * 전체 상태 참조로 구독하고 useMemo 로 보기를 만든다. 에피소드는 상태의 episodeId 를 따라간다.
 *
 *   const home = useView(selectHome);
 *   const cut  = useView((ep, s) => selectCut(ep, s, cutId), [cutId]);
 *   const ep   = useEpisode();
 */
import { useMemo } from 'react';
import type { Episode } from '@/core/types';
import { currentEpisode, useGameStore, type GameState } from './gameStore';

export function useView<T>(fn: (ep: Episode, s: GameState) => T, deps: readonly unknown[] = []): T {
  const s = useGameStore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => fn(currentEpisode(s), s), [s, ...deps]);
}

/** 지금 에피소드 데이터 */
export function useEpisode(): Episode {
  const id = useGameStore((s) => s.episodeId);
  return useMemo(() => currentEpisode({ episodeId: id }), [id]);
}

export const useActions = () => useGameStore.getState();
