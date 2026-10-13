/**
 * 메신저(v4 「근무」 3밤). 스토리 비트가 여기로 온다(힌트는 hints.ts 의 사다리가 보낸다). 설계: docs/DESIGN_V4.md §2.
 *  - 세계: 실록청(實錄廳, 대한민국 국가역사복원기관, 가상) 기록대조과. 자동 분류는 통합 역사 DB 관리단, 복원 승인은 복원심의위원회.
 *  - 자동 기각은 음모가 아니다: 하루 수천 건, 열에 아홉은 진짜 장비 노이즈(근무 3 의 노이즈 건이 그것을 보여 준다).
 *  - 오 실장(상사, 가상): 반말, 건조함. 규정의 목소리(악당 아님). 정답을 말하지 않는다.
 *  - 한 선임(동료, 가상): 근무 2 부터. 반말. 정답(연도·이름·사건)을 말하지 않는다.
 *  - 현대 문장에는 '졸' 대신 '사망'. 실록 용어는 verified 인용 안에만.
 *  - 복원 뒤 지난 메시지는 새 현실로 다시 쓰인다(reality/shift.ts). 메신저에는 표식이 없다 — 이전을 기억하는 건 나뿐.
 *  - 시각: clock 이 없으면 도착한 단말 시각(근무 시계)이 붙는다(스토어 arrivedAt).
 */
import type { Message, StateCondition } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const V = 'verified' as const;
const CHIEF = '오 실장';
const SEN = '한 선임';
const SYS = '결록 단말';
const ME = '나';
const D1 = { duties: ['duty_1'] };
const D2 = { duties: ['duty_2'] };
const D3 = { duties: ['duty_3'] };
const S1_CLOSED: StateCondition = { cases: ['case_c2217'] };
const OPENED_PREV: StateCondition = { opened: ['cr_c2217_prev'] };
const FILED: StateCondition = { filed: ['rep_c2217'] };
const CORR: StateCondition = { corrections: ['corr_dawn'] };

export const messages: Message[] = [
  // ══ 근무 1 — 첫 번째 밤(승인 시안) ══════════════════════════════
  { id: 'm_sys_login', provenance: F, thread: 'system', from: SYS, text: '로그인했습니다. 실록청 기록대조과 · 대조관 07.', when: D1, order: 0 },
  { id: 'm_sys_duty1', provenance: F, thread: 'system', from: SYS, text: '[업무] 근무 1 · 처리 목표 5건 · 도장: 확인 / 정정.', when: D1, order: 1 },
  { id: 'm_chief_01', provenance: F, thread: 'chief', from: CHIEF, text: '07, 오늘 다섯 건. 맞으면 확인, 틀린 낱말 있으면 정정. 도장 두 개면 돼.', when: D1, order: 2 },

  // #C-2217 자동 종결(0.3초 뒤 회색 도장)
  { id: 'm_sys_closed', provenance: F, thread: 'system', from: SYS, text: '#C-2217 — 통합 역사 DB 관리단 자동 분류: 관측 오류(장비 노이즈) · 종결 · 근거 부족.', when: S1_CLOSED, order: 10 },
  // 판정 이력의 1년 전 도장을 열었다 → "나는 이 도장을 찍은 기억이 없다." → 오 실장
  { id: 'm_me_nomemory', provenance: F, thread: 'me', from: ME, text: '나는 이 도장을 찍은 기억이 없다.', when: OPENED_PREV, order: 11 },
  {
    id: 'm_chief_warn2',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07. 경고 두 개야.',
    when: { ...OPENED_PREV, all: ['closed_mismatch'], counters: [{ key: 'warnings:duty_1', min: 2 }] },
    order: 12,
  },
  {
    id: 'm_chief_warn1',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07. 경고 하나야.',
    when: { ...OPENED_PREV, all: ['closed_mismatch'], counters: [{ key: 'warnings:duty_1', max: 1 }] },
    order: 12,
  },
  {
    id: 'm_chief_drawer',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '그 도장, 서랍에 다시 넣어 둬. 그거 쓰는 사람, 오래 못 버텨.',
    when: { ...OPENED_PREV, all: ['closed_mismatch'] },
    order: 13,
  },
  {
    id: 'm_chief_02n',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07, 노이즈로 올렸네. 그래, 그게 맞아. 자주 있어.',
    when: { ...OPENED_PREV, all: ['closed_match'] },
    order: 13,
  },
  {
    id: 'm_chief_03b',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '하루에 수천 건 떠. 열에 아홉은 진짜 장비 노이즈고. 근거 없으면 자동으로 떨어져.',
    when: OPENED_PREV,
    order: 14,
  },
  {
    id: 'm_sys_db',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: 'DB 검색 권한이 열렸습니다(종결 건 검토용).',
    when: S1_CLOSED,
    order: 15,
  },

  // ══ 근무 2 — 두 번째 밤: 규정 4조, 종결 건 재생(근무 시간을 쓴다) ═════
  { id: 'm_sys_login2', provenance: F, thread: 'system', from: SYS, text: '로그인했습니다. 근무 2 · 처리 목표 5건 · 06:00 종료.', when: D2, order: 100 },
  {
    id: 'm_sys_rule4',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '[규정] 4조 신설 — 정정 건에는 근거 프레임 1장. 관측 화면에 셔터가 추가되었습니다.',
    when: D2,
    order: 101,
  },
  {
    id: 'm_sys_obslog',
    provenance: F,
    thread: 'system',
    from: '관측기 로그',
    text: '#C-2217 관측 데이터 보존 중(관측 오류 종결 건 · 보존 30일 · 열람 0회). 관측기 로그는 소실의 영향을 받지 않습니다.',
    when: D2,
    order: 102,
  },
  {
    id: 'm_chief_s2w',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '어제 경고는 어제 거야. 오늘 할당 다섯. 새 규정 읽고.',
    when: { ...D2, counters: [{ key: 'warnings:duty_1', min: 1 }] },
    order: 103,
  },
  {
    id: 'm_chief_s2',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '오늘 할당 다섯. 새 규정 읽고.',
    when: { ...D2, counters: [{ key: 'warnings:duty_1', max: 0 }] },
    order: 103,
  },
  // 한 선임 첫 등장: 근무 2 의 첫 건을 처리한 뒤
  {
    id: 'm_senior_s2_1',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '07, 어제 종결함에 네 이름 있던데. #C-2217.',
    when: { ...D2, counters: [{ key: 'processed:duty_2', min: 1 }] },
    order: 110,
  },
  {
    id: 'm_senior_s2_2',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '종결 건도 관측기 로그엔 30일 남아. 관측기는 소실을 안 타. 다시 볼 수 있어.',
    when: { ...D2, counters: [{ key: 'processed:duty_2', min: 1 }] },
    order: 111,
  },
  {
    id: 'm_senior_s2_3',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '근데 재생은 근무 시간 잡아먹어. 한 구간에 한 시간. 실장님은 처리 건수만 봐.',
    when: { ...D2, counters: [{ key: 'processed:duty_2', min: 1 }] },
    order: 112,
    choices: [
      { id: 'ch_how', text: '어떻게 열어요?', setsFlags: ['s2_asked_replay'] },
      { id: 'ch_fine', text: '괜찮아요.', setsFlags: ['s2_declined_replay'] },
    ],
  },
  { id: 'm_senior_s2_4a', provenance: F, thread: 'senior', from: SEN, text: '관측 → 관측기 로그. 1년 전 네 소견부터 읽어 봐.', when: { all: ['s2_asked_replay'] }, order: 113 },
  { id: 'm_senior_s2_4b', provenance: F, thread: 'senior', from: SEN, text: '그래. 마음 바뀌면 관측 → 관측기 로그.', when: { all: ['s2_declined_replay'] }, order: 113 },
  {
    id: 'm_chief_pace',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07, 진도 왜 이래?',
    when: { ...D2, counters: [{ key: 'replays:duty_2', min: 1 }, { key: 'processed:duty_2', max: 2 }] },
    order: 120,
  },
  {
    id: 'm_chief_04',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '아직 있어? 새벽 6시에 좌표 재계산 돌아. 종결 건 보는 거면, 그 전에 끝내.',
    when: { ...D2, counters: [{ key: 'clock:duty_2', min: 300 }, { key: 'replays:duty_2', min: 1 }] },
    order: 121,
  },
  {
    id: 'm_chief_04n',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '새벽 6시에 좌표 재계산 돌아. 그 전에 끝내.',
    when: { ...D2, counters: [{ key: 'clock:duty_2', min: 300 }, { key: 'replays:duty_2', max: 0 }] },
    order: 121,
  },
  { id: 'm_me_name', provenance: F, thread: 'me', from: ME, text: '…우리 기관 이름이 여기서 왔구나.', when: { records: ['rec_seongjong_sillok'] }, order: 125 },

  // 06:00 좌표 재계산(근무 2 종료): 소실이 진행되어 그 좌표의 일부가 흐려진다. 프레임은 관측기에 있으니 남는다
  { id: 'm_sys_corr', provenance: F, thread: 'system', from: SYS, text: '06:00 좌표 재계산 완료 · #C-2217 일부 구간 고정 실패.', when: CORR, order: 130, clock: '06:00' },
  { id: 'm_chief_05', provenance: F, thread: 'chief', from: CHIEF, text: '소실이 진행됐네. 그 구간은 이제 흐려.', when: CORR, order: 131, clock: '06:12' },
  {
    id: 'm_senior_01',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '07, 밤샜어? 재계산 로그 봤는데 네 좌표 오후가 통째로 흐려졌더라. 가리키던 기록이 깎인 거야.',
    when: CORR,
    order: 132,
    clock: '06:20',
    choices: [
      { id: 'ch_insist', text: '어젯밤엔 다 보였어요. 찍어 둔 것도 있고요.', setsFlags: ['reply_insist'] },
      { id: 'ch_doubt', text: '…제가 본 게 맞긴 한가요.', setsFlags: ['reply_doubt'] },
    ],
  },
  { id: 'm_senior_02a', provenance: F, thread: 'senior', from: SEN, text: '찍은 건 관측기에 있어. 관측기는 소실을 안 타. 네 기억은 장담 못 해도.', when: { all: ['reply_insist'] }, order: 133 },
  { id: 'm_senior_02b', provenance: F, thread: 'senior', from: SEN, text: '그러니까 프레임을 믿어. 사람 기억은 소실을 타도 관측기는 안 타.', when: { all: ['reply_doubt'] }, order: 133 },

  // ══ 근무 3 — 세 번째 밤: 규정 5조, 노이즈, 재탐지, 보고서 ════════════
  { id: 'm_sys_login3', provenance: F, thread: 'system', from: SYS, text: '로그인했습니다. 근무 3 · 처리 목표 5건.', when: D3, order: 200 },
  {
    id: 'm_sys_rule5',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '[규정] 5조 신설 — 관측 오류로 자동 종결된 건은 재관측·재판정하지 않는다.',
    when: D3,
    order: 201,
  },
  {
    id: 'm_chief_s3r',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '새 규정. 관리단에서 내려왔어. 종결 건 재생 로그가 늘었대. …너만 그런 거 아니야. 근데 네 것도 있더라.',
    when: { ...D3, counters: [{ key: 'replays', min: 1 }] },
    order: 202,
  },
  {
    id: 'm_chief_s3',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '새 규정. 관리단에서 내려왔어. 종결 건 재생 로그가 늘었대.',
    when: { ...D3, counters: [{ key: 'replays', max: 0 }] },
    order: 202,
  },
  {
    id: 'm_senior_03',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '규정 5조 봤어? …하나 빠졌더라. 네 칸이 다 근거로 찬 불일치 보고서는 자동 분류를 안 거쳐. 복원심의위원회로 바로 가. 위원회가 받으면 규정 따질 일도 없어지고. 못 받으면 경고 하나.',
    when: { cases: ['case_c4410'] },
    order: 210,
  },
  { id: 'm_senior_03b', provenance: F, thread: 'senior', from: SEN, text: '업무에 양식 있어. 찍어 둔 건 관측기에 있고.', when: { cases: ['case_c4410'] }, order: 211 },
  {
    id: 'm_me_redetect',
    provenance: F,
    thread: 'me',
    from: ME,
    text: '처음엔 3건이었다. 지금은 2건. 다음 재계산이면 이 좌표는 탐지되지 않는다.',
    when: { current: 'case_c2217_re' },
    order: 220,
  },
  { id: 'm_chief_s3_auto', provenance: F, thread: 'chief', from: CHIEF, text: '그래. 그게 맞아.', when: { all: ['case_c2217_re_auto_close'], none: ['restored_c2217'] }, order: 221 },
  { id: 'm_me_forget', provenance: F, thread: 'me', from: ME, text: '내년의 나는 이것도 잊겠지. 보고서 양식은 아직 열려 있다.', when: { all: ['case_c2217_re_auto_close'], none: ['restored_c2217'] }, order: 222 },

  // ── 복원(結) ───────────────────────────────────────────────
  { id: 'm_sys_committee', provenance: F, thread: 'system', from: SYS, text: '복원심의위원회: 불일치 보고서 #C-2217 승인 · 복원 반영.', when: FILED, order: 239 },
  { id: 'm_sys_sync', provenance: F, thread: 'system', from: SYS, text: '통합 역사 DB 동기화: 정상 · 변경 0건.', when: FILED, order: 240 },
  { id: 'm_me_01', provenance: F, thread: 'senior', from: ME, text: '선배, 무오사화 알아요?', when: FILED, order: 241 },
  {
    id: 'm_senior_04',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '무오사화를? 우리 부서에 그걸 모르는 사람이 어디 있어. 너 신입 때 나한테 그걸로 발표했잖아. …너 오늘 좀 이상하다.',
    when: FILED,
    order: 242,
  },
  {
    id: 'm_ep_01',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '연산군 4년 음력 7월 11일. 왕이 “김일손의 사초를 모두 대내로 들여오라” 전교했다. ' +
      '당상들은 “예로부터 사초는 임금이 스스로 보지 않습니다”라고 아뢰었고, 사초에서 6조목이 뽑혀 올라갔다.',
    sources: [REF.sillokSachoOrder],
    when: FILED,
    order: 243,
  },
  {
    id: 'm_ep_02',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '7월 26일. “김일손·권오복·권경유는 대역의 죄에 해당하니 능지 처사하고.” ' +
      '이튿날 그 일을 종묘 사직에 고했다. 이미 세상을 떠난 김종직은 부관참시되었다. ' +
      '7월 28일, 실록청에 전교했다. “김종직·권오복·김일손·권경유 등의 사초는 다 곧 불살라 버려라.”',
    sources: [REF.sillokVerdict, REF.sillokProclaim, REF.sillokBurnSacho],
    when: FILED,
    order: 244,
  },
  {
    id: 'm_ep_03',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '어세겸·이극돈 등은 수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면되었다. ' +
      '실록 편찬은 멈추지 않아, 이듬해 3월 『성종실록』이 완성되었다. 이 일을 무오사화라 한다.',
    sources: [REF.muoSahwa, REF.sillokCompleted],
    when: FILED,
    order: 245,
  },
  {
    id: 'm_me_02',
    provenance: F,
    thread: 'me',
    from: ME,
    text: '기록을 남긴 사람이, 기록 때문에 죽었다. 그리고 방금까지 아무도 그걸 몰랐다. 나만 기억한다. 바뀌기 전을.',
    when: FILED,
    order: 246,
  },
  {
    id: 'm_sys_obslog2',
    provenance: F,
    thread: 'system',
    from: '관측기 로그',
    text: 'DB 검색 「대내로 들여오라」 → 해당 기사 없음 (기록 보존). 관측기 로그는 소실의 영향을 받지 않습니다.',
    when: { ...FILED, searched: ['se_order'] },
    order: 247,
  },
  {
    id: 'm_sys_teaser',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '[업무] 종결된 보고서 2건이 새로 확인되었습니다 — 대조관 07 · 관측 오류.',
    when: { ...FILED, dutiesEnded: ['duty_3'] },
    order: 250,
  },
  { id: 'm_me_03', provenance: F, thread: 'me', from: ME, text: '…이번에는, 무엇이 없어진 거지?', when: { ...FILED, opened: ['cr_c0408'] }, order: 251 },
];
