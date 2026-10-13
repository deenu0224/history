/**
 * 힌트 사다리 — 메신저로만(코치마크·말풍선 없음). DESIGN_V3 §6.
 *  - 첫 20초 침묵(core/terminal HINT_SILENCE_SECONDS), 사다리당 최대 3통, 완료되면 멈춤, 설정 '끔'이면 없음.
 *  - 정답(연도·인물 이름·사건 이름) 금지 — 방향(시간대·옷 색·앱)만(테스트).
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
  hint('h_look_1', 'chief', CHIEF, '07, 확대해서 봐. 꼬리표까지 보여야 장소 대조가 끝나.'),
  hint('h_look_2', 'chief', CHIEF, '곳간 쪽. 아침이면 서리가 꾸러미를 나르고 있을 거야.'),
  hint('h_look_3', 'chief', CHIEF, '두 손가락으로 벌려. 묶음이 화면 가운데 오게.'),
  hint('h_listen_1', 'chief', CHIEF, '머리 위에 「…」 뜬 사람 있지? 말하는 중이야. 붙어서 들어.'),
  hint('h_listen_2', 'chief', CHIEF, '붉은 관복. 서안 앞.'),
  hint('h_listen_3', 'chief', CHIEF, '가운데 두고 한 번 더 확대. 들리면 셔터.'),
  hint('h_scan_1', 'chief', CHIEF, '하루 다 봤어? 막대 끝까지 밀어.'),
  hint('h_scan_2', 'chief', CHIEF, '오후에 대문 쪽이 바빠지던데.'),
  hint('h_scan_3', 'chief', CHIEF, '두 시 전후, 대청 앞.'),
  hint('h_dig_1', 'senior', SEN, '기록에 없는 걸 봤으면 DB부터. 들은 말 그대로 넣어 봐.'),
  hint('h_dig_2', 'senior', SEN, '종결함 열어 봤어? 네 이름 꽤 있을걸.'),
  hint('h_dig_3', 'senior', SEN, '업무 → 종결된 보고서.'),
  hint('h_frames_1', 'senior', SEN, '재계산 돌기 전에 찍을 거 다 찍어. 남는 건 프레임뿐이야.'),
  hint('h_frames_2', 'senior', SEN, "DB에서 본 거, 관측에서 맞춰 봐. 기록에 '편수관'이라 돼 있으면 그 말 하는 사람이 있을 거고."),
  hint('h_frames_3', 'senior', SEN, '오후 한 시쯤 서리가 당상 곁에 붙어. 네 시 넘으면 푸른 관복이 그 사관 얘길 해.'),
  hint('h_report_1', 'senior', SEN, '칸마다 하나씩. 틀려도 돼.'),
  hint('h_report_2', 'senior', SEN, "언제 칸은 '그날 살아 있었다'와 '언제 사망했다'를 같이 붙여야 돼."),
  hint('h_report_3', 'senior', SEN, '그 사관이 누군지는 전교 프레임에 이름이 있어. 그것도 보고서 어딘가에 있어야 해.'),
];

export const hints: HintLadder[] = [
  {
    id: 'hl_look',
    provenance: F,
    order: 1,
    activeWhen: { appsOpened: ['viewer'] },
    doneWhen: { stamped: ['ck_place'] },
    steps: [
      { idle: 30, messageId: 'h_look_1' },
      { idle: 60, messageId: 'h_look_2' },
      { idle: 90, messageId: 'h_look_3' },
    ],
  },
  {
    id: 'hl_listen',
    provenance: F,
    order: 2,
    activeWhen: { stamped: ['ck_place'] },
    doneWhen: { stamped: ['ck_person'] },
    failOn: ['stamp_miss'],
    steps: [
      { idle: 40, fails: 2, messageId: 'h_listen_1' },
      { idle: 80, fails: 4, messageId: 'h_listen_2' },
      { idle: 120, fails: 6, messageId: 'h_listen_3' },
    ],
  },
  {
    id: 'hl_scan',
    provenance: F,
    order: 3,
    activeWhen: { stamped: ['ck_person'] },
    doneWhen: { stamped: ['ck_time'] },
    failOn: ['stamp_miss'],
    steps: [
      { idle: 45, fails: 2, messageId: 'h_scan_1' },
      { idle: 90, fails: 4, messageId: 'h_scan_2' },
      { idle: 135, fails: 6, messageId: 'h_scan_3' },
    ],
  },
  {
    id: 'hl_dig',
    provenance: F,
    order: 4,
    activeWhen: { closed: ['as_c2217'] },
    doneWhen: { opened: ['cr_c2217_prev'] },
    failOn: ['unknown_search'],
    steps: [
      { idle: 40, messageId: 'h_dig_1' },
      { idle: 80, messageId: 'h_dig_2' },
      { idle: 120, messageId: 'h_dig_3' },
    ],
  },
  {
    id: 'hl_frames',
    provenance: F,
    order: 5,
    activeWhen: { opened: ['cr_c2217_prev'] },
    doneWhen: { corrections: ['corr_dawn'] },
    steps: [
      { idle: 45, messageId: 'h_frames_1' },
      { idle: 90, messageId: 'h_frames_2' },
      { idle: 135, messageId: 'h_frames_3' },
    ],
  },
  {
    id: 'hl_report',
    provenance: F,
    order: 6,
    activeWhen: { corrections: ['corr_dawn'] },
    doneWhen: { filed: ['rep_c2217'] },
    failOn: ['report_fail'],
    steps: [
      { idle: 60, fails: 2, messageId: 'h_report_1' },
      { idle: 120, fails: 4, messageId: 'h_report_2' },
      { idle: 180, fails: 6, messageId: 'h_report_3' },
    ],
  },
];
