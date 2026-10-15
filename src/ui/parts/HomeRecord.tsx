/**
 * 홈 카드의 「그날 실록」 — 손상된 문장 그대로(검증된 국역, 빈 칸만 청록 [ ? ]). 복원 뒤엔 빈 칸에 글이 돌아온다.
 * before 를 주면(복원 단계 「홈」) 빈 칸이 한 자씩 채워지는 연출.
 */
import type { homeView } from '@/core/reality';
import { Scramble } from './Scramble';

type RecordView = NonNullable<ReturnType<typeof homeView>['record']>;

export function HomeRecord({ record, before, reduce = false }: { record: RecordView; before?: RecordView; reduce?: boolean }) {
  return (
    <div className="home-record" data-testid="home-record">
      <div className="t-m hr-title">{record.title}</div>
      {record.lines.map((l, i) => (
        <div key={i} className={`hr-line${l.minor ? ' minor' : ''}`} data-testid={`home-record-${i}`}>
          {l.note ? <div className="t-m hr-note">{l.note}</div> : null}
          <p className="read keep hr-text">
            「
            {l.parts.map((p, j) => {
              if (!p.gap) return <span key={j}>{p.text}</span>;
              const was = before?.lines[i]?.parts[j]?.text;
              const filled = !p.text.includes('?');
              return (
                <span key={j} className={`hr-gap${filled ? ' filled' : ''}`} data-testid="home-gap">
                  {was && was !== p.text ? <Scramble from={was} to={p.text} ms={1400} delay={600 + i * 500} reduce={reduce} /> : p.text}
                </span>
              );
            })}
            」
          </p>
          {l.source ? <div className="t-m hr-src">{l.source.title}</div> : null}
        </div>
      ))}
    </div>
  );
}
