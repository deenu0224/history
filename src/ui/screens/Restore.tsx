/**
 * 복원 — 돌아오는 기록. 기사 → 홈(일시·장소) → 인물 카드 → 메시지 → 그날의 방 → 로그 → 독백 → 예고.
 * 따뜻한 먹 번짐으로 한지에서 시작해 단말로 돌아온다. 현실 재기록: 같은 자리의 글자가 한 자씩 바뀐다. UI_STYLE_GUIDE §2.10
 */
import { useEffect, useRef, useState } from 'react';
import { setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectMessenger, selectRestoration } from '@/store/selectors';
import { IExt } from '../parts/icons';
import { goNextEpisode } from '../lib/flow';
import { shorten } from '../lib/text';
import { FROM_LABEL } from '../lib/format';
import { HomeRecord } from '../parts/HomeRecord';
import { Scramble } from '../parts/Scramble';
import { useUi } from '../uiStore';
import { ChatList } from './Messenger';

function Article({ r }: { r: NonNullable<ReturnType<typeof selectRestoration>> }) {
  const [fold, setFold] = useState(false);
  const [openLong, setOpenLong] = useState<Record<number, boolean>>({});
  return (
    <div className="sheetpaper hanji" style={{ margin: '0 4px' }} data-testid="restored-article">
      <div className="t-m read" style={{ color: '#6b5e45', lineHeight: '22px' }}>
        {r.article.citation}
      </div>
      <p className="article" style={{ margin: '10px 0 14px' }}>
        {r.article.parts.map((p, i) => {
          if (p.folded)
            return (
              <button key={i} className="fold" style={{ font: 'inherit' }} onClick={() => setFold(!fold)} aria-expanded={fold}>
                ……
              </button>
            );
          // 긴 단락(상소 전문 등)은 접어 둘 수 있다 — 글자는 그대로, 펼치면 전문
          if (p.long) {
            const sh = shorten(p.text, 78);
            const open = !sh.truncated || openLong[i];
            return (
              <span key={i} className={p.by === 'me' ? 'me' : 'sk'} data-by={p.by} data-long={open ? 'open' : 'folded'}>
                {i > 0 ? ' ' : ''}
                {open ? p.text : `${sh.head} `}
                {sh.truncated ? (
                  <button className="fold" style={{ font: 'inherit' }} data-testid="article-long-toggle" aria-expanded={!!open} onClick={() => setOpenLong({ ...openLong, [i]: !open })}>
                    {open ? ' [접기]' : '…… 펼치기'}
                  </button>
                ) : null}
              </span>
            );
          }
          return (
            <span key={i} className={p.by === 'me' ? 'me' : 'sk'} data-by={p.by}>
              {i > 0 ? ' ' : ''}
              {p.text}
            </span>
          );
        })}
      </p>
      {fold ? (
        <p className="t-m" style={{ color: '#6b5e45' }}>
          {r.article.parts.find((p) => p.folded)?.folded?.note}
        </p>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <span className="seal" aria-label="실록 도장">
          <b>實錄</b>
          <small>실록</small>
        </span>
        <a className="t-m" style={{ color: '#2d5f7a', textDecoration: 'underline' }} href={r.article.source.url} target="_blank" rel="noreferrer noopener">
          {r.article.source.title} <IExt size={14} />
        </a>
      </div>
    </div>
  );
}

export function Restore() {
  const r = useView(selectRestoration);
  const reduce = useGameStore((s) => s.settings.reduceMotion);
  const chat = useView((ep, s) => selectMessenger(ep, s, useGameStore.getState().now()));
  const [idx, setIdx] = useState(() => {
    const s = useGameStore.getState();
    return s.epilogueDone ? 0 : s.restoreStep;
  });
  const chatRef = useRef<HTMLDivElement>(null);
  // 복원 뒤에 온 말만(옛 대화가 밀려 있어도 이 장면은 그 뒤 말을 보인다)
  const tail = { ...chat, items: chat.items.filter((m) => m.burstId === 'ev.restore') };
  const bridgeTail = { ...chat, items: chat.items.filter((m) => m.burstId === 'ev.teaser') };
  const clock = useGameStore((s) => s.clock);
  const step = r?.steps[idx];

  useEffect(() => {
    try {
      setMusic(!useGameStore.getState().settings.music ? 'none' : step === 'monologue' || step === 'teaser' || step === 'bridge' ? 'ending' : 'restore');
    } catch {
      /* 오디오 없음 */
    }
  }, [step]);
  useEffect(() => {
    if (step !== 'messages') return;
    useGameStore.getState().openMessenger();
    return () => useGameStore.getState().closeMessenger();
  }, [step]);
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.items.length, !!chat.typing, step]);


  if (!r || !step) return <div className="scr" />;
  const last = idx >= r.steps.length - 1;
  const next = () => {
    const g = useGameStore.getState();
    if (last) {
      g.finishEpilogue();
      // 다음 에피소드가 있으면 다리 뒤 그 콜드 오픈으로, 없으면 홈
      if (r.next && goNextEpisode(r.next)) return;
      useUi.getState().home();
      return;
    }
    if (!g.epilogueDone) {
      g.advanceRestore();
      setIdx(useGameStore.getState().restoreStep);
    } else setIdx(idx + 1);
  };
  const now = useGameStore.getState().now();

  return (
    <div className="scr" data-screen="restore" data-step={step}>
      <div className="paperbar" style={{ paddingLeft: 20 }}>
        <span className="t-m">
          {idx + 1} / {r.steps.length}
        </span>
      </div>
      <div className="rbody" key={step}>
        {step === 'article' ? <Article r={r} /> : null}

        {step === 'home' ? (
          <div className="card-assign restored" style={{ margin: '8px 0' }} data-testid="restore-home">
            <div className="t-h">빈자리 {r.home.after.code}</div>
            <div className="kv" style={{ gridTemplateColumns: '56px 1fr', marginTop: 14, rowGap: 10 }}>
              <span className="t-m">일시</span>
              <span className="t-b read" data-testid="restore-date">
                <Scramble from={r.home.before.date} to={r.home.after.date} ms={1600} delay={400} reduce={reduce} />
              </span>
              <span className="t-m">장소</span>
              <span className="t-b">
                <Scramble from={r.home.before.place} to={r.home.after.place} ms={1600} delay={900} reduce={reduce} />
              </span>
              <span className="t-m">상태</span>
              <span className="t-b amber">
                <Scramble from={r.home.before.status} to={r.home.after.status} ms={1000} delay={1400} reduce={reduce} />
              </span>
            </div>
            {r.home.after.record ? <HomeRecord record={r.home.after.record} before={r.home.before.record} reduce={reduce} /> : null}
            {r.home.after.placeNote ? (
              <p className="t-m keep" style={{ margin: '14px 0 0' }}>
                {r.home.after.placeNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 'cards' ? (
          <div data-testid="restore-cards">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              인물 카드에서 바뀐 줄
            </div>
            {r.cards.flatMap((c) =>
              c.changes.map((ch, i) => (
                <div key={`${c.cardId}${i}`} className="ba">
                  <div className="t-b" style={{ fontWeight: 600 }}>
                    {c.name}
                  </div>
                  <div className="t-b was keep">{ch.before.text || `${ch.before.label}: 기록이 지워졌다`}</div>
                  <div className="t-b now keep read">
                    <Scramble from={ch.before.text || ch.before.label} to={ch.after.text} ms={1800} delay={500} reduce={reduce} />
                  </div>
                  {ch.after.source ? (
                    <a className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={ch.after.source.url} target="_blank" rel="noreferrer noopener">
                      {ch.after.source.title} <IExt size={14} />
                    </a>
                  ) : null}
                </div>
              )),
            )}
          </div>
        ) : null}

        {step === 'messages' ? (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }} data-testid="restore-messages">
            <div className="t-m" style={{ margin: '4px 0 8px' }}>
              대화에서 다시 쓰인 말
            </div>
            {r.messages.length === 0 ? <div className="t-m">바뀐 말이 없다.</div> : null}
            {r.messages.map((m) => (
              <div key={m.id} className={`ba${m.from === 'me' ? ' mine' : ''}`} data-testid="rewritten-msg" data-from={m.from}>
                <div className="t-m">{FROM_LABEL[m.from] ?? ''}</div>
                <div className="t-b was keep">{m.before}</div>
                <div className="t-b now keep">
                  <Scramble from={m.before} to={m.after} ms={2000} delay={600} reduce={reduce} />
                </div>
              </div>
            ))}
            <ChatList view={tail} now={now} scrollRef={chatRef} />
          </div>
        ) : null}

        {step === 'room' ? (
          <div data-testid="restore-room">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              그날의 방
            </div>
            {r.room ? (
              <div className="ba">
                <div className="t-b">그날 「?」 로 남았던 두 관원</div>
                <div className="t-h read" style={{ margin: '8px 0' }}>
                  {r.room.pairLabel}
                </div>
                <a className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={r.room.source.url} target="_blank" rel="noreferrer noopener">
                  {r.room.source.title} <IExt size={14} />
                </a>
              </div>
            ) : null}
            <button className="btn secondary" onClick={() => useGameStore.getState().openRoom('14:05')} data-testid="restore-open-room">
              그날의 방 보기
            </button>
          </div>
        ) : null}

        {step === 'log' ? (
          <div data-testid="restore-log">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              내 관측 로그는 그대로 남는다
            </div>
            {r.absence.map((a, i) => (
              <div key={i} className="ba">
                <div className="t-m">
                  <span className="clock">{a.clock}</span> · 찾기 「{a.query}」
                </div>
                <div className="t-b">{a.text}</div>
              </div>
            ))}
            {r.witnessLines.map((w) => (
              <div key={w.lineId} className="ba">
                <div className="t-b keep read" style={{ color: 'var(--hanji-muted)', borderBottom: '1.5px dashed var(--hanji-muted)', display: 'inline' }}>
                  {w.text}
                </div>
                <div className="t-m" style={{ marginTop: 6 }}>
                  {w.note}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 'monologue' ? (
          <div className="mono" style={{ paddingTop: 40 }} data-testid="restore-monologue">
            {r.monologue.map((l, i) => (
              <p key={i} style={{ animationDelay: reduce ? '0s' : `${i * 1.6}s` }}>
                {l}
              </p>
            ))}
          </div>
        ) : null}

        {step === 'neighbour' ? (
          <div data-testid="restore-neighbour">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              이웃 기록도 함께 돌아왔다
            </div>
            {r.asides.length === 0 ? <div className="t-m">이웃 기록이 없다.</div> : null}
            {r.asides.map((a) => (
              <div key={a.id} className="ba" data-testid={`aside-${a.id}`}>
                <div className="t-b" style={{ fontWeight: 600 }}>
                  {a.title}
                </div>
                {a.before ? <div className="t-b was keep">{a.before.join(' ')}</div> : null}
                <div className="t-b now keep read">
                  {a.lines.map((l, i) => (
                    <div key={i}>
                      <Scramble from={a.before?.join(' ') ?? ''} to={l.text} ms={2200} delay={600} reduce={reduce} />
                    </div>
                  ))}
                </div>
                {a.tag ? (
                  <div className="t-m" style={{ color: 'var(--amber)', marginTop: 4 }}>
                    {a.tag}
                  </div>
                ) : null}
                {a.lines.map((l, i) => (
                  <a key={i} className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={l.source.url} target="_blank" rel="noreferrer noopener">
                    {l.source.title} <IExt size={14} />
                  </a>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {step === 'bridge' ? (
          <div data-testid="restore-bridge" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div className="bridge-clock" data-testid="bridge-clock">
              {clock}
            </div>
            <ChatList view={bridgeTail} now={now} scrollRef={chatRef} />
          </div>
        ) : null}

        {step === 'teaser' && r.teaser ? (
          <div data-testid="restore-teaser">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              새로 들어온 문서
            </div>
            <div className="ba">
              <div className="t-b" style={{ fontWeight: 600 }}>
                {r.teaser.title}
              </div>
              <div className="t-m">{r.teaser.subtitle}</div>
              {r.teaser.lines.map((l, i) => (
                <div key={i} className="t-b keep" style={{ marginTop: 6 }}>
                  {l}
                </div>
              ))}
            </div>
            <p className="t-m keep" style={{ marginTop: 18 }}>
              다음 빈자리가 기다린다.
            </p>
          </div>
        ) : null}
      </div>
      {step === 'messages' && chat.choices && useGameStore.getState().messenger.choice?.burstId === 'ev.restore' ? (
        <div className="replies" data-testid="replies">
          {chat.choices.map((c) => (
            <button key={c.id} className="reply t-b" data-testid={`reply-${c.id}`} onClick={() => useGameStore.getState().chooseReply(c.id)}>
              {c.text}
            </button>
          ))}
        </div>
      ) : null}
      <div className="foot">
        <button className="btn primary" onClick={next} data-testid="restore-next">
          {last ? (r.next ? '다음 빈자리 ▸' : '홈으로') : '다음 ▸'}
        </button>
      </div>
    </div>
  );
}
