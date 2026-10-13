import { content } from '@/data';
import type { Interactable, NpcDef } from '@/core/types';

export interface WorldContent {
  worldObjects: Interactable[];
  npcs: NpcDef[];
}

let override: WorldContent | null = null;

/** 개발/테스트용: 콘텐츠 대신 픽스처를 쓴다. null 이면 해제. */
export function setWorldContentOverride(c: WorldContent | null): void {
  override = c;
}

const src = (): WorldContent => override ?? content;

export function getSceneObjects(sceneId: string): Interactable[] {
  return src().worldObjects.filter((o) => o.sceneId === sceneId);
}

/** 이 씬에 나타날 수 있는 NPC(기본 씬이거나 일정에 이 씬이 있는 NPC). */
export function getSceneNpcs(sceneId: string): NpcDef[] {
  return src().npcs.filter((n) => n.sceneId === sceneId || n.schedule.some((w) => w.sceneId === sceneId));
}

export function getObjectById(id: string): Interactable | undefined {
  return src().worldObjects.find((o) => o.id === id);
}
