/**
 * 이름 붙이기 판정(순수). DESIGN_V5 §2.2 — 정답은 데이터(사실 키·겹침·자리)로 계산하고 UI 는 결과 코드만 받는다.
 *
 * judgeTag(화면 속 사람 A, 카드 P, 근거 e):
 *  0. 무효: 본 컷의 사람이 아님 / 찾은 카드가 아님 / 갖지 않은 근거 → { status: 'invalid' }
 *  1. 같은 시각(±5분) P 가 이미 다른 자리에 있다(이름 붙인 사람·열린 눈의 주인)        → contradicts
 *  2. e 가 가리키는 사람(refers)이 A 의 무리(같은 기억 속 같은 사람 + 드러난 겹침)가 아님 → not_pointing
 *     단, 그 말이 가리킨 자리가 본 컷만으로 A 와 겹칠 수 있다(방에서 그 시각을 고르면 이어진다) → not_linked
 *  3. e 가 사실을 담지 않음                                                       → not_pointing
 *  4. P 가 이 방의 카드가 아님                                                     → no_room_record (피드백은 not_pointing 과 같다)
 *  5. e 의 사실 키(함의 포함) ⊄ P 의 카드 키                                        → not_pointing
 *  6. 그 키를 가진 이 방의 카드가 둘 이상                                            → not_unique
 *  7. e 가 화면 속 누구도 가리키지 않는 기록 줄(fact)                                → not_pointing
 *  8. P 가 A 의 숨은 정체                                                          → ok (아니면 not_pointing — 검증기가 미리 막는다)
 */
import { appearances, cutAppearances, figureKey, heldEvidence, idx, mergesAt, personGroups, referredAppearances, type Appearance, type Knowledge } from './ep';
import { minutes, sameMoment } from './room';
import type { Episode, FactKey, Id, PersonCard, TagVerdict } from './types';

export const TAG_FEEDBACK: Record<Exclude<TagVerdict, 'ok'>, string> = {
  not_pointing: '근거가 이 사람을 가리키지 않는다',
  no_room_record: '근거가 이 사람을 가리키지 않는다',
  contradicts: '근거끼리 모순된다',
  not_unique: '근거가 이 사람 하나만 가리키지는 않는다',
  not_linked: '그 말이 이 사람 얘기인지 아직 모른다',
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

/**
 * 카드의 판정용 키(보이는 사실 + 함의 + 성씨 + 파생 키).
 * 파생 키(Episode.derivedKeys)는 via 카드를 가지고 있을 때만 붙는다(cardsFound 를 안 주면 늘 붙는다 — 검증기용).
 */
export function cardKeys(ep: Episode, card: PersonCard, restored = false, cardsFound?: readonly Id[]): Set<FactKey> {
  const keys = card.facts.filter((f) => restored || !f.afterRestore).flatMap((f) => f.keys);
  for (const d of ep.derivedKeys ?? []) if (d.to === card.id && (!cardsFound || cardsFound.includes(d.via.cardId))) keys.push(d.key);
  const s = surnameKey(ep, card.name);
  return expandKeys(ep, s ? [...keys, s] : keys);
}

/** '이 방의 카드' 사실 키(null = 모든 카드) */
export const roomKeyOf = (ep: Episode): FactKey | null => (ep.roomKey === undefined ? 'sillokcheong_staff' : ep.roomKey);

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
  const d = I.detail.get(evidenceId);
  if (d) return expandKeys(ep, d.keys ?? []);
  const f = I.fact.get(evidenceId);
  if (f) return expandKeys(ep, f.fact.keys);
  return new Set();
}

const subset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));

/** 이 키들을 모두 가진 '이 방의 카드' */
export function roomCardsWith(ep: Episode, keys: Set<FactKey>, restored = false, cardsFound?: readonly Id[]): Id[] {
  return ep.cards.filter((c) => c.roomAnchored && subset(keys, cardKeys(ep, c, restored, cardsFound))).map((c) => c.id);
}

/** 근거가 가리키는 대상이 있는가(말·본 것의 refers) */
export function evidenceRefers(ep: Episode, evidenceId: Id) {
  const I = idx(ep);
  return I.line.get(evidenceId)?.refers ?? I.detail.get(evidenceId)?.refers;
}

/**
 * 그 말이 가리킨 자리가 지금 본 컷만으로 A 의 무리와 겹칠 수 있는가(겹침이 아직 드러나지 않았을 뿐).
 * 방에서 그 시각을 고르면 이어진다 → not_linked. 숨은 정체가 아니라 본 컷의 등장으로만 계산한다.
 */
export function linkableByRoom(ep: Episode, k: Knowledge, A: Appearance, evidenceId: Id): boolean {
  const refs = referredAppearances(ep, k, evidenceId).filter((r) => r.kind === 'mention');
  if (!refs.length) return false;
  const groups = personGroups(ep, k);
  const root = groups.get(A.key);
  const mine = new Set([...groups.entries()].filter(([, r]) => r === root).map(([key]) => key));
  return refs.some((r) => mergesAt(ep, k.viewedCuts, r.time).some((m) => m.keys.includes(r.key) && m.keys.some((x) => mine.has(x))));
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
  const hasRefers = !!evidenceRefers(ep, evidenceId);
  if (hasRefers) {
    const groups = personGroups(ep, k);
    const root = groups.get(A.key);
    const pointed = referredAppearances(ep, k, evidenceId).some((r) => groups.get(r.key) === root);
    if (!pointed) return judged(linkableByRoom(ep, k, A, evidenceId) ? 'not_linked' : 'not_pointing');
  }
  // 3. 사실이 없는 근거
  const eKeys = evidenceKeys(ep, evidenceId);
  if (eKeys.size === 0) return judged('not_pointing');
  // 4. 이 방의 카드
  if (!card.roomAnchored) return judged('no_room_record');
  // 5. 카드의 사실
  if (!subset(eKeys, cardKeys(ep, card, k.restored, k.cardsFound))) return judged('not_pointing');
  // 6. 유일
  if (roomCardsWith(ep, eKeys, k.restored, k.cardsFound).length > 1) return judged('not_unique');
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
 * 이름 붙이기 시트 ② 「근거 하나」 목록 = 관측 로그의 들은 말·본 것만(카드의 사실 줄은 근거가 아니다 —
 * 성공하면 맞는 카드 줄에 먹선이 그어진다: matchedFacts). 순서는 그날의 시각순 고정(이 사람이 나온 컷은 표시만 — fromThisPersonCut).
 * 자리를 가리키는 말(겹침 근거)도 뜬다 — 아직 겹치지 않았으면 판정이 not_linked 로 알려 준다.
 * (cardId 는 옛 호출과의 호환용으로 받기만 한다.)
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
  void cardId;
  // 순서는 그날의 시각순으로 고정한다(방을 다녀와도·이 사람이 나온 컷이어도 순서가 바뀌지 않는다 — 순서가 답을 흘리지 않게)
  const rank = (e: EvidenceOption) => {
    const c = e.cutIds.length ? I.cut.get(e.cutIds[0])! : undefined;
    return c ? [minutes(c.time), ep.eyes.findIndex((y) => y.id === c.eyeId), c.n] : [Infinity, 0, 0];
  };
  return out
    .map((e, i) => ({ e, r: [...rank(e), i] }))
    .sort((a, b) => {
      for (let j = 0; j < a.r.length; j++) if (a.r[j] !== b.r[j]) return a.r[j] - b.r[j];
      return 0;
    })
    .map((x) => x.e);
}

/** 성공한 태그의 먹선: 근거의 사실 키와 겹치는 그 카드의 줄(파생 키면 via 카드의 줄) */
export function matchedFacts(ep: Episode, cardId: Id, evidenceId: Id): { cardId: Id; factId: Id }[] {
  const I = idx(ep);
  const eKeys = evidenceKeys(ep, evidenceId);
  const out: { cardId: Id; factId: Id }[] = [];
  const card = I.card.get(cardId);
  for (const f of card?.facts ?? []) if ([...expandKeys(ep, f.keys)].some((x) => eKeys.has(x) && !x.startsWith('surname_'))) out.push({ cardId, factId: f.id });
  for (const d of ep.derivedKeys ?? []) if (d.to === cardId && eKeys.has(d.key)) out.push({ cardId: d.via.cardId, factId: d.via.factId });
  return out;
}

/** 카드 목록: 이름 가나다순(답과 상관없는 순서 — 이 방의 카드를 앞에 모으지 않는다) */
export function cardOrder(ep: Episode, k: Knowledge): Id[] {
  const I = idx(ep);
  const name = (id: Id) => I.card.get(id)?.name ?? id;
  return [...k.cardsFound].sort((a, b) => name(a).localeCompare(name(b), 'ko') || a.localeCompare(b));
}
