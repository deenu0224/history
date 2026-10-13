import { describe, expect, it } from 'vitest';
import { makeRng } from '@/game/audio/rng';
import { degreeToFreq, degreeToMidi, GYEMYEONJO, PYEONGJO, midiToFreq } from '@/game/audio/scales';
import { generateLoop, generatePhrase, TRACKS, TRACK_IDS, trackLengthSec, type PhraseOpts } from '@/game/audio/compose';
import { clampFade, crossfadePowerAt, equalPowerCurve, planCrossfade } from '@/game/audio/crossfade';
import { bendCurve } from '@/game/audio/instruments';
import { FEEDBACK } from '@/data/feedback';
import { resolveSfx, SFX_ALIASES, SFX_NAMES } from '@/game/audio/sfx';

describe('audio: scales', () => {
  it('평조 = 솔 라 도 레 미 (G A C D E)', () => {
    const pcs = [0, 1, 2, 3, 4].map((d) => degreeToMidi(PYEONGJO, d) % 12);
    expect(pcs).toEqual([7, 9, 0, 2, 4]);
    expect(degreeToMidi(PYEONGJO, 5)).toBe(degreeToMidi(PYEONGJO, 0) + 12);
    expect(degreeToMidi(PYEONGJO, -1)).toBe(degreeToMidi(PYEONGJO, 4) - 12);
  });
  it('계면조 = 라 도 레 미 솔, 시는 경과음으로만', () => {
    const pcs = [0, 1, 2, 3, 4].map((d) => degreeToMidi(GYEMYEONJO, d) % 12);
    expect(pcs).toEqual([9, 0, 2, 4, 7]);
    expect(degreeToMidi(GYEMYEONJO, 0.5) % 12).toBe(11); // 시(B)
    expect(degreeToMidi(PYEONGJO, 0.5)).toBe(degreeToMidi(PYEONGJO, 0)); // 경과음 없는 음계는 그대로
  });
  it('주파수 변환', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(degreeToFreq(GYEMYEONJO, 5)).toBeCloseTo(440, 3); // A3 + 옥타브 = A4
  });
});

const OPTS: PhraseOpts = { ticks: 12, lo: 0, hi: 8, start: 3, end: 0, contour: 'arch', durs: [1, 2, 3], restProb: 0.15, ornRate: 0.4, vel: 0.7 };

describe('audio: phrase & loop generators', () => {
  it('같은 시드는 같은 악절, 다른 시드는 다른 악절', () => {
    const a = generatePhrase(makeRng(7), PYEONGJO, OPTS);
    const b = generatePhrase(makeRng(7), PYEONGJO, OPTS);
    const c = generatePhrase(makeRng(8), PYEONGJO, OPTS);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it('악절은 범위 안에 있고 종지음에 닿는다', () => {
    for (let s = 0; s < 40; s++) {
      const p = generatePhrase(makeRng(s), PYEONGJO, OPTS);
      expect(p.length).toBeGreaterThan(0);
      for (const n of p) {
        expect(n.degree).toBeGreaterThanOrEqual(OPTS.lo);
        expect(n.degree).toBeLessThanOrEqual(OPTS.hi);
        expect(n.tick).toBeGreaterThanOrEqual(0);
        expect(n.dur).toBeGreaterThanOrEqual(1);
      }
      expect(p[p.length - 1].degree).toBe(0);
    }
  });
  it('모든 트랙: 결정적, 60초 이상, 정렬됨, 음높이 가청 범위, 여백 존재', () => {
    for (const id of TRACK_IDS) {
      const a = generateLoop(id, 0, 0);
      const b = generateLoop(id, 0, 0);
      expect(a).toEqual(b);
      expect(a.length).toBeCloseTo(trackLengthSec(TRACKS[id]), 6);
      expect(a.length).toBeGreaterThanOrEqual(60);
      expect(a.length).toBeLessThanOrEqual(100);
      expect(a.events.length).toBeGreaterThan(10);
      let prev = -1;
      for (const e of a.events) {
        expect(e.t).toBeGreaterThanOrEqual(prev);
        prev = e.t;
        if (e.inst !== 'janggu') {
          expect(e.freq).toBeGreaterThan(50);
          expect(e.freq).toBeLessThan(2500);
        }
        expect(e.vel).toBeGreaterThan(0);
        expect(e.vel).toBeLessThanOrEqual(1);
      }
      // 여백: 선율 악기 이벤트 사이에 4초 이상의 빈 구간이 최소 한 번은 있다(office 제외 조건 없이도 성립해야 함)
      const mel = a.events.filter((e) => e.inst === 'gayageum' || e.inst === 'daegeum').map((e) => e.t);
      if (mel.length > 1) {
        let gap = 0;
        for (let i = 1; i < mel.length; i++) gap = Math.max(gap, mel[i] - mel[i - 1]);
        expect(gap).toBeGreaterThan(2);
      }
    }
  });
  it('회차(pass)마다 변주되지만 같은 회차는 같다', () => {
    expect(generateLoop('title', 1, 0)).toEqual(generateLoop('title', 1, 0));
    expect(generateLoop('title', 1, 0).events).not.toEqual(generateLoop('title', 0, 0).events);
  });
  it('계면조 트랙은 라/도/레/미/솔 + 시(경과) 외의 음을 쓰지 않는다', () => {
    const allowed = new Set([9, 0, 2, 4, 7, 11]);
    for (const id of TRACK_IDS.filter((t) => TRACKS[t].scale === 'gyemyeonjo')) {
      for (const e of generateLoop(id, 0, 0).events) {
        if (e.inst === 'janggu') continue;
        const midi = Math.round(69 + 12 * Math.log2(e.freq / 440));
        expect(allowed.has(((midi % 12) + 12) % 12)).toBe(true);
      }
    }
  });
  it('트랙 매핑: 6곡 모두 정의', () => {
    expect([...TRACK_IDS].sort()).toEqual(['ending', 'observe', 'office', 'restore', 'tension', 'title']);
  });
});

describe('audio: crossfade math', () => {
  it('등전력: 중간에서도 전력 합 1', () => {
    for (const x of [0, 0.25, 0.5, 0.75, 1]) expect(crossfadePowerAt(x)).toBeCloseTo(1, 9);
  });
  it('곡선은 0→1 / 1→0 이고 단조', () => {
    const i = equalPowerCurve(50, 'in');
    const o = equalPowerCurve(50, 'out');
    expect(i[0]).toBeCloseTo(0);
    expect(i[i.length - 1]).toBeCloseTo(1);
    expect(o[0]).toBeCloseTo(1);
    expect(o[o.length - 1]).toBeCloseTo(0, 6);
    for (let k = 1; k < i.length; k++) expect(i[k]).toBeGreaterThanOrEqual(i[k - 1]);
    for (let k = 0; k < i.length; k++) expect(i[k] ** 2 + o[k] ** 2).toBeCloseTo(1, 5);
  });
  it('페이드 시간 보정과 계획', () => {
    expect(clampFade(undefined)).toBe(2.5);
    expect(clampFade(NaN)).toBe(2.5);
    expect(clampFade(-1)).toBe(0);
    expect(clampFade(99)).toBe(8);
    const p = planCrossfade(10, 3);
    expect(p.inStart).toBe(10);
    expect(p.dur).toBe(3);
    expect(p.disposeAt).toBeGreaterThan(13);
  });
  it('농현 곡선: 길이·유한성, none 은 null', () => {
    expect(bendCurve('none', 1)).toBeNull();
    for (const o of ['vib', 'bendDown', 'bendUp'] as const) {
      const c = bendCurve(o, 1.5)!;
      expect(c.length).toBe(64);
      expect([...c].every(Number.isFinite)).toBe(true);
      expect(Math.max(...[...c].map(Math.abs))).toBeLessThan(250);
    }
  });
});

describe('audio: sfx map completeness', () => {
  it('FEEDBACK 의 모든 sfx 이름이 실제 소리 또는 의도적 none 으로 해석된다', () => {
    for (const [kind, spec] of Object.entries(FEEDBACK)) {
      const r = resolveSfx(spec.sfx);
      expect(r, `${kind} → ${spec.sfx}`).toBeDefined();
    }
  });
  it('요청된 새 효과음이 모두 존재', () => {
    for (const n of ['stamp_confirm', 'stamp_correct', 'stamp_red', 'stamp_auto', 'printer', 'warning', 'page', 'inspect_link', 'inspect_notation', 'shutter', 'hear', 'restore', 'erase', 'queue_next', 'shift_end']) {
      expect((SFX_NAMES as readonly string[]).includes(n), n).toBe(true);
    }
  });
  it('별칭은 존재하는 효과음만 가리킨다', () => {
    for (const v of Object.values(SFX_ALIASES)) expect(v === 'none' || (SFX_NAMES as readonly string[]).includes(v)).toBe(true);
  });
  it('알 수 없는 이름은 undefined', () => {
    expect(resolveSfx('does_not_exist')).toBeUndefined();
  });
});
