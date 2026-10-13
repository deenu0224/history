/**
 * 프레임·단서·보고서 판정(순수). 설계: docs/DESIGN_V3.md §4.
 *
 * 프레임 = 캡처 순간의 화면(ViewerSnapshot) + 그 내용에서 계산한 단서 id.
 * 단서(Clue)는 세 곳에서 생긴다:
 *   frame  : 프레임의 들린 대사·보이는 핫스팟·시각이 FrameMatch 를 만족
 *   record : 그 DB 기록을 칸에 붙임
 *   combo  : 한 칸의 단서가 combo.all 을 모두 가지고, 보고서 전체가 combo.report 를 모두 가질 때
 * 칸 판정:
 *   when   → chronology.judgeYear (단서의 연대 제약)
 *   who    → deduction.judgePerson (후보 = 붙인 인물 기록, 사실 = 프레임 단서만)
 *   what/result → judgeFacts (요구 사실·어긋나는 사실·가까운 사실)
 * 정답은 데이터에만 있다. 피드백은 칸 고유 문구와 플레이어 자신의 첨부로만 만든다.
 */
import { judgeYear } from './chronology';
import { hasFact } from './content';
import { citedFacts, judgePerson } from './deduction';
import type {
  BlankKey,
  BlankTip,
  Clue,
  DbRecord,
  Evidence,
  Fact,
  FactBlankSpec,
  Feedback,
  FrameMatch,
  HistoricalPerson,
  Id,
  JudgeContext,
  ReportSpec,
  Verdict,
  Year,
} from './types';
import { BLANK_KEYS } from './types';

/** 뷰어가 캡처 때 넘기는 화면 정보(계약: src/game/viewer/types.ts 와 같은 모양). */
export interface ViewerSnapshot {
  minute: number;
  centerTile: { x: number; y: number };
  /** 기준 배율의 몇 배인가(1 = 처음 화면). 대사 hear.minZoom 과 같은 단위 */
  zoom: number;
  visibleHotspotIds: string[];
  heardLineIds: string[];
  thumbDataUrl?: string;
}

export interface Frame extends ViewerSnapshot {
  id: Id;
  /** 찍은 순서(1부터) */
  seq: number;
  /** 이 프레임이 증명하는 단서 */
  clueIds: Id[];
  /** 훼손 구간에서 찍혔는가(연출용) */
  degraded?: boolean;
}

export const MAX_FRAMES = 6;

const all = (have: readonly string[], need?: readonly string[]) => (need ?? []).every((x) => have.includes(x));
const any = (have: readonly string[], need?: readonly string[]) => !need || need.length === 0 || need.some((x) => have.includes(x));

export function frameMatches(snap: ViewerSnapshot, m: FrameMatch): boolean {
  if (!all(snap.heardLineIds, m.heard) || !any(snap.heardLineIds, m.heardAny)) return false;
  if (!all(snap.visibleHotspotIds, m.visible) || !any(snap.visibleHotspotIds, m.visibleAny)) return false;
  if (m.minute && !(snap.minute >= m.minute.from && snap.minute < m.minute.to)) return false;
  return true;
}

/** 스냅숏이 증명하는 프레임 단서 id(콘텐츠 순). */
export function frameClues(snap: ViewerSnapshot, clues: readonly Clue[]): Id[] {
  return clues.filter((c) => c.frame && frameMatches(snap, c.frame)).map((c) => c.id);
}

/** 프레임들이 증명하는 단서 합집합 */
export const cluesOfFrames = (frames: readonly Frame[]): Id[] => [...new Set(frames.flatMap((f) => f.clueIds))];

// ── 첨부 ─────────────────────────────────────────────────────────
export type AttachmentRef = { kind: 'frame' | 'record'; id: Id };

export interface BlankDraft {
  attachments: AttachmentRef[];
}
export interface ReportDraft {
  when: BlankDraft & { from?: Year; to?: Year };
  who: BlankDraft;
  what: BlankDraft;
  result: BlankDraft;
}

export function emptyDraft(): ReportDraft {
  return { when: { attachments: [] }, who: { attachments: [] }, what: { attachments: [] }, result: { attachments: [] } };
}

export const sameRef = (a: AttachmentRef, b: AttachmentRef) => a.kind === b.kind && a.id === b.id;

export interface ReportWorld {
  clues: readonly Clue[];
  frames: readonly Frame[];
  records: Readonly<Record<Id, DbRecord>>;
  persons: Readonly<Record<Id, HistoricalPerson>>;
}

/** 첨부 하나의 단서(프레임 단서 또는 기록 단서). */
export function attachmentClues(ref: AttachmentRef, w: ReportWorld): Id[] {
  if (ref.kind === 'frame') return w.frames.find((f) => f.id === ref.id)?.clueIds ?? [];
  return w.clues.filter((c) => c.record === ref.id).map((c) => c.id);
}

/** 보고서 전체 첨부의 단서(조합 제외) */
export function reportBaseClues(draft: ReportDraft, w: ReportWorld): Id[] {
  return [...new Set(BLANK_KEYS.flatMap((k) => draft[k].attachments.flatMap((a) => attachmentClues(a, w))))];
}

export interface BlankClues {
  ids: Id[];
  /** 보고서 조건이 모자라 막힌 조합 단서 */
  blocked: Clue[];
}

/** 한 칸의 단서: 첨부 단서 + 조합 단서. */
export function blankClues(attachments: readonly AttachmentRef[], reportClues: readonly Id[], w: ReportWorld): BlankClues {
  const ids = [...new Set(attachments.flatMap((a) => attachmentClues(a, w)))];
  const blocked: Clue[] = [];
  for (const c of w.clues) {
    if (!c.combo || !all(ids, c.combo.all)) continue;
    if (all(reportClues, c.combo.report)) ids.push(c.id);
    else blocked.push(c);
  }
  return { ids, blocked };
}

/** 단서 → 판정 엔진의 증거 형태 */
export function clueAsEvidence(c: Clue): Evidence {
  return {
    id: c.id,
    provenance: c.provenance,
    category: 'observation',
    levels: [{ label: c.label, text: c.text, proves: c.proves, time: c.time }],
  };
}

function judgeContext(ids: readonly Id[], w: ReportWorld): JudgeContext {
  const byId = new Map(w.clues.map((c) => [c.id, c]));
  const evidence: Record<Id, Evidence> = {};
  const owned: Record<Id, number> = {};
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    evidence[id] = clueAsEvidence(c);
    owned[id] = 0;
  }
  return { evidence, persons: w.persons, owned };
}

export interface BlankResult {
  blank: BlankKey;
  verdict: Verdict;
  feedback: Feedback[];
  /** 언제 칸: 붙인 자료가 함의하는 범위(플레이어 자신의 근거 — 공개 가능) */
  implied?: { from?: Year; to?: Year };
  clueIds: Id[];
}

export interface ReportResult {
  reportId: Id;
  blanks: Record<BlankKey, BlankResult>;
  /** 네 칸 모두 확인 */
  complete: boolean;
}

function tipsFor(tips: readonly BlankTip[] | undefined, ids: readonly Id[]): Feedback[] {
  return (tips ?? [])
    .filter((t) => all(ids, t.has) && !(t.lacks ?? []).some((x) => ids.includes(x)))
    .map((t) => ({ code: 'not_supported' as const, message: t.message }));
}

const blockedFeedback = (blocked: readonly Clue[]): Feedback[] =>
  blocked.map((c) => ({ code: 'missing_report_clue' as const, message: c.combo?.missingReportText ?? '보고서에 빠진 근거가 있다.' }));

export function judgeWhen(spec: ReportSpec, draft: ReportDraft, w: ReportWorld): BlankResult {
  const d = draft.when;
  const { ids, blocked } = blankClues(d.attachments, reportBaseClues(draft, w), w);
  const res = (verdict: Verdict, feedback: Feedback[], implied?: BlankResult['implied']): BlankResult => ({
    blank: 'when',
    verdict,
    feedback,
    implied,
    clueIds: ids,
  });
  if (!d.attachments.length) return res('undetermined', [{ code: 'empty', message: spec.when.emptyText }]);
  if (d.from === undefined || d.to === undefined)
    return res('undetermined', [{ code: 'invalid_input', message: spec.when.noYearText }, ...blockedFeedback(blocked)]);
  const r = judgeYear(
    { id: spec.id + '.when', provenance: spec.provenance, kind: 'year', target: spec.when.target, maxPartialWidth: spec.when.maxPartialWidth },
    { from: d.from, to: d.to, evidenceIds: ids },
    judgeContext(ids, w),
  );
  const feedback = r.feedback.map((f) => {
    const own = spec.when.messages[f.code];
    return own && !f.evidenceId ? { ...f, message: own } : f;
  });
  if (r.verdict !== 'confirmed') feedback.push(...blockedFeedback(blocked), ...tipsFor(spec.when.tips, ids));
  return res(r.verdict, feedback, r.implied);
}

export function judgeWho(spec: ReportSpec, draft: ReportDraft, w: ReportWorld): BlankResult {
  const atts = draft.who.attachments;
  const frameIds = [...new Set(atts.filter((a) => a.kind === 'frame').flatMap((a) => attachmentClues(a, w)))];
  const res = (verdict: Verdict, feedback: Feedback[]): BlankResult => ({ blank: 'who', verdict, feedback, clueIds: frameIds });
  if (!atts.length) return res('undetermined', [{ code: 'empty', message: spec.who.noPersonText }]);
  const persons = atts
    .filter((a) => a.kind === 'record')
    .map((a) => w.records[a.id]?.personId)
    .filter((p): p is Id => !!p);
  if (persons.length === 0)
    return res('undetermined', [{ code: 'unknown_choice', message: spec.who.noPersonText }, ...tipsFor(spec.who.tips, frameIds)]);
  if (new Set(persons).size > 1) return res('undetermined', [{ code: 'invalid_input', message: spec.who.twoPersonsText }]);
  const r = judgePerson(
    { id: spec.id + '.who', provenance: spec.provenance, kind: 'person', candidates: spec.who.candidates, answer: spec.who.answer, requiredFacts: spec.who.requiredFacts },
    { candidateId: persons[0]!, evidenceIds: frameIds },
    judgeContext(frameIds, w),
  );
  const feedback = r.feedback.filter((f) => f.code !== 'no_facts');
  if (r.verdict !== 'confirmed') feedback.push(...tipsFor(spec.who.tips, frameIds));
  return res(r.verdict, feedback);
}

export function judgeFacts(key: 'what' | 'result', spec: FactBlankSpec, draft: ReportDraft, w: ReportWorld): BlankResult {
  const { ids, blocked } = blankClues(draft[key].attachments, reportBaseClues(draft, w), w);
  const res = (verdict: Verdict, feedback: Feedback[]): BlankResult => ({ blank: key, verdict, feedback, clueIds: ids });
  if (!draft[key].attachments.length) return res('undetermined', [{ code: 'empty', message: spec.emptyText }]);
  const { facts } = citedFacts(ids, judgeContext(ids, w));
  const has = (f: Fact) => hasFact(facts, f);
  const missing = spec.requires.findIndex((f) => !has(f));
  if (missing < 0) return res('confirmed', []);
  const extra = [...blockedFeedback(blocked), ...tipsFor(spec.tips, ids)];
  const wrong = (spec.wrong ?? []).filter((x) => has(x.fact));
  if (wrong.length)
    return res('wrong', [...wrong.map((x) => ({ code: 'fact_contradiction' as const, fact: x.fact, message: x.message })), ...extra]);
  const near = (spec.near ?? []).filter((x) => has(x.fact));
  if (near.length && !spec.requires.some(has))
    return res('undetermined', [...near.map((x) => ({ code: 'missing_fact' as const, message: x.message })), ...extra]);
  return res('undetermined', [{ code: 'missing_fact', message: spec.missingText[missing] ?? spec.emptyText }, ...extra]);
}

export function judgeReport(spec: ReportSpec, draft: ReportDraft, w: ReportWorld): ReportResult {
  const blanks: Record<BlankKey, BlankResult> = {
    when: judgeWhen(spec, draft, w),
    who: judgeWho(spec, draft, w),
    what: judgeFacts('what', spec.what, draft, w),
    result: judgeFacts('result', spec.result, draft, w),
  };
  return { reportId: spec.id, blanks, complete: BLANK_KEYS.every((k) => blanks[k].verdict === 'confirmed') };
}
