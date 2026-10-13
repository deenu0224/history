import { clampMinute, findLine, formatClock, glitchAt, hotspotStatus, inSpans, inWindow, lineActiveAt, linesAt, npcPoseAt } from '@/core/observation';
import { matchTerm, normalizeQuery, searchIndex, searchMessage } from '@/core/search';
import { activeLadders, checkState, emptyHints, emptyStats, HINT_SILENCE_SECONDS, laddersDone, nextHintStep } from '@/core/terminal';
import { HEAR_DEFAULT_MIN_ZOOM, HEAR_DEFAULT_RADIUS, type HintLadder, type NpcDef, type ObservationTimeline, type SearchEntry } from '@/core/types';
import { conditionState, initialPersisted } from '@/store/gameStore';
import { content } from '@/data';

const entry = (id: string, terms: string[], extra: Partial<SearchEntry> = {}): SearchEntry => ({
  id,
  provenance: 'fictional',
  terms,
  results: [{ kind: 'record', id: 'r' }],
  ...extra,
});

describe('search normalization', () => {
  it.each([
    ['  김 일손 ', '김일손'],
    ['「조의제문」', '조의제문'],
    ['『성종실록』', '성종실록'],
    ['성종·대왕', '성종대왕'],
    ['"대내(大內)"', '대내大內'],
    ['ＡＢＣ', 'abc'], // NFKC 전각 → 반각 + 소문자
    ['金馹孫', '金馹孫'],
    ['…!?', ''],
  ])('%s → %s', (raw, out) => expect(normalizeQuery(raw)).toBe(out));

  it('match rules: exact, contains (term ≥ 2), prefix (≥3 chars, ≥60%)', () => {
    expect(matchTerm('김일손', '김일손')).toBe('exact');
    expect(matchTerm('김일손의사초', '김일손')).toBe('contains');
    expect(matchTerm('조의제', '조의제문')).toBe('prefix');
    expect(matchTerm('조의', '조의제문')).toBeNull(); // 너무 짧은 접두
    expect(matchTerm('실록청장', '실')).toBeNull(); // 한 글자 색인어는 포함 일치 불가
    expect(matchTerm('가장사', '가장사초입니다')).toBeNull(); // 60% 미만
  });
});

describe('searchIndex', () => {
  const entries = [
    entry('a', ['김일손', '金馹孫']),
    entry('b', ['사초', '史草']),
    entry('c', ['김일손의 사초']),
    entry('d', ['成']),
    entry('locked', ['보정'], { requires: { all: ['x'] } }),
  ];
  it('ranks exact > contains, longer contains first, one hit per entry', () => {
    const r = searchIndex(entries, '김일손의 사초');
    expect(r.status).toBe('ok');
    expect(r.matches.map((m) => [m.entry.id, m.match])).toEqual([
      ['c', 'exact'],
      ['a', 'contains'],
      ['b', 'contains'],
    ]);
  });
  it('hanja variants and single-character exact terms', () => {
    expect(searchIndex(entries, '金馹孫').matches[0]!.entry.id).toBe('a');
    expect(searchIndex(entries, '成').matches[0]!.entry.id).toBe('d');
    expect(searchIndex(entries, '김').status).toBe('too_short');
    expect(searchIndex(entries, '').status).toBe('empty');
  });
  it('unknown terms and invisible entries', () => {
    expect(searchIndex(entries, '타임머신').status).toBe('unknown');
    const visible = (e: SearchEntry) => !e.requires;
    expect(searchIndex(entries, '보정', visible).status).toBe('unknown');
    expect(searchIndex(entries, '보정').status).toBe('ok');
  });
  it('feedback messages', () => {
    expect(searchMessage('unknown', '타임머신')).toContain('‘타임머신’');
    expect(searchMessage('too_short', '김')).toContain('두 글자');
    expect(searchMessage('ok', 'x', 2, 1)).toBe('2건 일치 · 새 기록 1건');
  });
});

describe('observation timeline', () => {
  const npc: NpcDef = {
    id: 'n',
    provenance: 'fictional',
    sceneId: 's',
    spriteKey: 'k',
    label: '사람',
    schedule: [
      { time: 600, x: 10, y: 0, action: 'write' },
      { time: 480, x: 0, y: 0, action: 'read' },
    ],
    dialogue: [
      { id: 'always', text: 'a', provenance: 'fictional' },
      { id: 'morning', text: 'm', provenance: 'fictional', at: [{ from: 480, to: 600 }] },
      { id: 'flagged', text: 'f', provenance: 'fictional', at: [{ from: 600, to: 700 }], when: { all: ['seen'] } },
    ],
  };
  const tl = { start: 480, end: 1140 } as ObservationTimeline;

  it('windows are half-open [from, to)', () => {
    expect(inWindow(599, [{ from: 480, to: 600 }])).toBe(true);
    expect(inWindow(600, [{ from: 480, to: 600 }])).toBe(false);
    expect(inWindow(5, undefined)).toBe(true);
    expect(inWindow(5, [])).toBe(true);
  });

  it('npc pose: holds before first waypoint, walks linearly for 12 minutes, then stays', () => {
    expect(npcPoseAt(npc, 300)).toMatchObject({ x: 0, y: 0, moving: false, action: 'read' });
    expect(npcPoseAt(npc, 606)).toMatchObject({ x: 5, y: 0, moving: true, action: 'walk', progress: 0.5 });
    expect(npcPoseAt(npc, 612)).toMatchObject({ x: 10, moving: false, action: 'write' });
    expect(npcPoseAt({ ...npc, schedule: [] }, 600)).toBeNull();
  });

  it('lines at a minute combine time windows and flags', () => {
    expect(linesAt(npc, 500, {}).map((l) => l.id)).toEqual(['always', 'morning']);
    expect(linesAt(npc, 650, {}).map((l) => l.id)).toEqual(['always']);
    expect(linesAt(npc, 650, { seen: true }).map((l) => l.id)).toEqual(['always', 'flagged']);
  });

  it('hotspot status, clamp, clock, glitch', () => {
    const h = { id: 'h', targetId: 'o', kind: 'object' as const, windows: [{ from: 840, to: 900 }], visibleWhen: { all: ['v'] } };
    expect(hotspotStatus(h, 850, {})).toBe('hidden');
    expect(hotspotStatus(h, 850, { v: true })).toBe('available');
    expect(hotspotStatus(h, 800, { v: true })).toBe('outside_window');
    expect(clampMinute(tl, 2000)).toBe(1140);
    expect(clampMinute(tl, Number.NaN)).toBe(480);
    expect(clampMinute(tl, 600.6)).toBe(601);
    expect(formatClock(845)).toBe('14:05');
    expect(glitchAt({ ...tl, glitches: [{ from: 480, to: 490, intensity: 0.5 }] } as ObservationTimeline, 485)).toBe(0.5);
    expect(glitchAt(tl, 485)).toBe(0);
  });
});

describe('state conditions and hint ladders', () => {
  const base = () => conditionState(initialPersisted(), content);
  it('checkState covers flags, lists, stats and any-of', () => {
    const s = { ...base(), flags: { a: true }, searched: ['se'], heard: ['m2'], clues: ['cl_order'], stats: { ...emptyStats(), taps: 2 } };
    expect(checkState(s, undefined)).toBe(true);
    expect(checkState(s, { all: ['a'], searched: ['se'], heard: ['m2'], clues: ['cl_order'], minStats: { taps: 2 } })).toBe(true);
    expect(checkState(s, { none: ['a'] })).toBe(false);
    expect(checkState(s, { minStats: { taps: 3 } })).toBe(false);
    expect(checkState(s, { stamped: ['ck_place'] })).toBe(false);
    expect(checkState(s, { any: [{ all: ['zzz'] }, { minStats: { taps: 1 } }] })).toBe(true);
    expect(checkState(s, { any: [{ all: ['zzz'] }] })).toBe(false);
  });

  const ladder: HintLadder = {
    id: 'l',
    provenance: 'fictional',
    order: 0,
    activeWhen: {},
    doneWhen: { all: ['done'] },
    failOn: ['stamp_miss'],
    steps: [
      { idle: 30, fails: 2, messageId: 'a' },
      { idle: 60, messageId: 'b' },
    ],
  };
  it('silence, idle thresholds, fails, detailed halves, off disables', () => {
    const h = emptyHints();
    expect(nextHintStep(ladder, h, 10, 'normal')).toBeNull();
    expect(nextHintStep(ladder, h, 30, 'normal')).toEqual({ index: 0, messageId: 'a' });
    expect(nextHintStep(ladder, { sent: {}, fails: { l: 2 } }, 0, 'normal')).toEqual({ index: 0, messageId: 'a' });
    expect(nextHintStep(ladder, { sent: { l: 1 }, fails: {} }, 30, 'detailed')).toEqual({ index: 1, messageId: 'b' });
    expect(nextHintStep(ladder, h, 500, 'off')).toBeNull();
    expect(nextHintStep(ladder, { sent: { l: 2 }, fails: {} }, 500, 'normal')).toBeNull();
    expect(laddersDone([ladder], { sent: { l: 2 }, fails: {} })).toEqual(['l']);
    expect(activeLadders([ladder], { ...base(), flags: { done: true } })).toEqual([]);
    expect(HINT_SILENCE_SECONDS).toBe(20);
  });
});

describe('hearing helpers', () => {
  it('lines are active only in their window; ids resolve globally', () => {
    expect(findLine(content.npcs, 'm2')!.npc.id).toBe('npc_messenger');
    expect(lineActiveAt(content.npcs, 'm2', 839, {})).toBe(false);
    expect(lineActiveAt(content.npcs, 'm2', 840, {})).toBe(true);
    expect(lineActiveAt(content.npcs, 'r2', 520, {})).toBe(true); // 08:40
    expect(lineActiveAt(content.npcs, 'b5', 960, {})).toBe(true); // 16:00
    expect(lineActiveAt(content.npcs, 'nope', 960, {})).toBe(false);
    expect(inSpans(850, [{ from: 840, to: 960 }])).toBe(true);
    expect(HEAR_DEFAULT_MIN_ZOOM).toBe(1.6);
    expect(HEAR_DEFAULT_RADIUS).toBe(3);
  });
});
