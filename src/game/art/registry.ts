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
import { DESK_SPRITES } from './desk_sprites';
import { SCENE_POSES } from './characters_scene';
import { SCENE_OBJECTS } from './objects_scene';

/** 타일 레지스트리 (32×32, 텍스처 키 = 키) */
export const TILES: Record<string, PixelSprite> = { ...TILE_DEFS };

/** 스프라이트 레지스트리 (오브젝트/캐릭터/UI) */
export const SPRITES: Record<string, PixelSprite> = {
  ...PAST_OBJECTS,
  ...MODERN_OBJECTS,
  ...CHARACTERS,
  ...UI_SPRITES,
  ...OS_SPRITES,
  ...DESK_SPRITES,
  ...SCENE_POSES,
  ...SCENE_OBJECTS,
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
  naegwan: 'char_naegwan',
  gungnyeo: 'char_gungnyeo',
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

/** 결록 단말(OS) 키 그룹 — 앱 아이콘/크롬/배경/관측 오버레이/노트·보드/초상/전시 */
const keysOf = (sprites: Record<string, unknown>, prefixes: string[]) => Object.keys(sprites).filter((k) => prefixes.some((p) => k.startsWith(p)));
export const OS_KEYS = {
  /** 앱 아이콘 32×32 (+ `_sm` 16×16) */
  apps: ['app_db', 'app_observe', 'app_reader', 'app_board', 'app_messenger', 'app_mail', 'app_archive', 'app_work', 'app_notebook', 'app_settings', 'app_timeline'],
  appsSmall: ['app_db_sm', 'app_observe_sm', 'app_reader_sm', 'app_board_sm', 'app_messenger_sm', 'app_mail_sm', 'app_archive_sm', 'app_work_sm', 'app_notebook_sm', 'app_settings_sm', 'app_timeline_sm'],
  chrome: keysOf(OS_SPRITES, ['os_']),
  statusIcons: ['stat_signal', 'stat_battery', 'stat_clock', 'stat_lock', 'stat_sync', 'stat_warning'],
  wallpaper: { desktop: 'os_wallpaper', portrait: 'os_wallpaper_portrait' },
  overlays: keysOf(OS_SPRITES, ['ov_']),
  notebook: keysOf(OS_SPRITES, ['note_', 'board_']),
  avatars: ['avatar_player', 'avatar_colleague_a', 'avatar_colleague_b', 'avatar_system'],
  exhibits: ['exhibit_geomungo_TEMP', 'exhibit_silrok_book_TEMP', 'exhibit_sacho_bundle_TEMP'],
} as const;


/** 책상(야간 근무 책상) 키 그룹 — 도장/종이/규정집/프린터/번호판/서랍/실/조명 */
export const DESK_KEYS = {
  /** 찍힌 자국 64×40. 변형 a/b/c 중 무작위. 글자 면은 비어 있다(UI 가 한글 + "07" 각인을 얹음) */
  impressions: {
    ok: ['stamp_ok_a', 'stamp_ok_b', 'stamp_ok_c'],
    fix: ['stamp_fix_a', 'stamp_fix_b', 'stamp_fix_c'],
    mismatch: ['stamp_mismatch_a', 'stamp_mismatch_b', 'stamp_mismatch_c'],
    mismatchAged: 'stamp_mismatch_aged',
    system: ['stamp_system_a', 'stamp_system_b', 'stamp_system_c'],
  },
  /** 손에 쥐는 도장 32×48, 프레임 0=대기 1=눌림 */
  held: { ok: 'stamp_hold_ok', fix: 'stamp_hold_fix', mismatch: 'stamp_hold_mismatch', system: 'stamp_hold_system' },
  /** 불일치 도장 면 클로즈업 64×64 (TEMP) */
  faceMismatch: 'stamp_face_mismatch',
  surface: 'desk_surface',
  edge: 'desk_edge',
  lampPool: 'desk_lamp_pool',
  card: 'desk_card',
  rulesTile: 'desk_rules_tile',
  slip: 'desk_slip',
  rulebookClosed: 'desk_rulebook_closed',
  rulebookOpen: 'desk_rulebook_open',
  rulebookGutter: 'desk_rulebook_gutter',
  printer: 'desk_printer',
  queuePlaque: 'desk_queue_plaque',
  drawerClosed: 'desk_drawer_closed',
  drawerOpen: 'desk_drawer_open',
  threadH: 'desk_thread_h',
  threadDash: 'desk_thread_dash',
  threadKnot: 'desk_thread_knot',
  threadKnotYellow: 'desk_thread_knot_yellow',
  pin: 'desk_pin',
} as const;

/** 관측 디오라마(대조전·교지·회의·인쇄 보관) 신규 오브젝트/포즈 키. 포즈 프레임: 0 정면, 1 왼쪽, 2 오른쪽 */
export const SCENE_KEYS = {
  objects: [
    'obj_hwijang', 'obj_hwijang_tied', 'obj_screen_bamboo', 'obj_screen_low', 'obj_bedding', 'obj_soban', 'obj_decree_stand', 'obj_low_desk',
    'obj_cushion_red', 'obj_cushion_blue', 'obj_cushion_green', 'obj_cushion_plain', 'obj_cushion_row', 'obj_mat',
    'obj_book_pile_tall', 'obj_book_bundle', 'obj_sheets_pile', 'obj_chest_open', 'obj_chest_long', 'obj_block_rack',
  ],
  poses: [
    'pose_kneel_naegwan', 'pose_kneel_gungnyeo_a', 'pose_kneel_gungnyeo_b', 'pose_kneel_servant', 'pose_clerk_packing',
    'pose_decree_red', 'pose_decree_blue', 'seat_council_red', 'seat_council_blue', 'seat_council_green', 'seat_council_empty',
  ],
  /** 바닥에 깔리는 것(캐릭터보다 항상 아래) */
  flat: ['obj_mat', 'obj_cushion_row', 'obj_cushion_red', 'obj_cushion_blue', 'obj_cushion_green', 'obj_cushion_plain'],
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
  anim('anim_clerk_packing', 'pose_clerk_packing', [0, 1], 1.2, -1),
  anim('anim_desk_printer_feed', 'desk_printer', [0, 1, 2], 4, 0),
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
  exhibit_geomungo_TEMP: temp('탁영금: 160:19:10 비례, 중앙 각자 칸(글자 없음), 학 그림, 용두, 운족만 표현. 박물관 실물 사진과 대조 전까지 임시(형태·색·학 그림 위치 미확인).', ['geomungo']),
  exhibit_silrok_book_TEMP: temp('선장본 일반형(5공, 붉은 실, 빈 제첨). 실제 실록 판본의 규격·제본 확인 전.', ['bookbinding']),
  // ── 책상 / 도장 (허구의 근무 책상 소품, 고증 대상 아님)
  stamp_face_mismatch: temp('거울상 글자 면은 획 덩어리 자리표시(실제 음각 글자 없음). 확정 문구/각인 도입 시 교체. 마른 잉크 질감은 최종.'),
  // ── 디오라마 신규 인물 (복식 미확인)
  char_naegwan: temp('내관(궁중 환관 시종) 복식·모자 임시: 짙은 남색 도포 + 낮은 모자. 실제 복색·관모 확인 전.', ['naegwan-attire']),
  char_gungnyeo: temp('궁녀 복식·머리 임시: 노란 저고리 + 남색 치마 + 쪽진 머리. 실제 복색·가체 여부 확인 전.', ['gungnyeo-attire']),
  pose_kneel_naegwan: temp('내관 무릎 꿇은 자세. 복식 임시.', ['naegwan-attire']),
  pose_kneel_gungnyeo_a: temp('궁녀 무릎 꿇은 자세. 복식 임시.', ['gungnyeo-attire']),
  pose_kneel_gungnyeo_b: temp('궁녀 무릎 꿇은 자세(색 변형). 복식 임시.', ['gungnyeo-attire']),
  pose_kneel_servant: temp('하인 무릎 꿇은 자세. 복식 임시.', ['servant-attire']),
  pose_clerk_packing: temp('서리 복식·서책 포장 동작 임시.', ['clerk-attire', 'bookbinding']),
  pose_decree_red: temp('교지를 받든 관원: 관복 색·교지(두루마리) 형태·받드는 자세 임시.', ['gwanbok-color', 'decree-form']),
  pose_decree_blue: temp('교지를 받든 관원(청색 변형). 관복 색·교지 형태·자세 임시.', ['gwanbok-color', 'decree-form']),
  seat_council_red: temp('회의 좌석(방석+서안) 구성·관복 색 임시.', ['gwanbok-color', 'council-seating']),
  seat_council_blue: temp('회의 좌석(방석+서안) 구성·관복 색 임시.', ['gwanbok-color', 'council-seating']),
  seat_council_green: temp('회의 좌석(방석+서안) 구성·관복 색 임시.', ['gwanbok-color', 'council-seating']),
  seat_council_empty: temp('회의 좌석(방석+서안) 구성 임시.', ['council-seating']),
  // ── 디오라마 신규 오브젝트 (재구성)
  obj_hwijang: temp('휘장 형태·재질·색(남색 비단 + 황토 단) 임시.', ['hwijang']),
  obj_hwijang_tied: temp('걷어 묶은 휘장 형태·색 임시.', ['hwijang']),
  obj_screen_bamboo: temp('병풍 그림(대나무) 일반 구도 자리표시. 낙관·점은 글자 아님.', ['screen-painting']),
  obj_screen_low: temp('낮은 침병(머리맡 병풍) 형태·비단 문양 임시.', ['screen-painting']),
  obj_bedding: temp('이부자리 형태·색(청록 비단 이불, 목침) 임시. 몸 형상은 의도적으로 그리지 않음.', ['bedding-form']),
  obj_soban: temp('소반 형태 일반형(원형, 뚜껑 그릇) 임시.'),
  obj_decree_stand: temp('교지 받침·두루마리(황색 비단, 붉은 끈) 형태 임시.', ['decree-form']),
  obj_low_desk: temp('낮은 책상(서안) 일반형 임시.', ['council-seating']),
  obj_cushion_red: temp('방석 형태·색 임시.', ['council-seating']),
  obj_cushion_blue: temp('방석 형태·색 임시.', ['council-seating']),
  obj_cushion_green: temp('방석 형태·색 임시.', ['council-seating']),
  obj_cushion_plain: temp('방석 형태·색 임시.', ['council-seating']),
  obj_cushion_row: temp('방석 줄 형태·색 임시.', ['council-seating']),
  obj_mat: temp('왕골 돗자리(통로 깔개) 문양·가선 임시.', ['council-seating']),
  obj_book_pile_tall: temp('선장본 더미(표지 색·쌓는 방식) 임시.', ['bookbinding']),
  obj_book_bundle: temp('보자기로 싼 서책 묶음 형태 임시.', ['bookbinding']),
  obj_sheets_pile: temp('제본 전 낱장 인쇄지 더미 형태 임시.', ['print-storage']),
  obj_chest_open: temp('열린 궤(서책 보관) 형태 임시.', ['print-storage']),
  obj_chest_long: temp('긴 궤 형태 임시.', ['print-storage']),
  obj_block_rack: temp('목판(판목) 보관 판가 형태·보관 방식 임시.', ['print-storage', 'woodblock-rack']),
  exhibit_sacho_bundle_TEMP: temp('사초 묶음 일반형(접은 종이 더미 + 끈). 실제 사초 규격/묶음 확인 전.', ['sacho-form']),
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
  { id: 'naegwan-attire', topic: '내관 복식', note: '궁중 환관 시종의 복색·관모(성종~연산군). 현재 짙은 남색 도포 + 낮은 모자는 임시' },
  { id: 'gungnyeo-attire', topic: '궁녀 복식', note: '저고리·치마 색, 머리 모양(쪽·가체), 신분별 차이' },
  { id: 'hwijang', topic: '휘장', note: '궁궐 실내 휘장의 형태·재질·색·걸이 방식' },
  { id: 'bedding-form', topic: '이부자리', note: '궁궐 침구(요·이불·베개·목침)의 형태와 색' },
  { id: 'decree-form', topic: '교지', note: '교지(두루마리)의 형태·색·받드는 법·낭독 절차' },
  { id: 'council-seating', topic: '회의 좌석', note: '관원 회의 좌석 배치·방석·낮은 책상·돗자리' },
  { id: 'print-storage', topic: '인쇄본 보관', note: '인쇄본/낱장/궤의 보관 방식과 가구' },
  { id: 'woodblock-rack', topic: '판목 보관', note: '인쇄용 판목을 두는 판가의 형태' },
];
