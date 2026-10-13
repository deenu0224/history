/** 글 속 '검색어 수첩' 말을 눌러 검색할 수 있는 밑줄로 바꾼다. */
import { Fragment } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

export interface Seg {
  text: string;
  term?: string;
}

/** terms 중 text 에 나오는 말을 긴 것 우선·겹치지 않게 찾아 조각낸다. */
export function splitTerms(text: string, terms: readonly string[]): Seg[] {
  const list = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))].sort((a, b) => b.length - a.length);
  if (!list.length || !text) return [{ text }];
  const hits: { s: number; e: number; term: string }[] = [];
  for (const term of list) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(term, from);
      if (i < 0) break;
      const e = i + term.length;
      if (!hits.some((h) => i < h.e && e > h.s)) hits.push({ s: i, e, term });
      from = e;
    }
  }
  hits.sort((a, b) => a.s - b.s);
  const out: Seg[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.s > pos) out.push({ text: text.slice(pos, h.s) });
    out.push({ text: text.slice(h.s, h.e), term: h.term });
    pos = h.e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

/** 말을 눌렀을 때: 검색 앱을 열고 그 말로 바로 검색한다. */
export function searchFor(term: string) {
  const g = useGameStore.getState();
  useUi.getState().prefillSearch(term);
  g.openApp('search');
}

export function TermText({
  text,
  extra = [],
  coachFirst = false,
  onTerm,
}: {
  text: string;
  /** 수첩에 없더라도 이 글에서는 밑줄을 칠 말 */
  extra?: readonly string[];
  /** 첫 밑줄에 코치마크 키(search.result.term)를 단다 */
  coachFirst?: boolean;
  onTerm?: (t: string) => void;
}) {
  const known = useGameStore((s) => s.terms);
  const segs = splitTerms(text, [...known, ...extra]);
  let first = true;
  return (
    <>
      {segs.map((sg, i) => {
        if (!sg.term) return <Fragment key={i}>{sg.text}</Fragment>;
        const coach = coachFirst && first ? 'search.result.term' : undefined;
        first = false;
        return (
          <button
            key={i}
            type="button"
            className="term"
            data-testid={`term-${sg.term}`}
            data-coach={coach}
            onClick={(e) => {
              e.stopPropagation();
              (onTerm ?? searchFor)(sg.term!);
            }}
          >
            {sg.text}
          </button>
        );
      })}
    </>
  );
}

