import { describe, expect, it } from 'vitest';
import { CUT_SCENE_IDS } from '@/game/cuts/types';
import { SPRITES } from '@/game/art/registry';
import { DIORAMAS } from '@/game/scenes/maps';
import { aliasNpc } from '@/game/cuts/math';
import { NPC_ALIASES } from '@/game/keys';

describe('cuts: data wiring (no DOM)', () => {
  it('has the five scenes', () => {
    expect([...CUT_SCENE_IDS]).toEqual(['obs001', 'sc_daejojeon', 'sc_court_decree', 'sc_council', 'sc_print_storage']);
  });
  it('every diorama decor sprite exists (bake would silently skip otherwise)', () => {
    for (const id of CUT_SCENE_IDS) {
      if (id === 'obs001') continue;
      for (const o of DIORAMAS[id].objects) expect(SPRITES[o.spriteKey], `${id}:${o.spriteKey}`).toBeTruthy();
    }
  });
  it('npc alias table matches keys.ts', () => {
    for (const [k, v] of Object.entries(NPC_ALIASES)) expect(aliasNpc(k)).toBe(v);
  });
});
