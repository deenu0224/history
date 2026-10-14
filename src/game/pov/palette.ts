/**
 * 하나의 분위기(ART_DIRECTION_V5) — 단말과 기억 컷이 공유하는 토큰 + 컷 양자화 팔레트.
 * 규칙: 바탕은 먹(따뜻한 검정), 글자는 한지색, 따뜻한 강조는 등잔 호박 하나, 차가운 강조는 소실 청록 하나.
 */

/** 공유 토큰(단말 CSS 변수와 컷 후처리가 같은 값을 쓴다) */
export const MOOD = {
  ink0: '#0b0a09', // 가장 깊은 바탕(컷 레터박스·단말 바탕)
  ink1: '#131110', // 단말 표면
  ink2: '#1c1917', // 눌림·선택
  ink3: '#2a2521', // 구분선
  hanji: '#e9dfc6', // 본문 글자 = 한지(대비 ≥14:1 on ink0)
  hanjiMuted: '#a39780', // 보조 글자(대비 ≥7:1)
  amber: '#e2a85c', // 따뜻한 강조 하나: 등잔 = 기억·과거·복원
  amberDeep: '#8a5626',
  teal: '#5c9a95', // 차가운 강조 하나: 소실·시스템
  tealDeep: '#1f3a3a',
  seal: '#a04540', // 인장(복원 뒤). 강조가 아니라 재료
} as const;

export type MoodToken = keyof typeof MOOD;

/** CSS 변수로 내보내기(단말·dev 페이지) */
export function moodCssVars(): string {
  return Object.entries(MOOD)
    .map(([k, v]) => `--mood-${k.replace(/[A-Z0-9]/g, (m) => '-' + m.toLowerCase())}: ${v};`)
    .join(' ');
}

/** 기억 컷 팔레트(따뜻함). 재질당 3~5톤, 총 48색. 순흑·순백 없음. */
export const MEMORY_PALETTE: readonly string[] = [
  // 먹(따뜻한 어둠) — 컷 대부분이 여기에 앉는다
  '#0b0a09', '#131110', '#1b1714', '#231e1a', '#2d2621', '#383029', '#443a31',
  // 나무
  '#4f3a2a', '#634832', '#7a5a3d', '#94714c', '#ae8a5e',
  // 한지·빛
  '#c7b28b', '#dac7a0', '#e9dbb8', '#f4ead1',
  // 등잔 호박(유일한 따뜻한 강조)
  '#6e4320', '#97602c', '#c1843f', '#e2a85c', '#f3cd8a',
  // 붉은 관복
  '#3a1817', '#552321', '#73302b', '#934238',
  // 남색(슬레이트) 관복
  '#1a222c', '#263342', '#374a5e', '#526a80',
  // 초록 관복·단청 녹
  '#18241f', '#22362f', '#304b40', '#476a5b',
  // 돌·기와·회색
  '#4a4741', '#64605a', '#837e73', '#a6a091',
  // 피부
  '#5e3f2e', '#845b42', '#a97b5a', '#c99b74',
  // 마당 흙·하늘 바랜 빛
  '#b59a72', '#cdb68e',
  // 무명(서리 옷)
  '#8c877a', '#aea898', '#cbc4b2',
  // 먼 그늘의 차가운 푸름(실내 그림자 깊이) — 아주 조금
  '#20242a',
];

/** 지워진 기억 팔레트(차가움) — 소실 청록 계열 + 무채 */
export const ERASED_PALETTE: readonly string[] = [
  '#07090a', '#0d1113', '#13191c', '#1a2327', '#212d32', '#283a3e', '#30484b',
  '#3b5a5b', '#4a6f6d', '#5c8783', '#73a19b', '#93bcb4', '#b9d4cd',
  '#4b5257', '#626a70', '#7d868b', '#9ca4a8',
];

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** sRGB(0..255) → OKLab */
export function rgbToOklab(r: number, g: number, b: number): Rgb {
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * 5비트 RGB 조회표(32768칸) → 팔레트 색 번호. OKLab 거리, 밝기를 조금 더 무겁게(명암이 먼저 읽힌다).
 */
export function buildLut(palette: readonly string[]): { lut: Uint8Array; rgb: Uint8Array } {
  const rgb = new Uint8Array(palette.length * 3);
  const lab = palette.map((h, i) => {
    const c = hexToRgb(h);
    rgb.set(c, i * 3);
    return rgbToOklab(c[0], c[1], c[2]);
  });
  const lut = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r++)
    for (let g = 0; g < 32; g++)
      for (let b = 0; b < 32; b++) {
        const q = rgbToOklab((r << 3) | (r >> 2), (g << 3) | (g >> 2), (b << 3) | (b >> 2));
        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < lab.length; i++) {
          const p = lab[i];
          const dl = (q[0] - p[0]) * 1.4;
          const da = q[1] - p[1];
          const db = q[2] - p[2];
          const d = dl * dl + da * da + db * db;
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        lut[(r << 10) | (g << 5) | b] = best;
      }
  return { lut, rgb };
}
