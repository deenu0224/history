import { useState } from 'react';
import { unlockAudio } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { continueGame, startNewGame } from '../glue';
import { useUi } from '../uiStore';

export function MainMenu() {
  const hasAuto = useUi((s) => s.hasAutosave);
  const open = useGameStore((s) => s.openModal);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');

  const onNew = () => {
    unlockAudio();
    if (hasAuto && !confirm) return setConfirm(true);
    void startNewGame();
  };
  const onContinue = async () => {
    const ok = await continueGame().catch(() => false);
    if (!ok) setErr('불러올 수 있는 기록이 없다.');
  };
  return (
    <main className="menu">
      <div className="menu-grain" />
      <div className="menu-inner">
        <p className="menu-kicker">역사 미스터리 추리 어드벤처</p>
        <h1 className="menu-title" aria-label="결록">
          <span className="ink" data-t="결">결</span>
          <span className="ink" data-t="록">록</span>
          <span className="hanja">缺錄</span>
        </h1>
        <p className="menu-sub">존재하지 않는 역사</p>
        <nav className="menu-list" aria-label="메인 메뉴">
          {confirm ? (
            <>
              <p className="menu-warn">이어서 할 수 있는 기록이 있다. 새로 시작하면 자동 저장이 덮어써진다.</p>
              <button className="btn btn-primary btn-big" onClick={() => void startNewGame()}>
                그래도 새로 시작
              </button>
              <button className="btn btn-big" onClick={() => setConfirm(false)}>
                돌아가기
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-big" onClick={onNew}>
                새로 시작
              </button>
              {hasAuto && (
                <button className="btn btn-big" onClick={onContinue}>
                  이어하기
                </button>
              )}
              <button className="btn btn-big" onClick={() => open('settings')}>
                설정
              </button>
            </>
          )}
          {err && <p className="menu-warn">{err}</p>}
        </nav>
        <p className="menu-foot">사료와 유물은 실제 기록에 기반합니다. 어디까지가 기록이고 어디부터가 허구인지, 직접 가려내세요.</p>
      </div>
    </main>
  );
}
