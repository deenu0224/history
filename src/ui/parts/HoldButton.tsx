import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 길게 누르기(1.2초) — 설정이 '두 번 탭' 이면 두 번 탭. 키보드(Enter/Space)는 바로 실행한다(접근성).
 * 놓으면 취소되고 손해는 없다. 다 차기 전에 떼면(짧은 탭) 「길게 누르세요」가 한 번 숨쉰다 — 아무 반응 없이 끝나지 않게.
 * 채움이 어디까지 갔었는지는 잠깐 남는다(.hold.part).
 */
export function HoldButton({
  children,
  onDone,
  mode = 'hold',
  ms = 1200,
  disabled,
  testId,
  className = 'btn primary',
  onShortTap,
}: {
  children: ReactNode;
  onDone: () => void;
  mode?: 'hold' | 'double_tap';
  ms?: number;
  disabled?: boolean;
  testId?: string;
  className?: string;
  /** 짧게 눌렀다(손해 없음) — 화면이 빈칸을 한 번 깜빡이는 등 */
  onShortTap?: () => void;
}) {
  const [on, setOn] = useState(false);
  const [hint, setHint] = useState<{ key: number; pct: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startedAt = useRef(0);
  const lastTap = useRef(0);
  const fired = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    clearTimeout(timer.current);
    clearTimeout(hintTimer.current);
  }, []);

  const showHint = (pct: number) => {
    clearTimeout(hintTimer.current);
    setHint({ key: Date.now(), pct });
    hintTimer.current = setTimeout(() => setHint(null), 1600);
    onShortTap?.();
  };
  /** 손을 뗐다: 다 차기 전이면 짧은 탭 안내 */
  const release = () => {
    if (!startedAt.current) return;
    const held = Date.now() - startedAt.current;
    startedAt.current = 0;
    clearTimeout(timer.current);
    setOn(false);
    if (!fired.current) showHint(Math.min(1, held / ms));
  };
  const cancel = () => {
    startedAt.current = 0;
    clearTimeout(timer.current);
    setOn(false);
  };
  const start = () => {
    if (disabled || mode !== 'hold') return;
    fired.current = false;
    startedAt.current = Date.now();
    setHint(null);
    setOn(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      startedAt.current = 0;
      setOn(false);
      onDone();
    }, ms);
  };

  return (
    <button
      className={`${className} hold${on ? ' on' : ''}${hint ? ' hinted' : ''}`}
      data-testid={testId}
      data-hint={hint ? 'true' : undefined}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={release}
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
            setHint(null);
            onDone();
          } else {
            lastTap.current = now;
            showHint(0.5);
          }
        }
      }}
    >
      <span className="fill" style={on ? { transitionDuration: `${ms}ms` } : hint ? { width: `${Math.round(hint.pct * 100)}%`, transition: 'none' } : undefined} />
      <span className="lbl" key={hint?.key ?? 0}>
        {hint ? (mode === 'hold' ? '길게 누르세요' : '한 번 더 누르세요') : children}
      </span>
    </button>
  );
}

/**
 * 길게 누르기가 끝난 자리에 새로 생기는 버튼(「기록이 돌아왔다 ›」). 그 홀드를 끝낸 손가락의 pointerup/click 이
 * 새 버튼에 떨어져 눌리지 않게, **이 버튼에서 시작한 pointerdown** 뒤의 클릭만 받는다(키보드 클릭은 받는다).
 * 생긴 직후 400ms 도 무시한다(합성 마우스 이벤트가 늦게 오는 기기).
 */
export function FreshButton({ onClick, children, className, testId, guardMs = 400 }: { onClick: () => void; children: ReactNode; className?: string; testId?: string; guardMs?: number }) {
  const born = useRef(Date.now());
  const armed = useRef(false);
  return (
    <button
      className={className}
      data-testid={testId}
      onPointerDown={() => {
        if (Date.now() - born.current >= guardMs) armed.current = true;
      }}
      onClick={(e) => {
        if (e.detail === 0) return onClick(); // 키보드
        if (!armed.current) return;
        armed.current = false;
        onClick();
      }}
    >
      {children}
    </button>
  );
}
