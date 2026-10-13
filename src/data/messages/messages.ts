/**
 * 메신저. 스토리 비트가 여기로 온다(힌트는 hints.ts 의 사다리가 보낸다).
 *  - 세계: 실록청(實錄廳, 대한민국 국가역사복원기관, 가상) 기록대조과. 자동 분류는 통합 역사 DB 관리단, 복원 승인은 복원심의위원회.
 *  - 자동 기각은 음모가 아니다: 하루 수천 건의 좌표 손상 건 중 열에 아홉은 진짜 장비 노이즈. 소실은 그 노이즈 속에 숨는다.
 *  - 오 실장(상사, 가상): 반말, 건조함. 시스템의 목소리 — "자주 있어. 장비 문제야."
 *  - 한 선임(동료, 가상): 10분 이후 등장. 반말. 정답(연도·이름·사건)을 말하지 않는다.
 *  - 현대 문장에는 '졸' 대신 '사망'. 실록 용어는 verified 인용 안에만.
 *  - 복원 뒤 지난 메시지는 새 현실로 다시 쓰인다(reality/shift.ts). 메신저에는 표식이 없다 — 이전을 기억하는 건 나뿐.
 *  - clock: 단말 시계 연출.
 */
import type { Message } from '@/core/types';
import { REF } from '@/data/historical/refs';

const F = 'fictional' as const;
const V = 'verified' as const;
const CHIEF = '오 실장';
const SEN = '한 선임';
const SYS = '결록 단말';
const ME = '나';
const CLOSED = { closed: ['as_c2217'] };
const FILED = { filed: ['rep_c2217'] };
const CORR = { corrections: ['corr_dawn'] };

export const messages: Message[] = [
  // ── 23:04 배정 ─────────────────────────────────────────────
  { id: 'm_sys_login', provenance: F, thread: 'system', from: SYS, text: '로그인했습니다. 실록청 기록대조과 · 대조관 07.', order: 0, clock: '23:04' },
  { id: 'm_sys_assign', provenance: F, thread: 'system', from: SYS, text: '[업무] 새 배정: 좌표 손상 건 #C-2217 · 우선순위 낮음.', order: 1, clock: '23:04' },
  { id: 'm_chief_01', provenance: F, thread: 'chief', from: CHIEF, text: '07, 하나 넣었어. 좌표 손상 건. 체크리스트대로 보고 판정만 찍어.', order: 2, clock: '23:05' },

  // ── 자동 종결(轉1) ──────────────────────────────────────────
  { id: 'm_sys_closed', provenance: F, thread: 'system', from: SYS, text: '#C-2217 — 통합 역사 DB 관리단 자동 분류: 관측 오류(장비 노이즈) · 종결 · 근거 부족.', when: CLOSED, order: 10, clock: '23:29' },
  {
    id: 'm_chief_02',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07, 그거 자동 종결됐더라. 자주 있어. 장비 문제야.',
    when: { ...CLOSED, all: ['closed_mismatch'] },
    order: 11,
    clock: '23:30',
  },
  {
    id: 'm_chief_02n',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '07, 노이즈로 올렸네. 그래, 그게 맞아. 자주 있어.',
    when: { ...CLOSED, all: ['closed_match'] },
    order: 11,
    clock: '23:30',
  },
  { id: 'm_chief_03', provenance: F, thread: 'chief', from: CHIEF, text: '다음 건 넘어가.', when: CLOSED, order: 12, clock: '23:30' },
  {
    id: 'm_chief_03b',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '하루에 수천 건 떠. 열에 아홉은 진짜 장비 노이즈고. 근거 없으면 자동으로 떨어져.',
    when: CLOSED,
    order: 12.5,
    clock: '23:30',
  },
  {
    id: 'm_sys_db',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: 'DB 검색 권한이 열렸습니다(대조 종결 · 규정 4조: 대조 중에는 DB 를 열람하지 않는다).',
    when: CLOSED,
    order: 13,
    clock: '23:31',
  },
  { id: 'm_sys_queue', provenance: F, thread: 'system', from: SYS, text: '[업무] 다음 배정 대기 — 장비 점검 중.', when: CLOSED, order: 14, clock: '23:31' },

  // ── 23:38 1년 전 내 보고서(轉2) → 첫 10분 끝 ───────────────────
  {
    id: 'm_chief_04',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '아직 있어? 새벽 6시에 좌표 재계산 돌아. 그 전에 끝내.',
    when: { opened: ['cr_c2217_prev'] },
    order: 20,
    clock: '23:40',
  },

  // ── 06:00 좌표 재계산(轉3): 소실이 진행되어 오후가 흐려진다. 프레임은 관측기에 있으니 남는다 ──
  { id: 'm_sys_corr', provenance: F, thread: 'system', from: SYS, text: '06:00 좌표 재계산 완료 · #C-2217 일부 구간 고정 실패.', when: CORR, order: 30, clock: '06:00' },
  {
    id: 'm_chief_05',
    provenance: F,
    thread: 'chief',
    from: CHIEF,
    text: '소실이 진행됐네. 그 구간은 이제 흐려.',
    when: CORR,
    order: 31,
    clock: '06:12',
  },
  {
    id: 'm_senior_01',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '07, 밤샜어? 재계산 로그 봤는데 네 좌표 오후가 통째로 흐려졌더라. 가리키던 기록이 깎인 거야.',
    when: CORR,
    order: 32,
    clock: '06:20',
    choices: [
      { id: 'ch_insist', text: '어젯밤엔 다 보였어요. 찍어 둔 것도 있고요.', setsFlags: ['reply_insist'] },
      { id: 'ch_doubt', text: '…제가 본 게 맞긴 한가요.', setsFlags: ['reply_doubt'] },
    ],
  },
  {
    id: 'm_senior_02a',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '찍은 건 관측기에 있어. 관측기는 소실을 안 타. 네 기억은 장담 못 해도.',
    when: { all: ['reply_insist'] },
    order: 33,
  },
  {
    id: 'm_senior_02b',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '그러니까 프레임을 믿어. 사람 기억은 소실을 타도 관측기는 안 타.',
    when: { all: ['reply_doubt'] },
    order: 33,
  },
  {
    id: 'm_senior_03',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '노이즈로 안 떨어지는 건 딱 하나야. 네 칸이 다 근거로 찬 불일치 보고서. 그건 자동 분류를 안 거치고 복원심의위원회로 바로 가. 업무에 양식 있어.',
    when: CORR,
    order: 34,
    clock: '06:21',
  },

  // ── 복원(結) ───────────────────────────────────────────────
  {
    id: 'm_sys_committee',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '복원심의위원회: 불일치 보고서 #C-2217 승인 · 복원 반영.',
    when: FILED,
    order: 39,
  },
  { id: 'm_sys_sync', provenance: F, thread: 'system', from: SYS, text: '통합 역사 DB 동기화: 정상 · 변경 0건.', when: FILED, order: 40 },
  { id: 'm_me_01', provenance: F, thread: 'senior', from: ME, text: '선배, 무오사화 알아요?', when: FILED, order: 41 },
  {
    id: 'm_senior_04',
    provenance: F,
    thread: 'senior',
    from: SEN,
    text: '무오사화를? 우리 부서에 그걸 모르는 사람이 어디 있어. 너 신입 때 나한테 그걸로 발표했잖아. …너 오늘 좀 이상하다.',
    when: FILED,
    order: 42,
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
    order: 43,
  },
  {
    id: 'm_ep_02',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '7월 26일. “김일손·권오복·권경유는 대역의 죄에 해당하니 능지 처사하고.” ' +
      '이튿날 그 일을 종묘 사직에 고했다. 이미 세상을 떠난 김종직은 부관참시되었다.',
    sources: [REF.sillokVerdict, REF.sillokProclaim],
    when: FILED,
    order: 44,
  },
  {
    id: 'm_ep_03',
    provenance: V,
    thread: 'system',
    from: '복원된 기록',
    text:
      '어세겸·이극돈 등은 수사관으로서 문제의 사초를 보고도 고하지 않은 죄로 파면되었다. ' +
      '실록 편찬은 멈추지 않아, 이듬해 『성종실록』이 완성되어 사고에 봉안되었다. 이 일을 무오사화라 한다.',
    sources: [REF.muoSahwa, REF.seongjongSillok],
    when: FILED,
    order: 45,
  },
  {
    id: 'm_me_02',
    provenance: F,
    thread: 'me',
    from: ME,
    text: '기록을 남긴 사람이, 기록 때문에 죽었다. 그리고 방금까지 아무도 그걸 몰랐다. 나만 기억한다. 바뀌기 전을.',
    when: FILED,
    order: 46,
  },
  {
    id: 'm_sys_obslog',
    provenance: F,
    thread: 'system',
    from: '관측기 로그',
    text: '어제 23:31 · DB 검색 「대내로 들여오라」 → 해당 기사 없음. (관측기 로그는 소실의 영향을 받지 않습니다.)',
    when: FILED,
    order: 47,
  },
  {
    id: 'm_sys_teaser',
    provenance: F,
    thread: 'system',
    from: SYS,
    text: '[업무] 종결된 보고서 2건이 새로 확인되었습니다 — 대조관 07 · 관측 오류.',
    when: FILED,
    order: 50,
  },
  {
    id: 'm_me_name',
    provenance: F,
    thread: 'me',
    from: ME,
    text: '…우리 기관 이름이 여기서 왔구나.',
    when: { records: ['rec_seongjong_sillok'] },
    order: 25,
  },
  { id: 'm_me_03', provenance: F, thread: 'me', from: ME, text: '…이번에는, 무엇이 없어진 거지?', when: { ...FILED, opened: ['cr_c0408'] }, order: 51 },
];
