/**
 * 도장 자국. 아트의 자국 스프라이트(글자 면은 비어 있다) 위에 선명한 한글 라벨과 작은 각인 "07" 을 얹는다.
 * fresh 이면 찍히는 순간의 연출(떨어져 눌림 → 먹 번짐).
 */
import type { CSSProperties } from 'react';
import type { CaseStamp, Id } from '@/core/types';
import { Px } from '../lib/art';
import { impressionLook, toneOf } from '../lib/desk';

export function Impression({
  caseId,
  stamp,
  label,
  engraving = '07',
  faded,
  system,
  fresh,
  delay = 0,
  scale = 2,
  className = '',
  testId,
  salt,
}: {
  caseId: Id;
  stamp: CaseStamp;
  label: string;
  engraving?: string;
  faded?: boolean;
  /** 시스템의 회색 자동 분류 도장(다른 도장 위에 덮인다) */
  system?: boolean;
  fresh?: boolean;
  delay?: number;
  scale?: number;
  className?: string;
  testId?: string;
  salt?: string;
}) {
  const look = impressionLook(caseId, stamp, { faded, system, salt });
  const tone = system ? 'system' : toneOf(stamp, faded);
  const style = {
    '--tilt': `${look.tilt}deg`,
    '--dx': `${look.dx}px`,
    '--dy': `${look.dy}px`,
    '--delay': `${delay}ms`,
    width: 64 * scale,
    height: 40 * scale,
  } as CSSProperties;
  return (
    <span className={`imp imp-${tone} ${faded ? 'imp-faded' : ''} ${fresh ? 'imp-fresh' : ''} ${system ? 'imp-system' : ''} ${className}`} style={style} data-testid={testId} data-variant={look.variant} data-stamp={stamp}>
      <Px k={look.sprite} scale={scale} className="imp-art" />
      <b className="imp-label" style={{ fontSize: `${0.62 * scale}rem` }}>
        {label.includes(' · ') ? (
          <span className="imp-two">
            {label.split(' · ').map((x) => (
              <span key={x}>{x.replace(/\(.*\)/, '')}</span>
            ))}
          </span>
        ) : (
          label
        )}
      </b>
      <i className="imp-eng" style={{ fontSize: `${0.34 * scale}rem` }} aria-label="각인">
        {engraving}
      </i>
      {fresh && <span className="imp-splash" aria-hidden="true" />}
    </span>
  );
}
