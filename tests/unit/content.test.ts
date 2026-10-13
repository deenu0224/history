/// <reference types="vite/client" />
import historicalSourcesDoc from '../../docs/HISTORICAL_SOURCES.md?raw';
import { indexContent } from '@/core/content';
import { judgeDeduction } from '@/core/deduction';
import type { ContentBundle, Deduction, DeductionSubmission, JudgeContext } from '@/core/types';
import { validateContent } from '@/core/validate';
import { content, INCLUDE_SAMPLE, modules } from '@/data';
import { EPISODE_1, OBSERVATION_HUD } from '@/data/script';
import { MAPS, MAP_LEGEND, isWalkableTile, reachableTiles, tileKey, type SceneId } from '@/data/world/maps';

const idx = indexContent(content);
const ded = (id: string) => idx.deductions[id] as Deduction;

/** 모든 증거를 최고 단계로 보유한 판정 문맥 */
function ctxAll(c: ContentBundle, levels?: Record<string, number>): JudgeContext {
  const i = indexContent(c);
  const owned = Object.fromEntries(c.evidence.map((e) => [e.id, levels?.[e.id] ?? e.levels.length - 1]));
  return { evidence: i.evidence, persons: i.persons, owned };
}

describe('episode 1 content — registry', () => {
  it('excludes the sample placeholder', () => {
    expect(INCLUDE_SAMPLE).toBe(false);
    for (const key of Object.keys(content) as (keyof ContentBundle)[])
      for (const item of content[key]) expect(item.id.startsWith('sample_')).toBe(false);
  });

  it('validates with zero errors and zero warnings', () => {
    const r = validateContent(content, { historical: modules.historical });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('meets MVP minimums', () => {
    const verified = <T extends { provenance: string }>(xs: T[]) => xs.filter((x) => x.provenance === 'verified');
    expect(verified(content.persons).length).toBeGreaterThanOrEqual(3);
    expect(content.artifacts.some((a) => a.id === 'art_takyeong' && a.provenance === 'verified')).toBe(true);
    const sillok = content.sources.filter((s) => s.sources?.some((r) => r.url.includes('sillok.history.go.kr')));
    expect(sillok.length).toBeGreaterThanOrEqual(3);
    expect(content.collection.length).toBeGreaterThanOrEqual(8);
    const cats = new Set(content.collection.map((c) => c.category));
    expect([...cats].sort()).toEqual(['artifact', 'event', 'person', 'place', 'source']);
    expect(content.deductions.map((d) => d.kind).sort()).toEqual(['causal', 'person', 'year']);
  });

  it('keeps every verified quote line traceable to HISTORICAL_SOURCES.md', () => {
    const doc = historicalSourcesDoc;
    expect(doc.length).toBeGreaterThan(1000);
    const strip = (s: string) => s.replace(/[“”"]/g, '').trim();
    for (const npc of content.npcs)
      for (const line of npc.dialogue.filter((l) => l.provenance === 'verified'))
        expect(doc.includes(strip(line.text)), `${npc.id}#${line.id}`).toBe(true);
  });

  it('does not place the 탁영금 (or any zither) in the past scene', () => {
    const past = content.worldObjects.filter((w) => w.sceneId === 'obs001');
    for (const w of past) expect(`${w.label}${w.examine.join('')}`).not.toMatch(/거문고|탁영|濯纓/);
  });
});

describe('episode 1 content — maps & walkability', () => {
  const sceneIds = Object.keys(MAPS) as SceneId[];
  const groundChars = new Set(Object.keys(MAP_LEGEND.ground));
  const wallChars = new Set(Object.keys(MAP_LEGEND.walls));

  it('keeps only the observation diorama (walking maps removed) with consistent dimensions and legend', () => {
    expect(sceneIds.sort()).toEqual(['obs001']);
    for (const id of sceneIds) {
      const m = MAPS[id];
      expect(m.ground).toHaveLength(m.h);
      expect(m.walls).toHaveLength(m.h);
      for (const row of m.ground) {
        expect(row).toHaveLength(m.w);
        for (const ch of row) expect(groundChars.has(ch), `${id} ground '${ch}'`).toBe(true);
      }
      for (const row of m.walls) {
        expect(row).toHaveLength(m.w);
        for (const ch of row) expect(wallChars.has(ch), `${id} walls '${ch}'`).toBe(true);
      }
      expect(isWalkableTile(m, m.spawn.x, m.spawn.y)).toBe(true);
    }
    expect(MAPS.obs001.ambient).toBe('past');
    expect([MAPS.obs001.w, MAPS.obs001.h]).toEqual([40, 30]);
  });

  it('diorama: every object is adjacent to open ground and every NPC waypoint is reachable (NPC walk paths)', () => {
    for (const id of sceneIds) {
      const map = MAPS[id];
      const objs = content.worldObjects.filter((w) => w.sceneId === id);
      const blocked = new Set(objs.filter((o) => o.kind !== 'door').map((o) => tileKey(o.x, o.y)));
      const reach = reachableTiles(map, blocked);
      for (const o of objs) {
        expect(o.x >= 0 && o.y >= 0 && o.x < map.w && o.y < map.h, `${o.id} in bounds`).toBe(true);
        const adj = [
          [o.x + 1, o.y],
          [o.x - 1, o.y],
          [o.x, o.y + 1],
          [o.x, o.y - 1],
        ].some(([x, y]) => reach.has(tileKey(x!, y!)));
        expect(adj || reach.has(tileKey(o.x, o.y)), `${o.id} reachable`).toBe(true);
      }
      for (const npc of content.npcs.filter((n) => n.sceneId === id))
        for (const w of npc.schedule) {
          expect(reach.has(tileKey(w.x, w.y)), `${npc.id} @${w.time} (${w.x},${w.y})`).toBe(true);
          expect(blocked.has(tileKey(w.x, w.y)), `${npc.id} waypoint on object`).toBe(false);
        }
    }
  });

  it('places objects on distinct tiles and uses semantic sprite keys', () => {
    const allowed = new Set([
      'obj_desk_writing', 'obj_books_stack', 'obj_bookshelf', 'obj_sacho_bundle', 'obj_lamp', 'obj_screen',
      'obj_chest', 'obj_jar', 'obj_brazier', 'obj_signboard', 'obj_well', 'obj_lab_desk', 'obj_lab_shelf',
      'obj_display_case', 'obj_db_console', 'obj_observe_chair', 'obj_plant', 'npc_official_red',
      'npc_official_blue', 'npc_official_green', 'npc_historian', 'npc_clerk', 'npc_servant', 'door',
    ]);
    const seen = new Set<string>();
    for (const o of content.worldObjects) {
      expect(allowed.has(o.spriteKey), o.spriteKey).toBe(true);
      const k = `${o.sceneId}:${o.x},${o.y}`;
      expect(seen.has(k), `overlap ${k}`).toBe(false);
      seen.add(k);
    }
    for (const n of content.npcs) expect(allowed.has(n.spriteKey), n.spriteKey).toBe(true);
  });
});

describe('episode 1 content — past-scene text never dates the scene', () => {
  const DATING = [/\d{4}/, /연산/, /성종\s*\d+\s*년/, /재위/];
  const pastTexts: [string, string][] = [];
  for (const o of content.worldObjects.filter((w) => w.sceneId === 'obs001')) {
    pastTexts.push([o.id, o.label], ...o.examine.map((t): [string, string] => [o.id, t]));
    if (o.hiddenText) pastTexts.push([o.id, o.hiddenText]);
    o.grants?.terms?.forEach((t) => pastTexts.push([`${o.id}:term`, t]));
  }
  const pastEvidence = new Set<string>();
  for (const n of content.npcs.filter((x) => x.sceneId === 'obs001')) {
    pastTexts.push([n.id, n.label]);
    for (const l of n.dialogue) {
      pastTexts.push([`${n.id}#${l.id}`, `${l.speaker ?? ''} ${l.text}`]);
      l.grants?.evidence?.forEach((e) => pastEvidence.add(e.id));
      l.grants?.notebook?.forEach((nb) => pastTexts.push([nb.id, nb.text]));
      l.grants?.terms?.forEach((t) => pastTexts.push([`${n.id}#${l.id}:term`, t]));
    }
  }
  for (const o of content.worldObjects.filter((w) => w.sceneId === 'obs001')) {
    o.grants?.evidence?.forEach((e) => pastEvidence.add(e.id));
    o.grants?.notebook?.forEach((nb) => pastTexts.push([nb.id, nb.text]));
  }
  for (const o of content.observations.filter((x) => x.sceneId === 'obs001')) {
    pastTexts.push([o.id, o.title], ...o.lines.map((t): [string, string] => [o.id, t]));
    o.grants?.notebook?.forEach((nb) => pastTexts.push([nb.id, nb.text]));
  }
  for (const id of pastEvidence) {
    const ev = idx.evidence[id]!;
    pastTexts.push([id, ev.levels[0].label], [id, ev.levels[0].text]);
  }
  OBSERVATION_HUD.forEach((t) => pastTexts.push(['hud', t]));
  for (const t of content.timelines) {
    pastTexts.push([t.id, t.title], ...t.meta.map((m): [string, string] => [t.id, `${m.label} ${m.value}`]));
  }
  EPISODE_1.quests
    .flatMap((q) => q.objectives)
    .filter((o) => o.app === 'viewer')
    .forEach((o) => pastTexts.push([o.id, `${o.text} ${o.hint ?? ''}`]));
  content.tutorial
    .filter((t) => t.app === 'viewer')
    .forEach((t) => pastTexts.push([t.id, [t.coach, ...t.hints].join(' ')]));

  it('collects a meaningful amount of past-scene text', () => {
    expect(pastTexts.length).toBeGreaterThan(40);
    expect(pastEvidence.size).toBeGreaterThanOrEqual(8);
  });

  it.each(pastTexts)('%s: %s', (_id, text) => {
    for (const re of DATING) expect(text).not.toMatch(re);
  });

  it('never names 이극돈 in the past scene before identification', () => {
    for (const [, t] of pastTexts) expect(t).not.toMatch(/이극돈|극돈/);
  });
});

describe('episode 1 content — deductions are solvable with obtainable evidence', () => {
  const sub = (d: string, rest: object) => ({ deductionId: d, ...rest }) as DeductionSubmission;

  it('year: linked card(사초와 세 죽음) + C4 confirm 1498; C1~C4 give partial 1495~1498', () => {
    const ctx = ctxAll(content);
    const d = ded('ded_year_001');
    expect(judgeDeduction(d, sub(d.id, { kind: 'year', from: 1498, to: 1498, evidenceIds: ['ev_same_month', 'ev_author_alive'] }), ctx).verdict).toBe('confirmed');
    // 「조의제문」은 말소된 세계에서 해를 좁히지 못한다(보조 하한 1457)
    expect(judgeDeduction(d, sub(d.id, { kind: 'year', from: 1498, to: 1498, evidenceIds: ['ev_jouijemun', 'ev_author_alive'] }), ctx).verdict).toBe('undetermined');
    // 카드마다 고유한 피드백(같은 문구 반복 없음, 정답 연도 없음)
    const fb = judgeDeduction(d, sub(d.id, { kind: 'year', from: 1495, to: 1498, evidenceIds: d.relevantEvidence }), ctx).feedback
      .filter((f) => f.code.startsWith('bounds_') || f.code === 'weak')
      .map((f) => f.message);
    expect(new Set(fb).size).toBe(fb.length);
    for (const m of fb) expect(m).not.toMatch(/\d{4}|하한만 제한합니다/);
    const partial = judgeDeduction(
      d,
      sub(d.id, { kind: 'year', from: 1495, to: 1498, evidenceIds: ['ev_myoho', 'ev_sillokcheong', 'ev_unknown_official', 'ev_author_alive'] }),
      ctx,
    );
    expect(partial.verdict).toBe('partial');
    expect(partial.implied).toEqual({ from: 1495, to: 1498 });
  });

  it('year: a 성종-reign-only answer is never confirmed', () => {
    const d = ded('ded_year_001');
    const full = ctxAll(content);
    const r1 = judgeDeduction(d, sub(d.id, { kind: 'year', from: 1469, to: 1494, evidenceIds: ['ev_myoho'] }), full);
    expect(r1.verdict).toBe('wrong');
    expect(r1.feedback.some((f) => f.code === 'contradiction')).toBe(true);
    // 묘호 카드를 연구 전(단계 0)으로만 가진 경우에도 확정되지 않는다
    const raw = ctxAll(content, Object.fromEntries(content.evidence.map((e) => [e.id, 0])));
    const r2 = judgeDeduction(d, sub(d.id, { kind: 'year', from: 1469, to: 1494, evidenceIds: ['ev_myoho', 'ev_lawbook'] }), raw);
    expect(r2.verdict).not.toBe('confirmed');
    expect(r2.verdict).not.toBe('partial');
  });

  it('year: red herrings alone cannot fix the year', () => {
    const d = ded('ded_year_001');
    const r = judgeDeduction(
      d,
      sub(d.id, { kind: 'year', from: 1498, to: 1498, evidenceIds: ['ev_lawbook', 'ev_takyeong_record', 'ev_jongjik_dead'] }),
      ctxAll(content),
    );
    expect(r.verdict).toBe('undetermined');
    expect(r.feedback.filter((f) => f.code === 'weak')).toHaveLength(2);
  });

  it('person: 실록청 당상 + 『세조실록』 편찬 참여 → 이극돈; other candidates are rejected', () => {
    const d = ded('ded_person_001');
    const ctx = ctxAll(content, { ev_unknown_official: 0 });
    const ev = ['ev_unknown_official', 'ev_veteran'];
    expect(judgeDeduction(d, sub(d.id, { kind: 'person', candidateId: 'per_yi_geukdon', evidenceIds: ev }), ctx).verdict).toBe('confirmed');
    for (const c of ['per_kim_ilson', 'per_yu_jagwang', 'per_eo_segyeom'])
      expect(judgeDeduction(d, sub(d.id, { kind: 'person', candidateId: c, evidenceIds: ev }), ctx).verdict, c).toBe('wrong');
    const thin = judgeDeduction(d, sub(d.id, { kind: 'person', candidateId: 'per_yi_geukdon', evidenceIds: ['ev_unknown_official'] }), ctx);
    expect(thin.verdict).toBe('undetermined');
  });

  it('causal(봉우리): 조의제문 → 전교 → 같은 달의 죽음, 화살표마다 근거', () => {
    const d = ded('ded_cause_001');
    if (d.kind !== 'causal') throw new Error();
    const ctx = ctxAll(content);
    const C = (links: { from: string; to: string; evidenceIds: string[] }[]) =>
      judgeDeduction(d, { kind: 'causal', deductionId: d.id, links }, ctx);
    const L1 = { from: 'n_jouijemun', to: 'n_order', evidenceIds: ['ev_jouijemun', 'ev_royal_order'] };
    const L2 = { from: 'n_order', to: 'n_deaths', evidenceIds: ['ev_same_month'] };
    expect(C([L1, L2]).verdict).toBe('confirmed');
    // 빠진 고리
    const half = C([L1]);
    expect(half.verdict).toBe('undetermined');
    expect(half.feedback.some((f) => f.code === 'chain_incomplete')).toBe(true);
    // 근거 없는 화살표는 맞든 틀리든 '받칠 카드 없음'(정답 캐내기 방지)
    expect(C([{ ...L1, evidenceIds: [] }, L2]).feedback.some((f) => f.code === 'link_unsupported')).toBe(true);
    expect(C([{ from: 'n_plague', to: 'n_deaths', evidenceIds: [] }]).verdict).toBe('undetermined');
    // 정답 화살표 + 모자란 사실 → 사실 '종류'만
    const thin = C([{ ...L2, evidenceIds: ['ev_db_deaths'] }, L1]);
    expect(thin.verdict).toBe('undetermined');
    expect(thin.feedback.find((f) => f.code === 'link_unsupported')!.message).not.toContain('사초를 거둔 날 그 주인은');
    // 틀린 화살표: 고유 문구 / 뒤집힌 방향
    const routine = C([{ from: 'n_routine', to: 'n_deaths', evidenceIds: ['ev_gajang'] }]);
    expect(routine.verdict).toBe('wrong');
    expect(routine.feedback.find((f) => f.code === 'link_wrong')!.message).toContain('절차');
    const rev = C([{ from: 'n_order', to: 'n_jouijemun', evidenceIds: ['ev_jouijemun', 'ev_royal_order'] }]);
    expect(rev.feedback.some((f) => f.code === 'link_reversed')).toBe(true);
    // 피드백에 정답 고리 순서·연도가 나오지 않는다
    for (const f of [...half.feedback, ...routine.feedback, ...rev.feedback]) expect(f.message).not.toMatch(/\d{4}/);
    // 잘못된 입력
    expect(C([]).verdict).toBe('undetermined');
    expect(C([{ from: 'n_order', to: 'n_order', evidenceIds: ['ev_royal_order'] }]).feedback[0]!.code).toBe('invalid_input');
  });
});
