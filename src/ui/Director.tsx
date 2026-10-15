/**
 * 연출 감독(렌더 없음): 시간 흘리기(tick) · 재개 · 자동 저장 · 엔진 fx 큐 → 소리·진동·토스트·배너 · 장면별 음악.
 * 엔진은 fx 를 쌓기만 하고, 보여 주는 쪽(여기)이 비운다(ackFx).
 */
import { useEffect, useState } from 'react';
import { setMusic, setVolume } from '@/game/audio';
import { currentEpisode, PERSISTED_KEYS, pickPersisted, useGameStore } from '@/store/gameStore';
import { selectTagProgress } from '@/store/selectors';
import type { Fx } from '@/store/gameStore';
import { LANDSCAPE_TOUCH_QUERY } from '@/shell/orientation';
import { fx } from './lib/fx';
import { FROM_LABEL } from './lib/format';
import { topScreen, useUi } from './uiStore';

let lastBannerAt = 0;
/** 한 묶음 안에서 알림이 이미 떴는가(「모두 밝혀졌다」는 그 뒤로 미룬다) */
let toastInBatch = false;
let allNamed = false;
const TICK_MS = 300;
const SAVE_MS = 2000;

function handle(f: Fx) {
  const ui = useUi.getState();
  const g = useGameStore.getState();
  switch (f.kind) {
    case 'eye_open':
      fx('eye_open');
      ui.showToast('관측이 하나 열렸다', 'amber');
      toastInBatch = true;
      break;
    case 'eye_close':
      fx('eye_close');
      ui.showToast('관측이 끊겼다', 'cold');
      break;
    case 'tag':
      fx(f.verdict === 'ok' ? 'tag_ok' : 'tag_no');
      if (f.verdict === 'ok') {
        ui.flashName(f.figureId);
        // 꼭 붙여야 할 이름의 마지막 하나였다 → 「모두 밝혀졌다」(묶음이 끝난 뒤에)
        const ep = currentEpisode(g);
        const rule = ep.tags.find((t) => t.figureId === f.figureId);
        const req = ep.requiredTags ?? ep.tags.map((t) => t.id);
        if (rule && req.includes(rule.id) && selectTagProgress(ep, g).complete) allNamed = true;
      }
      break;
    case 'merge':
      fx('merge');
      ui.flashMerge();
      break;
    case 'reveal':
      fx('contradiction');
      ui.showToast('⚠ 근거끼리 모순된다', 'alert');
      break;
    case 'resolve':
      fx('resolve');
      break;
    case 'restore':
      // 소리는 다시 쓰기 화면이 복원의 순간(구멍이 채워질 때)에 이미 냈다
      break;
    case 'message':
      if (ui.phase === 'game' && topScreen(ui) !== 'messenger' && topScreen(ui) !== 'restore') {
        fx('message');
        // 한 묶음이 연달아 와도 배너는 처음 하나만(위 띠를 계속 가리지 않는다). 안 읽음 점은 홈에 남는다.
        if (Date.now() - lastBannerAt > 9000) {
          lastBannerAt = Date.now();
          ui.showBanner(FROM_LABEL[f.from] ?? '한 선임', f.text);
        }
      }
      break;
    case 'cards_gained':
      fx('search_hit');
      ui.showToast(`인물 카드 +${f.ids.length}`, 'amber');
      toastInBatch = true;
      break;
    case 'fact_link':
      // 카드 줄에 먹선이 그어진다(카드를 펼치면 줄이 그어지는 연출)
      useUi.setState({ inkNew: [...new Set([...ui.inkNew, f.factId])] });
      break;
    case 'episode_end':
    case 'clock':
    case 'savepoint':
      break;
  }
  void g;
}

export function Director() {
  // 가로로 눕히면 「세로로 돌려 주세요」 만 보인다: 시간·소리를 멈춘다(돌아오면 그대로)
  const [landscape, setLandscape] = useState(() => typeof matchMedia === 'function' && matchMedia(LANDSCAPE_TOUCH_QUERY).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(LANDSCAPE_TOUCH_QUERY);
    const on = () => setLandscape(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // 시간: 메신저 배달·힌트·닫히는 눈
  useEffect(() => {
    if (landscape) return;
    const id = setInterval(() => useGameStore.getState().tick(), TICK_MS);
    return () => clearInterval(id);
  }, [landscape]);

  // 숨김 → 저장, 돌아옴 → 재개(오래 떠나 있었으면 한 선임이 한마디)
  useEffect(() => {
    const save = () => void useGameStore.getState().save('auto').catch(() => {});
    const onVis = () => {
      if (document.visibilityState === 'visible') useGameStore.getState().resume();
      else save();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  // 자동 저장: 진행이 바뀌었을 때만(시계·난수 같은 잡음은 제외) 몇 초 간격으로
  useEffect(() => {
    let last = '';
    const snap = () => {
      const p = pickPersisted(useGameStore.getState()) as unknown as Record<string, unknown>;
      const q: Record<string, unknown> = {};
      for (const k of PERSISTED_KEYS) if (k !== 'lastActiveAt' && k !== 'lastActionAt') q[k] = p[k];
      return JSON.stringify(q);
    };
    last = snap();
    const id = setInterval(() => {
      const now = snap();
      if (now === last) return;
      last = now;
      void useGameStore.getState().save('auto').catch(() => {});
    }, SAVE_MS);
    return () => clearInterval(id);
  }, []);

  // fx 큐
  const queue = useGameStore((s) => s.fx);
  useEffect(() => {
    if (!queue.length) return;
    toastInBatch = false;
    allNamed = false;
    for (const f of queue) handle(f);
    useGameStore.getState().ackFx();
    if (allNamed) {
      const show = () => {
        fx('tags_done');
        useUi.getState().showToast('모두 밝혀졌다', 'amber');
      };
      if (toastInBatch) setTimeout(show, 1900);
      else setTimeout(show, 450); // 시트가 도장과 함께 닫힌 뒤
    }
  }, [queue]);

  // 음악·소리 크기
  const volume = useGameStore((s) => s.settings.volume);
  const music = useGameStore((s) => s.settings.music);
  const top = useUi(topScreen);
  const tension = useGameStore((s) => s.revealed.some((id) => !s.resolved[id]));
  const roomOpen = useGameStore((s) => s.ui.roomOpen);
  useEffect(() => {
    try {
      setVolume(landscape ? 0 : volume);
    } catch {
      /* 오디오 없음 */
    }
  }, [volume, landscape]);
  useEffect(() => {
    if (top === 'restore') return; // 복원 화면이 직접 고른다
    try {
      if (!music) setMusic('none');
      else if ((top === 'viewer' || roomOpen) && tension) setMusic('tension');
      else if (top === 'viewer' || roomOpen) setMusic('observe');
      else setMusic('office');
    } catch {
      /* 오디오 없음 */
    }
  }, [top, tension, roomOpen, music]);

  return null;
}

