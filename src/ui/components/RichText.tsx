/** 글 속 검색어(밑줄, 탭하면 검색)와 낯선 실록 용어(점선, 탭하면 한 줄 풀이). */
import { Fragment, useMemo } from 'react';
import { selectGlossary, useGameStore } from '@/store/gameStore';
import { isDbOpen, searchFor } from '../lib/nav';
import { richSegments } from '../lib/text';
import { useUi } from '../uiStore';

const GLOSSARY = selectGlossary();

export function RichText({ text, terms, plainTerms }: { text: string; terms?: readonly string[]; plainTerms?: boolean }) {
  const known = useGameStore((s) => s.terms);
  const showGloss = useUi((s) => s.showGloss);
  const list = terms ?? known;
  const segs = useMemo(() => richSegments(text, list, GLOSSARY), [text, list]);
  return (
    <>
      {segs.map((sg, i) => {
        if (sg.term) {
          const t = sg.term;
          return (
            <button
              key={i}
              type="button"
              className={`term ${plainTerms ? 'term-plain' : ''}`}
              data-testid={`term-${t}`}
              onClick={(e) => {
                e.stopPropagation();
                searchFor(t);
              }}
              aria-label={isDbOpen() ? `${t} 검색` : t}
            >
              {sg.text}
            </button>
          );
        }
        if (sg.gloss) {
          const g = GLOSSARY.find((x) => x.term === sg.gloss)!;
          return (
            <button
              key={i}
              type="button"
              className="gloss"
              data-testid={`gloss-${g.term}`}
              onClick={(e) => {
                e.stopPropagation();
                showGloss(g.term, g.gloss);
              }}
            >
              {sg.text}
            </button>
          );
        }
        return <Fragment key={i}>{sg.text}</Fragment>;
      })}
    </>
  );
}
