/**
 * 결록 아트 모듈 공개 API.
 *
 *  - SPRITES / TILES            : 레지스트리 (키 → PixelSprite)
 *  - TILE_KEYS / OBJ_KEYS / CHAR_KEYS / UI_KEYS : 키 상수
 *  - ANIMS                      : Phaser 애니메이션 정의
 *  - SPRITE_META / REFERENCE_NEEDED : TEMP/FINAL 상태, 고증 필요 목록
 *  - registerPhaserTextures / registerPhaserAnims : Phaser 연동
 *  - toDataURL / renderSpriteToCanvas : React/DOM 연동
 */
export * from './pixel';
export * from './registry';
export * from './palettes';
export { NINE_SLICE } from './ui';
export { CHAR_W, CHAR_H, DIRS } from './characters';
export type { Dir } from './characters';
export { Grid, sprite, rng, autoOutline, withPalette } from './draw';
