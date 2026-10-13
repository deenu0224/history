import { clear, set } from 'idb-keyval';
import { deleteSave, loadGame, migrate, peekSave, SAVE_SCHEMA, SAVE_VERSION, saveGame, SaveError, slotKey } from '@/core/save';
import { initialPersisted } from '@/store/gameStore';

beforeEach(() => clear());

describe('save/load', () => {
  it('round-trips a save through IndexedDB', async () => {
    const data = initialPersisted();
    data.flags.met = true;
    data.heard.push('m2');
    data.checklist.ck_place = 'match';
    data.frames.push({ id: 'fr_1', seq: 1, minute: 850, centerTile: { x: 1, y: 2 }, zoom: 2, visibleHotspotIds: [], heardLineIds: ['m2'], clueIds: ['cl_order'] });
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

  it('migrates v1 → v2 → v3 → v4: old progress (notebook, board, memos) is dropped, settings survive', () => {
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
    expect(Object.keys(out.data).sort()).toEqual(Object.keys(initialPersisted()).sort());
    for (const gone of ['notebook', 'evidence', 'collection', 'solved', 'tutorial', 'links', 'recorded', 'memos', 'phrases'])
      expect(out.data).not.toHaveProperty(gone);
    expect(out.data.settings).toEqual({ textSpeed: 1, volume: 0.5, showProvenance: false, hintLevel: 'normal', haptics: true, reduceFlicker: false });
    expect(out.data.frames).toEqual([]);
  });

  it('v3 → v4 keeps only settings', () => {
    const v3 = { schema: SAVE_SCHEMA, version: 3, savedAt: 'x', slot: 'auto', data: { flags: { a: true }, notebook: {}, settings: { volume: 0.2, hintLevel: 'off' } } };
    const out = migrate(v3);
    expect(out.data.flags).toEqual({});
    expect(out.data.settings).toMatchObject({ volume: 0.2, hintLevel: 'off' });
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
