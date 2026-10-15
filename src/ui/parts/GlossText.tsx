/**
 * 국역 인용 글 + 어려운 말 풀이(점선 밑줄, 탭하면 바로 뒤에 짧은 풀이가 붙는다). 인용 글자는 바꾸지 않는다.
 * 찾기 낱말(실선 밑줄)과는 모양이 다르다 — 풀이 낱말은 찾기를 열지 않는다.
 * hj 이면 괄호 속 한자를 작고 옅게 보인다(한글 읽기가 앞에 있다).
 */
import { useState } from 'react';
import type { Gloss } from '@/core/types';
import { useEpisode } from '@/store/hooks';
import { glossSegments, hanjaSegs } from '../lib/text';

function Plain({ text, hj }: { text: string; hj: boolean }) {
  if (!hj) return <>{text}</>;
  return (
    <>
      {hanjaSegs(text).map((h, i) =>
        h.hj ? (
          <span key={i} className="hj">
            {h.text}
          </span>
        ) : (
          <span key={i}>{h.text}</span>
        ),
      )}
    </>
  );
}

export function GlossText({ text, glosses, hj = false }: { text: string; glosses?: readonly Gloss[]; hj?: boolean }) {
  const ep = useEpisode();
  const list = glosses ?? ep.glossary ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const segs = glossSegments(text, list);
  return (
    <>
      {segs.map((sg, i) =>
        sg.gloss ? (
          <span key={i} className="gw">
            {/* 버튼 안(찾기 결과 등)에도 들어가므로 span 단추 */}
            <span
              role="button"
              tabIndex={0}
              className="gloss"
              data-testid="gloss-word"
              aria-expanded={open === i}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(open === i ? null : i);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(open === i ? null : i);
                }
              }}
            >
              <Plain text={sg.text} hj={hj} />
            </span>
            {open === i ? (
              <span className="gtip" role="note" data-testid="gloss-tip">
                {sg.gloss}
              </span>
            ) : null}
          </span>
        ) : (
          <Plain key={i} text={sg.text} hj={hj} />
        ),
      )}
    </>
  );
}
