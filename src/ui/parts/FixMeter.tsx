/**
 * 그날 고정률 NN% — 하루 전체의 얇은 막대 하나(줄마다·칸마다의 수치는 없다).
 * 값 = 고정된 필수 실록 문장 / 필수 문장(데이터에서 계산). 길게 눌러 역사 고정한 뒤에만 오르고, 오를 때 숫자가 차오른다.
 * 100% = 그날이 굳는 순간. UI_STYLE_GUIDE §2.9
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export function FixMeter({ pct, tone = 'dark', testId = 'fix-rate' }: { pct: number; tone?: 'dark' | 'paper'; testId?: string }) {
  const reduce = useGameStore((s) => s.settings.reduceMotion);
  const [shown, setShown] = useState(pct);
  const from = useRef(pct);
  useEffect(() => {
    const a = from.current;
    from.current = pct;
    if (reduce || a === pct) {
      setShown(pct);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 1100;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      setShown(Math.round(a + (pct - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pct, reduce]);
  return (
    <div className={`fixmeter ${tone}${pct >= 100 ? ' full' : ''}`} data-testid={testId} data-pct={pct} {...(shown !== pct ? { 'data-float-wait': '' } : {})} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="그날 고정률">
      <div className="fm-row">
        <span className="t-m">그날 고정률</span>
        <span className="fm-pct" data-testid={`${testId}-pct`}>
          {shown}%
        </span>
      </div>
      <div className="fm-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
