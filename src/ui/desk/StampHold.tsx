/** 도장: 손에 쥐는 도장 스프라이트(대기/눌림). 누르고 있으면(≈500ms) 내려와 찍힌다. 중간에 떼면 올라간다. */
import { useState, type CSSProperties } from 'react';
import { useHold } from '../components/useHold';
import { Px } from '../lib/art';

export type StampTone = 'ok' | 'fix' | 'mismatch' | 'system';
const HOLD: Record<StampTone, string> = { ok: 'stamp_hold_ok', fix: 'stamp_hold_fix', mismatch: 'stamp_hold_mismatch', system: 'stamp_hold_system' };

export function StampHold({
  tone,
  label,
  sub,
  testId,
  ms = 500,
  disabled,
  dim,
  glow,
  small,
  onComplete,
  className = '',
}: {
  tone: StampTone;
  label: string;
  sub?: string;
  testId: string;
  ms?: number;
  disabled?: boolean;
  /** 지금은 이 건에 쓰지 않는 도장(눌러도 안내만 나온다) */
  dim?: boolean;
  glow?: boolean;
  small?: boolean;
  onComplete(): void;
  className?: string;
}) {
  const [wob, setWob] = useState(0);
  const hold = useHold(ms, onComplete, { disabled, onShort: () => setWob((n) => n + 1) });
  const down = hold.p > 0.02;
  const style = { '--p': hold.p } as CSSProperties;
  return (
    <button
      type="button"
      className={`stamp stamp-${tone} ${small ? 'stamp-sm' : ''} ${dim ? 'dim' : ''} ${glow ? 'glow' : ''} ${down ? 'down' : ''} ${hold.p >= 1 ? 'hit' : ''} ${className}`}
      style={style}
      disabled={disabled}
      data-testid={testId}
      aria-label={`${label} 도장 — 길게 눌러 찍는다`}
      data-progress={hold.p.toFixed(2)}
      {...hold.handlers}
    >
      <span key={wob} className={`stamp-body ${wob ? 'wobble' : ''}`}>
        <Px k={HOLD[tone]} frame={down ? 1 : 0} scale={small ? 1 : 2} className="stamp-art" />
      </span>
      <span className="stamp-bar" aria-hidden="true">
        <i />
      </span>
      <span className="stamp-label">
        {label}
        {sub && <small>{sub}</small>}
      </span>
    </button>
  );
}
