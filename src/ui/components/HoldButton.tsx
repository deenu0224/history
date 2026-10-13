/**
 * 길게 눌러 찍는 도장 버튼. 누르는 동안 먹이 누른 자리에서 번지고, 시간이 차면 한 번 완료된다.
 * 중간에 떼면 먹이 물러난다(손해 없음). 키보드는 Enter/Space 를 눌러 유지, 보조기기의 클릭은 바로 완료.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { fx } from '../lib/fx';

export function HoldButton({
  ms = 600,
  onComplete,
  children,
  className = '',
  testId,
  disabled,
  label,
  tone = 'ink',
  glow,
}: {
  ms?: number;
  onComplete(): void;
  children: ReactNode;
  className?: string;
  testId?: string;
  disabled?: boolean;
  label?: string;
  tone?: 'ink' | 'red' | 'teal';
  /** 권장 버튼이 은은히 빛난다 */
  glow?: boolean;
}) {
  const [p, setP] = useState(0);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const raf = useRef(0);
  const start = useRef(0);
  const holding = useRef(false);
  const done = useRef(false);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  const stop = (reset: boolean) => {
    holding.current = false;
    cancelAnimationFrame(raf.current);
    if (reset) setP(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    if (!holding.current) return;
    const k = Math.min(1, (performance.now() - start.current) / ms);
    setP(k);
    if (k >= 1) {
      holding.current = false;
      done.current = true;
      cb.current();
      // 완료 뒤 잠깐 가득 찬 채로 있다가 풀린다
      window.setTimeout(() => {
        done.current = false;
        setP(0);
      }, 260);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = (x?: number, y?: number) => {
    if (disabled || holding.current || done.current) return;
    if (x !== undefined && y !== undefined) setOrigin({ x, y });
    holding.current = true;
    start.current = performance.now();
    fx('tap');
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  };

  const style = { '--p': p, '--ox': `${origin.x}%`, '--oy': `${origin.y}%` } as CSSProperties;
  return (
    <button
      type="button"
      className={`hold hold-${tone} ${glow ? 'hold-glow' : ''} ${p > 0 ? 'holding' : ''} ${className}`}
      style={style}
      data-testid={testId}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== undefined && e.button > 0) return;
        const r = e.currentTarget.getBoundingClientRect();
        begin(((e.clientX - r.left) / Math.max(1, r.width)) * 100, ((e.clientY - r.top) / Math.max(1, r.height)) * 100);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 합성 이벤트 */
        }
      }}
      onPointerUp={() => stop(!done.current)}
      onPointerCancel={() => stop(true)}
      onPointerLeave={() => !done.current && stop(true)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          begin(50, 50);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') stop(!done.current);
      }}
      onBlur={() => stop(!done.current)}
      onClick={(e) => {
        if (e.detail === 0 && !holding.current && !done.current && !disabled) cb.current();
      }}
    >
      <span className="hold-ink" aria-hidden="true" data-testid="stamp-hold" data-progress={p.toFixed(2)} />
      <span className="hold-label">{children}</span>
    </button>
  );
}
