import { useEffect, type ReactNode } from 'react';
import { IClose } from './icons';

/** 아래 시트. 바깥(어두운 면)을 탭하거나 Esc 로 닫는다. 컷을 가리지 않아야 할 때 scrim="clear". */
export function Sheet({
  title,
  onClose,
  children,
  foot,
  scrim = 'dim',
  headClass,
  maxH,
  testId,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
  scrim?: 'dim' | 'clear' | 'none';
  headClass?: string;
  maxH?: string;
  testId?: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      {scrim !== 'none' ? <div className={`scrim${scrim === 'clear' ? ' clear' : ''}`} onClick={onClose} /> : null}
      <section className="sheet" role="dialog" aria-label={typeof title === 'string' ? title : undefined} data-testid={testId} style={maxH ? { maxHeight: maxH } : undefined}>
        <div className="grab" />
        <div className="shead">
          <div className={`t-h ${headClass ?? ''}`}>{title}</div>
          <button className="ibtn" aria-label="닫기" onClick={onClose}>
            <IClose />
          </button>
        </div>
        <div className="sbody">{children}</div>
        {foot ? <div className="sfoot">{foot}</div> : null}
      </section>
    </>
  );
}
