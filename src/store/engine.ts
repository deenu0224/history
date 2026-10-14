/**
 * 게임 진행 전이(순수에 가깝게: 상태 사본을 받아 고쳐 돌려준다). 스토어(gameStore.ts)는 이것을 감싼다.
 * 모든 시간은 ctx.now(ms) 하나 — 밖에서 넣는다(테스트는 가짜 시계).
 *
 * 한 동작 = act(state, ctx, fn): fn 이 사본을 고친 뒤 afterAction 이 공통 후처리를 한다:
 *   닫히는 눈(컷 밖에서만) → 모순 드러남 → 힌트 사다리 → 메신저 틱(배달·비동기 결과·첨부 문서).
 */
import { appearances, heldEvidence, idx, mergesAt, type Knowledge } from '@/core/ep';
import { closureDue, cutAvailability, eyesOpenedByTag, givenEyes } from '@/core/eyes';
import { isRevealed, resolve as resolveX } from '@/core/contradiction';
import { check, dueHint, markSent, trackActive, type Progress } from '@/core/hints';
import * as M from '@/core/messenger';
import { nextRandom } from '@/core/rng';
import { allRequiredRestored, availablePieces, checkSlotValue, judgeLine, type LineResult, type SetSlotResult } from '@/core/rewrite';
import { minutes, sameMoment } from '@/core/room';
import { searchIndex, searchMessage, normalizeQuery } from '@/core/search';
import { judgeTag, type TagJudgement } from '@/core/tag';
import type { Burst, Episode, Hhmm, Id, SlotKind } from '@/core/types';
import type { PersistedState } from './state';

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
  | { kind: 'restore' };

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
    for (const st of l.steps) m.set(`hint.${st.id}`, { id: `hint.${st.id}`, spontaneous: true, steps: [{ kind: 'say', id: `hint.${st.id}`, from: 'han', text: st.text }] });
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
  setClock(w, cl.effect.clock, 'S3');
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

export function afterAction(w: Work, c: Ctx) {
  checkClosures(w, c);
  checkReveals(w, c);
  runLinger(w, c);
  runHints(w, c);
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
    else if (w.s.fails['tag:any'] === 1 && rand(w) < 0.3) fireEvent(w, c, 'ev.tag_wrong');
    return out;
  }
  w.s.named[figureId] = cardId;
  completion(w, c);
  for (const e of eyesOpenedByTag(ep, figureId)) {
    if (w.s.openedEyes.includes(e.id) || w.s.closedEyes.includes(e.id)) continue;
    w.s.openedEyes.push(e.id);
    w.s.eyeOpenedAt[e.id] = c.now;
    out.openedEyes.push(e.id);
    w.fx.push({ kind: 'eye_open', eyeId: e.id });
    fireEvent(w, c, `ev.eye_open.${e.id}`);
    const opened = w.s.openedEyes.length + w.s.closedEyes.length;
    if (opened === 2) setClock(w, ep.clocks.S1, 'S1');
    else if (opened === 3) setClock(w, ep.clocks.S2, 'S2');
    else if (opened === 4) setClock(w, ep.clocks.E4);
  }
  for (const e of givenEyes(ep))
    if (e.figureId === figureId && e.personId === cardId) {
      out.ownerNamed = e.id;
      fireEvent(w, c, 'ev.owner_named');
    }
  return out;
}

// ── 그날의 방 ────────────────────────────────────────────────────
export const roomUnlocked = (s: PersistedState) => s.openedEyes.length + s.closedEyes.length >= 2;

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

export function selectRoomTime(w: Work, c: Ctx, time: Hhmm): { merges: string[][] } {
  w.s.roomTime = time;
  const found = mergesAt(c.ep, w.s.viewedCuts, time);
  const fresh: string[][] = [];
  for (const m of found) {
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

export function openRoom(w: Work, c: Ctx, time?: Hhmm): 'opened' | 'locked' {
  if (!roomUnlocked(w.s)) return 'locked';
  leaveCut(w, c);
  if (!w.s.roomOpened) {
    w.s.roomOpened = true;
    fireEvent(w, c, 'ev.room_open');
  }
  if (w.s.restored && !w.s.roomOpenedAfterRestore) {
    w.s.roomOpenedAfterRestore = true;
    fireEvent(w, c, 'ev.restore_room');
  }
  const viewingCut = w.s.viewer ? idx(c.ep).eye.get(w.s.viewer.eyeId)?.cuts[w.s.viewer.index] : undefined;
  const at = time ?? (viewingCut && w.s.viewedCuts.includes(viewingCut) ? idx(c.ep).cut.get(viewingCut)!.time : undefined);
  const chips = timeChips(c.ep, w.s.viewedCuts);
  const chip = at ? (chipFor(c.ep, w.s.viewedCuts, at) ?? chips[chips.length - 1]) : (w.s.roomTime ?? chips[chips.length - 1]);
  if (chip) selectRoomTime(w, c, chip);
  return 'opened';
}

// ── 모순 ─────────────────────────────────────────────────────────
export function resolveContradiction(w: Work, c: Ctx, id: Id, claimId: Id) {
  const x = c.ep.contradictions.find((y) => y.id === id);
  if (!x || !w.s.revealed.includes(id) || w.s.resolved[id]) return { status: 'invalid' as const };
  const r = resolveX(c.ep, x, claimId);
  if (r.status === 'resolved') {
    w.s.resolved[id] = r.winner;
    w.fx.push({ kind: 'resolve', contradictionId: id });
    completion(w, c);
    if (id === 'X1') fireEvent(w, c, 'ev.x1_resolved');
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
  if (results.some((r) => r.kind === 'person' && r.id === 'kim_ilson') && !w.s.restored) fireEvent(w, c, 'ev.search_kim');
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
  for (const p of r.personIds ?? []) if (!w.s.cardsFound.includes(p)) w.s.cardsFound.push(p);
  return true;
}

export function openDoc(w: Work, _c: Ctx, id: Id): boolean {
  if (!w.s.docs.includes(id)) return false;
  if (!w.s.docsOpened.includes(id)) w.s.docsOpened.push(id);
  return true;
}

// ── 기록 다시 쓰기 ───────────────────────────────────────────────
export const rewriteAvailable = (s: PersistedState) => s.closures.length > 0 && !!s.resolved.X1;

const contraState = (s: PersistedState) => ({ revealed: s.revealed, resolved: s.resolved, slotsOpened: s.slotsOpened });

export function composeRewrite(w: Work, c: Ctx): 'opened' | 'locked' | 'restored' {
  if (w.s.restored) return 'restored';
  if (!rewriteAvailable(w.s)) return 'locked';
  if (!w.s.rewrite.open) {
    w.s.rewrite.open = true;
    fireEvent(w, c, 'ev.write_open');
  }
  return 'opened';
}

export function placePiece(w: Work, c: Ctx, pieceId: Id): { status: 'ok'; lineId: Id } | { status: 'not_held' | 'locked' | 'already' } {
  if (!w.s.rewrite.open || w.s.restored) return { status: 'locked' };
  if (!availablePieces(c.ep, knowledge(w.s)).some((p) => p.id === pieceId)) return { status: 'not_held' };
  if (w.s.rewrite.lines.some((l) => l.pieceId === pieceId)) return { status: 'already' };
  const lineId = `ln${++w.s.rewrite.seq}`;
  w.s.rewrite.lines.push({ id: lineId, pieceId, values: {} });
  return { status: 'ok', lineId };
}

export function removeLine(w: Work, _c: Ctx, lineId: Id): boolean {
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
  if (r.status === 'ok') {
    line.values[kind] = value;
    delete w.s.rewrite.results[lineId];
  }
  return r;
}

export function clearSlot(w: Work, _c: Ctx, lineId: Id, kind: SlotKind) {
  const line = w.s.rewrite.lines.find((l) => l.id === lineId);
  if (line) {
    delete line.values[kind];
    delete w.s.rewrite.results[lineId];
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
    setClock(w, ep.clocks.S4, 'S4');
    completion(w, c);
  } else {
    bump(w, 'submit');
    if (Object.values(w.s.rewrite.results).includes('restored')) fireEvent(w, c, 'ev.write_partial');
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
export const RESTORE_STEPS = ['article', 'home', 'cards', 'messages', 'room', 'log', 'monologue', 'teaser'] as const;
export type RestoreStep = (typeof RESTORE_STEPS)[number];

export function restore(w: Work, c: Ctx): 'restored' | 'not_ready' | 'already' {
  if (w.s.restored) return 'already';
  if (!w.s.rewrite.complete) return 'not_ready';
  w.s.restored = true;
  w.s.restoreStep = 0;
  w.s.rewrite.open = false;
  w.fx.push({ kind: 'restore' });
  fireEvent(w, c, 'ev.restore');
  return 'restored';
}

export function advanceRestore(w: Work, c: Ctx): RestoreStep | 'done' {
  if (!w.s.restored) return 'done';
  if (w.s.restoreStep < RESTORE_STEPS.length - 1) {
    w.s.restoreStep += 1;
    const step = RESTORE_STEPS[w.s.restoreStep];
    if (step === 'teaser') finishEpilogue(w, c);
    return step;
  }
  finishEpilogue(w, c);
  return 'done';
}

export function finishEpilogue(w: Work, c: Ctx) {
  if (w.s.epilogueDone) return;
  w.s.epilogueDone = true;
  w.s.restoreStep = RESTORE_STEPS.length - 1;
  setClock(w, c.ep.clocks.S5, 'S5');
  fireEvent(w, c, 'ev.teaser');
}

// ── 재개 ─────────────────────────────────────────────────────────
export const RESUME_AFTER_MS = 10 * 60_000;

export function resumeEvent(ep: Episode, s: PersistedState): Id | null {
  if (s.restored) return null;
  if (s.rewrite.open) return 'ev.resume.write';
  if (s.closures.length) return 'ev.resume.after0600';
  if (s.revealed.includes('X1') && !s.resolved.X1) return 'ev.resume.x1';
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
