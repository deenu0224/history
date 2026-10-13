import { clear } from 'idb-keyval';
import {
  createGameStore,
  enableAutosave,
  selectApps,
  selectInbox,
  selectMemos,
  selectProgress,
  selectRecord,
  selectTutorial,
  selectViewerFrame,
} from '@/store/gameStore';
import { loadGame } from '@/core/save';
import { sampleContent } from './fixtures';

const content = sampleContent();
let store = createGameStore(content);
const s = () => store.getState();

beforeEach(async () => {
  await clear();
  store = createGameStore(content);
});

const yearSub = (from: number, to: number, evidenceIds: string[]) =>
  ({ kind: 'year', deductionId: 'sample_ded_year', from, to, evidenceIds }) as const;

/** 관측을 시작하고 시각을 옮긴 뒤 핫스팟을 탭 */
const tapAt = (minute: number, id: string) => {
  s().scrubObservation(minute);
  return s().tapHotspot(id);
};

describe('gameStore — terminal', () => {
  it('delivers start messages on creation and their grants (terms)', () => {
    expect(s().inbox).toEqual(['sample_m1']);
    expect(s().terms).toEqual(['샘플 기록']);
    expect(selectInbox(s(), content).map((i) => i.read)).toEqual([false]);
    expect(s().readMessage('sample_m1')!.id).toBe('sample_m1');
    expect(s().read).toEqual(['sample_m1']);
    expect(s().readMessage('sample_m2')).toBeNull(); // 아직 도착 전
  });

  it('search: hits, sources, conditional grants, log, stats, unknown feedback', () => {
    const miss = s().search('없는 말');
    expect(miss.status).toBe('unknown');
    expect(miss.message).toContain('색인에 없는');
    expect(s().stats).toMatchObject({ searches: 1, unknownSearches: 1 });
    expect(s().search(' ').status).toBe('empty');
    expect(s().stats.searches).toBe(1); // 빈 검색은 세지 않는다

    const hit = s().search('「샘플  기록」');
    expect(hit.status).toBe('ok');
    expect(hit.hits.map((h) => h.entryId)).toEqual(['sample_se_record']);
    expect(hit.hits[0]!.linked).toEqual([]);
    expect(s().sources).toEqual(['sample_source_record']);
    expect(s().collection.sample_col_source).toBe(1);
    expect(s().searched).toEqual(['sample_se_record']);
    expect(s().inbox).toContain('sample_m2'); // 검색이 다음 메시지를 부른다
    expect(s().searchLog.map((l) => l.status)).toEqual(['unknown', 'ok']);

    s().setFlag('sample_desk_searched');
    const again = s().search('樣本');
    expect(again.hits[0]!.linked).toEqual(['서안의 문서와 같다.']);
    expect(s().flags.sample_record_linked).toBe(true);
    expect(again.message).toContain('이미 본 기록');
  });

  it('apps unlock by condition and openApp records first opens', () => {
    expect(selectApps(s(), content)).toEqual(['messenger', 'search', 'viewer', 'board']);
    expect(s().openApp('notebook')).toBe(false);
    expect(s().openApp('search')).toBe(true);
    expect(s().ui.app).toBe('search');
    expect(s().appsOpened).toEqual(['search']);
    s().setFlag('sample_desk_searched');
    expect(s().openApp('notebook', 'sample_source_record')).toBe(true);
    expect(s().ui.appTarget).toBe('sample_source_record');
    s().closeApp();
    expect(s().ui.app).toBeNull();
  });

  it('observation: start completes observation, scrub clamps, taps respect windows and flags', () => {
    expect(s().tapHotspot('hs_sample_npc_scribe')).toBeNull(); // 관측 전
    expect(s().startObservation('sample_tl')).toBe(true);
    expect(s().observations).toEqual(['sample_obs_courtyard']);
    expect(s().evidence.sample_ev_edict).toBe(0);
    expect(s().obsMinute.sample_tl).toBe(480);

    expect(s().scrubObservation(100)).toBe(480);
    expect(s().scrubObservation(9999)).toBe(900);
    expect(s().stats.scrubs).toBe(1); // 480 → 480 은 변화 없음

    const early = tapAt(500, 'hs_sample_obj_zither')!;
    expect(early.status).toBe('outside_window');
    expect(early.gained).toEqual([]);
    const ok = tapAt(650, 'hs_sample_obj_zither')!;
    expect(ok.status).toBe('available');
    expect(ok.gained.map((g) => g.type)).toEqual(['evidence', 'collection']);
    expect(s().lastTap).toBe(ok);

    expect(s().tapHotspot('hs_sample_obj_desk')).toBeNull(); // visibleWhen 미충족 → 숨김
    s().setFlag('sample_flag_desk_open');
    expect(s().tapHotspot('hs_sample_obj_desk')!.gained.length).toBeGreaterThan(0);
    expect(s().tapped).toEqual(['hs_sample_obj_zither', 'hs_sample_obj_desk']);
    expect(s().stats.taps).toBe(3);
  });

  it('npc taps hide the real name until identified', () => {
    s().startObservation('sample_tl');
    const r = s().tapHotspot('hs_sample_npc_scribe')!;
    expect(r.label).toBe('미확인 관료');
    expect(r.lines[0]!.speaker).toBe('미확인 관료');
    s().advanceCollection('sample_col_person', 2);
    expect(s().tapHotspot('hs_sample_npc_scribe')!.label).toBe('샘플 인물 갑');
  });

  it('viewer frame gives npc poses and hotspot status', () => {
    s().startObservation('sample_tl');
    s().scrubObservation(725);
    const f = selectViewerFrame(s(), content)!;
    expect(f.clock).toBe('12:05');
    const npc = f.npcs[0]!;
    expect(npc.pose.moving).toBe(true);
    expect(npc.pose.to).toEqual({ x: 9, y: 5 });
    expect(f.hotspots.find((h) => h.id === 'hs_sample_obj_desk')!.status).toBe('hidden');
  });

  it('phrases: no_link is free, registered applies grants once', () => {
    s().search('샘플 기록');
    expect(s().registerPhrase('sample_source_record', 'sample_ph_order').status).toBe('unavailable'); // 원문 대조 권한 전
    s().setFlag('source_access');
    const miss = s().registerPhrase('sample_source_record', 'sample_ph_order');
    expect(miss.status).toBe('no_link');
    expect(s().stats.phraseMisses).toBe(1);
    s().collectEvidence('sample_ev_order_record');
    const ok = s().registerPhrase('sample_source_record', 'sample_ph_order');
    expect(ok.status).toBe('registered');
    expect(s().flags.sample_phrase_ok).toBe(true);
    expect(s().registerPhrase('sample_source_record', 'sample_ph_order').status).toBe('already');
    expect(s().registerPhrase('nope', 'sample_ph_order').status).toBe('unavailable');
  });

  it('reply choices set mood flags once and can trigger a silent correction', () => {
    expect(s().chooseReply('sample_m2', 'yes')).toBe(false); // 아직 도착 전
    s().search('샘플 기록');
    expect(selectMemos(s(), content)[0]!.text).toBe('0.9');
    expect(s().chooseReply('sample_m2', 'yes')).toBe(true);
    expect(s().chooseReply('sample_m2', 'yes')).toBe(false);
    expect(s().corrections).toEqual(['sample_corr']);
    expect(s().flags.sample_corrected).toBe(true);
    expect(selectRecord(s(), 'sample_rec_meta', content)!.fields[0]!.value).toBe('0.5');
    expect(selectMemos(s(), content)[0]!.text).toBe('0.5');
    // 원본 데이터는 그대로(보정은 보기만 바꾼다)
    expect(content.records[0]!.fields[0]!.value).toBe('0.9');
  });

  it('exhibits require conditions and count once', () => {
    expect(s().inspectExhibit('sample_ex')).toBeNull();
    s().collectEvidence('sample_ev_zither');
    expect(s().inspectExhibit('sample_ex')!.gained).toHaveLength(1);
    expect(s().collection.sample_col_zither).toBe(3);
    s().inspectExhibit('sample_ex');
    expect(s().stats.exhibits).toBe(1);
  });

  it('tutorial: coach mark, hint escalation by idle and fails, completion', () => {
    let t = selectTutorial(s(), content)!;
    expect(t.step.id).toBe('sample_tut_search');
    expect(t).toMatchObject({ coach: true, tier: 0, hint: null });
    s().dismissCoach('sample_tut_search');
    expect(selectTutorial(s(), content)!.coach).toBe(false);

    expect(s().tickIdle(39)!.tier).toBe(0);
    expect(s().tickIdle(41)!.hint).toBe('넛지');
    expect(s().tickIdle(5)!.tier).toBe(1); // 방치 단계는 내려가지 않는다
    s().search('엉뚱한 말');
    s().search('또 엉뚱한 말');
    t = selectTutorial(s(), content)!;
    expect(t.tier).toBe(1); // 실패 2회 = 1단계, 방치 1단계와 같음
    s().search('ㅁ'); // too_short 도 실패
    s().search('아무 말');
    expect(selectTutorial(s(), content)!.hint).toBe('방향');
    expect(s().tickIdle(200)!.hint).toBe('근접');

    s().updateSettings({ hintLevel: 'off' });
    expect(selectTutorial(s(), content)).toMatchObject({ tier: 0, hint: null, coach: false });
    s().updateSettings({ hintLevel: 'normal' });

    s().search('샘플 기록');
    expect(s().tutorial.done).toEqual(['sample_tut_search']);
    expect(selectTutorial(s(), content)).toBeNull();
  });

  it('detailed hint level starts at tier 1 and escalates per fail', () => {
    s().updateSettings({ hintLevel: 'detailed' });
    expect(selectTutorial(s(), content)!.hint).toBe('넛지');
    s().search('없는 말');
    expect(selectTutorial(s(), content)!.tier).toBe(1);
    s().search('없는 말 둘');
    expect(selectTutorial(s(), content)!.tier).toBe(2);
    expect(s().tickIdle(21)!.tier).toBe(2);
  });
});

describe('gameStore — deduction, collection, save', () => {
  it('collects and reveals evidence monotonically', () => {
    expect(s().collectEvidence('sample_ev_zither')).toBe(true);
    expect(s().collectEvidence('sample_ev_zither')).toBe(false);
    expect(s().revealEvidence('sample_ev_zither', 1)).toBe(true);
    expect(s().revealEvidence('sample_ev_zither', 0)).toBe(false);
    expect(s().revealEvidence('sample_ev_zither', 9)).toBe(false);
    expect(s().evidence.sample_ev_zither).toBe(1);
    expect(s().revealEvidence('sample_ev_edict', 0)).toBe(false);
    expect(s().collectEvidence('ghost')).toBe(false);
  });

  it('submitDeduction applies rewards, records attempts and best verdict', () => {
    s().startObservation('sample_tl'); // 게시문
    tapAt(480, 'hs_sample_npc_scribe'); // 의문 등록
    s().setFlag('sample_flag_desk_open');
    s().tapHotspot('hs_sample_obj_desk'); // 책력 + sample_desk_searched
    s().tapHotspot('hs_sample_npc_scribe'); // 소문

    expect(s().submitDeduction(yearSub(1400, 1450, ['sample_ev_edict'])).verdict).toBe('wrong');
    expect(s().stats.deductionAttempts).toBe(1);
    expect(s().submitDeduction(yearSub(1498, 1501, ['sample_ev_edict', 'sample_ev_rumor'])).verdict).toBe('partial');
    expect(s().flags.sample_year_partial).toBe(true);
    const r = s().submitDeduction(yearSub(1498, 1498, ['sample_ev_edict', 'sample_ev_calendar']));
    expect(r.verdict).toBe('confirmed');
    expect(s().lastResult).toBe(r);
    expect(s().solved.sample_ded_year).toEqual({ best: 'confirmed', attempts: 3 });
    expect(s().collection.sample_col_event).toBe(3);
    expect(s().notebook.question[0]!.resolved).toBe(true);
    s().submitDeduction(yearSub(1498, 1501, ['sample_ev_edict', 'sample_ev_rumor']));
    expect(s().solved.sample_ded_year!.best).toBe('confirmed');
  });

  it('unknown deductions are rejected without side effects', () => {
    const r = s().submitDeduction({ kind: 'event', deductionId: 'nope', statementId: 'x', evidenceIds: [] });
    expect(r.feedback[0]!.code).toBe('unknown_deduction');
    expect(s().attempts).toEqual({});
  });

  it('notebook, modal and settings actions', () => {
    const id = s().addHypothesis('1490년대일 것이다', ['sample_ev_zither']);
    expect(s().notebook.hypothesis[0]).toMatchObject({ id, text: '1490년대일 것이다' });
    s().addNote({ id: 'q1', section: 'question', text: '누구?' });
    s().resolveQuestion('q1');
    expect(s().notebook.question[0]!.resolved).toBe(true);
    s().openModal('help', 'sample_help');
    expect(s().ui.modal).toEqual({ kind: 'help', id: 'sample_help' });
    s().closeModal();
    s().updateSettings({ volume: 0.2, haptics: false });
    expect(s().settings).toMatchObject({ volume: 0.2, haptics: false, hintLevel: 'normal' });
  });

  it('selectProgress summarises state', () => {
    s().startObservation('sample_tl');
    tapAt(480, 'hs_sample_npc_scribe');
    tapAt(650, 'hs_sample_obj_zither');
    const p = selectProgress(s(), content);
    expect(p).toMatchObject({
      observations: { done: 1, total: 1 },
      deductions: { confirmed: 0, partial: 0, total: 3 },
      artifactsCollected: 1,
      unresolvedQuestions: 1,
    });
  });

  it('save → reset → load restores persisted state only', async () => {
    s().startObservation('sample_tl');
    tapAt(650, 'hs_sample_obj_zither');
    s().search('샘플 기록');
    s().addHypothesis('가설');
    s().openApp('search');
    await s().save('manual');
    expect(s().lastSavedAt).not.toBeNull();
    const snapshot = { evidence: s().evidence, searched: s().searched, inbox: s().inbox, obsMinute: s().obsMinute };

    s().reset();
    expect(s().evidence).toEqual({});
    expect(s().inbox).toEqual(['sample_m1']); // 새 게임도 첫 메시지는 와 있다
    expect(await s().load('manual')).toBe(true);
    expect({ evidence: s().evidence, searched: s().searched, inbox: s().inbox, obsMinute: s().obsMinute }).toEqual(snapshot);
    expect(s().ui).toMatchObject({ app: null, observation: null, modal: null });
    expect(await s().load('auto')).toBe(false);
  });

  it('autosave writes the auto slot after changes', async () => {
    const stop = enableAutosave(store, 5);
    s().collectEvidence('sample_ev_book');
    await vi.waitFor(async () => expect((await loadGame('auto'))?.data.evidence).toEqual({ sample_ev_book: 0 }));
    stop();
  });
});
