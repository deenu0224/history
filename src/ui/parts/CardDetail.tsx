/** 인물 카드 상세 — 카드처럼(모서리 구멍·종이). 줄을 탭하면 출처가 펼쳐진다. 변조(소실 세계)·지워짐·복원 상태를 구분해 보인다. */
import { useEffect, useState } from 'react';
import type { SourceRef } from '@/core/types';
import { useView } from '@/store/hooks';
import { selectCard } from '@/store/selectors';
import { EyeIcon } from './icons';
import { IBack, IChevD, IClose, IExt } from './icons';
import { useUi } from '../uiStore';

function Src({ s }: { s: SourceRef }) {
  return (
    <div className="src">
      출처 · {s.title}
      {s.note ? ` — ${s.note}` : ''}
      <br />
      <a href={s.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}>
        {s.url.replace(/^https?:\/\//, '')} <IExt size={14} />
      </a>
    </div>
  );
}

export function CardDetail() {
  const ref = useUi((s) => s.card);
  const card = useView((ep, s) => (ref ? selectCard(ep, s, ref.id) : null), [ref?.id]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => setOpen(null), [ref?.id]);
  useEffect(() => {
    if (!ref) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && useUi.getState().closeCard();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [ref]);
  if (!ref || !card) return null;
  const close = () => useUi.getState().closeCard();
  const eyeLook = card.eyeLine.includes('열림') ? 'open' : card.eyeLine.includes('닫힘') ? 'closed' : 'never';
  return (
    <div className="scr" style={{ zIndex: 40, background: '#0b0a09' }} data-screen="card" data-card={card.id}>
      <div className="bar">
        <button className="ibtn" aria-label="뒤로" onClick={close}>
          <IBack />
        </button>
        <span className="title" />
        <button className="ibtn" aria-label="닫기" onClick={close} data-testid="card-close">
          <IClose />
        </button>
      </div>
      <div className="body">
        <div className="cardfull" data-testid="card-full">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="t-h" data-testid="card-name">
              {card.name}
            </span>
            <span className="t-b" style={{ color: '#4b5561' }}>
              {card.hanja}
            </span>
          </div>
          {card.lifespan ? (
            <div className="t-b" style={{ color: '#4b5561', marginTop: 2 }}>
              {card.lifespan}
            </div>
          ) : null}
          <div className="rule" />
          {card.facts.map((f) => (
            <button key={f.id} className="fact" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
              <span className="l">
                <span className="sq" />
                <span className="t-b keep" style={{ flex: 1, color: 'var(--card-ink)' }}>
                  {f.text}
                </span>
                <span style={{ color: '#4b5561', marginTop: 2, transform: open === f.id ? 'rotate(180deg)' : undefined }}>
                  <IChevD />
                </span>
              </span>
              {open === f.id ? <Src s={f.source} /> : null}
            </button>
          ))}
          {card.altered.map((a) => (
            <button key={a.id} className="fact alt" onClick={() => setOpen(open === a.id ? null : a.id)} data-testid={`altered-${a.state}`}>
              <span className="l">
                <span className="sq" />
                <span className="t-b keep" style={{ flex: 1, color: a.state === 'erased' ? '#5f7f84' : 'var(--card-ink)' }}>
                  {a.state === 'erased' ? (
                    <>
                      <span className="u-alt">{a.label}</span> — 기록이 지워졌다
                    </>
                  ) : a.state === 'restored' ? (
                    <span className="u-ver">{a.text}</span>
                  ) : (
                    <span className="u-alt">{a.text}</span>
                  )}
                </span>
                {a.state === 'restored' ? <IChevD /> : null}
              </span>
              {open === a.id && a.state === 'restored' && a.source ? <Src s={a.source} /> : null}
            </button>
          ))}
          {card.eyeExtra.map((x, i) => (
            <button key={i} className="fact" onClick={() => setOpen(open === `x${i}` ? null : `x${i}`)}>
              <span className="l">
                <span className="sq" />
                <span className="t-b keep" style={{ flex: 1, color: 'var(--card-ink)' }}>
                  {x.text}
                </span>
                <IChevD />
              </span>
              {open === `x${i}` ? <Src s={x.source} /> : null}
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 14 }}>
            <span style={{ filter: 'brightness(.62) saturate(1.2)' }}>
              <EyeIcon look={eyeLook} />
            </span>
            <span className="t-b keep" data-testid="card-eye">
              {card.eyeLine}
            </span>
          </div>
        </div>
      </div>
      {ref.picking ? (
        <div className="foot">
          <button
            className="btn primary"
            data-testid="card-pick"
            onClick={() => {
              useUi.getState().setPicked(card.id);
              close();
            }}
          >
            이 사람으로
          </button>
        </div>
      ) : null}
    </div>
  );
}
