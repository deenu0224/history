/**
 * 기록 카드(종이). 일상 건 = 실록식 머리 + 문장 조각(탭할 수 있는 낱말) · 좌표 손상 건 = 헤더·탐지 한 줄·시스템 권장.
 * 정정이 맞으면 원문으로 돌아오며(먹 번짐) 출처 표시가 붙는다. 도장 자국은 카드 위에 찍힌다. 판정 이력은 카드 뒤에 있다.
 */
import { useEffect, useMemo } from 'react';
import { selectVerdictHistory, useGameStore, type CaseCardView } from '@/store/gameStore';
import { Scramble } from '../components/Scramble';
import { Px } from '../lib/art';
import { fmtMinute, isGlue } from '../lib/desk';
import { fx } from '../lib/fx';
import { useUi } from '../uiStore';
import { doInspect } from './actions';
import { Impression } from './Impression';
import { VerdictHistory } from './VerdictHistory';

export function CardPaper({ card }: { card: CaseCardView }) {
  const st = useGameStore();
  const flipped = useUi((s) => s.flipped);
  const setFlipped = useUi((s) => s.setFlipped);
  const fresh = useUi((s) => s.freshStamp);
  const aId = card.case.assignmentId;
  const history = useMemo(() => (aId && card.done ? selectVerdictHistory(st, aId) : []), [st, aId, card.done]);
  const canFlip = history.length >= 1 && card.done;
  const freshHere = !!fresh && fresh.caseId === card.case.id && Date.now() - fresh.at < 3500;

  // 카드가 바뀌면 앞면으로
  useEffect(() => {
    if (!card.done) setFlipped(false);
  }, [card.case.id, card.done, setFlipped]);

  return (
    <div className={`dc-wrap ${flipped ? 'flipped' : ''} ${freshHere ? 'dc-thud' : ''}`} data-testid="case-card" data-case={card.case.id} data-code={card.code} data-kind={card.kind} data-done={card.done || undefined} data-flipped={flipped || undefined}>
      <div className="dc-face dc-front" aria-hidden={flipped}>
        <Front card={card} freshHere={freshHere} canFlip={canFlip} onFlip={() => (fx('page'), setFlipped(true))} />
      </div>
      {canFlip && (
        <div className="dc-face dc-back" aria-hidden={!flipped}>
          <VerdictHistory entries={history} code={card.code} onBack={() => (fx('page'), setFlipped(false))} />
        </div>
      )}
    </div>
  );
}

function Front({ card, freshHere, canFlip, onFlip }: { card: CaseCardView; freshHere: boolean; canFlip: boolean; onFlip(): void }) {
  const imp = card.impression;
  const msg = useUi((s) => s.cardMsg);
  const clearMsg = useUi((s) => s.clearCardMsg);
  const ghost = useUi((s) => s.ghost);
  const lost = card.kind !== 'routine';

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(clearMsg, msg.tone === 'yellow' ? 4200 : 3600);
    return () => window.clearTimeout(t);
  }, [msg, clearMsg]);

  return (
    <article className={`dcard ${card.done ? 'done' : ''} ${lost ? 'dcard-lost' : ''}`}>
      <header className="dc-head">
        <span className="dc-code" data-testid="case-code">
          {card.code}
        </span>
        <span className="dc-kind">{lost ? (card.kind === 'noise' ? '좌표 손상' : '좌표 손상 · 기록 없음') : '기록 대조'}</span>
        {canFlip && (
          <button type="button" className="dc-flip" data-testid="card-flip" onClick={onFlip}>
            판정 이력
          </button>
        )}
      </header>

      {lost ? <LostBody card={card} hideTodo={!!msg && msg.text === card.notReadyText} /> : <RoutineBody card={card} ghost={ghost?.caseId === card.case.id ? ghost : null} />}

      {card.needsFrame && !card.done && <FramePin card={card} />}
      {card.done && card.needsFrame && card.frame && <FramePin card={card} />}

      {card.restored && (
        <p className="dc-source" data-testid="restored-badge">
          <b className="badge-ok">검증</b>
          <span>
            원문 복원
            {card.sources[0] ? (
              <>
                {' · '}
                <a href={card.sources[0].url} target="_blank" rel="noreferrer noopener">
                  {card.sources[0].title}
                </a>
              </>
            ) : null}
          </span>
        </p>
      )}

      {msg && (
        <p key={msg.n} className={`dc-msg dc-msg-${msg.tone}`} role="status" data-testid="card-msg">
          {msg.text}
        </p>
      )}

      {imp && (
        <div className="dc-stamps" data-testid="impression" data-stamp={imp.stamp}>
          <Impression caseId={card.case.id} stamp={imp.stamp} label={imp.label} engraving={imp.engraving} fresh={freshHere} />
          {imp.overlay && <Impression caseId={card.case.id} stamp="auto_close" system label={imp.overlay} engraving="" fresh={freshHere} delay={300} testId="system-overlay" salt="sys" className="imp-over" scale={2} />}
        </div>
      )}
    </article>
  );
}

function RoutineBody({ card, ghost }: { card: CaseCardView; ghost: { segId: string; from: string } | null }) {
  const cite = card.citation ?? '';
  return (
    <>
      <p className="dc-cite" data-testid="case-citation">
        {cite}
        {card.dateSegments.length > 0 && ' '}
        {card.dateSegments.map((s) => (
          <Seg key={s.id} seg={s} card={card} ghost={ghost} />
        ))}
      </p>
      <p className="dc-text" data-testid="case-text" lang="ko">
        {card.leadingEllipsis && <span className="dc-ell">…</span>}
        {card.segments.map((s) => (isGlue(s.id) ? <span key={s.id}>{s.shown}</span> : <Seg key={s.id} seg={s} card={card} ghost={ghost} />))}
        {card.trailingEllipsis && <span className="dc-ell">…</span>}
      </p>
    </>
  );
}

function Seg({ seg, card, ghost }: { seg: CaseCardView['segments'][number]; card: CaseCardView; ghost: { segId: string; from: string } | null }) {
  const sel = useUi((s) => s.sel);
  const inspect = useUi((s) => s.inspect);
  const select = useUi((s) => s.select);
  const showGloss = useUi((s) => s.showGloss);
  const done = card.done;
  const link = card.links.filter((l) => l.record === seg.id);
  const rel = link.some((l) => l.relation === 'differs') ? 'differs' : link.some((l) => l.relation === 'notation') ? 'notation' : undefined;
  const isSel = sel?.side === 'rec' && sel.id === seg.id;
  const restoredHere = card.restored && ghost?.segId === seg.id;
  const gloss = seg.gloss;

  const tap = () => {
    if (gloss) showGloss(gloss.term, gloss.gloss);
    if (!inspect || done) return;
    fx('tap');
    if (isSel) return select(null);
    if (sel?.side === 'obs') return void doInspect(seg.id, sel.id);
    select({ side: 'rec', id: seg.id });
  };

  return (
    <button
      type="button"
      className={`dseg ${gloss ? 'has-gloss' : ''} ${isSel ? 'sel' : ''} ${inspect && !done ? 'pick' : ''} ${!done && rel ? `ln-${rel}` : ''} ${restoredHere ? 'dseg-restored' : ''}`}
      data-testid={`seg-${seg.id}`}
      data-seg={`rec:${seg.id}`}
      aria-pressed={isSel}
      onClick={tap}
    >
      {restoredHere && (
        <span className="dseg-ghost" aria-hidden="true">
          {ghost!.from}
        </span>
      )}
      <span className="dseg-text">{seg.shown}</span>
    </button>
  );
}

function LostBody({ card, hideTodo }: { card: CaseCardView; hideTodo?: boolean }) {
  const aId = card.case.assignmentId ?? '';
  // 시스템 권장을 따르지 않은 도장(불일치 · 보고서)이면 권장 문구에 줄이 그어진다 — 내가 그 권장을 거슬렀다
  const overruled = card.done && !!card.impression && card.impression.stamp !== 'auto_close';
  return (
    <div className="dc-lost">
      <dl className="dc-meta">
        {(card.header ?? []).map((h) => (
          <div key={h.key} className={`dc-meta-row meta-${h.key}`}>
            <dt>{h.label}</dt>
            <dd data-testid={`assign-${h.key}`}>
              <Scramble text={h.value} playKey={`assignment:${aId}`} label={h.label} />
            </dd>
          </div>
        ))}
      </dl>
      {card.detection && (
        <p className="dc-detect" data-testid="case-detection">
          <Scramble text={card.detection} playKey={`case:${card.case.id}`} />
        </p>
      )}
      {card.recommend && (
        <p className={`dc-recommend ${overruled ? 'overruled' : ''}`} data-testid="case-recommend">
          {card.recommend}
        </p>
      )}
      {!card.done && card.notReadyText && !card.ready && !hideTodo && <p className="dc-todo">{card.notReadyText}</p>}
    </div>
  );
}

function FramePin({ card }: { card: CaseCardView }) {
  const f = card.frame;
  return (
    <div className={`dc-frame ${f ? 'has' : 'empty'}`} data-testid="case-frame" data-has={f ? '1' : '0'}>
      <Px k="desk_pin" scale={2} className="dc-pin" />
      {f ? (
        <>
          {f.thumbDataUrl ? <img src={f.thumbDataUrl} alt="" draggable={false} /> : <i className="dc-frame-ph" />}
          <span className="dc-frame-cap">
            근거 프레임 · {fmtMinute(f.minute)}
            <small>{card.frameShows.length > 0 ? '관측 낱말이 담겼다' : '담긴 낱말이 없다'}</small>
          </span>
        </>
      ) : (
        <span className="dc-frame-cap">
          근거 프레임 <small>규정 4조 · 셔터로 붙인다</small>
        </span>
      )}
    </div>
  );
}
