/**
 * 복원 뒤 — 세 박자. 복원의 순간(빈칸이 채워지고 출처가 붙음)은 기록 다시 쓰기 화면 안에서 이미 지나갔다.
 *  ① 홈 카드가 뒤집혀 「복원됨」(일시·장소, 돌아온 줄 짧게, 이웃 기록 한 줄, 전문은 「전문 펼치기」)
 *  (Ep1 만) 바뀐 것 — 인물 카드에서 바뀐 줄 · 그날의 방 「?」의 짝 이름 · 그대로 남은 로그 한 줄
 *  ② 짧은 독백 → ③ 다리(Ep0: 대화창 23:04) / 예고(Ep1). UI_STYLE_GUIDE §2.10
 */
import { useEffect, useRef, useState } from 'react';
import { setMusic } from '@/game/audio';
import { useGameStore } from '@/store/gameStore';
import { useView } from '@/store/hooks';
import { selectMessenger, selectRestoration } from '@/store/selectors';
import { EyeIcon, IExt } from '../parts/icons';
import { goNextEpisode } from '../lib/flow';
import { openMessenger } from '../lib/nav';
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
        {/* 집계는 더할 줄이 있는 에피소드(Ep1~)만 — Ep0 의 절정 화면은 점수로 깎지 않는다(QA_STORY_R3 R3-1).
            낱말은 역사 고정 화면에서 쓴 말 그대로(「고정할 문장 더하기」·「실록이 적지 않은 일」) */}
        {step === 'home' && (r.tally.optional !== undefined || r.tally.witness !== undefined) ? (
          <div className="tally t-m" data-testid="restore-tally">
            <span>
              단번에 맞힘 <b>{r.tally.firstTry}/{r.tally.total}</b>
            </span>
            {r.tally.optional !== undefined ? (
              <span>
                더한 문장 <b>{r.tally.optional}</b>
              </span>
            ) : null}
            {r.tally.witness !== undefined ? (
              <span>
                {r.witnessLabel} <b>{r.tally.witness}</b>
              </span>
            ) : null}
          </div>
        ) : null}

        {step === 'cards' ? (
          <div data-testid="restore-cards">
            <div className="t-m" style={{ margin: '4px 0 10px' }}>
              인물 카드에서 바뀐 줄
            </div>
            {/* 같은 실록 문장으로 바뀐 카드 줄은 한 번만(이름을 모아) — 같은 글을 거듭 보이지 않는다 */}
            {Object.values(
              r.cards
                .flatMap((c) => c.changes.map((ch) => ({ name: c.name, ch })))
                .reduce<Record<string, { names: string[]; ch: (typeof r.cards)[number]['changes'][number]; was: string[] }>>((acc, x) => {
                  const k = x.ch.after.text;
                  const was = x.ch.before.text || x.ch.display;
                  if (acc[k]) {
                    acc[k]!.names.push(x.name);
                    if (!acc[k]!.was.includes(was)) acc[k]!.was.push(was);
                  } else acc[k] = { names: [x.name], ch: x.ch, was: [was] };
                  return acc;
                }, {}),
            ).map((g, i) => (
              <div key={i} className="ba" data-testid="restore-card-change">
                <div className="t-b" style={{ fontWeight: 600 }}>
                  {g.names.join(' · ')}
                </div>
                {g.was.map((w) => (
                  <div key={w} className="t-b was keep">
                    {w}
                  </div>
                ))}
                <div className="t-b now keep read">
                  <ScrambleGloss from={g.was[0]!} to={g.ch.after.text} ms={1800} delay={500} reduce={reduce} />
                </div>
                {g.ch.after.source ? (
                  <a className="t-m" style={{ color: 'var(--amber)', textDecoration: 'underline' }} href={g.ch.after.source.url} target="_blank" rel="noreferrer noopener">
                    {g.ch.after.source.title} <IExt size={14} />
                  </a>
                ) : null}
              </div>
            ))}
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
                내 관측 기록은 그대로 —{' '}
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
          // 예고: 문서는 한 선임이 보내는 것 — 대화창에서 받는다(복원 물음에 답한 뒤 온다 — 「보냈다」고 앞서 말하지 않는다, QA_STORY_R3 R3-2).
          // 화면에는 그 문서의 겉장(코드 픽셀 아트의 닫힌 눈)과 물음 한 줄을 바로 보인다(QA_FUN_R3 R3-5)
          <div data-testid="restore-teaser" className="mono teaser" style={{ paddingTop: 28 }}>
            <p className="keep">한 선임이 문서 하나를 보내려 한다.</p>
            <div className="teasercard" data-testid="teaser-card" aria-label={`첨부 문서 ${r.teaser.title} · ${r.teaser.subtitle}`}>
              <EyeIcon look="closed" size={72} />
              <div className="tc-body">
                <div className="t-b tc-title">{r.teaser.title}</div>
                <div className="t-m tc-sub">{r.teaser.subtitle}</div>
              </div>
            </div>
            {r.teaserQuestion ? (
              <p className="keep read teaserq" data-testid="teaser-question">
                「{r.teaserQuestion}」
              </p>
            ) : null}
            <button
              className="btn secondary"
              style={{ marginTop: 18 }}
              data-testid="teaser-messenger"
              onClick={() => {
                useGameStore.getState().finishEpilogue();
                useUi.getState().home();
                openMessenger();
              }}
            >
              메신저에서 보기 ›
            </button>
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
