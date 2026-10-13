import { useGameStore, selectUnread } from '@/store/gameStore';
import type { AppId } from '@/core/types';
import { CONTENT } from '../lib/content';
import { Px, appIconKey } from '../lib/art';
import { useUi } from '../uiStore';

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
  const unread = useGameStore((s) => selectUnread(s));
  const installing = useUi((s) => s.installing);
  const clear = useUi((s) => s.clearInstalling);
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
            data-coach={`dock.${app}`}
            aria-label={def.title}
            title={def.title}
            onClick={() => onPick(app)}
            onAnimationEnd={(e) => {
              if (isInstalling && e.animationName === 'install-done') clear(app);
            }}
          >
            <Px k={appIconKey(def.iconKey, true)} scale={3} />
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
