/**
 * 복원된 빈자리 카드 — 복원 단계 「홈」(카드가 뒤집히며 빈자리 → 복원됨)과 복원 뒤 홈이 같이 쓴다.
 * 한 카드 안에: 일시·장소가 채워지고, 돌아온 줄은 짧게(두 줄), 이웃 기록은 한 줄. 전문은 「전문 펼치기」 뒤에 접어 둔다.
 * UI_STYLE_GUIDE §2.10
 */
import { useState, type ReactNode } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectRestoration, selectRewrite } from '@/store/selectors';
import { GlossText } from './GlossText';
import { HomeRecord } from './HomeRecord';
import { IChevD, IExt } from './icons';
import { Scramble } from './Scramble';

type R = NonNullable<ReturnType<typeof selectRestoration>>;

/** 그날 실록 전문(내가 다시 쓴 줄은 진하게, 실록이 채운 줄은 옅게). 접어 둔 채 시작 */
export function FullPassage({ r }: { r: R }) {
  const [open, setOpen] = useState(false);
  const [fold, setFold] = useState(false);
  return (
    <div className="fullpassage" data-testid="restored-article">
      <button className="fulltoggle t-b" data-testid="article-full-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? '전문 접기' : '전문 펼치기'}
        <span style={{ display: 'inline-flex', transform: open ? 'rotate(180deg)' : undefined }}>
          <IChevD />
        </span>
      </button>
      {open ? (
        <div className="sheetpaper hanji fp-paper">
          <div className="t-m read" style={{ color: '#6b5e45', lineHeight: '22px' }}>
            {r.article.citation}
          </div>
          <p className="article" style={{ margin: '10px 0 14px' }} data-testid="article-full">
            {r.article.parts.map((p, i) =>
              p.folded ? (
                <button key={i} className="fold" style={{ font: 'inherit' }} onClick={() => setFold(!fold)} aria-expanded={fold}>
                  ……
                </button>
              ) : (
                <span key={i} className={p.by === 'me' ? 'me' : 'sk'} data-by={p.by}>
                  {i > 0 ? ' ' : ''}
                  <GlossText text={p.text} />
                </span>
              ),
            )}
          </p>
          {fold ? (
            <p className="t-m" style={{ color: '#6b5e45' }}>
              {r.article.parts.find((p) => p.folded)?.folded?.note}
            </p>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="seal" aria-label="실록 도장">
              <b>實錄</b>
              <small>실록</small>
            </span>
            <a className="t-m" style={{ color: '#2d5f7a', textDecoration: 'underline' }} href={r.article.source.url} target="_blank" rel="noreferrer noopener">
              {r.article.source.title} <IExt size={14} />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 그날 기록이 통째로 지워진 날(홈 카드에 문장이 없다): 내가 다시 쓴 첫 줄을 짧게 */
function KeyLine() {
  const lines = useView((ep, s) => selectRewrite(ep, s).lines.filter((l) => l.result === 'restored'));
  const first = lines[0];
  if (!first) return null;
  return (
    <div className="home-record" data-testid="restored-keyline">
      <div className="t-m hr-title">돌아온 줄</div>
      <p className="read keep hr-text clamp2">
        「
        {first.render.parts.map((p, i) =>
          p.slot ? (
            <span key={i} className="hr-gap filled who">
              {p.text}
            </span>
          ) : (
            <span key={i}>
              <GlossText text={p.text} />
            </span>
          ),
        )}
        」
      </p>
      {lines.length > 1 ? <div className="t-m hr-src">다시 쓴 줄 {lines.length}줄이 모두 실록으로 돌아왔다</div> : null}
    </div>
  );
}

export function RestoredCard({ animate = false, children, testId }: { animate?: boolean; children?: ReactNode; testId?: string }) {
  const r = useView(selectRestoration);
  const reduce = useGameStore((s) => s.settings.reduceMotion);
  if (!r) return null;
  const a = r.home.after;
  const b = r.home.before;
  const anim = animate && !reduce;
  // 이웃 기록(홈 카드의 아래 줄)이 돌아왔다는 꼬리표 — 한 줄
  const asideTag = a.record ? r.asides.find((x) => x.tag)?.tag : undefined;
  return (
    <div className={`card-assign restored${anim ? ' flipin' : ''}`} data-testid={testId}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="t-h">{a.code}</div>
        <span className="t-m amber" data-testid="card-status">
          {animate ? <Scramble from={b.status} to={a.status} ms={900} delay={700} reduce={reduce} /> : a.status}
        </span>
      </div>
      <div className="kv">
        <span className="t-m">일시</span>
        <span className="t-b read" data-testid={animate ? 'restore-date' : 'home-date'}>
          {animate ? <Scramble from={b.date} to={a.date} ms={1400} delay={600} reduce={reduce} /> : a.date}
        </span>
        <span className="t-m">장소</span>
        <span className="t-b" data-testid={animate ? 'restore-place' : 'home-place'}>
          {animate ? <Scramble from={b.place} to={a.place} ms={1400} delay={900} reduce={reduce} /> : a.place}
        </span>
      </div>
      {a.record ? <HomeRecord record={a.record} before={animate ? b.record : undefined} reduce={reduce} short /> : <KeyLine />}
      {asideTag ? (
        <div className="t-m amber aside-tag" data-testid="aside-tag">
          {asideTag}
        </div>
      ) : null}
      {a.placeNote ? (
        <p className="t-m keep" style={{ margin: '8px 0 0' }}>
          {a.placeNote}
        </p>
      ) : null}
      <FullPassage r={r} />
      {children}
    </div>
  );
}
