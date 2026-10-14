/** 찾기 — 낱말 하나의 결과. 들은 말에서 밑줄 친 낱말이 칩으로 쌓인다. 결과가 없으면 「해당 기사 없음.」(부재의 증거). UI_STYLE_GUIDE §2.7 */
import { useEffect, useState } from 'react';
import { searchMessage } from '@/core/search';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectSearch, type SearchResultView } from '@/store/selectors';
import { fx } from '../lib/fx';
import { IBack, ISearch } from '../parts/icons';
import { useUi } from '../uiStore';

function Hit({ r }: { r: SearchResultView }) {
  const [open, setOpen] = useState(false);
  const onTap = () => {
    const g = useGameStore.getState();
    const ui = useUi.getState();
    if (r.kind === 'person') {
      if (g.openCard(r.id)) ui.openCard(r.id);
    } else if (r.kind === 'record') {
      g.openRecord(r.id);
      setOpen((x) => !x);
    } else if (g.openDoc(r.id)) ui.setDoc(r.id);
  };
  return (
    <button className="hit" onClick={onTap} data-testid={`hit-${r.kind}-${r.id}`} aria-expanded={r.kind === 'record' ? open : undefined}>
      <div className="t-b" style={{ fontWeight: 600 }}>
        {r.title}
      </div>
      {r.subtitle ? <div className="sub">{r.subtitle}</div> : null}
      {r.tag ? (
        <div className="sub" style={{ color: 'var(--amber)' }}>
          {r.tag}
        </div>
      ) : null}
      {r.kind === 'person' ? r.lines.map((l, i) => <div key={i} className="ln t-b">{l}</div>) : null}
      {r.kind === 'record' && open ? r.lines.map((l, i) => <div key={i} className="ln read">{l}</div>) : null}
      {r.kind === 'record' && !open ? <div className="sub">탭하면 기록이 열린다</div> : null}
      {r.kind === 'log' ? <div className="sub">탭하면 문서가 열린다</div> : null}
    </button>
  );
}

export function Search() {
  const view = useView(selectSearch);
  const seed = useUi((s) => s.searchSeed);
  const [q, setQ] = useState('');

  const run = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const out = useGameStore.getState().search(t);
    fx(out.results.length ? 'search_hit' : 'search_miss');
  };

  useEffect(() => {
    if (seed) {
      setQ(seed);
      run(seed);
      useUi.getState().setSearchSeed(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const people = view.last?.views.filter((v) => v.kind === 'person') ?? [];
  const records = view.last?.views.filter((v) => v.kind === 'record') ?? [];
  const logs = view.last?.views.filter((v) => v.kind === 'log') ?? [];
  const showMsg = view.last && view.last.status !== 'ok' ? searchMessage(view.last.status, view.last.query, view.last.results.length) : null;

  return (
    <div className="scr" data-screen="search">
      <div className="bar">
        <button className="ibtn" aria-label="뒤로" onClick={() => useUi.getState().pop()} data-testid="search-back">
          <IBack />
        </button>
        <div className="title t-h">찾기</div>
      </div>
      <form
        className="searchbox"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="낱말을 적어 찾는다" aria-label="찾을 낱말" enterKeyHint="search" autoComplete="off" autoCorrect="off" data-testid="search-input" />
        <button className="go" type="submit" aria-label="찾기" data-testid="search-go">
          <ISearch />
        </button>
      </form>
      <div className="body" style={{ paddingTop: 6 }}>
        {view.terms.length ? (
          <div style={{ marginTop: 10 }}>
            <div className="t-m">들은 말에서</div>
            <div className="chips" style={{ marginTop: 6 }} data-testid="heard-chips">
              {view.terms.map((t) => (
                <button
                  key={t}
                  className="chip"
                  data-testid={`term-${t}`}
                  style={{ borderBottom: '2px solid var(--seal)' }}
                  onClick={() => {
                    setQ(t);
                    run(t);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {showMsg ? (
          <p className="noart t-h" data-testid="search-message" style={{ fontWeight: 500 }}>
            {showMsg}
          </p>
        ) : null}
        {people.length ? (
          <>
            <div className="seclabel t-m">인물</div>
            {people.map((r) => (
              <Hit key={r.id} r={r} />
            ))}
          </>
        ) : null}
        {records.length ? (
          <>
            <div className="seclabel t-m">기록</div>
            {records.map((r) => (
              <Hit key={r.id} r={r} />
            ))}
          </>
        ) : null}
        {logs.length ? (
          <>
            <div className="seclabel t-m">내 관측 로그</div>
            {logs.map((r) => (
              <Hit key={r.id} r={r} />
            ))}
          </>
        ) : null}
        {view.footer ? (
          <>
            <div className="seclabel t-m">새로 들어온 문서</div>
            <Hit r={view.footer} />
          </>
        ) : null}
      </div>
    </div>
  );
}
