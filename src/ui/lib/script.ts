import { EPISODE_1, type Objective, type ScriptLine } from '@/data/script';
import { checkCondition, type Flags } from '@/core/world';
import type { CollectionStage, Id } from '@/core/types';

/** src/data/script.ts(에피소드 스크립트)를 UI 용으로 정규화한다. 정답/연도는 여기서 만들지 않는다. */
export interface SeqPage {
  speaker?: string;
  text: string;
}
export interface Sequence {
  title?: string;
  pages: SeqPage[];
}

const toSeq = (lines: readonly ScriptLine[], title?: string): Sequence | null =>
  lines.length ? { title, pages: lines.map((l) => ({ speaker: l.speaker, text: l.text })) } : null;

export const SCRIPT = {
  prologue: toSeq(EPISODE_1.prologue),
  epilogue: toSeq(EPISODE_1.epilogue),
  teaser: toSeq(EPISODE_1.teaser),
  afterReturn: EPISODE_1.afterReturn,
  epilogueWhen: EPISODE_1.epilogueWhen,
  teaserWhen: EPISODE_1.teaserWhen,
  startSceneId: 'lab' as Id,
  /** 연구실 DB 열람기가 보여 줄 항목 제한이 없으면 null(검증된 항목 전체). */
  databaseEntryIds: null as string[] | null,
};

export interface ObjectiveInfo {
  id: Id;
  text: string;
  hint?: string;
}

const discoveredCount = (collection: Readonly<Record<Id, CollectionStage>>) => Object.values(collection).filter((s) => s >= 1).length;

function isDone(o: Objective, flags: Flags, discovered: number): boolean {
  const { flags: cond, minCollectionDiscovered } = o.doneWhen;
  if (cond === undefined && minCollectionDiscovered === undefined) return false;
  if (cond && !checkCondition(flags, cond)) return false;
  if (minCollectionDiscovered !== undefined && discovered < minCollectionDiscovered) return false;
  return true;
}

/** 지금 보여줄 목표: 현재 씬 우선, 조건을 만족하고 아직 끝나지 않은 첫 항목(선택 목표는 마지막). */
export function currentObjective(
  flags: Flags,
  collection: Readonly<Record<Id, CollectionStage>>,
  sceneId?: string | null,
): ObjectiveInfo | null {
  const discovered = discoveredCount(collection);
  const open: Objective[] = [];
  for (const q of EPISODE_1.quests)
    for (const o of q.objectives) {
      if (o.showWhen && !checkCondition(flags, o.showWhen)) continue;
      if (isDone(o, flags, discovered)) continue;
      open.push(o);
    }
  const pick = (list: Objective[]) =>
    list.find((o) => !o.optional && (!o.sceneId || o.sceneId === sceneId)) ??
    list.find((o) => !o.optional) ??
    list[0];
  const o = pick(open);
  return o ? { id: o.id, text: o.text, hint: o.hint } : null;
}

/** 엔딩 도달(기록 열람 모드 해금): 세 추리를 모두 확정. */
export function endingReached(flags: Flags): boolean {
  return checkCondition(flags, SCRIPT.epilogueWhen);
}
