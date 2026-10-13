/**
 * 책상 동작(스토어 호출 + 연출 상태 + 촉각 피드백). 컴포넌트는 이 함수들만 부른다.
 * 정답은 어디에도 없다 — 판정은 전부 스토어(core/duty)가 데이터로 계산한 결과를 그대로 보여 준다.
 */
import type { CaseStamp, Id } from '@/core/types';
import {
  selectCaseCard,
  selectDesk,
  selectVerdictHistory,
  useGameStore,
  type CaseStampResult,
  type InspectResult,
  type ViewerSnapshot,
} from '@/store/gameStore';
import { fx } from './../lib/fx';
import { useUi } from '../uiStore';

/** 지금 책상에 보이는 건 id (올라와 있거나, 방금 도장을 찍은) */
export function shownCaseId(): Id | null {
  const g = useGameStore.getState();
  return g.duty.current ?? useUi.getState().shownCase;
}

/** 다음 건을 벨로 올린다 */
export function loadNext() {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  const r = g.nextCase();
  if (r.status === 'loaded' && r.caseId) {
    ui.setShownCase(r.caseId);
    ui.setFlipped(false);
    ui.setInspect(false);
    ui.clearCardMsg();
    ui.setObsExpanded(false);
    ui.setGhost(null);
    fx('queue_next');
  } else if (r.status === 'no_time' || r.status === 'suspended') {
    ui.say(r.message ?? '지금은 올릴 수 없다.');
    fx('stamp_miss');
  }
  return r;
}

const STAMP_FX = { confirm: 'stamp', correct: 'stamp_correct', mismatch: 'stamp_red', auto_close: 'stamp_auto', report: 'stamp' } as const;

/** 도장을 찍는다(길게 누르기가 끝났을 때). */
export function doStamp(kind: CaseStamp): CaseStampResult | null {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  const id = shownCaseId();
  if (!id || g.duty.current !== id) return null;
  const before = selectCaseCard(g, id);
  const r = g.stampCase(kind);
  if (r.status === 'not_ready') {
    fx('stamp_miss');
    ui.cardSay(r.message ?? '아직 찍을 수 없다.', 'warn');
    return r;
  }
  if (r.status !== 'stamped') return r;

  ui.setShownCase(id);
  ui.setInspect(false);
  ui.stampFresh(id);
  fx(STAMP_FX[kind]);
  ui.clearCardMsg();
  // 정정이 맞으면: 바뀌어 있던 낱말이 번지며 원문으로 돌아온다
  if (r.restored && before) {
    const alt = before.segments.concat(before.dateSegments).find((x) => x.altered);
    if (alt) ui.setGhost({ caseId: id, segId: alt.id, from: alt.shown });
  }
  // 소실·노이즈: 0.3초 뒤 시스템의 회색 도장이 덮인다
  if (r.autoClassification) window.setTimeout(() => fx('stamp_auto'), 300);
  // 판정 이력이 의미 있는 건(같은 좌표에 지난 도장이 있다)은 카드가 뒤집힌다
  const aId = before?.case.assignmentId;
  if (aId && kind !== 'correct' && kind !== 'confirm') {
    const hist = selectVerdictHistory(useGameStore.getState(), aId);
    if (hist.length >= 2) window.setTimeout(() => useUi.getState().setFlipped(true), 2300);
  }
  return r;
}

/** 검사: 짚은 기록 낱말과 관측 낱말을 잇는다. */
export function doInspect(recSeg: Id, obsSeg: Id): InspectResult {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  const r = g.inspect(recSeg, obsSeg);
  ui.select(null);
  if (r.status === 'linked') {
    ui.bornLink(`${recSeg}|${obsSeg}`);
    if (r.relation === 'differs') {
      fx('inspect_link');
      ui.cardSay('다르다', 'red');
    } else if (r.relation === 'notation') {
      fx('inspect_notation');
      ui.cardSay(r.message ?? '표기 차이 — 판단은 대조관', 'yellow');
    } else {
      fx('inspect_none');
      ui.cardSay('같은 것을 가리키지 않는다', 'info');
    }
  } else if (r.status === 'unavailable') {
    fx('stamp_miss');
    ui.cardSay(r.message ?? '아직 짚을 수 없다.', 'warn');
  } else if (r.status === 'suspended') {
    fx('stamp_miss');
  }
  return r;
}

/** 근무를 시작한다(로그인) */
export function startDuty(id: Id) {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  const r = g.startDuty(id);
  if (r.status !== 'started') return r;
  ui.resetDesk();
  ui.setBriefingOpen(true);
  const desk = selectDesk(useGameStore.getState());
  // 새 규정은 프린터가 한 장 뱉는다(근무 1 은 근무 명세만)
  const fresh = desk.rules.filter((x) => x.isNew && desk.shift && desk.shift.no > 1);
  if (fresh.length) {
    window.setTimeout(() => {
      useUi.getState().print();
      fx('printer');
      useUi.getState().readSlip(fresh.map((x) => `rule:${x.rule.id}`));
    }, 700);
  }
  return r;
}

/** 근무를 마친다 → 근무 보고(프린터) */
export function endDuty() {
  const g = useGameStore.getState();
  const ui = useUi.getState();
  const r = g.endDuty();
  if (r.status === 'ended' && r.report) {
    ui.setShiftReportFor(r.report.dutyId);
    ui.setFlipped(false);
    ui.setInspect(false);
    ui.print();
    fx('shift_end');
    window.setTimeout(() => fx('printer'), 150);
  } else if (r.status === 'blocked') {
    ui.say(r.message ?? '아직 끝낼 수 없다.');
    fx('stamp_miss');
  }
  return r;
}

/** 셔터(관측 창 오른쪽 아래). 책상 위 건이면 근거 프레임, 종결 건 재생이면 필름. */
export function doCapture(snap: ViewerSnapshot) {
  return useGameStore.getState().captureFrame(snap);
}
