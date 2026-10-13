/** 책상 뒤에서 도는 감독들: 메시지 전달 연출, 다시 쓰기(복원) 연출, 프린터(경고장), 음악. */
import { useEffect, useRef, useState } from 'react';
import { bus } from '@/core/bus';
import { MUSIC } from '@/data/feedback';
import { setMusic, setMusicVolume, setSfxVolume, setVolume } from '@/game/audio';
import { selectCaseCard, selectDesk, useGameStore } from '@/store/gameStore';
import { fastMode } from '../hooks';
import { CONTENT } from '../lib/content';
import { fx } from '../lib/fx';
import { openApp } from '../lib/nav';
import { threadOf } from '../lib/text';
import { useUi } from '../uiStore';

let lastRevealAt = 0;

/** 새로 도착한 메시지를 하나씩, 입력 중 표시를 거쳐 전달한다. 알림 배너는 사람(오 실장·한 선임·위원회)의 말만. */
export function useMessageDelivery() {
  const inbox = useGameStore((s) => s.inbox);
  const revealed = useUi((s) => s.revealed);
  const pending = inbox.filter((id) => !revealed.includes(id));
  const nextId = pending[0];
  const batch = pending.length;
  useEffect(() => {
    if (!nextId) return;
    const m = CONTENT.messages.find((x) => x.id === nextId);
    if (!m) {
      useUi.getState().reveal([nextId]);
      return;
    }
    const thread = threadOf(m);
    const fast = fastMode();
    const gap = fast ? 0 : m.hint ? 400 : Date.now() - lastRevealAt > 4000 ? 2400 : 450;
    const typeMs = fast ? 0 : thread === 'me' ? 500 : Math.min(1700, 700 + m.text.length * 14) / (batch > 4 ? 1.8 : 1);
    let t2 = 0;
    const t1 = window.setTimeout(() => {
      if (thread !== 'me' && typeMs > 0) useUi.getState().setTyping({ thread, from: m.from });
      t2 = window.setTimeout(() => {
        const ui = useUi.getState();
        ui.setTyping(null);
        ui.reveal([nextId]);
        lastRevealAt = Date.now();
        if (m.hint || thread === 'me') return;
        fx('message');
        const watching = ui.panel === 'messenger' && ui.thread === thread;
        if (!watching && thread !== 'system') {
          const body = m.text.length > 46 ? `${m.text.slice(0, 46)}…` : m.text;
          ui.pushNotice({ app: 'messenger', thread, text: thread === 'committee' ? body : `${m.from}: ${body}` });
        }
      }, typeMs);
    }, gap);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      useUi.getState().setTyping(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextId]);
}

const KEY = (kind: string, id: string) => (kind === 'message' ? `message:${id}` : kind === 'record' ? `record:${id}` : kind === 'assignment' ? `assignment:${id}` : kind === 'case' ? `case:${id}` : kind === 'warning' ? `warning:${id}` : null);

/** 다시 쓰기(말소·복원) 연출을 대기열에 올린다. 서류함이 열려 있는 동안의 카드 다시 쓰기는 책상이 보일 때까지 미룬다. */
export function useRewriteDirector() {
  const recent = useGameStore((s) => s.recentRewrites);
  const panel = useUi((s) => s.panel);
  useEffect(() => {
    if (!recent.length) return;
    const ui = useUi.getState();
    const hide = panel === 'filing';
    const hold = hide ? recent.filter((r) => r.kind === 'assignment' || r.kind === 'case') : [];
    const now = recent.filter((r) => !hold.includes(r));
    const queue = (list: typeof recent) => {
      for (const r of list) {
        const key = KEY(r.kind, r.targetId);
        if (!key) continue;
        const prev = useUi.getState().rewritePlay[key];
        useUi.getState().queueRewrite(key, { tone: r.tone, before: prev?.before ?? r.before, after: r.after });
      }
    };
    queue(now);
    const restore = recent.some((r) => r.tone === 'restore');
    // 복원 연출(먹 번짐 · 소리 · 화면 일렁임)은 책상이 보일 때 — 서류함이 닫힌 뒤에 터진다
    const play = () => {
      if (restore) {
        fx('restore');
        useUi.getState().bloom();
      } else fx('erase');
      bus.emit('glitch', { intensity: restore ? 0.35 : 0.5, ms: 1400, kind: restore ? 'restore' : 'erase' } as { intensity: number; ms: number });
    };
    if (hold.length) {
      window.setTimeout(() => {
        queue(hold);
        if (restore) play();
      }, 1600);
      if (!restore) play();
    } else play();
    void ui;
    useGameStore.getState().ackRewrites();
  }, [recent]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * 프린터가 뱉은 경고장: 도장 0.7초 뒤에 프린터가 돌고 → 경고장이 올라와 읽는다.
 * 업무(보고서 양식) 같은 패널이 열려 있으면 책상으로 돌아올 때까지 기다린다. 복원과 겹치면 카드의 먹 번짐이 먼저 보이고
 * 그다음에 경고장이 올라온다(경고장 글자가 '해당 없음'으로 바뀌는 순간을 책상 위에서 본다).
 */
export function useSlipDirector() {
  const slips = useGameStore((s) => s.recentSlips);
  const panel = useUi((s) => s.panel);
  const pending = useRef<{ ids: string[]; restore: boolean }>({ ids: [], restore: false });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!slips.length) return;
    pending.current.ids.push(...slips.map((s) => s.id));
    pending.current.restore ||= useGameStore.getState().filed.length > 0 && slips.some((s) => s.ruleId === 'rule_5');
    useGameStore.getState().ackSlips();
    setNonce((n) => n + 1);
  }, [slips]);
  useEffect(() => {
    if (!pending.current.ids.length || (panel && panel !== 'menu')) return;
    const fast = fastMode();
    const restore = pending.current.restore;
    const lead = fast ? 0 : restore ? 2600 : 700;
    const t = window.setTimeout(() => {
      const ids = pending.current.ids;
      pending.current = { ids: [], restore: false };
      if (!ids.length) return;
      useUi.getState().print();
      fx('printer');
      window.setTimeout(() => {
        fx('warning');
        useUi.getState().readSlip(ids);
      }, fast ? 0 : 520);
    }, lead);
    return () => window.clearTimeout(t);
  }, [nonce, panel]);
}

/** 앱 열기 신호(bus) → 패널 */
export function useAppBus() {
  useEffect(() => bus.on('app:open', ({ app }) => void openApp(app)), []);
}

/** 상황에 맞는 배경 음악 */
export function useMusicDirector() {
  const st = useGameStore();
  const phase = useUi((s) => s.phase);
  const shownCase = useUi((s) => s.shownCase);
  const reportFor = useUi((s) => s.shiftReportFor);
  const panel = useUi((s) => s.panel);
  const musicV = useUi((s) => s.musicVolume);
  const sfxV = useUi((s) => s.sfxVolume);
  const master = st.settings.volume;

  const desk = phase === 'os' ? selectDesk(st) : null;
  const card = shownCase ? selectCaseCard(st, shownCase) : null;
  const liveWarn = desk ? desk.slips.filter((w) => !w.cleared && !w.voided).length : 0;
  let track: string = MUSIC.boot;
  if (phase === 'os') {
    if (desk?.episodeDone) track = MUSIC.ending;
    else if (st.filed.length > 0) track = MUSIC.restore;
    // 긴장: #C-2217 서랍 도장 뒤 · 재탐지(관측 생략) 카드 · 보고서를 쓰는 동안 · 살아 있는 경고 2장 · 06:00 재계산
    else if ((card?.kind === 'lost' && (card.done || !card.timelineId)) || (panel === 'filing' && st.duty.active === 'duty_3') || !!st.duty.replay || liveWarn >= 2 || reportFor === 'duty_2')
      track = MUSIC.tension;
    else if (st.ui.observation) track = MUSIC.observe;
    else track = st.duty.started.length === 0 ? MUSIC.boot : MUSIC.desk;
  }
  useEffect(() => {
    try {
      setMusic(track as Parameters<typeof setMusic>[0]);
    } catch {
      /* 오디오 없음 */
    }
  }, [track]);
  useEffect(() => {
    try {
      setVolume(master);
      setMusicVolume(musicV);
      setSfxVolume(sfxV);
    } catch {
      /* 오디오 없음 */
    }
  }, [master, musicV, sfxV]);
}
