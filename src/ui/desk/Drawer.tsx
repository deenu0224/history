/**
 * 서랍(책상 아래): 규정 외의 세 번째 도장 — 불일치(빨강). 처음 열면 도장 면의 마른 붉은 잉크가 클로즈업된다.
 * 서랍을 열어도 도장은 길게 눌러야 찍힌다. 어떤 건에서든 찍을 수 있다(경고는 데이터가 정한다).
 */
import { useEffect, useState } from 'react';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { StampHold } from './StampHold';

export function DrawerButton({ open, disabled }: { open(): void; disabled?: boolean }) {
  return (
    <button type="button" className="drawer-btn" data-testid="drawer" aria-label="서랍" disabled={disabled} onClick={() => (fx('page'), open())}>
      <Px k="desk_drawer_closed" scale={1} className="drawer-art" />
      <span className="drawer-label">서랍</span>
    </button>
  );
}

export function DrawerView({ onClose, onStamp, canStamp }: { onClose(): void; onStamp(): void; canStamp: boolean }) {
  const seen = useUi((s) => s.drawerSeen);
  const markSeen = useUi((s) => s.markDrawerSeen);
  const [first] = useState(!seen);
  const [phase, setPhase] = useState<'open' | 'face'>('open');

  useEffect(() => {
    markSeen();
    const t = window.setTimeout(() => setPhase('face'), first ? 650 : 250);
    return () => window.clearTimeout(t);
  }, [first, markSeen]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);

  return (
    <div className="drawer-back" data-testid="drawer-view" onPointerDown={onClose}>
      <section className={`drawer-sheet ${phase}`} role="dialog" aria-label="서랍" onPointerDown={(e) => e.stopPropagation()}>
        <Px k="desk_drawer_open" scale={4} className="drawer-open-art" />
        <div className={`drawer-face ${first ? 'first' : ''}`} data-testid="drawer-face">
          <Px k="stamp_face_mismatch" scale={3} className="face-art" />
          <i className="face-flake f1" />
          <i className="face-flake f2" />
          <i className="face-flake f3" />
          <span className="face-07">07</span>
        </div>
        <p className="drawer-note">{first ? '도장 면에 마른 붉은 잉크가 굳어 있다. 손잡이에도 07.' : '규정 외의 도장. 손잡이에도 07.'}</p>
        <div className="drawer-actions">
          <StampHold
            tone="mismatch"
            label="불일치"
            sub="길게"
            testId="stamp-mismatch"
            ms={700}
            disabled={!canStamp}
            onComplete={() => {
              onStamp();
            }}
          />
          <button type="button" className="btn" data-testid="drawer-close" onClick={() => (fx('page'), onClose())}>
            서랍을 닫는다
          </button>
        </div>
      </section>
    </div>
  );
}
