import { EPISODE_1, type Objective } from '@/data/script';
import type { AppId, Id, CollectionStage } from '@/core/types';
import type { PersistedState } from '@/core/save';
import { checkState } from '@/core/terminal';

export interface ObjectiveInfo {
  id: Id;
  text: string;
  hint?: string;
  app?: AppId;
}

const discovered = (c: Readonly<Record<Id, CollectionStage>>) => Object.values(c).filter((s) => s >= 1).length;

function isDone(o: Objective, s: PersistedState): boolean {
  const { state, minCollectionDiscovered } = o.doneWhen;
  if (state === undefined && minCollectionDiscovered === undefined) return false;
  if (state && !checkState(s, state)) return false;
  if (minCollectionDiscovered !== undefined && discovered(s.collection) < minCollectionDiscovered) return false;
  return true;
}

/** 지금 보여 줄 목표: 조건이 맞고 아직 끝나지 않은 첫 필수 항목(없으면 선택 항목). */
export function currentObjective(s: PersistedState): ObjectiveInfo | null {
  const open: Objective[] = [];
  for (const q of EPISODE_1.quests)
    for (const o of q.objectives) {
      if (o.showWhen && !checkState(s, o.showWhen)) continue;
      if (isDone(o, s)) continue;
      open.push(o);
    }
  const o = open.find((x) => !x.optional) ?? open[0];
  return o ? { id: o.id, text: o.text, hint: o.hint, app: o.app } : null;
}

/** 엔딩 도달(기록 열람 모드 해금): 세 추리를 모두 확정. */
export function endingReached(s: Pick<PersistedState, 'flags'>): boolean {
  return (EPISODE_1.epilogueWhen.all ?? []).every((f) => Boolean(s.flags[f]));
}
