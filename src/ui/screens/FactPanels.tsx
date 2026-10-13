import { useMemo, useState } from 'react';
import { stageOf } from '@/core/collection';
import { evidenceView } from '@/core/content';
import type { EventDeduction, Id, JudgeResult, PersonDeduction } from '@/core/types';
import { playSfx } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { EvidenceCard } from '../components/EvidenceCard';
import { EvidencePicker } from '../components/EvidencePicker';
import { Empty } from '../components/kit';
import { VerdictPanel } from '../components/Verdict';
import { useTypewriter } from '../hooks';
import { IDX, entryForRef } from '../lib/content';
import { DB_NOTE_PREFIX, SOLVED_NOTE_PREFIX, verdictSfx } from '../lib/format';

/** 후보로 보여줄 인물: 도감에서 정체가 식별됐거나 역사 데이터베이스에서 열람한 인물만. */
export function useKnownPersons() {
  const collection = useGameStore((s) => s.collection);
  const verified = useGameStore((s) => s.notebook.verified);
  return useMemo(() => {
    const dbSeen = new Set(verified.filter((n) => n.id.startsWith(DB_NOTE_PREFIX)).map((n) => n.id.slice(DB_NOTE_PREFIX.length)));
    return (personId: Id) => {
      const e = entryForRef('person', personId);
      if (!e) return false;
      return stageOf(collection, e.id) >= 2 || dbSeen.has(e.id);
    };
  }, [collection, verified]);
}

function NameFill({ from, to }: { from: string; to: string }) {
  const tw = useTypewriter(to, 0.8);
  return (
    <div className="namefill" aria-live="polite">
      <s>{from}</s>
      <span>→</span>
      <b>{tw.shown}</b>
    </div>
  );
}

export function PersonPanel({ d }: { d: PersonDeduction }) {
  const owned = useGameStore((s) => s.evidence);
  const submit = useGameStore((s) => s.submitDeduction);
  const addNote = useGameStore((s) => s.addNote);
  const known = useKnownPersons();
  const [cand, setCand] = useState<Id | null>(null);
  const [picked, setPicked] = useState<Id[]>([]);
  const [res, setRes] = useState<{ r: JudgeResult; seq: number; before: string; after: string } | null>(null);
  const subject = IDX.evidence[d.subjectEvidenceId];
  const subLevel = owned[d.subjectEvidenceId];
  const candidates = d.candidates.filter((id) => IDX.persons[id] && known(id));
  const toggle = (id: Id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const label = (lv: number) => (subject ? evidenceView(subject, lv).label : '');

  const doSubmit = () => {
    if (!cand) return;
    const before = subLevel !== undefined ? label(subLevel) : '';
    const r = submit({ kind: 'person', deductionId: d.id, candidateId: cand, evidenceIds: picked });
    playSfx(verdictSfx(r.verdict));
    const after = useGameStore.getState().evidence[d.subjectEvidenceId];
    setRes({ r, seq: Date.now(), before, after: after !== undefined ? label(after) : before });
    if (r.verdict === 'confirmed')
      addNote({ id: `${SOLVED_NOTE_PREFIX}${d.id}`, section: 'verified', text: `인물 추리 「${d.title}」: ${IDX.persons[cand]!.name}`, refIds: picked });
  };

  return (
    <div className="dpanel">
      <p className="dprompt">{d.prompt}</p>
      <div className="dgrid">
        <div className="dcol">
          <h4>정체를 밝힐 인물 카드</h4>
          {subject && subLevel !== undefined ? <EvidenceCard ev={subject} level={subLevel} /> : <Empty>이 인물 카드를 아직 확보하지 못했다.</Empty>}
          <h4>후보 인물</h4>
          {candidates.length === 0 ? (
            <Empty>비교할 인물 정보가 없다. 연구실의 역사 데이터베이스에서 인물을 조사하자.</Empty>
          ) : (
            <div className="cands" role="radiogroup" aria-label="후보 인물">
              {candidates.map((id) => {
                const p = IDX.persons[id]!;
                return (
                  <button key={id} role="radio" aria-checked={cand === id} className={`cand ${cand === id ? 'on' : ''}`} onClick={() => setCand(id)}>
                    <b>
                      {p.name}
                      {p.hanja && <small> {p.hanja}</small>}
                    </b>
                    <span>{p.summary}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="dcol">
          <EvidencePicker selected={picked} onToggle={toggle} sort="none" hint="후보와 맞는지 가려 줄 사실을 입증하는 카드를 고른다." />
        </div>
      </div>
      <div className="dsubmit">
        <span className="dim">{cand ? `${IDX.persons[cand]!.name} 선택` : '후보를 고르세요'}</span>
        <button className="btn btn-primary btn-big" disabled={!cand} onClick={doSubmit}>
          신원 추리 제출
        </button>
      </div>
      {res && (
        <VerdictPanel
          result={res.r}
          seq={res.seq}
          extra={res.r.verdict === 'confirmed' && res.before !== res.after ? <NameFill from={res.before} to={res.after} /> : undefined}
        />
      )}
    </div>
  );
}

export function Reinterpretation({ d }: { d: EventDeduction }) {
  const notebook = useGameStore((s) => s.notebook);
  const script: { title?: string; lines: string[] } | null = null;
  const ev = IDX.events[d.eventId];
  const seen = [...notebook.observed, ...notebook.testimony].filter((n) => !n.id.startsWith('ui_')).slice(0, 4);
  return (
    <section className="reinterp">
      <h4>{script?.title ?? '다시 읽는 장면'}</h4>
      {script ? (
        script.lines.map((l, i) => <p key={i}>{l}</p>)
      ) : (
        <>
          {ev && <p>{ev.summary}</p>}
          {seen.length > 0 && (
            <>
              <p className="dim">앞서 적어 둔 기록이 새롭게 읽힌다.</p>
              <ul>
                {seen.map((n) => (
                  <li key={n.id}>{n.text}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

export function EventPanel({ d }: { d: EventDeduction }) {
  const submit = useGameStore((s) => s.submitDeduction);
  const addNote = useGameStore((s) => s.addNote);
  const [stmt, setStmt] = useState<Id | null>(null);
  const [picked, setPicked] = useState<Id[]>([]);
  const [res, setRes] = useState<{ r: JudgeResult; seq: number } | null>(null);
  const toggle = (id: Id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const ev = IDX.events[d.eventId];

  const doSubmit = () => {
    if (!stmt) return;
    const r = submit({ kind: 'event', deductionId: d.id, statementId: stmt, evidenceIds: picked });
    playSfx(verdictSfx(r.verdict));
    setRes({ r, seq: Date.now() });
    if (r.verdict === 'confirmed') {
      const text = d.statements.find((s) => s.id === stmt)?.text ?? '';
      addNote({ id: `${SOLVED_NOTE_PREFIX}${d.id}`, section: 'verified', text: `사건 해결 「${d.title}」: ${text}`, refIds: picked });
    }
  };

  return (
    <div className="dpanel">
      <p className="dprompt">{d.prompt}</p>
      {ev && <p className="devent">대상 기록: {ev.name}</p>}
      <div className="dgrid">
        <div className="dcol">
          <h4>서술 선택</h4>
          <div className="cands" role="radiogroup" aria-label="서술">
            {d.statements.map((s) => (
              <button key={s.id} role="radio" aria-checked={stmt === s.id} className={`cand ${stmt === s.id ? 'on' : ''}`} onClick={() => setStmt(s.id)}>
                <b>{s.text}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="dcol">
          <EvidencePicker selected={picked} onToggle={toggle} sort="none" hint="선택한 서술을 뒷받침하거나 가로막는 사실을 입증하는 카드를 고른다." />
        </div>
      </div>
      <div className="dsubmit">
        <span className="dim">{stmt ? '서술 선택됨' : '서술을 고르세요'}</span>
        <button className="btn btn-primary btn-big" disabled={!stmt} onClick={doSubmit}>
          사건 해석 제출
        </button>
      </div>
      {res && <VerdictPanel result={res.r} seq={res.seq} extra={res.r.verdict === 'confirmed' ? <Reinterpretation d={d} /> : undefined} />}
    </div>
  );
}
