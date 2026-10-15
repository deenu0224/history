/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { EP0_CUTS, EP0_CUT_IDS, EP0_FIGURE_IDS, EP0_ROOM_BACKDROP, EP0_TAPPABLE } from '@/data/cuts/ep0';
import { ROOM_EP0, validatePovSpec } from '@/game/pov/room';
import { MEMORIAL_HEAD_COLUMNS, MEMORIAL_HEAD_GLYPHS } from '@/game/pov/glyphs';
import { CUTS0, DETAILS0 } from '@/data/v5/ep0/content';

const baked = import.meta.glob('../../public/cuts/ep0/*.{webp,json}', { eager: true, import: 'default' });
const onDisk = new Set(Object.keys(baked).map((k) => k.split('/').pop()!));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const manifest = baked['../../public/cuts/ep0/manifest.json'] as any;
const CSS = { w: 390, h: 520 };
/** 반올림(0.0001) 여유 */
const EPS = 0.1;

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  listed?: boolean;
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('ep0 cut render specs (「하룻밤」, one eye: 하위지)', () => {
  it('has exactly the three cut ids, all from 하위지’s seat with his own sleeves', () => {
    expect(EP0_CUTS.map((c) => c.id)).toEqual([...EP0_CUT_IDS]);
    expect([...EP0_CUT_IDS]).toEqual(['e0-1', 'e0-2', 'e0-3']);
    for (const c of EP0_CUTS) {
      expect(c.spec.room).toBe('ep0');
      expect(c.spec.witnessId).toBe('ha_wiji');
      expect(c.spec.seatId).toBe('HW');
      expect(c.spec.self?.hands).not.toBe('none');
      expect(c.spec.figures.some((f) => f.personId === 'ha_wiji')).toBe(false);
      expect(c.spec.time).toBe(c.time);
    }
  });

  it('uses only the fixed figure ids; every named person appears once; listed ⊂ tappable', () => {
    for (const c of EP0_CUTS) {
      const ids = c.spec.figures.map((f) => f.id);
      for (const id of ids) expect(EP0_FIGURE_IDS).toContain(id);
      for (const id of EP0_TAPPABLE) expect(ids.filter((x) => x === id).length, `${c.id} ${id}`).toBe(1);
      for (const id of c.listed) expect(EP0_TAPPABLE).toContain(id);
      expect(c.listed).toContain('fig_king');
    }
  });

  it('the king sits on the dais in the 익선관 silhouette and red robe; others wear 사모', () => {
    for (const c of EP0_CUTS) {
      const k = c.spec.figures.find((f) => f.id === 'fig_king')!;
      expect(k.hat).toBe('ikseon');
      expect(k.robe).toBe('royal');
      expect(k.elev).toBeGreaterThanOrEqual(ROOM_EP0.dais.h);
      for (const f of c.spec.figures.filter((f) => f.id !== 'fig_king')) expect(f.hat ?? 'samo').toBe('samo');
      expect(validatePovSpec(c.spec), c.id).toEqual([]);
    }
    expect(EP0_ROOM_BACKDROP.figures).toHaveLength(0);
  });

  it('the memorial heading reads 副提學 崔萬理 (원문 글자, 理) in two 8×9 columns', () => {
    expect(MEMORIAL_HEAD_COLUMNS.map((c) => c.join(''))).toEqual(['副提學', '崔萬理']);
    for (const g of Object.values(MEMORIAL_HEAD_GLYPHS)) {
      expect(g).toHaveLength(9);
      for (const row of g) expect(row).toMatch(/^[.#]{8}$/);
    }
    const e01 = EP0_CUTS.find((c) => c.id === 'e0-1')!;
    expect(e01.details).toEqual(['d_scroll_head', 'd_e0_dais']);
    expect(e01.spec.figures.find((f) => f.id === 'fig_choi')?.holding).toBe('memorial');
  });
});

describe('ep0 baked cuts (public/cuts/ep0)', () => {
  it('has both densities for every cut, the room backdrop and a manifest', () => {
    expect(manifest?.episode).toBe('ep0');
    for (const id of EP0_CUT_IDS) {
      expect(onDisk.has(`${id}.webp`), id).toBe(true);
      expect(onDisk.has(`${id}.2x.webp`), id).toBe(true);
      expect(manifest.cuts[id].files.memory).toEqual(expect.objectContaining({ dpr3: `${id}.webp`, dpr2: `${id}.2x.webp` }));
    }
    expect(onDisk.has('room-backdrop.webp')).toBe(true);
    expect(Object.keys(manifest.cuts)).toEqual([...EP0_CUT_IDS]);
  });

  it('every listed figure is really visible, flagged listed, with a hitbox ≥ 44 CSS px; fig_row is never listed', () => {
    for (const c of EP0_CUTS) {
      const figs: Box[] = manifest.cuts[c.id].figures;
      for (const id of c.listed) {
        const f = figs.find((x) => x.id === id);
        expect(f, `${c.id} ${id}`).toBeDefined();
        expect(f!.listed, `${c.id} ${id}`).toBe(true);
      }
      for (const f of figs) {
        expect(f.w * CSS.w, `${c.id} ${f.id} w`).toBeGreaterThanOrEqual(44 - EPS);
        expect(f.h * CSS.h, `${c.id} ${f.id} h`).toBeGreaterThanOrEqual(44 - EPS);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(1 + 1e-4);
        expect(f.y + f.h).toBeLessThanOrEqual(1 + 1e-4);
        if (f.id === 'fig_row') expect(f.listed).toBe(false);
        else expect(f.listed, `${c.id} ${f.id} is visible, so it is tappable`).toBe(true);
      }
    }
  });

  it('the king is visible in all three cuts and grows toward the key line (e0-3 is the biggest target)', () => {
    const area = EP0_CUT_IDS.map((id) => {
      const k = (manifest.cuts[id].figures as Box[]).find((f) => f.id === 'fig_king')!;
      expect(k, id).toBeDefined();
      return k.w * k.h;
    });
    expect(area[0]).toBeLessThan(area[1]);
    expect(area[1]).toBeLessThan(area[2]);
    expect(area[2]).toBeGreaterThan(0.4);
  });

  it('e0-1 shows 최만리·정창손·김문 and a generous scroll-heading detail that stays clear of the king', () => {
    const e = manifest.cuts['e0-1'];
    const ids = (e.figures as Box[]).map((f) => f.id);
    for (const id of ['fig_choi', 'fig_jeong', 'fig_kim', 'fig_king']) expect(ids).toContain(id);
    const d = (e.details as Box[]).find((x) => x.id === 'd_scroll_head')!;
    expect(d).toBeDefined();
    expect(d.w * CSS.w).toBeGreaterThanOrEqual(56 - EPS);
    expect(d.h * CSS.h).toBeGreaterThanOrEqual(56 - EPS);
    const king = (e.figures as Box[]).find((f) => f.id === 'fig_king')!;
    expect(overlap(d, king)).toBe(false);
    // 다른 컷에는 머리글 세부가 없다
    expect(manifest.cuts['e0-2'].details).toBeUndefined();
    expect(manifest.cuts['e0-3'].details).toBeUndefined();
  });

  it('every detail the cut data defines (content.ts CUTS0) has a matching render spec entry and a manifest hitbox ≥ 44 CSS px', () => {
    const known = new Set(DETAILS0.map((d) => d.id));
    for (const c of CUTS0) {
      const want = c.details ?? [];
      for (const id of want) expect(known.has(id), `${c.id} ${id}`).toBe(true);
      const spec = EP0_CUTS.find((x) => x.id === c.id)!;
      expect(spec, c.id).toBeDefined();
      expect([...(spec.details ?? [])].sort(), c.id).toEqual([...want].sort());
      const boxes: Box[] = manifest.cuts[c.id].details ?? [];
      expect(boxes.map((b) => b.id).sort(), c.id).toEqual([...want].sort());
      for (const b of boxes) {
        expect(b.w * CSS.w, `${c.id} ${b.id} w`).toBeGreaterThanOrEqual(44 - EPS);
        expect(b.h * CSS.h, `${c.id} ${b.id} h`).toBeGreaterThanOrEqual(44 - EPS);
        expect(b.x + b.w).toBeLessThanOrEqual(1 + 1e-4);
        expect(b.y + b.h).toBeLessThanOrEqual(1 + 1e-4);
      }
    }
  });
});
