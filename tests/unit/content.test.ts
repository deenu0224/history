/// <reference types="vite/client" />
import historicalSourcesDoc from '../../docs/HISTORICAL_SOURCES.md?raw';
import narrativeDoc from '../../docs/NARRATIVE_FIRST10.md?raw';
import shift1Doc from '../../docs/NARRATIVE_SHIFT1.md?raw';
import { DIORAMAS } from '@/game/scenes/maps';
import { originalText, recordSegments } from '@/core/duty';
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

  it('meets minimums: 3+ verified persons, the 탁영금, 3+ 실록 sources, 4 apps, 3 shifts with one new rule each after the first', () => {
    const verified = <T extends { provenance: string }>(xs: T[]) => xs.filter((x) => x.provenance === 'verified');
    expect(verified(content.persons).length).toBeGreaterThanOrEqual(3);
    expect(content.artifacts.some((a) => a.id === 'art_takyeong' && a.provenance === 'verified')).toBe(true);
    const sillok = content.sources.filter((s) => s.sources?.some((r) => r.url.includes('sillok.history.go.kr')));
    expect(sillok.length).toBeGreaterThanOrEqual(3);
    expect(content.apps.map((a) => a.app)).toEqual(['work', 'viewer', 'db', 'messenger']);
    expect(content.workShifts.map((w) => [w.no, w.newRules.length])).toEqual([
      [1, 3],
      [2, 1],
      [3, 1],
    ]);
    expect(content.cases.filter((c) => c.kind === 'routine').length).toBeGreaterThanOrEqual(11);
  });

  it('keeps every verified quote line traceable to HISTORICAL_SOURCES.md', () => {
    const strip = (s: string) => s.replace(/[“”"]/g, '').trim();
    for (const npc of content.npcs)
      for (const l of npc.dialogue.filter((x) => x.provenance === 'verified'))
        expect(historicalSourcesDoc.includes(strip(l.text)), `${npc.id}#${l.id}`).toBe(true);
  });

  it('every routine card is the verified 국역 sentence from HISTORICAL_SOURCES; the distortion is a different word', () => {
    const norm = (t: string) => t.replace(/\s+/g, '');
    const doc = norm(historicalSourcesDoc);
    for (const c of content.cases.filter((x) => x.kind === 'routine')) {
      expect(doc.includes(norm(originalText(c))), `${c.id}: ${originalText(c)}`).toBe(true);
      expect(c.record!.sources.every((r) => r.url.startsWith('https://sillok.history.go.kr/') || r.url.startsWith('https://encykorea'))).toBe(true);
      for (const r of c.record!.sources) expect(doc.includes(norm(r.url.replace('https://sillok.history.go.kr/id/', ''))), r.url).toBe(true);
      const d = c.record!.distortion;
      if (d) expect(recordSegments(c).find((x) => x.id === d.segmentId)!.text).not.toBe(d.text);
    }
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
      ...content.cases.flatMap((c) => Object.values(c.explain ?? {})),
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
    expect(a.detection).toBe('좌표 #C-2217 · 일시 #### · 이 지점을 가리키는 기록 3건에서 자동 탐지');
    expect(a.header.map((h) => `${h.label} ${h.value}`)).toEqual(['일시 ####', '장소 미확인(기록상: 『성종실록』 편찬 실록청)']);
    // 남은 참조 수 같은 계기판은 없다
    expect(JSON.stringify(content.assignments)).not.toMatch(/참조 수렴|사맥|기록선/);
    expect(content.messages.some((m) => m.from === '오 실장')).toBe(true);
    for (const t of ['#C-2217', '대조관 07', '오 실장', '종결된 보고서', a.detection]) expect(narrative).toContain(t);
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
    for (const id of ['m_chief_03b', 'm_chief_05'])
      expect(narrative).toContain(content.messages.find((m) => m.id === id)!.text);
  });
});

describe('v4 shift 1 — matches the approved shift-1 narrative (with §10 corrections)', () => {
  const doc = shift1Doc.replace(/\s+/g, ' ');
  const q = content.workShifts[0]!.queue.map((id) => content.cases.find((c) => c.id === id)!);
  it('five cards in the approved order and kinds; goal 5', () => {
    expect(q.map((c) => c.code)).toEqual(['#A-0412', '#A-0419', '#A-0423', '#A-0431', '#C-2217']);
    expect(q.map((c) => c.expected.join('/'))).toEqual(['confirm', 'correct', 'confirm', 'correct', 'mismatch/auto_close']);
    expect(content.workShifts[0]!.goal).toBe(5);
    for (const c of q) expect(doc).toContain(c.code);
  });
  it('approved lines and the C-2217 card wording', () => {
    const msg = (id: string) => content.messages.find((m) => m.id === id)!.text;
    for (const id of ['m_me_nomemory', 'm_chief_warn2', 'm_chief_drawer']) expect(doc).toContain(msg(id));
    const c = q[4]!;
    expect(doc).toContain('이 지점을 가리키는 기록 3건에서 자동 탐지');
    expect(c.detection).toContain('이 지점을 가리키는 기록 3건에서 자동 탐지');
    expect(c.recommend).toContain('대조할 기록 없음 → 장비 오류로 자동 종결');
    const line = (id: string) => findLine(content.npcs, id)!.line.text;
    expect(doc).toContain(line('a0419_l1').replace(/^…/, ''));
    expect(doc).toContain(line('a0423_l1'));
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

  it('case vignettes stand on free floor of their diorama (not on a decoration, inside the walls)', () => {
    for (const tl of content.timelines.filter((t) => t.sceneId !== 'obs001')) {
      const d = DIORAMAS[tl.sceneId as keyof typeof DIORAMAS];
      expect(d, `${tl.id} scene ${tl.sceneId}`).toBeDefined();
      const taken = new Set(d.objects.filter((o) => !o.flat).map((o) => tileKey(Math.round(o.x), o.y)));
      for (const h of tl.hotspots.filter((x) => x.kind === 'npc')) {
        const npc = content.npcs.find((n) => n.id === h.targetId)!;
        for (const w of npc.schedule) {
          expect(isWalkableTile(d, w.x, w.y), `${npc.id} (${w.x},${w.y}) walkable`).toBe(true);
          expect(taken.has(tileKey(w.x, w.y)), `${npc.id} (${w.x},${w.y}) on decoration`).toBe(false);
        }
      }
    }
    for (const tl of content.timelines.filter((t) => t.sceneId === 'obs001' && t.id !== 'tl_obs001'))
      for (const h of tl.hotspots) {
        const npc = content.npcs.find((n) => n.id === h.targetId)!;
        for (const w of npc.schedule) expect(isWalkableTile(MAPS.obs001, w.x, w.y)).toBe(true);
      }
  });

  it('places objects on distinct tiles and uses semantic sprite keys', () => {
    const allowed = new Set([
      'obj_desk_writing', 'obj_books_stack', 'obj_bookshelf', 'obj_sacho_bundle', 'obj_lamp', 'obj_screen',
      'obj_chest', 'obj_jar', 'obj_brazier', 'obj_signboard', 'obj_well', 'obj_lab_desk', 'obj_lab_shelf',
      'obj_display_case', 'obj_db_console', 'obj_observe_chair', 'obj_plant', 'npc_official_red',
      'npc_official_blue', 'npc_official_green', 'npc_historian', 'npc_clerk', 'npc_servant', 'door', 'char_naegwan',
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
  const c2217Npcs = new Set(content.timelines.find((t) => t.id === 'tl_obs001')!.hotspots.map((h) => h.targetId));
  for (const n of content.npcs.filter((x) => c2217Npcs.has(x.id))) {
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
  for (const a of content.assignments) pastTexts.push([a.id, [a.title, ...a.header.map((h) => h.value), ...a.refs.map((r) => r.title)].join(' ')]);
  for (const c of content.cases.filter((x) => x.kind !== 'routine')) pastTexts.push([c.id, [c.title, c.detection, c.recommend, c.notReadyText].join(' ')]);
  for (const m of content.messages.filter((x) => x.hint)) pastTexts.push([m.id, m.text]);

  it('collects a meaningful amount of past-scene text', () => {
    expect(pastTexts.length).toBeGreaterThan(60);
  });

  it.each(pastTexts)('%s: %s', (id, text) => {
    for (const re of DATING) expect(text.replace(/#[A-Z]-\d{4}/g, ''), id).not.toMatch(re);
  });

  it('never names 이극돈 in the past scene or before identification', () => {
    for (const [, t] of pastTexts) expect(t).not.toMatch(/이극돈|극돈/);
  });
});
