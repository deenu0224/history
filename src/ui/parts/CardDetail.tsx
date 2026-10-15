/** 인물 카드 상세 — 카드처럼(모서리 구멍·종이). 줄을 탭하면 출처가 펼쳐진다. 변조(소실 세계)·지워짐·복원 상태를 구분해 보인다. */
import { useEffect, useState } from 'react';
import type { SourceRef } from '@/core/types';
import { useGameStore } from '@/store/gameStore';
import { useEpisode, useView } from '@/store/hooks';
import { selectCard, type CardView } from '@/store/selectors';
import { fx } from '../lib/fx';
import { hanjaSegs, splitTerms } from '../lib/text';
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

type FactView = CardView['facts'][number];

/** 괄호 속 한자는 작고 옅게(한글 읽기가 앞에 있다) */
function Hj({ text }: { text: string }) {
  return (
    <>
      {hanjaSegs(text).map((h, i) =>
        h.hj ? (
          <span key={i} className="hj">
            {h.text}
          </span>
        ) : (
          <span key={i}>{h.text}</span>
        ),
      )}
    </>
  );
}

/** 카드 한 줄: 낱말 링크(탭 → 인물 카드 +1) · 먹선(성공한 이름 붙이기가 그은 근거). 긴 줄은 두 줄로 접고 ▾ 로 전문과 출처를 펼친다. */
function FactRow({ f, open, fresh, evText, onToggle }: { f: FactView; open: boolean; fresh: boolean; evText?: string; onToggle: () => void }) {
  const segs = splitTerms(f.text, f.links.map((l) => l.term));
  const follow = (cardId: string) => {
    const g = useGameStore.getState();
    const link = f.links.find((l) => l.cardId === cardId)!;
    if (link.found) {
      if (g.openCard(cardId)) useUi.getState().openCard(cardId);
      return;
    }
    fx('tap');
    g.followFactLink(f.id, cardId);
  };
  // 아직 얻지 않은 링크가 있거나 먹선이 그어진 줄은 접지 않는다(눌러야 할 것·근거가 가려지지 않게)
  const clamp = !open && !f.linkedBy && !f.links.some((l) => !l.found);
  return (
    <div className={`fact${f.linkedBy ? ' linked' : ''}${fresh ? ' ink-new' : ''}`} data-fact={f.id} data-linked={f.linkedBy ? 'true' : undefined}>
      <div className="l">
        <span className="sq" />
        <span className="t-b keep" style={{ flex: 1, minWidth: 0, color: 'var(--card-ink)' }}>
          <span className={`${f.linkedBy ? 'ink' : ''}${clamp ? ' fclamp' : ''}`}>
            {segs.map((sg, i) => {
              const link = sg.term ? f.links.find((l) => l.term === sg.term) : undefined;
              return link ? (
                <button key={i} className={`flink${link.found ? ' found' : ''}`} data-testid={`flink-${link.cardId}`} aria-label={link.found ? `${sg.text}, 인물 카드 열기` : `${sg.text}, 인물 카드 얻기`} onClick={() => follow(link.cardId)}>
                  {sg.text}
                </button>
              ) : (
                <Hj key={i} text={sg.text} />
              );
            })}
          </span>
          {f.linkedBy && evText ? (
            <span className="inkline t-m" data-testid="ink-line">
              먹선 · <Hj text={evText} />
            </span>
          ) : null}
        </span>
        <button className="chevbtn" aria-label={clamp ? '펼치기 · 출처' : '출처'} aria-expanded={open} onClick={onToggle}>
          <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : undefined }}>
            <IChevD />
          </span>
        </button>
      </div>
      {open ? <Src s={f.source} /> : null}
    </div>
  );
}

export function CardDetail() {
  const ref = useUi((s) => s.card);
  const card = useView((ep, s) => (ref ? selectCard(ep, s, ref.id) : null), [ref?.id]);
  const [open, setOpen] = useState<string | null>(null);
  const inkNew = useUi((s) => s.inkNew);
  const ep = useEpisode();
  const evidenceText = (id?: string) => {
    if (!id) return undefined;
    const l = ep.lines.find((x) => x.id === id);
    if (l) return `들은 말 「${l.text}」`;
    const d = ep.details.find((x) => x.id === id);
    return d ? `본 것 · ${d.label}` : undefined;
  };
  useEffect(() => setOpen(null), [ref?.id]);
  useEffect(() => {
    if (!ref) useUi.setState({ inkNew: [] });
  }, [ref]);
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
            <span className="t-m" style={{ color: '#6a7480' }}>
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
            <FactRow key={f.id} f={f} open={open === f.id} fresh={inkNew.includes(f.id)} evText={evidenceText(f.linkedBy)} onToggle={() => setOpen(open === f.id ? null : f.id)} />
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
