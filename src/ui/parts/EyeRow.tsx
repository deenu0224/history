import type { EyeView } from '@/store/selectors';
import { EyeIcon, type EyeLook } from './icons';

export const lookOf = (e: EyeView): EyeLook => (e.state === 'open' ? (e.ownerUnknown ? 'unknown' : 'open') : e.state === 'closed' ? 'closed' : 'never');

/** 눈 줄: 열린(또는 닫힌) 눈은 탭해서 그 사람의 기억으로. 아직 열리지 않은 눈은 점선. */
export function EyeRow({ eyes, onPick, size = 24 }: { eyes: EyeView[]; onPick?: (eyeId: string) => void; size?: number }) {
  return (
    <div className="eyes" role="group" aria-label="열린 눈">
      {eyes.map((e) => {
        const usable = e.state === 'open' || e.state === 'closed';
        const label = usable ? `${e.label}${e.state === 'closed' ? ' (닫힘)' : ''}` : e.state === 'never' ? '열리지 않는 눈' : '아직 열리지 않은 눈';
        return (
          <button
            key={e.eyeId}
            className={`eyebtn${e.state === 'closed' ? ' cold' : ''}`}
            aria-label={label}
            aria-current={e.current}
            data-eye={e.eyeId}
            data-state={e.state}
            disabled={!usable || !onPick}
            onClick={() => onPick?.(e.eyeId)}
          >
            <EyeIcon look={lookOf(e)} size={size} glow={e.state === 'open' && e.current} />
          </button>
        );
      })}
    </div>
  );
}
