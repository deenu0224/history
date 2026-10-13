import { useGameStore } from '@/store/gameStore';
import { currentObjective } from '../lib/objectives';
import { fx } from '../lib/fx';
import { CONTENT } from '../lib/content';
import { Px, appIconKey } from '../lib/art';

/** 지금 할 일 한 줄(목표 고정 핀). 앱 이름을 누르면 그 앱으로. */
export function ObjectivePin({ compact = false }: { compact?: boolean }) {
  const obj = useGameStore((s) => {
    const o = currentObjective(s);
    return o ? `${o.id}` : '';
  });
  const state = useGameStore.getState();
  const o = obj ? currentObjective(state) : null;
  const openApp = useGameStore((s) => s.openApp);
  if (!o) return null;
  const def = o.app ? CONTENT.apps.find((a) => a.app === o.app) : undefined;
  return (
    <div className={`pin ${compact ? 'pin-compact' : ''}`} data-testid="objective-pin">
      <span className="pin-tag">할 일</span>
      <p>{o.text}</p>
      {def && (
        <button
          type="button"
          className="pin-go"
          aria-label={`${def.title} 열기`}
          onClick={() => {
            fx('tap');
            openApp(def.app);
          }}
        >
          <Px k={appIconKey(def.iconKey, true)} scale={2} />
        </button>
      )}
    </div>
  );
}
