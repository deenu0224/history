/**
 * 모순(순수). DESIGN_V5 §2.3 「모순 풀기」·§4.6.
 * 이기는 쪽은 저장하지 않고 방의 기하로 계산한다:
 *  - hearing: 그 말(lineId)을 반경 안에서 직접 또렷이 들은 증인의 주장이 이긴다. 전해 들은 말(hearsay)은 지지 않을 수 없다.
 *  - sight:   가림 없이 셀 수 있었던 증인의 주장이 이긴다.
 * 플레이어가 고른 쪽이 계산과 같으면 풀린다. 틀려도 손해 없음(retryText).
 */
import { appearances, heldEvidence, idx, type Knowledge } from './ep';
import { hearing, posOf, sameMoment, sight } from './room';
import type { Claim, Contradiction, Episode, Id } from './types';

export const claimHeld = (ep: Episode, k: Knowledge, c: Claim) => {
  const held = heldEvidence(ep, k);
  return c.from.some((e) => held.includes(e));
};

export function claimById(ep: Episode, id: Id): Claim {
  const c = ep.claims.find((x) => x.id === id);
  if (!c) throw new Error(`claim '${id}' 없음`);
  return c;
}

/** 이 주장을 뒷받침하는 (근거, 컷) 쌍(컷은 전체 데이터 기준) */
function claimWitnessCuts(ep: Episode, c: Claim): { evidenceId: Id; cutId: Id }[] {
  const I = idx(ep);
  return c.from.flatMap((e) => (I.evidenceCuts.get(e) ?? []).map((cutId) => ({ evidenceId: e, cutId })));
}

/** 계산된 승자(주장 id). 검증기는 승자가 정확히 하나이고 검증 문장의 값과 같은지 본다. */
export function winningClaims(ep: Episode, x: Contradiction): Id[] {
  const I = idx(ep);
  const r = x.resolvedBy;
  return x.claims.filter((cid) => {
    const c = claimById(ep, cid);
    if (r.kind === 'hearing') {
      if (c.hearsay) return false;
      return claimWitnessCuts(ep, c).some(({ evidenceId, cutId }) => {
        if (evidenceId !== r.lineId) return false;
        const cut = I.cut.get(cutId)!;
        const eye = I.eye.get(cut.eyeId)!;
        if (!eye.seatId || !sameMoment(cut.time, r.time)) return false;
        const l = I.line.get(r.lineId)!;
        return hearing(ep.room, posOf(ep.room, eye.seatId), l.origin, l.volume).clarity === 'clear';
      });
    }
    return claimWitnessCuts(ep, c).some(({ evidenceId, cutId }) => {
      const d = I.detail.get(evidenceId);
      if (!d || d.targetPosId !== r.targetPosId) return false;
      const cut = I.cut.get(cutId)!;
      const eye = I.eye.get(cut.eyeId)!;
      if (!eye.seatId || !sameMoment(cut.time, r.time)) return false;
      return sight(ep.room, posOf(ep.room, eye.seatId), cut.viewpoint.dirDeg, posOf(ep.room, d.targetPosId)).countable;
    });
  });
}

export function winningValue(ep: Episode, x: Contradiction): string | undefined {
  const w = winningClaims(ep, x);
  return w.length === 1 ? claimById(ep, w[0]).value : undefined;
}

/** 드러났는가(store 가 slot_open 기록을 넘긴다) */
export function isRevealed(ep: Episode, k: Knowledge, x: Contradiction, slotsOpened: readonly string[]): boolean {
  const both = x.claims.every((c) => claimHeld(ep, k, claimById(ep, c)));
  if (!both) return false;
  return x.revealWhen === 'claims' || slotsOpened.includes(x.slot);
}

export type ResolveResult = { status: 'resolved'; winner: Id; loser: Id } | { status: 'retry'; text: string } | { status: 'invalid' };

export function resolve(ep: Episode, x: Contradiction, chosenClaimId: Id): ResolveResult {
  if (!x.claims.includes(chosenClaimId)) return { status: 'invalid' };
  const w = winningClaims(ep, x);
  if (w.length === 1 && w[0] === chosenClaimId) return { status: 'resolved', winner: chosenClaimId, loser: x.claims.find((c) => c !== chosenClaimId)! };
  return { status: 'retry', text: x.retryText };
}

// ── 그날의 방 모순 보기(UI 그림 재료) ──────────────────────────────
export interface WitnessMark {
  eyeId: Id;
  claimId?: Id;
  seatId: Id;
  x: number;
  y: number;
  distance: number;
  /** hearing: 또렷/흐림/안 들림 · sight: 셀 수 있음/가림/멂 */
  status: 'clear' | 'garbled' | 'none' | 'countable' | 'occluded' | 'far' | 'out_of_view';
  hearsay?: boolean;
}

export interface ContradictionGeometry {
  id: Id;
  kind: 'hearing' | 'sight';
  time: string;
  source: { posId: Id; x: number; y: number };
  radius?: number;
  garbleRadius?: number;
  detailRange?: number;
  occluder?: { id: Id; rect: [number, number, number, number] };
  witnesses: WitnessMark[];
  /** 그 시각 방의 다른 사람(본 컷 기준): 반경 안/밖 */
  listeners: { key: string; x: number; y: number; status: WitnessMark['status'] }[];
  claims: { id: Id; label: string; cutIds: Id[] }[];
}

export function geometry(ep: Episode, k: Knowledge, x: Contradiction): ContradictionGeometry {
  const I = idx(ep);
  const r = x.resolvedBy;
  const srcId = r.kind === 'hearing' ? r.sourcePosId : r.targetPosId;
  const src = posOf(ep.room, srcId);
  const witnesses: WitnessMark[] = [];
  const claims: ContradictionGeometry['claims'] = [];
  for (const cid of x.claims) {
    const c = claimById(ep, cid);
    const cuts = claimWitnessCuts(ep, c).filter((w) => k.viewedCuts.includes(w.cutId));
    claims.push({ id: cid, label: c.label, cutIds: [...new Set(cuts.map((w) => w.cutId))] });
    for (const { cutId } of cuts) {
      const cut = I.cut.get(cutId)!;
      const eye = I.eye.get(cut.eyeId)!;
      if (!eye.seatId || witnesses.some((w) => w.eyeId === eye.id && w.claimId === cid)) continue;
      const seat = posOf(ep.room, eye.seatId);
      witnesses.push({ eyeId: eye.id, claimId: cid, seatId: eye.seatId, x: seat.x, y: seat.y, ...markAt(ep, x, seat, cut.viewpoint.dirDeg), ...(c.hearsay ? { hearsay: true } : {}) });
    }
  }
  // 그 시각의 다른 눈 자리(열린·닫힌 눈) — 원 안/밖을 보여 준다
  for (const eyeId of [...k.openedEyes, ...k.closedEyes]) {
    const eye = I.eye.get(eyeId);
    if (!eye?.seatId || witnesses.some((w) => w.eyeId === eyeId)) continue;
    const seat = posOf(ep.room, eye.seatId);
    witnesses.push({ eyeId, seatId: eye.seatId, x: seat.x, y: seat.y, ...markAt(ep, x, seat, ep.room.seats.find((s) => s.id === eye.seatId)?.facingDeg ?? 0) });
  }
  const listeners = appearances(ep, k.viewedCuts)
    .filter((a) => a.kind === 'figure' && sameMoment(a.time, r.time))
    .filter((a, i, all) => all.findIndex((b) => b.posId === a.posId) === i)
    .map((a) => {
      const p = posOf(ep.room, a.posId);
      return { key: a.key, x: p.x, y: p.y, status: markAt(ep, x, p, 0).status };
    });
  return {
    id: x.id,
    kind: r.kind,
    time: r.time,
    source: { posId: srcId, x: src.x, y: src.y },
    ...(r.kind === 'hearing'
      ? (() => {
          const l = I.line.get(r.lineId)!;
          const radius = ep.room.hearingRadius[l.volume];
          return { radius, garbleRadius: radius * ep.room.garbleFactor };
        })()
      : (() => {
          const occ = ep.room.furniture.find((f) => f.id === r.occluderId);
          return { detailRange: ep.room.sight.detailRange, ...(occ ? { occluder: { id: occ.id, rect: occ.rect } } : {}) };
        })()),
    witnesses,
    listeners,
    claims,
  };
}

function markAt(ep: Episode, x: Contradiction, at: { x: number; y: number }, dirDeg: number): { distance: number; status: WitnessMark['status'] } {
  const r = x.resolvedBy;
  if (r.kind === 'hearing') {
    const l = idx(ep).line.get(r.lineId)!;
    const h = hearing(ep.room, at, l.origin, l.volume);
    return { distance: h.distance, status: h.clarity };
  }
  const s = sight(ep.room, at, dirDeg, posOf(ep.room, r.targetPosId));
  return { distance: s.distance, status: s.countable ? 'countable' : !s.inCone ? 'out_of_view' : s.occluded ? 'occluded' : 'far' };
}
