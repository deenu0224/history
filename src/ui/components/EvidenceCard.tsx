import { evidenceView, factText, maxLevel } from '@/core/content';
import type { Evidence } from '@/core/types';
import { STRENGTH_LABEL, timeText } from '../lib/format';
import { Chip, EVIDENCE_ICON, PixelIcon } from './kit';

export function EvidenceCard({
  ev,
  level,
  selected,
  onClick,
  compact = false,
  showTime = true,
  mark,
}: {
  ev: Evidence;
  level: number;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  showTime?: boolean;
  mark?: string;
}) {
  const v = evidenceView(ev, level);
  const partial = v.level < maxLevel(ev);
  const t = v.time;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`ecard ${partial ? 'ecard-partial' : ''} ${selected ? 'on' : ''} ${compact ? 'ecard-compact' : ''}`}
      onClick={onClick}
      data-testid={`ev-${ev.id}`}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      type={onClick ? 'button' : undefined}
    >
      <span className="ecard-icon">
        <PixelIcon sprite={EVIDENCE_ICON[ev.category]} size={compact ? 24 : 32} />
      </span>
      <span className="ecard-main">
        <span className="ecard-title">
          {v.label}
          {mark && <em className="ecard-mark">{mark}</em>}
        </span>
        {!compact && <span className="ecard-text">{v.text}</span>}
        <span className="ecard-meta">
          {partial && <Chip tone="dim">정보 부족</Chip>}
          {showTime && t && (
            <Chip tone={t.strength === 'weak' ? 'dim' : t.strength === 'decisive' ? 'accent' : 'plain'} title={t.weakReason}>
              {timeText(t)} · {STRENGTH_LABEL[t.strength]}
            </Chip>
          )}
          {!compact && v.facts.map((f, i) => <Chip key={i}>{factText(f)}</Chip>)}
        </span>
      </span>
      {selected && <span className="ecard-check">✓</span>}
    </Tag>
  );
}
