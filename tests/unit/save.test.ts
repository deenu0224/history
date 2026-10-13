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
