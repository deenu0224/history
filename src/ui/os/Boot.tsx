/** 부팅: 새로 시작하면 세계관 프롤로그(건너뛰기 가능) → 야근하는 사무실의 밤 두 줄 → 데스크톱. 이어하기가 있으면 먼저 묻는다. */
import { useEffect, useRef, useState } from 'react';
import { peekSave } from '@/core/save';
import { EPISODE_1 } from '@/data/script';
import { unlockAudio } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { useTypewriter } from '../hooks';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { Prologue } from './Prologue';

type Step = 'checking' | 'prologue' | 'cold' | 'login' | 'entering';

export function Boot() {
  const setPhase = useUi((s) => s.setPhase);
  const [step, setStep] = useState<Step>('checking');
  const [line, setLine] = useState(0);
  const [confirmNew, setConfirmNew] = useState(false);
  const busy = useRef(false);
  const hasSave = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let saved = false;
      try {
        saved = !!(await peekSave('auto'));
      } catch {
        saved = false;
      }
      if (!alive) return;
      hasSave.current = saved;
      setStep(saved ? 'login' : 'prologue');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const paging = step === 'cold';
  const lines = EPISODE_1.coldOpen;
  const cur = lines[line]?.text ?? '';
  const tw = useTypewriter(paging ? cur : '', 16);

  const toCold = () => {
    setLine(0);
    setStep('cold');
  };

  const enter = async (mode: 'continue' | 'new') => {
    if (busy.current) return;
    busy.current = true;
    unlockAudio();
    setStep('entering');
    try {
      if (mode === 'continue') {
        const ok = await useGameStore.getState().load('auto');
        if (!ok) useGameStore.getState().reset();
      } else useGameStore.getState().reset();
    } catch {
      useGameStore.getState().reset();
    }
    window.setTimeout(() => setPhase('os'), 700);
  };

  const advance = () => {
    unlockAudio();
    if (!paging) return;
    if (!tw.done) return tw.finish();
    fx('tap');
    if (line + 1 < lines.length) setLine(line + 1);
    else void enter('new');
  };

  const skip = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    unlockAudio();
    toCold();
  };

  // 줄이 다 써지면 잠시 뒤 스스로 넘어간다(짧게)
  useEffect(() => {
    if (!paging || !tw.done) return;
    const t = window.setTimeout(advance, line + 1 < lines.length ? 1700 : 2100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tw.done, line]);

  return (
    <div className="boot" data-step={step} data-testid="boot" onPointerDown={paging ? advance : undefined}>
      <div className="boot-room" aria-hidden="true">
        <div className="boot-window">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i * 137) % 900}ms`, opacity: 0.25 + ((i * 53) % 10) / 22 }} />
          ))}
        </div>
        <div className="boot-glow" />
      </div>
      {step === 'prologue' && <Prologue onDone={toCold} />}
      {step === 'prologue' && (
        <button type="button" className="btn btn-ghost prologue-skip" data-testid="boot-skip" onPointerDown={skip}>
          건너뛰기
        </button>
      )}
      {step === 'cold' && (
        <p className="cold-line" key={line} data-testid="cold-open">
          {tw.shown}
          <i className="caret" />
        </p>
      )}
      {(step === 'login' || step === 'entering') && (
        <div className={`login ${step === 'entering' ? 'login-out' : ''}`}>
          <p className="login-kicker">결록 단말</p>
          <p className="login-name">대조관 07</p>
          <div className="login-actions">
            <button type="button" className="btn btn-primary btn-big" data-testid="boot-continue" onClick={() => enter('continue')}>
              이어서 로그인
            </button>
            {confirmNew ? (
              <button
                type="button"
                className="btn"
                data-testid="boot-new-confirm"
                onClick={() => {
                  setLine(0);
                  setStep('prologue');
                }}
              >
                정말 처음부터 시작
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" data-testid="boot-new" onClick={() => setConfirmNew(true)}>
                새로 시작
              </button>
            )}
          </div>
        </div>
      )}
      {paging && <span className="cold-hint">탭하여 넘기기</span>}
    </div>
  );
}
