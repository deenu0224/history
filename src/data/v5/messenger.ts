/**
 * 메신저 대본(docs/DIALOGUE_GUIDE.md §4) — 한 선임(가상, 반말)·오 실장(가상, 두 번만)·시스템 줄.
 * 사건(§3) 하나 = 묶음(Burst) 하나. 말풍선 하나 = 문장 하나(≤30자). 정답(인물 이름·연도·사건 이름) 금지.
 * 말수 예산(§1-11, 검증기 ⑬): 사건 하나 ≤3 한 선임 말풍선(ev.restore ≤4), Ep1 한 선임 ≤35줄. 틀린 시도·화면이 알리는 일엔 묶음이 없다.
 * 현실 재기록(§1-10): 소실 사실(ERASED1)에 기대는 줄은 facts 로 그 사실을 달고 restored(복원 뒤 글)를 함께 갖는다 —
 * 한 선임·오 실장의 말도, 07 의 답도. 복원되면 대화 기록 전체에서 조용히 다시 쓰인다(표시 없음). 모두 provenance: fictional.
 * 관측기가 말한 것(시스템 줄, 탐지·재계산·「관측 불가」를 전하는 말)은 소실·복원을 타지 않으므로 남는다.
 */
import type { Burst, ErasedFact, HintLadder, Id, Step } from '@/core/types';

/** Ep1 의 소실 세계에서만 참인 사실 */
export const ERASED1: ErasedFact[] = [
  { id: 'e1.kim_unknown', label: '김일손은 아무도 모르는 이름이다', tells: [/처음 듣는/, /모르는 이름/] },
  { id: 'e1.kim_cause_blank', label: '김일손의 사인(죽은 까닭)이 비어 있다', tells: [/사인 칸이 비/, /사인.{0,6}(없|비어|빠)/] },
  { id: 'e1.day_unknown', label: '그날의 일은 아무도 모르는 하찮은 건이다', tells: [/그날이 없/, /우선순위 낮/, /끊긴 관측은 끊긴/] },
];
const KIM: Id[] = ['e1.kim_unknown'];
const CAUSE: Id[] = ['e1.kim_cause_blank'];
const DAY: Id[] = ['e1.day_unknown'];

let seq = 0;
const han = (text: string, extra: { heavy?: true; restored?: string; facts?: Id[] } = {}): Step => ({ kind: 'say', id: `m${++seq}`, from: 'han', text, ...extra });
const oh = (text: string, extra: { restored?: string; facts?: Id[] } = {}): Step => ({ kind: 'say', id: `m${++seq}`, from: 'oh', text, ...extra });
const sys = (text: string): Step => ({ kind: 'system', id: `m${++seq}`, text });
const heavy = { heavy: true as const };

/** 메시지 id 를 사람이 읽을 수 있게 고정한다(⟲ 다시 쓰기·테스트가 이 id 를 쓴다). */
const named = (id: string, step: Step): Step => ({ ...step, id } as Step);

export const BURSTS: Burst[] = [
  {
    id: 'ev.start',
    steps: [
      named('m_oh_priority', oh('07, 우선순위 낮은 건 하나 너한테 갔다.', { restored: '07, 다 아는 건 하나 너한테 갔다.', facts: DAY })),
      // 06:00 닫힘의 예고(QA_STORY 발견 4) — 오 실장은 두 번만 말한다(시작·06:00)
      oh('06시에 관측기 한 바퀴 도니까 그 전에 끝내.'),
      // Ep0 다리(「어, 하나 더 떴다.」)를 받고, 「명단」을 먼저 세운다(발견 5)
      han('아까 그거야, 명단 하나 붙어 있더라.'),
      han('거기서 셋만 뽑아 카드 올려놨고, 나머진 찾기로 봐.'),
    ],
  },
  { id: 'ev.eye_open.E2', steps: [han('첫 번째 관측은 이름 칸이 깎여 있었어.')] },
  {
    id: 'ev.search_kim',
    steps: [
      named('m_kim_unknown', han('처음 듣는 이름인데.', { restored: '김일손이면 무오사화 그 사관이잖아.', facts: KIM })),
      named('m_kim_cause', han('사인 칸이 비어 있네.', { restored: '사인 다 나와 있는데?', facts: CAUSE })),
      // 관측기의 말을 전한다 — 두 현실 모두에서 참(그의 눈은 복원 뒤에도 열리지 않는다)
      han('관측도 안 된다고 나오네.'),
    ],
  },
  { id: 'ev.eye_open.E3', steps: [han('나 잠깐 다른 건 좀 볼게.'), { kind: 'status', presence: 'away' }] },
  { id: 'ev.eye_open.E4', steps: [{ kind: 'status', presence: 'online' }, han('이 사람 자리 꽤 구석이다.')] },
  { id: 'ev.x1', steps: [han('잠깐, 첫 번째 관측이랑 말이 다르네.', heavy)] },
  {
    id: 'ev.closure',
    steps: [
      sys('관측기 06:00 · 이 지점을 가리키는 기록 1건 사라짐 · 관측 1개 끊김'),
      oh('관측기 한 바퀴 돌았다.'),
      named('m_oh_closed', oh('끊긴 관측은 끊긴 거야. 남은 걸로 해.', { restored: '교과서 건이니 남은 걸로 깔끔하게 해.', facts: DAY })),
      han('…닫혔어?', heavy),
      {
        kind: 'choice',
        id: 'c_closure',
        options: [
          { id: 'missed', text: '하나 못 봤어요.', then: [] },
          { id: 'all', text: '다 봤어요.', then: [] },
        ],
        after: [
          han('본 건 남고, 못 본 건… 끝이야.', heavy),
          han('관측기 기록 좀 뒤져 볼게.'),
          { kind: 'status', presence: 'away' },
          { kind: 'async', event: 'ev.old_report', minS: 40, maxS: 90, capS: 120 },
        ],
      },
    ],
  },
  {
    id: 'ev.old_report',
    steps: [
      { kind: 'status', presence: 'online' },
      han('이거 1년 전 네 거야.', heavy),
      { kind: 'attach', id: 'm_att_old', docId: 'doc_old_report', label: '관측 기록 · #C-2217 · 1년 전 · 대조관 07' },
      {
        kind: 'choice',
        id: 'c_old',
        options: [
          { id: 'forgot', text: '기억 안 나요.', then: [] },
          { id: 'me', text: '제가요?', then: [] },
        ],
        after: [han('맨 끝 봐, 1년 전에도 너 거기서 멈췄어.'), han('사람 기억은 관측기가 안 지켜 주잖아.')],
      },
    ],
  },
  { id: 'ev.write_open', steps: [han('이제 고정해 봐, 본 것만.')] },
  { id: 'ev.witness_line', steps: [han('본 사람이 있어도, 적힌 데가 없으면 기록은 안 돼.', heavy)] },
  {
    id: 'ev.restore',
    postRestore: true,
    steps: [
      sys('관측기: 내 관측 기록은 그대로'),
      han('07, 아까부터 뭘 그렇게 붙들고 있어?'),
      {
        kind: 'choice',
        id: 'c_restore',
        options: [
          { id: 'day', text: '그날 기록이요.', then: [] },
          // 사건 이름은 복원 카드(HOME.event)에서 먼저 보인다
          { id: 'muo', text: '무오사화요.', then: [] },
        ],
        after: [
          han('우리 부서에 그걸 모르는 사람이 어디 있어.'),
          han('너 신입 때 나한테 그걸로 발표했잖아.'),
          { kind: 'pause', ms: 4000, fakeTyping: true },
          han('근데 왜 그렇게 봐.'),
          { kind: 'choice', id: 'c_restore2', allowNoReply: true, options: [{ id: 'nothing', text: '아니에요.', then: [] }] },
        ],
      },
    ],
  },
  {
    id: 'ev.teaser',
    postRestore: true,
    steps: [
      han('아까 기록 뒤지다 본 건데.'),
      han('너, 2년 전에도 뭐 하나 붙들고 있었더라.'),
      { kind: 'attach', id: 'm_att_c0408', docId: 'doc_c0408', label: '#C-0408 · 2년 전 · 대조관 07 · 관측 오류 · 종결' },
      {
        kind: 'choice',
        id: 'c_teaser',
        allowNoReply: true,
        options: [
          { id: 'open', text: '열어 볼게요.', then: [] },
          { id: 'later', text: '다음에요.', then: [] },
        ],
      },
    ],
  },
  // ev.resume — 진행 상태별 한 줄(§4.10)
  { id: 'ev.resume.notag', repeatable: true, steps: [han('왔어? 카드 세 장 그대로 있어.')] },
  { id: 'ev.resume.room', repeatable: true, steps: [han('방 그림 그대로야.')] },
  { id: 'ev.resume.x1', repeatable: true, steps: [han('그 「모두」 얘기 아직이지?')] },
  { id: 'ev.resume.after0600', repeatable: true, steps: [han('관측기 다시 돌았어. 더 닫힌 건 없어.')] },
  { id: 'ev.resume.write', repeatable: true, steps: [han('쓰던 거 그대로 있어.')] },
];

/** 「김일손」이 나와도 되는 묶음(플레이어가 그 이름을 찾은 뒤에만 온다) */
export const KIM_ALLOWED_BURSTS = ['ev.search_kim'];

/** 힌트 사다리(DESIGN_V5 §7) — 한 선임 메신저로만. 3단은 '어디를 볼지'까지만. */
export const LADDERS: HintLadder[] = [
  {
    id: 'h_swipe',
    silenceS: 20,
    activeWhen: { viewingEye: 'E1', maxSwipes: 0 },
    doneWhen: { minSwipes: 1 },
    steps: [{ id: 'h_swipe_1', text: '옆으로 넘겨. 다섯 장이야.', afterS: 20 }],
  },
  {
    id: 'h_tag1',
    failKey: 'tag:T1',
    activeWhen: { tagsNotDone: ['T1'], any: [{ allViewed: ['e1-1', 'e1-2', 'e1-3', 'e1-4', 'e1-5'] }, { minFails: { key: 'tag:T1', n: 3 } }] },
    doneWhen: { tagsDone: ['T1'] },
    steps: [
      { id: 'h_tag1_1', text: '모르는 얼굴 있으면 눌러 봐.', afterS: 45, fails: 2 },
      { id: 'h_tag1_2', text: '누가 누구 얘기하는지 들어 봐. 귓속말 같은 거.', afterS: 60, fails: 3 },
      { id: 'h_tag1_3', text: '카드에 적힌 일이랑 들은 말이 같은 얘긴지 맞대 봐.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_owner',
    failKey: 'tag:T2',
    // 찾기를 먼저 가르친다(방 없이도 풀린다 — 방은 그 뒤에)
    activeWhen: { allViewed: ['e2-1'], tagsNotDone: ['T2'] },
    doneWhen: { tagsDone: ['T2'] },
    steps: [
      { id: 'h_owner_1', text: '그 사람을 누가 뭐라고 불렀는지 들어 봐.', afterS: 45, fails: 2 },
      { id: 'h_owner_2', text: '부른 말 그대로 찾아 봐.', afterS: 60, fails: 3 },
      { id: 'h_owner_3', text: '여럿 나오면 그 방 기록 있는 사람부터.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_room',
    silenceS: 20,
    activeWhen: { roomUnlocked: true, roomOpened: false },
    doneWhen: { roomOpened: true },
    steps: [{ id: 'h_room_1', text: '방 그림 나왔어. 아래 버튼.', afterS: 15 }],
  },
  {
    id: 'h_overlap',
    failKey: 'tag:T3',
    // T2 와 상관없이(T2 는 선택) — 얼굴(e2-2)을 본 뒤부터
    activeWhen: { eyesOpen: ['E2'], allViewed: ['e2-2'], tagsNotDone: ['T3'] },
    doneWhen: { tagsDone: ['T3'] },
    steps: [
      { id: 'h_overlap_1', text: '같은 시각에 같은 자리면 같은 사람이야.', afterS: 45, fails: 2 },
      { id: 'h_overlap_2', text: '말만 들은 사람, 얼굴만 본 사람이 따로일 수도.', afterS: 60, fails: 3 },
      { id: 'h_overlap_3', text: '1시 20분. 병풍 앞.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_t4',
    failKey: 'tag:T4',
    activeWhen: { eyesOpen: ['E3'], tagsNotDone: ['T4'] },
    doneWhen: { tagsDone: ['T4'] },
    steps: [
      { id: 'h_t4_1', text: '그 사람이 한 말, 그대로 찾아 봐.', afterS: 45, fails: 2 },
      { id: 'h_t4_2', text: '기록에 명단이 나오면, 이 방 기록 있는 사람부터.', afterS: 60, fails: 3 },
      { id: 'h_t4_3', text: '카드에 실록 엮는 관청 줄 있는지 봐.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_x1',
    failKey: 'contra:X1',
    activeWhen: { revealed: ['X1'], unresolved: ['X1'] },
    doneWhen: { resolved: ['X1'] },
    steps: [
      { id: 'h_x1_1', text: '둘 다 거짓말은 아닐 거야. 듣던 자리가 달랐겠지.', afterS: 45, fails: 2 },
      { id: 'h_x1_2', text: '방에서 그 시각 눌러 봐. 소리 닿는 데 그려 줘.', afterS: 60, fails: 3 },
      { id: 'h_x1_3', text: '멀리 앉은 사람은 들은 걸까, 전해 들은 걸까.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_x2',
    failKey: 'contra:X2',
    activeWhen: { revealed: ['X2'], unresolved: ['X2'] },
    doneWhen: { resolved: ['X2'] },
    steps: [
      { id: 'h_x2_1', text: '셀 수 있었던 눈이 누군지 봐.', afterS: 60, fails: 2 },
      { id: 'h_x2_2', text: '책상 가운데 뭐 쌓여 있었지?', afterS: 60, fails: 3 },
      { id: 'h_x2_3', text: '그 더미 너머가 다 보였을까.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_write_open',
    silenceS: 20,
    activeWhen: { rewriteAvailable: true, rewriteOpen: false, restored: false },
    doneWhen: { rewriteOpen: true },
    steps: [{ id: 'h_write_open_1', text: '이제 고정할 수 있겠다. 홈에.', afterS: 15 }],
  },
  {
    id: 'h_write',
    failKey: 'submit',
    activeWhen: { rewriteOpen: true },
    doneWhen: { allRestored: true },
    steps: [
      { id: 'h_write_1', text: '본 것만 써. 실록도 본 걸 적은 거니까.', afterS: 120, fails: 2 },
      { id: 'h_write_2', text: '고정 안 된 문장은 칸 하나가 어긋난 거야.', afterS: 60, fails: 3 },
      { id: 'h_write_3', text: "줄마다 '누가'랑 '몇'부터 다시 봐.", afterS: 60, fails: 4 },
    ],
  },
];
