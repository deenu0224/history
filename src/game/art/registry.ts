/**
 * 아트 레지스트리: 스프라이트/타일/애니메이션/메타데이터의 단일 진입점.
 * (pixel.ts 가 이 파일을 import 하므로, 콘텐츠 모듈은 pixel.ts 에서 타입만 가져온다.)
 */
import type { PixelSprite } from './pixel';
import { TILE_DEFS } from './tiles';
import { PAST_OBJECTS } from './objects_past';
import { MODERN_OBJECTS } from './objects_modern';
import { CHARACTERS, CHAR_FRAMES, DIRS } from './characters';
import { UI_SPRITES } from './ui';
import { OS_SPRITES } from './os_sprites';

/** 타일 레지스트리 (32×32, 텍스처 키 = 키) */
export const TILES: Record<string, PixelSprite> = { ...TILE_DEFS };

/** 스프라이트 레지스트리 (오브젝트/캐릭터/UI) */
export const SPRITES: Record<string, PixelSprite> = {
  ...PAST_OBJECTS,
  ...MODERN_OBJECTS,
  ...CHARACTERS,
  ...UI_SPRITES,
  ...OS_SPRITES,
};

// ───────────────────────── 키 상수 ─────────────────────────
export const TILE_KEYS = {
  madangA: 'tile_madang_a',
  madangB: 'tile_madang_b',
  madangC: 'tile_madang_c',
  bakseok: 'tile_bakseok',
  grassA: 'tile_grass_a',
  grassB: 'tile_grass_b',
  wallH: 'tile_wall_h',
  wallEndL: 'tile_wall_end_l',
  wallEndR: 'tile_wall_end_r',
  wallV: 'tile_wall_v',
  wallCornerTl: 'tile_wall_corner_tl',
  wallCornerTr: 'tile_wall_corner_tr',
  wallCornerBl: 'tile_wall_corner_bl',
  wallCornerBr: 'tile_wall_corner_br',
  roofBody: 'tile_roof_body',
  roofRidge: 'tile_roof_ridge',
  roofRidgeL: 'tile_roof_ridge_l',
  roofRidgeR: 'tile_roof_ridge_r',
  roofEdgeL: 'tile_roof_edge_l',
  roofEdgeR: 'tile_roof_edge_r',
  roofEave: 'tile_roof_eave',
  roofEaveL: 'tile_roof_eave_l',
  roofEaveR: 'tile_roof_eave_r',
  eaveRafter: 'tile_eave_rafter',
  pillar: 'tile_pillar',
  windowHanji: 'tile_window_hanji',
  windowHanjiLit: 'tile_window_hanji_lit',
  doorHanji: 'tile_door_hanji',
  doorGate: 'tile_door_gate',
  maru: 'tile_maru',
  toenmaru: 'tile_toenmaru',
  seomdol: 'tile_seomdol',
  stairs: 'tile_stairs',
  ondolFloor: 'tile_ondol_floor',
  innerWall: 'tile_inner_wall',
  doorInner: 'tile_door_inner',
  labFloorWood: 'tile_lab_floor_wood',
  labCarpet: 'tile_lab_carpet',
  labWall: 'tile_lab_wall',
  labWindow: 'tile_lab_window',
  labDoor: 'tile_lab_door',
} as const;

/** 오브젝트 키 (과거/현대/자연 포함) */
export const OBJ_KEYS = {
  seoan: 'obj_seoan',
  booksStack: 'obj_books_stack',
  bookshelf: 'obj_bookshelf',
  sachoBundle: 'obj_sacho_bundle',
  lamp: 'obj_lamp',
  foldingScreen: 'obj_folding_screen',
  chest: 'obj_chest',
  jar: 'obj_jar',
  brazier: 'obj_brazier',
  artifactGeomungoTemp: 'artifact_geomungo_TEMP',
  plaque: 'obj_plaque',
  well: 'obj_well',
  pine: 'obj_pine',
  rockA: 'obj_rock_a',
  rockB: 'obj_rock_b',
  grassTuft: 'obj_grass_tuft',
  labDesk: 'obj_lab_desk',
  labShelf: 'obj_lab_shelf',
  caseEmpty: 'obj_case_empty',
  caseFilled: 'obj_case_filled',
  displayStand: 'obj_display_stand',
  chair: 'obj_chair',
  floorLamp: 'obj_floor_lamp',
  terminal: 'obj_terminal',
  plant: 'obj_plant',
} as const;

export const CHAR_KEYS = {
  playerModern: 'char_player_modern',
  playerObserver: 'char_player_observer',
  officialRed: 'char_official_red',
  officialBlue: 'char_official_blue',
  officialGreen: 'char_official_green',
  sagwan: 'char_sagwan',
  clerk: 'char_clerk',
  servant: 'char_servant',
} as const;

export const UI_KEYS = {
  uiPanelHanji: 'ui_panel_hanji',
  uiPanelModern: 'ui_panel_modern',
  iconNotebook: 'icon_notebook',
  iconCodex: 'icon_codex',
  iconTimeline: 'icon_timeline',
  iconMagnifier: 'icon_magnifier',
  iconArchive: 'icon_archive',
  iconSettings: 'icon_settings',
  iconEvidence: 'icon_evidence',
  iconPerson: 'icon_person',
  iconScroll: 'icon_scroll',
  iconEvent: 'icon_event',
  iconPlace: 'icon_place',
  iconLock: 'icon_lock',
  iconCheck: 'icon_check',
  iconQuestion: 'icon_question',
} as const;

/** 캐릭터 프레임 배치 (characters.ts 참고) */
export { CHAR_FRAMES };

/** 방향별 캐릭터 프레임 인덱스. walk 는 1..4, idle 은 0 */
export function charFrame(dir: 'down' | 'left' | 'right' | 'up', step = 0): number {
  return CHAR_FRAMES[dir] + step;
}

// ───────────────────────── 애니메이션 ─────────────────────────
export interface AnimDef {
  key: string;
  spriteKey: string;
  frames: number[];
  frameRate: number;
  /** -1 = 무한 반복 */
  repeat: number;
}

const anim = (key: string, spriteKey: string, frames: number[], frameRate: number, repeat: number): AnimDef => ({ key, spriteKey, frames, frameRate, repeat });

function characterAnims(): AnimDef[] {
  const out: AnimDef[] = [];
  for (const [spriteKey, sp] of Object.entries(CHARACTERS)) {
    for (const d of DIRS) {
      const base = CHAR_FRAMES[d];
      out.push(anim(`${spriteKey}_idle_${d}`, spriteKey, [base], 1, -1));
      out.push(anim(`${spriteKey}_walk_${d}`, spriteKey, [base + 1, base + 2, base + 3, base + 4], 8, -1));
    }
    if (sp.frames.length > CHAR_FRAMES.bow) out.push(anim(`${spriteKey}_bow`, spriteKey, [CHAR_FRAMES.bow], 1, 0));
    if (sp.frames.length > CHAR_FRAMES.write[2]) out.push(anim(`${spriteKey}_write`, spriteKey, [...CHAR_FRAMES.write], 4, -1));
    if (sp.frames.length > CHAR_FRAMES.read[1]) out.push(anim(`${spriteKey}_read`, spriteKey, [...CHAR_FRAMES.read], 2, -1));
  }
  return out;
}

/** Phaser 애니메이션 정의 (registerPhaserAnims 로 등록) */
export const ANIMS: AnimDef[] = [
  ...characterAnims(),
  anim('anim_lamp_flicker', OBJ_KEYS.lamp, [0, 1, 0, 2, 1, 2], 7, -1),
  anim('anim_brazier_embers', OBJ_KEYS.brazier, [0, 1], 3, -1),
  anim('anim_lab_desk_screen', OBJ_KEYS.labDesk, [0, 1], 2, -1),
  anim('anim_terminal_blink', OBJ_KEYS.terminal, [0, 1], 2, -1),
];

// ───────────────────────── 메타데이터 (TEMP / FINAL) ─────────────────────────
export type SpriteStatus = 'temp' | 'final';
export interface SpriteMeta {
  status: SpriteStatus;
  /** 임시 사유 / 교체 조건 */
  note?: string;
  /** 고증 필요 항목 ID (REFERENCE_NEEDED 참고) */
  needsReference?: string[];
}

const final = (): SpriteMeta => ({ status: 'final' });
const temp = (note: string, needsReference: string[] = []): SpriteMeta => ({ status: 'temp', note, needsReference });

const metaEntries: Record<string, SpriteMeta> = {};
for (const k of Object.keys(TILES)) metaEntries[k] = final();
for (const k of Object.keys(SPRITES)) metaEntries[k] = final();
Object.assign(metaEntries, {
  artifact_geomungo_TEMP: temp('거문고 실물 고증 전 임시 도상. 6현/16괘 형태 암시만. 검증된 자료 도착 후 교체.', ['geomungo']),
  char_official_red: temp('관복 색/흉배/모자 임시. 품계 표현 아님.', ['gwanbok-color', 'heungbae', 'samo']),
  char_official_blue: temp('관복 색/흉배/모자 임시. 품계 표현 아님.', ['gwanbok-color', 'heungbae', 'samo']),
  char_official_green: temp('관복 색/모자 임시. 품계 표현 아님.', ['gwanbok-color', 'samo']),
  char_sagwan: temp('사관 복색/모자/붓 휴대 방식 임시.', ['gwanbok-color', 'samo', 'sagwan-tools']),
  char_clerk: temp('서리 복식(두루마기류+검은 갓형 모자) 임시.', ['clerk-attire']),
  char_servant: temp('하인/노비 복식(저고리·바지·망건) 임시.', ['servant-attire']),
  obj_plaque: temp('현판 글자는 실제 한자가 아닌 획 자리표시. 실제 문구/서체 확정 후 교체.', ['plaque-text']),
  obj_folding_screen: temp('병풍 그림은 일반 수묵 산수 자리표시.', ['screen-painting']),
  obj_bookshelf: temp('조선 관청 서가(서책 보관 방식) 형태 임시.', ['bookshelf-form']),
  obj_sacho_bundle: temp('사초 묶음 형태(봉투/끈 묶음) 임시.', ['sacho-form']),
  obj_books_stack: temp('선장본 오침안정법 표현은 약식.', ['bookbinding']),
  tile_eave_rafter: temp('단청 문양은 일반 모티프 약식.', ['dancheong-pattern']),
  tile_door_gate: temp('관아 대문 형태 임시.', ['gate-form']),
  tile_roof_ridge_l: temp('치미/용마루 장식 약식.', ['roof-ornament']),
  tile_roof_ridge_r: temp('치미/용마루 장식 약식.', ['roof-ornament']),
});

/** 키 → 메타. 레지스트리의 모든 키에 대해 존재한다. */
export const SPRITE_META: Record<string, SpriteMeta> = metaEntries;

/** 고증 필요 항목 목록 (docs/ART_DIRECTION.md 와 동기화) */
export const REFERENCE_NEEDED: { id: string; topic: string; note: string }[] = [
  { id: 'geomungo', topic: '거문고', note: '몸통 비례, 괘 수/배치, 술대, 현 색, 문양' },
  { id: 'gwanbok-color', topic: '관복 색', note: '시대(성종~연산군)별 품계-복색 대응. 현재 빨강/파랑/초록은 구분용 임시색' },
  { id: 'heungbae', topic: '흉배', note: '품계·시기별 문양 유무. 현재 도상은 임시' },
  { id: 'samo', topic: '사모/단령', note: '모자 날개 비례, 단령 소매/길이' },
  { id: 'sagwan-tools', topic: '사관 휴대품', note: '붓·먹·사초 휴대 방식' },
  { id: 'clerk-attire', topic: '서리 복식', note: '모자·옷감·색' },
  { id: 'servant-attire', topic: '하인/노비 복식', note: '머리 모양, 옷, 신발' },
  { id: 'plaque-text', topic: '현판', note: '실제 관청 현판 문구와 서체' },
  { id: 'screen-painting', topic: '병풍', note: '그림 소재(공간별)' },
  { id: 'bookshelf-form', topic: '서가', note: '조선 서책 보관 가구 형태' },
  { id: 'sacho-form', topic: '사초', note: '사초 종이 규격/묶음/보관' },
  { id: 'bookbinding', topic: '선장본', note: '오침안정법 구멍 위치/실 색' },
  { id: 'dancheong-pattern', topic: '단청', note: '관아 건물에서의 문양/채색 수위' },
  { id: 'gate-form', topic: '관아 대문', note: '솟을대문 여부, 문짝 장식' },
  { id: 'roof-ornament', topic: '지붕 장식', note: '치미/잡상 사용 여부' },
];
