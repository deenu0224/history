/**
 * Ep0 결론·조합표·왜 아닌지(DESIGN_V6 §6.4, §6.5). 결론 문구에는 큰 목표의 답 낱말이 없다(V4).
 * 결론의 사실은 만든 묶음의 사실을 이어받는다(「같은 말 두 번」은 이 이어받기로 계산된다).
 */
import type { Combo, Conclusion, Fact, FailCode, WhyOverride } from '@/core/v6/types';
import { CLUES } from './clues';

const e = (s: string, k: string, to: string): Fact => ({ s, k, v: { e: to } });
const t = (s: string, k: string, tok: string): Fact => ({ s, k, v: { t: tok } });
const same = (a: string, b: string): Fact => ({ s: a, k: '≡', v: { e: b } });

const A_FACTS: Fact[] = [...CLUES.c_title!.facts, t('choi', '직함', '부제학'), same('holder', 'choi'), same('scroll', 'g')];
const B_FACTS: Fact[] = [...A_FACTS, e('g', '받는 이', 'hs'), t('hs', '한 일', '언문을 만듦')];
const C_FACTS: Fact[] = [same('q', 'hs'), e('q', '본 것', 'g')];
const E_FACTS: Fact[] = [...B_FACTS, ...C_FACTS, t('q', '한 일', '언문을 만듦')];

export const CONCLUSIONS: Record<string, Conclusion> = {
  k_A: {
    id: 'k_A',
    kind: 'conclusion',
    short: '★ 두루마리를 편 관원',
    provenance: 'reconstructed',
    question: 'q1',
    value: 'choi',
    text: '두루마리를 편 관원 = 부제학 최만리 (두루마리는 그가 올린 글)',
    facts: A_FACTS,
    about: 'holder',
    reach: '두루마리를 편 관원이 누구인지',
    renames: { holder: '최만리' },
    mentions: ['두루마리를 편 관원'],
  },
  k_B: {
    id: 'k_B',
    kind: 'conclusion',
    short: '★ 높은 자리의 사람',
    provenance: 'reconstructed',
    question: 'q2',
    value: '언문을 만듦',
    text: '높은 자리의 사람 = 그 글을 받은 사람. 글은 그가 언문을 만들었다고 한다',
    facts: B_FACTS,
    about: 'hs',
    reach: '높은 자리의 사람이 글을 받은 일',
    monologue: 'mo_B',
    mentions: ['높은 자리의 사람'],
  },
  k_C: {
    id: 'k_C',
    kind: 'conclusion',
    short: "★ 뚫린 줄의 '누가'",
    provenance: 'reconstructed',
    question: 'q3',
    value: 'hs',
    text: "뚫린 줄의 '누가' = 높은 자리의 사람",
    facts: C_FACTS,
    about: 'q',
    reach: "'누가'가 높은 자리의 사람이라는 데",
    goalLine: "'누가' — 높은 자리의 사람",
    mentions: ["'누가'"],
  },
  k_E: {
    id: 'k_E',
    kind: 'conclusion',
    short: '★ 언문을 만든 그 사람',
    provenance: 'reconstructed',
    question: 'q3b',
    value: '언문을 만듦',
    text: "뚫린 줄의 '누가' = 언문을 만든 그 사람",
    facts: E_FACTS,
    about: 'q',
    reach: "'누가'가 언문을 만든 그 사람이라는 데",
    goalLine: "'누가' — 언문을 만든 그 사람",
    monologue: 'mo_E',
    mentions: ['언문을 만든 그 사람'],
  },
};

const s = (...ids: string[]) => [...ids].sort();

/** 설계한 맞는 묶음(검증기 V1 의 기대; 판정은 엔진이 사실로 따로 계산한다) */
export const COMBOS: Combo[] = [
  { id: 'K1', sets: [s('c_title', 'c_r_choi'), s('c_title', 'c_head')], gives: 'k_A' },
  { id: 'K2', sets: [s('k_A', 'c_eonmun')], gives: 'k_B' },
  { id: 'K3', sets: [s('c_tail', 'c_unseo'), s('c_tail', 'c_k_seol')], gives: 'k_C' },
  { id: 'K4', sets: [s('k_B', 'k_C')], gives: 'k_E' },
  { id: 'F', sets: [s('k_E', 'c_gunsang')], gives: 'goal' },
];

const w = (code: FailCode, a: string, b: string, text: string): WhyOverride => ({ pair: s(a, b), code, text });

/** 대표 오답(§6.5): 손으로 쓴 문구가 기본 틀을 덮는다. 코드는 엔진이 계산한 것과 같아야 한다(V8) */
export const WHY: WhyOverride[] = [
  w('conflict', 'c_title', 'c_r_jeong', '두루마리 첫머리의 직함은 부제학이다. 고른 명단 줄은 응교 — 맞지 않는다.'),
  w('twice', 'c_head', 'c_r_choi', "두 줄 모두 '부제학 최만리'를 말한다. 그날 그 자리에서 본 것과 맞춰 보자."),
  w('unlinked', 'c_title', 'c_eonmun', '두루마리 첫머리 직함까지는 간다. 그 직함이 누구인지 말해 주는 단서가 없다.'),
  w('unlinked', 'c_head', 'c_eonmun', '둘 다 올린 글 안의 줄이다. 그 글이 그날 누구 앞에 펼쳐졌는지 이어 주는 단서가 없다.'),
  w('other', 'c_tail', 'c_s_seol', '글 속 설총 줄은 글을 올린 쪽의 말이다. 뚫린 줄은 그 글을 보고 한 말이다.'),
  w('unlinked', 'c_tail', 'c_summon', "'부른 까닭' 말에도 올린 글이 나온다. 하지만 뚫린 줄에 남은 말(설총·운서·누가 바로잡겠느냐)과 같은 말이 없다."),
  w('unlinked', 'k_C', 'c_gunsang', "'누가'가 높은 자리의 사람이라는 데까지는 간다. 그가 '너희'가 그르다 한 그 일과 어떤 사이인지 말해 주는 단서가 없다."),
  w('off_goal', 'k_B', 'c_gunsang', "두 단서는 높은 자리의 사람 이야기로 잘 이어진다. 그런데 이 문장의 '누가'와 그 사람을 이어 주는 단서가 없다."),
  w('unlinked', 'c_eonmun', 'c_gunsang', "'언문을 만드신 일' 줄은 올린 글 쪽, '설총은 옳다' 하는 말은 높은 자리 쪽이다. 그 글이 누구 앞에 펼쳐졌는지 이어 주는 단서가 없다."),
  w('unlinked', 'k_E', 'c_k_seol', "'설총의 이두도…' 말은 '너희'가 한 말을 되묻는 말이다. 그 사람이 어떤 신분인지 말해 주지 않는다."),
  w('unlinked', 'k_E', 'c_summon', "'부른 까닭' 말에는 그 사람의 신분이 없다."),
  w('twice', 'k_A', 'k_B', "'높은 자리의 사람' 결론은 이미 '두루마리를 편 관원' 결론을 담고 있다. 하나를 바꿔 보자."),
];

/** 코드별 기본 틀(§5). {이름|조사} 는 josa 로 맞춘다 */
export const WHY_TEMPLATES: Record<FailCode, string> = {
  conflict: '{A|은/는} {key|이/가} {vA}다. {B|은/는} {vB} — 맞지 않는다.',
  other: '{A|은/는} {aboutA} 이야기다. {B|와/과} 이어지지 않는다.',
  unlinked: '{A|와/과} {B|을/를} 이어 주는 단서가 없다. {A|은/는} {reachA}까지, {B|은/는} {reachB}까지 간다.',
  ambiguous: '{group} 가운데 하나라는 데까지만 간다. 누구인지 가를 단서가 더 있어야 한다.',
  twice: '{A|와/과} {B|은/는} 같은 것을 말한다. 하나를 바꿔 보자.',
  off_goal: "{A|와/과} {B|은/는} 서로 잘 이어진다. 그런데 이 문장의 '누가'와 그 사람을 이어 주는 단서가 없다.",
};
