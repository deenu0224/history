/**
 * 기록 다시 쓰기(순수). DESIGN_V5 §2.5, §4.8.
 *  - 관측 로그의 조각으로만 쓴다. 줄의 칸에는 내가 확인한 값만(근거가 로그에 있는 주장 · 이름 붙인 사람).
 *  - 풀리지 않은 모순(⚠)이 붙은 값은 칸에 넣을 수 없다. 모순에서 진 값은 더 이상 확인한 값이 아니다.
 *  - 판정은 줄 단위: 칸이 모두 검증 문장 값과 같으면 → 실록 문장으로 돌아온다(restored)
 *                   증인만 본 조각 → 회색 잉크(witness) · 칸이 비면 → incomplete · 그 밖 → not_recorded(어느 칸인지 말하지 않는다)
 */
import { claimHeld, isRevealed } from './contradiction';
import { heldEvidence, idx, type Knowledge } from './ep';
import { josaAfter } from './josa';
import type { Contradiction, Episode, Id, RecordPiece, RecordSentence, SlotKind } from './types';

export interface DraftLine {
  id: Id;
  pieceId: Id;
  values: Partial<Record<SlotKind, string>>;
}

export type LineResult = 'restored' | 'witness' | 'not_recorded' | 'incomplete';

export interface ContraState {
  /** 드러난 모순 */
  revealed: readonly Id[];
  /** 모순 id → 이긴 주장 id */
  resolved: Readonly<Record<Id, Id>>;
  /** 다시 쓰기에서 열어 본 칸 종류 */
  slotsOpened: readonly SlotKind[];
}

export function sentenceOf(ep: Episode, id?: Id): RecordSentence | undefined {
  return id ? ep.sentences.find((s) => s.id === id) : undefined;
}

export const sentenceSlots = (s: RecordSentence) => s.segments.filter((g) => g.slot).map((g) => g.slot!);

/** 쓸 수 있는 조각(근거가 로그에 있는 것) */
export function availablePieces(ep: Episode, k: Knowledge): RecordPiece[] {
  const held = heldEvidence(ep, k);
  return ep.pieces.filter((p) => p.from.some((e) => held.includes(e)));
}

export function pieceLabel(ep: Episode, p: RecordPiece, cs: ContraState): string {
  if (p.contestedBy && cs.resolved[p.contestedBy]) {
    const x = ep.contradictions.find((c) => c.id === p.contestedBy);
    if (x) return `${x.loserLabel} — ${p.label}`;
  }
  return p.label;
}

export interface SlotOption {
  value: string;
  label: string;
  /** 어디서 봤는지(컷 id) */
  cutIds: Id[];
  /** ⚠ 풀리지 않은 모순이 붙어 있음 → 넣을 수 없다 */
  contested?: Id;
}

/** 이 칸 종류에 넣을 수 있는 값(확인한 값만). 모순에서 진 값은 빠진다. */
export function slotOptions(ep: Episode, k: Knowledge, kind: SlotKind, cs: ContraState): SlotOption[] {
  const I = idx(ep);
  const held = heldEvidence(ep, k);
  if (kind === 'who') {
    const persons = [...new Set(Object.values(k.named))];
    const named: SlotOption[] = persons.map((p) => {
      const figs = Object.entries(k.named).filter(([, pp]) => pp === p).map(([f]) => f);
      const cutIds = ep.cuts.filter((c) => k.viewedCuts.includes(c.id) && c.figures.some((f) => figs.includes(f.figureId))).map((c) => c.id);
      return { value: I.card.get(p)?.name ?? p, label: I.card.get(p)?.name ?? p, cutIds } as SlotOption;
    });
    // 'who' 칸의 다른 값(들은 말에서 확인한 무리 등, 예: Ep0 「상소를 올린 사람들」)
    for (const c of ep.claims)
      if (c.slot === 'who' && claimHeld(ep, k, c) && !persons.some((p) => I.card.get(p)?.name === c.value)) {
        const cutIds = c.from.flatMap((e) => (held.includes(e) ? (I.evidenceCuts.get(e) ?? []).filter((cu) => k.viewedCuts.includes(cu)) : []));
        named.push({ value: c.value, label: c.label, cutIds: [...new Set(cutIds)] });
      }
    return named;
  }
  const out: SlotOption[] = [];
  for (const c of ep.claims) {
    if (c.slot !== kind || !claimHeld(ep, k, c)) continue;
    const x = ep.contradictions.find((y) => y.claims.includes(c.id));
    if (x && cs.resolved[x.id] && cs.resolved[x.id] !== c.id) continue; // 진 값
    const contested = x && !cs.resolved[x.id] && (cs.revealed.includes(x.id) || isRevealed(ep, k, x, cs.slotsOpened)) ? x.id : undefined;
    if (out.some((o) => o.value === c.value)) continue;
    const cutIds = c.from.flatMap((e) => (held.includes(e) ? (I.evidenceCuts.get(e) ?? []).filter((cu) => k.viewedCuts.includes(cu)) : []));
    out.push({ value: c.value, label: c.label, cutIds: [...new Set(cutIds)], ...(contested ? { contested } : {}) });
  }
  return out;
}

export type SetSlotResult = { status: 'ok' } | { status: 'contested'; contradictionId: Id } | { status: 'not_confirmed' } | { status: 'no_slot' };

export function checkSlotValue(ep: Episode, k: Knowledge, line: DraftLine, kind: SlotKind, value: string, cs: ContraState): SetSlotResult {
  const piece = ep.pieces.find((p) => p.id === line.pieceId);
  const s = sentenceOf(ep, piece?.sentenceId);
  if (!s || !sentenceSlots(s).some((sl) => sl.kind === kind)) return { status: 'no_slot' };
  const opt = slotOptions(ep, k, kind, cs).find((o) => o.value === value);
  if (!opt) return { status: 'not_confirmed' };
  if (opt.contested) return { status: 'contested', contradictionId: opt.contested };
  return { status: 'ok' };
}

export function judgeLine(ep: Episode, line: DraftLine): LineResult {
  const piece = ep.pieces.find((p) => p.id === line.pieceId);
  if (!piece) return 'not_recorded';
  if (piece.witnessOnly) return 'witness';
  const s = sentenceOf(ep, piece.sentenceId);
  if (!s) return 'not_recorded';
  const slots = sentenceSlots(s);
  if (slots.some((sl) => line.values[sl.kind] === undefined)) return 'incomplete';
  return slots.every((sl) => line.values[sl.kind] === sl.accepts) ? 'restored' : 'not_recorded';
}

/** 실록 문장 그대로(칸 = display) */
export function sentenceText(s: RecordSentence, includeEditorial = true): string {
  return s.segments
    .filter((g) => includeEditorial || !g.editorial)
    .map((g) => (g.slot ? g.slot.display : g.text))
    .join('');
}

export interface LineRender {
  parts: { text: string; slot?: SlotKind; filled?: boolean; editorial?: boolean }[];
  time: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

/** 한지 위 한 줄: 돌아왔으면 실록 문장(+출처), 아니면 내가 쓴 값으로 */
export function renderLine(ep: Episode, line: DraftLine, result?: LineResult): LineRender {
  const piece = ep.pieces.find((p) => p.id === line.pieceId)!;
  const s = sentenceOf(ep, piece.sentenceId);
  if (!s) return { parts: [{ text: piece.label }], time: piece.time };
  const restored = result === 'restored';
  const parts: LineRender['parts'] = [];
  for (const g of s.segments) {
    if (!g.slot) {
      // 칸 값 바로 뒤의 조사는 값에 맞춘다(「최만리」 + 「이 소를…」 → 「최만리가 소를…」)
      const prev = parts[parts.length - 1];
      const text = prev?.slot && prev.text ? josaAfter(prev.text, g.text) : g.text;
      parts.push({ text, ...(g.editorial ? { editorial: true } : {}) });
      continue;
    }
    const v = line.values[g.slot.kind];
    const text = restored || v === g.slot.accepts ? g.slot.display : (v ?? '');
    parts.push({ text, slot: g.slot.kind, filled: v !== undefined, ...(g.editorial ? { editorial: true } : {}) });
  }
  return {
    time: s.time,
    parts,
    ...(restored ? { sourceUrl: s.source.url, sourceTitle: s.source.title } : {}),
  };
}

/** 줄은 시각순(순서는 퍼즐이 아니다) */
export function sortLines(ep: Episode, lines: readonly DraftLine[]): DraftLine[] {
  const t = (l: DraftLine) => ep.pieces.find((p) => p.id === l.pieceId)?.time ?? '99:99';
  return [...lines].sort((a, b) => t(a).localeCompare(t(b)));
}

export const allRequiredRestored = (ep: Episode, results: Readonly<Record<Id, LineResult>>, lines: readonly DraftLine[]) =>
  ep.requiredSentences.every((sid) =>
    lines.some((l) => results[l.id] === 'restored' && ep.pieces.find((p) => p.id === l.pieceId)?.sentenceId === sid),
  );

/**
 * 그날 고정률(0~100): 꼭 돌아와야 할 실록 문장(requiredSentences) 중 고정된(판정 'restored') 문장의 비율.
 * 선택 문장(S…)·증인만 본 줄은 세지 않는다. 판정(길게 눌러 역사 고정) 뒤에만 오른다 — 줄마다·칸마다의 수치는 없다.
 */
export function fixRate(ep: Episode, results: Readonly<Record<Id, LineResult>>, lines: readonly DraftLine[]): { fixed: number; total: number; pct: number } {
  const total = ep.requiredSentences.length;
  const fixed = ep.requiredSentences.filter((sid) =>
    lines.some((l) => results[l.id] === 'restored' && ep.pieces.find((p) => p.id === l.pieceId)?.sentenceId === sid),
  ).length;
  return { fixed, total, pct: total ? Math.round((fixed / total) * 100) : 0 };
}

export const contradictionsOf = (ep: Episode): Contradiction[] => ep.contradictions;
