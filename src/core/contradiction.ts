/**
 * 모순(순수). DESIGN_V5 §2.3 「모순 풀기」·§4.6.
 * 이기는 쪽은 저장하지 않고 방의 기하로 계산한다:
 *  - hearing: 그 말(lineId)을 반경 안에서 직접 또렷이 들은 증인의 주장이 이긴다. 전해 들은 말(hearsay)은 지지 않을 수 없다.
 *  - sight:   가림 없이 셀 수 있었던 증인의 주장이 이긴다.
 * 근거 2칸(DEDUCTION_RULES 규칙 11): 「판단」(어느 주장을 남기나) + 「근거」(그날의 방의 자리 사실 하나 —
 * 그 눈의 자리에서 말이 닿았나/셀 수 있었나). 두 칸이 다 차야 판정한다. 판단이 계산된 승자이고 근거가 그 승패를
 * 가르는 자리(decisiveWitnesses — 진 주장을 깨는 자리)일 때만 풀린다. 어느 칸이 틀렸는지는 말하지 않는다(retryText 하나). 틀려도 손해 없음.
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

/** 근거 칸의 id: 「모순 id:눈 id」(그 눈의 자리 사실) */
export const witnessEvidenceId = (x: Contradiction, eyeId: Id) => `${x.id}:${eyeId}`;

/**
 * 승패를 가르는 자리(눈 id) = **진 주장을 깨는 자리**만: 진 주장의 증인 중 그 시각 말이 닿지 않았던/가려졌던
 * (또는 전해 들은) 자리. 이긴 주장을 받치는 자리(또렷이 들은/셀 수 있었던 자리)는 근거로 받지 않는다 —
 * 「왜 다른 말이 틀렸나」를 플레이어가 찾아야 풀린다(X1 홍귀달, X2 윤효손). 주장이 없는 다른 눈도 가르지 않는다.
 * 찍기: 판단 2 × 자리 4 → 1/8.
 */
export function decisiveWitnesses(ep: Episode, x: Contradiction): Id[] {
  const I = idx(ep);
  const win = new Set(winningClaims(ep, x));
  const out = new Set<Id>();
  for (const cid of x.claims) {
    if (win.has(cid)) continue;
    const c = claimById(ep, cid);
    for (const { cutId } of claimWitnessCuts(ep, c)) {
      const cut = I.cut.get(cutId)!;
      const eye = I.eye.get(cut.eyeId)!;
      if (!eye.seatId) continue;
      const m = markAt(ep, x, posOf(ep.room, eye.seatId), cut.viewpoint.dirDeg);
      const good = m.status === 'clear' || m.status === 'countable';
      if (c.hearsay || !good) out.add(eye.id);
    }
  }
  return [...out];
}

/** 이긴 주장을 받치는 자리(근거로는 통과하지 않는다 — 검증기·테스트용) */
export function supportingWitnesses(ep: Episode, x: Contradiction): Id[] {
  const I = idx(ep);
  const r = x.resolvedBy;
  const out = new Set<Id>();
  for (const cid of winningClaims(ep, x)) {
    const c = claimById(ep, cid);
    for (const { evidenceId, cutId } of claimWitnessCuts(ep, c)) {
      const cut = I.cut.get(cutId)!;
      const eye = I.eye.get(cut.eyeId)!;
      if (!eye.seatId || c.hearsay) continue;
      const direct = r.kind === 'hearing' ? evidenceId === r.lineId : I.detail.get(evidenceId)?.targetPosId === r.targetPosId;
      const m = markAt(ep, x, posOf(ep.room, eye.seatId), cut.viewpoint.dirDeg);
      if (direct && sameMoment(cut.time, r.time) && (m.status === 'clear' || m.status === 'countable')) out.add(eye.id);
    }
  }
  return [...out];
}

/** 판단(주장) + 근거(자리 사실 id). 두 칸이 다 차야 판정한다 */
export function resolve(ep: Episode, x: Contradiction, chosenClaimId: Id, evidenceId?: Id): ResolveResult {
  if (!x.claims.includes(chosenClaimId) || !evidenceId) return { status: 'invalid' };
  const w = winningClaims(ep, x);
  const decisive = decisiveWitnesses(ep, x).map((e) => witnessEvidenceId(x, e));
  if (w.length === 1 && w[0] === chosenClaimId && decisive.includes(evidenceId))
    return { status: 'resolved', winner: chosenClaimId, loser: x.claims.find((c) => c !== chosenClaimId)! };
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
  /** 그 시각 그 눈이 보던 쪽(시야 부채꼴을 그릴 때) */
  dirDeg: number;
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
  /** 시야 부채꼴의 반각 */
  halfAngleDeg: number;
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
      witnesses.push({ eyeId: eye.id, claimId: cid, seatId: eye.seatId, x: seat.x, y: seat.y, dirDeg: cut.viewpoint.dirDeg, ...markAt(ep, x, seat, cut.viewpoint.dirDeg), ...(c.hearsay ? { hearsay: true } : {}) });
    }
  }
  // 그 시각의 다른 눈 자리(열린·닫힌 눈) — 원 안/밖을 보여 준다
  for (const eyeId of [...k.openedEyes, ...k.closedEyes]) {
    const eye = I.eye.get(eyeId);
    if (!eye?.seatId || witnesses.some((w) => w.eyeId === eyeId)) continue;
    const seat = posOf(ep.room, eye.seatId);
    // 그 시각의 그 눈의 컷이 있으면 그 컷이 보던 쪽, 없으면 자리의 방향
    const atCut = eye.cuts.map((id) => I.cut.get(id)!).find((c) => k.viewedCuts.includes(c.id) && sameMoment(c.time, r.time));
    const dir = atCut?.viewpoint.dirDeg ?? ep.room.seats.find((s) => s.id === eye.seatId)?.facingDeg ?? 0;
    witnesses.push({ eyeId, seatId: eye.seatId, x: seat.x, y: seat.y, dirDeg: dir, ...markAt(ep, x, seat, dir) });
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
    halfAngleDeg: ep.room.sight.halfAngleDeg,
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
