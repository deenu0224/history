/**
 * Ep0 메신저 대본(DIALOGUE_GUIDE §4.0) — 한 선임(반말)·시스템 줄. 말풍선 하나 = 문장 하나(≤30자), 정답(이름 붙이기 전 인물 이름·연도·사건) 금지.
 * 세계 규칙을 대화 속 한 문장씩만: 소실(지워지면 사람 기억도) · 관측기(그날을 적은 사람의 눈으로만) · 다시 쓰기(실록과 맞으면 현실이 돌아온다).
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
    tells: [/원래 기록이 없/, /기록에 없으면 없/, /(한글|언문).*(모르|기록이 없|기록에 없)/, /누가 만들었는지/],
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
    steps: [
      sys('자동 탐지 · #C-2209 · 문장 손상 2건'),
      han('07, 아직 있어?'),
      han('실록은 날짜 밑에 일이 한 꼭지씩 적혀 있어.'),
      han('그중 한 꼭지가 구멍투성이가 됐어.'),
      han('홈 카드 봐, 거의 다 뚫렸지?'),
      {
        kind: 'choice',
        id: 'c0_start',
        allowNoReply: true,
        options: [
          { id: 'hole', text: '왜 이렇게 뚫렸어요?', then: [han('사실 하나가 지워지면 닿은 문장이 다 무너져.')] },
          { id: 'ok', text: '네, 보여요.', then: [han('남은 조각부터 맞춰 보자.')] },
        ],
      },
    ],
  },
  {
    id: 'ev0.eye_rule',
    steps: [
      han('관측기는 그날을 적은 사람 눈으로만 봐.'),
      han('이번 건 그날 명단에 남은 사람 눈이야.'),
      han('줄 맨 끝자리.'),
    ],
  },
  {
    id: 'ev0.erasure',
    steps: [
      han('카드 아래 옆 기록도 똑같이 뚫렸지?'),
      named('m0_hangul', han('한글 누가 만들었는지 적힌 데야.', { restored: '세종대왕이 언문 지은 그 기록.', facts: HANGUL })),
      {
        kind: 'choice',
        id: 'c0_hangul',
        allowNoReply: true,
        options: [
          { id: 'none', text: '그건 원래 기록이 없잖아요.', restored: '그건 세종대왕이 만든 거잖아요.', facts: HANGUL, then: [] },
          { id: 'also', text: '그것도 손상이에요?', then: [] },
        ],
        after: [
          named('m0_nolog', han('응, 한글은 쓰는데 만든 사람은 기록에 없지.', { restored: '응, 그러니까 더 이상하지.', facts: HANGUL })),
          han('지워지면 사람 머리에서도 같이 지워지니까.'),
          han('근데 관측기는 문장 구멍을 잡아.', { heavy: true }),
        ],
      },
    ],
  },
  { id: 'ev.linger_cut.E0', spontaneous: true, steps: [han('남의 눈으로 보는 거 처음엔 좀 어지럽지.')] },
  { id: 'ev.tag_wrong', spontaneous: true, steps: [han('아닌가 보네.'), han('근거를 바꿔 봐.')] },
  { id: 'ev0.decoy.rank', steps: [han('두루마리 첫머리 다시 봐.'), han('카드랑 자리 이름이 다르잖아.')] },
  { id: 'ev0.choi_named', steps: [han('맞네.'), han('이름 붙이면 카드 줄에 먹선이 가.'), han('남은 건 높은 자리 그 사람.')] },
  { id: 'ev0.decoy.choi', steps: [han('그 사람은 두루마리 읽던 쪽이잖아.'), han('높은 자리 사람은 자기를 뭐라고 불렀지?')] },
  { id: 'ev0.decoy.king', steps: [han('그 카드엔 높은 자리 얘기가 없네.'), han('그 사람들은 꾸중 듣던 쪽이잖아.')] },
  { id: 'ev.card_link', steps: [han('카드 하나 더 붙었네.'), han('줄 안 이름도 눌러 볼 수 있어.')] },
  { id: 'ev0.king_named', steps: [han('붙었다.'), han('이제 그 빈 칸, 채울 수 있겠다.')] },
  {
    id: 'ev.write_open',
    steps: [
      han('본 것만 써.'),
      han('맞는 줄은 실록 문장으로 돌아와.'),
      {
        kind: 'choice',
        id: 'c0_write',
        allowNoReply: true,
        options: [
          { id: 'then', text: '돌아오면요?', then: [han('그 문장이 다시 기록이 돼.'), han('기록이 돌아오면 사람들 기억도 돌아와.')] },
          { id: 'ok', text: '네.', then: [] },
        ],
      },
    ],
  },
  { id: 'ev.write_miss', steps: [han('안 돌아왔네.'), han('칸에 넣은 이름만 다시 봐.')] },
  {
    id: 'ev.restore',
    postRestore: true,
    steps: [
      { kind: 'system', id: 'e0m_restore_sys', text: '통합 역사 DB 동기화: 정상 · 변경 0건.' },
      han('07, 아까 그 구멍 난 거 끝났어?'),
      {
        kind: 'choice',
        id: 'c0_restore',
        options: [
          { id: 'hangul', text: '한글 만든 사람 칸이요.', then: [] },
          { id: 'done', text: '네, 다 채웠어요.', then: [] },
        ],
        after: [
          han('한글 만든 사람?'),
          han('세종대왕이 만든 거 모르는 사람이 어디 있어.'),
          { kind: 'pause', ms: 3500, fakeTyping: true },
          han('너 진짜 피곤하구나.'),
        ],
      },
    ],
  },
  {
    id: 'ev.teaser',
    postRestore: true,
    steps: [
      { kind: 'system', id: 'e0m_bridge_sys', text: '좌표 재계산 · 같은 손상 흔적 1건 더' },
      han('어, 하나 더 떴다.'),
      han('이번엔 이름은 남고 사유가 빠졌대.'),
      han('그건 위에서 너한테 줄 거야.'),
    ],
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
      { id: 'h0_choi_1', text: '모르는 얼굴 있으면 눌러 봐.', afterS: 25, fails: 1 },
      { id: 'h0_choi_2', text: '두루마리에 뭐라고 적혀 있지?', afterS: 30, fails: 2 },
      { id: 'h0_choi_3', text: '두루마리 첫머리랑 같은 줄 있는 카드.', afterS: 30, fails: 3 },
    ],
  },
  {
    id: 'h0_king',
    failKey: 'tag:T0b',
    silenceS: 20,
    activeWhen: { tagsDone: ['T0a'], allViewed: ['e0-1', 'e0-2', 'e0-3'], tagsNotDone: ['T0b'] },
    doneWhen: { tagsDone: ['T0b'] },
    steps: [
      { id: 'h0_king_1', text: '그 사람이 자기를 뭐라고 불렀지?', afterS: 25, fails: 1 },
      { id: 'h0_king_2', text: '최만리 카드를 펼쳐 봐.', afterS: 30, fails: 2 },
      { id: 'h0_king_3', text: '카드 줄에 밑줄 친 이름 있지?', afterS: 30, fails: 3 },
    ],
  },
  {
    id: 'h0_write_open',
    silenceS: 15,
    activeWhen: { rewriteAvailable: true, rewriteOpen: false, restored: false },
    doneWhen: { rewriteOpen: true },
    steps: [{ id: 'h0_write_open_1', text: '이제 그 칸 채울 수 있겠다. 홈에.', afterS: 10 }],
  },
  {
    id: 'h0_write',
    failKey: 'submit',
    activeWhen: { rewriteOpen: true },
    doneWhen: { allRestored: true },
    steps: [
      { id: 'h0_write_1', text: '그 말 한 사람 이름, 이제 알잖아.', afterS: 40, fails: 1 },
      { id: 'h0_write_2', text: '칸에 넣을 이름만 다시 골라 봐.', afterS: 30, fails: 2 },
    ],
  },
];
