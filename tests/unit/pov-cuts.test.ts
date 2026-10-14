import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EP1_CUTS, EP1_ROOM_BACKDROP } from '@/data/cuts/ep1';
import { CUT_IDS, CUT_TIMES, FIGURE_IDS } from '@/data/v5/ids';
import { ROOM } from '@/data/v5/room';
import { ROOM_EP1, validatePovSpec } from '@/game/pov/room';

const OUT = join(__dirname, '../../public/cuts/ep1');
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;

/** 눈 번호 → 주인(personId)·앞쪽 덮개 소매 색(ART_DIRECTION_V5 §5) */
const EYES = {
  1: { person: 'yun_hyoson', seat: 'W', robe: 'green' },
  2: { person: 'yi_geukdon', seat: 'Y', robe: 'red' },
  3: { person: 'eo_segyeom', seat: 'O', robe: 'red-dark' },
  4: { person: 'hong_gwidal', seat: 'H', robe: 'blue' },
} as const;

describe('ep1 cut render specs (DESIGN_V5 §4.4, §13)', () => {
  it('cover exactly the engine cut ids with the same times', () => {
    expect(EP1_CUTS.map((c) => c.id)).toEqual([...CUT_IDS]);
    for (const c of EP1_CUTS) {
      expect(c.time).toBe(CUT_TIMES[c.id]);
      expect(c.spec.time).toBe(c.time);
    }
  });

  it('each cut is seen from its witness seat with that witness’s own sleeve', () => {
    for (const c of EP1_CUTS) {
      const e = EYES[c.eye];
      expect(c.id.startsWith(`e${c.eye}-`)).toBe(true);
      expect(c.spec.witnessId).toBe(e.person);
      expect(c.spec.seatId).toBe(e.seat);
      expect(c.spec.self?.robe).toBe(e.robe);
      // 눈의 주인은 자기 컷에 사람으로 그려지지 않는다
      expect(c.spec.figures.some((f) => f.personId === e.person)).toBe(false);
    }
  });

  it('uses only engine figure ids, at most once per cut; listed/absent are figures in the scene', () => {
    for (const c of EP1_CUTS) {
      const ids = c.spec.figures.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(FIGURE_IDS).toContain(id);
      for (const id of [...c.listed, ...(c.absent ?? [])]) expect(ids).toContain(id);
    }
  });

  it('obeys the speaking-pose rule and never draws 김일손', () => {
    for (const c of EP1_CUTS) expect(validatePovSpec(c.spec), c.id).toEqual([]);
    const speakers = new Set(EP1_CUTS.flatMap((c) => c.spec.figures.filter((f) => f.pose === 'seated-address').map((f) => f.personId)));
    expect([...speakers].sort()).toEqual(['unknown_ua', 'yi_geukdon', 'yun_hyoson']);
    expect(EP1_CUTS.some((c) => c.spec.figures.some((f) => f.personId === 'kim_ilson'))).toBe(false);
  });

  it('only the closing eye (E3 어세겸) gets erased variants; the room backdrop shows nobody', () => {
    expect(EP1_CUTS.filter((c) => c.erasable).map((c) => c.id)).toEqual(['e3-1', 'e3-2', 'e3-3', 'e3-4', 'e3-5']);
    expect(EP1_ROOM_BACKDROP.figures).toHaveLength(0);
  });

  it('the far-corner witness (E4 홍귀달) hears the door reading from 9.21 칸 — beyond the reading radius 8', () => {
    const b = ROOM_EP1.seats.B;
    const h = ROOM_EP1.seats.H;
    const d = Math.hypot(b.x - h.x, b.y - h.y);
    expect(d).toBeCloseTo(9.21, 2);
    expect(d).toBeGreaterThan(ROOM.hearingRadius.read);
    const e42 = EP1_CUTS.find((c) => c.id === 'e4-2')!;
    expect(e42.spec.figures.find((f) => f.id === 'fig_msg')?.seat).toBe('B');
  });

  it('render room seats match the engine room plan', () => {
    for (const s of ROOM.seats) {
      const r = ROOM_EP1.seats[s.id as keyof typeof ROOM_EP1.seats];
      expect([r.x, r.y], s.id).toEqual([s.x, s.y]);
    }
  });

  it('slip occlusion cuts are 15:00 from W (윤효손, 5 visible) and Y (이극돈, 6 visible)', () => {
    const e15 = EP1_CUTS.find((c) => c.id === 'e1-5')!;
    const e25 = EP1_CUTS.find((c) => c.id === 'e2-5')!;
    expect([e15.spec.seatId, e15.slipsVisible, e15.time]).toEqual(['W', 5, '15:00']);
    expect([e25.spec.seatId, e25.slipsVisible, e25.time]).toEqual(['Y', 6, '15:00']);
    expect(e25.spec.props?.nameTag).toBe(true);
  });
});

describe.runIf(manifest)('baked ep1 cuts (public/cuts/ep1/manifest.json)', () => {
  it('has every cut, both densities, erased variants for E3 and the backdrop on disk', () => {
    let bytes = 0;
    for (const c of EP1_CUTS) {
      const e = manifest.cuts[c.id];
      expect(e, c.id).toBeTruthy();
      const variants = c.erasable ? ['memory', 'erased'] : ['memory'];
      expect(Object.keys(e.files).sort()).toEqual(variants.sort());
      for (const v of variants)
        for (const f of [e.files[v].dpr3, e.files[v].dpr2]) {
          expect(existsSync(join(OUT, f)), f).toBe(true);
          bytes += statSync(join(OUT, f)).size;
        }
    }
    expect(existsSync(join(OUT, manifest.backdrop.file))).toBe(true);
    expect(manifest.sizes.dpr3).toMatchObject({ w: 1170, h: 1560 });
    expect(manifest.sizes.dpr2).toMatchObject({ w: 780, h: 1040 });
    expect(bytes).toBeLessThan(3 * 1024 * 1024);
  });

  it('hitboxes are normalized, inside the cut and at least 44 CSS px at 390×520', () => {
    for (const c of EP1_CUTS)
      for (const f of manifest.cuts[c.id].figures) {
        expect(FIGURE_IDS).toContain(f.id);
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(1.0001);
        expect(f.y + f.h).toBeLessThanOrEqual(1.0001);
        expect(f.w * 390).toBeGreaterThanOrEqual(43.9);
        expect(f.h * 520).toBeGreaterThanOrEqual(43.9);
      }
  });

  it('what each witness sees matches DESIGN_V5: listed people visible, out-of-sight people not, slip counts', () => {
    for (const c of EP1_CUTS) {
      const seen = manifest.cuts[c.id].figures.map((f: { id: string }) => f.id);
      for (const id of c.listed) expect(seen, `${c.id} should show ${id}`).toContain(id);
      for (const id of c.absent ?? []) expect(seen, `${c.id} must not show ${id}`).not.toContain(id);
      if (c.slipsVisible !== undefined) expect(manifest.cuts[c.id].slipsVisible, c.id).toBe(c.slipsVisible);
    }
    // 가림: W 자리에서 가려지는 한 장은 사초 더미 곁의 마지막 조각
    expect(manifest.cuts['e1-5'].slipPx['slip:5']).toBeUndefined();
    expect(manifest.cuts['e2-5'].slipPx['slip:5']).toBeGreaterThan(0);
  });
});
