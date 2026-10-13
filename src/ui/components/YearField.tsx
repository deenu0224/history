/** 언제 칸의 시작·끝 해. 큰 ± 버튼(꾹 누르면 빨라진다)과 직접 입력. 해를 대신 채워 주지 않는다. */
import { useEffect, useRef } from 'react';
import { YEAR_START, clampYear, yearStepFor } from '../lib/text';

function Year({
  label,
  value,
  onChange,
  start,
  id,
  disabled,
}: {
  label: string;
  value?: number;
  onChange(v: number | undefined): void;
  start: number;
  id: 'year-from' | 'year-to';
  disabled?: boolean;
}) {
  const timer = useRef<number>(0);
  const cur = useRef(value);
  cur.current = value;
  const stop = () => {
    window.clearTimeout(timer.current);
    window.clearInterval(timer.current);
  };
  useEffect(() => stop, []);

  const press = (dir: 1 | -1) => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    let ticks = 0;
    const apply = () => {
      const base = cur.current ?? start;
      const next = clampYear(cur.current === undefined ? base : base + dir * yearStepFor(ticks));
      cur.current = next;
      onChange(next);
      ticks++;
    };
    apply();
    stop();
    timer.current = window.setTimeout(() => {
      timer.current = window.setInterval(apply, 90);
    }, 380);
  };

  return (
    <div className="year">
      <span className="year-label">{label}</span>
      <div className="year-row">
        <button
          type="button"
          className="step"
          data-testid={`${id}-m`}
          aria-label={`${label} 한 해 줄이기`}
          disabled={disabled}
          onPointerDown={press(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && (e.preventDefault(), onChange(clampYear((value ?? start) - 1)))}
        >
          −
        </button>
        <input
          className="field year-input"
          data-testid={id}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={value === undefined ? '' : String(value)}
          placeholder="----"
          aria-label={label}
          disabled={disabled}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 4);
            onChange(d === '' ? undefined : Number(d));
          }}
        />
        <button
          type="button"
          className="step"
          data-testid={`${id}-p`}
          aria-label={`${label} 한 해 늘리기`}
          disabled={disabled}
          onPointerDown={press(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && (e.preventDefault(), onChange(clampYear((value ?? start) + 1)))}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function YearField({
  from,
  to,
  implied,
  onChange,
  disabled,
}: {
  from?: number;
  to?: number;
  implied?: { from?: number; to?: number };
  onChange(from: number | undefined, to: number | undefined): void;
  disabled?: boolean;
}) {
  const start = implied?.from ?? implied?.to ?? YEAR_START;
  return (
    <div className="yearfield" data-testid="yearfield">
      <Year
        id="year-from"
        label="시작"
        value={from}
        start={start}
        disabled={disabled}
        onChange={(v) => onChange(v, to === undefined && v !== undefined ? v : to)}
      />
      <span className="year-dash" aria-hidden="true">
        ~
      </span>
      <Year
        id="year-to"
        label="끝"
        value={to}
        start={implied?.to ?? start}
        disabled={disabled}
        onChange={(v) => onChange(from === undefined && v !== undefined ? v : from, v)}
      />
    </div>
  );
}
