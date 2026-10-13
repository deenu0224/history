/// <reference types="vite/client" />
import historicalSourcesDoc from '../../docs/HISTORICAL_SOURCES.md?raw';
import { indexContent } from '@/core/content';
import { judgeDeduction } from '@/core/deduction';
import type { ContentBundle, Deduction, DeductionSubmission, JudgeContext } from '@/core/types';
import { validateContent } from '@/core/validate';
import { checkCondition } from '@/core/world';
import { content, INCLUDE_SAMPLE, modules } from '@/data';
import { EPISODE_1, OBSERVATION_HUD } from '@/data/script';
import { MAPS, MAP_LEGEND, isWalkableTile, reachableTiles, tileKey, type SceneId } from '@/data/world/maps';
import { createGameStore } from '@/store/gameStore';

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
    expect(content.deductions.map((d) => d.kind).sort()).toEqual(['event', 'person', 'year']);
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

  it('has the three scenes with consistent dimensions and legend', () => {
    expect(sceneIds.sort()).toEqual(['archive', 'lab', 'obs001']);
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

  it('reaches every interactable (adjacent tile) and every NPC waypoint from spawn', () => {
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
        if (o.targetSceneId) expect(o.targetSceneId in MAPS, `${o.id} target`).toBe(true);
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
  }
  const pastEvidence = new Set<string>();
  for (const n of content.npcs.filter((x) => x.sceneId === 'obs001')) {
    pastTexts.push([n.id, n.label]);
    for (const l of n.dialogue) {
      pastTexts.push([`${n.id}#${l.id}`, `${l.speaker ?? ''} ${l.text}`]);
      l.grants?.evidence?.forEach((e) => pastEvidence.add(e.id));
      l.grants?.notebook?.forEach((nb) => pastTexts.push([nb.id, nb.text]));
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
  EPISODE_1.quests
    .flatMap((q) => q.objectives)
    .filter((o) => o.sceneId === 'obs001')
    .forEach((o) => pastTexts.push([o.id, `${o.text} ${o.hint ?? ''}`]));

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

  it('year: decisive C6 + C4 confirm 1498; C1~C4 give partial 1495~1498', () => {
    const ctx = ctxAll(content);
    const d = ded('ded_year_001');
    expect(judgeDeduction(d, sub(d.id, { kind: 'year', from: 1498, to: 1498, evidenceIds: ['ev_jouijemun', 'ev_author_alive'] }), ctx).verdict).toBe('confirmed');
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

  it('event: 사초 문제 is confirmed; every other statement is refutable', () => {
    const d = ded('ded_event_001');
    if (d.kind !== 'event') throw new Error();
    const ctx = ctxAll(content);
    const all = ['ev_royal_order', 'ev_objection', 'ev_six_articles', 'ev_sillok_done', 'ev_gajang'];
    expect(judgeDeduction(d, sub(d.id, { kind: 'event', statementId: 'st_crisis', evidenceIds: all }), ctx).verdict).toBe('confirmed');
    for (const s of d.statements.filter((x) => x.id !== d.answer))
      expect(judgeDeduction(d, sub(d.id, { kind: 'event', statementId: s.id, evidenceIds: all }), ctx).verdict, s.id).toBe('wrong');
    // 가장사초 수납만으로는 어느 쪽도 가릴 수 없다(레드 헤링)
    expect(judgeDeduction(d, sub(d.id, { kind: 'event', statementId: 'st_crisis', evidenceIds: ['ev_gajang'] }), ctx).verdict).toBe('undetermined');
  });
});

describe('episode 1 content — full playthrough through the store', () => {
  it('prologue → observation → research → three deductions → archive → teaser', () => {
    const store = createGameStore(content);
    const s = () => store.getState();
    const examine = (id: string) => expect(s().examine(id), id).not.toBeNull();
    const talk = (id: string) => s().talk(id);

    // 순서 잠금: 연구 전에는 관측 장치가 열리지 않는다
    expect(s().examine('lab_observe_chair')).toBeNull();
    examine('lab_db_console');
    examine('lab_case_takyeong');
    examine('lab_person_terminal');
    examine('lab_observe_chair');
    expect(s().flags.obs001_entered).toBe(true);

    // 관측 #001
    examine('obs_gate_signboard');
    talk('npc_clerk');
    examine('obs_store_sacho');
    examine('obs_hall_desk_scribe');
    expect(talk('npc_messenger')!.gained.some((r) => r.type === 'evidence')).toBe(false); // 아직 전교 전
    talk('npc_red_official');
    talk('npc_clerk');
    talk('npc_young_official');
    talk('npc_messenger');
    talk('npc_blue_official');
    expect(s().flags.f_saw_sealing).toBe(true);
    examine('obs_return_point');
    expect(s().flags.obs001_returned).toBe(true);

    // 연구실 대조
    for (const id of ['lab_st_title', 'lab_st_institution', 'lab_st_person2', 'lab_st_sillok', 'lab_st_law']) examine(id);
    for (const id of ['ev_myoho', 'ev_sillokcheong', 'ev_jouijemun', 'ev_author_alive']) expect(s().evidence[id], id).toBe(1);

    // 함정 답안
    expect(s().submitDeduction({ kind: 'year', deductionId: 'ded_year_001', from: 1469, to: 1494, evidenceIds: ['ev_myoho'] }).verdict).toBe('wrong');
    expect(s().submitDeduction({ kind: 'year', deductionId: 'ded_year_001', from: 1495, to: 1498, evidenceIds: ['ev_myoho', 'ev_sillokcheong', 'ev_author_alive'] }).verdict).toBe('partial');
    expect(s().flags.ded_year_partial).toBe(true);
    expect(s().submitDeduction({ kind: 'year', deductionId: 'ded_year_001', from: 1498, to: 1498, evidenceIds: ['ev_jouijemun', 'ev_author_alive', 'ev_myoho'] }).verdict).toBe('confirmed');
    expect(s().submitDeduction({ kind: 'person', deductionId: 'ded_person_001', candidateId: 'per_yi_geukdon', evidenceIds: ['ev_unknown_official', 'ev_veteran'] }).verdict).toBe('confirmed');
    expect(s().evidence.ev_unknown_official).toBe(1);
    expect(s().submitDeduction({ kind: 'event', deductionId: 'ded_event_001', statementId: 'st_crisis', evidenceIds: ['ev_royal_order', 'ev_six_articles'] }).verdict).toBe('confirmed');

    // 기록관
    for (const id of ['arc_case_takyeong', 'arc_person_register', 'arc_timeline', 'arc_shelf_sources', 'arc_center_case']) examine(id);
    const discovered = Object.values(s().collection).filter((v) => v >= 1).length;
    expect(discovered).toBeGreaterThanOrEqual(8);
    expect(s().collection.col_art_takyeong).toBe(5);
    expect(Object.values(s().notebook.question).every((q) => q.id === 'q_anomaly' || q.id === 'q_next' || q.resolved)).toBe(true);

    expect(checkCondition(s().flags, EPISODE_1.epilogueWhen)).toBe(true);
    expect(checkCondition(s().flags, EPISODE_1.teaserWhen)).toBe(true);
    for (const o of EPISODE_1.quests.flatMap((q) => q.objectives).filter((o) => !o.optional)) {
      const flagsOk = checkCondition(s().flags, o.doneWhen.flags);
      const countOk = discovered >= (o.doneWhen.minCollectionDiscovered ?? 0);
      expect(flagsOk && countOk, o.id).toBe(true);
    }
  });

  it('every collection entry is discoverable', () => {
    const granted = new Set<string>();
    for (const w of content.worldObjects) w.grants?.collect?.forEach((c) => granted.add(c.entryId));
    for (const n of content.npcs) n.dialogue.forEach((l) => l.grants?.collect?.forEach((c) => granted.add(c.entryId)));
    for (const d of content.deductions)
      for (const r of [...d.rewards.confirmed, ...(d.rewards.partial ?? [])]) if (r.type === 'collection') granted.add(r.entryId);
    for (const c of content.collection) expect(granted.has(c.id), c.id).toBe(true);
  });
});
