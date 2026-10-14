import { clear, set } from 'idb-keyval';
import { deleteSave, loadGame, migrate, peekSave, SAVE_SCHEMA, SAVE_VERSION, saveGame, SaveError, slotKey } from '@/core/save';
import { freshState, hydrateRaw, PERSISTED_KEYS } from '@/store/gameStore';
import { makeStore } from './store-helpers';

beforeEach(() => clear());

describe('save v6', () => {
  it('is version 6', () => expect(SAVE_VERSION).toBe(6));

  it('round-trips a mid-game state through IndexedDB and the store', async () => {
    const h = makeStore(3);
    h.st().startEpisode();
    h.st().openEye('E1');
    h.st().viewCut('E1', 1);
    h.st().tag('fig_yi', 'yi_geukdon', 'l_e1_2a', 'e1-2');
    await h.st().save('manual');
    const file = await loadGame('manual');
    expect(file).toMatchObject({ schema: SAVE_SCHEMA, version: 6, slot: 'manual' });
    const h2 = makeStore(3);
    expect(await h2.st().load('manual')).toBe('loaded');
    for (const k of PERSISTED_KEYS) expect(h2.st()[k]).toEqual(h.st()[k]);
    expect(h2.st().named).toEqual({ fig_yi: 'yi_geukdon' });
    expect(await peekSave('manual')).toMatchObject({ version: 6 });
  });

  it('keeps slots separate and returns null / empty for empty slots', async () => {
    await saveGame('auto', freshState());
    expect(await loadGame('manual')).toBeNull();
    expect(await makeStore().st().load('manual')).toBe('empty');
    await deleteSave('auto');
    expect(await loadGame('auto')).toBeNull();
  });

  it('rejects corrupt or future saves', async () => {
    await set(slotKey('manual'), { hello: 1 });
    await expect(loadGame('manual')).rejects.toBeInstanceOf(SaveError);
    const h = makeStore();
    expect(await h.st().load('manual')).toBe('error');
    expect(h.st().lastError).toBeTruthy();
    await set(slotKey('manual'), { schema: SAVE_SCHEMA, version: SAVE_VERSION + 1, data: {} });
    await expect(loadGame('manual')).rejects.toThrow('더 새로운');
    expect(() => migrate(null)).toThrow(SaveError);
  });

  it.each([1, 2, 3, 4, 5])('v%i → v6: progress is reset, settings survive', (v) => {
    const old = {
      schema: SAVE_SCHEMA,
      version: v,
      savedAt: 'x',
      slot: 'auto',
      data: {
        flags: { closed_mismatch: true },
        duty: { started: ['duty_1'] },
        frames: [{ id: 'fr_1' }],
        heard: ['m2'],
        settings: { volume: 0.3, hintLevel: 'detailed', haptics: false, reduceFlicker: true, textSpeed: 2, showProvenance: true },
      },
    };
    const s = hydrateRaw(old, 5, 0);
    expect(Object.keys(s).sort()).toEqual([...PERSISTED_KEYS].sort());
    expect(s.started).toBe(false);
    expect(s.viewedCuts).toEqual([]);
    expect(s).not.toHaveProperty('duty');
    expect(s).not.toHaveProperty('frames');
    expect(s.settings).toMatchObject({ volume: 0.3, hintLevel: 'detailed', haptics: false, reduceMotion: true, showProvenance: true, fastMessages: false });
    expect(s.settings).not.toHaveProperty('textSpeed');
  });

  it('applies migrations step by step (table injection)', () => {
    const table = {
      1: (d: Record<string, unknown>) => ({ ...d, renamed: d.old, old: undefined }),
      2: (d: Record<string, unknown>) => ({ ...d, added: true }),
    };
    const out = migrate({ schema: SAVE_SCHEMA, version: 1, savedAt: 'x', slot: 'auto', data: { old: 5 } }, table, 3);
    expect(out.version).toBe(3);
    expect(out.data).toMatchObject({ renamed: 5, added: true });
    expect(() => migrate({ schema: SAVE_SCHEMA, version: 1, savedAt: 'x', slot: 'auto', data: {} }, {}, 2)).toThrow('마이그레이션');
  });

  it('reset keeps settings', () => {
    const h = makeStore();
    h.st().setSettings({ fastMessages: true });
    h.st().startEpisode();
    h.st().reset();
    expect(h.st().started).toBe(false);
    expect(h.st().settings.fastMessages).toBe(true);
  });

  it('resume after ≥10 minutes: one state line from 한 선임, timers paused', () => {
    const h = makeStore();
    h.st().startEpisode();
    h.st().openMessenger();
    h.advance(60_000);
    h.st().closeMessenger();
    h.clock.t += 11 * 60_000;
    expect(h.st().resume()).toBe('ev.resume.notag');
    h.clock.t += 60_000;
    expect(h.st().resume()).toBeNull();
  });
});
