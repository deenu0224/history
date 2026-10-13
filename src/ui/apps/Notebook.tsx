/** 손 노트: 스캔한 종이 노트(손글씨) · 고쳐 쓴 줄(이전/이후) · 단말 메모 · 기록관(전시·도감). '기록하기' 클라이맥스도 여기서. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { completion } from '@/core/collection';
import { NOTEBOOK_SECTIONS, SECTION_LABELS } from '@/core/notebook';
import { checkState } from '@/core/terminal';
import type { Id, NoteEntry, NotebookSection, RecordAct, RewriteEntry } from '@/core/types';
import { NOTEBOOK_MARGINS } from '@/data/script';
import { selectExhibits, selectMemos, selectRecordLedger, useGameStore } from '@/store/gameStore';
import { CATEGORY_ICON, PixelIcon } from '../components/kit';
import { prefersReducedMotion, useWidth } from '../hooks';
import { Px, exhibitSprite } from '../lib/art';
import { CONTENT, CATEGORY_LABEL, CATEGORY_ORDER, IDX } from '../lib/content';
import { fx } from '../lib/fx';
import { pct } from '../lib/format';
import { describeRewards } from '../lib/rewards';
import { useRewriteText } from '../lib/rewrites';
import { CodexScreen } from '../screens/Codex';
import { TermText } from '../lib/terms';
import { endingReached } from '../lib/objectives';
import { useUi } from '../uiStore';

type Tab = 'hand' | 'diff' | 'memo' | 'archive';

export function Notebook() {
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root, 400);
  const wide = width >= 780;
  const req = useUi((s) => s.notebookTab);
  const setReq = useUi((s) => s.setNotebookTab);
  const target = useGameStore((s) => s.ui.appTarget);
  const rewriteLog = useGameStore((s) => s.rewriteLog);
  const notebook = useGameStore((s) => s.notebook);
  const pendingDiff = useGameStore((s) => s.pendingDiffPageId);
  const ack = useGameStore((s) => s.ackDiffPage);
  const [tab, setTab] = useState<Tab>('hand');

  const hasDiff =
    rewriteLog.length > 0 || NOTEBOOK_SECTIONS.some((sec) => notebook[sec].some((n) => n.before !== undefined));

  useEffect(() => {
    if (target === 'archive' || target === 'diff' || target === 'memo') setTab(target);
  }, [target]);
  useEffect(() => {
    if (!req) return;
    if (req === 'diff' || req === 'hand' || req === 'memo' || req === 'archive') setTab(req);
    setReq(null);
  }, [req, setReq]);
  useEffect(() => {
    if (tab === 'diff' && pendingDiff) ack();
  }, [tab, pendingDiff, ack]);

  const tabs: { id: Tab; label: string; show: boolean; coach?: string }[] = [
    { id: 'hand', label: '손 노트', show: true },
    { id: 'diff', label: '고쳐 쓴 줄', show: hasDiff },
    { id: 'memo', label: '단말 메모', show: true, coach: 'notebook.tab.memo' },
    { id: 'archive', label: '기록관', show: true, coach: 'notebook.tab.archive' },
  ];

  return (
    <div className="notebook" ref={root} data-testid="app-notebook">
      <div className="tabs tabs-scroll" role="tablist">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'on' : ''} ${t.id === 'diff' && pendingDiff ? 'blink' : ''}`}
              data-testid={`nb-tab-${t.id}`}
              data-coach={t.coach}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
      </div>
      <div className="nb-body">
        {tab === 'hand' && (
          <div className={wide ? 'nb-split' : ''}>
            <HandPage wide={wide} />
            {wide && <MemoPage />}
          </div>
        )}
        {tab === 'diff' && <DiffPage />}
        {tab === 'memo' && <MemoPage />}
        {tab === 'archive' && <ArchivePage />}
      </div>
    </div>
  );
}

// ── 손 노트 ────────────────────────────────────────────────────────
function HandPage({ wide }: { wide: boolean }) {
  const state = useGameStore((s) => s);
  const notebook = useGameStore((s) => s.notebook);
  const evidence = useGameStore((s) => s.evidence);
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const addHypothesis = useGameStore((s) => s.addHypothesis);
  const resolveQuestion = useGameStore((s) => s.resolveQuestion);
  const recorded = useGameStore((s) => s.recorded);
  const [text, setText] = useState('');
  const [refs, setRefs] = useState<Id[]>([]);
  const visible = (sec: NotebookSection) => notebook[sec].filter((n) => !n.id.startsWith('ui_'));
  const margins = NOTEBOOK_MARGINS.filter((m) => checkState(state, m.when));
  const acts = CONTENT.acts.filter((a) => checkState(state, a.requires) && !recorded.includes(a.id)).sort((a, b) => a.order - b.order);
  const done = CONTENT.acts.filter((a) => recorded.includes(a.id));
  const owned = Object.entries(evidence).filter(([id]) => IDX.evidence[id]);
  const empty = NOTEBOOK_SECTIONS.every((s) => visible(s).length === 0);

  return (
    <article className="paper" data-testid="hand-page">
      {acts.map((a) => (
        <RecordTrace key={a.id} act={a} />
      ))}
      {empty && <p className="hand faint">아직 적은 것이 없다.</p>}
      {NOTEBOOK_SECTIONS.map((sec) =>
        visible(sec).length === 0 ? null : (
          <section key={sec} className="nb-sec">
            <h3 className="hand sec-title">{SECTION_LABELS[sec]}</h3>
            <ul>
              {visible(sec).map((n, i) => (
                <NoteLine key={n.id} n={n} variant={i % 3} sec={sec} showProv={showProv} onResolve={() => resolveQuestion(n.id)} />
              ))}
            </ul>
          </section>
        ),
      )}
      {done.length > 0 && (
        <section className="nb-sec">
          <h3 className="hand sec-title">직접 적은 것</h3>
          <ul>
            {done.map((a) => (
              <li key={a.id} className="note hand written" data-testid={`written-${a.id}`}>
                {a.sentence}
              </li>
            ))}
          </ul>
        </section>
      )}
      {margins.length > 0 && (
        <aside className={`margins ${wide ? '' : 'margins-inline'}`} aria-label="여백 메모">
          {margins.map((m) => (
            <p key={m.id} className="hand margin">
              {m.text}
            </p>
          ))}
        </aside>
      )}
      <section className="nb-sec hyp">
        <h3 className="hand sec-title">새 가설</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (!t) return;
            addHypothesis(t, refs.length ? refs : undefined);
            fx('tap');
            setText('');
            setRefs([]);
          }}
        >
          <textarea className="hand-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="확인되지 않은 생각을 적어 둔다" aria-label="새 가설" />
          {owned.length > 0 && (
            <div className="hyp-refs">
              {owned.map(([id, lv]) => {
                const ev = IDX.evidence[id]!;
                const on = refs.includes(id);
                return (
                  <button type="button" key={id} className={`pill ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setRefs(on ? refs.filter((r) => r !== id) : [...refs, id])}>
                    {ev.levels[Math.min(lv, ev.levels.length - 1)]!.label}
                  </button>
                );
              })}
            </div>
          )}
          <button className="btn btn-small" type="submit" disabled={!text.trim()}>
            적기
          </button>
        </form>
      </section>
    </article>
  );
}

function NoteLine({ n, variant, sec, showProv, onResolve }: { n: NoteEntry; variant: number; sec: NotebookSection; showProv: boolean; onResolve(): void }) {
  return (
    <li className={`note hand ${n.resolved ? 'resolved' : ''} ul-${variant} sec-${sec}`} data-testid={`note-${n.id}`}>
      {n.before !== undefined && (
        <span className="strike" data-testid={`note-before-${n.id}`}>
          {n.before}
        </span>
      )}
      <span className="note-text">
        <TermText text={n.text} coachFirst coachKey="notebook.term" />
      </span>
      {showProv && n.provenance && n.provenance !== 'verified' && <span className="prov-mark">{n.provenance === 'reconstructed' ? '재구성' : '가상'}</span>}
      {sec === 'question' && !n.resolved && (
        <button className="penc-btn" onClick={onResolve} aria-label="해소됨으로 표시">
          ✓
        </button>
      )}
      {n.resolved && <span className="penc-check" aria-label="해소" />}
    </li>
  );
}

// ── 기록하기(사관의 직필) ─────────────────────────────────────────
/** 점선 안내를 손가락/마우스로 따라 쓴다(관대하게 2~4초). 대체: 길게 눌러 도장. 완료되면 store.recordFact. */
export function RecordTrace({ act }: { act: RecordAct }) {
  const recordFact = useGameStore((s) => s.recordFact);
  const box = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [path, setPath] = useState<string>('');
  const [finished, setFinished] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const prog = useRef(0);
  const holdRaf = useRef(0);
  const words = useMemo(() => act.sentence.split(/(\s+)/), [act.sentence]);
  const count = words.filter((w) => w.trim()).length;

  const complete = () => {
    if (finished) return;
    setFinished(true);
    prog.current = 1;
    setProgress(1);
    fx('record_fact');
    window.setTimeout(() => recordFact(act.id), prefersReducedMotion() ? 0 : 450);
  };
  const advance = (d: number) => {
    const el = box.current;
    if (!el) return;
    const need = el.clientWidth * Math.max(1.4, el.clientHeight / 28) * 0.9;
    prog.current = Math.min(1, prog.current + d / need);
    setProgress(prog.current);
    if (prog.current >= 1) complete();
  };
  const rel = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent) => {
    if (finished) return;
    drawing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = rel(e);
    last.current = p;
    setPath(`M${p.x},${p.y}`);
    fx('tap');
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || finished) return;
    const p = rel(e);
    const l = last.current!;
    const d = Math.hypot(p.x - l.x, p.y - l.y);
    if (d < 2) return;
    last.current = p;
    setPath((s) => `${s.length > 4000 ? s.slice(-3000) : s} L${p.x},${p.y}`);
    advance(d);
  };
  const up = () => {
    drawing.current = false;
  };

  // 대체 경로: 길게 눌러 도장
  const holdStart = () => {
    if (finished) return;
    const t0 = performance.now() - prog.current * 1400;
    const tick = (now: number) => {
      prog.current = Math.min(1, (now - t0) / 1400);
      setProgress(prog.current);
      if (prog.current >= 1) return complete();
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  };
  const holdEnd = () => {
    cancelAnimationFrame(holdRaf.current);
    if (!finished) {
      prog.current = Math.max(0, prog.current * 0.0);
      setProgress(0);
    }
  };
  useEffect(() => () => cancelAnimationFrame(holdRaf.current), []);

  let w = -1;
  return (
    <section className={`record ${finished ? 'record-done' : ''}`} data-testid="record-trace" data-coach="notebook.record">
      <p className="record-title hand">{act.title}</p>
      <p className="record-help">점선을 따라 손가락으로 훑어 적으세요.</p>
      <div
        className="trace"
        ref={box}
        data-testid="trace-area"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={`따라 쓸 문장: ${act.sentence}`}
      >
        <p className="hand trace-text">
          {words.map((t, i) => {
            if (!t.trim()) return <span key={i}>{t}</span>;
            w++;
            return (
              <span key={i} className={w < progress * count ? 'inked' : 'guide'}>
                {t}
              </span>
            );
          })}
        </p>
        <svg className="trace-trail" aria-hidden="true">
          <path d={path} />
        </svg>
      </div>
      <button
        type="button"
        className="stamp-hold"
        data-testid="record-stamp"
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
        onPointerCancel={holdEnd}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.preventDefault(), holdStart())}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && holdEnd()}
        aria-label="길게 눌러 도장으로 기록하기"
      >
        <span className="hold-fill" style={{ transform: `scaleX(${progress})` }} />
        <span className="hold-label">{finished ? '기록했다' : '길게 눌러 도장 찍기'}</span>
      </button>
    </section>
  );
}

// ── 고쳐 쓴 줄(이전/이후) ──────────────────────────────────────────
const KIND_LABEL: Record<RewriteEntry['kind'], string> = { message: '메신저', record: 'DB 기록', memo: '단말 메모', search: '검색 결과' };

function DiffPage() {
  const log = useGameStore((s) => s.rewriteLog);
  const notebook = useGameStore((s) => s.notebook);
  const pending = useGameStore((s) => s.pendingDiffPageId);
  const noted = NOTEBOOK_SECTIONS.flatMap((sec) => notebook[sec]).filter((n) => n.before !== undefined);
  const groups = useMemo(() => {
    const m = new Map<Id, RewriteEntry[]>();
    for (const r of log) m.set(r.sourceId, [...(m.get(r.sourceId) ?? []), r]);
    return [...m.entries()].reverse();
  }, [log]);
  const title = (id: Id) => IDX.shifts[id]?.title ?? (IDX.corrections[id] ? '단말이 조용히 고친 곳' : id);
  return (
    <article className="paper diff" data-testid="diff-page">
      {noted.length > 0 && (
        <section className="nb-sec">
          <h3 className="hand sec-title">고쳐 쓴 줄</h3>
          {noted.map((n) => (
            <div className="diff-pair" key={n.id} data-testid={`diff-${n.id}`}>
              <p className="hand strike old">{n.before}</p>
              <p className="hand fresh">{n.text}</p>
            </div>
          ))}
        </section>
      )}
      {groups.map(([sid, entries]) => (
        <section key={sid} className={`nb-sec tone-${entries[0]!.tone} ${pending === sid ? 'pending' : ''}`}>
          <h3 className="hand sec-title">
            {title(sid)}
            {IDX.shifts[sid] && <span className="stamp-restore">복원</span>}
          </h3>
          {entries.map((r) => (
            <div className="diff-pair" key={`${r.seq}`} data-testid={`rewrite-${r.kind}-${r.targetId}`}>
              <small className="hand kind">{KIND_LABEL[r.kind]}</small>
              <p className="hand strike old">{r.before || '(없음)'}</p>
              <p className="hand fresh">{r.after || '(없음)'}</p>
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}

// ── 단말 메모 ──────────────────────────────────────────────────────
function MemoPage() {
  const corrections = useGameStore((s) => s.corrections);
  const shifts = useGameStore((s) => s.shifts);
  const rewriteLog = useGameStore((s) => s.rewriteLog);
  const memos = useMemo(
    () => selectMemos(useGameStore.getState(), CONTENT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [corrections, shifts, rewriteLog, useGameStore.getState().flags],
  );
  return (
    <article className="terminal-memos" data-testid="memo-page">
      <h3 className="memo-head">단말 메모 <small>동기화됨</small></h3>
      {memos.length === 0 && <p className="dim">메모가 없다.</p>}
      {memos.map((m) => (
        <MemoItem key={m.id} id={m.id} title={m.title} text={m.text} />
      ))}
    </article>
  );
}

function MemoItem({ id, title, text }: { id: Id; title: string; text: string }) {
  const rw = useRewriteText('memo', id, text);
  return (
    <section className="memo" data-testid={`memo-${id}`}>
      <b>{title}</b>
      <p className={rw.busy ? 'rewriting' : ''}>{rw.text}</p>
    </section>
  );
}

// ── 기록관(전시 + 도감) ────────────────────────────────────────────
function ArchivePage() {
  const [sub, setSub] = useState<'show' | 'dex' | 'ledger'>('show');
  const ended = useGameStore((s) => endingReached(s));
  const collection = useGameStore((s) => s.collection);
  const total = completion(CONTENT.collection, collection);
  return (
    <div className="archive" data-testid="archive-page">
      <div className="subtabs">
        <button className={sub === 'show' ? 'on' : ''} data-testid="arch-show" onClick={() => setSub('show')}>
          전시
        </button>
        <button className={sub === 'dex' ? 'on' : ''} data-testid="arch-dex" onClick={() => setSub('dex')}>
          도감 {pct(total.ratio)}
        </button>
        {ended && (
          <button className={sub === 'ledger' ? 'on' : ''} data-testid="arch-ledger" onClick={() => setSub('ledger')}>
            기록 열람
          </button>
        )}
      </div>
      {sub === 'show' ? <Gallery /> : sub === 'dex' ? <CodexScreen /> : <LedgerPage />}
    </div>
  );
}

function Gallery() {
  const seenIds = useGameStore((s) => s.exhibitsSeen);
  const flags = useGameStore((s) => s.flags);
  const shifts = useGameStore((s) => s.shifts);
  const collection = useGameStore((s) => s.collection);
  const inspect = useGameStore((s) => s.inspectExhibit);
  const [open, setOpen] = useState<{ id: Id; lines: string[]; gained: ReturnType<typeof describeRewards>; seq: number } | null>(null);
  const items = useMemo(
    () => selectExhibits(useGameStore.getState(), CONTENT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seenIds, flags, collection],
  );
  const stats = completion(CONTENT.collection, collection);

  const show = (id: Id) => {
    const r = inspect(id);
    if (!r) return;
    fx('exhibit');
    setOpen({ id, lines: r.lines, gained: describeRewards(r.gained), seq: Date.now() });
  };
  const cur = open ? IDX.exhibits[open.id] : undefined;

  return (
    <div className="gallery">
      <div className="comp" aria-label="수집률">
        {CATEGORY_ORDER.map((c) => {
          const s = completion(CONTENT.collection, collection, c);
          return (
            <div key={c} className="comp-item" title={CATEGORY_LABEL[c]}>
              <PixelIcon sprite={CATEGORY_ICON[c]} size={20} />
              <span className="bar">
                <i style={{ width: pct(s.ratio) }} />
              </span>
              <b>{pct(s.ratio)}</b>
            </div>
          );
        })}
        <span className="dim">전체 {pct(stats.ratio)}</span>
      </div>
      <div className="frames">
        {items.map(({ exhibit: ex, unlocked, seen }) => {
          const restored = !!ex.restoredBy && shifts.includes(ex.restoredBy);
          return (
            <button
              key={ex.id}
              type="button"
              className={`frame ${unlocked ? (seen ? 'seen' : 'ready') : 'locked'} ${restored ? 'restored' : ''}`}
              data-testid={`exhibit-${ex.id}`}
              data-coach={ex.slot === 'register' || ex.slot === 'center' ? `archive.slot.${ex.slot}` : undefined}
              disabled={!unlocked}
              aria-label={unlocked ? ex.title : '잠긴 전시'}
              onClick={() => show(ex.id)}
            >
              <span className="frame-img">
                <Px k={unlocked ? exhibitSprite(ex.spriteKey) : 'app_archive'} scale={1} className={unlocked ? '' : 'silhouette'} />
              </span>
              <span className="frame-title">{unlocked ? ex.title : '？'}</span>
              {restored && <span className="stamp-restore">복원</span>}
              {unlocked && !seen && <span className="ready-glow" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {open && cur && (
        <aside className="exhibit-panel" role="dialog" aria-label={cur.title} data-testid="exhibit-panel" key={open.seq}>
          <header>
            <b>{cur.title}</b>
            <button className="btn btn-small" aria-label="닫기" onClick={() => setOpen(null)}>
              ✕
            </button>
          </header>
          {open.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          {open.gained.map((g) => (
            <p key={g.key} className="gain">
              <span className="gain-mark" aria-hidden="true">
                ·
              </span>
              {g.text}
            </p>
          ))}
        </aside>
      )}
    </div>
  );
}

// ── 기록 열람 모드(엔딩 뒤): 모든 DB 기록의 원래 상태와 지금 상태 ─────────────────
const BADGE_CLASS: Record<string, string> = { 변조: 'badge-forged', 검증: 'badge-verified', 재구성: 'badge-recon', 가상: 'badge-fict' };

function LedgerPage() {
  const shifts = useGameStore((s) => s.shifts);
  const corrections = useGameStore((s) => s.corrections);
  const rows = useMemo(
    () => selectRecordLedger(useGameStore.getState(), CONTENT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shifts, corrections],
  );
  return (
    <article className="ledger paper" data-testid="ledger-page">
      <p className="dim small">바뀌기 전과 지금의 기록. 변조된 기록은 실제 역사가 아니며, 복원된 기록만 검증된 사실이다.</p>
      <ul>
        {rows.map((r) => {
          const changed = r.current.fields.filter((f) => r.original.fields.find((o) => o.key === f.key)?.value !== f.value);
          return (
            <li key={r.id} className="ledger-row" data-testid={`ledger-${r.id}`}>
              <b className="ledger-title">{r.current.title}</b>
              <span className="ledger-badges">
                <span className={`badge ${BADGE_CLASS[r.originalBadge] ?? ''}`} data-testid={`ledger-orig-${r.id}`}>
                  {r.originalBadge}
                </span>
                {r.restored && (
                  <>
                    <span aria-hidden="true">→</span>
                    <span className={`badge ${BADGE_CLASS[r.currentBadge] ?? ''}`} data-testid={`ledger-now-${r.id}`}>
                      {r.currentBadge}
                    </span>
                    <span className="stamp-restore">복원</span>
                  </>
                )}
              </span>
              {r.restored &&
                changed.map((f) => (
                  <div key={f.key} className="diff-pair">
                    <small className="hand kind">{f.label}</small>
                    <p className="hand strike old">{r.original.fields.find((o) => o.key === f.key)?.value ?? '(없음)'}</p>
                    <p className="hand fresh">{f.value}</p>
                  </div>
                ))}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
