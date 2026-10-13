/** 카드 겹치기: 카드를 다른 카드 위로 끌어 놓거나(또는 둘 이상 골라 '겹치기') 하나로 이어지는지 시험한다. 틀려도 잃는 것 없음. */
import { useState } from 'react';
import { evidenceView } from '@/core/content';
import type { Id } from '@/core/types';
import { useGameStore, type LinkResult } from '@/store/gameStore';
import { IDX } from '../lib/content';
import { fx } from '../lib/fx';
import { describeRewards } from '../lib/rewards';
import { STRENGTH_LABEL, timeText } from '../lib/format';

export function Combine() {
  const owned = useGameStore((s) => s.evidence);
  const linkEvidence = useGameStore((s) => s.linkEvidence);
  const [sel, setSel] = useState<Id[]>([]);
  const [drag, setDrag] = useState<{ id: Id; x: number; y: number } | null>(null);
  const [res, setRes] = useState<{ r: LinkResult; seq: number } | null>(null);
  const [shake, setShake] = useState(0);
  const ids = Object.keys(owned).filter((id) => IDX.evidence[id]);

  const attempt = (list: Id[]) => {
    const r = linkEvidence(list);
    setRes({ r, seq: Date.now() });
    if (r.status === 'linked') {
      fx('link');
      setSel([]);
    } else {
      fx('link_miss');
      setShake((n) => n + 1);
    }
  };

  const startDrag = (e: React.PointerEvent, id: Id) => {
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    const move = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) active = true;
      if (active) setDrag({ id, x: ev.clientX, y: ev.clientY });
    };
    const end = (ev: PointerEvent, commit: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      setDrag(null);
      if (!commit || !active) return;
      const target = document.elementsFromPoint(ev.clientX, ev.clientY).find((el) => (el as HTMLElement).dataset?.cardId && (el as HTMLElement).dataset.cardId !== id) as HTMLElement | undefined;
      if (target?.dataset.cardId) attempt([id, target.dataset.cardId]);
    };
    const up = (ev: PointerEvent) => end(ev, true);
    const cancel = (ev: PointerEvent) => end(ev, false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  return (
    <div className="combine" data-testid="combine-panel">
      <p className="dprompt">카드를 다른 카드 위로 끌어 놓으면, 둘이 하나로 이어지는지 확인합니다. 틀려도 잃는 것은 없습니다.</p>
      <div className="combine-grid">
        {ids.length === 0 && <p className="empty">겹칠 카드가 없다.</p>}
        {ids.map((id) => {
          const v = evidenceView(IDX.evidence[id]!, owned[id]!);
          const on = sel.includes(id);
          return (
            <div
              key={id}
              className={`ccard ${on ? 'on' : ''} ${drag?.id === id ? 'dragging' : ''} ${res && res.r.status !== 'linked' && shake ? 'nudge' : ''}`}
              data-card-id={id}
              data-testid={`ccard-${id}`}
              onPointerDown={(e) => !(e.target as HTMLElement).closest('button') && startDrag(e, id)}
            >
              <b>{v.label}</b>
              <span className="ycard-time">{v.time ? `${timeText(v.time)} · ${STRENGTH_LABEL[v.time.strength]}` : v.text}</span>
              <button
                type="button"
                className="pill"
                aria-pressed={on}
                data-testid={`csel-${id}`}
                onClick={() => setSel(on ? sel.filter((x) => x !== id) : [...sel, id])}
              >
                {on ? '선택됨' : '선택'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="dsubmit">
        <span className="dim">선택 {sel.length}장</span>
        <button className="btn btn-primary btn-big" data-testid="combine-go" disabled={sel.length < 2} onClick={() => attempt(sel)}>
          겹치기
        </button>
      </div>
      {res && (
        <div className={`combine-res res-${res.r.status}`} role="status" data-testid="combine-result" key={res.seq}>
          <p>{res.r.message}</p>
          {describeRewards(res.r.gained).map((g) => (
            <p key={g.key} className="gain">
              <span className="gain-mark" aria-hidden="true">
                ＋
              </span>
              {g.text}
            </p>
          ))}
        </div>
      )}
      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          {IDX.evidence[drag.id] ? evidenceView(IDX.evidence[drag.id]!, owned[drag.id] ?? 0).label : ''}
        </div>
      )}
    </div>
  );
}
