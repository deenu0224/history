/**
 * 업무: 배정함(카드 + 체크리스트 도장) · 종결된 보고서 · 보고서(4칸).
 * 튜토리얼은 없다. 막히면 칸이 살짝 흔들리고 한 줄이 뜬다. 힌트는 메신저로만 온다.
 */
import { useEffect, useMemo, useState } from 'react';
import { BLANK_KEYS, type BlankKey, type Id } from '@/core/types';
import type { BlankResult } from '@/core/report';
import {
  STAMP_LABEL,
  selectAssignment,
  selectClosedReports,
  selectFrames,
  selectRecord,
  selectReport,
  useGameStore,
  type AttachmentRef,
  type ClosedReportView,
  type ReportResult,
} from '@/store/gameStore';
import { HoldButton } from '../components/HoldButton';
import { IndexCard } from '../components/IndexCard';
import { Polaroid } from '../components/Polaroid';
import { RichText } from '../components/RichText';
import { Scramble } from '../components/Scramble';
import { Sheet } from '../components/Sheet';
import { YearField } from '../components/YearField';
import { useBackHandler } from '../hooks';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useUi, type WorkTab } from '../uiStore';

const ASSIGNMENT = CONTENT.assignments[0]!;
const SPEC = CONTENT.reports[0]!;
const NO = ['①', '②', '③', '④', '⑤'];

export function WorkApp() {
  const st = useGameStore();
  const tab = useUi((s) => s.workTab);
  const setTab = useUi((s) => s.setWorkTab);
  const reportSeen = useUi((s) => s.reportSeen);
  const closed = Object.keys(st.closures).length > 0;
  const rep = selectReport(st, SPEC.id);
  const reportOpen = !!rep && (rep.unlocked || rep.filed);
  const tabs: { key: WorkTab; label: string; id: string; dot?: boolean }[] = [{ key: 'card', label: '배정', id: 'assign-tab' }];
  if (closed) tabs.push({ key: 'closed', label: '종결된 보고서', id: 'closed-tab' });
  if (reportOpen) tabs.push({ key: 'report', label: '보고서', id: 'report-tab', dot: !reportSeen && !rep?.filed });
  const cur = tabs.some((t) => t.key === tab) ? tab : 'card';

  return (
    <div className="work" data-testid="app-work">
      {tabs.length > 1 && (
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={cur === t.key}
              className={`tab ${cur === t.key ? 'on' : ''}`}
              data-testid={t.id}
              onClick={() => {
                fx('tap');
                setTab(t.key);
              }}
            >
              {t.label}
              {t.dot && <i className="tab-dot" aria-label="새로 열림" />}
            </button>
          ))}
        </div>
      )}
      <div className="work-body">
        {cur === 'card' && <AssignTab />}
        {cur === 'closed' && <ClosedTab />}
        {cur === 'report' && <ReportTab />}
      </div>
    </div>
  );
}

// ── 배정 ───────────────────────────────────────────────────────
function AssignTab() {
  const st = useGameStore();
  const view = selectAssignment(st, ASSIGNMENT.id)!;
  const [open, setOpen] = useState(view.opened);
  const [msg, setMsg] = useState<Record<string, { text: string; n: number }>>({});
  const [stampedNow, setStampedNow] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const observed = st.appsOpened.includes('viewer');
  const a = view.assignment;
  // 종결 도장이 찍히면 그 칸이 화면에 오게
  useEffect(() => {
    if (closing) document.querySelector('[data-testid="stamp-ck_verdict"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [closing]);

  if (!open) {
    return (
      <div className="inbox">
        <h3 className="sect">배정함</h3>
        <button
          type="button"
          className="assign-card"
          data-testid="assignment-open"
          onClick={() => {
            fx('tap');
            useGameStore.getState().openAssignment(a.id);
            setOpen(true);
          }}
        >
          <span className="assign-tag">신규 · 우선순위 {a.priority}</span>
          <strong>
            {a.title} {a.code}
          </strong>
          <span className="dim">{a.officer}</span>
        </button>
        <p className="quiet">배정 대기 중인 건은 이것뿐이다.</p>
      </div>
    );
  }

  const stamp = (itemId: string, verdict: 'match' | 'mismatch') => {
    const r = useGameStore.getState().stampChecklist(itemId, verdict);
    if (r.status === 'stamped') {
      fx('stamp');
      setStampedNow(itemId);
      setMsg((m) => ({ ...m, [itemId]: { text: '', n: 0 } }));
    } else if (r.status === 'closed') {
      fx('stamp');
      setStampedNow(itemId);
      setClosing(true);
      window.setTimeout(() => fx('stamp_auto'), 300);
    } else if (r.status === 'not_ready' || r.status === 'wrong') {
      fx('stamp_miss');
      setMsg((m) => ({ ...m, [itemId]: { text: r.message ?? '', n: (m[itemId]?.n ?? 0) + 1 } }));
    }
  };

  return (
    <div className="assign" data-testid="assignment">
      <header className="assign-head">
        <div>
          <h3 className="assign-title">
            {a.title} <b>{a.code}</b>
          </h3>
          <p className="dim small">
            {a.officer} · 우선순위 {a.priority}
          </p>
        </div>
        <button
          type="button"
          className={`btn btn-primary btn-big ${observed ? '' : 'pulse-soft'}`}
          data-testid="observe-start"
          onClick={() => {
            fx('tap');
            const g = useGameStore.getState();
            g.startObservation(a.timelineId);
            g.openApp('viewer');
          }}
        >
          {observed ? '관측 열기' : '관측 시작'}
        </button>
      </header>

      <dl className="assign-meta">
        {view.header.map((h) => (
          <div key={h.key} className={`meta-row meta-${h.key}`}>
            <dt>{h.label}</dt>
            <dd data-testid={`assign-${h.key}`}>
              <Scramble text={h.value} playKey={`assignment:${a.id}`} label={h.label} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="detect">{a.detection}</p>

      <ol className="checks">
        {view.items.map((cv) => {
          const it = cv.item;
          const m = msg[it.id];
          const stamped = cv.stamp;
          const isFinal = !!it.final;
          const closure = view.closure;
          return (
            <li
              key={it.id}
              className={`check ${stamped ? 'stamped' : ''} ${cv.ready && !stamped ? 'lit' : ''}`}
              data-testid={`check-${it.id}`}
            >
              <div className="check-head">
                <span className="check-no" aria-hidden="true">
                  {NO[it.no - 1]}
                </span>
                <div className="check-title">
                  <strong>{it.title}</strong>
                  <span className="check-ref">{it.refLabel.startsWith('참조') ? it.refLabel : `참조 ${it.refLabel}`}</span>
                </div>
                <span className={`check-lamp ${cv.ready || stamped ? 'on' : ''}`} aria-hidden="true" />
              </div>
              <p className="check-prompt">{it.prompt}</p>

              {stamped && (
                <div className="stamp-zone" key={`${it.id}-${stamped}`}>
                  <span
                    className={`ink-stamp ink-${stamped} ${stampedNow === it.id ? 'ink-fresh' : ''}`}
                    data-testid={`stamp-${it.id}`}
                    aria-label={`${STAMP_LABEL[stamped]} 도장`}
                  >
                    {STAMP_LABEL[stamped]}
                  </span>
                  {isFinal && closure && (
                    <span
                      className={`auto-stamp ${closing ? 'auto-fresh' : ''}`}
                      data-testid="stamp-auto"
                      aria-label={a.autoClassification}
                    >
                      <b>관측 오류</b>
                      <i>종결</i>
                    </span>
                  )}
                </div>
              )}

              {!stamped && !closure && (
                <div className="hold-row" key={`${it.id}-${m?.n ?? 0}`}>
                  <HoldButton
                    testId={`check-${it.id}-match`}
                    tone="teal"
                    glow={isFinal && it.final!.recommend === 'match'}
                    onComplete={() => stamp(it.id, 'match')}
                    className={m?.n ? 'wobble' : ''}
                  >
                    {isFinal ? it.final!.recommendButton : '일치'}
                  </HoldButton>
                  <HoldButton testId={`check-${it.id}-mismatch`} tone="red" onComplete={() => stamp(it.id, 'mismatch')} className={m?.n ? 'wobble' : ''}>
                    불일치
                  </HoldButton>
                </div>
              )}
              {!stamped && !closure && <p className="hold-hint">길게 눌러 찍는다</p>}
              {m?.text ? (
                <p className="check-msg" role="status" data-testid={`check-msg-${it.id}`}>
                  {m.text}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {view.closure && (
        <p className="queue" data-testid="queue">
          [업무] 다음 배정 대기 — 장비 점검 중.
        </p>
      )}
    </div>
  );
}

// ── 종결된 보고서 ──────────────────────────────────────────────
function ClosedTab() {
  const st = useGameStore();
  const rows = selectClosedReports(st);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'code' | 'recent'>('code');
  const [openId, setOpenId] = useState<Id | null>(null);
  useBackHandler(openId !== null, () => (setOpenId(null), true));

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const f = needle
      ? rows.filter((r) => [r.code, r.when, r.verdict, r.classification, r.note].join(' ').toLowerCase().includes(needle))
      : rows;
    return sort === 'code' ? [...f].sort((a, b) => a.code.localeCompare(b.code) || Number(b.current) - Number(a.current)) : f;
  }, [rows, q, sort]);

  const open = rows.find((r) => r.id === openId);
  if (open) return <ClosedDetail r={open} onBack={() => setOpenId(null)} />;

  return (
    <div className="closed" data-testid="closed-list">
      <div className="closed-tools">
        <input
          className="field"
          data-testid="closed-search"
          placeholder="좌표로 찾기  (예: C-2217)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="종결된 보고서 검색"
          autoComplete="off"
        />
        <button type="button" className="btn btn-small" data-testid="closed-sort" onClick={() => setSort(sort === 'code' ? 'recent' : 'code')}>
          {sort === 'code' ? '좌표순' : '최근순'}
        </button>
      </div>
      <ul className="closed-rows">
        {list.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className={`closed-row ${!r.current && !r.opened ? 'unseen' : ''}`}
              data-testid={`closed-${r.id}`}
              onClick={() => {
                fx('tap');
                if (!r.current) useGameStore.getState().openClosedReport(r.id);
                setOpenId(r.id);
              }}
            >
              <b className="closed-code">{r.code}</b>
              <span className="closed-when">{r.when}</span>
              <span className="closed-by">{r.officer}</span>
              <span className="closed-class">{r.classification}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="quiet">찾는 좌표가 없다.</li>}
      </ul>
    </div>
  );
}

function ClosedDetail({ r, onBack }: { r: ClosedReportView; onBack(): void }) {
  const mine = !r.current && r.code === ASSIGNMENT.code;
  return (
    <article className={`doc ${mine ? 'doc-quiet' : ''}`} data-testid={`closed-detail-${r.id}`}>
      <button type="button" className="btn btn-small doc-back" data-testid="closed-back" onClick={onBack}>
        ← 목록
      </button>
      <h3 className="doc-title">
        관측 보고서 <b>{r.code}</b>
      </h3>
      <dl className="doc-rows">
        <div style={{ animationDelay: '0ms' }}>
          <dt>작성</dt>
          <dd>{r.officer}</dd>
        </div>
        <div style={{ animationDelay: mine ? '500ms' : '0ms' }}>
          <dt>시점</dt>
          <dd>{r.when}</dd>
        </div>
        <div style={{ animationDelay: mine ? '1000ms' : '0ms' }}>
          <dt>판정</dt>
          <dd>{r.verdict}</dd>
        </div>
        {r.fields.map((f, i) => (
          <div key={f.label} style={{ animationDelay: mine ? `${1500 + i * 500}ms` : '0ms' }}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
        {r.note && (
          <div className="doc-note" style={{ animationDelay: mine ? '2800ms' : '0ms' }}>
            <dt>소견</dt>
            <dd>
              <RichText text={r.note} plainTerms />
            </dd>
          </div>
        )}
      </dl>
      <p className="auto-stamp static" aria-label={r.classification} style={{ animationDelay: mine ? '2000ms' : '0ms' }}>
        <b>{r.classification.replace(/^자동 분류:\s*/, '').split(' · ')[0]}</b>
        <i>{r.classification.split(' · ')[1] ?? ''}</i>
      </p>
      {mine && (
        <p className="pencil" style={{ animationDelay: '4200ms' }}>
          쓴 기억이 없다.
        </p>
      )}
    </article>
  );
}

// ── 보고서 ─────────────────────────────────────────────────────
const VERDICT_LABEL = { confirmed: '확인', partial: '부분', undetermined: '근거 부족', wrong: '어긋남' } as const;

const draftKey = (d: unknown) => JSON.stringify(d);

function ReportTab() {
  const st = useGameStore();
  const markSeen = useUi((s) => s.markReportSeen);
  const setTab = useUi((s) => s.setWorkTab);
  const view = selectReport(st, SPEC.id)!;
  const { frames } = selectFrames(st);
  const [sheet, setSheet] = useState<BlankKey | null>(null);
  const [submitted, setSubmitted] = useState<{ key: string; result: ReportResult } | null>(null);
  const [filedAnim, setFiledAnim] = useState(false);
  useEffect(() => markSeen(), [markSeen]);
  useBackHandler(sheet !== null, () => (setSheet(null), true));

  const draft = view.draft;
  const result = submitted?.result ?? view.result;
  const stale = !!submitted && submitted.key !== draftKey(draft);
  const complete = !!result?.complete && !stale && !view.filed;
  const blankLabel: Record<BlankKey, { label: string; prompt: string; empty: string }> = {
    when: { label: SPEC.when.label, prompt: SPEC.when.prompt, empty: SPEC.when.emptyText },
    who: { label: SPEC.who.label, prompt: SPEC.who.prompt, empty: '' },
    what: { label: SPEC.what.label, prompt: SPEC.what.prompt, empty: SPEC.what.emptyText },
    result: { label: SPEC.result.label, prompt: SPEC.result.prompt, empty: SPEC.result.emptyText },
  };
  const locked = view.filed;

  const submit = () => {
    const g = useGameStore.getState();
    const r = g.submitReport(SPEC.id);
    if (!r) return;
    setSubmitted({ key: draftKey(selectReport(g, SPEC.id)!.draft), result: r });
    fx('tap');
    BLANK_KEYS.forEach((k, i) => {
      const v = r.blanks[k].verdict;
      window.setTimeout(() => fx(v === 'confirmed' ? 'verdict_confirmed' : v === 'partial' ? 'verdict_partial' : 'verdict_wrong'), 120 + i * 140);
    });
  };

  const file = () => {
    const r = useGameStore.getState().stampReport(SPEC.id);
    if (r.status !== 'filed') return;
    fx('restore');
    useUi.getState().bloom();
    setFiledAnim(true);
    // 승인 도장 → 배정 카드의 일시가 채워지고 → 메신저에서 지난 대화가 다시 쓰인다
    document.querySelector('.work-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      setTab('card');
      requestAnimationFrame(() => document.querySelector('.work-body')?.scrollTo({ top: 0 }));
    }, 1700);
    window.setTimeout(() => {
      const ui = useUi.getState();
      ui.openThread('chief');
      useGameStore.getState().openApp('messenger');
    }, 5200);
  };

  return (
    <div className="report" data-testid="report">
      <h3 className="sect">{SPEC.title}</h3>
      {locked && (
        <p className="approved" data-testid="report-approved">
          <span className={`ink-stamp ink-teal ${filedAnim ? 'ink-fresh' : ''}`}>승인</span>
          <span>복원심의위원회 승인 · 복원 반영</span>
        </p>
      )}
      {BLANK_KEYS.map((k) => {
        const att = draft[k].attachments;
        const res: BlankResult | undefined = result?.blanks[k];
        return (
          <section key={k} className={`blank blank-${k} ${res && !stale ? `v-${res.verdict}` : ''}`} data-testid={`blank-${k}`}>
            <header className="blank-head">
              <h4>{blankLabel[k].label}</h4>
              {res && (
                <span className={`lamp lamp-${res.verdict} ${stale ? 'stale' : ''}`} data-testid={`verdict-${k}`} data-verdict={res.verdict}>
                  {VERDICT_LABEL[res.verdict]}
                </span>
              )}
            </header>
            <p className="blank-prompt">{blankLabel[k].prompt}</p>
            <div className="attached">
              {att.map((ref) => (
                <Attached key={`${ref.kind}-${ref.id}`} ref_={ref} blank={k} locked={locked} />
              ))}
              {att.length < SPEC.maxAttachments && !locked && (
                <button type="button" className="add" data-testid={`attach-open-${k}`} onClick={() => (fx('tap'), setSheet(k))}>
                  <span aria-hidden="true">＋</span> 붙이기
                </button>
              )}
              {att.length === 0 && locked && <span className="quiet">붙인 자료 없음</span>}
            </div>
            {k === 'when' && (
              <>
                <YearField
                  from={draft.when.from}
                  to={draft.when.to}
                  implied={view.impliedYears}
                  disabled={locked}
                  onChange={(f, t) => useGameStore.getState().setYear(f, t, SPEC.id)}
                />
                {(view.impliedYears.from !== undefined || view.impliedYears.to !== undefined) && (
                  <p className="implied" data-testid="implied-years">
                    붙인 자료가 가리키는 해: {view.impliedYears.from ?? '?'} ~ {view.impliedYears.to ?? '?'}
                  </p>
                )}
              </>
            )}
            {res && !stale && (
              <ul className="feedback" data-testid={`feedback-${k}`}>
                {(res.verdict === 'confirmed' ? res.feedback.slice(-1) : res.feedback).map((f, i) => (
                  <li key={i}>{f.message}</li>
                ))}
                {res.feedback.length === 0 && res.verdict === 'confirmed' && <li>근거가 맞아떨어진다.</li>}
              </ul>
            )}
          </section>
        );
      })}

      {!locked && (
        <div className="submit-row">
          <button type="button" className="btn btn-big" data-testid="report-submit" onClick={submit}>
            제출해 확인받기
          </button>
          <p className="quiet">틀려도 손해는 없다. 칸마다 무엇이 모자란지 알려 준다.</p>
        </div>
      )}
      {complete && (
        <div className="stamp-final" data-testid="report-ready">
          <p>네 칸이 모두 근거로 찼다.</p>
          <HoldButton ms={1200} tone="red" testId="report-stamp" className="hold-big" onComplete={file}>
            도장 — 길게 누르기
          </HoldButton>
        </div>
      )}

      {sheet && <AttachSheet blank={sheet} frames={frames.map((f) => f.frame.id)} onClose={() => setSheet(null)} />}
    </div>
  );
}

function Attached({ ref_, blank, locked }: { ref_: AttachmentRef; blank: BlankKey; locked: boolean }) {
  const st = useGameStore();
  const fr = ref_.kind === 'frame' ? st.frames.find((f) => f.id === ref_.id) : undefined;
  const rec = ref_.kind === 'record' ? selectRecord(st, ref_.id) : undefined;
  return (
    <span className={`att att-${ref_.kind}`} data-testid={`attached-${blank}-${ref_.kind}-${ref_.id}`}>
      {fr ? <Polaroid frame={fr} className="pol-sm" /> : rec ? <IndexCard rec={rec} className="icard-sm" /> : null}
      {!locked && (
        <button
          type="button"
          className="att-x"
          aria-label="떼기"
          data-testid={`detach-${ref_.kind}-${ref_.id}-${blank}`}
          onClick={() => {
            fx('tap');
            useGameStore.getState().detach(blank, ref_, SPEC.id);
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

function AttachSheet({ blank, frames, onClose }: { blank: BlankKey; frames: Id[]; onClose(): void }) {
  const st = useGameStore();
  const view = selectReport(st, SPEC.id)!;
  const [note, setNote] = useState('');
  const cur = view.draft[blank].attachments;
  const has = (ref: AttachmentRef) => cur.some((x) => x.kind === ref.kind && x.id === ref.id);
  const toggle = (ref: AttachmentRef) => {
    const g = useGameStore.getState();
    if (has(ref)) {
      g.detach(blank, ref, SPEC.id);
      setNote('');
      fx('tap');
      return;
    }
    const r = g.attach(blank, ref, SPEC.id);
    if (r === 'attached') {
      fx('stamp');
      setNote('');
    } else if (r === 'full') setNote('한 칸에는 두 개까지 붙인다. 하나를 떼고 붙이자.');
  };
  const records = view.attachable.records.map((id) => selectRecord(st, id)).filter((r): r is NonNullable<typeof r> => !!r);
  const label = CONTENT.reports[0]![blank].label;

  return (
    <Sheet title={`「${label}」에 붙일 자료`} onClose={onClose} testId="attach-sheet" wide>
      <h5 className="sheet-sub">필름 프레임</h5>
      {frames.length === 0 && <p className="quiet">찍어 둔 프레임이 없다.</p>}
      <div className="attach-grid">
        {st.frames.map((f) => (
          <Polaroid
            key={f.id}
            frame={f}
            testId={`attach-frame-${f.id}`}
            selected={has({ kind: 'frame', id: f.id })}
            onClick={() => toggle({ kind: 'frame', id: f.id })}
          />
        ))}
      </div>
      <h5 className="sheet-sub">열어 본 DB 기록</h5>
      {records.length === 0 && <p className="quiet">열어 본 기록이 없다.</p>}
      <div className="attach-cards">
        {records.map((r) => (
          <IndexCard
            key={r.id}
            rec={r}
            testId={`attach-record-${r.id}`}
            selected={has({ kind: 'record', id: r.id })}
            onClick={() => toggle({ kind: 'record', id: r.id })}
          />
        ))}
      </div>
      {note && (
        <p className="check-msg" role="status">
          {note}
        </p>
      )}
      <button type="button" className="btn btn-primary btn-big sheet-done" onClick={onClose}>
        완료
      </button>
    </Sheet>
  );
}

