/**
 * 프롤로그: 설명 대신 소실을 보여준다.
 * page → 실록 한 쪽(흐린 글줄 사이에 또렷한 한 줄) / erase → 그 줄이 글자째 무작위로 사라짐 /
 * close → 아래 줄이 올라와 빈칸을 메움(페이지는 멀쩡해 보인다) / beats → 짧은 문장들.
 */
import { useEffect, useMemo, useState } from 'react';
import { EPISODE_1 } from '@/data/script';
import { playSfx } from '@/game/audio';
import { prefersReducedMotion, useTypewriter } from '../hooks';

type Phase = 'page' | 'erase' | 'close' | 'beats';

const FAINT_ABOVE = [0.82, 0.64, 0.9];
const FAINT_BELOW = [0.76, 0.88, 0.58, 0.7];

export function Prologue({ onDone }: { onDone: () => void }) {
  const { erased, beats } = EPISODE_1.prologue;
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState<Phase>('page');
  const [gone, setGone] = useState(0);
  const [beat, setBeat] = useState(0);

  const chars = useMemo(() => Array.from(erased.text), [erased.text]);
  // 사라지는 순서: 무작위지만 매번 같게(씨앗 고정)
  const order = useMemo(() => {
    const idx = chars.map((_, i) => i);
    let seed = 7;
    for (let i = idx.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const rank: number[] = [];
    idx.forEach((ci, r) => (rank[ci] = r));
    return rank;
  }, [chars]);

  useEffect(() => {
    if (phase === 'page') {
      const t = window.setTimeout(() => setPhase('erase'), reduced ? 1200 : 2600);
      return () => window.clearTimeout(t);
    }
    if (phase === 'erase') {
      if (gone >= chars.length) {
        const t = window.setTimeout(() => setPhase('close'), 500);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setGone((g) => g + 1), reduced ? 20 : 95);
      return () => window.clearTimeout(t);
    }
    if (phase === 'close') {
      const t = window.setTimeout(() => setPhase('beats'), reduced ? 400 : 1600);
      return () => window.clearTimeout(t);
    }
  }, [phase, gone, chars.length, reduced]);

  // 종이 넘기는 소리 하나. 사라질 때는 아무 소리도 내지 않는다(말소는 조용하다).
  useEffect(() => {
    playSfx('page');
  }, []);

  const line = phase === 'beats' ? beats[beat]?.text ?? '' : '';
  const tw = useTypewriter(line, 22);

  const next = () => {
    if (phase !== 'beats') return;
    if (!tw.done) return tw.finish();
    if (beat + 1 < beats.length) setBeat(beat + 1);
    else onDone();
  };

  useEffect(() => {
    if (phase !== 'beats' || !tw.done) return;
    const last = beat + 1 >= beats.length;
    const t = window.setTimeout(next, last ? 2200 : 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tw.done, beat]);

  return (
    <div className={`prologue prologue--${phase}`} data-testid="prologue" onPointerDown={next}>
      <div className="prologue-page" aria-hidden={phase === 'beats'}>
        {FAINT_ABOVE.map((w, i) => (
          <i key={`a${i}`} className="pg-faint" style={{ width: `${w * 100}%` }} />
        ))}
        <p className={`pg-line ${phase === 'close' || phase === 'beats' ? 'pg-line-closed' : ''}`} data-testid="prologue-erased">
          {chars.map((c, i) => (
            <span key={i} className={order[i] < gone ? 'pg-ch pg-ch-gone' : 'pg-ch'}>
              {c}
            </span>
          ))}
        </p>
        {FAINT_BELOW.map((w, i) => (
          <i key={`b${i}`} className="pg-faint" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
      {phase === 'beats' && (
        <p className="prologue-line" key={beat} data-testid="prologue-beat">
          {tw.shown}
          <i className="caret" />
        </p>
      )}
    </div>
  );
}
