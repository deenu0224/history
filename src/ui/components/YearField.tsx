import { useEffect, useRef, useState } from 'react';
import { clampYear, parseYearInput, stepYear } from '../lib/timeline';

/** 큰 ± 스텝퍼 + 직접 입력. 누르고 있으면 반복하다가 점점 빨라진다. */
export function YearField({ label, value, onChange, id }: { label: string; value: number; onChange(v: number): void; id: string }) {
  const [text, setText] = useState(String(value));
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => setText(String(value)), [value]);
  const hold = useRef<{ t?: number; i?: number; n: number }>({ n: 0 });
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
    hold.current.n = 0;
    bump(d);
    hold.current.t = window.setTimeout(
      () =>
        (hold.current.i = window.setInterval(() => {
          hold.current.n++;
          bump(hold.current.n > 14 ? d * 10 : d);
        }, 80)),
      380,
    );
  };
  const commit = () => {
    const n = parseYearInput(text);
    if (n === null) setText(String(value));
    else onChange(clampYear(n));
  };
  const btn = (d: number, caption: string, cls: string, tid: string) => (
    <button
      type="button"
      className={`step ${cls}`}
      data-testid={`${id}-${tid}`}
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
        {btn(-10, '−10', 'step-sm', 'm10')}
        {btn(-1, '−', 'step-lg', 'm1')}
        <div className="yfield-input">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            data-testid={`${id}-input`}
            value={text}
            aria-label={`${label} 연도`}
            onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), commit())}
          />
          <span>년</span>
        </div>
        {btn(1, '+', 'step-lg', 'p1')}
        {btn(10, '+10', 'step-sm', 'p10')}
      </div>
    </div>
  );
}
