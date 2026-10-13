import type { ReactNode } from 'react';
import type { Frame } from '@/store/gameStore';
import { Px } from '../lib/art';
import { fmtMinute } from '../lib/text';

/** 필름 프레임 썸네일(폴라로이드). 연도·장소·인물은 보이지 않고 시각만 적는다. */
export function Polaroid({
  frame,
  index,
  lock,
  onClick,
  testId,
  className = '',
  children,
  empty,
  selected,
  disabled,
}: {
  frame?: Frame;
  index?: number;
  lock?: boolean;
  onClick?(): void;
  testId?: string;
  className?: string;
  children?: ReactNode;
  empty?: boolean;
  selected?: boolean;
  disabled?: boolean;
}) {
  const body = (
    <>
      <span className="pol-img">
        {frame?.thumbDataUrl ? <img src={frame.thumbDataUrl} alt="" draggable={false} /> : frame ? <Px k="ov_noise" scale={2} /> : null}
        {lock && (
          <span className="pol-lock" aria-label="잠김">
            <Px k="stat_lock" scale={2} />
          </span>
        )}
      </span>
      <span className="pol-cap">{frame ? fmtMinute(frame.minute) : index !== undefined ? index + 1 : ''}</span>
      {children}
    </>
  );
  const cls = `pol ${empty || !frame ? 'pol-empty' : ''} ${selected ? 'pol-sel' : ''} ${className}`;
  if (!onClick) return <span className={cls} data-testid={testId}>{body}</span>;
  return (
    <button type="button" className={cls} data-testid={testId} onClick={onClick} disabled={disabled} aria-label={frame ? `프레임 ${fmtMinute(frame.minute)}` : '빈 칸'}>
      {body}
    </button>
  );
}
