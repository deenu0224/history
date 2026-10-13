import { entryView, stageOf } from '@/core/collection';
import { UI_KEYS } from '@/game/art';
import { useGameStore } from '@/store/gameStore';
import { Chip, PixelIcon } from '../components/kit';
import { IDX } from '../lib/content';
import { isTyping, useKey } from '../hooks';
import { useUi } from '../uiStore';

/** 사료 열람: 전체 화면 리더. 원문은 정보 검증(3단계) 이후, provenance 가 verified 일 때만 '원문'으로 표시한다. */
export function ReaderOverlay({ entryId }: { entryId: string }) {
  const setOverlay = useUi((s) => s.setOverlay);
  const stage = useGameStore((s) => stageOf(s.collection, entryId));
  const entry = IDX.collection[entryId];
  const src = entry ? IDX.sources[entry.refId] : undefined;
  const close = () => setOverlay(null);
  useKey((e) => {
    if (e.key === 'Escape' && !isTyping(e)) close();
  });
  if (!entry || !src) {
    return (
      <div className="reader" role="dialog">
        <div className="reader-bar">
          <button className="btn" onClick={close}>
            ← 돌아가기
          </button>
        </div>
        <p className="empty">열람할 수 없는 사료다.</p>
      </div>
    );
  }
  const v = entryView(entry, stage);
  const verified = src.provenance === 'verified';
  const canRead = stage >= 3;
  return (
    <div className="reader" role="dialog" aria-label={v.title}>
      <div className="reader-bar">
        <button className="btn" onClick={close}>
          ← 돌아가기
        </button>
        <span className="reader-badge">
          <PixelIcon sprite={verified && stage >= 3 ? UI_KEYS.iconCheck : UI_KEYS.iconQuestion} size={20} />
          {stage >= 3 ? (verified ? '검증된 사료' : src.provenance === 'reconstructed' ? '재구성 자료' : '가상 자료') : '검증 전'}
        </span>
      </div>
      <article className="reader-page">
        <h2>{v.title}</h2>
        {src.hanja && stage >= 2 && <div className="reader-hanja">{src.hanja}</div>}
        <dl className="reader-meta">
          {stage >= 2 && src.compiled !== undefined && (
            <div>
              <dt>편찬</dt>
              <dd>{src.compiled}년</dd>
            </div>
          )}
          {stage >= 2 && src.author && (
            <div>
              <dt>저자·편자</dt>
              <dd>{src.author}</dd>
            </div>
          )}
          <div>
            <dt>열람 단계</dt>
            <dd>{v.stageLabel}</dd>
          </div>
        </dl>
        <p className="reader-summary">{src.summary}</p>
        {canRead && src.excerpt ? (
          <section className="reader-excerpt">
            <h3>{verified ? '원문 · 국역 발췌' : '발췌 (재구성)'}</h3>
            <blockquote>{src.excerpt}</blockquote>
            {!verified && <p className="dim">이 발췌는 실제 사료의 원문이 아니다.</p>}
          </section>
        ) : (
          <p className="empty">{canRead ? '이 사료의 발췌문은 수록되어 있지 않다.' : '정보를 검증하면 발췌문을 읽을 수 있다.'}</p>
        )}
        {stage >= 3 && src.sources && src.sources.length > 0 && (
          <section className="reader-links">
            <h3>출처</h3>
            <ul>
              {src.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                  {s.note && <small> — {s.note}</small>}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Chip tone="dim">{src.provenance === 'verified' ? '출처 확인됨' : src.provenance === 'reconstructed' ? '재구성' : '가상 설정'}</Chip>
      </article>
    </div>
  );
}
