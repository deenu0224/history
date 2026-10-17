/**
 * 메신저 엔진(순수, 결정적). docs/DIALOGUE_GUIDE.md §2 타이밍 모델.
 *
 *   typingMs(n)  = clamp(500 + 55n, 700, 3800)          n = 공백 제외 글자 수
 *   gapMs        = 1000 + rand(0, 2000)                  같은 묶음의 다음 말풍선까지
 *   gapHeavyMs   = 2500 + rand(0, 1500)                  heavy 다음
 *   readMs       = online 800 + rand(0,1700) / away 20000 + rand(0,40000)
 *   replyDelay   = readMs + 600 + rand(0, 1400)          내 답을 읽고 입력 시작까지
 *   hesitation   p = 0.12 / heavy 0.45 / 직전이 망설임이면 0 → 입력 중 700~1400 → 사라짐 500~1200 → 다시 입력
 *   asyncResult  = max(40~90s, 플레이어의 다음 '완료 행동'), 상한 120s
 *   빠르게      = 모든 시간 × 0.4, 망설임 없음
 * 끼어들기: 자발 메시지는 90초에 하나 · 손가락을 대고 있으면 보내지 않고 뗀 뒤 600ms · 한 묶음은 4말풍선까지(그 뒤는 메신저를 열 때까지).
 * 시계는 밖에서 넣는다(now, ms). 난수 상태는 저장된다.
 *
 * 현실 재기록(DIALOGUE_GUIDE §1-10): 복원되면 대화 기록 전체에서 새 현실과 어긋나는 줄이 그 자리에서 다시 쓰인다 —
 * 동료의 말도, 07 이 보낸 답도. 표시는 없다(⟲·원문 보기 없음). 원래 글은 저장에만 남고(text / bakedFrom) 화면에는 나오지 않는다.
 * 다시 쓰인 말풍선은 복원 뒤 처음 화면에 들어올 때 한 번만 먹이 번진다(inkSeen 에 기록, 움직임 줄이기면 효과 없음).
 */
import { nextRandom } from './rng';
import type { Burst, ChoiceStep, Id, MsgFrom, Presence, Step } from './types';

export const SPONTANEOUS_GAP_MS = 90_000;
export const BURST_CAP = 4;
export const RELEASE_DELAY_MS = 600;
export const FAST_FACTOR = 0.4;
/** 답이 없는 선택지가 사라지기까지: 다른 묶음이 기다리면 45초, 아니면 180초 */
export const CHOICE_EXPIRE_WAITING_MS = 45_000;
export const CHOICE_EXPIRE_MS = 180_000;

export const typingMs = (text: string) => Math.min(3800, Math.max(700, 500 + 55 * text.replace(/\s/g, '').length));

export interface MsgItem {
  id: Id;
  from: MsgFrom;
  kind: 'bubble' | 'system' | 'attach' | 'mine';
  text: string;
  at: number;
  burstId: Id;
  /** 이 에피소드가 복원되면 이 글로 다시 쓰인다(동료의 말·내 답 모두). text 는 원래 글 그대로 저장된다 */
  restored?: string;
  heavy?: boolean;
  docId?: Id;
  /** 내 말: 한 선임이 읽은 시각 */
  readAt?: number;
  /** 지난 에피소드에서 복원 때 다시 쓰인 말풍선의 원래 글 */
  bakedFrom?: string;
}

export interface Planned {
  step: Step;
  /** 입력 중 표시 시작(없으면 표시 없음) */
  typingAt?: number;
  /** 망설임: 이 구간엔 입력 중이 사라진다 */
  hideFrom?: number;
  hideTo?: number;
  deliverAt: number;
  hesitated?: boolean;
}

export interface AsyncTask {
  event: Id;
  startAt: number;
  earliestAt: number;
  capAt: number;
  actionAt?: number;
}

export interface MessengerState {
  rng: number;
  log: MsgItem[];
  queue: { burstId: Id; at: number }[];
  active: { burstId: Id; rest: Step[]; sinceOpen: number; firstPending: boolean; prevHeavy: boolean; prevHesitated: boolean } | null;
  planned: Planned | null;
  /** 4말풍선 상한에 걸려 메신저를 열기를 기다림 */
  stalled: boolean;
  choice: { burstId: Id; step: ChoiceStep; offeredAt: number } | null;
  presence: Presence;
  tasks: AsyncTask[];
  /** 보낸 묶음(한 번만) */
  fired: Id[];
  lastSpontaneousAt: number | null;
  /** 마지막으로 뭔가 일어난 시각(다음 계획의 기준) */
  lastAt: number;
  /** 손가락 때문에 미룸 */
  heldForTouch: boolean;
  /** 메신저를 마지막으로 본 시각(안 읽음 계산) */
  lastReadAt: number;
  /** 다시 쓰인 뒤 먹 번짐을 이미 보여 준 말풍선(한 번만). 옛 저장에는 없다 */
  inkSeen?: Id[];
}

export interface MsgCtx {
  bursts: ReadonlyMap<Id, Burst>;
  touching?: boolean;
  messengerOpen?: boolean;
  fast?: boolean;
}

export function createMessenger(seed: number, now = 0): MessengerState {
  return {
    rng: seed | 0,
    log: [],
    queue: [],
    active: null,
    planned: null,
    stalled: false,
    choice: null,
    presence: 'online',
    tasks: [],
    fired: [],
    lastSpontaneousAt: null,
    lastAt: now,
    heldForTouch: false,
    lastReadAt: now,
  };
}

/** 가변 작업 사본 */
class Run {
  s: MessengerState;
  delivered: MsgItem[] = [];
  constructor(
    s: MessengerState,
    readonly ctx: MsgCtx,
  ) {
    this.s = structuredClone(s);
  }
  rand(min: number, max: number) {
    const [v, n] = nextRandom(this.s.rng);
    this.s.rng = n;
    return min + (max - min) * v;
  }
  k(ms: number) {
    return this.ctx.fast ? ms * FAST_FACTOR : ms;
  }
}

export type FireResult = { state: MessengerState; accepted: boolean; reason?: 'already' | 'rate_limited' | 'unknown' };

/** 사건 → 묶음을 줄 세운다. 자발 묶음은 90초 간격 제한, 한 번만(repeatable 제외). */
export function fire(s: MessengerState, burstId: Id, now: number, ctx: MsgCtx): FireResult {
  const b = ctx.bursts.get(burstId);
  if (!b) return { state: s, accepted: false, reason: 'unknown' };
  if (!b.repeatable && s.fired.includes(burstId)) return { state: s, accepted: false, reason: 'already' };
  if (b.spontaneous && s.lastSpontaneousAt !== null && now - s.lastSpontaneousAt < SPONTANEOUS_GAP_MS)
    return { state: s, accepted: false, reason: 'rate_limited' };
  return {
    state: {
      ...s,
      fired: s.fired.includes(burstId) ? s.fired : [...s.fired, burstId],
      queue: [...s.queue, { burstId, at: now }],
      lastSpontaneousAt: b.spontaneous ? now : s.lastSpontaneousAt,
    },
    accepted: true,
  };
}

/** 자발 메시지를 지금 보낼 수 있는가 */
export const canSpontaneous = (s: MessengerState, now: number) =>
  s.lastSpontaneousAt === null || now - s.lastSpontaneousAt >= SPONTANEOUS_GAP_MS;

/** 다음 단계를 계획한다. base = 이 단계가 시작될 수 있는 가장 이른 시각 */
function planNext(r: Run, base: number, typingStartAt?: number): void {
  const s = r.s;
  const a = s.active;
  s.planned = null;
  if (!a) return;
  const step = a.rest[0];
  if (!step) {
    s.active = null;
    return;
  }
  switch (step.kind) {
    case 'choice':
      a.rest.shift();
      s.choice = { burstId: a.burstId, step, offeredAt: base };
      return;
    case 'async': {
      a.rest.shift();
      const earliest = base + r.k(r.rand(step.minS, step.maxS) * 1000);
      s.tasks.push({ event: step.event, startAt: base, earliestAt: earliest, capAt: base + r.k(step.capS * 1000) });
      planNext(r, base, typingStartAt);
      return;
    }
    case 'status':
      a.rest.shift();
      s.presence = step.presence;
      planNext(r, base, typingStartAt);
      return;
    case 'pause': {
      const ms = r.k(step.ms);
      s.planned = step.fakeTyping
        ? { step, typingAt: base + ms * 0.3, hideFrom: base + ms * 0.6, hideTo: base + ms, deliverAt: base + ms }
        : { step, deliverAt: base + ms };
      return;
    }
    case 'system':
    case 'attach':
      s.planned = { step, deliverAt: base + r.k(400) };
      return;
    case 'say': {
      if (a.sinceOpen >= BURST_CAP && !r.ctx.messengerOpen) {
        s.stalled = true;
        return;
      }
      let t0: number;
      if (typingStartAt !== undefined) t0 = typingStartAt;
      else if (a.firstPending) t0 = base + r.k(r.rand(400, 1200));
      else t0 = base + r.k(a.prevHeavy ? r.rand(2500, 4000) : r.rand(1000, 3000));
      const p = r.ctx.fast || a.prevHesitated ? 0 : step.heavy ? 0.45 : 0.12;
      const typing = r.k(typingMs(step.text));
      if (p > 0 && r.rand(0, 1) < p) {
        const hideFrom = t0 + r.k(r.rand(700, 1400));
        const hideTo = hideFrom + r.k(r.rand(500, 1200));
        s.planned = { step, typingAt: t0, hideFrom, hideTo, deliverAt: hideTo + typing, hesitated: true };
      } else s.planned = { step, typingAt: t0, deliverAt: t0 + typing };
      return;
    }
  }
}

function deliver(r: Run, p: Planned): void {
  const s = r.s;
  const a = s.active!;
  const step = a.rest.shift()!;
  s.lastAt = p.deliverAt;
  const base = { at: p.deliverAt, burstId: a.burstId };
  if (step.kind === 'say') {
    const item: MsgItem = { id: step.id, from: step.from, kind: 'bubble', text: step.text, ...base, ...(step.restored ? { restored: step.restored } : {}), ...(step.heavy ? { heavy: true } : {}) };
    s.log.push(item);
    r.delivered.push(item);
    a.sinceOpen += 1;
    a.prevHeavy = !!step.heavy;
    a.prevHesitated = !!p.hesitated;
    a.firstPending = false;
  } else if (step.kind === 'system') {
    const item: MsgItem = { id: step.id, from: 'system', kind: 'system', text: step.text, ...base };
    s.log.push(item);
    r.delivered.push(item);
  } else if (step.kind === 'attach') {
    const item: MsgItem = { id: step.id, from: 'han', kind: 'attach', text: step.label, docId: step.docId, ...base };
    s.log.push(item);
    r.delivered.push(item);
  }
  // pause: 시간만 흐른다
  planNext(r, p.deliverAt);
}

function startNext(r: Run, now: number): boolean {
  const s = r.s;
  if (s.active || s.choice || !s.queue.length) return false;
  const q = s.queue.shift()!;
  const b = r.ctx.bursts.get(q.burstId);
  if (!b) return true;
  s.active = { burstId: b.id, rest: structuredClone(b.steps), sinceOpen: 0, firstPending: true, prevHeavy: false, prevHesitated: false };
  void now;
  planNext(r, Math.max(q.at, s.lastAt));
  return true;
}

function expireChoice(r: Run, now: number): void {
  const s = r.s;
  const c = s.choice;
  if (!c) return;
  const limit = s.queue.length ? CHOICE_EXPIRE_WAITING_MS : CHOICE_EXPIRE_MS;
  if (now - c.offeredAt < limit) return;
  s.choice = null;
  const after = c.step.after ?? [];
  if (after.length) {
    s.active = { burstId: c.burstId, rest: structuredClone(after), sinceOpen: 0, firstPending: true, prevHeavy: false, prevHesitated: false };
    planNext(r, c.offeredAt + limit);
  } else s.active = null;
}

export interface TickResult {
  state: MessengerState;
  delivered: MsgItem[];
}

/** 시간을 now 까지 흘린다(배달·비동기 결과·선택지 만료). */
export function tick(s0: MessengerState, now: number, ctx: MsgCtx): TickResult {
  const r = new Run(s0, ctx);
  const s = r.s;
  for (let guard = 0; guard < 500; guard++) {
    // 비동기 결과
    for (const t of [...s.tasks]) {
      const due = t.actionAt !== undefined ? Math.min(Math.max(t.earliestAt, t.actionAt), t.capAt) : t.capAt;
      if (now >= due) {
        s.tasks = s.tasks.filter((x) => x !== t);
        const fr = fire(s, t.event, due, ctx);
        if (fr.accepted) Object.assign(s, fr.state);
      }
    }
    expireChoice(r, now);
    if (!s.active && !s.choice && s.queue.length) {
      startNext(r, now);
      continue;
    }
    if (s.active && !s.planned && !s.stalled && !s.choice) {
      planNext(r, s.lastAt);
      if (!s.planned && !s.active) continue;
    }
    const p = s.planned;
    if (!p || p.deliverAt > now) break;
    const visible = p.step.kind === 'say' || p.step.kind === 'system' || p.step.kind === 'attach';
    if (ctx.touching && visible) {
      s.heldForTouch = true;
      break;
    }
    deliver(r, p);
  }
  return { state: s, delivered: r.delivered };
}

/** 손가락을 뗐다: 미뤄 둔 말풍선은 600ms 뒤 */
export function release(s: MessengerState, now: number, fast = false): MessengerState {
  if (!s.heldForTouch || !s.planned) return { ...s, heldForTouch: false };
  const at = now + (fast ? RELEASE_DELAY_MS * FAST_FACTOR : RELEASE_DELAY_MS);
  return { ...s, heldForTouch: false, planned: { ...s.planned, deliverAt: Math.max(s.planned.deliverAt, at) } };
}

/** 메신저를 열었다: 읽음 처리, 4말풍선 상한 풀기 */
export function openMessenger(s0: MessengerState, now: number, ctx: MsgCtx): MessengerState {
  const r = new Run(s0, { ...ctx, messengerOpen: true });
  const s = r.s;
  s.lastReadAt = now;
  if (s.active) s.active.sinceOpen = 0;
  if (s.stalled) {
    s.stalled = false;
    planNext(r, Math.max(now, s.lastAt));
  }
  return s;
}

export type ChooseResult = { state: MessengerState; ok: boolean };

/** 답장(내 차례에만) */
export function choose(s0: MessengerState, optionId: Id, now: number, ctx: MsgCtx): ChooseResult {
  if (!s0.choice) return { state: s0, ok: false };
  const opt = s0.choice.step.options.find((o) => o.id === optionId);
  if (!opt) return { state: s0, ok: false };
  const r = new Run(s0, ctx);
  const s = r.s;
  const c = s.choice!;
  const readAt = now + r.k(s.presence === 'online' ? r.rand(800, 2500) : r.rand(20_000, 60_000));
  s.log.push({ id: `${c.step.id}:${opt.id}`, from: 'me', kind: 'mine', text: opt.text, at: now, burstId: c.burstId, readAt, ...(opt.restored ? { restored: opt.restored } : {}) });
  s.choice = null;
  s.lastAt = Math.max(s.lastAt, now);
  const rest = [...structuredClone(opt.then), ...structuredClone(c.step.after ?? [])];
  if (rest.length) {
    s.active = { burstId: c.burstId, rest, sinceOpen: 0, firstPending: true, prevHeavy: false, prevHesitated: false };
    planNext(r, readAt, readAt + r.k(r.rand(600, 2000)));
  } else s.active = null;
  return { state: s, ok: true };
}

/** 플레이어의 '완료 행동'(태그 성공·모순 해소·새 컷 등) — 비동기 결과의 조건 */
export function notifyCompletion(s: MessengerState, now: number): MessengerState {
  if (!s.tasks.some((t) => t.actionAt === undefined && t.startAt < now)) return s;
  return { ...s, tasks: s.tasks.map((t) => (t.actionAt === undefined && t.startAt < now ? { ...t, actionAt: now } : t)) };
}

/** 저장 뒤 오래 떠났다 돌아옴: 계획된 시각을 지금으로 옮긴다(한꺼번에 쏟아지지 않게) */
export function rebase(s: MessengerState, delta: number): MessengerState {
  if (delta <= 0) return s;
  const sh = (n?: number) => (n === undefined ? n : n + delta);
  return {
    ...s,
    lastAt: s.lastAt + delta,
    planned: s.planned
      ? { ...s.planned, typingAt: sh(s.planned.typingAt), hideFrom: sh(s.planned.hideFrom), hideTo: sh(s.planned.hideTo), deliverAt: s.planned.deliverAt + delta }
      : null,
    tasks: s.tasks.map((t) => ({ ...t, startAt: t.startAt + delta, earliestAt: t.earliestAt + delta, capAt: t.capAt + delta, ...(t.actionAt !== undefined ? { actionAt: t.actionAt + delta } : {}) })),
    queue: s.queue.map((q) => ({ ...q, at: q.at + delta })),
    choice: s.choice ? { ...s.choice, offeredAt: s.choice.offeredAt + delta } : null,
  };
}

// ── 보기 ─────────────────────────────────────────────────────────
/** 화면에 주는 말풍선: 원래 글(text·restored·bakedFrom)은 넘기지 않는다 — 다시 쓰기는 조용하다 */
export type MsgView = Omit<MsgItem, 'text' | 'restored' | 'bakedFrom'> & {
  /** 지금 현실의 글 */
  display: string;
  /** 현실 재기록으로 바뀐 말풍선(표시는 없다; 먹 번짐·테스트용) */
  rewritten: boolean;
  /** 아직 먹 번짐을 보여 주지 않았다(화면에 처음 들어올 때 한 번) */
  bleed: boolean;
};

/** 이 말풍선이 지금 현실에서 보이는 글과, 다시 쓰였는지 */
export function currentText(m: MsgItem, restored: boolean): { display: string; rewritten: boolean } {
  if (m.bakedFrom !== undefined) return { display: m.text, rewritten: true };
  if (restored && m.restored) return { display: m.restored, rewritten: true };
  return { display: m.text, rewritten: false };
}

export interface MessengerView {
  items: MsgView[];
  /** 한 선임(또는 오 실장)이 입력 중 */
  typing: { from: MsgFrom } | null;
  presence: Presence;
  /** 내 차례일 때만 */
  choices: { id: Id; text: string }[] | null;
  unread: number;
  /** 다른 화면 배너용: 가장 최근 상대 말 */
  latest: MsgItem | null;
}

export function view(s: MessengerState, now: number, restored: boolean): MessengerView {
  const p = s.planned;
  let typing: MessengerView['typing'] = null;
  if (p && p.typingAt !== undefined && now >= p.typingAt && now < p.deliverAt && !(p.hideFrom !== undefined && now >= p.hideFrom && now < (p.hideTo ?? 0))) {
    typing = { from: p.step.kind === 'say' ? p.step.from : 'han' };
  }
  const others = s.log.filter((m) => m.from !== 'me');
  return {
    items: s.log.map((m) => {
      const { text: _t, restored: _r, bakedFrom: _b, ...rest } = m;
      const cur = currentText(m, restored);
      return { ...rest, ...cur, bleed: cur.rewritten && !(s.inkSeen ?? []).includes(m.id) };
    }),
    typing,
    presence: s.presence,
    choices: s.choice ? s.choice.step.options.map((o) => ({ id: o.id, text: o.text })) : null,
    unread: others.filter((m) => m.at > s.lastReadAt).length,
    latest: others.length ? others[others.length - 1] : null,
  };
}

/** 먹 번짐을 보여 줬다(말풍선마다 한 번) */
export function markInkSeen(s: MessengerState, ids: readonly Id[]): MessengerState {
  const seen = s.inkSeen ?? [];
  const add = ids.filter((id) => !seen.includes(id));
  return add.length ? { ...s, inkSeen: [...seen, ...add] } : s;
}

/** 대기 중인 일이 있는가(테스트·UI 의 틱 주기 조절용) */
export const isBusy = (s: MessengerState) => !!(s.planned || s.queue.length || s.active || s.tasks.length);

/** 내가 먼저 말한다(「어디부터 볼까요?」 같은 빠른 질문). 선택지가 떠 있으면 하지 않는다. */
export function sayMine(s: MessengerState, id: Id, text: string, now: number): MessengerState {
  if (s.choice) return s;
  const r = new Run(s, { bursts: new Map() });
  const readAt = now + (r.s.presence === 'online' ? r.rand(800, 2500) : r.rand(20_000, 60_000));
  r.s.log.push({ id, from: 'me', kind: 'mine', text, at: now, burstId: id, readAt });
  r.s.lastAt = Math.max(r.s.lastAt, readAt);
  return r.s;
}

/**
 * 다음 에피소드로 대화를 이어 간다: 지난 대화(log)는 남기고, 줄·계획·선택지·비동기·보낸 묶음은 비운다.
 * 지난 에피소드가 복원되었다면 다시 쓰인 말풍선(내 답 포함)은 복원 뒤 글로 굳힌다(원래 글은 bakedFrom, 저장에만).
 */
export function carryOver(s: MessengerState, now: number, prevRestored: boolean): MessengerState {
  return {
    ...s,
    log: s.log.map((m) => {
      if (!m.restored) return m;
      const { restored, ...rest } = m;
      return prevRestored ? { ...rest, text: restored, bakedFrom: m.text } : rest;
    }),
    queue: [],
    active: null,
    planned: null,
    stalled: false,
    choice: null,
    tasks: [],
    fired: [],
    lastSpontaneousAt: null,
    lastAt: now,
    heldForTouch: false,
    lastReadAt: now,
  };
}

/**
 * 아직 배달되지 않은 묶음을 버린다(keep 이 false 인 것): 줄·지금 묶음(계획 포함)·선택지·비동기.
 * 복원 때 복원 전 묶음을 버리거나(postRestore 만 남김), 철 지난 힌트를 보내기 직전에 거둘 때 쓴다. 이미 배달된 말풍선은 그대로.
 */
export function dropBursts(s: MessengerState, keep: (burstId: Id) => boolean): MessengerState {
  const activeGone = !!s.active && !keep(s.active.burstId);
  const choiceGone = !!s.choice && !keep(s.choice.burstId);
  const queue = s.queue.filter((q) => keep(q.burstId));
  const tasks = s.tasks.filter((t) => keep(t.event));
  if (!activeGone && !choiceGone && queue.length === s.queue.length && tasks.length === s.tasks.length) return s;
  return {
    ...s,
    queue,
    tasks,
    ...(activeGone ? { active: null, planned: null, stalled: false, heldForTouch: false } : {}),
    ...(choiceGone ? { choice: null } : {}),
  };
}

/** 이 사건을 기다리는 비동기 결과를 앞당긴다: 시작에서 withinMs 뒤(이미 지났으면 지금) 안에 온다 */
export function expediteTask(s: MessengerState, event: Id, now: number, withinMs: number): MessengerState {
  let changed = false;
  const tasks = s.tasks.map((t) => {
    if (t.event !== event) return t;
    const due = Math.max(t.startAt + withinMs, Math.min(now, t.capAt));
    if (t.capAt <= due) return t;
    changed = true;
    return { ...t, capAt: due, earliestAt: Math.min(t.earliestAt, due) };
  });
  return changed ? { ...s, tasks } : s;
}
