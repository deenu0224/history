/** 사료 뷰어(검색 앱 안): 서재의 사료 원문 발췌에서 형광 구절을 눌러 관측 카드를 검증한다. 복원된 기사는 '복원' 도장과 원문 전체. */
import { useEffect, useMemo, useState } from 'react';
import type { Id, SourcePhrase } from '@/core/types';
import { useGameStore, type PhraseResult } from '@/store/gameStore';
import { IDX, CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { describeRewards, feedbackForRewards } from '../lib/rewards';
import { readRestored } from '../lib/rewrites';
import { Px } from '../lib/art';

interface Seg {
  text: string;
  phrase?: SourcePhrase;
}

export function segmentExcerpt(excerpt: string, phrases: readonly SourcePhrase[]): Seg[] {
  const hits: { s: number; e: number; p: SourcePhrase }[] = [];
  for (const p of phrases) {
    const i = excerpt.indexOf(p.text);
    if (i < 0) continue;
    const e = i + p.text.length;
    if (!hits.some((h) => i < h.e && e > h.s)) hits.push({ s: i, e, p });
  }
  hits.sort((a, b) => a.s - b.s);
  const out: Seg[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.s > pos) out.push({ text: excerpt.slice(pos, h.s) });
    out.push({ text: excerpt.slice(h.s, h.e), phrase: h.p });
    pos = h.e;
  }
  if (pos < excerpt.length) out.push({ text: excerpt.slice(pos) });
  return out;
}

export function SourceReader({ initial }: { initial?: Id }) {
  const library = useGameStore((s) => s.sources);
  const registered = useGameStore((s) => s.phrases);
  const shifts = useGameStore((s) => s.shifts);
  const restoredAll = useMemo(() => readRestored({ shifts }).join('|'), [shifts]);
  const registerPhrase = useGameStore((s) => s.registerPhrase);
  const [sel, setSel] = useState<Id | undefined>(initial ?? library[0]);
  const [list, setList] = useState(false);
  const [res, setRes] = useState<{ r: PhraseResult; id: Id; seq: number } | null>(null);

  useEffect(() => {
    if (initial && library.includes(initial)) setSel(initial);
  }, [initial, library]);
  useEffect(() => {
    if (!sel && library[0]) setSel(library[0]);
  }, [library, sel]);

  const src = sel ? IDX.sources[sel] : undefined;
  const phrases = useMemo(() => CONTENT.phrases.filter((p) => p.sourceId === sel), [sel]);
  const segs = useMemo(() => (src?.excerpt ? segmentExcerpt(src.excerpt, phrases) : []), [src, phrases]);
  const regCount = phrases.filter((p) => registered.includes(p.id)).length;
  const restored = !!sel && restoredAll.split('|').includes(sel);
  const full = (src as unknown as { fullText?: string } | undefined)?.fullText;

  if (library.length === 0)
    return (
      <div className="reader" data-testid="app-reader">
        <p className="empty">검색으로 찾은 사료가 이곳 서재에 모입니다.</p>
      </div>
    );

  const pick = (p: SourcePhrase) => {
    const r = registerPhrase(p.sourceId, p.id);
    setRes({ r, id: p.id, seq: Date.now() });
    if (r.status === 'registered') {
      fx('phrase_stamp');
      feedbackForRewards(r.gained);
    } else if (r.status === 'no_link' || r.status === 'unavailable') fx('phrase_miss');
    else fx('tap');
  };

  return (
    <div className="reader" data-testid="app-reader">
      <div className="reader-shelf">
        <button type="button" className="shelf-btn" aria-expanded={list} data-testid="shelf-toggle" onClick={() => setList((v) => !v)}>
          <Px k="icon_scroll" scale={1} /> {src?.title ?? '서재'} <span aria-hidden="true">▾</span>
        </button>
        {list && (
          <ul className="shelf-list" data-testid="shelf-list">
            {library.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className={id === sel ? 'on' : ''}
                  onClick={() => {
                    setSel(id);
                    setList(false);
                    setRes(null);
                    fx('tap');
                  }}
                >
                  {IDX.sources[id]?.title ?? id}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {src && (
        <article className="reader-page">
          <header>
            <h3>{src.title}</h3>
            {src.hanja && <span className="hanja">{src.hanja}</span>}
            {restored && <span className="stamp-restore">복원</span>}
          </header>
          <p className="reader-summary">{src.summary}</p>
          {src.excerpt ? (
            <>
              <p className="reader-label">
                {src.provenance === 'verified' ? '국역 발췌' : '발췌(재구성)'}
                {phrases.length > 0 && <span className="dim"> · 구절 {regCount}/{phrases.length}</span>}
              </p>
              <blockquote className="excerpt" data-testid="excerpt">
                {segs.map((sg, i) =>
                  sg.phrase ? (
                    <button
                      key={i}
                      type="button"
                      className={`phrase ${registered.includes(sg.phrase.id) ? 'stamped' : ''} ${res?.id === sg.phrase.id && res.r.status === 'no_link' ? 'shrug' : ''}`}
                      data-testid={`phrase-${sg.phrase.id}`}
                      data-coach={i === segs.findIndex((x) => x.phrase) ? 'search.source.phrase' : undefined}
                      onClick={() => pick(sg.phrase!)}
                    >
                      {sg.text}
                      {registered.includes(sg.phrase.id) && <i className="phrase-mark" aria-hidden="true">✓</i>}
                    </button>
                  ) : (
                    <span key={i}>{sg.text}</span>
                  ),
                )}
              </blockquote>
              {full && restored && (
                <>
                  <p className="reader-label">원문 전체</p>
                  <blockquote className="excerpt full">{full}</blockquote>
                </>
              )}
            </>
          ) : (
            <p className="empty">이 사료는 요약만 수록되어 있습니다.</p>
          )}
          {res && (
            <div className={`phrase-res res-${res.r.status}`} role="status" key={res.seq} data-testid="phrase-result">
              <p>{res.r.message}</p>
              {res.r.status === 'registered' && <span className="stamp-ink">검증</span>}
              {describeRewards(res.r.gained).map((g) => (
                <p key={g.key} className="gain">
                  <span className="gain-mark" aria-hidden="true">
                    {g.icon === 'stamp' ? '✓' : '＋'}
                  </span>
                  {g.text}
                </p>
              ))}
            </div>
          )}
          {src.sources && src.sources.length > 0 && (
            <ul className="src-list">
              {src.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </div>
  );
}
