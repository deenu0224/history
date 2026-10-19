/**
 * Ep0 세계 논리(DESIGN_V6 §3, §6.4): 대상·키·규칙·숨은 물음·큰 목표. 화면에 나오지 않는다.
 * 큰 목표의 답은 마지막 묶음에서만 처음 나온다 — 숨은 물음은 답 낱말(임금)을 값으로 갖지 않는다.
 */
import type { Entity, Fact, KeySpec, Pat, Question, Rule, World } from '@/core/v6/types';

const ent = (label: string, kind: Entity['kind']): Entity => ({ label, kind });

/** 순서 = 같은 대상으로 묶일 때의 대표(이름 있는 쪽이 앞) */
const ENTITIES: Record<string, Entity> = {
  choi: ent('최만리', 'named'),
  jeong: ent('정창손', 'named'),
  g: ent('올린 글', 'thing'),
  scroll: ent('두루마리', 'thing'),
  holder: ent('두루마리를 편 관원', 'slot'),
  hs: ent('높은 자리의 사람', 'role'),
  q: ent("뚫린 줄의 '누가'", 'slot'),
  you: ent('너희', 'role'),
  wrongdone: ent('너희가 그르다 한 일', 'thing'),
  king: ent('임금', 'word'),
};

const KEYS: Record<string, KeySpec> = {
  직함: { kind: 'ident', label: '직함' },
  '한 말': { kind: 'words', label: '한 말' },
  '첫머리 직함': { kind: 'plain', label: '첫머리 직함' },
  '편 것': { kind: 'plain', label: '편 것' },
  '앞에 둔 사람': { kind: 'plain', label: '앞에 둔 사람' },
  '받는 이': { kind: 'plain', label: '받는 이' },
  '받는 이의 일': { kind: 'plain', label: '받는 이의 일' },
  '올린 이': { kind: 'plain', label: '올린 이' },
  '말한 이': { kind: 'plain', label: '말한 이' },
  '말한 것': { kind: 'plain', label: '말한 것' },
  '본 것': { kind: 'plain', label: '본 것' },
  '하는 이': { kind: 'plain', label: '하는 이' },
  내용: { kind: 'plain', label: '내용' },
  '한 일': { kind: 'plain', label: '한 일' },
  '말한 상대': { kind: 'plain', label: '말한 상대' },
  '물은 것': { kind: 'plain', label: '물은 것' },
};

const p = (s: string, k: string, v: Pat['v']): Pat => ({ s, k, v });

const RULES: Rule[] = [
  // 두루마리를 편 사람의 직함 = 두루마리 첫머리 직함
  { id: 'R_head', if: [p('?x', '편 것', { e: '?s' }), p('?s', '첫머리 직함', { t: '?v' })], then: p('?x', '직함', { t: '?v' }) },
  // 글을 올린 이가 편 두루마리 = 그 올린 글
  { id: 'R_same_doc', if: [p('?x', '편 것', { e: '?s' }), p('?g', '올린 이', { e: '?x' })], then: p('?s', '≡', { e: '?g' }) },
  // 두루마리를 앞에 둔 사람 = 그 글을 받는 이
  { id: 'R_recipient', if: [p('?x', '편 것', { e: '?s' }), p('?x', '앞에 둔 사람', { e: '?p' })], then: p('?s', '받는 이', { e: '?p' }) },
  // 글이 받는 이에게 말하는 일 = 받는 이가 했다는 일
  { id: 'R_deed', if: [p('?g', '받는 이', { e: '?p' }), p('?g', '받는 이의 일', { t: '?v' })], then: p('?p', '한 일', { t: '?v' }) },
  // 글을 보고 말한 사람은 그 글을 올린 쪽이 아니다
  { id: 'R_reader', if: [p('?q', '본 것', { e: '?g' }), p('?g', '올린 이', { e: '?w' })], then: p('?q', '≠', { e: '?w' }) },
  // 어떤 일을 한 사람 = 그 일의 하는 이
  { id: 'R_same_deed', if: [p('?w', '하는 이', { e: '?who' }), p('?w', '내용', { t: '?v' }), p('?p', '한 일', { t: '?v' })], then: p('?p', '≡', { e: '?who' }) },
];

/** N0 머리에 늘 보이는 것: 글은 최만리 등이 올렸다 */
const WORLD_FACTS: Fact[] = [{ s: 'g', k: '올린 이', v: { e: 'choi' } }];

const Q: Question[] = [
  { id: 'q1', subject: 'holder', key: '누구', accept: ['named'] },
  { id: 'q2', subject: 'hs', key: '한 일' },
  { id: 'q3', subject: 'q', key: '누구', accept: ['role'] },
  { id: 'q3b', subject: 'q', key: '한 일' },
];

export const EP0_WORLD: World = {
  entities: ENTITIES,
  order: Object.keys(ENTITIES),
  keys: KEYS,
  rules: RULES,
  facts: WORLD_FACTS,
  questions: Q,
  goal: {
    id: 'goal',
    text: "이 문장의 '누가'를 밝혀라",
    question: { id: 'q0', subject: 'q', key: '누구', accept: ['word'] },
  },
};
