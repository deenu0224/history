#!/usr/bin/env node
/**
 * 에피소드 1 기억 컷을 미리 굽는다(런타임은 three 를 싣지 않고 이 이미지만 읽는다).
 *
 *   node scripts/render-cuts.mjs                 # 20컷 + 지워진 변형 + 방 배경 + 매니페스트 + 확인용 모음
 *   node scripts/render-cuts.mjs --only e1-5,e2-5 # 몇 장만 다시(매니페스트는 기존 것에 합침)
 *   node scripts/render-cuts.mjs --no-sheet       # 모음 이미지 생략
 *   node scripts/render-cuts.mjs --url http://localhost:5173/   # 이미 떠 있는 dev 서버 사용
 *
 * 과정: vite dev 서버 → Playwright Chromium(SwiftShader WebGL) → pov-dev.html?bake → window.__povBake.bake()
 * 그림체: 기본 픽셀아트(--bake-style pixel, 승인 시안 A). 예전 그림체는 --bake-style current.
 * 결과(public/cuts/ep1/):
 *   {id}.webp           1170×1560 (390×520 CSS @3x; pixel = 내부 130×174 ×9 에서 아래 6행 자름 · current = 234×312 ×5; 무손실)
 *   {id}.2x.webp        780×1040  (@2x; pixel = 130×174 ×6 에서 아래 4행 자름 · current = 195×260 ×4)
 *   {id}.erased[.2x].webp  닫히는 눈(E3) 컷의 06:00 뒤 지워진 기억
 *   room-backdrop.webp  그날의 방 도면 뒤 흐린 배경(사람 없음)
 *   manifest.json       컷별 파일·탭 영역(0–1 정규 사각형, 390 폭에서 ≥44px)·보임 검사
 * 확인용: mockups/out/ep1-cuts-sheet.png
 *
 * 그림체 비교 시안(기본 출력·public/cuts 는 건드리지 않는다):
 *   node scripts/render-cuts.mjs --compare                     # 4컷 × (current·pixel·painted·hd2d) → mockups/out/cut-style-compare.png
 *                                                              #   + e2-1 휴대폰 1:1(390 폭) → mockups/out/cut-style-phone.png
 *   node scripts/render-cuts.mjs --compare --cuts e1-5,e2-1 --styles pixel,painted
 *   node scripts/render-cuts.mjs --style pixel [--only e2-1]   # 한 그림체로 컷들 → mockups/out/cut-style-pixel/*.png
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/cuts/ep1');
const SHEET = join(ROOT, 'mockups/out/ep1-cuts-sheet.png');
const CSS = { w: 390, h: 520 };
const MIN_TOUCH = 44;
const DPR3 = { w: 234, h: 312, scale: 5 };
const DPR2 = { w: 195, h: 260, scale: 4 };

const args = process.argv.slice(2);
function arg0(k) {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
}
const bakeStyle0 = arg0('--bake-style') ?? 'pixel';
/** 탭 대상이 되려면 id 패스 해상도에서 보이는 픽셀이 이만큼은 있어야 한다(current 234×312 에서 40 = 픽셀아트 2배 렌더 260×348 에서 50) */
const MIN_PX = bakeStyle0 === 'pixel' ? 50 : 40;
const arg = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = arg('--only')?.split(',');
const noSheet = args.includes('--no-sheet');
let url = arg('--url');

let server;
if (!url) {
  const { createServer } = await import('vite');
  server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  url = server.resolvedUrls.local[0];
}
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', (e) => console.error('PAGEERR', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('ERR', m.text()));
await page.goto(new URL('pov-dev.html?bake', url).href);
await page.waitForFunction(() => !!window.__povBake, null, { timeout: 120000 });
const cuts = await page.evaluate(() => window.__povBake.cuts);

const STYLE_LABEL = { current: 'CURRENT', pixel: 'A 픽셀아트', painted: 'B 일러스트', hd2d: 'A2 HD-2D' };
const style = arg('--style');
if (args.includes('--compare') || (style && style !== 'current')) {
  const MOCK = join(ROOT, 'mockups/out');
  mkdirSync(MOCK, { recursive: true });
  const savePng = (path, dataUrl) => writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const bakeStyle = (id, v, st, outW = 390) => page.evaluate(([id, v, st, w]) => window.__povBake.bakeStyle(id, v, st, w), [id, v, st, outW]);
  const visLine = (r) => Object.entries(r.visible).filter(([k, px]) => (k.startsWith('fig_') && px >= 10) || (k.startsWith('slip:') && px >= 1)).map(([k, px]) => `${k}:${px}`).join(' ');
  if (style && !args.includes('--compare')) {
    const dir = join(MOCK, `cut-style-${style}`);
    mkdirSync(dir, { recursive: true });
    for (const c of cuts) {
      if (only && !only.includes(c.id)) continue;
      for (const v of c.erasable ? ['memory', 'erased'] : ['memory']) {
        const r = await bakeStyle(c.id, v, style);
        savePng(join(dir, `${c.id}${v === 'erased' ? '.erased' : ''}.png`), r.full);
        console.log(`${style} ${c.id} ${v}: ${r.ms.toFixed(0)}ms · ${visLine(r)}`);
      }
    }
  } else {
    const rowsSpec = (arg('--cuts') ?? 'e1-5,e2-1,e3-2,e3-2:erased,e4-5').split(',').map((s) => {
      const [id, v] = s.split(':');
      return { id, v: v ?? 'memory' };
    });
    const styles = (arg('--styles') ?? 'current,pixel,painted,hd2d').split(',');
    const rows = [];
    const phone = [];
    for (const { id, v } of rowsSpec) {
      const tiles = [];
      for (const st of styles) {
        const r = await bakeStyle(id, v, st, 390);
        const slips = Object.entries(r.visible).filter(([k, px]) => k.startsWith('slip:') && px >= 1).length;
        const figs = Object.entries(r.visible).filter(([k, px]) => k.startsWith('fig_') && px >= 10).length;
        tiles.push({ dataUrl: r.dataUrl, caption: `${r.w}×${r.h} · 인물 ${figs}${slips ? ` · 조각 ${slips}` : ''} · ${(r.ms / 1000).toFixed(1)}s` });
        console.log(`${st} ${id} ${v}: ${r.ms.toFixed(0)}ms · ${visLine(r)}`);
        if (id === 'e2-1' && v === 'memory') phone.push({ dataUrl: r.dataUrl, caption: STYLE_LABEL[st] ?? st });
        savePng(join(MOCK, `cut-style-${id}${v === 'erased' ? '.erased' : ''}-${st}.png`), r.full);
      }
      rows.push({ label: `${id}${v === 'erased' ? ' erased' : ''}`, tiles });
    }
    const cols = styles.map((s) => STYLE_LABEL[s] ?? s);
    const sheet = await page.evaluate(([rows, cols]) => window.__povBake.compareSheet(rows, cols, 390, '그림체 비교 — 칸 = 휴대폰 390 CSS px 폭 1:1'), [rows, cols]);
    savePng(join(MOCK, 'cut-style-compare.png'), sheet);
    console.log('compare →', join(MOCK, 'cut-style-compare.png'));
    if (phone.length) {
      const ph = await page.evaluate(([tiles]) => window.__povBake.compareSheet([{ label: 'e2-1', tiles }], tiles.map((t) => t.caption), 390, 'e2-1 · 390 CSS px 폭 1:1(휴대폰 화면 크기)'), [phone]);
      savePng(join(MOCK, 'cut-style-phone.png'), ph);
      console.log('phone →', join(MOCK, 'cut-style-phone.png'));
    }
  }
  await browser.close();
  await server?.close();
  process.exit(0);
}

mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) && only ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const out = manifest ?? {
  episode: 'ep1',
  provenance: 'reconstructed',
  note: '미리 구운 기억 컷(src/data/cuts/ep1.ts → scripts/render-cuts.mjs). 탭 영역은 렌더 id 패스로 계산한 실제 보이는 사람(가림·화면 밖 반영). figures 배열은 뒤쪽이 위(겹치면 뒤쪽 우선). listed = DESIGN_V5 표가 그 컷에 적은 사람(나머지는 그 시각 그 자리에 있어 보이는 사람).',
  css: CSS,
  style: bakeStyle0,
  sizes:
    bakeStyle0 === 'pixel'
      ? { dpr3: { w: 1170, h: 1560, internal: [130, 174], scale: 9 }, dpr2: { w: 780, h: 1040, internal: [130, 174], scale: 6 } }
      : { dpr3: { w: DPR3.w * DPR3.scale, h: DPR3.h * DPR3.scale, internal: [DPR3.w, DPR3.h] }, dpr2: { w: DPR2.w * DPR2.scale, h: DPR2.h * DPR2.scale, internal: [DPR2.w, DPR2.h] } },
  minTouchCss: MIN_TOUCH,
  cuts: {},
};

const write = (name, dataUrl) => {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(join(OUT, name), buf);
  return buf.length;
};
const bake =
  bakeStyle0 === 'pixel'
    ? (id, variant, s) => page.evaluate(([id, v, ow, oh]) => window.__povBake.bakePixel(id, v, ow, oh), [id, variant, s.w * s.scale, s.h * s.scale])
    : (id, variant, s, fmt = 'image/webp') =>
        page.evaluate(([id, v, w, h, sc, f]) => window.__povBake.bake(id, v, w, h, sc, f, 1), [id, variant, s.w, s.h, s.scale, fmt]).then((r) => ({ ...r, visW: r.w, visH: r.h }));

/** 내부 px 경계 → 0..1 사각형, CSS 390×520 에서 최소 44px 로 키움 */
function hitbox(v, w, h) {
  let x0 = v.x0 / w;
  let x1 = (v.x1 + 1) / w;
  let y0 = v.y0 / h;
  if (y0 >= 1) return null;
  let y1 = Math.min(1, (v.y1 + 1) / h);
  x1 = Math.min(1, x1);
  const grow = (a, b, min) => {
    if (b - a >= min) return [a, b];
    const c = (a + b) / 2;
    let s = Math.max(0, c - min / 2);
    s = Math.min(s, 1 - min);
    return [s, s + min];
  };
  [x0, x1] = grow(x0, x1, MIN_TOUCH / CSS.w);
  [y0, y1] = grow(y0, y1, MIN_TOUCH / CSS.h);
  const r = (n) => Math.round(n * 10000) / 10000;
  return { x: r(x0), y: r(y0), w: r(x1 - x0), h: r(y1 - y0) };
}

const sheetItems = [];
let total = 0;
for (const c of cuts) {
  if (only && !only.includes(c.id)) continue;
  const variants = c.erasable ? ['memory', 'erased'] : ['memory'];
  const entry = { witness: c.witnessId, time: c.time, files: {}, figures: [], slipsVisible: 0 };
  for (const v of variants) {
    const r3 = await bake(c.id, v, DPR3);
    const r2 = await bake(c.id, v, DPR2);
    const suf = v === 'erased' ? '.erased' : '';
    const n3 = `${c.id}${suf}.webp`;
    const n2 = `${c.id}${suf}.2x.webp`;
    const b3 = write(n3, r3.dataUrl);
    const b2 = write(n2, r2.dataUrl);
    total += b3 + b2;
    entry.files[v] = { dpr3: n3, dpr2: n2, bytes: { dpr3: b3, dpr2: b2 } };
    if (v === 'memory') {
      const figs = Object.entries(r3.visible).filter(([k, vis]) => k.startsWith('fig_') && vis.px >= MIN_PX);
      entry.figures = figs
        .map(([id, vis]) => ({ id, box: hitbox(vis, r3.visW, r3.visH), px: vis.px, listed: c.listed.includes(id) }))
        .filter((f) => f.box)
        .map(({ box, ...f }) => ({ id: f.id, ...box, px: f.px, listed: f.listed }))
        .sort((a, b) => b.w * b.h - a.w * a.h);
      entry.slipsVisible = Object.keys(r3.visible).filter((k) => k.startsWith('slip:') && r3.visible[k].px >= 2).length;
      entry.slipPx = Object.fromEntries(Object.entries(r3.visible).filter(([k]) => k.startsWith('slip:')).map(([k, vv]) => [k, vv.px]));
      entry.visiblePx = Object.fromEntries(Object.entries(r3.visible).filter(([k]) => k.startsWith('fig_')).map(([k, vv]) => [k, vv.px]));
    }
    sheetItems.push({ label: `${c.id}${v === 'erased' ? ' erased' : ''}`, dataUrl: r2.dataUrl });
    console.log(`${c.id} ${v}: ${(b3 / 1024).toFixed(0)}KB + ${(b2 / 1024).toFixed(0)}KB, ${r3.ms.toFixed(0)}ms, figures ${Object.entries(r3.visible).map(([k, x]) => `${k}:${x.px}`).join(' ')}`);
  }
  out.cuts[c.id] = entry;
}
if (!only) {
  const bd = await bake('room', 'backdrop', bakeStyle0 === 'pixel' ? { w: 130, h: 520 / 3, scale: 3 } : { w: 195, h: 260, scale: 2 });
  const b = write('room-backdrop.webp', bd.dataUrl);
  total += b;
  out.backdrop = { file: 'room-backdrop.webp', w: 390, h: 520, bytes: b, note: '흐린 방(사람 없음) — 그날의 방 도면 뒤 배경' };
  sheetItems.push({ label: 'room-backdrop', dataUrl: bd.dataUrl });
}
writeFileSync(manifestPath, JSON.stringify(out, null, 1) + '\n');

if (!noSheet && sheetItems.length) {
  const png = await page.evaluate(([items]) => window.__povBake.sheet(items, 5, 260, 347), [sheetItems]);
  mkdirSync(dirname(SHEET), { recursive: true });
  writeFileSync(SHEET, Buffer.from(png.split(',')[1], 'base64'));
  console.log('sheet →', SHEET);
}
const all = Object.values(out.cuts).flatMap((e) => Object.values(e.files).flatMap((f) => [f.bytes.dpr3, f.bytes.dpr2]));
console.log(`this run: ${(total / 1024).toFixed(0)} KB · manifest total: ${((all.reduce((a, b) => a + b, 0) + (out.backdrop?.bytes ?? 0)) / 1024).toFixed(0)} KB · ${statSync(manifestPath).size} B manifest`);
await browser.close();
await server?.close();
