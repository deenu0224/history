import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EP1 } from '@/data/v5';
import { cutNo } from '@/ui/lib/format';
import { cutSrc, type CutManifest } from '@/ui/lib/manifest';

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
