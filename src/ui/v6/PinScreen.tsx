/** 역사 고정: 큰 목표의 답이 손상된 줄에 앉은 모습 + 길게 눌러 고정(아래 막대 가운데). 복원 1박자(단락이 돌아온다 · 출처 공개)도 여기서 보인다. */
import { josa } from '@/core/josa';
import { selectFix, selectGoal } from '@/store/v6/store';
import { D, useV6 } from './store';
import { WonmunToggle } from './WonmunPanel';

export function PinScreen() {
  const s = useV6((st) => st.s);
  const fix = selectFix(s, D);
  const goal = selectGoal(s, D);
  const sentence = s.restored ? fix.modern : goal.answer ? fix.modern.replace('[ ? ]', josa(goal.answer, '이/가')) : fix.modern;
  const parts = !s.restored && goal.answer ? sentence.split(josa(goal.answer, '이/가')) : null;
  return (
    <article className="v6-card pin" data-testid="pin" data-restored={s.restored ? 'true' : 'false'}>
      <header className="v6-head">
        <div className="v6-tags">
          <span className="v6-tag">역사 고정</span>
          {s.restored ? (
            <span className="v6-seal" data-testid="seal">
              고정됨
            </span>
          ) : null}
        </div>
        <h2 className="v6-title">{s.restored ? '기록이 돌아왔다' : '이 문장을 고정한다'}</h2>
        <div className="v6-meta">
          <span className="who">{s.restored ? '검증된 실록 문장과 맞았다' : '검증된 실록 문장과 맞을 때만 굳는다'}</span>
        </div>
      </header>
      <div className={`v6-line${s.restored ? ' restored' : ' pinline'}`}>
        <p className="v6-text read" data-testid="pin-sentence">
          {parts ? (
            <>
              {parts[0]}
              <mark className="v6-fill">{josa(goal.answer!, '이/가')}</mark>
              {parts.slice(1).join(josa(goal.answer!, '이/가'))}
            </>
          ) : (
            sentence
          )}
        </p>
        <WonmunToggle lineId={D.fix.restoredModernLine} />
      </div>
      {s.restored && fix.citation ? (
        <div className="v6-cite" data-testid="citation">
          <div className="cl">출처</div>
          <div>{fix.citation}</div>
          {fix.url ? <div className="url">{fix.url}</div> : null}
        </div>
      ) : (
        <p className="v6-note">고르는 것은 없다. 아래 가운데 칸을 길게 눌러 기록과 맞춘다. 손을 떼도 잃는 것은 없다.</p>
      )}
      <div className={`fixmeter dark v6-meter${fix.rate.pct >= 100 ? ' full' : ''}`} data-testid="fix-rate" data-pct={fix.rate.pct} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fix.rate.pct} aria-label="그날 고정률">
        <div className="fm-row">
          <span className="t-m">그날 고정률</span>
          <span className="fm-pct">{fix.rate.pct}%</span>
        </div>
        <div className="fm-bar">
          <i style={{ width: `${fix.rate.pct}%` }} />
        </div>
      </div>
    </article>
  );
}
