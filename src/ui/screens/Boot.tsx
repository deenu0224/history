/** 부트 → 프롤로그(승인된 8줄, 건너뛸 수 있다) → 콜드 오픈(두 줄) → 홈. UI_STYLE_GUIDE §2.1 */
import { useEffect, useState } from 'react';
import { peekSave } from '@/core/save';
import { EPISODE_1 } from '@/data/script';
import { useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

export function Boot() {
  const step = useUi((s) => s.boot);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let live = true;
    void peekSave('auto')
      .then((p) => live && setSaved(!!p))
      .catch(() => live && setSaved(false));
    return () => {
      live = false;
    };
  }, []);

  const finish = () => {
    const g = useGameStore.getState();
    g.markPrologueSeen();
    useUi.getState().setBoot('cold');
    setN(0);
  };
  const enter = () => {
    const g = useGameStore.getState();
    g.startEpisode();
    useUi.getState().enterGame();
  };

  const startNew = () => {
    const g = useGameStore.getState();
    if (g.started) g.reset();
    useUi.getState().setBoot('prologue');
    setN(0);
  };
  const cont = async () => {
    const g = useGameStore.getState();
    const r = await g.load('auto');
    if (r === 'loaded' && useGameStore.getState().started) {
      useGameStore.getState().resume();
      useUi.getState().enterGame();
    } else startNew();
  };

  if (step === 'title') {
    return (
      <div className="boot" data-screen="title">
        <div className="stage">
          <span className="rule" />
          <div className="title-mark">결록</div>
          <div className="title-sub">缺錄</div>
          <p className="t-m keep" style={{ marginTop: 28 }}>
            사라진 하루를, 그 자리에 있던 사람들의 눈으로 다시 적는다.
          </p>
        </div>
        <div className="foot">
          {saved ? (
            <>
              <button className="btn primary" data-testid="continue" onClick={() => void cont()}>
                이어하기
              </button>
              <button className="btn ghost" data-testid="new-game" onClick={startNew}>
                처음부터
              </button>
            </>
          ) : (
            <button className="btn primary breath" data-testid="start" onClick={startNew}>
              시작하기
            </button>
          )}
        </div>
      </div>
    );
  }

  const lines = step === 'prologue' ? EPISODE_1.prologue : EPISODE_1.coldOpen;
  const last = n >= lines.length - 1;
  const next = () => {
    if (!last) setN(n + 1);
    else if (step === 'prologue') finish();
    else enter();
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
          {lines[n]!.text}
        </p>
      </div>
      <div className="count t-m">
        {n + 1} / {lines.length}
      </div>
      <div className="foot" style={{ flexDirection: 'row', justifyContent: 'space-between' }} onClick={(e) => e.stopPropagation()}>
        {step === 'prologue' ? (
          <button className="btn ghost" style={{ width: 'auto', minWidth: 112 }} data-testid="skip" onClick={finish}>
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
