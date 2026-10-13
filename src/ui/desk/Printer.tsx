/** 프린터: 규정·경고장·근무 보고가 여기서 나온다. 종이가 밀려 나오는 동안 프레임이 넘어간다. 탭하면 이번 근무의 경고장 목록. */
import { useEffect, useState } from 'react';
import { selectDesk, useGameStore } from '@/store/gameStore';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';

export function Printer({ onOpen }: { onOpen(): void }) {
  const nonce = useUi((s) => s.printerNonce);
  const desk = useGameStore((s) => s.duty);
  const st = useGameStore();
  const [frame, setFrame] = useState(0);
  const live = selectDesk(st).slips.filter((w) => !w.voided).length;
  void desk;

  useEffect(() => {
    if (!nonce) return;
    const seq: [number, number][] = [
      [1, 0],
      [2, 380],
      [2, 1500],
      [1, 1700],
      [0, 1900],
    ];
    const ts = seq.map(([f, ms]) => window.setTimeout(() => setFrame(f), ms));
    return () => ts.forEach(window.clearTimeout);
  }, [nonce]);

  return (
    <button
      type="button"
      className={`printer ${frame ? 'busy' : ''}`}
      data-testid="printer"
      aria-label={`프린터 · 이번 근무 경고장 ${live}장`}
      onClick={() => {
        fx('page');
        onOpen();
      }}
    >
      <Px k="desk_printer" frame={frame} scale={1} className="printer-art" />
      {live > 0 && (
        <span className="printer-badge" data-testid="printer-count">
          {live}
        </span>
      )}
    </button>
  );
}
