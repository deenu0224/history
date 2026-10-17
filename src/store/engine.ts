/**
 * 게임 진행 전이(순수에 가깝게: 상태 사본을 받아 고쳐 돌려준다). 스토어(gameStore.ts)는 이것을 감싼다.
 * 모든 시간은 ctx.now(ms) 하나 — 밖에서 넣는다(테스트는 가짜 시계).
 *
 * 한 동작 = act(state, ctx, fn): fn 이 사본을 고친 뒤 afterAction 이 공통 후처리를 한다:
 *   닫히는 눈(컷 밖에서만) → 모순 드러남 → 힌트 사다리 → 메신저 틱(배달·비동기 결과·첨부 문서).
 */
import { appearances, heldEvidence, idx, mergesAt, type Knowledge } from '@/core/ep';
import { closureDue, cutAvailability, eyesOpenedByTag, givenEyes } from '@/core/eyes';
import { geometry, isRevealed, resolve as resolveX, witnessEvidenceId } from '@/core/contradiction';
import { askHint as nextAskHint, check, dueHint, markSent, trackActive, type Progress } from '@/core/hints';
import * as M from '@/core/messenger';
import { nextRandom } from '@/core/rng';
import { allRequiredRestored, availablePieces, checkSlotValue, judgeLine, sentenceOf, sentenceSlots, type LineResult, type SetSlotResult } from '@/core/rewrite';
import { minutes, sameMoment } from '@/core/room';
import { searchIndex, searchMessage, normalizeQuery } from '@/core/search';
import { judgeLink, type LinkJudgement } from '@/core/link';
import { judgeTag, matchedFacts, type TagJudgement } from '@/core/tag';
import type { Burst, Contradiction, Episode, Hhmm, Id, SlotKind, Step } from '@/core/types';
import { freshState, type PersistedState } from './state';

export interface Ctx {
  ep: Episode;
  now: number;
  touching: boolean;
  messengerOpen: boolean;
}

/** 화면 연출 큐(저장 안 함): UI 가 보여 준 뒤 비운다 */
export type Fx =
  | { kind: 'eye_open'; eyeId: Id }
  | { kind: 'eye_close'; eyeId: Id }
  | { kind: 'tag'; verdict: string; cutId: Id; figureId: Id }
  | { kind: 'merge'; keys: string[]; posId: Id }
  | { kind: 'reveal'; contradictionId: Id }
  | { kind: 'resolve'; contradictionId: Id }
  | { kind: 'clock'; clock: Hhmm }
  | { kind: 'savepoint'; id: Id }
  | { kind: 'message'; id: Id; from: string; text: string }
  | { kind: 'restore' }
  /** 인물 카드를 얻었다(기록 열기·카드 줄 링크) — UI: 「인물 카드 +N」 */
  | { kind: 'cards_gained'; ids: Id[]; from: { kind: 'record' | 'fact_link'; id: Id } }
  /** 성공한 태그가 카드 줄에 먹선을 그었다 */
  | { kind: 'fact_link'; cardId: Id; factId: Id; evidenceId: Id }
  /** 에피소드가 끝났다(다음 에피소드가 열림) — UI: 다리 연출 뒤 startEpisode(next) */
  | { kind: 'episode_end'; episodeId: Id; next?: Id };

export interface Work {
  s: PersistedState;
  fx: Fx[];
}

const burstCache = new WeakMap<Episode, Map<Id, Burst>>();
/** 대본 묶음 + 힌트 단계마다 한 말풍선짜리 자발 묶음 */
export function burstsOf(ep: Episode): Map<Id, Burst> {
  const hit = burstCache.get(ep);
  if (hit) return hit;
  const m = new Map<Id, Burst>(ep.bursts.map((b) => [b.id, b]));
  for (const l of ep.ladders)
    for (const st of l.steps) {
      m.set(`hint.${st.id}`, { id: `hint.${st.id}`, spontaneous: true, steps: [{ kind: 'say', id: `hint.${st.id}`, from: 'han', text: st.text }] });
      // 플레이어가 물었을 때(「어디부터 볼까요?」): 자발 간격 제한 없음
      m.set(`ask.${st.id}`, { id: `ask.${st.id}`, steps: [{ kind: 'say', id: `${ep.id}.ask.${st.id}`, from: 'han', text: st.text }] });
    }
  m.set('ask.fallback', { id: 'ask.fallback', repeatable: true, steps: [{ kind: 'say', id: `${ep.id}.ask.fallback`, from: 'han', text: ep.askFallback }] });
  burstCache.set(ep, m);
  return m;
}

export const msgCtx = (w: Work, c: Ctx): M.MsgCtx => ({
  bursts: burstsOf(c.ep),
  touching: c.touching,
  messengerOpen: c.messengerOpen,
  fast: w.s.settings.fastMessages,
});

export function knowledge(s: PersistedState): Knowledge {
  return {
    viewedCuts: s.viewedCuts,
    named: s.named,
    merges: s.merges,
    openedEyes: s.openedEyes,
    closedEyes: s.closedEyes,
    cardsFound: s.cardsFound,
    restored: s.restored,
  };
}

export const tagsDone = (ep: Episode, s: PersistedState) => ep.tags.filter((t) => s.named[t.figureId] === t.personId).map((t) => t.id);

export function progress(ep: Episode, s: PersistedState): Progress {
  const base = baseProgress(ep, s);
  return { ...base, rewriteAvailable: check(base, ep.rewriteWhen), roomUnlocked: roomUnlocked(ep, s) };
}

function baseProgress(ep: Episode, s: PersistedState): Progress {
  return {
    viewed: s.viewedCuts,
    tagsDone: tagsDone(ep, s),
    eyesOpen: [...s.openedEyes, ...s.closedEyes],
    roomOpened: s.roomOpened,
    revealed: s.revealed,
    resolved: Object.keys(s.resolved),
    closureDone: s.closures.length > 0,
    rewriteOpen: s.rewrite.open,
    allRestored: s.rewrite.complete,
    restored: s.restored,
    viewingEye: s.viewer?.eyeId ?? null,
    swipes: s.swipes,
    fails: s.fails,
    cardsFound: s.cardsFound,
    docs: s.docs,
  };
}

function rand(w: Work): number {
  const [v, n] = nextRandom(w.s.rng);
  w.s.rng = n;
  return v;
}

export function fireEvent(w: Work, c: Ctx, id: Id): boolean {
  const r = M.fire(w.s.messenger, id, c.now, msgCtx(w, c));
  w.s.messenger = r.state;
  return r.accepted;
}

const fired = (w: Work, id: Id) => w.s.messenger.fired.includes(id);
const bump = (w: Work, key: string) => (w.s.fails[key] = (w.s.fails[key] ?? 0) + 1);

function setClock(w: Work, clock: Hhmm, savepoint?: Id) {
  if (w.s.clock !== clock) {
    w.s.clock = clock;
    w.fx.push({ kind: 'clock', clock });
  }
  if (savepoint && !w.s.savepoints.includes(savepoint)) {
    w.s.savepoints.push(savepoint);
    w.fx.push({ kind: 'savepoint', id: savepoint });
  }
}

function completion(w: Work, c: Ctx) {
  w.s.messenger = M.notifyCompletion(w.s.messenger, c.now);
}

// ── 공통 후처리 ─────────────────────────────────────────────────
function applyClosure(w: Work, c: Ctx, closureId: Id) {
  const cl = c.ep.closures.find((x) => x.id === closureId);
  if (!cl || w.s.closures.includes(closureId)) return;
  w.s.closures.push(closureId);
  w.s.pendingClosure = null;
  w.s.openedEyes = w.s.openedEyes.filter((e) => e !== cl.eyeId);
  if (!w.s.closedEyes.includes(cl.eyeId)) w.s.closedEyes.push(cl.eyeId);
  w.fx.push({ kind: 'eye_close', eyeId: cl.eyeId });
  setClock(w, c.ep.clocks.S3 ?? cl.effect.clock, 'S3');
  fireEvent(w, c, 'ev.closure');
}

function checkClosures(w: Work, c: Ctx) {
  for (const cl of c.ep.closures) {
    if (w.s.closures.includes(cl.id)) continue;
    if (!closureDue(c.ep, knowledge(w.s), cl, { eyeOpenedAt: w.s.eyeOpenedAt, now: c.now, done: w.s.closures })) continue;
    if (w.s.viewer) w.s.pendingClosure = cl.id; // 손가락 아래서 닫지 않는다 — 컷을 떠나는 순간에
    else applyClosure(w, c, cl.id);
  }
}

function checkReveals(w: Work, c: Ctx) {
  const k = knowledge(w.s);
  for (const x of c.ep.contradictions) {
    if (w.s.revealed.includes(x.id) || w.s.resolved[x.id]) continue;
    if (!isRevealed(c.ep, k, x, w.s.slotsOpened)) continue;
    w.s.revealed.push(x.id);
    w.fx.push({ kind: 'reveal', contradictionId: x.id });
    fireEvent(w, c, `ev.${x.id.toLowerCase()}`);
  }
}

function runHints(w: Work, c: Ctx) {
  const p = progress(c.ep, w.s);
  w.s.hints = trackActive(c.ep.ladders, w.s.hints, p, c.now);
  const due = dueHint(c.ep.ladders, w.s.hints, p, c.now, w.s.settings.hintLevel);
  if (!due) return;
  if (!M.canSpontaneous(w.s.messenger, c.now)) return;
  if (fireEvent(w, c, `hint.${due.stepId}`)) w.s.hints = markSent(w.s.hints, due.ladderId, c.now);
}

function runLinger(w: Work, c: Ctx) {
  const v = w.s.viewer;
  if (!v) return;
  const id = `ev.linger_cut.${v.eyeId}`;
  if (!burstsOf(c.ep).has(id) || fired(w, id)) return;
  if (c.now - v.enteredAt >= 25_000) fireEvent(w, c, id);
}

export function tickMessenger(w: Work, c: Ctx) {
  const r = M.tick(w.s.messenger, c.now, msgCtx(w, c));
  w.s.messenger = r.state;
  for (const m of r.delivered) {
    if (m.docId && !w.s.docs.includes(m.docId)) w.s.docs.push(m.docId);
    if (m.from !== 'me') w.fx.push({ kind: 'message', id: m.id, from: m.from, text: m.text });
  }
}

/** 조건 사건(Episode.triggers): 조건이 처음 맞을 때 한 번 */
function runTriggers(w: Work, c: Ctx) {
  const t = c.ep.triggers;
  if (!t?.length || !w.s.started) return;
  const p = progress(c.ep, w.s);
  for (const tr of t) if (!fired(w, tr.event) && check(p, tr.when)) fireEvent(w, c, tr.event);
}

/** 힌트 묶음(hint.*) → 그 사다리 */
const hintLadderCache = new WeakMap<Episode, Map<Id, Id>>();
function hintLadderOf(ep: Episode, burstId: Id): Id | undefined {
  let m = hintLadderCache.get(ep);
  if (!m) {
    m = new Map(ep.ladders.flatMap((l) => l.steps.map((st) => [`hint.${st.id}`, l.id] as [Id, Id])));
    hintLadderCache.set(ep, m);
  }
  return m.get(burstId);
}

/**
 * 철 지난 힌트를 거둔다: 힌트는 보낼 때 정한 뒤 입력 중·줄 서기로 몇 초 늦게 배달된다. 그사이 문제가 풀렸거나
 * 상황이 바뀌었으면(사다리가 꺼졌으면) 배달 직전에 버린다(맞힌 사람에게 「틀린 길」 신호를 주지 않는다).
 */
function pruneStaleHints(w: Work, c: Ctx) {
  const m = w.s.messenger;
  const ids = [...m.queue.map((q) => q.burstId), ...(m.active ? [m.active.burstId] : [])].filter((id) => id.startsWith('hint.'));
  if (!ids.length) return;
  const p = progress(c.ep, w.s);
  const stale = new Set(
    ids.filter((id) => {
      const l = c.ep.ladders.find((x) => x.id === hintLadderOf(c.ep, id));
      return !l || !check(p, l.activeWhen) || check(p, l.doneWhen);
    }),
  );
  if (stale.size) w.s.messenger = M.dropBursts(m, (id) => !stale.has(id));
}

/** 묶음이 이 문서를 첨부하는가(선택지 갈래 안까지) */
function attaches(steps: readonly Step[], docId: Id): boolean {
  return steps.some((st) => {
    if (st.kind === 'attach') return st.docId === docId;
    if (st.kind === 'choice') return st.options.some((o) => attaches(o.then, docId)) || attaches(st.after ?? [], docId);
    return false;
  });
}

/** 모순을 지금 판정할 수 있는가(Contradiction.resolvableWhen — 예: 1년 전 보고서를 받은 뒤) */
export const contradictionGateOpen = (ep: Episode, s: PersistedState, x: Contradiction) => !x.resolvableWhen || check(baseProgress(ep, s), x.resolvableWhen);

/** 앞당겨 배달할 때: 비동기를 시작에서 이 시간 안으로(메시지 빠르게면 × 0.4) */
export const EXPEDITE_MS = 8_000;

/**
 * 긴장 순서 보장: 드러난 모순이 문서를 기다리면(resolvableWhen.docs) 그 문서를 싣고 오는 비동기 결과를 앞당긴다.
 * (Ep1: 06:00 닫힘 → 「관측기 기록 좀 뒤져 볼게」 → 1년 전 보고서 → 그 뒤에야 X1 을 판정할 수 있다)
 */
function expediteGatedDocs(w: Work, c: Ctx) {
  for (const x of c.ep.contradictions) {
    if (!w.s.revealed.includes(x.id) || w.s.resolved[x.id] || contradictionGateOpen(c.ep, w.s, x)) continue;
    for (const docId of x.resolvableWhen?.docs ?? []) {
      if (w.s.docs.includes(docId)) continue;
      for (const t of w.s.messenger.tasks) {
        const b = burstsOf(c.ep).get(t.event);
        if (b && attaches(b.steps, docId)) w.s.messenger = M.expediteTask(w.s.messenger, t.event, c.now, EXPEDITE_MS * (w.s.settings.fastMessages ? M.FAST_FACTOR : 1));
      }
    }
  }
}

export function afterAction(w: Work, c: Ctx) {
  checkClosures(w, c);
  checkReveals(w, c);
  runTriggers(w, c);
  runLinger(w, c);
  runHints(w, c);
  if (w.s.rewrite.open && !w.s.restored) placePreplaced(w, c);
  pruneStaleHints(w, c);
  expediteGatedDocs(w, c);
  tickMessenger(w, c);
}

/** 한 동작: 사본을 만들어 fn 으로 고치고 후처리 */
export function act<R>(s: PersistedState, c: Ctx, fn: (w: Work) => R, opts: { action?: boolean } = {}): { state: PersistedState; fx: Fx[]; result: R } {
  const w: Work = { s: structuredClone(s), fx: [] };
  const result = fn(w);
  if (opts.action !== false) w.s.lastActionAt = c.now;
  w.s.lastActiveAt = c.now;
  afterAction(w, c);
  return { state: w.s, fx: w.fx, result };
}

// ── 동작들 ──────────────────────────────────────────────────────
/**
 * 에피소드를 바꾼다(순수): 진행 칸은 새로, 에피소드 사이에 남는 것(unlocked·completed·설정·시드·프롤로그·대화 기록)은 그대로.
 * 대화 기록은 이어지고 지난 에피소드의 ⟲ 말풍선은 굳는다(core/messenger carryOver).
 */
export function switchEpisode(s: PersistedState, nextId: Id, now: number): PersistedState {
  const f = freshState(s.seed, now, nextId);
  return {
    ...f,
    rng: s.rng,
    unlocked: s.unlocked.includes(nextId) ? [...s.unlocked] : [...s.unlocked, nextId],
    completed: [...s.completed],
    prologueSeen: s.prologueSeen,
    settings: { ...s.settings },
    messenger: M.carryOver(s.messenger, now, s.restored),
    lastActionAt: now,
    lastActiveAt: now,
  };
}

export function startEpisode(w: Work, c: Ctx): 'started' | 'already' {
  if (w.s.started) return 'already';
  w.s.started = true;
  w.s.clock = c.ep.clocks.start;
  for (const card of c.ep.cards) if (card.starter && !w.s.cardsFound.includes(card.id)) w.s.cardsFound.push(card.id);
  for (const e of givenEyes(c.ep))
    if (!w.s.openedEyes.includes(e.id)) {
      w.s.openedEyes.push(e.id);
      w.s.eyeOpenedAt[e.id] = c.now;
    }
  w.s.messenger = { ...w.s.messenger, lastAt: c.now, lastReadAt: c.now };
  fireEvent(w, c, 'ev.start');
  return 'started';
}

export type ViewStatus = 'viewed' | 'reviewed' | 'lost' | 'locked' | 'no_cut';

/** 컷을 떠나는 순간: 미뤄 둔 닫힘을 적용 */
function leaveCut(w: Work, c: Ctx) {
  if (w.s.pendingClosure) applyClosure(w, c, w.s.pendingClosure);
}

export function viewCut(w: Work, c: Ctx, eyeId: Id, index: number): { status: ViewStatus; cutId?: Id } {
  const eye = idx(c.ep).eye.get(eyeId);
  const cutId = eye?.cuts[index];
  if (!eye || !cutId) return { status: 'no_cut' };
  const prev = w.s.viewer;
  const leaving = prev && !(prev.eyeId === eyeId && prev.index === index);
  if (leaving) leaveCut(w, c);
  const av = cutAvailability(c.ep, knowledge(w.s), cutId);
  if (av === 'locked') return { status: 'locked', cutId };
  if (prev && prev.eyeId === eyeId && prev.index !== index) w.s.swipes += 1;
  if (!prev || leaving) w.s.viewer = { eyeId, index, enteredAt: c.now };
  if (av === 'lost') return { status: 'lost', cutId };
  if (!w.s.viewedCuts.includes(cutId)) {
    w.s.viewedCuts.push(cutId);
    w.s.cutViewedAt[cutId] = c.now;
    completion(w, c);
    return { status: 'viewed', cutId };
  }
  return { status: 'reviewed', cutId };
}

export function openEye(w: Work, c: Ctx, eyeId: Id): { status: ViewStatus; cutId?: Id; index?: number } {
  const eye = idx(c.ep).eye.get(eyeId);
  if (!eye) return { status: 'no_cut' };
  const k = knowledge(w.s);
  // 첫 번째로 안 본(볼 수 있는) 컷, 없으면 처음
  let index = eye.cuts.findIndex((id) => cutAvailability(c.ep, k, id) === 'viewable' && !w.s.viewedCuts.includes(id));
  if (index < 0) index = 0;
  return { ...viewCut(w, c, eyeId, index), index };
}

export function closeViewer(w: Work, c: Ctx) {
  leaveCut(w, c);
  w.s.viewer = null;
}

export interface TagOutcome {
  judgement: TagJudgement;
  openedEyes: Id[];
  ownerNamed?: Id;
  /** 성공: 먹선이 그어진 카드 줄 */
  matchedFacts?: { cardId: Id; factId: Id }[];
}

export function tag(w: Work, c: Ctx, cutId: Id, figureId: Id, cardId: Id, evidenceId: Id): TagOutcome {
  const ep = c.ep;
  const j = judgeTag(ep, knowledge(w.s), { cutId, figureId }, cardId, evidenceId);
  const out: TagOutcome = { judgement: j, openedEyes: [] };
  if (j.status !== 'judged') return out;
  w.s.tagLog.push({ cutId, figureId, cardId, evidenceId, verdict: j.verdict, at: c.now });
  w.fx.push({ kind: 'tag', verdict: j.verdict, cutId, figureId });
  const rule = ep.tags.find((t) => t.figureId === figureId);
  const fig = idx(ep).figure.get(figureId);
  if (j.verdict !== 'ok') {
    bump(w, 'tag:any');
    if (rule) bump(w, `tag:${rule.id}`);
    if (fig?.anonymous && bump(w, 'tag:anon') >= 2) fireEvent(w, c, 'ev.tag_anon');
    if (fig?.revealOnRestore && bump(w, 'tag:noevidence') >= 2) fireEvent(w, c, 'ev.tag_noevidence');
    const decoy = rule?.decoys.find((d) => d.personId === cardId);
    if (decoy) fireEvent(w, c, decoy.event);
    else if (j.verdict === 'not_linked') fireEvent(w, c, 'ev.tag_unmerged');
    else if (w.s.fails['tag:any'] === 1 && rand(w) < 0.3) fireEvent(w, c, 'ev.tag_wrong');
    return out;
  }
  w.s.named[figureId] = cardId;
  completion(w, c);
  for (const m of matchedFacts(ep, cardId, evidenceId)) {
    out.matchedFacts = [...(out.matchedFacts ?? []), m];
    if (!w.s.factLinks[m.factId]) {
      w.s.factLinks[m.factId] = evidenceId;
      w.fx.push({ kind: 'fact_link', cardId: m.cardId, factId: m.factId, evidenceId });
    }
  }
  if (rule?.okEvent) fireEvent(w, c, rule.okEvent);
  for (const e of eyesOpenedByTag(ep, figureId)) {
    if (w.s.openedEyes.includes(e.id) || w.s.closedEyes.includes(e.id)) continue;
    w.s.openedEyes.push(e.id);
    w.s.eyeOpenedAt[e.id] = c.now;
    out.openedEyes.push(e.id);
    w.fx.push({ kind: 'eye_open', eyeId: e.id });
    fireEvent(w, c, `ev.eye_open.${e.id}`);
    const opened = w.s.openedEyes.length + w.s.closedEyes.length;
    if (opened === 2 && ep.clocks.S1) setClock(w, ep.clocks.S1, 'S1');
    else if (opened === 3 && ep.clocks.S2) setClock(w, ep.clocks.S2, 'S2');
    else if (opened === 4 && ep.clocks.E4) setClock(w, ep.clocks.E4);
  }
  for (const e of givenEyes(ep))
    if (e.figureId === figureId && e.personId === cardId) {
      out.ownerNamed = e.id;
      fireEvent(w, c, 'ev.owner_named');
    }
  return out;
}

// ── 그날의 방 ────────────────────────────────────────────────────
/** 그날의 방을 열 수 있는가: 이 에피소드에 방이 있고, 눈 둘 이상 + Episode.roomWhen */
export function roomUnlocked(ep: Episode, s: PersistedState): boolean {
  if (!ep.verbs.room || s.openedEyes.length + s.closedEyes.length < 2) return false;
  return !ep.roomWhen || check(baseProgress(ep, s), ep.roomWhen);
}

/** 본 컷의 시각들(±5분은 한 칩) */
export function timeChips(ep: Episode, viewed: readonly Id[]): Hhmm[] {
  const times = [...new Set(viewed.map((id) => idx(ep).cut.get(id)?.time).filter((t): t is string => !!t))].sort((a, b) => minutes(a) - minutes(b));
  const chips: Hhmm[] = [];
  for (const t of times) if (!chips.length || minutes(t) - minutes(chips[chips.length - 1]) > 5) chips.push(t);
  return chips;
}

export function chipFor(ep: Episode, viewed: readonly Id[], time: Hhmm): Hhmm | undefined {
  return timeChips(ep, viewed).find((ch) => sameMoment(ch, time) || (minutes(time) >= minutes(ch) && minutes(time) - minutes(ch) <= 5));
}

/** 이 시각이 겹침 시범(Episode.autoMergeAt)인가 */
const isDemoTime = (ep: Episode, time: Hhmm) => (ep.autoMergeAt ?? []).some((t) => sameMoment(t, time));

/**
 * 방의 시각을 고른다. 겹침은 시범 시각(Episode.autoMergeAt)에서만 저절로 생긴다 — 그 밖의 「같은 사람」은
 * 플레이어가 linkMarkers 로 직접 잇는다. 돌려주는 merges 는 새로 생긴 시범 겹침.
 */
export function selectRoomTime(w: Work, c: Ctx, time: Hhmm): { merges: string[][] } {
  w.s.roomTime = time;
  const fresh: string[][] = [];
  // 복원 뒤의 방은 보상 — 같은 사람은 모두 이어진 채로 보인다
  if (isDemoTime(c.ep, time) || w.s.restored)
    for (const m of mergesAt(c.ep, w.s.viewedCuts, time)) {
      const key = m.keys.join('|');
      if (w.s.merges.some((x) => x.join('|') === key)) continue;
      w.s.merges.push(m.keys);
      fresh.push(m.keys);
      w.fx.push({ kind: 'merge', keys: m.keys, posId: m.posId });
    }
  if (fresh.length) {
    completion(w, c);
    fireEvent(w, c, 'ev.merge_first');
  }
  return { merges: fresh };
}

/**
 * 「같은 사람 잇기」: 한 관측의 표시(등장 키 A)와 다른 관측의 표시(B)를 잇는다. 판정은 core/link(시각·자리 데이터).
 * 맞으면 겹침이 저장되고(이름 붙이기 근거가 이어진다) fx merge, 아니면 보이는 이유 한 줄(같은 시각이 아니다 / 같은 자리가 아니다).
 * 실패는 공짜다(벌·카운트 없음 — 힌트 사다리의 실패 수에만 센다).
 */
export function linkMarkers(w: Work, c: Ctx, keyA: string, keyB: string): LinkJudgement {
  if (!w.s.roomOpened || !roomUnlocked(c.ep, w.s)) return { verdict: 'invalid' };
  const j = judgeLink(c.ep, knowledge(w.s), keyA, keyB);
  if (j.verdict === 'ok' && j.keys) {
    w.s.merges.push(j.keys);
    w.fx.push({ kind: 'merge', keys: j.keys, posId: j.posId! });
    completion(w, c);
    fireEvent(w, c, 'ev.merge_first');
  } else if (j.verdict !== 'invalid' && j.verdict !== 'already') bump(w, 'link');
  return j;
}

export function openRoom(w: Work, c: Ctx, time?: Hhmm): 'opened' | 'locked' {
  if (!roomUnlocked(c.ep, w.s)) return 'locked';
  leaveCut(w, c);
  const first = !w.s.roomOpened;
  if (!w.s.roomOpened) {
    w.s.roomOpened = true;
    fireEvent(w, c, 'ev.room_open');
  }
  if (w.s.restored && !w.s.roomOpenedAfterRestore) {
    w.s.roomOpenedAfterRestore = true;
    fireEvent(w, c, 'ev.restore_room');
  }
  const viewingCut = w.s.viewer ? idx(c.ep).eye.get(w.s.viewer.eyeId)?.cuts[w.s.viewer.index] : undefined;
  // 처음 여는 방은 겹침 시범의 시각으로(그 시각의 겹침이 보일 때) — 「같은 사람」을 한 번 보여 준 뒤 플레이어가 직접 잇는다
  const demo = first && !time ? (c.ep.autoMergeAt ?? []).find((t) => mergesAt(c.ep, w.s.viewedCuts, t).length) : undefined;
  const at = demo ?? time ?? (viewingCut && w.s.viewedCuts.includes(viewingCut) ? idx(c.ep).cut.get(viewingCut)!.time : undefined);
  const chips = timeChips(c.ep, w.s.viewedCuts);
  const chip = at ? (chipFor(c.ep, w.s.viewedCuts, at) ?? chips[chips.length - 1]) : (w.s.roomTime ?? chips[chips.length - 1]);
  if (chip) selectRoomTime(w, c, chip);
  return 'opened';
}

/**
 * 「이 시각, 그날의 방」(이름 붙이기 시트의 링크): 그 컷의 시각으로 방을 연다. 겹침은 저절로 만들지 않는다 —
 * 플레이어가 그 방에서 「같은 사람 잇기」로 잇는다(시범 시각이면 시범 겹침만). 돌려주는 merges 는 새로 생긴 시범 겹침.
 */
export function openRoomAtCut(w: Work, c: Ctx, cutId: Id): { status: 'opened' | 'locked' | 'no_cut'; time?: Hhmm; merges: string[][] } {
  const cut = idx(c.ep).cut.get(cutId);
  if (!cut || !w.s.viewedCuts.includes(cutId)) return { status: 'no_cut', merges: [] };
  const before = w.s.merges.length;
  const r = openRoom(w, c, cut.time);
  if (r === 'locked') return { status: 'locked', merges: [] };
  return { status: 'opened', time: w.s.roomTime ?? cut.time, merges: w.s.merges.slice(before) };
}

// ── 모순 ─────────────────────────────────────────────────────────
/** 모순 풀기 = 근거 2칸: 판단(claimId) + 근거(그날의 방의 자리 사실 — 지금 방에 보이는 눈의 것만) */
export function resolveContradiction(w: Work, c: Ctx, id: Id, claimId: Id, evidenceId?: Id) {
  const x = c.ep.contradictions.find((y) => y.id === id);
  if (!x || !w.s.revealed.includes(id) || w.s.resolved[id]) return { status: 'invalid' as const };
  const shown = geometry(c.ep, knowledge(w.s), x).witnesses.map((m) => witnessEvidenceId(x, m.eyeId));
  if (!evidenceId || !shown.includes(evidenceId) || !x.claims.includes(claimId)) return { status: 'invalid' as const };
  // 긴장 순서: 아직 기다리는 것(1년 전 보고서 등)이 오기 전엔 판정하지 않는다 — 고른 것은 그대로, 손해 없음
  if (!contradictionGateOpen(c.ep, w.s, x)) return { status: 'wait' as const };
  const r = resolveX(c.ep, x, claimId, evidenceId);
  if (r.status === 'resolved') {
    w.s.resolved[id] = r.winner;
    w.fx.push({ kind: 'resolve', contradictionId: id });
    completion(w, c);
    fireEvent(w, c, `ev.${id.toLowerCase()}_resolved`);
  } else if (r.status === 'retry') bump(w, `contra:${id}`);
  return r;
}

// ── 찾기 ─────────────────────────────────────────────────────────
export interface SearchOutcome {
  status: 'ok' | 'unknown' | 'too_short' | 'empty' | 'no_article';
  message: string;
  results: { kind: 'person' | 'record' | 'log'; id: Id }[];
}

export function search(w: Work, c: Ctx, query: string): SearchOutcome {
  const ep = c.ep;
  const visible = ep.search.filter((e) => (!e.afterRestore || w.s.restored) && e.results.every((r) => r.kind !== 'log' || w.s.docs.includes(r.id)));
  const res = searchIndex(visible, query);
  let status: SearchOutcome['status'] = res.status;
  const results: SearchOutcome['results'] = [];
  let erasedTop = false;
  for (const m of res.matches) {
    const e = m.entry as (typeof ep.search)[number];
    if (e.noArticleBeforeRestore && !w.s.restored) {
      if (m === res.matches[0]) erasedTop = true;
      continue;
    }
    for (const r of e.results) if (!results.some((x) => x.kind === r.kind && x.id === r.id)) results.push(r);
  }
  if (erasedTop) status = 'no_article';
  for (const r of results) if (r.kind === 'person' && !w.s.cardsFound.includes(r.id)) w.s.cardsFound.push(r.id);
  w.s.searchLog.push({ seq: w.s.searchLog.length + 1, query, normalized: normalizeQuery(query), status, results, clock: w.s.clock });
  if (!w.s.restored) for (const se of ep.searchEvents ?? []) if (results.some((r) => r.kind === 'person' && r.id === se.personId)) fireEvent(w, c, se.event);
  if (results.length) completion(w, c);
  return { status, message: searchMessage(status, query, results.length), results };
}

export function openCard(w: Work, _c: Ctx, id: Id): boolean {
  if (!w.s.cardsFound.includes(id)) return false;
  if (!w.s.cardsOpened.includes(id)) w.s.cardsOpened.push(id);
  return true;
}

export function openRecord(w: Work, c: Ctx, id: Id): boolean {
  const r = c.ep.records.find((x) => x.id === id);
  if (!r) return false;
  if ((r.afterRestore || r.erasedBeforeRestore) && !w.s.restored) return false;
  if (!w.s.recordsOpened.includes(id)) w.s.recordsOpened.push(id);
  grantCards(w, r.personIds ?? [], { kind: 'record', id });
  return true;
}

function grantCards(w: Work, ids: readonly Id[], from: { kind: 'record' | 'fact_link'; id: Id }): Id[] {
  const gained = ids.filter((p) => !w.s.cardsFound.includes(p));
  if (!gained.length) return [];
  w.s.cardsFound.push(...gained);
  w.fx.push({ kind: 'cards_gained', ids: gained, from });
  return gained;
}

/**
 * 카드 줄 안의 낱말 링크(Fact.links)를 탭: 그 인물 카드를 얻는다(찾기가 아니다).
 * 그 카드를 가지고 있어야 하고, 그 줄이 지금 보여야 한다.
 */
export function followFactLink(w: Work, c: Ctx, factId: Id, targetCardId: Id): { status: 'gained' | 'already' | 'invalid'; cardId?: Id } {
  const f = idx(c.ep).fact.get(factId);
  if (!f || !w.s.cardsFound.includes(f.cardId) || (f.fact.afterRestore && !w.s.restored)) return { status: 'invalid' };
  const link = (f.fact.links ?? []).find((l) => l.cardId === targetCardId);
  if (!link) return { status: 'invalid' };
  if (!w.s.cardsOpened.includes(f.cardId)) w.s.cardsOpened.push(f.cardId);
  const g = grantCards(w, [link.cardId], { kind: 'fact_link', id: factId });
  if (g.length) {
    completion(w, c);
    fireEvent(w, c, 'ev.card_link');
  }
  return { status: g.length ? 'gained' : 'already', cardId: link.cardId };
}

/** 「어디부터 볼까요?」: 07 이 묻고, 켜진 사다리의 다음 단이 바로 온다(없으면 한 선임의 한 줄) */
/** 물은 뒤 다시 물을 수 있기까지(ms) — 힌트 사다리를 연달아 털지 못하게 */
export const ASK_COOLDOWN_MS = 30_000;

/** 지금 「어디부터 볼까요?」를 물을 수 있는가: 답할 힌트가 있고, 방금 묻지 않았고, 대화가 비어 있을 때만 */
export function canAskHint(ep: Episode, s: PersistedState, now: number): boolean {
  if (s.messenger.choice || s.restored) return false;
  if (s.hints.askedAt !== undefined && now - s.hints.askedAt < ASK_COOLDOWN_MS) return false;
  const p = progress(ep, s);
  return nextAskHint(ep.ladders, trackActive(ep.ladders, s.hints, p, now), p) !== null;
}

export function askHint(w: Work, c: Ctx): { status: 'hint' | 'busy'; ladderId?: Id } {
  if (!canAskHint(c.ep, w.s, c.now)) return { status: 'busy' };
  const n = (w.s.hints.asked ?? 0) + 1;
  w.s.hints = { ...w.s.hints, asked: n, askedAt: c.now };
  w.s.messenger = M.sayMine(w.s.messenger, `${c.ep.id}.ask${n}`, c.ep.askText, c.now);
  const p = progress(c.ep, w.s);
  w.s.hints = trackActive(c.ep.ladders, w.s.hints, p, c.now);
  const h = nextAskHint(c.ep.ladders, w.s.hints, p)!;
  fireEvent(w, c, `ask.${h.stepId}`);
  w.s.hints = markSent(w.s.hints, h.ladderId, c.now);
  return { status: 'hint', ladderId: h.ladderId };
}

export function openDoc(w: Work, _c: Ctx, id: Id): boolean {
  if (!w.s.docs.includes(id)) return false;
  if (!w.s.docsOpened.includes(id)) w.s.docsOpened.push(id);
  return true;
}

// ── 기록 다시 쓰기 ───────────────────────────────────────────────
/** 기록 다시 쓰기를 열 수 있는가(Episode.rewriteWhen) */
export const rewriteAvailable = (ep: Episode, s: PersistedState) => ep.verbs.rewrite && check(baseProgress(ep, s), ep.rewriteWhen);

const contraState = (s: PersistedState) => ({ revealed: s.revealed, resolved: s.resolved, slotsOpened: s.slotsOpened });

export function composeRewrite(w: Work, c: Ctx): 'opened' | 'locked' | 'restored' {
  if (w.s.restored) return 'restored';
  if (!rewriteAvailable(c.ep, w.s)) return 'locked';
  if (!w.s.rewrite.open) {
    w.s.rewrite.open = true;
    placePreplaced(w, c);
    fireEvent(w, c, 'ev.write_open');
  }
  return 'opened';
}

/** 미리 놓이는 줄(RecordSentence.preplaced)인가 */
export const isPreplacedPiece = (ep: Episode, pieceId: Id) => {
  const p = ep.pieces.find((x) => x.id === pieceId);
  return !!p?.sentenceId && !!ep.sentences.find((x) => x.id === p.sentenceId)?.preplaced;
};

/**
 * 미리 놓이는 줄: 꼭 돌아와야 할 문장은 조각을 가지고 있으면 시각순 자리에 미리 세워 둔다(고를 일이 아니다 — 칸만 채운다).
 * 다시 쓰기를 연 뒤에 조각을 얻어도 그때 놓인다. 함께 쓰는 칸(shared)은 이미 고른 값을 물려받는다.
 */
function placePreplaced(w: Work, c: Ctx) {
  const have = availablePieces(c.ep, knowledge(w.s));
  for (const sent of c.ep.sentences.filter((x) => x.preplaced)) {
    const piece = have.find((p) => p.sentenceId === sent.id);
    if (!piece || w.s.rewrite.lines.some((l) => l.pieceId === piece.id)) continue;
    w.s.rewrite.lines.push({ id: `ln${++w.s.rewrite.seq}`, pieceId: piece.id, values: inheritShared(c.ep, w.s.rewrite.lines, sent.id) });
  }
}

/** 이 문장의 shared 칸에 넣을, 이미 다른 줄에서 고른 값 */
function inheritShared(ep: Episode, lines: readonly { pieceId: Id; values: Partial<Record<SlotKind, string>> }[], sentenceId: Id): Partial<Record<SlotKind, string>> {
  const out: Partial<Record<SlotKind, string>> = {};
  const sent = ep.sentences.find((x) => x.id === sentenceId);
  for (const sl of sent ? sentenceSlots(sent) : [])
    if (sl.shared)
      for (const l of lines) {
        const v = l.values[sl.kind];
        if (v !== undefined && lineHasShared(ep, l.pieceId, sl.kind)) out[sl.kind] = v;
      }
  return out;
}

const lineHasShared = (ep: Episode, pieceId: Id, kind: SlotKind) => {
  const s = sentenceOf(ep, ep.pieces.find((p) => p.id === pieceId)?.sentenceId);
  return !!s && sentenceSlots(s).some((sl) => sl.kind === kind && sl.shared);
};

export function placePiece(w: Work, c: Ctx, pieceId: Id): { status: 'ok'; lineId: Id } | { status: 'not_held' | 'locked' | 'already' } {
  if (!w.s.rewrite.open || w.s.restored) return { status: 'locked' };
  if (!availablePieces(c.ep, knowledge(w.s)).some((p) => p.id === pieceId)) return { status: 'not_held' };
  if (w.s.rewrite.lines.some((l) => l.pieceId === pieceId)) return { status: 'already' };
  const lineId = `ln${++w.s.rewrite.seq}`;
  const sid = c.ep.pieces.find((p) => p.id === pieceId)?.sentenceId;
  w.s.rewrite.lines.push({ id: lineId, pieceId, values: sid ? inheritShared(c.ep, w.s.rewrite.lines, sid) : {} });
  return { status: 'ok', lineId };
}

export function removeLine(w: Work, c: Ctx, lineId: Id): boolean {
  const line = w.s.rewrite.lines.find((l) => l.id === lineId);
  if (line && isPreplacedPiece(c.ep, line.pieceId)) return false; // 미리 놓인 줄은 빼지 않는다
  const before = w.s.rewrite.lines.length;
  w.s.rewrite.lines = w.s.rewrite.lines.filter((l) => l.id !== lineId);
  delete w.s.rewrite.results[lineId];
  return w.s.rewrite.lines.length < before;
}

/** 칸을 열었다(값 시트) — '몇' 칸에서 X2 가 드러난다 */
export function openSlot(w: Work, _c: Ctx, kind: SlotKind) {
  if (!w.s.slotsOpened.includes(kind)) w.s.slotsOpened.push(kind);
}

export function fillSlot(w: Work, c: Ctx, lineId: Id, kind: SlotKind, value: string): SetSlotResult {
  const line = w.s.rewrite.lines.find((l) => l.id === lineId);
  if (!line || !w.s.rewrite.open) return { status: 'no_slot' };
  if (!w.s.slotsOpened.includes(kind)) w.s.slotsOpened.push(kind);
  checkReveals(w, c);
  const r = checkSlotValue(c.ep, knowledge(w.s), line, kind, value, contraState(w.s));
  if (r.status === 'ok')
    for (const l of sharedLines(c.ep, w.s.rewrite.lines, line, kind)) {
      if (l !== line && w.s.rewrite.results[l.id] === 'restored') continue; // 이미 고정된 줄은 그대로
      l.values[kind] = value;
      delete w.s.rewrite.results[l.id];
    }
  return r;
}

/** 이 칸을 함께 쓰는 줄들(shared 칸이면 같은 종류의 shared 칸을 가진 고정 안 된 줄 모두, 아니면 그 줄 하나) */
function sharedLines<L extends { id: Id; pieceId: Id }>(ep: Episode, lines: L[], line: L, kind: SlotKind): L[] {
  if (!lineHasShared(ep, line.pieceId, kind)) return [line];
  return lines.filter((l) => l === line || lineHasShared(ep, l.pieceId, kind));
}

export function clearSlot(w: Work, c: Ctx, lineId: Id, kind: SlotKind) {
  const line = w.s.rewrite.lines.find((l) => l.id === lineId);
  if (line)
    for (const l of sharedLines(c.ep, w.s.rewrite.lines, line, kind)) {
      if (w.s.rewrite.results[l.id] === 'restored' && l !== line) continue;
      delete l.values[kind];
      delete w.s.rewrite.results[l.id];
    }
}

export interface SubmitOutcome {
  results: Record<Id, LineResult>;
  complete: boolean;
}

function judgeLines(w: Work, c: Ctx, lineIds: Id[]): SubmitOutcome {
  const ep = c.ep;
  const results: Record<Id, LineResult> = {};
  let witness = false;
  for (const l of w.s.rewrite.lines) {
    if (!lineIds.includes(l.id)) continue;
    const r = judgeLine(ep, l);
    results[l.id] = r;
    w.s.rewrite.results[l.id] = r;
    if (r === 'witness') witness = true;
  }
  w.s.rewrite.submits += 1;
  const complete = allRequiredRestored(ep, w.s.rewrite.results, w.s.rewrite.lines);
  if (witness) fireEvent(w, c, 'ev.witness_line');
  if (complete) {
    w.s.rewrite.complete = true;
    if (ep.clocks.S4) setClock(w, ep.clocks.S4, 'S4');
    completion(w, c);
  } else {
    bump(w, 'submit');
    if (Object.values(w.s.rewrite.results).includes('restored')) fireEvent(w, c, 'ev.write_partial');
    else fireEvent(w, c, 'ev.write_miss');
  }
  return { results, complete };
}

export function submitRewrite(w: Work, c: Ctx): SubmitOutcome | { status: 'locked' } {
  if (!w.s.rewrite.open || w.s.restored) return { status: 'locked' };
  return judgeLines(w, c, w.s.rewrite.lines.map((l) => l.id));
}

export function submitLine(w: Work, c: Ctx, lineId: Id): SubmitOutcome | { status: 'locked' } {
  if (!w.s.rewrite.open || w.s.restored) return { status: 'locked' };
  return judgeLines(w, c, [lineId]);
}

// ── 복원 ─────────────────────────────────────────────────────────
/** 에피소드 1 의 복원 단계(다른 에피소드는 Episode.restoreSteps) */
// 복원의 순간(구멍이 채워지고 출처가 붙음)은 기록 다시 쓰기 화면 안에서 — 단계가 아니다.
// 대화의 현실 재기록은 조용하다 — 따로 보여 주는 단계가 없다(메신저를 거슬러 올라가야 안다)
export const RESTORE_STEPS = ['home', 'cards', 'monologue', 'teaser'] as const;
/** 'home' | 'cards' | 'monologue' | 'teaser' | (Ep0) 'bridge' */
export type RestoreStep = string;

export function restore(w: Work, c: Ctx): 'restored' | 'not_ready' | 'already' {
  if (w.s.restored) return 'already';
  if (!w.s.rewrite.complete) return 'not_ready';
  w.s.restored = true;
  w.s.restoreStep = 0;
  w.s.rewrite.open = false;
  // 아직 오지 않은 복원 전 묶음(힌트·답 기다리는 선택지·비동기)은 버린다 — 바뀐 세상에서 옛 말이 늦게 도착하지 않게
  const bursts = burstsOf(c.ep);
  w.s.messenger = M.dropBursts(w.s.messenger, (id) => !!bursts.get(id)?.postRestore);
  w.fx.push({ kind: 'restore' });
  fireEvent(w, c, 'ev.restore');
  return 'restored';
}

export function advanceRestore(w: Work, c: Ctx): RestoreStep | 'done' {
  if (!w.s.restored) return 'done';
  const steps = c.ep.restoreSteps;
  if (w.s.restoreStep < steps.length - 1) {
    w.s.restoreStep += 1;
    const step = steps[w.s.restoreStep];
    if (w.s.restoreStep === steps.length - 1) finishEpilogue(w, c);
    return step;
  }
  finishEpilogue(w, c);
  return 'done';
}

export function finishEpilogue(w: Work, c: Ctx) {
  if (w.s.epilogueDone) return;
  w.s.epilogueDone = true;
  w.s.restoreStep = c.ep.restoreSteps.length - 1;
  if (c.ep.clocks.S5) setClock(w, c.ep.clocks.S5, 'S5');
  fireEvent(w, c, 'ev.teaser');
  if (!w.s.completed.includes(c.ep.id)) w.s.completed.push(c.ep.id);
  if (c.ep.next && !w.s.unlocked.includes(c.ep.next)) w.s.unlocked.push(c.ep.next);
  w.fx.push({ kind: 'episode_end', episodeId: c.ep.id, ...(c.ep.next ? { next: c.ep.next } : {}) });
}

// ── 재개 ─────────────────────────────────────────────────────────
export const RESUME_AFTER_MS = 10 * 60_000;

export function resumeEvent(ep: Episode, s: PersistedState): Id | null {
  if (s.restored) return null;
  if (s.rewrite.open) return 'ev.resume.write';
  if (s.closures.length) return 'ev.resume.after0600';
  const open = s.revealed.find((x) => !s.resolved[x]);
  if (open) return `ev.resume.${open.toLowerCase()}`;
  if (s.openedEyes.length + s.closedEyes.length >= 2) return 'ev.resume.room';
  if (!tagsDone(ep, s).length) return 'ev.resume.notag';
  return null;
}

export function resume(w: Work, c: Ctx): Id | null {
  const away = c.now - w.s.lastActiveAt;
  if (away < RESUME_AFTER_MS || !w.s.started) return null;
  // 떠나 있던 동안은 멈춘 것으로 본다: 메신저 계획·닫힘 타이머·힌트 시계를 함께 민다
  w.s.messenger = M.rebase(w.s.messenger, away);
  for (const k of Object.keys(w.s.eyeOpenedAt)) w.s.eyeOpenedAt[k] += away;
  for (const k of Object.keys(w.s.hints.activeSince)) w.s.hints.activeSince[k] += away;
  for (const k of Object.keys(w.s.hints.lastSentAt)) w.s.hints.lastSentAt[k] += away;
  if (w.s.viewer) w.s.viewer.enteredAt += away;
  const ev = resumeEvent(c.ep, w.s);
  if (ev) fireEvent(w, c, ev);
  return ev;
}

/** 가진 근거 수 같은 요약(홈 재개 한 줄) */
export function resumeSummary(ep: Episode, s: PersistedState) {
  return {
    eyesOpen: s.openedEyes.length,
    contradictionsLeft: s.revealed.filter((x) => !s.resolved[x]).length,
    evidence: heldEvidence(ep, knowledge(s)).length,
    appearances: appearances(ep, s.viewedCuts).length,
  };
}

export { check as checkCond };
