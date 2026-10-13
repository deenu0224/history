/** 콜드 오픈(B0)과 로그인. 새 기록이면 두 줄을 탭으로 넘기고, 이어하기가 있으면 바로 로그인 화면. */
import { useEffect, useRef, useState } from 'react';
import { peekSave } from '@/core/save';
import { EPISODE_1 } from '@/data/script';
import { unlockAudio } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { useTypewriter } from '../hooks';
import { useUi } from '../uiStore';

type Step = 'checking' | 'cold' | 'login' | 'entering';

export function Boot({ hasSaveHint }: { hasSaveHint?: boolean }) {
  const setPhase = useUi((s) => s.setPhase);
  const [step, setStep] = useState<Step>('checking');
  const [hasSave, setHasSave] = useState(!!hasSaveHint);
  const [line, setLine] = useState(0);
  const [confirmNew, setConfirmNew] = useState(false);
  const busy = useRef(false);

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
      setHasSave(saved);
      setStep(saved ? 'login' : 'cold');
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lines = EPISODE_1.coldOpen;
  const cur = lines[line]?.text ?? '';
  const tw = useTypewriter(step === 'cold' ? cur : '', 1.4);

  const advance = () => {
    unlockAudio();
    if (step !== 'cold') return;
    if (!tw.done) return tw.finish();
    fx('tap');
    if (line + 1 < lines.length) setLine(line + 1);
    else setStep('login');
  };

  const enter = async (mode: 'continue' | 'new') => {
    if (busy.current) return;
    busy.current = true;
    unlockAudio();
    fx('tap');
    setStep('entering');
    try {
      if (mode === 'continue') {
        const ok = await useGameStore.getState().load('auto');
        if (!ok) useGameStore.getState().reset();
      } else {
        useGameStore.getState().reset();
      }
    } catch {
      useGameStore.getState().reset();
    }
    window.setTimeout(() => setPhase('os'), 650);
  };

  return (
    <div className="boot" data-step={step} onPointerDown={step === 'cold' ? advance : undefined} data-testid="boot">
      {step === 'cold' && (
        <button className="cold" data-testid="cold-open" onClick={advance} aria-label="다음">
          <div className="cold-note" aria-label="손으로 적은 메모">
            <p className="hand cold-hand">
              무오<span className="smudge" aria-label="번져서 읽을 수 없는 글자">
                <i />
              </span>
              화 — 계속 조사
            </p>
            <span className="cold-pencil" aria-hidden="true" />
          </div>
          <p className="cold-line" key={line}>
            {tw.shown}
            <i className="caret" />
          </p>
          <span className="cold-hint">{tw.done ? '탭하여 계속' : ''}</span>
        </button>
      )}
      {(step === 'login' || step === 'entering') && (
        <div className={`login ${step === 'entering' ? 'login-out' : ''}`}>
          <div className="login-card">
            <p className="login-kicker">결록 단말</p>
            <Px k="avatar_player" scale={3} className="login-avatar" />
            <p className="login-name">연구원</p>
            <div className="login-field" aria-hidden="true">
              <span>••••••••</span>
            </div>
            {hasSave ? (
              <div className="login-actions">
                <button className="btn btn-primary btn-big" data-testid="boot-continue" onClick={() => enter('continue')}>
                  이어서 로그인
                </button>
                {confirmNew ? (
                  <button className="btn" data-testid="boot-new-confirm" onClick={() => enter('new')}>
                    정말 처음부터 시작
                  </button>
                ) : (
                  <button className="btn btn-ghost" data-testid="boot-new" onClick={() => setConfirmNew(true)}>
                    새 기록으로 시작
                  </button>
                )}
              </div>
            ) : (
              <div className="login-actions">
                <button className="btn btn-primary btn-big" data-testid="boot-login" onClick={() => enter('new')}>
                  로그인
                </button>
              </div>
            )}
            <p className="login-foot">통합 역사 DB 동기화 대기 중</p>
          </div>
        </div>
      )}
    </div>
  );
}
