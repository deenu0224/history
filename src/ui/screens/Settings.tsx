/** 설정 — 편하게. 소리·음악·진동·힌트·글자 크기·움직임·길게 누르기 대신 두 번 탭·「이 장면에 대해」·저장 지우기(두 번 확인). UI_STYLE_GUIDE §2.11 */
import { useState } from 'react';
import type { HintLevel } from '@/core/hints';
import { deleteSave } from '@/core/save';
import { useGameStore, type Settings as S } from '@/store/gameStore';
import { selectAboutScene } from '@/store/selectors';
import { useEpisode } from '@/store/hooks';
import { NavBar } from '../parts/NavBar';
import { useUi } from '../uiStore';

function Switch({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} data-testid={testId} onClick={() => onChange(!on)} />;
}
function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, t]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const s = useGameStore((x) => x.settings);
  const restored = useGameStore((x) => x.restored);
  const episode = useEpisode();
  const set = (p: Partial<S>) => useGameStore.getState().setSettings(p);
  const [about, setAbout] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const wipe = async () => {
    useGameStore.getState().reset();
    try {
      await deleteSave('auto');
      await deleteSave('manual');
    } catch {
      /* 무시 */
    }
    useUi.setState({ phase: 'boot', boot: 'title', stack: ['home'], card: null, logOpen: false, docId: null });
  };

  return (
    <div className="scr" data-screen="settings">
      <div className="bar slim">
        <div className="title t-h">설정</div>
      </div>
      <div className="body">
        <div className="set-row">
          <span className="lab">소리 크기</span>
          <input type="range" min={0} max={1} step={0.1} value={s.volume} aria-label="소리 크기" onChange={(e) => set({ volume: Number(e.target.value) })} />
        </div>
        <div className="set-row">
          <span className="lab">음악</span>
          <Switch on={s.music} onChange={(v) => set({ music: v })} label="음악" testId="sw-music" />
        </div>
        <div className="set-row">
          <span className="lab">진동</span>
          <Switch on={s.haptics} onChange={(v) => set({ haptics: v })} label="진동" testId="sw-haptics" />
        </div>
        <div className="set-row">
          <span className="lab">힌트</span>
          <Seg<HintLevel> value={s.hintLevel} label="힌트" options={[['off', '끔'], ['normal', '보통'], ['detailed', '자세히']]} onChange={(v) => set({ hintLevel: v })} />
        </div>
        <div className="set-row">
          <span className="lab">글자 크기</span>
          <Seg value={s.textSize} label="글자 크기" options={[['normal', '기본'], ['large', '크게']]} onChange={(v) => set({ textSize: v })} />
        </div>
        <div className="set-row">
          <span className="lab">움직임 줄이기</span>
          <Switch on={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} label="움직임 줄이기" testId="sw-motion" />
        </div>
        <div className="set-row">
          <span className="lab">메시지 빠르게</span>
          <Switch on={s.fastMessages} onChange={(v) => set({ fastMessages: v })} label="메시지 빠르게" testId="sw-fast" />
        </div>
        <div className="set-row">
          <span className="lab">기록을 남길 때</span>
          <Seg value={s.holdMode} label="기록을 남길 때" options={[['hold', '길게 누르기'], ['double_tap', '두 번 탭']]} onChange={(v) => set({ holdMode: v })} />
        </div>
        {restored ? (
          <div className="set-row">
            <span className="lab">출처 표시</span>
            <Switch on={s.showProvenance} onChange={(v) => set({ showProvenance: v })} label="출처 표시" />
          </div>
        ) : null}
        <button className="set-row" style={{ width: '100%' }} onClick={() => setAbout(!about)} aria-expanded={about} data-testid="about-scene">
          <span className="lab">이 장면에 대해</span>
          <span className="t-m">{about ? '접기' : '보기'}</span>
        </button>
        {about ? (
          <p className="t-b keep read" style={{ margin: '8px 0 12px' }} data-testid="about-text">
            {selectAboutScene(episode)}
          </p>
        ) : null}
        <div style={{ marginTop: 18 }}>
          {confirm ? (
            <div className="row">
              <button className="btn secondary" onClick={() => setConfirm(false)}>
                그만두기
              </button>
              <button className="btn primary" style={{ borderColor: 'var(--alert)', color: 'var(--alert)' }} onClick={() => void wipe()} data-testid="wipe-confirm">
                정말 지운다
              </button>
            </div>
          ) : (
            <button className="btn secondary" onClick={() => setConfirm(true)} data-testid="wipe">
              저장 지우기
            </button>
          )}
          {confirm ? (
            <p className="t-m" style={{ marginTop: 8 }}>
              진행이 모두 지워진다. 설정은 남는다.
            </p>
          ) : null}
        </div>
      </div>
      <NavBar backTestId="settings-back" />
    </div>
  );
}
