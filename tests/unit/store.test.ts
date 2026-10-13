import { clear } from 'idb-keyval';
import { createGameStore, enableAutosave, selectProgress } from '@/store/gameStore';
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

describe('gameStore', () => {
  it('collects and reveals evidence monotonically', () => {
    expect(s().collectEvidence('sample_ev_zither')).toBe(true);
    expect(s().collectEvidence('sample_ev_zither')).toBe(false);
    expect(s().revealEvidence('sample_ev_zither', 1)).toBe(true);
    expect(s().revealEvidence('sample_ev_zither', 0)).toBe(false);
    expect(s().revealEvidence('sample_ev_zither', 9)).toBe(false); // 최대 단계로 고정
    expect(s().evidence.sample_ev_zither).toBe(1);
    expect(s().revealEvidence('sample_ev_edict', 0)).toBe(false); // 미보유
    expect(s().collectEvidence('ghost')).toBe(false);
  });

  it('examine applies grants once and tracks examined objects', () => {
    const r = s().examine('sample_obj_zither')!;
    expect(r.lines).toEqual(['줄이 여섯 개인 악기다.']);
    expect(r.gained.map((g) => g.type)).toEqual(['evidence', 'collection']);
    expect(s().collection.sample_col_zither).toBe(1);
    expect(s().examine('sample_obj_zither')!.gained).toEqual([]);
    expect(s().examined).toEqual(['sample_obj_zither']);
    expect(s().examine('nope')).toBeNull();
  });

  it('examine respects requires flags', () => {
    expect(s().examine('sample_obj_desk')).toBeNull();
    s().setFlag('sample_flag_desk_open');
    expect(s().examine('sample_obj_desk')).not.toBeNull();
    expect(s().evidence.sample_ev_calendar).toBe(1);
    expect(s().flags.sample_desk_searched).toBe(true);
  });

  it('observe objects complete observations and their grants', () => {
    s().examine('sample_obj_board');
    expect(s().observations).toEqual(['sample_obs_courtyard']);
    expect(s().evidence.sample_ev_edict).toBe(0);
    expect(s().notebook.observed.map((n) => n.id)).toEqual(['sample_note_board']);
  });

  it('talk filters lines by flags', () => {
    expect(s().talk('sample_npc_scribe')!.lines.map((l) => l.id)).toEqual(['greet']);
    expect(s().notebook.question).toHaveLength(1);
    s().setFlag('sample_desk_searched');
    expect(s().talk('sample_npc_scribe')!.lines.map((l) => l.id)).toEqual(['greet', 'rumor']);
    expect(s().evidence.sample_ev_rumor).toBe(0);
  });

  it('submitDeduction applies rewards, records attempts and best verdict', () => {
    s().talk('sample_npc_scribe'); // 의문 '지금은 언제인가?' 등록
    s().examine('sample_obj_board'); // 게시문
    s().setFlag('sample_desk_searched');
    s().talk('sample_npc_scribe'); // 소문

    expect(s().submitDeduction(yearSub(1400, 1450, ['sample_ev_edict'])).verdict).toBe('wrong');
    expect(s().solved.sample_ded_year).toBeUndefined();

    expect(s().submitDeduction(yearSub(1498, 1501, ['sample_ev_edict', 'sample_ev_rumor'])).verdict).toBe('partial');
    expect(s().flags.sample_year_partial).toBe(true);
    expect(s().solved.sample_ded_year).toEqual({ best: 'partial', attempts: 2 });

    s().setFlag('sample_flag_desk_open');
    s().examine('sample_obj_desk');
    const r = s().submitDeduction(yearSub(1498, 1498, ['sample_ev_edict', 'sample_ev_calendar']));
    expect(r.verdict).toBe('confirmed');
    expect(s().lastResult).toBe(r);
    expect(s().solved.sample_ded_year).toEqual({ best: 'confirmed', attempts: 3 });
    expect(s().flags.sample_year_confirmed).toBe(true);
    expect(s().collection.sample_col_event).toBe(3);
    expect(s().notebook.verified.map((n) => n.id)).toEqual(['sample_note_year']);
    expect(s().notebook.question[0]!.resolved).toBe(true);

    // 이후 낮은 판정은 기록을 깎지 않는다
    s().submitDeduction(yearSub(1498, 1501, ['sample_ev_edict', 'sample_ev_rumor']));
    expect(s().solved.sample_ded_year!.best).toBe('confirmed');
    expect(s().attempts.sample_ded_year).toBe(4);
  });

  it('person deduction reveals the unknown card', () => {
    s().talk('sample_npc_scribe');
    s().examine('sample_obj_zither');
    s().revealEvidence('sample_ev_zither', 1);
    const r = s().submitDeduction({
      kind: 'person',
      deductionId: 'sample_ded_person',
      candidateId: 'sample_person_scribe',
      evidenceIds: ['sample_ev_unknown_official', 'sample_ev_zither'],
    });
    expect(r.verdict).toBe('confirmed');
    expect(s().evidence.sample_ev_unknown_official).toBe(1);
    expect(s().collection.sample_col_person).toBe(2);
  });

  it('unknown deductions are rejected without side effects', () => {
    const r = s().submitDeduction({ kind: 'event', deductionId: 'nope', statementId: 'x', evidenceIds: [] });
    expect(r.feedback[0]!.code).toBe('unknown_deduction');
    expect(s().attempts).toEqual({});
  });

  it('collection, notebook, ui and settings actions', () => {
    expect(s().advanceCollection('sample_col_place', 2)).toBe(true);
    expect(s().advanceCollection('sample_col_place', 1)).toBe(false);
    const id = s().addHypothesis('1490년대일 것이다', ['sample_ev_zither']);
    expect(s().notebook.hypothesis[0]).toMatchObject({ id, text: '1490년대일 것이다' });
    s().addNote({ id: 'q1', section: 'question', text: '누구?' });
    s().resolveQuestion('q1');
    expect(s().notebook.question[0]!.resolved).toBe(true);
    s().openModal('collection', 'sample_col_place');
    expect(s().ui.modal).toEqual({ kind: 'collection', id: 'sample_col_place' });
    s().closeModal();
    s().setPaused(true);
    expect(s().ui).toEqual({ modal: null, paused: true });
    s().updateSettings({ volume: 0.2 });
    expect(s().settings.volume).toBe(0.2);
    s().setScene('sample_scene_office');
    expect(s().currentScene).toBe('sample_scene_office');
  });

  it('selectProgress summarises state', () => {
    s().talk('sample_npc_scribe');
    s().examine('sample_obj_zither');
    s().examine('sample_obj_board');
    const p = selectProgress(s(), content);
    expect(p).toMatchObject({
      observations: { done: 1, total: 1 },
      deductions: { confirmed: 0, partial: 0, total: 3 },
      personsIdentified: 0,
      artifactsCollected: 1,
      sourcesVerified: 0,
      unresolvedQuestions: 1,
    });
    expect(p.archive).toBeCloseTo(3 / 25);
  });

  it('save → reset → load restores persisted state only', async () => {
    s().examine('sample_obj_zither');
    s().addHypothesis('가설');
    s().openModal('notebook');
    await s().save('manual');
    expect(s().lastSavedAt).not.toBeNull();
    const snapshot = { evidence: s().evidence, collection: s().collection, notebook: s().notebook };

    s().reset();
    expect(s().evidence).toEqual({});
    expect(await s().load('manual')).toBe(true);
    expect({ evidence: s().evidence, collection: s().collection, notebook: s().notebook }).toEqual(snapshot);
    expect(s().ui.modal).toBeNull();
    expect(await s().load('auto')).toBe(false);
  });

  it('autosave writes the auto slot after changes', async () => {
    const stop = enableAutosave(store, 5);
    s().collectEvidence('sample_ev_book');
    await vi.waitFor(async () => expect((await loadGame('auto'))?.data.evidence).toEqual({ sample_ev_book: 0 }));
    stop();
  });
});
