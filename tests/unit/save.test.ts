import { clear, set } from 'idb-keyval';
import { deleteSave, loadGame, migrate, peekSave, SAVE_SCHEMA, SAVE_VERSION, saveGame, SaveError, slotKey } from '@/core/save';
import { initialPersisted } from '@/store/gameStore';

beforeEach(() => clear());

describe('save/load', () => {
  it('round-trips a save through IndexedDB', async () => {
    const data = initialPersisted();
    data.flags.met = true;
    data.evidence.e1 = 2;
    data.collection.c1 = 3;
    data.notebook.question.push({ id: 'q', section: 'question', text: '언제?', seq: 0 });
    await saveGame('manual', data, new Date('2026-01-01T00:00:00Z'));
    const file = await loadGame('manual');
    expect(file).toMatchObject({ schema: SAVE_SCHEMA, version: SAVE_VERSION, slot: 'manual', savedAt: '2026-01-01T00:00:00.000Z' });
    expect(file!.data).toEqual(data);
    expect(await peekSave('manual')).toEqual({ savedAt: '2026-01-01T00:00:00.000Z', version: SAVE_VERSION });
  });

  it('keeps slots separate and returns null for empty slots', async () => {
    await saveGame('auto', initialPersisted());
    expect(await loadGame('manual')).toBeNull();
    expect(await loadGame('auto')).not.toBeNull();
    await deleteSave('auto');
    expect(await loadGame('auto')).toBeNull();
  });

  it('rejects corrupt or future saves', async () => {
    await set(slotKey('manual'), { hello: 1 });
    await expect(loadGame('manual')).rejects.toBeInstanceOf(SaveError);
    await set(slotKey('manual'), { schema: SAVE_SCHEMA, version: SAVE_VERSION + 1, data: {} });
    await expect(loadGame('manual')).rejects.toThrow('더 새로운');
    expect(() => migrate(null)).toThrow(SaveError);
  });

  it('migrates a v1 (walking) save through v2 (terminal) to v3 (reality shifts)', () => {
    const v1 = {
      schema: SAVE_SCHEMA,
      version: 1,
      savedAt: 'x',
      slot: 'manual',
      data: {
        flags: { obs001_entered: true },
        evidence: { ev_myoho: 0 },
        collection: {},
        notebook: { observed: [], testimony: [], verified: [], hypothesis: [], question: [] },
        solved: {},
        attempts: { ded_year_001: 2 },
        observations: ['obs_001'],
        examined: ['obs_store_sacho'],
        currentScene: 'obs001',
        settings: { textSpeed: 1, volume: 0.5, showInteractHints: true, showProvenance: false },
      },
    };
    const out = migrate(v1);
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.data).not.toHaveProperty('currentScene');
    expect(out.data).not.toHaveProperty('examined');
    expect(out.data).toMatchObject({
      flags: { obs001_entered: true },
      evidence: { ev_myoho: 0 },
      tapped: ['hs_obs_store_sacho'],
      terms: [],
      inbox: [],
      stats: { deductionAttempts: 2, searches: 0, links: 0 },
      shifts: [],
      rewriteLog: [],
      recorded: [],
      tutorial: { done: [], dismissed: [], fails: {}, idleTier: {} },
      settings: { volume: 0.5, hintLevel: 'normal', haptics: true, reduceFlicker: false },
    });
    expect(Object.keys(out.data).sort()).toEqual(Object.keys(initialPersisted()).sort());
  });

  it('v2 → v3 maps merged apps (reader → search, archive → notebook)', () => {
    const v2 = { schema: SAVE_SCHEMA, version: 2, savedAt: 'x', slot: 'auto', data: { appsOpened: ['messenger', 'reader', 'archive', 'notebook'], stats: { searches: 3 } } };
    const out = migrate(v2);
    expect(out.data.appsOpened).toEqual(['messenger', 'search', 'notebook']);
    expect(out.data.stats).toMatchObject({ searches: 3, links: 0, linkMisses: 0 });
    expect(out.data.shifts).toEqual([]);
  });

  it('applies migrations step by step', () => {
    const table = {
      1: (d: Record<string, unknown>) => ({ ...d, renamed: d.old, old: undefined }),
      2: (d: Record<string, unknown>) => ({ ...d, added: true }),
    };
    const out = migrate({ schema: SAVE_SCHEMA, version: 1, savedAt: 'x', slot: 'auto', data: { old: 5 } }, table, 3);
    expect(out.version).toBe(3);
    expect(out.data).toMatchObject({ renamed: 5, added: true });
    expect(() => migrate({ schema: SAVE_SCHEMA, version: 1, savedAt: 'x', slot: 'auto', data: {} }, {}, 2)).toThrow(
      '마이그레이션',
    );
  });
});
