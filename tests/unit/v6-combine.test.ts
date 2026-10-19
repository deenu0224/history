import { describe, expect, it } from 'vitest';
import { EP0_V6 as D } from '@/data/v6/ep0';
import { judge, outcome, verdict } from '@/core/v6/combine';
import { judgeCtx } from '@/core/v6/validate';
import type { Card, Fact, World } from '@/core/v6/types';

const card = (id: string) => (D.clues[id] ?? D.conclusions[id])!;
const j = (a: string, b: string, found: string[] = [], goal = false) => judge(judgeCtx(D), [card(a), card(b)], found, goal);

describe('맞춰 보기 판정(데이터로 계산)', () => {
  it('설계한 맞는 묶음 K1~K4·F', () => {
    for (const k of D.combos)
      for (const set of k.sets) {
        const r = j(set[0]!, set[1]!);
        if (k.gives === 'goal') expect(r.status).toBe('goal');
        else expect(r).toMatchObject({ status: 'conclusion', conclusionId: k.gives });
      }
  });

  it('순서와 상관없다', () => {
    expect(j('c_unseo', 'c_tail')).toMatchObject({ status: 'conclusion', conclusionId: 'k_C' });
    expect(j('k_E', 'c_gunsang')).toEqual(j('c_gunsang', 'k_E'));
  });

  it('이미 맞춰 본 묶음은 실패가 아니라 「이미 맞춰 봄」', () => {
    expect(j('c_title', 'c_head', ['k_A'])).toEqual({ status: 'already', conclusionId: 'k_A' });
    expect(j('k_E', 'c_gunsang', [], true)).toEqual({ status: 'already', goal: true });
  });

  it('대표 오답은 설계한 코드를 받고 손으로 쓴 문구가 나온다', () => {
    for (const w of D.why) {
      const r = j(w.pair[0]!, w.pair[1]!);
      expect(r).toMatchObject({ status: 'fail', code: w.code, text: w.text });
    }
  });

  it('같은 묶음엔 같은 문구', () => {
    expect(j('c_head', 'c_unseo')).toEqual(j('c_unseo', 'c_head'));
  });

  it('결론은 하나만으로 나오지 않는다 — 모든 카드가 쓰여야 한다', () => {
    const o = outcome(D.world, [card('c_title'), card('c_r_choi')]);
    expect(o.fresh.map((a) => a.q)).toEqual(['q1']);
    expect(outcome(D.world, [card('c_title')]).fresh).toEqual([]);
    expect(outcome(D.world, [card('c_r_choi')]).fresh).toEqual([]);
  });

  it('중간 결론은 큰 목표의 답을 앞지르지 않는다: 답은 마지막 묶음에서만 처음 나온다', () => {
    const goalFirst = D.combos.filter((c) => c.gives === 'goal');
    expect(goalFirst).toHaveLength(1);
    for (const c of Object.values(D.conclusions)) for (const t of D.answerTokens) expect(c.text + c.short + (c.goalLine ?? '')).not.toContain(t);
  });
});

/** 같은 엔진이 다른 세계에서도 돈다(답은 엔진이 아니라 데이터에 있다) + 「하나로 좁혀지지 않음」 */
describe('엔진은 데이터에 의존한다', () => {
  const world: World = {
    entities: {
      a: { label: '가', kind: 'named' },
      b: { label: '나', kind: 'named' },
      x: { label: '그 사람', kind: 'slot' },
    },
    order: ['a', 'b', 'x'],
    keys: { 직함: { kind: 'ident', label: '직함' } },
    rules: [],
    facts: [],
    questions: [{ id: 'qx', subject: 'x', key: '누구', accept: ['named'] }],
    goal: { id: 'goal', text: '목표', question: { id: 'q0', subject: 'x', key: '누구', accept: ['word'] } },
  };
  const mk = (id: string, facts: Fact[], about: string): Card => ({ id, kind: 'record', short: id, provenance: 'reconstructed', facts, about, reach: '' });
  const t = (s: string, tok: string): Fact => ({ s, k: '직함', v: { t: tok } });
  const same = (s: string, e: string): Fact => ({ s, k: '≡', v: { e } });

  it('직함이 같은 이름을 고르고, 이름 둘이 걸리면 하나로 좁혀지지 않는다', () => {
    const one = verdict(world, [mk('p', [t('x', '영의정')], 'x'), mk('q', [t('a', '영의정')], 'a')]);
    expect(one.code).toBe('ok');
    expect(one.fresh[0]).toMatchObject({ q: 'qx', value: 'a' });
    // x 가 a 도 b 도 될 수 있다(같다고 적힌 단서 둘)
    const amb = verdict(world, [mk('p', [same('x', 'a')], 'x'), mk('q', [same('x', 'b')], 'x')]);
    expect(amb.code).toBe('ambiguous');
  });

  it('직함이 갈리면 어긋남', () => {
    expect(verdict(world, [mk('p', [t('x', '영의정')], 'x'), mk('q', [t('a', '좌의정')], 'a')]).code).toBe('conflict');
  });
});
