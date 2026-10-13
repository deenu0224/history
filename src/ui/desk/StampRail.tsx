/** 아래 레일: 도장(확인·정정, 좌표 손상 건은 자동 종결 승인) · 서랍 · 프린터. 누르고 있으면(≈500ms) 찍힌다. */
import type { CaseCardView } from '@/store/gameStore';
import { doStamp } from './actions';
import { DrawerButton } from './Drawer';
import { Printer } from './Printer';
import { StampHold } from './StampHold';

export function StampRail({ card, canStamp, dutyActive, onDrawer, onSlips }: { card: CaseCardView | null; canStamp: boolean; dutyActive: boolean; onDrawer(): void; onSlips(): void }) {
  const lost = !!card && card.kind !== 'routine';
  const off = !canStamp;
  // 일상 건: 관측 전에는 두 도장 모두 쉬고, 정정은 다른(빨강·노랑) 낱말을 짚어 둔 뒤에야 깨어난다 — 규정(3.2)을 손으로 느끼게.
  // 정답이 아니라 플레이어가 한 일(들었다 · 짚었다)에서만 계산한다.
  const routine = !!card && card.kind === 'routine' && !card.done;
  const heard = routine && card!.observed.some((o) => o.available);
  const pinned = routine && card!.links.some((l) => l.relation === 'differs' || l.relation === 'notation');
  return (
    <div className={`rail ${off ? 'rail-off' : ''} ${lost ? 'rail-lost' : ''}`} data-testid="stamp-rail">
      {lost && <StampHold tone="system" label="자동 종결" sub="승인" testId="stamp-auto_close" disabled={off} glow={!off} onComplete={() => doStamp('auto_close')} />}
      <StampHold tone="ok" label="확인" testId="stamp-confirm" disabled={off} dim={lost || (routine && !heard)} small={lost} onComplete={() => doStamp('confirm')} />
      <StampHold tone="fix" label="정정" testId="stamp-correct" disabled={off} dim={lost || (routine && (!heard || !pinned))} small={lost} onComplete={() => doStamp('correct')} />
      <span className="rail-gap" />
      <DrawerButton open={onDrawer} disabled={!dutyActive} />
      <Printer onOpen={onSlips} />
    </div>
  );
}
