/**
 * 메신저 대본(docs/DIALOGUE_GUIDE.md §4) — 한 선임(가상, 반말)·오 실장(가상, 두 번만)·시스템 줄.
 * 사건(§3) 하나 = 묶음(Burst) 하나. 말풍선 하나 = 문장 하나(≤30자). 정답(인물 이름·연도·사건 이름) 금지.
 * ⟲ 말풍선은 restored 에 복원 뒤 텍스트를 함께 갖는다(§4.10). 모두 provenance: fictional.
 */
import type { Burst, HintLadder, Step } from '@/core/types';

let seq = 0;
const han = (text: string, extra: { heavy?: true; restored?: string } = {}): Step => ({ kind: 'say', id: `m${++seq}`, from: 'han', text, ...extra });
const oh = (text: string, extra: { restored?: string } = {}): Step => ({ kind: 'say', id: `m${++seq}`, from: 'oh', text, ...extra });
const sys = (text: string): Step => ({ kind: 'system', id: `m${++seq}`, text });
const heavy = { heavy: true as const };

/** 메시지 id 를 사람이 읽을 수 있게 고정한다(⟲ 다시 쓰기·테스트가 이 id 를 쓴다). */
const named = (id: string, step: Step): Step => ({ ...step, id } as Step);

export const BURSTS: Burst[] = [
  {
    id: 'ev.start',
    steps: [
      oh('07, #C-2217 너한테 갔다.'),
      oh('우선순위 낮음. 아침 전에 정리해.'),
      han('아까 하나 더 떴다던 그거야.'),
      han('이름은 남고 사유가 빠진 거.'),
      han('그 건 좌표 기록에 명단이 하나 붙어 있더라.'),
      han('거기서 셋만 먼저 뽑아서 카드 올려놨어.'),
      han('나머진 필요하면 찾기로 봐.'),
      {
        kind: 'choice',
        id: 'c_start',
        allowNoReply: true,
        options: [
          { id: 'thanks', text: '고마워요.', then: [han('응.')] },
          { id: 'which', text: '무슨 명단이에요?', then: [han('무슨 관청 상 받은 사람들 명단.'), han('이름 칸만 멀쩡하더라.')] },
        ],
      },
    ],
  },
  { id: 'ev.linger_cut.E1', spontaneous: true, steps: [han('남의 눈으로 보는 거 처음엔 좀 어지럽지.')] },
  { id: 'ev.tag_wrong', spontaneous: true, steps: [han('아닌가 보네.'), han('근거를 바꿔 봐.')] },
  { id: 'ev.tag_unmerged', steps: [han('그 말이 누구 얘기였는지부터 봐.'), han('방에서 같은 시각을 봐.')] },
  { id: 'ev.write_miss', steps: [han('안 돌아왔네.'), han('칸 하나가 어긋난 거야.')] },
  { id: 'ev.tag_anon', steps: [han('그 사람 카드는 없을걸.'), han('모든 사람이 기록에 남진 않아.')] },
  {
    id: 'ev.eye_open.E2',
    steps: [
      han('열렸다.'),
      han('이름 맞으면 그 사람 눈이 붙어.'),
      han('관측기가 기록 있는 사람 눈만 빌리잖아.'),
      {
        kind: 'choice',
        id: 'c_e2',
        allowNoReply: true,
        options: [
          { id: 'go', text: '다음 사람이 본 것 볼게요.', then: [] },
          { id: 'whose', text: '처음 거, 누가 본 거예요?', then: [han('그건 나도 몰라.'), han('그 기록 이름 칸이 깎여 있었어.')] },
        ],
      },
    ],
  },
  {
    id: 'ev.search_kim',
    steps: [
      han('김일손?'),
      named('m_kim_unknown', han('처음 듣는 이름인데.', { restored: '김일손이면 무오사화 그 사관이잖아.' })),
      named('m_kim_cause', han('사인 칸이 비어 있네.', { restored: '사인 다 나와 있는데?' })),
      han('…관측도 불가라고 나오고.', heavy),
      {
        kind: 'choice',
        id: 'c_kim',
        options: [
          { id: 'noday', text: '그날을 가리키는 기록이 없대요.', then: [] },
          { id: 'odd', text: '이상하네요.', then: [] },
        ],
        after: [han('사람은 있는데 그날이 없는 거네.'), han('그런 거 가끔 있어.')],
      },
    ],
  },
  { id: 'ev.room_open', steps: [han('본 사람이 둘이면 방 그림이 나와.'), han('누가 어디 앉아 있었는지.')] },
  { id: 'ev.merge_first', steps: [han('겹쳤네.'), han('같은 시각, 같은 자리면 같은 사람이야.')] },
  { id: 'ev.decoy.T2', steps: [han('성은 맞는데.'), han('그 사람, 그 방에서 일한 기록 있어?')] },
  {
    id: 'ev.owner_named',
    steps: [
      han('누가 본 건지 찾았네.'),
      han('자기 자리에서 남이 본 거로.'),
      {
        kind: 'choice',
        id: 'c_owner',
        allowNoReply: true,
        options: [{ id: 'works', text: '이게 되네요.', then: [han('그 방 그림 내가 제일 좋아하는 기능이야.')] }],
      },
    ],
  },
  { id: 'ev.decoy.T3', steps: [han('그 사람 카드 줄 다시 읽어 봐.'), han('같은 일에 반대였는지 찬성이었는지.')] },
  { id: 'ev.eye_open.E3', steps: [han('셋.'), han('나 잠깐 다른 건 좀 볼게.'), { kind: 'status', presence: 'away' }] },
  { id: 'ev.decoy.T4', steps: [han('명단엔 셋이잖아.'), han('그중에 그 방에서 일한 기록은?')] },
  { id: 'ev.tag_noevidence', steps: [han('그 사람 얘기는 아무도 안 했어.'), han('근거 없으면 이름 못 붙여.')] },
  { id: 'ev.eye_open.E4', steps: [{ kind: 'status', presence: 'online' }, han('넷.'), han('이 사람 자리 꽤 구석이다.')] },
  {
    id: 'ev.x1',
    steps: [
      han('잠깐.'),
      han('처음 본 사람 말이랑 다르네.'),
      han('「모두」랑 「여섯 조목만」.', heavy),
      {
        kind: 'choice',
        id: 'c_x1',
        allowNoReply: true,
        options: [
          { id: 'who', text: '누가 맞아요?', then: [han('그건 네가 봐야지.'), han('둘 다 거짓말은 아닐 거야.')] },
          { id: 'room', text: '방에서 볼게요.', then: [han('응.')] },
        ],
      },
    ],
  },
  {
    id: 'ev.closure',
    steps: [
      sys('06:00 좌표 재계산 · 이 지점을 가리키는 기록 1건 소실 · 관측 가능 1개 끊김'),
      oh('재계산 돌았다.'),
      named('m_oh_closed', oh('끊긴 관측은 끊긴 거야. 남은 걸로 해.', { restored: '그 좌표, 교과서 건이다. 깔끔하게 했네.' })),
      han('…닫혔어?', heavy),
      han('본 건 남아. 로그는 안 지워지니까.'),
      han('못 본 건… 끝이고.'),
      {
        kind: 'choice',
        id: 'c_closure',
        options: [
          { id: 'missed', text: '하나 못 봤어요.', then: [han('그럴 때 있어.', heavy)] },
          { id: 'all', text: '다 봤어요.', then: [han('다행이다.')] },
        ],
        after: [
          han('재계산 로그 좀 뒤져 볼게.'),
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
      han('야.'),
      han('이거 1년 전 네 거야.', heavy),
      han('같은 좌표.'),
      { kind: 'attach', id: 'm_att_old', docId: 'doc_old_report', label: '관측 로그 · #C-2217 · 1년 전 · 대조관 07' },
      {
        kind: 'choice',
        id: 'c_old',
        options: [
          { id: 'forgot', text: '기억 안 나요.', then: [] },
          { id: 'me', text: '제가요?', then: [] },
        ],
        after: [han('소견 끝에 뭐라고 썼는지 봐.'), han('1년 전에 너도 거기서 멈췄어.'), han('사람 기억은 관측기가 안 지켜 주잖아.')],
      },
    ],
  },
  { id: 'ev.x1_resolved', steps: [han('멀어서 첫 전교를 못 들은 거였네.'), han('전해 들은 말은 순서가 섞이기도 해.')] },
  {
    id: 'ev.write_open',
    steps: [
      han('이제 써 봐.'),
      han('본 것만.'),
      {
        kind: 'choice',
        id: 'c_write',
        allowNoReply: true,
        options: [
          { id: 'only', text: '본 것만이요?', then: [han('실록도 본 걸 적은 거니까.')] },
          { id: 'ok', text: '네.', then: [] },
        ],
      },
    ],
  },
  { id: 'ev.x2', steps: [han('종이 수가 또 다르네.'), han('셀 수 있었던 눈이 누군지 봐.')] },
  { id: 'ev.witness_line', steps: [han('그 줄은 남아.'), han('근데 기록은 안 돼.'), han('본 사람이 있어도, 적힌 데가 없으면.', heavy)] },
  { id: 'ev.write_partial', steps: [han('몇 줄은 돌아왔네.'), han('안 돌아온 줄은 칸 하나가 어긋난 거야.')] },
  {
    id: 'ev.restore',
    postRestore: true,
    steps: [
      sys('통합 역사 DB 동기화: 정상 · 변경 0건.'),
      han('07, 아까부터 뭘 그렇게 붙들고 있어?'),
      {
        kind: 'choice',
        id: 'c_restore',
        options: [
          { id: 'muo', text: '무오사화요.', then: [] },
          { id: 'day', text: '그날 기록이요.', then: [] },
        ],
        after: [
          han('무오사화를?'),
          han('우리 부서에 그걸 모르는 사람이 어디 있어.'),
          han('너 신입 때 나한테 그걸로 발표했잖아.'),
          { kind: 'pause', ms: 4000, fakeTyping: true },
          han('근데 왜 그렇게 봐.'),
          { kind: 'choice', id: 'c_restore2', allowNoReply: true, options: [{ id: 'nothing', text: '아니에요.', then: [] }] },
        ],
      },
    ],
  },
  { id: 'ev.restore_room', postRestore: true, steps: [han('아뢴 사람이 넷이네.'), han('둘은 네 눈엔 이름이 안 남았고.')] },
  {
    id: 'ev.teaser',
    postRestore: true,
    steps: [
      han('아 그리고.'),
      han('아까 로그 뒤지다 본 건데.'),
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
  // ev.resume — 진행 상태별 한 줄(§4.12)
  { id: 'ev.resume.notag', repeatable: true, steps: [han('왔어? 카드 세 장 그대로 있어.')] },
  { id: 'ev.resume.room', repeatable: true, steps: [han('방 그림 그대로야.')] },
  { id: 'ev.resume.x1', repeatable: true, steps: [han('그 「모두」 얘기 아직이지?')] },
  { id: 'ev.resume.after0600', repeatable: true, steps: [han('재계산 끝났어. 더 닫힌 건 없어.')] },
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
      { id: 'h_t4_3', text: '카드에 실록청 줄 있는지 봐.', afterS: 60, fails: 4 },
    ],
  },
  {
    id: 'h_x1',
    failKey: 'contra:X1',
    activeWhen: { revealed: ['X1'], unresolved: ['X1'] },
    doneWhen: { resolved: ['X1'] },
    steps: [
      { id: 'h_x1_1', text: '둘 다 거짓말은 아닐 거야. 듣던 자리가 달랐겠지.', afterS: 45, fails: 1 },
      { id: 'h_x1_2', text: '방에서 그 시각 눌러 봐. 소리 닿는 데 그려 줘.', afterS: 60, fails: 2 },
      { id: 'h_x1_3', text: '멀리 앉은 사람은 들은 걸까, 전해 들은 걸까.', afterS: 60, fails: 3 },
    ],
  },
  {
    id: 'h_x2',
    failKey: 'contra:X2',
    activeWhen: { revealed: ['X2'], unresolved: ['X2'] },
    doneWhen: { resolved: ['X2'] },
    steps: [
      { id: 'h_x2_1', text: '셀 수 있었던 눈이 누군지 봐.', afterS: 60, fails: 1 },
      { id: 'h_x2_2', text: '서안 가운데 뭐 쌓여 있었지?', afterS: 60, fails: 2 },
      { id: 'h_x2_3', text: '그 더미 너머가 다 보였을까.', afterS: 60, fails: 3 },
    ],
  },
  {
    id: 'h_write_open',
    silenceS: 20,
    activeWhen: { rewriteAvailable: true, rewriteOpen: false, restored: false },
    doneWhen: { rewriteOpen: true },
    steps: [{ id: 'h_write_open_1', text: '이제 써 볼 수 있겠다. 홈에.', afterS: 15 }],
  },
  {
    id: 'h_write',
    failKey: 'submit',
    activeWhen: { rewriteOpen: true },
    doneWhen: { allRestored: true },
    steps: [
      { id: 'h_write_1', text: '본 것만 써. 실록도 본 걸 적은 거니까.', afterS: 120, fails: 2 },
      { id: 'h_write_2', text: '안 돌아온 줄은 칸 하나가 어긋난 거야.', afterS: 60, fails: 3 },
      { id: 'h_write_3', text: "줄마다 '누가'랑 '몇'부터 다시 봐.", afterS: 60, fails: 4 },
    ],
  },
];
