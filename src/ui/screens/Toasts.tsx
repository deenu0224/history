import { useEffect } from 'react';
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
    const t = setTimeout(() => onDone(id), tone === 'discover' ? 3800 : 2800);
    return () => clearTimeout(t);
  }, [id, tone, onDone]);
  return (
    <div className={`toast toast-${tone}`} onClick={() => onDone(id)}>
      {tone === 'discover' && <span className="toast-stamp">발견</span>}
      <span className="toast-body">
        <b>{text}</b>
        {sub && <small>{sub}</small>}
      </span>
    </div>
  );
}
