/** 통합 DB 검색(Her Story 식): 입력 또는 검색어 칩 → 결과 카드 → 결과 속 밑줄 말은 다시 검색. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NO_ARTICLE_TEXT } from '@/core/search';
import type { DbRecord, Id, SearchResultRef } from '@/core/types';
import { SOURCE_ACCESS_FLAG, provenanceBadge, selectRecord, useGameStore, type SearchOutcome } from '@/store/gameStore';
import { Px } from '../lib/art';
import { CONTENT, IDX } from '../lib/content';
import { feedbackForRewards, describeRewards } from '../lib/rewards';
import { fx } from '../lib/fx';
import { useRewriteText } from '../lib/rewrites';
import { TermText } from '../lib/terms';

/** 검색 결과 속 밑줄 말: 첫 번째에 코치마크 키를 단다 */
const T = (p: { text: string }) => <TermText text={p.text} coachFirst />;
import { useUi } from '../uiStore';
import { Chip } from '../components/kit';
import { SourceReader } from './SourceReader';

const KIND_LABEL: Record<SearchResultRef['kind'], string> = {
  person: '인물',
  artifact: '유물',
  source: '사료',
  event: '사건',
  place: '장소',
  evidence: '증거',
  record: '레코드',
};

interface ShownHit {
  entryId: Id;
  term: string;
  isNew: boolean;
  linked: string[];
  results: SearchResultRef[];
  noArticle: boolean;
}

function SearchPane({ onOpenSource }: { onOpenSource(id: Id): void }) {
  const terms = useGameStore((s) => s.terms);
  const searchLog = useGameStore((s) => s.searchLog);
  const search = useGameStore((s) => s.search);
  const prefill = useUi((s) => s.searchPrefill);
  const [q, setQ] = useState('');
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [hits, setHits] = useState<ShownHit[]>([]);
  const [wobble, setWobble] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const resultsTop = useRef<HTMLDivElement>(null);
  const lastPrefill = useRef<number | null>(null);

  const run = useCallback(
    (query: string) => {
      const prev = useGameStore.getState().searched;
      const out = search(query);
      setOutcome(out);
      setHits(
        out.hits.map((h) => ({
          entryId: h.entryId,
          term: h.term,
          isNew: !prev.includes(h.entryId),
          linked: h.linked,
          results: h.results,
          noArticle: h.noArticle,
        })),
      );
      if (out.status === 'ok' || out.status === 'no_article') {
        fx(out.status === 'ok' ? 'search_hit' : 'search_miss');
        feedbackForRewards(out.gained);
      } else if (out.status !== 'empty') {
        fx('search_miss');
        setWobble((n) => n + 1);
      }
      resultsTop.current?.scrollIntoView?.({ block: 'start' });
    },
    [search],
  );

  // 메시지·결과 속 밑줄 말 → 검색 앱이 열리며 자동 검색
  useEffect(() => {
    if (!prefill || lastPrefill.current === prefill.nonce) return;
    lastPrefill.current = prefill.nonce;
    setQ(prefill.q);
    run(prefill.q);
  }, [prefill, run]);

  // 앱을 처음 열 때 이전 결과 복원
  useEffect(() => {
    const last = useGameStore.getState().lastSearch;
    if (last && !outcome) {
      setOutcome(last);
      setQ(last.query);
      setHits(last.hits.map((h) => ({ entryId: h.entryId, term: h.term, isNew: false, linked: h.linked, results: h.results, noArticle: h.noArticle })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) {
      setWobble((n) => n + 1);
      return;
    }
    fx('tap');
    run(q);
  };

  const history = useMemo(() => {
    const seen = new Set<string>();
    const out: typeof searchLog = [];
    for (let i = searchLog.length - 1; i >= 0; i--) {
      const e = searchLog[i]!;
      if (seen.has(e.normalized)) continue;
      seen.add(e.normalized);
      out.push(e);
    }
    return out.slice(0, 12);
  }, [searchLog]);

  const gained = outcome ? describeRewards(outcome.gained) : [];

  return (
    <div className="search" data-testid="app-db">
      <form className="search-bar" onSubmit={submit} role="search">
        <input
          ref={input}
          key={wobble}
          className={`field ${wobble ? 'wobble' : ''}`}
          data-testid="search-input"
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
        <button type="submit" className="btn btn-primary" data-testid="search-submit">
          검색
        </button>
      </form>
      <div className="chips-row" aria-label="검색어 수첩" data-testid="chips">
        <span className="chips-tag">수첩</span>
        {terms.length === 0 && <span className="dim">아직 적어 둔 검색어가 없다.</span>}
        {terms.map((t, i) => (
          <button
            key={t}
            type="button"
            className="chip-btn"
            data-testid={`chip-${t}`}
            data-coach={i === 0 ? 'search.chip' : undefined}
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
      <div className="search-body">
        <div ref={resultsTop} />
        {!outcome && (
          <div className="search-idle">
            <Px k="app_db" scale={2} />
            <p>색인에 있는 말만 결과가 나옵니다. 보고 들은 표현을 그대로 넣어 보세요.</p>
          </div>
        )}
        {outcome && (
          <p className={`outcome outcome-${outcome.status}`} role="status" data-testid="search-message">
            {outcome.message}
          </p>
        )}
        {gained.length > 0 && (
          <ul className="gained" aria-label="얻은 것">
            {gained.map((g) => (
              <li key={g.key} className={`gain gain-${g.icon}`}>
                <span className="gain-mark" aria-hidden="true">
                  {g.icon === 'stamp' ? '✓' : g.icon === 'card' ? '＋' : '·'}
                </span>
                {g.text}
              </li>
            ))}
          </ul>
        )}
        {hits.map((h) => (
          <HitGroup key={h.entryId} hit={h} onOpenSource={onOpenSource} />
        ))}
        {history.length > 0 && (
          <section className="search-log">
            <button type="button" className="log-toggle" aria-expanded={showLog} onClick={() => setShowLog((v) => !v)}>
              검색 기록 {history.length} {showLog ? '▴' : '▾'}
            </button>
            {showLog && (
              <ul data-testid="search-history">
                {history.map((e) => (
                  <li key={e.normalized}>
                    <button
                      type="button"
                      className={`log-item ${e.status === 'ok' ? '' : 'miss'}`}
                      onClick={() => {
                        setQ(e.query);
                        run(e.query);
                      }}
                    >
                      <span className="log-mark" aria-hidden="true">
                        {e.status === 'ok' ? '●' : '○'}
                      </span>
                      {e.query}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function HitGroup({ hit, onOpenSource }: { hit: ShownHit; onOpenSource(id: Id): void }) {
  const entry = IDX.searchEntries[hit.entryId];
  return (
    <section className={`hit ${hit.isNew ? 'hit-new' : ''}`} data-testid={`hit-${hit.entryId}`}>
      <header className="hit-head">
        <span className="hit-term">‘{hit.term}’</span>
        {hit.isNew && <span className="stamp-new">신규</span>}
        {entry?.provenance === 'fictional' && <span className="hit-src">통합 DB</span>}
      </header>
      {hit.linked.map((n, i) => (
        <p key={i} className="linked-note">
          <span aria-hidden="true">✓</span> {n}
        </p>
      ))}
      {hit.noArticle && hit.results.length === 0 && (
        <p className="no-article" data-testid="no-article">
          {entry?.noArticleText ?? NO_ARTICLE_TEXT}
        </p>
      )}
      <div className="hit-cards">
        {hit.results.map((r) => (
          <ResultCard key={`${r.kind}:${r.id}`} r={r} onOpenSource={onOpenSource} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ r, onOpenSource }: { r: SearchResultRef; onOpenSource(id: Id): void }) {
  switch (r.kind) {
    case 'record':
      return <RecordCard id={r.id} />;
    case 'person': {
      const p = IDX.persons[r.id];
      if (!p) return null;
      return (
        <article className="rcard rcard-person">
          <header>
            <Chip>{KIND_LABEL.person}</Chip>
            <h4>
              {p.name}
              {p.hanja && <small> {p.hanja}</small>}
            </h4>
          </header>
          <p>
            <T text={p.summary} />
          </p>
          <ProvMark p={p.provenance} />
        </article>
      );
    }
    case 'artifact': {
      const a = IDX.artifacts[r.id];
      if (!a) return null;
      return (
        <article className="rcard rcard-artifact">
          <header>
            <Chip>{KIND_LABEL.artifact}</Chip>
            <h4>
              {a.name}
              {a.hanja && <small> {a.hanja}</small>}
            </h4>
          </header>
          <p>
            <T text={a.summary} />
          </p>
          {(a.material || a.holder) && (
            <dl className="mini-dl">
              {a.material && (
                <>
                  <dt>재질</dt>
                  <dd>{a.material}</dd>
                </>
              )}
              {a.holder && (
                <>
                  <dt>소장</dt>
                  <dd>{a.holder}</dd>
                </>
              )}
            </dl>
          )}
          <ProvMark p={a.provenance} />
        </article>
      );
    }
    case 'source':
      return <SourceCard id={r.id} onOpen={onOpenSource} />;
    case 'event': {
      const e = IDX.events[r.id];
      if (!e) return null;
      return (
        <article className="rcard">
          <header>
            <Chip>{KIND_LABEL.event}</Chip>
            <h4>{e.name}</h4>
          </header>
          <p>
            <T text={e.summary} />
          </p>
        </article>
      );
    }
    case 'place': {
      const p = IDX.places[r.id];
      if (!p) return null;
      return (
        <article className="rcard">
          <header>
            <Chip>{KIND_LABEL.place}</Chip>
            <h4>{p.name}</h4>
          </header>
          <p>
            <T text={p.summary} />
          </p>
        </article>
      );
    }
    case 'evidence': {
      const ev = IDX.evidence[r.id];
      if (!ev) return null;
      return (
        <article className="rcard">
          <header>
            <Chip>{KIND_LABEL.evidence}</Chip>
            <h4>{ev.levels[0].label}</h4>
          </header>
          <p>{ev.levels[0].text}</p>
        </article>
      );
    }
  }
}

function ProvMark({ p }: { p: string }) {
  const showProv = useGameStore((s) => s.settings.showProvenance);
  if (!showProv || p === 'verified') return null;
  return <span className="prov-mark">{p === 'reconstructed' ? '재구성' : '가상'}</span>;
}

function SourceCard({ id, onOpen }: { id: Id; onOpen(id: Id): void }) {
  const s = IDX.sources[id];
  const inLibrary = useGameStore((st) => st.sources.includes(id));
  const access = useGameStore((st) => !!st.flags[SOURCE_ACCESS_FLAG]);
  if (!s) return null;
  return (
    <article className="rcard rcard-source">
      <header>
        <Chip tone={s.provenance === 'verified' ? 'good' : 'plain'}>{KIND_LABEL.source}</Chip>
        <h4>{s.title}</h4>
      </header>
      <p>
        <T text={s.summary} />
      </p>
      {inLibrary && !access && <p className="dim small">사료 서재에 보관되었다.</p>}
      {inLibrary && access && (
        <div className="rcard-actions">
          <button
            type="button"
            className="btn btn-small"
            data-testid={`open-source-${id}`}
            onClick={() => {
              fx('tap');
              onOpen(id);
            }}
          >
            사료 열람
          </button>
        </div>
      )}
    </article>
  );
}

function RecordCard({ id }: { id: Id }) {
  const corrections = useGameStore((s) => s.corrections);
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const rec = useMemo(
    () => selectRecord(useGameStore.getState(), id, CONTENT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, corrections],
  );
  if (!rec) return null;
  return (
    <article className="rcard rcard-record" data-testid={`record-${id}`}>
      <header>
        <Chip tone="dim">{KIND_LABEL.record}</Chip>
        <h4>
          <T text={rec.title} />
        </h4>
        {showProv && (
          <span className="prov-mark" data-testid={`record-badge-${id}`}>
            {provenanceBadge(rec.provenance, !!rec.altered && rec.provenance !== 'verified')}
          </span>
        )}
      </header>
      <table className="rec-table">
        <tbody>
          {rec.fields.map((f) => (
            <RecordRow key={f.key} rec={rec} fieldKey={f.key} label={f.label} value={f.value} />
          ))}
        </tbody>
      </table>
      {rec.note && <p className="dim small">{rec.note}</p>}
      {rec.provenance === 'verified' && rec.sources && rec.sources.length > 0 && (
        <ul className="src-list">
          {rec.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function RecordRow({ rec, fieldKey, label, value }: { rec: DbRecord; fieldKey: string; label: string; value: string }) {
  const rw = useRewriteText('record', rec.id, value, fieldKey);
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={rw.busy ? 'rewriting' : ''}>{rw.busy ? rw.text : <T text={value} />}</td>
    </tr>
  );
}


/** 통합 DB 검색 + 사료 서재(사료 뷰어)를 한 앱에 담는다. */
export function Search() {
  const [tab, setTab] = useState<'db' | 'lib'>('db');
  const [src, setSrc] = useState<Id | undefined>();
  const target = useGameStore((s) => s.ui.appTarget);
  const front = useGameStore((s) => s.ui.app);
  const libCount = useGameStore((s) => s.sources.length);
  const access = useGameStore((s) => !!s.flags[SOURCE_ACCESS_FLAG]);
  const prefill = useUi((s) => s.searchPrefill);

  // 다른 곳에서 사료로 열었을 때(openSource → reader/target)
  useEffect(() => {
    if (target && IDX.sources[target] && useGameStore.getState().flags[SOURCE_ACCESS_FLAG]) {
      setSrc(target);
      setTab('lib');
    }
  }, [target, front]);
  useEffect(() => {
    if (prefill) setTab('db');
  }, [prefill]);

  return (
    <div className="search-app" data-testid="app-search">
      <div className="subtabs" role="tablist" hidden={!access}>
        <button role="tab" aria-selected={tab === 'db'} className={tab === 'db' ? 'on' : ''} data-testid="tab-db" onClick={() => setTab('db')}>
          검색
        </button>
        {access && <button role="tab" aria-selected={tab === 'lib'} className={tab === 'lib' ? 'on' : ''} data-testid="tab-library" onClick={() => setTab('lib')}>
          사료 서재 {libCount > 0 && <em>{libCount}</em>}
        </button>}
      </div>
      <div className="search-host" hidden={tab !== 'db'}>
        <SearchPane
          onOpenSource={(id) => {
            setSrc(id);
            setTab('lib');
          }}
        />
      </div>
      {tab === 'lib' && access && <SourceReader initial={src} />}
    </div>
  );
}
