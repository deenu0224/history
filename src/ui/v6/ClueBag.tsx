/** 맞춰 보기 시트(n = 2): n칸 · 피드백 상자(왜 아닌지·결론) · 낱말 줄 · 주머니. 시트 높이는 고정, 피드백은 칸 바로 아래.
 *  새 결론은 한 번만 보인다: 결과 상자에 문구, 주머니에서는 그 카드가 강조된다(중복 카드 없음). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { selectBag, selectGoal, type CardView } from '@/store/v6/store';
import { Sheet } from '../parts/Sheet';
import { D, nodeName, useV6 } from './store';
import { IPair, IStar, IX } from './icons';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function Feedback({ note }: { note: string | null }) {
  const result = useV6((st) => st.ui.result);
  const s = useV6((st) => st.s);
  if (note)
    return (
      <div className="v6-fb note" data-testid="feedback" data-kind="note">
        {note}
      </div>
    );
  if (!result || result.status === 'incomplete')
    return (
      <div className="v6-fb empty" data-testid="feedback" data-kind="empty">
        단서 둘을 고르고 아래 「맞춰 보기」를 누른다. 틀려도 잃는 것은 없다.
      </div>
    );
  if (result.status === 'fail')
    return (
      <div className="v6-fb fail" data-testid="feedback" data-kind="fail" role="status">
        <div className="fh">
          <IX size={20} /> 왜 아닌지
        </div>
        <p data-testid="why-not">{result.text}</p>
      </div>
    );
  if (result.status === 'conclusion')
    return (
      <div className="v6-fb ok" data-testid="feedback" data-kind="conclusion" role="status">
        <div className="fh">
          <IStar size={20} /> 맞다 · 결론 하나가 주머니에 들어갔다
        </div>
        <p data-testid="result-conclusion">{result.text}</p>
      </div>
    );
  if (result.status === 'goal') {
    const g = selectGoal(s, D);
    return (
      <div className="v6-fb ok goal" data-testid="feedback" data-kind="goal" role="status">
        <div className="fh">
          <IStar size={20} /> 맞다 · 큰 목표를 밝혔다
        </div>
        <p data-testid="result-goal">'누가' = {g.answer}. 아래 막대의 「역사 고정 ›」으로 굳힌다.</p>
      </div>
    );
  }
  const short = result.conclusionId ? D.conclusions[result.conclusionId]?.short : null;
  return (
    <div className="v6-fb note" data-testid="feedback" data-kind="already" role="status">
      이미 맞춰 봤다{short ? ` → ${short}` : ''}. 다른 묶음을 골라 보자.
    </div>
  );
}

function Slot({ card, shake, onClear }: { card: CardView | null; shake: boolean; onClear: () => void }) {
  if (!card)
    return (
      <div className="v6-slot empty" data-testid="slot-empty">
        단서 고르기
      </div>
    );
  return (
    <div className={`v6-slot${card.conclusion ? ' concl' : ''}${shake ? ' shake' : ''}`} data-testid="slot" data-card={card.id}>
      <span className="sn">{card.short}</span>
      <button className="sx" aria-label={`${card.short} 빼기`} data-testid="slot-clear" onClick={onClear}>
        <IX size={20} />
      </button>
    </div>
  );
}

function Card({ c, fresh, onPick }: { c: CardView; fresh: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }, [fresh]);
  const where = c.conclusion ? '맞춰 본 결론' : c.origins.map(nodeName).join(' · ');
  return (
    <button
      ref={ref}
      className={`v6-cc${c.picked ? ' picked' : ''}${c.conclusion ? ' concl' : ''}${fresh ? ' fresh' : ''}`}
      data-testid="bag-card"
      data-card={c.id}
      data-picked={c.picked ? 'true' : 'false'}
      aria-pressed={c.picked}
      onClick={onPick}
    >
      <span className="ct">
        <b>{c.short}</b>
        <span className="ck">{fresh ? '새 결론' : c.kindLabel}</span>
      </span>
      {fresh ? null : <span className="cx read">{c.text}</span>}
      <span className="cw">
        {where}
        {c.chips.length ? ` · 낱말 ${c.chips.join(' ')}` : ''}
      </span>
    </button>
  );
}

export function ClueBag({ onClose }: { onClose: () => void }) {
  const s = useV6((st) => st.s);
  const result = useV6((st) => st.ui.result);
  const [chip, setChip] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const bag = selectBag(s, D, chip ?? undefined);
  const st = useV6.getState();
  const shake = result?.status === 'fail' ? result.shake : [];
  const freshId = result?.status === 'conclusion' ? result.conclusionId : null;

  // 결론을 위로(새것부터), 그다음 단서
  const cards = useMemo(() => [...bag.cards.filter((c) => c.conclusion).reverse(), ...bag.cards.filter((c) => !c.conclusion)], [bag.cards]);

  const pick = (c: CardView) => {
    setNote(null);
    if (c.picked) return void st.unpick(c.id);
    const r = st.pick(c.id);
    if (r.status === 'full') setNote('칸이 다 찼다. 칸의 ✕로 하나를 빼고 다른 단서를 고른다.');
  };

  return (
    <Sheet
      testId="bag-sheet"
      title={
        <span className="v6-sheet-title">
          <IPair /> 맞춰 보기 <small>{bag.n}개 고르기</small>
        </span>
      }
      onClose={() => {
        st.clearResult();
        onClose();
      }}
    >
      <div className="v6-bag">
        <div className="v6-slots" data-testid="slots">
          {bag.slots.map((c, i) => (
            <Slot key={i} card={c} shake={!!c && shake.includes(c.id)} onClear={() => (setNote(null), c && st.unpick(c.id))} />
          ))}
        </div>
        <Feedback note={note} />
        {bag.chips.length ? (
          <div className="v6-wchips" data-testid="word-chips">
            <span className="wl">낱말</span>
            {bag.chips.map((w) => (
              <button key={w} className={`v6-wchip${chip === w ? ' on' : ''}`} aria-pressed={chip === w} onClick={() => setChip(chip === w ? null : w)}>
                {w}
              </button>
            ))}
          </div>
        ) : null}
        <div className="v6-list" data-testid="bag-list">
          {cards.map((c) => (
            <Card key={c.id} c={c} fresh={c.id === freshId} onPick={() => pick(c)} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}
