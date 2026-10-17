/**
 * Ep0 메신저 대본(DIALOGUE_GUIDE §4.0) — 한 선임(반말)·시스템 줄. 말풍선 하나 = 문장 하나(≤30자), 정답(이름 붙이기 전 인물 이름·연도·사건) 금지.
 * 세계 규칙을 대화 속 한 문장씩, 게임 전체에서 한 번만: 관측기(그날 기록에 이름 남은 사람의 눈으로만) · 소실(지워지면 기억도)과 관측기의 구멍 탐지 · 고정(세상이 그 기록대로 굳는다).
 * 말수 예산(DIALOGUE_GUIDE §1-11, 검증기 ⑬): 사건 하나 ≤3 말풍선(ev.restore ≤4), Ep0 한 선임 ≤15줄. 틀린 시도·성공 맞장구엔 묶음이 없다(힌트 사다리만).
 * 아이러니: 이 세계의 모두(07 포함)는 「한글을 누가 만들었는지는 기록이 없다」를 당연하게 여긴다. 07 이 걸리는 것은 관측기의 「주어 칸 손상」 탐지뿐.
 * 현실 재기록(DIALOGUE_GUIDE §1-10): 소실 사실(ERASED0)에 기대는 줄은 facts 로 그 사실을 달고 restored(복원 뒤 글)를 갖는다 —
 * 한 선임의 말도, 07 의 답도. 복원되면 대화 기록 전체에서 그 자리에서 조용히 다시 쓰인다(표시 없음).
 * 관측기가 말한 것(시스템 줄 · 「문장 손상」 탐지를 전하는 말)은 소실·복원을 타지 않으므로 남는다.
 * id 는 Ep1 과 겹치지 않게 'e0m*'·'c0_*'·'h0_*'.
 */
import type { Burst, ErasedFact, HintLadder, Id, Step } from '@/core/types';

/** Ep0 의 소실 세계에서만 참인 사실 */
export const ERASED0: ErasedFact[] = [
  {
    id: 'e0.hangul_unknown',
    label: '한글을 누가 만들었는지는 기록이 없다(모두 그렇게 안다)',
    tells: [/원래 기록이 없/, /기록에 없으면 없/, /(한글|언문).*(모르|기록이 없|기록에 없)/, /누가 만들었는지/, /만든 사람.{0,6}기록(이|에)? ?없/],
  },
];

let seq = 0;
const han = (text: string, extra: { heavy?: true; restored?: string; facts?: Id[] } = {}): Step => ({ kind: 'say', id: `e0m${++seq}`, from: 'han', text, ...extra });
const HANGUL = ['e0.hangul_unknown'];
const sys = (text: string): Step => ({ kind: 'system', id: `e0m${++seq}`, text });
const named = (id: string, step: Step): Step => ({ ...step, id }) as Step;

export const BURSTS0: Burst[] = [
  {
    id: 'ev.start',
    steps: [sys('관측기: #C-2209 · 문장 손상 2건'), han('07, 홈 카드 봐, 실록 한 꼭지가 다 뚫렸어.')],
  },
  { id: 'ev0.eye_rule', steps: [han('관측기는 그날 기록에 이름 남은 사람 눈으로만 봐.')] },
  {
    id: 'ev0.erasure',
    steps: [
      // 두 현실 모두에서 참(소실 사실에 기대지 않는다) — 다시 쓰이지 않는다
      named('m0_hangul', han('옆 기록은 한글 처음 나온 데야.')),
      {
        kind: 'choice',
        id: 'c0_hangul',
        allowNoReply: true,
        options: [
          // 복원 뒤 글은 만든 사람을 말하지 않는다 — 복원 뒤 「한글 만든 사람?」과 부딪히지 않게(QA_STORY 발견 1)
          { id: 'none', text: '거긴 원래 만든 사람 기록이 없잖아요.', restored: '거기도 뚫렸어요?', facts: HANGUL, then: [] },
          { id: 'also', text: '그것도 손상이에요?', then: [] },
        ],
        after: [
          named('m0_nolog', han('응, 한글은 쓰는데 만든 사람은 기록에 없지.', { restored: '응, 같은 칸이야.', facts: HANGUL })),
          han('지워지면 기억도 지워지는데, 관측기는 구멍을 잡아.', { heavy: true }),
        ],
      },
    ],
  },
  { id: 'ev0.king_named', steps: [han('이제 고정해 봐.')] },
  { id: 'ev.write_open', steps: [han('고정하면 세상이 그 기록대로 굳어.')] },
  {
    id: 'ev.restore',
    postRestore: true,
    steps: [
      { kind: 'system', id: 'e0m_restore_sys', text: '관측기: 내 관측 기록은 그대로' },
      // 한은 구멍을 기억하지 않는다(기억 규칙 — 빈자리는 관측기 기록만 안다, QA_STORY_R2 N1)
      han('07, 아까 그 건 끝났어?'),
      {
        kind: 'choice',
        id: 'c0_restore',
        options: [
          { id: 'hangul', text: '한글 만든 사람 칸이요.', then: [] },
          { id: 'king', text: '세종대왕 칸이요.', then: [] },
        ],
        after: [
          han('세종대왕이 만든 거 모르는 사람이 어디 있어.'),
          { kind: 'pause', ms: 3500, fakeTyping: true },
          // 끝줄 없음: 다시 쓰인 줄을 알리는 말은 기억 규칙과 부딪힌다. 거슬러 볼 까닭은 07 의 바뀐 답 자체에 맡긴다
          han('너 진짜 피곤하구나.'),
        ],
      },
    ],
  },
  {
    id: 'ev.teaser',
    postRestore: true,
    steps: [{ kind: 'system', id: 'e0m_bridge_sys', text: '관측기: 같은 손상 흔적 1건 더' }, han('어, 하나 더 떴다.'), han('이번엔 이름은 남고 사유가 빠졌대.')],
  },
  { id: 'ev.resume.notag', repeatable: true, steps: [han('왔어? 그 구멍 난 거 그대로야.')] },
];

/** 힌트 사다리 — 볼 곳만(DEDUCTION_RULES 규칙 10). 이름은 그 이름을 붙인 뒤에만(activeWhen.tagsDone) */
export const LADDERS0: HintLadder[] = [
  {
    id: 'h0_swipe',
    silenceS: 15,
    activeWhen: { viewingEye: 'E0', maxSwipes: 0 },
    doneWhen: { minSwipes: 1 },
    steps: [{ id: 'h0_swipe_1', text: '옆으로 넘겨. 세 장이야.', afterS: 10 }],
  },
  {
    id: 'h0_choi',
    failKey: 'tag:T0a',
    silenceS: 20,
    activeWhen: { allViewed: ['e0-1'], tagsNotDone: ['T0a'] },
    doneWhen: { tagsDone: ['T0a'] },
    steps: [
      { id: 'h0_choi_1', text: '모르는 얼굴 있으면 눌러 봐.', afterS: 25, fails: 2 },
      { id: 'h0_choi_2', text: '두루마리에 뭐라고 적혀 있지?', afterS: 30, fails: 3 },
      { id: 'h0_choi_3', text: '두루마리 첫머리랑 같은 줄 있는 카드.', afterS: 30, fails: 4 },
    ],
  },
  {
    id: 'h0_king',
    failKey: 'tag:T0b',
    silenceS: 20,
    activeWhen: { tagsDone: ['T0a'], allViewed: ['e0-1', 'e0-2', 'e0-3'], tagsNotDone: ['T0b'] },
    doneWhen: { tagsDone: ['T0b'] },
    steps: [
      { id: 'h0_king_1', text: '그 사람이 자기를 뭐라고 불렀지?', afterS: 25, fails: 2 },
      { id: 'h0_king_2', text: '최만리 카드를 펼쳐 봐.', afterS: 30, fails: 3 },
      { id: 'h0_king_3', text: '카드 줄에 밑줄 친 이름 있지?', afterS: 30, fails: 4 },
    ],
  },
  {
    id: 'h0_write_open',
    silenceS: 15,
    activeWhen: { rewriteAvailable: true, rewriteOpen: false, restored: false },
    doneWhen: { rewriteOpen: true },
    steps: [{ id: 'h0_write_open_1', text: '이제 고정할 수 있겠다. 홈에.', afterS: 10 }],
  },
  {
    id: 'h0_write',
    failKey: 'submit',
    activeWhen: { rewriteOpen: true },
    doneWhen: { allRestored: true },
    steps: [
      { id: 'h0_write_1', text: '그 말 한 사람 이름, 이제 알잖아.', afterS: 40, fails: 2 },
      { id: 'h0_write_2', text: '칸에 넣을 이름만 다시 골라 봐.', afterS: 30, fails: 3 },
    ],
  },
];
