/** 연결 칩: 위치 · 시간 · 인물 · 사건. 잠긴 칩은 점선 + 까닭. 시간은 상대 시간만. */
import type { LinkView } from '@/core/v6/graph';
import { useV6, LINK_KIND } from './store';
import { ILink, ILock } from './icons';

export function LinkChips({ links, onGo }: { links: LinkView[]; onGo?: (id: string) => void }) {
  const visited = useV6((st) => st.s.visited);
  if (!links.length) return null;
  return (
    <div className="v6-links" data-testid="links">
      <div className="v6-links-h">
        <ILink size={20} /> 이어진 기록
      </div>
      <div className="v6-chips">
        {links.map((l) =>
          l.state === 'locked' ? (
            <div key={l.id} className="v6-chip locked" data-testid={`link-${l.id}`} aria-disabled="true">
              <ILock size={18} />
              <span>
                <b>{LINK_KIND[l.kind]}</b> {l.label}
                <small> · {l.lockReason}</small>
              </span>
            </div>
          ) : (
            <button
              key={l.id}
              className={`v6-chip${visited.includes(l.to) ? ' seen' : ''}${l.restoredOnly || l.showAfter ? ' new' : ''}`}
              data-testid={`link-${l.id}`}
              onClick={() => {
                useV6.getState().followLink(l.id);
                onGo?.(l.to);
              }}
            >
              <b>{LINK_KIND[l.kind]}</b> {l.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
