/**
 * 에피소드 사이의 흐름(UI 전용): 콜드 오픈 줄, 다음 에피소드로 넘어가기(다리 연출 뒤).
 * 프롤로그(승인본)는 src/data/script.ts. 에피소드마다 콜드 오픈은 시각·한 줄이 다르다.
 */
import { EPISODE_1, type ScriptLine } from '@/data/script';
import { useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

const F = 'fictional' as const;

/** 에피소드별 콜드 오픈(홈이 켜지기 전 짧은 줄 — 입력 없음, 탭하면 넘어감). 시각은 그 에피소드의 시작 시계와 같다 */
export const COLD_OPEN: Record<string, ScriptLine[]> = {
  ep0: [
    { text: '22:31. 기록대조과. 야근.', provenance: F },
    { text: '모니터에 배정 하나. 우선순위 낮음.', provenance: F },
  ],
  ep1: EPISODE_1.coldOpen,
};

export const coldOpenFor = (episodeId: string): ScriptLine[] => COLD_OPEN[episodeId] ?? EPISODE_1.coldOpen;

/**
 * 다리 뒤: 다음 에피소드로 넘어가 그 콜드 오픈을 보인다. 진행은 새로, 대화는 이어진다(스토어가 처리).
 * 잠겨 있으면 하지 않는다. 바로 저장해서, 여기서 닫아도 다음 에피소드에서 이어진다.
 */
export function goNextEpisode(next: string | null | undefined): boolean {
  if (!next) return false;
  const g = useGameStore.getState();
  const r = g.startEpisode(next);
  if (r !== 'started' && r !== 'already') return false;
  void useGameStore.getState().save('auto').catch(() => {});
  useUi.setState({ phase: 'boot', boot: 'cold', stack: ['home'], card: null, picked: null, logOpen: false, docId: null, roomFocus: null, searchSeed: null, banner: null, toast: null });
  return true;
}
