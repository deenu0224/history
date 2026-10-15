/** 메신저 — 한 선임과의 대화. 한 말풍선 = 한 문장, 입력 중 표시, 망설임, 읽음, 자리 비움, 내 차례의 선택지. UI_STYLE_GUIDE §2.8, DIALOGUE_GUIDE */
import { useEffect, useRef } from 'react';
import type { MessengerView, MsgView } from '@/core/messenger';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectMessenger } from '@/store/selectors';
import { fx } from '../lib/fx';
import { FROM_LABEL, FROM_MARK } from '../lib/format';
import { IBack, IDoc } from '../parts/icons';
import { useUi } from '../uiStore';

/** 말풍선 글. 현실 재기록으로 바뀐 말은 아무 표시·효과 없이 지금 글만 보인다(원래 글은 화면에 오지 않는다). */
function BubText({ m }: { m: MsgView }) {
  return <span data-testid="bub-text">{m.display}</span>;
}

export function ChatList({ view, now, scrollRef, limit }: { view: MessengerView; now: number; scrollRef?: React.RefObject<HTMLDivElement | null>; limit?: number }) {
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
              <div className="msg me" data-testid="my-msg" data-msg-id={m.id} data-rewritten={m.rewritten ? 'true' : 'false'}>
                <div className="bub t-b">
                  <BubText m={m} />
                </div>
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
          <div key={m.id} className={`msg ${m.from}`} data-testid="their-msg" data-msg-id={m.id} data-rewritten={m.rewritten ? 'true' : 'false'}>
            <span className={`mini${lastOfGroup ? '' : ' hide'}`}>{FROM_MARK[m.from]}</span>
            <div className="bub t-b">
              {firstOfGroup && m.from !== 'han' ? <div className="t-m" style={{ lineHeight: '20px', color: 'var(--amber)' }}>{FROM_LABEL[m.from]}</div> : null}
              <BubText m={m} />
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
  // 맨 아래에 있을 때만 새 말을 따라 내려간다 — 거슬러 올라가 읽는 동안은 끌어내리지 않는다
  const atBottom = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => void (atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [count, !!view.typing, !!view.choices]);

  return (
    <div className="scr" data-screen="messenger">
      <div className="chat-head">
        <button className="ibtn" aria-label="뒤로" onClick={() => useUi.getState().pop()} data-testid="messenger-back">
          <IBack />
        </button>
        <span className="avatar">한</span>
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
      ) : (
        <div className="askbar">
          <button
            className="askhint"
            data-testid="ask-hint"
            disabled={!!view.typing}
            onClick={() => {
              fx('tap');
              useGameStore.getState().askHint();
            }}
          >
            어디부터 볼까요?
          </button>
        </div>
      )}
    </div>
  );
}
