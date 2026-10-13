/**
 * 통합 DB 검색(Her Story 식). 색인된 표현만 결과가 나온다. 순수 함수.
 *
 * 정규화: NFKC → 소문자 → 공백·문장부호·괄호(「」『』《》 등)·가운뎃점 제거.
 *   한자/한글은 서로 변환하지 않는다 — 색인 항목이 두 표기를 모두 terms 에 가진다.
 * 일치 규칙(위에서부터 처음 걸리는 것):
 *   exact    : 정규화된 검색어 == 색인어
 *   contains : 검색어가 색인어(2자 이상)를 포함 — "김일손의 사초를" 처럼 문장째 넣어도 맞는다
 *   prefix   : 검색어(3자 이상)가 색인어의 앞부분이고 색인어 길이의 60% 이상 — "조의제" → "조의제문"
 * 검색어가 0자면 empty, 1자면 exact 만 허용하고 없으면 too_short.
 */
import type { Id, SearchEntry } from './types';

export const MIN_QUERY = 2;
export const PREFIX_MIN = 3;
export const PREFIX_COVERAGE = 0.6;

const STRIP = /[\s·・‧.,!?;:'"`“”‘’「」『』《》〈〉()[\]{}（）【】\-–—_~…/\\|·]+/gu;

export function normalizeQuery(raw: string): string {
  return raw.normalize('NFKC').toLowerCase().replace(STRIP, '');
}

export type MatchKind = 'exact' | 'contains' | 'prefix';

export function matchTerm(q: string, term: string): MatchKind | null {
  if (!q || !term) return null;
  if (q === term) return 'exact';
  if (term.length >= MIN_QUERY && q.length > term.length && q.includes(term)) return 'contains';
  if (q.length >= PREFIX_MIN && term.length > q.length && term.startsWith(q) && q.length / term.length >= PREFIX_COVERAGE)
    return 'prefix';
  return null;
}

/** no_article: 맨 위 결과가 말소된 기사(SearchEntry.noArticle) — '해당 기사 없음'(스토어가 판단). */
export type SearchStatus = 'ok' | 'unknown' | 'too_short' | 'empty' | 'no_article';

export interface SearchMatch {
  entry: SearchEntry;
  match: MatchKind;
  /** 맞은 색인어(원래 표기) */
  term: string;
}

export interface IndexResult {
  normalized: string;
  status: SearchStatus;
  matches: SearchMatch[];
}

const RANK: Record<MatchKind, number> = { exact: 0, contains: 1, prefix: 2 };

/**
 * 색인 조회. isVisible(entry) 가 false 인 항목(requires 미충족)은 없는 것처럼 다룬다.
 * 한 항목은 가장 좋은 일치 하나로만 나온다. 정렬: exact > contains(긴 색인어 우선) > prefix.
 */
export function searchIndex(
  entries: readonly SearchEntry[],
  raw: string,
  isVisible: (e: SearchEntry) => boolean = () => true,
): IndexResult {
  const q = normalizeQuery(raw);
  if (!q) return { normalized: q, status: 'empty', matches: [] };
  const matches: SearchMatch[] = [];
  for (const entry of entries) {
    if (!isVisible(entry)) continue;
    let best: SearchMatch | null = null;
    for (const term of entry.terms) {
      const t = normalizeQuery(term);
      if (q.length < MIN_QUERY && q !== t) continue;
      const m = matchTerm(q, t);
      if (!m) continue;
      if (!best || RANK[m] < RANK[best.match] || (m === best.match && t.length > normalizeQuery(best.term).length))
        best = { entry, match: m, term };
    }
    if (best) matches.push(best);
  }
  matches.sort(
    (a, b) => RANK[a.match] - RANK[b.match] || normalizeQuery(b.term).length - normalizeQuery(a.term).length,
  );
  if (matches.length) return { normalized: q, status: 'ok', matches };
  return { normalized: q, status: q.length < MIN_QUERY ? 'too_short' : 'unknown', matches };
}

/** 플레이어에게 보이는 피드백(정답 누설 없음, 장난스럽되 정보가 있게). */
export const NO_ARTICLE_TEXT = '해당 기사 없음.';

export function searchMessage(
  status: SearchStatus,
  raw: string,
  hitCount = 0,
  newCount = 0,
  noArticleText = NO_ARTICLE_TEXT,
): string {
  const q = raw.trim();
  switch (status) {
    case 'no_article':
      return hitCount > 0 ? `${noArticleText} 관련 기록 ${hitCount}건.` : noArticleText;
    case 'empty':
      return '검색어를 입력하세요.';
    case 'too_short':
      return '한 글자로는 색인을 찾기 어렵습니다. 두 글자 이상으로 적어 보세요.';
    case 'unknown':
      return `‘${q}’ — 색인에 없는 말입니다. 보고 들은 표현을 그대로 넣어 보세요.`;
    case 'ok':
      return newCount > 0 ? `${hitCount}건 일치 · 새 기록 ${newCount}건` : `${hitCount}건 일치 · 이미 본 기록`;
  }
}

/** 색인어 집합(정규화). 검증기·테스트용. */
export function indexedTerms(entries: readonly SearchEntry[]): Map<string, Id[]> {
  const out = new Map<string, Id[]>();
  for (const e of entries)
    for (const t of e.terms) {
      const n = normalizeQuery(t);
      out.set(n, [...(out.get(n) ?? []), e.id]);
    }
  return out;
}
