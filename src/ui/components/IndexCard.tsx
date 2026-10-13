import type { DbRecord } from '@/core/types';

/** DB 기록을 담은 색인 카드. 첫 두 줄만 보인다. */
export function IndexCard({
  rec,
  onClick,
  testId,
  className = '',
  selected,
}: {
  rec: DbRecord;
  onClick?(): void;
  testId?: string;
  className?: string;
  selected?: boolean;
}) {
  const body = (
    <>
      <span className="card-title">{rec.title}</span>
      {rec.fields.slice(0, 2).map((f) => (
        <span key={f.key} className="card-line">
          {f.label}: {f.value}
        </span>
      ))}
    </>
  );
  const cls = `icard ${selected ? 'icard-sel' : ''} ${className}`;
  return onClick ? (
    <button type="button" className={cls} data-testid={testId} onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={cls} data-testid={testId}>
      {body}
    </span>
  );
}
