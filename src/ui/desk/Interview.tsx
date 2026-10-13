/** 관측 권한 정지 면담(경고 3장): 오 실장의 말 → 경고장 다시 읽기 → 답 고르기 → 맺음 → 자리로. 게임 오버 아님. */
import { useEffect, useState } from 'react';
import { selectInterview, useGameStore } from '@/store/gameStore';
import { fx } from '../lib/fx';

export function Interview({ hidden }: { hidden?: boolean }) {
  const st = useGameStore();
  const iv = selectInterview(st);
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<'talk' | 'choose' | 'close'>('talk');
  const active = !!iv?.active;

  useEffect(() => {
    if (active) {
      setN(0);
      setPhase('talk');
    }
  }, [active]);

  if (hidden || !iv || (!active && phase !== 'close')) return null;
  const lines = iv.lines;
  const pre = lines.slice(0, Math.min(n + 1, lines.length));
  const recapAt = Math.min(iv.recapAfter, lines.length);
  const allShown = n + 1 >= lines.length;

  return (
    <div className="iv-back" data-testid="interview">
      <section className="iv" role="dialog" aria-label="면담">
        <header>
          <small>관측 권한 정지</small>
          <h2>기록대조과 실장 면담</h2>
        </header>
        <div className="iv-log" aria-live="polite">
          {phase !== 'close' &&
            pre.map((l, i) => (
              <div key={i}>
                <p className={`iv-line ${l.from === '오 실장' ? 'chief' : 'sys'}`} data-testid={`iv-line-${i}`}>
                  <b>{l.from}</b> {l.text}
                </p>
                {i === recapAt - 1 && iv.recap.length > 0 && (
                  <ul className="iv-recap" data-testid="iv-recap">
                    {iv.recap.map((w) => (
                      <li key={w.id}>{w.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          {phase === 'close' &&
            iv.closing.map((l, i) => (
              <p key={i} className="iv-line chief" data-testid={`iv-close-${i}`}>
                <b>{l.from}</b> {l.text}
              </p>
            ))}
        </div>
        {phase === 'talk' && (
          <button
            type="button"
            className="btn btn-primary btn-big"
            data-testid="iv-next"
            onClick={() => {
              fx('tap');
              if (allShown) setPhase('choose');
              else setN(n + 1);
            }}
          >
            {allShown ? '…' : '다음'}
          </button>
        )}
        {phase === 'choose' && (
          <div className="iv-choices" data-testid="iv-choices">
            {iv.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                className="btn btn-big"
                data-testid={`iv-choice-${c.id}`}
                onClick={() => {
                  fx('tap');
                  useGameStore.getState().finishInterview(c.id);
                  setPhase('close');
                }}
              >
                {c.text}
              </button>
            ))}
          </div>
        )}
        {phase === 'close' && (
          <button type="button" className="btn btn-primary btn-big" data-testid="iv-done" onClick={() => (fx('page'), setPhase('talk'), setN(0))}>
            자리로 돌아간다
          </button>
        )}
      </section>
    </div>
  );
}
