/** 메신저: 대화 목록 + 말풍선. 안 읽은 메시지는 닫힌 풍선을 탭해 읽는다(타이핑 표시 → 펼침). 밑줄 말은 바로 검색. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message, MessageThread } from '@/core/types';
import { selectInbox, useGameStore } from '@/store/gameStore';
import { Px } from '../lib/art';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { useRewriteText } from '../lib/rewrites';
import { TermText } from '../lib/terms';
import { ObjectivePin } from '../os/Widgets';
import { prefersReducedMotion, useBackHandler, useWidth } from '../hooks';

const THREADS: { id: MessageThread; name: string; avatar: string }[] = [
  { id: 'colleague', name: '한 선임', avatar: 'avatar_colleague_a' },
  { id: 'device', name: '관측 장치', avatar: 'avatar_colleague_b' },
  { id: 'system', name: '결록 단말', avatar: 'avatar_system' },
  { id: 'mail', name: '관측 기록', avatar: 'avatar_system' },
];
const ME = '나';

function useInbox(thread?: MessageThread) {
  const inbox = useGameStore((s) => s.inbox);
  const read = useGameStore((s) => s.read);
  const replies = useGameStore((s) => s.replies);
  return useMemo(
    () => selectInbox(useGameStore.getState(), CONTENT, thread),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inbox, read, replies, thread],
  );
}

export function Messenger() {
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root, 360);
  const wide = width >= 620;
  const [sel, setSel] = useState<MessageThread | null>(null);
  const all = useInbox();
  const threads = THREADS.filter((t) => all.some((i) => i.message.thread === t.id));

  useBackHandler(!wide && sel !== null, () => {
    setSel(null);
    return true;
  });

  const target = useGameStore((s) => s.ui.appTarget);
  useEffect(() => {
    // 다른 곳에서 특정 메시지로 열었을 때
    if (!target) return;
    const m = CONTENT.messages.find((x) => x.id === target);
    if (m) setSel(m.thread);
  }, [target]);

  return (
    <div className={`msgr ${wide ? 'msgr-wide' : ''}`} ref={root} data-testid="app-messenger">
      {(wide || sel === null) && (
        <aside className="msgr-list">
          <ObjectivePin compact />
          <ul>
            {threads.map((t) => (
              <ThreadRow key={t.id} thread={t.id} name={t.name} avatar={t.avatar} active={sel === t.id} onOpen={() => setSel(t.id)} />
            ))}
          </ul>
        </aside>
      )}
      {(wide || sel !== null) && (
        <section className="msgr-conv">
          {sel ? (
            <Conversation key={sel} thread={sel} onBack={wide ? undefined : () => setSel(null)} />
          ) : (
            <p className="empty">대화를 선택하세요.</p>
          )}
        </section>
      )}
    </div>
  );
}

function ThreadRow({ thread, name, avatar, active, onOpen }: { thread: MessageThread; name: string; avatar: string; active: boolean; onOpen(): void }) {
  const items = useInbox(thread);
  const unread = items.filter((i) => !i.read).length;
  const last = items[items.length - 1]?.message;
  const preview = unread ? '새 메시지' : (last?.text ?? '');
  return (
    <li>
      <button
        type="button"
        className={`thread ${active ? 'on' : ''} ${unread ? 'unread blink' : ''}`}
        data-testid={`thread-${thread}`}
        data-coach={unread ? 'messenger.unread' : undefined}
        onClick={() => {
          fx('tap');
          onOpen();
        }}
      >
        <Px k={avatar} scale={1} className="avatar" />
        <span className="thread-main">
          <b>{name}</b>
          <span className="thread-preview">{preview}</span>
        </span>
        {unread > 0 && <span className="badge">{unread}</span>}
      </button>
    </li>
  );
}

function Conversation({ thread, onBack }: { thread: MessageThread; onBack?: () => void }) {
  const items = useInbox(thread);
  const meta = THREADS.find((t) => t.id === thread)!;
  const readMessage = useGameStore((s) => s.readMessage);
  const [typing, setTyping] = useState<string | null>(null);
  const chain = useRef(false);
  const timer = useRef<number>(0);
  const scroller = useRef<HTMLDivElement>(null);
  const fast = prefersReducedMotion();

  const firstUnread = items.find((i) => !i.read)?.message;

  const reveal = useCallback(
    (id: string) => {
      setTyping(id);
      timer.current = window.setTimeout(
        () => {
          setTyping(null);
          const m = readMessage(id);
          fx('message');
          if (!chain.current || !m) return;
          // 답장을 기다리는 선택지가 있으면 거기서 멈춘다
          if (m.choices?.length) return;
          const next = selectInbox(useGameStore.getState(), CONTENT, thread).find((i) => !i.read)?.message;
          if (next) timer.current = window.setTimeout(() => reveal(next.id), fast ? 60 : 380);
        },
        fast ? 60 : 650,
      );
    },
    [readMessage, thread, fast],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 시스템·장치 대화는 열면 알아서 읽힌다(탭 동사는 동료 대화에서 익힌다)
  useEffect(() => {
    if (thread === 'colleague') return;
    const first = items.find((i) => !i.read)?.message;
    if (first && !typing) {
      chain.current = true;
      reveal(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, items.length]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: fast ? 'auto' : 'smooth' });
  }, [items.length, typing, items.filter((i) => i.read).length, fast]);

  const onOpenClosed = (m: Message) => {
    if (typing) return;
    chain.current = true;
    fx('tap');
    reveal(m.id);
  };

  return (
    <div className="conv" data-testid={`conv-${thread}`}>
      <header className="conv-head">
        {onBack && (
          <button className="conv-back" aria-label="대화 목록" onClick={onBack}>
            ‹
          </button>
        )}
        <Px k={meta.avatar} scale={1} className="avatar" />
        <b>{meta.name}</b>
      </header>
      <div className="conv-scroll" ref={scroller}>
        {items.map((it, i) => {
          const m = it.message;
          const prev = items[i - 1]?.message;
          const showName = m.from !== ME && (!prev || prev.from !== m.from);
          if (!it.read) {
            if (m.id === firstUnread?.id) {
              return typing === m.id ? (
                <TypingBubble key={m.id} from={showName ? m.from : undefined} avatar={meta.avatar} />
              ) : (
                <ClosedBubble key={m.id} from={m.from} avatar={meta.avatar} onOpen={() => onOpenClosed(m)} />
              );
            }
            return typing === m.id ? <TypingBubble key={m.id} avatar={meta.avatar} /> : null;
          }
          return <Bubble key={m.id} message={m} reply={it.reply} showName={showName} avatar={meta.avatar} />;
        })}
        {items.length === 0 && <p className="empty">아직 대화가 없습니다.</p>}
      </div>
    </div>
  );
}

function ClosedBubble({ from, avatar, onOpen }: { from: string; avatar: string; onOpen(): void }) {
  return (
    <div className="row row-in">
      <Px k={avatar} scale={1} className="avatar sm" />
      <button type="button" className="bubble closed blink" data-testid="msg-closed" data-coach="messenger.unread" onClick={onOpen}>
        <span className="closed-dot" aria-hidden="true" />
        <span>{from}의 새 메시지</span>
        <span className="closed-hint">탭하여 읽기</span>
      </button>
    </div>
  );
}

function TypingBubble({ from, avatar }: { from?: string; avatar: string }) {
  return (
    <div className="row row-in">
      <Px k={avatar} scale={1} className="avatar sm" />
      <div className="bubble typing" aria-label={`${from ?? ''} 입력 중`} data-testid="msg-typing">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function Bubble({ message: m, reply, showName, avatar }: { message: Message; reply?: string; showName: boolean; avatar: string }) {
  const mine = m.from === ME;
  const answerChoice = reply ? m.choices?.find((c) => c.id === reply) : undefined;
  const rw = useRewriteText('message', m.id, m.text);
  const [src, setSrc] = useState(false);
  const chooseReply = useGameStore((s) => s.chooseReply);
  const showProv = useGameStore((s) => s.settings.showProvenance);
  const extra = m.grants?.terms ?? [];
  return (
    <>
      <div className={`row ${mine ? 'row-out' : 'row-in'}`} data-testid={`msg-${m.id}`}>
        {!mine && <Px k={avatar} scale={1} className="avatar sm" />}
        <div className={`bubble pop ${mine ? 'mine' : ''} ${m.provenance === 'verified' ? 'verified' : ''} ${rw.busy ? 'rewriting' : ''}`}>
          {showName && <b className="from">{m.from}</b>}
          <p>{rw.busy ? rw.text : <TermText text={m.text} extra={extra} />}</p>
          {m.provenance === 'verified' && m.sources && m.sources.length > 0 && (
            <button type="button" className="src-btn" aria-label="출처" aria-expanded={src} onClick={() => setSrc((v) => !v)}>
              <Px k="icon_check" scale={1} /> 출처
            </button>
          )}
          {showProv && m.provenance !== 'verified' && <span className="prov-mark">{m.provenance === 'reconstructed' ? '재구성' : '가상'}</span>}
          {src && (
            <ul className="src-list">
              {m.sources?.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {m.choices && m.choices.length > 0 && !reply && (
        <div className="choices" role="group" aria-label="답장">
          {m.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="choice"
              data-testid={`choice-${c.id}`}
              onClick={() => {
                fx('tap');
                if (chooseReply(m.id, c.id)) fx('message');
              }}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}
      {answerChoice && (
        <div className="row row-out" data-testid={`reply-${m.id}`}>
          <div className="bubble mine pop">
            <p>{answerChoice.text}</p>
          </div>
        </div>
      )}
    </>
  );
}
