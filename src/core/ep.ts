/**
 * 에피소드 색인(순수, 메모이즈)과 플레이어 지식(Knowledge)에서 계산하는 공통 것들:
 * 가진 근거, 컷 속 등장(appearance), 같은 사람 묶음(겹침).
 */
import { hearing, posOf, sameMoment } from './room';
import type { CutRef, Detail, Episode, EvidenceKind, Eye, Fact, Figure, Hhmm, Id, Line, PersonCard } from './types';

export interface EpIndex {
  cut: Map<Id, CutRef>;
  eye: Map<Id, Eye>;
  line: Map<Id, Line>;
  detail: Map<Id, Detail>;
  card: Map<Id, PersonCard>;
  fact: Map<Id, { fact: Fact; cardId: Id }>;
  figure: Map<Id, Figure>;
  /** 근거 id → 종류 */
  evidenceKind: Map<Id, EvidenceKind>;
  /** 근거(말·본 것) id → 그 근거가 담긴 컷 id(말은 또렷이 들린 컷만) */
  evidenceCuts: Map<Id, Id[]>;
  /** 사람(카드) id → 그 사람을 숨은 진실로 가진 figure id */
  figureOfPerson: Map<Id, Id>;
}

const cache = new WeakMap<Episode, EpIndex>();

export function idx(ep: Episode): EpIndex {
  const hit = cache.get(ep);
  if (hit) return hit;
  const evidenceCuts = new Map<Id, Id[]>();
  const add = (id: Id, cutId: Id) => evidenceCuts.set(id, [...(evidenceCuts.get(id) ?? []), cutId]);
  for (const c of ep.cuts) {
    for (const h of c.heard) if (h.clarity === 'clear') add(h.lineId, c.id);
    for (const d of c.details) add(d, c.id);
  }
  const evidenceKind = new Map<Id, EvidenceKind>();
  for (const l of ep.lines) evidenceKind.set(l.id, 'line');
  for (const d of ep.details) evidenceKind.set(d.id, 'detail');
  const fact = new Map<Id, { fact: Fact; cardId: Id }>();
  for (const c of ep.cards)
    for (const f of c.facts) {
      fact.set(f.id, { fact: f, cardId: c.id });
      evidenceKind.set(f.id, 'fact');
    }
  const out: EpIndex = {
    cut: new Map(ep.cuts.map((c) => [c.id, c])),
    eye: new Map(ep.eyes.map((e) => [e.id, e])),
    line: new Map(ep.lines.map((l) => [l.id, l])),
    detail: new Map(ep.details.map((d) => [d.id, d])),
    card: new Map(ep.cards.map((c) => [c.id, c])),
    fact,
    figure: new Map(ep.figures.map((f) => [f.id, f])),
    evidenceKind,
    evidenceCuts,
    figureOfPerson: new Map(ep.figures.filter((f) => f.truePersonId).map((f) => [f.truePersonId!, f.id])),
  };
  cache.set(ep, out);
  return out;
}

/** 플레이어가 아는 것(스토어 상태의 부분집합) */
export interface Knowledge {
  /** 본 컷(관측 로그) */
  viewedCuts: readonly Id[];
  /** figure id → 붙인 이름(카드 id) */
  named: Readonly<Record<Id, Id>>;
  /** 그날의 방에서 드러난 겹침(등장 키 묶음) */
  merges: readonly (readonly string[])[];
  openedEyes: readonly Id[];
  closedEyes: readonly Id[];
  cardsFound: readonly Id[];
  restored: boolean;
}

export const emptyKnowledge = (): Knowledge => ({
  viewedCuts: [],
  named: {},
  merges: [],
  openedEyes: [],
  closedEyes: [],
  cardsFound: [],
  restored: false,
});

/** 관측 로그의 근거(또렷이 들은 말 + 본 것). 순서: 처음 본 컷 순 */
export function heldEvidence(ep: Episode, k: Knowledge): Id[] {
  const I = idx(ep);
  const out: Id[] = [];
  for (const cutId of k.viewedCuts) {
    const c = I.cut.get(cutId);
    if (!c) continue;
    for (const h of c.heard) if (h.clarity === 'clear' && !out.includes(h.lineId)) out.push(h.lineId);
    for (const d of c.details) if (!out.includes(d)) out.push(d);
  }
  return out;
}

export const holds = (ep: Episode, k: Knowledge, evidenceId: Id) => heldEvidence(ep, k).includes(evidenceId);

// ── 등장(appearance) ────────────────────────────────────────────
export type Appearance =
  | { key: string; kind: 'figure'; cutId: Id; eyeId: Id; time: Hhmm; posId: Id; figureId: Id }
  | { key: string; kind: 'owner'; cutId: Id; eyeId: Id; time: Hhmm; posId: Id; figureId?: Id }
  | { key: string; kind: 'mention'; cutId: Id; eyeId: Id; time: Hhmm; posId: Id; lineId: Id };

export const figureKey = (cutId: Id, figureId: Id) => `${cutId}#${figureId}`;
export const ownerKey = (cutId: Id) => `${cutId}#owner`;
export const mentionKey = (cutId: Id, lineId: Id) => `${cutId}#say:${lineId}`;

/** 컷 하나의 등장들: 화면 속 사람 + 눈의 주인(자기 자리) + 말이 가리킨 자리 */
export function cutAppearances(ep: Episode, cutId: Id): Appearance[] {
  const I = idx(ep);
  const c = I.cut.get(cutId);
  if (!c) return [];
  const eye = I.eye.get(c.eyeId)!;
  const out: Appearance[] = [];
  if (eye.seatId)
    out.push({ key: ownerKey(c.id), kind: 'owner', cutId: c.id, eyeId: eye.id, time: c.time, posId: eye.seatId, ...(eye.figureId ? { figureId: eye.figureId } : {}) });
  for (const f of c.figures)
    out.push({ key: figureKey(c.id, f.figureId), kind: 'figure', cutId: c.id, eyeId: eye.id, time: c.time, posId: f.seatId, figureId: f.figureId });
  for (const h of c.heard) {
    const l = I.line.get(h.lineId);
    if (h.clarity === 'clear' && l?.refers && 'posId' in l.refers)
      out.push({ key: mentionKey(c.id, l.id), kind: 'mention', cutId: c.id, eyeId: eye.id, time: l.refers.time, posId: l.refers.posId, lineId: l.id });
  }
  return out;
}

export function appearances(ep: Episode, cutIds: readonly Id[]): Appearance[] {
  return cutIds.flatMap((id) => cutAppearances(ep, id));
}

/** 숨은 진실: 그 등장이 실제로 누구인가(검증기·판정 내부용. UI 에 내보내지 않는다) */
export function trueFigureOf(ep: Episode, a: Appearance): Id | undefined {
  if (a.kind === 'figure') return a.figureId;
  if (a.kind === 'owner') return a.figureId ?? `owner:${a.eyeId}`;
  // 말이 가리킨 자리: 그 시각 그 자리에 있던 사람
  const at = ep.cuts
    .flatMap((c) => cutAppearances(ep, c.id))
    .filter((x) => x.kind !== 'mention' && x.posId === a.posId && sameMoment(x.time, a.time));
  return at.length ? trueFigureOf(ep, at[0]) : undefined;
}

// ── 겹침(같은 사람 묶기) ─────────────────────────────────────────
export interface MergeGroup {
  /** 정렬된 등장 키 — 저장되는 겹침 id */
  keys: string[];
  posId: Id;
  time: Hhmm;
}

/**
 * 그날의 방에서 시각 time 을 고르면 보이는 겹침: 본 컷의 등장 중 그 시각 ±5분, 같은 자리, 서로 다른 컷에서 온 것 둘 이상.
 */
export function mergesAt(ep: Episode, viewedCuts: readonly Id[], time: Hhmm): MergeGroup[] {
  const near = appearances(ep, viewedCuts).filter((a) => sameMoment(a.time, time));
  const byPos = new Map<Id, Appearance[]>();
  for (const a of near) byPos.set(a.posId, [...(byPos.get(a.posId) ?? []), a]);
  const out: MergeGroup[] = [];
  for (const [posId, list] of byPos) {
    if (new Set(list.map((a) => a.cutId)).size < 2) continue;
    out.push({ keys: list.map((a) => a.key).sort(), posId, time });
  }
  return out.sort((a, b) => a.posId.localeCompare(b.posId));
}

/** 같은 사람 묶음(union-find): 같은 기억 속 같은 사람 + 드러난 겹침 */
export function personGroups(ep: Episode, k: Knowledge): Map<string, string> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const apps = appearances(ep, k.viewedCuts);
  for (const a of apps) find(a.key);
  // 한 기억 안에서 같은 사람(같은 사람을 따라 본다)
  const sameEye = new Map<string, string>();
  for (const a of apps) {
    if (a.kind === 'mention') continue;
    const id = a.kind === 'figure' ? `${a.eyeId}|${a.figureId}` : `${a.eyeId}|owner`;
    if (sameEye.has(id)) union(a.key, sameEye.get(id)!);
    else sameEye.set(id, a.key);
  }
  for (const m of k.merges) for (let i = 1; i < m.length; i++) union(m[0], m[i]);
  const out = new Map<string, string>();
  for (const a of apps) out.set(a.key, find(a.key));
  return out;
}

/** 말이 가리키는 등장들(근거가 담긴 본 컷 기준) */
export function referredAppearances(ep: Episode, k: Knowledge, evidenceId: Id): Appearance[] {
  const I = idx(ep);
  const l = I.line.get(evidenceId);
  if (!l?.refers) return [];
  const cuts = (I.evidenceCuts.get(evidenceId) ?? []).filter((c) => k.viewedCuts.includes(c));
  const apps = appearances(ep, cuts);
  const r = l.refers;
  if ('figureId' in r) return apps.filter((a) => a.kind === 'figure' && a.figureId === r.figureId);
  return apps.filter((a) => a.kind === 'mention' && a.lineId === l.id);
}

/** 눈 주인의 그 시각 자리(listener) */
export function eyeSeatPos(ep: Episode, eyeId: Id) {
  const e = idx(ep).eye.get(eyeId);
  return e?.seatId ? posOf(ep.room, e.seatId) : undefined;
}

/** 컷의 그 말이 이 눈 자리에서 어떻게 들리는가 */
export function hearingInCut(ep: Episode, cut: CutRef, lineId: Id) {
  const l = idx(ep).line.get(lineId)!;
  const seat = eyeSeatPos(ep, cut.eyeId)!;
  return hearing(ep.room, seat, l.origin, l.volume);
}
