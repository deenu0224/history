import { useEffect, useRef, useState } from 'react';
import { completion, entryView, stageOf, STAGE_LABELS } from '@/core/collection';
import type { CollectionCategory, CollectionEntry } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { Chip, CATEGORY_ICON, entrySprite, PixelIcon, Pips, Tabs } from '../components/kit';
import { CATEGORY_LABEL, CATEGORY_ORDER, CONTENT, IDX, entriesOf } from '../lib/content';
import { pct } from '../lib/format';
import { useUi } from '../uiStore';

export function CodexScreen() {
  const modalId = undefined as string | undefined;
  const collection = useGameStore((s) => s.collection);
  const initial = modalId ? IDX.collection[modalId] : undefined;
  const [cat, setCat] = useState<CollectionCategory>(initial?.category ?? 'artifact');
  const [sel, setSel] = useState<string | null>(initial?.id ?? null);
  const fresh = useUi((s) => s.fresh);
  const clearFresh = useUi((s) => s.clearFresh);

  const tabs = CATEGORY_ORDER.map((c) => ({
    id: c,
    label: CATEGORY_LABEL[c],
    badge: pct(completion(CONTENT.collection, collection, c).ratio),
  }));
  const stats = completion(CONTENT.collection, collection, cat);
  const entries = entriesOf(cat);
  const entry = sel ? IDX.collection[sel] : undefined;

  const choose = (e: CollectionEntry) => {
    setSel(e.id);
    clearFresh(e.id);
  };

  return (
    <div className="codex-wrap" data-testid="codex">
      <Tabs
        tabs={tabs}
        value={cat}
        onChange={(c) => {
          setCat(c);
          setSel(null);
        }}
        className="tabs-scroll"
      />
      <div className={`codex ${entry ? 'has-detail' : ''}`}>
        <div className="codex-list scroll">
          <div className="codex-stat">
            <span>
              {CATEGORY_LABEL[cat]} 수집 {stats.discovered}/{stats.total}
            </span>
            <span className="codex-bar">
              <i style={{ width: pct(stats.ratio) }} />
            </span>
            <b>{pct(stats.ratio)}</b>
          </div>
          {entries.length === 0 && <p className="empty">이 분류의 항목이 아직 없다.</p>}
          <div className="grid-entries">
            {entries.map((e) => (
              <EntryTile key={e.id} entry={e} stage={stageOf(collection, e.id)} selected={sel === e.id} fresh={e.id in fresh} onClick={() => choose(e)} />
            ))}
          </div>
        </div>
        <div className="codex-detail scroll">
          {entry ? (
            <EntryDetail entry={entry} onBack={() => setSel(null)} />
          ) : (
            <p className="empty">항목을 선택하면 지금까지 알아낸 정보가 나타난다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryTile({ entry, stage, selected, fresh, onClick }: { entry: CollectionEntry; stage: number; selected: boolean; fresh: boolean; onClick(): void }) {
  const prev = useRef(stage);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (stage > prev.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 1400);
      prev.current = stage;
      return () => clearTimeout(t);
    }
    prev.current = stage;
  }, [stage]);
  const v = entryView(entry, stage as 0);
  const locked = stage === 0;
  return (
    <button className={`tile ${selected ? 'on' : ''} ${locked ? 'locked' : ''} ${pop ? 'pop' : ''}`} onClick={onClick} aria-label={v.title}>
      <span className="tile-icon">
        <PixelIcon sprite={locked ? CATEGORY_ICON[entry.category] : entrySprite(entry)} size={56} locked={locked} />
        {stage >= 5 && <span className="tile-star">★</span>}
        {fresh && <span className="tile-new">NEW</span>}
      </span>
      <span className="tile-title">{v.title}</span>
      <Pips value={stage} />
    </button>
  );
}

function EntryDetail({ entry, onBack }: { entry: CollectionEntry; onBack(): void }) {
  const stage = useGameStore((s) => stageOf(s.collection, entry.id));
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const collection = useGameStore((s) => s.collection);
  const openSource = useGameStore((s) => s.openSource);
  const inLibrary = useGameStore((s) => s.sources.includes(entry.refId));
  const v = entryView(entry, stage);
  const locked = stage === 0;
  const linked = (entry.links ?? []).map((id) => IDX.collection[id]).filter((e): e is CollectionEntry => !!e && stageOf(collection, e.id) >= 1);
  const stageNote = stage >= 5 ? '도감 완성' : `다음 단계: ${STAGE_LABELS[(stage + 1) as 1]}`;
  return (
    <article className="detail" key={`${entry.id}:${stage}`}>
      <button className="btn btn-small detail-back" onClick={onBack}>
        ← 목록
      </button>
      <div className="detail-hero">
        <PixelIcon sprite={locked ? CATEGORY_ICON[entry.category] : entrySprite(entry)} size={96} locked={locked} className="detail-art" />
        <div>
          <h3 className={locked ? 'locked-name' : ''}>{v.title}</h3>
          <div className="detail-sub">
            <Chip tone={stage >= 3 ? 'good' : 'plain'}>{v.stageLabel}</Chip>
            <Pips value={stage} />
          </div>
          <small className="dim">{stageNote}</small>
        </div>
      </div>
      {locked ? (
        <p className="empty">아직 발견하지 못했다. 관측과 조사로 단서를 찾자.</p>
      ) : (
        <dl className="fields">
          {v.fields.map((f) => (
            <div key={f.key} className="field">
              <dt>{f.label}</dt>
              <dd>
                {f.value}
                {showProv && f.provenance && f.provenance !== 'verified' && <span className="prov-mark">{f.provenance === 'reconstructed' ? '재구성' : '가상'}</span>}
              </dd>
            </div>
          ))}
          {v.fields.length === 0 && <p className="empty">더 조사하면 정보가 채워진다.</p>}
        </dl>
      )}
      {!locked && entry.category === 'source' && inLibrary && (
        <button className="btn btn-primary" onClick={() => openSource(entry.refId)}>
          사료 열람
        </button>
      )}
      {linked.length > 0 && stage >= 4 && (
        <div className="linked">
          <h4>연결된 기록</h4>
          <div className="linked-list">
            {linked.map((l) => (
              <Chip key={l.id}>{entryView(l, stageOf(collection, l.id)).title}</Chip>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
