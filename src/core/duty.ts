/**
 * v4 「근무」 순수 로직(페이퍼 플리즈식 밤 근무). 설계: docs/DESIGN_V4.md §3·§5.
 *
 *  근무(WorkShift) = 밤 하나: 큐·목표·근무 시간·새 규정 하나.
 *  건(CaseDef)     = 기록 카드(검증된 원문 + 한 낱말 변조) + 짧은 관측 장면 + 짚을 짝(pairs).
 *  검사 모드        = 기록 낱말 → 관측 낱말: 변조된 짝 → differs(빨간 실), 표기 차이 짝 → notation(노란 깜빡임), 그 외 → none.
 *  판정            = 데이터로 계산: 변조가 있으면 정정, 없으면 확인. 정정은 다른 낱말을 짚어 둔 뒤에만(빨강/노랑).
 *  경고            = 오판·규정 위반에만(미완성 조작은 not_ready, 경고 없음). 3장 → 관측 권한 정지(면담 뒤 계속).
 *
 * 부수 효과 없음. 스토어(src/store/gameStore.ts)가 상태를 들고 이 함수들을 부른다.
 */
import type {
  CaseDef,
  CaseObserved,
  CasePair,
  CaseSegment,
  CaseStamp,
  Id,
  ReplayWindow,
  RuleDef,
  WorkShift,
} from './types';
import type { Frame } from './report';

/** 대조관 번호: 모든 도장 자국 아래, 손잡이에도 */
export const OFFICER_ENGRAVING = '07';
/** 이 수만큼 (살아 있는) 경고가 쌓이면 관측 권한 정지 → 면담 */
export const SUSPEND_AT = 3;

export const STAMP_NAMES: Record<CaseStamp, string> = {
  confirm: '확인',
  correct: '정정',
  mismatch: '불일치',
  auto_close: '자동 종결',
  report: '불일치 보고서',
};

// ── 저장 상태 ────────────────────────────────────────────────────
export type InspectRelation = 'differs' | 'notation' | 'none';

export interface InspectLink {
  record: Id;
  observed: Id;
  relation: InspectRelation;
}

export interface CaseProgress {
  /** 책상에 올라온 근무 시각(경과 분) */
  openedAt: number;
  links: InspectLink[];
  stamp?: CaseStamp;
  /** 데이터 기준 정답이었나 */
  correct?: boolean;
  /** 정정 근거 프레임(규정 4조) — C-2217 필름과 별개 */
  frame?: Frame;
  /** 처리한 근무 시각(경과 분) */
  doneAt?: number;
}

export interface WarningSlip {
  id: Id;
  seq: number;
  dutyId: Id;
  caseId?: Id;
  ruleId?: Id;
  /** 경고장 문구(교육적인 사유) */
  reason: string;
  /** 면담으로 정리됨(정지 계산에서 빠짐, 보고 합계에는 남음) */
  cleared?: boolean;
  /** 복원으로 '해당 없음'이 됨(어디에도 세지 않음) */
  voided?: boolean;
  voidText?: string;
}

export interface ReplayLog {
  seq: number;
  dutyId: Id;
  caseId: Id;
  windowId: Id;
  /** 근무 시각(경과 분) */
  at: number;
}

export interface InterviewLog {
  seq: number;
  dutyId: Id;
  /** 면담 때 읽어 준 경고장 */
  slipIds: Id[];
  choice?: Id;
  done: boolean;
}

export interface DutyState {
  /** 진행 중 근무 */
  active: Id | null;
  started: Id[];
  ended: Id[];
  /** 근무 id → 경과 분 */
  clock: Record<Id, number>;
  /** 책상 위의 건 */
  current: Id | null;
  cases: Record<Id, CaseProgress>;
  warnings: WarningSlip[];
  /** 관측 권한 정지(면담 대기) */
  suspended: boolean;
  interviews: InterviewLog[];
  replays: ReplayLog[];
  /** 지금 재생 중인 구간(관측기 로그) */
  replay: { caseId: Id; windowId: Id } | null;
  /** 규정집에서 '신설' 표시를 확인한 규정 */
  rulesRead: Id[];
}

export function emptyDuty(): DutyState {
  return {
    active: null,
    started: [],
    ended: [],
    clock: {},
    current: null,
    cases: {},
    warnings: [],
    suspended: false,
    interviews: [],
    replays: [],
    replay: null,
    rulesRead: [],
  };
}

// ── 기록 카드 ────────────────────────────────────────────────────
export interface ShownSegment extends CaseSegment {
  /** 카드에 보이는 글자(변조면 바뀐 낱말) */
  shown: string;
  /** 이 조각이 지금 변조 상태인가(복원 전) */
  altered: boolean;
}

/** 원문(검증된 문장) */
export const originalText = (c: CaseDef): string => (c.record?.segments ?? []).map((s) => s.text).join('');

/** 기록 카드의 짚을 수 있는 모든 조각(날짜 + 문장) */
export const recordSegments = (c: CaseDef): CaseSegment[] => [...(c.record?.date ?? []), ...(c.record?.segments ?? [])];

/** 카드에 보이는 조각(날짜 조각 먼저). restored 이면 원문 그대로. */
export function shownSegments(c: CaseDef, restored = false): ShownSegment[] {
  const d = c.record?.distortion;
  return recordSegments(c).map((s) => {
    const altered = !restored && !!d && d.segmentId === s.id;
    return { ...s, shown: altered ? d!.text : s.text, altered };
  });
}

/** 카드 문장(날짜 제외)의 보이는 글자 */
export const shownText = (c: CaseDef, restored = false) => {
  const dateIds = new Set((c.record?.date ?? []).map((x) => x.id));
  return shownSegments(c, restored).filter((s) => !dateIds.has(s.id)).map((s) => s.shown).join('');
};

/** 데이터가 정한 정답 도장(검증기가 expected 와 맞는지 본다) */
export function derivedExpected(c: CaseDef): CaseStamp[] {
  if (c.kind === 'routine') return c.record?.distortion ? ['correct'] : ['confirm'];
  if (c.kind === 'noise') return ['auto_close'];
  return c.expected;
}

// ── 검사 모드 ────────────────────────────────────────────────────
export const findPair = (c: CaseDef, record: Id, observed: Id): CasePair | undefined =>
  c.pairs.find((p) => p.record === record && p.observed === observed);

/** 기록 조각 ↔ 관측 조각의 관계(데이터 계산). 변조된 짝 → differs, 표기 차이 짝 → notation, 그 외 → none. */
export function inspectRelation(c: CaseDef, record: Id, observed: Id): InspectRelation {
  const p = findPair(c, record, observed);
  if (!p) return 'none';
  if (c.record?.distortion?.segmentId === record) return 'differs';
  return p.notation ? 'notation' : 'none';
}

export const observedOfSegment = (c: CaseDef, segId: Id): CaseObserved | undefined =>
  c.observed.find((o) => o.segments.some((s) => s.id === segId));

export interface ObservationMemory {
  heard: readonly Id[];
  seen: readonly Id[];
  tapped: readonly Id[];
}

/** 이 관측 대상을 짚을 수 있는가: 대사는 들었어야, 대상은 탭했거나 확대해서 봤어야 한다. */
export function observedAvailable(o: CaseObserved, m: ObservationMemory): boolean {
  if (o.kind === 'line') return !!o.lineId && m.heard.includes(o.lineId);
  return !!o.hotspotId && (m.tapped.includes(o.hotspotId) || m.seen.includes(o.hotspotId));
}

/** 정정의 근거가 되는 짚음: 빨간 실 우선, 없으면 마지막 노란 깜빡임 */
export function flaggedLink(links: readonly InspectLink[]): InspectLink | undefined {
  return links.find((l) => l.relation === 'differs') ?? [...links].reverse().find((l) => l.relation === 'notation');
}

/** 프레임이 이 관측 대상을 담고 있는가(대사가 들렸거나 대상이 화면에 있었다) */
export function frameShows(frame: Frame | undefined, o: CaseObserved | undefined): boolean {
  if (!frame || !o) return false;
  if (o.kind === 'line') return !!o.lineId && frame.heardLineIds.includes(o.lineId);
  return !!o.hotspotId && frame.visibleHotspotIds.includes(o.hotspotId);
}

// ── 규정 ────────────────────────────────────────────────────────
/** 시작한 근무들까지 생긴 규정(규정 번호 순). 근무 1 의 newRules 가 기본 규정. */
export function activeRules(shifts: readonly WorkShift[], rules: readonly RuleDef[], started: readonly Id[]): RuleDef[] {
  const ids = new Set(shifts.filter((s) => started.includes(s.id)).flatMap((s) => s.newRules));
  return rules.filter((r) => ids.has(r.id)).sort((a, b) => a.no - b.no);
}

export const ruleEnabled = (active: readonly RuleDef[], feature: NonNullable<RuleDef['enables']>[number]) =>
  active.some((r) => r.enables?.includes(feature));

export const ruleWith = (active: readonly RuleDef[], feature: NonNullable<RuleDef['enables']>[number]) =>
  active.find((r) => r.enables?.includes(feature));

// ── 판정 ────────────────────────────────────────────────────────
export type StampDecision =
  | { status: 'not_ready'; message: string }
  | { status: 'ok'; correct: boolean; warning?: { reason: string; ruleId?: Id }; restored: boolean };

export interface StampInput {
  c: CaseDef;
  stamp: CaseStamp;
  progress: CaseProgress;
  memory: ObservationMemory;
  rules: readonly RuleDef[];
  /** lost/noise 의 readyWhen 결과(스토어가 조건으로 계산해 넘긴다) */
  ready: boolean;
  /** 규정 외 도장(불일치) 규정 */
  mismatchRule?: RuleDef;
}

export const NOT_READY = {
  noObservation: '아직 관측하지 않았다. 관측 화면을 확대하면 말이 들린다.',
  noRecord: '이 건에는 대조할 기록이 없다.',
  hasRecord: '기록이 있는 건이다. 기록과 관측을 대조하자.',
  noLink: '정정하려면 다른 낱말을 먼저 짚자 — 기록 카드의 낱말, 그리고 관측에서 들은 말.',
  noFrame: '근거 프레임이 없다(규정 4조). 그 말이 들리는 순간을 찍어 카드에 붙이자.',
  report: '불일치 보고서는 업무의 보고서 양식에서 낸다.',
} as const;

const DEFAULT_WRONG = {
  confirm: '기록과 관측이 다른 곳이 있었다. 낱말을 하나씩 짚어 보자.',
  correct: '고칠 곳이 없는 기록이었다. 표기가 달라도 뜻이 같으면 확인이다.',
  /** 변조가 있는 건에서 표기 차이(노랑)를 근거로 정정했다 */
  wrongWord: '짚은 두 낱말은 표기만 다른 같은 말이었다. 기록과 관측이 정말 다른 곳은 따로 있었다.',
} as const;

/**
 * 도장 판정(순수). 미완성 조작은 not_ready(경고 없음). 오판·규정 외 도장은 ok + correct:false + warning.
 * lost 의 불일치는 규정 위반 경고를 받지만 이야기의 정답(expected)일 수 있다.
 */
export function judgeStamp(i: StampInput): StampDecision {
  const { c, stamp, progress } = i;
  if (stamp === 'report') return { status: 'not_ready', message: NOT_READY.report };
  const expected = derivedExpected(c);
  const ruleWarn = (): { reason: string; ruleId?: Id } => ({
    reason: c.explain?.mismatch ?? i.mismatchRule?.violation ?? '규정 외 도장.',
    ruleId: i.mismatchRule?.id,
  });

  if (c.kind !== 'routine') {
    if (stamp === 'confirm' || stamp === 'correct') return { status: 'not_ready', message: NOT_READY.noRecord };
    if (!i.ready) return { status: 'not_ready', message: c.notReadyText ?? NOT_READY.noObservation };
    if (stamp === 'mismatch') return { status: 'ok', correct: expected.includes('mismatch'), warning: ruleWarn(), restored: false };
    const ok = expected.includes('auto_close');
    return {
      status: 'ok',
      correct: ok,
      warning: ok ? undefined : { reason: c.explain?.auto_close ?? '자동 종결할 건이 아니었다.' },
      restored: false,
    };
  }

  // routine
  if (stamp === 'auto_close') return { status: 'not_ready', message: NOT_READY.hasRecord };
  const observedAny = c.observed.some((o) => observedAvailable(o, i.memory));
  if (!observedAny) return { status: 'not_ready', message: NOT_READY.noObservation };
  if (stamp === 'mismatch') return { status: 'ok', correct: false, warning: ruleWarn(), restored: false };
  if (stamp === 'confirm') {
    const ok = expected.includes('confirm');
    return { status: 'ok', correct: ok, warning: ok ? undefined : { reason: c.explain?.confirm ?? DEFAULT_WRONG.confirm }, restored: false };
  }
  // correct
  const link = flaggedLink(progress.links);
  if (!link) return { status: 'not_ready', message: NOT_READY.noLink };
  if (ruleEnabled(i.rules, 'frame_for_correct') && !frameShows(progress.frame, observedOfSegment(c, link.observed)))
    return { status: 'not_ready', message: NOT_READY.noFrame };
  const ok = expected.includes('correct') && link.relation === 'differs' && link.record === c.record?.distortion?.segmentId;
  return {
    status: 'ok',
    correct: ok,
    warning: ok ? undefined : { reason: expected.includes('correct') ? DEFAULT_WRONG.wrongWord : (c.explain?.correct ?? DEFAULT_WRONG.correct) },
    restored: ok,
  };
}

// ── 근무 시간·큐 ─────────────────────────────────────────────────
export const dutyClock = (d: DutyState, dutyId: Id) => d.clock[dutyId] ?? 0;

/** 'HH:MM' (근무 시작 시각 + 경과) */
export function clockText(shift: WorkShift, elapsed: number): string {
  const m = (((shift.startClock + elapsed) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export const caseDone = (d: DutyState, caseId: Id) => !!d.cases[caseId]?.stamp;

/** 아직 처리하지 않은 큐의 건(순서대로) */
export function pendingCases(shift: WorkShift, d: DutyState): Id[] {
  return shift.queue.filter((id) => !caseDone(d, id));
}

/** 다음에 책상에 올릴 수 있는 건: 큐 순서의 첫 미처리 건이 남은 시간 안에 들어가면 */
export function nextLoadable(shift: WorkShift, d: DutyState, cases: Readonly<Record<Id, CaseDef>>): Id | null {
  const next = pendingCases(shift, d)[0];
  if (!next) return null;
  const c = cases[next];
  if (!c) return null;
  return dutyClock(d, shift.id) + c.minutes <= shift.length ? next : null;
}

/** 큐가 끝났거나 남은 시간에 다음 건이 들어가지 않는다 */
export function queueExhausted(shift: WorkShift, d: DutyState, cases: Readonly<Record<Id, CaseDef>>): boolean {
  return d.current === null && nextLoadable(shift, d, cases) === null;
}

export const replayWindow = (c: CaseDef, windowId: Id): ReplayWindow | undefined => c.replay?.windows.find((w) => w.id === windowId);

// ── 경고·카운터 ──────────────────────────────────────────────────
export const liveWarnings = (d: DutyState, dutyId?: Id) =>
  d.warnings.filter((w) => !w.voided && !w.cleared && (!dutyId || w.dutyId === dutyId));
export const countedWarnings = (d: DutyState, dutyId?: Id) => d.warnings.filter((w) => !w.voided && (!dutyId || w.dutyId === dutyId));

/**
 * 조건(StateCondition.counters)이 읽는 수치. 키:
 *  processed:<duty> correct:<duty> warnings:<duty>(복원으로 지워진 것 제외, 면담 정리분 포함) live:<duty> replays:<duty>
 *  clock:<duty>(경과 분) goal:<duty>(목표 달성 1/0) interviews · replays(전체) · warnings(전체)
 */
export function dutyCounters(d: DutyState, shifts: readonly WorkShift[], cases: Readonly<Record<Id, CaseDef>>): Record<string, number> {
  const out: Record<string, number> = {
    interviews: d.interviews.filter((x) => x.done).length,
    replays: d.replays.length,
    warnings: countedWarnings(d).length,
  };
  for (const s of shifts) {
    const done = s.queue.filter((id) => caseDone(d, id) && !!cases[id]);
    const processed = done.length;
    out[`processed:${s.id}`] = processed;
    out[`correct:${s.id}`] = done.filter((id) => d.cases[id]?.correct).length;
    out[`warnings:${s.id}`] = countedWarnings(d, s.id).length;
    out[`live:${s.id}`] = liveWarnings(d, s.id).length;
    out[`replays:${s.id}`] = d.replays.filter((r) => r.dutyId === s.id).length;
    out[`clock:${s.id}`] = dutyClock(d, s.id);
    out[`goal:${s.id}`] = processed >= s.goal ? 1 : 0;
  }
  return out;
}

// ── 근무 보고 ────────────────────────────────────────────────────
export interface ShiftReport {
  dutyId: Id;
  no: number;
  title: string;
  /** 처리한 건(노이즈·좌표 손상 건 포함) */
  processed: number;
  goal: number;
  goalMet: boolean;
  correct: number;
  /** 정확도 0..1(처리 0이면 1) */
  accuracy: number;
  /** 받은 경고(복원으로 지워진 것 제외) */
  warnings: number;
  /** 복원으로 '해당 없음'이 된 경고 */
  voided: number;
  replays: number;
  interviews: number;
  clock: string;
}

export function shiftReport(shift: WorkShift, d: DutyState, cases: Readonly<Record<Id, CaseDef>>): ShiftReport {
  const c = dutyCounters(d, [shift], cases);
  const processed = c[`processed:${shift.id}`] ?? 0;
  const correct = c[`correct:${shift.id}`] ?? 0;
  return {
    dutyId: shift.id,
    no: shift.no,
    title: shift.title,
    processed,
    goal: shift.goal,
    goalMet: processed >= shift.goal,
    correct,
    accuracy: processed ? correct / processed : 1,
    warnings: c[`warnings:${shift.id}`] ?? 0,
    voided: d.warnings.filter((w) => w.dutyId === shift.id && w.voided).length,
    replays: c[`replays:${shift.id}`] ?? 0,
    interviews: d.interviews.filter((x) => x.dutyId === shift.id && x.done).length,
    clock: clockText(shift, dutyClock(d, shift.id)),
  };
}

/** 이 프레임 스냅숏이 이 건의 관측 대상 중 무엇을 담는가(UI 미리보기용) */
export function frameObserved(c: CaseDef, frame: Frame): Id[] {
  return c.observed.filter((o) => frameShows(frame, o)).map((o) => o.id);
}
