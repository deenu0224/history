/** v6 UI 가 쓰는 스토어 훅과 자잘한 도우미. 화면은 selectors 만 거치고 판정은 건드리지 않는다. */
import { useEffect, useRef, useState } from 'react';
import { EP0_V6 } from '@/data/v6/ep0';
import type { Block, Id } from '@/core/v6/types';
import { getV6Store } from '@/store/v6/store';

export const useV6 = getV6Store();
export const D = EP0_V6;

/** 기록 id → 화면에 쓰는 짧은 이름 */
export const nodeName = (id: Id): string => (id === D.start ? '시작 기록' : (D.nodes[id]?.title ?? id));

export const KIND_TAG: Record<string, string> = {
  sillok: '실록 · 현대어 풀이',
  observation: '관측',
  person: '인물 카드',
  current: '현재 문서',
  fragment: '실록 조각 · 현대어 풀이',
};
export const LINK_KIND: Record<string, string> = { place: '위치', time: '시간', person: '인물', event: '사건' };

/** 블록에 달린 단서 id 들 */
export function blockClues(b: Block): Id[] {
  if (b.kind === 'line') return (b.marks ?? []).map((m) => m.clue);
  if (b.kind === 'scene') return b.clue ? [b.clue] : [];
  if (b.kind === 'heard') return [b.clue];
  return [];
}

/**
 * 모으기는 밑줄마다가 아니라 쪽(기록) 단위다. 기록이나 쪽을 열어 읽으면 그 단서가 주머니로 들어가고
 * 「+n 단서」를 알린다. 밑줄은 눈에 띄는 표시로 남는다.
 */
export function useAutoCollect(nodeId: Id, furthest: number) {
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const node = D.nodes[nodeId];
    if (!node) return;
    const st = useV6.getState();
    setGain(null);
    let n = 0;
    node.pages.forEach((p, i) => {
      if (i > furthest) return;
      for (const b of p.blocks) for (const c of blockClues(b)) if (st.collect(c).status === 'ok') n += 1;
    });
    if (n > 0) {
      setGain({ n, key: Date.now() });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setGain(null), 3200);
    }
  }, [nodeId, furthest]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return gain;
}
