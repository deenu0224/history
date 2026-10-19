/** 기록 본문 블록(글 카드 안): 제목 · 줄(밑줄 = 단서 표시) · 본 것 · 들은 말 · 쪽지. 줄마다 「원문 보기」. */
import type { BlockView, LineView } from '@/store/v6/store';
import { D, useV6 } from './store';
import { IEar, IEye, IStar } from './icons';
import { WonmunToggle } from './WonmunPanel';

function Segments({ line }: { line: LineView }) {
  return (
    <>
      {line.segments.map((g, i) =>
        g.clue ? (
          <mark key={i} className="v6-ul" data-clue={g.clue} data-collected={g.collected ? 'true' : 'false'}>
            {g.text}
          </mark>
        ) : (
          <span key={i}>{g.text}</span>
        ),
      )}
    </>
  );
}

export function FoundBox({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="v6-found" data-testid="found-lines">
      <div className="v6-found-h">
        <IStar size={18} /> 지금까지 밝힌 것
      </div>
      <ul>
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

export function Passage({ blocks, found, goalTarget }: { blocks: BlockView[]; found: string[]; goalTarget: boolean }) {
  const restored = useV6((st) => st.s.restored);
  return (
    <div className="v6-passage">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'heading':
            return (
              <h3 key={i} className="v6-h3">
                {b.text}
              </h3>
            );
          case 'note':
            return (
              <p key={i} className="v6-note">
                {b.text}
              </p>
            );
          case 'line': {
            const lv = b.line!;
            const wasHoled = !!D.lines.modern[lv.lineId]?.modernParts;
            return (
              <div key={i}>
                <div className={`v6-line${lv.damaged ? ' damaged' : ''}${wasHoled && restored ? ' restored' : ''}`} data-line={lv.lineId}>
                  <p className="v6-text read">
                    <Segments line={lv} />
                  </p>
                  <WonmunToggle lineId={lv.lineId} />
                </div>
                {lv.damaged && goalTarget ? <FoundBox lines={found} /> : null}
              </div>
            );
          }
          case 'scene': {
            const sc = b.scene!;
            return (
              <div key={i} className="v6-line scene" data-line={sc.id}>
                <div className="v6-label">
                  <IEye size={20} /> 본 것
                </div>
                <p className="v6-text read">
                  <mark className="v6-ul" data-clue={b.clue} data-collected={b.collected ? 'true' : 'false'}>
                    {sc.text}
                  </mark>
                </p>
                <div className="v6-recon">재구성 · 기록에는 이 모습이 없다</div>
                <WonmunToggle lineId={sc.id} scene />
              </div>
            );
          }
          case 'heard': {
            const lv = b.line!;
            return (
              <div key={i} className="v6-line heard" data-line={lv.lineId}>
                <div className="v6-label">
                  <IEar size={20} /> 들은 말
                </div>
                {b.stage ? <div className="v6-stage">{b.stage}</div> : null}
                <p className="v6-text read">
                  <Segments line={lv} />
                </p>
                <WonmunToggle lineId={lv.lineId} />
              </div>
            );
          }
        }
      })}
    </div>
  );
}
