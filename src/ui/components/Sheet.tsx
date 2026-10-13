import { useEffect, type ReactNode } from 'react';
import { useBackHandler } from '../hooks';

/** 앱 안에서 아래에서 올라오는 시트(데스크톱에서는 가운데 카드). 뒷면을 탭하면 닫힌다. */
export function Sheet({ title, onClose, children, testId, wide }: { title: string; onClose(): void; children: ReactNode; testId?: string; wide?: boolean }) {
  useBackHandler(true, () => (onClose(), true));
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div className="sheet-back" onPointerDown={onClose} data-testid={testId ? `${testId}-back` : undefined}>
      <section className={`sheet ${wide ? 'sheet-wide' : ''}`} role="dialog" aria-label={title} data-testid={testId} onPointerDown={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h3>{title}</h3>
          <button type="button" className="sheet-x" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
