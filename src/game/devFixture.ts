/** 개발/시각 검증용 월드 콘텐츠 픽스처(실 콘텐츠 아님). devEntry 에서만 사용. */
import type { Interactable, NpcDef } from '@/core/types';
import type { WorldContent } from './worldContent';

const F = 'fictional' as const;
const obj = (id: string, sceneId: string, x: number, y: number, spriteKey: string, o: Partial<Interactable> = {}): Interactable => ({
  id,
  provenance: F,
  sceneId,
  x,
  y,
  spriteKey,
  kind: 'object',
  label: id,
  examine: ['…'],
  ...o,
});

const walk = (id: string, sceneId: string, spriteKey: string, schedule: NpcDef['schedule']): NpcDef => ({
  id,
  provenance: F,
  sceneId,
  spriteKey,
  label: '미확인 인물',
  schedule,
  dialogue: [{ id: `${id}_l`, provenance: F, text: '…' }],
});

export const DEV_FIXTURE: WorldContent = {
  worldObjects: [
    obj('lab_desk', 'lab', 4, 4, 'obj_lab_desk'),
    obj('lab_shelf', 'lab', 8, 3, 'obj_lab_shelf'),
    obj('lab_shelf2', 'lab', 9, 3, 'obj_lab_shelf'),
    obj('lab_console', 'lab', 15, 3, 'obj_db_console', { kind: 'observe' }),
    obj('lab_chair', 'lab', 12, 6, 'obj_observe_chair', { kind: 'observe' }),
    obj('lab_plant', 'lab', 2, 11, 'obj_plant'),
    obj('lab_plant2', 'lab', 19, 11, 'obj_plant'),
    obj('lab_desk2', 'lab', 17, 8, 'obj_lab_desk'),
    obj('lab_door_archive', 'lab', 17, 1, 'door', { kind: 'door', targetSceneId: 'archive' }),
    obj('arch_case1', 'archive', 5, 3, 'obj_display_case', { grants: { collect: [{ entryId: 'dev_a' }] } }),
    obj('arch_case2', 'archive', 8, 3, 'obj_display_case', { grants: { collect: [{ entryId: 'dev_b' }] } }),
    obj('arch_case3', 'archive', 11, 3, 'obj_display_case'),
    obj('arch_shelf', 'archive', 14, 3, 'obj_lab_shelf'),
    obj('arch_term', 'archive', 4, 9, 'obj_db_console'),
    obj('arch_door_lab', 'archive', 2, 1, 'door', { kind: 'door', targetSceneId: 'lab' }),
    obj('o_seoan', 'obs001', 7, 5, 'obj_desk_writing'),
    obj('o_shelf', 'obs001', 4, 5, 'obj_bookshelf'),
    obj('o_screen', 'obs001', 14, 5, 'obj_screen'),
    obj('o_lamp', 'obs001', 9, 5, 'obj_lamp'),
    obj('o_brazier', 'obs001', 15, 8, 'obj_brazier'),
    obj('o_chest', 'obs001', 17, 5, 'obj_chest'),
    obj('o_jar', 'obs001', 2, 12, 'obj_jar'),
    obj('o_plaque', 'obs001', 11, 4, 'obj_signboard'),
    obj('o_sacho', 'obs001', 6, 11, 'obj_sacho_bundle'),
    obj('o_books', 'obs001', 18, 11, 'obj_books_stack'),
    obj('o_unknown', 'obs001', 19, 13, 'obj_mystery_thing'),
    obj('o_door_back', 'obs001', 11, 5, 'door', { kind: 'door', targetSceneId: 'lab' }),
  ],
  npcs: [
    walk('n_sagwan', 'obs001', 'npc_historian', [
      { time: 0, x: 7, y: 6, action: 'write' },
      { time: 600, x: 7, y: 6, action: 'write' },
    ]),
    walk('n_red', 'obs001', 'npc_official_red', [
      { time: 0, x: 12, y: 9 },
      { time: 545, x: 16, y: 11 },
      { time: 560, x: 6, y: 9 },
      { time: 575, x: 12, y: 13 },
    ]),
    walk('n_blue', 'obs001', 'npc_official_blue', [{ time: 0, x: 4, y: 7, action: 'read' }]),
    walk('n_clerk', 'obs001', 'npc_clerk', [
      { time: 0, x: 9, y: 11 },
      { time: 543, x: 18, y: 9 },
      { time: 558, x: 9, y: 11 },
    ]),
    walk('n_servant', 'obs001', 'npc_servant', [
      { time: 0, x: 14, y: 12 },
      { time: 550, x: 3, y: 13 },
      { time: 570, x: 14, y: 12 },
    ]),
    walk('n_green', 'obs001', 'npc_official_green', [{ time: 0, x: 19, y: 7, action: 'bow' }]),
  ],
};
