import type { SfxName } from '@/game/audio';
import type { Feedback, Id, PlayerNotebook, Verdict, Year } from '@/core/types';

export const VERDICT_LABEL: Record<Verdict, string> = {
  confirmed: '확정',
  partial: '부분 확정',
  undetermined: '미확정',
  wrong: '오답',
};

export const VERDICT_NOTE: Record<Verdict, string> = {
  confirmed: '충분한 근거로 특정했다.',
  partial: '범위를 올바르게 좁혔다. 결정적 근거가 더 필요하다.',
  undetermined: '결정적인 근거가 부족하다.',
  wrong: '제출한 주장이 증거와 맞지 않는다.',
};

export function verdictSfx(v: Verdict): SfxName {
  return v === 'confirmed' ? 'success' : v === 'partial' ? 'partial' : 'fail';
}

export type Confidence = 'low' | 'mid' | 'high';
export const CONFIDENCE_LABEL: Record<Confidence, string> = { low: '낮음', mid: '보통', high: '높음' };

export const formatYears = (from: Year, to: Year) => (from === to ? `${from}` : `${from}~${to}`);

export function formatYearResult(from: Year, to: Year, verdict: Verdict) {
  return `${formatYears(from, to)} (${VERDICT_LABEL[verdict]})`;
}

export function groupFeedback(feedback: readonly Feedback[]) {
  const general: Feedback[] = [];
  const byEvidence = new Map<Id, Feedback[]>();
  for (const f of feedback) {
    if (f.evidenceId) {
      const list = byEvidence.get(f.evidenceId) ?? [];
      list.push(f);
      byEvidence.set(f.evidenceId, list);
    } else general.push(f);
  }
  return { general, byEvidence };
}

export function formatSavedAt(iso: string | null | undefined): string {
  if (!iso) return '기록 없음';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '기록 없음';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

export const obsNumber = (n: number) => `#${String(Math.max(1, n)).padStart(3, '0')}`;

// ── 연대 추리 결과를 노트에 남기는 규약 ─────────────────────────
// 스토어는 제출 범위를 저장하지 않으므로, 부분/확정 판정을 받은 범위를 '검증된 사실' 노트에 기록한다.
// HUD·연대표는 이 노트에서만 '플레이어 자신의 추리 결과'를 읽는다(정답 데이터에서 유도하지 않는다).
export const YEAR_NOTE_PREFIX = 'ui_year:';

export const yearNoteId = (deductionId: Id, from: Year, to: Year, verdict: Verdict) =>
  `${YEAR_NOTE_PREFIX}${deductionId}:${from}:${to}:${verdict}`;

export interface YearResult {
  deductionId: Id;
  from: Year;
  to: Year;
  verdict: 'partial' | 'confirmed';
  seq: number;
}

export function parseYearNote(id: string, seq = 0): YearResult | null {
  if (!id.startsWith(YEAR_NOTE_PREFIX)) return null;
  const parts = id.slice(YEAR_NOTE_PREFIX.length).split(':');
  const verdict = parts.pop();
  const to = Number(parts.pop());
  const from = Number(parts.pop());
  const deductionId = parts.join(':');
  if ((verdict !== 'partial' && verdict !== 'confirmed') || !Number.isInteger(from) || !Number.isInteger(to)) return null;
  return { deductionId, from, to, verdict, seq };
}

/** 추리별 최고 결과(확정 > 부분, 더 좁은 범위, 더 나중). */
export function yearResults(nb: PlayerNotebook): YearResult[] {
  const best = new Map<Id, YearResult>();
  for (const n of nb.verified) {
    const r = parseYearNote(n.id, n.seq);
    if (!r) continue;
    const cur = best.get(r.deductionId);
    if (!cur || betterYear(r, cur)) best.set(r.deductionId, r);
  }
  return [...best.values()];
}

function betterYear(a: YearResult, b: YearResult) {
  if (a.verdict !== b.verdict) return a.verdict === 'confirmed';
  const wa = a.to - a.from;
  const wb = b.to - b.from;
  if (wa !== wb) return wa < wb;
  return a.seq > b.seq;
}

export function latestYearResult(nb: PlayerNotebook): YearResult | null {
  const all = yearResults(nb);
  return all.reduce<YearResult | null>((m, r) => (!m || r.seq > m.seq ? r : m), null);
}

export const SOLVED_NOTE_PREFIX = 'ui_solved:';
export const DB_NOTE_PREFIX = 'ui_db:';

import type { EvidenceStrength, TimeConstraint } from '@/core/types';

export const STRENGTH_LABEL: Record<EvidenceStrength, string> = { decisive: '결정적', supporting: '보조', weak: '약함' };

export function timeText(t: Pick<TimeConstraint, 'notBefore' | 'notAfter'>): string {
  if (t.notBefore !== undefined && t.notAfter !== undefined) return `${t.notBefore}~${t.notAfter}년`;
  if (t.notBefore !== undefined) return `${t.notBefore}년 이후`;
  if (t.notAfter !== undefined) return `${t.notAfter}년 이전`;
  return '연대 정보 없음';
}
