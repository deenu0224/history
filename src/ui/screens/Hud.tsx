import { useMemo, useState } from 'react';
import { entryView, stageOf } from '@/core/collection';
import { UI_KEYS } from '@/game/art';
import { useGameStore } from '@/store/gameStore';
import { PixelIcon } from '../components/kit';
import { IDX, entriesOf } from '../lib/content';
import { formatYearResult, latestYearResult, obsNumber } from '../lib/format';
import { isPastScene, observationIndex } from '../lib/scene';
import { currentObjective } from '../lib/script';
import type { ModalKind } from '@/core/bus';
import type { Layout } from '../hooks';

const BUTTONS: { kind: ModalKind; id?: string; label: string; icon: string }[] = [
  { kind: 'notebook', label: '조사 노트', icon: UI_KEYS.iconNotebook },
  { kind: 'collection', label: '도감', icon: UI_KEYS.iconCodex },
  { kind: 'deduction', label: '추론', icon: UI_KEYS.iconTimeline },
  { kind: 'settings', label: '설정', icon: UI_KEYS.iconSettings },
];

export function useHudInfo() {
  const scene = useGameStore((s) => s.currentScene);
  const notebook = useGameStore((s) => s.notebook);
  const collection = useGameStore((s) => s.collection);
  const flags = useGameStore((s) => s.flags);
  const past = isPastScene(scene);
  const result = useMemo(() => latestYearResult(notebook), [notebook]);
  const place = useMemo(() => {
    let best: { title: string; stage: number } | null = null;
    // 관측지는 추리로 신원을 확정(단계 3)하기 전까지, 그리고 과거 사건이 일어난 장소일 때만 표시한다.
    // (연구실 자료의 현대 소장처 같은 장소가 과거 장면 HUD 에 새지 않게)
    const eventPlaces = new Set(Object.values(IDX.events).map((ev) => ev.placeId));
    for (const e of entriesOf('place')) {
      const st = stageOf(collection, e.id);
      if (st >= 3 && eventPlaces.has(e.refId) && (!best || st > best.stage)) best = { title: entryView(e, st).title, stage: st };
    }
    return best?.title ?? null;
  }, [collection]);
  return {
    past,
    obs: obsNumber(observationIndex(scene)),
    year: result ? formatYearResult(result.from, result.to, result.verdict) : null,
    place,
    objective: useMemo(() => currentObjective(flags, collection, scene), [flags, collection, scene]),
  };
}

export function Hud({ layout }: { layout: Layout }) {
  const open = useGameStore((s) => s.openModal);
  const info = useHudInfo();
  const [hint, setHint] = useState(false);
  return (
    <header className={`hud hud-${layout}`}>
      <div className="hud-row">
        <div className="hud-id" aria-label="관측 번호">
          <span className="hud-lamp" />
          {info.past ? `관측 ${info.obs}` : '연구실'}
        </div>
        {info.past && (
          <dl className="hud-fields">
            <div>
              <dt>시대</dt>
              <dd>미상</dd>
            </div>
            <div>
              <dt>연도</dt>
              <dd className={info.year ? 'known' : ''}>{info.year ?? '미상'}</dd>
            </div>
            <div>
              <dt>장소</dt>
              <dd className={info.place ? 'known' : ''}>{info.place ?? '미확인'}</dd>
            </div>
          </dl>
        )}
        {layout !== 'portrait' && (
          <nav className="hud-buttons" aria-label="메뉴">
            {BUTTONS.map((b) => (
              <button key={b.kind} className="btn btn-hud" onClick={() => open(b.kind)}>
                <PixelIcon sprite={b.icon} size={20} />
                <span>{b.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
      {info.objective && (
        <button className="hud-objective" onClick={() => setHint((h) => !h)} aria-expanded={hint} title="눌러서 힌트 보기">
          <span className="hud-obj-tag">목표</span>
          <span>{info.objective.text}</span>
          {info.objective.hint && <span className="hud-hint-toggle">{hint ? '힌트 닫기' : '힌트'}</span>}
        </button>
      )}
      {hint && info.objective?.hint && <div className="hud-hint">{info.objective.hint}</div>}
    </header>
  );
}

export function TabBar() {
  const open = useGameStore((s) => s.openModal);
  const modal = useGameStore((s) => s.ui.modal?.kind);
  const tabs: { kind: ModalKind; label: string; icon: string }[] = [
    { kind: 'notebook', label: '노트', icon: UI_KEYS.iconNotebook },
    { kind: 'collection', label: '도감', icon: UI_KEYS.iconCodex },
    { kind: 'deduction', label: '추론', icon: UI_KEYS.iconTimeline },
    { kind: 'settings', label: '설정', icon: UI_KEYS.iconSettings },
  ];
  return (
    <nav className="tabbar" aria-label="메뉴">
      {tabs.map((t) => (
        <button key={t.kind} className={`tabbar-btn ${modal === t.kind ? 'on' : ''}`} onClick={() => open(t.kind)}>
          <PixelIcon sprite={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
