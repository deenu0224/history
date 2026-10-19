/**
 * Ep0 메신저(DESIGN_V6 §6.9, DIALOGUE_GUIDE) — 한 선임(반말)·시스템 줄. 한 선임 말풍선 ≤ 15줄, 말풍선 하나 ≤ 30자.
 * v5 Ep0 대본에서 아직 맞는 줄을 살렸다(관측기 규칙·소실 탐지·고정·복원 뒤 대화·다리). 말은 모두 현대어, 정답 낱말 없음(복원 뒤 줄 제외).
 * 힌트는 볼 곳만, 다섯 번 헛맞춤마다 한 단계(HINTS).
 * 현실 재기록: 소실 사실(ERASED0)에 기대는 줄은 facts + restored 를 달고, 복원되면 조용히 다시 쓰인다.
 */
import type { Burst, ErasedFact, Id, Step } from '@/core/types';

export const ERASED0: ErasedFact[] = [
  {
    id: 'e0.hangul_unknown',
    label: '한글을 누가 만들었는지는 기록이 없다(모두 그렇게 안다)',
    tells: [/원래 기록이 없/, /기록에 없으면 없/, /(한글|언문).*(모르|기록이 없|기록에 없)/, /누가 만들었는지/, /만든 사람.{0,6}기록(이|에)? ?없/],
  },
];

let seq = 0;
const han = (text: string, extra: { heavy?: true; restored?: string; facts?: Id[] } = {}): Step => ({ kind: 'say', id: `v6m${++seq}`, from: 'han', text, ...extra });
const sys = (text: string): Step => ({ kind: 'system', id: `v6m${++seq}`, text });
const HANGUL = ['e0.hangul_unknown'];

export const BURSTS0: Burst[] = [
  { id: 'ev.start', steps: [sys('관측기: #C-2209 · 문장 손상 2건'), han('07, 실록 한 꼭지가 다 뚫렸어.')] },
  { id: 'ev.original', steps: [han('옛 글이 궁금하면 원문 보기.')] },
  { id: 'ev.eye_rule', steps: [han('관측기는 그날 기록에 이름 남은 사람 눈으로만 봐.')] },
  { id: 'ev.retry', steps: [han('틀려도 손해 없어. 다시 맞춰 봐.')] },
  {
    id: 'ev.erasure',
    steps: [
      han('한글은 쓰는데 만든 사람은 기록에 없지.', { restored: '한글 얘기는 이 기록에도 나오지.', facts: HANGUL }),
      han('지워지면 기억도 지워져. 관측기만 구멍을 잡아.', { heavy: true }),
    ],
  },
  { id: 'hint.h1', steps: [han('관측 1 첫 쪽, 두루마리에 뭐가 보였지?')] },
  { id: 'hint.h2', steps: [han('뚫린 줄에 남은 말, 어디서 들어 본 말 아냐?')] },
  { id: 'hint.h3', steps: [han('언문 만든 사람이 그 일을 뭐라고 불렀지?')] },
  { id: 'ev.goal', steps: [han('이제 고정해 봐.'), han('고정하면 세상이 그 기록대로 굳어.')] },
  {
    id: 'ev.restore',
    postRestore: true,
    steps: [
      { kind: 'system', id: 'v6m_restore_sys', text: '관측기: 내 관측 기록은 그대로' },
      han('07, 아까 그 건 끝났어?'),
      {
        kind: 'choice',
        id: 'c0_restore',
        options: [
          { id: 'hangul', text: '한글 만든 사람 칸이요.', then: [] },
          { id: 'king', text: '세종대왕 칸이요.', then: [] },
        ],
        after: [han('세종대왕이 만든 거 모르는 사람이 어디 있어.'), { kind: 'pause', ms: 3500, fakeTyping: true }, han('너 진짜 피곤하구나.')],
      },
    ],
  },
  {
    id: 'ev.teaser',
    postRestore: true,
    steps: [{ kind: 'system', id: 'v6m_bridge_sys', text: '관측기: 같은 손상 흔적 1건 더' }, han('어, 하나 더 떴다. 이름은 남고 사유가 빠졌대.')],
  },
];

/** 힌트 사다리: 이 결론이 나오기 전까지 이 힌트가 후보(다섯 번 헛맞춤마다 한 단계) */
export const HINT_BURSTS = ['hint.h1', 'hint.h2', 'hint.h3'] as const;
export const HINTS0 = [
  { id: 'hint.h1', until: 'k_A' },
  { id: 'hint.h2', until: 'k_C' },
  { id: 'hint.h3', until: 'k_E' },
];

/** 장면 → 사건 */
export const EVENTS0 = {
  start: 'ev.start',
  firstCollect: 'ev.original',
  openObservation: 'ev.eye_rule',
  firstFail: 'ev.retry',
  conclusion: { k_B: 'ev.erasure' } as Record<string, string>,
  goal: 'ev.goal',
  restore: 'ev.restore',
  teaser: 'ev.teaser',
} as const;
