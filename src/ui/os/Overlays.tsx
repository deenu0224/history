import { useEffect, useRef, useState } from 'react';
import { bus } from '@/core/bus';
import { useGameStore } from '@/store/gameStore';
import { useUi } from '../uiStore';

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const drop = useUi((s) => s.dropToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} text={t.text} sub={t.sub} tone={t.tone} onDone={drop} />
      ))}
    </div>
  );
}

function ToastItem({ id, text, sub, tone, onDone }: { id: number; text: string; sub?: string; tone: string; onDone(id: number): void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 3000);
    return () => clearTimeout(t);
  }, [id, onDone]);
  return (
    <div className={`toast toast-${tone}`} onClick={() => onDone(id)}>
      <b>{text}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export type DipTone = 'erase' | 'restore';

/**
 * 화면 전체 연출 층. 네온 없음.
 *  - dip(erase): 차갑게 조용히 한 칸 어두워지고 채도가 빠진다.
 *  - dip(restore): 따뜻한 잉크가 번지듯 밝아진다.
 *  - glitch(관측 진입/종료): 짧은 명도 흔들림.
 */
export function Overlays() {
  const dip = useUi((s) => s.dip);
  const flicker = useGameStore((s) => s.settings.reduceFlicker);
  const [tone, setTone] = useState<DipTone | null>(null);
  const [glitch, setGlitch] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!dip) return;
    setTone(((window as unknown as { __DIP_TONE__?: DipTone }).__DIP_TONE__ ?? 'erase'));
    const t = setTimeout(() => setTone(null), 1600);
    return () => clearTimeout(t);
  }, [dip]);

  useEffect(
    () =>
      bus.on('glitch', ({ intensity, ms }) => {
        if (flicker) return;
        setGlitch(intensity);
        setTimeout(() => setGlitch(0), ms);
      }),
    [flicker],
  );

  return (
    <>
      {tone && <div className={`dip dip-${tone}`} aria-hidden="true" data-testid="dip" />}
      {glitch > 0 && <div className="glitch" style={{ opacity: Math.min(0.5, glitch * 0.6) }} aria-hidden="true" />}
    </>
  );
}

/** 현실 이동 등으로 화면을 한 번 흔든다. 기본은 차가운 erase, 복원은 따뜻한 restore. */
export function pulseDip(tone: DipTone) {
  (window as unknown as { __DIP_TONE__?: DipTone }).__DIP_TONE__ = tone;
  useUi.getState().triggerDip();
}
