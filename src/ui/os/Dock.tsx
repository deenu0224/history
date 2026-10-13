import { useGameStore } from '@/store/gameStore';
import type { AppId } from '@/core/types';
import { CONTENT } from '../lib/content';
import { Px, appIconKey } from '../lib/art';
import { useUi } from '../uiStore';

/** UI 에 도착한(전달 연출이 끝난) 읽지 않은 메시지 수 */
export function useUnread(): number {
  const inbox = useGameStore((s) => s.inbox);
  const read = useGameStore((s) => s.read);
  const revealed = useUi((s) => s.revealed);
  return inbox.filter((id) => revealed.includes(id) && !read.includes(id)).length;
}

export function Dock({
  apps,
  frontApp,
  openApps,
  onPick,
  orientation,
}: {
  apps: AppId[];
  frontApp: AppId | null;
  openApps: AppId[];
  onPick(app: AppId): void;
  orientation: 'bottom' | 'left';
}) {
  const unread = useUnread();
  const installing = useUi((s) => s.installing);
  return (
    <nav className={`dock dock-${orientation}`} aria-label="앱" data-testid="dock">
      {apps.map((app) => {
        const def = CONTENT.apps.find((a) => a.app === app);
        if (!def) return null;
        const isInstalling = installing[app] !== undefined;
        const badge = app === 'messenger' && unread > 0 ? unread : 0;
        return (
          <button
            key={app}
            type="button"
            className={`dock-btn ${frontApp === app ? 'front' : ''} ${openApps.includes(app) ? 'open' : ''} ${isInstalling ? 'installing' : ''} ${badge ? 'blink' : ''}`}
            data-testid={`dock-${app}`}
            aria-label={def.title}
            onClick={() => onPick(app)}
          >
            <Px k={appIconKey(def.iconKey, true)} scale={3} />
            <span className="dock-name">{def.title}</span>
            {badge > 0 && (
              <span className="dock-badge" aria-label={`읽지 않은 메시지 ${badge}`}>
                {badge}
              </span>
            )}
            {isInstalling && <span className="dock-install" aria-hidden="true" />}
            <span className="dock-dot" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
