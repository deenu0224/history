import { useMemo, useState } from 'react';
import { stageOf } from '@/core/collection';
import { FACT_LABELS } from '@/core/content';
import type { CollectionCategory, CollectionEntry, ContentItem } from '@/core/types';
import { UI_KEYS } from '@/game/art';
import { useGameStore } from '@/store/gameStore';
import { Chip, CATEGORY_ICON, Empty, Modal, PixelIcon } from '../components/kit';
import { CATEGORY_LABEL, CONTENT, IDX } from '../lib/content';
import { DB_NOTE_PREFIX } from '../lib/format';
import { SCRIPT } from '../lib/script';
import { useUi } from '../uiStore';

const CATS: CollectionCategory[] = ['person', 'artifact', 'source', 'event', 'place'];
type Raw = ContentItem & { name?: string; title?: string; hanja?: string; summary?: string };

function rawOf(e: CollectionEntry): Raw | undefined {
  const table = { person: IDX.persons, artifact: IDX.artifacts, source: IDX.sources, event: IDX.events, place: IDX.places }[e.category] as Record<string, Raw>;
  return table[e.refId];
}
const nameOf = (r: Raw | undefined, e: CollectionEntry) => r?.name ?? r?.title ?? e.title;

/** 역사 데이터베이스: 연구실에서 조회하는 실제 기록 열람기. 도감 단계는 올리지 않고(신원 확인은 추리로), 열람 기록만 남긴다. */
export function DatabaseScreen() {
  const setOverlay = useUi((s) => s.setOverlay);
  const collection = useGameStore((s) => s.collection);
  const addNote = useGameStore((s) => s.addNote);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CollectionCategory | 'all'>('all');
  const [sel, setSel] = useState<string | null>(null);

  const available = useMemo(
    () =>
      CONTENT.collection.filter((e) => {
        if (SCRIPT.databaseEntryIds) return SCRIPT.databaseEntryIds.includes(e.id) || stageOf(collection, e.id) >= 1;
        const raw = rawOf(e);
        return raw?.provenance === 'verified' || stageOf(collection, e.id) >= 1;
      }),
    [collection],
  );
  const shown = available.filter((e) => {
    if (cat !== 'all' && e.category !== cat) return false;
    const raw = rawOf(e);
    const hay = `${nameOf(raw, e)} ${raw?.hanja ?? ''} ${raw?.summary ?? ''}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });
  const entry = sel ? IDX.collection[sel] : undefined;
  const raw = entry ? rawOf(entry) : undefined;

  const pick = (e: CollectionEntry) => {
    setSel(e.id);
    if (e.category === 'person') addNote({ id: `${DB_NOTE_PREFIX}${e.id}`, section: 'verified', text: `역사 DB 열람: ${nameOf(rawOf(e), e)}` });
  };

  return (
    <Modal title="역사 데이터베이스" icon={UI_KEYS.iconMagnifier} onClose={() => setOverlay(null)} wide className="modal-db">
      <div className="db-search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 한자 · 키워드 검색" aria-label="검색" />
        <div className="chooser">
          {(['all', ...CATS] as const).map((c) => (
            <button key={c} className={`pill ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {c === 'all' ? '전체' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>
      <div className={`codex ${entry ? 'has-detail' : ''}`}>
        <div className="codex-list scroll">
          {shown.length === 0 && <Empty>조건에 맞는 기록이 없다.</Empty>}
          <ul className="db-list">
            {shown.map((e) => (
              <li key={e.id}>
                <button className={`db-row ${sel === e.id ? 'on' : ''}`} onClick={() => pick(e)}>
                  <PixelIcon sprite={CATEGORY_ICON[e.category]} size={24} />
                  <span>
                    <b>{nameOf(rawOf(e), e)}</b>
                    <small>{CATEGORY_LABEL[e.category]}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="codex-detail scroll">
          {entry && raw ? (
            <article className="detail">
              <button className="btn btn-small detail-back" onClick={() => setSel(null)}>
                ← 목록
              </button>
              <h3>
                {nameOf(raw, entry)} {raw.hanja && <small className="dim">{raw.hanja}</small>}
              </h3>
              <div className="detail-sub">
                <Chip>{CATEGORY_LABEL[entry.category]}</Chip>
                <Chip tone={raw.provenance === 'verified' ? 'good' : 'dim'}>{raw.provenance === 'verified' ? '출처 확인' : raw.provenance === 'reconstructed' ? '재구성' : '가상'}</Chip>
              </div>
              <p className="db-summary">{raw.summary}</p>
              {'born' in raw || 'died' in raw ? (
                <p className="dim">
                  생몰: {(raw as { born?: number }).born ?? '?'} ~ {(raw as { died?: number }).died ?? '?'}
                </p>
              ) : null}
              {'facts' in raw && Array.isArray((raw as { facts: unknown[] }).facts) && (
                <dl className="fields">
                  {(raw as { facts: { kind: keyof typeof FACT_LABELS; value: string }[] }).facts.map((f, i) => (
                    <div key={i} className="field">
                      <dt>{FACT_LABELS[f.kind]}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {raw.sources && raw.sources.length > 0 && (
                <section className="reader-links">
                  <h4>출처</h4>
                  <ul>
                    {raw.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {entry.category === 'source' && stageOf(collection, entry.id) >= 2 && (
                <button className="btn btn-primary" onClick={() => setOverlay({ kind: 'reader', entryId: entry.id })}>
                  사료 열람
                </button>
              )}
            </article>
          ) : (
            <p className="empty">기록을 선택하면 상세 정보가 나타난다. 인물을 열람해 두면 인물 추리의 후보로 쓸 수 있다.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
