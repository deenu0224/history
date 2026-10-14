/**
 * 이름 붙이기 판정(순수). DESIGN_V5 §2.2 — 정답은 데이터(사실 키·겹침·자리)로 계산하고 UI 는 결과 코드만 받는다.
 *
 * judgeTag(화면 속 사람 A, 카드 P, 근거 e):
 *  0. 무효: 본 컷의 사람이 아님 / 찾은 카드가 아님 / 갖지 않은 근거 → { status: 'invalid' }
 *  1. 같은 시각(±5분) P 가 이미 다른 자리에 있다(이름 붙인 사람·열린 눈의 주인)        → contradicts
 *  2. e 가 가리키는 사람(refers)이 A 의 무리(같은 기억 속 같은 사람 + 드러난 겹침)가 아님 → not_pointing
 *  3. e 가 사실을 담지 않음                                                       → not_pointing
 *  4. P 가 이 방의 카드가 아님                                                     → no_room_record (피드백은 not_pointing 과 같다)
 *  5. e 의 사실 키(함의 포함) ⊄ P 의 카드 키                                        → not_pointing
 *  6. 그 키를 가진 이 방의 카드가 둘 이상                                            → not_unique
 *  7. e 가 화면 속 누구도 가리키지 않는 기록 줄(fact)                                → not_pointing
 *  8. P 가 A 의 숨은 정체                                                          → ok (아니면 not_pointing — 검증기가 미리 막는다)
 */
import { appearances, cutAppearances, figureKey, heldEvidence, idx, personGroups, referredAppearances, type Appearance, type Knowledge } from './ep';
import { sameMoment } from './room';
import type { Episode, FactKey, Id, PersonCard, TagVerdict } from './types';

export const TAG_FEEDBACK: Record<Exclude<TagVerdict, 'ok'>, string> = {
  not_pointing: '근거가 이 사람을 가리키지 않는다',
  no_room_record: '근거가 이 사람을 가리키지 않는다',
  contradicts: '근거끼리 모순된다',
  not_unique: '근거가 이 사람 하나만 가리키지는 않는다',
};

export function expandKeys(ep: Episode, keys: readonly FactKey[]): Set<FactKey> {
  const out = new Set<FactKey>();
  const stack = [...keys];
  while (stack.length) {
    const k = stack.pop()!;
    if (out.has(k)) continue;
    out.add(k);
    stack.push(...(ep.implies[k] ?? []));
  }
  return out;
}

const surnameKey = (ep: Episode, name: string) => ep.surnameKeys[name[0]];

/** 카드의 판정용 키(보이는 사실 + 함의 + 성씨) */
export function cardKeys(ep: Episode, card: PersonCard, restored = false): Set<FactKey> {
  const keys = card.facts.filter((f) => restored || !f.afterRestore).flatMap((f) => f.keys);
  const s = surnameKey(ep, card.name);
  return expandKeys(ep, s ? [...keys, s] : keys);
}

/** 원장의 키(검증기 전용) */
export function ledgerKeys(ep: Episode, personId: Id): Set<FactKey> {
  const keys = (ep.ledger[personId] ?? []).map((e) => e.key);
  const name = ep.ledgerNames[personId] ?? idx(ep).card.get(personId)?.name;
  const s = name ? surnameKey(ep, name) : undefined;
  return expandKeys(ep, s ? [...keys, s] : keys);
}

/** 근거의 사실 키(함의 포함) */
export function evidenceKeys(ep: Episode, evidenceId: Id): Set<FactKey> {
  const I = idx(ep);
  const l = I.line.get(evidenceId);
  if (l) return expandKeys(ep, l.keys ?? []);
  const f = I.fact.get(evidenceId);
  if (f) return expandKeys(ep, f.fact.keys);
  return new Set();
}

const subset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));

/** 이 키들을 모두 가진 '이 방의 카드' */
export function roomCardsWith(ep: Episode, keys: Set<FactKey>, restored = false): Id[] {
  return ep.cards.filter((c) => c.roomAnchored && subset(keys, cardKeys(ep, c, restored))).map((c) => c.id);
}

export interface TagTarget {
  cutId: Id;
  figureId: Id;
}

export type TagJudgement =
  | { status: 'judged'; verdict: TagVerdict; feedback?: string }
  | { status: 'invalid'; reason: 'not_viewed' | 'no_figure' | 'card_not_found' | 'evidence_not_held' | 'already_named' };

export function findAppearance(ep: Episode, k: Knowledge, t: TagTarget): Appearance | undefined {
  if (!k.viewedCuts.includes(t.cutId)) return undefined;
  return cutAppearances(ep, t.cutId).find((a) => a.key === figureKey(t.cutId, t.figureId));
}

/** 이 사람(카드)이 알려진 자리들: 이름 붙인 figure 의 등장 + 열린 눈(이름 있는 주인)의 자리 */
export function knownPlacements(ep: Episode, k: Knowledge, personId: Id): Appearance[] {
  const I = idx(ep);
  const named = new Set(Object.entries(k.named).filter(([, p]) => p === personId).map(([f]) => f));
  return appearances(ep, k.viewedCuts).filter((a) => {
    if (a.kind === 'figure') return named.has(a.figureId);
    if (a.kind === 'owner') {
      const eye = I.eye.get(a.eyeId)!;
      if (eye.personId !== personId) return false;
      const ownerKnown = eye.openWhen.kind === 'tag' || (eye.figureId !== undefined && k.named[eye.figureId] === personId);
      return ownerKnown;
    }
    return false;
  });
}

/** 판정에 쓸 수 있는 근거인가(관측 로그 + 찾은 카드의 줄) */
export function canUseEvidence(ep: Episode, k: Knowledge, evidenceId: Id): boolean {
  const I = idx(ep);
  const f = I.fact.get(evidenceId);
  if (f) return k.cardsFound.includes(f.cardId) && (k.restored || !f.fact.afterRestore);
  return heldEvidence(ep, k).includes(evidenceId);
}

export function judgeTag(ep: Episode, k: Knowledge, t: TagTarget, cardId: Id, evidenceId: Id): TagJudgement {
  const I = idx(ep);
  if (!k.viewedCuts.includes(t.cutId)) return { status: 'invalid', reason: 'not_viewed' };
  const A = findAppearance(ep, k, t);
  if (!A || A.kind !== 'figure') return { status: 'invalid', reason: 'no_figure' };
  if (k.named[t.figureId]) return { status: 'invalid', reason: 'already_named' };
  const card = I.card.get(cardId);
  if (!card || !k.cardsFound.includes(cardId)) return { status: 'invalid', reason: 'card_not_found' };
  if (!canUseEvidence(ep, k, evidenceId)) return { status: 'invalid', reason: 'evidence_not_held' };
  const judged = (verdict: TagVerdict): TagJudgement =>
    verdict === 'ok' ? { status: 'judged', verdict } : { status: 'judged', verdict, feedback: TAG_FEEDBACK[verdict] };

  // 1. 한 사람이 두 자리에 있을 수 없다
  if (knownPlacements(ep, k, cardId).some((p) => sameMoment(p.time, A.time) && p.posId !== A.posId)) return judged('contradicts');

  // 2. 근거가 가리키는 사람
  const line = I.line.get(evidenceId);
  const hasRefers = !!line?.refers;
  if (hasRefers) {
    const groups = personGroups(ep, k);
    const root = groups.get(A.key);
    const pointed = referredAppearances(ep, k, evidenceId).some((r) => groups.get(r.key) === root);
    if (!pointed) return judged('not_pointing');
  }
  // 3. 사실이 없는 근거
  const eKeys = evidenceKeys(ep, evidenceId);
  if (eKeys.size === 0) return judged('not_pointing');
  // 4. 이 방의 카드
  if (!card.roomAnchored) return judged('no_room_record');
  // 5. 카드의 사실
  if (!subset(eKeys, cardKeys(ep, card, k.restored))) return judged('not_pointing');
  // 6. 유일
  if (roomCardsWith(ep, eKeys, k.restored).length > 1) return judged('not_unique');
  // 7. 기록 줄은 화면 속 사람을 가리키지 못한다
  if (!hasRefers) return judged('not_pointing');
  // 8. 정체
  const fig = I.figure.get(t.figureId);
  return judged(fig?.truePersonId === cardId ? 'ok' : 'not_pointing');
}

export interface EvidenceOption {
  id: Id;
  kind: 'line' | 'detail' | 'fact';
  text: string;
  /** 근거가 담긴 컷(말·본 것) */
  cutIds: Id[];
  time?: string;
  /** 이 사람이 나온 컷에서 온 것 */
  fromThisPersonCut: boolean;
}

/**
 * 이름 붙이기 시트 ② 「근거 하나」 목록. 관측 로그의 말·본 것 + 고른 카드의 줄.
 * 자리를 가리키는 말(겹침 근거)은 그 자리가 이 사람과 겹친 뒤에만 뜬다. 이 사람이 나온 컷의 것이 맨 위.
 */
export function evidenceOptions(ep: Episode, k: Knowledge, t: TagTarget, cardId?: Id): EvidenceOption[] {
  const I = idx(ep);
  const A = findAppearance(ep, k, t);
  if (!A) return [];
  const groups = personGroups(ep, k);
  const root = groups.get(A.key);
  const myCuts = new Set(
    appearances(ep, k.viewedCuts)
      .filter((a) => groups.get(a.key) === root)
      .map((a) => a.cutId),
  );
  const out: EvidenceOption[] = [];
  for (const id of heldEvidence(ep, k)) {
    const line = I.line.get(id);
    if (line?.refers && 'posId' in line.refers) {
      const pointed = referredAppearances(ep, k, id).some((r) => groups.get(r.key) === root);
      if (!pointed) continue;
    }
    const cutIds = (I.evidenceCuts.get(id) ?? []).filter((c) => k.viewedCuts.includes(c));
    const text = line ? line.text : I.detail.get(id)!.label;
    out.push({
      id,
      kind: line ? 'line' : 'detail',
      text,
      cutIds,
      time: cutIds.length ? I.cut.get(cutIds[0])!.time : undefined,
      fromThisPersonCut: cutIds.some((c) => myCuts.has(c)),
    });
  }
  out.sort((a, b) => Number(b.fromThisPersonCut) - Number(a.fromThisPersonCut));
  const card = cardId ? I.card.get(cardId) : undefined;
  if (card && k.cardsFound.includes(card.id))
    for (const f of card.facts)
      if (k.restored || !f.afterRestore) out.push({ id: f.id, kind: 'fact', text: f.text, cutIds: [], fromThisPersonCut: false });
  return out;
}

/** 카드 목록(이 방의 카드 먼저) */
export function cardOrder(ep: Episode, k: Knowledge): Id[] {
  const I = idx(ep);
  return [...k.cardsFound].sort((a, b) => Number(I.card.get(b)?.roomAnchored) - Number(I.card.get(a)?.roomAnchored));
}
