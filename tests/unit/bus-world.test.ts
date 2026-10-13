import { createBus, type BusEvents } from '@/core/bus';
import { availableLines, canInteract, checkCondition, npcWaypointAt } from '@/core/world';
import type { Interactable, NpcDef } from '@/core/types';

describe('bus', () => {
  it('delivers typed payloads, supports off/once/clear', () => {
    const bus = createBus<BusEvents>();
    const got: string[] = [];
    const off = bus.on('viewer:tapped', (p) => got.push(p.hotspotId));
    bus.once('app:open', (p) => got.push(`open:${p.app}`));
    bus.emit('viewer:tapped', { hotspotId: 'a' });
    bus.emit('app:open', { app: 'db' });
    bus.emit('app:open', { app: 'viewer', target: 'src' });
    off();
    bus.emit('viewer:tapped', { hotspotId: 'b' });
    expect(got).toEqual(['a', 'open:db']);
    bus.on('glitch', () => got.push('g'));
    bus.clear();
    bus.emit('glitch', { intensity: 1, ms: 100 });
    expect(got).toHaveLength(2);
  });

  it('allows unsubscribing during emit', () => {
    const bus = createBus<BusEvents>();
    const calls: number[] = [];
    const off1 = bus.on('notify', () => {
      calls.push(1);
      off1();
    });
    bus.on('notify', () => calls.push(2));
    bus.emit('notify', { text: 'x' });
    bus.emit('notify', { text: 'y' });
    expect(calls).toEqual([1, 2, 2]);
  });
});

describe('world helpers', () => {
  const npc: NpcDef = {
    id: 'n',
    provenance: 'fictional',
    sceneId: 's',
    spriteKey: 'x',
    label: 'n',
    schedule: [
      { time: 480, x: 2, y: 2 },
      { time: 720, x: 9, y: 5 },
    ],
    dialogue: [
      { id: 'greet', text: 'hi', provenance: 'fictional' },
      { id: 'secret', text: 'psst', provenance: 'fictional', when: { all: ['k'] } },
    ],
  };
  const obj: Interactable = { id: 'o', provenance: 'fictional', sceneId: 's', x: 0, y: 0, spriteKey: 'x', kind: 'object', label: 'o', examine: [], requires: 'k' };
  it('flag conditions', () => {
    expect(checkCondition({ a: true }, { all: ['a'], none: ['b'] })).toBe(true);
    expect(checkCondition({ a: true, b: 1 }, { all: ['a'], none: ['b'] })).toBe(false);
    expect(checkCondition({}, undefined)).toBe(true);
    expect(canInteract(obj, {})).toBe(false);
  });
  it('npc schedule wraps around the day', () => {
    expect(npcWaypointAt(npc, 500)).toMatchObject({ x: 2, y: 2 });
    expect(npcWaypointAt(npc, 800)).toMatchObject({ x: 9, y: 5 });
    expect(npcWaypointAt(npc, 60)).toMatchObject({ x: 9, y: 5 });
    expect(npcWaypointAt(npc, 1440 + 500)).toMatchObject({ x: 2, y: 2 });
  });
  it('dialogue availability', () => {
    expect(availableLines(npc, {}).map((l) => l.id)).toEqual(['greet']);
  });
});
