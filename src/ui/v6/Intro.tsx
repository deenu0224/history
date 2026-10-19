/** 첫 화면: 제목 → 프롤로그(건너뛸 수 있다) → 콜드 오픈 두 줄 → 시작 기록. v5 부트의 모양(.boot)을 그대로 쓴다. UI_STYLE_GUIDE §2.1 */
import { useState } from 'react';
import { EPISODE_1 } from '@/data/script';
import { V6_SAVE_KEY } from '@/store/v6/store';
import { useV6 } from './store';

const COLD = ['22:31. 기록대조과. 야근.', '모니터에 배정 하나. 우선순위 낮음.'];

const hasSave = () => {
  try {
    return !!localStorage.getItem(V6_SAVE_KEY);
  } catch {
    return false;
  }
};

export function Intro() {
  const [step, setStep] = useState<'title' | 'prologue' | 'cold'>('title');
  const [n, setN] = useState(0);
  const [saved] = useState(hasSave);
  const st = useV6.getState();
  const lines = step === 'prologue' ? EPISODE_1.prologue.map((l) => l.text) : COLD;

  const begin = () => {
    st.markPrologueSeen();
    st.start();
  };
  const fresh = () => {
    st.reset();
    setStep('prologue');
    setN(0);
  };
  const cont = () => {
    if (!st.load() || !useV6.getState().s.started) fresh();
  };

  if (step === 'title')
    return (
      <div className="boot" data-screen="title">
        <div className="stage">
          <span className="rule" />
          <div className="title-mark">결록</div>
          <p className="t-m keep" style={{ marginTop: 28 }}>
            사라진 하루를, 그 자리에 있던 사람들의 눈으로 다시 적는다.
          </p>
        </div>
        <div className="foot">
          {saved ? (
            <>
              <button className="btn primary" data-testid="continue" onClick={cont}>
                이어하기
              </button>
              <button className="btn ghost" data-testid="new-game" onClick={fresh}>
                처음부터
              </button>
            </>
          ) : (
            <button className="btn primary breath" data-testid="start" onClick={fresh}>
              시작하기
            </button>
          )}
        </div>
      </div>
    );

  const last = n >= lines.length - 1;
  const next = () => {
    if (!last) return setN(n + 1);
    if (step === 'prologue') {
      setStep('cold');
      setN(0);
    } else begin();
  };
  const skip = () => {
    setStep('cold');
    setN(0);
  };
  return (
    <div className="boot" data-screen={step} onClick={next} role="button" tabIndex={-1} aria-label="다음">
      <div className="ticks" aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i} className={i <= n ? 'on' : ''} />
        ))}
      </div>
      <div className="stage">
        <span className="rule" />
        <p key={`${step}${n}`} className="line t-b keep" data-testid="boot-line" style={{ fontSize: 18 }}>
          {lines[n]}
        </p>
      </div>
      <div className="count t-m">
        {n + 1} / {lines.length}
      </div>
      <div className="foot" style={{ flexDirection: 'row', justifyContent: 'space-between' }} onClick={(e) => e.stopPropagation()}>
        {step === 'prologue' ? (
          <button className="btn ghost" style={{ width: 'auto', minWidth: 112 }} data-testid="skip" onClick={skip}>
            건너뛰기
          </button>
        ) : (
          <span />
        )}
        <button className="btn secondary" style={{ width: 'auto', minWidth: 124 }} data-testid="next" onClick={next}>
          다음 ▸
        </button>
      </div>
    </div>
  );
}
