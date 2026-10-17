import { describe, expect, it } from 'vitest';
import * as M from '@/core/messenger';
import type { Burst } from '@/core/types';
import { EP1 } from '@/data/v5';
import { burstsOf } from '@/store/engine';
import { makeStore } from './store-helpers';

const say = (id: string, text: string, heavy = false) => ({ kind: 'say' as const, id, from: 'han' as const, text, ...(heavy ? { heavy: true as const } : {}) });
const B: Burst[] = [
  { id: 'six', steps: [say('a', '하나.'), say('b', '둘.'), say('c', '셋.'), say('d', '넷.'), say('e', '다섯.'), say('f', '여섯.')] },
  { id: 'hint', spontaneous: true, steps: [say('h', '힌트.')] },
  { id: 'hint2', spontaneous: true, steps: [say('h2', '또 힌트.')] },
  {
    id: 'ask',
    steps: [
      say('q', '어때?'),
      { kind: 'choice', id: 'c', options: [{ id: 'yes', text: '좋아요.', then: [say('r', '응.')] }, { id: 'no', text: '아니요.', then: [] }], after: [say('z', '그래.')] },
    ],
  },
  {
    id: 'job',
    steps: [say('j', '찾아볼게.'), { kind: 'status', presence: 'away' }, { kind: 'async', event: 'result', minS: 40, maxS: 90, capS: 120 }],
  },
  { id: 'result', steps: [{ kind: 'status', presence: 'online' }, say('res', '찾았어.')] },
];
const ctx = (extra: Partial<M.MsgCtx> = {}): M.MsgCtx => ({ bursts: new Map(B.map((b) => [b.id, b])), ...extra });

/** 시간을 잘게 흘린다 */
function run(s: M.MessengerState, from: number, to: number, c: M.MsgCtx = ctx(), step = 50) {
  const delivered: M.MsgItem[] = [];
  for (let t = from; t <= to; t += step) {
    const r = M.tick(s, t, c);
    s = r.state;
    delivered.push(...r.delivered);
  }
  return { s, delivered };
}

describe('messenger timing model (DIALOGUE_GUIDE §2)', () => {
  it('typingMs = clamp(500 + 55n, 700, 3800), n = non-space chars', () => {
    expect(M.typingMs('가나다라마바사아자차')).toBe(1050);
    expect(M.typingMs('응.')).toBe(700);
    expect(M.typingMs('가'.repeat(80))).toBe(3800);
    expect(M.typingMs('가 나 다')).toBe(700);
    expect(M.typingMs('가'.repeat(20))).toBe(1600);
  });

  it('is deterministic for a seed (inject clock), and the seed matters', () => {
    const go = (seed: number) => {
      let s = M.fire(M.createMessenger(seed, 0), 'six', 0, ctx()).state;
      s = M.openMessenger(s, 0, ctx({ messengerOpen: true }));
      return run(s, 0, 40_000, ctx({ messengerOpen: true })).s.log.map((m) => [m.id, m.at]);
    };
    expect(go(11)).toEqual(go(11));
    expect(go(11)).not.toEqual(go(12));
    const times = go(11).map(([, at]) => at as number);
    // 말풍선 사이: 공백 1~3s + 입력 0.7s 이상(망설임이면 더)
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(1000 + 700);
  });

  it('shows typing before a bubble, then delivers', () => {
    let s = M.fire(M.createMessenger(3, 0), 'six', 0, ctx()).state;
    s = M.tick(s, 0, ctx()).state;
    const p = s.planned!;
    expect(p.typingAt).toBeGreaterThanOrEqual(400);
    expect(M.view(s, p.typingAt! + 1, false).typing).toEqual({ from: 'han' });
    expect(M.view(s, p.typingAt! - 1, false).typing).toBeNull();
    const r = M.tick(s, p.deliverAt, ctx());
    expect(r.delivered.map((m) => m.text)).toEqual(['하나.']);
  });

  it('caps a burst at 4 bubbles until the messenger is opened', () => {
    let s = M.fire(M.createMessenger(5, 0), 'six', 0, ctx()).state;
    s = run(s, 0, 60_000).s;
    expect(s.log.map((m) => m.text)).toEqual(['하나.', '둘.', '셋.', '넷.']);
    expect(s.stalled).toBe(true);
    expect(M.view(s, 60_000, false).unread).toBe(4);
    s = M.openMessenger(s, 60_000, ctx({ messengerOpen: true }));
    expect(M.view(s, 60_000, false).unread).toBe(0);
    s = run(s, 60_000, 80_000, ctx({ messengerOpen: true })).s;
    expect(s.log).toHaveLength(6);
  });

  it('holds while a finger is down and delivers 600ms after release', () => {
    let s = M.fire(M.createMessenger(9, 0), 'hint', 0, ctx()).state;
    s = M.tick(s, 0, ctx()).state;
    const due = s.planned!.deliverAt;
    const held = M.tick(s, due + 5_000, ctx({ touching: true }));
    expect(held.delivered).toEqual([]);
    expect(held.state.heldForTouch).toBe(true);
    s = M.release(held.state, due + 5_000);
    expect(M.tick(s, due + 5_599, ctx()).delivered).toEqual([]);
    expect(M.tick(s, due + 5_600, ctx()).delivered.map((m) => m.text)).toEqual(['힌트.']);
  });

  it('spontaneous messages: at most one per 90 seconds', () => {
    let s = M.createMessenger(1, 0);
    expect(M.fire(s, 'hint', 0, ctx()).accepted).toBe(true);
    s = M.fire(s, 'hint', 0, ctx()).state;
    expect(M.fire(s, 'hint2', 89_000, ctx())).toMatchObject({ accepted: false, reason: 'rate_limited' });
    expect(M.fire(s, 'hint2', 90_000, ctx()).accepted).toBe(true);
    expect(M.fire(s, 'hint', 200_000, ctx())).toMatchObject({ accepted: false, reason: 'already' });
  });

  it('reply options only on the player turn; reply is read, then she types', () => {
    let s = M.fire(M.createMessenger(4, 0), 'ask', 0, ctx()).state;
    expect(M.view(s, 0, false).choices).toBeNull();
    expect(M.choose(s, 'yes', 0, ctx()).ok).toBe(false);
    s = run(s, 0, 10_000).s;
    expect(M.view(s, 10_000, false).choices).toEqual([
      { id: 'yes', text: '좋아요.' },
      { id: 'no', text: '아니요.' },
    ]);
    const r = M.choose(s, 'yes', 10_000, ctx());
    expect(r.ok).toBe(true);
    const mine = r.state.log.at(-1)!;
    expect(mine).toMatchObject({ from: 'me', text: '좋아요.', at: 10_000 });
    expect(mine.readAt! - 10_000).toBeGreaterThanOrEqual(800);
    expect(mine.readAt! - 10_000).toBeLessThanOrEqual(2500);
    expect(r.state.planned!.typingAt!).toBeGreaterThanOrEqual(mine.readAt! + 600);
    const done = run(r.state, 10_000, 30_000).s;
    expect(done.log.map((m) => m.text)).toEqual(['어때?', '좋아요.', '응.', '그래.']);
  });

  it('an unanswered choice expires and the common continuation still comes', () => {
    let s = M.fire(M.createMessenger(4, 0), 'ask', 0, ctx()).state;
    s = run(s, 0, 200_000, ctx(), 500).s;
    expect(s.choice).toBeNull();
    expect(s.log.map((m) => m.text)).toEqual(['어때?', '그래.']);
  });

  it('async task: result at max(40–90s, next completion action), capped at 120s', () => {
    // 완료 행동이 일찍 → 최소 대기(40~90s) 뒤
    let s = M.fire(M.createMessenger(2, 0), 'job', 0, ctx()).state;
    s = run(s, 0, 5_000).s;
    expect(s.presence).toBe('away');
    const task = s.tasks[0];
    expect(task.earliestAt - task.startAt).toBeGreaterThanOrEqual(40_000);
    expect(task.earliestAt - task.startAt).toBeLessThanOrEqual(90_000);
    s = M.notifyCompletion(s, 6_000);
    const a = run(s, 5_000, task.earliestAt + 10_000, ctx(), 100);
    const got = a.delivered.find((m) => m.text === '찾았어.')!;
    expect(got.at).toBeGreaterThan(task.earliestAt);
    expect(a.s.presence).toBe('online');
    // 완료 행동 없음 → 상한 120s
    let s2 = M.fire(M.createMessenger(2, 0), 'job', 0, ctx()).state;
    s2 = run(s2, 0, 5_000).s;
    const t2 = s2.tasks[0];
    const b = run(s2, 5_000, t2.capAt - 100, ctx(), 100);
    expect(b.delivered.find((m) => m.text === '찾았어.')).toBeUndefined();
    const c = run(b.s, t2.capAt - 100, t2.capAt + 10_000, ctx(), 100);
    expect(c.delivered.find((m) => m.text === '찾았어.')).toBeDefined();
  });

  it('fast messages: all times × 0.4, no hesitation', () => {
    const go = (fast: boolean) => {
      let s = M.fire(M.createMessenger(77, 0), 'hint', 0, ctx()).state;
      s = M.tick(s, 0, ctx({ fast })).state;
      return s.planned!;
    };
    const fast = go(true);
    expect(fast.deliverAt - fast.typingAt!).toBeCloseTo(M.typingMs('힌트.') * 0.4, 5);
    expect(fast.typingAt!).toBeLessThanOrEqual(1200 * 0.4);
    expect(fast.hesitated).toBeFalsy();
  });

  it('rebase after a long absence moves plans to now (no dump)', () => {
    let s = M.fire(M.createMessenger(5, 0), 'six', 0, ctx()).state;
    s = M.tick(s, 0, ctx()).state;
    const before = s.planned!.deliverAt;
    s = M.rebase(s, 600_000);
    expect(s.planned!.deliverAt).toBe(before + 600_000);
  });
});

describe('messenger in the store (EP1 script)', () => {
  it('ev.start: 오 실장 둘 → 한 선임 둘, 답장 없이 끝난다(말수 예산)', () => {
    const h = makeStore(21);
    h.st().startEpisode();
    h.advance(30_000);
    expect(h.st().messenger.log.map((m) => m.from)).toEqual(['oh', 'oh', 'han', 'han']);
    expect(h.st().messenger.log.map((m) => m.text)).toEqual(['07, 우선순위 낮은 건 하나 너한테 갔다.', '06시에 관측기 한 바퀴 도니까 그 전에 끝내.', '아까 그거야, 명단 하나 붙어 있더라.', '거기서 셋만 뽑아 카드 올려놨고, 나머진 찾기로 봐.']);
    h.st().openMessenger();
    h.advance(40_000);
    expect(h.st().messenger.log).toHaveLength(4);
    expect(h.st().messenger.choice).toBeFalsy();
  });

  it('two stores with the same seed and clock produce the same chat', () => {
    const run2 = () => {
      const h = makeStore(99);
      h.st().startEpisode();
      h.st().openMessenger();
      h.advance(40_000);
      return h.st().messenger.log.map((m) => [m.id, m.at]);
    };
    expect(run2()).toEqual(run2());
  });

  it('hint ladder: 20s silence for h_swipe, then one hint; no repeats beyond 3 per ladder', () => {
    const h = makeStore(5);
    h.st().startEpisode();
    h.st().openMessenger();
    h.advance(40_000);
    h.st().closeMessenger();
    h.st().openEye('E1');
    h.advance(19_000);
    expect(h.st().messenger.fired).not.toContain('hint.h_swipe_1');
    h.advance(2_000);
    expect(h.st().messenger.fired).toContain('hint.h_swipe_1');
    expect(h.st().hints.sent.h_swipe).toBe(1);
  });

  it('hint level off sends nothing', () => {
    const h = makeStore(5);
    h.st().setSettings({ hintLevel: 'off' });
    h.st().startEpisode();
    h.st().openEye('E1');
    h.advance(200_000, 1000);
    expect(h.st().messenger.fired.filter((f) => f.startsWith('hint.'))).toEqual([]);
  });

  it('every ladder step has a spontaneous burst', () => {
    const m = burstsOf(EP1);
    for (const l of EP1.ladders) for (const st of l.steps) expect(m.get(`hint.${st.id}`)?.spontaneous).toBe(true);
  });
});
