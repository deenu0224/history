import { useEffect, useState } from 'react';
import { scrambleAt } from '@/ui/lib/text';

/** from 이 to 로 왼쪽부터 굳으며 다시 쓰인다(현실 재기록 연출). reduce 이면 즉시. */
export function Scramble({ from, to, ms = 1600, delay = 0, reduce = false, onDone }: { from: string; to: string; ms?: number; delay?: number; reduce?: boolean; onDone?: () => void }) {
  const [t, setT] = useState(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      setT(1);
      onDone?.();
      return;
    }
    let raf = 0;
    let start = 0;
    const tm = setTimeout(() => {
      const step = (now: number) => {
        if (!start) start = now;
        const p = Math.min(1, (now - start) / ms);
        setT(p);
        if (p < 1) raf = requestAnimationFrame(step);
        else onDone?.();
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(tm);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, ms, delay, reduce]);
  return <span data-final={t >= 1 ? 'true' : 'false'}>{scrambleAt(from, to, t)}</span>;
}
