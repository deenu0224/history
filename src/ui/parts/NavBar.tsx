/**
 * 아래 막대 3칸(엄지 영역, 높이 56): [‹ 뒤로] [이 화면의 주요 동작] [메신저(안 읽음 점)].
 * 위쪽 뒤로 버튼은 두지 않는다(머리글은 제목·시각만). 왼쪽 가장자리에서 밀어도 같은 뒤로(lib/nav).
 * 가운데 칸이 없으면 비워 둔다(칸 자리는 늘 같다). UI_STYLE_GUIDE §2.0
 */
import type { ReactNode } from 'react';
import { useView } from '@/store/hooks';
import { selectUnread } from '@/store/selectors';
import { goBack, openMessenger } from '../lib/nav';
import { IBack, IChat } from './icons';

export function NavBar({
  onBack = goBack,
  backTestId,
  backLabel = '뒤로',
  primary,
  messenger = true,
  className,
}: {
  onBack?: () => unknown;
  backTestId?: string;
  backLabel?: string;
  /** 가운데 칸: 이 화면의 주요 동작 하나(없으면 빈칸) */
  primary?: ReactNode;
  /** 메신저 칸(메신저 화면 자신·고르는 중인 카드에선 끈다) */
  messenger?: boolean;
  className?: string;
}) {
  const unread = useView(selectUnread);
  return (
    <nav className={`navbar${className ? ` ${className}` : ''}`} aria-label="이동">
      <button className="nb-side" onClick={() => onBack()} data-testid={backTestId} aria-label={backLabel}>
        <IBack />
        <span className="nb-lab">{backLabel}</span>
      </button>
      <div className="nb-main">{primary ?? null}</div>
      {messenger ? (
        <button className="nb-side" onClick={openMessenger} data-testid="nav-messenger" aria-label={unread ? `메신저, 안 읽은 메시지 ${unread}` : '메신저'}>
          <span style={{ position: 'relative', display: 'flex' }}>
            <IChat />
            {unread ? <i className="dot" data-testid="nav-unread-dot" /> : null}
          </span>
          <span className="nb-lab">메신저</span>
        </button>
      ) : (
        <span className="nb-side nb-empty" aria-hidden="true" />
      )}
    </nav>
  );
}
