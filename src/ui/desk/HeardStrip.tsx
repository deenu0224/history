/**
 * 들은 말(관측 낱말 칩). 관측 창 바로 아래. 들은(또는 본) 낱말만 짚을 수 있다.
 * 검사 모드에서 기록 낱말을 짚은 뒤 여기의 낱말을 누르면 실이 이어진다(순서가 반대여도 된다).
 */
import type { CaseCardView } from '@/store/gameStore';
import { isGlue } from '../lib/desk';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { doInspect } from './actions';

export function HeardStrip({ card }: { card: CaseCardView }) {
  const inspect = useUi((s) => s.inspect);
  const sel = useUi((s) => s.sel);
  const select = useUi((s) => s.select);
  const showGloss = useUi((s) => s.showGloss);
  const done = card.done;

  if (card.observed.length === 0) return null;
  return (
    <div className="heard" data-testid="heard-strip">
      {card.observed.map((o) => {
        if (!o.available)
          return (
            <p key={o.id} className="heard-line empty" data-testid={`heard-empty-${o.id}`}>
              <span className="heard-dots">…</span> {o.kind === 'line' ? '아직 들리지 않는다' : '아직 보지 못했다'}
            </p>
          );
        return (
          <p key={o.id} className="heard-line" data-testid={`heard-${o.id}`}>
            {o.speaker && <small className="heard-who">{o.speaker}</small>}
            <span className="heard-q" lang="ko">
              <span className="q">「</span>
              {o.segments.map((s) => {
                if (isGlue(s.id)) return <span key={s.id}>{s.text}</span>;
                const link = card.links.filter((l) => l.observed === s.id);
                const rel = link.some((l) => l.relation === 'differs') ? 'differs' : link.some((l) => l.relation === 'notation') ? 'notation' : undefined;
                const isSel = sel?.side === 'obs' && sel.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`chip ${s.gloss ? 'has-gloss' : ''} ${isSel ? 'sel' : ''} ${inspect && !done ? 'pick' : ''} ${!done && rel ? `ln-${rel}` : ''}`}
                    data-testid={`obs-${s.id}`}
                    data-seg={`obs:${s.id}`}
                    aria-pressed={isSel}
                    onClick={() => {
                      if (s.gloss) showGloss(s.gloss.term, s.gloss.gloss);
                      if (!inspect || done) return;
                      fx('tap');
                      if (isSel) return select(null);
                      if (sel?.side === 'rec') return void doInspect(sel.id, s.id);
                      select({ side: 'obs', id: s.id });
                    }}
                  >
                    {s.text}
                  </button>
                );
              })}
              <span className="q">」</span>
            </span>
          </p>
        );
      })}
    </div>
  );
}
