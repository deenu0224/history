/**
 * 힌트 사다리 — 메신저로만(코치마크·말풍선 없음). DESIGN_V4 §6.
 *  - 첫 20초 침묵(core/terminal HINT_SILENCE_SECONDS), 사다리당 최대 3통, 완료되면 멈춤, 설정 '끔'이면 없음.
 *  - 정답 금지: 일상 건의 고칠 낱말, #C-2217 의 연도·인물 이름·사건 이름(검증기·테스트). 방향(시간대·옷 색·앱)만.
 *  - 함정 건에는 사다리가 없다 — 경고장으로 배운다(실패해도 손해 없는 실험).
 *  - 힌트 메시지는 hint: true 로, when 으로는 오지 않는다.
 */
import type { HintLadder, Message } from '@/core/types';

const F = 'fictional' as const;
const CHIEF = '오 실장';
const SEN = '한 선임';

const hint = (id: string, thread: Message['thread'], from: string, text: string): Message => ({
  id,
  provenance: F,
  thread,
  from,
  text,
  order: 900,
  hint: true,
});

export const hintMessages: Message[] = [
  // 근무 1
  hint('h_hear_1', 'chief', CHIEF, '07, 관측 화면 확대해 봐. 말하는 사람 머리 위 「…」 보이지? 붙으면 들려.'),
  hint('h_hear_2', 'chief', CHIEF, '그 사람을 가운데 두고 두 손가락으로 벌려.'),
  hint('h_hear_3', 'chief', CHIEF, '들은 말은 아래에 남아. 기록 카드랑 같으면 확인.'),
  hint('h_inspect_1', 'chief', CHIEF, '위의 「검사」 켜고, 기록 카드 낱말 하나 → 들은 말에서 같은 걸 가리키는 낱말 하나. 다르면 실이 붉게 이어져.'),
  hint('h_inspect_2', 'chief', CHIEF, '사람 이름부터 하나씩 맞대 봐.'),
  hint('h_inspect_3', 'chief', CHIEF, '붉은 실이 이어지면 정정 도장.'),
  hint('h_day_1', 'chief', CHIEF, '하루 전체 관측 건이야. 시간 막대 끝까지 밀어.'),
  hint('h_day_2', 'chief', CHIEF, '오후에 대문 쪽이 바빠지던데.'),
  hint('h_day_3', 'chief', CHIEF, '기록이 없으면 시스템이 자동 종결해. 권장대로 누르면 끝나.'),
  // 근무 2
  hint('h_shutter_1', 'chief', CHIEF, '규정 4조. 다른 말이 들린 순간에 셔터.'),
  hint('h_shutter_2', 'chief', CHIEF, '시간 막대에 말이 시작되는 눈금 있지? 거기.'),
  hint('h_shutter_3', 'chief', CHIEF, '프레임이 카드에 붙으면 정정 도장.'),
  hint('h_secret_1', 'senior', SEN, '1년 전 네 소견, 시각이 적혀 있더라.'),
  hint('h_secret_2', 'senior', SEN, '관측 → 관측기 로그. 구간 하나에 한 시간.'),
  hint('h_secret_3', 'senior', SEN, '들은 말 그대로 DB에 넣어 봐.'),
  hint('h_frames_1', 'senior', SEN, '본 거 다 찍어 둬. 남는 건 프레임뿐이야.'),
  hint('h_frames_2', 'senior', SEN, "DB에서 본 거, 관측에서 맞춰 봐. 기록에 '편수관'이라 돼 있으면 그 말 하는 사람이 있을 거고."),
  hint('h_frames_3', 'senior', SEN, '오후 한 시쯤 서리가 당상 곁에 붙어. 네 시 넘으면 푸른 관복이 그 사관 얘길 해.'),
  // 근무 3
  hint('h_report_1', 'senior', SEN, '칸마다 하나씩. 틀려도 돼.'),
  hint('h_report_2', 'senior', SEN, "언제 칸은 '그날 살아 있었다'와 '언제 사망했다'를 같이 붙여야 돼."),
  hint('h_report_3', 'senior', SEN, '그 사관이 누군지는 전교 프레임에 이름이 있어. 그것도 보고서 어딘가에 있어야 해.'),
];

export const hints: HintLadder[] = [
  {
    id: 'hl_hear',
    provenance: F,
    order: 1,
    activeWhen: { current: 'case_a0412' },
    doneWhen: { any: [{ heard: ['a0412_l1'] }, { cases: ['case_a0412'] }] },
    failOn: ['case_not_ready'],
    steps: [
      { idle: 30, fails: 1, messageId: 'h_hear_1' },
      { idle: 60, fails: 2, messageId: 'h_hear_2' },
      { idle: 90, fails: 3, messageId: 'h_hear_3' },
    ],
  },
  {
    id: 'hl_inspect',
    provenance: F,
    order: 2,
    activeWhen: { current: 'case_a0419', heard: ['a0419_l1'] },
    doneWhen: { cases: ['case_a0419'] },
    failOn: ['case_not_ready', 'inspect_none'],
    steps: [
      { idle: 40, fails: 1, messageId: 'h_inspect_1' },
      { idle: 80, fails: 3, messageId: 'h_inspect_2' },
      { idle: 120, fails: 5, messageId: 'h_inspect_3' },
    ],
  },
  {
    id: 'hl_day',
    provenance: F,
    order: 3,
    activeWhen: { current: 'case_c2217' },
    doneWhen: { cases: ['case_c2217'] },
    failOn: ['case_not_ready'],
    steps: [
      { idle: 45, fails: 1, messageId: 'h_day_1' },
      { idle: 90, fails: 2, messageId: 'h_day_2' },
      { idle: 150, fails: 3, messageId: 'h_day_3' },
    ],
  },
  {
    id: 'hl_shutter',
    provenance: F,
    order: 4,
    activeWhen: { current: 'case_a0501' },
    doneWhen: { cases: ['case_a0501'] },
    failOn: ['case_not_ready'],
    steps: [
      { idle: 40, fails: 1, messageId: 'h_shutter_1' },
      { idle: 80, fails: 2, messageId: 'h_shutter_2' },
      { idle: 120, fails: 3, messageId: 'h_shutter_3' },
    ],
  },
  {
    id: 'hl_secret',
    provenance: F,
    order: 5,
    activeWhen: { all: ['s2_asked_replay'] },
    doneWhen: { any: [{ counters: [{ key: 'replays', min: 1 }] }, { dutiesEnded: ['duty_2'] }] },
    steps: [
      { idle: 45, messageId: 'h_secret_1' },
      { idle: 90, messageId: 'h_secret_2' },
      { idle: 135, messageId: 'h_secret_3' },
    ],
  },
  {
    id: 'hl_frames',
    provenance: F,
    order: 6,
    activeWhen: { counters: [{ key: 'replays', min: 1 }] },
    doneWhen: { any: [{ clues: ['cl_order', 'cl_veteran', 'cl_alive'] }, { filed: ['rep_c2217'] }] },
    steps: [
      { idle: 45, messageId: 'h_frames_1' },
      { idle: 90, messageId: 'h_frames_2' },
      { idle: 135, messageId: 'h_frames_3' },
    ],
  },
  {
    id: 'hl_report',
    provenance: F,
    order: 7,
    activeWhen: { duties: ['duty_3'], cases: ['case_c4410'] },
    doneWhen: { filed: ['rep_c2217'] },
    failOn: ['report_fail'],
    steps: [
      { idle: 60, fails: 2, messageId: 'h_report_1' },
      { idle: 120, fails: 4, messageId: 'h_report_2' },
      { idle: 180, fails: 6, messageId: 'h_report_3' },
    ],
  },
];
