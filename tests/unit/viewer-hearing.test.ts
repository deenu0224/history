import { describe, expect, it } from 'vitest';
import { HearingTracker, inHearRange, bubbleDwellMs, requiredZoom } from '@/game/logic/hearing';
import { inDegraded, mostlyVisible, visibleFraction } from '@/game/logic/capture';

const base = { baseZoom: 3, center: { x: 320, y: 320 }, tile: 32 };

describe('inHearRange', () => {
  it('needs both zoom and proximity (defaults 1.6x, 3 tiles)', () => {
    const near = { x: 320 + 64, y: 320 };
    expect(inHearRange({ ...base, zoom: 3, npc: near })).toBe(false);
    expect(inHearRange({ ...base, zoom: 6, npc: near })).toBe(true);
    expect(inHearRange({ ...base, zoom: 6, npc: { x: 320 + 32 * 4, y: 320 } })).toBe(false);
    expect(inHearRange({ ...base, zoom: 6, npc: { x: 320 + 32 * 3, y: 320 } })).toBe(true);
  });
  it('honours per-line spec', () => {
    const npc = { x: 320 + 32 * 5, y: 320 };
    expect(inHearRange({ ...base, zoom: 4.8, npc }, { radiusTiles: 6, minZoom: 1.5 })).toBe(true);
    expect(inHearRange({ ...base, zoom: 4.8, npc }, { radiusTiles: 6, minZoom: 2 })).toBe(false);
    expect(requiredZoom(3, { minZoom: 2 })).toBe(6);
  });
});

describe('HearingTracker', () => {
  const L = (id: string, inRange = true) => ({ id, text: '가나다', inRange });
  it('fires newlyHeard once per line, queues in order, mumbles when out of range', () => {
    const t = new HearingTracker();
    let s = t.step(0, [{ id: 'n', lines: [L('a'), L('b')] }]);
    expect(s.newlyHeard).toEqual([{ npcId: 'n', lineId: 'a' }]);
    expect(s.npcs[0]!.current!.id).toBe('a');
    s = t.step(100, [{ id: 'n', lines: [L('a'), L('b')] }]);
    expect(s.newlyHeard).toEqual([]);
    s = t.step(bubbleDwellMs('가나다') + 200, [{ id: 'n', lines: [L('a'), L('b')] }]);
    expect(s.npcs[0]!.current!.id).toBe('b');
    expect(s.newlyHeard).toEqual([{ npcId: 'n', lineId: 'b' }]);
    // last line stays while in range
    s = t.step(60000, [{ id: 'n', lines: [L('a'), L('b')] }]);
    expect(s.npcs[0]!.current!.id).toBe('b');
    // out of range -> mumble, no replay of onHear on return
    s = t.step(60100, [{ id: 'n', lines: [L('a', false), L('b', false)] }]);
    expect(s.npcs[0]).toMatchObject({ current: null, mumble: true });
    s = t.step(60200, [{ id: 'n', lines: [L('a'), L('b')] }]);
    expect(s.newlyHeard).toEqual([]);
    expect(t.heardLineIds().sort()).toEqual(['a', 'b']);
  });
  it('no lines -> no mumble', () => {
    const s = new HearingTracker().step(0, [{ id: 'n', lines: [] }]);
    expect(s.npcs[0]).toMatchObject({ current: null, mumble: false });
  });
});

describe('capture helpers', () => {
  it('visibleFraction uses the finger-sized hit box', () => {
    const t = { id: 'x', cx: 0, cy: 100, halfW: 10, halfH: 10 };
    expect(visibleFraction(t, 400, 800)).toBeCloseTo(0.5, 5);
    expect(mostlyVisible({ ...t, cx: -30 }, 400, 800)).toBe(false);
    expect(mostlyVisible({ ...t, cx: 100 }, 400, 800)).toBe(true);
  });
  it('inDegraded is half-open', () => {
    const sp = [{ from: 600, to: 660 }];
    expect(inDegraded(600, sp)).toBe(true);
    expect(inDegraded(660, sp)).toBe(false);
    expect(inDegraded(10, undefined)).toBe(false);
  });
});
