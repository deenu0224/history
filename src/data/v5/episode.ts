/**
 * 에피소드 1 「한 사관의 흔적」 번들(v5). 코어·스토어·검증기가 이 한 객체를 받는다.
 */
import { GLOSSARY1 } from '@/data/glossary';
import type { Episode, SearchEntry } from '@/core/types';
import { CARDS, FACT_KEY_IMPLIES, LEDGER_NAMES, PERSON_FACT_LEDGER, ROOM_PERSONS, SURNAME_KEYS } from './cards';
import { BURSTS, ERASED1, LADDERS } from './messenger';
import { ARTICLE, CLAIMS, CONTRADICTIONS, PIECES, REQUIRED_SENTENCES, SENTENCES, TAGS } from './puzzle';
import { CLOCKS, DOC_TERMS, DOCS, EPILOGUE, HOME, RECORD_TERMS, RECORDS } from './records';
import { ROOM } from './room';
import { CLOSURES, CUTS, DETAILS, EYES, FIGURES, GROUPS, LINES } from './scene';

/** 찾기 색인: 인물 카드(이름·한자) + 기록 카드 + 내 관측 로그 문서 */
function buildSearch(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const c of CARDS)
    out.push({ id: `s_${c.id}`, terms: c.searchTerms, results: [{ kind: 'person', id: c.id }], ...(c.afterRestore ? { afterRestore: true as const } : {}) });
  for (const r of RECORDS)
    out.push({
      id: `s_${r.id}`,
      terms: RECORD_TERMS[r.id] ?? [r.title],
      results: [{ kind: 'record', id: r.id }],
      ...(r.afterRestore ? { afterRestore: true as const } : {}),
      ...(r.erasedBeforeRestore ? { noArticleBeforeRestore: true as const } : {}),
    });
  for (const d of DOCS) out.push({ id: `s_${d.id}`, terms: DOC_TERMS[d.id] ?? [d.code], results: [{ kind: 'log', id: d.id }] });
  return out;
}

export const EP1: Episode = {
  id: 'ep1',
  title: '한 사관의 흔적',
  order: 1,
  verbs: { search: true, room: true, rewrite: true },
  glossary: GLOSSARY1,
  // 한 번에 하나: 찾기(T2 「윤」)를 먼저, 그날의 방은 T2 뒤나 T3 의 얼굴(e2-2)을 본 뒤에
  roomWhen: { any: [{ tagsDone: ['T2'] }, { allViewed: ['e2-2'] }] },
  rewriteWhen: { closureDone: true, resolved: ['X1'] },
  searchEvents: [{ personId: 'kim_ilson', event: 'ev.search_kim' }],
  askText: '어디부터 볼까요?',
  askFallback: '지금은 막힌 데 없어 보이는데.',
  // 복원은 다시 쓰기 화면에서 → 홈 카드 → 바뀐 것(인물 카드 줄 + 방의 「?」 짝 이름 + 그대로 남은 로그 한 줄) → 독백 → 예고
  restoreSteps: ['home', 'cards', 'monologue', 'teaser'],
  requiredTags: ['T1', 'T2', 'T3', 'T4'],
  room: ROOM,
  cards: CARDS,
  figures: FIGURES,
  groups: GROUPS,
  lines: LINES,
  details: DETAILS,
  cuts: CUTS,
  eyes: EYES,
  closures: CLOSURES,
  tags: TAGS,
  claims: CLAIMS,
  contradictions: CONTRADICTIONS,
  sentences: SENTENCES,
  pieces: PIECES,
  article: ARTICLE,
  records: RECORDS,
  search: buildSearch(),
  docs: DOCS,
  bursts: BURSTS,
  erasedFacts: ERASED1,
  ladders: LADDERS,
  home: HOME,
  implies: FACT_KEY_IMPLIES,
  ledger: PERSON_FACT_LEDGER,
  ledgerNames: LEDGER_NAMES,
  roomPersons: ROOM_PERSONS,
  surnameKeys: SURNAME_KEYS,
  requiredSentences: REQUIRED_SENTENCES,
  epilogue: EPILOGUE,
  clocks: CLOCKS,
};
