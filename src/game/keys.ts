/** 콘텐츠의 의미 키(spriteKey) → 아트 키 매핑. 알 수 없는 키는 한 번만 경고하고 자리표시(궤)로 그린다. */
import { OBJ_KEYS, SPRITES, TILES, CHAR_KEYS, TILE_KEYS } from './art/registry';
import type { Ambient } from './logic/types';

export type ResolvedKind = 'sprite' | 'tile';

export interface ResolvedSprite {
  kind: ResolvedKind;
  /** 텍스처 키 */
  key: string;
  /** 기본 프레임 */
  frame: number;
  /** 바닥에 깔리는 것(문 등): 캐릭터보다 항상 아래에 그린다 */
  flat: boolean;
  /** 캐릭터 스프라이트인가 */
  character: boolean;
  /** 벽에 걸린 물건: 타일 중앙에 맞춰 그린다 */
  wallMounted: boolean;
  /** 재생할 오브젝트 애니메이션 */
  anim?: string;
  /** 알 수 없는 키로 자리표시를 쓴 경우 */
  placeholder: boolean;
}

export const OBJECT_ALIASES: Record<string, string> = {
  obj_desk_writing: OBJ_KEYS.seoan,
  obj_books_stack: OBJ_KEYS.booksStack,
  obj_bookshelf: OBJ_KEYS.bookshelf,
  obj_sacho_bundle: OBJ_KEYS.sachoBundle,
  obj_lamp: OBJ_KEYS.lamp,
  obj_screen: OBJ_KEYS.foldingScreen,
  obj_chest: OBJ_KEYS.chest,
  obj_jar: OBJ_KEYS.jar,
  obj_brazier: OBJ_KEYS.brazier,
  obj_signboard: OBJ_KEYS.plaque,
  obj_well: OBJ_KEYS.well,
  obj_lab_desk: OBJ_KEYS.labDesk,
  obj_lab_shelf: OBJ_KEYS.labShelf,
  obj_display_case: OBJ_KEYS.caseEmpty,
  obj_db_console: OBJ_KEYS.terminal,
  obj_observe_chair: OBJ_KEYS.chair,
  obj_plant: OBJ_KEYS.plant,
};

export const NPC_ALIASES: Record<string, string> = {
  npc_official_red: CHAR_KEYS.officialRed,
  npc_official_blue: CHAR_KEYS.officialBlue,
  npc_official_green: CHAR_KEYS.officialGreen,
  npc_historian: CHAR_KEYS.sagwan,
  npc_clerk: CHAR_KEYS.clerk,
  npc_servant: CHAR_KEYS.servant,
};

const OBJECT_ANIMS: Record<string, string> = {
  [OBJ_KEYS.lamp]: 'anim_lamp_flicker',
  [OBJ_KEYS.brazier]: 'anim_brazier_embers',
  [OBJ_KEYS.labDesk]: 'anim_lab_desk_screen',
  [OBJ_KEYS.terminal]: 'anim_terminal_blink',
};

const WALL_MOUNTED = new Set<string>([OBJ_KEYS.plaque]);

const warned = new Set<string>();
export function warnOnce(msg: string): void {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(`[world] ${msg}`);
}

export interface ResolveOpts {
  ambient: Ambient;
  /** 진열장 등 상태 변형: 수집/완료 여부 */
  filled?: boolean;
}

const base = (key: string, kind: ResolvedKind, extra: Partial<ResolvedSprite> = {}): ResolvedSprite => ({
  kind,
  key,
  frame: 0,
  flat: false,
  character: false,
  wallMounted: WALL_MOUNTED.has(key),
  anim: OBJECT_ANIMS[key],
  placeholder: false,
  ...extra,
});

/** 오브젝트(상호작용 가능한 사물/문) 스프라이트 해석. */
export function resolveObjectSprite(spriteKey: string, opts: ResolveOpts): ResolvedSprite {
  if (spriteKey === 'door') {
    return base(opts.ambient === 'modern' ? TILE_KEYS.labDoor : TILE_KEYS.doorHanji, 'tile', { flat: true, anim: undefined });
  }
  if (spriteKey === 'obj_display_case') {
    return base(opts.filled ? OBJ_KEYS.caseFilled : OBJ_KEYS.caseEmpty, 'sprite');
  }
  const key = OBJECT_ALIASES[spriteKey] ?? spriteKey;
  if (SPRITES[key] && !key.startsWith('char_')) return base(key, 'sprite');
  if (key.startsWith('char_') && SPRITES[key]) return base(key, 'sprite', { character: true, anim: undefined });
  if (NPC_ALIASES[spriteKey]) return base(NPC_ALIASES[spriteKey], 'sprite', { character: true, anim: undefined });
  if (TILES[key]) return base(key, 'tile', { flat: true, anim: undefined });
  warnOnce(`unknown object spriteKey "${spriteKey}" — using placeholder`);
  return base(OBJ_KEYS.chest, 'sprite', { placeholder: true, anim: undefined });
}

/** NPC 캐릭터 스프라이트 키 해석. 알 수 없으면 서리로 대체. */
export function resolveNpcSprite(spriteKey: string): string {
  if (NPC_ALIASES[spriteKey]) return NPC_ALIASES[spriteKey];
  if (SPRITES[spriteKey] && spriteKey.startsWith('char_')) return spriteKey;
  warnOnce(`unknown npc spriteKey "${spriteKey}" — using char_clerk`);
  return CHAR_KEYS.clerk;
}

export function playerSpriteKey(ambient: Ambient): string {
  return ambient === 'modern' ? CHAR_KEYS.playerModern : CHAR_KEYS.playerObserver;
}
