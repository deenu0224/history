/**
 * 홈 카드의 「그날 실록」 — 손상된 문장 그대로(검증된 국역). 지워진 곳은 길이가 다른 짧은 청록 밑줄(빈자리) 하나의 모양,
 * 「누가」 칸만 밑줄 위에 작은 「?」. 복원 뒤엔 빈자리에 글이 돌아오고, 내가 채운 「누가」 칸만 밝게 보인다.
 * before 를 주면(복원 단계 「홈」) 빈자리가 한 자씩 채워지는 연출.
 */
import type { homeView } from '@/core/reality';
import { useEpisode } from '@/store/hooks';
import { Scramble } from './Scramble';
import { GlossText } from './GlossText';

type RecordView = NonNullable<ReturnType<typeof homeView>['record']>;

/** 구멍 글([ ? ] · [ ── ])이면 그 길이(─ 개수, 「누가」 칸은 0) */
const holeLen = (t: string): number | null => {
  const m = /^\[ (\?|─+) \]$/.exec(t);
  return m ? (m[1] === '?' ? 0 : m[1]!.length) : null;
};

/** short: 복원된 카드 — 돌아온 줄은 두 줄, 이웃 기록은 한 줄로(전문은 「전문 펼치기」) */
export function HomeRecord({ record, before, reduce = false, clamp = false, short = false }: { record: RecordView; before?: RecordView; reduce?: boolean; clamp?: boolean; short?: boolean }) {
  const raw = useEpisode().home.record;
  return (
    <div className="home-record" data-testid="home-record">
      <div className="t-m hr-title">{record.title}</div>
      {record.lines.map((l, i) => (
        <div key={i} className={`hr-line${l.minor ? ' minor' : ''}`} data-testid={`home-record-${i}`}>
          {l.note ? <div className="t-m hr-note">{short && l.minor ? '이웃 기록도 함께 돌아왔다' : l.note}</div> : null}
          <p className={`read keep hr-text${short ? (l.minor ? ' clamp1' : ' clamp2') : clamp ? ' clamp' : ''}`}>
            「
            {l.parts.map((p, j) => {
              if (!p.gap)
                return (
                  <span key={j}>
                    <GlossText text={p.text} />
                  </span>
                );
              const rp = raw?.lines[i]?.parts[j];
              const who = !!rp && 'gap' in rp && !!rp.who;
              const n = holeLen(p.text);
              if (n !== null)
                return (
                  <span
                    key={j}
                    className={`hr-hole${who ? ' who' : ''}`}
                    style={{ width: who ? '1.9em' : `${(1.2 + n * 0.62).toFixed(2)}em` }}
                    data-testid="home-gap"
                    role="img"
                    aria-label={who ? '빈자리: 누가' : '빈자리'}
                  >
                    <span className="sr">{p.text}</span>
                  </span>
                );
              const was = before?.lines[i]?.parts[j]?.text;
              return (
                <span key={j} className={`hr-gap filled${who ? ' who' : ''}`} data-testid="home-gap">
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
