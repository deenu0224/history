/**
 * 다시 쓰이는 글: from → to 로 글자가 흔들리다 굳는다(복원은 따뜻하게). 줄여 달라면 바로 바뀐다.
 * label 을 주면 여러 줄('라벨: 값') 기록에서 그 라벨 줄만 바뀐다.
 */
import { useEffect, useState } from 'react';
import { fastMode, prefersReducedMotion } from '../hooks';
import { changedLines, scrambleAt } from '../lib/text';
import { useUi, type RewritePlay } from '../uiStore';
import { RichText } from './RichText';

const fromOf = (play: RewritePlay | undefined, label?: string): string | undefined => {
  if (!play) return undefined;
  if (!label) return play.before;
  const c = changedLines(play.before, play.after).find((x) => x.label === label);
  return c ? c.from.replace(/^[^:]*:\s*/, '') : undefined;
};

export function Scramble({ text, playKey, label, ms = 1500, rich, hold = 0 }: { text: string; playKey: string; label?: string; ms?: number; rich?: boolean; hold?: number }) {
  const play = useUi((s) => s.rewritePlay[playKey]);
  const done = useUi((s) => s.doneRewrite);
  const [shown, setShown] = useState<string | null>(null);
  const from = fromOf(play, label);

  useEffect(() => {
    if (!play || from === undefined) {
      setShown(null);
      return;
    }
    if (prefersReducedMotion() || fastMode()) {
      done(playKey);
      setShown(null);
      return;
    }
    let raf = 0;
    let wait = 0;
    const t0 = performance.now() + hold;
    if (hold > 0) setShown(from);
    const tick = (now: number) => {
      if (now < t0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - t0) / ms);
      if (t >= 1) {
        setShown(null);
        done(playKey);
        return;
      }
      setShown(scrambleAt(from, text, t));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(wait);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, from, playKey, text, ms]);

  if (shown === null) return rich ? <RichText text={text} /> : <>{text}</>;
  return <span className={`scramble scramble-${play?.tone ?? 'restore'}`}>{shown}</span>;
}
