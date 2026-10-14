// PWA 아이콘 생성기: 「錄」 14x14 픽셀 글리프 + 모서리가 빠진(缺) 호박색 틀. 외부 의존성 없이 PNG 를 직접 인코딩한다.
// 사용: node scripts/gen-icons.mjs  → public/icons/*.png
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const GLYPH = [
  '..............',
  '...#....#.....',
  '..###..#####..',
  '..#.#..#...#..',
  '.##....####...',
  '#####.....#...',
  '...#.....##...',
  '.####.#..#..#.',
  '...#...#####..',
  '.#.##....##...',
  '.###...#####..',
  '...####..#.##.',
  '.###.....#....',
  '........##....',
];
const BG = [0x14, 0x16, 0x1c];
const PAPER = [0xe8, 0xdf, 0xc8];
const AMBER = [0xd9, 0x9a, 0x3c];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
};
const png = (size, rgb) => {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** grid: 논리 격자 한 변. frame: 틀을 그릴지(마스커블은 안전영역 때문에 틀 없이 작게). */
const render = (size, grid, frame) => {
  const px = Buffer.alloc(size * size * 3);
  const cell = size / grid;
  const put = (gx, gy, col) => {
    const x0 = Math.round(gx * cell), x1 = Math.round((gx + 1) * cell);
    const y0 = Math.round(gy * cell), y1 = Math.round((gy + 1) * cell);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) Buffer.from(col).copy(px, (y * size + x) * 3);
  };
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) put(x, y, BG);
  const off = Math.floor((grid - 14) / 2);
  if (frame) {
    const a = off - 2, b = off + 15; // 틀: 한 칸 두께, 우상단 모서리를 비운다(缺)
    for (let i = a; i <= b; i++) {
      const gap = i >= b - 5;
      if (!gap) put(i, a, AMBER); // 위
      put(i, b, AMBER); // 아래
      put(a, i, AMBER); // 왼
      if (i > a + 5) put(b, i, AMBER); // 오른(위쪽이 빠짐)
    }
  }
  GLYPH.forEach((row, gy) => [...row].forEach((ch, gx) => ch === '#' && put(off + gx, off + gy, PAPER)));
  return png(size, px);
};

const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(out, { recursive: true });
const files = {
  'icon-192.png': render(192, 20, true),
  'icon-512.png': render(512, 20, true),
  'icon-maskable-512.png': render(512, 24, false),
  'apple-touch-icon.png': render(180, 20, true),
  'favicon-32.png': render(32, 20, true),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(out + name, buf);
  console.log(name, buf.length);
}
