/** DB 검색: 입력(또는 수첩의 말) → 결과 카드 → 기록 열람. 해당 기사가 없으면 없다고 말한다. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { NO_ARTICLE_TEXT } from '@/core/search';
import type { DbRecord, Id, SearchResultRef, SourceRef } from '@/core/types';
import { provenanceBadge, selectApps, selectRecord, useGameStore, type SearchOutcome } from '@/store/gameStore';
import { RichText } from '../components/RichText';
import { Scramble } from '../components/Scramble';
import { useBackHandler } from '../hooks';
import { Px } from '../lib/art';
import { CONTENT, IDX } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';

const KIND: Record<SearchResultRef['kind'], string> = {
  person: '인물',
  artifact: '유물',
  source: '사료',
  event: '사건',
  place: '장소',
  record: '기록',
};

interface Described {
  title: string;
  body: string;
  excerpt?: string;
  sources?: SourceRef[];
  provenance: string;
}

function describe(ref: SearchResultRef): Described | null {
  switch (ref.kind) {
    case 'person': {
      const p = IDX.persons[ref.id];
      return p && { title: p.hanja ? `${p.name}(${p.hanja})` : p.name, body: p.summary, sources: p.sources, provenance: p.provenance };
    }
    case 'artifact': {
      const a = IDX.artifacts[ref.id];
      return a && { title: a.hanja ? `${a.name}(${a.hanja})` : a.name, body: a.summary, sources: a.sources, provenance: a.provenance };
    }
    case 'source': {
      const s = IDX.sources[ref.id];
      return s && { title: s.title, body: s.summary, excerpt: s.excerpt, sources: s.sources, provenance: s.provenance };
    }
    case 'event': {
      const e = IDX.events[ref.id];
      return e && { title: e.name, body: e.summary, sources: e.sources, provenance: e.provenance };
    }
    case 'place': {
      const p = IDX.places[ref.id];
      return p && { title: p.name, body: p.summary, sources: p.sources, provenance: p.provenance };
    }
    default:
      return null;
  }
}

export function SearchApp() {
  const st = useGameStore();
  const prefill = useUi((s) => s.searchPrefill);
  const unlocked = selectApps(st).includes('db');
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState<SearchOutcome | null>(st.lastSearch);
  const [rec, setRec] = useState<Id | null>(null);
  const [wobble, setWobble] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [openRef, setOpenRef] = useState<string | null>(null);
  const lastPrefill = useRef<number | null>(null);
  const shifts = st.shifts.length;
  const lastShifts = useRef(shifts);
  useBackHandler(rec !== null, () => (setRec(null), true));

  const run = useCallback((query: string, quiet = false) => {
    const out = useGameStore.getState().search(query);
    setOutcome(out);
    setRec(null);
    setOpenRef(null);
    if (quiet) return;
    if (out.status === 'ok') fx('search_hit');
    else if (out.status === 'no_article') fx('search_miss');
    else if (out.status !== 'empty') {
      fx('search_miss');
      setWobble((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    if (!prefill || lastPrefill.current === prefill.nonce) return;
    lastPrefill.current = prefill.nonce;
    setQ(prefill.q);
    run(prefill.q);
  }, [prefill, run]);

  // 복원 뒤: 같은 검색을 다시 보면 결과가 채워져 있다
  useEffect(() => {
    if (lastShifts.current === shifts) return;
    lastShifts.current = shifts;
    if (outcome?.query) {
      run(outcome.query, true);
      setFresh(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts]);

  if (!unlocked) {
    return (
      <div className="db db-locked" data-testid="app-db">
        <Px k="stat_lock" scale={4} />
        <p>대조 중에는 DB 를 열람할 수 없다.</p>
        <p className="quiet">규정 4조</p>
      </div>
    );
  }

  if (rec) return <RecordView id={rec} onBack={() => setRec(null)} />;

  const seen = new Set<string>();
  const refs: SearchResultRef[] = [];
  for (const h of outcome?.hits ?? [])
    for (const r of h.results) {
      const k = `${r.kind}:${r.id}`;
      if (!seen.has(k)) (seen.add(k), refs.push(r));
    }
  const noArticle = (outcome?.hits ?? []).filter((h) => h.noArticle);

  return (
    <div className="db" data-testid="app-db">
      <form
        className="db-bar"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim()) return setWobble((n) => n + 1);
          fx('tap');
          run(q);
        }}
      >
        <input
          key={wobble}
          className={`field ${wobble ? 'wobble' : ''}`}
          data-testid="db-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름이나 들은 말을 입력"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="검색어"
        />
        <button type="submit" className="btn btn-primary" data-testid="db-submit">
          검색
        </button>
      </form>

      {st.terms.length > 0 && (
        <div className="chips" aria-label="들은 말, 본 이름" data-testid="chips">
          {st.terms.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              data-testid={`term-${t}`}
              onClick={() => {
                fx('tap');
                setQ(t);
                run(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="db-body">
        {!outcome && <p className="quiet db-idle">색인에 있는 말만 결과가 나온다. 보고 들은 말을 그대로 넣어 보자.</p>}
        {outcome && noArticle.length === 0 && (
          <p className={`outcome outcome-${outcome.status}`} role="status" data-testid="db-message">
            {outcome.message}
          </p>
        )}
        {noArticle.map((h) => (
          <div className="no-article" data-testid="no-article" key={h.entryId}>
            <span className="no-article-mark" aria-hidden="true">
              ∅
            </span>
            <strong>{IDX.searchEntries[h.entryId]?.noArticleText ?? NO_ARTICLE_TEXT}</strong>
            <small>색인에는 있으나 기사가 없다.</small>
          </div>
        ))}
        {refs.map((r, i) => {
          if (r.kind === 'record') {
            const record = selectRecord(st, r.id);
            return record ? (
              <button
                key={`${r.kind}:${r.id}`}
                type="button"
                className={`rcard ${fresh ? 'ink-in' : ''}`}
                style={{ animationDelay: `${i * 90}ms` }}
                data-testid={`record-${r.id}`}
                onClick={() => {
                  fx('tap');
                  useGameStore.getState().openRecord(r.id);
                  setRec(r.id);
                }}
              >
                <span className="rcard-kind">기록</span>
                <strong>{record.title}</strong>
                {record.fields.slice(0, 2).map((f) => (
                  <span key={f.key} className="rcard-line">
                    {f.label}: {f.value}
                  </span>
                ))}
              </button>
            ) : null;
          }
          const d = describe(r);
          if (!d) return null;
          const key = `${r.kind}:${r.id}`;
          const open = openRef === key;
          return (
            <div key={key} className={`rcard rcard-doc ${open ? 'open' : ''} ${fresh ? 'ink-in' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
              <button type="button" className="rcard-head" data-testid={`result-${r.kind}-${r.id}`} onClick={() => (fx('tap'), setOpenRef(open ? null : key))} aria-expanded={open}>
                <span className="rcard-kind">{KIND[r.kind]}</span>
                <strong>{d.title}</strong>
                {st.settings.showProvenance && <em className="badge">{provenanceBadge(d.provenance as 'verified')}</em>}
              </button>
              <p className="rcard-sum">
                <RichText text={d.body} />
              </p>
              {open && d.excerpt && (
                <blockquote className="quote">
                  <RichText text={d.excerpt} />
                </blockquote>
              )}
              {open && <Sources sources={d.sources} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sources({ sources }: { sources?: SourceRef[] }) {
  if (!sources?.length) return null;
  return (
    <ul className="sources" aria-label="출처">
      {sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

function RecordView({ id, onBack }: { id: Id; onBack(): void }) {
  const st = useGameStore();
  const rec: DbRecord | undefined = selectRecord(st, id);
  if (!rec) return null;
  const base = CONTENT.records.find((r) => r.id === id);
  return (
    <article className="rec" data-testid={`record-view-${id}`}>
      <button type="button" className="btn btn-small" data-testid="record-back" onClick={onBack}>
        ← 결과
      </button>
      <h3 className="rec-title">{rec.title}</h3>
      {st.settings.showProvenance && <em className="badge">{provenanceBadge(rec.provenance, !!base?.altered && rec.provenance !== 'verified')}</em>}
      <dl className="rec-fields">
        {rec.fields.map((f) => (
          <div key={f.key} className={`rec-field ${/기록 없음/.test(f.value) ? 'rec-void' : ''}`}>
            <dt>{f.label}</dt>
            <dd>
              <Scramble text={f.value} playKey={`record:${id}`} label={f.label} rich />
            </dd>
          </div>
        ))}
      </dl>
      {rec.note && (
        <p className="rec-note">
          <RichText text={rec.note} />
        </p>
      )}
      <Sources sources={rec.sources} />
    </article>
  );
}
