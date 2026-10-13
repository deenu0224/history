import { clear } from 'idb-keyval';
import { loadGame } from '@/core/save';
import { checkState } from '@/core/terminal';
import {
  conditionState,
  createGameStore,
  enableAutosave,
  selectApps,
  selectAssignment,
  selectClosedReports,
  selectFrames,
  selectInbox,
  selectRecord,
  selectRecordLedger,
  selectReport,
  selectRewrittenMessages,
  type ViewerSnapshot,
} from '@/store/gameStore';
import { content } from '@/data';

let store = createGameStore(content);
const s = () => store.getState();

beforeEach(async () => {
  await clear();
  store = createGameStore(content);
});

const RED = 'hs_npc_red_official';
const snap = (minute: number, heard: string[], visible: string[] = [], zoom = 2): ViewerSnapshot => ({
  minute,
  centerTile: { x: 19, y: 8 },
  zoom,
  visibleHotspotIds: visible,
  heardLineIds: heard,
  thumbDataUrl: '',
});
/** 시각을 옮기고, 들리는 대사를 뷰어처럼 알리고, 찍는다 */
const shoot = (minute: number, heard: string[], visible: string[] = []) => {
  s().scrubObservation(minute);
  for (const l of heard) expect(s().hearLine(l)).toBe(true);
  return s().captureFrame(snap(minute, heard, visible));
};
const frameWith = (clue: string) => s().frames.find((f) => f.clueIds.includes(clue))!;
const inbox = () => s().inbox;

/** 첫 10분(NARRATIVE_FIRST10): 배정 → ①~④ → 자동 종결 → DB → 1년 전 보고서 */
function playFirstTen() {
  s().openAssignment('as_c2217');
  expect(s().openApp('viewer')).toBe(true);
  expect(s().startObservation()).toBe(true);
  s().reportView(snap(480, [], ['hs_obs_store_sacho'], 2));
  expect(s().stampChecklist('ck_place', 'match').status).toBe('stamped');
  shoot(540, ['r2', 'c1', 'c2'], [RED, 'hs_npc_clerk']);
  expect(s().stampChecklist('ck_person', 'match').status).toBe('stamped');
  shoot(730, ['y3']);
  shoot(850, ['m2']);
  shoot(850, ['b2', 'b3']);
  expect(s().stampChecklist('ck_time', 'mismatch').status).toBe('stamped');
  expect(s().stampChecklist('ck_verdict', 'mismatch').status).toBe('closed');
  s().search('대내로 들여오라');
  s().search('김일손');
  s().openRecord('rec_alt_kim_ilson');
  expect(s().openClosedReport('cr_c2217_prev')).toBe(true);
}

describe('v3 — first ten minutes', () => {
  it('boots into 업무 + 메신저 with the assignment and 오 실장', () => {
    expect(selectApps(s())).toEqual(['work', 'messenger']);
    expect(inbox()).toEqual(['m_sys_login', 'm_sys_assign', 'm_chief_01']);
    const a = selectAssignment(s(), 'as_c2217')!;
    expect(a.header.map((h) => h.value)).toEqual(['3건', '####', '미확인(참조: 실록청)']);
    expect(a.assignment.code).toBe('#C-2217');
    expect(s().openApp('viewer')).toBe(false);
    expect(s().openApp('db')).toBe(false);
    expect(s().search('김일손').status).toBe('locked');
  });

  it('① 장소 대조: needs a zoomed look; the wrong stamp is free', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    expect(s().stampChecklist('ck_place', 'match').status).toBe('not_ready');
    s().reportView(snap(480, [], ['hs_obs_store_sacho'], 1));
    expect(s().stampChecklist('ck_place', 'match').status).toBe('not_ready');
    s().reportView(snap(480, [], ['hs_obs_store_sacho'], 1.6));
    expect(s().stampChecklist('ck_place', 'mismatch').status).toBe('wrong');
    expect(s().stampChecklist('ck_place', 'match').status).toBe('stamped');
    expect(s().stampChecklist('ck_place', 'match').status).toBe('already');
  });

  it('② 엿듣기 + 캡처: a frame must hold the 당상 and his voice', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    s().scrubObservation(500);
    expect(s().hearLine('r2')).toBe(false); // 08:40 전
    s().scrubObservation(530);
    expect(s().hearLine('r2')).toBe(true);
    expect(s().hearLine('m2')).toBe(false); // 아직 오지 않은 전교
    // 들리지 않는 시각의 대사는 프레임에 들어가지 않는다
    const fake = s().captureFrame(snap(530, ['m2'], [RED]));
    expect(fake.frame!.heardLineIds).toEqual([]);
    expect(s().stampChecklist('ck_person', 'match').status).toBe('not_ready');
    const real = s().captureFrame(snap(530, ['r2'], [RED]));
    expect(real.newClues).toEqual(['cl_dangsang']);
    expect(s().stampChecklist('ck_person', 'match').status).toBe('stamped');
    expect(s().terms).toEqual([]); // r2 는 칩이 없다
  });

  it('③ 시각 대조 needs the 14:00 전교; ④ 불일치 needs a frame; auto-dismissal follows', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    s().reportView(snap(480, [], ['hs_obs_hall_manuscript'], 2));
    s().stampChecklist('ck_place', 'match');
    shoot(540, ['r2'], [RED]);
    s().stampChecklist('ck_person', 'match');
    s().scrubObservation(660);
    const nr = s().stampChecklist('ck_time', 'mismatch');
    expect(nr.status).toBe('not_ready');
    expect(nr.message).toContain('확인한 시간대');
    s().scrubObservation(850);
    s().hearLine('m2');
    expect(s().terms).toEqual(expect.arrayContaining(['대내로 들여오라', '김일손']));
    expect(s().stampChecklist('ck_time', 'match').status).toBe('wrong');
    expect(s().stampChecklist('ck_time', 'mismatch').status).toBe('stamped');
    const v = s().stampChecklist('ck_verdict', 'mismatch');
    expect(v).toMatchObject({ status: 'not_ready', message: '불일치 판정에는 근거 프레임이 필요하다.' });
    s().captureFrame(snap(850, ['m2']));
    const closed = s().stampChecklist('ck_verdict', 'mismatch', '14시 전교');
    expect(closed).toEqual({ status: 'closed', autoClassification: '자동 분류: 관측 오류(장비 노이즈) · 종결' });
    expect(selectAssignment(s(), 'as_c2217')!.closure).toMatchObject({ verdict: 'mismatch', shownLabel: '불일치', note: '14시 전교' });
    expect(inbox()).toEqual(expect.arrayContaining(['m_sys_closed', 'm_chief_02', 'm_chief_03', 'm_sys_db']));
    expect(inbox()).not.toContain('m_chief_02n');
    expect(selectApps(s())).toContain('db');
  });

  it('choosing 일치(노이즈) also closes — same road, different words', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    s().reportView(snap(480, [], ['hs_obs_store_sacho'], 2));
    s().stampChecklist('ck_place', 'match');
    shoot(540, ['r2'], [RED]);
    s().stampChecklist('ck_person', 'match');
    s().scrubObservation(850);
    s().hearLine('m2');
    s().stampChecklist('ck_time', 'mismatch');
    expect(s().stampChecklist('ck_verdict', 'match').status).toBe('closed');
    expect(inbox()).toContain('m_chief_02n');
  });

  it('DB: the heard order has no article; 김일손 has no cause; the year-old report is mine', () => {
    playFirstTen();
    const order = s().lastSearch;
    expect(s().search('대내로 들여오라')).toMatchObject({ status: 'no_article', message: '해당 기사 없음.' });
    void order;
    const r = selectRecord(s(), 'rec_alt_kim_ilson')!;
    const f = Object.fromEntries(r.fields.map((x) => [x.label, x.value]));
    expect(f).toMatchObject({ 사인: '기록 없음', '같은 달 사망': '권오복, 권경유 (사인 기록 없음)' });
    expect(JSON.stringify(r)).not.toContain('졸');
    const list = selectClosedReports(s());
    expect(list.map((x) => x.id)).toEqual(['as_c2217', 'cr_c2217_prev']);
    expect(list[1]).toMatchObject({ code: '#C-2217', when: '1년 전', officer: '대조관 07', classification: '관측 오류 · 종결' });
    expect(list[1]!.note).toContain('같은 달 사망한 세 사람');
    expect(inbox()).toContain('m_chief_04');
    expect(selectInbox(s()).at(-1)!.message.text).toBe('아직 있어? 내일 아침 6시에 정합성 보정 돌아. 그 전에 퇴근해.');
    expect(selectFrames(s()).left).toBe(2); // 필름 두 장 남음
    expect(s().corrections).toEqual([]); // 아직 보정 전
  });
});

describe('v3 — after ten minutes: correction, report, stamp, restoration', () => {
  it('full tap-only playthrough', () => {
    playFirstTen();
    // 남은 두 장: 13시대 서리 귓속말(+붉은 관복), 16시 「살아 있소」
    shoot(800, ['c3'], [RED, 'hs_npc_clerk']);
    expect(s().corrections).toEqual([]);
    shoot(1000, ['b5'], ['hs_npc_blue_official']);
    // ── 새벽 정합성 보정 ──
    expect(s().corrections).toEqual(['corr_dawn']);
    const cl = selectAssignment(s(), 'as_c2217')!.closure!;
    expect(cl).toMatchObject({ verdict: 'mismatch', shownVerdict: 'match', note: '' });
    expect(s().recentRewrites.map((r) => [r.kind, r.tone])).toEqual([['closure', 'erase']]);
    expect(s().degraded).toEqual([
      { from: 780, to: 900 },
      { from: 840, to: 960 },
      { from: 960, to: 1020 },
    ]);
    expect(inbox()).toEqual(expect.arrayContaining(['m_sys_corr', 'm_chief_05', 'm_senior_03']));
    // 프레임은 남는다. 썩은 구간의 유일한 핵심 프레임은 버릴 수 없다
    expect(s().frames).toHaveLength(6);
    expect(s().captureFrame(snap(500, [])).status).toBe('full');
    expect(s().removeFrame(frameWith('cl_order').id).status).toBe('protected');
    expect(selectFrames(s()).frames.filter((f) => f.protected).length).toBe(3);
    s().scrubObservation(850);
    expect(s().hearLine('b4')).toBe(false); // 훼손 구간에선 들리지 않는다
    expect(s().removeFrame(s().frames[0]!.id).status).toBe('removed');
    expect(s().captureFrame(snap(900, ['r3'])).status).toBe('degraded');

    // ── 보고서 ──
    expect(selectReport(s())!.unlocked).toBe(true);
    s().search('이극돈');
    s().openRecord('rec_alt_yi_geukdon');
    s().search('실록청');
    s().openRecord('rec_seongjong_sillok');
    s().search('어세겸');
    s().openRecord('rec_eo_segyeom');
    const order = { kind: 'frame' as const, id: frameWith('cl_order').id };
    const veteran = { kind: 'frame' as const, id: frameWith('cl_veteran').id };
    const alive = { kind: 'frame' as const, id: frameWith('cl_alive').id };
    const objection = { kind: 'frame' as const, id: frameWith('cl_objection').id };
    const rec = (id: string) => ({ kind: 'record' as const, id });

    // 틀린 시도(무료, 칸별 피드백, 정답 없음)
    s().attach('when', rec('rec_seongjong_sillok'));
    s().setYear(1495, 1499);
    s().attach('who', rec('rec_eo_segyeom'));
    s().attach('who', veteran);
    s().attach('what', objection);
    s().attach('result', rec('rec_alt_kim_ilson'));
    let r = s().submitReport()!;
    expect(r.complete).toBe(false);
    expect(r.blanks.when.verdict).toBe('partial');
    expect(r.blanks.who.verdict).toBe('wrong');
    expect(r.blanks.what.verdict).toBe('undetermined');
    expect(r.blanks.what.feedback[0]!.message).toBe('그 반대는 무엇에 대한 것이었나?');
    expect(r.blanks.result.feedback[0]!.message).toContain('그날의 일과 이어진다는 근거');
    const said = JSON.stringify(r);
    for (const w of ['1498', '이극돈', '무오']) expect(said).not.toContain(w);
    expect(s().stampReport().status).toBe('not_ready');

    // 언제: 살아 있소 + 사망 기록 — 전교가 보고서 어디에도 없으면 이름이 없다
    s().detach('when', rec('rec_seongjong_sillok'));
    s().attach('when', alive);
    s().attach('when', rec('rec_alt_kim_ilson'));
    s().setYear(1498, 1498);
    s().detach('what', objection);
    r = s().submitReport()!;
    expect(r.blanks.when.verdict).not.toBe('confirmed');
    expect(r.blanks.when.feedback.map((f) => f.message)).toContain('살아 있다는 사관이 누구인지, 이 보고서 어디에도 이름이 없다.');
    expect(selectReport(s())!.impliedYears).toEqual({ from: undefined, to: undefined });

    // 고친다
    s().attach('what', order);
    expect(s().attach('when', order)).toBe('full'); // 칸당 2개
    s().detach('who', rec('rec_eo_segyeom'));
    s().attach('who', rec('rec_alt_kim_ilson'));
    r = s().submitReport()!;
    expect(r.blanks.who.verdict).toBe('wrong'); // 관직이 맞지 않는다(모순)
    s().detach('who', rec('rec_alt_kim_ilson'));
    s().attach('who', rec('rec_alt_yi_geukdon'));
    s().attach('result', order);
    r = s().submitReport()!;
    expect(Object.values(r.blanks).map((b) => b.verdict)).toEqual(['confirmed', 'confirmed', 'confirmed', 'confirmed']);
    expect(selectReport(s())!.impliedYears).toEqual({ from: 1498, to: 1498 });
    s().ackRewrites();

    // ── 도장 → 복원 ──
    const filed = s().stampReport();
    expect(filed.status).toBe('filed');
    expect(filed.shiftId).toBe('shift_c2217');
    expect(s().stampReport().status).toBe('already');
    expect(selectAssignment(s(), 'as_c2217')!.header.find((h) => h.key === 'when')!.value).toBe('연산군 4년 7월 11일');
    const kinds = new Set(s().recentRewrites.map((x) => x.kind));
    expect([...kinds].sort()).toEqual(['assignment', 'closed', 'closure', 'message', 'record', 'search']);
    expect(s().recentRewrites.every((x) => x.tone === 'restore')).toBe(true);
    // 나만 기억한다: 메시지는 지금 현실로, 원래 본문은 플레이어 쪽 기록에만
    const rw = selectRewrittenMessages(s());
    expect(rw.m_chief_02!.original).toBe('07, 그거 자동 종결됐더라. 자주 있어. 장비 문제야.');
    expect(selectInbox(s()).find((i) => i.message.id === 'm_chief_02')!.message.text).toContain('무오사화 7월 11일 좌표');
    expect(selectInbox(s()).find((i) => i.message.id === 'm_senior_04')!.message.text).toContain('그걸 모르는 사람이 어디 있어');
    // 기록이 돌아왔다(verified + 출처)
    const kim = selectRecord(s(), 'rec_alt_kim_ilson')!;
    expect(kim.provenance).toBe('verified');
    expect(kim.fields.find((x) => x.key === 'cause')!.value).toContain('능지처사');
    expect(selectRecordLedger(s()).filter((x) => x.restored).map((x) => x.id).sort()).toEqual(
      ['rec_alt_kim_ilson', 'rec_alt_kim_jongjik', 'rec_alt_kwon_gyeongyu', 'rec_alt_kwon_obok', 'rec_alt_yi_geukdon'].sort(),
    );
    const again = s().search('대내로 들여오라');
    expect(again.status).toBe('ok');
    expect(again.hits[0]!.results.map((x) => x.id)).toEqual(['src_sacho_order', 'src_house_search']);
    // 종결함: 이번 건·작년 건이 '정상'으로, 그리고 내 이름의 관측 오류가 더 있다
    const list = selectClosedReports(s());
    expect(list[0]!.classification).toBe('정상 종결 · 기사 대조 일치');
    expect(list[1]!.classification).toBe('정상 종결');
    expect(list.slice(2).map((x) => [x.code, x.classification])).toEqual([
      ['#C-0408', '관측 오류 · 종결'],
      ['#C-3391', '관측 오류 · 종결'],
    ]);
    s().openClosedReport('cr_c0408');
    expect(inbox().at(-1)).toBe('m_me_03');
  });

  it('correction never strands the player: early fallback degrades only what is already captured', () => {
    playFirstTen();
    // 핵심 프레임 없이 힌트 사다리(hl_frames)를 끝까지 받는다
    expect(s().tickIdle(50)?.id).toBe('h_frames_1');
    expect(s().tickIdle(95)?.id).toBe('h_frames_2');
    expect(s().tickIdle(140)?.id).toBe('h_frames_3');
    expect(s().corrections).toEqual(['corr_dawn']);
    expect(s().degraded).toEqual([{ from: 840, to: 960 }]); // 전교만 이미 찍혀 있었다
    // 16시와 13시는 여전히 들리고 찍힌다
    s().scrubObservation(1000);
    expect(s().hearLine('b5')).toBe(true);
    expect(s().captureFrame(snap(1000, ['b5'])).status).toBe('captured');
    s().scrubObservation(850);
    expect(s().hearLine('c3')).toBe(false); // 14시 이후는 훼손(전교 구간)
    s().scrubObservation(800);
    expect(s().hearLine('c3')).toBe(true); // 13시대는 아직 멀쩡하다
  });
});

describe('v3 — hints only via messenger', () => {
  it('silence first, then one rung at a time; off = none', () => {
    s().openAssignment('as_c2217');
    s().openApp('viewer');
    expect(s().tickIdle(10)).toBeNull();
    expect(s().tickIdle(31)!.id).toBe('h_look_1');
    expect(s().tickIdle(31)).toBeNull();
    expect(s().tickIdle(61)!.id).toBe('h_look_2');
    expect(selectInbox(s(), content, 'chief').map((i) => i.message.id)).toContain('h_look_2');
    s().updateSettings({ hintLevel: 'off' });
    expect(s().tickIdle(500)).toBeNull();
  });

  it('failures climb the ladder (stamp misses on ②)', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    s().reportView(snap(480, [], ['hs_obs_store_sacho'], 2));
    s().stampChecklist('ck_place', 'match');
    s().stampChecklist('ck_person', 'match');
    s().stampChecklist('ck_person', 'match');
    expect(inbox()).toContain('h_listen_1');
  });
});

describe('v3 — frames', () => {
  it('max 6, replace, remove drops report refs', () => {
    s().openAssignment('as_c2217');
    s().startObservation();
    for (let i = 0; i < 6; i++) expect(s().captureFrame(snap(480 + i, [])).status).toBe('captured');
    expect(s().captureFrame(snap(490, [])).status).toBe('full');
    s().scrubObservation(540);
    s().hearLine('r2');
    const rep = s().replaceFrame(2, snap(540, ['r2'], [RED]));
    expect(rep.status).toBe('replaced');
    expect(rep.newClues).toEqual(['cl_dangsang']);
    expect(s().frames[2]!.seq).toBe(7);
    expect(checkState(conditionState(s()), { clues: ['cl_dangsang'] })).toBe(true);
    expect(s().removeFrame(s().frames[2]!.id).status).toBe('removed');
    expect(checkState(conditionState(s()), { clues: ['cl_dangsang'] })).toBe(false);
    expect(selectFrames(s()).left).toBe(1);
  });
});

describe('v3 — save', () => {
  it('saves, loads (v4) and autosaves', async () => {
    playFirstTen();
    await s().save('manual');
    const file = await loadGame('manual');
    expect(file!.version).toBe(4);
    const other = createGameStore(content);
    expect(await other.getState().load('manual')).toBe(true);
    expect(other.getState().frames).toHaveLength(4);
    expect(other.getState().closures.as_c2217!.verdict).toBe('mismatch');
    vi.useFakeTimers();
    const off = enableAutosave(store, 100);
    s().setFlag('x');
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    off();
  });
});
