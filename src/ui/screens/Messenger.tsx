/** 메신저 — 한 선임과의 대화. 한 말풍선 = 한 문장, 입력 중 표시, 망설임, 읽음, 자리 비움, 내 차례의 선택지. UI_STYLE_GUIDE §2.8, DIALOGUE_GUIDE */
import { useEffect, useRef } from 'react';
import type { MessengerView } from '@/core/messenger';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectMessenger } from '@/store/selectors';
import { fx } from '../lib/fx';
import { FROM_LABEL, FROM_MARK } from '../lib/format';
import { IBack, IDoc } from '../parts/icons';
import { Scramble } from '../parts/Scramble';
import { useUi } from '../uiStore';

export function ChatList({ view, now, scrollRef, limit, scramble }: { view: MessengerView; now: number; scrollRef?: React.RefObject<HTMLDivElement | null>; limit?: number; scramble?: boolean }) {
  const items = limit ? view.items.slice(-limit) : view.items;
  const lastMineRead = (() => {
    for (let i = items.length - 1; i >= 0; i--) if (items[i]!.from === 'me') return items[i]!.readAt !== undefined && items[i]!.readAt! <= now ? items[i]!.id : null;
    return null;
  })();
  return (
    <div className="chat" ref={scrollRef} data-testid="chat" aria-live="polite">
      {items.map((m, i) => {
        const next = items[i + 1];
        const prev = items[i - 1];
        if (m.kind === 'system') {
          return (
            <div key={m.id} className="sysline" data-testid="sys-msg">
              {m.display}
            </div>
          );
        }
        if (m.from === 'me') {
          return (
            <div key={m.id} style={{ display: 'contents' }}>
              <div className="msg me" data-testid="my-msg">
                <div className="bub t-b">{m.display}</div>
              </div>
              {lastMineRead === m.id ? <div className="read-receipt" data-testid="read-receipt">읽음</div> : null}
            </div>
          );
        }
        const lastOfGroup = !next || next.from !== m.from || next.kind === 'system';
        const firstOfGroup = !prev || prev.from !== m.from || prev.kind === 'system';
        if (m.kind === 'attach')
          return (
            <div key={m.id} className="msg" data-testid="attach-msg">
              <span className={`mini${lastOfGroup ? '' : ' hide'}`}>{FROM_MARK[m.from]}</span>
              <button
                className="attach"
                onClick={() => {
                  if (m.docId && useGameStore.getState().openDoc(m.docId)) useUi.getState().setDoc(m.docId);
                }}
              >
                <IDoc />
                <span className="t-b" style={{ flex: 1 }}>
                  {m.display}
                </span>
              </button>
            </div>
          );
        return (
          <div key={m.id} className={`msg ${m.from}`} data-testid="their-msg" data-rewritten={m.rewritten ? 'true' : 'false'}>
            <span className={`mini${lastOfGroup ? '' : ' hide'}`}>{FROM_MARK[m.from]}</span>
            <div className="bub t-b">
              {firstOfGroup && m.from !== 'han' ? <div className="t-m" style={{ lineHeight: '20px', color: 'var(--amber)' }}>{FROM_LABEL[m.from]}</div> : null}
              {scramble && m.rewritten ? <Scramble from={m.text} to={m.display} ms={2000} delay={600} /> : m.display}
            </div>
          </div>
        );
      })}
      {view.typing ? (
        <div className="msg typing" data-testid="typing" aria-label="입력 중">
          <span className="mini">{FROM_MARK[view.typing.from]}</span>
          <div className="bub">
            <i />
            <i />
            <i />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Messenger() {
  const now = useGameStore.getState().now();
  const view = useView((ep, s) => selectMessenger(ep, s, useGameStore.getState().now()));
  const ref = useRef<HTMLDivElement>(null);
  const count = view.items.length;

  useEffect(() => {
    useGameStore.getState().openMessenger();
    useUi.getState().clearBanner();
    return () => useGameStore.getState().closeMessenger();
  }, []);
  // 열어 둔 동안 새로 온 것도 읽음 처리
  useEffect(() => {
    if (view.unread > 0) useGameStore.getState().readMessage();
  }, [view.unread]);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, !!view.typing, !!view.choices]);

  return (
    <div className="scr" data-screen="messenger">
      <div className="chat-head">
        <button className="ibtn" aria-label="뒤로" onClick={() => useUi.getState().pop()} data-testid="messenger-back">
          <IBack />
        </button>
        <span className="avatar">韓</span>
        <div style={{ flex: 1 }}>
          <div className="nm">한 선임</div>
          <div className="pres" data-testid="presence" data-presence={view.presence}>
            <i className={view.presence === 'away' ? 'away' : ''} />
            {view.presence === 'online' ? '온라인' : '자리 비움'}
          </div>
        </div>
      </div>
      <ChatList view={view} now={now} scrollRef={ref} />
      {view.choices ? (
        <div className="replies" data-testid="replies">
          {view.choices.map((c) => (
            <button
              key={c.id}
              className="reply t-b"
              data-testid={`reply-${c.id}`}
              onClick={() => {
                fx('tap');
                useGameStore.getState().chooseReply(c.id);
              }}
            >
              {c.text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
