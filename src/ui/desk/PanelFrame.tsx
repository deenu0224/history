/** 책상 위에 올라오는 패널(앱). 모바일 세로는 전체 화면, 그 밖에는 오른쪽 패널(책상이 왼쪽에 남는다). 뒷면을 탭하면 닫힌다. */
import type { ReactNode } from 'react';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { useBackHandler } from '../hooks';

export function PanelFrame({ title, iconKey, onClose, children, testId }: { title: string; iconKey: string; onClose(): void; children: ReactNode; testId: string }) {
  useBackHandler(true, () => (onClose(), true));
  return (
    <div className="panel-back" data-testid={`${testId}-back`} onPointerDown={onClose}>
      <section className="panel" role="dialog" aria-label={title} data-testid={testId} onPointerDown={(e) => e.stopPropagation()}>
        <header className="panel-head">
          <Px k={iconKey} scale={2} className="panel-icon" />
          <h2>{title}</h2>
          <button
            type="button"
            className="panel-x"
            aria-label={`${title} 닫기`}
            data-testid="panel-close"
            onClick={() => {
              fx('tap');
              onClose();
            }}
          >
            ×
          </button>
        </header>
        <div className="panel-body">{children}</div>
      </section>
    </div>
  );
}
