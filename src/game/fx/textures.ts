/** 월드 전용 런타임 텍스처: 조명 풀(방사 그라디언트), 상호작용 마커(먹 표식). 전부 코드로 생성. */
import type Phaser from 'phaser';

export const FX_KEYS = {
  poolWarm: 'fx_pool_warm',
  poolCool: 'fx_pool_cool',
  poolMonitor: 'fx_pool_monitor',
  marker: 'fx_marker',
  shimmer: 'fx_shimmer',
} as const;

function radial(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [t, col] of stops) g.addColorStop(t, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/** 먹으로 찍은 작은 아래 화살(▼) 표식. 9×8, 한지색 테두리 + 먹. */
function markerCanvas(): HTMLCanvasElement {
  const rows = [
    '.hhhhhhh.',
    'hiiiiiiih',
    'hiiiiiiih',
    '.hiiiiih.',
    '..hiiih..',
    '...hih...',
    '....h....',
  ];
  const col: Record<string, string> = { h: '#dccfae', i: '#25211e' };
  const c = document.createElement('canvas');
  c.width = 9;
  c.height = rows.length;
  const ctx = c.getContext('2d')!;
  rows.forEach((r, y) => {
    [...r].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = col[ch];
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

export function registerFxTextures(scene: Phaser.Scene): void {
  const tx = scene.textures;
  const add = (key: string, canvas: HTMLCanvasElement, linear: boolean) => {
    if (tx.exists(key)) return;
    const t = tx.addCanvas(key, canvas);
    t?.setFilter(linear ? 0 : 1); // 0 LINEAR, 1 NEAREST
  };
  add(FX_KEYS.poolWarm, radial(256, [[0, 'rgba(255,196,120,0.6)'], [0.25, 'rgba(255,176,96,0.38)'], [0.6, 'rgba(240,140,64,0.13)'], [1, 'rgba(220,120,50,0)']]), true);
  add(FX_KEYS.poolCool, radial(256, [[0, 'rgba(150,200,230,0.9)'], [0.35, 'rgba(110,160,200,0.38)'], [1, 'rgba(80,120,170,0)']]), true);
  add(FX_KEYS.poolMonitor, radial(128, [[0, 'rgba(130,200,195,0.7)'], [0.4, 'rgba(80,150,150,0.28)'], [1, 'rgba(60,120,130,0)']]), true);
  add(FX_KEYS.shimmer, radial(64, [[0, 'rgba(225,235,240,0.55)'], [0.5, 'rgba(200,215,225,0.25)'], [1, 'rgba(190,205,220,0)']]), true);
  add(FX_KEYS.marker, markerCanvas(), false);
}
