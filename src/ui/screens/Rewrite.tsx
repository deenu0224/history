/**
 * 기록 다시 쓰기 — 한지 위에 내가 본 것만으로 쓴다. 칸 값은 내가 확인한 것만. 풀리지 않은 모순(⚠)은 그날의 방으로.
 * 판정: 돌아온 줄(먹 번짐 + 출처) · 증인만 본 회색 줄(「실록이 적지 않은 일」) · 기록이 되지 않은 줄 · 빈 칸.
 */
import { useEffect, useState } from 'react';
import type { SlotKind } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectRewrite, selectSlotOptions, type RewriteLineView } from '@/store/selectors';
import { fx } from '../lib/fx';
import { cutNo } from '../lib/format';
import { HoldButton } from '../parts/HoldButton';
import { IBack, IClose, IExt, IWarn } from '../parts/icons';
import { Sheet } from '../parts/Sheet';
import { useUi } from '../uiStore';

const SLOT_NAME: Record<SlotKind, string> = { who: '누가', whose: '누구의', scope: '얼마나', count: '몇 조목', speaker: '누가 말했나' };

function LineView({ l, onSlot, onRemove }: { l: RewriteLineView; onSlot: (kind: SlotKind) => void; onRemove: () => void }) {
  const restored = l.result === 'restored';
  const cls = `pline${restored ? ' restored' : ''}${l.result === 'witness' ? ' witness' : ''}${l.result === 'not_recorded' || l.result === 'incomplete' ? ' nope' : ''}`;
  return (
    <div className={cls} data-testid={`line-${l.pieceId}`} data-result={l.result ?? ''}>
      <div className="tm">{l.render.time}</div>
      <div className="tx">
        {l.render.parts.map((p, i) => {
          if (!p.slot) return p.editorial ? <span key={i} className="edit">{p.text}</span> : <span key={i}>{p.text}</span>;
          const sv = l.slots.find((x) => x.kind === p.slot);
          if (restored) return <span key={i}>{p.text}</span>;
          const v = sv?.value;
          const warn = !!sv?.contested;
          return (
            <button key={i} className={`slot${v === undefined ? ' empty' : ''}${warn ? ' warn' : ''}`} data-testid={`slot-${l.pieceId}-${p.slot}`} onClick={() => onSlot(p.slot!)} aria-label={`${SLOT_NAME[p.slot]} 칸${v ? `: ${v}` : ' 비어 있음'}`}>
              {warn ? <IWarn size={16} /> : null}
              {v ?? '?'}
            </button>
          );
        })}
      </div>
      {l.result === 'restored' && l.render.sourceUrl ? (
        <div className="res" data-testid="line-source">
          {l.render.sourceTitle}{' '}
          <a href={l.render.sourceUrl} target="_blank" rel="noreferrer noopener">
            출처 <IExt size={14} />
          </a>
        </div>
      ) : null}
      {l.result === 'witness' ? (
        <div className="res" data-testid="line-witness">
          실록이 적지 않은 일
        </div>
      ) : null}
      {l.result === 'not_recorded' ? <div className="res">이 줄은 기록이 되지 않았다</div> : null}
      {l.result === 'incomplete' ? <div className="res">빈 칸이 있다</div> : null}
      {!restored ? (
        <button className="x" aria-label="이 줄 빼기" onClick={onRemove}>
          <IClose />
        </button>
      ) : null}
    </div>
  );
}

function PiecePicker({ onClose }: { onClose: () => void }) {
  const rw = useView(selectRewrite);
  return (
    <Sheet title="줄 더하기" onClose={onClose} testId="piece-sheet" maxH="72%">
      {rw.pieces.length === 0 ? <div className="placeholder t-m">더할 수 있는 조각이 없다</div> : null}
      {rw.pieces.map((p) => (
        <button
          key={p.id}
          className="pick"
          data-testid={`piece-${p.id}`}
          onClick={() => {
            fx('tap');
            useGameStore.getState().placePiece(p.id);
            onClose();
          }}
        >
          <span className="clock t-m">{p.time}</span>
          <span className="tx t-b keep">{p.label}</span>
        </button>
      ))}
    </Sheet>
  );
}

function SlotPicker({ lineId, kind, onClose }: { lineId: string; kind: SlotKind; onClose: () => void }) {
  const opts = useView((ep, s) => selectSlotOptions(ep, s, kind), [kind]);
  const line = useView((ep, s) => selectRewrite(ep, s).lines.find((l) => l.id === lineId), [lineId]);
  useEffect(() => {
    useGameStore.getState().openSlot(kind);
  }, [kind]);
  const cur = line?.slots.find((x) => x.kind === kind)?.value;
  return (
    <Sheet title={`${SLOT_NAME[kind]} — 내가 확인한 것만`} onClose={onClose} testId="slot-sheet" maxH="72%">
      {opts.length === 0 ? <div className="placeholder t-m">아직 확인한 값이 없다</div> : null}
      {opts.map((o) => (
        <button
          key={o.value}
          className={`pick${o.contested ? ' warn' : ''}`}
          data-testid={`opt-${o.value}`}
          aria-pressed={cur === o.value}
          onClick={() => {
            const g = useGameStore.getState();
            const r = g.fillSlot(lineId, kind, o.value);
            if (r.status === 'ok') {
              fx('tap');
              onClose();
            } else if (r.status === 'contested') {
              fx('tag_no');
              onClose();
              useUi.getState().setRoomFocus(r.contradictionId);
              g.openRoom();
            }
          }}
        >
          {o.contested ? <IWarn size={20} /> : null}
          <span className="tx t-b keep">{o.label}</span>
          <span className="tag">{o.contested ? '모순' : o.cutIds.length ? `컷 ${o.cutIds.map(cutNo).join('·')}` : ''}</span>
        </button>
      ))}
      {cur !== undefined ? (
        <button className="btn ghost" onClick={() => { useGameStore.getState().clearSlot(lineId, kind); onClose(); }}>
          칸 비우기
        </button>
      ) : null}
    </Sheet>
  );
}

export function Rewrite() {
  const rw = useView(selectRewrite);
  const holdMode = useGameStore((s) => s.settings.holdMode);
  const [picker, setPicker] = useState(false);
  const [slot, setSlot] = useState<{ lineId: string; kind: SlotKind } | null>(null);

  useEffect(() => {
    useGameStore.getState().composeRewrite();
  }, []);

  const submit = () => {
    const g = useGameStore.getState();
    const out = g.submitRewrite();
    if ('results' in out) {
      const vals = Object.values(out.results);
      if (vals.includes('restored')) fx('write');
      else if (vals.includes('witness')) fx('write_grey');
      else fx('write_fail');
      if (vals.includes('not_recorded') || vals.includes('incomplete')) fx('write_fail');
    }
  };
  const restore = () => {
    const g = useGameStore.getState();
    if (g.restore() === 'restored') useUi.getState().go('restore');
  };

  return (
    <div className="scr paper" data-screen="rewrite">
      <div className="paperbar">
        <button className="ibtn" aria-label="뒤로" onClick={() => useUi.getState().pop()} data-testid="rewrite-back">
          <IBack />
        </button>
        <div className="title t-h" style={{ flex: 1 }}>
          빈자리 {rw.code}
        </div>
      </div>
      <div className="sheetpaper hanji" data-testid="paper">
        {rw.lines.length === 0 ? (
          <p className="read keep" style={{ margin: '28px 4px', fontSize: 17, lineHeight: '30px', color: '#6b5e45' }}>
            본 것으로만 쓴다. 줄을 더해, 칸을 내가 확인한 값으로 채운다.
          </p>
        ) : null}
        {rw.lines.map((l) => (
          <LineView key={l.id} l={l} onSlot={(kind) => setSlot({ lineId: l.id, kind })} onRemove={() => useGameStore.getState().removeLine(l.id)} />
        ))}
      </div>
      <div className="foot">
        {rw.complete ? (
          <button className="btn primary" data-testid="btn-restore" onClick={restore}>
            기록이 돌아온다 ▸
          </button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => setPicker(true)} data-testid="btn-add-line">
              줄 더하기
            </button>
            <HoldButton onDone={submit} mode={holdMode} testId="btn-submit" disabled={rw.lines.length === 0}>
              ● 기록을 남긴다 {holdMode === 'hold' ? '(길게)' : '(두 번)'}
            </HoldButton>
          </>
        )}
      </div>
      {picker ? <PiecePicker onClose={() => setPicker(false)} /> : null}
      {slot ? <SlotPicker lineId={slot.lineId} kind={slot.kind} onClose={() => setSlot(null)} /> : null}
    </div>
  );
}
