import { evidenceView } from '@/core/content';
import type { Feedback, JudgeResult } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { IDX } from '../lib/content';
import { VERDICT_LABEL, VERDICT_NOTE, formatYears, groupFeedback } from '../lib/format';
import { Stamp } from './kit';

const GOOD = new Set(['bounds_lower', 'bounds_upper', 'bounds_both']);
const BAD = new Set(['contradiction', 'fact_contradiction', 'excludes_truth', 'not_supported', 'fact_unverified', 'invalid_input']);

function mark(code: Feedback['code']) {
  if (BAD.has(code)) return '✕';
  if (GOOD.has(code)) return '○';
  return '△';
}

export function VerdictPanel({ result, seq, extra }: { result: JudgeResult; seq: number; extra?: React.ReactNode }) {
  const { general, byEvidence } = groupFeedback(result.feedback);
  const tone = result.verdict === 'confirmed' ? 'good' : result.verdict === 'partial' ? 'mid' : result.verdict === 'wrong' ? 'bad' : 'dim';
  const imp = result.implied;
  return (
    <section className={`verdict verdict-${result.verdict}`} aria-live="polite">
      <div className="verdict-head">
        <Stamp tone={tone} seq={seq}>
          {VERDICT_LABEL[result.verdict]}
        </Stamp>
        <p>{VERDICT_NOTE[result.verdict]}</p>
      </div>
      {byEvidence.size > 0 && (
        <ul className="fb-list">
          {[...byEvidence.entries()].map(([id, list]) => (
            <li key={id} className="fb-evidence">
              <EvName id={id} />
              <ul>
                {list.map((f, i) => (
                  <li key={i} className={`fb fb-${f.code}`}>
                    <span className="fb-mark">{mark(f.code)}</span>
                    {f.message}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {general.length > 0 && (
        <ul className="fb-list fb-general">
          {general.map((f, i) => (
            <li key={i} className={`fb fb-${f.code}`}>
              <span className="fb-mark">{mark(f.code)}</span>
              {f.message}
            </li>
          ))}
        </ul>
      )}
      {imp && (imp.from !== undefined || imp.to !== undefined) && (
        <p className="verdict-implied">
          인용한 증거가 가리키는 범위: {imp.from !== undefined && imp.to !== undefined ? formatYears(imp.from, imp.to) : imp.from !== undefined ? `${imp.from}년 이후` : `${imp.to}년 이전`}
        </p>
      )}
      {extra}
    </section>
  );
}

function EvName({ id }: { id: string }) {
  const level = useGameStore((s) => s.evidence[id]);
  const ev = IDX.evidence[id];
  const label = ev && level !== undefined ? evidenceView(ev, level).label : '증거';
  return <b className="fb-name">{label}</b>;
}
