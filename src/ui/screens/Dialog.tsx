import { useEffect, useRef, useState } from 'react';
import { playSfx } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { confirmObserve } from '../glue';
import { isTyping, useKey, useTypewriter } from '../hooks';
import { useUi, type DialogLine } from '../uiStore';
import type { Provenance } from '@/core/types';

const PROV_LABEL: Record<Provenance, string> = { verified: '사료', reconstructed: '재구성', fictional: '가상' };

export function DialogPanel() {
  const dialog = useUi((s) => s.dialog);
  if (!dialog) return null;
  return dialog.type === 'lines' ? <LinesDialog key={dialog.key} /> : <ObserveDialog key={dialog.key} />;
}

function LinesDialog() {
  const dialog = useUi((s) => s.dialog);
  const setDialog = useUi((s) => s.setDialog);
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const [idx, setIdx] = useState(0);
  const born = useRef(performance.now());
  const lines: DialogLine[] = dialog?.type === 'lines' ? dialog.lines : [];
  const line = lines[idx];
  const tw = useTypewriter(line?.text ?? '');

  const close = () => {
    const d = useUi.getState().dialog;
    setDialog(null);
    if (d?.type === 'lines') d.onDone?.();
    playSfx('close');
  };
  const advance = () => {
    if (performance.now() - born.current < 220) return;
    if (!tw.done) return tw.finish();
    if (idx + 1 >= lines.length) return close();
    playSfx('page');
    setIdx(idx + 1);
  };

  useKey((e) => {
    if (isTyping(e) || e.repeat) return;
    if (e.key === 'Escape') return close();
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      advance();
    }
  });

  if (!line) return null;
  const speaker = line.speaker ?? (dialog?.type === 'lines' ? dialog.title : undefined);
  const last = idx + 1 >= lines.length;
  return (
    <div className="dialog panel" role="dialog" aria-live="polite" onPointerDown={advance}>
      {speaker && <div className="dialog-name">{speaker}</div>}
      <p className="dialog-text">
        {tw.shown}
        <span className="dialog-ghost">{line.text.slice(tw.shown.length)}</span>
      </p>
      <div className="dialog-foot">
        {showProv && line.provenance && line.provenance !== 'verified' && <span className="prov-mark">{PROV_LABEL[line.provenance]}</span>}
        <span className="dialog-count">
          {idx + 1}/{lines.length}
        </span>
        <span className="dialog-next" aria-hidden>
          {tw.done ? (last ? '■' : '▼') : '…'}
        </span>
      </div>
    </div>
  );
}

function ObserveDialog() {
  const dialog = useUi((s) => s.dialog);
  const setDialog = useUi((s) => s.setDialog);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, []);
  const cancel = () => {
    setDialog(null);
    playSfx('close');
  };
  useKey((e) => {
    if (e.key === 'Escape') cancel();
  });
  if (!dialog || dialog.type !== 'observe') return null;
  return (
    <div className="dialog dialog-confirm panel" role="alertdialog" aria-label={dialog.label}>
      <div className="dialog-name">{dialog.label}</div>
      <p className="dialog-text">{dialog.lines.join(' ')}</p>
      <p className="dialog-sub">{dialog.toPast ? '관측을 시작하면 이 장소를 떠난다. 도착한 시대는 알 수 없다.' : '관측을 마치고 연구실로 돌아간다. 기록은 노트에 남는다.'}</p>
      <div className="dialog-actions">
        <button className="btn btn-primary" disabled={!ready} onClick={confirmObserve}>
          {dialog.toPast ? '관측을 시작한다' : '귀환한다'}
        </button>
        <button className="btn" onClick={cancel}>
          아직 아니다
        </button>
      </div>
    </div>
  );
}
