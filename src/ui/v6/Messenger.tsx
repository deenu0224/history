/** v6 메신저: 한 선임·관측기 줄. 기존 v5 대화 틀(CSS)을 그대로 쓰고, 데이터만 v6 스토어에서 읽는다. */
import { useEffect, useRef } from 'react';
import { selectMessenger } from '@/store/v6/store';
import { FROM_LABEL, FROM_MARK } from '../lib/format';
import { useV6 } from './store';

export function MessengerScreen() {
  const s = useV6((st) => st.s);
  const view = selectMessenger(s, Date.now());
  const ref = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const items = view.items;

  useEffect(() => {
    useV6.getState().openMessenger();
  }, [view.unread]);
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
  }, [items.length, !!view.typing, !!view.choices]);

  return (
    <div className="v6-msgr" data-screen="messenger" data-testid="messenger">
      <div className="chat-head">
        <span className="avatar">한</span>
        <div style={{ flex: 1 }}>
          <div className="nm">한 선임</div>
          <div className="pres" data-presence={view.presence}>
            <i className={view.presence === 'away' ? 'away' : ''} />
            {view.presence === 'online' ? '온라인' : '자리 비움'}
          </div>
        </div>
      </div>
      <div className="chat" ref={ref} data-testid="chat" aria-live="polite">
        {items.map((m, i) => {
          const prev = items[i - 1];
          const next = items[i + 1];
          if (m.kind === 'system')
            return (
              <div key={m.id} className="sysline" data-testid="sys-msg">
                {m.display}
              </div>
            );
          if (m.from === 'me')
            return (
              <div key={m.id} className="msg me" data-testid="my-msg">
                <div className="bub t-b">{m.display}</div>
              </div>
            );
          const last = !next || next.from !== m.from || next.kind === 'system';
          const first = !prev || prev.from !== m.from || prev.kind === 'system';
          return (
            <div key={m.id} className={`msg ${m.from}`} data-testid="their-msg" data-msg-id={m.id} data-rewritten={m.rewritten ? 'true' : 'false'}>
              <span className={`mini${last ? '' : ' hide'}`}>{FROM_MARK[m.from]}</span>
              <div className="bub t-b">
                {first && m.from !== 'han' ? <div className="t-m" style={{ lineHeight: '20px', color: 'var(--amber)' }}>{FROM_LABEL[m.from]}</div> : null}
                {m.display}
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
      {view.choices ? (
        <div className="replies" data-testid="replies">
          {view.choices.map((c) => (
            <button key={c.id} className="reply t-b" data-testid={`reply-${c.id}`} onClick={() => useV6.getState().chooseReply(c.id)}>
              {c.text}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
