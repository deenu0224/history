import type { DialogueLine, FlagCondition, FlagValue, Interactable, NpcDef, Waypoint } from './types';

export type Flags = Readonly<Record<string, FlagValue>>;

const truthy = (flags: Flags, f: string) => Boolean(flags[f]);

export function checkCondition(flags: Flags, cond?: FlagCondition): boolean {
  if (!cond) return true;
  return (cond.all ?? []).every((f) => truthy(flags, f)) && !(cond.none ?? []).some((f) => truthy(flags, f));
}

export function canInteract(obj: Interactable, flags: Flags): boolean {
  return !obj.requires || truthy(flags, obj.requires);
}

export const MINUTES_PER_DAY = 1440;

/** minute 시각에 NPC 가 머무는 웨이포인트. 하루 첫 웨이포인트 이전이면 전날 마지막 웨이포인트. */
export function npcWaypointAt(npc: NpcDef, minute: number): Waypoint | undefined {
  if (npc.schedule.length === 0) return undefined;
  const sorted = [...npc.schedule].sort((a, b) => a.time - b.time);
  const m = ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  let current = sorted[sorted.length - 1];
  for (const w of sorted) if (w.time <= m) current = w;
  return current;
}

export function availableLines(npc: NpcDef, flags: Flags): DialogueLine[] {
  return npc.dialogue.filter((l) => checkCondition(flags, l.when));
}
