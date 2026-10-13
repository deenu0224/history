/**
 * 결록 팔레트 — 전부 코드로 정의된 제한 팔레트.
 * 규칙: 재질당 3~4톤(밝음→어두움), 윤곽선은 순흑이 아닌 같은 계열의 어두운 색.
 * 각 색은 이름(코드에서 쓰는 키)과 단일 문자(스프라이트 데이터용)를 가진다.
 * '.' 는 투명 전용이라 풀에서 제외한다.
 */

/** [이름, hex] — hex 는 #rrggbb 또는 #rrggbbaa */
const DEFS = [
  // ── 과거: 한지(종이)
  ['hanji0', '#efe5cb'],
  ['hanji1', '#dccfae'],
  ['hanji2', '#c0b08a'],
  ['hanji3', '#988a68'],
  // ── 목재
  ['wood0', '#b07e52'],
  ['wood1', '#8a5c37'],
  ['wood2', '#64412a'],
  ['wood3', '#432b1c'],
  // ── 먹
  ['ink0', '#5b5249'],
  ['ink1', '#3a342f'],
  ['ink2', '#25211e'],
  ['ink3', '#14110f'],
  // ── 단청 녹(뇌록 느낌, 탁하게)
  ['green0', '#5a9078'],
  ['green1', '#3b6f5e'],
  ['green2', '#2f5d50'],
  ['green3', '#1f3f37'],
  // ── 단청 적(주홍, 탁하게)
  ['red0', '#c46a5a'],
  ['red1', '#a04540'],
  ['red2', '#7a2f2f'],
  ['red3', '#521f22'],
  // ── 황토/오커
  ['ochre0', '#dcb468'],
  ['ochre1', '#b88a3e'],
  ['ochre2', '#8a6428'],
  ['ochre3', '#5e4219'],
  // ── 슬레이트 블루
  ['blue0', '#7f9ab4'],
  ['blue1', '#566f8c'],
  ['blue2', '#3c5068'],
  ['blue3', '#263648'],
  // ── 마당 흙
  ['soil0', '#c9ae80'],
  ['soil1', '#b0946a'],
  ['soil2', '#937a54'],
  ['soil3', '#72603f'],
  // ── 돌
  ['stone0', '#b6b2a4'],
  ['stone1', '#918e82'],
  ['stone2', '#6c6a62'],
  ['stone3', '#4a4943'],
  // ── 풀
  ['grass0', '#8aa75a'],
  ['grass1', '#6a8a45'],
  ['grass2', '#4d6c36'],
  ['grass3', '#35502a'],
  // ── 기와(회청색)
  ['roof0', '#8e949e'],
  ['roof1', '#6e7480'],
  ['roof2', '#4e5460'],
  ['roof3', '#323844'],
  // ── 등불(따뜻한 램프빛)
  ['lamp0', '#fff0b8'],
  ['lamp1', '#ffd27a'],
  ['lamp2', '#e9a04a'],
  ['lamp3', '#a8602c'],
  ['glow0', '#ffd27a55'],
  ['glow1', '#ffd27a28'],
  // ── 그림자(반투명)
  ['shade0', '#14110f30'],
  ['shade1', '#14110f60'],
  ['shade2', '#14110fa0'],
  // ── 피부
  ['skin0', '#f0cfa8'],
  ['skin1', '#d9a67c'],
  ['skin2', '#a8774f'],
  ['skin3', '#6b4430'],
  // ── 삼베/무명(흰회색 옷)
  ['cloth0', '#e4e0d4'],
  ['cloth1', '#c8c4b6'],
  ['cloth2', '#a29e90'],
  ['cloth3', '#7a766a'],
  // ── 현대: 짙은 남색
  ['navy0', '#0f141c'],
  ['navy1', '#182130'],
  ['navy2', '#243046'],
  ['navy3', '#34445e'],
  ['navy4', '#4c6080'],
  // ── 현대: 청회색
  ['steel0', '#6f8196'],
  ['steel1', '#93a3b4'],
  ['steel2', '#b9c4ce'],
  ['steel3', '#dde3e7'],
  // ── 현대: 숯색
  ['char0', '#1e2024'],
  ['char1', '#2c2f35'],
  ['char2', '#3e424a'],
  ['char3', '#575c66'],
  // ── 현대: 절제된 청록
  ['teal0', '#1d4446'],
  ['teal1', '#2d6a6b'],
  ['teal2', '#4a9795'],
  ['teal3', '#86c4bd'],
  // ── 현대: 카펫
  ['carpet0', '#2c3a42'],
  ['carpet1', '#3a4b54'],
  ['carpet2', '#4c5f69'],
  // ── 현대: 밤 도시(창밖, 희미하게)
  ['night0', '#121a2a'],
  ['night1', '#1c2a44'],
  ['citylight', '#8f8c6c'],
] as const;

export type ColorName = (typeof DEFS)[number][0];

const CHAR_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-=+[]{};:,<>/?~_|';

/** 색 이름 → 팔레트 문자 */
export const C = {} as Record<ColorName, string>;
/** 팔레트 문자 → hex ('.' 제외) */
export const PALETTE: Record<string, string> = {};
/** 색 이름 → hex */
export const HEX = {} as Record<ColorName, string>;

DEFS.forEach(([name, hex], i) => {
  const ch = CHAR_POOL[i];
  if (!ch) throw new Error('palette char pool exhausted');
  C[name] = ch;
  PALETTE[ch] = hex;
  HEX[name] = hex;
});

/** 문서/도구용: 세계관별 팔레트 묶음 */
export const PALETTES = {
  past: {
    hanji: ['hanji0', 'hanji1', 'hanji2', 'hanji3'],
    wood: ['wood0', 'wood1', 'wood2', 'wood3'],
    ink: ['ink0', 'ink1', 'ink2', 'ink3'],
    dancheongGreen: ['green0', 'green1', 'green2', 'green3'],
    cinnabar: ['red0', 'red1', 'red2', 'red3'],
    ochre: ['ochre0', 'ochre1', 'ochre2', 'ochre3'],
    slateBlue: ['blue0', 'blue1', 'blue2', 'blue3'],
    soil: ['soil0', 'soil1', 'soil2', 'soil3'],
    stone: ['stone0', 'stone1', 'stone2', 'stone3'],
    grass: ['grass0', 'grass1', 'grass2', 'grass3'],
    roofTile: ['roof0', 'roof1', 'roof2', 'roof3'],
    lamp: ['lamp0', 'lamp1', 'lamp2', 'lamp3'],
    skin: ['skin0', 'skin1', 'skin2', 'skin3'],
    hemp: ['cloth0', 'cloth1', 'cloth2', 'cloth3'],
  },
  modern: {
    navy: ['navy0', 'navy1', 'navy2', 'navy3', 'navy4'],
    steel: ['steel0', 'steel1', 'steel2', 'steel3'],
    charcoal: ['char0', 'char1', 'char2', 'char3'],
    teal: ['teal0', 'teal1', 'teal2', 'teal3'],
    carpet: ['carpet0', 'carpet1', 'carpet2'],
    nightCity: ['night0', 'night1', 'citylight'],
    lamp: ['lamp0', 'lamp1', 'lamp2', 'lamp3'],
  },
} as const;

const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
export function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

/** hex(#rrggbb[aa]) → [r,g,b,a(0-255)] */
export function parseHex(hex: string): [number, number, number, number] {
  const h = hex.slice(1);
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

/** 채도를 낮추고 알파를 적용한 팔레트 변형(관찰자 버전 등) */
export function tintPalette(
  pal: Record<string, string>,
  opts: { desat: number; alpha: number; toward?: [number, number, number]; mix?: number },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, hex] of Object.entries(pal)) {
    const [r, g, b, a] = parseHex(hex);
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    let rr = r + (l - r) * opts.desat;
    let gg = g + (l - g) * opts.desat;
    let bb = b + (l - b) * opts.desat;
    if (opts.toward) {
      const m = opts.mix ?? 0.25;
      rr += (opts.toward[0] - rr) * m;
      gg += (opts.toward[1] - gg) * m;
      bb += (opts.toward[2] - bb) * m;
    }
    const to2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    out[k] = `#${to2(rr)}${to2(gg)}${to2(bb)}${to2(a * opts.alpha)}`;
  }
  return out;
}

/** 재질군 → 윤곽선 색(같은 계열의 어두운 색). 순흑 금지. */
const OUTLINE_GROUPS: [string[], ColorName][] = [
  [['hanji0', 'hanji1', 'hanji2', 'hanji3'], 'ink1'],
  [['wood0', 'wood1', 'wood2', 'wood3'], 'wood3'],
  [['ink0', 'ink1', 'ink2', 'ink3'], 'ink3'],
  [['green0', 'green1', 'green2', 'green3'], 'green3'],
  [['red0', 'red1', 'red2', 'red3'], 'red3'],
  [['ochre0', 'ochre1', 'ochre2', 'ochre3'], 'ochre3'],
  [['blue0', 'blue1', 'blue2', 'blue3'], 'blue3'],
  [['soil0', 'soil1', 'soil2', 'soil3'], 'soil3'],
  [['stone0', 'stone1', 'stone2', 'stone3'], 'stone3'],
  [['grass0', 'grass1', 'grass2', 'grass3'], 'grass3'],
  [['roof0', 'roof1', 'roof2', 'roof3'], 'roof3'],
  [['lamp0', 'lamp1', 'lamp2', 'lamp3'], 'lamp3'],
  [['skin0', 'skin1', 'skin2', 'skin3'], 'skin3'],
  [['cloth0', 'cloth1', 'cloth2', 'cloth3'], 'cloth3'],
  [['navy0', 'navy1', 'navy2', 'navy3', 'navy4'], 'navy0'],
  [['steel0', 'steel1', 'steel2', 'steel3'], 'navy1'],
  [['char0', 'char1', 'char2', 'char3'], 'char0'],
  [['teal0', 'teal1', 'teal2', 'teal3'], 'teal0'],
  [['carpet0', 'carpet1', 'carpet2'], 'carpet0'],
  [['night0', 'night1'], 'navy0'],
];
/** 팔레트 문자 → 윤곽선 문자 */
export const OUTLINE_OF: Record<string, string> = {};
for (const [names, out] of OUTLINE_GROUPS) for (const n of names) OUTLINE_OF[C[n as ColorName]] = C[out];
