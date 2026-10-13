import { useEffect, useMemo, useRef, useState } from 'react';
import { impliedRange } from '@/core/chronology';
import { evidenceView } from '@/core/content';
import type { EvidenceView, Id, JudgeResult, YearDeduction } from '@/core/types';
import { playSfx } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { EvidencePicker } from '../components/EvidencePicker';
import { VerdictPanel } from '../components/Verdict';
import { IDX } from '../lib/content';
import {
  CONFIDENCE_LABEL,
  formatYearResult,
  formatYears,
  STRENGTH_LABEL,
  timeText,
  verdictSfx,
  yearNoteId,
  type Confidence,
} from '../lib/format';
import { clampYear, computeDomain, constraintBar, makeScale, parseYearInput, rangeBar, stepYear, ticks } from '../lib/timeline';

/** 큰 ± 스텝퍼 + 직접 입력. 누르고 있으면 반복. */
export function YearField({ label, value, onChange }: { label: string; value: number; onChange(v: number): void }) {
  const [text, setText] = useState(String(value));
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => setText(String(value)), [value]);
  const hold = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});
  const stop = () => {
    clearTimeout(hold.current.t);
    clearInterval(hold.current.i);
  };
  useEffect(() => stop, []);
  const bump = (d: number) => {
    const next = stepYear(valueRef.current, d);
    valueRef.current = next;
    onChange(next);
  };
  const start = (d: number) => {
    bump(d);
    hold.current.t = setTimeout(() => (hold.current.i = setInterval(() => bump(d), 70)), 380);
  };
  const commit = () => {
    const n = parseYearInput(text);
    if (n === null) setText(String(value));
    else onChange(n);
  };
  const btn = (d: number, caption: string, cls = '') => (
    <button
      type="button"
      className={`step ${cls}`}
      aria-label={`${label} ${d > 0 ? '+' : ''}${d}`}
      onPointerDown={(e) => {
        e.preventDefault();
        start(d);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          bump(d);
        }
      }}
    >
      {caption}
    </button>
  );
  return (
    <div className="yfield">
      <label>{label}</label>
      <div className="yfield-row">
        {btn(-10, '−10', 'step-sm')}
        {btn(-1, '−', 'step-lg')}
        <div className="yfield-input">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={text}
            aria-label={`${label} 연도`}
            onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), commit())}
          />
          <span>년</span>
        </div>
        {btn(1, '+', 'step-lg')}
        {btn(10, '+10', 'step-sm')}
      </div>
    </div>
  );
}

export function YearTimeline({ d, views, from, to }: { d: YearDeduction; views: EvidenceView[]; from: number; to: number }) {
  const timed = views.filter((v) => v.time && (v.time.notBefore !== undefined || v.time.notAfter !== undefined));
  const implied = useMemo(() => impliedRange(views, d.context, true), [views, d.context]);
  const nums: (number | undefined)[] = [from, to];
  for (const v of timed) nums.push(v.time!.notBefore, v.time!.notAfter);
  const domain = computeDomain(nums, { min: from - 20, max: to + 20 }, 30);
  const sc = makeScale(domain, 100);
  const tk = ticks(domain, 6);
  const conflict = implied.from !== undefined && implied.to !== undefined && implied.from > implied.to;
  const inter =
    !conflict && (implied.from !== undefined || implied.to !== undefined)
      ? rangeBar(Math.max(implied.from ?? domain.min, domain.min), Math.min(implied.to ?? domain.max, domain.max), sc)
      : null;
  const mine = from <= to ? rangeBar(from, to, sc) : null;
  return (
    <div className="ytl" role="img" aria-label="증거별 연대 제약 타임라인">
      <div className="ytl-plot">
        {inter && <div className="ytl-inter" style={{ left: `${inter.left}%`, width: `${inter.width}%` }} />}
        {tk.map((y) => (
          <div key={y} className="ytl-tick" style={{ left: `${sc.x(y)}%` }}>
            <span>{y}</span>
          </div>
        ))}
        <div className="ytl-rows">
          {timed.length === 0 && <p className="ytl-empty">연대 정보가 있는 증거를 고르면 가능한 시기가 막대로 나타난다.</p>}
          {timed.map((v) => {
            const t = v.time!;
            const bar = constraintBar(t, sc)!;
            return (
              <div className="ytl-row" key={v.id}>
                <div
                  className={`ytl-bar ytl-${t.strength} ${bar.openLeft ? 'open-l' : ''} ${bar.openRight ? 'open-r' : ''}`}
                  style={{ left: `${bar.left}%`, width: `${Math.max(bar.width, 0.6)}%` }}
                  title={`${v.label}: ${timeText(t)} (${STRENGTH_LABEL[t.strength]})`}
                />
                <span className="ytl-label" style={labelPos(bar.left, bar.width)}>
                  {v.label} · {timeText(t)}
                </span>
              </div>
            );
          })}
        </div>
        {mine && (
          <div className="ytl-mine-row">
            <div className="ytl-mine" style={{ left: `${mine.left}%`, width: `${Math.max(mine.width, 0.8)}%` }}>
              <span>제출 {formatYears(from, to)}</span>
            </div>
          </div>
        )}
      </div>
      <div className="ytl-legend">
        <i className="lg lg-decisive" /> 결정적 <i className="lg lg-supporting" /> 보조 <i className="lg lg-weak" /> 약함(경계 불인정) <i className="lg lg-inter" /> 교집합
        {conflict && <b className="ytl-warn">선택한 증거끼리 모순됩니다</b>}
      </div>
    </div>
  );
}

function labelPos(left: number, width: number): React.CSSProperties {
  const mid = left + width / 2;
  return mid > 62 ? { right: `${100 - (left + width)}%`, textAlign: 'right' } : { left: `${left}%` };
}

export function YearPanel({ d, onGoTimeline }: { d: YearDeduction; onGoTimeline(): void }) {
  const owned = useGameStore((s) => s.evidence);
  const submit = useGameStore((s) => s.submitDeduction);
  const addNote = useGameStore((s) => s.addNote);
  const addHypothesis = useGameStore((s) => s.addHypothesis);
  const notebook = useGameStore((s) => s.notebook);
  const attempts = useGameStore((s) => s.attempts[d.id] ?? 0);
  const best = useGameStore((s) => s.solved[d.id]?.best);

  const [from, setFrom] = useState(d.context?.from ?? 1392);
  const [to, setTo] = useState(d.context?.to ?? 1910);
  const [picked, setPicked] = useState<Id[]>([]);
  const [conf, setConf] = useState<Confidence>('mid');
  const [note, setNote] = useState('');
  const [res, setRes] = useState<{ r: JudgeResult; seq: number; from: number; to: number } | null>(null);

  const views = useMemo(
    () => picked.filter((id) => owned[id] !== undefined && IDX.evidence[id]).map((id) => evidenceView(IDX.evidence[id]!, owned[id]!)),
    [picked, owned],
  );
  const toggle = (id: Id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const invalid = from > to;

  const doSubmit = () => {
    const r = submit({ kind: 'year', deductionId: d.id, from, to, evidenceIds: picked });
    playSfx(verdictSfx(r.verdict));
    setRes({ r, seq: Date.now(), from, to });
    if (r.verdict === 'confirmed' || r.verdict === 'partial') {
      addNote({
        id: yearNoteId(d.id, from, to, r.verdict),
        section: 'verified',
        text: `연대 추리 「${d.title}」: ${formatYearResult(from, to, r.verdict)}`,
        refIds: picked,
      });
    }
    const t = note.trim();
    if (t) {
      const text = `[가설 신뢰도 ${CONFIDENCE_LABEL[conf]}] ${formatYears(from, to)} — 확인되지 않은 조건: ${t}`;
      if (!notebook.hypothesis.some((h) => h.text === text)) addHypothesis(text, picked);
    }
  };

  return (
    <div className="dpanel">
      <p className="dprompt">{d.prompt}</p>
      {best && <p className="dbest">이미 「{best === 'confirmed' ? '확정' : '부분 확정'}」 판정을 받았다. 더 좁은 범위로 다시 제출할 수 있다.</p>}
      <div className="dgrid">
        <div className="dcol">
          <div className="yrange">
            <YearField label="시작 연도" value={from} onChange={(v) => setFrom(clampYear(v))} />
            <YearField label="종료 연도" value={to} onChange={(v) => setTo(clampYear(v))} />
          </div>
          {invalid && <p className="warn">시작 연도는 종료 연도보다 늦을 수 없다.</p>}
          <YearTimeline d={d} views={views} from={from} to={to} />
          <fieldset className="conf">
            <legend>가설 신뢰도</legend>
            {(['low', 'mid', 'high'] as Confidence[]).map((c) => (
              <label key={c} className={conf === c ? 'on' : ''}>
                <input type="radio" name={`conf-${d.id}`} checked={conf === c} onChange={() => setConf(c)} />
                {CONFIDENCE_LABEL[c]}
              </label>
            ))}
          </fieldset>
          <label className="note-field">
            <span>확인되지 않은 조건</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="아직 확인하지 못한 전제가 있다면 적어 둔다. (가설로 노트에 남는다)" />
          </label>
        </div>
        <div className="dcol">
          <EvidencePicker selected={picked} onToggle={toggle} hint="연대 정보가 있는 카드를 고르면 왼쪽 타임라인에 드러난 제약만 나타난다." />
        </div>
      </div>
      <div className="dsubmit">
        <span className="dim">시도 {attempts}회</span>
        <button className="btn btn-primary btn-big" onClick={doSubmit} disabled={invalid}>
          추리 제출 · {formatYears(from, Math.max(from, to))}
        </button>
      </div>
      {res && (
        <VerdictPanel
          result={res.r}
          seq={res.seq}
          extra={
            (res.r.verdict === 'confirmed' || res.r.verdict === 'partial') && (
              <button className="btn" onClick={onGoTimeline}>
                연대표에서 확인 →
              </button>
            )
          }
        />
      )}
    </div>
  );
}
