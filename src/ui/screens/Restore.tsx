/**
 * 복원 뒤 — 세 박자. 복원의 순간(빈칸이 채워지고 출처가 붙음)은 기록 다시 쓰기 화면 안에서 이미 지나갔다.
 *  ① 홈 카드가 뒤집혀 「복원됨」(일시·장소, 돌아온 줄 짧게, 이웃 기록 한 줄, 전문은 「전문 펼치기」)
 *  (Ep1 만) 바뀐 것 — 인물 카드에서 다시 쓰인 줄 · 그날의 방 「?」의 짝 이름 · 그대로 남은 로그 한 줄
 *  ② 짧은 독백 → ③ 다리(Ep0: 대화창 23:04) / 예고(Ep1). UI_STYLE_GUIDE §2.10
 */
import { useEffect, useRef, useState } from 'react';
import { setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectMessenger, selectRestoration } from '@/store/selectors';
import { IExt } from '../parts/icons';
import { goNextEpisode } from '../lib/flow';
import { GlossText } from '../parts/GlossText';
import { RestoredCard } from '../parts/RestoredCard';
import { Scramble } from '../parts/Scramble';
import { useUi } from '../uiStore';
import { ChatList } from './Messenger';

/** 다시 쓰이는 글: 굳으면 어려운 말에 풀이가 붙는다 */
function ScrambleGloss(props: { from: string; to: string; ms: number; delay: number; reduce: boolean }) {
  const [done, setDone] = useState(props.reduce);
  return done ? <GlossText text={props.to} /> : <Scramble {...props} onDone={() => setDone(true)} />;
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
  // 다리: 복원 뒤에 온 말만(옛 대화가 밀려 있어도 이 장면은 그 뒤 말을 보인다)
  const bridgeTail = { ...chat, items: chat.items.filter((m) => m.burstId === 'ev.restore' || m.burstId === 'ev.teaser') };
  const clock = useGameStore((s) => s.clock);
  const step = r?.steps[idx];

  useEffect(() => {
    try {
      setMusic(!useGameStore.getState().settings.music ? 'none' : step === 'monologue' || step === 'teaser' || step === 'bridge' ? 'ending' : 'restore');
    } catch {
      /* 오디오 없음 */
    }
  }, [step]);
  // 다리: 복원 뒤 대화는 보통 대화창 그대로 이어진다(바뀐 말을 따로 모아 보이지 않는다)
  useEffect(() => {
    if (step !== 'bridge') return;
    useGameStore.getState().openMessenger();
    return () => useGameStore.getState().closeMessenger();
  }, [step]);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    // 다리: 대화가 길어지면 장면 전체를 끝까지 내린다
    const b = bodyRef.current;
    if (b && step === 'bridge') b.scrollTop = b.scrollHeight;
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
      <div className="rbody" key={step} ref={bodyRef}>
        {step === 'home' ? <RestoredCard animate testId="restore-home" /> : null}

        {step === 'cards' ? (
          <div data-testid="restore-cards">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              인물 카드에서 다시 쓰인 줄
            </div>
            {r.cards.flatMap((c) =>
              c.changes.map((ch, i) => (
                <div key={`${c.cardId}${i}`} className="ba">
                  <div className="t-b" style={{ fontWeight: 600 }}>
                    {c.name}
                  </div>
                  <div className="t-b was keep">{ch.before.text || `${ch.before.label}: 기록이 지워졌다`}</div>
                  <div className="t-b now keep read">
                    <ScrambleGloss from={ch.before.text || ch.before.label} to={ch.after.text} ms={1800} delay={500} reduce={reduce} />
                  </div>
                  {ch.after.source ? (
                    <a className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={ch.after.source.url} target="_blank" rel="noreferrer noopener">
                      {ch.after.source.title} <IExt size={14} />
                    </a>
                  ) : null}
                </div>
              )),
            )}
            {r.room ? (
              <div className="ba" data-testid="restore-room">
                <div className="t-m">그날의 방 · 「?」 로 남았던 두 관원</div>
                <div className="t-h read" style={{ margin: '6px 0' }}>
                  {r.room.pairLabel}
                </div>
                <a className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={r.room.source.url} target="_blank" rel="noreferrer noopener">
                  {r.room.source.title} <IExt size={14} />
                </a>
              </div>
            ) : null}
            {r.absence.length || r.witnessLines.length ? (
              <div className="t-m keep" style={{ marginTop: 4 }} data-testid="restore-log">
                내 관측 로그는 그대로 —{' '}
                {[...r.absence.map((a) => `${a.clock} 찾기 「${a.query}」 → ${a.text}`), ...r.witnessLines.map((w) => `「${w.text}」 ${w.note}`)].join(' · ')}
              </div>
            ) : null}
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
      {step === 'bridge' && chat.choices && useGameStore.getState().messenger.choice?.burstId === 'ev.restore' ? (
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
