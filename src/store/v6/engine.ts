/**
 * v6 상태 전이(DESIGN_V6 §1, §8). 상태는 순수 데이터, 함수는 작업 사본(Work)을 고친다.
 * 판정은 core/v6/combine, 글 조회는 core/v6/lines. UI 가 없다.
 */
import * as M from '@/core/messenger';
import { createMessenger, type MessengerState } from '@/core/messenger';
import { josa } from '@/core/josa';
import { carrySettings } from '@/core/save';
import { nextRandom } from '@/core/rng';
import type { Burst, Id } from '@/core/types';
import { EP0_V6 } from '@/data/v6/ep0';
import { BURSTS0, EVENTS0, HINT_BURSTS } from '@/data/v6/ep0';
import { pairKey, judge, type JudgeCtx } from '@/core/v6/combine';
import { canFollow, clueOrigins, nodeAvailable, reachable } from '@/core/v6/graph';
import { fillWho, whoHole } from '@/core/v6/lines';
import type { Card, Ep0Data, FailCode } from '@/core/v6/types';
import { DEFAULT_SETTINGS, type Settings } from '@/store/state';

/** 맞춰 보기는 늘 n 개(Ep0 = 2) */
export const PICK_N = 2;
/** 큰 목표에 진전 없이 이만큼 틀리면 한 선임이 볼 곳을 한 줄 말한다(W6) */
export const HINT_EVERY = 5;
export const RESTORE_STEPS = ['paragraph', 'neighbors', 'monologue'] as const;
export type RestoreStep = (typeof RESTORE_STEPS)[number];

export const V6_SAVE_VERSION = 8;
export const V6_SAVE_KEY = 'gyeollok-v6-save';
export const V6_SCHEMA = 'gyeollok-save-v6';

export interface V6State {
  started: boolean;
  prologueSeen: boolean;
  seed: number;
  rng: number;
  // ── 기록 ──
  /** 열어 본 기록의 길(맨 끝이 지금 기록) */
  nodeStack: Id[];
  visited: Id[];
  /** 관측·여러 쪽 기록에서 넘겨 본 가장 먼 쪽 */
  pages: Record<Id, number>;
  // ── 단서 ──
  collected: Id[];
  found: Id[];
  /** 큰 목표를 푼 값(엔티티 id), 못 풀었으면 null */
  goalValue: string | null;
  picked: Id[];
  tried: string[];
  fails: number;
  failsSinceProgress: number;
  hintsGiven: Id[];
  wonmunOpen: Id[];
  // ── 고정·복원 ──
  fixed: boolean;
  restored: boolean;
  restoreStep: number;
  epilogueDone: boolean;
  seenMonologues: Id[];
  // ── 메신저·설정 ──
  messenger: MessengerState;
  settings: Settings;
  lastActiveAt: number;
}

export function freshState(seed = 1, now = 0): V6State {
  return {
    started: false,
    prologueSeen: false,
    seed,
    rng: seed ^ 0x5bd1e995,
    nodeStack: [],
    visited: [],
    pages: {},
    collected: [],
    found: [],
    goalValue: null,
    picked: [],
    tried: [],
    fails: 0,
    failsSinceProgress: 0,
    hintsGiven: [],
    wonmunOpen: [],
    fixed: false,
    restored: false,
    restoreStep: 0,
    epilogueDone: false,
    seenMonologues: [],
    messenger: createMessenger(seed, now),
    settings: { ...DEFAULT_SETTINGS },
    lastActiveAt: now,
  };
}

export const PERSISTED_KEYS = Object.keys(freshState()) as (keyof V6State)[];

// ── 연출 ───────────────────────────────────────────────────
export type Fx =
  | { kind: 'collect'; clue: Id }
  | { kind: 'conclusion'; id: Id; renames?: Record<string, string> }
  | { kind: 'goal' }
  | { kind: 'fail'; code: FailCode; shake: Id[] }
  | { kind: 'already'; id?: Id }
  | { kind: 'restore' }
  | { kind: 'monologue'; id: Id };

export interface Work {
  s: V6State;
  fx: Fx[];
}
export interface Ctx {
  now: number;
  data: Ep0Data;
  bursts: ReadonlyMap<Id, Burst>;
}

export const EP0_BURSTS: ReadonlyMap<Id, Burst> = new Map(BURSTS0.map((b) => [b.id, b]));
export const makeCtx = (now: number, data: Ep0Data = EP0_V6): Ctx => ({ now, data, bursts: EP0_BURSTS });

export const graphCtx = (s: V6State) => ({ found: s.found, restored: s.restored });
export const judgeCtxOf = (d: Ep0Data): JudgeCtx => ({ world: d.world, why: d.why, templates: d.whyTemplates, conclusions: d.conclusions });

const msgCtx = (w: Work, c: Ctx, touching = false) => ({ bursts: c.bursts, touching, messengerOpen: false, fast: w.s.settings.fastMessages });

export function fireEvent(w: Work, c: Ctx, id: Id): boolean {
  const r = M.fire(w.s.messenger, id, c.now, msgCtx(w, c));
  w.s.messenger = r.state;
  return r.accepted;
}

// ── 시작·이동 ──────────────────────────────────────────────
export function start(w: Work, c: Ctx): 'started' | 'already' {
  if (w.s.started) return 'already';
  w.s.started = true;
  w.s.nodeStack = [c.data.start];
  w.s.visited = [c.data.start];
  w.s.pages[c.data.start] = 0;
  fireEvent(w, c, EVENTS0.start);
  return 'started';
}

export type OpenStatus = 'ok' | 'unknown' | 'locked' | 'unreachable' | 'not_started';

export function openNode(w: Work, c: Ctx, id: Id): { status: OpenStatus } {
  if (!w.s.started) return { status: 'not_started' };
  const node = c.data.nodes[id];
  if (!node) return { status: 'unknown' };
  if (!nodeAvailable(node, graphCtx(w.s))) return { status: 'locked' };
  // 열어 본 기록의 보이는 칩으로 닿을 수 있어야 한다(숨은 경로 없음)
  const ok = w.s.visited.some((v) => reachable(c.data.nodes, v, graphCtx(w.s)).has(id)) || id === c.data.start;
  if (!ok) return { status: 'unreachable' };
  if (w.s.nodeStack[w.s.nodeStack.length - 1] !== id) w.s.nodeStack.push(id);
  if (!w.s.visited.includes(id)) {
    w.s.visited.push(id);
    if (node.kind === 'observation') fireEvent(w, c, EVENTS0.openObservation);
  }
  w.s.pages[id] ??= 0;
  return { status: 'ok' };
}

export function followLink(w: Work, c: Ctx, linkId: Id): { status: 'ok' | 'unknown' | 'locked' | 'hidden' | 'not_started'; to?: Id; reason?: string } {
  if (!w.s.started) return { status: 'not_started' };
  const from = w.s.nodeStack[w.s.nodeStack.length - 1]!;
  const r = canFollow(c.data.nodes, from, linkId, graphCtx(w.s));
  if (!r.ok) {
    const reason = r.reason === 'locked' ? c.data.nodes[from]?.links.find((l) => l.id === linkId)?.locked?.reason : undefined;
    return { status: r.reason, ...(reason ? { reason } : {}) };
  }
  openNode(w, c, r.to);
  return { status: 'ok', to: r.to };
}

export function back(w: Work): Id | null {
  if (w.s.nodeStack.length <= 1) return null;
  w.s.nodeStack.pop();
  return w.s.nodeStack[w.s.nodeStack.length - 1]!;
}

export function setPage(w: Work, c: Ctx, nodeId: Id, page: number): number {
  const n = c.data.nodes[nodeId];
  if (!n || !w.s.visited.includes(nodeId)) return 0;
  const p = Math.max(0, Math.min(n.pages.length - 1, Math.round(page)));
  w.s.pages[nodeId] = Math.max(w.s.pages[nodeId] ?? 0, p);
  return p;
}

// ── 모으기 ─────────────────────────────────────────────────
export type CollectStatus = 'ok' | 'already' | 'unknown' | 'not_seen';

/** 단서를 모을 수 있는가: 그 나온 곳(기록·쪽)을 열어 읽었다 */
export function clueSeen(s: V6State, c: Ctx, clueId: Id): boolean {
  const os = clueOrigins(c.data.nodes)[clueId] ?? [];
  return os.some((o) => s.visited.includes(o.node) && (s.pages[o.node] ?? 0) >= o.page && nodeAvailable(c.data.nodes[o.node]!, graphCtx(s)));
}

export function collect(w: Work, c: Ctx, clueId: Id): { status: CollectStatus } {
  const clue = c.data.clues[clueId];
  if (!clue) return { status: 'unknown' };
  if (w.s.collected.includes(clueId)) return { status: 'already' };
  if (!clueSeen(w.s, c, clueId)) return { status: 'not_seen' };
  w.s.collected.push(clueId);
  w.fx.push({ kind: 'collect', clue: clueId });
  if (w.s.collected.length === 1) fireEvent(w, c, EVENTS0.firstCollect);
  return { status: 'ok' };
}

// ── 맞춰 보기 ──────────────────────────────────────────────
export const inBag = (s: V6State, id: Id) => s.collected.includes(id) || s.found.includes(id);

export function pick(w: Work, id: Id): { status: 'ok' | 'full' | 'not_in_bag' | 'already' } {
  if (!inBag(w.s, id)) return { status: 'not_in_bag' };
  if (w.s.picked.includes(id)) return { status: 'already' };
  if (w.s.picked.length >= PICK_N) return { status: 'full' };
  w.s.picked.push(id);
  return { status: 'ok' };
}

export function unpick(w: Work, id: Id): boolean {
  const had = w.s.picked.includes(id);
  w.s.picked = w.s.picked.filter((x) => x !== id);
  return had;
}

export type CombineOutcome =
  | { status: 'incomplete' }
  | { status: 'conclusion'; conclusionId: Id; text: string }
  | { status: 'goal'; value: string }
  | { status: 'already'; conclusionId?: Id; goal?: true }
  | { status: 'fail'; code: FailCode; text: string; shake: Id[] };

export function nextHint(s: V6State, c: Ctx): Id | null {
  const h = c.data.hints.find((x) => !s.found.includes(x.until) && !s.hintsGiven.includes(x.id));
  return h ? h.id : null;
}

export function combine(w: Work, c: Ctx): CombineOutcome {
  const s = w.s;
  if (s.picked.length < PICK_N) return { status: 'incomplete' };
  const cards: Card[] = s.picked.map((id) => c.data.clues[id] ?? c.data.conclusions[id]!);
  const key = pairKey(s.picked);
  if (!s.tried.includes(key)) s.tried.push(key);
  const j = judge(judgeCtxOf(c.data), cards, s.found, s.goalValue !== null);
  if (j.status === 'conclusion') {
    const concl = c.data.conclusions[j.conclusionId]!;
    s.found.push(concl.id);
    s.picked = [];
    s.failsSinceProgress = 0;
    w.fx.push({ kind: 'conclusion', id: concl.id, ...(concl.renames ? { renames: concl.renames } : {}) });
    if (concl.monologue && !s.seenMonologues.includes(concl.monologue)) {
      s.seenMonologues.push(concl.monologue);
      w.fx.push({ kind: 'monologue', id: concl.monologue });
    }
    const ev = EVENTS0.conclusion[concl.id];
    if (ev) fireEvent(w, c, ev);
    return { status: 'conclusion', conclusionId: concl.id, text: concl.text };
  }
  if (j.status === 'goal') {
    s.goalValue = j.value;
    s.picked = [];
    s.failsSinceProgress = 0;
    w.fx.push({ kind: 'goal' });
    fireEvent(w, c, EVENTS0.goal);
    return { status: 'goal', value: j.value };
  }
  if (j.status === 'already') {
    s.picked = [];
    w.fx.push({ kind: 'already', ...(j.conclusionId ? { id: j.conclusionId } : {}) });
    return { status: 'already', ...(j.conclusionId ? { conclusionId: j.conclusionId } : {}), ...(j.goal ? { goal: true as const } : {}) };
  }
  s.fails += 1;
  s.failsSinceProgress += 1;
  if (s.fails === 1) fireEvent(w, c, EVENTS0.firstFail);
  if (s.goalValue === null && s.failsSinceProgress > 0 && s.failsSinceProgress % HINT_EVERY === 0) {
    const h = nextHint(s, c);
    if (h) {
      s.hintsGiven.push(h);
      fireEvent(w, c, h);
    }
  }
  w.fx.push({ kind: 'fail', code: j.code, shake: j.shake });
  return { status: 'fail', code: j.code, text: j.text, shake: j.shake };
}

export function toggleWonmun(w: Work, lineId: Id): boolean {
  const open = w.s.wonmunOpen.includes(lineId);
  w.s.wonmunOpen = open ? w.s.wonmunOpen.filter((x) => x !== lineId) : [...w.s.wonmunOpen, lineId];
  return !open;
}

// ── 역사 고정 ──────────────────────────────────────────────
/** 큰 목표의 답을 손상된 줄 「누가」 칸에 넣은 국역이 검증된 국역과 글자 하나까지 같아야 굳는다 */
export function fixCandidate(c: Ctx, value: string | null): { filled: string; matches: boolean } | null {
  if (value === null) return null;
  const v = c.data.lines.verified[c.data.fix.line]!;
  const label = c.data.world.entities[value]?.label ?? value;
  const filled = fillWho(v, label);
  const hole = whoHole(v);
  return { filled, matches: !!hole && filled === v.kukyeok && josa(label, '이/가') === hole.restored };
}

export type FixOutcome = { status: 'restored' } | { status: 'not_ready' } | { status: 'not_recorded' } | { status: 'already' };

export function fix(w: Work, c: Ctx): FixOutcome {
  if (w.s.fixed) return { status: 'already' };
  if (w.s.goalValue === null) return { status: 'not_ready' };
  const cand = fixCandidate(c, w.s.goalValue);
  if (!cand?.matches) return { status: 'not_recorded' };
  w.s.fixed = true;
  w.s.restored = true;
  w.s.restoreStep = 0;
  // 아직 오지 않은 복원 전 묶음은 버린다(바뀐 세상에서 옛 말이 늦게 도착하지 않게)
  w.s.messenger = M.dropBursts(w.s.messenger, (id) => !!c.bursts.get(id)?.postRestore);
  w.fx.push({ kind: 'restore' });
  fireEvent(w, c, EVENTS0.restore);
  return { status: 'restored' };
}

/** 복원 박자: 단락 → 이웃 기록 → 07 독백 → (끝) 다리 */
export function advanceRestore(w: Work, c: Ctx): RestoreStep | 'done' {
  if (!w.s.restored) return 'done';
  if (w.s.restoreStep < RESTORE_STEPS.length - 1) {
    w.s.restoreStep += 1;
    const step = RESTORE_STEPS[w.s.restoreStep]!;
    if (step === 'monologue') for (const m of c.data.fix.monologue) if (!w.s.seenMonologues.includes(m)) w.s.seenMonologues.push(m), w.fx.push({ kind: 'monologue', id: m });
    return step;
  }
  finishEpilogue(w, c);
  return 'done';
}

export function finishEpilogue(w: Work, c: Ctx) {
  if (w.s.epilogueDone) return;
  w.s.epilogueDone = true;
  w.s.restoreStep = RESTORE_STEPS.length - 1;
  fireEvent(w, c, EVENTS0.teaser);
}

/** 고정률(큰 목표의 줄 하나): 0% → 고정 뒤 100% */
export const fixRate = (s: V6State) => ({ fixed: s.fixed ? 1 : 0, total: 1, pct: s.fixed ? 100 : 0 });

// ── 메신저 ─────────────────────────────────────────────────
export function tick(w: Work, c: Ctx, touching = false) {
  const r = M.tick(w.s.messenger, c.now, msgCtx(w, c, touching));
  w.s.messenger = r.state;
  return r.delivered;
}
export const openMessenger = (w: Work, c: Ctx) => void (w.s.messenger = M.openMessenger(w.s.messenger, c.now, msgCtx(w, c)));
export const chooseReply = (w: Work, c: Ctx, optionId: Id) => {
  const r = M.choose(w.s.messenger, optionId, c.now, msgCtx(w, c));
  w.s.messenger = r.state;
  return r.ok;
};

export const HINT_BURST_IDS: readonly Id[] = HINT_BURSTS;

// ── 저장 ───────────────────────────────────────────────────
export function pickPersisted(s: V6State): V6State {
  const out = {} as Record<string, unknown>;
  for (const k of PERSISTED_KEYS) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as V6State;
}

export interface V6SaveFile {
  schema: typeof V6_SCHEMA;
  version: number;
  savedAt: string;
  data: V6State;
}

export const serialize = (s: V6State, now = new Date()): V6SaveFile => ({ schema: V6_SCHEMA, version: V6_SAVE_VERSION, savedAt: now.toISOString(), data: structuredClone(pickPersisted(s)) });

/** 옛 저장(v5 「눈을 빌려 다시 쓰기」 v7)에서는 진행을 버리고 설정과 대화 기록만 남긴다 */
export function fromLegacy(legacy: unknown, seed = 1, now = 0): V6State {
  const base = freshState(seed, now);
  const d = (legacy && typeof legacy === 'object' ? (legacy as { data?: Record<string, unknown> }).data ?? legacy : {}) as Record<string, unknown>;
  base.settings = { ...base.settings, ...carrySettings(d.settings) } as Settings;
  const m = d.messenger as MessengerState | undefined;
  if (m && Array.isArray(m.log)) base.messenger = M.carryOver({ ...base.messenger, log: m.log }, now, !!d.restored);
  return base;
}

export class V6SaveError extends Error {}

/** 읽기: v8 만 받는다. 알 수 없는 것·더 새로운 것은 오류, 빠진 칸은 새 상태로 채운다 */
export function parseSave(raw: unknown): V6State {
  if (!raw || typeof raw !== 'object') throw new V6SaveError('저장 데이터가 손상되었습니다.');
  const f = raw as Partial<V6SaveFile>;
  if (f.schema !== V6_SCHEMA || typeof f.version !== 'number' || !f.data) throw new V6SaveError('알 수 없는 저장 형식입니다.');
  if (f.version > V6_SAVE_VERSION) throw new V6SaveError('더 새로운 버전의 저장 데이터입니다.');
  if (f.version < V6_SAVE_VERSION) return fromLegacy(f);
  const base = freshState(1, 0);
  const merged = { ...base, ...(f.data as Partial<V6State>), settings: { ...base.settings, ...((f.data as V6State).settings ?? {}) } };
  return pickPersisted(merged);
}

export function rand(w: Work): number {
  const [v, n] = nextRandom(w.s.rng);
  w.s.rng = n;
  return v;
}

export const hasPlayed = (s: V6State) => s.started;
