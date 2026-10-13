/**
 * 연도 추리(하위 패널): 증거 카드를 타임라인에 끌어 올리면 카드가 드러낸 시간 막대가 줄로 놓인다.
 * 자동 교집합 음영·정답 암시 문구 없음. 카드를 놓거나 빼면 막대가 바뀌고, 시작/끝은 큰 스텝퍼로 정해 제출한다.
 * 접근성/테스트용 비드래그 경로: 카드의 '타임라인에 올리기' 버튼, 줄의 ✕ 버튼.
 */
import { useMemo, useRef, useState } from 'react';
import { evidenceView } from '@/core/content';
import type { Id, JudgeResult, YearDeduction } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { VerdictPanel } from '../components/Verdict';
import { YearField } from '../components/YearField';
import { IDX } from '../lib/content';
import { fx } from '../lib/fx';
import { CONFIDENCE_LABEL, formatYearResult, formatYears, STRENGTH_LABEL, timeText, yearNoteId, type Confidence } from '../lib/format';
import { clampYear, computeDomain, constraintBar, makeScale, rangeBar, ticks } from '../lib/timeline';

interface DragState {
  id: Id;
  origin: 'tray' | 'row';
  x: number;
  y: number;
}

export function YearDragPanel({ d, onGoTimeline }: { d: YearDeduction; onGoTimeline(): void }) {
  const owned = useGameStore((s) => s.evidence);
  const submit = useGameStore((s) => s.submitDeduction);
  const addNote = useGameStore((s) => s.addNote);
  const addHypothesis = useGameStore((s) => s.addHypothesis);
  const best = useGameStore((s) => s.solved[d.id]?.best);
  const attempts = useGameStore((s) => s.attempts[d.id] ?? 0);
  const [placed, setPlaced] = useState<Id[]>([]);
  const [from, setFrom] = useState(d.context?.from ?? 1392);
  const [to, setTo] = useState(d.context?.to ?? 1910);
  const [touched, setTouched] = useState(false);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [res, setRes] = useState<{ r: JudgeResult; seq: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const zone = useRef<HTMLDivElement>(null);

  const ownedIds = Object.keys(owned).filter((id) => IDX.evidence[id]);
  const tray = ownedIds.filter((id) => !placed.includes(id));
  const view = (id: Id) => evidenceView(IDX.evidence[id]!, owned[id]!);

  const add = (id: Id) => {
    if (placed.includes(id)) return;
    setPlaced((p) => [...p, id]);
    fx('tap');
  };
  const remove = (id: Id) => {
    setPlaced((p) => p.filter((x) => x !== id));
    fx('tap');
  };

  const startDrag = (e: React.PointerEvent, id: Id, origin: 'tray' | 'row') => {
    if ((e.target as HTMLElement).closest('button')) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const inside = (x: number, y: number) => {
      const r = zone.current?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) active = true;
      if (active) setDrag({ id, origin, x: ev.clientX, y: ev.clientY });
    };
    const end = (ev: PointerEvent, commit: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      if (commit && active) {
        const ins = inside(ev.clientX, ev.clientY);
        if (origin === 'tray' && ins) add(id);
        if (origin === 'row' && !ins) remove(id);
      }
      setDrag(null);
    };
    const up = (ev: PointerEvent) => end(ev, true);
    const cancel = (ev: PointerEvent) => end(ev, false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  const rows = placed.filter((id) => owned[id] !== undefined && IDX.evidence[id]).map((id) => ({ id, v: view(id) }));
  const domain = useMemo(() => {
    const nums: (number | undefined)[] = [];
    for (const r of rows) nums.push(r.v.time?.notBefore, r.v.time?.notAfter);
    if (touched) nums.push(from, to);
    return computeDomain(nums, { min: d.context?.from ?? 1392, max: d.context?.to ?? 1910 }, 24);
  }, [rows, touched, from, to, d.context]);
  const sc = makeScale(domain, 100);
  const tk = ticks(domain, 4);
  const mine = touched && from <= to ? rangeBar(from, to, sc) : null;
  const invalid = from > to;

  const doSubmit = () => {
    const r = submit({ kind: 'year', deductionId: d.id, from, to, evidenceIds: placed });
    setRes({ r, seq: Date.now() });
    fx(r.verdict === 'confirmed' ? 'verdict_confirmed' : r.verdict === 'partial' ? 'verdict_partial' : 'verdict_wrong');
    if (r.verdict === 'confirmed' || r.verdict === 'partial')
      addNote({
        id: yearNoteId(d.id, from, to, r.verdict),
        section: 'verified',
        text: `연대 추리 「${d.title}」: ${formatYearResult(from, to, r.verdict)}`,
        refIds: placed,
      });
    if (conf) {
      const text = `[가설 신뢰도 ${CONFIDENCE_LABEL[conf]}] ${formatYears(from, to)}`;
      if (!useGameStore.getState().notebook.hypothesis.some((h) => h.text === text)) addHypothesis(text, placed);
    }
  };

  return (
    <div className="dpanel year" data-testid="year-panel">
      <p className="dprompt">{d.prompt}</p>
      {best && <p className="dbest">이미 「{best === 'confirmed' ? '확정' : '부분 확정'}」 판정을 받았다. 더 좁은 범위로 다시 제출할 수 있다.</p>}

      <h4>카드 더미</h4>
      <div className="ytray" data-testid="year-tray" data-coach="board.evidence">
        {tray.length === 0 && <p className="dim">{ownedIds.length ? '모든 카드를 타임라인에 올렸다.' : '인용할 수 있는 카드가 없다.'}</p>}
        {tray.map((id) => {
          const v = view(id);
          return (
            <div
              key={id}
              className={`ycard ${drag?.id === id ? 'dragging' : ''}`}
              data-testid={`year-card-${id}`}
              onPointerDown={(e) => startDrag(e, id, 'tray')}
            >
              <b>{v.label}</b>
              <span className="ycard-time">{v.time ? `${timeText(v.time)} · ${STRENGTH_LABEL[v.time.strength]}` : '연대 정보 없음'}</span>
              <button type="button" className="ycard-add" data-testid={`year-add-${id}`} onClick={() => add(id)}>
                ＋ 타임라인에 올리기
              </button>
            </div>
          );
        })}
      </div>

      <h4>타임라인</h4>
      <div className={`ytl2 ${drag ? 'drop-ready' : ''}`} ref={zone} data-testid="year-dropzone">
        <div className="ytl2-axis">
          {tk.map((y) => (
            <span key={y} style={{ left: `${sc.x(y)}%` }}>
              {y}
            </span>
          ))}
        </div>
        {rows.length === 0 && <p className="ytl2-empty">카드를 여기로 끌어 놓으면 그 카드가 알려 주는 시기가 막대로 나타난다.</p>}
        {rows.map(({ id, v }) => {
          const bar = v.time ? constraintBar(v.time, sc) : null;
          return (
            <div className="yrow" key={id} data-testid={`year-row-${id}`} onPointerDown={(e) => startDrag(e, id, 'row')}>
              <div className="yrow-label">
                <b>{v.label}</b>
                <small>{v.time ? timeText(v.time) : '연대 정보 없음'}</small>
              </div>
              <div className="yrow-track">
                {bar && (
                  <div
                    className={`ybar ybar-${v.time!.strength} ${bar.openLeft ? 'open-l' : ''} ${bar.openRight ? 'open-r' : ''}`}
                    style={{ left: `${bar.left}%`, width: `${Math.max(bar.width, 0.8)}%` }}
                    title={v.time!.weakReason}
                  />
                )}
              </div>
              <button type="button" className="yrow-x" aria-label={`${v.label} 내리기`} data-testid={`year-remove-${id}`} onClick={() => remove(id)}>
                ✕
              </button>
            </div>
          );
        })}
        {mine && (
          <div className="yrow yrow-mine">
            <div className="yrow-label">
              <b>내 답</b>
              <small>{formatYears(from, to)}</small>
            </div>
            <div className="yrow-track">
              <div className="ymine" style={{ left: `${mine.left}%`, width: `${Math.max(mine.width, 0.8)}%` }} />
            </div>
            <span />
          </div>
        )}
        <div className="ylegend">
          <i className="lg lg-decisive" /> 결정적 <i className="lg lg-supporting" /> 보조 <i className="lg lg-weak" /> 약함
        </div>
      </div>

      <h4>범위</h4>
      <div className="yrange">
        <YearField
          id="year-from"
          label="시작 연도"
          value={from}
          onChange={(v) => {
            setFrom(clampYear(v));
            setTouched(true);
          }}
        />
        <YearField
          id="year-to"
          label="끝 연도"
          value={to}
          onChange={(v) => {
            setTo(clampYear(v));
            setTouched(true);
          }}
        />
      </div>
      {invalid && <p className="warn">시작 연도는 끝 연도보다 늦을 수 없다.</p>}
      <fieldset className="conf">
        <legend>가설 신뢰도 (선택)</legend>
        {(['low', 'mid', 'high'] as Confidence[]).map((c) => (
          <button key={c} type="button" className={`pill ${conf === c ? 'on' : ''}`} aria-pressed={conf === c} onClick={() => setConf(conf === c ? null : c)}>
            {CONFIDENCE_LABEL[c]}
          </button>
        ))}
      </fieldset>
      <div className="dsubmit">
        <span className="dim">시도 {attempts}회</span>
        <button className="btn btn-primary btn-big" data-testid="submit-deduction" data-coach="board.deduction.year.submit" disabled={invalid || placed.length === 0} onClick={doSubmit}>
          제출 · {formatYears(from, Math.max(from, to))}
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
      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {IDX.evidence[drag.id] ? evidenceView(IDX.evidence[drag.id]!, owned[drag.id] ?? 0).label : ''}
        </div>
      )}
    </div>
  );
}
