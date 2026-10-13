/**
 * 관측 뷰어(걷기 대체). 하루를 [start, end] 분으로 스크럽하며 디오라마 속 인물·사물을 탭한다. 순수 함수.
 *  - NPC 위치: 일정(Waypoint)의 time 부터 그 칸에 머문다. 웨이포인트가 바뀐 직후 TRANSIT_MINUTES 동안은
 *    이전 칸에서 새 칸으로 선형 이동(경로 탐색은 렌더러 몫, from/to/progress 를 준다).
 *  - 대사 구간: DialogueLine.at(없으면 항상) + when(플래그).
 *  - 사물 구간: Interactable.windows(없으면 항상). 구간 밖이면 hiddenText.
 */
import type {
  ContentBundle,
  DialogueLine,
  Hotspot,
  Id,
  Interactable,
  NpcDef,
  ObservationTimeline,
  TimeWindow,
  Waypoint,
} from './types';
import { checkCondition, type Flags } from './world';

export const TRANSIT_MINUTES = 12;

export function inWindow(minute: number, windows?: readonly TimeWindow[]): boolean {
  if (!windows || windows.length === 0) return true;
  return windows.some((w) => minute >= w.from && minute < w.to);
}

export function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.from < b.to && b.from < a.to;
}

export function clampMinute(tl: Pick<ObservationTimeline, 'start' | 'end'>, minute: number): number {
  if (!Number.isFinite(minute)) return tl.start;
  return Math.max(tl.start, Math.min(tl.end, Math.round(minute)));
}

/** 'HH:MM' */
export function formatClock(minute: number): string {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export interface NpcPose {
  x: number;
  y: number;
  action?: string;
  moving: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** 0~1 이동 진행도 */
  progress: number;
  waypoint: Waypoint;
}

/** minute 에서의 NPC 자세. 첫 웨이포인트 이전이면 첫 웨이포인트에 서 있다(뷰어는 하루를 감싸지 않는다). */
export function npcPoseAt(npc: NpcDef, minute: number, transit = TRANSIT_MINUTES): NpcPose | null {
  if (npc.schedule.length === 0) return null;
  const sorted = [...npc.schedule].sort((a, b) => a.time - b.time);
  let i = 0;
  for (let k = 0; k < sorted.length; k++) if (sorted[k]!.time <= minute) i = k;
  const cur = sorted[i]!;
  const prev = i > 0 ? sorted[i - 1]! : cur;
  const elapsed = minute - cur.time;
  const moving = i > 0 && elapsed >= 0 && elapsed < transit && (prev.x !== cur.x || prev.y !== cur.y);
  const progress = moving ? elapsed / transit : 1;
  const x = moving ? prev.x + (cur.x - prev.x) * progress : cur.x;
  const y = moving ? prev.y + (cur.y - prev.y) * progress : cur.y;
  return {
    x,
    y,
    action: moving ? 'walk' : cur.action,
    moving,
    from: { x: prev.x, y: prev.y },
    to: { x: cur.x, y: cur.y },
    progress,
    waypoint: cur,
  };
}

/** 그 시각·플래그에서 들리는 대사 */
export function linesAt(npc: NpcDef, minute: number, flags: Flags): DialogueLine[] {
  return npc.dialogue.filter((l) => checkCondition(flags, l.when) && inWindow(minute, l.at));
}

export type HotspotStatus = 'available' | 'outside_window' | 'hidden';

export function hotspotStatus(h: Hotspot, minute: number, flags: Flags): HotspotStatus {
  if (h.visibleWhen && !checkCondition(flags, h.visibleWhen)) return 'hidden';
  return inWindow(minute, h.windows) ? 'available' : 'outside_window';
}

/** 씬의 오브젝트(관측 경계 제외)·NPC 로 핫스팟을 만든다. id = 'hs_' + targetId. */
export function deriveHotspots(sceneId: Id, c: Pick<ContentBundle, 'worldObjects' | 'npcs'>): Hotspot[] {
  const objs: Hotspot[] = c.worldObjects
    .filter((o: Interactable) => o.sceneId === sceneId && o.kind !== 'door' && o.kind !== 'observe')
    .map((o) => ({
      id: `hs_${o.id}`,
      targetId: o.id,
      kind: 'object',
      ...(o.windows ? { windows: o.windows } : {}),
      ...(o.requires ? { visibleWhen: { all: [o.requires] } } : {}),
    }));
  const people: Hotspot[] = c.npcs
    .filter((n) => n.sceneId === sceneId)
    .map((n) => ({ id: `hs_${n.id}`, targetId: n.id, kind: 'npc' }));
  return [...people, ...objs];
}

/** 스크럽 막대 눈금: 누군가 자리를 옮기는 시각(대사 구간은 표시하지 않는다 — 발견의 몫). */
export function timelineMarks(tl: ObservationTimeline, npcs: readonly NpcDef[]): number[] {
  const ids = new Set(tl.hotspots.filter((h) => h.kind === 'npc').map((h) => h.targetId));
  const set = new Set<number>();
  for (const n of npcs)
    if (ids.has(n.id)) for (const w of n.schedule) if (w.time > tl.start && w.time < tl.end) set.add(w.time);
  return [...set].sort((a, b) => a - b);
}

export function glitchAt(tl: ObservationTimeline, minute: number): number {
  return Math.max(0, ...(tl.glitches ?? []).filter((g) => minute >= g.from && minute < g.to).map((g) => g.intensity));
}

/**
 * 화자 표시. 신원 확인 전에는 실존 인물 이름을 화자로 쓰지 않는다(label 로 대체).
 * identified: 해당 인물 도감이 '정체 식별'(2) 이상인지.
 */
export function displaySpeaker(
  npc: NpcDef,
  line: DialogueLine,
  identified: boolean,
  personName?: string,
  personHanja?: string,
): string {
  if (identified) return line.speaker ?? personName ?? npc.label;
  if (!line.speaker) return npc.label;
  if (personName && (line.speaker.includes(personName) || (personHanja && line.speaker.includes(personHanja))))
    return npc.label;
  return line.speaker;
}

export interface ViewerFrame {
  timelineId: Id;
  minute: number;
  clock: string;
  glitch: number;
  npcs: { id: Id; hotspotId: Id; spriteKey: string; label: string; pose: NpcPose }[];
  hotspots: { id: Id; targetId: Id; kind: Hotspot['kind']; status: HotspotStatus; x: number; y: number }[];
}

/** 렌더러용 한 프레임: 그 시각의 NPC 자세와 핫스팟 상태(위치 포함). */
export function viewerFrame(
  tl: ObservationTimeline,
  minute: number,
  c: Pick<ContentBundle, 'worldObjects' | 'npcs'>,
  flags: Flags,
): ViewerFrame {
  const m = clampMinute(tl, minute);
  const npcById = new Map(c.npcs.map((n) => [n.id, n]));
  const objById = new Map(c.worldObjects.map((o) => [o.id, o]));
  const npcs: ViewerFrame['npcs'] = [];
  const hotspots: ViewerFrame['hotspots'] = [];
  for (const h of tl.hotspots) {
    const status = hotspotStatus(h, m, flags);
    if (h.kind === 'npc') {
      const n = npcById.get(h.targetId);
      const pose = n && npcPoseAt(n, m);
      if (!n || !pose) continue;
      npcs.push({ id: n.id, hotspotId: h.id, spriteKey: n.spriteKey, label: n.label, pose });
      hotspots.push({ id: h.id, targetId: h.targetId, kind: h.kind, status, x: pose.x, y: pose.y });
    } else {
      const o = objById.get(h.targetId);
      if (o) hotspots.push({ id: h.id, targetId: h.targetId, kind: h.kind, status, x: o.x, y: o.y });
    }
  }
  return { timelineId: tl.id, minute: m, clock: formatClock(m), glitch: glitchAt(tl, m), npcs, hotspots };
}
