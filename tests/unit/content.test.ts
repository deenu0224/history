/// <reference types="vite/client" />
import historicalSourcesDoc from '../../docs/HISTORICAL_SOURCES.md?raw';
import narrativeDoc from '../../docs/NARRATIVE_FIRST10.md?raw';
import { findLine, inWindow, timelineTicks } from '@/core/observation';
import { validateContent } from '@/core/validate';
import { content, GLOSSARY, modules } from '@/data';
import { OBSERVATION_HUD } from '@/data/script';
import { MAPS, MAP_LEGEND, isWalkableTile, reachableTiles, tileKey, type SceneId } from '@/data/world/maps';

const line = (id: string) => findLine(content.npcs, id)!.line;

describe('episode 1 content — registry', () => {
  it('validates with zero errors and zero warnings', () => {
    const r = validateContent(content, { historical: modules.historical });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('meets minimums: 3+ verified persons, the 탁영금, 3+ 실록 sources, 4 apps, 4 checklist items', () => {
    const verified = <T extends { provenance: string }>(xs: T[]) => xs.filter((x) => x.provenance === 'verified');
    expect(verified(content.persons).length).toBeGreaterThanOrEqual(3);
    expect(content.artifacts.some((a) => a.id === 'art_takyeong' && a.provenance === 'verified')).toBe(true);
    const sillok = content.sources.filter((s) => s.sources?.some((r) => r.url.includes('sillok.history.go.kr')));
    expect(sillok.length).toBeGreaterThanOrEqual(3);
    expect(content.apps.map((a) => a.app)).toEqual(['work', 'viewer', 'db', 'messenger']);
    expect(content.assignments[0]!.checklist.map((i) => i.title)).toEqual(['장소 대조', '인물 대조', '시각 대조', '판정']);
  });

  it('keeps every verified quote line traceable to HISTORICAL_SOURCES.md', () => {
    const strip = (s: string) => s.replace(/[“”"]/g, '').trim();
    for (const npc of content.npcs)
      for (const l of npc.dialogue.filter((x) => x.provenance === 'verified'))
        expect(historicalSourcesDoc.includes(strip(l.text)), `${npc.id}#${l.id}`).toBe(true);
  });

  it('does not place the 탁영금 (or any zither) in the past scene', () => {
    for (const w of content.worldObjects.filter((x) => x.sceneId === 'obs001'))
      expect(`${w.label}${w.examine.join('')}`).not.toMatch(/거문고|탁영|濯纓/);
  });

  it('glosses every unfamiliar 실록 term inside verified quotes; glosses are short and undated', () => {
    const quotes = [
      ...content.npcs.flatMap((n) =>
        n.dialogue.filter((l) => l.provenance === 'verified').map((l) => ({ id: l.id, text: l.text, g: l.glossary ?? [] })),
      ),
      ...content.sources.filter((s) => s.id === 'src_sacho_order').map((s) => ({ id: s.id, text: s.excerpt!, g: s.glossary ?? [] })),
    ];
    for (const q of quotes)
      for (const term of ['대내', '사초', '직필'])
        if (q.text.includes(term)) expect(q.g.map((x) => x.term), `${q.id} '${term}'`).toContain(term);
    for (const g of GLOSSARY) {
      expect(g.gloss.length).toBeLessThanOrEqual(40);
      expect(g.gloss).not.toMatch(/\d{4}/);
    }
  });

  it("modern-voice text never uses '졸'", () => {
    const modern = [
      ...content.records.flatMap((r) => [r.title, ...r.fields.map((f) => `${f.label}${f.value}`)]),
      ...content.messages.filter((m) => m.provenance !== 'verified').map((m) => m.text),
      ...content.closedReports.map((c) => c.note),
      ...content.clues.map((c) => c.text + c.label),
      ...content.assignments.flatMap((a) => a.checklist.map((i) => i.prompt)),
    ];
    for (const t of modern) expect(t).not.toMatch(/졸/);
  });
});

describe('episode 1 content — matches the approved first ten minutes', () => {
  const narrative = narrativeDoc.replace(/\s+/g, ' ');
  it('names, ids and header fields', () => {
    const a = content.assignments[0]!;
    expect(a.code).toBe('#C-2217');
    expect(a.officer).toBe('대조관 07');
    expect(a.header.map((h) => `${h.label} ${h.value}`)).toEqual(['참조 수렴 3건', '일시 ####', '장소 미확인(참조: 실록청)']);
    expect(a.checklist[3]!.final!.recommendButton).toBe('일치(노이즈)');
    expect(content.messages.some((m) => m.from === '오 실장')).toBe(true);
    for (const t of ['#C-2217', '대조관 07', '오 실장', '노이즈 판정 권장', '종결된 보고서']) expect(narrative).toContain(t);
  });

  it('hearing moments sit at the approved minutes', () => {
    const at = (id: string, minute: number) => expect(inWindow(minute, line(id).at), `${id}@${minute}`).toBe(true);
    at('r2', 520); // 08:40 당상
    at('c1', 480); // 서리 「성종대왕 실록…」
    at('y3', 720); // 12:00 「조의제문」
    at('m2', 840); // 14:00 전교
    at('b2', 840);
    at('b3', 840);
    at('r3', 900); // 15:00 봉함
    at('b5', 960); // 16:00 「살아 있소」
    expect(content.timelines[0]!.glitches).toContainEqual({ from: 836, to: 840, intensity: 0.15 }); // 13:56
    const plain = (t: string) => t.replace(/[“”「」]|\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    for (const id of ["r2", "c1", "y3", "b5"]) expect(plain(narrative), id).toContain(plain(line(id).text));
    expect(timelineTicks(content.timelines[0]!, content).some((t) => t.minute === 840 && t.kind === 'speech')).toBe(true);
  });

  it('the year-old report and 오 실장 lines are the approved wording (졸 → 사망)', () => {
    const prev = content.closedReports.find((c) => c.id === 'cr_c2217_prev')!;
    expect(narrative).toContain(prev.note);
    for (const id of ['m_chief_02', 'm_chief_03', 'm_chief_04'])
      expect(narrative).toContain(content.messages.find((m) => m.id === id)!.text);
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
  for (const n of content.npcs.filter((x) => x.sceneId === 'obs001')) {
    pastTexts.push([n.id, n.label]);
    for (const l of n.dialogue) {
      pastTexts.push([`${n.id}#${l.id}`, `${l.speaker ?? ''} ${l.text}`]);
      l.grants?.terms?.forEach((t) => pastTexts.push([`${n.id}#${l.id}:term`, t]));
      l.glossary?.forEach((g) => pastTexts.push([`${l.id}:gloss`, g.gloss]));
    }
  }
  for (const c of content.clues.filter((x) => x.frame)) pastTexts.push([c.id, `${c.label} ${c.text}`]);
  OBSERVATION_HUD.forEach((t) => pastTexts.push(['hud', t]));
  for (const t of content.timelines) pastTexts.push([t.id, t.title], ...t.meta.map((m): [string, string] => [t.id, `${m.label} ${m.value}`]));
  for (const a of content.assignments) {
    pastTexts.push([a.id, [a.title, ...a.header.map((h) => h.value), ...a.refs.map((r) => r.title)].join(' ')]);
    for (const i of a.checklist) pastTexts.push([i.id, [i.prompt, i.refLabel, i.notReadyText, i.wrongText ?? ''].join(' ')]);
  }
  for (const m of content.messages.filter((x) => x.hint)) pastTexts.push([m.id, m.text]);

  it('collects a meaningful amount of past-scene text', () => {
    expect(pastTexts.length).toBeGreaterThan(60);
  });

  it.each(pastTexts)('%s: %s', (id, text) => {
    for (const re of DATING) expect(text.replace(/#C-\d{4}/g, ''), id).not.toMatch(re);
  });

  it('never names 이극돈 in the past scene or before identification', () => {
    for (const [, t] of pastTexts) expect(t).not.toMatch(/이극돈|극돈/);
  });
});
