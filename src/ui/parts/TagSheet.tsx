/**
 * 이름 붙이기 시트 — 이 사람은 누구인가. 카드를 탭 → 근거를 탭 → 이름 붙이기(확인). 끌기 없음.
 * 정답은 엔진이 데이터로 판정하고 UI 는 판정 문구만 보여 준다. 실패는 공짜.
 */
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useEpisode, useView } from '@/store/hooks';
import { selectCut, selectTagSheet } from '@/store/selectors';
import { fx } from '../lib/fx';
import { IBan, IWarn, ISearch, IChevR } from './icons';
import { Sheet } from './Sheet';
import { useUi } from '../uiStore';

const KIND = { line: '들은 말', detail: '본 것', fact: '기록' } as const;

function CardTile({ c, sel, dim, onPick, onHold }: { c: { id: string; name: string; hanja: string; roomAnchored: boolean; lifespan?: string }; sel: boolean; dim: boolean; onPick: () => void; onHold: () => void }) {
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  return (
    <button
      className={`pcard${sel ? ' sel' : ''}${dim ? ' dim' : ''}`}
      data-testid={`card-${c.id}`}
      aria-pressed={sel}
      onPointerDown={() => {
        held.current = false;
        t.current = setTimeout(() => {
          held.current = true;
          onHold();
        }, 600);
      }}
      onPointerUp={() => clearTimeout(t.current)}
      onPointerLeave={() => clearTimeout(t.current)}
      onPointerCancel={() => clearTimeout(t.current)}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (held.current) return;
        onPick();
      }}
    >
      <span className="nm">{c.name}</span>
      <span className="hj">{c.hanja}</span>
      <span className="ft">{c.roomAnchored ? '이 방 카드' : (c.lifespan ?? '')}</span>
    </button>
  );
}

export function TagSheet() {
  const target = useGameStore((s) => s.ui.tagTarget);
  const picked = useUi((s) => s.picked);
  const tagCard = useGameStore((s) => s.ui.tagCard);
  const verbs = useEpisode().verbs;
  const [cardId, setCardId] = useState<string | undefined>();
  const [evId, setEvId] = useState<string | undefined>();
  const [fb, setFb] = useState<{ text: string; warn: boolean } | null>(null);

  const key = target ? `${target.cutId}/${target.figureId}` : '';
  useEffect(() => {
    // 찾기에서 돌아오면 고른 카드를 그대로(스토어 ui.tagCard)
    setCardId(useGameStore.getState().ui.tagCard ?? undefined);
    setEvId(undefined);
    setFb(null);
  }, [key, tagCard]);

  const sheet = useView((ep, s) => (target ? selectTagSheet(ep, s, target.cutId, target.figureId, cardId) : null), [key, cardId]);
  const [linked, setLinked] = useState(false);
  useEffect(() => setLinked(false), [key]);
  const cut = useView((ep, s) => (target ? selectCut(ep, s, target.cutId) : null), [key]);

  useEffect(() => {
    if (picked && sheet?.cards.some((c) => c.id === picked)) {
      setCardId(picked);
      setEvId(undefined);
      setFb(null);
    }
    if (picked) useUi.getState().setPicked(null);
  }, [picked, sheet]);

  if (!target || !sheet) return null;
  const close = () => useGameStore.getState().closeTagSheet();
  const figure = cut?.figures.find((f) => f.figureId === target.figureId);

  const confirm = () => {
    if (!cardId || !evId) return;
    const g = useGameStore.getState();
    const out = g.tag(target.figureId, cardId, evId, target.cutId);
    const j = out.judgement;
    if (j.status === 'judged') {
      if (j.verdict === 'ok') return; // 시트는 스토어가 닫는다
      setFb({ text: j.feedback ?? '근거가 이 사람을 가리키지 않는다', warn: j.verdict === 'contradicts' });
      setLinked(j.verdict === 'not_linked');
      if (j.verdict === 'not_linked') return; // 고른 것은 그대로 — 방에서 이어 보고 돌아와 다시
    } else {
      setFb({ text: '근거를 다시 골라 보자', warn: false });
    }
    setCardId(undefined);
    setEvId(undefined);
  };
  const openRoom = () => {
    const g = useGameStore.getState();
    const r = g.openRoomAtCut(target.cutId);
    if (r.status === 'opened') {
      g.closeTagSheet();
      useUi.getState().setRoomFocus(null);
    }
  };
  const toSearch = () => {
    const g = useGameStore.getState();
    const { seed } = g.searchFromTag(cardId);
    useUi.getState().setSearchSeed(seed.length ? seed[0]! : null);
    useUi.setState({ seedTerms: seed });
    useUi.getState().push('search');
  };

  return (
    <Sheet
      title="이 사람은 누구인가"
      onClose={close}
      scrim="clear"
      testId="tag-sheet"
      maxH="68%"
      foot={
        <button className="btn primary" disabled={!cardId || !evId} onClick={confirm} data-testid="tag-confirm">
          이름 붙이기
        </button>
      }
    >
      {figure ? (
        <div className="t-m" style={{ marginTop: -2 }}>
          {figure.label !== '?' ? `겉모습: ${figure.label}` : '겉모습을 알 수 없다'}
        </div>
      ) : null}
      <div className="t-m" style={{ marginTop: 6 }}>
        ① 카드
      </div>
      <div className="cards" data-testid="tag-cards">
        {sheet.cards.map((c) => (
          <CardTile
            key={c.id}
            c={c}
            sel={cardId === c.id}
            dim={!!cardId && cardId !== c.id}
            onPick={() => {
              fx('tap');
              setCardId(cardId === c.id ? undefined : c.id);
              setEvId(undefined);
              setFb(null);
            }}
            onHold={() => {
              if (useGameStore.getState().openCard(c.id)) useUi.getState().openCard(c.id, true);
            }}
          />
        ))}
        {verbs.search ? (
          <button className="pcard more" onClick={toSearch} data-testid="tag-search-more">
            <ISearch />
            <span className="t-m">찾기로 더</span>
          </button>
        ) : null}
      </div>
      {cardId ? (
        <button
          className="ghostlink"
          data-testid="tag-open-card"
          onClick={() => {
            if (useGameStore.getState().openCard(cardId)) useUi.getState().openCard(cardId, true);
          }}
        >
          이 카드 펼쳐 보기 <IChevR size={18} />
        </button>
      ) : null}
      {fb ? (
        <div className={`fb${fb.warn ? ' warn' : ''}`} role="status" data-testid="tag-feedback" data-linked={linked ? 'true' : undefined}>
          <span style={{ display: 'flex', color: fb.warn ? 'var(--alert)' : 'var(--teal)' }}>{fb.warn ? <IWarn /> : <IBan />}</span>
          <span className="t-b">{fb.text}</span>
        </div>
      ) : null}
      <div className="t-m" style={{ margin: '10px 0 8px' }}>
        ② 근거 하나
      </div>
      <div data-testid="tag-evidence">
        {sheet.evidenceAll.length === 0 ? <div className="placeholder t-m">쓸 수 있는 근거가 아직 없다</div> : null}
        {sheet.evidenceAll.map((e) => (
          <button key={e.id} className={`evrow${evId === e.id ? ' sel' : ''}`} data-testid={`ev-${e.id}`} aria-pressed={evId === e.id} onClick={() => { fx('tap'); setEvId(evId === e.id ? undefined : e.id); }}>
            <span className="k">
              <span className="t-m" style={{ color: e.fromThisPersonCut ? 'var(--amber)' : undefined }}>
                {KIND[e.kind]}
              </span>
              {e.time ? <span className="clock t-m">{e.time}</span> : null}
            </span>
            <span className="tx">{e.kind === 'line' ? `「${e.text}」` : e.text}</span>
          </button>
        ))}
      </div>
      {sheet.roomLink ? (
        <button className={`btn secondary${linked ? ' breath' : ''}`} style={{ marginTop: 12 }} data-testid="tag-room-link" onClick={openRoom}>
          {sheet.roomLink.label}
          <span className="clock t-m" style={{ marginLeft: 8, color: 'inherit' }}>
            {sheet.roomLink.time}
          </span>
        </button>
      ) : null}
    </Sheet>
  );
}

