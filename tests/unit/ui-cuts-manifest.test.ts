// @ts-expect-error — @types/node 없이 파일 존재만 본다(vitest 는 node 에서 돈다)
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EP0, EP1 } from '@/data/v5';
import { cutNo } from '@/ui/lib/format';
import { backdropSrc, cutDir, cutSrc, type CutManifest } from '@/ui/lib/manifest';

const DIR = 'public/cuts/ep1';
const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as CutManifest;

describe('미리 구운 컷 목록(UI 가 읽는 것)', () => {
  it('에피소드의 모든 컷이 목록에 있고 이미지 파일이 있다', () => {
    for (const c of EP1.cuts) {
      const e = manifest.cuts[c.id];
      expect(e, c.id).toBeDefined();
      for (const f of [e!.files.memory.dpr3, e!.files.memory.dpr2]) expect(existsSync(`${DIR}/${f}`), f).toBe(true);
      if (e!.files.erased) for (const f of [e!.files.erased.dpr3, e!.files.erased.dpr2]) expect(existsSync(`${DIR}/${f}`), f).toBe(true);
    }
  });
  it('지워진 기억(청록) 변형은 닫히는 눈(E3)에만 있다', () => {
    for (const c of EP1.cuts) expect(!!manifest.cuts[c.id]!.files.erased, c.id).toBe(c.eyeId === 'E3');
  });
  it('탭 영역은 화면 안에 있고, 이름 붙일 수 있는(listed) 사람은 그 컷의 사람이다', () => {
    for (const c of EP1.cuts)
      for (const b of manifest.cuts[c.id]!.figures) {
        if (b.listed) expect(c.figures.some((f) => f.figureId === b.id), `${c.id}/${b.id}`).toBe(true);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(1.0001);
        expect(b.y + b.h).toBeLessThanOrEqual(1.0001);
      }
  });
  it('이름 붙일 사람은 컷마다 listed 로 표시된다(없는 컷도 있다)', () => {
    const listed = EP1.cuts.flatMap((c) => manifest.cuts[c.id]!.figures.filter((b) => b.listed).map((b) => `${c.id}/${b.id}`));
    expect(listed).toEqual(expect.arrayContaining(['e1-2/fig_yi', 'e2-1/fig_yun', 'e2-2/fig_eo', 'e3-1/fig_hong']));
  });
  it('srcset 은 상대 경로다(vite base ./)', () => {
    const s = cutSrc(manifest.cuts['e3-1'], 'e3-1', 'erased');
    expect(s.src).toBe('./cuts/ep1/e3-1.erased.2x.webp');
    expect(s.srcSet).toBe('./cuts/ep1/e3-1.erased.2x.webp 780w, ./cuts/ep1/e3-1.erased.webp 1170w');
    expect(cutSrc(undefined, 'e1-1').src).toBe('./cuts/ep1/e1-1.2x.webp');
  });
  it('컷 번호 표기', () => {
    expect(cutNo('e1-4')).toBe('1-4');
  });
});

describe('에피소드 0 컷 목록', () => {
  const D0 = 'public/cuts/ep0';
  const m0 = JSON.parse(readFileSync(`${D0}/manifest.json`, 'utf8')) as CutManifest;
  it('Ep0 의 모든 컷이 목록에 있고 이미지 파일이 있다', () => {
    for (const c of EP0.cuts) {
      const e = m0.cuts[c.id];
      expect(e, c.id).toBeDefined();
      for (const f of [e!.files.memory.dpr3, e!.files.memory.dpr2]) expect(existsSync(`${D0}/${f}`), f).toBe(true);
    }
    expect(existsSync(`${D0}/room-backdrop.webp`)).toBe(true);
  });
  it('세부(details) 탭 영역은 화면 안에 있고, 그 컷이 가진 본 것의 id 다 — 사람 상자보다 먼저 눌린다', () => {
    const boxes = EP0.cuts.flatMap((c) => (m0.cuts[c.id]!.details ?? []).map((d) => ({ cut: c, d })));
    expect(boxes.map((b) => b.d.id)).toContain('d_scroll_head');
    for (const { cut, d } of boxes) {
      expect(cut.details, `${cut.id}/${d.id}`).toContain(d.id);
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.x + d.w).toBeLessThanOrEqual(1.0001);
      expect(d.y + d.h).toBeLessThanOrEqual(1.0001);
    }
  });
  it('에피소드마다 경로가 다르다', () => {
    expect(cutDir('ep0')).toBe('./cuts/ep0/');
    expect(backdropSrc('ep0')).toBe('./cuts/ep0/room-backdrop.webp');
    expect(cutSrc(m0.cuts['e0-1'], 'e0-1', 'memory', 'ep0').srcSet).toBe('./cuts/ep0/e0-1.2x.webp 780w, ./cuts/ep0/e0-1.webp 1170w');
  });
});
