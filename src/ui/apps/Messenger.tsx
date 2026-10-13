/**
 * 메신저: 오 실장 · 한 선임 · 시스템 · 복원심의위원회. 힌트는 여기로만 온다.
 * 복원 뒤 지난 대화가 그 자리에서 다시 쓰인다(스크램블 → 굳음). 바뀐 줄 옆의 작은 연필 표시는 나에게만 있다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { selectInbox, selectRewrittenMessages, useGameStore, type InboxItem } from '@/store/gameStore';
import { Scramble } from '../components/Scramble';
import { useBackHandler, useWidth } from '../hooks';
import { Px } from '../lib/art';
import { fx } from '../lib/fx';
import { THREAD_LABEL, THREAD_ORDER, threadOf, type ThreadKey } from '../lib/text';
import { useUi } from '../uiStore';

const AVATAR: Record<ThreadKey, string> = {
  chief: 'avatar_colleague_a',
  senior: 'avatar_colleague_b',
  system: 'avatar_system',
  committee: 'avatar_system',
  me: 'avatar_player',
};

export function MessengerApp() {
  const st = useGameStore();
  const revealed = useUi((s) => s.revealed);
  const thread = useUi((s) => s.thread);
  const openThread = useUi((s) => s.openThread);
  const typing = useUi((s) => s.typing);
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box, 390);
  const wide = w >= 640;

  const items = useMemo(() => selectInbox(st).filter((i) => revealed.includes(i.message.id)), [st.inbox, st.read, st.replies, st.shifts, revealed]); // eslint-disable-line react-hooks/exhaustive-deps
  const byThread = useMemo(() => {
    const m = new Map<ThreadKey, InboxItem[]>();
    for (const i of items) {
      const k = threadOf(i.message);
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return m;
  }, [items]);
  const keys = THREAD_ORDER.filter((k) => byThread.has(k) || typing?.thread === k);
  const active: ThreadKey | null = thread && keys.includes(thread) ? thread : wide ? (keys[0] ?? null) : null;
  useBackHandler(!wide && active !== null, () => (openThread(null), true));

  return (
    <div className={`msgr ${wide ? 'msgr-wide' : ''}`} data-testid="app-messenger" ref={box}>
      {(wide || active === null) && (
        <ul className="threads" data-testid="threads">
          {keys.map((k) => {
            const list = byThread.get(k) ?? [];
            const last = list[list.length - 1];
            const unread = list.filter((i) => !i.read).length;
            return (
              <li key={k}>
                <button
                  type="button"
                  className={`thread ${active === k ? 'on' : ''} ${unread ? 'blink' : ''}`}
                  data-testid={`msg-thread-${k}`}
                  onClick={() => (fx('tap'), openThread(k))}
                >
                  <Px k={AVATAR[k]} scale={2} className="thread-av" />
                  <span className="thread-main">
                    <b>{THREAD_LABEL[k]}</b>
                    <span className="thread-last">{typing?.thread === k ? '입력 중…' : (last?.message.text ?? '')}</span>
                  </span>
                  {unread > 0 && <i className="thread-badge">{unread}</i>}
                </button>
              </li>
            );
          })}
          {keys.length === 0 && <li className="quiet pad">받은 메시지가 없다.</li>}
        </ul>
      )}
      {active !== null && (
        <Chat
          k={active}
          list={byThread.get(active) ?? []}
          back={wide ? undefined : () => openThread(null)}
          typing={typing?.thread === active ? typing.from : null}
        />
      )}
    </div>
  );
}

function Chat({ k, list, back, typing }: { k: ThreadKey; list: InboxItem[]; back?: () => void; typing: string | null }) {
  const st = useGameStore();
  const scroller = useRef<HTMLDivElement>(null);
  const rewritten = selectRewrittenMessages(st);
  const play = useUi((s) => s.rewritePlay);
  const [orig, setOrig] = useState<Record<string, boolean>>({});

  // 열려 있는 동안 도착한 메시지는 읽은 것으로
  useEffect(() => {
    for (const i of list) if (!i.read) useGameStore.getState().readMessage(i.message.id);
  }, [list]);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length, typing, st.replies]);

  const pending = [...list].reverse().find((i) => i.message.choices?.length && !i.reply);

  return (
    <section className="chat" data-testid={`msg-chat-${k}`} aria-label={THREAD_LABEL[k]}>
      <header className="chat-head">
        {back && (
          <button type="button" className="chat-back" aria-label="대화 목록" data-testid="msg-back" onClick={back}>
            ←
          </button>
        )}
        <Px k={AVATAR[k]} scale={2} />
        <h3>{THREAD_LABEL[k]}</h3>
      </header>
      <div className="chat-log" ref={scroller} role="log" aria-live="polite">
        {list.map(({ message: m, reply }) => {
          const mine = m.from === '나' && k !== 'me';
          const rw = rewritten[m.id];
          const playing = !!play[`message:${m.id}`];
          const inner = k === 'me';
          return (
            <div key={m.id} className="msg-wrap">
              <div className={`bubble ${mine ? 'mine' : ''} ${inner ? 'inner' : ''} ${m.provenance === 'verified' ? 'quoted' : ''}`} data-testid={`msg-${m.id}`}>
                {!mine && !inner && k !== 'chief' && k !== 'senior' && <small className="bubble-from">{m.from}</small>}
                <span className="bubble-text">
                  <Scramble text={m.text} playKey={`message:${m.id}`} rich />
                </span>
                {rw && !playing && (
                  <button
                    type="button"
                    className={`pencil-mark ${orig[m.id] ? 'on' : ''}`}
                    data-testid={`msg-pencil-${m.id}`}
                    aria-label="내가 처음 본 문장"
                    aria-pressed={!!orig[m.id]}
                    onClick={() => (fx('tap'), setOrig((o) => ({ ...o, [m.id]: !o[m.id] })))}
                  >
                    ✎
                  </button>
                )}
              </div>
              {rw && orig[m.id] && !playing && (
                <p className="orig" data-testid={`msg-orig-${m.id}`}>
                  <small>내가 본 처음 문장</small>
                  {rw.original}
                </p>
              )}
              {m.clock && !inner && <span className={`bubble-clock ${mine ? 'r' : ''}`}>{m.clock}</span>}
              {reply && (
                <div className="bubble mine" data-testid={`reply-${m.id}`}>
                  <span className="bubble-text">{m.choices?.find((c) => c.id === reply)?.text}</span>
                </div>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="bubble typing" data-testid="msg-typing" aria-label={`${typing} 입력 중`}>
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      {pending && (
        <div className="choices" data-testid="choices">
          {pending.message.choices!.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn choice"
              data-testid={`choice-${c.id}`}
              onClick={() => {
                fx('tap');
                useGameStore.getState().chooseReply(pending.message.id, c.id);
              }}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
