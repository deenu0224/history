/**
 * 엿듣기(순수). 대사는 "충분히 확대했고 + 그 인물이 화면 중심 가까이" 있을 때만 들린다.
 * 시각 구간(at)·플래그(when)는 core/observation.linesAt 이 이미 걸러 준다 — 여기서는 거리·배율만 본다.
 */
export interface HearSpec {
  /** 기준 배율(base)의 몇 배 이상 확대해야 하는가. 기본 1.6 */
  minZoom?: number;
  /** 화면 중심에서 몇 타일 이내인가. 기본 3 */
  radiusTiles?: number;
}

export const HEAR_DEFAULT_MIN_ZOOM = 1.6;
export const HEAR_DEFAULT_RADIUS = 3;
/** 배율 비교 허용 오차(스냅 반올림 보호) */
const EPS = 0.02;

export const hearMinZoom = (s?: HearSpec): number => s?.minZoom ?? HEAR_DEFAULT_MIN_ZOOM;
export const hearRadius = (s?: HearSpec): number => s?.radiusTiles ?? HEAR_DEFAULT_RADIUS;

export interface HearInput {
  /** 현재 카메라 배율(기기 px/텍셀) */
  zoom: number;
  /** 기준 배율 */
  baseZoom: number;
  /** 인물 위치와 화면 중심(월드 px) */
  npc: { x: number; y: number };
  center: { x: number; y: number };
  tile?: number;
}

/** 이 배율에서 들을 수 있는가(거리와 무관) */
export function zoomedEnough(zoom: number, baseZoom: number, spec?: HearSpec): boolean {
  return zoom + EPS >= baseZoom * hearMinZoom(spec);
}

/** 한 줄이 지금 들리는가 */
export function inHearRange(inp: HearInput, spec?: HearSpec): boolean {
  if (!zoomedEnough(inp.zoom, inp.baseZoom, spec)) return false;
  const tile = inp.tile ?? 32;
  return Math.hypot(inp.npc.x - inp.center.x, inp.npc.y - inp.center.y) / tile <= hearRadius(spec) + 1e-6;
}

/** 이 줄을 들으려면 필요한 절대 배율(포커스용) */
export const requiredZoom = (baseZoom: number, spec?: HearSpec): number => baseZoom * hearMinZoom(spec);

// ───────────────────────── 말풍선 진행 ─────────────────────────

export interface HearLineIn {
  id: string;
  text: string;
  inRange: boolean;
}
export interface HearNpcIn {
  id: string;
  lines: HearLineIn[];
}
export interface HearNpcOut {
  id: string;
  /** 지금 풍선에 띄울 대사(없으면 null) */
  current: HearLineIn | null;
  /** 말은 하지만 들리지 않는다 → "…" 표시 */
  mumble: boolean;
}
export interface HearStep {
  npcs: HearNpcOut[];
  /** 이번 프레임에 처음 들린 줄(관측당 한 번씩) */
  newlyHeard: { npcId: string; lineId: string }[];
  /** 지금 범위 안에 있는 줄 id */
  inRangeIds: string[];
}

export const bubbleDwellMs = (text: string): number => Math.min(6500, 2600 + text.length * 55);

interface NpcState {
  cur: string | null;
  since: number;
  shown: Set<string>;
}

/**
 * 인물별로 줄을 하나씩 풍선에 올리는 상태기계.
 *  - 범위 안의 줄 중 아직 안 보여 준 첫 줄을 올리고, 읽을 시간이 지나면 다음 줄로 넘어간다.
 *  - 마지막 줄은 범위 안인 동안 남는다. 범위를 벗어나거나 구간이 끝나면 내려가고 순서는 처음부터.
 *  - onHear 는 (인물, 줄) 당 관측 내내 한 번.
 */
export class HearingTracker {
  private state = new Map<string, NpcState>();
  private heard = new Set<string>();

  reset(): void {
    this.state.clear();
    this.heard.clear();
  }

  /** 지금까지 들은 줄 id(관측 내내) */
  heardLineIds(): string[] {
    return [...this.heard].map((k) => k.slice(k.indexOf('/') + 1));
  }

  step(now: number, input: readonly HearNpcIn[]): HearStep {
    const out: HearNpcOut[] = [];
    const newlyHeard: HearStep['newlyHeard'] = [];
    const inRangeIds: string[] = [];
    const seen = new Set<string>();
    for (const n of input) {
      seen.add(n.id);
      let st = this.state.get(n.id);
      if (!st) this.state.set(n.id, (st = { cur: null, since: 0, shown: new Set() }));
      const byId = new Map(n.lines.map((l) => [l.id, l]));
      const ranged = n.lines.filter((l) => l.inRange);
      for (const l of ranged) inRangeIds.push(l.id);

      if (st.cur && !byId.get(st.cur)?.inRange) {
        st.cur = null;
        st.shown.clear();
      }
      if (st.cur && now - st.since >= bubbleDwellMs(byId.get(st.cur)!.text)) {
        const next = ranged.find((l) => !st!.shown.has(l.id));
        if (next) st.cur = next.id;
        if (next) st.since = now;
      }
      if (!st.cur) {
        const next = ranged.find((l) => !st!.shown.has(l.id)) ?? ranged[0];
        if (next) {
          st.cur = next.id;
          st.since = now;
        }
      }
      if (st.cur) {
        st.shown.add(st.cur);
        const key = `${n.id}/${st.cur}`;
        if (!this.heard.has(key)) {
          this.heard.add(key);
          newlyHeard.push({ npcId: n.id, lineId: st.cur });
        }
      }
      out.push({ id: n.id, current: st.cur ? byId.get(st.cur)! : null, mumble: n.lines.length > 0 && !st.cur });
    }
    for (const id of [...this.state.keys()]) if (!seen.has(id)) this.state.delete(id);
    return { npcs: out, newlyHeard, inRangeIds };
  }
}
