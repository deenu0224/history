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
import { FreshButton, HoldButton } from '../parts/HoldButton';
import { IClose, IExt, IWarn } from '../parts/icons';
import { NavBar } from '../parts/NavBar';
import { FixMeter } from '../parts/FixMeter';
import { GlossText } from '../parts/GlossText';
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
          if (!p.slot)
            return p.editorial ? (
              <span key={i} className="edit">
                {p.text}
              </span>
            ) : (
              <span key={i}>
                <GlossText text={p.text} />
              </span>
            );
          const sv = l.slots.find((x) => x.kind === p.slot);
          // 복원의 순간: 빈칸이 그 자리에서 먹으로 채워진다(한 번의 연출)
          if (restored)
            return (
              <span key={i} className="fillin" data-testid="filled-slot">
                {p.text}
              </span>
            );
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
        <div className="res src" data-testid="line-source">
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
      {l.result === 'not_recorded' ? <div className="res">흐릿함 — 그날에 붙지 않았다</div> : null}
      {l.result === 'incomplete' ? <div className="res">빈 칸이 있다</div> : null}
      {!restored && !l.preplaced ? (
        <button className="x" aria-label="이 문장 빼기" onClick={onRemove}>
          <IClose />
        </button>
      ) : null}
    </div>
  );
}

function PiecePicker({ onClose }: { onClose: () => void }) {
  const rw = useView(selectRewrite);
  return (
    <Sheet title="고정할 문장 더하기" onClose={onClose} testId="piece-sheet" maxH="72%">
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
              // 고른 값은 방에서 판단으로 미리 골라 두고, 풀리면 이 칸에 그대로 넣는다(같은 값을 세 번 고르지 않게 — QA_UX ux-08)
              useUi.getState().setPendingFill({ lineId, kind, value: o.value, contradictionId: r.contradictionId });
              useUi.getState().setRoomFocus(r.contradictionId);
              g.openRoom();
            }
          }}
        >
          {o.contested ? <IWarn size={20} /> : null}
          <span className="tx t-b keep">{o.label}</span>
          {o.contested ? <span className="tag">모순</span> : null}
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
  /** 짧은 탭: 빈칸이 한 번 깜빡인다 */
  const [blink, setBlink] = useState(0);
  useEffect(() => {
    if (!blink) return;
    const t = setTimeout(() => setBlink(0), 1000);
    return () => clearTimeout(t);
  }, [blink]);

  useEffect(() => {
    useGameStore.getState().composeRewrite();
  }, []);

  /** 복원 연출(빈칸이 먹으로 차오름) 중 — 배너·알림은 끝난 뒤에(data-float-wait, QA_UX_R3 ux3-04) */
  const [inking, setInking] = useState(false);
  useEffect(() => {
    if (!inking) return;
    const t = setTimeout(() => setInking(false), 1800);
    return () => clearTimeout(t);
  }, [inking]);

  const submit = () => {
    const g = useGameStore.getState();
    const out = g.submitRewrite();
    if ('results' in out) {
      const vals = Object.values(out.results);
      if (vals.includes('restored') || vals.includes('witness')) setInking(true);
      if (vals.includes('restored')) fx('write');
      else if (vals.includes('witness')) fx('write_grey');
      else fx('write_fail');
      if (vals.includes('not_recorded') || vals.includes('incomplete')) fx('write_fail');
      // 마지막 줄까지 돌아왔다 = 복원의 순간(이 화면 안에서: 빈칸이 채워지고 출처가 붙는다)
      if (out.complete) setTimeout(() => fx('restore'), 350);
    }
  };
  const restore = () => {
    const g = useGameStore.getState();
    if (g.restore() === 'restored') useUi.getState().go('restore');
  };

  return (
    <div className="scr paper" data-screen="rewrite">
      <div className="paperbar slim">
        <div className="title t-h" style={{ flex: 1 }}>
          빈자리 {rw.code}
        </div>
        {rw.complete ? (
          <span className="t-m amber" data-testid="rewrite-restored">
            고정됨
          </span>
        ) : null}
      </div>
      <div style={{ padding: '0 16px 10px' }}>
        <FixMeter pct={rw.fixRate.pct} />
      </div>
      <div className={`sheetpaper hanji${rw.complete ? ' done' : ''}${blink ? ' blink' : ''}`} data-testid="paper" {...(inking ? { 'data-float-wait': '' } : {})}>
        {rw.lines.length === 0 ? (
          <p className="read keep" style={{ margin: '28px 4px', fontSize: 17, lineHeight: '30px', color: '#6b5e45' }}>
            {rw.pieces.length ? '본 것으로만 고정한다. 고정할 문장을 더해, 칸을 내가 확인한 값으로 채운다.' : '본 것으로만 고정한다.'}
          </p>
        ) : null}
        {rw.lines.map((l) => (
          <LineView key={l.id} l={l} onSlot={(kind) => setSlot({ lineId: l.id, kind })} onRemove={() => useGameStore.getState().removeLine(l.id)} />
        ))}
      </div>
      {!rw.complete && rw.pieces.length ? (
        <div className="foot slim">
          <button className="btn secondary" onClick={() => setPicker(true)} data-testid="btn-add-line">
            고정할 문장 더하기
          </button>
        </div>
      ) : null}
      <NavBar
        backTestId="rewrite-back"
        primary={
          rw.complete ? (
            // 길게 누르기를 끝낸 손가락이 떼어질 때 이 버튼이 같이 눌리지 않게(QA_UX ux-01) — 새 pointerdown 부터만
            <FreshButton className="btn primary navprimary breath" testId="btn-restore" onClick={restore}>
              기록이 돌아왔다 ›
            </FreshButton>
          ) : (
            <HoldButton onDone={submit} mode={holdMode} testId="btn-submit" disabled={rw.lines.length === 0} className="btn primary navprimary" onShortTap={() => setBlink((b) => b + 1)}>
              {holdMode === 'hold' ? '길게 눌러 역사 고정' : '두 번 눌러 역사 고정'}
            </HoldButton>
          )
        }
      />
      {picker ? <PiecePicker onClose={() => setPicker(false)} /> : null}
      {slot ? <SlotPicker lineId={slot.lineId} kind={slot.kind} onClose={() => setSlot(null)} /> : null}
    </div>
  );
}
