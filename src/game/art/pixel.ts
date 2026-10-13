/**
 * 픽셀아트 포맷 + 렌더러.
 * 스프라이트는 전부 코드로 정의된 문자 격자이며, 런타임에 캔버스로 그려 Phaser 텍스처/ React <img> 로 쓴다.
 * 순수 함수(validate 등)는 DOM 없이 동작하고, 렌더 함수만 DOM(canvas)을 요구한다.
 */
import type Phaser from 'phaser';
import { SPRITES, TILES } from './registry';

export interface PixelSprite {
  w: number;
  h: number;
  /** 문자 → CSS hex(#rrggbb 또는 #rrggbbaa). '.' 는 투명이라 정의하지 않는다. */
  palette: Record<string, string>;
  /** 프레임 배열. 각 프레임은 h 개의 행, 각 행은 w 글자. */
  frames: string[][];
  /** 발/기준점(px). 기본은 하단 중앙. */
  anchor?: { x: number; y: number };
}

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/** 스프라이트 검증. 문제 목록을 반환(빈 배열이면 유효). 순수 함수. */
export function validateSprite(sprite: PixelSprite): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(sprite.w) || !Number.isInteger(sprite.h) || sprite.w <= 0 || sprite.h <= 0) {
    errs.push(`invalid size ${sprite.w}x${sprite.h}`);
    return errs;
  }
  if (sprite.frames.length === 0) errs.push('no frames');
  if ('.' in sprite.palette) errs.push("palette must not define '.' (transparent)");
  for (const [k, v] of Object.entries(sprite.palette)) {
    if (k.length !== 1) errs.push(`palette key "${k}" must be a single char`);
    if (!HEX_RE.test(v)) errs.push(`palette "${k}" has invalid color ${v}`);
  }
  sprite.frames.forEach((frame, fi) => {
    if (frame.length !== sprite.h) errs.push(`frame ${fi}: ${frame.length} rows, expected ${sprite.h}`);
    let opaque = 0;
    frame.forEach((row, y) => {
      if (row.length !== sprite.w) errs.push(`frame ${fi} row ${y}: length ${row.length}, expected ${sprite.w}`);
      for (const ch of row) {
        if (ch === '.') continue;
        opaque++;
        if (!(ch in sprite.palette)) {
          errs.push(`frame ${fi} row ${y}: char "${ch}" not in palette`);
          break;
        }
      }
    });
    if (opaque === 0) errs.push(`frame ${fi} is fully transparent`);
  });
  if (sprite.anchor) {
    const { x, y } = sprite.anchor;
    if (x < 0 || y < 0 || x > sprite.w || y > sprite.h) errs.push('anchor outside sprite');
  }
  return errs;
}

/** 한 프레임의 RGBA 바이트 (캔버스 없이도 사용 가능: 테스트/도구용) */
export function spriteToRGBA(sprite: PixelSprite, frameIndex: number): Uint8ClampedArray {
  const frame = sprite.frames[frameIndex];
  const out = new Uint8ClampedArray(sprite.w * sprite.h * 4);
  if (!frame) return out;
  const cache: Record<string, [number, number, number, number]> = {};
  for (let y = 0; y < sprite.h; y++) {
    const row = frame[y] ?? '';
    for (let x = 0; x < sprite.w; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      let c = cache[ch];
      if (!c) {
        const hex = sprite.palette[ch];
        if (!hex) continue;
        const h = hex.slice(1);
        c = [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
          h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255,
        ];
        cache[ch] = c;
      }
      const i = (y * sprite.w + x) * 4;
      out[i] = c[0];
      out[i + 1] = c[1];
      out[i + 2] = c[2];
      out[i + 3] = c[3];
    }
  }
  return out;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 한 프레임을 scale 배로 확대한 캔버스로 렌더(최근접). */
export function renderSpriteToCanvas(sprite: PixelSprite, frameIndex: number, scale = 1): HTMLCanvasElement {
  const s = Math.max(1, Math.floor(scale));
  const canvas = makeCanvas(sprite.w * s, sprite.h * s);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const frame = sprite.frames[frameIndex];
  if (!frame) return canvas;
  for (let y = 0; y < sprite.h; y++) {
    const row = frame[y] ?? '';
    for (let x = 0; x < sprite.w; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const color = sprite.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  return canvas;
}

/** 전 프레임을 가로 한 줄 스트립으로 렌더 (스프라이트시트용). */
export function renderSpriteStrip(sprite: PixelSprite, scale = 1): HTMLCanvasElement {
  const s = Math.max(1, Math.floor(scale));
  const n = sprite.frames.length;
  const canvas = makeCanvas(sprite.w * s * n, sprite.h * s);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n; i++) ctx.drawImage(renderSpriteToCanvas(sprite, i, s), i * sprite.w * s, 0);
  return canvas;
}

const urlCache = new Map<string, string>();

/** React <img src> 용 data URL (캐시됨). sprite 는 객체 또는 레지스트리 키. */
export function toDataURL(sprite: PixelSprite | string, frame = 0, scale = 1): string {
  const sp = typeof sprite === 'string' ? (SPRITES[sprite] ?? TILES[sprite]) : sprite;
  if (!sp) return '';
  const id = (typeof sprite === 'string' ? sprite : spriteId(sp)) + `#${frame}x${scale}`;
  const hit = urlCache.get(id);
  if (hit) return hit;
  const url = renderSpriteToCanvas(sp, frame, scale).toDataURL('image/png');
  urlCache.set(id, url);
  return url;
}

const idMap = new WeakMap<PixelSprite, string>();
let idSeq = 0;
function spriteId(sp: PixelSprite): string {
  let id = idMap.get(sp);
  if (!id) {
    id = `anon${idSeq++}`;
    idMap.set(sp, id);
  }
  return id;
}

/**
 * 모든 스프라이트/타일을 Phaser 텍스처로 등록한다.
 * - 텍스처 키 = 레지스트리 키. 프레임 이름은 숫자 0..n-1 (generateFrameNumbers 와 호환).
 * - 이미 등록된 키는 건너뛴다(씬 재시작 안전).
 * - 최근접 필터 적용.
 */
export function registerPhaserTextures(scene: Phaser.Scene): void {
  const textures = scene.textures;
  const add = (key: string, sp: PixelSprite) => {
    if (textures.exists(key)) return;
    const strip = renderSpriteStrip(sp, 1);
    const tex = textures.addCanvas(key, strip);
    if (!tex) return;
    for (let i = 0; i < sp.frames.length; i++) tex.add(i, 0, i * sp.w, 0, sp.w, sp.h);
    tex.setFilter(1); // Phaser.Textures.FilterMode.NEAREST
  };
  for (const [key, sp] of Object.entries(TILES)) add(key, sp);
  for (const [key, sp] of Object.entries(SPRITES)) add(key, sp);
}
