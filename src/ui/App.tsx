import { useEffect, useMemo } from 'react';
import { bus } from '@/core/bus';
import { UI_KEYS, toDataURL } from '@/game/art';
import { unlockAudio } from '@/game/audio';
import { GameCanvas } from '@/game/GameCanvas';
import { enableAutosave, useGameStore } from '@/store/gameStore';
import { installGlue } from './glue';
import { isTyping, useKey, useLayout } from './hooks';
import { isPastScene } from './lib/scene';
import { ArchiveScreen } from './screens/Archive';
import { CodexScreen } from './screens/Codex';
import { DatabaseScreen } from './screens/Database';
import { DeductionScreen } from './screens/Deduction';
import { DialogPanel } from './screens/Dialog';
import { Hud, TabBar } from './screens/Hud';
import { MainMenu } from './screens/MainMenu';
import { NotebookScreen } from './screens/Notebook';
import { ReaderOverlay } from './screens/Reader';
import { SequenceScreen } from './screens/Sequence';
import { SettingsScreen } from './screens/Settings';
import { Toasts } from './screens/Toasts';
import { useUi } from './uiStore';

export function App() {
  const layout = useLayout();
  const phase = useUi((s) => s.phase);
  const sequence = useUi((s) => s.sequence);
  const overlay = useUi((s) => s.overlay);
  const dialog = useUi((s) => s.dialog);
  const modal = useGameStore((s) => s.ui.modal);
  const scene = useGameStore((s) => s.currentScene);
  const open = useGameStore((s) => s.openModal);
  const theme = phase === 'play' && isPastScene(scene) ? 'past' : 'modern';

  useEffect(() => installGlue(), []);

  // 첫 제스처에서 오디오 잠금 해제
  useEffect(() => {
    const on = () => unlockAudio();
    window.addEventListener('pointerdown', on, { once: true });
    window.addEventListener('keydown', on, { once: true });
    return () => {
      window.removeEventListener('pointerdown', on);
      window.removeEventListener('keydown', on);
    };
  }, []);

  // 플레이 중에만 자동 저장(메뉴에서 빈 상태가 기존 자동 저장을 덮어쓰지 않게)
  useEffect(() => {
    if (phase !== 'play') return;
    return enableAutosave(useGameStore);
  }, [phase]);

  // 패널/모달이 열려 있는 동안 월드를 멈춘다.
  const paused = phase !== 'play' || !!modal || !!dialog || !!overlay || !!sequence;
  useEffect(() => {
    useGameStore.getState().setPaused(paused);
    bus.emit('world:pause', { paused });
  }, [paused]);

  useKey(
    (e) => {
      if (isTyping(e) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (phase !== 'play' || modal || dialog || overlay || sequence) return;
      const k = e.key.toLowerCase();
      if (k === 'n') open('notebook');
      else if (k === 'c') open('collection');
      else if (k === 'r') open('deduction');
    },
    [phase, modal, dialog, overlay, sequence],
  );

  const panelUrl = useMemo(() => {
    const hanji = toDataURL(UI_KEYS.uiPanelHanji);
    const modern = toDataURL(UI_KEYS.uiPanelModern);
    return { hanji, modern };
  }, []);
  const style = {
    ['--panel-url' as string]: `url("${theme === 'past' ? panelUrl.hanji : panelUrl.modern}")`,
  } as React.CSSProperties;

  return (
    <div className="app" data-theme={theme} data-layout={layout} data-phase={phase} style={style}>
      <div className="game-layer">
        <GameCanvas />
      </div>
      <div className="ui-root">
        {phase === 'play' && <Hud layout={layout} />}
        <Toasts />
        {phase === 'play' && <DialogPanel />}
        {phase === 'play' && layout === 'portrait' && <TabBar />}
        {phase === 'menu' && <MainMenu />}
        {modal?.kind === 'notebook' && <NotebookScreen />}
        {modal?.kind === 'collection' && <CodexScreen />}
        {(modal?.kind === 'deduction' || modal?.kind === 'evidence') && <DeductionScreen key={modal.kind + (modal.id ?? '')} />}
        {modal?.kind === 'archive' && <ArchiveScreen />}
        {(modal?.kind === 'settings' || modal?.kind === 'save') && <SettingsScreen />}
        {overlay?.kind === 'database' && <DatabaseScreen />}
        {overlay?.kind === 'reader' && <ReaderOverlay entryId={overlay.entryId} />}
        <SequenceScreen />
      </div>
    </div>
  );
}
