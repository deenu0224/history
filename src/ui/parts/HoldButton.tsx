import { useRef, useState, type ReactNode } from 'react';

/**
 * 길게 누르기(1.2초) — 설정이 '두 번 탭' 이면 두 번 탭. 키보드(Enter/Space)는 바로 실행한다(접근성).
 * 놓으면 취소되고 손해는 없다.
 */
export function HoldButton({
  children,
  onDone,
  mode = 'hold',
  ms = 1200,
  disabled,
  testId,
  className = 'btn primary',
}: {
  children: ReactNode;
  onDone: () => void;
  mode?: 'hold' | 'double_tap';
  ms?: number;
  disabled?: boolean;
  testId?: string;
  className?: string;
}) {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTap = useRef(0);
  const fired = useRef(false);

  const cancel = () => {
    clearTimeout(timer.current);
    setOn(false);
  };
  const start = () => {
    if (disabled || mode !== 'hold') return;
    fired.current = false;
    setOn(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      setOn(false);
      onDone();
    }, ms);
  };

  return (
    <button
      className={`${className} hold${on ? ' on' : ''}`}
      data-testid={testId}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (disabled) return;
        if (e.detail === 0) return onDone(); // 키보드
        if (mode === 'double_tap') {
          const now = Date.now();
          if (now - lastTap.current < 450) {
            lastTap.current = 0;
            onDone();
          } else lastTap.current = now;
        }
      }}
    >
      <span className="fill" style={{ transitionDuration: `${ms}ms` }} />
      <span className="lbl">{children}</span>
    </button>
  );
}
