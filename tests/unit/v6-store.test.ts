import { describe, expect, it } from 'vitest';
import { EP0_V6 as D } from '@/data/v6/ep0';
import { bagCards, choose, combinations, sharedChips, withChip } from '@/core/v6/bag';
import { clueOrigins, clueProgress, reachable, visibleLinks } from '@/core/v6/graph';
import {
  createV6Store,
  selectBag,
  selectFix,
  selectGoal,
  selectLabels,
  selectNode,
  selectWonmun,
  selectMonologues,
  selectNav,
  V6_SAVE_KEY,
} from '@/store/v6/store';
import { fromLegacy as legacy, parseSave, serialize, freshState, V6SaveError } from '@/store/v6/engine';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
function make() {
  let t = 0;
  const storage = mem();
  const store = createV6Store({ now: () => t, storage, seed: 7 });
  return { store, storage, tick: (ms: number) => ((t += ms), store.getState().tick()), advance: (ms: number) => (t += ms) };
}
const S = (x: ReturnType<typeof make>) => x.store.getState().s;

/** 처음부터 끝까지 한 번 */
function playToGoal(x: ReturnType<typeof make>) {
  const a = x.store.getState();
  a.start();
  for (const c of ['c_head', 'c_eonmun', 'c_s_seol', 'c_tail', 'c_r_choi', 'c_r_jeong']) expect(a.collect(c).status).toBe('ok');
  expect(a.followLink('n0_n1').status).toBe('ok');
  a.setPage('N1', 2);
  for (const c of ['c_title', 'c_k_seol', 'c_gunsang', 'c_unseo', 'c_summon']) expect(a.collect(c).status).toBe('ok');
  const go = (p: string, q: string) => {
    a.pick(p);
    a.pick(q);
    return a.combine();
  };
  expect(go('c_title', 'c_r_choi')).toMatchObject({ status: 'conclusion', conclusionId: 'k_A' });
  expect(go('k_A', 'c_eonmun')).toMatchObject({ status: 'conclusion', conclusionId: 'k_B' });
  expect(go('c_tail', 'c_unseo')).toMatchObject({ status: 'conclusion', conclusionId: 'k_C' });
  expect(go('k_B', 'k_C')).toMatchObject({ status: 'conclusion', conclusionId: 'k_E' });
  expect(go('k_E', 'c_gunsang')).toMatchObject({ status: 'goal' });
}

describe('v6 스토어: 처음부터 끝까지', () => {
  it('Ep0 한 판: 따라가기 → 모으기 → 맞춰 보기 → 큰 목표 → 역사 고정 → 복원', () => {
    const x = make();
    const a = x.store.getState();
    expect(a.start()).toBe('started');
    expect(selectNode(S(x))!.id).toBe('N0');
    expect(selectGoal(S(x))).toMatchObject({ text: "이 문장의 '누가'를 밝혀라", status: 'open' });
    playToGoal(x);
    expect(selectGoal(S(x))).toMatchObject({ status: 'solved', answer: '임금' });
    expect(selectNav(S(x)).center).toBe('fix');
    // 역사 고정
    expect(selectFix(S(x)).sentence).toContain('임금이 소(疏)를 보고');
    expect(a.fix()).toEqual({ status: 'restored' });
    const s = S(x);
    expect(s.fixed && s.restored).toBe(true);
    expect(selectFix(S(x)).rate.pct).toBe(100);
    expect(selectFix(S(x)).citation).toContain('세종 26년 2월 20일');
    expect(a.advanceRestore()).toBe('neighbors');
    expect(a.advanceRestore()).toBe('monologue');
    expect(selectMonologues(S(x)).some((m) => m.id === 'mo_restore')).toBe(true);
    expect(a.advanceRestore()).toBe('done');
    expect(S(x).epilogueDone).toBe(true);
    expect(selectNav(S(x)).center).toBe('next');
    // 복원 뒤 이웃 기록이 열린다
    expect(a.followLink('n0_n11').status).toBe('unknown'); // N1 에 서 있다 — 그 칩은 N0 에 있다
    a.back();
    expect(a.openNode('N0').status).toBe('ok');
    expect(a.followLink('n0_n11').status).toBe('ok');
    expect(selectNode(S(x))!.title).toBe('세종 카드');
  });

  it('두 번 고정할 수 없고, 목표 전에는 고정할 수 없다', () => {
    const x = make();
    x.store.getState().start();
    expect(x.store.getState().fix()).toEqual({ status: 'not_ready' });
    playToGoal(x);
    x.store.getState().fix();
    expect(x.store.getState().fix()).toEqual({ status: 'already' });
  });
});

describe('따라가기와 모으기', () => {
  it('시작 전에는 아무것도 열 수 없다', () => {
    const x = make();
    expect(x.store.getState().openNode('N0').status).toBe('not_started');
  });

  it('칩으로만 닿는다: 숨은 경로·잠긴 칩·복원 뒤 기록', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    expect(a.openNode('N8').status).toBe('locked'); // 복원 뒤에만
    expect(a.openNode('N11').status).toBe('locked');
    expect(a.followLink('n0_n9')).toMatchObject({ status: 'locked', reason: '날짜 없음 — 관측 불가' });
    expect(a.openNode('N9').status).toBe('locked');
    expect(a.followLink('n0_n6').status).toBe('ok');
    expect(selectNode(S(x))!.id).toBe('N6');
    expect(a.back()).toBe('N0');
  });

  it('아직 넘기지 않은 쪽의 단서는 모을 수 없다', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    expect(a.collect('c_title').status).toBe('not_seen');
    a.followLink('n0_n1');
    expect(a.collect('c_title').status).toBe('ok');
    expect(a.collect('c_k_seol').status).toBe('not_seen');
    expect(a.collect('c_unseo').status).toBe('not_seen');
    a.setPage('N1', 1);
    expect(a.collect('c_k_seol').status).toBe('ok');
    expect(a.collect('c_k_seol').status).toBe('already');
    expect(a.collect('nope').status).toBe('unknown');
    expect(selectNode(S(x), D, 0)!.page).toBe(0);
    expect(selectNode(S(x), D, 2)!.page).toBe(1); // 넘기지 않은 쪽은 보이지 않는다
  });

  it('기록 머리 「단서 n/m」', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    expect(selectNode(S(x))!.clues).toEqual({ got: 0, total: 6 });
    a.collect('c_head');
    expect(selectNode(S(x))!.clues).toEqual({ got: 1, total: 6 });
  });

  it('결론 뒤 이름이 바뀌고 새 칩이 열린다', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    a.collect('c_head');
    a.followLink('n0_n1');
    a.collect('c_title');
    a.setPage('N1', 1);
    a.collect('c_k_seol');
    expect(selectNode(S(x), D, 1)!.blocks[0]!.stage).toContain('두루마리를 편 관원');
    expect(selectNode(S(x))!.links.some((l) => l.id === 'n1_n2')).toBe(false);
    a.pick('c_title');
    a.pick('c_head');
    expect(a.combine()).toMatchObject({ status: 'conclusion', conclusionId: 'k_A' });
    expect(selectLabels(S(x))).toEqual({ holder: '최만리' });
    expect(selectNode(S(x), D, 1)!.blocks[0]!.stage).toContain('최만리 쪽에게');
    expect(selectNode(S(x), D, 1)!.links.some((l) => l.id === 'n1_n2')).toBe(true);
  });
});

describe('맞춰 보기', () => {
  it('n 칸이 다 차야 한다. 가방 밖 카드·세 번째 카드는 거절', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    a.collect('c_head');
    expect(a.pick('c_title').status).toBe('not_in_bag');
    expect(a.pick('c_head').status).toBe('ok');
    expect(a.pick('c_head').status).toBe('already');
    expect(a.combine()).toEqual({ status: 'incomplete' });
    a.collect('c_tail');
    a.collect('c_r_choi');
    a.pick('c_tail');
    expect(a.pick('c_r_choi').status).toBe('full');
    expect(a.unpick('c_head')).toBe(true);
    expect(selectBag(S(x)).slots.map((c) => c?.id ?? null)).toEqual(['c_tail', null]);
  });

  it('틀리면 왜 아닌지(벌 없음), 고른 칸은 남고, 다섯 번 틀리면 한 선임이 볼 곳만 말한다', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    for (const c of ['c_head', 'c_eonmun', 'c_s_seol', 'c_tail', 'c_r_choi', 'c_r_jeong']) a.collect(c);
    const wrong: [string, string][] = [['c_head', 'c_eonmun'], ['c_head', 'c_s_seol'], ['c_tail', 'c_s_seol'], ['c_eonmun', 'c_r_jeong'], ['c_tail', 'c_r_choi']];
    let last = null as ReturnType<typeof a.combine> | null;
    for (const [p, q] of wrong) {
      a.pick(p);
      a.pick(q);
      last = a.combine();
      expect(last.status).toBe('fail');
      expect(x.store.getState().ui.result).toMatchObject({ status: 'fail' });
      expect(S(x).picked).toEqual([p, q]);
      a.unpick(p);
      a.unpick(q);
    }
    expect(S(x).fails).toBe(5);
    expect(S(x).found).toEqual([]);
    expect(S(x).hintsGiven).toEqual(['hint.h1']);
    // 다음 다섯 번 → 다음 단
    for (let i = 0; i < 5; i++) {
      a.pick('c_head');
      a.pick('c_eonmun');
      a.combine();
      a.unpick('c_head');
      a.unpick('c_eonmun');
    }
    expect(S(x).hintsGiven).toEqual(['hint.h1', 'hint.h2']);
    x.tick(60_000);
    x.tick(60_000);
    x.tick(60_000);
    const texts = S(x).messenger.log.map((m) => m.text);
    expect(texts).toContain('틀려도 손해 없어. 다시 맞춰 봐.');
    expect(texts).toContain('관측 1 첫 쪽, 두루마리에 뭐가 보였지?');
  });

  it('이미 맞춰 본 묶음은 실패가 아니다', () => {
    const x = make();
    const a = x.store.getState();
    playToGoal(x);
    a.pick('c_head');
    a.pick('c_title');
    expect(a.combine()).toEqual({ status: 'already', conclusionId: 'k_A' });
    expect(S(x).fails).toBe(0);
  });

  it('주머니: 낱말 칩과 같은 문장 합치기', () => {
    const x = make();
    const a = x.store.getState();
    playToGoal(x);
    const bag = selectBag(S(x));
    expect(bag.chips).toEqual(expect.arrayContaining(['부제학', '설총', '운서', '누가 바로잡겠느냐', '너희']));
    expect(selectBag(S(x), D, '운서').cards.map((c) => c.id).sort()).toEqual(['c_tail', 'c_unseo']);
    expect(bag.cards.filter((c) => c.conclusion)).toHaveLength(4);
    expect(bag.cards.find((c) => c.id === 'c_title')!.kindLabel).toBe('본 것');
    // dupOf 로 같은 문장 두 곳 → 카드 하나
    const clues = { ...D.clues, c_dup: { ...D.clues.c_head!, id: 'c_dup', dupOf: 'c_head' } };
    const cards = bagCards(clues, D.conclusions, ['c_head', 'c_dup'], [], { c_head: ['N0'], c_dup: ['N6'] });
    expect(cards).toHaveLength(1);
    expect(cards[0]!.origins).toEqual(['N0', 'N6']);
    void a;
  });
});

describe('원문 보기', () => {
  it('toggleWonmun 과 selectWonmun: 복원 전 가림·같은 자리 손상, 복원 뒤 공개', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    expect(a.toggleWonmun('m_tail')).toBe(true);
    const p = selectWonmun(S(x), 'm_tail')!;
    expect(p.open).toBe(true);
    expect(p.wonmun).toMatchObject({ status: 'damaged' });
    expect(p.source.text).toContain('출처는 복원 뒤에 보인다');
    expect(p.source.url).toBeUndefined();
    expect(p.kukyeok).toContain('[ ? ] 소(疏)를 보고');
    expect(selectWonmun(S(x), 'm_gunsang')!.wonmun).toMatchObject({ status: 'ok', text: '汝等以薛聰爲是, 而非其君上之事, 何哉?' });
    expect(selectWonmun(S(x), 'm_gunsang')!.gloss).toEqual(expect.arrayContaining([{ term: '군상', meaning: '임금' }]));
    expect(a.toggleWonmun('m_tail')).toBe(false);
    playToGoal(x);
    a.fix();
    const q = selectWonmun(S(x), 'm_tail')!;
    expect(q.wonmun.status).toBe('ok');
    expect(q.source.url).toContain('kda_12602020_001');
  });

  it('복원 전 화면 어디에도 답 낱말이 없다(검증된 사료 줄 제외)', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    for (const c of ['c_head', 'c_eonmun', 'c_s_seol', 'c_tail', 'c_r_choi', 'c_r_jeong']) a.collect(c);
    const dump = JSON.stringify([selectNode(S(x)), selectGoal(S(x)), selectBag(S(x))]);
    for (const t of D.answerTokens) expect(dump).not.toContain(t);
  });
});

describe('저장 v8', () => {
  it('저장 → 불러오기 왕복, v5 저장과 키가 다르다', () => {
    const x = make();
    playToGoal(x);
    expect(V6_SAVE_KEY).toBe('gyeollok-v6-save');
    expect(x.storage.m.has(V6_SAVE_KEY)).toBe(true);
    const raw = JSON.parse(x.storage.m.get(V6_SAVE_KEY)!);
    expect(raw.version).toBe(8);
    const y = createV6Store({ now: () => 0, storage: x.storage });
    expect(y.getState().load()).toBe(true);
    expect(y.getState().s.found).toEqual(S(x).found);
    expect(y.getState().s.goalValue).toBe('king');
    y.getState().fix();
    expect(y.getState().s.restored).toBe(true);
  });

  it('빈 저장소·깨진 저장·더 새로운 저장', () => {
    const st = mem();
    const y = createV6Store({ now: () => 0, storage: st });
    expect(y.getState().load()).toBe(false);
    st.setItem(V6_SAVE_KEY, '{깨짐');
    expect(y.getState().load()).toBe(false);
    expect(() => parseSave({ schema: 'gyeollok-save-v6', version: 99, data: {} })).toThrow(V6SaveError);
    expect(() => parseSave({ nope: 1 })).toThrow(V6SaveError);
  });

  it('옛 저장(v5)은 진행을 버리고 설정·대화 기록만 남긴다', () => {
    const old = { schema: 'gyeollok-save', version: 7, data: { settings: { volume: 0.3, textSize: 'large' }, restored: false, messenger: { log: [{ id: 'z', from: 'han', kind: 'bubble', text: '안녕', at: 1, burstId: 'b' }] }, named: { a: 'b' } } };
    const s = legacy(old, 1, 0);
    expect(s.settings.volume).toBe(0.3);
    expect(s.settings.textSize).toBe('large');
    expect(s.messenger.log.map((m) => m.text)).toEqual(['안녕']);
    expect(s.started).toBe(false);
    expect(s.collected).toEqual([]);
  });

  it('reset 은 설정을 남긴다', () => {
    const x = make();
    x.store.getState().setSettings({ volume: 0.1 });
    playToGoal(x);
    x.store.getState().reset();
    expect(S(x).started).toBe(false);
    expect(S(x).settings.volume).toBe(0.1);
    expect(x.storage.m.has(V6_SAVE_KEY)).toBe(false);
  });

  it('직렬화는 진행 칸만 담는다', () => {
    const f = serialize(freshState(1, 0));
    expect(Object.keys(f.data)).toContain('found');
    expect(f.version).toBe(8);
  });
});

describe('메신저와 현실 재기록', () => {
  it('시작 한 줄, 복원 뒤 대화가 조용히 다시 쓰인다', () => {
    const x = make();
    const a = x.store.getState();
    a.start();
    for (let i = 0; i < 6; i++) x.tick(5_000);
    expect(S(x).messenger.log.map((m) => m.text)).toContain('07, 실록 한 꼭지가 다 뚫렸어.');
    playToGoal(x);
    for (let i = 0; i < 20; i++) x.tick(5_000);
    const before = S(x).messenger.log.find((m) => m.text === '한글은 쓰는데 만든 사람은 기록에 없지.');
    expect(before).toBeTruthy();
    a.fix();
    for (let i = 0; i < 20; i++) x.tick(5_000);
    a.openMessenger();
    // 복원 뒤 같은 말풍선의 현재 글이 다시 쓰인다(표시 없음)
    const v = x.store.getState().s.messenger.log.find((m) => m.id === before!.id)!;
    expect(v.restored).toBe('한글 얘기는 이 기록에도 나오지.');
  });
});

describe('그래프·주머니 순수 함수', () => {
  it('Ep0: 모든 단서가 시작 기록에서 보이는 연결로 닿는다', () => {
    const reach = reachable(D.nodes, D.start, { found: [], restored: false });
    for (const [id, os] of Object.entries(clueOrigins(D.nodes))) expect(os.some((o) => reach.has(o.node)), id).toBe(true);
    expect(reach.has('N9')).toBe(false);
    expect(reach.has('N11')).toBe(false);
    const after = reachable(D.nodes, D.start, { found: [], restored: true });
    expect(after.has('N9') && after.has('N11') && after.has('N8')).toBe(true);
  });

  it('시간 칩은 상대 시간만: 연도·왕대 없음', () => {
    for (const n of Object.values(D.nodes))
      for (const l of n.links) if (l.kind === 'time') expect(l.label).not.toMatch(/\d{3,4}|세종|왕/);
  });

  it('visibleLinks / clueProgress / 조합 수', () => {
    expect(visibleLinks(D.nodes.N0!, { found: [], restored: false }).map((l) => l.id)).not.toContain('n0_n11');
    expect(clueProgress(D.nodes, 'N1', ['c_title'])).toEqual({ got: 1, total: 5 });
    expect(choose(11, 2)).toBe(55);
    expect(combinations([1, 2, 3, 4], 2)).toHaveLength(6);
    expect(sharedChips([]).length).toBe(0);
    expect(withChip([], 'x')).toEqual([]);
  });
});
