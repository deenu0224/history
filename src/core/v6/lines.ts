/**
 * 현대어 ↔ 국역 ↔ 원문 조회(DESIGN_V6 §2.4, §4). 복원 전에는 왕대·연도가 드러나는 출처를 가리고,
 * 손상된 줄은 모든 층에서 같은 자리가 뚫려 있다(V5).
 */
import { holeOf } from '@/core/reality';
import { josa } from '@/core/josa';
import type { HolePart, Id, LineBundle, ModernLine, VerifiedLine } from './types';

export const SOURCE_HIDDEN = '실록 기사 · 출처는 복원 뒤에 보인다';
export const WONMUN_PENDING = '확보 전 — 원문 대조 중';
export const WONMUN_DAMAGED = '같은 자리 손상 — 복원 뒤에 보인다';
export const SCENE_NOTE = '재구성 — 기록에는 이 모습이 없다';

const isHole = (p: HolePart): p is Extract<HolePart, { hole: true }> => 'hole' in p;

/** 구멍 표시: 「누가」 칸은 [ ? ], 나머지는 지워진 길이에 비례한 [ ── ] (reality.holeOf) */
export function holeMarker(p: Extract<HolePart, { hole: true }>): string {
  return holeOf({ gap: p.restored, ...(p.who ? { who: true as const } : {}) });
}

export const holeCount = (v: VerifiedLine) => (v.parts ?? []).filter(isHole).length;
export const isDamaged = (v: VerifiedLine) => holeCount(v) > 0;

/** 결론 뒤 이름 바꾸기: {holder} → 최만리 */
export function fillLabels(text: string, labels: Readonly<Record<string, string>>, fallback: Readonly<Record<string, string>> = {}): string {
  return text.replace(/\{(\w+)\}/g, (_m, k: string) => labels[k] ?? fallback[k] ?? `{${k}}`);
}

/** 국역(원문 보기 ①): 복원 전엔 구멍 그대로 */
export function kukyeokView(b: LineBundle, verifiedId: Id, restored: boolean): string {
  const v = b.verified[verifiedId]!;
  if (!v.parts || restored) return v.kukyeok;
  return v.parts.map((p) => (isHole(p) ? holeMarker(p) : p.text)).join('');
}

export type WonmunView = { status: 'ok'; text: string } | { status: 'pending'; text: string } | { status: 'damaged'; text: string; holes: number };

/** 원문(원문 보기 ②): 손상된 줄은 복원 전 같은 자리 손상 */
export function wonmunView(b: LineBundle, verifiedId: Id, restored: boolean): WonmunView {
  const v = b.verified[verifiedId]!;
  if (isDamaged(v) && !restored) return { status: 'damaged', text: WONMUN_DAMAGED, holes: holeCount(v) };
  if (v.wonmun === null) return { status: 'pending', text: WONMUN_PENDING };
  return { status: 'ok', text: v.wonmun };
}

/** 출처(원문 보기 ④): 사료는 복원 전에 가린다 */
export function sourceView(b: LineBundle, verifiedId: Id, restored: boolean): { text: string; url?: string; note?: string } {
  const v = b.verified[verifiedId]!;
  if (v.source === 'sillok' && !restored) return { text: SOURCE_HIDDEN };
  return { text: v.citation, url: v.url, ...(v.note ? { note: v.note } : {}) };
}

/** 현대어 줄 글(복원 전 구멍, 복원 뒤 풀이로 채움) */
export function modernView(b: LineBundle, modernId: Id, restored: boolean, labels: Readonly<Record<string, string>> = {}, fallback: Readonly<Record<string, string>> = {}): string {
  const m = b.modern[modernId]!;
  if (!m.modernParts) return fillLabels(m.modern, labels, fallback);
  const v = b.verified[m.sourceId]!;
  const holes = (v.parts ?? []).filter(isHole);
  const fills = b.restoredModern[m.id];
  let i = 0;
  return m.modernParts
    .map((p) => {
      if (!('hole' in p)) return p.text;
      const h = holes[i]!;
      const f = fills?.[i];
      i += 1;
      return restored && f !== undefined ? f : holeMarker(h);
    })
    .join('');
}

/** 낱말 풀이: 현대어 줄에서 그대로 둔 고유명·한자어 */
export function glossFor(b: LineBundle, modernId: Id): { term: string; meaning: string }[] {
  const m: ModernLine | undefined = b.modern[modernId];
  return (m?.glossTerms ?? []).map((term) => ({ term, meaning: b.gloss[term]! }));
}

/** 「누가」 구멍에 이름을 넣은 국역(역사 고정 대조). 조사는 josa 로 맞춘다 */
export function fillWho(v: VerifiedLine, word: string): string {
  return (v.parts ?? [])
    .map((p) => (isHole(p) ? (p.who ? josa(word, '이/가') : p.restored) : p.text))
    .join('');
}

/** 구멍 하나가 받는 낱말(조사 뗀 값) */
export const whoHole = (v: VerifiedLine) => (v.parts ?? []).find((p): p is Extract<HolePart, { hole: true }> => isHole(p) && !!p.who);

/** 낱말 풀이 항목이 없는 glossTerms */
export const missingGloss = (b: LineBundle): string[] =>
  Object.values(b.modern).flatMap((m) => m.glossTerms.filter((t) => !b.gloss[t]));
