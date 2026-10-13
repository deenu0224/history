import { clear } from 'idb-keyval';
import { loadGame } from '@/core/save';
import { checkState } from '@/core/terminal';
import { findLine } from '@/core/observation';
import { recordSegments } from '@/core/duty';
import {
  conditionState,
  createGameStore,
  enableAutosave,
  selectAssignment,
  selectCaseCard,
  selectCaseLedger,
  selectClosedReports,
  selectDesk,
  selectFrames,
  selectInbox,
  selectInterview,
  selectObservationRange,
  selectRecord,
  selectRecordLedger,
  selectReplay,
  selectReport,
  selectRewrittenMessages,
  selectShiftReport,
  selectVerdictHistory,
  type ViewerSnapshot,
} from '@/store/gameStore';
import { content } from '@/data';
import type { CaseDef } from '@/core/types';

let store = createGameStore(content);
const s = () => store.getState();

beforeEach(async () => {
  await clear();
  store = createGameStore(content);
});

const RED = 'hs_npc_red_official';
const caseOf = (id: string) => content.cases.find((c) => c.id === id) as CaseDef;
const snap = (minute: number, heard: string[], visible: string[] = [], zoom = 2): ViewerSnapshot => ({
  minute,
  centerTile: { x: 8, y: 6 },
  zoom,
  visibleHotspotIds: visible,
  heardLineIds: heard,
  thumbDataUrl: '',
});
const inbox = () => s().inbox;
/** 대사가 들리는 첫 분 */
const lineMinute = (lineId: string) => findLine(content.npcs, lineId)!.line.at![0]!.from;

/** 뷰어 흉내: 책상 위 건의 장면을 열고, 관측 대상 대사가 들리는 순간으로 옮겨 듣는다 */
function observe(caseId: string) {
  const c = caseOf(caseId);
  expect(s().startObservation()).toBe(true);
  for (const o of c.observed)
    if (o.lineId) {
      s().scrubObservation(lineMinute(o.lineId));
      expect(s().hearLine(o.lineId)).toBe(true);
    }
}
/** 변조 낱말과 짝의 관측 낱말 */
function distortedPair(c: CaseDef) {
  const d = c.record!.distortion!;
  const p = c.pairs.find((x) => x.record === d.segmentId)!;
  return [d.segmentId, p.observed] as const;
}
function notationPair(c: CaseDef) {
  const p = c.pairs.find((x) => x.notation)!;
  return [p.record, p.observed] as const;
}
/** 정답대로 한 건을 처리한다(관측 → 짚기 → (근거 프레임) → 도장) */
function playCase(caseId: string) {
  expect(s().nextCase()).toMatchObject({ status: 'loaded', caseId });
  const c = caseOf(caseId);
  if (c.kind === 'routine') {
    observe(caseId);
    if (c.record!.distortion) {
      const [rec, obs] = distortedPair(c);
      expect(s().inspect(rec, obs)).toMatchObject({ status: 'linked', relation: 'differs' });
      if (selectCaseCard(s(), caseId)!.needsFrame) {
        expect(s().stampCase('correct').status).toBe('not_ready');
        const line = c.observed.find((o) => o.segments.some((x) => x.id === obs))!.lineId!;
        const cap = s().captureFrame(snap(lineMinute(line), [line]));
        expect(cap).toMatchObject({ target: 'case', status: 'captured' });
      }
      const r = s().stampCase('correct');
      expect(r).toMatchObject({ status: 'stamped', correct: true });
      expect(r.warning).toBeUndefined();
      expect(r.restored!.text).toBe(c.record!.segments.map((x) => x.text).join(''));
    } else {
      const r = s().stampCase('confirm');
      expect(r).toMatchObject({ status: 'stamped', correct: true });
    }
  } else if (c.kind === 'noise') {
    expect(s().startObservation()).toBe(true);
    s().scrubObservation(c.readyWhen!.reached!.minute);
    expect(s().stampCase('auto_close')).toMatchObject({ status: 'stamped', correct: true });
  }
}

/** 근무 1 정답 플레이(승인 시안): 네 건 → #C-2217 하루 관측 → 서랍의 불일치 → 판정 이력 */
function playShift1(drawer = true) {
  expect(s().startDuty('duty_1').status).toBe('started');
  for (const id of ['case_a0412', 'case_a0419', 'case_a0423', 'case_a0431']) playCase(id);
  expect(s().nextCase()).toMatchObject({ status: 'loaded', caseId: 'case_c2217' });
  expect(s().startObservation()).toBe(true);
  expect(s().stampCase('auto_close').status).toBe('not_ready'); // 하루를 끝까지 보기 전
  s().scrubObservation(850);
  expect(s().hearLine('m2')).toBe(true);
  const r = s().stampCase(drawer ? 'mismatch' : 'auto_close');
  expect(r.status).toBe('stamped');
  expect(r.autoClassification).toBe('자동 분류: 관측 오류(장비 노이즈) · 종결');
  return r;
}

/** 근무 2: 규정 4조 + 종결 건 재생(14~17시 한 구간) + DB */
function playShift2(replayWindows = ['rw_14']) {
  expect(s().startDuty('duty_2').status).toBe('started');
  playCase('case_a0501');
  for (const w of replayWindows) {
    const rr = s().openReplay(w);
    expect(rr.status).toBe('opened');
    expect(rr.warning).toBeUndefined(); // 근무 2 에는 규정 5조가 없다
    if (w === 'rw_14') {
      s().scrubObservation(850);
      s().hearLine('m2');
      expect(s().captureFrame(snap(850, ['m2'])).target).toBe('film');
      s().hearLine('c3');
      s().captureFrame(snap(860, ['c3'], [RED, 'hs_npc_clerk']));
      s().scrubObservation(1000);
      s().hearLine('b5');
      s().captureFrame(snap(1000, ['b5'], ['hs_npc_blue_official']));
    }
    s().endObservation();
  }
  s().search('김일손');
  s().openRecord('rec_alt_kim_ilson');
  s().search('이극돈');
  s().openRecord('rec_alt_yi_geukdon');
  for (const id of ['case_a0502', 'case_a0503', 'case_a0504', 'case_a0505']) {
    if (selectDesk(s()).nextLoadable !== id) break;
    playCase(id);
  }
}

function fileReport() {
  const frameWith = (clue: string) => s().frames.find((f) => f.clueIds.includes(clue))!;
  const fr = (clue: string) => ({ kind: 'frame' as const, id: frameWith(clue).id });
  const rec = (id: string) => ({ kind: 'record' as const, id });
  expect(selectReport(s())!.unlocked).toBe(true);
  s().attach('when', fr('cl_alive'));
  s().attach('when', rec('rec_alt_kim_ilson'));
  s().setYear(1498, 1498);
  s().attach('who', rec('rec_alt_yi_geukdon'));
  s().attach('who', fr('cl_veteran'));
  s().attach('what', fr('cl_order'));
  s().attach('result', fr('cl_order'));
  s().attach('result', rec('rec_alt_kim_ilson'));
  const r = s().submitReport()!;
  expect(Object.values(r.blanks).map((b) => b.verdict)).toEqual(['confirmed', 'confirmed', 'confirmed', 'confirmed']);
  return s().stampReport();
}

describe('v4 — 근무 1 (승인 시안)', () => {
  it('starts on the desk with two stamps and the base rules; no year anywhere on the cards', () => {
    expect(selectDesk(s()).nextDutyId).toBe('duty_1');
    expect(s().startDuty('duty_2').status).toBe('locked');
    s().startDuty('duty_1');
    const d = selectDesk(s());
    expect(d.shift!.goal).toBe(5);
    expect(d.rules.map((r) => r.rule.no)).toEqual([1, 2, 3]);
    expect(d.shutter).toBe(false);
    expect(d.clock).toBe('23:04');
    expect(inbox()).toEqual(expect.arrayContaining(['m_sys_login', 'm_chief_01']));
    for (const c of content.cases) expect(JSON.stringify(selectCaseCard(s(), c.id)!.citation ?? '')).not.toMatch(/\d{4}/);
  });

  it('A-0412: needs observation first, then 확인; the 훙/승하 pair is a notation difference', () => {
    s().startDuty('duty_1');
    s().nextCase();
    expect(s().stampCase('confirm')).toMatchObject({ status: 'not_ready' });
    expect(s().duty.warnings).toEqual([]); // 미완성 조작에는 경고가 없다
    observe('case_a0412');
    expect(s().inspect('a0412_died', 'a0412o_died')).toMatchObject({ relation: 'notation', message: '표기 차이 — 판단은 대조관' });
    expect(s().inspect('a0412_place', 'a0412o_place').relation).toBe('none');
    expect(s().inspect('a0412_osi', 'a0412o_place').relation).toBe('none');
    const r = s().stampCase('confirm');
    expect(r).toMatchObject({ status: 'stamped', correct: true });
    expect(selectCaseCard(s(), 'case_a0412')!.impression).toMatchObject({ label: '확인', engraving: '07' });
    expect(selectDesk(s()).clock).toBe('23:44');
  });

  it('A-0419: 정정 requires linking the differing word; restores the verified original', () => {
    s().startDuty('duty_1');
    playCase('case_a0412');
    s().nextCase();
    expect(selectCaseCard(s(), 'case_a0419')!.segments.find((x) => x.altered)!.shown).toBe('유자광(柳子光)');
    observe('case_a0419');
    expect(s().stampCase('correct')).toMatchObject({ status: 'not_ready' });
    expect(s().inspect('a0419_yi', 'a0419o_yi').relation).toBe('differs');
    const r = s().stampCase('correct');
    expect(r).toMatchObject({ status: 'stamped', correct: true });
    expect(r.restored!.text).toBe('왕이 어세겸(魚世謙)·이극돈(李克墩) 등에게 명하여 (대행왕의 《실록》을) 편찬하게 하였다.');
    expect(r.restored!.sources[0]!.url).toContain('kja_10104019_002');
    const card = selectCaseCard(s(), 'case_a0419')!;
    expect(card.restored).toBe(true);
    expect(card.segments.some((x) => x.altered)).toBe(false);
  });

  it('A-0423 trap: 정정 on the yellow pair → warning 1 with an educational reason; still processed', () => {
    s().startDuty('duty_1');
    playCase('case_a0412');
    playCase('case_a0419');
    s().nextCase();
    observe('case_a0423');
    const [rec, obs] = notationPair(caseOf('case_a0423'));
    expect(s().inspect(rec, obs).relation).toBe('notation');
    const r = s().stampCase('correct');
    expect(r).toMatchObject({ status: 'stamped', correct: false });
    expect(r.warning!.reason).toContain('성종');
    expect(r.warning!.reason).toContain('같은 내용');
    expect(s().recentSlips).toHaveLength(1);
    expect(selectDesk(s()).slips).toHaveLength(1);
    expect(s().duty.suspended).toBe(false);
  });

  it('full shift 1: the drawer stamp, auto-close overlay, verdict history with the faded 07, 오 실장', () => {
    playShift1();
    expect(s().duty.warnings.map((w) => w.ruleId)).toEqual(['rule_3']);
    const hist = selectVerdictHistory(s());
    expect(hist.map((h) => [h.when, h.impression.label, h.impression.faded ?? false])).toEqual([
      ['오늘', '불일치', false],
      ['1년 전', '불일치', true],
    ]);
    expect(hist.every((h) => h.impression.engraving === '07')).toBe(true);
    expect(s().openClosedReport(hist[1]!.closedReportId!)).toBe(true);
    expect(inbox()).toEqual(expect.arrayContaining(['m_me_nomemory', 'm_chief_warn1', 'm_chief_drawer', 'm_chief_03b', 'm_sys_db']));
    expect(selectInbox(s()).find((i) => i.message.id === 'm_me_nomemory')!.message.text).toBe('나는 이 도장을 찍은 기억이 없다.');
    expect(selectDesk(s()).canEnd).toBe(true);
    const end = s().endDuty();
    expect(end.status).toBe('ended');
    expect(end.report).toMatchObject({ processed: 5, goal: 5, goalMet: true, warnings: 1 });
    expect(end.report!.line).toBe('첫날부터 서랍을 열었네. …내일 보자.');
  });

  it('approved wording: with the trap mistake the drawer stamp is warning 2 → "07. 경고 두 개야."', () => {
    s().startDuty('duty_1');
    playCase('case_a0412');
    playCase('case_a0419');
    s().nextCase();
    observe('case_a0423');
    s().inspect(...notationPair(caseOf('case_a0423')));
    s().stampCase('correct');
    playCase('case_a0431');
    s().nextCase();
    s().startObservation();
    s().scrubObservation(1030);
    s().stampCase('mismatch');
    s().openClosedReport('cr_c2217_prev');
    expect(inbox()).toContain('m_chief_warn2');
    expect(inbox()).not.toContain('m_chief_warn1');
    expect(selectShiftReport(s(), 'duty_1')).toMatchObject({ warnings: 2, correct: 4, processed: 5 });
  });

  it('accepting the auto-close is failure-free: same history hook, 오 실장 agrees', () => {
    playShift1(false);
    expect(s().duty.warnings).toEqual([]);
    s().openClosedReport('cr_c2217_prev');
    expect(inbox()).toEqual(expect.arrayContaining(['m_me_nomemory', 'm_chief_02n']));
    expect(selectVerdictHistory(s())[1]!.impression.faded).toBe(true);
  });
});

describe('v4 — 근무 2: rule 4 frames and the secret reopen', () => {
  it('rule 4 adds the shutter; 정정 needs an evidence frame of the differing line', () => {
    playShift1();
    s().endDuty();
    s().startDuty('duty_2');
    const d = selectDesk(s());
    expect(d.shutter).toBe(true);
    expect(d.rules.filter((r) => r.isNew).map((r) => r.rule.id)).toEqual(['rule_4']);
    s().markRulesRead();
    expect(selectDesk(s()).rules.some((r) => r.isNew)).toBe(false);
    s().nextCase();
    observe('case_a0501');
    s().inspect(...distortedPair(caseOf('case_a0501')));
    expect(s().stampCase('correct')).toMatchObject({ status: 'not_ready', message: expect.stringContaining('근거 프레임') });
    // 다른 말이 안 들리는 순간을 찍으면 근거가 아니다
    expect(s().captureFrame(snap(845, [])).target).toBe('case');
    expect(s().stampCase('correct').status).toBe('not_ready');
    s().captureFrame(snap(860, ['a0501_l1']));
    expect(selectCaseCard(s(), 'case_a0501')!.frameShows).toEqual(['a0501_ob1']);
    expect(s().stampCase('correct')).toMatchObject({ status: 'stamped', correct: true });
    expect(inbox()).toEqual(expect.arrayContaining(['m_senior_s2_1', 'm_senior_s2_2', 'm_senior_s2_3']));
  });

  it('replay costs shift time: 1 window keeps the goal, 2 windows cost a case and the evaluation', () => {
    playShift1();
    s().endDuty();
    playShift2(['rw_14']);
    expect(selectDesk(s()).processed).toBe(5);
    expect(new Set(s().frames.flatMap((f) => f.clueIds))).toEqual(new Set(['cl_order', 'cl_veteran', 'cl_dangsang', 'cl_alive']));
    const end = s().endDuty();
    expect(end.report).toMatchObject({ processed: 5, goalMet: true, replays: 1 });
    expect(end.report!.line).toContain('재생이 찍혔던데');

    store = createGameStore(content);
    playShift1();
    s().endDuty();
    playShift2(['rw_14', 'rw_08']);
    expect(selectDesk(s()).processed).toBe(4);
    expect(s().nextCase().status).toBe('no_time');
    const e2 = s().endDuty();
    expect(e2.report).toMatchObject({ processed: 4, goalMet: false, replays: 2 });
    expect(e2.report!.line).toContain('목표 미달');
    expect(inbox()).toContain('m_chief_04');
  });

  it('replay is clamped to its window and logged; not available in shift 1', () => {
    playShift1();
    expect(s().openReplay('rw_14').status).toBe('locked');
    s().endDuty();
    s().startDuty('duty_2');
    expect(selectReplay(s())).toMatchObject({ available: true, violation: false, costMinutes: 60, count: 0 });
    s().openReplay('rw_11');
    expect(selectObservationRange(s())).toEqual({ from: 660, to: 840 });
    expect(s().scrubObservation(1000)).toBe(840);
    expect(selectDesk(s()).clock).toBe('00:00');
    expect(selectReplay(s()).count).toBe(1);
  });

  it('06:00 recalculation at the end of shift 2 degrades only what is already captured', () => {
    playShift1();
    s().endDuty();
    playShift2();
    s().endDuty();
    expect(s().corrections).toEqual(['corr_dawn']);
    expect(s().degraded).toEqual([
      { from: 780, to: 900 },
      { from: 840, to: 960 },
      { from: 960, to: 1020 },
    ]);
    expect(inbox()).toEqual(expect.arrayContaining(['m_sys_corr', 'm_chief_05', 'm_senior_01']));
    expect(selectFrames(s()).frames.filter((f) => f.protected).length).toBe(3);
  });
});

describe('v4 — 근무 3: noise, the forbidding rule, the report, restoration', () => {
  function toShift3() {
    playShift1();
    s().openClosedReport('cr_c2217_prev');
    s().endDuty();
    playShift2();
    s().endDuty();
    s().ackRewrites();
    expect(s().startDuty('duty_3').status).toBe('started');
  }

  it('full correct playthrough of all three shifts ends in restoration', () => {
    toShift3();
    expect(selectDesk(s()).rules.find((r) => r.isNew)!.rule.id).toBe('rule_5');
    expect(selectReplay(s()).violation).toBe(true);
    playCase('case_c4410'); // 새 종류: 진짜 노이즈 → 자동 종결이 정답
    expect(inbox()).toContain('m_senior_03');
    playCase('case_a0601');
    playCase('case_c0951');
    playCase('case_a0602');
    expect(s().nextCase()).toMatchObject({ caseId: 'case_c2217_re' });
    const card = selectCaseCard(s(), 'case_c2217_re')!;
    expect(card.detection).toContain('기록 2건');
    expect(card.timelineId).toBeUndefined(); // 관측 생략(규정 5조)
    expect(card.header!.find((h) => h.key === 'when')!.value).toBe('####');
    expect(inbox()).toContain('m_me_redetect');
    expect(s().endDuty().status).toBe('blocked');

    s().ackRewrites();
    const filed = fileReport();
    expect(filed.status).toBe('filed');
    expect(filed.shiftId).toBe('shift_c2217');
    // 규정 5조 위반 경고장이 나오지만, 복원된 현실에서 '해당 없음'으로 다시 쓰인다
    expect(filed.warning).toMatchObject({ ruleId: 'rule_5', voided: true, voidText: '해당 없음 — 복원심의위원회 승인 건' });
    expect(s().duty.suspended).toBe(false);
    const kinds = new Set(s().recentRewrites.map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['assignment', 'case', 'message', 'observation', 'record', 'search', 'warning']);
    expect(selectCaseCard(s(), 'case_c2217_re')!.detection).toContain('연산군 4년 7월 11일');
    expect(selectAssignment(s(), 'as_c2217')!.header.find((h) => h.key === 'when')!.value).toBe('연산군 4년 7월 11일');
    expect(s().degraded).toEqual([]);
    expect(selectInbox(s()).find((i) => i.message.id === 'm_senior_04')!.message.text).toContain('그걸 모르는 사람이 어디 있어');
    const rw = selectRewrittenMessages(s());
    expect(rw.m_chief_drawer!.original).toBe('그 도장, 서랍에 다시 넣어 둬. 그거 쓰는 사람, 오래 못 버텨.');
    expect(rw.m_chief_drawer!.current).toContain('무오사화 7월 11일 좌표');
    expect(selectRecord(s(), 'rec_alt_kim_ilson')!.provenance).toBe('verified');
    expect(selectRecordLedger(s()).filter((x) => x.restored)).toHaveLength(5);
    expect(s().search('대내로 들여오라').hits[0]!.results.map((x) => x.id)).toContain('src_burn_order');
    // 관측기 로그는 그대로(부재의 증거)
    expect(inbox()).toContain('m_sys_obslog2');
    const closed = selectClosedReports(s());
    expect(closed.find((x) => x.id === 'cr_c2217_prev')!.note).toContain('해당 기사 없음');

    const end = s().endDuty();
    expect(end.status).toBe('ended');
    expect(end.report).toMatchObject({ processed: 5, goalMet: true, warnings: 0, voided: 1 });
    expect(end.report!.line).toBe('위원회 건이라 경고는 빠졌어. …다음엔 미리 말해.');
    expect(selectDesk(s()).episodeDone).toBe(true);
    // 예고: 내 이름의 관측 오류가 더 있다
    expect(inbox()).toContain('m_sys_teaser');
    expect(selectClosedReports(s()).map((x) => x.code)).toEqual(expect.arrayContaining(['#C-0408', '#C-3391']));
    s().openClosedReport('cr_c0408');
    expect(inbox().at(-1)).toBe('m_me_03');
    // 엔딩 뒤 기록 열람: 원문(검증)·변조·재구성 배지
    const ledger = selectCaseLedger(s());
    const a0419 = ledger.find((x) => x.id === 'case_a0419')!;
    expect(a0419.original.badge).toBe('검증');
    expect(a0419.distortion).toMatchObject({ from: '이극돈(李克墩)', to: '유자광(柳子光)', badge: '변조' });
    expect(a0419.lines[0]!.badge).toBe('재구성');
  });

  it('auto-closing the re-detected coordinate is allowed but the night does not end without the report', () => {
    toShift3();
    for (const id of ['case_c4410', 'case_a0601', 'case_c0951', 'case_a0602']) playCase(id);
    s().nextCase();
    expect(s().stampCase('auto_close')).toMatchObject({ status: 'stamped', correct: true });
    expect(s().duty.warnings.filter((w) => w.dutyId === 'duty_3')).toEqual([]);
    expect(inbox()).toEqual(expect.arrayContaining(['m_chief_s3_auto', 'm_me_forget']));
    const end = s().endDuty();
    expect(end).toMatchObject({ status: 'blocked', message: expect.stringContaining('보고서') });
    expect(fileReport().status).toBe('filed');
    expect(s().endDuty().status).toBe('ended');
  });

  it('reopening in shift 3 is a rule-5 violation (warnings), voided by restoration', () => {
    toShift3();
    const r = s().openReplay('rw_17');
    expect(r.status).toBe('opened');
    expect(r.warning).toMatchObject({ ruleId: 'rule_5' });
    s().endObservation();
    for (const id of ['case_c4410', 'case_a0601', 'case_c0951', 'case_a0602']) playCase(id);
    s().nextCase();
    fileReport();
    expect(s().duty.warnings.filter((w) => w.ruleId === 'rule_5').every((w) => w.voided)).toBe(true);
  });

  it('degraded spans block hearing and capturing; protected frames cannot be discarded', () => {
    toShift3();
    s().openReplay('rw_14');
    s().scrubObservation(850);
    expect(s().hearLine('b4')).toBe(false);
    expect(s().captureFrame(snap(900, ['r3'])).status).toBe('degraded');
    const order = s().frames.find((f) => f.clueIds.includes('cl_order'))!;
    expect(s().removeFrame(order.id).status).toBe('protected');
  });
});

describe('v4 — mistakes: warnings, suspension interview, still completes', () => {
  it('three warnings suspend observation; the interview recaps them and the shift continues', () => {
    s().startDuty('duty_1');
    // ① 확인 건에 서랍 도장 → 경고
    s().nextCase();
    observe('case_a0412');
    expect(s().stampCase('mismatch').warning!.ruleId).toBe('rule_3');
    // ② 변조 건을 확인 → 경고(그 건의 교육적 사유)
    s().nextCase();
    observe('case_a0419');
    const w2 = s().stampCase('confirm').warning!;
    expect(w2.reason).toContain('유자광');
    // ③ 함정 건을 정정 → 세 번째 경고 → 관측 권한 정지
    s().nextCase();
    observe('case_a0423');
    s().inspect(...notationPair(caseOf('case_a0423')));
    const r3 = s().stampCase('correct');
    expect(r3.suspended).toBe(true);
    expect(s().duty.suspended).toBe(true);
    expect(s().nextCase().status).toBe('suspended');
    expect(s().startObservation()).toBe(false);
    const iv = selectInterview(s())!;
    expect(iv.active).toBe(true);
    expect(iv.recap.map((w) => w.reason)).toEqual(s().duty.warnings.map((w) => w.reason));
    for (const w of ['무오', '1498', '김일손']) expect(JSON.stringify(iv)).not.toContain(w);
    expect(s().finishInterview('iv_sorry')).toBe(true);
    expect(selectInterview(s())!.closing.map((l) => l.text)).toContain('그래. 그럼 됐어.');
    expect(s().duty.suspended).toBe(false);
    // 계속한다
    playCase('case_a0431');
    s().nextCase();
    s().startObservation();
    s().scrubObservation(1030);
    expect(s().stampCase('auto_close').status).toBe('stamped');
    const end = s().endDuty();
    expect(end.report).toMatchObject({ processed: 5, correct: 2, warnings: 3, interviews: 1 });
    // 근무 2·3 도 끝까지 간다
    playShift2();
    s().endDuty();
    s().startDuty('duty_3');
    for (const id of ['case_c4410', 'case_a0601', 'case_c0951', 'case_a0602']) playCase(id);
    s().nextCase();
    expect(fileReport().status).toBe('filed');
    expect(s().endDuty().status).toBe('ended');
  });

  it('정정 on a yellow pair of a distorted card is a judgment error with an honest reason', () => {
    s().startDuty('duty_1');
    for (const id of ['case_a0412', 'case_a0419', 'case_a0423']) playCase(id);
    s().nextCase();
    observe('case_a0431');
    expect(s().inspect('a0431d_day', 'a0431o_day').relation).toBe('notation');
    const r = s().stampCase('correct');
    expect(r).toMatchObject({ correct: false });
    expect(r.warning!.reason).toContain('정말 다른 곳은 따로');
  });

  it('inspecting needs the line to be heard; unrelated words give no thread', () => {
    s().startDuty('duty_1');
    s().nextCase();
    expect(s().inspect('a0412_place', 'a0412o_place').status).toBe('unavailable');
    observe('case_a0412');
    expect(s().inspect('a0412_osi', 'a0412o_died')).toMatchObject({ status: 'linked', relation: 'none' });
    expect(s().stats.inspects).toBe(1);
  });

  it('hint ladders arrive through the messenger only, never naming the word to fix', () => {
    s().startDuty('duty_1');
    playCase('case_a0412');
    s().nextCase();
    s().startObservation();
    s().scrubObservation(lineMinute('a0419_l1'));
    s().hearLine('a0419_l1');
    expect(s().tickIdle(45)!.id).toBe('h_inspect_1');
    const seg = recordSegments(caseOf('case_a0419')).find((x) => x.id === 'a0419_yi')!;
    for (const m of selectInbox(s(), content, 'chief')) for (const w of ['이극돈', '유자광', seg.text]) expect(m.message.text).not.toContain(w);
    s().updateSettings({ hintLevel: 'off' });
    expect(s().tickIdle(500)).toBeNull();
  });
});

describe('v4 — conditions & save', () => {
  it('duty counters drive conditions', () => {
    playShift1();
    const cs = conditionState(s());
    expect(checkState(cs, { cases: ['case_c2217'], closed: ['as_c2217'] })).toBe(true);
    expect(checkState(cs, { counters: [{ key: 'processed:duty_1', min: 5 }] })).toBe(true);
    expect(checkState(cs, { counters: [{ key: 'warnings:duty_1', max: 0 }] })).toBe(false);
  });

  it('saves, loads (v5) and autosaves', async () => {
    playShift1();
    await s().save('manual');
    const file = await loadGame('manual');
    expect(file!.version).toBe(5);
    const other = createGameStore(content);
    expect(await other.getState().load('manual')).toBe(true);
    expect(other.getState().duty.cases.case_c2217!.stamp).toBe('mismatch');
    expect(selectDesk(other.getState()).processed).toBe(5);
    vi.useFakeTimers();
    const off = enableAutosave(store, 100);
    s().setFlag('x');
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    off();
  });
});
