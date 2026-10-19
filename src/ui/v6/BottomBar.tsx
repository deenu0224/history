/** 아래 막대 3칸: [‹ 뒤로] [맞춰 보기 / 역사 고정 / 다음] [메신저]. 높이 56, 칸 ≥ 44. */
import type { ReactNode } from 'react';
import { IBack, IChat } from '../parts/icons';

export function BottomBar({ onBack, center, onMessenger, unread, messengerOff }: { onBack: () => void; center: ReactNode; onMessenger: () => void; unread: number; messengerOff?: boolean }) {
  return (
    <nav className="navbar v6-bar" aria-label="이동">
      <button className="nb-side" onClick={onBack} data-testid="nav-back" aria-label="뒤로">
        <IBack />
        <span className="nb-lab">뒤로</span>
      </button>
      <div className="nb-main">{center}</div>
      {messengerOff ? (
        <span className="nb-side nb-empty" aria-hidden="true" />
      ) : (
        <button className="nb-side" onClick={onMessenger} data-testid="nav-messenger" aria-label={unread ? `메신저, 안 읽은 메시지 ${unread}` : '메신저'}>
          <span style={{ position: 'relative', display: 'flex' }}>
            <IChat />
            {unread ? <i className="dot" data-testid="nav-unread-dot" /> : null}
          </span>
          <span className="nb-lab">메신저</span>
        </button>
      )}
    </nav>
  );
}
