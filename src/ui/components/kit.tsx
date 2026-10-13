import type { ReactNode } from 'react';
import { toDataURL } from '@/game/art';
import type { CollectionCategory, CollectionEntry, EvidenceCategory } from '@/core/types';
import { UI_KEYS } from '@/game/art';
import { SPRITES } from '@/game/art/registry';

export function PixelIcon({
  sprite,
  size = 24,
  className = '',
  locked = false,
  title,
}: {
  sprite: string;
  size?: number;
  className?: string;
  locked?: boolean;
  title?: string;
}) {
  const src = toDataURL(sprite);
  if (!src) return <span className={`pxicon ${className}`} style={{ width: size, height: size }} />;
  const sp = SPRITES[sprite];
  const ratio = sp ? sp.w / sp.h : 1;
  const w = ratio >= 1 ? size : Math.round(size * ratio);
  const h = ratio >= 1 ? Math.round(size / ratio) : size;
  return (
    <img
      className={`pxicon ${locked ? 'pxicon-locked' : ''} ${className}`}
      src={src}
      width={w}
      height={h}
      alt=""
      title={title}
      draggable={false}
    />
  );
}

export const CATEGORY_ICON: Record<CollectionCategory, string> = {
  artifact: UI_KEYS.iconEvidence,
  source: UI_KEYS.iconScroll,
  person: UI_KEYS.iconPerson,
  event: UI_KEYS.iconEvent,
  place: UI_KEYS.iconPlace,
};

export const EVIDENCE_ICON: Record<EvidenceCategory, string> = {
  object: UI_KEYS.iconEvidence,
  document: UI_KEYS.iconScroll,
  person: UI_KEYS.iconPerson,
  testimony: UI_KEYS.iconQuestion,
  place: UI_KEYS.iconPlace,
  observation: UI_KEYS.iconMagnifier,
};

export function entrySprite(entry: CollectionEntry): string {
  if (entry.id === 'col_art_takyeong' || entry.refId === 'art_takyeong') return 'artifact_geomungo_TEMP';
  return entry.spriteKey && SPRITES[entry.spriteKey] ? entry.spriteKey : CATEGORY_ICON[entry.category];
}

export function Pips({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="pips" aria-label={`${value}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < value ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Chip({ children, tone = 'plain', title }: { children: ReactNode; tone?: 'plain' | 'accent' | 'good' | 'warn' | 'dim'; title?: string }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: { id: T; label: string; badge?: string | number }[];
  value: T;
  onChange(v: T): void;
  className?: string;
}) {
  return (
    <div className={`tabs ${className}`} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          className={`tab ${t.id === value ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge !== undefined && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Stamp({ children, tone, seq }: { children: ReactNode; tone: 'good' | 'mid' | 'bad' | 'dim'; seq?: number }) {
  return (
    <div className={`stamp stamp-${tone}`} key={seq}>
      <span>{children}</span>
    </div>
  );
}
