/**
 * 컷 화면의 정적. 미리 구운 Ep0 컷(public/cuts/ep0, 내부 130×174 픽셀)을 내부 해상도로 내려 받아,
 * 픽셀마다 고정된 문턱값으로 「맑기」만큼 컷 픽셀을 보이고 나머지는 노이즈로 채운다. 화면은 정수 배율(pixelated).
 */
export const CUT_W = 130;
export const CUT_H = 174;
/** 보이는 창(세로 일부) — 사람들이 있는 높이 */
export const VIEW_Y0 = 50;
export const VIEW_H = 96;

const cutUrl = (id: string) => `${import.meta.env.BASE_URL}cuts/ep0/${id}.webp`;

export async function loadCut(id: string): Promise<ImageData | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = cutUrl(id);
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = CUT_W;
    cv.height = CUT_H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, CUT_W, CUT_H);
    return g.getImageData(0, VIEW_Y0, CUT_W, VIEW_H);
  } catch {
    return null;
  }
}

export class StaticPainter {
  private thr: Float32Array;
  private out: ImageData;
  private seed = 0x2545f491;
  constructor(private g: CanvasRenderingContext2D) {
    this.out = g.createImageData(CUT_W, VIEW_H);
    this.thr = new Float32Array(CUT_W * VIEW_H);
    let s = 0x1234abcd;
    for (let i = 0; i < this.thr.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      // 픽셀마다 고정 문턱 — 맑기가 오르면 같은 픽셀부터 차례로 드러난다
      this.thr[i] = (s >>> 8) / 16777216;
    }
  }

  /** clarity 0 = 전부 노이즈, 1 = 컷 그대로 */
  paint(cut: ImageData | null, clarity: number): void {
    const d = this.out.data;
    const src = cut?.data;
    const n = CUT_W * VIEW_H;
    let s = this.seed;
    const k = Math.max(0, Math.min(1, clarity));
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (src && this.thr[i] < k) {
        d[o] = src[o];
        d[o + 1] = src[o + 1];
        d[o + 2] = src[o + 2];
      } else {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        const v = ((s >>> 0) & 0xff) * 0.42 + 10;
        // 차가운 강조(소실) 쪽으로 조금 기운 회색
        d[o] = v * 0.78;
        d[o + 1] = v * 0.95;
        d[o + 2] = v * 0.92;
      }
      d[o + 3] = 255;
    }
    this.seed = s;
    this.g.putImageData(this.out, 0, 0);
  }
}
